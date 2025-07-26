const baseConfig = require('@cycletime/shared-testing/dist/config/jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'AI Service',
  
  // AI Service specific overrides for external dependencies
  collectCoverageFrom: [
    ...baseConfig.collectCoverageFrom,
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ]
};