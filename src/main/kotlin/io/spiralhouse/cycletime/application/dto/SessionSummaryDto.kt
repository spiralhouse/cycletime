package io.spiralhouse.cycletime.application.dto

import java.time.Duration
import java.time.Instant

/**
 * Data Transfer Object representing a session summary with aggregated metrics.
 *
 * This DTO provides summary information about a work session including
 * computed metrics like total duration, productivity indicators, and
 * aggregated statistics useful for reporting and analytics.
 *
 * @property sessionId The unique identifier of the session
 * @property totalDuration Total time spent in the session
 * @property productive Whether the session was considered productive
 * @property completedTasks Number of tasks completed during the session
 * @property summary Optional textual summary of work accomplished
 * @property startTime When the session started
 * @property endTime When the session ended (null if still active)
 */
data class SessionSummaryDto(
    val sessionId: String,
    val totalDuration: Duration,
    val productive: Boolean,
    val completedTasks: Int,
    val summary: String?,
    val startTime: Instant,
    val endTime: Instant?
)