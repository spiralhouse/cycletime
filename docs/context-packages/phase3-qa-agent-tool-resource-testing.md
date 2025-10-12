# Context Package: QA Agent - Phase 3 (Tool/Resource Adapter Testing)

## Mission Overview

**Your Role**: Test tool/resource adapters for SDK v0.7.2 integration

**Timeline**: Day 13 of Phase 3 (Days 9-13)

**Deliverables**:
- Tool registration tests (4 providers: session, project, issue, workflow)
- Resource registration tests (3 providers: session, project, issue)
- Tool execution tests via MCP protocol
- Resource read tests via MCP protocol
- Business logic preservation validation

**Success Criteria**: All 15 tools + resources registered correctly, execution tests passing, business logic unchanged (verified by existing tests)

---

## General Context

### Migration Context

**Phase 3 Focus**: Adapt tool/resource providers to SDK registration API while preserving business logic 100%

**Adapter Pattern** (from ADR-001 lines 245-291):
```kotlin
// OLD: ToolProvider interface
interface ToolProvider {
    val namespace: String
    fun getTools(): List<Tool>
}

// NEW: SDK adapter bridges old to new
class SDKToolAdapter(private val provider: ToolProvider) {
    suspend fun registerTools(server: Server) {
        provider.getTools().forEach { tool ->
            server.addTool(/* SDK registration */)
        }
    }
}
```

**Key Principle**: Business logic unchanged, only registration API adapts

### Tool/Resource Inventory

**4 Tool Providers**:
1. Session tools (3 tools): create, get, list
2. Project tools (4 tools): create, get, list, update
3. Issue tools (5 tools): create, get, list, update, close
4. Workflow tools (3 tools): create, execute, status

**3 Resource Providers**:
1. Session resources: session://current
2. Project resources: project://{id}
3. Issue resources: issue://{id}

**Total**: 15 tools + 3 resource types

---

## QA Agent-Specific Context

### Testing Strategy (from migration plan lines 1014-1069)

**Test Categories for Phase 3**:

#### 1. Tool Registration Tests

```kotlin
class SDKToolRegistrationTest : StringSpec({
    "SDK should register all tools from providers" {
        testApplication {
            application {
                configureDependencies()
                configureRouting()
            }

            // Verify tool count
            // Call tools/list MCP method
            val response = client.post("/mcp") {
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "method": "tools/list",
                        "id": 1
                    }
                """)
            }

            response.status shouldBe HttpStatusCode.OK
            val body = response.bodyAsText()

            // Verify 15 tools registered (4 providers)
            body should include("session_create")
            body should include("project_create")
            body should include("issue_create")
            body should include("workflow_create")
            // ... all 15 tools
        }
    }
})
```

#### 2. Tool Execution Tests

From migration plan lines 1030-1036:

```kotlin
class SDKToolExecutionTest : StringSpec({
    "SDK should execute session_create tool" {
        testApplication {
            // Full MCP request/response cycle
            val response = client.post("/mcp") {
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "method": "tools/call",
                        "params": {
                            "name": "session_create",
                            "arguments": {
                                "projectId": "TEST-123"
                            }
                        },
                        "id": 1
                    }
                """)
            }

            response.status shouldBe HttpStatusCode.OK
            val body = response.bodyAsText()

            // Verify result contains session data
            body should include("sessionId")
            body should include("projectId")
        }
    }
})
```

#### 3. Resource Registration Tests

From migration plan lines 1038-1045:

```kotlin
class SDKResourceRegistrationTest : StringSpec({
    "SDK should register all resources from providers" {
        testApplication {
            // Call resources/list MCP method
            val response = client.post("/mcp") {
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "method": "resources/list",
                        "id": 1
                    }
                """)
            }

            response.status shouldBe HttpStatusCode.OK
            val body = response.bodyAsText()

            // Verify 3 resource types registered
            body should include("session://current")
            body should include("project://")
            body should include("issue://")
        }
    }
})
```

#### 4. Resource Read Tests

From migration plan lines 1047-1054:

```kotlin
class SDKResourceReadTest : StringSpec({
    "SDK should read session resource" {
        // Setup: Create session first
        val sessionId = createTestSession()

        testApplication {
            val response = client.post("/mcp") {
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "method": "resources/read",
                        "params": {
                            "uri": "session://current",
                            "meta": {
                                "sessionId": "$sessionId"
                            }
                        },
                        "id": 1
                    }
                """)
            }

            response.status shouldBe HttpStatusCode.OK
            val body = response.bodyAsText()

            // Verify content returned
            body should include(sessionId)
            body should include("application/json") // MIME type
        }
    }
})
```

#### 5. Session Context Tests

From migration plan lines 1056-1063:

```kotlin
class SDKSessionContextToolTest : StringSpec({
    "SDK should extract session from tool request" {
        val sessionId = createTestSession()

        testApplication {
            // Call tool with session in metadata
            val response = client.post("/mcp") {
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "method": "tools/call",
                        "params": {
                            "name": "session_get",
                            "arguments": {},
                            "meta": {
                                "sessionId": "$sessionId"
                            }
                        },
                        "id": 1
                    }
                """)
            }

            response.status shouldBe HttpStatusCode.OK
            // Verify session context used correctly
        }
    }
})
```

### Business Logic Preservation Tests

**Critical**: Existing business logic tests MUST still pass (from migration plan lines 871-880):

```kotlin
// Example: SessionToolProvider business logic test (unchanged)
class DefaultSessionToolProviderTest : StringSpec({
    "should create session with valid project ID" {
        val service = mockk<SessionApplicationService>()
        coEvery { service.createSession(any()) } returns Session(/* ... */)

        val provider = DefaultSessionToolProvider(service)
        val result = provider.executeCreate(mapOf("projectId" to "TEST-123"))

        result shouldBe ToolResult.success(/* ... */)

        // This test should pass unchanged after adapter migration
    }
})
```

**Validation**: Run existing tool provider tests to verify business logic unchanged:

```bash
# Business logic tests (should pass unchanged)
./gradlew test --tests "DefaultSessionToolProviderTest"
./gradlew test --tests "DefaultProjectToolProviderTest"
./gradlew test --tests "DefaultIssueToolProviderTest"
./gradlew test --tests "DefaultWorkflowToolProviderTest"
```

### Test Organization for Phase 3

**New Test Files**:
```
src/test/kotlin/io/spiralhouse/cycletime/
├── unit/mcp/sdk/adapters/
│   ├── SDKToolAdapterTest.kt           # Tool adapter unit tests
│   └── SDKResourceAdapterTest.kt       # Resource adapter unit tests
├── integration/mcp/sdk/
│   ├── SessionToolsSDKIntegrationTest.kt    # Session tools via SDK
│   ├── ProjectToolsSDKIntegrationTest.kt    # Project tools via SDK
│   ├── IssueToolsSDKIntegrationTest.kt      # Issue tools via SDK
│   ├── WorkflowToolsSDKIntegrationTest.kt   # Workflow tools via SDK
│   └── ResourceProvidersSDKTest.kt          # Resource providers via SDK
└── system/mcp/
    └── MCPToolResourceE2ETest.kt        # End-to-end MCP workflows
```

### Testing Each Tool Provider (from migration plan lines 881-906)

**Test Pattern per Provider**:

1. **Unit Test** (business logic - unchanged)
```kotlin
class DefaultSessionToolProviderTest : StringSpec({
    "should create session with valid project ID" {
        // Test business logic directly (no SDK)
    }
})
```

2. **Integration Test** (SDK registration)
```kotlin
class SessionToolsSDKIntegrationTest : StringSpec({
    "should register session tools with SDK" {
        testApplication {
            // Verify tools registered
            // Test tool execution via SDK
        }
    }
})
```

3. **MCP Protocol Test**
```kotlin
class SessionToolsMCPProtocolTest : StringSpec({
    "should call session_create via MCP protocol" {
        // Full MCP request/response cycle
        // JSON-RPC format validation
    }
})
```

### Performance Targets (from migration plan lines 2020-2026)

| Operation | Target | Validation Method |
|-----------|--------|-------------------|
| Tool Call (avg) | <500ms | 100 iterations |
| Tool Call (p95) | <750ms | 100 iterations |
| Resource Read | <100ms | 100 iterations |

**Performance Test Example**:

```kotlin
class SDKToolPerformanceTest : StringSpec({
    "tool calls should complete within performance targets" {
        val times = (1..100).map {
            measureTimeMillis {
                testApplication {
                    client.post("/mcp") {
                        setBody(/* session_create call */)
                    }
                }
            }
        }

        val avg = times.average()
        val p95 = times.sorted()[95]

        avg shouldBeLessThan 500.0
        p95 shouldBeLessThan 750.0
    }
})
```

---

## Success Criteria

### Phase 3 Go/No-Go Gates (from migration plan lines 1070-1082)

**Testing Gates**:
- [ ] All tool providers adapted (4 providers)
- [ ] All resource providers adapted (3 providers)
- [ ] All 15 tools registered with SDK
- [ ] All 3 resource types registered with SDK
- [ ] Tool execution works via MCP protocol
- [ ] Resource reading works via MCP protocol
- [ ] Session context extracted correctly in tools/resources
- [ ] Business logic tests still pass (unchanged)
- [ ] All new adapter tests pass
- [ ] No regressions (820/820 + new tests)

**Quality Gates**:
- [ ] Test coverage maintained (≥80%)
- [ ] All MCP protocol formats correct (JSON-RPC 2.0)
- [ ] Error handling comprehensive
- [ ] Performance targets met

### Validation Commands

```bash
# Run all tool provider tests
./gradlew test --tests "*ToolProvider*"

# Run SDK adapter tests
./gradlew test --tests "*SDK*Adapter*"

# Run integration tests
./gradlew integrationTest

# Full test suite
./gradlew testAll

# Coverage report
./gradlew koverHtmlReport
```

---

## References

### Source Documents
- **Migration Plan**: `/docs/architecture/mcp-sdk-v0.7.2-migration-plan.md`
  - Lines 644-1092: Phase 3 complete implementation
  - Lines 1014-1069: Testing strategy and test cases
  - Lines 871-906: Business logic preservation testing
- **ADR-001**: `/docs/architecture/decisions/ADR-001-adopt-mcp-kotlin-sdk-v0.7.2.md`
  - Lines 219-253: Tool registration pattern
  - Lines 255-291: Resource provider pattern
  - Lines 325-355: What stays unchanged (business logic)

### Key Files to Test
- `src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/adapters/SDKToolAdapter.kt` (new)
- `src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/adapters/SDKResourceAdapter.kt` (new)
- All existing tool/resource providers (business logic unchanged)

---

**Context Package Status**: ✅ READY FOR DELEGATION
**Last Updated**: 2025-10-12
**Owner**: Context Engineer
