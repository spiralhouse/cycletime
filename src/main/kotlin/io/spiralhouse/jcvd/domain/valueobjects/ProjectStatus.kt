package io.spiralhouse.jcvd.domain.valueobjects

import kotlinx.serialization.Serializable

/**
 * Enumeration of possible project statuses.
 * 
 * Defines the lifecycle states of a project with associated metadata
 * and transition rules. Each status has display properties and enforces
 * business rules about valid state transitions.
 */
@Serializable
enum class ProjectStatus(
    val value: String,
    val displayName: String,
    val description: String,
    val sortOrder: Int
) {
    ACTIVE(
        value = "active",
        displayName = "Active",
        description = "Project is active and accepting new work",
        sortOrder = 1
    ),
    COMPLETED(
        value = "completed",
        displayName = "Completed",
        description = "Project work has been completed successfully",
        sortOrder = 2
    ),
    ARCHIVED(
        value = "archived",
        displayName = "Archived",
        description = "Project has been archived and is read-only",
        sortOrder = 3
    );

    val isActive: Boolean get() = this == ACTIVE
    val isFinal: Boolean get() = this == ARCHIVED || this == COMPLETED
    val isTerminal: Boolean get() = this == ARCHIVED || this == COMPLETED
    val allowsModification: Boolean get() = this == ACTIVE
    val isWorkCompleted: Boolean get() = this == COMPLETED

    /**
     * Checks if this status can transition to the specified new status.
     * 
     * @param newStatus The target status
     * @return true if the transition is valid, false otherwise
     */
    fun canTransitionTo(newStatus: ProjectStatus): Boolean {
        return when (this) {
            ACTIVE -> true // Can transition to any status
            ARCHIVED -> newStatus == ARCHIVED // Can only stay archived
            COMPLETED -> newStatus == COMPLETED // Can only stay completed
        }
    }

    /**
     * Returns the list of valid status transitions from this status.
     * 
     * @return List of statuses this status can transition to
     */
    fun validTransitions(): List<ProjectStatus> {
        return when (this) {
            ACTIVE -> listOf(ACTIVE, ARCHIVED, COMPLETED)
            ARCHIVED -> listOf(ARCHIVED)
            COMPLETED -> listOf(COMPLETED)
        }
    }

    /**
     * Validates a transition to the specified status.
     * 
     * @param newStatus The target status
     * @throws IllegalStateException if the transition is not valid
     */
    fun validateTransitionTo(newStatus: ProjectStatus) {
        if (!canTransitionTo(newStatus)) {
            throw IllegalStateException("Invalid transition from ${this.value} to ${newStatus.value}")
        }
    }

    /**
     * Returns the string value of this status.
     * 
     * @return The status value (lowercase identifier)
     */
    override fun toString(): String = value

    companion object {
        /**
         * Creates a ProjectStatus from a string value.
         * 
         * @param value The status string (case-insensitive)
         * @return The corresponding ProjectStatus
         * @throws IllegalArgumentException if value is null or invalid
         */
        fun fromString(value: String?): ProjectStatus {
            require(value != null) { "Status cannot be null" }
            
            val trimmedValue = value.trim()
            require(trimmedValue.isNotBlank()) { "Unknown project status: $trimmedValue" }
            
            return values().find { it.value.equals(trimmedValue, ignoreCase = true) }
                ?: throw IllegalArgumentException(
                    "Unknown project status: $trimmedValue. valid values are: ${values().map { it.value }.sorted().joinToString(", ")}"
                )
        }
    }
}

// Convenience properties for tests
val ProjectStatus.Companion.Active: ProjectStatus get() = ProjectStatus.ACTIVE
val ProjectStatus.Companion.Archived: ProjectStatus get() = ProjectStatus.ARCHIVED  
val ProjectStatus.Companion.Completed: ProjectStatus get() = ProjectStatus.COMPLETED