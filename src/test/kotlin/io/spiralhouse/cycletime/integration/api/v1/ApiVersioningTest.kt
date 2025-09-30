package io.spiralhouse.cycletime.integration.api.v1

import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation as ClientContentNegotiation
import io.ktor.client.request.*
import io.ktor.client.statement.*
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
 * TDD RED Phase Tests for API Versioning Consistency (SPI-634 Comprehensive)
 *
 * ## Expected Behavior
 *
 * These tests verify that all API endpoints are consistently organized under the `/api/v1/`
 * namespace, with proper versioning headers, documentation, and error responses.
 *
 * ### Versioning Requirements
 * - All endpoints must be under `/api/v1/` namespace
 * - All responses should include API version header
 * - Error responses should indicate the API version
 * - Documentation should reflect v1 endpoints only
 *
 * ### Coverage
 * - Project endpoints at `/api/v1/projects`
 * - Workflow endpoints at `/api/v1/workflows`
 * - Issue endpoints at `/api/v1/issues` and nested routes
 * - Transition endpoints at `/api/v1/workflows/{id}/transitions`
 *
 * ## Why This Will FAIL Initially
 *
 * 1. Not all endpoints have v1 versions
 * 2. API version headers not added to responses
 * 3. Some endpoints still at legacy `/api/` paths
 * 4. Inconsistent versioning across different resources
 *
 * @see ApiConfiguration.kt for route registration (GREEN phase)
 */
class ApiVersioningTest : FunSpec({

    val logger = LoggerFactory.getLogger(ApiVersioningTest::class.java)

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
            testName = "api_versioning_test",
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
    // Project Endpoints - Versioning Verification
    // ================================================================================

    test("All project endpoints respond under /api/v1/ namespace") {
        configuredTestApplication {
            client.get("/health")

            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            // GET /api/v1/projects
            val listResponse = createJsonClient().get("/api/v1/projects")
            listResponse.status shouldBe HttpStatusCode.OK

            // GET /api/v1/projects/{id}
            val getResponse = createJsonClient().get("/api/v1/projects/${project.id.value}")
            getResponse.status shouldBe HttpStatusCode.OK

            // PUT /api/v1/projects/{id}
            val updateResponse = createJsonClient().put("/api/v1/projects/${project.id.value}") {
                contentType(ContentType.Application.Json)
                setBody(UpdateProjectRequest(name = "Updated"))
            }
            updateResponse.status shouldBe HttpStatusCode.OK

            // POST /api/v1/projects
            val createResponse = createJsonClient().post("/api/v1/projects") {
                contentType(ContentType.Application.Json)
                setBody(CreateProjectRequest(name = "New Project", description = "Description"))
            }
            createResponse.status shouldBe HttpStatusCode.Created
        }
    }

    test("Project endpoints return API version header") {
        configuredTestApplication {
            val response = createJsonClient().get("/api/v1/projects")

            response.status shouldBe HttpStatusCode.OK
            response.headers["X-API-Version"] shouldBe "v1"
        }
    }

    // ================================================================================
    // Workflow Endpoints - Versioning Verification
    // ================================================================================

    test("All workflow endpoints respond under /api/v1/ namespace") {
        configuredTestApplication {
            // GET /api/v1/workflows
            val listResponse = createJsonClient().get("/api/v1/workflows")
            listResponse.status shouldBe HttpStatusCode.OK

            // POST /api/v1/workflows
            val createResponse = createJsonClient().post("/api/v1/workflows") {
                contentType(ContentType.Application.Json)
                setBody(CreateWorkflowRequest(
                    name = "Test Workflow",
                    description = "Description",
                    initialStatus = "TODO",
                    allowedStatuses = listOf("TODO", "DONE")
                ))
            }
            createResponse.status shouldBe HttpStatusCode.Created

            val createdWorkflow: WorkflowResponse = createResponse.body()

            // GET /api/v1/workflows/{id}
            val getResponse = createJsonClient().get("/api/v1/workflows/${createdWorkflow.id}")
            getResponse.status shouldBe HttpStatusCode.OK

            // PUT /api/v1/workflows/{id}
            val updateResponse = createJsonClient().put("/api/v1/workflows/${createdWorkflow.id}") {
                contentType(ContentType.Application.Json)
                setBody(UpdateWorkflowRequest(name = "Updated"))
            }
            updateResponse.status shouldBe HttpStatusCode.OK
        }
    }

    test("Workflow endpoints return API version header") {
        configuredTestApplication {
            val response = createJsonClient().get("/api/v1/workflows")

            response.status shouldBe HttpStatusCode.OK
            response.headers["X-API-Version"] shouldBe "v1"
        }
    }

    test("Workflow template endpoints use v1 namespace with query parameters") {
        configuredTestApplication {
            // POST /api/v1/workflows?template=default
            val defaultResponse = createJsonClient().post("/api/v1/workflows?template=default")
            defaultResponse.status shouldBe HttpStatusCode.Created

            // POST /api/v1/workflows?template=bug
            val bugResponse = createJsonClient().post("/api/v1/workflows?template=bug")
            bugResponse.status shouldBe HttpStatusCode.Created

            // POST /api/v1/workflows?template=feature
            val featureResponse = createJsonClient().post("/api/v1/workflows?template=feature")
            featureResponse.status shouldBe HttpStatusCode.Created
        }
    }

    test("Workflow transition endpoints use v1 namespace with resource-based URLs") {
        configuredTestApplication {
            val createResponse = createJsonClient().post("/api/v1/workflows") {
                contentType(ContentType.Application.Json)
                setBody(CreateWorkflowRequest(
                    name = "Test Workflow",
                    description = "Description",
                    initialStatus = "TODO",
                    allowedStatuses = listOf("TODO", "IN_PROGRESS", "DONE")
                ))
            }
            val workflow: WorkflowResponse = createResponse.body()

            // GET /api/v1/workflows/{id}/transitions
            val transitionsResponse = createJsonClient().get("/api/v1/workflows/${workflow.id}/transitions")
            transitionsResponse.status shouldBe HttpStatusCode.OK

            // POST /api/v1/workflows/{id}/transitions/validation
            val validationResponse = createJsonClient().post("/api/v1/workflows/${workflow.id}/transitions/validation") {
                contentType(ContentType.Application.Json)
                setBody(ValidateTransitionRequest(fromStatus = "TODO", toStatus = "IN_PROGRESS"))
            }
            validationResponse.status shouldBe HttpStatusCode.OK
        }
    }

    // ================================================================================
    // Issue Endpoints - Versioning Verification
    // ================================================================================

    test("All issue endpoints respond under /api/v1/ namespace") {
        configuredTestApplication {
            client.get("/health")

            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            // POST /api/v1/projects/{projectId}/issues
            val createResponse = createJsonClient().post("/api/v1/projects/${project.id.value}/issues") {
                contentType(ContentType.Application.Json)
                setBody(CreateIssueRequest(
                    projectId = null,
                    title = "Test Issue",
                    type = "STORY"
                ))
            }
            createResponse.status shouldBe HttpStatusCode.Created

            val createdIssue: IssueResponse = createResponse.body()

            // GET /api/v1/projects/{projectId}/issues
            val listResponse = createJsonClient().get("/api/v1/projects/${project.id.value}/issues")
            listResponse.status shouldBe HttpStatusCode.OK

            // GET /api/v1/projects/{projectId}/issues/{issueId}
            val getResponse = createJsonClient().get("/api/v1/projects/${project.id.value}/issues/${createdIssue.id}")
            getResponse.status shouldBe HttpStatusCode.OK

            // PUT /api/v1/projects/{projectId}/issues/{issueId}
            val updateResponse = createJsonClient().put("/api/v1/projects/${project.id.value}/issues/${createdIssue.id}") {
                contentType(ContentType.Application.Json)
                setBody(UpdateIssueRequest(title = "Updated"))
            }
            updateResponse.status shouldBe HttpStatusCode.OK
        }
    }

    test("Issue endpoints return API version header") {
        configuredTestApplication {
            client.get("/health")

            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            val response = createJsonClient().get("/api/v1/projects/${project.id.value}/issues")

            response.status shouldBe HttpStatusCode.OK
            response.headers["X-API-Version"] shouldBe "v1"
        }
    }

    test("Issue hierarchy endpoints use v1 namespace") {
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

            // GET /api/v1/projects/{projectId}/issues/{issueId}/hierarchy
            val response = createJsonClient().get("/api/v1/projects/${project.id.value}/issues/${issue.id.value}/hierarchy")

            response.status shouldBe HttpStatusCode.OK
        }
    }

    test("Issue status transition endpoints use v1 namespace") {
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

            // POST /api/v1/projects/{projectId}/issues/{issueId}/status
            val response = createJsonClient().post("/api/v1/projects/${project.id.value}/issues/${issue.id.value}/status") {
                contentType(ContentType.Application.Json)
                setBody(StatusTransitionRequest(status = "IN_PROGRESS"))
            }

            response.status shouldBe HttpStatusCode.OK
        }
    }

    // ================================================================================
    // Error Response Versioning
    // ================================================================================

    test("Error responses include API version header") {
        configuredTestApplication {
            val nonExistentId = ProjectId.generate().value

            val response = createJsonClient().get("/api/v1/projects/$nonExistentId")

            response.status shouldBe HttpStatusCode.NotFound
            response.headers["X-API-Version"] shouldBe "v1"

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldNotBe null
        }
    }

    test("Validation errors include API version context") {
        configuredTestApplication {
            client.get("/health")

            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            val invalidRequest = CreateIssueRequest(
                projectId = null,
                title = "", // Invalid
                type = "STORY"
            )

            val response = createJsonClient().post("/api/v1/projects/${project.id.value}/issues") {
                contentType(ContentType.Application.Json)
                setBody(invalidRequest)
            }

            response.status shouldBe HttpStatusCode.BadRequest
            response.headers["X-API-Version"] shouldBe "v1"
        }
    }

    // ================================================================================
    // Cross-Resource Consistency Tests
    // ================================================================================

    test("All v1 endpoints use consistent response format") {
        configuredTestApplication {
            client.get("/health")

            // Create resources
            val projectService: ProjectApplicationService by application.dependencies
            val project = projectService.createProject(CreateProjectCommand("Test Project", "Description"))

            // Test projects list
            val projectsResponse = createJsonClient().get("/api/v1/projects")
            projectsResponse.status shouldBe HttpStatusCode.OK
            projectsResponse.headers["Content-Type"] shouldContain "application/json"

            // Test workflows list
            val workflowsResponse = createJsonClient().get("/api/v1/workflows")
            workflowsResponse.status shouldBe HttpStatusCode.OK
            workflowsResponse.headers["Content-Type"] shouldContain "application/json"

            // Test issues list
            val issuesResponse = createJsonClient().get("/api/v1/projects/${project.id.value}/issues")
            issuesResponse.status shouldBe HttpStatusCode.OK
            issuesResponse.headers["Content-Type"] shouldContain "application/json"
        }
    }

    test("All v1 endpoints return consistent error format") {
        configuredTestApplication {
            val nonExistentId = ProjectId.generate().value

            // Test project error
            val projectError = createJsonClient().get("/api/v1/projects/$nonExistentId")
            projectError.status shouldBe HttpStatusCode.NotFound
            val projectErrorResponse: ErrorResponse = projectError.body()
            projectErrorResponse.error shouldNotBe null
            projectErrorResponse.timestamp shouldNotBe null

            // Test workflow error
            val workflowError = createJsonClient().get("/api/v1/workflows/$nonExistentId")
            workflowError.status shouldBe HttpStatusCode.NotFound
            val workflowErrorResponse: ErrorResponse = workflowError.body()
            workflowErrorResponse.error shouldNotBe null
            workflowErrorResponse.timestamp shouldNotBe null
        }
    }

    // ================================================================================
    // Version Header Tests
    // ================================================================================

    test("All successful responses include X-API-Version header") {
        configuredTestApplication {
            val endpoints = listOf(
                "/api/v1/projects",
                "/api/v1/workflows"
            )

            endpoints.forEach { endpoint ->
                val response = createJsonClient().get(endpoint)
                response.status shouldBe HttpStatusCode.OK
                response.headers["X-API-Version"] shouldBe "v1"
            }
        }
    }

    test("All error responses include X-API-Version header") {
        configuredTestApplication {
            val nonExistentId = ProjectId.generate().value

            val endpoints = listOf(
                "/api/v1/projects/$nonExistentId",
                "/api/v1/workflows/$nonExistentId"
            )

            endpoints.forEach { endpoint ->
                val response = createJsonClient().get(endpoint)
                response.status shouldBe HttpStatusCode.NotFound
                response.headers["X-API-Version"] shouldBe "v1"
            }
        }
    }

    // ================================================================================
    // Documentation and Discovery Tests
    // ================================================================================

    test("API root provides version information") {
        configuredTestApplication {
            val response = createJsonClient().get("/api/v1")

            response.status shouldBe HttpStatusCode.OK

            val apiInfo = response.bodyAsText()
            apiInfo shouldContain "v1"
            apiInfo shouldContain "CycleTime"
        }
    }

    test("OPTIONS requests return API version in headers") {
        configuredTestApplication {
            val response = client.options("/api/v1/projects")

            response.headers["X-API-Version"] shouldBe "v1"
        }
    }

    // ================================================================================
    // Negative Tests - Ensure No Unversioned Endpoints
    // ================================================================================

    test("Unversioned endpoints return 404 with migration guidance") {
        configuredTestApplication {
            val unversionedEndpoints = listOf(
                "/api/projects",
                "/api/workflows",
                "/api/issues"
            )

            unversionedEndpoints.forEach { endpoint ->
                val response = createJsonClient().get(endpoint)
                response.status shouldBe HttpStatusCode.NotFound

                val errorResponse: ErrorResponse = response.body()
                errorResponse.error shouldContain "endpoint not found"
                errorResponse.details shouldContain "/api/v1/"
            }
        }
    }
})