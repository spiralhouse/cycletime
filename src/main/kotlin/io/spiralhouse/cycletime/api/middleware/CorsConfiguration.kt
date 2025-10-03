package io.spiralhouse.cycletime.api.middleware

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.cors.routing.*

/**
 * CORS (Cross-Origin Resource Sharing) configuration for the API.
 * 
 * This configuration allows controlled access to the API from web browsers,
 * supporting both development and production environments.
 */
object CorsConfiguration {
    
    /**
     * Install and configure CORS for the application.
     * 
     * @param app The application to configure
     */
    fun install(app: Application) {
        app.install(CORS) {
            // Allow specific HTTP methods
            allowMethod(HttpMethod.Options)
            allowMethod(HttpMethod.Get)
            allowMethod(HttpMethod.Post)
            allowMethod(HttpMethod.Put)
            allowMethod(HttpMethod.Delete)
            allowMethod(HttpMethod.Patch)
            
            // Allow common headers
            allowHeader(HttpHeaders.Authorization)
            allowHeader(HttpHeaders.ContentType)
            allowHeader(HttpHeaders.Accept)
            allowHeader(HttpHeaders.AcceptLanguage)
            allowHeader("X-Requested-With")
            
            // Expose headers to clients
            exposeHeader(HttpHeaders.ContentType)
            exposeHeader(HttpHeaders.ContentLength)
            exposeHeader("X-Request-Id")
            
            // Configure allowed origins based on environment
            val isDevelopment = app.environment.config.propertyOrNull("ktor.deployment.environment")?.getString() == "development"
            if (isDevelopment) {
                // In development, allow common local development origins
                allowHost("localhost:3000")
                allowHost("localhost:3001")
                allowHost("localhost:5173")
                allowHost("localhost:8080")
                allowHost("127.0.0.1:3000")
                allowHost("127.0.0.1:3001")
                allowHost("127.0.0.1:5173")
                allowHost("127.0.0.1:8080")
                // Allow network hostname for local network access
                allowHost("johns-mac-mini.main.spiral.house:8080", schemes = listOf("http", "https"))
            } else {
                // In production, configure specific allowed origins from environment
                val allowedOrigins = System.getenv("CORS_ALLOWED_ORIGINS")
                    ?.split(",")
                    ?.map { it.trim() }
                    ?: listOf()
                    
                if (allowedOrigins.isNotEmpty()) {
                    allowedOrigins.forEach { origin ->
                        val parts = origin.split("://")
                        if (parts.size == 2) {
                            val hostAndPort = parts[1].split(":")
                            if (hostAndPort.size == 2) {
                                allowHost(hostAndPort[0], schemes = listOf(parts[0]))
                            } else {
                                allowHost(parts[1], schemes = listOf(parts[0]))
                            }
                        }
                    }
                } else {
                    // Default: no CORS in production if not configured
                    // This prevents unauthorized access
                }
            }
            
            // Allow credentials to be included in CORS requests
            allowCredentials = true
            
            // Set max age for preflight cache (1 hour)
            maxAgeInSeconds = 3600
        }
    }
}

