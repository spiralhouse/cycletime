/**
 * Tests for configuration schema definitions
 */

import {
  appConfigSchema,
  databaseSchema,
  redisSchema,
  serverSchema,
  authSchema,
  loggingSchema,
  aiSchema,
  openAISchema,
  claudeSchema,
  monitoringSchema,
  securitySchema,
  storageSchema,
  getServiceSchema,
} from '../schema';

describe('Configuration schemas', () => {
  describe('databaseSchema', () => {
    it('should define correct structure', () => {
      expect(databaseSchema.name).toBe('database');
      expect(databaseSchema.variables).toBeDefined();
      expect(databaseSchema.variables.DATABASE_HOST).toBeDefined();
      expect(databaseSchema.variables.DATABASE_PORT).toBeDefined();
      expect(databaseSchema.variables.DATABASE_NAME).toBeDefined();
      expect(databaseSchema.variables.DATABASE_USERNAME).toBeDefined();
      expect(databaseSchema.variables.DATABASE_PASSWORD).toBeDefined();
    });

    it('should mark password as secret', () => {
      expect(databaseSchema.variables.DATABASE_PASSWORD.isSecret).toBe(true);
    });

    it('should have proper types', () => {
      expect(databaseSchema.variables.DATABASE_HOST.type).toBe('string');
      expect(databaseSchema.variables.DATABASE_PORT.type).toBe('port');
      expect(databaseSchema.variables.DATABASE_POOL_SIZE.type).toBe('number');
      expect(databaseSchema.variables.DATABASE_SSL.type).toBe('boolean');
    });
  });

  describe('redisSchema', () => {
    it('should define correct structure', () => {
      expect(redisSchema.name).toBe('redis');
      expect(redisSchema.variables).toBeDefined();
      expect(redisSchema.variables.REDIS_HOST).toBeDefined();
      expect(redisSchema.variables.REDIS_PORT).toBeDefined();
    });

    it('should mark password as secret', () => {
      expect(redisSchema.variables.REDIS_PASSWORD.isSecret).toBe(true);
    });
  });

  describe('serverSchema', () => {
    it('should define correct structure', () => {
      expect(serverSchema.name).toBe('server');
      expect(serverSchema.variables).toBeDefined();
      expect(serverSchema.variables.SERVER_HOST).toBeDefined();
      expect(serverSchema.variables.SERVER_PORT).toBeDefined();
    });

    it('should have proper default values', () => {
      expect(serverSchema.variables.SERVER_HOST.defaultValue).toBe('0.0.0.0');
      expect(serverSchema.variables.SERVER_PORT.defaultValue).toBe('3000');
    });
  });

  describe('authSchema', () => {
    it('should define correct structure', () => {
      expect(authSchema.name).toBe('auth');
      expect(authSchema.variables).toBeDefined();
      expect(authSchema.variables.JWT_SECRET).toBeDefined();
      expect(authSchema.variables.GITHUB_CLIENT_ID).toBeDefined();
      expect(authSchema.variables.GITHUB_CLIENT_SECRET).toBeDefined();
    });

    it('should mark secrets appropriately', () => {
      expect(authSchema.variables.JWT_SECRET.isSecret).toBe(true);
      expect(authSchema.variables.GITHUB_CLIENT_SECRET.isSecret).toBe(true);
    });

    it('should have pattern validation for JWT secret', () => {
      expect(authSchema.variables.JWT_SECRET.pattern).toBeDefined();
    });

    it('should validate URL type for callback', () => {
      expect(authSchema.variables.GITHUB_CALLBACK_URL.type).toBe('url');
    });
  });

  describe('loggingSchema', () => {
    it('should define correct structure', () => {
      expect(loggingSchema.name).toBe('logging');
      expect(loggingSchema.variables).toBeDefined();
      expect(loggingSchema.variables.LOG_LEVEL).toBeDefined();
      expect(loggingSchema.variables.LOG_FORMAT).toBeDefined();
    });

    it('should have allowed values for enums', () => {
      expect(loggingSchema.variables.LOG_LEVEL.allowedValues).toEqual([
        'error', 'warn', 'info', 'debug', 'trace'
      ]);
      expect(loggingSchema.variables.LOG_FORMAT.allowedValues).toEqual([
        'json', 'pretty', 'simple'
      ]);
    });
  });

  describe('openAISchema', () => {
    it('should define correct structure', () => {
      expect(openAISchema.name).toBe('openai');
      expect(openAISchema.variables).toBeDefined();
      expect(openAISchema.variables.OPENAI_API_KEY).toBeDefined();
      expect(openAISchema.variables.OPENAI_MODEL).toBeDefined();
    });

    it('should mark API key as secret', () => {
      expect(openAISchema.variables.OPENAI_API_KEY.isSecret).toBe(true);
    });
  });

  describe('claudeSchema', () => {
    it('should define correct structure', () => {
      expect(claudeSchema.name).toBe('claude');
      expect(claudeSchema.variables).toBeDefined();
      expect(claudeSchema.variables.CLAUDE_API_KEY).toBeDefined();
      expect(claudeSchema.variables.CLAUDE_MODEL).toBeDefined();
    });

    it('should mark API key as secret', () => {
      expect(claudeSchema.variables.CLAUDE_API_KEY.isSecret).toBe(true);
    });
  });

  describe('aiSchema', () => {
    it('should define correct structure', () => {
      expect(aiSchema.name).toBe('ai');
      expect(aiSchema.variables).toBeDefined();
      expect(aiSchema.nested).toBeDefined();
      expect(aiSchema.nested?.openai).toBe(openAISchema);
      expect(aiSchema.nested?.claude).toBe(claudeSchema);
    });

    it('should have default provider setting', () => {
      expect(aiSchema.variables.AI_DEFAULT_PROVIDER.allowedValues).toEqual([
        'openai', 'claude'
      ]);
      expect(aiSchema.variables.AI_DEFAULT_PROVIDER.defaultValue).toBe('claude');
    });
  });

  describe('monitoringSchema', () => {
    it('should define correct structure', () => {
      expect(monitoringSchema.name).toBe('monitoring');
      expect(monitoringSchema.variables).toBeDefined();
      expect(monitoringSchema.variables.ENABLE_METRICS).toBeDefined();
      expect(monitoringSchema.variables.ENABLE_HEALTH_CHECK).toBeDefined();
    });

    it('should have proper default values', () => {
      expect(monitoringSchema.variables.ENABLE_METRICS.defaultValue).toBe('true');
      expect(monitoringSchema.variables.HEALTH_CHECK_PATH.defaultValue).toBe('/health');
    });
  });

  describe('securitySchema', () => {
    it('should define correct structure', () => {
      expect(securitySchema.name).toBe('security');
      expect(securitySchema.variables).toBeDefined();
      expect(securitySchema.variables.SESSION_SECRET).toBeDefined();
      expect(securitySchema.variables.RATE_LIMIT_WINDOW).toBeDefined();
    });

    it('should mark session secret as secret', () => {
      expect(securitySchema.variables.SESSION_SECRET.isSecret).toBe(true);
    });

    it('should have pattern validation for session secret', () => {
      expect(securitySchema.variables.SESSION_SECRET.pattern).toBeDefined();
    });
  });

  describe('storageSchema', () => {
    it('should define correct structure', () => {
      expect(storageSchema.name).toBe('storage');
      expect(storageSchema.variables).toBeDefined();
      expect(storageSchema.variables.STORAGE_TYPE).toBeDefined();
    });

    it('should have allowed storage types', () => {
      expect(storageSchema.variables.STORAGE_TYPE.allowedValues).toEqual([
        'local', 's3', 'minio'
      ]);
    });

    it('should mark access keys as secret', () => {
      expect(storageSchema.variables.STORAGE_ACCESS_KEY_ID.isSecret).toBe(true);
      expect(storageSchema.variables.STORAGE_SECRET_ACCESS_KEY.isSecret).toBe(true);
    });
  });

  describe('appConfigSchema', () => {
    it('should define complete application schema', () => {
      expect(appConfigSchema.name).toBe('app');
      expect(appConfigSchema.variables).toBeDefined();
      expect(appConfigSchema.nested).toBeDefined();
    });

    it('should include all service schemas', () => {
      expect(appConfigSchema.nested?.database).toBe(databaseSchema);
      expect(appConfigSchema.nested?.redis).toBe(redisSchema);
      expect(appConfigSchema.nested?.server).toBe(serverSchema);
      expect(appConfigSchema.nested?.auth).toBe(authSchema);
      expect(appConfigSchema.nested?.logging).toBe(loggingSchema);
      expect(appConfigSchema.nested?.ai).toBe(aiSchema);
      expect(appConfigSchema.nested?.monitoring).toBe(monitoringSchema);
      expect(appConfigSchema.nested?.security).toBe(securitySchema);
      expect(appConfigSchema.nested?.storage).toBe(storageSchema);
    });

    it('should have NODE_ENV configuration', () => {
      expect(appConfigSchema.variables.NODE_ENV).toBeDefined();
      expect(appConfigSchema.variables.NODE_ENV.allowedValues).toEqual([
        'development', 'test', 'staging', 'production'
      ]);
    });
  });

  describe('getServiceSchema', () => {
    it('should return api-gateway specific schema', () => {
      const schema = getServiceSchema('api-gateway');
      
      expect(schema.name).toBe('api-gateway');
      expect(schema.nested?.server).toBe(serverSchema);
      expect(schema.nested?.auth).toBe(authSchema);
      expect(schema.nested?.logging).toBe(loggingSchema);
      expect(schema.nested?.monitoring).toBe(monitoringSchema);
      expect(schema.nested?.security).toBe(securitySchema);
    });

    it('should return ai-service specific schema', () => {
      const schema = getServiceSchema('ai-service');
      
      expect(schema.name).toBe('ai-service');
      expect(schema.nested?.server).toBe(serverSchema);
      expect(schema.nested?.database).toBe(databaseSchema);
      expect(schema.nested?.redis).toBe(redisSchema);
      expect(schema.nested?.ai).toBe(aiSchema);
      expect(schema.nested?.logging).toBe(loggingSchema);
      expect(schema.nested?.monitoring).toBe(monitoringSchema);
      expect(schema.nested?.security).toBe(securitySchema);
    });

    it('should return document-service specific schema', () => {
      const schema = getServiceSchema('document-service');
      
      expect(schema.name).toBe('document-service');
      expect(schema.nested?.server).toBe(serverSchema);
      expect(schema.nested?.database).toBe(databaseSchema);
      expect(schema.nested?.storage).toBe(storageSchema);
      expect(schema.nested?.logging).toBe(loggingSchema);
      expect(schema.nested?.monitoring).toBe(monitoringSchema);
      expect(schema.nested?.security).toBe(securitySchema);
    });

    it('should return task-service specific schema', () => {
      const schema = getServiceSchema('task-service');
      
      expect(schema.name).toBe('task-service');
      expect(schema.nested?.server).toBe(serverSchema);
      expect(schema.nested?.database).toBe(databaseSchema);
      expect(schema.nested?.redis).toBe(redisSchema);
      expect(schema.nested?.logging).toBe(loggingSchema);
      expect(schema.nested?.monitoring).toBe(monitoringSchema);
      expect(schema.nested?.security).toBe(securitySchema);
    });

    it('should return generic schema for unknown service', () => {
      const schema = getServiceSchema('unknown-service');
      
      expect(schema.name).toBe('unknown-service');
      expect(schema.nested?.server).toBe(serverSchema);
      expect(schema.nested?.logging).toBe(loggingSchema);
      expect(schema.nested?.monitoring).toBe(monitoringSchema);
      expect(schema.nested?.security).toBe(securitySchema);
    });
  });
});