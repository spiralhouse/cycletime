# Package Creation Patterns and Templates

## Overview

This document provides standardized templates and patterns for creating new TypeScript packages in the CycleTime monorepo. These templates ensure consistency, maintainability, and proper integration with the TurboRepo build system. For detailed TurboRepo configuration, see [Build System Documentation](../development/build-system.md).

## Standard Package Templates

### 1. Web Service Package Template

For HTTP-based services (API Gateway, Document Service, Task Service):

#### package.json Template

```json
{
  "name": "@cycletime/[service-name]",
  "version": "1.0.0",
  "description": "[Service description]",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts --no-warn-ignored",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist coverage"
  },
  "dependencies": {
    "@cycletime/shared-types": "workspace:*",
    "fastify": "^4.24.3",
    "@fastify/cors": "^9.0.1",
    "@fastify/helmet": "^11.1.1",
    "@fastify/rate-limit": "^9.1.0",
    "zod": "^3.22.4",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.5",
    "typescript": "^5.3.3",
    "ts-node-dev": "^2.0.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8",
    "ts-jest": "^29.1.1",
    "@typescript-eslint/eslint-plugin": "^6.13.2",
    "@typescript-eslint/parser": "^6.13.2",
    "eslint": "^8.55.0"
  },
  "keywords": [
    "[service-keywords]",
    "typescript",
    "fastify",
    "cycletime"
  ],
  "author": "CycleTime Team",
  "license": "MIT",
  "files": [
    "dist"
  ],
  "publishConfig": {
    "access": "restricted"
  }
}
```

#### tsconfig.json Template

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": ["node", "jest"]
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

#### jest.config.js Template

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/__tests__/setup.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 10000
};
```

### 2. Library Package Template

For shared utilities and non-HTTP services:

#### package.json Template (Library)

```json
{
  "name": "@cycletime/[library-name]",
  "version": "0.1.0",
  "description": "[Library description]",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts --no-warn-ignored",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [
    "[library-keywords]",
    "typescript",
    "library",
    "cycletime"
  ],
  "author": "CycleTime Team",
  "license": "MIT",
  "devDependencies": {
    "@types/jest": "^29.5.5",
    "@types/node": "^20.6.0",
    "@typescript-eslint/eslint-plugin": "^6.7.0",
    "@typescript-eslint/parser": "^6.7.0",
    "eslint": "^8.49.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "typescript": "^5.2.2"
  },
  "files": [
    "dist"
  ],
  "publishConfig": {
    "access": "restricted"
  }
}
```

## Source Code Templates

### 1. Web Service Entry Point (src/index.ts)

```typescript
import { createServer } from './server';
import { config } from './config';
import { logger } from './utils/logger';

async function bootstrap() {
  try {
    const server = await createServer();
    
    await server.listen({
      port: config.port,
      host: config.host
    });

    logger.info(`🚀 ${config.serviceName} started successfully`, {
      port: config.port,
      host: config.host,
      environment: config.nodeEnv
    });

    // Graceful shutdown
    const signals = ['SIGTERM', 'SIGINT'] as const;
    
    for (const signal of signals) {
      process.on(signal, async () => {
        logger.info(`📤 Received ${signal}, shutting down gracefully`);
        
        try {
          await server.close();
          logger.info('✅ Server closed successfully');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during shutdown', error);
          process.exit(1);
        }
      });
    }

  } catch (error) {
    logger.error('❌ Failed to start server', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('🚨 Uncaught Exception:', error);
  process.exit(1);
});

bootstrap();
```

### 2. Server Configuration (src/server.ts)

```typescript
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { healthRoutes } from './routes/health';
import { apiRoutes } from './routes';

export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: false, // Use custom Winston logger
    trustProxy: true,
    disableRequestLogging: true // We handle this in middleware
  });

  // Security middleware
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  });

  // CORS configuration
  await server.register(cors, {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  // Rate limiting
  await server.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow
  });

  // Custom middleware
  await server.register(requestLogger);
  await server.register(errorHandler);

  // Routes
  await server.register(healthRoutes, { prefix: '/health' });
  await server.register(apiRoutes, { prefix: '/api/v1' });

  return server;
}
```

### 3. Configuration (src/config.ts)

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const configSchema = z.object({
  // Server configuration
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  serviceName: z.string().default('[service-name]'),
  port: z.coerce.number().default(8000),
  host: z.string().default('0.0.0.0'),

  // Database configuration
  databaseUrl: z.string().url(),

  // Redis configuration (if needed)
  redisUrl: z.string().url().optional(),

  // External API keys (if needed)
  apiKeys: z.object({
    // Add specific API keys as needed
  }).optional(),

  // CORS configuration
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string()), z.boolean()]).default(true),
    credentials: z.boolean().default(true)
  }),

  // Rate limiting
  rateLimit: z.object({
    max: z.number().default(100),
    timeWindow: z.string().default('1 minute')
  }),

  // Logging
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info')
});

export const config = configSchema.parse({
  nodeEnv: process.env.NODE_ENV,
  serviceName: process.env.SERVICE_NAME,
  port: process.env.PORT,
  host: process.env.HOST,
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },
  rateLimit: {
    max: process.env.RATE_LIMIT_MAX,
    timeWindow: process.env.RATE_LIMIT_WINDOW
  },
  logLevel: process.env.LOG_LEVEL
});

export type Config = typeof config;
```

### 4. Logger Utility (src/utils/logger.ts)

```typescript
import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: {
    service: config.serviceName
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add file transport in production
if (config.nodeEnv === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error'
  }));
  
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log'
  }));
}
```

### 5. Health Check Route (src/routes/health.ts)

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config';

export async function healthRoutes(server: FastifyInstance) {
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const healthCheck = {
      status: 'healthy',
      service: config.serviceName,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      environment: config.nodeEnv,
      checks: {
        database: await checkDatabase(),
        redis: await checkRedis(), // if applicable
        memory: checkMemory()
      }
    };

    return reply.status(200).send(healthCheck);
  });

  server.get('/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    // Readiness check - service is ready to receive traffic
    const isReady = await checkReadiness();
    
    if (isReady) {
      return reply.status(200).send({ status: 'ready' });
    } else {
      return reply.status(503).send({ status: 'not ready' });
    }
  });

  server.get('/live', async (request: FastifyRequest, reply: FastifyReply) => {
    // Liveness check - service is alive
    return reply.status(200).send({ status: 'alive' });
  });
}

async function checkDatabase(): Promise<{ status: string; responseTime?: number }> {
  try {
    const startTime = Date.now();
    // Add actual database check here
    const responseTime = Date.now() - startTime;
    return { status: 'healthy', responseTime };
  } catch (error) {
    return { status: 'unhealthy' };
  }
}

async function checkRedis(): Promise<{ status: string; responseTime?: number }> {
  try {
    const startTime = Date.now();
    // Add actual Redis check here
    const responseTime = Date.now() - startTime;
    return { status: 'healthy', responseTime };
  } catch (error) {
    return { status: 'unhealthy' };
  }
}

function checkMemory(): { status: string; usage: NodeJS.MemoryUsage } {
  const usage = process.memoryUsage();
  const status = usage.heapUsed > 100 * 1024 * 1024 ? 'warning' : 'healthy'; // 100MB threshold
  return { status, usage };
}

async function checkReadiness(): Promise<boolean> {
  try {
    const dbCheck = await checkDatabase();
    return dbCheck.status === 'healthy';
  } catch {
    return false;
  }
}
```

### 6. Test Setup (src/__tests__/setup.ts)

```typescript
import { jest } from '@jest/globals';

// Global test setup
beforeAll(async () => {
  // Setup test database connection
  // Initialize test Redis connection
  // Setup any global test utilities
});

afterAll(async () => {
  // Cleanup test database
  // Close test connections
  // Cleanup any global resources
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

// Global test utilities
export const createTestServer = async () => {
  // Return a test instance of the server
};

export const createMockRequest = (overrides = {}) => {
  return {
    headers: {},
    query: {},
    params: {},
    body: {},
    ...overrides
  };
};

export const createMockReply = () => {
  const reply = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis()
  };
  return reply;
};
```

## Docker Templates

### Development Dockerfile

```dockerfile
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY turbo.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the specific package
ARG PACKAGE_NAME
RUN npm run build --workspace=${PACKAGE_NAME}

# Expose port
ARG PORT=8000
EXPOSE ${PORT}

# Start the service
CMD npm run start --workspace=${PACKAGE_NAME}
```

### Production Dockerfile

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY packages/ ./packages/

# Install dependencies
RUN npm ci

# Build all packages
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
ARG PACKAGE_NAME
COPY --from=builder --chown=nextjs:nodejs /app/packages/${PACKAGE_NAME}/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/packages/${PACKAGE_NAME}/package.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

USER nextjs

EXPOSE 8000

CMD ["node", "dist/index.js"]
```

## Package Creation Script

Create a script to automate package creation:

```bash
#!/bin/bash
# scripts/create-package.sh

PACKAGE_NAME=$1
PACKAGE_TYPE=$2

if [ -z "$PACKAGE_NAME" ] || [ -z "$PACKAGE_TYPE" ]; then
  echo "Usage: ./scripts/create-package.sh <package-name> <web-service|library>"
  exit 1
fi

PACKAGE_DIR="packages/$PACKAGE_NAME"

# Create directory structure
mkdir -p "$PACKAGE_DIR/src"
mkdir -p "$PACKAGE_DIR/src/__tests__"
mkdir -p "$PACKAGE_DIR/src/types"
mkdir -p "$PACKAGE_DIR/src/utils"

if [ "$PACKAGE_TYPE" == "web-service" ]; then
  mkdir -p "$PACKAGE_DIR/src/routes"
  mkdir -p "$PACKAGE_DIR/src/services"
  mkdir -p "$PACKAGE_DIR/src/middleware"
fi

# Copy template files
# ... (implement template copying logic)

echo "✅ Package $PACKAGE_NAME created successfully!"
echo "📁 Location: $PACKAGE_DIR"
echo "🔧 Next steps:"
echo "   1. Update package.json with correct details"
echo "   2. Implement your service logic"
echo "   3. Add tests"
echo "   4. Update Docker Compose if needed"
```

## Best Practices

### 1. Package Naming

- Use `@cycletime/` scope for all packages
- Use kebab-case for package names
- Keep names descriptive but concise

### 2. Dependency Management

- Use `workspace:*` for internal dependencies
- Pin external dependency versions
- Regular security audits

### 3. Configuration

- Use Zod for environment variable validation
- Provide sensible defaults
- Document all configuration options

### 4. Testing

- Aim for 80%+ test coverage
- Write tests before implementation (TDD)
- Use descriptive test names

### 5. Documentation

- Include comprehensive README for each package
- Document all public APIs
- Provide usage examples

## Related Documentation

- [Service Migration Guide](./service-migration-guide.md) - Migration strategy and approach
- [Migration Checklist](./migration-checklist.md) - Step-by-step migration process
- [Monorepo Strategy](./monorepo-strategy.md) - Strategic monorepo overview
- [Build System](../development/build-system.md) - TurboRepo configuration and usage
- [Testing Guide](../development/testing-guide.md) - Package testing patterns