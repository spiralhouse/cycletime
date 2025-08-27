package io.spiralhouse.cycletime.api.dto

import kotlinx.serialization.Serializable

/**
 * Request DTO for creating a new project.
 */
@Serializable
data class CreateProjectRequest(
    val name: String,
    val description: String? = null
)