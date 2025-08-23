package io.spiralhouse.jcvd.infrastructure.logging

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import java.io.PrintWriter
import java.io.StringWriter

/**
 * Utility for comprehensive exception logging with context.
 * Provides structured logging of exceptions with full stack traces and cause chains.
 */
object ExceptionLogger {
    private val logger: Logger = LoggerFactory.getLogger(ExceptionLogger::class.java)

    /**
     * Log an exception with full context including stack trace and cause chain
     */
    fun logException(
        contextLogger: Logger,
        exception: Throwable,
        message: String,
        context: Map<String, Any?> = emptyMap()
    ) {
        val exceptionDetails = buildExceptionDetails(exception)
        val contextString = if (context.isNotEmpty()) {
            context.entries.joinToString(", ") { "${it.key}=${it.value}" }
        } else {
            ""
        }

        // Log at ERROR level with full details
        contextLogger.error(
            buildString {
                append(message)
                if (contextString.isNotEmpty()) {
                    append(" | Context: [$contextString]")
                }
                append(" | Exception: ${exception.javaClass.simpleName}")
                append(" | Message: ${exception.message}")
                if (exception.cause != null) {
                    append(" | Root cause: ${exception.cause?.javaClass?.simpleName}: ${exception.cause?.message}")
                }
            }
        )

        // Log full stack trace at DEBUG level
        contextLogger.debug("Full exception details:\n$exceptionDetails")
    }

    /**
     * Build detailed exception information including full stack trace and cause chain
     */
    private fun buildExceptionDetails(exception: Throwable): String {
        val stringWriter = StringWriter()
        val printWriter = PrintWriter(stringWriter)
        
        exception.printStackTrace(printWriter)
        
        // Include cause chain
        var cause = exception.cause
        var depth = 0
        while (cause != null && depth < 10) { // Limit depth to prevent infinite loops
            printWriter.println("\nCause #${depth + 1}: ${cause.javaClass.name}: ${cause.message}")
            cause.printStackTrace(printWriter)
            cause = cause.cause
            depth++
        }
        
        return stringWriter.toString()
    }

    /**
     * Log exception with automatic context extraction
     */
    inline fun <reified T> T.logError(
        exception: Throwable,
        message: String,
        vararg contextPairs: Pair<String, Any?>
    ) {
        val logger = LoggerFactory.getLogger(T::class.java)
        logException(logger, exception, message, contextPairs.toMap())
    }

    /**
     * Safely execute a block and log any exceptions
     */
    inline fun <T> safeExecute(
        logger: Logger,
        operation: String,
        context: Map<String, Any?> = emptyMap(),
        block: () -> T
    ): T? {
        return try {
            block()
        } catch (e: Exception) {
            logException(logger, e, "Failed to execute: $operation", context)
            null
        }
    }
}