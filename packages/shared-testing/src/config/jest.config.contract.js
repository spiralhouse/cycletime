const baseConfig = require('./jest.config.base.js');

module.exports = {
  ...baseConfig,
  
  // Extended timeout for contract tests
  testTimeout: 30000,
  
  // Contract-specific test patterns
  testMatch: ['**/__tests__/contract/**/*.test.ts'],
  
  // Disable coverage collection for contract tests
  // Contract tests generate validation reports, not code coverage
  collectCoverage: false,
  coverageThreshold: undefined,
  
  // Additional setup for contract testing
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    '<rootDir>/../shared-testing/src/config/setup-contract-tests.ts'
  ],
  
  // Contract testing specific globals
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'ES2020',
        module: 'commonjs'
      }
    }
  },
  
  // Test environment variables for contract testing
  testEnvironment: 'node',
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};