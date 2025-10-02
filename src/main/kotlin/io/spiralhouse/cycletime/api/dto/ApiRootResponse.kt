package io.spiralhouse.cycletime.api.dto

import kotlinx.serialization.Serializable

/**
 * Response for the API root endpoint providing version and endpoint information
 */
@Serializable
data class ApiRootResponse(
    val version: String,
    val service: String,
    val description: String,
    val endpoints: ApiEndpoints,
    val documentation: String
)

@Serializable
data class ApiEndpoints(
    val projects: String,
    val workflows: String,
    val issues: String
)