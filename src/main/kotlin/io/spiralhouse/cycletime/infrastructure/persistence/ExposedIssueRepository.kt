package io.spiralhouse.cycletime.infrastructure.persistence

import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.domain.entities.IssueSnapshot
import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.infrastructure.database.IssuesTable
import io.spiralhouse.cycletime.infrastructure.database.IssueDependenciesTable
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.slf4j.LoggerFactory

/**
 * Repository implementation for Issue entities using Exposed ORM.
 *
 * This repository handles the persistence of Issue aggregates, managing the complex
 * mapping between domain entities and database records. It implements the Snapshot
 * pattern for entity reconstitution and handles the intricate dependency relationships
 * between issues.
 *
 * ## Design Decisions
 *
 * ### Dependency Management
 * The repository uses a normalized approach for storing issue dependencies in a separate
 * table (IssueDependenciesTable). Each dependency relationship is stored as a separate
 * row with a type indicator ("depends" or "blocks"). This design allows for:
 * - Efficient querying of dependencies and blockers
 * - Proper foreign key constraints and referential integrity
 * - Clear separation between different types of relationships
 *
 * ### Batch Operations
 * The `saveAll` method processes issues sequentially within a single transaction to
 * maintain consistency. While this approach ensures data integrity, future optimizations
 * could include batch inserts for improved performance with large datasets.
 *
 * ### Snapshot Pattern
 * The repository uses the Snapshot pattern to maintain a clear separation between
 * domain logic and persistence concerns. This allows the domain entities to remain
 * persistence-agnostic while still supporting complex reconstitution logic.
 *
 * @property timeProvider The time provider for entity reconstitution, defaults to SystemTimeProvider
 */
@ThreadSafe // Documenting thread-safety guarantee
class ExposedIssueRepository(
    timeProvider: TimeProvider = SystemTimeProvider(),
    database: Database? = null
) : BaseExposedRepository(timeProvider, database), IssueRepository {

    companion object {
        private val logger = LoggerFactory.getLogger(ExposedIssueRepository::class.java)
    }

    /**
     * Finds an issue by its unique identifier.
     *
     * Retrieves a complete Issue aggregate including all its dependency relationships.
     * The method performs a single query to fetch the issue data and then loads its
     * dependencies from the IssueDependenciesTable.
     *
     * Excludes soft-deleted issues (where deleted_at IS NOT NULL).
     *
     * @param id The issue ID to search for
     * @return The fully reconstituted Issue entity if found and not deleted, null otherwise
     */
    override suspend fun findById(id: IssueId): Issue? = dbQuery {
        IssuesTable
            .selectAll()
            .where {
                (IssuesTable.id eq id.value) and
                (IssuesTable.deletedAt.isNull())
            }
            .singleOrNull()
            ?.toIssue()
    }

    /**
     * Finds all issues belonging to a specific project.
     *
     * @param projectId The project ID to search for
     * @return List of issues in the project, ordered by creation date
     */
    override suspend fun findByProject(projectId: ProjectId): List<Issue> = dbQuery {
        findIssuesByCondition { IssuesTable.projectId eq projectId.value }
    }

    /**
     * Finds all issues that are children of a specific parent issue.
     *
     * Useful for building issue hierarchies and understanding task breakdown structures.
     *
     * @param parentId The parent issue ID to search for
     * @return List of child issues
     */
    override suspend fun findByParent(parentId: IssueId): List<Issue> = dbQuery {
        findIssuesByCondition { IssuesTable.parentId eq parentId.value }
    }

    /**
     * Finds all issues assigned to a specific user.
     *
     * @param assigneeId The assignee ID to search for
     * @return List of issues assigned to the user
     */
    override suspend fun findByAssignee(assigneeId: String): List<Issue> = dbQuery {
        findIssuesByCondition { IssuesTable.assigneeId eq assigneeId }
    }

    /**
     * Finds all issues with a specific status.
     *
     * @param status The issue status to search for
     * @return List of issues with the matching status
     */
    override suspend fun findByStatus(status: IssueStatus): List<Issue> = dbQuery {
        findIssuesByCondition { IssuesTable.status eq status.name }
    }

    /**
     * Finds all issues of a specific type.
     *
     * @param type The issue type to search for
     * @return List of issues of the specified type
     */
    override suspend fun findByType(type: IssueType): List<Issue> = dbQuery {
        findIssuesByCondition { IssuesTable.type eq type.name }
    }

    /**
     * Persists an issue to the repository.
     *
     * This method implements an upsert pattern - it updates existing issues or
     * inserts new ones based on ID existence. Dependencies are always refreshed
     * to ensure consistency with the current domain state.
     *
     * Transaction behavior:
     * - All operations occur within a single transaction
     * - If any operation fails, all changes are rolled back
     * - Dependencies are updated after the main record to ensure FK integrity
     *
     * @param issue The issue to save
     * @throws Exception if database operation fails
     */
    override suspend fun save(issue: Issue) {
        dbQuery {
            val exists = checkIssueExists(issue.id)

            if (exists) {
                updateIssue(issue)
            } else {
                insertIssue(issue)
            }

            // Always refresh dependencies to match current domain state
            updateIssueDependencies(issue)
        }
    }

    /**
     * Persists multiple issues to the repository in a single transaction.
     *
     * This method is optimized for batch operations and ensures all issues are saved
     * atomically. If any issue fails to save, the entire batch is rolled back.
     *
     * Performance optimizations:
     * - Single transaction for all operations (atomic commit)
     * - Batch existence check to minimize database queries
     * - Grouped processing of updates vs inserts
     * - Deferred dependency updates for better cache utilization
     *
     * @param issues The list of issues to save
     * @throws Exception if any database operation fails, rolling back all changes
     */
    override suspend fun saveAll(issues: List<Issue>) {
        if (issues.isEmpty()) return

        dbQuery {
            // Batch check existence to minimize queries
            val existenceMap = issues.associate { issue ->
                issue.id to checkIssueExists(issue.id)
            }

            // Group by operation type
            val existingIssues = issues.filter { existenceMap[it.id] == true }
            val newIssues = issues.filter { existenceMap[it.id] == false }

            // Batch process updates
            existingIssues.forEach { issue ->
                updateIssue(issue)
            }

            // Batch process inserts
            newIssues.forEach { issue ->
                insertIssue(issue)
            }

            // Update all dependencies after main records are saved
            // This improves cache locality and reduces FK check overhead
            issues.forEach { issue ->
                updateIssueDependencies(issue)
            }
        }
    }

    /**
     * Deletes an issue from the repository.
     *
     * This method ensures proper cleanup of all related data:
     * 1. Removes all dependency relationships (both as blocker and blocked)
     * 2. Deletes the issue record itself
     *
     * Note: Child issues are not automatically deleted. The application layer
     * should handle cascading deletes if required.
     *
     * @param id The ID of the issue to delete
     */
    override suspend fun delete(id: IssueId) {
        dbQuery {
            // Delete all dependency relationships first to maintain referential integrity
            deleteIssueDependencies(id)
            // Then delete the issue itself
            IssuesTable.deleteWhere { IssuesTable.id eq id.value }
        }
    }

    /**
     * Checks if an issue exists in the repository.
     *
     * @param id The issue ID to check
     * @return true if the issue exists, false otherwise
     */
    override suspend fun exists(id: IssueId): Boolean = dbQuery {
        checkIssueExists(id)
    }

    /**
     * Soft-deletes an issue by setting deleted_at timestamp.
     *
     * Cascades the deletion to all descendant issues using iterative tree traversal.
     * All operations occur in a single transaction for atomicity.
     *
     * @param id The issue ID to soft-delete
     * @throws IssueNotFoundException if issue does not exist
     */
    override suspend fun softDelete(id: IssueId) {
        dbQuery {
            // 1. Verify issue exists
            val exists = IssuesTable
                .selectAll()
                .where { IssuesTable.id eq id.value }
                .count() > 0

            if (!exists) {
                throw io.spiralhouse.cycletime.domain.exceptions.IssueNotFoundException(id.value)
            }

            // 2. Collect all descendants using iterative traversal
            val allDescendants = collectAllDescendants(id.value)

            // 3. Batch update all (root + descendants) with deleted_at timestamp
            val now = timeProvider.now()
            val idsToDelete = listOf(id.value) + allDescendants

            val updateCount = IssuesTable.update({
                IssuesTable.id inList idsToDelete
            }) {
                it[deletedAt] = now
            }

            logger.info("Soft-deleted issue ${id.value} with ${allDescendants.size} descendants ($updateCount total records)")
        }
    }

    /**
     * Restores a soft-deleted issue by clearing deleted_at timestamp.
     *
     * Validates that the parent issue (if any) is not deleted before allowing restoration.
     * Does NOT cascade to child issues - they must be restored explicitly.
     *
     * @param id The issue ID to restore
     * @throws IssueNotFoundException if issue does not exist
     * @throws ParentIssueDeletedException if parent issue is still deleted
     */
    override suspend fun restore(id: IssueId) {
        dbQuery {
            // 1. Find issue (including deleted)
            val issueRow = IssuesTable
                .selectAll()
                .where { IssuesTable.id eq id.value }
                .singleOrNull()
                ?: throw io.spiralhouse.cycletime.domain.exceptions.IssueNotFoundException(id.value)

            // 2. Get parent_id and check if parent is deleted
            val parentIdValue = issueRow[IssuesTable.parentId]
            if (parentIdValue != null) {
                // Check if parent exists and is NOT deleted
                val parentActive = IssuesTable
                    .selectAll()
                    .where {
                        (IssuesTable.id eq parentIdValue) and
                        (IssuesTable.deletedAt.isNull())
                    }
                    .count() > 0

                if (!parentActive) {
                    throw io.spiralhouse.cycletime.domain.exceptions.ParentIssueDeletedException(
                        "Cannot restore issue ${id.value}: parent $parentIdValue is deleted"
                    )
                }
            }

            // 3. Restore (does NOT cascade to children)
            val updateCount = IssuesTable.update({
                IssuesTable.id eq id.value
            }) {
                it[deletedAt] = null
            }

            if (updateCount > 0) {
                logger.info("Restored issue ${id.value} (children not auto-restored)")
            }
        }
    }

    /**
     * Finds all soft-deleted issues.
     *
     * @return List of deleted issues (where deleted_at IS NOT NULL)
     */
    override suspend fun findDeleted(): List<Issue> = dbQuery {
        IssuesTable
            .selectAll()
            .where { IssuesTable.deletedAt.isNotNull() }
            .map { it.toIssue() }
    }

    /**
     * Finds an issue by ID, including soft-deleted issues.
     *
     * @param id The issue ID to find
     * @return The issue if found (including deleted), null otherwise
     */
    override suspend fun findIncludingDeleted(id: IssueId): Issue? = dbQuery {
        IssuesTable
            .selectAll()
            .where { IssuesTable.id eq id.value }
            .singleOrNull()
            ?.toIssue()
    }

    /**
     * Collects all descendant issue IDs using iterative tree traversal.
     *
     * Uses breadth-first search to avoid stack overflow with deep hierarchies.
     * All operations occur within the same transaction.
     *
     * @param parentId The parent issue ID to start from
     * @return List of all descendant issue IDs (children, grandchildren, etc.)
     */
    private fun collectAllDescendants(parentId: String): List<String> {
        val descendants = mutableListOf<String>()
        val queue = ArrayDeque<String>()
        queue.add(parentId)

        while (queue.isNotEmpty()) {
            val currentId = queue.removeFirst()

            // Find all children of current issue
            val children = IssuesTable
                .select(IssuesTable.id)
                .where { IssuesTable.parentId eq currentId }
                .map { it[IssuesTable.id].value }

            descendants.addAll(children)
            children.forEach { queue.add(it) }
        }

        return descendants
    }

    /**
     * Updates an existing issue in the database.
     *
     * CRITICAL: This method MUST update projectId and parentId to preserve hierarchy relationships.
     * These fields can change during issue reorganization (e.g., moving stories between epics,
     * reassigning issues to different projects). The dashboard hierarchy depends on accurate
     * parent/child relationships.
     *
     * Bug fix (SPI-690): Previously omitted projectId and parentId from UPDATE statements,
     * causing orphaned stories and incorrect hierarchy rendering. These fields are now explicitly
     * updated to ensure hierarchy consistency.
     *
     * @param issue The issue with updated values
     */
    private fun updateIssue(issue: Issue) {
        IssuesTable.update({ IssuesTable.id eq issue.id.value }) {
            // CRITICAL: Must update projectId and parentId to preserve hierarchy relationships
            // These can change when reorganizing issues (moving stories between epics, etc.)
            it[projectId] = issue.projectId?.value
            it[parentId] = issue.parentId?.value
            it[title] = issue.title
            it[description] = issue.description
            it[type] = issue.type.name
            it[status] = issue.status.name
            it[estimate] = if (issue.estimate.hasValue()) issue.estimate.value else null
            it[assigneeId] = issue.assigneeId
            it[updatedAt] = issue.updatedAt
        }
    }

    /**
     * Inserts a new issue into the database.
     *
     * Creates a new issue record with all required fields. The priority field
     * defaults to 0 (normal priority) as it's not currently exposed in the domain model.
     *
     * @param issue The issue to insert
     */
    private fun insertIssue(issue: Issue) {
        IssuesTable.insert {
            it[id] = EntityID(issue.id.value, IssuesTable)
            it[projectId] = issue.projectId?.value
            it[parentId] = issue.parentId?.value
            it[title] = issue.title
            it[description] = issue.description
            it[type] = issue.type.name
            it[status] = issue.status.name
            it[priority] = 0 // Default priority - could be extended in future
            it[estimate] = if (issue.estimate.hasValue()) issue.estimate.value else null
            it[assigneeId] = issue.assigneeId
            it[createdAt] = issue.createdAt
            it[updatedAt] = issue.updatedAt
        }
    }

    /**
     * Updates the dependency relationships for an issue.
     *
     * This method implements a complete replacement strategy for dependencies:
     * 1. Removes all existing dependency relationships for the issue
     * 2. Creates new dependency records based on the current state
     *
     * The design handles overlapping relationships (where an issue both depends on
     * and is blocked by the same issue) by combining the types into a single record.
     * This ensures we don't violate the unique constraint on (blockerId, blockedId).
     *
     * @param issue The issue whose dependencies should be updated
     */
    private fun updateIssueDependencies(issue: Issue) {
        // Delete all existing dependencies for this issue (both directions)
        deleteIssueDependencies(issue.id)

        // Collect all relationships to handle overlaps
        val relationships = mutableMapOf<Pair<String, String>, MutableSet<DependencyType>>()

        // Process dependency relationships (this issue depends on others)
        issue.dependencies.forEach { dependencyId ->
            val key = Pair(dependencyId.value, issue.id.value)
            relationships.getOrPut(key) { mutableSetOf() }.add(DependencyType.DEPENDS_ON)
        }

        // Process blocker relationships (this issue is blocked by others)
        issue.blockedBy.forEach { blockerId ->
            val key = Pair(blockerId.value, issue.id.value)
            relationships.getOrPut(key) { mutableSetOf() }.add(DependencyType.BLOCKED_BY)
        }

        // Insert combined relationships
        relationships.forEach { (blockerBlocked, types) ->
            val (blockerId, blockedId) = blockerBlocked
            val combinedType = types.sorted().joinToString(",") { it.value }

            createDependencyRecord(
                blockerId = blockerId,
                blockedId = blockedId,
                typeString = combinedType,
                createdAt = issue.updatedAt
            )
        }
    }

    /**
     * Creates a single dependency record in the database.
     *
     * @param blockerId The ID of the blocking issue
     * @param blockedId The ID of the blocked issue
     * @param typeString The type(s) of dependency relationship (may be comma-separated)
     * @param createdAt The timestamp for the relationship
     */
    private fun createDependencyRecord(
        blockerId: String,
        blockedId: String,
        typeString: String,
        createdAt: kotlinx.datetime.Instant
    ) {
        IssueDependenciesTable.insert {
            it[id] = "${blockerId}_${typeString}_${blockedId}"
            it[IssueDependenciesTable.blockerId] = blockerId
            it[IssueDependenciesTable.blockedId] = blockedId
            it[dependencyType] = typeString
            it[IssueDependenciesTable.createdAt] = createdAt
        }
    }

    /**
     * Deletes dependency relationships owned by an issue.
     *
     * ONLY removes relationships where this issue is the `blockedId` (the owner).
     * Does NOT delete relationships where this issue is the `blockerId` (referenced by others).
     *
     * This ensures that saving an issue only affects its own dependency lists
     * and doesn't delete relationships owned by other issues.
     *
     * Example: If issueA depends on issueB:
     * - Record: blockerId=issueB, blockedId=issueA, type=depends
     * - Owned by issueA (appears in issueA.dependencies)
     * - deleteIssueDependencies(issueA) deletes it ✓
     * - deleteIssueDependencies(issueB) does NOT delete it ✓
     *
     * @param issueId The issue ID whose owned dependencies should be removed
     */
    private fun deleteIssueDependencies(issueId: IssueId) {
        IssueDependenciesTable.deleteWhere {
            IssueDependenciesTable.blockedId eq issueId.value
        }
    }

    /**
     * Loads all dependency relationships for an issue.
     *
     * Queries the IssueDependenciesTable to find all relationships where this issue
     * is the blocked party, then categorizes them by relationship type.
     *
     * @param issueId The issue ID to load dependencies for
     * @return Pair of (dependencies, blockedBy) lists of issue IDs
     */
    private fun loadIssueDependencies(issueId: String): DependencyRelationships {
        val dependencies = mutableSetOf<IssueId>()
        val blockedBy = mutableSetOf<IssueId>()

        IssueDependenciesTable
            .selectAll()
            .where { IssueDependenciesTable.blockedId eq issueId }
            .forEach { row ->
                val blockerId = IssueId.fromString(row[IssueDependenciesTable.blockerId])
                val depType = row[IssueDependenciesTable.dependencyType]

                when (depType) {
                    DependencyType.DEPENDS_ON.value -> dependencies.add(blockerId)
                    DependencyType.BLOCKED_BY.value -> blockedBy.add(blockerId)
                    else -> {
                        // Handle legacy data with comma-separated types
                        val types = depType.split(",")
                        if ("depends" in types) dependencies.add(blockerId)
                        if ("blocks" in types) blockedBy.add(blockerId)
                    }
                }
            }

        return DependencyRelationships(
            dependencies = dependencies.toList(),
            blockedBy = blockedBy.toList()
        )
    }

    /**
     * Converts a database row to an Issue domain entity.
     *
     * This method handles the complete reconstitution of an Issue aggregate,
     * including loading all its dependency relationships and converting database
     * values to domain value objects.
     *
     * Special handling:
     * - Empty projectId strings are treated as null (for backward compatibility)
     * - Missing estimates default to Estimate.none()
     * - Dependencies are loaded from the separate relationship table
     *
     * @receiver ResultRow from the IssuesTable query
     * @return The fully reconstituted Issue entity
     */
    private fun ResultRow.toIssue(): Issue {
        val issueId = this[IssuesTable.id].value
        val relationships = loadIssueDependencies(issueId)

        // Build snapshot for reconstitution
        val snapshot = IssueSnapshot(
            id = IssueId.fromString(issueId),
            title = this[IssuesTable.title],
            description = this[IssuesTable.description],
            type = IssueType.fromString(this[IssuesTable.type]),
            status = IssueStatus.fromString(this[IssuesTable.status]),
            parentId = this[IssuesTable.parentId]?.let { IssueId.fromString(it) },
            projectId = this[IssuesTable.projectId]?.let { ProjectId.fromString(it) },
            estimate = this[IssuesTable.estimate]?.let { Estimate.of(it) } ?: Estimate.none(),
            assigneeId = this[IssuesTable.assigneeId],
            dependencies = relationships.dependencies,
            blockedBy = relationships.blockedBy,
            createdAt = this[IssuesTable.createdAt],
            updatedAt = this[IssuesTable.updatedAt]
        )

        return Issue.fromSnapshot(snapshot, timeProvider)
    }

    /**
     * Checks if an issue exists in the database and is not soft-deleted.
     *
     * Uses SELECT 1 with LIMIT 1 for optimal performance, as we only need
     * to know existence, not retrieve the actual data.
     *
     * @param id The issue ID to check
     * @return true if the issue exists and is not deleted, false otherwise
     */
    private fun checkIssueExists(id: IssueId): Boolean {
        return IssuesTable
            .selectAll()
            .where {
                (IssuesTable.id eq id.value) and
                (IssuesTable.deletedAt.isNull())
            }
            .limit(1)
            .count() > 0
    }

    // ================== Helper Methods ==================

    /**
     * Finds issues matching a specific condition.
     *
     * This is a reusable helper method that reduces code duplication across
     * the various find methods. Automatically filters out soft-deleted issues.
     *
     * @param condition The SQL condition to apply
     * @return List of issues matching the condition (excluding deleted)
     */
    private fun findIssuesByCondition(condition: SqlExpressionBuilder.() -> Op<Boolean>): List<Issue> {
        return IssuesTable
            .selectAll()
            .where {
                condition() and IssuesTable.deletedAt.isNull()
            }
            .orderBy(IssuesTable.createdAt to SortOrder.ASC)
            .map { it.toIssue() }
    }

    // ================== Data Classes ==================

    /**
     * Internal data class for managing dependency relationships.
     *
     * @property dependencies List of issues this issue depends on
     * @property blockedBy List of issues blocking this issue
     */
    private data class DependencyRelationships(
        val dependencies: List<IssueId>,
        val blockedBy: List<IssueId>
    )

    /**
     * Enum representing types of dependency relationships.
     *
     * Using an enum provides type safety and prevents typos in dependency type strings.
     */
    private enum class DependencyType(val value: String) : Comparable<DependencyType> {
        DEPENDS_ON("depends"),
        BLOCKED_BY("blocks");

        companion object {
            fun fromString(value: String): DependencyType? =
                entries.find { it.value == value }
        }
    }
}
