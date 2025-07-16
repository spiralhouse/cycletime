/**
 * Tests for configuration loader utilities
 */

import {
  loadAppConfiguration,
  safeLoadConfiguration,
  loadConfigurationFromSchema,
  createConfigurationSummary,
  validateConfigurationHealth,
} from '../loaders';
import { appConfigSchema, databaseSchema } from '../schema';
import { AppConfiguration } from '../types';

describe('Configuration loaders', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('loadAppConfiguration', () => {
    it('should load valid configuration', () => {
      // Set required environment variables
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'testdb';
      process.env.DATABASE_DATABASE = 'testdb';
      process.env.DATABASE_USERNAME = 'user';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      process.env.SERVER_PORT = '3000';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.SESSION_SECRET = 'b'.repeat(32);

      const config = loadAppConfiguration({ environment: 'development' });
      
      expect(config.environment).toBe('development');
      expect(config.database.host).toBe('localhost');
      expect(config.database.port).toBe(5432);
      expect(config.redis.host).toBe('localhost');
      expect(config.server.port).toBe(3000);
    });

    it('should throw error for invalid configuration', () => {
      // Missing required environment variables
      process.env.NODE_ENV = 'production';
      
      expect(() => {
        loadAppConfiguration();
      }).toThrow();
    });

    it('should use default values for optional fields', () => {
      // Set minimal required variables
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'testdb';
      process.env.DATABASE_DATABASE = 'testdb';
      process.env.DATABASE_USERNAME = 'user';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.SESSION_SECRET = 'b'.repeat(32);

      const config = loadAppConfiguration({ environment: 'development' });
      
      expect(config.server.host).toBe('0.0.0.0');
      expect(config.logging.level).toBe('info');
      expect(config.monitoring.enableMetrics).toBe(true);
    });
  });

  describe('safeLoadConfiguration', () => {
    it('should return configuration for valid setup', () => {
      // Set required environment variables
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'testdb';
      process.env.DATABASE_DATABASE = 'testdb';
      process.env.DATABASE_USERNAME = 'user';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.SESSION_SECRET = 'b'.repeat(32);

      const result = safeLoadConfiguration();
      
      expect(result.config).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid setup', () => {
      // Missing required environment variables
      process.env.NODE_ENV = 'production';
      
      const result = safeLoadConfiguration();
      
      expect(result.config).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });

  describe('loadConfigurationFromSchema', () => {
    it('should load configuration using schema definition', () => {
      // Set some environment variables
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';

      const config = loadConfigurationFromSchema(appConfigSchema, { environment: 'development' });
      
      expect(config.environment).toBe('development');
      expect(config.validated).toBeDefined();
      expect(config.metadata.loadedAt).toBeDefined();
    });

    it('should collect errors for invalid variables', () => {
      process.env.DATABASE_PORT = 'invalid-port';

      const config = loadConfigurationFromSchema(appConfigSchema, {
        strict: false,
      });
      
      expect(config.metadata.errors.length).toBeGreaterThan(0);
    });

    it('should handle prefix correctly', () => {
      process.env.TEST_DATABASE_HOST = 'test-host';
      process.env.TEST_DATABASE_PORT = '5432';

      const config = loadConfigurationFromSchema(databaseSchema, {
        envPrefix: 'TEST',
      });
      
      expect(config.validated.DATABASE_HOST).toBe('test-host');
    });
  });

  describe('createConfigurationSummary', () => {
    it('should create summary without secrets', () => {
      const config: AppConfiguration = {
        environment: 'development',
        database: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'user',
          password: 'secret-password',
          ssl: false,
          poolSize: 10,
          connectionTimeout: 30000,
          maxRetries: 3,
        },
        redis: {
          host: 'localhost',
          port: 6379,
          database: 0,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
        },
        server: {
          host: '0.0.0.0',
          port: 3000,
          trustProxy: false,
          requestTimeout: 30000,
          bodyLimit: '1mb',
        },
        auth: {
          jwtSecret: 'jwt-secret',
          jwtExpiresIn: '1h',
          refreshTokenExpiresIn: '7d',
        },
        logging: {
          level: 'info',
          format: 'json',
          enableConsole: true,
          enableFile: false,
          maxFileSize: '10mb',
          maxFiles: 5,
        },
        ai: {
          defaultProvider: 'claude',
        },
        monitoring: {
          enableMetrics: true,
          enableHealthCheck: true,
          healthCheckPath: '/health',
          enablePrometheus: false,
        },
        security: {
          rateLimitWindow: 900000,
          rateLimitMax: 100,
          enableHelmet: true,
          enableCors: true,
          sessionSecret: 'session-secret',
          csrfProtection: true,
        },
        storage: {
          type: 'local',
        },
      };

      const summary = createConfigurationSummary(config, false);
      
      expect(summary['database.password']).toBe('***');
      expect(summary['auth.jwtSecret']).toBe('***');
      expect(summary['security.sessionSecret']).toBe('***');
      expect(summary['database.host']).toBe('localhost');
    });

    it('should include secrets when requested', () => {
      const config: AppConfiguration = {
        environment: 'development',
        database: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'user',
          password: 'secret-password',
          ssl: false,
          poolSize: 10,
          connectionTimeout: 30000,
          maxRetries: 3,
        },
        redis: {
          host: 'localhost',
          port: 6379,
          database: 0,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
        },
        server: {
          host: '0.0.0.0',
          port: 3000,
          trustProxy: false,
          requestTimeout: 30000,
          bodyLimit: '1mb',
        },
        auth: {
          jwtSecret: 'jwt-secret',
          jwtExpiresIn: '1h',
          refreshTokenExpiresIn: '7d',
        },
        logging: {
          level: 'info',
          format: 'json',
          enableConsole: true,
          enableFile: false,
          maxFileSize: '10mb',
          maxFiles: 5,
        },
        ai: {
          defaultProvider: 'claude',
        },
        monitoring: {
          enableMetrics: true,
          enableHealthCheck: true,
          healthCheckPath: '/health',
          enablePrometheus: false,
        },
        security: {
          rateLimitWindow: 900000,
          rateLimitMax: 100,
          enableHelmet: true,
          enableCors: true,
          sessionSecret: 'session-secret',
          csrfProtection: true,
        },
        storage: {
          type: 'local',
        },
      };

      const summary = createConfigurationSummary(config, true);
      
      expect(summary['database.password']).toBe('secret-password');
      expect(summary['auth.jwtSecret']).toBe('jwt-secret');
      expect(summary['security.sessionSecret']).toBe('session-secret');
    });
  });

  describe('validateConfigurationHealth', () => {
    it('should validate healthy configuration', async () => {
      const config: AppConfiguration = {
        environment: 'development',
        database: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'user',
          password: 'password',
          ssl: false,
          poolSize: 10,
          connectionTimeout: 30000,
          maxRetries: 3,
        },
        redis: {
          host: 'localhost',
          port: 6379,
          database: 0,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
        },
        server: {
          host: '0.0.0.0',
          port: 3000,
          trustProxy: false,
          requestTimeout: 30000,
          bodyLimit: '1mb',
        },
        auth: {
          jwtSecret: 'a'.repeat(32),
          jwtExpiresIn: '1h',
          refreshTokenExpiresIn: '7d',
        },
        logging: {
          level: 'info',
          format: 'json',
          enableConsole: true,
          enableFile: false,
          maxFileSize: '10mb',
          maxFiles: 5,
        },
        ai: {
          claude: {
            apiKey: 'claude-key',
            model: 'claude-3-sonnet-20240229',
            maxTokens: 4000,
            temperature: 0.7,
            timeout: 30000,
            retries: 3,
          },
          defaultProvider: 'claude',
        },
        monitoring: {
          enableMetrics: true,
          enableHealthCheck: true,
          healthCheckPath: '/health',
          enablePrometheus: false,
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

      const result = await validateConfigurationHealth(config);
      
      expect(result.healthy).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect configuration issues', async () => {
      const config: AppConfiguration = {
        environment: 'development',
        database: {
          host: '', // Invalid
          port: 0, // Invalid
          database: 'testdb',
          username: 'user',
          password: 'password',
          ssl: false,
          poolSize: 10,
          connectionTimeout: 30000,
          maxRetries: 3,
        },
        redis: {
          host: '', // Invalid
          port: 0, // Invalid
          database: 0,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
        },
        server: {
          host: '0.0.0.0',
          port: 3000,
          trustProxy: false,
          requestTimeout: 30000,
          bodyLimit: '1mb',
        },
        auth: {
          jwtSecret: 'short', // Too short
          jwtExpiresIn: '1h',
          refreshTokenExpiresIn: '7d',
        },
        logging: {
          level: 'info',
          format: 'json',
          enableConsole: true,
          enableFile: false,
          maxFileSize: '10mb',
          maxFiles: 5,
        },
        ai: {
          defaultProvider: 'claude',
          // No AI provider configured
        },
        monitoring: {
          enableMetrics: true,
          enableHealthCheck: true,
          healthCheckPath: '/health',
          enablePrometheus: false,
        },
        security: {
          rateLimitWindow: 900000,
          rateLimitMax: 100,
          enableHelmet: true,
          enableCors: true,
          sessionSecret: 'short', // Too short
          csrfProtection: true,
        },
        storage: {
          type: 'local',
        },
      };

      const result = await validateConfigurationHealth(config);
      
      expect(result.healthy).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues).toContain('Database host or port not configured');
      expect(result.issues).toContain('Redis host or port not configured');
      expect(result.issues).toContain('JWT secret not configured or too short');
      expect(result.issues).toContain('Session secret not configured or too short');
      expect(result.issues).toContain('No AI provider configured');
    });
  });
});