/**
 * JCVD Provider Capability Discovery System
 * 
 * This module implements dynamic capability discovery for all provider types,
 * enabling intelligent provider feature detection and adaptation.
 * 
 * Core Features:
 * - Dynamic capability probing with caching
 * - Feature compatibility matrix generation
 * - Runtime capability validation
 * - Graceful degradation for unsupported operations
 */

import type {
  ProviderType,
  ProviderCapabilities,
  IssueProvider,
  ProviderError,
  OperationResult
} from '../types.js'

// =============================================================================
// Capability Discovery Core Types
// =============================================================================

/**
 * Enhanced capability definition with metadata
 */
export interface CapabilityDefinition {
  /** Unique capability identifier */
  id: string
  /** Human-readable capability name */
  name: string
  /** Detailed capability description */
  description: string
  /** Capability category for organization */
  category: CapabilityCategory
  /** Whether this capability is required for basic functionality */
  required: boolean
  /** Dependencies on other capabilities */
  dependencies: string[]
  /** Alternative capabilities that can substitute for this one */
  alternatives: string[]
  /** Provider-specific implementation notes */
  implementationNotes?: Record<ProviderType, string>
}

/**
 * Capability categories for logical grouping
 */
export type CapabilityCategory = 
  | 'core'           // Essential functionality (CRUD operations)
  | 'hierarchy'      // Issue hierarchy support (epics, stories, subtasks)
  | 'workflow'       // Workflow and state management
  | 'collaboration'  // Team features (assignees, comments)
  | 'organization'   // Labeling and categorization
  | 'analytics'      // Reporting and analysis features
  | 'integration'    // External system integration
  | 'performance'    // Performance and optimization features

/**
 * Capability probe result with detailed information
 */
export interface CapabilityProbeResult {
  /** Capability identifier */
  capabilityId: string
  /** Whether the capability is supported */
  isSupported: boolean
  /** Capability version or implementation level */
  version?: string
  /** Performance metrics for this capability */
  performance?: {
    averageResponseTime: number
    reliability: number
    throughput: number
  }
  /** Implementation-specific metadata */
  metadata?: Record<string, any>
  /** Error information if capability failed to probe */
  error?: ProviderError
  /** Timestamp of probe execution */
  probedAt: Date
}

/**
 * Complete capability discovery result
 */
export interface CapabilityDiscoveryResult {
  /** Provider that was probed */
  providerId: string
  /** Provider type */
  providerType: ProviderType
  /** Individual capability probe results */
  capabilities: Map<string, CapabilityProbeResult>
  /** Overall discovery success */
  discoverySuccess: boolean
  /** Discovery duration in milliseconds */
  discoveryDuration: number
  /** Discovery timestamp */
  discoveredAt: Date
  /** Errors encountered during discovery */
  errors: ProviderError[]
  /** Warnings and non-critical issues */
  warnings: string[]
}

/**
 * Capability discovery options
 */
export interface CapabilityDiscoveryOptions {
  /** Capabilities to specifically probe (empty = all) */
  targetCapabilities?: string[]
  /** Skip capabilities that are cached and recent */
  skipCached?: boolean
  /** Maximum discovery time in milliseconds */
  timeout?: number
  /** Include performance benchmarking */
  includeBenchmarks?: boolean
  /** Probe depth (shallow for basic checks, deep for full validation) */
  probeDepth?: 'shallow' | 'deep'
}

// =============================================================================
// Capability Registry and Management
// =============================================================================

/**
 * Registry of all supported capabilities across all provider types
 */
export class CapabilityRegistry {
  private static instance: CapabilityRegistry
  private capabilities = new Map<string, CapabilityDefinition>()

  static getInstance(): CapabilityRegistry {
    if (!CapabilityRegistry.instance) {
      CapabilityRegistry.instance = new CapabilityRegistry()
      CapabilityRegistry.instance.initializeDefaultCapabilities()
    }
    return CapabilityRegistry.instance
  }

  /**
   * Initialize the registry with standard capability definitions
   */
  private initializeDefaultCapabilities(): void {
    const defaultCapabilities: CapabilityDefinition[] = [
      // Core capabilities
      {
        id: 'projects.create',
        name: 'Project Creation',
        description: 'Create new projects with metadata',
        category: 'core',
        required: true,
        dependencies: [],
        alternatives: []
      },
      {
        id: 'projects.read',
        name: 'Project Reading',
        description: 'Retrieve project information and metadata',
        category: 'core',
        required: true,
        dependencies: [],
        alternatives: []
      },
      {
        id: 'projects.update',
        name: 'Project Updates',
        description: 'Modify project metadata and configuration',
        category: 'core',
        required: false,
        dependencies: ['projects.read'],
        alternatives: []
      },
      {
        id: 'projects.delete',
        name: 'Project Deletion',
        description: 'Remove projects and associated data',
        category: 'core',
        required: false,
        dependencies: ['projects.read'],
        alternatives: []
      },

      // Issue management capabilities
      {
        id: 'issues.create',
        name: 'Issue Creation',
        description: 'Create new issues with metadata',
        category: 'core',
        required: true,
        dependencies: ['projects.read'],
        alternatives: []
      },
      {
        id: 'issues.read',
        name: 'Issue Reading',
        description: 'Retrieve issue information and relationships',
        category: 'core',
        required: true,
        dependencies: [],
        alternatives: []
      },
      {
        id: 'issues.update',
        name: 'Issue Updates',
        description: 'Modify issue metadata and content',
        category: 'core',
        required: true,
        dependencies: ['issues.read'],
        alternatives: []
      },
      {
        id: 'issues.delete',
        name: 'Issue Deletion',
        description: 'Remove issues with dependency cleanup',
        category: 'core',
        required: false,
        dependencies: ['issues.read'],
        alternatives: []
      },
      {
        id: 'issues.list',
        name: 'Issue Listing',
        description: 'Query and filter issues with pagination',
        category: 'core',
        required: true,
        dependencies: ['issues.read'],
        alternatives: []
      },

      // Hierarchy capabilities
      {
        id: 'hierarchy.epics',
        name: 'Epic Support',
        description: 'Support for epic-level issues with children',
        category: 'hierarchy',
        required: false,
        dependencies: ['issues.create', 'issues.read'],
        alternatives: []
      },
      {
        id: 'hierarchy.stories',
        name: 'Story Support',
        description: 'Support for story-level issues with parent epics',
        category: 'hierarchy',
        required: false,
        dependencies: ['issues.create', 'issues.read'],
        alternatives: []
      },
      {
        id: 'hierarchy.subtasks',
        name: 'Subtask Support',
        description: 'Support for subtask-level issues with parent stories',
        category: 'hierarchy',
        required: false,
        dependencies: ['issues.create', 'issues.read'],
        alternatives: []
      },
      {
        id: 'hierarchy.validation',
        name: 'Hierarchy Validation',
        description: 'Enforce proper issue hierarchy constraints',
        category: 'hierarchy',
        required: false,
        dependencies: ['hierarchy.epics', 'hierarchy.stories', 'hierarchy.subtasks'],
        alternatives: []
      },

      // Dependency management
      {
        id: 'dependencies.create',
        name: 'Dependency Creation',
        description: 'Create dependency relationships between issues',
        category: 'workflow',
        required: false,
        dependencies: ['issues.read'],
        alternatives: []
      },
      {
        id: 'dependencies.remove',
        name: 'Dependency Removal',
        description: 'Remove dependency relationships',
        category: 'workflow',
        required: false,
        dependencies: ['dependencies.create'],
        alternatives: []
      },
      {
        id: 'dependencies.graph',
        name: 'Dependency Graph Analysis',
        description: 'Generate and analyze complete dependency graphs',
        category: 'analytics',
        required: false,
        dependencies: ['dependencies.create'],
        alternatives: []
      },
      {
        id: 'dependencies.validation',
        name: 'Dependency Validation',
        description: 'Detect and prevent circular dependencies',
        category: 'workflow',
        required: false,
        dependencies: ['dependencies.graph'],
        alternatives: []
      },

      // Workflow and state management
      {
        id: 'workflow.states',
        name: 'Workflow States',
        description: 'Support for custom workflow states',
        category: 'workflow',
        required: false,
        dependencies: ['issues.read'],
        alternatives: []
      },
      {
        id: 'workflow.transitions',
        name: 'State Transitions',
        description: 'Validate and execute state transitions',
        category: 'workflow',
        required: false,
        dependencies: ['workflow.states'],
        alternatives: []
      },
      {
        id: 'workflow.automation',
        name: 'Workflow Automation',
        description: 'Automatic state transitions based on rules',
        category: 'workflow',
        required: false,
        dependencies: ['workflow.transitions'],
        alternatives: []
      },

      // Collaboration features
      {
        id: 'collaboration.assignees',
        name: 'Issue Assignment',
        description: 'Assign issues to users',
        category: 'collaboration',
        required: false,
        dependencies: ['issues.update'],
        alternatives: []
      },
      {
        id: 'collaboration.comments',
        name: 'Issue Comments',
        description: 'Add comments and discussion to issues',
        category: 'collaboration',
        required: false,
        dependencies: ['issues.read'],
        alternatives: []
      },
      {
        id: 'collaboration.notifications',
        name: 'Notifications',
        description: 'Notify users of issue updates and changes',
        category: 'collaboration',
        required: false,
        dependencies: ['collaboration.assignees'],
        alternatives: []
      },

      // Organization and labeling
      {
        id: 'organization.labels',
        name: 'Issue Labels',
        description: 'Categorize issues with labels',
        category: 'organization',
        required: false,
        dependencies: ['issues.read'],
        alternatives: []
      },
      {
        id: 'organization.priorities',
        name: 'Issue Priorities',
        description: 'Set and manage issue priorities',
        category: 'organization',
        required: false,
        dependencies: ['issues.update'],
        alternatives: []
      },
      {
        id: 'organization.estimation',
        name: 'Story Point Estimation',
        description: 'Estimate issues using story points',
        category: 'organization',
        required: false,
        dependencies: ['issues.update'],
        alternatives: []
      },

      // Data portability and integration
      {
        id: 'integration.export',
        name: 'Data Export',
        description: 'Export project data for migration',
        category: 'integration',
        required: false,
        dependencies: ['projects.read', 'issues.read'],
        alternatives: []
      },
      {
        id: 'integration.import',
        name: 'Data Import',
        description: 'Import data from other providers',
        category: 'integration',
        required: false,
        dependencies: ['projects.create', 'issues.create'],
        alternatives: []
      },
      {
        id: 'integration.sync',
        name: 'Real-time Synchronization',
        description: 'Synchronize data with external systems',
        category: 'integration',
        required: false,
        dependencies: ['integration.export', 'integration.import'],
        alternatives: []
      },

      // Performance capabilities
      {
        id: 'performance.offline',
        name: 'Offline Operation',
        description: 'Function without network connectivity',
        category: 'performance',
        required: false,
        dependencies: [],
        alternatives: []
      },
      {
        id: 'performance.caching',
        name: 'Intelligent Caching',
        description: 'Cache frequently accessed data for performance',
        category: 'performance',
        required: false,
        dependencies: [],
        alternatives: []
      },
      {
        id: 'performance.bulk',
        name: 'Bulk Operations',
        description: 'Efficiently handle bulk data operations',
        category: 'performance',
        required: false,
        dependencies: [],
        alternatives: []
      }
    ]

    defaultCapabilities.forEach(capability => {
      this.capabilities.set(capability.id, capability)
    })
  }

  /**
   * Register a new capability definition
   */
  registerCapability(capability: CapabilityDefinition): void {
    this.capabilities.set(capability.id, capability)
  }

  /**
   * Get capability definition by ID
   */
  getCapability(id: string): CapabilityDefinition | undefined {
    return this.capabilities.get(id)
  }

  /**
   * Get all capabilities in a category
   */
  getCapabilitiesByCategory(category: CapabilityCategory): CapabilityDefinition[] {
    return Array.from(this.capabilities.values())
      .filter(cap => cap.category === category)
  }

  /**
   * Get all required capabilities
   */
  getRequiredCapabilities(): CapabilityDefinition[] {
    return Array.from(this.capabilities.values())
      .filter(cap => cap.required)
  }

  /**
   * Get all capability definitions
   */
  getAllCapabilities(): CapabilityDefinition[] {
    return Array.from(this.capabilities.values())
  }

  /**
   * Validate capability dependencies
   */
  validateDependencies(capabilityIds: string[]): { isValid: boolean; missing: string[] } {
    const missing = new Set<string>()
    
    for (const id of capabilityIds) {
      const capability = this.capabilities.get(id)
      if (!capability) continue
      
      for (const depId of capability.dependencies) {
        if (!capabilityIds.includes(depId)) {
          missing.add(depId)
        }
      }
    }
    
    return {
      isValid: missing.size === 0,
      missing: Array.from(missing)
    }
  }
}

// =============================================================================
// Core Capability Discovery Engine
// =============================================================================

/**
 * Main capability discovery engine that orchestrates provider capability detection
 */
export class CapabilityDiscoveryEngine {
  private registry: CapabilityRegistry
  private probeInstances = new Map<ProviderType, CapabilityProbe>()

  constructor() {
    this.registry = CapabilityRegistry.getInstance()
  }

  /**
   * Register a capability probe for a specific provider type
   */
  registerProbe(providerType: ProviderType, probe: CapabilityProbe): void {
    this.probeInstances.set(providerType, probe)
  }

  /**
   * Discover capabilities for a provider instance
   */
  async discoverCapabilities(
    provider: IssueProvider,
    options: CapabilityDiscoveryOptions = {}
  ): Promise<CapabilityDiscoveryResult> {
    const startTime = Date.now()
    const providerInfo = provider.getProviderInfo()
    const probe = this.probeInstances.get(providerInfo.type)
    
    if (!probe) {
      throw new Error(`No capability probe registered for provider type: ${providerInfo.type}`)
    }

    const result: CapabilityDiscoveryResult = {
      providerId: providerInfo.id,
      providerType: providerInfo.type,
      capabilities: new Map(),
      discoverySuccess: false,
      discoveryDuration: 0,
      discoveredAt: new Date(),
      errors: [],
      warnings: []
    }

    try {
      // Determine which capabilities to probe
      const targetCapabilities = options.targetCapabilities || 
        this.registry.getAllCapabilities().map(cap => cap.id)

      // Execute capability probes
      const probePromises = targetCapabilities.map(async (capabilityId) => {
        try {
          const probeResult = await probe.probeCapability(
            provider, 
            capabilityId, 
            options
          )
          result.capabilities.set(capabilityId, probeResult)
        } catch (error) {
          const providerError = error as ProviderError
          result.errors.push(providerError)
          
          // Add failed probe result
          result.capabilities.set(capabilityId, {
            capabilityId,
            isSupported: false,
            error: providerError,
            probedAt: new Date()
          })
        }
      })

      // Execute probes with timeout
      const timeout = options.timeout || 10000 // 10 second default
      await Promise.race([
        Promise.all(probePromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Capability discovery timeout')), timeout)
        )
      ])

      result.discoverySuccess = result.errors.length === 0
      
    } catch (error) {
      const providerError = error as ProviderError
      result.errors.push(providerError)
      result.discoverySuccess = false
    }

    result.discoveryDuration = Date.now() - startTime
    return result
  }

  /**
   * Get compatibility score between two providers
   */
  async getCompatibilityScore(
    sourceProvider: IssueProvider,
    targetProvider: IssueProvider
  ): Promise<{
    score: number
    compatibleCapabilities: string[]
    incompatibleCapabilities: string[]
    analysis: string
  }> {
    const [sourceResult, targetResult] = await Promise.all([
      this.discoverCapabilities(sourceProvider),
      this.discoverCapabilities(targetProvider)
    ])

    const sourceCapabilities = Array.from(sourceResult.capabilities.entries())
      .filter(([_, result]) => result.isSupported)
      .map(([id, _]) => id)
    
    const targetCapabilities = Array.from(targetResult.capabilities.entries())
      .filter(([_, result]) => result.isSupported)
      .map(([id, _]) => id)

    const compatible = sourceCapabilities.filter(cap => targetCapabilities.includes(cap))
    const incompatible = sourceCapabilities.filter(cap => !targetCapabilities.includes(cap))
    
    const score = sourceCapabilities.length > 0 ? 
      compatible.length / sourceCapabilities.length : 0

    const analysis = this.generateCompatibilityAnalysis(compatible, incompatible, score)

    return {
      score,
      compatibleCapabilities: compatible,
      incompatibleCapabilities: incompatible,
      analysis
    }
  }

  /**
   * Generate human-readable compatibility analysis
   */
  private generateCompatibilityAnalysis(
    compatible: string[], 
    incompatible: string[], 
    score: number
  ): string {
    if (score >= 0.9) {
      return `Excellent compatibility (${Math.round(score * 100)}%). Migration should be seamless with minimal feature loss.`
    } else if (score >= 0.7) {
      return `Good compatibility (${Math.round(score * 100)}%). Most features will transfer successfully. Review incompatible features: ${incompatible.join(', ')}`
    } else if (score >= 0.5) {
      return `Moderate compatibility (${Math.round(score * 100)}%). Significant feature differences exist. Manual review required for: ${incompatible.join(', ')}`
    } else {
      return `Low compatibility (${Math.round(score * 100)}%). Major feature gaps detected. Consider alternative providers or accept limited functionality.`
    }
  }
}

// =============================================================================
// Capability Probe Interface
// =============================================================================

/**
 * Interface for provider-specific capability probes
 */
export interface CapabilityProbe {
  /**
   * Probe a specific capability on a provider instance
   */
  probeCapability(
    provider: IssueProvider,
    capabilityId: string,
    options: CapabilityDiscoveryOptions
  ): Promise<CapabilityProbeResult>

  /**
   * Get provider-specific capability metadata
   */
  getProviderCapabilityInfo(capabilityId: string): {
    implementationDetails: string
    limitations?: string[]
    performanceNotes?: string
  } | undefined
}