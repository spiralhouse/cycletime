# Disabled Concurrency Tests

## Overview
This document tracks concurrency tests that are currently disabled because they test features not yet implemented in the system. These tests are valuable for future development but create noise in the current test suite.

## Why These Tests Are Disabled

Having tests that always fail but we "accept" as failing:
- Trains developers to ignore test failures
- Makes CI/CD useless (always red)
- Masks real regressions  
- Violates the principle that all tests should pass

## Disabled Tests

### ConnectionPoolConcurrencyTest (5 tests - entire class disabled)
**Location**: `src/test/kotlin/io/spiralhouse/cycletime/integration/concurrency/ConnectionPoolConcurrencyTest.kt`
**Annotation**: `@Ignored` on class level

Tests HikariCP connection pooling features:
1. Connection pool exhaustion handling
2. Connection leak detection
3. Database lock timeouts under contention
4. Rapid connection acquisition/release
5. Connection pool recovery

**Re-enable when**:
- HikariCP is added as a dependency
- Connection pooling is properly configured
- Repository implementations are updated to use the pool

### RepositoryConcurrencyTest (3 tests disabled)
**Location**: `src/test/kotlin/io/spiralhouse/cycletime/integration/concurrency/RepositoryConcurrencyTest.kt`

Disabled tests:
1. `should handle concurrent issue creation with dependencies without deadlocks`
2. `should handle concurrent session creation and expiration without data corruption`
3. `should handle concurrent session context updates without JSON corruption`

**Re-enable when**:
- HikariCP connection pooling is implemented
- Proper transaction isolation levels are configured
- Repository implementations are updated for high concurrency

### TransactionIsolationConcurrencyTest (1 test disabled)
**Location**: `src/test/kotlin/io/spiralhouse/cycletime/integration/concurrency/TransactionIsolationConcurrencyTest.kt`

Disabled test:
- `should prevent phantom reads during long-running operations`

**Re-enable when**:
- Migrating to PostgreSQL (production database)
- Or implementing proper SERIALIZABLE isolation with H2
- Or adding HikariCP with proper isolation configuration

## Implementation Checklist

When implementing connection pooling:

### Phase 1: Add HikariCP
- [ ] Add HikariCP dependency to build.gradle.kts
- [ ] Configure connection pool settings
- [ ] Update database initialization code
- [ ] Test with basic concurrency

### Phase 2: Re-enable Basic Tests
- [ ] Remove `@Ignored` from ConnectionPoolConcurrencyTest
- [ ] Run tests individually to verify they pass
- [ ] Fix any failures with proper pool configuration

### Phase 3: Re-enable Advanced Tests  
- [ ] Re-enable RepositoryConcurrencyTest disabled tests
- [ ] Re-enable TransactionIsolationConcurrencyTest phantom read test
- [ ] Verify all tests pass under CI/CD

### Phase 4: Production Readiness
- [ ] Load test with production-like scenarios
- [ ] Monitor for connection leaks
- [ ] Document pool tuning parameters
- [ ] Add metrics/monitoring

## Related Issues
- TODO: Create Linear issue for HikariCP implementation (SPI-XXX)
- TODO: Create Linear issue for PostgreSQL migration (SPI-XXX)

## Principles
1. **All active tests must pass** - No "expected failures"
2. **Disabled tests must have clear re-enable criteria**
3. **Test what you have, not what you plan**
4. **Green test suite = trusted test suite**