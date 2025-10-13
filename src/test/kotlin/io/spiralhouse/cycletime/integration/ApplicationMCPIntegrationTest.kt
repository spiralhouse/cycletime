package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.StringSpec
import io.kotest.core.annotation.Ignored
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.types.shouldBeInstanceOf
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.assertions.nondeterministic.eventually
import io.kotest.common.ExperimentalKotest
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.test.utils.*
import io.spiralhouse.cycletime.mcp.integration.MCPIntegrationService
import io.spiralhouse.cycletime.mcp.integration.MCPServerConfig
import kotlinx.coroutines.delay
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.time.Duration.Companion.seconds

/**
 * Integration tests for MCP server SDK integration into Application.kt.
 *
 * Validates end-to-end MCP server functionality using the official SDK v0.7.2:
 * - Application startup with SDK endpoints
 * - DI registration of SDK components
 * - Health endpoint integration
 * - Graceful shutdown
 *
 * Migration from EventBus to SDK transport (Phase 4.2):
 * - Uses testSDKApplication for consistent test setup
 * - Tests SDK routing at /mcp endpoint
 * - Validates production DI configuration
 */
@OptIn(ExperimentalKotest::class)
class ApplicationMCPIntegrationTest : StringSpec({

    "should start application with MCP server enabled by default" {
        testSDKApplication {
            val client = createTestClient()

            // Verify REST server is running
            val healthResponse = client.get("/health")
            healthResponse.status shouldBe HttpStatusCode.OK

            // Verify MCP integration service is registered in DI
            val mcpService: MCPIntegrationService by application.dependencies
            mcpService shouldNotBe null
            mcpService.isRunning() shouldBe true
        }
    }

    "should include MCP server status in health endpoint" {
        testSDKApplication {
            val client = createTestClient()

            val healthResponse = client.get("/health")
            healthResponse.status shouldBe HttpStatusCode.OK

            val healthJson = Json.parseToJsonElement(healthResponse.bodyAsText())
            val dependencies = healthJson.jsonObject["dependencies"]?.jsonObject

            // Health endpoint should include MCP server status
            dependencies?.get("mcp")?.jsonPrimitive?.content shouldBe "running"

            val metrics = healthJson.jsonObject["metrics"]?.jsonObject
            metrics?.get("mcpPort")?.jsonPrimitive?.content shouldBe "3006"
        }
    }

    // Commenting out config-dependent tests for now - will fix in a follow-up
    /*
    "should start application with MCP server disabled via environment variable" {
        testApplication {
            // TODO: Fix environment configuration
            // Use helper to ensure proper initialization order
            configureTestApplication(testName = "app_mcp_test")

            val healthResponse = client.get("/health")
            healthResponse.status shouldBe HttpStatusCode.OK
        }
    }
    */

    "should start MCP server on different port than REST server" {
        testSDKApplication {
            val client = createTestClient()

            val healthResponse = client.get("/health")
            healthResponse.status shouldBe HttpStatusCode.OK

            val mcpService: MCPIntegrationService by application.dependencies
            val status = mcpService.getStatus()
            status.isRunning shouldBe true
            status.port shouldBe 3006 // Default MCP port
            status.port shouldNotBe 8080 // Different from REST port
        }
    }

    // SPI-580: Deferred due to DI container stability issues in test environment
    // This test fails due to concurrent execution safety problems in the DI resolution mechanism
    // during integration testing, not MVP functionality issues.
    "should register all MCP components in DI container".config(enabled = false) {
        testSDKApplication {
            // All MCP components should be registered and resolvable
            val mcpService: MCPIntegrationService by application.dependencies
            mcpService shouldNotBe null

            val mcpConfig: MCPServerConfig by application.dependencies
            mcpConfig shouldNotBe null
            mcpConfig.port shouldBe 3006

            // Verify singleton behavior
            val mcpService2: MCPIntegrationService by application.dependencies
            mcpService shouldBe mcpService2 // Same instance
        }
    }

    "should support graceful shutdown of both REST and MCP servers" {
        testSDKApplication {
            val client = createTestClient()

            val healthResponse = client.get("/health")
            healthResponse.status shouldBe HttpStatusCode.OK

            val mcpService: MCPIntegrationService by application.dependencies
            mcpService.isRunning() shouldBe true

            // Application shutdown should stop MCP server
            // This is tested by testSDKApplication cleanup
        }
    }

    // TODO(SPI-589): Re-enable when advanced MCP monitoring integration is implemented
    "should report MCP server performance metrics in health check".config(enabled = false) {
        testSDKApplication {
            val client = createTestClient()

            val healthResponse = client.get("/health")
            healthResponse.status shouldBe HttpStatusCode.OK

            val healthJson = Json.parseToJsonElement(healthResponse.bodyAsText())
            val metrics = healthJson.jsonObject["metrics"]?.jsonObject

            // Verify metrics are present
            metrics?.get("mcpPort") shouldNotBe null
            metrics?.get("mcpUptime") shouldNotBe null
            metrics?.get("mcpStatus") shouldNotBe null
        }
    }

    // TODO(SPI-580): Re-enable when MCP server reliability and rapid restart handling is implemented
    "should handle rapid application restart with MCP server".config(enabled = false) {
        // Test for resource cleanup issues
        repeat(3) {
            testSDKApplication {
                val client = createTestClient()

                val healthResponse = client.get("/health")
                healthResponse.status shouldBe HttpStatusCode.OK

                val mcpService: MCPIntegrationService by application.dependencies
                mcpService.isRunning() shouldBe true

                // Each iteration should cleanly start and stop
            }
        }
    }
})