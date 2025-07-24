import { jest } from '@jest/globals';

// Mock Redis client
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    ping: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }))
}));

// Mock MinIO client
jest.mock('minio', () => ({
  Client: jest.fn(() => ({
    bucketExists: jest.fn(),
    makeBucket: jest.fn(),
    putObject: jest.fn(),
    getObject: jest.fn(),
    removeObject: jest.fn(),
    statObject: jest.fn(),
    listObjects: jest.fn(),
    copyObject: jest.fn(),
    presignedUrl: jest.fn()
  }))
}));

// Mock Winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    printf: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '8004';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.STORAGE_ENDPOINT = 'localhost';
process.env.STORAGE_ACCESS_KEY = 'test';
process.env.STORAGE_SECRET_KEY = 'test';
process.env.STORAGE_BUCKET = 'test-bucket';

// Global test timeout
jest.setTimeout(30000);

// Placeholder test to prevent Jest failure
describe('Test Setup', () => {
  it('should setup test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});