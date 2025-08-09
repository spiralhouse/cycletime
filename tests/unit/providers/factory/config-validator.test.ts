/**
 * JCVD Provider Configuration Validator Tests
 * Comprehensive test suite for configuration validation
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  ProviderConfigValidator,
  validateProviderConfig,
  createCustomValidator,
} from '../../../../src/providers/factory/config-validator.js';

import type {
  ProviderConfig,
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
  databasePath: '/path/to/database.sqlite',
  enableWAL: true,
  cacheSize: 2000,
  timeout: 5000,
};

const validLinearConfig: LinearProviderConfig = {
  type: 'linear',
  id: 'test-linear',
  name: 'Test Linear Workspace',
  enabled: true,
  apiToken: 'lin_api_1234567890abcdef',
  teamId: '12345678-1234-5678-9012-123456789012',
  apiUrl: 'https://api.linear.app',
  timeout: 10_000,
};

const validGitHubConfig: GitHubProviderConfig = {
  type: 'github',
  id: 'test-github',
  name: 'Test GitHub Repository',
  enabled: true,
  apiToken: 'ghp_1234567890abcdef',
  owner: 'test-owner',
  repo: 'test-repo',
  apiUrl: 'https://api.github.com',
  timeout: 15_000,
};

const validJiraConfig: JiraProviderConfig = {
  type: 'jira',
  id: 'test-jira',
  name: 'Test Jira Project',
  enabled: true,
  baseUrl: 'https://company.atlassian.net',
  username: 'user@company.com',
  apiToken: 'jira_token_1234567890',
  projectKey: 'PROJ',
  timeout: 20_000,
};

// =============================================================================
// Provider Configuration Validator Tests
// =============================================================================

describe('ProviderConfigValidator', () => {
  let validator: ProviderConfigValidator;

  beforeEach(() => {
    validator = new ProviderConfigValidator();
  });

  describe('Common Field Validation', () => {
    it('should validate valid configurations for all provider types', () => {
      const configs = [validSQLiteConfig, validLinearConfig, validGitHubConfig, validJiraConfig];

      for (const config of configs) {
        const result = validator.validate(config);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.sanitizedConfig).toBeDefined();
      }
    });

    it('should require provider type', () => {
      const config = {
        id: 'test-provider',
        name: 'Test Provider',
        enabled: true,
        // Missing type
      } as ProviderConfig;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'type' && e.rule === 'required')).toBe(true);
    });

    it('should validate provider type against allowed values', () => {
      const config = {
        type: 'unsupported' as any,
        id: 'test-provider',
        name: 'Test Provider',
        enabled: true,
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e => e.field === 'type' && e.message.includes('sqlite, linear, github, jira')
        )
      ).toBe(true);
    });

    it('should require provider ID', () => {
      const config = {
        type: 'sqlite',
        name: 'Test Provider',
        enabled: true,
        // Missing id
      } as ProviderConfig;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'id' && e.rule === 'required')).toBe(true);
    });

    it('should validate provider ID format', () => {
      const invalidIds = ['', 'id with spaces', 'id@invalid', 'id/invalid', 'x'.repeat(101)];

      for (const invalidId of invalidIds) {
        const config = {
          ...validSQLiteConfig,
          id: invalidId,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'id')).toBe(true);
      }
    });

    it('should accept valid provider ID formats', () => {
      const validIds = [
        'simple-id',
        'id_with_underscores',
        'id-with-hyphens',
        'id123',
        'ID-UPPER-CASE',
      ];

      for (const validId of validIds) {
        const config = {
          ...validSQLiteConfig,
          id: validId,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(true);
      }
    });

    it('should require provider name', () => {
      const config = {
        type: 'sqlite',
        id: 'test-provider',
        enabled: true,
        // Missing name
      } as ProviderConfig;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'name' && e.rule === 'required')).toBe(true);
    });

    it('should validate provider name length', () => {
      const shortName = '';
      const longName = 'x'.repeat(201);

      const configs = [
        { ...validSQLiteConfig, name: shortName },
        { ...validSQLiteConfig, name: longName },
      ];

      for (const config of configs) {
        const result = validator.validate(config);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'name')).toBe(true);
      }
    });

    it('should validate enabled field as boolean', () => {
      const config = {
        ...validSQLiteConfig,
        enabled: 'true' as any, // Should be boolean, not string
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'enabled' && e.rule === 'boolean')).toBe(true);
    });
  });

  describe('SQLite Provider Validation', () => {
    it('should validate valid SQLite configuration', () => {
      const result = validator.validate(validSQLiteConfig);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedConfig?.enabled).toBe(true);
    });

    it('should require database path', () => {
      const config = {
        ...validSQLiteConfig,
        databasePath: undefined,
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'databasePath' && e.rule === 'required')).toBe(
        true
      );
    });

    it('should validate database path is not empty', () => {
      const config = {
        ...validSQLiteConfig,
        databasePath: '',
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'databasePath')).toBe(true);
    });

    it('should validate optional numeric fields', () => {
      const invalidConfig = {
        ...validSQLiteConfig,
        cacheSize: 50, // Below minimum
        timeout: 500_000, // Above maximum
      };

      const result = validator.validate(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'cacheSize')).toBe(true);
      expect(result.errors.some(e => e.field === 'timeout')).toBe(true);
    });

    it('should generate warnings for development database paths', () => {
      const devConfigs = [
        { ...validSQLiteConfig, databasePath: ':memory:' },
        { ...validSQLiteConfig, databasePath: '/tmp/test.db' },
        { ...validSQLiteConfig, databasePath: './dev-database.sqlite' },
      ];

      for (const config of devConfigs) {
        const result = validator.validate(config);

        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.field === 'databasePath')).toBe(true);
      }
    });
  });

  describe('Linear Provider Validation', () => {
    it('should validate valid Linear configuration', () => {
      const result = validator.validate(validLinearConfig);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedConfig).toBeDefined();
    });

    it('should require API token', () => {
      const config = {
        ...validLinearConfig,
        apiToken: undefined,
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'apiToken' && e.rule === 'required')).toBe(true);
    });

    it('should validate API token length', () => {
      const config = {
        ...validLinearConfig,
        apiToken: 'short',
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'apiToken')).toBe(true);
    });

    it('should require team ID', () => {
      const config = {
        ...validLinearConfig,
        teamId: undefined,
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'teamId' && e.rule === 'required')).toBe(true);
    });

    it('should validate team ID format as UUID', () => {
      const invalidTeamIds = [
        'not-a-uuid',
        '12345678',
        '12345678-1234-1234-1234', // Incomplete UUID
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // Invalid characters
      ];

      for (const teamId of invalidTeamIds) {
        const config = {
          ...validLinearConfig,
          teamId,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'teamId')).toBe(true);
      }
    });

    it('should validate optional API URL', () => {
      const config = {
        ...validLinearConfig,
        apiUrl: 'not-a-url',
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'apiUrl' && e.rule === 'url')).toBe(true);
    });

    it('should generate warnings for test tokens', () => {
      const testConfig = {
        ...validLinearConfig,
        apiToken: 'lin_test_token',
      };

      const result = validator.validate(testConfig);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.field === 'apiToken')).toBe(true);
    });
  });

  describe('GitHub Provider Validation', () => {
    it('should validate valid GitHub configuration', () => {
      const result = validator.validate(validGitHubConfig);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedConfig).toBeDefined();
    });

    it('should require API token, owner, and repo', () => {
      const requiredFields = ['apiToken', 'owner', 'repo'];

      for (const field of requiredFields) {
        const config = {
          ...validGitHubConfig,
          [field]: undefined,
        } as any;

        const result = validator.validate(config);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === field && e.rule === 'required')).toBe(true);
      }
    });

    it('should validate owner and repo name formats', () => {
      const invalidNames = ['invalid@name', 'invalid/name', 'invalid name', '', 'x'.repeat(101)];

      for (const invalidName of invalidNames) {
        const ownerConfig = { ...validGitHubConfig, owner: invalidName };
        const repoConfig = { ...validGitHubConfig, repo: invalidName };

        const ownerResult = validator.validate(ownerConfig);
        const repoResult = validator.validate(repoConfig);

        expect(ownerResult.isValid).toBe(false);
        expect(repoResult.isValid).toBe(false);
      }
    });

    it('should accept valid owner and repo names', () => {
      const validNames = [
        'simple-name',
        'name_with_underscores',
        'name.with.dots',
        'name123',
        'UPPERCASE-NAME',
      ];

      for (const validName of validNames) {
        const config = {
          ...validGitHubConfig,
          owner: validName,
          repo: validName,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(true);
      }
    });
  });

  describe('Jira Provider Validation', () => {
    it('should validate valid Jira configuration', () => {
      const result = validator.validate(validJiraConfig);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedConfig).toBeDefined();
    });

    it('should require base URL, username, API token, and project key', () => {
      const requiredFields = ['baseUrl', 'username', 'apiToken', 'projectKey'];

      for (const field of requiredFields) {
        const config = {
          ...validJiraConfig,
          [field]: undefined,
        } as any;

        const result = validator.validate(config);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === field && e.rule === 'required')).toBe(true);
      }
    });

    it('should validate base URL format', () => {
      const invalidUrls = ['not-a-url', 'ftp://invalid-protocol.com', 'http://', 'https://'];

      for (const invalidUrl of invalidUrls) {
        const config = {
          ...validJiraConfig,
          baseUrl: invalidUrl,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'baseUrl' && e.rule === 'url')).toBe(true);
      }
    });

    it('should validate project key format', () => {
      const invalidKeys = [
        'lowercase', // Must start with uppercase
        '123PROJECT', // Cannot start with number
        'PROJ-ECT', // Hyphens not allowed
        'proj', // Must be uppercase
        '', // Cannot be empty
      ];

      for (const invalidKey of invalidKeys) {
        const config = {
          ...validJiraConfig,
          projectKey: invalidKey,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'projectKey')).toBe(true);
      }
    });

    it('should accept valid project key formats', () => {
      const validKeys = ['PROJ', 'PROJECT', 'PROJ123', 'PROJECT_KEY', 'P'];

      for (const validKey of validKeys) {
        const config = {
          ...validJiraConfig,
          projectKey: validKey,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(true);
      }
    });
  });

  describe('Cross-field Validation', () => {
    it('should warn when ID and name are identical', () => {
      const config = {
        ...validSQLiteConfig,
        id: 'same-value',
        name: 'same-value',
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.field === 'id' && w.message.includes('identical'))).toBe(
        true
      );
    });

    it('should warn about custom API URLs', () => {
      const linearConfig = {
        ...validLinearConfig,
        apiUrl: 'https://custom-linear-instance.com',
      };

      const githubConfig = {
        ...validGitHubConfig,
        apiUrl: 'https://github.enterprise.com/api/v3',
      };

      const linearResult = validator.validate(linearConfig);
      const githubResult = validator.validate(githubConfig);

      expect(linearResult.warnings.some(w => w.field === 'apiUrl')).toBe(true);
      expect(githubResult.warnings.some(w => w.field === 'apiUrl')).toBe(true);
    });
  });

  describe('Configuration Sanitization', () => {
    it('should trim string fields', () => {
      const config = {
        ...validSQLiteConfig,
        id: '  trimmed-id  ',
        name: '  Trimmed Name  ',
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedConfig?.id).toBe('trimmed-id');
      expect(result.sanitizedConfig?.name).toBe('Trimmed Name');
    });

    it('should normalize URLs by removing trailing slashes', () => {
      const config = {
        ...validJiraConfig,
        baseUrl: 'https://company.atlassian.net///',
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedConfig?.baseUrl).toBe('https://company.atlassian.net');
    });

    it('should set default values for optional fields', () => {
      const config: ProviderConfig = {
        type: 'sqlite',
        id: 'test-sqlite',
        name: 'Test SQLite',
        databasePath: '/path/to/db.sqlite',
        // Missing enabled field
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedConfig?.enabled).toBe(true);
    });

    it('should set SQLite-specific defaults', () => {
      const config: SQLiteProviderConfig = {
        type: 'sqlite',
        id: 'test-sqlite',
        name: 'Test SQLite',
        enabled: true,
        databasePath: '/path/to/db.sqlite',
        // Missing optional fields
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect((result.sanitizedConfig as SQLiteProviderConfig).enableWAL).toBe(true);
      expect((result.sanitizedConfig as SQLiteProviderConfig).enableForeignKeys).toBe(true);
    });
  });

  describe('Timeout Validation', () => {
    it('should validate timeout ranges for all provider types', () => {
      const timeoutTests = [
        { config: validSQLiteConfig, field: 'timeout', min: 1000, max: 300_000 },
        { config: validLinearConfig, field: 'timeout', min: 1000, max: 120_000 },
        { config: validGitHubConfig, field: 'timeout', min: 1000, max: undefined },
        { config: validJiraConfig, field: 'timeout', min: 1000, max: undefined },
      ];

      for (const test of timeoutTests) {
        // Test below minimum
        const belowMinConfig = { ...test.config, [test.field]: test.min - 1 };
        const belowMinResult = validator.validate(belowMinConfig);

        expect(belowMinResult.isValid).toBe(false);
        expect(belowMinResult.errors.some(e => e.field === test.field)).toBe(true);

        // Test above maximum (if defined)
        if (test.max) {
          const aboveMaxConfig = { ...test.config, [test.field]: test.max + 1 };
          const aboveMaxResult = validator.validate(aboveMaxConfig);

          expect(aboveMaxResult.isValid).toBe(false);
          expect(aboveMaxResult.errors.some(e => e.field === test.field)).toBe(true);
        }

        // Test valid range
        const validConfig = { ...test.config, [test.field]: test.min + 1000 };
        const validResult = validator.validate(validConfig);

        expect(validResult.isValid).toBe(true);
      }
    });

    it('should warn about very short timeouts', () => {
      const shortTimeoutConfig = {
        ...validLinearConfig,
        timeout: 2000, // 2 seconds - quite short
      };

      const result = validator.validate(shortTimeoutConfig);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.field === 'timeout')).toBe(true);
    });
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('Validation Utilities', () => {
  it('should provide quick validation function', () => {
    const validResult = validateProviderConfig(validSQLiteConfig);
    const invalidResult = validateProviderConfig({
      type: 'sqlite',
      id: '',
      name: '',
      enabled: true,
      databasePath: '',
    } as SQLiteProviderConfig);

    expect(validResult.isValid).toBe(true);
    expect(validResult.errors).toHaveLength(0);
    expect(validResult.warnings).toBeDefined();

    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
  });

  it('should create custom validator', () => {
    const customValidator = createCustomValidator();

    expect(customValidator).toBeInstanceOf(ProviderConfigValidator);

    const result = customValidator.validate(validSQLiteConfig);

    expect(result.isValid).toBe(true);
  });
});

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

describe('Edge Cases', () => {
  let validator: ProviderConfigValidator;

  beforeEach(() => {
    validator = new ProviderConfigValidator();
  });

  it('should handle null and undefined values gracefully', () => {
    const configs = [
      null,
      undefined,
      {},
      { type: null },
      { type: 'sqlite', id: null },
      { type: 'sqlite', id: 'test', name: undefined },
    ];

    for (const config of configs) {
      const result = validator.validate(config as any);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('should handle unexpected field types', () => {
    const config = {
      type: 123, // Should be string
      id: [], // Should be string
      name: {}, // Should be string
      enabled: 'yes', // Should be boolean
      databasePath: 456, // Should be string
    } as any;

    const result = validator.validate(config);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle very large configurations', () => {
    const largeConfig = {
      ...validSQLiteConfig,
      id: 'x'.repeat(1000), // Very long ID
      name: 'y'.repeat(1000), // Very long name
      customField: 'z'.repeat(10_000), // Very long custom field
    } as any;

    const result = validator.validate(largeConfig);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'id')).toBe(true);
    expect(result.errors.some(e => e.field === 'name')).toBe(true);
  });

  it('should handle validation process errors gracefully', () => {
    // This test would be more meaningful with actual error conditions
    // For now, we test that the validator doesn't crash on edge cases
    const strangeConfig = {
      type: 'sqlite',
      id: 'test',
      name: 'test',
      enabled: true,
      databasePath: '/valid/path',
      // Add some unusual properties
      toString: () => 'config',
      valueOf: () => 42,
      constructor: Object,
    } as any;

    expect(() => validator.validate(strangeConfig)).not.toThrow();
  });
});
