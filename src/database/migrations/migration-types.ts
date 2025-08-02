/**
 * JCVD Migration System Types
 * Comprehensive type definitions for the schema migration system
 */

// =============================================================================
// Core Migration Types
// =============================================================================

/**
 * Migration execution direction
 */
export type MigrationDirection = 'up' | 'down';

/**
 * Migration types supporting different patterns
 */
export type MigrationType = 'schema' | 'data' | 'hotfix' | 'rollback';

/**
 * Migration execution status
 */
export type MigrationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';

/**
 * Migration execution mode
 */
export type MigrationMode = 'normal' | 'dry_run' | 'force';

/**
 * Semantic version for schema versioning
 */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

/**
 * Core migration definition
 */
export interface Migration {
  /** Migration identifier (e.g., "003_migration_system") */
  id: string;

  /** Semantic version this migration targets */
  version: SemanticVersion;

  /** Human-readable migration name */
  name: string;

  /** Migration type */
  type: MigrationType;

  /** Migration description */
  description: string;

  /** Dependencies - migrations that must be applied first */
  dependencies: string[];

  /** Forward migration SQL or function */
  up: string | MigrationFunction;

  /** Rollback migration SQL or function (optional) */
  down?: string | MigrationFunction;

  /** Validation function to check migration success */
  validate?: MigrationValidationFunction;

  /** Creation timestamp */
  created_at: Date;

  /** Author/source of the migration */
  author?: string;

  /** Estimated execution time in ms */
  estimated_duration?: number;

  /** Whether this migration requires a backup before execution */
  requires_backup?: boolean;

  /** Whether this migration is reversible */
  reversible?: boolean;
}

/**
 * Programmatic migration function signature
 */
export type MigrationFunction = (context: MigrationContext) => Promise<void> | void;

/**
 * Migration validation function signature
 */
export type MigrationValidationFunction = (context: MigrationContext) => Promise<boolean> | boolean;

/**
 * Migration execution context
 */
export interface MigrationContext {
  /** Database connection/transaction */
  db: any; // TODO: Type this properly once we have DB abstraction

  /** Migration being executed */
  migration: Migration;

  /** Execution direction */
  direction: MigrationDirection;

  /** Execution mode */
  mode: MigrationMode;

  /** Logger for migration output */
  logger: MigrationLogger;

  /** Current schema version before migration */
  currentVersion: SemanticVersion;

  /** Target schema version after migration */
  targetVersion: SemanticVersion;

  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Migration logger interface
 */
export interface MigrationLogger {
  info: (message: string, context?: Record<string, any>) => void;
  warn: (message: string, context?: Record<string, any>) => void;
  error: (message: string, error?: Error, context?: Record<string, any>) => void;
  debug: (message: string, context?: Record<string, any>) => void;
}

// =============================================================================
// Migration History and Tracking
// =============================================================================

/**
 * Migration execution record
 */
export interface MigrationRecord {
  /** Migration ID */
  migration_id: string;

  /** Migration version */
  version: string;

  /** Migration name */
  name: string;

  /** Migration type */
  type: MigrationType;

  /** Execution status */
  status: MigrationStatus;

  /** Execution direction */
  direction: MigrationDirection;

  /** Execution mode */
  mode: MigrationMode;

  /** Execution start time */
  started_at: Date;

  /** Execution completion time */
  completed_at?: Date;

  /** Actual execution duration in ms */
  duration?: number;

  /** Error message if failed */
  error_message: string | null;

  /** Error stack trace if failed */
  error_stack: string | null;

  /** Migration checksum/fingerprint */
  checksum: string;

  /** Migration metadata */
  metadata?: Record<string, any>;

  /** Applied by (user/system identifier) */
  applied_by?: string;
}

/**
 * Schema snapshot for rollback support
 */
export interface SchemaSnapshot {
  /** Snapshot ID */
  id: string;

  /** Schema version at time of snapshot */
  version: string;

  /** Complete schema DDL */
  schema_ddl: string;

  /** Data sample (for critical tables) */
  data_sample?: Record<string, any[]>;

  /** Snapshot creation time */
  created_at: Date;

  /** Snapshot description */
  description: string;

  /** Size of snapshot in bytes */
  size_bytes: number;

  /** Checksum for integrity verification */
  checksum: string;
}

// =============================================================================
// Migration Planning and Validation
// =============================================================================

/**
 * Migration plan - sequence of migrations to execute
 */
export interface MigrationPlan {
  /** Plan ID */
  id: string;

  /** Source version */
  from_version: SemanticVersion;

  /** Target version */
  to_version: SemanticVersion;

  /** Ordered list of migrations to execute */
  migrations: Migration[];

  /** Execution direction */
  direction: MigrationDirection;

  /** Total estimated duration */
  estimated_duration: number;

  /** Validation results */
  validation_results: MigrationPlanValidation;

  /** Created timestamp */
  created_at: Date;
}

/**
 * Migration plan validation results
 */
export interface MigrationPlanValidation {
  /** Overall validation status */
  is_valid: boolean;

  /** Validation errors (blocking) */
  errors: MigrationValidationError[];

  /** Validation warnings (non-blocking) */
  warnings: MigrationValidationWarning[];

  /** Dependency graph validity */
  dependency_check: DependencyValidation;

  /** Rollback safety analysis */
  rollback_safety: RollbackSafetyAnalysis;
}

/**
 * Migration validation error
 */
export interface MigrationValidationError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Migration ID that caused the error */
  migration_id?: string;

  /** Additional context */
  context?: Record<string, any>;

  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Migration validation warning
 */
export interface MigrationValidationWarning {
  /** Warning code */
  code: string;

  /** Warning message */
  message: string;

  /** Migration ID that caused the warning */
  migration_id?: string;

  /** Additional context */
  context?: Record<string, any>;

  /** Recommended action */
  recommendation?: string;
}

/**
 * Dependency validation result
 */
export interface DependencyValidation {
  /** Dependency graph is valid */
  is_valid: boolean;

  /** Circular dependencies detected */
  circular_dependencies: string[][];

  /** Missing dependencies */
  missing_dependencies: string[];

  /** Dependency order */
  execution_order: string[];
}

/**
 * Rollback safety analysis
 */
export interface RollbackSafetyAnalysis {
  /** Overall rollback safety */
  is_safe: boolean;

  /** Migrations without rollback support */
  non_reversible_migrations: string[];

  /** Data loss risks */
  data_loss_risks: DataLossRisk[];

  /** Backup requirements */
  backup_required: boolean;
}

/**
 * Data loss risk assessment
 */
export interface DataLossRisk {
  /** Migration causing the risk */
  migration_id: string;

  /** Risk level */
  risk_level: 'critical' | 'high' | 'medium' | 'low';

  /** Description of the risk */
  description: string;

  /** Affected tables/columns */
  affected_objects: string[];

  /** Mitigation strategies */
  mitigation_strategies: string[];
}

// =============================================================================
// Migration Engine Configuration
// =============================================================================

/**
 * Migration engine configuration
 */
export interface MigrationEngineConfig {
  /** Database connection configuration */
  database: {
    path: string;
    timeout?: number;
    enableWAL?: boolean;
    enableForeignKeys?: boolean;
  };

  /** Migration directories to scan */
  migration_directories: string[];

  /** Maximum migration execution time in ms */
  max_execution_time?: number;

  /** Whether to create backups before migrations */
  auto_backup?: boolean;

  /** Backup directory */
  backup_directory?: string;

  /** Dry run mode by default */
  default_dry_run?: boolean;

  /** Validation strictness */
  validation_mode: 'strict' | 'warn' | 'ignore';

  /** Concurrency settings */
  concurrency?: {
    max_parallel_migrations?: number;
    dependency_parallel?: boolean;
  };

  /** Logging configuration */
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file?: string;
    console?: boolean;
  };
}

// =============================================================================
// Migration Events and Hooks
// =============================================================================

/**
 * Migration event types
 */
export type MigrationEventType =
  | 'migration_started'
  | 'migration_completed'
  | 'migration_failed'
  | 'migration_rolled_back'
  | 'plan_created'
  | 'plan_validated'
  | 'backup_created'
  | 'snapshot_created';

/**
 * Migration event
 */
export interface MigrationEvent {
  /** Event type */
  type: MigrationEventType;

  /** Event timestamp */
  timestamp: Date;

  /** Migration ID (if applicable) */
  migration_id?: string;

  /** Event data */
  data: Record<string, any>;

  /** Event source */
  source: string;
}

/**
 * Migration hook function signature
 */
export type MigrationHook = (
  event: MigrationEvent,
  context: MigrationContext
) => Promise<void> | void;

/**
 * Migration hooks configuration
 */
export interface MigrationHooks {
  /** Before migration plan creation */
  beforePlanCreate?: MigrationHook;

  /** After migration plan creation */
  afterPlanCreate?: MigrationHook;

  /** Before migration execution */
  beforeMigration?: MigrationHook;

  /** After migration execution */
  afterMigration?: MigrationHook;

  /** On migration failure */
  onMigrationFailure?: MigrationHook;

  /** Before rollback */
  beforeRollback?: MigrationHook;

  /** After rollback */
  afterRollback?: MigrationHook;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Migration operation result
 */
export interface MigrationResult {
  /** Operation success status */
  success: boolean;

  /** Executed migrations */
  executed_migrations: string[];

  /** Final schema version */
  final_version: SemanticVersion;

  /** Total execution time */
  total_duration: number;

  /** Any errors that occurred */
  errors: MigrationValidationError[];

  /** Any warnings generated */
  warnings: MigrationValidationWarning[];

  /** Migration records created */
  migration_records: MigrationRecord[];
}

/**
 * Schema comparison result
 */
export interface SchemaComparison {
  /** Schemas are identical */
  identical: boolean;

  /** Added tables */
  added_tables: string[];

  /** Removed tables */
  removed_tables: string[];

  /** Modified tables */
  modified_tables: TableModification[];

  /** Added indexes */
  added_indexes: string[];

  /** Removed indexes */
  removed_indexes: string[];

  /** Added triggers */
  added_triggers: string[];

  /** Removed triggers */
  removed_triggers: string[];
}

/**
 * Table modification details
 */
export interface TableModification {
  /** Table name */
  table_name: string;

  /** Added columns */
  added_columns: ColumnDefinition[];

  /** Removed columns */
  removed_columns: string[];

  /** Modified columns */
  modified_columns: ColumnModification[];

  /** Added constraints */
  added_constraints: string[];

  /** Removed constraints */
  removed_constraints: string[];
}

/**
 * Column definition
 */
export interface ColumnDefinition {
  /** Column name */
  name: string;

  /** Column type */
  type: string;

  /** Nullable */
  nullable: boolean;

  /** Default value */
  default_value: any | null;

  /** Primary key */
  primary_key: boolean;

  /** Foreign key reference */
  foreign_key: string | null;
}

/**
 * Column modification details
 */
export interface ColumnModification {
  /** Column name */
  name: string;

  /** Old definition */
  old_definition: ColumnDefinition;

  /** New definition */
  new_definition: ColumnDefinition;

  /** Type of modification */
  modification_type: 'type_change' | 'nullable_change' | 'default_change' | 'constraint_change';
}
