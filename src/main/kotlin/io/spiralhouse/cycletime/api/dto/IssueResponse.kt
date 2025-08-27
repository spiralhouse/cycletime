package io.spiralhouse.cycletime.api.dto

import io.spiralhouse.cycletime.application.dto.IssueDto
import io.spiralhouse.cycletime.application.dto.IssueHierarchyDto
import kotlinx.serialization.Serializable

/**
 * Response DTO for issue data exposed through the REST API.
 */
@Serializable
data class IssueResponse(
    val id: String,
    val projectId: String?,
    val title: String,
    val description: String?,
    val type: String,
    val status: String,
    val parentId: String?,
    val estimate: Int?,
    val assignee: String?,
    val dependencies: List<String>,
    val blockedBy: List<String>,
    val createdAt: String,
    val updatedAt: String
) {
    companion object {
        /**
         * Creates an IssueResponse from an application layer IssueDto.
         */
        fun fromDto(dto: IssueDto): IssueResponse {
            return IssueResponse(
                id = dto.id.value,
                projectId = dto.projectId?.value,
                title = dto.title,
                description = dto.description,
                type = dto.type.name,
                status = dto.status.name,
                parentId = dto.parentId?.value,
                estimate = dto.estimate.value,
                assignee = dto.assigneeId,
                dependencies = dto.dependencies.map { it.value },
                blockedBy = dto.blockedBy.map { it.value },
                createdAt = dto.createdAt.toString(),
                updatedAt = dto.updatedAt.toString()
            )
        }
    }
}

/**
 * Response DTO for a list of issues.
 */
@Serializable
data class IssueListResponse(
    val issues: List<IssueResponse>,
    val totalCount: Int
) {
    companion object {
        /**
         * Creates an IssueListResponse from a list of issue DTOs.
         */
        fun fromIssues(issues: List<IssueDto>): IssueListResponse {
            return IssueListResponse(
                issues = issues.map { IssueResponse.fromDto(it) },
                totalCount = issues.size
            )
        }
    }
}

/**
 * Response DTO for issue hierarchy.
 */
@Serializable
data class IssueHierarchyResponse(
    val issue: IssueResponse,
    val children: List<IssueHierarchyResponse>
) {
    companion object {
        /**
         * Creates an IssueHierarchyResponse from application layer DTO.
         */
        fun fromDto(dto: IssueHierarchyDto): IssueHierarchyResponse {
            return IssueHierarchyResponse(
                issue = IssueResponse.fromDto(dto.issue),
                children = dto.children.map { fromDto(it) }
            )
        }
    }
}