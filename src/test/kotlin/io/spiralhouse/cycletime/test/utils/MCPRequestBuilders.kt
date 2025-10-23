package io.spiralhouse.cycletime.test.utils

import kotlinx.serialization.json.*

/**
 * Utility for building MCP protocol requests in tests.
 *
 * This object provides type-safe builders for constructing MCP JSON-RPC requests,
 * eliminating manual JSON string construction and reducing test boilerplate.
 *
 * Design Philosophy:
 * - Type-safe request construction (Kotlin types → JSON)
 * - Sensible defaults (minimize test verbosity)
 * - Clear intent (method names describe MCP operations)
 * - Testability (predictable JSON output)
 *
 * Usage Example:
 * ```kotlin
 * testSDKApplication {
 *     val response = client.sendMCPRequest(
 *         MCPRequestBuilders.buildInitializeRequest()
 *     )
 *     response.status shouldBe HttpStatusCode.OK
 * }
 * ```
 *
 * @see io.modelcontextprotocol.kotlin.sdk MCP SDK v0.7.2 protocol implementation
 */
object MCPRequestBuilders {

    /**
     * Build MCP initialize request.
     *
     * The initialize method is the first call in every MCP session, establishing
     * protocol version and client/server capabilities.
     *
     * @param id JSON-RPC request ID (default: 1)
     * @param protocolVersion MCP protocol version (default: "2024-11-05")
     * @param clientName Client application name (default: "test-client")
     * @param clientVersion Client version (default: "1.0.0")
     * @param capabilities Client capabilities (default: empty object)
     * @param sessionId Optional session ID for session management (included in _meta field)
     * @return JSON-RPC initialize request as string
     */
    fun buildInitializeRequest(
        id: Int = 1,
        protocolVersion: String = "2024-11-05",
        clientName: String = "test-client",
        clientVersion: String = "1.0.0",
        capabilities: JsonObject = JsonObject(emptyMap()),
        sessionId: String? = null  // Kept for backward compatibility but NOT used in initialize
    ): String = buildJsonObject {
        put("jsonrpc", "2.0")
        put("method", "initialize")
        putJsonObject("params") {
            put("protocolVersion", protocolVersion)
            put("capabilities", capabilities)
            putJsonObject("clientInfo") {
                put("name", clientName)
                put("version", clientVersion)
            }
        }
        put("id", id)

        // SPEC COMPLIANCE: MCP initialize request does NOT include _meta or sessionId!
        // Per MCP spec 2025-03-26, initialize contains only: jsonrpc, method, params, id
        // Sessions are managed by SDK internally after initialization completes.
    }.toString()

    /**
     * Build MCP tools/list request.
     *
     * Lists all available tools from the MCP server. This is typically called
     * after initialization to discover server capabilities.
     *
     * @param id JSON-RPC request ID (default: 1)
     * @param sessionId Optional session ID for session management (included in _meta field)
     * @return JSON-RPC tools/list request as string
     */
    fun buildToolsListRequest(
        id: Int = 1,
        sessionId: String? = null
    ): String = buildJsonObject {
        put("jsonrpc", "2.0")
        put("method", "tools/list")
        put("id", id)

        // Add _meta field at TOP LEVEL (SDK extracts sessionId from here)
        if (sessionId != null) {
            putJsonObject("_meta") {
                put("sessionId", sessionId)
            }
        }
    }.toString()

    /**
     * Build MCP tools/call request.
     *
     * Invokes a specific tool with provided arguments. Tool names should be
     * namespaced (e.g., "session_create_session" not "create_session").
     *
     * @param toolName Namespaced tool name (provider_toolname format)
     * @param arguments Tool arguments as key-value map
     * @param sessionId Optional session ID for session-aware tools
     * @param id JSON-RPC request ID (default: 1)
     * @return JSON-RPC tools/call request as string
     */
    fun buildToolCallRequest(
        toolName: String,
        arguments: Map<String, Any> = emptyMap(),
        sessionId: String? = null,
        id: Int = 1
    ): String = buildJsonObject {
        put("jsonrpc", "2.0")
        put("method", "tools/call")
        putJsonObject("params") {
            put("name", toolName)

            // Convert arguments map to JsonObject
            putJsonObject("arguments") {
                arguments.forEach { (key, value) ->
                    when (value) {
                        is String -> put(key, value)
                        is Int -> put(key, value)
                        is Boolean -> put(key, value)
                        is JsonElement -> put(key, value)
                        else -> put(key, value.toString())
                    }
                }
            }
        }
        put("id", id)

        // Add _meta field at TOP LEVEL (SDK extracts sessionId from here)
        if (sessionId != null) {
            putJsonObject("_meta") {
                put("sessionId", sessionId)
            }
        }
    }.toString()

    /**
     * Build MCP resources/list request.
     *
     * Lists all available resources from the MCP server. Resources represent
     * dynamic data sources (projects, issues, workflows, etc.).
     *
     * @param id JSON-RPC request ID (default: 1)
     * @param sessionId Optional session ID for session management (included in _meta field)
     * @return JSON-RPC resources/list request as string
     */
    fun buildResourcesListRequest(
        id: Int = 1,
        sessionId: String? = null
    ): String = buildJsonObject {
        put("jsonrpc", "2.0")
        put("method", "resources/list")
        put("id", id)

        // Add _meta field at TOP LEVEL (SDK extracts sessionId from here)
        if (sessionId != null) {
            putJsonObject("_meta") {
                put("sessionId", sessionId)
            }
        }
    }.toString()

    /**
     * Build MCP resources/read request.
     *
     * Reads a specific resource by URI. Resources use a URI scheme for addressing
     * (e.g., "cycletime://projects", "cycletime://issues/ISSUE-123").
     *
     * @param uri Resource URI to read
     * @param sessionId Session ID for session-scoped resources
     * @param id JSON-RPC request ID (default: 1)
     * @return JSON-RPC resources/read request as string
     */
    fun buildResourceReadRequest(
        uri: String,
        sessionId: String? = null,
        id: Int = 1
    ): String = buildJsonObject {
        put("jsonrpc", "2.0")
        put("method", "resources/read")
        putJsonObject("params") {
            put("uri", uri)
        }
        put("id", id)

        // Add _meta field at TOP LEVEL (SDK extracts sessionId from here)
        if (sessionId != null) {
            putJsonObject("_meta") {
                put("sessionId", sessionId)
            }
        }
    }.toString()

    /**
     * Build MCP resources/subscribe request.
     *
     * Subscribes to resource updates. The server will send notifications when
     * subscribed resources change.
     *
     * @param uri Resource URI to subscribe to
     * @param sessionId Optional session ID for session management (included in _meta field)
     * @param id JSON-RPC request ID (default: 1)
     * @return JSON-RPC resources/subscribe request as string
     */
    fun buildResourceSubscribeRequest(
        uri: String,
        sessionId: String? = null,
        id: Int = 1
    ): String = buildJsonObject {
        put("jsonrpc", "2.0")
        put("method", "resources/subscribe")
        putJsonObject("params") {
            put("uri", uri)
        }
        put("id", id)

        // Add _meta field at TOP LEVEL (SDK extracts sessionId from here)
        if (sessionId != null) {
            putJsonObject("_meta") {
                put("sessionId", sessionId)
            }
        }
    }.toString()

    /**
     * Build generic MCP notification (no response expected).
     *
     * Notifications are one-way messages from client to server or vice versa.
     * They don't include an ID field and don't expect a response.
     *
     * @param method Notification method name
     * @param params Notification parameters (optional)
     * @return JSON-RPC notification as string
     */
    fun buildNotification(
        method: String,
        params: JsonObject = JsonObject(emptyMap())
    ): String = buildJsonObject {
        put("jsonrpc", "2.0")
        put("method", method)
        if (params.isNotEmpty()) {
            put("params", params)
        }
    }.toString()

    /**
     * Build custom JSON-RPC request for edge case testing.
     *
     * Provides flexibility for testing non-standard scenarios, error handling,
     * or future protocol extensions.
     *
     * @param method JSON-RPC method name
     * @param params Request parameters (optional)
     * @param id JSON-RPC request ID (default: 1)
     * @return JSON-RPC request as string
     */
    fun buildCustomRequest(
        method: String,
        params: JsonObject = JsonObject(emptyMap()),
        id: Int = 1
    ): String = buildJsonObject {
        put("jsonrpc", "2.0")
        put("method", method)
        if (params.isNotEmpty()) {
            put("params", params)
        }
        put("id", id)
    }.toString()
}
