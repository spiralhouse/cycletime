package io.spiralhouse.cycletime.mcp.websocket

import java.time.Duration

/**
 * Configuration for WebSocket server.
 * 
 * @property port The port to listen on (default: 3000)
 * @property host The host to bind to (default: "0.0.0.0")
 * @property path The WebSocket path (default: "/ws")
 * @property enableSsl Whether to enable SSL/TLS (default: false)
 * @property sslKeyStore Path to the SSL keystore file
 * @property sslKeyStorePassword Password for the SSL keystore
 * @property connectionTimeout How long to keep idle connections alive
 * @property heartbeatInterval How often to send ping frames
 * @property pongTimeout How long to wait for pong responses
 * @property maxMessageSize Maximum message size in bytes
 * @property messageQueueSize Size of the message queue per connection
 * @property pingPeriod Ping period in milliseconds
 * @property timeout Connection timeout in milliseconds
 * @property maxFrameSize Maximum frame size in bytes
 * @property masking Whether to enable masking
 * @property embeddedMode Whether to run as embedded server (true) or integrated with existing Ktor app (false)
 */
data class WebSocketServerConfig(
    val port: Int = 3000,
    val host: String = "0.0.0.0",
    val path: String = "/ws",
    val enableSsl: Boolean = false,
    val sslKeyStore: String? = null,
    val sslKeyStorePassword: String? = null,
    val connectionTimeout: Duration = Duration.ofMinutes(30),
    val heartbeatInterval: Duration = Duration.ofSeconds(30),
    val pongTimeout: Duration = Duration.ofSeconds(10),
    val maxMessageSize: Int = 1024 * 1024, // 1MB
    val messageQueueSize: Int = 1000,
    val pingPeriod: Long = 30000L,
    val timeout: Long = 60000L,
    val maxFrameSize: Long = 1024 * 1024L,
    val masking: Boolean = false,
    val embeddedMode: Boolean = true // Default to embedded for backward compatibility
)