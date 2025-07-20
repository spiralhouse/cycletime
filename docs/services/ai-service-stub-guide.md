# AI Service Stub Behavior Guide

## Overview

The AI Service stub provides realistic mock implementations for development and testing. This guide explains the stub behavior, mock data patterns, and timing characteristics.

## Stub vs Production Behavior

### Stub Mode
- **Response Time**: <100ms for all endpoints
- **Processing Simulation**: 2-30 seconds for AI requests  
- **Mock Data**: Realistic but generated responses
- **Provider Health**: Simulated status changes
- **Error Scenarios**: Configurable failure rates

### Production Mode
- **Response Time**: Variable based on actual AI provider
- **Processing Time**: Actual AI processing (2-60+ seconds)
- **Real Data**: Actual AI provider responses
- **Provider Health**: Real provider status
- **Error Scenarios**: Actual provider errors

## Mock Request Processing

### Request Creation (Always Fast)
All request creation endpoints respond within 100ms:

```json
POST /api/v1/ai/requests
Response (201): {
  "id": "req_mock_1234567890",
  "status": "pending",
  "type": "chat_completion",
  "createdAt": "2025-01-20T10:00:00Z",
  "estimatedCompletion": "2025-01-20T10:00:15Z",
  "provider": "claude"
}
```

### Processing Simulation
Mock processing takes 2-30 seconds based on request type:

#### Chat Completion (2-8 seconds)
```javascript
// Status progression:
// pending (0s) → processing (2s) → completed (5-8s)

// Mock response after completion:
{
  "id": "req_mock_1234567890",
  "status": "completed", 
  "response": {
    "content": "This is a mock AI response based on your input. The actual service would provide real AI-generated content here.",
    "model": "claude-3-sonnet",
    "tokensUsed": 245,
    "finishReason": "stop"
  },
  "processingTime": 6.2,
  "cost": 0.0019
}
```

#### Project Analysis (10-25 seconds)
```javascript
// Status progression:
// pending (0s) → processing (3s) → completed (15-25s)

// Mock response includes comprehensive analysis:
{
  "id": "req_mock_2345678901",
  "status": "completed",
  "response": {
    "analysis": {
      "overview": "Mock project analysis indicating strong architecture with opportunities for optimization.",
      "strengths": [
        "Well-structured codebase with clear separation of concerns",
        "Comprehensive testing coverage (89%)",
        "Good documentation practices"
      ],
      "recommendations": [
        "Consider implementing caching layer for frequently accessed data",
        "Optimize database queries in user service",
        "Add monitoring for third-party API dependencies"
      ],
      "metrics": {
        "codeQuality": 8.5,
        "maintainability": 7.8,
        "performance": 7.2
      }
    },
    "tokensUsed": 1847,
    "processingTime": 18.3,
    "cost": 0.0142
  }
}
```

#### Embedding Generation (3-10 seconds)
```javascript
// Mock embeddings with realistic dimensions
{
  "id": "req_mock_3456789012", 
  "status": "completed",
  "response": {
    "embeddings": [
      {
        "object": "embedding",
        "index": 0,
        "embedding": [0.123, -0.456, 0.789, /* ... 1536 dimensions */]
      }
    ],
    "model": "text-embedding-3-small",
    "tokensUsed": 156,
    "processingTime": 4.7,
    "cost": 0.0001
  }
}
```

#### Context Analysis (15-30 seconds)
```javascript
// Most complex mock processing
{
  "id": "req_mock_4567890123",
  "status": "completed", 
  "response": {
    "contextSummary": {
      "documentsAnalyzed": 23,
      "codeFilesAnalyzed": 156,
      "keyThemes": [
        "Microservices architecture",
        "Event-driven communication", 
        "TypeScript/Node.js stack"
      ],
      "technicalDebt": {
        "score": 3.2,
        "areas": ["Legacy authentication", "Inconsistent error handling"]
      }
    },
    "recommendations": {
      "immediate": ["Standardize error response format"],
      "shortTerm": ["Implement service mesh", "Add distributed tracing"],
      "longTerm": ["Consider event sourcing pattern"]
    },
    "tokensUsed": 3241,
    "processingTime": 24.8,
    "cost": 0.0251
  }
}
```

## Provider Mock Behavior

### Provider Listing
```json
GET /api/v1/ai/providers
Response (200): {
  "providers": [
    {
      "id": "claude",
      "name": "Anthropic Claude",
      "status": "healthy",
      "models": ["claude-3-sonnet", "claude-3-haiku"],
      "capabilities": ["chat", "analysis", "code"],
      "costPer1kTokens": 0.008,
      "rateLimit": {
        "requestsPerMinute": 60,
        "tokensPerMinute": 100000
      }
    },
    {
      "id": "openai",
      "name": "OpenAI GPT",
      "status": "healthy", 
      "models": ["gpt-4", "gpt-3.5-turbo"],
      "capabilities": ["chat", "analysis", "embeddings"],
      "costPer1kTokens": 0.006,
      "rateLimit": {
        "requestsPerMinute": 100,
        "tokensPerMinute": 150000
      }
    },
    {
      "id": "google",
      "name": "Google Gemini",
      "status": "degraded",
      "models": ["gemini-pro"],
      "capabilities": ["chat", "analysis"],
      "costPer1kTokens": 0.004,
      "rateLimit": {
        "requestsPerMinute": 30,
        "tokensPerMinute": 50000
      }
    }
  ]
}
```

### Provider Health Simulation
Provider health changes randomly every 2-5 minutes:
- 70% chance: `healthy`
- 20% chance: `degraded` 
- 10% chance: `unhealthy`

Health check endpoint:
```json
POST /api/v1/ai/providers/claude/health
Response (200): {
  "providerId": "claude",
  "status": "healthy",
  "responseTime": 145,
  "lastError": null,
  "uptime": "99.8%",
  "checkedAt": "2025-01-20T10:00:00Z"
}
```

## Usage Analytics Mock Data

### Usage Statistics
```json
GET /api/v1/ai/usage?timeRange=24h
Response (200): {
  "timeRange": "24h",
  "summary": {
    "totalRequests": 1247,
    "totalTokens": 234567,
    "totalCost": 18.45,
    "averageResponseTime": 12.3
  },
  "byProvider": {
    "claude": {
      "requests": 856,
      "tokens": 167834,
      "cost": 13.42,
      "avgResponseTime": 9.8
    },
    "openai": {
      "requests": 391,
      "tokens": 66733,
      "cost": 5.03,
      "avgResponseTime": 18.2
    }
  },
  "byRequestType": {
    "chat_completion": { "requests": 723, "cost": 8.12 },
    "project_analysis": { "requests": 89, "cost": 7.23 },
    "embedding": { "requests": 435, "cost": 3.10 }
  },
  "trends": {
    "hourly": [/* 24 data points */],
    "costTrend": "stable",
    "usageTrend": "increasing"
  }
}
```

### Cost Analysis
```json
GET /api/v1/ai/usage/costs
Response (200): {
  "period": "current_month",
  "totalCost": 342.67,
  "budgetLimit": 500.00,
  "budgetUsed": 68.5,
  "projectedCost": 456.23,
  "breakdown": {
    "byProvider": {
      "claude": { "cost": 245.34, "percentage": 71.6 },
      "openai": { "cost": 97.33, "percentage": 28.4 }
    },
    "byTeam": {
      "engineering": { "cost": 198.45, "percentage": 57.9 },
      "product": { "cost": 89.12, "percentage": 26.0 },
      "design": { "cost": 55.10, "percentage": 16.1 }
    }
  },
  "alerts": [
    {
      "type": "budget_warning",
      "message": "Projected to exceed budget by $43.77",
      "severity": "warning"
    }
  ]
}
```

## Error Simulation

### Configurable Error Rates
Environment variables control error simulation:

```bash
# Error probability (0.0 - 1.0)
AI_STUB_ERROR_RATE=0.05        # 5% of requests fail
AI_STUB_TIMEOUT_RATE=0.02      # 2% timeout  
AI_STUB_RATE_LIMIT_RATE=0.01   # 1% rate limited
```

### Common Error Responses

#### Rate Limited (429)
```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded for provider 'claude'",
  "details": {
    "limit": 60,
    "remaining": 0,
    "resetTime": "2025-01-20T10:01:00Z"
  },
  "retryAfter": 45,
  "timestamp": "2025-01-20T10:00:15Z"
}
```

#### Provider Unavailable (503)
```json
{
  "error": "provider_unavailable", 
  "message": "Provider 'openai' is temporarily unavailable",
  "details": {
    "providerId": "openai",
    "healthStatus": "unhealthy",
    "estimatedRecovery": "2025-01-20T10:05:00Z"
  },
  "timestamp": "2025-01-20T10:00:15Z"
}
```

#### Processing Timeout (408)
```json
{
  "error": "processing_timeout",
  "message": "Request processing exceeded maximum time limit",
  "details": {
    "requestId": "req_mock_1234567890",
    "timeoutAfter": 300,
    "provider": "claude"
  },
  "timestamp": "2025-01-20T10:05:00Z"
}
```

#### Invalid Input (400)
```json
{
  "error": "invalid_request",
  "message": "Request validation failed",
  "details": {
    "field": "messages",
    "reason": "messages array cannot be empty"
  },
  "timestamp": "2025-01-20T10:00:15Z"
}
```

## Event Simulation

### Published Events
The stub publishes events with realistic timing:

```javascript
// Event sequence for a typical request:
// t=0s:    ai/request/received
// t=2-3s:  ai/request/processing  
// t=5-25s: ai/request/completed (or ai/request/failed)

// Example event payloads match production schemas:
{
  "channel": "ai/request/completed",
  "payload": {
    "requestId": "req_mock_1234567890",
    "provider": "claude",
    "tokensUsed": 245,
    "cost": 0.0019,
    "processingTime": 6.2,
    "correlationId": "corr_abc123",
    "timestamp": "2025-01-20T10:00:15Z"
  }
}
```

### Health Events
Provider health changes trigger events:

```javascript
{
  "channel": "ai/provider/health/changed",
  "payload": {
    "providerId": "google",
    "previousStatus": "healthy",
    "currentStatus": "degraded", 
    "reason": "Elevated response times detected",
    "timestamp": "2025-01-20T10:00:15Z"
  }
}
```

## Configuration

### Environment Variables
```bash
# Service configuration
AI_SERVICE_MODE=stub               # 'stub' or 'production'
AI_SERVICE_PORT=8003
AI_SERVICE_HOST=localhost

# Stub behavior configuration  
AI_STUB_MIN_PROCESSING_TIME=2000   # Minimum processing time (ms)
AI_STUB_MAX_PROCESSING_TIME=30000  # Maximum processing time (ms)
AI_STUB_ERROR_RATE=0.05           # Error probability (0.0-1.0)
AI_STUB_HEALTH_CHANGE_INTERVAL=300000 # Health change interval (ms)

# Message broker
REDIS_URL=redis://localhost:6379   # Use Redis if available
MESSAGE_BROKER_FALLBACK=memory     # Fallback to memory if Redis unavailable
```

### Request Type Processing Times
```javascript
const PROCESSING_TIMES = {
  chat_completion: { min: 2000, max: 8000 },
  project_analysis: { min: 10000, max: 25000 }, 
  embedding: { min: 3000, max: 10000 },
  context_analysis: { min: 15000, max: 30000 }
};
```

## Testing with Stubs

### Integration Tests
```typescript
describe('AI Service Integration', () => {
  beforeAll(async () => {
    process.env.AI_SERVICE_MODE = 'stub';
    process.env.AI_STUB_ERROR_RATE = '0'; // Disable errors for tests
    process.env.AI_STUB_MIN_PROCESSING_TIME = '100';
    process.env.AI_STUB_MAX_PROCESSING_TIME = '500';
  });
  
  it('should process chat completion request', async () => {
    const request = await createChatRequest([
      { role: 'user', content: 'Hello' }
    ]);
    
    expect(request.id).toMatch(/^req_mock_/);
    expect(request.status).toBe('pending');
    
    // Wait for processing
    const result = await waitForCompletion(request.id);
    expect(result.response.content).toBeDefined();
    expect(result.response.tokensUsed).toBeGreaterThan(0);
  });
});
```

### Load Testing
```typescript
describe('AI Service Load Tests', () => {
  it('should handle 100 concurrent requests', async () => {
    const requests = Array(100).fill(null).map(() => 
      createChatRequest([{ role: 'user', content: 'Load test' }])
    );
    
    const results = await Promise.all(requests);
    
    // All should succeed with unique IDs
    expect(results).toHaveLength(100);
    const ids = results.map(r => r.id);
    expect(new Set(ids).size).toBe(100);
  });
});
```

## Troubleshooting

### Common Issues

#### Slow Response Times
```bash
# Check if running in stub mode
curl http://localhost:8003/api/v1/ai/health | jq '.mode'

# Should return: "stub"
```

#### Events Not Publishing
```bash
# Check Redis connection
redis-cli ping

# Check event broker status
curl http://localhost:8003/api/v1/ai/metrics | jq '.eventBroker'
```

#### Unrealistic Mock Data
```bash
# Verify stub configuration
curl http://localhost:8003/api/v1/ai/config | jq '.stub'
```

For more integration examples, see:
- [Service Integration Overview](./ai-service-integration.md)
- [API Usage Examples](./ai-service-api-examples.md)  
- [Event Integration Guide](./ai-service-events.md)