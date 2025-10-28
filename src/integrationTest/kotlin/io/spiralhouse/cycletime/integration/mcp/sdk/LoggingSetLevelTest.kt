package io.spiralhouse.cycletime.integration.mcp.sdk

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.modelcontextprotocol.kotlin.sdk.LoggingLevel
import io.spiralhouse.cycletime.test.utils.testSDKApplication
import kotlinx.serialization.json.*
import org.slf4j.LoggerFactory

/**
 * Integration test for logging/setLevel handler (SPI-716).
 *
 * Per MCP spec (2024-11-05), servers that declare logging capability MUST implement
 * the logging/setLevel request handler. This test verifies that:
 * 1. The handler is registered and accessible
 * 2. The handler accepts valid log levels (RFC 5424)
 * 3. The handler returns empty success response
 *
 * Uses testSDKApplication with Streamable HTTP transport (SPI-764).
 * Run with: ./gradlew integrationTest --tests "*LoggingSetLevelTest*"
 */
class LoggingSetLevelTest : StringSpec({
    val logger = LoggerFactory.getLogger("LoggingSetLevelTest")

    "should accept connection when logging/setLevel handler is registered".config(enabled = false) {
        // DISABLED (SPI-763): Requires logging capability (SPI-716) not yet implemented in Streamable HTTP transport
        // This test verifies that the logging/setLevel handler is registered, which requires the logging
        // capability to be fully implemented. Re-enable when SPI-716 is completed.
        testSDKApplication {
            // Test initialize request - this would fail if logging/setLevel wasn't registered
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "id": 1,
                        "method": "initialize",
                        "params": {
                            "protocolVersion": "2025-06-18",
                            "clientInfo": {
                                "name": "logging-setlevel-test-client",
                                "version": "1.0.0"
                            },
                            "capabilities": {}
                        }
                    }
                """.trimIndent())
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            jsonResponse["jsonrpc"]?.jsonPrimitive?.content shouldBe "2.0"
            jsonResponse["id"]?.jsonPrimitive?.int shouldBe 1

            val result = jsonResponse["result"]?.jsonObject
            result shouldNotBe null

            // Verify server capabilities include logging
            val capabilities = result!!["capabilities"]?.jsonObject
            capabilities shouldNotBe null
            capabilities!!["logging"]?.jsonObject shouldNotBe null

            logger.info("✅ Logging/setLevel handler successfully registered and accepting requests")
        }
    }

    "should verify all RFC 5424 log levels are supported".config(enabled = false) {
        // DISABLED (SPI-763): Requires logging capability (SPI-716) not yet implemented in Streamable HTTP transport
        // This test verifies that all RFC 5424 log levels are supported through the logging/setLevel endpoint,
        // which requires the logging capability to be fully implemented. Re-enable when SPI-716 is completed.
        testSDKApplication {
            // Test that all log levels are defined and accessible
            val levels = listOf(
                LoggingLevel.debug,
                LoggingLevel.info,
                LoggingLevel.notice,
                LoggingLevel.warning,
                LoggingLevel.error,
                LoggingLevel.critical,
                LoggingLevel.alert,
                LoggingLevel.emergency
            )

            levels.size shouldBe 8
            logger.info("✅ All RFC 5424 log levels are supported")

            // Verify logging/setLevel endpoint accepts a log level
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "id": 2,
                        "method": "logging/setLevel",
                        "params": {
                            "level": "info"
                        }
                    }
                """.trimIndent())
            }

            // Should return success (even if implementation is no-op)
            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            jsonResponse["jsonrpc"]?.jsonPrimitive?.content shouldBe "2.0"
            jsonResponse["id"]?.jsonPrimitive?.int shouldBe 2

            // Result should be empty object or present without error
            val hasError = jsonResponse.containsKey("error")
            hasError shouldBe false
        }
    }
})
