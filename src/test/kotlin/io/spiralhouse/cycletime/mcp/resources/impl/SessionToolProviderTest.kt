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
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.application.dto.SessionDto
import io.spiralhouse.cycletime.application.dto.SessionListDto
import io.spiralhouse.cycletime.application.dto.SessionSummaryDto
import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.exceptions.SessionNotFoundException
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.mcp.tools.exceptions.ToolExecutionException
import io.spiralhouse.cycletime.mcp.tools.exceptions.ParameterValidationException
import io.spiralhouse.cycletime.mcp.tools.DefaultSessionToolProvider
import java.time.Instant
import java.time.Duration
import java.util.*

/**
 * RED Phase TDD Test Suite for SessionToolProvider
 * 
 * These tests define the complete behavior expected from our concrete 
 * SessionToolProvider implementation. All tests MUST fail initially
 * to properly guide the GREEN phase implementation.
 * 
 * Test Categories:
 * - Provider Interface Compliance (namespace, tool registration)
 * - JSON Schema Validation (parameter structure validation)
 * - Service Integration (proper mocking and delegation) 
 * - Error Handling (exception propagation and wrapping)
 * - Performance Requirements (tool execution timing <100ms)
 * - Tool Metadata Validation (names, descriptions, schemas)
 * - Session Lifecycle Management (create, update, end workflows)
 * - Time Tracking Validation (duration calculations, overlap detection)
 * - End-to-End Workflows (complete tool execution flows)
 */
class SessionToolProviderTest : StringSpec({
    
    lateinit var mockSessionService: SessionApplicationService
    lateinit var sessionToolProvider: DefaultSessionToolProvider
    
    beforeEach {
        mockSessionService = mockk<SessionApplicationService>()
        // This will fail initially - DefaultSessionToolProvider doesn't have constructor with service
        sessionToolProvider = DefaultSessionToolProvider(mockSessionService)
    }
    
    afterEach {
        clearAllMocks()
    }

    // ================================================================================
    // Provider Interface Compliance Tests
    // ================================================================================

    "should have correct namespace 'session'" {
        // This will fail - DefaultSessionToolProvider is empty implementation
        sessionToolProvider.namespace shouldBe "session"
    }
    
    "should provide exactly 4 synchronous tools" {
        // This will fail - getTools() returns empty list in default implementation
        val tools = sessionToolProvider.getTools()
        tools shouldHaveSize 4
        
        val toolNames = tools.map { it.name }
        toolNames shouldContain "session.create"
        toolNames shouldContain "session.get"
        toolNames shouldContain "session.end"
        toolNames shouldContain "session.list"
    }
    
    "should provide no asynchronous tools" {
        // This will fail - default implementation doesn't override getAsyncTools()
        sessionToolProvider.getAsyncTools() shouldHaveSize 0
    }

    // ================================================================================
    // Tool Metadata Validation Tests
    // ================================================================================
    
    "session.create tool should have valid metadata and schema" {
        // This will fail - no tools are registered yet
        val tools = sessionToolProvider.getTools()
        val createTool = tools.find { it.name == "session.create" }
        
        createTool shouldNotBe null
        createTool!!.description shouldContain "Create a new work session"
        
        // Validate JSON schema structure
        val schema = createTool.parametersSchema
        schema["type"]?.jsonPrimitive?.content shouldBe "object"
        
        val properties = schema["properties"]?.jsonObject
        properties shouldNotBe null
        properties!!["description"] shouldNotBe null
        properties["projectId"] // Optional - can create session without project
        properties["issueId"] // Optional - can create session without specific issue
        
        // No required parameters - sessions can be created minimally
        val required = schema["required"]?.jsonArray
        required?.size ?: 0 shouldBe 0
    }
    
    "session.get tool should have valid metadata and schema" {
        // This will fail - no tools are registered yet
        val tools = sessionToolProvider.getTools()
        val getTool = tools.find { it.name == "session.get" }
        
        getTool shouldNotBe null
        getTool!!.description shouldContain "Retrieve a session"
        
        val schema = getTool.parametersSchema
        val properties = schema["properties"]?.jsonObject
        properties shouldNotBe null
        properties!!["id"] shouldNotBe null
        
        val required = schema["required"]?.jsonArray
        required shouldNotBe null
        required!!.map { it.jsonPrimitive.content } shouldContain "id"
    }
    
    "session.end tool should have valid metadata and schema" {
        // This will fail - no tools are registered yet
        val tools = sessionToolProvider.getTools()
        val endTool = tools.find { it.name == "session.end" }
        
        endTool shouldNotBe null
        endTool!!.description shouldContain "End a work session"
        
        val schema = endTool.parametersSchema
        val properties = schema["properties"]?.jsonObject
        properties shouldNotBe null
        properties!!["id"] shouldNotBe null
        properties["summary"] // Optional session summary
        
        val required = schema["required"]?.jsonArray
        required shouldNotBe null
        required!!.map { it.jsonPrimitive.content } shouldContain "id"
    }
    
    "session.list tool should have valid metadata and schema" {
        // This will fail - no tools are registered yet
        val tools = sessionToolProvider.getTools()
        val listTool = tools.find { it.name == "session.list" }
        
        listTool shouldNotBe null
        listTool!!.description shouldContain "List work sessions"
        
        val schema = listTool.parametersSchema
        val properties = schema["properties"]?.jsonObject
        // List tool should accept optional filters
        properties?.get("active") // Filter for active sessions only
        properties?.get("projectId") // Filter by project
        properties?.get("dateFrom") // Filter by date range
        properties?.get("dateTo") // Filter by date range
    }

    // ================================================================================
    // JSON Schema Validation Tests
    // ================================================================================
    
    "session.create should accept minimal parameters" {
        // This will fail - no implementation exists yet
        val tools = sessionToolProvider.getTools()
        val createTool = tools.find { it.name == "session.create" }!!
        
        val validParams = JsonObject(mapOf(
            "description" to JsonPrimitive("Working on feature implementation")
        ))
        
        val mockSession = SessionDto(
            id = SessionId(UUID.randomUUID().toString()),
            description = "Working on feature implementation",
            startTime = Instant.now(),
            endTime = null,
            duration = null,
            projectId = null,
            issueId = null,
            status = SessionStatus.ACTIVE,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockSessionService.createSession(any()) } returns mockSession
        
        // This will fail - handler not implemented
        val result = runBlocking { createTool.handler(validParams) }
        result.isSuccess shouldBe true
    }
    
    "session.create should accept project and issue context" {
        // This will fail - no implementation exists yet
        val tools = sessionToolProvider.getTools()
        val createTool = tools.find { it.name == "session.create" }!!
        
        val projectId = ProjectId(UUID.randomUUID().toString())
        val issueId = IssueId(UUID.randomUUID().toString())
        val validParams = JsonObject(mapOf(
            "description" to JsonPrimitive("Working on specific issue"),
            "projectId" to JsonPrimitive(projectId.value),
            "issueId" to JsonPrimitive(issueId.value)
        ))
        
        val mockSession = SessionDto(
            id = SessionId(UUID.randomUUID().toString()),
            description = "Working on specific issue",
            startTime = Instant.now(),
            endTime = null,
            duration = null,
            projectId = projectId,
            issueId = issueId,
            status = SessionStatus.ACTIVE,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockSessionService.createSession(any()) } returns mockSession
        
        val result = runBlocking { createTool.handler(validParams) }
        result.isSuccess shouldBe true
    }
    
    "session.get should validate required id parameter" {
        // This will fail - no validation implementation exists yet
        val tools = sessionToolProvider.getTools()
        val getTool = tools.find { it.name == "session.get" }!!
        
        val invalidParams = JsonObject(emptyMap()) // Missing required id
        
        shouldThrow<ParameterValidationException> {
            runBlocking {
                getTool.handler(invalidParams)
            }
        }
    }
    
    "session.end should validate required id parameter" {
        // This will fail - no validation implementation exists yet
        val tools = sessionToolProvider.getTools()
        val endTool = tools.find { it.name == "session.end" }!!
        
        val invalidParams = JsonObject(emptyMap()) // Missing required id
        
        shouldThrow<ParameterValidationException> {
            runBlocking {
                endTool.handler(invalidParams)
            }
        }
    }

    // ================================================================================
    // Service Integration Tests
    // ================================================================================
    
    "session.create should delegate to SessionApplicationService" {
        // This will fail - no service integration exists yet
        val tools = sessionToolProvider.getTools()
        val createTool = tools.find { it.name == "session.create" }!!
        
        val projectId = ProjectId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "description" to JsonPrimitive("Integration Test Session"),
            "projectId" to JsonPrimitive(projectId.value)
        ))
        
        val mockSession = SessionDto(
            id = SessionId(UUID.randomUUID().toString()),
            description = "Integration Test Session",
            startTime = Instant.now(),
            endTime = null,
            duration = null,
            projectId = projectId,
            issueId = null,
            status = SessionStatus.ACTIVE,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockSessionService.createSession(any()) } returns mockSession
        
        // This will fail - no service integration implemented
        runBlocking { createTool.handler(params) }
        
        coVerify { 
            mockSessionService.createSession(
                match<CreateSessionCommand> { 
                    it.description == "Integration Test Session" &&
                    it.projectId == projectId
                }
            )
        }
    }
    
    "session.get should delegate to SessionApplicationService" {
        // This will fail - no service integration exists yet
        val tools = sessionToolProvider.getTools()
        val getTool = tools.find { it.name == "session.get" }!!
        
        val sessionId = SessionId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "id" to JsonPrimitive(sessionId.value)
        ))
        
        val mockSession = SessionDto(
            id = sessionId,
            description = "Retrieved Session",
            startTime = Instant.now().minus(Duration.ofHours(1)),
            endTime = null,
            duration = null,
            projectId = null,
            issueId = null,
            status = SessionStatus.ACTIVE,
            createdAt = Instant.now().minus(Duration.ofHours(1)),
            updatedAt = Instant.now()
        )
        
        coEvery { mockSessionService.getSession(sessionId) } returns mockSession
        
        // This will fail - no service integration implemented
        runBlocking { getTool.handler(params) }
        
        coVerify { mockSessionService.getSession(sessionId) }
    }
    
    "session.end should delegate to SessionApplicationService" {
        // This will fail - no service integration exists yet
        val tools = sessionToolProvider.getTools()
        val endTool = tools.find { it.name == "session.end" }!!
        
        val sessionId = SessionId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "id" to JsonPrimitive(sessionId.value),
            "summary" to JsonPrimitive("Completed feature implementation")
        ))
        
        val mockSession = SessionDto(
            id = sessionId,
            description = "Work Session",
            startTime = Instant.now().minus(Duration.ofHours(2)),
            endTime = Instant.now(),
            duration = Duration.ofHours(2),
            projectId = null,
            issueId = null,
            status = SessionStatus.COMPLETED,
            createdAt = Instant.now().minus(Duration.ofHours(2)),
            updatedAt = Instant.now()
        )
        
        coEvery { mockSessionService.endSession(any()) } returns mockSession
        
        // This will fail - no service integration implemented
        runBlocking { endTool.handler(params) }
        
        coVerify { 
            mockSessionService.endSession(
                match<EndSessionCommand> {
                    it.id == sessionId &&
                    it.summary == "Completed feature implementation"
                }
            )
        }
    }
    
    "session.list should delegate to SessionApplicationService" {
        // This will fail - no service integration exists yet
        val tools = sessionToolProvider.getTools()
        val listTool = tools.find { it.name == "session.list" }!!
        
        val projectId = ProjectId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "active" to JsonPrimitive(true),
            "projectId" to JsonPrimitive(projectId.value)
        ))
        
        val mockSessions = SessionListDto(
            sessions = listOf(
                SessionDto(
                    id = SessionId(UUID.randomUUID().toString()),
                    description = "Active Session",
                    startTime = Instant.now().minus(Duration.ofMinutes(30)),
                    endTime = null,
                    duration = null,
                    projectId = projectId,
                    issueId = null,
                    status = SessionStatus.ACTIVE,
                    createdAt = Instant.now().minus(Duration.ofMinutes(30)),
                    updatedAt = Instant.now()
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockSessionService.listSessions(any()) } returns mockSessions
        
        // This will fail - no service integration implemented
        runBlocking { listTool.handler(params) }
        
        coVerify { 
            mockSessionService.listSessions(
                match<ListSessionsCommand> {
                    it.activeOnly == true &&
                    it.projectId == projectId
                }
            )
        }
    }

    // ================================================================================
    // Error Handling Tests
    // ================================================================================
    
    "session.get should handle SessionNotFoundException" {
        // This will fail - no error handling implemented
        val tools = sessionToolProvider.getTools()
        val getTool = tools.find { it.name == "session.get" }!!
        
        val nonExistentId = SessionId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "id" to JsonPrimitive(nonExistentId.value)
        ))
        
        coEvery { mockSessionService.getSession(nonExistentId) } throws SessionNotFoundException(nonExistentId)
        
        // Should wrap in ToolExecutionException
        shouldThrow<ToolExecutionException> {
            runBlocking { getTool.handler(params) }
        }
    }
    
    "session.end should handle already ended session" {
        // This will fail - no error handling implemented
        val tools = sessionToolProvider.getTools()
        val endTool = tools.find { it.name == "session.end" }!!
        
        val sessionId = SessionId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "id" to JsonPrimitive(sessionId.value)
        ))
        
        coEvery { 
            mockSessionService.endSession(any())
        } throws IllegalStateException("Session already ended")
        
        shouldThrow<ToolExecutionException> {
            runBlocking { endTool.handler(params) }
        }
    }
    
    "session.create should handle invalid project reference" {
        // This will fail - no error handling implemented
        val tools = sessionToolProvider.getTools()
        val createTool = tools.find { it.name == "session.create" }!!
        
        val nonExistentProjectId = ProjectId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "description" to JsonPrimitive("Session with invalid project"),
            "projectId" to JsonPrimitive(nonExistentProjectId.value)
        ))
        
        coEvery { 
            mockSessionService.createSession(any())
        } throws IllegalArgumentException("Project not found: ${nonExistentProjectId.value}")
        
        shouldThrow<ToolExecutionException> {
            runBlocking { createTool.handler(params) }
        }
    }

    // ================================================================================
    // Session Lifecycle Management Tests
    // ================================================================================
    
    "session.create should create active session with start time" {
        // This will fail - no lifecycle management implemented
        val tools = sessionToolProvider.getTools()
        val createTool = tools.find { it.name == "session.create" }!!
        
        val params = JsonObject(mapOf(
            "description" to JsonPrimitive("Lifecycle Test Session")
        ))
        
        val mockSession = SessionDto(
            id = SessionId(UUID.randomUUID().toString()),
            description = "Lifecycle Test Session",
            startTime = Instant.now(),
            endTime = null,
            duration = null,
            projectId = null,
            issueId = null,
            status = SessionStatus.ACTIVE,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockSessionService.createSession(any()) } returns mockSession
        
        val result = runBlocking { createTool.handler(params) }
        result.isSuccess shouldBe true
        
        val responseObj = result.getOrThrow().jsonObject
        responseObj["status"]?.jsonPrimitive?.content shouldBe "ACTIVE"
        responseObj["startTime"] shouldNotBe null
        responseObj["endTime"] shouldBe JsonNull
        responseObj["duration"] shouldBe JsonNull
    }
    
    "session.end should transition to completed with duration calculation" {
        // This will fail - no lifecycle management implemented
        val tools = sessionToolProvider.getTools()
        val endTool = tools.find { it.name == "session.end" }!!
        
        val sessionId = SessionId(UUID.randomUUID().toString())
        val params = JsonObject(mapOf(
            "id" to JsonPrimitive(sessionId.value),
            "summary" to JsonPrimitive("Work completed successfully")
        ))
        
        val startTime = Instant.now().minus(Duration.ofHours(3))
        val endTime = Instant.now()
        val mockSession = SessionDto(
            id = sessionId,
            description = "Completed Session",
            startTime = startTime,
            endTime = endTime,
            duration = Duration.between(startTime, endTime),
            projectId = null,
            issueId = null,
            status = SessionStatus.COMPLETED,
            createdAt = startTime,
            updatedAt = endTime
        )
        
        coEvery { mockSessionService.endSession(any()) } returns mockSession
        
        val result = runBlocking { endTool.handler(params) }
        result.isSuccess shouldBe true
        
        val responseObj = result.getOrThrow().jsonObject
        responseObj["status"]?.jsonPrimitive?.content shouldBe "COMPLETED"
        responseObj["endTime"] shouldNotBe null
        responseObj["duration"] shouldNotBe null
    }

    // ================================================================================
    // Time Tracking Validation Tests
    // ================================================================================
    
    "session.list should filter by date range correctly" {
        // This will fail - no time filtering implemented
        val tools = sessionToolProvider.getTools()
        val listTool = tools.find { it.name == "session.list" }!!
        
        val dateFrom = Instant.now().minus(Duration.ofDays(7))
        val dateTo = Instant.now()
        val params = JsonObject(mapOf(
            "dateFrom" to JsonPrimitive(dateFrom.toString()),
            "dateTo" to JsonPrimitive(dateTo.toString())
        ))
        
        val mockSessions = SessionListDto(
            sessions = listOf(
                SessionDto(
                    id = SessionId(UUID.randomUUID().toString()),
                    description = "Recent Session",
                    startTime = Instant.now().minus(Duration.ofDays(3)),
                    endTime = Instant.now().minus(Duration.ofDays(3)).plus(Duration.ofHours(2)),
                    duration = Duration.ofHours(2),
                    projectId = null,
                    issueId = null,
                    status = SessionStatus.COMPLETED,
                    createdAt = Instant.now().minus(Duration.ofDays(3)),
                    updatedAt = Instant.now().minus(Duration.ofDays(3)).plus(Duration.ofHours(2))
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockSessionService.listSessions(any()) } returns mockSessions
        
        runBlocking { listTool.handler(params) }
        
        coVerify { 
            mockSessionService.listSessions(
                match<ListSessionsCommand> {
                    it.dateFrom == dateFrom &&
                    it.dateTo == dateTo
                }
            )
        }
    }
    
    "session.list should filter active sessions only" {
        // This will fail - no status filtering implemented
        val tools = sessionToolProvider.getTools()
        val listTool = tools.find { it.name == "session.list" }!!
        
        val params = JsonObject(mapOf(
            "active" to JsonPrimitive(true)
        ))
        
        val mockSessions = SessionListDto(
            sessions = listOf(
                SessionDto(
                    id = SessionId(UUID.randomUUID().toString()),
                    description = "Currently Active Session",
                    startTime = Instant.now().minus(Duration.ofMinutes(45)),
                    endTime = null,
                    duration = null,
                    projectId = null,
                    issueId = null,
                    status = SessionStatus.ACTIVE,
                    createdAt = Instant.now().minus(Duration.ofMinutes(45)),
                    updatedAt = Instant.now()
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockSessionService.listSessions(any()) } returns mockSessions
        
        val result = runBlocking { listTool.handler(params) }
        result.isSuccess shouldBe true
        
        val responseObj = result.getOrThrow().jsonObject
        val sessions = responseObj["sessions"]?.jsonArray
        sessions shouldHaveSize 1
        sessions!![0].jsonObject["status"]?.jsonPrimitive?.content shouldBe "ACTIVE"
    }

    // ================================================================================
    // Performance Requirements Tests
    // ================================================================================
    
    "session.create should complete within 100ms performance requirement" {
        // This will fail - no implementation exists yet
        val tools = sessionToolProvider.getTools()
        val createTool = tools.find { it.name == "session.create" }!!
        
        val params = JsonObject(mapOf(
            "description" to JsonPrimitive("Performance Test Session")
        ))
        
        val mockSession = SessionDto(
            id = SessionId(UUID.randomUUID().toString()),
            description = "Performance Test Session",
            startTime = Instant.now(),
            endTime = null,
            duration = null,
            projectId = null,
            issueId = null,
            status = SessionStatus.ACTIVE,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockSessionService.createSession(any()) } returns mockSession
        
        val startTime = System.currentTimeMillis()
        runBlocking { createTool.handler(params) }
        val executionTime = System.currentTimeMillis() - startTime
        
        // Tool execution should be under 100ms
        executionTime shouldBe lessThan(100)
    }

    // ================================================================================
    // End-to-End Workflow Tests
    // ================================================================================
    
    "complete session lifecycle workflow should work end-to-end" {
        // This will fail - no complete implementation exists yet
        val tools = sessionToolProvider.getTools()
        val createTool = tools.find { it.name == "session.create" }!!
        val getTool = tools.find { it.name == "session.get" }!!
        val endTool = tools.find { it.name == "session.end" }!!
        val listTool = tools.find { it.name == "session.list" }!!
        
        val sessionId = SessionId(UUID.randomUUID().toString())
        val projectId = ProjectId(UUID.randomUUID().toString())
        
        // Mock session lifecycle
        val startTime = Instant.now().minus(Duration.ofHours(1))
        val endTime = Instant.now()
        
        val activeSession = SessionDto(
            id = sessionId,
            description = "Workflow Test Session",
            startTime = startTime,
            endTime = null,
            duration = null,
            projectId = projectId,
            issueId = null,
            status = SessionStatus.ACTIVE,
            createdAt = startTime,
            updatedAt = startTime
        )
        
        val completedSession = activeSession.copy(
            endTime = endTime,
            duration = Duration.between(startTime, endTime),
            status = SessionStatus.COMPLETED,
            updatedAt = endTime
        )
        
        coEvery { mockSessionService.createSession(any()) } returns activeSession
        coEvery { mockSessionService.getSession(sessionId) } returns activeSession
        coEvery { mockSessionService.endSession(any()) } returns completedSession
        coEvery { mockSessionService.listSessions(any()) } returns SessionListDto(listOf(activeSession), 1)
        
        // Execute complete workflow
        runBlocking {
            // 1. Create session
            val createResult = createTool.handler(JsonObject(mapOf(
                "description" to JsonPrimitive("Workflow Test Session"),
                "projectId" to JsonPrimitive(projectId.value)
            )))
            createResult.isSuccess shouldBe true
            
            // 2. Get session
            val getResult = getTool.handler(JsonObject(mapOf(
                "id" to JsonPrimitive(sessionId.value)
            )))
            getResult.isSuccess shouldBe true
            
            // 3. List sessions
            val listResult = listTool.handler(JsonObject(mapOf(
                "projectId" to JsonPrimitive(projectId.value)
            )))
            listResult.isSuccess shouldBe true
            
            // 4. End session
            val endResult = endTool.handler(JsonObject(mapOf(
                "id" to JsonPrimitive(sessionId.value),
                "summary" to JsonPrimitive("Workflow test completed")
            )))
            endResult.isSuccess shouldBe true
        }
        
        // Verify all service calls were made
        coVerify { mockSessionService.createSession(any()) }
        coVerify { mockSessionService.getSession(sessionId) }
        coVerify { mockSessionService.listSessions(any()) }
        coVerify { mockSessionService.endSession(any()) }
    }

    // ================================================================================
    // JSON Response Format Tests
    // ================================================================================
    
    "session.create should return properly formatted JSON response" {
        // This will fail - no JSON formatting implemented
        val tools = sessionToolProvider.getTools()
        val createTool = tools.find { it.name == "session.create" }!!
        
        val projectId = ProjectId("12345678-1234-1234-1234-123456789abc")
        val params = JsonObject(mapOf(
            "description" to JsonPrimitive("Format Test Session"),
            "projectId" to JsonPrimitive(projectId.value)
        ))
        
        val mockSession = SessionDto(
            id = SessionId("87654321-4321-4321-4321-abcdef987654"),
            description = "Format Test Session",
            startTime = Instant.parse("2024-01-01T10:00:00Z"),
            endTime = null,
            duration = null,
            projectId = projectId,
            issueId = null,
            status = SessionStatus.ACTIVE,
            createdAt = Instant.parse("2024-01-01T10:00:00Z"),
            updatedAt = Instant.parse("2024-01-01T10:00:00Z")
        )
        
        coEvery { mockSessionService.createSession(any()) } returns mockSession
        
        val result = runBlocking { createTool.handler(params) }
        result.isSuccess shouldBe true
        
        val jsonResponse = result.getOrThrow()
        val responseObj = jsonResponse.jsonObject
        
        responseObj["id"]?.jsonPrimitive?.content shouldBe "87654321-4321-4321-4321-abcdef987654"
        responseObj["description"]?.jsonPrimitive?.content shouldBe "Format Test Session"
        responseObj["startTime"]?.jsonPrimitive?.content shouldBe "2024-01-01T10:00:00Z"
        responseObj["endTime"] shouldBe JsonNull
        responseObj["duration"] shouldBe JsonNull
        responseObj["projectId"]?.jsonPrimitive?.content shouldBe "12345678-1234-1234-1234-123456789abc"
        responseObj["issueId"] shouldBe JsonNull
        responseObj["status"]?.jsonPrimitive?.content shouldBe "ACTIVE"
    }
})

// Extension function for performance testing 
private infix fun <T : Comparable<T>> T.lessThan(other: T): Boolean = this < other