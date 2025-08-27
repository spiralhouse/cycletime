package io.spiralhouse.cycletime.api.dto

import kotlinx.serialization.Serializable

/**
 * Request DTO for updating an existing project.
 */
@Serializable
data class UpdateProjectRequest(
    val name: String? = null,
    val description: String? = null
)