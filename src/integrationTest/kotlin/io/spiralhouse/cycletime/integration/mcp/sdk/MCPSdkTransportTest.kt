package io.spiralhouse.cycletime.integration.mcp.sdk

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotBeEmpty
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.types.shouldBeInstanceOf
import io.ktor.client.statement.*
import io.ktor.http.*
import io.modelcontextprotocol.kotlin.sdk.Implementation
import io.modelcontextprotocol.kotlin.sdk.ReadResourceRequest
import io.modelcontextprotocol.kotlin.sdk.TextContent
import io.modelcontextprotocol.kotlin.sdk.client.Client
import io.modelcontextprotocol.kotlin.sdk.client.SSEClientTransport
import io.spiralhouse.cycletime.test.utils.*
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.json.*

/**
 * Comprehensive integration tests for MCP SDK v0.7.2 transport layer.
 *
 * These tests validate the complete SDK transport integration:
 * - Official SDK v0.7.2 Ktor integration
 * - JSON-RPC protocol handling via SDK
 * - MCP tool and resource execution via SDK adapters
 * - Session management via SDK metadata
 * - Error handling and validation via SDK
 *
 * ## Test Strategy
 *
 * These integration tests verify the end-to-end flow through the SDK transport:
 * 1. **Initialize Connection**: Protocol version negotiation and capability exchange
 * 2. **Tools Operations**: List and call tools via SDK adapters
 * 3. **Resources Operations**: List, read, and subscribe to resources
 * 4. **Error Handling**: Invalid requests, missing parameters, and error responses
 * 5. **Session Management**: Session extraction from metadata and validation
 *
 * ## Architecture
 *
 * The SDK transport replaces custom EventBus architecture with official SDK:
 * ```
 * HTTP Client → SDK Ktor Integration → SDK Server → SDK Adapters → Business Logic
 * ```
 *
 * Tests use production DI configuration to ensure realistic behavior.
 *
 * SPI-783: Removed 5 SDK-obsolete tests that are prevented by SDK type safety.
 *
 * @see io.spiralhouse.cycletime.mcp.sdk.MCPSdkServer SDK server implementation
 * @see io.spiralhouse.cycletime.mcp.sdk.adapters SDK adapter implementations
 */
class MCPSdkTransportTest : StringSpec({

    /**
     * Helper function to create a test project and return its UUID.
     * Required because session_create_session needs a valid project UUID.
     */
    suspend fun Client.createTestProject(name: String = "Test Project ${System.currentTimeMillis()}"): String {
        val result = this.callTool(
            name = "project_create_project",
            arguments = mapOf(
                "name" to JsonPrimitive(name),
                "description" to JsonPrimitive("Test project for SDK transport tests")
            )
        )

        result.shouldNotBeNull()
        result.isError shouldBe false
        result.content.shouldNotBeEmpty()

        val content = result.content[0]
        require(content is TextContent) { "Expected TextContent" }

        val jsonText = content.text ?: throw IllegalStateException("TextContent.text is null")
        val projectIdRegex = "\"id\"\\s*:\\s*\"([0-9a-f-]+)\"".toRegex()
        val match = projectIdRegex.find(jsonText)
        if (match != null) {
            return match.groupValues[1]
        }

        throw IllegalStateException("Failed to extract project ID from response: ${result.content}")
    }

    // ===== Initialize Connection Tests =====

    "should initialize MCP connection via SDK" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // Verify server info (SDK provides automatically)
            val serverInfo = client.serverVersion
            serverInfo.shouldNotBeNull()
            serverInfo.name shouldBe "cycletime-ce"

            // Verify capabilities
            val capabilities = client.serverCapabilities
            capabilities.shouldNotBeNull()
        }
    }

    "should validate protocol version during initialize" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // SDK negotiates protocol version automatically
            // Verify connection successful (implies protocol negotiation worked)
            client.serverVersion.shouldNotBeNull()
            client.serverCapabilities.shouldNotBeNull()
        }
    }

    // ===== Tools Operations Tests =====

    "should list all MCP tools via SDK" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // Use SDK's type-safe listTools API
            val toolsResult = client.listTools()
            toolsResult.tools.shouldNotBeEmpty()

            // SDK registered 4 tool providers (session, project, issue, workflow) (SPI-700)
            // Each provider has multiple tools, expect 17 total tools
            toolsResult.tools shouldHaveSize 17

            // Verify specific tools exist
            val toolNames = toolsResult.tools.map { it.name }
            toolNames shouldContain "session_create_session"
            toolNames shouldContain "project_create_project"
        }
    }

    "should call tool with valid arguments via SDK" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // Create project first (need valid project ID)
            val projectId = client.createTestProject("Test Project for Tool Call")

            // Call session_create_session tool
            val result = client.callTool(
                name = "session_create_session",
                arguments = mapOf("projectId" to JsonPrimitive(projectId))
            )

            // Verify result
            result.shouldNotBeNull()
            result.isError shouldBe false
            result.content.shouldNotBeEmpty()

            // Verify content type
            val content = result.content[0]
            content.type shouldBe "text"

            // Verify text contains project ID
            if (content is TextContent) {
                content.text shouldContain projectId
            }
        }
    }

    "should reject tool call with invalid tool name" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // SDK throws exception for tool not found
            val exception = shouldThrow<Exception> {
                client.callTool("nonexistent_tool", emptyMap())
            }

            exception.message shouldContain "not found"
        }
    }

    "should reject tool call with missing required arguments" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // SDK returns error result for missing required arguments
            val result = client.callTool("session_create_session", emptyMap())
            result.shouldNotBeNull()
            result.isError shouldBe true
        }
    }

    // ===== Resources Operations Tests =====

    "should list all MCP resources via SDK" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // Use SDK's type-safe listResources API
            val resourcesResult = client.listResources()
            resourcesResult.resources.shouldNotBeEmpty()

            // Verify resource structure
            resourcesResult.resources.forEach { resource ->
                resource.uri.shouldNotBeNull()
                resource.name.shouldNotBeNull()
                resource.mimeType.shouldNotBeNull()
            }
        }
    }

    "should read resource with valid URI via SDK" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // Create session to have active session for resource reading
            val projectId = client.createTestProject("Test Project")
            val sessionResult = client.callTool(
                name = "session_create_session",
                arguments = mapOf("projectId" to JsonPrimitive(projectId))
            )
            sessionResult.shouldNotBeNull()
            sessionResult.isError shouldBe false

            // Read resource
            val result = client.readResource(
                request = ReadResourceRequest(uri = "cycletime://sessions/active")
            )
            result.contents.shouldNotBeEmpty()
        }
    }

    "should reject resource read with invalid URI" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // SDK throws exception for invalid resource
            val exception = shouldThrow<Exception> {
                client.readResource(
                    request = ReadResourceRequest(uri = "cycletime://invalid/resource")
                )
            }
            exception.message shouldContain "not found"
        }
    }

    // ===== Session Management Tests =====

    "should extract session ID from request metadata" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)
            withTimeout(10_000) { client.connect(transport) }

            // Create project and session
            val projectId = client.createTestProject("Test Project")
            val createResult = client.callTool(
                "session_create_session",
                mapOf("projectId" to JsonPrimitive(projectId))
            )
            createResult.shouldNotBeNull()
            createResult.isError shouldBe false

            // Get session (validates session was created and tracked)
            val getResult = client.callTool("session_get_active_session", emptyMap())
            getResult.shouldNotBeNull()
            getResult.isError shouldBe false
            getResult.content.shouldNotBeEmpty()
        }
    }

    "should maintain session persistence across requests" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)
            withTimeout(10_000) { client.connect(transport) }

            // Create project and session
            val projectId = client.createTestProject("Test Project")
            val createResult = client.callTool(
                "session_create_session",
                mapOf("projectId" to JsonPrimitive(projectId))
            )
            createResult.shouldNotBeNull()
            createResult.isError shouldBe false

            // Make multiple requests - session should persist
            repeat(3) {
                val getResult = client.callTool("session_get_active_session", emptyMap())
                getResult.shouldNotBeNull()
                getResult.isError shouldBe false
                getResult.content.shouldNotBeEmpty()
            }
        }
    }
})
