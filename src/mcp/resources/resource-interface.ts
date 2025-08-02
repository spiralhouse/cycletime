/**
 * MCP Resource Interface Definitions
 * 
 * Defines the core contracts for JCVD MCP resources following the MCP specification.
 * Resources provide structured project data to Claude Code through URI-based access.
 */

/**
 * Resource capability types that define what operations are supported
 */
export type ResourceCapability = 'read' | 'write' | 'subscribe';

/**
 * Resource metadata containing descriptive information and capabilities
 */
export interface ResourceMetadata {
  /** Human-readable resource name */
  name: string;
  
  /** Detailed description of the resource's purpose and content */
  description: string;
  
  /** MIME type of the content returned by this resource */
  contentType: string;
  
  /** Resource version for compatibility tracking */
  version: string;
  
  /** List of operations this resource supports */
  capabilities: ResourceCapability[];
  
  /** Optional tags for categorization and discovery */
  tags?: string[];
  
  /** Last modification timestamp for cache validation */
  lastModified?: Date;
  
  /** Cache TTL in seconds (undefined means no caching) */
  ttl?: number;
}

/**
 * Content returned by a resource including metadata
 */
export interface ResourceContent {
  /** The actual resource content (JSON object, string, etc.) */
  content: any;
  
  /** MIME type of the content */
  contentType: string;
  
  /** Size of the content in bytes */
  size: number;
  
  /** Optional ETag for cache validation */
  etag?: string;
  
  /** Optional last modified timestamp */
  lastModified?: Date;
}

/**
 * Core Resource interface that all JCVD resources must implement
 */
export interface Resource {
  /** Unique resource URI following jcvd://project/{projectId}/{resourceType} pattern */
  uri: string;
  
  /** Resource metadata including capabilities and content type */
  metadata: ResourceMetadata;
  
  /**
   * Get the current content of this resource
   * @returns Promise that resolves to the resource content
   * @throws Error if resource is not available or content cannot be generated
   */
  getContent(): Promise<ResourceContent>;
  
  /**
   * Check if this resource is currently available
   * @returns Promise that resolves to true if resource can provide content
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Invalidate any cached content for this resource
   * @returns Promise that resolves when cache is cleared
   */
  invalidate(): Promise<void>;
}

/**
 * Extended resource interface for resources that support real-time updates
 */
export interface SubscribableResource extends Resource {
  /**
   * Subscribe to resource changes
   * @param callback Function called when resource content changes
   * @returns Unsubscribe function
   */
  subscribe(callback: (content: ResourceContent) => void): () => void;
  
  /**
   * Get the current number of active subscriptions
   */
  getSubscriberCount(): number;
}

/**
 * Extended resource interface for resources that support modifications
 */
export interface WritableResource extends Resource {
  /**
   * Update the resource content
   * @param content New content to set
   * @returns Promise that resolves when content is updated
   * @throws Error if update fails or is not permitted
   */
  updateContent(content: any): Promise<void>;
  
  /**
   * Validate if the given content is acceptable for this resource
   * @param content Content to validate
   * @returns Validation result with success flag and optional error message
   */
  validateContent(content: any): Promise<{ valid: boolean; error?: string }>;
}

/**
 * Resource factory function type for creating resource instances
 */
export type ResourceFactory = (projectId: string, ...args: any[]) => Promise<Resource>;

/**
 * Resource URI utilities for parsing and validating JCVD resource URIs
 */
export class ResourceURI {
  private static readonly URI_PATTERN = /^jcvd:\/\/project\/([\w-]+)\/([\w\/-]+)$/;
  
  /**
   * Parse a JCVD resource URI into its components
   * @param uri Resource URI to parse
   * @returns Parsed URI components or null if invalid
   */
  static parse(uri: string): { projectId: string; resourcePath: string } | null {
    const match = uri.match(this.URI_PATTERN);
    if (!match) {
      return null;
    }
    
    return {
      projectId: match[1]!,
      resourcePath: match[2]!
    };
  }
  
  /**
   * Validate if a URI follows the JCVD resource URI pattern
   * @param uri URI to validate
   * @returns True if URI is valid
   */
  static isValid(uri: string): boolean {
    return this.URI_PATTERN.test(uri);
  }
  
  /**
   * Create a JCVD resource URI from components
   * @param projectId Project identifier
   * @param resourcePath Resource path within the project
   * @returns Formatted resource URI
   */
  static create(projectId: string, resourcePath: string): string {
    return `jcvd://project/${projectId}/${resourcePath}`;
  }
  
  /**
   * Extract project ID from a resource URI
   * @param uri Resource URI
   * @returns Project ID or null if URI is invalid
   */
  static getProjectId(uri: string): string | null {
    const parsed = this.parse(uri);
    return parsed?.projectId || null;
  }
  
  /**
   * Extract resource path from a resource URI
   * @param uri Resource URI
   * @returns Resource path or null if URI is invalid
   */
  static getResourcePath(uri: string): string | null {
    const parsed = this.parse(uri);
    return parsed?.resourcePath || null;
  }
}

/**
 * Error types for resource operations
 */
export class ResourceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly uri?: string
  ) {
    super(message);
    this.name = 'ResourceError';
  }
}

export class ResourceNotFoundError extends ResourceError {
  constructor(uri: string) {
    super(`Resource not found: ${uri}`, 'RESOURCE_NOT_FOUND', uri);
    this.name = 'ResourceNotFoundError';
  }
}

export class ResourceUnavailableError extends ResourceError {
  constructor(uri: string, reason?: string) {
    super(
      `Resource unavailable: ${uri}${reason ? ` (${reason})` : ''}`,
      'RESOURCE_UNAVAILABLE',
      uri
    );
    this.name = 'ResourceUnavailableError';
  }
}

export class InvalidResourceURIError extends ResourceError {
  constructor(uri: string) {
    super(`Invalid resource URI: ${uri}`, 'INVALID_URI', uri);
    this.name = 'InvalidResourceURIError';
  }
}