import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Global test setup
beforeAll(async () => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
});

afterAll(async () => {
  // Cleanup after all tests
});

beforeEach(async () => {
  // Setup before each test
});

afterEach(async () => {
  // Cleanup after each test
});

// Mock external dependencies
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    ping: jest.fn(() => Promise.resolve('PONG')),
    on: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  }))
}));

jest.mock('bull', () => ({
  Queue: jest.fn(() => ({
    add: jest.fn(),
    process: jest.fn(),
    getJobs: jest.fn(() => Promise.resolve([])),
    getJobCounts: jest.fn(() => Promise.resolve({ waiting: 0, active: 0, completed: 0, failed: 0 })),
    clean: jest.fn(),
    close: jest.fn()
  }))
}));

// Global test utilities
export const createMockUser = (id: string = 'user-123') => ({
  id,
  name: `Test User ${id}`,
  email: `test${id}@example.com`
});

export const createMockProject = (overrides: any = {}) => ({
  id: 'project-123',
  name: 'Test Project',
  description: 'Test project description',
  status: 'active',
  visibility: 'private',
  priority: 'medium',
  progress: 50,
  tags: ['test'],
  owner: createMockUser(),
  audit: {
    createdBy: 'user-123',
    createdAt: new Date().toISOString(),
    updatedBy: 'user-123',
    updatedAt: new Date().toISOString(),
    version: 1
  },
  ...overrides
});

export const createMockTemplate = (overrides: any = {}) => ({
  id: 'template-123',
  name: 'Test Template',
  description: 'Test template description',
  category: 'agile',
  visibility: 'public',
  configuration: {
    phases: [],
    taskTemplates: [],
    roles: []
  },
  metadata: {
    author: 'Test Author',
    version: '1.0.0',
    tags: ['test'],
    usageCount: 0
  },
  audit: {
    createdBy: 'user-123',
    createdAt: new Date().toISOString(),
    updatedBy: 'user-123',
    updatedAt: new Date().toISOString()
  },
  ...overrides
});

export const createMockTeamMember = (overrides: any = {}) => ({
  id: 'member-123',
  name: 'Test Member',
  email: 'member@example.com',
  role: 'member',
  permissions: ['read', 'write'],
  allocation: {
    percentage: 80,
    hoursPerWeek: 32
  },
  addedAt: new Date().toISOString(),
  addedBy: 'user-123',
  ...overrides
});

// Custom matchers
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false
      };
    }
  },
  
  toHaveValidTimestamp(received) {
    const timestamp = new Date(received);
    const pass = timestamp instanceof Date && !isNaN(timestamp.getTime());
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid timestamp`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid timestamp`,
        pass: false
      };
    }
  }
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toHaveValidTimestamp(): R;
    }
  }
}