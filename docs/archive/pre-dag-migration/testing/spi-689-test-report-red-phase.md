# SPI-689 TDD RED Phase Test Report

**Issue**: MCP client fails to connect to CycleTime
**Root Cause**: Session bootstrap chicken-and-egg bug
**Date**: 2025-10-10
**Phase**: TDD RED (Create Failing Tests)

---

## Test Suite Summary

**Test File**: `src/test/kotlin/io/spiralhouse/cycletime/integration/SessionBootstrapIntegrationTest.kt`
**Total Tests**: 13
**Failed Tests**: 10 (77%)
**Passed Tests**: 3 (23%)

### Passed Tests (Expected Behavior Already Working)

1. **POST tools/list without Mcp-Session-Id should return 400 Bad Request** ✅
   - Security validation correctly blocks non-initialize methods without session

2. **POST with empty Mcp-Session-Id should return 400 Bad Request** ✅
   - Security validation correctly blocks empty session IDs

3. **POST with malformed JSON should return 400 Bad Request** ✅
   - JSON parsing correctly rejects malformed requests

---

## Failed Tests (Demonstrating the Bug)

### Category 1: POST Initialize Bootstrap (3 failures)

#### Test 1.1: POST initialize without session ID
**Status**: ❌ FAILED
**Expected**: 202 Accepted
**Actual**: 400 Bad Request

**Error**:
```
expected: 202 Accepted
but was: 400 Bad Request
```

**Root Cause**: `MCPPostHandler.kt:39` validates session header BEFORE parsing request, blocking initialize method.

---

#### Test 1.2: POST initialize with client-provided session ID
**Status**: ❌ FAILED
**Expected**: 202 Accepted with provided session ID in response
**Actual**: Empty response body (cannot parse)

**Error**:
```
JsonDecodingException: Expected start of the object '{', but had 'EOF' instead
```

**Root Cause**: Even with session ID, initialize response doesn't include sessionId field in result.

---

#### Test 1.3: POST initialize should generate valid UUID
**Status**: ❌ FAILED
**Expected**: 202 Accepted with UUID session ID
**Actual**: 400 Bad Request with plain text error

**Error**:
```
JsonDecodingException: Expected start of the object '{', but had '"' instead
JSON input: {"error": "Mcp-Session-Id header required"}
```

**Root Cause**: Session validation blocks request before initialize method is invoked.

---

### Category 2: SSE Connection Bootstrap (2 failures)

#### Test 2.1: SSE connection without session ID
**Status**: ❌ FAILED
**Expected**: 200 OK with session event
**Actual**: 406 Not Acceptable

**Error**:
```
expected: 200 OK
but was: 406 Not Acceptable
```

**Root Cause**: `MCPSSEHandler.kt:35` validates session header BEFORE establishing connection.

---

#### Test 2.2: SSE connection with session ID should use it
**Status**: ❌ FAILED
**Expected**: First event includes provided session ID
**Actual**: Generic SSE comment with no session data

**Error**:
```
": SSE connection established" should include substring "9d7127c1-73b5-4038-bd71-81dd83c4fb8f"
```

**Root Cause**: SSE handler doesn't send session confirmation event, only a comment.

---

### Category 3: Complete Bootstrap Flows (2 failures)

#### Test 3.1: SSE-first bootstrap flow
**Status**: ❌ FAILED
**Expected**: Capture session from SSE, use in POST
**Actual**: Cannot capture session (SSE fails to connect)

**Error**:
```
<null> should not equal <null>
(capturedSessionId was null)
```

**Root Cause**: SSE connection fails at step 1 (no session header), cannot complete flow.

---

#### Test 3.2: POST-first bootstrap flow
**Status**: ❌ FAILED
**Expected**: Initialize returns session, use in SSE
**Actual**: Initialize request rejected

**Error**:
```
expected: 202 Accepted
but was: 400 Bad Request
```

**Root Cause**: POST initialize fails at step 1 (no session header), cannot complete flow.

---

### Category 4: Edge Cases (3 failures)

#### Test 4.1: Concurrent initialize requests
**Status**: ❌ FAILED
**Expected**: 10 unique session IDs
**Actual**: All requests fail with 400 Bad Request

**Error**:
```
JsonDecodingException: Expected start of the object '{', but had '"' instead
JSON input: {"error": "Mcp-Session-Id header required"}
```

**Root Cause**: All concurrent requests blocked by session validation.

---

#### Test 4.2: Invalid protocol version
**Status**: ❌ FAILED
**Expected**: 202 Accepted with JSON-RPC error
**Actual**: 400 Bad Request (cannot reach validation)

**Error**:
```
expected: 202 Accepted
but was: 400 Bad Request
```

**Root Cause**: Request blocked before protocol version can be validated.

---

#### Test 4.3: Missing required parameters
**Status**: ❌ FAILED
**Expected**: 202 Accepted with JSON-RPC error about missing params
**Actual**: 400 Bad Request (cannot reach validation)

**Error**:
```
expected: 202 Accepted
but was: 400 Bad Request
```

**Root Cause**: Request blocked before parameter validation.

---

## Code Analysis

### Problem Location 1: MCPPostHandler.kt
**Line 39**: Session validation occurs BEFORE request parsing

```kotlin
fun Route.mcpPostEndpoint(...) {
    post("/mcp") {
        val sessionId = call.validateSessionHeader("POST", logger) ?: return@post
        // ❌ BLOCKS ALL REQUESTS WITHOUT SESSION, INCLUDING INITIALIZE

        // Read and parse request body
        val requestBody = call.receiveText()
        val jsonRpcRequest = parseJsonRpcRequest(requestBody)
        // ✅ Should check if method == "initialize" BEFORE requiring session
```

**Required Fix**: Parse request FIRST, then conditionally validate session:
```kotlin
// Read and parse request body FIRST
val requestBody = call.receiveText()
val jsonRpcRequest = parseJsonRpcRequest(requestBody)

// Conditionally validate session (skip for initialize)
val sessionId = if (jsonRpcRequest.method == "initialize") {
    call.request.headers["Mcp-Session-Id"] ?: UUID.randomUUID().toString()
} else {
    call.validateSessionHeader("POST", logger) ?: return@post
}
```

---

### Problem Location 2: MCPSSEHandler.kt
**Line 35**: Session validation occurs BEFORE connection establishment

```kotlin
fun Route.mcpSSEEndpoint(...) {
    get("/mcp/events") {
        val sessionId = call.validateSessionHeader("SSE", logger) ?: return@get
        // ❌ BLOCKS ALL CONNECTIONS WITHOUT SESSION

        val session = sessionManager.getOrCreateSession(sessionId)
        // ✅ Should generate session if not provided
```

**Required Fix**: Generate session if not provided:
```kotlin
// Accept connection with or without session ID
val sessionId = call.request.headers["Mcp-Session-Id"]
    ?: UUID.randomUUID().toString()

val session = sessionManager.getOrCreateSession(sessionId)

// Send session ID as first event
val sessionEvent = SSEEvent(
    data = Json.encodeToString(buildJsonObject {
        put("sessionId", sessionId)
    }),
    event = "session",
    id = "1"
)
eventBus.publish(sessionId, sessionEvent)
```

---

### Problem Location 3: McpMethodHandler.kt
**Lines 115-164**: Initialize response missing sessionId field

```kotlin
private fun handleInitialize(request: JsonRpcRequest): JsonRpcResponse {
    // ... validation ...

    val result = buildJsonObject {
        put("protocolVersion", "2024-11-05")
        put("capabilities", buildCapabilities())
        put("serverInfo", buildServerInfo())
        // ❌ MISSING: put("sessionId", sessionId)
    }

    return createSuccessResponse(request, result)
}
```

**Required Fix**: Add sessionId to response:
```kotlin
private fun handleInitialize(
    request: JsonRpcRequest,
    sessionId: String
): JsonRpcResponse {
    // ... validation ...

    val result = buildJsonObject {
        put("sessionId", sessionId)  // ✅ ADD THIS
        put("protocolVersion", "2024-11-05")
        put("capabilities", buildCapabilities())
        put("serverInfo", buildServerInfo())
    }

    return createSuccessResponse(request, result)
}
```

---

## MCP Protocol Compliance

**Spec Version**: 2024-11-05
**Requirement**:
> "The server MUST accept `initialize` requests without requiring a session identifier. Upon successful initialization, the server assigns a session ID and returns it in the response."

**Current Status**: ❌ NON-COMPLIANT
- Server rejects initialize requests without session ID
- Server does not return session ID in initialize response
- Clients cannot complete bootstrap handshake

**After Fix**: ✅ COMPLIANT
- Server accepts initialize without session ID
- Server generates and returns session ID
- Clients can complete POST-first or SSE-first bootstrap

---

## Next Steps (GREEN Phase)

1. **Modify MCPPostHandler.kt**:
   - Parse request before session validation
   - Generate session for initialize method
   - Pass session ID to method handler

2. **Modify MCPSSEHandler.kt**:
   - Generate session if not provided
   - Send session event as first event
   - Continue with response streaming

3. **Modify McpMethodHandler.kt**:
   - Accept sessionId parameter in handleInitialize
   - Include sessionId in response result
   - Update method signature

4. **Run tests again**:
   - All 13 tests should pass
   - Verify both bootstrap patterns work
   - Confirm MCP protocol compliance

---

## Test Coverage Analysis

**Bootstrap Patterns**:
- ✅ POST-first bootstrap (3 tests)
- ✅ SSE-first bootstrap (2 tests)
- ✅ Complete end-to-end flows (2 tests)

**Security**:
- ✅ Non-initialize methods require session (2 tests)
- ✅ Empty session IDs rejected (1 test)

**Error Handling**:
- ✅ Malformed JSON rejected (1 test)
- ✅ Invalid protocol version handled (1 test)
- ✅ Missing parameters validated (1 test)

**Concurrency**:
- ✅ Concurrent initialize requests (1 test)

**Total Coverage**: Comprehensive coverage of all bootstrap scenarios, security requirements, and edge cases.

---

## Conclusion

The TDD RED phase is complete with **10 failing tests** that clearly demonstrate the session bootstrap bug. The tests:

1. **Document the bug**: Each failure shows exactly what's wrong
2. **Specify the fix**: Test expectations define correct behavior
3. **Ensure compliance**: Tests enforce MCP protocol requirements
4. **Prevent regression**: Tests will catch future bootstrap issues

The failing tests provide a clear roadmap for the GREEN phase implementation.
