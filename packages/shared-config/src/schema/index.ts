/**
 * Configuration schema definitions for common CycleTime service patterns
 */

import { ConfigurationSchema, EnvironmentVariable } from '../types';

/**
 * Database configuration schema
 */
export const databaseSchema: ConfigurationSchema = {
  name: 'database',
  variables: {
    DATABASE_HOST: {
      name: 'DATABASE_HOST',
      required: true,
      type: 'string',
      description: 'Database host address',
      defaultValue: 'localhost',
    },
    DATABASE_PORT: {
      name: 'DATABASE_PORT',
      required: true,
      type: 'port',
      description: 'Database port number',
      defaultValue: '5432',
    },
    DATABASE_NAME: {
      name: 'DATABASE_NAME',
      required: true,
      type: 'string',
      description: 'Database name',
    },
    DATABASE_USERNAME: {
      name: 'DATABASE_USERNAME',
      required: true,
      type: 'string',
      description: 'Database username',
    },
    DATABASE_PASSWORD: {
      name: 'DATABASE_PASSWORD',
      required: true,
      type: 'string',
      description: 'Database password',
      isSecret: true,
    },
    DATABASE_SSL: {
      name: 'DATABASE_SSL',
      required: false,
      type: 'boolean',
      description: 'Enable SSL for database connection',
      defaultValue: 'false',
    },
    DATABASE_POOL_SIZE: {
      name: 'DATABASE_POOL_SIZE',
      required: false,
      type: 'number',
      description: 'Database connection pool size',
      defaultValue: '10',
    },
    DATABASE_CONNECTION_TIMEOUT: {
      name: 'DATABASE_CONNECTION_TIMEOUT',
      required: false,
      type: 'number',
      description: 'Database connection timeout in milliseconds',
      defaultValue: '30000',
    },
    DATABASE_MAX_RETRIES: {
      name: 'DATABASE_MAX_RETRIES',
      required: false,
      type: 'number',
      description: 'Maximum database connection retries',
      defaultValue: '3',
    },
  },
};

/**
 * Redis configuration schema
 */
export const redisSchema: ConfigurationSchema = {
  name: 'redis',
  variables: {
    REDIS_HOST: {
      name: 'REDIS_HOST',
      required: true,
      type: 'string',
      description: 'Redis host address',
      defaultValue: 'localhost',
    },
    REDIS_PORT: {
      name: 'REDIS_PORT',
      required: true,
      type: 'port',
      description: 'Redis port number',
      defaultValue: '6379',
    },
    REDIS_PASSWORD: {
      name: 'REDIS_PASSWORD',
      required: false,
      type: 'string',
      description: 'Redis password',
      isSecret: true,
    },
    REDIS_DATABASE: {
      name: 'REDIS_DATABASE',
      required: false,
      type: 'number',
      description: 'Redis database number (0-15)',
      defaultValue: '0',
    },
    REDIS_KEY_PREFIX: {
      name: 'REDIS_KEY_PREFIX',
      required: false,
      type: 'string',
      description: 'Prefix for Redis keys',
    },
    REDIS_RETRY_DELAY: {
      name: 'REDIS_RETRY_DELAY',
      required: false,
      type: 'number',
      description: 'Retry delay on failover (ms)',
      defaultValue: '100',
    },
    REDIS_MAX_RETRIES: {
      name: 'REDIS_MAX_RETRIES',
      required: false,
      type: 'number',
      description: 'Maximum retries per request',
      defaultValue: '3',
    },
  },
};

/**
 * Server configuration schema
 */
export const serverSchema: ConfigurationSchema = {
  name: 'server',
  variables: {
    SERVER_HOST: {
      name: 'SERVER_HOST',
      required: false,
      type: 'string',
      description: 'Server host address',
      defaultValue: '0.0.0.0',
    },
    SERVER_PORT: {
      name: 'SERVER_PORT',
      required: true,
      type: 'port',
      description: 'Server port number',
      defaultValue: '3000',
    },
    SERVER_CORS_ORIGINS: {
      name: 'SERVER_CORS_ORIGINS',
      required: false,
      type: 'string',
      description: 'Comma-separated list of allowed CORS origins',
    },
    SERVER_TRUST_PROXY: {
      name: 'SERVER_TRUST_PROXY',
      required: false,
      type: 'boolean',
      description: 'Trust proxy headers',
      defaultValue: 'false',
    },
    SERVER_REQUEST_TIMEOUT: {
      name: 'SERVER_REQUEST_TIMEOUT',
      required: false,
      type: 'number',
      description: 'Request timeout in milliseconds',
      defaultValue: '30000',
    },
    SERVER_BODY_LIMIT: {
      name: 'SERVER_BODY_LIMIT',
      required: false,
      type: 'string',
      description: 'Request body size limit',
      defaultValue: '1mb',
    },
  },
};

/**
 * Authentication configuration schema
 */
export const authSchema: ConfigurationSchema = {
  name: 'auth',
  variables: {
    JWT_SECRET: {
      name: 'JWT_SECRET',
      required: true,
      type: 'string',
      description: 'JWT signing secret (minimum 32 characters)',
      isSecret: true,
      pattern: /^.{32,}$/,
    },
    JWT_EXPIRES_IN: {
      name: 'JWT_EXPIRES_IN',
      required: false,
      type: 'string',
      description: 'JWT token expiration time',
      defaultValue: '1h',
    },
    REFRESH_TOKEN_EXPIRES_IN: {
      name: 'REFRESH_TOKEN_EXPIRES_IN',
      required: false,
      type: 'string',
      description: 'Refresh token expiration time',
      defaultValue: '7d',
    },
    GITHUB_CLIENT_ID: {
      name: 'GITHUB_CLIENT_ID',
      required: false,
      type: 'string',
      description: 'GitHub OAuth client ID',
    },
    GITHUB_CLIENT_SECRET: {
      name: 'GITHUB_CLIENT_SECRET',
      required: false,
      type: 'string',
      description: 'GitHub OAuth client secret',
      isSecret: true,
    },
    GITHUB_CALLBACK_URL: {
      name: 'GITHUB_CALLBACK_URL',
      required: false,
      type: 'url',
      description: 'GitHub OAuth callback URL',
    },
  },
};

/**
 * Logging configuration schema
 */
export const loggingSchema: ConfigurationSchema = {
  name: 'logging',
  variables: {
    LOG_LEVEL: {
      name: 'LOG_LEVEL',
      required: false,
      type: 'string',
      description: 'Logging level',
      defaultValue: 'info',
      allowedValues: ['error', 'warn', 'info', 'debug', 'trace'],
    },
    LOG_FORMAT: {
      name: 'LOG_FORMAT',
      required: false,
      type: 'string',
      description: 'Log output format',
      defaultValue: 'json',
      allowedValues: ['json', 'pretty', 'simple'],
    },
    LOG_ENABLE_CONSOLE: {
      name: 'LOG_ENABLE_CONSOLE',
      required: false,
      type: 'boolean',
      description: 'Enable console logging',
      defaultValue: 'true',
    },
    LOG_ENABLE_FILE: {
      name: 'LOG_ENABLE_FILE',
      required: false,
      type: 'boolean',
      description: 'Enable file logging',
      defaultValue: 'false',
    },
    LOG_FILE_PATH: {
      name: 'LOG_FILE_PATH',
      required: false,
      type: 'string',
      description: 'Log file path',
    },
    LOG_MAX_FILE_SIZE: {
      name: 'LOG_MAX_FILE_SIZE',
      required: false,
      type: 'string',
      description: 'Maximum log file size',
      defaultValue: '10mb',
    },
    LOG_MAX_FILES: {
      name: 'LOG_MAX_FILES',
      required: false,
      type: 'number',
      description: 'Maximum number of log files to keep',
      defaultValue: '5',
    },
  },
};

/**
 * OpenAI configuration schema
 */
export const openAISchema: ConfigurationSchema = {
  name: 'openai',
  variables: {
    OPENAI_API_KEY: {
      name: 'OPENAI_API_KEY',
      required: false,
      type: 'string',
      description: 'OpenAI API key',
      isSecret: true,
    },
    OPENAI_MODEL: {
      name: 'OPENAI_MODEL',
      required: false,
      type: 'string',
      description: 'OpenAI model to use',
      defaultValue: 'gpt-4',
    },
    OPENAI_MAX_TOKENS: {
      name: 'OPENAI_MAX_TOKENS',
      required: false,
      type: 'number',
      description: 'Maximum tokens for OpenAI requests',
      defaultValue: '4000',
    },
    OPENAI_TEMPERATURE: {
      name: 'OPENAI_TEMPERATURE',
      required: false,
      type: 'number',
      description: 'Temperature for OpenAI requests (0-2)',
      defaultValue: '0.7',
    },
    OPENAI_TIMEOUT: {
      name: 'OPENAI_TIMEOUT',
      required: false,
      type: 'number',
      description: 'Timeout for OpenAI requests (ms)',
      defaultValue: '30000',
    },
    OPENAI_RETRIES: {
      name: 'OPENAI_RETRIES',
      required: false,
      type: 'number',
      description: 'Number of retries for OpenAI requests',
      defaultValue: '3',
    },
  },
};

/**
 * Claude configuration schema
 */
export const claudeSchema: ConfigurationSchema = {
  name: 'claude',
  variables: {
    CLAUDE_API_KEY: {
      name: 'CLAUDE_API_KEY',
      required: false,
      type: 'string',
      description: 'Claude API key',
      isSecret: true,
    },
    CLAUDE_MODEL: {
      name: 'CLAUDE_MODEL',
      required: false,
      type: 'string',
      description: 'Claude model to use',
      defaultValue: 'claude-3-sonnet-20240229',
    },
    CLAUDE_MAX_TOKENS: {
      name: 'CLAUDE_MAX_TOKENS',
      required: false,
      type: 'number',
      description: 'Maximum tokens for Claude requests',
      defaultValue: '4000',
    },
    CLAUDE_TEMPERATURE: {
      name: 'CLAUDE_TEMPERATURE',
      required: false,
      type: 'number',
      description: 'Temperature for Claude requests (0-1)',
      defaultValue: '0.7',
    },
    CLAUDE_TIMEOUT: {
      name: 'CLAUDE_TIMEOUT',
      required: false,
      type: 'number',
      description: 'Timeout for Claude requests (ms)',
      defaultValue: '30000',
    },
    CLAUDE_RETRIES: {
      name: 'CLAUDE_RETRIES',
      required: false,
      type: 'number',
      description: 'Number of retries for Claude requests',
      defaultValue: '3',
    },
  },
};

/**
 * AI configuration schema
 */
export const aiSchema: ConfigurationSchema = {
  name: 'ai',
  variables: {
    AI_DEFAULT_PROVIDER: {
      name: 'AI_DEFAULT_PROVIDER',
      required: false,
      type: 'string',
      description: 'Default AI provider',
      defaultValue: 'claude',
      allowedValues: ['openai', 'claude'],
    },
  },
  nested: {
    openai: openAISchema,
    claude: claudeSchema,
  },
};

/**
 * Monitoring configuration schema
 */
export const monitoringSchema: ConfigurationSchema = {
  name: 'monitoring',
  variables: {
    ENABLE_METRICS: {
      name: 'ENABLE_METRICS',
      required: false,
      type: 'boolean',
      description: 'Enable metrics collection',
      defaultValue: 'true',
    },
    METRICS_PORT: {
      name: 'METRICS_PORT',
      required: false,
      type: 'port',
      description: 'Metrics server port',
    },
    ENABLE_HEALTH_CHECK: {
      name: 'ENABLE_HEALTH_CHECK',
      required: false,
      type: 'boolean',
      description: 'Enable health check endpoint',
      defaultValue: 'true',
    },
    HEALTH_CHECK_PATH: {
      name: 'HEALTH_CHECK_PATH',
      required: false,
      type: 'string',
      description: 'Health check endpoint path',
      defaultValue: '/health',
    },
    ENABLE_PROMETHEUS: {
      name: 'ENABLE_PROMETHEUS',
      required: false,
      type: 'boolean',
      description: 'Enable Prometheus metrics',
      defaultValue: 'false',
    },
  },
};

/**
 * Security configuration schema
 */
export const securitySchema: ConfigurationSchema = {
  name: 'security',
  variables: {
    RATE_LIMIT_WINDOW: {
      name: 'RATE_LIMIT_WINDOW',
      required: false,
      type: 'number',
      description: 'Rate limit window in milliseconds',
      defaultValue: '900000', // 15 minutes
    },
    RATE_LIMIT_MAX: {
      name: 'RATE_LIMIT_MAX',
      required: false,
      type: 'number',
      description: 'Maximum requests per window',
      defaultValue: '100',
    },
    ENABLE_HELMET: {
      name: 'ENABLE_HELMET',
      required: false,
      type: 'boolean',
      description: 'Enable Helmet security middleware',
      defaultValue: 'true',
    },
    ENABLE_CORS: {
      name: 'ENABLE_CORS',
      required: false,
      type: 'boolean',
      description: 'Enable CORS middleware',
      defaultValue: 'true',
    },
    SESSION_SECRET: {
      name: 'SESSION_SECRET',
      required: true,
      type: 'string',
      description: 'Session secret (minimum 32 characters)',
      isSecret: true,
      pattern: /^.{32,}$/,
    },
    CSRF_PROTECTION: {
      name: 'CSRF_PROTECTION',
      required: false,
      type: 'boolean',
      description: 'Enable CSRF protection',
      defaultValue: 'true',
    },
  },
};

/**
 * Storage configuration schema
 */
export const storageSchema: ConfigurationSchema = {
  name: 'storage',
  variables: {
    STORAGE_TYPE: {
      name: 'STORAGE_TYPE',
      required: false,
      type: 'string',
      description: 'Storage backend type',
      defaultValue: 'local',
      allowedValues: ['local', 's3', 'minio'],
    },
    STORAGE_BASE_PATH: {
      name: 'STORAGE_BASE_PATH',
      required: false,
      type: 'string',
      description: 'Base path for local storage',
    },
    STORAGE_BUCKET: {
      name: 'STORAGE_BUCKET',
      required: false,
      type: 'string',
      description: 'Storage bucket name',
    },
    STORAGE_REGION: {
      name: 'STORAGE_REGION',
      required: false,
      type: 'string',
      description: 'Storage region',
    },
    STORAGE_ENDPOINT: {
      name: 'STORAGE_ENDPOINT',
      required: false,
      type: 'url',
      description: 'Storage endpoint URL',
    },
    STORAGE_ACCESS_KEY_ID: {
      name: 'STORAGE_ACCESS_KEY_ID',
      required: false,
      type: 'string',
      description: 'Storage access key ID',
      isSecret: true,
    },
    STORAGE_SECRET_ACCESS_KEY: {
      name: 'STORAGE_SECRET_ACCESS_KEY',
      required: false,
      type: 'string',
      description: 'Storage secret access key',
      isSecret: true,
    },
  },
};

/**
 * Complete application configuration schema
 */
export const appConfigSchema: ConfigurationSchema = {
  name: 'app',
  variables: {
    NODE_ENV: {
      name: 'NODE_ENV',
      required: false,
      type: 'string',
      description: 'Application environment',
      defaultValue: 'development',
      allowedValues: ['development', 'test', 'staging', 'production'],
    },
  },
  nested: {
    database: databaseSchema,
    redis: redisSchema,
    server: serverSchema,
    auth: authSchema,
    logging: loggingSchema,
    ai: aiSchema,
    monitoring: monitoringSchema,
    security: securitySchema,
    storage: storageSchema,
  },
};

/**
 * Gets schema for a specific service type
 */
export function getServiceSchema(serviceType: string): ConfigurationSchema {
  const baseSchemas = [serverSchema, loggingSchema, monitoringSchema, securitySchema];
  
  switch (serviceType) {
    case 'api-gateway':
      return {
        name: 'api-gateway',
        variables: {},
        nested: {
          server: serverSchema,
          auth: authSchema,
          logging: loggingSchema,
          monitoring: monitoringSchema,
          security: securitySchema,
        },
      };
    
    case 'ai-service':
      return {
        name: 'ai-service',
        variables: {},
        nested: {
          server: serverSchema,
          database: databaseSchema,
          redis: redisSchema,
          ai: aiSchema,
          logging: loggingSchema,
          monitoring: monitoringSchema,
          security: securitySchema,
        },
      };
    
    case 'document-service':
      return {
        name: 'document-service',
        variables: {},
        nested: {
          server: serverSchema,
          database: databaseSchema,
          storage: storageSchema,
          logging: loggingSchema,
          monitoring: monitoringSchema,
          security: securitySchema,
        },
      };
    
    case 'task-service':
      return {
        name: 'task-service',
        variables: {},
        nested: {
          server: serverSchema,
          database: databaseSchema,
          redis: redisSchema,
          logging: loggingSchema,
          monitoring: monitoringSchema,
          security: securitySchema,
        },
      };
    
    default:
      return {
        name: serviceType,
        variables: {},
        nested: Object.fromEntries(
          baseSchemas.map(schema => [schema.name, schema])
        ),
      };
  }
}