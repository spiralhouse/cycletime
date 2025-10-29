---
title: "Dashboard DTO Mapping Pattern"
type: pattern
domain: [ui, architecture, data-mapping]
description: "Pattern for mapping domain entities to view-optimized DTOs in the CycleTime Dashboard"
dependencies: [../../concepts/architecture/domain-driven-design.md, ../../concepts/dashboard/dashboard-architecture-concept.md]
related: [../../reference/dashboard/dashboard-api-reference.md, ../../examples/dashboard/dashboard-dto-examples.md]
keywords: [dto, data-transfer-object, mapping, view-model, serialization]
audience: [developers]
last_updated: 2025-10-28
---

# Dashboard DTO Mapping Pattern

## Problem

Domain entities in CycleTime are designed for business logic and persistence, not for efficient web rendering. Directly exposing domain entities to the web layer causes several issues:

**Performance Issues**:
- N+1 queries when traversing relationships
- Serializing unnecessary data (audit fields, internal IDs)
- No pre-computed statistics (counts, aggregations)

**Coupling Issues**:
- Web layer depends on domain entity structure
- Changes to domain models break web contracts
- Cannot optimize domain and view models independently

**Security Issues**:
- Exposing internal domain structure
- Leaking sensitive fields (deleted flags, internal notes)
- No control over serialization format

## Solution

Introduce view-optimized Data Transfer Objects (DTOs) that:

1. **Flatten hierarchies** for efficient serialization
2. **Pre-compute statistics** to avoid N+1 queries
3. **Decouple** web layer from domain structure
4. **Optimize** for specific views (list vs. detail)

## Pattern Structure

### View DTO Design

```kotlin
package io.spiralhouse.cycletime.dashboard.dto

import kotlinx.serialization.Serializable
import kotlinx.datetime.Instant

/**
 * Flattened project view optimized for dashboard display.
 * Includes computed statistics and hierarchical counts.
 */
@Serializable
data class ProjectViewDTO(
    val id: String,                    // String UUID (not domain ProjectId)
    val name: String,
    val description: String?,
    val status: String,                // Enum as string
    val epicCount: Int,                // Pre-computed statistic
    val storyCount: Int,               // Pre-computed statistic
    val totalIssues: Int,              // Pre-computed statistic
    val createdAt: Instant,
    val updatedAt: Instant
)
```

**Key Characteristics**:
- All fields are primitive or standard types (no domain value objects)
- Statistics pre-computed to avoid queries in templates
- Nullable fields match domain optionality
- Serializable for future JSON API support

### Hierarchical DTO Design

```kotlin
/**
 * Hierarchical issue view with parent/child relationships.
 * Optimized for tree rendering without N+1 queries.
 */
@Serializable
data class IssueViewDTO(
    val id: String,
    val title: String,
    val description: String?,
    val type: String,                  // EPIC, STORY, SUBTASK
    val status: String,
    val parentId: String?,             // Null for top-level issues
    val projectId: String?,
    val estimate: Int?,                // Null for unestimated
    val assigneeId: String?,
    val childCount: Int,               // Pre-computed for lazy loading
    val isBlocked: Boolean,            // Derived from domain logic
    val createdAt: Instant,
    val updatedAt: Instant
)
```

**Design Decisions**:
- `childCount` enables "X subtasks" display without loading children
- `isBlocked` computed once during mapping, not repeatedly in templates
- All IDs as strings for JavaScript compatibility

### Composite DTO for Complete Views

```kotlin
/**
 * Project hierarchy for single-page view.
 * Pre-loads epics and stories to minimize round trips.
 */
@Serializable
data class ProjectHierarchyDTO(
    val project: ProjectViewDTO,
    val epics: List<IssueHierarchyNode>,
    val orphanedStories: List<IssueHierarchyNode>
)

/**
 * Recursive structure for issue hierarchy display.
 */
@Serializable
data class IssueHierarchyNode(
    val issue: IssueViewDTO,
    val children: List<IssueHierarchyNode>
)
```

**Pattern**: Composite DTOs bundle related data for complete view rendering, reducing round trips.

### Service Health DTO

```kotlin
/**
 * Service health status for dashboard header.
 */
@Serializable
data class ServiceHealthDTO(
    val status: String,                // "healthy" | "degraded" | "unhealthy"
    val database: String,              // Connection status
    val mcp: String?,                  // MCP server status (optional)
    val projectCount: Int,
    val issueCount: Int,
    val uptime: Long                   // Milliseconds since startup
)
```

**Purpose**: Aggregate health information for dashboard header display.

## Mapper Implementation

### Mapper Object Pattern

```kotlin
package io.spiralhouse.cycletime.dashboard.mappers

import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.dashboard.dto.*

/**
 * Maps domain entities to view DTOs.
 * Handles null safety and type conversions.
 */
object DashboardMapper {

    /**
     * Maps Project entity to view DTO with statistics.
     */
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

    /**
     * Maps Issue entity to view DTO.
     */
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
            isBlocked = issue.isBlocked(),    // Domain logic encapsulated
            createdAt = issue.createdAt,
            updatedAt = issue.updatedAt
        )
    }

    /**
     * Builds hierarchical node from issue and children.
     * Recursive structure for nested issues.
     */
    fun toHierarchyNode(
        issue: Issue,
        children: List<Issue>
    ): IssueHierarchyNode {
        val childNodes = children.map { child ->
            // For dashboard, only go 2 levels deep (Epic -> Story -> Subtasks)
            // Stories show subtask count but don't pre-load them
            toHierarchyNode(child, emptyList())
        }

        return IssueHierarchyNode(
            issue = toIssueView(issue, children.size),
            children = childNodes
        )
    }
}
```

## Usage in Application Service

### Computing Statistics During Mapping

```kotlin
suspend fun listProjects(): List<ProjectViewDTO> {
    return cache.getOrPut("projects:all") {
        val projects = projectRepository.findAll()

        projects.map { project ->
            // Fetch all issues for statistics
            val issues = issueRepository.findByProject(project.id)
            val epicCount = issues.count { it.type == IssueType.EPIC }
            val storyCount = issues.count { it.type == IssueType.STORY }

            // Map with computed statistics
            DashboardMapper.toProjectView(
                project = project,
                epicCount = epicCount,
                storyCount = storyCount,
                totalIssues = issues.size
            )
        }
    }
}
```

**Pattern**: Fetch data once, compute statistics, map to DTO with all required data.

### Building Hierarchies Efficiently

```kotlin
suspend fun getProjectHierarchy(projectId: String): ProjectHierarchyDTO? {
    return cache.getOrPut("project:$projectId:hierarchy") {
        val project = projectRepository.findById(ProjectId(projectId))
            ?: return@getOrPut null

        // Single query for ALL issues
        val allIssues = issueRepository.findByProject(project.id)

        // In-memory filtering (fast)
        val epics = allIssues.filter { it.type == IssueType.EPIC }
        val stories = allIssues.filter { it.type == IssueType.STORY }

        // Build epic hierarchies
        val epicNodes = epics.map { epic ->
            val epicStories = stories.filter { it.parentId == epic.id }
            DashboardMapper.toHierarchyNode(epic, epicStories)
        }

        // Handle orphaned stories
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

**Key Optimization**: Fetch all issues once, build hierarchy in memory. Result: 1 query instead of 1 + N + M.

## When to Use This Pattern

### Use DTOs When

**Different representations needed**: List view vs. detail view require different data
**Statistics required**: Pre-computing counts, sums, aggregations
**Multiple entities combined**: Composite views merging projects + issues
**External API**: JSON responses for external consumers
**Hierarchical data**: Building trees, nested structures

### Skip DTOs When

**Simple passthrough**: Data passes unchanged from domain to view
**Internal APIs**: Communication between internal services
**Single entity query**: No relationships, no statistics needed

## Benefits

**Performance**: Pre-computed statistics eliminate N+1 queries
**Decoupling**: Web layer independent of domain structure
**Flexibility**: Different DTOs for different views (list, detail, summary)
**Security**: Control over exposed fields
**Testability**: DTOs simplify testing of web layer
**Versioning**: API versions can use different DTOs from same domain model

## Trade-offs

**Mapping overhead**: Additional code to map entities to DTOs
**Duplication**: DTOs often mirror entity structure
**Maintenance**: Changes to domain may require DTO updates
**Memory**: DTOs consume additional memory vs. direct entity serialization

**Mitigation**: Automated mapping libraries (MapStruct, ModelMapper) can reduce boilerplate, but add complexity.

## Testing Strategy

### Unit Test Mappers

```kotlin
class DashboardMapperTest : StringSpec({
    "should map Project to ProjectViewDTO" {
        val project = createTestProject(
            name = "Test Project",
            status = ProjectStatus.ACTIVE
        )

        val dto = DashboardMapper.toProjectView(
            project = project,
            epicCount = 5,
            storyCount = 12,
            totalIssues = 25
        )

        dto.name shouldBe "Test Project"
        dto.status shouldBe "ACTIVE"
        dto.epicCount shouldBe 5
        dto.storyCount shouldBe 12
        dto.totalIssues shouldBe 25
    }

    "should handle nullable fields correctly" {
        val issue = createTestIssue(
            description = null,
            estimate = StoryPoints.unestimated()
        )

        val dto = DashboardMapper.toIssueView(issue)

        dto.description shouldBe null
        dto.estimate shouldBe null
    }

    "should compute isBlocked from domain logic" {
        val blockedIssue = createTestIssue(
            /* setup blocked state */
        )

        val dto = DashboardMapper.toIssueView(blockedIssue)

        dto.isBlocked shouldBe true
    }
})
```

### Integration Test with Services

```kotlin
class DashboardServiceMappingTest : StringSpec({
    "should return DTOs with correct statistics" {
        // Arrange
        val project = createTestProject()
        createTestIssue(projectId = project.id, type = IssueType.EPIC)
        createTestIssue(projectId = project.id, type = IssueType.STORY)
        createTestIssue(projectId = project.id, type = IssueType.STORY)

        // Act
        val dtos = dashboardService.listProjects()

        // Assert
        dtos shouldHaveSize 1
        dtos[0].epicCount shouldBe 1
        dtos[0].storyCount shouldBe 2
        dtos[0].totalIssues shouldBe 3
    }
})
```

## Variations

### Extension Function Style

Alternative to mapper object:

```kotlin
fun Project.toViewDTO(
    epicCount: Int,
    storyCount: Int,
    totalIssues: Int
): ProjectViewDTO {
    return ProjectViewDTO(
        id = id.value.toString(),
        name = name,
        // ...
    )
}

// Usage
val dto = project.toViewDTO(epicCount, storyCount, totalIssues)
```

**Trade-off**: More Kotlin-idiomatic but adds methods to domain entities.

### Builder Pattern

For complex DTOs with many optional fields:

```kotlin
class ProjectViewDTOBuilder {
    private var id: String = ""
    private var name: String = ""
    private var description: String? = null
    // ...

    fun id(value: String) = apply { this.id = value }
    fun name(value: String) = apply { this.name = value }

    fun build() = ProjectViewDTO(id, name, description, /* ... */)
}

// Usage
val dto = ProjectViewDTOBuilder()
    .id(project.id.value.toString())
    .name(project.name)
    .build()
```

**Trade-off**: More verbose, useful for complex optional field combinations.

## Related Patterns

- [Repository Pattern](../../patterns/architecture/repository-pattern.md) - Data access abstraction
- [Service Layer Pattern](../../patterns/architecture/service-layer-pattern.md) - Business logic orchestration
- [View Model Pattern](../../patterns/ui/view-model-pattern.md) - UI state management

## Related Documentation

- [Dashboard Architecture Concept](../../concepts/dashboard/dashboard-architecture-concept.md) - Architectural context
- [Dashboard API Reference](../../reference/dashboard/dashboard-api-reference.md) - API endpoints using DTOs
- [Dashboard Implementation Guide](../../guides/dashboard/dashboard-implementation-guide.md) - Implementation steps

## Summary

The Dashboard DTO Mapping Pattern provides a clean separation between domain entities and web representations by:

- Flattening hierarchies for efficient serialization
- Pre-computing statistics to eliminate N+1 queries
- Decoupling web layer from domain structure
- Optimizing for specific view requirements

Use this pattern when performance, flexibility, and decoupling are priorities over simplicity.
