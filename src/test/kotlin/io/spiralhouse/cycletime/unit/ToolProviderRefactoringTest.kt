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
import io.spiralhouse.cycletime.application.services.*
import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.dto.*
import io.spiralhouse.cycletime.mcp.tools.*
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.domain.entities.SessionContext
import kotlinx.datetime.Clock
import java.util.UUID

/**
 * Behavior preservation tests for tool provider refactoring.
 *
 * CRITICAL MISSION: These tests capture the EXACT behavior of existing tool providers
 * before AbstractToolProvider extraction. They must pass before and after refactoring
 * to prove zero behavior change.
 *
 * Focus areas:
 * 1. MCP response format preservation (exact JSON structure)
 * 2. Tool registration compatibility (names, descriptions, parameter schemas)
 * 3. Parameter validation behavior preservation (same errors for same inputs)
 *
 * These are NOT feature tests - they are surgical safety tests for safe refactoring.
 */
class ToolProviderRefactoringTest : StringSpec({

    // ========================================
    // ISSUE TOOL PROVIDER BEHAVIOR PRESERVATION
    // ========================================

    "DefaultIssueToolProvider should preserve exact tool registration" {
        val mockIssueService = mockk<IssueApplicationService>(relaxed = true)
        val provider = DefaultIssueToolProvider(mockIssueService)

        // Verify exact namespace
        provider.namespace shouldBe "issue"

        // Verify exact tool count and names
        val asyncTools = provider.getAsyncTools()
        asyncTools shouldHaveSize 4
        
        val toolNames = asyncTools.map { it.name }.sorted()
        toolNames shouldBe listOf("create_issue", "get_issue", "list_issues", "update_issue")

        // Verify sync tools behavior
        provider.getTools() shouldHaveSize 0
    }

    "DefaultIssueToolProvider should preserve exact MCP response format" {
        runTest {
            val mockIssueService = mockk<IssueApplicationService>(relaxed = true)
            val provider = DefaultIssueToolProvider(mockIssueService)

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

            val createTool = provider.getAsyncTools().first { it.name == "create_issue" }
            val params = buildJsonObject {
                put("title", "Test Issue")
                put("projectId", mockIssueDto.projectId?.value ?: UUID.randomUUID().toString())
                put("type", "STORY")
            }

            val result = (createTool.handler as ToolHandler.Async).handler(params).getOrThrow()

            // Verify exact MCP response structure
            result.shouldBeInstanceOf<JsonObject>()
            result.jsonObject.keys shouldContain "content"
            
            val content = result["content"]!!.jsonArray
            content shouldHaveSize 1
            
            val contentItem = content[0].jsonObject
            contentItem["type"]!!.jsonPrimitive.content shouldBe "text"
            contentItem.keys shouldContain "text"
            
            // Verify text contains serialized response data
            val textContent = contentItem["text"]!!.jsonPrimitive.content
            textContent shouldContain "Test Issue"
            // Verify JSON structure contains id and title fields
            textContent shouldContain "id"
            textContent shouldContain "title"
        }
    }

    "DefaultIssueToolProvider should preserve exact parameter validation behavior" {
        runTest {
            val mockIssueService = mockk<IssueApplicationService>(relaxed = true)
            val provider = DefaultIssueToolProvider(mockIssueService)

            val createTool = provider.getAsyncTools().first { it.name == "create_issue" }
            
            // Test missing required parameter behavior
            val paramsWithoutTitle = buildJsonObject {
                put("projectId", "test-project")
            }
            
            val resultMissingTitle = (createTool.handler as ToolHandler.Async)
                .handler(paramsWithoutTitle)
            
            resultMissingTitle.isFailure shouldBe true
            resultMissingTitle.exceptionOrNull()?.message shouldContain "title is required"

            // Test missing projectId behavior  
            val paramsWithoutProject = buildJsonObject {
                put("title", "Test Title")
            }
            
            val resultMissingProject = (createTool.handler as ToolHandler.Async)
                .handler(paramsWithoutProject)
            
            resultMissingProject.isFailure shouldBe true
            resultMissingProject.exceptionOrNull()?.message shouldContain "projectId is required"
        }
    }

    "DefaultIssueToolProvider should preserve exact parameter schema structure" {
        val mockIssueService = mockk<IssueApplicationService>(relaxed = true)
        val provider = DefaultIssueToolProvider(mockIssueService)

        val createTool = provider.getAsyncTools().first { it.name == "create_issue" }
        val schema = createTool.parametersSchema

        // Verify exact schema structure
        schema["type"]!!.jsonPrimitive.content shouldBe "object"
        schema.keys shouldContain "properties"
        schema.keys shouldContain "required"

        val properties = schema["properties"]!!.jsonObject
        properties.keys shouldContain "title"
        properties.keys shouldContain "description"
        properties.keys shouldContain "projectId"
        properties.keys shouldContain "type"

        val required = schema["required"]!!.jsonArray
        required shouldHaveSize 2
        required.map { it.jsonPrimitive.content }.sorted() shouldBe listOf("projectId", "title")

        // Verify enum structure for type field
        val typeProperty = properties["type"]!!.jsonObject
        typeProperty.keys shouldContain "enum"
        val enumValues = typeProperty["enum"]!!.jsonArray
        enumValues.map { it.jsonPrimitive.content }.sorted() shouldBe listOf("EPIC", "STORY", "SUBTASK")
    }

    // ========================================
    // PROJECT TOOL PROVIDER BEHAVIOR PRESERVATION  
    // ========================================

    "DefaultProjectToolProvider should preserve exact tool registration" {
        val mockProjectService = mockk<ProjectApplicationService>(relaxed = true)
        val provider = DefaultProjectToolProvider(mockProjectService)

        // Verify exact namespace
        provider.namespace shouldBe "project"

        // Verify exact tool count and names
        val asyncTools = provider.getAsyncTools()
        asyncTools shouldHaveSize 4
        
        val toolNames = asyncTools.map { it.name }.sorted()
        toolNames shouldBe listOf("create_project", "get_project", "list_projects", "update_project")

        // Verify sync tools behavior
        provider.getTools() shouldHaveSize 0
    }

    "DefaultProjectToolProvider should preserve exact MCP response format" {
        runTest {
            val mockProjectService = mockk<ProjectApplicationService>(relaxed = true)
            val provider = DefaultProjectToolProvider(mockProjectService)

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

            val createTool = provider.getAsyncTools().first { it.name == "create_project" }
            val params = buildJsonObject {
                put("name", "Test Project")
                put("description", "Test Description")
            }

            val result = (createTool.handler as ToolHandler.Async).handler(params).getOrThrow()

            // Verify exact MCP response structure (identical to issue provider)
            result.shouldBeInstanceOf<JsonObject>()
            result.jsonObject.keys shouldContain "content"
            
            val content = result["content"]!!.jsonArray
            content shouldHaveSize 1
            
            val contentItem = content[0].jsonObject
            contentItem["type"]!!.jsonPrimitive.content shouldBe "text"
            contentItem.keys shouldContain "text"
            
            // Verify text contains serialized response data
            val textContent = contentItem["text"]!!.jsonPrimitive.content
            textContent shouldContain "Test Project"
            // Verify JSON structure contains id and name fields
            textContent shouldContain "id"
            textContent shouldContain "name"
        }
    }

    "DefaultProjectToolProvider should preserve exact parameter validation behavior" {
        runTest {
            val mockProjectService = mockk<ProjectApplicationService>(relaxed = true)
            val provider = DefaultProjectToolProvider(mockProjectService)

            val createTool = provider.getAsyncTools().first { it.name == "create_project" }
            
            // Test missing required parameter behavior
            val paramsWithoutName = buildJsonObject {
                put("description", "Some description")
            }
            
            val resultMissingName = (createTool.handler as ToolHandler.Async)
                .handler(paramsWithoutName)
            
            resultMissingName.isFailure shouldBe true
            resultMissingName.exceptionOrNull()?.message shouldContain "name is required"
        }
    }

    // ========================================
    // SESSION TOOL PROVIDER BEHAVIOR PRESERVATION
    // ========================================

    "DefaultSessionToolProvider should preserve exact tool registration" {
        val mockSessionService = mockk<SessionApplicationService>(relaxed = true)
        val provider = DefaultSessionToolProvider(mockSessionService)

        // Verify exact namespace
        provider.namespace shouldBe "session"

        // Verify exact tool count and names
        val asyncTools = provider.getAsyncTools()
        asyncTools shouldHaveSize 6
        
        val toolNames = asyncTools.map { it.name }.sorted()
        toolNames shouldBe listOf(
            "create_session", 
            "get_active_session", 
            "get_next_task", 
            "get_session", 
            "list_active_sessions", 
            "list_sessions"
        )

        // Verify sync tools behavior
        provider.getTools() shouldHaveSize 0
    }

    "DefaultSessionToolProvider should preserve exact helper method behavior" {
        runTest {
            val mockSessionService = mockk<SessionApplicationService>(relaxed = true)
            val provider = DefaultSessionToolProvider(mockSessionService)

            val mockSessionDto = SessionDto(
                sessionKey = SessionKey(UUID.randomUUID().toString()),
                projectId = ProjectId(UUID.randomUUID().toString()),
                currentContext = SessionContext(),
                lastActivity = Clock.System.now(),
                createdAt = Clock.System.now(),
                updatedAt = Clock.System.now()
            )
            coEvery { mockSessionService.createSession(any()) } returns mockSessionDto

            val createTool = provider.getAsyncTools().first { it.name == "create_session" }
            val params = buildJsonObject {
                put("projectId", mockSessionDto.projectId?.value ?: "")
            }

            val result = (createTool.handler as ToolHandler.Async).handler(params).getOrThrow()

            // Verify exact MCP response structure matches the helper method output
            result.shouldBeInstanceOf<JsonObject>()
            result.jsonObject.keys shouldContain "content"
            
            val content = result["content"]!!.jsonArray
            content shouldHaveSize 1
            
            val contentItem = content[0].jsonObject
            contentItem["type"]!!.jsonPrimitive.content shouldBe "text"
            contentItem.keys shouldContain "text"
            
            // Verify specific text format generated by the session provider
            val textContent = contentItem["text"]!!.jsonPrimitive.content
            textContent shouldContain "Session created for project"
            textContent shouldContain "Key:"
            // Verify the format contains a UUID pattern for both project ID and session key
            textContent shouldContain Regex("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
        }
    }

    "DefaultSessionToolProvider should preserve exact parameter extraction behavior" {
        runTest {
            val mockSessionService = mockk<SessionApplicationService>(relaxed = true)
            val provider = DefaultSessionToolProvider(mockSessionService)

            val createTool = provider.getAsyncTools().first { it.name == "create_session" }
            val getTool = provider.getAsyncTools().first { it.name == "get_session" }
            val getNextTaskTool = provider.getAsyncTools().first { it.name == "get_next_task" }
            
            // Test required parameter extraction behavior
            val paramsWithoutProjectId = buildJsonObject {}
            val resultMissingProjectId = (createTool.handler as ToolHandler.Async)
                .handler(paramsWithoutProjectId)
            
            resultMissingProjectId.isFailure shouldBe true
            resultMissingProjectId.exceptionOrNull()?.message shouldContain "projectId is required"

            // Test required sessionKey parameter behavior
            val paramsWithoutSessionKey = buildJsonObject {}
            val resultMissingSessionKey = (getTool.handler as ToolHandler.Async)
                .handler(paramsWithoutSessionKey)
            
            resultMissingSessionKey.isFailure shouldBe true
            resultMissingSessionKey.exceptionOrNull()?.message shouldContain "sessionKey is required"

            // Test optional parameter behavior (should not throw)
            val paramsWithoutOptionalSessionKey = buildJsonObject {}
            val resultOptional = (getNextTaskTool.handler as ToolHandler.Async)
                .handler(paramsWithoutOptionalSessionKey)
            
            resultOptional.isFailure shouldBe false
        }
    }

    // ========================================
    // CROSS-PROVIDER CONSISTENCY VERIFICATION  
    // ========================================

    "All tool providers should preserve identical MCP response structure" {
        runTest {
            val mockIssueService = mockk<IssueApplicationService>(relaxed = true)
            val mockProjectService = mockk<ProjectApplicationService>(relaxed = true)
            val mockSessionService = mockk<SessionApplicationService>(relaxed = true)

            val issueProvider = DefaultIssueToolProvider(mockIssueService)
            val projectProvider = DefaultProjectToolProvider(mockProjectService)
            val sessionProvider = DefaultSessionToolProvider(mockSessionService)

            // Mock responses
            val mockIssueDto = IssueDto(
                id = IssueId(UUID.randomUUID().toString()),
                title = "Test",
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
            val mockProjectDto = ProjectDto(
                id = ProjectId(UUID.randomUUID().toString()),
                name = "Test",
                description = null,
                status = ProjectStatus.ACTIVE,
                issues = emptyList(),
                issueCount = 0,
                createdAt = Clock.System.now(),
                updatedAt = Clock.System.now()
            )
            val mockSessionsList = SessionListDto(sessions = emptyList(), totalCount = 0)

            coEvery { mockIssueService.listIssues() } returns IssueListDto(
                issues = listOf(mockIssueDto),
                totalCount = 1
            )
            coEvery { mockProjectService.listProjects() } returns ProjectListDto(
                projects = listOf(mockProjectDto),
                totalCount = 1
            )
            coEvery { mockSessionService.listActiveSessions() } returns mockSessionsList

            // Get list tools from each provider
            val issueListTool = issueProvider.getAsyncTools().first { it.name == "list_issues" }
            val projectListTool = projectProvider.getAsyncTools().first { it.name == "list_projects" }
            val sessionListTool = sessionProvider.getAsyncTools().first { it.name == "list_active_sessions" }

            val emptyParams = buildJsonObject {}

            // Execute tools
            val issueResult = (issueListTool.handler as ToolHandler.Async).handler(emptyParams).getOrThrow()
            val projectResult = (projectListTool.handler as ToolHandler.Async).handler(emptyParams).getOrThrow()
            val sessionResult = (sessionListTool.handler as ToolHandler.Async).handler(emptyParams).getOrThrow()

            // Verify identical response structure
            listOf(issueResult, projectResult, sessionResult).forEach { result ->
                result.shouldBeInstanceOf<JsonObject>()
                result.jsonObject.keys shouldContain "content"
                
                val content = result["content"]!!.jsonArray
                content shouldHaveSize 1
                
                val contentItem = content[0].jsonObject
                contentItem["type"]!!.jsonPrimitive.content shouldBe "text"
                contentItem.keys shouldContain "text"
            }
        }
    }

    "All tool providers should preserve identical error response behavior" {
        runTest {
            val mockIssueService = mockk<IssueApplicationService>(relaxed = true)
            val mockProjectService = mockk<ProjectApplicationService>(relaxed = true)
            val mockSessionService = mockk<SessionApplicationService>(relaxed = true)

            val issueProvider = DefaultIssueToolProvider(mockIssueService)
            val projectProvider = DefaultProjectToolProvider(mockProjectService) 
            val sessionProvider = DefaultSessionToolProvider(mockSessionService)

            // Test providers with missing required parameters
            val issueCreateTool = issueProvider.getAsyncTools().first { it.name == "create_issue" }
            val projectCreateTool = projectProvider.getAsyncTools().first { it.name == "create_project" }
            val sessionCreateTool = sessionProvider.getAsyncTools().first { it.name == "create_session" }

            val emptyParams = buildJsonObject {}

            // All should fail with Result.failure containing IllegalArgumentException
            val issueResult = (issueCreateTool.handler as ToolHandler.Async).handler(emptyParams)
            val projectResult = (projectCreateTool.handler as ToolHandler.Async).handler(emptyParams)
            val sessionResult = (sessionCreateTool.handler as ToolHandler.Async).handler(emptyParams)

            listOf(issueResult, projectResult, sessionResult).forEach { result ->
                result.isFailure shouldBe true
                result.exceptionOrNull().shouldBeInstanceOf<IllegalArgumentException>()
            }
        }
    }
})