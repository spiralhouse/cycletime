# API Gateway Service Integration Guide

## Overview

The CycleTime API Gateway provides a unified entry point for all microservices with authentication, authorization, rate limiting, and service routing. This guide explains how to integrate new services and work with the existing service routing framework.

## Service Routing Architecture

### Current Services

The API Gateway currently supports routing to the following services:

| Service | Port | Path Pattern | Description |
|---------|------|-------------|-------------|
| ai-service | 8007 | `/api/v1/ai-service/{proxy+}` | AI/ML processing and analysis |
| project-service | 8010 | `/api/v1/project-service/{proxy+}` | Project lifecycle management |
| task-service | 8011 | `/api/v1/task-service/{proxy+}` | Task orchestration and breakdown |
| document-service | 8008 | `/api/v1/document-service/{proxy+}` | Document storage and retrieval |
| context-management-service | 8009 | `/api/v1/context-management/{proxy+}` | Context window management |
| standards-engine | 8012 | `/api/v1/standards-engine/{proxy+}` | Code standards validation |
| notification-service | 8013 | `/api/v1/notification-service/{proxy+}` | Event notifications |
| document-indexing-service | 8014 | `/api/v1/document-indexing-service/{proxy+}` | Document search and indexing |
| contract-generation-engine | 8015 | `/api/v1/contract-generation-engine/{proxy+}` | API contract generation |
| mcp-server | 8016 | `/api/v1/mcp-server/{proxy+}` | Model Context Protocol server |
| cli-service | 8017 | `/api/v1/cli-service/{proxy+}` | Command line interface service |
| issue-tracker-service | 8006 | `/api/v1/issue-tracker/{proxy+}` | Issue tracking integration |
| web-dashboard | 8005 | `/api/v1/web-dashboard/{proxy+}` | Web dashboard interface |

### Service Discovery

Services are configured in `/src/config/gateway-config.ts` with the following properties:

```typescript
interface ServiceConfig {
  name: string;
  url: string;
  healthCheck: string;
  circuitBreaker: {
    maxFailures: number;
    resetTimeout: number;
    monitoringPeriod: number;
  };
  rateLimit: {
    max: number;
    timeWindow: string;
  };
  retries: number;
  timeout: number;
  loadBalancer: {
    strategy: 'round-robin' | 'least-connections' | 'weighted';
    healthCheckInterval: number;
  };
}
```

## Adding New Services

### 1. Update Gateway Configuration

Add your service to `/src/config/gateway-config.ts`:

```typescript
export const gatewayConfig: GatewayConfig = {
  // ... existing config
  services: [
    // ... existing services
    {
      name: 'your-new-service',
      url: 'http://localhost:8018',
      healthCheck: '/health',
      circuitBreaker: {
        maxFailures: 5,
        resetTimeout: 30000,
        monitoringPeriod: 60000,
      },
      rateLimit: {
        max: 1000,
        timeWindow: '1 minute',
      },
      retries: 3,
      timeout: 30000,
      loadBalancer: {
        strategy: 'round-robin',
        healthCheckInterval: 30000,
      },
    },
  ],
};
```

### 2. Update OpenAPI Specification

Add your service routes to `/openapi.yaml`:

```yaml
/api/v1/your-new-service/{proxy+}:
  x-amazon-apigateway-any-method:
    summary: Proxy all requests to your-new-service
    description: Forwards all HTTP methods to the your-new-service
    parameters:
      - name: proxy
        in: path
        required: true
        schema:
          type: string
        style: simple
        explode: false
    security:
      - BearerAuth: []
    responses:
      '200':
        description: Success response from your-new-service
        content:
          application/json:
            schema:
              type: object
      '401':
        description: Unauthorized
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
      '502':
        description: Bad Gateway - Service unavailable
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

### 3. Update AsyncAPI Specification

Add event channels for your service to `/asyncapi.yaml`:

```yaml
channels:
  gateway/your-new-service:
    description: Events related to your-new-service routing
    messages:
      YourNewServiceRequestReceived:
        $ref: '#/components/messages/GatewayRequestReceived'
      YourNewServiceRequestCompleted:
        $ref: '#/components/messages/GatewayRequestCompleted'
```

### 4. Update Mock Data Service

Add mock responses for your service to `/src/services/mock-data-service.ts`:

```typescript
private getServiceMockData(serviceName: string, method: string, path: string): any {
  switch (serviceName) {
    // ... existing cases
    case 'your-new-service':
      return this.getYourNewServiceMockData(method, path);
    // ... rest of cases
  }
}

private getYourNewServiceMockData(method: string, path: string): any {
  switch (method) {
    case 'GET':
      if (path.includes('/status')) {
        return {
          status: 'operational',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        };
      }
      return {
        data: [],
        total: 0,
        timestamp: new Date().toISOString(),
      };
    case 'POST':
      return {
        id: `your-new-service-${Date.now()}`,
        status: 'created',
        timestamp: new Date().toISOString(),
      };
    default:
      return {
        message: `${method} method supported`,
        timestamp: new Date().toISOString(),
      };
  }
}
```

### 5. Update Contract Tests

Add your service to the contract test suites:

In `/src/__tests__/contract/simple-contracts.test.ts`:
```typescript
const requiredServices = [
  // ... existing services
  'your-new-service',
];
```

In `/src/__tests__/contract/api-contracts.test.ts`:
```typescript
const requiredServices = [
  // ... existing services
  'your-new-service',
];
```

## Circuit Breaker Pattern

The API Gateway implements circuit breaker pattern for each service:

### States

1. **Closed**: Normal operation, requests flow through
2. **Open**: Service is failing, requests return mock responses
3. **Half-Open**: Testing if service has recovered

### Configuration

```typescript
circuitBreaker: {
  maxFailures: 5,        // Open after 5 consecutive failures
  resetTimeout: 30000,   // Try to close after 30 seconds
  monitoringPeriod: 60000, // Monitor failures over 60 seconds
}
```

### Mock Response Fallback

When a circuit breaker is open, the gateway returns mock responses from the MockDataService:

```typescript
// Circuit breaker open - return mock response
if (circuitBreaker.isOpen()) {
  const mockResponse = await mockDataService.getMockResponse(
    serviceName,
    request.method,
    request.url,
    'service_unavailable'
  );
  return reply.code(mockResponse.statusCode).send(mockResponse.body);
}
```

## Authentication & Authorization

### JWT Bearer Token

All service routes require Bearer token authentication:

```typescript
// Request headers
{
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'Content-Type': 'application/json'
}
```

### Token Validation

The gateway validates JWT tokens and extracts user context:

```typescript
interface FastifyRequestContext {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  requestId: string;
  timestamp: number;
}
```

## Rate Limiting

### Service-Level Rate Limiting

Each service has individual rate limits:

```typescript
rateLimit: {
  max: 1000,           // Maximum requests
  timeWindow: '1 minute', // Time window
}
```

### Global Rate Limiting

Gateway-wide rate limiting is applied before service routing:

```typescript
{
  max: 10000,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.ip,
}
```

## Event Publishing

The gateway publishes events for monitoring and analytics:

### Request Lifecycle Events

```typescript
// Request received
{
  type: 'gateway.request.received',
  requestId: 'req-123',
  method: 'GET',
  path: '/api/v1/ai-service/models',
  timestamp: '2024-01-01T00:00:00.000Z',
  userAgent: 'curl/7.68.0',
  ip: '192.168.1.100'
}

// Request routed
{
  type: 'gateway.request.routed',
  requestId: 'req-123',
  service: 'ai-service',
  targetUrl: 'http://localhost:8007/models',
  timestamp: '2024-01-01T00:00:00.100Z'
}

// Request completed
{
  type: 'gateway.request.completed',
  requestId: 'req-123',
  service: 'ai-service',
  statusCode: 200,
  responseTime: 150,
  timestamp: '2024-01-01T00:00:00.250Z'
}
```

### Service Health Events

```typescript
{
  type: 'service.health.changed',
  service: 'ai-service',
  status: 'healthy' | 'unhealthy' | 'degraded',
  timestamp: '2024-01-01T00:00:00.000Z',
  details: {
    responseTime: 150,
    errorRate: 0.01,
    circuitBreakerState: 'closed'
  }
}
```

## Error Handling

### Standard Error Response Format

All services return consistent error responses:

```typescript
{
  error: string;           // Error code
  message: string;         // Human-readable message
  timestamp: string;       // ISO 8601 timestamp
  requestId?: string;      // Request correlation ID
  details?: any;           // Additional error details
}
```

### Common Error Codes

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | BadRequest | Invalid request format |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | NotFound | Resource not found |
| 429 | RateLimitExceeded | Too many requests |
| 502 | BadGateway | Service unavailable |
| 503 | ServiceUnavailable | Circuit breaker open |

## Health Checks

### Gateway Health

```bash
GET /health
```

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "ai-service": "healthy",
    "project-service": "healthy",
    "task-service": "degraded"
  }
}
```

### Service Health

Each service implements its own health check endpoint:

```bash
GET /api/v1/{service-name}/health
```

## Metrics and Monitoring

### Gateway Metrics

```bash
GET /metrics
```

```json
{
  "requestCount": 1000,
  "responseTime": {
    "avg": 150,
    "p95": 300,
    "p99": 500
  },
  "errorRate": 0.01,
  "circuitBreakerStates": {
    "ai-service": "closed",
    "project-service": "closed"
  }
}
```

### Service Metrics

Individual service metrics are available through service-specific endpoints:

```bash
GET /api/v1/{service-name}/metrics
```

## Development and Testing

### Running Contract Tests

```bash
# Run all contract tests
npm test -- --testPathPattern="contract"

# Run specific contract tests
npm test -- src/__tests__/contract/simple-contracts.test.ts
```

### Mock Response Testing

Enable mock responses for testing:

```bash
export MOCK_RESPONSES_ENABLED=true
export MOCK_RESPONSE_DELAY=100
export MOCK_ERROR_RATE=0.1
```

### Local Development

1. Start the gateway in development mode:
```bash
npm run dev
```

2. The gateway will be available at `http://localhost:8000`

3. API documentation is available at `http://localhost:8000/docs`

## Troubleshooting

### Common Issues

1. **Service Unavailable (502)**
   - Check if the target service is running
   - Verify the service URL in gateway-config.ts
   - Check circuit breaker status

2. **Authentication Failures (401)**
   - Verify JWT token format
   - Check token expiration
   - Ensure Bearer prefix is included

3. **Rate Limit Exceeded (429)**
   - Check service-specific rate limits
   - Verify global rate limit settings
   - Consider implementing client-side rate limiting

4. **Contract Test Failures**
   - Verify service names match between config and tests
   - Check OpenAPI specification syntax
   - Ensure all required services are listed

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=debug
export NODE_ENV=development
```

### Service Discovery Issues

Check service registration:

```bash
# Check service health
curl -X GET http://localhost:8000/api/v1/{service-name}/health

# Check circuit breaker status
curl -X GET http://localhost:8000/admin/services
```

## Best Practices

1. **Service Design**
   - Implement health check endpoints
   - Use consistent error response formats
   - Support graceful degradation

2. **Rate Limiting**
   - Set appropriate rate limits for each service
   - Consider different limits for different endpoints
   - Implement client-side rate limiting

3. **Error Handling**
   - Always return structured error responses
   - Include correlation IDs for debugging
   - Log errors with appropriate detail

4. **Testing**
   - Update contract tests when adding services
   - Test circuit breaker behavior
   - Verify mock response accuracy

5. **Monitoring**
   - Monitor circuit breaker states
   - Track response times and error rates
   - Set up alerts for service degradation

## Integration Examples

### Example Service Implementation

```typescript
// Your service should implement:
app.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  };
});

app.get('/metrics', async (request, reply) => {
  return {
    requestCount: metrics.requestCount,
    responseTime: metrics.avgResponseTime,
    errorRate: metrics.errorRate,
  };
});
```

### Example Client Code

```typescript
// Client making requests through the gateway
const response = await fetch('http://localhost:8000/api/v1/ai-service/models', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Request-ID': 'req-123',
  },
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(`API Error: ${error.error} - ${error.message}`);
}

const data = await response.json();
```

## Future Enhancements

1. **Service Mesh Integration**
   - Implement Istio or Linkerd integration
   - Add mTLS support
   - Implement distributed tracing

2. **Advanced Load Balancing**
   - Implement weighted round-robin
   - Add health-based routing
   - Support canary deployments

3. **Enhanced Monitoring**
   - Add Prometheus metrics
   - Implement distributed tracing
   - Add custom dashboards

4. **Security Enhancements**
   - Add OAuth2 support
   - Implement API key authentication
   - Add request signing

For more information or support, please refer to the project documentation or contact the development team.