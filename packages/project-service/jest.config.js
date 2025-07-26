const baseConfig = require('@cycletime/shared-testing/dist/config/jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'Project Service',
  
  // Override testMatch to exclude setup files
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // Remove setupFilesAfterEnv since this package doesn't have proper setup file
  setupFilesAfterEnv: undefined
};