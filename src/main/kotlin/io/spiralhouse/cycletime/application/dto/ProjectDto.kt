package io.spiralhouse.cycletime.application.dto

import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectStatus
import io.spiralhouse.cycletime.infrastructure.serialization.InstantSerializer
import io.spiralhouse.cycletime.infrastructure.serialization.NullableInstantSerializer
import io.spiralhouse.cycletime.infrastructure.serialization.ProjectIdSerializer
import io.spiralhouse.cycletime.infrastructure.serialization.IssueIdSerializer
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable

/**
 * Data Transfer Object representing a Project for the application layer.
 * Used to transfer project data between layers without exposing domain entity internals.
 */
@Serializable
data class ProjectDto(
    @Serializable(with = ProjectIdSerializer::class)
    val id: ProjectId,
    val name: String,
    val description: String?,
    val status: ProjectStatus,
    val issues: List<@Serializable(with = IssueIdSerializer::class) IssueId>,
    val issueCount: Int,
    @Serializable(with = InstantSerializer::class)
    val createdAt: Instant,
    @Serializable(with = InstantSerializer::class)
    val updatedAt: Instant,
    @Serializable(with = NullableInstantSerializer::class)
    val deletedAt: Instant? = null
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
                updatedAt = project.updatedAt,
                deletedAt = project.deletedAt
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
