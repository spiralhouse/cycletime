package io.spiralhouse.cycletime.domain.valueobjects

import io.spiralhouse.cycletime.domain.exceptions.DomainException
import kotlinx.serialization.Serializable
import java.util.UUID

/**
 * Value object representing a unique Session identifier.
 *
 * SessionKey is an immutable value object that encapsulates a UUID-formatted
 * session identifier. It provides strong typing and validation to ensure
 * only valid session keys are used throughout the domain.
 *
 * This value object follows Domain-Driven Design principles with:
 * - Immutability through value class
 * - Validation on construction
 * - Factory methods for controlled instantiation
 * - Serialization support for persistence
 */
@Serializable
@JvmInline
value class SessionKey(val value: String) {
    init {
        require(value.isNotBlank()) { "SessionKey cannot be empty" }
        require(isValidFormat(value)) { "Invalid SessionKey format: ${value.trim()}" }
    }

    /**
     * Returns the string representation of this SessionKey.
     *
     * @return The underlying UUID string value
     */
    override fun toString(): String = value

    companion object {
        /**
         * Regular expression pattern for validating UUID format.
         * Supports standard UUID format (8-4-4-4-12 hexadecimal digits)
         * and extended format (16-4-4-4-12 hexadecimal digits).
         */
        private val UUID_REGEX = Regex(
            "^([0-9a-fA-F]{8}|[0-9a-fA-F]{16})-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
        )

        /**
         * Generates a new random SessionKey.
         *
         * @return A new SessionKey with a randomly generated UUID
         */
        fun generate(): SessionKey = SessionKey(UUID.randomUUID().toString())

        /**
         * Creates a SessionKey from a string value.
         *
         * @param value The UUID string to create the SessionKey from
         * @return A new SessionKey instance
         * @throws DomainException if the value is not a valid UUID format
         */
        fun fromString(value: String): SessionKey = SessionKey(value)

        /**
         * Validates if a string is in proper UUID format.
         *
         * @param value The string to validate
         * @return true if the string is a valid UUID format, false otherwise
         */
        private fun isValidFormat(value: String): Boolean = UUID_REGEX.matches(value)
    }
}
