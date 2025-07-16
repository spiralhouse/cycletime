# Service Migration Guide: Docker Services to TypeScript Packages

## Overview

This guide provides comprehensive patterns and guidelines for migrating Docker-based services to TypeScript packages within the CycleTime TurboRepo monorepo structure. The migration enables better code sharing, type safety, and development workflows while maintaining service isolation.

## Migration Strategy

### Current State Analysis

The CycleTime project currently has:
- **6 Docker services** in `/services/` directory (basic Node.js placeholders)
- **3 TypeScript packages** already migrated (`shared-types`, `ai-service`, `api-gateway`)
- **TurboRepo configuration** for build orchestration
- **Shared infrastructure** (PostgreSQL, Redis, MinIO) via Docker Compose

### Migration Benefits

1. **Type Safety**: Full TypeScript support with shared type definitions
2. **Code Sharing**: Easier sharing of common utilities and types
3. **Build Optimization**: TurboRepo caching and parallel builds
4. **Development Experience**: Better IDE support, refactoring, and debugging
5. **Testing**: Comprehensive unit and integration testing capabilities
6. **Deployment Flexibility**: Can be containerized or deployed as standalone services

## Service Inventory and Migration Priority

### High Priority (Core Services)
1. **claude-service** → Already partially migrated as `ai-service`
2. **task-service** → Integrate with Linear API, GitHub API
3. **document-service** → File processing and MinIO integration

### Medium Priority (Supporting Services)
4. **mcp-server** → MCP protocol implementation
5. **web-dashboard** → Frontend application

### Dependencies
- **api-gateway** → ✅ Already migrated
- **shared-types** → ✅ Already available

## Migration Patterns

### Package Structure Pattern

```
packages/[service-name]/
├── src/
│   ├── index.ts              # Main entry point
│   ├── server.ts             # HTTP server setup (if applicable)
│   ├── config.ts             # Configuration management
│   ├── types/                # Service-specific types
│   ├── routes/               # HTTP routes (for web services)
│   ├── services/             # Business logic
│   ├── middleware/           # Express/Fastify middleware
│   ├── utils/                # Utility functions
│   └── __tests__/            # Test files
├── dist/                     # Compiled JavaScript
├── coverage/                 # Test coverage reports
├── package.json              # Package configuration
├── tsconfig.json             # TypeScript configuration
├── jest.config.js            # Test configuration
├── Dockerfile                # Production container (optional)
└── README.md                 # Package documentation
```

### Naming Conventions

- **Package names**: `@cycletime/[service-name]` (e.g., `@cycletime/document-service`)
- **Directory names**: kebab-case (e.g., `document-service`)
- **Service identifiers**: Match the original service name for continuity

## Step-by-Step Migration Process

### Phase 1: Package Setup

1. **Create package directory**
   ```bash
   mkdir packages/[service-name]
   cd packages/[service-name]
   ```

2. **Initialize package.json** (see templates section)

3. **Set up TypeScript configuration** (see templates section)

4. **Configure testing framework** (Jest with ts-jest)

5. **Add to workspace** - TurboRepo automatically detects packages

### Phase 2: Code Migration

1. **Analyze existing service functionality**
   - Current `/services/[service]/server.js` placeholder
   - Docker Compose environment variables
   - Health check endpoints
   - Service dependencies

2. **Create TypeScript implementation**
   - Port placeholder functionality to TypeScript
   - Implement proper error handling
   - Add logging with Winston
   - Create comprehensive tests

3. **Integrate with shared packages**
   - Import types from `@cycletime/shared-types`
   - Use shared utilities and configurations

### Phase 3: Docker Integration

1. **Update Dockerfile** for TypeScript build
2. **Modify docker-compose.yml** to use new package
3. **Update build context** and volume mounts
4. **Test container functionality**

### Phase 4: CI/CD Integration

1. **TurboRepo tasks** automatically include new package
2. **Verify build dependencies** in `turbo.json`
3. **Update GitHub Actions** if needed
4. **Test remote caching** with Vercel integration

## Dependency Management Patterns

### Internal Dependencies

```json
{
  "dependencies": {
    "@cycletime/shared-types": "workspace:*",
    "@cycletime/api-gateway": "workspace:*"
  }
}
```

### External Dependencies

Common dependencies across services:
- **Web Framework**: Fastify (preferred) or Express
- **Validation**: Zod for schema validation
- **Logging**: Winston for structured logging
- **Testing**: Jest with ts-jest
- **Database**: Prisma client (if needed)
- **Queue**: Redis client (if needed)

### Version Management

- Use `workspace:*` for internal dependencies
- Pin major versions for external dependencies
- Regular dependency updates via Dependabot

## Testing Patterns

### Test Structure

```
src/__tests__/
├── setup.ts                 # Test environment setup
├── [module].test.ts         # Unit tests
├── [module].integration.test.ts  # Integration tests
└── __mocks__/              # Mock implementations
```

### Testing Strategies

1. **Unit Tests**: Pure functions, business logic
2. **Integration Tests**: Database interactions, external APIs
3. **E2E Tests**: Full service workflows
4. **Contract Tests**: API endpoint validation

### Test Configuration

Each package includes:
- Jest configuration with coverage reporting
- Test setup for database/Redis connections
- Mock implementations for external services
- Shared test utilities

## Docker Integration Patterns

### Development Dockerfile Pattern

```dockerfile
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY packages/[service-name]/package*.json ./packages/[service-name]/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/[service-name]/src ./packages/[service-name]/src
COPY packages/[service-name]/tsconfig.json ./packages/[service-name]/

# Build the service
RUN npm run build --workspace=@cycletime/[service-name]

EXPOSE [PORT]

CMD ["npm", "run", "start", "--workspace=@cycletime/[service-name]"]
```

### Production Dockerfile Pattern

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build --workspace=@cycletime/[service-name]

FROM node:20-alpine AS production

WORKDIR /app
COPY --from=builder /app/packages/[service-name]/dist ./dist
COPY --from=builder /app/packages/[service-name]/package.json ./

RUN npm ci --only=production

EXPOSE [PORT]

CMD ["node", "dist/index.js"]
```

## TurboRepo Integration

### Build Dependencies

Update `turbo.json` for new packages:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "coverage/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

### Cache Optimization

- Build outputs cached in `.turbo/cache/`
- Remote caching via Vercel integration
- Parallel execution of independent tasks

## Migration Checklist

See [migration-checklist.md](./migration-checklist.md) for detailed step-by-step checklist.

## Common Pitfalls and Solutions

### 1. Circular Dependencies

**Problem**: Package A depends on Package B, which depends on Package A.

**Solution**: Extract shared functionality to a separate package or use dependency injection.

### 2. Docker Build Context

**Problem**: Docker can't access files outside the build context.

**Solution**: Set build context to project root and copy specific packages.

### 3. Environment Variables

**Problem**: Different variable names between Docker and TypeScript.

**Solution**: Create configuration layer that maps Docker env vars to TypeScript config.

### 4. Database Connections

**Problem**: Multiple packages trying to initialize database connections.

**Solution**: Use singleton pattern or dependency injection for shared resources.

## Performance Considerations

### Build Performance

- Use TurboRepo caching effectively
- Minimize Docker layer rebuilds
- Parallel package builds where possible

### Runtime Performance

- Use connection pooling for databases
- Implement health checks properly
- Monitor memory usage in containers

### Development Performance

- Use `ts-node-dev` for development hot reloading
- Optimize TypeScript compilation with incremental builds
- Use Docker volume mounts for faster development cycles

## Security Considerations

### Package Security

- Regular dependency audits with `npm audit`
- Use Dependabot for security updates
- Validate input data with Zod schemas

### Container Security

- Use non-root users in containers
- Minimize attack surface with Alpine images
- Regular base image updates

## Next Steps

1. Start with **document-service** migration (lower complexity)
2. Follow with **task-service** (higher business value)
3. Complete remaining services based on priority
4. Optimize build and deployment pipelines
5. Implement monitoring and observability

## Quick Start Guide

### Automated Package Creation

Use the provided automation script to quickly create new packages:

```bash
# Create a new web service package
./docs/architecture/migration-templates/create-package.sh \
  document-service \
  "Document processing and storage service" \
  web-service

# Create a new library package
./docs/architecture/migration-templates/create-package.sh \
  shared-utils \
  "Common utility functions and helpers" \
  library
```

### Template Files

The migration templates directory contains ready-to-use templates:

- `package.json.template` - Package configuration template
- `tsconfig.json.template` - TypeScript configuration
- `jest.config.js.template` - Testing configuration
- `Dockerfile.template` - Container configuration
- `create-package.sh` - Automation script

## Related Documentation

- [Package Creation Patterns](./package-creation-patterns.md) - Detailed templates and patterns
- [Migration Checklist](./migration-checklist.md) - Step-by-step migration process
- [Migration Examples](./migration-examples.md) - Real-world migration examples
- [TurboRepo Monorepo Strategy](./monorepo-strategy.md) - Build system strategy
- [CI/CD Pipeline](./ci-cd-pipeline.md) - Deployment automation