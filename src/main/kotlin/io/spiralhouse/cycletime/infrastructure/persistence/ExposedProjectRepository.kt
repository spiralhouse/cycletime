package io.spiralhouse.cycletime.infrastructure.persistence

import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.entities.ProjectSnapshot
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectStatus
import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.domain.exceptions.ProjectNotFoundException
import io.spiralhouse.cycletime.infrastructure.database.ProjectsTable
import io.spiralhouse.cycletime.infrastructure.database.IssuesTable
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.slf4j.LoggerFactory

/**
 * Repository implementation for Project entities using Exposed ORM.
 *
 * Provides persistence operations for Project aggregates, handling
 * the conversion between domain entities and database records.
 * Uses the snapshot pattern for reconstitution.
 *
 * ## Thread-Safety Guarantees
 * 
 * This repository is **thread-safe** and designed for singleton scope in DI:
 * - All instance properties are immutable (timeProvider, database)
 * - Each operation runs in its own transaction context via dbQuery()
 * - No mutable state is maintained between operations
 * - Exposed ORM handles connection pooling and transaction isolation
 * 
 * ## Concurrency Model
 * 
 * - **Isolation Level**: SERIALIZABLE (configured in DatabaseConfig)
 * - **Transaction Reuse**: Participates in existing transactions when called from UnitOfWork
 * - **Connection Pooling**: Managed by HikariCP with configurable pool size
 * - **Lock Timeout**: 5 seconds for H2 (prevents deadlocks)
 *
 * @property timeProvider The time provider for entity reconstitution (immutable)
 * @property database Optional database instance for testing (immutable)
 */
@ThreadSafe // Documenting thread-safety guarantee
class ExposedProjectRepository(
    timeProvider: TimeProvider = SystemTimeProvider(),
    database: Database? = null
) : BaseExposedRepository(timeProvider, database), ProjectRepository {

    companion object {
        private val logger = LoggerFactory.getLogger(ExposedProjectRepository::class.java)
    }

    /**
     * Finds a project by its unique identifier.
     * Excludes soft-deleted projects.
     *
     * @param id The project ID to search for
     * @return The project if found and not deleted, null otherwise
     */
    override suspend fun findById(id: ProjectId): Project? = dbQuery {
        ProjectsTable
            .selectAll()
            .where {
                (ProjectsTable.id eq id.value) and
                (ProjectsTable.deletedAt.isNull())
            }
            .singleOrNull()
            ?.toProject()
    }

    /**
     * Finds all projects with the specified status.
     * Excludes soft-deleted projects.
     * Uses batch loading to avoid N+1 query issues.
     *
     * @param status The project status to filter by
     * @return List of projects matching the status (excluding deleted)
     */
    override suspend fun findByStatus(status: ProjectStatus): List<Project> = dbQuery {
        val projectRows = ProjectsTable
            .selectAll()
            .where {
                (ProjectsTable.status eq status.value) and
                (ProjectsTable.deletedAt.isNull())
            }
            .toList()
        
        // Batch load all issues for these projects
        val projectIds = projectRows.map { it[ProjectsTable.id].value }
        val issueMap = loadProjectIssueIdsBatch(projectIds)
        
        // Convert rows to projects with their issues
        projectRows.map { row ->
            val projectId = row[ProjectsTable.id].value
            val issues = issueMap[projectId] ?: emptyList()
            row.toProjectWithIssues(issues)
        }
    }

    /**
     * Retrieves all projects from the repository.
     * Excludes soft-deleted projects.
     * Uses batch loading to avoid N+1 query issues.
     *
     * @return List of all active projects (excluding deleted)
     */
    override suspend fun findAll(): List<Project> = dbQuery {
        val projectRows = ProjectsTable
            .selectAll()
            .where { ProjectsTable.deletedAt.isNull() }
            .toList()
        
        // Batch load all issues for these projects
        val projectIds = projectRows.map { it[ProjectsTable.id].value }
        val issueMap = loadProjectIssueIdsBatch(projectIds)
        
        // Convert rows to projects with their issues
        projectRows.map { row ->
            val projectId = row[ProjectsTable.id].value
            val issues = issueMap[projectId] ?: emptyList()
            row.toProjectWithIssues(issues)
        }
    }

    /**
     * Persists a project to the repository.
     * Updates existing projects or inserts new ones based on ID existence.
     *
     * @param project The project to save
     * @throws Exception if database operation fails
     */
    override suspend fun save(project: Project) {
        dbQuery {
            val exists = checkProjectExists(project.id)

            if (exists) {
                updateProject(project)
            } else {
                insertProject(project)
            }
        }
    }

    /**
     * Updates an existing project in the database.
     *
     * @param project The project to update
     */
    private fun updateProject(project: Project) {
        ProjectsTable.update({ ProjectsTable.id eq project.id.value }) {
            it[name] = project.name
            it[description] = project.description
            it[status] = project.status.value
            it[updatedAt] = project.updatedAt
        }

        // Update issue associations
        persistProjectIssues(project)
    }

    /**
     * Inserts a new project into the database.
     *
     * @param project The project to insert
     */
    private fun insertProject(project: Project) {
        ProjectsTable.insert {
            it[id] = EntityID(project.id.value, ProjectsTable)
            it[name] = project.name
            it[description] = project.description
            it[status] = project.status.value
            it[createdAt] = project.createdAt
            it[updatedAt] = project.updatedAt
        }

        // Persist issue associations
        persistProjectIssues(project)
    }

    /**
     * Deletes a project from the repository.
     *
     * @param id The ID of the project to delete
     */
    override suspend fun delete(id: ProjectId) {
        dbQuery {
            // Note: Issue cleanup should be handled by IssueRepository
            // Only delete the project record itself
            ProjectsTable.deleteWhere { ProjectsTable.id eq id.value }
        }
    }

    /**
     * Checks if a project exists in the repository.
     * Excludes soft-deleted projects.
     *
     * @param id The project ID to check
     * @return true if the project exists and is not deleted, false otherwise
     */
    override suspend fun exists(id: ProjectId): Boolean = dbQuery {
        ProjectsTable
            .select(ProjectsTable.id)
            .where {
                (ProjectsTable.id eq id.value) and
                (ProjectsTable.deletedAt.isNull())
            }
            .limit(1)
            .count() > 0
    }

    /**
     * Soft-deletes a project by setting deleted_at timestamp.
     * Cascades deletion to all contained issues in a single transaction.
     *
     * @param id The project ID to soft-delete
     * @throws ProjectNotFoundException if project does not exist
     */
    override suspend fun softDelete(id: ProjectId) {
        dbQuery {
            // 1. Verify project exists (throw exception if not)
            val exists = ProjectsTable
                .selectAll()
                .where { ProjectsTable.id eq id.value }
                .count() > 0

            if (!exists) {
                throw ProjectNotFoundException(id.value)
            }

            // 2. Set deleted_at timestamp on project
            val now = timeProvider.now()
            ProjectsTable.update({ ProjectsTable.id eq id.value }) {
                it[deletedAt] = now
            }

            // 3. CASCADE: Batch update all contained issues
            val cascadeCount = IssuesTable.update({
                IssuesTable.projectId eq id.value
            }) {
                it[deletedAt] = now
            }

            // 4. Audit logging
            logger.info("Soft-deleted project ${id.value} with $cascadeCount issues")
        }
    }

    /**
     * Restores a soft-deleted project by clearing deleted_at timestamp.
     * Does NOT cascade to issues - they must be restored individually.
     *
     * @param id The project ID to restore
     */
    override suspend fun restore(id: ProjectId) {
        dbQuery {
            // Restore project ONLY (NOT issues - explicit user choice)
            val updateCount = ProjectsTable.update({
                ProjectsTable.id eq id.value
            }) {
                it[deletedAt] = null
            }

            // Idempotent: If project doesn't exist or already active, updateCount will be 0 or 1
            if (updateCount > 0) {
                logger.info("Restored project ${id.value} (issues not auto-restored)")
            }
        }
    }

    /**
     * Finds all soft-deleted projects.
     * Uses batch loading to avoid N+1 query issues.
     *
     * @return List of deleted projects
     */
    override suspend fun findDeleted(): List<Project> = dbQuery {
        val projectRows = ProjectsTable
            .selectAll()
            .where { ProjectsTable.deletedAt.isNotNull() }
            .orderBy(ProjectsTable.deletedAt to SortOrder.DESC)
            .toList()

        // Batch load all issues for these projects
        val projectIds = projectRows.map { it[ProjectsTable.id].value }
        val issueMap = loadProjectIssueIdsBatch(projectIds)

        // Convert rows to projects with their issues
        projectRows.map { row ->
            val projectId = row[ProjectsTable.id].value
            val issues = issueMap[projectId] ?: emptyList()
            row.toProjectWithIssues(issues)
        }
    }

    /**
     * Finds a project by ID, including soft-deleted projects.
     *
     * @param id The project ID to find
     * @return The project if found (including deleted), null otherwise
     */
    override suspend fun findIncludingDeleted(id: ProjectId): Project? = dbQuery {
        ProjectsTable
            .selectAll()
            .where { ProjectsTable.id eq id.value }
            .singleOrNull()
            ?.toProject()
    }

    /**
     * Converts a database row to a Project domain entity.
     *
     * @return The reconstituted Project entity
     */
    private fun ResultRow.toProject(): Project {
        // Use fromSnapshot method to reconstruct Project entity
        val snapshot = ProjectSnapshot(
            id = ProjectId(this[ProjectsTable.id].value),
            name = this[ProjectsTable.name],
            description = this[ProjectsTable.description],
            status = ProjectStatus.fromString(this[ProjectsTable.status]),
            issues = loadProjectIssueIds(this[ProjectsTable.id].value),
            createdAt = this[ProjectsTable.createdAt],
            updatedAt = this[ProjectsTable.updatedAt],
            deletedAt = this[ProjectsTable.deletedAt]
        )
        return Project.fromSnapshot(snapshot, timeProvider)
    }

    /**
     * Converts a database row to a Project domain entity with pre-loaded issues.
     * Used by batch loading methods to avoid N+1 queries.
     *
     * @param issues Pre-loaded list of issue IDs for this project
     * @return The reconstituted Project entity
     */
    private fun ResultRow.toProjectWithIssues(issues: List<IssueId>): Project {
        val snapshot = ProjectSnapshot(
            id = ProjectId(this[ProjectsTable.id].value),
            name = this[ProjectsTable.name],
            description = this[ProjectsTable.description],
            status = ProjectStatus.fromString(this[ProjectsTable.status]),
            issues = issues,
            createdAt = this[ProjectsTable.createdAt],
            updatedAt = this[ProjectsTable.updatedAt],
            deletedAt = this[ProjectsTable.deletedAt]
        )
        return Project.fromSnapshot(snapshot, timeProvider)
    }

    /**
     * Loads all issue IDs associated with a project.
     * 
     * ## Performance Optimization: Batch Loading Implementation
     * 
     * This method now supports both single and batch loading to avoid N+1 query issues.
     * When loading multiple projects, use the batch variant through findAll() and findByStatus().
     * 
     * **Performance Improvement**: 
     * - Single project: 2 queries (project + issues)
     * - Multiple projects: 2 queries total (all projects + all issues in batch)
     *
     * @param projectId The project ID to load issues for
     * @return List of issue IDs associated with the project
     */
    private fun loadProjectIssueIds(projectId: String): List<IssueId> {
        return IssuesTable
            .selectAll()
            .where { IssuesTable.projectId eq projectId }
            .map { row -> IssueId.fromString(row[IssuesTable.id].value) }
    }

    /**
     * Batch loads issue IDs for multiple projects in a single query.
     * Addresses the N+1 query performance issue.
     *
     * @param projectIds List of project IDs to load issues for
     * @return Map of project ID to list of issue IDs
     */
    private fun loadProjectIssueIdsBatch(projectIds: List<String>): Map<String, List<IssueId>> {
        if (projectIds.isEmpty()) return emptyMap()
        
        return IssuesTable
            .selectAll()
            .where { IssuesTable.projectId inList projectIds }
            .mapNotNull { row ->
                // Filter out null project IDs (shouldn't happen with our WHERE clause)
                row[IssuesTable.projectId]?.let { projectId ->
                    projectId to IssueId.fromString(row[IssuesTable.id].value)
                }
            }
            .groupBy({ it.first }, { it.second })
    }

    /**
     * Persists the issue associations for a project.
     * Creates placeholder issue records to maintain referential integrity.
     *
     * @param project The project whose issues should be persisted
     */
    private fun persistProjectIssues(project: Project) {
        // Delete existing issue associations
        IssuesTable.deleteWhere { IssuesTable.projectId eq project.id.value }
        
        // Insert new issue associations
        // Note: This creates minimal placeholder records. Full issue details
        // should be managed by IssueRepository when that's implemented.
        project.issues.forEach { issueId ->
            // Check if issue already exists
            val existingIssue = IssuesTable
                .selectAll()
                .where { IssuesTable.id eq issueId.value }
                .singleOrNull()
            
            if (existingIssue == null) {
                IssuesTable.insert {
                    it[id] = EntityID(issueId.value, IssuesTable)
                    it[projectId] = project.id.value
                    it[title] = "Issue ${issueId.value}" // Placeholder title
                    it[type] = "subtask" // Default type
                    it[status] = "todo" // Default status
                    it[priority] = 0
                    it[createdAt] = project.createdAt
                    it[updatedAt] = project.updatedAt
                }
            } else {
                // Update the project association if the issue already exists
                IssuesTable.update({ IssuesTable.id eq issueId.value }) {
                    it[projectId] = project.id.value
                }
            }
        }
    }


    /**
     * Checks if a project exists in the database.
     *
     * @param id The project ID to check
     * @return true if the project exists, false otherwise
     */
    private fun checkProjectExists(id: ProjectId): Boolean {
        return checkExists(ProjectsTable) { ProjectsTable.id eq id.value }
    }

}
