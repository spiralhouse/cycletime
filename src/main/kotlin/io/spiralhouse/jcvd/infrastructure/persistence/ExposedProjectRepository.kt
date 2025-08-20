package io.spiralhouse.jcvd.infrastructure.persistence

import io.spiralhouse.jcvd.domain.entities.Project
import io.spiralhouse.jcvd.domain.repositories.ProjectRepository
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import io.spiralhouse.jcvd.domain.valueobjects.ProjectStatus
import io.spiralhouse.jcvd.infrastructure.database.ProjectsTable
import kotlinx.coroutines.Dispatchers
import kotlinx.datetime.Clock
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction

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
            ProjectsTable.update({ ProjectsTable.id eq project.id.value }) {
                it[name] = project.name
                it[description] = project.description
                it[status] = project.status.value
                it[updatedAt] = project.updatedAt
            }
        } else {
            ProjectsTable.insert {
                it[id] = EntityID(project.id.value, ProjectsTable)
                it[name] = project.name
                it[description] = project.description
                it[status] = project.status.value
                it[createdAt] = project.createdAt
                it[updatedAt] = project.updatedAt
            }
        }
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

    private fun ResultRow.toProject(): Project {
        // Project class constructor signature from entity definition
        return Project(
            id = ProjectId(this[ProjectsTable.id].value),
            _name = this[ProjectsTable.name],
            _description = this[ProjectsTable.description],
            _status = ProjectStatus.fromString(this[ProjectsTable.status]),
            _issues = mutableListOf(), // Load issues separately if needed
            createdAt = this[ProjectsTable.createdAt],
            updatedAt = this[ProjectsTable.updatedAt]
        )
    }

    private suspend fun <T> dbQuery(block: suspend () -> T): T =
        newSuspendedTransaction(Dispatchers.IO) { block() }
}
