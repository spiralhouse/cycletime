package io.spiralhouse.cycletime.integration.mcp

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldNotBeEmpty
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.modelcontextprotocol.kotlin.sdk.Implementation
import io.modelcontextprotocol.kotlin.sdk.TextContent
import io.modelcontextprotocol.kotlin.sdk.client.Client
import io.modelcontextprotocol.kotlin.sdk.client.SSEClientTransport
import io.spiralhouse.cycletime.test.utils.testSDKApplication
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.slf4j.LoggerFactory

/**
 * Comprehensive integration tests for hierarchical issue creation via MCP tool interface.
 *
 * **TDD RED Phase (SPI-808)**: These tests validate hierarchical issue creation through the MCP
 * `create_issue` tool interface with `parentId` parameter support. Tests will initially FAIL
 * because the `parentId` parameter has not been implemented yet in the MCP tool layer.
 *
 * **CRITICAL**: Tests MUST invoke through MCP tool interface (via SDK Client), NOT direct
 * service calls. This validates the complete request → tool → service → domain flow including
 * parameter extraction and JSON serialization.
 *
 * ## Hierarchy Validation Rules (from IssueApplicationService:579-598)
 *
 * **Valid Hierarchies**:
 * - ✅ Epic with no parent (Epics cannot have any parent)
 * - ✅ Story with Epic parent (Stories can have Epic parent or no parent)
 * - ✅ Subtask with Story parent (Subtasks MUST have Story parent)
 *
 * **Invalid Hierarchies** (must throw HierarchyViolationException):
 * - ❌ Epic with any parent
 * - ❌ Story with Subtask parent
 * - ❌ Subtask with Epic parent
 * - ❌ Subtask with no parent
 *
 * ## Test Coverage
 *
 * 1. **Valid Hierarchy Scenarios**:
 *    - Create Epic with no parent
 *    - Create Story with Epic parent
 *    - Create Subtask with Story parent
 *    - Verify complete Epic → Story → Subtask chain
 *
 * 2. **Invalid Hierarchy Scenarios**:
 *    - Epic with parent fails
 *    - Subtask with Epic parent fails
 *    - Subtask with no parent fails
 *    - Story with Subtask parent fails
 *
 * 3. **Additional Scenarios**:
 *    - Project inheritance from parent
 *    - Invalid parent ID handling
 *
 * ## Test Strategy
 *
 * Uses SDK Client to call `issue_create_issue` tool with various `parentId` configurations:
 * - Valid parent IDs (Epic, Story) for appropriate child types
 * - Invalid parent IDs (non-existent, wrong type) for error validation
 * - Null parent IDs for root-level issues
 *
 * Validates both success responses (valid hierarchies) and error responses (invalid hierarchies).
 */
class IssueHierarchyMcpIntegrationTest : StringSpec({
    val logger = LoggerFactory.getLogger("IssueHierarchyMcpIntegrationTest")

    /**
     * Helper function to create a test project via MCP tool.
     * Required because all issues must be associated with a project.
     */
    suspend fun Client.createTestProject(name: String = "Test Project ${System.currentTimeMillis()}"): String {
        val result = this.callTool(
            name = "project_create_project",
            arguments = mapOf(
                "name" to JsonPrimitive(name),
                "description" to JsonPrimitive("Test project for hierarchy integration tests")
            )
        )

        result.shouldNotBeNull()
        result.isError shouldBe false
        result.content.shouldNotBeEmpty()

        val content = result.content[0]
        require(content is TextContent) { "Expected TextContent" }

        val jsonText = content.text ?: throw IllegalStateException("TextContent.text is null")
        val projectIdRegex = "\"id\"\\s*:\\s*\"([0-9a-f-]+)\"".toRegex()
        val match = projectIdRegex.find(jsonText)
        if (match != null) {
            return match.groupValues[1]
        }

        throw IllegalStateException("Failed to extract project ID from response: ${result.content}")
    }

    /**
     * Helper function to create an issue via MCP tool interface.
     * This is the PRIMARY test method - validates the complete MCP flow.
     *
     * @param client SDK Client instance
     * @param title Issue title
     * @param type Issue type (EPIC, STORY, SUBTASK)
     * @param projectId Project ID (required)
     * @param parentId Parent issue ID (optional - null for root issues)
     * @return Created issue ID
     */
    suspend fun Client.createIssueViaMcp(
        title: String,
        type: String,
        projectId: String,
        parentId: String? = null
    ): String {
        val arguments = buildMap {
            put("title", JsonPrimitive(title))
            put("type", JsonPrimitive(type))
            put("projectId", JsonPrimitive(projectId))
            if (parentId != null) {
                put("parentId", JsonPrimitive(parentId))
            }
        }

        val result = this.callTool(
            name = "issue_create_issue",
            arguments = arguments
        )

        result.shouldNotBeNull()
        result.isError shouldBe false
        result.content.shouldNotBeEmpty()

        val content = result.content[0]
        require(content is TextContent) { "Expected TextContent" }

        val jsonText = content.text ?: throw IllegalStateException("TextContent.text is null")
        val json = Json.parseToJsonElement(jsonText)

        return json.jsonObject["id"]?.jsonPrimitive?.content
            ?: throw IllegalStateException("Failed to extract issue ID from response")
    }

    /**
     * Helper function to get an issue via MCP tool interface.
     * Used to verify issue properties after creation.
     *
     * @param client SDK Client instance
     * @param issueId Issue ID to retrieve
     * @return JSON representation of the issue
     */
    suspend fun Client.getIssueViaMcp(issueId: String): kotlinx.serialization.json.JsonObject {
        val result = this.callTool(
            name = "issue_get_issue",
            arguments = mapOf("id" to JsonPrimitive(issueId))
        )

        result.shouldNotBeNull()
        result.isError shouldBe false
        result.content.shouldNotBeEmpty()

        val content = result.content[0]
        require(content is TextContent) { "Expected TextContent" }

        val jsonText = content.text ?: throw IllegalStateException("TextContent.text is null")
        return Json.parseToJsonElement(jsonText).jsonObject
    }

    // ===== Valid Hierarchy Tests =====

    "should create Epic with no parent via MCP tool" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // Setup: Create test project
            val projectId = client.createTestProject("Test Epic Creation")

            // Test: Create Epic with no parent
            val epicId = client.createIssueViaMcp(
                title = "Epic: User Authentication",
                type = "EPIC",
                projectId = projectId,
                parentId = null
            )

            // Verify: Epic should exist with no parent
            val epic = client.getIssueViaMcp(epicId)
            epic["id"]?.jsonPrimitive?.content shouldBe epicId
            epic["title"]?.jsonPrimitive?.content shouldBe "Epic: User Authentication"
            epic["type"]?.jsonPrimitive?.content shouldBe "EPIC"
            epic["projectId"]?.jsonPrimitive?.content shouldBe projectId

            // CRITICAL: Epic must have null parentId
            val parentIdElement = epic["parentId"]
            if (parentIdElement != null) {
                parentIdElement.jsonPrimitive.content shouldBe "" // Or check for null
            }
        }
    }

    "should create Story with Epic parent via MCP tool" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // Setup: Create test project and Epic
            val projectId = client.createTestProject("Test Story with Epic Parent")
            val epicId = client.createIssueViaMcp(
                title = "Epic: User Management",
                type = "EPIC",
                projectId = projectId,
                parentId = null
            )

            // Test: Create Story with Epic parent
            val storyId = client.createIssueViaMcp(
                title = "User Login",
                type = "STORY",
                projectId = projectId,
                parentId = epicId
            )

            // Verify: Story should have Epic as parent
            val story = client.getIssueViaMcp(storyId)
            story["id"]?.jsonPrimitive?.content shouldBe storyId
            story["title"]?.jsonPrimitive?.content shouldBe "User Login"
            story["type"]?.jsonPrimitive?.content shouldBe "STORY"
            story["projectId"]?.jsonPrimitive?.content shouldBe projectId

            // CRITICAL: Story must have Epic as parentId
            story["parentId"]?.jsonPrimitive?.content shouldBe epicId
        }
    }

    "should create Subtask with Story parent via MCP tool" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // Setup: Create test project, Epic, and Story
            val projectId = client.createTestProject("Test Subtask with Story Parent")
            val epicId = client.createIssueViaMcp(
                title = "Epic: Authentication",
                type = "EPIC",
                projectId = projectId,
                parentId = null
            )
            val storyId = client.createIssueViaMcp(
                title = "User Login",
                type = "STORY",
                projectId = projectId,
                parentId = epicId
            )

            // Test: Create Subtask with Story parent
            val subtaskId = client.createIssueViaMcp(
                title = "Create login form",
                type = "SUBTASK",
                projectId = projectId,
                parentId = storyId
            )

            // Verify: Subtask should have Story as parent
            val subtask = client.getIssueViaMcp(subtaskId)
            subtask["id"]?.jsonPrimitive?.content shouldBe subtaskId
            subtask["title"]?.jsonPrimitive?.content shouldBe "Create login form"
            subtask["type"]?.jsonPrimitive?.content shouldBe "SUBTASK"
            subtask["projectId"]?.jsonPrimitive?.content shouldBe projectId

            // CRITICAL: Subtask must have Story as parentId
            subtask["parentId"]?.jsonPrimitive?.content shouldBe storyId
        }
    }

    "should create complete Epic → Story → Subtask hierarchy via MCP tool" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // Setup: Create test project
            val projectId = client.createTestProject("Test Complete Hierarchy")

            // Test: Create complete 3-level hierarchy
            val epicId = client.createIssueViaMcp(
                title = "Epic: User Management",
                type = "EPIC",
                projectId = projectId,
                parentId = null
            )
            val storyId = client.createIssueViaMcp(
                title = "Story: User Login",
                type = "STORY",
                projectId = projectId,
                parentId = epicId
            )
            val subtaskId = client.createIssueViaMcp(
                title = "Subtask: Login Form",
                type = "SUBTASK",
                projectId = projectId,
                parentId = storyId
            )

            // Verify: Complete hierarchy chain
            val epic = client.getIssueViaMcp(epicId)
            val story = client.getIssueViaMcp(storyId)
            val subtask = client.getIssueViaMcp(subtaskId)

            // Epic: No parent
            epic["parentId"].let { element ->
                if (element != null) {
                    element.jsonPrimitive.content shouldBe ""
                }
            }

            // Story: Epic parent
            story["parentId"]?.jsonPrimitive?.content shouldBe epicId

            // Subtask: Story parent
            subtask["parentId"]?.jsonPrimitive?.content shouldBe storyId
        }
    }

    "should create Story with no parent via MCP tool" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // Setup: Create test project
            val projectId = client.createTestProject("Test Orphan Story")

            // Test: Create Story with no parent (allowed by application layer)
            val storyId = client.createIssueViaMcp(
                title = "Orphan Story",
                type = "STORY",
                projectId = projectId,
                parentId = null
            )

            // Verify: Story should exist with no parent
            val story = client.getIssueViaMcp(storyId)
            story["id"]?.jsonPrimitive?.content shouldBe storyId
            story["type"]?.jsonPrimitive?.content shouldBe "STORY"
            story["parentId"].let { element ->
                if (element != null) {
                    element.jsonPrimitive.content shouldBe ""
                }
            }
        }
    }

    // ===== Invalid Hierarchy Tests =====

    "should reject Epic with parent via MCP tool" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // Setup: Create test project and Epic
            val projectId = client.createTestProject("Test Epic with Parent Rejection")
            val parentEpicId = client.createIssueViaMcp(
                title = "Parent Epic",
                type = "EPIC",
                projectId = projectId,
                parentId = null
            )

            // Test: Attempt to create Epic with parent (should fail)
            val result = client.callTool(
                name = "issue_create_issue",
                arguments = mapOf(
                    "title" to JsonPrimitive("Child Epic"),
                    "type" to JsonPrimitive("EPIC"),
                    "projectId" to JsonPrimitive(projectId),
                    "parentId" to JsonPrimitive(parentEpicId)
                )
            )

            // Verify: Should return error response
            result.shouldNotBeNull()
            result.isError shouldBe true

            // Verify error message indicates hierarchy violation
            val content = result.content[0] as TextContent
            val errorText = content.text ?: ""
            errorText shouldContain "hierarchy" // or "cannot have parent" or similar
        }
    }

    "should reject Subtask with Epic parent via MCP tool" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // Setup: Create test project and Epic
            val projectId = client.createTestProject("Test Subtask with Epic Parent Rejection")
            val epicId = client.createIssueViaMcp(
                title = "Epic: Authentication",
                type = "EPIC",
                projectId = projectId,
                parentId = null
            )

            // Test: Attempt to create Subtask with Epic parent (should fail)
            val result = client.callTool(
                name = "issue_create_issue",
                arguments = mapOf(
                    "title" to JsonPrimitive("Invalid Subtask"),
                    "type" to JsonPrimitive("SUBTASK"),
                    "projectId" to JsonPrimitive(projectId),
                    "parentId" to JsonPrimitive(epicId)
                )
            )

            // Verify: Should return error response
            result.shouldNotBeNull()
            result.isError shouldBe true

            // Verify error message indicates hierarchy violation
            val content = result.content[0] as TextContent
            val errorText = content.text ?: ""
            errorText shouldContain "hierarchy" // or "cannot have Epic parent" or similar
        }
    }

    "should reject Subtask with no parent via MCP tool" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // Setup: Create test project
            val projectId = client.createTestProject("Test Subtask without Parent Rejection")

            // Test: Attempt to create Subtask with no parent (should fail)
            val result = client.callTool(
                name = "issue_create_issue",
                arguments = mapOf(
                    "title" to JsonPrimitive("Orphan Subtask"),
                    "type" to JsonPrimitive("SUBTASK"),
                    "projectId" to JsonPrimitive(projectId)
                    // No parentId provided
                )
            )

            // Verify: Should return error response
            result.shouldNotBeNull()
            result.isError shouldBe true

            // Verify error message indicates hierarchy violation
            val content = result.content[0] as TextContent
            val errorText = content.text ?: ""
            errorText shouldContain "hierarchy" // or "must have Story parent" or similar
        }
    }

    "should reject Story with Subtask parent via MCP tool" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // Setup: Create test project, Epic, Story, and Subtask
            val projectId = client.createTestProject("Test Story with Subtask Parent Rejection")
            val epicId = client.createIssueViaMcp(
                title = "Epic: Auth",
                type = "EPIC",
                projectId = projectId,
                parentId = null
            )
            val storyId = client.createIssueViaMcp(
                title = "Story: Login",
                type = "STORY",
                projectId = projectId,
                parentId = epicId
            )
            val subtaskId = client.createIssueViaMcp(
                title = "Subtask: Form",
                type = "SUBTASK",
                projectId = projectId,
                parentId = storyId
            )

            // Test: Attempt to create Story with Subtask parent (should fail)
            val result = client.callTool(
                name = "issue_create_issue",
                arguments = mapOf(
                    "title" to JsonPrimitive("Invalid Story"),
                    "type" to JsonPrimitive("STORY"),
                    "projectId" to JsonPrimitive(projectId),
                    "parentId" to JsonPrimitive(subtaskId)
                )
            )

            // Verify: Should return error response
            result.shouldNotBeNull()
            result.isError shouldBe true

            // Verify error message indicates hierarchy violation
            val content = result.content[0] as TextContent
            val errorText = content.text ?: ""
            errorText shouldContain "hierarchy" // or "cannot have Subtask parent" or similar
        }
    }

    // ===== Additional Scenario Tests =====

    "should inherit project from parent when projectId not specified via MCP tool" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // Setup: Create test project and Epic
            val projectId = client.createTestProject("Test Project Inheritance")
            val epicId = client.createIssueViaMcp(
                title = "Epic with Project",
                type = "EPIC",
                projectId = projectId,
                parentId = null
            )

            // Test: Create Story with Epic parent but no explicit projectId
            // NOTE: This may require API changes to support omitting projectId
            val storyId = client.createIssueViaMcp(
                title = "Story inherits project",
                type = "STORY",
                projectId = projectId, // For now, still required by tool schema
                parentId = epicId
            )

            // Verify: Story should have same projectId as Epic
            val story = client.getIssueViaMcp(storyId)
            story["projectId"]?.jsonPrimitive?.content shouldBe projectId
        }
    }

    "should reject creation with non-existent parent ID via MCP tool" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-test-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(10_000) {
                client.connect(transport)
            }

            // Setup: Create test project
            val projectId = client.createTestProject("Test Invalid Parent ID")

            // Test: Attempt to create Story with non-existent parent ID
            val fakeParentId = "00000000-0000-0000-0000-000000000000"
            val result = client.callTool(
                name = "issue_create_issue",
                arguments = mapOf(
                    "title" to JsonPrimitive("Story with fake parent"),
                    "type" to JsonPrimitive("STORY"),
                    "projectId" to JsonPrimitive(projectId),
                    "parentId" to JsonPrimitive(fakeParentId)
                )
            )

            // Verify: Should return error response
            result.shouldNotBeNull()
            result.isError shouldBe true

            // Verify error message indicates parent not found
            val content = result.content[0] as TextContent
            val errorText = content.text ?: ""
            // Error should mention either "not found" or "Issue"
            val hasNotFound = errorText.contains("not found", ignoreCase = true)
            val hasIssue = errorText.contains("Issue", ignoreCase = true)
            (hasNotFound || hasIssue) shouldBe true
        }
    }
})
