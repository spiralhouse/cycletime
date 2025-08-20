package io.spiralhouse.jcvd

import io.spiralhouse.jcvd.domain.repositories.IssueRepository
import io.spiralhouse.jcvd.domain.repositories.ProjectRepository
import io.spiralhouse.jcvd.domain.repositories.SessionRepository
import io.spiralhouse.jcvd.domain.services.SystemTimeProvider
import io.spiralhouse.jcvd.domain.services.TimeProvider
import io.spiralhouse.jcvd.infrastructure.database.DatabaseFactory
import io.spiralhouse.jcvd.infrastructure.di.DIContainer
import io.spiralhouse.jcvd.infrastructure.di.singleton
import io.ktor.util.AttributeKey
import io.spiralhouse.jcvd.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.jcvd.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.jcvd.infrastructure.persistence.ExposedSessionRepository
import io.spiralhouse.jcvd.mcp.configureMCP
import io.ktor.server.application.ApplicationEnvironment
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.cio.*
// Ktor native DI is not available as a separate plugin in 3.2.0
// Using manual dependency management instead
import io.ktor.server.engine.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sse.*
import kotlinx.serialization.json.Json
import org.slf4j.LoggerFactory

// Application attribute key for the DI container
val DIContainerKey = AttributeKey<DIContainer>("DIContainer")

// Extension to get DI container from application
val Application.di: DIContainer
    get() = attributes[DIContainerKey]

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

    // Initialize database
    val jdbcUrl = System.getenv("DATABASE_URL") ?: "jdbc:sqlite:jcvd.db"
    val enableLogging = System.getenv("DATABASE_LOGGING")?.toBoolean() ?: false

    logger.info("Initializing database with URL: $jdbcUrl")
    DatabaseFactory.init(jdbcUrl = jdbcUrl, enableLogging = enableLogging)

    // Install features
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            isLenient = true
            ignoreUnknownKeys = true
        })
    }

    install(SSE)

    // Configure DI container (replaces Koin)
    val di = DIContainer()
    
    // Register domain services
    di.singleton<TimeProvider> { SystemTimeProvider() }
    
    // Register infrastructure repositories  
    di.singleton<ProjectRepository> { ExposedProjectRepository() }
    di.singleton<IssueRepository> { ExposedIssueRepository() }
    di.singleton<SessionRepository> { ExposedSessionRepository() }
    
    // Store DI container in application attributes for access in routes
    attributes.put(DIContainerKey, di)

    // Configure routing
    routing {
        // Health check endpoint
        get("/health") {
            call.respond(mapOf(
                "status" to "healthy",
                "service" to "jcvd-kotlin",
                "version" to "0.1.0"
            ))
        }

        // MCP Server endpoints
        configureMCP()
    }

    // Shutdown hook
    environment.monitor.subscribe(ApplicationStopped) {
        logger.info("Application stopping, closing database connection")
        DatabaseFactory.close()
    }

    logger.info("JCVD Kotlin server started successfully")
}
