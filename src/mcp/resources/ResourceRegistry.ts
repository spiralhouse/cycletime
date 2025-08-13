/**
 * ResourceRegistry Class
 * Manages registration and discovery of MCP resources
 */

import type { ResourceDescriptor } from './types';
import { ResourceValidationError, ResourceConflictError } from './errors';

/**
 * Registry for managing MCP resources
 * Provides registration, deregistration, and discovery capabilities
 */
export class ResourceRegistry {
  private resources: Map<string, ResourceDescriptor>;

  constructor() {
    // Ensure each instance gets a fresh Map
    this.resources = new Map<string, ResourceDescriptor>();
  }

  /**
   * Register a new resource
   * @param resource - The resource descriptor to register
   * @throws ResourceValidationError if the descriptor is invalid
   * @throws ResourceConflictError if a resource with the same type already exists
   */
  register(resource: ResourceDescriptor): void {
    // Validate required fields
    if (!resource.type || !resource.name || !resource.description) {
      throw new ResourceValidationError(
        'Invalid resource descriptor: type, name, and description are required',
        { 
          type: resource.type, 
          name: resource.name, 
          description: resource.description 
        }
      );
    }

    // Check for duplicate registration
    if (this.resources.has(resource.type)) {
      throw new ResourceConflictError(resource.type);
    }

    // Validate handler
    if (!resource.handler || typeof resource.handler.list !== 'function' || typeof resource.handler.read !== 'function') {
      throw new ResourceValidationError(
        'Invalid resource handler: must implement list and read methods',
        { type: resource.type }
      );
    }

    // Register the resource
    this.resources.set(resource.type, resource);
  }

  /**
   * Unregister a resource
   * @param type - The type of the resource to unregister
   * @returns true if the resource was unregistered, false if it didn't exist
   */
  unregister(type: string): boolean {
    if (!type) {
      return false;
    }
    return this.resources.delete(type);
  }

  /**
   * List all registered resources
   * @returns Array of all registered resource descriptors
   */
  list(): ResourceDescriptor[] {
    return Array.from(this.resources.values());
  }

  /**
   * Get a specific resource by type
   * @param type - The type of the resource to retrieve
   * @returns The resource descriptor or undefined if not found
   */
  get(type: string): ResourceDescriptor | undefined {
    if (!type) {
      return undefined;
    }
    return this.resources.get(type);
  }

  /**
   * Check if a resource type is registered
   * @param type - The type to check
   * @returns true if the resource type is registered
   */
  has(type: string): boolean {
    if (!type) {
      return false;
    }
    return this.resources.has(type);
  }

  /**
   * Clear all registered resources
   */
  clear(): void {
    this.resources.clear();
  }

  /**
   * Get the number of registered resources
   */
  get size(): number {
    return this.resources.size;
  }

  /**
   * Get all registered resource types
   * @returns Array of resource type strings
   */
  getTypes(): string[] {
    return Array.from(this.resources.keys());
  }

  /**
   * Find resources matching a filter
   * @param filter - Function to filter resources
   * @returns Array of matching resource descriptors
   */
  find(filter: (resource: ResourceDescriptor) => boolean): ResourceDescriptor[] {
    return this.list().filter(filter);
  }

  /**
   * Get resources by MIME type
   * @param mimeType - The MIME type to filter by
   * @returns Array of resources with the specified MIME type
   */
  getByMimeType(mimeType: string): ResourceDescriptor[] {
    return this.find(r => r.mimeType === mimeType);
  }
}