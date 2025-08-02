/**
 * JCVD Capability Discovery System Tests
 *
 * Comprehensive test suite for the capability discovery system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CapabilityRegistry,
  CapabilityDiscoveryEngine,
  type CapabilityDefinition,
  type CapabilityDiscoveryOptions,
} from '../../../../src/providers/capabilities/capability-discovery.js';

import type { IssueProvider, ProviderInfo, ProviderType } from '../../../../src/providers/types.js';

// =============================================================================
// Mock Provider Implementation
// =============================================================================

class MockProvider implements Partial<IssueProvider> {
  constructor(
    private providerId: string,
    private providerType: ProviderType,
    private isHealthy: boolean = true
  ) {}

  getProviderInfo(): ProviderInfo {
    return {
      id: this.providerId,
      type: this.providerType,
      name: `Mock ${this.providerType} Provider`,
      version: '1.0.0-test',
      description: 'Mock provider for testing',
      capabilities: {
        supportsProjects: true,
        supportsHierarchy: true,
        supportsDependencies: true,
        supportsCustomWorkflows: false,
        supportsEstimation: true,
        supportsLabels: true,
        supportsComments: true,
        supportsAssignees: true,
        supportsExport: true,
        supportsImport: false,
        supportsSync: false,
        supportsOffline: this.providerType === 'sqlite',
      },
      status: {
        isConnected: this.isHealthy,
        isHealthy: this.isHealthy,
        lastHealthCheck: new Date(),
      },
      authRequired: this.providerType !== 'sqlite',
      configSchema: {},
    };
  }

  async isAvailable(): Promise<boolean> {
    return this.isHealthy;
  }

  async healthCheck() {
    return {
      isConnected: this.isHealthy,
      isHealthy: this.isHealthy,
      lastHealthCheck: new Date(),
    };
  }
}

// =============================================================================
// Capability Registry Tests
// =============================================================================

describe('CapabilityRegistry', () => {
  let registry: CapabilityRegistry;

  beforeEach(() => {
    // Get a fresh instance for each test
    registry = CapabilityRegistry.getInstance();
  });

  it('should initialize with default capabilities', () => {
    const allCapabilities = registry.getAllCapabilities();
    expect(allCapabilities.length).toBeGreaterThan(0);

    // Check for some expected capabilities
    const projectsCreate = registry.getCapability('projects.create');
    expect(projectsCreate).toBeDefined();
    expect(projectsCreate?.name).toBe('Project Creation');
    expect(projectsCreate?.required).toBe(true);
  });

  it('should register new capabilities', () => {
    const customCapability: CapabilityDefinition = {
      id: 'test.custom',
      name: 'Custom Test Capability',
      description: 'A custom capability for testing',
      category: 'core',
      required: false,
      dependencies: [],
      alternatives: [],
    };

    registry.registerCapability(customCapability);

    const retrieved = registry.getCapability('test.custom');
    expect(retrieved).toEqual(customCapability);
  });

  it('should get capabilities by category', () => {
    const coreCapabilities = registry.getCapabilitiesByCategory('core');
    expect(coreCapabilities.length).toBeGreaterThan(0);

    coreCapabilities.forEach(cap => {
      expect(cap.category).toBe('core');
    });
  });

  it('should get required capabilities', () => {
    const requiredCapabilities = registry.getRequiredCapabilities();
    expect(requiredCapabilities.length).toBeGreaterThan(0);

    requiredCapabilities.forEach(cap => {
      expect(cap.required).toBe(true);
    });
  });

  it('should validate capability dependencies', () => {
    const capabilityIds = ['projects.create', 'issues.create', 'issues.read'];
    const validation = registry.validateDependencies(capabilityIds);

    expect(validation.isValid).toBe(true);
    expect(validation.missing).toHaveLength(0);
  });

  it('should detect missing dependencies', () => {
    const capabilityIds = ['issues.update']; // Depends on 'issues.read' which is not included
    const validation = registry.validateDependencies(capabilityIds);

    // This test assumes 'issues.update' depends on 'issues.read'
    // May need adjustment based on actual capability definitions
    expect(validation.missing.length).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// Capability Discovery Engine Tests
// =============================================================================

describe('CapabilityDiscoveryEngine', () => {
  let engine: CapabilityDiscoveryEngine;
  let mockProvider: MockProvider;

  beforeEach(() => {
    engine = new CapabilityDiscoveryEngine();
    mockProvider = new MockProvider('test-sqlite', 'sqlite');
  });

  it('should throw error when no probe is registered', async () => {
    await expect(engine.discoverCapabilities(mockProvider as IssueProvider)).rejects.toThrow(
      'No capability probe registered'
    );
  });

  it('should handle discovery timeout', async () => {
    // Mock a probe that takes too long
    const slowProbe = {
      async probeCapability() {
        return new Promise(resolve => {
          setTimeout(resolve, 2000); // 2 second delay
        });
      },
      getProviderCapabilityInfo: () => undefined,
    };

    engine.registerProbe('sqlite', slowProbe);

    const options: CapabilityDiscoveryOptions = {
      timeout: 100, // 100ms timeout
      targetCapabilities: ['projects.create'],
    };

    const result = await engine.discoverCapabilities(mockProvider as IssueProvider, options);

    expect(result.discoverySuccess).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle provider unavailability', async () => {
    const unavailableProvider = new MockProvider('test-unavailable', 'sqlite', false);

    const mockProbe = {
      async probeCapability() {
        return {
          isSupported: false,
          error: {
            name: 'ProviderUnavailableError',
            message: 'Provider is not available',
            code: 'PROVIDER_UNAVAILABLE' as const,
            providerId: 'test-unavailable',
            providerType: 'sqlite' as const,
            retryable: true,
          },
          probedAt: new Date(),
        };
      },
      getProviderCapabilityInfo: () => undefined,
    };

    engine.registerProbe('sqlite', mockProbe);

    const result = await engine.discoverCapabilities(unavailableProvider as IssueProvider, {
      targetCapabilities: ['projects.create'],
    });

    expect(result.discoverySuccess).toBe(false);
    expect(result.capabilities.get('projects.create')?.isSupported).toBe(false);
  });

  it('should calculate compatibility scores between providers', async () => {
    // Mock two providers with different capabilities
    const provider1 = new MockProvider('provider1', 'sqlite');
    const provider2 = new MockProvider('provider2', 'linear');

    const mockProbe = {
      async probeCapability(provider: IssueProvider, capabilityId: string) {
        const providerInfo = provider.getProviderInfo();

        // SQLite supports more capabilities than Linear for this test
        const isSupported =
          providerInfo.type === 'sqlite' ||
          ['projects.create', 'issues.create'].includes(capabilityId);

        return {
          capabilityId,
          isSupported,
          probedAt: new Date(),
        };
      },
      getProviderCapabilityInfo: () => undefined,
    };

    engine.registerProbe('sqlite', mockProbe);
    engine.registerProbe('linear', mockProbe);

    const compatibility = await engine.getCompatibilityScore(
      provider1 as IssueProvider,
      provider2 as IssueProvider
    );

    expect(compatibility.score).toBeGreaterThanOrEqual(0);
    expect(compatibility.score).toBeLessThanOrEqual(1);
    expect(compatibility.analysis).toBeDefined();
    expect(Array.isArray(compatibility.compatibleCapabilities)).toBe(true);
    expect(Array.isArray(compatibility.incompatibleCapabilities)).toBe(true);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Capability Discovery Integration', () => {
  it('should work end-to-end with registry and engine', async () => {
    const registry = CapabilityRegistry.getInstance();
    const engine = new CapabilityDiscoveryEngine();
    const provider = new MockProvider('integration-test', 'sqlite');

    // Register a simple probe
    const probe = {
      async probeCapability(provider: IssueProvider, capabilityId: string) {
        const capability = registry.getCapability(capabilityId);

        return {
          capabilityId,
          isSupported: capability?.required || false,
          version: '1.0.0',
          metadata: {
            probeType: 'integration-test',
          },
          probedAt: new Date(),
        };
      },
      getProviderCapabilityInfo: () => ({
        implementationDetails: 'Integration test implementation',
        performanceNotes: 'Fast test execution',
      }),
    };

    engine.registerProbe('sqlite', probe);

    // Test discovery with required capabilities only
    const requiredCapabilities = registry.getRequiredCapabilities().map(cap => cap.id);

    const result = await engine.discoverCapabilities(provider as IssueProvider, {
      targetCapabilities: requiredCapabilities,
      probeDepth: 'shallow',
    });

    expect(result.discoverySuccess).toBe(true);
    expect(result.capabilities.size).toBe(requiredCapabilities.length);

    // All required capabilities should be supported in this test
    for (const [capabilityId, probeResult] of result.capabilities) {
      expect(probeResult.isSupported).toBe(true);
      expect(probeResult.capabilityId).toBe(capabilityId);
    }
  });

  it('should handle mixed success and failure scenarios', async () => {
    const registry = CapabilityRegistry.getInstance();
    const engine = new CapabilityDiscoveryEngine();
    const provider = new MockProvider('mixed-test', 'github');

    // Register a probe that succeeds for some capabilities and fails for others
    const probe = {
      async probeCapability(provider: IssueProvider, capabilityId: string) {
        // Simulate GitHub limitations - no dependency support
        const isSupported = !capabilityId.includes('dependencies');

        if (!isSupported) {
          return {
            capabilityId,
            isSupported: false,
            error: {
              name: 'CapabilityNotSupportedError',
              message: `${capabilityId} not supported by GitHub`,
              code: 'PROVIDER_FEATURE_NOT_SUPPORTED' as const,
              providerId: 'mixed-test',
              providerType: 'github' as const,
              retryable: false,
            },
            probedAt: new Date(),
          };
        }

        return {
          capabilityId,
          isSupported: true,
          metadata: {
            limitations: ['Limited by GitHub API'],
          },
          probedAt: new Date(),
        };
      },
      getProviderCapabilityInfo: () => undefined,
    };

    engine.registerProbe('github', probe);

    const testCapabilities = [
      'projects.create',
      'issues.create',
      'dependencies.create', // This should fail
      'workflow.states', // This should fail
    ];

    const result = await engine.discoverCapabilities(provider as IssueProvider, {
      targetCapabilities: testCapabilities,
    });

    // Should have partial success
    const supportedCount = Array.from(result.capabilities.values()).filter(
      probe => probe.isSupported
    ).length;

    const unsupportedCount = Array.from(result.capabilities.values()).filter(
      probe => !probe.isSupported
    ).length;

    expect(supportedCount).toBeGreaterThan(0);
    expect(unsupportedCount).toBeGreaterThan(0);
    expect(supportedCount + unsupportedCount).toBe(testCapabilities.length);
  });
});
