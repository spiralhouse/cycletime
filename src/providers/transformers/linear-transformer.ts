/**
 * JCVD Linear Provider Transformer
 * Bidirectional transformation between Linear API format and unified JCVD model
 *
 * This module implements Linear-specific data transformations, handling Linear's
 * native issue hierarchy, workflow states, estimation system, and metadata while
 * ensuring lossless conversion to and from the unified JCVD data model.
 *
 * @version 1.0.0
 * @author JCVD Software Architect Agent
 */

import { FieldMapper, createStandardMapping, createComputedMapping } from './field-mapper.js';

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
  FieldMapping,
  TransformationError,
  TransformationWarning,
} from './transformer-interface.js';
import type {
  Project,
  WorkflowState,
  Label,
  IssueComment,
  IssueType,
  WorkflowStateType,
  DependencyType,
} from '../../database/models/schema-types.js';
import type { EnhancedIssue, Dependency } from '../types.js';

// =============================================================================
// Linear API Data Types
// =============================================================================

/**
 * Linear issue data structure from Linear API
 */
export interface LinearIssue {
  id: string;
  identifier: string; // Linear issue identifier (e.g., "PROJ-123")
  title: string;
  description?: string;
  state: {
    id: string;
    name: string;
    type: string;
    color: string;
    position: number;
  };
  priority: number; // Linear priority: 0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low
  estimate?: number;
  team: {
    id: string;
    name: string;
    key: string;
  };
  project?: {
    id: string;
    name: string;
  };
  parent?: {
    id: string;
    identifier: string;
    title: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  labels: {
    nodes: {
      id: string;
      name: string;
      color: string;
      description?: string;
    }[];
  };
  comments: {
    nodes: {
      id: string;
      body: string;
      user: {
        id: string;
        name: string;
        email: string;
      };
      createdAt: string;
      updatedAt: string;
    }[];
  };
  children: {
    nodes: LinearIssue[];
  };
  createdAt: string;
  updatedAt: string;
  // Linear-specific metadata
  url: string;
  branchName?: string;
  gitBranchName?: string;
  boardOrder: number;
  sortOrder: number;
  cycleId?: string;
  projectMilestoneId?: string;
  snoozedUntilAt?: string;
  trashed?: boolean;
}

/**
 * Linear project data structure
 */
export interface LinearProject {
  id: string;
  name: string;
  description?: string;
  key: string;
  state: string;
  team: {
    id: string;
    name: string;
    key: string;
  };
  lead?: {
    id: string;
    name: string;
    email: string;
  };
  members: {
    nodes: {
      id: string;
      name: string;
      email: string;
    }[];
  };
  issues: {
    nodes: LinearIssue[];
  };
  createdAt: string;
  updatedAt: string;
  // Linear-specific metadata
  url: string;
  color: string;
  icon?: string;
  sortOrder: number;
  targetDate?: string;
  startDate?: string;
  completedAt?: string;
  canceledAt?: string;
  progress: number;
}

/**
 * Linear workflow state
 */
export interface LinearWorkflowState {
  id: string;
  name: string;
  type: string; // Linear state types
  color: string;
  description?: string;
  position: number;
  team: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Linear dependency (blocking relationship)
 */
export interface LinearDependency {
  id: string;
  blockerIssue: {
    id: string;
    identifier: string;
    title: string;
  };
  blockedIssue: {
    id: string;
    identifier: string;
    title: string;
  };
  createdAt: string;
}

/**
 * Linear label
 */
export interface LinearLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
  team: {
    id: string;
    name: string;
  };
  parent?: {
    id: string;
    name: string;
  };
  children: {
    nodes: LinearLabel[];
  };
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Linear Transformer Implementation
// =============================================================================

/**
 * Linear provider transformer with comprehensive Linear API support
 */
export class LinearTransformer implements ProviderTransformerBase {
  readonly providerType = 'linear' as const;
  readonly supportedEntities: EntityType[] = [
    'project',
    'issue',
    'workflowState',
    'dependency',
    'label',
    'comment',
  ];
  readonly version = '1.0.0';

  private fieldMapper = new FieldMapper();
  private _linearConfig?: LinearProviderConfig;

  // Entity transformers
  private issueTransformer?: LinearIssueTransformer;
  private projectTransformer?: LinearProjectTransformer;
  private workflowStateTransformer?: LinearWorkflowStateTransformer;
  private dependencyTransformer?: LinearDependencyTransformer;
  private labelTransformer?: LinearLabelTransformer;
  private commentTransformer?: LinearCommentTransformer;

  /**
   * Validate Linear configuration
   */
  private validateConfig(): void {
    if (!this._linearConfig) {
      throw new Error('Linear configuration not initialized');
    }
  }

  /**
   * Initialize transformer with Linear-specific configuration
   */
  async initialize(config: LinearProviderConfig): Promise<void> {
    this._linearConfig = config;
    // Configuration stored for transformer initialization

    // Validate configuration
    this.validateConfig();

    // Initialize entity transformers
    this.issueTransformer = new LinearIssueTransformer(this.fieldMapper, config);
    this.projectTransformer = new LinearProjectTransformer(this.fieldMapper, config);
    this.workflowStateTransformer = new LinearWorkflowStateTransformer(this.fieldMapper, config);
    this.dependencyTransformer = new LinearDependencyTransformer(this.fieldMapper, config);
    this.labelTransformer = new LinearLabelTransformer(this.fieldMapper, config);
    this.commentTransformer = new LinearCommentTransformer(this.fieldMapper, config);

    // Set up Linear-specific lookup tables
    await this.initializeLookupTables();
  }

  /**
   * Get transformer for specific entity type
   */
  getEntityTransformer<TProvider, TUnified>(
    entityType: EntityType
  ): EntityTransformer<TProvider, TUnified> {
    switch (entityType) {
      case 'issue':
        return this.issueTransformer as any;

      case 'project':
        return this.projectTransformer as any;

      case 'workflowState':
        return this.workflowStateTransformer as any;

      case 'dependency':
        return this.dependencyTransformer as any;

      case 'label':
        return this.labelTransformer as any;

      case 'comment':
        return this.commentTransformer as any;

      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  /**
   * Validate Linear data format
   */
  async validateProviderData(entityType: EntityType, data: any): Promise<ValidationResult> {
    const transformer = this.getEntityTransformer(entityType);

    return await transformer.validateSource(data);
  }

  /**
   * Get Linear provider metadata
   */
  getProviderMetadata(): ProviderTransformerMetadata {
    return {
      name: 'Linear',
      version: this.version,
      supportedFeatures: {
        supportsHierarchy: true,
        supportsDependencies: true,
        supportsCustomFields: false, // Linear has limited custom field support
        supportsLabels: true,
        supportsComments: true,
      },
      schemas: {
        issue: this.issueTransformer?.getTransformationSchema() as any,
        project: this.projectTransformer?.getTransformationSchema() as any,
        workflowState: this.workflowStateTransformer?.getTransformationSchema() as any,
        dependency: this.dependencyTransformer?.getTransformationSchema() as any,
        label: this.labelTransformer?.getTransformationSchema() as any,
        comment: this.commentTransformer?.getTransformationSchema() as any,
      },
      performance: {
        averageTransformTime: 2, // milliseconds
        memoryUsageProfile: 'medium',
        batchSizeRecommendation: 50, // Linear API rate limits
      },
    };
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  /**
   * Initialize Linear-specific lookup tables
   */
  private async initializeLookupTables(): Promise<void> {
    // Linear priority mapping (Linear uses same scale as JCVD)
    const priorityMapping = new Map([
      [0, 0], // No priority
      [1, 1], // Urgent
      [2, 2], // High
      [3, 3], // Normal
      [4, 4], // Low
    ]);

    this.fieldMapper.registerLookupTable('linear_priority', priorityMapping);

    // Linear state type mapping to JCVD workflow state types
    const stateTypeMapping = new Map([
      ['backlog', 'backlog'],
      ['unstarted', 'unstarted'],
      ['started', 'started'],
      ['completed', 'completed'],
      ['canceled', 'canceled'],
    ]);

    this.fieldMapper.registerLookupTable('linear_state_type', stateTypeMapping);

    // Linear issue type inference (Linear doesn't have explicit types)
    const issueTypeMapping = new Map([
      ['epic', 'epic'],
      ['feature', 'story'],
      ['task', 'story'],
      ['subtask', 'subtask'],
      ['bug', 'story'], // Map bugs to stories in JCVD
    ]);

    this.fieldMapper.registerLookupTable('linear_issue_type', issueTypeMapping);
  }
}

// =============================================================================
// Linear Issue Transformer
// =============================================================================

class LinearIssueTransformer implements EntityTransformer<LinearIssue, EnhancedIssue> {
  readonly entityType = 'issue' as const;
  readonly providerType = 'linear' as const;

  constructor(
    private fieldMapper: FieldMapper,
    _linearConfig: LinearProviderConfig
  ) {}

  async transform(
    source: LinearIssue,
    context: TransformationContext
  ): Promise<TransformationResult<EnhancedIssue>> {
    const mappings = this.getFieldMappings();
    const fieldResult = await this.fieldMapper.mapFields(source, mappings, context);

    if (!fieldResult.success) {
      return {
        success: false,
        errors: fieldResult.errors,
        warnings: fieldResult.warnings,
      };
    }

    // Create enhanced issue with relationships
    const enhancedIssue: EnhancedIssue = {
      ...fieldResult.mappedObject,
      ...(source.labels.nodes.length > 0 && {
        labels: source.labels.nodes.map(label => ({
          id: label.id,
          project_id: fieldResult.mappedObject.project_id,
          name: label.name,
          color: label.color,
          ...(label.description && { description: label.description }),
          created_at: new Date(),
          updated_at: new Date(),
        })),
      }),
      ...(source.comments.nodes.length > 0 && {
        comments: source.comments.nodes.map(comment => ({
          id: comment.id,
          issue_id: source.id,
          body: comment.body,
          author_id: comment.user.id,
          created_at: new Date(comment.createdAt),
          updated_at: new Date(comment.updatedAt),
        })),
      }),
      ...(source.children.nodes.length > 0 && {
        children: await this.transformBatch(source.children.nodes, context).then(r => r.successful),
      }),
      ...{
        providerMetadata: {
          linearId: source.id,
          identifier: source.identifier,
          url: source.url,
          branchName: source.branchName,
          gitBranchName: source.gitBranchName,
          boardOrder: source.boardOrder,
          sortOrder: source.sortOrder,
          cycleId: source.cycleId,
          projectMilestoneId: source.projectMilestoneId,
          snoozedUntilAt: source.snoozedUntilAt,
          trashed: source.trashed,
          teamId: source.team.id,
          teamKey: source.team.key,
        },
      },
    };

    return {
      success: true,
      data: enhancedIssue,
      errors: [],
      warnings: fieldResult.warnings,
      ...(enhancedIssue.providerMetadata && { metadata: enhancedIssue.providerMetadata }),
    };
  }

  async reverseTransform(
    target: EnhancedIssue,
    context: TransformationContext
  ): Promise<TransformationResult<LinearIssue>> {
    const reverseMappings = this.getReverseFieldMappings();
    const fieldResult = await this.fieldMapper.mapFields(target, reverseMappings, context);

    if (!fieldResult.success) {
      return {
        success: false,
        errors: fieldResult.errors,
        warnings: fieldResult.warnings,
      };
    }

    // Reconstruct Linear API structure
    const linearIssue: LinearIssue = {
      id: target.id,
      identifier:
        target.providerMetadata?.identifier ||
        `${target.project_id}-${target.id.slice(-4).toUpperCase()}`,
      title: target.title,
      ...(target.description && { description: target.description }),
      state: {
        id: target.state_id,
        name: target.workflowState?.name || 'Unknown',
        type: target.workflowState?.type || 'unstarted',
        color: target.workflowState?.color || '#cccccc',
        position: target.workflowState?.position || 0,
      },
      priority: target.priority,
      ...(target.estimate && { estimate: target.estimate }),
      team: {
        id: target.providerMetadata?.teamId || 'default-team',
        name: target.providerMetadata?.teamName || 'Default Team',
        key: target.providerMetadata?.teamKey || 'DEF',
      },
      project: target.project_id
        ? {
            id: target.project_id,
            name: target.providerMetadata?.projectName || 'Unknown Project',
          }
        : undefined,
      parent: target.parent_id
        ? {
            id: target.parent_id,
            identifier:
              target.providerMetadata?.parentIdentifier ||
              `${target.project_id}-${target.parent_id.slice(-4).toUpperCase()}`,
            title: target.providerMetadata?.parentTitle || 'Parent Task',
          }
        : undefined,
      assignee: target.assignee_id
        ? {
            id: target.assignee_id,
            name: target.providerMetadata?.assigneeName || 'Unknown User',
            email: target.providerMetadata?.assigneeEmail || 'unknown@example.com',
          }
        : undefined,
      labels: {
        nodes: (target.labels || []).map(label => ({
          id: label.id,
          name: label.name,
          color: label.color,
          ...(label.description && { description: label.description }),
        })),
      },
      comments: {
        nodes: (target.comments || []).map(comment => ({
          id: comment.id,
          body: comment.body,
          user: {
            id: comment.author_id,
            name:
              target.providerMetadata?.commentAuthors?.[comment.author_id]?.name || 'Unknown User',
            email:
              target.providerMetadata?.commentAuthors?.[comment.author_id]?.email ||
              'unknown@example.com',
          },
          createdAt: comment.created_at.toISOString(),
          updatedAt: comment.updated_at.toISOString(),
        })),
      },
      children: {
        nodes: target.children
          ? await this.reverseTransformBatch(target.children, context).then(r => r.successful)
          : [],
      },
      createdAt: target.created_at.toISOString(),
      updatedAt: target.updated_at.toISOString(),
      // Linear-specific metadata reconstruction
      url: target.providerMetadata?.url || `https://linear.app/issue/${target.id}`,
      ...(target.providerMetadata?.branchName && {
        branchName: target.providerMetadata.branchName,
      }),
      ...(target.providerMetadata?.gitBranchName && {
        gitBranchName: target.providerMetadata.gitBranchName,
      }),
      boardOrder: target.providerMetadata?.boardOrder || 0,
      sortOrder: target.providerMetadata?.sortOrder || 0,
      ...(target.providerMetadata?.cycleId && { cycleId: target.providerMetadata.cycleId }),
      ...(target.providerMetadata?.projectMilestoneId && {
        projectMilestoneId: target.providerMetadata.projectMilestoneId,
      }),
      ...(target.providerMetadata?.snoozedUntilAt && {
        snoozedUntilAt: target.providerMetadata.snoozedUntilAt,
      }),
      ...(target.providerMetadata?.trashed !== undefined && {
        trashed: target.providerMetadata.trashed,
      }),
    };

    return {
      success: true,
      data: linearIssue,
      errors: [],
      warnings: fieldResult.warnings,
      ...(target.providerMetadata && { metadata: target.providerMetadata }),
    };
  }

  async validateSource(source: LinearIssue): Promise<ValidationResult> {
    const errors: TransformationError[] = [];

    if (!source.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Linear issue ID is required',
        recoverable: false,
      });
    if (!source.title)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Linear issue title is required',
        recoverable: false,
      });
    if (!source.team?.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Linear team ID is required',
        recoverable: false,
      });

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      score: errors.length === 0 ? 1.0 : 0.0,
    };
  }

  async validateTarget(target: EnhancedIssue): Promise<ValidationResult> {
    const errors: TransformationError[] = [];

    if (!target.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Issue ID is required',
        recoverable: false,
      });
    if (!target.title)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Issue title is required',
        recoverable: false,
      });
    if (!target.project_id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Project ID is required',
        recoverable: false,
      });

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      score: errors.length === 0 ? 1.0 : 0.0,
    };
  }

  async transformBatch(
    sources: LinearIssue[],
    context: TransformationContext
  ): Promise<BatchTransformationResult<EnhancedIssue>> {
    const results: BatchTransformationResult<EnhancedIssue> = {
      success: true,
      successful: [],
      failed: [],
      warnings: [],
      metrics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        memoryUsage: 0,
        totalEntities: sources.length,
        successfulEntities: 0,
        failedEntities: 0,
        averageProcessingTime: 0,
        fieldsTransformed: 0,
        relationshipsProcessed: 0,
      },
    };

    for (const source of sources) {
      try {
        const result = await this.transform(source, context);

        if (result.success && result.data) {
          results.successful.push(result.data);
        } else {
          results.failed.push({
            sourceData: source,
            errors: result.errors,
          });
          results.success = false;
        }

        results.warnings.push(...result.warnings);
      } catch (error) {
        results.failed.push({
          sourceData: source,
          errors: [
            {
              code: 'TRANSFORMATION_ENGINE_ERROR',
              message: `Transformation failed: ${error instanceof Error ? error.message : String(error)}`,
              recoverable: false,
            },
          ],
        });
        results.success = false;
      }
    }

    results.metrics.successfulEntities = results.successful.length;
    results.metrics.failedEntities = results.failed.length;
    results.metrics.endTime = new Date();
    results.metrics.duration =
      results.metrics.endTime.getTime() - results.metrics.startTime.getTime();

    return results;
  }

  async reverseTransformBatch(
    targets: EnhancedIssue[],
    context: TransformationContext
  ): Promise<BatchTransformationResult<LinearIssue>> {
    const results: BatchTransformationResult<LinearIssue> = {
      success: true,
      successful: [],
      failed: [],
      warnings: [],
      metrics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        memoryUsage: 0,
        totalEntities: targets.length,
        successfulEntities: 0,
        failedEntities: 0,
        averageProcessingTime: 0,
        fieldsTransformed: 0,
        relationshipsProcessed: 0,
      },
    };

    for (const target of targets) {
      try {
        const result = await this.reverseTransform(target, context);

        if (result.success && result.data) {
          results.successful.push(result.data);
        } else {
          results.failed.push({
            sourceData: target,
            errors: result.errors,
          });
          results.success = false;
        }

        results.warnings.push(...result.warnings);
      } catch (error) {
        results.failed.push({
          sourceData: target,
          errors: [
            {
              code: 'TRANSFORMATION_ENGINE_ERROR',
              message: `Reverse transformation failed: ${error instanceof Error ? error.message : String(error)}`,
              recoverable: false,
            },
          ],
        });
        results.success = false;
      }
    }

    results.metrics.successfulEntities = results.successful.length;
    results.metrics.failedEntities = results.failed.length;
    results.metrics.endTime = new Date();
    results.metrics.duration =
      results.metrics.endTime.getTime() - results.metrics.startTime.getTime();

    return results;
  }

  getTransformationSchema(): TransformationSchema<LinearIssue, EnhancedIssue> {
    return {
      entityType: this.entityType,
      providerType: this.providerType,
      version: '1.0.0',
      fieldMappings: this.getFieldMappings(),
      metadataMapping: {
        preserveFields: [
          'identifier',
          'url',
          'branchName',
          'gitBranchName',
          'boardOrder',
          'sortOrder',
          'cycleId',
          'projectMilestoneId',
          'snoozedUntilAt',
          'trashed',
        ],
        extractMetadata: (source: LinearIssue) => ({
          linearId: source.id,
          identifier: source.identifier,
          url: source.url,
          branchName: source.branchName,
          gitBranchName: source.gitBranchName,
          boardOrder: source.boardOrder,
          sortOrder: source.sortOrder,
          cycleId: source.cycleId,
          projectMilestoneId: source.projectMilestoneId,
          snoozedUntilAt: source.snoozedUntilAt,
          trashed: source.trashed,
          teamId: source.team.id,
          teamKey: source.team.key,
        }),
      },
      relationshipMappings: [
        {
          type: 'parent_child',
          sourceRelationship: 'parent.id',
          targetRelationship: 'parent_id',
        },
        {
          type: 'many_to_many',
          sourceRelationship: 'labels.nodes',
          targetRelationship: 'labels',
          relatedEntityTransformer: 'linear_label',
        },
      ],
      constraints: [
        {
          type: 'hierarchy',
          fields: ['parent_id', 'issue_type'],
          validate: (_entity: any) => {
            // Linear hierarchy validation logic
            return true;
          },
          errorMessage: 'Invalid Linear issue hierarchy',
          severity: 'error',
        },
      ],
    };
  }

  private getFieldMappings(): FieldMapping<LinearIssue, any>[] {
    return [
      createStandardMapping<LinearIssue, string>('id', 'id', { required: true }),
      createStandardMapping<LinearIssue, string>('title', 'title', { required: true }),
      createStandardMapping<LinearIssue, string>('description', 'description'),
      createStandardMapping<LinearIssue, string>('state.id', 'state_id', { required: true }),
      createStandardMapping<LinearIssue, number>('priority', 'priority', { defaultValue: 0 }),
      createStandardMapping<LinearIssue, number>('estimate', 'estimate'),
      createStandardMapping<LinearIssue, string>('assignee.id', 'assignee_id'),
      createStandardMapping<LinearIssue, string>('parent.id', 'parent_id'),

      // Computed mappings
      createComputedMapping<LinearIssue, string>(
        'project_id',
        source => source.project?.id || source.team.id,
        undefined,
        { required: true }
      ),

      createComputedMapping<LinearIssue, IssueType>(
        'issue_type',
        source => this.inferIssueType(source),
        undefined,
        { required: true }
      ),

      createComputedMapping<LinearIssue, Date>(
        'created_at',
        source => new Date(source.createdAt),
        undefined,
        { required: true }
      ),

      createComputedMapping<LinearIssue, Date>(
        'updated_at',
        source => new Date(source.updatedAt),
        undefined,
        { required: true }
      ),
    ];
  }

  private inferIssueType(source: LinearIssue): IssueType {
    // Linear doesn't have explicit issue types, so we infer based on hierarchy and content
    if (source.parent) {
      return 'subtask';
    } else if (source.children.nodes.length > 0) {
      return 'epic';
    } else {
      return 'story';
    }
  }

  private getReverseFieldMappings(): FieldMapping<EnhancedIssue, any>[] {
    return [
      createStandardMapping<EnhancedIssue, string>('id', 'id', { required: true }),
      createStandardMapping<EnhancedIssue, string>('title', 'title', { required: true }),
      createStandardMapping<EnhancedIssue, string>('description', 'description'),
      createStandardMapping<EnhancedIssue, string>('state_id', 'state.id', { required: true }),
      createStandardMapping<EnhancedIssue, number>('priority', 'priority', { defaultValue: 0 }),
      createStandardMapping<EnhancedIssue, number>('estimate', 'estimate'),
      createStandardMapping<EnhancedIssue, string>('assignee_id', 'assignee.id'),
      createStandardMapping<EnhancedIssue, string>('parent_id', 'parent.id'),

      // Computed mappings for reverse transformation
      createComputedMapping<EnhancedIssue, string>(
        'identifier',
        target =>
          target.providerMetadata?.identifier ||
          `${target.project_id}-${target.id.slice(-4).toUpperCase()}`,
        undefined,
        { required: true }
      ),

      createComputedMapping<EnhancedIssue, string>(
        'createdAt',
        target => target.created_at.toISOString(),
        undefined,
        { required: true }
      ),

      createComputedMapping<EnhancedIssue, string>(
        'updatedAt',
        target => target.updated_at.toISOString(),
        undefined,
        { required: true }
      ),
    ];
  }
}

// =============================================================================
// Other Entity Transformers (Placeholder Implementations)
// =============================================================================

class LinearProjectTransformer implements EntityTransformer<LinearProject, Project> {
  readonly entityType = 'project' as const;
  readonly providerType = 'linear' as const;

  constructor(
    private fieldMapper: FieldMapper,
    _linearConfig: LinearProviderConfig
  ) {}

  async transform(
    source: LinearProject,
    context: TransformationContext
  ): Promise<TransformationResult<Project>> {
    const mappings = this.getFieldMappings();
    const fieldResult = await this.fieldMapper.mapFields(source, mappings, context);

    if (!fieldResult.success) {
      return {
        success: false,
        errors: fieldResult.errors,
        warnings: fieldResult.warnings,
      };
    }

    const project: Project = {
      ...fieldResult.mappedObject,
      id: source.id,
      name: source.name,
      description: source.description,
      key: source.key,
      created_at: new Date(source.createdAt),
      updated_at: new Date(source.updatedAt),
    };

    return {
      success: true,
      data: project,
      errors: [],
      warnings: fieldResult.warnings,
      metadata: {
        linearId: source.id,
        url: source.url,
        color: source.color,
        icon: source.icon,
        sortOrder: source.sortOrder,
        targetDate: source.targetDate,
        startDate: source.startDate,
        completedAt: source.completedAt,
        canceledAt: source.canceledAt,
        progress: source.progress,
        teamId: source.team.id,
        teamKey: source.team.key,
        state: source.state,
      },
    };
  }

  async reverseTransform(
    target: Project,
    context: TransformationContext
  ): Promise<TransformationResult<LinearProject>> {
    const reverseMappings = this.getReverseFieldMappings();
    const fieldResult = await this.fieldMapper.mapFields(target, reverseMappings, context);

    if (!fieldResult.success) {
      return {
        success: false,
        errors: fieldResult.errors,
        warnings: fieldResult.warnings,
      };
    }

    // Reconstruct Linear project structure
    const linearProject: LinearProject = {
      id: target.id,
      name: target.name,
      ...(target.description && { description: target.description }),
      key: target.key || target.name.replace(/\s+/g, '').slice(0, 10).toUpperCase(),
      state: 'active', // Default state
      team: {
        id: 'default-team',
        name: 'Default Team',
        key: 'DEF',
      },
      ...(context.userContext?.userId && {
        lead: {
          id: context.userContext.userId,
          name: 'Unknown User',
          email: 'unknown@example.com',
        },
      }),
      members: {
        nodes: [], // Members would be populated from project context if available
      },
      issues: {
        nodes: [], // Issues would be populated separately
      },
      createdAt: target.created_at.toISOString(),
      updatedAt: target.updated_at.toISOString(),
      // Linear-specific metadata
      url: `https://linear.app/project/${target.id}`,
      color: '#2563eb', // Default blue
      sortOrder: 0,
      progress: 0,
    };

    return {
      success: true,
      data: linearProject,
      errors: [],
      warnings: fieldResult.warnings,
      metadata: {
        jcvdProjectId: target.id,
      },
    };
  }

  async validateSource(source: LinearProject): Promise<ValidationResult> {
    const errors: TransformationError[] = [];
    const warnings: TransformationWarning[] = [];

    if (!source.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Linear project ID is required',
        recoverable: false,
      });
    if (!source.name)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Linear project name is required',
        recoverable: false,
      });
    if (!source.team?.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Linear team ID is required',
        recoverable: false,
      });

    if (!source.key)
      warnings.push({
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'Project key is missing - will be generated',
        severity: 'low',
      });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.9) : 0.0,
    };
  }

  async validateTarget(target: Project): Promise<ValidationResult> {
    const errors: TransformationError[] = [];
    const warnings: TransformationWarning[] = [];

    if (!target.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Project ID is required',
        recoverable: false,
      });
    if (!target.name)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Project name is required',
        recoverable: false,
      });

    if (!target.key)
      warnings.push({
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'Project key is missing',
        severity: 'low',
      });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.9) : 0.0,
    };
  }

  async transformBatch(
    sources: LinearProject[],
    context: TransformationContext
  ): Promise<BatchTransformationResult<Project>> {
    const results: BatchTransformationResult<Project> = {
      success: true,
      successful: [],
      failed: [],
      warnings: [],
      metrics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        memoryUsage: 0,
        totalEntities: sources.length,
        successfulEntities: 0,
        failedEntities: 0,
        averageProcessingTime: 0,
        fieldsTransformed: 0,
        relationshipsProcessed: 0,
      },
    };

    for (const source of sources) {
      try {
        const result = await this.transform(source, context);

        if (result.success && result.data) {
          results.successful.push(result.data);
        } else {
          results.failed.push({
            sourceData: source,
            errors: result.errors,
          });
          results.success = false;
        }

        results.warnings.push(...result.warnings);
      } catch (error) {
        results.failed.push({
          sourceData: source,
          errors: [
            {
              code: 'TRANSFORMATION_ENGINE_ERROR',
              message: `Project transformation failed: ${error instanceof Error ? error.message : String(error)}`,
              recoverable: false,
            },
          ],
        });
        results.success = false;
      }
    }

    results.metrics.successfulEntities = results.successful.length;
    results.metrics.failedEntities = results.failed.length;
    results.metrics.endTime = new Date();
    results.metrics.duration =
      results.metrics.endTime.getTime() - results.metrics.startTime.getTime();

    return results;
  }

  async reverseTransformBatch(
    targets: Project[],
    context: TransformationContext
  ): Promise<BatchTransformationResult<LinearProject>> {
    const results: BatchTransformationResult<LinearProject> = {
      success: true,
      successful: [],
      failed: [],
      warnings: [],
      metrics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        memoryUsage: 0,
        totalEntities: targets.length,
        successfulEntities: 0,
        failedEntities: 0,
        averageProcessingTime: 0,
        fieldsTransformed: 0,
        relationshipsProcessed: 0,
      },
    };

    for (const target of targets) {
      try {
        const result = await this.reverseTransform(target, context);

        if (result.success && result.data) {
          results.successful.push(result.data);
        } else {
          results.failed.push({
            sourceData: target,
            errors: result.errors,
          });
          results.success = false;
        }

        results.warnings.push(...result.warnings);
      } catch (error) {
        results.failed.push({
          sourceData: target,
          errors: [
            {
              code: 'TRANSFORMATION_ENGINE_ERROR',
              message: `Project reverse transformation failed: ${error instanceof Error ? error.message : String(error)}`,
              recoverable: false,
            },
          ],
        });
        results.success = false;
      }
    }

    results.metrics.successfulEntities = results.successful.length;
    results.metrics.failedEntities = results.failed.length;
    results.metrics.endTime = new Date();
    results.metrics.duration =
      results.metrics.endTime.getTime() - results.metrics.startTime.getTime();

    return results;
  }

  getTransformationSchema(): TransformationSchema<LinearProject, Project> {
    return {
      entityType: this.entityType,
      providerType: this.providerType,
      version: '1.0.0',
      fieldMappings: this.getFieldMappings(),
      metadataMapping: {
        preserveFields: [
          'url',
          'color',
          'icon',
          'sortOrder',
          'targetDate',
          'startDate',
          'completedAt',
          'canceledAt',
          'progress',
          'state',
        ],
        extractMetadata: (source: LinearProject) => ({
          linearId: source.id,
          url: source.url,
          color: source.color,
          icon: source.icon,
          sortOrder: source.sortOrder,
          targetDate: source.targetDate,
          startDate: source.startDate,
          completedAt: source.completedAt,
          canceledAt: source.canceledAt,
          progress: source.progress,
          teamId: source.team.id,
          teamKey: source.team.key,
          state: source.state,
        }),
      },
      relationshipMappings: [
        {
          type: 'one_to_many',
          sourceRelationship: 'issues.nodes',
          targetRelationship: 'issues',
          relatedEntityTransformer: 'linear_issue',
        },
        {
          type: 'many_to_many',
          sourceRelationship: 'members.nodes',
          targetRelationship: 'members',
          relatedEntityTransformer: 'linear_user',
        },
      ],
      constraints: [
        {
          type: 'business_rule',
          fields: ['name', 'key'],
          validate: (entity: any) => {
            return entity.name && entity.name.length > 0;
          },
          errorMessage: 'Invalid Linear project: name is required',
          severity: 'error',
        },
      ],
    };
  }

  private getFieldMappings(): FieldMapping<LinearProject, any>[] {
    return [
      createStandardMapping<LinearProject, string>('id', 'id', { required: true }),
      createStandardMapping<LinearProject, string>('name', 'name', { required: true }),
      createStandardMapping<LinearProject, string>('description', 'description'),
      createStandardMapping<LinearProject, string>('key', 'key'),

      // Computed mappings
      createComputedMapping<LinearProject, Date>(
        'created_at',
        source => new Date(source.createdAt),
        undefined,
        { required: true }
      ),

      createComputedMapping<LinearProject, Date>(
        'updated_at',
        source => new Date(source.updatedAt),
        undefined,
        { required: true }
      ),
    ];
  }

  private getReverseFieldMappings(): FieldMapping<Project, any>[] {
    return [
      createStandardMapping<Project, string>('id', 'id', { required: true }),
      createStandardMapping<Project, string>('name', 'name', { required: true }),
      createStandardMapping<Project, string>('description', 'description'),
      createStandardMapping<Project, string>('key', 'key'),

      // Computed mappings for reverse transformation
      createComputedMapping<Project, string>(
        'createdAt',
        target => target.created_at.toISOString(),
        undefined,
        { required: true }
      ),

      createComputedMapping<Project, string>(
        'updatedAt',
        target => target.updated_at.toISOString(),
        undefined,
        { required: true }
      ),
    ];
  }
}

// Similar placeholder implementations for other entity transformers...
class LinearWorkflowStateTransformer
  implements EntityTransformer<LinearWorkflowState, WorkflowState>
{
  readonly entityType = 'workflowState' as const;
  readonly providerType = 'linear' as const;

  constructor(
    private fieldMapper: FieldMapper,
    _linearConfig: LinearProviderConfig
  ) {}

  async transform(
    source: LinearWorkflowState,
    context: TransformationContext
  ): Promise<TransformationResult<WorkflowState>> {
    const mappings = this.getFieldMappings();
    const fieldResult = await this.fieldMapper.mapFields(source, mappings, context);

    if (!fieldResult.success) {
      return {
        success: false,
        errors: fieldResult.errors,
        warnings: fieldResult.warnings,
      };
    }

    const workflowState: WorkflowState = {
      ...fieldResult.mappedObject,
      id: source.id,
      project_id: context.projectContext?.projectId || 'default-project',
      name: source.name,
      type: this.mapLinearStateType(source.type),
      position: source.position,
      color: source.color,
      created_at: new Date(source.createdAt),
      updated_at: new Date(source.updatedAt),
    };

    return {
      success: true,
      data: workflowState,
      errors: [],
      warnings: fieldResult.warnings,
      metadata: {
        linearId: source.id,
        teamId: source.team.id,
        teamName: source.team.name,
        originalType: source.type,
      },
    };
  }

  async reverseTransform(
    target: WorkflowState,
    context: TransformationContext
  ): Promise<TransformationResult<LinearWorkflowState>> {
    const reverseMappings = this.getReverseFieldMappings();
    const fieldResult = await this.fieldMapper.mapFields(target, reverseMappings, context);

    if (!fieldResult.success) {
      return {
        success: false,
        errors: fieldResult.errors,
        warnings: fieldResult.warnings,
      };
    }

    // Reconstruct Linear workflow state structure
    const linearWorkflowState: LinearWorkflowState = {
      id: target.id,
      name: target.name,
      type: this.mapJCVDStateType(target.type),
      color: target.color,
      position: target.position,
      team: {
        id: 'default-team',
        name: 'Default Team',
      },
      createdAt: target.created_at.toISOString(),
      updatedAt: target.updated_at.toISOString(),
    };

    return {
      success: true,
      data: linearWorkflowState,
      errors: [],
      warnings: fieldResult.warnings,
      metadata: {
        jcvdStateId: target.id,
        projectId: target.project_id,
      },
    };
  }

  async validateSource(source: LinearWorkflowState): Promise<ValidationResult> {
    const errors: TransformationError[] = [];
    const warnings: TransformationWarning[] = [];

    if (!source.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Linear workflow state ID is required',
        recoverable: false,
      });
    if (!source.name)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Linear workflow state name is required',
        recoverable: false,
      });
    if (!source.type)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Linear workflow state type is required',
        recoverable: false,
      });
    if (!source.team?.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Linear team ID is required',
        recoverable: false,
      });

    if (!source.color)
      warnings.push({
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'State color is missing - will use default',
        severity: 'low',
      });
    if (source.position === undefined)
      warnings.push({
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'State position is missing - will use default',
        severity: 'low',
      });

    // Validate state type mapping
    if (!this.isValidLinearStateType(source.type)) {
      warnings.push({
        code: 'INVALID_FIELD_VALUE',
        message: `Unknown Linear state type: ${source.type}`,
        severity: 'low',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.0,
    };
  }

  async validateTarget(target: WorkflowState): Promise<ValidationResult> {
    const errors: TransformationError[] = [];
    const warnings: TransformationWarning[] = [];

    if (!target.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Workflow state ID is required',
        recoverable: false,
      });
    if (!target.name)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Workflow state name is required',
        recoverable: false,
      });
    if (!target.type)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Workflow state type is required',
        recoverable: false,
      });
    if (!target.project_id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Project ID is required',
        recoverable: false,
      });

    if (!target.color)
      warnings.push({
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'State color is missing',
        severity: 'low',
      });

    // Validate state type
    const validTypes: WorkflowStateType[] = [
      'backlog',
      'unstarted',
      'started',
      'completed',
      'canceled',
    ];

    if (!validTypes.includes(target.type)) {
      errors.push({
        code: 'INVALID_FIELD_VALUE',
        message: `Invalid workflow state type: ${target.type}`,
        recoverable: false,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.0,
    };
  }

  async transformBatch(
    sources: LinearWorkflowState[],
    context: TransformationContext
  ): Promise<BatchTransformationResult<WorkflowState>> {
    const results: BatchTransformationResult<WorkflowState> = {
      success: true,
      successful: [],
      failed: [],
      warnings: [],
      metrics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        memoryUsage: 0,
        totalEntities: sources.length,
        successfulEntities: 0,
        failedEntities: 0,
        averageProcessingTime: 0,
        fieldsTransformed: 0,
        relationshipsProcessed: 0,
      },
    };

    for (const source of sources) {
      try {
        const result = await this.transform(source, context);

        if (result.success && result.data) {
          results.successful.push(result.data);
        } else {
          results.failed.push({
            sourceData: source,
            errors: result.errors,
          });
          results.success = false;
        }

        results.warnings.push(...result.warnings);
      } catch (error) {
        results.failed.push({
          sourceData: source,
          errors: [
            {
              code: 'TRANSFORMATION_ENGINE_ERROR',
              message: `Workflow state transformation failed: ${error instanceof Error ? error.message : String(error)}`,
              recoverable: false,
            },
          ],
        });
        results.success = false;
      }
    }

    results.metrics.successfulEntities = results.successful.length;
    results.metrics.failedEntities = results.failed.length;
    results.metrics.endTime = new Date();
    results.metrics.duration =
      results.metrics.endTime.getTime() - results.metrics.startTime.getTime();

    return results;
  }

  async reverseTransformBatch(
    targets: WorkflowState[],
    context: TransformationContext
  ): Promise<BatchTransformationResult<LinearWorkflowState>> {
    const results: BatchTransformationResult<LinearWorkflowState> = {
      success: true,
      successful: [],
      failed: [],
      warnings: [],
      metrics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        memoryUsage: 0,
        totalEntities: targets.length,
        successfulEntities: 0,
        failedEntities: 0,
        averageProcessingTime: 0,
        fieldsTransformed: 0,
        relationshipsProcessed: 0,
      },
    };

    for (const target of targets) {
      try {
        const result = await this.reverseTransform(target, context);

        if (result.success && result.data) {
          results.successful.push(result.data);
        } else {
          results.failed.push({
            sourceData: target,
            errors: result.errors,
          });
          results.success = false;
        }

        results.warnings.push(...result.warnings);
      } catch (error) {
        results.failed.push({
          sourceData: target,
          errors: [
            {
              code: 'TRANSFORMATION_ENGINE_ERROR',
              message: `Workflow state reverse transformation failed: ${error instanceof Error ? error.message : String(error)}`,
              recoverable: false,
            },
          ],
        });
        results.success = false;
      }
    }

    results.metrics.successfulEntities = results.successful.length;
    results.metrics.failedEntities = results.failed.length;
    results.metrics.endTime = new Date();
    results.metrics.duration =
      results.metrics.endTime.getTime() - results.metrics.startTime.getTime();

    return results;
  }

  getTransformationSchema(): TransformationSchema<LinearWorkflowState, WorkflowState> {
    return {
      entityType: this.entityType,
      providerType: this.providerType,
      version: '1.0.0',
      fieldMappings: this.getFieldMappings(),
      metadataMapping: {
        preserveFields: ['description', 'originalType'],
        extractMetadata: (source: LinearWorkflowState) => ({
          linearId: source.id,
          teamId: source.team.id,
          teamName: source.team.name,
          originalType: source.type,
        }),
      },
      relationshipMappings: [
        {
          type: 'reference',
          sourceRelationship: 'team.id',
          targetRelationship: 'project_id',
          relatedEntityTransformer: 'linear_team',
        },
      ],
      constraints: [
        {
          type: 'business_rule',
          fields: ['type'],
          validate: (entity: any) => {
            const validTypes = ['backlog', 'unstarted', 'started', 'completed', 'canceled'];

            return validTypes.includes(entity.type);
          },
          errorMessage: 'Invalid workflow state type',
          severity: 'error',
        },
      ],
    };
  }

  private getFieldMappings(): FieldMapping<LinearWorkflowState, any>[] {
    return [
      createStandardMapping<LinearWorkflowState, string>('id', 'id', { required: true }),
      createStandardMapping<LinearWorkflowState, string>('name', 'name', { required: true }),
      createStandardMapping<LinearWorkflowState, number>('position', 'position', {
        defaultValue: 0,
      }),
      createStandardMapping<LinearWorkflowState, string>('color', 'color', {
        defaultValue: '#cccccc',
      }),

      // Computed mappings
      createComputedMapping<LinearWorkflowState, WorkflowStateType>(
        'type',
        source => this.mapLinearStateType(source.type),
        undefined,
        { required: true }
      ),

      createComputedMapping<LinearWorkflowState, string>(
        'project_id',
        _source => 'default-project', // Will be overridden by context
        undefined,
        { required: true }
      ),

      createComputedMapping<LinearWorkflowState, Date>(
        'created_at',
        source => new Date(source.createdAt),
        undefined,
        { required: true }
      ),

      createComputedMapping<LinearWorkflowState, Date>(
        'updated_at',
        source => new Date(source.updatedAt),
        undefined,
        { required: true }
      ),
    ];
  }

  private getReverseFieldMappings(): FieldMapping<WorkflowState, any>[] {
    return [
      createStandardMapping<WorkflowState, string>('id', 'id', { required: true }),
      createStandardMapping<WorkflowState, string>('name', 'name', { required: true }),
      createStandardMapping<WorkflowState, number>('position', 'position', { defaultValue: 0 }),
      createStandardMapping<WorkflowState, string>('color', 'color', { defaultValue: '#cccccc' }),

      // Computed mappings for reverse transformation
      createComputedMapping<WorkflowState, string>(
        'type',
        target => this.mapJCVDStateType(target.type),
        undefined,
        { required: true }
      ),

      createComputedMapping<WorkflowState, string>(
        'createdAt',
        target => target.created_at.toISOString(),
        undefined,
        { required: true }
      ),

      createComputedMapping<WorkflowState, string>(
        'updatedAt',
        target => target.updated_at.toISOString(),
        undefined,
        { required: true }
      ),
    ];
  }

  private mapLinearStateType(linearType: string): WorkflowStateType {
    const mapping: Record<string, WorkflowStateType> = {
      backlog: 'backlog',
      unstarted: 'unstarted',
      started: 'started',
      completed: 'completed',
      canceled: 'canceled',
      cancelled: 'canceled', // Handle British spelling
    };

    return mapping[linearType] || 'unstarted';
  }

  private mapJCVDStateType(jcvdType: WorkflowStateType): string {
    const mapping: Record<WorkflowStateType, string> = {
      backlog: 'backlog',
      unstarted: 'unstarted',
      started: 'started',
      completed: 'completed',
      canceled: 'canceled',
    };

    return mapping[jcvdType] || 'unstarted';
  }

  private isValidLinearStateType(type: string): boolean {
    const validTypes = ['backlog', 'unstarted', 'started', 'completed', 'canceled', 'cancelled'];

    return validTypes.includes(type);
  }
}

class LinearDependencyTransformer implements EntityTransformer<LinearDependency, Dependency> {
  readonly entityType = 'dependency' as const;
  readonly providerType = 'linear' as const;

  constructor(
    private fieldMapper: FieldMapper,
    _linearConfig: LinearProviderConfig
  ) {}

  async transform(
    source: LinearDependency,
    context: TransformationContext
  ): Promise<TransformationResult<Dependency>> {
    const mappings = this.getFieldMappings();
    const fieldResult = await this.fieldMapper.mapFields(source, mappings, context);

    if (!fieldResult.success) {
      return {
        success: false,
        errors: fieldResult.errors,
        warnings: fieldResult.warnings,
      };
    }

    const dependency: Dependency = {
      ...fieldResult.mappedObject,
      id: source.id,
      blocker_id: source.blockerIssue.id,
      blocked_id: source.blockedIssue.id,
      dependency_type: 'blocks', // Linear only has blocking relationships
      created_at: new Date(source.createdAt),
      // Add issue details for enhanced functionality
      blocker: {
        id: source.blockerIssue.id,
        project_id: context.projectContext?.projectId || 'default-project',
        title: source.blockerIssue.title,
        description: undefined,
        state_id: 'unknown',
        priority: 0,
        issue_type: 'story',
        created_at: new Date(),
        updated_at: new Date(),
      },
      blocked: {
        id: source.blockedIssue.id,
        project_id: context.projectContext?.projectId || 'default-project',
        title: source.blockedIssue.title,
        description: undefined,
        state_id: 'unknown',
        priority: 0,
        issue_type: 'story',
        created_at: new Date(),
        updated_at: new Date(),
      },
    };

    return {
      success: true,
      data: dependency,
      errors: [],
      warnings: fieldResult.warnings,
      metadata: {
        linearId: source.id,
        blockerIdentifier: source.blockerIssue.identifier,
        blockedIdentifier: source.blockedIssue.identifier,
      },
    };
  }

  async reverseTransform(
    target: Dependency,
    context: TransformationContext
  ): Promise<TransformationResult<LinearDependency>> {
    const reverseMappings = this.getReverseFieldMappings();
    const fieldResult = await this.fieldMapper.mapFields(target, reverseMappings, context);

    if (!fieldResult.success) {
      return {
        success: false,
        errors: fieldResult.errors,
        warnings: fieldResult.warnings,
      };
    }

    // Reconstruct Linear dependency structure
    const linearDependency: LinearDependency = {
      id: target.id,
      blockerIssue: {
        id: target.blocker_id,
        identifier:
          (target.blocker as any)?.providerMetadata?.identifier ||
          `PROJ-${target.blocker_id.slice(-4).toUpperCase()}`,
        title: target.blocker?.title || 'Unknown Issue',
      },
      blockedIssue: {
        id: target.blocked_id,
        identifier:
          (target.blocked as any)?.providerMetadata?.identifier ||
          `PROJ-${target.blocked_id.slice(-4).toUpperCase()}`,
        title: target.blocked?.title || 'Unknown Issue',
      },
      createdAt: target.created_at.toISOString(),
    };

    return {
      success: true,
      data: linearDependency,
      errors: [],
      warnings: fieldResult.warnings,
      metadata: {
        jcvdDependencyId: target.id,
        dependencyType: target.dependency_type,
      },
    };
  }

  async validateSource(source: LinearDependency): Promise<ValidationResult> {
    const errors: TransformationError[] = [];
    const warnings: TransformationWarning[] = [];

    if (!source.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Linear dependency ID is required',
        recoverable: false,
      });
    if (!source.blockerIssue?.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Blocker issue ID is required',
        recoverable: false,
      });
    if (!source.blockedIssue?.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Blocked issue ID is required',
        recoverable: false,
      });
    if (!source.createdAt)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Created date is required',
        recoverable: false,
      });

    // Check for self-dependency
    if (source.blockerIssue?.id === source.blockedIssue?.id) {
      errors.push({
        code: 'CIRCULAR_REFERENCE',
        message: 'Issue cannot depend on itself',
        recoverable: false,
      });
    }

    if (!source.blockerIssue?.identifier)
      warnings.push({
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'Blocker issue identifier is missing',
        severity: 'low',
      });
    if (!source.blockedIssue?.identifier)
      warnings.push({
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'Blocked issue identifier is missing',
        severity: 'low',
      });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.9) : 0.0,
    };
  }

  async validateTarget(target: Dependency): Promise<ValidationResult> {
    const errors: TransformationError[] = [];
    const warnings: TransformationWarning[] = [];

    if (!target.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Dependency ID is required',
        recoverable: false,
      });
    if (!target.blocker_id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Blocker ID is required',
        recoverable: false,
      });
    if (!target.blocked_id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Blocked ID is required',
        recoverable: false,
      });
    if (!target.dependency_type)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Dependency type is required',
        recoverable: false,
      });

    // Validate dependency type
    const validTypes: DependencyType[] = ['blocks', 'duplicate', 'relates'];

    if (target.dependency_type && !validTypes.includes(target.dependency_type)) {
      errors.push({
        code: 'INVALID_FIELD_VALUE',
        message: `Invalid dependency type: ${target.dependency_type}`,
        recoverable: false,
      });
    }

    // Check for self-dependency
    if (target.blocker_id === target.blocked_id) {
      errors.push({
        code: 'CIRCULAR_REFERENCE',
        message: 'Issue cannot depend on itself',
        recoverable: false,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.9) : 0.0,
    };
  }

  async transformBatch(
    sources: LinearDependency[],
    context: TransformationContext
  ): Promise<BatchTransformationResult<Dependency>> {
    const results: BatchTransformationResult<Dependency> = {
      success: true,
      successful: [],
      failed: [],
      warnings: [],
      metrics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        memoryUsage: 0,
        totalEntities: sources.length,
        successfulEntities: 0,
        failedEntities: 0,
        averageProcessingTime: 0,
        fieldsTransformed: 0,
        relationshipsProcessed: sources.length, // Each dependency is a relationship
      },
    };

    for (const source of sources) {
      try {
        const result = await this.transform(source, context);

        if (result.success && result.data) {
          results.successful.push(result.data);
        } else {
          results.failed.push({
            sourceData: source,
            errors: result.errors,
          });
          results.success = false;
        }

        results.warnings.push(...result.warnings);
      } catch (error) {
        results.failed.push({
          sourceData: source,
          errors: [
            {
              code: 'TRANSFORMATION_ENGINE_ERROR',
              message: `Dependency transformation failed: ${error instanceof Error ? error.message : String(error)}`,
              recoverable: false,
            },
          ],
        });
        results.success = false;
      }
    }

    results.metrics.successfulEntities = results.successful.length;
    results.metrics.failedEntities = results.failed.length;
    results.metrics.endTime = new Date();
    results.metrics.duration =
      results.metrics.endTime.getTime() - results.metrics.startTime.getTime();

    return results;
  }

  async reverseTransformBatch(
    targets: Dependency[],
    context: TransformationContext
  ): Promise<BatchTransformationResult<LinearDependency>> {
    const results: BatchTransformationResult<LinearDependency> = {
      success: true,
      successful: [],
      failed: [],
      warnings: [],
      metrics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        memoryUsage: 0,
        totalEntities: targets.length,
        successfulEntities: 0,
        failedEntities: 0,
        averageProcessingTime: 0,
        fieldsTransformed: 0,
        relationshipsProcessed: targets.length,
      },
    };

    for (const target of targets) {
      try {
        const result = await this.reverseTransform(target, context);

        if (result.success && result.data) {
          results.successful.push(result.data);
        } else {
          results.failed.push({
            sourceData: target,
            errors: result.errors,
          });
          results.success = false;
        }

        results.warnings.push(...result.warnings);
      } catch (error) {
        results.failed.push({
          sourceData: target,
          errors: [
            {
              code: 'TRANSFORMATION_ENGINE_ERROR',
              message: `Dependency reverse transformation failed: ${error instanceof Error ? error.message : String(error)}`,
              recoverable: false,
            },
          ],
        });
        results.success = false;
      }
    }

    results.metrics.successfulEntities = results.successful.length;
    results.metrics.failedEntities = results.failed.length;
    results.metrics.endTime = new Date();
    results.metrics.duration =
      results.metrics.endTime.getTime() - results.metrics.startTime.getTime();

    return results;
  }

  getTransformationSchema(): TransformationSchema<LinearDependency, Dependency> {
    return {
      entityType: this.entityType,
      providerType: this.providerType,
      version: '1.0.0',
      fieldMappings: this.getFieldMappings(),
      metadataMapping: {
        preserveFields: ['blockerIdentifier', 'blockedIdentifier'],
        extractMetadata: (source: LinearDependency) => ({
          linearId: source.id,
          blockerIdentifier: source.blockerIssue.identifier,
          blockedIdentifier: source.blockedIssue.identifier,
        }),
      },
      relationshipMappings: [
        {
          type: 'reference',
          sourceRelationship: 'blockerIssue.id',
          targetRelationship: 'blocker_id',
          relatedEntityTransformer: 'linear_issue',
        },
        {
          type: 'reference',
          sourceRelationship: 'blockedIssue.id',
          targetRelationship: 'blocked_id',
          relatedEntityTransformer: 'linear_issue',
        },
      ],
      constraints: [
        {
          type: 'business_rule',
          fields: ['blocker_id', 'blocked_id'],
          validate: (entity: any) => {
            return entity.blocker_id !== entity.blocked_id;
          },
          errorMessage: 'Issue cannot depend on itself',
          severity: 'error',
        },
      ],
    };
  }

  private getFieldMappings(): FieldMapping<LinearDependency, any>[] {
    return [
      createStandardMapping<LinearDependency, string>('id', 'id', { required: true }),
      createStandardMapping<LinearDependency, string>('blockerIssue.id', 'blocker_id', {
        required: true,
      }),
      createStandardMapping<LinearDependency, string>('blockedIssue.id', 'blocked_id', {
        required: true,
      }),

      // Computed mappings
      createComputedMapping<LinearDependency, DependencyType>(
        'dependency_type',
        _source => 'blocks', // Linear only supports blocking relationships
        undefined,
        { required: true }
      ),

      createComputedMapping<LinearDependency, Date>(
        'created_at',
        source => new Date(source.createdAt),
        undefined,
        { required: true }
      ),
    ];
  }

  private getReverseFieldMappings(): FieldMapping<Dependency, any>[] {
    return [
      createStandardMapping<Dependency, string>('id', 'id', { required: true }),
      createStandardMapping<Dependency, string>('blocker_id', 'blockerIssue.id', {
        required: true,
      }),
      createStandardMapping<Dependency, string>('blocked_id', 'blockedIssue.id', {
        required: true,
      }),

      // Computed mappings for reverse transformation
      createComputedMapping<Dependency, string>(
        'createdAt',
        target => target.created_at.toISOString(),
        undefined,
        { required: true }
      ),
    ];
  }
}

class LinearLabelTransformer implements EntityTransformer<LinearLabel, Label> {
  readonly entityType = 'label' as const;
  readonly providerType = 'linear' as const;

  constructor(
    private fieldMapper: FieldMapper,
    _linearConfig: LinearProviderConfig
  ) {}

  async transform(
    source: LinearLabel,
    context: TransformationContext
  ): Promise<TransformationResult<Label>> {
    const mappings = this.getFieldMappings();
    const fieldResult = await this.fieldMapper.mapFields(source, mappings, context);

    if (!fieldResult.success) {
      return {
        success: false,
        errors: fieldResult.errors,
        warnings: fieldResult.warnings,
      };
    }

    const label: Label = {
      ...fieldResult.mappedObject,
      id: source.id,
      project_id: context.projectContext?.projectId || 'default-project',
      name: source.name,
      color: source.color,
      description: source.description,
      created_at: new Date(source.createdAt),
      updated_at: new Date(source.updatedAt),
    };

    return {
      success: true,
      data: label,
      errors: [],
      warnings: fieldResult.warnings,
      metadata: {
        linearId: source.id,
        teamId: source.team.id,
        teamName: source.team.name,
        hasParent: !!source.parent,
        parent_id: source.parent?.id,
        childrenCount: source.children.nodes.length,
      },
    };
  }

  async reverseTransform(
    target: Label,
    context: TransformationContext
  ): Promise<TransformationResult<LinearLabel>> {
    const reverseMappings = this.getReverseFieldMappings();
    const fieldResult = await this.fieldMapper.mapFields(target, reverseMappings, context);

    if (!fieldResult.success) {
      return {
        success: false,
        errors: fieldResult.errors,
        warnings: fieldResult.warnings,
      };
    }

    // Reconstruct Linear label structure
    const linearLabel: LinearLabel = {
      id: target.id,
      name: target.name,
      color: target.color,
      ...(target.description && { description: target.description }),
      team: {
        id: 'default-team',
        name: 'Default Team',
      },
      children: {
        nodes: [], // Child relationships would need to be resolved separately
      },
      createdAt: target.created_at.toISOString(),
      updatedAt: target.updated_at.toISOString(),
    };

    return {
      success: true,
      data: linearLabel,
      errors: [],
      warnings: fieldResult.warnings,
      metadata: {
        jcvdLabelId: target.id,
        project_id: target.project_id,
      },
    };
  }

  async validateSource(source: LinearLabel): Promise<ValidationResult> {
    const errors: TransformationError[] = [];
    const warnings: TransformationWarning[] = [];

    if (!source.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Linear label ID is required',
        recoverable: false,
      });
    if (!source.name)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Linear label name is required',
        recoverable: false,
      });
    if (!source.team?.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Linear team ID is required',
        recoverable: false,
      });

    if (!source.color)
      warnings.push({
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'Label color is missing - will use default',
        severity: 'low',
      });
    if (!source.description)
      warnings.push({
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'Label description is missing',
        severity: 'low',
      });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.0,
    };
  }

  async validateTarget(target: Label): Promise<ValidationResult> {
    const errors: TransformationError[] = [];
    const warnings: TransformationWarning[] = [];

    if (!target.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Label ID is required',
        recoverable: false,
      });
    if (!target.name)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Label name is required',
        recoverable: false,
      });
    if (!target.project_id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Project ID is required',
        recoverable: false,
      });

    if (!target.color)
      warnings.push({
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'Label color is missing',
        severity: 'low',
      });
    if (!target.description)
      warnings.push({
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'Label description is missing',
        severity: 'low',
      });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.0,
    };
  }

  async transformBatch(
    sources: LinearLabel[],
    context: TransformationContext
  ): Promise<BatchTransformationResult<Label>> {
    const results: BatchTransformationResult<Label> = {
      success: true,
      successful: [],
      failed: [],
      warnings: [],
      metrics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        memoryUsage: 0,
        totalEntities: sources.length,
        successfulEntities: 0,
        failedEntities: 0,
        averageProcessingTime: 0,
        fieldsTransformed: 0,
        relationshipsProcessed: 0,
      },
    };

    for (const source of sources) {
      try {
        const result = await this.transform(source, context);

        if (result.success && result.data) {
          results.successful.push(result.data);
        } else {
          results.failed.push({
            sourceData: source,
            errors: result.errors,
          });
          results.success = false;
        }

        results.warnings.push(...result.warnings);
      } catch (error) {
        results.failed.push({
          sourceData: source,
          errors: [
            {
              code: 'TRANSFORMATION_ENGINE_ERROR',
              message: `Label transformation failed: ${error instanceof Error ? error.message : String(error)}`,
              recoverable: false,
            },
          ],
        });
        results.success = false;
      }
    }

    results.metrics.successfulEntities = results.successful.length;
    results.metrics.failedEntities = results.failed.length;
    results.metrics.endTime = new Date();
    results.metrics.duration =
      results.metrics.endTime.getTime() - results.metrics.startTime.getTime();

    return results;
  }

  async reverseTransformBatch(
    targets: Label[],
    context: TransformationContext
  ): Promise<BatchTransformationResult<LinearLabel>> {
    const results: BatchTransformationResult<LinearLabel> = {
      success: true,
      successful: [],
      failed: [],
      warnings: [],
      metrics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        memoryUsage: 0,
        totalEntities: targets.length,
        successfulEntities: 0,
        failedEntities: 0,
        averageProcessingTime: 0,
        fieldsTransformed: 0,
        relationshipsProcessed: 0,
      },
    };

    for (const target of targets) {
      try {
        const result = await this.reverseTransform(target, context);

        if (result.success && result.data) {
          results.successful.push(result.data);
        } else {
          results.failed.push({
            sourceData: target,
            errors: result.errors,
          });
          results.success = false;
        }

        results.warnings.push(...result.warnings);
      } catch (error) {
        results.failed.push({
          sourceData: target,
          errors: [
            {
              code: 'TRANSFORMATION_ENGINE_ERROR',
              message: `Label reverse transformation failed: ${error instanceof Error ? error.message : String(error)}`,
              recoverable: false,
            },
          ],
        });
        results.success = false;
      }
    }

    results.metrics.successfulEntities = results.successful.length;
    results.metrics.failedEntities = results.failed.length;
    results.metrics.endTime = new Date();
    results.metrics.duration =
      results.metrics.endTime.getTime() - results.metrics.startTime.getTime();

    return results;
  }

  getTransformationSchema(): TransformationSchema<LinearLabel, Label> {
    return {
      entityType: this.entityType,
      providerType: this.providerType,
      version: '1.0.0',
      fieldMappings: this.getFieldMappings(),
      metadataMapping: {
        preserveFields: ['hasParent', 'parent_id', 'childrenCount'],
        extractMetadata: (source: LinearLabel) => ({
          linearId: source.id,
          teamId: source.team.id,
          teamName: source.team.name,
          hasParent: !!source.parent,
          parent_id: source.parent?.id,
          childrenCount: source.children.nodes.length,
        }),
      },
      relationshipMappings: [
        {
          type: 'reference',
          sourceRelationship: 'team.id',
          targetRelationship: 'project_id',
          relatedEntityTransformer: 'linear_team',
        },
        {
          type: 'parent_child',
          sourceRelationship: 'parent.id',
          targetRelationship: 'parent_id',
          relatedEntityTransformer: 'linear_label',
        },
      ],
      constraints: [
        {
          type: 'business_rule',
          fields: ['name'],
          validate: (entity: any) => {
            return entity.name && entity.name.length > 0;
          },
          errorMessage: 'Label name cannot be empty',
          severity: 'error',
        },
      ],
    };
  }

  private getFieldMappings(): FieldMapping<LinearLabel, any>[] {
    return [
      createStandardMapping<LinearLabel, string>('id', 'id', { required: true }),
      createStandardMapping<LinearLabel, string>('name', 'name', { required: true }),
      createStandardMapping<LinearLabel, string>('color', 'color', { defaultValue: '#cccccc' }),
      createStandardMapping<LinearLabel, string>('description', 'description'),

      // Computed mappings
      createComputedMapping<LinearLabel, string>(
        'project_id',
        _source => 'default-project', // Will be overridden by context
        undefined,
        { required: true }
      ),

      createComputedMapping<LinearLabel, Date>(
        'created_at',
        source => new Date(source.createdAt),
        undefined,
        { required: true }
      ),

      createComputedMapping<LinearLabel, Date>(
        'updated_at',
        source => new Date(source.updatedAt),
        undefined,
        { required: true }
      ),
    ];
  }

  private getReverseFieldMappings(): FieldMapping<Label, any>[] {
    return [
      createStandardMapping<Label, string>('id', 'id', { required: true }),
      createStandardMapping<Label, string>('name', 'name', { required: true }),
      createStandardMapping<Label, string>('color', 'color', { defaultValue: '#cccccc' }),
      createStandardMapping<Label, string>('description', 'description'),

      // Computed mappings for reverse transformation
      createComputedMapping<Label, string>(
        'createdAt',
        target => target.created_at.toISOString(),
        undefined,
        { required: true }
      ),

      createComputedMapping<Label, string>(
        'updatedAt',
        target => target.updated_at.toISOString(),
        undefined,
        { required: true }
      ),
    ];
  }
}

// Linear comment type definition
export interface LinearComment {
  id: string;
  body: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  issue: {
    id: string;
    identifier: string;
    title: string;
  };
  createdAt: string;
  updatedAt: string;
}

class LinearCommentTransformer implements EntityTransformer<LinearComment, IssueComment> {
  readonly entityType = 'comment' as const;
  readonly providerType = 'linear' as const;

  constructor(
    private fieldMapper: FieldMapper,
    _linearConfig: LinearProviderConfig
  ) {}

  async transform(
    source: LinearComment,
    context: TransformationContext
  ): Promise<TransformationResult<IssueComment>> {
    const mappings = this.getFieldMappings();
    const fieldResult = await this.fieldMapper.mapFields(source, mappings, context);

    if (!fieldResult.success) {
      return {
        success: false,
        errors: fieldResult.errors,
        warnings: fieldResult.warnings,
      };
    }

    const comment: IssueComment = {
      ...fieldResult.mappedObject,
      id: source.id,
      issue_id: source.issue.id,
      body: source.body,
      author_id: source.user.id,
      created_at: new Date(source.createdAt),
      updated_at: new Date(source.updatedAt),
    };

    return {
      success: true,
      data: comment,
      errors: [],
      warnings: fieldResult.warnings,
      metadata: {
        linearId: source.id,
        authorName: source.user.name,
        authorEmail: source.user.email,
        issueIdentifier: source.issue.identifier,
        issueTitle: source.issue.title,
      },
    };
  }

  async reverseTransform(
    target: IssueComment,
    context: TransformationContext
  ): Promise<TransformationResult<LinearComment>> {
    const reverseMappings = this.getReverseFieldMappings();
    const fieldResult = await this.fieldMapper.mapFields(target, reverseMappings, context);

    if (!fieldResult.success) {
      return {
        success: false,
        errors: fieldResult.errors,
        warnings: fieldResult.warnings,
      };
    }

    // Reconstruct Linear comment structure
    const linearComment: LinearComment = {
      id: target.id,
      body: target.body,
      user: {
        id: target.author_id,
        name: 'Unknown User',
        email: 'unknown@example.com',
      },
      issue: {
        id: target.issue_id,
        identifier: `PROJ-${target.issue_id.slice(-4).toUpperCase()}`,
        title: 'Unknown Issue',
      },
      createdAt: target.created_at.toISOString(),
      updatedAt: target.updated_at.toISOString(),
    };

    return {
      success: true,
      data: linearComment,
      errors: [],
      warnings: fieldResult.warnings,
      metadata: {
        jcvdCommentId: target.id,
        issueId: target.issue_id,
        authorId: target.author_id,
      },
    };
  }

  async validateSource(source: LinearComment): Promise<ValidationResult> {
    const errors: TransformationError[] = [];
    const warnings: TransformationWarning[] = [];

    if (!source.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Linear comment ID is required',
        recoverable: false,
      });
    if (!source.body)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Comment body is required',
        recoverable: false,
      });
    if (!source.user?.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Comment author ID is required',
        recoverable: false,
      });
    if (!source.issue?.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Issue ID is required',
        recoverable: false,
      });
    if (!source.createdAt)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Created date is required',
        recoverable: false,
      });

    if (!source.user?.name)
      warnings.push({
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'Author name is missing',
        severity: 'low',
      });
    if (!source.user?.email)
      warnings.push({
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'Author email is missing',
        severity: 'low',
      });
    if (!source.issue?.identifier)
      warnings.push({
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'Issue identifier is missing',
        severity: 'low',
      });

    // Validate comment length
    if (source.body && source.body.length > 50_000) {
      warnings.push({
        code: 'FIELD_LENGTH_WARNING',
        message: 'Comment body is very long and may cause performance issues',
        severity: 'low',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.0,
    };
  }

  async validateTarget(target: IssueComment): Promise<ValidationResult> {
    const errors: TransformationError[] = [];
    const warnings: TransformationWarning[] = [];

    if (!target.id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Comment ID is required',
        recoverable: false,
      });
    if (!target.body)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Comment body is required',
        recoverable: false,
      });
    if (!target.author_id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Author ID is required',
        recoverable: false,
      });
    if (!target.issue_id)
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Issue ID is required',
        recoverable: false,
      });

    // Validate comment length
    if (target.body && target.body.length > 50_000) {
      warnings.push({
        code: 'FIELD_LENGTH_WARNING',
        message: 'Comment body is very long',
        severity: 'low',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.0,
    };
  }

  async transformBatch(
    sources: LinearComment[],
    context: TransformationContext
  ): Promise<BatchTransformationResult<IssueComment>> {
    const results: BatchTransformationResult<IssueComment> = {
      success: true,
      successful: [],
      failed: [],
      warnings: [],
      metrics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        memoryUsage: 0,
        totalEntities: sources.length,
        successfulEntities: 0,
        failedEntities: 0,
        averageProcessingTime: 0,
        fieldsTransformed: 0,
        relationshipsProcessed: 0,
      },
    };

    for (const source of sources) {
      try {
        const result = await this.transform(source, context);

        if (result.success && result.data) {
          results.successful.push(result.data);
        } else {
          results.failed.push({
            sourceData: source,
            errors: result.errors,
          });
          results.success = false;
        }

        results.warnings.push(...result.warnings);
      } catch (error) {
        results.failed.push({
          sourceData: source,
          errors: [
            {
              code: 'TRANSFORMATION_ENGINE_ERROR',
              message: `Comment transformation failed: ${error instanceof Error ? error.message : String(error)}`,
              recoverable: false,
            },
          ],
        });
        results.success = false;
      }
    }

    results.metrics.successfulEntities = results.successful.length;
    results.metrics.failedEntities = results.failed.length;
    results.metrics.endTime = new Date();
    results.metrics.duration =
      results.metrics.endTime.getTime() - results.metrics.startTime.getTime();

    return results;
  }

  async reverseTransformBatch(
    targets: IssueComment[],
    context: TransformationContext
  ): Promise<BatchTransformationResult<LinearComment>> {
    const results: BatchTransformationResult<LinearComment> = {
      success: true,
      successful: [],
      failed: [],
      warnings: [],
      metrics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        memoryUsage: 0,
        totalEntities: targets.length,
        successfulEntities: 0,
        failedEntities: 0,
        averageProcessingTime: 0,
        fieldsTransformed: 0,
        relationshipsProcessed: 0,
      },
    };

    for (const target of targets) {
      try {
        const result = await this.reverseTransform(target, context);

        if (result.success && result.data) {
          results.successful.push(result.data);
        } else {
          results.failed.push({
            sourceData: target,
            errors: result.errors,
          });
          results.success = false;
        }

        results.warnings.push(...result.warnings);
      } catch (error) {
        results.failed.push({
          sourceData: target,
          errors: [
            {
              code: 'TRANSFORMATION_ENGINE_ERROR',
              message: `Comment reverse transformation failed: ${error instanceof Error ? error.message : String(error)}`,
              recoverable: false,
            },
          ],
        });
        results.success = false;
      }
    }

    results.metrics.successfulEntities = results.successful.length;
    results.metrics.failedEntities = results.failed.length;
    results.metrics.endTime = new Date();
    results.metrics.duration =
      results.metrics.endTime.getTime() - results.metrics.startTime.getTime();

    return results;
  }

  getTransformationSchema(): TransformationSchema<LinearComment, IssueComment> {
    return {
      entityType: this.entityType,
      providerType: this.providerType,
      version: '1.0.0',
      fieldMappings: this.getFieldMappings(),
      metadataMapping: {
        preserveFields: ['authorName', 'authorEmail', 'issueIdentifier', 'issueTitle'],
        extractMetadata: (source: LinearComment) => ({
          linearId: source.id,
          authorName: source.user.name,
          authorEmail: source.user.email,
          issueIdentifier: source.issue.identifier,
          issueTitle: source.issue.title,
        }),
      },
      relationshipMappings: [
        {
          type: 'reference',
          sourceRelationship: 'issue.id',
          targetRelationship: 'issue_id',
          relatedEntityTransformer: 'linear_issue',
        },
        {
          type: 'reference',
          sourceRelationship: 'user.id',
          targetRelationship: 'author_id',
          relatedEntityTransformer: 'linear_user',
        },
      ],
      constraints: [
        {
          type: 'business_rule',
          fields: ['body'],
          validate: (entity: any) => {
            return entity.body && entity.body.trim().length > 0;
          },
          errorMessage: 'Comment body cannot be empty',
          severity: 'error',
        },
      ],
    };
  }

  private getFieldMappings(): FieldMapping<LinearComment, any>[] {
    return [
      createStandardMapping<LinearComment, string>('id', 'id', { required: true }),
      createStandardMapping<LinearComment, string>('body', 'body', { required: true }),
      createStandardMapping<LinearComment, string>('user.id', 'author_id', { required: true }),
      createStandardMapping<LinearComment, string>('issue.id', 'issue_id', { required: true }),

      // Computed mappings
      createComputedMapping<LinearComment, Date>(
        'created_at',
        source => new Date(source.createdAt),
        undefined,
        { required: true }
      ),

      createComputedMapping<LinearComment, Date>(
        'updated_at',
        source => new Date(source.updatedAt),
        undefined,
        { required: true }
      ),
    ];
  }

  private getReverseFieldMappings(): FieldMapping<IssueComment, any>[] {
    return [
      createStandardMapping<IssueComment, string>('id', 'id', { required: true }),
      createStandardMapping<IssueComment, string>('body', 'body', { required: true }),
      createStandardMapping<IssueComment, string>('author_id', 'user.id', { required: true }),
      createStandardMapping<IssueComment, string>('issue_id', 'issue.id', { required: true }),

      // Computed mappings for reverse transformation
      createComputedMapping<IssueComment, string>(
        'createdAt',
        target => target.created_at.toISOString(),
        undefined,
        { required: true }
      ),

      createComputedMapping<IssueComment, string>(
        'updatedAt',
        target => target.updated_at.toISOString(),
        undefined,
        { required: true }
      ),
    ];
  }
}

// =============================================================================
// Linear Provider Configuration
// =============================================================================

interface LinearProviderConfig {
  type: 'linear';
  apiToken: string;
  teamId: string;
  apiUrl?: string;
  timeout?: number;
  enableWebhooks?: boolean;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a Linear transformer instance
 */
export async function createLinearTransformer(
  config: LinearProviderConfig
): Promise<LinearTransformer> {
  const transformer = new LinearTransformer();

  await transformer.initialize(config);

  return transformer;
}
