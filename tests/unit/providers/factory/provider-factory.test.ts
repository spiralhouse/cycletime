/**
 * JCVD Enhanced Provider Factory Tests
 * Comprehensive test suite for the provider factory system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  EnhancedProviderFactory,
  createProviderFactory,
  getGlobalProviderFactory,
  resetGlobalProviderFactory,
} from '../../../../src/providers/factory/provider-factory.js';

import type {
  ProviderConfig,
  SQLiteProviderConfig,
  LinearProviderConfig,
  GitHubProviderConfig,
  JiraProviderConfig,
} from '../../../../src/providers/types.js';

// =============================================================================
// Test Setup and Fixtures
// =============================================================================

const mockSQLiteConfig: SQLiteProviderConfig = {
  type: 'sqlite',
  id: 'test-sqlite',
  name: 'Test SQLite Database',
  enabled: true,
  databasePath: ':memory:',
  enableWAL: true,
  cacheSize: 1000,
};

const mockLinearConfig: LinearProviderConfig = {
  type: 'linear',
  id: 'test-linear',
  name: 'Test Linear Workspace',
  enabled: true,
  apiToken: 'lin_api_test_token_12345',
  teamId: '12345678-1234-1234-1234-123456789012',
};

const mockGitHubConfig: GitHubProviderConfig = {
  type: 'github',
  id: 'test-github',
  name: 'Test GitHub Repository',
  enabled: true,
  apiToken: 'ghp_test_token_12345',
  owner: 'testorg',
  repo: 'testrepo',
};

const mockJiraConfig: JiraProviderConfig = {
  type: 'jira',
  id: 'test-jira',
  name: 'Test Jira Project',
  enabled: true,
  baseUrl: 'https://test.atlassian.net',
  username: 'test@example.com',
  apiToken: 'jira_test_token_12345',
  projectKey: 'TEST',
};

// =============================================================================
// Enhanced Provider Factory Tests
// =============================================================================

describe('EnhancedProviderFactory', () => {
  let factory: EnhancedProviderFactory;

  beforeEach(async () => {
    factory = new EnhancedProviderFactory({
      useGlobalRegistry: false, // Use isolated registry for tests
      autoRegister: true,
      enableValidation: true,
      enableCapabilityDiscovery: false, // Disable for simpler testing
    });
  });

  afterEach(async () => {
    await factory.cleanup();
  });

  describe('Basic Provider Creation', () => {
    it('should create SQLite provider successfully', async () => {
      const provider = await factory.createProvider(mockSQLiteConfig);

      expect(provider).toBeDefined();
      expect(provider.getProviderInfo().id).toBe('test-sqlite');
      expect(provider.getProviderInfo().type).toBe('sqlite');
      expect(provider.getProviderInfo().name).toBe('Test SQLite Database');
    });

    it('should create Linear provider successfully', async () => {
      const provider = await factory.createProvider(mockLinearConfig);

      expect(provider).toBeDefined();
      expect(provider.getProviderInfo().id).toBe('test-linear');
      expect(provider.getProviderInfo().type).toBe('linear');
      expect(provider.getProviderInfo().name).toBe('Test Linear Workspace');
    });

    it('should create GitHub provider successfully', async () => {
      const provider = await factory.createProvider(mockGitHubConfig);

      expect(provider).toBeDefined();
      expect(provider.getProviderInfo().id).toBe('test-github');
      expect(provider.getProviderInfo().type).toBe('github');
      expect(provider.getProviderInfo().name).toBe('Test GitHub Repository');
    });

    it('should create Jira provider successfully', async () => {
      const provider = await factory.createProvider(mockJiraConfig);

      expect(provider).toBeDefined();
      expect(provider.getProviderInfo().id).toBe('test-jira');
      expect(provider.getProviderInfo().type).toBe('jira');
      expect(provider.getProviderInfo().name).toBe('Test Jira Project');
    });

    it('should reject invalid provider configuration', async () => {
      const invalidConfig = {
        type: 'sqlite',
        id: '', // Invalid empty ID
        name: 'Invalid Config',
        enabled: true,
        databasePath: '',
      } as SQLiteProviderConfig;

      await expect(factory.createProvider(invalidConfig)).rejects.toThrow();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid SQLite configuration', () => {
      const result = factory.validateConfig(mockSQLiteConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidConfig = {
        type: 'linear',
        id: 'test-linear',
        name: 'Test Linear',
        enabled: true,
        // Missing apiToken and teamId
      } as LinearProviderConfig;

      const result = factory.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('apiToken'))).toBe(true);
      expect(result.errors.some(error => error.includes('teamId'))).toBe(true);
    });

    it('should detect invalid field formats', () => {
      const invalidConfig = {
        ...mockLinearConfig,
        teamId: 'invalid-uuid-format',
      };

      const result = factory.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('UUID format'))).toBe(true);
    });

    it('should validate URL fields correctly', () => {
      const validConfig = {
        ...mockJiraConfig,
        baseUrl: 'https://valid-url.com',
      };

      const invalidConfig = {
        ...mockJiraConfig,
        baseUrl: 'not-a-url',
      };

      expect(factory.validateConfig(validConfig).isValid).toBe(true);
      expect(factory.validateConfig(invalidConfig).isValid).toBe(false);
    });
  });

  describe('Enhanced Creation Options', () => {
    it('should create provider with custom tags and priority', async () => {
      const result = await factory.createProviderWithOptions(mockSQLiteConfig, {
        tags: ['test', 'sqlite', 'high-priority'],
        priority: 10,
        environment: 'test',
      });

      expect(result._provider).toBeDefined();
      expect(result.metadata.creationTime).toBeGreaterThan(0);
      expect(result.metadata.validationResult).toBeDefined();
    });

    it('should handle capability requirements', async () => {
      const result = await factory.createProviderWithOptions(mockSQLiteConfig, {
        requiredCapabilities: ['projects.create', 'issues.create'],
      });

      expect(result._provider).toBeDefined();
      // With capability discovery disabled, this should succeed with warnings
    });

    it('should provide creation metadata', async () => {
      const result = await factory.createProviderWithOptions(mockLinearConfig, {
        tags: ['api-provider'],
        metadata: { customField: 'testValue' },
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata.creationTime).toBeGreaterThan(0);
      expect(result.metadata.validationResult).toBeDefined();
    });
  });

  describe('Batch Provider Creation', () => {
    it('should create multiple providers successfully', async () => {
      const configs = [mockSQLiteConfig, mockLinearConfig, mockGitHubConfig];

      const result = await factory.createProviders(configs);

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.summary.total).toBe(3);
      expect(result.summary.successful).toBe(3);
      expect(result.summary.failed).toBe(0);
      expect(result.summary.duration).toBeGreaterThan(0);
    });

    it('should handle mixed success and failure', async () => {
      const validConfigs = [mockSQLiteConfig, mockLinearConfig];
      const invalidConfig = {
        type: 'sqlite',
        id: '', // Invalid
        name: 'Invalid',
        enabled: true,
        databasePath: '',
      } as SQLiteProviderConfig;

      const configs = [...validConfigs, invalidConfig];

      const result = await factory.createProviders(configs);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(1);
    });

    it('should process providers with controlled concurrency', async () => {
      // Create a large number of configs to test concurrency control
      const configs = Array.from({ length: 10 }, (_, i) => ({
        ...mockSQLiteConfig,
        id: `test-sqlite-${i}`,
        name: `Test SQLite ${i}`,
      }));

      const startTime = Date.now();
      const result = await factory.createProviders(configs);
      const duration = Date.now() - startTime;

      expect(result.successful).toHaveLength(10);
      expect(result.failed).toHaveLength(0);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Registry Integration', () => {
    it('should register providers automatically', async () => {
      const provider = await factory.createProvider(mockSQLiteConfig);

      const registeredProvider = factory.getProviderFromRegistry('test-sqlite');
      expect(registeredProvider).toBe(provider);
    });

    it('should list registered providers', async () => {
      const uniqueSQLiteConfig = { ...mockSQLiteConfig, id: 'test-sqlite-list' };
      const uniqueLinearConfig = { ...mockLinearConfig, id: 'test-linear-list' };
      
      await factory.createProvider(uniqueSQLiteConfig);
      await factory.createProvider(uniqueLinearConfig);

      const providers = factory.listRegisteredProviders();
      expect(providers.length).toBeGreaterThanOrEqual(2);
      expect(providers.map(p => p.id)).toContain('test-sqlite-list');
      expect(providers.map(p => p.id)).toContain('test-linear-list');
    });

    it('should provide registry statistics', async () => {
      const uniqueSQLiteConfig = { ...mockSQLiteConfig, id: 'test-sqlite-stats' };
      const uniqueLinearConfig = { ...mockLinearConfig, id: 'test-linear-stats' };
      
      await factory.createProvider(uniqueSQLiteConfig);
      await factory.createProvider(uniqueLinearConfig);

      const stats = factory.getFactoryStatistics();

      expect(stats.registry.totalProviders).toBeGreaterThanOrEqual(2);
      expect(stats.registry.providersByType.sqlite).toBeGreaterThanOrEqual(1);
      expect(stats.registry.providersByType.linear).toBeGreaterThanOrEqual(1);
      expect(stats.factory.validationEnabled).toBe(true);
      expect(stats.factory.autoRegistrationEnabled).toBe(true);
    });
  });

  describe('Provider Type Support', () => {
    it('should return all supported provider types', () => {
      const supportedTypes = factory.getSupportedTypes();

      expect(supportedTypes).toContain('sqlite');
      expect(supportedTypes).toContain('linear');
      expect(supportedTypes).toContain('github');
      expect(supportedTypes).toContain('jira');
    });

    it('should reject unsupported provider types', async () => {
      const unsupportedConfig = {
        type: 'unsupported' as any,
        id: 'test-unsupported',
        name: 'Unsupported Provider',
        enabled: true,
      };

      await expect(factory.createProvider(unsupportedConfig)).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed error information', async () => {
      const invalidConfig = {
        type: 'sqlite',
        id: '', // Invalid
        name: '',
        enabled: true,
        databasePath: '',
      } as SQLiteProviderConfig;

      try {
        await factory.createProvider(invalidConfig);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.providerId).toBe('factory');
        expect(error.context).toBeDefined();
      }
    });

    it('should handle factory cleanup errors gracefully', async () => {
      // Create some providers
      await factory.createProvider(mockSQLiteConfig);
      await factory.createProvider(mockLinearConfig);

      // Cleanup should not throw even if individual providers fail
      await expect(factory.cleanup()).resolves.not.toThrow();
    });
  });
});

// =============================================================================
// Factory Utility Tests
// =============================================================================

describe('Factory Utilities', () => {
  afterEach(() => {
    resetGlobalProviderFactory();
  });

  it('should create factory with default options', () => {
    const factory = createProviderFactory();

    expect(factory).toBeInstanceOf(EnhancedProviderFactory);
    expect(factory.getSupportedTypes()).toContain('sqlite');
  });

  it('should create factory with custom options', () => {
    const factory = createProviderFactory({
      enableValidation: false,
      autoRegister: false,
    });

    const stats = factory.getFactoryStatistics();
    expect(stats.factory.validationEnabled).toBe(false);
    expect(stats.factory.autoRegistrationEnabled).toBe(false);
  });

  it('should provide global factory singleton', () => {
    const factory1 = getGlobalProviderFactory();
    const factory2 = getGlobalProviderFactory();

    expect(factory1).toBe(factory2); // Same instance
  });

  it('should reset global factory', () => {
    const factory1 = getGlobalProviderFactory();
    resetGlobalProviderFactory();
    const factory2 = getGlobalProviderFactory();

    expect(factory1).not.toBe(factory2); // Different instances
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Provider Factory Integration', () => {
  let factory: EnhancedProviderFactory;

  beforeEach(() => {
    factory = createProviderFactory({
      useGlobalRegistry: false,
      enableValidation: true,
      enableCapabilityDiscovery: false,
    });
  });

  afterEach(async () => {
    await factory.cleanup();
  });

  it('should handle complete provider lifecycle', async () => {
    const uniqueConfig = { ...mockSQLiteConfig, id: 'test-sqlite-lifecycle' };
    
    // Create provider
    const provider = await factory.createProvider(uniqueConfig);
    expect(provider.getProviderInfo().status.isHealthy).toBe(true);

    // Verify registration
    const registeredProvider = factory.getProviderFromRegistry('test-sqlite-lifecycle');
    expect(registeredProvider).toBe(provider);

    // Check availability
    const isAvailable = await provider.isAvailable();
    expect(isAvailable).toBe(true);

    // Perform health check
    const healthStatus = await provider.healthCheck();
    expect(healthStatus.isHealthy).toBe(true);

    // Cleanup
    await factory.cleanup();
  });

  it('should work with different provider types simultaneously', async () => {
    // Create providers of different types with unique IDs
    const providers = await Promise.all([
      factory.createProvider({ ...mockSQLiteConfig, id: 'test-sqlite-multi' }),
      factory.createProvider({ ...mockLinearConfig, id: 'test-linear-multi' }),
      factory.createProvider({
        ...mockGitHubConfig,
        id: 'test-github-multi',
        name: 'Test GitHub Multi',
      }),
    ]);

    expect(providers).toHaveLength(3);

    // Verify all are registered and healthy
    const stats = factory.getFactoryStatistics();
    expect(stats.registry.totalProviders).toBeGreaterThanOrEqual(3);
    expect(stats.registry.healthyProviders).toBeGreaterThanOrEqual(3);

    // Verify different capabilities per provider type
    const sqliteProvider = providers[0];
    const linearProvider = providers[1];
    const githubProvider = providers[2];

    expect(sqliteProvider.getProviderInfo().capabilities.supportsOffline).toBe(true);
    expect(linearProvider.getProviderInfo().capabilities.supportsSync).toBe(true);
    expect(githubProvider.getProviderInfo().capabilities.supportsHierarchy).toBe(false);
  });

  it('should provide comprehensive factory statistics', async () => {
    // Create multiple providers with unique IDs
    await factory.createProviders([
      { ...mockSQLiteConfig, id: 'test-sqlite-comp' },
      { ...mockLinearConfig, id: 'test-linear-comp' },
      { ...mockGitHubConfig, id: 'github-comp-1', name: 'GitHub Comp 1' },
      { ...mockGitHubConfig, id: 'github-comp-2', name: 'GitHub Comp 2' },
    ]);

    const stats = factory.getFactoryStatistics();

    expect(stats.registry.totalProviders).toBeGreaterThanOrEqual(4);
    expect(stats.registry.providersByType.sqlite).toBeGreaterThanOrEqual(1);
    expect(stats.registry.providersByType.linear).toBeGreaterThanOrEqual(1);
    expect(stats.registry.providersByType.github).toBeGreaterThanOrEqual(2);
    expect(stats.instantiator.managedInstances).toBeGreaterThanOrEqual(4);
    expect(stats.instantiator.healthyInstances).toBeGreaterThanOrEqual(4);
  });
});
