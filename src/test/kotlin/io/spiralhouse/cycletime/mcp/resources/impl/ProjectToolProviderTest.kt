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
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.dto.ProjectDto
import io.spiralhouse.cycletime.application.dto.ProjectListDto
import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.exceptions.ProjectNotFoundException
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.mcp.tools.AsyncTool
import io.spiralhouse.cycletime.mcp.tools.Tool
import io.spiralhouse.cycletime.mcp.tools.exceptions.ToolExecutionException
import io.spiralhouse.cycletime.mcp.tools.exceptions.ParameterValidationException
import io.spiralhouse.cycletime.mcp.tools.DefaultProjectToolProvider
import java.time.Instant
import java.util.*

/**
 * RED Phase TDD Test Suite for ProjectToolProvider
 * 
 * These tests define the complete behavior expected from our concrete 
 * ProjectToolProvider implementation. All tests MUST fail initially
 * to properly guide the GREEN phase implementation.
 * 
 * Test Categories:
 * - Provider Interface Compliance (namespace, tool registration)
 * - JSON Schema Validation (parameter structure validation)  
 * - Service Integration (proper mocking and delegation)
 * - Error Handling (exception propagation and wrapping)
 * - Performance Requirements (tool execution timing <100ms)
 * - Tool Metadata Validation (names, descriptions, schemas)
 * - End-to-End Workflows (complete tool execution flows)
 */
class ProjectToolProviderTest : StringSpec({
    
    lateinit var mockProjectService: ProjectApplicationService
    lateinit var projectToolProvider: DefaultProjectToolProvider
    
    beforeEach {
        mockProjectService = mockk<ProjectApplicationService>()
        // This will fail initially - DefaultProjectToolProvider doesn't have constructor with service
        projectToolProvider = DefaultProjectToolProvider(mockProjectService)
    }
    
    afterEach {
        clearAllMocks()
    }

    // ================================================================================
    // Provider Interface Compliance Tests
    // ================================================================================

    "should have correct namespace 'project'" {
        // This will fail - DefaultProjectToolProvider is empty implementation
        projectToolProvider.namespace shouldBe "project"
    }
    
    "should provide exactly 5 synchronous tools" {
        // This will fail - getTools() returns empty list in default implementation
        val tools = projectToolProvider.getTools()
        tools shouldHaveSize 5
        
        val toolNames = tools.map { it.name }
        toolNames shouldContain "project.create"
        toolNames shouldContain "project.get"
        toolNames shouldContain "project.list"
        toolNames shouldContain "project.update"
        toolNames shouldContain "project.delete"
    }
    
    "should provide no asynchronous tools" {
        // This will fail - default implementation doesn't override getAsyncTools()
        projectToolProvider.getAsyncTools() shouldHaveSize 0
    }

    // ================================================================================
    // Tool Metadata Validation Tests  
    // ================================================================================
    
    "project.create tool should have valid metadata and schema" {
        // This will fail - no tools are registered yet
        val tools = projectToolProvider.getTools()
        val createTool = tools.find { it.name == "project.create" }
        
        createTool shouldNotBe null
        createTool!!.description shouldContain "Create a new project"
        
        // Validate JSON schema structure
        val schema = createTool.parametersSchema
        schema["type"]?.jsonPrimitive?.content shouldBe "object"
        
        val properties = schema["properties"]?.jsonObject
        properties shouldNotBe null
        properties!!["name"] shouldNotBe null
        properties["description"] shouldNotBe null
        
        val required = schema["required"]?.jsonArray
        required shouldNotBe null
        required!!.map { it.jsonPrimitive.content } shouldContain "name"
    }
    
    "project.get tool should have valid metadata and schema" {
        // This will fail - no tools are registered yet
        val tools = projectToolProvider.getTools()
        val getTool = tools.find { it.name == "project.get" }
        
        getTool shouldNotBe null
        getTool!!.description shouldContain "Retrieve a project"
        
        val schema = getTool.parametersSchema
        val properties = schema["properties"]?.jsonObject
        properties shouldNotBe null
        properties!!["id"] shouldNotBe null
        
        val required = schema["required"]?.jsonArray
        required shouldNotBe null  
        required!!.map { it.jsonPrimitive.content } shouldContain "id"
    }
    
    "project.list tool should have valid metadata and schema" {
        // This will fail - no tools are registered yet
        val tools = projectToolProvider.getTools()
        val listTool = tools.find { it.name == "project.list" }
        
        listTool shouldNotBe null
        listTool!!.description shouldContain "List all projects"
        
        val schema = listTool.parametersSchema
        val properties = schema["properties"]?.jsonObject
        // List tool should accept optional status filter
        properties?.get("status") // Optional parameter
    }
    
    "project.update tool should have valid metadata and schema" {
        // This will fail - no tools are registered yet
        val tools = projectToolProvider.getTools()
        val updateTool = tools.find { it.name == "project.update" }
        
        updateTool shouldNotBe null
        updateTool!!.description shouldContain "Update a project"
        
        val schema = updateTool.parametersSchema
        val properties = schema["properties"]?.jsonObject
        properties shouldNotBe null
        properties!!["id"] shouldNotBe null
        properties["name"] // Optional
        properties["description"] // Optional
        
        val required = schema["required"]?.jsonArray
        required shouldNotBe null
        required!!.map { it.jsonPrimitive.content } shouldContain "id"
    }
    
    "project.delete tool should have valid metadata and schema" {
        // This will fail - no tools are registered yet  
        val tools = projectToolProvider.getTools()
        val deleteTool = tools.find { it.name == "project.delete" }
        
        deleteTool shouldNotBe null
        deleteTool!!.description shouldContain "Delete a project"
        
        val schema = deleteTool.parametersSchema
        val properties = schema["properties"]?.jsonObject
        properties shouldNotBe null
        properties!!["id"] shouldNotBe null
        
        val required = schema["required"]?.jsonArray
        required shouldNotBe null
        required!!.map { it.jsonPrimitive.content } shouldContain "id"
    }

    // ================================================================================
    // JSON Schema Validation Tests
    // ================================================================================
    
    "project.create should validate required name parameter" {
        // This will fail - no validation implementation exists yet
        val tools = projectToolProvider.getTools()
        val createTool = tools.find { it.name == "project.create" }!!
        
        val invalidParams = JsonObject(emptyMap()) // Missing required name
        
        shouldThrow<ParameterValidationException> {
            runBlocking { 
                createTool.handler(invalidParams)
            }
        }
    }
    
    "project.create should accept valid parameters" {
        // This will fail - no implementation exists yet
        val tools = projectToolProvider.getTools()
        val createTool = tools.find { it.name == "project.create" }!!
        
        val validParams = JsonObject(mapOf(
            "name" to JsonPrimitive("Test Project"),
            "description" to JsonPrimitive("A test project")
        ))
        
        val mockProject = ProjectDto(
            id = ProjectId(UUID.randomUUID().toString()),
            name = "Test Project", 
            description = "A test project",
            status = ProjectStatus.ACTIVE,
            issueIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockProjectService.createProject(any()) } returns mockProject
        
        // This will fail - handler not implemented
        val result = runBlocking { createTool.handler(validParams) }
        result.isSuccess shouldBe true
    }
    
    "project.get should validate required id parameter" {
        // This will fail - no validation implementation exists yet
        val tools = projectToolProvider.getTools()
        val getTool = tools.find { it.name == "project.get" }!!
        
        val invalidParams = JsonObject(emptyMap()) // Missing required id
        
        shouldThrow<ParameterValidationException> {
            runBlocking {
                getTool.handler(invalidParams)
            }
        }
    }

    // ================================================================================
    // Service Integration Tests
    // ================================================================================
    
    "project.create should delegate to ProjectApplicationService" {
        // This will fail - no service integration exists yet
        val tools = projectToolProvider.getTools()
        val createTool = tools.find { it.name == "project.create" }!!
        
        val params = JsonObject(mapOf(
            "name" to JsonPrimitive("Integration Test"),
            "description" to JsonPrimitive("Testing service integration")
        ))
        
        val mockProject = ProjectDto(
            id = ProjectId(UUID.randomUUID().toString()),
            name = "Integration Test",
            description = "Testing service integration", 
            status = ProjectStatus.ACTIVE,
            issueIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockProjectService.createProject(any()) } returns mockProject
        
        // This will fail - no service integration implemented
        runBlocking { createTool.handler(params) }
        
        coVerify { 
            mockProjectService.createProject(
                match<CreateProjectCommand> { 
                    it.name == "Integration Test" &&
                    it.description == "Testing service integration"
                }
            )
        }
    }
    
    "project.get should delegate to ProjectApplicationService" {
        // This will fail - no service integration exists yet
        val tools = projectToolProvider.getTools()
        val getTool = tools.find { it.name == "project.get" }!!
        
        val projectId = ProjectId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "id" to JsonPrimitive(projectId.value)
        ))
        
        val mockProject = ProjectDto(
            id = projectId,
            name = "Retrieved Project",
            description = "A retrieved project",
            status = ProjectStatus.ACTIVE,
            issueIds = emptyList(), 
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockProjectService.getProject(projectId) } returns mockProject
        
        // This will fail - no service integration implemented
        runBlocking { getTool.handler(params) }
        
        coVerify { mockProjectService.getProject(projectId) }
    }
    
    "project.list should delegate to ProjectApplicationService" {
        // This will fail - no service integration exists yet
        val tools = projectToolProvider.getTools()
        val listTool = tools.find { it.name == "project.list" }!!
        
        val params = JsonObject(emptyMap()) // No parameters for list all
        
        val mockProjects = ProjectListDto(
            projects = listOf(
                ProjectDto(
                    id = ProjectId(UUID.randomUUID().toString()),
                    name = "Project 1",
                    description = "First project",
                    status = ProjectStatus.ACTIVE,
                    issueIds = emptyList(),
                    createdAt = Instant.now(),
                    updatedAt = Instant.now()
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockProjectService.listProjects() } returns mockProjects
        
        // This will fail - no service integration implemented
        runBlocking { listTool.handler(params) }
        
        coVerify { mockProjectService.listProjects() }
    }

    // ================================================================================
    // Error Handling Tests
    // ================================================================================
    
    "project.get should handle ProjectNotFoundException" {
        // This will fail - no error handling implemented
        val tools = projectToolProvider.getTools()
        val getTool = tools.find { it.name == "project.get" }!!
        
        val nonExistentId = ProjectId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "id" to JsonPrimitive(nonExistentId.value)
        ))
        
        coEvery { mockProjectService.getProject(nonExistentId) } throws ProjectNotFoundException(nonExistentId)
        
        // Should wrap in ToolExecutionException
        shouldThrow<ToolExecutionException> {
            runBlocking { getTool.handler(params) }
        }
    }
    
    "project.create should handle invalid domain data" {
        // This will fail - no error handling implemented
        val tools = projectToolProvider.getTools()
        val createTool = tools.find { it.name == "project.create" }!!
        
        val params = JsonObject(mapOf(
            "name" to JsonPrimitive(""), // Invalid empty name
            "description" to JsonPrimitive("Valid description")
        ))
        
        coEvery { 
            mockProjectService.createProject(any()) 
        } throws IllegalArgumentException("Project name cannot be empty")
        
        shouldThrow<ToolExecutionException> {
            runBlocking { createTool.handler(params) }
        }
    }
    
    "project.delete should handle service failures gracefully" {
        // This will fail - no error handling implemented
        val tools = projectToolProvider.getTools()
        val deleteTool = tools.find { it.name == "project.delete" }!!
        
        val projectId = ProjectId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "id" to JsonPrimitive(projectId.value)
        ))
        
        coEvery { 
            mockProjectService.deleteProject(projectId) 
        } throws RuntimeException("Database connection failed")
        
        shouldThrow<ToolExecutionException> {
            runBlocking { deleteTool.handler(params) }
        }
    }

    // ================================================================================
    // Performance Requirements Tests
    // ================================================================================
    
    "project.create should complete within 100ms performance requirement" {
        // This will fail - no implementation exists yet
        val tools = projectToolProvider.getTools()
        val createTool = tools.find { it.name == "project.create" }!!
        
        val params = JsonObject(mapOf(
            "name" to JsonPrimitive("Performance Test"),
            "description" to JsonPrimitive("Testing performance")
        ))
        
        val mockProject = ProjectDto(
            id = ProjectId(UUID.randomUUID().toString()),
            name = "Performance Test",
            description = "Testing performance",
            status = ProjectStatus.ACTIVE,
            issueIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockProjectService.createProject(any()) } returns mockProject
        
        val startTime = System.currentTimeMillis()
        runBlocking { createTool.handler(params) }
        val executionTime = System.currentTimeMillis() - startTime
        
        // Tool execution should be under 100ms
        executionTime shouldBe lessThan(100)
    }

    // ================================================================================
    // End-to-End Workflow Tests  
    // ================================================================================
    
    "complete project lifecycle workflow should work end-to-end" {
        // This will fail - no complete implementation exists yet
        val tools = projectToolProvider.getTools()
        val createTool = tools.find { it.name == "project.create" }!!
        val getTool = tools.find { it.name == "project.get" }!!
        val updateTool = tools.find { it.name == "project.update" }!!
        val listTool = tools.find { it.name == "project.list" }!!
        val deleteTool = tools.find { it.name == "project.delete" }!!
        
        val projectId = ProjectId(UUID.randomUUID().toString())
        
        // Mock project creation
        val createdProject = ProjectDto(
            id = projectId,
            name = "Workflow Test",
            description = "Testing complete workflow",
            status = ProjectStatus.ACTIVE,
            issueIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockProjectService.createProject(any()) } returns createdProject
        coEvery { mockProjectService.getProject(projectId) } returns createdProject
        coEvery { mockProjectService.updateProject(any()) } returns createdProject.copy(name = "Updated Workflow Test")
        coEvery { mockProjectService.listProjects() } returns ProjectListDto(listOf(createdProject), 1)
        coEvery { mockProjectService.deleteProject(projectId) } just runs
        
        // Execute complete workflow
        runBlocking {
            // 1. Create project
            val createResult = createTool.handler(JsonObject(mapOf(
                "name" to JsonPrimitive("Workflow Test"),
                "description" to JsonPrimitive("Testing complete workflow")
            )))
            createResult.isSuccess shouldBe true
            
            // 2. Get project
            val getResult = getTool.handler(JsonObject(mapOf(
                "id" to JsonPrimitive(projectId.value)
            )))
            getResult.isSuccess shouldBe true
            
            // 3. Update project
            val updateResult = updateTool.handler(JsonObject(mapOf(
                "id" to JsonPrimitive(projectId.value),
                "name" to JsonPrimitive("Updated Workflow Test")
            )))
            updateResult.isSuccess shouldBe true
            
            // 4. List projects
            val listResult = listTool.handler(JsonObject(emptyMap()))
            listResult.isSuccess shouldBe true
            
            // 5. Delete project
            val deleteResult = deleteTool.handler(JsonObject(mapOf(
                "id" to JsonPrimitive(projectId.value)
            )))
            deleteResult.isSuccess shouldBe true
        }
        
        // Verify all service calls were made
        coVerify { mockProjectService.createProject(any()) }
        coVerify { mockProjectService.getProject(projectId) }
        coVerify { mockProjectService.updateProject(any()) }
        coVerify { mockProjectService.listProjects() }
        coVerify { mockProjectService.deleteProject(projectId) }
    }

    // ================================================================================
    // JSON Response Format Tests
    // ================================================================================
    
    "project.create should return properly formatted JSON response" {
        // This will fail - no JSON formatting implemented
        val tools = projectToolProvider.getTools()
        val createTool = tools.find { it.name == "project.create" }!!
        
        val params = JsonObject(mapOf(
            "name" to JsonPrimitive("Format Test"),
            "description" to JsonPrimitive("Testing JSON format")
        ))
        
        val mockProject = ProjectDto(
            id = ProjectId("12345678-1234-1234-1234-123456789abc"),
            name = "Format Test",
            description = "Testing JSON format",
            status = ProjectStatus.ACTIVE,
            issueIds = emptyList(),
            createdAt = Instant.parse("2024-01-01T00:00:00Z"),
            updatedAt = Instant.parse("2024-01-01T00:00:00Z")
        )
        
        coEvery { mockProjectService.createProject(any()) } returns mockProject
        
        val result = runBlocking { createTool.handler(params) }
        result.isSuccess shouldBe true
        
        val jsonResponse = result.getOrThrow()
        val responseObj = jsonResponse.jsonObject
        
        responseObj["id"]?.jsonPrimitive?.content shouldBe "12345678-1234-1234-1234-123456789abc"
        responseObj["name"]?.jsonPrimitive?.content shouldBe "Format Test"
        responseObj["description"]?.jsonPrimitive?.content shouldBe "Testing JSON format"
        responseObj["status"]?.jsonPrimitive?.content shouldBe "ACTIVE"
        responseObj["issueIds"]?.jsonArray shouldHaveSize 0
    }
})

// Extension function for performance testing 
private infix fun <T : Comparable<T>> T.lessThan(other: T): Boolean = this < other