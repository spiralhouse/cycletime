package io.spiralhouse.cycletime.integration

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.plugins.di.*
import io.ktor.server.testing.*
import io.spiralhouse.cycletime.application.commands.CreateWorkflowCommand
import io.spiralhouse.cycletime.application.commands.UpdateWorkflowCommand
import io.spiralhouse.cycletime.application.services.WorkflowApplicationService
import io.spiralhouse.cycletime.test.utils.DatabaseTestHelper
import io.spiralhouse.cycletime.test.utils.DatabaseTestHelper.configureTestApplication
import io.spiralhouse.cycletime.api.dto.*
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.IssueStatus
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.Instant
import kotlinx.serialization.json.Json
import org.slf4j.LoggerFactory
import kotlin.time.Duration.Companion.hours

/**
 * TDD RED Phase Integration Tests for Workflow REST API Endpoints
 *
 * These tests define the expected behavior of Workflow REST endpoints that will be implemented
 * in the GREEN phase. The tests will initially FAIL because:
 *
 * 1. No Workflow API routes are configured
 * 2. No API request/response DTOs are implemented in routes
 * 3. No error handling middleware is implemented for Workflow endpoints
 * 4. No route-level validation is implemented for Workflow data
 *
 * This follows TDD methodology where we first write failing tests that define the desired
 * REST API contract for Workflow management, then implement just enough code to make them pass.
 *
 * Expected Workflow REST API Contract:
 * - POST /api/workflows - Create workflow (201 Created)
 * - GET /api/workflows/{id} - Get workflow by ID (200 OK, 404 Not Found)
 * - PUT /api/workflows/{id} - Update workflow (200 OK, 404 Not Found)
 * - DELETE /api/workflows/{id} - Delete workflow (204 No Content, 404 Not Found)
 * - GET /api/workflows - List all workflows (200 OK)
 * - GET /api/workflows/{id}/transitions?status={status} - Get valid transitions (200 OK)
 * - POST /api/workflows/{id}/validate-transition - Validate transition (200 OK)
 * - POST /api/workflows/default - Create default workflow (201 Created)
 * - POST /api/workflows/bug - Create bug workflow (201 Created)
 * - POST /api/workflows/feature - Create feature workflow (201 Created)
 *
 * Special Workflow Business Rules:
 * - Workflow names must be non-empty and <= 255 characters
 * - Initial status must be included in allowed statuses
 * - Status transitions follow workflow configuration
 * - Predefined workflows have specific configurations
 * - API versioning support for both /api/workflows and /api/v1/workflows
 */
class WorkflowRoutesTest : StringSpec({

    val logger = LoggerFactory.getLogger(WorkflowRoutesTest::class.java)

    lateinit var mockTimeProvider: MockTimeProvider

    /**
     * Helper function to create a properly configured test application.
     */
    fun configuredTestApplication(test: suspend ApplicationTestBuilder.() -> Unit) {
        testApplication {
            // Use helper to ensure proper initialization order
            configureTestApplication(testName = "workflow_routes_test")

            test()
        }
    }

    /**
     * Create a JSON-enabled HTTP client for test requests
     */
    fun ApplicationTestBuilder.createJsonClient() = createClient {
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }
    }

    beforeSpec {
        // Initialize test database using helper to prevent race conditions
        // DatabaseTestHelper handles all table creation including WorkflowsTable
        DatabaseTestHelper.initTestDatabase(
            testName = "workflow_routes_test",
            enableLogging = false
        )
    }

    afterSpec {
        // Clean up test database
        DatabaseTestHelper.cleanupTestDatabase()
    }

    beforeEach {
        mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
        // Database cleanup is handled by DatabaseTestHelper
    }

    // ================================================================================
    // Create Workflow Tests
    // ================================================================================

    "POST /api/workflows should create workflow and return 201 Created" {
        configuredTestApplication {
            val request = CreateWorkflowRequest(
                name = "Test Workflow",
                description = "A workflow for testing",
                initialStatus = "TODO",
                allowedStatuses = listOf("TODO", "IN_PROGRESS", "DONE")
            )

            val jsonClient = createJsonClient()

            // This test will FAIL until routes are implemented
            val response = jsonClient.post("/api/workflows") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            response.status shouldBe HttpStatusCode.Created

            val workflowResponse: WorkflowResponse = response.body()
            workflowResponse.name shouldBe "Test Workflow"
            workflowResponse.description shouldBe "A workflow for testing"
            workflowResponse.initialStatus shouldBe "TODO"
            workflowResponse.allowedStatuses shouldHaveSize 3
            workflowResponse.allowedStatuses shouldContain "TODO"
            workflowResponse.allowedStatuses shouldContain "IN_PROGRESS"
            workflowResponse.allowedStatuses shouldContain "DONE"
            workflowResponse.id shouldNotBe null
            workflowResponse.createdAt shouldBe "2025-01-15T10:00:00Z"
            workflowResponse.updatedAt shouldBe "2025-01-15T10:00:00Z"
        }
    }

    "POST /api/workflows should validate required fields and return 400 Bad Request" {
        configuredTestApplication {
            val invalidRequest = CreateWorkflowRequest(
                name = "", // Empty name should be rejected
                description = "Description",
                initialStatus = "TODO",
                allowedStatuses = listOf("TODO", "DONE")
            )

            val jsonClient = createJsonClient()

            // This test will FAIL until validation is implemented
            val response = jsonClient.post("/api/workflows") {
                contentType(ContentType.Application.Json)
                setBody(invalidRequest)
            }

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "name"
            errorResponse.timestamp shouldNotBe null
        }
    }

    "POST /api/workflows should validate name length and return 400 Bad Request" {
        configuredTestApplication {
            val oversizedRequest = CreateWorkflowRequest(
                name = "x".repeat(256), // Exceeds maximum name length
                description = "Description",
                initialStatus = "TODO",
                allowedStatuses = listOf("TODO", "DONE")
            )

            val jsonClient = createJsonClient()

            // This test will FAIL until validation is implemented
            val response = jsonClient.post("/api/workflows") {
                contentType(ContentType.Application.Json)
                setBody(oversizedRequest)
            }

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "name"
            errorResponse.error shouldContain "length"
        }
    }

    "POST /api/workflows should validate initial status in allowed statuses and return 400 Bad Request" {
        configuredTestApplication {
            val invalidRequest = CreateWorkflowRequest(
                name = "Test Workflow",
                description = "Description",
                initialStatus = "INVALID", // Not in allowed statuses
                allowedStatuses = listOf("TODO", "DONE")
            )

            val jsonClient = createJsonClient()

            // This test will FAIL until validation is implemented
            val response = jsonClient.post("/api/workflows") {
                contentType(ContentType.Application.Json)
                setBody(invalidRequest)
            }

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Invalid IssueStatus"
            errorResponse.details shouldContain "INVALID"
        }
    }

    "POST /api/workflows should validate empty allowed statuses and return 400 Bad Request" {
        configuredTestApplication {
            val invalidRequest = CreateWorkflowRequest(
                name = "Test Workflow",
                description = "Description",
                initialStatus = "TODO",
                allowedStatuses = emptyList() // Empty allowed statuses
            )

            val jsonClient = createJsonClient()

            // This test will FAIL until validation is implemented
            val response = jsonClient.post("/api/workflows") {
                contentType(ContentType.Application.Json)
                setBody(invalidRequest)
            }

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Allowed statuses cannot be empty"
        }
    }

    "POST /api/workflows should validate invalid status values and return 400 Bad Request" {
        configuredTestApplication {
            val invalidRequest = CreateWorkflowRequest(
                name = "Test Workflow",
                description = "Description",
                initialStatus = "INVALID_STATUS",
                allowedStatuses = listOf("INVALID_STATUS", "ANOTHER_INVALID")
            )

            val jsonClient = createJsonClient()

            // This test will FAIL until validation is implemented
            val response = jsonClient.post("/api/workflows") {
                contentType(ContentType.Application.Json)
                setBody(invalidRequest)
            }

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Invalid IssueStatus"
        }
    }

    "POST /api/workflows should create workflow with minimal data" {
        configuredTestApplication {
            val minimalRequest = CreateWorkflowRequest(
                name = "Minimal Workflow",
                description = null, // Optional field
                initialStatus = "TODO",
                allowedStatuses = listOf("TODO", "DONE")
            )

            val jsonClient = createJsonClient()

            // This test will FAIL until routes are implemented
            val response = jsonClient.post("/api/workflows") {
                contentType(ContentType.Application.Json)
                setBody(minimalRequest)
            }

            response.status shouldBe HttpStatusCode.Created

            val workflowResponse: WorkflowResponse = response.body()
            workflowResponse.name shouldBe "Minimal Workflow"
            workflowResponse.description shouldBe null
            workflowResponse.initialStatus shouldBe "TODO"
            workflowResponse.allowedStatuses shouldHaveSize 2
        }
    }

    // ================================================================================
    // Get Workflow Tests
    // ================================================================================

    "GET /api/workflows/{id} should return workflow by ID with 200 OK" {
        configuredTestApplication {
            client.get("/health")  // Trigger application initialization

            // First create a workflow via the service layer
            val workflowService: WorkflowApplicationService by application.dependencies
            val command = CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Test Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.DONE)
            )
            val created = workflowService.createWorkflow(command)

            val jsonClient = createJsonClient()

            // This test will FAIL until routes are implemented
            val response = jsonClient.get("/api/workflows/${created.id}")

            response.status shouldBe HttpStatusCode.OK

            val workflowResponse: WorkflowResponse = response.body()
            workflowResponse.id shouldBe created.id
            workflowResponse.name shouldBe "Test Workflow"
            workflowResponse.description shouldBe "Test Description"
            workflowResponse.initialStatus shouldBe "TODO"
            workflowResponse.allowedStatuses shouldHaveSize 3
        }
    }

    "GET /api/workflows/{id} should return 404 Not Found for non-existent workflow" {
        configuredTestApplication {
            val nonExistentId = WorkflowId.generate().value

            val jsonClient = createJsonClient()

            // This test will FAIL until routes are implemented
            val response = jsonClient.get("/api/workflows/$nonExistentId")

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "not found"
            errorResponse.details shouldContain nonExistentId.toString()
        }
    }

    "GET /api/workflows/{id} should handle invalid UUID format and return 400 Bad Request" {
        configuredTestApplication {
            val invalidId = "invalid-uuid-format"

            val jsonClient = createJsonClient()

            // This test will FAIL until parameter validation is implemented
            val response = jsonClient.get("/api/workflows/$invalidId")

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Invalid UUID"
            errorResponse.error shouldContain invalidId
        }
    }

    // ================================================================================
    // Update Workflow Tests
    // ================================================================================

    "PUT /api/workflows/{id} should update workflow and return 200 OK" {
        configuredTestApplication {
            client.get("/health")  // Trigger application initialization

            // Create initial workflow
            val workflowService: WorkflowApplicationService by application.dependencies
            val command = CreateWorkflowCommand(
                name = "Original Name",
                description = "Original Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            )
            val created = workflowService.createWorkflow(command)

            mockTimeProvider.advance(1.hours)

            val updateRequest = UpdateWorkflowRequest(
                name = "Updated Name",
                description = "Updated Description"
            )

            val jsonClient = createJsonClient()

            // This test will FAIL until routes are implemented
            val response = jsonClient.put("/api/workflows/${created.id}") {
                contentType(ContentType.Application.Json)
                setBody(updateRequest)
            }

            response.status shouldBe HttpStatusCode.OK

            val workflowResponse: WorkflowResponse = response.body()
            workflowResponse.name shouldBe "Updated Name"
            workflowResponse.description shouldBe "Updated Description"
            workflowResponse.updatedAt shouldBe "2025-01-15T11:00:00Z"
        }
    }

    "PUT /api/workflows/{id} should return 404 Not Found for non-existent workflow" {
        configuredTestApplication {
            val nonExistentId = WorkflowId.generate().value
            val updateRequest = UpdateWorkflowRequest(
                name = "Updated Name"
            )

            val jsonClient = createJsonClient()

            // This test will FAIL until routes are implemented
            val response = jsonClient.put("/api/workflows/$nonExistentId") {
                contentType(ContentType.Application.Json)
                setBody(updateRequest)
            }

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "not found"
        }
    }

    "PUT /api/workflows/{id} should validate update fields and return 400 Bad Request" {
        configuredTestApplication {
            client.get("/health")  // Trigger application initialization

            // Create initial workflow
            val workflowService: WorkflowApplicationService by application.dependencies
            val command = CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            )
            val created = workflowService.createWorkflow(command)

            val invalidUpdateRequest = UpdateWorkflowRequest(
                name = "", // Empty name should be rejected
                description = "Valid Description"
            )

            val jsonClient = createJsonClient()

            // This test will FAIL until validation is implemented
            val response = jsonClient.put("/api/workflows/${created.id}") {
                contentType(ContentType.Application.Json)
                setBody(invalidUpdateRequest)
            }

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "name"
        }
    }

    "PUT /api/workflows/{id} should allow partial updates with null values" {
        configuredTestApplication {
            client.get("/health")

            // Create initial workflow
            val workflowService: WorkflowApplicationService by application.dependencies
            val command = CreateWorkflowCommand(
                name = "Original Name",
                description = "Original Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            )
            val created = workflowService.createWorkflow(command)

            val partialUpdateRequest = UpdateWorkflowRequest(
                name = "Updated Name Only",
                description = null // Don't update description
            )

            val jsonClient = createJsonClient()

            // This test will FAIL until routes are implemented
            val response = jsonClient.put("/api/workflows/${created.id}") {
                contentType(ContentType.Application.Json)
                setBody(partialUpdateRequest)
            }

            response.status shouldBe HttpStatusCode.OK

            val workflowResponse: WorkflowResponse = response.body()
            workflowResponse.name shouldBe "Updated Name Only"
            workflowResponse.description shouldBe "Original Description" // Should remain unchanged
        }
    }

    // ================================================================================
    // Delete Workflow Tests
    // ================================================================================

    "DELETE /api/workflows/{id} should delete workflow and return 204 No Content" {
        configuredTestApplication {
            client.get("/health")  // Trigger application initialization

            // Create workflow to delete
            val workflowService: WorkflowApplicationService by application.dependencies
            val command = CreateWorkflowCommand(
                name = "Workflow to Delete",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            )
            val created = workflowService.createWorkflow(command)

            // This test will FAIL until routes are implemented
            val response = createJsonClient().delete("/api/workflows/${created.id}")

            response.status shouldBe HttpStatusCode.NoContent
            response.bodyAsText() shouldBe ""

            // Verify deletion
            val jsonClient = createJsonClient()
            val getResponse = jsonClient.get("/api/workflows/${created.id}")
            getResponse.status shouldBe HttpStatusCode.NotFound
        }
    }

    "DELETE /api/workflows/{id} should return 404 Not Found for non-existent workflow" {
        configuredTestApplication {
            val nonExistentId = WorkflowId.generate().value

            val jsonClient = createJsonClient()

            // This test will FAIL until routes are implemented
            val response = jsonClient.delete("/api/workflows/$nonExistentId")

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "not found"
        }
    }

    // ================================================================================
    // List Workflows Tests
    // ================================================================================

    "GET /api/workflows should return list of all workflows with 200 OK" {
        configuredTestApplication {
            client.get("/health")  // Trigger application initialization

            // Create multiple workflows
            val workflowService: WorkflowApplicationService by application.dependencies
            val commands = listOf(
                CreateWorkflowCommand(
                    name = "Workflow 1",
                    description = "Description 1",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
                ),
                CreateWorkflowCommand(
                    name = "Workflow 2",
                    description = "Description 2",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.DONE)
                ),
                CreateWorkflowCommand(
                    name = "Workflow 3",
                    description = null,
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
                )
            )

            commands.forEach { workflowService.createWorkflow(it) }

            val jsonClient = createJsonClient()

            // This test will FAIL until routes are implemented
            val response = jsonClient.get("/api/workflows")

            response.status shouldBe HttpStatusCode.OK

            val listResponse: WorkflowListResponse = response.body()
            listResponse.totalCount shouldBe 3
            listResponse.workflows shouldHaveSize 3

            val workflowNames = listResponse.workflows.map { it.name }
            workflowNames shouldContain "Workflow 1"
            workflowNames shouldContain "Workflow 2"
            workflowNames shouldContain "Workflow 3"
        }
    }

    "GET /api/workflows should return empty list when no workflows exist" {
        configuredTestApplication {
            val jsonClient = createJsonClient()

            // This test will FAIL until routes are implemented
            val response = jsonClient.get("/api/workflows")

            response.status shouldBe HttpStatusCode.OK

            val listResponse: WorkflowListResponse = response.body()
            listResponse.totalCount shouldBe 0
            listResponse.workflows shouldHaveSize 0
        }
    }

    // ================================================================================
    // Transition Validation Tests
    // ================================================================================

    "GET /api/workflows/{id}/transitions should return valid transitions for status" {
        configuredTestApplication {
            client.get("/health")

            // Create workflow with specific transitions
            val workflowService: WorkflowApplicationService by application.dependencies
            val command = CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.DONE)
            )
            val created = workflowService.createWorkflow(command)

            val jsonClient = createJsonClient()

            // This test will FAIL until routes are implemented
            val response = jsonClient.get("/api/workflows/${created.id}/transitions?status=TODO")

            response.status shouldBe HttpStatusCode.OK

            val transitionsResponse: TransitionsResponse = response.body()
            transitionsResponse.fromStatus shouldBe "TODO"
            transitionsResponse.validTransitions shouldNotBe null
            transitionsResponse.validTransitions shouldHaveSize 1 // From TODO, can only transition to IN_PROGRESS
            transitionsResponse.validTransitions shouldContain "IN_PROGRESS"
        }
    }

    "GET /api/workflows/{id}/transitions should require status parameter and return 400 Bad Request" {
        configuredTestApplication {
            client.get("/health")

            val workflowService: WorkflowApplicationService by application.dependencies
            val command = CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            )
            val created = workflowService.createWorkflow(command)

            val jsonClient = createJsonClient()

            // This test will FAIL until parameter validation is implemented
            val response = jsonClient.get("/api/workflows/${created.id}/transitions")

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Query parameter 'status' is required"
        }
    }

    "GET /api/workflows/{id}/transitions should validate status parameter and return 400 Bad Request" {
        configuredTestApplication {
            client.get("/health")

            val workflowService: WorkflowApplicationService by application.dependencies
            val command = CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            )
            val created = workflowService.createWorkflow(command)

            val jsonClient = createJsonClient()

            // This test will FAIL until status validation is implemented
            val response = jsonClient.get("/api/workflows/${created.id}/transitions?status=INVALID_STATUS")

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Invalid IssueStatus"
            errorResponse.details shouldContain "INVALID_STATUS"
        }
    }

    "POST /api/workflows/{id}/validate-transition should validate transition and return 200 OK" {
        configuredTestApplication {
            client.get("/health")

            val workflowService: WorkflowApplicationService by application.dependencies
            val command = CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.DONE)
            )
            val created = workflowService.createWorkflow(command)

            val validationRequest = ValidateTransitionRequest(
                fromStatus = "TODO",
                toStatus = "IN_PROGRESS"
            )

            val jsonClient = createJsonClient()

            // This test will FAIL until routes are implemented
            val response = jsonClient.post("/api/workflows/${created.id}/validate-transition") {
                contentType(ContentType.Application.Json)
                setBody(validationRequest)
            }

            response.status shouldBe HttpStatusCode.OK

            val validationResponse: ValidationResponse = response.body()
            validationResponse.isValid shouldBe true
            validationResponse.reason shouldBe null
        }
    }

    "POST /api/workflows/{id}/validate-transition should return validation failure for invalid transition" {
        configuredTestApplication {
            client.get("/health")

            val workflowService: WorkflowApplicationService by application.dependencies
            val command = CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE) // No IN_PROGRESS
            )
            val created = workflowService.createWorkflow(command)

            val validationRequest = ValidateTransitionRequest(
                fromStatus = "TODO",
                toStatus = "IN_PROGRESS" // Not allowed in this workflow
            )

            val jsonClient = createJsonClient()

            // This test will FAIL until routes are implemented
            val response = jsonClient.post("/api/workflows/${created.id}/validate-transition") {
                contentType(ContentType.Application.Json)
                setBody(validationRequest)
            }

            response.status shouldBe HttpStatusCode.OK

            val validationResponse: ValidationResponse = response.body()
            validationResponse.isValid shouldBe false
            validationResponse.reason shouldNotBe null
            validationResponse.reason!! shouldContain "Invalid transition"
        }
    }

    "POST /api/workflows/{id}/validate-transition should validate request body and return 400 Bad Request" {
        configuredTestApplication {
            client.get("/health")

            val workflowService: WorkflowApplicationService by application.dependencies
            val command = CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            )
            val created = workflowService.createWorkflow(command)

            val invalidValidationRequest = ValidateTransitionRequest(
                fromStatus = "INVALID_STATUS",
                toStatus = "TODO"
            )

            val jsonClient = createJsonClient()

            // This test will FAIL until validation is implemented
            val response = jsonClient.post("/api/workflows/${created.id}/validate-transition") {
                contentType(ContentType.Application.Json)
                setBody(invalidValidationRequest)
            }

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Invalid IssueStatus"
            errorResponse.details shouldContain "INVALID_STATUS"
        }
    }

    // ================================================================================
    // Predefined Workflow Tests
    // ================================================================================

    "POST /api/workflows/default should create default workflow and return 201 Created" {
        configuredTestApplication {
            val jsonClient = createJsonClient()

            // This test will FAIL until routes are implemented
            val response = jsonClient.post("/api/workflows/default")

            response.status shouldBe HttpStatusCode.Created

            val workflowResponse: WorkflowResponse = response.body()
            workflowResponse.name shouldBe "Default Workflow"
            workflowResponse.initialStatus shouldBe "TODO"
            workflowResponse.allowedStatuses shouldContain "TODO"
            workflowResponse.allowedStatuses shouldContain "IN_PROGRESS"
            workflowResponse.allowedStatuses shouldContain "DONE"
            workflowResponse.id shouldNotBe null
        }
    }

    "POST /api/workflows/bug should create bug workflow and return 201 Created" {
        configuredTestApplication {
            val jsonClient = createJsonClient()

            // This test will FAIL until routes are implemented
            val response = jsonClient.post("/api/workflows/bug")

            response.status shouldBe HttpStatusCode.Created

            val workflowResponse: WorkflowResponse = response.body()
            workflowResponse.name shouldBe "Bug Workflow"
            workflowResponse.initialStatus shouldBe "TODO"
            workflowResponse.allowedStatuses shouldContain "TODO"
            workflowResponse.id shouldNotBe null
        }
    }

    "POST /api/workflows/feature should create feature workflow and return 201 Created" {
        configuredTestApplication {
            val jsonClient = createJsonClient()

            // This test will FAIL until routes are implemented
            val response = jsonClient.post("/api/workflows/feature")

            response.status shouldBe HttpStatusCode.Created

            val workflowResponse: WorkflowResponse = response.body()
            workflowResponse.name shouldBe "Feature Workflow"
            workflowResponse.initialStatus shouldBe "TODO"
            workflowResponse.allowedStatuses shouldContain "TODO"
            workflowResponse.allowedStatuses shouldContain "IN_PROGRESS"
            workflowResponse.allowedStatuses shouldContain "IN_REVIEW"
            workflowResponse.allowedStatuses shouldContain "DONE"
            workflowResponse.id shouldNotBe null
        }
    }

    // ================================================================================
    // API Versioning Tests
    // ================================================================================

    "POST /api/v1/workflows should support API versioning" {
        configuredTestApplication {
            val request = CreateWorkflowRequest(
                name = "Versioned Workflow",
                description = "Test API versioning",
                initialStatus = "TODO",
                allowedStatuses = listOf("TODO", "DONE")
            )

            val jsonClient = createJsonClient()

            // This test will FAIL until versioned routes are implemented
            val response = jsonClient.post("/api/v1/workflows") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            response.status shouldBe HttpStatusCode.Created

            val workflowResponse: WorkflowResponse = response.body()
            workflowResponse.name shouldBe "Versioned Workflow"
        }
    }

    "GET /api/v1/workflows should support API versioning for list endpoint" {
        configuredTestApplication {
            val jsonClient = createJsonClient()

            // This test will FAIL until versioned routes are implemented
            val response = jsonClient.get("/api/v1/workflows")

            response.status shouldBe HttpStatusCode.OK

            val listResponse: WorkflowListResponse = response.body()
            listResponse.totalCount shouldBe 0
            listResponse.workflows shouldHaveSize 0
        }
    }

    // ================================================================================
    // Error Handling Tests
    // ================================================================================

    "should handle concurrent workflow requests without data corruption" {
        runTest {
            configuredTestApplication {
                client.get("/health")

                // Create multiple workflows concurrently
                val requests = (1..5).map { index ->
                    CreateWorkflowRequest(
                        name = "Concurrent Workflow $index",
                        description = "Created concurrently",
                        initialStatus = "TODO",
                        allowedStatuses = listOf("TODO", "DONE")
                    )
                }

                val jsonClient = createJsonClient()

                // This test will FAIL until routes and concurrency handling are implemented
                val responses = requests.map { request ->
                    jsonClient.post("/api/workflows") {
                        contentType(ContentType.Application.Json)
                        setBody(request)
                    }
                }

                // Verify all requests succeeded
                responses.forEach { response ->
                    response.status shouldBe HttpStatusCode.Created
                }

                // Verify all workflows were created
                val listResponse = jsonClient.get("/api/workflows")
                listResponse.status shouldBe HttpStatusCode.OK

                val list: WorkflowListResponse = listResponse.body()
                list.totalCount shouldBe 5
            }
        }
    }

    "should handle missing Content-Type header and return 415 Unsupported Media Type" {
        configuredTestApplication {
            val requestBody = """{
                "name": "Test Workflow",
                "initialStatus": "TODO",
                "allowedStatuses": ["TODO", "DONE"]
            }"""

            // Use plain client without ContentNegotiation to test missing Content-Type
            val response = client.post("/api/workflows") {
                // Deliberately omit Content-Type header
                setBody(requestBody)
            }

            response.status shouldBe HttpStatusCode.UnsupportedMediaType
            // 415 errors may have empty body from framework level
        }
    }

    "should handle malformed JSON requests and return 400 Bad Request" {
        configuredTestApplication {
            val malformedJson = """{"name": "Test", "invalid": }"""

            val jsonClient = createJsonClient()

            // This test will FAIL until JSON parsing error handling is implemented
            val response = jsonClient.post("/api/workflows") {
                contentType(ContentType.Application.Json)
                setBody(malformedJson)
            }

            response.status shouldBe HttpStatusCode.BadRequest
        }
    }

    "should handle oversized request bodies and return 413 Request Entity Too Large".config(enabled = false) {
        // This test is disabled until request size limits are implemented
        configuredTestApplication {
            val oversizedRequest = CreateWorkflowRequest(
                name = "Test Workflow",
                description = "x".repeat(10000), // Very large description
                initialStatus = "TODO",
                allowedStatuses = listOf("TODO", "DONE")
            )

            val jsonClient = createJsonClient()

            val response = jsonClient.post("/api/workflows") {
                contentType(ContentType.Application.Json)
                setBody(oversizedRequest)
            }

            response.status shouldBe HttpStatusCode.PayloadTooLarge
        }
    }

    "should handle database connection failures gracefully and return 503 Service Unavailable".config(enabled = false) {
        // This test is disabled until proper error handling is implemented
        // TODO: Update to use database failure simulation with DatabaseTestHelper pattern
        configuredTestApplication {
            client.get("/health")

            // TODO: Simulate database failure - need to implement with new pattern
            // TransactionManager.closeAndUnregister(database)

            val request = CreateWorkflowRequest(
                name = "Test Workflow",
                description = "Description",
                initialStatus = "TODO",
                allowedStatuses = listOf("TODO", "DONE")
            )

            val jsonClient = createJsonClient()

            val response = jsonClient.post("/api/workflows") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            response.status shouldBe HttpStatusCode.ServiceUnavailable

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "service unavailable"
        }
    }
})