package io.spiralhouse.cycletime.integration.api

import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
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
import io.spiralhouse.cycletime.application.commands.CreateWorkflowCommand
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.WorkflowApplicationService
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
 * TDD RED Phase Tests for Legacy Endpoint Removal (SPI-634 Anti-Pattern #2)
 *
 * ## Anti-Pattern Being Fixed
 *
 * **OLD**: Mixed versioning with `/api/issues`, `/api/projects`, `/api/workflows`
 * **NEW**: Consistent versioning under `/api/v1/` namespace exclusively
 *
 * ## Expected Behavior
 *
 * These tests verify that all legacy (non-versioned) endpoints return 404 after the migration
 * to the versioned API. This ensures clients migrate to the new `/api/v1/` endpoints.
 *
 * ### Endpoints to Remove
 * - `/api/issues` → Use `/api/v1/projects/{projectId}/issues`
 * - `/api/issues/{id}` → Use `/api/v1/issues/{id}` or nested route
 * - `/api/projects` → Use `/api/v1/projects`
 * - `/api/workflows` → Use `/api/v1/workflows`
 * - `/api/workflows/{template}` → Use `/api/v1/workflows?template={template}`
 *
 * ### Rationale
 * - Consistent API versioning strategy
 * - Clear migration path for clients
 * - Easier to maintain and deprecate old versions
 * - Industry best practice for REST APIs
 *
 * ## Why This Will FAIL Initially
 *
 * 1. Legacy routes still exist and return 200/201 responses
 * 2. No redirect logic to new endpoints
 * 3. No deprecation warnings in responses
 * 4. Routes are still configured in ApiConfiguration
 *
 * @see ApiConfiguration.kt for route registration (GREEN phase)
 */
class LegacyEndpointRemovalTest : FunSpec({

    val logger = LoggerFactory.getLogger(LegacyEndpointRemovalTest::class.java)

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
            testName = "legacy_endpoint_removal_test",
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
    // Legacy Issue Endpoints - Should Return 404
    // ================================================================================

    test("POST /api/issues returns 404 after removal") {
        configuredTestApplication {
            client.get("/health")

            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            val request = CreateIssueRequest(
                projectId = project.id.value,
                title = "Test Issue",
                type = "STORY"
            )

            // This test will FAIL until legacy route is removed
            val response = createJsonClient().post("/api/issues") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
            errorResponse.details shouldContain "/api/v1/projects/{projectId}/issues"
        }
    }

    test("GET /api/issues/{id} returns 404 after removal") {
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

            // This test will FAIL until legacy route is removed
            val response = createJsonClient().get("/api/issues/${issue.id.value}")

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
            errorResponse.details shouldContain "/api/v1/issues"
        }
    }

    test("PUT /api/issues/{id} returns 404 after removal") {
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

            val updateRequest = UpdateIssueRequest(
                title = "Updated Title"
            )

            // This test will FAIL until legacy route is removed
            val response = createJsonClient().put("/api/issues/${issue.id.value}") {
                contentType(ContentType.Application.Json)
                setBody(updateRequest)
            }

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
        }
    }

    test("DELETE /api/issues/{id} returns 404 after removal") {
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

            // This test will FAIL until legacy route is removed
            val response = createJsonClient().delete("/api/issues/${issue.id.value}")

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
        }
    }

    test("POST /api/issues/{id}/status returns 404 after removal") {
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

            val statusRequest = StatusTransitionRequest(
                status = "IN_PROGRESS"
            )

            // This test will FAIL until legacy route is removed
            val response = createJsonClient().post("/api/issues/${issue.id.value}/status") {
                contentType(ContentType.Application.Json)
                setBody(statusRequest)
            }

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
            errorResponse.details shouldContain "/api/v1/issues"
        }
    }

    // ================================================================================
    // Legacy Project Endpoints - Should Return 404
    // ================================================================================

    test("POST /api/projects returns 404 (use /api/v1/projects)") {
        configuredTestApplication {
            val request = CreateProjectRequest(
                name = "Test Project",
                description = "Description"
            )

            // This test will FAIL until legacy route is removed
            val response = createJsonClient().post("/api/projects") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
            errorResponse.details shouldContain "/api/v1/projects"
        }
    }

    test("GET /api/projects returns 404 (use /api/v1/projects)") {
        configuredTestApplication {
            // This test will FAIL until legacy route is removed
            val response = createJsonClient().get("/api/projects")

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
            errorResponse.details shouldContain "/api/v1/projects"
        }
    }

    test("GET /api/projects/{id} returns 404 (use /api/v1/projects/{id})") {
        configuredTestApplication {
            client.get("/health")

            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            // This test will FAIL until legacy route is removed
            val response = createJsonClient().get("/api/projects/${project.id.value}")

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
            errorResponse.details shouldContain "/api/v1/projects"
        }
    }

    test("PUT /api/projects/{id} returns 404 (use /api/v1/projects/{id})") {
        configuredTestApplication {
            client.get("/health")

            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            val updateRequest = UpdateProjectRequest(
                name = "Updated Name"
            )

            // This test will FAIL until legacy route is removed
            val response = createJsonClient().put("/api/projects/${project.id.value}") {
                contentType(ContentType.Application.Json)
                setBody(updateRequest)
            }

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
        }
    }

    test("DELETE /api/projects/{id} returns 404 (use /api/v1/projects/{id})") {
        configuredTestApplication {
            client.get("/health")

            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            // This test will FAIL until legacy route is removed
            val response = createJsonClient().delete("/api/projects/${project.id.value}")

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
        }
    }

    // ================================================================================
    // Legacy Workflow Endpoints - Should Return 404
    // ================================================================================

    test("POST /api/workflows returns 404 (use /api/v1/workflows)") {
        configuredTestApplication {
            val request = CreateWorkflowRequest(
                name = "Test Workflow",
                description = "Description",
                initialStatus = "TODO",
                allowedStatuses = listOf("TODO", "DONE")
            )

            // This test will FAIL until legacy route is removed
            val response = createJsonClient().post("/api/workflows") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
            errorResponse.details shouldContain "/api/v1/workflows"
        }
    }

    test("GET /api/workflows returns 404 (use /api/v1/workflows)") {
        configuredTestApplication {
            // This test will FAIL until legacy route is removed
            val response = createJsonClient().get("/api/workflows")

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
            errorResponse.details shouldContain "/api/v1/workflows"
        }
    }

    test("GET /api/workflows/{id} returns 404 (use /api/v1/workflows/{id})") {
        configuredTestApplication {
            client.get("/health")

            val workflowService: WorkflowApplicationService by application.dependencies
            val workflow = workflowService.createWorkflow(CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            ))

            // This test will FAIL until legacy route is removed
            val response = createJsonClient().get("/api/workflows/${workflow.id}")

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
            errorResponse.details shouldContain "/api/v1/workflows"
        }
    }

    test("PUT /api/workflows/{id} returns 404 (use /api/v1/workflows/{id})") {
        configuredTestApplication {
            client.get("/health")

            val workflowService: WorkflowApplicationService by application.dependencies
            val workflow = workflowService.createWorkflow(CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            ))

            val updateRequest = UpdateWorkflowRequest(
                name = "Updated Name"
            )

            // This test will FAIL until legacy route is removed
            val response = createJsonClient().put("/api/workflows/${workflow.id}") {
                contentType(ContentType.Application.Json)
                setBody(updateRequest)
            }

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
        }
    }

    test("DELETE /api/workflows/{id} returns 404 (use /api/v1/workflows/{id})") {
        configuredTestApplication {
            client.get("/health")

            val workflowService: WorkflowApplicationService by application.dependencies
            val workflow = workflowService.createWorkflow(CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            ))

            // This test will FAIL until legacy route is removed
            val response = createJsonClient().delete("/api/workflows/${workflow.id}")

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
        }
    }

    // ================================================================================
    // Legacy Template Workflow Endpoints - Should Return 404
    // ================================================================================

    test("POST /api/workflows/default returns 404 (use query parameter)") {
        configuredTestApplication {
            // This test will FAIL until legacy route is removed
            val response = createJsonClient().post("/api/workflows/default")

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
            errorResponse.details shouldContain "/api/v1/workflows?template=default"
        }
    }

    test("POST /api/workflows/bug returns 404 (use query parameter)") {
        configuredTestApplication {
            // This test will FAIL until legacy route is removed
            val response = createJsonClient().post("/api/workflows/bug")

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
            errorResponse.details shouldContain "/api/v1/workflows?template=bug"
        }
    }

    test("POST /api/workflows/feature returns 404 (use query parameter)") {
        configuredTestApplication {
            // This test will FAIL until legacy route is removed
            val response = createJsonClient().post("/api/workflows/feature")

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
            errorResponse.details shouldContain "/api/v1/workflows?template=feature"
        }
    }

    // ================================================================================
    // Verify v1 Endpoints Still Work
    // ================================================================================

    test("Versioned endpoints at /api/v1/ continue to work") {
        configuredTestApplication {
            client.get("/health")

            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            // Verify v1 project endpoint works
            val projectResponse = createJsonClient().get("/api/v1/projects/${project.id.value}")
            projectResponse.status shouldBe HttpStatusCode.OK

            // Verify v1 workflow endpoint works
            val workflowsResponse = createJsonClient().get("/api/v1/workflows")
            workflowsResponse.status shouldBe HttpStatusCode.OK
        }
    }
})