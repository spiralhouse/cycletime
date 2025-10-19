# MCP MVP Implementation Plan - 1-Day Spike

> **Historical Note**: This document describes the WebSocket-based MCP implementation that was superseded by SSE (Server-Sent Events) transport in SPI-665 (October 2025). CycleTime now uses SSE transport following MCP specification v2024-11-05. For current implementation details, see [MCP Client Setup](../../getting-started/mcp-client-setup.md) and [MCP Integration Patterns](mcp-integration-patterns.md).

## Executive Summary

**Critical Discovery**: MCP is not optional infrastructure but THE PRIMARY USER INTERFACE for CycleTime. 90% of user interactions will be through Claude Code via MCP, not the web dashboard.

**Current State**: 
- Core application: 97.3% ready (406/430 tests passing)
- MCP implementation: 5.7% complete (2/35 tests passing)
- Blocker: MCP is preventing Claude Code integration

**Goal**: Deliver Minimum Viable MCP in 1 day that allows Claude Code to connect and perform basic operations.

## Architecture Assessment

### What We Have (Mostly Empty Shells)
1. **WebSocket Handler** (`MCPWebSocketHandler.kt`) - EXISTS but needs wiring
2. **Protocol Handler** (`JsonRpcProtocolHandler.kt`) - EXISTS but incomplete
3. **Connection Manager** (`MCPConnectionManager.kt`) - EXISTS
4. **Integration Service** (`MCPIntegrationService.kt`) - EXISTS with monitoring
5. **78 MCP files** - Most are empty shells or interfaces

### Critical Issues Found
1. **Namespace Mismatch**: Design doc uses `io.spiralhouse.cycletime`, code uses `io.spiralhouse.cycletime`
2. **Missing Implementation**: JSON-RPC methods not wired to actual handlers
3. **No Resources/Tools**: Empty provider registries
4. **Health Check**: Missing "mcp" key in health response

## MVP Feature Set (Day 1 - What Works)

### Absolute Minimum for Claude Code Connection

**Phase 1: Protocol Handshake (Hours 1-3)**
- ✅ WebSocket connection at `/mcp`
- ✅ JSON-RPC 2.0 initialize method
- ✅ Basic error handling
- ✅ Connection tracking

**Phase 2: One Resource (Hours 4-6)**
- ✅ ProjectResource with list/read capability
- ✅ Return actual project data from database
- ✅ Resource URIs: `cycletime://projects`, `cycletime://project/{id}`

**Phase 3: One Tool (Hours 7-8)**
- ✅ CreateProjectTool
- ✅ Execute creates real project in database
- ✅ Returns success with project ID

### What Gets Deferred to Phase 2
- ❌ All other resources (Issues, Workflows, Contexts)
- ❌ All other tools (UpdateProject, CreateIssue, etc.)
- ❌ Prompts (nice-to-have)
- ❌ Performance optimizations
- ❌ Caching layer
- ❌ Advanced error recovery

## Implementation Plan - Hour by Hour

### Hour 1-2: Fix Critical Infrastructure
```kotlin
// 1. Fix health endpoint to include MCP status
get("/health") {
    call.respond(mapOf(
        "status" to "healthy",
        "mcp" to mapOf(
            "status" to "ready",
            "websocket" to "/mcp"
        )
    ))
}

// 2. Wire WebSocket route in Application.kt
webSocket("/mcp") {
    mcpWebSocketHandler.handleConnection(this)
}
```

### Hour 3-4: Implement Initialize Handler
```kotlin
// Minimal initialize handler
class InitializeMethodHandler : McpMethodHandler {
    override fun canHandle(method: String) = method == "initialize"
    
    override suspend fun handle(request: JsonRpcRequest): JsonRpcResponse {
        return JsonRpcResponse(
            id = request.id,
            result = buildJsonObject {
                put("protocolVersion", "1.0")
                put("serverInfo", buildJsonObject {
                    put("name", "CycleTime MCP")
                    put("version", "0.1.0-mvp")
                })
                put("capabilities", buildJsonObject {
                    put("resources", buildJsonObject { put("list", true) })
                    put("tools", buildJsonObject { put("call", true) })
                })
            }
        )
    }
}
```

### Hour 5-6: Implement ProjectResource
```kotlin
class ProjectResourceProvider(
    private val projectService: ProjectApplicationService
) : ResourceProvider {
    
    override suspend fun list(): List<ResourceDescriptor> {
        return listOf(
            ResourceDescriptor(
                uri = "cycletime://projects",
                name = "All Projects",
                description = "List all projects"
            )
        )
    }
    
    override suspend fun read(uri: String): ResourceContent {
        if (uri == "cycletime://projects") {
            val projects = projectService.listProjects()
            return ResourceContent(
                uri = uri,
                mimeType = "application/json",
                content = Json.encodeToString(projects)
            )
        }
        throw ResourceNotFoundException(uri)
    }
}
```

### Hour 7: Implement CreateProjectTool
```kotlin
class CreateProjectToolProvider(
    private val projectService: ProjectApplicationService
) : ToolProvider {
    
    override val name = "cycletime_create_project"
    
    override val schema = buildJsonObject {
        put("type", "object")
        put("properties", buildJsonObject {
            put("name", buildJsonObject {
                put("type", "string")
                put("description", "Project name")
            })
        })
        put("required", buildJsonArray { add("name") })
    }
    
    override suspend fun execute(args: JsonObject): JsonObject {
        val name = args["name"]?.jsonPrimitive?.content 
            ?: throw IllegalArgumentException("name required")
        
        val project = projectService.createProject(
            CreateProjectCommand(name, "Created via MCP")
        )
        
        return buildJsonObject {
            put("success", true)
            put("projectId", project.id.value)
        }
    }
}
```

### Hour 8: Integration Testing & Debugging
1. Start server with WebSocket endpoint
2. Test with WebSocket client
3. Verify initialize handshake
4. Test resource list/read
5. Test tool execution
6. Fix any critical bugs

## Success Criteria

### Must Have (Day 1)
- [ ] Claude Code can connect via WebSocket
- [ ] Initialize handshake completes successfully
- [ ] Can list projects via resources/list
- [ ] Can create project via tools/call
- [ ] Health endpoint shows MCP status

### Nice to Have (If Time Permits)
- [ ] Get single project by ID
- [ ] Update project status
- [ ] Basic error messages

### Explicitly Deferred
- Issue management
- Workflow orchestration
- Complex queries
- Performance optimization
- Comprehensive error handling

## Testing Strategy

### Manual Testing Script
```bash
# 1. Check health
curl http://localhost:8080/health | jq .

# 2. Test WebSocket with wscat
npm install -g wscat
wscat -c ws://localhost:8080/mcp

# 3. Send initialize
{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"1.0"},"id":1}

# 4. List resources
{"jsonrpc":"2.0","method":"resources/list","id":2}

# 5. Read projects
{"jsonrpc":"2.0","method":"resources/read","params":{"uri":"cycletime://projects"},"id":3}

# 6. Create project
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"cycletime_create_project","arguments":{"name":"Test Project"}},"id":4}
```

## Risk Mitigation

### High Risk Areas
1. **WebSocket stability** - Use Ktor's built-in WebSocket support
2. **JSON parsing errors** - Wrap all parsing in try-catch
3. **Database connection** - Reuse existing working services
4. **Protocol compliance** - Stick to minimal MCP 1.0 spec

### Fallback Plan
If full integration fails, implement mock responses that return static data but maintain protocol compliance. This allows Claude Code to connect while we fix the backend.

## Post-MVP Roadmap

### Phase 2 (Days 2-3)
- Add IssueResource and CreateIssueTool
- Implement UpdateProject and UpdateIssue tools
- Add basic workflow state resource

### Phase 3 (Days 4-5)
- Full resource tree navigation
- All CRUD tools
- Error handling improvements
- Performance optimization

### Phase 4 (Week 2)
- Prompts implementation
- Caching layer
- WebSocket reconnection
- Comprehensive testing

## Conclusion

This MVP focuses on the absolute minimum to unblock Claude Code integration. By implementing just one resource and one tool end-to-end, we prove the architecture works and provide immediate value. The pragmatic approach acknowledges that having something working today is better than something perfect next week.

**Key Insight**: MCP is not a nice-to-have feature - it IS the user interface. This 1-day spike unblocks the entire product.