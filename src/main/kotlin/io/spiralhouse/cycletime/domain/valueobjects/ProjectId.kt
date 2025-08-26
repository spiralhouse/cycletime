package io.spiralhouse.cycletime.domain.valueobjects

import kotlinx.serialization.Serializable
import java.util.UUID

/**
 * Value object representing a unique project identifier.
 *
 * Enforces UUID format validation and provides factory methods for
 * generating new IDs or creating from existing UUID strings.
 *
 * This is an immutable value object with value semantics.
 */
@Serializable
data class ProjectId constructor(private val _value: String?) {
    val value: String = _value ?: throw IllegalArgumentException("ProjectId cannot be null")

    init {
        require(value.isNotBlank()) { "ProjectId cannot be empty" }
        validateUuidFormat(value)
    }

    private fun validateUuidFormat(value: String) {
        try {
            UUID.fromString(value)
        } catch (e: IllegalArgumentException) {
            // Escape special characters for cleaner error messages
            val displayValue = value.replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")
            throw IllegalArgumentException("Invalid UUID format: $displayValue", e)
        }
    }

    companion object {
        /**
         * Generates a new random ProjectId.
         *
         * @return A new ProjectId with a randomly generated UUID
         */
        fun generate(): ProjectId = ProjectId(UUID.randomUUID().toString())

        /**
         * Creates a ProjectId from a string value.
         *
         * @param value The UUID string to create from
         * @return A ProjectId instance
         * @throws IllegalArgumentException if value is null or invalid
         */
        fun fromString(value: String?): ProjectId {
            require(value != null) { "ProjectId cannot be null" }
            return ProjectId(value)
        }
    }

    /**
     * Returns the string representation of this ProjectId.
     *
     * @return The UUID value as a string
     */
    override fun toString(): String = value
}
