/**
 * JCVD Provider-Specific Capability Probes
 * 
 * This module implements provider-specific capability probing logic for dynamic
 * feature detection across SQLite, Linear, GitHub, and Jira providers.
 */

import type {
  IssueProvider,
  ProviderType,
  ProviderError,
  ProviderErrorCode
} from '../types.js'

import type {
  CapabilityProbe,
  CapabilityProbeResult,
  CapabilityDiscoveryOptions,
  CapabilityRegistry
} from './capability-discovery.js'

// =============================================================================
// Base Capability Probe Implementation
// =============================================================================

/**
 * Abstract base class for capability probes with common functionality
 */
export abstract class BaseCapabilityProbe implements CapabilityProbe {
  protected providerType: ProviderType

  constructor(providerType: ProviderType) {
    this.providerType = providerType
  }

  /**
   * Main capability probing method - delegates to specific probe implementations
   */
  async probeCapability(
    provider: IssueProvider,
    capabilityId: string,
    options: CapabilityDiscoveryOptions
  ): Promise<CapabilityProbeResult> {
    const startTime = Date.now()
    
    try {
      // Check if provider is available first
      const isAvailable = await provider.isAvailable()
      if (!isAvailable) {
        return this.createFailedResult(capabilityId, 'PROVIDER_UNAVAILABLE', 
          'Provider is not available for capability probing')
      }

      // Execute specific capability probe
      const probeMethod = this.getProbeMethodName(capabilityId)
      if (typeof (this as any)[probeMethod] === 'function') {
        const result = await (this as any)[probeMethod](provider, options)
        return {
          ...result,
          capabilityId,
          probedAt: new Date()
        }
      }

      // Fallback to generic probe for unknown capabilities
      return await this.genericCapabilityProbe(provider, capabilityId, options)

    } catch (error) {
      const duration = Date.now() - startTime
      return this.createFailedResult(
        capabilityId, 
        'OPERATION_FAILED', 
        `Capability probe failed: ${error.message}`,
        error as ProviderError
      )
    }
  }

  /**
   * Get provider-specific capability information
   */
  getProviderCapabilityInfo(capabilityId: string): {
    implementationDetails: string
    limitations?: string[]
    performanceNotes?: string
  } | undefined {
    return this.getCapabilityImplementationDetails(capabilityId)
  }

  // -------------------------------------------------------------------------
  // Abstract Methods for Provider-Specific Implementation
  // -------------------------------------------------------------------------

  protected abstract getCapabilityImplementationDetails(capabilityId: string): {
    implementationDetails: string
    limitations?: string[]
    performanceNotes?: string
  } | undefined

  // -------------------------------------------------------------------------
  // Common Probe Methods
  // -------------------------------------------------------------------------

  /**
   * Generic capability probe for unknown capabilities
   */
  protected async genericCapabilityProbe(
    provider: IssueProvider,
    capabilityId: string,
    options: CapabilityDiscoveryOptions
  ): Promise<Omit<CapabilityProbeResult, 'capabilityId' | 'probedAt'>> {
    // For unknown capabilities, assume not supported
    return {
      isSupported: false,
      metadata: {
        reason: 'Unknown capability - no specific probe implementation',
        probeType: 'generic'
      }
    }
  }

  /**
   * Probe project creation capability
   */
  protected async probeProjectsCreate(
    provider: IssueProvider,
    options: CapabilityDiscoveryOptions
  ): Promise<Omit<CapabilityProbeResult, 'capabilityId' | 'probedAt'>> {
    try {
      // Test project creation without actually creating
      const testConfig = {
        name: '__jcvd_capability_test__',
        description: 'Temporary test project for capability detection',
        key: 'TEST'
      }

      // For shallow probes, just check if the method exists
      if (options.probeDepth === 'shallow') {
        const hasMethod = typeof provider.createProject === 'function'
        return {
          isSupported: hasMethod,
          metadata: {
            probeType: 'shallow',
            methodExists: hasMethod
          }
        }
      }

      // For deep probes, attempt actual operation (in test mode if possible)
      // This is provider-specific implementation
      return await this.deepProbeProjectsCreate(provider, testConfig)

    } catch (error) {
      return {
        isSupported: false,
        error: error as ProviderError,
        metadata: {
          probeType: options.probeDepth || 'shallow',
          errorType: 'probe_failed'
        }
      }
    }
  }

  /**
   * Probe issue creation capability
   */
  protected async probeIssuesCreate(
    provider: IssueProvider,
    options: CapabilityDiscoveryOptions
  ): Promise<Omit<CapabilityProbeResult, 'capabilityId' | 'probedAt'>> {
    try {
      if (options.probeDepth === 'shallow') {
        const hasMethod = typeof provider.createIssue === 'function'
        return {
          isSupported: hasMethod,
          metadata: {
            probeType: 'shallow',
            methodExists: hasMethod
          }
        }
      }

      return await this.deepProbeIssuesCreate(provider)

    } catch (error) {
      return {
        isSupported: false,
        error: error as ProviderError
      }
    }
  }

  /**
   * Probe dependency management capability
   */
  protected async probeDependenciesCreate(
    provider: IssueProvider,
    options: CapabilityDiscoveryOptions
  ): Promise<Omit<CapabilityProbeResult, 'capabilityId' | 'probedAt'>> {
    try {
      if (options.probeDepth === 'shallow') {
        const hasMethod = typeof provider.addDependency === 'function'
        return {
          isSupported: hasMethod,
          metadata: {
            probeType: 'shallow',
            methodExists: hasMethod
          }
        }
      }

      return await this.deepProbeDependenciesCreate(provider)

    } catch (error) {
      return {
        isSupported: false,
        error: error as ProviderError
      }
    }
  }

  /**
   * Probe workflow state management capability
   */
  protected async probeWorkflowStates(
    provider: IssueProvider,
    options: CapabilityDiscoveryOptions
  ): Promise<Omit<CapabilityProbeResult, 'capabilityId' | 'probedAt'>> {
    try {
      if (options.probeDepth === 'shallow') {
        const hasMethod = typeof provider.getWorkflowStates === 'function'
        return {
          isSupported: hasMethod,
          metadata: {
            probeType: 'shallow',
            methodExists: hasMethod
          }
        }
      }

      return await this.deepProbeWorkflowStates(provider)

    } catch (error) {
      return {
        isSupported: false,
        error: error as ProviderError
      }
    }
  }

  // -------------------------------------------------------------------------
  // Deep Probe Methods (Abstract - Provider Specific)
  // -------------------------------------------------------------------------

  protected abstract deepProbeProjectsCreate(
    provider: IssueProvider,
    testConfig: any
  ): Promise<Omit<CapabilityProbeResult, 'capabilityId' | 'probedAt'>>

  protected abstract deepProbeIssuesCreate(
    provider: IssueProvider
  ): Promise<Omit<CapabilityProbeResult, 'capabilityId' | 'probedAt'>>

  protected abstract deepProbeDependenciesCreate(
    provider: IssueProvider
  ): Promise<Omit<CapabilityProbeResult, 'capabilityId' | 'probedAt'>>

  protected abstract deepProbeWorkflowStates(
    provider: IssueProvider
  ): Promise<Omit<CapabilityProbeResult, 'capabilityId' | 'probedAt'>>

  // -------------------------------------------------------------------------
  // Utility Methods
  // -------------------------------------------------------------------------

  /**
   * Convert capability ID to probe method name
   */
  private getProbeMethodName(capabilityId: string): string {
    // Convert "projects.create" to "probeProjectsCreate"
    const parts = capabilityId.split('.')
    const methodName = 'probe' + parts.map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join('')
    return methodName
  }

  /**
   * Create a failed capability probe result
   */
  protected createFailedResult(
    capabilityId: string,
    errorCode: ProviderErrorCode,
    message: string,
    originalError?: ProviderError
  ): CapabilityProbeResult {
    const error: ProviderError = originalError || {
      name: 'CapabilityProbeError',
      message,
      code: errorCode,
      providerId: 'unknown',
      providerType: this.providerType,
      retryable: false,
      context: {
        operation: 'capability_probe',
        parameters: { capabilityId },
        timestamp: new Date()
      }
    }

    return {
      capabilityId,
      isSupported: false,
      error,
      probedAt: new Date()
    }
  }

  /**
   * Measure operation performance
   */
  protected async measurePerformance<T>(
    operation: () => Promise<T>
  ): Promise<{
    result: T
    performance: {
      averageResponseTime: number
      reliability: number
      throughput: number
    }
  }> {
    const iterations = 3
    const results: number[] = []
    let failures = 0
    let lastResult: T

    for (let i = 0; i < iterations; i++) {
      const start = Date.now()
      try {
        lastResult = await operation()
        results.push(Date.now() - start)
      } catch (error) {
        failures++
        results.push(Date.now() - start)
      }
    }

    const averageResponseTime = results.reduce((a, b) => a + b, 0) / results.length
    const reliability = (iterations - failures) / iterations
    const throughput = 1000 / averageResponseTime // operations per second

    return {
      result: lastResult!,
      performance: {
        averageResponseTime,
        reliability,
        throughput
      }
    }
  }
}

// =============================================================================
// SQLite Provider Capability Probe
// =============================================================================

export class SQLiteCapabilityProbe extends BaseCapabilityProbe {
  constructor() {
    super('sqlite')
  }

  protected getCapabilityImplementationDetails(capabilityId: string) {
    const sqliteCapabilities: Record<string, {
      implementationDetails: string
      limitations?: string[]
      performanceNotes?: string
    }> = {
      'projects.create': {
        implementationDetails: 'Direct SQLite table insert with ACID guarantees',
        performanceNotes: 'Extremely fast, typically <1ms'
      },
      'issues.create': {
        implementationDetails: 'SQLite insert with foreign key validation',
        performanceNotes: 'Very fast, includes hierarchy validation'
      },
      'dependencies.create': {
        implementationDetails: 'SQLite with circular dependency detection',
        performanceNotes: 'Fast dependency graph validation using recursive CTEs'
      },
      'workflow.states': {
        implementationDetails: 'Full custom workflow support via SQLite tables',
        performanceNotes: 'Indexed state lookups for optimal performance'
      },
      'performance.offline': {
        implementationDetails: 'Native offline operation - no network required',
        performanceNotes: 'Best-in-class offline performance'
      },
      'integration.export': {
        implementationDetails: 'Direct SQLite query export with JSON serialization',
        performanceNotes: 'Very fast export using native SQLite JSON functions'
      }
    }

    return sqliteCapabilities[capabilityId]
  }

  protected async deepProbeProjectsCreate(provider: IssueProvider, testConfig: any) {
    // SQLite provider should always support project creation
    return {
      isSupported: true,
      version: '1.0',
      metadata: {
        probeType: 'deep',
        features: ['ACID compliance', 'foreign key validation', 'offline operation']
      }
    }
  }

  protected async deepProbeIssuesCreate(provider: IssueProvider) {
    return {
      isSupported: true,
      version: '1.0',
      metadata: {
        probeType: 'deep',
        features: ['hierarchy validation', 'full CRUD', 'relationship management']
      }
    }
  }

  protected async deepProbeDependenciesCreate(provider: IssueProvider) {
    return {
      isSupported: true,
      version: '1.0',
      metadata: {
        probeType: 'deep',
        features: ['circular dependency detection', 'graph analysis', 'constraint validation']
      }
    }
  }

  protected async deepProbeWorkflowStates(provider: IssueProvider) {
    return {
      isSupported: true,
      version: '1.0',
      metadata: {
        probeType: 'deep',
        features: ['custom states', 'transition validation', 'state history']
      }
    }
  }
}

// =============================================================================
// Linear Provider Capability Probe
// =============================================================================

export class LinearCapabilityProbe extends BaseCapabilityProbe {
  constructor() {
    super('linear')
  }

  protected getCapabilityImplementationDetails(capabilityId: string) {
    const linearCapabilities: Record<string, {
      implementationDetails: string
      limitations?: string[]
      performanceNotes?: string
    }> = {
      'projects.create': {
        implementationDetails: 'Linear GraphQL API team creation',
        limitations: ['Requires team admin permissions'],
        performanceNotes: 'API rate limited - typically 100-300ms'
      },
      'issues.create': {
        implementationDetails: 'Linear GraphQL issue creation with full metadata',
        performanceNotes: 'Good performance, includes automatic state assignment'
      },
      'dependencies.create': {
        implementationDetails: 'Linear issue relations via GraphQL',
        limitations: ['Limited dependency types', 'No circular dependency detection'],
        performanceNotes: 'Moderate performance due to API calls'
      },
      'workflow.states': {
        implementationDetails: 'Linear team workflow states via GraphQL',
        limitations: ['Cannot create custom states via API'],
        performanceNotes: 'Fast state queries, cached by Linear'
      },
      'collaboration.assignees': {
        implementationDetails: 'Native Linear user assignment',
        performanceNotes: 'Excellent integration with Linear user system'
      },
      'integration.sync': {
        implementationDetails: 'Linear webhooks and GraphQL subscriptions',
        performanceNotes: 'Real-time sync capabilities'
      }
    }

    return linearCapabilities[capabilityId]
  }

  protected async deepProbeProjectsCreate(provider: IssueProvider, testConfig: any) {
    try {
      // Check Linear team permissions and API connectivity
      const providerInfo = provider.getProviderInfo()
      if (!providerInfo.authRequired) {
        return {
          isSupported: false,
          metadata: {
            probeType: 'deep',
            reason: 'Linear requires authentication'
          }
        }
      }

      return {
        isSupported: true,
        version: 'GraphQL API',
        metadata: {
          probeType: 'deep',
          features: ['team creation', 'metadata management', 'permissions']
        }
      }
    } catch (error) {
      return {
        isSupported: false,
        error: error as ProviderError
      }
    }
  }

  protected async deepProbeIssuesCreate(provider: IssueProvider) {
    return {
      isSupported: true,
      version: 'GraphQL API',
      metadata: {
        probeType: 'deep',
        features: ['full issue lifecycle', 'assignments', 'labels', 'estimates']
      }
    }
  }

  protected async deepProbeDependenciesCreate(provider: IssueProvider) {
    return {
      isSupported: true,
      version: 'Relations API',
      metadata: {
        probeType: 'deep',
        features: ['issue relations', 'blocking relationships'],
        limitations: ['Limited dependency types', 'No cycle detection']
      }
    }
  }

  protected async deepProbeWorkflowStates(provider: IssueProvider) {
    return {
      isSupported: true,
      version: 'Team Workflows',
      metadata: {
        probeType: 'deep',
        features: ['predefined states', 'state transitions'],
        limitations: ['Cannot create custom states via API']
      }
    }
  }
}

// =============================================================================
// GitHub Provider Capability Probe
// =============================================================================

export class GitHubCapabilityProbe extends BaseCapabilityProbe {
  constructor() {
    super('github')
  }

  protected getCapabilityImplementationDetails(capabilityId: string) {
    const githubCapabilities: Record<string, {
      implementationDetails: string
      limitations?: string[]
      performanceNotes?: string
    }> = {
      'projects.create': {
        implementationDetails: 'GitHub repository creation with issues enabled',
        limitations: ['Limited project metadata', 'Repository-centric model'],
        performanceNotes: 'Good performance, includes repository setup'
      },
      'issues.create': {
        implementationDetails: 'GitHub Issues API with labels and assignees',
        performanceNotes: 'Excellent performance and reliability'
      },
      'dependencies.create': {
        implementationDetails: 'Simulated via issue references and task lists',
        limitations: ['No native dependency support', 'Text-based relationships'],
        performanceNotes: 'Manual parsing required for dependency detection'
      },
      'workflow.states': {
        implementationDetails: 'Open/Closed states with label-based extensions',
        limitations: ['Binary state model', 'Label-based workarounds'],
        performanceNotes: 'Simple and fast, limited flexibility'
      },
      'collaboration.assignees': {
        implementationDetails: 'Native GitHub user assignment',
        performanceNotes: 'Excellent integration with GitHub user system'
      },
      'organization.labels': {
        implementationDetails: 'Native GitHub labels with color coding',
        performanceNotes: 'Fast and well-integrated'
      }
    }

    return githubCapabilities[capabilityId]
  }

  protected async deepProbeProjectsCreate(provider: IssueProvider, testConfig: any) {
    return {
      isSupported: true,
      version: 'REST API v3',
      metadata: {
        probeType: 'deep',
        features: ['repository creation', 'issue tracking', 'basic metadata'],
        limitations: ['Repository-centric model', 'Limited project structure']
      }
    }
  }

  protected async deepProbeIssuesCreate(provider: IssueProvider) {
    return {
      isSupported: true,
      version: 'Issues API v3',
      metadata: {
        probeType: 'deep',
        features: ['full issue CRUD', 'labels', 'assignees', 'comments']
      }
    }
  }

  protected async deepProbeDependenciesCreate(provider: IssueProvider) {
    return {
      isSupported: false,
      metadata: {
        probeType: 'deep',
        reason: 'GitHub does not have native dependency support',
        workarounds: ['Issue references', 'Task lists', 'Manual tracking']
      }
    }
  }

  protected async deepProbeWorkflowStates(provider: IssueProvider) {
    return {
      isSupported: true,
      version: 'Issues API',
      metadata: {
        probeType: 'deep',
        features: ['open/closed states', 'label-based extensions'],
        limitations: ['Binary state model', 'No custom workflows']
      }
    }
  }
}

// =============================================================================
// Jira Provider Capability Probe
// =============================================================================

export class JiraCapabilityProbe extends BaseCapabilityProbe {
  constructor() {
    super('jira')
  }

  protected getCapabilityImplementationDetails(capabilityId: string) {
    const jiraCapabilities: Record<string, {
      implementationDetails: string
      limitations?: string[]
      performanceNotes?: string
    }> = {
      'projects.create': {
        implementationDetails: 'Jira REST API project creation with templates',
        limitations: ['Requires project admin permissions', 'Complex configuration'],
        performanceNotes: 'Slower due to complex project setup'
      },
      'issues.create': {
        implementationDetails: 'Jira REST API with full field support',
        performanceNotes: 'Good performance, comprehensive metadata support'
      },
      'dependencies.create': {
        implementationDetails: 'Native Jira issue linking with multiple types',
        performanceNotes: 'Excellent dependency support with native linking'
      },
      'workflow.states': {
        implementationDetails: 'Full Jira workflow engine with custom states',
        performanceNotes: 'Powerful workflow capabilities, can be complex'
      },
      'hierarchy.epics': {
        implementationDetails: 'Native Epic support with comprehensive hierarchy',
        performanceNotes: 'Excellent hierarchy support with portfolio planning'
      },
      'organization.estimation': {
        implementationDetails: 'Native story points with multiple estimation schemes',
        performanceNotes: 'Comprehensive estimation and planning features'
      }
    }

    return jiraCapabilities[capabilityId]
  }

  protected async deepProbeProjectsCreate(provider: IssueProvider, testConfig: any) {
    return {
      isSupported: true,
      version: 'REST API v3',
      metadata: {
        probeType: 'deep',
        features: ['full project creation', 'templates', 'permissions', 'workflows'],
        limitations: ['Complex setup', 'Admin permissions required']
      }
    }
  }

  protected async deepProbeIssuesCreate(provider: IssueProvider) {
    return {
      isSupported: true,
      version: 'REST API v3',
      metadata: {
        probeType: 'deep',
        features: ['comprehensive CRUD', 'custom fields', 'attachments', 'workflows']
      }
    }
  }

  protected async deepProbeDependenciesCreate(provider: IssueProvider) {
    return {
      isSupported: true,
      version: 'Issue Links API',
      metadata: {
        probeType: 'deep',
        features: ['multiple link types', 'bidirectional links', 'dependency tracking']
      }
    }
  }

  protected async deepProbeWorkflowStates(provider: IssueProvider) {
    return {
      isSupported: true,
      version: 'Workflow API',
      metadata: {
        probeType: 'deep',
        features: ['custom workflows', 'transitions', 'conditions', 'post-functions']
      }
    }
  }
}

// =============================================================================
// Probe Factory
// =============================================================================

export class CapabilityProbeFactory {
  private static probes = new Map<ProviderType, CapabilityProbe>([
    ['sqlite', new SQLiteCapabilityProbe()],
    ['linear', new LinearCapabilityProbe()],
    ['github', new GitHubCapabilityProbe()],
    ['jira', new JiraCapabilityProbe()]
  ])

  static getProbe(providerType: ProviderType): CapabilityProbe {
    const probe = this.probes.get(providerType)
    if (!probe) {
      throw new Error(`No capability probe available for provider type: ${providerType}`)
    }
    return probe
  }

  static registerProbe(providerType: ProviderType, probe: CapabilityProbe): void {
    this.probes.set(providerType, probe)
  }
}