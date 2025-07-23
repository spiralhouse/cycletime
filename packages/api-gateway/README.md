# CycleTime API Gateway

Central API Gateway for the CycleTime platform, providing authentication, authorization, and request routing to microservices.

## Features

- **High Performance**: Built with Fastify for optimal performance
- **Authentication**: GitHub OAuth 2.0 with JWT token management
- **Authorization**: Role-based access control (RBAC) with project-level permissions
- **Rate Limiting**: Configurable rate limits for users and API keys
- **Security**: Comprehensive security headers, CORS, and input validation
- **Monitoring**: Health checks, metrics, and structured logging
- **API Key Management**: Scoped API keys for machine-to-machine authentication

## Architecture

This is Phase 1 of the API Gateway implementation, focusing on:

1. **Core Gateway Infrastructure** ✅
   - Fastify server with TypeScript
   - Middleware pipeline (logging, CORS, error handling)
   - Health check endpoints
   - Database connection setup

2. **Authentication Implementation** (Phase 2)
   - GitHub OAuth integration
   - JWT token management
   - User session handling

3. **Authorization System** (Phase 3)
   - RBAC implementation
   - Project permissions
   - API key management

4. **Rate Limiting and Security** (Phase 4)
   - Advanced rate limiting
   - Request validation
   - Security hardening

5. **Service Integration** (Phase 5)
   - Service proxying
   - Circuit breakers
   - Load balancing

## Quick Start

### Prerequisites

- Node.js 22 or higher
- PostgreSQL 17
- Access to GitHub OAuth app credentials

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Build the application
npm run build

# Start in development mode
npm run dev
```

### Environment Variables

```bash
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cycletime_dev

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/callback

# JWT Configuration
JWT_SECRET=your-secure-jwt-secret-key
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=30d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=1000

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,https://cycletime.ai
```

## API Documentation

### Health Check Endpoints

- `GET /health` - Comprehensive health check with dependencies
- `GET /ready` - Readiness probe for Kubernetes
- `GET /live` - Liveness probe for Kubernetes
- `GET /version` - Application version information

### Authentication Endpoints (Phase 2)

- `POST /auth/github/oauth` - Initiate GitHub OAuth flow
- `GET /auth/github/callback` - Handle OAuth callback
- `POST /auth/refresh` - Refresh JWT tokens
- `POST /auth/logout` - Logout and invalidate session

### API Endpoints (Phase 3+)

- `GET /api/v1/user/profile` - Get user profile
- `GET /api/v1/projects` - List user projects
- `POST /api/v1/projects` - Create new project
- `GET /api/v1/api-keys` - List API keys
- `POST /api/v1/api-keys` - Create API key

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- --testNamePattern="Authentication"

# Run single test file
npm test -- circuit-breaker.test.ts

# Run tests with verbose output
npm test -- --verbose
```

### Test Architecture

The API Gateway uses a sophisticated test architecture with multiple layers:

#### Test Types

- **Unit Tests** - Individual function and service testing
- **Integration Tests** - End-to-end request flow testing
- **Contract Tests** - API contract validation and service boundary testing
- **Mock Service Tests** - Simulated microservice response testing

#### Test Structure

```
src/__tests__/
├── contract/           # Integration and contract tests
│   ├── api-contracts.test.ts      # API contract validation
│   ├── circuit-breaker.test.ts    # Circuit breaker functionality
│   ├── integration.test.ts        # End-to-end flows
│   ├── proxy-routes.test.ts       # Service route registration
│   └── simple-contracts.test.ts   # Basic contract tests
├── services/           # Service layer tests
├── middleware/         # Middleware tests
├── routes/            # Route handler tests
└── setup.ts           # Global test configuration
```

### Mock Service System

The API Gateway includes a comprehensive mock service system for testing without external dependencies.

#### Mock Configuration

Set these environment variables for testing:

```bash
# Enable mock responses (automatically enabled in test environment)
MOCK_RESPONSES_ENABLED=true

# Response delay in milliseconds (0 for fast tests)
MOCK_RESPONSE_DELAY=0

# Error simulation rate (0.0 to 1.0)
MOCK_ERROR_RATE=0
```

#### Mock Features

- **13 Microservice Endpoints** - All services mocked with realistic responses
- **Authentication Simulation** - Mock tokens and user contexts  
- **Circuit Breaker Testing** - Service failure and recovery simulation
- **Service Discovery** - Health check and registration mocking

#### Mock Token Patterns

```typescript
// Valid mock tokens for testing
'mock-token'                    // Basic mock token
'mock-access-token-user123'     // User-specific token
'mock-user-456'                 // Alternative user token

// Invalid tokens (should return 401)
'invalid-token'                 // Non-mock token
'Bearer invalid'                // Malformed token
```

### Test Environment Setup

#### Required Environment Variables

Create a `.env.test` file in the package root:

```bash
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/cycletime_test
GITHUB_CLIENT_ID=test_client_id
GITHUB_CLIENT_SECRET=test_client_secret
JWT_SECRET=test_jwt_secret_that_is_long_enough_for_testing_purposes_with_minimum_32_chars
MOCK_RESPONSES_ENABLED=true
MOCK_RESPONSE_DELAY=0
MOCK_ERROR_RATE=0
```

#### Jest Configuration

The Jest configuration supports:
- **ESM modules** with TypeScript compilation
- **Node-fetch mocking** for HTTP requests
- **Global setup** with test environment variables
- **Coverage reporting** with realistic thresholds

### Local CI Testing with nektos/act

For local CI simulation before pushing:

```bash
# Install nektos/act (macOS)
brew install act

# Run full CI test suite locally
act --container-architecture linux/amd64 -j test --artifact-server-path /tmp/artifacts

# Monitor specific package tests
act --container-architecture linux/amd64 -j test --artifact-server-path /tmp/artifacts 2>&1 | grep api-gateway
```

### Common Test Scenarios

#### Authentication Testing

```typescript
// Test missing authorization
const response = await app.inject({
  method: 'GET', 
  url: '/api/v1/ai-service/models'
  // No authorization header - expects 401
});

// Test valid mock token
const response = await app.inject({
  method: 'GET',
  url: '/api/v1/ai-service/models',
  headers: { 'Authorization': 'Bearer mock-token' }
  // Expects 200 with mock response
});
```

#### Service Integration Testing

```typescript
// Test multiple service requests
const requests = [
  '/api/v1/ai-service/models',
  '/api/v1/project-service/projects', 
  '/api/v1/task-service/tasks'
];

const responses = await Promise.all(
  requests.map(url => app.inject({
    method: 'GET', url,
    headers: { 'Authorization': 'Bearer mock-token' }
  }))
);
// All should return 200 with mock data
```

### Troubleshooting Common Issues

#### Authentication Tests Failing
**Issue**: Tests expecting 401 status codes receive 200
**Solution**: Ensure JWT verification properly handles invalid tokens:
```typescript
try {
  payload = fastify.jwt.verify(token);
} catch (jwtError) {
  return reply.status(401).send({ error: 'Unauthorized' });
}
```

#### Circuit Breaker Decorator Missing
**Issue**: `TypeError: app.getCircuitBreakerStatus is not a function`
**Solution**: Add initialization timing buffer and safety checks:
```typescript
await app.ready();
await new Promise(resolve => setTimeout(resolve, 100));
```

#### Health Check Dependencies
**Issue**: Health endpoint returns 503 in test environment
**Solution**: Health checks automatically handle missing dependencies in test mode

#### Test Hanging
**Issue**: Tests run indefinitely without completing
**Solution**: Check for unmocked HTTP requests and ensure proper cleanup:
```typescript
afterEach(async () => {
  if (app) await app.close();
  jest.clearAllMocks();
});
```

### Coverage Goals

Current coverage targets:
```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80, 
    lines: 85,
    statements: 85,
  },
}
```

### Performance Benchmarks

- **Test Suite Execution**: ~4-6 seconds (all 209 tests)
- **Individual Test**: <100ms average
- **Integration Tests**: <500ms average
- **Contract Tests**: ~200ms average

For detailed testing guidelines, see `/docs/development/testing-guide.md`.

### Code Quality

```bash
# Run linting
npm run lint

# Run type checking
npm run typecheck

# Run all quality checks
npm run lint && npm run typecheck && npm test
```

### Docker

```bash
# Build Docker image
docker build -t cycletime/api-gateway .

# Run container
docker run -p 3000:3000 --env-file .env cycletime/api-gateway
```

## Monitoring

### Health Checks

The API Gateway provides several health check endpoints:

- **Health**: `/health` - Overall service health with dependency status
- **Ready**: `/ready` - Kubernetes readiness probe
- **Live**: `/live` - Kubernetes liveness probe

### Logging

Structured JSON logging with:
- Request/response logging
- Error tracking
- Security events
- Performance metrics

### Metrics

The health endpoint provides:
- Uptime information
- Memory usage
- Active connections
- Dependency status

## Security

### Authentication

- GitHub OAuth 2.0 integration
- JWT tokens with secure configuration
- Session management and cleanup

### Authorization

- Role-based access control (RBAC)
- Project-level permissions
- API key scoping

### Security Headers

- CORS configuration
- Helmet security headers
- CSRF protection
- XSS prevention

## Contributing

1. Follow the CLAUDE.md workflow
2. Write tests for new features
3. Ensure code passes linting and type checking
4. Update documentation as needed

## License

AGPL-3.0-or-later