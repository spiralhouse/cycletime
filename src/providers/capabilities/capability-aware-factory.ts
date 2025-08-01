/**
 * JCVD Capability-Aware Provider Factory
 * 
 * This module implements an enhanced provider factory that integrates capability
 * discovery with provider creation, enabling intelligent provider selection
 * and validation based on required capabilities.
 */

import type {
  ProviderType,
  ProviderConfig,
  IssueProvider,
  ProviderFactory,
  ProviderError
} from '../types.js'

// Minimal capability discovery integration to avoid circular dependencies
interface MockCapabilityDiscoverySystem {
  registry: any
  engine: any
  cacheManager?: any
}

// Simple mock for capability discovery system
function createMockCapabilityDiscoverySystem(options?: { enableCaching?: boolean }): MockCapabilityDiscoverySystem {
  return {
    registry: {
      getCapability: () => undefined,
      getAllCapabilities: () => []
    },
    engine: {
      discoverCapabilities: async () => ({
        capabilities: new Map(),
        discoverySuccess: true,
        discoveryDuration: 0,
        discoveredAt: new Date(),
        errors: [],
        warnings: []
      })
    },
    cacheManager: options?.enableCaching ? {
      cacheDiscovery: () => {},
      getCachedCapabilities: () => undefined
    } : undefined
  }
}

import { ProviderInstantiator } from '../factory/provider-instantiator.js'

// =============================================================================
// Capability-Aware Provider Factory
// =============================================================================

/**
 * Enhanced provider factory with capability discovery integration
 */
export class CapabilityAwareProviderFactory implements ProviderFactory {
  private discoverySystem = createMockCapabilityDiscoverySystem({ enableCaching: true })
  private instantiator = new ProviderInstantiator()

  constructor() {
    // Provider instantiator handles provider constructors
    console.log('CapabilityAwareProviderFactory initialized with ProviderInstantiator')
  }


  /**
   * Create provider instance from configuration
   */
  async createProvider(config: ProviderConfig): Promise<IssueProvider> {
    const result = await this.instantiator.instantiateProvider(config, {
      autoInitialize: true
    })

    if (!result.success) {
      throw result.error || new Error(`Failed to create provider: ${config.type}`)
    }

    const provider = result.provider!
    
    // Initialize capability discovery for the provider
    await this.initializeProviderCapabilities(provider)
    
    return provider
  }

  /**
   * Create provider instance with capability validation
   */
  async createProviderWithCapabilities(
    config: ProviderConfig,
    requiredCapabilities: string[]
  ): Promise<{
    provider: IssueProvider
    capabilityValidation: {
      isValid: boolean
      supportedCapabilities: string[]
      unsupportedCapabilities: string[]
      warnings: string[]
    }
  }> {
    // Create the provider instance
    const provider = await this.createProvider(config)

    // Perform capability validation
    const validation = await this.validateProviderCapabilities(provider, requiredCapabilities)

    return {
      provider,
      capabilityValidation: validation
    }
  }

  /**
   * Get supported provider types
   */
  getSupportedTypes(): ProviderType[] {
    return this.instantiator.getRegisteredTypes()
  }

  /**
   * Get provider type capabilities without creating instance
   */
  async getProviderTypeCapabilities(providerType: ProviderType): Promise<{
    capabilities: Map<string, {
      isSupported: boolean
      limitations?: string[]
      implementationNotes?: string
    }>
    overallScore: number
  }> {
    // Use capability probes to get static capability information
    const probe = this.discoverySystem.engine['probeInstances'].get(providerType)
    if (!probe) {
      throw new Error(`No capability probe available for provider type: ${providerType}`)
    }

    const registry = this.discoverySystem.registry
    const allCapabilities = registry.getAllCapabilities()
    const capabilities = new Map<string, {
      isSupported: boolean
      limitations?: string[]
      implementationNotes?: string
    }>()

    let totalScore = 0
    let capabilityCount = 0

    for (const capability of allCapabilities) {
      const info = probe.getProviderCapabilityInfo(capability.id)
      
      if (info) {
        capabilities.set(capability.id, {
          isSupported: true,
          limitations: info.limitations,
          implementationNotes: info.implementationDetails
        })
        totalScore += 1
      } else {
        capabilities.set(capability.id, {
          isSupported: false,
          implementationNotes: 'Not supported by this provider type'
        })
      }
      
      capabilityCount++
    }

    const overallScore = capabilityCount > 0 ? totalScore / capabilityCount : 0

    return {
      capabilities,
      overallScore
    }
  }

  /**
   * Validate provider configuration
   */
  validateConfig(config: ProviderConfig): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Basic validation
    if (!config.type) {
      errors.push('Provider type is required')
    }

    if (!config.id) {
      errors.push('Provider ID is required')
    }

    if (!config.name) {
      errors.push('Provider name is required')
    }

    // Type-specific validation
    switch (config.type) {
      case 'sqlite':
        const sqliteConfig = config as any
        if (!sqliteConfig.databasePath) {
          errors.push('SQLite provider requires databasePath')
        }
        break

      case 'linear':
        const linearConfig = config as any
        if (!linearConfig.apiToken) {
          errors.push('Linear provider requires apiToken')
        }
        if (!linearConfig.teamId) {
          errors.push('Linear provider requires teamId')
        }
        break

      case 'github':
        const githubConfig = config as any
        if (!githubConfig.apiToken) {
          errors.push('GitHub provider requires apiToken')
        }
        if (!githubConfig.owner || !githubConfig.repo) {
          errors.push('GitHub provider requires owner and repo')
        }
        break

      case 'jira':
        const jiraConfig = config as any
        if (!jiraConfig.baseUrl) {
          errors.push('Jira provider requires baseUrl')
        }
        if (!jiraConfig.username || !jiraConfig.apiToken) {
          errors.push('Jira provider requires username and apiToken')
        }
        if (!jiraConfig.projectKey) {
          errors.push('Jira provider requires projectKey')
        }
        break
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Find best provider for required capabilities
   */
  async findBestProviderForCapabilities(
    requiredCapabilities: string[],
    availableConfigs: ProviderConfig[]
  ): Promise<{
    recommendedConfig: ProviderConfig | null
    compatibilityScore: number
    analysis: {
      supportedCapabilities: string[]
      unsupportedCapabilities: string[]
      alternatives: {
        config: ProviderConfig
        score: number
        gaps: string[]
      }[]
    }
  }> {
    const alternatives: {
      config: ProviderConfig
      score: number
      gaps: string[]
    }[] = []

    let bestConfig: ProviderConfig | null = null
    let bestScore = 0
    let bestSupported: string[] = []
    let bestUnsupported: string[] = []

    // Evaluate each available configuration
    for (const config of availableConfigs) {
      try {
        const typeCapabilities = await this.getProviderTypeCapabilities(config.type)
        
        const supported: string[] = []
        const unsupported: string[] = []

        for (const capabilityId of requiredCapabilities) {
          const capability = typeCapabilities.capabilities.get(capabilityId)
          if (capability?.isSupported) {
            supported.push(capabilityId)
          } else {
            unsupported.push(capabilityId)
          }
        }

        const score = requiredCapabilities.length > 0 ? 
          supported.length / requiredCapabilities.length : 0

        alternatives.push({
          config,
          score,
          gaps: unsupported
        })

        // Track best option
        if (score > bestScore) {
          bestScore = score
          bestConfig = config
          bestSupported = supported
          bestUnsupported = unsupported
        }

      } catch (error) {
        // Provider type not available or failed to evaluate
        alternatives.push({
          config,
          score: 0,
          gaps: requiredCapabilities
        })
      }
    }

    // Sort alternatives by score
    alternatives.sort((a, b) => b.score - a.score)

    return {
      recommendedConfig: bestConfig,
      compatibilityScore: bestScore,
      analysis: {
        supportedCapabilities: bestSupported,
        unsupportedCapabilities: bestUnsupported,
        alternatives
      }
    }
  }

  // -------------------------------------------------------------------------
  // Private Helper Methods
  // -------------------------------------------------------------------------

  /**
   * Initialize capability discovery for a provider instance
   */
  private async initializeProviderCapabilities(provider: IssueProvider): Promise<void> {
    // If provider supports capability discovery, set it up
    if (provider.discoverCapabilities) {
      try {
        // Perform initial capability discovery with caching
        const discoveryResult = await this.discoverySystem.engine.discoverCapabilities(provider, {
          probeDepth: 'shallow',
          skipCached: false,
          timeout: 5000
        })

        // Cache the results for future use
        if (this.discoverySystem.cacheManager) {
          this.discoverySystem.cacheManager.cacheDiscovery(
            provider.getProviderInfo().id,
            { probeDepth: 'shallow' },
            discoveryResult
          )
        }

      } catch (error) {
        // Non-fatal - provider can still function without capability discovery
        console.warn(`Capability discovery failed for provider ${provider.getProviderInfo().id}:`, error)
      }
    }
  }

  /**
   * Validate provider capabilities against requirements
   */
  private async validateProviderCapabilities(
    provider: IssueProvider,
    requiredCapabilities: string[]
  ): Promise<{
    isValid: boolean
    supportedCapabilities: string[]
    unsupportedCapabilities: string[]
    warnings: string[]
  }> {
    const supportedCapabilities: string[] = []
    const unsupportedCapabilities: string[] = []
    const warnings: string[] = []

    // Use provider's capability validation if available
    if (provider.validateCapabilities) {
      return await provider.validateCapabilities(requiredCapabilities)
    }

    // Fallback to discovery-based validation
    try {
      const discoveryResult = await this.discoverySystem.engine.discoverCapabilities(provider, {
        targetCapabilities: requiredCapabilities,
        probeDepth: 'shallow',
        timeout: 10000
      })

      for (const [capabilityId, probeResult] of discoveryResult.capabilities) {
        if (probeResult.isSupported) {
          supportedCapabilities.push(capabilityId)
          
          // Check for limitations
          if (probeResult.metadata?.limitations?.length) {
            warnings.push(`${capabilityId} has limitations: ${probeResult.metadata.limitations.join(', ')}`)
          }
        } else {
          unsupportedCapabilities.push(capabilityId)
        }
      }

      // Check for missing capabilities (not probed at all)
      for (const capabilityId of requiredCapabilities) {
        if (!discoveryResult.capabilities.has(capabilityId)) {
          unsupportedCapabilities.push(capabilityId)
        }
      }

    } catch (error) {
      // If discovery fails, assume all capabilities are unsupported
      unsupportedCapabilities.push(...requiredCapabilities)
      warnings.push(`Capability discovery failed: ${error.message}`)
    }

    return {
      isValid: unsupportedCapabilities.length === 0,
      supportedCapabilities,
      unsupportedCapabilities,
      warnings
    }
  }
}

// =============================================================================
// Operation Dispatcher with Capability Validation
// =============================================================================

/**
 * Operation dispatcher that validates capabilities before executing operations
 */
export class CapabilityAwareOperationDispatcher {
  private cacheManager?: CapabilityCacheManager

  constructor(cacheManager?: CapabilityCacheManager) {
    this.cacheManager = cacheManager
  }

  /**
   * Execute operation with pre-flight capability validation
   */
  async executeWithCapabilityCheck<T>(
    provider: IssueProvider,
    operation: () => Promise<T>,
    requiredCapabilities: string[],
    operationName: string
  ): Promise<T> {
    // Pre-flight capability check
    const validationResult = await this.validateOperationCapabilities(
      provider,
      requiredCapabilities,
      operationName
    )

    if (!validationResult.canExecute) {
      const error: ProviderError = {
        name: 'CapabilityValidationError',
        message: `Operation ${operationName} cannot be executed: ${validationResult.reason}`,
        code: 'OPERATION_NOT_SUPPORTED',
        providerId: provider.getProviderInfo().id,
        providerType: provider.getProviderInfo().type,
        retryable: false,
        context: {
          operation: operationName,
          parameters: { requiredCapabilities },
          timestamp: new Date()
        },
        userActions: validationResult.alternatives
      }
      throw error
    }

    // Execute the operation
    try {
      return await operation()
    } catch (error) {
      // Enhance error with capability context if relevant
      if (this.isCapabilityRelatedError(error)) {
        const enhancedError = error as ProviderError
        enhancedError.userActions = [
          'Verify provider supports required capabilities',
          'Consider using alternative provider',
          'Check provider configuration and permissions',
          ...enhancedError.userActions || []
        ]
        throw enhancedError
      }
      throw error
    }
  }

  /**
   * Get operation alternatives when primary operation is not supported
   */
  async getOperationAlternatives(
    provider: IssueProvider,
    unsupportedCapabilities: string[]
  ): Promise<{
    alternatives: {
      description: string
      requiredCapabilities: string[]
      implementationNotes: string
    }[]
    workarounds: string[]
  }> {
    const alternatives: {
      description: string
      requiredCapabilities: string[]
      implementationNotes: string
    }[] = []
    
    const workarounds: string[] = []

    // Get capability alternatives from registry
    const registry = this.discoverySystem.registry
    
    for (const capabilityId of unsupportedCapabilities) {
      const capability = registry.getCapability(capabilityId)
      if (!capability) continue

      // Check for alternative capabilities (simplified for mock)
      if (capability && capability.alternatives) {
        for (const altId of capability.alternatives) {
          const altCapability = registry.getCapability(altId)
          if (altCapability) {
            alternatives.push({
              description: `Use ${altCapability.name} instead of ${capability.name}`,
              requiredCapabilities: [altId, ...altCapability.dependencies],
              implementationNotes: altCapability.description
            })
          }
        }
      }

      // Provider-specific workarounds
      if (provider.getCapabilityInfo) {
        try {
          const capabilityInfo = await provider.getCapabilityInfo(capabilityId)
          if (capabilityInfo && !capabilityInfo.isSupported) {
            // Could add provider-specific workaround suggestions
            workarounds.push(`${capabilityId}: Consider manual implementation or external tools`)
          }
        } catch {
          // Ignore errors in capability info retrieval
        }
      }
    }

    return { alternatives, workarounds }
  }

  // -------------------------------------------------------------------------
  // Private Helper Methods
  // -------------------------------------------------------------------------

  /**
   * Validate capabilities required for an operation
   */
  private async validateOperationCapabilities(
    provider: IssueProvider,
    requiredCapabilities: string[],
    operationName: string
  ): Promise<{
    canExecute: boolean
    reason?: string
    alternatives?: string[]
  }> {
    // Use cached validation if available
    const cacheKey = `validation:${provider.getProviderInfo().id}:${requiredCapabilities.join(',')}`
    let validationResult

    if (this.cacheManager) {
      // Check cache for recent validation
      // This would use a more specific cache method in actual implementation
    }

    // Perform validation
    if (provider.validateCapabilities) {
      validationResult = await provider.validateCapabilities(requiredCapabilities)
    } else {
      // Fallback validation by checking individual capabilities
      const unsupported: string[] = []
      for (const capabilityId of requiredCapabilities) {
        if (provider.supportsCapability) {
          const isSupported = await provider.supportsCapability(capabilityId)
          if (!isSupported) {
            unsupported.push(capabilityId)
          }
        } else {
          // Conservative approach - assume unsupported if can't check
          unsupported.push(capabilityId)
        }
      }

      validationResult = {
        isValid: unsupported.length === 0,
        supportedCapabilities: requiredCapabilities.filter(cap => !unsupported.includes(cap)),
        unsupportedCapabilities: unsupported,
        warnings: []
      }
    }

    if (validationResult.isValid) {
      return { canExecute: true }
    }

    // Generate alternatives for unsupported capabilities
    const alternatives = await this.getOperationAlternatives(
      provider,
      validationResult.unsupportedCapabilities
    )

    return {
      canExecute: false,
      reason: `Missing required capabilities: ${validationResult.unsupportedCapabilities.join(', ')}`,
      alternatives: [
        ...alternatives.alternatives.map(alt => alt.description),
        ...alternatives.workarounds
      ]
    }
  }

  /**
   * Check if an error is related to capability limitations
   */
  private isCapabilityRelatedError(error: any): boolean {
    if (!error.code) return false

    const capabilityErrorCodes = [
      'OPERATION_NOT_SUPPORTED',
      'PROVIDER_FEATURE_NOT_SUPPORTED',
      'VALIDATION_ERROR',
      'AUTHORIZATION_FAILED'
    ]

    return capabilityErrorCodes.includes(error.code)
  }
}