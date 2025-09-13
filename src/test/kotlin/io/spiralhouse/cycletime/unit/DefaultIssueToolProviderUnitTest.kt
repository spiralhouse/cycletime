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
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.commands.CreateIssueCommand
import io.spiralhouse.cycletime.application.dto.*
import io.spiralhouse.cycletime.mcp.tools.DefaultIssueToolProvider
import io.spiralhouse.cycletime.mcp.tools.ToolHandler
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.datetime.Clock
import java.util.UUID

/**
 * Unit tests for DefaultIssueToolProvider following TDD principles.
 * 
 * Tests verify:
 * - Tool registration and discovery
 * - MCP response formatting with content array structure
 * - IssueType handling with fromString() method
 * - Service integration with proper error handling
 * - Parameter validation and error cases
 */
class DefaultIssueToolProviderUnitTest : StringSpec({

    lateinit var mockIssueService: IssueApplicationService
    lateinit var toolProvider: DefaultIssueToolProvider

    beforeEach {
        mockIssueService = mockk(relaxed = true)
        toolProvider = DefaultIssueToolProvider(mockIssueService)
    }

    // TDD Cycle 1: Tool Registration Tests
    "should provide correct namespace" {
        toolProvider.namespace shouldBe "issue"
    }

    "should register async tools correctly" {
        val asyncTools = toolProvider.getAsyncTools()
        asyncTools shouldHaveSize 4
        
        val toolNames = asyncTools.map { it.name }
        toolNames shouldContain "create_issue"
        toolNames shouldContain "get_issue"  
        toolNames shouldContain "list_issues"
        toolNames shouldContain "update_issue"
    }

    "should provide empty synchronous tools" {
        val syncTools = toolProvider.getTools()
        syncTools shouldHaveSize 0
    }

    // TDD Cycle 2: MCP Response Format Tests
    "create_issue should return MCP content array format" {
        runTest {
            val mockIssueDto = IssueDto(
                id = IssueId(UUID.randomUUID().toString()),
                title = "Test Issue",
                description = null,
                type = IssueType.STORY,
                status = IssueStatus.TODO,
                parentId = null,
                projectId = ProjectId(UUID.randomUUID().toString()),
                estimate = Estimate.none(),
                assigneeId = null,
                dependencies = emptyList(),
                blockedBy = emptyList(),
                createdAt = Clock.System.now(),
                updatedAt = Clock.System.now()
            )
            coEvery { mockIssueService.createIssue(any()) } returns mockIssueDto

            val createTool = toolProvider.getAsyncTools().first { it.name == "create_issue" }
            val params = buildJsonObject {
                put("title", "Test Issue")
                put("projectId", UUID.randomUUID().toString())
                put("type", "STORY")
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

    "get_issue should return MCP content array format" {
        runTest {
            val mockIssueDto = IssueDto(
                id = IssueId(UUID.randomUUID().toString()),
                title = "Test Issue",
                description = "Test Description",
                type = IssueType.STORY,
                status = IssueStatus.TODO,
                parentId = null,
                projectId = ProjectId(UUID.randomUUID().toString()),
                estimate = Estimate.none(),
                assigneeId = null,
                dependencies = emptyList(),
                blockedBy = emptyList(),
                createdAt = Clock.System.now(),
                updatedAt = Clock.System.now()
            )
            coEvery { mockIssueService.getIssue(any()) } returns mockIssueDto

            val getTool = toolProvider.getAsyncTools().first { it.name == "get_issue" }
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

    "list_issues should return MCP content array format" {
        runTest {
            val mockIssuesList = IssueListDto(
                issues = listOf(
                    IssueDto(
                        id = IssueId(UUID.randomUUID().toString()),
                        title = "Title 1",
                        description = null,
                        type = IssueType.STORY,
                        status = IssueStatus.TODO,
                        parentId = null,
                        projectId = ProjectId(UUID.randomUUID().toString()),
                        estimate = Estimate.none(),
                        assigneeId = null,
                        dependencies = emptyList(),
                        blockedBy = emptyList(),
                        createdAt = Clock.System.now(),
                        updatedAt = Clock.System.now()
                    )
                ),
                totalCount = 1
            )
            coEvery { mockIssueService.listIssues() } returns mockIssuesList

            val listTool = toolProvider.getAsyncTools().first { it.name == "list_issues" }
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

    "update_issue should return MCP content array format" {
        runTest {
            val updateTool = toolProvider.getAsyncTools().first { it.name == "update_issue" }
            val params = buildJsonObject {
                put("id", UUID.randomUUID().toString())
                put("title", "Updated Title")
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

    // TDD Cycle 3: IssueType Conversion Tests  
    "should use IssueType.fromString for type parameter parsing" {
        runTest {
            val mockIssueDto = IssueDto(
                id = IssueId(UUID.randomUUID().toString()),
                title = "Test Issue",
                description = null,
                type = IssueType.SUBTASK,
                status = IssueStatus.TODO,
                parentId = null,
                projectId = ProjectId(UUID.randomUUID().toString()),
                estimate = Estimate.none(),
                assigneeId = null,
                dependencies = emptyList(),
                blockedBy = emptyList(),
                createdAt = Clock.System.now(),
                updatedAt = Clock.System.now()
            )
            coEvery { mockIssueService.createIssue(any()) } returns mockIssueDto

            val createTool = toolProvider.getAsyncTools().first { it.name == "create_issue" }
            val params = buildJsonObject {
                put("title", "Test Issue")
                put("projectId", UUID.randomUUID().toString())
                put("type", "SUBTASK")
            }

            val result = createTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            // Verify that IssueType.fromString was used correctly
            coVerify(exactly = 1) { 
                mockIssueService.createIssue(match<CreateIssueCommand> { command ->
                    command.type == IssueType.SUBTASK
                })
            }
        }
    }

    "should default to STORY when type parameter is missing" {
        runTest {
            val mockIssueDto = IssueDto(
                id = IssueId(UUID.randomUUID().toString()),
                title = "Test Issue",
                description = null,
                type = IssueType.STORY,
                status = IssueStatus.TODO,
                parentId = null,
                projectId = ProjectId(UUID.randomUUID().toString()),
                estimate = Estimate.none(),
                assigneeId = null,
                dependencies = emptyList(),
                blockedBy = emptyList(),
                createdAt = Clock.System.now(),
                updatedAt = Clock.System.now()
            )
            coEvery { mockIssueService.createIssue(any()) } returns mockIssueDto

            val createTool = toolProvider.getAsyncTools().first { it.name == "create_issue" }
            val params = buildJsonObject {
                put("title", "Test Issue")
                put("projectId", UUID.randomUUID().toString())
                // No type parameter
            }

            val result = createTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            coVerify(exactly = 1) { 
                mockIssueService.createIssue(match<CreateIssueCommand> { command ->
                    command.type == IssueType.STORY
                })
            }
        }
    }

    // TDD Cycle 4: Service Integration Tests
    "should call IssueApplicationService.createIssue with correct parameters" {
        runTest {
            val mockIssueDto = IssueDto(
                id = IssueId(UUID.randomUUID().toString()),
                title = "Test Issue",
                description = "Test Description",
                type = IssueType.EPIC,
                status = IssueStatus.TODO,
                parentId = null,
                projectId = ProjectId(UUID.randomUUID().toString()),
                estimate = Estimate.none(),
                assigneeId = null,
                dependencies = emptyList(),
                blockedBy = emptyList(),
                createdAt = Clock.System.now(),
                updatedAt = Clock.System.now()
            )
            coEvery { mockIssueService.createIssue(any()) } returns mockIssueDto

            val createTool = toolProvider.getAsyncTools().first { it.name == "create_issue" }
            val params = buildJsonObject {
                put("title", "Test Issue")
                put("description", "Test Description")
                put("projectId", UUID.randomUUID().toString())
                put("type", "EPIC")
            }

            createTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            coVerify(exactly = 1) { 
                mockIssueService.createIssue(match<CreateIssueCommand> { command ->
                    command.title == "Test Issue" &&
                    command.description == "Test Description" &&
                    command.type == IssueType.EPIC &&
                    command.projectId != null
                })
            }
        }
    }

    "should call IssueApplicationService.getIssue with correct ID" {
        runTest {
            val mockIssueDto = IssueDto(
                id = IssueId(UUID.randomUUID().toString()),
                title = "Test Issue", 
                description = null,
                type = IssueType.STORY,
                status = IssueStatus.TODO,
                parentId = null,
                projectId = ProjectId(UUID.randomUUID().toString()),
                estimate = Estimate.none(),
                assigneeId = null,
                dependencies = emptyList(),
                blockedBy = emptyList(),
                createdAt = Clock.System.now(),
                updatedAt = Clock.System.now()
            )
            coEvery { mockIssueService.getIssue(any()) } returns mockIssueDto

            val getTool = toolProvider.getAsyncTools().first { it.name == "get_issue" }
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
                mockIssueService.getIssue(any())
            }
        }
    }

    // TDD Cycle 5: Parameter Validation Tests
    "should throw IllegalArgumentException when title is missing" {
        runTest {
            val createTool = toolProvider.getAsyncTools().first { it.name == "create_issue" }
            val params = buildJsonObject {
                put("projectId", UUID.randomUUID().toString())
                // Missing title
            }

            val result = createTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params)
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.isFailure shouldBe true
            result.exceptionOrNull()?.message shouldContain "title is required"
        }
    }

    "should throw IllegalArgumentException when projectId is missing" {
        runTest {
            val createTool = toolProvider.getAsyncTools().first { it.name == "create_issue" }
            val params = buildJsonObject {
                put("title", "Test Issue")
                // Missing projectId
            }

            val result = createTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params)
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.isFailure shouldBe true
            result.exceptionOrNull()?.message shouldContain "projectId is required"
        }
    }

    "should throw IllegalArgumentException when get_issue ID is missing" {
        runTest {
            val getTool = toolProvider.getAsyncTools().first { it.name == "get_issue" }
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

    "should throw IllegalArgumentException when issue not found" {
        runTest {
            coEvery { mockIssueService.getIssue(any()) } returns null

            val getTool = toolProvider.getAsyncTools().first { it.name == "get_issue" }
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
            result.exceptionOrNull()?.message shouldContain "Issue not found:"
        }
    }
})