package com.spiralhouse.jcvd

import com.spiralhouse.jcvd.infrastructure.database.DatabaseFactory
import com.spiralhouse.jcvd.infrastructure.di.appModule
import com.spiralhouse.jcvd.mcp.configureMCP
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
    val config = ApplicationConfig("application.conf")
    
    embeddedServer(
        CIO,
        port = config.property("ktor.deployment.port").getString().toInt(),
        host = config.property("ktor.deployment.host").getString(),
        module = Application::module
    ).start(wait = true)
}

fun Application.module() {
    val logger = LoggerFactory.getLogger("Application")
    
    // Initialize database
    val jdbcUrl = environment.config.propertyOrNull("database.url")?.getString() 
        ?: "jdbc:sqlite:jcvd.db"
    val enableLogging = environment.config.propertyOrNull("database.logging")?.getString()?.toBoolean() 
        ?: false
    
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