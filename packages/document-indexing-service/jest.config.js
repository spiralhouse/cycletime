const baseConfig = require('@cycletime/shared-testing/dist/config/jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'Document Indexing Service',
  
  // Document indexing specific module mapping
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  testTimeout: 30000 // Extended timeout for indexing operations
};