# MCP SDK v0.7.2 Migration: TDD Execution Plan

**Created**: 2025-10-12
**Status**: Active execution plan
**Methodology**: Test-Driven Development (RED → GREEN → REFACTOR)

---

## TDD Methodology Overview

### The Three Phases

**RED Phase** (Write Failing Tests):
- QA agent writes comprehensive tests for functionality that doesn't exist yet
- Tests define the specification and expected behavior
- All tests fail (no implementation exists)
- Validates test quality (tests can fail)
- Output: Failing test suite that specifies requirements

**GREEN Phase** (Make Tests Pass):
- Developer agent implements minimal code to make all tests pass
- Focus on functionality, not perfection
- No premature optimization
- All tests must pass before moving to REFACTOR
- Output: Working implementation with 100% test pass rate

**REFACTOR Phase** (Improve Code Quality):
- Code reviewer + developer improve code while tests remain green
- Extract common patterns
- Optimize performance
- Improve readability and maintainability
- Remove duplication
- Tests act as safety net (must stay green)
- Output: Clean, optimized implementation with tests still passing

### Why TDD for SDK Migration

**Benefits for Our Migration**:
1. **Design Quality**: Tests force us to think about adapter interfaces before implementation
2. **Regression Safety**: Tests catch breaking changes immediately
3. **Documentation**: Tests serve as living documentation of SDK patterns
4. **Confidence**: 100% test coverage means we can refactor fearlessly
5. **Incremental Progress**: Each phase has clear success criteria

**Traditional Approach Risk** (what we avoided):
- Implement → Test → Find issues → Refactor → Retest (expensive cycle)
- Tests written to match implementation (not requirements)
- Refactoring skipped due to fear of breaking working code

---

## Overall Migration Status

### Completed Phases

**✅ Phase 1: Foundation & Dependencies** (Days 1-3, 4 points)
- ADR-001: Comprehensive architecture decision record
- Migration Plan: 6-phase implementation roadmap
- Context Packages: 8 curated agent guidance documents
- SDK Dependency: v0.7.2 resolved
- Status: COMPLETE

**✅ Phase 2: Transport Layer** (Days 4-8, 5 points)
- Implementation: MCPSdkServer, SessionContext, SDKSessionManager
- Testing: 47 comprehensive tests (35 unit + 12 system)
- Performance: All benchmarks exceeded
- Gate 1: Basic Connectivity ✅
- Status: COMPLETE

### Remaining Phases (TDD Approach)

**📋 Phase 3: Tool/Resource Migration** (Days 9-13, 5 points)
- RED: QA writes adapter tests (15 tools + 3 resources)
- GREEN: Developer implements adapters
- REFACTOR: Code reviewer optimizes patterns
- Gate 2: Feature Parity

**📋 Phase 4: Integration Test Migration** (Days 14-16, 3 points)
- RED: QA writes SDK-based integration tests
- GREEN: Developer migrates test infrastructure
- REFACTOR: Code reviewer optimizes test patterns
- Gate 3: Test Coverage

**📋 Phase 5: Validation** (Days 17-19, 3 points)
- MCP Inspector validation (100% pass)
- Performance benchmarking
- Claude Code integration testing
- Gate 4: Production Readiness

**📋 Phase 6: Cleanup & Documentation** (Days 20-21, 2 points)
- Remove EventBus legacy code
- Update architecture documentation
- Archive old implementation
- Gate 5: Documentation Complete

---

## Phase 3: Tool/Resource Migration (TDD)

**Story Points**: 5
**Timeline**: Days 9-13 (5 days)
**Linear Issue**: SPI-704

### Phase 3.1: RED - Write Failing Tests (Day 9-10)

**Agent**: QA (ultrathink)
**Context Package**: `docs/context-packages/phase3-qa-agent-tool-resource-testing.md`

**Deliverables**:
1. **Tool Adapter Tests** (15 tools × 3 tests each = 45 tests):
   - Test tool registration with SDK
   - Test tool execution via SDK CallToolRequest
   - Test error handling and validation
   - Example tools: linear_create_issue, linear_update_issue, project_create, etc.

2. **Resource Adapter Tests** (3 resources × 3 tests each = 9 tests):
   - Test resource registration with SDK
   - Test resource reading via SDK ReadResourceRequest
   - Test subscription and listChanged notifications
   - Resources: projects, issues, workflows

3. **Session Management Tests** (6 tests):
   - Test session extraction from request.meta in tool handlers
   - Test error handling when session missing
   - Test session validation

**Test Structure**:
```kotlin
// Example: Tool adapter test (WILL FAIL - no implementation yet)
class LinearCreateIssueAdapterTest : StringSpec({
    "should register linear_create_issue tool with SDK" {
        val server = MCPSdkServer.create()

        // This will fail - no tool registration yet
        server.listTools() shouldContain "linear_create_issue"
    }

    "should create Linear issue via SDK CallToolRequest" {
        val request = CallToolRequest(
            name = "linear_create_issue",
            arguments = JsonObject(mapOf(
                "title" to JsonPrimitive("Test Issue"),
                "team" to JsonPrimitive("Spiral House")
            )),
            meta = mapOf("sessionId" to JsonPrimitive("test-session-123"))
        )

        // This will fail - no adapter implementation yet
        val result = toolAdapter.execute(request)

        result.isSuccess shouldBe true
        result.content shouldContain "Issue created"
    }

    "should handle missing session gracefully" {
        val request = CallToolRequest(
            name = "linear_create_issue",
            arguments = JsonObject(/* ... */),
            meta = null  // No session!
        )

        // This will fail - no error handling yet
        shouldThrow<IllegalStateException> {
            toolAdapter.execute(request)
        }
    }
})
```

**Expected Outcome**:
- 60 tests created (45 tool + 9 resource + 6 session)
- **All tests failing** (RED) ✅ This is correct!
- Build compiles (tests exist, implementation stubs created)
- Clear specification of what needs to be implemented

**Success Criteria for RED Phase**:
- [ ] All 60 tests written and compile successfully
- [ ] All tests fail with expected error (no implementation)
- [ ] Tests are well-structured and follow patterns
- [ ] Mock services created where needed
- [ ] Test covers happy path + error cases

**Time Estimate**: 2 days (Day 9-10)

---

### Phase 3.2: GREEN - Implement Adapters (Day 11-12)

**Agent**: Developer (ultrathink)
**Context Package**: `docs/context-packages/phase3-developer-agent-adapter-implementation.md`

**Deliverables**:
1. **Tool Adapters** (15 adapters):
   - Create SDKToolAdapter interface
   - Implement adapters for each tool (linear, project, workflow, session tools)
   - Register tools with SDK server
   - Extract session from request.meta
   - Delegate to existing tool providers (business logic unchanged)

2. **Resource Adapters** (3 adapters):
   - Create SDKResourceAdapter interface
   - Implement adapters for projects, issues, workflows
   - Register resources with SDK server
   - Support subscribe and listChanged capabilities
   - Delegate to existing resource providers

3. **SDK Routing Integration**:
   - Implement Ktor extension: `fun Routing.mcp(server: Server)`
   - Configure SSE and POST endpoints
   - Handle session bootstrap

**Implementation Pattern**:
```kotlin
// Example: Linear tool adapter
class LinearToolAdapter(
    private val toolProvider: LinearToolProvider,  // Existing business logic
    private val sessionManager: SDKSessionManager
) {
    fun registerWith(server: Server) {
        server.addTool(
            name = "linear_create_issue",
            description = "Create a new Linear issue",
            inputSchema = createIssueSchema()
        ) { request: CallToolRequest ->
            // Extract session from request metadata
            val session = sessionManager.getOrCreateSession(request.meta)

            // Delegate to existing business logic
            val result = toolProvider.createIssue(
                session = session,
                title = request.arguments["title"]?.jsonPrimitive?.content ?: error("Missing title"),
                team = request.arguments["team"]?.jsonPrimitive?.content ?: error("Missing team")
            )

            // Convert to SDK response
            CallToolResult.success(
                content = listOf(TextContent(text = "Issue created: ${result.id}"))
            )
        }
    }
}
```

**Expected Outcome**:
- All 60 tests passing (GREEN) ✅
- Tool/resource business logic 100% unchanged
- Adapters are thin wrappers (delegation only)
- SDK routing integrated with Ktor
- Build succeeds, all tests green

**Success Criteria for GREEN Phase**:
- [ ] All 60 tests passing (0 failures)
- [ ] All 15 tools registered with SDK
- [ ] All 3 resources registered with SDK
- [ ] SDK routing integrated at /mcp endpoint
- [ ] Business logic unchanged (verified by existing tests)
- [ ] Zero regressions (baseline 2,489 tests still passing)

**Time Estimate**: 2 days (Day 11-12)

---

### Phase 3.3: REFACTOR - Optimize Implementation (Day 13)

**Agents**: Code Reviewer + Developer (ultrathink, parallel)
**Context Package**: None (use existing code + test suite as guide)

**Focus Areas**:
1. **Extract Common Patterns**:
   - Identify repeated adapter code
   - Create base adapter classes
   - DRY up session extraction logic

2. **Performance Optimization**:
   - Reduce adapter overhead (<10ms per tool call)
   - Optimize schema generation
   - Cache tool/resource registrations

3. **Code Quality**:
   - Improve naming and structure
   - Add comprehensive KDoc comments
   - Remove dead code or unused imports
   - Ensure consistent error handling

4. **Maintainability**:
   - Simplify complex logic
   - Break down large functions
   - Improve separation of concerns

**Refactoring Examples**:
```kotlin
// Before: Repeated session extraction in every adapter
fun handleTool1(request: CallToolRequest) {
    val session = sessionManager.getOrCreateSession(request.meta)
    // ...
}

fun handleTool2(request: CallToolRequest) {
    val session = sessionManager.getOrCreateSession(request.meta)
    // ...
}

// After: Extract to base class
abstract class BaseToolAdapter(
    protected val sessionManager: SDKSessionManager
) {
    protected fun requireSession(request: CallToolRequest): Session {
        return sessionManager.getOrCreateSession(request.meta)
    }
}

class LinearToolAdapter(sessionManager: SDKSessionManager) : BaseToolAdapter(sessionManager) {
    fun handleCreateIssue(request: CallToolRequest) {
        val session = requireSession(request)  // DRY!
        // ...
    }
}
```

**Expected Outcome**:
- Code is cleaner and more maintainable
- Performance optimized (measured improvements)
- All 60 tests still passing (safety net)
- No new functionality added (refactor only)
- Code review approves quality

**Success Criteria for REFACTOR Phase**:
- [ ] All 60 tests still passing (unchanged behavior)
- [ ] Common patterns extracted (DRY)
- [ ] Performance measured and improved
- [ ] Code review approval (quality standards met)
- [ ] KDoc comments complete
- [ ] Zero technical debt introduced

**Time Estimate**: 1 day (Day 13)

---

### Phase 3 Validation: Gate 2 - Feature Parity

**Criteria**:
- [ ] All 60 adapter tests passing
- [ ] All 15 tools work via SDK transport
- [ ] All 3 resources work via SDK transport
- [ ] Business logic 100% unchanged (verified)
- [ ] Performance <500ms per tool call (measured)
- [ ] Integration tests passing
- [ ] Zero regressions (2,489 baseline + 60 new = 2,549 tests)

**If Gate 2 PASS**: Proceed to Phase 4
**If Gate 2 FAIL**: Debug, fix, retest (don't skip gate)

---

## Phase 4: Integration Test Migration (TDD)

**Story Points**: 3
**Timeline**: Days 14-16 (3 days)
**Linear Issue**: SPI-705

### Phase 4.1: RED - Write SDK Integration Tests (Day 14)

**Agent**: QA (ultrathink)
**Context Package**: `docs/context-packages/phase4-qa-agent-integration-test-migration.md`

**Deliverables**:
1. **End-to-End Integration Tests** (15 tests):
   - Test complete MCP flow: initialize → list tools → call tool → result
   - Test SSE streaming for long-running operations
   - Test error propagation through SDK layers
   - Test concurrent tool calls (session isolation)

2. **Transport Integration Tests** (10 tests):
   - Test SDK SSE endpoint behavior
   - Test SDK POST endpoint behavior
   - Test session management across requests
   - Test protocol negotiation

3. **Performance Integration Tests** (8 tests):
   - Test tool call latency (<500ms)
   - Test resource read latency (<100ms)
   - Test concurrent load (10 sessions, 100 requests)
   - Test memory usage under load

**Expected Outcome**:
- 33 integration tests created
- Tests fail against EventBus implementation (using old patterns)
- Tests specify SDK-based integration requirements

**Time Estimate**: 1 day (Day 14)

---

### Phase 4.2: GREEN - Migrate Test Infrastructure (Day 15)

**Agent**: Developer (ultrathink)
**Context Package**: `docs/context-packages/phase4-developer-agent-test-infrastructure.md`

**Deliverables**:
1. **SDK Test Utilities**:
   - Create `SDKTestClient` for integration tests
   - Create request builders for SDK patterns
   - Create response validators

2. **Migrate Existing Tests**:
   - Update EventBus tests to use SDK patterns
   - Update test fixtures for SDK transport
   - Remove EventBus-specific test code

3. **CI Configuration**:
   - Update test categorization (unit vs integration)
   - Update caching strategy for SDK tests
   - Ensure parallel test execution works

**Expected Outcome**:
- All 33 integration tests passing
- Existing integration tests migrated
- CI pipeline updated

**Time Estimate**: 1 day (Day 15)

---

### Phase 4.3: REFACTOR - Optimize Test Patterns (Day 16)

**Agents**: Code Reviewer + QA (ultrathink, parallel)

**Focus Areas**:
1. Extract common test patterns
2. Improve test readability
3. Optimize test performance
4. Remove duplicated test setup code

**Expected Outcome**:
- Test suite cleaner and faster
- All tests still passing

**Time Estimate**: 1 day (Day 16)

---

### Phase 4 Validation: Gate 3 - Test Coverage

**Criteria**:
- [ ] All integration tests passing
- [ ] Test coverage ≥80% maintained
- [ ] Performance tests meet targets
- [ ] CI pipeline green
- [ ] Zero regressions

**If Gate 3 PASS**: Proceed to Phase 5
**If Gate 3 FAIL**: Debug and fix

---

## Phase 5: Validation (Days 17-19, 3 points)

**Linear Issue**: SPI-706
**No TDD phases** - This is pure validation and testing

**Activities**:
1. **MCP Inspector Validation** (Day 17):
   - Run MCP Inspector against server
   - Validate 100% spec compliance
   - Document any warnings or errors

2. **Performance Benchmarking** (Day 18):
   - Measure tool call latency (target: <100ms p50, <500ms p99)
   - Measure resource read latency (target: <20ms p50, <100ms p99)
   - Measure server startup time (target: <1s)
   - Compare to baseline (custom EventBus performance)

3. **Claude Code Integration** (Day 19):
   - Manual connection test from Claude Code
   - Verify all tools visible and functional
   - Test real workflow scenarios
   - Document any issues

### Phase 5 Validation: Gate 4 - Production Readiness

**Criteria**:
- [ ] MCP Inspector: 100% pass
- [ ] Performance: All targets met
- [ ] Claude Code: Connects and works
- [ ] No critical bugs
- [ ] Security review passed

**If Gate 4 PASS**: Proceed to Phase 6
**If Gate 4 FAIL**: Fix issues, retest

---

## Phase 6: Cleanup & Documentation (Days 20-21, 2 points)

**Linear Issue**: SPI-707
**No TDD phases** - Cleanup and documentation

**Activities**:
1. **Remove Legacy Code** (Day 20):
   - Delete EventBus.kt and related transport code (~750 lines)
   - Remove MessageCorrelator.kt
   - Remove JsonRpcProtocolHandler.kt
   - Remove MCPSSEHandler.kt and MCPPostHandler.kt
   - Update DI to remove legacy dependencies

2. **Update Documentation** (Day 21):
   - Update README with SDK architecture
   - Update CLAUDE.md with new patterns
   - Archive old architecture docs
   - Document migration lessons learned
   - Update developer onboarding docs

3. **Create Archive**:
   - Create git branch: `archive/spi-700-legacy-transport`
   - Create git tag: `archive/custom-transport-v1.0`
   - Document rollback procedure (if ever needed)

### Phase 6 Validation: Gate 5 - Documentation Complete

**Criteria**:
- [ ] Legacy code removed (750 lines deleted)
- [ ] Documentation updated
- [ ] Archive created
- [ ] All tests still passing (final verification)
- [ ] Build clean and optimized

**If Gate 5 PASS**: Migration COMPLETE ✅

---

## TDD Execution Guidelines

### Agent Delegation Order

**Always follow this sequence for each phase**:

1. **RED Phase**: Delegate to QA agent FIRST
   ```bash
   @agent-qa "ultrathink" "Phase 3 RED: Write failing adapter tests.

   Context: docs/context-packages/phase3-qa-agent-tool-resource-testing.md

   Write comprehensive tests for tool/resource adapters. Tests SHOULD FAIL
   (no implementation exists yet). This defines the specification."
   ```

2. **GREEN Phase**: Delegate to Developer agent SECOND (after tests fail)
   ```bash
   @agent-developer "ultrathink" "Phase 3 GREEN: Implement adapters to make tests pass.

   Context: docs/context-packages/phase3-developer-agent-adapter-implementation.md

   Implement tool/resource adapters to make all 60 tests pass. Focus on
   functionality, not perfection. All tests must go green."
   ```

3. **REFACTOR Phase**: Delegate to Code Reviewer + Developer THIRD (after tests pass)
   ```bash
   @agent-code-reviewer "ultrathink" "Phase 3 REFACTOR: Review and optimize adapter implementation.

   Focus on: common patterns, performance, code quality, maintainability.
   All tests must remain green during refactoring."

   # In parallel or sequentially:
   @agent-developer "ultrathink" "Apply refactoring suggestions from code review.
   Run tests after each refactoring to ensure green status maintained."
   ```

### Validation Between Phases

**After RED Phase**:
```bash
./gradlew test  # Expect failures
# Verify: All new tests fail as expected
```

**After GREEN Phase**:
```bash
./gradlew test  # Expect success
# Verify: All tests pass (new + baseline)
```

**After REFACTOR Phase**:
```bash
./gradlew test  # Expect success
# Verify: All tests still pass (unchanged behavior)
./gradlew koverHtmlReport  # Check coverage maintained
```

### Gate Validation Commands

**Gate 2 (Feature Parity)**:
```bash
./gradlew testAll
./gradlew koverVerify
./gradlew build
# Manual: Test each tool via curl or MCP client
```

**Gate 3 (Test Coverage)**:
```bash
./gradlew integrationTest
./gradlew systemTest
./gradlew koverHtmlReport
# Verify: Coverage ≥80%
```

**Gate 4 (Production Readiness)**:
```bash
# MCP Inspector validation
mcp-inspector http://localhost:8080/mcp

# Performance benchmarking
./gradlew systemTest --tests "*PerformanceTest"

# Manual Claude Code connection
```

**Gate 5 (Documentation Complete)**:
```bash
./gradlew build
# Verify: Clean build, no legacy code
# Verify: Documentation updated
# Verify: Archive created
```

---

## Success Metrics

### Phase 3 Metrics

**RED Phase**:
- Tests created: 60 (45 tool + 9 resource + 6 session)
- Tests failing: 60 (100% - expected)
- Specification complete: Yes

**GREEN Phase**:
- Tests passing: 60 (100% - required)
- Baseline maintained: 2,489 tests passing
- Business logic changed: 0 lines

**REFACTOR Phase**:
- Tests passing: 60 (must stay 100%)
- Performance improvement: Measured (e.g., 20% faster)
- Code quality: Approved by reviewer

### Overall Migration Metrics

**Timeline**:
- Phase 1-2: 8 days (COMPLETE)
- Phase 3: 5 days (TDD)
- Phase 4: 3 days (TDD)
- Phase 5: 3 days (Validation)
- Phase 6: 2 days (Cleanup)
- **Total**: 21 days (3 weeks)

**Test Coverage**:
- Starting: 2,442 tests
- Phase 2 added: 47 tests (2,489 total)
- Phase 3 adds: 60 tests (2,549 total)
- Phase 4 adds: 33 tests (2,582 total)
- **Final**: ~2,600 tests (6% growth)

**Code Changes**:
- Phase 2 added: 1,575 lines (implementation + tests)
- Phase 3 adds: ~2,000 lines (adapters + tests)
- Phase 4 adds: ~500 lines (test infrastructure)
- Phase 6 removes: ~750 lines (legacy code)
- **Net**: +3,325 lines (56% growth in test code)

---

## Rollback Procedures

### If Phase Fails

**Phase 3 Fails**:
```bash
git checkout feat/spi-700-adopt-official-mcp-kotlin-sdk-for-remote-server-transport
git reset --hard 97bb27d  # Phase 2 commit
# Investigate, fix, retry Phase 3
```

**Phase 4 Fails**:
```bash
git reset --hard <phase-3-commit>
# Investigate test infrastructure issues
```

**Any Phase Critical Failure**:
```bash
# Revert to Phase 2 (known working state)
git reset --hard 97bb27d
# SDK transport exists but not used yet
# EventBus still active (parallel mode)
# Reassess approach
```

---

## Next Steps

**Immediate** (Phase 3 RED):
1. Review QA context package: `docs/context-packages/phase3-qa-agent-tool-resource-testing.md`
2. Invoke QA agent in ultrathink mode
3. QA writes 60 failing tests (specification complete)
4. Verify tests fail as expected (RED phase success)

**After RED Complete** (Phase 3 GREEN):
1. Review Developer context package: `docs/context-packages/phase3-developer-agent-adapter-implementation.md`
2. Invoke Developer agent in ultrathink mode
3. Developer implements adapters to make tests pass
4. Verify all tests green (GREEN phase success)

**After GREEN Complete** (Phase 3 REFACTOR):
1. Invoke Code Reviewer agent for optimization suggestions
2. Apply refactorings while keeping tests green
3. Measure performance improvements
4. Validate Gate 2 (Feature Parity)

---

**TDD Execution Plan Status**: ✅ **READY**
**Current Phase**: Phase 3 RED (next to execute)
**Methodology**: Test-Driven Development (RED → GREEN → REFACTOR)
**Confidence**: 90% (TDD reduces implementation risk significantly)

---

**Author**: Claude Code (Software Architect)
**Date**: 2025-10-12
**Purpose**: TDD execution plan for MCP SDK v0.7.2 migration (Phases 3-6)
