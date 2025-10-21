# ADR-005: Database Initialization Pattern

## Status
Accepted

## Context
We discovered a critical race condition in database initialization that manifests under CI resource constraints:

1. Tests call `DatabaseFactory.init()` in `beforeSpec`
2. Application `module()` also calls `DatabaseFactory.init()`
3. Even with `@Synchronized`, concurrent initialization fails under resource pressure
4. Results in intermittent "Database not initialized" errors

Root causes identified:
- Non-volatile fields causing memory visibility issues
- Insufficient synchronization in singleton pattern
- Double initialization antipattern in tests

## Decision
Implement a two-phase solution:

### Phase 1: Immediate Fix (Implemented)
Enhanced idempotent initialization with:
- `@Volatile` fields for proper memory visibility
- `ReentrantLock` for better concurrency control
- Double-checked locking with proper memory barriers
- Idempotent `init()` method that safely handles concurrent calls
- New `isInitialized()` check method

### Phase 2: Long-term Solution (Planned for SPI-627)
Migrate from singleton to dependency injection:
- Eliminate `DatabaseFactory` singleton entirely
- Use Ktor's native DI for database provisioning
- Each test gets isolated database instance
- Follow repository pattern with interface abstraction

## Consequences

### Positive
- Eliminates race conditions in database initialization
- Thread-safe under any resource constraints
- Idempotent initialization prevents double-init issues
- Better debugging with ReentrantLock
- Prepares codebase for proper DI migration

### Negative
- Still uses singleton pattern (temporary)
- Requires test refactoring to use new helper
- Additional complexity in initialization logic

### Neutral
- Performance impact negligible (lock only during initialization)
- Migration path clearly defined for future work

## Implementation Details

### Key Changes
1. **DatabaseFactory.kt**: Added volatile fields, ReentrantLock, idempotent init
2. **DatabaseTestHelper.kt**: New test utility for safe initialization
3. **Test Pattern**: Tests use `configureTestApplication()` helper

### Thread Safety Guarantees
- `@Volatile` ensures visibility across threads
- ReentrantLock provides mutual exclusion
- Double-checked locking prevents unnecessary synchronization
- Idempotent design handles concurrent calls safely

## References
- [Java Concurrency in Practice - Double-Checked Locking](https://www.javaspecialists.eu/archive/Issue153-Timeout-on-Waiting-for-Synchronized-Locks.html)
- [Kotlin Coroutines and Thread Safety](https://kotlinlang.org/docs/shared-mutable-state-and-concurrency.html)
- [SPI-627: Future DI Migration](https://linear.app/spiralhouse/issue/SPI-627)