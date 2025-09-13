package io.spiralhouse.cycletime.unit

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain as shouldContainString
import io.kotest.assertions.throwables.shouldThrow
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.application.dto.ProjectDto
import io.spiralhouse.cycletime.application.dto.ProjectListDto
import io.spiralhouse.cycletime.application.dto.IssueDto
import io.spiralhouse.cycletime.application.dto.IssueListDto
import io.spiralhouse.cycletime.application.dto.SessionDto
import io.spiralhouse.cycletime.application.dto.SessionListDto
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.domain.entities.SessionContext
import io.spiralhouse.cycletime.mcp.resources.Resource
import io.spiralhouse.cycletime.mcp.resources.ResourceContent
import kotlinx.serialization.json.Json
import kotlinx.datetime.Instant
import io.mockk.mockk
import io.mockk.coEvery
import io.mockk.coVerify
import io.spiralhouse.cycletime.mcp.providers.DefaultProjectResourceProvider
import io.spiralhouse.cycletime.mcp.providers.DefaultIssueResourceProvider
import io.spiralhouse.cycletime.mcp.providers.DefaultSessionResourceProvider
import io.spiralhouse.cycletime.mcp.providers.DefaultWorkflowResourceProvider

/**
 * Comprehensive unit tests for DefaultResourceProviders (TDD RED Phase).
 * 
 * This test suite specifies the expected behavior for all 4 resource provider classes:
 * - DefaultProjectResourceProvider
 * - DefaultIssueResourceProvider  
 * - DefaultSessionResourceProvider
 * - DefaultWorkflowResourceProvider
 *
 * ## TDD RED Phase Goals:
 * 1. All tests should FAIL initially - this defines what the code should do
 * 2. Specify behavior through test names and assertions
 * 3. Cover 85%+ of the 233 lines of new logic
 * 4. Test all critical paths: resource listing, URI matching, content reading, error handling
 * 
 * ## Test Coverage Areas:
 * - Resource Discovery (listResources)
 * - URI Pattern Matching (getResource)  
 * - Resource Content Reading (readResource)
 * - Service Dependencies & Integration
 * - Error Handling & Edge Cases
 * - JSON Content Generation
 *
 * ## Mock Strategy:
 * - Use MockK for mocking ApplicationService dependencies
 * - Use real value objects (ProjectId, IssueId, SessionKey)
 * - Test JSON serialization with real kotlinx.serialization
 * - Simulate service failures for error path testing
 */
class DefaultResourceProvidersUnitTest : StringSpec({

    // ================================================================================
    // Test Infrastructure & Mock Services
    // ================================================================================

    lateinit var mockProjectService: ProjectApplicationService
    lateinit var mockIssueService: IssueApplicationService
    lateinit var mockSessionService: SessionApplicationService
    
    lateinit var projectProvider: DefaultProjectResourceProvider
    lateinit var issueProvider: DefaultIssueResourceProvider
    lateinit var sessionProvider: DefaultSessionResourceProvider
    lateinit var workflowProvider: DefaultWorkflowResourceProvider

    // Test data constants
    val testProjectId = ProjectId.generate()
    val testIssueId = IssueId.generate()
    val testSessionKey = SessionKey.generate()
    val baseTime = Instant.parse("2024-01-01T00:00:00Z")

    beforeEach {
        // Create mocks using MockK
        mockProjectService = mockk<ProjectApplicationService>()
        mockIssueService = mockk<IssueApplicationService>()
        mockSessionService = mockk<SessionApplicationService>()
        
        // Create resource providers with mocked dependencies
        projectProvider = DefaultProjectResourceProvider(mockProjectService)
        issueProvider = DefaultIssueResourceProvider(mockIssueService)
        sessionProvider = DefaultSessionResourceProvider(mockSessionService)
        workflowProvider = DefaultWorkflowResourceProvider()
    }

    // ================================================================================
    // DefaultProjectResourceProvider Tests - Resource Discovery
    // ================================================================================

    "DefaultProjectResourceProvider should list all available project resource descriptors" {
        // When
        val resources = projectProvider.listResources()

        // Then - should return exactly 2 project resource descriptors
        resources shouldHaveSize 2
        
        // Verify projects collection resource
        val projectsResource = resources.find { it.uri == "cycletime://projects" }
        projectsResource.shouldNotBeNull()
        projectsResource.name shouldBe "CycleTime Projects"
        projectsResource.description shouldBe "List of all projects in the CycleTime system"
        projectsResource.mimeType shouldBe "application/json"
        
        // Verify individual project template resource
        val projectTemplateResource = resources.find { it.uri == "cycletime://projects/{id}" }
        projectTemplateResource.shouldNotBeNull()
        projectTemplateResource.name shouldBe "CycleTime Project"
        projectTemplateResource.description shouldBe "Individual project resource by ID"
        projectTemplateResource.mimeType shouldBe "application/json"
        
        // Should not call any services during resource listing
        coVerify(exactly = 0) { mockProjectService.listProjects() }
        coVerify(exactly = 0) { mockProjectService.getProject(any()) }
    }

    "DefaultProjectResourceProvider should handle resource discovery with null filter and pagination" {
        // When
        val resources = projectProvider.listResources(filter = null, pagination = null)

        // Then - should work the same as without parameters
        resources shouldHaveSize 2
        resources.map { it.uri } shouldContain "cycletime://projects"
        resources.map { it.uri } shouldContain "cycletime://projects/{id}"
    }

    // ================================================================================
    // DefaultProjectResourceProvider Tests - URI Pattern Matching
    // ================================================================================

    "DefaultProjectResourceProvider should find projects collection resource by exact URI" {
        // When
        val resource = projectProvider.getResource("cycletime://projects")

        // Then
        resource.shouldNotBeNull()
        resource.uri shouldBe "cycletime://projects"
        resource.name shouldBe "CycleTime Projects"
        resource.mimeType shouldBe "application/json"
        
        // Should not call services for resource metadata lookup
        coVerify(exactly = 0) { mockProjectService.getProject(any()) }
    }

    "DefaultProjectResourceProvider should find individual project resource by ID pattern" {
        // When
        val resource = projectProvider.getResource("cycletime://projects/${testProjectId.value}")

        // Then
        resource.shouldNotBeNull()
        resource.uri shouldBe "cycletime://projects/${testProjectId.value}"
        resource.name shouldBe "CycleTime Project"
        resource.description shouldBe "Individual project resource by ID"
        resource.mimeType shouldBe "application/json"
        
        // Should not call services for metadata lookup
        coVerify(exactly = 0) { mockProjectService.getProject(any()) }
    }

    "DefaultProjectResourceProvider should return null for unknown URI patterns" {
        // When & Then
        projectProvider.getResource("cycletime://unknown").shouldBeNull()
        projectProvider.getResource("cycletime://projects/").shouldBeNull() // Empty ID
        projectProvider.getResource("invalid://projects").shouldBeNull()
        projectProvider.getResource("cycletime://projects/123/extra").shouldBeNull()
    }

    "DefaultProjectResourceProvider should handle URI pattern edge cases" {
        // When & Then - various malformed URIs should return null
        projectProvider.getResource("").shouldBeNull()
        projectProvider.getResource("cycletime://").shouldBeNull()
        projectProvider.getResource("cycletime://projects/").shouldBeNull()
        projectProvider.getResource("cycletime://project").shouldBeNull() // Missing 's'
    }

    // ================================================================================
    // DefaultProjectResourceProvider Tests - Resource Content Reading
    // ================================================================================

    "DefaultProjectResourceProvider should read projects collection resource content" {
        // Given - mock service returns project list
        val expectedProjects = ProjectListDto(
            projects = listOf(
                ProjectDto(
                    id = testProjectId,
                    name = "Test Project 1", 
                    description = "Description 1",
                    status = ProjectStatus.ACTIVE,
                    issues = emptyList(),
                    issueCount = 0,
                    createdAt = baseTime,
                    updatedAt = baseTime
                )
            ),
            totalCount = 1
        )
        coEvery { mockProjectService.listProjects() } returns expectedProjects

        // When
        val content = projectProvider.readResource("cycletime://projects")

        // Then
        coVerify(exactly = 1) { mockProjectService.listProjects() }
        
        // Verify JSON content structure
        val json = Json.parseToJsonElement(content)
        json.toString() shouldContainString "Test Project 1"
        json.toString() shouldContainString testProjectId.value
        json.toString() shouldContainString "ACTIVE"
    }

    "DefaultProjectResourceProvider should read individual project resource content" {
        // Given - mock service returns specific project
        val expectedProject = ProjectDto(
            id = testProjectId,
            name = "Individual Test Project",
            description = "Individual Description", 
            status = ProjectStatus.COMPLETED,
            issues = listOf(testIssueId),
            issueCount = 1,
            createdAt = baseTime,
            updatedAt = baseTime
        )
        coEvery { mockProjectService.getProject(testProjectId) } returns expectedProject

        // When
        val content = projectProvider.readResource("cycletime://projects/${testProjectId.value}")

        // Then
        coVerify(exactly = 1) { mockProjectService.getProject(testProjectId) }
        
        // Verify JSON content
        val json = Json.parseToJsonElement(content)
        json.toString() shouldContainString "Individual Test Project"
        json.toString() shouldContainString "COMPLETED"
        json.toString() shouldContainString testIssueId.value
    }

    "DefaultProjectResourceProvider should handle project not found during content reading" {
        // Given - mock service returns null for non-existent project
        coEvery { mockProjectService.getProject(testProjectId) } returns null

        // When & Then
        shouldThrow<IllegalArgumentException> {
            projectProvider.readResource("cycletime://projects/${testProjectId.value}")
        }.message shouldContainString "Project not found: ${testProjectId.value}"
        
        coVerify(exactly = 1) { mockProjectService.getProject(testProjectId) }
    }

    "DefaultProjectResourceProvider should handle invalid project ID format during content reading" {
        // Given - service will throw when creating ProjectId
        val invalidId = "invalid-project-id-format"

        // When & Then
        shouldThrow<IllegalArgumentException> {
            projectProvider.readResource("cycletime://projects/$invalidId")
        }.message shouldContainString "Project not found: $invalidId"
    }

    "DefaultProjectResourceProvider should handle service exceptions during content reading" {
        // Given - mock service throws exception
        val serviceException = RuntimeException("Database connection failed")
        coEvery { mockProjectService.getProject(testProjectId) } throws serviceException

        // When & Then
        shouldThrow<IllegalArgumentException> {
            projectProvider.readResource("cycletime://projects/${testProjectId.value}")
        }.cause shouldBe serviceException
    }

    "DefaultProjectResourceProvider should reject reading unknown resource URIs" {
        // When & Then
        shouldThrow<IllegalArgumentException> {
            projectProvider.readResource("cycletime://unknown")
        }.message shouldContainString "Resource not found: cycletime://unknown"
        
        shouldThrow<IllegalArgumentException> {
            projectProvider.readResource("invalid://projects")
        }.message shouldContainString "Resource not found: invalid://projects"
    }

    // ================================================================================
    // DefaultIssueResourceProvider Tests - Resource Discovery
    // ================================================================================

    "DefaultIssueResourceProvider should list all available issue resource descriptors" {
        // When
        val resources = issueProvider.listResources()

        // Then - should return exactly 2 issue resource descriptors
        resources shouldHaveSize 2
        
        // Verify issues collection resource
        val issuesResource = resources.find { it.uri == "cycletime://issues" }
        issuesResource.shouldNotBeNull()
        issuesResource.name shouldBe "CycleTime Issues"
        issuesResource.description shouldBe "List of all issues in the CycleTime system"
        issuesResource.mimeType shouldBe "application/json"
        
        // Verify individual issue template resource
        val issueTemplateResource = resources.find { it.uri == "cycletime://issues/{id}" }
        issueTemplateResource.shouldNotBeNull()
        issueTemplateResource.name shouldBe "CycleTime Issue"
        issueTemplateResource.description shouldBe "Individual issue resource by ID"
        issueTemplateResource.mimeType shouldBe "application/json"
        
        // Should not call services during resource listing
        coVerify(exactly = 0) { mockIssueService.listIssues() }
        coVerify(exactly = 0) { mockIssueService.getIssue(any()) }
    }

    "DefaultIssueResourceProvider should find issues collection resource by exact URI" {
        // When
        val resource = issueProvider.getResource("cycletime://issues")

        // Then
        resource.shouldNotBeNull()
        resource.uri shouldBe "cycletime://issues"
        resource.name shouldBe "CycleTime Issues"
        resource.mimeType shouldBe "application/json"
    }

    "DefaultIssueResourceProvider should find individual issue resource by ID pattern" {
        // When
        val resource = issueProvider.getResource("cycletime://issues/${testIssueId.value}")

        // Then
        resource.shouldNotBeNull()
        resource.uri shouldBe "cycletime://issues/${testIssueId.value}"
        resource.name shouldBe "CycleTime Issue"
        resource.description shouldBe "Individual issue resource by ID"
        resource.mimeType shouldBe "application/json"
    }

    "DefaultIssueResourceProvider should return null for unknown issue URI patterns" {
        // When & Then
        issueProvider.getResource("cycletime://issue").shouldBeNull() // Missing 's'
        issueProvider.getResource("cycletime://issues/").shouldBeNull() // Empty ID
        issueProvider.getResource("cycletime://issues/123/comments").shouldBeNull() // Extra path
    }

    // ================================================================================
    // DefaultSessionResourceProvider Tests - Resource Discovery
    // ================================================================================

    "DefaultSessionResourceProvider should list all available session resource descriptors" {
        // When
        val resources = sessionProvider.listResources()

        // Then - should return exactly 3 session resource descriptors
        resources shouldHaveSize 3
        
        // Verify sessions collection resource
        val sessionsResource = resources.find { it.uri == "cycletime://sessions" }
        sessionsResource.shouldNotBeNull()
        sessionsResource.name shouldBe "CycleTime Sessions"
        
        // Verify individual session template resource
        val sessionTemplateResource = resources.find { it.uri == "cycletime://sessions/{id}" }
        sessionTemplateResource.shouldNotBeNull()
        sessionTemplateResource.name shouldBe "CycleTime Session"
        
        // Verify active sessions resource
        val activeSessionsResource = resources.find { it.uri == "cycletime://sessions/active" }
        activeSessionsResource.shouldNotBeNull()
        activeSessionsResource.name shouldBe "Active Sessions"
        activeSessionsResource.description shouldBe "List of currently active sessions"
    }

    "DefaultSessionResourceProvider should find sessions collection resource by exact URI" {
        // When
        val resource = sessionProvider.getResource("cycletime://sessions")

        // Then
        resource.shouldNotBeNull()
        resource.uri shouldBe "cycletime://sessions"
        resource.name shouldBe "CycleTime Sessions"
    }

    "DefaultSessionResourceProvider should find active sessions resource by exact URI" {
        // When
        val resource = sessionProvider.getResource("cycletime://sessions/active")

        // Then
        resource.shouldNotBeNull()
        resource.uri shouldBe "cycletime://sessions/active"
        resource.name shouldBe "Active Sessions"
        resource.description shouldBe "List of currently active sessions"
    }

    "DefaultSessionResourceProvider should find individual session resource by ID pattern" {
        // When
        val resource = sessionProvider.getResource("cycletime://sessions/${testSessionKey.value}")

        // Then
        resource.shouldNotBeNull()
        resource.uri shouldBe "cycletime://sessions/${testSessionKey.value}"
        resource.name shouldBe "CycleTime Session"
        resource.description shouldBe "Individual session resource by ID"
    }

    "DefaultSessionResourceProvider should properly distinguish between active and ID patterns" {
        // The 'active' keyword should NOT match the ID pattern
        
        // When
        val activeResource = sessionProvider.getResource("cycletime://sessions/active")
        val idResource = sessionProvider.getResource("cycletime://sessions/some-session-id")

        // Then
        activeResource.shouldNotBeNull()
        activeResource.name shouldBe "Active Sessions"
        
        idResource.shouldNotBeNull()
        idResource.name shouldBe "CycleTime Session"
    }

    // ================================================================================
    // DefaultWorkflowResourceProvider Tests - Resource Discovery
    // ================================================================================

    "DefaultWorkflowResourceProvider should list all available workflow resource descriptors" {
        // When
        val resources = workflowProvider.listResources()

        // Then - should return exactly 3 workflow resource descriptors
        resources shouldHaveSize 3
        
        // Verify workflows collection resource
        val workflowsResource = resources.find { it.uri == "cycletime://workflows" }
        workflowsResource.shouldNotBeNull()
        workflowsResource.name shouldBe "CycleTime Workflows"
        
        // Verify workflow template resource
        val workflowTemplateResource = resources.find { it.uri == "cycletime://workflows/{id}" }
        workflowTemplateResource.shouldNotBeNull()
        workflowTemplateResource.name shouldBe "CycleTime Workflow"
        
        // Verify next task resource
        val nextTaskResource = resources.find { it.uri == "cycletime://tasks/next" }
        nextTaskResource.shouldNotBeNull()
        nextTaskResource.name shouldBe "Next Task"
        nextTaskResource.description shouldBe "Next available task from workflow queue"
    }

    "DefaultWorkflowResourceProvider should read workflows collection resource content" {
        // When
        val content = workflowProvider.readResource("cycletime://workflows")

        // Then - should return empty workflow list
        val json = Json.parseToJsonElement(content)
        json.toString() shouldBe "[]" // Empty array
    }

    "DefaultWorkflowResourceProvider should read next task resource content" {
        // When
        val content = workflowProvider.readResource("cycletime://tasks/next")

        // Then - should return no tasks available message
        val json = Json.parseToJsonElement(content)
        json.toString() shouldContainString "No tasks available"
    }

    "DefaultWorkflowResourceProvider should read individual workflow resource content" {
        // Given
        val workflowId = "test-workflow-123"

        // When
        val content = workflowProvider.readResource("cycletime://workflows/$workflowId")

        // Then - should return workflow placeholder data
        val json = Json.parseToJsonElement(content)
        json.toString() shouldContainString workflowId
        json.toString() shouldContainString "Workflow $workflowId"
        json.toString() shouldContainString "active"
    }

    // ================================================================================
    // Cross-Provider Tests - Common Interface Behavior
    // ================================================================================

    "all resource providers should have correct name properties" {
        projectProvider.name shouldBe "projects"
        issueProvider.name shouldBe "issues"
        sessionProvider.name shouldBe "sessions"
        workflowProvider.name shouldBe "workflows"
    }

    "all resource providers should report as running" {
        projectProvider.isRunning shouldBe true
        issueProvider.isRunning shouldBe true
        sessionProvider.isRunning shouldBe true
        workflowProvider.isRunning shouldBe true
    }

    "all resource providers should support search operations" {
        // When
        val projectSearchResults = projectProvider.searchResources("test query")
        val issueSearchResults = issueProvider.searchResources("test query")
        val sessionSearchResults = sessionProvider.searchResources("test query")
        val workflowSearchResults = workflowProvider.searchResources("test query")

        // Then - search should delegate to listResources for all providers
        projectSearchResults shouldBe projectProvider.listResources()
        issueSearchResults shouldBe issueProvider.listResources()
        sessionSearchResults shouldBe sessionProvider.listResources()
        workflowSearchResults shouldBe workflowProvider.listResources()
    }

    "all resource providers should reject update operations as read-only" {
        val testContent = ResourceContent.Text("test content")

        shouldThrow<UnsupportedOperationException> {
            projectProvider.updateResource("cycletime://projects", testContent)
        }.message shouldContainString "read-only"

        shouldThrow<UnsupportedOperationException> {
            issueProvider.updateResource("cycletime://issues", testContent)
        }.message shouldContainString "read-only"

        shouldThrow<UnsupportedOperationException> {
            sessionProvider.updateResource("cycletime://sessions", testContent)
        }.message shouldContainString "read-only"

        shouldThrow<UnsupportedOperationException> {
            workflowProvider.updateResource("cycletime://workflows", testContent)
        }.message shouldContainString "read-only"
    }

    "all resource providers should support start and stop lifecycle operations" {
        // All providers should support start/stop without errors
        // When & Then - no exceptions should be thrown
        projectProvider.start()
        projectProvider.stop()
        
        issueProvider.start()
        issueProvider.stop()
        
        sessionProvider.start()
        sessionProvider.stop()
        
        workflowProvider.start()
        workflowProvider.stop()
    }

    // ================================================================================
    // Error Handling & Edge Cases Tests
    // ================================================================================

    "providers should handle JSON serialization errors gracefully" {
        // Given - mock service will return data that causes JSON serialization issues
        val serviceException = RuntimeException("Serialization error")
        coEvery { mockProjectService.listProjects() } throws serviceException

        // When & Then
        shouldThrow<RuntimeException> {
            projectProvider.readResource("cycletime://projects")
        }
    }

    "providers should handle null service responses appropriately" {
        // Given - services return null for valid queries
        coEvery { mockProjectService.getProject(testProjectId) } returns null
        coEvery { mockIssueService.getIssue(testIssueId) } returns null
        coEvery { mockSessionService.getSession(testSessionKey) } returns null

        // When & Then - should throw IllegalArgumentException with appropriate messages
        shouldThrow<IllegalArgumentException> {
            projectProvider.readResource("cycletime://projects/${testProjectId.value}")
        }

        shouldThrow<IllegalArgumentException> {
            issueProvider.readResource("cycletime://issues/${testIssueId.value}")
        }

        shouldThrow<IllegalArgumentException> {
            sessionProvider.readResource("cycletime://sessions/${testSessionKey.value}")
        }
    }
})