/**
 * JCVD Data Transformation System
 * Complete export module for the unified data transformation system
 *
 * This module provides all the necessary components for bidirectional data
 * transformation between different provider formats and the unified JCVD model,
 * enabling seamless provider interoperability with lossless data conversion.
 *
 * @version 1.0.0
 * @author JCVD Software Architect Agent
 */

// =============================================================================
// Core Transformation Interfaces and Types
// =============================================================================

export type {
  // Core transformer interfaces
  DataTransformer,
  EntityTransformer,
  ProviderTransformerBase,
  TransformationEngine,

  // Field mapping types
  FieldMapping,
  FieldMappingStrategy,
  TypeConversion,
  FieldCondition,
  FieldValidation,
  TransformationSchema,
  RelationshipMapping,
  RelationshipStructure,
  TransformationConstraint,

  // Context and configuration types
  TransformationContext,
  TransformationOptions,
  EntityType,

  // Result types
  TransformationResult,
  BatchTransformationResult,
  ValidationResult,
  TransformationError,
  TransformationWarning,
  TransformationErrorCode,
  TransformationMetrics,
  BatchTransformationMetrics,
  TransformationLogger,

  // Compatibility and metadata types
  CompatibilityResult,
  ProviderTransformerMetadata,
  TransformationStatistics,
} from './transformer-interface.js';

// =============================================================================
// Field Mapping System
// =============================================================================

export {
  FieldMapper,
  createFieldMapper,
  createStandardMapping,
  createComputedMapping,
  createLookupMapping,
} from './field-mapper.js';

export type { FieldMappingResult, BatchFieldMappingResult } from './field-mapper.js';

// =============================================================================
// Core Transformation Engine
// =============================================================================

export {
  JCVDTransformationEngine,
  createTransformationEngine,
  createConsoleLogger,
} from './transformation-engine.js';

// =============================================================================
// Provider-Specific Transformers
// =============================================================================

// Linear transformer
export { LinearTransformer, createLinearTransformer } from './linear-transformer.js';

export type {
  LinearIssue,
  LinearProject,
  LinearWorkflowState,
  LinearDependency,
  LinearLabel,
} from './linear-transformer.js';

// SQLite transformer
export { SQLiteTransformer, createSQLiteTransformer } from './sqlite-transformer.js';

export type {
  SQLiteIssueRow,
  SQLiteProjectRow,
  SQLiteWorkflowStateRow,
  SQLiteDependencyRow,
  SQLiteLabelRow,
  SQLiteCommentRow,
  SQLiteEnhancedIssueRow,
} from './sqlite-transformer.js';

// GitHub transformer
export { GitHubTransformer, createGitHubTransformer } from './github-transformer.js';

export type {
  GitHubIssue,
  GitHubRepository,
  GitHubLabel,
  GitHubMilestone,
  GitHubComment,
} from './github-transformer.js';

// Jira transformer
export { JiraTransformer, createJiraTransformer } from './jira-transformer.js';

export type { JiraIssue, JiraProject, JiraStatus, JiraComment } from './jira-transformer.js';

// =============================================================================
// Transformer Factory and Registry
// =============================================================================

import { GitHubTransformer } from './github-transformer.js';
import { JiraTransformer } from './jira-transformer.js';
import { LinearTransformer } from './linear-transformer.js';
import { SQLiteTransformer } from './sqlite-transformer.js';
import { JCVDTransformationEngine } from './transformation-engine.js';

import type { ProviderType } from '../types.js';
import type {
  ProviderTransformerBase,
  EntityType,
  TransformationContext,
  BatchTransformationResult,
  TransformationOptions,
} from './transformer-interface.js';

/**
 * Provider transformer factory for creating transformer instances
 */
export class TransformerFactory {
  private static readonly transformerConstructors = new Map<
    string,
    new () => ProviderTransformerBase
  >([
    ['linear', LinearTransformer],
    ['sqlite', SQLiteTransformer],
    ['github', GitHubTransformer],
    ['jira', JiraTransformer],
  ]);

  /**
   * Create a transformer instance for the specified provider
   */
  static async createTransformer(
    providerType: ProviderType,
    config: any
  ): Promise<ProviderTransformerBase> {
    const TransformerClass = this.transformerConstructors.get(providerType);

    if (!TransformerClass) {
      throw new Error(`No transformer available for provider type: ${providerType}`);
    }

    const transformer = new TransformerClass();

    await transformer.initialize(config);

    return transformer;
  }

  /**
   * Get all supported provider types
   */
  static getSupportedProviders(): ProviderType[] {
    return Array.from(this.transformerConstructors.keys()) as ProviderType[];
  }

  /**
   * Check if a provider type is supported
   */
  static isProviderSupported(providerType: ProviderType): boolean {
    return this.transformerConstructors.has(providerType);
  }
}

/**
 * Transformer registry for managing multiple transformer instances
 */
export class TransformerRegistry {
  private readonly transformers = new Map<string, ProviderTransformerBase>();
  private readonly transformationEngine: JCVDTransformationEngine;

  constructor() {
    this.transformationEngine = new JCVDTransformationEngine();
  }

  /**
   * Register a transformer instance
   */
  async registerTransformer(id: string, providerType: ProviderType, config: any): Promise<void> {
    const transformer = await TransformerFactory.createTransformer(providerType, config);

    this.transformers.set(id, transformer);
    this.transformationEngine.registerTransformer(transformer);
  }

  /**
   * Get transformer by ID
   */
  getTransformer(id: string): ProviderTransformerBase | undefined {
    return this.transformers.get(id);
  }

  /**
   * Get transformer by provider type
   */
  getTransformerByType(providerType: ProviderType): ProviderTransformerBase | undefined {
    for (const [, transformer] of Array.from(this.transformers.entries())) {
      if (transformer.providerType === providerType) {
        return transformer;
      }
    }

    return undefined;
  }

  /**
   * List all registered transformers
   */
  listTransformers(): { id: string; transformer: ProviderTransformerBase }[] {
    return Array.from(this.transformers.entries()).map(([id, transformer]) => ({
      id,
      transformer,
    }));
  }

  /**
   * Remove transformer from registry
   */
  removeTransformer(id: string): boolean {
    return this.transformers.delete(id);
  }

  /**
   * Get the transformation engine
   */
  getTransformationEngine(): JCVDTransformationEngine {
    return this.transformationEngine;
  }

  /**
   * Transform data between two providers
   */
  async transform<TSource, TTarget>(
    sourceData: TSource[],
    sourceProvider: ProviderType,
    targetProvider: ProviderType,
    entityType: EntityType,
    context?: Partial<TransformationContext>
  ): Promise<BatchTransformationResult<TTarget>> {
    return await this.transformationEngine.transform(
      sourceData,
      sourceProvider,
      targetProvider,
      entityType,
      context
    );
  }
}

// =============================================================================
// Utility Functions and Helpers
// =============================================================================

/**
 * Create a complete transformation system with all providers registered
 */
export async function createTransformationSystem(configs: {
  linear?: any;
  sqlite?: any;
  github?: any;
  jira?: any;
}): Promise<TransformerRegistry> {
  const registry = new TransformerRegistry();

  // Register configured providers
  if (configs.linear) {
    await registry.registerTransformer('linear', 'linear', configs.linear);
  }

  if (configs.sqlite) {
    await registry.registerTransformer('sqlite', 'sqlite', configs.sqlite);
  }

  if (configs.github) {
    await registry.registerTransformer('github', 'github', configs.github);
  }

  if (configs.jira) {
    await registry.registerTransformer('jira', 'jira', configs.jira);
  }

  return registry;
}

/**
 * Performance benchmarking utility for transformation operations
 */
export class TransformationBenchmark {
  private startTime: Date = new Date();
  private benchmarks: {
    operation: string;
    duration: number;
    itemCount: number;
    itemsPerSecond: number;
  }[] = [];

  /**
   * Start timing an operation
   */
  start(_operation: string): void {
    this.startTime = new Date();
  }

  /**
   * End timing and record benchmark
   */
  end(operation: string, itemCount: number): void {
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();
    const itemsPerSecond = itemCount > 0 ? (itemCount / duration) * 1000 : 0;

    this.benchmarks.push({
      operation,
      duration,
      itemCount,
      itemsPerSecond,
    });
  }

  /**
   * Get benchmark results
   */
  getResults(): {
    operation: string;
    duration: number;
    itemCount: number;
    itemsPerSecond: number;
  }[] {
    return [...this.benchmarks];
  }

  /**
   * Clear benchmark history
   */
  clear(): void {
    this.benchmarks = [];
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalOperations: number;
    totalDuration: number;
    totalItems: number;
    averageItemsPerSecond: number;
  } {
    const totalDuration = this.benchmarks.reduce((sum, b) => sum + b.duration, 0);
    const totalItems = this.benchmarks.reduce((sum, b) => sum + b.itemCount, 0);
    const averageItemsPerSecond =
      totalItems > 0 && totalDuration > 0 ? (totalItems / totalDuration) * 1000 : 0;

    return {
      totalOperations: this.benchmarks.length,
      totalDuration,
      totalItems,
      averageItemsPerSecond,
    };
  }
}

/**
 * Validation utility for transformation configurations
 */
export class TransformationValidator {
  /**
   * Validate transformation configuration
   */
  static validateConfig(config: {
    sourceProvider: ProviderType;
    targetProvider: ProviderType;
    entityType: EntityType;
    options?: TransformationOptions;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if providers are supported
    if (!TransformerFactory.isProviderSupported(config.sourceProvider)) {
      errors.push(`Source provider '${config.sourceProvider}' is not supported`);
    }

    if (!TransformerFactory.isProviderSupported(config.targetProvider)) {
      errors.push(`Target provider '${config.targetProvider}' is not supported`);
    }

    // Validate entity type
    const validEntityTypes: EntityType[] = [
      'project',
      'issue',
      'workflowState',
      'dependency',
      'label',
      'comment',
    ];

    if (!validEntityTypes.includes(config.entityType)) {
      errors.push(`Entity type '${config.entityType}' is not valid`);
    }

    // Validate options if provided
    if (config.options) {
      if (config.options.batchSize && config.options.batchSize <= 0) {
        errors.push('Batch size must be greater than 0');
      }

      if (config.options.maxRecursionDepth && config.options.maxRecursionDepth <= 0) {
        errors.push('Max recursion depth must be greater than 0');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate data before transformation
   */
  static validateTransformationData<T>(
    data: T[],
    entityType: EntityType
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Data must be an array');

      return { isValid: false, errors };
    }

    if (data.length === 0) {
      errors.push('Data array cannot be empty');
    }

    // Basic validation for each item
    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const item = data[i];

      if (!item || typeof item !== 'object') {
        errors.push(`Item at index ${i} must be an object`);
        continue;
      }

      // Entity-specific validation
      switch (entityType) {
        case 'issue':
          if (!('id' in item) || !('title' in item)) {
            errors.push(`Issue at index ${i} must have 'id' and 'title' fields`);
          }
          break;

        case 'project':
          if (!('id' in item) || !('name' in item)) {
            errors.push(`Project at index ${i} must have 'id' and 'name' fields`);
          }
          break;
        // Add more entity-specific validations as needed
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  TransformerFactory,
  TransformerRegistry,
  TransformationBenchmark,
  TransformationValidator,
  createTransformationSystem,
};
