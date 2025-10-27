package io.spiralhouse.cycletime.integration.dashboard

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldNotContain
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.di.*
import io.ktor.server.testing.*
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.IssueType
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import io.spiralhouse.cycletime.test.utils.DashboardTestDataBuilder

/**
 * HTML integration tests for dashboard UI endpoints.
 *
 * **TDD RED Phase**: These tests define the HTML contract for the frontend implementation.
 * All tests should FAIL because HTML routes are not implemented yet.
 *
 * ## Test Coverage
 * - **GET /dashboard**: Projects list page (full HTML)
 * - **GET /dashboard/projects/{id}**: Hierarchy page (full HTML)
 * - **GET /dashboard/stories/{id}/subtasks**: Subtasks fragment (HTMX)
 *
 * ## Testing Approach
 * - **Structural Assertions**: Assert on semantic HTML structure, not exact markup
 * - **HTMX Verification**: Verify HTMX attributes exist with correct patterns
 * - **Fragment Validation**: Ensure fragments don't include full page structure
 * - **Error Handling**: Test 400 and 404 responses with proper status codes
 *
 * @since 1.0.0 (SPI-690)
 */
class HtmlDashboardRoutesIntegrationTest : StringSpec({

    // ========================================
    // GET /dashboard - Projects List Tests
    // ========================================

    "GET /dashboard should return HTTP 200 with text/html content type" {
        testDashboardApplication {
            // Trigger application initialization
            client.get("/health")

            val projectRepo: ExposedProjectRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            // Seed test data
            DashboardTestDataBuilder.seedTestProjects(projectRepo, unitOfWork, timeProvider)

            // Make request
            val response = client.get("/dashboard")

            // Assertions
            response.status shouldBe HttpStatusCode.OK
            response.contentType()?.withoutParameters() shouldBe ContentType.Text.Html
        }
    }

    "GET /dashboard should contain CycleTime Dashboard title and essential meta tags" {
        testDashboardApplication {
            client.get("/health")

            val projectRepo: ExposedProjectRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            DashboardTestDataBuilder.seedTestProjects(projectRepo, unitOfWork, timeProvider)

            val response = client.get("/dashboard")
            val html = response.bodyAsText()

            // Verify page structure
            html shouldContain "<!DOCTYPE html>"
            html shouldContain "<html"
            html shouldContain "CycleTime Dashboard"
            html shouldContain "charset=\"UTF-8\""
            html shouldContain "viewport"
        }
    }

    "GET /dashboard should include Tailwind CSS and HTMX CDN links" {
        testDashboardApplication {
            client.get("/health")

            val projectRepo: ExposedProjectRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            DashboardTestDataBuilder.seedTestProjects(projectRepo, unitOfWork, timeProvider)

            val response = client.get("/dashboard")
            val html = response.bodyAsText()

            // Verify CDN links
            html shouldContain "https://cdn.tailwindcss.com"
            html shouldContain "https://unpkg.com/htmx.org"
        }
    }

    "GET /dashboard should display projects in responsive grid layout" {
        testDashboardApplication {
            client.get("/health")

            val projectRepo: ExposedProjectRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            val (project1, project2) = DashboardTestDataBuilder.seedTestProjects(
                projectRepo, unitOfWork, timeProvider
            )

            val response = client.get("/dashboard")
            val html = response.bodyAsText()

            // Verify responsive grid classes
            html shouldContain "grid-cols-1"
            html shouldContain "md:grid-cols-2"
            html shouldContain "lg:grid-cols-3"

            // Verify project cards exist
            html shouldContain "project-card" // or similar class
            html shouldContain project1.name
            html shouldContain project2.name
        }
    }

    "GET /dashboard should display project metadata (name, description, statistics)" {
        testDashboardApplication {
            client.get("/health")

            val projectRepo: ExposedProjectRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            val (project1, _) = DashboardTestDataBuilder.seedTestProjects(
                projectRepo, unitOfWork, timeProvider
            )

            val response = client.get("/dashboard")
            val html = response.bodyAsText()

            // Verify project metadata
            html shouldContain project1.name
            html shouldContain project1.description!!

            // Verify statistics are present (icons or counts)
            html shouldContain "epics"
            html shouldContain "stories"
        }
    }

    "GET /dashboard should display service health header" {
        testDashboardApplication {
            client.get("/health")

            val projectRepo: ExposedProjectRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            DashboardTestDataBuilder.seedTestProjects(projectRepo, unitOfWork, timeProvider)

            val response = client.get("/dashboard")
            val html = response.bodyAsText()

            // Verify health indicator
            html shouldContain "Status:"
            html shouldContain "projects"
            html shouldContain "issues"
        }
    }

    "GET /dashboard should display empty state when no projects exist" {
        testDashboardApplication {
            client.get("/health")

            // No projects seeded
            val response = client.get("/dashboard")
            val html = response.bodyAsText()

            // Verify empty state message
            html shouldContain "No projects"
        }
    }

    // ========================================
    // GET /dashboard/projects/{id} - Hierarchy Tests
    // ========================================

    "GET /dashboard/projects/{id} should return HTTP 200 for valid project UUID" {
        testDashboardApplication {
            client.get("/health")

            val projectRepo: ExposedProjectRepository by application.dependencies
            val issueRepo: ExposedIssueRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            val hierarchy = DashboardTestDataBuilder.seedProjectWithHierarchy(
                projectRepo, issueRepo, unitOfWork, timeProvider
            )

            val response = client.get("/dashboard/projects/${hierarchy.project.id.value}")

            response.status shouldBe HttpStatusCode.OK
            response.contentType()?.withoutParameters() shouldBe ContentType.Text.Html
        }
    }

    "GET /dashboard/projects/{id} should contain project name in title or h1" {
        testDashboardApplication {
            client.get("/health")

            val projectRepo: ExposedProjectRepository by application.dependencies
            val issueRepo: ExposedIssueRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            val hierarchy = DashboardTestDataBuilder.seedProjectWithHierarchy(
                projectRepo, issueRepo, unitOfWork, timeProvider
            )

            val response = client.get("/dashboard/projects/${hierarchy.project.id.value}")
            val html = response.bodyAsText()

            // Verify project name appears in title or heading
            html shouldContain hierarchy.project.name
            html shouldContain "<title>" // Page should have title tag
        }
    }

    "GET /dashboard/projects/{id} should contain breadcrumb back link to dashboard" {
        testDashboardApplication {
            client.get("/health")

            val projectRepo: ExposedProjectRepository by application.dependencies
            val issueRepo: ExposedIssueRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            val hierarchy = DashboardTestDataBuilder.seedProjectWithHierarchy(
                projectRepo, issueRepo, unitOfWork, timeProvider
            )

            val response = client.get("/dashboard/projects/${hierarchy.project.id.value}")
            val html = response.bodyAsText()

            // Verify back link
            html shouldContain "href=\"/dashboard\""
            html shouldContain "Back"
        }
    }

    "GET /dashboard/projects/{id} should display epic nodes with proper structure" {
        testDashboardApplication {
            client.get("/health")

            val projectRepo: ExposedProjectRepository by application.dependencies
            val issueRepo: ExposedIssueRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            val hierarchy = DashboardTestDataBuilder.seedProjectWithHierarchy(
                projectRepo, issueRepo, unitOfWork, timeProvider
            )

            val response = client.get("/dashboard/projects/${hierarchy.project.id.value}")
            val html = response.bodyAsText()

            // Verify epic structure
            html shouldContain "epic-node" // or similar class/structure
            html shouldContain hierarchy.epic.title
            html shouldContain "📚" // Epic icon
        }
    }

    "GET /dashboard/projects/{id} should display story nodes with HTMX lazy-load attributes" {
        testDashboardApplication {
            client.get("/health")

            val projectRepo: ExposedProjectRepository by application.dependencies
            val issueRepo: ExposedIssueRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            val hierarchy = DashboardTestDataBuilder.seedProjectWithHierarchy(
                projectRepo, issueRepo, unitOfWork, timeProvider
            )

            val response = client.get("/dashboard/projects/${hierarchy.project.id.value}")
            val html = response.bodyAsText()

            // Verify story structure
            html shouldContain "story-node" // or similar class/structure
            html shouldContain hierarchy.story.title

            // Verify HTMX attributes exist
            html shouldContain "hx-get="
            html shouldContain "hx-target="
            html shouldContain "hx-swap="

            // Verify HTMX attribute patterns
            html shouldContain "hx-get=\"/dashboard/stories/"
            html shouldContain "hx-target=\"#subtasks-"
            html shouldContain "hx-swap=\"innerHTML\""
        }
    }

    "GET /dashboard/projects/{id} should display statistics (epic count, story count)" {
        testDashboardApplication {
            client.get("/health")

            val projectRepo: ExposedProjectRepository by application.dependencies
            val issueRepo: ExposedIssueRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            val project = DashboardTestDataBuilder.seedProjectWithMultipleEpics(
                projectRepo, issueRepo, unitOfWork, timeProvider
            )

            val response = client.get("/dashboard/projects/${project.id.value}")
            val html = response.bodyAsText()

            // Verify statistics display
            html shouldContain "epics"
            html shouldContain "stories"
        }
    }

    "GET /dashboard/projects/{id} should return HTTP 404 for non-existent project UUID" {
        testDashboardApplication {
            client.get("/health")

            val nonExistentId = "00000000-0000-0000-0000-000000000000"

            val response = client.get("/dashboard/projects/$nonExistentId")

            response.status shouldBe HttpStatusCode.NotFound
        }
    }

    "GET /dashboard/projects/{id} should return HTTP 400 for invalid UUID format" {
        testDashboardApplication {
            client.get("/health")

            val invalidId = "not-a-uuid"

            val response = client.get("/dashboard/projects/$invalidId")

            response.status shouldBe HttpStatusCode.BadRequest
        }
    }

    "GET /dashboard/projects/{id} should display empty state when project has no issues" {
        testDashboardApplication {
            client.get("/health")

            val projectRepo: ExposedProjectRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            val project = DashboardTestDataBuilder.seedEmptyProject(
                projectRepo, unitOfWork, timeProvider
            )

            val response = client.get("/dashboard/projects/${project.id.value}")
            val html = response.bodyAsText()

            // Verify empty state
            html shouldContain "No epics"
        }
    }

    "GET /dashboard/projects/{id} should display orphaned stories section when stories have no epic" {
        testDashboardApplication {
            client.get("/health")

            val projectRepo: ExposedProjectRepository by application.dependencies
            val issueRepo: ExposedIssueRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            val (project, orphanedStory) = DashboardTestDataBuilder.seedProjectWithOrphanedStory(
                projectRepo, issueRepo, unitOfWork, timeProvider
            )

            val response = client.get("/dashboard/projects/${project.id.value}")
            val html = response.bodyAsText()

            // Verify orphaned stories section
            html shouldContain orphanedStory.title
            html shouldContain "Stories" // "Stories (No Epic)" or similar
        }
    }

    // ========================================
    // GET /dashboard/stories/{id}/subtasks - Fragment Tests
    // ========================================

    "GET /dashboard/stories/{id}/subtasks should return HTTP 200 for valid story UUID" {
        testDashboardApplication {
            client.get("/health")

            val issueRepo: ExposedIssueRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            val data = DashboardTestDataBuilder.seedStoryWithMultipleSubtasks(
                issueRepo, unitOfWork, timeProvider
            )

            val response = client.get("/dashboard/stories/${data.story.id.value}/subtasks") {
                header("HX-Request", "true")  // Simulate HTMX request
            }

            response.status shouldBe HttpStatusCode.OK
            response.contentType()?.withoutParameters() shouldBe ContentType.Text.Html
        }
    }

    "GET /dashboard/stories/{id}/subtasks should return HTML fragment without full page structure" {
        testDashboardApplication {
            client.get("/health")

            val issueRepo: ExposedIssueRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            val data = DashboardTestDataBuilder.seedStoryWithMultipleSubtasks(
                issueRepo, unitOfWork, timeProvider
            )

            val response = client.get("/dashboard/stories/${data.story.id.value}/subtasks") {
                header("HX-Request", "true")
            }

            val html = response.bodyAsText()

            // Fragment must NOT have full page structure
            html shouldNotContain "<!DOCTYPE html>"
            html shouldNotContain "<html"
            html shouldNotContain "<head>"
            html shouldNotContain "<body>"

            // But should contain subtask content
            html shouldContain "subtask-item" // or similar class
        }
    }

    "GET /dashboard/stories/{id}/subtasks should display subtasks with title, estimate, and status" {
        testDashboardApplication {
            client.get("/health")

            val issueRepo: ExposedIssueRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            val data = DashboardTestDataBuilder.seedStoryWithMultipleSubtasks(
                issueRepo, unitOfWork, timeProvider
            )

            val response = client.get("/dashboard/stories/${data.story.id.value}/subtasks") {
                header("HX-Request", "true")
            }

            val html = response.bodyAsText()

            // Verify both subtasks are displayed
            html shouldContain data.subtask1.title
            html shouldContain data.subtask2.title

            // Verify estimate display (if present)
            html shouldContain "pts" // or "points"

            // Verify subtask icon or indicator
            html shouldContain "📝"
        }
    }

    "GET /dashboard/stories/{id}/subtasks should return HTTP 404 for non-existent story UUID" {
        testDashboardApplication {
            client.get("/health")

            val nonExistentId = "00000000-0000-0000-0000-000000000000"

            val response = client.get("/dashboard/stories/$nonExistentId/subtasks") {
                header("HX-Request", "true")
            }

            response.status shouldBe HttpStatusCode.NotFound
        }
    }

    "GET /dashboard/stories/{id}/subtasks should return HTTP 404 when ID is an epic (not a story)" {
        testDashboardApplication {
            client.get("/health")

            val projectRepo: ExposedProjectRepository by application.dependencies
            val issueRepo: ExposedIssueRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            val hierarchy = DashboardTestDataBuilder.seedProjectWithHierarchy(
                projectRepo, issueRepo, unitOfWork, timeProvider
            )

            // Try to get subtasks for an epic (wrong type)
            val response = client.get("/dashboard/stories/${hierarchy.epic.id.value}/subtasks") {
                header("HX-Request", "true")
            }

            response.status shouldBe HttpStatusCode.NotFound
        }
    }

    "GET /dashboard/stories/{id}/subtasks should return HTTP 404 when ID is a subtask (not a story)" {
        testDashboardApplication {
            client.get("/health")

            val projectRepo: ExposedProjectRepository by application.dependencies
            val issueRepo: ExposedIssueRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            val hierarchy = DashboardTestDataBuilder.seedProjectWithHierarchy(
                projectRepo, issueRepo, unitOfWork, timeProvider
            )

            // Try to get subtasks for a subtask (wrong type)
            val response = client.get("/dashboard/stories/${hierarchy.subtask.id.value}/subtasks") {
                header("HX-Request", "true")
            }

            response.status shouldBe HttpStatusCode.NotFound
        }
    }

    "GET /dashboard/stories/{id}/subtasks should return HTTP 400 for invalid UUID format" {
        testDashboardApplication {
            client.get("/health")

            val invalidId = "not-a-uuid"

            val response = client.get("/dashboard/stories/$invalidId/subtasks") {
                header("HX-Request", "true")
            }

            response.status shouldBe HttpStatusCode.BadRequest
        }
    }

    "GET /dashboard/stories/{id}/subtasks should handle story with no subtasks gracefully" {
        testDashboardApplication {
            client.get("/health")

            val issueRepo: ExposedIssueRepository by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val timeProvider: TimeProvider by application.dependencies

            val story = DashboardTestDataBuilder.seedStoryWithoutSubtasks(
                issueRepo, unitOfWork, timeProvider
            )

            val response = client.get("/dashboard/stories/${story.id.value}/subtasks") {
                header("HX-Request", "true")
            }

            response.status shouldBe HttpStatusCode.OK
            val html = response.bodyAsText()

            // Should return empty fragment or "No subtasks" message
            // (Either empty content or a message is acceptable)
            html shouldNotBe null
        }
    }
})
