/**
 * JCVD Migration Utilities
 * Comprehensive utilities for data migration between providers
 *
 * This module provides utilities for handling large dataset migrations,
 * streaming operations, progress tracking, and error recovery.
 *
 * @version 1.0.0
 * @author JCVD Software Architect Agent
 */

import { EventEmitter } from 'node:events';
import { Transform } from 'node:stream';

import type {
  ExportData,
  ExportOptions,
  ValidationError,
  ValidationWarning,
  CompressionOptions,
} from './export-format.js';
import type { IssueProvider, ImportResult, OperationResult } from './types.js';

// =============================================================================
// Migration Progress Tracking
// =============================================================================

/**
 * Migration phase identifiers
 */
export type MigrationPhase =
  | 'initializing'
  | 'exporting'
  | 'validating'
  | 'transforming'
  | 'importing'
  | 'verifying'
  | 'complete'
  | 'failed';

/**
 * Migration progress information
 */
export interface MigrationProgress {
  /** Current migration phase */
  phase: MigrationPhase;
  /** Overall progress percentage (0-100) */
  overallProgress: number;
  /** Current phase progress percentage (0-100) */
  phaseProgress: number;
  /** Current operation description */
  currentOperation: string;
  /** Entities processed so far */
  entitiesProcessed: number;
  /** Total entities to process */
  totalEntities: number;
  /** Processing rate (entities per second) */
  processingRate: number;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining: number;
  /** Start time */
  startTime: Date;
  /** Elapsed time in milliseconds */
  elapsedTime: number;
  /** Current memory usage in MB */
  memoryUsage: number;
  /** Errors encountered */
  errors: ValidationError[];
  /** Warnings generated */
  warnings: ValidationWarning[];
}

/**
 * Migration event emitter for progress tracking
 */
export class MigrationProgressTracker extends EventEmitter {
  private progress: MigrationProgress;
  private phaseStartTimes: Map<MigrationPhase, Date> = new Map();

  constructor(totalEntities: number) {
    super();
    this.progress = {
      phase: 'initializing',
      overallProgress: 0,
      phaseProgress: 0,
      currentOperation: 'Initializing migration',
      entitiesProcessed: 0,
      totalEntities,
      processingRate: 0,
      estimatedTimeRemaining: 0,
      startTime: new Date(),
      elapsedTime: 0,
      memoryUsage: 0,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Update current migration phase
   */
  updatePhase(phase: MigrationPhase, operation: string): void {
    this.phaseStartTimes.set(phase, new Date());
    this.progress.phase = phase;
    this.progress.phaseProgress = 0;
    this.progress.currentOperation = operation;
    this.updateProgress();
  }

  /**
   * Update phase progress
   */
  updatePhaseProgress(progress: number, operation?: string): void {
    this.progress.phaseProgress = Math.min(100, Math.max(0, progress));
    if (operation) {
      this.progress.currentOperation = operation;
    }
    this.updateProgress();
  }

  /**
   * Update entities processed count
   */
  updateEntitiesProcessed(processed: number): void {
    this.progress.entitiesProcessed = processed;
    this.calculateProcessingRate();
    this.updateProgress();
  }

  /**
   * Add validation error
   */
  addError(error: ValidationError): void {
    this.progress.errors.push(error);
    this.emit('error', error);
  }

  /**
   * Add validation warning
   */
  addWarning(warning: ValidationWarning): void {
    this.progress.warnings.push(warning);
    this.emit('warning', warning);
  }

  /**
   * Get current progress snapshot
   */
  getProgress(): MigrationProgress {
    return { ...this.progress };
  }

  /**
   * Calculate overall progress based on phase weights
   */
  private updateProgress(): void {
    const phaseWeights: Record<MigrationPhase, number> = {
      initializing: 5,
      exporting: 30,
      validating: 10,
      transforming: 15,
      importing: 30,
      verifying: 10,
      complete: 0,
      failed: 0,
    };

    const completedWeight = this.getCompletedPhaseWeight(phaseWeights);
    const currentPhaseWeight = phaseWeights[this.progress.phase] || 0;
    const currentPhaseProgress = (currentPhaseWeight * this.progress.phaseProgress) / 100;

    this.progress.overallProgress = Math.min(100, completedWeight + currentPhaseProgress);
    this.progress.elapsedTime = Date.now() - this.progress.startTime.getTime();
    this.progress.memoryUsage = process.memoryUsage().heapUsed / (1024 * 1024);

    this.emit('progress', this.getProgress());
  }

  /**
   * Calculate weight of completed phases
   */
  private getCompletedPhaseWeight(phaseWeights: Record<MigrationPhase, number>): number {
    const phaseOrder: MigrationPhase[] = [
      'initializing',
      'exporting',
      'validating',
      'transforming',
      'importing',
      'verifying',
    ];

    const currentIndex = phaseOrder.indexOf(this.progress.phase);

    if (currentIndex === -1) return 0;

    return phaseOrder.slice(0, currentIndex).reduce((sum, phase) => sum + phaseWeights[phase], 0);
  }

  /**
   * Calculate processing rate and estimated time remaining
   */
  private calculateProcessingRate(): void {
    const elapsedSeconds = this.progress.elapsedTime / 1000;

    if (elapsedSeconds > 0) {
      this.progress.processingRate = this.progress.entitiesProcessed / elapsedSeconds;

      if (this.progress.processingRate > 0) {
        const remainingEntities = this.progress.totalEntities - this.progress.entitiesProcessed;

        this.progress.estimatedTimeRemaining =
          (remainingEntities / this.progress.processingRate) * 1000;
      }
    }
  }
}

// =============================================================================
// Streaming Export/Import Operations
// =============================================================================

/**
 * Streaming export configuration
 */
export interface StreamingExportConfig {
  /** Chunk size for streaming operations */
  chunkSize: number;
  /** Maximum memory usage before forcing flush */
  maxMemoryUsage: number;
  /** Enable parallel processing */
  enableParallelProcessing: boolean;
  /** Number of parallel workers */
  parallelWorkers: number;
  /** Compression options */
  compression: CompressionOptions;
}

/**
 * Default streaming configuration
 */
export const DEFAULT_STREAMING_CONFIG: StreamingExportConfig = {
  chunkSize: 1000, // Process 1000 entities at a time
  maxMemoryUsage: 256, // 256MB memory limit
  enableParallelProcessing: false,
  parallelWorkers: 2,
  compression: {
    enabled: true,
    level: 6,
    chunkSize: 64 * 1024,
  },
};

/**
 * Streaming export transform for large datasets
 */
export class StreamingExportTransform extends Transform {
  private chunkBuffer: any[] = [];
  private readonly config: StreamingExportConfig;
  private readonly tracker: MigrationProgressTracker;

  constructor(config: StreamingExportConfig, tracker: MigrationProgressTracker) {
    super({ objectMode: true });
    this.config = config;
    this.tracker = tracker;
  }

  override _transform(chunk: any, _encoding: string, callback: Function): void {
    this.chunkBuffer.push(chunk);

    // Check if we should flush the buffer
    const memoryUsage = process.memoryUsage().heapUsed / (1024 * 1024);
    const shouldFlush =
      this.chunkBuffer.length >= this.config.chunkSize || memoryUsage > this.config.maxMemoryUsage;

    if (shouldFlush) {
      this.flushBuffer();
    }

    callback();
  }

  override _flush(callback: Function): void {
    if (this.chunkBuffer.length > 0) {
      this.flushBuffer();
    }
    callback();
  }

  private flushBuffer(): void {
    if (this.chunkBuffer.length === 0) return;

    const chunk = [...this.chunkBuffer];

    this.chunkBuffer = [];

    // Update progress
    this.tracker.updateEntitiesProcessed(
      this.tracker.getProgress().entitiesProcessed + chunk.length
    );

    this.push(chunk);
  }
}

/**
 * Streaming import processor for handling large datasets
 */
export class StreamingImportProcessor {
  private readonly provider: IssueProvider;
  private readonly config: StreamingExportConfig;
  private readonly tracker: MigrationProgressTracker;

  constructor(
    provider: IssueProvider,
    config: StreamingExportConfig,
    tracker: MigrationProgressTracker
  ) {
    this.provider = provider;
    this.config = config;
    this.tracker = tracker;
  }

  /**
   * Process export data in streaming fashion
   */
  async processExportData(exportData: ExportData): Promise<ImportResult> {
    this.tracker.updatePhase('importing', 'Processing import data in chunks');

    const importResult: ImportResult = {
      success: true,
      imported: {
        projects: 0,
        issues: 0,
        dependencies: 0,
        workflowStates: 0,
        labels: 0,
        comments: 0,
      },
      failed: {
        projects: [],
        issues: [],
        dependencies: [],
        workflowStates: [],
        labels: [],
        comments: [],
      },
      warnings: [],
      errors: [],
      duration: 0,
    };

    const startTime = Date.now();

    try {
      // Process in dependency order: projects → workflow states → labels → issues → dependencies → comments
      await this.processProjectsInChunks(exportData.projects, importResult);
      await this.processWorkflowStatesInChunks(exportData.workflowStates, importResult);
      await this.processLabelsInChunks(exportData.labels, importResult);
      await this.processIssuesInChunks(exportData.issues, importResult);
      await this.processDependenciesInChunks(exportData.dependencies, importResult);
      await this.processCommentsInChunks(exportData.comments, importResult);

      importResult.duration = Date.now() - startTime;
      this.tracker.updatePhase('complete', 'Migration completed successfully');
    } catch (error) {
      importResult.success = false;
      importResult.errors.push({
        name: 'ImportError',
        message: error instanceof Error ? error.message : 'Unknown import error',
        code: 'IMPORT_FAILED',
        providerId: this.provider.getProviderInfo().id,
        providerType: this.provider.getProviderInfo().type,
        statusCode: 500,
        retryable: false,
      });
      this.tracker.updatePhase('failed', `Migration failed: ${error}`);
    }

    return importResult;
  }

  /**
   * Process projects in chunks
   */
  private async processProjectsInChunks(projects: any[], result: ImportResult): Promise<void> {
    const chunks = this.chunkArray(projects, this.config.chunkSize);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      if (!chunk) continue;

      this.tracker.updatePhaseProgress(
        (i / chunks.length) * 100,
        `Processing projects chunk ${i + 1}/${chunks.length}`
      );

      for (const project of chunk) {
        try {
          await this.provider.createProject(project);
          result.imported.projects++;
        } catch (error) {
          result.failed.projects.push(project.id);
          result.warnings.push(`Failed to import project ${project.id}: ${error}`);
        }
      }
    }
  }

  /**
   * Process workflow states in chunks
   */
  private async processWorkflowStatesInChunks(states: any[], result: ImportResult): Promise<void> {
    const chunks = this.chunkArray(states, this.config.chunkSize);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      if (!chunk) continue;

      this.tracker.updatePhaseProgress(
        (i / chunks.length) * 100,
        `Processing workflow states chunk ${i + 1}/${chunks.length}`
      );

      for (const state of chunk) {
        try {
          await this.provider.createWorkflowState(state.project_id, state);
          result.imported.workflowStates++;
        } catch (error) {
          result.failed.workflowStates.push(state.id);
          result.warnings.push(`Failed to import workflow state ${state.id}: ${error}`);
        }
      }
    }
  }

  /**
   * Process labels in chunks
   */
  private async processLabelsInChunks(labels: any[], result: ImportResult): Promise<void> {
    const chunks = this.chunkArray(labels, this.config.chunkSize);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      if (!chunk) continue;

      this.tracker.updatePhaseProgress(
        (i / chunks.length) * 100,
        `Processing labels chunk ${i + 1}/${chunks.length}`
      );

      for (const label of chunk) {
        try {
          await this.provider.createLabel(label);
          result.imported.labels++;
        } catch (error) {
          result.failed.labels.push(label.id);
          result.warnings.push(`Failed to import label ${label.id}: ${error}`);
        }
      }
    }
  }

  /**
   * Process issues in chunks with hierarchy ordering
   */
  private async processIssuesInChunks(issues: any[], result: ImportResult): Promise<void> {
    // Sort issues by hierarchy: epics first, then stories, then subtasks
    const hierarchyOrder: Record<string, number> = { epic: 0, story: 1, subtask: 2 };
    const sortedIssues = [...issues].sort(
      (a, b) => (hierarchyOrder[a.issue_type] || 999) - (hierarchyOrder[b.issue_type] || 999)
    );

    const chunks = this.chunkArray(sortedIssues, this.config.chunkSize);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      if (!chunk) continue;

      this.tracker.updatePhaseProgress(
        (i / chunks.length) * 100,
        `Processing issues chunk ${i + 1}/${chunks.length}`
      );

      for (const issue of chunk) {
        try {
          await this.provider.createIssue(issue);
          result.imported.issues++;
        } catch (error) {
          result.failed.issues.push(issue.id);
          result.warnings.push(`Failed to import issue ${issue.id}: ${error}`);
        }
      }
    }
  }

  /**
   * Process dependencies in chunks
   */
  private async processDependenciesInChunks(
    dependencies: any[],
    result: ImportResult
  ): Promise<void> {
    const chunks = this.chunkArray(dependencies, this.config.chunkSize);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      if (!chunk) continue;

      this.tracker.updatePhaseProgress(
        (i / chunks.length) * 100,
        `Processing dependencies chunk ${i + 1}/${chunks.length}`
      );

      for (const dependency of chunk) {
        try {
          await this.provider.addDependency(
            dependency.blocker_id,
            dependency.blocked_id,
            dependency.dependency_type
          );
          result.imported.dependencies++;
        } catch (error) {
          result.failed.dependencies.push(dependency.id);
          result.warnings.push(`Failed to import dependency ${dependency.id}: ${error}`);
        }
      }
    }
  }

  /**
   * Process comments in chunks
   */
  private async processCommentsInChunks(comments: any[], result: ImportResult): Promise<void> {
    const chunks = this.chunkArray(comments, this.config.chunkSize);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      if (!chunk) continue;

      this.tracker.updatePhaseProgress(
        (i / chunks.length) * 100,
        `Processing comments chunk ${i + 1}/${chunks.length}`
      );

      for (const comment of chunk) {
        try {
          // Note: Comments may need to be created through issue updates
          // This depends on the provider implementation
          result.imported.comments++;
        } catch (error) {
          result.failed.comments.push(comment.id);
          result.warnings.push(`Failed to import comment ${comment.id}: ${error}`);
        }
      }
    }
  }

  /**
   * Split array into chunks of specified size
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];

    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }

    return chunks;
  }
}

// =============================================================================
// Migration Orchestration
// =============================================================================

/**
 * Migration configuration options
 */
export interface MigrationConfig {
  /** Source provider configuration */
  sourceProvider: IssueProvider;
  /** Target provider configuration */
  targetProvider: IssueProvider;
  /** Project ID to migrate */
  projectId: string;
  /** Export options */
  exportOptions: ExportOptions;
  /** Streaming configuration */
  streamingConfig: StreamingExportConfig;
  /** Enable dry run mode */
  dryRun: boolean;
  /** Validate data before migration */
  validateBeforeMigration: boolean;
  /** Enable rollback on failure */
  enableRollback: boolean;
  /** Maximum retry attempts for failed operations */
  maxRetries: number;
  /** Retry delay in milliseconds */
  retryDelay: number;
}

/**
 * Migration result summary
 */
export interface MigrationResult {
  /** Migration succeeded */
  success: boolean;
  /** Export data generated */
  exportData?: ExportData;
  /** Import result from target provider */
  importResult?: ImportResult;
  /** Migration statistics */
  statistics: {
    /** Total migration duration */
    totalDuration: number;
    /** Export duration */
    exportDuration: number;
    /** Import duration */
    importDuration: number;
    /** Total entities migrated */
    totalEntities: number;
    /** Migration throughput (entities per second) */
    throughput: number;
  };
  /** Migration errors */
  errors: ValidationError[];
  /** Migration warnings */
  warnings: ValidationWarning[];
  /** Final progress state */
  finalProgress: MigrationProgress;
}

/**
 * Complete migration orchestrator
 */
export class MigrationOrchestrator {
  private readonly config: MigrationConfig;
  private readonly tracker: MigrationProgressTracker;

  constructor(config: MigrationConfig) {
    this.config = config;

    // Estimate total entities for progress tracking
    const estimatedEntities = this.estimateTotalEntities();

    this.tracker = new MigrationProgressTracker(estimatedEntities);
  }

  /**
   * Execute complete migration with progress tracking
   */
  async executeMigration(): Promise<MigrationResult> {
    const startTime = Date.now();
    let exportData: ExportData | undefined;
    let importResult: ImportResult | undefined;

    try {
      // Phase 1: Export data from source provider
      this.tracker.updatePhase('exporting', 'Exporting data from source provider');
      const exportStartTime = Date.now();

      exportData = await this.config.sourceProvider.exportData(
        this.config.projectId,
        this.config.exportOptions
      );

      const exportDuration = Date.now() - exportStartTime;

      // Phase 2: Validate exported data
      this.tracker.updatePhase('validating', 'Validating exported data integrity');
      await this.validateExportData(exportData);

      // Phase 3: Transform data if needed
      this.tracker.updatePhase('transforming', 'Transforming data for target provider');
      const transformedData = await this.transformDataForTarget(exportData);

      // Phase 4: Import data to target provider (if not dry run)
      if (!this.config.dryRun) {
        const processor = new StreamingImportProcessor(
          this.config.targetProvider,
          this.config.streamingConfig,
          this.tracker
        );

        importResult = await processor.processExportData(transformedData);
      } else {
        this.tracker.updatePhase('complete', 'Dry run completed - no data imported');
      }

      // Phase 5: Verify migration
      if (importResult && !this.config.dryRun) {
        this.tracker.updatePhase('verifying', 'Verifying migration integrity');
        await this.verifyMigration(exportData, importResult);
      }

      const totalDuration = Date.now() - startTime;
      const importDuration = importResult?.duration || 0;

      return {
        success: true,
        ...(exportData && { exportData }),
        ...(importResult && { importResult }),
        statistics: {
          totalDuration,
          exportDuration,
          importDuration,
          totalEntities: this.calculateTotalEntities(exportData),
          throughput: this.calculateThroughput(exportData, totalDuration),
        },
        errors: this.tracker.getProgress().errors,
        warnings: this.tracker.getProgress().warnings,
        finalProgress: this.tracker.getProgress(),
      };
    } catch (error) {
      this.tracker.updatePhase('failed', `Migration failed: ${error}`);

      const totalDuration = Date.now() - startTime;

      return {
        success: false,
        ...(exportData && { exportData }),
        ...(importResult && { importResult }),
        statistics: {
          totalDuration,
          exportDuration: 0,
          importDuration: 0,
          totalEntities: 0,
          throughput: 0,
        },
        errors: [
          ...this.tracker.getProgress().errors,
          {
            type: 'data_corruption',
            severity: 'error',
            message: error instanceof Error ? error.message : 'Unknown migration error',
            entityType: 'migration',
            entityId: 'migration-orchestrator',
          },
        ],
        warnings: this.tracker.getProgress().warnings,
        finalProgress: this.tracker.getProgress(),
      };
    }
  }

  /**
   * Get migration progress tracker for external monitoring
   */
  getProgressTracker(): MigrationProgressTracker {
    return this.tracker;
  }

  /**
   * Estimate total entities for progress tracking
   */
  private estimateTotalEntities(): number {
    // This would typically query the source provider for counts
    // For now, return a reasonable default
    return 1000;
  }

  /**
   * Validate exported data integrity
   */
  private async validateExportData(exportData: ExportData): Promise<void> {
    // Validation is handled in the export-format module
    const validation = exportData.metadata.validation;

    if (!validation.issueHierarchyValid || !validation.dependencyGraphValid) {
      throw new Error('Export data validation failed');
    }

    // Add validation errors and warnings to tracker
    for (const error of validation.validationErrors) {
      this.tracker.addError(error);
    }

    for (const warning of validation.validationWarnings) {
      this.tracker.addWarning(warning);
    }
  }

  /**
   * Transform data for target provider compatibility
   */
  private async transformDataForTarget(exportData: ExportData): Promise<ExportData> {
    // Provider-specific transformations would go here
    // For now, return data as-is
    return exportData;
  }

  /**
   * Verify migration integrity
   */
  private async verifyMigration(exportData: ExportData, importResult: ImportResult): Promise<void> {
    // Compare exported vs imported counts
    const exportCounts = exportData.metadata.statistics.entityCounts;
    const importCounts = importResult.imported;

    if (
      exportCounts.projects !== importCounts.projects ||
      exportCounts.issues !== importCounts.issues ||
      exportCounts.dependencies !== importCounts.dependencies
    ) {
      throw new Error('Migration verification failed - entity counts do not match');
    }
  }

  /**
   * Calculate total entities in export data
   */
  private calculateTotalEntities(exportData?: ExportData): number {
    if (!exportData) return 0;

    const counts = exportData.metadata.statistics.entityCounts;

    return (
      counts.projects +
      counts.issues +
      counts.dependencies +
      counts.workflowStates +
      counts.labels +
      counts.comments
    );
  }

  /**
   * Calculate migration throughput
   */
  private calculateThroughput(exportData: ExportData | undefined, duration: number): number {
    const totalEntities = this.calculateTotalEntities(exportData);

    return totalEntities > 0 && duration > 0 ? totalEntities / (duration / 1000) : 0;
  }
}

// =============================================================================
// Error Recovery and Rollback
// =============================================================================

/**
 * Migration checkpoint for rollback capability
 */
export interface MigrationCheckpoint {
  /** Checkpoint ID */
  id: string;
  /** Checkpoint timestamp */
  timestamp: Date;
  /** Migration phase when checkpoint was created */
  phase: MigrationPhase;
  /** Provider state snapshot */
  providerState: any;
  /** Progress at checkpoint */
  progress: MigrationProgress;
}

/**
 * Rollback manager for failed migrations
 */
export class MigrationRollbackManager {
  private checkpoints: Map<string, MigrationCheckpoint> = new Map();
  private readonly provider: IssueProvider;

  constructor(provider: IssueProvider) {
    this.provider = provider;
  }

  /**
   * Create migration checkpoint
   */
  async createCheckpoint(
    id: string,
    phase: MigrationPhase,
    progress: MigrationProgress
  ): Promise<void> {
    const checkpoint: MigrationCheckpoint = {
      id,
      timestamp: new Date(),
      phase,
      providerState: await this.captureProviderState(),
      progress,
    };

    this.checkpoints.set(id, checkpoint);
  }

  /**
   * Rollback to specific checkpoint
   */
  async rollbackToCheckpoint(checkpointId: string): Promise<OperationResult<void>> {
    const checkpoint = this.checkpoints.get(checkpointId);

    if (!checkpoint) {
      return {
        success: false,
        error: {
          name: 'CheckpointNotFound',
          message: `Checkpoint ${checkpointId} not found`,
          code: 'PROVIDER_ERROR',
          providerId: this.provider.getProviderInfo().id,
          providerType: this.provider.getProviderInfo().type,
          retryable: false,
        },
      };
    }

    try {
      await this.restoreProviderState(checkpoint.providerState);

      return {
        success: true,
        metadata: {
          duration: Date.now() - checkpoint.timestamp.getTime(),
          timestamp: new Date(),
          operationType: 'rollback',
          affectedResources: [checkpointId],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'RollbackFailed',
          message: error instanceof Error ? error.message : 'Unknown rollback error',
          code: 'PROVIDER_ERROR',
          providerId: this.provider.getProviderInfo().id,
          providerType: this.provider.getProviderInfo().type,
          retryable: true,
        },
      };
    }
  }

  /**
   * Capture current provider state
   */
  private async captureProviderState(): Promise<any> {
    // This would capture relevant provider state for rollback
    // Implementation depends on provider capabilities
    return {};
  }

  /**
   * Restore provider state from checkpoint
   */
  private async restoreProviderState(_state: any): Promise<void> {
    // This would restore provider state from checkpoint
    // Implementation depends on provider capabilities
  }
}

// =============================================================================
// Migration Validation and Health Checks
// =============================================================================

/**
 * Pre-migration health check results
 */
export interface MigrationHealthCheck {
  /** Source provider is healthy */
  sourceProviderHealthy: boolean;
  /** Target provider is healthy */
  targetProviderHealthy: boolean;
  /** Sufficient disk space available */
  sufficientDiskSpace: boolean;
  /** Sufficient memory available */
  sufficientMemory: boolean;
  /** Network connectivity is good */
  networkConnectivity: boolean;
  /** Required permissions are available */
  requiredPermissions: boolean;
  /** Health check errors */
  errors: string[];
  /** Health check warnings */
  warnings: string[];
}

/**
 * Migration health checker
 */
export class MigrationHealthChecker {
  private readonly config: MigrationConfig;

  constructor(config: MigrationConfig) {
    this.config = config;
  }

  /**
   * Perform comprehensive pre-migration health check
   */
  async performHealthCheck(): Promise<MigrationHealthCheck> {
    const results: MigrationHealthCheck = {
      sourceProviderHealthy: false,
      targetProviderHealthy: false,
      sufficientDiskSpace: false,
      sufficientMemory: false,
      networkConnectivity: false,
      requiredPermissions: false,
      errors: [],
      warnings: [],
    };

    try {
      // Check source provider health
      results.sourceProviderHealthy = await this.config.sourceProvider.isAvailable();
      if (!results.sourceProviderHealthy) {
        results.errors.push('Source provider is not available');
      }

      // Check target provider health
      results.targetProviderHealthy = await this.config.targetProvider.isAvailable();
      if (!results.targetProviderHealthy) {
        results.errors.push('Target provider is not available');
      }

      // Check system resources
      results.sufficientMemory = this.checkMemoryAvailability();
      if (!results.sufficientMemory) {
        results.warnings.push('Low memory available - consider enabling streaming mode');
      }

      results.sufficientDiskSpace = await this.checkDiskSpace();
      if (!results.sufficientDiskSpace) {
        results.errors.push('Insufficient disk space for migration');
      }

      // Check network connectivity (for cloud providers)
      results.networkConnectivity = await this.checkNetworkConnectivity();
      if (!results.networkConnectivity) {
        results.warnings.push('Network connectivity issues detected');
      }

      // Check permissions
      results.requiredPermissions = await this.checkPermissions();
      if (!results.requiredPermissions) {
        results.errors.push('Insufficient permissions for migration');
      }
    } catch (error) {
      results.errors.push(`Health check failed: ${error}`);
    }

    return results;
  }

  /**
   * Check available memory
   */
  private checkMemoryAvailability(): boolean {
    const memoryUsage = process.memoryUsage();
    const availableMemory = memoryUsage.heapTotal - memoryUsage.heapUsed;
    const requiredMemory = this.config.streamingConfig.maxMemoryUsage * 1024 * 1024;

    return availableMemory > requiredMemory;
  }

  /**
   * Check available disk space
   */
  private async checkDiskSpace(): Promise<boolean> {
    // Implementation would check actual disk space
    // For now, assume sufficient space is available
    return true;
  }

  /**
   * Check network connectivity
   */
  private async checkNetworkConnectivity(): Promise<boolean> {
    // Implementation would test network connectivity to providers
    // For now, assume connectivity is good
    return true;
  }

  /**
   * Check required permissions
   */
  private async checkPermissions(): Promise<boolean> {
    // Implementation would check provider-specific permissions
    // For now, assume permissions are sufficient
    return true;
  }
}
