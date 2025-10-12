package io.spiralhouse.cycletime.unit.mocks

import io.modelcontextprotocol.kotlin.sdk.CallToolResult
import io.modelcontextprotocol.kotlin.sdk.ReadResourceResult
import io.modelcontextprotocol.kotlin.sdk.server.Server
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/**
 * Mock SDK tool executor for testing adapter integration.
 *
 * This utility provides helper methods for executing tools and reading resources
 * through the SDK Server in test environments. Used in RED phase to write tests
 * that will fail until GREEN phase implements the adapters.
 *
 * Design Philosophy:
 * - Simplify test setup and execution
 * - Provide clear assertions on SDK integration
 * - Support both success and error scenarios
 */
class MockSDKToolExecutor(
    private val server: Server
) {
    /**
     * Execute a tool via the SDK with simulated request parameters.
     *
     * This method will FAIL in RED phase because no tools are registered yet.
     * This is CORRECT and expected - the failure proves tests can detect missing functionality.
     *
     * @param toolName Name of the tool to execute (e.g., "create_session")
     * @param arguments Tool arguments as JsonObject
     * @param meta Optional metadata (e.g., sessionId)
     * @return CallToolResult (will throw exception in RED phase)
     */
    suspend fun executeTool(
        toolName: String,
        arguments: JsonObject = JsonObject(emptyMap()),
        meta: Map<String, JsonElement>? = null
    ): CallToolResult {
        // This will fail in RED phase - no tool execution implementation exists yet
        // The Developer agent (GREEN phase) will implement tool registration and execution
        throw NotImplementedError("Tool execution not implemented in RED phase - implement in GREEN phase")
    }

    /**
     * Read a resource via the SDK with simulated request.
     *
     * This method will FAIL in RED phase because no resources are registered yet.
     * This is CORRECT and expected.
     *
     * @param uri Resource URI (e.g., "cycletime://projects")
     * @param meta Optional metadata (e.g., sessionId)
     * @return ReadResourceResult (will throw exception in RED phase)
     */
    suspend fun readResource(
        uri: String,
        meta: Map<String, JsonElement>? = null
    ): ReadResourceResult {
        // This will fail in RED phase - no resource reading implementation exists yet
        // The Developer agent (GREEN phase) will implement resource registration and reading
        throw NotImplementedError("Resource reading not implemented in RED phase - implement in GREEN phase")
    }

    /**
     * Subscribe to resource changes via the SDK.
     *
     * This method will FAIL in RED phase because subscription support is not implemented yet.
     * This is CORRECT and expected.
     *
     * @param uri Resource URI to subscribe to
     * @return Subscription result (will throw exception in RED phase)
     */
    suspend fun subscribeToResource(uri: String): Boolean {
        // This will fail in RED phase - no subscription implementation exists yet
        // The Developer agent (GREEN phase) will implement subscription support
        throw NotImplementedError("Resource subscription not implemented in RED phase - implement in GREEN phase")
    }

    /**
     * List all registered tools in the SDK server.
     *
     * This method will return empty list in RED phase because no tools are registered yet.
     *
     * @return List of tool names (will be empty in RED phase)
     */
    suspend fun listTools(): List<String> {
        // In RED phase, this returns empty because no tools registered yet
        // Tests verify this changes in GREEN phase
        return emptyList()
    }

    /**
     * List all registered resources in the SDK server.
     *
     * This method will return empty list in RED phase because no resources are registered yet.
     *
     * @return List of resource URIs (will be empty in RED phase)
     */
    suspend fun listResources(): List<String> {
        // In RED phase, this returns empty because no resources registered yet
        // Tests verify this changes in GREEN phase
        return emptyList()
    }
}
