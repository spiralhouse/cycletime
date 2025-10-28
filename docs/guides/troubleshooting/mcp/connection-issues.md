---
title: "MCP Connection Troubleshooting"
type: guide
domain: [mcp, troubleshooting, connection]
description: "Solutions for MCP connection failures, Streamable HTTP issues, and timeouts"
dependencies: [overview.md]
related: [protocol-validation-issues.md, protocol-discovery-issues.md, performance-issues.md]
keywords: [mcp, connection, streamable-http, timeout, troubleshooting, refused]
estimated_time: 20 minutes
difficulty: beginner
last_updated: 2025-10-27
---

# MCP Connection Troubleshooting

Solutions for establishing and maintaining connections to the MCP server.

## Issue Categories

This guide covers three common connection issues:
1. [Connection Refused](#issue-1-connection-refused) - Server not reachable
2. [Streamable HTTP Connection Failed](#issue-2-streamable-http-connection-failed) - HTTP transport connection errors
3. [Connection Timeout](#issue-3-connection-timeout) - Connection hangs and times out

---

## Issue 1: Connection Refused

### Symptoms

```bash
$ curl http://localhost:8080/mcp
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

## Issue 2: Streamable HTTP Connection Failed

> [!NOTE]
> **Migration from SSE**: As of SPI-763 (October 2025), CycleTime uses Streamable HTTP transport instead of SSE. Claude Code v2.0.25+ required.

### Symptoms

```bash
$ curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
curl: (52) Empty reply from server
```

```bash
$ curl http://localhost:8080/
<!DOCTYPE html><html>404 Not Found</html>
```

**Observable Behavior**:
- HTTP 404/406 errors when connecting to MCP endpoint
- "Empty reply from server" errors
- Wrong Content-Type response (HTML instead of JSON)
- Connection closes immediately after attempt

### Root Causes

1. **Incorrect endpoint path**
   - Using root path `/` instead of `/mcp`
   - Missing `/mcp` in MCP server URL
   - Wrong host or port

2. **Missing or incorrect headers**
   - Missing `Content-Type: application/json` header
   - Wrong Accept header
   - Invalid JSON-RPC request format

3. **Client configuration issues**
   - Claude Code using wrong transport type
   - Configuration specifies `"transport": "sse"` instead of `"type": "http"`
   - Outdated Claude Code version (<2.0.25)

### Step-by-Step Solutions

**Solution 1: Verify correct endpoint path**

```bash
# ✅ CORRECT - MCP endpoint
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# ❌ WRONG - Root path (404 Not Found)
curl http://localhost:8080/

# ❌ WRONG - Missing /mcp path
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

**Solution 2: Verify Claude Code configuration**

Check your MCP server configuration in Claude Code settings:

```json
{
  "mcpServers": {
    "cycletime": {
      "type": "http",
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

**Common configuration errors**:

```json
// ❌ WRONG - Old SSE transport (deprecated)
{
  "type": "sse",
  "url": "http://localhost:8080/mcp/events"
}

// ❌ WRONG - Missing /mcp in URL
{
  "type": "http",
  "url": "http://localhost:8080"
}

// ❌ WRONG - Wrong protocol for local
{
  "type": "http",
  "url": "https://localhost:8080/mcp"
}
```

**Solution 3: Verify Claude Code version**

```bash
# Check Claude Code version (requires 2.0.25+)
claude --version

# Update if needed
# Follow Claude Code update instructions for your platform
```

**Solution 4: Test with curl**

```bash
# Initialize connection
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    }
  }'

# Expected response:
# {
#   "jsonrpc": "2.0",
#   "id": 1,
#   "result": {
#     "protocolVersion": "2024-11-05",
#     "capabilities": {...},
#     "serverInfo": {"name": "CycleTime CE MCP Server", "version": "0.1.0"}
#   }
# }
```

### Prevention Tips

- **Document MCP endpoint URL**: Include in setup documentation
  ```
  Local: http://localhost:8080/mcp
  Production: https://api.example.com/mcp
  ```

- **Validate Claude Code configuration**: Check settings before connecting
  ```json
  {
    "mcpServers": {
      "cycletime": {
        "type": "http",
        "url": "http://localhost:8080/mcp"
      }
    }
  }
  ```

- **Verify Claude Code version**: Ensure 2.0.25 or higher
  ```bash
  claude --version
  ```

- **Health check before connecting**: Test endpoint availability
  ```bash
  # Quick health check
  curl -f http://localhost:8080/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
    || echo "MCP server not ready"
  ```

### Related Configuration

- Claude Code MCP server settings (JSON configuration file)
- `MCPConfiguration.kt` - Server-side MCP configuration
- Environment: `MCP_ENABLED`, `MCP_HOST`, `MCP_PORT`

---

## Issue 3: Connection Timeout

### Symptoms

```bash
$ curl -X POST --max-time 15 http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
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

# Then test MCP endpoint
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

**Solution 2: Increase client timeout**

```bash
# Increase timeout with curl
curl -X POST --max-time 30 http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

```kotlin
// Example with Ktor HTTP client
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

**Solution 4: Test HTTP endpoint with health check**

```bash
# Quick health check before MCP initialization
curl -f http://localhost:8080/mcp \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  || echo "Server not ready"

# Retry with backoff
for i in {1..10}; do
  curl -f http://localhost:8080/mcp \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
    && break
  echo "Attempt $i failed, retrying..."
  sleep 2
done
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
  // Ktor HTTP client timeout configuration
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

  suspend fun connectMcpWithRetry(
      client: HttpClient,
      url: String,
      maxRetries: Int = 5
  ): HttpResponse {
      repeat(maxRetries) { attempt ->
          try {
              return client.post(url) {
                  header("Content-Type", "application/json")
                  setBody("""{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}""")
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

- `MCPConfiguration.kt` - MCP server configuration
- `MCPConfiguration.kt` - Connection timeout settings
- Environment: `MCP_TIMEOUT`, `MCP_REQUEST_TIMEOUT`

---

## Related Guides

- [MCP Troubleshooting Overview](./overview.md) - Quick reference to all issues
- [Protocol Validation](./protocol-validation-issues.md) - JSON-RPC format and validation errors
- [Protocol Discovery](./protocol-discovery-issues.md) - Tool and resource discovery errors
- [Performance Troubleshooting](./performance-issues.md) - Slow responses and timeouts
- [Configuration Troubleshooting](./configuration-issues.md) - MCP configuration issues

## See Also

- [MCP Development Guide](../../development/mcp-development.md) - Development workflows
- [MCP Architecture](../../../architecture/overview.md#mcp-server-integration) - System architecture
