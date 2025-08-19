package com.spiralhouse.jcvd.domain.repositories

import com.spiralhouse.jcvd.domain.entities.Project
import com.spiralhouse.jcvd.domain.valueobjects.ProjectId
import com.spiralhouse.jcvd.domain.valueobjects.ProjectStatus

interface ProjectRepository {
    suspend fun findById(id: ProjectId): Project?
    suspend fun findByStatus(status: ProjectStatus): List<Project>
    suspend fun findAll(): List<Project>
    suspend fun save(project: Project)
    suspend fun delete(id: ProjectId)
    suspend fun exists(id: ProjectId): Boolean
}