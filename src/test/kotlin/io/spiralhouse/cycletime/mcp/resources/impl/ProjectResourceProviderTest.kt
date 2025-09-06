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
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.dto.ProjectDto
import io.spiralhouse.cycletime.application.dto.ProjectListDto
import io.spiralhouse.cycletime.application.exceptions.ProjectNotFoundException
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.mcp.resources.Resource
import io.spiralhouse.cycletime.mcp.resources.ResourceContent
import io.spiralhouse.cycletime.mcp.resources.ResourceFilter
import io.spiralhouse.cycletime.mcp.resources.ResourcePagination
import io.spiralhouse.cycletime.mcp.resources.exceptions.ResourceNotFoundException
import io.spiralhouse.cycletime.mcp.resources.exceptions.InvalidResourceUriException
import java.time.Instant
import java.util.*

/**
 * RED Phase TDD Test Suite for ProjectResourceProvider
 * 
 * These tests define the complete behavior expected from our concrete 
 * ProjectResourceProvider implementation. All tests MUST fail initially
 * to properly guide the GREEN phase implementation.
 * 
 * Test Categories:
 * - Provider Interface Compliance (name, resource type)
 * - URI Schema Validation (cycletime:// protocol validation)
 * - Service Integration (proper mocking and delegation)
 * - Error Handling (exception propagation and wrapping)
 * - Performance Requirements (resource serving <50ms)
 * - Resource Content Validation (JSON format, MIME types)
 * - Resource Metadata (timestamps, permissions, versioning)
 * - Pagination Support (listing with limits and offsets)
 * - Filter Support (by project status, date ranges)
 * - End-to-End Resource Serving (complete retrieval workflows)
 */
class ProjectResourceProviderTest : StringSpec({
    
    lateinit var mockProjectService: ProjectApplicationService
    lateinit var projectResourceProvider: DefaultProjectResourceProvider
    
    beforeEach {
        mockProjectService = mockk<ProjectApplicationService>()
        // This will fail initially - DefaultProjectResourceProvider doesn't have constructor with service
        projectResourceProvider = DefaultProjectResourceProvider(mockProjectService)
    }
    
    afterEach {
        clearAllMocks()
    }

    // ================================================================================
    // Provider Interface Compliance Tests
    // ================================================================================

    "should have correct resource name 'projects'" {
        // This will fail - DefaultProjectResourceProvider is empty implementation
        projectResourceProvider.name shouldBe "projects"
    }
    
    "should have correct resource type 'project'" {
        // This will fail - DefaultProjectResourceProvider is empty implementation
        projectResourceProvider.resourceType shouldBe "project"
    }
    
    "should support project listing resource URI" {
        // This will fail - no implementation exists yet
        val uri = "cycletime://projects"
        val canHandle = projectResourceProvider.canHandle(uri)
        canHandle shouldBe true
    }
    
    "should support individual project resource URI" {
        // This will fail - no implementation exists yet
        val projectId = UUID.randomUUID().toString()
        val uri = "cycletime://project/$projectId"
        val canHandle = projectResourceProvider.canHandle(uri)
        canHandle shouldBe true
    }
    
    "should support project state resource URI" {
        // This will fail - no implementation exists yet
        val projectId = UUID.randomUUID().toString()
        val uri = "cycletime://project/$projectId/state"
        val canHandle = projectResourceProvider.canHandle(uri)
        canHandle shouldBe true
    }
    
    "should reject non-cycletime URIs" {
        // This will fail - no URI validation implemented
        val invalidUri = "file://projects"
        val canHandle = projectResourceProvider.canHandle(invalidUri)
        canHandle shouldBe false
    }

    // ================================================================================
    // URI Schema Validation Tests
    // ================================================================================
    
    "should validate cycletime protocol correctly" {
        // This will fail - no URI validation implemented
        val validUris = listOf(
            "cycletime://projects",
            "cycletime://project/12345678-1234-1234-1234-123456789abc",
            "cycletime://project/12345678-1234-1234-1234-123456789abc/state"
        )
        
        validUris.forEach { uri ->
            projectResourceProvider.canHandle(uri) shouldBe true
        }
    }
    
    "should reject invalid project URIs" {
        // This will fail - no URI validation implemented
        val invalidUris = listOf(
            "cycletime://project", // Missing ID
            "cycletime://project/invalid-uuid", // Invalid UUID format
            "cycletime://project/12345678-1234-1234-1234-123456789abc/invalid", // Invalid path
            "http://cycletime/projects", // Wrong protocol
            "cycletime://issues" // Wrong resource type
        )
        
        invalidUris.forEach { uri ->
            projectResourceProvider.canHandle(uri) shouldBe false
        }
    }
    
    "should throw InvalidResourceUriException for malformed URIs" {
        // This will fail - no exception handling implemented
        val malformedUri = "not-a-uri-at-all"
        
        shouldThrow<InvalidResourceUriException> {
            runBlocking {
                projectResourceProvider.getResource(malformedUri)
            }
        }
    }

    // ================================================================================
    // Service Integration Tests
    // ================================================================================
    
    "projects listing should delegate to ProjectApplicationService" {
        // This will fail - no service integration exists yet
        val uri = "cycletime://projects"
        
        val mockProjects = ProjectListDto(
            projects = listOf(
                ProjectDto(
                    id = ProjectId(UUID.randomUUID().toString()),
                    name = "Integration Test Project",
                    description = "Testing service integration",
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
        runBlocking { projectResourceProvider.getResource(uri) }
        
        coVerify { mockProjectService.listProjects() }
    }
    
    "individual project should delegate to ProjectApplicationService" {
        // This will fail - no service integration exists yet
        val projectId = ProjectId(UUID.randomUUID().toString())
        val uri = "cycletime://project/${projectId.value}"
        
        val mockProject = ProjectDto(
            id = projectId,
            name = "Individual Project",
            description = "Testing individual retrieval",
            status = ProjectStatus.ACTIVE,
            issueIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockProjectService.getProject(projectId) } returns mockProject
        
        // This will fail - no service integration implemented
        runBlocking { projectResourceProvider.getResource(uri) }
        
        coVerify { mockProjectService.getProject(projectId) }
    }
    
    "project state should delegate to ProjectApplicationService" {
        // This will fail - no service integration exists yet
        val projectId = ProjectId(UUID.randomUUID().toString())
        val uri = "cycletime://project/${projectId.value}/state"
        
        val mockProject = ProjectDto(
            id = projectId,
            name = "State Project",
            description = "Testing state retrieval",
            status = ProjectStatus.COMPLETED,
            issueIds = listOf(IssueId(UUID.randomUUID().toString())),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockProjectService.getProject(projectId) } returns mockProject
        
        // This will fail - no service integration implemented
        runBlocking { projectResourceProvider.getResource(uri) }
        
        coVerify { mockProjectService.getProject(projectId) }
    }

    // ================================================================================
    // Error Handling Tests
    // ================================================================================
    
    "should handle ProjectNotFoundException for individual project" {
        // This will fail - no error handling implemented
        val nonExistentId = ProjectId(UUID.randomUUID().toString())
        val uri = "cycletime://project/${nonExistentId.value}"
        
        coEvery { mockProjectService.getProject(nonExistentId) } throws ProjectNotFoundException(nonExistentId)
        
        // Should wrap in ResourceNotFoundException
        shouldThrow<ResourceNotFoundException> {
            runBlocking { projectResourceProvider.getResource(uri) }
        }
    }
    
    "should handle service failures gracefully" {
        // This will fail - no error handling implemented
        val uri = "cycletime://projects"
        
        coEvery { 
            mockProjectService.listProjects() 
        } throws RuntimeException("Database connection failed")
        
        shouldThrow<RuntimeException> {
            runBlocking { projectResourceProvider.getResource(uri) }
        }
    }

    // ================================================================================
    // Resource Content Validation Tests
    // ================================================================================
    
    "projects listing should return properly formatted JSON content" {
        // This will fail - no JSON formatting implemented
        val uri = "cycletime://projects"
        
        val projectId = ProjectId("12345678-1234-1234-1234-123456789abc")
        val mockProjects = ProjectListDto(
            projects = listOf(
                ProjectDto(
                    id = projectId,
                    name = "Content Test Project",
                    description = "Testing JSON content format",
                    status = ProjectStatus.ACTIVE,
                    issueIds = emptyList(),
                    createdAt = Instant.parse("2024-01-01T00:00:00Z"),
                    updatedAt = Instant.parse("2024-01-01T00:00:00Z")
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockProjectService.listProjects() } returns mockProjects
        
        val resource = runBlocking { projectResourceProvider.getResource(uri) }
        
        resource.uri shouldBe uri
        resource.mimeType shouldBe "application/json"
        resource.content shouldNotBe null
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        jsonContent["projects"]?.jsonArray shouldHaveSize 1
        jsonContent["totalCount"]?.jsonPrimitive?.int shouldBe 1
        
        val project = jsonContent["projects"]!!.jsonArray[0].jsonObject
        project["id"]?.jsonPrimitive?.content shouldBe "12345678-1234-1234-1234-123456789abc"
        project["name"]?.jsonPrimitive?.content shouldBe "Content Test Project"
        project["status"]?.jsonPrimitive?.content shouldBe "ACTIVE"
    }
    
    "individual project should return properly formatted JSON content" {
        // This will fail - no JSON formatting implemented
        val projectId = ProjectId("87654321-4321-4321-4321-abcdef987654")
        val uri = "cycletime://project/${projectId.value}"
        
        val mockProject = ProjectDto(
            id = projectId,
            name = "Individual Test Project",
            description = "Testing individual JSON format",
            status = ProjectStatus.COMPLETED,
            issueIds = listOf(IssueId(UUID.randomUUID().toString())),
            createdAt = Instant.parse("2024-01-01T10:00:00Z"),
            updatedAt = Instant.parse("2024-01-01T12:00:00Z")
        )
        
        coEvery { mockProjectService.getProject(projectId) } returns mockProject
        
        val resource = runBlocking { projectResourceProvider.getResource(uri) }
        
        resource.uri shouldBe uri
        resource.mimeType shouldBe "application/json"
        resource.content shouldNotBe null
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        jsonContent["id"]?.jsonPrimitive?.content shouldBe "87654321-4321-4321-4321-abcdef987654"
        jsonContent["name"]?.jsonPrimitive?.content shouldBe "Individual Test Project"
        jsonContent["description"]?.jsonPrimitive?.content shouldBe "Testing individual JSON format"
        jsonContent["status"]?.jsonPrimitive?.content shouldBe "COMPLETED"
        jsonContent["issueIds"]?.jsonArray shouldHaveSize 1
    }
    
    "project state should return state-specific JSON content" {
        // This will fail - no state-specific formatting implemented
        val projectId = ProjectId("11111111-2222-3333-4444-555555555555")
        val uri = "cycletime://project/${projectId.value}/state"
        
        val mockProject = ProjectDto(
            id = projectId,
            name = "State Test Project",
            description = "Testing state format",
            status = ProjectStatus.ARCHIVED,
            issueIds = listOf(
                IssueId(UUID.randomUUID().toString()),
                IssueId(UUID.randomUUID().toString())
            ),
            createdAt = Instant.parse("2024-01-01T08:00:00Z"),
            updatedAt = Instant.parse("2024-01-01T16:00:00Z")
        )
        
        coEvery { mockProjectService.getProject(projectId) } returns mockProject
        
        val resource = runBlocking { projectResourceProvider.getResource(uri) }
        
        resource.uri shouldBe uri
        resource.mimeType shouldBe "application/json"
        resource.content shouldNotBe null
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        // State resource should focus on status-related information
        jsonContent["projectId"]?.jsonPrimitive?.content shouldBe "11111111-2222-3333-4444-555555555555"
        jsonContent["status"]?.jsonPrimitive?.content shouldBe "ARCHIVED"
        jsonContent["issueCount"]?.jsonPrimitive?.int shouldBe 2
        jsonContent["lastUpdated"]?.jsonPrimitive?.content shouldBe "2024-01-01T16:00:00Z"
    }

    // ================================================================================
    // Resource Metadata Tests
    // ================================================================================
    
    "should set proper resource metadata for projects listing" {
        // This will fail - no metadata implementation exists
        val uri = "cycletime://projects"
        
        val mockProjects = ProjectListDto(
            projects = listOf(
                ProjectDto(
                    id = ProjectId(UUID.randomUUID().toString()),
                    name = "Metadata Test",
                    description = "Testing metadata",
                    status = ProjectStatus.ACTIVE,
                    issueIds = emptyList(),
                    createdAt = Instant.now(),
                    updatedAt = Instant.now()
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockProjectService.listProjects() } returns mockProjects
        
        val resource = runBlocking { projectResourceProvider.getResource(uri) }
        
        resource.name shouldBe "Projects List"
        resource.description shouldContain "List of all projects"
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
    
    "should set proper permissions for project resources" {
        // This will fail - no permissions implementation exists
        val projectId = ProjectId(UUID.randomUUID().toString())
        val uri = "cycletime://project/${projectId.value}"
        
        val mockProject = ProjectDto(
            id = projectId,
            name = "Permissions Test",
            description = "Testing permissions",
            status = ProjectStatus.ACTIVE,
            issueIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockProjectService.getProject(projectId) } returns mockProject
        
        val resource = runBlocking { projectResourceProvider.getResource(uri) }
        
        // Project resources should be readable but not writable via MCP
        resource.permissions shouldNotBe null
        resource.permissions!!.readable shouldBe true
        resource.permissions.writable shouldBe false
    }

    // ================================================================================
    // Performance Requirements Tests
    // ================================================================================
    
    "projects listing should complete within 50ms performance requirement" {
        // This will fail - no implementation exists yet
        val uri = "cycletime://projects"
        
        val mockProjects = ProjectListDto(
            projects = listOf(
                ProjectDto(
                    id = ProjectId(UUID.randomUUID().toString()),
                    name = "Performance Test",
                    description = "Testing performance",
                    status = ProjectStatus.ACTIVE,
                    issueIds = emptyList(),
                    createdAt = Instant.now(),
                    updatedAt = Instant.now()
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockProjectService.listProjects() } returns mockProjects
        
        val startTime = System.currentTimeMillis()
        runBlocking { projectResourceProvider.getResource(uri) }
        val executionTime = System.currentTimeMillis() - startTime
        
        // Resource serving should be under 50ms
        executionTime shouldBe lessThan(50)
    }

    // ================================================================================
    // Pagination Support Tests
    // ================================================================================
    
    "should support pagination for projects listing" {
        // This will fail - no pagination implementation exists
        val uri = "cycletime://projects"
        val pagination = ResourcePagination(limit = 10, offset = 0)
        
        val mockProjects = ProjectListDto(
            projects = (1..10).map { index ->
                ProjectDto(
                    id = ProjectId(UUID.randomUUID().toString()),
                    name = "Project $index",
                    description = "Description $index",
                    status = ProjectStatus.ACTIVE,
                    issueIds = emptyList(),
                    createdAt = Instant.now(),
                    updatedAt = Instant.now()
                )
            },
            totalCount = 25 // More projects available
        )
        
        coEvery { mockProjectService.listProjects() } returns mockProjects
        
        // This will fail - no pagination support implemented
        val resource = runBlocking { 
            projectResourceProvider.getResource(uri, pagination = pagination) 
        }
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        jsonContent["projects"]?.jsonArray shouldHaveSize 10
        jsonContent["totalCount"]?.jsonPrimitive?.int shouldBe 25
        jsonContent["offset"]?.jsonPrimitive?.int shouldBe 0
        jsonContent["limit"]?.jsonPrimitive?.int shouldBe 10
        jsonContent["hasMore"]?.jsonPrimitive?.boolean shouldBe true
    }

    // ================================================================================
    // Filter Support Tests
    // ================================================================================
    
    "should support filtering by project status" {
        // This will fail - no filtering implementation exists
        val uri = "cycletime://projects"
        val filter = ResourceFilter(provider = "status:ACTIVE")
        
        val mockProjects = ProjectListDto(
            projects = listOf(
                ProjectDto(
                    id = ProjectId(UUID.randomUUID().toString()),
                    name = "Active Project",
                    description = "Only active project",
                    status = ProjectStatus.ACTIVE,
                    issueIds = emptyList(),
                    createdAt = Instant.now(),
                    updatedAt = Instant.now()
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockProjectService.listProjectsByStatus(ProjectStatus.ACTIVE) } returns mockProjects.projects
        
        // This will fail - no filtering support implemented
        val resource = runBlocking { 
            projectResourceProvider.getResource(uri, filter = filter) 
        }
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        jsonContent["projects"]?.jsonArray shouldHaveSize 1
        jsonContent["projects"]!!.jsonArray[0].jsonObject["status"]?.jsonPrimitive?.content shouldBe "ACTIVE"
        
        coVerify { mockProjectService.listProjectsByStatus(ProjectStatus.ACTIVE) }
    }

    // ================================================================================
    // End-to-End Resource Serving Tests
    // ================================================================================
    
    "complete resource serving workflow should work end-to-end" {
        // This will fail - no complete implementation exists yet
        val listUri = "cycletime://projects"
        val projectId = ProjectId(UUID.randomUUID().toString())
        val projectUri = "cycletime://project/${projectId.value}"
        val stateUri = "cycletime://project/${projectId.value}/state"
        
        // Mock complete project data
        val mockProject = ProjectDto(
            id = projectId,
            name = "Workflow Test Project",
            description = "Testing complete workflow",
            status = ProjectStatus.ACTIVE,
            issueIds = listOf(IssueId(UUID.randomUUID().toString())),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        val mockProjects = ProjectListDto(
            projects = listOf(mockProject),
            totalCount = 1
        )
        
        coEvery { mockProjectService.listProjects() } returns mockProjects
        coEvery { mockProjectService.getProject(projectId) } returns mockProject
        
        // Execute complete workflow
        runBlocking {
            // 1. List all projects
            val listResource = projectResourceProvider.getResource(listUri)
            listResource.uri shouldBe listUri
            listResource.mimeType shouldBe "application/json"
            
            // 2. Get individual project
            val projectResource = projectResourceProvider.getResource(projectUri)
            projectResource.uri shouldBe projectUri
            projectResource.mimeType shouldBe "application/json"
            
            // 3. Get project state
            val stateResource = projectResourceProvider.getResource(stateUri)
            stateResource.uri shouldBe stateUri
            stateResource.mimeType shouldBe "application/json"
        }
        
        // Verify all service calls were made
        coVerify { mockProjectService.listProjects() }
        coVerify(exactly = 2) { mockProjectService.getProject(projectId) } // Called for both project and state
    }
})

// Extension function for performance testing 
private infix fun <T : Comparable<T>> T.lessThan(other: T): Boolean = this < other