const baseConfig = require('@cycletime/shared-testing/dist/config/jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'Contract Generation Engine',
  
  // Contract generation specific test patterns and roots
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  testTimeout: 30000 // Extended timeout for contract generation
};