package io.spiralhouse.cycletime.mcp.monitoring

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import java.util.UUID

/**
 * Structured logging wrapper for MCP operations with correlation ID support.
 * 
 * Provides:
 * - Correlation ID tracking across operations
 * - Structured logging with consistent format
 * - Performance logging with automatic timing
 * - Error tracking with context preservation
 */
class MCPLogger(val logger: Logger) {
    
    /**
     * Log a tool execution with context.
     */
    fun logToolExecution(
        toolName: String,
        params: Map<String, Any?>,
        correlationId: String = generateCorrelationId(),
        block: () -> Any?
    ) {
        MDC.put("correlationId", correlationId)
        MDC.put("operation", "tool_execution")
        MDC.put("tool", toolName)
        
        try {
            logger.debug("Executing tool: {} with params: {}", toolName, params)
            val startTime = System.currentTimeMillis()
            
            val result = block()
            
            val duration = System.currentTimeMillis() - startTime
            logger.info(
                "Tool execution completed - tool: {}, duration: {}ms, correlationId: {}",
                toolName, duration, correlationId
            )
            
            // Record metrics
            MCPMetrics.instance.recordToolExecution(toolName, duration, true)
            
        } catch (e: Exception) {
            logger.error(
                "Tool execution failed - tool: {}, error: {}, correlationId: {}",
                toolName, e.message, correlationId, e
            )
            MCPMetrics.instance.recordToolExecution(toolName, 0, false)
            throw e
        } finally {
            MDC.clear()
        }
    }
    
    /**
     * Log a resource operation with context.
     */
    fun logResourceOperation(
        resourceUri: String,
        operation: String,
        correlationId: String = generateCorrelationId(),
        block: () -> Any?
    ) {
        MDC.put("correlationId", correlationId)
        MDC.put("operation", "resource_$operation")
        MDC.put("resource", resourceUri)
        
        try {
            logger.debug("Resource operation: {} on {}", operation, resourceUri)
            val startTime = System.currentTimeMillis()
            
            val result = block()
            
            val duration = System.currentTimeMillis() - startTime
            logger.info(
                "Resource operation completed - uri: {}, operation: {}, duration: {}ms, correlationId: {}",
                resourceUri, operation, duration, correlationId
            )
            
            // Record metrics
            MCPMetrics.instance.recordResourceServing(resourceUri, duration, true)
            
        } catch (e: Exception) {
            logger.error(
                "Resource operation failed - uri: {}, operation: {}, error: {}, correlationId: {}",
                resourceUri, operation, e.message, correlationId, e
            )
            MCPMetrics.instance.recordResourceServing(resourceUri, 0, false)
            throw e
        } finally {
            MDC.clear()
        }
    }
    
    /**
     * Log a protocol message with context.
     */
    fun logProtocolMessage(
        messageType: String,
        method: String?,
        correlationId: String = generateCorrelationId(),
        direction: MessageDirection = MessageDirection.INBOUND
    ) {
        MDC.put("correlationId", correlationId)
        MDC.put("messageType", messageType)
        MDC.put("method", method ?: "unknown")
        MDC.put("direction", direction.name)
        
        try {
            logger.debug(
                "{} protocol message - type: {}, method: {}, correlationId: {}",
                direction.name, messageType, method, correlationId
            )
            
            when (direction) {
                MessageDirection.INBOUND -> MCPMetrics.instance.recordMessageReceived()
                MessageDirection.OUTBOUND -> MCPMetrics.instance.recordMessageSent()
            }
        } finally {
            MDC.clear()
        }
    }
    
    /**
     * Log a connection event.
     */
    fun logConnectionEvent(
        event: ConnectionEvent,
        sessionId: String? = null,
        details: Map<String, Any?>? = null
    ) {
        MDC.put("event", event.name)
        sessionId?.let { MDC.put("sessionId", it) }
        
        try {
            when (event) {
                ConnectionEvent.CONNECTED -> {
                    logger.info("Client connected - sessionId: {}, details: {}", sessionId, details)
                    MCPMetrics.instance.recordConnection()
                }
                ConnectionEvent.DISCONNECTED -> {
                    logger.info("Client disconnected - sessionId: {}, details: {}", sessionId, details)
                    MCPMetrics.instance.recordDisconnection()
                }
                ConnectionEvent.ERROR -> {
                    logger.error("Connection error - sessionId: {}, details: {}", sessionId, details)
                    MCPMetrics.instance.recordConnectionError()
                }
            }
        } finally {
            MDC.clear()
        }
    }
    
    /**
     * Log with automatic timing.
     */
    inline fun <T> withTiming(
        operation: String,
        correlationId: String = generateCorrelationId(),
        crossinline block: () -> T
    ): T {
        MDC.put("correlationId", correlationId)
        MDC.put("operation", operation)
        
        return try {
            logger.debug("Starting operation: {}", operation)
            val startTime = System.currentTimeMillis()
            
            val result = block()
            
            val duration = System.currentTimeMillis() - startTime
            logger.info(
                "Operation completed - operation: {}, duration: {}ms, correlationId: {}",
                operation, duration, correlationId
            )
            
            result
        } catch (e: Exception) {
            logger.error(
                "Operation failed - operation: {}, error: {}, correlationId: {}",
                operation, e.message, correlationId, e
            )
            throw e
        } finally {
            MDC.clear()
        }
    }
    
    companion object {
        /**
         * Create a logger for a specific class.
         */
        fun forClass(clazz: Class<*>): MCPLogger {
            return MCPLogger(LoggerFactory.getLogger(clazz))
        }
        
        /**
         * Create a logger with a specific name.
         */
        fun forName(name: String): MCPLogger {
            return MCPLogger(LoggerFactory.getLogger(name))
        }
        
        /**
         * Generate a new correlation ID.
         */
        @JvmStatic
        fun generateCorrelationId(): String {
            return UUID.randomUUID().toString()
        }
    }
}

/**
 * Direction of message flow.
 */
enum class MessageDirection {
    INBOUND,
    OUTBOUND
}

/**
 * Connection lifecycle events.
 */
enum class ConnectionEvent {
    CONNECTED,
    DISCONNECTED,
    ERROR
}