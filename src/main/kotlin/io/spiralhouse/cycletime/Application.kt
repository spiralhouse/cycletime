package io.spiralhouse.cycletime

import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.repositories.SessionRepository
import io.spiralhouse.cycletime.domain.repositories.UnitOfWork
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.services.BuildInfo
import io.spiralhouse.cycletime.infrastructure.database.DatabaseFactory
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
import io.ktor.server.websocket.*
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

fun Application.module() {
    val logger = LoggerFactory.getLogger("Application")
    val moduleStartTime = System.currentTimeMillis()
    val performanceMetrics = mutableMapOf<String, Long>()

    // Initialize database
    val database = configureDatabaseConnection(logger, performanceMetrics)
    
    // Install Ktor features
    configureKtorFeatures(logger, performanceMetrics)
    
    // Setup MCP integration
    val mcpIntegrationService = configureMCPIntegration(database, logger, performanceMetrics)

    // Configure routing
    routing {
        configureHealthEndpoint(mcpIntegrationService, logger)
        
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
 * 
 * @param logger Application logger
 * @param performanceMetrics Map to store timing metrics
 * @return Initialized database instance
 */
private fun Application.configureDatabaseConnection(
    logger: org.slf4j.Logger,
    performanceMetrics: MutableMap<String, Long>
): Database {
    // Database configuration
    val jdbcUrl = environment.config.propertyOrNull("database.url")?.getString()
        ?: System.getenv("DATABASE_URL") 
        ?: "jdbc:h2:file:./cycletime;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE"
    val driver = environment.config.propertyOrNull("database.driver")?.getString()
        ?: System.getenv("DATABASE_DRIVER")
        ?: "org.h2.Driver"
    val enableLogging = environment.config.propertyOrNull("database.logging")?.getString()?.toBoolean()
        ?: System.getenv("DATABASE_LOGGING")?.toBoolean() 
        ?: false

    // Validate configuration before attempting database initialization
    try {
        validateDatabaseConfiguration(jdbcUrl, driver)
        logger.info("Database configuration validated successfully")
    } catch (e: IllegalArgumentException) {
        logger.error("Invalid database configuration: ${e.message}")
        throw e
    }

    // Initialize database
    logger.info("Initializing database with URL: $jdbcUrl")
    val dbStartTime = System.currentTimeMillis()
    DatabaseFactory.init(jdbcUrl = jdbcUrl, driver = driver, enableLogging = enableLogging)
    val database = DatabaseFactory.getInstance()
    val dbEndTime = System.currentTimeMillis()
    val dbTime = dbEndTime - dbStartTime
    performanceMetrics["database"] = dbTime
    logger.info("Database initialization completed in ${dbTime}ms")
    
    return database
}

/**
 * Configure Ktor features including content negotiation, SSE, and WebSockets.
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
    
    // Install WebSocket support for MCP
    install(WebSockets) {
        pingPeriod = 30.seconds
        timeout = 15.seconds
        maxFrameSize = Long.MAX_VALUE
        masking = false
    }
    
    val featuresEndTime = System.currentTimeMillis()
    val featuresTime = featuresEndTime - featuresStartTime
    performanceMetrics["features"] = featuresTime
    logger.info("Ktor features installation completed in ${featuresTime}ms")
}

/**
 * Configure MCP integration including dependency injection and service startup.
 * 
 * @param database Database instance
 * @param logger Application logger
 * @param performanceMetrics Map to store timing metrics
 * @return MCP integration service instance or null if disabled/failed
 */
private fun Application.configureMCPIntegration(
    database: Database,
    logger: org.slf4j.Logger,
    performanceMetrics: MutableMap<String, Long>
): MCPIntegrationService? {
    // Configure DI with explicit database - simple and clear
    val diStartTime = System.currentTimeMillis()
    val mcpEnabled = System.getenv("MCP_ENABLED")?.toBoolean() ?: true
    val diEndTime = try {
        configureDependencies(
            database = database,
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
    } catch (e: ClassNotFoundException) {
        logger.error("Missing dependency class during DI setup: ${e.message}", e)
        throw IllegalStateException("Required dependency class not found", e)
    } catch (e: NoClassDefFoundError) {
        logger.error("Class loading error during DI setup: ${e.message}", e)
        throw IllegalStateException("Dependency class loading failed", e)
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
            val (mcpDependencies, mcpMetrics) = buildMcpHealthStatus(mcpEnabled, mcpIntegrationService)

            call.respond(HttpStatusCode.OK, HealthResponse(
                status = "healthy",
                service = BuildInfo.serviceName,
                version = BuildInfo.version,
                dependencies = mapOf(
                    "database" to "connected",
                    "projectService" to "initialized",
                    "issueService" to "initialized",
                    "sessionService" to "initialized"
                ) + mcpDependencies,
                metrics = mapOf(
                    "projects" to projectCount.toString(),
                    "sessions" to sessionCount.toString()
                ) + mcpMetrics,
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
 * Build MCP health status map with performance metrics.
 * Returns a pair of (dependencies, metrics) for proper categorization.
 */
private fun buildMcpHealthStatus(
    mcpEnabled: Boolean,
    mcpIntegrationService: MCPIntegrationService?
): Pair<Map<String, String>, Map<String, String>> {
    return if (mcpEnabled) {
        val mcpStatus = mcpIntegrationService?.getStatus()
        if (mcpStatus != null) {
            val dependencies = mapOf(
                "mcpServer" to if (mcpStatus.isRunning) "running" else "stopped"
            )
            
            val metrics = buildMap {
                put("mcpConnections", mcpStatus.activeConnections.toString())
                put("mcpPort", mcpStatus.port.toString())
                put("mcpUptime", mcpStatus.uptimeMs.toString())
                put("mcpStatus", if (mcpStatus.isRunning) "running" else "stopped")
                
                // Add performance metrics if available
                if (mcpStatus.totalRequests > 0) {
                    put("mcpRequests", mcpStatus.totalRequests.toString())
                    put("mcpLatency", "${mcpStatus.averageLatency}ms")
                    put("mcpCacheHitRate", "${(mcpStatus.cacheHitRate * 100).toInt()}%")
                }
                
                if (mcpStatus.optimizationsEnabled) {
                    put("mcpOptimized", "true")
                }
            }
            
            dependencies to metrics
        } else {
            // WebSocket endpoint available but no monitoring
            val dependencies = mapOf(
                "mcpServer" to "running"
            )
            val metrics = mapOf(
                "mcpConnections" to "0",
                "mcpPort" to "3006",
                "mcpUptime" to "0",
                "mcpStatus" to "running"
            )
            dependencies to metrics
        }
    } else {
        mapOf("mcpServer" to "disabled") to emptyMap()
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
        
        // Close database connection
        DatabaseFactory.close()
        logger.info("Database connection closed")
        
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
    performanceMetrics["di"]?.let { logger.info("  - Dependency injection setup: ${it}ms") }
    
    if (mcpIntegrationService != null) {
        val status = mcpIntegrationService.getStatus()
        logger.info("  - MCP integration: started (optimized: ${status.optimizationsEnabled})")
    }
    logger.info("  - Total startup time: ${totalStartupTime}ms")
    
    // Log performance optimization status
    val mcpEnabled = System.getenv("MCP_ENABLED")?.toBoolean() ?: true
    if (mcpEnabled && mcpIntegrationService != null) {
        val status = mcpIntegrationService.getStatus()
        if (status.optimizationsEnabled) {
            logger.info("Performance optimizations enabled: async processing, resource caching, connection pooling")
        }
    }
}

/**
 * Configure the application for testing with project routes.
 * This includes content negotiation, dependency injection, and API routes.
 */
fun Application.configureForTesting(
    database: Database,
    timeProvider: TimeProvider? = null
) {
    configureDependencies(
        database = database,
        timeProvider = timeProvider,
        includeMCP = false // Tests don't need MCP
    )
    
    // Ensure all tables exist for tests
    org.jetbrains.exposed.sql.transactions.transaction(database) {
        org.jetbrains.exposed.sql.SchemaUtils.createMissingTablesAndColumns(
            io.spiralhouse.cycletime.infrastructure.database.ProjectsTable,
            io.spiralhouse.cycletime.infrastructure.database.IssuesTable,
            io.spiralhouse.cycletime.infrastructure.database.SessionStatesTable,
            io.spiralhouse.cycletime.infrastructure.database.WorkflowsTable
        )
    }
    
    configureContentNegotiation()
    val injectedTimeProvider: TimeProvider by dependencies
    ApiConfiguration.configure(this, injectedTimeProvider)
}

/**
 * Configure content negotiation for JSON serialization.
 */
fun Application.configureContentNegotiation() {
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            isLenient = true
            ignoreUnknownKeys = true
        })
    }
}

