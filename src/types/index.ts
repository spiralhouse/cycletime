/**
 * Core type definitions for JCVD framework
 */

// Re-export all types from specific modules
export * from './config.js';

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

export interface AgentError extends JCVDError {
  code: 'AGENT_ERROR';
  agentId: string;
  agentType: string;
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
  activeAgents: number;
  activeProviders: number;
  errors: JCVDError[];
}

/**
 * Event types
 */
export interface EventBase {
  id: string;
  timestamp: Date;
  source: string;
}

export interface AgentEvent extends EventBase {
  type: 'agent.started' | 'agent.stopped' | 'agent.error' | 'agent.task.completed';
  agentId: string;
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

export type JCVDEvent = AgentEvent | ProviderEvent | WorkflowEvent;

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