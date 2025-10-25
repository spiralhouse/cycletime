---
title: "Ktor HTML DSL Component Examples"
type: example
domain: [ui, frontend]
description: "Complete working examples of type-safe HTML generation with Ktor HTML DSL, HTMX integration, and Tailwind styling"
dependencies: [../../patterns/ui/htmx-patterns.md, ../../patterns/ui/tailwind-design-system.md]
related: []
keywords: [ktor, html-dsl, kotlinx-html, type-safe, components, examples]
tested: false
last_updated: 2025-10-25
---

# Ktor HTML DSL Component Examples

## Overview

This document provides complete, runnable examples of building web UI components using Ktor's HTML DSL. All examples are production-ready and demonstrate integration with HTMX and Tailwind CSS.

**Key Benefits**:
- **Type Safety**: Compile-time validation of HTML structure
- **IDE Support**: Full autocomplete and refactoring
- **No Build Step**: Direct Kotlin code, no template parsing
- **Composability**: Functions as components
- **Testing**: Unit testable HTML generation

## Prerequisites

- Understanding of [HTMX Patterns](../../patterns/ui/htmx-patterns.md)
- Familiarity with [Tailwind Design System](../../patterns/ui/tailwind-design-system.md)
- Basic Kotlin knowledge
- Ktor 3.3.1+ installed

## Complete Page Layout Example

```kotlin
package io.spiralhouse.cycletime.dashboard.views

import io.spiralhouse.cycletime.dashboard.dto.*
import kotlinx.html.*

/**
 * Complete dashboard page with header, navigation, and content.
 */
fun HTML.dashboardPage(projects: List<ProjectViewDTO>, health: ServiceHealthDTO) {
    head {
        // Required meta tags
        title("CycleTime Dashboard")
        meta(charset = "UTF-8")
        meta(name = "viewport", content = "width=device-width, initial-scale=1.0")
        meta(name = "description", content = "CycleTime project management dashboard")

        // External dependencies (CDN for development)
        script(src = "https://cdn.tailwindcss.com") {}
        script(src = "https://unpkg.com/htmx.org@1.9.10") {}
        script(src = "https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js", defer = true) {}

        // Custom styles matching CycleTime design system
        style {
            unsafe {
                raw("""
                    :root {
                        --primary: #58a6ff;
                        --background: #0d1117;
                        --surface: #161b22;
                        --text: #c9d1d9;
                    }
                    body {
                        background-color: var(--background);
                        color: var(--text);
                    }
                """.trimIndent())
            }
        }
    }

    body(classes = "min-h-screen") {
        // Page header with health status
        pageHeader(health)

        // Main content area
        main(classes = "container mx-auto p-6") {
            h2(classes = "text-xl font-semibold mb-4 text-gray-200") {
                +"Projects"
            }

            // Project grid
            projectsGrid(projects)
        }

        // Footer
        pageFooter()
    }
}
```

### Explanation

#### Head Section

```kotlin
head {
    title("CycleTime Dashboard")
    meta(charset = "UTF-8")
    meta(name = "viewport", content = "width=device-width, initial-scale=1.0")

    // CDN scripts for development
    script(src = "https://cdn.tailwindcss.com") {}
    script(src = "https://unpkg.com/htmx.org@1.9.10") {}
}
```

- `title()`: Page title (appears in browser tab)
- `meta()`: Charset and viewport for responsive design
- `script(src = ...)`: Load external JavaScript libraries
- `unsafe { raw() }`: Insert raw CSS/JS (use sparingly, only for known-safe content)

#### Body Structure

```kotlin
body(classes = "min-h-screen") {
    pageHeader(health)           // Component function
    main(classes = "...") { }    // Standard HTML tag
    pageFooter()                 // Component function
}
```

- `classes`: Tailwind utility classes
- Functions like `pageHeader()` are custom components
- Standard HTML tags (`main`, `div`, `span`) map directly to DSL functions

## Component Examples

### Example 1: Page Header with Health Status

```kotlin
/**
 * Page header with branding and service health indicator.
 */
fun FlowContent.pageHeader(health: ServiceHealthDTO) {
    header(classes = "bg-gray-900 border-b border-gray-800 p-4") {
        div(classes = "container mx-auto flex justify-between items-center") {
            // Left side: Logo and title
            div(classes = "flex items-center gap-3") {
                // Logo (emoji or image)
                span(classes = "text-3xl") { +"⚙️" }

                h1(classes = "text-2xl font-bold text-blue-400") {
                    +"CycleTime Dashboard"
                }
            }

            // Right side: Health indicator
            healthStatusIndicator(health)
        }
    }
}

/**
 * Health status indicator with live updates via HTMX polling.
 */
fun FlowContent.healthStatusIndicator(health: ServiceHealthDTO) {
    div(classes = "flex items-center gap-2") {
        // Status dot (color based on health)
        val statusColor = when (health.status) {
            "healthy" -> "bg-green-400"
            "degraded" -> "bg-yellow-400"
            "unhealthy" -> "bg-red-400"
            else -> "bg-gray-400"
        }

        div(classes = "w-2 h-2 rounded-full $statusColor")

        // Status text
        span(classes = "text-sm text-gray-400") { +"Status:" }
        span(classes = "text-sm font-semibold ${if (health.status == "healthy") "text-green-400" else "text-red-400"}") {
            +health.status
        }

        // Metadata
        span(classes = "text-xs text-gray-500") {
            +"${health.projectCount} projects • ${health.issueCount} issues"
        }
    }
}
```

**Key Techniques**:
- **FlowContent**: Context for components within body/div
- **String Interpolation**: Dynamic class names with `$statusColor`
- **Conditional Styling**: Choose classes based on data
- **Composition**: `healthStatusIndicator()` called from `pageHeader()`

### Example 2: Project Card Component

```kotlin
/**
 * Project card with hover effects and navigation.
 */
fun FlowContent.projectCard(project: ProjectViewDTO) {
    a(
        href = "/dashboard/projects/${project.id}",
        classes = "block p-6 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
    ) {
        // Card header: Title and status badge
        div(classes = "flex justify-between items-start mb-3") {
            h3(classes = "text-lg font-semibold text-blue-400") {
                +project.name
            }

            statusBadge(project.status)
        }

        // Description with line clamp
        project.description?.let { desc ->
            p(classes = "text-sm text-gray-400 mb-4 line-clamp-2") {
                +desc
            }
        }

        // Statistics footer
        div(classes = "flex gap-4 text-xs text-gray-500") {
            statItem("📚", "${project.epicCount} epics")
            statItem("📖", "${project.storyCount} stories")
            statItem("📝", "${project.totalIssues} total")
        }
    }
}

/**
 * Stat item with icon and label.
 */
fun FlowContent.statItem(icon: String, label: String) {
    span(classes = "flex items-center gap-1") {
        span { +icon }
        span { +label }
    }
}
```

**Key Techniques**:
- **Null Safety**: `project.description?.let { }` handles optional fields
- **Link Component**: `a()` tag with href attribute
- **Nested Components**: `statusBadge()` and `statItem()` composed within card
- **Hover Effects**: `hover:border-blue-500` with `transition-colors`

### Example 3: Status Badge Component

```kotlin
/**
 * Status badge with color-coded background.
 */
fun FlowContent.statusBadge(status: String) {
    val (bgColor, textColor) = statusColors(status)

    span(classes = "text-xs px-2 py-1 rounded $bgColor $textColor font-medium") {
        +status.replaceFirstChar { it.uppercase() }
    }
}

/**
 * Maps status to color pair (background, text).
 */
fun statusColors(status: String): Pair<String, String> {
    return when (status.lowercase()) {
        "done", "completed" -> "bg-green-900" to "text-green-300"
        "in progress", "started" -> "bg-blue-900" to "text-blue-300"
        "todo", "backlog" -> "bg-gray-700" to "text-gray-300"
        "blocked" -> "bg-red-900" to "text-red-300"
        else -> "bg-gray-700" to "text-gray-300"
    }
}
```

**Key Techniques**:
- **Helper Functions**: `statusColors()` extracts logic
- **Destructuring**: `val (bgColor, textColor) = statusColors()`
- **String Formatting**: `replaceFirstChar { it.uppercase() }` capitalizes status
- **Reusability**: Used across multiple components

### Example 4: Projects Grid Layout

```kotlin
/**
 * Responsive grid of project cards.
 */
fun FlowContent.projectsGrid(projects: List<ProjectViewDTO>) {
    if (projects.isEmpty()) {
        emptyState("No projects yet. Create one to get started!", "📚")
    } else {
        div(classes = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4") {
            projects.forEach { project ->
                projectCard(project)
            }
        }
    }
}
```

**Key Techniques**:
- **Conditional Rendering**: Show empty state if no projects
- **Responsive Grid**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **List Iteration**: `forEach` to render multiple cards
- **Component Composition**: Calls `projectCard()` and `emptyState()`

### Example 5: Empty State Component

```kotlin
/**
 * Empty state with icon, message, and optional action.
 */
fun FlowContent.emptyState(
    message: String,
    icon: String = "📭",
    actionLabel: String? = null,
    actionHref: String? = null
) {
    div(classes = "text-center py-12") {
        // Large icon
        div(classes = "text-6xl mb-4") {
            +icon
        }

        // Message
        p(classes = "text-lg text-gray-400 mb-4") {
            +message
        }

        // Optional action button
        if (actionLabel != null && actionHref != null) {
            a(
                href = actionHref,
                classes = "inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            ) {
                +actionLabel
            }
        }
    }
}

// Usage examples
emptyState("No projects yet", "📚")
emptyState("No issues found", "🔍", "Create Issue", "/issues/new")
```

**Key Techniques**:
- **Optional Parameters**: Default values and nullable parameters
- **Conditional UI**: Show action button only if provided
- **Centering**: `text-center` and `py-12` for vertical spacing
- **Reusability**: Works for any empty state scenario

### Example 6: Loading Spinner Component

```kotlin
/**
 * Loading spinner with animated rotation.
 */
fun FlowContent.loadingSpinner(message: String = "Loading...") {
    div(classes = "htmx-indicator flex items-center gap-2 text-gray-400") {
        // Spinning circle
        div(classes = "animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400")

        // Loading message
        span(classes = "text-sm") {
            +message
        }
    }
}
```

**Key Techniques**:
- **HTMX Integration**: `htmx-indicator` class (hidden until HTMX request)
- **Animation**: `animate-spin` for rotation
- **Flexbox**: `flex items-center gap-2` for horizontal layout
- **Default Parameter**: `message = "Loading..."`

## HTMX Integration Examples

### Example 7: Lazy Loading with HTMX

```kotlin
/**
 * Story node with lazy-loaded subtasks.
 */
fun FlowContent.storyNode(story: IssueViewDTO) {
    div(classes = "bg-gray-900 rounded p-3") {
        // Story header
        div(classes = "flex justify-between items-center") {
            div(classes = "flex items-center gap-2") {
                span { +"📖" }
                span(classes = "font-medium text-gray-200") {
                    +story.title
                }
            }

            statusBadge(story.status)
        }

        // Expand subtasks button (HTMX trigger)
        if (story.childCount > 0) {
            button(
                classes = "text-xs text-blue-400 hover:underline mt-2",
                type = ButtonType.button
            ) {
                // HTMX attributes for lazy loading
                attributes["hx-get"] = "/dashboard/stories/${story.id}/subtasks"
                attributes["hx-target"] = "#subtasks-${story.id}"
                attributes["hx-swap"] = "innerHTML"
                attributes["hx-indicator"] = "#spinner-${story.id}"

                +"${story.childCount} subtasks ▼"
            }
        }

        // Target container for subtasks (loaded on demand)
        div {
            id = "subtasks-${story.id}"
            classes = setOf("mt-2", "pl-4", "space-y-1")
        }

        // Loading spinner (shown during request)
        loadingSpinner()
    }
}
```

**HTMX Attributes**:
- `hx-get`: HTTP GET request to endpoint
- `hx-target`: CSS selector for where to put response
- `hx-swap`: How to insert HTML (`innerHTML`, `outerHTML`, `beforeend`, etc.)
- `hx-indicator`: Loading spinner to show during request

**Server Endpoint** (returns HTML fragment):
```kotlin
get("/dashboard/stories/{storyId}/subtasks") {
    val storyId = call.parameters["storyId"] ?: return@get call.respond(
        HttpStatusCode.BadRequest,
        "Missing storyId"
    )

    val service: DashboardApplicationService by application.dependencies
    val subtasks = service.getStorySubtasks(storyId)

    call.respondHtml(HttpStatusCode.OK) {
        // Return HTML fragment, not full page
        subtasks.forEach { subtask ->
            subtaskItem(subtask)
        }
    }
}
```

### Example 8: Form Submission with HTMX

```kotlin
/**
 * Project creation form with HTMX submission.
 */
fun FlowContent.createProjectForm() {
    form(classes = "space-y-4") {
        // HTMX form submission
        attributes["hx-post"] = "/api/projects"
        attributes["hx-target"] = "#form-feedback"
        attributes["hx-swap"] = "innerHTML"

        // Name field
        div {
            label(classes = "block text-sm font-medium text-gray-300") {
                htmlFor = "project-name"
                +"Project Name"
            }
            input(
                type = InputType.text,
                name = "name",
                classes = "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:ring-2 focus:ring-blue-400"
            ) {
                id = "project-name"
                placeholder = "Enter project name"
                required = true
            }
        }

        // Description field
        div {
            label(classes = "block text-sm font-medium text-gray-300") {
                htmlFor = "project-description"
                +"Description"
            }
            textArea(
                name = "description",
                classes = "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:ring-2 focus:ring-blue-400"
            ) {
                id = "project-description"
                rows = "3"
                placeholder = "Describe your project"
            }
        }

        // Submit button
        button(
            type = ButtonType.submit,
            classes = "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        ) {
            +"Create Project"
        }

        // Feedback area (filled by HTMX response)
        div {
            id = "form-feedback"
            classes = setOf("mt-4")
        }
    }
}
```

**Server Endpoint** (handles form submission):
```kotlin
post("/api/projects") {
    val name = call.receiveParameters()["name"]
    val description = call.receiveParameters()["description"]

    // Server-side validation
    if (name.isNullOrBlank()) {
        call.respondHtml(HttpStatusCode.UnprocessableEntity) {
            errorBanner("Project name is required")
        }
        return@post
    }

    val service: ProjectService by application.dependencies
    val project = service.createProject(name, description)

    // Return success message
    call.respondHtml(HttpStatusCode.OK) {
        successBanner("Project created: ${project.name}")
    }
}
```

### Example 9: Error and Success Banners

```kotlin
/**
 * Error banner for validation failures.
 */
fun FlowContent.errorBanner(message: String) {
    div(classes = "bg-red-900/50 border border-red-700 rounded p-4") {
        div(classes = "flex items-center gap-2") {
            span(classes = "text-2xl") { +"⚠️" }
            p(classes = "text-red-200") {
                +message
            }
        }
    }
}

/**
 * Success banner for successful operations.
 */
fun FlowContent.successBanner(message: String) {
    div(classes = "bg-green-900/50 border border-green-700 rounded p-4") {
        div(classes = "flex items-center gap-2") {
            span(classes = "text-2xl") { +"✅" }
            p(classes = "text-green-200") {
                +message
            }
        }
    }
}
```

**Usage**:
```kotlin
// In server response
call.respondHtml(HttpStatusCode.OK) {
    successBanner("Operation completed successfully!")
}

call.respondHtml(HttpStatusCode.UnprocessableEntity) {
    errorBanner("Validation failed: Name is required")
}
```

## Hierarchical Display Example

### Example 10: Epic Hierarchy with Nested Stories

```kotlin
/**
 * Epic node with expandable stories.
 */
fun FlowContent.epicNode(epic: IssueHierarchyNode) {
    div(classes = "border border-gray-700 rounded-lg bg-gray-800 p-4") {
        // Epic header
        div(classes = "flex justify-between items-start mb-3") {
            div(classes = "flex-1") {
                // Epic title with icon
                div(classes = "flex items-center gap-2 mb-1") {
                    span { +"📚" }
                    h3(classes = "text-lg font-semibold text-gray-200") {
                        +epic.issue.title
                    }
                }

                // Epic description
                epic.issue.description?.let { desc ->
                    p(classes = "text-sm text-gray-400 mt-1") {
                        +desc
                    }
                }
            }

            // Status badge
            statusBadge(epic.issue.status)
        }

        // Stories in this epic (nested with left border)
        if (epic.children.isNotEmpty()) {
            div(classes = "mt-4 space-y-2 pl-4 border-l-2 border-gray-700") {
                epic.children.forEach { story ->
                    storyNode(story.issue)
                }
            }
        } else {
            // Empty state for epic with no stories
            p(classes = "text-sm text-gray-500 italic mt-2") {
                +"No stories yet"
            }
        }
    }
}
```

**Key Techniques**:
- **Nested Structure**: Stories indented with `pl-4` and `border-l-2`
- **Visual Hierarchy**: Icons (📚 Epic, 📖 Story) differentiate levels
- **Conditional Content**: Show empty state if no children
- **Spacing**: `space-y-2` for consistent vertical spacing

## Advanced Patterns

### Example 11: Ktor Route Integration

```kotlin
package io.spiralhouse.cycletime.dashboard.routes

import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.http.*
import io.spiralhouse.cycletime.application.services.DashboardApplicationService
import io.spiralhouse.cycletime.dashboard.views.*

/**
 * Configure dashboard routes with HTML DSL responses.
 */
fun Route.configureDashboardRoutes() {
    route("/dashboard") {
        // Main dashboard page
        get {
            val service: DashboardApplicationService by application.dependencies
            val projects = service.listProjects()
            val health = service.getServiceHealth()

            // respondHtml returns type-safe HTML
            call.respondHtml(HttpStatusCode.OK) {
                dashboardPage(projects, health)
            }
        }

        // Project detail page
        get("/projects/{projectId}") {
            val projectId = call.parameters["projectId"] ?: return@get call.respond(
                HttpStatusCode.BadRequest,
                "Missing projectId"
            )

            val service: DashboardApplicationService by application.dependencies
            val hierarchy = service.getProjectHierarchy(projectId)
                ?: return@get call.respond(HttpStatusCode.NotFound, "Project not found")

            call.respondHtml(HttpStatusCode.OK) {
                projectDetailPage(hierarchy)
            }
        }

        // HTMX fragment endpoint
        get("/stories/{storyId}/subtasks") {
            val storyId = call.parameters["storyId"] ?: return@get call.respond(
                HttpStatusCode.BadRequest,
                "Missing storyId"
            )

            val service: DashboardApplicationService by application.dependencies
            val subtasks = service.getStorySubtasks(storyId)

            // Return HTML fragment (not full page)
            call.respondHtml(HttpStatusCode.OK) {
                subtasks.forEach { subtask ->
                    subtaskItem(subtask)
                }
            }
        }
    }
}
```

### Example 12: Component with Mermaid Diagram

```kotlin
/**
 * Architecture diagram using Mermaid.js.
 */
fun FlowContent.architectureDiagram() {
    div(classes = "p-6 bg-gray-800 rounded-lg") {
        h3(classes = "text-lg font-semibold mb-4") {
            +"System Architecture"
        }

        // Mermaid diagram
        pre(classes = "mermaid") {
            unsafe {
                raw("""
                    graph TB
                        Browser[Browser] --> Ktor[Ktor Server]
                        Ktor --> Service[Application Service]
                        Service --> Repo[Repository]
                        Repo --> DB[(Database)]
                """.trimIndent())
            }
        }
    }

    // Mermaid.js script (add to head section)
    script(src = "https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js") {}
    script {
        unsafe {
            raw("mermaid.initialize({ startOnLoad: true, theme: 'dark' });")
        }
    }
}
```

## Testing HTML Components

### Example 13: Unit Testing HTML Generation

```kotlin
package io.spiralhouse.cycletime.dashboard.views

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldNotContain
import io.spiralhouse.cycletime.dashboard.dto.*
import kotlinx.html.stream.createHTML
import java.time.Instant

class DashboardViewsTest : StringSpec({

    "projectCard should render project name" {
        val project = ProjectViewDTO(
            id = "123",
            name = "Test Project",
            description = "Test Description",
            status = "Active",
            epicCount = 5,
            storyCount = 10,
            totalIssues = 25,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )

        val html = createHTML().div {
            projectCard(project)
        }

        html shouldContain "Test Project"
        html shouldContain "Test Description"
        html shouldContain "5 epics"
        html shouldContain "10 stories"
    }

    "statusBadge should render correct colors" {
        val html = createHTML().div {
            statusBadge("done")
        }

        html shouldContain "bg-green-900"
        html shouldContain "text-green-300"
    }

    "emptyState should show action button when provided" {
        val html = createHTML().div {
            emptyState("No items", "📭", "Create Item", "/items/new")
        }

        html shouldContain "No items"
        html shouldContain "Create Item"
        html shouldContain "/items/new"
    }

    "emptyState should not show action button when omitted" {
        val html = createHTML().div {
            emptyState("No items", "📭")
        }

        html shouldContain "No items"
        html shouldNotContain "href="
    }
})
```

## Common Patterns Reference

### Pattern: Reusable Button Component

```kotlin
fun FlowContent.button(
    label: String,
    variant: String = "primary",
    type: ButtonType = ButtonType.button,
    onClick: String? = null
) {
    val classes = when (variant) {
        "primary" -> "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        "secondary" -> "px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors"
        "danger" -> "px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        else -> "px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
    }

    button(classes = classes, type = type) {
        onClick?.let { attributes["onclick"] = it }
        +label
    }
}

// Usage
button("Save", variant = "primary", type = ButtonType.submit)
button("Cancel", variant = "secondary")
button("Delete", variant = "danger", onClick = "confirmDelete()")
```

### Pattern: Card with Header and Footer

```kotlin
fun FlowContent.card(
    title: String,
    footer: (FlowContent.() -> Unit)? = null,
    content: FlowContent.() -> Unit
) {
    div(classes = "p-6 bg-gray-800 rounded-lg border border-gray-700") {
        // Header
        h3(classes = "text-lg font-semibold mb-4 text-gray-200") {
            +title
        }

        // Content
        div(classes = "mb-4") {
            content()
        }

        // Optional footer
        footer?.let {
            div(classes = "border-t border-gray-700 pt-4") {
                it()
            }
        }
    }
}

// Usage
card("Project Details") {
    p { +"This is the content" }
}

card("Project Details", footer = {
    button("Edit", variant = "primary")
}) {
    p { +"Content with footer" }
}
```

## Best Practices

### 1. Component Organization

```kotlin
// Organize by feature/domain
package io.spiralhouse.cycletime.dashboard.views

// Page-level components
fun HTML.dashboardPage() { }
fun HTML.projectDetailPage() { }

// Section components
fun FlowContent.pageHeader() { }
fun FlowContent.projectsGrid() { }

// Card components
fun FlowContent.projectCard() { }
fun FlowContent.epicCard() { }

// Element components
fun FlowContent.statusBadge() { }
fun FlowContent.loadingSpinner() { }
```

### 2. Type Safety

```kotlin
// ✅ Good: Type-safe attributes
div {
    id = "content"
    classes = setOf("p-4", "bg-gray-800")
}

// ❌ Bad: String attributes (error-prone)
div {
    attributes["class"] = "p-4 bg-gray-800"
}
```

### 3. Null Safety

```kotlin
// ✅ Good: Handle optional fields
project.description?.let { desc ->
    p { +desc }
}

// ❌ Bad: Risk of null pointer
p { +project.description!! }
```

### 4. Composition Over Inheritance

```kotlin
// ✅ Good: Compose smaller components
fun FlowContent.epicNode(epic: IssueHierarchyNode) {
    div {
        epicHeader(epic.issue)
        epic.children.forEach { story ->
            storyNode(story)
        }
    }
}

// ❌ Bad: Monolithic component with all logic
fun FlowContent.epicNodeWithEverything() {
    // 200 lines of HTML...
}
```

## Related Examples

- [HTMX Patterns](../../patterns/ui/htmx-patterns.md) - Server-driven interactivity
- [Tailwind Design System](../../patterns/ui/tailwind-design-system.md) - Styling patterns

## References

- [kotlinx.html Documentation](https://github.com/Kotlin/kotlinx.html)
- [Ktor HTML DSL](https://ktor.io/docs/html-dsl.html)
- [HTMX + Ktor Integration](https://htmx.org/docs/)
