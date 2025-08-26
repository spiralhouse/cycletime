package io.spiralhouse.cycletime.domain.valueobjects

import kotlinx.serialization.Serializable
import java.util.UUID

/**
 * Value object representing a unique issue identifier.
 *
 * Enforces UUID format validation and provides factory methods for
 * generating new IDs or creating from existing UUID strings.
 *
 * This is an immutable value object with value semantics.
 */
@Serializable
data class IssueId constructor(private val _value: String?) {
    val value: String = _value ?: throw IllegalArgumentException("IssueId cannot be null")

    init {
        require(value.isNotBlank()) { "IssueId cannot be empty" }
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
            throw IllegalArgumentException("Invalid UUID format: $displayValue", e)
        }
    }

    companion object {
        /**
         * Generates a new random IssueId.
         *
         * @return A new IssueId with a randomly generated UUID
         */
        fun generate(): IssueId = IssueId(UUID.randomUUID().toString())

        /**
         * Creates an IssueId from a string value.
         *
         * @param value The UUID string to create from
         * @return An IssueId instance
         * @throws IllegalArgumentException if value is null or invalid
         */
        fun fromString(value: String?): IssueId {
            require(value != null) { "IssueId cannot be null" }
            return IssueId(value)
        }
    }

    /**
     * Returns the string representation of this IssueId.
     *
     * @return The UUID value as a string
     */
    override fun toString(): String = value
}
