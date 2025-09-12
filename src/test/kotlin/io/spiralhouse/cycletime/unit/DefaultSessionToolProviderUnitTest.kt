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
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.application.commands.CreateSessionCommand
import io.spiralhouse.cycletime.application.dto.*
import io.spiralhouse.cycletime.mcp.tools.DefaultSessionToolProvider
import io.spiralhouse.cycletime.mcp.tools.ToolHandler
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.domain.entities.SessionContext
import kotlinx.datetime.Clock
import java.util.UUID

/**
 * Unit tests for DefaultSessionToolProvider following TDD principles.
 * 
 * Tests verify:
 * - Tool registration and discovery (6 expected tools)
 * - MCP response formatting with content array structure
 * - Session handling functionality
 * - Service integration with proper error handling
 * - Parameter validation and error cases
 * - Task retrieval features
 */
class DefaultSessionToolProviderUnitTest : StringSpec({

    lateinit var mockSessionService: SessionApplicationService
    lateinit var toolProvider: DefaultSessionToolProvider

    beforeEach {
        mockSessionService = mockk(relaxed = true)
        toolProvider = DefaultSessionToolProvider(mockSessionService)
    }

    // TDD Cycle 1: Tool Registration Tests
    "should provide correct namespace" {
        toolProvider.namespace shouldBe "session"
    }

    "should register 6 async tools correctly" {
        val asyncTools = toolProvider.getAsyncTools()
        asyncTools shouldHaveSize 6
        
        val toolNames = asyncTools.map { it.name }
        toolNames shouldContain "create_session"
        toolNames shouldContain "list_active_sessions"  
        toolNames shouldContain "get_session"
        toolNames shouldContain "get_next_task"
        toolNames shouldContain "get_active_session"
        toolNames shouldContain "list_sessions"
    }

    "should provide empty synchronous tools" {
        val syncTools = toolProvider.getTools()
        syncTools shouldHaveSize 0
    }

    // TDD Cycle 2: MCP Response Format Tests
    "create_session should return MCP content array format" {
        runTest {
            val mockSessionDto = SessionDto(
                sessionKey = SessionKey("12345678-1234-1234-1234-123456789abc"),
                projectId = ProjectId("87654321-4321-4321-4321-210987654321"),
                currentContext = SessionContext(),
                lastActivity = Clock.System.now(),
                createdAt = Clock.System.now(),
                updatedAt = Clock.System.now()
            )
            coEvery { mockSessionService.createSession(any()) } returns mockSessionDto

            val createTool = toolProvider.getAsyncTools().first { it.name == "create_session" }
            val params = buildJsonObject {
                put("projectId", "87654321-4321-4321-4321-210987654321")
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

    "list_active_sessions should return MCP content array format" {
        runTest {
            val mockSessionsList = SessionListDto(
                sessions = listOf(
                    SessionDto(
                        sessionKey = SessionKey("12345678-1234-1234-1234-123456789abc"),
                        projectId = ProjectId("87654321-4321-4321-4321-210987654321"),
                        currentContext = SessionContext(),
                        lastActivity = Clock.System.now(),
                        createdAt = Clock.System.now(),
                        updatedAt = Clock.System.now()
                    )
                ),
                totalCount = 1
            )
            coEvery { mockSessionService.listActiveSessions() } returns mockSessionsList

            val listTool = toolProvider.getAsyncTools().first { it.name == "list_active_sessions" }
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

    "get_session should return MCP content array format" {
        runTest {
            val mockSessionDto = SessionDto(
                sessionKey = SessionKey("12345678-1234-1234-1234-123456789abc"),
                projectId = ProjectId("87654321-4321-4321-4321-210987654321"),
                currentContext = SessionContext(),
                lastActivity = Clock.System.now(),
                createdAt = Clock.System.now(),
                updatedAt = Clock.System.now()
            )
            val validSessionKey = SessionKey("12345678-1234-1234-1234-123456789abc")
            coEvery { mockSessionService.getSession(validSessionKey) } returns mockSessionDto

            val getTool = toolProvider.getAsyncTools().first { it.name == "get_session" }
            val params = buildJsonObject {
                put("sessionKey", "12345678-1234-1234-1234-123456789abc")
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

    "get_next_task should return MCP content array format" {
        runTest {
            val getNextTaskTool = toolProvider.getAsyncTools().first { it.name == "get_next_task" }
            val params = buildJsonObject {
                put("sessionKey", "12345678-1234-1234-1234-123456789abc")
            }

            val result = getNextTaskTool.handler.let { handler ->
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

    "get_active_session should return MCP content array format" {
        runTest {
            val mockSessionsList = SessionListDto(
                sessions = listOf(
                    SessionDto(
                        sessionKey = SessionKey("12345678-1234-1234-1234-123456789abc"),
                        projectId = ProjectId("87654321-4321-4321-4321-210987654321"),
                        currentContext = SessionContext(),
                        lastActivity = Clock.System.now(),
                        createdAt = Clock.System.now(),
                        updatedAt = Clock.System.now()
                    )
                ),
                totalCount = 1
            )
            coEvery { mockSessionService.listActiveSessions() } returns mockSessionsList

            val getActiveTool = toolProvider.getAsyncTools().first { it.name == "get_active_session" }
            val params = buildJsonObject {}

            val result = getActiveTool.handler.let { handler ->
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

    "list_sessions should return MCP content array format" {
        runTest {
            val mockSessionsList = SessionListDto(
                sessions = listOf(
                    SessionDto(
                        sessionKey = SessionKey("12345678-1234-1234-1234-123456789abc"),
                        projectId = ProjectId("87654321-4321-4321-4321-210987654321"),
                        currentContext = SessionContext(),
                        lastActivity = Clock.System.now(),
                        createdAt = Clock.System.now(),
                        updatedAt = Clock.System.now()
                    )
                ),
                totalCount = 1
            )
            coEvery { mockSessionService.listActiveSessions() } returns mockSessionsList

            val listAllTool = toolProvider.getAsyncTools().first { it.name == "list_sessions" }
            val params = buildJsonObject {}

            val result = listAllTool.handler.let { handler ->
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

    // TDD Cycle 3: Service Integration Tests
    "should call SessionApplicationService.createSession with correct parameters" {
        runTest {
            val mockSessionDto = SessionDto(
                sessionKey = SessionKey("12345678-1234-1234-1234-123456789abc"),
                projectId = ProjectId("87654321-4321-4321-4321-210987654321"),
                currentContext = SessionContext(),
                lastActivity = Clock.System.now(),
                createdAt = Clock.System.now(),
                updatedAt = Clock.System.now()
            )
            coEvery { mockSessionService.createSession(any()) } returns mockSessionDto

            val createTool = toolProvider.getAsyncTools().first { it.name == "create_session" }
            val projectId = UUID.randomUUID().toString()
            val params = buildJsonObject {
                put("projectId", projectId)
            }

            createTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            coVerify(exactly = 1) { 
                mockSessionService.createSession(match<CreateSessionCommand> { command ->
                    command.projectId?.value == projectId
                })
            }
        }
    }

    "should call SessionApplicationService.getSession with correct SessionKey" {
        runTest {
            val mockSessionDto = SessionDto(
                sessionKey = SessionKey("12345678-1234-1234-1234-123456789abc"),
                projectId = ProjectId("87654321-4321-4321-4321-210987654321"),
                currentContext = SessionContext(),
                lastActivity = Clock.System.now(),
                createdAt = Clock.System.now(),
                updatedAt = Clock.System.now()
            )
            val validSessionKey = SessionKey("12345678-1234-1234-1234-123456789abc")
            coEvery { mockSessionService.getSession(validSessionKey) } returns mockSessionDto

            val getTool = toolProvider.getAsyncTools().first { it.name == "get_session" }
            val params = buildJsonObject {
                put("sessionKey", "12345678-1234-1234-1234-123456789abc")
            }

            getTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            coVerify(exactly = 1) { 
                mockSessionService.getSession(validSessionKey)
            }
        }
    }

    "should call SessionApplicationService.listActiveSessions" {
        runTest {
            val mockSessionsList = SessionListDto(sessions = emptyList(), totalCount = 0)
            coEvery { mockSessionService.listActiveSessions() } returns mockSessionsList

            val listTool = toolProvider.getAsyncTools().first { it.name == "list_active_sessions" }
            val params = buildJsonObject {}

            listTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            coVerify(exactly = 1) { mockSessionService.listActiveSessions() }
        }
    }

    // TDD Cycle 4: Parameter Validation Tests
    "should throw IllegalArgumentException when projectId is missing for create_session" {
        runTest {
            val createTool = toolProvider.getAsyncTools().first { it.name == "create_session" }
            val params = buildJsonObject {
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

    "should throw IllegalArgumentException when sessionKey is missing for get_session" {
        runTest {
            val getTool = toolProvider.getAsyncTools().first { it.name == "get_session" }
            val params = buildJsonObject {
                // Missing sessionKey
            }

            val result = getTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params)
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.isFailure shouldBe true
            result.exceptionOrNull()?.message shouldContain "sessionKey is required"
        }
    }

    "should throw IllegalArgumentException when session not found" {
        runTest {
            val validSessionKey = SessionKey("ffffffff-ffff-ffff-ffff-ffffffffffff")
            coEvery { mockSessionService.getSession(validSessionKey) } returns null

            val getTool = toolProvider.getAsyncTools().first { it.name == "get_session" }
            val params = buildJsonObject {
                put("sessionKey", "ffffffff-ffff-ffff-ffff-ffffffffffff")
            }

            val result = getTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params)
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            result.isFailure shouldBe true
            result.exceptionOrNull()?.message shouldContain "Session not found"
        }
    }

    // TDD Cycle 5: Enhanced Features Tests
    "get_next_task should handle optional sessionKey parameter" {
        runTest {
            val getNextTaskTool = toolProvider.getAsyncTools().first { it.name == "get_next_task" }
            val params = buildJsonObject {
                // No sessionKey parameter (should be optional)
            }

            val result = getNextTaskTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            // Should not throw an exception and return proper format
            result.shouldBeInstanceOf<JsonObject>()
            result["content"].shouldNotBe(null)
        }
    }

    "get_active_session should handle empty session list" {
        runTest {
            val mockSessionsList = SessionListDto(sessions = emptyList(), totalCount = 0)
            coEvery { mockSessionService.listActiveSessions() } returns mockSessionsList

            val getActiveTool = toolProvider.getAsyncTools().first { it.name == "get_active_session" }
            val params = buildJsonObject {}

            val result = getActiveTool.handler.let { handler ->
                when (handler) {
                    is ToolHandler.Async -> handler.handler(params).getOrThrow()
                    else -> throw IllegalStateException("Expected async handler")
                }
            }

            // Should return MCP content array structure with no-active-session message
            result.shouldBeInstanceOf<JsonObject>()
            result["content"].shouldNotBe(null)
            val content = result["content"]!!.jsonArray
            content shouldHaveSize 1
            content[0].jsonObject["type"]!!.jsonPrimitive.content shouldBe "text"
            val textContent = content[0].jsonObject["text"]!!.jsonPrimitive.content
            textContent shouldContain "no-active-session"
        }
    }
})