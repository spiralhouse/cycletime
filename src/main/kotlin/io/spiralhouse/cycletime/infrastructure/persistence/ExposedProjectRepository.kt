package io.spiralhouse.cycletime.infrastructure.persistence

import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.entities.ProjectSnapshot
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectStatus
import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.infrastructure.database.ProjectsTable
import io.spiralhouse.cycletime.infrastructure.database.IssuesTable
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction

/**
 * Repository implementation for Project entities using Exposed ORM.
 *
 * Provides persistence operations for Project aggregates, handling
 * the conversion between domain entities and database records.
 * Uses the snapshot pattern for reconstitution.
 *
 * @property timeProvider The time provider for entity reconstitution
 */
class ExposedProjectRepository(
    private val timeProvider: TimeProvider = SystemTimeProvider(),
    private val database: Database? = null
) : ProjectRepository {

    /**
     * Finds a project by its unique identifier.
     *
     * @param id The project ID to search for
     * @return The project if found, null otherwise
     */
    override suspend fun findById(id: ProjectId): Project? = dbQuery {
        ProjectsTable
            .selectAll()
            .where { ProjectsTable.id eq id.value }
            .singleOrNull()
            ?.toProject()
    }

    /**
     * Finds all projects with the specified status.
     *
     * @param status The project status to filter by
     * @return List of projects matching the status
     */
    override suspend fun findByStatus(status: ProjectStatus): List<Project> = dbQuery {
        ProjectsTable
            .selectAll()
            .where { ProjectsTable.status eq status.value }
            .map { it.toProject() }
    }

    /**
     * Retrieves all projects from the repository.
     *
     * @return List of all projects
     */
    override suspend fun findAll(): List<Project> = dbQuery {
        ProjectsTable
            .selectAll()
            .map { it.toProject() }
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

        // Note: Issue persistence is handled by IssueRepository to maintain single responsibility
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

        // Note: Issue persistence is handled by IssueRepository to maintain single responsibility
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
     *
     * @param id The project ID to check
     * @return true if the project exists, false otherwise
     */
    override suspend fun exists(id: ProjectId): Boolean = dbQuery {
        checkProjectExists(id)
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
            updatedAt = this[ProjectsTable.updatedAt]
        )
        return Project.fromSnapshot(snapshot, timeProvider)
    }

    /**
     * Loads all issue IDs associated with a project.
     * 
     * ## Performance Issue: N+1 Query Pattern
     * 
     * **Problem**: When loading multiple projects (e.g., in findAll()), this method is called 
     * once per project, resulting in N+1 database queries (1 for projects + N for issues).
     * 
     * **Impact**: With 100 projects averaging 50 issues each:
     * - Current: 101 queries (1 + 100)
     * - Database roundtrips create significant latency under load
     * - Connection pool exhaustion risk with concurrent requests
     * 
     * **Proposed Solution**: Implement batch loading using IN clause:
     * ```kotlin
     * private fun loadProjectIssueIdsBatch(projectIds: List<String>): Map<String, List<IssueId>> {
     *     return IssuesTable
     *         .selectAll()
     *         .where { IssuesTable.projectId inList projectIds }
     *         .groupBy { it[IssuesTable.projectId] }
     *         .mapValues { (_, rows) -> 
     *             rows.map { IssueId.fromString(it[IssuesTable.id].value) }
     *         }
     * }
     * ```
     * This reduces queries from N+1 to 2 (1 for projects + 1 for all issues).
     * 
     * **Tracking**: Create Linear issue SPI-XXX for batch loading optimization
     * Priority: Medium (becomes High when project count > 50)
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
     * Checks if a project exists in the database.
     *
     * @param id The project ID to check
     * @return true if the project exists, false otherwise
     */
    private fun checkProjectExists(id: ProjectId): Boolean {
        return ProjectsTable
            .selectAll()
            .where { ProjectsTable.id eq id.value }
            .count() > 0
    }

    /**
     * Executes a database query within a transaction.
     *
     * @param block The query to execute
     * @return The query result
     */
    private suspend fun <T> dbQuery(block: suspend () -> T): T =
        if (database != null) {
            newSuspendedTransaction(Dispatchers.IO, database) { block() }
        } else {
            newSuspendedTransaction(Dispatchers.IO) { block() }
        }
}
