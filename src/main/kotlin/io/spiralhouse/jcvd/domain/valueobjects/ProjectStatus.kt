package io.spiralhouse.jcvd.domain.valueobjects

import kotlinx.serialization.Serializable

@Serializable
sealed class ProjectStatus(val value: String) {
    @Serializable
    data object Active : ProjectStatus("active")

    @Serializable
    data object Archived : ProjectStatus("archived")

    @Serializable
    data object Completed : ProjectStatus("completed")

    companion object {
        fun fromString(status: String): ProjectStatus = when (status.lowercase()) {
            "active" -> Active
            "archived" -> Archived
            "completed" -> Completed
            else -> throw IllegalArgumentException("Unknown project status: $status")
        }

        fun values(): List<ProjectStatus> = listOf(Active, Archived, Completed)
    }

    override fun toString(): String = value
}
