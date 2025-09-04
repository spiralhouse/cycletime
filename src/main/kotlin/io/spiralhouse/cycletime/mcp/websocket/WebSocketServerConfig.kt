package io.spiralhouse.cycletime.mcp.websocket

import java.time.Duration

/**
 * Configuration for WebSocket server.
 * 
 * @property port The port to listen on (default: 3000)
 * @property enableSSL Whether to enable SSL/TLS (default: false)
 * @property sslKeyStore Path to the SSL keystore file
 * @property sslKeyStorePassword Password for the SSL keystore
 * @property connectionTimeout How long to keep idle connections alive
 * @property heartbeatInterval How often to send ping frames
 * @property pongTimeout How long to wait for pong responses
 * @property maxMessageSize Maximum message size in bytes
 * @property messageQueueSize Size of the message queue per connection
 */
data class WebSocketServerConfig(
    val port: Int = 3000,
    val enableSSL: Boolean = false,
    val sslKeyStore: String? = null,
    val sslKeyStorePassword: String? = null,
    val connectionTimeout: Duration = Duration.ofMinutes(30),
    val heartbeatInterval: Duration = Duration.ofSeconds(30),
    val pongTimeout: Duration = Duration.ofSeconds(10),
    val maxMessageSize: Int = 1024 * 1024, // 1MB
    val messageQueueSize: Int = 1000
)