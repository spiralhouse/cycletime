/**
 * Base Resource Implementation
 * 
 * Provides common functionality for all JCVD MCP resources including
 * caching, validation, metadata management, and lifecycle operations.
 */

import { 
  ResourceError, 
  ResourceURI, 
  InvalidResourceURIError 
} from './resource-interface.js';

import type { 
  Resource, 
  ResourceMetadata, 
  ResourceContent 
} from './resource-interface.js';

/**
 * Content provider function type
 */
export type ContentProvider = () => Promise<ResourceContent>;

/**
 * Availability checker function type
 */
export type AvailabilityChecker = () => Promise<boolean>;

/**
 * Resource statistics interface
 */
export interface ResourceStatistics {
  accessCount: number;
  cacheHits: number;
  cacheMisses: number;
  errorCount: number;
  lastAccessed: number;
  createdAt: number;
}

/**
 * Cache entry interface
 */
interface CacheEntry {
  content: ResourceContent;
  timestamp: number;
  ttl: number;
}

/**
 * Base implementation of the Resource interface providing common functionality
 */
export class BaseResource implements Resource {
  public readonly uri: string;
  public metadata: ResourceMetadata;

  private contentProvider: ContentProvider;
  private availabilityChecker: AvailabilityChecker | undefined;
  private cache: CacheEntry | undefined;
  private statistics: ResourceStatistics;

  /**
   * Create a new BaseResource instance
   * 
   * @param uri Resource URI following jcvd://project/{projectId}/{resourceType} pattern
   * @param metadata Resource metadata including capabilities and content type
   * @param contentProvider Function that generates the resource content
   * @param availabilityChecker Optional function to check resource availability
   */
  constructor(
    uri: string,
    metadata: ResourceMetadata,
    contentProvider: ContentProvider,
    availabilityChecker?: AvailabilityChecker
  ) {
    // Validate URI
    if (!ResourceURI.isValid(uri)) {
      throw new InvalidResourceURIError(uri);
    }

    // Validate metadata
    if (!metadata) {
      throw new ResourceError('Resource metadata is required', 'INVALID_METADATA');
    }

    // Validate content provider
    if (!contentProvider || typeof contentProvider !== 'function') {
      throw new ResourceError('Content provider function is required', 'INVALID_PROVIDER');
    }

    this.uri = uri;
    this.metadata = {
      ...metadata,
      lastModified: metadata.lastModified || new Date()
    };
    this.contentProvider = contentProvider;
    this.availabilityChecker = availabilityChecker;

    // Initialize statistics
    this.statistics = {
      accessCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorCount: 0,
      lastAccessed: 0,
      createdAt: Date.now()
    };
  }

  /**
   * Get the current content of this resource
   */
  async getContent(): Promise<ResourceContent> {
    this.statistics.accessCount++;
    this.statistics.lastAccessed = Date.now();

    try {
      // Check cache first if TTL is specified
      if (this.metadata.ttl && this.cache && this.isCacheValid()) {
        this.statistics.cacheHits++;

        return this.cache.content;
      }

      // Cache miss - generate new content
      this.statistics.cacheMisses++;
      const content = await this.contentProvider();

      // Validate content type matches metadata
      if (content.contentType !== this.metadata.contentType) {
        throw new ResourceError(
          `Content type mismatch: expected ${this.metadata.contentType}, got ${content.contentType}`,
          'CONTENT_TYPE_MISMATCH',
          this.uri
        );
      }

      // Cache the content if TTL is specified
      if (this.metadata.ttl) {
        this.cache = {
          content,
          timestamp: Date.now(),
          ttl: this.metadata.ttl * 1000 // Convert to milliseconds
        };
      }

      return content;
    } catch (error) {
      this.statistics.errorCount++;
      
      if (error instanceof ResourceError) {
        throw error;
      }
      
      // Re-throw the original error to maintain test expectations
      throw error;
    }
  }

  /**
   * Check if this resource is currently available
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (this.availabilityChecker) {
        return await this.availabilityChecker();
      }
      
      // Default to available if no checker provided
      return true;
    } catch {
      // Availability check failed - assume unavailable
      return false;
    }
  }

  /**
   * Invalidate any cached content for this resource
   */
  async invalidate(): Promise<void> {
    this.cache = undefined as CacheEntry | undefined;
  }

  /**
   * Update resource metadata
   * 
   * @param newMetadata New metadata to apply
   */
  updateMetadata(newMetadata: ResourceMetadata): void {
    this.metadata = {
      ...newMetadata,
      lastModified: new Date()
    };
    
    // Invalidate cache when metadata changes
    this.cache = undefined as CacheEntry | undefined;
  }

  /**
   * Get resource access statistics
   */
  getStatistics(): ResourceStatistics {
    return { ...this.statistics };
  }

  /**
   * Reset resource statistics
   */
  resetStatistics(): void {
    const createdAt = this.statistics.createdAt;

    this.statistics = {
      accessCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorCount: 0,
      lastAccessed: 0,
      createdAt
    };
  }

  /**
   * Check if cached content is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cache) {
      return false;
    }

    const age = Date.now() - this.cache.timestamp;

    return age < this.cache.ttl;
  }

  /**
   * Get the project ID from this resource's URI
   */
  getProjectId(): string | null {
    return ResourceURI.getProjectId(this.uri);
  }

  /**
   * Get the resource path from this resource's URI
   */
  getResourcePath(): string | null {
    return ResourceURI.getResourcePath(this.uri);
  }

  /**
   * Check if this resource supports a specific capability
   */
  hasCapability(capability: string): boolean {
    return this.metadata.capabilities.includes(capability as any);
  }

  /**
   * Get a human-readable string representation of this resource
   */
  toString(): string {
    return `${this.metadata.name} (${this.uri})`;
  }

  /**
   * Check if this resource is equivalent to another resource
   */
  equals(other: Resource): boolean {
    return this.uri === other.uri;
  }

  /**
   * Get detailed resource information for debugging
   */
  getDebugInfo(): Record<string, any> {
    return {
      uri: this.uri,
      metadata: this.metadata,
      statistics: this.statistics,
      cached: !!this.cache,
      cacheValid: this.cache ? this.isCacheValid() : false,
      projectId: this.getProjectId(),
      resourcePath: this.getResourcePath()
    };
  }
}