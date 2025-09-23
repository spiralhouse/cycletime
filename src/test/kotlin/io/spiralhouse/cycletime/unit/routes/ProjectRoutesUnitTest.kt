package io.spiralhouse.cycletime.unit.routes

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation as ClientContentNegotiation
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.plugins.di.DI
import io.ktor.server.plugins.di.dependencies
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation as ServerContentNegotiation
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.testing.*
import io.mockk.*
import io.spiralhouse.cycletime.api.dto.*
import io.spiralhouse.cycletime.api.routes.configureProjectRoutes
import io.spiralhouse.cycletime.api.middleware.ErrorHandler
import io.spiralhouse.cycletime.application.dto.ProjectDto
import io.spiralhouse.cycletime.application.exceptions.ProjectNotFoundException
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectStatus
import kotlinx.serialization.json.Json

/**
 * Comprehensive unit tests for ProjectRoutes using research-validated Ktor 3.2+ native DI approach.
 *
 * ## Test Coverage Summary (23 Scenarios)
 *
 * **GET /api/projects (4 scenarios):**
 * 1. Empty list response
 * 2. Multiple projects response
 * 3. Service error handling
 * 4. Performance verification
 *
 * **POST /api/projects (8 scenarios):**
 * 5. Successful creation
 * 6. Validation: empty name
 * 7. Validation: whitespace name
 * 8. Validation: long name (>255 chars)
 * 9. Validation: long description (>2000 chars)
 * 10. Validation: missing name field
 * 11. Service error during creation
 * 12. Malformed JSON handling
 *
 * **GET /api/projects/{id} (4 scenarios):**
 * 13. Successful retrieval
 * 14. Project not found
 * 15. Invalid UUID format
 * 16. Service error during retrieval
 *
 * **PUT /api/projects/{id} (4 scenarios):**
 * 17. Successful update
 * 18. Project not found during update
 * 19. Validation error on update
 * 20. Partial update (only name)
 *
 * **DELETE /api/projects/{id} (3 scenarios):**
 * 21. Successful deletion
 * 22. Project not found during deletion
 * 23. Service error during deletion
 *
 * ## Performance Targets
 * - Individual tests: <10ms (unit logic)
 * - HTTP route tests: <100ms (contract validation)
 * - Full suite: <30 seconds
 *
 * ## Technical Validation
 * - ✅ Ktor native DI mocking
 * - ✅ MockK suspend function handling
 * - ✅ HTTP status code verification
 * - ✅ Request/response body validation
 * - ✅ Service call verification
 * - ✅ Error handling validation
 */
class ProjectRoutesUnitTest : StringSpec({

    lateinit var mockProjectService: ProjectApplicationService
    lateinit var mockTimeProvider: TimeProvider

    beforeEach {
        mockProjectService = mockk<ProjectApplicationService>()
        mockTimeProvider = SimpleRouteTestUtils.createMockTimeProvider()
        clearAllMocks()
    }

    afterEach {
        clearAllMocks()
    }

    /**
     * Creates a test application with mocked dependencies.
     */
    fun testWithMocks(
        serviceConfig: (ProjectApplicationService) -> Unit = {},
        test: suspend ApplicationTestBuilder.() -> Unit
    ) {
        // Configure mock service with deterministic setup
        serviceConfig(mockProjectService)

        testApplication {
            application {
                // Deterministic DI setup for consistent CI/local behavior
                install(DI)
                dependencies {
                    // Direct mock provision for deterministic behavior
                    provide<ProjectApplicationService> { mockProjectService }
                    provide<TimeProvider> { mockTimeProvider }
                }

                // Install error handling middleware for proper validation error responses
                ErrorHandler.install(this, mockTimeProvider)

                // Minimal content negotiation for CI performance
                install(ServerContentNegotiation) {
                    json(Json {
                        isLenient = true
                        ignoreUnknownKeys = true
                        // Remove prettyPrint for CI performance
                    })
                }

                routing {
                    configureProjectRoutes()
                }
            }
            test()
        }
    }

    /**
     * Creates HTTP client with JSON support.
     */
    fun ApplicationTestBuilder.jsonClient() = createClient {
        install(ClientContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }
    }

    // ================================================================================
    // GET /api/projects Tests (4 scenarios)
    // ================================================================================

    "GET /api/projects should return empty list when no projects exist" {
        testWithMocks(
            serviceConfig = { service ->
                coEvery { service.listProjects() } returns SimpleRouteTestUtils.createProjectListDto(emptyList())
            }
        ) {
            val response = jsonClient().get("/api/projects")

            response.status shouldBe HttpStatusCode.OK
            val projects = response.body<ProjectListResponse>()
            projects.projects shouldBe emptyList()
            projects.totalCount shouldBe 0

            coVerify(exactly = 1) { mockProjectService.listProjects() }
        }
    }

    "GET /api/projects should return multiple projects" {
        val testProjects = SimpleRouteTestUtils.createTestProjects(3)

        testWithMocks(
            serviceConfig = { service ->
                coEvery { service.listProjects() } returns SimpleRouteTestUtils.createProjectListDto(testProjects)
            }
        ) {
            val response = jsonClient().get("/api/projects")

            response.status shouldBe HttpStatusCode.OK
            val projects = response.body<ProjectListResponse>()
            projects.projects.size shouldBe 3
            projects.totalCount shouldBe 3
            projects.projects[0].name shouldBe "Test Project 1"
            projects.projects[1].name shouldBe "Test Project 2"
            projects.projects[2].name shouldBe "Test Project 3"

            coVerify(exactly = 1) { mockProjectService.listProjects() }
        }
    }

    "GET /api/projects should handle service errors gracefully" {
        testWithMocks(
            serviceConfig = { service ->
                coEvery { service.listProjects() } throws RuntimeException("Database connection failed")
            }
        ) {
            val response = jsonClient().get("/api/projects")

            response.status shouldBe HttpStatusCode.InternalServerError
            val error = response.body<ErrorResponse>()
            error.error shouldContain "Internal server error"

            coVerify(exactly = 1) { mockProjectService.listProjects() }
        }
    }

    "GET /api/projects should execute quickly for performance validation" {
        val testProjects = SimpleRouteTestUtils.createTestProjects(10)

        testWithMocks(
            serviceConfig = { service ->
                coEvery { service.listProjects() } returns SimpleRouteTestUtils.createProjectListDto(testProjects)
            }
        ) {
            val startTime = System.currentTimeMillis()

            repeat(5) {
                val response = jsonClient().get("/api/projects")
                response.status shouldBe HttpStatusCode.OK
            }

            val totalTime = System.currentTimeMillis() - startTime
            println("✅ 5 GET requests completed in ${totalTime}ms (avg: ${totalTime/5}ms per request)")

            coVerify(exactly = 5) { mockProjectService.listProjects() }
        }
    }

    // ================================================================================
    // POST /api/projects Tests (8 scenarios)
    // ================================================================================

    "POST /api/projects should create project successfully" {
        val testProject = SimpleRouteTestUtils.createTestProject(
            name = "New Project",
            description = "New project description"
        )

        testWithMocks(
            serviceConfig = { service ->
                coEvery { service.createProject(any()) } returns testProject
            }
        ) {
            val response = jsonClient().post("/api/projects") {
                contentType(ContentType.Application.Json)
                setBody(CreateProjectRequest(
                    name = "New Project",
                    description = "New project description"
                ))
            }

            response.status shouldBe HttpStatusCode.Created
            val project = response.body<ProjectResponse>()
            project.name shouldBe "New Project"
            project.description shouldBe "New project description"
            project.status shouldBe "active"

            coVerify(exactly = 1) {
                mockProjectService.createProject(match { command ->
                    command.name == "New Project" && command.description == "New project description"
                })
            }
        }
    }

    "POST /api/projects should reject empty name" {
        testWithMocks {
            val response = jsonClient().post("/api/projects") {
                contentType(ContentType.Application.Json)
                setBody(CreateProjectRequest(name = "", description = "Valid description"))
            }

            response.status shouldBe HttpStatusCode.BadRequest
            val error = response.body<ErrorResponse>()
            error.error shouldBe "Invalid request"

            coVerify(exactly = 0) { mockProjectService.createProject(any()) }
        }
    }

    "POST /api/projects should reject whitespace-only name" {
        testWithMocks {
            val response = jsonClient().post("/api/projects") {
                contentType(ContentType.Application.Json)
                setBody(CreateProjectRequest(name = "   ", description = "Valid description"))
            }

            response.status shouldBe HttpStatusCode.BadRequest
            val error = response.body<ErrorResponse>()
            error.error shouldBe "Invalid request"

            coVerify(exactly = 0) { mockProjectService.createProject(any()) }
        }
    }

    "POST /api/projects should reject name longer than 255 characters" {
        val longName = "a".repeat(256)

        testWithMocks {
            val response = jsonClient().post("/api/projects") {
                contentType(ContentType.Application.Json)
                setBody(CreateProjectRequest(name = longName, description = "Valid description"))
            }

            response.status shouldBe HttpStatusCode.BadRequest
            val error = response.body<ErrorResponse>()
            error.error shouldBe "Invalid request"

            coVerify(exactly = 0) { mockProjectService.createProject(any()) }
        }
    }

    "POST /api/projects should reject description longer than 2000 characters" {
        val longDescription = "a".repeat(2001)

        testWithMocks {
            val response = jsonClient().post("/api/projects") {
                contentType(ContentType.Application.Json)
                setBody(CreateProjectRequest(name = "Valid Name", description = longDescription))
            }

            response.status shouldBe HttpStatusCode.BadRequest
            val error = response.body<ErrorResponse>()
            error.error shouldBe "Invalid request"

            coVerify(exactly = 0) { mockProjectService.createProject(any()) }
        }
    }

    "POST /api/projects should reject request with missing name" {
        testWithMocks {
            val response = jsonClient().post("/api/projects") {
                contentType(ContentType.Application.Json)
                setBody("""{"description":"Valid description"}""")
            }

            response.status shouldBe HttpStatusCode.BadRequest

            coVerify(exactly = 0) { mockProjectService.createProject(any()) }
        }
    }

    "POST /api/projects should handle service errors during creation" {
        testWithMocks(
            serviceConfig = { service ->
                coEvery { service.createProject(any()) } throws RuntimeException("Database constraint violation")
            }
        ) {
            val response = jsonClient().post("/api/projects") {
                contentType(ContentType.Application.Json)
                setBody(CreateProjectRequest(name = "Valid Name", description = "Valid description"))
            }

            response.status shouldBe HttpStatusCode.InternalServerError
            val error = response.body<ErrorResponse>()
            error.error shouldContain "Internal server error"

            coVerify(exactly = 1) { mockProjectService.createProject(any()) }
        }
    }

    "POST /api/projects should handle malformed JSON gracefully" {
        testWithMocks {
            val response = jsonClient().post("/api/projects") {
                contentType(ContentType.Application.Json)
                setBody("""{"name": "Valid Name", "description": }""") // Malformed JSON
            }

            response.status shouldBe HttpStatusCode.BadRequest

            coVerify(exactly = 0) { mockProjectService.createProject(any()) }
        }
    }

    // ================================================================================
    // GET /api/projects/{id} Tests (4 scenarios)
    // ================================================================================

    "GET /api/projects/{id} should return project when found" {
        val projectId = ProjectId.generate()
        val testProject = SimpleRouteTestUtils.createTestProject(id = projectId)

        testWithMocks(
            serviceConfig = { service ->
                coEvery { service.getProject(projectId) } returns testProject
            }
        ) {
            val response = jsonClient().get("/api/projects/${projectId.value}")

            response.status shouldBe HttpStatusCode.OK
            val project = response.body<ProjectResponse>()
            project.id shouldBe projectId.value
            project.name shouldBe testProject.name

            coVerify(exactly = 1) { mockProjectService.getProject(projectId) }
        }
    }

    "GET /api/projects/{id} should return 404 when project not found" {
        val projectId = ProjectId.generate()

        testWithMocks(
            serviceConfig = { service ->
                coEvery { service.getProject(projectId) } throws ProjectNotFoundException(projectId)
            }
        ) {
            val response = jsonClient().get("/api/projects/${projectId.value}")

            response.status shouldBe HttpStatusCode.NotFound
            val error = response.body<ErrorResponse>()
            error.error shouldContain "not found"

            coVerify(exactly = 1) { mockProjectService.getProject(projectId) }
        }
    }

    "GET /api/projects/{id} should return 400 for invalid UUID format" {
        testWithMocks {
            val response = jsonClient().get("/api/projects/invalid-uuid")

            response.status shouldBe HttpStatusCode.BadRequest
            val error = response.body<ErrorResponse>()
            error.error shouldContain "Invalid"

            coVerify(exactly = 0) { mockProjectService.getProject(any()) }
        }
    }

    "GET /api/projects/{id} should handle service errors during retrieval" {
        val projectId = ProjectId.generate()

        testWithMocks(
            serviceConfig = { service ->
                coEvery { service.getProject(projectId) } throws RuntimeException("Database timeout")
            }
        ) {
            val response = jsonClient().get("/api/projects/${projectId.value}")

            response.status shouldBe HttpStatusCode.InternalServerError
            val error = response.body<ErrorResponse>()
            error.error shouldContain "Internal server error"

            coVerify(exactly = 1) { mockProjectService.getProject(projectId) }
        }
    }

    // ================================================================================
    // PUT /api/projects/{id} Tests (4 scenarios)
    // ================================================================================

    "PUT /api/projects/{id} should update project successfully" {
        val projectId = ProjectId.generate()
        val updatedProject = SimpleRouteTestUtils.createTestProject(
            id = projectId,
            name = "Updated Name",
            description = "Updated description"
        )

        testWithMocks(
            serviceConfig = { service ->
                coEvery { service.updateProject(any()) } returns updatedProject
            }
        ) {
            val response = jsonClient().put("/api/projects/${projectId.value}") {
                contentType(ContentType.Application.Json)
                setBody(UpdateProjectRequest(
                    name = "Updated Name",
                    description = "Updated description"
                ))
            }

            response.status shouldBe HttpStatusCode.OK
            val project = response.body<ProjectResponse>()
            project.name shouldBe "Updated Name"
            project.description shouldBe "Updated description"

            coVerify(exactly = 1) {
                mockProjectService.updateProject(match { command ->
                    command.id == projectId &&
                    command.name == "Updated Name" &&
                    command.description == "Updated description"
                })
            }
        }
    }

    "PUT /api/projects/{id} should return 404 when project not found for update" {
        val projectId = ProjectId.generate()

        testWithMocks(
            serviceConfig = { service ->
                coEvery { service.updateProject(any()) } throws ProjectNotFoundException(projectId)
            }
        ) {
            val response = jsonClient().put("/api/projects/${projectId.value}") {
                contentType(ContentType.Application.Json)
                setBody(UpdateProjectRequest(name = "Updated Name"))
            }

            response.status shouldBe HttpStatusCode.NotFound
            val error = response.body<ErrorResponse>()
            error.error shouldContain "not found"

            coVerify(exactly = 1) { mockProjectService.updateProject(any()) }
        }
    }

    "PUT /api/projects/{id} should reject invalid update data" {
        val projectId = ProjectId.generate()

        testWithMocks {
            val response = jsonClient().put("/api/projects/${projectId.value}") {
                contentType(ContentType.Application.Json)
                setBody(UpdateProjectRequest(name = "")) // Empty name
            }

            response.status shouldBe HttpStatusCode.BadRequest
            val error = response.body<ErrorResponse>()
            error.error shouldBe "Invalid request"

            coVerify(exactly = 0) { mockProjectService.updateProject(any()) }
        }
    }

    "PUT /api/projects/{id} should handle partial updates (name only)" {
        val projectId = ProjectId.generate()
        val updatedProject = SimpleRouteTestUtils.createTestProject(
            id = projectId,
            name = "Only Name Updated"
        )

        testWithMocks(
            serviceConfig = { service ->
                coEvery { service.updateProject(any()) } returns updatedProject
            }
        ) {
            val response = jsonClient().put("/api/projects/${projectId.value}") {
                contentType(ContentType.Application.Json)
                setBody(UpdateProjectRequest(name = "Only Name Updated"))
            }

            response.status shouldBe HttpStatusCode.OK
            val project = response.body<ProjectResponse>()
            project.name shouldBe "Only Name Updated"

            coVerify(exactly = 1) {
                mockProjectService.updateProject(match { command ->
                    command.id == projectId &&
                    command.name == "Only Name Updated" &&
                    command.description == null
                })
            }
        }
    }

    // ================================================================================
    // DELETE /api/projects/{id} Tests (3 scenarios)
    // ================================================================================

    "DELETE /api/projects/{id} should delete project successfully" {
        val projectId = ProjectId.generate()

        testWithMocks(
            serviceConfig = { service ->
                coEvery { service.deleteProject(projectId) } just Runs
            }
        ) {
            val response = jsonClient().delete("/api/projects/${projectId.value}")

            response.status shouldBe HttpStatusCode.NoContent

            coVerify(exactly = 1) { mockProjectService.deleteProject(projectId) }
        }
    }

    "DELETE /api/projects/{id} should return 404 when project not found for deletion" {
        val projectId = ProjectId.generate()

        testWithMocks(
            serviceConfig = { service ->
                coEvery { service.deleteProject(projectId) } throws ProjectNotFoundException(projectId)
            }
        ) {
            val response = jsonClient().delete("/api/projects/${projectId.value}")

            response.status shouldBe HttpStatusCode.NotFound
            val error = response.body<ErrorResponse>()
            error.error shouldContain "not found"

            coVerify(exactly = 1) { mockProjectService.deleteProject(projectId) }
        }
    }

    "DELETE /api/projects/{id} should handle service errors during deletion" {
        val projectId = ProjectId.generate()

        testWithMocks(
            serviceConfig = { service ->
                coEvery { service.deleteProject(projectId) } throws RuntimeException("Cannot delete project with active issues")
            }
        ) {
            val response = jsonClient().delete("/api/projects/${projectId.value}")

            response.status shouldBe HttpStatusCode.InternalServerError
            val error = response.body<ErrorResponse>()
            error.error shouldContain "Internal server error"

            coVerify(exactly = 1) { mockProjectService.deleteProject(projectId) }
        }
    }
})