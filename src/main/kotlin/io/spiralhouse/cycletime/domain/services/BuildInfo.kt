package io.spiralhouse.cycletime.domain.services

/**
 * Provides build information for the CycleTime application.
 *
 * Version is resolved in the following priority order:
 * 1. CYCLETIME_VERSION environment variable (set by CI/CD or runtime)
 * 2. cycletime.version system property (set by Gradle build)
 * 3. Default fallback version
 */
object BuildInfo {
    /**
     * Gets the current application version.
     *
     * The version is determined at runtime from:
     * - Environment variable CYCLETIME_VERSION (highest priority)
     * - System property cycletime.version (set by Gradle during build)
     * - Fallback to development version if neither is available
     */
    val version: String by lazy {
        System.getenv("CYCLETIME_VERSION")
            ?: System.getProperty("cycletime.version")
            ?: "0.1.0-SNAPSHOT-dev"
    }

    /**
     * Gets the service name.
     */
    val serviceName: String = "cycletime-kotlin"

    /**
     * Gets the service description.
     */
    val serviceDescription: String = "CycleTime Project Orchestration MCP Server (Kotlin)"
}
