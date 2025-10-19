package io.spiralhouse.cycletime.integration.api.v1

import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.collections.shouldContain
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
import io.spiralhouse.cycletime.application.commands.CreateWorkflowCommand
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
 * TDD RED Phase Tests for Resource-Based Transition URLs (SPI-634 Anti-Pattern #4)
 *
 * ## Anti-Pattern Being Fixed
 *
 * **OLD**: `POST /api/workflows/{id}/validate-transition` (action-based URL)
 * **NEW**: `POST /api/v1/workflows/{id}/transitions/validation` (resource-based URL)
 *
 * ## Expected Behavior
 *
 * These tests verify that workflow transition operations follow RESTful resource-based URL
 * patterns instead of action-based patterns. This makes the API more consistent and predictable.
 *
 * ### New Resource-Based Endpoints
 * - `GET /api/v1/workflows/{id}/transitions` - List all valid transitions
 * - `POST /api/v1/workflows/{id}/transitions/validation` - Validate a specific transition
 *
 * ### Benefits of Resource-Based Approach
 * - URLs represent resources, not actions
 * - More consistent with REST principles
 * - Easier to understand resource hierarchy
 * - Better aligns with HTTP verb semantics
 *
 * ## Why This Will FAIL Initially
 *
 * 1. Routes use old pattern `/validate-transition` instead of `/transitions/validation`
 * 2. No `/transitions` collection endpoint exists
 * 3. Transition validation logic not wired to new URL pattern
 * 4. Old endpoint still exists and works (backwards compat)
 *
 * @see WorkflowRoutes.kt for implementation (GREEN phase)
 */
class WorkflowTransitionTest : FunSpec({

    val logger = LoggerFactory.getLogger(WorkflowTransitionTest::class.java)

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
            testName = "workflow_transition_test",
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
    // Happy Path Tests - List All Transitions
    // ================================================================================

    test("GET /api/v1/workflows/{id}/transitions lists all valid transitions") {
        configuredTestApplication {
            client.get("/health")

            // Create workflow with standard statuses
            val workflowService: WorkflowApplicationService by application.dependencies
            val workflow = workflowService.createWorkflow(CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.IN_REVIEW, IssueStatus.DONE)
            ))

            // This test will FAIL until transitions collection endpoint is implemented
            val response = createJsonClient().get("/api/v1/workflows/${workflow.id}/transitions")

            response.status shouldBe HttpStatusCode.OK

            val transitionsResponse: AllTransitionsResponse = response.body()
            transitionsResponse.workflowId shouldBe workflow.id
            transitionsResponse.transitions shouldNotBe null
            transitionsResponse.transitions shouldHaveSize 4 // One for each status

            // Verify structure contains from/to mappings
            val todoTransitions = transitionsResponse.transitions.find { it.fromStatus == "TODO" }
            todoTransitions shouldNotBe null
            todoTransitions!!.validTransitions shouldContain "IN_PROGRESS"
        }
    }

    test("GET /api/v1/workflows/{id}/transitions returns empty transitions for single-status workflow") {
        configuredTestApplication {
            client.get("/health")

            // Create workflow with only one status (no transitions possible)
            val workflowService: WorkflowApplicationService by application.dependencies
            val workflow = workflowService.createWorkflow(CreateWorkflowCommand(
                name = "Single Status Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO)
            ))

            val response = createJsonClient().get("/api/v1/workflows/${workflow.id}/transitions")

            response.status shouldBe HttpStatusCode.OK

            val transitionsResponse: AllTransitionsResponse = response.body()
            transitionsResponse.workflowId shouldBe workflow.id
            transitionsResponse.transitions shouldHaveSize 1
            transitionsResponse.transitions[0].validTransitions shouldHaveSize 0
        }
    }

    // ================================================================================
    // Happy Path Tests - Validate Specific Transition
    // ================================================================================

    test("POST /api/v1/workflows/{id}/transitions/validation validates valid transition") {
        configuredTestApplication {
            client.get("/health")

            val workflowService: WorkflowApplicationService by application.dependencies
            val workflow = workflowService.createWorkflow(CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.DONE)
            ))

            val validationRequest = ValidateTransitionRequest(
                fromStatus = "TODO",
                toStatus = "IN_PROGRESS"
            )

            // This test will FAIL until resource-based validation endpoint is implemented
            val response = createJsonClient().post("/api/v1/workflows/${workflow.id}/transitions/validation") {
                contentType(ContentType.Application.Json)
                setBody(validationRequest)
            }

            response.status shouldBe HttpStatusCode.OK

            val validationResponse: ValidationResponse = response.body()
            validationResponse.isValid shouldBe true
            validationResponse.reason shouldBe null
        }
    }

    test("POST /api/v1/workflows/{id}/transitions/validation rejects invalid transition") {
        configuredTestApplication {
            client.get("/health")

            val workflowService: WorkflowApplicationService by application.dependencies
            val workflow = workflowService.createWorkflow(CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE) // No IN_PROGRESS
            ))

            val validationRequest = ValidateTransitionRequest(
                fromStatus = "TODO",
                toStatus = "IN_PROGRESS" // Not allowed
            )

            // This test will FAIL until resource-based validation endpoint is implemented
            val response = createJsonClient().post("/api/v1/workflows/${workflow.id}/transitions/validation") {
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

    test("POST /api/v1/workflows/{id}/transitions/validation validates back-transitions") {
        configuredTestApplication {
            client.get("/health")

            val workflowService: WorkflowApplicationService by application.dependencies
            val workflow = workflowService.createWorkflow(CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.DONE)
            ))

            val validationRequest = ValidateTransitionRequest(
                fromStatus = "IN_PROGRESS",
                toStatus = "TODO" // Back transition
            )

            val response = createJsonClient().post("/api/v1/workflows/${workflow.id}/transitions/validation") {
                contentType(ContentType.Application.Json)
                setBody(validationRequest)
            }

            response.status shouldBe HttpStatusCode.OK

            val validationResponse: ValidationResponse = response.body()
            validationResponse.isValid shouldBe true
        }
    }

    // ================================================================================
    // Edge Case Tests - Invalid Workflow ID
    // ================================================================================

    test("POST /api/v1/workflows/{invalid-id}/transitions/validation returns 404") {
        configuredTestApplication {
            val nonExistentId = WorkflowId.generate().value

            val validationRequest = ValidateTransitionRequest(
                fromStatus = "TODO",
                toStatus = "IN_PROGRESS"
            )

            // This test will FAIL until resource-based validation endpoint is implemented
            val response = createJsonClient().post("/api/v1/workflows/$nonExistentId/transitions/validation") {
                contentType(ContentType.Application.Json)
                setBody(validationRequest)
            }

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Workflow not found"
            errorResponse.details shouldContain nonExistentId.toString()
        }
    }

    test("GET /api/v1/workflows/{invalid-id}/transitions returns 404") {
        configuredTestApplication {
            val nonExistentId = WorkflowId.generate().value

            val response = createJsonClient().get("/api/v1/workflows/$nonExistentId/transitions")

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Workflow not found"
        }
    }

    test("POST /api/v1/workflows/{invalid-uuid}/transitions/validation returns 400") {
        configuredTestApplication {
            val invalidUuid = "not-a-uuid"

            val validationRequest = ValidateTransitionRequest(
                fromStatus = "TODO",
                toStatus = "IN_PROGRESS"
            )

            val response = createJsonClient().post("/api/v1/workflows/$invalidUuid/transitions/validation") {
                contentType(ContentType.Application.Json)
                setBody(validationRequest)
            }

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Invalid UUID"
            errorResponse.error shouldContain invalidUuid
        }
    }

    // ================================================================================
    // Edge Case Tests - Invalid Status Values
    // ================================================================================

    test("POST /api/v1/workflows/{id}/transitions/validation with invalid fromStatus returns 400") {
        configuredTestApplication {
            client.get("/health")

            val workflowService: WorkflowApplicationService by application.dependencies
            val workflow = workflowService.createWorkflow(CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            ))

            val invalidRequest = ValidateTransitionRequest(
                fromStatus = "INVALID_STATUS",
                toStatus = "TODO"
            )

            val response = createJsonClient().post("/api/v1/workflows/${workflow.id}/transitions/validation") {
                contentType(ContentType.Application.Json)
                setBody(invalidRequest)
            }

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Invalid IssueStatus"
            errorResponse.details shouldContain "INVALID_STATUS"
        }
    }

    test("POST /api/v1/workflows/{id}/transitions/validation with invalid toStatus returns 400") {
        configuredTestApplication {
            client.get("/health")

            val workflowService: WorkflowApplicationService by application.dependencies
            val workflow = workflowService.createWorkflow(CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            ))

            val invalidRequest = ValidateTransitionRequest(
                fromStatus = "TODO",
                toStatus = "INVALID_STATUS"
            )

            val response = createJsonClient().post("/api/v1/workflows/${workflow.id}/transitions/validation") {
                contentType(ContentType.Application.Json)
                setBody(invalidRequest)
            }

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Invalid IssueStatus"
            errorResponse.details shouldContain "INVALID_STATUS"
        }
    }

    test("POST /api/v1/workflows/{id}/transitions/validation with empty statuses returns 400") {
        configuredTestApplication {
            client.get("/health")

            val workflowService: WorkflowApplicationService by application.dependencies
            val workflow = workflowService.createWorkflow(CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            ))

            val emptyRequest = ValidateTransitionRequest(
                fromStatus = "",
                toStatus = ""
            )

            val response = createJsonClient().post("/api/v1/workflows/${workflow.id}/transitions/validation") {
                contentType(ContentType.Application.Json)
                setBody(emptyRequest)
            }

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Invalid IssueStatus"
        }
    }

    // ================================================================================
    // Edge Case Tests - Malformed Requests
    // ================================================================================

    test("POST /api/v1/workflows/{id}/transitions/validation with missing body returns 400") {
        configuredTestApplication {
            client.get("/health")

            val workflowService: WorkflowApplicationService by application.dependencies
            val workflow = workflowService.createWorkflow(CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            ))

            val response = createJsonClient().post("/api/v1/workflows/${workflow.id}/transitions/validation") {
                contentType(ContentType.Application.Json)
                setBody("{}") // Empty body
            }

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Failed to convert request body"
        }
    }

    test("POST /api/v1/workflows/{id}/transitions/validation with malformed JSON returns 400") {
        configuredTestApplication {
            client.get("/health")

            val workflowService: WorkflowApplicationService by application.dependencies
            val workflow = workflowService.createWorkflow(CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            ))

            val malformedJson = """{"fromStatus": "TODO", "invalid": }"""

            val response = client.post("/api/v1/workflows/${workflow.id}/transitions/validation") {
                contentType(ContentType.Application.Json)
                setBody(malformedJson)
            }

            response.status shouldBe HttpStatusCode.BadRequest
        }
    }

    // ================================================================================
    // Integration Tests - Transitions with Complex Workflows
    // ================================================================================

    test("GET /api/v1/workflows/{id}/transitions returns correct structure for complex workflow") {
        configuredTestApplication {
            client.get("/health")

            // Create complex workflow with all statuses
            val workflowService: WorkflowApplicationService by application.dependencies
            val workflow = workflowService.createWorkflow(CreateWorkflowCommand(
                name = "Complex Workflow",
                description = "Full workflow with all statuses",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(
                    IssueStatus.TODO,
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.IN_REVIEW,
                    IssueStatus.DONE,
                    IssueStatus.CANCELED
                )
            ))

            val response = createJsonClient().get("/api/v1/workflows/${workflow.id}/transitions")

            response.status shouldBe HttpStatusCode.OK

            val transitionsResponse: AllTransitionsResponse = response.body()
            transitionsResponse.transitions shouldHaveSize 5 // One for each status

            // Verify TODO transitions
            val todoTransitions = transitionsResponse.transitions.find { it.fromStatus == "TODO" }
            todoTransitions shouldNotBe null
            todoTransitions!!.validTransitions shouldContain "IN_PROGRESS"

            // Verify IN_PROGRESS transitions
            val inProgressTransitions = transitionsResponse.transitions.find { it.fromStatus == "IN_PROGRESS" }
            inProgressTransitions shouldNotBe null
            inProgressTransitions!!.validTransitions shouldContain "IN_REVIEW"

            // Verify DONE has no forward transitions
            val doneTransitions = transitionsResponse.transitions.find { it.fromStatus == "DONE" }
            doneTransitions shouldNotBe null
            doneTransitions!!.validTransitions shouldHaveSize 0
        }
    }

    // ================================================================================
    // Backward Compatibility Tests
    // ================================================================================

    test("Legacy /validate-transition endpoint should fail with helpful message") {
        configuredTestApplication {
            client.get("/health")

            val workflowService: WorkflowApplicationService by application.dependencies
            val workflow = workflowService.createWorkflow(CreateWorkflowCommand(
                name = "Test Workflow",
                description = "Description",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            ))

            val validationRequest = ValidateTransitionRequest(
                fromStatus = "TODO",
                toStatus = "DONE"
            )

            // Legacy endpoint (should fail per LegacyEndpointRemovalTest)
            val response = createJsonClient().post("/api/workflows/${workflow.id}/validate-transition") {
                contentType(ContentType.Application.Json)
                setBody(validationRequest)
            }

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
            errorResponse.details shouldContain "/api/v1/workflows/{id}/transitions/validation"
        }
    }
})

/**
 * Extended response DTO for all transitions endpoint.
 * This represents the expected response structure for GET /api/v1/workflows/{id}/transitions
 * that will be implemented in the GREEN phase.
 */
@kotlinx.serialization.Serializable
data class AllTransitionsResponse(
    val workflowId: String,
    val transitions: List<TransitionsResponse>
)