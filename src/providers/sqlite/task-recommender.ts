/**
 * JCVD SQLite Task Recommendation Engine
 * Intelligent task recommendation system with dependency analysis
 * 
 * This module implements an advanced task recommendation engine that analyzes
 * project state, dependencies, user context, and work patterns to provide
 * intelligent next-task suggestions for optimal productivity.
 */

import type {
  EnhancedIssue,
  TaskRecommendation,
  DependencyGraph,
  IssueType,
  IssuePriority
} from '../types.js'

import type { SQLiteOperations } from './sqlite-operations.js'

// =============================================================================
// Recommendation Types and Interfaces
// =============================================================================

export interface RecommendationContext {
  /** Focus area or specific work context */
  focusArea?: string
  /** Recent work history for pattern analysis */
  recentWork?: string[]
  /** User's skill level or expertise areas */
  expertiseAreas?: string[]
  /** Time constraints or availability */
  timeConstraints?: {
    availableHours: number
    preferredTaskSize: 'small' | 'medium' | 'large'
  }
  /** Current sprint or milestone context */
  sprintContext?: {
    sprintId: string
    sprintEndDate: Date
    remainingCapacity: number
  }
}

export interface RecommendationFactors {
  /** Priority score (0-10) */
  priorityScore: number
  /** Dependency readiness score (0-10) */
  dependencyScore: number
  /** Complexity/effort score (0-10) */
  complexityScore: number
  /** Context relevance score (0-10) */
  contextScore: number
  /** User expertise match score (0-10) */
  expertiseScore: number
  /** Time fit score (0-10) */
  timeFitScore: number
  /** Business value score (0-10) */
  businessValueScore: number
}

export interface ScoredRecommendation {
  issue: EnhancedIssue
  totalScore: number
  factors: RecommendationFactors
  rationale: string
  confidence: number
}

// =============================================================================
// Task Recommendation Engine
// =============================================================================

/**
 * Advanced task recommendation engine with multiple scoring algorithms
 */
export class TaskRecommendationEngine {
  private operations: SQLiteOperations
  private scoringWeights = {
    priority: 0.25,
    dependency: 0.20,
    complexity: 0.15,
    context: 0.15,
    expertise: 0.10,
    timeFit: 0.10,
    businessValue: 0.05
  }

  constructor(operations: SQLiteOperations) {
    this.operations = operations
  }

  /**
   * Get intelligent task recommendation for a project
   */
  async getTaskRecommendation(
    projectId: string,
    assigneeId?: string,
    context: RecommendationContext = {}
  ): Promise<TaskRecommendation> {
    try {
      // Get available issues and project context
      const [availableIssues, dependencyGraph, bottlenecks, projectStats] = await Promise.all([
        this.operations.getAvailableIssues(projectId, assigneeId),
        this.buildDependencyGraph(projectId),
        this.operations.getDependencyBottlenecks(projectId),
        this.getProjectStatistics(projectId)
      ])

      if (availableIssues.length === 0) {
        return this.createNoTasksRecommendation(projectId, context)
      }

      // Score all available issues
      const scoredRecommendations = await Promise.all(
        availableIssues.map(issue => this.scoreIssue(issue, context, dependencyGraph, bottlenecks))
      )

      // Sort by score and select top recommendations
      scoredRecommendations.sort((a, b) => b.totalScore - a.totalScore)
      
      const topRecommendation = scoredRecommendations[0]
      const alternatives = scoredRecommendations.slice(1, 4).map(scored => ({
        issue: scored.issue,
        confidence: scored.confidence,
        rationale: scored.rationale
      }))

      return {
        issue: topRecommendation.issue,
        confidence: topRecommendation.confidence,
        rationale: topRecommendation.rationale,
        alternatives,
        context: {
          availableIssues: availableIssues.length,
          focusArea: context.focusArea,
          recentWork: context.recentWork,
          projectPhase: this.determineProjectPhase(projectStats)
        }
      }

    } catch (error) {
      throw new Error(`Task recommendation failed: ${error.message}`)
    }
  }

  /**
   * Get multiple task recommendations with different strategies
   */
  async getMultipleRecommendations(
    projectId: string,
    assigneeId?: string,
    context: RecommendationContext = {},
    strategies: Array<'priority' | 'quick_wins' | 'unblocking' | 'context_based'> = ['priority']
  ): Promise<TaskRecommendation[]> {
    const recommendations: TaskRecommendation[] = []

    for (const strategy of strategies) {
      const strategyContext = { ...context, strategy }
      const recommendation = await this.getTaskRecommendation(projectId, assigneeId, strategyContext)
      
      // Avoid duplicate recommendations
      if (!recommendations.some(r => r.issue.id === recommendation.issue.id)) {
        recommendations.push(recommendation)
      }
    }

    return recommendations
  }

  // =============================================================================
  // Scoring and Analysis Methods
  // =============================================================================

  /**
   * Score an individual issue for recommendation
   */
  private async scoreIssue(
    issue: EnhancedIssue,
    context: RecommendationContext,
    dependencyGraph: DependencyGraph,
    bottlenecks: Array<any>
  ): Promise<ScoredRecommendation> {
    const factors: RecommendationFactors = {
      priorityScore: this.calculatePriorityScore(issue),
      dependencyScore: this.calculateDependencyScore(issue, dependencyGraph),
      complexityScore: this.calculateComplexityScore(issue),
      contextScore: this.calculateContextScore(issue, context),
      expertiseScore: this.calculateExpertiseScore(issue, context),
      timeFitScore: this.calculateTimeFitScore(issue, context),
      businessValueScore: this.calculateBusinessValueScore(issue, bottlenecks)
    }

    const totalScore = this.calculateWeightedScore(factors)
    const confidence = this.calculateConfidence(factors, context)
    const rationale = this.generateRationale(issue, factors, context)

    return {
      issue,
      totalScore,
      factors,
      rationale,
      confidence
    }
  }

  /**
   * Calculate priority-based score
   */
  private calculatePriorityScore(issue: EnhancedIssue): number {
    const priorityMap: Record<IssuePriority, number> = {
      1: 10, // Urgent
      2: 8,  // High
      3: 6,  // Normal
      4: 4,  // Low
      0: 2   // No priority
    }
    return priorityMap[issue.priority] || 2
  }

  /**
   * Calculate dependency readiness score
   */
  private calculateDependencyScore(issue: EnhancedIssue, dependencyGraph: DependencyGraph): number {
    // Issue is available, so no blocking dependencies
    let score = 8

    // Boost score if this issue unblocks others
    const blockedCount = dependencyGraph.edges.filter(edge => edge.from === issue.id).length
    score += Math.min(blockedCount * 2, 2) // Max boost of 2 points

    // Check if issue is on critical path
    if (dependencyGraph.analysis.criticalPath.includes(issue.id)) {
      score += 1
    }

    return Math.min(score, 10)
  }

  /**
   * Calculate complexity/effort score (higher is better for small tasks)
   */
  private calculateComplexityScore(issue: EnhancedIssue): number {
    // Prefer issues with estimates (shows they're well-defined)
    let score = issue.estimate ? 7 : 4

    // Score based on issue type complexity
    const typeScores: Record<IssueType, number> = {
      subtask: 8,   // Preferred for quick execution
      story: 6,     // Good balance
      bug: 7,       // Usually well-defined
      feature: 5,   // Can be complex
      epic: 2       // Too large for individual work
    }
    
    score = (score + typeScores[issue.issue_type]) / 2

    // Adjust based on estimate size
    if (issue.estimate) {
      if (issue.estimate <= 3) score += 2      // Small tasks
      else if (issue.estimate <= 5) score += 1 // Medium tasks
      else if (issue.estimate >= 8) score -= 1 // Large tasks
    }

    return Math.min(score, 10)
  }

  /**
   * Calculate context relevance score
   */
  private calculateContextScore(issue: EnhancedIssue, context: RecommendationContext): number {
    let score = 5 // Baseline

    // Focus area matching
    if (context.focusArea) {
      const focusMatch = this.matchesFocusArea(issue, context.focusArea)
      score += focusMatch ? 3 : -1
    }

    // Recent work pattern matching
    if (context.recentWork && context.recentWork.length > 0) {
      const patternMatch = this.matchesWorkPattern(issue, context.recentWork)
      score += patternMatch ? 2 : 0
    }

    // Sprint context
    if (context.sprintContext) {
      const timeFit = this.fitsSprintContext(issue, context.sprintContext)
      score += timeFit ? 1 : -1
    }

    return Math.max(Math.min(score, 10), 0)
  }

  /**
   * Calculate expertise match score
   */
  private calculateExpertiseScore(issue: EnhancedIssue, context: RecommendationContext): number {
    if (!context.expertiseAreas || context.expertiseAreas.length === 0) {
      return 5 // Neutral when no expertise info
    }

    let score = 5
    const issueContext = `${issue.title} ${issue.description || ''}`.toLowerCase()

    for (const area of context.expertiseAreas) {
      if (issueContext.includes(area.toLowerCase())) {
        score += 2
        break
      }
    }

    return Math.min(score, 10)
  }

  /**
   * Calculate time fit score
   */
  private calculateTimeFitScore(issue: EnhancedIssue, context: RecommendationContext): number {
    if (!context.timeConstraints) {
      return 5 // Neutral when no time constraints
    }

    let score = 5
    const { availableHours, preferredTaskSize } = context.timeConstraints

    // Estimate-based scoring
    if (issue.estimate) {
      const estimatedHours = issue.estimate // Assuming story points ≈ hours for simplicity
      
      if (estimatedHours <= availableHours) {
        score += 3
        
        // Preferred task size matching
        if (preferredTaskSize === 'small' && estimatedHours <= 3) score += 2
        else if (preferredTaskSize === 'medium' && estimatedHours >= 3 && estimatedHours <= 5) score += 2
        else if (preferredTaskSize === 'large' && estimatedHours >= 5) score += 2
      } else {
        score -= 3
      }
    }

    return Math.max(Math.min(score, 10), 0)
  }

  /**
   * Calculate business value score
   */
  private calculateBusinessValueScore(issue: EnhancedIssue, bottlenecks: Array<any>): number {
    let score = 5 // Baseline

    // Boost score if issue is a bottleneck (unblocks others)
    const isBottleneck = bottlenecks.some(b => b.issueId === issue.id)
    if (isBottleneck) {
      score += 3
    }

    // Bug fixes often have high business value
    if (issue.issue_type === 'bug') {
      score += 2
    }

    // Features in progress have ongoing value
    if (issue.issue_type === 'feature' && issue.workflowState?.type === 'started') {
      score += 1
    }

    return Math.min(score, 10)
  }

  /**
   * Calculate weighted total score
   */
  private calculateWeightedScore(factors: RecommendationFactors): number {
    return (
      factors.priorityScore * this.scoringWeights.priority +
      factors.dependencyScore * this.scoringWeights.dependency +
      factors.complexityScore * this.scoringWeights.complexity +
      factors.contextScore * this.scoringWeights.context +
      factors.expertiseScore * this.scoringWeights.expertise +
      factors.timeFitScore * this.scoringWeights.timeFit +
      factors.businessValueScore * this.scoringWeights.businessValue
    )
  }

  /**
   * Calculate recommendation confidence
   */
  private calculateConfidence(factors: RecommendationFactors, context: RecommendationContext): number {
    let confidence = 0.5 // Base confidence

    // Higher confidence with more context
    if (context.focusArea) confidence += 0.1
    if (context.recentWork && context.recentWork.length > 0) confidence += 0.1
    if (context.expertiseAreas && context.expertiseAreas.length > 0) confidence += 0.1
    if (context.timeConstraints) confidence += 0.1

    // Higher confidence with clear priority and dependencies
    if (factors.priorityScore >= 8) confidence += 0.1
    if (factors.dependencyScore >= 8) confidence += 0.1

    return Math.min(confidence, 1.0)
  }

  /**
   * Generate human-readable rationale
   */
  private generateRationale(
    issue: EnhancedIssue,
    factors: RecommendationFactors,
    context: RecommendationContext
  ): string {
    const reasons: string[] = []

    // Priority reasoning
    if (factors.priorityScore >= 8) {
      reasons.push(`high priority (${this.getPriorityName(issue.priority)})`)
    }

    // Dependency reasoning
    if (factors.dependencyScore >= 8) {
      reasons.push('ready to start with no blocking dependencies')
    }

    // Complexity reasoning
    if (factors.complexityScore >= 7) {
      if (issue.estimate && issue.estimate <= 3) {
        reasons.push('well-sized task that can be completed quickly')
      } else {
        reasons.push('well-defined and achievable')
      }
    }

    // Context reasoning
    if (factors.contextScore >= 7 && context.focusArea) {
      reasons.push(`aligns with current focus area (${context.focusArea})`)
    }

    // Business value reasoning
    if (factors.businessValueScore >= 7) {
      if (issue.issue_type === 'bug') {
        reasons.push('bug fix with immediate business impact')
      } else {
        reasons.push('high business value and impact')
      }
    }

    // Default reasoning
    if (reasons.length === 0) {
      reasons.push('good balance of priority, readiness, and complexity')
    }

    const baseRationale = `Recommended because it has ${reasons.join(', ')}`
    
    // Add issue type context
    const typeContext = this.getIssueTypeContext(issue.issue_type)
    return `${baseRationale}. ${typeContext}`
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  /**
   * Build dependency graph for analysis
   */
  private async buildDependencyGraph(projectId: string): Promise<DependencyGraph> {
    const [projectIssues, dependencies] = await Promise.all([
      this.operations.listIssues({ project_id: projectId }),
      this.operations.getProjectDependencies(projectId)
    ])

    const nodes = projectIssues.map(issue => ({
      id: issue.id,
      title: issue.title,
      type: issue.issue_type,
      state: issue.workflowState?.name || 'unknown',
      estimate: issue.estimate
    }))

    const edges = dependencies.map(dep => ({
      from: dep.blocker_id,
      to: dep.blocked_id,
      type: dep.dependency_type
    }))

    // Simple analysis (could be expanded)
    const analysis = {
      rootNodes: nodes.filter(node => !edges.some(edge => edge.to === node.id)).map(n => n.id),
      leafNodes: nodes.filter(node => !edges.some(edge => edge.from === node.id)).map(n => n.id),
      criticalPath: [], // Would require more complex analysis
      circularDependencies: [],
      bottlenecks: []
    }

    return {
      projectId,
      nodes,
      edges,
      analysis
    }
  }

  /**
   * Get basic project statistics
   */
  private async getProjectStatistics(projectId: string): Promise<any> {
    // This would ideally use a dedicated analytics query
    const issues = await this.operations.listIssues({ project_id: projectId })
    
    const total = issues.length
    const completed = issues.filter(i => i.workflowState?.type === 'completed').length
    const inProgress = issues.filter(i => i.workflowState?.type === 'started').length
    
    return {
      total,
      completed,
      inProgress,
      completionRate: total > 0 ? completed / total : 0
    }
  }

  /**
   * Check if issue matches focus area
   */
  private matchesFocusArea(issue: EnhancedIssue, focusArea: string): boolean {
    const searchText = `${issue.title} ${issue.description || ''}`.toLowerCase()
    return searchText.includes(focusArea.toLowerCase())
  }

  /**
   * Check if issue matches recent work patterns
   */
  private matchesWorkPattern(issue: EnhancedIssue, recentWork: string[]): boolean {
    const issueContext = `${issue.title} ${issue.description || ''}`.toLowerCase()
    return recentWork.some(work => 
      issueContext.includes(work.toLowerCase()) || 
      issue.issue_type === work.toLowerCase()
    )
  }

  /**
   * Check if issue fits sprint context
   */
  private fitsSprintContext(issue: EnhancedIssue, sprintContext: any): boolean {
    if (!issue.estimate) return true // Unknown size, assume it fits
    return issue.estimate <= sprintContext.remainingCapacity
  }

  /**
   * Get priority name for display
   */
  private getPriorityName(priority: IssuePriority): string {
    const names: Record<IssuePriority, string> = {
      0: 'No Priority',
      1: 'Urgent',
      2: 'High',
      3: 'Normal',
      4: 'Low'
    }
    return names[priority] || 'Unknown'
  }

  /**
   * Get issue type context for rationale
   */
  private getIssueTypeContext(issueType: IssueType): string {
    const contexts: Record<IssueType, string> = {
      subtask: 'This subtask is a focused piece of work that can be completed efficiently.',
      story: 'This story represents valuable user functionality that can be delivered incrementally.',
      bug: 'This bug fix will improve system reliability and user experience.',
      feature: 'This feature will add new capabilities and value to the system.',
      epic: 'This epic represents a large initiative that should be broken down into smaller tasks.'
    }
    return contexts[issueType] || 'This issue represents valuable work to be completed.'
  }

  /**
   * Determine project phase based on statistics
   */
  private determineProjectPhase(stats: any): string {
    if (stats.completionRate < 0.2) return 'early'
    if (stats.completionRate < 0.8) return 'active'
    return 'completion'
  }

  /**
   * Create recommendation when no tasks are available
   */
  private createNoTasksRecommendation(
    projectId: string,
    context: RecommendationContext
  ): TaskRecommendation {
    return {
      issue: null as any, // No issue to recommend
      confidence: 1.0,
      rationale: 'No available tasks found. All current issues are either completed, blocked by dependencies, or assigned to others.',
      alternatives: [],
      context: {
        availableIssues: 0,
        focusArea: context.focusArea,
        recentWork: context.recentWork,
        projectPhase: 'blocked'
      }
    }
  }

  /**
   * Update scoring weights for different recommendation strategies
   */
  setScoringWeights(weights: Partial<typeof this.scoringWeights>): void {
    this.scoringWeights = { ...this.scoringWeights, ...weights }
  }

  /**
   * Get current scoring weights
   */
  getScoringWeights(): typeof this.scoringWeights {
    return { ...this.scoringWeights }
  }
}