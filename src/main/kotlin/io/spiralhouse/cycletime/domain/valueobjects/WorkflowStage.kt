package io.spiralhouse.cycletime.domain.valueobjects

import kotlinx.serialization.Serializable

/**
 * Value object representing a stage in a workflow process.
 *
 * Enforces validation rules for stage names and provides factory methods
 * for creating standard workflow stages.
 *
 * This is an immutable value object with value semantics.
 */
@Serializable
data class WorkflowStage constructor(private val _name: String?) {
    val name: String = _name?.trim() ?: throw IllegalArgumentException("WorkflowStage name cannot be null")

    init {
        require(name.isNotBlank()) { "WorkflowStage name cannot be empty" }
        require(name.length <= 100) { "WorkflowStage name is too long (max 100 characters)" }
        validateStageName(name)
    }

    private fun validateStageName(name: String) {
        // Check for invalid characters
        val invalidChars = listOf('\n', '\t', '<', '>', '|', '/')
        
        invalidChars.forEach { char ->
            require(char !in name) { "Invalid stage name: contains invalid character '$char'" }
        }
    }

    /**
     * Checks if this is a terminal workflow stage.
     */
    fun isTerminal(): Boolean = name.equals("Done", ignoreCase = true)

    /**
     * Checks if this is an initial workflow stage.
     */
    fun isInitial(): Boolean = name.equals("Planning", ignoreCase = true)

    /**
     * Returns the order of this stage in the standard workflow.
     * Returns -1 for non-standard stages.
     */
    fun getOrder(): Int = when (name) {
        "Planning" -> 1
        "Development" -> 2
        "Testing" -> 3
        "Review" -> 4
        "Deployment" -> 5
        "Done" -> 6
        else -> -1
    }

    companion object {
        /**
         * Creates a WorkflowStage from a string value.
         *
         * @param value The stage name to create from
         * @return A WorkflowStage instance
         * @throws IllegalArgumentException if value is null or invalid
         */
        fun fromString(value: String?): WorkflowStage {
            require(value != null) { "WorkflowStage name cannot be null" }
            return WorkflowStage(value)
        }

        /**
         * Standard workflow stage factory methods.
         */
        fun planning(): WorkflowStage = WorkflowStage("Planning")
        fun development(): WorkflowStage = WorkflowStage("Development")
        fun testing(): WorkflowStage = WorkflowStage("Testing")
        fun review(): WorkflowStage = WorkflowStage("Review")
        fun deployment(): WorkflowStage = WorkflowStage("Deployment")
        fun done(): WorkflowStage = WorkflowStage("Done")

        /**
         * Returns a list of standard workflow stages in order.
         */
        fun getStandardStages(): List<WorkflowStage> = listOf(
            planning(),
            development(),
            testing(),
            review(),
            deployment(),
            done()
        )
    }

    /**
     * Returns the string representation of this WorkflowStage.
     *
     * @return The stage name as a string
     */
    override fun toString(): String = name
}