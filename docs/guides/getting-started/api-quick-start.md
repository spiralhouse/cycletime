---
title: "API Quick Start Guide"
type: guide
domain: [api, getting-started]
description: "Getting started with the CycleTime API - authentication, first calls, and common patterns"
dependencies: []
related: [../../reference/api/rest-api-reference.md, api-best-practices.md]
keywords: [api, quick-start, tutorial, getting-started]
last_updated: 2025-10-19
---


Welcome to the CycleTime CE REST API! This guide provides practical examples to get you started quickly with our Level 2 REST-compliant API.

## Base URL

All API endpoints are versioned and accessible at:
```
http://localhost:8080/api/v1
```

## API Overview

The CycleTime API follows REST principles with:
- Resource-based URLs
- Standard HTTP methods (GET, POST, PUT, DELETE)
- JSON request/response bodies
- Consistent error handling
- API versioning via URL path

## Quick Start Examples

### 1. Health Check

Verify the server is running:

```bash
curl http://localhost:8080/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-30T12:00:00Z"
}
```

### 2. Project Management

#### Create a Project

```bash
curl -X POST http://localhost:8080/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "E-Commerce Platform",
    "description": "Next-generation online shopping experience"
  }'
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "E-Commerce Platform",
  "description": "Next-generation online shopping experience",
  "createdAt": "2025-09-30T12:00:00Z",
  "updatedAt": "2025-09-30T12:00:00Z"
}
```

#### List All Projects

```bash
curl http://localhost:8080/api/v1/projects
```

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "E-Commerce Platform",
    "description": "Next-generation online shopping experience",
    "createdAt": "2025-09-30T12:00:00Z",
    "updatedAt": "2025-09-30T12:00:00Z"
  }
]
```

#### Get a Specific Project

```bash
curl http://localhost:8080/api/v1/projects/550e8400-e29b-41d4-a716-446655440001
```

#### Update a Project

```bash
curl -X PUT http://localhost:8080/api/v1/projects/550e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "E-Commerce Platform v2",
    "description": "Enhanced shopping experience with AI recommendations"
  }'
```

#### Delete a Project

```bash
curl -X DELETE http://localhost:8080/api/v1/projects/550e8400-e29b-41d4-a716-446655440001
```

### 3. Issue Management (Nested Resources)

Issues are nested under projects, following REST best practices for hierarchical resources.

#### Create an Issue for a Project

```bash
curl -X POST http://localhost:8080/api/v1/projects/550e8400-e29b-41d4-a716-446655440001/issues \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication system",
    "type": "STORY",
    "status": "TODO",
    "estimate": 5
  }'
```

**Response (201 Created):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440002",
  "projectId": "550e8400-e29b-41d4-a716-446655440001",
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication system",
  "type": "STORY",
  "status": "TODO",
  "estimate": 5,
  "createdAt": "2025-09-30T12:05:00Z",
  "updatedAt": "2025-09-30T12:05:00Z"
}
```

#### Create a Subtask

```bash
curl -X POST http://localhost:8080/api/v1/projects/550e8400-e29b-41d4-a716-446655440001/issues \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design JWT token schema",
    "description": "Define token structure and claims",
    "type": "SUBTASK",
    "status": "TODO",
    "parentId": "660e8400-e29b-41d4-a716-446655440002",
    "estimate": 2
  }'
```

#### List Issues for a Project

```bash
curl http://localhost:8080/api/v1/projects/550e8400-e29b-41d4-a716-446655440001/issues
```

#### Get Issue Hierarchy

View the complete hierarchy (Epic → Story → Subtask):

```bash
curl http://localhost:8080/api/v1/projects/550e8400-e29b-41d4-a716-446655440001/issues/660e8400-e29b-41d4-a716-446655440002/hierarchy
```

**Response:**
```json
{
  "issue": {
    "id": "660e8400-e29b-41d4-a716-446655440002",
    "title": "Implement user authentication",
    "type": "STORY",
    "status": "TODO"
  },
  "parent": null,
  "children": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440003",
      "title": "Design JWT token schema",
      "type": "SUBTASK",
      "status": "TODO",
      "estimate": 2
    }
  ]
}
```

#### Update Issue Status

```bash
curl -X POST http://localhost:8080/api/v1/projects/550e8400-e29b-41d4-a716-446655440001/issues/770e8400-e29b-41d4-a716-446655440003/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS"
  }'
```

### 4. Workflow Management

Workflows define the lifecycle of issues with customizable status transitions.

#### Create Workflow from Template

CycleTime provides three built-in templates:

**Default Workflow:**
```bash
curl -X POST "http://localhost:8080/api/v1/workflows?template=default"
```

**Bug Tracking Workflow:**
```bash
curl -X POST "http://localhost:8080/api/v1/workflows?template=bug"
```

**Feature Development Workflow:**
```bash
curl -X POST "http://localhost:8080/api/v1/workflows?template=feature"
```

**Response (201 Created):**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440004",
  "name": "Default Workflow",
  "description": "Standard development workflow",
  "statuses": ["TODO", "IN_PROGRESS", "DONE"],
  "transitions": [
    {"from": "TODO", "to": "IN_PROGRESS"},
    {"from": "IN_PROGRESS", "to": "DONE"}
  ],
  "createdAt": "2025-09-30T12:10:00Z"
}
```

#### Create Custom Workflow

```bash
curl -X POST http://localhost:8080/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sprint Workflow",
    "description": "Agile sprint development process",
    "initialStatus": "BACKLOG",
    "statuses": ["BACKLOG", "SPRINT_READY", "IN_DEVELOPMENT", "CODE_REVIEW", "QA", "DONE"],
    "transitions": [
      {"from": "BACKLOG", "to": "SPRINT_READY"},
      {"from": "SPRINT_READY", "to": "IN_DEVELOPMENT"},
      {"from": "IN_DEVELOPMENT", "to": "CODE_REVIEW"},
      {"from": "CODE_REVIEW", "to": "QA"},
      {"from": "CODE_REVIEW", "to": "IN_DEVELOPMENT"},
      {"from": "QA", "to": "DONE"},
      {"from": "QA", "to": "IN_DEVELOPMENT"}
    ]
  }'
```

#### List All Workflows

```bash
curl http://localhost:8080/api/v1/workflows
```

#### Get Workflow Transitions

```bash
curl http://localhost:8080/api/v1/workflows/880e8400-e29b-41d4-a716-446655440004/transitions
```

#### Validate a Transition

Before transitioning an issue, validate if the transition is allowed:

```bash
curl -X POST http://localhost:8080/api/v1/workflows/880e8400-e29b-41d4-a716-446655440004/transitions/validation \
  -H "Content-Type: application/json" \
  -d '{
    "fromStatus": "TODO",
    "toStatus": "DONE"
  }'
```

**Response (400 Bad Request if invalid):**
```json
{
  "success": false,
  "message": "Invalid transition",
  "details": "Cannot transition from TODO to DONE. Allowed transitions: [TODO → IN_PROGRESS]"
}
```

### 5. Complete Workflow Example

Here's a complete example of creating a project with issues and managing their lifecycle:

```bash
# 1. Create a project
PROJECT_ID=$(curl -s -X POST http://localhost:8080/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Mobile App", "description": "iOS/Android application"}' \
  | jq -r '.id')

echo "Created project: $PROJECT_ID"

# 2. Create a workflow
WORKFLOW_ID=$(curl -s -X POST "http://localhost:8080/api/v1/workflows?template=feature" \
  | jq -r '.id')

echo "Created workflow: $WORKFLOW_ID"

# 3. Create an epic
EPIC_ID=$(curl -s -X POST "http://localhost:8080/api/v1/projects/$PROJECT_ID/issues" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "User Authentication System",
    "type": "EPIC",
    "status": "TODO"
  }' | jq -r '.id')

echo "Created epic: $EPIC_ID"

# 4. Create a story under the epic
STORY_ID=$(curl -s -X POST "http://localhost:8080/api/v1/projects/$PROJECT_ID/issues" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement OAuth2 login",
    "type": "STORY",
    "status": "TODO",
    "parentId": "'$EPIC_ID'"
  }' | jq -r '.id')

echo "Created story: $STORY_ID"

# 5. Create subtasks for the story
SUBTASK_ID=$(curl -s -X POST "http://localhost:8080/api/v1/projects/$PROJECT_ID/issues" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Setup OAuth2 provider",
    "type": "SUBTASK",
    "status": "TODO",
    "parentId": "'$STORY_ID'",
    "estimate": 3
  }' | jq -r '.id')

echo "Created subtask: $SUBTASK_ID"

# 6. Move subtask to IN_PROGRESS
curl -X POST "http://localhost:8080/api/v1/projects/$PROJECT_ID/issues/$SUBTASK_ID/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'

echo "Updated subtask status to IN_PROGRESS"

# 7. View the hierarchy
curl "http://localhost:8080/api/v1/projects/$PROJECT_ID/issues/$EPIC_ID/hierarchy" | jq
```

## Error Handling

All API errors follow a consistent format:

```json
{
  "success": false,
  "message": "Brief error description",
  "details": "Detailed error information for debugging"
}
```

Common HTTP status codes:
- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `409 Conflict` - Business rule violation
- `500 Internal Server Error` - Server error

## Best Practices

1. **Use Nested Resources**: Always create issues under projects using `/projects/{id}/issues`
2. **Validate Before Acting**: Use validation endpoints before performing operations
3. **Follow Hierarchy Rules**: Epics → Stories → Subtasks
4. **Use Templates**: Start with workflow templates, customize as needed
5. **Handle Errors Gracefully**: Check response status and parse error messages

## Next Steps

- Explore the [OpenAPI documentation](http://localhost:8080/swagger) for complete API reference
- Review [Architecture Overview](../../architecture/overview.md) for system design details
- Check [Domain Entities](../../reference/technical-design/domain-entities.md) for business rules and constraints
- Join our community for support and updates

## Support

For questions or issues:
- GitHub Issues: [github.com/spiralhouse/cycletime](https://github.com/spiralhouse/cycletime)
- Documentation: [/docs](/docs)
- API Reference: [/swagger](http://localhost:8080/swagger)