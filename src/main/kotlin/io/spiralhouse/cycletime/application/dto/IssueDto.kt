package io.spiralhouse.cycletime.application.dto

import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.infrastructure.serialization.InstantSerializer
import io.spiralhouse.cycletime.infrastructure.serialization.NullableInstantSerializer
import io.spiralhouse.cycletime.infrastructure.serialization.IssueIdSerializer
import io.spiralhouse.cycletime.infrastructure.serialization.ProjectIdSerializer
import io.spiralhouse.cycletime.infrastructure.serialization.NullableIssueIdSerializer
import io.spiralhouse.cycletime.infrastructure.serialization.NullableProjectIdSerializer
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable

/**
 * Data Transfer Object representing an Issue for the application layer.
 * Used to transfer issue data between layers without exposing domain entity internals.
 */
@Serializable
data class IssueDto(
    @Serializable(with = IssueIdSerializer::class)
    val id: IssueId,
    val title: String,
    val description: String?,
    val type: IssueType,
    val status: IssueStatus,
    @Serializable(with = NullableIssueIdSerializer::class)
    val parentId: IssueId?,
    @Serializable(with = NullableProjectIdSerializer::class)
    val projectId: ProjectId?,
    val estimate: Estimate,
    val assigneeId: String?,
    val dependencies: List<@Serializable(with = IssueIdSerializer::class) IssueId>,
    val blockedBy: List<@Serializable(with = IssueIdSerializer::class) IssueId>,
    @Serializable(with = InstantSerializer::class)
    val createdAt: Instant,
    @Serializable(with = InstantSerializer::class)
    val updatedAt: Instant,
    @Serializable(with = NullableInstantSerializer::class)
    val deletedAt: Instant? = null
) {
    companion object {
        /**
         * Creates an IssueDto from a domain Issue entity.
         */
        fun fromIssue(issue: Issue): IssueDto {
            return IssueDto(
                id = issue.id,
                title = issue.title,
                description = issue.description,
                type = issue.type,
                status = issue.status,
                parentId = issue.parentId,
                projectId = issue.projectId,
                estimate = issue.estimate,
                assigneeId = issue.assigneeId,
                dependencies = issue.dependencies,
                blockedBy = issue.blockedBy,
                createdAt = issue.createdAt,
                updatedAt = issue.updatedAt,
                deletedAt = issue.deletedAt
            )
        }
    }
}

/**
 * Data Transfer Object containing a list of issues.
 */
@Serializable
data class IssueListDto(
    val issues: List<IssueDto>,
    val totalCount: Int
) {
    companion object {
        fun fromIssues(issues: List<Issue>): IssueListDto {
            return IssueListDto(
                issues = issues.map { IssueDto.fromIssue(it) },
                totalCount = issues.size
            )
        }
    }
}

/**
 * Data Transfer Object representing an issue hierarchy.
 */
@Serializable
data class IssueHierarchyDto(
    val issue: IssueDto,
    val children: List<IssueHierarchyDto>
) {
    companion object {
        fun fromIssueWithChildren(
            issue: Issue,
            childHierarchies: List<IssueHierarchyDto> = emptyList()
        ): IssueHierarchyDto {
            return IssueHierarchyDto(
                issue = IssueDto.fromIssue(issue),
                children = childHierarchies
            )
        }
    }
}

/**
 * Extended Data Transfer Object for issue hierarchy that includes parent and descendant count.
 */
@Serializable
data class IssueHierarchyExtendedDto(
    val issue: IssueDto,
    val parent: IssueDto?,
    val children: List<IssueDto>,
    val totalDescendants: Int
) {
    companion object {
        fun fromIssueWithParentAndChildren(
            issue: Issue,
            parent: Issue?,
            children: List<Issue>,
            totalDescendants: Int
        ): IssueHierarchyExtendedDto {
            return IssueHierarchyExtendedDto(
                issue = IssueDto.fromIssue(issue),
                parent = parent?.let { IssueDto.fromIssue(it) },
                children = children.map { IssueDto.fromIssue(it) },
                totalDescendants = totalDescendants
            )
        }
    }
}
