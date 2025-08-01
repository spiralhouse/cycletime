/**
 * JCVD Simple Provider Factory
 * Core provider factory implementation without circular dependencies
 */

import type {
  ProviderFactory,
  ProviderConfig,
  ProviderType,
  IssueProvider,
  ProviderError,
  OperationResult
} from '../types.js'

import { BaseProvider } from '../base/base-provider.js'
import { ProviderRegistry } from '../base/provider-registry.js'

// =============================================================================
// Simple Provider Factory Implementation
// =============================================================================

/**
 * Simple, reliable provider factory with core functionality
 */
export class SimpleProviderFactory implements ProviderFactory {
  private registry = new ProviderRegistry()
  private instances = new Map<string, IssueProvider>()

  constructor() {
    console.log('SimpleProviderFactory initialized')
  }

  // -------------------------------------------------------------------------
  // Core Factory Interface
  // -------------------------------------------------------------------------

  /**
   * Create provider instance from configuration
   */
  async createProvider(config: ProviderConfig): Promise<IssueProvider> {
    try {
      // Basic validation
      this.validateBasicConfig(config)

      // Check for existing instance
      if (this.instances.has(config.id)) {
        throw this.createFactoryError(
          'RESOURCE_ALREADY_EXISTS',
          `Provider with ID '${config.id}' already exists`
        )
      }

      // Create provider based on type
      const provider = await this.instantiateProvider(config)

      // Initialize provider
      const initResult = await provider.initialize(config)
      if (!initResult.success) {
        throw initResult.error || new Error('Provider initialization failed')
      }

      // Store instance
      this.instances.set(config.id, provider)

      // Register with registry (with error handling)
      try {
        const registrationResult = await this.registry.registerProvider(provider)
        if (!registrationResult.success) {
          console.warn(`Failed to register provider '${config.id}':`, registrationResult.error?.message)
        }
      } catch (error) {
        console.warn(`Registry error for provider '${config.id}':`, error.message)
      }

      return provider

    } catch (error) {
      throw error.code ? error : this.createFactoryError(
        'OPERATION_FAILED',
        `Provider creation failed: ${error.message}`
      )
    }
  }

  /**
   * Create provider with capability validation (simplified)
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
    const provider = await this.createProvider(config)
    
    // Simple capability validation
    const supportedCapabilities: string[] = []
    const unsupportedCapabilities: string[] = []
    
    for (const capability of requiredCapabilities) {
      if (provider.supportsCapability && await provider.supportsCapability(capability)) {
        supportedCapabilities.push(capability)
      } else {
        unsupportedCapabilities.push(capability)
      }
    }

    return {
      provider,
      capabilityValidation: {
        isValid: unsupportedCapabilities.length === 0,
        supportedCapabilities,
        unsupportedCapabilities,
        warnings: unsupportedCapabilities.length > 0 ? 
          [`${unsupportedCapabilities.length} capabilities not supported`] : []
      }
    }
  }

  /**
   * Get supported provider types
   */
  getSupportedTypes(): ProviderType[] {
    return ['sqlite', 'linear', 'github', 'jira']
  }

  /**
   * Validate provider configuration
   */
  validateConfig(config: ProviderConfig): {
    isValid: boolean
    errors: string[]
  } {
    try {
      this.validateBasicConfig(config)
      return { isValid: true, errors: [] }
    } catch (error) {
      return {
        isValid: false,
        errors: [error.message]
      }
    }
  }

  // -------------------------------------------------------------------------
  // Registry Access
  // -------------------------------------------------------------------------

  /**
   * Get provider from registry
   */
  getProvider(id: string): IssueProvider | undefined {
    // Try registry first, fall back to direct instance lookup
    const registryProvider = this.registry.getProvider(id)
    if (registryProvider) {
      return registryProvider
    }
    return this.instances.get(id)
  }

  /**
   * List all providers
   */
  listProviders() {
    // Try registry first, fall back to generating from instances
    const registryProviders = this.registry.listProviders()
    if (registryProviders.length > 0) {
      return registryProviders
    }
    
    // Generate provider info from instances
    const providers = []
    for (const provider of this.instances.values()) {
      try {
        providers.push(provider.getProviderInfo())
      } catch (error) {
        console.warn('Failed to get provider info:', error)
      }
    }
    return providers
  }

  // -------------------------------------------------------------------------
  // Lifecycle Management
  // -------------------------------------------------------------------------

  /**
   * Cleanup factory resources
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.instances.entries()).map(async ([id, provider]) => {
      try {
        if (provider.cleanup) {
          await provider.cleanup()
        }
      } catch (error) {
        console.error(`Failed to cleanup provider ${id}:`, error)
      }
    })

    await Promise.allSettled(cleanupPromises)
    this.instances.clear()
    await this.registry.cleanup()

    console.log('SimpleProviderFactory cleaned up')
  }

  // -------------------------------------------------------------------------
  // Private Implementation
  // -------------------------------------------------------------------------

  /**
   * Basic configuration validation
   */
  private validateBasicConfig(config: ProviderConfig): void {
    if (!config) {
      throw this.createFactoryError('VALIDATION_ERROR', 'Configuration is required')
    }

    if (!config.type) {
      throw this.createFactoryError('VALIDATION_ERROR', 'Provider type is required')
    }

    if (!this.getSupportedTypes().includes(config.type)) {
      throw this.createFactoryError('VALIDATION_ERROR', `Unsupported provider type: ${config.type}`)
    }

    if (!config.id || !config.id.trim()) {
      throw this.createFactoryError('VALIDATION_ERROR', 'Provider ID is required')
    }

    if (!config.name || !config.name.trim()) {
      throw this.createFactoryError('VALIDATION_ERROR', 'Provider name is required')
    }

    // Type-specific validation
    this.validateTypeSpecificConfig(config)
  }

  /**
   * Type-specific configuration validation
   */
  private validateTypeSpecificConfig(config: ProviderConfig): void {
    switch (config.type) {
      case 'sqlite': {
        const sqliteConfig = config as any
        if (!sqliteConfig.databasePath) {
          throw this.createFactoryError('VALIDATION_ERROR', 'SQLite provider requires databasePath')
        }
        break
      }
      case 'linear': {
        const linearConfig = config as any
        if (!linearConfig.apiToken) {
          throw this.createFactoryError('VALIDATION_ERROR', 'Linear provider requires apiToken')
        }
        if (!linearConfig.teamId) {
          throw this.createFactoryError('VALIDATION_ERROR', 'Linear provider requires teamId')
        }
        break
      }
      case 'github': {
        const githubConfig = config as any
        if (!githubConfig.apiToken) {
          throw this.createFactoryError('VALIDATION_ERROR', 'GitHub provider requires apiToken')
        }
        if (!githubConfig.owner || !githubConfig.repo) {
          throw this.createFactoryError('VALIDATION_ERROR', 'GitHub provider requires owner and repo')
        }
        break
      }
      case 'jira': {
        const jiraConfig = config as any
        if (!jiraConfig.baseUrl) {
          throw this.createFactoryError('VALIDATION_ERROR', 'Jira provider requires baseUrl')
        }
        if (!jiraConfig.username) {
          throw this.createFactoryError('VALIDATION_ERROR', 'Jira provider requires username')
        }
        if (!jiraConfig.apiToken) {
          throw this.createFactoryError('VALIDATION_ERROR', 'Jira provider requires apiToken')
        }
        if (!jiraConfig.projectKey) {
          throw this.createFactoryError('VALIDATION_ERROR', 'Jira provider requires projectKey')
        }
        break
      }
    }
  }

  /**
   * Instantiate provider based on type
   */
  private async instantiateProvider(config: ProviderConfig): Promise<IssueProvider> {
    switch (config.type) {
      case 'sqlite':
        return new SQLiteProviderImpl(config)
      case 'linear':
        return new LinearProviderImpl(config)
      case 'github':
        return new GitHubProviderImpl(config)
      case 'jira':
        return new JiraProviderImpl(config)
      default:
        throw this.createFactoryError('OPERATION_FAILED', `Unsupported provider type: ${config.type}`)
    }
  }

  /**
   * Create standardized factory error
   */
  private createFactoryError(code: string, message: string): ProviderError {
    return {
      name: 'SimpleProviderFactoryError',
      message: `Simple Provider Factory: ${message}`,
      code: code as any,
      providerId: 'factory',
      providerType: 'factory' as any,
      retryable: false,
      context: {
        operation: 'factory_operation',
        timestamp: new Date()
      }
    }
  }
}

// =============================================================================
// Simple Provider Implementations
// =============================================================================

/**
 * Simple SQLite provider implementation
 */
class SQLiteProviderImpl extends BaseProvider {
  protected async performInitialization(): Promise<void> {
    console.log(`SQLite provider ${this.config.id} initialized`)
  }

  protected async performCleanup(): Promise<void> {
    console.log(`SQLite provider ${this.config.id} cleaned up`)
  }

  protected async performHealthCheck(): Promise<boolean> {
    return true
  }

  getProviderInfo() {
    return {
      id: this.config.id,
      type: 'sqlite' as const,
      name: this.config.name,
      version: '1.0.0',
      description: 'Simple SQLite provider implementation',
      capabilities: {
        supportsProjects: true,
        supportsHierarchy: true,
        supportsDependencies: true,
        supportsCustomWorkflows: true,
        supportsEstimation: true,
        supportsLabels: true,
        supportsComments: true,
        supportsAssignees: true,
        supportsExport: true,
        supportsImport: true,
        supportsSync: false,
        supportsOffline: true
      },
      status: {
        isConnected: true,
        isHealthy: true,
        lastHealthCheck: new Date()
      },
      authRequired: false
    }
  }

  protected async validateProjectExists(): Promise<boolean> { return true }
  protected async validateIssueExists(): Promise<boolean> { return true }

  // Placeholder implementations
  async createProject() { throw new Error('Not implemented') }
  async getProject() { throw new Error('Not implemented') }
  async updateProject() { throw new Error('Not implemented') }
  async listProjects() { throw new Error('Not implemented') }
  async deleteProject() { throw new Error('Not implemented') }
  async createIssue() { throw new Error('Not implemented') }
  async getIssue() { throw new Error('Not implemented') }
  async updateIssue() { throw new Error('Not implemented') }
  async listIssues() { throw new Error('Not implemented') }
  async deleteIssue() { throw new Error('Not implemented') }
  async addDependency() { throw new Error('Not implemented') }
  async removeDependency() { throw new Error('Not implemented') }
  async getDependencyGraph() { throw new Error('Not implemented') }
  async validateDependencyGraph() { throw new Error('Not implemented') }
  async getWorkflowStates() { throw new Error('Not implemented') }
  async createWorkflowState() { throw new Error('Not implemented') }
  async updateIssueState() { throw new Error('Not implemented') }
  async getValidStateTransitions() { throw new Error('Not implemented') }
  async createLabel() { throw new Error('Not implemented') }
  async getProjectLabels() { throw new Error('Not implemented') }
  async addLabelToIssue() { throw new Error('Not implemented') }
  async removeLabelFromIssue() { throw new Error('Not implemented') }
  async getNextTaskRecommendation() { throw new Error('Not implemented') }
  async getAvailableIssues() { throw new Error('Not implemented') }
  async startIssue() { throw new Error('Not implemented') }
  async completeIssue() { throw new Error('Not implemented') }
  async exportData() { throw new Error('Not implemented') }
  async importData() { throw new Error('Not implemented') }
  async syncWith() { throw new Error('Not implemented') }
  async validateDataIntegrity() { throw new Error('Not implemented') }
}

/**
 * Simple Linear provider implementation
 */
class LinearProviderImpl extends BaseProvider {
  protected async performInitialization(): Promise<void> {
    console.log(`Linear provider ${this.config.id} initialized`)
  }

  protected async performCleanup(): Promise<void> {
    console.log(`Linear provider ${this.config.id} cleaned up`)
  }

  protected async performHealthCheck(): Promise<boolean> {
    return true
  }

  getProviderInfo() {
    return {
      id: this.config.id,
      type: 'linear' as const,
      name: this.config.name,
      version: '1.0.0',
      description: 'Simple Linear provider implementation',
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
        supportsSync: true,
        supportsOffline: false
      },
      status: {
        isConnected: true,
        isHealthy: true,
        lastHealthCheck: new Date()
      },
      authRequired: true
    }
  }

  protected async validateProjectExists(): Promise<boolean> { return true }
  protected async validateIssueExists(): Promise<boolean> { return true }

  // Placeholder implementations
  async createProject() { throw new Error('Not implemented') }
  async getProject() { throw new Error('Not implemented') }
  async updateProject() { throw new Error('Not implemented') }
  async listProjects() { throw new Error('Not implemented') }
  async deleteProject() { throw new Error('Not implemented') }
  async createIssue() { throw new Error('Not implemented') }
  async getIssue() { throw new Error('Not implemented') }
  async updateIssue() { throw new Error('Not implemented') }
  async listIssues() { throw new Error('Not implemented') }
  async deleteIssue() { throw new Error('Not implemented') }
  async addDependency() { throw new Error('Not implemented') }
  async removeDependency() { throw new Error('Not implemented') }
  async getDependencyGraph() { throw new Error('Not implemented') }
  async validateDependencyGraph() { throw new Error('Not implemented') }
  async getWorkflowStates() { throw new Error('Not implemented') }
  async createWorkflowState() { throw new Error('Not implemented') }
  async updateIssueState() { throw new Error('Not implemented') }
  async getValidStateTransitions() { throw new Error('Not implemented') }
  async createLabel() { throw new Error('Not implemented') }
  async getProjectLabels() { throw new Error('Not implemented') }
  async addLabelToIssue() { throw new Error('Not implemented') }
  async removeLabelFromIssue() { throw new Error('Not implemented') }
  async getNextTaskRecommendation() { throw new Error('Not implemented') }
  async getAvailableIssues() { throw new Error('Not implemented') }
  async startIssue() { throw new Error('Not implemented') }
  async completeIssue() { throw new Error('Not implemented') }
  async exportData() { throw new Error('Not implemented') }
  async importData() { throw new Error('Not implemented') }
  async syncWith() { throw new Error('Not implemented') }
  async validateDataIntegrity() { throw new Error('Not implemented') }
}

/**
 * Simple GitHub provider implementation
 */
class GitHubProviderImpl extends BaseProvider {
  protected async performInitialization(): Promise<void> {
    console.log(`GitHub provider ${this.config.id} initialized`)
  }

  protected async performCleanup(): Promise<void> {
    console.log(`GitHub provider ${this.config.id} cleaned up`)
  }

  protected async performHealthCheck(): Promise<boolean> {
    return true
  }

  getProviderInfo() {
    return {
      id: this.config.id,
      type: 'github' as const,
      name: this.config.name,
      version: '1.0.0',
      description: 'Simple GitHub provider implementation',
      capabilities: {
        supportsProjects: true,
        supportsHierarchy: false,
        supportsDependencies: false,
        supportsCustomWorkflows: false,
        supportsEstimation: false,
        supportsLabels: true,
        supportsComments: true,
        supportsAssignees: true,
        supportsExport: true,
        supportsImport: false,
        supportsSync: false,
        supportsOffline: false
      },
      status: {
        isConnected: true,
        isHealthy: true,
        lastHealthCheck: new Date()
      },
      authRequired: true
    }
  }

  protected async validateProjectExists(): Promise<boolean> { return true }
  protected async validateIssueExists(): Promise<boolean> { return true }

  // Placeholder implementations
  async createProject() { throw new Error('Not implemented') }
  async getProject() { throw new Error('Not implemented') }
  async updateProject() { throw new Error('Not implemented') }
  async listProjects() { throw new Error('Not implemented') }
  async deleteProject() { throw new Error('Not implemented') }
  async createIssue() { throw new Error('Not implemented') }
  async getIssue() { throw new Error('Not implemented') }
  async updateIssue() { throw new Error('Not implemented') }
  async listIssues() { throw new Error('Not implemented') }
  async deleteIssue() { throw new Error('Not implemented') }
  async addDependency() { throw new Error('Not implemented') }
  async removeDependency() { throw new Error('Not implemented') }
  async getDependencyGraph() { throw new Error('Not implemented') }
  async validateDependencyGraph() { throw new Error('Not implemented') }
  async getWorkflowStates() { throw new Error('Not implemented') }
  async createWorkflowState() { throw new Error('Not implemented') }
  async updateIssueState() { throw new Error('Not implemented') }
  async getValidStateTransitions() { throw new Error('Not implemented') }
  async createLabel() { throw new Error('Not implemented') }
  async getProjectLabels() { throw new Error('Not implemented') }
  async addLabelToIssue() { throw new Error('Not implemented') }
  async removeLabelFromIssue() { throw new Error('Not implemented') }
  async getNextTaskRecommendation() { throw new Error('Not implemented') }
  async getAvailableIssues() { throw new Error('Not implemented') }
  async startIssue() { throw new Error('Not implemented') }
  async completeIssue() { throw new Error('Not implemented') }
  async exportData() { throw new Error('Not implemented') }
  async importData() { throw new Error('Not implemented') }
  async syncWith() { throw new Error('Not implemented') }
  async validateDataIntegrity() { throw new Error('Not implemented') }
}

/**
 * Simple Jira provider implementation
 */
class JiraProviderImpl extends BaseProvider {
  protected async performInitialization(): Promise<void> {
    console.log(`Jira provider ${this.config.id} initialized`)
  }

  protected async performCleanup(): Promise<void> {
    console.log(`Jira provider ${this.config.id} cleaned up`)
  }

  protected async performHealthCheck(): Promise<boolean> {
    return true
  }

  getProviderInfo() {
    return {
      id: this.config.id,
      type: 'jira' as const,
      name: this.config.name,
      version: '1.0.0',
      description: 'Simple Jira provider implementation',
      capabilities: {
        supportsProjects: true,
        supportsHierarchy: true,
        supportsDependencies: true,
        supportsCustomWorkflows: true,
        supportsEstimation: true,
        supportsLabels: true,
        supportsComments: true,
        supportsAssignees: true,
        supportsExport: true,
        supportsImport: false,
        supportsSync: false,
        supportsOffline: false
      },
      status: {
        isConnected: true,
        isHealthy: true,
        lastHealthCheck: new Date()
      },
      authRequired: true
    }
  }

  protected async validateProjectExists(): Promise<boolean> { return true }
  protected async validateIssueExists(): Promise<boolean> { return true }

  // Placeholder implementations
  async createProject() { throw new Error('Not implemented') }
  async getProject() { throw new Error('Not implemented') }
  async updateProject() { throw new Error('Not implemented') }
  async listProjects() { throw new Error('Not implemented') }
  async deleteProject() { throw new Error('Not implemented') }
  async createIssue() { throw new Error('Not implemented') }
  async getIssue() { throw new Error('Not implemented') }
  async updateIssue() { throw new Error('Not implemented') }
  async listIssues() { throw new Error('Not implemented') }
  async deleteIssue() { throw new Error('Not implemented') }
  async addDependency() { throw new Error('Not implemented') }
  async removeDependency() { throw new Error('Not implemented') }
  async getDependencyGraph() { throw new Error('Not implemented') }
  async validateDependencyGraph() { throw new Error('Not implemented') }
  async getWorkflowStates() { throw new Error('Not implemented') }
  async createWorkflowState() { throw new Error('Not implemented') }
  async updateIssueState() { throw new Error('Not implemented') }
  async getValidStateTransitions() { throw new Error('Not implemented') }
  async createLabel() { throw new Error('Not implemented') }
  async getProjectLabels() { throw new Error('Not implemented') }
  async addLabelToIssue() { throw new Error('Not implemented') }
  async removeLabelFromIssue() { throw new Error('Not implemented') }
  async getNextTaskRecommendation() { throw new Error('Not implemented') }
  async getAvailableIssues() { throw new Error('Not implemented') }
  async startIssue() { throw new Error('Not implemented') }
  async completeIssue() { throw new Error('Not implemented') }
  async exportData() { throw new Error('Not implemented') }
  async importData() { throw new Error('Not implemented') }
  async syncWith() { throw new Error('Not implemented') }
  async validateDataIntegrity() { throw new Error('Not implemented') }
}