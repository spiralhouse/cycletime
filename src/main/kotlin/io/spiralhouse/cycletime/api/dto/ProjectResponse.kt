package io.spiralhouse.cycletime.api.dto

import io.spiralhouse.cycletime.application.dto.ProjectDto
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable

/**
 * Response DTO for project data exposed through the REST API.
 */
@Serializable
data class ProjectResponse(
    val id: String,
    val name: String,
    val description: String?,
    val status: String,
    val issueIds: List<String>,
    val createdAt: String,
    val updatedAt: String
) {
    companion object {
        /**
         * Creates a ProjectResponse from an application layer ProjectDto.
         */
        fun fromDto(dto: ProjectDto): ProjectResponse {
            return ProjectResponse(
                id = dto.id.value,
                name = dto.name,
                description = dto.description,
                status = dto.status.value,
                issueIds = dto.issues.map { it.value },
                createdAt = dto.createdAt.toString(),
                updatedAt = dto.updatedAt.toString()
            )
        }
    }
}

/**
 * Response DTO for a list of projects.
 */
@Serializable
data class ProjectListResponse(
    val projects: List<ProjectResponse>,
    val totalCount: Int
) {
    companion object {
        /**
         * Creates a ProjectListResponse from application layer DTOs.
         */
        fun fromProjectList(projects: List<ProjectDto>): ProjectListResponse {
            return ProjectListResponse(
                projects = projects.map { ProjectResponse.fromDto(it) },
                totalCount = projects.size
            )
        }
    }
}