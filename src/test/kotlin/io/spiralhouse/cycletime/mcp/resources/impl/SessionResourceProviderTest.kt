package io.spiralhouse.cycletime.mcp.resources.impl

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
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
import io.spiralhouse.cycletime.application.exceptions.SessionNotFoundException
import io.spiralhouse.cycletime.application.commands.ListSessionsCommand
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.mcp.resources.Resource
import io.spiralhouse.cycletime.mcp.resources.ResourceContent
import io.spiralhouse.cycletime.mcp.resources.ResourceFilter
import io.spiralhouse.cycletime.mcp.resources.ResourcePagination
import io.spiralhouse.cycletime.mcp.resources.exceptions.ResourceNotFoundException
import io.spiralhouse.cycletime.mcp.resources.exceptions.InvalidResourceUriException
import io.spiralhouse.cycletime.mcp.providers.DefaultSessionResourceProvider
import java.time.Duration
import java.time.Instant
import java.util.*

/**
 * RED Phase TDD Test Suite for SessionResourceProvider
 * 
 * These tests define the complete behavior expected from our concrete 
 * SessionResourceProvider implementation. All tests MUST fail initially
 * to properly guide the GREEN phase implementation.
 * 
 * Test Categories:
 * - Provider Interface Compliance (name, resource type)
 * - URI Schema Validation (cycletime:// protocol validation)
 * - Service Integration (proper mocking and delegation)
 * - Error Handling (exception propagation and wrapping)
 * - Performance Requirements (resource serving <50ms)
 * - Resource Content Validation (JSON format, MIME types)
 * - Session Time Tracking (duration calculations, time range filters)
 * - Resource Metadata (timestamps, permissions, versioning)
 * - Pagination Support (listing with limits and offsets)
 * - Filter Support (by active status, project, date ranges)
 * - End-to-End Resource Serving (complete retrieval workflows)
 */
class SessionResourceProviderTest : StringSpec({
    
    lateinit var mockSessionService: SessionApplicationService
    lateinit var sessionResourceProvider: DefaultSessionResourceProvider
    
    beforeEach {
        mockSessionService = mockk<SessionApplicationService>()
        // This will fail initially - DefaultSessionResourceProvider doesn't have constructor with service
        sessionResourceProvider = DefaultSessionResourceProvider(mockSessionService)
    }
    
    afterEach {
        clearAllMocks()
    }

    // ================================================================================
    // Provider Interface Compliance Tests
    // ================================================================================

    "should have correct resource name 'sessions'" {
        // This will fail - DefaultSessionResourceProvider is empty implementation
        sessionResourceProvider.name shouldBe "sessions"
    }
    
    "should have correct resource type 'session'" {
        // This will fail - DefaultSessionResourceProvider is empty implementation
        sessionResourceProvider.resourceType shouldBe "session"
    }
    
    "should support session listing resource URI" {
        // This will fail - no implementation exists yet
        val uri = "cycletime://sessions"
        val canHandle = sessionResourceProvider.canHandle(uri)
        canHandle shouldBe true
    }
    
    "should support individual session resource URI" {
        // This will fail - no implementation exists yet
        val sessionId = UUID.randomUUID().toString()
        val uri = "cycletime://session/$sessionId"
        val canHandle = sessionResourceProvider.canHandle(uri)
        canHandle shouldBe true
    }
    
    "should reject non-cycletime URIs" {
        // This will fail - no URI validation implemented
        val invalidUri = "http://sessions"
        val canHandle = sessionResourceProvider.canHandle(invalidUri)
        canHandle shouldBe false
    }

    // ================================================================================
    // URI Schema Validation Tests
    // ================================================================================
    
    "should validate cycletime protocol correctly" {
        // This will fail - no URI validation implemented
        val validUris = listOf(
            "cycletime://sessions",
            "cycletime://session/12345678-1234-1234-1234-123456789abc"
        )
        
        validUris.forEach { uri ->
            sessionResourceProvider.canHandle(uri) shouldBe true
        }
    }
    
    "should reject invalid session URIs" {
        // This will fail - no URI validation implemented
        val invalidUris = listOf(
            "cycletime://session", // Missing ID
            "cycletime://session/invalid-uuid", // Invalid UUID format
            "cycletime://session/12345678-1234-1234-1234-123456789abc/invalid", // Invalid path
            "file://cycletime/sessions", // Wrong protocol
            "cycletime://projects" // Wrong resource type
        )
        
        invalidUris.forEach { uri ->
            sessionResourceProvider.canHandle(uri) shouldBe false
        }
    }
    
    "should throw InvalidResourceUriException for malformed URIs" {
        // This will fail - no exception handling implemented
        val malformedUri = "invalid-uri-format"
        
        shouldThrow<InvalidResourceUriException> {
            runBlocking {
                sessionResourceProvider.getResource(malformedUri)
            }
        }
    }

    // ================================================================================
    // Service Integration Tests
    // ================================================================================
    
    "sessions listing should delegate to SessionApplicationService" {
        // This will fail - no service integration exists yet
        val uri = "cycletime://sessions"
        
        val mockSessions = SessionListDto(
            sessions = listOf(
                SessionDto(
                    id = SessionId(UUID.randomUUID().toString()),
                    description = "Integration Test Session",
                    startTime = Instant.now().minus(Duration.ofHours(2)),
                    endTime = null,
                    duration = null,
                    projectId = ProjectId(UUID.randomUUID().toString()),
                    issueId = null,
                    status = SessionStatus.ACTIVE,
                    createdAt = Instant.now().minus(Duration.ofHours(2)),
                    updatedAt = Instant.now()
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockSessionService.listSessions(any()) } returns mockSessions
        
        // This will fail - no service integration implemented
        runBlocking { sessionResourceProvider.getResource(uri) }
        
        coVerify { mockSessionService.listSessions(any<ListSessionsCommand>()) }
    }
    
    "individual session should delegate to SessionApplicationService" {
        // This will fail - no service integration exists yet
        val sessionId = SessionId(UUID.randomUUID().toString())
        val uri = "cycletime://session/${sessionId.value}"
        
        val mockSession = SessionDto(
            id = sessionId,
            description = "Individual Session",
            startTime = Instant.now().minus(Duration.ofHours(3)),
            endTime = Instant.now().minus(Duration.ofHours(1)),
            duration = Duration.ofHours(2),
            projectId = ProjectId(UUID.randomUUID().toString()),
            issueId = IssueId(UUID.randomUUID().toString()),
            status = SessionStatus.COMPLETED,
            createdAt = Instant.now().minus(Duration.ofHours(3)),
            updatedAt = Instant.now().minus(Duration.ofHours(1))
        )
        
        coEvery { mockSessionService.getSession(sessionId) } returns mockSession
        
        // This will fail - no service integration implemented
        runBlocking { sessionResourceProvider.getResource(uri) }
        
        coVerify { mockSessionService.getSession(sessionId) }
    }

    // ================================================================================
    // Error Handling Tests
    // ================================================================================
    
    "should handle SessionNotFoundException for individual session" {
        // This will fail - no error handling implemented
        val nonExistentId = SessionId(UUID.randomUUID().toString())
        val uri = "cycletime://session/${nonExistentId.value}"
        
        coEvery { mockSessionService.getSession(nonExistentId) } throws SessionNotFoundException(nonExistentId)
        
        // Should wrap in ResourceNotFoundException
        shouldThrow<ResourceNotFoundException> {
            runBlocking { sessionResourceProvider.getResource(uri) }
        }
    }
    
    "should handle service failures gracefully" {
        // This will fail - no error handling implemented
        val uri = "cycletime://sessions"
        
        coEvery { 
            mockSessionService.listSessions(any<ListSessionsCommand>())
        } throws RuntimeException("Database connection failed")
        
        shouldThrow<RuntimeException> {
            runBlocking { sessionResourceProvider.getResource(uri) }
        }
    }

    // ================================================================================
    // Resource Content Validation Tests
    // ================================================================================
    
    "sessions listing should return properly formatted JSON content" {
        // This will fail - no JSON formatting implemented
        val uri = "cycletime://sessions"
        
        val sessionId = SessionId("12345678-1234-1234-1234-123456789abc")
        val projectId = ProjectId("87654321-4321-4321-4321-abcdef987654")
        val issueId = IssueId("11111111-2222-3333-4444-555555555555")
        
        val mockSessions = SessionListDto(
            sessions = listOf(
                SessionDto(
                    id = sessionId,
                    description = "Content Test Session",
                    startTime = Instant.parse("2024-01-01T10:00:00Z"),
                    endTime = Instant.parse("2024-01-01T12:00:00Z"),
                    duration = Duration.ofHours(2),
                    projectId = projectId,
                    issueId = issueId,
                    status = SessionStatus.COMPLETED,
                    createdAt = Instant.parse("2024-01-01T10:00:00Z"),
                    updatedAt = Instant.parse("2024-01-01T12:00:00Z")
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockSessionService.listSessions(any()) } returns mockSessions
        
        val resource = runBlocking { sessionResourceProvider.getResource(uri) }
        
        resource.uri shouldBe uri
        resource.mimeType shouldBe "application/json"
        resource.content shouldNotBe null
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        jsonContent["sessions"]?.jsonArray shouldHaveSize 1
        jsonContent["totalCount"]?.jsonPrimitive?.int shouldBe 1
        
        val session = jsonContent["sessions"]!!.jsonArray[0].jsonObject
        session["id"]?.jsonPrimitive?.content shouldBe "12345678-1234-1234-1234-123456789abc"
        session["description"]?.jsonPrimitive?.content shouldBe "Content Test Session"
        session["startTime"]?.jsonPrimitive?.content shouldBe "2024-01-01T10:00:00Z"
        session["endTime"]?.jsonPrimitive?.content shouldBe "2024-01-01T12:00:00Z"
        session["duration"]?.jsonPrimitive?.content shouldBe "PT2H"
        session["projectId"]?.jsonPrimitive?.content shouldBe "87654321-4321-4321-4321-abcdef987654"
        session["issueId"]?.jsonPrimitive?.content shouldBe "11111111-2222-3333-4444-555555555555"
        session["status"]?.jsonPrimitive?.content shouldBe "COMPLETED"
    }
    
    "individual session should return properly formatted JSON content" {
        // This will fail - no JSON formatting implemented
        val sessionId = SessionId("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
        val projectId = ProjectId("ffffffff-1111-2222-3333-444444444444")
        val uri = "cycletime://session/${sessionId.value}"
        
        val mockSession = SessionDto(
            id = sessionId,
            description = "Individual Test Session",
            startTime = Instant.parse("2024-01-01T14:00:00Z"),
            endTime = null, // Active session
            duration = null,
            projectId = projectId,
            issueId = null,
            status = SessionStatus.ACTIVE,
            createdAt = Instant.parse("2024-01-01T14:00:00Z"),
            updatedAt = Instant.parse("2024-01-01T14:30:00Z")
        )
        
        coEvery { mockSessionService.getSession(sessionId) } returns mockSession
        
        val resource = runBlocking { sessionResourceProvider.getResource(uri) }
        
        resource.uri shouldBe uri
        resource.mimeType shouldBe "application/json"
        resource.content shouldNotBe null
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        jsonContent["id"]?.jsonPrimitive?.content shouldBe "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        jsonContent["description"]?.jsonPrimitive?.content shouldBe "Individual Test Session"
        jsonContent["startTime"]?.jsonPrimitive?.content shouldBe "2024-01-01T14:00:00Z"
        jsonContent["endTime"] shouldBe JsonNull
        jsonContent["duration"] shouldBe JsonNull
        jsonContent["projectId"]?.jsonPrimitive?.content shouldBe "ffffffff-1111-2222-3333-444444444444"
        jsonContent["issueId"] shouldBe JsonNull
        jsonContent["status"]?.jsonPrimitive?.content shouldBe "ACTIVE"
    }

    // ================================================================================
    // Session Time Tracking Tests
    // ================================================================================
    
    "should include computed session metrics in resource content" {
        // This will fail - no metrics computation implemented
        val sessionId = SessionId(UUID.randomUUID().toString())
        val uri = "cycletime://session/${sessionId.value}"
        
        val startTime = Instant.parse("2024-01-01T09:00:00Z")
        val endTime = Instant.parse("2024-01-01T17:00:00Z")
        val mockSession = SessionDto(
            id = sessionId,
            description = "Metrics Test Session",
            startTime = startTime,
            endTime = endTime,
            duration = Duration.between(startTime, endTime),
            projectId = ProjectId(UUID.randomUUID().toString()),
            issueId = null,
            status = SessionStatus.COMPLETED,
            createdAt = startTime,
            updatedAt = endTime
        )
        
        coEvery { mockSessionService.getSession(sessionId) } returns mockSession
        
        val resource = runBlocking { sessionResourceProvider.getResource(uri) }
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        // Should include computed metrics
        jsonContent["metrics"] shouldNotBe null
        val metrics = jsonContent["metrics"]!!.jsonObject
        
        metrics["durationHours"]?.jsonPrimitive?.double shouldBe 8.0
        metrics["durationMinutes"]?.jsonPrimitive?.int shouldBe 480
        metrics["isActive"]?.jsonPrimitive?.boolean shouldBe false
        metrics["elapsedTime"] shouldNotBe null // Current elapsed time for active sessions
    }

    // ================================================================================
    // Resource Metadata Tests
    // ================================================================================
    
    "should set proper resource metadata for sessions listing" {
        // This will fail - no metadata implementation exists
        val uri = "cycletime://sessions"
        
        val mockSessions = SessionListDto(
            sessions = listOf(
                SessionDto(
                    id = SessionId(UUID.randomUUID().toString()),
                    description = "Metadata Test",
                    startTime = Instant.now(),
                    endTime = null,
                    duration = null,
                    projectId = null,
                    issueId = null,
                    status = SessionStatus.ACTIVE,
                    createdAt = Instant.now(),
                    updatedAt = Instant.now()
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockSessionService.listSessions(any()) } returns mockSessions
        
        val resource = runBlocking { sessionResourceProvider.getResource(uri) }
        
        resource.name shouldBe "Sessions List"
        resource.description shouldContain "List of all work sessions"
        resource.metadata shouldNotBe null
        resource.metadata!!.created shouldNotBe null
        resource.metadata.modified shouldNotBe null
        resource.metadata.size shouldBe resource.content!!.let {
            when (it) {
                is ResourceContent.Text -> it.data.length.toLong()
                is ResourceContent.Binary -> it.data.length.toLong()
            }
        }
    }
    
    "should set proper permissions for session resources" {
        // This will fail - no permissions implementation exists
        val sessionId = SessionId(UUID.randomUUID().toString())
        val uri = "cycletime://session/${sessionId.value}"
        
        val mockSession = SessionDto(
            id = sessionId,
            description = "Permissions Test",
            startTime = Instant.now(),
            endTime = null,
            duration = null,
            projectId = null,
            issueId = null,
            status = SessionStatus.ACTIVE,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockSessionService.getSession(sessionId) } returns mockSession
        
        val resource = runBlocking { sessionResourceProvider.getResource(uri) }
        
        // Session resources should be readable but not writable via MCP
        resource.permissions shouldNotBe null
        resource.permissions!!.readable shouldBe true
        resource.permissions.writable shouldBe false
    }

    // ================================================================================
    // Performance Requirements Tests
    // ================================================================================
    
    "sessions listing should complete within 50ms performance requirement" {
        // This will fail - no implementation exists yet
        val uri = "cycletime://sessions"
        
        val mockSessions = SessionListDto(
            sessions = listOf(
                SessionDto(
                    id = SessionId(UUID.randomUUID().toString()),
                    description = "Performance Test",
                    startTime = Instant.now(),
                    endTime = null,
                    duration = null,
                    projectId = null,
                    issueId = null,
                    status = SessionStatus.ACTIVE,
                    createdAt = Instant.now(),
                    updatedAt = Instant.now()
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockSessionService.listSessions(any()) } returns mockSessions
        
        val startTime = System.currentTimeMillis()
        runBlocking { sessionResourceProvider.getResource(uri) }
        val executionTime = System.currentTimeMillis() - startTime
        
        // Resource serving should be under 50ms
        executionTime shouldBe lessThan(50)
    }

    // ================================================================================
    // Pagination Support Tests
    // ================================================================================
    
    "should support pagination for sessions listing" {
        // This will fail - no pagination implementation exists
        val uri = "cycletime://sessions"
        val pagination = ResourcePagination(limit = 3, offset = 0)
        
        val mockSessions = SessionListDto(
            sessions = (1..3).map { index ->
                SessionDto(
                    id = SessionId(UUID.randomUUID().toString()),
                    description = "Session $index",
                    startTime = Instant.now().minus(Duration.ofHours(index.toLong())),
                    endTime = null,
                    duration = null,
                    projectId = null,
                    issueId = null,
                    status = SessionStatus.ACTIVE,
                    createdAt = Instant.now().minus(Duration.ofHours(index.toLong())),
                    updatedAt = Instant.now()
                )
            },
            totalCount = 8 // More sessions available
        )
        
        coEvery { mockSessionService.listSessions(any()) } returns mockSessions
        
        // This will fail - no pagination support implemented
        val resource = runBlocking { 
            sessionResourceProvider.getResource(uri, pagination = pagination) 
        }
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        jsonContent["sessions"]?.jsonArray shouldHaveSize 3
        jsonContent["totalCount"]?.jsonPrimitive?.int shouldBe 8
        jsonContent["offset"]?.jsonPrimitive?.int shouldBe 0
        jsonContent["limit"]?.jsonPrimitive?.int shouldBe 3
        jsonContent["hasMore"]?.jsonPrimitive?.boolean shouldBe true
    }

    // ================================================================================
    // Filter Support Tests
    // ================================================================================
    
    "should support filtering by active status" {
        // This will fail - no filtering implementation exists
        val uri = "cycletime://sessions"
        val filter = ResourceFilter(provider = "active:true")
        
        val mockSessions = SessionListDto(
            sessions = listOf(
                SessionDto(
                    id = SessionId(UUID.randomUUID().toString()),
                    description = "Active Session",
                    startTime = Instant.now().minus(Duration.ofMinutes(30)),
                    endTime = null,
                    duration = null,
                    projectId = null,
                    issueId = null,
                    status = SessionStatus.ACTIVE,
                    createdAt = Instant.now().minus(Duration.ofMinutes(30)),
                    updatedAt = Instant.now()
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockSessionService.listSessions(any()) } returns mockSessions
        
        // This will fail - no filtering support implemented
        val resource = runBlocking { 
            sessionResourceProvider.getResource(uri, filter = filter) 
        }
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        jsonContent["sessions"]?.jsonArray shouldHaveSize 1
        jsonContent["sessions"]!!.jsonArray[0].jsonObject["status"]?.jsonPrimitive?.content shouldBe "ACTIVE"
        
        coVerify { 
            mockSessionService.listSessions(
                match<ListSessionsCommand> { it.activeOnly == true }
            ) 
        }
    }
    
    "should support filtering by project" {
        // This will fail - no filtering implementation exists
        val uri = "cycletime://sessions"
        val projectId = ProjectId(UUID.randomUUID().toString())
        val filter = ResourceFilter(provider = "project:${projectId.value}")
        
        val mockSessions = SessionListDto(
            sessions = listOf(
                SessionDto(
                    id = SessionId(UUID.randomUUID().toString()),
                    description = "Project Session",
                    startTime = Instant.now().minus(Duration.ofHours(1)),
                    endTime = null,
                    duration = null,
                    projectId = projectId,
                    issueId = null,
                    status = SessionStatus.ACTIVE,
                    createdAt = Instant.now().minus(Duration.ofHours(1)),
                    updatedAt = Instant.now()
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockSessionService.listSessions(any()) } returns mockSessions
        
        val resource = runBlocking { 
            sessionResourceProvider.getResource(uri, filter = filter) 
        }
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        jsonContent["sessions"]?.jsonArray shouldHaveSize 1
        jsonContent["sessions"]!!.jsonArray[0].jsonObject["projectId"]?.jsonPrimitive?.content shouldBe projectId.value
        
        coVerify { 
            mockSessionService.listSessions(
                match<ListSessionsCommand> { it.projectId == projectId }
            ) 
        }
    }
    
    "should support filtering by date range" {
        // This will fail - no filtering implementation exists
        val uri = "cycletime://sessions"
        val dateFrom = Instant.now().minus(Duration.ofDays(7))
        val dateTo = Instant.now()
        val filter = ResourceFilter(provider = "dateRange:${dateFrom}to${dateTo}")
        
        val mockSessions = SessionListDto(
            sessions = listOf(
                SessionDto(
                    id = SessionId(UUID.randomUUID().toString()),
                    description = "Recent Session",
                    startTime = Instant.now().minus(Duration.ofDays(3)),
                    endTime = Instant.now().minus(Duration.ofDays(3)).plus(Duration.ofHours(4)),
                    duration = Duration.ofHours(4),
                    projectId = null,
                    issueId = null,
                    status = SessionStatus.COMPLETED,
                    createdAt = Instant.now().minus(Duration.ofDays(3)),
                    updatedAt = Instant.now().minus(Duration.ofDays(3)).plus(Duration.ofHours(4))
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockSessionService.listSessions(any()) } returns mockSessions
        
        val resource = runBlocking { 
            sessionResourceProvider.getResource(uri, filter = filter) 
        }
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        jsonContent["sessions"]?.jsonArray shouldHaveSize 1
        
        coVerify { 
            mockSessionService.listSessions(
                match<ListSessionsCommand> { 
                    it.dateFrom == dateFrom && it.dateTo == dateTo 
                }
            ) 
        }
    }

    // ================================================================================
    // End-to-End Resource Serving Tests
    // ================================================================================
    
    "complete resource serving workflow should work end-to-end" {
        // This will fail - no complete implementation exists yet
        val listUri = "cycletime://sessions"
        val sessionId = SessionId(UUID.randomUUID().toString())
        val sessionUri = "cycletime://session/${sessionId.value}"
        
        // Mock complete session data
        val mockSession = SessionDto(
            id = sessionId,
            description = "Workflow Test Session",
            startTime = Instant.now().minus(Duration.ofHours(2)),
            endTime = Instant.now(),
            duration = Duration.ofHours(2),
            projectId = ProjectId(UUID.randomUUID().toString()),
            issueId = IssueId(UUID.randomUUID().toString()),
            status = SessionStatus.COMPLETED,
            createdAt = Instant.now().minus(Duration.ofHours(2)),
            updatedAt = Instant.now()
        )
        
        val mockSessions = SessionListDto(
            sessions = listOf(mockSession),
            totalCount = 1
        )
        
        coEvery { mockSessionService.listSessions(any()) } returns mockSessions
        coEvery { mockSessionService.getSession(sessionId) } returns mockSession
        
        // Execute complete workflow
        runBlocking {
            // 1. List all sessions
            val listResource = sessionResourceProvider.getResource(listUri)
            listResource.uri shouldBe listUri
            listResource.mimeType shouldBe "application/json"
            
            // 2. Get individual session
            val sessionResource = sessionResourceProvider.getResource(sessionUri)
            sessionResource.uri shouldBe sessionUri
            sessionResource.mimeType shouldBe "application/json"
        }
        
        // Verify all service calls were made
        coVerify { mockSessionService.listSessions(any()) }
        coVerify { mockSessionService.getSession(sessionId) }
    }
})

// Extension function for performance testing 
private infix fun <T : Comparable<T>> T.lessThan(other: T): Boolean = this < other