const baseConfig = require('@cycletime/shared-testing/dist/config/jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'Standards Engine',
  
  // ESM-specific configurations
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  
  // Module mapping for ESM
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  
  // ESM transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },
  
  // Standards Engine specific test patterns
  testMatch: ['**/__tests__/**/*.test.ts'],
  testTimeout: 30000, // Extended timeout for contract tests
  
  // Override setup files configuration for ESM
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
  setupFilesAfterEnv: []
};