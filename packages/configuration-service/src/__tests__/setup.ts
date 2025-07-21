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

// Mock Consul client
jest.mock('consul', () => ({
  createClient: jest.fn(() => ({
    kv: {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn()
    },
    health: {
      service: jest.fn()
    }
  })),
  Consul: jest.fn(() => ({
    kv: {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn()
    },
    health: {
      service: jest.fn()
    }
  }))
}));

// Mock etcd3 client
jest.mock('etcd3', () => ({
  Etcd3: jest.fn(() => ({
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(),
    close: jest.fn()
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
process.env.PORT = '8005';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.CONSUL_HOST = 'localhost';
process.env.CONSUL_PORT = '8500';
process.env.ETCD_HOST = 'localhost';
process.env.ETCD_PORT = '2379';

// Global test timeout
jest.setTimeout(30000);