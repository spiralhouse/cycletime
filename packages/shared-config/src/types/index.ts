/**
 * Configuration types for CycleTime services
 */

export type Environment = 'development' | 'test' | 'staging' | 'production';

export interface ConfigurationError extends Error {
  field?: string;
  value?: unknown;
  code: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: ConfigurationError;
}

export interface ConfigurationOptions {
  /** Environment to load configuration for */
  environment?: Environment;
  /** Whether to throw on validation errors */
  strict?: boolean;
  /** Whether to load default values */
  useDefaults?: boolean;
  /** Prefix for environment variables */
  envPrefix?: string;
}

export interface EnvironmentVariable {
  /** The environment variable name */
  name: string;
  /** Required or optional */
  required: boolean;
  /** Default value if not provided */
  defaultValue?: string;
  /** Description of the variable */
  description?: string;
  /** Type of the value */
  type: 'string' | 'number' | 'boolean' | 'url' | 'port' | 'email';
  /** Validation pattern (for string types) */
  pattern?: RegExp;
  /** Allowed values (enum) */
  allowedValues?: string[];
  /** Whether this is a secret (should be masked in logs) */
  isSecret?: boolean;
}

export interface ConfigurationSchema {
  /** Schema name/identifier */
  name: string;
  /** Environment variables definition */
  variables: Record<string, EnvironmentVariable>;
  /** Nested schemas */
  nested?: Record<string, ConfigurationSchema>;
}

export interface LoadedConfiguration {
  /** The environment this configuration was loaded for */
  environment: Environment;
  /** Raw configuration values */
  raw: Record<string, unknown>;
  /** Validated and transformed configuration values */
  validated: Record<string, unknown>;
  /** Configuration metadata */
  metadata: {
    loadedAt: Date;
    source: string;
    errors: ConfigurationError[];
    warnings: string[];
  };
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
  connectionTimeout?: number;
  maxRetries?: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database?: number;
  keyPrefix?: string;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
}

export interface ServerConfig {
  host: string;
  port: number;
  corsOrigins?: string[];
  trustProxy?: boolean;
  requestTimeout?: number;
  bodyLimit?: string;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  githubClientId?: string;
  githubClientSecret?: string;
  githubCallbackUrl?: string;
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  format: 'json' | 'pretty' | 'simple';
  enableConsole: boolean;
  enableFile?: boolean;
  filePath?: string;
  maxFileSize?: string;
  maxFiles?: number;
}

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  retries?: number;
}

export interface ClaudeConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  retries?: number;
}

export interface AIConfig {
  openai?: OpenAIConfig;
  claude?: ClaudeConfig;
  defaultProvider: 'openai' | 'claude';
}

export interface MonitoringConfig {
  enableMetrics: boolean;
  metricsPort?: number;
  enableHealthCheck: boolean;
  healthCheckPath?: string;
  enablePrometheus?: boolean;
}

export interface SecurityConfig {
  rateLimitWindow: number;
  rateLimitMax: number;
  enableHelmet: boolean;
  enableCors: boolean;
  sessionSecret: string;
  csrfProtection: boolean;
}

export interface StorageConfig {
  type: 'local' | 's3' | 'minio';
  basePath?: string;
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

/**
 * Complete application configuration interface
 */
export interface AppConfiguration {
  environment: Environment;
  database: DatabaseConfig;
  redis: RedisConfig;
  server: ServerConfig;
  auth: AuthConfig;
  logging: LoggingConfig;
  ai: AIConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
  storage: StorageConfig;
}