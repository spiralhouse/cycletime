package io.spiralhouse.cycletime.mcp.integration.fixtures

import kotlinx.serialization.json.*
import java.time.Instant
import java.util.UUID

/**
 * Factory for creating comprehensive MCP protocol test data.
 * 
 * This factory provides:
 * - Pre-built MCP request/response message templates
 * - Sample project/issue/workflow creation parameters
 * - Error scenario data sets (malformed JSON, invalid parameters)
 * - Performance testing payloads with multiple concurrent requests
 * - Protocol compliance validation data
 * 
 * DESIGN FOR FAILURE: Test data is designed to expose missing integration
 * points during RED phase by covering all MCP specification requirements.
 */
object TestDataFactory {
    
    private val json = Json { 
        ignoreUnknownKeys = true
        prettyPrint = true
    }
    
    // Request ID generator for test data
    private var requestIdCounter = 1
    private fun nextRequestId(): String = "test-${requestIdCounter++}"
    
    // Protocol Messages
    
    /**
     * Standard MCP initialize request following 2024-11-05 specification.
     */
    fun createInitializeRequest(
        clientName: String = "CycleTime-Test-Client",
        clientVersion: String = "1.0.0-test",
        protocolVersion: String = "2024-11-05"
    ): JsonObject = buildJsonObject {
        put("jsonrpc", "2.0")
        put("id", nextRequestId())
        put("method", "initialize")
        put("params", buildJsonObject {
            put("protocolVersion", protocolVersion)
            put("capabilities", buildJsonObject {
                put("resources", buildJsonObject {
                    put("subscribe", true)
                    put("listChanged", true)
                })
                put("tools", buildJsonObject { })
                put("logging", buildJsonObject {
                    put("level", "info")
                })
                put("prompts", buildJsonObject {
                    put("listChanged", true)
                })
                put("roots", buildJsonObject {
                    put("listChanged", true)
                })
            })
            put("clientInfo", buildJsonObject {
                put("name", clientName)
                put("version", clientVersion)
            })
        })
    }
    
    /**
     * Expected initialize response structure.
     * Will fail if server doesn't implement proper capabilities.
     */
    fun createInitializeResponse(requestId: String): JsonObject = buildJsonObject {
        put("jsonrpc", "2.0")
        put("id", requestId)
        put("result", buildJsonObject {
            put("protocolVersion", "2024-11-05")
            put("capabilities", buildJsonObject {
                put("resources", buildJsonObject {
                    put("subscribe", true)
                    put("listChanged", true)
                })
                put("tools", buildJsonObject {
                    put("listChanged", false)
                })
                put("logging", buildJsonObject { })
                put("prompts", buildJsonObject {
                    put("listChanged", false)
                })
                put("roots", buildJsonObject {
                    put("listChanged", false)
                })
            })
            put("serverInfo", buildJsonObject {
                put("name", "CycleTime-CE")
                put("version", "1.0.0")
            })
        })
    }
    
    /**
     * Tools list request.
     */
    fun createToolsListRequest(): JsonObject = buildJsonObject {
        put("jsonrpc", "2.0")
        put("id", nextRequestId())
        put("method", "tools/list")
    }
    
    /**
     * Expected tools list response with CycleTime tools.
     * Will fail if tool registry is not properly populated.
     */
    fun createExpectedToolsListResponse(): List<String> = listOf(
        "create_project",
        "list_projects",
        "get_project",
        "update_project",
        "create_issue",
        "list_issues",
        "get_issue",
        "update_issue",
        "create_session",
        "get_active_session",
        "list_sessions",
        "get_next_task",
        "create_workflow",
        "list_workflows",
        "execute_workflow_stage"
    )
    
    /**
     * Resources list request.
     */
    fun createResourcesListRequest(): JsonObject = buildJsonObject {
        put("jsonrpc", "2.0")
        put("id", nextRequestId())
        put("method", "resources/list")
    }
    
    /**
     * Expected resources list response with CycleTime resources.
     * Will fail if resource registry is not properly populated.
     */
    fun createExpectedResourcesList(): List<String> = listOf(
        "cycletime://projects",
        "cycletime://projects/{id}",
        "cycletime://issues",
        "cycletime://issues/{id}",
        "cycletime://sessions",
        "cycletime://sessions/{id}",
        "cycletime://sessions/active",
        "cycletime://workflows",
        "cycletime://workflows/{id}",
        "cycletime://tasks/next"
    )
    
    /**
     * Resource read request for projects list.
     */
    fun createResourceReadRequest(uri: String): JsonObject = buildJsonObject {
        put("jsonrpc", "2.0")
        put("id", nextRequestId())
        put("method", "resources/read")
        put("params", buildJsonObject {
            put("uri", uri)
        })
    }
    
    // Tool Call Test Data
    
    /**
     * Create project tool call with valid parameters.
     */
    fun createProjectToolCall(
        name: String = "Test Project",
        description: String = "Integration test project"
    ): JsonObject = buildJsonObject {
        put("jsonrpc", "2.0")
        put("id", nextRequestId())
        put("method", "tools/call")
        put("params", buildJsonObject {
            put("name", "create_project")
            put("arguments", buildJsonObject {
                put("name", name)
                put("description", description)
                put("status", "active")
                put("metadata", buildJsonObject {
                    put("created_by", "integration-test")
                    put("test_run", true)
                })
            })
        })
    }
    
    /**
     * Create issue tool call with valid parameters.
     */
    fun createIssueToolCall(
        projectId: String,
        title: String = "Test Issue",
        description: String = "Integration test issue"
    ): JsonObject = buildJsonObject {
        put("jsonrpc", "2.0")
        put("id", nextRequestId())
        put("method", "tools/call")
        put("params", buildJsonObject {
            put("name", "create_issue")
            put("arguments", buildJsonObject {
                put("projectId", projectId)
                put("title", title)
                put("description", description)
                put("type", "subtask")
                put("status", "todo")
                put("priority", "medium")
                put("estimate", 3)
                put("metadata", buildJsonObject {
                    put("created_by", "integration-test")
                    put("component", "testing")
                })
            })
        })
    }
    
    /**
     * List projects tool call.
     */
    fun createListProjectsToolCall(): JsonObject = buildJsonObject {
        put("jsonrpc", "2.0")
        put("id", nextRequestId())
        put("method", "tools/call")
        put("params", buildJsonObject {
            put("name", "list_projects")
            put("arguments", buildJsonObject {
                put("status", "active")
                put("limit", 100)
            })
        })
    }
    
    /**
     * Get next task tool call for workflow testing.
     */
    fun createGetNextTaskToolCall(sessionId: String): JsonObject = buildJsonObject {
        put("jsonrpc", "2.0")
        put("id", nextRequestId())
        put("method", "tools/call")
        put("params", buildJsonObject {
            put("name", "get_next_task")
            put("arguments", buildJsonObject {
                put("session_id", sessionId)
                put("context", buildJsonObject {
                    put("current_stage", "development")
                    put("available_time", "2h")
                })
            })
        })
    }
    
    // Error Scenario Data
    
    /**
     * Malformed JSON strings for error testing.
     */
    fun getMalformedJsonExamples(): List<String> = listOf(
        "{invalid json",
        "{'single': 'quotes'}",
        "{\"trailing\": \"comma\",}",
        "{\"unclosed\": \"string",
        "null",
        "",
        "{\"missing\": }",
        "{duplicate: duplicate}",
        "not json at all",
        "{\"nested\": {\"broken\": }}"
    )
    
    /**
     * Invalid MCP requests for protocol testing.
     */
    fun getInvalidMcpRequests(): List<JsonObject> = listOf(
        // Missing jsonrpc version
        buildJsonObject {
            put("id", "test-1")
            put("method", "initialize")
        },
        // Wrong jsonrpc version
        buildJsonObject {
            put("jsonrpc", "1.0")
            put("id", "test-2")
            put("method", "initialize")
        },
        // Missing method
        buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", "test-3")
        },
        // Invalid method name
        buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", "test-4")
            put("method", "invalid_method")
        },
        // Missing required parameters
        buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", "test-5")
            put("method", "tools/call")
            // Missing params.name
        },
        // Invalid parameter types
        buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", "test-6")
            put("method", "tools/call")
            put("params", buildJsonObject {
                put("name", 123) // Should be string
                put("arguments", "invalid") // Should be object
            })
        }
    )
    
    /**
     * Tool call requests with invalid parameters.
     */
    fun getInvalidToolCalls(): List<JsonObject> = listOf(
        // Missing required project name
        buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", nextRequestId())
            put("method", "tools/call")
            put("params", buildJsonObject {
                put("name", "create_project")
                put("arguments", buildJsonObject {
                    put("description", "Missing name")
                })
            })
        },
        // Invalid project status
        buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", nextRequestId())
            put("method", "tools/call")
            put("params", buildJsonObject {
                put("name", "create_project")
                put("arguments", buildJsonObject {
                    put("name", "Test Project")
                    put("status", "invalid_status")
                })
            })
        },
        // Invalid issue estimate
        buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", nextRequestId())
            put("method", "tools/call")
            put("params", buildJsonObject {
                put("name", "create_issue")
                put("arguments", buildJsonObject {
                    put("project_id", UUID.randomUUID().toString())
                    put("title", "Test Issue")
                    put("estimate", -1) // Invalid negative estimate
                })
            })
        },
        // Non-existent project reference
        buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", nextRequestId())
            put("method", "tools/call")
            put("params", buildJsonObject {
                put("name", "create_issue")
                put("arguments", buildJsonObject {
                    put("project_id", "non-existent-id")
                    put("title", "Test Issue")
                })
            })
        }
    )
    
    // Performance Testing Data
    
    /**
     * Creates a batch of concurrent tool call requests for performance testing.
     */
    fun createConcurrentToolCallBatch(batchSize: Int = 10): List<JsonObject> = 
        (1..batchSize).map { index ->
            buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", "perf-${index}")
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "create_project")
                    put("arguments", buildJsonObject {
                        put("name", "Performance Test Project ${index}")
                        put("description", "Generated for performance testing")
                        put("status", "active")
                    })
                })
            }
        }
    
    /**
     * Creates a batch of concurrent resource read requests.
     */
    fun createConcurrentResourceReadBatch(batchSize: Int = 10): List<JsonObject> =
        (1..batchSize).map { index ->
            buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", "resource-perf-${index}")
                put("method", "resources/read")
                put("params", buildJsonObject {
                    put("uri", "cycletime://projects")
                })
            }
        }
    
    /**
     * Creates large payload for stress testing serialization/deserialization.
     */
    fun createLargePayloadToolCall(): JsonObject = buildJsonObject {
        put("jsonrpc", "2.0")
        put("id", nextRequestId())
        put("method", "tools/call")
        put("params", buildJsonObject {
            put("name", "create_project")
            put("arguments", buildJsonObject {
                put("name", "Large Payload Test")
                put("description", "A".repeat(10000)) // Large description
                put("metadata", buildJsonObject {
                    // Large nested structure
                    (1..100).forEach { index ->
                        put("field_${index}", "Large data field ${index} with substantial content")
                    }
                })
            })
        })
    }
    
    // Validation Helpers
    
    /**
     * Expected error codes for different scenarios.
     */
    object ExpectedErrorCodes {
        const val PARSE_ERROR = -32700
        const val INVALID_REQUEST = -32600
        const val METHOD_NOT_FOUND = -32601
        const val INVALID_PARAMS = -32602
        const val INTERNAL_ERROR = -32603
        const val SERVER_ERROR_START = -32099
        const val SERVER_ERROR_END = -32000
    }
    
    /**
     * Validates that a response contains expected tool names.
     */
    fun validateToolsInResponse(response: JsonElement, expectedTools: List<String>): List<String> {
        val result = response.jsonObject["result"]?.jsonObject
            ?: throw AssertionError("Response missing result object")
        
        val tools = result["tools"]?.jsonArray
            ?: throw AssertionError("Response missing tools array")
        
        val foundTools = tools.mapNotNull { tool ->
            tool.jsonObject["name"]?.jsonPrimitive?.content
        }
        
        val missingTools = expectedTools - foundTools.toSet()
        if (missingTools.isNotEmpty()) {
            throw AssertionError("Missing expected tools: $missingTools")
        }
        
        return foundTools
    }
    
    /**
     * Validates that a response contains expected resource URIs.
     */
    fun validateResourcesInResponse(response: JsonElement, expectedResources: List<String>): List<String> {
        val result = response.jsonObject["result"]?.jsonObject
            ?: throw AssertionError("Response missing result object")
        
        val resources = result["resources"]?.jsonArray
            ?: throw AssertionError("Response missing resources array")
        
        val foundResources = resources.mapNotNull { resource ->
            resource.jsonObject["uri"]?.jsonPrimitive?.content
        }
        
        val missingResources = expectedResources - foundResources.toSet()
        if (missingResources.isNotEmpty()) {
            throw AssertionError("Missing expected resources: $missingResources")
        }
        
        return foundResources
    }
    
    /**
     * Creates sample project data for integration testing.
     */
    fun createSampleProject(
        name: String = "Integration Test Project",
        description: String = "Created during integration test execution"
    ): Map<String, Any> = mapOf(
        "name" to name,
        "description" to description,
        "status" to "active",
        "created_at" to Instant.now().toString(),
        "metadata" to mapOf(
            "test_project" to true,
            "created_by" to "integration_test",
            "environment" to "test"
        )
    )
    
    /**
     * Creates sample issue data for integration testing.
     */
    fun createSampleIssue(
        projectId: String,
        title: String = "Integration Test Issue",
        description: String = "Created during integration test execution"
    ): Map<String, Any> = mapOf(
        "project_id" to projectId,
        "title" to title,
        "description" to description,
        "type" to "subtask",
        "status" to "todo",
        "priority" to "medium",
        "estimate" to 3,
        "created_at" to Instant.now().toString(),
        "metadata" to mapOf(
            "test_issue" to true,
            "component" to "integration_test",
            "created_by" to "test_automation"
        )
    )
    
    /**
     * Reset request ID counter for deterministic test execution.
     */
    fun resetRequestIdCounter() {
        requestIdCounter = 1
    }
}

/**
 * Builder for creating complex test scenarios with multiple related requests.
 */
class TestScenarioBuilder {
    private val requests = mutableListOf<JsonObject>()
    private val expectedResponses = mutableListOf<JsonElement>()
    
    fun addInitialize(clientName: String = "Test-Client"): TestScenarioBuilder {
        requests.add(TestDataFactory.createInitializeRequest(clientName))
        return this
    }
    
    fun addToolsList(): TestScenarioBuilder {
        requests.add(TestDataFactory.createToolsListRequest())
        return this
    }
    
    fun addResourcesList(): TestScenarioBuilder {
        requests.add(TestDataFactory.createResourcesListRequest())
        return this
    }
    
    fun addProjectCreation(name: String, description: String): TestScenarioBuilder {
        requests.add(TestDataFactory.createProjectToolCall(name, description))
        return this
    }
    
    fun addIssueCreation(projectId: String, title: String, description: String): TestScenarioBuilder {
        requests.add(TestDataFactory.createIssueToolCall(projectId, title, description))
        return this
    }
    
    fun build(): TestScenario = TestScenario(requests.toList(), expectedResponses.toList())
}

/**
 * Complete test scenario with requests and expected outcomes.
 */
data class TestScenario(
    val requests: List<JsonObject>,
    val expectedResponses: List<JsonElement>
)