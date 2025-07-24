/**
 * Configuration loader utilities
 */

import {
  Environment,
  ConfigurationOptions,
  ConfigurationSchema,
  LoadedConfiguration,
  ConfigurationError,
  AppConfiguration,
} from '../types';
import { 
  getCurrentEnvironment,
  validateEnvironmentVariable,
  getEnvVarsWithPrefix,
  maskValue,
} from '../env';
import { 
  validateConfig,
  appConfigSchema,
  createEnvironmentSchema,
  validateRequiredFields,
} from '../validation';
import { appConfigSchema as schemaDefinition } from '../schema';

/**
 * Default configuration options
 */
const DEFAULT_OPTIONS: Required<ConfigurationOptions> = {
  environment: getCurrentEnvironment(),
  strict: true,
  useDefaults: true,
  envPrefix: '',
};

/**
 * Loads configuration from environment variables using a schema
 */
export function loadConfigurationFromSchema(
  schema: ConfigurationSchema,
  options: ConfigurationOptions = {}
): LoadedConfiguration {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: ConfigurationError[] = [];
  const warnings: string[] = [];
  const raw: Record<string, unknown> = {};
  const validated: Record<string, unknown> = {};
  
  try {
    // Load variables from schema
    for (const [varName, definition] of Object.entries(schema.variables)) {
      try {
        const value = validateEnvironmentVariable(varName, definition, opts.envPrefix);
        raw[varName] = value;
        validated[varName] = value;
      } catch (error) {
        if (error instanceof Error) {
          const configError = error as ConfigurationError;
          errors.push(configError);
          
          if (opts.strict) {
            throw configError;
          }
        }
      }
    }
    
    // Load nested schemas
    if (schema.nested) {
      for (const [nestedName, nestedSchema] of Object.entries(schema.nested)) {
        try {
          const nestedConfig = loadConfigurationFromSchema(nestedSchema, {
            ...opts,
            envPrefix: opts.envPrefix ? `${opts.envPrefix}_${nestedName.toUpperCase()}` : nestedName.toUpperCase(),
          });
          
          raw[nestedName] = nestedConfig.raw;
          validated[nestedName] = nestedConfig.validated;
          errors.push(...nestedConfig.metadata.errors);
          warnings.push(...nestedConfig.metadata.warnings);
        } catch (error) {
          if (error instanceof Error) {
            const configError = error as ConfigurationError;
            errors.push(configError);
            
            if (opts.strict) {
              throw configError;
            }
          }
        }
      }
    }
    
    return {
      environment: opts.environment,
      raw,
      validated,
      metadata: {
        loadedAt: new Date(),
        source: 'environment',
        errors,
        warnings,
      },
    };
  } catch (error) {
    const configError = error instanceof Error ? error as ConfigurationError : 
      new Error('Unknown configuration error') as ConfigurationError;
    
    return {
      environment: opts.environment,
      raw,
      validated,
      metadata: {
        loadedAt: new Date(),
        source: 'environment',
        errors: [configError, ...errors],
        warnings,
      },
    };
  }
}

/**
 * Loads and validates application configuration
 */
export function loadAppConfiguration(
  options: ConfigurationOptions = {}
): AppConfiguration {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Ensure environment is defined
  const environment = opts.environment || getCurrentEnvironment();
  
  // Create environment-specific validation schema
  const validationSchema = createEnvironmentSchema(environment);
  
  // Load raw configuration
  const rawConfig = loadRawConfiguration(opts);
  
  // Transform raw config to match expected structure
  const transformedConfig = transformRawConfig(rawConfig, environment);
  
  // Validate configuration
  const validationResult = validateConfig(validationSchema, transformedConfig);
  
  if (!validationResult.success || !validationResult.data) {
    throw validationResult.error || new Error('Configuration validation failed');
  }
  
  // Validate required fields for environment
  const requiredFieldsResult = validateRequiredFields(validationResult.data, environment);
  
  if (!requiredFieldsResult.success) {
    throw requiredFieldsResult.error;
  }
  
  return validationResult.data as AppConfiguration;
}

/**
 * Loads raw configuration from environment variables
 */
function loadRawConfiguration(options: ConfigurationOptions): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  
  // Load environment
  config.environment = (options.environment || getCurrentEnvironment()) as Environment;
  
  // Load database config
  config.database = {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: process.env.DATABASE_NAME || process.env.DATABASE_DATABASE || process.env.DATABASE_DB,
    username: process.env.DATABASE_USERNAME || process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: process.env.DATABASE_SSL === 'true',
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
    connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.DATABASE_MAX_RETRIES || '3', 10),
  };
  
  // Load Redis config
  config.redis = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    database: parseInt(process.env.REDIS_DATABASE || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX,
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
  };
  
  // Load server config
  config.server = {
    host: process.env.SERVER_HOST || '0.0.0.0',
    port: parseInt(process.env.SERVER_PORT || process.env.PORT || '3000', 10),
    corsOrigins: process.env.SERVER_CORS_ORIGINS?.split(',').map(o => o.trim()),
    trustProxy: process.env.SERVER_TRUST_PROXY === 'true',
    requestTimeout: parseInt(process.env.SERVER_REQUEST_TIMEOUT || '30000', 10),
    bodyLimit: process.env.SERVER_BODY_LIMIT || '1mb',
  };
  
  // Load auth config
  config.auth = {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    githubClientId: process.env.GITHUB_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
    githubCallbackUrl: process.env.GITHUB_CALLBACK_URL,
  };
  
  // Load logging config
  config.logging = {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
    enableFile: process.env.LOG_ENABLE_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH,
    maxFileSize: process.env.LOG_MAX_FILE_SIZE || '10mb',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
  };
  
  // Load AI config
  config.ai = {
    openai: process.env.OPENAI_API_KEY ? {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000', 10),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000', 10),
      retries: parseInt(process.env.OPENAI_RETRIES || '3', 10),
    } : undefined,
    claude: process.env.CLAUDE_API_KEY ? {
      apiKey: process.env.CLAUDE_API_KEY,
      model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
      maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4000', 10),
      temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7'),
      timeout: parseInt(process.env.CLAUDE_TIMEOUT || '30000', 10),
      retries: parseInt(process.env.CLAUDE_RETRIES || '3', 10),
    } : undefined,
    defaultProvider: (process.env.AI_DEFAULT_PROVIDER as 'openai' | 'claude') || 'claude',
  };
  
  // Load monitoring config
  config.monitoring = {
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
    metricsPort: process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT, 10) : undefined,
    enableHealthCheck: process.env.ENABLE_HEALTH_CHECK !== 'false',
    healthCheckPath: process.env.HEALTH_CHECK_PATH || '/health',
    enablePrometheus: process.env.ENABLE_PROMETHEUS === 'true',
  };
  
  // Load security config
  config.security = {
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    enableHelmet: process.env.ENABLE_HELMET !== 'false',
    enableCors: process.env.ENABLE_CORS !== 'false',
    sessionSecret: process.env.SESSION_SECRET,
    csrfProtection: process.env.CSRF_PROTECTION !== 'false',
  };
  
  // Load storage config
  config.storage = {
    type: (process.env.STORAGE_TYPE as 'local' | 's3' | 'minio') || 'local',
    basePath: process.env.STORAGE_BASE_PATH,
    bucket: process.env.STORAGE_BUCKET,
    region: process.env.STORAGE_REGION,
    endpoint: process.env.STORAGE_ENDPOINT,
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
  };
  
  return config;
}

/**
 * Transforms raw configuration to match validation schema structure
 */
function transformRawConfig(
  rawConfig: Record<string, unknown>,
  environment: Environment
): Record<string, unknown> {
  // Remove only null values but keep undefined as they may have defaults
  const transformed = JSON.parse(JSON.stringify(rawConfig, (key, value) => {
    return value === null ? undefined : value;
  }));
  
  // Environment-specific transformations
  if (environment === 'test') {
    // Use in-memory or test-specific configurations
    if (transformed.database) {
      transformed.database = {
        ...transformed.database,
        database: transformed.database.database || 'cycletime_test',
      };
    }
    
    if (transformed.redis) {
      transformed.redis = {
        ...transformed.redis,
        database: 1, // Use different Redis database for tests
      };
    }
  }
  
  return transformed;
}

/**
 * Loads configuration with error handling and fallbacks
 */
export function safeLoadConfiguration(
  options: ConfigurationOptions = {}
): { config?: AppConfiguration; error?: ConfigurationError } {
  try {
    const config = loadAppConfiguration(options);
    return { config };
  } catch (error) {
    const configError = error instanceof Error ? error as ConfigurationError : 
      new Error('Unknown configuration error') as ConfigurationError;
    return { error: configError };
  }
}

/**
 * Loads configuration with validation and detailed error reporting
 */
export function loadConfigurationWithValidation(
  options: ConfigurationOptions = {}
): LoadedConfiguration {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const loadedConfig = loadConfigurationFromSchema(schemaDefinition, opts);
  
  // Additional validation using Zod schemas
  const validationResult = validateConfig(appConfigSchema, loadedConfig.validated);
  
  if (!validationResult.success && validationResult.error) {
    loadedConfig.metadata.errors.push(validationResult.error);
  }
  
  return loadedConfig;
}

/**
 * Creates a configuration summary for logging/debugging
 */
export function createConfigurationSummary(
  config: AppConfiguration,
  includeSecrets = false
): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  
  const traverse = (obj: Record<string, unknown>, path = ''): void => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        traverse(value as Record<string, unknown>, currentPath);
      } else {
        const isSecret = currentPath.toLowerCase().includes('secret') ||
                        currentPath.toLowerCase().includes('password') ||
                        currentPath.toLowerCase().includes('key');
        
        summary[currentPath] = maskValue(value, isSecret && !includeSecrets);
      }
    }
  };
  
  traverse(config as unknown as Record<string, unknown>);
  
  return summary;
}

/**
 * Validates configuration health (connections, etc.)
 */
export async function validateConfigurationHealth(
  config: AppConfiguration
): Promise<{ healthy: boolean; issues: string[] }> {
  const issues: string[] = [];
  
  // Validate database configuration
  if (!config.database.host || !config.database.port) {
    issues.push('Database host or port not configured');
  }
  
  // Validate Redis configuration
  if (!config.redis.host || !config.redis.port) {
    issues.push('Redis host or port not configured');
  }
  
  // Validate auth configuration
  if (!config.auth.jwtSecret || config.auth.jwtSecret.length < 32) {
    issues.push('JWT secret not configured or too short');
  }
  
  if (!config.security.sessionSecret || config.security.sessionSecret.length < 32) {
    issues.push('Session secret not configured or too short');
  }
  
  // Validate AI configuration
  const hasAIProvider = config.ai.openai?.apiKey || config.ai.claude?.apiKey;
  if (!hasAIProvider) {
    issues.push('No AI provider configured');
  }
  
  return {
    healthy: issues.length === 0,
    issues,
  };
}

/**
 * Simple configuration loader for backward compatibility
 * Returns a simple object with environment variables for legacy services
 */
export async function loadConfig(): Promise<Record<string, string | undefined>> {
  return {
    PORT: process.env.PORT,
    HOST: process.env.HOST || 'localhost',
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    // Add other common environment variables as needed
  };
}