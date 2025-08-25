package io.spiralhouse.cycletime.domain.repositories

import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectStatus

interface ProjectRepository {
    suspend fun findById(id: ProjectId): Project?
    suspend fun findByStatus(status: ProjectStatus): List<Project>
    suspend fun findAll(): List<Project>
    suspend fun save(project: Project)
    suspend fun delete(id: ProjectId)
    suspend fun exists(id: ProjectId): Boolean
}
