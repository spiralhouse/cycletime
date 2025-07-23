import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { logger } from '@cycletime/shared-utils';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.TASK_SERVICE_PORT = '8005';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.SCHEDULER_ENABLED = 'false';
process.env.METRICS_ENABLED = 'false';
process.env.NOTIFICATIONS_ENABLED = 'false';
process.env.ANALYTICS_ENABLED = 'false';

// Global test setup
beforeAll(async () => {
  // Setup test environment
  logger.info('Setting up test environment');
});

afterAll(async () => {
  // Cleanup test environment
  logger.info('Cleaning up test environment');
});

beforeEach(async () => {
  // Setup for each test
});

afterEach(async () => {
  // Cleanup after each test
});

// Mock implementations for testing will be done in individual test files as needed

// Placeholder test to prevent Jest failure
describe('Test Setup', () => {
  it('should setup test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

// Test utilities
export const testUtils = {
  createMockTask: (overrides: any = {}) => ({
    id: 'test-task-id',
    title: 'Test Task',
    description: 'Test task description',
    status: 'pending',
    priority: 'medium',
    type: 'feature',
    estimatedHours: 8,
    actualHours: 0,
    progress: 0,
    tags: ['test'],
    metadata: {},
    assignee: null,
    project: null,
    dependencies: { blocks: [], dependsOn: [], subtasks: [], parent: null },
    schedule: { startDate: null, dueDate: null, scheduledAt: null, recurringPattern: null },
    audit: {
      createdBy: 'test-user',
      createdAt: new Date().toISOString(),
      updatedBy: 'test-user',
      updatedAt: new Date().toISOString(),
      version: 1
    },
    history: [],
    ...overrides
  }),

  createMockUser: (overrides: any = {}) => ({
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    ...overrides
  }),

  createMockProject: (overrides: any = {}) => ({
    id: 'test-project-id',
    name: 'Test Project',
    ...overrides
  }),

  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};