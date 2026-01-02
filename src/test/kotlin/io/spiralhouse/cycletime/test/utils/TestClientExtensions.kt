package io.spiralhouse.cycletime.test.utils

import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.serialization.json.*
import java.util.UUID

/**
 * Extension functions for HttpClient to simplify MCP protocol testing.
 *
 * These extensions wrap common MCP operations in type-safe, fluent APIs,
 * eliminating boilerplate and improving test readability.
 *
 * Design Philosophy:
 * - Fluent API (chain operations naturally)
 * - Type safety (Kotlin types over raw strings)
 * - Clear intent (method names match MCP operations)
 * - Minimal boilerplate (hide HTTP details)
 * - Automatic session management (capture and include session IDs)
 *
 * Session Management (SDK v0.7.2):
 * - ThreadLocal storage ensures test isolation
 * - Session ID automatically captured during initialization
 * - Subsequent requests automatically include sessionId query parameter
 * - Thread-safe for parallel test execution
 *
 * SDK v0.7.2 Workaround:
 * - Endpoints registered at root path "/" (not "/mcp")
 * - Session passed as query parameter (not Mcp-Session-Id header)
 * - Once PR #314 is merged, this will use proper routing and headers
 *
 * Usage Example:
 * ```kotlin
 * testSDKApplication {
 *     val client = createTestClient()
 *
 *     // Initialize MCP connection (captures session ID)
 *     client.mcpInitialize()
 *
 *     // Call a tool (sessionId query parameter automatically included)
 *     val response = client.callMCPTool(
 *         "session_create",
 *         mapOf("projectId" to "TEST-123")
 *     )
 * }
 * ```
 */

/**
 * Thread-local session state for test isolation.
 *
 * Each test thread maintains its own session ID, ensuring:
 * - Tests don't interfere with each other
 * - Parallel test execution is safe
 * - No shared mutable state between tests
 */
private val testSessionState = ThreadLocal<String?>()

/**
 * Get current test session ID from ThreadLocal storage.
 */
private fun getCurrentSessionId(): String? = testSessionState.get()

/**
 * Set current test session ID in ThreadLocal storage.
 */
private fun setCurrentSessionId(sessionId: String?) {
    testSessionState.set(sessionId)
}

/**
 * Clear current test session ID from ThreadLocal storage.
 * Should be called in test cleanup to prevent memory leaks.
 */
fun clearTestSession() {
    testSessionState.remove()
}

/**
 * Send raw MCP request to SDK endpoint with automatic session management.
 *
 * SDK v0.7.2 CRITICAL: The SDK requires sessionId in BOTH locations:
 * 1. HTTP query parameter (for SDK middleware/routing)
 * 2. JSON-RPC _meta field (for application logic to extract)
 *
 * The request builders include sessionId in the _meta field at the top level.
 * This function adds the sessionId as a query parameter for SDK middleware.
 *
 * SDK v0.7.2 BEHAVIOR: Testing SDK endpoint path.
 * The SDK requires sessionId as a query parameter for all requests (including initialize).
 *
 * Reference: https://github.com/modelcontextprotocol/kotlin-sdk
 *
 * @param request JSON-RPC request as string (sessionId in _meta field)
 * @param endpoint MCP endpoint path (default: "/mcp" - Streamable HTTP transport path)
 * @param sessionId Optional explicit session ID for query parameter
 * @return HTTP response
 */
suspend fun HttpClient.sendMCPRequest(
    request: String,
    endpoint: String = "/mcp",  // Streamable HTTP transport at /mcp (SPI-763)
    sessionId: String? = getCurrentSessionId()
): HttpResponse {
    return post(endpoint) {
        header(HttpHeaders.ContentType, ContentType.Application.Json.toString())

        // SDK v0.7.2 expects sessionId as query parameter for middleware/routing
        if (sessionId != null) {
            url {
                parameters.append("sessionId", sessionId)
            }
        }

        setBody(request)
    }
}

/**
 * Initialize MCP connection with automatic session management.
 *
 * Sends the initialize request, which is required as the first call
 * in every MCP session. Automatically generates and stores a session ID
 * for use in subsequent requests.
 *
 * Session Management (SDK v0.7.2):
 * - Generates unique session ID (UUID)
 * - Includes sessionId in BOTH JSON-RPC _meta field AND query parameter
 * - Stores session ID in ThreadLocal for subsequent requests
 * - Thread-safe for parallel test execution
 *
 * CRITICAL: SDK v0.7.2 requires sessionId in both locations:
 * 1. HTTP query parameter (for SDK middleware validation)
 * 2. JSON-RPC _meta field (for application logic extraction)
 *
 * @param protocolVersion MCP protocol version (default: "2024-11-05")
 * @param clientName Client name (default: "test-client")
 * @param clientVersion Client version (default: "1.0.0")
 * @param sessionId Optional explicit session ID (default: generates new UUID)
 * @return HTTP response containing server info and capabilities
 */
suspend fun HttpClient.mcpInitialize(
    protocolVersion: String = "2024-11-05",
    clientName: String = "test-client",
    clientVersion: String = "1.0.0",
    sessionId: String = UUID.randomUUID().toString()
): HttpResponse {
    // Store session ID for subsequent requests
    setCurrentSessionId(sessionId)

    // Build initialize request with sessionId in _meta field
    val request = MCPRequestBuilders.buildInitializeRequest(
        protocolVersion = protocolVersion,
        clientName = clientName,
        clientVersion = clientVersion,
        sessionId = sessionId
    )

    // CRITICAL FIX: Do NOT send sessionId query parameter on initialize request!
    // Initialize is the FIRST request that establishes the session.
    // The SDK returns 404 if you pass a sessionId that doesn't exist yet.
    return sendMCPRequest(request, sessionId = null)
}

/**
 * Create a test session in the database via session_create tool.
 *
 * This helper creates a valid session that can be used for subsequent MCP operations
 * that require session context. The session is created using the session_create tool
 * and the sessionId is extracted from the response.
 *
 * Usage:
 * ```kotlin
 * test ClientExtensions {
 *     val client = createTestClient()
 *     client.mcpInitialize()
 *
 *     // Create a session for testing
 *     val sessionId = client.createTestSession(projectId = "TEST-PROJECT-1")
 *
 *     // Use the session for subsequent requests
 *     val response = client.callMCPTool("session_get", sessionId = sessionId)
 * }
 * ```
 *
 * @param projectId Project ID to associate with the session (default: "TEST-PROJECT-1")
 * @return The created session ID
 * @throws AssertionError if session creation fails
 */
suspend fun HttpClient.createTestSession(
    projectId: String = "TEST-PROJECT-1"
): String {
    // Create session using session_create tool
    val response = callMCPTool(
        "session_create",
        mapOf("projectId" to projectId)
    )

    // Verify response is successful
    if (!response.isMCPSuccess()) {
        throw AssertionError("Failed to create test session: ${response.bodyAsText()}")
    }

    // Extract session ID from tool response
    val result = response.extractMCPResult()
    val contentArray = result.jsonObject["content"]?.jsonArray
        ?: throw AssertionError("Response missing content array")

    val textContent = contentArray[0].jsonObject["text"]?.jsonPrimitive?.content
        ?: throw AssertionError("Response missing text content")

    val sessionData = Json.parseToJsonElement(textContent).jsonObject
    val sessionId = sessionData["id"]?.jsonPrimitive?.content
        ?: throw AssertionError("Response missing session ID")

    // Store session ID for subsequent requests
    setCurrentSessionId(sessionId)

    return sessionId
}

/**
 * List available MCP tools.
 *
 * Discovers all tools registered with the MCP server. Typically called
 * after initialization to understand server capabilities.
 *
 * @return HTTP response containing tool list
 */
suspend fun HttpClient.listMCPTools(): HttpResponse {
    val sessionId = getCurrentSessionId()
    val request = MCPRequestBuilders.buildToolsListRequest(sessionId = sessionId)
    return sendMCPRequest(request)
}

/**
 * Call MCP tool with arguments.
 *
 * Invokes a specific tool by name with provided arguments. Tool names
 * should be namespaced (e.g., "session_create_session").
 *
 * @param toolName Namespaced tool name
 * @param arguments Tool arguments as key-value map
 * @param sessionId Optional session ID for session-aware tools
 * @return HTTP response containing tool result
 */
suspend fun HttpClient.callMCPTool(
    toolName: String,
    arguments: Map<String, Any> = emptyMap(),
    sessionId: String? = null
): HttpResponse {
    val request = MCPRequestBuilders.buildToolCallRequest(
        toolName = toolName,
        arguments = arguments,
        sessionId = sessionId
    )
    return sendMCPRequest(request)
}

/**
 * List available MCP resources.
 *
 * Discovers all resources registered with the MCP server. Resources
 * represent dynamic data sources (projects, issues, workflows, etc.).
 *
 * @return HTTP response containing resource list
 */
suspend fun HttpClient.listMCPResources(): HttpResponse {
    val sessionId = getCurrentSessionId()
    val request = MCPRequestBuilders.buildResourcesListRequest(sessionId = sessionId)
    return sendMCPRequest(request)
}

/**
 * Read MCP resource by URI.
 *
 * Fetches the current state of a resource identified by URI.
 * Resources use a URI scheme (e.g., "cycletime://projects").
 *
 * @param uri Resource URI
 * @param sessionId Optional session ID for session-scoped resources
 * @return HTTP response containing resource contents
 */
suspend fun HttpClient.readMCPResource(
    uri: String,
    sessionId: String? = null
): HttpResponse {
    val request = MCPRequestBuilders.buildResourceReadRequest(
        uri = uri,
        sessionId = sessionId
    )
    return sendMCPRequest(request)
}

/**
 * Subscribe to MCP resource updates.
 *
 * Subscribes to notifications when a resource changes. The server will
 * send notifications when subscribed resources are updated.
 *
 * @param uri Resource URI to subscribe to
 * @return HTTP response confirming subscription
 */
suspend fun HttpClient.subscribeMCPResource(
    uri: String
): HttpResponse {
    val sessionId = getCurrentSessionId()
    val request = MCPRequestBuilders.buildResourceSubscribeRequest(uri = uri, sessionId = sessionId)
    return sendMCPRequest(request)
}

/**
 * Extract JSON-RPC result from response.
 *
 * Parses HTTP response body as JSON-RPC response and extracts the result field.
 * Throws if response contains error instead of result.
 *
 * @return JsonElement containing the result
 * @throws AssertionError if response contains error
 */
suspend fun HttpResponse.extractMCPResult(): JsonElement {
    val body = bodyAsText()
    val json = Json.parseToJsonElement(body).jsonObject

    // Check for JSON-RPC error
    val error = json["error"]
    if (error != null) {
        throw AssertionError("MCP request failed: $error")
    }

    // Extract result
    return json["result"] ?: throw AssertionError("Response missing result field: $body")
}

/**
 * Extract JSON-RPC error from response.
 *
 * Parses HTTP response body as JSON-RPC response and extracts the error field.
 * Returns null if response contains result instead of error.
 *
 * @return JsonObject containing error details, or null if no error
 */
suspend fun HttpResponse.extractMCPError(): JsonObject? {
    val body = bodyAsText()
    val json = Json.parseToJsonElement(body).jsonObject
    return json["error"]?.jsonObject
}

/**
 * Check if MCP response indicates success.
 *
 * Verifies that response has:
 * - HTTP 200 OK status
 * - Valid JSON-RPC format
 * - Result field (not error)
 *
 * @return true if response is successful, false otherwise
 */
suspend fun HttpResponse.isMCPSuccess(): Boolean {
    if (status != HttpStatusCode.OK) {
        return false
    }

    return try {
        val body = bodyAsText()
        val json = Json.parseToJsonElement(body).jsonObject
        json.containsKey("result") && !json.containsKey("error")
    } catch (e: Exception) {
        false
    }
}
