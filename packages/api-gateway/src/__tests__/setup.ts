import { jest } from '@jest/globals';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/cycletime_test';
process.env.GITHUB_CLIENT_ID = 'test_client_id';
process.env.GITHUB_CLIENT_SECRET = 'test_client_secret';
process.env.GITHUB_REDIRECT_URI = 'http://localhost:3000/auth/callback';
process.env.JWT_SECRET = 'test_jwt_secret_that_is_long_enough_for_testing';

// Mock global fetch for tests
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Increase timeout for integration tests
jest.setTimeout(10000);