package io.spiralhouse.cycletime.api.dto

import kotlinx.serialization.Serializable

/**
 * Request DTO for creating a new issue.
 */
@Serializable
data class CreateIssueRequest(
    val projectId: String? = null,
    val title: String,
    val description: String? = null,
    val type: String, // "EPIC", "STORY", "SUBTASK"
    val parentId: String? = null,
    val estimate: Int? = null,
    val assignee: String? = null
)