/**
 * Resource Registry
 * 
 * Manages lifecycle operations, discovery, cleanup, and coordination
 * of JCVD MCP resources. Provides centralized resource management
 * with event-driven architecture and comprehensive discovery capabilities.
 */

import EventEmitter from 'node:events';

import { ResourceURI, ResourceError, InvalidResourceURIError } from './resource-interface.js';

import type { Resource, ResourceCapability } from './resource-interface.js';

/**
 * Resource registration information
 */
export interface ResourceInfo {
  /** The registered resource */
  resource: Resource;
  
  /** Registration timestamp */
  registeredAt: number;
  
  /** Last access timestamp */
  lastAccessed: number;
  
  /** Access count */
  accessCount: number;
}

/**
 * Resource health check result
 */
export interface ResourceHealthCheck {
  /** Whether the resource is available */
  isAvailable: boolean;
  
  /** Health check timestamp */
  checkedAt: number;
  
  /** Optional error message if unavailable */
  error?: string;
}

/**
 * Registry statistics
 */
export interface RegistryStatistics {
  /** Total number of registered resources */
  totalResources: number;
  
  /** Resources grouped by project ID */
  resourcesByProject: Record<string, number>;
  
  /** Resources grouped by content type */
  resourcesByContentType: Record<string, number>;
  
  /** Resources grouped by capabilities */
  resourcesByCapability: Record<string, number>;
  
  /** Total access count across all resources */
  totalAccesses: number;
  
  /** Registry uptime in milliseconds */
  uptime: number;
}

/**
 * Batch registration result
 */
export interface BatchRegistrationResult {
  /** Successfully registered resources */
  successful: Resource[];
  
  /** Failed registrations with errors */
  failed: { resource: Resource; error: string }[];
}

/**
 * Resource registry events
 */
export interface RegistryEvents {
  'resource-registered': { uri: string; resource: Resource; registeredAt: number };
  'resource-unregistered': { uri: string; resource: Resource; unregisteredAt: number };
  'batch-registered': { resources: Resource[]; count: number; registeredAt: number };
  'cleanup-completed': { cleanupType: string; resourcesRemoved: number; completedAt: number };
}

/**
 * Central registry for managing JCVD MCP resources
 */
export class ResourceRegistry extends EventEmitter {
  private resources = new Map<string, ResourceInfo>();
  private createdAt = Date.now();

  /**
   * Register a resource in the registry
   */
  register(resource: Resource): void {
    // Validate resource URI
    if (!ResourceURI.isValid(resource.uri)) {
      throw new InvalidResourceURIError(resource.uri);
    }

    // Check for duplicate registration
    if (this.resources.has(resource.uri)) {
      throw new ResourceError(
        `Resource already registered: ${resource.uri}`,
        'DUPLICATE_REGISTRATION',
        resource.uri
      );
    }

    const now = Date.now();
    const resourceInfo: ResourceInfo = {
      resource,
      registeredAt: now,
      lastAccessed: 0,
      accessCount: 0
    };

    this.resources.set(resource.uri, resourceInfo);

    this.emit('resource-registered', {
      uri: resource.uri,
      resource,
      registeredAt: now
    });
  }

  /**
   * Unregister a resource from the registry
   */
  unregister(uri: string): void {
    const resourceInfo = this.resources.get(uri);

    if (!resourceInfo) {
      return; // Gracefully handle non-existent resources
    }

    this.resources.delete(uri);

    this.emit('resource-unregistered', {
      uri,
      resource: resourceInfo.resource,
      unregisteredAt: Date.now()
    });
  }

  /**
   * Check if a resource is registered
   */
  has(uri: string): boolean {
    return this.resources.has(uri);
  }

  /**
   * Get a registered resource
   */
  get(uri: string): Resource | undefined {
    const resourceInfo = this.resources.get(uri);

    if (resourceInfo) {
      // Update access tracking
      resourceInfo.lastAccessed = Date.now();
      resourceInfo.accessCount++;

      return resourceInfo.resource;
    }

    return undefined;
  }

  /**
   * Get all registered resources
   */
  getAll(): Resource[] {
    return Array.from(this.resources.values()).map(info => info.resource);
  }

  /**
   * Get resource information including metadata
   */
  getResourceInfo(uri: string): ResourceInfo | undefined {
    return this.resources.get(uri);
  }

  /**
   * Register multiple resources in batch
   */
  registerBatch(resources: Resource[]): void {
    const registeredAt = Date.now();

    for (const resource of resources) {
      try {
        this.register(resource);
      } catch (error) {
        // If any registration fails, we need to clean up already registered resources
        // from this batch to maintain consistency
        const registeredInThisBatch = resources.slice(0, resources.indexOf(resource));

        for (const registeredResource of registeredInThisBatch) {
          this.unregister(registeredResource.uri);
        }
        throw error;
      }
    }

    this.emit('batch-registered', {
      resources,
      count: resources.length,
      registeredAt
    });
  }

  /**
   * Register multiple resources with partial failure handling
   */
  registerBatchSafe(resources: Resource[]): BatchRegistrationResult {
    const successful: Resource[] = [];
    const failed: { resource: Resource; error: string }[] = [];

    for (const resource of resources) {
      try {
        this.register(resource);
        successful.push(resource);
      } catch (error) {
        failed.push({
          resource,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if (successful.length > 0) {
      this.emit('batch-registered', {
        resources: successful,
        count: successful.length,
        registeredAt: Date.now()
      });
    }

    return { successful, failed };
  }

  /**
   * Unregister multiple resources in batch
   */
  unregisterBatch(uris: string[]): void {
    for (const uri of uris) {
      this.unregister(uri);
    }
  }

  /**
   * Find resources by project ID
   */
  findByProjectId(projectId: string): Resource[] {
    const results: Resource[] = [];

    for (const [uri, resourceInfo] of this.resources) {
      const parsedUri = ResourceURI.parse(uri);

      if (parsedUri && parsedUri.projectId === projectId) {
        results.push(resourceInfo.resource);
      }
    }

    return results;
  }

  /**
   * Find resources by content type
   */
  findByContentType(contentType: string): Resource[] {
    const results: Resource[] = [];

    for (const resourceInfo of this.resources.values()) {
      if (resourceInfo.resource.metadata.contentType === contentType) {
        results.push(resourceInfo.resource);
      }
    }

    return results;
  }

  /**
   * Find resources by capability
   */
  findByCapability(capability: ResourceCapability): Resource[] {
    const results: Resource[] = [];

    for (const resourceInfo of this.resources.values()) {
      if (resourceInfo.resource.metadata.capabilities.includes(capability)) {
        results.push(resourceInfo.resource);
      }
    }

    return results;
  }

  /**
   * Find resources matching a URI pattern
   */
  findByPattern(pattern: string): Resource[] {
    const results: Resource[] = [];

    // Convert glob pattern to regex
    // Escape special regex characters first, then handle wildcards
    const regexPattern = pattern
      .replace(/[$()+.?[\\\]^{|}]/g, '\\$&')  // Escape special regex chars
      .replace(/\\\*/g, '.*');                // Convert \* back to .* for wildcards
    
    const regex = new RegExp(`^${regexPattern}$`);

    for (const [uri, resourceInfo] of this.resources) {
      if (regex.test(uri)) {
        results.push(resourceInfo.resource);
      }
    }

    return results;
  }

  /**
   * Check resource health
   */
  async checkResourceHealth(uri: string): Promise<ResourceHealthCheck> {
    const resourceInfo = this.resources.get(uri);
    
    if (!resourceInfo) {
      return {
        isAvailable: false,
        checkedAt: Date.now(),
        error: 'Resource not found in registry'
      };
    }

    try {
      const isAvailable = await resourceInfo.resource.isAvailable();

      return {
        isAvailable,
        checkedAt: Date.now()
      };
    } catch (error) {
      return {
        isAvailable: false,
        checkedAt: Date.now(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get resource statistics
   */
  getResourceStatistics(uri: string): ResourceInfo | undefined {
    return this.resources.get(uri);
  }

  /**
   * Get registry statistics
   */
  getRegistryStatistics(): RegistryStatistics {
    const resourcesByProject: Record<string, number> = {};
    const resourcesByContentType: Record<string, number> = {};
    const resourcesByCapability: Record<string, number> = {};
    let totalAccesses = 0;

    for (const [uri, resourceInfo] of this.resources) {
      // Count by project
      const parsedUri = ResourceURI.parse(uri);

      if (parsedUri) {
        resourcesByProject[parsedUri.projectId] = (resourcesByProject[parsedUri.projectId] || 0) + 1;
      }

      // Count by content type
      const contentType = resourceInfo.resource.metadata.contentType;

      resourcesByContentType[contentType] = (resourcesByContentType[contentType] || 0) + 1;

      // Count by capabilities
      for (const capability of resourceInfo.resource.metadata.capabilities) {
        resourcesByCapability[capability] = (resourcesByCapability[capability] || 0) + 1;
      }

      // Sum total accesses
      totalAccesses += resourceInfo.accessCount;
    }

    return {
      totalResources: this.resources.size,
      resourcesByProject,
      resourcesByContentType,
      resourcesByCapability,
      totalAccesses,
      uptime: Date.now() - this.createdAt
    };
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    const resourceCount = this.resources.size;

    this.resources.clear();

    this.emit('cleanup-completed', {
      cleanupType: 'full',
      resourcesRemoved: resourceCount,
      completedAt: Date.now()
    });
  }

  /**
   * Clean up resources by project ID
   */
  cleanupByProject(projectId: string): void {
    const urisToRemove: string[] = [];

    for (const [uri] of this.resources) {
      const parsedUri = ResourceURI.parse(uri);

      if (parsedUri && parsedUri.projectId === projectId) {
        urisToRemove.push(uri);
      }
    }

    for (const uri of urisToRemove) {
      this.resources.delete(uri);
    }

    this.emit('cleanup-completed', {
      cleanupType: `project:${projectId}`,
      resourcesRemoved: urisToRemove.length,
      completedAt: Date.now()
    });
  }

  /**
   * Clean up stale resources based on age
   */
  cleanupStale(maxAgeMs: number): number {
    const cutoffTime = Date.now() - maxAgeMs;
    const urisToRemove: string[] = [];

    for (const [uri, resourceInfo] of this.resources) {
      if (resourceInfo.registeredAt < cutoffTime) {
        urisToRemove.push(uri);
      }
    }

    for (const uri of urisToRemove) {
      this.resources.delete(uri);
    }

    if (urisToRemove.length > 0) {
      this.emit('cleanup-completed', {
        cleanupType: 'stale',
        resourcesRemoved: urisToRemove.length,
        completedAt: Date.now()
      });
    }

    return urisToRemove.length;
  }

  /**
   * Get registry size
   */
  size(): number {
    return this.resources.size;
  }

  /**
   * Check if registry is empty
   */
  isEmpty(): boolean {
    return this.resources.size === 0;
  }

  /**
   * Get registry uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.createdAt;
  }
}