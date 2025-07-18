# @cycletime/shared-types

Shared TypeScript types and interfaces for CycleTime services.

## Overview

This package provides common type definitions used across all CycleTime services, ensuring type safety and consistency in API contracts, data structures, and inter-service communication.

## Installation

```bash
npm install @cycletime/shared-types
```

## Usage

```typescript
import {
  APIResponse,
  User,
  AIRequest,
  Project,
  HttpStatus
} from '@cycletime/shared-types';

// Use in API responses
const response: APIResponse<User> = {
  success: true,
  data: {
    id: 'user-123',
    email: 'user@example.com',
    // ... other user fields
  },
  metadata: {
    requestId: 'req-456',
    timestamp: new Date().toISOString()
  }
};

// Use in service interfaces
function createAIRequest(request: Omit<AIRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIRequest> {
  // Implementation
}
```

## Type Categories

### Common Types (`common.ts`)
- `APIResponse<T>` - Standard API response wrapper
- `APIError` - Error response structure
- `HttpStatus` - HTTP status code enum
- `PaginationParams` - Pagination parameters
- `BaseEntity` - Base entity with ID and timestamps

### Authentication Types (`auth.ts`)
- `User` - User entity
- `UserContext` - User context for authenticated requests
- `JWTPayload` - JWT token payload structure
- `APIKey` - API key entity
- `ProjectRole` - Project role enum
- `ProjectPermission` - Project permission structure

### AI Service Types (`ai.ts`)
- `AiRequestType` - AI request type enum
- `AiRequestStatus` - AI request status enum
- `AiProvider` - AI provider enum
- `AIRequest` - AI request entity
- `AIResponse` - AI response entity
- `TokenUsage` - Token usage tracking
- `QueueMetrics` - Queue metrics structure

### Project Types (`project.ts`)
- `Project` - Project entity
- `Document` - Document entity
- `Task` - Task entity (Linear/GitHub integration)
- `DocumentType` - Document type enum
- `TaskStatus` - Task status enum
- `WebhookPayload` - Integration webhook payload

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
npm run test:coverage
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run typecheck
```

## Integration with TurboRepo

This package is built as part of the CycleTime monorepo using TurboRepo:

```bash
# Build shared-types package
turbo run build --filter=@cycletime/shared-types

# Test shared-types package
turbo run test --filter=@cycletime/shared-types

# Build all packages that depend on shared-types
turbo run build --filter=...@cycletime/shared-types
```

## Versioning

This package follows semantic versioning. Breaking changes to type definitions will result in major version bumps to ensure consuming services can manage updates appropriately.

## Contributing

When adding new types:

1. Place types in the appropriate category file
2. Export from the main `index.ts`
3. Add comprehensive tests in `__tests__/`
4. Update this README if adding new categories
5. Ensure types follow consistent naming conventions

## Type Naming Conventions

- **Interfaces**: PascalCase (e.g., `UserContext`, `APIResponse`)
- **Enums**: PascalCase (e.g., `HttpStatus`, `AiRequestType`)
- **Types**: PascalCase (e.g., `APIKeyPermission`)
- **Properties**: camelCase (e.g., `userId`, `createdAt`)
- **Enum Values**: SCREAMING_SNAKE_CASE (e.g., `IN_PROGRESS`, `BAD_REQUEST`)