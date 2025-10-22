# SDK Client Testing Guide

## Overview

This guide documents SDK Client testing patterns for MCP integration tests in CycleTime CE. It provides practical guidance for writing, migrating, and maintaining tests that use the official MCP SDK Client.

### What is SDK Client Testing?

SDK Client testing validates MCP server behavior through the official [MCP Kotlin SDK](https://github.com/modelcontextprotocol/kotlin-sdk) Client API, rather than raw HTTP requests. This approach:

- **Tests production integration patterns**: Validates how actual MCP clients will interact with your server
- **Provides type-safe APIs**: SDK Client uses Kotlin types instead of manual JSON parsing
- **Abstracts transport details**: SDK handles SSE connections, JSON-RPC construction, and session management
- **Prevents protocol errors**: SDK constructs valid JSON-RPC by design (compile-time safety)

### When to Use SDK Client Testing

**Use SDK Client testing for:**
- MCP tool integration tests (tools/list, tools/call)
- MCP resource integration tests (resources/list, resources/read)
- Application-level integration tests (server startup, DI registration)
- Session lifecycle tests (create session, get session)
- End-to-end workflow tests

**Use HTTP testing for:**
- Protocol-level error handling (malformed JSON-RPC)
- Transport-level performance testing (raw SSE connection timing)
- Server-side request validation (when SDK prevents invalid requests by design)

### Key Benefits

**Production Parity**:
```kotlin
// SDK Client testing validates how real clients interact with your server
val client = Client(Implementation("cycletime-client", "1.0.0"))
client.connect(transport)
val result = client.callTool("project_create_project", arguments)
```

**Type Safety**:
```kotlin
// SDK provides typed responses (no manual JSON parsing)
val result: CallToolResult = client.callTool("tool_name", args)
result.isError shouldBe false
result.content.shouldNotBeEmpty()
```

**Simplified Testing**:
```kotlin
// SDK handles JSON-RPC, sessions, and transport automatically
// No manual session ID extraction, no JSON-RPC construction, no SSE event parsing
```

### Trade-offs

**Advantages**:
- Tests actual SDK Client behavior (production integration pattern)
- Type-safe API (compile-time errors instead of runtime failures)
- SDK manages complexity (JSON-RPC, sessions, transport)
- Fewer test dependencies (no manual JSON builders)

**Limitations**:
- Cannot test protocol-level errors (SDK prevents malformed JSON-RPC)
- Cannot test transport-level timing (SDK abstracts SSE connections)
- Requires real HTTP server (Ktor testApplication uses in-memory engine)
- SDK overhead affects performance baselines (~50ms vs raw HTTP)

**Migration Decision Tree**:
```
Does test validate application behavior? → YES → Migrate to SDK Client
Does test check tool/resource integration? → YES → Migrate to SDK Client
Does SDK prevent the error by design? → YES → Skip test (document why)
Does test measure raw transport timing? → YES → Skip test (SDK abstracts transport)
```

## Quick Start

### Minimal Working Example

This example shows the absolute minimum needed to write an SDK Client test:

```kotlin
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldNotBeEmpty
import io.kotest.matchers.shouldBe
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.sse.*
import io.modelcontextprotocol.kotlin.sdk.Implementation
import io.modelcontextprotocol.kotlin.sdk.client.Client
import io.modelcontextprotocol.kotlin.sdk.client.SSEClientTransport
import kotlinx.coroutines.withTimeout

class MySDKTest : StringSpec({
    "should list all MCP tools using SDK Client" {
        // 1. Create HTTP client with SSE support
        val httpClient = HttpClient(CIO) {
            install(SSE)
        }

        try {
            // 2. Create SDK Client with implementation info
            val client = Client(
                Implementation("cycletime-test-client", "1.0.0")
            )

            // 3. Create SSE transport pointing to server
            val transport = SSEClientTransport(
                httpClient,
                "http://localhost:8080"
            )

            // 4. Connect (SDK handles initialize automatically)
            withTimeout(10_000) {
                client.connect(transport)
            }

            // 5. Use SDK Client API
            val toolsResult = client.listTools()

            // 6. Verify results with typed API
            toolsResult.tools.shouldNotBeEmpty()
            toolsResult.tools.size shouldBe 17

        } finally {
            // 7. CRITICAL: Always close httpClient
            httpClient.close()
        }
    }
})
```

### Resource Cleanup (CRITICAL)

**Always use try-finally pattern**:

```kotlin
val httpClient = HttpClient(CIO) { install(SSE) }
try {
    // All test operations
} finally {
    httpClient.close()  // CRITICAL: Prevents resource leaks
}
```

**Why this matters**: HttpClient manages network sockets and coroutines. Without cleanup, tests leak resources and may cause:
- Port exhaustion (too many open connections)
- Test interference (shared connection pools)
- CI failures (resource limits exceeded)

### Running SDK Client Tests

SDK Client tests require a real HTTP server. Use these approaches:

**Option 1: Use testSDKApplication helper** (Recommended):
```kotlin
import io.spiralhouse.cycletime.test.utils.testSDKApplication

testSDKApplication {
    // Server starts automatically with production DI
    val httpClient = HttpClient(CIO) { install(SSE) }
    try {
        val client = Client(Implementation("test", "1.0"))
        val transport = SSEClientTransport(httpClient, "http://localhost:8080")

        withTimeout(10_000) { client.connect(transport) }

        // Test operations

    } finally {
        httpClient.close()
    }
}
```

**Option 2: External server** (For performance tests):
```bash
# Terminal 1: Start server
./gradlew run

# Terminal 2: Run tests
./gradlew integrationTest --tests "*MySDKTest"
```

**Common mistake**: Using `testApplication` instead of `testSDKApplication`:
```kotlin
// ❌ WRONG: testApplication uses in-memory engine (SDK Client can't connect)
testApplication {
    val client = Client(...)  // Connection refused!
}

// ✅ CORRECT: testSDKApplication starts real HTTP server
testSDKApplication {
    val client = Client(...)  // Connection successful
}
```

## Core Testing Patterns

### Connection Initialization

SDK Client handles MCP initialization automatically during `connect()`:

```kotlin
"should initialize MCP connection using SDK Client" {
    val httpClient = HttpClient(CIO) { install(SSE) }

    try {
        // Create client with implementation info
        val client = Client(Implementation("cycletime-test-client", "1.0.0"))
        val transport = SSEClientTransport(httpClient, "http://localhost:8080")

        // Connect with timeout (SDK sends initialize automatically)
        withTimeout(10_000) {
            client.connect(transport)
        }

        // Verify server info available after connection
        val serverInfo = client.serverVersion
        serverInfo.shouldNotBeNull()
        serverInfo.name shouldBe "cycletime-ce"

        // Verify server capabilities
        val capabilities = client.serverCapabilities
        capabilities.shouldNotBeNull()
        capabilities.tools?.listChanged shouldBe true

    } finally {
        httpClient.close()
    }
}
```

**Key points**:
- `client.connect(transport)` sends initialize request automatically
- Server info (`client.serverVersion`) available after connection
- Server capabilities (`client.serverCapabilities`) available after connection
- Always use `withTimeout` to prevent hanging tests

**Error handling**:
```kotlin
// Connection timeout
val exception = shouldThrow<Exception> {
    withTimeout(1_000) {  // Very short timeout
        client.connect(transport)
    }
}
exception.message shouldContain "timeout"

// Invalid server URL
val transport = SSEClientTransport(httpClient, "http://invalid:9999")
val exception = shouldThrow<Exception> {
    client.connect(transport)
}
exception.message shouldContain "Connection refused"
```

### Tool Invocation

SDK Client provides type-safe tool invocation with automatic session management:

**Basic tool call**:
```kotlin
"should call tool with valid arguments using SDK Client" {
    val httpClient = HttpClient(CIO) { install(SSE) }

    try {
        val client = Client(Implementation("cycletime-test-client", "1.0.0"))
        val transport = SSEClientTransport(httpClient, "http://localhost:8080")

        withTimeout(10_000) { client.connect(transport) }

        // Create test project first (helper function - see below)
        val projectId = client.createTestProject("Test Project")

        // Call tool with arguments
        val result = client.callTool(
            name = "session_create_session",
            arguments = mapOf("projectId" to JsonPrimitive(projectId))
        )

        // Verify result structure
        result.shouldNotBeNull()
        result.isError shouldBe false
        result.content.shouldNotBeEmpty()

        // Verify content type
        val content = result.content[0]
        content.type shouldBe "text"

        // Extract text content
        if (content is TextContent) {
            content.text shouldContain projectId
        }

    } finally {
        httpClient.close()
    }
}
```

**Tool call with error handling**:
```kotlin
"should reject tool call with invalid tool name" {
    val httpClient = HttpClient(CIO) { install(SSE) }

    try {
        val client = Client(Implementation("cycletime-test-client", "1.0.0"))
        val transport = SSEClientTransport(httpClient, "http://localhost:8080")

        withTimeout(10_000) { client.connect(transport) }

        // SDK throws exception for tool not found
        val exception = shouldThrow<Exception> {
            client.callTool("nonexistent_tool", emptyMap())
        }

        exception.message shouldContain "not found"

    } finally {
        httpClient.close()
    }
}

"should reject tool call with missing required arguments" {
    val httpClient = HttpClient(CIO) { install(SSE) }

    try {
        val client = Client(Implementation("cycletime-test-client", "1.0.0"))
        val transport = SSEClientTransport(httpClient, "http://localhost:8080")

        withTimeout(10_000) { client.connect(transport) }

        // SDK returns error result for validation errors
        val result = client.callTool(
            name = "session_create_session",
            arguments = emptyMap()  // Missing required projectId
        )

        result.shouldNotBeNull()
        result.isError shouldBe true

    } finally {
        httpClient.close()
    }
}
```

**Helper function for project creation**:

Many tests require valid project IDs. This helper creates projects on-demand:

```kotlin
/**
 * Helper function to create a test project and return its UUID.
 * Required because session_create_session needs a valid project UUID.
 */
suspend fun Client.createTestProject(
    name: String = "Test Project ${System.currentTimeMillis()}"
): String {
    val result = this.callTool(
        name = "project_create_project",
        arguments = mapOf(
            "name" to JsonPrimitive(name),
            "description" to JsonPrimitive("Test project for SDK tests")
        )
    )

    result.shouldNotBeNull()
    result.isError shouldBe false
    result.content.shouldNotBeEmpty()

    val content = result.content[0]
    require(content is TextContent) { "Expected TextContent" }

    val jsonText = content.text ?: throw IllegalStateException("TextContent.text is null")
    val projectIdRegex = "\"id\"\\s*:\\s*\"([0-9a-f-]+)\"".toRegex()
    val match = projectIdRegex.find(jsonText)
    if (match != null) {
        return match.groupValues[1]
    }

    throw IllegalStateException("Failed to extract project ID from response: ${result.content}")
}
```

**Usage**:
```kotlin
val projectId = client.createTestProject("My Test Project")
val result = client.callTool(
    "session_create_session",
    mapOf("projectId" to JsonPrimitive(projectId))
)
```

### Resource Reading

SDK Client provides type-safe resource operations:

**List resources**:
```kotlin
"should list all MCP resources via SDK" {
    val httpClient = HttpClient(CIO) { install(SSE) }

    try {
        val client = Client(Implementation("cycletime-test-client", "1.0.0"))
        val transport = SSEClientTransport(httpClient, "http://localhost:8080")

        withTimeout(10_000) { client.connect(transport) }

        // List resources
        val resourcesResult = client.listResources()

        // Verify resources array
        resourcesResult.resources.shouldNotBeEmpty()

        // Verify resource structure
        resourcesResult.resources.forEach { resource ->
            resource.uri.shouldNotBeNull()
            resource.name.shouldNotBeNull()
            resource.mimeType.shouldNotBeNull()
        }

    } finally {
        httpClient.close()
    }
}
```

**Read resource**:
```kotlin
"should read resource with valid URI via SDK" {
    val httpClient = HttpClient(CIO) { install(SSE) }

    try {
        val client = Client(Implementation("cycletime-test-client", "1.0.0"))
        val transport = SSEClientTransport(httpClient, "http://localhost:8080")

        withTimeout(10_000) { client.connect(transport) }

        // Create session to have active session for resource reading
        val projectId = client.createTestProject("Test Project")
        val sessionResult = client.callTool(
            name = "session_create_session",
            arguments = mapOf("projectId" to JsonPrimitive(projectId))
        )
        sessionResult.shouldNotBeNull()
        sessionResult.isError shouldBe false

        // Read resource
        val result = client.readResource(
            request = ReadResourceRequest(uri = "cycletime://sessions/active")
        )

        // Verify response structure
        result.contents.shouldNotBeEmpty()

    } finally {
        httpClient.close()
    }
}
```

**Resource error handling**:
```kotlin
"should reject resource read with invalid URI" {
    val httpClient = HttpClient(CIO) { install(SSE) }

    try {
        val client = Client(Implementation("cycletime-test-client", "1.0.0"))
        val transport = SSEClientTransport(httpClient, "http://localhost:8080")

        withTimeout(10_000) { client.connect(transport) }

        // SDK throws exception for invalid resource
        val exception = shouldThrow<Exception> {
            client.readResource(
                request = ReadResourceRequest(uri = "cycletime://invalid/resource")
            )
        }

        exception.message shouldContain "not found"

    } finally {
        httpClient.close()
    }
}
```

### Session Management

SDK Client manages sessions automatically. Test session **behavior**, not session extraction:

**Session lifecycle testing**:
```kotlin
"should maintain session context across requests using SDK Client" {
    val httpClient = HttpClient(CIO) { install(SSE) }

    try {
        val client = Client(Implementation("cycletime-test-client", "1.0.0"))
        val transport = SSEClientTransport(httpClient, "http://localhost:8080")

        withTimeout(10_000) { client.connect(transport) }

        val projectId = client.createTestProject("Test Project for Session Context")

        // First request: Create session (SDK tracks internally)
        val createResult = client.callTool(
            name = "session_create_session",
            arguments = mapOf("projectId" to JsonPrimitive(projectId))
        )
        createResult.shouldNotBeNull()
        createResult.isError shouldBe false

        // Second request: Get session (requires session context)
        // If SDK maintains session correctly, this succeeds
        val getResult = client.callTool(
            name = "session_get_active_session",
            arguments = emptyMap()
        )
        getResult.shouldNotBeNull()
        getResult.isError shouldBe false

        // Both succeed = SDK maintains session context!
        getResult.content.shouldNotBeEmpty()

    } finally {
        httpClient.close()
    }
}
```

**Multiple independent sessions**:
```kotlin
"should handle multiple sessions independently" {
    val httpClient = HttpClient(CIO) { install(SSE) }

    try {
        val client = Client(Implementation("cycletime-test-client", "1.0.0"))
        val transport = SSEClientTransport(httpClient, "http://localhost:8080")

        withTimeout(10_000) { client.connect(transport) }

        // Create two different sessions
        val project1 = client.createTestProject("Test Session 1")
        val project2 = client.createTestProject("Test Session 2")

        val session1 = client.callTool(
            name = "session_create_session",
            arguments = mapOf("projectId" to JsonPrimitive(project1))
        )
        val session2 = client.callTool(
            name = "session_create_session",
            arguments = mapOf("projectId" to JsonPrimitive(project2))
        )

        session1.shouldNotBeNull()
        session1.isError shouldBe false
        session2.shouldNotBeNull()
        session2.isError shouldBe false

        // Both sessions exist independently
        session1.content.shouldNotBeEmpty()
        session2.content.shouldNotBeEmpty()

    } finally {
        httpClient.close()
    }
}
```

**Important behavioral note**:

SDK Client creates an implicit session during initialization. This means:

```kotlin
// This succeeds even without explicit session_create_session call
val getResult = client.callTool("session_get_active_session", emptyMap())
getResult.isError shouldBe false  // Returns implicit session

// This is expected SDK behavior - not a test failure!
```

## Test Infrastructure

### testSDKApplication Helper

The `testSDKApplication` helper provides production-parity test configuration:

**Location**: `src/test/kotlin/io/spiralhouse/cycletime/test/utils/TestApplicationConfig.kt`

**Design philosophy** (from KDoc):
- **Production parity**: Tests run against real application configuration
- **Test isolation**: Each test gets independent application instance
- **Minimal boilerplate**: Hide complex setup details
- **Clear intent**: Method names describe test scenario

**Usage**:
```kotlin
testSDKApplication {
    // Application started with:
    // - Dependency injection (SDK components, services, repositories)
    // - MCP routing (SDK endpoints at /mcp)
    // - Health endpoint (REST endpoint at /health)
    // - Content negotiation (JSON serialization)
    // - Test database (in-memory H2)

    val httpClient = HttpClient(CIO) { install(SSE) }
    try {
        val client = Client(Implementation("test", "1.0.0"))
        val transport = SSEClientTransport(httpClient, "http://localhost:8080")

        withTimeout(10_000) { client.connect(transport) }

        // Test operations

    } finally {
        httpClient.close()
    }
}
```

**What it provides**:
- Real HTTP server (required for SDK Client connections)
- Production DI configuration (MCPIntegrationService, repositories, etc.)
- Isolated test database (fresh H2 instance per test)
- MCP endpoints configured (same as production)
- Health endpoint (for application integration tests)

**When NOT to use**:

Performance tests requiring external HTTP clients should use embedded server infrastructure (future implementation - see SPI-[TBD]):

```kotlin
// ❌ DOESN'T WORK: testSDKApplication uses testApplication (in-memory)
testSDKApplication {
    // SDK Client cannot connect to in-memory test engine
}

// ✅ FUTURE: testSDKApplicationWithEmbeddedServer (real network server)
testSDKApplicationWithEmbeddedServer {
    // SDK Client connects via real network sockets
    // Required for performance tests
}
```

### Low-Level HTTP Helpers (When to Use)

The codebase includes HTTP test helpers for protocol-level testing:

**MCPRequestBuilders** (`test/utils/MCPRequestBuilders.kt`):
- Constructs JSON-RPC requests manually
- Used for protocol-level error testing
- **Use when**: Testing server's JSON-RPC validation
- **Don't use**: For application-level integration tests

**TestClientExtensions** (`test/utils/TestClientExtensions.kt`):
- Fluent HTTP client extensions
- Used for HTTP-level testing
- **Use when**: Testing HTTP status codes, headers
- **Don't use**: For SDK Client integration tests

**Trade-offs**:

| Aspect | SDK Client Testing | HTTP Helper Testing |
|--------|-------------------|---------------------|
| **Validates** | Production SDK integration | Server JSON-RPC handling |
| **Type Safety** | Compile-time (SDK types) | Runtime (manual parsing) |
| **Boilerplate** | Low (SDK handles complexity) | High (manual JSON/HTTP) |
| **Error Coverage** | Business errors only | Protocol + business errors |
| **Maintenance** | Low (SDK updates externally) | High (manual sync with spec) |

**Decision guide**:
```
Testing application behavior? → Use SDK Client
Testing tool/resource functionality? → Use SDK Client
Testing protocol-level errors? → Use HTTP helpers
Testing transport-level performance? → Use HTTP helpers
Need compile-time type safety? → Use SDK Client
Need to test malformed JSON-RPC? → Use HTTP helpers
```

## Migration Guide

### Decision Framework

Use this decision tree to determine if a test should be migrated:

```
┌─────────────────────────────────────┐
│ Can SDK Client perform this test?   │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
       YES           NO
        │             │
        ▼             ▼
  ┌─────────┐   ┌─────────┐
  │ MIGRATE │   │  SKIP   │
  └─────────┘   └─────────┘
```

**MIGRATE when**:
- Test validates application behavior (tool execution, resource reading)
- Test checks tool/resource integration (tools/list, tools/call)
- Test verifies session management behavior (create session, get session)
- Test validates end-to-end workflows

**SKIP when**:
- SDK prevents the error by design (malformed JSON-RPC, invalid protocol)
- SDK abstracts the concern (transport-level timing, SSE streaming)
- Test requires "send before connect" pattern (SDK requires connection first)
- Test compares transports (SDK only supports SSE)

**DELETE when**:
- Test is legacy EventBus pattern (fully replaced by SDK)
- Test duplicates SDK Client test coverage
- Test validates internal implementation details (not behavior)

### Migration Examples

**Example 1: Tool listing (Direct conversion)**

**Before (HTTP pattern)**:
```kotlin
testSDKApplication {
    val client = createTestClient()
    client.mcpInitialize()

    val response = client.listMCPTools()
    response.isMCPSuccess() shouldBe true

    val result = response.extractMCPResult()
    val tools = result.jsonObject["tools"]!!.jsonArray
    tools.shouldNotBeEmpty()
}
```

**After (SDK Client pattern)**:
```kotlin
val httpClient = HttpClient(CIO) { install(SSE) }
try {
    val client = Client(Implementation("cycletime-test-client", "1.0.0"))
    val transport = SSEClientTransport(httpClient, "http://localhost:8080")

    withTimeout(10_000) { client.connect(transport) }

    val toolsResult = client.listTools()
    toolsResult.tools.shouldNotBeEmpty()

} finally {
    httpClient.close()
}
```

**Changes**:
- Replace `testSDKApplication` with explicit HttpClient setup
- Replace `mcpInitialize()` with `client.connect(transport)`
- Replace `listMCPTools()` + manual parsing with `client.listTools()`
- Add try-finally block for resource cleanup

**Example 2: Tool invocation (Needs project helper)**

**Before (HTTP pattern)**:
```kotlin
testSDKApplication {
    val client = createTestClient()
    client.mcpInitialize()

    val response = client.callMCPTool(
        "session_create_session",
        mapOf("projectId" to "TEST-PROJECT")
    )

    val result = response.extractMCPResult()
    val content = result.jsonObject["content"]!!.jsonArray
    content.shouldNotBeEmpty()
}
```

**After (SDK Client pattern)**:
```kotlin
val httpClient = HttpClient(CIO) { install(SSE) }
try {
    val client = Client(Implementation("cycletime-test-client", "1.0.0"))
    val transport = SSEClientTransport(httpClient, "http://localhost:8080")

    withTimeout(10_000) { client.connect(transport) }

    // Create valid project ID first
    val projectId = client.createTestProject("Test Project")

    val result = client.callTool(
        name = "session_create_session",
        arguments = mapOf("projectId" to JsonPrimitive(projectId))
    )

    result.isError shouldBe false
    result.content.shouldNotBeEmpty()

} finally {
    httpClient.close()
}
```

**Changes**:
- Add project creation helper (many tests need valid project IDs)
- Replace hardcoded "TEST-PROJECT" with actual project UUID
- Replace `callMCPTool()` with `client.callTool()`
- Use SDK's `CallToolResult` type instead of manual JSON parsing
- Wrap arguments in `JsonPrimitive()` (SDK type requirement)

**Example 3: Error handling (Exception vs Result)**

**Before (HTTP pattern)**:
```kotlin
testSDKApplication {
    val client = createTestClient()
    client.mcpInitialize()

    val response = client.callMCPTool("nonexistent_tool", emptyMap())

    val error = response.extractMCPError()
    error shouldNotBe null
    error!!["message"]?.jsonPrimitive?.content shouldContain "not found"
}
```

**After (SDK Client pattern)**:
```kotlin
val httpClient = HttpClient(CIO) { install(SSE) }
try {
    val client = Client(Implementation("cycletime-test-client", "1.0.0"))
    val transport = SSEClientTransport(httpClient, "http://localhost:8080")

    withTimeout(10_000) { client.connect(transport) }

    // SDK throws exception for tool not found
    val exception = shouldThrow<Exception> {
        client.callTool("nonexistent_tool", emptyMap())
    }

    exception.message shouldContain "not found"

} finally {
    httpClient.close()
}
```

**Changes**:
- SDK throws exceptions for "not found" errors
- SDK returns `result.isError = true` for business-level errors
- No manual error extraction needed

**Example 4: Protocol-level errors (SKIP)**

**Before (HTTP pattern)**:
```kotlin
testSDKApplication {
    val client = createTestClient()

    // Send malformed JSON-RPC
    val response = client.post("/mcp") {
        setBody("""{"invalid":"json"}""")
    }

    response.status shouldBe HttpStatusCode.BadRequest
}
```

**After (SDK Client pattern)**:
```kotlin
"should reject invalid JSON-RPC format".config(enabled = false) {
    /**
     * MIGRATION NOTE (SPI-710): This test cannot be migrated to SDK Client pattern.
     *
     * Original Test Intent: Validate that server properly rejects JSON
     * missing required JSON-RPC fields (jsonrpc, method, id).
     *
     * Why This Cannot Be Migrated:
     * - SDK Client constructs valid JSON-RPC requests internally
     * - There is no "send raw request" API (by design)
     * - This protective behavior is a FEATURE, not a limitation
     *
     * Verification Alternative: The SDK Client's internal JSON-RPC
     * construction is validated by all other tests passing. If the SDK
     * constructs invalid JSON-RPC, all tests would fail.
     */
}
```

**Decision**: Skip test with comprehensive migration note explaining why.

## Best Practices

### Resource Lifecycle

**Always use try-finally pattern**:

```kotlin
// ✅ GOOD: Resource cleanup guaranteed
val httpClient = HttpClient(CIO) { install(SSE) }
try {
    // All test operations
} finally {
    httpClient.close()  // ALWAYS executes
}

// ❌ BAD: Resource leak if test fails
val httpClient = HttpClient(CIO) { install(SSE) }
// ... test operations ...
httpClient.close()  // Never reached if exception thrown!
```

**Why this matters**:
- HttpClient manages network sockets, coroutines, and connection pools
- Without cleanup: port exhaustion, test interference, CI failures
- Try-finally ensures cleanup even if test throws exception

**DI container lifecycle**:

```kotlin
testSDKApplication {
    // DI container automatically managed by testSDKApplication
    val mcpService: MCPIntegrationService by application.dependencies
    mcpService.isRunning() shouldBe true

    // No manual cleanup needed - testSDKApplication handles it
}
```

### Test Isolation

**Per-test database instances**:

```kotlin
testSDKApplication {
    // Each invocation creates isolated test database
    // Database URL: "jdbc:h2:mem:test_${System.currentTimeMillis()}"
    // Ensures tests don't interfere with each other
}
```

**Session state management**:

SDK Client manages sessions internally. No shared state between tests:

```kotlin
// Test 1 - Creates session A
"test 1" {
    val httpClient = HttpClient(CIO) { install(SSE) }
    try {
        val client = Client(Implementation("test-1", "1.0.0"))
        // ... session A created ...
    } finally {
        httpClient.close()  // Session A cleaned up
    }
}

// Test 2 - Creates session B (completely independent)
"test 2" {
    val httpClient = HttpClient(CIO) { install(SSE) }
    try {
        val client = Client(Implementation("test-2", "1.0.0"))
        // ... session B created (no knowledge of session A) ...
    } finally {
        httpClient.close()
    }
}
```

**Parallel test execution safety**:

SDK Client tests are safe for parallel execution because:
- Each test gets isolated database
- Each test creates independent HttpClient
- No shared mutable state between tests
- Resource cleanup prevents interference

### Performance Considerations

**testSDKApplication overhead**:

- Embedded server startup: ~300ms for first test
- Database initialization: ~50ms per test
- SDK Client connection: ~40ms per test
- Tool operations: ~20-30ms per operation

**Total test execution time**: Expect 400-500ms for first test, 100-150ms for subsequent tests

**Performance optimization**:

```kotlin
// ✅ GOOD: Reuse client for multiple operations
val httpClient = HttpClient(CIO) { install(SSE) }
try {
    val client = Client(Implementation("test", "1.0.0"))
    val transport = SSEClientTransport(httpClient, "http://localhost:8080")

    withTimeout(10_000) { client.connect(transport) }

    // Multiple operations with same client
    client.listTools()
    client.callTool("tool1", args1)
    client.callTool("tool2", args2)

} finally {
    httpClient.close()
}

// ❌ BAD: Creating new client for each operation
client.listTools()
httpClient.close()

val httpClient2 = HttpClient(CIO) { install(SSE) }
// ... reconnect overhead ...
```

**Resource consumption**:

- HttpClient: ~5MB memory + network socket
- SDK Client: ~2MB memory per instance
- Test database: ~10MB memory per test

For tests requiring 100+ concurrent clients, consider external server approach instead of `testSDKApplication`.

## Troubleshooting

### Connection Refused Errors

**Symptom**: `java.net.ConnectException: Connection refused`

**Cause**: Using `testApplication` instead of `testSDKApplication`

**Solution**:
```kotlin
// ❌ WRONG: testApplication uses in-memory engine
testApplication {
    val client = Client(...)
    client.connect(transport)  // Connection refused!
}

// ✅ CORRECT: testSDKApplication starts real HTTP server
testSDKApplication {
    val client = Client(...)
    client.connect(transport)  // Connection successful
}
```

### Resource Cleanup Failures

**Symptom**: Tests pass individually but fail when run in suite. Port exhaustion errors.

**Cause**: Missing `httpClient.close()` in finally block

**Solution**:
```kotlin
// ❌ BAD: No cleanup
val httpClient = HttpClient(CIO) { install(SSE) }
// ... test operations ...

// ✅ GOOD: Always cleanup
val httpClient = HttpClient(CIO) { install(SSE) }
try {
    // ... test operations ...
} finally {
    httpClient.close()
}
```

### Session Management Confusion

**Symptom**: Test expects "no session" but `session_get_active_session` succeeds

**Explanation**: SDK Client creates implicit session during initialization

**This is expected behavior**:
```kotlin
// SDK creates implicit session during connect
client.connect(transport)

// This succeeds (returns implicit session)
val result = client.callTool("session_get_active_session", emptyMap())
result.isError shouldBe false  // Expected!
```

**Solution**: Test session behavior, not session existence:
```kotlin
// ✅ GOOD: Test that explicit session creation works
val createResult = client.callTool("session_create_session", args)
createResult.isError shouldBe false

val getResult = client.callTool("session_get_active_session", emptyMap())
getResult.isError shouldBe false

// Both succeed = session lifecycle works!
```

### Timeout Issues

**Symptom**: `kotlinx.coroutines.TimeoutCancellationException`

**Common causes**:
1. Server not started (using testApplication instead of testSDKApplication)
2. Timeout too short for slow operations
3. Server crashed during test

**Solution**:
```kotlin
// ✅ GOOD: Reasonable timeout for connection
withTimeout(10_000) {  // 10 seconds
    client.connect(transport)
}

// ❌ BAD: Timeout too short
withTimeout(1_000) {  // 1 second (not enough for startup)
    client.connect(transport)
}
```

### Performance Degradation

**Symptom**: Tests slow down over time. Suite takes 5+ minutes.

**Causes**:
1. Resource leaks (missing httpClient.close())
2. Creating new client for each operation
3. Too many concurrent database instances

**Solutions**:

```kotlin
// ✅ GOOD: Reuse client within test
val httpClient = HttpClient(CIO) { install(SSE) }
try {
    val client = Client(Implementation("test", "1.0.0"))
    client.connect(transport)

    // Multiple operations with same client
    repeat(100) {
        client.callTool("tool", args)
    }
} finally {
    httpClient.close()
}

// ❌ BAD: Creating new client for each operation
repeat(100) {
    val httpClient = HttpClient(CIO) { install(SSE) }
    val client = Client(Implementation("test", "1.0.0"))
    client.connect(transport)
    client.callTool("tool", args)
    httpClient.close()
}
```

### Missing Project ID Errors

**Symptom**: `session_create_session` fails with validation error

**Cause**: Using invalid or hardcoded project ID

**Solution**: Always create project first:
```kotlin
// ❌ BAD: Hardcoded invalid project ID
client.callTool("session_create_session", mapOf(
    "projectId" to JsonPrimitive("INVALID-ID")
))

// ✅ GOOD: Create project first
val projectId = client.createTestProject("Test Project")
client.callTool("session_create_session", mapOf(
    "projectId" to JsonPrimitive(projectId)
))
```

## SDK v0.7.2 Workarounds

This section documents temporary patterns specific to SDK v0.7.2 that may change in future SDK versions.

### Root Path Routing

**Current behavior** (v0.7.2):
```kotlin
// SDK registers endpoints at root path "/"
val transport = SSEClientTransport(httpClient, "http://localhost:8080")
```

**Future behavior** (pending SDK PR):
```kotlin
// SDK will register endpoints at "/mcp" path
val transport = SSEClientTransport(httpClient, "http://localhost:8080/mcp")
```

**When this changes**: Update all `SSEClientTransport` construction to include `/mcp` path.

### Session Query Parameters

**Current behavior** (v0.7.2):

SDK passes session ID as query parameter:
```
POST /?sessionId=xyz HTTP/1.1
```

**Future behavior** (pending SDK PR):

SDK will use Mcp-Session-Id header:
```
POST /mcp HTTP/1.1
Mcp-Session-Id: xyz
```

**Impact**: This is SDK-internal. Tests don't need changes.

### How to Identify Temporary Patterns

Look for these markers in code:

```kotlin
// TEMP (SDK v0.7.2): Comment explaining temporary pattern
val transport = SSEClientTransport(httpClient, "http://localhost:8080")

/**
 * SDK v0.7.2 BEHAVIOR: Explanation of current behavior
 * Reference: https://github.com/modelcontextprotocol/kotlin-sdk/issues/XXX
 */
```

**When SDK updates**: Search codebase for "SDK v0.7.2" comments and update patterns.

### Cleanup Strategy

When upgrading SDK versions:

1. Search for "SDK v0.7.2" in codebase
2. Review linked GitHub issues/PRs for SDK changes
3. Update patterns based on new SDK behavior
4. Run full test suite to verify compatibility
5. Remove "SDK v0.7.2" comments after migration

## Related Documentation

### Testing Strategy
- [Testing Standards](../../.claude/shared/testing-standards.md) - General testing architecture and requirements
- [Testing Strategy](strategy.md) - 3-tier testing approach and organization

### Test Infrastructure
- [TestApplicationConfig.kt](../../src/test/kotlin/io/spiralhouse/cycletime/test/utils/TestApplicationConfig.kt) - testSDKApplication implementation
- [MCPRequestBuilders.kt](../../src/test/kotlin/io/spiralhouse/cycletime/test/utils/MCPRequestBuilders.kt) - Low-level HTTP helpers (protocol testing)
- [TestClientExtensions.kt](../../src/test/kotlin/io/spiralhouse/cycletime/test/utils/TestClientExtensions.kt) - HTTP client extensions (transport testing)

### Working Examples
- [MCPSdkTransportTest.kt](../../src/test/kotlin/io/spiralhouse/cycletime/integration/mcp/sdk/MCPSdkTransportTest.kt) - SDK transport integration tests
- [McpToolIntegrationTest.kt](../../src/test/kotlin/io/spiralhouse/cycletime/integration/mcp/tools/McpToolIntegrationTest.kt) - Tool invocation tests
- [ApplicationMCPIntegrationTest.kt](../../src/test/kotlin/io/spiralhouse/cycletime/integration/ApplicationMCPIntegrationTest.kt) - Application-level integration

### External Resources
- [MCP Kotlin SDK](https://github.com/modelcontextprotocol/kotlin-sdk) - Official SDK documentation
- [MCP Specification](https://modelcontextprotocol.io) - Protocol specification

---

## Summary

SDK Client testing validates MCP server behavior through production integration patterns. Key principles:

**Use SDK Client for**: Application behavior, tool/resource integration, session lifecycle, end-to-end workflows

**Skip SDK Client for**: Protocol-level errors (SDK prevents by design), transport-level timing (SDK abstracts), patterns SDK doesn't support

**Critical patterns**: Always use try-finally for HttpClient cleanup, use testSDKApplication for real HTTP server, test session behavior (not extraction)

**Migration approach**: Clear decision tree (migrate vs skip), before/after examples, comprehensive documentation for skipped tests

**Quality standards**: 100% resource cleanup, test isolation, realistic performance baselines, maintainable patterns

This guide evolves with SDK updates. When SDK patterns change, update code examples and workaround sections accordingly.
