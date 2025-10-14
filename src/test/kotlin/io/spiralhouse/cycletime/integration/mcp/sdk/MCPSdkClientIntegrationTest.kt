package io.spiralhouse.cycletime.integration.mcp.sdk

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.sse.*
import io.modelcontextprotocol.kotlin.sdk.Implementation
import io.modelcontextprotocol.kotlin.sdk.client.Client
import io.modelcontextprotocol.kotlin.sdk.client.SSEClientTransport
import kotlinx.coroutines.withTimeout
import org.slf4j.LoggerFactory

/**
 * Integration tests for MCP SDK v0.7.2 using the official SDK Client.
 *
 * This test class demonstrates the correct pattern for testing SDK-based MCP servers:
 * 1. Use the SDK Client with SSEClientTransport
 * 2. SDK automatically handles "endpoint" event and sessionId extraction
 * 3. High-level API abstracts all protocol details
 *
 * Prerequisites:
 * - Server must be running at http://localhost:8080
 * - Run with: ./gradlew integrationTest --tests "*MCPSdkClientIntegrationTest*"
 */
class MCPSdkClientIntegrationTest : StringSpec({
    val logger = LoggerFactory.getLogger("MCPSdkClientTest")
    val serverUrl = "http://localhost:8080"

    /**
     * Test that SDK Client can connect to our SDK server and complete initialization.
     *
     * Flow:
     * 1. Client opens SSE connection
     * 2. Server sends "endpoint" event with sessionId
     * 3. SDK extracts endpoint URL internally
     * 4. Client sends initialize request
     * 5. Server responds with capabilities
     */
    "should initialize connection using SDK Client".config(enabled = true) {
        val httpClient = HttpClient(CIO) {
            install(SSE)
        }

        try {
            logger.info("Creating MCP SDK Client")
            val client = Client(
                clientInfo = Implementation(
                    name = "cycletime-test-client",
                    version = "1.0.0"
                )
            )

            logger.info("Creating SSE transport to $serverUrl")
            val transport = SSEClientTransport(
                client = httpClient,
                urlString = serverUrl
            )

            logger.info("Connecting client...")
            withTimeout(10_000) {
                client.connect(transport)
            }

            logger.info("Client connected successfully!")

            // Verify server info
            val serverInfo = client.serverVersion
            serverInfo.shouldNotBeNull()
            serverInfo.name shouldBe "cycletime-ce"
            logger.info("Server: ${serverInfo.name} v${serverInfo.version}")

            // Verify capabilities
            val capabilities = client.serverCapabilities
            capabilities.shouldNotBeNull()
            capabilities.tools?.listChanged shouldBe true
            capabilities.resources?.subscribe shouldBe true
            capabilities.resources?.listChanged shouldBe true

            logger.info("✅ SDK Client integration test PASSED")

        } finally {
            httpClient.close()
        }
    }

    /**
     * Test that SDK Client can list tools from the server.
     *
     * This validates that the full request/response cycle works through SSE.
     */
    "should list tools using SDK Client".config(enabled = true) {
        val httpClient = HttpClient(CIO) {
            install(SSE)
        }

        try {
            val client = Client(
                clientInfo = Implementation(
                    name = "cycletime-test-client",
                    version = "1.0.0"
                )
            )

            val transport = SSEClientTransport(
                client = httpClient,
                urlString = serverUrl
            )

            withTimeout(10_000) {
                client.connect(transport)
            }

            logger.info("Listing tools...")
            val toolsResult = client.listTools()

            toolsResult.shouldNotBeNull()
            toolsResult.tools.shouldNotBeNull()

            logger.info("Found ${toolsResult.tools.size} tools")

            // Verify expected tools are present
            val toolNames = toolsResult.tools.map { it.name }

            // Session tools
            toolNames shouldContain "create_session"
            toolNames shouldContain "list_sessions"
            toolNames shouldContain "get_active_session"

            // Project tools
            toolNames shouldContain "create_project"
            toolNames shouldContain "list_projects"

            // Issue tools
            toolNames shouldContain "create_issue"
            toolNames shouldContain "list_issues"

            logger.info("✅ Tool listing test PASSED")

        } finally {
            httpClient.close()
        }
    }

    /**
     * Test that SDK Client can list resources from the server.
     */
    "should list resources using SDK Client".config(enabled = true) {
        val httpClient = HttpClient(CIO) {
            install(SSE)
        }

        try {
            val client = Client(
                clientInfo = Implementation(
                    name = "cycletime-test-client",
                    version = "1.0.0"
                )
            )

            val transport = SSEClientTransport(
                client = httpClient,
                urlString = serverUrl
            )

            withTimeout(10_000) {
                client.connect(transport)
            }

            logger.info("Listing resources...")
            val resourcesResult = client.listResources()

            resourcesResult.shouldNotBeNull()
            resourcesResult.resources.shouldNotBeNull()

            logger.info("Found ${resourcesResult.resources.size} resources")

            // Log resource URIs for inspection
            resourcesResult.resources.forEach { resource ->
                logger.info("  Resource: ${resource.uri} - ${resource.name}")
            }

            logger.info("✅ Resource listing test PASSED")

        } finally {
            httpClient.close()
        }
    }
})
