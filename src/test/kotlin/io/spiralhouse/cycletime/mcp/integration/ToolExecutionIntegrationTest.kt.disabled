package io.spiralhouse.cycletime.mcp.integration

import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldNotContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.comparables.shouldBeLessThan
import io.kotest.assertions.timing.eventually
import io.spiralhouse.cycletime.mcp.integration.fixtures.MCPIntegrationTestBase
import io.spiralhouse.cycletime.mcp.integration.fixtures.TestDataFactory
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.serialization.json.*
import kotlin.time.Duration.Companion.seconds

/**
 * Integration tests for MCP tool execution workflows and business logic integration.
 * 
 * These tests verify complete integration between:
 * - MCP tool registry and domain service implementations
 * - Tool parameter validation against JSON schemas
 * - Tool execution pipeline with proper error handling
 * - CRUD operations through MCP tools (create → read → update → delete)
 * - Tool result formatting and content structure
 * - Cross-tool workflows (project → issue → session → task)
 * - Tool execution persistence and data consistency
 * - Tool error scenarios and business rule validation
 * 
 * RED PHASE EXPECTATION: ALL TESTS SHOULD FAIL
 * These tests will fail during RED phase due to:
 * - Tool registry not populated with CycleTime tools
 * - Tool implementations not connected to domain services
 * - Parameter validation not implemented
 * - Tool execution pipeline missing
 * - Business logic integration incomplete
 * - Error handling and validation missing
 * 
 * Each failure will guide GREEN phase implementation of complete tool workflows.
 */
class ToolExecutionIntegrationTest : MCPIntegrationTestBase() {

    init {
        "should create and retrieve project via MCP tools with complete CRUD workflow" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // Create project
                val createRequest = TestDataFactory.createProjectToolCall(
                    name = "CRUD Workflow Test Project",
                    description = "Testing complete CRUD operations through MCP tools"
                )
                
                // EXPECTED FAILURE: create_project tool not registered/implemented
                val createResponse = client.sendRequest(createRequest)
                validateToolCallResponse(createResponse, "create_project")
                
                // Extract project ID from response
                val result = createResponse.jsonObject["result"]?.jsonObject
                val content = result?.get("content")?.jsonArray?.get(0)?.jsonObject
                val projectInfo = content?.get("text")?.jsonPrimitive?.content
                projectInfo shouldNotBe null
                projectInfo!! shouldContain "CRUD Workflow Test Project"
                
                // Extract project ID (format dependent on tool implementation)
                val projectId = extractProjectIdFromToolResponse(projectInfo)
                
                // Retrieve project using get_project tool
                val getRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "get-project-test")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("name", "get_project")
                        put("arguments", buildJsonObject {
                            put("project_id", projectId)
                        })
                    })
                }
                
                // EXPECTED FAILURE: get_project tool not implemented
                val getResponse = client.sendRequest(getRequest)
                validateToolCallResponse(getResponse, "get_project")
                
                val getResult = getResponse.jsonObject["result"]?.jsonObject
                val getContent = getResult?.get("content")?.jsonArray?.get(0)?.jsonObject?.get("text")?.jsonPrimitive?.content
                getContent shouldNotBe null
                getContent!! shouldContain projectId
                getContent shouldContain "CRUD Workflow Test Project"
                
                // Update project
                val updateRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "update-project-test")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("name", "update_project")
                        put("arguments", buildJsonObject {
                            put("project_id", projectId)
                            put("description", "Updated description via MCP tool")
                            put("status", "in_progress")
                        })
                    })
                }
                
                // EXPECTED FAILURE: update_project tool not implemented
                val updateResponse = client.sendRequest(updateRequest)
                validateToolCallResponse(updateResponse, "update_project")
                
                // Verify update by retrieving again
                val verifyResponse = client.sendRequest(getRequest)
                val verifyContent = verifyResponse.jsonObject["result"]?.jsonObject
                    ?.get("content")?.jsonArray?.get(0)?.jsonObject
                    ?.get("text")?.jsonPrimitive?.content
                    
                verifyContent!! shouldContain "Updated description via MCP tool"
                verifyContent shouldContain "in_progress"
            }
        }
        
        "should create issue hierarchy via MCP tools with parent-child relationships" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // First create a project
                val projectId = createTestProject(client, "Issue Hierarchy Test Project")
                
                // Create parent issue
                val parentIssueRequest = TestDataFactory.createIssueToolCall(
                    projectId = projectId,
                    title = "Parent Epic Issue",
                    description = "Epic for testing issue hierarchy"
                )
                
                // EXPECTED FAILURE: create_issue tool not implemented
                val parentResponse = client.sendRequest(parentIssueRequest)
                validateToolCallResponse(parentResponse, "create_issue")
                
                val parentId = extractIssueIdFromToolResponse(parentResponse)
                
                // Create child issues
                val childIssueRequests = (1..3).map { index ->
                    buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", "child-issue-$index")
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "create_issue")
                            put("arguments", buildJsonObject {
                                put("project_id", projectId)
                                put("title", "Child Issue $index")
                                put("description", "Child issue for hierarchy testing")
                                put("parent_id", parentId)
                                put("type", "task")
                                put("estimate", index * 2)
                            })
                        })
                    }
                }
                
                val childResponses = childIssueRequests.map { request ->
                    client.sendRequest(request)
                }
                
                childResponses.forEach { response ->
                    validateToolCallResponse(response, "create_issue")
                }
                
                val childIds = childResponses.map { response ->
                    extractIssueIdFromToolResponse(response)
                }
                
                // Verify parent-child relationships
                val listIssuesRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "list-issues-hierarchy")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("name", "list_issues")
                        put("arguments", buildJsonObject {
                            put("project_id", projectId)
                            put("include_children", true)
                        })
                    })
                }
                
                // EXPECTED FAILURE: list_issues tool not implemented with hierarchy support
                val listResponse = client.sendRequest(listIssuesRequest)
                validateToolCallResponse(listResponse, "list_issues")
                
                val listContent = listResponse.jsonObject["result"]?.jsonObject
                    ?.get("content")?.jsonArray?.get(0)?.jsonObject
                    ?.get("text")?.jsonPrimitive?.content
                
                // Verify all issues are listed
                listContent!! shouldContain parentId
                childIds.forEach { childId ->
                    listContent shouldContain childId
                }
                listContent shouldContain "Parent Epic Issue"
                listContent shouldContain "Child Issue 1"
            }
        }
        
        "should validate tool parameters per schema with proper error responses" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // Get tools list to examine schemas
                val toolsResponse = client.listTools()
                val tools = toolsResponse.jsonObject["result"]?.jsonObject?.get("tools")?.jsonArray
                tools shouldNotBe null
                
                // Find create_project tool and its schema
                val createProjectTool = tools!!.first { tool ->
                    tool.jsonObject["name"]?.jsonPrimitive?.content == "create_project"
                }.jsonObject
                
                val schema = createProjectTool["inputSchema"]?.jsonObject
                schema shouldNotBe null
                schema!!["type"]?.jsonPrimitive?.content shouldBe "object"
                
                val properties = schema["properties"]?.jsonObject
                properties shouldNotBe null
                
                // Test missing required parameters
                val missingNameRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "missing-name-test")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("name", "create_project")
                        put("arguments", buildJsonObject {
                            put("description", "Missing name parameter")
                            // Missing required 'name' parameter
                        })
                    })
                }
                
                // EXPECTED FAILURE: Parameter validation not implemented
                val missingNameResponse = client.sendRequest(missingNameRequest)
                validateJsonRpcError(missingNameResponse)
                
                val error = missingNameResponse.jsonObject["error"]?.jsonObject
                error!!["message"]?.jsonPrimitive?.content shouldContain "required"
                error["message"]?.jsonPrimitive?.content shouldContain "name"
                
                // Test invalid parameter types
                val invalidTypeRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "invalid-type-test")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("name", "create_issue")
                        put("arguments", buildJsonObject {
                            put("project_id", "valid-project-id")
                            put("title", "Test Issue")
                            put("estimate", "not-a-number") // Should be integer
                        })
                    })
                }
                
                val invalidTypeResponse = client.sendRequest(invalidTypeRequest)
                validateJsonRpcError(invalidTypeResponse)
                
                val typeError = invalidTypeResponse.jsonObject["error"]?.jsonObject
                typeError!!["message"]?.jsonPrimitive?.content shouldContain "type"
                
                // Test valid parameters for comparison
                val validRequest = TestDataFactory.createProjectToolCall(
                    name = "Valid Project",
                    description = "This should succeed"
                )
                
                val validResponse = client.sendRequest(validRequest)
                validateToolCallResponse(validResponse, "create_project")
            }
        }
        
        "should handle tool execution errors gracefully with proper error codes" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // Test business logic errors (e.g., duplicate names)
                val project1Request = TestDataFactory.createProjectToolCall(
                    name = "Duplicate Test Project",
                    description = "First project"
                )
                
                val project1Response = client.sendRequest(project1Request)
                validateToolCallResponse(project1Response, "create_project")
                
                // Try to create project with same name
                val duplicateRequest = TestDataFactory.createProjectToolCall(
                    name = "Duplicate Test Project", // Same name
                    description = "Duplicate project"
                )
                
                // EXPECTED FAILURE: Business rule validation not implemented
                val duplicateResponse = client.sendRequest(duplicateRequest)
                
                // Should receive error for business rule violation
                validateJsonRpcError(duplicateResponse)
                val duplicateError = duplicateResponse.jsonObject["error"]?.jsonObject
                duplicateError!!["message"]?.jsonPrimitive?.content shouldContain "duplicate"
                
                // Test referential integrity errors
                val invalidProjectReference = TestDataFactory.createIssueToolCall(
                    projectId = "non-existent-project-id",
                    title = "Orphan Issue",
                    description = "Issue with invalid project reference"
                )
                
                val orphanResponse = client.sendRequest(invalidProjectReference)
                validateJsonRpcError(orphanResponse)
                
                val orphanError = orphanResponse.jsonObject["error"]?.jsonObject
                orphanError!!["message"]?.jsonPrimitive?.content shouldContain "not found"
                
                // Test constraint violations
                val invalidEstimateRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "invalid-estimate")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("name", "create_issue")
                        put("arguments", buildJsonObject {
                            put("project_id", extractProjectIdFromToolResponse(
                                project1Response.jsonObject["result"]?.jsonObject
                                    ?.get("content")?.jsonArray?.get(0)?.jsonObject
                                    ?.get("text")?.jsonPrimitive?.content!!
                            ))
                            put("title", "Invalid Estimate Issue")
                            put("estimate", -5) // Invalid negative estimate
                        })
                    })
                }
                
                val constraintResponse = client.sendRequest(invalidEstimateRequest)
                validateJsonRpcError(constraintResponse)
            }
        }
        
        "should execute cross-tool workflows with proper data flow" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // Complete workflow: Project → Issue → Session → Next Task
                
                // 1. Create project
                val projectId = createTestProject(client, "Workflow Integration Project")
                
                // 2. Create issues in project
                val issueIds = (1..3).map { index ->
                    createTestIssue(client, projectId, "Workflow Task $index")
                }
                
                // 3. Create session for the project
                val sessionRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "create-session")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("name", "create_session")
                        put("arguments", buildJsonObject {
                            put("project_id", projectId)
                            put("context", buildJsonObject {
                                put("stage", "development")
                                put("available_time", "4h")
                            })
                        })
                    })
                }
                
                // EXPECTED FAILURE: create_session tool not implemented
                val sessionResponse = client.sendRequest(sessionRequest)
                validateToolCallResponse(sessionResponse, "create_session")
                
                val sessionId = extractSessionIdFromToolResponse(sessionResponse)
                
                // 4. Get next task from session
                val nextTaskRequest = TestDataFactory.createGetNextTaskToolCall(sessionId)
                
                // EXPECTED FAILURE: get_next_task tool not implemented
                val taskResponse = client.sendRequest(nextTaskRequest)
                validateToolCallResponse(taskResponse, "get_next_task")
                
                val taskContent = taskResponse.jsonObject["result"]?.jsonObject
                    ?.get("content")?.jsonArray?.get(0)?.jsonObject
                    ?.get("text")?.jsonPrimitive?.content
                
                taskContent shouldNotBe null
                taskContent!! shouldContain sessionId
                // Should recommend one of our created issues
                val containsIssue = issueIds.any { issueId ->
                    taskContent.contains(issueId)
                }
                containsIssue shouldBe true
                
                // 5. Update issue status through workflow
                val updateIssueRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "update-issue-workflow")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("name", "update_issue")
                        put("arguments", buildJsonObject {
                            put("issue_id", issueIds[0])
                            put("status", "in_progress")
                            put("session_id", sessionId)
                        })
                    })
                }
                
                val updateResponse = client.sendRequest(updateIssueRequest)
                validateToolCallResponse(updateResponse, "update_issue")
                
                // 6. Verify workflow state consistency
                val activeSessionRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "get-active-session")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("name", "get_active_session")
                        put("arguments", buildJsonObject {})
                    })
                }
                
                val activeResponse = client.sendRequest(activeSessionRequest)
                validateToolCallResponse(activeResponse, "get_active_session")
                
                val activeContent = activeResponse.jsonObject["result"]?.jsonObject
                    ?.get("content")?.jsonArray?.get(0)?.jsonObject
                    ?.get("text")?.jsonPrimitive?.content
                
                activeContent!! shouldContain sessionId
                activeContent shouldContain "in_progress"
            }
        }
        
        "should handle concurrent tool executions safely" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // Create project for concurrent operations
                val projectId = createTestProject(client, "Concurrent Operations Project")
                
                // Execute multiple tool calls concurrently
                val concurrentOperations = (1..10).map { index ->
                    async {
                        when (index % 3) {
                            0 -> {
                                // Create issue
                                val issueRequest = TestDataFactory.createIssueToolCall(
                                    projectId = projectId,
                                    title = "Concurrent Issue $index",
                                    description = "Created concurrently"
                                )
                                client.sendRequest(issueRequest)
                            }
                            1 -> {
                                // List issues
                                val listRequest = buildJsonObject {
                                    put("jsonrpc", "2.0")
                                    put("id", "concurrent-list-$index")
                                    put("method", "tools/call")
                                    put("params", buildJsonObject {
                                        put("name", "list_issues")
                                        put("arguments", buildJsonObject {
                                            put("project_id", projectId)
                                        })
                                    })
                                }
                                client.sendRequest(listRequest)
                            }
                            else -> {
                                // Get project
                                val getRequest = buildJsonObject {
                                    put("jsonrpc", "2.0")
                                    put("id", "concurrent-get-$index")
                                    put("method", "tools/call")
                                    put("params", buildJsonObject {
                                        put("name", "get_project")
                                        put("arguments", buildJsonObject {
                                            put("project_id", projectId)
                                        })
                                    })
                                }
                                client.sendRequest(getRequest)
                            }
                        }
                    }
                }
                
                // Wait for all operations to complete
                val results = concurrentOperations.awaitAll()
                
                // All operations should succeed or fail gracefully
                results.forEach { response ->
                    validateJsonRpcResponse(response)
                    // Either success or proper error
                    val hasResult = response.jsonObject["result"] != null
                    val hasError = response.jsonObject["error"] != null
                    (hasResult xor hasError) shouldBe true
                }
                
                // Verify data consistency after concurrent operations
                val finalListRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "final-consistency-check")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("name", "list_issues")
                        put("arguments", buildJsonObject {
                            put("project_id", projectId)
                        })
                    })
                }
                
                val finalResponse = client.sendRequest(finalListRequest)
                validateToolCallResponse(finalResponse, "list_issues")
            }
        }
        
        "should handle large payloads and complex tool arguments" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // Test with large project description
                val largePayloadRequest = TestDataFactory.createLargePayloadToolCall()
                
                // EXPECTED FAILURE: Large payload handling not implemented
                val (largeResponse, timing) = measureTime {
                    client.sendRequest(largePayloadRequest)
                }
                
                validateToolCallResponse(largeResponse, "create_project")
                
                // Should handle large payloads reasonably quickly (< 5 seconds)
                timing shouldBeLessThan 5000
                
                // Test with complex nested arguments
                val complexArgsRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "complex-args-test")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("name", "create_issue")
                        put("arguments", buildJsonObject {
                            put("project_id", createTestProject(client, "Complex Args Project"))
                            put("title", "Complex Issue")
                            put("description", "Issue with complex metadata")
                            put("metadata", buildJsonObject {
                                put("nested_object", buildJsonObject {
                                    put("deep_property", "value")
                                    put("array_property", buildJsonArray {
                                        add("item1")
                                        add("item2")
                                        add(buildJsonObject {
                                            put("nested_in_array", true)
                                        })
                                    })
                                })
                                put("tags", buildJsonArray {
                                    add("integration-test")
                                    add("complex-args")
                                    add("metadata-test")
                                })
                            })
                        })
                    })
                }
                
                val complexResponse = client.sendRequest(complexArgsRequest)
                validateToolCallResponse(complexResponse, "create_issue")
                
                // Verify complex data was preserved
                val issueId = extractIssueIdFromToolResponse(complexResponse)
                val getIssueRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "get-complex-issue")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("name", "get_issue")
                        put("arguments", buildJsonObject {
                            put("issue_id", issueId)
                        })
                    })
                }
                
                val getResponse = client.sendRequest(getIssueRequest)
                val getContent = getResponse.jsonObject["result"]?.jsonObject
                    ?.get("content")?.jsonArray?.get(0)?.jsonObject
                    ?.get("text")?.jsonPrimitive?.content
                
                getContent!! shouldContain "deep_property"
                getContent shouldContain "integration-test"
                getContent shouldContain "nested_in_array"
            }
        }
    }
    
    // Helper functions for extracting IDs from tool responses
    
    private fun extractProjectIdFromToolResponse(responseText: String): String {
        // This will need to be updated based on actual tool response format
        // EXPECTED FAILURE: Response format not standardized yet
        return "project-id-placeholder" // Will be replaced in GREEN phase
    }
    
    private fun extractIssueIdFromToolResponse(response: JsonElement): String {
        // This will need to be updated based on actual tool response format
        // EXPECTED FAILURE: Response format not standardized yet
        return "issue-id-placeholder" // Will be replaced in GREEN phase
    }
    
    private fun extractSessionIdFromToolResponse(response: JsonElement): String {
        // This will need to be updated based on actual tool response format
        // EXPECTED FAILURE: Response format not standardized yet
        return "session-id-placeholder" // Will be replaced in GREEN phase
    }
}