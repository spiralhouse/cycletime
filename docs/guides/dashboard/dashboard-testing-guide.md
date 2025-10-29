---
title: "Dashboard Testing Guide"
type: guide
domain: [ui, testing, quality-assurance]
description: "Comprehensive testing strategies and examples for CycleTime Dashboard"
dependencies: [../../concepts/dashboard/dashboard-architecture-concept.md, ../../patterns/dashboard/dashboard-dto-mapping-pattern.md]
related: [./dashboard-implementation-guide.md, ../../reference/dashboard/dashboard-api-reference.md]
keywords: [testing, unit-tests, integration-tests, kotest, dashboard]
audience: [developers, qa-engineers]
last_updated: 2025-10-28
---

# Dashboard Testing Guide

## Overview

This guide provides comprehensive testing strategies for the CycleTime Dashboard, covering unit tests, integration tests, and system tests. Follow the three-tier testing approach to ensure quality and maintainability.

## Testing Strategy

### Three-Tier Approach

**Tier 1: Unit Tests** - Fast, isolated, no external dependencies
- Mappers, DTOs, business logic
- Cache behavior
- Domain entity interactions
- Target: < 10ms per test

**Tier 2: Integration Tests** - Real components with controlled infrastructure
- HTTP routes with test database
- Service orchestration
- Repository interactions
- Target: < 100ms per test

**Tier 3: System Tests** - End-to-end workflows (optional for dashboard)
- Performance testing
- Browser automation with Playwright
- Target: < 1s per test

## Unit Tests

### Testing Mappers

**Location**: `src/test/kotlin/io/spiralhouse/cycletime/dashboard/mappers/`

**Test file**: `DashboardMapperTest.kt`

```kotlin
package io.spiralhouse.cycletime.dashboard.mappers

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.nulls.shouldBeNull
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.test.utils.TestEntityFactory
import kotlinx.datetime.Clock

class DashboardMapperTest : StringSpec({

    "should map Project to ProjectViewDTO with statistics" {
        // Arrange
        val project = TestEntityFactory.createTestProject(
            name = "Test Project",
            description = "Test description",
            status = ProjectStatus.ACTIVE
        )

        // Act
        val dto = DashboardMapper.toProjectView(
            project = project,
            epicCount = 5,
            storyCount = 12,
            totalIssues = 25
        )

        // Assert
        dto.name shouldBe "Test Project"
        dto.description shouldBe "Test description"
        dto.status shouldBe "ACTIVE"
        dto.epicCount shouldBe 5
        dto.storyCount shouldBe 12
        dto.totalIssues shouldBe 25
    }

    "should handle null description in Project mapping" {
        // Arrange
        val project = TestEntityFactory.createTestProject(
            description = null
        )

        // Act
        val dto = DashboardMapper.toProjectView(
            project = project,
            epicCount = 0,
            storyCount = 0,
            totalIssues = 0
        )

        // Assert
        dto.description.shouldBeNull()
    }

    "should map Issue to IssueViewDTO" {
        // Arrange
        val issue = TestEntityFactory.createTestIssue(
            title = "Test Issue",
            type = IssueType.STORY,
            status = IssueStatus.IN_PROGRESS
        )

        // Act
        val dto = DashboardMapper.toIssueView(issue, childCount = 3)

        // Assert
        dto.title shouldBe "Test Issue"
        dto.type shouldBe "STORY"
        dto.status shouldBe "IN_PROGRESS"
        dto.childCount shouldBe 3
    }

    "should handle unestimated issues" {
        // Arrange
        val issue = TestEntityFactory.createTestIssue(
            estimate = StoryPoints.unestimated()
        )

        // Act
        val dto = DashboardMapper.toIssueView(issue)

        // Assert
        dto.estimate.shouldBeNull()
    }

    "should compute isBlocked from domain logic" {
        // Arrange
        val blockedIssue = TestEntityFactory.createTestIssue(
            // Setup dependencies that make it blocked
        )

        // Act
        val dto = DashboardMapper.toIssueView(blockedIssue)

        // Assert
        dto.isBlocked shouldBe true
    }

    "should build hierarchy node with children" {
        // Arrange
        val epic = TestEntityFactory.createTestIssue(
            type = IssueType.EPIC,
            title = "Epic 1"
        )
        val story1 = TestEntityFactory.createTestIssue(
            type = IssueType.STORY,
            title = "Story 1",
            parentId = epic.id
        )
        val story2 = TestEntityFactory.createTestIssue(
            type = IssueType.STORY,
            title = "Story 2",
            parentId = epic.id
        )

        // Act
        val node = DashboardMapper.toHierarchyNode(epic, listOf(story1, story2))

        // Assert
        node.issue.title shouldBe "Epic 1"
        node.children shouldHaveSize 2
        node.children[0].issue.title shouldBe "Story 1"
        node.children[1].issue.title shouldBe "Story 2"
    }

    "should handle empty children list" {
        // Arrange
        val story = TestEntityFactory.createTestIssue(
            type = IssueType.STORY
        )

        // Act
        val node = DashboardMapper.toHierarchyNode(story, emptyList())

        // Assert
        node.children shouldHaveSize 0
    }
})
```

### Testing Cache

**Test file**: `DashboardCacheTest.kt`

```kotlin
package io.spiralhouse.cycletime.application.services

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import kotlinx.coroutines.delay
import kotlin.time.Duration.Companion.milliseconds

class DashboardCacheTest : StringSpec({

    "should cache and return cached value" {
        // Arrange
        val cache = DashboardCache()
        var callCount = 0

        // Act
        val result1 = cache.getOrPut("key") {
            callCount++
            "value"
        }

        val result2 = cache.getOrPut("key") {
            callCount++
            "should-not-be-called"
        }

        // Assert
        result1 shouldBe "value"
        result2 shouldBe "value"
        callCount shouldBe 1  // Compute called only once
    }

    "should expire entries after TTL" {
        // Arrange
        val cache = DashboardCache(defaultTTL = 100.milliseconds)
        var callCount = 0

        // Act
        cache.getOrPut("key", ttl = 100.milliseconds) {
            callCount++
            "first"
        }

        delay(150) // Wait for expiration

        cache.getOrPut("key", ttl = 100.milliseconds) {
            callCount++
            "second"
        }

        // Assert
        callCount shouldBe 2  // Called twice due to expiration
    }

    "should invalidate specific key" {
        // Arrange
        val cache = DashboardCache()
        cache.getOrPut("key1") { "value1" }
        cache.getOrPut("key2") { "value2" }

        // Act
        cache.invalidate("key1")

        var callCount = 0
        cache.getOrPut("key1") {
            callCount++
            "new-value1"
        }

        // Assert
        callCount shouldBe 1  // key1 was invalidated, recomputed
    }

    "should invalidate by pattern" {
        // Arrange
        val cache = DashboardCache()
        cache.getOrPut("story:1:subtasks") { "subtasks1" }
        cache.getOrPut("story:2:subtasks") { "subtasks2" }
        cache.getOrPut("project:1:hierarchy") { "hierarchy" }

        // Act
        cache.invalidatePattern("story:*:subtasks")

        // Assert
        // Story caches should be invalidated
        // Project cache should remain
    }

    "should evict oldest entry when cache is full" {
        // Arrange
        val cache = DashboardCache(maxSize = 2)

        // Act
        cache.getOrPut("key1") { "value1" }
        cache.getOrPut("key2") { "value2" }
        cache.getOrPut("key3") { "value3" }  // Should evict key1

        // Assert
        // Verify cache size stays at 2
    }

    "should clear all entries" {
        // Arrange
        val cache = DashboardCache()
        cache.getOrPut("key1") { "value1" }
        cache.getOrPut("key2") { "value2" }

        // Act
        cache.clear()

        var callCount = 0
        cache.getOrPut("key1") {
            callCount++
            "new-value1"
        }

        // Assert
        callCount shouldBe 1  // Cache was cleared, recomputed
    }
})
```

### Testing Application Service

**Test file**: `DashboardApplicationServiceTest.kt`

```kotlin
package io.spiralhouse.cycletime.application.services

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.valueobjects.IssueType
import io.spiralhouse.cycletime.test.utils.TestEntityFactory

class DashboardApplicationServiceTest : StringSpec({
    lateinit var projectRepo: ProjectRepository
    lateinit var issueRepo: IssueRepository
    lateinit var cache: DashboardCache
    lateinit var service: DashboardApplicationService

    beforeEach {
        projectRepo = mockk()
        issueRepo = mockk()
        cache = DashboardCache()
        service = DashboardApplicationService(projectRepo, issueRepo, cache)
    }

    "should list projects with statistics" {
        // Arrange
        val project = TestEntityFactory.createTestProject()
        val issues = listOf(
            TestEntityFactory.createTestIssue(type = IssueType.EPIC),
            TestEntityFactory.createTestIssue(type = IssueType.EPIC),
            TestEntityFactory.createTestIssue(type = IssueType.STORY),
            TestEntityFactory.createTestIssue(type = IssueType.STORY),
            TestEntityFactory.createTestIssue(type = IssueType.STORY)
        )

        coEvery { projectRepo.findAll() } returns listOf(project)
        coEvery { issueRepo.findByProject(any()) } returns issues

        // Act
        val result = service.listProjects()

        // Assert
        result shouldHaveSize 1
        result[0].epicCount shouldBe 2
        result[0].storyCount shouldBe 3
        result[0].totalIssues shouldBe 5
    }

    "should build project hierarchy without N+1 queries" {
        // Arrange
        val project = TestEntityFactory.createTestProject()
        val epic = TestEntityFactory.createTestIssue(type = IssueType.EPIC)
        val story1 = TestEntityFactory.createTestIssue(
            type = IssueType.STORY,
            parentId = epic.id
        )
        val story2 = TestEntityFactory.createTestIssue(
            type = IssueType.STORY,
            parentId = epic.id
        )

        coEvery { projectRepo.findById(any()) } returns project
        coEvery { issueRepo.findByProject(any()) } returns listOf(epic, story1, story2)

        // Act
        service.getProjectHierarchy(project.id.value.toString())

        // Assert - Should only call repositories once each
        coVerify(exactly = 1) { projectRepo.findById(any()) }
        coVerify(exactly = 1) { issueRepo.findByProject(any()) }
    }

    "should cache project hierarchy" {
        // Arrange
        val project = TestEntityFactory.createTestProject()
        val issues = listOf(TestEntityFactory.createTestIssue(type = IssueType.EPIC))

        coEvery { projectRepo.findById(any()) } returns project
        coEvery { issueRepo.findByProject(any()) } returns issues

        // Act
        val projectId = project.id.value.toString()
        service.getProjectHierarchy(projectId)  // First call
        service.getProjectHierarchy(projectId)  // Second call (should hit cache)

        // Assert - Repository should only be called once
        coVerify(exactly = 1) { projectRepo.findById(any()) }
        coVerify(exactly = 1) { issueRepo.findByProject(any()) }
    }

    "should handle orphaned stories" {
        // Arrange
        val project = TestEntityFactory.createTestProject()
        val epic = TestEntityFactory.createTestIssue(type = IssueType.EPIC)
        val storyWithParent = TestEntityFactory.createTestIssue(
            type = IssueType.STORY,
            parentId = epic.id
        )
        val orphanedStory = TestEntityFactory.createTestIssue(
            type = IssueType.STORY,
            parentId = null  // No parent
        )

        coEvery { projectRepo.findById(any()) } returns project
        coEvery { issueRepo.findByProject(any()) } returns listOf(
            epic,
            storyWithParent,
            orphanedStory
        )

        // Act
        val hierarchy = service.getProjectHierarchy(project.id.value.toString())

        // Assert
        hierarchy!!.epics shouldHaveSize 1
        hierarchy.epics[0].children shouldHaveSize 1  // storyWithParent
        hierarchy.orphanedStories shouldHaveSize 1    // orphanedStory
    }

    "should return null for nonexistent project" {
        // Arrange
        coEvery { projectRepo.findById(any()) } returns null

        // Act
        val result = service.getProjectHierarchy("nonexistent-id")

        // Assert
        result shouldBe null
    }

    "should get story subtasks" {
        // Arrange
        val story = TestEntityFactory.createTestIssue(type = IssueType.STORY)
        val subtask1 = TestEntityFactory.createTestIssue(
            type = IssueType.SUBTASK,
            parentId = story.id
        )
        val subtask2 = TestEntityFactory.createTestIssue(
            type = IssueType.SUBTASK,
            parentId = story.id
        )

        coEvery { issueRepo.findByParent(any()) } returns listOf(subtask1, subtask2)

        // Act
        val result = service.getStorySubtasks(story.id.value.toString())

        // Assert
        result shouldHaveSize 2
    }

    "should invalidate project cache" {
        // Arrange
        val project = TestEntityFactory.createTestProject()
        coEvery { projectRepo.findAll() } returns listOf(project)
        coEvery { issueRepo.findByProject(any()) } returns emptyList()

        // Cache initial data
        service.listProjects()

        // Act
        service.invalidateProject(project.id.value.toString())

        // Subsequent call should fetch fresh data
        service.listProjects()

        // Assert - Should be called twice (not once from cache)
        coVerify(exactly = 2) { projectRepo.findAll() }
    }
})
```

## Integration Tests

### Testing Routes

**Location**: `src/integrationTest/kotlin/io/spiralhouse/cycletime/dashboard/`

**Test file**: `DashboardRoutesIntegrationTest.kt`

```kotlin
package io.spiralhouse.cycletime.dashboard

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldNotContain
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import io.spiralhouse.cycletime.configureDependencies
import io.spiralhouse.cycletime.configureRouting
import io.spiralhouse.cycletime.test.utils.IntegrationTestBase

class DashboardRoutesIntegrationTest : IntegrationTestBase({

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

    "GET /dashboard should display project cards" {
        testApplication {
            application {
                configureDependencies()
                configureRouting()
            }

            // Create test project
            val projectId = createTestProject(name = "Test Project")

            val response = client.get("/dashboard")

            response.status shouldBe HttpStatusCode.OK
            response.bodyAsText() shouldContain "Test Project"
            response.bodyAsText() shouldContain "/dashboard/projects/$projectId"
        }
    }

    "GET /dashboard/projects/{id} should return hierarchy" {
        testApplication {
            application {
                configureDependencies()
                configureRouting()
            }

            // Create test hierarchy
            val projectId = createTestProject()
            createTestIssue(projectId, type = "EPIC", title = "Test Epic")

            val response = client.get("/dashboard/projects/$projectId")

            response.status shouldBe HttpStatusCode.OK
            response.bodyAsText() shouldContain "📚 Epics"
            response.bodyAsText() shouldContain "Test Epic"
        }
    }

    "GET /dashboard/projects/invalid should return 404" {
        testApplication {
            application {
                configureDependencies()
                configureRouting()
            }

            val response = client.get("/dashboard/projects/00000000-0000-0000-0000-000000000000")

            response.status shouldBe HttpStatusCode.NotFound
        }
    }

    "HTMX GET /dashboard/stories/{id}/subtasks should return fragment" {
        testApplication {
            application {
                configureDependencies()
                configureRouting()
            }

            // Create story with subtasks
            val projectId = createTestProject()
            val storyId = createTestIssue(projectId, type = "STORY")
            createTestIssue(projectId, type = "SUBTASK", parentId = storyId, title = "Subtask 1")
            createTestIssue(projectId, type = "SUBTASK", parentId = storyId, title = "Subtask 2")

            val response = client.get("/dashboard/stories/$storyId/subtasks") {
                header("HX-Request", "true")
            }

            response.status shouldBe HttpStatusCode.OK
            // Should be HTML fragment, not full page
            response.bodyAsText() shouldNotContain "<!DOCTYPE html>"
            response.bodyAsText() shouldContain "Subtask 1"
            response.bodyAsText() shouldContain "Subtask 2"
        }
    }

    "GET /dashboard should show service health" {
        testApplication {
            application {
                configureDependencies()
                configureRouting()
            }

            val response = client.get("/dashboard")

            response.status shouldBe HttpStatusCode.OK
            response.bodyAsText() shouldContain "Status:"
            response.bodyAsText() shouldContain "healthy"
        }
    }

    "GET /dashboard/projects/{id} should cache hierarchy" {
        testApplication {
            application {
                configureDependencies()
                configureRouting()
            }

            val projectId = createTestProject()

            // First request
            val response1 = client.get("/dashboard/projects/$projectId")
            response1.status shouldBe HttpStatusCode.OK

            // Second request (should hit cache)
            val response2 = client.get("/dashboard/projects/$projectId")
            response2.status shouldBe HttpStatusCode.OK

            // Both should return same content
            response1.bodyAsText() shouldBe response2.bodyAsText()
        }
    }
})
```

## System Tests (Optional)

### Performance Testing

**Test file**: `DashboardPerformanceTest.kt`

```kotlin
package io.spiralhouse.cycletime.dashboard

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.longs.shouldBeLessThan
import io.ktor.client.request.*
import io.ktor.server.testing.*
import kotlin.system.measureTimeMillis

class DashboardPerformanceTest : StringSpec({

    "dashboard should load in under 500ms for typical project" {
        testApplication {
            application {
                configureDependencies()
                configureRouting()
            }

            // Create typical project (100 issues)
            val projectId = createTypicalProject(issueCount = 100)

            val duration = measureTimeMillis {
                client.get("/dashboard/projects/$projectId")
            }

            duration shouldBeLessThan 500
        }
    }

    "projects list should handle 50 projects efficiently" {
        testApplication {
            application {
                configureDependencies()
                configureRouting()
            }

            // Create 50 projects
            repeat(50) {
                createTestProject(name = "Project $it")
            }

            val duration = measureTimeMillis {
                client.get("/dashboard")
            }

            duration shouldBeLessThan 1000
        }
    }
})
```

## Test Utilities

### Test Entity Factory

**Location**: `src/test/kotlin/io/spiralhouse/cycletime/test/utils/TestEntityFactory.kt`

```kotlin
package io.spiralhouse.cycletime.test.utils

import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.datetime.Clock
import java.util.UUID

object TestEntityFactory {

    fun createTestProject(
        id: UUID = UUID.randomUUID(),
        name: String = "Test Project",
        description: String? = "Test description",
        status: ProjectStatus = ProjectStatus.ACTIVE
    ): Project {
        return Project(
            id = ProjectId(id.toString()),
            name = name,
            description = description,
            status = status,
            createdAt = Clock.System.now(),
            updatedAt = Clock.System.now()
        )
    }

    fun createTestIssue(
        id: UUID = UUID.randomUUID(),
        title: String = "Test Issue",
        description: String? = "Test description",
        type: IssueType = IssueType.STORY,
        status: IssueStatus = IssueStatus.TODO,
        parentId: IssueId? = null,
        projectId: ProjectId? = null,
        estimate: StoryPoints = StoryPoints.of(3)
    ): Issue {
        return Issue(
            id = IssueId(id.toString()),
            title = title,
            description = description,
            type = type,
            status = status,
            parentId = parentId,
            projectId = projectId,
            estimate = estimate,
            assigneeId = null,
            createdAt = Clock.System.now(),
            updatedAt = Clock.System.now()
        )
    }
}
```

## Running Tests

### Run All Dashboard Tests

```bash
# Unit tests only
./gradlew test --tests "*Dashboard*"

# Integration tests only
./gradlew integrationTest --tests "*Dashboard*"

# All tests
./gradlew testAll --tests "*Dashboard*"
```

### Run Specific Test Classes

```bash
# Mapper tests
./gradlew test --tests "DashboardMapperTest"

# Service tests
./gradlew test --tests "DashboardApplicationServiceTest"

# Route integration tests
./gradlew integrationTest --tests "DashboardRoutesIntegrationTest"
```

### Generate Coverage Report

```bash
./gradlew koverHtmlReport
open build/reports/kover/html/index.html
```

**Coverage Targets**:
- Mappers: 100%
- Application service: 90%+
- Routes: 80%+
- Overall: 90%+

## Test Quality Checklist

Before marking tests complete, verify:

- [ ] All mapper functions have unit tests
- [ ] Cache behavior fully tested (TTL, eviction, invalidation)
- [ ] Service methods tested with mocked repositories
- [ ] All HTTP routes have integration tests
- [ ] Error cases tested (404, 400, 500)
- [ ] HTMX endpoints verified as fragments (not full pages)
- [ ] Cache invalidation tested
- [ ] Performance baselines established
- [ ] Test coverage meets targets (90%+)
- [ ] Tests run in isolation (no interdependencies)
- [ ] Tests are deterministic (no flaky tests)

## Common Testing Pitfalls

### Avoid Time-Dependent Tests

❌ **Bad**:
```kotlin
"should expire cache after 5 minutes" {
    cache.put("key", "value")
    delay(300_000)  // Wait 5 minutes - SLOW!
    cache.get("key") shouldBe null
}
```

✅ **Good**:
```kotlin
"should expire cache after TTL" {
    val cache = DashboardCache(defaultTTL = 100.milliseconds)
    cache.put("key", "value")
    delay(150)  // Short wait
    cache.get("key") shouldBe null
}
```

### Avoid Shared Mutable State

❌ **Bad**:
```kotlin
class DashboardServiceTest : StringSpec({
    val sharedService = DashboardApplicationService(...)  // Shared!

    "test 1" { /* modifies sharedService */ }
    "test 2" { /* affected by test 1 */ }
})
```

✅ **Good**:
```kotlin
class DashboardServiceTest : StringSpec({
    lateinit var service: DashboardApplicationService

    beforeEach {
        service = DashboardApplicationService(...)  // Fresh instance
    }

    "test 1" { /* uses isolated service */ }
    "test 2" { /* uses isolated service */ }
})
```

### Verify HTMX Fragment Responses

✅ **Important**:
```kotlin
"HTMX endpoint should return fragment" {
    val response = client.get("/dashboard/stories/id/subtasks")

    // Verify it's a fragment, not a full page
    response.bodyAsText() shouldNotContain "<!DOCTYPE html>"
    response.bodyAsText() shouldNotContain "<html>"
}
```

## Related Documentation

- [Dashboard Implementation Guide](./dashboard-implementation-guide.md) - Implementation steps
- [Testing Standards](../../../.claude/shared/testing-standards.md) - CycleTime testing philosophy
- [Dashboard Architecture Concept](../../concepts/dashboard/dashboard-architecture-concept.md) - Architectural context
- [Dashboard API Reference](../../reference/dashboard/dashboard-api-reference.md) - API specifications

## Summary

Comprehensive testing of the CycleTime Dashboard requires:

- **Unit tests** for mappers, cache, and service logic
- **Integration tests** for HTTP routes and database interactions
- **System tests** for performance baselines (optional)
- **High coverage** (90%+ target)
- **Fast execution** (< 10ms unit, < 100ms integration)
- **Isolated tests** (no shared state, deterministic)

Follow the test-driven development approach: write tests first, implement to make them pass, refactor for quality.
