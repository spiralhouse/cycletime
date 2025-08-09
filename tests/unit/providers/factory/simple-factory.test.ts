/**
 * JCVD Simple Provider Factory Tests
 * Basic test suite for the simple provider factory
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { SimpleProviderFactory } from '../../../../src/providers/factory/simple-factory.js';

import type {
  SQLiteProviderConfig,
  LinearProviderConfig,
  GitHubProviderConfig,
  JiraProviderConfig,
} from '../../../../src/providers/types.js';

// =============================================================================
// Test Fixtures
// =============================================================================

const validSQLiteConfig: SQLiteProviderConfig = {
  type: 'sqlite',
  id: 'test-sqlite',
  name: 'Test SQLite Database',
  enabled: true,
  databasePath: ':memory:',
};

const validLinearConfig: LinearProviderConfig = {
  type: 'linear',
  id: 'test-linear',
  name: 'Test Linear Workspace',
  enabled: true,
  apiToken: 'lin_api_test_token_12345',
  teamId: '12345678-1234-1234-1234-123456789012',
};

const validGitHubConfig: GitHubProviderConfig = {
  type: 'github',
  id: 'test-github',
  name: 'Test GitHub Repository',
  enabled: true,
  apiToken: 'ghp_test_token_12345',
  owner: 'testorg',
  repo: 'testrepo',
};

const validJiraConfig: JiraProviderConfig = {
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
// Simple Provider Factory Tests
// =============================================================================

describe('SimpleProviderFactory', () => {
  let factory: SimpleProviderFactory;

  beforeEach(() => {
    factory = new SimpleProviderFactory();
  });

  afterEach(async () => {
    await factory.cleanup();
  });

  describe('Basic Provider Creation', () => {
    it('should create SQLite provider successfully', async () => {
      const provider = await factory.createProvider(validSQLiteConfig);

      expect(provider).toBeDefined();
      expect(provider.getProviderInfo().id).toBe('test-sqlite');
      expect(provider.getProviderInfo().type).toBe('sqlite');
      expect(provider.getProviderInfo().name).toBe('Test SQLite Database');
    });

    it('should create Linear provider successfully', async () => {
      const provider = await factory.createProvider(validLinearConfig);

      expect(provider).toBeDefined();
      expect(provider.getProviderInfo().id).toBe('test-linear');
      expect(provider.getProviderInfo().type).toBe('linear');
    });

    it('should create GitHub provider successfully', async () => {
      const provider = await factory.createProvider(validGitHubConfig);

      expect(provider).toBeDefined();
      expect(provider.getProviderInfo().id).toBe('test-github');
      expect(provider.getProviderInfo().type).toBe('github');
    });

    it('should create Jira provider successfully', async () => {
      const provider = await factory.createProvider(validJiraConfig);

      expect(provider).toBeDefined();
      expect(provider.getProviderInfo().id).toBe('test-jira');
      expect(provider.getProviderInfo().type).toBe('jira');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid configurations', () => {
      const configs = [validSQLiteConfig, validLinearConfig, validGitHubConfig, validJiraConfig];

      for (const config of configs) {
        const result = factory.validateConfig(config);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should reject missing type', async () => {
      const invalidConfig = {
        id: 'test-provider',
        name: 'Test Provider',
        enabled: true,
      } as any;

      await expect(factory.createProvider(invalidConfig)).rejects.toThrow(
        'Simple Provider Factory: Provider type is required'
      );
    });

    it('should reject unsupported provider type', async () => {
      const invalidConfig = {
        type: 'unsupported',
        id: 'test-provider',
        name: 'Test Provider',
        enabled: true,
      } as any;

      await expect(factory.createProvider(invalidConfig)).rejects.toThrow(
        'Simple Provider Factory: Unsupported provider type'
      );
    });

    it('should reject missing ID', async () => {
      const invalidConfig = {
        type: 'sqlite',
        name: 'Test Provider',
        enabled: true,
        databasePath: ':memory:',
      } as any;

      await expect(factory.createProvider(invalidConfig)).rejects.toThrow(
        'Simple Provider Factory: Provider ID is required'
      );
    });

    it('should reject missing name', async () => {
      const invalidConfig = {
        type: 'sqlite',
        id: 'test-provider',
        enabled: true,
        databasePath: ':memory:',
      } as any;

      await expect(factory.createProvider(invalidConfig)).rejects.toThrow(
        'Simple Provider Factory: Provider name is required'
      );
    });

    it('should validate SQLite-specific requirements', async () => {
      const invalidConfig = {
        type: 'sqlite',
        id: 'test-sqlite',
        name: 'Test SQLite',
        enabled: true,
        // Missing databasePath
      } as any;

      await expect(factory.createProvider(invalidConfig)).rejects.toThrow(
        'Simple Provider Factory: SQLite provider requires databasePath'
      );
    });

    it('should validate Linear-specific requirements', async () => {
      const missingTokenConfig = {
        type: 'linear',
        id: 'test-linear',
        name: 'Test Linear',
        enabled: true,
        teamId: '12345678-1234-1234-1234-123456789012',
        // Missing apiToken
      } as any;

      const missingTeamConfig = {
        type: 'linear',
        id: 'test-linear',
        name: 'Test Linear',
        enabled: true,
        apiToken: 'test-token',
        // Missing teamId
      } as any;

      await expect(factory.createProvider(missingTokenConfig)).rejects.toThrow(
        'Simple Provider Factory: Linear provider requires apiToken'
      );
      await expect(factory.createProvider(missingTeamConfig)).rejects.toThrow(
        'Simple Provider Factory: Linear provider requires teamId'
      );
    });

    it('should validate GitHub-specific requirements', async () => {
      const missingTokenConfig = {
        type: 'github',
        id: 'test-github',
        name: 'Test GitHub',
        enabled: true,
        owner: 'testorg',
        repo: 'testrepo',
        // Missing apiToken
      } as any;

      const missingOwnerRepoConfig = {
        type: 'github',
        id: 'test-github',
        name: 'Test GitHub',
        enabled: true,
        apiToken: 'test-token',
        // Missing owner and repo
      } as any;

      await expect(factory.createProvider(missingTokenConfig)).rejects.toThrow(
        'Simple Provider Factory: GitHub provider requires apiToken'
      );
      await expect(factory.createProvider(missingOwnerRepoConfig)).rejects.toThrow(
        'Simple Provider Factory: GitHub provider requires owner and repo'
      );
    });

    it('should validate Jira-specific requirements', async () => {
      const requiredFields = ['baseUrl', 'username', 'apiToken', 'projectKey'];

      for (const field of requiredFields) {
        const invalidConfig = {
          ...validJiraConfig,
          [field]: undefined,
        } as any;

        await expect(factory.createProvider(invalidConfig)).rejects.toThrow(
          `Simple Provider Factory: Jira provider requires ${field}`
        );
      }
    });
  });

  describe('Provider Registry Integration', () => {
    it('should register providers automatically', async () => {
      const provider = await factory.createProvider(validSQLiteConfig);

      const registeredProvider = factory.getProvider('test-sqlite');

      expect(registeredProvider).toBe(provider);
    });

    it('should list registered providers', async () => {
      await factory.createProvider(validSQLiteConfig);
      await factory.createProvider({
        ...validLinearConfig,
        id: 'test-linear-2',
        name: 'Test Linear 2',
      });

      const providers = factory.listProviders();

      expect(providers).toHaveLength(2);
      expect(providers.map(p => p.id)).toContain('test-sqlite');
      expect(providers.map(p => p.id)).toContain('test-linear-2');
    });

    it('should prevent duplicate provider IDs', async () => {
      await factory.createProvider(validSQLiteConfig);

      await expect(factory.createProvider(validSQLiteConfig)).rejects.toThrow(
        "Provider with ID 'test-sqlite' already exists"
      );
    });
  });

  describe('Capability Validation', () => {
    it('should validate provider capabilities', async () => {
      const result = await factory.createProviderWithCapabilities(validSQLiteConfig, [
        'projects.create',
        'issues.create',
      ]);

      expect(result.provider).toBeDefined();
      expect(result.capabilityValidation).toBeDefined();
      expect(result.capabilityValidation.isValid).toBeDefined();
    });

    it('should handle unsupported capabilities gracefully', async () => {
      const result = await factory.createProviderWithCapabilities(
        validGitHubConfig,
        ['dependencies.create'] // GitHub doesn't support dependencies
      );

      expect(result.provider).toBeDefined();
      expect(result.capabilityValidation.unsupportedCapabilities).toContain('dependencies.create');
    });
  });

  describe('Provider Types', () => {
    it('should return all supported provider types', () => {
      const supportedTypes = factory.getSupportedTypes();

      expect(supportedTypes).toContain('sqlite');
      expect(supportedTypes).toContain('linear');
      expect(supportedTypes).toContain('github');
      expect(supportedTypes).toContain('jira');
      expect(supportedTypes).toHaveLength(4);
    });
  });

  describe('Provider Lifecycle', () => {
    it('should initialize providers correctly', async () => {
      const provider = await factory.createProvider(validSQLiteConfig);

      expect(provider.getProviderInfo().status.isHealthy).toBe(true);
      expect(await provider.isAvailable()).toBe(true);
    });

    it('should cleanup providers on factory cleanup', async () => {
      await factory.createProvider(validSQLiteConfig);
      await factory.createProvider(validLinearConfig);

      const providersBefore = factory.listProviders();

      expect(providersBefore).toHaveLength(2);

      await factory.cleanup();

      const providersAfter = factory.listProviders();

      expect(providersAfter).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed error information', async () => {
      try {
        await factory.createProvider({} as any);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.code).toBeDefined();
        expect(error.message).toContain('Simple Provider Factory: Provider type is required');
        expect(error.providerId).toBe('factory');
      }
    });

    it('should handle initialization failures gracefully', async () => {
      // This test would require mocking the provider initialization to fail
      // For now, we just verify that errors are properly propagated
      const invalidConfig = {
        type: 'sqlite',
        id: 'test-sqlite',
        name: 'Test SQLite',
        enabled: true,
        databasePath: '', // Empty path might cause issues
      } as any;

      await expect(factory.createProvider(invalidConfig)).rejects.toThrow();
    });
  });

  describe('Provider Capabilities by Type', () => {
    it('should have correct SQLite capabilities', async () => {
      const provider = await factory.createProvider(validSQLiteConfig);
      const info = provider.getProviderInfo();

      expect(info.capabilities.supportsOffline).toBe(true);
      expect(info.capabilities.supportsCustomWorkflows).toBe(true);
      expect(info.capabilities.supportsImport).toBe(true);
      expect(info.authRequired).toBe(false);
    });

    it('should have correct Linear capabilities', async () => {
      const provider = await factory.createProvider(validLinearConfig);
      const info = provider.getProviderInfo();

      expect(info.capabilities.supportsSync).toBe(true);
      expect(info.capabilities.supportsCustomWorkflows).toBe(false);
      expect(info.capabilities.supportsOffline).toBe(false);
      expect(info.authRequired).toBe(true);
    });

    it('should have correct GitHub capabilities', async () => {
      const provider = await factory.createProvider(validGitHubConfig);
      const info = provider.getProviderInfo();

      expect(info.capabilities.supportsHierarchy).toBe(false);
      expect(info.capabilities.supportsDependencies).toBe(false);
      expect(info.capabilities.supportsEstimation).toBe(false);
      expect(info.authRequired).toBe(true);
    });

    it('should have correct Jira capabilities', async () => {
      const provider = await factory.createProvider(validJiraConfig);
      const info = provider.getProviderInfo();

      expect(info.capabilities.supportsHierarchy).toBe(true);
      expect(info.capabilities.supportsDependencies).toBe(true);
      expect(info.capabilities.supportsCustomWorkflows).toBe(true);
      expect(info.authRequired).toBe(true);
    });
  });
});
