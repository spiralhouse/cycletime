/**
 * Multi-agent coordination type definitions for JCVD framework
 */

/**
 * Multi-agent task execution context
 */
export interface MultiAgentContext {
  /** Primary task identifier */
  taskId: string;
  
  /** Participating agents */
  agents: AgentExecutionContext[];
  
  /** Shared context between agents */
  sharedContext: Record<string, unknown>;
  
  /** Git worktree information */
  worktrees: WorktreeInfo[];
  
  /** Execution status */
  status: MultiAgentStatus;
  
  /** Start time */
  startTime: Date;
  
  /** Completion time */
  completionTime?: Date;
  
  /** Error information */
  errors?: AgentError[];
}

/**
 * Individual agent execution context
 */
export interface AgentExecutionContext {
  /** Agent identifier */
  agentId: string;
  
  /** Agent type */
  agentType: string;
  
  /** Assigned tasks */
  tasks: AgentTask[];
  
  /** Git branch */
  branch: string;
  
  /** Worktree path */
  worktreePath: string;
  
  /** Agent status */
  status: AgentExecutionStatus;
  
  /** Resource locks held by this agent */
  resourceLocks: ResourceLock[];
  
  /** Communication channel */
  communicationChannel?: string;
}

/**
 * Agent task definition
 */
export interface AgentTask {
  /** Task identifier */
  id: string;
  
  /** Task type */
  type: string;
  
  /** Task description */
  description: string;
  
  /** Task inputs */
  inputs: Record<string, unknown>;
  
  /** Expected outputs */
  expectedOutputs?: string[];
  
  /** Dependencies on other tasks */
  dependencies: string[];
  
  /** File patterns this task affects */
  affectedFiles: string[];
  
  /** Task priority */
  priority: number;
  
  /** Estimated duration in minutes */
  estimatedDuration?: number;
}

/**
 * Git worktree information
 */
export interface WorktreeInfo {
  /** Worktree path */
  path: string;
  
  /** Associated branch */
  branch: string;
  
  /** Assigned agent */
  agent: string;
  
  /** Creation time */
  createdAt: Date;
  
  /** Last activity time */
  lastActivity: Date;
  
  /** Worktree status */
  status: WorktreeStatus;
  
  /** Git status information */
  gitStatus?: GitStatusInfo;
}

/**
 * Git status information
 */
export interface GitStatusInfo {
  /** Modified files */
  modified: string[];
  
  /** Added files */
  added: string[];
  
  /** Deleted files */
  deleted: string[];
  
  /** Untracked files */
  untracked: string[];
  
  /** Staged files */
  staged: string[];
  
  /** Conflicts */
  conflicts: string[];
}

/**
 * Resource lock for file access coordination
 */
export interface ResourceLock {
  /** Resource identifier (usually file path) */
  resource: string;
  
  /** Lock type */
  type: 'read' | 'write' | 'exclusive';
  
  /** Agent holding the lock */
  agentId: string;
  
  /** Lock acquisition time */
  acquiredAt: Date;
  
  /** Lock expiration time */
  expiresAt?: Date;
  
  /** Lock reason */
  reason?: string | undefined;
}

/**
 * Agent communication message
 */
export interface AgentMessage {
  /** Message identifier */
  id: string;
  
  /** Sender agent */
  from: string;
  
  /** Recipient agent (or 'broadcast' for all) */
  to: string;
  
  /** Message type */
  type: 'request' | 'response' | 'notification' | 'coordination';
  
  /** Message content */
  content: Record<string, unknown>;
  
  /** Timestamp */
  timestamp: Date;
  
  /** Reply to message ID */
  replyTo?: string;
  
  /** Message priority */
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * Multi-agent coordination event
 */
export interface CoordinationEvent {
  /** Event identifier */
  id: string;
  
  /** Event type */
  type: 'task-started' | 'task-completed' | 'task-failed' | 'resource-conflict' | 'merge-ready' | 'agent-error';
  
  /** Source agent */
  agentId: string;
  
  /** Event timestamp */
  timestamp: Date;
  
  /** Event data */
  data: Record<string, unknown>;
  
  /** Related task ID */
  taskId?: string;
  
  /** Requires coordination response */
  requiresResponse?: boolean;
}

/**
 * Multi-agent execution status
 */
export type MultiAgentStatus = 
  | 'initializing'
  | 'running'
  | 'coordinating'
  | 'merging'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Individual agent execution status
 */
export type AgentExecutionStatus = 
  | 'idle'
  | 'initializing'
  | 'working'
  | 'waiting'
  | 'blocked'
  | 'merging'
  | 'completed'
  | 'failed';

/**
 * Worktree status
 */
export type WorktreeStatus = 
  | 'active'
  | 'idle'
  | 'syncing'
  | 'conflicted'
  | 'ready-for-merge'
  | 'merged'
  | 'abandoned';

/**
 * Agent error information
 */
export interface AgentError {
  /** Error identifier */
  id: string;
  
  /** Agent that encountered the error */
  agentId: string;
  
  /** Error type */
  type: 'task-error' | 'resource-conflict' | 'communication-error' | 'git-error' | 'system-error';
  
  /** Error message */
  message: string;
  
  /** Error details */
  details?: Record<string, unknown>;
  
  /** Stack trace */
  stack?: string;
  
  /** Timestamp */
  timestamp: Date;
  
  /** Recovery action taken */
  recoveryAction?: string;
  
  /** Whether error was resolved */
  resolved: boolean;
}

/**
 * Coordination strategy
 */
export interface CoordinationStrategy {
  /** Strategy name */
  name: string;
  
  /** Resource conflict resolution */
  resourceConflictResolution: 'queue' | 'abort' | 'retry' | 'delegate';
  
  /** Task scheduling approach */
  taskScheduling: 'priority' | 'fifo' | 'shortest-first' | 'dependency-first';
  
  /** Communication pattern */
  communicationPattern: 'direct' | 'broadcast' | 'hierarchical' | 'event-driven';
  
  /** Merge coordination */
  mergeCoordination: 'sequential' | 'parallel' | 'dependency-based' | 'manual';
  
  /** Error handling strategy */
  errorHandling: 'fail-fast' | 'continue' | 'retry' | 'escalate';
}

/**
 * Multi-agent metrics
 */
export interface MultiAgentMetrics {
  /** Total execution time */
  totalExecutionTime: number;
  
  /** Parallel efficiency ratio */
  parallelEfficiency: number;
  
  /** Resource conflict count */
  resourceConflicts: number;
  
  /** Communication message count */
  messageCount: number;
  
  /** Task completion rate */
  taskCompletionRate: number;
  
  /** Error rate */
  errorRate: number;
  
  /** Average task duration */
  averageTaskDuration: number;
  
  /** Merge conflict count */
  mergeConflicts: number;
}