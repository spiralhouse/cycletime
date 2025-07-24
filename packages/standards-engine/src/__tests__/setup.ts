/**
 * Jest test setup for Standards Engine
 * Configures test environment and mocks
 */

import { jest } from '@jest/globals';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.PORT = '3007';

// Mock external dependencies
jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

jest.mock('openai', () => ({
  OpenAI: jest.fn(),
}));

jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn(),
}));

// Setup test timeout
jest.setTimeout(30000);