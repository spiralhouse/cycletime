/**
 * Test setup for shared-testing framework
 * 
 * This file sets up the testing environment with contract-specific
 * matchers and utilities.
 */

import { extendExpect } from '../assertions/contract-matchers';
import { PerformanceMatchers } from '../assertions/performance-matchers';

// Extend Jest expect with contract and performance matchers
extendExpect();
PerformanceMatchers.extendExpect();

// Set default test timeout for contract testing
jest.setTimeout(30000);

// Global test setup
beforeAll(() => {
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.CONTRACT_TESTING = 'true';
});

afterAll(() => {
  // Cleanup environment variables
  delete process.env.CONTRACT_TESTING;
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in test environment
});