/**
 * Basic Resource Cache Implementation
 * Simple in-memory cache with optional TTL support
 */

import type { 
  ResourceCache, 
  CacheStats, 
  CacheConfig 
} from '../interfaces/ResourceCache.js';
import type { TimeProvider } from '../interfaces/TimeProvider.js';
import type { ResourceDescriptor } from '../types.js';

/**
 * Cache entry with metadata
 */
interface CacheEntry {
  descriptor: ResourceDescriptor;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Basic cache implementation with TTL and statistics
 */
export class BasicResourceCache implements ResourceCache {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(
    private config: CacheConfig,
    private timeProvider: TimeProvider
  ) {}

  /**
   * Store a resource in the cache
   */
  set(uri: string, descriptor: ResourceDescriptor): void {
    const now = this.timeProvider.timestamp();
    
    // Check if we need to evict items
    if (this.cache.size >= this.config.maxSize && !this.cache.has(uri)) {
      this.evictOne();
    }

    const entry: CacheEntry = {
      descriptor,
      timestamp: now,
      accessCount: 0,
      lastAccessed: now,
    };

    this.cache.set(uri, entry);
  }

  /**
   * Retrieve a resource from the cache
   */
  get(uri: string): ResourceDescriptor | null {
    const entry = this.cache.get(uri);
    
    if (!entry) {
      if (this.config.enableStats) {
        this.stats.misses++;
      }

      return null;
    }

    // Check TTL if configured
    if (this.config.ttl > 0) {
      const now = this.timeProvider.timestamp();

      if (now - entry.timestamp > this.config.ttl) {
        this.cache.delete(uri);
        if (this.config.enableStats) {
          this.stats.misses++;
        }

        return null;
      }
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = this.timeProvider.timestamp();

    if (this.config.enableStats) {
      this.stats.hits++;
    }

    return entry.descriptor;
  }

  /**
   * Check if a resource exists in the cache
   */
  has(uri: string): boolean {
    const entry = this.cache.get(uri);
    
    if (!entry) {
      return false;
    }

    // Check TTL if configured
    if (this.config.ttl > 0) {
      const now = this.timeProvider.timestamp();

      if (now - entry.timestamp > this.config.ttl) {
        this.cache.delete(uri);

        return false;
      }
    }

    return true;
  }

  /**
   * Remove a specific resource from the cache
   */
  delete(uri: string): boolean {
    return this.cache.delete(uri);
  }

  /**
   * Clear all cached resources
   */
  clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  /**
   * Get all cached resource URIs
   */
  keys(): string[] {
    this.cleanup();

    return Array.from(this.cache.keys());
  }

  /**
   * Get all cached resource descriptors
   */
  values(): ResourceDescriptor[] {
    this.cleanup();

    return Array.from(this.cache.values()).map(entry => entry.descriptor);
  }

  /**
   * Get the number of cached items
   */
  size(): number {
    this.cleanup();

    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats | null {
    if (!this.config.enableStats) {
      return null;
    }

    const memoryUsage = this.estimateMemoryUsage();
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      size: this.cache.size,
      hitRate,
      hits: this.stats.hits,
      misses: this.stats.misses,
      memoryUsage,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Invalidate expired entries
   */
  cleanup(): void {
    if (this.config.ttl <= 0) {
      return;
    }

    const now = this.timeProvider.timestamp();
    const expiredKeys: string[] = [];

    for (const [uri, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        expiredKeys.push(uri);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }
  }

  /**
   * Evict one item based on eviction policy
   */
  private evictOne(): void {
    if (this.cache.size === 0) {
      return;
    }

    let keyToEvict: string;

    switch (this.config.evictionPolicy) {
      case 'LRU': {
        // Least Recently Used
        let oldestTime = Number.MAX_SAFE_INTEGER;
        let oldestKey = '';
        
        for (const [uri, entry] of this.cache.entries()) {
          if (entry.lastAccessed < oldestTime) {
            oldestTime = entry.lastAccessed;
            oldestKey = uri;
          }
        }
        
        keyToEvict = oldestKey;
        break;
      }
      
      case 'LFU': {
        // Least Frequently Used
        let lowestCount = Number.MAX_SAFE_INTEGER;
        let lfuKey = '';
        
        for (const [uri, entry] of this.cache.entries()) {
          if (entry.accessCount < lowestCount) {
            lowestCount = entry.accessCount;
            lfuKey = uri;
          }
        }
        
        keyToEvict = lfuKey;
        break;
      }
      
      case 'FIFO':

      default: {
        // First In, First Out
        let oldestTime = Number.MAX_SAFE_INTEGER;
        let oldestKey = '';
        
        for (const [uri, entry] of this.cache.entries()) {
          if (entry.timestamp < oldestTime) {
            oldestTime = entry.timestamp;
            oldestKey = uri;
          }
        }
        
        keyToEvict = oldestKey;
        break;
      }
    }

    this.cache.delete(keyToEvict);
  }

  /**
   * Estimate memory usage of cache
   */
  private estimateMemoryUsage(): number {
    // Rough estimation: each entry is approximately 1KB
    // In a real implementation, you'd measure actual memory usage
    return this.cache.size * 1024;
  }
}