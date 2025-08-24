package io.spiralhouse.cycletime.domain.services

/**
 * Provides build information for the JCVD application.
 *
 * Version is resolved in the following priority order:
 * 1. JCVD_VERSION environment variable (set by CI/CD or runtime)
 * 2. jcvd.version system property (set by Gradle build)
 * 3. Default fallback version
 */
object BuildInfo {
    /**
     * Gets the current application version.
     *
     * The version is determined at runtime from:
     * - Environment variable JCVD_VERSION (highest priority)
     * - System property jcvd.version (set by Gradle during build)
     * - Fallback to development version if neither is available
     */
    val version: String by lazy {
        System.getenv("JCVD_VERSION")
            ?: System.getProperty("jcvd.version")
            ?: "0.1.0-SNAPSHOT-dev"
    }

    /**
     * Gets the service name.
     */
    val serviceName: String = "jcvd-kotlin"

    /**
     * Gets the service description.
     */
    val serviceDescription: String = "JCVD Project Orchestration MCP Server (Kotlin)"
}
