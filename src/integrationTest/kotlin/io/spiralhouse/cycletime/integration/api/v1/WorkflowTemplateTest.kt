package io.spiralhouse.cycletime.integration.api.v1

import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.collections.shouldContain
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
import io.spiralhouse.cycletime.api.dto.*
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.test.utils.DatabaseTestHelper
import io.spiralhouse.cycletime.test.utils.DatabaseTestHelper.configureTestApplication
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseNamingStrategy
import io.spiralhouse.cycletime.api.configuration.ApiConfiguration
import kotlinx.datetime.Instant
import kotlinx.serialization.json.Json
import org.slf4j.LoggerFactory

/**
 * TDD RED Phase Tests for Workflow Template Query Parameters (SPI-634 Anti-Pattern #3)
 *
 * ## Anti-Pattern Being Fixed
 *
 * **OLD**: `POST /api/workflows/default`, `/api/workflows/bug`, `/api/workflows/feature`
 * **NEW**: `POST /api/v1/workflows?template=default` (single endpoint with query parameter)
 *
 * ## Expected Behavior
 *
 * These tests verify that workflow templates are created using a query parameter instead of
 * separate endpoints. This follows RESTful principles where query parameters modify behavior
 * of a single resource endpoint rather than creating multiple specialized endpoints.
 *
 * ### Template Types
 * - `template=default` - Creates default workflow (TODO → IN_PROGRESS → DONE)
 * - `template=bug` - Creates bug-optimized workflow
 * - `template=feature` - Creates feature development workflow
 * - No template parameter - Creates custom empty workflow
 *
 * ### Benefits of Query Parameter Approach
 * - Fewer endpoints to maintain
 * - Easier to add new templates without route changes
 * - More discoverable API (single endpoint, multiple options)
 * - Follows industry best practices (GitHub, Stripe, etc.)
 *
 * ## Why This Will FAIL Initially
 *
 * 1. Routes don't support query parameter-based template selection
 * 2. Old template routes (`/default`, `/bug`, `/feature`) still exist
 * 3. No query parameter validation for template values
 * 4. Template factory logic not wired to query parameter
 *
 * @see WorkflowRoutes.kt for implementation (GREEN phase)
 */
class WorkflowTemplateTest : FunSpec({

    val logger = LoggerFactory.getLogger(WorkflowTemplateTest::class.java)

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
            testName = "workflow_template_test",
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
    // Happy Path Tests - Template Creation via Query Parameter
    // ================================================================================

    test("POST /api/v1/workflows?template=default creates default workflow") {
        configuredTestApplication {
            // This test will FAIL until query parameter support is implemented
            val response = createJsonClient().post("/api/v1/workflows?template=default")

            response.status shouldBe HttpStatusCode.Created

            val workflowResponse: WorkflowResponse = response.body()
            workflowResponse.name shouldBe "Default Workflow"
            workflowResponse.initialStatus shouldBe "BACKLOG"
            workflowResponse.allowedStatuses shouldContain "BACKLOG"
            workflowResponse.allowedStatuses shouldContain "IN_PROGRESS"
            workflowResponse.allowedStatuses shouldContain "DONE"
            workflowResponse.id shouldNotBe null
            workflowResponse.createdAt shouldBe "2025-01-15T10:00:00Z"
        }
    }

    test("POST /api/v1/workflows?template=bug creates bug workflow") {
        configuredTestApplication {
            // This test will FAIL until query parameter support is implemented
            val response = createJsonClient().post("/api/v1/workflows?template=bug")

            response.status shouldBe HttpStatusCode.Created

            val workflowResponse: WorkflowResponse = response.body()
            workflowResponse.name shouldBe "Bug Workflow"
            workflowResponse.initialStatus shouldBe "BACKLOG"
            workflowResponse.allowedStatuses shouldContain "BACKLOG"
            workflowResponse.id shouldNotBe null
        }
    }

    test("POST /api/v1/workflows?template=feature creates feature workflow") {
        configuredTestApplication {
            // This test will FAIL until query parameter support is implemented
            val response = createJsonClient().post("/api/v1/workflows?template=feature")

            response.status shouldBe HttpStatusCode.Created

            val workflowResponse: WorkflowResponse = response.body()
            workflowResponse.name shouldBe "Feature Workflow"
            workflowResponse.initialStatus shouldBe "BACKLOG"
            workflowResponse.allowedStatuses shouldContain "BACKLOG"
            workflowResponse.allowedStatuses shouldContain "IN_PROGRESS"
            workflowResponse.allowedStatuses shouldContain "IN_REVIEW"
            workflowResponse.allowedStatuses shouldContain "DONE"
            workflowResponse.id shouldNotBe null
        }
    }

    test("POST /api/v1/workflows without template creates custom workflow") {
        configuredTestApplication {
            val request = CreateWorkflowRequest(
                name = "Custom Workflow",
                description = "User-defined workflow",
                initialStatus = "TODO",
                allowedStatuses = listOf("TODO", "IN_PROGRESS", "DONE")
            )

            // This test will FAIL until body-based custom workflow creation is supported
            val response = createJsonClient().post("/api/v1/workflows") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            response.status shouldBe HttpStatusCode.Created

            val workflowResponse: WorkflowResponse = response.body()
            workflowResponse.name shouldBe "Custom Workflow"
            workflowResponse.description shouldBe "User-defined workflow"
            workflowResponse.initialStatus shouldBe "TODO"
        }
    }

    // ================================================================================
    // Edge Case Tests - Invalid Template Values
    // ================================================================================

    test("POST /api/v1/workflows?template=invalid returns 400") {
        configuredTestApplication {
            // This test will FAIL until template validation is implemented
            val response = createJsonClient().post("/api/v1/workflows?template=invalid")

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Invalid template"
            errorResponse.details shouldContain "invalid"
            errorResponse.details shouldContain "default, bug, feature"
        }
    }

    test("POST /api/v1/workflows?template= (empty) returns 400") {
        configuredTestApplication {
            // This test will FAIL until template validation is implemented
            val response = createJsonClient().post("/api/v1/workflows?template=")

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Invalid template"
        }
    }

    test("POST /api/v1/workflows?template=DEFAULT (case-insensitive) creates default workflow") {
        configuredTestApplication {
            // This test will FAIL until case-insensitive template matching is implemented
            val response = createJsonClient().post("/api/v1/workflows?template=DEFAULT")

            response.status shouldBe HttpStatusCode.Created

            val workflowResponse: WorkflowResponse = response.body()
            workflowResponse.name shouldBe "Default Workflow"
        }
    }

    // ================================================================================
    // Edge Case Tests - Template with Body (Should Ignore Body)
    // ================================================================================

    test("POST /api/v1/workflows?template=default with body ignores body and uses template") {
        configuredTestApplication {
            val request = CreateWorkflowRequest(
                name = "Custom Name", // Should be ignored
                description = "Custom Description", // Should be ignored
                initialStatus = "IN_PROGRESS", // Should be ignored
                allowedStatuses = listOf("IN_PROGRESS", "DONE") // Should be ignored
            )

            // This test will FAIL until template precedence is implemented
            val response = createJsonClient().post("/api/v1/workflows?template=default") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            response.status shouldBe HttpStatusCode.Created

            val workflowResponse: WorkflowResponse = response.body()
            workflowResponse.name shouldBe "Default Workflow" // From template, not body
            workflowResponse.initialStatus shouldBe "BACKLOG" // From template, not body
        }
    }

    // ================================================================================
    // Validation Tests - Template Characteristics
    // ================================================================================

    test("Default template has correct workflow configuration") {
        configuredTestApplication {
            val response = createJsonClient().post("/api/v1/workflows?template=default")

            response.status shouldBe HttpStatusCode.Created

            val workflowResponse: WorkflowResponse = response.body()

            // Verify default workflow structure
            workflowResponse.name shouldBe "Default Workflow"
            workflowResponse.description shouldContain "Standard workflow for general issues"
            workflowResponse.initialStatus shouldBe "BACKLOG"

            // Verify allowed statuses for default workflow
            workflowResponse.allowedStatuses shouldContain "BACKLOG"
            workflowResponse.allowedStatuses shouldContain "IN_PROGRESS"
            workflowResponse.allowedStatuses shouldContain "DONE"
        }
    }

    test("Bug template has correct workflow configuration") {
        configuredTestApplication {
            val response = createJsonClient().post("/api/v1/workflows?template=bug")

            response.status shouldBe HttpStatusCode.Created

            val workflowResponse: WorkflowResponse = response.body()

            // Verify bug workflow structure
            workflowResponse.name shouldBe "Bug Workflow"
            workflowResponse.description shouldContain "Optimized workflow for bug tracking"
            workflowResponse.initialStatus shouldBe "BACKLOG"

            // Bug workflows typically include verification steps
            workflowResponse.allowedStatuses shouldContain "BACKLOG"
            workflowResponse.allowedStatuses shouldContain "IN_PROGRESS"
            workflowResponse.allowedStatuses shouldContain "DONE"
        }
    }

    test("Feature template has correct workflow configuration") {
        configuredTestApplication {
            val response = createJsonClient().post("/api/v1/workflows?template=feature")

            response.status shouldBe HttpStatusCode.Created

            val workflowResponse: WorkflowResponse = response.body()

            // Verify feature workflow structure
            workflowResponse.name shouldBe "Feature Workflow"
            workflowResponse.description shouldContain "Workflow for feature development"
            workflowResponse.initialStatus shouldBe "BACKLOG"

            // Feature workflows include review steps
            workflowResponse.allowedStatuses shouldContain "BACKLOG"
            workflowResponse.allowedStatuses shouldContain "IN_PROGRESS"
            workflowResponse.allowedStatuses shouldContain "IN_REVIEW"
            workflowResponse.allowedStatuses shouldContain "DONE"
        }
    }

    // ================================================================================
    // Multiple Template Creation Tests
    // ================================================================================

    test("Creating multiple templates creates independent workflows") {
        configuredTestApplication {
            // Create default workflow
            val response1 = createJsonClient().post("/api/v1/workflows?template=default")
            response1.status shouldBe HttpStatusCode.Created
            val workflow1: WorkflowResponse = response1.body()

            // Create bug workflow
            val response2 = createJsonClient().post("/api/v1/workflows?template=bug")
            response2.status shouldBe HttpStatusCode.Created
            val workflow2: WorkflowResponse = response2.body()

            // Verify they are different workflows
            workflow1.id shouldNotBe workflow2.id
            workflow1.name shouldNotBe workflow2.name

            // Verify both exist in list
            val listResponse = createJsonClient().get("/api/v1/workflows")
            listResponse.status shouldBe HttpStatusCode.OK
            val list: WorkflowListResponse = listResponse.body()
            list.totalCount shouldBe 2
        }
    }

    // ================================================================================
    // Error Handling Tests
    // ================================================================================

    test("POST /api/v1/workflows?template=default with missing Content-Type succeeds (no body needed)") {
        configuredTestApplication {
            // Template creation doesn't require body, so missing Content-Type is OK
            val response = client.post("/api/v1/workflows?template=default")

            response.status shouldBe HttpStatusCode.Created
        }
    }

    test("POST /api/v1/workflows with malformed JSON body and no template returns 400") {
        configuredTestApplication {
            val malformedJson = """{"name": "Test", "invalid": }"""

            val response = client.post("/api/v1/workflows") {
                contentType(ContentType.Application.Json)
                setBody(malformedJson)
            }

            response.status shouldBe HttpStatusCode.BadRequest
        }
    }

    test("POST /api/v1/workflows without template or body returns 400") {
        configuredTestApplication {
            // No template parameter and no body should fail
            val response = createJsonClient().post("/api/v1/workflows")

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "template parameter or request body required"
        }
    }

    // ================================================================================
    // Backward Compatibility Tests
    // ================================================================================

    test("Legacy template endpoints should redirect or fail with helpful message") {
        configuredTestApplication {
            // Legacy endpoint (should fail per LegacyEndpointRemovalTest)
            val response = createJsonClient().post("/api/workflows/default")

            response.status shouldBe HttpStatusCode.NotFound

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "endpoint not found"
            errorResponse.details shouldContain "/api/v1/workflows?template=default"
        }
    }

    // ================================================================================
    // Query Parameter Validation Tests
    // ================================================================================

    test("Multiple template parameters returns 400") {
        configuredTestApplication {
            // This test will FAIL until query parameter validation is implemented
            val response = createJsonClient().post("/api/v1/workflows?template=default&template=bug")

            response.status shouldBe HttpStatusCode.BadRequest

            val errorResponse: ErrorResponse = response.body()
            errorResponse.error shouldContain "Multiple template parameters"
        }
    }

    test("Template parameter with extra whitespace is trimmed and works") {
        configuredTestApplication {
            // This test will FAIL until query parameter normalization is implemented
            val response = createJsonClient().post("/api/v1/workflows?template= default ")

            response.status shouldBe HttpStatusCode.Created

            val workflowResponse: WorkflowResponse = response.body()
            workflowResponse.name shouldBe "Default Workflow"
        }
    }
})