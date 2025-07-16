/**
 * Tests for configuration validation utilities
 */

import { z } from 'zod';
import {
  validateConfig,
  safeValidateConfig,
  databaseConfigSchema,
  redisConfigSchema,
  serverConfigSchema,
  authConfigSchema,
  loggingConfigSchema,
  aiConfigSchema,
  monitoringConfigSchema,
  securityConfigSchema,
  storageConfigSchema,
  appConfigSchema,
  createEnvironmentSchema,
  validateRequiredFields,
} from '../validation';

describe('Validation utilities', () => {
  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      
      const data = { name: 'test', age: 25 };
      const result = validateConfig(schema, data);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('should return error for invalid configuration', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      
      const data = { name: 'test', age: 'invalid' };
      const result = validateConfig(schema, data);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('safeValidateConfig', () => {
    it('should safely validate valid configuration', () => {
      const schema = z.object({
        name: z.string(),
      });
      
      const data = { name: 'test' };
      const result = safeValidateConfig(schema, data);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('should safely handle invalid configuration', () => {
      const schema = z.object({
        name: z.string(),
      });
      
      const data = { name: 123 };
      const result = safeValidateConfig(schema, data);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('databaseConfigSchema', () => {
    it('should validate valid database configuration', () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'user',
        password: 'password',
      };
      
      const result = databaseConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'user',
        password: 'password',
      };
      
      const result = databaseConfigSchema.parse(config);
      expect(result.ssl).toBe(false);
      expect(result.poolSize).toBe(10);
      expect(result.connectionTimeout).toBe(30000);
      expect(result.maxRetries).toBe(3);
    });

    it('should reject invalid port', () => {
      const config = {
        host: 'localhost',
        port: 70000,
        database: 'testdb',
        username: 'user',
        password: 'password',
      };
      
      const result = databaseConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('redisConfigSchema', () => {
    it('should validate valid Redis configuration', () => {
      const config = {
        host: 'localhost',
        port: 6379,
      };
      
      const result = redisConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const config = {
        host: 'localhost',
        port: 6379,
      };
      
      const result = redisConfigSchema.parse(config);
      expect(result.database).toBe(0);
      expect(result.retryDelayOnFailover).toBe(100);
      expect(result.maxRetriesPerRequest).toBe(3);
    });
  });

  describe('serverConfigSchema', () => {
    it('should validate valid server configuration', () => {
      const config = {
        port: 3000,
      };
      
      const result = serverConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const config = {
        port: 3000,
      };
      
      const result = serverConfigSchema.parse(config);
      expect(result.host).toBe('0.0.0.0');
      expect(result.trustProxy).toBe(false);
      expect(result.requestTimeout).toBe(30000);
      expect(result.bodyLimit).toBe('1mb');
    });
  });

  describe('authConfigSchema', () => {
    it('should validate valid auth configuration', () => {
      const config = {
        jwtSecret: 'a'.repeat(32),
      };
      
      const result = authConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject short JWT secret', () => {
      const config = {
        jwtSecret: 'short',
      };
      
      const result = authConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should apply default values', () => {
      const config = {
        jwtSecret: 'a'.repeat(32),
      };
      
      const result = authConfigSchema.parse(config);
      expect(result.jwtExpiresIn).toBe('1h');
      expect(result.refreshTokenExpiresIn).toBe('7d');
    });
  });

  describe('loggingConfigSchema', () => {
    it('should validate valid logging configuration', () => {
      const config = {};
      
      const result = loggingConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const config = {};
      
      const result = loggingConfigSchema.parse(config);
      expect(result.level).toBe('info');
      expect(result.format).toBe('json');
      expect(result.enableConsole).toBe(true);
      expect(result.enableFile).toBe(false);
    });

    it('should reject invalid log level', () => {
      const config = {
        level: 'invalid',
      };
      
      const result = loggingConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('aiConfigSchema', () => {
    it('should validate valid AI configuration', () => {
      const config = {
        openai: {
          apiKey: 'sk-test',
        },
        claude: {
          apiKey: 'claude-test',
        },
      };
      
      const result = aiConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const config = {};
      
      const result = aiConfigSchema.parse(config);
      expect(result.defaultProvider).toBe('claude');
    });
  });

  describe('monitoringConfigSchema', () => {
    it('should validate valid monitoring configuration', () => {
      const config = {};
      
      const result = monitoringConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const config = {};
      
      const result = monitoringConfigSchema.parse(config);
      expect(result.enableMetrics).toBe(true);
      expect(result.enableHealthCheck).toBe(true);
      expect(result.healthCheckPath).toBe('/health');
      expect(result.enablePrometheus).toBe(false);
    });
  });

  describe('securityConfigSchema', () => {
    it('should validate valid security configuration', () => {
      const config = {
        sessionSecret: 'a'.repeat(32),
      };
      
      const result = securityConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const config = {
        sessionSecret: 'a'.repeat(32),
      };
      
      const result = securityConfigSchema.parse(config);
      expect(result.rateLimitWindow).toBe(900000);
      expect(result.rateLimitMax).toBe(100);
      expect(result.enableHelmet).toBe(true);
      expect(result.enableCors).toBe(true);
      expect(result.csrfProtection).toBe(true);
    });
  });

  describe('storageConfigSchema', () => {
    it('should validate valid storage configuration', () => {
      const config = {};
      
      const result = storageConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const config = {};
      
      const result = storageConfigSchema.parse(config);
      expect(result.type).toBe('local');
    });
  });

  describe('appConfigSchema', () => {
    it('should validate complete app configuration', () => {
      const config = {
        environment: 'development',
        database: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'user',
          password: 'password',
        },
        redis: {
          host: 'localhost',
          port: 6379,
        },
        server: {
          port: 3000,
        },
        auth: {
          jwtSecret: 'a'.repeat(32),
        },
        logging: {},
        ai: {},
        monitoring: {},
        security: {
          sessionSecret: 'b'.repeat(32),
        },
        storage: {},
      };
      
      const result = appConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe('createEnvironmentSchema', () => {
    it('should create production schema with stricter validation', () => {
      const schema = createEnvironmentSchema('production');
      
      const config = {
        environment: 'production',
        database: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'user',
          password: 'password',
        },
        redis: {
          host: 'localhost',
          port: 6379,
        },
        server: {
          port: 3000,
        },
        auth: {
          jwtSecret: 'a'.repeat(64), // Must be longer in production
        },
        logging: {
          level: 'info', // Cannot be debug/trace in production
        },
        ai: {},
        monitoring: {},
        security: {
          sessionSecret: 'b'.repeat(64), // Must be longer in production
        },
        storage: {},
      };
      
      const result = schema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject weak production configuration', () => {
      const schema = createEnvironmentSchema('production');
      
      const config = {
        environment: 'production',
        database: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'user',
          password: 'password',
        },
        redis: {
          host: 'localhost',
          port: 6379,
        },
        server: {
          port: 3000,
        },
        auth: {
          jwtSecret: 'a'.repeat(32), // Too short for production
        },
        logging: {
          level: 'debug', // Not allowed in production
        },
        ai: {},
        monitoring: {},
        security: {
          sessionSecret: 'b'.repeat(32), // Too short for production
        },
        storage: {},
      };
      
      const result = schema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should create partial schema for test environment', () => {
      const schema = createEnvironmentSchema('test');
      
      const config = {
        environment: 'test',
        // Most fields are optional in test
        server: {
          host: '0.0.0.0',
          port: 3000,
        },
        logging: {
          level: 'info',
          format: 'json',
          enableConsole: true,
        },
        ai: {
          defaultProvider: 'claude',
        },
        monitoring: {
          enableMetrics: true,
          enableHealthCheck: true,
        },
        security: {
          rateLimitWindow: 900000,
          rateLimitMax: 100,
          enableHelmet: true,
          enableCors: true,
          sessionSecret: 'b'.repeat(32),
          csrfProtection: true,
        },
        storage: {
          type: 'local',
        },
      };
      
      const result = schema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe('validateRequiredFields', () => {
    it('should validate required fields for production', () => {
      const config = {
        database: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'user',
          password: 'password',
        },
        redis: {
          host: 'localhost',
          port: 6379,
        },
        auth: {
          jwtSecret: 'a'.repeat(32),
        },
        security: {
          sessionSecret: 'b'.repeat(32),
        },
      };
      
      const result = validateRequiredFields(config, 'production');
      expect(result.success).toBe(true);
    });

    it('should detect missing required fields for production', () => {
      const config = {
        database: {
          host: 'localhost',
          // Missing port, database, username, password
        },
      };
      
      const result = validateRequiredFields(config, 'production');
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Missing required configuration fields');
    });

    it('should require fewer fields for development', () => {
      const config = {
        database: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
        },
      };
      
      const result = validateRequiredFields(config, 'development');
      expect(result.success).toBe(true);
    });

    it('should require no fields for test environment', () => {
      const config = {};
      
      const result = validateRequiredFields(config, 'test');
      expect(result.success).toBe(true);
    });
  });
});