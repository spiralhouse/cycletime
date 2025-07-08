# Technical Design: API Gateway & Authentication

## Overview

This document outlines the technical design for CycleTime's API Gateway and Authentication system (SPI-12). The system serves as the central entry point for all API requests, handling authentication, authorization, routing, and cross-cutting concerns like rate limiting and request validation.

## Architecture Decisions

### 1. Framework Selection: Fastify

**Decision**: Use Fastify as the API gateway framework
**Rationale**: 
- High performance (up to 30% faster than Express)
- TypeScript-first design with excellent type safety
- Built-in schema validation with JSON Schema
- Plugin ecosystem for authentication, rate limiting, and CORS
- Better suited for microservices architecture

**Alternative Considered**: Express.js - More common but slower and less type-safe

### 2. Authentication Strategy: GitHub OAuth + JWT

**Decision**: Implement GitHub OAuth 2.0 with JWT tokens for session management
**Rationale**:
- Aligns with CycleTime's GitHub-centric workflow
- Eliminates password management overhead
- Provides user profile data (avatar, name, email)
- Industry standard OAuth 2.0 implementation
- JWT tokens enable stateless authentication

**Flow**:
1. User initiates GitHub OAuth flow
2. GitHub redirects with authorization code
3. Exchange code for GitHub access token
4. Fetch user profile from GitHub API
5. Create/update user in database
6. Issue JWT token with user claims
7. Client stores JWT for subsequent requests

### 3. Authorization Model: Role-Based Access Control (RBAC)

**Decision**: Implement RBAC with project-level permissions
**Rationale**:
- Flexible permission model for team collaboration
- Scalable to enterprise use cases
- Clear separation of concerns
- Integrates with existing database schema

**Roles**:
- `OWNER`: Full access to project and billing
- `ADMIN`: Project management and user management
- `MEMBER`: Read/write access to project resources
- `VIEWER`: Read-only access

### 4. API Key Management for MCP Servers

**Decision**: Separate API key system for Machine-to-Machine authentication
**Rationale**:
- MCP servers need programmatic access
- Different security model than user authentication
- Supports key rotation and scoping
- Enables audit logging for automated requests

## System Components

### 1. API Gateway Service

**Location**: `/packages/api-gateway/`
**Responsibilities**:
- Request routing to microservices
- Authentication and authorization
- Rate limiting and request validation
- CORS handling
- Request/response logging
- Error handling and standardization

**Core Routes**:
```typescript
// Authentication
POST /auth/github/oauth    // Initiate GitHub OAuth
GET  /auth/github/callback // OAuth callback
POST /auth/refresh         // Refresh JWT token
POST /auth/logout          // Invalidate session

// User Management
GET  /api/v1/user/profile  // Current user profile
PUT  /api/v1/user/profile  // Update user profile

// Project Management
GET    /api/v1/projects           // List user projects
POST   /api/v1/projects           // Create project
GET    /api/v1/projects/:id       // Get project details
PUT    /api/v1/projects/:id       // Update project
DELETE /api/v1/projects/:id       // Delete project

// Project Members
GET    /api/v1/projects/:id/members    // List project members
POST   /api/v1/projects/:id/members    // Add project member
PUT    /api/v1/projects/:id/members/:userId // Update member role
DELETE /api/v1/projects/:id/members/:userId // Remove member

// API Key Management
GET    /api/v1/api-keys     // List user API keys
POST   /api/v1/api-keys     // Create API key
DELETE /api/v1/api-keys/:id // Revoke API key

// Service Proxying (authenticated)
ALL /api/v1/documents/*     // Proxy to Document Service
ALL /api/v1/ai/*           // Proxy to Claude AI Service
ALL /api/v1/github/*       // Proxy to GitHub Integration
ALL /api/v1/linear/*       // Proxy to Linear Integration
```

### 2. Authentication Middleware

**JWT Verification**:
```typescript
interface JWTPayload {
  sub: string;        // User ID
  email: string;      // User email
  github_id: number;  // GitHub user ID
  github_username: string;
  iat: number;        // Issued at
  exp: number;        // Expires at
}
```

**API Key Verification**:
```typescript
interface APIKeyContext {
  id: string;         // API key ID
  user_id: string;    // Owner user ID
  name: string;       // Human-readable name
  permissions: string[]; // Scoped permissions
  last_used_at: Date; // Usage tracking
}
```

### 3. Authorization Middleware

**Project-Level Authorization**:
```typescript
interface ProjectPermission {
  project_id: string;
  user_id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  permissions: {
    read: boolean;
    write: boolean;
    admin: boolean;
    delete: boolean;
  };
}
```

## Database Integration

### Schema Usage

The system leverages the existing Prisma schema for:
- **Users**: Store GitHub user data and preferences
- **UserSessions**: Track active JWT sessions for security
- **ApiKeys**: Manage MCP server authentication
- **Projects**: Project metadata and settings
- **ProjectMembers**: RBAC membership and roles

### New Schema Requirements

No additional schema changes required - the existing Phase 1 and Phase 2 database schema supports all authentication and authorization needs.

## Security Considerations

### 1. JWT Security

**Token Expiration**:
- Access tokens: 1 hour expiration
- Refresh tokens: 30 days expiration
- Automatic rotation on refresh

**Token Storage**:
- Secure HttpOnly cookies for web clients
- Authorization header for API clients
- Secure flag and SameSite=Strict

### 2. API Key Security

**Key Generation**:
- Cryptographically secure random generation
- bcrypt hashing before database storage
- Prefix-based identification (ct_live_*, ct_test_*)

**Permissions Scoping**:
```typescript
type APIKeyPermission = 
  | 'projects:read'
  | 'projects:write'
  | 'documents:read'
  | 'documents:write'
  | 'ai:request'
  | 'github:read'
  | 'linear:read'
  | 'linear:write';
```

### 3. Rate Limiting

**User-based Limits**:
- 1000 requests per hour per user
- 100 requests per minute per user
- Burst allowance of 20 requests

**API Key Limits**:
- 10,000 requests per hour per key
- 500 requests per minute per key
- Project-specific quotas

### 4. CORS Configuration

**Allowed Origins**:
- `https://cycletime.ai` (production)
- `https://staging.cycletime.ai` (staging)
- `http://localhost:3000` (development)
- `http://127.0.0.1:3000` (development)

## Implementation Plan

### Phase 1: Core Gateway Infrastructure
1. Fastify server setup with TypeScript
2. Basic middleware pipeline (logging, CORS, error handling)
3. Health check endpoints
4. Database connection setup

### Phase 2: Authentication Implementation
1. GitHub OAuth integration
2. JWT token generation and verification
3. User session management
4. Authentication middleware

### Phase 3: Authorization System
1. RBAC middleware implementation
2. Project permission checking
3. API key management endpoints
4. Permission-based route protection

### Phase 4: Rate Limiting and Security
1. Rate limiting middleware
2. Request validation schemas
3. Security headers and CSRF protection
4. Audit logging for sensitive operations

### Phase 5: Service Integration
1. Service discovery and routing
2. Request proxying to microservices
3. Response transformation and error handling
4. Circuit breaker implementation

## API Specifications

### Authentication Endpoints

#### POST /auth/github/oauth
Initiates GitHub OAuth flow

**Request**:
```typescript
{
  redirect_uri?: string; // Optional redirect after auth
}
```

**Response**:
```typescript
{
  oauth_url: string;     // GitHub OAuth URL
  state: string;         // CSRF protection state
}
```

#### GET /auth/github/callback
Handles GitHub OAuth callback

**Query Parameters**:
- `code`: Authorization code from GitHub
- `state`: CSRF protection state

**Response**:
```typescript
{
  access_token: string;  // JWT access token
  refresh_token: string; // JWT refresh token
  expires_in: number;    // Token expiration (seconds)
  user: {
    id: string;
    email: string;
    name: string;
    github_username: string;
    avatar_url: string;
  };
}
```

#### POST /auth/refresh
Refreshes JWT tokens

**Request**:
```typescript
{
  refresh_token: string;
}
```

**Response**:
```typescript
{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}
```

### Project Management Endpoints

#### GET /api/v1/projects
Lists user's accessible projects

**Response**:
```typescript
{
  projects: Array<{
    id: string;
    name: string;
    description: string;
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
    role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
    created_at: string;
    updated_at: string;
  }>;
  pagination: {
    total: number;
    page: number;
    per_page: number;
  };
}
```

#### POST /api/v1/projects
Creates new project

**Request**:
```typescript
{
  name: string;
  description?: string;
  settings?: Record<string, unknown>;
}
```

**Response**:
```typescript
{
  project: {
    id: string;
    name: string;
    description: string;
    status: 'DRAFT';
    created_at: string;
    updated_at: string;
  };
}
```

### API Key Management

#### POST /api/v1/api-keys
Creates new API key

**Request**:
```typescript
{
  name: string;
  permissions: APIKeyPermission[];
  expires_at?: string; // ISO date or null for no expiration
}
```

**Response**:
```typescript
{
  api_key: {
    id: string;
    name: string;
    key: string;        // Only returned on creation
    permissions: APIKeyPermission[];
    expires_at: string | null;
    created_at: string;
  };
}
```

## Error Handling

### Standard Error Response Format
```typescript
{
  error: {
    code: string;       // Machine-readable error code
    message: string;    // Human-readable error message
    details?: unknown;  // Additional error context
    request_id: string; // For debugging and support
  };
}
```

### Error Codes
- `AUTH_REQUIRED`: Authentication required
- `AUTH_INVALID`: Invalid authentication credentials
- `AUTH_EXPIRED`: Token has expired
- `FORBIDDEN`: Insufficient permissions
- `RATE_LIMITED`: Rate limit exceeded
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `INTERNAL_ERROR`: Internal server error

## Monitoring and Observability

### Metrics Collection
- Request rate and response times
- Authentication success/failure rates
- Rate limiting trigger frequency
- Error rates by endpoint and error type
- Active user sessions and API key usage

### Logging Standards
```typescript
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  request_id: string;
  user_id?: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  ip_address: string;
  user_agent: string;
  error?: string;
}
```

### Health Check Endpoint
```typescript
GET /health
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  dependencies: {
    database: 'healthy' | 'unhealthy';
    github_api: 'healthy' | 'unhealthy';
  };
  metrics: {
    uptime_seconds: number;
    memory_usage_mb: number;
    active_connections: number;
  };
}
```

## Configuration Management

### Environment Variables
```bash
# Server Configuration
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://...

# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_REDIRECT_URI=https://cycletime.ai/auth/callback

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=30d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=1000

# Service URLs
DOCUMENT_SERVICE_URL=http://document-service:3001
AI_SERVICE_URL=http://claude-service:3002
GITHUB_SERVICE_URL=http://github-service:3003
LINEAR_SERVICE_URL=http://linear-service:3004
```

## Testing Strategy

### Unit Tests
- Authentication middleware logic
- Authorization permission checking
- JWT token generation and validation
- API key hashing and verification
- Rate limiting algorithm

### Integration Tests
- GitHub OAuth flow end-to-end
- Database user session management
- Project permission enforcement
- Service proxying and routing
- Error handling and edge cases

### Security Tests
- JWT token manipulation attempts
- SQL injection protection
- XSS and CSRF protection
- Rate limiting enforcement
- API key enumeration protection

## Deployment Considerations

### Container Configuration
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Kubernetes Deployment
- Horizontal Pod Autoscaling based on CPU/memory
- Service mesh integration for inter-service communication
- ConfigMaps for environment-specific configuration
- Secrets for sensitive credentials

### Load Balancer Configuration
- Session affinity not required (stateless JWT)
- Health check endpoint integration
- SSL termination at load balancer
- Rate limiting can be handled at application level

## Future Enhancements

### Multi-Factor Authentication
- TOTP (Time-based One-Time Password) support
- SMS/Email verification for sensitive operations
- Recovery codes for account access

### Advanced Authorization
- Resource-level permissions (document-specific access)
- Temporary access tokens with expiration
- Delegation and service account support

### API Gateway Features
- Request/response transformation
- API versioning support
- GraphQL federation
- WebSocket support for real-time features

---

*This technical design serves as the blueprint for implementing CycleTime's API Gateway and Authentication system. All implementation should follow this design, with any deviations requiring design document updates and approval.*