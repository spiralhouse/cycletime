package io.spiralhouse.cycletime.application.services

import kotlinx.datetime.Instant

/**
 * Result of a purge operation containing counts of purged entities.
 *
 * This data class captures the outcome of both scheduled and manual purge operations,
 * providing visibility into how many entities were permanently deleted.
 *
 * @property projects Number of projects permanently deleted
 * @property issues Number of issues permanently deleted
 * @property workflows Number of workflows permanently deleted (defaults to 0)
 * @property cutoffDate The cutoff timestamp used to determine which entities to purge
 */
data class PurgeResult(
    val projects: Int,
    val issues: Int,
    val workflows: Int = 0,
    val cutoffDate: Instant
) {
    /**
     * Total count of all purged entities across all types.
     */
    val totalPurged: Int get() = projects + issues + workflows
}
