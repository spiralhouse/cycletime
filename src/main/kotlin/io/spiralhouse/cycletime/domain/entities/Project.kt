package io.spiralhouse.cycletime.domain.entities

import io.spiralhouse.cycletime.domain.exceptions.DomainException
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectStatus
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable

/**
 * Immutable snapshot of a Project entity's state.
 * Used for persistence and serialization without exposing internal mutability.
 */
@Serializable
data class ProjectSnapshot(
    val id: ProjectId,
    val name: String,
    val description: String?,
    val status: ProjectStatus,
    val issues: List<IssueId>,
    val createdAt: Instant,
    val updatedAt: Instant
)

/**
 * Domain entity representing a Project with rich business logic.
 *
 * A Project manages a collection of issues and enforces business rules
 * around status transitions, naming constraints, and issue management.
 *
 * This entity follows Domain-Driven Design principles with:
 * - Factory methods for controlled instantiation
 * - Encapsulated state with business rule enforcement
 * - Snapshot pattern for persistence
 */
class Project private constructor(
    val id: ProjectId,
    private var _name: String,
    private var _description: String?,
    private var _status: ProjectStatus,
    private val _issues: MutableSet<IssueId>,
    val createdAt: Instant,
    private var _updatedAt: Instant,
    private val timeProvider: TimeProvider
) {
    val name: String get() = _name
    val description: String? get() = _description
    val status: ProjectStatus get() = _status
    val issues: List<IssueId> get() = _issues.toList()
    val issueCount: Int get() = _issues.size
    val updatedAt: Instant get() = _updatedAt

    /**
     * Adds an issue to this project.
     *
     * @param issueId The ID of the issue to add
     * @throws DomainException if the project is archived/completed or if the issue already exists
     */
    fun addIssue(issueId: IssueId) {
        if (_status == ProjectStatus.ARCHIVED) {
            throw DomainException("Cannot add issues to archived project")
        }
        if (_status == ProjectStatus.COMPLETED) {
            throw DomainException("Cannot add issues to completed project")
        }
        if (_issues.contains(issueId)) {
            throw DomainException("Issue already exists in project")
        }
        _issues.add(issueId)
        updateTimestamp()
    }

    /**
     * Removes an issue from this project.
     *
     * @param issueId The ID of the issue to remove
     */
    fun removeIssue(issueId: IssueId) {
        _issues.remove(issueId)
        updateTimestamp()
    }

    /**
     * Updates the project name.
     *
     * @param newName The new name for the project
     * @throws DomainException if the name is invalid
     */
    fun updateName(newName: String) {
        validateName(newName)
        _name = newName
        updateTimestamp()
    }

    /**
     * Updates the project description.
     *
     * @param newDescription The new description (can be null)
     */
    fun updateDescription(newDescription: String?) {
        _description = newDescription
        updateTimestamp()
    }

    /**
     * Archives the project, making it read-only.
     */
    fun archive() {
        _status = ProjectStatus.ARCHIVED
        updateTimestamp()
    }

    /**
     * Marks the project as completed.
     */
    fun complete() {
        _status = ProjectStatus.COMPLETED
        updateTimestamp()
    }

    /**
     * Reactivates the project, allowing modifications again.
     */
    fun reactivate() {
        _status = ProjectStatus.ACTIVE
        updateTimestamp()
    }

    /**
     * Creates an immutable snapshot of the current project state.
     *
     * @return A ProjectSnapshot containing the current state
     */
    fun toSnapshot(): ProjectSnapshot {
        return ProjectSnapshot(
            id = id,
            name = _name,
            description = _description,
            status = _status,
            issues = _issues.toList(),
            createdAt = createdAt,
            updatedAt = _updatedAt
        )
    }

    private fun updateTimestamp() {
        _updatedAt = timeProvider.now()
    }

    companion object {
        private const val MAX_NAME_LENGTH = 255
        private const val MIN_NAME_LENGTH = 1

        /**
         * Factory method to create a new Project.
         *
         * @param name The project name (must not be blank, max 255 chars)
         * @param description Optional project description
         * @param timeProvider Time provider for timestamps
         * @return A new Project instance
         * @throws IllegalArgumentException if timeProvider is null
         * @throws DomainException if name validation fails
         */
        fun create(
            name: String,
            description: String?,
            timeProvider: TimeProvider?
        ): Project {
            requireNotNull(timeProvider) { "TimeProvider cannot be null" }
            validateName(name)

            val now = timeProvider.now()
            return Project(
                id = ProjectId.generate(),
                _name = name,
                _description = description,
                _status = ProjectStatus.ACTIVE,
                _issues = mutableSetOf(),
                createdAt = now,
                _updatedAt = now,
                timeProvider = timeProvider
            )
        }

        /**
         * Reconstitutes a Project from a snapshot.
         *
         * @param snapshot The snapshot to reconstitute from
         * @param timeProvider Time provider for timestamps
         * @return A Project instance with the snapshot's state
         * @throws IllegalArgumentException if timeProvider is null
         */
        fun fromSnapshot(
            snapshot: ProjectSnapshot,
            timeProvider: TimeProvider?
        ): Project {
            requireNotNull(timeProvider) { "TimeProvider cannot be null" }

            return Project(
                id = snapshot.id,
                _name = snapshot.name,
                _description = snapshot.description,
                _status = snapshot.status,
                _issues = snapshot.issues.toMutableSet(),
                createdAt = snapshot.createdAt,
                _updatedAt = snapshot.updatedAt,
                timeProvider = timeProvider
            )
        }

        private fun validateName(name: String) {
            when {
                name.isBlank() -> {
                    throw DomainException("Project name cannot be empty")
                }
                name.length > MAX_NAME_LENGTH -> {
                    throw DomainException("Project name cannot exceed $MAX_NAME_LENGTH characters")
                }
            }
        }
    }
}
