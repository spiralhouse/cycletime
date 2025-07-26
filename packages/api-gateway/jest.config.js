const baseConfig = require('@cycletime/shared-testing/dist/config/jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'API Gateway',
  
  // ESM-specific configurations
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  
  // API Gateway specific module mapping
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^node-fetch$': '<rootDir>/src/__tests__/__mocks__/node-fetch.js',
  },
  
  // ESM transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },
  
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|fetch-blob|formdata-polyfill|data-uri-to-buffer)/)',
  ],
  
  // API Gateway specific test patterns
  testMatch: ['**/__tests__/**/*.test.ts'],
  
  // Override setup files configuration for ESM
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
  setupFilesAfterEnv: []
};