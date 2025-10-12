# Context Package: QA Agent - Phase 2 (Transport Layer Testing)

## Mission Overview

**Your Role**: Create comprehensive test suite for SDK v0.7.2 transport integration

**Timeline**: Day 8 of Phase 2 (Days 4-8)

**Deliverables**:
- Transport layer unit tests (SDK server initialization, session extraction)
- Integration tests (Ktor + SDK endpoint tests)
- Performance benchmarks (initialize <100ms target)
- Session management tests (metadata extraction, validation)

**Success Criteria**: All transport tests passing, performance targets met, no regressions in existing 820 tests

---

## General Context

### Project Foundation

**CycleTime CE**: Project orchestration framework extending Claude Code with MCP server capabilities

**Technology Stack**:
- Kotlin 2.2.20, Ktor 3.3.0
- MCP Kotlin SDK v0.7.2 (official Anthropic + JetBrains SDK)
- H2 database with Exposed ORM
- Ktor native DI for dependency injection

**Current Migration**: Replacing custom EventBus transport with official SDK v0.7.2

### Architectural Decision Summary (from ADR-001)

**Why SDK Adoption?**
- Custom EventBus has session correlation bugs (SPI-699)
- Manual protocol maintenance burden
- Future-proofing concerns (MCP spec evolving)
- SDK v0.7.2: 7 versions of stability improvements, production-tested

**Key Architectural Change**:
```
BEFORE: Stateful EventBus with session correlation
EventBus + MessageCorrelator → Session-based channels

AFTER: SDK per-request transport (stateless)
SDK Server → Per-request transport → Session via request.meta["sessionId"]
```

**What Changes**:
- Transport layer: EventBus → SDK Server
- Protocol: Custom JSON-RPC handler → SDK built-in
- Session: Stateful channels → Request metadata + database

**What Stays Unchanged** (100% preservation):
- Domain layer (entities, value objects, business rules)
- Repository layer (interfaces + implementations)
- Application services (SessionApplicationService, etc.)
- Business logic in tool/resource providers

### SDK v0.7.2 Key Characteristics

**Per-Request Transport**: Stateless, no session channels
**Session Management**: Via request.meta["sessionId"] + database persistence
**Automatic Transport**: SDK handles SSE + POST endpoints automatically
**Built-in Protocol**: JSON-RPC 2.0 handling, validation, error codes

---

## QA Agent-Specific Context

### Testing Philosophy (TDD Approach)

**Test-Driven Development Cycle**:
1. **RED**: Write failing test that defines expected behavior
2. **GREEN**: Implement minimum code to pass test
3. **REFACTOR**: Clean up while keeping tests green

**Test Categories** (from testing-standards.md):
- **Unit Tests**: Fast, isolated, no external dependencies (<10ms each)
- **Integration Tests**: Real components, controlled infrastructure (<100ms each)
- **System Tests**: End-to-end, production-like (<1s each)

**Test Coverage Requirements**:
- Overall: ≥80% line coverage
- Domain layer: 100% (unchanged by migration)
- New SDK code: ≥80% coverage

### SDK v0.7.2 Testing Patterns

#### 1. SDK Transport Test Pattern

From migration plan (lines 1246-1275):

```kotlin
// Integration test for SDK transport
class MCPSdkTransportTest : StringSpec({
    "should establish MCP connection via SDK" {
        testApplication {
            application {
                configureDependencies()
                configureRouting()
            }

            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "method": "initialize",
                        "params": {
                            "protocolVersion": "2024-11-05",
                            "capabilities": {},
                            "clientInfo": {
                                "name": "test-client",
                                "version": "1.0.0"
                            }
                        },
                        "id": 1
                    }
                """.trimIndent())
            }

            response.status shouldBe HttpStatusCode.OK
            val body = response.bodyAsText()
            body should include("serverInfo")
        }
    }
})
```

#### 2. Session Context Test Pattern

From migration plan (lines 2268-2283):

```kotlin
class SDKSessionContextTest : StringSpec({
    "should extract session from request metadata" {
        val request = CallToolRequest(
            meta = JsonObject(mapOf(
                "sessionId" to JsonPrimitive("test-session-123")
            )),
            params = CallToolParams(/* ... */)
        )

        val sessionId = SessionContext.extractSessionId(request)
        sessionId shouldBe "test-session-123"
    }

    "should validate missing session throws exception" {
        val request = CallToolRequest(
            meta = null, // No metadata
            params = CallToolParams(/* ... */)
        )

        shouldThrow<IllegalStateException> {
            SessionContext.requireSessionId(request)
        }
    }
})
```

#### 3. Performance Benchmark Pattern

From migration plan (lines 2032-2053):

```kotlin
class MCPSDKPerformanceTest : StringSpec({
    "establish performance baseline for SDK initialize" {
        val times = (1..100).map {
            measureTimeMillis {
                // MCP initialize request via testApplication
                testApplication {
                    val response = client.post("/mcp") {
                        setBody(/* initialize request */)
                    }
                }
            }
        }

        val avg = times.average()
        val p95 = times.sorted()[95]

        // Target from migration plan
        avg shouldBeLessThan 100.0  // <100ms average
        p95 shouldBeLessThan 150.0  // <150ms p95
    }
})
```

### Phase 2 Specific Test Scenarios

From migration plan Phase 2 Day 8 (lines 577-623):

**Test Suite for Transport Layer**:

1. **Initialize Request Test**
```kotlin
"SDK should handle MCP initialize" {
    // Test protocol handshake
    // Verify serverInfo returned
    // Verify capabilities correct
}
```

2. **Session Bootstrap Test**
```kotlin
"SDK should bootstrap session without prior session" {
    // Test new session creation flow
    // Verify session stored in database
    // Verify session ID returned to client
}
```

3. **Session Resume Test**
```kotlin
"SDK should resume existing session" {
    // Create session first
    // Send request with sessionId in metadata
    // Verify session retrieved from database
}
```

4. **Error Handling Test**
```kotlin
"SDK should handle invalid session ID" {
    // Send request with non-existent sessionId
    // Verify appropriate error response
    // Verify error format matches MCP spec
}
```

5. **Performance Test**
```kotlin
"SDK initialize should complete in <100ms" {
    // Benchmark 100 iterations
    // Calculate average and p95
    // Verify targets met
}
```

### Code Examples for Tests

#### Complete SDK Server Test (from migration plan lines 355-364)

```kotlin
// File: src/test/kotlin/io/spiralhouse/cycletime/mcp/sdk/MCPSdkServerTest.kt
package io.spiralhouse.cycletime.mcp.sdk

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe

class MCPSdkServerTest : StringSpec({
    "should initialize SDK server with correct metadata" {
        val server = MCPSdkServer(version = "1.0.0-test")

        server.server shouldNotBe null
        // Verify server capabilities
        // Verify server info (name, version)
    }

    "should shutdown cleanly" {
        val server = MCPSdkServer(version = "1.0.0-test")

        // Should not throw
        server.shutdown()
    }
})
```

#### SDK Integration Test (from migration plan lines 436-472)

```kotlin
// File: src/test/kotlin/io/spiralhouse/cycletime/mcp/sdk/MCPSdkIntegrationTest.kt
class MCPSdkIntegrationTest : StringSpec({
    "SDK should handle MCP initialize request" {
        testApplication {
            application {
                configureDependencies()
                routing {
                    configureMCPSdk()
                }
            }

            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "method": "initialize",
                        "params": {
                            "protocolVersion": "2024-11-05",
                            "capabilities": {},
                            "clientInfo": {
                                "name": "test-client",
                                "version": "1.0.0"
                            }
                        },
                        "id": 1
                    }
                """.trimIndent())
            }

            response.status shouldBe HttpStatusCode.OK
            val body = response.bodyAsText()
            body should include("serverInfo")
            body should include("cycletime-ce") // Server name
        }
    }
})
```

#### Session Management Tests (from migration plan lines 1137-1156)

```kotlin
class SDKSessionContextTest : StringSpec({
    "should extract session from request metadata" {
        val request = CallToolRequest(
            meta = JsonObject(mapOf("sessionId" to JsonPrimitive("test-123"))),
            params = CallToolParams(/* ... */)
        )

        val sessionId = SessionContext.extractSessionId(request)
        sessionId shouldBe "test-123"
    }

    "should validate session from database" {
        // Setup: Create session in database
        val sessionId = "test-session-456"
        database.insert(Session(id = sessionId, /* ... */))

        val manager = SDKSessionManager(sessionService)
        val session = manager.validateSession(sessionId)

        session shouldNotBe null
        session.id shouldBe sessionId
    }
})
```

### Test Organization Standards (from testing-standards.md)

**File Structure**:
```
src/test/kotlin/io/spiralhouse/cycletime/
├── unit/
│   └── mcp/sdk/
│       ├── MCPSdkServerTest.kt          # SDK server unit tests
│       └── SessionContextTest.kt        # Session extraction tests
├── integration/
│   └── mcp/sdk/
│       ├── MCPSdkIntegrationTest.kt     # Ktor + SDK integration
│       └── SessionLifecycleSDKTest.kt   # Session lifecycle tests
└── system/
    └── mcp/
        └── MCPPerformanceTest.kt         # Performance benchmarks
```

**Naming Conventions**:
- Unit tests: `*Test.kt` in `unit/` package
- Integration tests: `*IntegrationTest.kt` in `integration/` package
- System tests: `*SystemTest.kt` in `system/` package

**MCP Test Categorization** (from testing-standards.md lines 1245-1254):
- **Unit Tests**: MCP protocol tests (SDK-internal, <10ms)
- **Integration Tests**: MCP server integration tests (database deps, <100ms)
- No manual protocol handling needed (SDK provides this)

### Performance Requirements (from migration plan lines 2018-2026)

| Operation | Target | Measurement | Validation |
|-----------|--------|-------------|------------|
| Server Initialize | <100ms avg | 100 iterations | MCP Inspector |
| Tool Call | <500ms avg, <750ms p95 | 100 iterations | Production metrics |
| Resource Read | <100ms avg | 100 iterations | Production metrics |

**Performance Test Pattern** (from migration plan lines 1456-1473):

```kotlin
class MCPPerformanceTest : StringSpec({
    "SDK initialize should complete in <100ms" {
        val times = (1..100).map {
            measureTimeMillis {
                testApplication {
                    val response = client.post("/mcp") {
                        setBody(/* initialize request */)
                    }
                    response.status // Force completion
                }
            }
        }

        val avg = times.average()
        val p95 = times.sorted()[95]

        avg shouldBeLessThan 100.0
        p95 shouldBeLessThan 150.0

        println("Initialize performance: avg=${avg}ms, p95=${p95}ms")
    }
})
```

---

## Success Criteria

### Phase 2 Go/No-Go Gates (from migration plan lines 624-633)

**Transport Layer Testing Gates**:
- [ ] All transport tests passing (initialize, session, errors)
- [ ] Session management tests passing (extract, validate, bootstrap)
- [ ] Performance benchmarks meet targets (<100ms initialize)
- [ ] No regressions in existing tests (820/820 maintained)
- [ ] Error handling comprehensive (invalid requests, sessions)
- [ ] Test coverage ≥80% for new SDK code

**Test Quality Requirements**:
- [ ] No flaky tests (consistent pass rate)
- [ ] Tests isolated (no shared state)
- [ ] Tests fast (unit <10ms, integration <100ms)
- [ ] Clear test names (describe behavior tested)

### Validation Commands

```bash
# Run unit tests only
./gradlew unitTest

# Run integration tests only
./gradlew integrationTest

# Run all tests
./gradlew testAll

# Coverage report
./gradlew koverHtmlReport
./gradlew koverVerify
```

---

## Risks & Mitigation

### Risk: Performance Unknown (from ADR-001 lines 447-455)

**Impact**: Low (SDK used in production by others)
**Likelihood**: Low

**Mitigation**:
- Establish performance baseline early (Day 8)
- Benchmark SDK vs EventBus comparison
- Performance test suite to catch regressions
- Optimize if needed (SDK is lightweight)

**Testing Strategy**:
- 100 iterations for statistical significance
- Measure average, p95, p99
- Test under load (concurrent requests)
- Document baseline for future comparison

### Risk: Test Regressions (from migration plan lines 1282-1291)

**Impact**: High
**Likelihood**: Low (phased approach)

**Mitigation**:
- Maintain 820/820 test pass rate
- Run full test suite after each change
- Isolate SDK tests from existing tests
- Clear test categories (unit/integration/system)

---

## References

### Source Documents
- **ADR-001**: `/docs/architecture/decisions/ADR-001-adopt-mcp-kotlin-sdk-v0.7.2.md`
  - Lines 1-621: Full decision context and rationale
  - Lines 423-490: Risk assessment and mitigation
- **Migration Plan**: `/docs/architecture/mcp-sdk-v0.7.2-migration-plan.md`
  - Lines 266-643: Phase 2 complete implementation (Days 4-8)
  - Lines 577-623: Day 8 testing specifics
  - Lines 2032-2053: Performance baseline establishment
  - Lines 2204-2313: Testing strategy and patterns

### Key Files to Test
- `src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/MCPSdkServer.kt` (new)
- `src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/MCPSdkRouting.kt` (new)
- `src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/SessionContext.kt` (new)
- `src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/SDKSessionManager.kt` (new)

### Project Standards
- **Testing Standards**: `.claude/shared/testing-standards.md`
- **Development Commands**: `.claude/shared/development-commands.md`

---

## Escalation Procedures

**If tests fail**: Document failures clearly, include error messages, steps to reproduce

**If performance targets not met**: Report measurements, identify bottlenecks, propose optimizations

**If blocked**: Escalate to Developer Agent with specific issue details

---

**Context Package Status**: ✅ READY FOR DELEGATION
**Last Updated**: 2025-10-12
**Owner**: Context Engineer
