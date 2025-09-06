package io.spiralhouse.cycletime.application.commands

import io.spiralhouse.cycletime.domain.valueobjects.*

/**
 * Command for transitioning an issue to a new status.
 * 
 * RED PHASE: Minimal implementation for test compilation.
 */
data class TransitionIssueCommand(
    val id: IssueId,
    val newStatus: IssueStatus,
    val comment: String? = null
)