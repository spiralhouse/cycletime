package io.spiralhouse.cycletime.api.middleware

import io.ktor.server.application.*
import io.ktor.server.plugins.callid.*
import io.ktor.server.plugins.calllogging.*
import io.ktor.server.request.*
import org.slf4j.LoggerFactory
import org.slf4j.event.Level
import java.util.UUID

/**
 * Request/Response logging configuration for monitoring and debugging.
 * 
 * This configuration provides:
 * - Unique request IDs for tracing
 * - Structured logging of requests and responses
 * - Performance metrics (request duration)
 * - Filtering to avoid logging health checks
 */
object RequestLogging {
    private val logger = LoggerFactory.getLogger("HTTP")
    
    /**
     * Install request logging plugins in the application.
     * 
     * @param app The application to configure
     */
    fun install(app: Application) {
        // Install CallId feature for request tracing
        app.install(CallId) {
            // Generate unique ID for each request
            generate { UUID.randomUUID().toString() }
            
            // Also accept X-Request-Id header if provided
            header("X-Request-Id")
            
            // Include call ID in response headers
            reply { call, callId ->
                call.response.headers.append("X-Request-Id", callId)
            }
        }
        
        // Install CallLogging for structured request/response logging
        app.install(CallLogging) {
            level = Level.INFO  // Can be configured based on environment
            
            // Include call ID in MDC for all log messages during request
            callIdMdc("request-id")
            
            // Filter out health check endpoints to reduce log noise
            filter { call ->
                !call.request.path().startsWith("/health") &&
                !call.request.path().startsWith("/metrics")
            }
            
            // Custom format for log messages
            format { call ->
                val status = call.response.status()
                val method = call.request.httpMethod.value
                val path = call.request.path()
                val callId = call.callId
                
                buildString {
                    append("[$callId] ")
                    append("$method $path ")
                    append("-> ${status?.value ?: "???"} ")
                    
                    // In development, also log query parameters
                    // Include query parameters if not empty
                    if (call.request.queryParameters.entries().isNotEmpty()) {
                        append(" params=${call.request.queryParameters.entries()}")
                    }
                }
            }
        }
    }
}


