# MCP Kotlin SDK v0.7.2 Client Implementation Research

## Executive Summary

**FINDING: SSE Client Pattern DISCOVERED ✅**

The MCP Kotlin SDK v0.7.2 follows the standard MCP protocol for SSE connections. SessionId is **NOT extracted separately** but is **embedded in the endpoint URL** as a query parameter. The SDK handles this automatically through the "endpoint" event mechanism.

---

## 1. SSE Connection Flow (MCP Protocol Standard)

### Step-by-Step Process

```kotlin
// 1. Client initiates SSE connection
val client = Client(
    clientInfo = Implementation(
        name = "example-client",
        version = "1.0.0"
    )
)

val transport = SSEClientTransport("http://localhost:8080/sse")
client.connect(transport)

// 2. SDK internally:
// - Establishes SSE connection using Ktor's sseSession()
// - Listens for SSE events from server
// - Waits for "endpoint" event

// 3. Server sends endpoint event:
// event: endpoint
// data: /messages?sessionId=a7f13c57-3ebe-4676-8079-bab962990583

// 4. SDK extracts endpoint URL and stores it internally
// 5. Future requests POST to: http://localhost:8080/messages?sessionId=a7f13c57-...
```

### Key Implementation Details

**From SSEClientTransport source code:**

```kotlin
// Connection handling (from Kotlin SDK)
client.sse(url) {
    incoming.collect { event ->
        when (event.event) {
            "endpoint" -> {
                // Extract endpoint URL with embedded sessionId
                val endpoint = Url(baseUrl + event.data)
                // Store for future requests
            }
            "message" -> {
                // Handle JSON-RPC messages
            }
            "error" -> {
                // Handle errors
            }
        }
    }
}

// Request sending
suspend fun send(message: JSONRPCMessage) {
    client.post(endpoint) { // endpoint already contains sessionId
        contentType(ContentType.Application.Json)
        setBody(message)
    }
}
```

**From TypeScript SDK (same protocol):**

```typescript
this._eventSource.addEventListener('endpoint', (event: Event) => {
  const messageEvent = event as MessageEvent;
  // messageEvent.data = "/messages?sessionId=a7f13c57-..."
  this._endpoint = new URL(messageEvent.data, this._url);
  // Full URL: http://localhost:8080/messages?sessionId=a7f13c57-...
});

async send(message: JSONRPCMessage): Promise<void> {
  const response = await fetch(this._endpoint, { // sessionId in URL
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(message)
  });
}
```

---

## 2. SessionId Handling - Critical Insight

### SessionId is NOT Extracted

❌ **Misconception:** Client extracts sessionId from SSE response header or separate field
✅ **Reality:** SessionId is embedded in the endpoint URL string

### Evidence from Issues

**Issue #41:** "SSE server does not process endpoint correctly"
```
Server sends: event:endpoint data:messages?sessionId=a7f13c57-3ebe-4676-8079-bab962990583
Client should use: http://localhost/messages?sessionId=a7f13c57-3ebe-4676-8079-bab962990583
```

**Issue #83:** "SSE transport doesn't handle absolute URI endpoints"
```
Some servers send: event:endpoint data:https://www.mcp.run/api/mcp/sse?sid=123456
Client should use the absolute URL directly
```

### Why This Design?

From MCP protocol documentation:
- **Legacy SSE Design:** Session state managed by embedding sessionId in URL path
- **Dual-Endpoint Architecture:**
  - `GET /sse` - Establishes SSE connection
  - `POST /messages?sessionId=XXX` - Sends requests
- **Server Responsibility:** Server generates sessionId and includes it in endpoint URL
- **Client Responsibility:** Client uses complete endpoint URL (no sessionId extraction needed)

---

## 3. Complete Client Usage Examples

### Basic SSE Client Example

```kotlin
import io.modelcontextprotocol.kotlin.sdk.client.Client
import io.modelcontextprotocol.kotlin.sdk.client.SSEClientTransport
import io.modelcontextprotocol.kotlin.sdk.Implementation

suspend fun connectToMcpServer() {
    // Create client
    val client = Client(
        clientInfo = Implementation(
            name = "cycletime-test-client",
            version = "1.0.0"
        )
    )

    // Create SSE transport
    val transport = SSEClientTransport("http://localhost:8080/mcp")

    // Connect (SDK handles endpoint event automatically)
    client.connect(transport)

    // Use the client
    val tools = client.listTools()
    println("Available tools: ${tools.tools.map { it.name }}")

    // Call a tool (sessionId automatically included in URL)
    val result = client.callTool(
        name = "get_current_session",
        arguments = emptyMap()
    )
    println("Result: $result")
}
```

### Complex URL Workaround (Issue #84 Solution)

For servers with query parameters in base URL:

```kotlin
import io.ktor.client.request.HttpRequestBuilder

// Instead of simple string URL
val transport = SSEClientTransport(
    HttpRequestBuilder().apply {
        url("https://server.com/mcp/sse?apiKey=xxx&region=us-east")
    }
)

client.connect(transport)
```

### Comparison with Other Transports

```kotlin
// WebSocket (different sessionId mechanism)
val wsTransport = WebSocketClientTransport("ws://localhost:8080/mcp")
client.connect(wsTransport)

// STDIO (no sessionId needed - direct process communication)
val stdioTransport = StdioClientTransport(
    inputStream = processInputStream,
    outputStream = processOutputStream
)
client.connect(stdioTransport)
```

---

## 4. SDK Repository Structure

### Available Samples

The `kotlin-sdk` repository contains three samples:

1. **kotlin-mcp-server** - Multiplatform (JVM, Wasm) server with SSE support
2. **weather-stdio-server** - STDIO transport server example
3. **kotlin-mcp-client** - ⚠️ **Uses STDIO transport only, NOT SSE**

### Important Finding

**No public SSE client examples exist in the Kotlin SDK samples.**

The `kotlin-mcp-client` sample demonstrates:
- Connecting via STDIO transport
- Integration with Anthropic API
- Tool listing and calling

But does NOT demonstrate SSE client usage.

### Test Files

Located at: `kotlin-sdk-client/src/commonTest/kotlin/io/modelcontextprotocol/kotlin/sdk/client/`

Found test files:
- `StreamableHttpClientTransportTest.kt` - Tests Streamable HTTP transport

**No dedicated SSEClientTransport test file found** in public repository search.

---

## 5. Protocol Evolution Context

### SSE Transport Status

**DEPRECATED** as of MCP specification version 2024-11-05

Replaced by: **Streamable HTTP** transport

### Migration Path

**Legacy SSE:**
```
GET /sse → establishes connection
Server sends: event:endpoint data:/messages?sessionId=XXX
Client POSTs to: /messages?sessionId=XXX
```

**Modern Streamable HTTP:**
```
POST /mcp → sends request + receives response
Session ID in header: Mcp-Session-Id: XXX
Optional SSE stream for server-to-client messages
```

### SDK Support Status

The Kotlin SDK v0.7.2 supports both:
- `SSEClientTransport` (legacy, but functional)
- `StreamableHttpClientTransport` (recommended)

---

## 6. Known Issues and Resolutions

### Issue #41: Path Joining Bug
- **Problem:** SDK incorrectly appended paths for relative endpoint URLs
- **Status:** Fixed in later version
- **Impact:** Server at `/sse` sending endpoint `messages?sessionId=X` worked incorrectly

### Issue #83: Absolute URI Handling
- **Problem:** SDK assumed all endpoints were relative URIs
- **Status:** Fixed in v0.6.0
- **Solution:** SDK now detects absolute URIs and uses them directly

### Issue #84: Complex URL Handling
- **Problem:** SSE transport appends `/sse` to base URL by default
- **Status:** Workaround available
- **Solution:** Use `HttpRequestBuilder` instead of string URL

### TypeScript SDK Issue #401: SessionId Not Updating
- **Problem:** `transport.sessionId` property returned undefined after connection
- **Explanation:** SessionId is embedded in endpoint URL, not stored as separate property
- **Lesson:** Don't expect `sessionId` as a public property

### TypeScript SDK Issue #510: Lifecycle State Lost on Reconnect
- **Problem:** EventSource reconnects create new session without re-initialization
- **Impact:** Server state lost after connection drops
- **Status:** Known limitation of SSE transport (reason for deprecation)

---

## 7. Practical Implementation Pattern

### What We Need for Our Tests

Based on SDK implementation, here's what happens automatically:

```kotlin
// 1. Create client and transport
val client = Client(Implementation("test-client", "1.0.0"))
val transport = SSEClientTransport("http://localhost:8080/mcp")

// 2. Connect (SDK handles everything internally):
client.connect(transport)

// Behind the scenes:
// - SDK opens SSE connection to GET http://localhost:8080/mcp
// - SDK receives: event:endpoint data:/messages?sessionId=a7f13c57-...
// - SDK stores endpoint: http://localhost:8080/messages?sessionId=a7f13c57-...

// 3. Send requests (sessionId automatically included)
val response = client.callTool("tool-name", mapOf("arg" to "value"))

// Behind the scenes:
// - SDK POSTs to http://localhost:8080/messages?sessionId=a7f13c57-...
// - JSON-RPC message in body
// - Server uses sessionId from URL to route to correct session
```

### For Our Test Implementation

**We don't need to:**
- Manually extract sessionId from SSE stream
- Add sessionId to request headers
- Parse the endpoint event ourselves

**We only need to:**
```kotlin
val client = Client(Implementation("test", "1.0.0"))
val transport = SSEClientTransport("http://localhost:8080/mcp")
client.connect(transport)
// Everything else is automatic!
```

---

## 8. Key Takeaways

### Critical Understanding

1. **SessionId Location:** Embedded in endpoint URL as query parameter
2. **Extraction Method:** SDK automatically extracts from "endpoint" SSE event
3. **Request Pattern:** SDK POSTs to endpoint URL (sessionId already included)
4. **No Manual Work:** Client code never touches sessionId directly

### SDK Design Philosophy

The SDK **abstracts away** the sessionId complexity:
- ✅ Client calls high-level methods (`listTools()`, `callTool()`, etc.)
- ✅ SDK handles SSE connection, endpoint extraction, and request routing
- ✅ SessionId management is completely transparent

### Testing Implications

For our test suite, we should:

**Option A: Use Official SDK** (RECOMMENDED)
```kotlin
testApplication {
    val client = Client(Implementation("test", "1.0.0"))
    val transport = SSEClientTransport("http://localhost:8080/mcp")
    client.connect(transport)

    // Test high-level operations
    val tools = client.listTools()
    val result = client.callTool("tool-name", args)
}
```

**Option B: Manual Testing** (if SDK doesn't work)
- Still use SDK's pattern: listen for "endpoint" event
- Extract complete URL from event data
- POST to that URL for subsequent requests

---

## 9. Source References

### Official Documentation
- [MCP Transports Documentation](https://modelcontextprotocol.io/docs/concepts/transports)
- [MCP Kotlin SDK Repository](https://github.com/modelcontextprotocol/kotlin-sdk)
- [MCP Kotlin SDK Documentation](https://modelcontextprotocol.github.io/kotlin-sdk/)

### Source Code Files
- **Kotlin SDK:** `kotlin-sdk-client/src/commonMain/kotlin/io/modelcontextprotocol/kotlin/sdk/client/SSEClientTransport.kt`
- **TypeScript SDK:** `src/client/sse.ts` (reference implementation)

### Issue Tracker
- Issue #41: SSE endpoint URL processing
- Issue #83: Absolute URI handling
- Issue #84: Complex URL support
- TypeScript Issue #401: SessionId property undefined
- TypeScript Issue #510: Lifecycle state on reconnect

### Technical Articles
- "MCP Server and Client with SSE & The New Streamable HTTP" - Itsuki
- "Understanding SSE Protocol of MCP Server & Client" - DEV Community
- "How to MCP - Complete Guide" - Simplescraper Blog

---

## 10. Recommendations

### For SPI-700 Testing

**RECOMMENDED APPROACH:**

Use the official Kotlin SDK client as-is:

```kotlin
dependencies {
    testImplementation("io.modelcontextprotocol:kotlin-sdk:0.7.2")
    testImplementation("io.ktor:ktor-client-cio:3.2.3")
}

// In test
@Test
fun `test SSE connection to CycleTime server`() = runTest {
    testApplication {
        application {
            module() // Our server
        }

        val client = Client(Implementation("test-client", "1.0.0"))
        val transport = SSEClientTransport("http://localhost:8080/mcp")

        client.connect(transport)

        val tools = client.listTools()
        tools.tools shouldContainAll listOf("get_current_session", "...")

        val result = client.callTool("get_current_session", emptyMap())
        result.content shouldNotBe null
    }
}
```

### Benefits

1. ✅ **No manual sessionId extraction** - SDK handles it
2. ✅ **Protocol compliance** - Uses official MCP client
3. ✅ **Future-proof** - Follows SDK updates automatically
4. ✅ **Clean test code** - High-level API, minimal boilerplate

### Alternative if SDK Issues

If SDK integration proves difficult:
1. Use Ktor client directly to connect to SSE endpoint
2. Listen for "endpoint" event manually
3. Extract URL from event data (includes sessionId)
4. POST JSON-RPC to that URL

---

## Conclusion

The MCP Kotlin SDK v0.7.2 provides a complete SSE client implementation following the standard MCP protocol. **SessionId extraction is handled automatically** by listening for the "endpoint" SSE event and storing the complete endpoint URL (which includes sessionId as a query parameter).

**No manual sessionId extraction required** - the SDK abstracts this complexity entirely.

For our testing purposes, we should use the SDK's `SSEClientTransport` directly, which handles all protocol details automatically.
