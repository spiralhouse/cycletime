/**
 * MCP Resource Type Definitions
 * Defines the core interfaces and types for the MCP resource system
 */

/**
 * Content returned when reading a resource
 */
export interface ResourceContent {
  /** The URI of the resource */
  uri: string;
  /** The MIME type of the content */
  mimeType: string;
  /** The actual content as a string */
  text: string;
}

/**
 * Individual resource item in a list result
 */
export interface ResourceListItem {
  /** The URI of the resource */
  uri: string;
  /** Human-readable name of the resource */
  name: string;
  /** Description of the resource */
  description: string;
  /** Optional MIME type */
  mimeType?: string;
}

/**
 * Result returned when listing resources
 */
export interface ResourceListResult {
  /** Array of resources */
  resources: ResourceListItem[];
  /** Optional cursor for pagination */
  nextCursor?: string;
}

/**
 * Handler interface for resource operations
 */
export interface ResourceHandler {
  /**
   * List available resources
   * @param cursor - Optional cursor for pagination
   * @param limit - Optional limit on number of results
   */
  list(cursor?: string, limit?: number): Promise<ResourceListResult>;
  
  /**
   * Read a specific resource by URI
   * @param uri - The URI of the resource to read
   */
  read(uri: string): Promise<ResourceContent>;
}

/**
 * Descriptor for a registered resource
 */
export interface ResourceDescriptor {
  /** Unique type identifier for the resource */
  type: string;
  /** Human-readable name */
  name: string;
  /** Description of what the resource provides */
  description: string;
  /** Optional default MIME type */
  mimeType?: string;
  /** Handler that implements resource operations */
  handler: ResourceHandler;
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * MCP Protocol Request for resources
 */
export interface MCPResourceRequest {
  method: 'resources/list' | 'resources/read';
  params: {
    uri?: string;
    cursor?: string;
    limit?: number;
  };
}

/**
 * MCP Protocol Response for resources
 */
export interface MCPResourceResponse {
  success: boolean;
  result?: ResourceListResult | ResourceContent;
  error?: MCPError;
}

/**
 * MCP Error structure
 */
export interface MCPError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Standard MCP Error codes
 */
export enum ErrorCodes {
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_URI = 'INVALID_URI',
  
  // Resource Errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_ACCESS_DENIED = 'RESOURCE_ACCESS_DENIED',
  
  // System Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
}