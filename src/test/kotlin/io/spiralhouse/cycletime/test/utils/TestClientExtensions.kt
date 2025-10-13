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
 * Session Management:
 * - ThreadLocal storage ensures test isolation
 * - Session ID automatically captured during initialization
 * - Subsequent requests automatically include Mcp-Session-Id header
 * - Thread-safe for parallel test execution
 *
 * Usage Example:
 * ```kotlin
 * testSDKApplication {
 *     val client = createTestClient()
 *
 *     // Initialize MCP connection (captures session ID)
 *     client.mcpInitialize()
 *
 *     // Call a tool (session header automatically included)
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
 * Low-level method for sending pre-constructed JSON-RPC requests.
 * Automatically includes Mcp-Session-Id header if a session is active.
 *
 * @param request JSON-RPC request as string
 * @param endpoint MCP endpoint path (default: "/mcp")
 * @param sessionId Optional explicit session ID (overrides ThreadLocal session)
 * @return HTTP response
 */
suspend fun HttpClient.sendMCPRequest(
    request: String,
    endpoint: String = "/mcp",
    sessionId: String? = getCurrentSessionId()
): HttpResponse {
    return post(endpoint) {
        header(HttpHeaders.ContentType, ContentType.Application.Json.toString())

        // Automatically include session header if available
        if (sessionId != null) {
            header("Mcp-Session-Id", sessionId)
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
 * Session Management:
 * - Generates unique session ID (UUID)
 * - Includes Mcp-Session-Id header in initialize request
 * - Stores session ID in ThreadLocal for subsequent requests
 * - Thread-safe for parallel test execution
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

    val request = MCPRequestBuilders.buildInitializeRequest(
        protocolVersion = protocolVersion,
        clientName = clientName,
        clientVersion = clientVersion
    )

    // Send initialize request with session header
    return sendMCPRequest(request, sessionId = sessionId)
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
    val request = MCPRequestBuilders.buildToolsListRequest()
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
    val request = MCPRequestBuilders.buildResourcesListRequest()
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
    val request = MCPRequestBuilders.buildResourceSubscribeRequest(uri)
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
