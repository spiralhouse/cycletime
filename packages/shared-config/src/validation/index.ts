/**
 * Configuration validation utilities using Zod
 */

import { z } from 'zod';
import { Environment, ValidationResult, ConfigurationError } from '../types';

/**
 * Creates a port number validator
 */
export const portSchema = z.number().min(1).max(65535);

/**
 * Creates a URL validator
 */
export const urlSchema = z.string().url();

/**
 * Creates an email validator
 */
export const emailSchema = z.string().email();

/**
 * Environment enum validator
 */
export const environmentSchema = z.enum(['development', 'test', 'staging', 'production']);

/**
 * Database configuration schema
 */
export const databaseConfigSchema = z.object({
  host: z.string().min(1),
  port: portSchema,
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  ssl: z.boolean().optional().default(false),
  poolSize: z.number().min(1).max(100).optional().default(10),
  connectionTimeout: z.number().min(1000).optional().default(30000),
  maxRetries: z.number().min(0).optional().default(3),
});

/**
 * Redis configuration schema
 */
export const redisConfigSchema = z.object({
  host: z.string().min(1),
  port: portSchema,
  password: z.string().optional(),
  database: z.number().min(0).max(15).optional().default(0),
  keyPrefix: z.string().optional(),
  retryDelayOnFailover: z.number().min(0).optional().default(100),
  maxRetriesPerRequest: z.number().min(0).optional().default(3),
});

/**
 * Server configuration schema
 */
export const serverConfigSchema = z.object({
  host: z.string().min(1).default('0.0.0.0'),
  port: portSchema,
  corsOrigins: z.array(z.string()).optional(),
  trustProxy: z.boolean().optional().default(false),
  requestTimeout: z.number().min(1000).optional().default(30000),
  bodyLimit: z.string().optional().default('1mb'),
});

/**
 * Auth configuration schema
 */
export const authConfigSchema = z.object({
  jwtSecret: z.string().min(32),
  jwtExpiresIn: z.string().default('1h'),
  refreshTokenExpiresIn: z.string().default('7d'),
  githubClientId: z.string().optional(),
  githubClientSecret: z.string().optional(),
  githubCallbackUrl: urlSchema.optional(),
});

/**
 * Logging configuration schema
 */
export const loggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug', 'trace']).default('info'),
  format: z.enum(['json', 'pretty', 'simple']).default('json'),
  enableConsole: z.boolean().default(true),
  enableFile: z.boolean().optional().default(false),
  filePath: z.string().optional(),
  maxFileSize: z.string().optional().default('10mb'),
  maxFiles: z.number().min(1).optional().default(5),
});

/**
 * OpenAI configuration schema
 */
export const openAIConfigSchema = z.object({
  apiKey: z.string().min(1),
  model: z.string().optional().default('gpt-4'),
  maxTokens: z.number().min(1).optional().default(4000),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  timeout: z.number().min(1000).optional().default(30000),
  retries: z.number().min(0).optional().default(3),
});

/**
 * Claude configuration schema
 */
export const claudeConfigSchema = z.object({
  apiKey: z.string().min(1),
  model: z.string().optional().default('claude-3-sonnet-20240229'),
  maxTokens: z.number().min(1).optional().default(4000),
  temperature: z.number().min(0).max(1).optional().default(0.7),
  timeout: z.number().min(1000).optional().default(30000),
  retries: z.number().min(0).optional().default(3),
});

/**
 * AI configuration schema
 */
export const aiConfigSchema = z.object({
  openai: openAIConfigSchema.optional(),
  claude: claudeConfigSchema.optional(),
  defaultProvider: z.enum(['openai', 'claude']).default('claude'),
});

/**
 * Monitoring configuration schema
 */
export const monitoringConfigSchema = z.object({
  enableMetrics: z.boolean().default(true),
  metricsPort: portSchema.optional(),
  enableHealthCheck: z.boolean().default(true),
  healthCheckPath: z.string().optional().default('/health'),
  enablePrometheus: z.boolean().optional().default(false),
});

/**
 * Security configuration schema
 */
export const securityConfigSchema = z.object({
  rateLimitWindow: z.number().min(1000).default(900000), // 15 minutes
  rateLimitMax: z.number().min(1).default(100),
  enableHelmet: z.boolean().default(true),
  enableCors: z.boolean().default(true),
  sessionSecret: z.string().min(32),
  csrfProtection: z.boolean().default(true),
});

/**
 * Storage configuration schema
 */
export const storageConfigSchema = z.object({
  type: z.enum(['local', 's3', 'minio']).default('local'),
  basePath: z.string().optional(),
  bucket: z.string().optional(),
  region: z.string().optional(),
  endpoint: urlSchema.optional(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
});

/**
 * Complete application configuration schema
 */
export const appConfigSchema = z.object({
  environment: environmentSchema,
  database: databaseConfigSchema,
  redis: redisConfigSchema,
  server: serverConfigSchema,
  auth: authConfigSchema,
  logging: loggingConfigSchema,
  ai: aiConfigSchema,
  monitoring: monitoringConfigSchema,
  security: securityConfigSchema,
  storage: storageConfigSchema,
});

/**
 * Validates configuration using a Zod schema
 */
export function validateConfig<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const validated = schema.parse(data);
    return {
      success: true,
      data: validated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const configError = createConfigErrorFromZod(error);
      return {
        success: false,
        error: configError,
      };
    }
    
    const configError = new Error(`Validation failed: ${error}`) as ConfigurationError;
    configError.code = 'VALIDATION_ERROR';
    
    return {
      success: false,
      error: configError,
    };
  }
}

/**
 * Safely validates configuration (doesn't throw)
 */
export function safeValidateConfig<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }
  
  return {
    success: false,
    error: createConfigErrorFromZod(result.error),
  };
}

/**
 * Creates a configuration error from a Zod error
 */
function createConfigErrorFromZod(zodError: z.ZodError): ConfigurationError {
  const firstIssue = zodError.issues[0];
  const field = firstIssue.path.join('.');
  
  const error = new Error(
    `Configuration validation failed at ${field}: ${firstIssue.message}`
  ) as ConfigurationError;
  
  error.code = 'VALIDATION_ERROR';
  error.field = field;
  error.value = 'received' in firstIssue ? firstIssue.received : undefined;
  
  return error;
}

/**
 * Creates a custom validation schema for environment-specific configurations
 */
export function createEnvironmentSchema(environment: Environment) {
  const baseSchema = appConfigSchema;
  
  switch (environment) {
    case 'production':
      return baseSchema.refine(
        (config) => {
          // Production-specific validations
          return (
            config.auth.jwtSecret.length >= 64 &&
            config.security.sessionSecret.length >= 64 &&
            config.logging.level !== 'debug' &&
            config.logging.level !== 'trace'
          );
        },
        {
          message: 'Production environment requires stronger security settings',
        }
      );
    
    case 'test':
      return baseSchema.partial({
        database: true,
        redis: true,
        auth: true,
      });
    
    case 'development':
      return baseSchema.partial();
    
    default:
      return baseSchema;
  }
}

/**
 * Validates required fields are present for an environment
 */
export function validateRequiredFields(
  config: Record<string, unknown>,
  environment: Environment
): ValidationResult<void> {
  const requiredFields: Record<Environment, string[]> = {
    production: [
      'database.host',
      'database.port',
      'database.database',
      'database.username',
      'database.password',
      'redis.host',
      'redis.port',
      'auth.jwtSecret',
      'security.sessionSecret',
    ],
    staging: [
      'database.host',
      'database.port',
      'database.database',
      'database.username',
      'database.password',
      'redis.host',
      'redis.port',
      'auth.jwtSecret',
    ],
    development: [
      'database.host',
      'database.port',
      'database.database',
    ],
    test: [],
  };
  
  const required = requiredFields[environment] || [];
  const missing: string[] = [];
  
  for (const field of required) {
    if (!hasNestedProperty(config, field)) {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    const error = new Error(
      `Missing required configuration fields for ${environment}: ${missing.join(', ')}`
    ) as ConfigurationError;
    error.code = 'MISSING_REQUIRED_FIELDS';
    
    return {
      success: false,
      error,
    };
  }
  
  return { success: true };
}

/**
 * Checks if a nested property exists in an object
 */
function hasNestedProperty(obj: Record<string, unknown>, path: string): boolean {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const isLastKey = i === keys.length - 1;
    
    if (current[key] === undefined || current[key] === null) {
      return false;
    }
    
    if (!isLastKey) {
      // Not the last key, so the current value must be an object to continue
      if (typeof current[key] !== 'object') {
        return false;
      }
      current = current[key] as Record<string, unknown>;
    }
    // If it's the last key, we just needed to verify it exists (which we did above)
  }
  
  return true;
}