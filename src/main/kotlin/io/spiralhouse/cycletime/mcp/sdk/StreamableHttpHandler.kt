package io.spiralhouse.cycletime.mcp.sdk

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.sse.*
import io.ktor.sse.*
import io.modelcontextprotocol.kotlin.sdk.server.Server
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.*
import org.slf4j.LoggerFactory
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * Streamable HTTP transport handler for MCP protocol.
 *
 * Implements MCP Specification 2025-06-18 Streamable HTTP transport with:
 * - Single endpoint for POST and GET requests
 * - Dual-mode responses (JSON or SSE based on Accept header)
 * - Session management via Mcp-Session-Id header
 * - Origin header validation (security)
 * - Protocol version header support (NEW in 2025-06-18)
 * - Batch request rejection (REMOVED in 2025-06-18)
 *
 * @property mcpServer MCP SDK Server instance
 * @property sessionManager Session manager for session handling
 * @property toolProviders List of tool providers for tools/list delegation (SPI-764)
 * @property resourceProviders List of resource providers for resources/list delegation (SPI-764)
 * @property config Configuration for handler behavior
 */
class StreamableHttpHandler(
    private val mcpServer: Server,
    private val sessionManager: SDKSessionManager,
    private val toolProviders: List<io.spiralhouse.cycletime.mcp.tools.ToolProvider> = emptyList(),
    private val resourceProviders: List<io.spiralhouse.cycletime.mcp.resources.ResourceProvider> = emptyList(),
    private val config: StreamableHttpConfig = StreamableHttpConfig()
) {
    companion object {
        private val logger = LoggerFactory.getLogger(StreamableHttpHandler::class.java)
        private val json = Json {
            prettyPrint = false
            ignoreUnknownKeys = true
        }

        // JSON-RPC and MCP protocol constants
        private const val JSONRPC_VERSION = "2.0"
        private const val METHOD_TOOLS_LIST = "tools/list"
        private const val METHOD_RESOURCES_LIST = "resources/list"
        private const val METHOD_INITIALIZE = "initialize"
        private const val METHOD_TOOLS_CALL = "tools/call"
        private const val PROTOCOL_VERSION_CURRENT = "2025-06-18"
        private const val ERROR_CODE_METHOD_NOT_FOUND = -32601
    }

    // Store for SSE channels by session ID
    // Thread-safe concurrent map for multi-threaded Ktor request handling
    private val sseChannels = ConcurrentHashMap<String, Channel<ServerSentEvent>>()

    // In-memory session tracking for request lifecycle
    // Thread-safe concurrent set for multi-threaded Ktor request handling
    // In production, this would be backed by database
    private val activeSessions = ConcurrentHashMap.newKeySet<String>()

    // Cached tool and resource lists (built once at initialization)
    // Tools and resources don't change during server lifetime, so we cache them
    // Eagerly initialized to avoid lazy evaluation blocking on first request
    private val cachedTools: List<JsonObject>
    private val cachedResources: List<JsonObject>

    init {
        logger.debug("Initializing StreamableHttpHandler caches...")

        // Initialize tools cache (synchronous)
        cachedTools = collectToolsFromProviders().also { tools ->
            logger.info("Cached ${tools.size} tools from ${toolProviders.size} providers")
        }

        // Initialize resources cache (requires runBlocking for suspend function)
        // This happens at startup, not on first request, avoiding event loop blocking
        cachedResources = runBlocking {
            collectResourcesFromProviders().also { resources ->
                logger.info("Cached ${resources.size} resources from ${resourceProviders.size} providers")
            }
        }

        logger.info("StreamableHttpHandler initialized: ${cachedTools.size} tools, ${cachedResources.size} resources")
    }

    /**
     * Collect all tools from registered tool providers.
     * Includes error handling per provider to prevent single provider failure from breaking entire list.
     */
    private fun collectToolsFromProviders(): List<JsonObject> {
        return toolProviders.flatMap { provider ->
            try {
                logger.debug("Collecting tools from provider: ${provider.namespace}")
                val tools = (provider.getTools() + provider.getAsyncTools()).map { tool ->
                    buildJsonObject {
                        put("name", "${provider.namespace}_${tool.name}")
                        put("description", tool.description)
                        put("inputSchema", tool.parametersSchema)
                    }
                }
                logger.debug("Collected ${tools.size} tools from provider: ${provider.namespace}")
                tools
            } catch (e: Exception) {
                logger.error("Failed to collect tools from provider: ${provider.namespace}", e)
                emptyList()
            }
        }
    }

    /**
     * Collect all resources from registered resource providers.
     * Includes error handling per provider to prevent single provider failure from breaking entire list.
     * Note: This is a suspend function because ResourceProvider.listResources() is suspend.
     */
    private suspend fun collectResourcesFromProviders(): List<JsonObject> {
        return resourceProviders.flatMap { provider ->
            try {
                logger.debug("Collecting resources from provider: ${provider.name}")
                val resources = provider.listResources().map { resource ->
                    buildJsonObject {
                        put("uri", resource.uri)
                        put("name", resource.name)
                        put("description", resource.description ?: "")
                        if (resource.mimeType != null) {
                            put("mimeType", resource.mimeType)
                        }
                    }
                }
                logger.debug("Collected ${resources.size} resources from provider: ${provider.name}")
                resources
            } catch (e: Exception) {
                logger.error("Failed to collect resources from provider: ${provider.name}", e)
                emptyList()
            }
        }
    }

    /**
     * Build a JSON-RPC success response with result.
     */
    private fun buildSuccessResponse(id: JsonElement?, result: JsonObject): JsonObject {
        return buildJsonObject {
            put("jsonrpc", JSONRPC_VERSION)
            if (id != null) put("id", id)
            put("result", result)
        }
    }

    /**
     * Build a JSON-RPC error response.
     */
    private fun buildErrorResponse(id: JsonElement?, code: Int, message: String): JsonObject {
        return buildJsonObject {
            put("jsonrpc", JSONRPC_VERSION)
            if (id != null) put("id", id)
            put("error", buildJsonObject {
                put("code", code)
                put("message", message)
            })
        }
    }

    /**
     * Build tools/list response using cached tools.
     */
    private fun buildToolsListResponse(id: JsonElement?): JsonObject {
        return buildSuccessResponse(id, buildJsonObject {
            put("tools", JsonArray(cachedTools))
        })
    }

    /**
     * Build resources/list response using cached resources.
     */
    private fun buildResourcesListResponse(id: JsonElement?): JsonObject {
        return buildSuccessResponse(id, buildJsonObject {
            put("resources", JsonArray(cachedResources))
        })
    }

    /**
     * Build initialize response with server capabilities.
     */
    private fun buildInitializeResponse(id: JsonElement?): JsonObject {
        return buildSuccessResponse(id, buildJsonObject {
            put("protocolVersion", PROTOCOL_VERSION_CURRENT)
            put("serverInfo", buildJsonObject {
                put("name", "cycletime-ce")
                put("version", "1.0.0")
            })
            put("capabilities", buildJsonObject {
                put("tools", buildJsonObject {
                    put("listChanged", true)
                })
                put("resources", buildJsonObject {
                    put("subscribe", true)
                    put("listChanged", true)
                })
            })
        })
    }

    /**
     * Build tools/call response (placeholder implementation).
     */
    private fun buildToolsCallResponse(id: JsonElement?): JsonObject {
        return buildSuccessResponse(id, buildJsonObject {
            put("content", buildJsonArray {
                add(buildJsonObject {
                    put("type", "text")
                    put("text", "Tool executed successfully")
                })
            })
        })
    }

    /**
     * Handle POST requests to /mcp endpoint.
     *
     * MCP Spec 2025-06-18 Requirements:
     * - Validate MCP-Protocol-Version header (NEW)
     * - Reject batch requests (REMOVED feature)
     * - Parse Accept header for response type
     * - Validate Origin header (security)
     * - Process JSON-RPC request through MCP SDK
     * - Return JSON or SSE response based on content negotiation
     */
    suspend fun handlePost(call: ApplicationCall) {
        val startTime = System.currentTimeMillis()

        try {
            // 1. Security: Validate Origin header
            validateOrigin(call.request.header("Origin"))

            // 2. Protocol Version: Validate MCP-Protocol-Version header (NEW in 2025-06-18)
            val protocolVersion = call.request.header("MCP-Protocol-Version")
            validateProtocolVersion(protocolVersion)

            // 3. Content Negotiation: Parse Accept header
            val acceptHeader = call.request.accept() ?: "application/json"
            logger.debug("Accept header: $acceptHeader")

            // 4. Request Processing: Parse JSON-RPC message
            val requestBody = call.receiveText()
            logger.debug("Received request body: ${requestBody.take(200)}")

            val jsonRpcRequest = try {
                json.parseToJsonElement(requestBody)
            } catch (e: Exception) {
                logger.warn("Failed to parse JSON request: ${e.message}")
                return call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid JSON"))
            }

            // 5. Batch Request Validation: Reject batch requests (removed in 2025-06-18)
            if (jsonRpcRequest is JsonArray) {
                logger.warn("Batch request rejected (removed in MCP 2025-06-18)")
                return call.respond(HttpStatusCode.BadRequest, mapOf(
                    "error" to "Batch requests are not supported in MCP protocol version 2025-06-18"
                ))
            }

            // Validate JSON-RPC structure
            val jsonRpcObject = jsonRpcRequest.jsonObject
            if (!jsonRpcObject.containsKey("jsonrpc") || !jsonRpcObject.containsKey("method")) {
                logger.warn("Invalid JSON-RPC request: missing required fields")
                return call.respond(HttpStatusCode.BadRequest, mapOf(
                    "error" to "Invalid JSON-RPC request: missing required fields"
                ))
            }

            val method = jsonRpcObject["method"]?.jsonPrimitive?.content
            logger.debug("Received JSON-RPC request: $method")

            // 6. Session Management: Extract, validate, or generate session ID
            var sessionId = call.request.header("Mcp-Session-Id")

            if (sessionId != null) {
                // Session ID provided - validate it exists (except for initialize)
                if (method != "initialize") {
                    if (!activeSessions.contains(sessionId)) {
                        logger.warn("Invalid or expired session: $sessionId")
                        return call.respond(HttpStatusCode.NotFound, mapOf("error" to "Session not found"))
                    }
                    logger.debug("Using existing session ID: $sessionId")
                } else {
                    // For initialize, always accept and track the session
                    activeSessions.add(sessionId)
                    logger.debug("Registered existing session ID from initialize: $sessionId")
                }
            } else {
                // No session ID provided - generate and track new one
                sessionId = UUID.randomUUID().toString()
                activeSessions.add(sessionId)
                logger.info("Generated and registered new session ID: $sessionId (method: $method)")
            }

            // 7. Business Logic: Process through MCP SDK
            val response = try {
                processRequest(jsonRpcRequest, sessionId, method)
            } catch (e: Exception) {
                logger.error("Request processing failed: ${e.message}", e)
                return call.respond(HttpStatusCode.InternalServerError, mapOf(
                    "error" to "Internal server error"
                ))
            }

            // 8. Response Strategy: Determine based on Accept header
            val responseStrategy = determineResponseStrategy(acceptHeader)

            when (responseStrategy) {
                ResponseStrategy.JSON_ONLY -> respondWithJSON(call, response, sessionId, protocolVersion)
                ResponseStrategy.SSE_STREAM -> respondWithSSE(call, response, sessionId, protocolVersion)
            }

            val duration = System.currentTimeMillis() - startTime
            logger.debug("POST request processed in ${duration}ms (strategy: $responseStrategy)")

        } catch (e: InvalidOriginException) {
            logger.warn("Origin validation failed: ${e.message}")
            call.respond(HttpStatusCode.Forbidden, mapOf("error" to "Invalid origin"))
        } catch (e: UnsupportedProtocolVersionException) {
            logger.warn("Protocol version validation failed: ${e.message}")
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to e.message))
        } catch (e: UnsupportedContentTypeException) {
            logger.warn("Unsupported Accept header: ${e.message}")
            call.respond(HttpStatusCode.NotAcceptable, mapOf("error" to "Unsupported content type"))
        } catch (e: Exception) {
            logger.error("POST request failed", e)
            call.respond(HttpStatusCode.InternalServerError, mapOf("error" to "Internal server error"))
        }
    }

    /**
     * Handle GET requests to /mcp endpoint.
     * Opens SSE stream for server-initiated messages.
     */
    suspend fun handleGet(call: ApplicationCall) {
        try {
            // 1. Security: Validate Origin header
            validateOrigin(call.request.header("Origin"))

            // 2. Session Validation: Require session ID
            val sessionId = call.request.header("Mcp-Session-Id")
            if (sessionId == null) {
                logger.warn("GET request missing Mcp-Session-Id header")
                return call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Mcp-Session-Id required"))
            }

            logger.info("Opening SSE stream for session: $sessionId")

            // 3. Open SSE stream - use Ktor's SSE support
            // Note: This is a simplified implementation
            // In production, would integrate with server-initiated message queue
            call.response.header("Content-Type", "text/event-stream")
            call.response.header("Cache-Control", "no-cache")
            call.response.header("Connection", "keep-alive")

            // For now, just return OK to indicate stream is ready
            // Actual streaming would be handled by Ktor SSE route
            call.respond(HttpStatusCode.OK)
        } catch (e: InvalidOriginException) {
            logger.warn("Origin validation failed: ${e.message}")
            call.respond(HttpStatusCode.Forbidden)
        } catch (e: Exception) {
            logger.error("GET request failed", e)
            call.respond(HttpStatusCode.InternalServerError)
        }
    }

    /**
     * Validate MCP-Protocol-Version header.
     * NEW in MCP Spec 2025-06-18.
     */
    private fun validateProtocolVersion(version: String?) {
        when (version) {
            "2025-06-18" -> { /* Current version - OK */ }
            "2025-03-26" -> logger.debug("Legacy protocol version 2025-03-26 detected, accepting for backward compatibility")
            null -> logger.debug("Missing MCP-Protocol-Version header, defaulting to legacy behavior")
            else -> throw UnsupportedProtocolVersionException("Unsupported protocol version: $version")
        }
    }

    /**
     * Validate Origin header against whitelist.
     * CRITICAL: Prevents DNS rebinding attacks.
     */
    private fun validateOrigin(origin: String?) {
        if (config.validateOrigin && !isAllowedOrigin(origin)) {
            throw InvalidOriginException("Origin not allowed: $origin")
        }
    }

    private fun isAllowedOrigin(origin: String?): Boolean {
        if (origin == null) return config.allowNullOrigin
        return config.allowedOrigins.any { allowed ->
            origin.matches(Regex(allowed))
        }
    }

    /**
     * Process JSON-RPC request through MCP SDK.
     *
     * SPI-764: Delegate to tool/resource providers for tools/list and resources/list.
     * Query providers directly to build MCP-compliant responses.
     *
     * Refactored to use helper methods for clarity and maintainability.
     */
    private suspend fun processRequest(
        jsonRpcRequest: JsonElement,
        sessionId: String?,
        method: String?
    ): JsonElement {
        val requestObj = jsonRpcRequest.jsonObject
        val id = requestObj["id"]

        logger.debug("Processing method: $method")

        // Delegate to appropriate handler based on method
        return when (method) {
            METHOD_TOOLS_LIST -> buildToolsListResponse(id)
            METHOD_RESOURCES_LIST -> buildResourcesListResponse(id)
            METHOD_INITIALIZE -> buildInitializeResponse(id)
            METHOD_TOOLS_CALL -> buildToolsCallResponse(id)
            else -> buildErrorResponse(id, ERROR_CODE_METHOD_NOT_FOUND, "Method not found: $method")
        }
    }

    /**
     * Determine response strategy based on Accept header.
     */
    private fun determineResponseStrategy(acceptHeader: String): ResponseStrategy {
        // Parse Accept header (simple implementation)
        val acceptTypes = acceptHeader.split(",").map { it.trim().split(";")[0].trim() }

        logger.debug("Parsed Accept types: $acceptTypes")

        // Check for supported types
        val supportsJson = acceptTypes.contains("application/json") || acceptTypes.contains("*/*")
        val supportsSSE = acceptTypes.contains("text/event-stream")

        return when {
            supportsSSE && !supportsJson -> ResponseStrategy.SSE_STREAM
            supportsJson || acceptTypes.contains("*/*") -> ResponseStrategy.JSON_ONLY
            else -> throw UnsupportedContentTypeException("Unsupported Accept types: $acceptHeader")
        }
    }

    /**
     * Respond with JSON-only response.
     */
    private suspend fun respondWithJSON(
        call: ApplicationCall,
        response: JsonElement,
        sessionId: String?,
        protocolVersion: String?
    ) {
        call.response.header("Content-Type", "application/json")
        call.response.header("MCP-Protocol-Version", protocolVersion ?: "2025-06-18")
        if (sessionId != null) {
            call.response.header("Mcp-Session-Id", sessionId)
        }
        call.respondText(response.toString(), ContentType.Application.Json)
    }

    /**
     * Respond with SSE stream.
     */
    private suspend fun respondWithSSE(
        call: ApplicationCall,
        response: JsonElement,
        sessionId: String?,
        protocolVersion: String?
    ) {
        call.response.header("MCP-Protocol-Version", protocolVersion ?: "2025-06-18")
        if (sessionId != null) {
            call.response.header("Mcp-Session-Id", sessionId)
        }

        // Respond with SSE format
        call.response.header("Content-Type", "text/event-stream")
        call.response.header("Cache-Control", "no-cache")

        // Format as SSE event
        val sseData = "data: ${response.toString()}\nid: ${UUID.randomUUID()}\n\n"
        call.respondText(sseData, ContentType.Text.EventStream)
    }
}

/**
 * Configuration for StreamableHttpHandler.
 */
data class StreamableHttpConfig(
    val validateOrigin: Boolean = true,
    val allowNullOrigin: Boolean = true,  // For localhost development
    val allowedOrigins: List<String> = listOf(
        "http://localhost:.*",
        "https://.*\\.anthropic\\.com"
    )
)

/**
 * Response strategy enum.
 */
enum class ResponseStrategy {
    JSON_ONLY,
    SSE_STREAM
}

/**
 * Custom exceptions.
 */
class InvalidOriginException(message: String) : Exception(message)
class UnsupportedProtocolVersionException(message: String) : Exception(message)
class UnsupportedContentTypeException(message: String) : Exception(message)
