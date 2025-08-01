/**
 * Core type definitions for JCVD framework
 */

// Re-export all types from specific modules
export * from './config.js'
export * from './multi-agent.js'

// Re-export provider system types for easy access
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
  ExportData
} from '../providers/types.js'

// Provider-specific error types (avoid conflicts with existing types)
export type {
  ProviderError as IssueProviderError,
  ProviderErrorCode as IssueProviderErrorCode
} from '../providers/types.js'

/**
 * Common utility types
 */
export type Awaitable<T> = T | Promise<T>;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
export type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];

/**
 * Error types
 */
export interface JCVDError extends Error {
  code: string;
  context?: Record<string, unknown>;
}

export interface ValidationError extends JCVDError {
  code: 'VALIDATION_ERROR';
  field: string;
  value: unknown;
}

export interface ConfigError extends JCVDError {
  code: 'CONFIG_ERROR';
  configPath: string;
}

export interface TaskCoordinationError extends JCVDError {
  code: 'TASK_COORDINATION_ERROR';
  agent: string;
  taskType?: string;
}

export interface ProviderError extends JCVDError {
  code: 'PROVIDER_ERROR';
  providerId: string;
  providerType: string;
}

/**
 * Status types
 */
export type Status = 'idle' | 'running' | 'stopping' | 'stopped' | 'error';

export interface StatusInfo {
  status: Status;
  uptime: number;
  lastActivity: Date;
  taskCoordination: string;
  activeProviders: number;
  errors: JCVDError[];
  multiAgent: {
    enabled: boolean;
    activeContexts: number;
    maxConcurrentAgents: number;
  };
}

/**
 * Event types
 */
export interface EventBase {
  id: string;
  timestamp: Date;
  source: string;
}

export interface TaskCoordinationEvent extends EventBase {
  type: 'task.started' | 'task.completed' | 'task.failed' | 'agent.switched';
  agent: string;
  taskType?: string;
  data?: Record<string, unknown>;
}

export interface ProviderEvent extends EventBase {
  type: 'provider.connected' | 'provider.disconnected' | 'provider.error' | 'provider.sync';
  providerId: string;
  data?: Record<string, unknown>;
}

export interface WorkflowEvent extends EventBase {
  type: 'workflow.started' | 'workflow.completed' | 'workflow.failed' | 'workflow.paused';
  workflowId: string;
  data?: Record<string, unknown>;
}

export type JCVDEvent = TaskCoordinationEvent | ProviderEvent | WorkflowEvent;

/**
 * Logging types
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  source: string;
  context?: Record<string, unknown>;
}

/**
 * Generic result type for operations that may fail
 */
export type Result<T, E = JCVDError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Helper type for creating results
 */
export const Result = {
  success: <T>(data: T): Result<T, never> => ({ success: true, data }),
  error: <E extends JCVDError>(error: E): Result<never, E> => ({ success: false, error })
};