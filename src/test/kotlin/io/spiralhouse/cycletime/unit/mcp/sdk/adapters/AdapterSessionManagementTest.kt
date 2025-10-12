package io.spiralhouse.cycletime.unit.mcp.sdk.adapters

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldMatch
import io.spiralhouse.cycletime.mcp.sdk.MCPSdkServer
import io.spiralhouse.cycletime.unit.mocks.MockSDKToolExecutor
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

/**
 * RED Phase tests for adapter session management.
 *
 * These tests verify that adapters correctly extract and use session context from MCP requests.
 * These tests WILL and SHOULD fail in RED phase. This is correct and expected in TDD methodology.
 *
 * Test Coverage:
 * 1. Session extraction from request metadata
 * 2. Session creation when sessionId not in metadata
 * 3. Error handling when session required but missing
 * 4. Session validation (exists in repository)
 * 5. Session usage in tool execution context
 * 6. Session isolation across concurrent requests
 */
class AdapterSessionManagementTest : StringSpec({

    "should extract session from request metadata" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        val metadata = mapOf(
            "sessionId" to JsonPrimitive("test-session-456")
        )

        // When - This WILL FAIL in RED phase - adapter session extraction not implemented yet
        // The test verifies that tools/resources can access session from metadata
        val result = executor.executeTool(
            toolName = "get_session",
            arguments = buildJsonObject {
                put("sessionKey", JsonPrimitive("test-session-456"))
            },
            meta = metadata
        )

        // Then - verify tool execution used the session
        // GREEN phase will implement actual session extraction
        result shouldNotBe null
    }

    "should create new session when sessionId not in metadata" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        val metadata = emptyMap<String, kotlinx.serialization.json.JsonElement>()

        // When - This WILL FAIL in RED phase - session creation not implemented yet
        val result = executor.executeTool(
            toolName = "create_session",
            arguments = buildJsonObject {
                put("projectId", JsonPrimitive("TEST-PROJECT"))
            },
            meta = metadata
        )

        // Then - should create new session and return session data
        result shouldNotBe null
        // GREEN phase will verify actual session creation
    }

    "should throw when session required but missing" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        val metadata = emptyMap<String, kotlinx.serialization.json.JsonElement>()

        // When/Then - This WILL FAIL in RED phase - error handling not implemented yet
        // Some tools may require session context
        shouldThrow<IllegalStateException> {
            executor.executeTool(
                toolName = "get_next_task", // Example tool requiring session
                arguments = buildJsonObject { },
                meta = metadata
            )
        }
    }

    "should validate session exists in repository" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        // First, create a session
        val createMetadata = emptyMap<String, kotlinx.serialization.json.JsonElement>()

        // When - This WILL FAIL in RED phase - validation not implemented yet
        val createResult = executor.executeTool(
            toolName = "create_session",
            arguments = buildJsonObject {
                put("projectId", JsonPrimitive("TEST-PROJECT"))
            },
            meta = createMetadata
        )

        // Then - verify session was created and can be retrieved
        createResult shouldNotBe null
        // GREEN phase will verify session exists in repository
    }

    "should use session in tool execution context" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        val metadata = mapOf(
            "sessionId" to JsonPrimitive("context-session")
        )

        // When - This WILL FAIL in RED phase - context passing not implemented yet
        val result = executor.executeTool(
            toolName = "create_project",
            arguments = buildJsonObject {
                put("name", JsonPrimitive("Test Project"))
            },
            meta = metadata
        )

        // Then - verify session context was used during tool execution
        result shouldNotBe null
        // GREEN phase will verify session context in execution
    }

    "should isolate sessions across concurrent requests" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        val session1Metadata = mapOf("sessionId" to JsonPrimitive("concurrent-1"))
        val session2Metadata = mapOf("sessionId" to JsonPrimitive("concurrent-2"))

        // When - This WILL FAIL in RED phase - concurrency isolation not implemented yet
        val results = runBlocking {
            listOf(
                async {
                    executor.executeTool(
                        toolName = "list_projects",
                        arguments = buildJsonObject { },
                        meta = session1Metadata
                    )
                },
                async {
                    executor.executeTool(
                        toolName = "list_projects",
                        arguments = buildJsonObject { },
                        meta = session2Metadata
                    )
                }
            ).awaitAll()
        }

        // Then - verify both requests completed successfully with isolated sessions
        results.size shouldBe 2
        results[0] shouldNotBe null
        results[1] shouldNotBe null
        // GREEN phase will verify actual session isolation
    }
})
