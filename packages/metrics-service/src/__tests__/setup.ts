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
    PORT: '8007',
    HOST: 'localhost',
    LOG_LEVEL: 'error',
    REDIS_URL: 'redis://localhost:6379',
    INFLUXDB_URL: 'http://localhost:8086',
    PROMETHEUS_URL: 'http://localhost:9090',
    GRAFANA_URL: 'http://localhost:3000',
  }),
}));

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.PORT = '8007';
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