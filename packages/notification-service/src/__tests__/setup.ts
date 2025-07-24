import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Mock shared utilities
jest.mock('@cycletime/shared-utils', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock shared config
jest.mock('@cycletime/shared-config', () => ({
  loadConfig: jest.fn().mockResolvedValue({
    NODE_ENV: 'test',
    PORT: '8008',
    HOST: 'localhost',
    LOG_LEVEL: 'error',
    REDIS_URL: 'redis://localhost:6379',
    SMTP_HOST: 'smtp.test.com',
    SMTP_PORT: '587',
    TWILIO_ACCOUNT_SID: 'test_sid',
    TWILIO_AUTH_TOKEN: 'test_token',
    FIREBASE_PROJECT_ID: 'test_project',
  }),
}));

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.PORT = '8008';
  process.env.HOST = 'localhost';
  process.env.LOG_LEVEL = 'error';
});

afterAll(async () => {
  // Cleanup after all tests
});

beforeEach(async () => {
  // Clear mocks before each test
  jest.clearAllMocks();
});

afterEach(async () => {
  // Cleanup after each test
});

// Suppress console output during tests
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}