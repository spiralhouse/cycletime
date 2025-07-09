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
```

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