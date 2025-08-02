/**
 * JCVD Capability Cache System Tests
 *
 * Test suite for the high-performance capability caching layer
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  CapabilityCacheManager,
  LRUCache,
  CacheKeyGenerator,
  CacheUtils,
  type CacheConfig,
} from '../../../../src/providers/capabilities/capability-cache.js';

import type {
  CapabilityDiscoveryResult,
  CapabilityProbeResult,
  CapabilityDiscoveryOptions,
} from '../../../../src/providers/capabilities/capability-discovery.js';

import type {
  ProviderFeatureMatrix,
  ProviderComparison,
} from '../../../../src/providers/capabilities/feature-matrix.js';

// =============================================================================
// Test Data Factories
// =============================================================================

function createMockDiscoveryResult(providerId: string): CapabilityDiscoveryResult {
  return {
    providerId,
    providerType: 'sqlite',
    capabilities: new Map([
      [
        'projects.create',
        {
          capabilityId: 'projects.create',
          isSupported: true,
          version: '1.0',
          probedAt: new Date(),
        },
      ],
      [
        'issues.create',
        {
          capabilityId: 'issues.create',
          isSupported: true,
          probedAt: new Date(),
        },
      ],
    ]),
    discoverySuccess: true,
    discoveryDuration: 150,
    discoveredAt: new Date(),
    errors: [],
    warnings: [],
  };
}

function createMockProbeResult(capabilityId: string): CapabilityProbeResult {
  return {
    capabilityId,
    isSupported: true,
    version: '1.0',
    performance: {
      averageResponseTime: 50,
      reliability: 0.99,
      throughput: 100,
    },
    probedAt: new Date(),
  };
}

function createMockFeatureMatrix(providerId: string): ProviderFeatureMatrix {
  return {
    providerId,
    providerType: 'sqlite',
    features: new Map([
      [
        'projects.create',
        {
          capabilityId: 'projects.create',
          supportLevel: 'full',
          implementationNotes: 'Full support',
          limitations: [],
          workarounds: [],
          performance: { responseTime: 10, reliability: 1, throughput: 1000 },
          lastValidated: new Date(),
        },
      ],
    ]),
    overallScore: 0.95,
    categoryScores: new Map([['core', 1.0]]),
    generatedAt: new Date(),
    validUntil: new Date(Date.now() + 60000),
  };
}

// =============================================================================
// Cache Key Generator Tests
// =============================================================================

describe('CacheKeyGenerator', () => {
  it('should generate consistent keys for capability discovery', () => {
    const options: CapabilityDiscoveryOptions = {
      targetCapabilities: ['projects.create', 'issues.create'],
      probeDepth: 'shallow',
    };

    const key1 = CacheKeyGenerator.forCapabilityDiscovery('provider1', options);
    const key2 = CacheKeyGenerator.forCapabilityDiscovery('provider1', options);

    expect(key1).toBe(key2);
    expect(key1).toContain('capability:provider1:');
  });

  it('should generate different keys for different options', () => {
    const options1: CapabilityDiscoveryOptions = { probeDepth: 'shallow' };
    const options2: CapabilityDiscoveryOptions = { probeDepth: 'deep' };

    const key1 = CacheKeyGenerator.forCapabilityDiscovery('provider1', options1);
    const key2 = CacheKeyGenerator.forCapabilityDiscovery('provider1', options2);

    expect(key1).not.toBe(key2);
  });

  it('should generate consistent keys for capability probes', () => {
    const options: CapabilityDiscoveryOptions = { probeDepth: 'shallow' };

    const key1 = CacheKeyGenerator.forCapabilityProbe('provider1', 'projects.create', options);
    const key2 = CacheKeyGenerator.forCapabilityProbe('provider1', 'projects.create', options);

    expect(key1).toBe(key2);
    expect(key1).toContain('probe:provider1:projects.create:');
  });

  it('should generate normalized keys for provider comparisons', () => {
    const key1 = CacheKeyGenerator.forProviderComparison('providerA', 'providerB');
    const key2 = CacheKeyGenerator.forProviderComparison('providerB', 'providerA');

    // Keys should be the same regardless of order
    expect(key1).toBe(key2);
    expect(key1).toContain('comparison:');
  });
});

// =============================================================================
// LRU Cache Tests
// =============================================================================

describe('LRUCache', () => {
  let cache: LRUCache<string>;
  const config: CacheConfig = {
    maxSizeBytes: 1000,
    defaultTTL: 5000,
    matrixTTL: 10000,
    comparisonTTL: 8000,
    maxEntriesPerProvider: 50,
    enableLRU: true,
    persistToDisk: false,
  };

  beforeEach(() => {
    cache = new LRUCache(config);
  });

  it('should store and retrieve values', () => {
    cache.set('key1', 'value1');

    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should respect TTL expiration', done => {
    cache.set('key1', 'value1', 100); // 100ms TTL

    expect(cache.get('key1')).toBe('value1');

    setTimeout(() => {
      expect(cache.get('key1')).toBeUndefined();
      done();
    }, 150);
  });

  it('should track cache size', () => {
    expect(cache.size()).toBe(0);

    cache.set('key1', 'small value');
    expect(cache.size()).toBeGreaterThan(0);

    const initialSize = cache.size();
    cache.set('key2', 'another small value');
    expect(cache.size()).toBeGreaterThan(initialSize);
  });

  it('should count entries correctly', () => {
    expect(cache.count()).toBe(0);

    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    expect(cache.count()).toBe(2);

    cache.delete('key1');
    expect(cache.count()).toBe(1);
  });

  it('should clean up expired entries', done => {
    cache.set('key1', 'value1', 50); // 50ms TTL
    cache.set('key2', 'value2', 200); // 200ms TTL

    expect(cache.count()).toBe(2);

    setTimeout(() => {
      const cleaned = cache.cleanup();
      expect(cleaned).toBe(1); // Only key1 should be expired
      expect(cache.count()).toBe(1); // Only key2 should remain
      done();
    }, 100);
  });

  it('should evict LRU entries when size limit exceeded', () => {
    const smallCache = new LRUCache<string>({
      ...config,
      maxSizeBytes: 100, // Very small cache
    });

    // Fill cache beyond capacity
    smallCache.set('key1', 'value1');
    smallCache.set('key2', 'value2');
    smallCache.set('key3', 'value3'); // Should trigger eviction

    // key1 should be evicted as it's least recently used
    expect(smallCache.get('key1')).toBeUndefined();
    expect(smallCache.get('key2')).toBeDefined();
    expect(smallCache.get('key3')).toBeDefined();
  });

  it('should clear all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    expect(cache.count()).toBe(2);

    cache.clear();

    expect(cache.count()).toBe(0);
    expect(cache.size()).toBe(0);
  });
});

// =============================================================================
// Capability Cache Manager Tests
// =============================================================================

describe('CapabilityCacheManager', () => {
  let cacheManager: CapabilityCacheManager;

  beforeEach(() => {
    cacheManager = new CapabilityCacheManager({
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      matrixTTL: 30 * 60 * 1000, // 30 minutes
      comparisonTTL: 15 * 60 * 1000, // 15 minutes
      maxEntriesPerProvider: 100,
      enableLRU: true,
      persistToDisk: false,
    });
  });

  afterEach(() => {
    cacheManager.clearAll();
  });

  it('should cache and retrieve capability discovery results', () => {
    const providerId = 'test-provider';
    const options: CapabilityDiscoveryOptions = { probeDepth: 'shallow' };
    const result = createMockDiscoveryResult(providerId);

    // Cache the result
    cacheManager.cacheDiscovery(providerId, options, result);

    // Retrieve from cache
    const cached = cacheManager.getCachedDiscovery(providerId, options);

    expect(cached).toBeDefined();
    expect(cached?.providerId).toBe(providerId);
    expect(cached?.capabilities.size).toBe(2);
  });

  it('should cache and retrieve capability probe results', () => {
    const providerId = 'test-provider';
    const capabilityId = 'projects.create';
    const options: CapabilityDiscoveryOptions = { probeDepth: 'shallow' };
    const result = createMockProbeResult(capabilityId);

    cacheManager.cacheProbe(providerId, capabilityId, options, result);

    const cached = cacheManager.getCachedProbe(providerId, capabilityId, options);

    expect(cached).toBeDefined();
    expect(cached?.capabilityId).toBe(capabilityId);
    expect(cached?.isSupported).toBe(true);
  });

  it('should cache and retrieve feature matrices', () => {
    const matrix = createMockFeatureMatrix('test-provider');

    cacheManager.cacheMatrix(matrix);

    const cached = cacheManager.getCachedMatrix('test-provider');

    expect(cached).toBeDefined();
    expect(cached?.providerId).toBe('test-provider');
    expect(cached?.overallScore).toBe(0.95);
  });

  it('should return undefined for non-existent cache entries', () => {
    const options: CapabilityDiscoveryOptions = { probeDepth: 'shallow' };

    expect(cacheManager.getCachedDiscovery('nonexistent', options)).toBeUndefined();
    expect(cacheManager.getCachedProbe('nonexistent', 'test.cap', options)).toBeUndefined();
    expect(cacheManager.getCachedMatrix('nonexistent')).toBeUndefined();
    expect(cacheManager.getCachedComparison('provider1', 'provider2')).toBeUndefined();
  });

  it('should invalidate cache entries by criteria', () => {
    const provider1 = 'provider1';
    const provider2 = 'provider2';
    const options: CapabilityDiscoveryOptions = { probeDepth: 'shallow' };

    // Cache some data
    cacheManager.cacheDiscovery(provider1, options, createMockDiscoveryResult(provider1));
    cacheManager.cacheDiscovery(provider2, options, createMockDiscoveryResult(provider2));
    cacheManager.cacheMatrix(createMockFeatureMatrix(provider1));
    cacheManager.cacheMatrix(createMockFeatureMatrix(provider2));

    // Verify data is cached
    expect(cacheManager.getCachedDiscovery(provider1, options)).toBeDefined();
    expect(cacheManager.getCachedMatrix(provider1)).toBeDefined();

    // Invalidate provider1 entries
    const invalidated = cacheManager.invalidate({ providerId: provider1 });

    expect(invalidated).toBeGreaterThan(0);

    // provider1 entries should be gone, provider2 should remain
    expect(cacheManager.getCachedDiscovery(provider1, options)).toBeUndefined();
    expect(cacheManager.getCachedMatrix(provider1)).toBeUndefined();
    expect(cacheManager.getCachedDiscovery(provider2, options)).toBeDefined();
    expect(cacheManager.getCachedMatrix(provider2)).toBeDefined();
  });

  it('should provide cache statistics', () => {
    const providerId = 'test-provider';
    const options: CapabilityDiscoveryOptions = { probeDepth: 'shallow' };

    // Perform some cache operations
    cacheManager.cacheDiscovery(providerId, options, createMockDiscoveryResult(providerId));
    cacheManager.getCachedDiscovery(providerId, options); // Hit
    cacheManager.getCachedDiscovery('nonexistent', options); // Miss

    const stats = cacheManager.getStatistics();

    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRatio).toBe(0.5);
    expect(stats.entryCount).toBeGreaterThan(0);
    expect(stats.currentSizeBytes).toBeGreaterThan(0);
  });

  it('should clear all caches', () => {
    const providerId = 'test-provider';
    const options: CapabilityDiscoveryOptions = { probeDepth: 'shallow' };

    // Cache some data
    cacheManager.cacheDiscovery(providerId, options, createMockDiscoveryResult(providerId));
    cacheManager.cacheMatrix(createMockFeatureMatrix(providerId));

    // Verify data exists
    expect(cacheManager.getCachedDiscovery(providerId, options)).toBeDefined();
    expect(cacheManager.getCachedMatrix(providerId)).toBeDefined();

    // Clear all
    cacheManager.clearAll();

    // Verify data is gone
    expect(cacheManager.getCachedDiscovery(providerId, options)).toBeUndefined();
    expect(cacheManager.getCachedMatrix(providerId)).toBeUndefined();

    const stats = cacheManager.getStatistics();
    expect(stats.entryCount).toBe(0);
    expect(stats.currentSizeBytes).toBe(0);
  });
});

// =============================================================================
// Cache Utilities Tests
// =============================================================================

describe('CacheUtils', () => {
  it('should create optimal cache configuration', () => {
    const config = CacheUtils.createOptimalConfig();

    expect(config.maxSizeBytes).toBeGreaterThan(0);
    expect(config.defaultTTL).toBeGreaterThan(0);
    expect(config.matrixTTL).toBeGreaterThan(config.defaultTTL);
    expect(config.enableLRU).toBe(true);
  });

  it('should analyze cache performance', () => {
    const mockStats = {
      hits: 80,
      misses: 20,
      hitRatio: 0.8,
      currentSizeBytes: 50 * 1024 * 1024, // 50MB
      entryCount: 1000,
      evictions: 5,
      averageResponseTime: 25,
      providerStats: new Map(),
    };

    const analysis = CacheUtils.analyzeCachePerformance(mockStats);

    expect(analysis.score).toBeGreaterThan(0);
    expect(analysis.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(analysis.recommendations)).toBe(true);
    expect(analysis.recommendations.length).toBeGreaterThan(0);
  });

  it('should provide recommendations for poor performance', () => {
    const poorStats = {
      hits: 10,
      misses: 90,
      hitRatio: 0.1, // Very poor hit ratio
      currentSizeBytes: 200 * 1024 * 1024, // 200MB - high usage
      entryCount: 100,
      evictions: 50,
      averageResponseTime: 500,
      providerStats: new Map(),
    };

    const analysis = CacheUtils.analyzeCachePerformance(poorStats);

    expect(analysis.score).toBeLessThan(50); // Poor score
    expect(
      analysis.recommendations.some(
        rec => rec.includes('hit ratio') || rec.includes('memory usage')
      )
    ).toBe(true);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Cache Integration', () => {
  it('should handle cache warming scenario', async () => {
    const cacheManager = new CapabilityCacheManager({
      maxSizeBytes: 1024 * 1024, // 1MB
      defaultTTL: 60000, // 1 minute
      matrixTTL: 300000, // 5 minutes
      comparisonTTL: 180000, // 3 minutes
      maxEntriesPerProvider: 50,
      enableLRU: true,
      persistToDisk: false,
    });

    // Simulate warming up cache with common capabilities
    const providers = ['sqlite-provider', 'linear-provider', 'github-provider'];
    const commonCapabilities = ['projects.create', 'issues.create', 'issues.read'];
    const options: CapabilityDiscoveryOptions = { probeDepth: 'shallow' };

    // Warm up cache
    for (const providerId of providers) {
      for (const capabilityId of commonCapabilities) {
        const probeResult = createMockProbeResult(capabilityId);
        cacheManager.cacheProbe(providerId, capabilityId, options, probeResult);
      }

      const discoveryResult = createMockDiscoveryResult(providerId);
      cacheManager.cacheDiscovery(providerId, options, discoveryResult);
    }

    // Verify cache is warmed
    const stats = cacheManager.getStatistics();
    expect(stats.entryCount).toBe(providers.length * (commonCapabilities.length + 1)); // Probes + discoveries

    // Test cache hits
    for (const providerId of providers) {
      expect(cacheManager.getCachedDiscovery(providerId, options)).toBeDefined();

      for (const capabilityId of commonCapabilities) {
        expect(cacheManager.getCachedProbe(providerId, capabilityId, options)).toBeDefined();
      }
    }

    // Verify hit ratio improved
    const finalStats = cacheManager.getStatistics();
    expect(finalStats.hitRatio).toBeGreaterThan(0);
  });

  it('should handle memory pressure and eviction', () => {
    const smallCache = new CapabilityCacheManager({
      maxSizeBytes: 1024, // Very small - 1KB
      defaultTTL: 60000,
      matrixTTL: 300000,
      comparisonTTL: 180000,
      maxEntriesPerProvider: 10,
      enableLRU: true,
      persistToDisk: false,
    });

    const options: CapabilityDiscoveryOptions = { probeDepth: 'shallow' };

    // Fill cache beyond capacity
    for (let i = 0; i < 20; i++) {
      const providerId = `provider-${i}`;
      const result = createMockDiscoveryResult(providerId);
      smallCache.cacheDiscovery(providerId, options, result);
    }

    const stats = smallCache.getStatistics();

    // Cache should have evicted some entries
    expect(stats.evictions).toBeGreaterThan(0);
    expect(stats.entryCount).toBeLessThan(20); // Some entries evicted
    expect(stats.currentSizeBytes).toBeLessThanOrEqual(smallCache['config'].maxSizeBytes);
  });
});
