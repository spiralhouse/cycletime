/**
 * Environment variable handling utilities
 */

import { Environment, EnvironmentVariable, ConfigurationError } from '../types';

/**
 * Gets the current environment from NODE_ENV
 */
export function getCurrentEnvironment(): Environment {
  const env = process.env.NODE_ENV as Environment;
  
  if (!env || !['development', 'test', 'staging', 'production'].includes(env)) {
    return 'development';
  }
  
  return env;
}

/**
 * Checks if the current environment is production
 */
export function isProduction(): boolean {
  return getCurrentEnvironment() === 'production';
}

/**
 * Checks if the current environment is development
 */
export function isDevelopment(): boolean {
  return getCurrentEnvironment() === 'development';
}

/**
 * Checks if the current environment is test
 */
export function isTest(): boolean {
  return getCurrentEnvironment() === 'test';
}

/**
 * Gets an environment variable with optional transformation
 */
export function getEnvVar(
  name: string,
  defaultValue?: string,
  transform?: (value: string) => unknown
): string | undefined {
  const value = process.env[name];
  
  if (value === undefined) {
    return defaultValue;
  }
  
  if (transform) {
    try {
      const transformed = transform(value);
      return transformed as string;
    } catch (error) {
      throw createConfigError(
        `Failed to transform environment variable ${name}`,
        'TRANSFORM_ERROR',
        name,
        value
      );
    }
  }
  
  return value;
}

/**
 * Gets a required environment variable
 */
export function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  
  if (value === undefined || value === '') {
    throw createConfigError(
      `Required environment variable ${name} is not set`,
      'MISSING_REQUIRED_VAR',
      name
    );
  }
  
  return value;
}

/**
 * Gets an environment variable as a number
 */
export function getEnvVarAsNumber(
  name: string,
  defaultValue?: number
): number | undefined {
  const value = process.env[name];
  
  if (value === undefined) {
    return defaultValue;
  }
  
  const parsed = Number(value);
  
  if (isNaN(parsed)) {
    throw createConfigError(
      `Environment variable ${name} must be a valid number`,
      'INVALID_NUMBER',
      name,
      value
    );
  }
  
  return parsed;
}

/**
 * Gets an environment variable as a boolean
 */
export function getEnvVarAsBoolean(
  name: string,
  defaultValue?: boolean
): boolean | undefined {
  const value = process.env[name];
  
  if (value === undefined) {
    return defaultValue;
  }
  
  const lowerValue = value.toLowerCase();
  
  if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
    return true;
  }
  
  if (['false', '0', 'no', 'off'].includes(lowerValue)) {
    return false;
  }
  
  throw createConfigError(
    `Environment variable ${name} must be a valid boolean (true/false, 1/0, yes/no, on/off)`,
    'INVALID_BOOLEAN',
    name,
    value
  );
}

/**
 * Gets an environment variable as an array (comma-separated)
 */
export function getEnvVarAsArray(
  name: string,
  defaultValue?: string[]
): string[] | undefined {
  const value = process.env[name];
  
  if (value === undefined) {
    return defaultValue;
  }
  
  if (value.trim() === '') {
    return [];
  }
  
  return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
}

/**
 * Gets an environment variable as a URL
 */
export function getEnvVarAsUrl(
  name: string,
  defaultValue?: string
): string | undefined {
  const value = getEnvVar(name, defaultValue);
  
  if (value === undefined) {
    return undefined;
  }
  
  try {
    new URL(value);
    return value;
  } catch {
    throw createConfigError(
      `Environment variable ${name} must be a valid URL`,
      'INVALID_URL',
      name,
      value
    );
  }
}

/**
 * Gets an environment variable as a port number
 */
export function getEnvVarAsPort(
  name: string,
  defaultValue?: number
): number | undefined {
  const value = getEnvVarAsNumber(name, defaultValue);
  
  if (value === undefined) {
    return undefined;
  }
  
  if (value < 1 || value > 65535) {
    throw createConfigError(
      `Environment variable ${name} must be a valid port number (1-65535)`,
      'INVALID_PORT',
      name,
      value
    );
  }
  
  return value;
}

/**
 * Validates an environment variable against its definition
 */
export function validateEnvironmentVariable(
  name: string,
  definition: EnvironmentVariable,
  envPrefix = ''
): unknown {
  const fullName = envPrefix ? `${envPrefix}_${name}` : name;
  const value = process.env[fullName];
  
  // Check if required variable is missing
  if (definition.required && (value === undefined || value === '')) {
    if (definition.defaultValue !== undefined) {
      return parseEnvironmentValue(definition.defaultValue, definition);
    }
    throw createConfigError(
      `Required environment variable ${fullName} is not set`,
      'MISSING_REQUIRED_VAR',
      fullName
    );
  }
  
  // Use default value if variable is not set
  if (value === undefined || value === '') {
    if (definition.defaultValue !== undefined) {
      return parseEnvironmentValue(definition.defaultValue, definition);
    }
    return undefined;
  }
  
  return parseEnvironmentValue(value, definition);
}

/**
 * Parses and validates an environment value based on its type
 */
function parseEnvironmentValue(value: string, definition: EnvironmentVariable): unknown {
  // Check allowed values first
  if (definition.allowedValues && !definition.allowedValues.includes(value)) {
    throw createConfigError(
      `Environment variable ${definition.name} must be one of: ${definition.allowedValues.join(', ')}`,
      'INVALID_VALUE',
      definition.name,
      value
    );
  }
  
  // Validate pattern
  if (definition.pattern && !definition.pattern.test(value)) {
    throw createConfigError(
      `Environment variable ${definition.name} does not match required pattern`,
      'PATTERN_MISMATCH',
      definition.name,
      value
    );
  }
  
  // Parse based on type
  switch (definition.type) {
    case 'string':
      return value;
    
    case 'number':
      const number = Number(value);
      if (isNaN(number)) {
        throw createConfigError(
          `Environment variable ${definition.name} must be a valid number`,
          'INVALID_NUMBER',
          definition.name,
          value
        );
      }
      return number;
    
    case 'boolean':
      const lowerValue = value.toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
        return true;
      }
      if (['false', '0', 'no', 'off'].includes(lowerValue)) {
        return false;
      }
      throw createConfigError(
        `Environment variable ${definition.name} must be a valid boolean`,
        'INVALID_BOOLEAN',
        definition.name,
        value
      );
    
    case 'url':
      try {
        new URL(value);
        return value;
      } catch {
        throw createConfigError(
          `Environment variable ${definition.name} must be a valid URL`,
          'INVALID_URL',
          definition.name,
          value
        );
      }
    
    case 'port':
      const port = Number(value);
      if (isNaN(port) || port < 1 || port > 65535) {
        throw createConfigError(
          `Environment variable ${definition.name} must be a valid port number (1-65535)`,
          'INVALID_PORT',
          definition.name,
          value
        );
      }
      return port;
    
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw createConfigError(
          `Environment variable ${definition.name} must be a valid email address`,
          'INVALID_EMAIL',
          definition.name,
          value
        );
      }
      return value;
    
    default:
      return value;
  }
}

/**
 * Creates a configuration error
 */
function createConfigError(
  message: string,
  code: string,
  field?: string,
  value?: unknown
): ConfigurationError {
  const error = new Error(message) as ConfigurationError;
  error.code = code;
  error.field = field;
  error.value = value;
  return error;
}

/**
 * Masks sensitive values for logging
 */
export function maskValue(value: unknown, isSecret = false): string {
  if (isSecret) {
    return '***';
  }
  
  if (typeof value === 'string' && value.length > 50) {
    return `${value.substring(0, 10)}...${value.substring(value.length - 10)}`;
  }
  
  return String(value);
}

/**
 * Gets all environment variables with a specific prefix
 */
export function getEnvVarsWithPrefix(prefix: string): Record<string, string> {
  const result: Record<string, string> = {};
  const prefixWithUnderscore = prefix.endsWith('_') ? prefix : `${prefix}_`;
  
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(prefixWithUnderscore) && value !== undefined) {
      const cleanKey = key.substring(prefixWithUnderscore.length);
      result[cleanKey] = value;
    }
  }
  
  return result;
}