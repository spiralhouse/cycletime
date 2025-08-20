package io.spiralhouse.jcvd

import io.spiralhouse.jcvd.infrastructure.database.DatabaseFactory
import io.spiralhouse.jcvd.infrastructure.di.appModule
import io.spiralhouse.jcvd.mcp.configureMCP
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.cio.*
import io.ktor.server.config.*
import io.ktor.server.engine.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sse.*
import kotlinx.serialization.json.Json
import org.koin.ktor.plugin.Koin
import org.slf4j.LoggerFactory

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

    install(Koin) {
        modules(appModule)
    }

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
