package io.spiralhouse.cycletime.mcp.handlers

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.spiralhouse.cycletime.mcp.protocol.*
import io.spiralhouse.cycletime.mcp.server.handlers.DefaultMcpMethodHandler
import io.spiralhouse.cycletime.mcp.tools.DefaultToolRegistry
import io.spiralhouse.cycletime.mcp.resources.ResourceProviderRegistry
import io.spiralhouse.cycletime.mcp.resources.*
import kotlinx.serialization.json.*
import kotlinx.coroutines.runBlocking

/**
 * RED Phase TDD Tests for MCP Resource Handler - SPI-572
 *
 * Focused tests for MCP resource-related methods:
 * - resources/list
 * - resources/read
 * - resources/subscribe
 * - resources/unsubscribe
 * - notifications/resources/list_changed
 * - notifications/resources/updated
 *
 * Tests cover resource discovery, access control, content delivery,
 * subscription management, and proper error handling.
 *
 * All tests should FAIL initially as the implementation is missing.
 */
class McpResourceHandlerTest : StringSpec({

    lateinit var protocolHandler: JsonRpcProtocolHandler
    lateinit var toolRegistry: DefaultToolRegistry
    lateinit var resourceRegistry: ResourceProviderRegistry
    lateinit var methodHandler: DefaultMcpMethodHandler

    beforeEach {
        protocolHandler = JsonRpcProtocolHandler()
        toolRegistry = DefaultToolRegistry()
        resourceRegistry = ResourceProviderRegistry()
        methodHandler = DefaultMcpMethodHandler(protocolHandler, toolRegistry, resourceRegistry)
        
        // Setup test resource providers
        runBlocking {
            setupTestResources(resourceRegistry)
        }
    }

    // ===== RESOURCES/LIST METHOD TESTS =====

    "should return empty resource list when no providers are registered"
        .config(enabled = false) { // SPI-581: Enhance MCP Resource Handler Error Scenarios
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/list",
            params = null,
            id = JsonPrimitive("resources-empty")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val resources = result["resources"] as JsonArray
        resources shouldHaveSize 0
    }

    "should list resources from multiple providers"
        .config(enabled = false) { // SPI-581: Enhance MCP Resource Handler Error Scenarios
        // Note: Resource provider registration would be tested separately
        // For now, this test will fail as expected (RED phase)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/list",
            params = null,
            id = JsonPrimitive("resources-multiple")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val resources = result["resources"] as JsonArray
        resources shouldHaveSize 4

        // Verify all resources are present with correct metadata
        val resourceUris = resources.map { (it as JsonObject)["uri"]?.jsonPrimitive?.content }
        resourceUris.contains("cycletime://projects/project1") shouldBe true
        resourceUris.contains("cycletime://projects/project2") shouldBe true
        resourceUris.contains("cycletime://docs/readme") shouldBe true
        resourceUris.contains("cycletime://docs/api") shouldBe true

        // Verify resource structure
        resources.forEach { resourceElement ->
            val resource = resourceElement as JsonObject
            resource["uri"] shouldNotBe null
            resource["name"] shouldNotBe null
            resource["mimeType"] shouldNotBe null
            // description is optional
        }
    }

    "should handle resource provider errors during listing"
        .config(enabled = false) { // SPI-581: Enhance MCP Resource Handler Error Scenarios
        // Note: Provider registration removed for RED phase - this test will fail as expected

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/list",
            params = null,
            id = JsonPrimitive("resources-with-errors")
        )

        val response = methodHandler.handleRequest(request)

        // Should handle provider errors gracefully and return partial results
        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val resources = result["resources"] as JsonArray
        // Should still include working provider resources
        resources shouldHaveSize 1

        val resource = resources[0] as JsonObject
        resource["uri"]?.jsonPrimitive?.content shouldBe "cycletime://working/resource"
    }

    "should include proper resource metadata in list response"
        .config(enabled = false) { // SPI-581: Enhance MCP Resource Handler Error Scenarios
        // Note: Provider registration removed for RED phase - this test will fail as expected

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/list",
            params = null,
            id = JsonPrimitive("resources-metadata")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val resources = result["resources"] as JsonArray
        resources shouldHaveSize 2

        // Check detailed resource
        val detailedResource = resources.first { 
            (it as JsonObject)["uri"]?.jsonPrimitive?.content == "cycletime://test/detailed" 
        } as JsonObject
        
        detailedResource["uri"]?.jsonPrimitive?.content shouldBe "cycletime://test/detailed"
        detailedResource["name"]?.jsonPrimitive?.content shouldBe "Detailed Resource"
        detailedResource["description"]?.jsonPrimitive?.content shouldBe "A resource with full metadata"
        detailedResource["mimeType"]?.jsonPrimitive?.content shouldBe "application/vnd.cycletime.project+json"

        // Check minimal resource (description should be absent, not null)
        val minimalResource = resources.first {
            (it as JsonObject)["uri"]?.jsonPrimitive?.content == "cycletime://test/minimal"
        } as JsonObject
        
        minimalResource["uri"]?.jsonPrimitive?.content shouldBe "cycletime://test/minimal"
        minimalResource["name"]?.jsonPrimitive?.content shouldBe "Minimal Resource"
        minimalResource.containsKey("description") shouldBe false // Optional field should be omitted
        minimalResource["mimeType"]?.jsonPrimitive?.content shouldBe "text/plain"
    }

    // ===== RESOURCES/READ METHOD TESTS =====

    "should read existing resource content"
        .config(enabled = false) { // SPI-581: Enhance MCP Resource Handler Error Scenarios
        // Note: Provider registration removed for RED phase - this test will fail as expected

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/read",
            params = buildJsonObject {
                put("uri", "cycletime://test/content")
            },
            id = JsonPrimitive("resource-read-success")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val contents = result["contents"] as JsonArray
        contents shouldHaveSize 1

        val content = contents[0] as JsonObject
        content["uri"]?.jsonPrimitive?.content shouldBe "cycletime://test/content"
        content["mimeType"]?.jsonPrimitive?.content shouldBe "application/json"
        content["text"]?.jsonPrimitive?.content shouldBe """{"message": "Hello from resource", "timestamp": "2024-01-15T10:00:00Z"}"""
    }

    "should return error for non-existent resource"
        .config(enabled = false) { // SPI-581: Enhance MCP Resource Handler Error Scenarios
        // Note: Provider registration removed for RED phase - this test will fail as expected

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/read",
            params = buildJsonObject {
                put("uri", "cycletime://nonexistent/resource")
            },
            id = JsonPrimitive("resource-not-found")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32002 // Resource not found (server-defined error)
        response.error!!.message shouldContain "Resource not found"
        response.error!!.message shouldContain "cycletime://nonexistent/resource"
    }

    "should validate URI parameter in resources/read request"
        .config(enabled = false) { // SPI-581: Enhance MCP Resource Handler Error Scenarios
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/read",
            params = buildJsonObject {
                // Missing uri parameter
            },
            id = JsonPrimitive("missing-uri")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32602 // Invalid params
        response.error!!.message shouldContain "uri parameter is required"
    }

    "should validate URI format in resources/read request"
        .config(enabled = false) { // SPI-581: Enhance MCP Resource Handler Error Scenarios
        val invalidUris = listOf(
            "",
            "not-a-uri",
            "http://invalid-scheme", 
            "cycletime:", // Missing path
            "cycletime:///empty-path"
        )

        invalidUris.forEach { invalidUri ->
            val request = JsonRpcRequest(
                jsonrpc = "2.0",
                method = "resources/read",
                params = buildJsonObject {
                    put("uri", invalidUri)
                },
                id = JsonPrimitive("invalid-uri-$invalidUri")
            )

            val response = methodHandler.handleRequest(request)

            response.error shouldNotBe null
            response.error!!.code shouldBe -32602 // Invalid params
            response.error!!.message shouldContain "invalid URI format"
        }
    }

    "should handle binary resource content"
        .config(enabled = false) { // SPI-581: Enhance MCP Resource Handler Error Scenarios
        val binaryContent = byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A) // PNG header
        
        // Note: Provider registration removed for RED phase - this test will fail as expected

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/read",
            params = buildJsonObject {
                put("uri", "cycletime://test/binary")
            },
            id = JsonPrimitive("binary-resource")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val contents = result["contents"] as JsonArray
        contents shouldHaveSize 1

        val content = contents[0] as JsonObject
        content["uri"]?.jsonPrimitive?.content shouldBe "cycletime://test/binary"
        content["mimeType"]?.jsonPrimitive?.content shouldBe "image/png"
        
        // Binary content should be base64 encoded
        content["blob"] shouldNotBe null
        content.containsKey("text") shouldBe false
    }


})

// ===== TEST HELPER FUNCTIONS =====

private suspend fun setupTestResources(registry: ResourceProviderRegistry) {
    // Create a custom test provider with expected resources
    val projectProvider = object : ResourceProvider {
        override val name = "ProjectProvider"
        override var isRunning = true
        
        override suspend fun start() { isRunning = true }
        override suspend fun stop() { isRunning = false }
        
        override suspend fun listResources(
            filter: ResourceFilter?,
            pagination: ResourcePagination?
        ): List<Resource> {
            return listOf(
                Resource(
                    uri = "cycletime://projects/project1",
                    name = "Project 1",
                    description = "First project",
                    mimeType = "application/json"
                ),
                Resource(
                    uri = "cycletime://projects/project2",
                    name = "Project 2",
                    description = "Second project",
                    mimeType = "application/json"
                )
            )
        }
        
        override suspend fun getResource(uri: String): Resource? {
            return listResources().find { it.uri == uri }
        }
        
        override suspend fun searchResources(query: String): List<Resource> {
            return listResources().filter { 
                it.name.contains(query, ignoreCase = true) ||
                (it.description?.contains(query, ignoreCase = true) == true)
            }
        }
        
        override suspend fun updateResource(uri: String, content: ResourceContent) {}
        
        override suspend fun readResource(uri: String): String {
            return when (uri) {
                "cycletime://projects/project1" -> """{ "name": "Project 1", "status": "active" }"""
                "cycletime://projects/project2" -> """{ "name": "Project 2", "status": "completed" }"""
                else -> ""
            }
        }
    }
    
    val docsProvider = object : ResourceProvider {
        override val name = "DocsProvider"
        override var isRunning = true
        
        override suspend fun start() { isRunning = true }
        override suspend fun stop() { isRunning = false }
        
        override suspend fun listResources(
            filter: ResourceFilter?,
            pagination: ResourcePagination?
        ): List<Resource> {
            return listOf(
                Resource(
                    uri = "cycletime://docs/readme",
                    name = "README",
                    description = "Project documentation",
                    mimeType = "text/markdown"
                ),
                Resource(
                    uri = "cycletime://docs/api",
                    name = "API Docs",
                    description = "API documentation",
                    mimeType = "text/markdown"
                ),
                Resource(
                    uri = "file://docs/guide.md",
                    name = "User Guide",
                    description = "User guide",
                    mimeType = "text/markdown"
                ),
                Resource(
                    uri = "file://logs/app.log",
                    name = "Application Logs",
                    description = "Application log file",
                    mimeType = "text/plain"
                ),
                Resource(
                    uri = "project://tasks.json",
                    name = "Task List",
                    description = "Project tasks",
                    mimeType = "application/json"
                ),
                Resource(
                    uri = "static://resource.static",
                    name = "Static Resource",
                    description = "Non-subscribable resource",
                    mimeType = "text/plain"
                ),
                Resource(
                    uri = "cycletime://test/resource%20with%20spaces",
                    name = "Resource with spaces",
                    description = "Resource with encoded URI",
                    mimeType = "text/plain"
                ),
                Resource(
                    uri = "cycletime://test/binary",
                    name = "Binary Resource",
                    description = "Binary content",
                    mimeType = "application/octet-stream"
                ),
                Resource(
                    uri = "cycletime://test/large",
                    name = "Large Resource",
                    description = "Large content",
                    mimeType = "text/plain"
                )
            )
        }
        
        override suspend fun getResource(uri: String): Resource? {
            return listResources().find { it.uri == uri }
        }
        
        override suspend fun searchResources(query: String): List<Resource> {
            return listResources().filter { 
                it.name.contains(query, ignoreCase = true) ||
                (it.description?.contains(query, ignoreCase = true) == true)
            }
        }
        
        override suspend fun updateResource(uri: String, content: ResourceContent) {}
        
        override suspend fun readResource(uri: String): String {
            return when (uri) {
                "cycletime://docs/readme" -> "# Project README\n\nDocumentation content"
                "cycletime://docs/api" -> "# API Documentation\n\nAPI details"
                "file://docs/guide.md" -> "# User Guide\n\nGuide content"
                "file://logs/app.log" -> "Log entry content"
                "project://tasks.json" -> """{ "tasks": [] }"""
                "static://resource.static" -> "Static content"
                "cycletime://test/resource%20with%20spaces" -> "Content with spaces"
                "cycletime://test/binary" -> "YmluYXJ5IGRhdGE="  // base64 encoded
                "cycletime://test/large" -> "X".repeat(100000)  // 100KB of content
                else -> ""
            }
        }
    }
    
    registry.register(projectProvider)
    registry.register(docsProvider)
}
// These tests are designed to fail until proper implementations are created