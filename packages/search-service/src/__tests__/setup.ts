import { jest } from '@jest/globals';

// Mock Redis client
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    ping: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }))
}));

// Mock Elasticsearch (legacy)
jest.mock('elasticsearch', () => ({
  Client: jest.fn(() => ({
    ping: jest.fn(),
    search: jest.fn(),
    index: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    bulk: jest.fn(),
    indices: {
      create: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      putMapping: jest.fn(),
      getMapping: jest.fn()
    },
    cluster: {
      health: jest.fn()
    }
  }))
}));

// Mock @elastic/elasticsearch (modern)
jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn(() => ({
    ping: jest.fn(),
    search: jest.fn(),
    index: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    bulk: jest.fn(),
    indices: {
      create: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      putMapping: jest.fn(),
      getMapping: jest.fn()
    },
    cluster: {
      health: jest.fn()
    }
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
process.env.PORT = '8003';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.ELASTICSEARCH_HOST = 'localhost';
process.env.ELASTICSEARCH_PORT = '9200';

// Global test timeout
jest.setTimeout(30000);