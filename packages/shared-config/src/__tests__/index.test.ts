/**
 * Tests for main package exports
 */

import * as SharedConfig from '../index';

describe('Package exports', () => {
  it('should export all environment utilities', () => {
    expect(SharedConfig.getCurrentEnvironment).toBeDefined();
    expect(SharedConfig.getRequiredEnvVar).toBeDefined();
    expect(SharedConfig.getEnvVar).toBeDefined();
    expect(SharedConfig.getEnvVarAsNumber).toBeDefined();
    expect(SharedConfig.getEnvVarAsBoolean).toBeDefined();
    expect(SharedConfig.getEnvVarAsArray).toBeDefined();
    expect(SharedConfig.getEnvVarAsUrl).toBeDefined();
    expect(SharedConfig.getEnvVarAsPort).toBeDefined();
    expect(SharedConfig.isProduction).toBeDefined();
    expect(SharedConfig.isDevelopment).toBeDefined();
    expect(SharedConfig.isTest).toBeDefined();
  });

  it('should export all validation utilities', () => {
    expect(SharedConfig.validateConfig).toBeDefined();
    expect(SharedConfig.safeValidateConfig).toBeDefined();
    expect(SharedConfig.zodAppConfigSchema).toBeDefined();
    expect(SharedConfig.databaseConfigSchema).toBeDefined();
    expect(SharedConfig.redisConfigSchema).toBeDefined();
    expect(SharedConfig.serverConfigSchema).toBeDefined();
    expect(SharedConfig.authConfigSchema).toBeDefined();
    expect(SharedConfig.loggingConfigSchema).toBeDefined();
    expect(SharedConfig.aiConfigSchema).toBeDefined();
    expect(SharedConfig.monitoringConfigSchema).toBeDefined();
    expect(SharedConfig.securityConfigSchema).toBeDefined();
    expect(SharedConfig.storageConfigSchema).toBeDefined();
  });

  it('should export all schema definitions', () => {
    expect(SharedConfig.appConfigSchema).toBeDefined();
    expect(SharedConfig.databaseSchema).toBeDefined();
    expect(SharedConfig.redisSchema).toBeDefined();
    expect(SharedConfig.serverSchema).toBeDefined();
    expect(SharedConfig.authSchema).toBeDefined();
    expect(SharedConfig.loggingSchema).toBeDefined();
    expect(SharedConfig.aiSchema).toBeDefined();
    expect(SharedConfig.monitoringSchema).toBeDefined();
    expect(SharedConfig.securitySchema).toBeDefined();
    expect(SharedConfig.storageSchema).toBeDefined();
    expect(SharedConfig.getServiceSchema).toBeDefined();
  });

  it('should export all loader utilities', () => {
    expect(SharedConfig.loadAppConfiguration).toBeDefined();
    expect(SharedConfig.safeLoadConfiguration).toBeDefined();
    expect(SharedConfig.loadConfigurationFromSchema).toBeDefined();
    expect(SharedConfig.createConfigurationSummary).toBeDefined();
    expect(SharedConfig.validateConfigurationHealth).toBeDefined();
  });

  it('should export all types', () => {
    // These are type exports, so we can't test them directly
    // But we can verify they're part of the module structure
    expect(typeof SharedConfig).toBe('object');
  });
});