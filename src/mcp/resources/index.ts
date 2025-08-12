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
} from './types';

export { ErrorCodes } from './types';

// Export error classes
export {
  ResourceError,
  ResourceValidationError,
  InvalidUriError,
  ResourceNotFoundError,
  ResourceConflictError,
  ResourceAccessDeniedError,
  InternalResourceError,
} from './errors';

// Export base classes
export { BaseResource } from './BaseResource';
export { ResourceRegistry } from './ResourceRegistry';