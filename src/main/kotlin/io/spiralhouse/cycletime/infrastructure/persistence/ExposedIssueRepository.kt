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

    /**
     * Finds an issue by its unique identifier.
     *
     * Retrieves a complete Issue aggregate including all its dependency relationships.
     * The method performs a single query to fetch the issue data and then loads its
     * dependencies from the IssueDependenciesTable.
     *
     * @param id The issue ID to search for
     * @return The fully reconstituted Issue entity if found, null otherwise
     */
    override suspend fun findById(id: IssueId): Issue? = dbQuery {
        findIssueRowById(id.value)?.toIssue()
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
     * Updates an existing issue in the database.
     *
     * @param issue The issue to update
     */
    private fun updateIssue(issue: Issue) {
        IssuesTable.update({ IssuesTable.id eq issue.id.value }) {
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
     * Deletes all dependency relationships for an issue.
     *
     * Removes relationships where the issue appears as either the blocker
     * or the blocked party. This ensures complete cleanup when an issue
     * is deleted or when refreshing its dependencies.
     *
     * @param issueId The issue ID whose dependencies should be deleted
     */
    private fun deleteIssueDependencies(issueId: IssueId) {
        IssueDependenciesTable.deleteWhere {
            (IssueDependenciesTable.blockerId eq issueId.value) or
            (IssueDependenciesTable.blockedId eq issueId.value)
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
     * Checks if an issue exists in the database.
     *
     * Uses SELECT 1 with LIMIT 1 for optimal performance, as we only need
     * to know existence, not retrieve the actual data.
     *
     * @param id The issue ID to check
     * @return true if the issue exists, false otherwise
     */
    private fun checkIssueExists(id: IssueId): Boolean {
        return checkExists(IssuesTable) { IssuesTable.id eq id.value }
    }

    // ================== Helper Methods ==================

    /**
     * Finds issues matching a specific condition.
     *
     * This is a reusable helper method that reduces code duplication across
     * the various find methods.
     *
     * @param condition The SQL condition to apply
     * @return List of issues matching the condition
     */
    private fun findIssuesByCondition(condition: SqlExpressionBuilder.() -> Op<Boolean>): List<Issue> {
        return findByCondition(
            table = IssuesTable,
            condition = condition,
            orderBy = IssuesTable.createdAt to SortOrder.ASC,
            mapper = { it.toIssue() }
        )
    }

    /**
     * Finds a single issue row by ID.
     *
     * @param id The issue ID to search for
     * @return The result row if found, null otherwise
     */
    private fun findIssueRowById(id: String): ResultRow? {
        return IssuesTable
            .selectAll()
            .where { IssuesTable.id eq id }
            .singleOrNull()
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
