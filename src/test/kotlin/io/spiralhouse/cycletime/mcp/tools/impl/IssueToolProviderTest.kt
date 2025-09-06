package io.spiralhouse.cycletime.mcp.tools.impl

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.mockk.*
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.*
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.dto.IssueDto
import io.spiralhouse.cycletime.application.dto.IssueListDto
import io.spiralhouse.cycletime.application.dto.IssueTreeDto
import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.exceptions.IssueNotFoundException
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.mcp.tools.exceptions.ToolExecutionException
import io.spiralhouse.cycletime.mcp.tools.exceptions.ParameterValidationException
import java.time.Instant
import java.util.*

/**
 * RED Phase TDD Test Suite for IssueToolProvider
 * 
 * These tests define the complete behavior expected from our concrete 
 * IssueToolProvider implementation. All tests MUST fail initially
 * to properly guide the GREEN phase implementation.
 * 
 * Test Categories:
 * - Provider Interface Compliance (namespace, tool registration)
 * - JSON Schema Validation (parameter structure validation)
 * - Service Integration (proper mocking and delegation)
 * - Error Handling (exception propagation and wrapping)
 * - Performance Requirements (tool execution timing <100ms)
 * - Tool Metadata Validation (names, descriptions, schemas)
 * - Issue Hierarchy Support (tree operations, parent-child relationships)
 * - Status Transition Workflows (proper state management)
 * - End-to-End Workflows (complete tool execution flows)
 */
class IssueToolProviderTest : StringSpec({
    
    lateinit var mockIssueService: IssueApplicationService
    lateinit var issueToolProvider: DefaultIssueToolProvider
    
    beforeEach {
        mockIssueService = mockk<IssueApplicationService>()
        // This will fail initially - DefaultIssueToolProvider doesn't have constructor with service
        issueToolProvider = DefaultIssueToolProvider(mockIssueService)
    }
    
    afterEach {
        clearAllMocks()
    }

    // ================================================================================
    // Provider Interface Compliance Tests
    // ================================================================================

    "should have correct namespace 'issue'" {
        // This will fail - DefaultIssueToolProvider is empty implementation
        issueToolProvider.namespace shouldBe "issue"
    }
    
    "should provide exactly 5 synchronous tools" {
        // This will fail - getTools() returns empty list in default implementation
        val tools = issueToolProvider.getTools()
        tools shouldHaveSize 5
        
        val toolNames = tools.map { it.name }
        toolNames shouldContain "issue.create"
        toolNames shouldContain "issue.update"
        toolNames shouldContain "issue.transition"
        toolNames shouldContain "issue.get_tree"
        toolNames shouldContain "issue.list"
    }
    
    "should provide no asynchronous tools" {
        // This will fail - default implementation doesn't override getAsyncTools()
        issueToolProvider.getAsyncTools() shouldHaveSize 0
    }

    // ================================================================================
    // Tool Metadata Validation Tests
    // ================================================================================
    
    "issue.create tool should have valid metadata and schema" {
        // This will fail - no tools are registered yet
        val tools = issueToolProvider.getTools()
        val createTool = tools.find { it.name == "issue.create" }
        
        createTool shouldNotBe null
        createTool!!.description shouldContain "Create a new issue"
        
        // Validate JSON schema structure
        val schema = createTool.parametersSchema
        schema["type"]?.jsonPrimitive?.content shouldBe "object"
        
        val properties = schema["properties"]?.jsonObject
        properties shouldNotBe null
        properties!!["title"] shouldNotBe null
        properties["description"] shouldNotBe null
        properties["projectId"] shouldNotBe null
        properties["priority"] // Optional
        properties["parentId"] // Optional for sub-issues
        
        val required = schema["required"]?.jsonArray
        required shouldNotBe null
        required!!.map { it.jsonPrimitive.content } shouldContain "title"
        required.map { it.jsonPrimitive.content } shouldContain "projectId"
    }
    
    "issue.update tool should have valid metadata and schema" {
        // This will fail - no tools are registered yet
        val tools = issueToolProvider.getTools()
        val updateTool = tools.find { it.name == "issue.update" }
        
        updateTool shouldNotBe null
        updateTool!!.description shouldContain "Update an issue"
        
        val schema = updateTool.parametersSchema
        val properties = schema["properties"]?.jsonObject
        properties shouldNotBe null
        properties!!["id"] shouldNotBe null
        properties["title"] // Optional
        properties["description"] // Optional
        properties["priority"] // Optional
        
        val required = schema["required"]?.jsonArray
        required shouldNotBe null
        required!!.map { it.jsonPrimitive.content } shouldContain "id"
    }
    
    "issue.transition tool should have valid metadata and schema" {
        // This will fail - no tools are registered yet
        val tools = issueToolProvider.getTools()
        val transitionTool = tools.find { it.name == "issue.transition" }
        
        transitionTool shouldNotBe null
        transitionTool!!.description shouldContain "Transition issue status"
        
        val schema = transitionTool.parametersSchema
        val properties = schema["properties"]?.jsonObject
        properties shouldNotBe null
        properties!!["id"] shouldNotBe null
        properties["status"] shouldNotBe null
        
        val required = schema["required"]?.jsonArray
        required shouldNotBe null
        required!!.map { it.jsonPrimitive.content } shouldContain "id"
        required.map { it.jsonPrimitive.content } shouldContain "status"
    }
    
    "issue.get_tree tool should have valid metadata and schema" {
        // This will fail - no tools are registered yet
        val tools = issueToolProvider.getTools()
        val getTreeTool = tools.find { it.name == "issue.get_tree" }
        
        getTreeTool shouldNotBe null
        getTreeTool!!.description shouldContain "Get issue hierarchy tree"
        
        val schema = getTreeTool.parametersSchema
        val properties = schema["properties"]?.jsonObject
        properties shouldNotBe null
        properties!!["id"] shouldNotBe null
        
        val required = schema["required"]?.jsonArray
        required shouldNotBe null
        required!!.map { it.jsonPrimitive.content } shouldContain "id"
    }
    
    "issue.list tool should have valid metadata and schema" {
        // This will fail - no tools are registered yet
        val tools = issueToolProvider.getTools()
        val listTool = tools.find { it.name == "issue.list" }
        
        listTool shouldNotBe null
        listTool!!.description shouldContain "List issues"
        
        val schema = listTool.parametersSchema
        val properties = schema["properties"]?.jsonObject
        // List tool should accept optional filters
        properties?.get("projectId") // Optional filter
        properties?.get("status") // Optional filter
        properties?.get("priority") // Optional filter
    }

    // ================================================================================
    // JSON Schema Validation Tests
    // ================================================================================
    
    "issue.create should validate required title parameter" {
        // This will fail - no validation implementation exists yet
        val tools = issueToolProvider.getTools()
        val createTool = tools.find { it.name == "issue.create" }!!
        
        val invalidParams = JsonObject(mapOf(
            "projectId" to JsonPrimitive(UUID.randomUUID().toString())
            // Missing required title
        ))
        
        shouldThrow<ParameterValidationException> {
            runBlocking { 
                createTool.handler(invalidParams)
            }
        }
    }
    
    "issue.create should validate required projectId parameter" {
        // This will fail - no validation implementation exists yet
        val tools = issueToolProvider.getTools()
        val createTool = tools.find { it.name == "issue.create" }!!
        
        val invalidParams = JsonObject(mapOf(
            "title" to JsonPrimitive("Test Issue")
            // Missing required projectId
        ))
        
        shouldThrow<ParameterValidationException> {
            runBlocking { 
                createTool.handler(invalidParams)
            }
        }
    }
    
    "issue.create should accept valid parameters" {
        // This will fail - no implementation exists yet
        val tools = issueToolProvider.getTools()
        val createTool = tools.find { it.name == "issue.create" }!!
        
        val projectId = ProjectId(UUID.randomUUID().toString())
        val validParams = JsonObject(mapOf(
            "title" to JsonPrimitive("Test Issue"),
            "description" to JsonPrimitive("A test issue"),
            "projectId" to JsonPrimitive(projectId.value),
            "priority" to JsonPrimitive("HIGH")
        ))
        
        val mockIssue = IssueDto(
            id = IssueId(UUID.randomUUID().toString()),
            title = "Test Issue",
            description = "A test issue", 
            status = IssueStatus.OPEN,
            priority = IssuePriority.HIGH,
            projectId = projectId,
            parentId = null,
            childIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockIssueService.createIssue(any()) } returns mockIssue
        
        // This will fail - handler not implemented
        val result = runBlocking { createTool.handler(validParams) }
        result.isSuccess shouldBe true
    }
    
    "issue.transition should validate status values" {
        // This will fail - no validation implementation exists yet
        val tools = issueToolProvider.getTools()
        val transitionTool = tools.find { it.name == "issue.transition" }!!
        
        val invalidParams = JsonObject(mapOf(
            "id" to JsonPrimitive(UUID.randomUUID().toString()),
            "status" to JsonPrimitive("INVALID_STATUS") // Invalid status
        ))
        
        shouldThrow<ParameterValidationException> {
            runBlocking {
                transitionTool.handler(invalidParams)
            }
        }
    }

    // ================================================================================
    // Service Integration Tests
    // ================================================================================
    
    "issue.create should delegate to IssueApplicationService" {
        // This will fail - no service integration exists yet
        val tools = issueToolProvider.getTools()
        val createTool = tools.find { it.name == "issue.create" }!!
        
        val projectId = ProjectId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "title" to JsonPrimitive("Integration Test"),
            "description" to JsonPrimitive("Testing service integration"),
            "projectId" to JsonPrimitive(projectId.value),
            "priority" to JsonPrimitive("MEDIUM")
        ))
        
        val mockIssue = IssueDto(
            id = IssueId(UUID.randomUUID().toString()),
            title = "Integration Test",
            description = "Testing service integration",
            status = IssueStatus.OPEN,
            priority = IssuePriority.MEDIUM,
            projectId = projectId,
            parentId = null,
            childIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockIssueService.createIssue(any()) } returns mockIssue
        
        // This will fail - no service integration implemented
        runBlocking { createTool.handler(params) }
        
        coVerify { 
            mockIssueService.createIssue(
                match<CreateIssueCommand> { 
                    it.title == "Integration Test" &&
                    it.description == "Testing service integration" &&
                    it.projectId == projectId &&
                    it.priority == IssuePriority.MEDIUM
                }
            )
        }
    }
    
    "issue.update should delegate to IssueApplicationService" {
        // This will fail - no service integration exists yet
        val tools = issueToolProvider.getTools()
        val updateTool = tools.find { it.name == "issue.update" }!!
        
        val issueId = IssueId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "id" to JsonPrimitive(issueId.value),
            "title" to JsonPrimitive("Updated Issue"),
            "priority" to JsonPrimitive("LOW")
        ))
        
        val mockIssue = IssueDto(
            id = issueId,
            title = "Updated Issue",
            description = "Original description",
            status = IssueStatus.OPEN,
            priority = IssuePriority.LOW,
            projectId = ProjectId(UUID.randomUUID().toString()),
            parentId = null,
            childIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockIssueService.updateIssue(any()) } returns mockIssue
        
        // This will fail - no service integration implemented
        runBlocking { updateTool.handler(params) }
        
        coVerify { 
            mockIssueService.updateIssue(
                match<UpdateIssueCommand> {
                    it.id == issueId &&
                    it.title == "Updated Issue" &&
                    it.priority == IssuePriority.LOW
                }
            )
        }
    }
    
    "issue.transition should delegate to IssueApplicationService" {
        // This will fail - no service integration exists yet
        val tools = issueToolProvider.getTools()
        val transitionTool = tools.find { it.name == "issue.transition" }!!
        
        val issueId = IssueId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "id" to JsonPrimitive(issueId.value),
            "status" to JsonPrimitive("IN_PROGRESS")
        ))
        
        val mockIssue = IssueDto(
            id = issueId,
            title = "Transition Test",
            description = "Testing status transition",
            status = IssueStatus.IN_PROGRESS,
            priority = IssuePriority.MEDIUM,
            projectId = ProjectId(UUID.randomUUID().toString()),
            parentId = null,
            childIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockIssueService.transitionIssue(any()) } returns mockIssue
        
        // This will fail - no service integration implemented
        runBlocking { transitionTool.handler(params) }
        
        coVerify { 
            mockIssueService.transitionIssue(
                match<TransitionIssueCommand> {
                    it.id == issueId &&
                    it.newStatus == IssueStatus.IN_PROGRESS
                }
            )
        }
    }
    
    "issue.get_tree should delegate to IssueApplicationService" {
        // This will fail - no service integration exists yet
        val tools = issueToolProvider.getTools()
        val getTreeTool = tools.find { it.name == "issue.get_tree" }!!
        
        val issueId = IssueId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "id" to JsonPrimitive(issueId.value)
        ))
        
        val mockTree = IssueTreeDto(
            issue = IssueDto(
                id = issueId,
                title = "Parent Issue",
                description = "Has child issues",
                status = IssueStatus.OPEN,
                priority = IssuePriority.HIGH,
                projectId = ProjectId(UUID.randomUUID().toString()),
                parentId = null,
                childIds = listOf(IssueId(UUID.randomUUID().toString())),
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            ),
            children = listOf()
        )
        
        coEvery { mockIssueService.getIssueTree(issueId) } returns mockTree
        
        // This will fail - no service integration implemented
        runBlocking { getTreeTool.handler(params) }
        
        coVerify { mockIssueService.getIssueTree(issueId) }
    }
    
    "issue.list should delegate to IssueApplicationService with filters" {
        // This will fail - no service integration exists yet
        val tools = issueToolProvider.getTools()
        val listTool = tools.find { it.name == "issue.list" }!!
        
        val projectId = ProjectId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "projectId" to JsonPrimitive(projectId.value),
            "status" to JsonPrimitive("OPEN"),
            "priority" to JsonPrimitive("HIGH")
        ))
        
        val mockIssues = IssueListDto(
            issues = listOf(
                IssueDto(
                    id = IssueId(UUID.randomUUID().toString()),
                    title = "Filtered Issue",
                    description = "Matches filter criteria",
                    status = IssueStatus.OPEN,
                    priority = IssuePriority.HIGH,
                    projectId = projectId,
                    parentId = null,
                    childIds = emptyList(),
                    createdAt = Instant.now(),
                    updatedAt = Instant.now()
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockIssueService.listIssues(any()) } returns mockIssues
        
        // This will fail - no service integration implemented
        runBlocking { listTool.handler(params) }
        
        coVerify { 
            mockIssueService.listIssues(
                match<ListIssuesCommand> {
                    it.projectId == projectId &&
                    it.status == IssueStatus.OPEN &&
                    it.priority == IssuePriority.HIGH
                }
            )
        }
    }

    // ================================================================================
    // Error Handling Tests
    // ================================================================================
    
    "issue.update should handle IssueNotFoundException" {
        // This will fail - no error handling implemented
        val tools = issueToolProvider.getTools()
        val updateTool = tools.find { it.name == "issue.update" }!!
        
        val nonExistentId = IssueId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "id" to JsonPrimitive(nonExistentId.value),
            "title" to JsonPrimitive("Updated Title")
        ))
        
        coEvery { mockIssueService.updateIssue(any()) } throws IssueNotFoundException(nonExistentId)
        
        // Should wrap in ToolExecutionException
        shouldThrow<ToolExecutionException> {
            runBlocking { updateTool.handler(params) }
        }
    }
    
    "issue.create should handle invalid priority values" {
        // This will fail - no error handling implemented  
        val tools = issueToolProvider.getTools()
        val createTool = tools.find { it.name == "issue.create" }!!
        
        val params = JsonObject(mapOf(
            "title" to JsonPrimitive("Test Issue"),
            "projectId" to JsonPrimitive(UUID.randomUUID().toString()),
            "priority" to JsonPrimitive("INVALID_PRIORITY")
        ))
        
        shouldThrow<ParameterValidationException> {
            runBlocking { createTool.handler(params) }
        }
    }
    
    "issue.transition should handle invalid status transitions" {
        // This will fail - no error handling implemented
        val tools = issueToolProvider.getTools()
        val transitionTool = tools.find { it.name == "issue.transition" }!!
        
        val issueId = IssueId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "id" to JsonPrimitive(issueId.value),
            "status" to JsonPrimitive("CLOSED")
        ))
        
        coEvery { 
            mockIssueService.transitionIssue(any())
        } throws IllegalArgumentException("Cannot transition from OPEN to CLOSED directly")
        
        shouldThrow<ToolExecutionException> {
            runBlocking { transitionTool.handler(params) }
        }
    }

    // ================================================================================
    // Issue Hierarchy Support Tests
    // ================================================================================
    
    "issue.create should support creating child issues" {
        // This will fail - no hierarchy support implemented
        val tools = issueToolProvider.getTools()
        val createTool = tools.find { it.name == "issue.create" }!!
        
        val parentId = IssueId(UUID.randomUUID().toString())
        val projectId = ProjectId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "title" to JsonPrimitive("Child Issue"),
            "description" to JsonPrimitive("A child issue"),
            "projectId" to JsonPrimitive(projectId.value),
            "parentId" to JsonPrimitive(parentId.value)
        ))
        
        val mockIssue = IssueDto(
            id = IssueId(UUID.randomUUID().toString()),
            title = "Child Issue",
            description = "A child issue",
            status = IssueStatus.OPEN,
            priority = IssuePriority.MEDIUM,
            projectId = projectId,
            parentId = parentId,
            childIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockIssueService.createIssue(any()) } returns mockIssue
        
        runBlocking { createTool.handler(params) }
        
        coVerify { 
            mockIssueService.createIssue(
                match<CreateIssueCommand> {
                    it.parentId == parentId
                }
            )
        }
    }
    
    "issue.get_tree should return complete hierarchy" {
        // This will fail - no hierarchy implementation exists
        val tools = issueToolProvider.getTools()
        val getTreeTool = tools.find { it.name == "issue.get_tree" }!!
        
        val parentId = IssueId(UUID.randomUUID().toString())
        val childId = IssueId(UUID.randomUUID().toString())
        val projectId = ProjectId(UUID.randomUUID().toString())
        
        val params = JsonObject(mapOf(
            "id" to JsonPrimitive(parentId.value)
        ))
        
        val mockTree = IssueTreeDto(
            issue = IssueDto(
                id = parentId,
                title = "Parent Issue",
                description = "Has children",
                status = IssueStatus.OPEN,
                priority = IssuePriority.HIGH,
                projectId = projectId,
                parentId = null,
                childIds = listOf(childId),
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            ),
            children = listOf(
                IssueTreeDto(
                    issue = IssueDto(
                        id = childId,
                        title = "Child Issue",
                        description = "Child of parent",
                        status = IssueStatus.OPEN,
                        priority = IssuePriority.MEDIUM,
                        projectId = projectId,
                        parentId = parentId,
                        childIds = emptyList(),
                        createdAt = Instant.now(),
                        updatedAt = Instant.now()
                    ),
                    children = emptyList()
                )
            )
        )
        
        coEvery { mockIssueService.getIssueTree(parentId) } returns mockTree
        
        val result = runBlocking { getTreeTool.handler(params) }
        result.isSuccess shouldBe true
        
        val responseObj = result.getOrThrow().jsonObject
        responseObj["issue"] shouldNotBe null
        responseObj["children"]?.jsonArray shouldHaveSize 1
    }

    // ================================================================================
    // Performance Requirements Tests
    // ================================================================================
    
    "issue.create should complete within 100ms performance requirement" {
        // This will fail - no implementation exists yet
        val tools = issueToolProvider.getTools()
        val createTool = tools.find { it.name == "issue.create" }!!
        
        val params = JsonObject(mapOf(
            "title" to JsonPrimitive("Performance Test"),
            "description" to JsonPrimitive("Testing performance"),
            "projectId" to JsonPrimitive(UUID.randomUUID().toString())
        ))
        
        val mockIssue = IssueDto(
            id = IssueId(UUID.randomUUID().toString()),
            title = "Performance Test",
            description = "Testing performance",
            status = IssueStatus.OPEN,
            priority = IssuePriority.MEDIUM,
            projectId = ProjectId(UUID.randomUUID().toString()),
            parentId = null,
            childIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockIssueService.createIssue(any()) } returns mockIssue
        
        val startTime = System.currentTimeMillis()
        runBlocking { createTool.handler(params) }
        val executionTime = System.currentTimeMillis() - startTime
        
        // Tool execution should be under 100ms
        executionTime shouldBe lessThan(100)
    }

    // ================================================================================
    // Status Transition Workflow Tests
    // ================================================================================
    
    "issue.transition should support OPEN to IN_PROGRESS transition" {
        // This will fail - no transition logic implemented
        val tools = issueToolProvider.getTools()
        val transitionTool = tools.find { it.name == "issue.transition" }!!
        
        val issueId = IssueId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "id" to JsonPrimitive(issueId.value),
            "status" to JsonPrimitive("IN_PROGRESS")
        ))
        
        val mockIssue = IssueDto(
            id = issueId,
            title = "Workflow Test",
            description = "Testing status workflow",
            status = IssueStatus.IN_PROGRESS,
            priority = IssuePriority.MEDIUM,
            projectId = ProjectId(UUID.randomUUID().toString()),
            parentId = null,
            childIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockIssueService.transitionIssue(any()) } returns mockIssue
        
        val result = runBlocking { transitionTool.handler(params) }
        result.isSuccess shouldBe true
        
        val responseObj = result.getOrThrow().jsonObject
        responseObj["status"]?.jsonPrimitive?.content shouldBe "IN_PROGRESS"
    }
    
    "issue.transition should support IN_PROGRESS to RESOLVED transition" {
        // This will fail - no transition logic implemented  
        val tools = issueToolProvider.getTools()
        val transitionTool = tools.find { it.name == "issue.transition" }!!
        
        val issueId = IssueId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "id" to JsonPrimitive(issueId.value),
            "status" to JsonPrimitive("RESOLVED")
        ))
        
        val mockIssue = IssueDto(
            id = issueId,
            title = "Workflow Test",
            description = "Testing resolution workflow",
            status = IssueStatus.RESOLVED,
            priority = IssuePriority.MEDIUM,
            projectId = ProjectId(UUID.randomUUID().toString()),
            parentId = null,
            childIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockIssueService.transitionIssue(any()) } returns mockIssue
        
        val result = runBlocking { transitionTool.handler(params) }
        result.isSuccess shouldBe true
        
        val responseObj = result.getOrThrow().jsonObject
        responseObj["status"]?.jsonPrimitive?.content shouldBe "RESOLVED"
    }

    // ================================================================================
    // End-to-End Workflow Tests
    // ================================================================================
    
    "complete issue lifecycle workflow should work end-to-end" {
        // This will fail - no complete implementation exists yet
        val tools = issueToolProvider.getTools()
        val createTool = tools.find { it.name == "issue.create" }!!
        val updateTool = tools.find { it.name == "issue.update" }!!
        val transitionTool = tools.find { it.name == "issue.transition" }!!
        val getTreeTool = tools.find { it.name == "issue.get_tree" }!!
        val listTool = tools.find { it.name == "issue.list" }!!
        
        val issueId = IssueId(UUID.randomUUID().toString())
        val projectId = ProjectId(UUID.randomUUID().toString())
        
        // Mock issue lifecycle
        val createdIssue = IssueDto(
            id = issueId,
            title = "Workflow Test",
            description = "Testing complete workflow",
            status = IssueStatus.OPEN,
            priority = IssuePriority.MEDIUM,
            projectId = projectId,
            parentId = null,
            childIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockIssueService.createIssue(any()) } returns createdIssue
        coEvery { mockIssueService.updateIssue(any()) } returns createdIssue.copy(title = "Updated Workflow Test")
        coEvery { mockIssueService.transitionIssue(any()) } returns createdIssue.copy(status = IssueStatus.IN_PROGRESS)
        coEvery { mockIssueService.getIssueTree(issueId) } returns IssueTreeDto(createdIssue, emptyList())
        coEvery { mockIssueService.listIssues(any()) } returns IssueListDto(listOf(createdIssue), 1)
        
        // Execute complete workflow
        runBlocking {
            // 1. Create issue
            val createResult = createTool.handler(JsonObject(mapOf(
                "title" to JsonPrimitive("Workflow Test"),
                "description" to JsonPrimitive("Testing complete workflow"),
                "projectId" to JsonPrimitive(projectId.value)
            )))
            createResult.isSuccess shouldBe true
            
            // 2. Update issue
            val updateResult = updateTool.handler(JsonObject(mapOf(
                "id" to JsonPrimitive(issueId.value),
                "title" to JsonPrimitive("Updated Workflow Test")
            )))
            updateResult.isSuccess shouldBe true
            
            // 3. Transition issue
            val transitionResult = transitionTool.handler(JsonObject(mapOf(
                "id" to JsonPrimitive(issueId.value),
                "status" to JsonPrimitive("IN_PROGRESS")
            )))
            transitionResult.isSuccess shouldBe true
            
            // 4. Get issue tree
            val getTreeResult = getTreeTool.handler(JsonObject(mapOf(
                "id" to JsonPrimitive(issueId.value)
            )))
            getTreeResult.isSuccess shouldBe true
            
            // 5. List issues
            val listResult = listTool.handler(JsonObject(mapOf(
                "projectId" to JsonPrimitive(projectId.value)
            )))
            listResult.isSuccess shouldBe true
        }
        
        // Verify all service calls were made
        coVerify { mockIssueService.createIssue(any()) }
        coVerify { mockIssueService.updateIssue(any()) }
        coVerify { mockIssueService.transitionIssue(any()) }
        coVerify { mockIssueService.getIssueTree(issueId) }
        coVerify { mockIssueService.listIssues(any()) }
    }

    // ================================================================================
    // JSON Response Format Tests
    // ================================================================================
    
    "issue.create should return properly formatted JSON response" {
        // This will fail - no JSON formatting implemented
        val tools = issueToolProvider.getTools()
        val createTool = tools.find { it.name == "issue.create" }!!
        
        val projectId = ProjectId("12345678-1234-1234-1234-123456789abc")
        val params = JsonObject(mapOf(
            "title" to JsonPrimitive("Format Test"),
            "description" to JsonPrimitive("Testing JSON format"),
            "projectId" to JsonPrimitive(projectId.value),
            "priority" to JsonPrimitive("HIGH")
        ))
        
        val mockIssue = IssueDto(
            id = IssueId("87654321-4321-4321-4321-abcdef987654"),
            title = "Format Test",
            description = "Testing JSON format",
            status = IssueStatus.OPEN,
            priority = IssuePriority.HIGH,
            projectId = projectId,
            parentId = null,
            childIds = emptyList(),
            createdAt = Instant.parse("2024-01-01T00:00:00Z"),
            updatedAt = Instant.parse("2024-01-01T00:00:00Z")
        )
        
        coEvery { mockIssueService.createIssue(any()) } returns mockIssue
        
        val result = runBlocking { createTool.handler(params) }
        result.isSuccess shouldBe true
        
        val jsonResponse = result.getOrThrow()
        val responseObj = jsonResponse.jsonObject
        
        responseObj["id"]?.jsonPrimitive?.content shouldBe "87654321-4321-4321-4321-abcdef987654"
        responseObj["title"]?.jsonPrimitive?.content shouldBe "Format Test"
        responseObj["description"]?.jsonPrimitive?.content shouldBe "Testing JSON format"
        responseObj["status"]?.jsonPrimitive?.content shouldBe "OPEN"
        responseObj["priority"]?.jsonPrimitive?.content shouldBe "HIGH"
        responseObj["projectId"]?.jsonPrimitive?.content shouldBe "12345678-1234-1234-1234-123456789abc"
        responseObj["parentId"] shouldBe JsonNull
        responseObj["childIds"]?.jsonArray shouldHaveSize 0
    }
})

// Extension function for performance testing 
private infix fun <T : Comparable<T>> T.lessThan(other: T): Boolean = this < other