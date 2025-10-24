---
title: "MCP Protocol Discovery Issues"
type: guide
domain: [troubleshooting, mcp, protocol]
description: "Troubleshooting guide for MCP tool and resource discovery problems"
dependencies: [../../concepts/mcp/mcp-protocol-concepts.md]
related: [protocol-validation-issues.md, overview.md, diagnostics-tools.md, error-codes.md]
keywords: [mcp, protocol, troubleshooting, tools, resources, discovery, naming, uri]
estimated_time: 20 minutes
difficulty: intermediate
last_updated: 2025-10-20
---

# MCP Protocol Discovery Issues

Solutions for tool and resource discovery problems, naming issues, and URI validation errors.

## Overview

This guide addresses tool and resource discovery issues in the MCP server. These issues occur when tools or resources can't be found due to naming mismatches, URI format errors, or registration problems.

**Common discovery issues covered:**
- [Tool Not Found](#issue-tool-not-found) - Tool discovery and naming issues
- [Resource Not Found](#issue-resource-not-found) - Resource URI and discovery issues
- Tool/resource naming conventions
- URI format validation

**For JSON-RPC protocol validation issues**, see [Protocol Validation Issues](./protocol-validation-issues.md).

---

## Issue: Tool Not Found

### Symptoms

```bash
> {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"createProject"}}

< {
    "jsonrpc": "2.0",
    "error": {
      "code": -32601,
      "message": "Tool not found: createProject"
    },
    "id": 1
  }
```

**Observable Behavior**:
- Server returns `-32601` error code (Method/Tool not found)
- Tool call fails but connection remains open
- Available tools not matching requested name

### Root Causes

1. **Tool name mismatch**
   - Using camelCase instead of snake_case
   - Typos in tool name
   - Wrong naming convention

2. **Tool not registered**
   - Tool provider not initialized
   - Configuration missing tool registration
   - Development-only tool not available

3. **Wrong tool method**
   - Using `tools/call` instead of correct method
   - Method name not properly formatted

### Step-by-Step Solutions

**Solution 1: List available tools**

```bash
# Terminal 1: Open SSE stream to receive responses
curl -N http://localhost:8080/mcp/events

# Terminal 2: Send tools/list request via POST
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Response shows available tools (received in Terminal 1 via SSE)
{
    "jsonrpc": "2.0",
    "result": {
      "tools": [
        {
          "name": "create_project",
          "description": "Create a new project",
          "inputSchema": {...}
        },
        {
          "name": "get_project",
          "description": "Get project by ID",
          "inputSchema": {...}
        },
        {
          "name": "list_projects",
          "description": "List all projects",
          "inputSchema": {...}
        },
        {
          "name": "update_project",
          "description": "Update project",
          "inputSchema": {...}
        }
      ]
    },
    "id": 1
  }
```

**Solution 2: Use correct tool names**

```bash
# ✅ CORRECT - snake_case naming
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"create_project","arguments":{"name":"Test"}}}'

# ❌ WRONG - camelCase naming
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"createProject","arguments":{"name":"Test"}}}'

# ❌ WRONG - kebab-case naming
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"create-project","arguments":{"name":"Test"}}}'
```

**Solution 3: Verify tool provider configuration**

```bash
# Check application logs for tool registration
./gradlew run | grep -i "tool"

# Expected output:
# Registering tool provider: DefaultProjectToolProvider
# Registered 4 tools: create_project, get_project, list_projects, update_project

# If tools not registered, check configuration
cat src/main/kotlin/io/spiralhouse/cycletime/mcp/MCPModule.kt
```

**Solution 4: Test tool with correct parameters**

```bash
# Get tool schema first via POST
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Check inputSchema for required parameters in SSE response
# Then call with correct parameters

curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"create_project",
      "arguments":{
        "name":"My Project",
        "description":"Test project",
        "startDate":"2024-01-01"
      }
    }
  }'
```

### Prevention Tips

- **Document tool naming conventions**: Use snake_case consistently
  ```
  Tool Naming: snake_case (create_project, list_issues)
  Method Naming: namespace/action (tools/call, resources/read)
  ```

- **Tool discovery on connect**: List tools after connection
  ```kotlin
  import kotlinx.serialization.json.*
  import io.ktor.client.*
  import io.ktor.client.request.*
  import io.ktor.client.statement.*

  // Discover available tools
  @Serializable
  data class ToolInfo(val name: String, val description: String)

  @Serializable
  data class ToolsResult(val tools: List<ToolInfo>)

  suspend fun discoverTools(client: HttpClient, postUrl: String): List<String> {
      val request = createJsonRpcRequest("tools/list", JsonObject(emptyMap()), id = 1)

      val httpResponse: HttpResponse = client.post(postUrl) {
          header("Content-Type", "application/json")
          setBody(request)
      }

      val responseText = httpResponse.bodyAsText()
      val response = Json.decodeFromString<JsonRpcResponse>(responseText)
      val toolsResult = Json.decodeFromJsonElement<ToolsResult>(response.resultOrThrow())

      val toolNames = toolsResult.tools.map { it.name }
      println("Available tools: $toolNames")
      return toolNames
  }
  ```

- **Client-side tool validation**: Check tool exists before calling
  ```kotlin
  // Tool validation before calling
  import kotlinx.serialization.json.*
  import io.ktor.client.*
  import io.ktor.client.request.*
  import io.ktor.client.statement.*

  class ValidatedToolClient(private val client: HttpClient, private val postUrl: String) {
      private lateinit var availableTools: List<String>

      suspend fun initialize() {
          availableTools = discoverTools(client, postUrl)
      }

      suspend fun callTool(name: String, arguments: JsonObject): JsonElement {
          require(name in availableTools) {
              "Tool not found: $name. Available: ${availableTools.joinToString()}"
          }

          val params = buildJsonObject {
              put("name", name)
              put("arguments", arguments)
          }
          val request = createJsonRpcRequest("tools/call", params, id = 1)

          val httpResponse: HttpResponse = client.post(postUrl) {
              header("Content-Type", "application/json")
              setBody(request)
          }

          val responseText = httpResponse.bodyAsText()
          val response = Json.decodeFromString<JsonRpcResponse>(responseText)
          return response.resultOrThrow()
      }
  }
  ```

- **Generate tool clients**: Create type-safe tool wrappers
  ```kotlin
  // Type-safe tool client interface
  @Serializable
  data class CreateProjectArgs(val name: String, val description: String)

  @Serializable
  data class GetProjectArgs(val id: String)

  @Serializable
  data class Project(val id: String, val name: String, val description: String)

  interface ProjectTools {
      suspend fun createProject(args: CreateProjectArgs): Project
      suspend fun getProject(args: GetProjectArgs): Project
      suspend fun listProjects(): List<Project>
      suspend fun updateProject(id: String, args: CreateProjectArgs): Project
  }
  ```

### Related Configuration

- `DefaultProjectToolProvider.kt` - Project tool definitions
- `ToolRegistry.kt` - Tool registration logic
- No environment configuration required

---

## Issue: Resource Not Found

### Symptoms

```bash
> {"jsonrpc":"2.0","id":1,"method":"resources/read","params":{"uri":"cycletime://project/123"}}

< {
    "jsonrpc": "2.0",
    "error": {
      "code": -32602,
      "message": "Resource not found: cycletime://project/123"
    },
    "id": 1
  }
```

**Observable Behavior**:
- Server returns `-32602` error code (Invalid params)
- Resource URI not recognized
- Resource exists but URI format incorrect

### Root Causes

1. **Invalid URI format**
   - Wrong protocol (http:// instead of cycletime://)
   - Incorrect path structure
   - Trailing slashes on ID resources
   - Missing required path segments

2. **Resource doesn't exist**
   - Referencing non-existent resource ID
   - Resource deleted or not yet created
   - Wrong resource type

3. **Resource provider not registered**
   - Provider initialization failed
   - Configuration missing provider
   - Development-only resource

### Step-by-Step Solutions

**Solution 1: List available resources**

```bash
# Terminal 1: Open SSE stream to receive responses
curl -N http://localhost:8080/mcp/events

# Terminal 2: Send resources/list request via POST
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"resources/list","params":{}}'

# Response shows available resource templates (received in Terminal 1 via SSE)
{
    "jsonrpc": "2.0",
    "result": {
      "resources": [
        {
          "uri": "cycletime://projects",
          "name": "Project List",
          "description": "List of all projects",
          "mimeType": "application/json"
        },
        {
          "uri": "cycletime://projects/{id}",
          "name": "Project",
          "description": "Individual project details",
          "mimeType": "application/json"
        },
        {
          "uri": "cycletime://issues",
          "name": "Issue List",
          "description": "List of all issues",
          "mimeType": "application/json"
        },
        {
          "uri": "cycletime://sessions/active",
          "name": "Active Session",
          "description": "Current active session",
          "mimeType": "application/json"
        }
      ]
    },
    "id": 1
  }
```

**Solution 2: Use correct URI format**

```bash
# ✅ CORRECT - Valid resource URIs
cycletime://projects
cycletime://projects/proj_abc123
cycletime://issues
cycletime://issues/issue_xyz789
cycletime://sessions/active

# ❌ WRONG - Wrong protocol
http://localhost:8080/projects
projects

# ❌ WRONG - Trailing slash on ID resource
cycletime://projects/proj_abc123/

# ❌ WRONG - Wrong path structure
cycletime://project/123  # Should be "projects" plural
cycletime://projectList  # Should be "projects"
```

**Solution 3: Verify resource exists before reading**

```bash
# Step 1: List resources to find valid IDs (via POST)
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"resources/read","params":{"uri":"cycletime://projects"}}'

# Response (received via SSE):
{
    "jsonrpc": "2.0",
    "result": {
      "contents": [
        {
          "uri": "cycletime://projects",
          "mimeType": "application/json",
          "text": "[{\"id\":\"proj_abc123\",\"name\":\"Project A\"}]"
        }
      ]
    },
    "id": 1
  }

# Step 2: Read specific resource using valid ID
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"resources/read","params":{"uri":"cycletime://projects/proj_abc123"}}'
```

**Solution 4: Check resource provider registration**

```bash
# Check application logs for resource registration
./gradlew run | grep -i "resource"

# Expected output:
# Registering resource provider: DefaultProjectResourceProvider
# Registering resource provider: DefaultIssueResourceProvider
# Registering resource provider: DefaultSessionResourceProvider

# If resources not registered, check configuration
cat src/main/kotlin/io/spiralhouse/cycletime/mcp/MCPModule.kt
```

### Prevention Tips

- **Document URI patterns**: Maintain URI documentation
  ```markdown
  # Resource URI Patterns

  Collection resources (plural):
  - cycletime://projects
  - cycletime://issues
  - cycletime://workflows

  Individual resources (plural + ID):
  - cycletime://projects/{projectId}
  - cycletime://issues/{issueId}
  - cycletime://workflows/{workflowId}

  Special resources:
  - cycletime://sessions/active
  - cycletime://sessions/{sessionId}
  ```

- **URI validation**: Validate URIs client-side
  ```kotlin
  // Resource URI validation
  fun validateResourceUri(uri: String): String {
      val pattern = Regex("^cycletime://[a-z_]+(?:/[a-zA-Z0-9_-]+)?\$")
      require(pattern.matches(uri)) {
          "Invalid resource URI: $uri"
      }
      return uri
  }
  ```

- **Resource discovery**: List resources on startup
  ```kotlin
  import kotlinx.serialization.json.*
  import io.ktor.client.*
  import io.ktor.client.request.*
  import io.ktor.client.statement.*

  // Discover available resources
  @Serializable
  data class ResourceInfo(val uri: String, val name: String, val description: String, val mimeType: String)

  @Serializable
  data class ResourcesResult(val resources: List<ResourceInfo>)

  suspend fun discoverResources(client: HttpClient, postUrl: String): List<ResourceInfo> {
      val request = createJsonRpcRequest("resources/list", JsonObject(emptyMap()), id = 1)

      val httpResponse: HttpResponse = client.post(postUrl) {
          header("Content-Type", "application/json")
          setBody(request)
      }

      val responseText = httpResponse.bodyAsText()
      val response = Json.decodeFromString<JsonRpcResponse>(responseText)
      val resourcesResult = Json.decodeFromJsonElement<ResourcesResult>(response.resultOrThrow())

      println("Available resources: ${resourcesResult.resources.map { it.uri }}")
      return resourcesResult.resources
  }
  ```

- **Generate resource clients**: Create type-safe resource accessors
  ```kotlin
  // Type-safe resource client
  import kotlinx.serialization.json.*
  import io.ktor.client.*
  import io.ktor.client.request.*
  import io.ktor.client.statement.*

  @Serializable
  data class Session(val id: String, val projectId: String, val active: Boolean)

  class ResourceClient(private val client: HttpClient, private val postUrl: String) {
      suspend fun getProjects(): List<Project> {
          return read("cycletime://projects")
      }

      suspend fun getProject(id: String): Project {
          return read("cycletime://projects/$id")
      }

      suspend fun getActiveSession(): Session {
          return read("cycletime://sessions/active")
      }

      private suspend inline fun <reified T> read(uri: String): T {
          val params = buildJsonObject { put("uri", uri) }
          val request = createJsonRpcRequest("resources/read", params, id = 1)

          val httpResponse: HttpResponse = client.post(postUrl) {
              header("Content-Type", "application/json")
              setBody(request)
          }

          val responseText = httpResponse.bodyAsText()
          val response = Json.decodeFromString<JsonRpcResponse>(responseText)
          return Json.decodeFromJsonElement(response.resultOrThrow())
      }
  }
  ```

### Related Configuration

- `DefaultResourceProviders.kt` - Resource provider definitions
- `ResourceRegistry.kt` - Resource registration logic
- No environment configuration required

---

## Naming Conventions Reference

### Tool Naming Standards

**Convention**: Use `snake_case` for all tool names

```
✅ Correct Tool Names:
- create_project
- list_projects
- get_project
- update_project
- delete_project
- list_issues
- get_issue

❌ Incorrect Tool Names:
- createProject (camelCase)
- create-project (kebab-case)
- CreateProject (PascalCase)
```

### Resource URI Standards

**Convention**: Use `cycletime://` protocol with plural nouns

```
✅ Correct Resource URIs:
- cycletime://projects
- cycletime://projects/{id}
- cycletime://issues
- cycletime://issues/{id}
- cycletime://workflows
- cycletime://sessions/active

❌ Incorrect Resource URIs:
- http://localhost:8080/projects (wrong protocol)
- cycletime://project/123 (singular noun)
- cycletime://projects/123/ (trailing slash)
- projects (missing protocol)
```

## Testing Discovery

**Test tool discovery workflow**:

```bash
# 1. List all available tools
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# 2. Call a specific tool by name
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"create_project","arguments":{"name":"Test"}}}'

# 3. Verify tool not found error for invalid name
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"invalid_tool","arguments":{}}}'
# Expected: Error -32601
```

**Test resource discovery workflow**:

```bash
# 1. List all available resources
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"resources/list","params":{}}'

# 2. Read a collection resource
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"resources/read","params":{"uri":"cycletime://projects"}}'

# 3. Verify resource not found error for invalid URI
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"resources/read","params":{"uri":"cycletime://invalid/123"}}'
# Expected: Error -32602
```

## Related Guides

- [Protocol Validation Issues](./protocol-validation-issues.md) - JSON-RPC format and validation errors
- [MCP Troubleshooting Overview](./overview.md) - Quick reference to all issues
- [Connection Troubleshooting](./connection-issues.md) - Connection and SSE issues
- [Performance Troubleshooting](./performance-issues.md) - Slow responses and timeouts
- [Error Codes Reference](./error-codes.md) - Complete error code documentation

## See Also

- [MCP Development Guide](../../development/mcp-development.md) - Development workflows
- [MCP Architecture](../../../architecture/overview.md#mcp-server-integration) - System architecture
- [MCP Protocol Concepts](../../concepts/mcp/mcp-protocol-concepts.md) - Protocol fundamentals
- [JSON-RPC Pattern](../../../patterns/mcp/json-rpc-pattern.md) - Implementation patterns
