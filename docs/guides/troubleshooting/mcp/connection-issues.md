---
title: "MCP Connection Troubleshooting"
type: guide
domain: [mcp, troubleshooting, connection]
description: "Solutions for MCP connection failures, SSE issues, and timeouts"
dependencies: [overview.md]
related: [protocol-issues.md, performance-issues.md]
keywords: [mcp, connection, sse, timeout, troubleshooting, refused]
estimated_time: 20 minutes
difficulty: beginner
last_updated: 2025-10-19
---

# MCP Connection Troubleshooting

Solutions for establishing and maintaining connections to the MCP server.

## Issue Categories

This guide covers three common connection issues:
1. [Connection Refused](#issue-1-connection-refused) - Server not reachable
2. [SSE Connection Failed](#issue-2-sse-connection-failed) - Server-Sent Events stream errors
3. [Connection Timeout](#issue-3-connection-timeout) - Connection hangs and times out

---

## Issue 1: Connection Refused

### Symptoms

```bash
$ curl http://localhost:8080/mcp
curl: (7) Failed to connect to localhost port 8080: Connection refused
```

```bash
$ curl -N -H "Accept: text/event-stream" http://localhost:8080/mcp/events
curl: (7) Failed to connect to localhost port 8080: Connection refused
```

**Observable Behavior**:
- MCP endpoint not accessible
- Connection attempts fail immediately
- No network activity on expected port

### Root Causes

1. **MCP server not running**
   - Application not started
   - Server crashed during startup
   - Build failed before server initialization

2. **Server started on different port**
   - Environment variable override
   - Configuration file mismatch
   - Port conflict forced alternative port

3. **MCP server disabled**
   - `MCP_ENABLED=false` in environment
   - Configuration explicitly disabled MCP

### Step-by-Step Solutions

**Solution 1: Start the MCP server**

```bash
# Navigate to project directory
cd /path/to/cycletime

# Start server with Gradle
./gradlew run

# Wait for startup confirmation
# Expected output: "Application started in X.XX seconds."
```

**Solution 2: Verify server is running and accessible**

```bash
# Check if server is running
curl http://localhost:8080/mcp

# Expected response:
# {
#   "name": "CycleTime CE MCP Server",
#   "version": "0.1.0",
#   "protocolVersion": "2024-11-05",
#   "capabilities": {...}
# }
```

**Solution 3: Check port availability**

```bash
# Check if port 8080 is in use
lsof -i :8080

# If another process is using port 8080:
# Option A: Kill the other process
kill -9 <PID>

# Option B: Use different port
MCP_PORT=3006 ./gradlew run
```

**Solution 4: Verify MCP is enabled**

```bash
# Check application logs for MCP configuration
./gradlew run | grep -i "mcp"

# Expected output:
# MCP Configuration loaded: enabled=true, host=0.0.0.0, port=8080

# Explicitly enable if needed
MCP_ENABLED=true ./gradlew run
```

### Prevention Tips

- **Health check before connecting**: Always verify server info endpoint first
  ```bash
  curl http://localhost:8080/mcp
  ```

- **Use consistent port configuration**: Document and standardize port usage
  ```bash
  # .env file
  MCP_PORT=8080
  ```

- **Monitor startup logs**: Check for MCP initialization messages
  ```bash
  ./gradlew run 2>&1 | tee server.log
  ```

- **Automated health checks**: Include in CI/CD pipelines
  ```bash
  #!/bin/bash
  ./gradlew run &
  sleep 5
  curl -f http://localhost:8080/mcp || exit 1
  ```

### Related Configuration

- `MCPConfiguration.kt:22` - MCP enabled flag
- `MCPConfiguration.kt:19-21` - Connection settings
- Environment: `MCP_ENABLED`, `MCP_HOST`, `MCP_PORT`

---

## Issue 2: SSE Connection Failed

### Symptoms

```bash
$ curl -N http://localhost:8080/mcp/events
curl: (52) Empty reply from server
```

```bash
$ curl -N https://localhost:8080/mcp/events
curl: (60) SSL certificate problem
```

**Observable Behavior**:
- HTTP 400/404 errors when connecting to SSE endpoint
- Connection closes immediately after attempt
- "Empty reply from server" errors
- SSL/TLS errors with `https://` protocol

### Root Causes

1. **Incorrect SSE endpoint URL**
   - Missing `/mcp/events` path
   - Wrong protocol (`https://` instead of `http://` for local)
   - Wrong host or port

2. **Server not configured for SSE**
   - HTTP endpoint exists but SSE stream not initialized
   - Path mismatch between client and server

3. **SSL/TLS configuration issues**
   - Using `https://` without SSL certificate
   - Certificate validation failures

### Step-by-Step Solutions

**Solution 1: Use correct SSE endpoint URL**

```bash
# ✅ CORRECT - Local development (SSE stream)
curl -N http://localhost:8080/mcp/events

# ❌ WRONG - Missing /events path
curl -N http://localhost:8080/mcp

# ❌ WRONG - Wrong protocol for local
curl -N https://localhost:8080/mcp/events

# ❌ WRONG - Wrong path
curl -N http://localhost:8080/ws
```

**Solution 2: Verify server info before SSE connection**

```bash
# Step 1: Check HTTP server info endpoint
curl http://localhost:8080/mcp

# Step 2: Verify capabilities include resources and tools
# Look for: "capabilities": {"resources": true, "tools": true}

# Step 3: Connect to SSE stream
curl -N http://localhost:8080/mcp/events
```

**Solution 3: Test with custom path configuration**

```bash
# Start server with custom SSE path
MCP_SSE_PATH=/custom/events ./gradlew run

# Connect using custom path
curl -N http://localhost:8080/custom/events

# Verify with HTTP endpoint (POST path may differ)
curl http://localhost:8080/mcp
```

**Solution 4: Debug SSE connection**

```bash
# Use curl with verbose output to see connection details
curl -i -N \
  -H "Accept: text/event-stream" \
  http://localhost:8080/mcp/events

# Expected response:
# HTTP/1.1 200 OK
# Content-Type: text/event-stream
# Cache-Control: no-cache
# Connection: keep-alive
```

### Prevention Tips

- **Document SSE endpoint URLs**: Include in API documentation
  ```
  Local SSE: http://localhost:8080/mcp/events
  Local POST: http://localhost:8080/mcp
  Production SSE: https://api.example.com/mcp/events
  Production POST: https://api.example.com/mcp
  ```

- **Consistent path configuration**: Use environment variables
  ```bash
  export MCP_SSE_PATH=/mcp/events
  export MCP_POST_PATH=/mcp
  ```

- **Client configuration validation**: Validate URLs before connection
  ```kotlin
  // Validate SSE endpoint URL
  import io.ktor.http.*

  fun validateMcpSseUrl(sseUrl: String) {
      val url = Url(sseUrl)
      require(url.protocol == URLProtocol.HTTP || url.protocol == URLProtocol.HTTPS) {
          "Invalid SSE protocol: ${url.protocol.name}"
      }
      require(url.encodedPath.contains("/events")) {
          "Invalid MCP SSE path: ${url.encodedPath} (must contain /events)"
      }
  }
  ```

- **Health check integration**: Test SSE connectivity in CI
  ```bash
  #!/bin/bash
  echo "Testing SSE connection..."
  timeout 5 curl -N -f http://localhost:8080/mcp/events || exit 1
  ```

### Related Configuration

- `MCPConfiguration.kt:21` - MCP SSE path setting
- `MCPConfiguration.kt:25-28` - SSE connection settings
- Environment: `MCP_SSE_PATH`, `MCP_POST_PATH`, `MCP_TIMEOUT`

---

## Issue 3: Connection Timeout

### Symptoms

```bash
$ curl -N --max-time 15 http://localhost:8080/mcp/events
curl: (28) Operation timed out after 15000 milliseconds
```

**Observable Behavior**:
- Connection attempts hang for extended period
- Eventually times out (default 15 seconds)
- Server may be starting up or under heavy load
- No error message, just timeout

### Root Causes

1. **Server still starting up**
   - Application initialization in progress
   - Database migrations running
   - Resource loading incomplete

2. **Timeout configuration too short**
   - Default 15s timeout insufficient
   - Network latency issues
   - Server performance degradation

3. **Server hanging or unresponsive**
   - Deadlock in initialization
   - Resource exhaustion
   - Database connection pool exhausted

### Step-by-Step Solutions

**Solution 1: Wait for complete server startup**

```bash
# Start server and watch for completion
./gradlew run

# Wait for this message before connecting:
# "Application started in X.XX seconds."
# "MCP server listening on 0.0.0.0:8080"

# Then connect to SSE stream
curl -N http://localhost:8080/mcp/events
```

**Solution 2: Increase client timeout**

```bash
# Increase timeout with curl
curl -N --max-time 30 http://localhost:8080/mcp/events
```

```kotlin
// Example with Ktor SSE client
import io.ktor.client.*
import io.ktor.client.engine.cio.*

val client = HttpClient(CIO) {
    engine {
        requestTimeout = 30_000  // 30 seconds
    }
}
```

**Solution 3: Increase server timeout configuration**

```bash
# Start server with longer timeout
MCP_TIMEOUT=30000 ./gradlew run

# Verify configuration loaded
# Look for: "MCP timeout: 30000ms"
```

**Solution 4: Test HTTP endpoint first**

```bash
# Quick health check before SSE connection
curl -f http://localhost:8080/mcp || echo "Server not ready"

# Retry with backoff
for i in {1..10}; do
  curl -f http://localhost:8080/mcp && break
  echo "Attempt $i failed, retrying..."
  sleep 2
done

# Then connect to SSE stream
curl -N http://localhost:8080/mcp/events
```

**Solution 5: Check server resource usage**

```bash
# Check if server is hanging
ps aux | grep gradle

# Check memory usage
free -h

# Check database connections
lsof -i :8080 | wc -l

# Restart if necessary
pkill -f gradle
./gradlew run
```

### Prevention Tips

- **Implement startup health checks**: Wait for ready state
  ```bash
  #!/bin/bash
  until curl -f http://localhost:8080/mcp; do
    echo "Waiting for server..."
    sleep 1
  done
  echo "Server ready!"
  ```

- **Configure appropriate timeouts**: Match server and client timeouts
  ```bash
  # Server
  MCP_TIMEOUT=30000
  ```

  ```kotlin
  // Ktor SSE client timeout configuration
  val client = HttpClient(CIO) {
      engine {
          requestTimeout = 30_000
      }
  }
  ```

- **Monitor startup performance**: Track initialization time
  ```bash
  time ./gradlew run
  ```

- **Use connection retry logic**: Implement exponential backoff
  ```kotlin
  import io.ktor.client.*
  import io.ktor.client.request.*
  import io.ktor.client.statement.*
  import kotlinx.coroutines.delay
  import kotlin.math.pow

  suspend fun connectSseWithRetry(
      client: HttpClient,
      url: String,
      maxRetries: Int = 5
  ): HttpResponse {
      repeat(maxRetries) { attempt ->
          try {
              return client.get(url) {
                  header("Accept", "text/event-stream")
              }
          } catch (e: Exception) {
              if (attempt == maxRetries - 1) throw e
              val backoffMs = 2.0.pow(attempt).toLong() * 1000
              delay(backoffMs)  // Exponential backoff
          }
      }
      error("Failed to connect after $maxRetries attempts")
  }
  ```

### Related Configuration

- `MCPConfiguration.kt:26` - SSE connection timeout
- `MCPConfiguration.kt:34` - Request timeout
- Environment: `MCP_TIMEOUT`, `MCP_REQUEST_TIMEOUT`

---

## Related Guides

- [MCP Troubleshooting Overview](./overview.md) - Quick reference to all issues
- [Protocol Troubleshooting](./protocol-issues.md) - JSON-RPC and tool/resource errors
- [Performance Troubleshooting](./performance-issues.md) - Slow responses and timeouts
- [Configuration Troubleshooting](./configuration-issues.md) - MCP configuration issues

## See Also

- [MCP Development Guide](../../development/mcp-development.md) - Development workflows
- [MCP Architecture](../../../architecture/overview.md#mcp-server-integration) - System architecture
