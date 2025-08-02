/**
 * JCVD Transformation Engine
 * Central orchestration system for data transformations between providers
 *
 * This module implements the core transformation engine that coordinates
 * all data transformations between different provider formats and the unified
 * JCVD data model, ensuring high performance and data integrity.
 *
 * @version 1.0.0
 * @author JCVD Software Architect Agent
 */

import type {
  TransformationEngine,
  ProviderTransformerBase,
  EntityTransformer,
  TransformationContext,
  TransformationOptions,
  BatchTransformationResult,
  TransformationSchema,
  CompatibilityResult,
  TransformationStatistics,
  EntityType,
  BatchTransformationMetrics,
  TransformationLogger,
} from './transformer-interface.js';
import type { ProviderType } from '../types.js';

// =============================================================================
// Core Transformation Engine Implementation
// =============================================================================

/**
 * High-performance transformation engine with caching and optimization
 */
export class JCVDTransformationEngine implements TransformationEngine {
  private readonly transformers = new Map<ProviderType, ProviderTransformerBase>();
  private readonly schemaCache = new Map<string, TransformationSchema>();
  private readonly compatibilityCache = new Map<string, CompatibilityResult>();
  private readonly metrics = new TransformationEngineMetrics();
  private readonly logger?: TransformationLogger;

  private readonly defaultOptions: TransformationOptions = {
    skipValidation: false,
    preserveUnknownFields: true,
    failFast: false,
    maxRecursionDepth: 10,
    batchSize: 100,
    collectMetrics: true,
    customMappings: {},
  };

  constructor(logger?: TransformationLogger) {
    if (logger) {
      this.logger = logger;
    }
  }

  /**
   * Register a provider transformer
   */
  registerTransformer(transformer: ProviderTransformerBase): void {
    this.transformers.set(transformer.providerType, transformer);
    this.logger?.info(`Registered transformer for provider: ${transformer.providerType}`, {
      version: transformer.version,
      supportedEntities: transformer.supportedEntities,
    });

    // Clear related caches
    this.clearCachesForProvider(transformer.providerType);
  }

  /**
   * Transform data between two providers with optimized batch processing
   */
  async transform<TSource, TTarget>(
    sourceData: TSource[],
    sourceProvider: ProviderType,
    targetProvider: ProviderType,
    entityType: EntityType,
    contextOptions?: Partial<TransformationContext>
  ): Promise<BatchTransformationResult<TTarget>> {
    const startTime = new Date();
    const transformationId = this.generateTransformationId();

    this.logger?.info(`Starting transformation: ${transformationId}`, {
      sourceProvider,
      targetProvider,
      entityType,
      itemCount: sourceData.length,
    });

    try {
      // Build transformation context
      const context = await this.buildTransformationContext(
        sourceProvider,
        targetProvider,
        contextOptions
      );

      // Get transformers
      const sourceTransformer = this.getTransformer(sourceProvider);
      const targetTransformer = this.getTransformer(targetProvider);

      // Get entity transformers
      const entityTransformer = sourceTransformer.getEntityTransformer<TSource, any>(entityType);
      const reverseEntityTransformer = targetTransformer.getEntityTransformer<any, TTarget>(
        entityType
      );

      // Check compatibility
      const compatibility = await this.validateCompatibility(sourceProvider, targetProvider);

      if (!compatibility.compatible) {
        throw new Error(
          `Providers ${sourceProvider} and ${targetProvider} are not compatible: ${compatibility.limitations.join(', ')}`
        );
      }

      // Transform data in batches for performance
      const result = await this.performBatchTransformation(
        sourceData,
        entityTransformer,
        reverseEntityTransformer,
        context,
        transformationId
      );

      // Collect metrics
      const endTime = new Date();

      result.metrics = this.calculateBatchMetrics(startTime, endTime, sourceData.length, result);

      this.metrics.recordTransformation(sourceProvider, targetProvider, entityType, result.metrics);

      this.logger?.info(`Completed transformation: ${transformationId}`, {
        success: result.success,
        successfulItems: result.successful.length,
        failedItems: result.failed.length,
        duration: result.metrics.duration,
      });

      return result;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger?.error(
        `Transformation failed: ${transformationId}`,
        error instanceof Error ? error : new Error(String(error)),
        {
          sourceProvider,
          targetProvider,
          entityType,
          duration,
        }
      );

      this.metrics.recordFailedTransformation(sourceProvider, targetProvider, entityType, duration);

      return {
        success: false,
        successful: [],
        failed: [
          {
            sourceData: sourceData,
            errors: [
              {
                code: 'TRANSFORMATION_ENGINE_ERROR',
                message: `Transformation engine error: ${errorMessage}`,
                recoverable: false,
                context: {
                  entityType,
                  transformationStep: 'engine_initialization',
                  ...(errorStack && { stackTrace: errorStack }),
                },
              },
            ],
          },
        ],
        warnings: [],
        metrics: {
          startTime,
          endTime,
          duration: endTime.getTime() - startTime.getTime(),
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
          totalEntities: sourceData.length,
          successfulEntities: 0,
          failedEntities: sourceData.length,
          averageProcessingTime: 0,
          fieldsTransformed: 0,
          relationshipsProcessed: 0,
        },
      };
    }
  }

  /**
   * Get transformation schema for provider pair with caching
   */
  async getTransformationSchema(
    sourceProvider: ProviderType,
    targetProvider: ProviderType,
    entityType: EntityType
  ): Promise<TransformationSchema> {
    const cacheKey = `${sourceProvider}_${targetProvider}_${entityType}`;

    // Check cache first
    if (this.schemaCache.has(cacheKey)) {
      return this.schemaCache.get(cacheKey)!;
    }

    const sourceTransformer = this.getTransformer(sourceProvider);
    const targetTransformer = this.getTransformer(targetProvider);

    const sourceEntityTransformer = sourceTransformer.getEntityTransformer(entityType);
    const targetEntityTransformer = targetTransformer.getEntityTransformer(entityType);

    // Merge schemas from both transformers
    const sourceSchema = sourceEntityTransformer.getTransformationSchema();
    const targetSchema = targetEntityTransformer.getTransformationSchema();

    const mergedSchema = this.mergeTransformationSchemas(sourceSchema, targetSchema);

    // Cache the result
    this.schemaCache.set(cacheKey, mergedSchema);

    return mergedSchema;
  }

  /**
   * Validate transformation compatibility between providers
   */
  async validateCompatibility(
    sourceProvider: ProviderType,
    targetProvider: ProviderType
  ): Promise<CompatibilityResult> {
    const cacheKey = `${sourceProvider}_${targetProvider}`;

    // Check cache first
    if (this.compatibilityCache.has(cacheKey)) {
      return this.compatibilityCache.get(cacheKey)!;
    }

    const sourceTransformer = this.getTransformer(sourceProvider);
    const targetTransformer = this.getTransformer(targetProvider);

    const sourceMetadata = sourceTransformer.getProviderMetadata();
    const targetMetadata = targetTransformer.getProviderMetadata();

    const result = this.assessCompatibility(sourceMetadata, targetMetadata);

    // Cache the result
    this.compatibilityCache.set(cacheKey, result);

    return result;
  }

  /**
   * Get transformation statistics and performance metrics
   */
  getTransformationStats(): TransformationStatistics {
    return this.metrics.getStatistics();
  }

  // =============================================================================
  // Private Implementation Methods
  // =============================================================================

  /**
   * Get transformer for provider type
   */
  private getTransformer(providerType: ProviderType): ProviderTransformerBase {
    const transformer = this.transformers.get(providerType);

    if (!transformer) {
      throw new Error(`No transformer registered for provider: ${providerType}`);
    }

    return transformer;
  }

  /**
   * Build transformation context with defaults
   */
  private async buildTransformationContext(
    sourceProvider: ProviderType,
    targetProvider: ProviderType,
    contextOptions?: Partial<TransformationContext>
  ): Promise<TransformationContext> {
    const context: TransformationContext = {
      sourceProvider,
      targetProvider,
      direction: 'to_unified',
      options: { ...this.defaultOptions, ...contextOptions?.options },
      cache: new Map(),
    };

    if (contextOptions?.projectContext) {
      context.projectContext = contextOptions.projectContext;
    }
    if (contextOptions?.userContext) {
      context.userContext = contextOptions.userContext;
    }
    if (this.logger) {
      context.logger = this.logger;
    }

    return context;
  }

  /**
   * Perform batch transformation with error handling and optimization
   */
  private async performBatchTransformation<TSource, TTarget>(
    sourceData: TSource[],
    sourceTransformer: EntityTransformer<TSource, any>,
    targetTransformer: EntityTransformer<any, TTarget>,
    context: TransformationContext,
    _transformationId: string
  ): Promise<BatchTransformationResult<TTarget>> {
    const result: BatchTransformationResult<TTarget> = {
      success: true,
      successful: [],
      failed: [],
      warnings: [],
      metrics: {} as BatchTransformationMetrics,
    };

    const batchSize = context.options.batchSize;
    const totalBatches = Math.ceil(sourceData.length / batchSize);

    this.logger?.debug(
      `Processing ${sourceData.length} items in ${totalBatches} batches of ${batchSize}`
    );

    // Process in batches to manage memory usage
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, sourceData.length);
      const batchData = sourceData.slice(batchStart, batchEnd);

      this.logger?.debug(
        `Processing batch ${batchIndex + 1}/${totalBatches}: items ${batchStart}-${batchEnd}`
      );

      try {
        // First transform from source to unified model
        const unifiedResults = await sourceTransformer.transformBatch(batchData, context);

        if (!unifiedResults.success && context.options.failFast) {
          result.failed.push(...unifiedResults.failed);
          result.warnings.push(...unifiedResults.warnings);
          result.success = false;

          return result;
        }

        // Then transform from unified model to target format
        if (unifiedResults.successful.length > 0) {
          const targetResults = await targetTransformer.reverseTransformBatch(
            unifiedResults.successful,
            {
              ...context,
              direction: 'from_unified',
            }
          );

          result.successful.push(...targetResults.successful);
          result.failed.push(...targetResults.failed);
          result.warnings.push(...targetResults.warnings);

          if (!targetResults.success) {
            result.success = false;
          }
        }

        // Add failed items from first transformation
        result.failed.push(...unifiedResults.failed);
        result.warnings.push(...unifiedResults.warnings);

        if (!unifiedResults.success) {
          result.success = false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        this.logger?.error(
          `Batch ${batchIndex + 1} failed`,
          error instanceof Error ? error : new Error(String(error))
        );

        // Add all items in this batch as failed
        for (const item of batchData) {
          result.failed.push({
            sourceData: item,
            errors: [
              {
                code: 'BATCH_PROCESSING_ERROR',
                message: `Batch processing failed: ${errorMessage}`,
                recoverable: false,
                context: {
                  entityType: sourceTransformer.entityType,
                  transformationStep: 'batch_processing',
                  ...(errorStack && { stackTrace: errorStack }),
                },
              },
            ],
          });
        }

        result.success = false;

        if (context.options.failFast) {
          break;
        }
      }
    }

    return result;
  }

  /**
   * Merge transformation schemas from source and target transformers
   */
  private mergeTransformationSchemas(
    sourceSchema: TransformationSchema,
    targetSchema: TransformationSchema
  ): TransformationSchema {
    const mergedSchema: TransformationSchema = {
      entityType: sourceSchema.entityType,
      providerType: sourceSchema.providerType,
      version: `${sourceSchema.version}_${targetSchema.version}`,
      fieldMappings: [...sourceSchema.fieldMappings, ...targetSchema.fieldMappings],
    };

    const metadataMapping = sourceSchema.metadataMapping || targetSchema.metadataMapping;

    if (metadataMapping) {
      mergedSchema.metadataMapping = metadataMapping;
    }

    const sourceRelationships = sourceSchema.relationshipMappings || [];
    const targetRelationships = targetSchema.relationshipMappings || [];

    if (sourceRelationships.length > 0 || targetRelationships.length > 0) {
      mergedSchema.relationshipMappings = [...sourceRelationships, ...targetRelationships];
    }

    const sourceConstraints = sourceSchema.constraints || [];
    const targetConstraints = targetSchema.constraints || [];

    if (sourceConstraints.length > 0 || targetConstraints.length > 0) {
      mergedSchema.constraints = [...sourceConstraints, ...targetConstraints];
    }

    return mergedSchema;
  }

  /**
   * Assess compatibility between two provider metadata
   */
  private assessCompatibility(sourceMetadata: any, targetMetadata: any): CompatibilityResult {
    const supportedEntities: EntityType[] = [];
    const unsupportedFeatures: string[] = [];
    const limitations: string[] = [];

    // Check common supported entities
    const sourceEntities = new Set(sourceMetadata.supportedEntities || []);
    const targetEntities = new Set(targetMetadata.supportedEntities || []);

    for (const entity of sourceEntities) {
      if (targetEntities.has(entity)) {
        supportedEntities.push(entity as EntityType);
      }
    }

    // Check feature compatibility
    const sourceFeatures = sourceMetadata.supportedFeatures || {};
    const targetFeatures = targetMetadata.supportedFeatures || {};

    if (sourceFeatures.supportsHierarchy && !targetFeatures.supportsHierarchy) {
      unsupportedFeatures.push('Issue hierarchy');
      limitations.push('Target provider does not support issue hierarchy');
    }

    if (sourceFeatures.supportsDependencies && !targetFeatures.supportsDependencies) {
      unsupportedFeatures.push('Issue dependencies');
      limitations.push('Target provider does not support issue dependencies');
    }

    if (sourceFeatures.supportsCustomFields && !targetFeatures.supportsCustomFields) {
      unsupportedFeatures.push('Custom fields');
      limitations.push('Target provider does not support custom fields');
    }

    // Calculate compatibility score
    const totalFeatures = Object.keys(sourceFeatures).length;
    const compatibleFeatures = Object.keys(sourceFeatures).filter(
      feature => targetFeatures[feature] === sourceFeatures[feature]
    ).length;

    const score = totalFeatures > 0 ? compatibleFeatures / totalFeatures : 1.0;
    const compatible = score >= 0.7 && supportedEntities.length > 0;

    return {
      compatible,
      score,
      supportedEntities,
      unsupportedFeatures,
      limitations,
      migrationStrategy: this.determineMigrationStrategy(score, limitations),
    };
  }

  /**
   * Determine optimal migration strategy based on compatibility
   */
  private determineMigrationStrategy(
    score: number,
    limitations: string[]
  ): 'direct' | 'staged' | 'manual' {
    if (score >= 0.9 && limitations.length === 0) {
      return 'direct';
    } else if (score >= 0.7 && limitations.length <= 2) {
      return 'staged';
    } else {
      return 'manual';
    }
  }

  /**
   * Calculate batch transformation metrics
   */
  private calculateBatchMetrics(
    startTime: Date,
    endTime: Date,
    totalEntities: number,
    result: BatchTransformationResult<any>
  ): BatchTransformationMetrics {
    const duration = endTime.getTime() - startTime.getTime();
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;

    return {
      startTime,
      endTime,
      duration,
      memoryUsage,
      totalEntities,
      successfulEntities: result.successful.length,
      failedEntities: result.failed.length,
      averageProcessingTime: totalEntities > 0 ? duration / totalEntities : 0,
      fieldsTransformed: 0, // This would be calculated by individual transformers
      relationshipsProcessed: 0, // This would be calculated by individual transformers
    };
  }

  /**
   * Generate unique transformation ID for tracking
   */
  private generateTransformationId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Clear caches related to a specific provider
   */
  private clearCachesForProvider(providerType: ProviderType): void {
    // Clear schema cache
    for (const [key] of this.schemaCache) {
      if (key.includes(providerType)) {
        this.schemaCache.delete(key);
      }
    }

    // Clear compatibility cache
    for (const [key] of this.compatibilityCache) {
      if (key.includes(providerType)) {
        this.compatibilityCache.delete(key);
      }
    }
  }
}

// =============================================================================
// Metrics Collection System
// =============================================================================

/**
 * Transformation engine metrics collector
 */
class TransformationEngineMetrics {
  private readonly providerMetrics = new Map<
    string,
    {
      transformations: number;
      totalTime: number;
      errors: number;
    }
  >();

  private readonly errorCounts = new Map<string, number>();
  private totalTransformations = 0;
  private successfulTransformations = 0;
  private failedTransformations = 0;

  recordTransformation(
    sourceProvider: ProviderType,
    targetProvider: ProviderType,
    entityType: EntityType,
    metrics: BatchTransformationMetrics
  ): void {
    const key = `${sourceProvider}_${targetProvider}_${entityType}`;
    const existing = this.providerMetrics.get(key) || {
      transformations: 0,
      totalTime: 0,
      errors: 0,
    };

    existing.transformations++;
    existing.totalTime += metrics.duration;
    existing.errors += metrics.failedEntities;

    this.providerMetrics.set(key, existing);

    this.totalTransformations++;
    if (metrics.failedEntities === 0) {
      this.successfulTransformations++;
    } else {
      this.failedTransformations++;
    }
  }

  recordFailedTransformation(
    sourceProvider: ProviderType,
    targetProvider: ProviderType,
    entityType: EntityType,
    duration: number
  ): void {
    const key = `${sourceProvider}_${targetProvider}_${entityType}`;
    const existing = this.providerMetrics.get(key) || {
      transformations: 0,
      totalTime: 0,
      errors: 0,
    };

    existing.transformations++;
    existing.totalTime += duration;
    existing.errors++;

    this.providerMetrics.set(key, existing);

    this.totalTransformations++;
    this.failedTransformations++;
  }

  recordError(errorCode: string): void {
    const existing = this.errorCounts.get(errorCode) || 0;

    this.errorCounts.set(errorCode, existing + 1);
  }

  getStatistics(): TransformationStatistics {
    const providerMetrics: Record<ProviderType, any> = {} as any;

    // Aggregate provider metrics
    for (const [key, metrics] of this.providerMetrics) {
      const [sourceProvider] = key.split('_') as [ProviderType];

      if (!providerMetrics[sourceProvider]) {
        providerMetrics[sourceProvider] = {
          transformations: 0,
          averageTime: 0,
          errorRate: 0,
        };
      }

      providerMetrics[sourceProvider].transformations += metrics.transformations;
      providerMetrics[sourceProvider].averageTime = metrics.totalTime / metrics.transformations;
      providerMetrics[sourceProvider].errorRate = metrics.errors / metrics.transformations;
    }

    // Common errors
    const commonErrors = Array.from(this.errorCounts.entries())
      .map(([code, count]) => ({
        code: code as any,
        count,
        percentage: (count / this.totalTransformations) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalTransformations: this.totalTransformations,
      successfulTransformations: this.successfulTransformations,
      failedTransformations: this.failedTransformations,
      averageTransformationTime: this.calculateAverageTime(),
      providerMetrics,
      commonErrors,
    };
  }

  private calculateAverageTime(): number {
    let totalTime = 0;
    let totalTransformations = 0;

    for (const metrics of this.providerMetrics.values()) {
      totalTime += metrics.totalTime;
      totalTransformations += metrics.transformations;
    }

    return totalTransformations > 0 ? totalTime / totalTransformations : 0;
  }
}

// =============================================================================
// Factory and Utilities
// =============================================================================

/**
 * Create a transformation engine instance with default configuration
 */
export function createTransformationEngine(
  logger?: TransformationLogger
): JCVDTransformationEngine {
  return new JCVDTransformationEngine(logger);
}

/**
 * Create a simple console logger for transformation events
 */
export function createConsoleLogger(): TransformationLogger {
  return {
    debug: (message: string, context?: any) => {
      console.debug(`[DEBUG] ${message}`, context || '');
    },
    info: (message: string, context?: any) => {
      console.info(`[INFO] ${message}`, context || '');
    },
    warn: (message: string, context?: any) => {
      console.warn(`[WARN] ${message}`, context || '');
    },
    error: (message: string, error?: Error, context?: any) => {
      console.error(`[ERROR] ${message}`, error?.message || '', context || '');
      if (error?.stack) console.error(error.stack);
    },
    metric: (name: string, value: number, tags?: Record<string, string>) => {
      console.log(`[METRIC] ${name}: ${value}`, tags || '');
    },
  };
}
