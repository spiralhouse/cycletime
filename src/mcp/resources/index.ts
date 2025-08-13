/**
 * MCP Resources Module
 * Main export file for all resource-related types and classes
 */

// Export all types
export type {
  ResourceContent,
  ResourceListItem,
  ResourceListResult,
  ResourceHandler,
  ResourceDescriptor,
  MCPResourceRequest,
  MCPResourceResponse,
  MCPError,
} from './types.js';

export { ErrorCodes } from './types.js';

// Export error classes
export {
  ResourceError,
  ResourceValidationError,
  InvalidUriError,
  ResourceNotFoundError,
  ResourceConflictError,
  ResourceAccessDeniedError,
  InternalResourceError,
} from './errors.js';

// Export base classes
export { BaseResource } from './BaseResource.js';
export { ResourceRegistry } from './ResourceRegistry.js';