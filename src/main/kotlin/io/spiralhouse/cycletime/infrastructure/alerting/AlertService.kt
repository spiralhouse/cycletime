package io.spiralhouse.cycletime.infrastructure.alerting

import io.spiralhouse.cycletime.infrastructure.health.ComponentHealth
import io.spiralhouse.cycletime.infrastructure.health.HealthStatus
import org.slf4j.Logger
import java.util.concurrent.ConcurrentHashMap

/**
 * Service for alerting on component health failures.
 *
 * Implements simple threshold-based alerting via structured logging:
 * - Tracks consecutive failures per component
 * - Logs WARN on first failure
 * - Logs ERROR on 3rd consecutive failure (threshold alert)
 * - Resets counter on successful check
 *
 * @property logger Logger for alert messages
 */
class AlertService(
    private val logger: Logger
) {
    companion object {
        private const val ALERT_THRESHOLD = 3
    }

    // Track consecutive failures per component
    private val failureCounters = ConcurrentHashMap<String, Int>()

    /**
     * Checks component health and triggers alerts based on failure patterns.
     *
     * Alert logic:
     * - First failure: Log WARN
     * - Third consecutive failure: Log ERROR (threshold alert)
     * - Success after failures: Log INFO (recovery)
     * - Ongoing success: No logging
     *
     * @param componentName Name of the component being checked
     * @param health Current health status of the component
     */
    fun checkAndAlert(componentName: String, health: ComponentHealth) {
        when (health.status) {
            HealthStatus.HEALTHY -> handleHealthy(componentName, health)
            HealthStatus.DEGRADED -> handleDegraded(componentName, health)
            HealthStatus.UNHEALTHY -> handleUnhealthy(componentName, health)
        }
    }

    /**
     * Handles healthy component status.
     * Resets failure counter and logs recovery if component was previously failing.
     */
    private fun handleHealthy(componentName: String, health: ComponentHealth) {
        val previousFailures = failureCounters.remove(componentName)
        if (previousFailures != null && previousFailures > 0) {
            logger.info(
                "Component recovered: {} - {} (previous failures: {})",
                componentName,
                health.message,
                previousFailures
            )
        }
    }

    /**
     * Handles degraded component status.
     * Tracks failures and logs warnings but uses lower severity than unhealthy.
     */
    private fun handleDegraded(componentName: String, health: ComponentHealth) {
        val consecutiveFailures = failureCounters.compute(componentName) { _, count ->
            (count ?: 0) + 1
        } ?: 1

        when {
            consecutiveFailures == 1 -> {
                logger.warn(
                    "Component degraded: {} - {} (details: {})",
                    componentName,
                    health.message,
                    health.details
                )
            }
            shouldAlert(componentName, consecutiveFailures) -> {
                logger.error(
                    "Component degraded (ALERT): {} - {} (consecutive failures: {}, details: {})",
                    componentName,
                    health.message,
                    consecutiveFailures,
                    health.details
                )
            }
        }
    }

    /**
     * Handles unhealthy component status.
     * Tracks failures and escalates to ERROR logging at threshold.
     */
    private fun handleUnhealthy(componentName: String, health: ComponentHealth) {
        val consecutiveFailures = failureCounters.compute(componentName) { _, count ->
            (count ?: 0) + 1
        } ?: 1

        when {
            consecutiveFailures == 1 -> {
                logger.warn(
                    "Component unhealthy: {} - {} (details: {})",
                    componentName,
                    health.message,
                    health.details
                )
            }
            shouldAlert(componentName, consecutiveFailures) -> {
                logger.error(
                    "Component unhealthy (ALERT): {} - {} (consecutive failures: {}, details: {})",
                    componentName,
                    health.message,
                    consecutiveFailures,
                    health.details
                )
            }
        }
    }

    /**
     * Determines if an alert should be triggered based on consecutive failures.
     *
     * @param componentName Name of the component (unused, for future extensions)
     * @param consecutiveFailures Number of consecutive failures
     * @return true if alert threshold is reached
     */
    private fun shouldAlert(componentName: String, consecutiveFailures: Int): Boolean {
        return consecutiveFailures >= ALERT_THRESHOLD
    }

    /**
     * Gets the current failure count for a component (for testing).
     *
     * @param componentName Name of the component
     * @return Number of consecutive failures, or 0 if none
     */
    internal fun getFailureCount(componentName: String): Int {
        return failureCounters[componentName] ?: 0
    }

    /**
     * Resets all failure counters (for testing).
     */
    internal fun reset() {
        failureCounters.clear()
    }
}
