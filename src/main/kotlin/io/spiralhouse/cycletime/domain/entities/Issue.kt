package io.spiralhouse.cycletime.domain.entities

import io.spiralhouse.cycletime.domain.exceptions.DomainException
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable

/**
 * Immutable snapshot of an Issue entity's state.
 * Used for persistence and serialization without exposing internal mutability.
 */
@Serializable
data class IssueSnapshot(
    val id: IssueId,
    val title: String,
    val description: String?,
    val type: IssueType,
    val status: IssueStatus,
    val parentId: IssueId?,
    val projectId: ProjectId?,
    val estimate: Estimate,
    val assigneeId: String?,
    val dependencies: List<IssueId>,
    val blockedBy: List<IssueId>,
    val createdAt: Instant,
    val updatedAt: Instant,
    val deletedAt: Instant? = null
)

/**
 * Domain entity representing an Issue with rich business logic.
 *
 * An Issue represents work items in the system with support for hierarchy,
 * status transitions, estimation, and dependency management.
 *
 * This entity follows Domain-Driven Design principles with:
 * - Factory methods for controlled instantiation
 * - Encapsulated state with business rule enforcement
 * - Snapshot pattern for persistence
 */
class Issue private constructor(
    val id: IssueId,
    private var _title: String,
    private var _description: String?,
    val type: IssueType,
    private var _status: IssueStatus,
    val parentId: IssueId?,
    val projectId: ProjectId?,
    private var _estimate: Estimate,
    private var _assigneeId: String?,
    private val _dependencies: MutableSet<IssueId>,
    private val _blockedBy: MutableSet<IssueId>,
    val createdAt: Instant,
    private var _updatedAt: Instant,
    private val _deletedAt: Instant?,
    private val timeProvider: TimeProvider
) {
    val title: String get() = _title
    val description: String? get() = _description
    val status: IssueStatus get() = _status
    val estimate: Estimate get() = _estimate
    val assigneeId: String? get() = _assigneeId
    val dependencies: List<IssueId> get() = _dependencies.toList()
    val blockedBy: List<IssueId> get() = _blockedBy.toList()
    val updatedAt: Instant get() = _updatedAt
    val deletedAt: Instant? get() = _deletedAt

    /**
     * Updates the issue status following valid transition rules.
     */
    fun updateStatus(newStatus: IssueStatus) {
        if (!_status.canTransitionTo(newStatus)) {
            throw DomainException("Cannot transition from ${_status.name} to ${newStatus.name}")
        }
        _status = newStatus
        updateTimestamp()
    }

    /**
     * Updates the issue title.
     */
    fun updateTitle(newTitle: String) {
        validateTitle(newTitle)
        _title = newTitle
        updateTimestamp()
    }

    /**
     * Updates the issue description.
     */
    fun updateDescription(newDescription: String?) {
        _description = newDescription
        updateTimestamp()
    }

    /**
     * Updates the issue assignee.
     */
    fun updateAssignee(newAssigneeId: String?) {
        _assigneeId = newAssigneeId
        updateTimestamp()
    }

    /**
     * Sets the estimate for this issue.
     */
    fun setEstimate(newEstimate: Estimate) {
        // Validate estimate is appropriate for issue type
        when (type) {
            IssueType.EPIC -> {
                if (newEstimate.hasValue()) {
                    throw DomainException("Epics cannot have estimates")
                }
            }
            IssueType.STORY -> {
                // Stories can have estimates when they have no subtasks
                // This would require checking for subtasks in a full implementation
            }
            IssueType.SUBTASK -> {
                if (!newEstimate.hasValue()) {
                    throw DomainException("Subtasks must have estimates")
                }
            }
        }

        _estimate = newEstimate
        updateTimestamp()
    }

    /**
     * Adds a dependency (this issue depends on the specified issue).
     */
    fun addDependency(dependencyId: IssueId) {
        if (dependencyId == id) {
            throw DomainException("Issue cannot depend on itself")
        }
        if (_dependencies.contains(dependencyId)) {
            throw DomainException("Dependency already exists")
        }
        _dependencies.add(dependencyId)
        updateTimestamp()
    }

    /**
     * Removes a dependency.
     */
    fun removeDependency(dependencyId: IssueId) {
        _dependencies.remove(dependencyId)
        updateTimestamp()
    }

    /**
     * Adds an issue that blocks this one.
     */
    fun addBlockedBy(blockerId: IssueId) {
        if (blockerId == id) {
            throw DomainException("Issue cannot be blocked by itself")
        }
        _blockedBy.add(blockerId)
        updateTimestamp()
    }

    /**
     * Removes a blocking issue.
     */
    fun removeBlockedBy(blockerId: IssueId) {
        _blockedBy.remove(blockerId)
        updateTimestamp()
    }

    /**
     * Checks if this issue has any dependencies.
     */
    fun hasDependencies(): Boolean = _dependencies.isNotEmpty()

    /**
     * Checks if this issue is blocked by other issues.
     */
    fun isBlocked(): Boolean = _blockedBy.isNotEmpty()

    /**
     * Checks if this issue can be estimated based on its type.
     */
    fun canBeEstimated(): Boolean = when (type) {
        IssueType.EPIC -> false
        IssueType.STORY -> true // In real implementation, would check for subtasks
        IssueType.SUBTASK -> true
    }

    /**
     * Validates hierarchy rules for this issue.
     */
    fun validateHierarchy(parentType: IssueType?) {
        if (!type.canHaveParent(parentType)) {
            val parentName = parentType?.name ?: "no parent"
            throw DomainException("${type.name} cannot have parent of type $parentName")
        }
    }

    /**
     * Creates an immutable snapshot of the current issue state.
     */
    fun toSnapshot(): IssueSnapshot {
        return IssueSnapshot(
            id = id,
            title = _title,
            description = _description,
            type = type,
            status = _status,
            parentId = parentId,
            projectId = projectId,
            estimate = _estimate,
            assigneeId = _assigneeId,
            dependencies = _dependencies.toList(),
            blockedBy = _blockedBy.toList(),
            createdAt = createdAt,
            updatedAt = _updatedAt,
            deletedAt = _deletedAt
        )
    }

    private fun updateTimestamp() {
        _updatedAt = timeProvider.now()
    }

    companion object {
        private const val MAX_TITLE_LENGTH = 255

        /**
         * Factory method to create a new Issue.
         */
        fun create(
            title: String,
            description: String?,
            type: IssueType,
            parentId: IssueId? = null,
            projectId: ProjectId? = null,
            timeProvider: TimeProvider?
        ): Issue {
            requireNotNull(timeProvider) { "TimeProvider cannot be null" }
            validateTitle(title)

            // Validate hierarchy - deferred full validation to application layer
            // The domain entity performs basic validation only. Full hierarchy validation
            // (e.g., verifying parent types) requires repository access and should be
            // implemented in the application service layer where cross-aggregate
            // validation can be performed.
            //
            // Current validation:
            // - Epics cannot have parents (enforced here)
            // - Subtasks should have parents (recommendation, not enforced)
            // - Stories can optionally have Epic parents (not enforced here)
            if (parentId != null && type == IssueType.EPIC) {
                throw DomainException("Epics cannot have parents")
            }

            val now = timeProvider.now()
            return Issue(
                id = IssueId.generate(),
                _title = title,
                _description = description,
                type = type,
                _status = IssueStatus.BACKLOG,
                parentId = parentId,
                projectId = projectId,
                _estimate = Estimate.none(),
                _assigneeId = null,
                _dependencies = mutableSetOf(),
                _blockedBy = mutableSetOf(),
                createdAt = now,
                _updatedAt = now,
                _deletedAt = null,
                timeProvider = timeProvider
            )
        }

        /**
         * Reconstitutes an Issue from a snapshot.
         */
        fun fromSnapshot(
            snapshot: IssueSnapshot,
            timeProvider: TimeProvider?
        ): Issue {
            requireNotNull(timeProvider) { "TimeProvider cannot be null" }

            return Issue(
                id = snapshot.id,
                _title = snapshot.title,
                _description = snapshot.description,
                type = snapshot.type,
                _status = snapshot.status,
                parentId = snapshot.parentId,
                projectId = snapshot.projectId,
                _estimate = snapshot.estimate,
                _assigneeId = snapshot.assigneeId,
                _dependencies = snapshot.dependencies.toMutableSet(),
                _blockedBy = snapshot.blockedBy.toMutableSet(),
                createdAt = snapshot.createdAt,
                _updatedAt = snapshot.updatedAt,
                _deletedAt = snapshot.deletedAt,
                timeProvider = timeProvider
            )
        }

        private fun validateTitle(title: String) {
            when {
                title.isBlank() -> {
                    throw DomainException("Issue title cannot be empty")
                }
                title.length > MAX_TITLE_LENGTH -> {
                    throw DomainException("Issue title cannot exceed $MAX_TITLE_LENGTH characters")
                }
            }
        }
    }
}
