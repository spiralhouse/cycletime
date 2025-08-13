/**
 * BaseResource Abstract Class
 * Provides base functionality for all MCP resources
 */

import type { ResourceContent, ResourceListResult } from './types.js';
import { InvalidUriError } from './errors.js';

/**
 * Abstract base class for MCP resources
 * All resources must extend this class and implement the abstract methods
 */
export abstract class BaseResource {
  /**
   * Unique type identifier for the resource
   */
  abstract readonly type: string;
  
  /**
   * Human-readable name of the resource
   */
  abstract readonly name: string;
  
  /**
   * Description of what the resource provides
   */
  abstract readonly description: string;

  /**
   * List available resources
   * @param cursor - Optional cursor for pagination
   * @param limit - Optional limit on number of results
   */
  abstract list(cursor?: string, limit?: number): Promise<ResourceListResult>;
  
  /**
   * Read a specific resource by URI
   * @param uri - The URI of the resource to read
   */
  abstract read(uri: string): Promise<ResourceContent>;

  /**
   * Validate that a URI matches this resource's type
   * @param uri - The URI to validate
   * @returns true if the URI is valid for this resource type
   */
  protected validateUri(uri: string): boolean {
    if (!uri || typeof uri !== 'string') {
      return false;
    }
    
    // Check if URI starts with the resource type followed by ://
    const prefix = `${this.type}://`;
    return uri.startsWith(prefix);
  }

  /**
   * Extract the resource ID from a URI
   * @param uri - The URI to parse
   * @returns The resource ID or null if invalid
   */
  protected extractResourceId(uri: string): string | null {
    if (!this.validateUri(uri)) {
      return null;
    }
    
    const prefix = `${this.type}://`;
    const resourceId = uri.substring(prefix.length);
    
    // Return null if resource ID is empty
    return resourceId || null;
  }

  /**
   * Build a URI for this resource type
   * @param resourceId - The ID of the resource
   * @returns The complete URI
   */
  protected buildUri(resourceId: string): string {
    return `${this.type}://${resourceId}`;
  }

  /**
   * Validate and throw error if URI is invalid
   * @param uri - The URI to validate
   * @throws InvalidUriError if the URI is invalid
   */
  protected ensureValidUri(uri: string): void {
    if (!this.validateUri(uri)) {
      throw new InvalidUriError(uri, `URI must start with '${this.type}://'`);
    }
  }

  /**
   * Parse URI parameters (for complex URIs like jcvd://project/123/context)
   * @param uri - The URI to parse
   * @returns Object with parsed components
   */
  protected parseUri(uri: string): { base: string; segments: string[] } | null {
    if (!this.validateUri(uri)) {
      return null;
    }
    
    const prefix = `${this.type}://`;
    const path = uri.substring(prefix.length);
    const segments = path.split('/').filter(s => s.length > 0);
    
    return {
      base: segments[0] || '',
      segments: segments.slice(1),
    };
  }
}