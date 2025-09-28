# Testing Standards & Architecture

## Testing Strategy

Follow a three-tier testing approach to ensure comprehensive coverage while
maintaining test reliability and maintainability:

1. **Unit Tests** - Fast, isolated, no external dependencies
2. **Integration Tests** - Real components with controlled infrastructure
3. **System Tests** - End-to-end workflows with production-like conditions

## Testability Design Requirements

**CRITICAL**: All components must be designed for testability from the start.
Retrofitting testability is expensive and error-prone.

### Dependency Injection Patterns

**Required for all services using Ktor native DI:**

```kotlin
// ✅ GOOD - Testable design with Ktor DI
interface TimeProvider {
    fun now(): Instant
}

interface DatabaseProvider {
    fun getConnection(): Database
}

// Register in Application.kt
fun Application.configureDependencies() {
    dependencies {
        provide<TimeProvider> { SystemTimeProvider() }
        provide<DatabaseProvider> { SqliteDatabaseProvider() }
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

**Never do:**

```kotlin
// ❌ BAD - Untestable design
class SessionManager {
    private fun isExpired(session: Session): Boolean {
        val age = Instant.now().toEpochMilli() - session.lastActivity.toEpochMilli() // Hard-coded time dependency
        return age > maxAge
    }
}
```

### Resource Lifecycle Management

**Database connections:**

- Each test gets isolated database state
- Clear ownership: who creates, who cleans up
- No shared mutable state between tests
- Prepared statements must handle connection lifecycle

**Service lifecycle:**

- Clear initialization and shutdown patterns
- No background processes that survive test completion
- Proper async operation cleanup

## Test Architecture Patterns

### Unit Tests - Business Logic Only

```kotlin
// ✅ Fast, isolated, no real time or database
class SessionManagerTest : StringSpec({
    lateinit var mockTimeProvider: MockTimeProvider
    lateinit var mockSessionService: MockSessionApplicationService
    lateinit var mockDbProvider: MockDatabaseProvider

    beforeEach {
        mockTimeProvider = MockTimeProvider()
        mockSessionService = MockSessionApplicationService()
        mockDbProvider = MockDatabaseProvider()
    }

    "should expire sessions when maxAge exceeded" {
        val sessionManager = SessionManager(
            mockSessionService,
            mockTimeProvider,
            mockDbProvider,
            SessionConfig(maxAge = Duration.ofSeconds(1))
        )

        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))
        val session = sessionManager.createSession()

        mockTimeProvider.advance(Duration.ofMillis(1001)) // No delay needed

        sessionManager.getSession(session.id) shouldBe null
    }
})
```

### Integration Tests - Real Infrastructure

```kotlin
// ✅ Real database, controlled environment
class SessionManagerIntegrationTest : StringSpec({
    lateinit var database: Database
    lateinit var sessionManager: SessionManager

    beforeEach {
        database = Database.connect("jdbc:h2:mem:test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1") // Fresh DB per test
        transaction(database) {
            SchemaUtils.create(SessionStates, Projects, Issues)
        }
        sessionManager = createSessionManager(database, testConfig)
    }

    afterEach {
        sessionManager.shutdown()
        TransactionManager.closeAndUnregister(database)
    }

    "should persist and retrieve sessions" {
        // Test with real database operations
    }
})
```

### System Tests - Production Scenarios

```typescript
// ✅ Test failure scenarios and resilience
describe('SessionManager System Tests', () => {
  it('should handle database reconnection gracefully', async () => {
    // Test production-like failure scenarios
  });

  it('should maintain performance under load', async () => {
    // Performance and stress testing
  });
});
```

## Anti-Patterns - Never Do These

### ❌ Time-Dependent Tests

```kotlin
// ❌ BAD - Flaky, slow, unreliable
"should expire session after timeout" {
    val session = runBlocking { sessionManager.createSession() }
    delay(1100) // Flaky! Depends on real time
    runBlocking { sessionManager.getSession(session.id) } shouldBe null
}
```

### ❌ Mixed Concerns

```kotlin
// ❌ BAD - Testing everything at once
"should create session and handle expiration and database cleanup" {
    // Testing business logic + database + timing + cleanup all together
    // This violates single responsibility principle for tests
}
```

### ❌ Shared Mutable State

```kotlin
// ❌ BAD - Tests affect each other
class SessionManagerTest : StringSpec({
    val sharedManager = SessionManager() // Tests will interfere!

    "test 1" {
        /* modifies sharedManager */
    }
    
    "test 2" {
        /* affected by test 1 */
    }
})
```

### ❌ Resource Leaks

```kotlin
// ❌ BAD - No cleanup, connections leak
afterEach {
    // Missing: sessionManager.shutdown(), TransactionManager.closeAndUnregister(database)
}
```

## Code Quality Requirements

### Testable Time Handling

```kotlin
// ✅ REQUIRED pattern for all time-dependent code
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

    fun setTime(time: String) {
        currentTime = Instant.parse(time)
    }

    fun advance(duration: Duration) {
        currentTime = currentTime.plus(duration)
    }
}
```

### Database Abstraction

```kotlin
// ✅ REQUIRED - Database operations must be mockable
interface DatabaseProvider {
    fun getConnection(): Database
    suspend fun <T> executeInTransaction(operation: suspend () -> T): T
}

// ✅ Services accept abstractions, not concrete implementations
class SessionApplicationService(
    private val sessionRepository: SessionRepository, // Interface, not ExposedSessionRepository
    private val unitOfWork: UnitOfWork // Interface, not SqliteUnitOfWork
) {
    // Service implementation using interfaces
}
```

## Test Organization Standards

### File Structure

```
src/test/kotlin/io/spiralhouse/jcvd/
├── unit/           # Fast, isolated, no external dependencies
├── integration/    # Real components, controlled environment
├── system/         # End-to-end, production-like scenarios
├── fixtures/       # Test data and utilities
└── utils/          # Test configuration and helpers
```

### Naming Conventions

- Unit tests: `*Test.kt` in `unit` package
- Integration tests: `*IntegrationTest.kt` in `integration` package
- System tests: `*SystemTest.kt` in `system` package
- Test utilities: `*TestUtils.kt` in `utils` package

### Performance Requirements

- Unit tests: < 10ms each, < 1s total suite
- Integration tests: < 100ms each, < 10s total suite
- System tests: < 1s each, < 30s total suite

### Coverage Requirements

- **Unit tests**: 100% of business logic
- **Integration tests**: All component interactions
- **System tests**: Critical user workflows
- **Error scenarios**: All error paths and edge cases

## Quality Gates

Before any code review:

1. **✅ All time dependencies are injected** (no `Instant.now()`, `delay()` in
   business logic)
2. **✅ All database operations are testable** (interfaces, not concrete
   classes)
3. **✅ Resource cleanup is explicit** (clear ownership and lifecycle)
4. **✅ Tests are categorized correctly** (unit/integration/system)
5. **✅ No flaky time-dependent tests** (use time mocking instead)
6. **✅ Test isolation verified** (tests pass in any order)
7. **✅ Coroutines properly tested** (use `runTest` and `TestScope`)

## When Tests Fail

**Never dismiss test failures as "test environment issues"**. Flaky or failing
tests indicate:

1. **Architectural problems** - Code not designed for testability
2. **Production risks** - If it fails in tests, it will fail under load
3. **Technical debt** - Shortcuts that will require expensive refactoring

**Always fix the root cause**, not the symptoms.