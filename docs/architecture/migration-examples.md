# Service Migration Examples

## Overview

This document provides concrete examples of service migrations from Docker placeholders to TypeScript packages, using real services from the CycleTime project. These examples demonstrate the practical application of migration patterns and serve as references for future migrations.

## Example 1: Document Service Migration

### Current State Analysis

**Current Docker Service**: `/services/document-service/`
- Simple Node.js placeholder server
- Port: 8003
- Dependencies: MinIO for file storage
- Environment variables: MinIO credentials

**Migration Target**: `@cycletime/document-service` package
- TypeScript implementation with Fastify
- MinIO client integration
- File upload/download functionality
- Document metadata management

### Step-by-Step Migration

#### 1. Package Setup

```bash
# Create package using automation script
./docs/architecture/migration-templates/create-package.sh \
  document-service \
  "Document processing and storage service with MinIO integration" \
  web-service
```

#### 2. Enhanced Configuration

```typescript
// src/config.ts
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  // Server configuration
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  serviceName: z.string().default('document-service'),
  port: z.coerce.number().default(8003),
  host: z.string().default('0.0.0.0'),

  // Database configuration
  databaseUrl: z.string().url(),

  // MinIO configuration
  minio: z.object({
    endpoint: z.string().default('localhost'),
    port: z.coerce.number().default(9000),
    useSSL: z.boolean().default(false),
    accessKey: z.string(),
    secretKey: z.string(),
    bucketName: z.string().default('cycletime-documents')
  }),

  // File upload limits
  upload: z.object({
    maxFileSize: z.coerce.number().default(10 * 1024 * 1024), // 10MB
    allowedMimeTypes: z.array(z.string()).default([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ])
  }),

  // CORS and security
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string()), z.boolean()]).default(true),
    credentials: z.boolean().default(true)
  }),

  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info')
});

export const config = configSchema.parse({
  nodeEnv: process.env.NODE_ENV,
  serviceName: process.env.SERVICE_NAME,
  port: process.env.DOCUMENT_SERVICE_PORT,
  host: process.env.HOST,
  databaseUrl: process.env.DATABASE_URL,
  minio: {
    endpoint: process.env.MINIO_ENDPOINT?.replace('http://', '').replace('https://', ''),
    port: process.env.MINIO_PORT,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    bucketName: process.env.MINIO_BUCKET_NAME
  },
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE,
    allowedMimeTypes: process.env.ALLOWED_MIME_TYPES?.split(',')
  },
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },
  logLevel: process.env.LOG_LEVEL
});
```

#### 3. MinIO Service Implementation

```typescript
// src/services/minio-service.ts
import { Client } from 'minio';
import { config } from '../config';
import { logger } from '../utils/logger';

export class MinioService {
  private client: Client;
  private bucketName: string;

  constructor() {
    this.client = new Client({
      endPoint: config.minio.endpoint,
      port: config.minio.port,
      useSSL: config.minio.useSSL,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey
    });
    this.bucketName = config.minio.bucketName;
  }

  async initialize(): Promise<void> {
    try {
      // Check if bucket exists, create if not
      const bucketExists = await this.client.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.client.makeBucket(this.bucketName);
        logger.info(`Created MinIO bucket: ${this.bucketName}`);
      }
    } catch (error) {
      logger.error('Failed to initialize MinIO service', error);
      throw error;
    }
  }

  async uploadFile(
    fileName: string,
    buffer: Buffer,
    metaData: Record<string, string> = {}
  ): Promise<string> {
    try {
      const objectName = `${Date.now()}-${fileName}`;
      await this.client.putObject(this.bucketName, objectName, buffer, buffer.length, metaData);
      logger.info(`File uploaded successfully: ${objectName}`);
      return objectName;
    } catch (error) {
      logger.error('Failed to upload file', error);
      throw error;
    }
  }

  async downloadFile(objectName: string): Promise<Buffer> {
    try {
      const stream = await this.client.getObject(this.bucketName, objectName);
      const chunks: Buffer[] = [];
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error('Failed to download file', error);
      throw error;
    }
  }

  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucketName, objectName);
      logger.info(`File deleted successfully: ${objectName}`);
    } catch (error) {
      logger.error('Failed to delete file', error);
      throw error;
    }
  }

  async getFileInfo(objectName: string) {
    try {
      return await this.client.statObject(this.bucketName, objectName);
    } catch (error) {
      logger.error('Failed to get file info', error);
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: string; responseTime?: number }> {
    try {
      const startTime = Date.now();
      await this.client.bucketExists(this.bucketName);
      const responseTime = Date.now() - startTime;
      return { status: 'healthy', responseTime };
    } catch (error) {
      return { status: 'unhealthy' };
    }
  }
}

export const minioService = new MinioService();
```

#### 4. Document Routes Implementation

```typescript
// src/routes/documents.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { minioService } from '../services/minio-service';
import { config } from '../config';

const uploadSchema = z.object({
  filename: z.string().min(1),
  mimetype: z.string().refine(
    (type) => config.upload.allowedMimeTypes.includes(type),
    'File type not allowed'
  )
});

const downloadParamsSchema = z.object({
  documentId: z.string().min(1)
});

export async function documentRoutes(server: FastifyInstance) {
  // File upload endpoint
  server.post('/upload', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: 'No file provided'
        });
      }

      // Validate file
      const validation = uploadSchema.safeParse({
        filename: data.filename,
        mimetype: data.mimetype
      });

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: validation.error.errors[0].message
        });
      }

      // Check file size
      const buffer = await data.toBuffer();
      if (buffer.length > config.upload.maxFileSize) {
        return reply.status(400).send({
          success: false,
          error: 'File too large'
        });
      }

      // Upload to MinIO
      const objectName = await minioService.uploadFile(
        data.filename,
        buffer,
        {
          'Content-Type': data.mimetype,
          'Original-Name': data.filename
        }
      );

      return reply.send({
        success: true,
        data: {
          documentId: objectName,
          filename: data.filename,
          size: buffer.length,
          mimetype: data.mimetype,
          uploadedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      request.log.error('Upload failed', error);
      return reply.status(500).send({
        success: false,
        error: 'Upload failed'
      });
    }
  });

  // File download endpoint
  server.get('/download/:documentId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { documentId } = downloadParamsSchema.parse(request.params);

      // Get file info first
      const fileInfo = await minioService.getFileInfo(documentId);
      
      // Download file
      const buffer = await minioService.downloadFile(documentId);

      // Set appropriate headers
      reply.header('Content-Type', fileInfo.metaData['content-type'] || 'application/octet-stream');
      reply.header('Content-Length', buffer.length);
      reply.header('Content-Disposition', `attachment; filename="${fileInfo.metaData['original-name'] || documentId}"`);

      return reply.send(buffer);

    } catch (error) {
      request.log.error('Download failed', error);
      return reply.status(404).send({
        success: false,
        error: 'Document not found'
      });
    }
  });

  // File info endpoint
  server.get('/info/:documentId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { documentId } = downloadParamsSchema.parse(request.params);
      
      const fileInfo = await minioService.getFileInfo(documentId);

      return reply.send({
        success: true,
        data: {
          documentId,
          filename: fileInfo.metaData['original-name'],
          size: fileInfo.size,
          mimetype: fileInfo.metaData['content-type'],
          lastModified: fileInfo.lastModified,
          etag: fileInfo.etag
        }
      });

    } catch (error) {
      request.log.error('Get file info failed', error);
      return reply.status(404).send({
        success: false,
        error: 'Document not found'
      });
    }
  });

  // Delete file endpoint
  server.delete('/delete/:documentId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { documentId } = downloadParamsSchema.parse(request.params);
      
      await minioService.deleteFile(documentId);

      return reply.send({
        success: true,
        message: 'Document deleted successfully'
      });

    } catch (error) {
      request.log.error('Delete failed', error);
      return reply.status(500).send({
        success: false,
        error: 'Delete failed'
      });
    }
  });
}
```

#### 5. Enhanced Health Checks

```typescript
// src/routes/health.ts (enhanced version)
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config';
import { minioService } from '../services/minio-service';

export async function healthRoutes(server: FastifyInstance) {
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const healthCheck = {
      status: 'healthy',
      service: config.serviceName,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: config.nodeEnv,
      checks: {
        minio: await minioService.healthCheck(),
        memory: checkMemory()
      }
    };

    // Determine overall health based on dependencies
    const isHealthy = Object.values(healthCheck.checks).every(
      check => check.status === 'healthy'
    );

    const statusCode = isHealthy ? 200 : 503;
    healthCheck.status = isHealthy ? 'healthy' : 'unhealthy';

    return reply.status(statusCode).send(healthCheck);
  });
}

function checkMemory(): { status: string; usage: NodeJS.MemoryUsage } {
  const usage = process.memoryUsage();
  const status = usage.heapUsed > 200 * 1024 * 1024 ? 'warning' : 'healthy'; // 200MB threshold
  return { status, usage };
}
```

#### 6. Comprehensive Testing

```typescript
// src/__tests__/minio-service.test.ts
import { MinioService } from '../services/minio-service';
import { config } from '../config';

// Mock MinIO client
jest.mock('minio');

describe('MinioService', () => {
  let minioService: MinioService;
  let mockClient: any;

  beforeEach(() => {
    const { Client } = require('minio');
    mockClient = {
      bucketExists: jest.fn(),
      makeBucket: jest.fn(),
      putObject: jest.fn(),
      getObject: jest.fn(),
      removeObject: jest.fn(),
      statObject: jest.fn()
    };
    Client.mockImplementation(() => mockClient);
    
    minioService = new MinioService();
  });

  describe('initialize', () => {
    it('should create bucket if it does not exist', async () => {
      mockClient.bucketExists.mockResolvedValue(false);
      mockClient.makeBucket.mockResolvedValue(undefined);

      await minioService.initialize();

      expect(mockClient.bucketExists).toHaveBeenCalledWith(config.minio.bucketName);
      expect(mockClient.makeBucket).toHaveBeenCalledWith(config.minio.bucketName);
    });

    it('should not create bucket if it exists', async () => {
      mockClient.bucketExists.mockResolvedValue(true);

      await minioService.initialize();

      expect(mockClient.bucketExists).toHaveBeenCalledWith(config.minio.bucketName);
      expect(mockClient.makeBucket).not.toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const fileName = 'test.pdf';
      const buffer = Buffer.from('test content');
      const metaData = { 'Content-Type': 'application/pdf' };

      mockClient.putObject.mockResolvedValue(undefined);

      const result = await minioService.uploadFile(fileName, buffer, metaData);

      expect(result).toMatch(/^\d+-test\.pdf$/);
      expect(mockClient.putObject).toHaveBeenCalledWith(
        config.minio.bucketName,
        expect.stringMatching(/^\d+-test\.pdf$/),
        buffer,
        buffer.length,
        metaData
      );
    });
  });

  // Add more tests for other methods...
});
```

#### 7. Docker Compose Integration

```yaml
# Updated docker-compose.yml service definition
document-service:
  build:
    context: .
    dockerfile: packages/document-service/Dockerfile
    args:
      PACKAGE_NAME: @cycletime/document-service
  container_name: cycletime-documents
  environment:
    NODE_ENV: ${NODE_ENV:-development}
    DATABASE_URL: postgresql://${POSTGRES_USER:-cycletime}:${POSTGRES_PASSWORD:-development_password}@postgres:5432/${POSTGRES_DB:-cycletime_dev}
    DOCUMENT_SERVICE_PORT: ${DOCUMENT_SERVICE_PORT:-8003}
    MINIO_ENDPOINT: minio:9000
    MINIO_ACCESS_KEY: ${MINIO_ROOT_USER:-minioadmin}
    MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD:-minioadmin123}
    MINIO_BUCKET_NAME: cycletime-documents
    MAX_FILE_SIZE: 52428800  # 50MB
    ALLOWED_MIME_TYPES: application/pdf,image/jpeg,image/png,text/plain
  volumes:
    - ./packages/document-service:/app
    - cycletime_node_modules:/app/node_modules
  ports:
    - "${DOCUMENT_SERVICE_PORT:-8003}:8003"
  networks:
    - cycletime-network
  depends_on:
    - minio
    - api-gateway
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8003/health"]
    interval: 30s
    timeout: 10s
    retries: 3
  restart: unless-stopped
```

## Example 2: Task Service Migration

### Current State Analysis

**Current Docker Service**: `/services/task-service/`
- Simple Node.js placeholder
- Port: 8004
- Dependencies: Linear API, GitHub API
- Environment variables: API keys

**Migration Target**: `@cycletime/task-service` package
- TypeScript implementation
- Linear SDK integration
- GitHub API integration
- Task synchronization logic

### Key Implementation Highlights

#### 1. Package Configuration

```json
{
  "name": "@cycletime/task-service",
  "version": "1.0.0",
  "description": "Task management service with Linear and GitHub integration",
  "dependencies": {
    "@cycletime/shared-types": "workspace:*",
    "@linear/sdk": "^1.22.0",
    "@octokit/rest": "^20.0.2",
    "fastify": "^4.24.3",
    "zod": "^3.22.4",
    "winston": "^3.11.0"
  }
}
```

#### 2. Linear Integration Service

```typescript
// src/services/linear-service.ts
import { LinearClient } from '@linear/sdk';
import { config } from '../config';
import type { Issue, Project, Team } from '@cycletime/shared-types';

export class LinearService {
  private client: LinearClient;

  constructor() {
    this.client = new LinearClient({
      apiKey: config.linear.apiKey
    });
  }

  async getTeamIssues(teamId: string): Promise<Issue[]> {
    const issues = await this.client.issues({
      filter: { team: { id: { eq: teamId } } }
    });

    return issues.nodes.map(this.transformIssue);
  }

  async createIssue(data: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>): Promise<Issue> {
    const result = await this.client.createIssue({
      title: data.title,
      description: data.description,
      teamId: data.teamId,
      projectId: data.projectId,
      assigneeId: data.assigneeId,
      priority: data.priority
    });

    return this.transformIssue(result.issue);
  }

  private transformIssue(linearIssue: any): Issue {
    return {
      id: linearIssue.id,
      title: linearIssue.title,
      description: linearIssue.description,
      status: linearIssue.state.name,
      priority: linearIssue.priority,
      assigneeId: linearIssue.assignee?.id,
      teamId: linearIssue.team.id,
      projectId: linearIssue.project?.id,
      createdAt: new Date(linearIssue.createdAt),
      updatedAt: new Date(linearIssue.updatedAt)
    };
  }

  async healthCheck(): Promise<{ status: string; responseTime?: number }> {
    try {
      const startTime = Date.now();
      await this.client.viewer;
      const responseTime = Date.now() - startTime;
      return { status: 'healthy', responseTime };
    } catch (error) {
      return { status: 'unhealthy' };
    }
  }
}
```

## Migration Benefits Demonstrated

### 1. Type Safety
- Full TypeScript support across all services
- Shared type definitions prevent API contract drift
- Compile-time error detection

### 2. Code Reusability
- Shared utilities and middleware
- Common error handling patterns
- Consistent logging and configuration

### 3. Testing Coverage
- Comprehensive unit and integration tests
- Mock-friendly architecture
- Coverage reporting and enforcement

### 4. Development Experience
- Hot reloading in development
- IDE support with autocomplete
- Easier debugging and profiling

### 5. Build Optimization
- TurboRepo parallel builds
- Incremental compilation
- Remote caching for faster CI/CD

### 6. Deployment Flexibility
- Can be deployed as containers or serverless functions
- Environment-specific configurations
- Graceful shutdown handling

## Common Migration Patterns

### 1. Configuration Management
- Zod schemas for validation
- Environment variable mapping
- Type-safe configuration objects

### 2. Service Dependencies
- Dependency injection patterns
- Health check implementations
- Connection pooling and management

### 3. Error Handling
- Structured error responses
- Logging with context
- Graceful degradation

### 4. Testing Strategies
- Service mocking patterns
- Integration test setups
- Coverage enforcement

### 5. Docker Integration
- Multi-stage builds
- Development vs. production configs
- Health check implementations

## Next Steps

1. **Complete Document Service Migration**: Use this example as the template
2. **Task Service Migration**: Implement Linear and GitHub integrations
3. **MCP Server Migration**: Add WebSocket support and MCP protocol implementation
4. **Web Dashboard Migration**: Convert to Next.js package
5. **Monitoring and Observability**: Add metrics and tracing to all services

## Related Documentation

- [Service Migration Guide](./service-migration-guide.md)
- [Package Creation Patterns](./package-creation-patterns.md)
- [Migration Checklist](./migration-checklist.md)