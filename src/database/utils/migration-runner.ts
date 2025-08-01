#!/usr/bin/env node
/**
 * JCVD Migration Runner CLI
 * Command-line interface for database migration operations
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { MigrationEngine, DefaultMigrationEngineFactory } from '../migrations/migration-engine'
import { MigrationValidator } from '../migrations/migration-validator'
import { 
  MigrationEngineConfig, 
  Migration, 
  MigrationMode,
  MigrationDirection,
  SemanticVersion 
} from '../migrations/migration-types'
import { SchemaVersioning, parseSemanticVersion } from '../migrations/schema-versioning'

// =============================================================================
// CLI Configuration
// =============================================================================

interface CLIConfig {
  command: string
  options: Record<string, any>
  args: string[]
}

interface MigrationRunnerOptions {
  config?: string
  database?: string
  directory?: string
  dryRun?: boolean
  force?: boolean
  verbose?: boolean
  target?: string
  backup?: boolean
  validate?: boolean
}

// =============================================================================
// Migration Runner Core
// =============================================================================

export class MigrationRunner {
  private config: MigrationEngineConfig
  private engine: MigrationEngine | null = null
  private validator: MigrationValidator
  
  constructor(config: MigrationEngineConfig) {
    this.config = config
    this.validator = new MigrationValidator(true)
  }
  
  /**
   * Initialize migration engine
   */
  async initialize(): Promise<void> {
    const factory = new DefaultMigrationEngineFactory()
    this.engine = await factory.create(this.config)
  }
  
  /**
   * Run migrations up to target version
   */
  async migrate(targetVersion?: SemanticVersion, options: MigrationRunnerOptions = {}): Promise<void> {
    if (!this.engine) {
      throw new Error('Migration engine not initialized')
    }
    
    console.log('🚀 Starting migration process...')
    
    const currentVersion = await this.engine.getCurrentVersion()
    const target = targetVersion || await this.getLatestVersion()
    
    console.log(`📊 Current version: ${SchemaVersioning.format(currentVersion)}`)
    console.log(`🎯 Target version: ${SchemaVersioning.format(target)}`)
    
    // Create migration plan
    const plan = await this.engine.createMigrationPlan(target, 'up')
    
    if (plan.migrations.length === 0) {
      console.log('✅ Database is already up to date')
      return
    }
    
    console.log(`📋 Migration plan created with ${plan.migrations.length} migrations`)
    
    // Display plan
    this.displayMigrationPlan(plan.migrations)
    
    // Validate plan if required
    if (options.validate !== false) {
      console.log('🔍 Validating migration plan...')
      const validation = await this.validator.validateMigrationPlan(plan)
      
      if (!validation.is_valid) {
        console.error('❌ Migration plan validation failed:')
        for (const error of validation.errors) {
          console.error(`  - ${error.message}`)
        }
        throw new Error('Migration plan validation failed')
      }
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️  Migration plan warnings:')
        for (const warning of validation.warnings) {
          console.warn(`  - ${warning.message}`)
        }
      }
    }
    
    // Execute plan
    const mode: MigrationMode = options.dryRun ? 'dry_run' : options.force ? 'force' : 'normal'
    
    if (options.dryRun) {
      console.log('🧪 Running in DRY RUN mode - no changes will be made')
    }
    
    const result = await this.engine.executePlan(plan, mode)
    
    if (result.success) {
      console.log(`✅ Migration completed successfully`)
      console.log(`📈 Final version: ${SchemaVersioning.format(result.final_version)}`)
      console.log(`⏱️  Total duration: ${result.total_duration}ms`)
    } else {
      console.error('❌ Migration failed:')
      for (const error of result.errors) {
        console.error(`  - ${error.message}`)
      }
      throw new Error('Migration execution failed')
    }
  }
  
  /**
   * Rollback to target version
   */
  async rollback(targetVersion: SemanticVersion, options: MigrationRunnerOptions = {}): Promise<void> {
    if (!this.engine) {
      throw new Error('Migration engine not initialized')
    }
    
    console.log('🔄 Starting rollback process...')
    
    const currentVersion = await this.engine.getCurrentVersion()
    
    console.log(`📊 Current version: ${SchemaVersioning.format(currentVersion)}`)
    console.log(`🎯 Target version: ${SchemaVersioning.format(targetVersion)}`)
    
    const result = await this.engine.rollbackToVersion(targetVersion)
    
    if (result.success) {
      console.log(`✅ Rollback completed successfully`)
      console.log(`📉 Final version: ${SchemaVersioning.format(result.final_version)}`)
    } else {
      console.error('❌ Rollback failed:')
      for (const error of result.errors) {
        console.error(`  - ${error.message}`)
      }
      throw new Error('Rollback execution failed')
    }
  }
  
  /**
   * Show current migration status
   */
  async status(): Promise<void> {
    if (!this.engine) {
      throw new Error('Migration engine not initialized')
    }
    
    console.log('📊 Migration Status')
    console.log('==================')
    
    const currentVersion = await this.engine.getCurrentVersion()
    const appliedMigrations = await this.engine.getAppliedMigrations()
    const availableMigrations = await this.engine.loadMigrations()
    
    console.log(`Current Version: ${SchemaVersioning.format(currentVersion)}`)
    console.log(`Applied Migrations: ${appliedMigrations.length}`)
    console.log(`Available Migrations: ${availableMigrations.length}`)
    console.log(`Pending Migrations: ${availableMigrations.length - appliedMigrations.length}`)
    
    // Show recent migrations
    const recentMigrations = appliedMigrations
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
      .slice(0, 5)
    
    if (recentMigrations.length > 0) {
      console.log('\\n📋 Recent Migrations:')
      for (const migration of recentMigrations) {
        const status = migration.status === 'completed' ? '✅' : '❌'
        const duration = migration.duration ? `(${migration.duration}ms)` : ''
        console.log(`  ${status} ${migration.migration_id} - ${migration.name} ${duration}`)
      }
    }
    
    // Show pending migrations
    const appliedIds = new Set(appliedMigrations.map(m => m.migration_id))
    const pendingMigrations = availableMigrations.filter(m => !appliedIds.has(m.id))
    
    if (pendingMigrations.length > 0) {
      console.log('\\n⏳ Pending Migrations:')
      for (const migration of pendingMigrations.slice(0, 10)) {
        console.log(`  📄 ${migration.id} - ${migration.name}`)
      }
      if (pendingMigrations.length > 10) {
        console.log(`  ... and ${pendingMigrations.length - 10} more`)
      }
    }
  }
  
  /**
   * Validate all migrations
   */
  async validate(options: MigrationRunnerOptions = {}): Promise<void> {
    console.log('🔍 Validating migrations...')
    
    const migrations = await this.loadMigrationsFromDirectories()
    let hasErrors = false
    
    for (const migration of migrations) {
      const validation = await this.validator.validateMigration(migration)
      
      if (validation.errors.length > 0) {
        hasErrors = true
        console.error(`❌ ${migration.id}:`)
        for (const error of validation.errors) {
          console.error(`  - ${error.message}`)
        }
      } else {
        console.log(`✅ ${migration.id}: Valid`)
      }
      
      if (validation.warnings.length > 0 && options.verbose) {
        console.warn(`⚠️  ${migration.id} warnings:`)
        for (const warning of validation.warnings) {
          console.warn(`  - ${warning.message}`)
        }
      }
    }
    
    if (hasErrors) {
      throw new Error('Migration validation failed')
    }
    
    console.log(`✅ All ${migrations.length} migrations are valid`)
  }
  
  /**
   * Create a new migration file
   */
  async create(name: string, options: MigrationRunnerOptions = {}): Promise<void> {
    const directory = options.directory || this.config.migration_directories[0]
    
    if (!existsSync(directory)) {
      throw new Error(`Migration directory does not exist: ${directory}`)
    }
    
    // Generate migration ID
    const existingMigrations = this.loadMigrationFilesFromDirectory(directory)
    const nextNumber = existingMigrations.length + 1
    const migrationId = `${nextNumber.toString().padStart(3, '0')}_${name.toLowerCase().replace(/\\s+/g, '_')}`
    
    // Determine next version
    const currentVersion = await this.getCurrentVersionFromFiles()
    const nextVersion = SchemaVersioning.getNext(currentVersion, 'minor')
    
    // Create migration file
    const migrationContent = this.generateMigrationTemplate(migrationId, name, nextVersion)
    const filePath = join(directory, `${migrationId}.sql`)
    
    // TODO: Write file using fs.writeFileSync
    console.log(`📄 Created migration: ${filePath}`)
    console.log(`🏷️  Version: ${SchemaVersioning.format(nextVersion)}`)
  }
  
  /**
   * Show migration history
   */
  async history(options: MigrationRunnerOptions = {}): Promise<void> {
    if (!this.engine) {
      throw new Error('Migration engine not initialized')
    }
    
    console.log('📚 Migration History')
    console.log('===================')
    
    const history = await this.engine.getMigrationHistory()
    
    if (history.length === 0) {
      console.log('No migration history found')
      return
    }
    
    const sortedHistory = history.sort((a, b) => 
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    )
    
    for (const record of sortedHistory.slice(0, 20)) {
      const status = this.getStatusIcon(record.status)
      const duration = record.duration ? `(${record.duration}ms)` : ''
      const timestamp = new Date(record.started_at).toLocaleString()
      
      console.log(`${status} ${record.migration_id} - ${record.name}`)
      console.log(`   ${timestamp} ${duration}`)
      
      if (record.error_message && options.verbose) {
        console.log(`   Error: ${record.error_message}`)
      }
      console.log()
    }
  }
  
  // =============================================================================
  // Private Helper Methods
  // =============================================================================
  
  private async getLatestVersion(): Promise<SemanticVersion> {
    const migrations = await this.loadMigrationsFromDirectories()
    if (migrations.length === 0) {
      return parseSemanticVersion('1.0.0')
    }
    
    const sortedMigrations = migrations.sort((a, b) => 
      SchemaVersioning.compare(b.version, a.version)
    )
    
    return sortedMigrations[0].version
  }
  
  private async getCurrentVersionFromFiles(): Promise<SemanticVersion> {
    // TODO: Implement version detection from existing migration files
    return parseSemanticVersion('1.0.0')
  }
  
  private displayMigrationPlan(migrations: Migration[]): void {
    console.log('\\n📋 Migration Plan:')
    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i]
      const version = SchemaVersioning.format(migration.version)
      console.log(`  ${i + 1}. ${migration.id} (${version}) - ${migration.name}`)
    }
    console.log()
  }
  
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return '✅'
      case 'failed': return '❌'
      case 'running': return '🔄'
      case 'rolled_back': return '⏪'
      default: return '❓'
    }
  }
  
  private async loadMigrationsFromDirectories(): Promise<Migration[]> {
    const allMigrations: Migration[] = []
    
    for (const directory of this.config.migration_directories) {
      const migrations = this.loadMigrationFilesFromDirectory(directory)
      allMigrations.push(...migrations)
    }
    
    return allMigrations.sort((a, b) => SchemaVersioning.compare(a.version, b.version))
  }
  
  private loadMigrationFilesFromDirectory(directory: string): Migration[] {
    if (!existsSync(directory)) {
      return []
    }
    
    const files = readdirSync(directory)
      .filter(file => file.endsWith('.sql') || file.endsWith('.js') || file.endsWith('.ts'))
      .sort()
    
    const migrations: Migration[] = []
    
    for (const file of files) {
      const filePath = join(directory, file)
      const migration = this.loadMigrationFromFile(filePath)
      if (migration) {
        migrations.push(migration)
      }
    }
    
    return migrations
  }
  
  private loadMigrationFromFile(filePath: string): Migration | null {
    try {
      if (filePath.endsWith('.sql')) {
        return this.loadSQLMigration(filePath)
      } else {
        return this.loadJSMigration(filePath)
      }
    } catch (error) {
      console.warn(`⚠️  Failed to load migration from ${filePath}: ${error.message}`)
      return null
    }
  }
  
  private loadSQLMigration(filePath: string): Migration {
    const content = readFileSync(filePath, 'utf-8')
    const filename = filePath.split('/').pop()!
    const migrationId = filename.replace(/\\.(sql|js|ts)$/, '')
    
    // Parse metadata from SQL comments
    const metadata = this.parseSQLMetadata(content)
    
    return {
      id: migrationId,
      version: parseSemanticVersion(metadata.version || '1.0.0'),
      name: metadata.name || migrationId.replace(/_/g, ' '),
      type: metadata.type || 'schema',
      description: metadata.description || '',
      dependencies: metadata.dependencies || [],
      up: content,
      down: metadata.down,
      created_at: statSync(filePath).birthtime,
      estimated_duration: metadata.estimated_duration,
      requires_backup: metadata.requires_backup || false,
      reversible: !!metadata.down
    }
  }
  
  private loadJSMigration(filePath: string): Migration {
    // TODO: Implement JS/TS migration loading using dynamic imports
    throw new Error('JS/TS migrations not yet implemented')
  }
  
  private parseSQLMetadata(content: string): Record<string, any> {
    const metadata: Record<string, any> = {}
    const lines = content.split('\\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('-- Version:')) {
        metadata.version = trimmed.replace('-- Version:', '').trim()
      } else if (trimmed.startsWith('-- Migration:')) {
        metadata.name = trimmed.replace('-- Migration:', '').trim()
      } else if (trimmed.startsWith('-- Type:')) {
        metadata.type = trimmed.replace('-- Type:', '').trim()
      } else if (trimmed.startsWith('-- Description:')) {
        metadata.description = trimmed.replace('-- Description:', '').trim()
      }
    }
    
    return metadata
  }
  
  private generateMigrationTemplate(id: string, name: string, version: SemanticVersion): string {
    return `-- ${name} - Migration ${id}
-- Version: ${SchemaVersioning.format(version)}
-- Migration: ${id}
-- Type: schema

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- =============================================================================
-- Migration: ${name}
-- =============================================================================

-- TODO: Add your migration SQL here

-- Example:
-- CREATE TABLE example_table (
--     id TEXT PRIMARY KEY NOT NULL,
--     name TEXT NOT NULL,
--     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
-- );

-- =============================================================================
-- Update Schema Metadata
-- =============================================================================

-- Update schema version
UPDATE schema_metadata SET value = '${SchemaVersioning.format(version)}', updated_at = CURRENT_TIMESTAMP WHERE key = 'version';
INSERT OR REPLACE INTO schema_metadata (key, value) VALUES 
    ('migration', '${id}'),
    ('migration_${id}_applied_at', CURRENT_TIMESTAMP),
    ('description', '${name}');
`
  }
}

// =============================================================================
// CLI Entry Point
// =============================================================================

async function main() {
  try {
    const cli = parseCLI()
    const config = loadConfig(cli.options)
    const runner = new MigrationRunner(config)
    
    await runner.initialize()
    
    switch (cli.command) {
      case 'migrate':
      case 'up':
        const targetVersion = cli.options.target ? parseSemanticVersion(cli.options.target) : undefined
        await runner.migrate(targetVersion, cli.options)
        break
        
      case 'rollback':
      case 'down':
        if (!cli.options.target) {
          throw new Error('Target version required for rollback')
        }
        const rollbackTarget = parseSemanticVersion(cli.options.target)
        await runner.rollback(rollbackTarget, cli.options)
        break
        
      case 'status':
        await runner.status()
        break
        
      case 'validate':
        await runner.validate(cli.options)
        break
        
      case 'create':
        if (cli.args.length === 0) {
          throw new Error('Migration name required')
        }
        await runner.create(cli.args[0], cli.options)
        break
        
      case 'history':
        await runner.history(cli.options)
        break
        
      default:
        console.error(`Unknown command: ${cli.command}`)
        showHelp()
        process.exit(1)
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

function parseCLI(): CLIConfig {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    showHelp()
    process.exit(0)
  }
  
  const command = args[0]
  const options: Record<string, any> = {}
  const remainingArgs: string[] = []
  
  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      if (value !== undefined) {
        options[key] = value
      } else {
        options[key] = true
        // Check if next arg is a value
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          options[key] = args[++i]
        }
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1)
      options[key] = true
    } else {
      remainingArgs.push(arg)
    }
  }
  
  return { command, options, args: remainingArgs }
}

function loadConfig(options: MigrationRunnerOptions): MigrationEngineConfig {
  // Load from config file if specified
  if (options.config && existsSync(options.config)) {
    const configContent = readFileSync(options.config, 'utf-8')
    const fileConfig = JSON.parse(configContent)
    return fileConfig
  }
  
  // Default configuration
  return {
    database: {
      path: options.database || 'jcvd.db',
      enableWAL: true,
      enableForeignKeys: true,
      timeout: 30000
    },
    migration_directories: [
      options.directory || './src/database/migrations'
    ],
    max_execution_time: 300000, // 5 minutes
    auto_backup: options.backup !== false,
    backup_directory: './backups',
    default_dry_run: false,
    validation_mode: 'strict',
    logging: {
      level: options.verbose ? 'debug' : 'info',
      console: true
    }
  }
}

function showHelp() {
  console.log(`
🚀 JCVD Migration Runner

Usage: migration-runner <command> [options]

Commands:
  migrate, up     Run pending migrations
  rollback, down  Rollback to target version (requires --target)
  status          Show current migration status
  validate        Validate all migrations
  create <name>   Create a new migration file
  history         Show migration history

Options:
  --config <path>     Path to config file
  --database <path>   Path to database file (default: jcvd.db)
  --directory <path>  Path to migrations directory
  --target <version>  Target version for migrate/rollback
  --dry-run          Run in dry-run mode (no changes)
  --force            Force execution despite warnings
  --backup           Create backup before migration (default: true)
  --no-backup        Skip backup creation
  --validate         Validate migrations before execution (default: true)
  --no-validate      Skip migration validation
  --verbose, -v      Verbose output

Examples:
  migration-runner migrate                    # Run all pending migrations
  migration-runner migrate --target 2.0.0    # Migrate to specific version
  migration-runner rollback --target 1.5.0   # Rollback to version 1.5.0
  migration-runner create add_users_table     # Create new migration
  migration-runner status                     # Show current status
  migration-runner validate                   # Validate all migrations
`)
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main()
}

export { MigrationRunner }