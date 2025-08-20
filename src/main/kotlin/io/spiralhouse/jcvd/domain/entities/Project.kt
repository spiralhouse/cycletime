package io.spiralhouse.jcvd.domain.entities

import io.spiralhouse.jcvd.domain.exceptions.DomainException
import io.spiralhouse.jcvd.domain.valueobjects.*
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant

data class Project(
    val id: ProjectId,
    private var _name: String,
    private var _description: String? = null,
    private var _status: ProjectStatus = ProjectStatus.Active,
    private val _issues: MutableList<Issue> = mutableListOf(),
    val createdAt: Instant = Clock.System.now(),
    var updatedAt: Instant = Clock.System.now()
) {
    val name: String get() = _name
    val description: String? get() = _description
    val status: ProjectStatus get() = _status
    val issues: List<Issue> get() = _issues.toList()

    init {
        require(_name.isNotBlank()) { "Project name cannot be empty" }
        require(_name.length <= 255) { "Project name cannot exceed 255 characters" }
    }

    fun addIssue(
        title: String,
        description: String? = null,
        type: IssueType = IssueType.STORY,
        parentId: IssueId? = null
    ): Issue {
        if (_status == ProjectStatus.Archived) {
            throw DomainException("Cannot add issues to archived project")
        }

        val issue = Issue(
            id = IssueId.generate(),
            projectId = id,
            title = title,
            description = description,
            type = type,
            parentId = parentId
        )

        // Validate parent-child relationship
        if (parentId != null) {
            val parent = _issues.find { it.id == parentId }
                ?: throw DomainException("Parent issue not found: $parentId")

            if (!issue.type.canBeChildOf(parent.type)) {
                throw DomainException("${issue.type} cannot be a child of ${parent.type}")
            }
        }

        _issues.add(issue)
        updatedAt = Clock.System.now()
        return issue
    }

    fun archive() {
        val hasIncompleteIssues = _issues.any { !it.status.isCompleted }
        if (hasIncompleteIssues) {
            throw DomainException("Cannot archive project with incomplete issues")
        }
        _status = ProjectStatus.Archived
        updatedAt = Clock.System.now()
    }

    fun complete() {
        val hasIncompleteIssues = _issues.any { !it.status.isCompleted }
        if (hasIncompleteIssues) {
            throw DomainException("Cannot complete project with incomplete issues")
        }
        _status = ProjectStatus.Completed
        updatedAt = Clock.System.now()
    }

    fun getUnblockedIssues(): List<Issue> {
        return _issues.filter { issue ->
            issue.status !is IssueStatus.Done &&
            issue.status !is IssueStatus.Canceled &&
            !issue.hasBlockingDependencies()
        }
    }

    fun getActiveIssueCount(): Int {
        return _issues.count { !it.status.isCompleted }
    }

    fun updateName(newName: String) {
        require(newName.isNotBlank()) { "Project name cannot be empty" }
        require(newName.length <= 255) { "Project name cannot exceed 255 characters" }
        _name = newName
        updatedAt = Clock.System.now()
    }

    fun updateDescription(newDescription: String?) {
        _description = newDescription
        updatedAt = Clock.System.now()
    }
}
