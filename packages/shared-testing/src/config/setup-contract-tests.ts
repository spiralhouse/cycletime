/**
 * Contract Testing Setup
 * 
 * This file contains setup code specific to contract testing that extends
 * the base test setup with contract-specific matchers and utilities.
 */

import { extendExpect } from '../assertions/contract-matchers';

// Extend Jest expect with contract-specific matchers
extendExpect();

// Configure test environment for contract testing
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.CONTRACT_TESTING = 'true';
  
  // Configure longer timeouts for contract validation
  jest.setTimeout(30000);
});

afterAll(() => {
  // Cleanup test environment
  delete process.env.CONTRACT_TESTING;
});

// Global error handler for contract test failures
process.on('unhandledRejection', (reason, _promise) => {
  console.error('Unhandled Rejection in contract test:', reason);
  // Don't exit the process in test environment
});

// Configure console for contract test reporting
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Filter out expected contract validation errors during testing
  const message = args[0];
  if (typeof message === 'string' && message.includes('Contract validation failed')) {
    // These are expected during contract testing, don't clutter output
    return;
  }
  originalConsoleError.apply(console, args);
};