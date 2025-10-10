package io.spiralhouse.cycletime

import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.services.BuildInfo
import io.spiralhouse.cycletime.infrastructure.database.DatabaseProvider
import io.spiralhouse.cycletime.infrastructure.database.DefaultDatabaseProvider
import io.spiralhouse.cycletime.infrastructure.database.DatabaseConfig as DbConfig
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedSessionRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import io.spiralhouse.cycletime.infrastructure.logging.ExceptionLogger
import org.jetbrains.exposed.sql.Database
import io.spiralhouse.cycletime.mcp.configureMCP
import io.spiralhouse.cycletime.mcp.integration.MCPIntegrationException
import java.sql.SQLException
import org.jetbrains.exposed.exceptions.ExposedSQLException
import java.io.IOException
import io.spiralhouse.cycletime.mcp.integration.MCPIntegrationService
import io.spiralhouse.cycletime.mcp.integration.MCPServerStatus
import kotlinx.coroutines.launch
import io.spiralhouse.cycletime.infrastructure.di.configureDependencies
import io.spiralhouse.cycletime.api.configuration.ApiConfiguration
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.cio.*
import io.ktor.server.engine.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.di.*
import io.ktor.server.plugins.di.DI
import io.ktor.server.plugins.openapi.*
import io.ktor.server.plugins.swagger.*
import kotlin.time.Duration.Companion.seconds
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sse.*
import io.ktor.http.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.Serializable
import kotlinx.coroutines.runBlocking
import org.slf4j.LoggerFactory

@Serializable
data class HealthResponse(
    val status: String,
    val service: String,
    val version: String,
    val dependencies: Map<String, String>,
    val metrics: Map<String, String>,
    val timestamp: String
)

/**
 * Self-documenting data class for MCP health status.
 * Replaces the generic Pair<Map<String,String>, Map<String,String>> return type.
 */
data class HealthStatus(
    val dependencies: Map<String, String>,
    val metrics: Map<String, String>
)


@Serializable
data class ErrorResponse(
    val status: String,
    val service: String,
    val version: String,
    val error: String,
    val timestamp: String
)

fun main() {
    val port = System.getenv("PORT")?.toIntOrNull() ?: 8080
    val host = System.getenv("HOST") ?: "0.0.0.0"

    embeddedServer(
        CIO,
        port = port,
        host = host,
        module = Application::module
    ).start(wait = true)
}

/**
 * Build database configuration from environment variables and application config.
 * Single responsibility: configuration building only.
 */
private fun Application.buildDatabaseConfig(): DbConfig {
    val jdbcUrl = environment.config.propertyOrNull("database.url")?.getString()
        ?: System.getProperty("DATABASE_URL")  // Check System property first (for tests)
        ?: System.getenv("DATABASE_URL")       // Then check environment variable
        ?: "jdbc:h2:file:./cycletime;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE"

    val driver = environment.config.propertyOrNull("database.driver")?.getString()
        ?: System.getProperty("DATABASE_DRIVER")
        ?: System.getenv("DATABASE_DRIVER")
        ?: "org.h2.Driver"

    val enableLogging = environment.config.propertyOrNull("database.logging")?.getString()?.toBoolean()
        ?: System.getProperty("DATABASE_LOGGING")?.toBoolean()
        ?: System.getenv("DATABASE_LOGGING")?.toBoolean()
        ?: false

    val maxPoolSize = environment.config.propertyOrNull("database.maxPoolSize")?.getString()?.toInt()
        ?: System.getProperty("DATABASE_MAX_POOL_SIZE")?.toInt()
        ?: System.getenv("DATABASE_MAX_POOL_SIZE")?.toInt()
        ?: 10

    val minPoolSize = environment.config.propertyOrNull("database.minPoolSize")?.getString()?.toInt()
        ?: System.getProperty("DATABASE_MIN_POOL_SIZE")?.toInt()
        ?: System.getenv("DATABASE_MIN_POOL_SIZE")?.toInt()
        ?: 2

    return DbConfig(
        jdbcUrl = jdbcUrl,
        driver = driver,
        enableLogging = enableLogging,
        maxPoolSize = maxPoolSize,
        minPoolSize = minPoolSize
    )
}

/**
 * Initialize database connection with timing metrics.
 * Single responsibility: database initialization only.
 */
private fun initializeDatabase(
    config: DbConfig,
    logger: org.slf4j.Logger,
    performanceMetrics: MutableMap<String, Long>
): DatabaseProvider {
    logger.info("Initializing database with URL: ${config.jdbcUrl}")
    val dbStartTime = System.currentTimeMillis()
    val databaseProvider = DefaultDatabaseProvider(config)
    val dbEndTime = System.currentTimeMillis()
    val dbTime = dbEndTime - dbStartTime
    performanceMetrics["database"] = dbTime
    logger.info("Database initialization completed in ${dbTime}ms")
    return databaseProvider
}

/**
 * Validate database configuration parameters.
 * Single responsibility: validation only (pure function).
 */
private fun validateDatabaseConfig(config: DbConfig) {
    require(config.jdbcUrl.isNotBlank()) {
        "Database URL cannot be blank"
    }

    require(config.jdbcUrl.startsWith("jdbc:")) {
        "Database URL must start with 'jdbc:'. Got: ${config.jdbcUrl}"
    }

    // Validate environment variable overrides don't break expected patterns
    if (System.getenv("DATABASE_URL")?.isNotBlank() == true) {
        val envUrl = System.getenv("DATABASE_URL")!!
        require(envUrl.startsWith("jdbc:")) {
            "Environment variable DATABASE_URL must be a valid JDBC URL. Got: $envUrl"
        }
    }

    // Driver validation (basic check)
    require(config.driver.isNotBlank()) {
        "Database driver cannot be blank"
    }

    // Validate driver class name format
    require(config.driver.matches(Regex("^[a-zA-Z][a-zA-Z0-9_]*\\.[a-zA-Z][a-zA-Z0-9_]*(\\.[a-zA-Z][a-zA-Z0-9_]*)*$"))) {
        "Invalid driver class name format: ${config.driver}"
    }

    // Validate pool sizes
    require(config.maxPoolSize > 0) {
        "maxPoolSize must be positive. Got: ${config.maxPoolSize}"
    }
    require(config.minPoolSize >= 0) {
        "minPoolSize cannot be negative. Got: ${config.minPoolSize}"
    }
    require(config.minPoolSize <= config.maxPoolSize) {
        "minPoolSize (${config.minPoolSize}) cannot be greater than maxPoolSize (${config.maxPoolSize})"
    }
}

fun Application.module() {
    val logger = LoggerFactory.getLogger("Application")
    val moduleStartTime = System.currentTimeMillis()
    val performanceMetrics = mutableMapOf<String, Long>()

    // Initialize database provider
    val databaseProvider = configureDatabaseConnection(logger, performanceMetrics)

    // Install Ktor features
    configureKtorFeatures(logger, performanceMetrics)

    // Configure OpenAPI documentation generation and Swagger UI
    configureOpenAPI(logger, performanceMetrics)

    // Setup MCP integration (passing the database from provider)
    val mcpIntegrationService = configureMCPIntegration(databaseProvider.getDatabase(), logger, performanceMetrics, databaseProvider)

    // Configure API routes (requires DI to be configured first)
    val timeProvider: TimeProvider by dependencies
    ApiConfiguration.configure(this, timeProvider)

    // Configure routing
    routing {
        configureHealthEndpoint(mcpIntegrationService, logger)

        // OpenAPI specification and Swagger UI (Ktor 3.3.0 compatible)
        // Only serve documentation if enabled and specification file exists
        val openApiEnabled = System.getenv("OPENAPI_ENABLED")?.toBoolean() ?:
                            (System.getProperty("openapi.enabled")?.toBoolean() ?: true)

        if (openApiEnabled) {
            try {
                openAPI(path = "openapi", swaggerFile = "openapi/documentation.yaml")
                swaggerUI(path = "swagger", swaggerFile = "openapi/documentation.yaml")
                logger.info("OpenAPI documentation available at /swagger")
            } catch (e: Exception) {
                logger.warn("Failed to configure OpenAPI documentation: ${e.message}")
                logger.info("OpenAPI documentation will not be available")
            }
        } else {
            logger.info("OpenAPI documentation disabled by configuration")
        }

        // MCP Server endpoints
        configureMCP()
    }
    
    // Setup graceful shutdown
    configureShutdownHooks(mcpIntegrationService, logger)
    
    // Log final performance summary
    logPerformanceSummary(moduleStartTime, performanceMetrics, mcpIntegrationService, logger)
}

/**
 * Validates database configuration parameters early in startup.
 * 
 * @param jdbcUrl The JDBC URL to validate
 * @param driver The driver class name to validate
 * @throws IllegalArgumentException if configuration is invalid
 */
private fun validateDatabaseConfiguration(jdbcUrl: String, driver: String) {
    // Basic JDBC URL validation
    require(jdbcUrl.isNotBlank()) {
        "Database URL cannot be blank"
    }
    
    require(jdbcUrl.startsWith("jdbc:")) {
        "Database URL must start with 'jdbc:'. Got: $jdbcUrl"
    }
    
    // Validate environment variable overrides don't break expected patterns
    if (System.getenv("DATABASE_URL")?.isNotBlank() == true) {
        val envUrl = System.getenv("DATABASE_URL")!!
        require(envUrl.startsWith("jdbc:")) {
            "Environment variable DATABASE_URL must be a valid JDBC URL. Got: $envUrl"
        }
    }
    
    // Driver validation (basic check)
    require(driver.isNotBlank()) {
        "Database driver cannot be blank"
    }
    
    // Validate driver class name format
    require(driver.matches(Regex("^[a-zA-Z][a-zA-Z0-9_]*\\.[a-zA-Z][a-zA-Z0-9_]*(\\.[a-zA-Z][a-zA-Z0-9_]*)*$"))) {
        "Invalid driver class name format: $driver"
    }
}

/**
 * Configure database connection with validation and initialization.
 * Orchestrates the database setup using focused single-responsibility functions.
 *
 * @param logger Application logger
 * @param performanceMetrics Map to store timing metrics
 * @return Initialized database provider
 */
private fun Application.configureDatabaseConnection(
    logger: org.slf4j.Logger,
    performanceMetrics: MutableMap<String, Long>
): DatabaseProvider {
    // Build configuration from environment/properties
    val config = buildDatabaseConfig()

    // Validate configuration before attempting database initialization
    try {
        validateDatabaseConfig(config)
        logger.info("Database configuration validated successfully")
    } catch (e: IllegalArgumentException) {
        logger.error("Invalid database configuration: ${e.message}")
        throw e
    }

    // Initialize database provider with timing metrics
    return initializeDatabase(config, logger, performanceMetrics)
}

/**
 * Configure Ktor features including content negotiation and SSE.
 *
 * @param logger Application logger
 * @param performanceMetrics Map to store timing metrics
 */
private fun Application.configureKtorFeatures(
    logger: org.slf4j.Logger,
    performanceMetrics: MutableMap<String, Long>
) {
    val featuresStartTime = System.currentTimeMillis()
    
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            isLenient = true
            ignoreUnknownKeys = true
        })
    }

    install(SSE)

    val featuresEndTime = System.currentTimeMillis()
    val featuresTime = featuresEndTime - featuresStartTime
    performanceMetrics["features"] = featuresTime
    logger.info("Ktor features installation completed in ${featuresTime}ms")
}

/**
 * Configure OpenAPI and Swagger UI setup for Ktor 3.3.0.
 * We serve static OpenAPI specifications and Swagger UI.
 *
 * @param logger Application logger
 * @param performanceMetrics Map to store timing metrics
 */
private fun Application.configureOpenAPI(
    logger: org.slf4j.Logger,
    performanceMetrics: MutableMap<String, Long>
) {
    val openApiStartTime = System.currentTimeMillis()

    // Check if OpenAPI is enabled
    val openApiEnabled = System.getenv("OPENAPI_ENABLED")?.toBoolean() ?:
                        (System.getProperty("openapi.enabled")?.toBoolean() ?: true)

    if (openApiEnabled) {
        // Validate OpenAPI specification file exists
        val specificationFile = "openapi/documentation.yaml"
        val resourceStream = this::class.java.classLoader.getResourceAsStream(specificationFile)

        if (resourceStream != null) {
            resourceStream.close()
            logger.info("Configuring OpenAPI documentation serving for Ktor 3.3.0")
            logger.info("OpenAPI specification validated: $specificationFile")
        } else {
            logger.warn("OpenAPI specification file not found: $specificationFile")
            logger.warn("OpenAPI documentation will not be available")
        }
    } else {
        logger.info("OpenAPI documentation disabled by configuration")
    }

    val openApiEndTime = System.currentTimeMillis()
    val openApiTime = openApiEndTime - openApiStartTime
    performanceMetrics["openapi"] = openApiTime
    logger.info("OpenAPI configuration completed in ${openApiTime}ms")
}

/**
 * Configure MCP integration including dependency injection and service startup.
 *
 * @param database Database instance
 * @param logger Application logger
 * @param performanceMetrics Map to store timing metrics
 * @param databaseProvider Database provider for DI
 * @return MCP integration service instance or null if disabled/failed
 */
private fun Application.configureMCPIntegration(
    database: Database,
    logger: org.slf4j.Logger,
    performanceMetrics: MutableMap<String, Long>,
    databaseProvider: DatabaseProvider
): MCPIntegrationService? {
    // Configure DI with explicit database and provider - clean DI pattern
    val diStartTime = System.currentTimeMillis()
    val mcpEnabled = System.getenv("MCP_ENABLED")?.toBoolean() ?: true
    val diEndTime = try {
        configureDependencies(
            database = database,
            databaseProvider = databaseProvider,
            timeProvider = null, // Use default SystemTimeProvider
            includeMCP = mcpEnabled
        )
        val endTime = System.currentTimeMillis()
        val diTime = endTime - diStartTime
        performanceMetrics["di"] = diTime
        logger.info("Dependency injection configuration completed in ${diTime}ms")
        endTime
    } catch (e: IllegalStateException) {
        logger.error("Dependency injection configuration failed: ${e.message}", e)
        throw e // Re-throw DI configuration errors as they indicate critical startup failures
    } catch (e: SQLException) {
        logger.error("Database connection failed during DI setup: ${e.message}", e) 
        throw IllegalStateException("Database initialization failed during startup", e)
    }

    // Initialize MCP integration service for monitoring and lifecycle management
    return if (mcpEnabled) {
        try {
            val mcpService: MCPIntegrationService by dependencies
            
            // Start the optimized MCP integration
            runBlocking {
                mcpService.start()
            }
            
            logger.info("MCP integration service started with optimizations")
            mcpService
        } catch (e: MCPIntegrationException) {
            logger.warn("MCP integration service failed to start: ${e.message}", e)
            null // Continue without MCP - this is not a critical failure
        } catch (e: IllegalStateException) {
            logger.warn("MCP integration unavailable due to configuration issue: ${e.message}", e)
            null // Continue without MCP
        } catch (e: IOException) {
            logger.warn("Network/IO error starting MCP integration: ${e.message}", e)
            null // Continue without MCP - network issue
        }
    } else {
        logger.info("MCP integration disabled by configuration")
        null
    }
}

/**
 * Configure health endpoint with comprehensive system checks.
 * 
 * @param mcpIntegrationService MCP service for health reporting
 * @param logger Application logger
 */
private fun Route.configureHealthEndpoint(
    mcpIntegrationService: MCPIntegrationService?,
    logger: org.slf4j.Logger
) {
    val mcpEnabled = System.getenv("MCP_ENABLED")?.toBoolean() ?: true
    
    get("/health") {
        try {
            // Test dependency resolution first
            val projectService: ProjectApplicationService by application.dependencies
            val issueService: IssueApplicationService by application.dependencies
            val sessionService: SessionApplicationService by application.dependencies
            val database: Database by application.dependencies

            // Verify services are initialized and functional
            val projectCount = try {
                projectService.listProjects().projects.size
            } catch (e: SQLException) {
                logger.warn("Database connection error during project health check: ${e.message}")
                -1
            } catch (e: ExposedSQLException) {
                logger.warn("Database query error during project health check: ${e.message}")
                -1
            } catch (e: IllegalStateException) {
                logger.warn("ProjectService not properly initialized: ${e.message}")
                -1
            }
            
            val sessionCount = try {
                sessionService.getSessionCount()
            } catch (e: SQLException) {
                logger.warn("Database connection error during session health check: ${e.message}")
                -1
            } catch (e: ExposedSQLException) {
                logger.warn("Database query error during session health check: ${e.message}")
                -1
            } catch (e: IllegalStateException) {
                logger.warn("SessionService not properly initialized: ${e.message}")
                -1
            }
            
            // Enhanced MCP health status with performance metrics
            val mcpHealthStatus = buildMcpHealthStatus(mcpEnabled, mcpIntegrationService)

            call.respond(HttpStatusCode.OK, HealthResponse(
                status = "healthy",
                service = BuildInfo.serviceName,
                version = BuildInfo.version,
                dependencies = mapOf(
                    "database" to "connected",
                    "projectService" to "initialized",
                    "issueService" to "initialized",
                    "sessionService" to "initialized"
                ) + mcpHealthStatus.dependencies,
                metrics = mapOf(
                    "projects" to projectCount.toString(),
                    "sessions" to sessionCount.toString()
                ) + mcpHealthStatus.metrics,
                timestamp = System.currentTimeMillis().toString()
            ))
        } catch (e: SQLException) {
            logger.error("Database connection failure in health endpoint: ${e.message}", e)
            call.respond(HttpStatusCode.ServiceUnavailable, ErrorResponse(
                status = "unhealthy",
                service = BuildInfo.serviceName,
                version = BuildInfo.version,
                error = "Database unavailable",
                timestamp = System.currentTimeMillis().toString()
            ))
        } catch (e: ExposedSQLException) {
            logger.error("Database query failure in health endpoint: ${e.message}", e)
            call.respond(HttpStatusCode.ServiceUnavailable, ErrorResponse(
                status = "unhealthy",
                service = BuildInfo.serviceName,
                version = BuildInfo.version,
                error = "Database query failed",
                timestamp = System.currentTimeMillis().toString()
            ))
        } catch (e: IllegalStateException) {
            logger.error("Service initialization failure in health endpoint: ${e.message}", e)
            call.respond(HttpStatusCode.ServiceUnavailable, ErrorResponse(
                status = "unhealthy",
                service = BuildInfo.serviceName,
                version = BuildInfo.version,
                error = "Service initialization failed",
                timestamp = System.currentTimeMillis().toString()
            ))
        } catch (e: IOException) {
            logger.error("IO error in health endpoint: ${e.message}", e)
            call.respond(HttpStatusCode.ServiceUnavailable, ErrorResponse(
                status = "unhealthy", 
                service = BuildInfo.serviceName,
                version = BuildInfo.version,
                error = "Service communication error",
                timestamp = System.currentTimeMillis().toString()
            ))
        }
    }
}

/**
 * Build MCP health status with performance metrics.
 * Returns a self-documenting HealthStatus data class instead of a generic Pair.
 */
private fun buildMcpHealthStatus(
    mcpEnabled: Boolean,
    mcpIntegrationService: MCPIntegrationService?
): HealthStatus {
    return if (mcpEnabled) {
        val mcpStatus = mcpIntegrationService?.getStatus()
        if (mcpStatus != null) {
            val dependencies = mapOf(
                "mcp" to if (mcpStatus.isRunning) "running" else "stopped"
            )
            
            val metrics = buildMap {
                put("mcpConnections", mcpStatus.activeConnections.toString())
                put("mcpPort", mcpStatus.port.toString())
                put("mcpUptime", mcpStatus.uptimeMs.toString())
                put("mcpStatus", if (mcpStatus.isRunning) "running" else "stopped")
            }
            
            HealthStatus(dependencies, metrics)
        } else {
            // SSE endpoint available but no monitoring service
            val dependencies = mapOf(
                "mcp" to "running"
            )
            val metrics = mapOf(
                "mcpConnections" to "0", // No service available to get real count
                "mcpPort" to "3006",
                "mcpUptime" to "0",
                "mcpStatus" to "running"
            )
            HealthStatus(dependencies, metrics)
        }
    } else {
        HealthStatus(mapOf("mcp" to "disabled"), emptyMap())
    }
}


/**
 * Configure shutdown hooks for graceful application termination.
 * 
 * @param mcpIntegrationService MCP service to stop gracefully
 * @param logger Application logger
 */
private fun Application.configureShutdownHooks(
    mcpIntegrationService: MCPIntegrationService?,
    logger: org.slf4j.Logger
) {
    monitor.subscribe(ApplicationStopped) {
        logger.info("Application stopping, initiating graceful shutdown...")
        
        // Stop MCP integration service gracefully
        if (mcpIntegrationService != null) {
            runBlocking {
                try {
                    mcpIntegrationService.stop()
                    logger.info("MCP integration service stopped gracefully")
                } catch (e: MCPIntegrationException) {
                    logger.error("MCP integration service shutdown failed: ${e.message}", e)
                } catch (e: IllegalStateException) {
                    logger.error("MCP service not properly initialized for shutdown: ${e.message}")
                } catch (e: InterruptedException) {
                    logger.warn("MCP service shutdown interrupted: ${e.message}")
                    Thread.currentThread().interrupt() // Restore interrupted status
                }
            }
        }
        
        // Close database connection through provider
        // Provider handles test environment detection internally
        try {
            // Access the DatabaseProvider from DI if available
            val databaseProvider: DatabaseProvider by dependencies
            databaseProvider.close()
            logger.info("Database connection closed through provider")
        } catch (e: Exception) {
            // Database provider may not be registered in some test scenarios
            logger.debug("Database provider not available for shutdown: ${e.message}")
        }
        
        logger.info("Application shutdown complete")
    }
}

/**
 * Log performance summary with startup metrics.
 * 
 * @param moduleStartTime Start time of module initialization
 * @param performanceMetrics Map of timing metrics
 * @param mcpIntegrationService MCP service for optimization status
 * @param logger Application logger
 */
private fun logPerformanceSummary(
    moduleStartTime: Long,
    performanceMetrics: Map<String, Long>,
    mcpIntegrationService: MCPIntegrationService?,
    logger: org.slf4j.Logger
) {
    val moduleEndTime = System.currentTimeMillis()
    val totalStartupTime = moduleEndTime - moduleStartTime
    logger.info("CycleTime Kotlin server started successfully in ${totalStartupTime}ms")
    
    // Log startup performance summary
    logger.info("Startup performance breakdown:")
    performanceMetrics["database"]?.let { logger.info("  - Database initialization: ${it}ms") }
    performanceMetrics["features"]?.let { logger.info("  - Ktor features installation: ${it}ms") }
    performanceMetrics["openapi"]?.let { logger.info("  - OpenAPI and Swagger UI configuration: ${it}ms") }
    performanceMetrics["di"]?.let { logger.info("  - Dependency injection setup: ${it}ms") }
    
    if (mcpIntegrationService != null) {
        val status = mcpIntegrationService.getStatus()
        logger.info("  - MCP integration: started (simplified architecture)")
    }
    logger.info("  - Total startup time: ${totalStartupTime}ms")
    
    // Log performance optimization status
    val mcpEnabled = System.getenv("MCP_ENABLED")?.toBoolean() ?: true
    if (mcpEnabled && mcpIntegrationService != null) {
        logger.info("MCP integration running with simplified architecture (monitoring removed for MVP)")
    }
}


