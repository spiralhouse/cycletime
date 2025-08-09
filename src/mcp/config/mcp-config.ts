/**
 * MCP-specific configuration types and schema
 * Extends the existing JCVD configuration system with MCP server specifics
 */

import type { ProviderConfig } from '../../types/config.js';

/**
 * Transport types supported by MCP server
 */
export type MCPTransport = 'stdio' | 'websocket';

/**
 * Provider type for MCP configuration
 */
export type MCPProviderType = 'sqlite' | 'linear' | 'github' | 'jira';

/**
 * MCP Server configuration interface
 */
export interface MCPServerConfig {
  /** Basic server settings */
  server: {
    /** Server name */
    name: string;
    /** Server version */
    version: string;
    /** Server port (required for websocket transport) */
    port?: number;
    /** Transport protocol */
    transport: MCPTransport;
  };

  /** Resource configuration */
  resources: {
    /** Enable resource support */
    enabled: boolean;
    /** Resource cache size */
    cacheSize?: number;
    /** Resource cache TTL in seconds */
    cacheTTL?: number;
  };

  /** Tool configuration */
  tools: {
    /** Enable tool support */
    enabled: boolean;
    /** Enable tool validation */
    validationEnabled: boolean;
    /** Tool execution timeout in milliseconds */
    executionTimeout?: number;
  };

  /** Health and monitoring configuration */
  health: {
    /** Health check interval in milliseconds */
    checkInterval?: number;
    /** Health check timeout in milliseconds */
    timeoutMs?: number;
  };

  /** Provider integration configuration */
  provider: {
    /** Provider type */
    type: MCPProviderType;
    /** Provider-specific configuration */
    config: ProviderConfig | Record<string, unknown>;
  };
}

/**
 * Default MCP server configuration for development
 */
export const DEFAULT_MCP_CONFIG: MCPServerConfig = {
  server: {
    name: 'jcvd-mcp-server',
    version: '1.0.0',
    transport: 'stdio',
  },
  resources: {
    enabled: true,
    cacheSize: 1000,
    cacheTTL: 300, // 5 minutes
  },
  tools: {
    enabled: true,
    validationEnabled: true,
    executionTimeout: 30_000, // 30 seconds
  },
  health: {
    checkInterval: 30_000, // 30 seconds
    timeoutMs: 5000, // 5 seconds
  },
  provider: {
    type: 'sqlite',
    config: {
      database: './jcvd.db',
    },
  },
};

/**
 * Production MCP server configuration
 */
export const PRODUCTION_MCP_CONFIG: Partial<MCPServerConfig> = {
  server: {
    name: 'jcvd-mcp-server-prod',
    version: '1.0.0',
    transport: 'websocket',
    port: 8080,
  },
  resources: {
    enabled: true,
    cacheSize: 10_000,
    cacheTTL: 600, // 10 minutes
  },
  tools: {
    enabled: true,
    validationEnabled: true,
    executionTimeout: 60_000, // 60 seconds
  },
  health: {
    checkInterval: 15_000, // 15 seconds
    timeoutMs: 3000, // 3 seconds
  },
};

/**
 * Environment variable mapping for MCP configuration
 */
export const MCP_ENV_VAR_MAPPING = {
  JCVD_MCP_SERVER_NAME: 'server.name',
  JCVD_MCP_SERVER_VERSION: 'server.version',
  JCVD_MCP_TRANSPORT: 'server.transport',
  JCVD_MCP_PORT: 'server.port',
  JCVD_MCP_RESOURCES_ENABLED: 'resources.enabled',
  JCVD_MCP_RESOURCES_CACHE_SIZE: 'resources.cacheSize',
  JCVD_MCP_RESOURCES_CACHE_TTL: 'resources.cacheTTL',
  JCVD_MCP_TOOLS_ENABLED: 'tools.enabled',
  JCVD_MCP_TOOLS_VALIDATION_ENABLED: 'tools.validationEnabled',
  JCVD_MCP_TOOLS_EXECUTION_TIMEOUT: 'tools.executionTimeout',
  JCVD_MCP_HEALTH_CHECK_INTERVAL: 'health.checkInterval',
  JCVD_MCP_HEALTH_TIMEOUT: 'health.timeoutMs',
} as const;

/**
 * Validation helper for MCPServerConfig
 */
export function isValidMCPConfig(config: unknown): config is MCPServerConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const c = config as any;

  // Validate server configuration
  if (!c.server || typeof c.server !== 'object') {
    return false;
  }

  if (!c.server.name || typeof c.server.name !== 'string') {
    return false;
  }

  if (!c.server.version || typeof c.server.version !== 'string') {
    return false;
  }

  if (!c.server.transport || !['stdio', 'websocket'].includes(c.server.transport)) {
    return false;
  }

  // Validate websocket transport requires port
  if (c.server.transport === 'websocket') {
    if (!c.server.port || typeof c.server.port !== 'number') {
      return false;
    }
  }

  // Validate resources configuration
  if (!c.resources || typeof c.resources !== 'object') {
    return false;
  }

  if (typeof c.resources.enabled !== 'boolean') {
    return false;
  }

  // Validate tools configuration
  if (!c.tools || typeof c.tools !== 'object') {
    return false;
  }

  if (typeof c.tools.enabled !== 'boolean') {
    return false;
  }

  if (typeof c.tools.validationEnabled !== 'boolean') {
    return false;
  }

  // Validate health configuration
  if (!c.health || typeof c.health !== 'object') {
    return false;
  }

  // Validate provider configuration
  if (!c.provider || typeof c.provider !== 'object') {
    return false;
  }

  if (!c.provider.type || !['sqlite', 'linear', 'github', 'jira'].includes(c.provider.type)) {
    return false;
  }

  if (!c.provider.config || typeof c.provider.config !== 'object') {
    return false;
  }

  return true;
}
