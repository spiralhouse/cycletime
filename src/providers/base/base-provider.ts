/**
 * JCVD Base Provider Implementation
 * Abstract base class providing common functionality for all provider implementations
 */

import { ConnectionManager } from './connection-manager.js';
import { HealthMonitor } from './health-monitor.js';

import type {
  IssueProvider,
  ProviderConfig,
  ProviderInfo,
  ProviderStatus,
  ProviderError,
  OperationResult,
  Project,
  EnhancedIssue,
  ProjectConfig,
  IssueConfig,
  UpdateProjectInput,
  UpdateIssueInput,
  IssueFilters,
  WorkflowState,
  Dependency,
  DependencyType,
  DependencyGraph,
  Label,
  CreateLabelInput,
  TaskRecommendation,
  ExportData,
  ExportOptions,
  ImportResult,
  SyncResult,
} from '../types.js';

// =============================================================================
// Abstract Base Provider
// =============================================================================

/**
 * Abstract base provider class implementing common functionality
 */
export abstract class BaseProvider implements IssueProvider {
  protected config: ProviderConfig;
  protected connectionManager: ConnectionManager;
  protected healthMonitor: HealthMonitor;
  private initialized = false;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.connectionManager = new ConnectionManager(config);
    this.healthMonitor = new HealthMonitor(this.performHealthCheck.bind(this), {
      checkInterval: 30_000, // 30 seconds
      maxRetries: 3,
      timeoutMs: 10_000,
    });
  }

  // -------------------------------------------------------------------------
  // Provider Metadata and Health Management
  // -------------------------------------------------------------------------

  abstract getProviderInfo(): ProviderInfo;

  async isAvailable(): Promise<boolean> {
    return this.connectionManager.isConnected() && this.healthMonitor.isHealthy();
  }

  async healthCheck(): Promise<ProviderStatus> {
    return this.healthMonitor.getCurrentStatus();
  }

  async initialize(config: ProviderConfig): Promise<OperationResult<void>> {
    try {
      this.config = { ...this.config, ...config };

      // Initialize connection
      const connectionResult = await this.connectionManager.connect();

      if (!connectionResult.success) {
        return {
          success: false,
          error: connectionResult.error!,
          metadata: {
            duration: 0,
            timestamp: new Date(),
            operationType: 'initialize',
          },
        };
      }

      // Start health monitoring
      this.healthMonitor.startMonitoring();

      // Perform provider-specific initialization
      await this.performInitialization();

      this.initialized = true;

      return {
        success: true,
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operationType: 'initialize',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: this.createProviderError(
          'PROVIDER_CONFIGURATION_ERROR',
          error instanceof Error ? error.message : String(error),
          { operation: 'initialize' }
        ),
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operationType: 'initialize',
        },
      };
    }
  }

  async cleanup(): Promise<OperationResult<void>> {
    try {
      // Stop health monitoring
      this.healthMonitor.stopMonitoring();

      // Perform provider-specific cleanup
      await this.performCleanup();

      // Close connections
      await this.connectionManager.disconnect();

      this.initialized = false;

      return {
        success: true,
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operationType: 'cleanup',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: this.createProviderError(
          'OPERATION_FAILED',
          error instanceof Error ? error.message : String(error),
          { operation: 'cleanup' }
        ),
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operationType: 'cleanup',
        },
      };
    }
  }

  // -------------------------------------------------------------------------
  // Capability Discovery (Optional Implementation)
  // -------------------------------------------------------------------------

  async supportsCapability?(capabilityId: string): Promise<boolean> {
    // Default implementation - override in derived classes
    const info = this.getProviderInfo();

    // Map capability IDs to provider capabilities
    const capabilityMap: Record<string, boolean> = {
      'projects.create': info.capabilities.supportsProjects,
      'projects.read': info.capabilities.supportsProjects,
      'projects.update': info.capabilities.supportsProjects,
      'projects.delete': info.capabilities.supportsProjects,
      'issues.create': true, // All providers must support basic issue operations
      'issues.read': true,
      'issues.update': true,
      'issues.delete': true,
      'issues.list': true,
      'hierarchy.epics': info.capabilities.supportsHierarchy,
      'hierarchy.stories': info.capabilities.supportsHierarchy,
      'hierarchy.subtasks': info.capabilities.supportsHierarchy,
      'dependencies.create': info.capabilities.supportsDependencies,
      'dependencies.remove': info.capabilities.supportsDependencies,
      'dependencies.graph': info.capabilities.supportsDependencies,
      'workflow.states': info.capabilities.supportsCustomWorkflows,
      'workflow.transitions': info.capabilities.supportsCustomWorkflows,
      'organization.labels': info.capabilities.supportsLabels,
      'organization.priorities': true, // Most providers support priorities
      'collaboration.assignees': info.capabilities.supportsAssignees,
      'collaboration.comments': info.capabilities.supportsComments,
      'performance.offline': info.capabilities.supportsOffline,
      'integration.export': info.capabilities.supportsExport,
      'integration.import': info.capabilities.supportsImport,
      'integration.sync': info.capabilities.supportsSync,
    };

    return capabilityMap[capabilityId] ?? false;
  }

  async validateCapabilities?(requiredCapabilities: string[]): Promise<{
    isValid: boolean;
    supportedCapabilities: string[];
    unsupportedCapabilities: string[];
    warnings: string[];
  }> {
    const supportedCapabilities: string[] = [];
    const unsupportedCapabilities: string[] = [];
    const warnings: string[] = [];

    for (const capabilityId of requiredCapabilities) {
      const isSupported = await this.supportsCapability!(capabilityId);

      if (isSupported) {
        supportedCapabilities.push(capabilityId);
      } else {
        unsupportedCapabilities.push(capabilityId);
      }
    }

    return {
      isValid: unsupportedCapabilities.length === 0,
      supportedCapabilities,
      unsupportedCapabilities,
      warnings,
    };
  }

  // -------------------------------------------------------------------------
  // Abstract Methods - Must be implemented by derived classes
  // -------------------------------------------------------------------------

  abstract createProject(config: ProjectConfig): Promise<Project>;
  abstract getProject(id: string): Promise<Project>;
  abstract updateProject(id: string, updates: UpdateProjectInput): Promise<Project>;
  abstract listProjects(filters?: { name?: string; createdAfter?: Date }): Promise<Project[]>;
  abstract deleteProject(id: string): Promise<OperationResult<void>>;

  abstract createIssue(config: IssueConfig): Promise<EnhancedIssue>;
  abstract getIssue(id: string): Promise<EnhancedIssue>;
  abstract updateIssue(id: string, updates: UpdateIssueInput): Promise<EnhancedIssue>;
  abstract listIssues(filters: IssueFilters): Promise<EnhancedIssue[]>;
  abstract deleteIssue(id: string): Promise<OperationResult<void>>;

  abstract addDependency(
    blockerId: string,
    blockedId: string,
    type?: DependencyType
  ): Promise<Dependency>;
  abstract removeDependency(dependencyId: string): Promise<OperationResult<void>>;
  abstract getDependencyGraph(projectId: string): Promise<DependencyGraph>;
  abstract validateDependencyGraph(projectId: string): Promise<{
    isValid: boolean;
    circularDependencies: string[][];
    errors: string[];
  }>;

  abstract getWorkflowStates(projectId: string): Promise<WorkflowState[]>;
  abstract createWorkflowState(
    projectId: string,
    state: Omit<WorkflowState, 'id' | 'project_id' | 'created_at' | 'updated_at'>
  ): Promise<WorkflowState>;
  abstract updateIssueState(issueId: string, stateId: string): Promise<EnhancedIssue>;
  abstract getValidStateTransitions(issueId: string): Promise<WorkflowState[]>;

  abstract createLabel(label: CreateLabelInput): Promise<Label>;
  abstract getProjectLabels(projectId: string): Promise<Label[]>;
  abstract addLabelToIssue(issueId: string, labelId: string): Promise<OperationResult<void>>;
  abstract removeLabelFromIssue(issueId: string, labelId: string): Promise<OperationResult<void>>;

  abstract getNextTaskRecommendation(
    projectId: string,
    context?: { focusArea?: string; recentWork?: string[] }
  ): Promise<TaskRecommendation>;
  abstract getAvailableIssues(projectId: string, assigneeId?: string): Promise<EnhancedIssue[]>;
  abstract startIssue(issueId: string): Promise<EnhancedIssue>;
  abstract completeIssue(issueId: string): Promise<{
    issue: EnhancedIssue;
    unblockedIssues: EnhancedIssue[];
  }>;

  abstract exportData(projectId: string, options?: Partial<ExportOptions>): Promise<ExportData>;
  abstract importData(
    data: ExportData,
    options?: {
      overwriteExisting?: boolean;
      validateData?: boolean;
      createMissingWorkflowStates?: boolean;
      enableStreaming?: boolean;
      chunkSize?: number;
      maxMemoryUsage?: number;
    }
  ): Promise<ImportResult>;

  abstract syncWith(
    otherProvider: IssueProvider,
    projectId: string,
    options?: {
      direction: 'push' | 'pull' | 'bidirectional';
      conflictResolution: 'source_wins' | 'target_wins' | 'manual';
      dryRun?: boolean;
    }
  ): Promise<SyncResult>;

  abstract validateDataIntegrity(projectId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    statistics: {
      totalIssues: number;
      hierarchyViolations: number;
      dependencyViolations: number;
      orphanedEntities: number;
    };
  }>;

  // -------------------------------------------------------------------------
  // Protected Helper Methods
  // -------------------------------------------------------------------------

  protected abstract performInitialization(): Promise<void>;
  protected abstract performCleanup(): Promise<void>;
  protected abstract performHealthCheck(): Promise<boolean>;

  /**
   * Create standardized provider error
   */
  protected createProviderError(
    code: string,
    message: string,
    context?: Record<string, any>
  ): ProviderError {
    const info = this.getProviderInfo();

    return {
      name: 'ProviderError',
      message,
      code: code as any,
      providerId: info.id,
      providerType: info.type,
      retryable: this.isRetryableError(code),
      context: {
        operation: 'unknown',
        timestamp: new Date(),
        ...context,
      },
    };
  }

  /**
   * Determine if an error code represents a retryable error
   */
  protected isRetryableError(code: string): boolean {
    const retryableErrors = [
      'NETWORK_ERROR',
      'TIMEOUT',
      'RATE_LIMIT_EXCEEDED',
      'CONNECTION_FAILED',
    ];

    return retryableErrors.includes(code);
  }

  /**
   * Execute operation with error handling and retry logic
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry if error is not retryable
        if ((error as any).code && !this.isRetryableError((error as any).code)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10_000);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error(`Operation ${operationName} failed after ${maxRetries} attempts`);
  }

  /**
   * Validate that provider is initialized before operations
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw this.createProviderError(
        'PROVIDER_CONFIGURATION_ERROR',
        'Provider must be initialized before performing operations',
        { operation: 'initialization_check' }
      );
    }
  }

  /**
   * Validate project exists (to be implemented by derived classes)
   */
  protected abstract validateProjectExists(projectId: string): Promise<boolean>;

  /**
   * Validate issue exists (to be implemented by derived classes)
   */
  protected abstract validateIssueExists(issueId: string): Promise<boolean>;
}
