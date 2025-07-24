# AI Service API Contracts

This directory contains the complete API contract specifications for the AI Service, providing both HTTP REST API and event-driven communication contracts.

## Overview

The AI Service is a multi-provider AI orchestration service that provides:

- **Unified AI Access**: Single API for multiple providers (OpenAI, Anthropic, Google, Azure)
- **Context Optimization**: Intelligent context analysis and optimization for AI consumption
- **Project Analysis**: AI-powered project insights and recommendations
- **Performance Analytics**: Comprehensive usage analytics and monitoring
- **Provider Management**: Configuration and health monitoring of AI providers

## Contract Files

### OpenAPI Specification (`openapi.yaml`)

Complete HTTP REST API specification covering:

#### **8 Controller Groups**
1. **Health** (`/health`) - Service health monitoring
2. **Provider Management** (`/api/v1/providers/*`) - AI provider configuration and testing
3. **Model Management** (`/api/v1/models/*`) - Available models and capabilities
4. **Chat** (`/api/v1/chat/*`) - Chat completion with streaming support
5. **Context Optimization** (`/api/v1/context/*`) - Context analysis and optimization
6. **Embeddings** (`/api/v1/embeddings`) - Text embedding generation
7. **Project Analysis** (`/api/v1/projects/*`) - Intelligent project analysis
8. **Analytics** (`/api/v1/analytics`) - Usage analytics and metrics

#### **17 HTTP Endpoints**
- `GET /health` - Health check
- `GET /api/v1/providers` - List providers
- `GET /api/v1/providers/{providerId}` - Get provider details
- `POST /api/v1/providers/{providerId}/configure` - Configure provider
- `POST /api/v1/providers/{providerId}/test` - Test provider
- `GET /api/v1/models` - List models
- `GET /api/v1/models/{modelId}` - Get model details
- `POST /api/v1/chat/completions` - Chat completion
- `POST /api/v1/chat/completions/stream` - Streaming chat completion
- `POST /api/v1/context/analyze` - Analyze context
- `POST /api/v1/context/{contextId}/optimize` - Optimize context
- `GET /api/v1/context/{contextId}/chunks` - Get context chunks
- `POST /api/v1/embeddings` - Generate embeddings
- `POST /api/v1/projects/{projectId}/analyze` - Analyze project
- `GET /api/v1/projects/{projectId}/insights` - Get project insights
- `GET /api/v1/projects/{projectId}/recommendations` - Get recommendations
- `GET /api/v1/projects/{projectId}/metrics` - Get project metrics
- `GET /api/v1/analytics` - Get analytics

#### **Key Features**
- **Complete Schema Coverage**: All request/response schemas from TypeBox definitions
- **Comprehensive Error Handling**: Standard error responses with proper HTTP status codes
- **Security**: Bearer token authentication throughout
- **Validation**: Parameter validation with OpenAPI constraints
- **Documentation**: Detailed descriptions and examples

### AsyncAPI Specification (`asyncapi.yaml`)

Complete event-driven communication specification covering:

#### **17 Published Events**
- `ai/requests/received` - AI request received and queued
- `ai/requests/processing` - AI request processing started
- `ai/requests/completed` - AI request completed successfully
- `ai/requests/failed` - AI request failed with error
- `ai/responses/generated` - AI response generated
- `ai/embeddings/generated` - Embeddings generated
- `ai/context/analysis-started` - Context analysis started
- `ai/context/optimized` - Context optimization completed
- `ai/projects/analysis-started` - Project analysis started
- `ai/projects/insights-generated` - Project insights generated
- `ai/projects/recommendations-generated` - Project recommendations generated
- `ai/providers/configured` - Provider configuration updated
- `ai/providers/health-checked` - Provider health check completed
- `ai/service/startup` - Service started up
- `ai/service/shutdown` - Service shutting down
- `ai/service/error` - Service error occurred
- `ai/health/checked` - Health check performed

#### **6 Consumed Events**
- `system/config/updated` - System configuration updates
- `system/health/monitor` - Health monitoring requests
- `analytics/aggregation/request` - Analytics aggregation requests
- `providers/status/broadcast` - Provider status broadcasts
- `rate-limit/threshold/exceeded` - Rate limit notifications
- `quality/feedback/received` - Quality feedback

#### **Key Features**
- **Redis Protocol**: Uses Redis streams for reliable event delivery
- **Rich Metadata**: Comprehensive event metadata for tracing and analytics
- **Error Handling**: Detailed error event schemas with retry information
- **Quality Metrics**: Performance and quality tracking in events

## Usage Examples

### HTTP API Usage

```bash
# Health check
curl -X GET http://localhost:8003/health

# List providers
curl -X GET http://localhost:8003/api/v1/providers \
  -H "Authorization: Bearer <token>"

# Chat completion
curl -X POST http://localhost:8003/api/v1/chat/completions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "provider": "openai",
    "maxTokens": 100
  }'

# Generate embeddings
curl -X POST http://localhost:8003/api/v1/embeddings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "input": ["Hello world", "AI is amazing"],
    "model": "text-embedding-3-small"
  }'
```

### Event Subscription Examples

```javascript
// Subscribe to AI request lifecycle
redis.subscribe('ai/requests/received', (message) => {
  const event = JSON.parse(message);
  console.log('New AI request:', event.requestId);
});

// Subscribe to context optimization completion
redis.subscribe('ai/context/optimized', (message) => {
  const event = JSON.parse(message);
  console.log('Context optimized:', {
    contextId: event.contextId,
    compressionRatio: event.optimization.compressionRatio
  });
});

// Subscribe to project insights
redis.subscribe('ai/projects/insights-generated', (message) => {
  const event = JSON.parse(message);
  console.log('New insights:', event.insights.length);
});
```

## Validation and Tools

### OpenAPI Validation

```bash
# Validate OpenAPI spec
npx swagger-cli validate contracts/openapi.yaml

# Generate client SDK
npx @openapitools/openapi-generator-cli generate \
  -i contracts/openapi.yaml \
  -g typescript-fetch \
  -o src/generated/client
```

### AsyncAPI Validation

```bash
# Validate AsyncAPI spec
npx asyncapi validate contracts/asyncapi.yaml

# Generate event documentation
npx asyncapi generate html contracts/asyncapi.yaml \
  --output docs/events
```

## Integration Guidelines

### Service Implementation

1. **Contract-First Development**: Use these specifications as the source of truth
2. **Schema Validation**: Implement server-side validation against these schemas
3. **Event Publishing**: Ensure all events match the AsyncAPI specifications
4. **Error Handling**: Follow the standardized error response formats

### Client Integration

1. **Generated Clients**: Use code generation tools for type-safe clients
2. **Event Handling**: Implement event handlers for relevant business events
3. **Error Handling**: Handle standard error responses consistently
4. **Authentication**: Implement Bearer token authentication

### Testing

1. **Contract Testing**: Use tools like Pact or Postman to validate contracts
2. **Schema Validation**: Test all requests/responses against schemas
3. **Event Testing**: Validate event publishing and consumption
4. **Integration Testing**: Test full request/event flows

## Development Workflow

### Phase 1: Contract Definition ✅
- [x] Extract OpenAPI specification from TypeBox schemas
- [x] Create AsyncAPI specification for events
- [x] Document usage examples and integration guidelines

### Phase 2: Implementation
- [ ] HTTP service stub with mock controllers
- [ ] Event publishing and handling infrastructure
- [ ] Request/response validation middleware
- [ ] Error handling and logging

### Phase 3: Testing & Validation
- [ ] Contract testing suite
- [ ] Schema validation tests
- [ ] Event flow integration tests
- [ ] Performance and load testing

## Versioning Strategy

- **API Version**: v1.0.0 (semantic versioning)
- **Contract Updates**: Breaking changes require major version increment
- **Backward Compatibility**: Maintain compatibility within major versions
- **Deprecation**: 6-month notice for breaking changes

## Related Documentation

- [Service Architecture](../docs/architecture.md)
- [Event Patterns](../docs/events.md)
- [Authentication Guide](../docs/authentication.md)
- [Error Handling](../docs/errors.md)
- [Rate Limiting](../docs/rate-limiting.md)

## Contact

- **Team**: CycleTime Team
- **Email**: team@cycletime.dev
- **Issues**: Create issues in the project repository
- **Slack**: #ai-service channel