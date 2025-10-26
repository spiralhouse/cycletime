---
title: "Dashboard REST API Reference"
type: reference
domain: [api, dashboard]
description: "REST API endpoints for dashboard data retrieval with intelligent caching"
dependencies: []
related: [reference/definition-of-done.md, architecture/overview.md]
keywords: [api, rest, dashboard, endpoints, caching, hierarchy]
last_updated: 2025-10-26
---

# Dashboard REST API Reference

## Overview

The Dashboard API provides read-only access to project hierarchies and system health with intelligent caching for optimal performance. All endpoints return JSON and leverage multi-tier caching with different TTLs based on data volatility.

**Key Features**:
- Batch loading to eliminate N+1 query issues
- LRU cache with TTL for frequently accessed data
- Hierarchical project structure (Epic → Story → Subtask)
- Computed statistics and metrics
- Orphaned story detection for data quality

## Base URL

```
http://localhost:8080/api/v1/dashboard
```

## Authentication

Currently unauthenticated. Future versions will require API key or JWT token.

## Common Response Headers

```
Content-Type: application/json
Cache-Control: private, max-age=300 (varies by endpoint)
```

---

## Endpoints

### GET /api/v1/dashboard

Retrieves all projects with summary statistics.

**Description**: Returns a list of all active projects with computed issue counts, optimized for dashboard project list views.

**Request**:
```bash
curl http://localhost:8080/api/v1/dashboard
```

**Response**: `200 OK`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "CycleTime Development",
    "description": "Core platform development",
    "status": "ACTIVE",
    "issueCount": 142,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T12:00:00Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Documentation",
    "description": "User and developer docs",
    "status": "ACTIVE",
    "issueCount": 28,
    "createdAt": "2025-01-05T00:00:00Z",
    "updatedAt": "2025-01-20T14:30:00Z"
  }
]
```

**Response Fields**:
- `id` (string): Project UUID
- `name` (string): Human-readable project name
- `description` (string, nullable): Optional project description
- `status` (string): Project status (ACTIVE, ARCHIVED, etc.)
- `issueCount` (integer): Total number of issues in project (computed)
- `createdAt` (ISO-8601): Creation timestamp
- `updatedAt` (ISO-8601): Last modification timestamp

**Caching**: 5 minutes

**Performance**: Single database query, batch loaded

**Use Cases**:
- Dashboard homepage project list
- Project selector dropdowns
- Project summary cards

---

### GET /api/v1/dashboard/projects/{id}

Retrieves complete project hierarchy with Epic → Story → Subtask relationships.

**Description**: Returns the full project structure with nested issues organized by hierarchy, including statistics and orphaned story detection.

**Path Parameters**:
- `id` (required, UUID): The project identifier

**Request**:
```bash
curl http://localhost:8080/api/v1/dashboard/projects/550e8400-e29b-41d4-a716-446655440000
```

**Response**: `200 OK`
```json
{
  "project": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "CycleTime Development",
    "description": "Core platform development",
    "status": "ACTIVE",
    "issueCount": 142,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T12:00:00Z"
  },
  "epics": [
    {
      "issue": {
        "id": "epic-001",
        "title": "Core Infrastructure",
        "description": "Foundation components",
        "type": "EPIC",
        "status": "IN_PROGRESS",
        "parentId": null,
        "projectId": "550e8400-e29b-41d4-a716-446655440000",
        "estimate": null,
        "assigneeId": null,
        "createdAt": "2025-01-02T00:00:00Z",
        "updatedAt": "2025-01-10T08:00:00Z"
      },
      "children": [
        {
          "issue": {
            "id": "story-001",
            "title": "Implement caching layer",
            "description": "LRU cache with TTL",
            "type": "STORY",
            "status": "DONE",
            "parentId": "epic-001",
            "projectId": "550e8400-e29b-41d4-a716-446655440000",
            "estimate": null,
            "assigneeId": "user-123",
            "createdAt": "2025-01-03T00:00:00Z",
            "updatedAt": "2025-01-08T16:00:00Z"
          },
          "children": [
            {
              "issue": {
                "id": "subtask-001",
                "title": "Create cache interface",
                "description": "Define cache contract",
                "type": "SUBTASK",
                "status": "DONE",
                "parentId": "story-001",
                "projectId": "550e8400-e29b-41d4-a716-446655440000",
                "estimate": 3,
                "assigneeId": "user-123",
                "createdAt": "2025-01-04T00:00:00Z",
                "updatedAt": "2025-01-06T12:00:00Z"
              },
              "children": []
            }
          ]
        }
      ]
    }
  ],
  "orphanedStories": [
    {
      "issue": {
        "id": "story-orphan",
        "title": "Fix login bug",
        "description": "Urgent fix needed",
        "type": "STORY",
        "status": "TODO",
        "parentId": null,
        "projectId": "550e8400-e29b-41d4-a716-446655440000",
        "estimate": null,
        "assigneeId": null,
        "createdAt": "2025-01-14T00:00:00Z",
        "updatedAt": "2025-01-14T00:00:00Z"
      },
      "children": []
    }
  ],
  "statistics": {
    "totalIssues": 142,
    "epicCount": 12,
    "storyCount": 48,
    "subtaskCount": 82,
    "orphanedStoryCount": 1,
    "totalEstimatePoints": 387
  }
}
```

**Response Fields**:
- `project` (object): Project metadata (see project list response)
- `epics` (array): Top-level epics with nested children
  - `issue` (object): Epic issue data
  - `children` (array): Nested story nodes
    - `issue` (object): Story issue data
    - `children` (array): Nested subtask nodes
- `orphanedStories` (array): Stories without valid epic parents
- `statistics` (object): Computed aggregate metrics
  - `totalIssues` (integer): Sum of all issue types
  - `epicCount` (integer): Count of epics
  - `storyCount` (integer): Count of stories
  - `subtaskCount` (integer): Count of subtasks
  - `orphanedStoryCount` (integer): Stories missing epic parents
  - `totalEstimatePoints` (integer): Sum of all estimate points

**Error Responses**:

`400 Bad Request` - Invalid UUID format
```json
{
  "error": "Invalid project ID format",
  "details": "The provided project ID is not a valid UUID"
}
```

`404 Not Found` - Project not found
```json
{
  "error": "Project not found",
  "details": "No project exists with ID: 550e8400-e29b-41d4-a716-446655440000"
}
```

**Caching**: 5 minutes per project

**Performance**:
- Two database queries (project + all issues)
- Hierarchy built in-memory (no N+1 queries)
- Optimized for projects with 1000+ issues

**Use Cases**:
- Project detail page with full hierarchy
- Tree view components
- Project health dashboards
- Epic/Story/Subtask navigation

**Orphaned Stories**:
Stories appear in `orphanedStories` when:
- `parentId` is null (should have epic parent)
- `parentId` references non-existent issue
- `parentId` references wrong issue type (not an EPIC)

This enables data quality monitoring and correction.

---

### GET /api/v1/dashboard/stories/{id}/subtasks

Lazy-loads subtasks for a specific story.

**Description**: Returns all direct subtasks of a story, useful for on-demand loading in expandable UI components.

**Path Parameters**:
- `id` (required, UUID): The story identifier

**Request**:
```bash
curl http://localhost:8080/api/v1/dashboard/stories/story-001/subtasks
```

**Response**: `200 OK`
```json
[
  {
    "id": "subtask-001",
    "title": "Create cache interface",
    "description": "Define cache contract",
    "type": "SUBTASK",
    "status": "DONE",
    "parentId": "story-001",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "estimate": 3,
    "assigneeId": "user-123",
    "createdAt": "2025-01-04T00:00:00Z",
    "updatedAt": "2025-01-06T12:00:00Z"
  },
  {
    "id": "subtask-002",
    "title": "Implement LRU eviction",
    "description": "LinkedHashMap-based LRU",
    "type": "SUBTASK",
    "status": "IN_PROGRESS",
    "parentId": "story-001",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "estimate": 5,
    "assigneeId": "user-123",
    "createdAt": "2025-01-04T00:00:00Z",
    "updatedAt": "2025-01-07T10:00:00Z"
  }
]
```

**Response Fields**: Array of issue objects (see issue structure above)

**Error Responses**:

`400 Bad Request` - Invalid UUID or not a story
```json
{
  "error": "Invalid issue ID format",
  "details": "The provided issue ID is not a valid UUID"
}
```

`404 Not Found` - Story not found
```json
{
  "error": "Story not found",
  "details": "No story exists with ID: story-001"
}
```

**Caching**: 3 minutes per story (shorter TTL due to higher volatility)

**Performance**: Single database query for direct children

**Use Cases**:
- Lazy loading in tree views
- Story detail pages
- Subtask management interfaces

---

## Performance Characteristics

### Query Optimization
- **Batch Loading**: Single query retrieves entire project hierarchy
- **In-Memory Processing**: Hierarchy construction from loaded data (no N+1 queries)
- **Database Indexes**: Optimized on `project_id`, `parent_id`, and `type` columns

### Caching Strategy
- **Project Lists**: 5-minute TTL (changes infrequently)
- **Project Hierarchies**: 5-minute TTL (structure stable)
- **Story Subtasks**: 3-minute TTL (more dynamic)
- **LRU Eviction**: Maximum 100 entries with automatic cleanup
- **Pattern Invalidation**: Wildcard-based cache key invalidation

### Expected Response Times
- **Project List**: < 50ms (cached), < 200ms (uncached)
- **Project Hierarchy**: < 100ms (cached), < 500ms (uncached for 500 issues)
- **Story Subtasks**: < 30ms (cached), < 100ms (uncached)

## Architecture

### Cache Implementation
See [ADR-0007: Dashboard Cache Implementation](../adr/0007-dashboard-cache-implementation.md) for detailed architecture decisions including:
- LRU eviction strategy
- TTL-based expiration
- Thread safety guarantees
- Pattern-based invalidation

### Data Model
```
Project (1)
 └─ Epic (N)
     └─ Story (N)
         └─ Subtask (N)
```

### Technology Stack
- **Framework**: Ktor 3.3.1 with native DI
- **ORM**: Exposed 0.61.0 type-safe SQL DSL
- **Database**: H2 embedded database
- **Serialization**: kotlinx.serialization

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Short error message",
  "details": "Detailed explanation for debugging"
}
```

**HTTP Status Codes**:
- `200 OK` - Successful request
- `400 Bad Request` - Invalid input (malformed UUID, wrong type)
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Unexpected server error

## Future Enhancements

**Planned Features**:
- Authentication and authorization (API keys, JWT)
- Pagination for large project lists
- Filtering and sorting options
- WebSocket support for real-time updates
- GraphQL endpoint for flexible queries
- Rate limiting and quota management
- Metrics and monitoring endpoints

## Example Usage

### JavaScript/TypeScript
```typescript
// Fetch all projects
const projects = await fetch('http://localhost:8080/api/v1/dashboard')
  .then(res => res.json());

// Get project hierarchy
const hierarchy = await fetch(
  `http://localhost:8080/api/v1/dashboard/projects/${projectId}`
).then(res => res.json());

// Lazy load story subtasks
const subtasks = await fetch(
  `http://localhost:8080/api/v1/dashboard/stories/${storyId}/subtasks`
).then(res => res.json());
```

### Python
```python
import requests

# Fetch all projects
response = requests.get('http://localhost:8080/api/v1/dashboard')
projects = response.json()

# Get project hierarchy
response = requests.get(
    f'http://localhost:8080/api/v1/dashboard/projects/{project_id}'
)
hierarchy = response.json()

# Lazy load story subtasks
response = requests.get(
    f'http://localhost:8080/api/v1/dashboard/stories/{story_id}/subtasks'
)
subtasks = response.json()
```

### cURL
```bash
# Fetch all projects
curl http://localhost:8080/api/v1/dashboard

# Get project hierarchy (formatted)
curl http://localhost:8080/api/v1/dashboard/projects/550e8400-e29b-41d4-a716-446655440000 \
  | jq '.'

# Lazy load story subtasks
curl http://localhost:8080/api/v1/dashboard/stories/story-001/subtasks
```

## Testing

### Integration Tests
The Dashboard API has comprehensive integration test coverage (92%):
- Project list retrieval
- Hierarchy construction with valid/invalid parents
- Subtask lazy loading
- Error scenarios (404, 400)
- Caching behavior verification

See `/src/integrationTest/kotlin/io/spiralhouse/cycletime/integration/dashboard/` for test suite.

### Manual Testing
```bash
# Start server
./gradlew run

# Test endpoints
curl http://localhost:8080/api/v1/dashboard
curl http://localhost:8080/api/v1/dashboard/projects/{project-id}
curl http://localhost:8080/api/v1/dashboard/stories/{story-id}/subtasks
```

## Related Documentation

- [Architecture Overview](../../architecture/overview.md) - System design and patterns
- [ADR-0007: Cache Implementation](../adr/0007-dashboard-cache-implementation.md) - Caching architecture
- [Definition of Done](../definition-of-done.md) - Quality criteria
- [Testing Standards](../../guides/testing/testing-standards.md) - Test strategy
