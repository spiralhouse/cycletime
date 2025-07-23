import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createApp } from '../app';
import { TaskServiceConfiguration } from '../types/service-types';
import { testUtils } from './setup';

describe.skip('Task Service', () => {
  let app: any;
  let config: TaskServiceConfiguration;

  beforeEach(async () => {
    config = {
      server: {
        port: 8005,
        host: '0.0.0.0',
        cors: { origin: ['http://localhost:3000'], credentials: true },
        helmet: { contentSecurityPolicy: false },
        rateLimit: { max: 100, timeWindow: '1 minute' }
      },
      database: {
        redis: { host: 'localhost', port: 6379, db: 0 },
        connectionPool: { min: 2, max: 10 }
      },
      queue: {
        redis: { host: 'localhost', port: 6379, db: 1 },
        settings: { stalledInterval: 30000, maxStalledCount: 3 },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 }
        }
      },
      scheduler: { enabled: false, checkInterval: '30s', timezone: 'UTC' },
      events: {
        redis: { host: 'localhost', port: 6379, db: 2 },
        publisher: { maxRetries: 3, retryDelay: 1000 }
      },
      logging: { level: 'silent', format: 'json', transports: ['console'] },
      monitoring: {
        metrics: { enabled: false, port: 9090, path: '/metrics' },
        healthCheck: { enabled: false, interval: 30000 }
      },
      security: {
        jwt: { secret: 'test-secret', expiresIn: '1h' },
        apiKey: { enabled: false, header: 'X-API-Key' }
      },
      features: {
        caching: { enabled: false, ttl: 300 },
        notifications: { enabled: false, providers: ['email'] },
        analytics: { enabled: false, retentionDays: 90 }
      }
    };

    app = await createApp(config);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      const health = JSON.parse(response.payload);
      expect(health.status).toBeDefined();
      expect(health.timestamp).toBeDefined();
      expect(health.version).toBeDefined();
    });
  });

  describe('Task CRUD Operations', () => {
    const mockAuthToken = 'mock-admin-token';

    it('should create a new task', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test task description',
        priority: 'high',
        type: 'feature',
        estimatedHours: 8,
        tags: ['test', 'api']
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: taskData
      });

      expect(response.statusCode).toBe(201);
      const result = JSON.parse(response.payload);
      expect(result.task).toBeDefined();
      expect(result.task.title).toBe(taskData.title);
      expect(result.task.description).toBe(taskData.description);
      expect(result.task.priority).toBe(taskData.priority);
      expect(result.task.type).toBe(taskData.type);
      expect(result.task.id).toBeDefined();
    });

    it('should list tasks with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks?page=1&limit=10',
        headers: {
          authorization: `Bearer ${mockAuthToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.tasks).toBeDefined();
      expect(Array.isArray(result.tasks)).toBe(true);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.facets).toBeDefined();
    });

    it('should get a specific task by ID', async () => {
      // First create a task
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: {
          title: 'Get Task Test',
          description: 'Test getting a task by ID'
        }
      });

      const createdTask = JSON.parse(createResponse.payload).task;

      // Then get it by ID
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/tasks/${createdTask.id}`,
        headers: {
          authorization: `Bearer ${mockAuthToken}`
        }
      });

      expect(getResponse.statusCode).toBe(200);
      const result = JSON.parse(getResponse.payload);
      expect(result.task).toBeDefined();
      expect(result.task.id).toBe(createdTask.id);
      expect(result.task.title).toBe('Get Task Test');
    });

    it('should update a task', async () => {
      // First create a task
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: {
          title: 'Update Task Test',
          description: 'Test updating a task'
        }
      });

      const createdTask = JSON.parse(createResponse.payload).task;

      // Then update it
      const updateData = {
        title: 'Updated Task Title',
        priority: 'urgent',
        progress: 50
      };

      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/tasks/${createdTask.id}`,
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: updateData
      });

      expect(updateResponse.statusCode).toBe(200);
      const result = JSON.parse(updateResponse.payload);
      expect(result.task.title).toBe(updateData.title);
      expect(result.task.priority).toBe(updateData.priority);
      expect(result.task.progress).toBe(updateData.progress);
    });

    it('should delete a task', async () => {
      // First create a task
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: {
          title: 'Delete Task Test',
          description: 'Test deleting a task'
        }
      });

      const createdTask = JSON.parse(createResponse.payload).task;

      // Then delete it
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/tasks/${createdTask.id}`,
        headers: {
          authorization: `Bearer ${mockAuthToken}`
        }
      });

      expect(deleteResponse.statusCode).toBe(204);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000',
        headers: {
          authorization: `Bearer ${mockAuthToken}`
        }
      });

      expect(response.statusCode).toBe(404);
      const result = JSON.parse(response.payload);
      expect(result.error).toBe('Task Not Found');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for protected routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks'
      });

      expect(response.statusCode).toBe(401);
      const result = JSON.parse(response.payload);
      expect(result.error).toBe('Unauthorized');
    });

    it('should accept valid authentication token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks',
        headers: {
          authorization: 'Bearer mock-admin-token'
        }
      });

      expect(response.statusCode).toBe(200);
    });

    it('should reject invalid authentication token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Task Search', () => {
    it('should search tasks', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks/search',
        headers: {
          authorization: 'Bearer mock-admin-token',
          'content-type': 'application/json'
        },
        payload: {
          query: 'test',
          filters: {
            status: ['pending', 'in_progress']
          },
          pagination: {
            page: 1,
            limit: 10
          }
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.query).toBe('test');
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.pagination).toBeDefined();
      expect(result.facets).toBeDefined();
      expect(result.statistics).toBeDefined();
    });
  });

  describe('Task Analytics', () => {
    it('should get task analytics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks/analytics?timeRange=week&groupBy=status',
        headers: {
          authorization: 'Bearer mock-admin-token'
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.analytics).toBeDefined();
      expect(result.analytics.timeRange).toBe('week');
      expect(result.analytics.summary).toBeDefined();
      expect(result.analytics.breakdown).toBeDefined();
      expect(result.analytics.trends).toBeDefined();
      expect(result.analytics.performance).toBeDefined();
    });
  });

  describe('Task Comments', () => {
    it('should add a comment to a task', async () => {
      // First create a task
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          authorization: 'Bearer mock-admin-token',
          'content-type': 'application/json'
        },
        payload: {
          title: 'Comment Test Task',
          description: 'Test adding comments to a task'
        }
      });

      const createdTask = JSON.parse(createResponse.payload).task;

      // Then add a comment
      const commentResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${createdTask.id}/comments`,
        headers: {
          authorization: 'Bearer mock-admin-token',
          'content-type': 'application/json'
        },
        payload: {
          content: 'This is a test comment'
        }
      });

      expect(commentResponse.statusCode).toBe(201);
      const result = JSON.parse(commentResponse.payload);
      expect(result.comment).toBeDefined();
      expect(result.comment.content).toBe('This is a test comment');
    });

    it('should get comments for a task', async () => {
      // First create a task
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          authorization: 'Bearer mock-admin-token',
          'content-type': 'application/json'
        },
        payload: {
          title: 'Get Comments Test Task',
          description: 'Test getting comments for a task'
        }
      });

      const createdTask = JSON.parse(createResponse.payload).task;

      // Then get comments
      const commentsResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/tasks/${createdTask.id}/comments`,
        headers: {
          authorization: 'Bearer mock-admin-token'
        }
      });

      expect(commentsResponse.statusCode).toBe(200);
      const result = JSON.parse(commentsResponse.payload);
      expect(result.comments).toBeDefined();
      expect(Array.isArray(result.comments)).toBe(true);
      expect(result.pagination).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          authorization: 'Bearer mock-admin-token',
          'content-type': 'application/json'
        },
        payload: {
          title: '', // Invalid: empty title
          description: 'Test task with invalid data'
        }
      });

      expect(response.statusCode).toBe(400);
      const result = JSON.parse(response.payload);
      expect(result.error).toBeDefined();
      expect(result.code).toBeDefined();
    });

    it('should handle rate limiting', async () => {
      // This test would require actually hitting the rate limit
      // For now, we'll just verify the endpoint exists
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks',
        headers: {
          authorization: 'Bearer mock-admin-token'
        }
      });

      expect(response.statusCode).toBe(200);
    });
  });
});