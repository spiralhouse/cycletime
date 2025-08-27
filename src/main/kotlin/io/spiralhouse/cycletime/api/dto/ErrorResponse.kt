package io.spiralhouse.cycletime.api.dto

import kotlinx.serialization.Serializable

/**
 * Response DTO for API errors.
 * 
 * The timestamp should be provided by the error handler middleware
 * to ensure proper time injection and testability.
 */
@Serializable
data class ErrorResponse(
    val error: String,
    val details: String? = null,
    val timestamp: String? = null
)