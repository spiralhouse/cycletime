/**
 * JCVD - Multi-agent orchestration framework for Claude Code
 * 
 * Transforms Claude Code into a specialized software development team
 * through a provider-agnostic, multi-agent architecture.
 */

import { ConfigManager } from './config/config-manager.js';
import { Orchestrator } from './core/orchestrator.js';
import { logger } from './utils/logger.js';

import type { JCVDConfig } from './types/config.js';

/**
 * Main JCVD framework entry point
 */
export class JCVD {
  private orchestrator: Orchestrator;
  private config: JCVDConfig;

  constructor(config?: Partial<JCVDConfig>) {
    this.config = ConfigManager.load(config);
    this.orchestrator = new Orchestrator(this.config);
    
    logger.info('JCVD framework initialized', {
      version: '0.1.0',
      providers: this.config.providers.length,
      defaultAgent: this.config.taskCoordination.defaultAgent
    });
  }

  /**
   * Start the JCVD orchestration framework
   */
  async start(): Promise<void> {
    try {
      await this.orchestrator.initialize();
      logger.info('JCVD framework started successfully');
    } catch (error) {
      logger.error('Failed to start JCVD framework', { error });
      throw error;
    }
  }

  /**
   * Stop the JCVD orchestration framework
   */
  async stop(): Promise<void> {
    try {
      await this.orchestrator.shutdown();
      logger.info('JCVD framework stopped successfully');
    } catch (error) {
      logger.error('Failed to stop JCVD framework gracefully', { error });
      throw error;
    }
  }

  /**
   * Get framework status
   */
  getStatus() {
    return this.orchestrator.getStatus();
  }
}

// Export main class and types
export default JCVD;

// Export core types (avoiding conflicts)
export type {
  Awaitable,
  Optional,
  RequiredKeys,
  OptionalKeys,
  JCVDError,
  ValidationError,
  ConfigError,
  TaskCoordinationError,
  Status,
  StatusInfo,
  EventBase,
  TaskCoordinationEvent,
  ProviderEvent,
  WorkflowEvent,
  JCVDEvent,
  LogLevel,
  LogEntry,
  Result
} from './types/index.js';

// Export provider system
export type {
  IssueProvider,
  ProviderInfo,
  ProviderCapabilities,
  ProviderStatus,
  ProviderType,
  ProviderConfig,
  SQLiteProviderConfig,
  LinearProviderConfig,
  GitHubProviderConfig,
  JiraProviderConfig,
  EnhancedIssue,
  ProjectConfig,
  IssueConfig,
  Dependency,
  DependencyGraph,
  TaskRecommendation,
  OperationResult,
  ImportResult,
  SyncResult,
  ExportData,
  IssueProviderError,
  IssueProviderErrorCode
} from './types/index.js';

// Export provider registry functions
export {
  registerProvider,
  getProviderImplementation,
  getRegisteredProviderTypes
} from './providers/index.js';

// Export core functionality
export * from './core/index.js';

/**
 * Create and start JCVD framework instance
 */
export async function createJCVD(config?: Partial<JCVDConfig>): Promise<JCVD> {
  const jcvd = new JCVD(config);

  await jcvd.start();

  return jcvd;
}

// TODO: Handle graceful shutdown with global instance management
// For now, individual instances handle their own shutdown