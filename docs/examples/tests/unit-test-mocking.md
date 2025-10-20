---
title: "Unit Test Mocking Examples"
type: example
domain: [testing]
description: "Complete working examples of time mocking, repository mocking, and service dependency mocking"
dependencies: [../../concepts/testing/test-architecture.md, ../../patterns/testing/unit-test-pattern.md]
related: [integration-test-database.md]
keywords: [mocking, mockk, time-provider, unit-testing, examples]
tested: true
last_updated: 2025-10-19
---

# Unit Test Mocking Examples

## Overview

This document demonstrates practical mocking patterns for unit tests in CycleTime. All examples are complete, runnable, and follow established patterns from the codebase.

## Prerequisites

- Understanding of [Test Architecture](../../concepts/testing/test-architecture.md)
- Familiarity with [Unit Test Pattern](../../patterns/testing/unit-test-pattern.md)
- Kotest and MockK knowledge

## Complete Working Example: Time Provider Mocking

```kotlin
package io.spiralhouse.cycletime.domain.entities

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.spiralhouse.cycletime.testing.mocks.MockTimeProvider
import java.time.Duration
import java.time.Instant

class ProjectTest : DescribeSpec({
    lateinit var mockTimeProvider: MockTimeProvider

    beforeEach {
        mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
    }

    describe("Project Entity") {
        describe("creation") {
            it("should create project with current timestamp") {
                val project = Project.create(
                    name = "Test Project",
                    description = "Test Description",
                    timeProvider = mockTimeProvider
                )

                project.createdAt shouldBe Instant.parse("2025-01-15T10:00:00Z")
                project.updatedAt shouldBe Instant.parse("2025-01-15T10:00:00Z")
            }
        }

        describe("time tracking") {
            it("should update timestamp when modified") {
                val project = Project.create(
                    name = "Test Project",
                    description = "Description",
                    timeProvider = mockTimeProvider
                )

                // Advance time by 1 hour
                mockTimeProvider.advance(Duration.ofHours(1))

                project.updateName("Updated Name")

                project.updatedAt shouldBe Instant.parse("2025-01-15T11:00:00Z")
                project.name shouldBe "Updated Name"
            }
        }
    }
})
```

### Explanation

#### Step 1: Initialize MockTimeProvider

```kotlin
beforeEach {
    mockTimeProvider = MockTimeProvider()
    mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
}
```

Create a fresh `MockTimeProvider` for each test and set it to a fixed time. This ensures deterministic results without waiting for real time to pass.

#### Step 2: Inject into Entity

```kotlin
val project = Project.create(
    name = "Test Project",
    description = "Test Description",
    timeProvider = mockTimeProvider  // Injected dependency
)
```

Pass the mock to the entity through constructor injection or factory method.

#### Step 3: Control Time

```kotlin
mockTimeProvider.advance(Duration.ofHours(1))
```

Advance time instantly without `delay()`. The next call to `timeProvider.now()` returns the advanced time.

## Repository Mocking Example

```kotlin
package io.spiralhouse.cycletime.application.services

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.assertions.throwables.shouldThrow
import io.mockk.mockk
import io.mockk.every
import io.mockk.verify
import io.mockk.coEvery
import io.mockk.coVerify
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.exceptions.ProjectNotFoundException

class ProjectApplicationServiceTest : DescribeSpec({
    lateinit var mockRepository: ProjectRepository
    lateinit var service: ProjectApplicationService

    beforeEach {
        mockRepository = mockk()
        service = ProjectApplicationService(mockRepository)
    }

    describe("findProjectById") {
        it("should return project when found") {
            val projectId = ProjectId.generate()
            val expectedProject = createTestProject(id = projectId)

            // Arrange: Mock repository behavior
            coEvery { mockRepository.findById(projectId) } returns expectedProject

            // Act
            val result = runBlocking { service.findProjectById(projectId) }

            // Assert
            result shouldBe expectedProject
            coVerify(exactly = 1) { mockRepository.findById(projectId) }
        }

        it("should throw exception when project not found") {
            val projectId = ProjectId.generate()

            // Arrange: Mock returns null
            coEvery { mockRepository.findById(projectId) } returns null

            // Act & Assert
            shouldThrow<ProjectNotFoundException> {
                runBlocking { service.findProjectById(projectId) }
            }
        }
    }
})
```

### Explanation

#### Step 1: Create Mock Repository

```kotlin
mockRepository = mockk()
```

Use MockK to create a mock that implements the repository interface.

#### Step 2: Define Behavior

```kotlin
coEvery { mockRepository.findById(projectId) } returns expectedProject
```

Use `coEvery` for suspend functions. Define what the mock returns when called with specific arguments.

#### Step 3: Verify Interactions

```kotlin
coVerify(exactly = 1) { mockRepository.findById(projectId) }
```

Verify the mock was called the expected number of times with the correct arguments.

## Service Dependency Mocking

```kotlin
package io.spiralhouse.cycletime.domain.entities

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.mockk.mockk
import io.mockk.coEvery
import io.spiralhouse.cycletime.domain.services.ValidationService

class IssueTest : DescribeSpec({
    lateinit var mockValidationService: ValidationService
    lateinit var mockTimeProvider: MockTimeProvider

    beforeEach {
        mockValidationService = mockk()
        mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
    }

    describe("Issue creation with validation") {
        it("should validate title before creating issue") {
            // Arrange
            coEvery {
                mockValidationService.validateTitle(any())
            } returns ValidationResult.Valid

            // Act
            val issue = Issue.create(
                title = "Valid Title",
                description = "Description",
                type = IssueType.Story,
                validationService = mockValidationService,
                timeProvider = mockTimeProvider
            )

            // Assert
            issue.title shouldBe "Valid Title"
            coVerify { mockValidationService.validateTitle("Valid Title") }
        }
    }
})
```

## Running the Examples

```bash
# Run all unit tests
./gradlew unitTest

# Run specific test file
./gradlew unitTest --tests "*ProjectTest"

# Run with verbose output
./gradlew unitTest --info
```

## Variations

### Variation 1: Custom Fake Repository

When mocks become complex, use a custom fake implementation:

```kotlin
class FakeProjectRepository : ProjectRepository {
    private val storage = mutableMapOf<ProjectId, Project>()

    override suspend fun findById(id: ProjectId): Project? = storage[id]

    override suspend fun save(project: Project) {
        storage[project.id] = project
    }

    // Test helper methods
    fun addTestProject(project: Project) {
        storage[project.id] = project
    }
}
```

### Variation 2: Time-Independent Tests

For components without time dependencies, omit TimeProvider:

```kotlin
describe("Value Object validation") {
    it("should validate UUID format") {
        val validId = "550e8400-e29b-41d4-a716-446655440000"
        val projectId = ProjectId(validId)

        projectId.value shouldBe validId
    }
}
```

## Common Issues

**Issue**: `coVerify` fails with "no matching calls"

**Solution**: Ensure you're using `coEvery` and `coVerify` for suspend functions, not `every` and `verify`.

**Issue**: Tests fail with "time not set"

**Solution**: Initialize MockTimeProvider in `beforeEach` with a fixed time.

**Issue**: Mocks return null unexpectedly

**Solution**: Verify mock setup uses correct argument matchers. Use `any()` for flexible matching.

## Related Examples

- [Integration Test Database](integration-test-database.md) - Testing with real databases
- [Test Architecture](../../concepts/testing/test-architecture.md) - Design principles
