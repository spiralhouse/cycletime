---
title: "Dashboard API Reference"
type: reference
domain: [ui, api]
description: "Complete HTTP API reference for CycleTime Dashboard endpoints"
dependencies: [../../patterns/dashboard/dashboard-dto-mapping-pattern.md, ../../concepts/dashboard/dashboard-architecture-concept.md]
related: [../../guides/dashboard/dashboard-implementation-guide.md, ../dashboard/dashboard-technology-stack-reference.md]
keywords: [api, endpoints, http, routes, ktor]
audience: [developers]
last_updated: 2025-10-28
---

# Dashboard API Reference

## Base URL

```
http://127.0.0.1:8080/dashboard
```

**Note**: Dashboard is localhost-only by design. All endpoints require local access.

## Endpoints Overview

| Endpoint | Method | Purpose | Response Type | Cache TTL |
|----------|--------|---------|---------------|-----------|
| `/dashboard` | GET | Projects overview | Full HTML page | 5 min |
| `/dashboard/projects/{id}` | GET | Project detail with hierarchy | Full HTML page | 5 min |
| `/dashboard/stories/{id}/subtasks` | GET | Lazy-load subtasks (HTMX) | HTML fragment | 5 min |
| `/dashboard/static/*` | GET | Static assets (CSS/JS) | Static files | Forever |

## Route Configuration

### Ktor Route Definition

```kotlin
package io.spiralhouse.cycletime.dashboard.routes

import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.http.*
import io.spiralhouse.cycletime.application.services.DashboardApplicationService
import io.spiralhouse.cycletime.dashboard.views.*

/**
 * Configures dashboard routes.
 * Mounts under /dashboard prefix for clear separation.
 */
fun Route.configureDashboardRoutes() {
    route("/dashboard") {
        // Projects overview
        get { /* ... */ }

        // Project detail
        get("/projects/{projectId}") { /* ... */ }

        // HTMX subtask loading
        get("/stories/{storyId}/subtasks") { /* ... */ }

        // Static assets
        static("/static") {
            resources("dashboard/static")
        }
    }
}
```

## Endpoint Details

### GET /dashboard

**Purpose**: Display all projects with summary statistics.

**Response**: Full HTML page with project cards grid.

**Service Method**: `DashboardApplicationService.listProjects()`

**Cache Strategy**: Results cached for 5 minutes with key `"projects:all"`.

#### Request

```http
GET /dashboard HTTP/1.1
Host: 127.0.0.1:8080
Accept: text/html
```

#### Response

**Status**: `200 OK`

**Content-Type**: `text/html; charset=UTF-8`

**Body**: Full HTML page with:
- Dashboard header with service health
- Project cards grid (responsive)
- Each card links to project detail

#### Example Response Structure

```html
<!DOCTYPE html>
<html>
<head>
    <title>CycleTime Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
</head>
<body>
    <header>
        <h1>CycleTime Dashboard</h1>
        <div class="health-status">
            <span>Status: healthy</span>
            <span>3 projects • 42 issues</span>
        </div>
    </header>
    <main>
        <h2>Projects</h2>
        <div class="grid">
            <a href="/dashboard/projects/uuid-1">
                <h3>Project Name</h3>
                <p>Project description...</p>
                <div>
                    <span>📚 5 epics</span>
                    <span>📖 12 stories</span>
                    <span>📝 25 total</span>
                </div>
            </a>
            <!-- More project cards... -->
        </div>
    </main>
</body>
</html>
```

#### Error Responses

**No projects**:
- Status: `200 OK`
- Body: HTML page with empty state message

**Service error**:
- Status: `500 Internal Server Error`
- Body: Error page with details

### GET /dashboard/projects/{projectId}

**Purpose**: Display project hierarchy (Epics → Stories).

**Path Parameters**:
- `projectId` (required): UUID of project

**Response**: Full HTML page with hierarchical issue display.

**Service Method**: `DashboardApplicationService.getProjectHierarchy(projectId)`

**Cache Strategy**: Results cached for 5 minutes with key `"project:{id}:hierarchy"`.

#### Request

```http
GET /dashboard/projects/f47ac10b-58cc-4372-a567-0e02b2c3d479 HTTP/1.1
Host: 127.0.0.1:8080
Accept: text/html
```

#### Response (Success)

**Status**: `200 OK`

**Content-Type**: `text/html; charset=UTF-8`

**Body**: Full HTML page with:
- Project header with back link
- Project statistics
- Epics section (expandable with stories)
- Orphaned stories section (if any)

#### Example Response Structure

```html
<!DOCTYPE html>
<html>
<head>
    <title>Project Name - CycleTime Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
</head>
<body>
    <header>
        <a href="/dashboard">← Back to Projects</a>
        <h1>Project Name</h1>
        <div>5 epics • 12 stories</div>
    </header>
    <main>
        <section>
            <h2>📚 Epics</h2>
            <div class="epic">
                <h3>Epic Title</h3>
                <p>Epic description...</p>
                <div class="stories">
                    <div class="story">
                        <span>📖 Story Title</span>
                        <button
                            hx-get="/dashboard/stories/story-id/subtasks"
                            hx-target="#subtasks-story-id"
                            hx-swap="innerHTML">
                            3 subtasks ▼
                        </button>
                        <div id="subtasks-story-id"></div>
                    </div>
                </div>
            </div>
        </section>
    </main>
</body>
</html>
```

#### Response (Not Found)

**Status**: `404 Not Found`

**Body**: `"Project not found"`

#### Error Responses

**Invalid projectId format**:
- Status: `400 Bad Request`
- Body: `"Invalid project ID format"`

**Service error**:
- Status: `500 Internal Server Error`
- Body: Error page with details

### GET /dashboard/stories/{storyId}/subtasks

**Purpose**: Lazy-load subtasks for a story (HTMX endpoint).

**Path Parameters**:
- `storyId` (required): UUID of story

**Response**: HTML fragment (not full page) with subtask list.

**Service Method**: `DashboardApplicationService.getStorySubtasks(storyId)`

**Cache Strategy**: Results cached for 5 minutes with key `"story:{id}:subtasks"`.

**HTMX Integration**: This endpoint is designed for HTMX dynamic content loading.

#### Request

```http
GET /dashboard/stories/e3b0c442-98fc-1c14-b39f-92d1282e4b3f/subtasks HTTP/1.1
Host: 127.0.0.1:8080
Accept: text/html
HX-Request: true
```

**Headers**:
- `HX-Request: true` - Indicates HTMX request (optional, for logging/monitoring)

#### Response (Success)

**Status**: `200 OK`

**Content-Type**: `text/html; charset=UTF-8`

**Body**: HTML fragment (NOT a complete page):

```html
<div>
    <div class="subtask">
        <span>📝</span>
        <span>Subtask title 1</span>
        <span class="estimate">3 pts</span>
        <span class="status">In Progress</span>
    </div>
    <div class="subtask">
        <span>📝</span>
        <span>Subtask title 2</span>
        <span class="estimate">2 pts</span>
        <span class="status">Todo</span>
    </div>
    <div class="subtask">
        <span>📝</span>
        <span>Subtask title 3</span>
        <span class="estimate">5 pts</span>
        <span class="status">Done</span>
    </div>
</div>
```

#### Response (Empty)

**Status**: `200 OK`

**Body**: Empty `<div></div>` or message:

```html
<div class="text-gray-500 italic">No subtasks</div>
```

#### Error Responses

**Invalid storyId format**:
- Status: `400 Bad Request`
- Body: `"Missing storyId"`

**Story not found**:
- Status: `200 OK` (returns empty fragment for graceful degradation)
- Body: `<div></div>`

### GET /dashboard/static/*

**Purpose**: Serve static assets (CSS, JS, images).

**Path Pattern**: Any file under `/dashboard/static/`

**Source**: `src/main/resources/dashboard/static/`

**Cache Strategy**: Long-term browser caching (1 year).

#### Request

```http
GET /dashboard/static/custom.css HTTP/1.1
Host: 127.0.0.1:8080
Accept: text/css
```

#### Response

**Status**: `200 OK`

**Content-Type**: Appropriate MIME type (`text/css`, `application/javascript`, etc.)

**Headers**:
```
Cache-Control: public, max-age=31536000
ETag: "..."
```

**Body**: File contents

#### Error Response

**File not found**:
- Status: `404 Not Found`

## Implementation Example

### Complete Route Handler

```kotlin
fun Route.configureDashboardRoutes() {
    route("/dashboard") {
        // Main dashboard page - projects overview
        get {
            val service: DashboardApplicationService by application.dependencies
            val projects = service.listProjects()
            val health = service.getServiceHealth()

            call.respondHtml(HttpStatusCode.OK) {
                DashboardViews.projectsIndex(projects, health)
            }
        }

        // Project detail page with hierarchy
        get("/projects/{projectId}") {
            val projectId = call.parameters["projectId"]
                ?: return@get call.respond(
                    HttpStatusCode.BadRequest,
                    "Missing projectId"
                )

            val service: DashboardApplicationService by application.dependencies
            val hierarchy = service.getProjectHierarchy(projectId)
                ?: return@get call.respond(
                    HttpStatusCode.NotFound,
                    "Project not found"
                )
            val health = service.getServiceHealth()

            call.respondHtml(HttpStatusCode.OK) {
                DashboardViews.projectDetail(hierarchy, health)
            }
        }

        // HTMX endpoint - lazy load subtasks for a story
        get("/stories/{storyId}/subtasks") {
            val storyId = call.parameters["storyId"]
                ?: return@get call.respond(
                    HttpStatusCode.BadRequest,
                    "Missing storyId"
                )

            val service: DashboardApplicationService by application.dependencies
            val subtasks = service.getStorySubtasks(storyId)

            call.respondHtml(HttpStatusCode.OK) {
                DashboardViews.subtaskList(subtasks)
            }
        }

        // Static assets (CSS, JS)
        static("/static") {
            resources("dashboard/static")
        }
    }
}
```

## HTMX Integration Patterns

### Lazy Loading Pattern

**HTML with HTMX attributes**:

```html
<button
    hx-get="/dashboard/stories/uuid/subtasks"
    hx-target="#subtasks-uuid"
    hx-swap="innerHTML"
    hx-trigger="click once"
    hx-indicator="#loading-uuid">
    Load Subtasks ▼
</button>
<div id="subtasks-uuid"></div>
<div id="loading-uuid" class="htmx-indicator">Loading...</div>
```

**HTMX Attributes**:
- `hx-get`: Endpoint to fetch content
- `hx-target`: CSS selector for content insertion
- `hx-swap`: How to insert content (`innerHTML`, `outerHTML`, `beforeend`)
- `hx-trigger`: When to trigger request (`click`, `load`, `revealed`)
- `hx-indicator`: Loading indicator element

### Polling Pattern (Future)

For real-time updates:

```html
<div
    hx-get="/dashboard/health"
    hx-trigger="every 10s"
    hx-swap="innerHTML">
    <!-- Initial health status -->
</div>
```

## Caching Headers

### HTML Pages

```http
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

**Rationale**: HTML content may change frequently. Let application cache handle it.

### Static Assets

```http
Cache-Control: public, max-age=31536000, immutable
ETag: "..."
```

**Rationale**: Static assets rarely change. Use versioned filenames for cache busting.

## Error Handling

### Error Response Format

For HTML endpoints:

```kotlin
try {
    // Route logic
} catch (e: Exception) {
    logger.error("Dashboard error", e)
    call.respondHtml(HttpStatusCode.InternalServerError) {
        ErrorViews.errorPage(
            title = "Error",
            message = "An error occurred",
            details = if (isDevelopment) e.message else null
        )
    }
}
```

### Error Page Structure

```html
<!DOCTYPE html>
<html>
<head><title>Error - CycleTime Dashboard</title></head>
<body>
    <div class="error">
        <h1>Oops! Something went wrong</h1>
        <p>An error occurred while loading the dashboard.</p>
        <a href="/dashboard">← Back to Dashboard</a>
    </div>
</body>
</html>
```

## Testing Routes

### Integration Test Example

```kotlin
class DashboardRoutesTest : StringSpec({
    "GET /dashboard should return projects list" {
        testApplication {
            application {
                configureDashboardRoutes()
            }

            val response = client.get("/dashboard")

            response.status shouldBe HttpStatusCode.OK
            response.contentType() shouldBe ContentType.Text.Html
            response.bodyAsText() shouldContain "CycleTime Dashboard"
        }
    }

    "GET /dashboard/projects/{id} should return hierarchy" {
        testApplication {
            application {
                configureDashboardRoutes()
            }

            val projectId = createTestProject()
            val response = client.get("/dashboard/projects/$projectId")

            response.status shouldBe HttpStatusCode.OK
            response.bodyAsText() shouldContain "📚 Epics"
        }
    }

    "GET /dashboard/projects/invalid should return 404" {
        testApplication {
            application {
                configureDashboardRoutes()
            }

            val response = client.get("/dashboard/projects/invalid-uuid")

            response.status shouldBe HttpStatusCode.NotFound
        }
    }

    "HTMX GET /dashboard/stories/{id}/subtasks should return fragment" {
        testApplication {
            application {
                configureDashboardRoutes()
            }

            val storyId = createTestStory()
            val response = client.get("/dashboard/stories/$storyId/subtasks") {
                header("HX-Request", "true")
            }

            response.status shouldBe HttpStatusCode.OK
            // Should be HTML fragment, not full page
            response.bodyAsText() shouldNotContain "<!DOCTYPE html>"
        }
    }
})
```

## Related Documentation

- [Dashboard DTO Mapping Pattern](../../patterns/dashboard/dashboard-dto-mapping-pattern.md) - DTO structures used in responses
- [Dashboard Architecture Concept](../../concepts/dashboard/dashboard-architecture-concept.md) - Architectural context
- [Dashboard Implementation Guide](../../guides/dashboard/dashboard-implementation-guide.md) - Implementation steps
- [Dashboard Technology Stack](../dashboard/dashboard-technology-stack-reference.md) - Ktor and HTMX details
