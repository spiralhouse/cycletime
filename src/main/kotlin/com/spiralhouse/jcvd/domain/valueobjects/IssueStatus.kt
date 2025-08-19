package com.spiralhouse.jcvd.domain.valueobjects

import kotlinx.serialization.Serializable

@Serializable
sealed class IssueStatus(val value: String, val isCompleted: Boolean = false) {
    @Serializable
    data object Backlog : IssueStatus("backlog")
    
    @Serializable
    data object Todo : IssueStatus("todo")
    
    @Serializable
    data object InProgress : IssueStatus("in_progress")
    
    @Serializable
    data object InReview : IssueStatus("in_review")
    
    @Serializable
    data object Done : IssueStatus("done", isCompleted = true)
    
    @Serializable
    data object Canceled : IssueStatus("canceled", isCompleted = true)
    
    fun canTransitionTo(newStatus: IssueStatus): Boolean {
        return when (this) {
            is Backlog -> newStatus in listOf(Todo, Canceled)
            is Todo -> newStatus in listOf(InProgress, Backlog, Canceled)
            is InProgress -> newStatus in listOf(InReview, Todo, Canceled)
            is InReview -> newStatus in listOf(Done, InProgress, Canceled)
            is Done -> false // Cannot transition from Done
            is Canceled -> false // Cannot transition from Canceled
        }
    }
    
    companion object {
        fun fromString(status: String): IssueStatus = when (status.lowercase()) {
            "backlog" -> Backlog
            "todo" -> Todo
            "in_progress", "inprogress" -> InProgress
            "in_review", "inreview" -> InReview
            "done" -> Done
            "canceled", "cancelled" -> Canceled
            else -> throw IllegalArgumentException("Unknown issue status: $status")
        }
        
        fun values(): List<IssueStatus> = listOf(Backlog, Todo, InProgress, InReview, Done, Canceled)
    }
    
    override fun toString(): String = value
}