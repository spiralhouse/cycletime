/**
 * JCVD Provider System - Main Export Module
 * Comprehensive exports for all provider system components
 */

// Core provider types and interfaces (includes ProviderRegistry interface)
export * from './types.js';

// Export data format and validation
export * from './export-format.js';

// Migration utilities and orchestration (includes MigrationPhase type)
export * from './migration-utils.js';

// Provider validation utilities
export * from './validation.js';

// Base provider implementations and utilities (explicit re-exports to avoid conflicts)
export {
  ConnectionManager,
  BaseProvider,
  HealthMonitor,
  ProviderRegistry as ConcreteProviderRegistry,
  getGlobalProviderRegistry,
  resetGlobalProviderRegistry,
  SQLiteConnectionManager as BaseSQLiteConnectionManager,
} from './base/index.js';

// Enhanced provider factory system
export * from './factory/index.js';

// Data transformation system
export * from './transformers/index.js';

// Capability discovery and management system (explicit re-exports to avoid conflicts)
export {
  createCapabilityDiscoverySystem,
  createLightweightCapabilitySystem,
} from './capabilities/index.js';
// Re-export key capability types (avoiding MigrationPhase conflict)
export type {
  CapabilityDiscoveryResult,
  CapabilityProbeResult,
  ProviderFeatureMatrix,
  ProviderComparison,
} from './capabilities/index.js';

// Re-export specific provider implementations when available
export * from './sqlite/index.js';
// Note: local and linear providers not yet implemented
// export * from './local/index.js'
// export * from './linear/index.js'

// =============================================================================
// Provider Registry Functions
// =============================================================================

import { getGlobalProviderRegistry } from './base/provider-registry.js';

import type { IssueProvider, ProviderType } from './types.js';

/**
 * Register a provider instance in the global registry
 * @param provider Provider instance to register
 * @returns Promise resolving to operation result
 */
export async function registerProvider(_provider: IssueProvider): Promise<void> {
  const registry = getGlobalProviderRegistry();
  const result = await registry.registerProvider(_provider);

  if (!result.success) {
    throw result.error;
  }
}

/**
 * Get a provider implementation by ID from the global registry
 * @param id Provider identifier
 * @returns Provider instance or undefined if not found
 */
export function getProviderImplementation(id: string): IssueProvider | undefined {
  const registry = getGlobalProviderRegistry();

  return registry.getProvider(id);
}

/**
 * Get all registered provider types from the global registry
 * @returns Array of provider types currently registered
 */
export function getRegisteredProviderTypes(): ProviderType[] {
  const registry = getGlobalProviderRegistry();
  const providers = registry.listProviders();

  // Get unique provider types
  const types = new Set<ProviderType>();

  providers.forEach(provider => types.add(provider.type));

  return Array.from(types);
}
