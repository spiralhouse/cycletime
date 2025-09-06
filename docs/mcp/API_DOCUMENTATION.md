# CycleTime MCP API Documentation

## Overview

The CycleTime Model Context Protocol (MCP) server provides a comprehensive API for managing projects, issues, sessions, and workflows through a WebSocket-based JSON-RPC 2.0 interface.

## Connection Details

- **Protocol**: WebSocket
- **Default Port**: 3006
- **Default Path**: `/mcp`
- **Protocol Version**: 2024-11-05

### Connection URL
```
ws://localhost:3006/mcp
```

## Authentication

Currently, the MCP server does not require authentication. Future versions will support token-based authentication.

## Protocol

All communication uses JSON-RPC 2.0 format over WebSocket.

### Request Format
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "project.create",
    "arguments": {
      "name": "My Project",
      "description": "Project description"
    }
  },
  "id": "unique-request-id"
}
```

### Response Format
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Project created successfully"
      }
    ]
  },
  "id": "unique-request-id"
}
```

## Available Tools

### Project Tools

#### project.create
Create a new CycleTime project.

**Parameters:**
- `name` (string, required): Project name
- `description` (string, optional): Project description

**Example:**
```json
{
  "name": "project.create",
  "arguments": {
    "name": "My New Project",
    "description": "A sample project"
  }
}
```

#### project.get
Get a project by ID.

**Parameters:**
- `id` (string, required): Project ID

**Example:**
```json
{
  "name": "project.get",
  "arguments": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### project.list
List all projects.

**Parameters:** None

**Example:**
```json
{
  "name": "project.list",
  "arguments": {}
}
```

#### project.update
Update an existing project.

**Parameters:**
- `id` (string, required): Project ID
- `name` (string, optional): New project name
- `description` (string, optional): New project description

**Example:**
```json
{
  "name": "project.update",
  "arguments": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Updated Project Name",
    "description": "Updated description"
  }
}
```

#### project.delete
Delete a project.

**Parameters:**
- `id` (string, required): Project ID

**Example:**
```json
{
  "name": "project.delete",
  "arguments": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Issue Tools

#### issue.create
Create a new issue.

**Parameters:**
- `projectId` (string, required): Project ID
- `title` (string, required): Issue title
- `description` (string, optional): Issue description
- `type` (string, optional): Issue type (TASK, BUG, FEATURE, IMPROVEMENT)
- `status` (string, optional): Issue status (TODO, IN_PROGRESS, DONE, CANCELED)
- `priority` (string, optional): Issue priority (LOW, MEDIUM, HIGH, CRITICAL)

**Example:**
```json
{
  "name": "issue.create",
  "arguments": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Fix login bug",
    "description": "Users cannot login with special characters",
    "type": "BUG",
    "priority": "HIGH"
  }
}
```

#### issue.get
Get an issue by ID.

**Parameters:**
- `id` (string, required): Issue ID

**Example:**
```json
{
  "name": "issue.get",
  "arguments": {
    "id": "660e8400-e29b-41d4-a716-446655440001"
  }
}
```

#### issue.list
List issues with optional filtering.

**Parameters:**
- `projectId` (string, optional): Filter by project ID
- `status` (string, optional): Filter by status
- `type` (string, optional): Filter by type

**Example:**
```json
{
  "name": "issue.list",
  "arguments": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "IN_PROGRESS"
  }
}
```

#### issue.update
Update an existing issue.

**Parameters:**
- `id` (string, required): Issue ID
- `title` (string, optional): New title
- `description` (string, optional): New description
- `status` (string, optional): New status
- `priority` (string, optional): New priority

**Example:**
```json
{
  "name": "issue.update",
  "arguments": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "DONE",
    "priority": "LOW"
  }
}
```

### Session Tools

#### session.create
Create a new work session.

**Parameters:**
- `projectId` (string, optional): Associated project ID

**Example:**
```json
{
  "name": "session.create",
  "arguments": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### session.get
Get a session by key.

**Parameters:**
- `key` (string, required): Session key

**Example:**
```json
{
  "name": "session.get",
  "arguments": {
    "key": "cs_1234567890abcdef"
  }
}
```

#### session.update
Update session context.

**Parameters:**
- `key` (string, required): Session key
- `context` (object, required): New context data

**Example:**
```json
{
  "name": "session.update",
  "arguments": {
    "key": "cs_1234567890abcdef",
    "context": {
      "activeIssues": ["issue-1", "issue-2"],
      "workflowStage": "development",
      "lastAction": "Code review completed"
    }
  }
}
```

## Available Resources

Resources are accessed using the `resources/read` method with cycletime:// URIs.

### Project Resources

#### List all projects
```
cycletime://projects
```

#### Get specific project
```
cycletime://projects/{projectId}
```

### Issue Resources

#### List all issues
```
cycletime://issues
```

#### List issues for a project
```
cycletime://projects/{projectId}/issues
```

#### Get specific issue
```
cycletime://issues/{issueId}
```

### Session Resources

#### Get current session
```
cycletime://sessions/current
```

#### Get specific session
```
cycletime://sessions/{sessionKey}
```

## Error Handling

The server returns standard JSON-RPC 2.0 error responses:

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "details": "Missing required parameter: name"
    }
  },
  "id": "unique-request-id"
}
```

### Error Codes

- `-32700`: Parse error
- `-32600`: Invalid request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error
- `-32000` to `-32099`: Server-specific errors

## Performance Metrics

The MCP server tracks and exposes performance metrics:

### Tool Execution Metrics
- Execution count per tool
- Average response time
- P95 and P99 response times
- Error rates

### Resource Serving Metrics
- Serving count per resource
- Average response time
- P95 and P99 response times
- Error rates

### Connection Metrics
- Total connections
- Active connections
- Connection errors

## Health Check

The server provides a health endpoint at `/health` (HTTP, not WebSocket):

```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "healthy",
  "service": "CycleTime CE",
  "version": "1.0.0",
  "dependencies": {
    "database": "connected",
    "mcp": "running",
    "mcp_port": "3006",
    "mcp_connections": "2"
  },
  "metrics": {
    "projects": "5",
    "sessions": "10"
  },
  "timestamp": "1699123456789"
}
```

## WebSocket Lifecycle

### Connection
1. Client connects to `ws://localhost:3006/mcp`
2. Server sends welcome message (optional)
3. Client sends `initialize` request
4. Server responds with capabilities

### Keep-Alive
- Server sends ping frames every 30 seconds
- Client must respond with pong frames
- Connection timeout: 60 seconds

### Disconnection
1. Client sends `shutdown` request (optional)
2. Server acknowledges shutdown
3. WebSocket connection closes

## Rate Limiting

Currently, there are no rate limits. Future versions will implement:
- 100 requests per minute per connection
- 10 concurrent connections per IP

## Examples

### Complete Session Example

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3006/mcp');

// Initialize
ws.send(JSON.stringify({
  jsonrpc: "2.0",
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {}
  },
  id: "init-1"
}));

// Create a project
ws.send(JSON.stringify({
  jsonrpc: "2.0",
  method: "tools/call",
  params: {
    name: "project.create",
    arguments: {
      name: "My Project",
      description: "A test project"
    }
  },
  id: "create-1"
}));

// List resources
ws.send(JSON.stringify({
  jsonrpc: "2.0",
  method: "resources/list",
  params: {},
  id: "list-1"
}));

// Read a resource
ws.send(JSON.stringify({
  jsonrpc: "2.0",
  method: "resources/read",
  params: {
    uri: "cycletime://projects"
  },
  id: "read-1"
}));
```

## Migration Guide

For users migrating from REST API to MCP:

### REST to MCP Mapping

| REST Endpoint | MCP Tool/Resource |
|--------------|-------------------|
| GET /api/projects | cycletime://projects |
| POST /api/projects | project.create |
| GET /api/projects/{id} | cycletime://projects/{id} |
| PUT /api/projects/{id} | project.update |
| DELETE /api/projects/{id} | project.delete |

## Best Practices

1. **Use Correlation IDs**: Include unique IDs in all requests for tracking
2. **Handle Reconnection**: Implement automatic reconnection logic
3. **Cache Resources**: Cache frequently accessed resources client-side
4. **Batch Operations**: Group related operations when possible
5. **Monitor Performance**: Track response times and error rates

## Troubleshooting

### Connection Issues
- Verify server is running: Check `/health` endpoint
- Check firewall settings for port 3006
- Verify WebSocket support in client

### Performance Issues
- Monitor server metrics via health endpoint
- Check network latency
- Review server logs for errors

### Data Issues
- Verify data formats match schemas
- Check for required parameters
- Review error messages for details

## Support

For issues and questions:
- GitHub Issues: [CycleTime Repository](https://github.com/spiralhouse/cycletime)
- Documentation: [CycleTime Docs](https://docs.cycletime.io)
- Community: [Discord Server](https://discord.gg/cycletime)