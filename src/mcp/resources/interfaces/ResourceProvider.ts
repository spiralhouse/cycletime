/**
 * Resource Provider Interface
 * Defines the contract for managing resource storage and retrieval
 */

import type { ResourceDescriptor } from '../types.js';

/**
 * Provider interface for resource storage operations
 * Supports different backends (in-memory, database, etc.)
 */
export interface ResourceProvider {
  /**
   * Register a new resource
   * @param descriptor - The resource descriptor to register
   * @throws ResourceConflictError if resource already exists
   * @throws ResourceValidationError if descriptor is invalid
   */
  register: (descriptor: ResourceDescriptor) => Promise<void>;

  /**
   * Unregister a resource by URI
   * @param uri - The URI of the resource to remove
   * @returns true if resource was removed, false if not found
   */
  unregister: (uri: string) => Promise<boolean>;

  /**
   * Retrieve a resource by URI
   * @param uri - The URI of the resource to retrieve
   * @returns The resource descriptor or null if not found
   */
  get: (uri: string) => Promise<ResourceDescriptor | null>;

  /**
   * List all registered resources
   * @returns Array of all resource descriptors
   */
  list: () => Promise<ResourceDescriptor[]>;

  /**
   * Check if a resource exists
   * @param uri - The URI to check
   * @returns true if resource exists
   */
  has: (uri: string) => Promise<boolean>;

  /**
   * Get all resource types
   * @returns Array of unique resource type strings
   */
  getTypes: () => Promise<string[]>;

  /**
   * Find resources matching a filter
   * @param filter - Function to filter resources
   * @returns Array of matching resource descriptors
   */
  find: (filter: (resource: ResourceDescriptor) => boolean) => Promise<ResourceDescriptor[]>;

  /**
   * Clear all resources
   */
  clear: () => Promise<void>;

  /**
   * Get the number of registered resources
   */
  size: () => Promise<number>;
}