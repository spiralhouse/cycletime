---
title: "Dashboard Implementation Guide"
type: guide
domain: [ui, implementation]
description: "Step-by-step guide for implementing the CycleTime Dashboard with phased delivery"
dependencies: [../../concepts/dashboard/dashboard-architecture-concept.md, ../../patterns/dashboard/dashboard-dto-mapping-pattern.md]
related: [../../reference/dashboard/dashboard-api-reference.md, ./dashboard-testing-guide.md]
keywords: [implementation, dashboard, guide, phases, step-by-step]
audience: [developers]
last_updated: 2025-10-28
---

# Dashboard Implementation Guide

## Overview

This guide provides a step-by-step approach to implementing the CycleTime Dashboard in three distinct phases. Each phase delivers working functionality that can be tested and validated before proceeding.

**Implementation Timeline**:
- **Phase 1**: Foundation (Week 1) - Basic infrastructure and project list
- **Phase 2**: Hierarchy Display (Week 2) - Full project detail with Epic → Story hierarchy
- **Phase 3**: Lazy Loading & Polish (Week 3) - Subtask lazy loading and UI refinement

## Prerequisites

Before starting implementation:

1. **Read foundational documentation**:
   - [Dashboard Architecture Concept](../../concepts/dashboard/dashboard-architecture-concept.md)
   - [Dashboard DTO Mapping Pattern](../../patterns/dashboard/dashboard-dto-mapping-pattern.md)
   - [Dashboard Technology Stack](../../reference/dashboard/dashboard-technology-stack-reference.md)

2. **Verify development environment**:
   ```bash
   ./gradlew clean build  # Should pass
   ./gradlew test         # All existing tests pass
   ```

3. **Check dependencies** in `build.gradle.kts`:
   ```kotlin
   implementation("io.ktor:ktor-server-html-builder:3.3.1")
   implementation("org.jetbrains.kotlinx:kotlinx-html-jvm:0.11.0")
   ```

## Phase 1: Foundation (Week 1)

### Goal

Build basic infrastructure and working projects list view.

### Deliverable

A functioning `/dashboard` endpoint that displays all projects with summary statistics.

### Step 1.1: Create DTO Package

**Create directory**: `src/main/kotlin/io/spiralhouse/cycletime/dashboard/dto/`

**Create file**: `ViewDTOs.kt`

```kotlin
package io.spiralhouse.cycletime.dashboard.dto

import kotlinx.serialization.Serializable
import kotlinx.datetime.Instant

@Serializable
data class ProjectViewDTO(
    val id: String,
    val name: String,
    val description: String?,
    val status: String,
    val epicCount: Int,
    val storyCount: Int,
    val totalIssues: Int,
    val createdAt: Instant,
    val updatedAt: Instant
)

@Serializable
data class IssueViewDTO(
    val id: String,
    val title: String,
    val description: String?,
    val type: String,
    val status: String,
    val parentId: String?,
    val projectId: String?,
    val estimate: Int?,
    val assigneeId: String?,
    val childCount: Int,
    val isBlocked: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant
)

@Serializable
data class ServiceHealthDTO(
    val status: String,
    val database: String,
    val mcp: String?,
    val projectCount: Int,
    val issueCount: Int,
    val uptime: Long
)
```

**Verify**: DTOs compile successfully.

### Step 1.2: Create Mapper

**Create directory**: `src/main/kotlin/io/spiralhouse/cycletime/dashboard/mappers/`

**Create file**: `DashboardMapper.kt`

```kotlin
package io.spiralhouse.cycletime.dashboard.mappers

import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.dashboard.dto.*

object DashboardMapper {

    fun toProjectView(
        project: Project,
        epicCount: Int,
        storyCount: Int,
        totalIssues: Int
    ): ProjectViewDTO {
        return ProjectViewDTO(
            id = project.id.value.toString(),
            name = project.name,
            description = project.description,
            status = project.status.name,
            epicCount = epicCount,
            storyCount = storyCount,
            totalIssues = totalIssues,
            createdAt = project.createdAt,
            updatedAt = project.updatedAt
        )
    }

    fun toIssueView(
        issue: Issue,
        childCount: Int = 0
    ): IssueViewDTO {
        return IssueViewDTO(
            id = issue.id.value.toString(),
            title = issue.title,
            description = issue.description,
            type = issue.type.name,
            status = issue.status.name,
            parentId = issue.parentId?.value?.toString(),
            projectId = issue.projectId?.value?.toString(),
            estimate = if (issue.estimate.hasValue()) issue.estimate.value else null,
            assigneeId = issue.assigneeId,
            childCount = childCount,
            isBlocked = issue.isBlocked(),
            createdAt = issue.createdAt,
            updatedAt = issue.updatedAt
        )
    }
}
```

**Verify**: Write unit tests for mapper functions.

### Step 1.3: Implement Cache

**Create directory**: `src/main/kotlin/io/spiralhouse/cycletime/application/services/`

**Create file**: `DashboardCache.kt`

```kotlin
package io.spiralhouse.cycletime.application.services

import java.util.concurrent.ConcurrentHashMap
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes

class DashboardCache(
    private val defaultTTL: Duration = 5.minutes,
    private val maxSize: Int = 100
) {
    private data class CacheEntry<T>(
        val value: T,
        val expiresAt: Long
    )

    private val cache = ConcurrentHashMap<String, CacheEntry<*>>()

    suspend fun <T> getOrPut(
        key: String,
        ttl: Duration = defaultTTL,
        compute: suspend () -> T
    ): T {
        // Check if entry exists and is not expired
        val entry = cache[key] as? CacheEntry<T>
        if (entry != null && System.currentTimeMillis() < entry.expiresAt) {
            return entry.value
        }

        // Compute new value
        val value = compute()
        val expiresAt = System.currentTimeMillis() + ttl.inWholeMilliseconds

        // Evict oldest entry if cache is full
        if (cache.size >= maxSize) {
            evictOldest()
        }

        cache[key] = CacheEntry(value, expiresAt)
        return value
    }

    fun invalidate(key: String) {
        cache.remove(key)
    }

    fun invalidatePattern(pattern: String) {
        val regex = pattern.replace("*", ".*").toRegex()
        cache.keys.filter { it.matches(regex) }.forEach { cache.remove(it) }
    }

    fun clear() {
        cache.clear()
    }

    private fun evictOldest() {
        val oldestKey = cache.entries.minByOrNull { it.value.expiresAt }?.key
        if (oldestKey != null) {
            cache.remove(oldestKey)
        }
    }
}
```

**Verify**: Write unit tests for cache behavior (TTL, eviction, invalidation).

### Step 1.4: Create Application Service

**Create file**: `DashboardApplicationService.kt`

```kotlin
package io.spiralhouse.cycletime.application.services

import io.spiralhouse.cycletime.dashboard.dto.*
import io.spiralhouse.cycletime.dashboard.mappers.DashboardMapper
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.valueobjects.IssueType

class DashboardApplicationService(
    private val projectRepository: ProjectRepository,
    private val issueRepository: IssueRepository,
    private val cache: DashboardCache
) {

    suspend fun listProjects(): List<ProjectViewDTO> {
        return cache.getOrPut("projects:all") {
            val projects = projectRepository.findAll()

            projects.map { project ->
                val issues = issueRepository.findByProject(project.id)
                val epicCount = issues.count { it.type == IssueType.EPIC }
                val storyCount = issues.count { it.type == IssueType.STORY }

                DashboardMapper.toProjectView(
                    project = project,
                    epicCount = epicCount,
                    storyCount = storyCount,
                    totalIssues = issues.size
                )
            }
        }
    }

    suspend fun getServiceHealth(): ServiceHealthDTO {
        val projects = projectRepository.findAll()
        val projectIds = projects.map { it.id }
        val allIssues = projectIds.flatMap { issueRepository.findByProject(it) }

        return ServiceHealthDTO(
            status = "healthy",
            database = "connected",
            mcp = "running",
            projectCount = projects.size,
            issueCount = allIssues.size,
            uptime = System.currentTimeMillis()
        )
    }

    fun invalidateProject(projectId: String) {
        cache.invalidate("projects:all")
    }
}
```

**Verify**: Write unit tests mocking repositories.

### Step 1.5: Register Service in DI

**Edit**: `src/main/kotlin/io/spiralhouse/cycletime/Application.kt`

```kotlin
fun Application.configureDependencies() {
    dependencies {
        // Existing dependencies...

        // Dashboard services
        provide<DashboardCache> { DashboardCache() }
        provide<DashboardApplicationService> {
            DashboardApplicationService(
                instance(), // ProjectRepository
                instance(), // IssueRepository
                instance()  // DashboardCache
            )
        }
    }
}
```

**Verify**: Application starts without DI errors.

### Step 1.6: Create HTML Views

**Create directory**: `src/main/kotlin/io/spiralhouse/cycletime/dashboard/views/`

**Create file**: `DashboardViews.kt`

```kotlin
package io.spiralhouse.cycletime.dashboard.views

import io.spiralhouse.cycletime.dashboard.dto.*
import kotlinx.html.*

object DashboardViews {

    fun HTML.projectsIndex(
        projects: List<ProjectViewDTO>,
        health: ServiceHealthDTO
    ) {
        head {
            title("CycleTime Dashboard")
            meta(charset = "UTF-8")
            meta(name = "viewport", content = "width=device-width, initial-scale=1.0")
            script(src = "https://cdn.tailwindcss.com") {}
            script(src = "https://unpkg.com/htmx.org@1.9.10") {}

            style {
                unsafe {
                    raw("""
                        :root {
                            --primary-color: #58a6ff;
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
            header(classes = "bg-gray-900 border-b border-gray-800 p-4") {
                div(classes = "container mx-auto flex justify-between items-center") {
                    h1(classes = "text-2xl font-bold text-blue-400") {
                        +"CycleTime Dashboard"
                    }

                    div(classes = "flex items-center gap-2") {
                        span(classes = "text-sm text-gray-400") { +"Status:" }
                        span(classes = "text-green-400 font-semibold") { +health.status }
                        span(classes = "text-xs text-gray-500") {
                            +"${health.projectCount} projects • ${health.issueCount} issues"
                        }
                    }
                }
            }

            main(classes = "container mx-auto p-6") {
                h2(classes = "text-xl font-semibold mb-4 text-gray-200") {
                    +"Projects"
                }

                div(classes = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4") {
                    projects.forEach { project ->
                        projectCard(project)
                    }
                }
            }
        }
    }

    private fun FlowContent.projectCard(project: ProjectViewDTO) {
        a(
            href = "/dashboard/projects/${project.id}",
            classes = "block p-6 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 transition"
        ) {
            div(classes = "flex justify-between items-start mb-3") {
                h3(classes = "text-lg font-semibold text-blue-400") {
                    +project.name
                }
                span(classes = "text-xs px-2 py-1 rounded bg-gray-700 text-gray-300") {
                    +project.status
                }
            }

            project.description?.let { desc ->
                p(classes = "text-sm text-gray-400 mb-4 line-clamp-2") {
                    +desc
                }
            }

            div(classes = "flex gap-4 text-xs text-gray-500") {
                span { +"📚 ${project.epicCount} epics" }
                span { +"📖 ${project.storyCount} stories" }
                span { +"📝 ${project.totalIssues} total" }
            }
        }
    }
}
```

**Verify**: Views compile successfully.

### Step 1.7: Create Routes

**Create directory**: `src/main/kotlin/io/spiralhouse/cycletime/dashboard/routes/`

**Create file**: `DashboardRoutes.kt`

```kotlin
package io.spiralhouse.cycletime.dashboard.routes

import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.http.*
import io.spiralhouse.cycletime.application.services.DashboardApplicationService
import io.spiralhouse.cycletime.dashboard.views.DashboardViews

fun Route.configureDashboardRoutes() {
    route("/dashboard") {
        get {
            val service: DashboardApplicationService by application.dependencies
            val projects = service.listProjects()
            val health = service.getServiceHealth()

            call.respondHtml(HttpStatusCode.OK) {
                DashboardViews.projectsIndex(projects, health)
            }
        }
    }
}
```

**Verify**: Route compiles.

### Step 1.8: Mount Routes in Application

**Edit**: `Application.kt`

```kotlin
fun Application.configureRouting() {
    routing {
        // Existing routes...

        // Dashboard routes
        configureDashboardRoutes()
    }
}
```

**Verify**: Application compiles and starts.

### Step 1.9: Integration Testing

**Create**: `src/integrationTest/kotlin/io/spiralhouse/cycletime/dashboard/DashboardRoutesIntegrationTest.kt`

```kotlin
class DashboardRoutesIntegrationTest : StringSpec({

    "GET /dashboard should return projects list" {
        testApplication {
            application {
                configureDependencies()
                configureRouting()
            }

            val response = client.get("/dashboard")

            response.status shouldBe HttpStatusCode.OK
            response.contentType() shouldBe ContentType.Text.Html
            response.bodyAsText() shouldContain "CycleTime Dashboard"
        }
    }
})
```

**Verify**: Integration test passes.

### Step 1.10: Manual Testing

1. Start application:
   ```bash
   ./gradlew run
   ```

2. Open browser: `http://localhost:8080/dashboard`

3. Verify:
   - Page loads successfully
   - Projects display (if any exist)
   - Health status shows in header
   - Styling matches design

**Phase 1 Complete**: Projects list view working ✅

## Phase 2: Hierarchy Display (Week 2)

### Goal

Implement full project detail page with Epic → Story hierarchy.

### Deliverable

A functioning `/dashboard/projects/{id}` endpoint showing hierarchical issue structure.

### Step 2.1: Extend DTOs for Hierarchy

**Edit**: `ViewDTOs.kt`

```kotlin
@Serializable
data class ProjectHierarchyDTO(
    val project: ProjectViewDTO,
    val epics: List<IssueHierarchyNode>,
    val orphanedStories: List<IssueHierarchyNode>
)

@Serializable
data class IssueHierarchyNode(
    val issue: IssueViewDTO,
    val children: List<IssueHierarchyNode>
)
```

### Step 2.2: Extend Mapper for Hierarchy

**Edit**: `DashboardMapper.kt`

```kotlin
fun toHierarchyNode(
    issue: Issue,
    children: List<Issue>
): IssueHierarchyNode {
    val childNodes = children.map { child ->
        toHierarchyNode(child, emptyList())
    }

    return IssueHierarchyNode(
        issue = toIssueView(issue, children.size),
        children = childNodes
    )
}
```

### Step 2.3: Implement Hierarchy Service Method

**Edit**: `DashboardApplicationService.kt`

```kotlin
suspend fun getProjectHierarchy(projectId: String): ProjectHierarchyDTO? {
    return cache.getOrPut("project:$projectId:hierarchy") {
        val project = projectRepository.findById(ProjectId(projectId))
            ?: return@getOrPut null

        val allIssues = issueRepository.findByProject(project.id)

        val epics = allIssues.filter { it.type == IssueType.EPIC }
        val stories = allIssues.filter { it.type == IssueType.STORY }

        val epicNodes = epics.map { epic ->
            val epicStories = stories.filter { it.parentId == epic.id }
            DashboardMapper.toHierarchyNode(epic, epicStories)
        }

        val orphanedStories = stories.filter { story ->
            story.parentId == null || epics.none { it.id == story.parentId }
        }.map { story ->
            DashboardMapper.toHierarchyNode(story, emptyList())
        }

        ProjectHierarchyDTO(
            project = DashboardMapper.toProjectView(
                project = project,
                epicCount = epics.size,
                storyCount = stories.size,
                totalIssues = allIssues.size
            ),
            epics = epicNodes,
            orphanedStories = orphanedStories
        )
    }
}
```

### Step 2.4: Create Project Detail View

**Edit**: `DashboardViews.kt`

```kotlin
fun HTML.projectDetail(
    hierarchy: ProjectHierarchyDTO,
    health: ServiceHealthDTO
) {
    head {
        title("${hierarchy.project.name} - CycleTime Dashboard")
        meta(charset = "UTF-8")
        meta(name = "viewport", content = "width=device-width, initial-scale=1.0")
        script(src = "https://cdn.tailwindcss.com") {}
        script(src = "https://unpkg.com/htmx.org@1.9.10") {}

        style {
            unsafe {
                raw("""
                    :root {
                        --primary-color: #58a6ff;
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
        header(classes = "bg-gray-900 border-b border-gray-800 p-4") {
            div(classes = "container mx-auto flex justify-between items-center") {
                div {
                    a(href = "/dashboard", classes = "text-sm text-blue-400 hover:underline") {
                        +"← Back to Projects"
                    }
                    h1(classes = "text-2xl font-bold text-gray-200 mt-2") {
                        +hierarchy.project.name
                    }
                }

                div(classes = "text-sm text-gray-400") {
                    +"${hierarchy.project.epicCount} epics • ${hierarchy.project.storyCount} stories"
                }
            }
        }

        main(classes = "container mx-auto p-6") {
            section(classes = "mb-8") {
                h2(classes = "text-xl font-semibold mb-4 text-gray-200") {
                    +"📚 Epics"
                }

                if (hierarchy.epics.isEmpty()) {
                    p(classes = "text-gray-500 italic") { +"No epics yet" }
                } else {
                    div(classes = "space-y-4") {
                        hierarchy.epics.forEach { epic ->
                            epicNode(epic)
                        }
                    }
                }
            }

            if (hierarchy.orphanedStories.isNotEmpty()) {
                section {
                    h2(classes = "text-xl font-semibold mb-4 text-gray-200") {
                        +"📖 Stories (No Epic)"
                    }

                    div(classes = "space-y-2") {
                        hierarchy.orphanedStories.forEach { story ->
                            storyNode(story)
                        }
                    }
                }
            }
        }
    }
}

private fun FlowContent.epicNode(node: IssueHierarchyNode) {
    div(classes = "border border-gray-700 rounded-lg bg-gray-800 p-4") {
        div(classes = "flex justify-between items-start mb-3") {
            div(classes = "flex-1") {
                div(classes = "flex items-center gap-2 mb-1") {
                    span { +"📚" }
                    h3(classes = "text-lg font-semibold text-gray-200") {
                        +node.issue.title
                    }
                }
                node.issue.description?.let { desc ->
                    p(classes = "text-sm text-gray-400 mt-1") {
                        +desc
                    }
                }
            }

            span(classes = "text-xs px-2 py-1 rounded bg-gray-700 text-gray-300") {
                +node.issue.status
            }
        }

        if (node.children.isNotEmpty()) {
            div(classes = "mt-4 space-y-2 pl-4 border-l-2 border-gray-700") {
                node.children.forEach { story ->
                    storyNode(story)
                }
            }
        }
    }
}

private fun FlowContent.storyNode(node: IssueHierarchyNode) {
    div(classes = "bg-gray-900 rounded p-3") {
        div(classes = "flex justify-between items-center") {
            div(classes = "flex-1") {
                div(classes = "flex items-center gap-2") {
                    span { +"📖" }
                    span(classes = "font-medium text-gray-200") {
                        +node.issue.title
                    }
                }

                if (node.issue.childCount > 0) {
                    span(classes = "text-xs text-gray-500 mt-1") {
                        +"${node.issue.childCount} subtasks"
                    }
                }
            }

            span(classes = "text-xs px-2 py-1 rounded bg-gray-700 text-gray-300") {
                +node.issue.status
            }
        }
    }
}
```

### Step 2.5: Add Project Detail Route

**Edit**: `DashboardRoutes.kt`

```kotlin
get("/projects/{projectId}") {
    val projectId = call.parameters["projectId"]
        ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing projectId")

    val service: DashboardApplicationService by application.dependencies
    val hierarchy = service.getProjectHierarchy(projectId)
        ?: return@get call.respond(HttpStatusCode.NotFound, "Project not found")
    val health = service.getServiceHealth()

    call.respondHtml(HttpStatusCode.OK) {
        DashboardViews.projectDetail(hierarchy, health)
    }
}
```

### Step 2.6: Testing

**Add integration test**:

```kotlin
"GET /dashboard/projects/{id} should return hierarchy" {
    testApplication {
        application {
            configureDependencies()
            configureRouting()
        }

        val projectId = createTestProjectWithHierarchy()
        val response = client.get("/dashboard/projects/$projectId")

        response.status shouldBe HttpStatusCode.OK
        response.bodyAsText() shouldContain "📚 Epics"
    }
}
```

### Step 2.7: Manual Testing

1. Restart application
2. Navigate to a project from dashboard
3. Verify:
   - Epic → Story hierarchy displays
   - Orphaned stories section (if applicable)
   - Back link works
   - Styling matches design

**Phase 2 Complete**: Project hierarchy view working ✅

## Phase 3: Lazy Loading & Polish (Week 3)

### Goal

Add HTMX lazy loading for subtasks and polish UI.

### Deliverable

Complete dashboard with lazy-loaded subtasks and refined UX.

### Step 3.1: Implement Subtask Loading Service Method

**Edit**: `DashboardApplicationService.kt`

```kotlin
suspend fun getStorySubtasks(storyId: String): List<IssueViewDTO> {
    return cache.getOrPut("story:$storyId:subtasks") {
        val subtasks = issueRepository.findByParent(IssueId(storyId))
        subtasks.map { DashboardMapper.toIssueView(it, childCount = 0) }
    }
}
```

### Step 3.2: Create Subtask View Fragment

**Edit**: `DashboardViews.kt`

```kotlin
fun subtaskList(subtasks: List<IssueViewDTO>) = createHTML().div {
    subtasks.forEach { subtask ->
        div(classes = "flex items-center gap-2 text-sm text-gray-400") {
            span { +"📝" }
            span { +subtask.title }

            subtask.estimate?.let { est ->
                span(classes = "text-xs px-1.5 py-0.5 rounded bg-blue-900 text-blue-300") {
                    +"$est pts"
                }
            }

            span(classes = "text-xs text-gray-500") {
                +subtask.status
            }
        }
    }
}
```

### Step 3.3: Add HTMX Subtask Route

**Edit**: `DashboardRoutes.kt`

```kotlin
get("/stories/{storyId}/subtasks") {
    val storyId = call.parameters["storyId"]
        ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing storyId")

    val service: DashboardApplicationService by application.dependencies
    val subtasks = service.getStorySubtasks(storyId)

    call.respondHtml(HttpStatusCode.OK) {
        DashboardViews.subtaskList(subtasks)
    }
}
```

### Step 3.4: Update Story Node with HTMX

**Edit**: `storyNode` function in `DashboardViews.kt`

```kotlin
private fun FlowContent.storyNode(node: IssueHierarchyNode) {
    div(classes = "bg-gray-900 rounded p-3") {
        div(classes = "flex justify-between items-center") {
            div(classes = "flex-1") {
                div(classes = "flex items-center gap-2") {
                    span { +"📖" }
                    span(classes = "font-medium text-gray-200") {
                        +node.issue.title
                    }
                }

                if (node.issue.childCount > 0) {
                    button(
                        classes = "text-xs text-blue-400 hover:underline mt-1",
                        type = ButtonType.button
                    ) {
                        attributes["hx-get"] = "/dashboard/stories/${node.issue.id}/subtasks"
                        attributes["hx-target"] = "#subtasks-${node.issue.id}"
                        attributes["hx-swap"] = "innerHTML"

                        +"${node.issue.childCount} subtasks ▼"
                    }
                }
            }

            span(classes = "text-xs px-2 py-1 rounded bg-gray-700 text-gray-300") {
                +node.issue.status
            }
        }

        div {
            id = "subtasks-${node.issue.id}"
            classes = setOf("mt-2", "pl-4", "space-y-1")
        }
    }
}
```

### Step 3.5: Final Testing

**Integration test**:

```kotlin
"HTMX GET /dashboard/stories/{id}/subtasks should return fragment" {
    testApplication {
        application {
            configureDependencies()
            configureRouting()
        }

        val storyId = createTestStoryWithSubtasks()
        val response = client.get("/dashboard/stories/$storyId/subtasks") {
            header("HX-Request", "true")
        }

        response.status shouldBe HttpStatusCode.OK
        response.bodyAsText() shouldNotContain "<!DOCTYPE html>"
    }
}
```

### Step 3.6: Manual Testing

1. Restart application
2. Navigate to project with stories containing subtasks
3. Click "X subtasks ▼" button
4. Verify:
   - Subtasks load without page reload
   - Estimates and status display
   - Styling matches design

**Phase 3 Complete**: Dashboard fully functional ✅

## Post-Implementation

### Performance Testing

Run performance baseline tests:

```bash
./gradlew systemTest --tests "*DashboardPerformanceTest*"
```

Verify:
- Page load < 500ms for typical projects
- Cache hit ratio > 80%
- No N+1 queries

### Documentation

Update project documentation:

1. **README.md**: Add dashboard section
2. **User guide**: Document navigation patterns
3. **Developer guide**: Architecture decisions

### Code Review

Request code review focusing on:

- Architecture alignment with DDD
- Test coverage (target: 90%+)
- Error handling
- Security (XSS prevention, localhost binding)

## Related Documentation

- [Dashboard Testing Guide](./dashboard-testing-guide.md) - Comprehensive testing strategies
- [Dashboard API Reference](../../reference/dashboard/dashboard-api-reference.md) - Complete API specification
- [Dashboard Architecture Concept](../../concepts/dashboard/dashboard-architecture-concept.md) - Architectural decisions
