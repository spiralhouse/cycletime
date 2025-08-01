/**
 * Configuration type definitions for JCVD framework
 */

/**
 * Main JCVD configuration interface
 */
export interface JCVDConfig {
  /** Framework metadata */
  name: string;
  version: string;
  
  /** Database configuration */
  database: DatabaseConfig;
  
  /** Logging configuration */
  logging: LoggingConfig;
  
  /** Task coordination configuration */
  taskCoordination: TaskCoordinationConfig;
  
  /** Provider configurations */
  providers: ProviderConfig[];
  
  /** Workflow configurations */
  workflows: WorkflowConfig[];
  
  /** MCP server configuration */
  mcp?: MCPConfig;
  
  /** Feature flags */
  features?: FeatureFlags;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  /** Database file path (SQLite) */
  path: string;
  
  /** Enable WAL mode for better concurrency */
  walMode: boolean;
  
  /** Migration settings */
  migrations: {
    /** Auto-run migrations on startup */
    autoRun: boolean;
    /** Migration directory */
    directory: string;
  };
  
  /** Backup settings */
  backup?: {
    /** Enable automatic backups */
    enabled: boolean;
    /** Backup interval in minutes */
    interval: number;
    /** Number of backups to retain */
    retention: number;
    /** Backup directory */
    directory: string;
  };
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
  
  /** Log format */
  format: 'json' | 'pretty';
  
  /** Log outputs */
  outputs: LogOutput[];
  
  /** Structured logging context */
  context?: Record<string, unknown>;
}

export interface LogOutput {
  type: 'console' | 'file' | 'http';
  config: ConsoleLogConfig | FileLogConfig | HttpLogConfig;
}

export interface ConsoleLogConfig {
  colors: boolean;
}

export interface FileLogConfig {
  path: string;
  maxSize: string; // e.g., "10MB"
  maxFiles: number;
}

export interface HttpLogConfig {
  url: string;
  headers?: Record<string, string>;
}

/**
 * Task coordination configuration
 */
export interface TaskCoordinationConfig {
  /** Default agent to use for tasks */
  defaultAgent: string;
  
  /** Fallback agent when default is unavailable */
  fallbackAgent: string;
  
  /** Task routing rules */
  routing?: TaskRoutingRule[];
  
  /** Agent preferences */
  preferences?: Record<string, AgentPreference>;
  
  /** Parallel execution configuration */
  parallel?: ParallelExecutionConfig;
  
  /** Branch-specific coordination */
  branches?: BranchCoordinationConfig;
}

/**
 * Task routing rule
 */
export interface TaskRoutingRule {
  /** Task type pattern */
  taskType: string;
  
  /** Preferred agent for this task type */
  agent: string;
  
  /** Priority (higher numbers take precedence) */
  priority: number;
  
  /** Conditions for this rule */
  conditions?: Record<string, unknown>;
}

/**
 * Agent preference configuration
 */
export interface AgentPreference {
  /** Whether to use this agent */
  enabled: boolean;
  
  /** Agent-specific parameters */
  parameters?: Record<string, unknown>;
  
  /** Timeout for agent tasks in minutes */
  timeout?: number;
  
  /** Git worktree workspace path for this agent */
  workspacePath?: string;
  
  /** Maximum concurrent tasks for this agent */
  maxConcurrentTasks?: number;
}

/**
 * Parallel execution configuration
 */
export interface ParallelExecutionConfig {
  /** Enable parallel agent execution */
  enabled: boolean;
  
  /** Maximum number of concurrent agents */
  maxConcurrentAgents: number;
  
  /** Git worktree configuration */
  worktree: GitWorktreeConfig;
  
  /** Conflict resolution strategy */
  conflictResolution: 'manual' | 'auto' | 'agent-priority';
  
  /** Inter-agent communication settings */
  communication?: AgentCommunicationConfig;
}

/**
 * Git worktree configuration
 */
export interface GitWorktreeConfig {
  /** Base directory for worktrees */
  baseDir: string;
  
  /** Worktree naming pattern */
  namingPattern: string; // e.g., "agent-{agent}-{task-id}"
  
  /** Auto-cleanup idle worktrees after minutes */
  autoCleanupAfter?: number;
  
  /** Keep shared files in sync across worktrees */
  syncSharedFiles?: string[];
}

/**
 * Agent communication configuration
 */
export interface AgentCommunicationConfig {
  /** Enable agent-to-agent messaging */
  enabled: boolean;
  
  /** Message broker type */
  broker: 'memory' | 'redis' | 'file';
  
  /** Broker-specific configuration */
  brokerConfig?: Record<string, unknown>;
  
  /** Message timeout in seconds */
  messageTimeout?: number;
}

/**
 * Branch coordination configuration
 */
export interface BranchCoordinationConfig {
  /** Branch naming strategy */
  naming: BranchNamingConfig;
  
  /** Agent-to-branch assignment rules */
  assignments: AgentBranchAssignment[];
  
  /** Merge strategy */
  mergeStrategy: 'sequential' | 'parallel' | 'feature-branch';
  
  /** Branch protection rules */
  protection?: BranchProtectionConfig;
}

/**
 * Branch naming configuration
 */
export interface BranchNamingConfig {
  /** Branch prefix pattern */
  prefix: string; // e.g., "feature/agent"
  
  /** Include agent name in branch */
  includeAgent: boolean;
  
  /** Include task ID in branch */
  includeTaskId: boolean;
  
  /** Custom naming template */
  template?: string; // e.g., "{prefix}/{agent}/{task-type}-{task-id}"
}

/**
 * Agent branch assignment
 */
export interface AgentBranchAssignment {
  /** Agent identifier */
  agent: string;
  
  /** Branch pattern this agent can work on */
  branchPattern: string;
  
  /** File patterns this agent can modify */
  filePatterns?: string[];
  
  /** Priority for this assignment */
  priority: number;
  
  /** Exclusive access to these patterns */
  exclusive?: boolean;
}

/**
 * Branch protection configuration
 */
export interface BranchProtectionConfig {
  /** Require approval before merge */
  requireApproval: boolean;
  
  /** Reviewer agent */
  reviewer?: string;
  
  /** Files that require special approval */
  protectedFiles?: string[];
  
  /** Auto-merge conditions */
  autoMerge?: AutoMergeConfig;
}

/**
 * Auto-merge configuration
 */
export interface AutoMergeConfig {
  /** Enable auto-merge */
  enabled: boolean;
  
  /** Conditions that must be met */
  conditions: AutoMergeCondition[];
  
  /** Merge method */
  method: 'merge' | 'squash' | 'rebase';
}

/**
 * Auto-merge condition
 */
export interface AutoMergeCondition {
  /** Condition type */
  type: 'tests-pass' | 'agent-approval' | 'no-conflicts' | 'custom';
  
  /** Condition configuration */
  config?: Record<string, unknown>;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** Unique provider identifier */
  id: string;
  
  /** Provider type */
  type: 'linear' | 'github' | 'local' | string;
  
  /** Provider display name */
  name: string;
  
  /** Provider description */
  description?: string;
  
  /** Whether provider is enabled */
  enabled: boolean;
  
  /** Provider-specific configuration */
  config: LinearProviderConfig | GitHubProviderConfig | LocalProviderConfig | Record<string, unknown>;
  
  /** Sync settings */
  sync?: {
    /** Enable automatic sync */
    enabled: boolean;
    /** Sync interval in minutes */
    interval: number;
    /** Sync direction */
    direction: 'pull' | 'push' | 'bidirectional';
  };
}

/**
 * Linear provider configuration
 */
export interface LinearProviderConfig {
  /** Linear API key */
  apiKey: string;
  
  /** Team ID */
  teamId: string;
  
  /** Project ID (optional) */
  projectId?: string;
  
  /** Workspace URL */
  workspaceUrl?: string;
}

/**
 * GitHub provider configuration
 */
export interface GitHubProviderConfig {
  /** GitHub token */
  token: string;
  
  /** Repository owner */
  owner: string;
  
  /** Repository name */
  repo: string;
  
  /** Base branch */
  baseBranch?: string;
}

/**
 * Local provider configuration
 */
export interface LocalProviderConfig {
  /** Project root directory */
  rootDir: string;
  
  /** Include patterns */
  include?: string[];
  
  /** Exclude patterns */
  exclude?: string[];
}

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  /** Unique workflow identifier */
  id: string;
  
  /** Workflow name */
  name: string;
  
  /** Workflow description */
  description?: string;
  
  /** Whether workflow is enabled */
  enabled: boolean;
  
  /** Workflow triggers */
  triggers: WorkflowTrigger[];
  
  /** Workflow stages */
  stages: WorkflowStage[];
  
  /** Workflow variables */
  variables?: Record<string, unknown>;
}

/**
 * Workflow trigger
 */
export interface WorkflowTrigger {
  /** Trigger type */
  type: 'manual' | 'schedule' | 'event' | 'webhook';
  
  /** Trigger configuration */
  config: ManualTriggerConfig | ScheduleTriggerConfig | EventTriggerConfig | WebhookTriggerConfig;
}

export interface ManualTriggerConfig {
  /** Allowed users/roles */
  allowedUsers?: string[];
}

export interface ScheduleTriggerConfig {
  /** Cron expression */
  cron: string;
  /** Timezone */
  timezone?: string;
}

export interface EventTriggerConfig {
  /** Event type to listen for */
  eventType: string;
  /** Event source filter */
  source?: string;
}

export interface WebhookTriggerConfig {
  /** Webhook path */
  path: string;
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Authentication */
  auth?: 'none' | 'basic' | 'bearer' | 'api-key';
}

/**
 * Workflow stage
 */
export interface WorkflowStage {
  /** Stage identifier */
  id: string;
  
  /** Stage name */
  name: string;
  
  /** Claude Code agent to execute this stage */
  agent: string;
  
  /** Stage inputs */
  inputs?: Record<string, unknown>;
  
  /** Stage conditions */
  conditions?: WorkflowCondition[];
  
  /** Stage timeout in minutes */
  timeout?: number;
  
  /** Whether stage can be skipped */
  optional?: boolean;
  
  /** Parallel execution settings */
  parallel?: StageParallelConfig;
  
  /** Git branch requirements */
  branch?: StageBranchConfig;
}

/**
 * Stage parallel execution configuration
 */
export interface StageParallelConfig {
  /** Can this stage run in parallel with others */
  enabled: boolean;
  
  /** Stages this stage can run parallel with */
  compatibleWith?: string[];
  
  /** Stages this stage conflicts with */
  conflictsWith?: string[];
  
  /** Resource requirements */
  resources?: StageResourceRequirements;
}

/**
 * Stage resource requirements
 */
export interface StageResourceRequirements {
  /** Files this stage needs exclusive access to */
  exclusiveFiles?: string[];
  
  /** Files this stage needs read access to */
  readFiles?: string[];
  
  /** Services this stage depends on */
  services?: string[];
}

/**
 * Stage branch configuration
 */
export interface StageBranchConfig {
  /** Required branch pattern */
  pattern?: string;
  
  /** Create new branch for this stage */
  createBranch?: boolean;
  
  /** Branch naming template */
  branchTemplate?: string;
  
  /** Merge back to source after completion */
  autoMergeBack?: boolean;
  
  /** Clean up branch after merge */
  cleanupBranch?: boolean;
}

/**
 * Workflow condition
 */
export interface WorkflowCondition {
  /** Condition type */
  type: 'variable' | 'agent-status' | 'provider-status' | 'expression';
  
  /** Condition configuration */
  config: Record<string, unknown>;
}

/**
 * MCP server configuration
 */
export interface MCPConfig {
  /** Server port */
  port: number;
  
  /** Server host */
  host: string;
  
  /** Enable authentication */
  auth: boolean;
  
  /** API key for authentication */
  apiKey?: string;
  
  /** Allowed origins for CORS */
  allowedOrigins?: string[];
  
  /** Enable request logging */
  requestLogging: boolean;
}

/**
 * Feature flags
 */
export interface FeatureFlags {
  /** Enable experimental features */
  experimental: boolean;
  
  /** Enable performance monitoring */
  monitoring: boolean;
  
  /** Enable distributed tracing */
  tracing: boolean;
  
  /** Enable metrics collection */
  metrics: boolean;
  
  /** Enable health checks */
  healthChecks: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: JCVDConfig = {
  name: 'JCVD Framework',
  version: '0.1.0',
  database: {
    path: './jcvd.db',
    walMode: true,
    migrations: {
      autoRun: true,
      directory: './migrations'
    }
  },
  logging: {
    level: 'info',
    format: 'pretty',
    outputs: [
      {
        type: 'console',
        config: { colors: true }
      }
    ]
  },
  taskCoordination: {
    defaultAgent: 'developer',
    fallbackAgent: 'general-purpose',
    parallel: {
      enabled: true,
      maxConcurrentAgents: 3,
      worktree: {
        baseDir: './.jcvd/worktrees',
        namingPattern: 'agent-{agent}-{timestamp}',
        autoCleanupAfter: 60,
        syncSharedFiles: ['package.json', 'tsconfig.json', '.env', 'CLAUDE.md']
      },
      conflictResolution: 'manual',
      communication: {
        enabled: true,
        broker: 'file',
        brokerConfig: {
          messagePath: './.jcvd/messages'
        },
        messageTimeout: 30
      }
    },
    branches: {
      naming: {
        prefix: 'feature/agent',
        includeAgent: true,
        includeTaskId: true,
        template: '{prefix}/{agent}/{task-type}-{task-id}'
      },
      assignments: [
        {
          agent: 'developer',
          branchPattern: 'feature/agent/developer/*',
          filePatterns: ['src/**/*.ts', 'tests/**/*.ts'],
          priority: 1,
          exclusive: false
        },
        {
          agent: 'qa',
          branchPattern: 'feature/agent/qa/*',
          filePatterns: ['tests/**/*.ts', 'docs/testing/**/*.md'],
          priority: 1,
          exclusive: false
        },
        {
          agent: 'code-reviewer',
          branchPattern: 'review/*',
          filePatterns: ['**/*'],
          priority: 2,
          exclusive: false
        }
      ],
      mergeStrategy: 'feature-branch',
      protection: {
        requireApproval: true,
        reviewer: 'code-reviewer',
        protectedFiles: ['package.json', 'tsconfig.json', 'src/types/**/*.ts'],
        autoMerge: {
          enabled: true,
          conditions: [
            { type: 'tests-pass' },
            { type: 'agent-approval', config: { agent: 'code-reviewer' } },
            { type: 'no-conflicts' }
          ],
          method: 'squash'
        }
      }
    }
  },
  providers: [],
  workflows: [],
  mcp: {
    port: 3001,
    host: 'localhost',
    auth: false,
    requestLogging: true
  },
  features: {
    experimental: false,
    monitoring: false,
    tracing: false,
    metrics: false,
    healthChecks: true
  }
};