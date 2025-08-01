/**
 * JCVD Provider Registry
 * Central registry for managing multiple provider instances with lifecycle management
 */

import type {
  IssueProvider,
  ProviderConfig,
  ProviderInfo,
  ProviderRegistry as IProviderRegistry,
  ProviderError,
  OperationResult
} from '../types.js'

// =============================================================================
// Provider Registry Implementation
// =============================================================================

/**
 * Registry entry for a provider instance
 */
interface ProviderRegistryEntry {
  /** Provider instance */
  provider: IssueProvider
  /** Registration timestamp */
  registeredAt: Date
  /** Last activity timestamp */
  lastActivity: Date
  /** Number of operations performed */
  operationCount: number
  /** Provider configuration used for registration */
  config: ProviderConfig
  /** Registry-specific metadata */
  metadata: {
    /** Tags for categorizing providers */
    tags: string[]
    /** Priority for provider selection */
    priority: number
    /** Environment context (dev, staging, production) */
    environment?: string
    /** Custom metadata */
    custom?: Record<string, any>
  }
}

/**
 * Provider registry options
 */
export interface ProviderRegistryOptions {
  /** Maximum number of providers to register */
  maxProviders?: number
  /** Enable automatic cleanup of inactive providers */
  enableAutoCleanup?: boolean
  /** Inactivity threshold for cleanup (milliseconds) */
  cleanupThreshold?: number
  /** Cleanup check interval (milliseconds) */
  cleanupInterval?: number
  /** Enable provider health monitoring */
  enableHealthMonitoring?: boolean
  /** Health check interval (milliseconds) */
  healthCheckInterval?: number
}

/**
 * Central registry for managing provider instances
 */
export class ProviderRegistry implements IProviderRegistry {
  private providers = new Map<string, ProviderRegistryEntry>()
  private options: Required<ProviderRegistryOptions>
  private cleanupTimer?: NodeJS.Timeout
  private healthCheckTimer?: NodeJS.Timeout

  constructor(options: ProviderRegistryOptions = {}) {
    this.options = {
      maxProviders: options.maxProviders ?? 50,
      enableAutoCleanup: options.enableAutoCleanup ?? true,
      cleanupThreshold: options.cleanupThreshold ?? 3600000, // 1 hour
      cleanupInterval: options.cleanupInterval ?? 300000, // 5 minutes
      enableHealthMonitoring: options.enableHealthMonitoring ?? true,
      healthCheckInterval: options.healthCheckInterval ?? 60000 // 1 minute
    }

    if (this.options.enableAutoCleanup) {
      this.startCleanupTimer()
    }

    if (this.options.enableHealthMonitoring) {
      this.startHealthMonitoring()
    }
  }

  // -------------------------------------------------------------------------
  // Provider Registration and Management
  // -------------------------------------------------------------------------

  /**
   * Register provider instance
   */
  async registerProvider(
    provider: IssueProvider,
    options?: {
      tags?: string[]
      priority?: number
      environment?: string
      custom?: Record<string, any>
    }
  ): Promise<OperationResult<void>> {
    try {
      const info = provider.getProviderInfo()
      
      // Check if provider already exists
      if (this.providers.has(info.id)) {
        return {
          success: false,
          error: this.createRegistryError(
            'RESOURCE_ALREADY_EXISTS',
            `Provider with ID '${info.id}' is already registered`
          ),
          metadata: {
            duration: 0,
            timestamp: new Date(),
            operationType: 'register'
          }
        }
      }

      // Check registry capacity
      if (this.providers.size >= this.options.maxProviders) {
        return {
          success: false,
          error: this.createRegistryError(
            'RESOURCE_CONFLICT',
            `Registry is at capacity (${this.options.maxProviders} providers)`
          ),
          metadata: {
            duration: 0,
            timestamp: new Date(),
            operationType: 'register'
          }
        }
      }

      // Verify provider is available
      const isAvailable = await provider.isAvailable()
      if (!isAvailable) {
        return {
          success: false,
          error: this.createRegistryError(
            'PROVIDER_UNAVAILABLE',
            `Provider '${info.id}' is not available for registration`
          ),
          metadata: {
            duration: 0,
            timestamp: new Date(),
            operationType: 'register'
          }
        }
      }

      // Create registry entry
      const entry: ProviderRegistryEntry = {
        provider,
        registeredAt: new Date(),
        lastActivity: new Date(),
        operationCount: 0,
        config: { ...info } as ProviderConfig, // Use provider info as config fallback
        metadata: {
          tags: options?.tags ?? [],
          priority: options?.priority ?? 0,
          environment: options?.environment,
          custom: options?.custom
        }
      }

      this.providers.set(info.id, entry)

      console.log(`Provider '${info.id}' registered successfully`)
      
      return {
        success: true,
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operationType: 'register',
          affectedResources: [info.id]
        }
      }

    } catch (error) {
      return {
        success: false,
        error: this.createRegistryError('OPERATION_FAILED', error.message),
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operationType: 'register'
        }
      }
    }
  }

  /**
   * Get provider by ID
   */
  getProvider(id: string): IssueProvider | undefined {
    const entry = this.providers.get(id)
    if (entry) {
      // Update activity tracking
      entry.lastActivity = new Date()
      entry.operationCount++
    }
    return entry?.provider
  }

  /**
   * List all registered providers
   */
  listProviders(): ProviderInfo[] {
    const providers: ProviderInfo[] = []
    
    for (const entry of this.providers.values()) {
      try {
        providers.push(entry.provider.getProviderInfo())
      } catch (error) {
        console.error(`Failed to get provider info for ${entry.config.id}:`, error)
      }
    }
    
    return providers
  }

  /**
   * Remove provider from registry
   */
  async unregisterProvider(id: string): Promise<OperationResult<void>> {
    try {
      const entry = this.providers.get(id)
      if (!entry) {
        return {
          success: false,
          error: this.createRegistryError('RESOURCE_NOT_FOUND', `Provider '${id}' not found`),
          metadata: {
            duration: 0,
            timestamp: new Date(),
            operationType: 'unregister'
          }
        }
      }

      // Cleanup provider resources
      if (entry.provider.cleanup) {
        await entry.provider.cleanup()
      }

      this.providers.delete(id)

      console.log(`Provider '${id}' unregistered successfully`)

      return {
        success: true,
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operationType: 'unregister',
          affectedResources: [id]
        }
      }

    } catch (error) {
      return {
        success: false,
        error: this.createRegistryError('OPERATION_FAILED', error.message),
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operationType: 'unregister'
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Advanced Registry Operations
  // -------------------------------------------------------------------------

  /**
   * Find providers by tags
   */
  findProvidersByTags(tags: string[]): ProviderInfo[] {
    const matchingProviders: ProviderInfo[] = []
    
    for (const entry of this.providers.values()) {
      const hasAllTags = tags.every(tag => entry.metadata.tags.includes(tag))
      if (hasAllTags) {
        try {
          matchingProviders.push(entry.provider.getProviderInfo())
        } catch (error) {
          console.error(`Failed to get provider info for ${entry.config.id}:`, error)
        }
      }
    }
    
    return matchingProviders
  }

  /**
   * Find providers by environment
   */
  findProvidersByEnvironment(environment: string): ProviderInfo[] {
    const matchingProviders: ProviderInfo[] = []
    
    for (const entry of this.providers.values()) {
      if (entry.metadata.environment === environment) {
        try {
          matchingProviders.push(entry.provider.getProviderInfo())
        } catch (error) {
          console.error(`Failed to get provider info for ${entry.config.id}:`, error)
        }
      }
    }
    
    return matchingProviders
  }

  /**
   * Get providers sorted by priority
   */
  getProvidersByPriority(): ProviderInfo[] {
    const sortedEntries = Array.from(this.providers.values())
      .sort((a, b) => b.metadata.priority - a.metadata.priority) // Descending priority
    
    const providers: ProviderInfo[] = []
    for (const entry of sortedEntries) {
      try {
        providers.push(entry.provider.getProviderInfo())
      } catch (error) {
        console.error(`Failed to get provider info for ${entry.config.id}:`, error)
      }
    }
    
    return providers
  }

  /**
   * Get registry statistics
   */
  getRegistryStatistics(): {
    totalProviders: number
    providersByType: Record<string, number>
    providersByEnvironment: Record<string, number>
    healthyProviders: number
    unhealthyProviders: number
    averageOperationsPerProvider: number
    oldestProvider: Date | null
    newestProvider: Date | null
  } {
    const stats = {
      totalProviders: this.providers.size,
      providersByType: {} as Record<string, number>,
      providersByEnvironment: {} as Record<string, number>,
      healthyProviders: 0,
      unhealthyProviders: 0,
      averageOperationsPerProvider: 0,
      oldestProvider: null as Date | null,
      newestProvider: null as Date | null
    }

    let totalOperations = 0

    for (const entry of this.providers.values()) {
      try {
        const info = entry.provider.getProviderInfo()
        
        // Count by type
        stats.providersByType[info.type] = (stats.providersByType[info.type] || 0) + 1
        
        // Count by environment
        if (entry.metadata.environment) {
          stats.providersByEnvironment[entry.metadata.environment] = 
            (stats.providersByEnvironment[entry.metadata.environment] || 0) + 1
        }
        
        // Health status
        if (info.status.isHealthy) {
          stats.healthyProviders++
        } else {
          stats.unhealthyProviders++
        }
        
        // Operation count
        totalOperations += entry.operationCount
        
        // Registration dates
        if (!stats.oldestProvider || entry.registeredAt < stats.oldestProvider) {
          stats.oldestProvider = entry.registeredAt
        }
        if (!stats.newestProvider || entry.registeredAt > stats.newestProvider) {
          stats.newestProvider = entry.registeredAt
        }
        
      } catch (error) {
        console.error(`Failed to get stats for provider ${entry.config.id}:`, error)
      }
    }

    stats.averageOperationsPerProvider = 
      stats.totalProviders > 0 ? totalOperations / stats.totalProviders : 0

    return stats
  }

  // -------------------------------------------------------------------------
  // Lifecycle Management
  // -------------------------------------------------------------------------

  /**
   * Cleanup registry resources
   */
  async cleanup(): Promise<void> {
    // Stop timers
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }

    // Cleanup all providers
    const cleanupPromises = Array.from(this.providers.entries()).map(async ([id, entry]) => {
      try {
        if (entry.provider.cleanup) {
          await entry.provider.cleanup()
        }
      } catch (error) {
        console.error(`Failed to cleanup provider ${id}:`, error)
      }
    })

    await Promise.allSettled(cleanupPromises)
    this.providers.clear()

    console.log('Provider registry cleaned up')
  }

  // -------------------------------------------------------------------------
  // Private Implementation
  // -------------------------------------------------------------------------

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performAutomaticCleanup()
    }, this.options.cleanupInterval)
  }

  /**
   * Start health monitoring timer
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks()
    }, this.options.healthCheckInterval)
  }

  /**
   * Perform automatic cleanup of inactive providers
   */
  private async performAutomaticCleanup(): Promise<void> {
    const now = Date.now()
    const threshold = this.options.cleanupThreshold
    const providersToCleanup: string[] = []

    for (const [id, entry] of this.providers.entries()) {
      const inactiveTime = now - entry.lastActivity.getTime()
      if (inactiveTime > threshold) {
        providersToCleanup.push(id)
      }
    }

    for (const id of providersToCleanup) {
      try {
        await this.unregisterProvider(id)
        console.log(`Automatically cleaned up inactive provider: ${id}`)
      } catch (error) {
        console.error(`Failed to cleanup provider ${id}:`, error)
      }
    }
  }

  /**
   * Perform health checks on all registered providers
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.providers.entries()).map(async ([id, entry]) => {
      try {
        if (entry.provider.healthCheck) {
          await entry.provider.healthCheck()
        }
      } catch (error) {
        console.error(`Health check failed for provider ${id}:`, error)
      }
    })

    await Promise.allSettled(healthCheckPromises)
  }

  /**
   * Create standardized registry error
   */
  private createRegistryError(code: string, message: string): ProviderError {
    return {
      name: 'RegistryError',
      message: `Provider Registry: ${message}`,
      code: code as any,
      providerId: 'registry',
      providerType: 'registry' as any,
      retryable: false,
      context: {
        operation: 'registry_operation',
        timestamp: new Date()
      }
    }
  }
}

// =============================================================================
// Singleton Registry Instance
// =============================================================================

let globalRegistry: ProviderRegistry | null = null

/**
 * Get global provider registry instance
 */
export function getGlobalProviderRegistry(options?: ProviderRegistryOptions): ProviderRegistry {
  if (!globalRegistry) {
    globalRegistry = new ProviderRegistry(options)
  }
  return globalRegistry
}

/**
 * Reset global provider registry (mainly for testing)
 */
export function resetGlobalProviderRegistry(): void {
  if (globalRegistry) {
    globalRegistry.cleanup()
    globalRegistry = null
  }
}