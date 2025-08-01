/**
 * JCVD Provider Capability Discovery System - Main Export Module
 * 
 * This module provides comprehensive capability discovery, feature matrix
 * comparison, and intelligent caching for provider capability management.
 */

// Core capability discovery system
export * from './capability-discovery.js'

// Provider-specific capability probes
export * from './capability-probes.js'

// Feature matrix and provider comparison
export * from './feature-matrix.js'

// High-performance capability caching
export * from './capability-cache.js'

// Capability-aware provider factory and operation dispatcher
export * from './capability-aware-factory.js'

// =============================================================================
// Convenience Factory Functions
// =============================================================================

import { CapabilityDiscoveryEngine, CapabilityRegistry } from './capability-discovery.js'
import { CapabilityProbeFactory } from './capability-probes.js'
import { FeatureMatrixGenerator, ProviderComparisonEngine } from './feature-matrix.js'
import { CapabilityCacheManager, CacheUtils } from './capability-cache.js'
import { CapabilityAwareProviderFactory, CapabilityAwareOperationDispatcher } from './capability-aware-factory.js'
import type { ProviderType } from '../types.js'

/**
 * Create a fully configured capability discovery system
 */
export function createCapabilityDiscoverySystem(options?: {
  enableCaching?: boolean
  cacheConfig?: Parameters<typeof CapabilityCacheManager>[0]
}) {
  const registry = CapabilityRegistry.getInstance()
  const engine = new CapabilityDiscoveryEngine()
  
  // Register all standard probes
  const providerTypes: ProviderType[] = ['sqlite', 'linear', 'github', 'jira']
  providerTypes.forEach(type => {
    const probe = CapabilityProbeFactory.getProbe(type)
    engine.registerProbe(type, probe)
  })

  // Set up feature matrix system
  const matrixGenerator = new FeatureMatrixGenerator(registry)
  const comparisonEngine = new ProviderComparisonEngine(matrixGenerator)

  // Set up caching if enabled
  let cacheManager: CapabilityCacheManager | undefined
  if (options?.enableCaching !== false) {
    const cacheConfig = options?.cacheConfig || CacheUtils.createOptimalConfig()
    cacheManager = new CapabilityCacheManager(cacheConfig)
  }

  // Set up capability-aware factory and dispatcher
  const providerFactory = new CapabilityAwareProviderFactory()
  const operationDispatcher = new CapabilityAwareOperationDispatcher(cacheManager)

  return {
    registry,
    engine,
    matrixGenerator,
    comparisonEngine,
    cacheManager,
    providerFactory,
    operationDispatcher
  }
}

/**
 * Create a lightweight capability discovery system for basic use cases
 */
export function createLightweightCapabilitySystem() {
  return createCapabilityDiscoverySystem({
    enableCaching: true,
    cacheConfig: {
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      defaultTTL: 10 * 60 * 1000, // 10 minutes
      matrixTTL: 60 * 60 * 1000, // 1 hour
      comparisonTTL: 30 * 60 * 1000, // 30 minutes
      maxEntriesPerProvider: 50,
      enableLRU: true,
      persistToDisk: false
    }
  })
}