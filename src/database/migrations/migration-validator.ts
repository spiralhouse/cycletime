/**
 * JCVD Migration Validation System
 * Comprehensive validation logic for migration safety and integrity
 */

import {
  Migration,
  MigrationPlan,
  MigrationPlanValidation,
  MigrationValidationError,
  MigrationValidationWarning,
  DependencyValidation,
  RollbackSafetyAnalysis,
  DataLossRisk,
  SemanticVersion,
  SchemaComparison,
  TableModification,
  ColumnModification
} from './migration-types'

import {
  SchemaVersioning,
  parseSemanticVersion,
  formatSemanticVersion,
  compareSemanticVersions
} from './schema-versioning'

// =============================================================================
// Migration Validator Core
// =============================================================================

export class MigrationValidator {
  private strictMode: boolean
  
  constructor(strictMode: boolean = true) {
    this.strictMode = strictMode
  }
  
  /**
   * Validate a complete migration plan
   */
  async validateMigrationPlan(plan: MigrationPlan): Promise<MigrationPlanValidation> {
    const errors: MigrationValidationError[] = []
    const warnings: MigrationValidationWarning[] = []
    
    // Validate individual migrations
    for (const migration of plan.migrations) {
      const migrationValidation = await this.validateMigration(migration)
      errors.push(...migrationValidation.errors)
      warnings.push(...migrationValidation.warnings)
    }
    
    // Validate dependencies
    const dependencyCheck = this.validateDependencies(plan.migrations)
    errors.push(...dependencyCheck.errors)
    warnings.push(...dependencyCheck.warnings)
    
    // Analyze rollback safety
    const rollbackSafety = await this.analyzeRollbackSafety(plan.migrations, plan.direction)
    errors.push(...rollbackSafety.errors)
    warnings.push(...rollbackSafety.warnings)
    
    // Validate version progression
    const versionValidation = this.validateVersionProgression(plan.from_version, plan.to_version, plan.direction)
    errors.push(...versionValidation.errors)
    warnings.push(...versionValidation.warnings)
    
    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      dependency_check: dependencyCheck.dependency_check,
      rollback_safety: rollbackSafety.rollback_safety
    }
  }
  
  /**
   * Validate individual migration
   */
  async validateMigration(migration: Migration): Promise<{ errors: MigrationValidationError[], warnings: MigrationValidationWarning[] }> {
    const errors: MigrationValidationError[] = []
    const warnings: MigrationValidationWarning[] = []
    
    // Validate migration structure
    const structureValidation = this.validateMigrationStructure(migration)
    errors.push(...structureValidation.errors)
    warnings.push(...structureValidation.warnings)
    
    // Validate SQL syntax (for string migrations)
    if (typeof migration.up === 'string') {
      const sqlValidation = this.validateSQLSyntax(migration.up, 'up', migration.id)
      errors.push(...sqlValidation.errors)
      warnings.push(...sqlValidation.warnings)
    }
    
    if (typeof migration.down === 'string') {
      const sqlValidation = this.validateSQLSyntax(migration.down, 'down', migration.id)
      errors.push(...sqlValidation.errors)
      warnings.push(...sqlValidation.warnings)
    }
    
    // Validate schema changes
    const schemaValidation = await this.validateSchemaChanges(migration)
    errors.push(...schemaValidation.errors)
    warnings.push(...schemaValidation.warnings)
    
    return { errors, warnings }
  }
  
  /**
   * Validate migration structure and metadata
   */
  private validateMigrationStructure(migration: Migration): { errors: MigrationValidationError[], warnings: MigrationValidationWarning[] } {
    const errors: MigrationValidationError[] = []
    const warnings: MigrationValidationWarning[] = []
    
    // Required fields validation
    if (!migration.id || migration.id.trim() === '') {
      errors.push({
        code: 'MISSING_MIGRATION_ID',
        message: 'Migration must have a valid ID',
        migration_id: migration.id,
        severity: 'critical'
      })
    }
    
    if (!migration.name || migration.name.trim() === '') {
      errors.push({
        code: 'MISSING_MIGRATION_NAME',
        message: 'Migration must have a name',
        migration_id: migration.id,
        severity: 'high'
      })
    }
    
    if (!migration.up) {
      errors.push({
        code: 'MISSING_UP_MIGRATION',
        message: 'Migration must have an up script',
        migration_id: migration.id,
        severity: 'critical'
      })
    }
    
    // Version validation
    try {
      SchemaVersioning.validate(formatSemanticVersion(migration.version))
    } catch (error) {
      errors.push({
        code: 'INVALID_VERSION_FORMAT',
        message: `Invalid version format: ${error.message}`,
        migration_id: migration.id,
        severity: 'critical'
      })
    }
    
    // ID format validation
    if (migration.id && !migration.id.match(/^\d{3}_[a-z0-9_]+$/)) {
      warnings.push({
        code: 'NON_STANDARD_MIGRATION_ID',
        message: 'Migration ID should follow format: NNN_description_with_underscores',
        migration_id: migration.id,
        recommendation: 'Use format like: 001_initial_schema, 002_add_users_table'
      })
    }
    
    // Rollback support validation
    if (!migration.down && migration.type !== 'data') {
      warnings.push({
        code: 'NO_ROLLBACK_SUPPORT',
        message: 'Migration does not support rollback (no down script)',
        migration_id: migration.id,
        recommendation: 'Consider adding a down script for better rollback support'
      })
    }
    
    // Estimated duration warning
    if (!migration.estimated_duration) {
      warnings.push({
        code: 'NO_DURATION_ESTIMATE',
        message: 'Migration has no duration estimate',
        migration_id: migration.id,
        recommendation: 'Add estimated_duration field for better planning'
      })
    }
    
    return { errors, warnings }
  }
  
  /**
   * Validate SQL syntax and identify potential issues
   */
  private validateSQLSyntax(
    sql: string, 
    direction: 'up' | 'down', 
    migrationId: string
  ): { errors: MigrationValidationError[], warnings: MigrationValidationWarning[] } {
    const errors: MigrationValidationError[] = []
    const warnings: MigrationValidationWarning[] = []
    
    // Basic SQL validation
    if (!sql || sql.trim() === '') {
      errors.push({
        code: 'EMPTY_SQL_SCRIPT',
        message: `Empty ${direction} SQL script`,
        migration_id: migrationId,
        severity: 'critical'
      })
      return { errors, warnings }
    }
    
    // Check for dangerous operations
    const dangerousPatterns = [
      { pattern: /DROP\s+TABLE/i, message: 'DROP TABLE detected - potential data loss' },
      { pattern: /DROP\s+COLUMN/i, message: 'DROP COLUMN detected - potential data loss' },
      { pattern: /DELETE\s+FROM/i, message: 'DELETE FROM detected - potential data loss' },
      { pattern: /TRUNCATE/i, message: 'TRUNCATE detected - potential data loss' },
      { pattern: /ALTER\s+TABLE.*DROP/i, message: 'ALTER TABLE DROP detected - potential data loss' }
    ]
    
    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(sql)) {
        if (this.strictMode) {
          errors.push({
            code: 'DANGEROUS_OPERATION',
            message,
            migration_id: migrationId,
            context: { direction, operation: pattern.source },
            severity: 'high'
          })
        } else {
          warnings.push({
            code: 'DANGEROUS_OPERATION',
            message,
            migration_id: migrationId,
            recommendation: 'Ensure this operation is intentional and consider backup requirements'
          })
        }
      }
    }
    
    // Check for SQLite-specific limitations
    const sqliteLimitations = [
      { 
        pattern: /ALTER\s+TABLE.*ADD\s+COLUMN.*NOT\s+NULL(?!\s+DEFAULT)/i, 
        message: 'Adding NOT NULL column without DEFAULT - will fail on existing data' 
      },
      { 
        pattern: /ALTER\s+TABLE.*RENAME\s+COLUMN/i, 
        message: 'RENAME COLUMN requires SQLite 3.25+ - check compatibility' 
      },
      { 
        pattern: /ALTER\s+TABLE.*DROP\s+COLUMN/i, 
        message: 'DROP COLUMN requires SQLite 3.35+ - check compatibility' 
      }
    ]
    
    for (const { pattern, message } of sqliteLimitations) {
      if (pattern.test(sql)) {
        warnings.push({
          code: 'SQLITE_COMPATIBILITY',
          message,
          migration_id: migrationId,
          recommendation: 'Verify SQLite version compatibility'
        })
      }
    }
    
    // Check for transaction handling
    if (!sql.includes('BEGIN') && !sql.includes('COMMIT') && sql.includes(';')) {
      warnings.push({
        code: 'NO_EXPLICIT_TRANSACTION',
        message: 'Migration does not use explicit transactions',
        migration_id: migrationId,
        recommendation: 'Consider wrapping in BEGIN/COMMIT for atomicity'
      })
    }
    
    return { errors, warnings }
  }
  
  /**
   * Validate schema changes for potential issues
   */
  private async validateSchemaChanges(migration: Migration): Promise<{ errors: MigrationValidationError[], warnings: MigrationValidationWarning[] }> {
    const errors: MigrationValidationError[] = []
    const warnings: MigrationValidationWarning[] = []
    
    // TODO: Implement schema change analysis
    // This would involve parsing the SQL to understand what changes are being made
    // For now, we'll do basic pattern matching
    
    if (typeof migration.up === 'string') {
      const sql = migration.up.toLowerCase()
      
      // Check for foreign key changes
      if (sql.includes('foreign key') || sql.includes('references')) {
        warnings.push({
          code: 'FOREIGN_KEY_CHANGES',
          message: 'Migration involves foreign key changes',
          migration_id: migration.id,
          recommendation: 'Ensure referential integrity is maintained'
        })
      }
      
      // Check for index operations
      if (sql.includes('create index') || sql.includes('drop index')) {
        warnings.push({
          code: 'INDEX_CHANGES',
          message: 'Migration involves index changes',
          migration_id: migration.id,
          recommendation: 'Consider impact on query performance'
        })
      }
      
      // Check for trigger operations
      if (sql.includes('create trigger') || sql.includes('drop trigger')) {
        warnings.push({
          code: 'TRIGGER_CHANGES',
          message: 'Migration involves trigger changes',
          migration_id: migration.id,
          recommendation: 'Ensure trigger logic is correct and test thoroughly'
        })
      }
    }
    
    return { errors, warnings }
  }
  
  /**
   * Validate migration dependencies
   */
  private validateDependencies(migrations: Migration[]): { 
    errors: MigrationValidationError[], 
    warnings: MigrationValidationWarning[],
    dependency_check: DependencyValidation 
  } {
    const errors: MigrationValidationError[] = []
    const warnings: MigrationValidationWarning[] = []
    
    const migrationMap = new Map(migrations.map(m => [m.id, m]))
    const missingDependencies: string[] = []
    const circularDependencies: string[][] = []
    
    // Check for missing dependencies
    for (const migration of migrations) {
      for (const depId of migration.dependencies) {
        if (!migrationMap.has(depId)) {
          missingDependencies.push(depId)
          errors.push({
            code: 'MISSING_DEPENDENCY',
            message: `Migration ${migration.id} depends on missing migration: ${depId}`,
            migration_id: migration.id,
            context: { missing_dependency: depId },
            severity: 'critical'
          })
        }
      }
    }
    
    // Check for circular dependencies using DFS
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    
    const findCircularDependency = (migrationId: string, path: string[]): string[] | null => {
      if (recursionStack.has(migrationId)) {
        const cycleStart = path.indexOf(migrationId)
        return path.slice(cycleStart).concat(migrationId)
      }
      
      if (visited.has(migrationId)) {
        return null
      }
      
      visited.add(migrationId)
      recursionStack.add(migrationId)
      
      const migration = migrationMap.get(migrationId)
      if (migration) {
        for (const depId of migration.dependencies) {
          if (migrationMap.has(depId)) {
            const cycle = findCircularDependency(depId, [...path, migrationId])
            if (cycle) {
              return cycle
            }
          }
        }
      }
      
      recursionStack.delete(migrationId)
      return null
    }
    
    for (const migration of migrations) {
      if (!visited.has(migration.id)) {
        const cycle = findCircularDependency(migration.id, [])
        if (cycle) {
          circularDependencies.push(cycle)
          errors.push({
            code: 'CIRCULAR_DEPENDENCY',
            message: `Circular dependency detected: ${cycle.join(' -> ')}`,
            migration_id: migration.id,
            context: { cycle },
            severity: 'critical'
          })
        }
      }
    }
    
    // Create execution order (topological sort)
    const executionOrder = this.topologicalSort(migrations)
    
    return {
      errors,
      warnings,
      dependency_check: {
        is_valid: errors.length === 0,
        circular_dependencies: circularDependencies,
        missing_dependencies: missingDependencies,
        execution_order: executionOrder
      }
    }
  }
  
  /**
   * Topological sort for migration execution order
   */
  private topologicalSort(migrations: Migration[]): string[] {
    const migrationMap = new Map(migrations.map(m => [m.id, m]))
    const visited = new Set<string>()
    const result: string[] = []
    
    const visit = (migrationId: string) => {
      if (visited.has(migrationId)) return
      
      const migration = migrationMap.get(migrationId)
      if (!migration) return
      
      // Visit dependencies first
      for (const depId of migration.dependencies) {
        if (migrationMap.has(depId)) {
          visit(depId)
        }
      }
      
      visited.add(migrationId)
      result.push(migrationId)
    }
    
    for (const migration of migrations) {
      visit(migration.id)
    }
    
    return result
  }
  
  /**
   * Analyze rollback safety
   */
  private async analyzeRollbackSafety(
    migrations: Migration[], 
    direction: 'up' | 'down'
  ): Promise<{ 
    errors: MigrationValidationError[], 
    warnings: MigrationValidationWarning[],
    rollback_safety: RollbackSafetyAnalysis 
  }> {
    const errors: MigrationValidationError[] = []
    const warnings: MigrationValidationWarning[] = []
    const nonReversibleMigrations: string[] = []
    const dataLossRisks: DataLossRisk[] = []
    
    for (const migration of migrations) {
      // Check if migration supports rollback
      if (!migration.down) {
        nonReversibleMigrations.push(migration.id)
        if (direction === 'up') {
          warnings.push({
            code: 'NON_REVERSIBLE_MIGRATION',
            message: `Migration ${migration.id} cannot be rolled back`,
            migration_id: migration.id,
            recommendation: 'Consider adding rollback script if possible'
          })
        }
      }
      
      // Analyze data loss risks
      const risks = await this.analyzeDataLossRisks(migration)
      dataLossRisks.push(...risks)
      
      for (const risk of risks) {
        if (risk.risk_level === 'critical' || risk.risk_level === 'high') {
          if (this.strictMode) {
            errors.push({
              code: 'HIGH_DATA_LOSS_RISK',
              message: risk.description,
              migration_id: migration.id,
              context: { risk_level: risk.risk_level, affected_objects: risk.affected_objects },
              severity: risk.risk_level === 'critical' ? 'critical' : 'high'
            })
          } else {
            warnings.push({
              code: 'DATA_LOSS_RISK',
              message: risk.description,
              migration_id: migration.id,
              recommendation: risk.mitigation_strategies.join('; ')
            })
          }
        }
      }
    }
    
    const backupRequired = migrations.some(m => m.requires_backup) || dataLossRisks.some(r => r.risk_level === 'critical')
    
    return {
      errors,
      warnings,
      rollback_safety: {
        is_safe: nonReversibleMigrations.length === 0 && dataLossRisks.every(r => r.risk_level !== 'critical'),
        non_reversible_migrations: nonReversibleMigrations,
        data_loss_risks: dataLossRisks,
        backup_required: backupRequired
      }
    }
  }
  
  /**
   * Analyze data loss risks for a migration
   */
  private async analyzeDataLossRisks(migration: Migration): Promise<DataLossRisk[]> {
    const risks: DataLossRisk[] = []
    
    if (typeof migration.up === 'string') {
      const sql = migration.up.toLowerCase()
      
      // Check for table drops
      if (sql.includes('drop table')) {
        risks.push({
          migration_id: migration.id,
          risk_level: 'critical',
          description: 'Migration drops tables - all data in those tables will be lost',
          affected_objects: this.extractTableNames(migration.up, 'drop table'),
          mitigation_strategies: [
            'Create backup before migration',
            'Export critical data separately',
            'Consider archive table instead of drop'
          ]
        })
      }
      
      // Check for column drops
      if (sql.includes('drop column')) {
        risks.push({
          migration_id: migration.id,
          risk_level: 'high',
          description: 'Migration drops columns - data in those columns will be lost',
          affected_objects: this.extractColumnNames(migration.up, 'drop column'),
          mitigation_strategies: [
            'Export column data before migration',
            'Create backup table with dropped columns',
            'Verify column is truly unused'
          ]
        })
      }
      
      // Check for data modifications
      if (sql.includes('delete from') || sql.includes('truncate')) {
        risks.push({
          migration_id: migration.id,
          risk_level: 'high',
          description: 'Migration deletes data from tables',
          affected_objects: this.extractTableNames(migration.up, 'delete from|truncate'),
          mitigation_strategies: [
            'Create backup before migration',
            'Use WHERE clauses to limit deletion scope',
            'Consider soft delete instead'
          ]
        })
      }
    }
    
    return risks
  }
  
  /**
   * Extract table names from SQL operations
   */
  private extractTableNames(sql: string, operation: string): string[] {
    const pattern = new RegExp(`${operation}\\s+(?:table\\s+)?([a-zA-Z_][a-zA-Z0-9_]*)`, 'gi')
    const matches = []
    let match
    
    while ((match = pattern.exec(sql)) !== null) {
      matches.push(match[1])
    }
    
    return matches
  }
  
  /**
   * Extract column names from SQL operations
   */
  private extractColumnNames(sql: string, operation: string): string[] {
    const pattern = new RegExp(`${operation}\\s+([a-zA-Z_][a-zA-Z0-9_]*)`, 'gi')
    const matches = []
    let match
    
    while ((match = pattern.exec(sql)) !== null) {
      matches.push(match[1])
    }
    
    return matches
  }
  
  /**
   * Validate version progression
   */
  private validateVersionProgression(
    fromVersion: SemanticVersion, 
    toVersion: SemanticVersion, 
    direction: 'up' | 'down'
  ): { errors: MigrationValidationError[], warnings: MigrationValidationWarning[] } {
    const errors: MigrationValidationError[] = []
    const warnings: MigrationValidationWarning[] = []
    
    const comparison = compareSemanticVersions(fromVersion, toVersion)
    
    if (direction === 'up' && comparison >= 0) {
      errors.push({
        code: 'INVALID_VERSION_PROGRESSION',
        message: `Cannot upgrade from ${formatSemanticVersion(fromVersion)} to ${formatSemanticVersion(toVersion)} - target version must be higher`,
        severity: 'critical',
        context: { from_version: formatSemanticVersion(fromVersion), to_version: formatSemanticVersion(toVersion) }
      })
    }
    
    if (direction === 'down' && comparison <= 0) {
      errors.push({
        code: 'INVALID_VERSION_PROGRESSION',
        message: `Cannot downgrade from ${formatSemanticVersion(fromVersion)} to ${formatSemanticVersion(toVersion)} - target version must be lower`,
        severity: 'critical',
        context: { from_version: formatSemanticVersion(fromVersion), to_version: formatSemanticVersion(toVersion) }
      })
    }
    
    // Check for major version changes
    if (Math.abs(toVersion.major - fromVersion.major) > 1) {
      warnings.push({
        code: 'MAJOR_VERSION_SKIP',
        message: `Skipping major versions from ${formatSemanticVersion(fromVersion)} to ${formatSemanticVersion(toVersion)}`,
        recommendation: 'Consider migrating through intermediate major versions for safety'
      })
    }
    
    return { errors, warnings }
  }
}

// =============================================================================
// Validation Utilities
// =============================================================================

/**
 * Quick validation function for single migration
 */
export async function validateMigration(migration: Migration, strictMode: boolean = true): Promise<MigrationPlanValidation> {
  const validator = new MigrationValidator(strictMode)
  const result = await validator.validateMigration(migration)
  
  return {
    is_valid: result.errors.length === 0,
    errors: result.errors,
    warnings: result.warnings,
    dependency_check: { is_valid: true, circular_dependencies: [], missing_dependencies: [], execution_order: [] },
    rollback_safety: { is_safe: true, non_reversible_migrations: [], data_loss_risks: [], backup_required: false }
  }
}

/**
 * Quick validation function for migration plans
 */
export async function validatePlan(plan: MigrationPlan, strictMode: boolean = true): Promise<MigrationPlanValidation> {
  const validator = new MigrationValidator(strictMode)
  return validator.validateMigrationPlan(plan)
}

export { MigrationValidator as default }