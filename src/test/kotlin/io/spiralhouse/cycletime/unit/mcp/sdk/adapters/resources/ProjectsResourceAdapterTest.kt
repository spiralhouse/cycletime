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
 * RED Phase tests for projects resource adapter.
 *
 * These tests WILL and SHOULD fail in RED phase. This is correct and expected in TDD methodology.
 *
 * Test Coverage:
 * 1. Resource registration with SDK
 * 2. Resource reading via SDK ReadResourceRequest (happy path)
 * 3. Resource subscription support (listChanged capability)
 */
class ProjectsResourceAdapterTest : StringSpec({

    "should register projects resource with SDK" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        // When - This WILL FAIL in RED phase - no resources registered yet
        val resources = executor.listResources()

        // Then - verify projects resource is registered
        resources shouldContain "cycletime://projects"
    }

    "should read projects via SDK ReadResourceRequest" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        val metadata = mapOf(
            "sessionId" to JsonPrimitive("test-session-123")
        )

        // When - This WILL FAIL in RED phase - no adapter implementation exists yet
        val result = executor.readResource(
            uri = "cycletime://projects",
            meta = metadata
        )

        // Then - verify success and content returned
        result shouldNotBe null  // Will be ReadResourceResult.Success in GREEN phase
        // GREEN phase will verify actual content structure
    }

    "should support resource subscription (listChanged capability)" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        // When - This WILL FAIL in RED phase - no subscription implementation exists yet
        val result = executor.subscribeToResource(
            uri = "cycletime://projects"
        )

        // Then - verify subscription success
        result shouldBe true
    }
})
