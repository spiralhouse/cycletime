# AI Service Integration Guide

## Overview

The AI Service provides unified access to multiple AI providers (OpenAI, Anthropic, Google, Azure) with intelligent request management, provider health monitoring, and usage analytics. This guide explains how to integrate with the AI Service contracts.

## Service Contracts

### OpenAPI Specification
- **Location**: `/packages/ai-service/openapi.yaml`
- **Base URL**: `http://localhost:8003` (development)
- **Version**: 1.0.0
- **Authentication**: Bearer token required

### AsyncAPI Specification  
- **Location**: `/packages/ai-service/asyncapi.yaml`
- **Message Broker**: Redis (production), EventEmitter (development)
- **Events**: 25 published, 6 consumed

## Service Endpoints

### AI Request Management
```
POST   /api/v1/ai/requests           # Create AI request
GET    /api/v1/ai/requests/{id}      # Get request details
GET    /api/v1/ai/requests/{id}/status # Get request status
GET    /api/v1/ai/requests/{id}/response # Get AI response
DELETE /api/v1/ai/requests/{id}      # Cancel request
```

### Provider Management
```
GET    /api/v1/ai/providers          # List available providers
GET    /api/v1/ai/providers/{id}     # Get provider details
GET    /api/v1/ai/providers/{id}/models # List provider models
POST   /api/v1/ai/providers/{id}/health # Check provider health
```

### Usage Analytics
```
GET    /api/v1/ai/usage              # Get usage statistics
GET    /api/v1/ai/usage/{providerId} # Provider-specific usage
GET    /api/v1/ai/usage/costs        # Cost analytics
GET    /api/v1/ai/usage/metrics      # Performance metrics
```

### Administration
```
GET    /api/v1/ai/health             # Service health check
GET    /api/v1/ai/metrics            # Service metrics
POST   /api/v1/ai/config/reload      # Reload configuration
```

## Key Events

### Published Events
- `ai/request/received` - New AI request received
- `ai/request/processing` - Request processing started
- `ai/request/completed` - Request completed successfully
- `ai/request/failed` - Request failed
- `ai/provider/health/changed` - Provider health status changed
- `ai/usage/threshold/reached` - Usage threshold alert

### Consumed Events
- `project/created` - Project created (triggers context setup)
- `project/updated` - Project updated (context refresh)
- `context/updated` - Context data changed
- `standards/updated` - Standards updated

## Integration Patterns

### Request-Response Pattern
Use HTTP API for synchronous operations:
- Creating AI requests
- Checking request status
- Retrieving responses
- Getting provider information

### Event-Driven Pattern
Use AsyncAPI events for:
- Real-time status updates
- Analytics and monitoring
- Workflow automation
- Cross-service notifications

## Authentication

All API endpoints require Bearer token authentication:

```http
Authorization: Bearer <your-token>
```

Tokens are managed by the API Gateway and validated by the AI Service.

## Error Handling

Standard HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

Error responses follow standardized format:
```json
{
  "error": "error_code",
  "message": "Human readable error message",
  "details": {},
  "timestamp": "2025-01-20T10:00:00Z"
}
```

## Rate Limiting

- Standard endpoints: 100 requests/minute
- AI request creation: 10 requests/minute
- Health checks: No limit

Rate limit headers included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642680000
```

## Service Discovery

Health check endpoint for load balancers and service discovery:
```
GET /api/v1/ai/health
```

Response includes:
- Service status (`healthy`, `degraded`, `unhealthy`)
- Component health (database, providers, queue)
- Uptime and version information

## Next Steps

- [API Usage Examples](./ai-service-api-examples.md) - Code examples for common operations
- [Event Integration Guide](./ai-service-events.md) - Event subscription patterns
- [Stub Behavior Guide](./ai-service-stub-guide.md) - Development and testing with stubs