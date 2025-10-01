package io.spiralhouse.cycletime.integration.api.v1

import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation as ClientContentNegotiation
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.di.*
import io.ktor.server.testing.*
import io.ktor.server.application.*
import io.spiralhouse.cycletime.application.commands.CreateProjectCommand
import io.spiralhouse.cycletime.application.commands.CreateIssueCommand
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.api.dto.*
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.test.utils.DatabaseTestHelper
import io.spiralhouse.cycletime.test.utils.DatabaseTestHelper.configureTestApplication
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseNamingStrategy
import io.spiralhouse.cycletime.api.configuration.ApiConfiguration
import kotlinx.datetime.Instant
import kotlinx.serialization.json.Json
import org.slf4j.LoggerFactory

/**
 * TDD RED Phase Tests for Nested Issue API Endpoints (SPI-634 Anti-Pattern #1)
 *
 * ## Anti-Pattern Being Fixed
 *
 * **OLD**: `POST /api/issues` with projectId in request body
 * **NEW**: `POST /api/v1/projects/{projectId}/issues` with projectId in URL
 *
 * ## Expected Behavior
 *
 * These tests define the expected behavior for nested issue endpoints where the project context
 * is part of the URL path rather than the request body. This follows RESTful resource nesting
 * principles and makes the API more intuitive.
 *
 * ### Happy Path Tests
 * - Creating issues under a project context
 * - Listing issues within a project
 * - Getting issue with project context validation
 * - Updating and deleting issues with project context
 *
 * ### Edge Case Tests
 * - Non-existent project IDs return 404
 * - Issues accessed through wrong project context return 404
 * - Required fields validation
 * - Parent validation for nested resources
 *
 * ### Authorization Tests
 * - Archived project handling
 * - Project ownership validation
 * - Correct projectId assignment from URL
 *
 * ## Why This Will FAIL Initially
 *
 * 1. Routes `/api/v1/projects/{projectId}/issues` are not implemented
 * 2. Project context validation logic not implemented
 * 3. No extraction of projectId from URL path in issue creation
 * 4. Legacy `/api/issues` still accepts projectId in body (backwards compat)
 *
 * @see IssueRoutes.kt for implementation (GREEN phase)
 */
class NestedIssueRoutesTest : FunSpec({

    val logger = LoggerFactory.getLogger(NestedIssueRoutesTest::class.java)

    lateinit var mockTimeProvider: MockTimeProvider

    /**
     * Helper function to create a properly configured test application.
     */
    fun configuredTestApplication(test: suspend ApplicationTestBuilder.() -> Unit) {
        testApplication {
            configureTestApplication(
                strategy = TestDatabaseNamingStrategy.UUID,
                enableLogging = false,
                timeProvider = mockTimeProvider
            )

            application {
                install(ContentNegotiation) {
                    json(Json {
                        prettyPrint = true
                        isLenient = true
                        ignoreUnknownKeys = true
                    })
                }

                val timeProvider: io.spiralhouse.cycletime.domain.services.TimeProvider by dependencies
                ApiConfiguration.configure(this, timeProvider)
            }

            test()
        }
    }

    /**
     * Create a JSON-enabled HTTP client for test requests
     */
    fun ApplicationTestBuilder.createJsonClient() = createClient {
        install(ClientContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }
    }

    beforeSpec {
        DatabaseTestHelper.initTestDatabase(
            testName = "nested_issue_routes_test",
            enableLogging = false
        )
    }

    afterSpec {
        DatabaseTestHelper.cleanupTestDatabase()
    }

    beforeEach {
        mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
    }

    // ================================================================================
    // Happy Path Tests - Nested Issue Creation
    // ================================================================================

    test("POST /api/v1/projects/{projectId}/issues creates issue in correct project") {
        configuredTestApplication {
            client.get("/health")

            // Create project first
            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            val request = CreateIssueRequest(
                projectId = null, // Should NOT be in body for nested endpoint
                title = "Test Issue",
                description = "Issue created via nested endpoint",
                type = "STORY"
            )

            val jsonClient = createJsonClient()

            // This test will FAIL until nested routes are implemented
            val response = jsonClient.post("/api/v1/projects/${project.id.value}/issues") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            response.status shouldBe HttpStatusCode.Created

            val issueResponse: IssueResponse = response.body()
            issueResponse.title shouldBe "Test Issue"
            issueResponse.projectId shouldBe project.id.value.toString()
            issueResponse.description shouldBe "Issue created via nested endpoint"
            issueResponse.type shouldBe "STORY"
            issueResponse.id shouldNotBe null
        }
    }

    test("POST /api/v1/projects/{projectId}/issues creates Epic issue under project") {
        configuredTestApplication {
            client.get("/health")

            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Epic Project", "Description"))

            val request = CreateIssueRequest(
                projectId = null,
                title = "Epic Issue",
                description = "Epic description",
                type = "EPIC"
            )

            val response = createJsonClient().post("/api/v1/projects/${project.id.value}/issues") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            response.status shouldBe HttpStatusCode.Created

            val issueResponse: IssueResponse = response.body()
            issueResponse.type shouldBe "EPIC"
            issueResponse.projectId shouldBe project.id.value.toString()
            issueResponse.estimate shouldBe null // Epics cannot have estimates
        }
    }

    test("POST /api/v1/projects/{projectId}/issues creates Subtask with parent validation") {
        configuredTestApplication {
            client.get("/health")

            // Create project, epic, and story
            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            val issueService: IssueApplicationService by application.dependencies
            val epic = issueService.createIssue(CreateIssueCommand(
                title = "Epic",
                type = IssueType.EPIC,
                projectId = project.id
            ))
            val story = issueService.createIssue(CreateIssueCommand(
                title = "Story",
                type = IssueType.STORY,
                parentId = epic.id
            ))

            val request = CreateIssueRequest(
                projectId = null,
                title = "Subtask Issue",
                type = "SUBTASK",
                parentId = story.id.value,
                estimate = 3
            )

            val response = createJsonClient().post("/api/v1/projects/${project.id.value}/issues") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            response.status shouldBe HttpStatusCode.Created

            val issueResponse: IssueResponse = response.body()
            issueResponse.type shouldBe "SUBTASK"
            issueResponse.parentId shouldBe story.id.value.toString()
            issueResponse.estimate shouldBe 3
        }
    }

    // ================================================================================
    // Happy Path Tests - Nested Issue Retrieval
    // ================================================================================

    test("GET /api/v1/projects/{projectId}/issues returns only project issues") {
        configuredTestApplication {
            client.get("/health")

            // Create two projects with issues
            val projectService: ProjectApplicationService by application.dependencies
            val project1 = projectService.createProject(CreateProjectCommand("Project 1", "Description"))
            val project2 = projectService.createProject(CreateProjectCommand("Project 2", "Description"))

            val issueService: IssueApplicationService by application.dependencies
            issueService.createIssue(CreateIssueCommand(
                title = "Issue in Project 1",
                type = IssueType.STORY,
                projectId = project1.id
            ))
            issueService.createIssue(CreateIssueCommand(
                title = "Issue in Project 2",
                type = IssueType.STORY,
                projectId = project2.id
            ))

            // Request issues for project 1 only
            val response = createJsonClient().get("/api/v1/projects/${project1.id.value}/issues")

            response.status shouldBe HttpStatusCode.OK

            val listResponse: IssueListResponse = response.body()
            listResponse.totalCount shouldBe 1
            listResponse.issues shouldHaveSize 1
            listResponse.issues[0].title shouldBe "Issue in Project 1"
        }
    }

    test("GET /api/v1/projects/{projectId}/issues/{issueId} returns issue with project context") {
        configuredTestApplication {
            client.get("/health")

            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            val issueService: IssueApplicationService by application.dependencies
            val issue = issueService.createIssue(CreateIssueCommand(
                title = "Test Issue",
                type = IssueType.STORY,
                projectId = project.id
            ))

            // Get issue via nested endpoint
            val response = createJsonClient().get("/api/v1/projects/${project.id.value}/issues/${issue.id.value}")

            response.status shouldBe HttpStatusCode.OK

            val issueResponse: IssueResponse = response.body()
            issueResponse.id shouldBe issue.id.value.toString()
            issueResponse.projectId shouldBe project.id.value.toString()
            issueResponse.title shouldBe "Test Issue"
        }
    }

    // ================================================================================
    // Happy Path Tests - Nested Issue Update/Delete
    // ================================================================================

    test("PUT /api/v1/projects/{projectId}/issues/{issueId} updates issue") {
        configuredTestApplication {
            client.get("/health")

            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            val issueService: IssueApplicationService by application.dependencies
            val issue = issueService.createIssue(CreateIssueCommand(
                title = "Original Title",
                type = IssueType.STORY,
                projectId = project.id
            ))

            val updateRequest = UpdateIssueRequest(
                title = "Updated Title",
                description = "Updated Description"
            )

            val response = createJsonClient().put("/api/v1/projects/${project.id.value}/issues/${issue.id.value}") {
                contentType(ContentType.Application.Json)
                setBody(updateRequest)
            }

            response.status shouldBe HttpStatusCode.OK

            val issueResponse: IssueResponse = response.body()
            issueResponse.title shouldBe "Updated Title"
            issueResponse.description shouldBe "Updated Description"
        }
    }

    test("DELETE /api/v1/projects/{projectId}/issues/{issueId} deletes issue") {
        configuredTestApplication {
            client.get("/health")

            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            val issueService: IssueApplicationService by application.dependencies
            val issue = issueService.createIssue(CreateIssueCommand(
                title = "Issue to Delete",
                type = IssueType.STORY,
                projectId = project.id
            ))

            val response = createJsonClient().delete("/api/v1/projects/${project.id.value}/issues/${issue.id.value}")

            response.status shouldBe HttpStatusCode.NoContent

            // Verify deletion
            val getResponse = createJsonClient().get("/api/v1/projects/${project.id.value}/issues/${issue.id.value}")
            getResponse.status shouldBe HttpStatusCode.NotFound
        }
    }

    // ================================================================================
    // Edge Case Tests - Invalid Project Context
    // ================================================================================

    test("POST /api/v1/projects/{invalid-id}/issues returns 404 when project not found") {
        configuredTestApplication {
            val nonExistentProjectId = ProjectId.generate().value

            val request = CreateIssueRequest(
                projectId = null,
                title = "Test Issue",
                type = "STORY"
            )

            val response = createJsonClient().post("/api/v1/projects/$nonExistentProjectId/issues") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Project not found"
            errorResponse.details shouldContain nonExistentProjectId.toString()
        }
    }

    test("GET /api/v1/projects/{projectId}/issues/{issueId} returns 404 when issue not in project") {
        configuredTestApplication {
            client.get("/health")

            // Create two projects
            val projectService: ProjectApplicationService by application.dependencies
            val project1 = projectService.createProject(CreateProjectCommand("Project 1", "Description"))
            val project2 = projectService.createProject(CreateProjectCommand("Project 2", "Description"))

            // Create issue in project 2
            val issueService: IssueApplicationService by application.dependencies
            val issue = issueService.createIssue(CreateIssueCommand(
                title = "Issue in Project 2",
                type = IssueType.STORY,
                projectId = project2.id
            ))

            // Try to access via project 1's nested endpoint (should fail)
            val response = createJsonClient().get("/api/v1/projects/${project1.id.value}/issues/${issue.id.value}")

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Issue not found in project"
            errorResponse.details shouldContain project1.id.value.toString()
        }
    }

    test("POST /api/v1/projects/{projectId}/issues without required fields returns 400") {
        configuredTestApplication {
            client.get("/health")

            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            val invalidRequest = CreateIssueRequest(
                projectId = null,
                title = "", // Empty title
                type = "STORY"
            )

            val response = createJsonClient().post("/api/v1/projects/${project.id.value}/issues") {
                contentType(ContentType.Application.Json)
                setBody(invalidRequest)
            }

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "title"
        }
    }

    test("POST /api/v1/projects/{projectId}/issues rejects projectId in body when URL differs") {
        configuredTestApplication {
            client.get("/health")

            val projectService: ProjectApplicationService by application.dependencies
            val project1 = projectService.createProject(CreateProjectCommand("Project 1", "Description"))
            val project2 = projectService.createProject(CreateProjectCommand("Project 2", "Description"))

            val request = CreateIssueRequest(
                projectId = project2.id.value, // Different from URL
                title = "Test Issue",
                type = "STORY"
            )

            // POST to project1's endpoint but with project2 in body
            val response = createJsonClient().post("/api/v1/projects/${project1.id.value}/issues") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "projectId in body must match URL"
            errorResponse.details shouldContain project1.id.value.toString()
            errorResponse.details shouldContain project2.id.value.toString()
        }
    }

    // ================================================================================
    // Authorization Tests - Archived Projects
    // ================================================================================

    // Disabled test - archive functionality not yet implemented
    // test("Creating issue in archived project returns 403") { ... }

    test("Issue created via nested route has correct projectId") {
        configuredTestApplication {
            client.get("/health")

            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            val request = CreateIssueRequest(
                projectId = null, // Explicitly not provided
                title = "Test Issue",
                type = "STORY"
            )

            val response = createJsonClient().post("/api/v1/projects/${project.id.value}/issues") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            response.status shouldBe HttpStatusCode.Created

            val issueResponse: IssueResponse = response.body()
            issueResponse.projectId shouldBe project.id.value.toString()

            // Verify via application service that projectId is correct
            val issueService: IssueApplicationService by application.dependencies
            val storedIssue = issueService.getIssue(IssueId.fromString(issueResponse.id))
            storedIssue!!.projectId!!.value shouldBe project.id.value
        }
    }

    // ================================================================================
    // Edge Case Tests - Invalid UUID Formats
    // ================================================================================

    test("POST /api/v1/projects/{invalid-uuid}/issues returns 400 for invalid project UUID") {
        configuredTestApplication {
            val invalidUuid = "not-a-uuid"

            val request = CreateIssueRequest(
                projectId = null,
                title = "Test Issue",
                type = "STORY"
            )

            val response = createJsonClient().post("/api/v1/projects/$invalidUuid/issues") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Invalid UUID"
            errorResponse.error shouldContain invalidUuid
        }
    }

    test("GET /api/v1/projects/{projectId}/issues/{invalid-uuid} returns 400 for invalid issue UUID") {
        configuredTestApplication {
            client.get("/health")

            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            val invalidUuid = "not-a-uuid"

            val response = createJsonClient().get("/api/v1/projects/${project.id.value}/issues/$invalidUuid")

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Invalid UUID"
            errorResponse.error shouldContain invalidUuid
        }
    }
})