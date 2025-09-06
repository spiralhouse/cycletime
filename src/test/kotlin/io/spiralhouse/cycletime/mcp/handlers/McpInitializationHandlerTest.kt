package io.spiralhouse.cycletime.mcp.handlers

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.spiralhouse.cycletime.mcp.protocol.*
import io.spiralhouse.cycletime.mcp.server.handlers.DefaultMcpMethodHandler
import io.spiralhouse.cycletime.mcp.tools.DefaultToolRegistry
import io.spiralhouse.cycletime.mcp.resources.ResourceProviderRegistry
import kotlinx.serialization.json.*

/**
 * RED Phase TDD Tests for MCP Initialization Handler - SPI-572
 *
 * Focused tests for the MCP initialize method and capability negotiation.
 * This covers the critical handshake process between client and server.
 *
 * Tests cover:
 * 1. Protocol version validation and negotiation
 * 2. Capability announcement and negotiation
 * 3. Client info processing and validation
 * 4. Server info response formatting
 * 5. Error handling for initialization failures
 *
 * All tests should FAIL initially as the implementation is missing.
 */
class McpInitializationHandlerTest : StringSpec({

    lateinit var protocolHandler: JsonRpcProtocolHandler
    lateinit var toolRegistry: DefaultToolRegistry
    lateinit var resourceRegistry: ResourceProviderRegistry
    lateinit var methodHandler: DefaultMcpMethodHandler

    beforeEach {
        protocolHandler = JsonRpcProtocolHandler()
        toolRegistry = DefaultToolRegistry()
        resourceRegistry = ResourceProviderRegistry()
        methodHandler = DefaultMcpMethodHandler(protocolHandler, toolRegistry, resourceRegistry)
    }

    // ===== PROTOCOL VERSION NEGOTIATION =====

    "should accept supported protocol version 2024-11-05" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = buildJsonObject {
                put("protocolVersion", "2024-11-05")
                put("capabilities", buildJsonObject {})
                put("clientInfo", buildJsonObject {
                    put("name", "Test Client")
                    put("version", "1.0.0")
                })
            },
            id = JsonPrimitive("version-test-1")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        result["protocolVersion"]?.jsonPrimitive?.content shouldBe "2024-11-05"
    }

    "should reject unsupported protocol versions"
        .config(enabled = false) { // SPI-584: Handle MCP Integration Configuration Edge Cases
        val unsupportedVersions = listOf("1.0.0", "2023-01-01", "2025-01-01", "invalid-version")
        
        unsupportedVersions.forEach { version ->
            val request = JsonRpcRequest(
                jsonrpc = "2.0",
                method = "initialize",
                params = buildJsonObject {
                    put("protocolVersion", version)
                    put("capabilities", buildJsonObject {})
                    put("clientInfo", buildJsonObject {
                        put("name", "Test Client")
                    })
                },
                id = JsonPrimitive("version-test-$version")
            )

            val response = methodHandler.handleRequest(request)

            response.error shouldNotBe null
            response.error!!.code shouldBe -32602 // Invalid params
            response.error!!.message shouldContain "protocol version"
            response.error!!.message shouldContain version
        }
    }

    "should handle missing protocol version parameter"
        .config(enabled = false) { // SPI-584: Handle MCP Integration Configuration Edge Cases
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = buildJsonObject {
                // Missing protocolVersion
                put("capabilities", buildJsonObject {})
                put("clientInfo", buildJsonObject {
                    put("name", "Test Client")
                })
            },
            id = JsonPrimitive("missing-version")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32602 // Invalid params
        response.error!!.message shouldContain "protocolVersion"
    }

    // ===== CLIENT CAPABILITY NEGOTIATION =====

    "should process client capabilities and respond with server capabilities" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = buildJsonObject {
                put("protocolVersion", "2024-11-05")
                put("capabilities", buildJsonObject {
                    put("roots", buildJsonObject {
                        put("listChanged", true)
                    })
                    put("sampling", buildJsonObject {})
                })
                put("clientInfo", buildJsonObject {
                    put("name", "Advanced MCP Client")
                    put("version", "2.1.0")
                })
            },
            id = JsonPrimitive("capability-negotiation")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val capabilities = result["capabilities"] as JsonObject

        // Server should announce its capabilities
        capabilities.keys shouldContain "tools"
        capabilities.keys shouldContain "resources"
        capabilities.keys shouldContain "logging"
        capabilities.keys shouldContain "prompts"

        // Tools capability
        val toolsCapability = capabilities["tools"] as JsonObject
        toolsCapability.containsKey("listChanged") shouldBe true

        // Resources capability
        val resourcesCapability = capabilities["resources"] as JsonObject
        resourcesCapability.containsKey("subscribe") shouldBe true
        resourcesCapability.containsKey("listChanged") shouldBe true

        // Logging capability
        val loggingCapability = capabilities["logging"] as JsonObject
        // Should be present even if empty

        // Prompts capability  
        val promptsCapability = capabilities["prompts"] as JsonObject
        promptsCapability.containsKey("listChanged") shouldBe true
    }

    "should handle empty client capabilities gracefully" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = buildJsonObject {
                put("protocolVersion", "2024-11-05")
                put("capabilities", buildJsonObject {}) // Empty capabilities
                put("clientInfo", buildJsonObject {
                    put("name", "Basic Client")
                })
            },
            id = JsonPrimitive("empty-capabilities")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldBe null
        response.result shouldNotBe null

        // Should still return full server capabilities
        val result = response.result as JsonObject
        val capabilities = result["capabilities"] as JsonObject
        capabilities.size shouldBe 4 // tools, resources, logging, prompts
    }

    "should handle missing capabilities parameter"
        .config(enabled = false) { // SPI-584: Handle MCP Integration Configuration Edge Cases
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = buildJsonObject {
                put("protocolVersion", "2024-11-05")
                // Missing capabilities
                put("clientInfo", buildJsonObject {
                    put("name", "Test Client")
                })
            },
            id = JsonPrimitive("missing-capabilities")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32602 // Invalid params
        response.error!!.message shouldContain "capabilities"
    }

    // ===== CLIENT INFO PROCESSING =====

    "should process and validate client info" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = buildJsonObject {
                put("protocolVersion", "2024-11-05")
                put("capabilities", buildJsonObject {})
                put("clientInfo", buildJsonObject {
                    put("name", "My MCP Client")
                    put("version", "1.2.3")
                })
            },
            id = JsonPrimitive("client-info-test")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldBe null
        response.result shouldNotBe null

        // Server should acknowledge the client info by responding successfully
        val result = response.result as JsonObject
        result["serverInfo"] shouldNotBe null

        // Server info should be properly formatted
        val serverInfo = result["serverInfo"] as JsonObject
        serverInfo["name"]?.jsonPrimitive?.content shouldBe "CycleTime MCP Server"
        serverInfo["version"] shouldNotBe null
        serverInfo["version"]?.jsonPrimitive?.content shouldNotBe null
    }

    "should handle client info with additional optional fields" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = buildJsonObject {
                put("protocolVersion", "2024-11-05")
                put("capabilities", buildJsonObject {})
                put("clientInfo", buildJsonObject {
                    put("name", "Extended Client")
                    put("version", "2.0.0")
                    put("description", "An extended MCP client with additional features")
                    put("author", "Test Author")
                    put("license", "MIT")
                })
            },
            id = JsonPrimitive("extended-client-info")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldBe null
        response.result shouldNotBe null

        // Should handle gracefully without errors
        val result = response.result as JsonObject
        result["serverInfo"] shouldNotBe null
    }

    "should handle missing client name" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = buildJsonObject {
                put("protocolVersion", "2024-11-05")
                put("capabilities", buildJsonObject {})
                put("clientInfo", buildJsonObject {
                    put("version", "1.0.0")
                    // Missing name
                })
            },
            id = JsonPrimitive("missing-client-name")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32602 // Invalid params
        response.error!!.message shouldContain "client name"
    }

    "should handle missing client info completely" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = buildJsonObject {
                put("protocolVersion", "2024-11-05")
                put("capabilities", buildJsonObject {})
                // Missing clientInfo
            },
            id = JsonPrimitive("missing-client-info")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32602 // Invalid params
        response.error!!.message shouldContain "clientInfo"
    }

    // ===== SERVER INFO RESPONSE =====

    "should return properly formatted server info" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = buildJsonObject {
                put("protocolVersion", "2024-11-05")
                put("capabilities", buildJsonObject {})
                put("clientInfo", buildJsonObject {
                    put("name", "Test Client")
                    put("version", "1.0.0")
                })
            },
            id = JsonPrimitive("server-info-test")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val serverInfo = result["serverInfo"] as JsonObject

        // Required fields
        serverInfo["name"]?.jsonPrimitive?.content shouldBe "CycleTime MCP Server"
        serverInfo["version"] shouldNotBe null
        val version = serverInfo["version"]?.jsonPrimitive?.content
        version shouldNotBe null
        version shouldNotBe ""

        // Version should follow semantic versioning pattern
        version!! shouldContain Regex("""\d+\.\d+\.\d+""")
    }

    "should include consistent server info across multiple initializations" {
        val requests = (1..3).map { i ->
            JsonRpcRequest(
                jsonrpc = "2.0",
                method = "initialize",
                params = buildJsonObject {
                    put("protocolVersion", "2024-11-05")
                    put("capabilities", buildJsonObject {})
                    put("clientInfo", buildJsonObject {
                        put("name", "Client $i")
                        put("version", "1.0.0")
                    })
                },
                id = JsonPrimitive("consistency-test-$i")
            )
        }

        val responses = requests.map { methodHandler.handleRequest(it) }

        // All should succeed
        responses.forEach { response ->
            response.error shouldBe null
            response.result shouldNotBe null
        }

        // Server info should be consistent
        val serverInfos = responses.map { 
            (it.result as JsonObject)["serverInfo"] as JsonObject
        }

        val firstServerInfo = serverInfos[0]
        serverInfos.forEach { serverInfo ->
            serverInfo["name"] shouldBe firstServerInfo["name"]
            serverInfo["version"] shouldBe firstServerInfo["version"]
        }
    }

    // ===== ERROR HANDLING AND EDGE CASES =====

    "should handle malformed initialize parameters"
        .config(enabled = false) { // SPI-584: Handle MCP Integration Configuration Edge Cases
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = JsonPrimitive("invalid-params-format"), // Should be object
            id = JsonPrimitive("malformed-params")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32602 // Invalid params
        response.error!!.message shouldContain "Expected object parameters"
    }

    "should handle null parameters"
        .config(enabled = false) { // SPI-584: Handle MCP Integration Configuration Edge Cases
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = null,
            id = JsonPrimitive("null-params")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32602 // Invalid params
        response.error!!.message shouldContain "parameters required"
    }

    "should handle initialization request without request ID" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = buildJsonObject {
                put("protocolVersion", "2024-11-05")
                put("capabilities", buildJsonObject {})
                put("clientInfo", buildJsonObject {
                    put("name", "Test Client")
                    put("version", "1.0.0")
                })
            },
            id = null // Notification - should not be allowed for initialize
        )

        // Initialize as notification should be rejected
        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32600 // Invalid request
        response.error!!.message shouldContain "initialize method requires request ID"
    }

    "should handle very large client info objects"
        .config(enabled = false) { // SPI-584: Handle MCP Integration Configuration Edge Cases
        val largeDescription = "x".repeat(10000) // 10KB description

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = buildJsonObject {
                put("protocolVersion", "2024-11-05")
                put("capabilities", buildJsonObject {})
                put("clientInfo", buildJsonObject {
                    put("name", "Large Info Client")
                    put("version", "1.0.0")
                    put("description", largeDescription)
                })
            },
            id = JsonPrimitive("large-info")
        )

        val response = methodHandler.handleRequest(request)

        // Should handle gracefully without memory issues
        response.error shouldBe null
        response.result shouldNotBe null
    }

    "should preserve request ID in response for proper correlation" {
        val uniqueIds = listOf(
            JsonPrimitive(12345),
            JsonPrimitive("unique-string-id"),
            JsonPrimitive(0),
            JsonPrimitive(-1),
            JsonNull
        )

        uniqueIds.forEach { id ->
            val request = JsonRpcRequest(
                jsonrpc = "2.0",
                method = "initialize",
                params = buildJsonObject {
                    put("protocolVersion", "2024-11-05")
                    put("capabilities", buildJsonObject {})
                    put("clientInfo", buildJsonObject {
                        put("name", "Test Client")
                        put("version", "1.0.0")
                    })
                },
                id = id
            )

            val response = methodHandler.handleRequest(request)

            response.id shouldBe id
        }
    }
})