# AI Service Event Integration Guide

## Overview

The AI Service publishes events for real-time monitoring, analytics, and workflow automation. This guide shows how to subscribe to and handle AI Service events.

## Message Broker Setup

### Development (In-Memory)
```typescript
import { EventEmitter } from 'events';

const eventBus = new EventEmitter();

// Subscribe to events
eventBus.on('ai/request/received', (payload) => {
  console.log('AI request received:', payload);
});
```

### Production (Redis)
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Subscribe to AI events
await redis.subscribe('ai/request/received');

redis.on('message', (channel, message) => {
  const payload = JSON.parse(message);
  handleAIEvent(channel, payload);
});
```

## Published Events

### AI Request Lifecycle Events

#### Request Received
```typescript
// Channel: ai/request/received
interface AiRequestReceived {
  requestId: string;
  type: 'chat_completion' | 'project_analysis' | 'embedding' | 'context_analysis';
  provider: string;
  userId?: string;
  projectId?: string;
  correlationId: string;
  timestamp: string;
}

// Example payload:
{
  "requestId": "req_123456",
  "type": "chat_completion", 
  "provider": "claude",
  "userId": "user_789",
  "correlationId": "corr_abc123",
  "timestamp": "2025-01-20T10:00:00Z"
}
```

#### Request Processing
```typescript
// Channel: ai/request/processing
interface AiRequestProcessing {
  requestId: string;
  provider: string;
  estimatedCompletion: string;
  queuePosition?: number;
  correlationId: string;
  timestamp: string;
}
```

#### Request Completed
```typescript
// Channel: ai/request/completed
interface AiRequestCompleted {
  requestId: string;
  provider: string;
  tokensUsed: number;
  cost: number;
  processingTime: number;
  correlationId: string;
  timestamp: string;
}
```

#### Request Failed
```typescript
// Channel: ai/request/failed
interface AiRequestFailed {
  requestId: string;
  provider: string;
  error: string;
  errorCode: string;
  retryable: boolean;
  correlationId: string;
  timestamp: string;
}
```

### Provider Management Events

#### Provider Health Changed
```typescript
// Channel: ai/provider/health/changed
interface ProviderHealthChanged {
  providerId: string;
  previousStatus: 'healthy' | 'degraded' | 'unhealthy';
  currentStatus: 'healthy' | 'degraded' | 'unhealthy';
  reason: string;
  timestamp: string;
}

// Example payload:
{
  "providerId": "claude",
  "previousStatus": "healthy",
  "currentStatus": "degraded",
  "reason": "Rate limit reached",
  "timestamp": "2025-01-20T10:00:00Z"
}
```

#### Provider Configuration Updated
```typescript
// Channel: ai/provider/config/updated
interface ProviderConfigUpdated {
  providerId: string;
  configChanges: Record<string, any>;
  timestamp: string;
}
```

### Usage and Analytics Events

#### Usage Threshold Reached
```typescript
// Channel: ai/usage/threshold/reached
interface UsageThresholdReached {
  type: 'requests' | 'tokens' | 'cost';
  threshold: number;
  current: number;
  period: '1h' | '24h' | '30d';
  providerId?: string;
  timestamp: string;
}
```

#### Rate Limit Hit
```typescript
// Channel: ai/rate-limit/hit
interface RateLimitHit {
  providerId: string;
  limitType: 'requests' | 'tokens';
  limit: number;
  resetTime: string;
  timestamp: string;
}
```

## Consumed Events

The AI Service subscribes to these events from other services:

### Project Events

#### Project Created
```typescript
// Channel: project/created
// Subscribe in AI Service to set up context
interface ProjectCreated {
  projectId: string;
  name: string;
  repositoryUrl?: string;
  ownerId: string;
  timestamp: string;
}
```

#### Project Updated
```typescript
// Channel: project/updated
// Subscribe to refresh project context
interface ProjectUpdated {
  projectId: string;
  changes: Record<string, any>;
  timestamp: string;
}
```

### Context Management Events

#### Context Updated
```typescript
// Channel: context/updated
// Subscribe to refresh AI context knowledge
interface ContextUpdated {
  projectId: string;
  contextType: 'documents' | 'code' | 'standards';
  updates: Array<{
    id: string;
    action: 'created' | 'updated' | 'deleted';
    content?: any;
  }>;
  timestamp: string;
}
```

## Event Handler Examples

### Basic Event Subscription
```typescript
class AIEventHandler {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.setupSubscriptions();
  }
  
  private async setupSubscriptions() {
    // Subscribe to AI events
    await this.redis.subscribe(
      'ai/request/completed',
      'ai/request/failed',
      'ai/provider/health/changed',
      'ai/usage/threshold/reached'
    );
    
    this.redis.on('message', (channel, message) => {
      this.handleEvent(channel, JSON.parse(message));
    });
  }
  
  private handleEvent(channel: string, payload: any) {
    switch (channel) {
      case 'ai/request/completed':
        this.handleRequestCompleted(payload);
        break;
      case 'ai/request/failed':
        this.handleRequestFailed(payload);
        break;
      case 'ai/provider/health/changed':
        this.handleProviderHealthChanged(payload);
        break;
      case 'ai/usage/threshold/reached':
        this.handleUsageThreshold(payload);
        break;
    }
  }
  
  private handleRequestCompleted(payload: AiRequestCompleted) {
    // Update analytics, send notifications, etc.
    console.log(`Request ${payload.requestId} completed. Cost: $${payload.cost}`);
    
    // Example: Update usage tracking
    this.updateUsageMetrics(payload);
    
    // Example: Send notification if high cost
    if (payload.cost > 1.0) {
      this.sendCostAlert(payload);
    }
  }
  
  private handleRequestFailed(payload: AiRequestFailed) {
    console.error(`Request ${payload.requestId} failed: ${payload.error}`);
    
    // Example: Retry if retryable
    if (payload.retryable) {
      this.scheduleRetry(payload.requestId);
    }
    
    // Example: Alert on repeated failures
    this.trackFailures(payload);
  }
  
  private handleProviderHealthChanged(payload: ProviderHealthChanged) {
    console.log(`Provider ${payload.providerId} status: ${payload.currentStatus}`);
    
    // Example: Switch provider if unhealthy
    if (payload.currentStatus === 'unhealthy') {
      this.switchToBackupProvider(payload.providerId);
    }
  }
  
  private handleUsageThreshold(payload: UsageThresholdReached) {
    console.warn(`Usage threshold reached: ${payload.type} = ${payload.current}/${payload.threshold}`);
    
    // Example: Send alert to admins
    this.sendUsageAlert(payload);
  }
}
```

### Context Management Integration
```typescript
class ContextEventHandler {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.setupContextSubscriptions();
  }
  
  private async setupContextSubscriptions() {
    await this.redis.subscribe(
      'project/created',
      'project/updated', 
      'context/updated'
    );
    
    this.redis.on('message', (channel, message) => {
      this.handleContextEvent(channel, JSON.parse(message));
    });
  }
  
  private async handleContextEvent(channel: string, payload: any) {
    switch (channel) {
      case 'project/created':
        await this.initializeProjectContext(payload);
        break;
      case 'project/updated':
        await this.updateProjectContext(payload);
        break;
      case 'context/updated':
        await this.refreshAIContext(payload);
        break;
    }
  }
  
  private async initializeProjectContext(payload: ProjectCreated) {
    // Set up AI context for new project
    console.log(`Initializing AI context for project: ${payload.projectId}`);
    
    // Example: Create project-specific AI configuration
    await this.createProjectAIConfig(payload.projectId, {
      repositoryUrl: payload.repositoryUrl,
      ownerId: payload.ownerId,
      preferences: {}
    });
  }
  
  private async updateProjectContext(payload: ProjectUpdated) {
    // Update AI context based on project changes
    console.log(`Updating AI context for project: ${payload.projectId}`);
    
    // Example: Refresh context if repository changed
    if (payload.changes.repositoryUrl) {
      await this.refreshRepositoryContext(payload.projectId);
    }
  }
  
  private async refreshAIContext(payload: ContextUpdated) {
    // Update AI knowledge based on context changes
    console.log(`Refreshing AI context: ${payload.contextType} for ${payload.projectId}`);
    
    for (const update of payload.updates) {
      switch (update.action) {
        case 'created':
        case 'updated':
          await this.indexContentForAI(payload.projectId, update);
          break;
        case 'deleted':
          await this.removeContentFromAI(payload.projectId, update.id);
          break;
      }
    }
  }
}
```

### Event Correlation Tracking
```typescript
class EventCorrelationTracker {
  private correlations = new Map<string, any>();
  
  constructor() {
    this.setupEventTracking();
  }
  
  private setupEventTracking() {
    const events = [
      'ai/request/received',
      'ai/request/processing', 
      'ai/request/completed',
      'ai/request/failed'
    ];
    
    events.forEach(event => {
      this.redis.subscribe(event);
    });
    
    this.redis.on('message', (channel, message) => {
      this.trackEvent(channel, JSON.parse(message));
    });
  }
  
  private trackEvent(channel: string, payload: any) {
    const correlationId = payload.correlationId;
    
    if (!this.correlations.has(correlationId)) {
      this.correlations.set(correlationId, {
        events: [],
        startTime: new Date(),
        requestId: payload.requestId
      });
    }
    
    const correlation = this.correlations.get(correlationId);
    correlation.events.push({
      channel,
      payload,
      timestamp: new Date()
    });
    
    // Complete tracking on final events
    if (channel.includes('completed') || channel.includes('failed')) {
      this.completeCorrelation(correlationId);
    }
  }
  
  private completeCorrelation(correlationId: string) {
    const correlation = this.correlations.get(correlationId);
    if (!correlation) return;
    
    const duration = Date.now() - correlation.startTime.getTime();
    
    console.log(`Request ${correlation.requestId} completed in ${duration}ms`);
    console.log(`Event sequence:`, correlation.events.map(e => e.channel));
    
    // Clean up
    this.correlations.delete(correlationId);
  }
}
```

## Error Handling in Event Processing

```typescript
class RobustEventHandler {
  private deadLetterQueue: Array<{channel: string, payload: any, error: string}> = [];
  
  private async handleEventSafely(channel: string, payload: any) {
    try {
      await this.processEvent(channel, payload);
    } catch (error) {
      console.error(`Failed to process event ${channel}:`, error);
      
      // Add to dead letter queue for manual review
      this.deadLetterQueue.push({
        channel,
        payload,
        error: error.message
      });
      
      // Optionally retry certain events
      if (this.isRetryableError(error)) {
        setTimeout(() => {
          this.handleEventSafely(channel, payload);
        }, 5000);
      }
    }
  }
  
  private isRetryableError(error: Error): boolean {
    // Network errors, temporary service unavailability, etc.
    return error.message.includes('network') || 
           error.message.includes('timeout') ||
           error.message.includes('503');
  }
  
  // Method to process dead letter queue
  async processDLQ() {
    for (const item of this.deadLetterQueue) {
      try {
        await this.processEvent(item.channel, item.payload);
        // Remove from DLQ if successful
        this.deadLetterQueue.splice(this.deadLetterQueue.indexOf(item), 1);
      } catch (error) {
        console.error(`DLQ retry failed for ${item.channel}:`, error);
      }
    }
  }
}
```

## Event Schema Validation

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

class EventValidator {
  private ajv: Ajv;
  private schemas: Map<string, any>;
  
  constructor() {
    this.ajv = new Ajv();
    addFormats(this.ajv);
    this.loadSchemas();
  }
  
  private loadSchemas() {
    this.schemas = new Map([
      ['ai/request/received', {
        type: 'object',
        required: ['requestId', 'type', 'correlationId', 'timestamp'],
        properties: {
          requestId: { type: 'string' },
          type: { enum: ['chat_completion', 'project_analysis', 'embedding', 'context_analysis'] },
          provider: { type: 'string' },
          correlationId: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      }],
      // Add more schemas...
    ]);
  }
  
  validateEvent(channel: string, payload: any): boolean {
    const schema = this.schemas.get(channel);
    if (!schema) {
      console.warn(`No schema found for channel: ${channel}`);
      return true; // Allow unknown events
    }
    
    const validate = this.ajv.compile(schema);
    const valid = validate(payload);
    
    if (!valid) {
      console.error(`Invalid event payload for ${channel}:`, validate.errors);
    }
    
    return valid;
  }
}
```

For API integration patterns, see [API Usage Examples](./ai-service-api-examples.md).