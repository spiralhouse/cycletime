---
title: "Integration Test Example - Session Repository"
type: example
domain: [testing]
description: "Demonstrates integration testing with real database and proper resource cleanup"
dependencies: [../../reference/definition-of-done.md]
related: [../../concepts/testing/test-architecture.md, ../../../.claude/shared/testing-standards.md]
keywords: [dod, example, integration-testing, database, repository-pattern]
last_updated: 2025-10-21
---

# Integration Test Example - Session Repository

## Context

This example demonstrates proper integration testing for database operations. The test uses a real H2 database with proper setup/teardown to ensure test isolation.

## PASS Example

```kotlin
class SessionRepositoryIntegrationTest : StringSpec({
    lateinit var database: Database
    lateinit var repository: SessionRepository

    beforeEach {
        database = Database.connect(
            "jdbc:h2:mem:test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"
        )
        transaction(database) {
            SchemaUtils.create(SessionStates, Projects, Issues)
        }
        repository = ExposedSessionRepository()
    }

    afterEach {
        TransactionManager.closeAndUnregister(database)
    }

    "should persist and retrieve session" {
        val session = Session(id = "sess-123", projectId = "proj-456")

        repository.save(session)
        val retrieved = repository.findById("sess-123")

        retrieved shouldBe session
    }

    "should return null for non-existent session" {
        val retrieved = repository.findById("non-existent")

        retrieved shouldBe null
    }

    "should update existing session" {
        val session = Session(id = "sess-123", projectId = "proj-456")
        repository.save(session)

        val updated = session.copy(projectId = "proj-789")
        repository.save(updated)

        val retrieved = repository.findById("sess-123")
        retrieved?.projectId shouldBe "proj-789"
    }
})
```

## Explanation

**Why This Passes DoD:**
- Real infrastructure (H2 database)
- Test isolation (fresh database per test)
- Proper resource cleanup (afterEach closes database)
- Moderate execution time (< 100ms per test)
- Tests all repository operations (save, find, update)
- Clear test names describing behavior

## Related DoD Criteria

- Section 5.2: Integration Tests - Real infrastructure, controlled environment
- Section 5.4: Test Quality Standards - Independent tests with clear names
- Testing Standards: Database isolation and lifecycle management
