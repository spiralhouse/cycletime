package io.spiralhouse.cycletime.application.config

import kotlin.time.Duration.Companion.days

/**
 * Configuration for the data retention service.
 *
 * This configuration determines how long soft-deleted entities are retained before
 * permanent deletion, whether automatic purging is enabled, and when scheduled purges run.
 *
 * ⚠️ **Configuration Changes**: Loaded at application startup. Changes to environment
 * variables (RETENTION_PERIOD, RETENTION_ENABLE_AUTO_PURGE, RETENTION_PURGE_SCHEDULE_CRON)
 * or application.conf require application restart to take effect.
 *
 * @property retentionPeriod ISO-8601 duration string (e.g., "P30D" for 30 days)
 * @property enableAutoPurge Whether automatic scheduled purging is enabled
 * @property purgeScheduleCron Cron expression for scheduled purge execution (defaults to 2 AM daily)
 * @throws IllegalArgumentException if retentionPeriod is less than 1 day or invalid format
 * @throws IllegalArgumentException if enableAutoPurge is true but purgeScheduleCron is blank
 */
data class RetentionConfig(
    val retentionPeriod: String = "P30D",
    val enableAutoPurge: Boolean = true,
    val purgeScheduleCron: String = "0 0 2 * * ?"
) {
    init {
        // Validate ISO-8601 duration format and enforce minimum 1 day
        val duration = kotlin.time.Duration.parse(retentionPeriod)
        require(duration >= 1.days) {
            "Retention period must be at least 1 day to prevent accidental data loss. Got: $retentionPeriod (${duration.inWholeDays} days)"
        }

        // Validate cron expression is not blank when auto-purge enabled
        if (enableAutoPurge) {
            require(purgeScheduleCron.isNotBlank()) {
                "purgeScheduleCron cannot be blank when enableAutoPurge is true"
            }
        }
    }
}
