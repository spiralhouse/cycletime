/**
 * @cycletime/shared-config
 * 
 * Shared configuration management utilities for CycleTime services
 * Provides type-safe configuration loading, validation, and environment handling
 */

// Types
export * from './types';

// Environment utilities
export * from './env';

// Validation utilities
export * from './validation';

// Schema definitions
export * from './schema';

// Configuration loaders
export * from './loaders';

// Re-export commonly used items for convenience
export {
  loadAppConfiguration,
  safeLoadConfiguration,
  loadConfigurationFromSchema,
  createConfigurationSummary,
  validateConfigurationHealth,
  loadConfig,
} from './loaders';

export {
  getCurrentEnvironment,
  getRequiredEnvVar,
  getEnvVar,
  getEnvVarAsNumber,
  getEnvVarAsBoolean,
  getEnvVarAsArray,
  getEnvVarAsUrl,
  getEnvVarAsPort,
  isProduction,
  isDevelopment,
  isTest,
} from './env';

export {
  validateConfig,
  safeValidateConfig,
  appConfigSchema as zodAppConfigSchema,
  databaseConfigSchema,
  redisConfigSchema,
  serverConfigSchema,
  authConfigSchema,
  loggingConfigSchema,
  aiConfigSchema,
  monitoringConfigSchema,
  securityConfigSchema,
  storageConfigSchema,
} from './validation';

export {
  appConfigSchema,
  databaseSchema,
  redisSchema,
  serverSchema,
  authSchema,
  loggingSchema,
  aiSchema,
  monitoringSchema,
  securitySchema,
  storageSchema,
  getServiceSchema,
} from './schema';