/**
 * Resource Cache Interface
 * Defines the contract for resource caching implementations
 */

import type { ResourceDescriptor } from '../types.js';

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  /** Total number of items in cache */
  size: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Total number of cache hits */
  hits: number;
  /** Total number of cache misses */
  misses: number;
  /** Memory usage in bytes (approximate) */
  memoryUsage: number;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /** Maximum number of items to store */
  maxSize: number;
  /** Time-to-live in milliseconds (0 = no expiration) */
  ttl: number;
  /** Eviction policy when cache is full */
  evictionPolicy: 'LRU' | 'LFU' | 'FIFO';
  /** Enable statistics collection */
  enableStats: boolean;
}

/**
 * Interface for resource caching implementations
 */
export interface ResourceCache {
  /**
   * Store a resource in the cache
   * @param uri - The resource URI as cache key
   * @param descriptor - The resource descriptor to cache
   */
  set: (uri: string, descriptor: ResourceDescriptor) => void;

  /**
   * Retrieve a resource from the cache
   * @param uri - The resource URI to look up
   * @returns The cached resource descriptor or null if not found/expired
   */
  get: (uri: string) => ResourceDescriptor | null;

  /**
   * Check if a resource exists in the cache
   * @param uri - The resource URI to check
   * @returns true if resource is cached and not expired
   */
  has: (uri: string) => boolean;

  /**
   * Remove a specific resource from the cache
   * @param uri - The resource URI to remove
   * @returns true if resource was removed, false if not found
   */
  delete: (uri: string) => boolean;

  /**
   * Clear all cached resources
   */
  clear: () => void;

  /**
   * Get all cached resource URIs
   * @returns Array of cached resource URIs
   */
  keys: () => string[];

  /**
   * Get all cached resource descriptors
   * @returns Array of cached resource descriptors
   */
  values: () => ResourceDescriptor[];

  /**
   * Get the number of cached items
   */
  size: () => number;

  /**
   * Get cache statistics (if enabled)
   * @returns Cache statistics or null if stats disabled
   */
  getStats: () => CacheStats | null;

  /**
   * Reset cache statistics
   */
  resetStats: () => void;

  /**
   * Invalidate expired entries (manual cleanup)
   */
  cleanup: () => void;
}