package io.spiralhouse.cycletime.unit.mcp.sdk.adapters.resources

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.shouldBe
import io.kotest.matchers.types.shouldBeInstanceOf
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.mcp.sdk.MCPSdkServer
import io.spiralhouse.cycletime.unit.mocks.MockSDKToolExecutor
import kotlinx.serialization.json.JsonPrimitive

/**
 * RED Phase tests for workflows resource adapter.
 *
 * These tests WILL and SHOULD fail in RED phase. This is correct and expected in TDD methodology.
 */
class WorkflowsResourceAdapterTest : StringSpec({

    "should register workflows resource with SDK" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        // When - This WILL FAIL in RED phase
        val resources = executor.listResources()

        // Then
        resources shouldContain "cycletime://workflows"
    }

    "should read workflows via SDK ReadResourceRequest" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        val metadata = mapOf(
            "sessionId" to JsonPrimitive("test-session-123")
        )

        // When - This WILL FAIL in RED phase
        val result = executor.readResource(
            uri = "cycletime://workflows",
            meta = metadata
        )

        // Then
        result shouldNotBe null  // Will be ReadResourceResult.Success in GREEN phase
    }

    "should support resource subscription (listChanged capability)" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        // When - This WILL FAIL in RED phase
        val result = executor.subscribeToResource(
            uri = "cycletime://workflows"
        )

        // Then
        result shouldBe true
    }
})
