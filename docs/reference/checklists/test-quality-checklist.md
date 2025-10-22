---
title: "Test Quality Checklist"
type: reference
domain: [testing, quality]
description: "Pre-code-review checklist for test quality gates and anti-patterns"
dependencies: [../../concepts/testing/testing-strategy.md, ../../concepts/testing/test-architecture.md]
related: []
keywords: [quality-gates, checklist, testing, anti-patterns, code-review]
last_updated: 2025-10-19
---

# Test Quality Checklist

## Quick Reference

Before submitting code for review, verify all items in this checklist. Failed checks indicate required changes before review.

## Testability Design

- [ ] **All time dependencies are injected** - No `Instant.now()` or `delay()` in business logic
- [ ] **All database operations are testable** - Services use repository interfaces, not concrete classes
- [ ] **Resource cleanup is explicit** - Clear ownership with proper lifecycle hooks
- [ ] **Dependencies are constructor-injected** - No hidden dependencies or service locators
- [ ] **External calls are abstracted** - HTTP, file system, and network operations use interfaces

## Test Organization

- [ ] **Tests are categorized correctly** - Unit tests in `src/test`, integration in `src/integrationTest`, system in `src/systemTest`
- [ ] **Test naming follows conventions** - `*Test.kt` for unit, `*IntegrationTest.kt` for integration
- [ ] **Each test has single responsibility** - One test validates one behavior
- [ ] **Tests are isolated** - No shared mutable state between tests
- [ ] **Tests can run in any order** - No dependencies between test cases

## Test Quality

- [ ] **No flaky time-dependent tests** - Use `MockTimeProvider` instead of delays
- [ ] **No hardcoded waits** - No `Thread.sleep()` or arbitrary `delay()` calls
- [ ] **Test isolation verified** - Run tests multiple times in different orders
- [ ] **Coroutines properly tested** - Use `runTest` and `TestScope` for coroutines
- [ ] **Mocks verify behavior** - Not just return values

## Coverage Requirements

- [ ] **Unit test coverage ≥ 80%** - Overall line coverage meets threshold
- [ ] **Domain layer coverage ≥ 95%** - Business logic is thoroughly tested
- [ ] **All public APIs tested** - Every public method has unit or integration tests
- [ ] **Error scenarios tested** - All exception paths have tests
- [ ] **Edge cases covered** - Boundary conditions and null cases tested

## Performance

- [ ] **Unit tests < 10ms each** - Fast execution for tight feedback loops
- [ ] **Integration tests < 100ms each** - Reasonable speed with real infrastructure
- [ ] **System tests < 1s each** - Acceptable for end-to-end workflows
- [ ] **Test suite < 30s total** - Full unit test suite runs quickly

## Anti-Patterns Avoided

- [ ] **No time-dependent tests** - All time is mocked or controlled
- [ ] **No mixed concerns** - Each test validates one layer or component
- [ ] **No shared mutable state** - Tests use fresh instances
- [ ] **No resource leaks** - Cleanup in `afterEach` for all resources
- [ ] **No implementation testing** - Tests verify behavior, not implementation details

## Integration Test Specific

- [ ] **Fresh database per test** - Unique H2 instance for isolation
- [ ] **Schema created in beforeEach** - Tables initialized for each test
- [ ] **Transactions properly managed** - Explicit boundaries and rollback testing
- [ ] **Connections closed in afterEach** - `TransactionManager.closeAndUnregister()` called

## Documentation

- [ ] **Complex test scenarios explained** - Comments describe why, not what
- [ ] **Test data builders used** - Reduce setup boilerplate
- [ ] **Fixtures organized** - Reusable test data in dedicated files

## Complete Specification

### Time Dependencies

**Required Pattern:**
```kotlin
interface TimeProvider {
    fun now(): Instant
}

class SystemTimeProvider : TimeProvider {
    override fun now(): Instant = Clock.System.now()
}
```

**In Tests:**
```kotlin
class MockTimeProvider : TimeProvider {
    private var currentTime: Instant = Clock.System.now()
    override fun now(): Instant = currentTime
    fun setTime(time: Instant) { currentTime = time }
    fun advance(duration: Duration) { currentTime = currentTime.plus(duration) }
}
```

### Database Testability

**Required Pattern:**
```kotlin
interface DatabaseProvider {
    fun getConnection(): Database
    suspend fun <T> executeInTransaction(operation: suspend () -> T): T
}

class SessionApplicationService(
    private val sessionRepository: SessionRepository, // Interface
    private val unitOfWork: UnitOfWork // Interface
)
```

### Resource Lifecycle

**Required Pattern:**
```kotlin
class RepositoryTest : StringSpec({
    lateinit var database: Database
    lateinit var repository: Repository

    beforeEach {
        database = Database.connect("jdbc:h2:mem:test_${UUID.randomUUID()};DB_CLOSE_DELAY=-1")
        transaction(database) {
            SchemaUtils.create(Tables.all)
        }
        repository = createRepository(database)
    }

    afterEach {
        TransactionManager.closeAndUnregister(database)
    }
})
```

### Test Categorization

**Unit Tests** (`src/test/kotlin/`):
- No external dependencies
- Fast execution (< 10ms)
- Mocked dependencies

**Integration Tests** (`src/integrationTest/kotlin/`):
- Real infrastructure
- Moderate speed (< 100ms)
- Controlled environment

**System Tests** (`src/systemTest/kotlin/`):
- End-to-end workflows
- Longer execution (< 1s)
- Production-like conditions

## Verification Commands

```bash
# Run all tests
./gradlew test

# Check coverage
./gradlew koverVerify

# Generate coverage report
./gradlew koverHtmlReport

# Run tests in specific category
./gradlew unitTest
./gradlew integrationTest
./gradlew systemTest

# Run tests multiple times to check for flakiness
for i in {1..10}; do ./gradlew test; done
```

## When Tests Fail

**Never dismiss test failures as "test environment issues"**. Flaky or failing tests indicate:

1. **Architectural problems** - Code not designed for testability
2. **Production risks** - If it fails in tests, it will fail under load
3. **Technical debt** - Shortcuts that require expensive refactoring

**Always fix the root cause**, not the symptoms.

## See Also

- [Testing Strategy](../../concepts/testing/testing-strategy.md) - Overall testing approach
- [Test Architecture](../../concepts/testing/test-architecture.md) - Designing for testability
- [Unit Test Pattern](../../patterns/testing/unit-test-pattern.md) - Unit test implementation
- [Integration Test Pattern](../../patterns/testing/integration-test-pattern.md) - Integration test implementation
