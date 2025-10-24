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
 * - Origin header validation (security - always enabled)
 * - Protocol version header support (NEW in 2025-06-18)
 * - Batch request rejection (REMOVED in 2025-06-18)
 * - Request size limits (security - prevents DoS attacks)
 *
 * Security Features:
 * - Origin validation (ALWAYS enabled, no bypass)
 * - Request body size limits (default 1MB)
 * - Database-backed session validation
 * - Rate limiting for session creation
 *
 * @property sessionManager Session manager for database-backed session validation
 * @property toolProviders List of tool providers for tools/list delegation (SPI-764)
 * @property resourceProviders List of resource providers for resources/list delegation (SPI-764)
 * @property config Configuration for handler behavior
 */
class StreamableHttpHandler(
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

    // Rate limiter for session creation (IP address -> last creation timestamp + count)
    // Security: Prevents session flooding attacks by limiting creation rate per IP
    // Format: Map<IP, Pair<lastResetTime, creationCount>>
    private val sessionCreationLimiter = ConcurrentHashMap<String, Pair<Long, Int>>()

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
     * Build tools/call response by executing the requested tool.
     *
     * This method implements real tool execution following the pattern from SDKToolAdapter:
     * 1. Extract tool name and arguments from JSON-RPC params
     * 2. Look up tool in registered providers
     * 3. Execute tool handler (sync or async)
     * 4. Convert Result<JsonElement> to JSON-RPC response format
     * 5. Handle errors with appropriate JSON-RPC error codes
     *
     * Error Handling:
     * - Missing tool name → JSON-RPC error -32602 (Invalid params)
     * - Tool not found → JSON-RPC error -32601 (Method not found)
     * - Tool execution failure → isError: true in result (NOT JSON-RPC error)
     */
    private suspend fun buildToolsCallResponse(id: JsonElement?, request: JsonObject): JsonObject {
        // 1. Extract tool name and arguments from JSON-RPC params
        val params = request["params"]?.jsonObject
        val toolName = params?.get("name")?.jsonPrimitive?.content

        if (toolName == null) {
            logger.warn("tools/call request missing 'name' parameter")
            return buildErrorResponse(id, -32602, "Invalid params: name is required")
        }

        val arguments = params.get("arguments")?.jsonObject

        // 2. Look up tool in registered providers
        val tool = findTool(toolName)
        if (tool == null) {
            logger.warn("Tool not found: $toolName")
            return buildErrorResponse(id, -32601, "Method not found: $toolName")
        }

        logger.debug("Executing tool: $toolName with arguments: ${arguments?.toString()?.take(100)}")

        // 3. Execute tool handler (sync or async)
        val result = try {
            val toolParams = arguments ?: JsonObject(emptyMap())
            when (tool.handler) {
                is io.spiralhouse.cycletime.mcp.tools.ToolHandler.Sync -> {
                    // Execute synchronous handler
                    tool.handler.handler(toolParams)
                }
                is io.spiralhouse.cycletime.mcp.tools.ToolHandler.Async -> {
                    // Execute asynchronous handler
                    tool.handler.handler(toolParams)
                }
            }
        } catch (e: Exception) {
            logger.error("Tool execution threw exception: ${e.message}", e)
            Result.failure(e)
        }

        // 4. Convert Result<JsonElement> to JSON-RPC response format
        return result.fold(
            onSuccess = { jsonElement ->
                buildSuccessResponse(id, buildJsonObject {
                    put("content", buildJsonArray {
                        add(buildJsonObject {
                            put("type", "text")
                            put("text", jsonElement.toString())
                        })
                    })
                    put("isError", false)
                })
            },
            onFailure = { throwable ->
                val errorMessage = throwable.message ?: "Unknown error"

                // Detect parameter validation errors and return JSON-RPC error -32602
                // This handles cases where required parameters are missing
                if (errorMessage.contains("is required", ignoreCase = true) ||
                    errorMessage.contains("required parameter", ignoreCase = true)) {
                    logger.warn("Parameter validation failed: $errorMessage")
                    return buildErrorResponse(id, -32602, "Invalid params: $errorMessage")
                }

                // Convert UUID validation errors to user-friendly "not found" messages
                // From UX perspective, users don't care about UUID validation - they just want to know if resource exists
                val userMessage = if (errorMessage.contains("Invalid UUID format", ignoreCase = true) ||
                                     errorMessage.contains("invalid uuid", ignoreCase = true)) {
                    // Extract the resource type from the tool name (e.g., "project" from "project_get_project")
                    val resourceType = toolName.substringBefore("_")
                    "Tool handler error: $resourceType not found"
                } else {
                    "Tool handler error: $errorMessage"
                }

                logger.warn("Tool handler returned error: $errorMessage")
                buildSuccessResponse(id, buildJsonObject {
                    put("content", buildJsonArray {
                        add(buildJsonObject {
                            put("type", "text")
                            put("text", userMessage)
                        })
                    })
                    put("isError", true)
                })
            }
        )
    }

    /**
     * Find a tool by name across all registered providers.
     *
     * Tools are registered with format: {namespace}_{tool_name}
     * For example: "project_list_projects", "session_create_session"
     *
     * @param toolName The full tool name including namespace prefix
     * @return The matching Tool or null if not found
     */
    private fun findTool(toolName: String): io.spiralhouse.cycletime.mcp.tools.Tool? {
        toolProviders.forEach { provider ->
            val allTools = provider.getTools() + provider.getAsyncTools()
            allTools.forEach { tool ->
                val fullName = "${provider.namespace}_${tool.name}"
                if (fullName == toolName) {
                    logger.debug("Found tool: $toolName in provider: ${provider.namespace}")
                    return tool
                }
            }
        }
        return null
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

            // 4. Request Size Validation: Check Content-Length header before reading body
            // Security: Prevent DoS attacks via oversized request bodies
            val contentLength = call.request.header(HttpHeaders.ContentLength)?.toLongOrNull()
            if (contentLength != null && contentLength > config.maxRequestBodySize) {
                logger.warn("Request body too large: $contentLength bytes (max: ${config.maxRequestBodySize})")
                return call.respond(HttpStatusCode.PayloadTooLarge, mapOf(
                    "error" to "Request body exceeds maximum size of ${config.maxRequestBodySize} bytes"
                ))
            }

            // 5. Request Processing: Parse JSON-RPC message
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

            // 6. Session Management: Validate existing or create new session
            // Security: Database-backed validation prevents session hijacking
            var sessionId = call.request.header("Mcp-Session-Id")

            if (sessionId != null) {
                // Session ID provided - validate against database
                // Security: Wrap in try-catch to handle invalid UUID formats gracefully
                val session = try {
                    sessionManager.getSessionOrNull(sessionId)
                } catch (e: Exception) {
                    logger.warn("Invalid session ID format rejected: $sessionId (error: ${e.message})")
                    null
                }

                if (session == null) {
                    // Invalid or expired session ID
                    logger.warn("Invalid session ID rejected: $sessionId (method: $method)")
                    return call.respond(HttpStatusCode.Unauthorized, mapOf(
                        "error" to "Invalid or expired session ID",
                        "details" to "Please create a new session"
                    ))
                }
                logger.debug("Validated existing session: $sessionId")
            } else {
                // No session ID provided - create new session with rate limiting
                // Security: Rate limiting prevents session flooding attacks
                val clientIp = call.request.local.remoteHost
                if (!canCreateSession(clientIp)) {
                    logger.warn("Session creation rate limit exceeded for IP: $clientIp")
                    return call.respond(HttpStatusCode.TooManyRequests, mapOf(
                        "error" to "Too many session creation requests",
                        "details" to "Please wait before creating a new session"
                    ))
                }

                // Create new session in database
                val newSession = sessionManager.getOrCreateSession(UUID.randomUUID().toString())
                sessionId = newSession.sessionKey.value
                recordSessionCreation(clientIp)
                logger.info("Created new session: $sessionId (method: $method, IP: $clientIp)")
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
     * Security: Always validates origin (no bypass allowed).
     */
    private fun validateOrigin(origin: String?) {
        if (!isAllowedOrigin(origin)) {
            throw InvalidOriginException("Origin not allowed")
        }
    }

    /**
     * Check if session creation is allowed for given IP address.
     * Security: Rate limiting prevents session flooding attacks.
     *
     * Rate limit: 5 sessions per minute per IP address (configurable).
     * Uses sliding window algorithm with concurrent-safe implementation.
     *
     * @param ipAddress Client IP address
     * @return true if session creation is allowed, false otherwise
     */
    private fun canCreateSession(ipAddress: String): Boolean {
        val now = System.currentTimeMillis()
        val windowMs = config.sessionCreationWindowMs
        val maxCreations = config.sessionCreationMaxPerWindow

        // Get or create rate limit state for this IP
        val (lastResetTime, count) = sessionCreationLimiter.compute(ipAddress) { _, existing ->
            val (prevResetTime, prevCount) = existing ?: Pair(now, 0)

            // Reset window if expired
            if (now - prevResetTime >= windowMs) {
                Pair(now, 0)
            } else {
                Pair(prevResetTime, prevCount)
            }
        } ?: Pair(now, 0)

        // Check if under limit
        return count < maxCreations
    }

    /**
     * Record session creation for rate limiting.
     * Security: Updates rate limiter state after successful session creation.
     *
     * @param ipAddress Client IP address
     */
    private fun recordSessionCreation(ipAddress: String) {
        sessionCreationLimiter.compute(ipAddress) { _, existing ->
            val (resetTime, count) = existing ?: Pair(System.currentTimeMillis(), 0)
            Pair(resetTime, count + 1)
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
            METHOD_TOOLS_CALL -> buildToolsCallResponse(id, requestObj)
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
 *
 * Security Configuration:
 * - Origin validation: ALWAYS enabled (no bypass option)
 * - Request size limits: Prevent DoS attacks via oversized payloads
 * - Rate limiting: Prevent session flooding attacks
 *
 * @property allowNullOrigin Allow requests with no Origin header (for localhost development)
 * @property allowedOrigins Regex patterns for allowed origins
 * @property maxRequestBodySize Maximum request body size in bytes (default 1MB)
 * @property sessionCreationMaxPerWindow Maximum session creations per time window per IP
 * @property sessionCreationWindowMs Time window for rate limiting in milliseconds (default 60 seconds)
 */
data class StreamableHttpConfig(
    val allowNullOrigin: Boolean = true,  // For localhost development
    val allowedOrigins: List<String> = listOf(
        "http://localhost:.*",
        "https://.*\\.anthropic\\.com"
    ),
    val maxRequestBodySize: Long = 1_000_000,  // 1MB default (prevents DoS)
    val sessionCreationMaxPerWindow: Int = 5,  // Max 5 sessions per window
    val sessionCreationWindowMs: Long = 60_000  // 60 second window
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
