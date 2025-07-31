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
  
  /** Agent configurations */
  agents: AgentConfig[];
  
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
 * Agent configuration
 */
export interface AgentConfig {
  /** Unique agent identifier */
  id: string;
  
  /** Agent type */
  type: 'product-manager' | 'tech-lead' | 'architect' | 'developer' | 'qa' | 'devops' | 'release-engineer';
  
  /** Agent display name */
  name: string;
  
  /** Agent description */
  description?: string;
  
  /** Whether agent is enabled */
  enabled: boolean;
  
  /** Agent-specific configuration */
  config: Record<string, unknown>;
  
  /** Agent dependencies (other agent IDs) */
  dependencies?: string[];
  
  /** Agent capabilities */
  capabilities?: string[];
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
  
  /** Agent to execute this stage */
  agent: string;
  
  /** Stage inputs */
  inputs?: Record<string, unknown>;
  
  /** Stage conditions */
  conditions?: WorkflowCondition[];
  
  /** Stage timeout in minutes */
  timeout?: number;
  
  /** Whether stage can be skipped */
  optional?: boolean;
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
  agents: [],
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