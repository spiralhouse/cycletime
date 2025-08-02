/**
 * Cross-Provider Integration Tests
 *
 * Comprehensive testing of provider interoperability, data migration between
 * different provider types, and validation of provider interface consistency
 * across the JCVD provider ecosystem.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { testUtils, testData } from '../../setup.js';

// Import provider implementations
import { SQLiteProvider } from '../../../src/providers/sqlite/index.js';
import { ProviderFactory } from '../../../src/providers/factory/index.js';
import { CapabilityAwareFactory } from '../../../src/providers/capabilities/capability-aware-factory.js';

// Import test utilities
import {
  generateLargeDataset,
  validateProviderParity,
  performMigrationValidation,
} from '../../utils/test-data-generators.js';

interface TestProviderPair {
  name: string;
  sourceProvider: any;
  destProvider: any;
  sourceConfig: any;
  destConfig: any;
}

describe('Cross-Provider Integration Tests', () => {
  let testDir: string;
  let providerFactory: ProviderFactory;
  let capabilityFactory: CapabilityAwareFactory;
  let testProviders: TestProviderPair[] = [];

  beforeAll(async () => {
    // Create test environment
    testDir = await testUtils.createTempDir();
    console.log(`Cross-provider test directory: ${testDir}`);

    // Initialize factories
    providerFactory = new ProviderFactory();
    capabilityFactory = new CapabilityAwareFactory();

    // Setup test provider configurations
    const sqliteConfig1 = {
      id: 'cross-provider-sqlite-1',
      type: 'sqlite' as const,
      name: 'Cross Provider SQLite 1',
      enabled: true,
      config: {
        databasePath: join(testDir, 'provider1.db'),
        walMode: true,
        performance: {
          queryTimeout: 5000,
          maxConnections: 10,
          cacheSizeKB: 10000,
        },
      },
    };

    const sqliteConfig2 = {
      id: 'cross-provider-sqlite-2',
      type: 'sqlite' as const,
      name: 'Cross Provider SQLite 2',
      enabled: true,
      config: {
        databasePath: join(testDir, 'provider2.db'),
        walMode: true,
        performance: {
          queryTimeout: 5000,
          maxConnections: 10,
          cacheSizeKB: 10000,
        },
      },
    };

    // Create provider pairs for testing
    const provider1 = new SQLiteProvider(sqliteConfig1);
    const provider2 = new SQLiteProvider(sqliteConfig2);

    await provider1.initialize();
    await provider2.initialize();

    testProviders.push({
      name: 'SQLite-to-SQLite',
      sourceProvider: provider1,
      destProvider: provider2,
      sourceConfig: sqliteConfig1,
      destConfig: sqliteConfig2,
    });

    // Note: Additional provider types would be added here in production
    // For now, we test SQLite-to-SQLite migration as the foundation
  });

  afterAll(async () => {
    // Clean up all test providers
    for (const providerPair of testProviders) {
      if (providerPair.sourceProvider?.disconnect) {
        await providerPair.sourceProvider.disconnect();
      }
      if (providerPair.destProvider?.disconnect) {
        await providerPair.destProvider.disconnect();
      }
    }

    // Clean up test environment
    if (testDir) {
      await testUtils.cleanupTempDir(testDir);
    }
  });

  beforeEach(async () => {
    // Reset state before each test
  });

  afterEach(async () => {
    // Clean up after each test if needed
  });

  // =============================================================================
  // Provider Interface Consistency Tests
  // =============================================================================

  describe('Provider Interface Consistency', () => {
    test('All providers implement complete IssueProvider interface', async () => {
      for (const providerPair of testProviders) {
        const { sourceProvider, destProvider } = providerPair;

        // Test provider metadata methods
        expect(typeof sourceProvider.getProviderInfo).toBe('function');
        expect(typeof sourceProvider.isAvailable).toBe('function');
        expect(typeof destProvider.getProviderInfo).toBe('function');
        expect(typeof destProvider.isAvailable).toBe('function');

        // Verify providers are available
        const sourceAvailable = await sourceProvider.isAvailable();
        const destAvailable = await destProvider.isAvailable();
        expect(sourceAvailable).toBe(true);
        expect(destAvailable).toBe(true);

        // Test provider info consistency
        const sourceInfo = sourceProvider.getProviderInfo();
        const destInfo = destProvider.getProviderInfo();

        expect(sourceInfo.capabilities).toBeDefined();
        expect(destInfo.capabilities).toBeDefined();
        expect(sourceInfo.status).toBeDefined();
        expect(destInfo.status).toBeDefined();
      }
    });

    test('Provider capabilities are consistently reported', async () => {
      for (const providerPair of testProviders) {
        const { sourceProvider, destProvider } = providerPair;

        const sourceInfo = sourceProvider.getProviderInfo();
        const destInfo = destProvider.getProviderInfo();

        // Core capabilities should be consistent across provider instances
        const coreCapabilities = [
          'supportsProjects',
          'supportsHierarchy',
          'supportsDependencies',
          'supportsCustomWorkflows',
          'supportsEstimation',
          'supportsLabels',
          'supportsExport',
          'supportsImport',
        ];

        for (const capability of coreCapabilities) {
          expect(sourceInfo.capabilities[capability]).toBe(destInfo.capabilities[capability]);
        }
      }
    });

    test('Provider health monitoring works consistently', async () => {
      for (const providerPair of testProviders) {
        const { sourceProvider, destProvider } = providerPair;

        const sourceHealth = await sourceProvider.checkHealth();
        const destHealth = await destProvider.checkHealth();

        expect(sourceHealth.isHealthy).toBe(true);
        expect(destHealth.isHealthy).toBe(true);
        expect(sourceHealth.errors).toEqual([]);
        expect(destHealth.errors).toEqual([]);
        expect(sourceHealth.lastHealthCheck).toBeInstanceOf(Date);
        expect(destHealth.lastHealthCheck).toBeInstanceOf(Date);
      }
    });
  });

  // =============================================================================
  // Cross-Provider Data Migration Tests
  // =============================================================================

  describe('Cross-Provider Data Migration', () => {
    test('Complete project migration between providers', async () => {
      for (const providerPair of testProviders) {
        const { name, sourceProvider, destProvider } = providerPair;
        console.log(`Testing migration: ${name}`);

        // Create comprehensive test project in source
        const sourceProject = await sourceProvider.createProject({
          name: `Cross-Provider Migration Test - ${name}`,
          description: 'Comprehensive project for testing cross-provider migration capabilities',
        });

        // Create hierarchical test data
        const epic = await sourceProvider.createIssue({
          projectId: sourceProject.id,
          title: 'Epic: Cross-Provider Migration',
          description: 'Testing data migration between different provider implementations',
          issueType: 'epic',
          priority: 2,
          estimate: 0,
        });

        const story = await sourceProvider.createIssue({
          projectId: sourceProject.id,
          parentId: epic.id,
          title: 'Story: Implement migration validation',
          description: 'Create comprehensive validation for cross-provider data migration',
          issueType: 'story',
          priority: 2,
          estimate: 8,
          assigneeId: 'test-migration-user',
          labels: ['migration', 'testing', 'validation'],
        });

        const subtask1 = await sourceProvider.createIssue({
          projectId: sourceProject.id,
          parentId: story.id,
          title: 'Subtask: Create migration tests',
          description: 'Implement comprehensive test suite for migration validation',
          issueType: 'subtask',
          priority: 3,
          estimate: 5,
          assigneeId: 'test-migration-user',
          labels: ['testing'],
        });

        const subtask2 = await sourceProvider.createIssue({
          projectId: sourceProject.id,
          parentId: story.id,
          title: 'Subtask: Validate data integrity',
          description: 'Ensure complete data integrity during migration process',
          issueType: 'subtask',
          priority: 2,
          estimate: 3,
          assigneeId: 'test-migration-user',
          labels: ['validation'],
        });

        // Add dependency between subtasks
        await sourceProvider.addDependency(subtask1.id, subtask2.id);

        // Export data from source provider
        const exportData = await sourceProvider.exportData(sourceProject.id);

        // Validate export data structure
        expect(exportData.format).toBeDefined();
        expect(exportData.projects).toHaveLength(1);
        expect(exportData.issues).toHaveLength(4); // epic + story + 2 subtasks
        expect(exportData.dependencies).toHaveLength(1);

        // Import data to destination provider
        const importResult = await destProvider.importData(exportData);

        // Validate import success
        expect(importResult.success).toBe(true);
        expect(importResult.errors).toEqual([]);
        if (importResult.warnings?.length > 0) {
          console.warn(`Import warnings for ${name}:`, importResult.warnings);
        }

        // Verify data integrity after migration
        const destProjects = await destProvider.listProjects();
        const destIssues = await destProvider.listIssues({ projectId: sourceProject.id });
        const destDependencies = await destProvider.getDependencyGraph(sourceProject.id);

        expect(destProjects).toHaveLength(1);
        expect(destIssues).toHaveLength(4);
        expect(destDependencies.dependencies).toHaveLength(1);

        // Verify hierarchical structure preservation
        const destEpic = destIssues.find(i => i.issueType === 'epic');
        const destStory = destIssues.find(i => i.issueType === 'story');
        const destSubtasks = destIssues.filter(i => i.issueType === 'subtask');

        expect(destEpic).toBeDefined();
        expect(destStory).toBeDefined();
        expect(destSubtasks).toHaveLength(2);
        expect(destStory!.parentId).toBe(destEpic!.id);
        expect(destSubtasks.every(s => s.parentId === destStory!.id)).toBe(true);

        // Verify field-level data integrity
        expect(destEpic!.title).toBe('Epic: Cross-Provider Migration');
        expect(destStory!.estimate).toBe(8);
        expect(destStory!.assigneeId).toBe('test-migration-user');
        expect(destStory!.labels).toContain('migration');
        expect(destStory!.labels).toContain('testing');
        expect(destStory!.labels).toContain('validation');

        console.log(`✅ Migration test passed: ${name}`);
      }
    });

    test('Large dataset migration performance and integrity', async () => {
      for (const providerPair of testProviders) {
        const { name, sourceProvider, destProvider } = providerPair;
        console.log(`Testing large dataset migration: ${name}`);

        // Create test project
        const project = await sourceProvider.createProject({
          name: `Large Dataset Migration - ${name}`,
          description: 'Testing migration performance with large datasets',
        });

        // Generate large test dataset
        const testIssues = await generateLargeDataset({
          projectId: project.id,
          issueCount: 1000, // Smaller than Epic test for cross-provider testing
          epicsCount: 10,
          storiesPerEpic: 50,
          subtasksPerStory: 20,
          dependencyDensity: 0.05,
          includeLabels: true,
          includeAssignees: true,
        });

        // Create issues in source provider
        console.log(`Creating ${testIssues.length} test issues...`);
        for (const issue of testIssues) {
          await sourceProvider.createIssue(issue);
        }

        // Record original state
        const originalIssues = await sourceProvider.listIssues({ projectId: project.id });
        const originalDependencies = await sourceProvider.getDependencyGraph(project.id);

        // Perform migration
        console.log('Performing migration...');
        const migrationStart = performance.now();
        const exportData = await sourceProvider.exportData(project.id);
        const importResult = await destProvider.importData(exportData);
        const migrationDuration = performance.now() - migrationStart;

        console.log(`Migration completed in ${migrationDuration.toFixed(2)}ms`);

        // Validate migration success
        expect(importResult.success).toBe(true);
        expect(importResult.errors).toEqual([]);

        // Verify data integrity
        const migratedIssues = await destProvider.listIssues({ projectId: project.id });
        const migratedDependencies = await destProvider.getDependencyGraph(project.id);

        expect(migratedIssues).toHaveLength(originalIssues.length);
        expect(migratedDependencies.dependencies).toHaveLength(
          originalDependencies.dependencies.length
        );

        // Use comprehensive parity validation
        const parityResult = await validateProviderParity(originalIssues, migratedIssues);
        expect(parityResult.dataLossDetected).toBe(false);
        expect(parityResult.hierarchyIntact).toBe(true);
        expect(parityResult.fieldMismatchCount).toBe(0);

        if (parityResult.structuralErrors.length > 0) {
          console.error(`Structural errors in ${name}:`, parityResult.structuralErrors);
        }
        expect(parityResult.structuralErrors).toEqual([]);

        console.log(`✅ Large dataset migration test passed: ${name}`);
      }
    }, 120000); // 120 second timeout for large dataset migration
  });

  // =============================================================================
  // Provider Factory Integration Tests
  // =============================================================================

  describe('Provider Factory Integration', () => {
    test('ProviderFactory creates providers consistently', async () => {
      // Test that factory can create providers with consistent interfaces
      for (const providerPair of testProviders) {
        const { sourceConfig, destConfig } = providerPair;

        // Create providers through factory
        const factorySourceProvider = await providerFactory.createProvider(sourceConfig);
        const factoryDestProvider = await providerFactory.createProvider(destConfig);

        // Verify factory-created providers work correctly
        expect(await factorySourceProvider.isAvailable()).toBe(true);
        expect(await factoryDestProvider.isAvailable()).toBe(true);

        const sourceInfo = factorySourceProvider.getProviderInfo();
        const destInfo = factoryDestProvider.getProviderInfo();

        expect(sourceInfo.name).toBe(sourceConfig.name);
        expect(destInfo.name).toBe(destConfig.name);
        expect(sourceInfo.capabilities).toBeDefined();
        expect(destInfo.capabilities).toBeDefined();

        // Clean up factory-created providers
        if (factorySourceProvider.disconnect) {
          await factorySourceProvider.disconnect();
        }
        if (factoryDestProvider.disconnect) {
          await factoryDestProvider.disconnect();
        }
      }
    });

    test('CapabilityAwareFactory selects appropriate providers', async () => {
      // Test capability-based provider selection
      const requiredCapabilities = {
        supportsProjects: true,
        supportsHierarchy: true,
        supportsDependencies: true,
        supportsExport: true,
        supportsImport: true,
      };

      // Register test providers with capability factory
      for (const providerPair of testProviders) {
        await capabilityFactory.registerProvider(
          providerPair.sourceConfig,
          providerPair.sourceProvider
        );
      }

      // Test capability-based selection
      const compatibleProviders =
        await capabilityFactory.findCompatibleProviders(requiredCapabilities);
      expect(compatibleProviders.length).toBeGreaterThan(0);

      for (const provider of compatibleProviders) {
        const capabilities = provider.getProviderInfo().capabilities;
        expect(capabilities.supportsProjects).toBe(true);
        expect(capabilities.supportsHierarchy).toBe(true);
        expect(capabilities.supportsDependencies).toBe(true);
        expect(capabilities.supportsExport).toBe(true);
        expect(capabilities.supportsImport).toBe(true);
      }
    });
  });

  // =============================================================================
  // Cross-Provider Workflow Tests
  // =============================================================================

  describe('Cross-Provider Workflow Integration', () => {
    test('Workflow states are consistent across providers', async () => {
      for (const providerPair of testProviders) {
        const { sourceProvider, destProvider } = providerPair;

        const sourceStates = await sourceProvider.getWorkflowStates();
        const destStates = await destProvider.getWorkflowStates();

        // Both providers should have the same set of workflow states
        expect(sourceStates).toHaveLength(destStates.length);

        const sourceStateNames = sourceStates.map(s => s.name).sort();
        const destStateNames = destStates.map(s => s.name).sort();
        expect(sourceStateNames).toEqual(destStateNames);

        // Test state transitions work on both providers
        const project = await sourceProvider.createProject({
          name: 'Workflow State Test',
          description: 'Testing workflow state consistency',
        });

        const issue = await sourceProvider.createIssue({
          projectId: project.id,
          title: 'Test Issue for State Transitions',
          issueType: 'story',
          priority: 2,
          estimate: 3,
        });

        // Test state transitions
        const inProgressState = sourceStates.find(s => s.name.toLowerCase().includes('progress'));
        if (inProgressState) {
          const updatedIssue = await sourceProvider.updateIssueState(issue.id, inProgressState.id);
          expect(updatedIssue.stateId).toBe(inProgressState.id);
        }
      }
    });

    test('Cross-provider dependency management', async () => {
      for (const providerPair of testProviders) {
        const { sourceProvider, destProvider } = providerPair;

        // Create test project with dependencies in source
        const project = await sourceProvider.createProject({
          name: 'Dependency Management Test',
          description: 'Testing cross-provider dependency management',
        });

        const issue1 = await sourceProvider.createIssue({
          projectId: project.id,
          title: 'Blocker Issue',
          issueType: 'story',
          priority: 1,
          estimate: 5,
        });

        const issue2 = await sourceProvider.createIssue({
          projectId: project.id,
          title: 'Dependent Issue',
          issueType: 'story',
          priority: 2,
          estimate: 3,
        });

        // Create dependency
        const dependency = await sourceProvider.addDependency(issue1.id, issue2.id);
        expect(dependency).toBeDefined();

        // Verify dependency graph
        const dependencyGraph = await sourceProvider.getDependencyGraph(project.id);
        expect(dependencyGraph.dependencies).toHaveLength(1);
        expect(dependencyGraph.dependencies[0].blockerId).toBe(issue1.id);
        expect(dependencyGraph.dependencies[0].blockedId).toBe(issue2.id);

        // Migrate to destination provider
        const exportData = await sourceProvider.exportData(project.id);
        const importResult = await destProvider.importData(exportData);
        expect(importResult.success).toBe(true);

        // Verify dependencies preserved in destination
        const destDependencyGraph = await destProvider.getDependencyGraph(project.id);
        expect(destDependencyGraph.dependencies).toHaveLength(1);
        expect(destDependencyGraph.dependencies[0].blockerId).toBe(issue1.id);
        expect(destDependencyGraph.dependencies[0].blockedId).toBe(issue2.id);
      }
    });
  });

  // =============================================================================
  // Provider Compatibility Matrix
  // =============================================================================

  test('Cross-provider compatibility matrix validation', async () => {
    const compatibilityMatrix: Record<string, Record<string, boolean>> = {};

    for (const sourceProvider of testProviders) {
      compatibilityMatrix[sourceProvider.name] = {};

      for (const destProvider of testProviders) {
        try {
          // Test basic migration compatibility
          const testProject = await sourceProvider.sourceProvider.createProject({
            name: `Compatibility Test ${sourceProvider.name} -> ${destProvider.name}`,
            description: 'Testing provider compatibility',
          });

          const testIssue = await sourceProvider.sourceProvider.createIssue({
            projectId: testProject.id,
            title: 'Compatibility Test Issue',
            issueType: 'story',
            priority: 2,
            estimate: 2,
          });

          const exportData = await sourceProvider.sourceProvider.exportData(testProject.id);
          const importResult = await destProvider.destProvider.importData(exportData);

          compatibilityMatrix[sourceProvider.name][destProvider.name] = importResult.success;
        } catch (error) {
          console.error(
            `Compatibility test failed: ${sourceProvider.name} -> ${destProvider.name}`,
            error
          );
          compatibilityMatrix[sourceProvider.name][destProvider.name] = false;
        }
      }
    }

    // Log compatibility matrix
    console.log('\n=== Provider Compatibility Matrix ===');
    console.table(compatibilityMatrix);

    // Verify all tested combinations are compatible
    for (const source of Object.keys(compatibilityMatrix)) {
      for (const dest of Object.keys(compatibilityMatrix[source])) {
        expect(compatibilityMatrix[source][dest]).toBe(true);
      }
    }
  });
});
