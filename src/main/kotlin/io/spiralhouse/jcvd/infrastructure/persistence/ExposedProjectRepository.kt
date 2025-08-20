package io.spiralhouse.jcvd.infrastructure.persistence

import io.spiralhouse.jcvd.domain.entities.Project
import io.spiralhouse.jcvd.domain.entities.ProjectSnapshot
import io.spiralhouse.jcvd.domain.repositories.ProjectRepository
import io.spiralhouse.jcvd.domain.services.SystemTimeProvider
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import io.spiralhouse.jcvd.domain.valueobjects.ProjectStatus
import io.spiralhouse.jcvd.infrastructure.database.ProjectsTable
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction

/**
 * Repository implementation for Project entities using Exposed ORM.
 * 
 * Provides persistence operations for Project aggregates, handling
 * the conversion between domain entities and database records.
 * Uses the snapshot pattern for reconstitution.
 */
class ExposedProjectRepository : ProjectRepository {

    override suspend fun findById(id: ProjectId): Project? = dbQuery {
        ProjectsTable
            .selectAll()
            .where { ProjectsTable.id eq id.value }
            .singleOrNull()
            ?.toProject()
    }

    override suspend fun findByStatus(status: ProjectStatus): List<Project> = dbQuery {
        ProjectsTable
            .selectAll()
            .where { ProjectsTable.status eq status.value }
            .map { it.toProject() }
    }

    override suspend fun findAll(): List<Project> = dbQuery {
        ProjectsTable
            .selectAll()
            .map { it.toProject() }
    }

    override suspend fun save(project: Project) {
        dbQuery {
            val exists = ProjectsTable
                .selectAll()
                .where { ProjectsTable.id eq project.id.value }
                .count() > 0

            if (exists) {
                updateProject(project)
            } else {
                insertProject(project)
            }
        }
    }
    
    private fun updateProject(project: Project) {
        ProjectsTable.update({ ProjectsTable.id eq project.id.value }) {
            it[name] = project.name
            it[description] = project.description
            it[status] = project.status.value
            it[updatedAt] = project.updatedAt
        }
    }
    
    private fun insertProject(project: Project) {
        ProjectsTable.insert {
            it[id] = EntityID(project.id.value, ProjectsTable)
            it[name] = project.name
            it[description] = project.description
            it[status] = project.status.value
            it[createdAt] = project.createdAt
            it[updatedAt] = project.updatedAt
        }
    }

    override suspend fun delete(id: ProjectId) {
        dbQuery {
            ProjectsTable.deleteWhere { ProjectsTable.id eq id.value }
        }
    }

    override suspend fun exists(id: ProjectId): Boolean = dbQuery {
        ProjectsTable
            .selectAll()
            .where { ProjectsTable.id eq id.value }
            .count() > 0
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
            issues = emptyList(), // TODO: Load issues from separate table when implemented
            createdAt = this[ProjectsTable.createdAt],
            updatedAt = this[ProjectsTable.updatedAt]
        )
        return Project.fromSnapshot(snapshot, SystemTimeProvider())
    }

    /**
     * Executes a database query within a transaction.
     * 
     * @param block The query to execute
     * @return The query result
     */
    private suspend fun <T> dbQuery(block: suspend () -> T): T =
        newSuspendedTransaction(Dispatchers.IO) { block() }
}
