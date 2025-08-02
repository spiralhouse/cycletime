/**
 * JCVD Feature Matrix and Provider Comparison Tests
 *
 * Test suite for the feature matrix generation and provider comparison system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FeatureMatrixGenerator,
  ProviderComparisonEngine,
  FeatureMatrixUtils,
  type FeatureSupportLevel,
  type ProviderFeatureMatrix,
  type ProviderComparison,
} from '../../../../src/providers/capabilities/feature-matrix.js';

import {
  CapabilityRegistry,
  type CapabilityDiscoveryResult,
  type CapabilityDefinition,
} from '../../../../src/providers/capabilities/capability-discovery.js';

import type { IssueProvider, ProviderInfo } from '../../../../src/providers/types.js';

// =============================================================================
// Mock Data Factories
// =============================================================================

function createMockProvider(
  providerId: string,
  providerType: 'sqlite' | 'linear' | 'github' | 'jira'
): IssueProvider {
  return {
    getProviderInfo(): ProviderInfo {
      return {
        id: providerId,
        type: providerType,
        name: `Mock ${providerType} Provider`,
        version: '1.0.0-test',
        description: `Mock ${providerType} provider for testing`,
        capabilities: {
          supportsProjects: true,
          supportsHierarchy: providerType !== 'github',
          supportsDependencies: providerType === 'sqlite' || providerType === 'jira',
          supportsCustomWorkflows: providerType === 'sqlite' || providerType === 'jira',
          supportsEstimation: providerType !== 'github',
          supportsLabels: true,
          supportsComments: true,
          supportsAssignees: true,
          supportsExport: providerType === 'sqlite' || providerType === 'linear',
          supportsImport: providerType === 'sqlite',
          supportsSync: providerType === 'linear',
          supportsOffline: providerType === 'sqlite',
        },
        status: {
          isConnected: true,
          isHealthy: true,
          lastHealthCheck: new Date(),
        },
        authRequired: providerType !== 'sqlite',
        configSchema: {},
      };
    },
  } as IssueProvider;
}

function createMockDiscoveryResult(
  provider: IssueProvider,
  capabilitySupport: Record<string, boolean>
): CapabilityDiscoveryResult {
  const providerInfo = provider.getProviderInfo();
  const capabilities = new Map();

  for (const [capabilityId, isSupported] of Object.entries(capabilitySupport)) {
    capabilities.set(capabilityId, {
      capabilityId,
      isSupported,
      version: isSupported ? '1.0' : undefined,
      performance: isSupported
        ? {
            averageResponseTime: Math.random() * 100 + 10,
            reliability: 0.95 + Math.random() * 0.05,
            throughput: Math.random() * 1000 + 100,
          }
        : undefined,
      metadata: isSupported
        ? {
            implementationDetails: `${providerInfo.type} implementation`,
            limitations:
              providerInfo.type === 'github' && capabilityId.includes('workflow')
                ? ['Limited workflow states']
                : undefined,
          }
        : {
            reason: 'Not supported by provider type',
          },
      probedAt: new Date(),
    });
  }

  return {
    providerId: providerInfo.id,
    providerType: providerInfo.type,
    capabilities,
    discoverySuccess: true,
    discoveryDuration: 250,
    discoveredAt: new Date(),
    errors: [],
    warnings: [],
  };
}

// =============================================================================
// Feature Matrix Generator Tests
// =============================================================================

describe('FeatureMatrixGenerator', () => {
  let generator: FeatureMatrixGenerator;
  let registry: CapabilityRegistry;

  beforeEach(() => {
    registry = CapabilityRegistry.getInstance();
    generator = new FeatureMatrixGenerator(registry);
  });

  it('should generate feature matrix for SQLite provider', async () => {
    const provider = createMockProvider('sqlite-test', 'sqlite');
    const discoveryResult = createMockDiscoveryResult(provider, {
      'projects.create': true,
      'projects.read': true,
      'issues.create': true,
      'issues.read': true,
      'issues.update': true,
      'dependencies.create': true,
      'workflow.states': true,
      'performance.offline': true,
    });

    const matrix = await generator.generateFeatureMatrix(provider, discoveryResult);

    expect(matrix.providerId).toBe('sqlite-test');
    expect(matrix.providerType).toBe('sqlite');
    expect(matrix.features.size).toBe(8);
    expect(matrix.overallScore).toBeGreaterThan(0.8); // SQLite should score highly
    expect(matrix.categoryScores.get('core')).toBeGreaterThan(0.9);
  });

  it('should generate feature matrix for GitHub provider with limitations', async () => {
    const provider = createMockProvider('github-test', 'github');
    const discoveryResult = createMockDiscoveryResult(provider, {
      'projects.create': true,
      'projects.read': true,
      'issues.create': true,
      'issues.read': true,
      'issues.update': true,
      'dependencies.create': false, // GitHub doesn't support native dependencies
      'workflow.states': false, // GitHub has limited workflow states
      'hierarchy.epics': false, // GitHub doesn't support epics natively
      'organization.labels': true,
    });

    const matrix = await generator.generateFeatureMatrix(provider, discoveryResult);

    expect(matrix.providerId).toBe('github-test');
    expect(matrix.providerType).toBe('github');
    expect(matrix.overallScore).toBeLessThan(0.8); // Should score lower due to missing features

    // Check specific feature support levels
    const projectsCreate = matrix.features.get('projects.create');
    expect(projectsCreate?.supportLevel).toBe('full');

    const dependenciesCreate = matrix.features.get('dependencies.create');
    expect(dependenciesCreate?.supportLevel).toBe('none');
  });

  it('should calculate category scores correctly', async () => {
    const provider = createMockProvider('test-provider', 'linear');
    const discoveryResult = createMockDiscoveryResult(provider, {
      'projects.create': true,
      'projects.read': true,
      'issues.create': true,
      'issues.read': false, // Missing core capability
      'hierarchy.epics': true,
      'hierarchy.stories': true,
      'workflow.states': true,
    });

    const matrix = await generator.generateFeatureMatrix(provider, discoveryResult);

    // Core category should have lower score due to missing issues.read
    const coreScore = matrix.categoryScores.get('core');
    expect(coreScore).toBeLessThan(1.0);

    // Hierarchy category should have high score
    const hierarchyScore = matrix.categoryScores.get('hierarchy');
    expect(hierarchyScore).toBeGreaterThan(0.8);
  });

  it('should handle partial capability support', async () => {
    const provider = createMockProvider('partial-provider', 'linear');

    // Create discovery result with partial support (has limitations)
    const discoveryResult = createMockDiscoveryResult(provider, { 'workflow.states': true });

    // Manually adjust the result to show limitations
    const workflowProbe = discoveryResult.capabilities.get('workflow.states')!;
    workflowProbe.metadata = {
      implementationDetails: 'Linear workflow states',
      limitations: ['Cannot create custom states via API'],
    };

    const matrix = await generator.generateFeatureMatrix(provider, discoveryResult);

    const workflowFeature = matrix.features.get('workflow.states');
    expect(workflowFeature?.supportLevel).toBe('partial');
    expect(workflowFeature?.limitations).toContain('Cannot create custom states via API');
  });
});

// =============================================================================
// Provider Comparison Engine Tests
// =============================================================================

describe('ProviderComparisonEngine', () => {
  let comparisonEngine: ProviderComparisonEngine;
  let matrixGenerator: FeatureMatrixGenerator;
  let registry: CapabilityRegistry;

  beforeEach(() => {
    registry = CapabilityRegistry.getInstance();
    matrixGenerator = new FeatureMatrixGenerator(registry);
    comparisonEngine = new ProviderComparisonEngine(matrixGenerator);
  });

  it('should compare SQLite and Linear providers', async () => {
    const sqliteProvider = createMockProvider('sqlite-test', 'sqlite');
    const linearProvider = createMockProvider('linear-test', 'linear');

    // SQLite has more capabilities
    const sqliteDiscovery = createMockDiscoveryResult(sqliteProvider, {
      'projects.create': true,
      'issues.create': true,
      'issues.read': true,
      'dependencies.create': true,
      'workflow.states': true,
      'performance.offline': true,
      'integration.export': true,
    });

    // Linear has fewer capabilities but better collaboration features
    const linearDiscovery = createMockDiscoveryResult(linearProvider, {
      'projects.create': true,
      'issues.create': true,
      'issues.read': true,
      'dependencies.create': true, // Limited support
      'workflow.states': true, // Predefined only
      'collaboration.assignees': true,
      'integration.sync': true,
    });

    const sqliteMatrix = await matrixGenerator.generateFeatureMatrix(
      sqliteProvider,
      sqliteDiscovery
    );
    const linearMatrix = await matrixGenerator.generateFeatureMatrix(
      linearProvider,
      linearDiscovery
    );

    const comparison = await comparisonEngine.compareProviders(sqliteMatrix, linearMatrix);

    expect(comparison.compatibilityScore).toBeGreaterThan(0.5);
    expect(comparison.compatibilityScore).toBeLessThan(1.0);

    expect(comparison.capabilityComparison.size).toBeGreaterThan(0);

    // Should have some compatible and some incompatible capabilities
    const compatibleCount = Array.from(comparison.capabilityComparison.values()).filter(
      comp => comp.compatibility === 'compatible'
    ).length;
    const incompatibleCount = Array.from(comparison.capabilityComparison.values()).filter(
      comp => comp.compatibility === 'incompatible'
    ).length;

    expect(compatibleCount).toBeGreaterThan(0);
    expect(incompatibleCount).toBeGreaterThan(0);
  });

  it('should assess migration feasibility', async () => {
    const sourceProvider = createMockProvider('source', 'sqlite');
    const targetProvider = createMockProvider('target', 'github');

    // Source has comprehensive capabilities
    const sourceDiscovery = createMockDiscoveryResult(sourceProvider, {
      'projects.create': true,
      'issues.create': true,
      'dependencies.create': true,
      'workflow.states': true,
      'hierarchy.epics': true,
    });

    // Target has limited capabilities (GitHub limitations)
    const targetDiscovery = createMockDiscoveryResult(targetProvider, {
      'projects.create': true,
      'issues.create': true,
      'dependencies.create': false, // Major limitation
      'workflow.states': false, // Major limitation
      'hierarchy.epics': false, // Major limitation
    });

    const sourceMatrix = await matrixGenerator.generateFeatureMatrix(
      sourceProvider,
      sourceDiscovery
    );
    const targetMatrix = await matrixGenerator.generateFeatureMatrix(
      targetProvider,
      targetDiscovery
    );

    const comparison = await comparisonEngine.compareProviders(sourceMatrix, targetMatrix);

    expect(comparison.migrationFeasibility.feasibilityScore).toBeLessThan(0.7);
    expect(comparison.migrationFeasibility.riskLevel).toBe('high');
    expect(comparison.migrationFeasibility.blockingIssues.length).toBeGreaterThan(0);
    expect(comparison.migrationStrategy.approach).toBe('hybrid');
  });

  it('should recommend direct migration for highly compatible providers', async () => {
    const provider1 = createMockProvider('provider1', 'sqlite');
    const provider2 = createMockProvider('provider2', 'sqlite'); // Same type, should be compatible

    const capabilities = {
      'projects.create': true,
      'issues.create': true,
      'issues.read': true,
      'workflow.states': true,
    };

    const discovery1 = createMockDiscoveryResult(provider1, capabilities);
    const discovery2 = createMockDiscoveryResult(provider2, capabilities);

    const matrix1 = await matrixGenerator.generateFeatureMatrix(provider1, discovery1);
    const matrix2 = await matrixGenerator.generateFeatureMatrix(provider2, discovery2);

    const comparison = await comparisonEngine.compareProviders(matrix1, matrix2);

    expect(comparison.compatibilityScore).toBeGreaterThan(0.9);
    expect(comparison.migrationFeasibility.riskLevel).toBe('low');
    expect(comparison.migrationStrategy.approach).toBe('direct');
    expect(comparison.migrationFeasibility.blockingIssues).toHaveLength(0);
  });

  it('should identify blocking issues for migration', async () => {
    const sourceProvider = createMockProvider('source', 'sqlite');
    const targetProvider = createMockProvider('target', 'github');

    const sourceDiscovery = createMockDiscoveryResult(sourceProvider, {
      'performance.offline': true, // Critical for some users
      'dependencies.create': true, // Essential for project management
      'workflow.states': true,
    });

    const targetDiscovery = createMockDiscoveryResult(targetProvider, {
      'performance.offline': false, // GitHub requires internet
      'dependencies.create': false, // GitHub doesn't support native dependencies
      'workflow.states': false, // Limited workflow support
    });

    const sourceMatrix = await matrixGenerator.generateFeatureMatrix(
      sourceProvider,
      sourceDiscovery
    );
    const targetMatrix = await matrixGenerator.generateFeatureMatrix(
      targetProvider,
      targetDiscovery
    );

    const comparison = await comparisonEngine.compareProviders(sourceMatrix, targetMatrix);

    expect(comparison.migrationFeasibility.blockingIssues.length).toBeGreaterThan(0);
    expect(comparison.migrationStrategy.approach).toBe('not_recommended');

    // Should have recommendations for alternatives
    const dependencyComparison = comparison.capabilityComparison.get('dependencies.create');
    expect(dependencyComparison?.recommendations.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Feature Matrix Utils Tests
// =============================================================================

describe('FeatureMatrixUtils', () => {
  it('should generate readable comparison report', async () => {
    const registry = CapabilityRegistry.getInstance();
    const generator = new FeatureMatrixGenerator(registry);
    const comparisonEngine = new ProviderComparisonEngine(generator);

    const sourceProvider = createMockProvider('source', 'sqlite');
    const targetProvider = createMockProvider('target', 'linear');

    const sourceDiscovery = createMockDiscoveryResult(sourceProvider, {
      'projects.create': true,
      'issues.create': true,
      'performance.offline': true,
    });

    const targetDiscovery = createMockDiscoveryResult(targetProvider, {
      'projects.create': true,
      'issues.create': true,
      'performance.offline': false,
    });

    const sourceMatrix = await generator.generateFeatureMatrix(sourceProvider, sourceDiscovery);
    const targetMatrix = await generator.generateFeatureMatrix(targetProvider, targetDiscovery);

    const comparison = await comparisonEngine.compareProviders(sourceMatrix, targetMatrix);
    const report = FeatureMatrixUtils.generateComparisonReport(comparison);

    expect(report).toContain('# Provider Migration Analysis');
    expect(report).toContain('**From:** source (sqlite)');
    expect(report).toContain('**To:** target (linear)');
    expect(report).toContain('**Compatibility Score:**');
    expect(report).toContain('## Timeline Estimate');
  });

  it('should export and import feature matrix JSON', async () => {
    const registry = CapabilityRegistry.getInstance();
    const generator = new FeatureMatrixGenerator(registry);

    const provider = createMockProvider('test-provider', 'sqlite');
    const discovery = createMockDiscoveryResult(provider, {
      'projects.create': true,
      'issues.create': true,
    });

    const originalMatrix = await generator.generateFeatureMatrix(provider, discovery);

    // Export to JSON
    const json = FeatureMatrixUtils.exportToJSON(originalMatrix);
    expect(json).toContain('"providerId":"test-provider"');
    expect(json).toContain('"providerType":"sqlite"');

    // Import from JSON
    const importedMatrix = FeatureMatrixUtils.importFromJSON(json);

    expect(importedMatrix.providerId).toBe(originalMatrix.providerId);
    expect(importedMatrix.providerType).toBe(originalMatrix.providerType);
    expect(importedMatrix.overallScore).toBe(originalMatrix.overallScore);
    expect(importedMatrix.features.size).toBe(originalMatrix.features.size);
  });

  it('should handle malformed JSON import gracefully', () => {
    expect(() => {
      FeatureMatrixUtils.importFromJSON('invalid json');
    }).toThrow();

    expect(() => {
      FeatureMatrixUtils.importFromJSON('{"incomplete": "data"}');
    }).toThrow();
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Feature Matrix Integration', () => {
  it('should work end-to-end with realistic provider scenarios', async () => {
    const registry = CapabilityRegistry.getInstance();
    const generator = new FeatureMatrixGenerator(registry);
    const comparisonEngine = new ProviderComparisonEngine(generator);

    // Create realistic provider scenarios
    const sqliteProvider = createMockProvider('local-sqlite', 'sqlite');
    const linearProvider = createMockProvider('team-linear', 'linear');
    const githubProvider = createMockProvider('oss-github', 'github');

    // SQLite: Full local capabilities
    const sqliteDiscovery = createMockDiscoveryResult(sqliteProvider, {
      'projects.create': true,
      'projects.read': true,
      'projects.update': true,
      'issues.create': true,
      'issues.read': true,
      'issues.update': true,
      'issues.list': true,
      'dependencies.create': true,
      'dependencies.graph': true,
      'workflow.states': true,
      'organization.labels': true,
      'performance.offline': true,
      'integration.export': true,
    });

    // Linear: Team collaboration focused
    const linearDiscovery = createMockDiscoveryResult(linearProvider, {
      'projects.create': true,
      'projects.read': true,
      'issues.create': true,
      'issues.read': true,
      'issues.update': true,
      'issues.list': true,
      'hierarchy.epics': true,
      'hierarchy.stories': true,
      'workflow.states': true, // Limited
      'collaboration.assignees': true,
      'organization.estimation': true,
      'integration.sync': true,
    });

    // GitHub: Open source focused
    const githubDiscovery = createMockDiscoveryResult(githubProvider, {
      'projects.create': true,
      'projects.read': true,
      'issues.create': true,
      'issues.read': true,
      'issues.update': true,
      'issues.list': true,
      'organization.labels': true,
      'collaboration.assignees': true,
      'collaboration.comments': true,
      // Missing: dependencies, hierarchy, custom workflows
    });

    // Generate matrices
    const sqliteMatrix = await generator.generateFeatureMatrix(sqliteProvider, sqliteDiscovery);
    const linearMatrix = await generator.generateFeatureMatrix(linearProvider, linearDiscovery);
    const githubMatrix = await generator.generateFeatureMatrix(githubProvider, githubDiscovery);

    // Test various comparisons
    const sqliteToLinear = await comparisonEngine.compareProviders(sqliteMatrix, linearMatrix);
    const sqliteToGithub = await comparisonEngine.compareProviders(sqliteMatrix, githubMatrix);
    const linearToGithub = await comparisonEngine.compareProviders(linearMatrix, githubMatrix);

    // SQLite to Linear should be moderately compatible
    expect(sqliteToLinear.compatibilityScore).toBeGreaterThan(0.6);
    expect(sqliteToLinear.migrationFeasibility.riskLevel).toBe('medium');

    // SQLite to GitHub should be less compatible due to missing features
    expect(sqliteToGithub.compatibilityScore).toBeLessThan(sqliteToLinear.compatibilityScore);
    expect(sqliteToGithub.migrationFeasibility.riskLevel).toBe('high');

    // Linear to GitHub should have moderate compatibility
    expect(linearToGithub.compatibilityScore).toBeGreaterThan(0.4);
    expect(linearToGithub.compatibilityScore).toBeLessThan(0.8);

    // All comparisons should provide meaningful analysis
    expect(sqliteToLinear.capabilityComparison.size).toBeGreaterThan(5);
    expect(sqliteToGithub.capabilityComparison.size).toBeGreaterThan(5);
    expect(linearToGithub.capabilityComparison.size).toBeGreaterThan(5);

    // Migration strategies should be different based on compatibility
    expect(sqliteToLinear.migrationStrategy.approach).not.toBe('not_recommended');
    expect(sqliteToGithub.migrationStrategy.approach).toBe('hybrid');
  });

  it('should provide consistent results across multiple runs', async () => {
    const registry = CapabilityRegistry.getInstance();
    const generator = new FeatureMatrixGenerator(registry);

    const provider = createMockProvider('consistency-test', 'sqlite');
    const discovery = createMockDiscoveryResult(provider, {
      'projects.create': true,
      'issues.create': true,
      'workflow.states': true,
    });

    // Generate matrix multiple times
    const matrix1 = await generator.generateFeatureMatrix(provider, discovery);
    const matrix2 = await generator.generateFeatureMatrix(provider, discovery);

    // Results should be consistent (allowing for timestamp differences)
    expect(matrix1.providerId).toBe(matrix2.providerId);
    expect(matrix1.overallScore).toBe(matrix2.overallScore);
    expect(matrix1.features.size).toBe(matrix2.features.size);
    expect(matrix1.categoryScores.size).toBe(matrix2.categoryScores.size);

    // Feature entries should match
    for (const [featureId, feature1] of matrix1.features) {
      const feature2 = matrix2.features.get(featureId);
      expect(feature2).toBeDefined();
      expect(feature1.supportLevel).toBe(feature2!.supportLevel);
      expect(feature1.implementationNotes).toBe(feature2!.implementationNotes);
    }
  });
});
