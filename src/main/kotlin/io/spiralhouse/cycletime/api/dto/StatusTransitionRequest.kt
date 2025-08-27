package io.spiralhouse.cycletime.api.dto

import kotlinx.serialization.Serializable

/**
 * Request DTO for transitioning issue status.
 */
@Serializable
data class StatusTransitionRequest(
    val status: String // "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELED"
)