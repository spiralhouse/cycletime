# Context Package: QA Agent - Phase 4 (Integration Test Migration)

## Mission Overview

**Your Role**: Migrate integration tests from EventBus to SDK patterns

**Timeline**: Days 14-16 of Phase 4

**Deliverables**:
- Migrate EventBus transport tests to SDK transport tests
- Update MCP tool/resource integration tests for SDK endpoints
- Maintain 820/820 test pass rate
- Verify test coverage ≥80%

**Success Criteria**: All tests passing, coverage maintained, no flaky tests introduced

---

## General Context

### Migration Context

**Test Migration Strategy** (from migration plan lines 1094-1180):
- **Delete**: Tests for removed code (EventBus, JsonRpcProtocolHandler)
- **Update**: Tests for adapted code (session management, tool/resource execution)
- **Add**: Tests for new code (SDK adapters, session context)

**Test Count Target**: 820+ tests passing (maintain or increase)

---

## QA Agent-Specific Context

### Day 14: Transport Test Migration (from migration plan lines 1106-1186)

**Test Categories to Migrate**:

#### 1. Protocol Tests (Delete Custom, Add SDK E2E)

```kotlin
// BEFORE: JsonRpcProtocolHandlerTest (DELETE)
class JsonRpcProtocolHandlerTest : StringSpec({
    "should parse valid JSON-RPC request" {
        // Test custom protocol handler
        // DELETE - SDK handles protocol internally
    }
})

// AFTER: SDK protocol tests (SDK handles internally, test E2E)
class MCPProtocolSDKTest : StringSpec({
    "should handle MCP initialize via SDK" {
        testApplication {
            application {
                configureDependencies()
                configureRouting()
            }

            val response = client.post("/mcp") {
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "method": "initialize",
                        "params": {
                            "protocolVersion": "2024-11-05",
                            "capabilities": {},
                            "clientInfo": {"name": "test", "version": "1.0"}
                        },
                        "id": 1
                    }
                """)
            }

            response.status shouldBe HttpStatusCode.OK
            // SDK handles protocol internally
            // Test full MCP protocol cycle
        }
    }
})
```

#### 2. Session Tests (Update for SDK Pattern)

```kotlin
// BEFORE: EventBus session correlation tests (DELETE)
class EventBusTest : StringSpec({
    "should publish event to correct session" {
        // Test EventBus session correlation
        // DELETE - no longer using EventBus
    }
})

// AFTER: SDK session context tests (ADD)
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
        val sessionId = createTestSession()

        val manager = SDKSessionManager(sessionService)
        val session = manager.validateSession(sessionId)

        session shouldNotBe null
        session.id shouldBe sessionId
    }
})
```

#### 3. Integration Tests (Update Endpoints)

```kotlin
// BEFORE: /mcp/events SSE tests (DELETE)
class MCPSSEHandlerTest : StringSpec({
    "should establish SSE connection" {
        // Test custom SSE handler
        // DELETE - SDK handles SSE automatically
    }
})

// AFTER: SDK transport tests (ADD)
class MCPSdkTransportTest : StringSpec({
    "should establish MCP connection via SDK" {
        testApplication {
            application {
                configureDependencies()
                configureRouting()
            }

            // Test SDK Ktor integration
            val response = client.post("/mcp") {
                setBody(/* MCP initialize */)
            }

            response.status shouldBe HttpStatusCode.OK
        }
    }
})
```

### Day 15: Integration Test Update (from migration plan lines 1187-1240)

**MCP Tool Integration Tests** (Update endpoints):

```kotlin
// BEFORE: Endpoint /mcp-old (EventBus)
class McpToolIntegrationTest : StringSpec({
    "should call session_create via MCP" {
        testApplication {
            val response = client.post("/mcp-old") { // OLD endpoint
                // Test via EventBus transport
            }
        }
    }
})

// AFTER: Endpoint /mcp (SDK)
class McpToolIntegrationTest : StringSpec({
    "should call session_create via MCP" {
        testApplication {
            val response = client.post("/mcp") { // NEW endpoint
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "method": "tools/call",
                        "params": {
                            "name": "session_create",
                            "arguments": {"projectId": "TEST-123"}
                        },
                        "id": 1
                    }
                """)
            }

            response.status shouldBe HttpStatusCode.OK
            // Verify result
        }
    }
})
```

**Session Lifecycle Tests** (SDK pattern):

```kotlin
class SessionLifecycleSDKTest : StringSpec({
    "should create session via SDK initialize" {
        testApplication {
            // Test SDK session creation
            val response = client.post("/mcp") {
                setBody(/* initialize request */)
            }

            // Verify session created in database
        }
    }

    "should retrieve session from database" {
        val sessionId = createTestSession()

        testApplication {
            val response = client.post("/mcp") {
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "method": "tools/call",
                        "params": {
                            "name": "session_get",
                            "arguments": {},
                            "meta": {"sessionId": "$sessionId"}
                        },
                        "id": 1
                    }
                """)
            }

            response.status shouldBe HttpStatusCode.OK
        }
    }

    "should validate session in subsequent requests" {
        val sessionId = createTestSession()

        // Multiple requests with same session
        testApplication {
            repeat(3) {
                val response = client.post("/mcp") {
                    setBody(/* request with sessionId in meta */)
                }
                response.status shouldBe HttpStatusCode.OK
            }
        }
    }
})
```

### Day 16: Coverage Analysis (from migration plan lines 1241-1279)

**Coverage Checks**:

```bash
# Generate coverage report
./gradlew koverHtmlReport

# Verify coverage thresholds
./gradlew koverVerify
```

**Coverage Requirements** (from migration plan lines 1248-1251):
1. Line Coverage: ≥80% (current level)
2. Branch Coverage: ≥75% (current level)
3. Domain Coverage: 100% (unchanged)
4. Application Service Coverage: 100% (unchanged)

**Test Execution Commands** (from migration plan lines 1253-1272):

```bash
# Unit tests
./gradlew unitTest

# Integration tests
./gradlew integrationTest

# System tests
./gradlew systemTest

# All tests
./gradlew testAll
```

**Validation Checklist**:
- [ ] Line coverage ≥80%
- [ ] Branch coverage ≥75%
- [ ] Domain coverage 100%
- [ ] All tests pass (820/820 minimum)
- [ ] Coverage report generated
- [ ] No untested code paths in SDK integration

### Test Migration Checklist

**Tests to DELETE**:
- [ ] `EventBusTest.kt` - Stateful EventBus tests
- [ ] `MessageCorrelatorTest.kt` - Request/response correlation
- [ ] `MCPSSEHandlerTest.kt` - Custom SSE handler
- [ ] `MCPPostHandlerTest.kt` - Custom POST handler
- [ ] `JsonRpcProtocolHandlerTest.kt` - Custom protocol parsing

**Tests to UPDATE**:
- [ ] All MCP integration tests (change endpoint `/mcp-old` → `/mcp`)
- [ ] Session management tests (EventBus pattern → SDK pattern)
- [ ] Tool execution tests (update for SDK transport)
- [ ] Resource reading tests (update for SDK transport)

**Tests to ADD**:
- [ ] `SDKSessionContextTest.kt` - Session extraction from metadata
- [ ] `MCPSdkTransportTest.kt` - SDK transport integration
- [ ] `SDKToolAdapterTest.kt` - Tool adapter tests
- [ ] `SDKResourceAdapterTest.kt` - Resource adapter tests

---

## Success Criteria

### Phase 4 Go/No-Go Gates (from migration plan lines 1281-1291)

**Testing Gates**:
- [ ] All transport tests migrated (EventBus → SDK)
- [ ] All integration tests updated (endpoints point to `/mcp`)
- [ ] Test coverage maintained (≥80%)
- [ ] All tests pass (820/820 minimum)
- [ ] No flaky tests introduced
- [ ] Test isolation verified (tests pass in any order)
- [ ] CI pipeline passes
- [ ] Code review approved

**Quality Requirements**:
- [ ] Test execution time acceptable (unit <30s, integration <3min)
- [ ] No test warnings or deprecations
- [ ] Clear test names (describe behavior tested)
- [ ] Proper test cleanup (no resource leaks)

---

## References

### Source Documents
- **Migration Plan**: `/docs/architecture/mcp-sdk-v0.7.2-migration-plan.md`
  - Lines 1094-1298: Phase 4 complete implementation
  - Lines 1106-1186: Transport test migration patterns
  - Lines 1187-1240: Integration test update patterns
  - Lines 1241-1279: Coverage analysis procedures

### Files to Delete
- `src/test/kotlin/.../EventBusTest.kt`
- `src/test/kotlin/.../MessageCorrelatorTest.kt`
- `src/test/kotlin/.../MCPSSEHandlerTest.kt`
- `src/test/kotlin/.../MCPPostHandlerTest.kt`
- `src/test/kotlin/.../JsonRpcProtocolHandlerTest.kt`

### Files to Create
- `src/test/kotlin/.../unit/mcp/sdk/SDKSessionContextTest.kt`
- `src/test/kotlin/.../integration/mcp/sdk/MCPSdkTransportTest.kt`
- `src/test/kotlin/.../integration/mcp/sdk/SessionLifecycleSDKTest.kt`

---

**Context Package Status**: ✅ READY FOR DELEGATION
**Last Updated**: 2025-10-12
**Owner**: Context Engineer
