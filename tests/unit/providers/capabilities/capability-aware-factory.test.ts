/**
 * JCVD Capability-Aware Provider Factory Tests
 * 
 * Test suite for the capability-aware provider factory and operation dispatcher
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  CapabilityAwareProviderFactory,
  CapabilityAwareOperationDispatcher
} from '../../../../src/providers/capabilities/capability-aware-factory.js'

import type {
  ProviderConfig,
  IssueProvider,
  ProviderInfo,
  ProviderError
} from '../../../../src/providers/types.js'

import { CapabilityCacheManager } from '../../../../src/providers/capabilities/capability-cache.js'

// =============================================================================
// Mock Provider Implementation
// =============================================================================

class MockProvider implements Partial<IssueProvider> {
  constructor(
    private config: ProviderConfig,
    private supportedCapabilities: string[] = []
  ) {}

  getProviderInfo(): ProviderInfo {
    return {
      id: this.config.id,
      type: this.config.type,
      name: this.config.name,
      version: '1.0.0-test',
      description: 'Mock provider for testing',
      capabilities: {
        supportsProjects: true,
        supportsHierarchy: true,
        supportsDependencies: this.supportedCapabilities.includes('dependencies.create'),
        supportsCustomWorkflows: this.config.type === 'sqlite',
        supportsEstimation: true,
        supportsLabels: true,
        supportsComments: true,
        supportsAssignees: true,
        supportsExport: true,
        supportsImport: this.config.type === 'sqlite',
        supportsSync: this.config.type === 'linear',
        supportsOffline: this.config.type === 'sqlite'
      },
      status: {
        isConnected: true,
        isHealthy: true,
        lastHealthCheck: new Date()
      },
      authRequired: this.config.type !== 'sqlite',
      configSchema: {}
    }
  }

  async isAvailable(): Promise<boolean> {
    return true
  }

  async supportsCapability(capabilityId: string): Promise<boolean> {
    return this.supportedCapabilities.includes(capabilityId)
  }

  async validateCapabilities(requiredCapabilities: string[]) {
    const supported = requiredCapabilities.filter(cap => this.supportedCapabilities.includes(cap))
    const unsupported = requiredCapabilities.filter(cap => !this.supportedCapabilities.includes(cap))

    return {
      isValid: unsupported.length === 0,
      supportedCapabilities: supported,
      unsupportedCapabilities: unsupported,
      warnings: unsupported.length > 0 ? [`${unsupported.length} capabilities not supported`] : []
    }
  }
}

// =============================================================================
// Capability-Aware Provider Factory Tests
// =============================================================================

describe('CapabilityAwareProviderFactory', () => {
  let factory: CapabilityAwareProviderFactory

  beforeEach(() => {
    factory = new CapabilityAwareProviderFactory()
    
    // Mock the provider constructors to return MockProvider instances
    ;(factory as any).providerConstructors.set('sqlite', async (config: ProviderConfig) => {
      return new MockProvider(config, [
        'projects.create', 'projects.read', 'projects.update',
        'issues.create', 'issues.read', 'issues.update',
        'dependencies.create', 'workflow.states', 'performance.offline'
      ]) as IssueProvider
    })

    ;(factory as any).providerConstructors.set('linear', async (config: ProviderConfig) => {
      return new MockProvider(config, [
        'projects.create', 'projects.read',
        'issues.create', 'issues.read', 'issues.update',
        'hierarchy.epics', 'hierarchy.stories', 'collaboration.assignees'
      ]) as IssueProvider
    })

    ;(factory as any).providerConstructors.set('github', async (config: ProviderConfig) => {
      return new MockProvider(config, [
        'projects.create', 'projects.read',
        'issues.create', 'issues.read', 'issues.update',
        'organization.labels', 'collaboration.assignees'
      ]) as IssueProvider
    })
  })

  it('should create provider instance from configuration', async () => {
    const config: ProviderConfig = {
      type: 'sqlite',
      id: 'test-sqlite',
      name: 'Test SQLite Provider',
      enabled: true,
      databasePath: ':memory:'
    } as any

    const provider = await factory.createProvider(config)
    
    expect(provider).toBeDefined()
    expect(provider.getProviderInfo().id).toBe('test-sqlite')
    expect(provider.getProviderInfo().type).toBe('sqlite')
  })

  it('should create provider with capability validation', async () => {
    const config: ProviderConfig = {
      type: 'sqlite',
      id: 'test-sqlite',
      name: 'Test SQLite Provider',
      enabled: true,
      databasePath: ':memory:'
    } as any

    const requiredCapabilities = ['projects.create', 'issues.create', 'dependencies.create']

    const result = await factory.createProviderWithCapabilities(config, requiredCapabilities)
    
    expect(result.provider).toBeDefined()
    expect(result.capabilityValidation.isValid).toBe(true)
    expect(result.capabilityValidation.supportedCapabilities).toEqual(
      expect.arrayContaining(requiredCapabilities)
    )
    expect(result.capabilityValidation.unsupportedCapabilities).toHaveLength(0)
  })

  it('should identify unsupported capabilities', async () => {
    const config: ProviderConfig = {
      type: 'github',
      id: 'test-github',
      name: 'Test GitHub Provider',
      enabled: true,
      apiToken: 'test-token',
      owner: 'test-owner',
      repo: 'test-repo'
    } as any

    const requiredCapabilities = [
      'projects.create', // Supported
      'issues.create',   // Supported
      'dependencies.create', // NOT supported by GitHub
      'workflow.states'  // NOT supported by GitHub
    ]

    const result = await factory.createProviderWithCapabilities(config, requiredCapabilities)
    
    expect(result.capabilityValidation.isValid).toBe(false)
    expect(result.capabilityValidation.supportedCapabilities).toContain('projects.create')
    expect(result.capabilityValidation.supportedCapabilities).toContain('issues.create')
    expect(result.capabilityValidation.unsupportedCapabilities).toContain('dependencies.create')
    expect(result.capabilityValidation.unsupportedCapabilities).toContain('workflow.states')
  })

  it('should validate provider configuration', () => {
    const validConfig: ProviderConfig = {
      type: 'sqlite',
      id: 'test-sqlite',
      name: 'Test SQLite Provider',
      enabled: true,
      databasePath: '/path/to/db.sqlite'
    } as any

    const validation = factory.validateConfig(validConfig)
    expect(validation.isValid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })

  it('should detect invalid provider configuration', () => {
    const invalidConfig: ProviderConfig = {
      type: 'linear',
      id: 'test-linear',
      name: 'Test Linear Provider',
      enabled: true
      // Missing required apiToken and teamId
    } as any

    const validation = factory.validateConfig(invalidConfig)
    expect(validation.isValid).toBe(false)
    expect(validation.errors.length).toBeGreaterThan(0)
    expect(validation.errors.some(error => error.includes('apiToken'))).toBe(true)
    expect(validation.errors.some(error => error.includes('teamId'))).toBe(true)
  })

  it('should find best provider for required capabilities', async () => {
    const availableConfigs: ProviderConfig[] = [
      {
        type: 'sqlite',
        id: 'sqlite-option',
        name: 'SQLite Option',
        enabled: true,
        databasePath: ':memory:'
      } as any,
      {
        type: 'github',
        id: 'github-option',
        name: 'GitHub Option',
        enabled: true,
        apiToken: 'token',
        owner: 'owner',
        repo: 'repo'
      } as any
    ]

    const requiredCapabilities = ['projects.create', 'dependencies.create']

    const result = await factory.findBestProviderForCapabilities(
      requiredCapabilities,
      availableConfigs
    )

    // SQLite should be recommended since it supports dependencies
    expect(result.recommendedConfig).toBeDefined()
    expect(result.recommendedConfig?.type).toBe('sqlite')
    expect(result.compatibilityScore).toBeGreaterThan(0.5)
    expect(result.analysis.supportedCapabilities).toContain('dependencies.create')
  })

  it('should return null when no provider meets requirements', async () => {
    const availableConfigs: ProviderConfig[] = [
      {
        type: 'github',
        id: 'github-only',
        name: 'GitHub Only',
        enabled: true,
        apiToken: 'token',
        owner: 'owner',
        repo: 'repo'
      } as any
    ]

    const requiredCapabilities = ['dependencies.create', 'workflow.states'] // GitHub doesn't support these

    const result = await factory.findBestProviderForCapabilities(
      requiredCapabilities,
      availableConfigs
    )

    expect(result.compatibilityScore).toBe(0)
    expect(result.analysis.unsupportedCapabilities.length).toBe(2)
  })

  it('should get supported provider types', () => {
    const supportedTypes = factory.getSupportedTypes()
    
    expect(supportedTypes).toContain('sqlite')
    expect(supportedTypes).toContain('linear')
    expect(supportedTypes).toContain('github')
    expect(supportedTypes.length).toBeGreaterThan(0)
  })

  it('should throw error for unsupported provider type', async () => {
    const invalidConfig: ProviderConfig = {
      type: 'unsupported' as any,
      id: 'test',
      name: 'Test',
      enabled: true
    }

    await expect(factory.createProvider(invalidConfig)).rejects.toThrow('Unsupported provider type')
  })
})

// =============================================================================
// Capability-Aware Operation Dispatcher Tests
// =============================================================================

describe('CapabilityAwareOperationDispatcher', () => {
  let dispatcher: CapabilityAwareOperationDispatcher
  let cacheManager: CapabilityCacheManager
  let mockProvider: MockProvider

  beforeEach(() => {
    cacheManager = new CapabilityCacheManager({
      maxSizeBytes: 1024 * 1024,
      defaultTTL: 60000,
      matrixTTL: 300000,
      comparisonTTL: 180000,
      maxEntriesPerProvider: 50,
      enableLRU: true,
      persistToDisk: false
    })
    
    dispatcher = new CapabilityAwareOperationDispatcher(cacheManager)
    
    mockProvider = new MockProvider(
      { type: 'sqlite', id: 'test', name: 'Test', enabled: true } as any,
      ['projects.create', 'issues.create', 'issues.read']
    )
  })

  it('should execute operation when capabilities are supported', async () => {
    const mockOperation = vi.fn().mockResolvedValue('operation result')
    const requiredCapabilities = ['projects.create', 'issues.create']

    const result = await dispatcher.executeWithCapabilityCheck(
      mockProvider as IssueProvider,
      mockOperation,
      requiredCapabilities,
      'createProject'
    )

    expect(result).toBe('operation result')
    expect(mockOperation).toHaveBeenCalledOnce()
  })

  it('should throw error when required capabilities are missing', async () => {
    const mockOperation = vi.fn().mockResolvedValue('operation result')
    const requiredCapabilities = ['dependencies.create'] // Not supported by mock provider

    await expect(
      dispatcher.executeWithCapabilityCheck(
        mockProvider as IssueProvider,
        mockOperation,
        requiredCapabilities,
        'createDependency'
      )
    ).rejects.toThrow('Operation createDependency cannot be executed')

    expect(mockOperation).not.toHaveBeenCalled()
  })

  it('should provide alternatives for unsupported operations', async () => {
    const unsupportedCapabilities = ['dependencies.create', 'workflow.automation']

    const alternatives = await dispatcher.getOperationAlternatives(
      mockProvider as IssueProvider,
      unsupportedCapabilities
    )

    expect(alternatives.alternatives).toBeDefined()
    expect(alternatives.workarounds).toBeDefined()
    expect(alternatives.workarounds.length).toBeGreaterThan(0)
  })

  it('should enhance capability-related errors', async () => {
    const mockOperation = vi.fn().mockRejectedValue({
      name: 'ProviderError',
      message: 'Feature not supported',
      code: 'PROVIDER_FEATURE_NOT_SUPPORTED'
    })

    const requiredCapabilities = ['issues.create'] // Supported, but operation fails

    await expect(
      dispatcher.executeWithCapabilityCheck(
        mockProvider as IssueProvider,
        mockOperation,
        requiredCapabilities,
        'createIssue'
      )
    ).rejects.toMatchObject({
      code: 'PROVIDER_FEATURE_NOT_SUPPORTED',
      userActions: expect.arrayContaining([
        expect.stringContaining('Verify provider supports required capabilities')
      ])
    })
  })

  it('should pass through non-capability-related errors', async () => {
    const networkError = new Error('Network connection failed')
    const mockOperation = vi.fn().mockRejectedValue(networkError)
    const requiredCapabilities = ['issues.create']

    await expect(
      dispatcher.executeWithCapabilityCheck(
        mockProvider as IssueProvider,
        mockOperation,
        requiredCapabilities,
        'createIssue'
      )
    ).rejects.toBe(networkError)
  })

  it('should work without cache manager', async () => {
    const dispatcherWithoutCache = new CapabilityAwareOperationDispatcher()
    const mockOperation = vi.fn().mockResolvedValue('success')
    
    const result = await dispatcherWithoutCache.executeWithCapabilityCheck(
      mockProvider as IssueProvider,
      mockOperation,
      ['projects.create'],
      'createProject'
    )

    expect(result).toBe('success')
    expect(mockOperation).toHaveBeenCalledOnce()
  })
})

// =============================================================================
// Integration Tests
// =============================================================================

describe('Capability-Aware Factory Integration', () => {
  it('should work end-to-end with realistic scenarios', async () => {
    const factory = new CapabilityAwareProviderFactory()
    
    // Mock realistic provider constructors
    ;(factory as any).providerConstructors.set('sqlite', async (config: ProviderConfig) => {
      return new MockProvider(config, [
        'projects.create', 'projects.read', 'projects.update', 'projects.delete',
        'issues.create', 'issues.read', 'issues.update', 'issues.delete', 'issues.list',
        'dependencies.create', 'dependencies.remove', 'dependencies.graph',
        'workflow.states', 'workflow.transitions',
        'organization.labels', 'organization.priorities',
        'performance.offline', 'integration.export'
      ]) as IssueProvider
    })

    const config: ProviderConfig = {
      type: 'sqlite',
      id: 'integration-test',
      name: 'Integration Test Provider',
      enabled: true,
      databasePath: ':memory:'
    } as any

    // Test comprehensive capability requirements
    const comprehensiveCapabilities = [
      'projects.create',
      'issues.create',
      'dependencies.create',
      'workflow.states',
      'performance.offline'
    ]

    const result = await factory.createProviderWithCapabilities(
      config,
      comprehensiveCapabilities
    )

    expect(result.provider).toBeDefined()
    expect(result.capabilityValidation.isValid).toBe(true)
    expect(result.capabilityValidation.supportedCapabilities).toHaveLength(5)
    expect(result.capabilityValidation.unsupportedCapabilities).toHaveLength(0)

    // Test operation dispatch with the created provider
    const dispatcher = new CapabilityAwareOperationDispatcher()
    
    const mockOperation = vi.fn().mockResolvedValue({ id: 'test-project', name: 'Test Project' })
    
    const operationResult = await dispatcher.executeWithCapabilityCheck(
      result.provider,
      mockOperation,
      ['projects.create'],
      'createProject'
    )

    expect(operationResult).toEqual({ id: 'test-project', name: 'Test Project' })
    expect(mockOperation).toHaveBeenCalledOnce()
  })

  it('should handle provider selection for different use cases', async () => {
    const factory = new CapabilityAwareProviderFactory()
    
    // Mock different provider capabilities
    ;(factory as any).providerConstructors.set('sqlite', async (config: ProviderConfig) => {
      return new MockProvider(config, [
        'projects.create', 'issues.create', 'dependencies.create', 'performance.offline'
      ]) as IssueProvider
    })

    ;(factory as any).providerConstructors.set('linear', async (config: ProviderConfig) => {
      return new MockProvider(config, [
        'projects.create', 'issues.create', 'collaboration.assignees', 'integration.sync'
      ]) as IssueProvider
    })

    const availableConfigs: ProviderConfig[] = [
      {
        type: 'sqlite',
        id: 'local-dev',
        name: 'Local Development',
        enabled: true,
        databasePath: './dev.db'
      } as any,
      {
        type: 'linear',
        id: 'team-collab',
        name: 'Team Collaboration',
        enabled: true,
        apiToken: 'token',
        teamId: 'team-id'
      } as any
    ]

    // Test offline development use case
    const offlineRequirements = ['projects.create', 'issues.create', 'performance.offline']
    const offlineResult = await factory.findBestProviderForCapabilities(
      offlineRequirements,
      availableConfigs
    )

    expect(offlineResult.recommendedConfig?.type).toBe('sqlite')
    expect(offlineResult.compatibilityScore).toBe(1.0) // Perfect match

    // Test team collaboration use case
    const teamRequirements = ['projects.create', 'issues.create', 'collaboration.assignees']
    const teamResult = await factory.findBestProviderForCapabilities(
      teamRequirements,
      availableConfigs
    )

    expect(teamResult.recommendedConfig?.type).toBe('linear')
    expect(teamResult.compatibilityScore).toBe(1.0) // Perfect match

    // Test mixed requirements
    const mixedRequirements = ['projects.create', 'dependencies.create', 'collaboration.assignees']
    const mixedResult = await factory.findBestProviderForCapabilities(
      mixedRequirements,
      availableConfigs
    )

    // Neither provider supports all requirements perfectly
    expect(mixedResult.compatibilityScore).toBeLessThan(1.0)
    expect(mixedResult.analysis.unsupportedCapabilities.length).toBeGreaterThan(0)
  })
})