package io.spiralhouse.cycletime.domain.entities

import io.spiralhouse.cycletime.domain.exceptions.DomainException
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.IssueStatus
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable

/**
 * Immutable snapshot of a Workflow entity's state.
 * Used for persistence and serialization without exposing internal mutability.
 */
@Serializable
data class WorkflowSnapshot(
    val id: WorkflowId,
    val name: String,
    val description: String?,
    val initialStatus: IssueStatus,
    val allowedStatuses: Set<IssueStatus>,
    val createdAt: Instant,
    val updatedAt: Instant,
    val deletedAt: Instant? = null
)

/**
 * Domain entity representing a Workflow with rich business logic.
 *
 * A Workflow manages state transitions for issues, defining which statuses
 * are allowed and which transitions are valid. It enforces business rules
 * around status transitions and provides predefined workflows for common
 * scenarios.
 *
 * This entity follows Domain-Driven Design principles with:
 * - Factory methods for controlled instantiation
 * - Encapsulated state with business rule enforcement
 * - Snapshot pattern for persistence
 * - State machine behavior for transition validation
 */
class Workflow private constructor(
    val id: WorkflowId,
    private var _name: String,
    private var _description: String?,
    val initialStatus: IssueStatus,
    private val _allowedStatuses: Set<IssueStatus>,
    val createdAt: Instant,
    private var _updatedAt: Instant,
    private val _deletedAt: Instant?,
    private val timeProvider: TimeProvider
) {
    val name: String get() = _name
    val description: String? get() = _description
    val allowedStatuses: Set<IssueStatus> get() = _allowedStatuses.toSet()
    val updatedAt: Instant get() = _updatedAt
    val deletedAt: Instant? get() = _deletedAt

    /**
     * Gets the terminal statuses (statuses with no outgoing transitions).
     * Cached for performance since allowed statuses are immutable.
     */
    val terminalStatuses: Set<IssueStatus> by lazy {
        _allowedStatuses.filter { status ->
            status.getValidTransitions().none { it in _allowedStatuses }
        }.toSet()
    }

    /**
     * Checks if a transition from one status to another is valid.
     *
     * @param from The current status
     * @param to The target status  
     * @return true if the transition is valid, false otherwise
     */
    fun canTransition(from: IssueStatus, to: IssueStatus): Boolean {
        // Both statuses must be allowed in this workflow
        if (from !in _allowedStatuses || to !in _allowedStatuses) {
            return false
        }

        // Don't allow transition to the same status
        if (from == to) {
            return false
        }

        // Check if the transition is valid according to the IssueStatus rules
        return to in from.getValidTransitions()
    }

    /**
     * Gets the valid transition statuses from the given status.
     *
     * @param from The current status
     * @return List of statuses that can be transitioned to
     */
    fun getValidTransitions(from: IssueStatus): List<IssueStatus> {
        if (from !in _allowedStatuses) {
            return emptyList()
        }

        return from.getValidTransitions().filter { it in _allowedStatuses }
    }

    /**
     * Validates a transition and throws an exception if invalid.
     *
     * @param from The current status
     * @param to The target status
     * @throws DomainException if the transition is invalid
     */
    fun validateTransition(from: IssueStatus, to: IssueStatus) {
        if (!canTransition(from, to)) {
            throw DomainException("Invalid transition from ${from.name} to ${to.name} in workflow '$_name'")
        }
    }

    /**
     * Checks if a status is terminal (no outgoing transitions).
     *
     * @param status The status to check
     * @return true if the status is terminal, false otherwise
     */
    fun isTerminalStatus(status: IssueStatus): Boolean {
        return status in terminalStatuses
    }

    /**
     * Updates the workflow name.
     *
     * @param newName The new name for the workflow
     * @throws DomainException if the name is invalid
     */
    fun updateName(newName: String) {
        validateName(newName)
        _name = newName
        updateTimestamp()
    }

    /**
     * Updates the workflow description.
     *
     * @param newDescription The new description (can be null)
     */
    fun updateDescription(newDescription: String?) {
        _description = newDescription
        updateTimestamp()
    }

    /**
     * Creates an immutable snapshot of the current workflow state.
     *
     * @return A WorkflowSnapshot containing the current state
     */
    fun toSnapshot(): WorkflowSnapshot {
        return WorkflowSnapshot(
            id = id,
            name = _name,
            description = _description,
            initialStatus = initialStatus,
            allowedStatuses = _allowedStatuses,
            createdAt = createdAt,
            updatedAt = _updatedAt,
            deletedAt = _deletedAt
        )
    }

    private fun updateTimestamp() {
        _updatedAt = timeProvider.now()
    }

    companion object {
        private const val MAX_NAME_LENGTH = 255
        private const val MIN_NAME_LENGTH = 1

        /**
         * Factory method to create a new Workflow.
         *
         * @param name The workflow name (must not be blank, max 255 chars)
         * @param description Optional workflow description
         * @param initialStatus The initial status for issues using this workflow
         * @param allowedStatuses Set of statuses allowed in this workflow
         * @param timeProvider Time provider for timestamps
         * @return A new Workflow instance
         * @throws IllegalArgumentException if timeProvider is null
         * @throws DomainException if validation fails
         */
        fun create(
            name: String,
            description: String?,
            initialStatus: IssueStatus,
            allowedStatuses: Set<IssueStatus>,
            timeProvider: TimeProvider?
        ): Workflow {
            requireNotNull(timeProvider) { "TimeProvider cannot be null" }
            validateName(name)
            validateAllowedStatuses(allowedStatuses, initialStatus)

            val now = timeProvider.now()
            return Workflow(
                id = WorkflowId.generate(),
                _name = name,
                _description = description,
                initialStatus = initialStatus,
                _allowedStatuses = allowedStatuses,
                createdAt = now,
                _updatedAt = now,
                _deletedAt = null,
                timeProvider = timeProvider
            )
        }

        /**
         * Reconstitutes a Workflow from a snapshot.
         *
         * @param snapshot The snapshot to reconstitute from
         * @param timeProvider Time provider for timestamps
         * @return A Workflow instance with the snapshot's state
         * @throws IllegalArgumentException if timeProvider is null
         */
        fun fromSnapshot(
            snapshot: WorkflowSnapshot,
            timeProvider: TimeProvider?
        ): Workflow {
            requireNotNull(timeProvider) { "TimeProvider cannot be null" }

            return Workflow(
                id = snapshot.id,
                _name = snapshot.name,
                _description = snapshot.description,
                initialStatus = snapshot.initialStatus,
                _allowedStatuses = snapshot.allowedStatuses,
                createdAt = snapshot.createdAt,
                _updatedAt = snapshot.updatedAt,
                _deletedAt = snapshot.deletedAt,
                timeProvider = timeProvider
            )
        }

        /**
         * Creates a default workflow suitable for most issue types.
         *
         * @param timeProvider Time provider for timestamps
         * @return A default workflow instance
         */
        fun createDefault(timeProvider: TimeProvider?): Workflow {
            return create(
                name = "Default Workflow",
                description = "Standard workflow for general issues with review step",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(
                    IssueStatus.TODO,
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.IN_REVIEW,
                    IssueStatus.DONE,
                    IssueStatus.CANCELED
                ),
                timeProvider = timeProvider
            )
        }

        /**
         * Creates a bug workflow optimized for bug tracking.
         *
         * @param timeProvider Time provider for timestamps
         * @return A bug workflow instance
         */
        fun createBugWorkflow(timeProvider: TimeProvider?): Workflow {
            return create(
                name = "Bug Workflow",
                description = "Optimized workflow for bug tracking and resolution",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(
                    IssueStatus.TODO,
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.DONE,
                    IssueStatus.CANCELED
                ),
                timeProvider = timeProvider
            )
        }

        /**
         * Creates a feature workflow with mandatory review step.
         *
         * @param timeProvider Time provider for timestamps
         * @return A feature workflow instance
         */
        fun createFeatureWorkflow(timeProvider: TimeProvider?): Workflow {
            return create(
                name = "Feature Workflow",
                description = "Workflow for feature development with mandatory review step",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(
                    IssueStatus.TODO,
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.IN_REVIEW,
                    IssueStatus.DONE,
                    IssueStatus.CANCELED
                ),
                timeProvider = timeProvider
            )
        }

        private fun validateName(name: String) {
            when {
                name.isBlank() -> {
                    throw DomainException("Workflow name cannot be empty")
                }
                name.length > MAX_NAME_LENGTH -> {
                    throw DomainException("Workflow name cannot exceed $MAX_NAME_LENGTH characters")
                }
            }
        }

        private fun validateAllowedStatuses(allowedStatuses: Set<IssueStatus>, initialStatus: IssueStatus) {
            when {
                allowedStatuses.isEmpty() -> {
                    throw DomainException("At least one status must be allowed")
                }
                initialStatus !in allowedStatuses -> {
                    throw DomainException("Initial status must be in allowed statuses")
                }
            }
        }
    }
}