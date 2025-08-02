/**
 * JCVD Data Transformation Interface
 * Core contracts for bidirectional data transformation between providers
 *
 * This module defines the foundational interfaces for transforming data between
 * provider-specific formats and the unified JCVD data model, enabling seamless
 * provider interoperability with lossless data conversion.
 *
 * @version 1.0.0
 * @author JCVD Software Architect Agent
 */

import type { WorkflowState, Label } from '../../database/models/schema-types.js';
import type { ProviderType } from '../types.js';

// =============================================================================
// Core Transformation Interfaces
// =============================================================================

/**
 * Generic transformer interface for bidirectional data conversion
 *
 * @template TSource - Source data type (provider-specific format)
 * @template TTarget - Target data type (unified model format)
 */
export interface DataTransformer<TSource, TTarget> {
  /**
   * Transform source data to target format
   * @param source - Data in source format
   * @param context - Transformation context and metadata
   * @returns Promise resolving to transformed data
   */
  transform: (
    source: TSource,
    context: TransformationContext
  ) => Promise<TransformationResult<TTarget>>;

  /**
   * Transform target data back to source format (reverse transformation)
   * @param target - Data in target format
   * @param context - Transformation context and metadata
   * @returns Promise resolving to reverse-transformed data
   */
  reverseTransform: (
    target: TTarget,
    context: TransformationContext
  ) => Promise<TransformationResult<TSource>>;

  /**
   * Validate that source data can be transformed
   * @param source - Data to validate
   * @returns Validation result with errors if invalid
   */
  validateSource: (source: TSource) => Promise<ValidationResult>;

  /**
   * Validate that target data is correctly formatted
   * @param target - Data to validate
   * @returns Validation result with errors if invalid
   */
  validateTarget: (target: TTarget) => Promise<ValidationResult>;

  /**
   * Get transformation schema/mapping information
   * @returns Metadata about the transformation mapping
   */
  getTransformationSchema: () => TransformationSchema<TSource, TTarget>;
}

/**
 * Specialized interface for entity-specific transformers
 */
export interface EntityTransformer<TProviderEntity, TUnifiedEntity>
  extends DataTransformer<TProviderEntity, TUnifiedEntity> {
  /**
   * Entity type this transformer handles
   */
  readonly entityType: EntityType;

  /**
   * Provider type this transformer supports
   */
  readonly providerType: ProviderType;

  /**
   * Transform a batch of entities for performance optimization
   * @param sources - Array of source entities
   * @param context - Transformation context
   * @returns Promise resolving to batch transformation results
   */
  transformBatch: (
    sources: TProviderEntity[],
    context: TransformationContext
  ) => Promise<BatchTransformationResult<TUnifiedEntity>>;

  /**
   * Reverse transform a batch of entities
   * @param targets - Array of target entities
   * @param context - Transformation context
   * @returns Promise resolving to batch reverse transformation results
   */
  reverseTransformBatch: (
    targets: TUnifiedEntity[],
    context: TransformationContext
  ) => Promise<BatchTransformationResult<TProviderEntity>>;
}

// =============================================================================
// Field Mapping and Transformation Types
// =============================================================================

/**
 * Supported entity types for transformation
 */
export type EntityType = 'project' | 'issue' | 'workflowState' | 'dependency' | 'label' | 'comment';

/**
 * Field mapping strategies for different transformation patterns
 */
export type FieldMappingStrategy =
  | 'identity' // Direct field-to-field mapping
  | 'computed' // Derive field from multiple source fields
  | 'conditional' // Field mapping based on conditions
  | 'lookup' // Map values using lookup tables
  | 'custom'; // Custom transformation function

/**
 * Field mapping definition for individual fields
 */
export interface FieldMapping<TSource = any, TTarget = any> {
  /** Source field path (dot notation supported for nested objects) */
  sourceField?: string | string[];
  /** Target field path */
  targetField: string;
  /** Mapping strategy */
  strategy: FieldMappingStrategy;
  /** Required field (transformation fails if missing) */
  required: boolean;
  /** Default value if source field is missing */
  defaultValue?: TTarget;
  /** Type conversion information */
  typeConversion?: TypeConversion;
  /** Conditional mapping rules */
  conditions?: FieldCondition<TSource>[];
  /** Custom transformation function */
  transform?: (source: TSource, context: TransformationContext) => TTarget | Promise<TTarget>;
  /** Reverse transformation function */
  reverseTransform?: (
    target: TTarget,
    context: TransformationContext
  ) => TSource | Promise<TSource>;
  /** Field validation rules */
  validation?: FieldValidation<TTarget>;
}

/**
 * Type conversion configuration
 */
export interface TypeConversion {
  /** Source data type */
  sourceType: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  /** Target data type */
  targetType: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  /** Conversion options */
  options?: {
    dateFormat?: string;
    numberBase?: number;
    booleanTrueValues?: any[];
    objectKeyMapping?: Record<string, string>;
  };
}

/**
 * Conditional field mapping rules
 */
export interface FieldCondition<TSource = any> {
  /** Field to check for condition */
  field: string;
  /** Comparison operator */
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'exists'
    | 'not_exists'
    | 'greater_than'
    | 'less_than';
  /** Value to compare against */
  value?: any;
  /** Mapping to use if condition is true */
  mapping: Partial<FieldMapping<TSource>>;
}

/**
 * Field validation rules
 */
export interface FieldValidation<T = any> {
  /** Field is required */
  required?: boolean;
  /** Minimum value/length */
  min?: number;
  /** Maximum value/length */
  max?: number;
  /** Regular expression pattern */
  pattern?: RegExp;
  /** Allowed values (enum) */
  allowedValues?: T[];
  /** Custom validation function */
  custom?: (value: T) => boolean | string;
}

/**
 * Complete transformation schema for an entity type
 */
export interface TransformationSchema<TSource = any, TTarget = any> {
  /** Entity type being transformed */
  entityType: EntityType;
  /** Provider type */
  providerType: ProviderType;
  /** Schema version for evolution tracking */
  version: string;
  /** Field mappings */
  fieldMappings: FieldMapping<TSource, TTarget>[];
  /** Provider-specific metadata preservation */
  metadataMapping?: {
    /** Source fields to preserve in metadata */
    preserveFields: string[];
    /** Custom metadata extraction function */
    extractMetadata?: (source: TSource) => Record<string, any>;
    /** Custom metadata restoration function */
    restoreMetadata?: (target: TTarget, metadata: Record<string, any>) => TSource;
  };
  /** Relationship mappings for complex entities */
  relationshipMappings?: RelationshipMapping[];
  /** Transformation constraints and validation */
  constraints?: TransformationConstraint[];
}

/**
 * Relationship mapping for connected entities
 */
export interface RelationshipMapping {
  /** Relationship type */
  type: 'parent_child' | 'many_to_many' | 'one_to_many' | 'dependency' | 'reference';
  /** Source relationship field/structure */
  sourceRelationship: string | RelationshipStructure;
  /** Target relationship field/structure */
  targetRelationship: string | RelationshipStructure;
  /** Related entity transformer */
  relatedEntityTransformer?: string; // Reference to transformer ID
}

/**
 * Relationship structure definition
 */
export interface RelationshipStructure {
  /** Primary key field */
  primaryKey: string;
  /** Foreign key field */
  foreignKey: string;
  /** Junction table for many-to-many */
  junctionTable?: string;
  /** Additional fields to map */
  additionalFields?: string[];
}

/**
 * Transformation constraints and validation rules
 */
export interface TransformationConstraint {
  /** Constraint type */
  type: 'uniqueness' | 'foreign_key' | 'hierarchy' | 'business_rule' | 'data_integrity';
  /** Field(s) the constraint applies to */
  fields: string[];
  /** Constraint validation function */
  validate: (entity: any, context: TransformationContext) => boolean | string;
  /** Error message if constraint fails */
  errorMessage: string;
  /** Constraint severity */
  severity: 'error' | 'warning' | 'info';
}

// =============================================================================
// Transformation Context and Results
// =============================================================================

/**
 * Transformation context providing necessary metadata and utilities
 */
export interface TransformationContext {
  /** Source provider type */
  sourceProvider: ProviderType;
  /** Target provider type */
  targetProvider: ProviderType;
  /** Transformation direction */
  direction: 'to_unified' | 'from_unified';
  /** Project context */
  projectContext?: {
    projectId: string;
    workflowStates: WorkflowState[];
    labels: Label[];
    customFields: Record<string, any>;
  };
  /** User context */
  userContext?: {
    userId?: string;
    timezone?: string;
    locale?: string;
  };
  /** Transformation options */
  options: TransformationOptions;
  /** Cache for lookup data */
  cache: Map<string, any>;
  /** Logger for transformation events */
  logger?: TransformationLogger;
}

/**
 * Transformation options and configuration
 */
export interface TransformationOptions {
  /** Skip validation for performance */
  skipValidation: boolean;
  /** Preserve unknown fields in metadata */
  preserveUnknownFields: boolean;
  /** Fail on first error vs collect all errors */
  failFast: boolean;
  /** Maximum recursion depth for nested objects */
  maxRecursionDepth: number;
  /** Batch size for bulk operations */
  batchSize: number;
  /** Enable performance metrics collection */
  collectMetrics: boolean;
  /** Custom field mappings override */
  customMappings?: Record<string, FieldMapping>;
}

/**
 * Transformation result with success/failure information
 */
export interface TransformationResult<T> {
  /** Transformation succeeded */
  success: boolean;
  /** Transformed data (if successful) */
  data?: T;
  /** Transformation errors */
  errors: TransformationError[];
  /** Transformation warnings */
  warnings: TransformationWarning[];
  /** Preserved metadata */
  metadata?: Record<string, any>;
  /** Transformation metrics */
  metrics?: TransformationMetrics;
}

/**
 * Batch transformation result
 */
export interface BatchTransformationResult<T> {
  /** Overall success status */
  success: boolean;
  /** Successfully transformed entities */
  successful: T[];
  /** Failed transformations with errors */
  failed: {
    sourceData: any;
    errors: TransformationError[];
  }[];
  /** Batch warnings */
  warnings: TransformationWarning[];
  /** Batch metrics */
  metrics: BatchTransformationMetrics;
}

/**
 * Transformation error details
 */
export interface TransformationError {
  /** Error code for programmatic handling */
  code: TransformationErrorCode;
  /** Human-readable error message */
  message: string;
  /** Field that caused the error */
  field?: string;
  /** Source value that caused error */
  sourceValue?: any;
  /** Expected value or format */
  expectedValue?: any;
  /** Error context and debug information */
  context?: {
    entityType: EntityType;
    entityId?: string;
    transformationStep: string;
    stackTrace?: string;
  };
  /** Suggested fix for the error */
  suggestedFix?: string;
  /** Whether error is recoverable */
  recoverable: boolean;
}

/**
 * Transformation warning details
 */
export interface TransformationWarning {
  /** Warning code */
  code: string;
  /** Warning message */
  message: string;
  /** Field that triggered warning */
  field?: string;
  /** Warning severity */
  severity: 'low' | 'medium' | 'high';
  /** Recommendation for addressing warning */
  recommendation?: string;
}

/**
 * Transformation error codes
 */
export type TransformationErrorCode =
  | 'FIELD_MAPPING_FAILED'
  | 'TYPE_CONVERSION_FAILED'
  | 'VALIDATION_FAILED'
  | 'CONSTRAINT_VIOLATION'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_FIELD_VALUE'
  | 'RELATIONSHIP_MAPPING_FAILED'
  | 'CIRCULAR_REFERENCE'
  | 'METADATA_EXTRACTION_FAILED'
  | 'CUSTOM_TRANSFORM_FAILED'
  | 'SCHEMA_VERSION_MISMATCH'
  | 'BATCH_PROCESSING_ERROR'
  | 'TRANSFORMATION_ENGINE_ERROR';

/**
 * Validation result
 */
export interface ValidationResult {
  /** Validation passed */
  isValid: boolean;
  /** Validation errors */
  errors: TransformationError[];
  /** Validation warnings */
  warnings: TransformationWarning[];
  /** Validation score (0-1) */
  score: number;
}

/**
 * Transformation performance metrics
 */
export interface TransformationMetrics {
  /** Start time */
  startTime: Date;
  /** End time */
  endTime: Date;
  /** Duration in milliseconds */
  duration: number;
  /** Memory usage in MB */
  memoryUsage: number;
  /** Number of fields transformed */
  fieldsTransformed: number;
  /** Number of relationships processed */
  relationshipsProcessed: number;
  /** Cache hit rate */
  cacheHitRate?: number;
}

/**
 * Batch transformation metrics
 */
export interface BatchTransformationMetrics extends TransformationMetrics {
  /** Total entities processed */
  totalEntities: number;
  /** Successfully processed entities */
  successfulEntities: number;
  /** Failed entities */
  failedEntities: number;
  /** Average processing time per entity */
  averageProcessingTime: number;
}

/**
 * Transformation logger interface
 */
export interface TransformationLogger {
  debug: (message: string, context?: any) => void;
  info: (message: string, context?: any) => void;
  warn: (message: string, context?: any) => void;
  error: (message: string, error?: Error, context?: any) => void;
  metric: (name: string, value: number, tags?: Record<string, string>) => void;
}

// =============================================================================
// Provider-Specific Transformer Interfaces
// =============================================================================

/**
 * Base interface for provider-specific transformers
 */
export interface ProviderTransformerBase {
  /** Provider type */
  readonly providerType: ProviderType;
  /** Supported entity types */
  readonly supportedEntities: EntityType[];
  /** Transformer version */
  readonly version: string;

  /**
   * Initialize transformer with provider-specific configuration
   */
  initialize: (config: any) => Promise<void>;

  /**
   * Get transformer for specific entity type
   */
  getEntityTransformer: <TProvider, TUnified>(
    entityType: EntityType
  ) => EntityTransformer<TProvider, TUnified>;

  /**
   * Validate provider data format
   */
  validateProviderData: (entityType: EntityType, data: any) => Promise<ValidationResult>;

  /**
   * Get provider-specific metadata
   */
  getProviderMetadata: () => ProviderTransformerMetadata;
}

/**
 * Provider transformer metadata
 */
export interface ProviderTransformerMetadata {
  /** Provider name */
  name: string;
  /** Provider version */
  version: string;
  /** Supported features */
  supportedFeatures: {
    supportsHierarchy: boolean;
    supportsDependencies: boolean;
    supportsCustomFields: boolean;
    supportsLabels: boolean;
    supportsComments: boolean;
  };
  /** Field mapping schemas for each entity type */
  schemas: Record<EntityType, TransformationSchema>;
  /** Performance characteristics */
  performance: {
    averageTransformTime: number;
    memoryUsageProfile: 'low' | 'medium' | 'high';
    batchSizeRecommendation: number;
  };
}

// =============================================================================
// Transformation Engine Interface
// =============================================================================

/**
 * Central transformation engine coordinating all transformations
 */
export interface TransformationEngine {
  /**
   * Register a provider transformer
   */
  registerTransformer: (transformer: ProviderTransformerBase) => void;

  /**
   * Transform data between two providers
   */
  transform: <TSource, TTarget>(
    sourceData: TSource[],
    sourceProvider: ProviderType,
    targetProvider: ProviderType,
    entityType: EntityType,
    context?: Partial<TransformationContext>
  ) => Promise<BatchTransformationResult<TTarget>>;

  /**
   * Get transformation schema for provider pair
   */
  getTransformationSchema: (
    sourceProvider: ProviderType,
    targetProvider: ProviderType,
    entityType: EntityType
  ) => Promise<TransformationSchema>;

  /**
   * Validate transformation compatibility
   */
  validateCompatibility: (
    sourceProvider: ProviderType,
    targetProvider: ProviderType
  ) => Promise<CompatibilityResult>;

  /**
   * Get transformation statistics and metrics
   */
  getTransformationStats: () => TransformationStatistics;
}

/**
 * Provider compatibility assessment
 */
export interface CompatibilityResult {
  /** Providers are compatible */
  compatible: boolean;
  /** Compatibility score (0-1) */
  score: number;
  /** Supported entity types */
  supportedEntities: EntityType[];
  /** Unsupported features */
  unsupportedFeatures: string[];
  /** Transformation limitations */
  limitations: string[];
  /** Recommended migration strategy */
  migrationStrategy?: 'direct' | 'staged' | 'manual';
}

/**
 * Transformation engine statistics
 */
export interface TransformationStatistics {
  /** Total transformations performed */
  totalTransformations: number;
  /** Successful transformations */
  successfulTransformations: number;
  /** Failed transformations */
  failedTransformations: number;
  /** Average transformation time */
  averageTransformationTime: number;
  /** Performance metrics by provider */
  providerMetrics: Record<
    ProviderType,
    {
      transformations: number;
      averageTime: number;
      errorRate: number;
    }
  >;
  /** Most common transformation errors */
  commonErrors: {
    code: TransformationErrorCode;
    count: number;
    percentage: number;
  }[];
}
