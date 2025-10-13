package io.spiralhouse.cycletime.mcp.sdk.adapters

import io.modelcontextprotocol.kotlin.sdk.CallToolRequest
import io.modelcontextprotocol.kotlin.sdk.CallToolResult
import io.modelcontextprotocol.kotlin.sdk.TextContent
import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.spiralhouse.cycletime.mcp.sdk.SDKSessionManager
import io.spiralhouse.cycletime.mcp.sdk.SessionContext
import io.spiralhouse.cycletime.mcp.tools.Tool
import io.spiralhouse.cycletime.mcp.tools.ToolHandler
import io.spiralhouse.cycletime.mcp.tools.ToolProvider
import kotlinx.serialization.json.*
import org.slf4j.LoggerFactory

/**
 * Adapter that bridges existing ToolProvider to SDK v0.7.2 registration API.
 *
 * This adapter implements the adapter pattern: it delegates to existing tool providers,
 * preserving 100% of business logic while adapting to SDK interfaces.
 *
 * Design Philosophy:
 * - Business logic in ToolProvider remains unchanged
 * - Adapter handles SDK-specific registration and request/response conversion
 * - Session context extraction delegated to BaseSDKAdapter
 * - Error handling delegated to BaseSDKAdapter (consistent patterns)
 * - All tool execution delegated to existing handlers
 *
 * @property toolProvider The existing tool provider with business logic
 * @property sessionManager Session manager for SDK session handling
 */
class SDKToolAdapter(
    private val toolProvider: ToolProvider,
    sessionManager: SDKSessionManager
) : BaseSDKAdapter(sessionManager) {

    companion object {
        /**
         * Cached empty JsonObject to avoid repeated allocation for tools with no arguments.
         * JsonObject is immutable, so sharing a single instance is safe.
         * Performance impact: Eliminates thousands of allocations on busy servers.
         */
        private val EMPTY_JSON_OBJECT = JsonObject(emptyMap())
    }

    /**
     * Register all tools from provider with SDK server.
     *
     * This method registers both sync and async tools with the SDK server,
     * adapting them to use the SDK's CallToolRequest/CallToolResult pattern.
     *
     * Performance Monitoring:
     * - Measures registration time (useful for production monitoring)
     * - Logs individual tool names (detailed debugging)
     * - Logs summary with timing and tool list (operational visibility)
     */
    suspend fun registerTools(server: Server) {
        // Get all tools (both sync and async)
        val tools = toolProvider.getTools() + toolProvider.getAsyncTools()
        val startTime = System.currentTimeMillis()

        tools.forEach { tool ->
            val toolName = "${toolProvider.namespace}_${tool.name}"
            registerTool(server, tool)
            logger.debug("Registered tool: $toolName")
        }

        val elapsedMs = System.currentTimeMillis() - startTime
        val toolNames = tools.joinToString(", ") { it.name }
        logger.info(
            "Registered ${tools.size} tools from provider '${toolProvider.namespace}' " +
            "in ${elapsedMs}ms (tools: $toolNames)"
        )
    }

    /**
     * Register individual tool with SDK server.
     *
     * Adapts existing tool to SDK registration API:
     * - Converts tool name (namespace_toolName format)
     * - Converts parameter schema to SDK JsonObject format
     * - Wraps handler to accept CallToolRequest and return CallToolResult
     */
    private suspend fun registerTool(server: Server, tool: Tool) {
        // Tool name format: {namespace}_{tool_name}
        val toolName = "${toolProvider.namespace}_${tool.name}"

        // Note: SDK expects Tool.Input format but we have JsonObject schema
        // For now, register without schema validation - SDK will handle basic validation
        server.addTool(
            name = toolName,
            description = tool.description
        ) { request: CallToolRequest ->
            executeTool(tool, request)
        }

        logger.debug("Registered tool: $toolName (schema validation delegated to handler)")
    }

    /**
     * Execute tool via adapter (business logic unchanged).
     *
     * This method:
     * 1. Delegates session extraction and error handling to BaseSDKAdapter
     * 2. Converts SDK CallToolRequest to tool's expected JsonElement format
     * 3. Delegates to existing tool handler (business logic unchanged)
     * 4. Converts Result<JsonElement> to SDK CallToolResult
     *
     * Session handling:
     * - Session is optional for most tools (not all tools require session context)
     * - Session validation is delegated to business logic if needed
     * - Session extraction does not throw if missing (tools handle missing session appropriately)
     *
     * Error handling:
     * - Delegated to BaseSDKAdapter.executeWithErrorHandling
     * - Returns CallToolResult with error message in TextContent (not empty list)
     * - Provides actionable error details to MCP clients
     */
    private suspend fun executeTool(
        tool: Tool,
        request: CallToolRequest
    ): CallToolResult {
        return executeWithErrorHandling(
            operationName = "Tool execution",
            resourceIdentifier = tool.name,
            meta = request._meta,
            errorResultFactory = { errorMessage ->
                // Return error result with actual error message (improves debugging)
                CallToolResult(
                    content = listOf(TextContent(text = errorMessage)),
                    isError = true
                )
            }
        ) { sessionId ->
            // Execute business logic (unchanged)

            // Convert SDK request arguments to JsonElement for tool handler
            val toolParams = convertToToolParams(request.arguments)

            // Execute tool handler (business logic unchanged)
            val result = when (tool.handler) {
                is ToolHandler.Sync -> {
                    // Execute synchronous handler
                    tool.handler.handler(toolParams)
                }
                is ToolHandler.Async -> {
                    // Execute asynchronous handler
                    tool.handler.handler(toolParams)
                }
            }

            // Convert Result<JsonElement> to SDK CallToolResult
            convertToCallToolResult(result)
        }
    }

    /**
     * Convert SDK request arguments to JsonElement format expected by tool handlers.
     *
     * The existing tool handlers expect parameters as JsonElement (typically JsonObject).
     * SDK provides arguments as Map<String, JsonElement>, so we convert it to JsonObject.
     *
     * Performance Optimization:
     * - Returns cached EMPTY_JSON_OBJECT for null/empty arguments (eliminates allocation)
     * - Creates new JsonObject only when arguments are provided (ensures safety)
     */
    private fun convertToToolParams(arguments: Map<String, JsonElement>?): JsonObject {
        return if (arguments.isNullOrEmpty()) {
            EMPTY_JSON_OBJECT
        } else {
            JsonObject(arguments)
        }
    }

    /**
     * Convert Result<JsonElement> from tool handler to SDK CallToolResult.
     *
     * Success case:
     * - Extract JSON content from result
     * - Wrap in SDK TextContent
     * - Return success CallToolResult
     *
     * Failure case:
     * - Extract error message from throwable
     * - Return error CallToolResult with error message in TextContent
     * - Provides actionable error details to MCP clients
     */
    private fun convertToCallToolResult(result: Result<JsonElement>): CallToolResult {
        return result.fold(
            onSuccess = { jsonElement ->
                // Success - convert to SDK text content
                val textContent = jsonElement.toString()
                CallToolResult(
                    content = listOf(
                        TextContent(
                            text = textContent
                        )
                    ),
                    isError = false
                )
            },
            onFailure = { throwable ->
                // Failure - return error result with actual error message
                val errorMessage = throwable.message ?: "Unknown error"
                logger.warn("Tool handler returned error: $errorMessage")
                CallToolResult(
                    content = listOf(
                        TextContent(
                            text = "Tool handler error: $errorMessage"
                        )
                    ),
                    isError = true
                )
            }
        )
    }
}
