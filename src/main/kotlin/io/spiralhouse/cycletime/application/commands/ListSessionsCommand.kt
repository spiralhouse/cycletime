package io.spiralhouse.cycletime.application.commands

import io.spiralhouse.cycletime.domain.valueobjects.*
import java.time.Instant

/**
 * Command for listing sessions with optional filtering criteria.
 * 
 * RED PHASE: Minimal implementation for test compilation.
 */
data class ListSessionsCommand(
    val activeOnly: Boolean? = null,
    val projectId: ProjectId? = null,
    val issueId: IssueId? = null,
    val dateFrom: Instant? = null,
    val dateTo: Instant? = null,
    val limit: Int? = null,
    val offset: Int? = null
)