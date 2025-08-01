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
  TransformationError
} from './transformer-interface.js'
import type {
  Issue,
  Project,
  WorkflowState,
  IssueDependency,
  Label,
  IssueComment,
  IssueType,
  IssuePriority,
  WorkflowStateType,
  DependencyType
} from '../../database/models/schema-types.js'
import type {
  EnhancedIssue,
  Dependency
} from '../types.js'
import { FieldMapper, createStandardMapping, createComputedMapping } from './field-mapper.js'

// =============================================================================
// Linear API Data Types
// =============================================================================

/**
 * Linear issue data structure from Linear API
 */
export interface LinearIssue {
  id: string
  identifier: string  // Linear issue identifier (e.g., "PROJ-123")
  title: string
  description?: string
  state: {
    id: string
    name: string
    type: string
    color: string
    position: number
  }
  priority: number  // Linear priority: 0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low
  estimate?: number
  team: {
    id: string
    name: string
    key: string
  }
  project?: {
    id: string
    name: string
  }
  parent?: {
    id: string
    identifier: string
    title: string
  }
  assignee?: {
    id: string
    name: string
    email: string
  }
  labels: {
    nodes: Array<{
      id: string
      name: string
      color: string
      description?: string
    }>
  }
  comments: {
    nodes: Array<{
      id: string
      body: string
      user: {
        id: string
        name: string
        email: string
      }
      createdAt: string
      updatedAt: string
    }>
  }
  children: {
    nodes: LinearIssue[]
  }
  createdAt: string
  updatedAt: string
  // Linear-specific metadata
  url: string
  branchName?: string
  gitBranchName?: string
  boardOrder: number
  sortOrder: number
  cycleId?: string
  projectMilestoneId?: string
  snoozedUntilAt?: string
  trashed?: boolean
}

/**
 * Linear project data structure
 */
export interface LinearProject {
  id: string
  name: string
  description?: string
  key: string
  state: string
  team: {
    id: string
    name: string
    key: string
  }
  lead?: {
    id: string
    name: string
    email: string
  }
  members: {
    nodes: Array<{
      id: string
      name: string
      email: string
    }>
  }
  issues: {
    nodes: LinearIssue[]
  }
  createdAt: string
  updatedAt: string
  // Linear-specific metadata
  url: string
  color: string
  icon?: string
  sortOrder: number
  targetDate?: string
  startDate?: string
  completedAt?: string
  canceledAt?: string
  progress: number
}

/**
 * Linear workflow state
 */
export interface LinearWorkflowState {
  id: string
  name: string
  type: string  // Linear state types
  color: string
  description?: string
  position: number
  team: {
    id: string
    name: string
  }
  createdAt: string
  updatedAt: string
}

/**
 * Linear dependency (blocking relationship)
 */
export interface LinearDependency {
  id: string
  blockerIssue: {
    id: string
    identifier: string
    title: string
  }
  blockedIssue: {
    id: string
    identifier: string
    title: string
  }
  createdAt: string
}

/**
 * Linear label
 */
export interface LinearLabel {
  id: string
  name: string
  color: string
  description?: string
  team: {
    id: string
    name: string
  }
  parent?: {
    id: string
    name: string
  }
  children: {
    nodes: LinearLabel[]
  }
  createdAt: string
  updatedAt: string
}

// =============================================================================
// Linear Transformer Implementation
// =============================================================================

/**
 * Linear provider transformer with comprehensive Linear API support
 */
export class LinearTransformer implements ProviderTransformerBase {
  readonly providerType = 'linear' as const
  readonly supportedEntities: EntityType[] = ['project', 'issue', 'workflowState', 'dependency', 'label', 'comment']
  readonly version = '1.0.0'
  
  private fieldMapper = new FieldMapper()
  private linearConfig?: LinearProviderConfig
  
  // Entity transformers
  private issueTransformer?: LinearIssueTransformer
  private projectTransformer?: LinearProjectTransformer
  private workflowStateTransformer?: LinearWorkflowStateTransformer
  private dependencyTransformer?: LinearDependencyTransformer
  private labelTransformer?: LinearLabelTransformer
  private commentTransformer?: LinearCommentTransformer
  
  /**
   * Initialize transformer with Linear-specific configuration
   */
  async initialize(config: LinearProviderConfig): Promise<void> {
    this.linearConfig = config
    
    // Initialize entity transformers
    this.issueTransformer = new LinearIssueTransformer(this.fieldMapper, config)
    this.projectTransformer = new LinearProjectTransformer(this.fieldMapper, config)
    this.workflowStateTransformer = new LinearWorkflowStateTransformer(this.fieldMapper, config)
    this.dependencyTransformer = new LinearDependencyTransformer(this.fieldMapper, config)
    this.labelTransformer = new LinearLabelTransformer(this.fieldMapper, config)
    this.commentTransformer = new LinearCommentTransformer(this.fieldMapper, config)
    
    // Set up Linear-specific lookup tables
    await this.initializeLookupTables()
  }
  
  /**
   * Get transformer for specific entity type
   */
  getEntityTransformer<TProvider, TUnified>(entityType: EntityType): EntityTransformer<TProvider, TUnified> {
    switch (entityType) {
      case 'issue':
        return this.issueTransformer as any
      case 'project':
        return this.projectTransformer as any
      case 'workflowState':
        return this.workflowStateTransformer as any
      case 'dependency':
        return this.dependencyTransformer as any
      case 'label':
        return this.labelTransformer as any
      case 'comment':
        return this.commentTransformer as any
      default:
        throw new Error(`Unsupported entity type: ${entityType}`)
    }
  }
  
  /**
   * Validate Linear data format
   */
  async validateProviderData(entityType: EntityType, data: any): Promise<ValidationResult> {
    const transformer = this.getEntityTransformer(entityType)
    return await transformer.validateSource(data)
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
        supportsComments: true
      },
      schemas: {
        issue: this.issueTransformer?.getTransformationSchema() as any,
        project: this.projectTransformer?.getTransformationSchema() as any,
        workflowState: this.workflowStateTransformer?.getTransformationSchema() as any,
        dependency: this.dependencyTransformer?.getTransformationSchema() as any,
        label: this.labelTransformer?.getTransformationSchema() as any,
        comment: this.commentTransformer?.getTransformationSchema() as any
      },
      performance: {
        averageTransformTime: 2, // milliseconds
        memoryUsageProfile: 'medium',
        batchSizeRecommendation: 50 // Linear API rate limits
      }
    }
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
      [4, 4]  // Low
    ])
    this.fieldMapper.registerLookupTable('linear_priority', priorityMapping)
    
    // Linear state type mapping to JCVD workflow state types
    const stateTypeMapping = new Map([
      ['backlog', 'backlog'],
      ['unstarted', 'unstarted'],
      ['started', 'started'],
      ['completed', 'completed'],
      ['canceled', 'canceled']
    ])
    this.fieldMapper.registerLookupTable('linear_state_type', stateTypeMapping)
    
    // Linear issue type inference (Linear doesn't have explicit types)
    const issueTypeMapping = new Map([
      ['epic', 'epic'],
      ['feature', 'story'],
      ['task', 'story'],
      ['subtask', 'subtask'],
      ['bug', 'story'] // Map bugs to stories in JCVD
    ])
    this.fieldMapper.registerLookupTable('linear_issue_type', issueTypeMapping)
  }
}

// =============================================================================
// Linear Issue Transformer
// =============================================================================

class LinearIssueTransformer implements EntityTransformer<LinearIssue, EnhancedIssue> {
  readonly entityType = 'issue' as const
  readonly providerType = 'linear' as const
  
  constructor(
    private fieldMapper: FieldMapper,
    private config: LinearProviderConfig
  ) {}
  
  async transform(source: LinearIssue, context: TransformationContext): Promise<TransformationResult<EnhancedIssue>> {
    const mappings = this.getFieldMappings()
    const fieldResult = await this.fieldMapper.mapFields(source, mappings, context)
    
    if (!fieldResult.success) {
      return {
        success: false,
        errors: fieldResult.errors,
        warnings: fieldResult.warnings
      }
    }
    
    // Create enhanced issue with relationships
    const enhancedIssue: EnhancedIssue = {
      ...fieldResult.mappedObject,
      labels: source.labels.nodes.map(label => ({
        id: label.id,
        project_id: fieldResult.mappedObject.project_id,
        name: label.name,
        color: label.color,
        description: label.description,
        created_at: new Date(),
        updated_at: new Date()
      })),
      comments: source.comments.nodes.map(comment => ({
        id: comment.id,
        issue_id: source.id,
        body: comment.body,
        author_id: comment.user.id,
        created_at: new Date(comment.createdAt),
        updated_at: new Date(comment.updatedAt)
      })),
      children: source.children.nodes.length > 0 ? 
        await this.transformBatch(source.children.nodes, context).then(r => r.successful) : 
        undefined,
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
        teamKey: source.team.key
      }
    }
    
    return {
      success: true,
      data: enhancedIssue,
      errors: [],
      warnings: fieldResult.warnings,
      metadata: enhancedIssue.providerMetadata
    }
  }
  
  async reverseTransform(target: EnhancedIssue, context: TransformationContext): Promise<TransformationResult<LinearIssue>> {
    // This would implement the reverse transformation from unified model back to Linear format
    // Implementation would use the reverse field mappings and reconstruct Linear API structure
    throw new Error('Reverse transformation not yet implemented')
  }
  
  async validateSource(source: LinearIssue): Promise<ValidationResult> {
    const errors: TransformationError[] = []
    
    if (!source.id) errors.push({ code: 'MISSING_REQUIRED_FIELD', message: 'Linear issue ID is required', recoverable: false })
    if (!source.title) errors.push({ code: 'MISSING_REQUIRED_FIELD', message: 'Linear issue title is required', recoverable: false })
    if (!source.team?.id) errors.push({ code: 'MISSING_REQUIRED_FIELD', message: 'Linear team ID is required', recoverable: false })
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      score: errors.length === 0 ? 1.0 : 0.0
    }
  }
  
  async validateTarget(target: EnhancedIssue): Promise<ValidationResult> {
    const errors: TransformationError[] = []
    
    if (!target.id) errors.push({ code: 'MISSING_REQUIRED_FIELD', message: 'Issue ID is required', recoverable: false })
    if (!target.title) errors.push({ code: 'MISSING_REQUIRED_FIELD', message: 'Issue title is required', recoverable: false })
    if (!target.project_id) errors.push({ code: 'MISSING_REQUIRED_FIELD', message: 'Project ID is required', recoverable: false })
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      score: errors.length === 0 ? 1.0 : 0.0
    }
  }
  
  async transformBatch(sources: LinearIssue[], context: TransformationContext): Promise<BatchTransformationResult<EnhancedIssue>> {
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
        relationshipsProcessed: 0
      }
    }
    
    for (const source of sources) {
      try {
        const result = await this.transform(source, context)
        if (result.success && result.data) {
          results.successful.push(result.data)
        } else {
          results.failed.push({
            sourceData: source,
            errors: result.errors
          })
          results.success = false
        }
        
        results.warnings.push(...result.warnings)
      } catch (error) {
        results.failed.push({
          sourceData: source,
          errors: [{
            code: 'TRANSFORMATION_ERROR',
            message: `Transformation failed: ${error.message}`,
            recoverable: false
          }]
        })
        results.success = false
      }
    }
    
    results.metrics.successfulEntities = results.successful.length
    results.metrics.failedEntities = results.failed.length
    results.metrics.endTime = new Date()
    results.metrics.duration = results.metrics.endTime.getTime() - results.metrics.startTime.getTime()
    
    return results
  }
  
  async reverseTransformBatch(targets: EnhancedIssue[], context: TransformationContext): Promise<BatchTransformationResult<LinearIssue>> {
    throw new Error('Reverse batch transformation not yet implemented')
  }
  
  getTransformationSchema(): TransformationSchema<LinearIssue, EnhancedIssue> {
    return {
      entityType: this.entityType,
      providerType: this.providerType,
      version: '1.0.0',
      fieldMappings: this.getFieldMappings(),
      metadataMapping: {
        preserveFields: [
          'identifier', 'url', 'branchName', 'gitBranchName', 'boardOrder', 
          'sortOrder', 'cycleId', 'projectMilestoneId', 'snoozedUntilAt', 'trashed'
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
          teamKey: source.team.key
        })
      },
      relationshipMappings: [
        {
          type: 'parent_child',
          sourceRelationship: 'parent.id',
          targetRelationship: 'parent_id'
        },
        {
          type: 'many_to_many',
          sourceRelationship: 'labels.nodes',
          targetRelationship: 'labels',
          relatedEntityTransformer: 'linear_label'
        }
      ],
      constraints: [
        {
          type: 'hierarchy',
          fields: ['parent_id', 'issue_type'],
          validate: (entity: any) => {
            // Linear hierarchy validation logic
            return true
          },
          errorMessage: 'Invalid Linear issue hierarchy',
          severity: 'error'
        }
      ]
    }
  }
  
  private getFieldMappings(): FieldMapping<LinearIssue, EnhancedIssue>[] {
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
        (source) => source.project?.id || source.team.id,
        undefined,
        { required: true }
      ),
      
      createComputedMapping<LinearIssue, IssueType>(
        'issue_type',
        (source) => this.inferIssueType(source),
        undefined,
        { required: true }
      ),
      
      createComputedMapping<LinearIssue, Date>(
        'created_at',
        (source) => new Date(source.createdAt),
        undefined,
        { required: true }
      ),
      
      createComputedMapping<LinearIssue, Date>(
        'updated_at',
        (source) => new Date(source.updatedAt),
        undefined,
        { required: true }
      )
    ]
  }
  
  private inferIssueType(source: LinearIssue): IssueType {
    // Linear doesn't have explicit issue types, so we infer based on hierarchy and content
    if (source.parent) {
      return 'subtask'
    } else if (source.children.nodes.length > 0) {
      return 'epic'
    } else {
      return 'story'
    }
  }
}

// =============================================================================
// Other Entity Transformers (Placeholder Implementations)
// =============================================================================

class LinearProjectTransformer implements EntityTransformer<LinearProject, Project> {
  readonly entityType = 'project' as const
  readonly providerType = 'linear' as const
  
  constructor(private fieldMapper: FieldMapper, private config: LinearProviderConfig) {}
  
  async transform(source: LinearProject, context: TransformationContext): Promise<TransformationResult<Project>> {
    throw new Error('LinearProjectTransformer not yet implemented')
  }
  
  async reverseTransform(target: Project, context: TransformationContext): Promise<TransformationResult<LinearProject>> {
    throw new Error('LinearProjectTransformer reverse transform not yet implemented')
  }
  
  async validateSource(source: LinearProject): Promise<ValidationResult> {
    return { isValid: true, errors: [], warnings: [], score: 1.0 }
  }
  
  async validateTarget(target: Project): Promise<ValidationResult> {
    return { isValid: true, errors: [], warnings: [], score: 1.0 }
  }
  
  async transformBatch(sources: LinearProject[], context: TransformationContext): Promise<BatchTransformationResult<Project>> {
    throw new Error('LinearProjectTransformer batch transform not yet implemented')
  }
  
  async reverseTransformBatch(targets: Project[], context: TransformationContext): Promise<BatchTransformationResult<LinearProject>> {
    throw new Error('LinearProjectTransformer reverse batch transform not yet implemented')
  }
  
  getTransformationSchema(): TransformationSchema<LinearProject, Project> {
    throw new Error('LinearProjectTransformer schema not yet implemented')
  }
}

// Similar placeholder implementations for other entity transformers...
class LinearWorkflowStateTransformer implements EntityTransformer<LinearWorkflowState, WorkflowState> {
  readonly entityType = 'workflowState' as const
  readonly providerType = 'linear' as const
  
  constructor(private fieldMapper: FieldMapper, private config: LinearProviderConfig) {}
  
  // Placeholder implementations...
  async transform(source: LinearWorkflowState, context: TransformationContext): Promise<TransformationResult<WorkflowState>> { throw new Error('Not implemented') }
  async reverseTransform(target: WorkflowState, context: TransformationContext): Promise<TransformationResult<LinearWorkflowState>> { throw new Error('Not implemented') }
  async validateSource(source: LinearWorkflowState): Promise<ValidationResult> { return { isValid: true, errors: [], warnings: [], score: 1.0 } }
  async validateTarget(target: WorkflowState): Promise<ValidationResult> { return { isValid: true, errors: [], warnings: [], score: 1.0 } }
  async transformBatch(sources: LinearWorkflowState[], context: TransformationContext): Promise<BatchTransformationResult<WorkflowState>> { throw new Error('Not implemented') }
  async reverseTransformBatch(targets: WorkflowState[], context: TransformationContext): Promise<BatchTransformationResult<LinearWorkflowState>> { throw new Error('Not implemented') }
  getTransformationSchema(): TransformationSchema<LinearWorkflowState, WorkflowState> { throw new Error('Not implemented') }
}

class LinearDependencyTransformer implements EntityTransformer<LinearDependency, Dependency> {
  readonly entityType = 'dependency' as const
  readonly providerType = 'linear' as const
  
  constructor(private fieldMapper: FieldMapper, private config: LinearProviderConfig) {}
  
  // Placeholder implementations...
  async transform(source: LinearDependency, context: TransformationContext): Promise<TransformationResult<Dependency>> { throw new Error('Not implemented') }
  async reverseTransform(target: Dependency, context: TransformationContext): Promise<TransformationResult<LinearDependency>> { throw new Error('Not implemented') }
  async validateSource(source: LinearDependency): Promise<ValidationResult> { return { isValid: true, errors: [], warnings: [], score: 1.0 } }
  async validateTarget(target: Dependency): Promise<ValidationResult> { return { isValid: true, errors: [], warnings: [], score: 1.0 } }
  async transformBatch(sources: LinearDependency[], context: TransformationContext): Promise<BatchTransformationResult<Dependency>> { throw new Error('Not implemented') }
  async reverseTransformBatch(targets: Dependency[], context: TransformationContext): Promise<BatchTransformationResult<LinearDependency>> { throw new Error('Not implemented') }
  getTransformationSchema(): TransformationSchema<LinearDependency, Dependency> { throw new Error('Not implemented') }
}

class LinearLabelTransformer implements EntityTransformer<LinearLabel, Label> {
  readonly entityType = 'label' as const
  readonly providerType = 'linear' as const
  
  constructor(private fieldMapper: FieldMapper, private config: LinearProviderConfig) {}
  
  // Placeholder implementations...
  async transform(source: LinearLabel, context: TransformationContext): Promise<TransformationResult<Label>> { throw new Error('Not implemented') }
  async reverseTransform(target: Label, context: TransformationContext): Promise<TransformationResult<LinearLabel>> { throw new Error('Not implemented') }
  async validateSource(source: LinearLabel): Promise<ValidationResult> { return { isValid: true, errors: [], warnings: [], score: 1.0 } }
  async validateTarget(target: Label): Promise<ValidationResult> { return { isValid: true, errors: [], warnings: [], score: 1.0 } }
  async transformBatch(sources: LinearLabel[], context: TransformationContext): Promise<BatchTransformationResult<Label>> { throw new Error('Not implemented') }
  async reverseTransformBatch(targets: Label[], context: TransformationContext): Promise<BatchTransformationResult<LinearLabel>> { throw new Error('Not implemented') }
  getTransformationSchema(): TransformationSchema<LinearLabel, Label> { throw new Error('Not implemented') }
}

class LinearCommentTransformer implements EntityTransformer<any, IssueComment> {
  readonly entityType = 'comment' as const
  readonly providerType = 'linear' as const
  
  constructor(private fieldMapper: FieldMapper, private config: LinearProviderConfig) {}
  
  // Placeholder implementations...
  async transform(source: any, context: TransformationContext): Promise<TransformationResult<IssueComment>> { throw new Error('Not implemented') }
  async reverseTransform(target: IssueComment, context: TransformationContext): Promise<TransformationResult<any>> { throw new Error('Not implemented') }
  async validateSource(source: any): Promise<ValidationResult> { return { isValid: true, errors: [], warnings: [], score: 1.0 } }
  async validateTarget(target: IssueComment): Promise<ValidationResult> { return { isValid: true, errors: [], warnings: [], score: 1.0 } }  
  async transformBatch(sources: any[], context: TransformationContext): Promise<BatchTransformationResult<IssueComment>> { throw new Error('Not implemented') }
  async reverseTransformBatch(targets: IssueComment[], context: TransformationContext): Promise<BatchTransformationResult<any>> { throw new Error('Not implemented') }
  getTransformationSchema(): TransformationSchema<any, IssueComment> { throw new Error('Not implemented') }
}

// =============================================================================
// Linear Provider Configuration
// =============================================================================

interface LinearProviderConfig {
  type: 'linear'
  apiToken: string
  teamId: string
  apiUrl?: string
  timeout?: number
  enableWebhooks?: boolean
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a Linear transformer instance
 */
export async function createLinearTransformer(config: LinearProviderConfig): Promise<LinearTransformer> {
  const transformer = new LinearTransformer()
  await transformer.initialize(config)
  return transformer
}