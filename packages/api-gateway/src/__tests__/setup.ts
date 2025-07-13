import { jest } from '@jest/globals';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Ensure required environment variables are set for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/cycletime_test';
process.env.GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'test_client_id';
process.env.GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'test_client_secret';
process.env.GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/auth/callback';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_that_is_long_enough_for_testing_purposes_with_minimum_32_chars';

// Mock the config module to avoid environment validation issues
jest.unstable_mockModule('../config.js', () => ({
  config: {
    port: 3000,
    host: '0.0.0.0',
    nodeEnv: 'test',
    logLevel: 'info',
    databaseUrl: 'postgresql://test:test@localhost:5432/cycletime_test',
    githubClientId: 'test_client_id',
    githubClientSecret: 'test_client_secret',
    githubRedirectUri: 'http://localhost:3000/auth/callback',
    jwtSecret: 'test_jwt_secret_that_is_long_enough_for_testing_purposes_with_minimum_32_chars',
    jwtAccessExpiry: '1h',
    jwtRefreshExpiry: '30d',
    rateLimitWindowMs: 3600000,
    rateLimitMaxRequests: 1000,
  },
  __esModule: true,
}));

// Mock node-fetch before any imports
jest.unstable_mockModule('node-fetch', () => ({
  default: jest.fn(),
  __esModule: true,
}));

// Mock global fetch for tests
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Increase timeout for integration tests
jest.setTimeout(10000);