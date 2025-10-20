---
title: "API Migration Guide"
type: guide
domain: [api, development, migration]
description: "Migrating from legacy API to v1 - breaking changes, updated endpoints, and code examples"
dependencies: []
related: [../../reference/api/rest-api-reference.md, api-best-practices.md]
keywords: [api, migration, versioning, breaking-changes]
last_updated: 2025-10-19
---

# API Migration Guide - v1

## Overview

This guide helps developers migrate from the legacy API endpoints to the new v1 API structure introduced in SPI-634. The v1 API implements REST Level 2 compliance with proper resource nesting, versioning, and standardized patterns.

## Key Improvements

### 1. API Versioning
All endpoints now include explicit version in the URL path for better backward compatibility management.

### 2. Nested Resources
Child resources are properly nested under parent resources following REST best practices.

### 3. Query Parameters
Template-based endpoints now use query parameters instead of path segments.

### 4. Standardized Responses
Consistent error handling and response formats across all endpoints.

## Migration Checklist

- [ ] Update all API endpoint URLs to include `/v1` version prefix
- [ ] Refactor issue creation to use nested project context
- [ ] Update workflow template requests to use query parameters
- [ ] Implement proper error handling for new error response format
- [ ] Update API client libraries with new endpoint patterns
- [ ] Test all integrations with the new API structure

## Endpoint Migration Reference

### Projects

#### Create Project
```kotlin
// OLD
POST /api/projects
{
    "name": "My Project",
    "description": "Project description"
}

// NEW
POST /api/v1/projects
{
    "name": "My Project",
    "description": "Project description"
}
```

#### Get Project
```kotlin
// OLD
GET /api/projects/{projectId}

// NEW
GET /api/v1/projects/{projectId}
```

#### List Projects
```kotlin
// OLD
GET /api/projects

// NEW
GET /api/v1/projects
```

#### Update Project
```kotlin
// OLD
PUT /api/projects/{projectId}
{
    "name": "Updated Name",
    "description": "Updated description"
}

// NEW
PUT /api/v1/projects/{projectId}
{
    "name": "Updated Name",
    "description": "Updated description"
}
```

#### Delete Project
```kotlin
// OLD
DELETE /api/projects/{projectId}

// NEW
DELETE /api/v1/projects/{projectId}
```

### Issues - Major Changes

#### Create Issue (Nested Resource Pattern)
```kotlin
// OLD - Issue created without project context
POST /api/issues
{
    "projectId": "123",
    "title": "Issue Title",
    "description": "Issue description",
    "type": "STORY"
}

// NEW - Issue created within project context
POST /api/v1/projects/{projectId}/issues
{
    "title": "Issue Title",
    "description": "Issue description",
    "type": "STORY"
}
```

**Benefits of Nested Pattern:**
- Enforces project context at the API level
- Clearer resource relationships
- Simplified request payload (no need to specify projectId)
- Better authorization scoping

#### Get Issue
```kotlin
// OLD
GET /api/issues/{issueId}

// NEW
GET /api/v1/issues/{issueId}
```

#### List Issues for Project
```kotlin
// OLD - Not available or custom endpoint
GET /api/projects/{projectId}/issues  // Inconsistent

// NEW - Standardized nested resource
GET /api/v1/projects/{projectId}/issues
```

#### Update Issue
```kotlin
// OLD
PUT /api/issues/{issueId}
{
    "title": "Updated Title",
    "description": "Updated description",
    "status": "IN_PROGRESS"
}

// NEW
PUT /api/v1/issues/{issueId}
{
    "title": "Updated Title",
    "description": "Updated description",
    "status": "IN_PROGRESS"
}
```

#### Delete Issue
```kotlin
// OLD
DELETE /api/issues/{issueId}

// NEW
DELETE /api/v1/issues/{issueId}
```

### Workflows - Query Parameter Pattern

#### Get Workflow Template
```kotlin
// OLD - Template as path parameter
POST /api/workflows/{template}
GET /api/workflows/default
GET /api/workflows/bug
GET /api/workflows/feature

// NEW - Template as query parameter
GET /api/v1/workflows?template=default
GET /api/v1/workflows?template=bug
GET /api/v1/workflows?template=feature
GET /api/v1/workflows  // Defaults to 'default' template
```

**Benefits of Query Pattern:**
- RESTful resource identification
- Cleaner URL structure
- Better caching strategies
- Easier to add optional parameters

#### Create Workflow
```kotlin
// OLD
POST /api/workflows
{
    "name": "Custom Workflow",
    "states": [...]
}

// NEW
POST /api/v1/workflows
{
    "name": "Custom Workflow",
    "states": [...]
}
```

#### Workflow Transitions
```kotlin
// OLD - Action in URL path
POST /api/workflows/{workflowId}/validate-transition
{
    "fromState": "TODO",
    "toState": "IN_PROGRESS"
}

// NEW - Resource-based URL
POST /api/v1/workflows/{workflowId}/transitions/validation
{
    "fromState": "TODO",
    "toState": "IN_PROGRESS"
}
```

### Sessions

#### Create Session
```kotlin
// OLD
POST /api/sessions
{
    "projectId": "123",
    "metadata": {...}
}

// NEW
POST /api/v1/sessions
{
    "projectId": "123",
    "metadata": {...}
}
```

#### Get Session
```kotlin
// OLD
GET /api/sessions/{sessionId}

// NEW
GET /api/v1/sessions/{sessionId}
```

#### Update Session State
```kotlin
// OLD
PUT /api/sessions/{sessionId}/state
{
    "state": {...}
}

// NEW
PUT /api/v1/sessions/{sessionId}/state
{
    "state": {...}
}
```

### Health Check

```kotlin
// OLD
GET /api/health

// NEW
GET /api/v1/health
```

## Error Response Format

All error responses now follow a consistent structure:

```json
{
    "error": "User-friendly error message",
    "details": "Specific error details (optional)",
    "timestamp": "2025-01-20T10:30:00Z"
}
```

### HTTP Status Code Mappings

| Exception Type | HTTP Status | Description |
|---------------|-------------|-------------|
| `NotFoundException` | 404 | Resource not found |
| `ValidationException` | 400 | Invalid request data |
| `BusinessRuleViolationException` | 400 | Business rule violated |
| `InvalidStatusTransitionException` | 422 | Invalid state transition |
| `AuthorizationException` | 403 | Not authorized |
| `AuthenticationException` | 401 | Not authenticated |
| `ConflictException` | 409 | Resource conflict |
| `Throwable` | 500 | Internal server error |

## Client Code Migration Examples

### Kotlin/Ktor Client

#### Before Migration
```kotlin
class LegacyApiClient(private val client: HttpClient) {
    suspend fun createIssue(projectId: String, title: String): IssueDto {
        return client.post("/api/issues") {
            contentType(ContentType.Application.Json)
            setBody(CreateIssueRequest(
                projectId = projectId,
                title = title,
                type = "STORY"
            ))
        }.body()
    }

    suspend fun getWorkflow(template: String): WorkflowDto {
        return client.get("/api/workflows/$template").body()
    }
}
```

#### After Migration
```kotlin
class V1ApiClient(private val client: HttpClient) {
    suspend fun createIssue(projectId: String, title: String): IssueDto {
        return client.post("/api/v1/projects/$projectId/issues") {
            contentType(ContentType.Application.Json)
            setBody(CreateIssueRequest(
                title = title,  // No projectId needed
                type = "STORY"
            ))
        }.body()
    }

    suspend fun getWorkflow(template: String = "default"): WorkflowDto {
        return client.get("/api/v1/workflows") {
            parameter("template", template)
        }.body()
    }
}
```

### JavaScript/TypeScript Client

#### Before Migration
```typescript
class LegacyApiClient {
    async createIssue(projectId: string, title: string): Promise<Issue> {
        const response = await fetch('/api/issues', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId,
                title,
                type: 'STORY'
            })
        });
        return response.json();
    }

    async getWorkflow(template: string): Promise<Workflow> {
        const response = await fetch(`/api/workflows/${template}`);
        return response.json();
    }
}
```

#### After Migration
```typescript
class V1ApiClient {
    async createIssue(projectId: string, title: string): Promise<Issue> {
        const response = await fetch(`/api/v1/projects/${projectId}/issues`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,  // No projectId needed
                type: 'STORY'
            })
        });
        return response.json();
    }

    async getWorkflow(template: string = 'default'): Promise<Workflow> {
        const params = new URLSearchParams({ template });
        const response = await fetch(`/api/v1/workflows?${params}`);
        return response.json();
    }
}
```

## Testing Your Migration

### 1. Update Test Endpoints
```kotlin
// Update all test files
class ProjectApiTest : StringSpec({
    "should create project" {
        testApplication {
            val response = client.post("/api/v1/projects") {
                // ... request body
            }
            response.status shouldBe HttpStatusCode.Created
        }
    }
})
```

### 2. Test Nested Resources
```kotlin
"should create issue in project context" {
    testApplication {
        // Create project first
        val project = createTestProject()

        // Create issue within project
        val response = client.post("/api/v1/projects/${project.id}/issues") {
            contentType(ContentType.Application.Json)
            setBody("""{"title": "Test Issue", "type": "STORY"}""")
        }

        response.status shouldBe HttpStatusCode.Created
        val issue = response.body<IssueDto>()
        issue.projectId shouldBe project.id
    }
}
```

### 3. Test Error Handling
```kotlin
"should handle 404 errors correctly" {
    testApplication {
        val response = client.get("/api/v1/projects/non-existent")

        response.status shouldBe HttpStatusCode.NotFound
        val error = response.body<ErrorResponse>()
        error.error shouldBe "Project not found"
        error.timestamp shouldNotBe null
    }
}
```

## Breaking Changes

### 1. Issue Creation Requires Project Context
- **Impact**: Direct issue creation without project context no longer supported
- **Migration**: Always create issues through `/api/v1/projects/{projectId}/issues`
- **Benefit**: Enforces proper resource relationships

### 2. Workflow Template Access Pattern
- **Impact**: Path-based template selection removed
- **Migration**: Use query parameters for template selection
- **Benefit**: Cleaner URL structure and better REST compliance

### 3. Consistent Error Response Format
- **Impact**: Error response structure changed
- **Migration**: Update error handling to parse new format
- **Benefit**: Predictable error handling across all endpoints

## Deprecation Timeline

- **Legacy API Status**: Deprecated as of v1.0.0
- **Support Period**: Legacy endpoints will be maintained for 6 months
- **Removal Date**: Legacy endpoints will be removed in v2.0.0
- **Recommendation**: Migrate to v1 API as soon as possible

## Common Migration Issues

### Issue 1: Missing Project Context
**Problem**: Attempting to create issues without project ID in URL
```kotlin
// This will fail
POST /api/v1/issues
```

**Solution**: Always use nested resource pattern
```kotlin
POST /api/v1/projects/{projectId}/issues
```

### Issue 2: Template in Path Instead of Query
**Problem**: Using old path-based template selection
```kotlin
// This will return 404
GET /api/v1/workflows/bug
```

**Solution**: Use query parameters
```kotlin
GET /api/v1/workflows?template=bug
```

### Issue 3: Expecting Old Error Format
**Problem**: Parsing errors using old field names
```kotlin
// Old format had different fields
val message = error["message"]  // Field doesn't exist
```

**Solution**: Use new error format
```kotlin
val message = error["error"]  // Correct field name
val details = error["details"]  // Optional field
val timestamp = error["timestamp"]  // Always present
```

## Performance Improvements

The v1 API includes several performance optimizations:

1. **Reduced Payload Size**: Nested resources eliminate redundant data
2. **Better Caching**: Query parameters enable more effective HTTP caching
3. **Optimized Queries**: Resource relationships enable query optimization
4. **Batch Operations**: Future support for batch operations through nested resources

## Security Enhancements

1. **Scoped Authorization**: Nested resources enable better permission scoping
2. **Input Validation**: Stricter validation at the API gateway level
3. **Rate Limiting**: Per-resource rate limiting capabilities
4. **Audit Trail**: Better tracking through resource relationships

## Support and Resources

- **API Documentation**: [OpenAPI Specification](../reference/openapi.yaml)
- **Integration Examples**: [Client Examples](../examples/clients/)
- **Support Channel**: [GitHub Issues](https://github.com/your-org/cycletime/issues)
- **Migration Assistance**: Contact the development team for migration support

## Next Steps

1. **Audit Current Integrations**: Identify all systems using the legacy API
2. **Plan Migration**: Schedule migration based on system criticality
3. **Update Clients**: Implement v1 API client updates
4. **Test Thoroughly**: Comprehensive testing with new endpoints
5. **Deploy Gradually**: Use feature flags for gradual rollout
6. **Monitor**: Track API usage and error rates during migration
7. **Deprecate Legacy**: Remove legacy API usage once migration complete

## Version History

- **v1.0.0** (2025-01-20): Initial v1 API release with REST Level 2 compliance
- **v0.x.x** (Legacy): Pre-v1 API without versioning or proper nesting