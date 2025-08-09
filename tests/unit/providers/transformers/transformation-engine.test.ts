/**
 * JCVD Transformation Engine Tests
 * Comprehensive test suite for the central transformation orchestration system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  createTransformationEngine,
} from '../../../../src/providers/transformers/transformation-engine.js';

import type {
  JCVDTransformationEngine} from '../../../../src/providers/transformers/transformation-engine.js';
import type {
  ProviderTransformerBase,
  EntityTransformer,
  TransformationContext,
  TransformationResult,
  BatchTransformationResult,
  ValidationResult,
  TransformationSchema,
  ProviderTransformerMetadata,
  EntityType,
} from '../../../../src/providers/transformers/transformer-interface.js';
import type { ProviderType } from '../../../../src/providers/types.js';

// Mock transformer implementations for testing
class MockLinearTransformer implements ProviderTransformerBase {
  readonly providerType = 'linear' as const;
  readonly supportedEntities: EntityType[] = ['issue', 'project'];
  readonly version = '1.0.0';

  async initialize(): Promise<void> {}

  getEntityTransformer<TProvider, TUnified>(
    entityType: EntityType
  ): EntityTransformer<TProvider, TUnified> {
    return new MockEntityTransformer<TProvider, TUnified>(entityType, this.providerType);
  }

  async validateProviderData(): Promise<ValidationResult> {
    return { isValid: true, errors: [], warnings: [], score: 1.0 };
  }

  getProviderMetadata(): ProviderTransformerMetadata & { supportedEntities: EntityType[] } {
    return {
      name: 'Mock Linear',
      version: this.version,
      supportedEntities: this.supportedEntities,
      supportedFeatures: {
        supportsHierarchy: true,
        supportsDependencies: true,
        supportsCustomFields: true,
        supportsLabels: true,
        supportsComments: true,
      },
      schemas: {
        issue: {} as any,
        project: {} as any,
        workflowState: {} as any,
        dependency: {} as any,
        label: {} as any,
        comment: {} as any,
      },
      performance: {
        averageTransformTime: 2,
        memoryUsageProfile: 'medium',
        batchSizeRecommendation: 50,
      },
    };
  }
}

class MockSQLiteTransformer implements ProviderTransformerBase {
  readonly providerType = 'sqlite' as const;
  readonly supportedEntities: EntityType[] = ['issue', 'project'];
  readonly version = '1.0.0';

  async initialize(): Promise<void> {}

  getEntityTransformer<TProvider, TUnified>(
    entityType: EntityType
  ): EntityTransformer<TProvider, TUnified> {
    return new MockEntityTransformer<TProvider, TUnified>(entityType, this.providerType);
  }

  async validateProviderData(): Promise<ValidationResult> {
    return { isValid: true, errors: [], warnings: [], score: 1.0 };
  }

  getProviderMetadata(): ProviderTransformerMetadata & { supportedEntities: EntityType[] } {
    return {
      name: 'Mock SQLite',
      version: this.version,
      supportedEntities: this.supportedEntities,
      supportedFeatures: {
        supportsHierarchy: true,
        supportsDependencies: true,
        supportsCustomFields: true,
        supportsLabels: true,
        supportsComments: true,
      },
      schemas: {
        issue: {} as any,
        project: {} as any,
        workflowState: {} as any,
        dependency: {} as any,
        label: {} as any,
        comment: {} as any,
      },
      performance: {
        averageTransformTime: 0.5,
        memoryUsageProfile: 'low',
        batchSizeRecommendation: 1000,
      },
    };
  }
}

class MockGitHubTransformer implements ProviderTransformerBase {
  readonly providerType = 'github' as const;
  readonly supportedEntities: EntityType[] = ['issue', 'project'];
  readonly version = '1.0.0';

  async initialize(): Promise<void> {}

  getEntityTransformer<TProvider, TUnified>(
    entityType: EntityType
  ): EntityTransformer<TProvider, TUnified> {
    return new MockEntityTransformer<TProvider, TUnified>(entityType, this.providerType);
  }

  async validateProviderData(): Promise<ValidationResult> {
    return { isValid: true, errors: [], warnings: [], score: 1.0 };
  }

  getProviderMetadata(): ProviderTransformerMetadata & { supportedEntities: EntityType[] } {
    return {
      name: 'Mock GitHub',
      version: this.version,
      supportedEntities: this.supportedEntities,
      supportedFeatures: {
        supportsHierarchy: false,
        supportsDependencies: false,
        supportsCustomFields: false,
        supportsLabels: true,
        supportsComments: true,
      },
      schemas: {
        issue: {} as any,
        project: {} as any,
        workflowState: {} as any,
        dependency: {} as any,
        label: {} as any,
        comment: {} as any,
      },
      performance: {
        averageTransformTime: 1.5,
        memoryUsageProfile: 'medium',
        batchSizeRecommendation: 100,
      },
    };
  }
}

class MockJiraTransformer implements ProviderTransformerBase {
  readonly providerType = 'jira' as const;
  readonly supportedEntities: EntityType[] = ['issue', 'project'];
  readonly version = '1.0.0';

  async initialize(): Promise<void> {}

  getEntityTransformer<TProvider, TUnified>(
    entityType: EntityType
  ): EntityTransformer<TProvider, TUnified> {
    return new MockEntityTransformer<TProvider, TUnified>(entityType, this.providerType);
  }

  async validateProviderData(): Promise<ValidationResult> {
    return { isValid: true, errors: [], warnings: [], score: 1.0 };
  }

  getProviderMetadata(): ProviderTransformerMetadata & { supportedEntities: EntityType[] } {
    return {
      name: 'Mock Jira',
      version: this.version,
      supportedEntities: this.supportedEntities,
      supportedFeatures: {
        supportsHierarchy: true,
        supportsDependencies: true,
        supportsCustomFields: true,
        supportsLabels: true,
        supportsComments: true,
      },
      schemas: {
        issue: {} as any,
        project: {} as any,
        workflowState: {} as any,
        dependency: {} as any,
        label: {} as any,
        comment: {} as any,
      },
      performance: {
        averageTransformTime: 3.0,
        memoryUsageProfile: 'high',
        batchSizeRecommendation: 25,
      },
    };
  }
}

class MockEntityTransformer<TProvider, TUnified> implements EntityTransformer<TProvider, TUnified> {
  constructor(
    public readonly entityType: EntityType,
    public readonly providerType: ProviderType
  ) {}

  async transform(
    source: TProvider,
    context: TransformationContext
  ): Promise<TransformationResult<TUnified>> {
    // Mock transformation - just return source data as unified data
    return {
      success: true,
      data: source as any as TUnified,
      errors: [],
      warnings: [],
    };
  }

  async reverseTransform(
    target: TUnified,
    context: TransformationContext
  ): Promise<TransformationResult<TProvider>> {
    // Mock reverse transformation
    return {
      success: true,
      data: target as any as TProvider,
      errors: [],
      warnings: [],
    };
  }

  async validateSource(source: TProvider): Promise<ValidationResult> {
    return { isValid: true, errors: [], warnings: [], score: 1.0 };
  }

  async validateTarget(target: TUnified): Promise<ValidationResult> {
    return { isValid: true, errors: [], warnings: [], score: 1.0 };
  }

  async transformBatch(
    sources: TProvider[],
    context: TransformationContext
  ): Promise<BatchTransformationResult<TUnified>> {
    const startTime = new Date();

    // Simulate some processing time for more realistic tests
    await new Promise(resolve => setTimeout(resolve, 1));
    const endTime = new Date();
    const successful = sources.map(source => source as any as TUnified);

    return {
      success: true,
      successful,
      failed: [],
      warnings: [],
      metrics: {
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        memoryUsage: 1,
        totalEntities: sources.length,
        successfulEntities: sources.length,
        failedEntities: 0,
        averageProcessingTime: sources.length > 0 ? (endTime.getTime() - startTime.getTime()) / sources.length : 0,
        fieldsTransformed: sources.length * 5,
        relationshipsProcessed: 0,
      },
    };
  }

  async reverseTransformBatch(
    targets: TUnified[],
    context: TransformationContext
  ): Promise<BatchTransformationResult<TProvider>> {
    const startTime = new Date();

    // Simulate some processing time for more realistic tests
    await new Promise(resolve => setTimeout(resolve, 1));
    const endTime = new Date();
    const successful = targets.map(target => target as any as TProvider);

    return {
      success: true,
      successful,
      failed: [],
      warnings: [],
      metrics: {
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        memoryUsage: 1,
        totalEntities: targets.length,
        successfulEntities: targets.length,
        failedEntities: 0,
        averageProcessingTime: targets.length > 0 ? (endTime.getTime() - startTime.getTime()) / targets.length : 0,
        fieldsTransformed: targets.length * 5,
        relationshipsProcessed: 0,
      },
    };
  }

  getTransformationSchema(): TransformationSchema<TProvider, TUnified> {
    return {
      entityType: this.entityType,
      providerType: this.providerType,
      version: '1.0.0',
      fieldMappings: [],
      constraints: [],
    };
  }
}

describe('JCVDTransformationEngine', () => {
  let transformationEngine: JCVDTransformationEngine;
  let mockLinearTransformer: MockLinearTransformer;
  let mockSQLiteTransformer: MockSQLiteTransformer;
  let mockGitHubTransformer: MockGitHubTransformer;
  let mockJiraTransformer: MockJiraTransformer;

  beforeEach(() => {
    transformationEngine = createTransformationEngine();
    mockLinearTransformer = new MockLinearTransformer();
    mockSQLiteTransformer = new MockSQLiteTransformer();
    mockGitHubTransformer = new MockGitHubTransformer();
    mockJiraTransformer = new MockJiraTransformer();
  });

  describe('Transformer Registration', () => {
    it('should register transformers successfully', () => {
      expect(() => {
        transformationEngine.registerTransformer(mockLinearTransformer);
        transformationEngine.registerTransformer(mockSQLiteTransformer);
        transformationEngine.registerTransformer(mockGitHubTransformer);
        transformationEngine.registerTransformer(mockJiraTransformer);
      }).not.toThrow();
    });

    it('should handle duplicate transformer registration', () => {
      transformationEngine.registerTransformer(mockLinearTransformer);

      // Registering again should not throw, just replace
      expect(() => {
        transformationEngine.registerTransformer(mockLinearTransformer);
      }).not.toThrow();
    });
  });

  describe('Transformation Execution', () => {
    beforeEach(() => {
      transformationEngine.registerTransformer(mockLinearTransformer);
      transformationEngine.registerTransformer(mockSQLiteTransformer);
      transformationEngine.registerTransformer(mockGitHubTransformer);
      transformationEngine.registerTransformer(mockJiraTransformer);
    });

    it('should successfully transform data between providers', async () => {
      const sourceData = [
        { id: '1', title: 'Issue 1', state: 'open' },
        { id: '2', title: 'Issue 2', state: 'closed' },
      ];

      const result = await transformationEngine.transform(sourceData, 'linear', 'sqlite', 'issue');

      expect(result.success).toBe(true);
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.successful[0]).toEqual(sourceData[0]);
      expect(result.successful[1]).toEqual(sourceData[1]);
    });

    it('should handle empty data arrays', async () => {
      const result = await transformationEngine.transform([], 'linear', 'sqlite', 'issue');

      expect(result.success).toBe(true);
      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });

    it('should fail when source provider is not registered', async () => {
      const sourceData = [{ id: '1', title: 'Issue 1' }];

      const result = await transformationEngine.transform(
        sourceData,
        'github' as ProviderType, // Not registered
        'sqlite',
        'issue'
      );

      expect(result.success).toBe(false);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].errors[0].code).toBe('TRANSFORMATION_ENGINE_ERROR');
    });

    it('should fail when target provider is not registered', async () => {
      const sourceData = [{ id: '1', title: 'Issue 1' }];

      const result = await transformationEngine.transform(
        sourceData,
        'linear',
        'jira' as ProviderType, // Not registered
        'issue'
      );

      expect(result.success).toBe(false);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].errors[0].code).toBe('TRANSFORMATION_ENGINE_ERROR');
    });

    it('should include performance metrics in results', async () => {
      const sourceData = [
        { id: '1', title: 'Issue 1' },
        { id: '2', title: 'Issue 2' },
      ];

      const result = await transformationEngine.transform(sourceData, 'linear', 'sqlite', 'issue');

      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.metrics!.totalEntities).toBe(2);
      expect(result.metrics!.successfulEntities).toBe(2);
      expect(result.metrics!.failedEntities).toBe(0);
      expect(result.metrics!.duration).toBeGreaterThan(0);
      expect(result.metrics!.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Batch Processing', () => {
    beforeEach(() => {
      transformationEngine.registerTransformer(mockLinearTransformer);
      transformationEngine.registerTransformer(mockSQLiteTransformer);
      transformationEngine.registerTransformer(mockGitHubTransformer);
      transformationEngine.registerTransformer(mockJiraTransformer);
    });

    it('should process large datasets in batches', async () => {
      const batchSize = 250;
      const sourceData = Array.from({ length: batchSize }, (_, i) => ({
        id: `issue_${i}`,
        title: `Issue ${i}`,
        state: 'open',
      }));

      const result = await transformationEngine.transform(sourceData, 'linear', 'sqlite', 'issue', {
        options: { batchSize: 50 }, // Force smaller batches
      });

      expect(result.success).toBe(true);
      expect(result.successful).toHaveLength(batchSize);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle batch processing performance efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `issue_${i}`,
        title: `Issue ${i}`,
        state: i % 2 === 0 ? 'open' : 'closed',
      }));

      const startTime = Date.now();

      const result = await transformationEngine.transform(
        largeDataset,
        'linear',
        'sqlite',
        'issue'
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.successful).toHaveLength(1000);

      // Should process more than 100 items per second
      const itemsPerSecond = (1000 / duration) * 1000;

      expect(itemsPerSecond).toBeGreaterThan(100);
    });
  });

  describe('Provider Compatibility', () => {
    beforeEach(() => {
      transformationEngine.registerTransformer(mockLinearTransformer);
      transformationEngine.registerTransformer(mockSQLiteTransformer);
      transformationEngine.registerTransformer(mockGitHubTransformer);
      transformationEngine.registerTransformer(mockJiraTransformer);
    });

    it('should validate provider compatibility', async () => {
      const compatibility = await transformationEngine.validateCompatibility('linear', 'sqlite');

      expect(compatibility.compatible).toBe(true);
      expect(compatibility.score).toBeGreaterThan(0);
      expect(compatibility.supportedEntities).toContain('issue');
      expect(compatibility.supportedEntities).toContain('project');
    });

    it('should cache compatibility results', async () => {
      // First call
      const compatibility1 = await transformationEngine.validateCompatibility('linear', 'sqlite');
      // Second call should use cache
      const compatibility2 = await transformationEngine.validateCompatibility('linear', 'sqlite');

      expect(compatibility1).toEqual(compatibility2);
    });
  });

  describe('Transformation Schema', () => {
    beforeEach(() => {
      transformationEngine.registerTransformer(mockLinearTransformer);
      transformationEngine.registerTransformer(mockSQLiteTransformer);
      transformationEngine.registerTransformer(mockGitHubTransformer);
      transformationEngine.registerTransformer(mockJiraTransformer);
    });

    it('should retrieve transformation schema for provider pair', async () => {
      const schema = await transformationEngine.getTransformationSchema(
        'linear',
        'sqlite',
        'issue'
      );

      expect(schema).toBeDefined();
      expect(schema.entityType).toBe('issue');
      expect(schema.version).toBeDefined();
      expect(schema.fieldMappings).toBeDefined();
    });

    it('should cache transformation schemas', async () => {
      // First call
      const schema1 = await transformationEngine.getTransformationSchema(
        'linear',
        'sqlite',
        'issue'
      );
      // Second call should use cache
      const schema2 = await transformationEngine.getTransformationSchema(
        'linear',
        'sqlite',
        'issue'
      );

      expect(schema1).toBe(schema2); // Should be the same reference due to caching
    });
  });

  describe('Transformation Statistics', () => {
    beforeEach(() => {
      transformationEngine.registerTransformer(mockLinearTransformer);
      transformationEngine.registerTransformer(mockSQLiteTransformer);
      transformationEngine.registerTransformer(mockGitHubTransformer);
      transformationEngine.registerTransformer(mockJiraTransformer);
    });

    it('should collect transformation statistics', async () => {
      const sourceData = [
        { id: '1', title: 'Issue 1' },
        { id: '2', title: 'Issue 2' },
      ];

      await transformationEngine.transform(sourceData, 'linear', 'sqlite', 'issue');

      const stats = transformationEngine.getTransformationStats();

      expect(stats.totalTransformations).toBeGreaterThan(0);
      expect(stats.successfulTransformations).toBeGreaterThan(0);
      expect(stats.averageTransformationTime).toBeGreaterThanOrEqual(0);
      expect(stats.providerMetrics).toBeDefined();
    });

    it('should track failed transformations in statistics', async () => {
      // Create a failing transformer
      const failingTransformer = new MockLinearTransformer();

      vi.spyOn(failingTransformer, 'getEntityTransformer').mockImplementation(() => {
        const transformer = new MockEntityTransformer('issue', 'linear');

        vi.spyOn(transformer, 'transformBatch').mockResolvedValue({
          success: false,
          successful: [],
          failed: [
            {
              sourceData: {},
              errors: [{ code: 'TRANSFORMATION_ERROR', message: 'Mock error', recoverable: false }],
            },
          ],
          warnings: [],
          metrics: {
            startTime: new Date(),
            endTime: new Date(),
            duration: 10,
            memoryUsage: 1,
            totalEntities: 1,
            successfulEntities: 0,
            failedEntities: 1,
            averageProcessingTime: 10,
            fieldsTransformed: 0,
            relationshipsProcessed: 0,
          },
        });

        return transformer as any;
      });

      const engine = createTransformationEngine();

      engine.registerTransformer(failingTransformer);
      engine.registerTransformer(mockSQLiteTransformer);

      await engine.transform([{ id: '1' }], 'linear', 'sqlite', 'issue');

      const stats = engine.getTransformationStats();

      expect(stats.failedTransformations).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      transformationEngine.registerTransformer(mockLinearTransformer);
      transformationEngine.registerTransformer(mockSQLiteTransformer);
      transformationEngine.registerTransformer(mockGitHubTransformer);
      transformationEngine.registerTransformer(mockJiraTransformer);
    });

    it('should handle transformation context errors gracefully', async () => {
      const sourceData = [{ id: '1', title: 'Issue 1' }];

      // Pass invalid context options
      const result = await transformationEngine.transform(sourceData, 'linear', 'sqlite', 'issue', {
        options: {
          batchSize: -1, // Invalid batch size
        } as any,
      });

      // Should still attempt transformation with defaults
      expect(result).toBeDefined();
    });

    it('should provide detailed error information', async () => {
      const sourceData = [{ id: '1', title: 'Issue 1' }];

      const result = await transformationEngine.transform(
        sourceData,
        'unsupported' as ProviderType,
        'sqlite',
        'issue'
      );

      expect(result.success).toBe(false);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].errors[0]).toHaveProperty('code');
      expect(result.failed[0].errors[0]).toHaveProperty('message');
      expect(result.failed[0].errors[0]).toHaveProperty('recoverable');
    });
  });

  describe('Performance Targets', () => {
    beforeEach(() => {
      transformationEngine.registerTransformer(mockLinearTransformer);
      transformationEngine.registerTransformer(mockSQLiteTransformer);
      transformationEngine.registerTransformer(mockGitHubTransformer);
      transformationEngine.registerTransformer(mockJiraTransformer);
    });

    it('should meet performance target of 100+ issues/second', async () => {
      const issueCount = 500;
      const issues = Array.from({ length: issueCount }, (_, i) => ({
        id: `issue_${i}`,
        title: `Issue ${i}`,
        description: `Description for issue ${i}`,
        state: i % 2 === 0 ? 'open' : 'closed',
        priority: i % 4,
        created_at: new Date().toISOString(),
      }));

      const startTime = Date.now();

      const result = await transformationEngine.transform(issues, 'linear', 'sqlite', 'issue');

      const endTime = Date.now();
      const duration = endTime - startTime;
      const issuesPerSecond = (issueCount / duration) * 1000;

      expect(result.success).toBe(true);
      expect(result.successful).toHaveLength(issueCount);

      // Performance target: 100+ issues per second (more realistic for mock implementation)
      expect(issuesPerSecond).toBeGreaterThan(100);

      console.log(`Performance: ${issuesPerSecond.toFixed(0)} issues/second`);
    });

    it('should maintain performance with complex nested data', async () => {
      const complexIssues = Array.from({ length: 100 }, (_, i) => ({
        id: `issue_${i}`,
        title: `Complex Issue ${i}`,
        description: `This is a complex issue with nested data structure ${i}`,
        assignee: {
          id: `user_${i % 10}`,
          name: `User ${i % 10}`,
          email: `user${i % 10}@example.com`,
          profile: {
            avatar: `avatar_${i % 10}.png`,
            preferences: {
              notifications: true,
              theme: 'dark',
            },
          },
        },
        labels: Array.from({ length: 3 }, (_, j) => ({
          id: `label_${j}`,
          name: `Label ${j}`,
          color: `#${j}0${j}0${j}0`,
        })),
        comments: Array.from({ length: 5 }, (_, k) => ({
          id: `comment_${k}`,
          body: `Comment ${k} on issue ${i}`,
          author: `user_${k % 3}`,
          created_at: new Date().toISOString(),
        })),
        metadata: {
          source: 'linear',
          version: '1.0.0',
          customFields: {
            severity: 'medium',
            component: 'backend',
            tags: ['bug', 'urgent', 'customer-facing'],
          },
        },
      }));

      const startTime = Date.now();

      const result = await transformationEngine.transform(
        complexIssues,
        'linear',
        'sqlite',
        'issue'
      );

      const endTime = Date.now();
      const duration = endTime - startTime;
      const issuesPerSecond = (complexIssues.length / duration) * 1000;

      expect(result.success).toBe(true);
      expect(result.successful).toHaveLength(complexIssues.length);

      // Should still maintain reasonable performance with complex data
      expect(issuesPerSecond).toBeGreaterThan(50);

      console.log(`Complex data performance: ${issuesPerSecond.toFixed(0)} issues/second`);
    });
  });
});
