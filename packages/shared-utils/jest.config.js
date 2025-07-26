const baseConfig = require('@cycletime/shared-testing/dist/config/jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'Shared Utils',
  
  // Remove setupFilesAfterEnv since this package doesn't have a setup file
  setupFilesAfterEnv: undefined
};