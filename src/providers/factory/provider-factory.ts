/**
 * JCVD Enhanced Provider Factory
 * Comprehensive provider factory with dynamic instantiation, validation, and registry integration
 */

import type {
  ProviderFactory,
  ProviderConfig,
  ProviderType,
  IssueProvider,
  ProviderError,
  OperationResult
} from '../types.js'

import { ProviderConfigValidator } from './config-validator.js'
import { ProviderInstantiator } from './provider-instantiator.js'
import { ProviderRegistry, getGlobalProviderRegistry } from '../base/provider-registry.js'
import { CapabilityAwareProviderFactory } from '../capabilities/capability-aware-factory.js'

// =============================================================================
// Enhanced Provider Factory Options
// =============================================================================

export interface EnhancedProviderFactoryOptions {
  /** Use global provider registry */
  useGlobalRegistry?: boolean
  /** Custom provider registry */
  customRegistry?: ProviderRegistry
  /** Enable automatic provider registration */
  autoRegister?: boolean
  /** Enable configuration validation */
  enableValidation?: boolean
  /** Enable capability discovery */
  enableCapabilityDiscovery?: boolean
  /** Enable health monitoring */
  enableHealthMonitoring?: boolean
  /** Factory-specific metadata */
  metadata?: Record<string, any>
}

export interface EnhancedProviderCreationOptions {
  /** Tags for provider categorization */
  tags?: string[]
  /** Priority for provider selection */
  priority?: number
  /** Environment context */
  environment?: string
  /** Required capabilities */
  requiredCapabilities?: string[]
  /** Custom instantiation options */
  instantiationOptions?: {
    autoInitialize?: boolean
    initializationTimeout?: number
  }
  /** Custom metadata */
  metadata?: Record<string, any>
}

// =============================================================================
// Enhanced Provider Factory Implementation
// =============================================================================

/**
 * Comprehensive provider factory with all enterprise features
 */
export class EnhancedProviderFactory implements ProviderFactory {
  private configValidator: ProviderConfigValidator
  private instantiator: ProviderInstantiator
  private registry: ProviderRegistry
  private capabilityFactory: CapabilityAwareProviderFactory
  private options: Required<EnhancedProviderFactoryOptions>

  constructor(options: EnhancedProviderFactoryOptions = {}) {
    this.options = {
      useGlobalRegistry: options.useGlobalRegistry ?? true,
      customRegistry: options.customRegistry,
      autoRegister: options.autoRegister ?? true,
      enableValidation: options.enableValidation ?? true,
      enableCapabilityDiscovery: options.enableCapabilityDiscovery ?? true,
      enableHealthMonitoring: options.enableHealthMonitoring ?? true,
      metadata: options.metadata ?? {}
    }

    // Initialize components
    this.configValidator = new ProviderConfigValidator()
    this.instantiator = new ProviderInstantiator()
    this.registry = this.options.customRegistry || 
                   (this.options.useGlobalRegistry ? getGlobalProviderRegistry() : new ProviderRegistry())
    this.capabilityFactory = new CapabilityAwareProviderFactory()

    console.log('Enhanced Provider Factory initialized with options:', {
      useGlobalRegistry: this.options.useGlobalRegistry,
      autoRegister: this.options.autoRegister,
      enableValidation: this.options.enableValidation,
      enableCapabilityDiscovery: this.options.enableCapabilityDiscovery
    })
  }

  // -------------------------------------------------------------------------
  // Core Factory Interface Implementation
  // -------------------------------------------------------------------------

  /**
   * Create provider instance from configuration with full validation and registration
   */
  async createProvider(config: ProviderConfig): Promise<IssueProvider> {
    try {
      // Step 1: Configuration validation
      if (this.options.enableValidation) {
        const validationResult = this.configValidator.validate(config)
        if (!validationResult.isValid) {
          throw this.createFactoryError(
            'VALIDATION_ERROR',
            `Configuration validation failed for provider '${config.id}': ${
              validationResult.errors.map(e => e.message).join(', ')
            }`,
            { config, validationErrors: validationResult.errors }
          )
        }
        
        // Use sanitized config
        config = validationResult.sanitizedConfig!
        
        // Log warnings
        if (validationResult.warnings.length > 0) {
          console.warn(`Provider '${config.id}' configuration warnings:`, 
                      validationResult.warnings.map(w => w.message))
        }
      }

      // Step 2: Provider instantiation
      const instantiationResult = await this.instantiator.instantiateProvider(config, {
        autoInitialize: true,
        initializationTimeout: 30000
      })

      if (!instantiationResult.success) {
        throw instantiationResult.error!
      }

      const provider = instantiationResult.provider!

      // Step 3: Provider registration (if enabled)
      if (this.options.autoRegister) {
        const registrationResult = await this.registry.registerProvider(provider, {
          tags: ['auto-created'],
          priority: 0,
          environment: process.env.NODE_ENV || 'development'
        })

        if (!registrationResult.success) {
          console.warn(`Failed to register provider '${config.id}':`, registrationResult.error?.message)
        } else {
          console.log(`Provider '${config.id}' registered successfully`)
        }
      }

      return provider

    } catch (error) {
      if (error.code) {
        throw error // Re-throw provider errors as-is
      }
      
      throw this.createFactoryError(
        'OPERATION_FAILED',
        `Provider creation failed: ${error.message}`,
        { config, originalError: error }
      )
    }
  }

  /**
   * Create provider with capability validation
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
    if (this.options.enableCapabilityDiscovery) {
      return this.capabilityFactory.createProviderWithCapabilities(config, requiredCapabilities)
    }

    // Fallback without capability discovery
    const provider = await this.createProvider(config)
    
    return {
      provider,
      capabilityValidation: {
        isValid: true,
        supportedCapabilities: requiredCapabilities,
        unsupportedCapabilities: [],
        warnings: ['Capability discovery disabled - assuming all capabilities supported']
      }
    }
  }

  /**
   * Get supported provider types
   */
  getSupportedTypes(): ProviderType[] {
    return this.instantiator.getRegisteredTypes()
  }

  /**
   * Validate provider configuration
   */
  validateConfig(config: ProviderConfig): {
    isValid: boolean
    errors: string[]
  } {
    if (!this.options.enableValidation) {
      return { isValid: true, errors: [] }
    }

    const result = this.configValidator.validate(config)
    return {
      isValid: result.isValid,
      errors: result.errors.map(error => `${error.field}: ${error.message}`)
    }
  }

  // -------------------------------------------------------------------------
  // Enhanced Factory Methods
  // -------------------------------------------------------------------------

  /**
   * Create provider with enhanced options
   */
  async createProviderWithOptions(
    config: ProviderConfig,
    options: EnhancedProviderCreationOptions = {}
  ): Promise<{
    provider: IssueProvider
    metadata: {
      validationResult?: any
      capabilityValidation?: any
      registrationResult?: any
      creationTime: number
    }
  }> {
    const startTime = Date.now()
    let validationResult, capabilityValidation, registrationResult

    try {
      // Enhanced validation
      if (this.options.enableValidation) {
        validationResult = this.configValidator.validate(config)
        if (!validationResult.isValid) {
          throw this.createFactoryError(
            'VALIDATION_ERROR',
            `Enhanced validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`,
            { validationResult }
          )
        }
        config = validationResult.sanitizedConfig!
      }

      // Capability-aware creation
      let provider: IssueProvider
      if (options.requiredCapabilities && this.options.enableCapabilityDiscovery) {
        const result = await this.createProviderWithCapabilities(config, options.requiredCapabilities)
        provider = result.provider
        capabilityValidation = result.capabilityValidation
        
        if (!capabilityValidation.isValid) {
          throw this.createFactoryError(
            'PROVIDER_FEATURE_NOT_SUPPORTED',
            `Required capabilities not supported: ${capabilityValidation.unsupportedCapabilities.join(', ')}`,
            { capabilityValidation }
          )
        }
      } else {
        provider = await this.createProvider(config)
      }

      // Enhanced registration
      if (this.options.autoRegister) {
        registrationResult = await this.registry.registerProvider(provider, {
          tags: options.tags || ['enhanced-creation'],
          priority: options.priority || 0,
          environment: options.environment || process.env.NODE_ENV || 'development',
          custom: options.metadata
        })
      }

      return {
        provider,
        metadata: {
          validationResult,
          capabilityValidation,
          registrationResult,
          creationTime: Date.now() - startTime
        }
      }

    } catch (error) {
      throw error.code ? error : this.createFactoryError(
        'OPERATION_FAILED',
        `Enhanced provider creation failed: ${error.message}`,
        { options, originalError: error }
      )
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
    if (this.options.enableCapabilityDiscovery) {
      return this.capabilityFactory.findBestProviderForCapabilities(requiredCapabilities, availableConfigs)
    }

    // Fallback implementation without capability discovery
    return {
      recommendedConfig: availableConfigs.length > 0 ? availableConfigs[0] : null,
      compatibilityScore: availableConfigs.length > 0 ? 1.0 : 0,
      analysis: {
        supportedCapabilities: requiredCapabilities,
        unsupportedCapabilities: [],
        alternatives: availableConfigs.map(config => ({
          config,
          score: 1.0,
          gaps: []
        }))
      }
    }
  }

  /**
   * Batch create multiple providers
   */
  async createProviders(
    configs: ProviderConfig[],
    options: EnhancedProviderCreationOptions = {}
  ): Promise<{
    successful: { config: ProviderConfig; provider: IssueProvider }[]
    failed: { config: ProviderConfig; error: ProviderError }[]
    summary: {
      total: number
      successful: number
      failed: number
      duration: number
    }
  }> {
    const startTime = Date.now()
    const successful: { config: ProviderConfig; provider: IssueProvider }[] = []
    const failed: { config: ProviderConfig; error: ProviderError }[] = []

    // Process providers in parallel with controlled concurrency
    const maxConcurrency = 5
    const batches = []
    
    for (let i = 0; i < configs.length; i += maxConcurrency) {
      batches.push(configs.slice(i, i + maxConcurrency))
    }

    for (const batch of batches) {
      const promises = batch.map(async (config) => {
        try {
          const result = await this.createProviderWithOptions(config, options)
          successful.push({ config, provider: result.provider })
        } catch (error) {
          failed.push({ 
            config, 
            error: error.code ? error : this.createFactoryError(
              'OPERATION_FAILED', 
              error.message, 
              { config }
            ) 
          })
        }
      })

      await Promise.allSettled(promises)
    }

    return {
      successful,
      failed,
      summary: {
        total: configs.length,
        successful: successful.length,
        failed: failed.length,
        duration: Date.now() - startTime
      }
    }
  }

  // -------------------------------------------------------------------------
  // Registry Integration
  // -------------------------------------------------------------------------

  /**
   * Get provider registry instance
   */
  getRegistry(): ProviderRegistry {
    return this.registry
  }

  /**
   * Get provider from registry
   */
  getProviderFromRegistry(id: string): IssueProvider | undefined {
    return this.registry.getProvider(id)
  }

  /**
   * List all providers in registry
   */
  listRegisteredProviders() {
    return this.registry.listProviders()
  }

  /**
   * Get factory statistics
   */
  getFactoryStatistics() {
    const registryStats = this.registry.getRegistryStatistics()
    const instantiatorStats = this.instantiator.listInstances()

    return {
      registry: registryStats,
      instantiator: {
        managedInstances: instantiatorStats.length,
        healthyInstances: instantiatorStats.filter(i => i.isHealthy).length,
        instancesByType: instantiatorStats.reduce((acc, instance) => {
          acc[instance.type] = (acc[instance.type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      },
      factory: {
        validationEnabled: this.options.enableValidation,
        capabilityDiscoveryEnabled: this.options.enableCapabilityDiscovery,
        autoRegistrationEnabled: this.options.autoRegister,
        supportedTypes: this.getSupportedTypes()
      }
    }
  }

  // -------------------------------------------------------------------------
  // Lifecycle Management
  // -------------------------------------------------------------------------

  /**
   * Cleanup factory resources
   */
  async cleanup(): Promise<void> {
    await Promise.all([
      this.instantiator.cleanup(),
      this.registry.cleanup()
    ])
    console.log('Enhanced Provider Factory cleaned up')
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Create standardized factory error
   */
  private createFactoryError(
    code: string,
    message: string,
    context?: Record<string, any>
  ): ProviderError {
    return {
      name: 'ProviderFactoryError',
      message: `Provider Factory: ${message}`,
      code: code as any,
      providerId: 'factory',
      providerType: 'factory' as any,
      retryable: code !== 'VALIDATION_ERROR' && code !== 'PROVIDER_CONFIGURATION_ERROR',
      context: {
        operation: 'factory_operation',
        timestamp: new Date(),
        ...context
      }
    }
  }
}

// =============================================================================
// Factory Utilities
// =============================================================================

/**
 * Create enhanced provider factory with sensible defaults
 */
export function createProviderFactory(options: EnhancedProviderFactoryOptions = {}): EnhancedProviderFactory {
  return new EnhancedProviderFactory({
    useGlobalRegistry: true,
    autoRegister: true,
    enableValidation: true,
    enableCapabilityDiscovery: true,
    enableHealthMonitoring: true,
    ...options
  })
}

/**
 * Quick provider creation utility
 */
export async function createQuickProvider(config: ProviderConfig): Promise<IssueProvider> {
  const factory = createProviderFactory()
  return factory.createProvider(config)
}

// =============================================================================
// Singleton Factory Instance
// =============================================================================

let globalFactory: EnhancedProviderFactory | null = null

/**
 * Get global provider factory instance
 */
export function getGlobalProviderFactory(options?: EnhancedProviderFactoryOptions): EnhancedProviderFactory {
  if (!globalFactory) {
    globalFactory = createProviderFactory(options)
  }
  return globalFactory
}

/**
 * Reset global provider factory (mainly for testing)
 */
export function resetGlobalProviderFactory(): void {
  if (globalFactory) {
    globalFactory.cleanup()
    globalFactory = null
  }
}