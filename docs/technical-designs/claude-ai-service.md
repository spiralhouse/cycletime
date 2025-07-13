# Technical Design: Claude AI Service

**Issue**: SPI-14  
**Created**: 2025-01-13  
**Status**: Design Phase  
**Assignee**: Development Team  

## 1. Overview

This document outlines the technical design for CycleTime's Claude AI Service, providing direct integration with Anthropic's Claude 4 Sonnet API for MVP functionality. The service handles all AI-powered operations including PRD analysis, document generation, and task breakdown while maintaining comprehensive logging, monitoring, and error handling.

## 2. Goals & Requirements

### 2.1 Primary Goals

- **Direct Claude 4 Sonnet Integration**: Single-provider AI service eliminating orchestration complexity
- **Comprehensive Request/Response Logging**: Full audit trail of AI interactions for debugging and optimization
- **Robust Error Handling**: Graceful handling of API failures with intelligent retry mechanisms
- **Usage Tracking**: Detailed cost monitoring and performance metrics for budget management
- **Scalable Architecture**: Support for high-volume AI requests with proper rate limiting

### 2.2 Functional Requirements

- Direct Anthropic Claude 4 Sonnet API integration
- Request queuing and processing with status tracking
- Comprehensive logging of all AI interactions
- Usage tracking with cost calculation and monitoring
- Error handling with exponential backoff retry logic
- Rate limiting compliance with Anthropic API guidelines
- Integration with existing database models (AiRequest, AiResponse, UsageTracking)

### 2.3 Non-Functional Requirements

- **Performance**: Sub-5 second response times for 95% of requests
- **Reliability**: 99.9% uptime with graceful degradation during API outages
- **Cost Efficiency**: Intelligent request optimization to minimize API costs
- **Security**: Secure API key management and request validation
- **Monitoring**: Real-time performance and cost tracking

## 3. Architecture Decisions

### 3.1 Framework Selection: Node.js with TypeScript

**Decision**: Build the service using Node.js with TypeScript and Fastify
**Rationale**:
- Consistent with existing API Gateway architecture
- TypeScript provides type safety for AI request/response handling
- Fastify offers high performance and built-in schema validation
- Native async/await support for AI API calls
- Rich ecosystem for HTTP client libraries and middleware

**Alternative Considered**: Python with FastAPI - Better AI/ML ecosystem but inconsistent with project stack

### 3.2 Anthropic API Integration Strategy

**Decision**: Use official Anthropic TypeScript SDK with custom wrapper
**Rationale**:
- Official SDK provides type safety and automatic updates
- Custom wrapper allows for request/response logging and monitoring
- Centralized error handling and retry logic
- Standardized request format across the application
- Easy to mock for testing

**Integration Pattern**:
```typescript
class ClaudeApiClient {
  private anthropic: Anthropic;
  private logger: Logger;
  private usageTracker: UsageTracker;
  
  async sendRequest(request: ClaudeRequest): Promise<ClaudeResponse> {
    // Pre-request logging and validation
    // API call with error handling
    // Post-request logging and usage tracking
  }
}
```

### 3.3 Request Processing Model

**Decision**: Implement asynchronous request processing with status tracking
**Rationale**:
- Large PRD analysis requests may take 30+ seconds
- Non-blocking architecture prevents request timeouts
- Status tracking allows clients to poll for completion
- Failed requests can be retried without losing context
- Supports batch processing for multiple requests

**Processing Flow**:
1. Request validation and creation in database (status: PENDING)
2. Asynchronous processing with Claude API (status: PROCESSING)
3. Response storage and status update (status: COMPLETED/FAILED)
4. Usage tracking and cost calculation
5. Client notification via webhooks or polling

### 3.4 Error Handling Strategy

**Decision**: Multi-layered error handling with exponential backoff
**Rationale**:
- Anthropic API has rate limits and occasional outages
- Different error types require different handling strategies
- Exponential backoff prevents overwhelming the API during issues
- Comprehensive error logging aids in debugging and optimization

**Error Categories**:
- **Rate Limit Errors**: Exponential backoff with jitter
- **Network Errors**: Immediate retry with circuit breaker
- **Authentication Errors**: Alert and stop processing
- **Content Policy Errors**: Log and return error to user
- **Internal Errors**: Log, alert, and retry with different parameters

## 4. System Components

### 4.1 Claude AI Service

**Location**: `/packages/claude-service/`
**Technology Stack**:
- Node.js 22 with TypeScript
- Fastify web framework for API endpoints
- Anthropic TypeScript SDK
- Prisma for database operations
- Redis for request queuing and caching

**Core Responsibilities**:
- Claude 4 Sonnet API integration and request management
- Request validation and preprocessing
- Response processing and storage
- Error handling and retry logic
- Usage tracking and cost calculation
- Performance monitoring and alerting

### 4.2 API Client Wrapper

**Purpose**: Centralized Anthropic API interaction with monitoring
**Key Features**:
```typescript
interface ClaudeRequest {
  id: string;
  type: AiRequestType;
  prompt: string;
  context?: Record<string, unknown>;
  parameters?: ClaudeParameters;
  maxTokens?: number;
  temperature?: number;
}

interface ClaudeResponse {
  id: string;
  content: string;
  metadata: {
    model: string;
    stopReason: string;
    tokenUsage: TokenUsage;
  };
  performance: {
    responseTimeMs: number;
    retryCount: number;
  };
}

class ClaudeApiClient {
  async analyzeDocument(request: DocumentAnalysisRequest): Promise<ClaudeResponse>
  async generatePlan(request: PlanGenerationRequest): Promise<ClaudeResponse>
  async breakdownTasks(request: TaskBreakdownRequest): Promise<ClaudeResponse>
  async generateContent(request: ContentGenerationRequest): Promise<ClaudeResponse>
}
```

### 4.3 Request Processing Engine

**Purpose**: Manage request lifecycle and status tracking
**Components**:
- **Request Validator**: Schema validation and preprocessing
- **Queue Manager**: Redis-based request queuing for rate limiting
- **Processor**: Asynchronous request execution
- **Status Tracker**: Database updates and client notifications

**Processing Pipeline**:
```typescript
class RequestProcessor {
  async processRequest(requestId: string): Promise<void> {
    try {
      // 1. Load request from database
      const request = await this.loadRequest(requestId);
      
      // 2. Update status to PROCESSING
      await this.updateRequestStatus(requestId, 'PROCESSING');
      
      // 3. Send to Claude API
      const response = await this.claudeClient.sendRequest(request);
      
      // 4. Store response and update status
      await this.storeResponse(requestId, response);
      await this.updateRequestStatus(requestId, 'COMPLETED');
      
      // 5. Track usage and costs
      await this.trackUsage(requestId, response.metadata.tokenUsage);
      
    } catch (error) {
      await this.handleError(requestId, error);
    }
  }
}
```

### 4.4 Usage Tracking Service

**Purpose**: Monitor costs, performance, and API usage
**Metrics Tracked**:
- Token usage (input/output/total) per request
- Cost calculation based on Claude 4 Sonnet pricing
- Response times and retry counts
- Error rates and types
- Daily/monthly usage aggregation

**Cost Calculation**:
```typescript
class UsageTracker {
  async trackRequest(requestId: string, tokenUsage: TokenUsage, responseTime: number): Promise<void> {
    const cost = this.calculateCost(tokenUsage);
    
    await this.prisma.usageTracking.create({
      data: {
        request_id: requestId,
        input_tokens: tokenUsage.inputTokens,
        output_tokens: tokenUsage.outputTokens,
        total_tokens: tokenUsage.totalTokens,
        cost_usd: cost,
        model_version: 'claude-4-sonnet',
        response_time_ms: responseTime,
      }
    });
  }
  
  private calculateCost(tokenUsage: TokenUsage): number {
    // Claude 4 Sonnet pricing: $15/1M input tokens, $75/1M output tokens
    const inputCost = (tokenUsage.inputTokens / 1_000_000) * 15;
    const outputCost = (tokenUsage.outputTokens / 1_000_000) * 75;
    return inputCost + outputCost;
  }
}
```

## 5. Database Integration

### 5.1 Existing Schema Usage

The service integrates with existing Prisma models:

**AiRequest Model**: 
- Stores request details, prompt, context, and parameters
- Tracks request status and processing timeline
- Links to user, project, and document entities

**AiResponse Model**:
- Stores Claude's response content and metadata
- Includes quality metrics and confidence scores
- Supports human feedback for response improvement

**UsageTracking Model**:
- Records token usage and cost information
- Tracks performance metrics and response times
- Enables usage analytics and cost optimization

### 5.2 Request Lifecycle Management

```typescript
// Request Creation
const aiRequest = await prisma.aiRequest.create({
  data: {
    user_id: userId,
    project_id: projectId,
    request_type: 'PRD_ANALYSIS',
    status: 'PENDING',
    model: 'claude-4-sonnet',
    prompt: analysisPrompt,
    context: { documentId, analysisType },
    parameters: { maxTokens: 4000, temperature: 0.1 }
  }
});

// Response Storage
const aiResponse = await prisma.aiResponse.create({
  data: {
    request_id: aiRequest.id,
    content: claudeResponse.content,
    metadata: claudeResponse.metadata,
    confidence_score: claudeResponse.confidence
  }
});

// Usage Tracking
const usageTracking = await prisma.usageTracking.create({
  data: {
    request_id: aiRequest.id,
    input_tokens: tokenUsage.inputTokens,
    output_tokens: tokenUsage.outputTokens,
    total_tokens: tokenUsage.totalTokens,
    cost_usd: calculatedCost,
    model_version: 'claude-4-sonnet',
    response_time_ms: responseTime
  }
});
```

## 6. API Endpoints

### 6.1 Request Management Endpoints

```typescript
// Create AI Request
POST /api/v1/ai/requests
{
  "type": "PRD_ANALYSIS",
  "prompt": "Analyze this PRD for technical requirements...",
  "context": {
    "projectId": "proj_123",
    "documentId": "doc_456"
  },
  "parameters": {
    "maxTokens": 4000,
    "temperature": 0.1
  }
}

// Get Request Status
GET /api/v1/ai/requests/:id
{
  "id": "req_789",
  "status": "PROCESSING",
  "created_at": "2025-01-13T10:00:00Z",
  "started_at": "2025-01-13T10:00:05Z",
  "estimated_completion": "2025-01-13T10:02:00Z"
}

// Get Request Response
GET /api/v1/ai/requests/:id/response
{
  "id": "resp_101",
  "content": "Based on the PRD analysis...",
  "metadata": {
    "model": "claude-4-sonnet",
    "tokenUsage": {
      "inputTokens": 2500,
      "outputTokens": 1200,
      "totalTokens": 3700
    }
  }
}
```

### 6.2 Usage Analytics Endpoints

```typescript
// Get Usage Statistics
GET /api/v1/ai/usage?project=proj_123&period=month
{
  "totalRequests": 245,
  "totalTokens": 1_250_000,
  "totalCost": 95.75,
  "averageResponseTime": 3200,
  "errorRate": 0.02,
  "breakdown": {
    "PRD_ANALYSIS": { "requests": 45, "cost": 35.20 },
    "TASK_BREAKDOWN": { "requests": 120, "cost": 28.50 },
    "DOCUMENT_GENERATION": { "requests": 80, "cost": 32.05 }
  }
}
```

## 7. Error Handling & Resilience

### 7.1 Retry Strategy

```typescript
class RetryHandler {
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second
  
  async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === this.maxRetries || !this.isRetryableError(error)) {
          throw error;
        }
        
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }
  }
  
  private isRetryableError(error: any): boolean {
    return error.status === 429 || // Rate limited
           error.status === 500 || // Server error
           error.status === 502 || // Bad gateway
           error.status === 503 || // Service unavailable
           error.code === 'NETWORK_ERROR';
  }
  
  private calculateDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return exponentialDelay + jitter;
  }
}
```

### 7.2 Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

## 8. Security Considerations

### 8.1 API Key Management

```typescript
class ApiKeyManager {
  private apiKey: string;
  
  constructor() {
    this.apiKey = this.loadApiKey();
    this.validateApiKey();
  }
  
  private loadApiKey(): string {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    return apiKey;
  }
  
  private validateApiKey(): void {
    if (!this.apiKey.startsWith('sk-ant-')) {
      throw new Error('Invalid Anthropic API key format');
    }
  }
  
  getApiKey(): string {
    return this.apiKey;
  }
}
```

### 8.2 Request Validation

```typescript
const aiRequestSchema = {
  type: 'object',
  required: ['type', 'prompt'],
  properties: {
    type: {
      type: 'string',
      enum: ['PRD_ANALYSIS', 'PROJECT_PLAN_GENERATION', 'TASK_BREAKDOWN', 'DOCUMENT_GENERATION', 'CODE_REVIEW', 'GENERAL_QUERY']
    },
    prompt: {
      type: 'string',
      minLength: 10,
      maxLength: 100000
    },
    context: {
      type: 'object',
      additionalProperties: true
    },
    parameters: {
      type: 'object',
      properties: {
        maxTokens: { type: 'integer', minimum: 1, maximum: 8000 },
        temperature: { type: 'number', minimum: 0, maximum: 2 }
      }
    }
  }
};
```

## 9. Performance Optimization

### 9.1 Request Caching Strategy

```typescript
class ResponseCache {
  private redis: Redis;
  
  async getCachedResponse(requestHash: string): Promise<ClaudeResponse | null> {
    const cached = await this.redis.get(`ai_response:${requestHash}`);
    return cached ? JSON.parse(cached) : null;
  }
  
  async cacheResponse(requestHash: string, response: ClaudeResponse): Promise<void> {
    await this.redis.setex(
      `ai_response:${requestHash}`,
      3600, // 1 hour TTL
      JSON.stringify(response)
    );
  }
  
  private generateRequestHash(request: ClaudeRequest): string {
    // Generate deterministic hash for caching similar requests
    return crypto
      .createHash('sha256')
      .update(JSON.stringify({
        type: request.type,
        prompt: request.prompt,
        parameters: request.parameters
      }))
      .digest('hex');
  }
}
```

### 9.2 Rate Limiting Implementation

```typescript
class RateLimiter {
  private redis: Redis;
  
  async checkRateLimit(userId: string): Promise<boolean> {
    const key = `rate_limit:ai:${userId}`;
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, 3600); // 1 hour window
    }
    
    return current <= this.maxRequestsPerHour;
  }
  
  async getRemainingRequests(userId: string): Promise<number> {
    const key = `rate_limit:ai:${userId}`;
    const current = await this.redis.get(key);
    return Math.max(0, this.maxRequestsPerHour - (parseInt(current || '0')));
  }
}
```

## 10. Monitoring & Observability

### 10.1 Metrics Collection

```typescript
class MetricsCollector {
  async recordRequest(type: AiRequestType, duration: number, tokens: number): Promise<void> {
    // Record metrics for monitoring dashboard
    await Promise.all([
      this.recordHistogram('ai_request_duration', duration, { type }),
      this.recordCounter('ai_requests_total', 1, { type }),
      this.recordCounter('ai_tokens_used', tokens, { type })
    ]);
  }
  
  async recordError(type: AiRequestType, errorType: string): Promise<void> {
    await this.recordCounter('ai_request_errors', 1, { type, errorType });
  }
  
  async recordCost(cost: number, type: AiRequestType): Promise<void> {
    await this.recordHistogram('ai_request_cost', cost, { type });
  }
}
```

### 10.2 Health Check Endpoint

```typescript
// GET /health
async function healthCheck(): Promise<HealthStatus> {
  const checks = await Promise.allSettled([
    this.checkAnthropicApi(),
    this.checkDatabase(),
    this.checkRedis()
  ]);
  
  return {
    status: checks.every(check => check.status === 'fulfilled') ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    dependencies: {
      anthropic: checks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      database: checks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      redis: checks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy'
    }
  };
}
```

## 11. Testing Strategy

### 11.1 Unit Tests

- **API Client**: Mock Anthropic SDK responses
- **Request Processing**: Test lifecycle management
- **Error Handling**: Verify retry logic and circuit breaker
- **Usage Tracking**: Validate cost calculations
- **Validation**: Test request schema validation

### 11.2 Integration Tests

- **Database Operations**: Test Prisma model interactions
- **External API**: Test with Anthropic API sandbox
- **Rate Limiting**: Verify limits are enforced
- **Caching**: Test Redis cache behavior
- **Error Scenarios**: Test network failures and API errors

### 11.3 Performance Tests

- **Load Testing**: 100+ concurrent requests
- **Response Time**: Verify <5 second SLA
- **Memory Usage**: Monitor for memory leaks
- **Cost Efficiency**: Validate usage tracking accuracy

## 12. Deployment Configuration

### 12.1 Environment Variables

```bash
# Anthropic API Configuration
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_API_VERSION=2023-06-01

# Service Configuration
NODE_ENV=production
LOG_LEVEL=info
API_PORT=8002

# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Rate Limiting
MAX_REQUESTS_PER_HOUR=1000
MAX_CONCURRENT_REQUESTS=10

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=30000
```

### 12.2 Docker Configuration

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY dist/ ./dist/

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8002/health || exit 1

EXPOSE 8002

CMD ["node", "dist/server.js"]
```

## 13. Implementation Plan

### 13.1 Phase 1: Core Infrastructure
- Set up package structure and dependencies
- Implement Anthropic API client wrapper
- Create basic request/response models
- Set up database integration with Prisma

### 13.2 Phase 2: Request Processing
- Implement asynchronous request processing
- Add status tracking and lifecycle management
- Create API endpoints for request management
- Implement basic error handling

### 13.3 Phase 3: Advanced Features
- Add retry logic and circuit breaker
- Implement rate limiting and caching
- Create usage tracking and cost calculation
- Add comprehensive monitoring and metrics

### 13.4 Phase 4: Testing & Optimization
- Write comprehensive test suite
- Performance testing and optimization
- Security review and hardening
- Documentation and deployment guides

## 14. Success Criteria

### 14.1 Functional Success
- [ ] Successfully integrates with Anthropic Claude 4 Sonnet API
- [ ] Processes all AI request types (PRD analysis, document generation, etc.)
- [ ] Stores requests and responses in database correctly
- [ ] Tracks usage and calculates costs accurately
- [ ] Handles errors gracefully with appropriate retry logic

### 14.2 Performance Success
- [ ] Responds to 95% of requests within 5 seconds
- [ ] Handles 100+ concurrent requests without degradation
- [ ] Maintains 99.9% uptime during normal operation
- [ ] Accurate cost tracking within 1% of actual usage

### 14.3 Security Success
- [ ] API keys are securely managed and not exposed
- [ ] Request validation prevents malicious inputs
- [ ] Proper authentication and authorization integration
- [ ] Audit logging captures all AI interactions

---

This technical design provides a comprehensive foundation for implementing CycleTime's Claude AI Service with direct Anthropic integration, robust error handling, and comprehensive monitoring capabilities.