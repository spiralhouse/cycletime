package io.spiralhouse.cycletime.integration.mcp

import kotlinx.serialization.json.*
import java.util.concurrent.atomic.AtomicInteger

/**
 * Comprehensive utilities for MCP protocol testing and validation.
 * 
 * This utility class provides:
 * - JSON-RPC 2.0 message builders and validators
 * - MCP-specific method request/response generators
 * - Protocol compliance validation helpers
 * - Test data factories for all MCP message types
 * - Error response validation and analysis
 * - Performance and load testing utilities
 * 
 * Used by integration tests to ensure complete MCP protocol compliance
 * and proper error handling across all message types.
 */
object McpProtocolTestUtils {
    
    private val requestIdCounter = AtomicInteger(1000)
    
    private val json = Json {
        ignoreUnknownKeys = true
        prettyPrint = true
    }
    
    // JSON-RPC 2.0 Core Protocol Methods
    
    /**
     * Creates properly formatted JSON-RPC 2.0 request.
     */
    fun createJsonRpcRequest(
        method: String,
        params: JsonElement? = null,
        id: String? = null
    ): JsonObject = buildJsonObject {
        put("jsonrpc", "2.0")
        put("id", id ?: "req-${requestIdCounter.incrementAndGet()}")
        put("method", method)
        if (params != null) {
            put("params", params)
        }
    }
    
    /**
     * Creates JSON-RPC 2.0 success response.
     */
    fun createJsonRpcResponse(
        result: JsonElement,
        id: String
    ): JsonObject = buildJsonObject {
        put("jsonrpc", "2.0")
        put("id", id)
        put("result", result)
    }
    
    /**
     * Creates JSON-RPC 2.0 error response.
     */
    fun createJsonRpcError(
        code: Int,
        message: String,
        data: JsonElement? = null,
        id: String? = null
    ): JsonObject = buildJsonObject {
        put("jsonrpc", "2.0")
        if (id != null) put("id", id) else put("id", JsonNull)
        put("error", buildJsonObject {
            put("code", code)
            put("message", message)
            if (data != null) put("data", data)
        })
    }
    
    // MCP Initialize Method
    
    /**
     * Creates MCP initialize request.
     */
    fun createInitializeRequest(
        protocolVersion: String = "2024-11-05",
        clientName: String = "Test-Client",
        clientVersion: String = "1.0.0-test"
    ): JsonObject = createJsonRpcRequest(
        method = "initialize",
        params = buildJsonObject {
            put("protocolVersion", protocolVersion)
            put("capabilities", buildJsonObject {
                put("resources", buildJsonObject {
                    put("subscribe", true)
                    put("listChanged", true)
                })
                put("tools", buildJsonObject {})
                put("logging", buildJsonObject {})
                put("prompts", buildJsonObject {
                    put("listChanged", true)
                })
            })
            put("clientInfo", buildJsonObject {
                put("name", clientName)
                put("version", clientVersion)
            })
        }
    )
    
    /**
     * Creates expected MCP initialize response.
     */
    fun createInitializeResponse(
        protocolVersion: String = "2024-11-05",
        serverName: String = "CycleTime-CE",
        serverVersion: String = "1.0.0"
    ): JsonElement = buildJsonObject {
        put("protocolVersion", protocolVersion)
        put("capabilities", buildJsonObject {
            put("resources", buildJsonObject {
                put("subscribe", true)
                put("listChanged", true)
            })
            put("tools", buildJsonObject {})
            put("logging", buildJsonObject {
                put("level", "info")
            })
        })
        put("serverInfo", buildJsonObject {
            put("name", serverName)
            put("version", serverVersion)
            put("description", "CycleTime Community Edition - Project Orchestration Framework")
        })
    }
    
    // MCP Tools Methods
    
    /**
     * Creates tools/list request.
     */
    fun createToolsListRequest(): JsonObject = createJsonRpcRequest("tools/list")
    
    /**
     * Creates tools/call request.
     */
    fun createToolsCallRequest(
        toolName: String,
        arguments: JsonObject = buildJsonObject {}
    ): JsonObject = createJsonRpcRequest(
        method = "tools/call",
        params = buildJsonObject {
            put("name", toolName)
            put("arguments", arguments)
        }
    )
    
    /**
     * Creates expected CycleTime tools list response.
     */
    fun createExpectedToolsList(): JsonElement = buildJsonObject {
        put("tools", buildJsonArray {
            add(createToolDefinition(
                name = "create_project",
                description = "Creates a new project in CycleTime",
                inputSchema = buildJsonObject {
                    put("type", "object")
                    put("properties", buildJsonObject {
                        put("name", buildJsonObject {
                            put("type", "string")
                            put("description", "Project name")
                        })
                        put("description", buildJsonObject {
                            put("type", "string")
                            put("description", "Project description")
                        })
                    })
                    put("required", buildJsonArray { 
                        add("name")
                    })
                }
            ))
            add(createToolDefinition(
                name = "create_issue",
                description = "Creates a new issue in a CycleTime project",
                inputSchema = buildJsonObject {
                    put("type", "object")
                    put("properties", buildJsonObject {
                        put("projectId", buildJsonObject {
                            put("type", "string")
                            put("description", "ID of the project to create issue in")
                        })
                        put("title", buildJsonObject {
                            put("type", "string")
                            put("description", "Issue title")
                        })
                        put("description", buildJsonObject {
                            put("type", "string")
                            put("description", "Issue description")
                        })
                    })
                    put("required", buildJsonArray { 
                        add("projectId")
                        add("title")
                    })
                }
            ))
            add(createToolDefinition(
                name = "get_next_task",
                description = "Gets the next task from current session workflow",
                inputSchema = buildJsonObject {
                    put("type", "object")
                    put("properties", buildJsonObject {})
                    put("additionalProperties", false)
                }
            ))
        })
    }
    
    private fun createToolDefinition(
        name: String,
        description: String,
        inputSchema: JsonObject
    ): JsonObject = buildJsonObject {
        put("name", name)
        put("description", description)
        put("inputSchema", inputSchema)
    }
    
    // MCP Resources Methods
    
    /**
     * Creates resources/list request.
     */
    fun createResourcesListRequest(): JsonObject = createJsonRpcRequest("resources/list")
    
    /**
     * Creates resources/read request.
     */
    fun createResourcesReadRequest(uri: String): JsonObject = createJsonRpcRequest(
        method = "resources/read",
        params = buildJsonObject {
            put("uri", uri)
        }
    )
    
    /**
     * Creates expected CycleTime resources list response.
     */
    fun createExpectedResourcesList(): JsonElement = buildJsonObject {
        put("resources", buildJsonArray {
            add(createResourceDefinition(
                uri = "cycletime://session/current",
                name = "Current Session",
                description = "Information about the current CycleTime session",
                mimeType = "application/json"
            ))
            add(createResourceDefinition(
                uri = "cycletime://projects",
                name = "Projects List",
                description = "List of all projects in the workspace",
                mimeType = "application/json"
            ))
            add(createResourceDefinition(
                uri = "cycletime://issues",
                name = "Issues List",
                description = "List of all issues across all projects",
                mimeType = "application/json"
            ))
        })
    }
    
    private fun createResourceDefinition(
        uri: String,
        name: String,
        description: String,
        mimeType: String
    ): JsonObject = buildJsonObject {
        put("uri", uri)
        put("name", name)
        put("description", description)
        put("mimeType", mimeType)
    }
    
    // Protocol Validation Helpers
    
    /**
     * Validates JSON-RPC 2.0 message structure.
     */
    fun validateJsonRpcMessage(message: JsonElement): ValidationResult {
        val issues = mutableListOf<String>()
        
        if (message !is JsonObject) {
            return ValidationResult(false, listOf("Message must be a JSON object"))
        }
        
        // Check required jsonrpc field
        val jsonrpcVersion = message["jsonrpc"]?.jsonPrimitive?.content
        if (jsonrpcVersion != "2.0") {
            issues.add("Missing or invalid 'jsonrpc' field: expected '2.0', got '$jsonrpcVersion'")
        }
        
        // Check id field (required for requests and success responses, null for error responses)
        if (!message.containsKey("id")) {
            issues.add("Missing 'id' field")
        }
        
        // Check method field for requests
        if (message.containsKey("method")) {
            val method = message["method"]?.jsonPrimitive?.content
            if (method.isNullOrBlank()) {
                issues.add("Invalid 'method' field: must be non-empty string")
            }
        }
        
        // Check result/error exclusivity for responses
        val hasResult = message.containsKey("result")
        val hasError = message.containsKey("error")
        val hasMethod = message.containsKey("method")
        
        if (!hasMethod) { // This is a response
            if (hasResult && hasError) {
                issues.add("Response cannot have both 'result' and 'error' fields")
            }
            if (!hasResult && !hasError) {
                issues.add("Response must have either 'result' or 'error' field")
            }
        }
        
        return ValidationResult(issues.isEmpty(), issues)
    }
    
    /**
     * Validates MCP initialize response structure.
     */
    fun validateInitializeResponse(response: JsonElement): ValidationResult {
        val issues = mutableListOf<String>()
        
        // First validate as JSON-RPC response
        val jsonRpcResult = validateJsonRpcMessage(response)
        if (!jsonRpcResult.isValid) {
            return jsonRpcResult
        }
        
        val obj = response.jsonObject
        val result = obj["result"]?.jsonObject
        
        if (result == null) {
            issues.add("Initialize response missing 'result' object")
            return ValidationResult(false, issues)
        }
        
        // Check required MCP initialize fields
        if (result["protocolVersion"]?.jsonPrimitive?.content.isNullOrBlank()) {
            issues.add("Initialize result missing 'protocolVersion'")
        }
        
        if (result["capabilities"] == null) {
            issues.add("Initialize result missing 'capabilities'")
        }
        
        if (result["serverInfo"] == null) {
            issues.add("Initialize result missing 'serverInfo'")
        }
        
        return ValidationResult(issues.isEmpty(), issues)
    }
    
    /**
     * Validates tools list response structure.
     */
    fun validateToolsListResponse(response: JsonElement): ValidationResult {
        val issues = mutableListOf<String>()
        
        val jsonRpcResult = validateJsonRpcMessage(response)
        if (!jsonRpcResult.isValid) {
            return jsonRpcResult
        }
        
        val obj = response.jsonObject
        val result = obj["result"]?.jsonObject
        
        if (result == null) {
            issues.add("Tools list response missing 'result' object")
            return ValidationResult(false, issues)
        }
        
        val tools = result["tools"]?.jsonArray
        if (tools == null) {
            issues.add("Tools list result missing 'tools' array")
            return ValidationResult(false, issues)
        }
        
        // Validate each tool definition
        tools.forEachIndexed { index, tool ->
            val toolObj = tool.jsonObject
            
            if (toolObj["name"]?.jsonPrimitive?.content.isNullOrBlank()) {
                issues.add("Tool at index $index missing or invalid 'name'")
            }
            
            if (toolObj["description"]?.jsonPrimitive?.content.isNullOrBlank()) {
                issues.add("Tool at index $index missing or invalid 'description'")
            }
            
            if (toolObj["inputSchema"] == null) {
                issues.add("Tool at index $index missing 'inputSchema'")
            }
        }
        
        return ValidationResult(issues.isEmpty(), issues)
    }
    
    /**
     * Validates resources list response structure.
     */
    fun validateResourcesListResponse(response: JsonElement): ValidationResult {
        val issues = mutableListOf<String>()
        
        val jsonRpcResult = validateJsonRpcMessage(response)
        if (!jsonRpcResult.isValid) {
            return jsonRpcResult
        }
        
        val obj = response.jsonObject
        val result = obj["result"]?.jsonObject
        
        if (result == null) {
            issues.add("Resources list response missing 'result' object")
            return ValidationResult(false, issues)
        }
        
        val resources = result["resources"]?.jsonArray
        if (resources == null) {
            issues.add("Resources list result missing 'resources' array")
            return ValidationResult(false, issues)
        }
        
        // Validate each resource definition
        resources.forEachIndexed { index, resource ->
            val resourceObj = resource.jsonObject
            
            if (resourceObj["uri"]?.jsonPrimitive?.content.isNullOrBlank()) {
                issues.add("Resource at index $index missing or invalid 'uri'")
            }
            
            if (resourceObj["name"]?.jsonPrimitive?.content.isNullOrBlank()) {
                issues.add("Resource at index $index missing or invalid 'name'")
            }
        }
        
        return ValidationResult(issues.isEmpty(), issues)
    }
    
    /**
     * Validates tool call response structure.
     */
    fun validateToolCallResponse(response: JsonElement): ValidationResult {
        val issues = mutableListOf<String>()
        
        val jsonRpcResult = validateJsonRpcMessage(response)
        if (!jsonRpcResult.isValid) {
            return jsonRpcResult
        }
        
        val obj = response.jsonObject
        
        if (obj["result"] != null) {
            // Success response
            val result = obj["result"]?.jsonObject
            if (result == null) {
                issues.add("Tool call success response 'result' must be object")
                return ValidationResult(false, issues)
            }
            
            if (result["content"] == null) {
                issues.add("Tool call success response missing 'content'")
            }
        } else if (obj["error"] != null) {
            // Error response - validate error structure
            val error = obj["error"]?.jsonObject
            if (error == null) {
                issues.add("Tool call error response 'error' must be object")
                return ValidationResult(false, issues)
            }
            
            if (error["code"]?.jsonPrimitive?.int == null) {
                issues.add("Tool call error missing or invalid 'code'")
            }
            
            if (error["message"]?.jsonPrimitive?.content.isNullOrBlank()) {
                issues.add("Tool call error missing or invalid 'message'")
            }
        }
        
        return ValidationResult(issues.isEmpty(), issues)
    }
    
    // Error Testing Utilities
    
    /**
     * Creates various malformed JSON-RPC messages for error testing.
     */
    fun createMalformedMessages(): List<String> = listOf(
        // Malformed JSON
        """{"jsonrpc":"2.0","id":"1","method":"test" // missing closing brace""",
        
        // Invalid JSON-RPC structure
        """{"id":"1","method":"test"}""", // Missing jsonrpc
        """{"jsonrpc":"2.0","id":"1"}""", // Missing method
        """{"jsonrpc":"1.0","id":"1","method":"test"}""", // Wrong version
        
        // Invalid data types
        """{"jsonrpc":2.0,"id":"1","method":"test"}""", // jsonrpc as number
        """{"jsonrpc":"2.0","id":"1","method":123}""", // method as number
        
        // Empty/null values
        """{"jsonrpc":"2.0","id":"1","method":""}""", // Empty method
        """{"jsonrpc":"2.0","id":"1","method":null}""", // Null method
        
        // Not JSON at all
        "not json",
        "",
        "null"
    )
    
    /**
     * Creates invalid MCP method calls for error testing.
     */
    fun createInvalidMethodCalls(): List<JsonObject> = listOf(
        // Unknown method
        createJsonRpcRequest("unknown/method"),
        
        // Invalid parameters
        createJsonRpcRequest("tools/call", buildJsonObject {
            // Missing required 'name' parameter
            put("arguments", buildJsonObject {})
        }),
        
        // Tool call with invalid tool name
        createToolsCallRequest("nonexistent_tool"),
        
        // Resource read with invalid URI
        createResourcesReadRequest("invalid://uri/format"),
        
        // Initialize with invalid protocol version
        createInitializeRequest(protocolVersion = "invalid-version")
    )
    
    // Performance Testing Utilities
    
    /**
     * Generates large number of concurrent requests for load testing.
     */
    fun generateLoadTestRequests(count: Int): List<JsonObject> =
        (1..count).map { index ->
            when (index % 3) {
                0 -> createToolsListRequest()
                1 -> createResourcesListRequest()
                else -> createToolsCallRequest("get_next_task")
            }
        }
    
    /**
     * Creates request with large payload for stress testing.
     */
    fun createLargePayloadRequest(): JsonObject {
        val largeArguments = buildJsonObject {
            put("data", buildJsonArray {
                repeat(1000) { index ->
                    add("Large payload item $index with lots of text to increase message size")
                }
            })
        }
        
        return createToolsCallRequest("create_project", largeArguments)
    }
}

/**
 * Result of protocol validation.
 */
data class ValidationResult(
    val isValid: Boolean,
    val issues: List<String> = emptyList()
) {
    fun throwIfInvalid() {
        if (!isValid) {
            throw McpProtocolValidationException("Protocol validation failed: ${issues.joinToString(", ")}")
        }
    }
}

/**
 * Exception for MCP protocol validation failures.
 */
class McpProtocolValidationException(message: String) : Exception(message)