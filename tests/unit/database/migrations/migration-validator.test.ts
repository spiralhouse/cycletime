/**
 * Unit tests for Migration Validator
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  SemanticVersion,
  SchemaComparison,
} from '../../../../src/database/migrations/migration-types';
import {
  MigrationValidator,
  validateMigration,
  validatePlan,
} from '../../../../src/database/migrations/migration-validator';
import { parseSemanticVersion } from '../../../../src/database/migrations/schema-versioning';

import type { Migration, MigrationPlan } from '../../../../src/database/migrations/migration-types';

describe('Migration Validator', () => {
  let validator: MigrationValidator;

  beforeEach(() => {
    validator = new MigrationValidator(true); // strict mode
  });

  describe('validateMigrationStructure', () => {
    it('should validate required fields', async () => {
      const validMigration: Migration = {
        id: '001_test_migration',
        version: parseSemanticVersion('1.0.0'),
        name: 'Test Migration',
        type: 'schema',
        description: 'Test migration description',
        dependencies: [],
        up: 'CREATE TABLE test (id INTEGER PRIMARY KEY);',
        created_at: new Date(),
        reversible: false,
      };

      const result = await validator.validateMigration(validMigration);

      expect(result.errors).toHaveLength(0);
    });

    it('should report missing required fields', async () => {
      const invalidMigration: Migration = {
        id: '', // Missing ID
        version: parseSemanticVersion('1.0.0'),
        name: '', // Missing name
        type: 'schema',
        description: 'Test description',
        dependencies: [],
        up: '', // Missing up script
        created_at: new Date(),
        reversible: false,
      };

      const result = await validator.validateMigration(invalidMigration);

      expect(result.errors.length).toBeGreaterThan(0);

      const errorCodes = result.errors.map(e => e.code);

      expect(errorCodes).toContain('MISSING_MIGRATION_ID');
      expect(errorCodes).toContain('MISSING_MIGRATION_NAME');
      expect(errorCodes).toContain('EMPTY_SQL_SCRIPT');
    });

    it('should warn about non-standard migration ID format', async () => {
      const migration: Migration = {
        id: 'bad_migration_name', // Non-standard format
        version: parseSemanticVersion('1.0.0'),
        name: 'Test Migration',
        type: 'schema',
        description: 'Test description',
        dependencies: [],
        up: 'CREATE TABLE test (id INTEGER PRIMARY KEY);',
        created_at: new Date(),
        reversible: false,
      };

      const result = await validator.validateMigration(migration);

      expect(result.warnings.some(w => w.code === 'NON_STANDARD_MIGRATION_ID')).toBe(true);
    });

    it('should warn about missing rollback support', async () => {
      const migration: Migration = {
        id: '001_test_migration',
        version: parseSemanticVersion('1.0.0'),
        name: 'Test Migration',
        type: 'schema',
        description: 'Test description',
        dependencies: [],
        up: 'CREATE TABLE test (id INTEGER PRIMARY KEY);',
        // No down script
        created_at: new Date(),
        reversible: false,
      };

      const result = await validator.validateMigration(migration);

      expect(result.warnings.some(w => w.code === 'NO_ROLLBACK_SUPPORT')).toBe(true);
    });
  });

  describe('validateSQLSyntax', () => {
    it('should detect dangerous operations in strict mode', async () => {
      const dangerousMigration: Migration = {
        id: '001_dangerous_migration',
        version: parseSemanticVersion('1.0.0'),
        name: 'Dangerous Migration',
        type: 'schema',
        description: 'Migration with dangerous operations',
        dependencies: [],
        up: `
          DROP TABLE old_table;
          DELETE FROM users WHERE active = false;
          TRUNCATE TABLE logs;
        `,
        created_at: new Date(),
        reversible: false,
      };

      const result = await validator.validateMigration(dangerousMigration);
      const errorCodes = result.errors.map(e => e.code);

      expect(errorCodes.filter(code => code === 'DANGEROUS_OPERATION')).toHaveLength(3);
    });

    it('should warn about dangerous operations in non-strict mode', async () => {
      const nonStrictValidator = new MigrationValidator(false);

      const dangerousMigration: Migration = {
        id: '001_dangerous_migration',
        version: parseSemanticVersion('1.0.0'),
        name: 'Dangerous Migration',
        type: 'schema',
        description: 'Migration with dangerous operations',
        dependencies: [],
        up: 'DROP TABLE old_table;',
        created_at: new Date(),
        reversible: false,
      };

      const result = await nonStrictValidator.validateMigration(dangerousMigration);

      expect(result.warnings.some(w => w.code === 'DANGEROUS_OPERATION')).toBe(true);
      expect(result.errors.some(e => e.code === 'DANGEROUS_OPERATION')).toBe(false);
    });

    it('should detect SQLite compatibility issues', async () => {
      const sqliteMigration: Migration = {
        id: '001_sqlite_migration',
        version: parseSemanticVersion('1.0.0'),
        name: 'SQLite Migration',
        type: 'schema',
        description: 'Migration with SQLite-specific issues',
        dependencies: [],
        up: `
          ALTER TABLE users ADD COLUMN email TEXT NOT NULL;
          ALTER TABLE users RENAME COLUMN name TO full_name;
          ALTER TABLE users DROP COLUMN old_field;
        `,
        created_at: new Date(),
        reversible: false,
      };

      const result = await validator.validateMigration(sqliteMigration);
      const warningCodes = result.warnings.map(w => w.code);

      expect(warningCodes.filter(code => code === 'SQLITE_COMPATIBILITY')).toHaveLength(3);
    });

    it('should warn about missing transaction handling', async () => {
      const migration: Migration = {
        id: '001_no_transaction',
        version: parseSemanticVersion('1.0.0'),
        name: 'No Transaction Migration',
        type: 'schema',
        description: 'Migration without explicit transactions',
        dependencies: [],
        up: `
          CREATE TABLE test1 (id INTEGER);
          CREATE TABLE test2 (id INTEGER);
        `,
        created_at: new Date(),
        reversible: false,
      };

      const result = await validator.validateMigration(migration);

      expect(result.warnings.some(w => w.code === 'NO_EXPLICIT_TRANSACTION')).toBe(true);
    });
  });

  describe('validateDependencies', () => {
    it('should detect missing dependencies', async () => {
      const migrations: Migration[] = [
        {
          id: '002_dependent_migration',
          version: parseSemanticVersion('1.1.0'),
          name: 'Dependent Migration',
          type: 'schema',
          description: 'Migration with missing dependency',
          dependencies: ['001_missing_migration'], // This migration doesn't exist
          up: 'CREATE TABLE test (id INTEGER);',
          created_at: new Date(),
          reversible: false,
        },
      ];

      const plan: MigrationPlan = {
        id: 'test_plan',
        from_version: parseSemanticVersion('1.0.0'),
        to_version: parseSemanticVersion('1.1.0'),
        migrations,
        direction: 'up',
        estimated_duration: 1000,
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
      };

      const result = await validator.validateMigrationPlan(plan);

      expect(result.errors.some(e => e.code === 'MISSING_DEPENDENCY')).toBe(true);
      expect(result.dependency_check.missing_dependencies).toContain('001_missing_migration');
    });

    it('should detect circular dependencies', async () => {
      const migrations: Migration[] = [
        {
          id: '001_first',
          version: parseSemanticVersion('1.0.0'),
          name: 'First Migration',
          type: 'schema',
          description: 'First migration',
          dependencies: ['002_second'], // Depends on second
          up: 'CREATE TABLE first (id INTEGER);',
          created_at: new Date(),
          reversible: false,
        },
        {
          id: '002_second',
          version: parseSemanticVersion('1.1.0'),
          name: 'Second Migration',
          type: 'schema',
          description: 'Second migration',
          dependencies: ['001_first'], // Depends on first - circular!
          up: 'CREATE TABLE second (id INTEGER);',
          created_at: new Date(),
          reversible: false,
        },
      ];

      const plan: MigrationPlan = {
        id: 'test_plan',
        from_version: parseSemanticVersion('1.0.0'),
        to_version: parseSemanticVersion('1.1.0'),
        migrations,
        direction: 'up',
        estimated_duration: 2000,
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
      };

      const result = await validator.validateMigrationPlan(plan);

      expect(result.errors.some(e => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
      expect(result.dependency_check.circular_dependencies.length).toBeGreaterThan(0);
    });

    it('should create valid execution order for dependencies', async () => {
      const migrations: Migration[] = [
        {
          id: '002_second',
          version: parseSemanticVersion('1.1.0'),
          name: 'Second Migration',
          type: 'schema',
          description: 'Second migration',
          dependencies: ['001_first'],
          up: 'CREATE TABLE second (id INTEGER);',
          created_at: new Date(),
          reversible: false,
        },
        {
          id: '001_first',
          version: parseSemanticVersion('1.0.0'),
          name: 'First Migration',
          type: 'schema',
          description: 'First migration',
          dependencies: [],
          up: 'CREATE TABLE first (id INTEGER);',
          created_at: new Date(),
          reversible: false,
        },
      ];

      const plan: MigrationPlan = {
        id: 'test_plan',
        from_version: parseSemanticVersion('1.0.0'),
        to_version: parseSemanticVersion('1.1.0'),
        migrations,
        direction: 'up',
        estimated_duration: 2000,
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
      };

      const result = await validator.validateMigrationPlan(plan);

      expect(result.dependency_check.execution_order).toEqual(['001_first', '002_second']);
    });
  });

  describe('analyzeRollbackSafety', () => {
    it('should identify non-reversible migrations', async () => {
      const migrations: Migration[] = [
        {
          id: '001_irreversible',
          version: parseSemanticVersion('1.0.0'),
          name: 'Irreversible Migration',
          type: 'schema',
          description: 'Migration without rollback',
          dependencies: [],
          up: 'CREATE TABLE test (id INTEGER);',
          // No down script
          created_at: new Date(),
          reversible: false,
        },
      ];

      const plan: MigrationPlan = {
        id: 'test_plan',
        from_version: parseSemanticVersion('1.0.0'),
        to_version: parseSemanticVersion('1.1.0'),
        migrations,
        direction: 'up',
        estimated_duration: 1000,
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
      };

      const result = await validator.validateMigrationPlan(plan);

      expect(result.rollback_safety.non_reversible_migrations).toContain('001_irreversible');
      expect(result.warnings.some(w => w.code === 'NON_REVERSIBLE_MIGRATION')).toBe(true);
    });

    it('should identify data loss risks in strict mode', async () => {
      const migrations: Migration[] = [
        {
          id: '001_data_loss',
          version: parseSemanticVersion('1.0.0'),
          name: 'Data Loss Migration',
          type: 'schema',
          description: 'Migration that causes data loss',
          dependencies: [],
          up: `
            DROP TABLE old_data;
            ALTER TABLE users DROP COLUMN email;
            DELETE FROM logs WHERE created_at < '2023-01-01';
          `,
          created_at: new Date(),
          reversible: false,
        },
      ];

      const plan: MigrationPlan = {
        id: 'test_plan',
        from_version: parseSemanticVersion('1.0.0'),
        to_version: parseSemanticVersion('1.1.0'),
        migrations,
        direction: 'up',
        estimated_duration: 1000,
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
      };

      const result = await validator.validateMigrationPlan(plan);

      expect(result.rollback_safety.data_loss_risks.length).toBeGreaterThan(0);

      // Should have both high and critical risks
      const riskLevels = result.rollback_safety.data_loss_risks.map(r => r.risk_level);

      expect(riskLevels).toContain('critical'); // DROP TABLE
      expect(riskLevels).toContain('high'); // DROP COLUMN and DELETE
    });
  });

  describe('validateVersionProgression', () => {
    it('should validate valid version progressions', async () => {
      const migrations: Migration[] = [
        {
          id: '001_test',
          version: parseSemanticVersion('1.1.0'),
          name: 'Test Migration',
          type: 'schema',
          description: 'Test',
          dependencies: [],
          up: 'CREATE TABLE test (id INTEGER);',
          created_at: new Date(),
          reversible: false,
        },
      ];

      const plan: MigrationPlan = {
        id: 'test_plan',
        from_version: parseSemanticVersion('1.0.0'),
        to_version: parseSemanticVersion('1.1.0'),
        migrations,
        direction: 'up',
        estimated_duration: 1000,
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
      };

      const result = await validator.validateMigrationPlan(plan);

      expect(result.errors.some(e => e.code === 'INVALID_VERSION_PROGRESSION')).toBe(false);
    });

    it('should reject invalid version progressions', async () => {
      const migrations: Migration[] = [
        {
          id: '001_test',
          version: parseSemanticVersion('1.0.0'),
          name: 'Test Migration',
          type: 'schema',
          description: 'Test',
          dependencies: [],
          up: 'CREATE TABLE test (id INTEGER);',
          created_at: new Date(),
          reversible: false,
        },
      ];

      const plan: MigrationPlan = {
        id: 'test_plan',
        from_version: parseSemanticVersion('1.1.0'), // Higher than target
        to_version: parseSemanticVersion('1.0.0'), // Lower than from - invalid for up direction
        migrations,
        direction: 'up',
        estimated_duration: 1000,
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
      };

      const result = await validator.validateMigrationPlan(plan);

      expect(result.errors.some(e => e.code === 'INVALID_VERSION_PROGRESSION')).toBe(true);
    });

    it('should warn about major version skips', async () => {
      const migrations: Migration[] = [
        {
          id: '001_test',
          version: parseSemanticVersion('3.0.0'),
          name: 'Test Migration',
          type: 'schema',
          description: 'Test',
          dependencies: [],
          up: 'CREATE TABLE test (id INTEGER);',
          created_at: new Date(),
          reversible: false,
        },
      ];

      const plan: MigrationPlan = {
        id: 'test_plan',
        from_version: parseSemanticVersion('1.0.0'),
        to_version: parseSemanticVersion('3.0.0'), // Skipping major version 2
        migrations,
        direction: 'up',
        estimated_duration: 1000,
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
      };

      const result = await validator.validateMigrationPlan(plan);

      expect(result.warnings.some(w => w.code === 'MAJOR_VERSION_SKIP')).toBe(true);
    });
  });

  describe('utility functions', () => {
    it('should validate single migration', async () => {
      const migration: Migration = {
        id: '001_test',
        version: parseSemanticVersion('1.0.0'),
        name: 'Test Migration',
        type: 'schema',
        description: 'Test migration',
        dependencies: [],
        up: 'CREATE TABLE test (id INTEGER);',
        created_at: new Date(),
        reversible: false,
      };

      const result = await validateMigration(migration, true);

      expect(result.is_valid).toBe(true);
    });

    it('should validate migration plan', async () => {
      const migrations: Migration[] = [
        {
          id: '001_test',
          version: parseSemanticVersion('1.0.0'),
          name: 'Test Migration',
          type: 'schema',
          description: 'Test',
          dependencies: [],
          up: 'CREATE TABLE test (id INTEGER);',
          created_at: new Date(),
          reversible: false,
        },
      ];

      const plan: MigrationPlan = {
        id: 'test_plan',
        from_version: parseSemanticVersion('1.0.0'),
        to_version: parseSemanticVersion('1.1.0'),
        migrations,
        direction: 'up',
        estimated_duration: 1000,
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
      };

      const result = await validatePlan(plan, true);

      expect(result.is_valid).toBe(true);
    });
  });

  describe('schema change detection', () => {
    it('should detect potentially risky schema changes', async () => {
      const migration: Migration = {
        id: '001_risky_changes',
        version: parseSemanticVersion('1.0.0'),
        name: 'Risky Changes',
        type: 'schema',
        description: 'Migration with risky changes',
        dependencies: [],
        up: `
          ALTER TABLE users ADD COLUMN email TEXT REFERENCES emails(id);
          CREATE INDEX idx_users_email ON users(email);
          CREATE TRIGGER update_user_timestamp 
            AFTER UPDATE ON users 
            BEGIN 
              UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END;
        `,
        created_at: new Date(),
        reversible: false,
      };

      const result = await validator.validateMigration(migration);
      const warningCodes = result.warnings.map(w => w.code);

      expect(warningCodes).toContain('FOREIGN_KEY_CHANGES');
      expect(warningCodes).toContain('INDEX_CHANGES');
      expect(warningCodes).toContain('TRIGGER_CHANGES');
    });
  });
});
