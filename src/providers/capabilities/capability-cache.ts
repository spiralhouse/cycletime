/**
 * JCVD Capability Cache System
 * 
 * This module implements a high-performance caching layer for capability 
 * discovery results, ensuring sub-100ms capability checks while maintaining
 * data freshness and accuracy.
 */

import type {
  ProviderType,
  IssueProvider
} from '../types.js'

import type {
  CapabilityDiscoveryResult,
  CapabilityProbeResult,
  CapabilityDiscoveryOptions
} from './capability-discovery.js'

import type {
  ProviderFeatureMatrix,
  ProviderComparison
} from './feature-matrix.js'

// =============================================================================
// Cache Core Types
// =============================================================================

/**
 * Cache entry with metadata and expiration
 */
export interface CacheEntry<T> {
  /** Cached data */
  data: T
  /** Cache key identifier */
  key: string
  /** Entry creation timestamp */
  createdAt: Date
  /** Entry expiration timestamp */
  expiresAt: Date
  /** Last access timestamp */
  lastAccessAt: Date
  /** Access count for popularity tracking */
  accessCount: number
  /** Entry size in bytes (estimated) */
  sizeBytes: number
  /** Cache hit rate for this entry */
  hitRate: number
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /** Maximum cache size in MB */
  maxSizeBytes: number
  /** Default TTL for capability results in milliseconds */
  defaultTTL: number
  /** TTL for feature matrices in milliseconds */
  matrixTTL: number
  /** TTL for provider comparisons in milliseconds */
  comparisonTTL: number
  /** Maximum number of entries per provider */
  maxEntriesPerProvider: number
  /** Enable LRU eviction */
  enableLRU: boolean
  /** Cache persistence to disk */
  persistToDisk: boolean
  /** Disk cache file path */
  diskCachePath?: string
}

/**
 * Cache statistics for monitoring and optimization
 */
export interface CacheStatistics {
  /** Total cache hits */
  hits: number
  /** Total cache misses */
  misses: number
  /** Cache hit ratio */
  hitRatio: number
  /** Current cache size in bytes */
  currentSizeBytes: number
  /** Number of entries in cache */
  entryCount: number
  /** Number of expired entries cleaned up */
  evictions: number
  /** Average response time for cached results */
  averageResponseTime: number
  /** Cache performance by provider type */
  providerStats: Map<ProviderType, {
    hits: number
    misses: number
    hitRatio: number
  }>
}

/**
 * Cache invalidation options
 */
export interface CacheInvalidationOptions {
  /** Invalidate specific provider */
  providerId?: string
  /** Invalidate specific provider type */
  providerType?: ProviderType
  /** Invalidate specific capability */
  capabilityId?: string
  /** Invalidate entries older than timestamp */
  olderThan?: Date
  /** Force invalidation even if not expired */
  force?: boolean
}

// =============================================================================
// Cache Key Generation
// =============================================================================

/**
 * Generates consistent cache keys for different data types
 */
export class CacheKeyGenerator {
  /**
   * Generate cache key for capability discovery result
   */
  static forCapabilityDiscovery(
    providerId: string,
    options: CapabilityDiscoveryOptions
  ): string {
    const optionsHash = this.hashOptions(options)
    return `capability:${providerId}:${optionsHash}`
  }

  /**
   * Generate cache key for individual capability probe
   */
  static forCapabilityProbe(
    providerId: string,
    capabilityId: string,
    options: CapabilityDiscoveryOptions
  ): string {
    const optionsHash = this.hashOptions(options)
    return `probe:${providerId}:${capabilityId}:${optionsHash}`
  }

  /**
   * Generate cache key for feature matrix
   */
  static forFeatureMatrix(providerId: string): string {
    return `matrix:${providerId}`
  }

  /**
   * Generate cache key for provider comparison
   */
  static forProviderComparison(sourceId: string, targetId: string): string {
    // Normalize order to ensure consistent caching
    const [first, second] = [sourceId, targetId].sort()
    return `comparison:${first}:${second}`
  }

  /**
   * Hash options object for consistent key generation
   */
  private static hashOptions(options: CapabilityDiscoveryOptions): string {
    const normalized = {
      targetCapabilities: options.targetCapabilities?.sort(),
      skipCached: options.skipCached || false,
      timeout: options.timeout || 10000,
      includeBenchmarks: options.includeBenchmarks || false,
      probeDepth: options.probeDepth || 'shallow'
    }
    
    return Buffer.from(JSON.stringify(normalized)).toString('base64').slice(0, 16)
  }
}

// =============================================================================
// LRU Cache Implementation
// =============================================================================

/**
 * High-performance LRU cache with TTL support
 */
export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private accessOrder = new Map<string, number>()
  private currentSize = 0
  private accessCounter = 0
  private config: CacheConfig

  constructor(config: CacheConfig) {
    this.config = config
  }

  /**
   * Get entry from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return undefined
    }

    // Check expiration
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key)
      this.accessOrder.delete(key)
      this.currentSize -= entry.sizeBytes
      return undefined
    }

    // Update access tracking
    this.updateAccess(entry, key)
    
    return entry.data
  }

  /**
   * Set entry in cache
   */
  set(key: string, data: T, ttl?: number): void {
    const existingEntry = this.cache.get(key)
    if (existingEntry) {
      this.currentSize -= existingEntry.sizeBytes
    }

    const sizeBytes = this.estimateSize(data)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (ttl || this.config.defaultTTL))

    const entry: CacheEntry<T> = {
      data,
      key,
      createdAt: now,
      expiresAt,
      lastAccessAt: now,
      accessCount: 1,
      sizeBytes,
      hitRate: 0
    }

    // Ensure we don't exceed size limits
    this.ensureCapacity(sizeBytes)

    this.cache.set(key, entry)
    this.accessOrder.set(key, this.accessCounter++)
    this.currentSize += sizeBytes
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }

    this.cache.delete(key)
    this.accessOrder.delete(key)
    this.currentSize -= entry.sizeBytes
    
    return true
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear()
    this.accessOrder.clear()
    this.currentSize = 0
    this.accessCounter = 0
  }

  /**
   * Get cache size in bytes
   */
  size(): number {
    return this.currentSize
  }

  /**
   * Get number of entries
   */
  count(): number {
    return this.cache.size
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let cleaned = 0
    const now = new Date()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key)
        this.accessOrder.delete(key)
        this.currentSize -= entry.sizeBytes
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Update access tracking for an entry
   */
  private updateAccess(entry: CacheEntry<T>, key: string): void {
    entry.lastAccessAt = new Date()
    entry.accessCount++
    this.accessOrder.set(key, this.accessCounter++)
    
    // Update hit rate (simple moving average)
    entry.hitRate = (entry.hitRate * (entry.accessCount - 1) + 1) / entry.accessCount
  }

  /**
   * Ensure cache has capacity for new entry
   */
  private ensureCapacity(newEntrySize: number): void {
    while (this.currentSize + newEntrySize > this.config.maxSizeBytes) {
      if (!this.evictLRU()) {
        break // No more entries to evict
      }
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): boolean {
    if (this.cache.size === 0) {
      return false
    }

    // Find LRU entry
    let lruKey: string | undefined
    let lruAccessTime = Infinity

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < lruAccessTime) {
        lruAccessTime = accessTime
        lruKey = key
      }
    }

    if (lruKey) {
      this.delete(lruKey)
      return true
    }

    return false
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: T): number {
    // Simple JSON-based size estimation
    try {
      return new TextEncoder().encode(JSON.stringify(data)).length
    } catch {
      // Fallback estimation for non-serializable data
      return 1024 // 1KB default estimate
    }
  }
}

// =============================================================================
// Capability Cache Manager
// =============================================================================

/**
 * Main capability cache manager with multi-layered caching
 */
export class CapabilityCacheManager {
  private discoveryCache: LRUCache<CapabilityDiscoveryResult>
  private probeCache: LRUCache<CapabilityProbeResult>
  private matrixCache: LRUCache<ProviderFeatureMatrix>
  private comparisonCache: LRUCache<ProviderComparison>
  
  private stats: CacheStatistics
  private config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSizeBytes: config.maxSizeBytes || 50 * 1024 * 1024, // 50MB default
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 minutes
      matrixTTL: config.matrixTTL || 30 * 60 * 1000, // 30 minutes
      comparisonTTL: config.comparisonTTL || 15 * 60 * 1000, // 15 minutes
      maxEntriesPerProvider: config.maxEntriesPerProvider || 100,
      enableLRU: config.enableLRU !== false,
      persistToDisk: config.persistToDisk || false,
      diskCachePath: config.diskCachePath
    }

    // Initialize caches with proportional sizes
    const discoverySize = Math.floor(this.config.maxSizeBytes * 0.4)
    const probeSize = Math.floor(this.config.maxSizeBytes * 0.3)
    const matrixSize = Math.floor(this.config.maxSizeBytes * 0.2)
    const comparisonSize = Math.floor(this.config.maxSizeBytes * 0.1)

    this.discoveryCache = new LRUCache({ ...this.config, maxSizeBytes: discoverySize })
    this.probeCache = new LRUCache({ ...this.config, maxSizeBytes: probeSize })
    this.matrixCache = new LRUCache({ ...this.config, maxSizeBytes: matrixSize })
    this.comparisonCache = new LRUCache({ ...this.config, maxSizeBytes: comparisonSize })

    this.stats = {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      currentSizeBytes: 0,
      entryCount: 0,
      evictions: 0,
      averageResponseTime: 0,
      providerStats: new Map()
    }

    // Periodic cleanup
    setInterval(() => this.performMaintenance(), 60000) // Every minute
  }

  // -------------------------------------------------------------------------
  // Capability Discovery Caching
  // -------------------------------------------------------------------------

  /**
   * Get cached capability discovery result
   */
  getCachedDiscovery(
    providerId: string,
    options: CapabilityDiscoveryOptions
  ): CapabilityDiscoveryResult | undefined {
    const key = CacheKeyGenerator.forCapabilityDiscovery(providerId, options)
    const result = this.discoveryCache.get(key)
    
    this.updateStats(result !== undefined, 'discovery')
    return result
  }

  /**
   * Cache capability discovery result
   */
  cacheDiscovery(
    providerId: string,
    options: CapabilityDiscoveryOptions,
    result: CapabilityDiscoveryResult
  ): void {
    const key = CacheKeyGenerator.forCapabilityDiscovery(providerId, options)
    this.discoveryCache.set(key, result, this.config.defaultTTL)
  }

  // -------------------------------------------------------------------------
  // Individual Probe Caching
  // -------------------------------------------------------------------------

  /**
   * Get cached capability probe result
   */
  getCachedProbe(
    providerId: string,
    capabilityId: string,
    options: CapabilityDiscoveryOptions
  ): CapabilityProbeResult | undefined {
    const key = CacheKeyGenerator.forCapabilityProbe(providerId, capabilityId, options)
    const result = this.probeCache.get(key)
    
    this.updateStats(result !== undefined, 'probe')
    return result
  }

  /**
   * Cache capability probe result
   */
  cacheProbe(
    providerId: string,
    capabilityId: string,
    options: CapabilityDiscoveryOptions,
    result: CapabilityProbeResult
  ): void {
    const key = CacheKeyGenerator.forCapabilityProbe(providerId, capabilityId, options)
    this.probeCache.set(key, result, this.config.defaultTTL)
  }

  // -------------------------------------------------------------------------
  // Feature Matrix Caching
  // -------------------------------------------------------------------------

  /**
   * Get cached feature matrix
   */
  getCachedMatrix(providerId: string): ProviderFeatureMatrix | undefined {
    const key = CacheKeyGenerator.forFeatureMatrix(providerId)
    const result = this.matrixCache.get(key)
    
    this.updateStats(result !== undefined, 'matrix')
    return result
  }

  /**
   * Cache feature matrix
   */
  cacheMatrix(matrix: ProviderFeatureMatrix): void {
    const key = CacheKeyGenerator.forFeatureMatrix(matrix.providerId)
    this.matrixCache.set(key, matrix, this.config.matrixTTL)
  }

  // -------------------------------------------------------------------------
  // Provider Comparison Caching
  // -------------------------------------------------------------------------

  /**
   * Get cached provider comparison
   */
  getCachedComparison(sourceId: string, targetId: string): ProviderComparison | undefined {
    const key = CacheKeyGenerator.forProviderComparison(sourceId, targetId)
    const result = this.comparisonCache.get(key)
    
    this.updateStats(result !== undefined, 'comparison')
    return result
  }

  /**
   * Cache provider comparison
   */
  cacheComparison(comparison: ProviderComparison): void {
    const key = CacheKeyGenerator.forProviderComparison(
      comparison.sourceProvider.providerId,
      comparison.targetProvider.providerId
    )
    this.comparisonCache.set(key, comparison, this.config.comparisonTTL)
  }

  // -------------------------------------------------------------------------
  // Cache Management
  // -------------------------------------------------------------------------

  /**
   * Invalidate cache entries based on criteria
   */
  invalidate(options: CacheInvalidationOptions): number {
    let invalidated = 0

    // Helper function to check if key matches criteria
    const matchesCriteria = (key: string): boolean => {
      if (options.providerId && !key.includes(options.providerId)) {
        return false
      }
      if (options.capabilityId && !key.includes(options.capabilityId)) {
        return false
      }
      return true
    }

    // Invalidate from all caches
    const caches = [
      this.discoveryCache,
      this.probeCache,
      this.matrixCache,
      this.comparisonCache
    ]

    for (const cache of caches) {
      const keysToDelete = cache.keys().filter(matchesCriteria)
      for (const key of keysToDelete) {
        if (cache.delete(key)) {
          invalidated++
        }
      }
    }

    return invalidated
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    this.updateCurrentSize()
    this.updateHitRatio()
    return { ...this.stats }
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.discoveryCache.clear()
    this.probeCache.clear()
    this.matrixCache.clear()
    this.comparisonCache.clear()
    
    this.stats = {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      currentSizeBytes: 0,
      entryCount: 0,
      evictions: 0,
      averageResponseTime: 0,
      providerStats: new Map()
    }
  }

  /**
   * Warm up cache with common capability checks
   */
  async warmUp(providers: IssueProvider[]): Promise<void> {
    const commonCapabilities = [
      'projects.create',
      'projects.read',
      'issues.create',
      'issues.read',
      'issues.update',
      'issues.list'
    ]

    const options: CapabilityDiscoveryOptions = {
      targetCapabilities: commonCapabilities,
      probeDepth: 'shallow',
      skipCached: false
    }

    // This would typically be called by the capability discovery engine
    // We're just marking the cache as ready for these common operations
    for (const provider of providers) {
      const providerId = provider.getProviderInfo().id
      
      // Pre-generate cache keys to ensure consistent lookup
      for (const capability of commonCapabilities) {
        CacheKeyGenerator.forCapabilityProbe(providerId, capability, options)
      }
    }
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  /**
   * Update cache statistics
   */
  private updateStats(isHit: boolean, cacheType: string): void {
    if (isHit) {
      this.stats.hits++
    } else {
      this.stats.misses++
    }
  }

  /**
   * Update current size statistics
   */
  private updateCurrentSize(): void {
    this.stats.currentSizeBytes = 
      this.discoveryCache.size() +
      this.probeCache.size() +
      this.matrixCache.size() +
      this.comparisonCache.size()

    this.stats.entryCount =
      this.discoveryCache.count() +
      this.probeCache.count() +
      this.matrixCache.count() +
      this.comparisonCache.count()
  }

  /**
   * Update hit ratio statistics
   */
  private updateHitRatio(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRatio = total > 0 ? this.stats.hits / total : 0
  }

  /**
   * Perform periodic maintenance
   */
  private performMaintenance(): void {
    const cleaned = 
      this.discoveryCache.cleanup() +
      this.probeCache.cleanup() +
      this.matrixCache.cleanup() +
      this.comparisonCache.cleanup()

    this.stats.evictions += cleaned
  }
}

// =============================================================================
// Cache Utilities
// =============================================================================

export class CacheUtils {
  /**
   * Create optimized cache configuration based on system resources
   */
  static createOptimalConfig(): CacheConfig {
    // Get available memory (simplified estimation)
    const availableMemory = 1024 * 1024 * 1024 // 1GB default assumption
    const maxCacheSize = Math.min(availableMemory * 0.1, 100 * 1024 * 1024) // 10% or 100MB max

    return {
      maxSizeBytes: maxCacheSize,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      matrixTTL: 30 * 60 * 1000, // 30 minutes
      comparisonTTL: 15 * 60 * 1000, // 15 minutes
      maxEntriesPerProvider: 100,
      enableLRU: true,
      persistToDisk: false
    }
  }

  /**
   * Analyze cache performance and suggest optimizations
   */
  static analyzeCachePerformance(stats: CacheStatistics): {
    recommendations: string[]
    score: number
  } {
    const recommendations: string[] = []
    let score = 100

    // Check hit ratio
    if (stats.hitRatio < 0.5) {
      recommendations.push('Low cache hit ratio - consider increasing TTL or cache size')
      score -= 20
    } else if (stats.hitRatio < 0.7) {
      recommendations.push('Moderate cache hit ratio - minor optimizations possible')
      score -= 10
    }

    // Check memory usage
    const sizeMB = stats.currentSizeBytes / (1024 * 1024)
    if (sizeMB > 200) {
      recommendations.push('High memory usage - consider reducing cache size')
      score -= 15
    }

    // Check entry density
    const avgEntrySize = stats.entryCount > 0 ? stats.currentSizeBytes / stats.entryCount : 0
    if (avgEntrySize > 100 * 1024) { // 100KB per entry
      recommendations.push('Large average entry size - consider compressing cached data')
      score -= 10
    }

    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal')
    }

    return { recommendations, score }
  }
}