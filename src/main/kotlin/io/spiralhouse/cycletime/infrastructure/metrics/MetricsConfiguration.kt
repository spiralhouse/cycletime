package io.spiralhouse.cycletime.infrastructure.metrics

import io.ktor.server.application.*
import io.ktor.server.metrics.micrometer.*
import io.micrometer.core.instrument.binder.jvm.JvmGcMetrics
import io.micrometer.core.instrument.binder.jvm.JvmMemoryMetrics
import io.micrometer.core.instrument.binder.jvm.JvmThreadMetrics
import io.micrometer.core.instrument.binder.system.ProcessorMetrics
import io.micrometer.prometheusmetrics.PrometheusMeterRegistry
import io.micrometer.prometheusmetrics.PrometheusConfig

/**
 * Metrics configuration for CycleTime application using Micrometer and Prometheus.
 *
 * This object provides centralized configuration for application metrics including:
 * - Prometheus registry for metric exposition
 * - JVM memory, GC, and thread metrics
 * - CPU/processor metrics
 * - Custom application metrics
 *
 * Metrics can be disabled via the METRICS_ENABLED environment variable.
 *
 * @see MCPMetrics Custom MCP-specific metrics
 * @see DatabaseMetrics Custom database-specific metrics
 */
object MetricsConfiguration {
    /**
     * Prometheus meter registry instance.
     * Singleton registry used by all metrics in the application.
     */
    val registry: PrometheusMeterRegistry = PrometheusMeterRegistry(PrometheusConfig.DEFAULT)

    /**
     * Configure Micrometer metrics for the Ktor application.
     *
     * Installs the MicrometerMetrics plugin with:
     * - JVM memory metrics (heap, non-heap, buffer pools)
     * - JVM GC metrics (pause times, collection counts)
     * - Processor/CPU metrics (system load, process CPU)
     * - Thread metrics (live threads, daemon threads, peak threads)
     *
     * All metrics are prefixed with "cycletime_" and use snake_case naming.
     *
     * @receiver Application The Ktor application instance
     */
    fun Application.configureMetrics() {
        val metricsEnabled = System.getenv("METRICS_ENABLED")?.toBoolean() ?: true
        if (!metricsEnabled) {
            environment.log.info("Metrics collection disabled by METRICS_ENABLED environment variable")
            return
        }

        install(MicrometerMetrics) {
            registry = MetricsConfiguration.registry

            // JVM metrics
            meterBinders = listOf(
                JvmMemoryMetrics(),
                JvmGcMetrics(),
                ProcessorMetrics(),
                JvmThreadMetrics()
            )
        }

        environment.log.info("Micrometer metrics configured with Prometheus registry")
    }
}
