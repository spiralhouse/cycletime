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

**Required for all services:**

```typescript
// ✅ GOOD - Testable design
interface TimeProvider {
  now(): Date;
}

interface DatabaseProvider {
  getConnection(): Database;
}

class SessionManager {
  constructor(
    private sessionService: SessionApplicationService,
    private timeProvider: TimeProvider,
    private dbProvider: DatabaseProvider,
    config?: SessionConfig
  ) {}
}
```

**Never do:**

```typescript
// ❌ BAD - Untestable design
class SessionManager {
  private isExpired(session: Session): boolean {
    const age = Date.now() - session.lastActivity.getTime(); // Hard-coded time dependency
    return age > this.maxAge;
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

```typescript
// ✅ Fast, isolated, no real time or database
describe('SessionManager Unit Tests', () => {
  let mockTimeProvider: MockTimeProvider;
  let mockSessionService: MockSessionApplicationService;

  beforeEach(() => {
    mockTimeProvider = new MockTimeProvider();
    mockSessionService = new MockSessionApplicationService();
  });

  it('should expire sessions when maxAge exceeded', () => {
    const sessionManager = new SessionManager(
      mockSessionService,
      mockTimeProvider,
      mockDbProvider,
      { maxAge: 1000 }
    );

    mockTimeProvider.setTime('2024-01-01T00:00:00Z');
    const session = sessionManager.createSession();

    mockTimeProvider.advance(1001); // No setTimeout needed

    expect(sessionManager.getSession(session)).toBeNull();
  });
});
```

### Integration Tests - Real Infrastructure

```typescript
// ✅ Real database, controlled environment
describe('SessionManager Integration Tests', () => {
  let db: Database;
  let sessionManager: SessionManager;

  beforeEach(() => {
    db = new Database(':memory:'); // Fresh DB per test
    runMigrations(db);
    sessionManager = createSessionManager(db, testConfig);
  });

  afterEach(() => {
    sessionManager.shutdown();
    db.close();
  });
});
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

```typescript
// ❌ BAD - Flaky, slow, unreliable
it('should expire session after timeout', async () => {
  const session = await sessionManager.createSession();
  await new Promise(resolve => setTimeout(resolve, 1100)); // Flaky!
  expect(await sessionManager.getSession(session)).toBeNull();
});
```

### ❌ Mixed Concerns

```typescript
// ❌ BAD - Testing everything at once
it('should create session and handle expiration and database cleanup', async () => {
  // Testing business logic + database + timing + cleanup all together
});
```

### ❌ Shared Mutable State

```typescript
// ❌ BAD - Tests affect each other
describe('SessionManager', () => {
  const sharedManager = new SessionManager(); // Tests will interfere!

  it('test 1', () => {
    /* modifies sharedManager */
  });
  it('test 2', () => {
    /* affected by test 1 */
  });
});
```

### ❌ Resource Leaks

```typescript
// ❌ BAD - No cleanup, connections leak
afterEach(() => {
  // Missing: sessionManager.shutdown(), db.close()
});
```

## Code Quality Requirements

### Testable Time Handling

```typescript
// ✅ REQUIRED pattern for all time-dependent code
interface TimeProvider {
  now(): Date;
}

class RealTimeProvider implements TimeProvider {
  now(): Date {
    return new Date();
  }
}

class MockTimeProvider implements TimeProvider {
  private currentTime: Date = new Date();

  now(): Date {
    return this.currentTime;
  }

  setTime(time: string | Date) {
    this.currentTime = typeof time === 'string' ? new Date(time) : time;
  }

  advance(milliseconds: number) {
    this.currentTime = new Date(this.currentTime.getTime() + milliseconds);
  }
}
```

### Database Abstraction

```typescript
// ✅ REQUIRED - Database operations must be mockable
interface DatabaseProvider {
  getConnection(): Database;
  executeInTransaction<T>(operation: () => Promise<T>): Promise<T>;
}

// ✅ Services accept abstractions, not concrete implementations
class SessionApplicationService {
  constructor(
    private sessionRepository: SessionRepository, // Interface, not SqliteSessionRepository
    private unitOfWork: UnitOfWork // Interface, not SqliteUnitOfWork
  ) {}
}
```

## Test Organization Standards

### File Structure

```
tests/
├── unit/           # Fast, isolated, no external dependencies
├── integration/    # Real components, controlled environment
├── system/         # End-to-end, production-like scenarios
├── fixtures/       # Test data and utilities
└── setup/          # Test configuration and helpers
```

### Naming Conventions

- Unit tests: `*.unit.test.ts`
- Integration tests: `*.integration.test.ts`
- System tests: `*.system.test.ts`
- Test utilities: `*.test-utils.ts`

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

1. **✅ All time dependencies are injected** (no `Date.now()`, `setTimeout` in
   business logic)
2. **✅ All database operations are testable** (interfaces, not concrete
   classes)
3. **✅ Resource cleanup is explicit** (clear ownership and lifecycle)
4. **✅ Tests are categorized correctly** (unit/integration/system)
5. **✅ No flaky time-dependent tests** (use time mocking instead)
6. **✅ Test isolation verified** (tests pass in any order)

## When Tests Fail

**Never dismiss test failures as "test environment issues"**. Flaky or failing
tests indicate:

1. **Architectural problems** - Code not designed for testability
2. **Production risks** - If it fails in tests, it will fail under load
3. **Technical debt** - Shortcuts that will require expensive refactoring

**Always fix the root cause**, not the symptoms.