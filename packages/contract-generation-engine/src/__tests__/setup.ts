// Mock Redis for testing
jest.mock('redis', () => {
  const mockRedis = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    publish: jest.fn().mockResolvedValue(1),
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn().mockResolvedValue(undefined),
    xadd: jest.fn().mockResolvedValue('1234567890-0'),
    xrange: jest.fn().mockResolvedValue([]),
    xrevrange: jest.fn().mockResolvedValue([]),
    xread: jest.fn().mockResolvedValue([]),
    xlen: jest.fn().mockResolvedValue(0),
    xtrim: jest.fn().mockResolvedValue(0),
    xinfo: jest.fn().mockResolvedValue(['length', '0']),
    lpush: jest.fn().mockResolvedValue(1),
    lrem: jest.fn().mockResolvedValue(1),
    lrange: jest.fn().mockResolvedValue([]),
    keys: jest.fn().mockResolvedValue([]),
    on: jest.fn(),
    off: jest.fn(),
  };

  return {
    createClient: jest.fn().mockImplementation(() => mockRedis),
  };
});

// Mock Winston logger
jest.mock('@cycletime/shared-utils', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Set test environment
process.env.NODE_ENV = 'test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Setup code that runs before all tests
});

afterAll(async () => {
  // Cleanup code that runs after all tests
});

// Clean up between tests
afterEach(async () => {
  // Clean up after each test
  jest.clearAllMocks();
});