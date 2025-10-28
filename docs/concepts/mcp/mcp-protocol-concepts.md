---
title: "MCP Protocol Concepts"
type: concept
domain: [mcp, protocol, architecture]
description: "Core concepts of Model Context Protocol for Claude Code integration"
dependencies: []
related: [sse-transport-pattern.md, json-rpc-pattern.md, session-integration-pattern.md]
keywords: [mcp, protocol, resources, tools, prompts, sse, json-rpc, claude-code]
audience: [developers, architects]
last_updated: 2025-10-19
---

# MCP Protocol Concepts

## What is Model Context Protocol (MCP)?

Model Context Protocol (MCP) is an open protocol that enables seamless integration between AI assistants and development tools. MCP provides a standardized way for AI systems like Claude Code to access project data, execute operations, and interact with development workflows.

### Why MCP for CycleTime?

CycleTime uses MCP to expose project orchestration capabilities to Claude Code:

- **Structured Access**: Claude Code can query projects, issues, and workflows through standardized resources
- **Tool Execution**: Claude Code can create, update, and manage project entities through MCP tools
- **Workflow Integration**: Predefined prompts guide Claude Code through common development workflows
- **Session Continuity**: MCP maintains session state across Claude Code interactions

## Core Concepts

MCP is built on three fundamental primitives that enable AI-tool integration:

### Resources

**Resources** are read-only data exposed to Claude Code. They represent the current state of project data.

**Characteristics**:
- Read-only (no mutations)
- URI-based addressing (e.g., `cycletime://projects/{id}`)
- JSON representation
- Collection and individual resource patterns

**Examples in CycleTime**:
- `cycletime://projects` - List of all projects
- `cycletime://projects/{id}` - Individual project details
- `cycletime://issues` - List of all issues
- `cycletime://sessions/active` - Current active session

**Use Cases**:
- Querying current project state
- Reading issue details
- Accessing workflow configurations
- Retrieving session context

### Tools

**Tools** are executable functions Claude Code can invoke to perform operations. They represent actions that modify project state.

**Characteristics**:
- Execute operations (create, update, delete)
- Input schema validation
- Synchronous execution with result returns
- Idempotent where possible

**Examples in CycleTime**:
- `create_project` - Create a new project
- `update_issue` - Update issue properties
- `transition_workflow` - Move issue through workflow
- `create_session` - Start new development session

**Use Cases**:
- Creating new project entities
- Updating existing data
- Executing workflow transitions
- Managing development sessions

### Prompts

**Prompts** are pre-configured prompt templates for common workflows. They guide Claude Code through multi-step processes.

**Characteristics**:
- Reusable templates
- Parameter placeholders
- Context-aware
- Workflow orchestration

**Examples in CycleTime**:
- `start_feature` - Initialize new feature development
- `fix_bug` - Systematic bug resolution workflow
- `code_review` - Code review checklist and process
- `release_workflow` - Release preparation steps

**Use Cases**:
- Standardizing development workflows
- Guiding complex multi-step processes
- Ensuring consistency across sessions
- Reducing cognitive load

## MCP Protocol Architecture

### Streamable HTTP Transport Model

MCP uses Streamable HTTP transport with a single unified endpoint:

```mermaid
graph TD
    subgraph "Claude Code (Client)"
        CC[Claude Code]
    end

    subgraph "CycleTime MCP Server"
        Endpoint[Streamable HTTP Endpoint<br/>/mcp<br/>POST + GET]
        Handler[StreamableHttpHandler]
        Resources[Resources]
        Tools[Tools]
    end

    CC -->|"POST /mcp<br/>JSON-RPC Request"| Endpoint
    Endpoint --> Handler
    Handler -->|"Parse & Route"| Resources
    Handler -->|"Parse & Route"| Tools
    Handler -->|"JSON or SSE Response"| CC
    CC -->|"GET /mcp<br/>(Optional: Server Messages)"| Endpoint
```

#### Streamable HTTP Transport

**Purpose**: Unified client-server communication

**How it works**:
1. Client sends HTTP POST to `/mcp` with JSON-RPC request
2. Server processes request and chooses response type:
   - **JSON**: Single response for fast request/response
   - **SSE**: Streaming response for notifications (optional)
3. Client can open GET `/mcp` for server-initiated messages

**Key Features**:
- Single endpoint for all communication
- Server chooses optimal response format
- Serverless-friendly (can be stateless)
- Load balancer compatible
- Required protocol version header: `MCP-Protocol-Version: 2025-06-18`

**Used for**:
- Client-initiated requests (tools/list, resources/read, etc.)
- Tool execution commands
- Resource queries
- Protocol initialization
- Server-initiated notifications (via GET endpoint)

### Protocol Flow

Complete lifecycle of an MCP interaction:

```mermaid
sequenceDiagram
    participant Client as Claude Code
    participant Endpoint as /mcp Endpoint
    participant Handler as StreamableHttpHandler
    participant Server as MCP Server

    Note over Client,Server: Phase 1: Initialization
    Client->>Endpoint: POST /mcp<br/>MCP-Protocol-Version: 2025-06-18<br/>{"method":"initialize",...}
    Endpoint->>Handler: Route request
    Handler->>Server: Process initialize
    Server-->>Handler: Initialize result
    Handler-->>Client: 200 OK<br/>Content-Type: application/json<br/>{"jsonrpc":"2.0","id":1,"result":{...}}

    Note over Client,Server: Phase 2: Resource Discovery
    Client->>Endpoint: POST /mcp<br/>{"method":"resources/list"}
    Endpoint->>Handler: Route request
    Handler->>Server: Query resources
    Server-->>Handler: Resources list
    Handler-->>Client: 200 OK<br/>{"resources":[...]}

    Note over Client,Server: Phase 3: Tool Execution
    Client->>Endpoint: POST /mcp<br/>{"method":"tools/call",...}
    Endpoint->>Handler: Route request
    Handler->>Server: Execute tool
    Server-->>Handler: Tool result
    Handler-->>Client: 200 OK<br/>{"result":{...}}

    Note over Client,Server: Optional: Server Messages
    Client->>Endpoint: GET /mcp<br/>Mcp-Session-Id: abc-123
    Endpoint->>Handler: Open SSE stream
    Handler-->>Client: 200 OK<br/>Content-Type: text/event-stream<br/>(Server-initiated messages)
```

### JSON-RPC 2.0 Message Format

MCP uses JSON-RPC 2.0 for all client-server communication:

**Request Format**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_project",
    "arguments": {
      "name": "My Project",
      "description": "Project description"
    }
  }
}
```

**Response Format**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "id": "proj_abc123",
    "name": "My Project",
    "created": "2025-10-19T10:00:00Z"
  }
}
```

**Error Format**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params: name is required"
  }
}
```

## Technology Stack

### Server-Side Dependencies

CycleTime MCP server implementation requires:

```kotlin
// build.gradle.kts
dependencies {
    // Ktor HTTP and routing support
    implementation("io.ktor:ktor-server-core:3.3.1")
    implementation("io.ktor:ktor-server-sse:3.3.1")  // Optional: for SSE responses
    implementation("io.ktor:ktor-server-content-negotiation:3.3.1")
    implementation("io.ktor:ktor-serialization-kotlinx-json:3.3.1")

    // MCP Kotlin SDK (official from Anthropic/JetBrains)
    implementation("io.modelcontextprotocol:kotlin-sdk:0.7.2")

    // Coroutines for async handling
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")

    // Serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.2")
}
```

### Client-Side (Claude Code)

Claude Code includes built-in MCP client support:
- Streamable HTTP connection management
- JSON-RPC request handling
- Resource and tool discovery
- Error recovery and reconnection

## MCP Capabilities

### Resource Capabilities

What Claude Code can do with resources:

- **List**: Enumerate available resources
- **Read**: Fetch resource content by URI
- **Subscribe**: Receive updates when resources change (future)
- **Template**: Discover resource URI patterns

### Tool Capabilities

What Claude Code can do with tools:

- **List**: Discover available tools and their schemas
- **Call**: Execute tools with validated arguments
- **Progress**: Receive progress updates for long-running tools (future)
- **Cancel**: Abort in-progress tool execution (future)

### Prompt Capabilities

What Claude Code can do with prompts:

- **List**: Enumerate available prompt templates
- **Get**: Retrieve prompt template with context
- **Execute**: Render prompt with provided parameters

## Session Model

### Stateless Per-Request

Each MCP request is stateless at the protocol level:
- No server-side session state in MCP layer
- Each request contains complete context
- Authentication/authorization per request

### Session Context from Database

Application-level sessions managed separately:
- Session data persisted in database
- Session ID extracted from request headers
- Resources and tools access session context
- Enables cross-session continuity

```mermaid
flowchart LR
    Request[MCP Request] --> Extract[Extract Session ID]
    Extract --> Query[Query Session DB]
    Query --> Context[Load Session Context]
    Context --> Execute[Execute Tool/Resource]
    Execute --> Response[MCP Response]
```

## Design Principles

### 1. Separation of Concerns

- **MCP Layer**: Protocol handling, message parsing, SSE management
- **Application Layer**: Business logic, session management, validation
- **Domain Layer**: Core project entities and rules
- **Infrastructure Layer**: Database, external integrations

### 2. Testability

- Interfaces for all MCP components (resources, tools, prompts)
- Dependency injection for external dependencies
- Mock-friendly design
- Protocol-level and integration testing

### 3. Extensibility

- New resources added by implementing `MCPResource` interface
- New tools added by implementing `MCPTool` interface
- Plugin architecture for domain-specific capabilities
- No core protocol changes required

### 4. Performance

- Async/await for non-blocking operations
- SSE for efficient streaming
- Resource caching where appropriate
- Database connection pooling

## MCP vs REST API

Understanding when to use MCP vs traditional REST:

| Aspect | MCP | REST API |
|--------|-----|----------|
| **Purpose** | AI assistant integration | General API access |
| **Transport** | SSE + POST (dual channel) | HTTP Request/Response |
| **Data Model** | Resources, Tools, Prompts | Endpoints with various semantics |
| **Discoverability** | Built-in (list resources/tools) | Requires documentation |
| **Client** | Claude Code, MCP-aware tools | Any HTTP client |
| **Session** | Database-backed continuity | Typically stateless |
| **Use Case** | AI-driven development workflows | Programmatic access, integrations |

**CycleTime provides both**:
- MCP server for Claude Code integration
- REST API for general programmatic access

## Next Steps

To implement MCP in CycleTime, explore these pattern documents:

1. **[Streamable HTTP Transport Pattern](../../patterns/mcp/streamable-http-transport-pattern.md)**
   - Implementing Streamable HTTP endpoints in Ktor
   - Custom transport handler design
   - Protocol version validation
   - Request/response lifecycle

2. **[JSON-RPC Pattern](../../patterns/mcp/json-rpc-pattern.md)**
   - Request/response handling
   - Error code mapping
   - Message validation

3. **[Session Integration Pattern](../../patterns/mcp/session-integration-pattern.md)**
   - Extracting session context from requests
   - Resource and tool implementation
   - Database integration

4. **[MCP Testing Pattern](../../patterns/mcp/mcp-testing-pattern.md)**
   - Testing Streamable HTTP connections
   - Mock MCP clients
   - Integration testing strategies

## References

- [MCP Official Specification](https://modelcontextprotocol.io/) - Complete protocol specification
- [MCP Kotlin SDK](https://github.com/modelcontextprotocol/kotlin-sdk) - Official Kotlin SDK
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification) - JSON-RPC protocol
- [Streamable HTTP Transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports/) - Transport specification

## Related Documentation

- [MCP Architecture Overview](../../architecture/overview.md#mcp-server-integration) - System architecture
- [MCP Troubleshooting](../../guides/troubleshooting/mcp/overview.md) - Common issues and solutions
- [MCP Development Guide](../../guides/development/mcp-development.md) - Development workflows
