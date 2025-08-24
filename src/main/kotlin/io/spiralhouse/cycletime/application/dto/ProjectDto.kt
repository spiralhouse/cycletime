package io.spiralhouse.cycletime.application.dto

import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectStatus
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable

/**
 * Data Transfer Object representing a Project for the application layer.
 * Used to transfer project data between layers without exposing domain entity internals.
 */
@Serializable
data class ProjectDto(
    val id: ProjectId,
    val name: String,
    val description: String?,
    val status: ProjectStatus,
    val issues: List<IssueId>,
    val issueCount: Int,
    val createdAt: Instant,
    val updatedAt: Instant
) {
    companion object {
        /**
         * Creates a ProjectDto from a domain Project entity.
         */
        fun fromProject(project: Project): ProjectDto {
            return ProjectDto(
                id = project.id,
                name = project.name,
                description = project.description,
                status = project.status,
                issues = project.issues,
                issueCount = project.issueCount,
                createdAt = project.createdAt,
                updatedAt = project.updatedAt
            )
        }
    }
}

/**
 * Data Transfer Object containing a list of projects.
 */
@Serializable
data class ProjectListDto(
    val projects: List<ProjectDto>,
    val totalCount: Int
) {
    companion object {
        fun fromProjects(projects: List<Project>): ProjectListDto {
            return ProjectListDto(
                projects = projects.map { ProjectDto.fromProject(it) },
                totalCount = projects.size
            )
        }
    }
}
