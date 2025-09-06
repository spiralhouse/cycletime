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
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.dto.IssueDto
import io.spiralhouse.cycletime.application.dto.IssueListDto
import io.spiralhouse.cycletime.application.dto.IssueTreeDto
import io.spiralhouse.cycletime.application.exceptions.IssueNotFoundException
import io.spiralhouse.cycletime.application.commands.ListIssuesCommand
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.mcp.resources.Resource
import io.spiralhouse.cycletime.mcp.resources.ResourceContent
import io.spiralhouse.cycletime.mcp.resources.ResourceFilter
import io.spiralhouse.cycletime.mcp.resources.ResourcePagination
import io.spiralhouse.cycletime.mcp.resources.exceptions.ResourceNotFoundException
import io.spiralhouse.cycletime.mcp.resources.exceptions.InvalidResourceUriException
import io.spiralhouse.cycletime.mcp.providers.DefaultIssueResourceProvider
import java.time.Instant
import java.util.*

/**
 * RED Phase TDD Test Suite for IssueResourceProvider
 * 
 * These tests define the complete behavior expected from our concrete 
 * IssueResourceProvider implementation. All tests MUST fail initially
 * to properly guide the GREEN phase implementation.
 * 
 * Test Categories:
 * - Provider Interface Compliance (name, resource type)
 * - URI Schema Validation (cycletime:// protocol validation)
 * - Service Integration (proper mocking and delegation)
 * - Error Handling (exception propagation and wrapping)
 * - Performance Requirements (resource serving <50ms)
 * - Resource Content Validation (JSON format, MIME types)
 * - Issue Hierarchy Support (tree resources, parent-child relationships)
 * - Resource Metadata (timestamps, permissions, versioning)
 * - Pagination Support (listing with limits and offsets)
 * - Filter Support (by status, priority, project, date ranges)
 * - End-to-End Resource Serving (complete retrieval workflows)
 */
class IssueResourceProviderTest : StringSpec({
    
    lateinit var mockIssueService: IssueApplicationService
    lateinit var issueResourceProvider: DefaultIssueResourceProvider
    
    beforeEach {
        mockIssueService = mockk<IssueApplicationService>()
        // This will fail initially - DefaultIssueResourceProvider doesn't have constructor with service
        issueResourceProvider = DefaultIssueResourceProvider(mockIssueService)
    }
    
    afterEach {
        clearAllMocks()
    }

    // ================================================================================
    // Provider Interface Compliance Tests
    // ================================================================================

    "should have correct resource name 'issues'" {
        // This will fail - DefaultIssueResourceProvider is empty implementation
        issueResourceProvider.name shouldBe "issues"
    }
    
    "should have correct resource type 'issue'" {
        // This will fail - DefaultIssueResourceProvider is empty implementation
        issueResourceProvider.resourceType shouldBe "issue"
    }
    
    "should support issue listing resource URI" {
        // This will fail - no implementation exists yet
        val uri = "cycletime://issues"
        val canHandle = issueResourceProvider.canHandle(uri)
        canHandle shouldBe true
    }
    
    "should support individual issue resource URI" {
        // This will fail - no implementation exists yet
        val issueId = UUID.randomUUID().toString()
        val uri = "cycletime://issue/$issueId"
        val canHandle = issueResourceProvider.canHandle(uri)
        canHandle shouldBe true
    }
    
    "should support issue hierarchy tree resource URI" {
        // This will fail - no implementation exists yet
        val issueId = UUID.randomUUID().toString()
        val uri = "cycletime://issue/$issueId/tree"
        val canHandle = issueResourceProvider.canHandle(uri)
        canHandle shouldBe true
    }
    
    "should reject non-cycletime URIs" {
        // This will fail - no URI validation implemented
        val invalidUri = "http://issues"
        val canHandle = issueResourceProvider.canHandle(invalidUri)
        canHandle shouldBe false
    }

    // ================================================================================
    // URI Schema Validation Tests
    // ================================================================================
    
    "should validate cycletime protocol correctly" {
        // This will fail - no URI validation implemented
        val validUris = listOf(
            "cycletime://issues",
            "cycletime://issue/12345678-1234-1234-1234-123456789abc",
            "cycletime://issue/12345678-1234-1234-1234-123456789abc/tree"
        )
        
        validUris.forEach { uri ->
            issueResourceProvider.canHandle(uri) shouldBe true
        }
    }
    
    "should reject invalid issue URIs" {
        // This will fail - no URI validation implemented
        val invalidUris = listOf(
            "cycletime://issue", // Missing ID
            "cycletime://issue/invalid-uuid", // Invalid UUID format
            "cycletime://issue/12345678-1234-1234-1234-123456789abc/invalid", // Invalid path
            "file://cycletime/issues", // Wrong protocol
            "cycletime://projects" // Wrong resource type
        )
        
        invalidUris.forEach { uri ->
            issueResourceProvider.canHandle(uri) shouldBe false
        }
    }
    
    "should throw InvalidResourceUriException for malformed URIs" {
        // This will fail - no exception handling implemented
        val malformedUri = "completely-invalid"
        
        shouldThrow<InvalidResourceUriException> {
            runBlocking {
                issueResourceProvider.getResource(malformedUri)
            }
        }
    }

    // ================================================================================
    // Service Integration Tests
    // ================================================================================
    
    "issues listing should delegate to IssueApplicationService" {
        // This will fail - no service integration exists yet
        val uri = "cycletime://issues"
        
        val mockIssues = IssueListDto(
            issues = listOf(
                IssueDto(
                    id = IssueId(UUID.randomUUID().toString()),
                    title = "Integration Test Issue",
                    description = "Testing service integration",
                    status = IssueStatus.OPEN,
                    priority = IssuePriority.MEDIUM,
                    projectId = ProjectId(UUID.randomUUID().toString()),
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
        runBlocking { issueResourceProvider.getResource(uri) }
        
        coVerify { mockIssueService.listIssues(any<ListIssuesCommand>()) }
    }
    
    "individual issue should delegate to IssueApplicationService" {
        // This will fail - no service integration exists yet
        val issueId = IssueId(UUID.randomUUID().toString())
        val uri = "cycletime://issue/${issueId.value}"
        
        val mockIssue = IssueDto(
            id = issueId,
            title = "Individual Issue",
            description = "Testing individual retrieval",
            status = IssueStatus.IN_PROGRESS,
            priority = IssuePriority.HIGH,
            projectId = ProjectId(UUID.randomUUID().toString()),
            parentId = null,
            childIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockIssueService.getIssue(issueId) } returns mockIssue
        
        // This will fail - no service integration implemented
        runBlocking { issueResourceProvider.getResource(uri) }
        
        coVerify { mockIssueService.getIssue(issueId) }
    }
    
    "issue tree should delegate to IssueApplicationService" {
        // This will fail - no service integration exists yet
        val issueId = IssueId(UUID.randomUUID().toString())
        val uri = "cycletime://issue/${issueId.value}/tree"
        
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
        runBlocking { issueResourceProvider.getResource(uri) }
        
        coVerify { mockIssueService.getIssueTree(issueId) }
    }

    // ================================================================================
    // Error Handling Tests
    // ================================================================================
    
    "should handle IssueNotFoundException for individual issue" {
        // This will fail - no error handling implemented
        val nonExistentId = IssueId(UUID.randomUUID().toString())
        val uri = "cycletime://issue/${nonExistentId.value}"
        
        coEvery { mockIssueService.getIssue(nonExistentId) } throws IssueNotFoundException(nonExistentId)
        
        // Should wrap in ResourceNotFoundException
        shouldThrow<ResourceNotFoundException> {
            runBlocking { issueResourceProvider.getResource(uri) }
        }
    }
    
    "should handle IssueNotFoundException for issue tree" {
        // This will fail - no error handling implemented
        val nonExistentId = IssueId(UUID.randomUUID().toString())
        val uri = "cycletime://issue/${nonExistentId.value}/tree"
        
        coEvery { mockIssueService.getIssueTree(nonExistentId) } throws IssueNotFoundException(nonExistentId)
        
        shouldThrow<ResourceNotFoundException> {
            runBlocking { issueResourceProvider.getResource(uri) }
        }
    }
    
    "should handle service failures gracefully" {
        // This will fail - no error handling implemented
        val uri = "cycletime://issues"
        
        coEvery { 
            mockIssueService.listIssues(any<ListIssuesCommand>())
        } throws RuntimeException("Database connection failed")
        
        shouldThrow<RuntimeException> {
            runBlocking { issueResourceProvider.getResource(uri) }
        }
    }

    // ================================================================================
    // Resource Content Validation Tests
    // ================================================================================
    
    "issues listing should return properly formatted JSON content" {
        // This will fail - no JSON formatting implemented
        val uri = "cycletime://issues"
        
        val issueId = IssueId("12345678-1234-1234-1234-123456789abc")
        val projectId = ProjectId("87654321-4321-4321-4321-abcdef987654")
        val mockIssues = IssueListDto(
            issues = listOf(
                IssueDto(
                    id = issueId,
                    title = "Content Test Issue",
                    description = "Testing JSON content format",
                    status = IssueStatus.OPEN,
                    priority = IssuePriority.HIGH,
                    projectId = projectId,
                    parentId = null,
                    childIds = emptyList(),
                    createdAt = Instant.parse("2024-01-01T00:00:00Z"),
                    updatedAt = Instant.parse("2024-01-01T00:00:00Z")
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockIssueService.listIssues(any()) } returns mockIssues
        
        val resource = runBlocking { issueResourceProvider.getResource(uri) }
        
        resource.uri shouldBe uri
        resource.mimeType shouldBe "application/json"
        resource.content shouldNotBe null
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        jsonContent["issues"]?.jsonArray shouldHaveSize 1
        jsonContent["totalCount"]?.jsonPrimitive?.int shouldBe 1
        
        val issue = jsonContent["issues"]!!.jsonArray[0].jsonObject
        issue["id"]?.jsonPrimitive?.content shouldBe "12345678-1234-1234-1234-123456789abc"
        issue["title"]?.jsonPrimitive?.content shouldBe "Content Test Issue"
        issue["status"]?.jsonPrimitive?.content shouldBe "OPEN"
        issue["priority"]?.jsonPrimitive?.content shouldBe "HIGH"
        issue["projectId"]?.jsonPrimitive?.content shouldBe "87654321-4321-4321-4321-abcdef987654"
    }
    
    "individual issue should return properly formatted JSON content" {
        // This will fail - no JSON formatting implemented
        val issueId = IssueId("11111111-2222-3333-4444-555555555555")
        val projectId = ProjectId("66666666-7777-8888-9999-aaaaaaaaaaaa")
        val uri = "cycletime://issue/${issueId.value}"
        
        val mockIssue = IssueDto(
            id = issueId,
            title = "Individual Test Issue",
            description = "Testing individual JSON format",
            status = IssueStatus.IN_PROGRESS,
            priority = IssuePriority.LOW,
            projectId = projectId,
            parentId = null,
            childIds = listOf(IssueId(UUID.randomUUID().toString())),
            createdAt = Instant.parse("2024-01-01T10:00:00Z"),
            updatedAt = Instant.parse("2024-01-01T12:00:00Z")
        )
        
        coEvery { mockIssueService.getIssue(issueId) } returns mockIssue
        
        val resource = runBlocking { issueResourceProvider.getResource(uri) }
        
        resource.uri shouldBe uri
        resource.mimeType shouldBe "application/json"
        resource.content shouldNotBe null
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        jsonContent["id"]?.jsonPrimitive?.content shouldBe "11111111-2222-3333-4444-555555555555"
        jsonContent["title"]?.jsonPrimitive?.content shouldBe "Individual Test Issue"
        jsonContent["description"]?.jsonPrimitive?.content shouldBe "Testing individual JSON format"
        jsonContent["status"]?.jsonPrimitive?.content shouldBe "IN_PROGRESS"
        jsonContent["priority"]?.jsonPrimitive?.content shouldBe "LOW"
        jsonContent["projectId"]?.jsonPrimitive?.content shouldBe "66666666-7777-8888-9999-aaaaaaaaaaaa"
        jsonContent["childIds"]?.jsonArray shouldHaveSize 1
    }

    // ================================================================================
    // Issue Hierarchy Support Tests
    // ================================================================================
    
    "issue tree should return complete hierarchy JSON content" {
        // This will fail - no hierarchy formatting implemented
        val parentId = IssueId("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
        val childId = IssueId("ffffffff-1111-2222-3333-444444444444")
        val projectId = ProjectId("55555555-6666-7777-8888-999999999999")
        val uri = "cycletime://issue/${parentId.value}/tree"
        
        val mockTree = IssueTreeDto(
            issue = IssueDto(
                id = parentId,
                title = "Parent Issue",
                description = "Has child issues",
                status = IssueStatus.OPEN,
                priority = IssuePriority.HIGH,
                projectId = projectId,
                parentId = null,
                childIds = listOf(childId),
                createdAt = Instant.parse("2024-01-01T08:00:00Z"),
                updatedAt = Instant.parse("2024-01-01T10:00:00Z")
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
                        createdAt = Instant.parse("2024-01-01T09:00:00Z"),
                        updatedAt = Instant.parse("2024-01-01T09:00:00Z")
                    ),
                    children = emptyList()
                )
            )
        )
        
        coEvery { mockIssueService.getIssueTree(parentId) } returns mockTree
        
        val resource = runBlocking { issueResourceProvider.getResource(uri) }
        
        resource.uri shouldBe uri
        resource.mimeType shouldBe "application/json"
        resource.content shouldNotBe null
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        // Validate tree structure
        jsonContent["issue"] shouldNotBe null
        jsonContent["children"]?.jsonArray shouldHaveSize 1
        
        val rootIssue = jsonContent["issue"]!!.jsonObject
        rootIssue["id"]?.jsonPrimitive?.content shouldBe "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        rootIssue["title"]?.jsonPrimitive?.content shouldBe "Parent Issue"
        
        val child = jsonContent["children"]!!.jsonArray[0].jsonObject
        child["issue"]?.jsonObject?.get("id")?.jsonPrimitive?.content shouldBe "ffffffff-1111-2222-3333-444444444444"
        child["issue"]?.jsonObject?.get("title")?.jsonPrimitive?.content shouldBe "Child Issue"
        child["issue"]?.jsonObject?.get("parentId")?.jsonPrimitive?.content shouldBe "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        child["children"]?.jsonArray shouldHaveSize 0
    }

    // ================================================================================
    // Resource Metadata Tests
    // ================================================================================
    
    "should set proper resource metadata for issues listing" {
        // This will fail - no metadata implementation exists
        val uri = "cycletime://issues"
        
        val mockIssues = IssueListDto(
            issues = listOf(
                IssueDto(
                    id = IssueId(UUID.randomUUID().toString()),
                    title = "Metadata Test",
                    description = "Testing metadata",
                    status = IssueStatus.OPEN,
                    priority = IssuePriority.MEDIUM,
                    projectId = ProjectId(UUID.randomUUID().toString()),
                    parentId = null,
                    childIds = emptyList(),
                    createdAt = Instant.now(),
                    updatedAt = Instant.now()
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockIssueService.listIssues(any()) } returns mockIssues
        
        val resource = runBlocking { issueResourceProvider.getResource(uri) }
        
        resource.name shouldBe "Issues List"
        resource.description shouldContain "List of all issues"
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
    
    "should set proper permissions for issue resources" {
        // This will fail - no permissions implementation exists
        val issueId = IssueId(UUID.randomUUID().toString())
        val uri = "cycletime://issue/${issueId.value}"
        
        val mockIssue = IssueDto(
            id = issueId,
            title = "Permissions Test",
            description = "Testing permissions",
            status = IssueStatus.OPEN,
            priority = IssuePriority.MEDIUM,
            projectId = ProjectId(UUID.randomUUID().toString()),
            parentId = null,
            childIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        coEvery { mockIssueService.getIssue(issueId) } returns mockIssue
        
        val resource = runBlocking { issueResourceProvider.getResource(uri) }
        
        // Issue resources should be readable but not writable via MCP
        resource.permissions shouldNotBe null
        resource.permissions!!.readable shouldBe true
        resource.permissions.writable shouldBe false
    }

    // ================================================================================
    // Performance Requirements Tests
    // ================================================================================
    
    "issues listing should complete within 50ms performance requirement" {
        // This will fail - no implementation exists yet
        val uri = "cycletime://issues"
        
        val mockIssues = IssueListDto(
            issues = listOf(
                IssueDto(
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
            ),
            totalCount = 1
        )
        
        coEvery { mockIssueService.listIssues(any()) } returns mockIssues
        
        val startTime = System.currentTimeMillis()
        runBlocking { issueResourceProvider.getResource(uri) }
        val executionTime = System.currentTimeMillis() - startTime
        
        // Resource serving should be under 50ms
        executionTime shouldBe lessThan(50)
    }

    // ================================================================================
    // Pagination Support Tests
    // ================================================================================
    
    "should support pagination for issues listing" {
        // This will fail - no pagination implementation exists
        val uri = "cycletime://issues"
        val pagination = ResourcePagination(limit = 5, offset = 0)
        
        val mockIssues = IssueListDto(
            issues = (1..5).map { index ->
                IssueDto(
                    id = IssueId(UUID.randomUUID().toString()),
                    title = "Issue $index",
                    description = "Description $index",
                    status = IssueStatus.OPEN,
                    priority = IssuePriority.MEDIUM,
                    projectId = ProjectId(UUID.randomUUID().toString()),
                    parentId = null,
                    childIds = emptyList(),
                    createdAt = Instant.now(),
                    updatedAt = Instant.now()
                )
            },
            totalCount = 15 // More issues available
        )
        
        coEvery { mockIssueService.listIssues(any()) } returns mockIssues
        
        // This will fail - no pagination support implemented
        val resource = runBlocking { 
            issueResourceProvider.getResource(uri, pagination = pagination) 
        }
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        jsonContent["issues"]?.jsonArray shouldHaveSize 5
        jsonContent["totalCount"]?.jsonPrimitive?.int shouldBe 15
        jsonContent["offset"]?.jsonPrimitive?.int shouldBe 0
        jsonContent["limit"]?.jsonPrimitive?.int shouldBe 5
        jsonContent["hasMore"]?.jsonPrimitive?.boolean shouldBe true
    }

    // ================================================================================
    // Filter Support Tests
    // ================================================================================
    
    "should support filtering by issue status" {
        // This will fail - no filtering implementation exists
        val uri = "cycletime://issues"
        val filter = ResourceFilter(provider = "status:OPEN")
        
        val mockIssues = IssueListDto(
            issues = listOf(
                IssueDto(
                    id = IssueId(UUID.randomUUID().toString()),
                    title = "Open Issue",
                    description = "Only open issue",
                    status = IssueStatus.OPEN,
                    priority = IssuePriority.MEDIUM,
                    projectId = ProjectId(UUID.randomUUID().toString()),
                    parentId = null,
                    childIds = emptyList(),
                    createdAt = Instant.now(),
                    updatedAt = Instant.now()
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockIssueService.listIssues(any()) } returns mockIssues
        
        // This will fail - no filtering support implemented
        val resource = runBlocking { 
            issueResourceProvider.getResource(uri, filter = filter) 
        }
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        jsonContent["issues"]?.jsonArray shouldHaveSize 1
        jsonContent["issues"]!!.jsonArray[0].jsonObject["status"]?.jsonPrimitive?.content shouldBe "OPEN"
        
        coVerify { 
            mockIssueService.listIssues(
                match<ListIssuesCommand> { it.status == IssueStatus.OPEN }
            ) 
        }
    }
    
    "should support filtering by project" {
        // This will fail - no filtering implementation exists
        val uri = "cycletime://issues"
        val projectId = ProjectId(UUID.randomUUID().toString())
        val filter = ResourceFilter(provider = "project:${projectId.value}")
        
        val mockIssues = IssueListDto(
            issues = listOf(
                IssueDto(
                    id = IssueId(UUID.randomUUID().toString()),
                    title = "Project Issue",
                    description = "Issue in specific project",
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
        
        val resource = runBlocking { 
            issueResourceProvider.getResource(uri, filter = filter) 
        }
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        jsonContent["issues"]?.jsonArray shouldHaveSize 1
        jsonContent["issues"]!!.jsonArray[0].jsonObject["projectId"]?.jsonPrimitive?.content shouldBe projectId.value
        
        coVerify { 
            mockIssueService.listIssues(
                match<ListIssuesCommand> { it.projectId == projectId }
            ) 
        }
    }
    
    "should support filtering by priority" {
        // This will fail - no filtering implementation exists
        val uri = "cycletime://issues"
        val filter = ResourceFilter(provider = "priority:HIGH")
        
        val mockIssues = IssueListDto(
            issues = listOf(
                IssueDto(
                    id = IssueId(UUID.randomUUID().toString()),
                    title = "High Priority Issue",
                    description = "High priority issue only",
                    status = IssueStatus.OPEN,
                    priority = IssuePriority.HIGH,
                    projectId = ProjectId(UUID.randomUUID().toString()),
                    parentId = null,
                    childIds = emptyList(),
                    createdAt = Instant.now(),
                    updatedAt = Instant.now()
                )
            ),
            totalCount = 1
        )
        
        coEvery { mockIssueService.listIssues(any()) } returns mockIssues
        
        val resource = runBlocking { 
            issueResourceProvider.getResource(uri, filter = filter) 
        }
        
        val textContent = resource.content as ResourceContent.Text
        val jsonContent = Json.parseToJsonElement(textContent.data).jsonObject
        
        jsonContent["issues"]?.jsonArray shouldHaveSize 1
        jsonContent["issues"]!!.jsonArray[0].jsonObject["priority"]?.jsonPrimitive?.content shouldBe "HIGH"
        
        coVerify { 
            mockIssueService.listIssues(
                match<ListIssuesCommand> { it.priority == IssuePriority.HIGH }
            ) 
        }
    }

    // ================================================================================
    // End-to-End Resource Serving Tests
    // ================================================================================
    
    "complete resource serving workflow should work end-to-end" {
        // This will fail - no complete implementation exists yet
        val listUri = "cycletime://issues"
        val issueId = IssueId(UUID.randomUUID().toString())
        val issueUri = "cycletime://issue/${issueId.value}"
        val treeUri = "cycletime://issue/${issueId.value}/tree"
        
        // Mock complete issue data
        val mockIssue = IssueDto(
            id = issueId,
            title = "Workflow Test Issue",
            description = "Testing complete workflow",
            status = IssueStatus.OPEN,
            priority = IssuePriority.HIGH,
            projectId = ProjectId(UUID.randomUUID().toString()),
            parentId = null,
            childIds = listOf(IssueId(UUID.randomUUID().toString())),
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        val mockIssues = IssueListDto(
            issues = listOf(mockIssue),
            totalCount = 1
        )
        
        val mockTree = IssueTreeDto(
            issue = mockIssue,
            children = emptyList()
        )
        
        coEvery { mockIssueService.listIssues(any()) } returns mockIssues
        coEvery { mockIssueService.getIssue(issueId) } returns mockIssue
        coEvery { mockIssueService.getIssueTree(issueId) } returns mockTree
        
        // Execute complete workflow
        runBlocking {
            // 1. List all issues
            val listResource = issueResourceProvider.getResource(listUri)
            listResource.uri shouldBe listUri
            listResource.mimeType shouldBe "application/json"
            
            // 2. Get individual issue
            val issueResource = issueResourceProvider.getResource(issueUri)
            issueResource.uri shouldBe issueUri
            issueResource.mimeType shouldBe "application/json"
            
            // 3. Get issue tree
            val treeResource = issueResourceProvider.getResource(treeUri)
            treeResource.uri shouldBe treeUri
            treeResource.mimeType shouldBe "application/json"
        }
        
        // Verify all service calls were made
        coVerify { mockIssueService.listIssues(any()) }
        coVerify { mockIssueService.getIssue(issueId) }
        coVerify { mockIssueService.getIssueTree(issueId) }
    }
})

// Extension function for performance testing 
private infix fun <T : Comparable<T>> T.lessThan(other: T): Boolean = this < other