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

    // Initialize database from configuration
    // Note: Migration from SQLite to H2 completed. H2 is now the default database.
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

    logger.info("Initializing database with URL: $jdbcUrl")
    val dbStartTime = System.currentTimeMillis()
    DatabaseFactory.init(jdbcUrl = jdbcUrl, driver = driver, enableLogging = enableLogging)
    val database = DatabaseFactory.getInstance()
    val dbEndTime = System.currentTimeMillis()
    logger.info("Database initialization completed in ${dbEndTime - dbStartTime}ms")

    // Install features
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
    logger.info("Ktor features installation completed in ${featuresEndTime - featuresStartTime}ms")

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
        logger.info("Dependency injection configuration completed in ${endTime - diStartTime}ms")
        endTime
    } catch (e: Exception) {
        logger.error("Failed to configure dependency injection: ${e.message}", e)
        throw IllegalStateException("Dependency injection configuration failed", e)
    }

    // Start MCP server if enabled
    val mcpStartTime = System.currentTimeMillis()
    val mcpIntegrationService = if (mcpEnabled) {
        try {
            val mcpService: MCPIntegrationService by dependencies
            val mcpConfig = mcpService.getStatus()
            
            launch {
                try {
                    mcpService.start()
                    val mcpEndTime = System.currentTimeMillis()
                    logger.info("MCP WebSocket server started on ${mcpConfig.host}:${mcpConfig.port}${mcpConfig.path} in ${mcpEndTime - mcpStartTime}ms")
                } catch (e: Exception) {
                    logger.error("Failed to start MCP WebSocket server: ${e.message}", e)
                    // Don't fail the entire application if MCP fails to start
                }
            }
            mcpService
        } catch (e: Exception) {
            logger.warn("MCP Integration Service not available: ${e.message}")
            null
        }
    } else {
        null
    }
    
    // Configure routing
    routing {
        // Health check endpoint
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
                } catch (e: Exception) {
                    logger.warn("ProjectService health check failed", e)
                    -1
                }
                
                val sessionCount = try {
                    sessionService.getSessionCount()
                } catch (e: Exception) {
                    logger.warn("SessionService health check failed", e)
                    -1
                }
                
                // MCP status
                val mcpStatus = mcpIntegrationService?.getStatus()
                val mcpHealth = if (mcpStatus != null) {
                    mapOf(
                        "mcp" to if (mcpStatus.isRunning) "running" else "stopped",
                        "mcp_port" to mcpStatus.port.toString(),
                        "mcp_connections" to mcpStatus.activeConnections.toString()
                    )
                } else {
                    mapOf("mcp" to "not_configured")
                }

                call.respond(HttpStatusCode.OK, HealthResponse(
                    status = "healthy",
                    service = BuildInfo.serviceName,
                    version = BuildInfo.version,
                    dependencies = mapOf(
                        "database" to "connected",
                        "projectService" to "initialized",
                        "issueService" to "initialized",
                        "sessionService" to "initialized"
                    ) + mcpHealth,
                    metrics = mapOf(
                        "projects" to projectCount.toString(),
                        "sessions" to sessionCount.toString()
                    ),
                    timestamp = System.currentTimeMillis().toString()
                ))
            } catch (e: Exception) {
                // Log full exception details internally while keeping user response generic
                ExceptionLogger.logException(
                    logger,
                    e,
                    "Health check failed",
                    mapOf(
                        "endpoint" to "/health",
                        "method" to "GET",
                        "service" to BuildInfo.serviceName,
                        "version" to BuildInfo.version
                    )
                )

                // Return sanitized error to client
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse(
                    status = "unhealthy",
                    service = BuildInfo.serviceName,
                    version = BuildInfo.version,
                    error = "Internal service error", // Generic message for security
                    timestamp = System.currentTimeMillis().toString()
                ))
            }
        }

        // MCP Server endpoints
        configureMCP()
    }

    // Shutdown hook
    monitor.subscribe(ApplicationStopped) {
        logger.info("Application stopping, shutting down services...")
        
        // Stop MCP server if running
        mcpIntegrationService?.let { service ->
            if (service.isRunning()) {
                try {
                    runBlocking {
                        service.stop()
                    }
                    logger.info("MCP WebSocket server stopped")
                } catch (e: Exception) {
                    logger.warn("Error stopping MCP server: ${e.message}")
                }
            }
        }
        
        // Close database connection
        DatabaseFactory.close()
        logger.info("Database connection closed")
    }

    val moduleEndTime = System.currentTimeMillis()
    val totalStartupTime = moduleEndTime - moduleStartTime
    logger.info("CycleTime Kotlin server started successfully in ${totalStartupTime}ms")
    
    // Log startup performance summary
    logger.info("Startup performance breakdown:")
    logger.info("  - Database initialization: ${dbEndTime - dbStartTime}ms")
    logger.info("  - Ktor features installation: ${featuresEndTime - featuresStartTime}ms") 
    logger.info("  - Dependency injection setup: ${diEndTime - diStartTime}ms")
    if (mcpIntegrationService != null) {
        logger.info("  - MCP server startup: ${System.currentTimeMillis() - mcpStartTime}ms")
    }
    logger.info("  - Total startup time: ${totalStartupTime}ms")
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
    if (jdbcUrl.isBlank()) {
        throw IllegalArgumentException("Database URL cannot be blank")
    }
    
    if (!jdbcUrl.startsWith("jdbc:")) {
        throw IllegalArgumentException("Database URL must start with 'jdbc:'. Got: $jdbcUrl")
    }
    
    // Validate environment variable overrides don't break expected patterns
    if (System.getenv("DATABASE_URL")?.isNotBlank() == true) {
        val envUrl = System.getenv("DATABASE_URL")!!
        if (!envUrl.startsWith("jdbc:")) {
            throw IllegalArgumentException("Environment variable DATABASE_URL must be a valid JDBC URL. Got: $envUrl")
        }
    }
    
    // Driver validation (basic check)
    if (driver.isBlank()) {
        throw IllegalArgumentException("Database driver cannot be blank")
    }
    
    // Validate driver class name format
    if (!driver.matches(Regex("^[a-zA-Z][a-zA-Z0-9_]*\\.[a-zA-Z][a-zA-Z0-9_]*(\\.[a-zA-Z][a-zA-Z0-9_]*)*$"))) {
        throw IllegalArgumentException("Invalid driver class name format: $driver")
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

