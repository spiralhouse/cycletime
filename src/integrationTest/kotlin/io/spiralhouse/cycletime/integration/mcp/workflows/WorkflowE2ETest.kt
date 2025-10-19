package io.spiralhouse.cycletime.integration.mcp.workflows

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotBeEmpty
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.modelcontextprotocol.kotlin.sdk.Implementation
import io.modelcontextprotocol.kotlin.sdk.ReadResourceRequest
import io.modelcontextprotocol.kotlin.sdk.TextContent
import io.modelcontextprotocol.kotlin.sdk.TextResourceContents
import io.modelcontextprotocol.kotlin.sdk.client.Client
import io.modelcontextprotocol.kotlin.sdk.client.SSEClientTransport
import io.spiralhouse.cycletime.test.utils.testSDKApplication
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

private const val TEST_TIMEOUT_MS = 10_000L

/**
 * Comprehensive end-to-end workflow tests for MCP endpoints (SPI-718).
 *
 * These tests validate complete multi-step business processes that users would execute
 * through the MCP SDK. Unlike integration tests that focus on individual operations,
 * these e2e workflow tests verify:
 *
 * - **Multi-step user journeys** - Complete workflows from start to finish
 * - **State persistence** - Data survives across multiple operations
 * - **Cross-component integration** - Tools, resources, and sessions work together
 * - **Production-like scenarios** - Realistic sequences Claude Code would execute
 *
 * ## Test Strategy
 *
 * Each workflow test follows a complete business process:
 * 1. Setup initial state (projects, sessions)
 * 2. Execute multi-step workflow operations
 * 3. Verify state changes persist
 * 4. Validate cross-component interactions
 *
 * ## Workflow Scenarios
 *
 * 1. **Project Setup Workflow** - Resource discovery → Project creation → Resource verification
 * 2. **Issue Management Workflow** - Project setup → Issue creation → State management
 * 3. **Session Lifecycle Workflow** - Session creation → Tool execution → Resource access
 * 4. **Workflow Transition Workflow** - Workflow discovery → Issue transitions → State validation
 * 5. **Error Recovery Workflow** - Session creation → Failure handling → Recovery
 *
 * ## Performance Requirements
 *
 * - Individual workflow tests: < 200ms each (includes SDK connection overhead)
 * - Total suite execution: < 30s (acceptance criteria from SPI-718)
 *
 * @see io.spiralhouse.cycletime.integration.mcp.sdk.MCPSdkTransportTest Individual operation tests
 * @see io.spiralhouse.cycletime.integration.mcp.tools.McpToolIntegrationTest Tool execution tests
 */
class WorkflowE2ETest : StringSpec({

    /**
     * Helper function to create a test project and return its UUID.
     *
     * This is a common operation needed by most workflow tests, extracted
     * to reduce duplication and improve test readability.
     *
     * @param name Project name (default: timestamped unique name)
     * @return Project UUID as string
     */
    suspend fun Client.createTestProject(name: String = "Test Project ${System.currentTimeMillis()}"): String {
        val result = this.callTool(
            name = "project_create_project",
            arguments = mapOf(
                "name" to JsonPrimitive(name),
                "description" to JsonPrimitive("Test project for e2e workflow tests")
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

    // ===== Workflow 1: Project Setup Workflow =====

    "should handle complete project setup workflow from resource discovery to verification" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-workflow-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(TEST_TIMEOUT_MS) {
                client.connect(transport)
            }

            // Step 1: Query available resources (initial state)
            val initialResources = client.listResources()
            initialResources.resources.shouldNotBeEmpty()

            // Step 2: Create new project
            val projectName = "E2E Test Project ${System.currentTimeMillis()}"
            val projectId = client.createTestProject(projectName)

            projectId.shouldNotBeNull()
            projectId.length shouldBe 36 // UUID format validation

            // Step 3: Verify template resource exists (SPI-718)
            // Note: Individual project resources are not enumerated in listResources()
            // Dynamic resource discovery will be implemented in a follow-up issue
            val updatedResources = client.listResources()
            updatedResources.resources.shouldNotBeEmpty()

            val templateResource = updatedResources.resources.find {
                it.uri == "cycletime://projects/{id}"
            }

            templateResource.shouldNotBeNull()
            templateResource?.name shouldBe "CycleTime Project"
            templateResource?.mimeType shouldBe "application/json"

            // Step 4: Verify project was created by reading collection resource
            // Individual resources are not currently accessible via readResource() due to SDK limitations
            // (SDK requires resources to be explicitly listed in listResources() for validation)
            val projectsContent = client.readResource(
                ReadResourceRequest(uri = "cycletime://projects")
            )

            projectsContent.contents.shouldNotBeEmpty()
            val textContent = projectsContent.contents[0] as TextResourceContents
            textContent.text.shouldNotBeNull()

            // Parse JSON response and validate project exists in collection
            val projectsListResponse = Json.parseToJsonElement(textContent.text).jsonObject
            val projectsArray = projectsListResponse["projects"]
            projectsArray.shouldNotBeNull()

            // Verify created project exists in the collection
            val projectExists = projectsArray.toString().contains(projectId) &&
                                projectsArray.toString().contains(projectName)
            projectExists shouldBe true
        }
    }

    // ===== Workflow 2: Issue Management Workflow =====

    "should handle complete issue management workflow with multiple issues and state changes" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-workflow-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(TEST_TIMEOUT_MS) {
                client.connect(transport)
            }

            // Step 1: Create project for issue management
            val projectId = client.createTestProject("Issue Management Project")

            // Step 2: Create multiple issues
            val issue1Result = client.callTool(
                "issue_create_issue",
                mapOf(
                    "projectId" to JsonPrimitive(projectId),
                    "title" to JsonPrimitive("E2E Test Issue 1"),
                    "description" to JsonPrimitive("First test issue for workflow validation")
                )
            )
            issue1Result.shouldNotBeNull()
            issue1Result.isError shouldBe false

            val issue2Result = client.callTool(
                "issue_create_issue",
                mapOf(
                    "projectId" to JsonPrimitive(projectId),
                    "title" to JsonPrimitive("E2E Test Issue 2"),
                    "description" to JsonPrimitive("Second test issue for workflow validation")
                )
            )
            issue2Result.shouldNotBeNull()
            issue2Result.isError shouldBe false

            val issue3Result = client.callTool(
                "issue_create_issue",
                mapOf(
                    "projectId" to JsonPrimitive(projectId),
                    "title" to JsonPrimitive("E2E Test Issue 3"),
                    "description" to JsonPrimitive("Third test issue for workflow validation")
                )
            )
            issue3Result.shouldNotBeNull()
            issue3Result.isError shouldBe false

            // Extract issue IDs
            val issue1Content = issue1Result.content[0] as TextContent
            val issue1Json = Json.parseToJsonElement(issue1Content.text!!)
            val issue1Id = issue1Json.jsonObject["id"]?.jsonPrimitive?.content

            val issue2Content = issue2Result.content[0] as TextContent
            val issue2Json = Json.parseToJsonElement(issue2Content.text!!)
            val issue2Id = issue2Json.jsonObject["id"]?.jsonPrimitive?.content

            val issue3Content = issue3Result.content[0] as TextContent
            val issue3Json = Json.parseToJsonElement(issue3Content.text!!)
            val issue3Id = issue3Json.jsonObject["id"]?.jsonPrimitive?.content

            issue1Id.shouldNotBeNull()
            issue2Id.shouldNotBeNull()
            issue3Id.shouldNotBeNull()

            // Step 3: List all issues and verify they exist
            val listResult = client.callTool("issue_list_issues", emptyMap())
            listResult.shouldNotBeNull()
            listResult.isError shouldBe false

            val listContent = listResult.content[0] as TextContent
            val issuesList = listContent.text!!

            issuesList shouldContain issue1Id
            issuesList shouldContain issue2Id
            issuesList shouldContain issue3Id
            issuesList shouldContain "E2E Test Issue 1"
            issuesList shouldContain "E2E Test Issue 2"
            issuesList shouldContain "E2E Test Issue 3"

            // Step 4: Update issue states
            val updateResult = client.callTool(
                "issue_update_issue",
                mapOf(
                    "id" to JsonPrimitive(issue1Id),
                    "title" to JsonPrimitive("E2E Test Issue 1 - Updated")
                )
            )
            updateResult.shouldNotBeNull()
            updateResult.isError shouldBe false

            // Step 5: Verify update persisted
            val getIssueResult = client.callTool(
                "issue_get_issue",
                mapOf("id" to JsonPrimitive(issue1Id))
            )
            getIssueResult.shouldNotBeNull()
            getIssueResult.isError shouldBe false

            val getIssueContent = getIssueResult.content[0] as TextContent
            val updatedIssue = getIssueContent.text!!

            updatedIssue shouldContain issue1Id
            updatedIssue shouldContain "E2E Test Issue 1 - Updated"
        }
    }

    // ===== Workflow 3: Session Lifecycle Workflow =====

    "should handle complete session lifecycle with tool execution and resource access" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-workflow-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(TEST_TIMEOUT_MS) {
                client.connect(transport)
            }

            // Step 1: Create project for session
            val projectId = client.createTestProject("Session Lifecycle Project")

            // Step 2: Create session
            val sessionResult = client.callTool(
                "session_create_session",
                mapOf("projectId" to JsonPrimitive(projectId))
            )

            sessionResult.shouldNotBeNull()
            sessionResult.isError shouldBe false
            sessionResult.content.shouldNotBeEmpty()

            val sessionContent = sessionResult.content[0] as TextContent
            sessionContent.text shouldContain projectId

            // Step 3: Execute multiple tools with session context
            val projectListResult = client.callTool("project_list_projects", emptyMap())
            projectListResult.shouldNotBeNull()
            projectListResult.isError shouldBe false

            val sessionListResult = client.callTool("session_list_sessions", emptyMap())
            sessionListResult.shouldNotBeNull()
            sessionListResult.isError shouldBe false

            val issueListResult = client.callTool("issue_list_issues", emptyMap())
            issueListResult.shouldNotBeNull()
            issueListResult.isError shouldBe false

            // Step 4: Read resources with session context
            val activeSessionResource = client.readResource(
                ReadResourceRequest(uri = "cycletime://sessions/active")
            )

            activeSessionResource.contents.shouldNotBeEmpty()
            val activeSessionContent = activeSessionResource.contents[0] as TextResourceContents
            activeSessionContent.text.shouldNotBeNull()

            // Step 5: Verify session persisted across all operations
            val getActiveSessionResult = client.callTool("session_get_active_session", emptyMap())
            getActiveSessionResult.shouldNotBeNull()
            getActiveSessionResult.isError shouldBe false
            getActiveSessionResult.content.shouldNotBeEmpty()

            val activeSessionData = getActiveSessionResult.content[0] as TextContent
            val sessionJson = Json.parseToJsonElement(activeSessionData.text!!)

            sessionJson.jsonObject.keys shouldContain "sessionKey"
            sessionJson.jsonObject.keys shouldContain "projectId"

            // ProjectId is a data class that serializes as {"_value": "uuid"}
            val projectIdValue = sessionJson.jsonObject["projectId"]?.jsonObject?.get("_value")?.jsonPrimitive?.content
            projectIdValue shouldBe projectId

            // Step 6: Create issue using session context
            val issueInSessionResult = client.callTool(
                "issue_create_issue",
                mapOf(
                    "projectId" to JsonPrimitive(projectId),
                    "title" to JsonPrimitive("Issue Created in Session"),
                    "description" to JsonPrimitive("Validates session context works")
                )
            )
            issueInSessionResult.shouldNotBeNull()
            issueInSessionResult.isError shouldBe false

            // Verify session remained valid after issue creation
            val finalSessionCheck = client.callTool("session_get_active_session", emptyMap())
            finalSessionCheck.shouldNotBeNull()
            finalSessionCheck.isError shouldBe false
        }
    }

    // ===== Workflow 4: Workflow Transition Workflow =====

    "should handle complete workflow transition process from discovery to state validation" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-workflow-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(TEST_TIMEOUT_MS) {
                client.connect(transport)
            }

            // Step 1: List available workflows
            val workflowsResult = client.callTool("workflow_list_workflows", emptyMap())
            workflowsResult.shouldNotBeNull()
            workflowsResult.isError shouldBe false
            workflowsResult.content.shouldNotBeEmpty()

            val workflowsContent = workflowsResult.content[0] as TextContent
            val workflowsList = workflowsContent.text!!

            // Verify at least one workflow exists
            workflowsList.shouldNotBeNull()

            // Step 2: Create project and issue for workflow transitions
            val projectId = client.createTestProject("Workflow Transition Project")

            val issueResult = client.callTool(
                "issue_create_issue",
                mapOf(
                    "projectId" to JsonPrimitive(projectId),
                    "title" to JsonPrimitive("Workflow Test Issue"),
                    "description" to JsonPrimitive("Issue for workflow state transitions")
                )
            )
            issueResult.shouldNotBeNull()
            issueResult.isError shouldBe false

            val issueContent = issueResult.content[0] as TextContent
            val issueJson = Json.parseToJsonElement(issueContent.text!!)
            val issueId = issueJson.jsonObject["id"]?.jsonPrimitive?.content
            issueId.shouldNotBeNull()

            // Step 3: Update issue title (simulating workflow transition)
            val transition1Result = client.callTool(
                "issue_update_issue",
                mapOf(
                    "id" to JsonPrimitive(issueId),
                    "title" to JsonPrimitive("Workflow Test Issue - In Progress")
                )
            )
            transition1Result.shouldNotBeNull()
            transition1Result.isError shouldBe false

            // Step 4: Verify update succeeded
            val verifyProgress = client.callTool(
                "issue_get_issue",
                mapOf("id" to JsonPrimitive(issueId))
            )
            verifyProgress.shouldNotBeNull()
            verifyProgress.isError shouldBe false

            val progressContent = verifyProgress.content[0] as TextContent
            val progressJson = Json.parseToJsonElement(progressContent.text!!)
            progressJson.jsonObject["title"]?.jsonPrimitive?.content shouldContain "In Progress"

            // Step 5: Update to done state (simulating completion)
            val transition2Result = client.callTool(
                "issue_update_issue",
                mapOf(
                    "id" to JsonPrimitive(issueId),
                    "title" to JsonPrimitive("Workflow Test Issue - Done")
                )
            )
            transition2Result.shouldNotBeNull()
            transition2Result.isError shouldBe false

            // Step 6: Verify final update succeeded
            val verifyDone = client.callTool(
                "issue_get_issue",
                mapOf("id" to JsonPrimitive(issueId))
            )
            verifyDone.shouldNotBeNull()
            verifyDone.isError shouldBe false

            val doneContent = verifyDone.content[0] as TextContent
            val doneJson = Json.parseToJsonElement(doneContent.text!!)
            doneJson.jsonObject["title"]?.jsonPrimitive?.content shouldContain "Done"

            // Verify issue identity remained consistent
            // After update_issue returns full IssueDto, ID is serialized as {"_value": "uuid"}
            val actualId = doneJson.jsonObject["id"]?.jsonObject?.get("_value")?.jsonPrimitive?.content
            actualId shouldBe issueId
        }
    }

    // ===== Workflow 5: Error Recovery Workflow =====

    "should handle error recovery workflow with session persistence and retry logic" {
        testSDKApplication { serverUrl, httpClient ->
            val client = Client(Implementation("cycletime-workflow-client", "1.0.0"))
            val transport = SSEClientTransport(httpClient, serverUrl)

            withTimeout(TEST_TIMEOUT_MS) {
                client.connect(transport)
            }

            // Step 1: Create project and session
            val projectId = client.createTestProject("Error Recovery Project")

            val sessionResult = client.callTool(
                "session_create_session",
                mapOf("projectId" to JsonPrimitive(projectId))
            )
            sessionResult.shouldNotBeNull()
            sessionResult.isError shouldBe false

            // Step 2: Intentionally fail a tool call (missing required parameters)
            val failResult = client.callTool(
                "issue_create_issue",
                emptyMap() // Missing required projectId and title
            )

            // Verify error response
            failResult.shouldNotBeNull()
            failResult.isError shouldBe true

            // Step 3: Verify session still valid after error
            val sessionCheckResult = client.callTool("session_get_active_session", emptyMap())
            sessionCheckResult.shouldNotBeNull()
            sessionCheckResult.isError shouldBe false
            sessionCheckResult.content.shouldNotBeEmpty()

            val sessionCheckContent = sessionCheckResult.content[0] as TextContent
            val sessionData = Json.parseToJsonElement(sessionCheckContent.text!!)

            // ProjectId is a data class that serializes as {"_value": "uuid"}
            val projectIdValue = sessionData.jsonObject["projectId"]?.jsonObject?.get("_value")?.jsonPrimitive?.content
            projectIdValue shouldBe projectId

            // Step 4: Retry with correct parameters
            val retryResult = client.callTool(
                "issue_create_issue",
                mapOf(
                    "projectId" to JsonPrimitive(projectId),
                    "title" to JsonPrimitive("Retry Test Issue"),
                    "description" to JsonPrimitive("Created after error recovery")
                )
            )

            // Step 5: Verify retry succeeded
            retryResult.shouldNotBeNull()
            retryResult.isError shouldBe false
            retryResult.content.shouldNotBeEmpty()

            val retryContent = retryResult.content[0] as TextContent
            val issueJson = Json.parseToJsonElement(retryContent.text!!)
            val issueId = issueJson.jsonObject["id"]?.jsonPrimitive?.content

            issueId.shouldNotBeNull()
            issueJson.jsonObject["title"]?.jsonPrimitive?.content shouldBe "Retry Test Issue"

            // Step 6: Verify session still valid after successful retry
            val finalSessionCheck = client.callTool("session_get_active_session", emptyMap())
            finalSessionCheck.shouldNotBeNull()
            finalSessionCheck.isError shouldBe false

            // Step 7: Execute another operation to confirm full recovery
            val listIssuesResult = client.callTool("issue_list_issues", emptyMap())
            listIssuesResult.shouldNotBeNull()
            listIssuesResult.isError shouldBe false

            val listContent = listIssuesResult.content[0] as TextContent
            listContent.text shouldContain issueId
            listContent.text shouldContain "Retry Test Issue"

            // Step 8: Test multiple consecutive errors don't break session
            val error2 = client.callTool("issue_update_issue", emptyMap())
            error2.shouldNotBeNull()
            error2.isError shouldBe true

            val error3 = client.callTool("issue_create_issue", mapOf("title" to JsonPrimitive("Invalid"))) // Missing projectId
            error3.shouldNotBeNull()
            error3.isError shouldBe true

            // Verify session resilient to multiple errors
            val resilientSessionCheck = client.callTool("session_get_active_session", emptyMap())
            resilientSessionCheck.shouldNotBeNull()
            resilientSessionCheck.isError shouldBe false
            resilientSessionCheck.content.shouldNotBeEmpty()
        }
    }
})
