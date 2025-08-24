package io.spiralhouse.cycletime.domain.valueobjects

import kotlinx.serialization.Serializable

/**
 * Enumeration of issue statuses with transition validation.
 *
 * Defines the workflow states for issues with business rules for
 * valid state transitions and status categories.
 */
@Serializable
enum class IssueStatus(
    private val _displayName: String,
    private val _description: String,
    private val _color: String,
    private val _priority: Int
) {
    TODO(
        _displayName = "To Do",
        _description = "Work has not started on this issue",
        _color = "#6B7280",
        _priority = 1
    ),
    IN_PROGRESS(
        _displayName = "In Progress",
        _description = "Work is currently being worked on",
        _color = "#3B82F6",
        _priority = 2
    ),
    IN_REVIEW(
        _displayName = "In Review",
        _description = "Work is complete and under review",
        _color = "#F59E0B",
        _priority = 3
    ),
    DONE(
        _displayName = "Done",
        _description = "Work has been completed successfully",
        _color = "#10B981",
        _priority = 4
    ),
    CANCELED(
        _displayName = "Canceled",
        _description = "Work has been canceled and will not be completed",
        _color = "#EF4444",
        _priority = 0
    );

    /**
     * Returns the valid transitions from this status.
     */
    fun getValidTransitions(): List<IssueStatus> = when (this) {
        TODO -> listOf(IN_PROGRESS, CANCELED)
        IN_PROGRESS -> listOf(IN_REVIEW, TODO, CANCELED)
        IN_REVIEW -> listOf(DONE, IN_PROGRESS, CANCELED)
        DONE -> emptyList()
        CANCELED -> listOf(TODO)
    }

    /**
     * Checks if this status can transition to the specified new status.
     */
    fun canTransitionTo(newStatus: IssueStatus): Boolean {
        return getValidTransitions().contains(newStatus)
    }

    /**
     * Returns the next possible statuses from this status.
     */
    fun getNextStatuses(): List<IssueStatus> = getValidTransitions()

    /**
     * Returns the statuses that can transition to this status.
     */
    fun getPreviousStatuses(): List<IssueStatus> = values().filter { it.canTransitionTo(this) }

    /**
     * Calculates the transition path from this status to the target status.
     */
    fun getTransitionPath(target: IssueStatus): List<IssueStatus> {
        if (this == target) return listOf(this)
        if (canTransitionTo(target)) return listOf(this, target)

        // Simple BFS to find shortest path
        val queue = mutableListOf(listOf(this))
        val visited = mutableSetOf(this)

        while (queue.isNotEmpty()) {
            val path = queue.removeAt(0)
            val current = path.last()

            for (next in current.getValidTransitions()) {
                if (next == target) {
                    return path + next
                }
                if (next !in visited) {
                    visited.add(next)
                    queue.add(path + next)
                }
            }
        }

        return emptyList() // No path found
    }

    /**
     * Checks if there's a valid transition path to the target status.
     */
    fun hasPathTo(target: IssueStatus): Boolean = getTransitionPath(target).isNotEmpty()

    /**
     * Checks if this status represents active work.
     */
    fun isActive(): Boolean = this in listOf(TODO, IN_PROGRESS, IN_REVIEW)

    /**
     * Checks if this status represents completed work.
     */
    fun isCompleted(): Boolean = this == DONE

    /**
     * Checks if this status is terminal (no more transitions allowed).
     */
    fun isTerminal(): Boolean = this == DONE

    /**
     * Checks if work is in progress.
     */
    fun isInProgress(): Boolean = this in listOf(IN_PROGRESS, IN_REVIEW)

    /**
     * Checks if this status represents blocked work.
     */
    fun isBlocked(): Boolean = this == CANCELED

    /**
     * Returns the display name of this status.
     */
    fun getDisplayName(): String = _displayName

    /**
     * Returns the description of this status.
     */
    fun getDescription(): String = _description

    /**
     * Returns the color code for this status.
     */
    fun getColor(): String = _color

    /**
     * Returns the priority of this status.
     */
    fun getPriority(): Int = _priority

    companion object {
        /**
         * Creates an IssueStatus from a string value.
         */
        fun fromString(value: String?): IssueStatus {
            require(value != null) { "IssueStatus cannot be null" }

            val trimmedValue = value.trim()
            require(trimmedValue.isNotBlank()) { "Invalid IssueStatus: $trimmedValue" }

            // Handle exact enum names first
            values().find { it.name.equals(trimmedValue, ignoreCase = true) }?.let { return it }

            // Handle alternative formats
            return when (trimmedValue.lowercase().replace(" ", "").replace("-", "")) {
                "todo", "backlog" -> TODO
                "inprogress", "working" -> IN_PROGRESS
                "inreview", "review" -> IN_REVIEW
                "done", "complete", "finished", "closed" -> DONE
                "canceled", "cancelled", "rejected" -> CANCELED
                else -> throw IllegalArgumentException("Invalid IssueStatus: $trimmedValue")
            }
        }
    }
}
