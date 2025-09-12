package io.spiralhouse.cycletime.unit

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.types.shouldBeInstanceOf
import io.mockk.*
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.*
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.commands.CreateProjectCommand
import io.spiralhouse.cycletime.application.dto.*
import io.spiralhouse.cycletime.mcp.tools.DefaultProjectToolProvider
import io.spiralhouse.cycletime.mcp.tools.ToolHandler
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.datetime.Clock
import java.util.UUID

/**
 * Unit tests for DefaultProjectToolProvider following TDD principles.
 * 
 * Tests verify:
 * - Tool registration and discovery
 * - MCP response formatting with content array structure
 * - Service integration with proper error handling
 * - Parameter validation and error cases
 */
class DefaultProjectToolProviderUnitTest : StringSpec({

    lateinit var mockProjectService: ProjectApplicationService
    lateinit var toolProvider: DefaultProjectToolProvider

    beforeEach {
        mockProjectService = mockk(relaxed = true)
        toolProvider = DefaultProjectToolProvider(mockProjectService)
    }

    // TDD Cycle 1: Tool Registration Tests
    "should provide correct namespace" {
        toolProvider.namespace shouldBe "project"
    }

    "should register async tools correctly" {
        val asyncTools = toolProvider.getAsyncTools()
        asyncTools shouldHaveSize 4
        
        val toolNames = asyncTools.map { it.name }
        toolNames shouldContain "create_project"
        toolNames shouldContain "get_project"  
        toolNames shouldContain "list_projects"
        toolNames shouldContain "update_project"
    }

    "should provide empty synchronous tools" {
        val syncTools = toolProvider.getTools()
        syncTools shouldHaveSize 0
    }

    // TDD Cycle 2: MCP Response Format Tests
    "create_project should return MCP content array format" {
        runTest {
            val mockProjectDto = ProjectDto(
                id = ProjectId(UUID.randomUUID().toString()),
                name = "Test Project",
                description = "Test Description",
                status = ProjectStatus.ACTIVE,
                issues = emptyList(),
                issueCount = 0,
                createdAt = Clock.System.now(),
                updatedAt = Clock.System.now()
            )
            coEvery { mockProjectService.createProject(any()) } returns mockProjectDto

            val createTool = toolProvider.getAsyncTools().first { it.name == "create_project" }
            val params = buildJsonObject {
                put("name", "Test Project")
                put("description", "Test Description")
            }

            val result = createTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            // Should return MCP content array structure
            result.shouldBeInstanceOf<JsonObject>()
            result["content"].shouldNotBe(null)
            val content = result["content"]!!.jsonArray
            content shouldHaveSize 1
            content[0].jsonObject["type"]!!.jsonPrimitive.content shouldBe "text"
            content[0].jsonObject["text"].shouldNotBe(null)
        }
    }

    "get_project should return MCP content array format" {
        runTest {
            val mockProjectDto = ProjectDto(
                id = ProjectId(UUID.randomUUID().toString()),
                name = "Test Project",
                description = "Test Description",
                status = ProjectStatus.ACTIVE,
                issues = emptyList(),
                issueCount = 0,
                createdAt = Clock.System.now(),
                updatedAt = Clock.System.now()
            )
            coEvery { mockProjectService.getProject(any()) } returns mockProjectDto

            val getTool = toolProvider.getAsyncTools().first { it.name == "get_project" }
            val params = buildJsonObject {
                put("id", UUID.randomUUID().toString())
            }

            val result = getTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            // Should return MCP content array structure
            result.shouldBeInstanceOf<JsonObject>()
            result["content"].shouldNotBe(null)
            val content = result["content"]!!.jsonArray
            content shouldHaveSize 1
            content[0].jsonObject["type"]!!.jsonPrimitive.content shouldBe "text"
            content[0].jsonObject["text"].shouldNotBe(null)
        }
    }

    "list_projects should return MCP content array format" {
        runTest {
            val mockProjectsList = ProjectListDto(
                projects = listOf(
                    ProjectDto(
                        id = ProjectId(UUID.randomUUID().toString()),
                        name = "Project 1",
                        description = "Description 1",
                        status = ProjectStatus.ACTIVE,
                        issues = emptyList(),
                        issueCount = 0,
                        createdAt = Clock.System.now(),
                        updatedAt = Clock.System.now()
                    )
                ),
                totalCount = 1
            )
            coEvery { mockProjectService.listProjects() } returns mockProjectsList

            val listTool = toolProvider.getAsyncTools().first { it.name == "list_projects" }
            val params = buildJsonObject {}

            val result = listTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            // Should return MCP content array structure
            result.shouldBeInstanceOf<JsonObject>()
            result["content"].shouldNotBe(null)
            val content = result["content"]!!.jsonArray
            content shouldHaveSize 1
            content[0].jsonObject["type"]!!.jsonPrimitive.content shouldBe "text"
            content[0].jsonObject["text"].shouldNotBe(null)
        }
    }

    "update_project should return MCP content array format" {
        runTest {
            val updateTool = toolProvider.getAsyncTools().first { it.name == "update_project" }
            val params = buildJsonObject {
                put("id", UUID.randomUUID().toString())
                put("name", "Updated Project")
            }

            val result = updateTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            // Should return MCP content array structure - THIS CURRENTLY FAILS
            result.shouldBeInstanceOf<JsonObject>()
            result["content"].shouldNotBe(null)
            val content = result["content"]!!.jsonArray
            content shouldHaveSize 1
            content[0].jsonObject["type"]!!.jsonPrimitive.content shouldBe "text"
            content[0].jsonObject["text"].shouldNotBe(null)
        }
    }

    // TDD Cycle 3: Service Integration Tests
    "should call ProjectApplicationService.createProject with correct parameters" {
        runTest {
            val mockProjectDto = ProjectDto(
                id = ProjectId(UUID.randomUUID().toString()),
                name = "Test Project",
                description = "Test Description",
                status = ProjectStatus.ACTIVE,
                issues = emptyList(),
                issueCount = 0,
                createdAt = Clock.System.now(),
                updatedAt = Clock.System.now()
            )
            coEvery { mockProjectService.createProject(any()) } returns mockProjectDto

            val createTool = toolProvider.getAsyncTools().first { it.name == "create_project" }
            val params = buildJsonObject {
                put("name", "Test Project")
                put("description", "Test Description")
            }

            createTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            coVerify(exactly = 1) { 
                mockProjectService.createProject(match<CreateProjectCommand> { command ->
                    command.name == "Test Project" &&
                    command.description == "Test Description"
                })
            }
        }
    }

    "should call ProjectApplicationService.getProject with correct ID" {
        runTest {
            val mockProjectDto = ProjectDto(
                id = ProjectId(UUID.randomUUID().toString()),
                name = "Test Project", 
                description = "Test Description",
                status = ProjectStatus.ACTIVE,
                issues = emptyList(),
                issueCount = 0,
                createdAt = Clock.System.now(),
                updatedAt = Clock.System.now()
            )
            coEvery { mockProjectService.getProject(any()) } returns mockProjectDto

            val getTool = toolProvider.getAsyncTools().first { it.name == "get_project" }
            val params = buildJsonObject {
                put("id", UUID.randomUUID().toString())
            }

            getTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            coVerify(exactly = 1) { 
                mockProjectService.getProject(any())
            }
        }
    }

    // TDD Cycle 4: Parameter Validation Tests
    "should throw IllegalArgumentException when name is missing" {
        runTest {
            val createTool = toolProvider.getAsyncTools().first { it.name == "create_project" }
            val params = buildJsonObject {
                put("description", "Test Description")
                // Missing name
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

    "should throw IllegalArgumentException when get_project ID is missing" {
        runTest {
            val getTool = toolProvider.getAsyncTools().first { it.name == "get_project" }
            val params = buildJsonObject {
                // Missing id
            }

            val result = getTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params)
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.isFailure shouldBe true
            result.exceptionOrNull()?.message shouldContain "id is required"
        }
    }

    "should throw IllegalArgumentException when project not found" {
        runTest {
            coEvery { mockProjectService.getProject(any()) } returns null

            val getTool = toolProvider.getAsyncTools().first { it.name == "get_project" }
            val params = buildJsonObject {
                put("id", UUID.randomUUID().toString())
            }

            val result = getTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params)
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.isFailure shouldBe true
            result.exceptionOrNull()?.message shouldContain "Project not found:"
        }
    }

    "should throw IllegalArgumentException when update_project ID is missing" {
        runTest {
            val updateTool = toolProvider.getAsyncTools().first { it.name == "update_project" }
            val params = buildJsonObject {
                put("name", "Updated Project")
                // Missing id
            }

            val result = updateTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params)
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.isFailure shouldBe true
            result.exceptionOrNull()?.message shouldContain "id is required"
        }
    }
})