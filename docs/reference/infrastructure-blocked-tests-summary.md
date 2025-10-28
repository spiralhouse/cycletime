# Infrastructure-Blocked Tests Summary (SPI-784)

**Date**: 2025-10-26
**Parent Story**: [SPI-731](https://linear.app/spiral-house/issue/SPI-731)
**Next Story**: [SPI-785](https://linear.app/spiral-house/issue/SPI-785) - Create tracking stories for infrastructure blockers

## Executive Summary

This document catalogs the **13 tests (21% of all skipped tests)** that are blocked by infrastructure prerequisites. These tests validate critical functionality but require significant infrastructure changes before they can be re-enabled.

**Breakdown by Infrastructure Requirement**:
- **HikariCP Connection Pooling**: 4 tests (concurrent access patterns)
- **PostgreSQL Migration**: 1 test (SERIALIZABLE isolation)
- **Security Features**: 5 tests (validation, error handling, CORS)
- **Parameter Validation**: 3 tests (JSON Schema validation)

**Total Impact**: These 13 tests represent deferred infrastructure improvements that will enhance system reliability, security, and performance.

---

## 1. HikariCP Connection Pooling (4 Tests)

### Infrastructure Requirement

**Feature**: Implement HikariCP connection pooling for H2 database

**Rationale**: Current H2 configuration uses direct JDBC connections without pooling. High-concurrency tests (50-100+ threads) require connection pooling to:
- Manage connection lifecycle efficiently
- Prevent connection exhaustion
- Enable proper transaction isolation under load
- Support production-level concurrency patterns

### Blocked Tests

**File**: `src/integrationTest/kotlin/io/spiralhouse/cycletime/integration/concurrency/RepositoryConcurrencyTest.kt`

#### Test 1: Concurrent Issue Creation (Line 276)
```kotlin
"should handle concurrent issue creation with dependencies without deadlocks"
```
- **Scenario**: 10 threads creating issues with complex dependency graphs
- **Blocker**: Connection pooling needed to handle concurrent issue creation safely
- **Risk if not tested**: Potential deadlocks in production when multiple users create issues simultaneously

#### Test 2: Concurrent Session Management (Line 388)
```kotlin
"should handle concurrent session creation and expiration without data corruption"
```
- **Scenario**: 50 threads creating/deleting sessions concurrently
- **Blocker**: Connection pooling needed to manage session lifecycle under load
- **Risk if not tested**: Session data corruption or loss under high user concurrency

#### Test 3: Concurrent JSON Updates (Line 460)
```kotlin
"should handle concurrent session context updates without JSON corruption"
```
- **Scenario**: 100 threads updating session context (JSON serialization stress test)
- **Blocker**: Connection pooling needed for high-volume JSON updates
- **Risk if not tested**: JSON corruption in session context under concurrent updates

#### Test 4: Cross-Repository Operations (Line 524)
```kotlin
"should handle concurrent operations across all repositories without deadlocks"
```
- **Scenario**: 30+ mixed operations (create/read/update/delete) across all repositories
- **Blocker**: Connection pooling + DatabaseFactory DI refactoring (SPI-627)
- **Risk if not tested**: Cross-repository deadlocks or transaction conflicts in production

### Implementation Requirements

**Story**: Implement HikariCP connection pooling

**Tasks**:
1. Add HikariCP dependency to `build.gradle.kts`
2. Configure HikariDataSource with optimal settings:
   - Maximum pool size: 20 connections (configurable)
   - Minimum idle connections: 5
   - Connection timeout: 30 seconds
   - Idle timeout: 10 minutes
   - Max lifetime: 30 minutes
3. Replace direct JDBC connections in DatabaseFactory
4. Add connection pool monitoring/metrics
5. Update integration tests to use pooled connections
6. Re-enable 4 blocked tests

**Estimate**: 3-5 days (implementation + testing)

**Acceptance Criteria**:
- [ ] HikariCP configured and integrated
- [ ] All 4 concurrency tests pass consistently
- [ ] Connection pool metrics available
- [ ] No connection leaks under load

---

## 2. PostgreSQL Migration (1 Test)

### Infrastructure Requirement

**Feature**: Migrate from H2 to PostgreSQL for production database

**Rationale**: H2 doesn't fully support SERIALIZABLE isolation level, which is required for preventing phantom reads in concurrent transactions. PostgreSQL provides proper MVCC (Multi-Version Concurrency Control) with SERIALIZABLE support.

### Blocked Test

**File**: `src/integrationTest/kotlin/io/spiralhouse/cycletime/integration/concurrency/TransactionIsolationConcurrencyTest.kt`

#### Test: Phantom Read Prevention (Line 356)
```kotlin
"should prevent phantom reads during long-running operations"
```
- **Scenario**: 30 readers performing long-running queries while 10 writers add/remove data
- **Blocker**: H2 doesn't provide SERIALIZABLE isolation to prevent phantom reads
- **Risk if not tested**: Data consistency issues in long-running transactions

### Implementation Requirements

**Story**: Migrate database from H2 to PostgreSQL (SPI-439)

**Tasks**:
1. Add PostgreSQL JDBC driver dependency
2. Configure PostgreSQL connection in application.conf
3. Update Exposed configuration for PostgreSQL dialect
4. Test all existing repository operations against PostgreSQL
5. Configure SERIALIZABLE isolation level for critical transactions
6. Update CI/CD pipeline with PostgreSQL test database
7. Create migration guide for existing H2 databases
8. Re-enable phantom read test

**Estimate**: 1-2 weeks (migration + validation)

**Acceptance Criteria**:
- [ ] PostgreSQL configured in all environments
- [ ] All existing tests pass with PostgreSQL
- [ ] Phantom read test passes consistently
- [ ] Migration guide documented

**Related Story**: [SPI-439](https://linear.app/spiral-house/issue/SPI-439)

---

## 3. Security Features (5 Tests)

### Infrastructure Requirement

**Feature**: Implement comprehensive security validation and error handling

**Rationale**: Production system requires robust security controls to prevent common vulnerabilities: injection attacks, DoS, CSRF, and ensure graceful error recovery.

### Blocked Tests

**File**: `src/integrationTest/kotlin/io/spiralhouse/cycletime/integration/edge/EdgeCaseTest.kt`

#### Test 1: Session ID Validation (Line 47)
```kotlin
"should handle extremely long session IDs"
```
- **Scenario**: Submit session IDs exceeding reasonable length limits (1000+ chars)
- **Blocker**: Session ID length validation not implemented
- **Security Risk**: Buffer overflow, DoS via memory exhaustion
- **Implementation**: Middleware to enforce max 256 character limit, return 400 Bad Request

#### Test 2: Batch Request Validation (Line 70)
```kotlin
"should handle mixed valid and invalid batch requests"
```
- **Scenario**: JSON-RPC batch with mix of valid/invalid requests
- **Blocker**: Batch request validation not implemented
- **Security Risk**: Partial execution leading to inconsistent state
- **Implementation**: Atomic batch validation - reject entire batch if any request invalid

#### Test 3: CORS Security (Line 95)
```kotlin
"should handle CORS preflight with invalid origin"
```
- **Scenario**: OPTIONS request from untrusted origin (http://evil.com)
- **Blocker**: CORS origin validation not implemented
- **Security Risk**: Cross-site request forgery, unauthorized API access
- **Implementation**: CORS configuration with origin whitelist

#### Test 4: Error Recovery (Line 111)
```kotlin
"should recover from server errors gracefully"
```
- **Scenario**: Tool handler throws exception, verify session remains usable
- **Blocker**: Error recovery mechanisms not implemented
- **Security Risk**: Session corruption, service unavailability after errors
- **Implementation**: Error handling middleware with proper exception isolation

#### Test 5: Multi-Connection Strategy (Line 140)
```kotlin
"should handle SSE connection from multiple tabs/windows"
```
- **Scenario**: Multiple SSE connections for same session (multi-tab browser usage)
- **Blocker**: Multi-connection handling strategy undefined
- **Security Risk**: Session hijacking, connection exhaustion
- **Implementation**: Define strategy (allow multiple, last-wins, or reject duplicates)

### Implementation Requirements

**Story 1**: Session Security Validation

**Tasks**:
1. Implement session ID validation middleware:
   - Length validation (max 256 chars)
   - Character whitelist (alphanumeric + dash/underscore)
   - UUID format validation
   - Path traversal detection
2. Add comprehensive security tests for injection attacks
3. Document security validation rules
4. Re-enable session ID validation test

**Estimate**: 2-3 days

---

**Story 2**: Request Validation and Error Handling

**Tasks**:
1. Implement batch request validation:
   - Atomic validation (all-or-nothing)
   - Proper error responses for partial failures
2. Add error recovery middleware:
   - Exception isolation per request
   - Session state preservation
   - Proper JSON-RPC error formatting
3. Re-enable batch validation and error recovery tests

**Estimate**: 3-4 days

---

**Story 3**: CORS and Connection Management

**Tasks**:
1. Configure CORS with origin whitelist:
   - Define allowed origins
   - Proper preflight handling
   - Security headers (X-Content-Type-Options, etc.)
2. Implement multi-connection strategy:
   - Define behavior (recommend: allow multiple)
   - Add connection tracking
   - Document multi-tab usage patterns
3. Re-enable CORS and multi-connection tests

**Estimate**: 2-3 days

---

**Total Security Features Estimate**: 1-2 weeks (7-10 days)

**Acceptance Criteria**:
- [ ] All 5 security tests pass
- [ ] Security validation documented
- [ ] No known injection vulnerabilities
- [ ] Graceful error recovery verified

---

## 4. Parameter Validation Enhancement (3 Tests)

### Infrastructure Requirement

**Feature**: Implement comprehensive JSON Schema validation for MCP tool parameters

**Rationale**: Current basic validation insufficient for production use. Need full JSON Schema compliance to validate complex parameter structures, nested objects, arrays, and constraints.

### Blocked Tests

**File**: `src/test/kotlin/io/spiralhouse/cycletime/mcp/tools/ToolRegistryTest.kt`

#### Test 1: Required Parameter Validation (Line 616)
```kotlin
"should validate required parameters"
```
- **Scenario**: Invoke tool with missing required parameters
- **Blocker**: Required field validation not implemented
- **Risk**: Tool execution errors from missing parameters

#### Test 2: Type Validation (Line 633)
```kotlin
"should validate parameter types"
```
- **Scenario**: Submit wrong types (string for number, etc.)
- **Blocker**: Type checking against JSON Schema not implemented
- **Risk**: Runtime type errors, tool execution failures

#### Test 3: Constraint Validation (Line 650)
```kotlin
"should validate string constraints"
```
- **Scenario**: Submit values violating constraints (minLength, maxLength, pattern)
- **Blocker**: JSON Schema constraint validation not implemented
- **Risk**: Invalid data processed by tools

### Implementation Requirements

**Story**: Enhanced MCP Tool Parameter Validation (SPI-582)

**Tasks**:
1. Integrate JSON Schema validation library (e.g., `json-schema-validator`)
2. Implement validation in ToolRegistry.invoke():
   - Required field checking
   - Type validation (string, number, boolean, object, array)
   - Constraint validation (min/max, length, pattern, enum)
   - Nested object validation
   - Array item validation
3. Enhance ParameterValidationException:
   - Collect multiple validation errors
   - Provide clear error messages with field paths
   - Include schema violation details
4. Add comprehensive validation tests
5. Re-enable 3 blocked tests

**Estimate**: 5-7 days (implementation + comprehensive testing)

**Acceptance Criteria**:
- [ ] Full JSON Schema validation implemented
- [ ] All 3 parameter validation tests pass
- [ ] Clear validation error messages
- [ ] Performance acceptable (< 10ms overhead per invocation)

**Related Story**: [SPI-582](https://linear.app/spiral-house/issue/SPI-582)

---

## Timeline and Prioritization

### Recommended Implementation Order

**Phase 1: Parameter Validation (Week 1)**
- **Story**: SPI-582 - Enhanced parameter validation
- **Effort**: 5-7 days
- **Impact**: Unblocks 3 tests, improves MCP tool reliability
- **Priority**: High - Required for tool system stability

**Phase 2: Security Features (Weeks 2-3)**
- **Story 1**: Session security validation (2-3 days)
- **Story 2**: Request validation and error handling (3-4 days)
- **Story 3**: CORS and connection management (2-3 days)
- **Total Effort**: 7-10 days
- **Impact**: Unblocks 5 tests, hardens system security
- **Priority**: High - Required for production readiness

**Phase 3: HikariCP Connection Pooling (Week 4)**
- **Story**: HikariCP integration
- **Effort**: 3-5 days
- **Impact**: Unblocks 4 tests, enables production-scale concurrency
- **Priority**: Medium - Required for scalability

**Phase 4: PostgreSQL Migration (Weeks 5-6)**
- **Story**: SPI-439 - PostgreSQL migration
- **Effort**: 1-2 weeks
- **Impact**: Unblocks 1 test, enables production database
- **Priority**: Medium - Required for production deployment

### Total Timeline: 6-7 weeks

---

## Success Metrics

**Before Infrastructure Work**:
- Skipped tests: 61 total
- Infrastructure-blocked: 13 tests (21%)
- Test coverage gap: Significant

**After Infrastructure Work**:
- Infrastructure-blocked: 0 tests
- All 13 critical tests enabled
- Full test coverage of:
  - High-concurrency scenarios
  - Transaction isolation patterns
  - Security validation
  - Parameter validation

**Quality Improvements**:
- Production-ready concurrency handling
- Comprehensive security validation
- Robust parameter validation
- Database ready for production scale

---

## Related Stories

- **SPI-731**: Review Skipped Tests (Parent)
- **SPI-785**: Create Infrastructure Tracking Stories (Next)
- **SPI-582**: Enhanced MCP Tool Parameter Validation
- **SPI-439**: PostgreSQL Migration
- **SPI-627**: DatabaseFactory DI Refactoring

---

## Appendix: Test File Locations

### HikariCP Tests (4)
```
src/integrationTest/kotlin/io/spiralhouse/cycletime/integration/concurrency/RepositoryConcurrencyTest.kt
  - Line 276: Concurrent issue creation
  - Line 388: Concurrent session management
  - Line 460: Concurrent JSON updates
  - Line 524: Cross-repository operations
```

### PostgreSQL Test (1)
```
src/integrationTest/kotlin/io/spiralhouse/cycletime/integration/concurrency/TransactionIsolationConcurrencyTest.kt
  - Line 356: Phantom read prevention
```

### Security Tests (5)
```
src/integrationTest/kotlin/io/spiralhouse/cycletime/integration/edge/EdgeCaseTest.kt
  - Line 47: Session ID validation
  - Line 70: Batch request validation
  - Line 95: CORS security
  - Line 111: Error recovery
  - Line 140: Multi-connection strategy
```

### Parameter Validation Tests (3)
```
src/test/kotlin/io/spiralhouse/cycletime/mcp/tools/ToolRegistryTest.kt
  - Line 616: Required parameter validation
  - Line 633: Type validation
  - Line 650: Constraint validation
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-26
**Prepared by**: Technical Writer (Claude)
**Approved for**: SPI-785 story creation
