package io.spiralhouse.cycletime.application.commands

import io.spiralhouse.cycletime.domain.valueobjects.*
import java.time.Instant

/**
 * Command for listing issues with optional filtering criteria.
 * 
 * RED PHASE: Minimal implementation for test compilation.
 */
data class ListIssuesCommand(
    val projectId: ProjectId? = null,
    val status: IssueStatus? = null,
    val priority: IssuePriority? = null,
    val assigneeId: String? = null,
    val type: IssueType? = null,
    val parentId: IssueId? = null,
    val dateFrom: Instant? = null,
    val dateTo: Instant? = null,
    val limit: Int? = null,
    val offset: Int? = null
)