---
title: "Test Architecture"
type: concept
domain: [testing, architecture]
description: "Designing code for testability through dependency injection, time abstraction, and resource lifecycle management"
dependencies: [testing-strategy.md]
related: [../../concepts/architecture/domain-driven-design.md]
keywords: [testability, dependency-injection, time-mocking, architecture, testing]
audience: [developers, architects]
last_updated: 2025-10-19
---

# Test Architecture

## What is Test Architecture?

Test architecture refers to the design patterns and structural decisions that make code easy to test. It's the practice of designing systems so that components can be tested in isolation, dependencies can be controlled, and tests remain fast and maintainable.

In CycleTime, test architecture is implemented through:

- **Dependency Injection**: External dependencies injected through constructor parameters
- **Interface-Based Design**: Abstractions that enable mocking and substitution
- **Resource Lifecycle Management**: Clear ownership of resources with explicit cleanup
- **Time Abstraction**: Controllable time for deterministic tests

## Why Does It Matter?

### Code Not Designed for Testability is Expensive to Test

When testability is an afterthought, testing becomes painful:

- Tests require complex setup with tightly coupled dependencies
- Mock frameworks are used to bypass hard-coded dependencies
- Tests become brittle, breaking with minor refactoring
- Flaky tests due to uncontrolled external factors (time, network, filesystem)

Retrofitting testability into existing code is orders of magnitude more expensive than designing for testability from the start.

### Fast Tests Enable Rapid Feedback

Well-architected tests execute quickly:

- **Unit tests** run in < 10ms because all dependencies are mocked
- **Integration tests** run in < 100ms with controlled infrastructure
- **System tests** run in < 1s with optimized workflows

Fast tests enable frequent execution, tightening the feedback loop during development.

### Testable Code is Better Code

Code designed for testability exhibits better software engineering properties:

- **Loose coupling**: Components depend on abstractions, not concrete implementations
- **Single Responsibility**: Classes with one reason to change are easier to test
- **Explicit dependencies**: Constructor injection makes dependencies visible
- **Predictable behavior**: Removing side effects makes code easier to reason about

## Key Principles

### All Components Must Be Designed for Testability from the Start

**CRITICAL**: Testability is not an optional feature. It's a fundamental design requirement that must be considered during initial implementation.

Every service, repository, and application layer component should be designed with testing in mind:

- Constructor parameters for all dependencies
- Interfaces for external systems
- No direct calls to static methods or singletons
- Explicit resource lifecycle management

### External Dependencies Must Be Injectable

Never hard-code dependencies in business logic:

```kotlin
// ❌ BAD - Untestable design
class SessionManager {
    private fun isExpired(session: Session): Boolean {
        val age = Instant.now().toEpochMilli() - session.lastActivity.toEpochMilli()
        return age > maxAge
    }
}

// ✅ GOOD - Testable design with injected time provider
class SessionManager(
    private val timeProvider: TimeProvider
) {
    private fun isExpired(session: Session): Boolean {
        val age = timeProvider.now().toEpochMilli() - session.lastActivity.toEpochMilli()
        return age > maxAge
    }
}
```

With dependency injection, tests can provide mock implementations that behave predictably.

### Time Must Be Controllable in Tests

Time-dependent code is a common source of flaky tests. The solution is to abstract time behind an interface:

```kotlin
interface TimeProvider {
    fun now(): Instant
}

class SystemTimeProvider : TimeProvider {
    override fun now(): Instant = Clock.System.now()
}

class MockTimeProvider : TimeProvider {
    private var currentTime: Instant = Clock.System.now()

    override fun now(): Instant = currentTime

    fun setTime(time: Instant) {
        currentTime = time
    }

    fun advance(duration: Duration) {
        currentTime = currentTime.plus(duration)
    }
}
```

This pattern enables tests to control time precisely without using `delay()` or waiting for real time to pass.

### Resource Lifecycle Must Be Explicit

Every resource (database connections, file handles, network sockets) must have clear ownership and explicit cleanup:

```kotlin
// ✅ GOOD - Explicit lifecycle management
class SessionManagerTest : StringSpec({
    lateinit var database: Database
    lateinit var sessionManager: SessionManager

    beforeEach {
        // Create fresh resources for each test
        database = Database.connect("jdbc:h2:mem:test;DB_CLOSE_DELAY=-1")
        transaction(database) {
            SchemaUtils.create(SessionStates, Projects, Issues)
        }
        sessionManager = createSessionManager(database, testConfig)
    }

    afterEach {
        // Explicit cleanup prevents resource leaks
        sessionManager.shutdown()
        TransactionManager.closeAndUnregister(database)
    }

    "should persist and retrieve sessions" {
        // Test with real database operations
    }
})
```

Without explicit lifecycle management, tests leak resources, causing intermittent failures and consuming system resources.

## Testability Design Patterns

### Dependency Injection with Ktor Native DI

CycleTime uses Ktor's native dependency injection for all services:

```kotlin
// Configuration in Application.kt
fun Application.configureDependencies() {
    dependencies {
        provide<TimeProvider> { SystemTimeProvider() }
        provide<DatabaseProvider> { H2DatabaseProvider() }
        provide<SessionManager> {
            SessionManager(
                instance(), // SessionApplicationService
                instance(), // TimeProvider
                instance(), // DatabaseProvider
                SessionConfig()
            )
        }
    }
}

// Use in tests with property delegation
testApplication {
    application {
        configureDependencies()
    }

    val sessionManager: SessionManager by application.dependencies
    // Test with real DI container
}
```

This pattern enables:

- **Production code**: Uses real implementations
- **Test code**: Overrides with mocks or test implementations
- **Consistent initialization**: Same DI container in production and tests

### Interface-Based Abstraction

All external dependencies use interfaces rather than concrete implementations:

```kotlin
// ✅ REQUIRED - Database operations must be mockable
interface DatabaseProvider {
    fun getConnection(): Database
    suspend fun <T> executeInTransaction(operation: suspend () -> T): T
}

// ✅ Services accept abstractions, not concrete implementations
class SessionApplicationService(
    private val sessionRepository: SessionRepository, // Interface, not ExposedSessionRepository
    private val unitOfWork: UnitOfWork // Interface, not H2UnitOfWork
) {
    // Service implementation using interfaces
}
```

Interfaces enable:

- **Unit testing**: Replace with mocks that verify behavior
- **Integration testing**: Use real implementations
- **Flexibility**: Swap implementations without changing client code

### Database Test Isolation

Each integration test gets its own isolated database instance:

```kotlin
class ProjectRepositoryIntegrationTest : StringSpec({
    lateinit var database: Database
    lateinit var repository: ProjectRepository

    beforeEach {
        // Fresh database per test - guaranteed isolation
        database = Database.connect(
            "jdbc:h2:mem:test_${UUID.randomUUID()};DB_CLOSE_DELAY=-1"
        )
        transaction(database) {
            SchemaUtils.create(Projects, Issues, ProjectIssues)
        }
        repository = H2ProjectRepository(database, RealTimeProvider())
    }

    afterEach {
        // Cleanup prevents connection leaks
        TransactionManager.closeAndUnregister(database)
    }

    "should save and retrieve project" {
        // Test with guaranteed clean state
    }
})
```

Test isolation ensures:

- **No shared state**: Tests don't affect each other
- **Parallel execution**: Tests can run concurrently
- **Deterministic results**: Same test always produces same result

### Service Lifecycle Management

Services that manage resources must have explicit lifecycle:

```kotlin
interface Lifecycle {
    suspend fun start()
    suspend fun shutdown()
}

class SessionManager(
    private val sessionService: SessionApplicationService,
    private val timeProvider: TimeProvider,
    private val config: SessionConfig
) : Lifecycle {
    private var cleanupJob: Job? = null

    override suspend fun start() {
        cleanupJob = startCleanupTask()
    }

    override suspend fun shutdown() {
        cleanupJob?.cancel()
        cleanupJob?.join() // Wait for cleanup to finish
    }
}
```

Explicit lifecycle enables:

- **Graceful shutdown** in production
- **Resource cleanup** in tests
- **Background task management**

## Anti-Patterns to Avoid

### Time-Dependent Tests

```kotlin
// ❌ BAD - Flaky, slow, unreliable
"should expire session after timeout" {
    val session = runBlocking { sessionManager.createSession() }
    delay(1100) // Flaky! Depends on real time, system load
    runBlocking { sessionManager.getSession(session.id) } shouldBe null
}
```

**Why it's bad**: This test depends on real time passing, making it slow and potentially flaky. System load or slow CI machines can cause the test to fail intermittently.

**Solution**: Use `MockTimeProvider` to advance time instantly without delays.

### Mixed Concerns in Tests

```kotlin
// ❌ BAD - Testing everything at once
"should create session and handle expiration and database cleanup" {
    // Testing business logic + database + timing + cleanup all together
    // This violates single responsibility principle for tests
}
```

**Why it's bad**: When this test fails, it's unclear which concern caused the failure. Tests should verify one behavior with one clear failure reason.

**Solution**: Separate tests for each concern - one for creation, one for expiration, one for cleanup.

### Shared Mutable State

```kotlin
// ❌ BAD - Tests affect each other
class SessionManagerTest : StringSpec({
    val sharedManager = SessionManager() // Tests will interfere!

    "test 1" {
        /* modifies sharedManager */
    }

    "test 2" {
        /* affected by test 1, flaky results */
    }
})
```

**Why it's bad**: Test execution order affects results, causing flaky failures that are difficult to debug.

**Solution**: Use `beforeEach` to create fresh instances for every test.

### Resource Leaks

```kotlin
// ❌ BAD - No cleanup, connections leak
afterEach {
    // Missing: sessionManager.shutdown()
    // Missing: TransactionManager.closeAndUnregister(database)
}
```

**Why it's bad**: Leaked resources accumulate over test runs, eventually causing "too many open files" or connection pool exhaustion errors.

**Solution**: Always clean up resources in `afterEach` hooks.

## Common Misconceptions

### "Testing is about tools and frameworks"

**Reality**: Testing is primarily about architecture and design. The best testing frameworks cannot fix code that wasn't designed for testability. Tools like MockK and Kotest are helpful, but they're secondary to good design.

### "Mocking is always better than using real implementations"

**Reality**: Mocking is a tool for unit tests. Integration tests should use real infrastructure to catch actual integration bugs. Over-mocking leads to tests that validate implementation details rather than behavior.

### "Tests slow down development"

**Reality**: Well-designed tests accelerate development by catching bugs early and enabling confident refactoring. Tests that slow development are usually a symptom of poor testability design, not testing itself.

## Related Concepts

- [Testing Strategy](testing-strategy.md) - Overall testing approach and principles
- [Dependency Injection Patterns](../../patterns/architecture/dependency-injection.md) - DI implementation with Ktor
- [Domain-Driven Design](../architecture/domain-driven-design.md) - Architecture principles supporting testability

## Next Steps

- **Implement unit tests**: See [Unit Test Pattern](../../patterns/testing/unit-test-pattern.md) for specific implementation guidance
- **Test with real infrastructure**: Follow [Integration Test Pattern](../../patterns/testing/integration-test-pattern.md)
- **Review quality gates**: Check [Test Quality Checklist](../../reference/checklists/test-quality-checklist.md) before code review
