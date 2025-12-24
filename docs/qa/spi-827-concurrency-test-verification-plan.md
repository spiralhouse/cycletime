---
title: "SPI-827 Concurrency Test Verification Plan"
type: guide
domain: [testing, qa, concurrency]
description: "Comprehensive verification plan for re-enabling 4 disabled concurrency tests with HikariCP connection pooling"
dependencies:
  - docs/patterns/testing/integration-test-pattern.md
  - docs/concepts/testing/testing-strategy.md
related:
  - docs/reference/definition-of-done.md
  - docs/patterns/testing/unit-test-pattern.md
keywords: [concurrency, hikaricp, connection-pooling, qa, verification, integration-testing]
last_updated: 2025-10-27
---

# SPI-827 Concurrency Test Verification Plan

## Executive Summary

HikariCP connection pooling has been fully implemented since October 2024. Four concurrency tests in `RepositoryConcurrencyTest.kt` were disabled "aspirationally" before HikariCP existed but were never re-enabled after implementation. This plan provides a comprehensive, safety-first strategy for re-enabling these tests incrementally.

## Current State Analysis

### HikariCP Production Configuration (ALREADY IMPLEMENTED)

**Location**: `src/main/kotlin/io/spiralhouse/cycletime/infrastructure/database/DatabaseConfig.kt`

```kotlin
maximumPoolSize = 10              // Default (configurable)
minimumIdle = 2                   // Default (configurable)
connectionTimeout = 30000         // 30 seconds
idleTimeout = 600000              // 10 minutes
maxLifetime = 1800000             // 30 minutes
leakDetectionThreshold = 60000    // 1 minute
transactionIsolation = "TRANSACTION_SERIALIZABLE"
```

### Test File Location

**File**: `src/integrationTest/kotlin/io/spiralhouse/cycletime/integration/concurrency/RepositoryConcurrencyTest.kt`

**Total Disabled Tests**: 4

## Detailed Test Analysis

### Test 1: Concurrent Issue Creation with Dependencies (Line 276)

**Status**: READY TO ENABLE - No configuration changes needed

**Details**:
- **Thread Count**: 10 concurrent threads
- **Operations**: Creating issues with complex dependency graphs
- **Pool Requirement**: 10 connections (EXACTLY MATCHES current pool limit)
- **Blocker Comment**: "requires proper connection pooling (HikariCP)" - NOW RESOLVED
- **Risk Level**: LOW - within current pool capacity

**Transaction Pattern**:
```kotlin
// Each thread: 5 iterations = 10 threads * 5 = 50 total operations
repeat(5) {
    val issue = Issue.create(...)
    // Add random dependencies (potential deadlock source)
    issue.addDependency(randomExistingIssue)
    issueRepository.save(issue)
}
```

**Potential Failure Modes**:
1. **Deadlock Detection**: Transaction ordering issues when adding dependencies
2. **Dependency Corruption**: Missing or invalid dependency references after concurrent updates
3. **Connection Contention**: All 10 pool connections active simultaneously

**Success Criteria**:
- All 50 issues created successfully
- All dependencies valid and retrievable
- No deadlocks within 30-second timeout
- Zero connection leaks detected

---

### Test 2: Concurrent Session Creation and Expiration (Line 388)

**Status**: REQUIRES CONFIGURATION OVERRIDE - Exceeds current pool limit

**Details**:
- **Thread Count**: 50 creators + 10 cleaners = 60 concurrent threads
- **Operations**: Creating sessions + concurrent deletion
- **Pool Requirement**: 60-70 connections (6x current limit)
- **Risk Level**: HIGH - connection pool exhaustion guaranteed with current config

**Transaction Pattern**:
```kotlin
// 50 creator threads: 10 iterations each = 500 total creates
// 10 cleaner threads: 20 iterations each = 200 random deletes
// Total concurrent operations: 700 (with significant overlap)
```

**Potential Failure Modes**:
1. **Connection Pool Exhaustion**: Threads waiting for connections beyond 30s timeout
2. **Data Corruption**: Session deletion during concurrent creation
3. **Lost Deletes**: Race conditions in session cleanup logic
4. **JSON Serialization Errors**: Session context corruption under high concurrency

**Pool Sizing Calculation**:
```
Required: 60 concurrent threads
Buffer: 20% overhead = 12 connections
Recommended: maxPoolSize = 75
             minPoolSize = 15 (20% of max)
```

**Success Criteria**:
- No connection timeout exceptions
- Remaining session count matches database state
- All remaining sessions valid and retrievable
- Zero data corruption in session context

---

### Test 3: Concurrent Session Context Updates (Line 460)

**Status**: REQUIRES CONFIGURATION OVERRIDE - Extreme concurrency scenario

**Details**:
- **Thread Count**: 100 concurrent updaters
- **Operations**: JSON serialization stress test (1000 total updates)
- **Pool Requirement**: 100-110 connections (10x current limit)
- **Risk Level**: VERY HIGH - extreme concurrency scenario

**Transaction Pattern**:
```kotlin
// 100 threads: 10 iterations each = 1000 total updates
// Each update: read session → modify JSON context → save
// Extreme read-modify-write contention on single session
```

**Potential Failure Modes**:
1. **JSON Corruption**: Concurrent serialization/deserialization errors
2. **Lost Updates**: Read-modify-write race conditions
3. **Memory Pressure**: 100 concurrent transactions holding JSON in memory
4. **Connection Starvation**: Prolonged wait times for connections
5. **Transaction Rollback Cascades**: Serializable isolation conflicts

**Pool Sizing Calculation**:
```
Required: 100 concurrent threads
Buffer: 20% overhead = 20 connections
Recommended: maxPoolSize = 120
             minPoolSize = 25 (20% of max)
```

**Success Criteria**:
- No JSON serialization exceptions
- Final session context contains valid JSON
- Active issues list is not empty
- Context data is not corrupted or missing
- No lost updates (final state reflects some updates from all threads)

---

### Test 4: Cross-Repository Concurrent Operations (Line 524)

**Status**: REQUIRES CONFIGURATION OVERRIDE - Mixed CRUD operations

**Details**:
- **Thread Count**: 30 mixed operation threads
- **Operations**: CRUD across projects, issues, and sessions
- **Pool Requirement**: 30-40 connections (3x current limit)
- **Additional Blocker**: DatabaseFactory DI refactoring - ALREADY COMPLETED
- **Risk Level**: MODERATE-HIGH - complex multi-repository interactions

**Transaction Pattern**:
```kotlin
// 30 threads with 6 operation types (modulo distribution):
// - 5 project creates
// - 5 issue creates
// - 5 session creates
// - 5 read operations (all repositories)
// - 5 update operations (random project)
// - 5 delete operations (random session)
```

**Potential Failure Modes**:
1. **Deadlocks**: Cross-repository transaction ordering conflicts
2. **Referential Integrity Violations**: Deleting projects with active issues
3. **Transaction Timeout**: Complex operations exceeding 60s timeout
4. **Connection Pool Bottleneck**: Uneven distribution of connection usage

**Pool Sizing Calculation**:
```
Required: 30 concurrent threads
Buffer: 33% overhead = 10 connections (higher due to mixed operations)
Recommended: maxPoolSize = 40
             minPoolSize = 10 (25% of max)
```

**Success Criteria**:
- No deadlocks within 60-second timeout
- Success rate > 75% (some failures acceptable due to race conditions)
- Database state is consistent (no orphaned records)
- No referential integrity violations

## Incremental Enablement Strategy

### Phase 1: Enable Test 1 (ZERO Configuration Changes)

**Objective**: Validate basic concurrency with current HikariCP configuration

**Configuration**: Use current production defaults (maxPoolSize=10)

**Test**: Line 276 - "should handle concurrent issue creation with dependencies without deadlocks"

**Steps**:
1. Remove `.config(enabled = false)` from test declaration
2. Run test 10 consecutive times: `./gradlew integrationTest --tests "*RepositoryConcurrencyTest*concurrent issue creation*" --rerun-tasks`
3. Monitor HikariCP metrics during runs (connection usage, wait times)
4. Check for connection leaks via leak detection threshold (60s)

**Validation Criteria**:
- 10/10 test runs pass
- Zero connection leaks detected
- Average connection acquisition time < 100ms
- No deadlocks or timeouts

**If Failures Occur**:
- Analyze failure pattern (deterministic vs. flaky)
- Check dependency graph integrity (are all dependencies valid?)
- Review transaction isolation conflicts
- DO NOT PROCEED to Phase 2 until 10/10 pass

**Estimated Duration**: 15-20 minutes

---

### Phase 2: Enable Test 4 with Test-Specific Configuration

**Objective**: Validate cross-repository operations with moderate concurrency

**Configuration**: Test-specific database instance with increased pool size

**Test**: Line 524 - "should handle concurrent operations across all repositories without deadlocks"

**Implementation Approach**:

```kotlin
// Create test-specific database with increased pool size
lateinit var highConcurrencyDatabase: Database

beforeSpec {
    // Phase 2: Test-specific database for cross-repository test
    highConcurrencyDatabase = Database.connect(
        url = "jdbc:h2:mem:test_high_concurrency;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;LOCK_TIMEOUT=5000;DB_CLOSE_DELAY=-1",
        driver = "org.h2.Driver",
        hikariConfig = HikariConfig().apply {
            maximumPoolSize = 40
            minimumIdle = 10
            connectionTimeout = 30000
            // ... other settings
        }
    )
}
```

**Steps**:
1. Modify `beforeSpec` to create test-specific database with `maxPoolSize=40`
2. Update test to use `highConcurrencyDatabase` instead of shared `database`
3. Remove `.config(enabled = false)`
4. Run test 10 consecutive times with monitoring
5. Validate success rate > 75% and no deadlocks

**Validation Criteria**:
- 10/10 test runs complete without timeout
- Success rate > 75% (per test's own assertion)
- No deadlocks
- Zero connection leaks
- Database state is consistent after each run

**If Failures Occur**:
- If success rate < 75%: Investigate referential integrity violations
- If deadlocks occur: Analyze transaction ordering across repositories
- If connection timeouts: Increase pool size to 50 and retry

**Estimated Duration**: 30-45 minutes

---

### Phase 3: Enable Test 2 with Elevated Configuration

**Objective**: Validate high-concurrency session operations with creator/cleaner pattern

**Configuration**: Test-specific database with `maxPoolSize=75`

**Test**: Line 388 - "should handle concurrent session creation and expiration without data corruption"

**Implementation Approach**:

```kotlin
// Extend Phase 2 setup with higher pool size for Test 2
lateinit var extremeConcurrencyDatabase: Database

beforeSpec {
    // Phase 3: Extreme concurrency database for session tests
    extremeConcurrencyDatabase = Database.connect(
        url = "jdbc:h2:mem:test_extreme_concurrency;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;LOCK_TIMEOUT=5000;DB_CLOSE_DELAY=-1",
        driver = "org.h2.Driver",
        hikariConfig = HikariConfig().apply {
            maximumPoolSize = 75
            minimumIdle = 15
            connectionTimeout = 30000
            // ... other settings
        }
    )
}
```

**Steps**:
1. Create test-specific database with `maxPoolSize=75, minPoolSize=15`
2. Update test to use `extremeConcurrencyDatabase`
3. Remove `.config(enabled = false)`
4. Run test 10 consecutive times
5. Monitor connection pool metrics closely (expected: 50-60 concurrent connections)

**Validation Criteria**:
- 10/10 test runs pass
- No connection pool exhaustion
- Remaining session count matches expected state
- All remaining sessions valid
- Zero JSON corruption in session context

**Monitoring Checkpoints**:
- Peak concurrent connections: 50-60 (should NOT exceed 75)
- Average connection wait time: < 500ms
- Connection acquisition failures: 0

**If Failures Occur**:
- If pool exhaustion: Increase to `maxPoolSize=100` and retry
- If data corruption: Review session deletion logic for race conditions
- If timeouts: Check for slow JSON serialization under contention

**Estimated Duration**: 45-60 minutes

---

### Phase 4: Enable Test 3 with Maximum Configuration

**Objective**: Validate extreme concurrency with JSON serialization stress test

**Configuration**: Test-specific database with `maxPoolSize=120`

**Test**: Line 460 - "should handle concurrent session context updates without JSON corruption"

**Implementation Approach**:

```kotlin
// Maximum concurrency configuration for Test 3
lateinit var maxConcurrencyDatabase: Database

beforeSpec {
    // Phase 4: Maximum concurrency for JSON stress test
    maxConcurrencyDatabase = Database.connect(
        url = "jdbc:h2:mem:test_max_concurrency;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;LOCK_TIMEOUT=5000;DB_CLOSE_DELAY=-1",
        driver = "org.h2.Driver",
        hikariConfig = HikariConfig().apply {
            maximumPoolSize = 120
            minimumIdle = 25
            connectionTimeout = 30000
            // ... other settings
        }
    )
}
```

**Steps**:
1. Create test-specific database with `maxPoolSize=120, minPoolSize=25`
2. Update test to use `maxConcurrencyDatabase`
3. Remove `.config(enabled = false)`
4. Run test 5 consecutive times (reduced due to extreme resource usage)
5. Monitor system resources (CPU, memory, connection count)

**Validation Criteria**:
- 5/5 test runs pass
- No JSON serialization exceptions
- Final session context is valid JSON
- Active issues list is not empty
- Context data is not corrupted

**Monitoring Checkpoints**:
- Peak concurrent connections: 100-110 (should NOT exceed 120)
- Memory usage: Monitor JVM heap for OutOfMemoryError
- Transaction rollback rate: < 10% (SERIALIZABLE isolation may cause conflicts)

**If Failures Occur**:
- If JSON corruption: Review Jackson serialization thread-safety
- If OutOfMemoryError: Reduce thread count to 50 (still validates concurrency)
- If excessive rollbacks: Consider READ_COMMITTED isolation for this test only

**Estimated Duration**: 60-90 minutes

## Pool Sizing Strategy: Test-Specific vs Production

### Recommendation: Test-Specific Configuration Override

**Rationale**:

1. **Production Impact**: Increasing production default to `maxPoolSize=120` would:
   - Waste resources in typical use cases (10 connections sufficient)
   - Increase memory footprint unnecessarily
   - Violate HikariCP sizing best practices (formula: core_count * 2 + 1)

2. **Test Isolation**: Test-specific configurations:
   - Allow extreme concurrency testing without affecting production defaults
   - Enable gradual testing progression (10 → 40 → 75 → 120)
   - Provide clear failure isolation (which pool size causes issues?)

3. **Configuration Flexibility**: Per-test databases enable:
   - Different pool sizes based on concurrency requirements
   - Independent test execution without interference
   - Easier debugging (each test has isolated state)

### Implementation Pattern

**Option A: Separate Database Instances (RECOMMENDED)**

```kotlin
class RepositoryConcurrencyTest : StringSpec({
    lateinit var standardDatabase: Database        // maxPoolSize=10 (Phase 1)
    lateinit var moderateDatabase: Database        // maxPoolSize=40 (Phase 2)
    lateinit var highConcurrencyDatabase: Database // maxPoolSize=75 (Phase 3)
    lateinit var extremeDatabase: Database         // maxPoolSize=120 (Phase 4)

    beforeSpec {
        // Create databases with different pool configurations
        standardDatabase = createDatabase(poolSize = 10)
        moderateDatabase = createDatabase(poolSize = 40)
        highConcurrencyDatabase = createDatabase(poolSize = 75)
        extremeDatabase = createDatabase(poolSize = 120)
    }
})
```

**Option B: Dynamic Configuration Override (Alternative)**

```kotlin
fun createDatabaseWithPoolSize(poolSize: Int): Database {
    val hikariConfig = HikariConfig().apply {
        jdbcUrl = "jdbc:h2:mem:test_${poolSize}_${UUID.randomUUID()}"
        maximumPoolSize = poolSize
        minimumIdle = (poolSize * 0.2).toInt()
        // ... other settings
    }
    return Database.connect(HikariDataSource(hikariConfig))
}
```

### Production Configuration: NO CHANGES NEEDED

**Current Production Defaults (KEEP AS-IS)**:
- `maxPoolSize = 10` (suitable for typical workloads)
- `minPoolSize = 2` (appropriate for development/small deployments)

**Justification**:
- Formula: (4 cores * 2) + 1 SSD = 9 connections ≈ 10
- CycleTime is NOT a high-throughput web service
- MCP protocol is request-response (low concurrency in practice)
- Tests validate thread-safety, not production throughput requirements

## Success Criteria Definition

### Phase 1 Success Criteria

- [ ] Test 1 passes 10 consecutive runs
- [ ] Zero connection leaks detected (via HikariCP leak detection)
- [ ] No deadlocks within 30-second timeout
- [ ] All 50 issues created successfully
- [ ] All dependencies valid and retrievable

### Phase 2 Success Criteria

- [ ] Test 4 completes 10 consecutive runs without timeout
- [ ] Success rate > 75% (per test assertion)
- [ ] No deadlocks within 60-second timeout
- [ ] Database state is consistent after each run
- [ ] Zero connection leaks detected

### Phase 3 Success Criteria

- [ ] Test 2 passes 10 consecutive runs
- [ ] No connection pool exhaustion errors
- [ ] Remaining session count matches database query
- [ ] All remaining sessions are valid
- [ ] Zero JSON corruption detected

### Phase 4 Success Criteria

- [ ] Test 3 passes 5 consecutive runs
- [ ] No JSON serialization exceptions
- [ ] Final session context is valid JSON
- [ ] Active issues list is not empty
- [ ] Context data is not corrupted
- [ ] No OutOfMemoryError during test execution

### Overall Success Criteria (All Phases)

- [ ] All 4 tests enabled and passing
- [ ] Zero connection leaks across all tests
- [ ] Test suite execution time < 5 minutes (integration test target)
- [ ] No intermittent failures in 20 consecutive full test suite runs
- [ ] Documentation updated with final configuration

## Risk Assessment & Mitigation

### Risk 1: Connection Pool Exhaustion

**Likelihood**: HIGH (Tests 2, 3, 4)

**Impact**: Test failure with timeout exceptions

**Mitigation**:
- Use test-specific databases with appropriately sized pools
- Monitor connection acquisition times during test runs
- Implement gradual enablement (don't enable all 4 at once)
- Set alerts for connection wait times > 1 second

**Rollback Plan**:
- If pool exhaustion occurs, increase pool size by 25% and retry
- If memory issues arise, reduce thread count by 50%

---

### Risk 2: Transaction Deadlocks

**Likelihood**: MODERATE (Tests 1, 4)

**Impact**: Test failure with deadlock exceptions or timeout

**Mitigation**:
- SERIALIZABLE isolation already configured (strict consistency)
- Tests include 30-60 second timeouts to detect deadlocks
- Random delays in operations reduce deterministic deadlock patterns

**Rollback Plan**:
- If deadlocks occur, analyze transaction ordering logs
- Consider reducing concurrency or adjusting transaction boundaries
- Last resort: Disable specific test and file bug report

---

### Risk 3: Data Corruption

**Likelihood**: LOW (HikariCP + SERIALIZABLE isolation prevents this)

**Impact**: CRITICAL - Test failure indicates serious production bug

**Mitigation**:
- Tests validate data integrity after concurrent operations
- SERIALIZABLE isolation prevents dirty reads/writes
- Assertions check referential integrity and JSON validity

**Rollback Plan**:
- If data corruption detected, HALT all enablement phases
- Escalate to development team (potential Exposed ORM bug)
- Do NOT mark issue as complete until root cause identified

---

### Risk 4: Test Flakiness

**Likelihood**: MODERATE (Concurrency tests are inherently flaky)

**Impact**: False negatives in CI/CD pipeline

**Mitigation**:
- Require 10 consecutive passes before considering test stable
- Use deterministic thread counts (not random)
- Implement retry logic in CI (max 2 retries for concurrency tests)

**Rollback Plan**:
- If test is flaky (< 90% pass rate), re-disable and file bug
- Document flakiness patterns in issue comments
- Consider reducing concurrency to improve determinism

---

### Risk 5: CI Resource Exhaustion

**Likelihood**: MODERATE (Test 3 with 100 threads)

**Impact**: CI builds timeout or fail sporadically

**Mitigation**:
- Monitor CI resource usage (CPU, memory) during test runs
- Consider running extreme concurrency tests on schedule (nightly), not on every commit
- Use dedicated CI workers with higher resource allocation

**Rollback Plan**:
- If CI fails consistently, reduce thread count by 50%
- Split tests across multiple CI jobs if needed
- Add `@Tag("slow")` annotation to skip in quick CI builds

## Monitoring Checkpoints

### Pre-Test Baseline Metrics

Before each phase, capture baseline metrics:

```bash
# Run baseline test suite to ensure no regressions
./gradlew clean integrationTest --rerun-tasks

# Capture metrics
- Total integration tests: ___
- Passed: ___
- Failed: ___
- Skipped: ___
- Execution time: ___
```

### During Test Execution

Monitor the following during each test run:

**HikariCP Metrics** (enable via logging):
- `hikaricp.pool.TotalConnections` (should not exceed maxPoolSize)
- `hikaricp.pool.ActiveConnections` (peak concurrency indicator)
- `hikaricp.pool.IdleConnections` (pool efficiency)
- `hikaricp.pool.PendingConnections` (queue depth - should be 0)
- `hikaricp.pool.ConnectionTimeoutRate` (should be 0)

**System Metrics**:
- CPU usage (should not peg at 100% for entire test duration)
- Memory usage (watch for heap exhaustion)
- Thread count (should stabilize after test completion)

**Test Assertions**:
- Success/failure status
- Execution time (should be consistent across runs)
- Exception types (if any failures occur)

### Post-Test Validation

After each phase:

```bash
# Verify no connection leaks
# Check HikariCP logs for leak detection warnings

# Run full integration suite to ensure no regressions
./gradlew integrationTest

# Compare metrics to baseline
- Execution time delta: ___ (should be < +10%)
- New failures: ___ (should be 0)
```

## Implementation Checklist

### Phase 1: Enable Test 1 (Lines 276-332)

- [ ] Remove `.config(enabled = false)` from line 277
- [ ] Run test 10 consecutive times
- [ ] Verify 10/10 passes
- [ ] Check for connection leaks in logs
- [ ] Document any failures and root cause
- [ ] Commit changes if successful

### Phase 2: Enable Test 4 (Lines 519-599)

- [ ] Create test-specific database with `maxPoolSize=40`
- [ ] Update test to use new database instance
- [ ] Remove `.config(enabled = false)` from line 519
- [ ] Update TODO comment on line 515-518 to reflect completion
- [ ] Run test 10 consecutive times
- [ ] Verify success rate > 75% and no deadlocks
- [ ] Document pool metrics (peak connections, wait times)
- [ ] Commit changes if successful

### Phase 3: Enable Test 2 (Lines 385-452)

- [ ] Create test-specific database with `maxPoolSize=75`
- [ ] Update test to use new database instance
- [ ] Remove `.config(enabled = false)` from line 386
- [ ] Update comment on line 385 to reflect completion
- [ ] Run test 10 consecutive times
- [ ] Verify 10/10 passes with no pool exhaustion
- [ ] Monitor peak connection usage (should be 50-60)
- [ ] Commit changes if successful

### Phase 4: Enable Test 3 (Lines 454-511)

- [ ] Create test-specific database with `maxPoolSize=120`
- [ ] Update test to use new database instance
- [ ] Remove `.config(enabled = false)` from line 455
- [ ] Update comment on line 454 to reflect completion
- [ ] Run test 5 consecutive times
- [ ] Verify 5/5 passes with no JSON corruption
- [ ] Monitor system resources during execution
- [ ] Commit changes if successful

### Final Validation

- [ ] Run full integration test suite 20 consecutive times
- [ ] Verify zero new failures introduced
- [ ] Update SPI-827 Linear issue with results
- [ ] Update test file header comments (lines 31-62) to reflect completion
- [ ] Remove "DISABLED" comments from test file
- [ ] Update documentation referencing these tests
- [ ] Create follow-up issue if any tests remain unstable

## Estimated Timeline

- **Phase 1**: 15-20 minutes (enable Test 1)
- **Phase 2**: 30-45 minutes (enable Test 4)
- **Phase 3**: 45-60 minutes (enable Test 2)
- **Phase 4**: 60-90 minutes (enable Test 3)
- **Final Validation**: 30-45 minutes
- **Documentation**: 15-30 minutes

**Total Estimated Duration**: 3-5 hours (with contingency for failures/debugging)

## Recommended Execution Schedule

### Option A: Single Session (Recommended for QA)

Execute all phases in one focused QA session (3-5 hours) to maintain context and quickly iterate on failures.

### Option B: Multi-Day Approach (Recommended for Developer)

- **Day 1**: Phase 1 + Phase 2 (enable tests with ≤ 40 pool size)
- **Day 2**: Phase 3 + Phase 4 (enable tests with > 40 pool size)
- **Day 3**: Final validation and documentation

## Appendix: HikariCP Configuration Reference

### Current Production Configuration

**File**: `src/main/kotlin/io/spiralhouse/cycletime/infrastructure/database/DatabaseConfig.kt`

```kotlin
val maxPoolSize: Int = 10          // Keep as-is for production
val minPoolSize: Int = 2           // Keep as-is for production
connectionTimeout = 30000          // 30 seconds
idleTimeout = 600000               // 10 minutes
maxLifetime = 1800000              // 30 minutes
leakDetectionThreshold = 60000     // 1 minute
transactionIsolation = "TRANSACTION_SERIALIZABLE"
```

### Test-Specific Configuration Template

```kotlin
fun createTestDatabase(poolSize: Int, name: String): Database {
    val hikariConfig = HikariConfig().apply {
        jdbcUrl = "jdbc:h2:mem:$name;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;LOCK_TIMEOUT=5000;DB_CLOSE_DELAY=-1"

        // Pool sizing based on test requirements
        maximumPoolSize = poolSize
        minimumIdle = (poolSize * 0.2).toInt()

        // Standard timeout settings
        connectionTimeout = 30000
        idleTimeout = 600000
        maxLifetime = 1800000
        leakDetectionThreshold = 60000
        validationTimeout = 5000

        // Transaction settings
        isAutoCommit = false
        transactionIsolation = "TRANSACTION_SERIALIZABLE"

        // Pool naming for monitoring
        poolName = "CycleTimeTest-$name-Pool"

        validate()
    }

    return Database.connect(HikariDataSource(hikariConfig))
}
```

## Appendix: Quick Reference - Test Requirements

| Test | Line | Threads | Pool Size | Risk | Phase |
|------|------|---------|-----------|------|-------|
| Test 1: Issue Dependencies | 276 | 10 | 10 (current) | LOW | 1 |
| Test 4: Cross-Repository | 524 | 30 | 40 | MODERATE | 2 |
| Test 2: Session Creation/Expiration | 388 | 60 | 75 | HIGH | 3 |
| Test 3: JSON Context Updates | 460 | 100 | 120 | VERY HIGH | 4 |

## Appendix: Failure Decision Tree

```
Test Failure Detected
│
├─ Connection Pool Exhaustion?
│  ├─ Yes → Increase pool size by 25%, retry
│  └─ No → Continue
│
├─ Deadlock Detected?
│  ├─ Yes → Analyze transaction logs, consider reducing concurrency
│  └─ No → Continue
│
├─ Data Corruption?
│  ├─ Yes → HALT enablement, escalate to development team
│  └─ No → Continue
│
├─ Flaky (< 90% pass rate)?
│  ├─ Yes → Re-disable test, file bug report, document patterns
│  └─ No → Continue
│
└─ Other Exception?
   └─ Debug root cause, retry 3 times, escalate if persistent
```

## Conclusion

This verification plan provides a comprehensive, safety-first approach to re-enabling 4 disabled concurrency tests with incremental validation at each phase. The test-specific configuration override strategy allows extreme concurrency testing without affecting production defaults, while the phased approach ensures issues are caught early and isolated.

**Key Takeaways**:
1. Test 1 is ready to enable with ZERO configuration changes
2. Tests 2, 3, 4 require test-specific pool size overrides
3. Production configuration should remain unchanged (maxPoolSize=10)
4. Incremental enablement prevents cascading failures
5. Comprehensive monitoring ensures early failure detection

**Next Steps**:
1. Review and approve this verification plan
2. Execute Phase 1 (enable Test 1)
3. Proceed through phases sequentially based on success criteria
4. Update Linear issue SPI-827 with results after each phase
