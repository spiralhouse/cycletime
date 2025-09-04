package io.spiralhouse.cycletime.mcp.websocket

/**
 * Exception thrown by WebSocket server operations.
 */
class WebSocketServerException(message: String, cause: Throwable? = null) : Exception(message, cause)