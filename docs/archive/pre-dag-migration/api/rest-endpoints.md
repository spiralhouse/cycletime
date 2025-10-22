# REST API Reference

## Base URL

```
http://localhost:8080
```

## Health & Status

### GET /health

Server health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "cycletime",
  "version": "0.1.0",
  "dependencies": {
    "database": "connected",
    "projectService": "initialized",
    "issueService": "initialized",
    "sessionService": "initialized"
  },
  "metrics": {
    "projects": "5",
    "sessions": "3"
  },
  "timestamp": "1699123456789"
}
```

**Status Codes:**
- `200 OK` - Service is healthy
- `500 Internal Server Error` - Service unhealthy

## MCP Protocol Endpoints

### GET /mcp/info

Returns MCP server information and capabilities.

**Response:**
```json
{
  "protocolVersion": "1.0.0",
  "serverInfo": {
    "name": "cycletime",
    "version": "0.1.0"
  },
  "capabilities": {
    "resources": true,
    "tools": true,
    "sse": true
  }
}
```

### GET /mcp/resources

List all available MCP resources.

**Response:**
```json
{
  "resources": [
    {
      "id": "project-list",
      "name": "Project List",
      "type": "list",
      "description": "List of all projects"
    },
    {
      "id": "issue-list",
      "name": "Issue List",
      "type": "list",
      "description": "List of all issues"
    },
    {
      "id": "session-state",
      "name": "Session State",
      "type": "state",
      "description": "Current session state"
    }
  ]
}
```

### GET /mcp/resources/{id}

Get a specific MCP resource by ID.

**Parameters:**
- `id` (path) - Resource identifier

**Response:**
```json
{
  "id": "project-list",
  "name": "Project List",
  "type": "list",
  "data": [
    {
      "id": "proj_123",
      "name": "CycleTime",
      "description": "Project orchestration framework",
      "status": "active"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Resource found
- `404 Not Found` - Resource not found

### POST /mcp/tools/{name}

Execute an MCP tool.

**Parameters:**
- `name` (path) - Tool name

**Request Body:**
```json
{
  "parameters": {
    "key": "value"
  }
}
```

**Response:**
```json
{
  "result": {
    "status": "success",
    "data": {}
  }
}
```

**Status Codes:**
- `200 OK` - Tool executed successfully
- `400 Bad Request` - Invalid parameters
- `404 Not Found` - Tool not found
- `500 Internal Server Error` - Tool execution failed

### GET /mcp/sse

Server-sent events stream for real-time updates.

**Response:** Event stream

```
event: update
data: {"type": "project_updated", "data": {...}}

event: notification
data: {"type": "issue_created", "data": {...}}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "status": "error",
  "service": "cycletime",
  "version": "0.1.0",
  "error": "Error message",
  "timestamp": "1699123456789"
}
```

## Authentication

Currently, the API does not require authentication. Future versions will support:
- API key authentication
- OAuth 2.0
- JWT tokens

## Rate Limiting

No rate limiting is currently implemented. Production deployments should add:
- Request throttling
- IP-based rate limits
- User-based quotas

## Related Documentation

- [MCP Resources](mcp-resources.md)
- [MCP Integration Patterns](../reference/technical-design/mcp-integration-patterns.md)
- [REST API Reference](rest-api-reference.md)