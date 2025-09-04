package io.spiralhouse.cycletime.mcp.websocket

/**
 * Logger interface for WebSocket operations.
 */
interface WebSocketLogger {
    fun logError(message: String, throwable: Throwable?)
    fun logInfo(message: String)
    fun logDebug(message: String)
}

/**
 * Default implementation that logs to standard output.
 */
class DefaultWebSocketLogger : WebSocketLogger {
    override fun logError(message: String, throwable: Throwable?) {
        println("[ERROR] WebSocket: $message")
        throwable?.printStackTrace()
    }
    
    override fun logInfo(message: String) {
        println("[INFO] WebSocket: $message")
    }
    
    override fun logDebug(message: String) {
        println("[DEBUG] WebSocket: $message")
    }
}