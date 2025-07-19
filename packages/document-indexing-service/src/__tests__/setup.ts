import { logger } from '@cycletime/shared-utils';

// Mock logger to reduce noise in tests
jest.mock('@cycletime/shared-utils', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock shared config
jest.mock('@cycletime/shared-config', () => ({
  loadConfig: jest.fn().mockResolvedValue({
    NODE_ENV: 'test',
    PORT: '8005',
    HOST: 'localhost',
    REDIS_URL: 'redis://localhost:6379',
    OPENAI_API_KEY: 'test-key',
    PINECONE_API_KEY: 'test-key',
    PINECONE_ENVIRONMENT: 'test',
    CHROMADB_URL: 'http://localhost:8000',
  }),
}));

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '8005';
process.env.HOST = 'localhost';

// Global test setup
beforeAll(() => {
  // Setup test environment
});

afterAll(() => {
  // Cleanup test environment
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});

// Global test utilities
global.createMockEmbedding = (dimensions: number = 1536): number[] => {
  return Array(dimensions).fill(0).map(() => Math.random() * 2 - 1);
};

global.createMockDocument = (overrides: any = {}) => {
  return {
    id: 'test-doc-id',
    documentId: 'external-doc-id',
    indexId: 'test-index-id',
    title: 'Test Document',
    content: 'This is a test document content',
    metadata: {
      author: 'Test Author',
      created: new Date().toISOString(),
    },
    embeddings: global.createMockEmbedding(),
    chunks: [],
    status: 'indexed',
    indexedAt: new Date(),
    version: '1.0.0',
    checksum: 'test-checksum',
    extractedText: 'This is a test document content',
    language: 'en',
    wordCount: 6,
    keywords: ['test', 'document'],
    entities: ['Test'],
    summary: 'This is a test document',
    ...overrides,
  };
};

global.createMockIndex = (overrides: any = {}) => {
  return {
    id: 'test-index-id',
    name: 'Test Index',
    description: 'Test index for testing',
    status: 'active',
    documentCount: 0,
    vectorDimensions: 1536,
    embeddingModel: 'text-embedding-3-small',
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: {
      chunkSize: 1000,
      chunkOverlap: 100,
      similarityThreshold: 0.7,
      enableHybridSearch: true,
      enableKeywordSearch: true,
    },
    ...overrides,
  };
};

global.createMockSearchResult = (overrides: any = {}) => {
  return {
    id: 'test-result-id',
    documentId: 'test-doc-id',
    title: 'Test Document',
    content: 'Test content',
    metadata: {},
    score: 0.85,
    highlights: ['Test content'],
    chunks: [],
    similarity: 0.85,
    relevanceScore: 0.85,
    matchType: 'semantic',
    ...overrides,
  };
};

global.sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Type declarations for global test utilities
declare global {
  var createMockEmbedding: (dimensions?: number) => number[];
  var createMockDocument: (overrides?: any) => any;
  var createMockIndex: (overrides?: any) => any;
  var createMockSearchResult: (overrides?: any) => any;
  var sleep: (ms: number) => Promise<void>;
}