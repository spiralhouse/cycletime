/**
 * In-Memory Resource Provider
 * Default implementation storing resources in memory
 */

import { ResourceConflictError } from '../errors.js';

import type { ResourceProvider } from '../interfaces/ResourceProvider.js';
import type { ResourceDescriptor } from '../types.js';

/**
 * In-memory implementation of ResourceProvider
 * Uses Map for efficient storage and retrieval
 */
export class InMemoryResourceProvider implements ResourceProvider {
  private resources = new Map<string, ResourceDescriptor>();

  /**
   * Register a new resource
   */
  async register(descriptor: ResourceDescriptor): Promise<void> {
    if (this.resources.has(descriptor.type)) {
      throw new ResourceConflictError(descriptor.type);
    }
    
    this.resources.set(descriptor.type, descriptor);
  }

  /**
   * Unregister a resource by URI
   */
  async unregister(uri: string): Promise<boolean> {
    return this.resources.delete(uri);
  }

  /**
   * Retrieve a resource by URI
   */
  async get(uri: string): Promise<ResourceDescriptor | null> {
    return this.resources.get(uri) || null;
  }

  /**
   * List all registered resources
   */
  async list(): Promise<ResourceDescriptor[]> {
    return Array.from(this.resources.values());
  }

  /**
   * Check if a resource exists
   */
  async has(uri: string): Promise<boolean> {
    return this.resources.has(uri);
  }

  /**
   * Get all resource types
   */
  async getTypes(): Promise<string[]> {
    const types = new Set<string>();

    for (const resource of this.resources.values()) {
      types.add(resource.type);
    }

    return Array.from(types);
  }

  /**
   * Find resources matching a filter
   */
  async find(filter: (resource: ResourceDescriptor) => boolean): Promise<ResourceDescriptor[]> {
    const allResources = await this.list();

    return allResources.filter(filter);
  }

  /**
   * Clear all resources
   */
  async clear(): Promise<void> {
    this.resources.clear();
  }

  /**
   * Get the number of registered resources
   */
  async size(): Promise<number> {
    return this.resources.size;
  }
}