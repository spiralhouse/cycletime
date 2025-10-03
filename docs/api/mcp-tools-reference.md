# CycleTime MCP Tools & Resources Reference

**Version:** 1.0
**Date:** October 3, 2025
**Status:** Implementation Reference

**Related Documents:**
- [MCP Resources Specification](./mcp-resources.md) - Architecture and design patterns
- [Quick Start Guide](./quick-start.md) - Getting started with CycleTime
- [Best Practices](./best-practices.md) - Development guidelines

---

## Overview

This document provides a complete reference for all implemented MCP Tools and Resources in CycleTime. For architectural concepts and integration patterns, see the [MCP Resources Specification](./mcp-resources.md).

CycleTime exposes its functionality through:
- **MCP Tools** - JSON-RPC callable functions for creating and manipulating data
- **MCP Resources** - URI-addressable data endpoints for reading project context

All tools and resources follow the Model Context Protocol (MCP) specification and are accessible through Claude Code's MCP integration.

## JSON-RPC Protocol

All MCP tools use the standard JSON-RPC 2.0 protocol.

### Request Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      "param1": "value1",
      "param2": "value2"
    }
  }
}
```

### Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"id\":\"xxx\",\"name\":\"...\"}"
      }
    ]
  }
}
```

### Error Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": "Additional error details"
  }
}
```

---

## Project Tools

Project tools manage project lifecycle and metadata.

### create_project

Create a new CycleTime project.

**Tool Name:** `create_project`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Project name |
| description | string | No | Project description |

**JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_project",
    "arguments": {
      "name": "My Project",
      "description": "A sample project for demonstration"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"id\":\"proj_abc123\",\"name\":\"My Project\"}"
      }
    ]
  }
}
```

**Example Usage:**

```kotlin
// Create a new project
val response = mcpClient.callTool("create_project", buildJsonObject {
    put("name", "DevLog Application")
    put("description", "Developer logging and tracking system")
})

val project = Json.decodeFromString<JsonObject>(response.content[0].text)
println("Created project: ${project["id"]?.jsonPrimitive?.content}")
```

---

### get_project

Retrieve a project by ID.

**Tool Name:** `get_project`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Project ID |

**JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_project",
    "arguments": {
      "id": "proj_abc123"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"id\":\"proj_abc123\",\"name\":\"My Project\",\"description\":\"A sample project\",\"createdAt\":\"2025-10-03T10:00:00Z\"}"
      }
    ]
  }
}
```

**Error Cases:**

- Project not found: Returns error with message "Project not found: {id}"

---

### list_projects

List all projects in the system.

**Tool Name:** `list_projects`

**Parameters:** None

**JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "list_projects",
    "arguments": {}
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[{\"id\":\"proj_abc123\",\"name\":\"My Project\"},{\"id\":\"proj_def456\",\"name\":\"Another Project\"}]"
      }
    ]
  }
}
```

---

### update_project

Update an existing project.

**Tool Name:** `update_project`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Project ID |
| name | string | No | New project name |
| description | string | No | New project description |

**JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "update_project",
    "arguments": {
      "id": "proj_abc123",
      "name": "Updated Project Name",
      "description": "Updated description"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"id\":\"proj_abc123\",\"updated\":true,\"name\":\"Updated Project Name\",\"description\":\"Updated description\"}"
      }
    ]
  }
}
```

---

## Issue Tools

Issue tools manage issues, stories, epics, and subtasks.

### create_issue

Create a new issue with proper hierarchy support.

**Tool Name:** `create_issue`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| title | string | Yes | Issue title |
| description | string | No | Issue description |
| projectId | string | Yes | Project ID this issue belongs to |
| type | string | No | Issue type: "EPIC", "STORY", "SUBTASK" (default: "STORY") |

**JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "create_issue",
    "arguments": {
      "title": "Implement user authentication",
      "description": "Add login/logout functionality with JWT",
      "projectId": "proj_abc123",
      "type": "STORY"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"id\":\"issue_xyz789\",\"title\":\"Implement user authentication\"}"
      }
    ]
  }
}
```

**Example - Creating an Epic:**

```json
{
  "name": "create_issue",
  "arguments": {
    "title": "User Management System",
    "description": "Complete user management functionality",
    "projectId": "proj_abc123",
    "type": "EPIC"
  }
}
```

**Example - Creating a Subtask:**

```json
{
  "name": "create_issue",
  "arguments": {
    "title": "Create login form component",
    "description": "React component for user login",
    "projectId": "proj_abc123",
    "type": "SUBTASK"
  }
}
```

---

### get_issue

Retrieve an issue by ID.

**Tool Name:** `get_issue`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Issue ID |

**JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "get_issue",
    "arguments": {
      "id": "issue_xyz789"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"id\":\"issue_xyz789\",\"title\":\"Implement user authentication\",\"description\":\"Add login/logout functionality\",\"type\":\"STORY\",\"status\":\"TODO\"}"
      }
    ]
  }
}
```

**Error Cases:**

- Issue not found: Returns error with message "Issue not found: {id}"

---

### list_issues

List all issues in the system.

**Tool Name:** `list_issues`

**Parameters:** None

**JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "list_issues",
    "arguments": {}
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[{\"id\":\"issue_xyz789\",\"title\":\"Implement user authentication\",\"type\":\"STORY\"},{\"id\":\"issue_abc123\",\"title\":\"Add user profile\",\"type\":\"STORY\"}]"
      }
    ]
  }
}
```

---

### update_issue

Update an existing issue.

**Tool Name:** `update_issue`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Issue ID |
| title | string | No | New issue title |
| description | string | No | New issue description |
| type | string | No | New issue type: "EPIC", "STORY", "SUBTASK" |

**JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "tools/call",
  "params": {
    "name": "update_issue",
    "arguments": {
      "id": "issue_xyz789",
      "title": "Implement JWT authentication",
      "description": "Add JWT-based login/logout functionality"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"id\":\"issue_xyz789\",\"updated\":true,\"title\":\"Implement JWT authentication\",\"description\":\"Add JWT-based login/logout functionality\"}"
      }
    ]
  }
}
```

---

## Session Tools

Session tools manage work sessions and task context.

### create_session

Create a new work session for a project.

**Tool Name:** `create_session`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | string | Yes | Project ID for the session |

**JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "tools/call",
  "params": {
    "name": "create_session",
    "arguments": {
      "projectId": "proj_abc123"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Session created for project proj_abc123 (Key: session_xyz789)"
      }
    ]
  }
}
```

---

### list_active_sessions

List all currently active sessions.

**Tool Name:** `list_active_sessions`

**Parameters:** None

**JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "list_active_sessions",
    "arguments": {}
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"sessions\":[{\"sessionKey\":\"session_xyz789\",\"projectId\":\"proj_abc123\",\"createdAt\":\"2025-10-03T10:00:00Z\",\"lastActivity\":\"2025-10-03T10:15:00Z\"}]}"
      }
    ]
  }
}
```

---

### get_session

Get session details by session key.

**Tool Name:** `get_session`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionKey | string | Yes | Session key |

**JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "get_session",
    "arguments": {
      "sessionKey": "session_xyz789"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"sessionKey\":\"session_xyz789\",\"projectId\":\"proj_abc123\",\"createdAt\":\"2025-10-03T10:00:00Z\",\"lastActivity\":\"2025-10-03T10:15:00Z\",\"status\":\"active\"}"
      }
    ]
  }
}
```

**Error Cases:**

- Session not found: Returns error with message "Session not found: {sessionKey}"

---

### get_active_session

Get the currently active session.

**Tool Name:** `get_active_session`

**Parameters:** None

**JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "get_active_session",
    "arguments": {}
  }
}
```

**Response (Active Session Found):**

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"sessionKey\":\"session_xyz789\",\"projectId\":\"proj_abc123\",\"status\":\"active\"}"
      }
    ]
  }
}
```

**Response (No Active Session):**

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"id\":\"no-active-session\",\"message\":\"No active session found\"}"
      }
    ]
  }
}
```

---

### list_sessions

List all sessions (active and inactive).

**Tool Name:** `list_sessions`

**Parameters:** None

**JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 13,
  "method": "tools/call",
  "params": {
    "name": "list_sessions",
    "arguments": {}
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 13,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"sessions\":[{\"sessionKey\":\"session_xyz789\",\"projectId\":\"proj_abc123\",\"status\":\"active\"},{\"sessionKey\":\"session_old123\",\"projectId\":\"proj_abc123\",\"status\":\"inactive\"}]}"
      }
    ]
  }
}
```

---

### get_next_task

Get the next task for the current session.

**Tool Name:** `get_next_task`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionKey | string | No | Session key (optional) |

**JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 14,
  "method": "tools/call",
  "params": {
    "name": "get_next_task",
    "arguments": {
      "sessionKey": "session_xyz789"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 14,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"id\":\"task-1\",\"title\":\"Continue development on current feature\",\"priority\":\"high\",\"sessionKey\":\"session_xyz789\"}"
      }
    ]
  }
}
```

---

## Workflow Tools

Workflow tools manage development workflows and stages.

### create_workflow

Create a new workflow with stages.

**Tool Name:** `create_workflow`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Workflow name |
| description | string | No | Workflow description |
| stages | array | No | Array of stage objects with name and description |

**JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 15,
  "method": "tools/call",
  "params": {
    "name": "create_workflow",
    "arguments": {
      "name": "TDD Workflow",
      "description": "Test-driven development workflow",
      "stages": [
        {"name": "red", "description": "Write failing test"},
        {"name": "green", "description": "Make test pass"},
        {"name": "refactor", "description": "Improve code quality"}
      ]
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 15,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"id\":\"workflow-abc123\",\"name\":\"TDD Workflow\",\"description\":\"Test-driven development workflow\",\"created\":true,\"stageCount\":3}"
      }
    ]
  }
}
```

**Note:** Current implementation (SPI-663) returns unwrapped JSON. This will be fixed to match the wrapped format shown above.

---

### list_workflows

List all available workflows.

**Tool Name:** `list_workflows`

**Parameters:** None

**JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 16,
  "method": "tools/call",
  "params": {
    "name": "list_workflows",
    "arguments": {}
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 16,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[{\"id\":\"workflow-1\",\"name\":\"Standard Development Workflow\",\"description\":\"Default workflow for development tasks\",\"stages\":[\"analysis\",\"implementation\",\"testing\",\"review\"]}]"
      }
    ]
  }
}
```

**Note:** Current implementation (SPI-663) returns unwrapped JSON array. This will be fixed to match the wrapped format shown above.

---

### execute_workflow_stage

Execute a specific workflow stage.

**Tool Name:** `execute_workflow_stage`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| workflowId | string | Yes | Workflow ID |
| stage | string | Yes | Stage name to execute |
| context | object | No | Execution context data |

**JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 17,
  "method": "tools/call",
  "params": {
    "name": "execute_workflow_stage",
    "arguments": {
      "workflowId": "workflow-1",
      "stage": "implementation",
      "context": {
        "issueId": "issue_xyz789",
        "branch": "feat/user-auth"
      }
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 17,
  "result": {
    "workflowId": "workflow-1",
    "stage": "implementation",
    "status": "executed",
    "result": "Stage completed successfully",
    "nextStage": "testing"
  }
}
```

---

## MCP Resources

Resources are URI-addressable data endpoints accessible through the `resources/read` MCP method.

### Resource URI Patterns

CycleTime provides the following resource patterns:

| Resource URI | Description | Content Type |
|--------------|-------------|--------------|
| `cycletime://projects` | List all projects | application/json |
| `cycletime://projects/{id}` | Get specific project | application/json |
| `cycletime://issues` | List all issues | application/json |
| `cycletime://issues/{id}` | Get specific issue | application/json |
| `cycletime://sessions` | List all sessions | application/json |
| `cycletime://sessions/{id}` | Get specific session | application/json |
| `cycletime://sessions/active` | List active sessions | application/json |
| `cycletime://workflows` | List all workflows | application/json |
| `cycletime://workflows/{id}` | Get specific workflow | application/json |
| `cycletime://tasks/next` | Get next available task | application/json |

### Reading Resources

Resources are read using the standard MCP `resources/read` method.

**Request Format:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/read",
  "params": {
    "uri": "cycletime://projects"
  }
}
```

**Response Format:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "contents": [
      {
        "uri": "cycletime://projects",
        "mimeType": "application/json",
        "text": "[{\"id\":\"proj_abc123\",\"name\":\"My Project\"}]"
      }
    ]
  }
}
```

### Project Resources

#### List All Projects

**URI:** `cycletime://projects`

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "uri": "cycletime://projects"
  }
}
```

**Response Data:**

```json
[
  {
    "id": "proj_abc123",
    "name": "DevLog Application",
    "description": "Developer logging system",
    "createdAt": "2025-10-03T10:00:00Z"
  },
  {
    "id": "proj_def456",
    "name": "API Gateway",
    "description": "Microservices gateway",
    "createdAt": "2025-10-01T08:00:00Z"
  }
]
```

#### Get Specific Project

**URI:** `cycletime://projects/{projectId}`

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "uri": "cycletime://projects/proj_abc123"
  }
}
```

**Response Data:**

```json
{
  "id": "proj_abc123",
  "name": "DevLog Application",
  "description": "Developer logging and tracking system",
  "createdAt": "2025-10-03T10:00:00Z",
  "updatedAt": "2025-10-03T15:30:00Z",
  "status": "active"
}
```

**Error Cases:**

- Invalid project ID: Returns error "Project not found: {projectId}"
- Malformed URI (contains multiple path segments): Returns null resource

### Issue Resources

#### List All Issues

**URI:** `cycletime://issues`

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "uri": "cycletime://issues"
  }
}
```

**Response Data:**

```json
[
  {
    "id": "issue_xyz789",
    "title": "Implement user authentication",
    "type": "STORY",
    "status": "IN_PROGRESS",
    "projectId": "proj_abc123"
  },
  {
    "id": "issue_abc456",
    "title": "Add user profile page",
    "type": "STORY",
    "status": "TODO",
    "projectId": "proj_abc123"
  }
]
```

#### Get Specific Issue

**URI:** `cycletime://issues/{issueId}`

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "uri": "cycletime://issues/issue_xyz789"
  }
}
```

**Response Data:**

```json
{
  "id": "issue_xyz789",
  "title": "Implement user authentication",
  "description": "Add JWT-based login/logout functionality",
  "type": "STORY",
  "status": "IN_PROGRESS",
  "projectId": "proj_abc123",
  "createdAt": "2025-10-03T10:00:00Z",
  "updatedAt": "2025-10-03T11:00:00Z"
}
```

**Error Cases:**

- Invalid issue ID: Returns error "Issue not found: {issueId}"

### Session Resources

#### List All Sessions

**URI:** `cycletime://sessions`

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "uri": "cycletime://sessions"
  }
}
```

**Response Data:**

```json
{
  "sessions": [
    {
      "sessionKey": "session_xyz789",
      "projectId": "proj_abc123",
      "createdAt": "2025-10-03T10:00:00Z",
      "lastActivity": "2025-10-03T15:30:00Z",
      "status": "active"
    }
  ]
}
```

#### Get Active Sessions

**URI:** `cycletime://sessions/active`

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "uri": "cycletime://sessions/active"
  }
}
```

**Response Data:**

```json
{
  "sessions": [
    {
      "sessionKey": "session_xyz789",
      "projectId": "proj_abc123",
      "status": "active",
      "lastActivity": "2025-10-03T15:30:00Z"
    }
  ]
}
```

#### Get Specific Session

**URI:** `cycletime://sessions/{sessionKey}`

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "uri": "cycletime://sessions/session_xyz789"
  }
}
```

**Response Data:**

```json
{
  "sessionKey": "session_xyz789",
  "projectId": "proj_abc123",
  "createdAt": "2025-10-03T10:00:00Z",
  "lastActivity": "2025-10-03T15:30:00Z",
  "status": "active",
  "currentTask": "issue_xyz789"
}
```

**Error Cases:**

- Invalid session key: Returns error "Session not found: {sessionKey}"

### Workflow Resources

#### List All Workflows

**URI:** `cycletime://workflows`

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "uri": "cycletime://workflows"
  }
}
```

**Response Data:**

```json
[]
```

Note: Currently returns empty array as workflows are under development.

#### Get Specific Workflow

**URI:** `cycletime://workflows/{workflowId}`

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "uri": "cycletime://workflows/workflow-1"
  }
}
```

**Response Data:**

```json
{
  "id": "workflow-1",
  "name": "Workflow workflow-1",
  "status": "active"
}
```

#### Get Next Task

**URI:** `cycletime://tasks/next`

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "uri": "cycletime://tasks/next"
  }
}
```

**Response Data:**

```json
{
  "message": "No tasks available"
}
```

Note: Currently returns placeholder message. Will provide actual task recommendations when workflow engine is implemented.

---

## Common Usage Patterns

### Pattern 1: Project Initialization

```kotlin
// 1. Create a new project
val createResponse = mcpClient.callTool("create_project", buildJsonObject {
    put("name", "New Application")
    put("description", "My new application project")
})

val project = Json.decodeFromString<JsonObject>(createResponse.content[0].text)
val projectId = project["id"]?.jsonPrimitive?.content ?: error("No project ID")

// 2. Create initial issues
mcpClient.callTool("create_issue", buildJsonObject {
    put("title", "Setup project structure")
    put("description", "Initialize project files and dependencies")
    put("projectId", projectId)
    put("type", "STORY")
})

// 3. Create a work session
mcpClient.callTool("create_session", buildJsonObject {
    put("projectId", projectId)
})

// 4. Read project context
val projectData = mcpClient.readResource("cycletime://projects/$projectId")
```

### Pattern 2: Issue Management Workflow

```kotlin
// 1. List all issues
val issuesResponse = mcpClient.readResource("cycletime://issues")
val issues = Json.decodeFromString<JsonArray>(issuesResponse.contents[0].text)

// 2. Create a new story
val storyResponse = mcpClient.callTool("create_issue", buildJsonObject {
    put("title", "User authentication")
    put("description", "Implement JWT authentication")
    put("projectId", "proj_abc123")
    put("type", "STORY")
})

val story = Json.decodeFromString<JsonObject>(storyResponse.content[0].text)

// 3. Create subtasks
mcpClient.callTool("create_issue", buildJsonObject {
    put("title", "Create login endpoint")
    put("description", "POST /api/auth/login")
    put("projectId", "proj_abc123")
    put("type", "SUBTASK")
})

mcpClient.callTool("create_issue", buildJsonObject {
    put("title", "Create logout endpoint")
    put("description", "POST /api/auth/logout")
    put("projectId", "proj_abc123")
    put("type", "SUBTASK")
})

// 4. Update issue details
mcpClient.callTool("update_issue", buildJsonObject {
    put("id", story["id"]?.jsonPrimitive?.content)
    put("description", "Implement JWT authentication with refresh tokens")
})
```

### Pattern 3: Session-Based Development

```kotlin
// 1. Create or get active session
var sessionResponse = mcpClient.callTool("get_active_session", buildJsonObject {})
var sessionData = Json.decodeFromString<JsonObject>(sessionResponse.content[0].text)

if (sessionData["id"]?.jsonPrimitive?.content == "no-active-session") {
    // Create new session
    sessionResponse = mcpClient.callTool("create_session", buildJsonObject {
        put("projectId", "proj_abc123")
    })
}

// 2. Get next task
val nextTaskResponse = mcpClient.callTool("get_next_task", buildJsonObject {
    put("sessionKey", sessionData["sessionKey"]?.jsonPrimitive?.content)
})

val nextTask = Json.decodeFromString<JsonObject>(nextTaskResponse.content[0].text)
println("Working on: ${nextTask["title"]?.jsonPrimitive?.content}")

// 3. Work on task...
// 4. Update task status...

// 5. List all sessions for review
val sessionsData = mcpClient.readResource("cycletime://sessions")
```

### Pattern 4: Cross-Session Context Recovery

```kotlin
// In a new Claude Code session, recover project context

// 1. List all projects
val projectsData = mcpClient.readResource("cycletime://projects")
val projects = Json.decodeFromString<JsonArray>(projectsData.contents[0].text)

// 2. Get active sessions
val activeSessionsData = mcpClient.readResource("cycletime://sessions/active")
val activeSessions = Json.decodeFromString<JsonObject>(activeSessionsData.contents[0].text)

// 3. Read specific project details
if (projects.size > 0) {
    val projectId = projects[0].jsonObject["id"]?.jsonPrimitive?.content
    val projectData = mcpClient.readResource("cycletime://projects/$projectId")

    // 4. List issues for context
    val issuesData = mcpClient.readResource("cycletime://issues")

    // Context is now fully recovered - continue work
}
```

---

## Best Practices

### Tool Usage

1. **Always validate IDs** before calling tools that require resource IDs
2. **Use appropriate issue types** - EPIC for high-level features, STORY for user-facing functionality, SUBTASK for implementation details
3. **Create sessions per project** - Maintain separate sessions for different projects
4. **Handle errors gracefully** - Check for error responses and handle "not found" cases

### Resource Reading

1. **Cache resource data** when appropriate to minimize reads
2. **Use specific resources** (`cycletime://projects/{id}`) instead of listing all resources when you know the ID
3. **Read active sessions** (`cycletime://sessions/active`) instead of all sessions for current context
4. **Parse JSON responses** properly with error handling

### Performance

1. **Batch operations** when creating multiple issues - minimize round trips
2. **Use resource URIs** for read-heavy operations instead of repeated tool calls
3. **Leverage session context** to avoid repeated project lookups
4. **Filter data client-side** when listing large collections

---

## Error Handling

### Common Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Project not found: {id}" | Invalid project ID | Verify project exists with `list_projects` |
| "Issue not found: {id}" | Invalid issue ID | Verify issue exists with `list_issues` |
| "Session not found: {sessionKey}" | Invalid session key | Create new session or list active sessions |
| "Resource not found: {uri}" | Invalid resource URI | Check URI pattern against documentation |
| "{param} is required" | Missing required parameter | Add required parameter to request |

### Edge Case Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Project not found: {projectId}" when calling create_issue | Invalid or non-existent projectId parameter | Verify project exists using `get_project` or `list_projects` before creating issue |
| "Invalid issue type: {type}" | Malformed type enum value (not EPIC, STORY, or SUBTASK) | Use valid enum value: "EPIC", "STORY", or "SUBTASK" (case-sensitive) |
| Returns null resource | Resource URI contains multiple path segments (e.g., `cycletime://projects/foo/bar`) | Use single-segment URIs: `cycletime://projects/{id}` not `cycletime://projects/{id}/extra` |
| "Invalid resource URI format" | Malformed URI pattern | Follow documented patterns: `cycletime://` prefix with valid resource type |

### Error Response Handling

```kotlin
try {
    val response = mcpClient.callTool("get_project", buildJsonObject {
        put("id", "invalid_id")
    })

    if (response.error != null) {
        println("Error: ${response.error.message}")
        // Handle error appropriately
    } else {
        // Process successful response
        val project = Json.decodeFromString<JsonObject>(response.content[0].text)
    }
} catch (e: Exception) {
    println("Request failed: ${e.message}")
}
```

---

## Implementation Notes

### Current Status

- All Project tools: **Implemented**
- All Issue tools: **Implemented**
- All Session tools: **Implemented**
- All Workflow tools: **Partially implemented** (return placeholder data)

### Limitations

1. **Workflow execution** - Currently returns placeholder responses
2. **Task prioritization** - `get_next_task` returns static data
3. **Resource updates** - All resources are read-only
4. **Filtering and pagination** - Not yet implemented for list operations

### Future Enhancements

Planned features referenced in the [MCP Resources Specification](./mcp-resources.md):

- Dependency graph resources
- Issue hierarchy resources
- Advanced filtering and search
- Workflow stage execution
- Resource subscriptions for real-time updates

---

## Testing Tools and Resources

### Using Claude Code Console

Test tools directly in Claude Code:

```
> Use create_project tool with name "Test Project"
> Read cycletime://projects resource
> Use create_issue tool with title "Test Issue" and projectId from previous response
```

### Using MCP Inspector

```bash
# List all available tools
mcp-inspector list-tools

# Call a tool
mcp-inspector call-tool create_project '{"name":"Test"}'

# Read a resource
mcp-inspector read-resource cycletime://projects
```

### Integration Testing

Example integration test flow:

1. Create project → verify with `get_project`
2. Create issue → verify with `list_issues`
3. Create session → verify with `list_active_sessions`
4. Read resources → verify data consistency
5. Update operations → verify changes persist

---

## Related Documentation

- [MCP Resources Specification](./mcp-resources.md) - Architecture and design patterns
- [Quick Start Guide](./quick-start.md) - Getting started with CycleTime
- [Best Practices](./best-practices.md) - Development guidelines
- [REST API Reference](./rest-api-reference.md) - HTTP endpoint documentation

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-03 | Initial implementation reference |

---

For questions or issues with MCP tools and resources, please refer to the troubleshooting section in the [Quick Start Guide](./quick-start.md) or consult the [MCP Resources Specification](./mcp-resources.md) for architectural details.
