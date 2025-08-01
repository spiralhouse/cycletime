/**
 * JCVD Migration Engine
 * Core orchestration system for database schema migrations
 */

import {
  Migration,
  MigrationDirection,
  MigrationMode,
  MigrationContext,
  MigrationPlan,
  MigrationResult,
  MigrationRecord,
  MigrationEngineConfig,
  MigrationHooks,
  MigrationEvent,
  MigrationEventType,
  MigrationLogger,
  SemanticVersion,
  SchemaSnapshot
} from './migration-types'

import {
  SchemaVersioning,
  parseSemanticVersion,
  formatSemanticVersion,
  compareSemanticVersions,
  isVersionGreater
} from './schema-versioning'

// =============================================================================
// Migration Engine Core
// =============================================================================

export class MigrationEngine {
  private config: MigrationEngineConfig
  private hooks: MigrationHooks
  private logger: MigrationLogger
  private db: any // TODO: Type this with proper DB abstraction
  
  constructor(
    config: MigrationEngineConfig,
    hooks: MigrationHooks = {},
    logger?: MigrationLogger
  ) {
    this.config = config
    this.hooks = hooks
    this.logger = logger || new DefaultMigrationLogger()
    
    // Initialize database connection
    this.initializeDatabase()
  }
  
  /**
   * Initialize database connection and ensure migration tables exist
   */
  private async initializeDatabase(): Promise<void> {
    // TODO: Initialize database connection based on config
    // TODO: Ensure migration system tables exist
    this.logger.debug('Migration engine initialized', { config: this.config })
  }
  
  /**
   * Get current schema version
   */
  async getCurrentVersion(): Promise<SemanticVersion> {
    try {
      // Query the schema_versions table for current version
      const result = await this.db.query(`
        SELECT version FROM schema_versions 
        WHERE is_current = TRUE 
        LIMIT 1
      `)
      
      if (result.length === 0) {
        throw new Error('No current schema version found')
      }
      
      return parseSemanticVersion(result[0].version)
    } catch (error) {
      this.logger.error('Failed to get current schema version', error)
      throw error
    }
  }
  
  /**
   * Load all available migrations from configured directories
   */
  async loadMigrations(): Promise<Migration[]> {
    const migrations: Migration[] = []
    
    for (const directory of this.config.migration_directories) {
      const directoryMigrations = await this.loadMigrationsFromDirectory(directory)
      migrations.push(...directoryMigrations)
    }
    
    // Sort migrations by version
    migrations.sort((a, b) => compareSemanticVersions(a.version, b.version))
    
    this.logger.info(`Loaded ${migrations.length} migrations`, { 
      directories: this.config.migration_directories 
    })
    
    return migrations
  }
  
  /**
   * Load migrations from a specific directory
   */
  private async loadMigrationsFromDirectory(directory: string): Promise<Migration[]> {
    // TODO: Implement file system scanning for migration files
    // TODO: Support both .sql and .ts/.js migration files
    // TODO: Parse migration metadata from file headers or exports
    
    this.logger.debug('Loading migrations from directory', { directory })
    
    // Placeholder implementation
    return []
  }
  
  /**
   * Create a migration plan to move from current version to target version
   */
  async createMigrationPlan(
    targetVersion: SemanticVersion,
    direction: MigrationDirection = 'up'
  ): Promise<MigrationPlan> {
    const currentVersion = await this.getCurrentVersion()
    const allMigrations = await this.loadMigrations()
    
    // Emit plan creation event
    await this.emitEvent('plan_created', {
      from_version: formatSemanticVersion(currentVersion),
      to_version: formatSemanticVersion(targetVersion),
      direction
    })
    
    // Execute hook if configured
    const planContext = this.createMigrationContext(null, direction, 'normal', currentVersion, targetVersion)
    await this.hooks.beforePlanCreate?.(
      { type: 'plan_created', timestamp: new Date(), data: {}, source: 'migration_engine' },
      planContext
    )
    
    const plan = this.buildMigrationPlan(currentVersion, targetVersion, allMigrations, direction)
    
    // Validate the plan
    plan.validation_results = await this.validateMigrationPlan(plan)
    
    // Execute hook if configured
    await this.hooks.afterPlanCreate?.(
      { type: 'plan_created', timestamp: new Date(), data: { plan }, source: 'migration_engine' },
      planContext
    )
    
    return plan
  }
  
  /**
   * Build migration plan with proper dependency ordering
   */
  private buildMigrationPlan(
    fromVersion: SemanticVersion,
    toVersion: SemanticVersion,
    allMigrations: Migration[],
    direction: MigrationDirection
  ): MigrationPlan {
    let planMigrations: Migration[]
    
    if (direction === 'up') {
      // Select migrations between current and target version
      planMigrations = allMigrations.filter(migration => 
        isVersionGreater(migration.version, fromVersion) &&
        compareSemanticVersions(migration.version, toVersion) <= 0
      )
    } else {
      // Select migrations to rollback (in reverse order)
      planMigrations = allMigrations
        .filter(migration => 
          isVersionGreater(migration.version, toVersion) &&
          compareSemanticVersions(migration.version, fromVersion) <= 0
        )
        .reverse()
    }
    
    // Resolve dependencies and create execution order
    const orderedMigrations = this.resolveMigrationDependencies(planMigrations, direction)
    
    // Calculate estimated duration
    const estimatedDuration = orderedMigrations.reduce(
      (total, migration) => total + (migration.estimated_duration || 1000),
      0
    )
    
    return {
      id: `plan_${Date.now()}`,
      from_version: fromVersion,
      to_version: toVersion,
      migrations: orderedMigrations,
      direction,
      estimated_duration: estimatedDuration,
      validation_results: {
        is_valid: true,
        errors: [],
        warnings: [],
        dependency_check: { is_valid: true, circular_dependencies: [], missing_dependencies: [], execution_order: [] },
        rollback_safety: { is_safe: true, non_reversible_migrations: [], data_loss_risks: [], backup_required: false }
      },
      created_at: new Date()
    }
  }
  
  /**
   * Resolve migration dependencies and create proper execution order
   */
  private resolveMigrationDependencies(
    migrations: Migration[],
    direction: MigrationDirection
  ): Migration[] {
    const migrationMap = new Map(migrations.map(m => [m.id, m]))
    const visited = new Set<string>()
    const visiting = new Set<string>()
    const ordered: Migration[] = []
    
    const visit = (migrationId: string) => {
      if (visited.has(migrationId)) return
      if (visiting.has(migrationId)) {
        throw new Error(`Circular dependency detected involving migration: ${migrationId}`)
      }
      
      visiting.add(migrationId)
      const migration = migrationMap.get(migrationId)
      
      if (!migration) {
        throw new Error(`Migration not found: ${migrationId}`)
      }
      
      // Visit dependencies first (for forward migrations)
      if (direction === 'up') {
        for (const depId of migration.dependencies) {
          if (migrationMap.has(depId)) {
            visit(depId)
          }
        }
      }
      
      visiting.delete(migrationId)
      visited.add(migrationId)
      ordered.push(migration)
    }
    
    // Visit all migrations
    for (const migration of migrations) {
      visit(migration.id)
    }
    
    // For rollback, reverse the order
    return direction === 'down' ? ordered.reverse() : ordered
  }
  
  /**
   * Validate a migration plan
   */
  private async validateMigrationPlan(plan: MigrationPlan) {
    // TODO: Implement comprehensive validation
    // - Check for missing dependencies
    // - Validate migration scripts
    // - Check for potential data loss
    // - Verify rollback safety
    
    return {
      is_valid: true,
      errors: [],
      warnings: [],
      dependency_check: { 
        is_valid: true, 
        circular_dependencies: [], 
        missing_dependencies: [], 
        execution_order: plan.migrations.map(m => m.id) 
      },
      rollback_safety: { 
        is_safe: true, 
        non_reversible_migrations: [], 
        data_loss_risks: [], 
        backup_required: plan.migrations.some(m => m.requires_backup) 
      }
    }
  }
  
  /**
   * Execute a migration plan
   */
  async executePlan(
    plan: MigrationPlan,
    mode: MigrationMode = 'normal'
  ): Promise<MigrationResult> {
    if (!plan.validation_results.is_valid) {
      throw new Error(`Cannot execute invalid migration plan: ${plan.validation_results.errors.map(e => e.message).join(', ')}`)
    }
    
    this.logger.info(`Executing migration plan: ${plan.id}`, {
      from_version: formatSemanticVersion(plan.from_version),
      to_version: formatSemanticVersion(plan.to_version),
      direction: plan.direction,
      mode,
      migration_count: plan.migrations.length
    })
    
    const startTime = Date.now()
    const executedMigrations: string[] = []
    const migrationRecords: MigrationRecord[] = []
    const errors: any[] = []
    const warnings: any[] = []
    
    // Create backup if required and not in dry-run mode
    if (plan.validation_results.rollback_safety.backup_required && mode !== 'dry_run') {
      await this.createBackup(`pre_migration_${plan.id}`)
    }
    
    // Execute migrations in order
    for (const migration of plan.migrations) {
      try {
        const migrationResult = await this.executeMigration(migration, plan.direction, mode)
        executedMigrations.push(migration.id)
        migrationRecords.push(migrationResult)
        
        if (mode === 'dry_run') {
          this.logger.info(`[DRY RUN] Would execute migration: ${migration.id}`)
        }
      } catch (error) {
        this.logger.error(`Migration failed: ${migration.id}`, error)
        errors.push({
          code: 'MIGRATION_EXECUTION_FAILED',
          message: `Migration ${migration.id} failed: ${error.message}`,
          migration_id: migration.id,
          context: { error: error.message },
          severity: 'critical' as const
        })
        
        // Stop execution on first error (unless in force mode)
        if (mode !== 'force') {
          break
        }
      }
    }
    
    const endTime = Date.now()
    const totalDuration = endTime - startTime
    
    // Update current version if all migrations succeeded
    let finalVersion = plan.from_version
    if (errors.length === 0 && mode !== 'dry_run') {
      finalVersion = plan.to_version
      await this.updateCurrentVersion(finalVersion)
    }
    
    const result: MigrationResult = {
      success: errors.length === 0,
      executed_migrations: executedMigrations,
      final_version: finalVersion,
      total_duration: totalDuration,
      errors,
      warnings,
      migration_records: migrationRecords
    }
    
    this.logger.info(`Migration plan execution completed`, {
      success: result.success,
      executed_count: executedMigrations.length,
      total_duration: totalDuration,
      final_version: formatSemanticVersion(finalVersion)
    })
    
    return result
  }
  
  /**
   * Execute a single migration
   */
  private async executeMigration(
    migration: Migration,
    direction: MigrationDirection,
    mode: MigrationMode
  ): Promise<MigrationRecord> {
    const context = this.createMigrationContext(migration, direction, mode, await this.getCurrentVersion(), migration.version)
    
    // Execute before migration hook
    await this.hooks.beforeMigration?.(
      { type: 'migration_started', timestamp: new Date(), data: { migration }, source: 'migration_engine' },
      context
    )
    
    const startTime = Date.now()
    let status: MigrationRecord['status'] = 'completed'
    let errorMessage: string | undefined
    let errorStack: string | undefined
    
    try {
      await this.emitEvent('migration_started', { migration_id: migration.id, direction, mode })
      
      if (mode !== 'dry_run') {
        // Execute the actual migration
        if (direction === 'up') {
          await this.executeMigrationScript(migration.up, context)
        } else {
          if (!migration.down) {
            throw new Error(`Migration ${migration.id} does not support rollback`)
          }
          await this.executeMigrationScript(migration.down, context)
        }
        
        // Run validation if provided
        if (migration.validate) {
          const isValid = await migration.validate(context)
          if (!isValid) {
            throw new Error(`Migration validation failed for ${migration.id}`)
          }
        }
      }
      
      await this.emitEvent('migration_completed', { migration_id: migration.id, direction, mode })
      
      // Execute after migration hook
      await this.hooks.afterMigration?.(
        { type: 'migration_completed', timestamp: new Date(), data: { migration }, source: 'migration_engine' },
        context
      )
    } catch (error) {
      status = 'failed'
      errorMessage = error.message
      errorStack = error.stack
      
      await this.emitEvent('migration_failed', { 
        migration_id: migration.id, 
        direction, 
        mode, 
        error: error.message 
      })
      
      // Execute failure hook
      await this.hooks.onMigrationFailure?.(
        { type: 'migration_failed', timestamp: new Date(), data: { migration, error }, source: 'migration_engine' },
        context
      )
      
      throw error
    }
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    // Create migration record
    const record: MigrationRecord = {
      migration_id: migration.id,
      version: formatSemanticVersion(migration.version),
      name: migration.name,
      type: migration.type,
      status,
      direction,
      mode,
      started_at: new Date(startTime),
      completed_at: new Date(endTime),
      duration,
      error_message: errorMessage,
      error_stack: errorStack,
      checksum: this.calculateMigrationChecksum(migration),
      applied_by: 'migration_engine' // TODO: Get from context
    }
    
    // Save record to database (unless dry run)
    if (mode !== 'dry_run') {
      await this.saveMigrationRecord(record)
    }
    
    return record
  }
  
  /**
   * Execute migration script (SQL or function)
   */
  private async executeMigrationScript(script: string | Function, context: MigrationContext): Promise<void> {
    if (typeof script === 'string') {
      // Execute SQL migration
      await this.db.exec(script)
    } else {
      // Execute programmatic migration
      await script(context)
    }
  }
  
  /**
   * Calculate checksum/fingerprint for a migration
   */
  private calculateMigrationChecksum(migration: Migration): string {
    // Simple checksum calculation (use crypto hash in production)
    const content = JSON.stringify({
      id: migration.id,
      version: formatSemanticVersion(migration.version),
      up: typeof migration.up === 'string' ? migration.up : migration.up.toString(),
      down: typeof migration.down === 'string' ? migration.down : migration.down?.toString()
    })
    
    return SchemaVersioning.generateFingerprint(content)
  }
  
  /**
   * Save migration record to database
   */
  private async saveMigrationRecord(record: MigrationRecord): Promise<void> {
    // TODO: Insert record into schema_migrations table
    this.logger.debug('Saving migration record', { migration_id: record.migration_id })
  }
  
  /**
   * Update current schema version
   */
  private async updateCurrentVersion(version: SemanticVersion): Promise<void> {
    const versionString = formatSemanticVersion(version)
    
    // TODO: Update schema_versions table
    this.logger.info(`Updated current schema version to ${versionString}`)
  }
  
  /**
   * Create backup before migration
   */
  private async createBackup(backupId: string): Promise<SchemaSnapshot> {
    // TODO: Create database backup/snapshot
    this.logger.info(`Creating backup: ${backupId}`)
    
    const snapshot: SchemaSnapshot = {
      id: backupId,
      version: formatSemanticVersion(await this.getCurrentVersion()),
      schema_ddl: '', // TODO: Extract current schema DDL
      description: `Backup created before migration execution`,
      size_bytes: 0,
      checksum: '',
      created_at: new Date()
    }
    
    return snapshot
  }
  
  /**
   * Create migration context for execution
   */
  private createMigrationContext(
    migration: Migration | null,
    direction: MigrationDirection,
    mode: MigrationMode,
    currentVersion: SemanticVersion,
    targetVersion: SemanticVersion,
    metadata: Record<string, any> = {}
  ): MigrationContext {
    return {
      db: this.db,
      migration: migration as Migration,
      direction,
      mode,
      logger: this.logger,
      currentVersion,
      targetVersion,
      metadata
    }
  }
  
  /**
   * Emit migration event
   */
  private async emitEvent(type: MigrationEventType, data: Record<string, any>): Promise<void> {
    const event: MigrationEvent = {
      type,
      timestamp: new Date(),
      data,
      source: 'migration_engine'
    }
    
    this.logger.debug(`Migration event: ${type}`, data)
  }
  
  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(targetVersion: SemanticVersion): Promise<MigrationResult> {
    const plan = await this.createMigrationPlan(targetVersion, 'down')
    return this.executePlan(plan, 'normal')
  }
  
  /**
   * Get migration history
   */
  async getMigrationHistory(): Promise<MigrationRecord[]> {
    // TODO: Query schema_migrations table
    return []
  }
  
  /**
   * Get applied migrations
   */
  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    return (await this.getMigrationHistory()).filter(record => record.status === 'completed')
  }
  
  /**
   * Check if migration is applied
   */
  async isMigrationApplied(migrationId: string): Promise<boolean> {
    const applied = await this.getAppliedMigrations()
    return applied.some(record => record.migration_id === migrationId)
  }
}

// =============================================================================
// Default Migration Logger
// =============================================================================

class DefaultMigrationLogger implements MigrationLogger {
  info(message: string, context?: Record<string, any>): void {
    console.log(`[INFO] ${message}`, context ? JSON.stringify(context, null, 2) : '')
  }
  
  warn(message: string, context?: Record<string, any>): void {
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(context, null, 2) : '')
  }
  
  error(message: string, error?: Error, context?: Record<string, any>): void {
    console.error(`[ERROR] ${message}`, error?.message || '', context ? JSON.stringify(context, null, 2) : '')
    if (error?.stack) {
      console.error(error.stack)
    }
  }
  
  debug(message: string, context?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, context ? JSON.stringify(context, null, 2) : '')
    }
  }
}

// =============================================================================
// Migration Engine Factory
// =============================================================================

export interface MigrationEngineFactory {
  create(config: MigrationEngineConfig, hooks?: MigrationHooks): Promise<MigrationEngine>
}

export class DefaultMigrationEngineFactory implements MigrationEngineFactory {
  async create(config: MigrationEngineConfig, hooks: MigrationHooks = {}): Promise<MigrationEngine> {
    return new MigrationEngine(config, hooks)
  }
}

export { MigrationEngine as default }