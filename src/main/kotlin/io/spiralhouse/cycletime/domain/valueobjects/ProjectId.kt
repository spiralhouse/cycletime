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
data class ProjectId @JvmOverloads constructor(private val _value: String?) {
    val value: String = _value ?: throw IllegalArgumentException("ProjectId cannot be null")

    init {
        require(value.isNotBlank()) { "ProjectId cannot be empty" }
        validateUuidFormat(value)
    }

    private fun validateUuidFormat(value: String) {
        // UUID pattern: 8-4-4-4-12 hexadecimal digits
        val uuidRegex = Regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")

        if (!uuidRegex.matches(value)) {
            // Escape special characters for cleaner error messages
            val displayValue = value.replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")
            throw IllegalArgumentException("Invalid UUID format: $displayValue")
        }

        try {
            UUID.fromString(value)
        } catch (e: IllegalArgumentException) {
            val displayValue = value.replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")
            throw IllegalArgumentException("Invalid UUID format: $displayValue")
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
