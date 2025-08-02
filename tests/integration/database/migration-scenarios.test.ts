/**
 * Integration tests for Migration System End-to-End Scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import {
  MigrationEngine,
  DefaultMigrationEngineFactory,
} from '../../../src/database/migrations/migration-engine';
import { MigrationValidator } from '../../../src/database/migrations/migration-validator';
import { SchemaInspector } from '../../../src/database/utils/schema-inspector';
import {
  MigrationEngineConfig,
  Migration,
  MigrationMode,
  SemanticVersion,
} from '../../../src/database/migrations/migration-types';
import {
  parseSemanticVersion,
  formatSemanticVersion,
} from '../../../src/database/migrations/schema-versioning';

// Mock database class for testing
class MockDatabase {
  private tables: Map<string, any[]> = new Map();
  private schema: Map<string, string> = new Map();
  private metadata: Map<string, string> = new Map();

  constructor() {
    // Initialize with basic schema metadata
    this.metadata.set('version', '1.0.0');
    this.metadata.set('migration', '001_initial_schema');
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    // Mock implementation for common queries
    if (sql.includes('SELECT version FROM schema_versions WHERE is_current = TRUE')) {
      return [{ version: this.metadata.get('version') || '1.0.0' }];
    }

    if (sql.includes("SELECT value FROM schema_metadata WHERE key = 'version'")) {
      return [{ value: this.metadata.get('version') || '1.0.0' }];
    }

    if (sql.includes('SELECT * FROM schema_migrations')) {
      return this.tables.get('schema_migrations') || [];
    }

    if (sql.includes('FROM sqlite_master WHERE type')) {
      return []; // No tables by default
    }

    return [];
  }

  async exec(sql: string): Promise<void> {
    // Mock execution - just track what was executed
    if (sql.includes('CREATE TABLE')) {
      const match = sql.match(/CREATE TABLE (\w+)/);
      if (match) {
        this.schema.set(match[1], sql);
        this.tables.set(match[1], []);
      }
    }

    if (sql.includes('UPDATE schema_metadata SET value')) {
      const match = sql.match(/value = '([^']+)'/);
      if (match) {
        this.metadata.set('version', match[1]);
      }
    }
  }

  getTableNames(): string[] {
    return Array.from(this.schema.keys());
  }

  hasTable(name: string): boolean {
    return this.schema.has(name);
  }

  getVersion(): string {
    return this.metadata.get('version') || '1.0.0';
  }
}

describe('Migration System Integration Tests', () => {
  let db: MockDatabase;
  let engine: MigrationEngine;
  let validator: MigrationValidator;
  let inspector: SchemaInspector;
  let config: MigrationEngineConfig;

  beforeEach(async () => {
    db = new MockDatabase();

    config = {
      database: {
        path: ':memory:',
        enableWAL: false,
        enableForeignKeys: true,
        timeout: 5000,
      },
      migration_directories: ['./test-migrations'],
      max_execution_time: 30000,
      auto_backup: false,
      validation_mode: 'strict',
      logging: {
        level: 'error',
        console: false,
      },
    };

    // Create engine with mock database
    const factory = new DefaultMigrationEngineFactory();
    engine = new MigrationEngine(config);

    // Replace database connection with mock
    (engine as any).db = db;

    validator = new MigrationValidator(true);
    inspector = new SchemaInspector(db);
  });

  describe('Basic Migration Scenarios', () => {
    it('should execute a simple forward migration', async () => {
      const migration: Migration = {
        id: '001_create_users_table',
        version: parseSemanticVersion('1.1.0'),
        name: 'Create Users Table',
        type: 'schema',
        description: 'Add users table to database',
        dependencies: [],
        up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL);',
        created_at: new Date(),
        reversible: false,
      };

      // Mock loadMigrations to return our test migration
      (engine as any).loadMigrations = async () => [migration];

      const targetVersion = parseSemanticVersion('1.1.0');
      const plan = await engine.createMigrationPlan(targetVersion, 'up');

      expect(plan.migrations).toHaveLength(1);
      expect(plan.migrations[0].id).toBe('001_create_users_table');

      const result = await engine.executePlan(plan, 'normal');

      expect(result.success).toBe(true);
      expect(result.executed_migrations).toContain('001_create_users_table');
      expect(db.hasTable('users')).toBe(true);
    });

    it('should handle migration with dependencies', async () => {
      const migrations: Migration[] = [
        {
          id: '001_create_base_tables',
          version: parseSemanticVersion('1.1.0'),
          name: 'Create Base Tables',
          type: 'schema',
          description: 'Create foundational tables',
          dependencies: [],
          up: 'CREATE TABLE projects (id INTEGER PRIMARY KEY);',
          created_at: new Date(),
          reversible: false,
        },
        {
          id: '002_create_dependent_table',
          version: parseSemanticVersion('1.2.0'),
          name: 'Create Dependent Table',
          type: 'schema',
          description: 'Create table that depends on base tables',
          dependencies: ['001_create_base_tables'],
          up: 'CREATE TABLE issues (id INTEGER PRIMARY KEY, project_id INTEGER);',
          created_at: new Date(),
          reversible: false,
        },
      ];

      (engine as any).loadMigrations = async () => migrations;

      const targetVersion = parseSemanticVersion('1.2.0');
      const plan = await engine.createMigrationPlan(targetVersion, 'up');

      expect(plan.migrations).toHaveLength(2);

      // Check execution order - dependencies should come first
      expect(plan.migrations[0].id).toBe('001_create_base_tables');
      expect(plan.migrations[1].id).toBe('002_create_dependent_table');

      const result = await engine.executePlan(plan, 'normal');

      expect(result.success).toBe(true);
      expect(db.hasTable('projects')).toBe(true);
      expect(db.hasTable('issues')).toBe(true);
    });

    it('should handle rollback with down scripts', async () => {
      const migration: Migration = {
        id: '001_create_temp_table',
        version: parseSemanticVersion('1.1.0'),
        name: 'Create Temporary Table',
        type: 'schema',
        description: 'Add temporary table',
        dependencies: [],
        up: 'CREATE TABLE temp_data (id INTEGER PRIMARY KEY);',
        down: 'DROP TABLE temp_data;',
        created_at: new Date(),
        reversible: true,
      };

      (engine as any).loadMigrations = async () => [migration];

      // First, apply the migration
      const upPlan = await engine.createMigrationPlan(parseSemanticVersion('1.1.0'), 'up');
      await engine.executePlan(upPlan, 'normal');

      expect(db.hasTable('temp_data')).toBe(true);

      // Now rollback
      const rollbackResult = await engine.rollbackToVersion(parseSemanticVersion('1.0.0'));

      expect(rollbackResult.success).toBe(true);
      // Note: Mock database doesn't actually execute DROP TABLE, but in real scenario it would
    });
  });

  describe('Migration Plan Validation Scenarios', () => {
    it('should reject plan with circular dependencies', async () => {
      const migrations: Migration[] = [
        {
          id: '001_first',
          version: parseSemanticVersion('1.1.0'),
          name: 'First Migration',
          type: 'schema',
          description: 'First migration',
          dependencies: ['002_second'], // Circular dependency
          up: 'CREATE TABLE first (id INTEGER);',
          created_at: new Date(),
          reversible: false,
        },
        {
          id: '002_second',
          version: parseSemanticVersion('1.2.0'),
          name: 'Second Migration',
          type: 'schema',
          description: 'Second migration',
          dependencies: ['001_first'], // Circular dependency
          up: 'CREATE TABLE second (id INTEGER);',
          created_at: new Date(),
          reversible: false,
        },
      ];

      (engine as any).loadMigrations = async () => migrations;

      const targetVersion = parseSemanticVersion('1.2.0');

      // Should throw error due to circular dependency
      await expect(async () => {
        const plan = await engine.createMigrationPlan(targetVersion, 'up');
        await engine.executePlan(plan, 'normal');
      }).rejects.toThrow(/circular dependency/i);
    });

    it('should reject dangerous operations in strict mode', async () => {
      const dangerousMigration: Migration = {
        id: '001_dangerous',
        version: parseSemanticVersion('1.1.0'),
        name: 'Dangerous Migration',
        type: 'schema',
        description: 'Migration with data loss risk',
        dependencies: [],
        up: 'DROP TABLE important_data; DELETE FROM users;',
        created_at: new Date(),
        reversible: false,
      };

      (engine as any).loadMigrations = async () => [dangerousMigration];

      const targetVersion = parseSemanticVersion('1.1.0');
      const plan = await engine.createMigrationPlan(targetVersion, 'up');

      // Plan creation should succeed, but validation should flag issues
      expect(plan.validation_results.is_valid).toBe(false);
      expect(plan.validation_results.errors.length).toBeGreaterThan(0);

      // Execution should fail due to validation errors
      await expect(engine.executePlan(plan, 'normal')).rejects.toThrow(/invalid migration plan/i);
    });

    it('should allow dangerous operations in force mode', async () => {
      const dangerousMigration: Migration = {
        id: '001_dangerous',
        version: parseSemanticVersion('1.1.0'),
        name: 'Dangerous Migration',
        type: 'schema',
        description: 'Migration with data loss risk',
        dependencies: [],
        up: 'DROP TABLE old_data;',
        created_at: new Date(),
        reversible: false,
      };

      (engine as any).loadMigrations = async () => [dangerousMigration];

      // Use non-strict validator for this test
      const nonStrictValidator = new MigrationValidator(false);
      (engine as any).validator = nonStrictValidator;

      const targetVersion = parseSemanticVersion('1.1.0');
      const plan = await engine.createMigrationPlan(targetVersion, 'up');

      // Should succeed in force mode
      const result = await engine.executePlan(plan, 'force');
      expect(result.success).toBe(true);
    });
  });

  describe('Dry Run Scenarios', () => {
    it('should execute dry run without making changes', async () => {
      const migration: Migration = {
        id: '001_dry_run_test',
        version: parseSemanticVersion('1.1.0'),
        name: 'Dry Run Test',
        type: 'schema',
        description: 'Test dry run functionality',
        dependencies: [],
        up: 'CREATE TABLE dry_run_table (id INTEGER);',
        created_at: new Date(),
        reversible: false,
      };

      (engine as any).loadMigrations = async () => [migration];

      const targetVersion = parseSemanticVersion('1.1.0');
      const plan = await engine.createMigrationPlan(targetVersion, 'up');

      const result = await engine.executePlan(plan, 'dry_run');

      expect(result.success).toBe(true);
      expect(result.executed_migrations).toContain('001_dry_run_test');

      // Table should NOT be created in dry run mode
      expect(db.hasTable('dry_run_table')).toBe(false);

      // Version should NOT be updated in dry run
      expect(db.getVersion()).toBe('1.0.0');
    });
  });

  describe('Version Management Scenarios', () => {
    it('should track version progression correctly', async () => {
      const migrations: Migration[] = [
        {
          id: '001_v1_1',
          version: parseSemanticVersion('1.1.0'),
          name: 'Version 1.1',
          type: 'schema',
          description: 'Upgrade to v1.1',
          dependencies: [],
          up: 'CREATE TABLE v1_1_table (id INTEGER);',
          created_at: new Date(),
          reversible: false,
        },
        {
          id: '002_v1_2',
          version: parseSemanticVersion('1.2.0'),
          name: 'Version 1.2',
          type: 'schema',
          description: 'Upgrade to v1.2',
          dependencies: ['001_v1_1'],
          up: 'CREATE TABLE v1_2_table (id INTEGER);',
          created_at: new Date(),
          reversible: false,
        },
      ];

      (engine as any).loadMigrations = async () => migrations;

      // Initial version should be 1.0.0
      expect(await engine.getCurrentVersion()).toEqual(parseSemanticVersion('1.0.0'));

      // Migrate to 1.1.0
      const plan1_1 = await engine.createMigrationPlan(parseSemanticVersion('1.1.0'), 'up');
      await engine.executePlan(plan1_1, 'normal');

      expect(formatSemanticVersion(await engine.getCurrentVersion())).toBe('1.1.0');

      // Migrate to 1.2.0
      const plan1_2 = await engine.createMigrationPlan(parseSemanticVersion('1.2.0'), 'up');
      await engine.executePlan(plan1_2, 'normal');

      expect(formatSemanticVersion(await engine.getCurrentVersion())).toBe('1.2.0');
    });

    it('should handle semantic version edge cases', async () => {
      const migrations: Migration[] = [
        {
          id: '001_prerelease',
          version: parseSemanticVersion('1.1.0-alpha'),
          name: 'Prerelease Version',
          type: 'schema',
          description: 'Prerelease migration',
          dependencies: [],
          up: 'CREATE TABLE alpha_features (id INTEGER);',
          created_at: new Date(),
          reversible: false,
        },
        {
          id: '002_stable',
          version: parseSemanticVersion('1.1.0'),
          name: 'Stable Version',
          type: 'schema',
          description: 'Stable release',
          dependencies: ['001_prerelease'],
          up: 'CREATE TABLE stable_features (id INTEGER);',
          created_at: new Date(),
          reversible: false,
        },
      ];

      (engine as any).loadMigrations = async () => migrations;

      // Should be able to migrate through prerelease to stable
      const plan = await engine.createMigrationPlan(parseSemanticVersion('1.1.0'), 'up');
      const result = await engine.executePlan(plan, 'normal');

      expect(result.success).toBe(true);
      expect(result.executed_migrations).toHaveLength(2);
    });
  });

  describe('Schema Analysis Scenarios', () => {
    it('should analyze schema changes over time', async () => {
      // Start with initial schema
      expect(db.getTableNames()).toHaveLength(0);

      const migration: Migration = {
        id: '001_add_tables',
        version: parseSemanticVersion('1.1.0'),
        name: 'Add Tables',
        type: 'schema',
        description: 'Add initial tables',
        dependencies: [],
        up: `
          CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
          CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER);
        `,
        created_at: new Date(),
        reversible: false,
      };

      (engine as any).loadMigrations = async () => [migration];

      const plan = await engine.createMigrationPlan(parseSemanticVersion('1.1.0'), 'up');
      await engine.executePlan(plan, 'normal');

      // Verify tables were created
      expect(db.hasTable('users')).toBe(true);
      expect(db.hasTable('posts')).toBe(true);

      // Schema analysis should reflect the changes
      const schemaInfo = await inspector.getSchemaInfo();
      expect(schemaInfo.version).toBe('1.1.0');
    });

    it('should generate schema snapshots', async () => {
      const snapshot = await inspector.createSnapshot('Test snapshot');

      expect(snapshot.id).toBeTruthy();
      expect(snapshot.version).toBe('1.0.0');
      expect(snapshot.description).toBe('Test snapshot');
      expect(snapshot.schema_ddl).toBeTruthy();
      expect(snapshot.checksum).toBeTruthy();
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle migration execution failures gracefully', async () => {
      const failingMigration: Migration = {
        id: '001_failing',
        version: parseSemanticVersion('1.1.0'),
        name: 'Failing Migration',
        type: 'schema',
        description: 'Migration that will fail',
        dependencies: [],
        up: 'INVALID SQL SYNTAX;',
        created_at: new Date(),
        reversible: false,
      };

      (engine as any).loadMigrations = async () => [failingMigration];

      // Mock exec to throw error for invalid SQL
      const originalExec = db.exec.bind(db);
      db.exec = async (sql: string) => {
        if (sql.includes('INVALID SQL')) {
          throw new Error('SQL syntax error');
        }
        return originalExec(sql);
      };

      const targetVersion = parseSemanticVersion('1.1.0');
      const plan = await engine.createMigrationPlan(targetVersion, 'up');

      const result = await engine.executePlan(plan, 'normal');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.executed_migrations).toHaveLength(0);

      // Version should remain unchanged after failure
      expect(db.getVersion()).toBe('1.0.0');
    });

    it('should handle missing migration files', async () => {
      // Mock loadMigrations to return empty array
      (engine as any).loadMigrations = async () => [];

      const targetVersion = parseSemanticVersion('1.1.0');
      const plan = await engine.createMigrationPlan(targetVersion, 'up');

      // Should create empty plan
      expect(plan.migrations).toHaveLength(0);

      const result = await engine.executePlan(plan, 'normal');
      expect(result.success).toBe(true);
      expect(result.executed_migrations).toHaveLength(0);
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should handle complete project lifecycle', async () => {
      // Simulate a complete project evolution
      const lifecycle: Migration[] = [
        {
          id: '001_initial_schema',
          version: parseSemanticVersion('1.0.0'),
          name: 'Initial Schema',
          type: 'schema',
          description: 'Project foundation',
          dependencies: [],
          up: 'CREATE TABLE projects (id INTEGER PRIMARY KEY);',
          down: 'DROP TABLE projects;',
          created_at: new Date(),
          reversible: true,
        },
        {
          id: '002_add_users',
          version: parseSemanticVersion('1.1.0'),
          name: 'Add Users',
          type: 'schema',
          description: 'User management',
          dependencies: ['001_initial_schema'],
          up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, project_id INTEGER);',
          down: 'DROP TABLE users;',
          created_at: new Date(),
          reversible: true,
        },
        {
          id: '003_add_features',
          version: parseSemanticVersion('1.2.0'),
          name: 'Add Features',
          type: 'schema',
          description: 'Feature additions',
          dependencies: ['002_add_users'],
          up: 'CREATE TABLE features (id INTEGER PRIMARY KEY, user_id INTEGER);',
          down: 'DROP TABLE features;',
          created_at: new Date(),
          reversible: true,
        },
        {
          id: '004_major_refactor',
          version: parseSemanticVersion('2.0.0'),
          name: 'Major Refactor',
          type: 'schema',
          description: 'Breaking changes',
          dependencies: ['003_add_features'],
          up: 'ALTER TABLE projects ADD COLUMN version INTEGER DEFAULT 2;',
          created_at: new Date(),
          reversible: false, // Breaking change, no rollback
        },
      ];

      (engine as any).loadMigrations = async () => lifecycle;

      // Migrate through versions incrementally
      for (const targetVersion of ['1.0.0', '1.1.0', '1.2.0', '2.0.0']) {
        const version = parseSemanticVersion(targetVersion);
        const plan = await engine.createMigrationPlan(version, 'up');
        const result = await engine.executePlan(plan, 'normal');

        expect(result.success).toBe(true);
        expect(formatSemanticVersion(await engine.getCurrentVersion())).toBe(targetVersion);
      }

      // Should have all tables
      expect(db.hasTable('projects')).toBe(true);
      expect(db.hasTable('users')).toBe(true);
      expect(db.hasTable('features')).toBe(true);

      // Should be able to rollback to 1.2.0 (before breaking change)
      const rollbackResult = await engine.rollbackToVersion(parseSemanticVersion('1.2.0'));
      expect(rollbackResult.success).toBe(true);

      // But should not be able to rollback further due to non-reversible migration
      const rollbackValidation = await validator.validateMigrationPlan({
        id: 'rollback_plan',
        from_version: parseSemanticVersion('2.0.0'),
        to_version: parseSemanticVersion('1.0.0'),
        migrations: lifecycle.slice(0, 3).reverse(),
        direction: 'down',
        estimated_duration: 3000,
        validation_results: {
          is_valid: true,
          errors: [],
          warnings: [],
          dependency_check: {
            is_valid: true,
            circular_dependencies: [],
            missing_dependencies: [],
            execution_order: [],
          },
          rollback_safety: {
            is_safe: true,
            non_reversible_migrations: [],
            data_loss_risks: [],
            backup_required: false,
          },
        },
        created_at: new Date(),
      });

      expect(rollbackValidation.rollback_safety.non_reversible_migrations).toContain(
        '004_major_refactor'
      );
    });
  });
});
