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
import io.spiralhouse.cycletime.api.configuration.ApiConfiguration
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.cio.*
import io.ktor.server.engine.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.di.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sse.*
import io.ktor.http.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.Serializable
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

    // Initialize database from configuration
    val jdbcUrl = environment.config.propertyOrNull("database.url")?.getString()
        ?: System.getenv("DATABASE_URL") 
        ?: "jdbc:h2:file:./cycletime;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"
    val driver = environment.config.propertyOrNull("database.driver")?.getString()
        ?: System.getenv("DATABASE_DRIVER")
        ?: "org.h2.Driver"
    val enableLogging = environment.config.propertyOrNull("database.logging")?.getString()?.toBoolean()
        ?: System.getenv("DATABASE_LOGGING")?.toBoolean() 
        ?: false

    logger.info("Initializing database with URL: $jdbcUrl")
    DatabaseFactory.init(jdbcUrl = jdbcUrl, driver = driver, enableLogging = enableLogging)

    // Install features
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            isLenient = true
            ignoreUnknownKeys = true
        })
    }

    install(SSE)

    // Configure Ktor native DI
    configureDependencies()

    // Configure routing
    routing {
        // Health check endpoint
        get("/health") {
            try {
                val projectService: ProjectApplicationService by application.dependencies
                val issueService: IssueApplicationService by application.dependencies
                val sessionService: SessionApplicationService by application.dependencies
                val database: Database by application.dependencies

                // Verify services are initialized
                val projectCount = projectService.listProjects().projects.size
                val sessionCount = sessionService.getSessionCount()

                call.respond(HttpStatusCode.OK, HealthResponse(
                    status = "healthy",
                    service = BuildInfo.serviceName,
                    version = BuildInfo.version,
                    dependencies = mapOf(
                        "database" to "connected",
                        "projectService" to "initialized",
                        "issueService" to "initialized",
                        "sessionService" to "initialized"
                    ),
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
        logger.info("Application stopping, closing database connection")
        DatabaseFactory.close()
    }

    logger.info("CycleTime Kotlin server started successfully")
}

/**
 * Configure the application for testing with project routes.
 * This includes content negotiation, dependency injection, and API routes.
 */
fun Application.configureForTesting(timeProvider: TimeProvider? = null) {
    configureDependencies(timeProvider)
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

/**
 * Configure dependency injection using Ktor native DI plugin
 */
fun Application.configureDependencies(timeProvider: TimeProvider? = null) {
    dependencies {
        // Domain Services - Allow override for testing
        provide<TimeProvider> { timeProvider ?: SystemTimeProvider() }

        // Database
        provide<Database> { DatabaseFactory.getInstance() }

        // Unit of Work
        provide<UnitOfWork> { ExposedUnitOfWork(resolve()) }

        // Repositories - Use injected TimeProvider
        provide<ProjectRepository> { ExposedProjectRepository(resolve(), resolve()) }
        provide<IssueRepository> { ExposedIssueRepository(resolve(), resolve()) }
        provide<SessionRepository> { ExposedSessionRepository(resolve(), resolve()) }

        // Application Services
        provide<ProjectApplicationService> {
            ProjectApplicationService(
                projectRepository = resolve(),
                issueRepository = resolve(),
                unitOfWork = resolve(),
                timeProvider = resolve()
            )
        }

        provide<IssueApplicationService> {
            IssueApplicationService(
                issueRepository = resolve(),
                projectRepository = resolve(),
                unitOfWork = resolve(),
                timeProvider = resolve()
            )
        }

        provide<SessionApplicationService> {
            SessionApplicationService(
                sessionRepository = resolve(),
                projectRepository = resolve(),
                unitOfWork = resolve(),
                timeProvider = resolve()
            )
        }
    }
}
