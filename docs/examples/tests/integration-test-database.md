---
title: "Integration Test Database Examples"
type: example
domain: [testing, persistence]
description: "Complete H2 database setup, transaction patterns, and cleanup examples for integration tests"
dependencies: [../../concepts/testing/test-architecture.md, ../../patterns/testing/integration-test-pattern.md]
related: [unit-test-mocking.md]
keywords: [integration-testing, h2, database, transactions, exposed-orm]
tested: true
last_updated: 2025-10-19
---

# Integration Test Database Examples

## Overview

This document provides complete, working examples of integration tests using H2 in-memory databases. All patterns follow CycleTime's established testing architecture.

## Prerequisites

- Understanding of [Test Architecture](../../concepts/testing/test-architecture.md)
- Familiarity with [Integration Test Pattern](../../patterns/testing/integration-test-pattern.md)
- Exposed ORM basics

## Complete Working Example: Repository Integration Test

```kotlin
package io.spiralhouse.cycletime.infrastructure.persistence

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.services.RealTimeProvider
import io.spiralhouse.cycletime.infrastructure.database.Projects
import io.spiralhouse.cycletime.infrastructure.database.Issues
import io.spiralhouse.cycletime.infrastructure.database.ProjectIssues
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.transactions.TransactionManager
import java.util.UUID

class H2ProjectRepositoryIntegrationTest : DescribeSpec({
    lateinit var database: Database
    lateinit var repository: H2ProjectRepository
    val timeProvider = RealTimeProvider()

    beforeEach {
        // Fresh H2 database for each test
        database = Database.connect(
            url = "jdbc:h2:mem:test_${UUID.randomUUID()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )

        // Create schema
        transaction(database) {
            SchemaUtils.create(Projects, Issues, ProjectIssues)
        }

        repository = H2ProjectRepository(database, timeProvider)
    }

    afterEach {
        // Explicit cleanup prevents connection leaks
        TransactionManager.closeAndUnregister(database)
    }

    describe("H2ProjectRepository") {
        describe("save and findById") {
            it("should persist and retrieve project") {
                val project = Project.create(
                    name = "Test Project",
                    description = "Integration test project",
                    timeProvider = timeProvider
                )

                // Act
                runBlocking { repository.save(project) }
                val retrieved = runBlocking { repository.findById(project.id) }

                // Assert
                retrieved shouldNotBe null
                retrieved?.id shouldBe project.id
                retrieved?.name shouldBe "Test Project"
                retrieved?.description shouldBe "Integration test project"
            }

            it("should update existing project") {
                val project = Project.create(
                    name = "Original Name",
                    description = "Original description",
                    timeProvider = timeProvider
                )

                runBlocking { repository.save(project) }

                // Modify and save again
                project.updateName("Updated Name")
                runBlocking { repository.save(project) }

                // Retrieve and verify
                val retrieved = runBlocking { repository.findById(project.id) }
                retrieved?.name shouldBe "Updated Name"
            }
        }

        describe("findAll") {
            it("should retrieve all projects") {
                val project1 = Project.create("Project 1", "Desc 1", timeProvider)
                val project2 = Project.create("Project 2", "Desc 2", timeProvider)

                runBlocking {
                    repository.save(project1)
                    repository.save(project2)
                }

                val projects = runBlocking { repository.findAll() }

                projects.size shouldBe 2
                projects.any { it.id == project1.id } shouldBe true
                projects.any { it.id == project2.id } shouldBe true
            }
        }

        describe("delete") {
            it("should delete project") {
                val project = Project.create("To Delete", "Desc", timeProvider)
                runBlocking { repository.save(project) }

                val deleted = runBlocking { repository.delete(project.id) }
                deleted shouldBe true

                val retrieved = runBlocking { repository.findById(project.id) }
                retrieved shouldBe null
            }

            it("should return false when deleting non-existent project") {
                val deleted = runBlocking { repository.delete(ProjectId.generate()) }
                deleted shouldBe false
            }
        }

        describe("exists") {
            it("should return true for existing project") {
                val project = Project.create("Exists", "Desc", timeProvider)
                runBlocking { repository.save(project) }

                val exists = runBlocking { repository.exists(project.id) }
                exists shouldBe true
            }

            it("should return false for non-existent project") {
                val exists = runBlocking { repository.exists(ProjectId.generate()) }
                exists shouldBe false
            }
        }
    }
})
```

### Explanation

#### Step 1: Setup Fresh Database

```kotlin
beforeEach {
    database = Database.connect(
        url = "jdbc:h2:mem:test_${UUID.randomUUID()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        driver = "org.h2.Driver"
    )
}
```

Create a unique in-memory H2 database for each test using UUID. `MODE=PostgreSQL` ensures SQL compatibility, `DATABASE_TO_LOWER=TRUE` handles case sensitivity, and `DB_CLOSE_DELAY=-1` keeps the database alive for the test duration.

#### Step 2: Create Schema

```kotlin
transaction(database) {
    SchemaUtils.create(Projects, Issues, ProjectIssues)
}
```

Use Exposed's `SchemaUtils` to create tables from table definitions.

#### Step 3: Test Repository Operations

```kotlin
runBlocking { repository.save(project) }
val retrieved = runBlocking { repository.findById(project.id) }
```

Use `runBlocking` to test suspend functions. Test one operation at a time.

#### Step 4: Cleanup

```kotlin
afterEach {
    TransactionManager.closeAndUnregister(database)
}
```

Always close and unregister the database to prevent connection leaks.

## Transaction Pattern Example

```kotlin
class TransactionIntegrationTest : DescribeSpec({
    lateinit var database: Database
    lateinit var unitOfWork: UnitOfWork

    beforeEach {
        database = Database.connect("jdbc:h2:mem:test_${UUID.randomUUID()};DB_CLOSE_DELAY=-1")
        transaction(database) {
            SchemaUtils.create(Projects, Issues, ProjectIssues)
        }
        unitOfWork = H2UnitOfWork(database)
    }

    afterEach {
        TransactionManager.closeAndUnregister(database)
    }

    describe("Transaction boundaries") {
        it("should commit transaction on success") {
            val project = Project.create("Transaction Test", "Desc", timeProvider)

            runBlocking {
                unitOfWork.executeInTransaction {
                    // Multiple operations in one transaction
                    projectRepository.save(project)
                    issueRepository.saveToProject(issue, project.id)
                }
            }

            // Verify both operations committed
            val retrieved = runBlocking { projectRepository.findById(project.id) }
            retrieved shouldNotBe null
        }

        it("should rollback transaction on error") {
            val project = Project.create("Rollback Test", "Desc", timeProvider)

            // Transaction should rollback
            shouldThrow<Exception> {
                runBlocking {
                    unitOfWork.executeInTransaction {
                        projectRepository.save(project)
                        throw Exception("Simulated error")
                    }
                }
            }

            // Verify nothing was saved
            val retrieved = runBlocking { projectRepository.findById(project.id) }
            retrieved shouldBe null
        }
    }
})
```

## Running the Examples

```bash
# Run all integration tests
./gradlew integrationTest

# Run specific test file
./gradlew integrationTest --tests "*H2ProjectRepositoryIntegrationTest"

# Run with verbose SQL logging
./gradlew integrationTest --info
```

## Variations

### Variation 1: Test with Data Fixtures

```kotlin
beforeEach {
    database = Database.connect("jdbc:h2:mem:test_${UUID.randomUUID()};DB_CLOSE_DELAY=-1")
    transaction(database) {
        SchemaUtils.create(Projects, Issues)

        // Insert test data
        Projects.insert {
            it[id] = "test-project-1"
            it[name] = "Fixture Project"
            it[description] = "Pre-loaded data"
        }
    }

    repository = H2ProjectRepository(database, timeProvider)
}
```

### Variation 2: Test with Concurrent Access

```kotlin
it("should handle concurrent saves") {
    val projects = (1..10).map { index ->
        Project.create("Concurrent $index", "Desc", timeProvider)
    }

    runBlocking {
        // Save all projects concurrently
        projects.map { project ->
            async {
                repository.save(project)
            }
        }.awaitAll()
    }

    val allProjects = runBlocking { repository.findAll() }
    allProjects.size shouldBe 10
}
```

## Common Issues

**Issue**: "Database already closed" errors

**Solution**: Ensure `DB_CLOSE_DELAY=-1` is set and cleanup happens in `afterEach`, not `afterSpec`.

**Issue**: Tests fail with "table already exists"

**Solution**: Use unique database names with UUID: `test_${UUID.randomUUID()}`.

**Issue**: Transaction not rolling back

**Solution**: Wrap operations in `unitOfWork.executeInTransaction {}` rather than bare `transaction {}`.

## Related Examples

- [Unit Test Mocking](unit-test-mocking.md) - Testing without real databases
- [Integration Test Pattern](../../patterns/testing/integration-test-pattern.md) - Pattern details
