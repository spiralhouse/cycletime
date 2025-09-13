package io.spiralhouse.cycletime.unit

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldMatch
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.types.shouldBeInstanceOf
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.*
import io.spiralhouse.cycletime.mcp.tools.DefaultWorkflowToolProvider
import io.spiralhouse.cycletime.mcp.tools.ToolHandler

/**
 * Comprehensive unit tests for DefaultWorkflowToolProvider following TDD principles.
 * 
 * These tests capture the CURRENT placeholder behavior exactly as-is to establish
 * a behavior baseline before refactoring. This ensures safe refactoring by preserving
 * the existing interface contracts and response formats.
 * 
 * Tests verify:
 * - Tool registration and discovery (3 expected async tools)
 * - Parameter validation and error handling
 * - Placeholder response formats and content
 * - Direct JSON response structure (not MCP content arrays)
 * - Current UUID generation and hardcoded values
 */
class DefaultWorkflowToolProviderUnitTest : StringSpec({

    lateinit var toolProvider: DefaultWorkflowToolProvider

    beforeEach {
        toolProvider = DefaultWorkflowToolProvider()
    }

    // TDD Cycle 1: Tool Registration Tests
    "should provide correct namespace" {
        toolProvider.namespace shouldBe "workflow"
    }

    "should register 3 async tools correctly" {
        val asyncTools = toolProvider.getAsyncTools()
        asyncTools shouldHaveSize 3
        
        val toolNames = asyncTools.map { it.name }
        toolNames shouldContain "create_workflow"
        toolNames shouldContain "list_workflows"
        toolNames shouldContain "execute_workflow_stage"
    }

    "should provide empty synchronous tools" {
        val syncTools = toolProvider.getTools()
        syncTools shouldHaveSize 0
    }

    "should verify all tools are async handlers" {
        val asyncTools = toolProvider.getAsyncTools()
        asyncTools.forEach { tool ->
            tool.handler.shouldBeInstanceOf<ToolHandler.Async>()
            tool.isAsync shouldBe true
            tool.isSync shouldBe false
        }
    }

    // TDD Cycle 2: Parameter Validation Tests - create_workflow
    "create_workflow should require name parameter" {
        runTest {
            val createTool = toolProvider.getAsyncTools().first { it.name == "create_workflow" }
            val params = buildJsonObject {
                // Missing required name parameter
            }

            val result = createTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params)
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.isFailure shouldBe true
            result.exceptionOrNull()?.message shouldContain "name is required"
        }
    }

    "create_workflow should succeed with name and optional description" {
        runTest {
            val createTool = toolProvider.getAsyncTools().first { it.name == "create_workflow" }
            val params = buildJsonObject {
                put("name", "Test Workflow")
                put("description", "A test workflow description")
            }

            val result = createTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.shouldBeInstanceOf<JsonObject>()
            result["name"]!!.jsonPrimitive.content shouldBe "Test Workflow"
            result["description"]!!.jsonPrimitive.content shouldBe "A test workflow description"
            result["created"]!!.jsonPrimitive.boolean shouldBe true
            result["stageCount"]!!.jsonPrimitive.int shouldBe 0
        }
    }

    "create_workflow should handle optional stages parameter" {
        runTest {
            val createTool = toolProvider.getAsyncTools().first { it.name == "create_workflow" }
            val params = buildJsonObject {
                put("name", "Multi-stage Workflow")
                put("stages", buildJsonArray {
                    add(buildJsonObject {
                        put("name", "stage1")
                        put("description", "First stage")
                    })
                    add(buildJsonObject {
                        put("name", "stage2")
                        put("description", "Second stage")
                    })
                })
            }

            val result = createTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.shouldBeInstanceOf<JsonObject>()
            result["name"]!!.jsonPrimitive.content shouldBe "Multi-stage Workflow"
            result["stageCount"]!!.jsonPrimitive.int shouldBe 2
        }
    }

    // TDD Cycle 3: Parameter Validation Tests - list_workflows
    "list_workflows should succeed with empty parameters" {
        runTest {
            val listTool = toolProvider.getAsyncTools().first { it.name == "list_workflows" }
            val params = buildJsonObject {}

            val result = listTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.shouldBeInstanceOf<JsonArray>()
        }
    }

    "list_workflows should succeed with no parameters object" {
        runTest {
            val listTool = toolProvider.getAsyncTools().first { it.name == "list_workflows" }
            val params = JsonNull

            val result = listTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.shouldBeInstanceOf<JsonArray>()
        }
    }

    // TDD Cycle 4: Parameter Validation Tests - execute_workflow_stage
    "execute_workflow_stage should require workflowId parameter" {
        runTest {
            val executeTool = toolProvider.getAsyncTools().first { it.name == "execute_workflow_stage" }
            val params = buildJsonObject {
                put("stage", "analysis")
                // Missing required workflowId
            }

            val result = executeTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params)
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.isFailure shouldBe true
            result.exceptionOrNull()?.message shouldContain "workflowId is required"
        }
    }

    "execute_workflow_stage should require stage parameter" {
        runTest {
            val executeTool = toolProvider.getAsyncTools().first { it.name == "execute_workflow_stage" }
            val params = buildJsonObject {
                put("workflowId", "workflow-123")
                // Missing required stage
            }

            val result = executeTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params)
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.isFailure shouldBe true
            result.exceptionOrNull()?.message shouldContain "stage is required"
        }
    }

    "execute_workflow_stage should succeed with required parameters and optional context" {
        runTest {
            val executeTool = toolProvider.getAsyncTools().first { it.name == "execute_workflow_stage" }
            val params = buildJsonObject {
                put("workflowId", "workflow-123")
                put("stage", "implementation")
                put("context", buildJsonObject {
                    put("data", "test context")
                })
            }

            val result = executeTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.shouldBeInstanceOf<JsonObject>()
            result["workflowId"]!!.jsonPrimitive.content shouldBe "workflow-123"
            result["stage"]!!.jsonPrimitive.content shouldBe "implementation"
        }
    }

    // TDD Cycle 5: Response Format Tests
    "create_workflow should return correct response format with UUID generation" {
        runTest {
            val createTool = toolProvider.getAsyncTools().first { it.name == "create_workflow" }
            val params = buildJsonObject {
                put("name", "Response Format Test")
            }

            val result = createTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.shouldBeInstanceOf<JsonObject>()
            
            // Verify all expected fields are present
            result["id"] shouldNotBe null
            result["name"] shouldNotBe null
            result["description"] shouldNotBe null
            result["created"] shouldNotBe null
            result["stageCount"] shouldNotBe null
            
            // Verify field values and types
            val id = result["id"]!!.jsonPrimitive.content
            id shouldMatch Regex("^workflow-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
            
            result["name"]!!.jsonPrimitive.content shouldBe "Response Format Test"
            result["description"]!!.jsonPrimitive.content shouldBe "" // Default empty description
            result["created"]!!.jsonPrimitive.boolean shouldBe true
            result["stageCount"]!!.jsonPrimitive.int shouldBe 0
        }
    }

    "list_workflows should return exact placeholder array format" {
        runTest {
            val listTool = toolProvider.getAsyncTools().first { it.name == "list_workflows" }
            val params = buildJsonObject {}

            val result = listTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.shouldBeInstanceOf<JsonArray>()
            result shouldHaveSize 1
            
            val workflow = result[0].jsonObject
            workflow["id"]!!.jsonPrimitive.content shouldBe "workflow-1"
            workflow["name"]!!.jsonPrimitive.content shouldBe "Standard Development Workflow"
            workflow["description"]!!.jsonPrimitive.content shouldBe "Default workflow for development tasks"
            
            val stages = workflow["stages"]!!.jsonArray
            stages shouldHaveSize 4
            stages[0].jsonPrimitive.content shouldBe "analysis"
            stages[1].jsonPrimitive.content shouldBe "implementation"
            stages[2].jsonPrimitive.content shouldBe "testing"
            stages[3].jsonPrimitive.content shouldBe "review"
        }
    }

    "execute_workflow_stage should return exact placeholder response format" {
        runTest {
            val executeTool = toolProvider.getAsyncTools().first { it.name == "execute_workflow_stage" }
            val params = buildJsonObject {
                put("workflowId", "test-workflow-456")
                put("stage", "testing")
            }

            val result = executeTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.shouldBeInstanceOf<JsonObject>()
            
            // Verify all expected fields are present with exact placeholder values
            result["workflowId"]!!.jsonPrimitive.content shouldBe "test-workflow-456"
            result["stage"]!!.jsonPrimitive.content shouldBe "testing"
            result["status"]!!.jsonPrimitive.content shouldBe "executed"
            result["result"]!!.jsonPrimitive.content shouldBe "Stage completed successfully"
            result["nextStage"]!!.jsonPrimitive.content shouldBe "next-stage-placeholder"
        }
    }

    // TDD Cycle 6: Placeholder Behavior Tests
    "create_workflow should generate unique UUIDs on multiple calls" {
        runTest {
            val createTool = toolProvider.getAsyncTools().first { it.name == "create_workflow" }
            val params = buildJsonObject {
                put("name", "UUID Test")
            }

            val result1 = createTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            val result2 = createTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            val id1 = result1.jsonObject["id"]!!.jsonPrimitive.content
            val id2 = result2.jsonObject["id"]!!.jsonPrimitive.content
            
            id1 shouldNotBe id2
            id1 shouldMatch Regex("^workflow-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
            id2 shouldMatch Regex("^workflow-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
        }
    }

    "list_workflows should return identical placeholder data on multiple calls" {
        runTest {
            val listTool = toolProvider.getAsyncTools().first { it.name == "list_workflows" }
            val params = buildJsonObject {}

            val result1 = listTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            val result2 = listTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            // Should return identical placeholder data each time
            result1 shouldBe result2
        }
    }

    // TDD Cycle 7: Error Handling Edge Cases
    "create_workflow should handle empty name parameter" {
        runTest {
            val createTool = toolProvider.getAsyncTools().first { it.name == "create_workflow" }
            val params = buildJsonObject {
                put("name", "")
            }

            val result = createTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            // Current implementation accepts empty name
            result.shouldBeInstanceOf<JsonObject>()
            result["name"]!!.jsonPrimitive.content shouldBe ""
        }
    }

    "execute_workflow_stage should handle empty required parameters" {
        runTest {
            val executeTool = toolProvider.getAsyncTools().first { it.name == "execute_workflow_stage" }
            val params = buildJsonObject {
                put("workflowId", "")
                put("stage", "")
            }

            val result = executeTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            // Current implementation accepts empty values
            result.shouldBeInstanceOf<JsonObject>()
            result["workflowId"]!!.jsonPrimitive.content shouldBe ""
            result["stage"]!!.jsonPrimitive.content shouldBe ""
        }
    }

    "create_workflow should preserve description exactly as provided" {
        runTest {
            val createTool = toolProvider.getAsyncTools().first { it.name == "create_workflow" }
            val specialDescription = "Description with\nnewlines and special chars: !@#$%"
            val params = buildJsonObject {
                put("name", "Special Chars Test")
                put("description", specialDescription)
            }

            val result = createTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.shouldBeInstanceOf<JsonObject>()
            result["description"]!!.jsonPrimitive.content shouldBe specialDescription
        }
    }
})