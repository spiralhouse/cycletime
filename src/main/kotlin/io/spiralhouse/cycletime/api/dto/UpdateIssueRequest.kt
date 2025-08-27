package io.spiralhouse.cycletime.api.dto

import kotlinx.serialization.Serializable

/**
 * Request DTO for updating an existing issue.
 */
@Serializable
data class UpdateIssueRequest(
    val title: String? = null,
    val description: String? = null,
    val estimate: Int? = null,
    val assignee: String? = null
)