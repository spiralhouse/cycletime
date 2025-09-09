package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.StringSpec
import io.kotest.core.annotation.Ignored
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.plugins.websocket.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import io.ktor.websocket.*
import io.spiralhouse.cycletime.module
import kotlinx.serialization.json.*
import kotlinx.coroutines.withTimeout
import kotlin.time.Duration.Companion.seconds

/**
 * Simple integration tests for MCP server functionality.
 * Tests the MCP endpoints as integrated within the main application.
 */
@Ignored // SPI-608: Fix MCP WebSocket Integration Tests - Client Plugin Configuration
class McpSimpleIntegrationTest : StringSpec({
    
    "should expose MCP info endpoint" {
        testApplication {
            application {
                // Use in-memory database for tests to avoid conflicts
                System.setProperty("DATABASE_URL", "jdbc:h2:mem:mcp_test_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
                module()
            }
            
            val response = client.get("/mcp")
            response.status shouldBe HttpStatusCode.OK
            
            val body = response.bodyAsText()
            body shouldContain "cycletime"
            body shouldContain "version"
            body shouldContain "capabilities"
        }
    }
    
    "should accept WebSocket connections on /mcp endpoint" {
        testApplication {
            application {
                // Use in-memory database for tests to avoid conflicts
                System.setProperty("DATABASE_URL", "jdbc:h2:mem:mcp_test_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
                module()
            }
            
            val client = createClient {
                install(WebSockets)
            }
            
            client.webSocket("/mcp") {
                // Send initialize request
                val initRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", 1)
                    put("method", "initialize")
                    put("params", buildJsonObject {
                        put("protocolVersion", "2024-11-05")
                        put("capabilities", buildJsonObject {
                            put("roots", buildJsonObject {
                                put("listChanged", false)
                            })
                        })
                        put("clientInfo", buildJsonObject {
                            put("name", "test-client")
                            put("version", "1.0.0")
                        })
                    })
                }
                
                send(Frame.Text(initRequest.toString()))
                
                // Wait for response with timeout
                val response = withTimeout(5.seconds) {
                    incoming.receive() as? Frame.Text
                }
                
                response shouldNotBe null
                val responseText = response?.readText() ?: ""
                responseText shouldContain "jsonrpc"
                responseText shouldContain "2.0"
                
                // Close connection
                close(CloseReason(CloseReason.Codes.NORMAL, "Test complete"))
            }
        }
    }
    
    "should handle tools/list request via WebSocket" {
        testApplication {
            application {
                // Use in-memory database for tests to avoid conflicts
                System.setProperty("DATABASE_URL", "jdbc:h2:mem:mcp_test_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
                module()
            }
            
            val client = createClient {
                install(WebSockets)
            }
            
            client.webSocket("/mcp") {
                // First initialize
                val initRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", 1)
                    put("method", "initialize")
                    put("params", buildJsonObject {
                        put("protocolVersion", "2024-11-05")
                        put("capabilities", buildJsonObject {})
                        put("clientInfo", buildJsonObject {
                            put("name", "test-client")
                            put("version", "1.0.0")
                        })
                    })
                }
                
                send(Frame.Text(initRequest.toString()))
                
                // Wait for init response
                withTimeout(5.seconds) {
                    incoming.receive() as? Frame.Text
                }
                
                // Now send tools/list request
                val toolsRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", 2)
                    put("method", "tools/list")
                }
                
                send(Frame.Text(toolsRequest.toString()))
                
                // Wait for tools response
                val toolsResponse = withTimeout(5.seconds) {
                    incoming.receive() as? Frame.Text
                }
                
                toolsResponse shouldNotBe null
                val responseText = toolsResponse?.readText() ?: ""
                responseText shouldContain "tools"
                
                // Parse and verify structure
                val responseJson = Json.parseToJsonElement(responseText) as? JsonObject
                responseJson shouldNotBe null
                responseJson?.get("jsonrpc")?.jsonPrimitive?.content shouldBe "2.0"
                responseJson?.get("id")?.jsonPrimitive?.int shouldBe 2
                
                // Close connection
                close(CloseReason(CloseReason.Codes.NORMAL, "Test complete"))
            }
        }
    }
    
    "should expose MCP stats endpoint" {
        testApplication {
            application {
                // Use in-memory database for tests to avoid conflicts
                System.setProperty("DATABASE_URL", "jdbc:h2:mem:mcp_test_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
                module()
            }
            
            val response = client.get("/mcp/stats")
            response.status shouldBe HttpStatusCode.OK
            
            val body = response.bodyAsText()
            body shouldContain "connections"
            body shouldContain "config"
        }
    }
})