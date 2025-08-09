/**
 * JCVD MCP Framework
 *
 * Complete Model Context Protocol implementation with integrated
 * resource framework for exposing JCVD project data to Claude Code.
 */

// Core MCP Server
export {
  MCPServer,
  type MCPCapabilities,
  type ServerStatus,
  type HealthInfo,
  type ServerEvents,
  type ConfigUpdateOptions,
} from './server/mcp-server.js';

// Resource-enabled MCP Server
export {
  ResourceServer,
  type ResourceServerConfig,
  type ResourceServerEvents,
} from './server/resource-server.js';

// Server Infrastructure
export {
  MessageRouter,
  type RequestHandler,
  type NotificationHandler,
  type RequestMiddleware,
  type NotificationMiddleware,
  type RouterStatistics,
} from './server/message-router.js';

export {
  ProtocolHandler,
  type JSONRPCRequest,
  type JSONRPCResponse,
  type JSONRPCNotification,
  type JSONRPCError,
  type ValidationResult,
} from './server/protocol-handler.js';

export {
  ServerLifecycle,
  type ServerConfig,
  type OperationResult,
} from './server/server-lifecycle.js';

// Resource Handlers
export {
  ResourceHandler,
  type ResourceListParams,
  type ResourceReadParams,
  type ResourceSubscribeParams,
  type ResourceListResponse,
  type ResourceReadResponse,
} from './handlers/resource-handler.js';

// Resource Framework (re-export from resources/index.ts)
export * from './resources/index.js';
