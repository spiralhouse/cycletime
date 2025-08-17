package com.spiralhouse.jcvd.domain.entities

import com.spiralhouse.jcvd.domain.exceptions.DomainException
import com.spiralhouse.jcvd.domain.valueobjects.*
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant

data class Issue(
    val id: IssueId,
    val projectId: ProjectId,
    private var _title: String,
    private var _description: String? = null,
    val type: IssueType,
    val parentId: IssueId? = null,
    private var _status: IssueStatus = IssueStatus.Todo,
    private var _priority: Int = 0, // 0 = No priority, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low
    private var _estimate: Int? = null, // Story points
    private var _assigneeId: String? = null,
    private val _blockedBy: MutableSet<IssueId> = mutableSetOf(),
    private val _blocks: MutableSet<IssueId> = mutableSetOf(),
    private val _labels: MutableSet<String> = mutableSetOf(),
    val createdAt: Instant = Clock.System.now(),
    var updatedAt: Instant = Clock.System.now()
) {
    val title: String get() = _title
    val description: String? get() = _description
    val status: IssueStatus get() = _status
    val priority: Int get() = _priority
    val estimate: Int? get() = _estimate
    val assigneeId: String? get() = _assigneeId
    val blockedBy: Set<IssueId> get() = _blockedBy.toSet()
    val blocks: Set<IssueId> get() = _blocks.toSet()
    val labels: Set<String> get() = _labels.toSet()
    
    init {
        require(_title.isNotBlank()) { "Issue title cannot be empty" }
        require(_title.length <= 255) { "Issue title cannot exceed 255 characters" }
        require(_priority in 0..4) { "Priority must be between 0 and 4" }
        _estimate?.let { 
            require(it > 0) { "Estimate must be positive" }
            require(it <= 100) { "Estimate cannot exceed 100 points" }
        }
    }
    
    fun updateStatus(newStatus: IssueStatus) {
        if (!_status.canTransitionTo(newStatus)) {
            throw DomainException("Cannot transition from $_status to $newStatus")
        }
        _status = newStatus
        updatedAt = Clock.System.now()
    }
    
    fun updateTitle(newTitle: String) {
        require(newTitle.isNotBlank()) { "Issue title cannot be empty" }
        require(newTitle.length <= 255) { "Issue title cannot exceed 255 characters" }
        _title = newTitle
        updatedAt = Clock.System.now()
    }
    
    fun updateDescription(newDescription: String?) {
        _description = newDescription
        updatedAt = Clock.System.now()
    }
    
    fun updatePriority(newPriority: Int) {
        require(newPriority in 0..4) { "Priority must be between 0 and 4" }
        _priority = newPriority
        updatedAt = Clock.System.now()
    }
    
    fun updateEstimate(newEstimate: Int?) {
        newEstimate?.let {
            require(it > 0) { "Estimate must be positive" }
            require(it <= 100) { "Estimate cannot exceed 100 points" }
        }
        _estimate = newEstimate
        updatedAt = Clock.System.now()
    }
    
    fun assignTo(assigneeId: String?) {
        _assigneeId = assigneeId
        updatedAt = Clock.System.now()
    }
    
    fun addBlockedBy(blockerId: IssueId) {
        if (blockerId == id) {
            throw DomainException("Issue cannot block itself")
        }
        _blockedBy.add(blockerId)
        updatedAt = Clock.System.now()
    }
    
    fun removeBlockedBy(blockerId: IssueId) {
        _blockedBy.remove(blockerId)
        updatedAt = Clock.System.now()
    }
    
    fun addBlocks(blockedId: IssueId) {
        if (blockedId == id) {
            throw DomainException("Issue cannot block itself")
        }
        _blocks.add(blockedId)
        updatedAt = Clock.System.now()
    }
    
    fun removeBlocks(blockedId: IssueId) {
        _blocks.remove(blockedId)
        updatedAt = Clock.System.now()
    }
    
    fun addLabel(label: String) {
        require(label.isNotBlank()) { "Label cannot be empty" }
        _labels.add(label.trim())
        updatedAt = Clock.System.now()
    }
    
    fun removeLabel(label: String) {
        _labels.remove(label.trim())
        updatedAt = Clock.System.now()
    }
    
    fun hasBlockingDependencies(): Boolean = _blockedBy.isNotEmpty()
    
    fun isBlocking(): Boolean = _blocks.isNotEmpty()
    
    fun canBeEstimated(): Boolean {
        // Only stories without subtasks and all subtasks can be estimated
        return when (type) {
            IssueType.EPIC -> false
            IssueType.STORY -> true // Would need to check if has subtasks
            IssueType.SUBTASK -> true
        }
    }
}