---
title: "HTMX Patterns for Server-Driven UIs"
type: pattern
domain: [ui, frontend]
description: "Progressive enhancement patterns using HTMX for server-driven interactivity without heavy JavaScript"
dependencies: []
related: [tailwind-design-system.md, ../../examples/ui/ktor-html-dsl-examples.md]
keywords: [htmx, progressive-enhancement, server-driven, hypermedia, ajax]
difficulty: intermediate
last_updated: 2025-10-25
---

# HTMX Patterns for Server-Driven UIs

## Problem

Modern web applications often require dynamic, interactive user experiences. Traditional approaches present two extremes:

1. **Full Page Reloads**: Simple but slow, poor UX, lost scroll position
2. **Heavy SPAs**: Complex state management, large JavaScript bundles, poor SEO, difficult to maintain

**The Challenge**: How do we build interactive UIs that are:
- Fast and responsive
- Simple to maintain
- Work without JavaScript (progressive enhancement)
- Don't require megabytes of client-side framework code
- Keep business logic on the server where it's secure and testable

## Solution

**HTMX** enables server-driven interactivity through HTML attributes. The server returns HTML fragments (not JSON), which HTMX swaps into the page without full reloads.

**Core Philosophy**:
- HTML is the API response format (hypermedia)
- Server is the source of truth
- Minimal client-side state
- Progressive enhancement (works without JS)
- Use standard HTTP methods and status codes

## Implementation

### Structure

```mermaid
%%{init: {'theme':'dark'}}%%
sequenceDiagram
    participant Browser
    participant HTMX
    participant Server
    participant Database

    Browser->>HTMX: User clicks button with hx-get
    HTMX->>Server: HTTP GET /api/content
    Server->>Database: Query data
    Database-->>Server: Return data
    Server-->>HTMX: HTML fragment
    HTMX->>Browser: Swap HTML into target
    Browser->>Browser: Update UI (no reload)
```

### Key Components

**1. HTMX Attributes**: Declarative triggers and targets
- `hx-get`, `hx-post`, `hx-put`, `hx-delete`: HTTP methods
- `hx-trigger`: When to fire (click, change, revealed, etc.)
- `hx-target`: Where to put the response
- `hx-swap`: How to swap content (innerHTML, outerHTML, beforeend, etc.)
- `hx-indicator`: Loading state element

**2. Server-Side Rendering**: Server returns HTML fragments
- Ktor HTML DSL generates type-safe HTML
- Returns fragments for HTMX, full pages for direct navigation
- Business logic stays on server

**3. Progressive Enhancement**: Base HTML works without JavaScript
- Links and forms work without HTMX
- HTMX enhances with better UX
- Graceful degradation for accessibility

### Pattern 1: Lazy Loading Content

**Use Case**: Load content on demand to reduce initial page size

```kotlin
// Ktor route - returns HTML fragment
get("/dashboard/stories/{storyId}/subtasks") {
    val storyId = call.parameters["storyId"] ?: return@get call.respond(
        HttpStatusCode.BadRequest,
        "Missing storyId"
    )

    val service: DashboardApplicationService by application.dependencies
    val subtasks = service.getStorySubtasks(storyId)

    call.respondHtml(HttpStatusCode.OK) {
        // HTML fragment, not full page
        div {
            subtasks.forEach { subtask ->
                div(classes = "flex items-center gap-2 text-sm text-gray-400") {
                    span { +"📝" }
                    span { +subtask.title }
                    span(classes = "text-xs px-2 py-1 rounded bg-blue-900 text-blue-300") {
                        +"${subtask.estimate} pts"
                    }
                }
            }
        }
    }
}
```

```kotlin
// HTML with HTMX attributes
fun FlowContent.storyNode(story: IssueViewDTO) {
    div(classes = "bg-gray-900 rounded p-3") {
        // Expandable button
        if (story.childCount > 0) {
            button(
                classes = "text-xs text-blue-400 hover:underline",
                type = ButtonType.button
            ) {
                attributes["hx-get"] = "/dashboard/stories/${story.id}/subtasks"
                attributes["hx-target"] = "#subtasks-${story.id}"
                attributes["hx-swap"] = "innerHTML"
                attributes["hx-indicator"] = "#spinner-${story.id}"

                +"${story.childCount} subtasks ▼"
            }
        }

        // Target container for lazy-loaded content
        div {
            id = "subtasks-${story.id}"
            classes = setOf("mt-2", "pl-4", "space-y-1")
        }

        // Loading spinner (shown during request)
        div {
            id = "spinner-${story.id}"
            classes = setOf("htmx-indicator", "text-sm", "text-gray-500")
            +"Loading..."
        }
    }
}
```

**Benefits**:
- Reduces initial page load by 50-70% for hierarchical data
- Content loads only when needed
- Server controls HTML structure and styling

### Pattern 2: Infinite Scroll

**Use Case**: Load more content as user scrolls down

```kotlin
// Server endpoint - returns next page of items
get("/api/items") {
    val page = call.request.queryParameters["page"]?.toIntOrNull() ?: 1
    val pageSize = 20

    val service: ItemService by application.dependencies
    val items = service.getItems(page, pageSize)

    call.respondHtml(HttpStatusCode.OK) {
        items.forEach { item ->
            itemCard(item)
        }

        // Next page trigger (revealed when scrolled into view)
        if (items.size == pageSize) {
            div {
                attributes["hx-get"] = "/api/items?page=${page + 1}"
                attributes["hx-trigger"] = "revealed"
                attributes["hx-swap"] = "afterend"

                // Placeholder/loading state
                +"Loading more..."
            }
        }
    }
}
```

```kotlin
// Initial page setup
fun HTML.itemsPage() {
    body {
        div(classes = "container mx-auto p-6") {
            div {
                id = "items-list"

                // Initial items loaded server-side
                items.forEach { item ->
                    itemCard(item)
                }

                // Infinite scroll trigger
                div {
                    attributes["hx-get"] = "/api/items?page=2"
                    attributes["hx-trigger"] = "revealed"
                    attributes["hx-swap"] = "afterend"

                    +"Loading more..."
                }
            }
        }
    }
}
```

**Benefits**:
- Smooth pagination without clicks
- `revealed` trigger fires when element scrolls into view
- Server maintains page state

### Pattern 3: Optimistic UI Updates

**Use Case**: Immediate feedback while server processes request

```kotlin
// Server endpoint - processes form and returns updated HTML
post("/api/items") {
    val name = call.receiveParameters()["name"] ?: return@post call.respond(
        HttpStatusCode.BadRequest,
        "Missing name"
    )

    val service: ItemService by application.dependencies
    val newItem = service.createItem(name)

    call.respondHtml(HttpStatusCode.OK) {
        itemCard(newItem)
    }
}
```

```kotlin
// Form with optimistic update
fun FlowContent.createItemForm() {
    form(
        classes = "flex gap-2"
    ) {
        attributes["hx-post"] = "/api/items"
        attributes["hx-target"] = "#items-list"
        attributes["hx-swap"] = "beforeend"
        attributes["hx-on::before-request"] = "this.reset()" // Clear form immediately

        input(
            type = InputType.text,
            name = "name",
            classes = "px-3 py-2 bg-gray-800 border border-gray-700 rounded"
        ) {
            placeholder = "Item name"
        }

        button(
            type = ButtonType.submit,
            classes = "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        ) {
            +"Add Item"
        }
    }

    div {
        id = "items-list"
        classes = setOf("mt-4", "space-y-2")
    }
}
```

**Benefits**:
- Form resets immediately (feels instant)
- New item appears without page reload
- Server validates and returns canonical HTML

### Pattern 4: Polling for Live Updates

**Use Case**: Keep data fresh with periodic server checks

```kotlin
// Server endpoint - returns current status
get("/api/health") {
    val service: HealthService by application.dependencies
    val health = service.getServiceHealth()

    call.respondHtml(HttpStatusCode.OK) {
        div(classes = "flex items-center gap-2") {
            // Status indicator
            div(classes = "w-2 h-2 rounded-full ${if (health.isHealthy) "bg-green-400" else "bg-red-400"}")
            span(classes = "text-sm ${if (health.isHealthy) "text-green-400" else "text-red-400"}") {
                +health.status
            }
            span(classes = "text-xs text-gray-500") {
                +"${health.projectCount} projects • ${health.issueCount} issues"
            }
        }
    }
}
```

```kotlin
// Polling element
fun FlowContent.healthStatus() {
    div {
        id = "health-status"
        attributes["hx-get"] = "/api/health"
        attributes["hx-trigger"] = "every 5s" // Poll every 5 seconds
        attributes["hx-swap"] = "innerHTML"

        // Initial state
        +"Loading status..."
    }
}
```

**Benefits**:
- Simple polling without WebSockets
- Server-controlled update frequency
- Automatic cleanup when element removed from DOM

### Pattern 5: Form Submission with Validation

**Use Case**: Submit forms with server-side validation and error handling

```kotlin
// Server endpoint with validation
post("/api/projects") {
    val name = call.receiveParameters()["name"]
    val description = call.receiveParameters()["description"]

    // Validate on server
    if (name.isNullOrBlank()) {
        call.respondHtml(HttpStatusCode.UnprocessableEntity) {
            div(classes = "bg-red-900/50 border border-red-700 rounded p-4") {
                p(classes = "text-red-200") {
                    +"Project name is required"
                }
            }
        }
        return@post
    }

    val service: ProjectService by application.dependencies
    val project = service.createProject(name, description)

    // Return success UI
    call.respondHtml(HttpStatusCode.OK) {
        div(classes = "bg-green-900/50 border border-green-700 rounded p-4") {
            p(classes = "text-green-200") {
                +"Project created successfully: ${project.name}"
            }
        }
    }
}
```

```kotlin
// Form with validation feedback
fun FlowContent.projectForm() {
    form(classes = "space-y-4") {
        attributes["hx-post"] = "/api/projects"
        attributes["hx-target"] = "#form-feedback"
        attributes["hx-swap"] = "innerHTML"

        div {
            label(classes = "block text-sm font-medium text-gray-300") {
                +"Project Name"
            }
            input(
                type = InputType.text,
                name = "name",
                classes = "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
            )
        }

        div {
            label(classes = "block text-sm font-medium text-gray-300") {
                +"Description"
            }
            textArea(
                name = "description",
                classes = "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
            ) {
                rows = "3"
            }
        }

        button(
            type = ButtonType.submit,
            classes = "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        ) {
            +"Create Project"
        }

        // Feedback area
        div {
            id = "form-feedback"
            classes = setOf("mt-4")
        }
    }
}
```

**Benefits**:
- Server-side validation (secure)
- Clear error messages
- Success/error states rendered by server

## Considerations

### When to Use

- **Read-Heavy Applications**: Dashboards, content sites, admin panels
- **Hierarchical Data**: Tree structures, nested content
- **Progressive Enhancement**: Need to work without JavaScript
- **Simple State Management**: Server is source of truth
- **Security-Critical**: Business logic must stay on server

### When NOT to Use

- **Complex Client-Side State**: Shopping cart, multi-step wizards requiring local state
- **Offline-First Apps**: Need to work without network connection
- **Real-Time Collaboration**: Simultaneous multi-user editing (use WebSockets)
- **High-Frequency Updates**: Stock tickers, gaming (use WebSockets or SSE)
- **Heavy Client-Side Logic**: Complex calculations, data transformations on client

### Trade-offs

**Pros**:
- **Simplicity**: No complex state management, no Redux/MobX
- **Security**: Business logic stays on server
- **SEO Friendly**: Real HTML, not client-rendered
- **Small Bundle**: ~14KB (vs 100KB+ for React)
- **Progressive Enhancement**: Works without JavaScript
- **Maintainability**: One language (Kotlin), one codebase

**Cons**:
- **Network Dependency**: Every interaction requires server round-trip
- **Limited Offline**: Requires network connection
- **Server Load**: More server requests (mitigated by caching)
- **Complex State**: Difficult for client-heavy workflows
- **Real-Time Limitations**: Polling has latency, not instant

## Integration with Ktor

### CDN Setup (Development)

```kotlin
fun HTML.dashboardPage() {
    head {
        title("CycleTime Dashboard")
        meta(charset = "UTF-8")
        meta(name = "viewport", content = "width=device-width, initial-scale=1.0")

        // HTMX via CDN
        script(src = "https://unpkg.com/htmx.org@1.9.10") {}

        // Optional extensions
        script(src = "https://unpkg.com/htmx.org@1.9.10/dist/ext/debug.js") {}
    }

    body {
        attributes["hx-ext"] = "debug" // Enable HTMX debugging in console
        // Page content
    }
}
```

### Production Build

For production, download and serve HTMX locally:

```kotlin
// Serve static assets
static("/static") {
    resources("dashboard/static")
}
```

```
src/main/resources/dashboard/static/
├── js/
│   └── htmx.min.js
└── css/
    └── styles.css
```

### Error Handling

```kotlin
// Client-side error handling
script {
    unsafe {
        raw("""
            document.body.addEventListener('htmx:responseError', function(evt) {
                // Show error banner
                const errorDiv = document.createElement('div');
                errorDiv.className = 'bg-red-900/50 border border-red-700 rounded p-4 mb-4';
                errorDiv.innerHTML = '<p class="text-red-200">Failed to load content. Please try again.</p>';
                document.body.prepend(errorDiv);

                // Auto-remove after 5 seconds
                setTimeout(() => errorDiv.remove(), 5000);
            });
        """.trimIndent())
    }
}
```

## Performance Optimizations

### 1. Caching Strategy

```kotlin
class DashboardApplicationService(
    private val cache: DashboardCache
) {
    suspend fun getProjectHierarchy(projectId: String): ProjectHierarchyDTO? {
        return cache.getOrPut("project:$projectId:hierarchy", ttl = 5.minutes) {
            // Expensive query
            buildProjectHierarchy(projectId)
        }
    }
}
```

### 2. Request Debouncing

```html
<!-- Debounce search input -->
<input
    type="text"
    name="search"
    hx-get="/api/search"
    hx-trigger="keyup changed delay:500ms"
    hx-target="#results"
    placeholder="Search...">
```

### 3. Response Compression

```kotlin
install(Compression) {
    gzip {
        priority = 1.0
    }
    deflate {
        priority = 10.0
        minimumSize(1024) // bytes
    }
}
```

### Pattern 6: Hierarchical Expansion Pattern

**Use Case**: Lazy-load hierarchical data (Epic → Story → Subtask) using HTMX to expand/collapse parent-child relationships on demand.

**Problem**: Displaying deeply nested hierarchical data in a single page load is slow and overwhelming. Full tree expansion can render hundreds of items unnecessarily.

**Solution**: Load only top-level items initially, then lazy-load children when user expands a parent node.

```kotlin
// Server endpoint - returns child issues as HTML fragment
get("/api/issues/{issueId}/children") {
    val issueId = call.parameters["issueId"]
        ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing issueId")

    val service: DashboardApplicationService by application.dependencies
    val children = service.getIssueChildren(issueId)

    call.respondHtml(HttpStatusCode.OK) {
        // Return HTML fragment, not full page
        children.forEach { child ->
            issueRow(child, depth = 1)  // Depth controls indentation
        }
    }
}

// Recursive issue row component
fun FlowContent.issueRow(issue: IssueViewDTO, depth: Int) {
    val indentClass = when (depth) {
        0 -> ""                     // No indentation for top-level
        1 -> "ml-4 md:ml-8"         // 1rem/2rem for first level
        2 -> "ml-8 md:ml-16"        // 2rem/4rem for second level
        else -> "ml-12 md:ml-24"    // 3rem/6rem for deeper levels
    }

    div(classes = "issue-row bg-neutral-900 border-l-2 border-neutral-700 rounded-lg p-3 $indentClass depth-$depth") {
        attributes["data-issue-id"] = issue.id
        attributes["data-depth"] = depth.toString()

        div(classes = "flex items-start gap-3") {
            // Expansion button (only if has children)
            if (issue.childCount > 0) {
                button(classes = "expand-btn flex-shrink-0 p-1 text-neutral-400 hover:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded") {
                    attributes["hx-get"] = "/api/issues/${issue.id}/children"
                    attributes["hx-target"] = "#children-${issue.id}"
                    attributes["hx-swap"] = "innerHTML"
                    attributes["hx-trigger"] = "click once"  // Load only once
                    attributes["aria-label"] = "Expand to show ${issue.childCount} children"
                    attributes["aria-expanded"] = "false"
                    attributes["aria-controls"] = "children-${issue.id}"
                    attributes["_"] = """
                        on htmx:afterRequest toggle [@aria-expanded='true', 'false']
                        on click toggle .rotate-90 on <svg/> in me
                        on click toggle .hidden on #children-${issue.id}
                    """.trimIndent()

                    // Chevron icon
                    svg(classes = "chevron-icon w-5 h-5") {
                        attributes["fill"] = "none"
                        attributes["stroke"] = "currentColor"
                        attributes["viewBox"] = "0 0 24 24"
                        unsafe {
                            raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>""")
                        }
                    }
                }
            } else {
                // Spacer for alignment when no expansion button
                div(classes = "w-6 flex-shrink-0")
            }

            // Issue content
            div(classes = "flex-1 min-w-0") {
                div(classes = "flex flex-wrap items-center gap-2 mb-1") {
                    span { +issue.title }
                    statusBadge(issue.status)
                }

                if (issue.childCount > 0) {
                    span(classes = "text-xs text-neutral-400") {
                        +"${issue.childCount} children"
                    }
                }
            }
        }

        // Children container (populated on expansion)
        if (issue.childCount > 0) {
            div {
                id = "children-${issue.id}"
                classes = setOf("children-container", "hidden", "mt-2", "space-y-2")
            }
        }
    }
}
```

**Client-Side HTML** (Initial Page Load):

```html
<!-- Parent issue (Epic) - Depth 0 -->
<div class="issue-row bg-neutral-900 border border-neutral-800 rounded-lg p-4"
     data-issue-id="SPI-834"
     data-depth="0">
  <div class="flex items-start gap-3">
    <!-- Expansion button -->
    <button class="expand-btn"
            hx-get="/api/issues/SPI-834/children"
            hx-target="#children-SPI-834"
            hx-swap="innerHTML"
            hx-trigger="click once"
            aria-expanded="false"
            aria-controls="children-SPI-834"
            _="on htmx:afterRequest toggle [@aria-expanded='true', 'false']
               on click toggle .rotate-90 on <svg/> in me
               on click toggle .hidden on #children-SPI-834">
      <svg class="chevron-icon w-5 h-5"><!-- chevron SVG --></svg>
    </button>

    <!-- Issue content -->
    <div class="flex-1">
      <span>SPI-834</span>
      <span>Design Web UI</span>
      <span class="status-badge">In Progress</span>
      <span>4 stories</span>
    </div>
  </div>
</div>

<!-- Children container (initially empty and hidden) -->
<div id="children-SPI-834" class="children-container hidden mt-2 ml-4 md:ml-8 space-y-2">
  <!-- Stories will be loaded here via HTMX -->
</div>
```

**Server Response** (HTMX request to `/api/issues/SPI-834/children`):

```html
<!-- Story 1 - Depth 1 -->
<div class="issue-row bg-neutral-900 border-l-2 border-neutral-700 rounded-lg p-3 ml-4 md:ml-8 depth-1"
     data-issue-id="SPI-835"
     data-depth="1">
  <div class="flex items-start gap-3">
    <div class="w-6 flex-shrink-0"></div>  <!-- No children, so spacer -->
    <div class="flex-1">
      <span>SPI-835</span>
      <span>Design System Foundation</span>
      <span class="status-badge">Done</span>
    </div>
  </div>
</div>

<!-- Story 2 with subtasks - Depth 1 -->
<div class="issue-row bg-neutral-900 border-l-2 border-neutral-700 rounded-lg p-3 ml-4 md:ml-8 depth-1"
     data-issue-id="SPI-838"
     data-depth="1">
  <div class="flex items-start gap-3">
    <!-- Has children, so expansion button -->
    <button class="expand-btn"
            hx-get="/api/issues/SPI-838/children"
            hx-target="#children-SPI-838"
            hx-swap="innerHTML"
            hx-trigger="click once">
      <svg class="chevron-icon w-4 h-4"><!-- smaller chevron for nested --></svg>
    </button>

    <div class="flex-1">
      <span>SPI-838</span>
      <span>Issue List UX</span>
      <span>3 subtasks</span>
    </div>
  </div>
</div>

<!-- Subtasks container (nested expansion) -->
<div id="children-SPI-838" class="children-container hidden mt-2 ml-4 md:ml-8 space-y-2">
  <!-- Subtasks will be loaded here if user expands SPI-838 -->
</div>
```

**State Management Strategies**:

| Strategy | Pros | Cons | Recommended |
|----------|------|------|-------------|
| **CSS-only** (checkbox hack) | No server state, fast | Limited to browser session, no deep linking | ❌ Too limited |
| **Client-side JS** | Fast, flexible | No bookmarkability, state lost on refresh | ❌ Not HTMX-first |
| **Session-based** | Stateful, can restore state | Requires session storage, not bookmarkable | ⚠️ Acceptable |
| **URL parameters** | Bookmarkable, shareable, stateless | URL can get long with many expansions | ✅ **Recommended** |

**Recommended Implementation**: URL parameter tracking

```kotlin
// Read expansion state from URL
get("/api/issues") {
    val expandedIds = call.request.queryParameters["expanded"]?.split(",") ?: emptyList()
    val projectFilter = call.request.queryParameters["project"]
    val statusFilter = call.request.queryParameters["status"]

    val issues = service.getFilteredIssues(projectFilter, statusFilter)

    call.respondHtml {
        issues.forEach { issue ->
            issueRow(issue, depth = 0)

            // Pre-expand if in URL params
            if (issue.id in expandedIds) {
                val children = service.getIssueChildren(issue.id)
                div {
                    id = "children-${issue.id}"
                    classes = setOf("children-container", "mt-2", "space-y-2")  // NOT hidden

                    children.forEach { child ->
                        issueRow(child, depth = 1)
                    }
                }
            }
        }
    }
}
```

**URL Structure Example**:
```
/issues?project=cycletime&status=in-progress&expanded=SPI-834,SPI-838
```

**Benefits**:
- **Bookmarkable**: Users can save and share specific expanded views
- **Deep linkable**: Direct link to specific hierarchy state
- **Stateless**: No server-side session required
- **Fast**: Expanded state persists across page reloads

**Accessibility Requirements**:

```html
<!-- REQUIRED attributes for screen readers -->
<button aria-expanded="false"           <!-- Current state -->
        aria-controls="children-SPI-834"  <!-- Container it controls -->
        aria-label="Expand to show 4 stories">  <!-- Action description -->
```

**Update `aria-expanded` on toggle**:
- Use hyperscript: `on htmx:afterRequest toggle [@aria-expanded='true', 'false']`
- Or JavaScript: `button.setAttribute('aria-expanded', isExpanded ? 'true' : 'false')`

**Keyboard Navigation**:
- Tab: Focus expansion buttons
- Enter/Space: Toggle expansion
- Arrow keys (optional): Navigate between issues

**CSS Animations**:

```css
/* Chevron rotation */
.chevron-icon {
    transition: transform 0.2s ease-in-out;
}

.chevron-icon.rotate-90 {
    transform: rotate(90deg);
}

/* Children container slide */
.children-container {
    overflow: hidden;
    transition: max-height 0.3s ease-in-out, opacity 0.2s ease-in-out;
}

.children-container.hidden {
    max-height: 0;
    opacity: 0;
}

.children-container:not(.hidden) {
    max-height: 2000px;  /* Large enough for content */
    opacity: 1;
}
```

**Responsive Considerations**:

```kotlin
// Mobile: Reduce indentation to prevent horizontal overflow
val indentClass = when {
    depth == 0 -> ""
    depth == 1 && isMobile -> "ml-4"     // 1rem on mobile
    depth == 1 -> "md:ml-8"              // 2rem on desktop
    depth == 2 && isMobile -> "ml-8"     // 2rem on mobile
    depth == 2 -> "md:ml-16"             // 4rem on desktop
    else -> "ml-12 md:ml-24"
}
```

**Performance Optimization**:

1. **Cache children queries**:
```kotlin
suspend fun getIssueChildren(issueId: String): List<IssueViewDTO> {
    return cache.getOrPut("issue:$issueId:children", ttl = 5.minutes) {
        issueRepository.findByParent(IssueId(issueId))
            .map { DashboardMapper.toIssueView(it) }
    }
}
```

2. **Use `hx-trigger="click once"`**: Prevents redundant server requests on repeated expansion

3. **Invalidate cache on issue updates**:
```kotlin
suspend fun updateIssue(issueId: String, updates: IssueUpdateDTO) {
    val issue = issueRepository.update(issueId, updates)

    // Invalidate parent and children caches
    cache.invalidate("issue:${issue.parentId}:children")
    cache.invalidate("issue:${issue.id}:children")
}
```

**Live Reference**:

See complete working example in [issues-page.html mockup](../../reference/ui/mockup-catalog.md#issues-page) demonstrating:
- Three-level hierarchy (Epic → Story → Subtask)
- Real SPI-834 hierarchy with mixed statuses
- Filter coordination with expansion state
- Mobile responsive indentation
- Accessibility with ARIA attributes

**Testing Checklist**:
- [ ] Expansion loads children without page reload
- [ ] Chevron rotates on expansion
- [ ] `aria-expanded` updates correctly
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] URL parameters update with `hx-push-url`
- [ ] Bookmarking expanded state works
- [ ] Children load only once (no duplicate requests)
- [ ] Mobile indentation prevents horizontal scroll
- [ ] Empty children containers don't cause layout shift

## Related Patterns

- [Tailwind Design System](tailwind-design-system.md) - Styling HTMX-powered UIs
- [Ktor HTML DSL Examples](../../examples/ui/ktor-html-dsl-examples.md) - Type-safe HTML generation

## Examples

- [CycleTime Dashboard Implementation](../../design/spi-690-dashboard-design.md) - Complete HTMX dashboard
- [Lazy Loading Pattern](../../examples/ui/ktor-html-dsl-examples.md#lazy-loading) - Working code
- [Hierarchical Expansion](../../reference/ui/mockup-catalog.md#issues-page) - issues-page.html mockup

## References

- [HTMX Documentation](https://htmx.org/docs/)
- [Hypermedia Systems](https://hypermedia.systems/) - Book on server-driven UIs
- [Progressive Enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement) - MDN Guide
