package io.spiralhouse.cycletime.domain.valueobjects

import kotlinx.serialization.Serializable
import java.util.UUID

/**
 * Value object representing a unique identifier for a Workflow.
 *
 * Provides type safety and domain-specific operations for workflow identifiers.
 * Uses UUID for guaranteed uniqueness across different systems and contexts.
 */
@Serializable
@JvmInline
value class WorkflowId(val value: String) {

    init {
        require(value.isNotBlank()) { "WorkflowId cannot be blank" }
        require(isValidUUID(value)) { "WorkflowId must be a valid UUID format" }
    }

    /**
     * Returns the string representation of this WorkflowId.
     */
    override fun toString(): String = value

    private fun isValidUUID(uuidString: String): Boolean {
        return try {
            UUID.fromString(uuidString)
            true
        } catch (e: IllegalArgumentException) {
            false
        }
    }

    companion object {
        /**
         * Generates a new unique WorkflowId.
         *
         * @return A new WorkflowId with a unique UUID value
         */
        fun generate(): WorkflowId = WorkflowId(UUID.randomUUID().toString())

        /**
         * Creates a WorkflowId from a string value.
         *
         * @param value The UUID string value
         * @return A WorkflowId instance
         * @throws IllegalArgumentException if value is invalid
         */
        fun fromString(value: String): WorkflowId = WorkflowId(value)
    }
}