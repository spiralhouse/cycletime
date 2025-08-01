/**
 * JCVD Feature Matrix and Capability Comparison System
 * 
 * This module implements comprehensive feature comparison and compatibility 
 * analysis between different providers, enabling intelligent migration 
 * recommendations and feature gap identification.
 */

import type {
  ProviderType,
  IssueProvider
} from '../types.js'

import type {
  CapabilityDefinition,
  CapabilityDiscoveryResult,
  CapabilityProbeResult,
  CapabilityCategory,
  CapabilityRegistry
} from './capability-discovery.js'

// =============================================================================
// Feature Matrix Core Types
// =============================================================================

/**
 * Feature support level for detailed capability analysis
 */
export type FeatureSupportLevel = 
  | 'full'        // Complete implementation with all features
  | 'partial'     // Supported but with limitations
  | 'workaround'  // Can be achieved through alternative methods
  | 'none'        // Not supported

/**
 * Feature matrix entry with detailed support information
 */
export interface FeatureMatrixEntry {
  /** Capability identifier */
  capabilityId: string
  /** Support level for this capability */
  supportLevel: FeatureSupportLevel
  /** Implementation version or identifier */
  version?: string
  /** Detailed implementation notes */
  implementationNotes: string
  /** Known limitations */
  limitations: string[]
  /** Alternative approaches if not fully supported */
  workarounds: string[]
  /** Performance characteristics */
  performance: {
    responseTime: number
    reliability: number
    throughput: number
  }
  /** Last validation timestamp */
  lastValidated: Date
}

/**
 * Complete feature matrix for a provider
 */
export interface ProviderFeatureMatrix {
  /** Provider identifier */
  providerId: string
  /** Provider type */
  providerType: ProviderType
  /** Feature support entries */
  features: Map<string, FeatureMatrixEntry>
  /** Overall capability score (0-1) */
  overallScore: number
  /** Category-wise scores */
  categoryScores: Map<CapabilityCategory, number>
  /** Matrix generation timestamp */
  generatedAt: Date
  /** Matrix validity period */
  validUntil: Date
}

/**
 * Comparison result between two providers
 */
export interface ProviderComparison {
  /** Source provider matrix */
  sourceProvider: ProviderFeatureMatrix
  /** Target provider matrix */
  targetProvider: ProviderFeatureMatrix
  /** Overall compatibility score (0-1) */
  compatibilityScore: number
  /** Detailed capability comparison */
  capabilityComparison: Map<string, CapabilityComparison>
  /** Migration feasibility assessment */
  migrationFeasibility: MigrationFeasibility
  /** Recommended migration strategy */
  migrationStrategy: MigrationStrategy
  /** Comparison timestamp */
  comparedAt: Date
}

/**
 * Individual capability comparison
 */
export interface CapabilityComparison {
  /** Capability identifier */
  capabilityId: string
  /** Source provider support level */
  sourceSupport: FeatureSupportLevel
  /** Target provider support level */
  targetSupport: FeatureSupportLevel
  /** Compatibility assessment */
  compatibility: 'compatible' | 'degraded' | 'incompatible'
  /** Impact of migration on this capability */
  migrationImpact: 'none' | 'minor' | 'major' | 'blocking'
  /** Recommendations for handling this capability */
  recommendations: string[]
}

/**
 * Migration feasibility assessment
 */
export interface MigrationFeasibility {
  /** Overall feasibility score (0-1) */
  feasibilityScore: number
  /** Risk level assessment */
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  /** Estimated effort in hours */
  estimatedEffort: number
  /** Blocking issues that prevent migration */
  blockingIssues: string[]
  /** Warning issues that need attention */
  warningIssues: string[]
  /** Success factors that support migration */
  successFactors: string[]
}

/**
 * Migration strategy recommendation
 */
export interface MigrationStrategy {
  /** Recommended approach */
  approach: 'direct' | 'phased' | 'hybrid' | 'not_recommended'
  /** Migration phases if phased approach */
  phases?: MigrationPhase[]
  /** Pre-migration requirements */
  prerequisites: string[]
  /** Post-migration validation steps */
  validationSteps: string[]
  /** Rollback strategy */
  rollbackPlan: string[]
  /** Timeline estimate */
  timeline: {
    preparation: number
    execution: number
    validation: number
    total: number
  }
}

/**
 * Individual migration phase
 */
export interface MigrationPhase {
  /** Phase identifier */
  id: string
  /** Phase name */
  name: string
  /** Phase description */
  description: string
  /** Capabilities to migrate in this phase */
  capabilities: string[]
  /** Phase dependencies */
  dependencies: string[]
  /** Estimated duration in hours */
  estimatedDuration: number
  /** Risk level for this phase */
  riskLevel: 'low' | 'medium' | 'high'
}

// =============================================================================
// Feature Matrix Generator
// =============================================================================

export class FeatureMatrixGenerator {
  private registry: CapabilityRegistry

  constructor(registry: CapabilityRegistry) {
    this.registry = registry
  }

  /**
   * Generate a complete feature matrix for a provider
   */
  async generateFeatureMatrix(
    provider: IssueProvider,
    discoveryResult: CapabilityDiscoveryResult
  ): Promise<ProviderFeatureMatrix> {
    const features = new Map<string, FeatureMatrixEntry>()
    const categoryScores = new Map<CapabilityCategory, number>()

    // Process each capability
    for (const [capabilityId, probeResult] of discoveryResult.capabilities) {
      const capability = this.registry.getCapability(capabilityId)
      if (!capability) continue

      const matrixEntry = this.createFeatureMatrixEntry(capability, probeResult)
      features.set(capabilityId, matrixEntry)
    }

    // Calculate category scores
    for (const category of this.getAllCategories()) {
      const categoryCapabilities = this.registry.getCapabilitiesByCategory(category)
      const categoryScore = this.calculateCategoryScore(categoryCapabilities, features)
      categoryScores.set(category, categoryScore)
    }

    // Calculate overall score
    const overallScore = this.calculateOverallScore(categoryScores)

    const providerInfo = provider.getProviderInfo()
    
    return {
      providerId: providerInfo.id,
      providerType: providerInfo.type,
      features,
      overallScore,
      categoryScores,
      generatedAt: new Date(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }
  }

  /**
   * Create feature matrix entry from capability definition and probe result
   */
  private createFeatureMatrixEntry(
    capability: CapabilityDefinition,
    probeResult: CapabilityProbeResult
  ): FeatureMatrixEntry {
    let supportLevel: FeatureSupportLevel = 'none'
    let implementationNotes = 'Not supported'
    let limitations: string[] = []
    let workarounds: string[] = []

    if (probeResult.isSupported) {
      // Determine support level based on probe metadata
      const metadata = probeResult.metadata || {}
      
      if (metadata.limitations && metadata.limitations.length > 0) {
        supportLevel = 'partial'
        limitations = metadata.limitations
      } else if (metadata.workarounds && metadata.workarounds.length > 0) {
        supportLevel = 'workaround'
        workarounds = metadata.workarounds
      } else {
        supportLevel = 'full'
      }

      implementationNotes = metadata.implementationDetails || 'Fully supported'
    }

    return {
      capabilityId: capability.id,
      supportLevel,
      version: probeResult.version,
      implementationNotes,
      limitations,
      workarounds,
      performance: probeResult.performance || {
        responseTime: 0,
        reliability: 1,
        throughput: 0
      },
      lastValidated: probeResult.probedAt
    }
  }

  /**
   * Calculate category score based on capability support
   */
  private calculateCategoryScore(
    categoryCapabilities: CapabilityDefinition[],
    features: Map<string, FeatureMatrixEntry>
  ): number {
    if (categoryCapabilities.length === 0) return 1

    let totalScore = 0
    let totalWeight = 0

    for (const capability of categoryCapabilities) {
      const feature = features.get(capability.id)
      if (!feature) continue

      const weight = capability.required ? 2 : 1
      const score = this.getSupportLevelScore(feature.supportLevel)
      
      totalScore += score * weight
      totalWeight += weight
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0
  }

  /**
   * Calculate overall score from category scores
   */
  private calculateOverallScore(categoryScores: Map<CapabilityCategory, number>): number {
    if (categoryScores.size === 0) return 0

    // Weight different categories
    const categoryWeights: Record<CapabilityCategory, number> = {
      core: 3,
      hierarchy: 2,
      workflow: 2,
      collaboration: 1.5,
      organization: 1.5,
      analytics: 1,
      integration: 1,
      performance: 1
    }

    let totalScore = 0
    let totalWeight = 0

    for (const [category, score] of categoryScores) {
      const weight = categoryWeights[category] || 1
      totalScore += score * weight
      totalWeight += weight
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0
  }

  /**
   * Get numeric score for support level
   */
  private getSupportLevelScore(level: FeatureSupportLevel): number {
    switch (level) {
      case 'full': return 1.0
      case 'partial': return 0.7
      case 'workaround': return 0.4
      case 'none': return 0.0
    }
  }

  /**
   * Get all capability categories
   */
  private getAllCategories(): CapabilityCategory[] {
    return [
      'core', 'hierarchy', 'workflow', 'collaboration',
      'organization', 'analytics', 'integration', 'performance'
    ]
  }
}

// =============================================================================
// Provider Comparison Engine
// =============================================================================

export class ProviderComparisonEngine {
  private matrixGenerator: FeatureMatrixGenerator

  constructor(matrixGenerator: FeatureMatrixGenerator) {
    this.matrixGenerator = matrixGenerator
  }

  /**
   * Compare two providers and generate migration recommendations
   */
  async compareProviders(
    sourceMatrix: ProviderFeatureMatrix,
    targetMatrix: ProviderFeatureMatrix
  ): Promise<ProviderComparison> {
    const capabilityComparison = new Map<string, CapabilityComparison>()
    
    // Compare each capability
    for (const [capabilityId, sourceFeature] of sourceMatrix.features) {
      const targetFeature = targetMatrix.features.get(capabilityId)
      const comparison = this.compareCapability(sourceFeature, targetFeature)
      capabilityComparison.set(capabilityId, comparison)
    }

    // Calculate compatibility score
    const compatibilityScore = this.calculateCompatibilityScore(capabilityComparison)

    // Assess migration feasibility
    const migrationFeasibility = this.assessMigrationFeasibility(capabilityComparison)

    // Generate migration strategy
    const migrationStrategy = this.generateMigrationStrategy(
      capabilityComparison,
      migrationFeasibility
    )

    return {
      sourceProvider: sourceMatrix,
      targetProvider: targetMatrix,
      compatibilityScore,
      capabilityComparison,
      migrationFeasibility,
      migrationStrategy,
      comparedAt: new Date()
    }
  }

  /**
   * Compare individual capability between providers
   */
  private compareCapability(
    sourceFeature: FeatureMatrixEntry,
    targetFeature?: FeatureMatrixEntry
  ): CapabilityComparison {
    const sourceSupport = sourceFeature.supportLevel
    const targetSupport = targetFeature?.supportLevel || 'none'

    let compatibility: 'compatible' | 'degraded' | 'incompatible'
    let migrationImpact: 'none' | 'minor' | 'major' | 'blocking'
    const recommendations: string[] = []

    // Determine compatibility
    if (targetSupport === 'none') {
      compatibility = 'incompatible'
      migrationImpact = sourceFeature.supportLevel === 'full' ? 'blocking' : 'major'
      recommendations.push('Feature not available in target provider')
    } else if (this.getSupportScore(targetSupport) >= this.getSupportScore(sourceSupport)) {
      compatibility = 'compatible'
      migrationImpact = 'none'
      recommendations.push('Full compatibility - no issues expected')
    } else {
      compatibility = 'degraded'
      migrationImpact = this.getSupportScore(targetSupport) < 0.5 ? 'major' : 'minor'
      recommendations.push('Reduced functionality in target provider')
      
      if (targetFeature?.workarounds.length) {
        recommendations.push(`Consider workarounds: ${targetFeature.workarounds.join(', ')}`)
      }
    }

    return {
      capabilityId: sourceFeature.capabilityId,
      sourceSupport,
      targetSupport,
      compatibility,
      migrationImpact,
      recommendations
    }
  }

  /**
   * Calculate overall compatibility score
   */
  private calculateCompatibilityScore(
    capabilityComparison: Map<string, CapabilityComparison>
  ): number {
    if (capabilityComparison.size === 0) return 0

    let totalScore = 0
    let totalWeight = 0

    for (const comparison of capabilityComparison.values()) {
      const weight = this.getCapabilityWeight(comparison.capabilityId)
      let score = 0

      switch (comparison.compatibility) {
        case 'compatible': score = 1; break
        case 'degraded': score = 0.6; break
        case 'incompatible': score = 0; break
      }

      totalScore += score * weight
      totalWeight += weight
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0
  }

  /**
   * Assess migration feasibility
   */
  private assessMigrationFeasibility(
    capabilityComparison: Map<string, CapabilityComparison>
  ): MigrationFeasibility {
    const blockingIssues: string[] = []
    const warningIssues: string[] = []
    const successFactors: string[] = []

    let majorImpacts = 0
    let minorImpacts = 0
    let compatibleFeatures = 0

    for (const comparison of capabilityComparison.values()) {
      switch (comparison.migrationImpact) {
        case 'blocking':
          blockingIssues.push(`${comparison.capabilityId}: ${comparison.recommendations[0]}`)
          break
        case 'major':
          majorImpacts++
          warningIssues.push(`${comparison.capabilityId}: Major functionality change`)
          break
        case 'minor':
          minorImpacts++
          warningIssues.push(`${comparison.capabilityId}: Minor limitations`)
          break
        case 'none':
          compatibleFeatures++
          successFactors.push(`${comparison.capabilityId}: Full compatibility`)
          break
      }
    }

    // Calculate feasibility score
    const totalFeatures = capabilityComparison.size
    let feasibilityScore = 0
    if (totalFeatures > 0) {
      feasibilityScore = (compatibleFeatures + minorImpacts * 0.7 + majorImpacts * 0.3) / totalFeatures
    }

    // Adjust for blocking issues
    if (blockingIssues.length > 0) {
      feasibilityScore *= 0.3 // Severely penalize blocking issues
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical'
    if (blockingIssues.length > 0) {
      riskLevel = 'critical'
    } else if (majorImpacts > totalFeatures * 0.5) {
      riskLevel = 'high'
    } else if (majorImpacts > 0 || minorImpacts > totalFeatures * 0.3) {
      riskLevel = 'medium'
    } else {
      riskLevel = 'low'
    }

    // Estimate effort
    const baseEffort = 8 // Base 8 hours for any migration
    const effortMultiplier = 1 + majorImpacts * 4 + minorImpacts * 2 + blockingIssues.length * 8
    const estimatedEffort = baseEffort * effortMultiplier

    return {
      feasibilityScore,
      riskLevel,
      estimatedEffort,
      blockingIssues,
      warningIssues,
      successFactors
    }
  }

  /**
   * Generate migration strategy
   */
  private generateMigrationStrategy(
    capabilityComparison: Map<string, CapabilityComparison>,
    feasibility: MigrationFeasibility
  ): MigrationStrategy {
    // Determine approach
    let approach: 'direct' | 'phased' | 'hybrid' | 'not_recommended'
    
    if (feasibility.blockingIssues.length > 0) {
      approach = 'not_recommended'
    } else if (feasibility.riskLevel === 'low') {
      approach = 'direct'
    } else if (feasibility.riskLevel === 'medium') {
      approach = 'phased'
    } else {
      approach = 'hybrid'
    }

    const prerequisites: string[] = []
    const validationSteps: string[] = []
    const rollbackPlan: string[] = []

    // Add standard prerequisites
    prerequisites.push('Backup all project data')
    prerequisites.push('Validate target provider configuration')
    prerequisites.push('Prepare rollback environment')

    // Add validation steps
    validationSteps.push('Verify data integrity after migration')
    validationSteps.push('Test core functionality')
    validationSteps.push('Validate user access permissions')

    // Add rollback plan
    rollbackPlan.push('Restore from backup')
    rollbackPlan.push('Reconfigure original provider')
    rollbackPlan.push('Notify users of rollback')

    // Calculate timeline
    const preparationTime = Math.max(4, feasibility.estimatedEffort * 0.2)
    const executionTime = feasibility.estimatedEffort * 0.6
    const validationTime = feasibility.estimatedEffort * 0.2
    
    return {
      approach,
      prerequisites,
      validationSteps,
      rollbackPlan,
      timeline: {
        preparation: preparationTime,
        execution: executionTime,
        validation: validationTime,
        total: preparationTime + executionTime + validationTime
      }
    }
  }

  /**
   * Get support level numeric score
   */
  private getSupportScore(level: FeatureSupportLevel): number {
    switch (level) {
      case 'full': return 1.0
      case 'partial': return 0.7
      case 'workaround': return 0.4
      case 'none': return 0.0
    }
  }

  /**
   * Get weight for capability based on importance
   */
  private getCapabilityWeight(capabilityId: string): number {
    // Core capabilities have higher weight
    if (capabilityId.startsWith('projects.') || capabilityId.startsWith('issues.')) {
      return 3
    }
    // Workflow and hierarchy capabilities
    if (capabilityId.startsWith('workflow.') || capabilityId.startsWith('hierarchy.')) {
      return 2
    }
    // Everything else
    return 1
  }
}

// =============================================================================
// Feature Matrix Utilities
// =============================================================================

export class FeatureMatrixUtils {
  /**
   * Generate a human-readable feature comparison report
   */
  static generateComparisonReport(comparison: ProviderComparison): string {
    const lines: string[] = []
    
    lines.push(`# Provider Migration Analysis`)
    lines.push(`**From:** ${comparison.sourceProvider.providerId} (${comparison.sourceProvider.providerType})`)
    lines.push(`**To:** ${comparison.targetProvider.providerId} (${comparison.targetProvider.providerType})`)
    lines.push(`**Compatibility Score:** ${Math.round(comparison.compatibilityScore * 100)}%`)
    lines.push(`**Risk Level:** ${comparison.migrationFeasibility.riskLevel.toUpperCase()}`)
    lines.push(`**Recommended Approach:** ${comparison.migrationStrategy.approach}`)
    lines.push('')

    if (comparison.migrationFeasibility.blockingIssues.length > 0) {
      lines.push('## 🚫 Blocking Issues')
      comparison.migrationFeasibility.blockingIssues.forEach(issue => {
        lines.push(`- ${issue}`)
      })
      lines.push('')
    }

    if (comparison.migrationFeasibility.warningIssues.length > 0) {
      lines.push('## ⚠️ Warning Issues')
      comparison.migrationFeasibility.warningIssues.forEach(issue => {
        lines.push(`- ${issue}`)
      })
      lines.push('')
    }

    if (comparison.migrationFeasibility.successFactors.length > 0) {
      lines.push('## ✅ Success Factors')
      comparison.migrationFeasibility.successFactors.forEach(factor => {
        lines.push(`- ${factor}`)
      })
      lines.push('')
    }

    lines.push('## Timeline Estimate')
    lines.push(`- **Preparation:** ${comparison.migrationStrategy.timeline.preparation} hours`)
    lines.push(`- **Execution:** ${comparison.migrationStrategy.timeline.execution} hours`)
    lines.push(`- **Validation:** ${comparison.migrationStrategy.timeline.validation} hours`)
    lines.push(`- **Total:** ${comparison.migrationStrategy.timeline.total} hours`)

    return lines.join('\n')
  }

  /**
   * Export feature matrix to JSON
   */
  static exportToJSON(matrix: ProviderFeatureMatrix): string {
    const exportData = {
      providerId: matrix.providerId,
      providerType: matrix.providerType,
      overallScore: matrix.overallScore,
      categoryScores: Object.fromEntries(matrix.categoryScores),
      features: Object.fromEntries(matrix.features),
      generatedAt: matrix.generatedAt.toISOString(),
      validUntil: matrix.validUntil.toISOString()
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Import feature matrix from JSON
   */
  static importFromJSON(json: string): ProviderFeatureMatrix {
    const data = JSON.parse(json)
    
    return {
      providerId: data.providerId,
      providerType: data.providerType,
      overallScore: data.overallScore,
      categoryScores: new Map(Object.entries(data.categoryScores)),
      features: new Map(Object.entries(data.features)),
      generatedAt: new Date(data.generatedAt),
      validUntil: new Date(data.validUntil)
    }
  }
}