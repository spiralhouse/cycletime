import { v4 as uuidv4 } from 'uuid';
import {
  TaskEstimationServiceInterface,
  TaskEstimationRequest,
  TaskEstimationResponse,
  UpdateTaskEstimateRequest,
  BatchEstimationRequest,
  BatchEstimationResponse,
  EstimationMethodology,
  ConfidenceLevel,
  AccuracyMetrics,
  TaskEstimatedPayload,
  AIProcessingMetadata
} from '../types/service-types';
import { MockDataService } from './mock-data-service';
import { EventService } from './event-service';
import { logger } from '@cycletime/shared-utils';

/**
 * TaskEstimationService - AI-assisted effort estimation service
 * 
 * Provides intelligent task estimation using multiple methodologies:
 * - AI-powered analysis of task complexity
 * - Historical data comparison
 * - Expert judgment integration
 * - Hybrid approaches combining multiple methods
 * 
 * Features:
 * - Multi-methodology estimation
 * - Confidence scoring and accuracy tracking
 * - Batch processing for multiple tasks
 * - Historical accuracy metrics
 * - Real-time estimate updates
 */
export class TaskEstimationService implements TaskEstimationServiceInterface {
  private estimationHistory: Map<string, TaskEstimationResponse[]> = new Map();
  private accuracyMetrics: AccuracyMetrics = {
    historicalAccuracy: 0.78,
    modelPerformance: 0.82,
    dataQuality: 0.85
  };

  constructor(
    private mockDataService: MockDataService,
    private eventService: EventService
  ) {}

  /**
   * Estimate a single task using AI analysis and historical data
   * @param request - Task estimation request with context and options
   * @returns Promise<TaskEstimationResponse> - Detailed estimation results
   */
  async estimateTask(request: TaskEstimationRequest): Promise<TaskEstimationResponse> {
    const startTime = performance.now();
    
    try {
      logger.info(`Starting estimation for ${request.tasks.length} task(s)`);
      
      // For single task estimation, we'll process the first task
      const task = request.tasks[0];
      if (!task) {
        throw new Error('No task provided for estimation');
      }

      // Simulate AI processing delay
      await this.simulateAIProcessing(600, 1500);
      
      // Determine estimation methodology
      const methodology = this.selectEstimationMethodology(task, request.context);
      
      // Generate base estimation
      const baseEstimate = this.generateBaseEstimate(task, request.context);
      
      // Apply contextual adjustments
      const adjustedEstimate = this.applyContextualAdjustments(baseEstimate, request.context);
      
      // Calculate confidence level
      const confidence = this.calculateConfidence(task, request.context, methodology);
      
      // Generate estimation range
      const range = this.generateEstimationRange(adjustedEstimate, confidence);
      
      // Create detailed breakdown
      const breakdown = this.generateEstimationBreakdown(adjustedEstimate, request.options);
      
      // Find similar tasks for comparison
      const comparisons = await this.findSimilarTasks(task);
      
      // Generate impact factors
      const factors = this.generateImpactFactors(task, request.context);
      
      const processingTime = performance.now() - startTime;
      
      const response: TaskEstimationResponse = {
        taskId: task.id,
        estimate: {
          hours: adjustedEstimate.hours,
          storyPoints: adjustedEstimate.storyPoints,
          confidence: confidence.score,
          range,
          breakdown,
          factors,
          comparisons
        },
        metadata: {
          estimatedAt: new Date().toISOString(),
          version: '1.0',
          method: methodology.method,
          confidence: confidence.score
        }
      };
      
      // Store estimation history
      this.storeEstimationHistory(task.id || 'unknown', response);
      
      // Publish estimation event
      await this.publishTaskEstimatedEvent(task, response, methodology);
      
      logger.info(`Estimation completed for task: ${task.title} (${adjustedEstimate.hours}h, ${Math.round(processingTime)}ms)`);
      return response;
      
    } catch (error) {
      logger.error('Error in task estimation:', error);
      throw error;
    }
  }

  /**
   * Retrieve existing task estimate
   * @param taskId - Task ID to retrieve estimate for
   * @returns Promise<TaskEstimationResponse | null> - Existing estimate or null
   */
  async getTaskEstimate(taskId: string): Promise<TaskEstimationResponse | null> {
    try {
      const history = this.estimationHistory.get(taskId);
      if (!history || history.length === 0) {
        logger.info(`No existing estimate found for task: ${taskId}`);
        return null;
      }

      // Return the most recent estimate
      const latestEstimate = history[history.length - 1];
      logger.info(`Retrieved estimate for task ${taskId}: ${latestEstimate.estimate.hours}h`);
      return latestEstimate;
      
    } catch (error) {
      logger.error(`Error retrieving task estimate for ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing task estimate
   * @param taskId - Task ID to update
   * @param request - Update request with new values
   * @returns Promise<TaskEstimationResponse> - Updated estimate
   */
  async updateTaskEstimate(taskId: string, request: UpdateTaskEstimateRequest): Promise<TaskEstimationResponse> {
    try {
      const existingEstimate = await this.getTaskEstimate(taskId);
      if (!existingEstimate) {
        throw new Error(`No existing estimate found for task: ${taskId}`);
      }

      // Version conflict check
      if (existingEstimate.metadata.version !== request.version.toString()) {
        throw new Error('Version conflict - estimate has been modified');
      }

      logger.info(`Updating estimate for task ${taskId}`);
      
      // Apply updates
      const updatedEstimate: TaskEstimationResponse = {
        ...existingEstimate,
        estimate: {
          ...existingEstimate.estimate,
          hours: request.hours ?? existingEstimate.estimate.hours,
          storyPoints: request.storyPoints ?? existingEstimate.estimate.storyPoints,
          confidence: request.confidence ?? existingEstimate.estimate.confidence
        },
        metadata: {
          ...existingEstimate.metadata,
          estimatedAt: new Date().toISOString(),
          version: (parseInt(existingEstimate.metadata.version) + 1).toString()
        }
      };

      // Add update notes if provided
      if (request.notes) {
        updatedEstimate.estimate.factors.push({
          factor: 'Manual adjustment',
          impact: 'neutral',
          multiplier: 1.0,
          description: request.notes
        });
      }

      // Store updated estimate
      this.storeEstimationHistory(taskId, updatedEstimate);
      
      logger.info(`Estimate updated for task ${taskId}: ${updatedEstimate.estimate.hours}h`);
      return updatedEstimate;
      
    } catch (error) {
      logger.error(`Error updating task estimate for ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Create batch estimates for multiple tasks
   * @param request - Batch estimation request
   * @returns Promise<BatchEstimationResponse> - Batch estimation results
   */
  async createBatchEstimates(request: BatchEstimationRequest): Promise<BatchEstimationResponse> {
    const startTime = performance.now();
    
    try {
      logger.info(`Starting batch estimation for ${request.taskIds.length} tasks`);
      
      // Retrieve all tasks
      const tasks = await Promise.all(
        request.taskIds.map(id => this.mockDataService.getTask(id))
      );
      
      const validTasks = tasks.filter(Boolean);
      const estimates: BatchEstimationResponse['estimates'] = [];
      
      // Process each task
      for (const task of validTasks) {
        try {
          const estimationRequest: TaskEstimationRequest = {
            tasks: [task],
            context: request.context,
            options: request.options
          };
          
          const estimate = await this.estimateTask(estimationRequest);
          
          estimates.push({
            taskId: task.id,
            estimate,
            status: 'success'
          });
          
        } catch (error) {
          logger.error(`Error estimating task ${task.id}:`, error);
          estimates.push({
            taskId: task.id,
            estimate: {} as TaskEstimationResponse,
            status: 'failed',
            error: error.message
          });
        }
      }
      
      // Calculate summary statistics
      const successfulEstimates = estimates.filter(e => e.status === 'success');
      const totalHours = successfulEstimates.reduce((sum, e) => sum + e.estimate.estimate.hours, 0);
      const totalStoryPoints = successfulEstimates.reduce((sum, e) => sum + e.estimate.estimate.storyPoints, 0);
      const averageConfidence = successfulEstimates.length > 0 
        ? successfulEstimates.reduce((sum, e) => sum + e.estimate.estimate.confidence, 0) / successfulEstimates.length
        : 0;
      
      const processingTime = performance.now() - startTime;
      
      const response: BatchEstimationResponse = {
        estimates,
        summary: {
          totalTasks: request.taskIds.length,
          successfulEstimates: successfulEstimates.length,
          failedEstimates: estimates.filter(e => e.status === 'failed').length,
          totalHours,
          totalStoryPoints,
          averageConfidence
        },
        metadata: {
          estimatedAt: new Date().toISOString(),
          processingTime: Math.round(processingTime)
        }
      };
      
      logger.info(`Batch estimation completed: ${successfulEstimates.length}/${request.taskIds.length} successful (${Math.round(processingTime)}ms)`);
      return response;
      
    } catch (error) {
      logger.error('Error in batch estimation:', error);
      throw error;
    }
  }

  /**
   * Get batch estimates for multiple tasks
   * @param taskIds - Array of task IDs
   * @returns Promise<BatchEstimationResponse> - Batch estimation results
   */
  async getBatchEstimates(taskIds: string[]): Promise<BatchEstimationResponse> {
    try {
      logger.info(`Retrieving batch estimates for ${taskIds.length} tasks`);
      
      const estimates: BatchEstimationResponse['estimates'] = [];
      
      for (const taskId of taskIds) {
        const estimate = await this.getTaskEstimate(taskId);
        
        if (estimate) {
          estimates.push({
            taskId,
            estimate,
            status: 'success'
          });
        } else {
          estimates.push({
            taskId,
            estimate: {} as TaskEstimationResponse,
            status: 'skipped',
            error: 'No estimate found'
          });
        }
      }
      
      // Calculate summary
      const successfulEstimates = estimates.filter(e => e.status === 'success');
      const totalHours = successfulEstimates.reduce((sum, e) => sum + e.estimate.estimate.hours, 0);
      const totalStoryPoints = successfulEstimates.reduce((sum, e) => sum + e.estimate.estimate.storyPoints, 0);
      const averageConfidence = successfulEstimates.length > 0 
        ? successfulEstimates.reduce((sum, e) => sum + e.estimate.estimate.confidence, 0) / successfulEstimates.length
        : 0;
      
      const response: BatchEstimationResponse = {
        estimates,
        summary: {
          totalTasks: taskIds.length,
          successfulEstimates: successfulEstimates.length,
          failedEstimates: estimates.filter(e => e.status === 'failed').length,
          totalHours,
          totalStoryPoints,
          averageConfidence
        },
        metadata: {
          estimatedAt: new Date().toISOString(),
          processingTime: 0
        }
      };
      
      logger.info(`Retrieved batch estimates: ${successfulEstimates.length}/${taskIds.length} found`);
      return response;
      
    } catch (error) {
      logger.error('Error retrieving batch estimates:', error);
      throw error;
    }
  }

  // Private helper methods

  private async simulateAIProcessing(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private selectEstimationMethodology(task: any, context?: any): EstimationMethodology {
    // Determine the best methodology based on available data
    const hasHistoricalData = this.accuracyMetrics.historicalAccuracy > 0.7;
    const hasComplexRequirements = task.description?.length > 100;
    const hasExpertContext = context?.teamExperience === 'expert';
    
    let method: EstimationMethodology['method'] = 'ai_analysis';
    let dataPoints = 50;
    let confidence = 0.75;
    
    if (hasHistoricalData && hasExpertContext) {
      method = 'hybrid';
      dataPoints = 100;
      confidence = 0.85;
    } else if (hasHistoricalData) {
      method = 'historical_comparison';
      dataPoints = 75;
      confidence = 0.8;
    } else if (hasExpertContext) {
      method = 'expert_judgment';
      dataPoints = 25;
      confidence = 0.7;
    }
    
    return {
      method,
      dataPoints,
      confidence
    };
  }

  private generateBaseEstimate(task: any, context?: any): { hours: number; storyPoints: number } {
    // Base estimation algorithm
    let hours = 8; // Default
    
    // Task type multipliers
    const typeMultipliers = {
      feature: 1.5,
      bug: 0.8,
      research: 1.2,
      documentation: 0.6,
      maintenance: 0.7
    };
    
    hours *= typeMultipliers[task.type] || 1.0;
    
    // Complexity analysis
    const titleComplexity = task.title?.split(' ').length || 5;
    const descriptionComplexity = task.description?.split(' ').length || 20;
    
    if (titleComplexity > 8) hours *= 1.2;
    if (descriptionComplexity > 50) hours *= 1.3;
    if (descriptionComplexity > 100) hours *= 1.5;
    
    // Requirements complexity
    if (task.requirements?.length > 5) hours *= 1.4;
    
    // Context adjustments
    if (context?.projectType === 'greenfield') hours *= 1.1;
    if (context?.projectType === 'brownfield') hours *= 1.3;
    if (context?.projectType === 'migration') hours *= 1.5;
    
    const storyPoints = Math.round(hours / 8);
    
    return {
      hours: Math.round(hours),
      storyPoints: Math.max(1, storyPoints)
    };
  }

  private applyContextualAdjustments(estimate: { hours: number; storyPoints: number }, context?: any): { hours: number; storyPoints: number } {
    let adjustedHours = estimate.hours;
    
    // Team experience adjustments
    const experienceMultipliers = {
      junior: 1.5,
      intermediate: 1.2,
      senior: 1.0,
      expert: 0.9
    };
    
    if (context?.teamExperience) {
      adjustedHours *= experienceMultipliers[context.teamExperience] || 1.0;
    }
    
    // Technology stack complexity
    if (context?.techStack?.length > 3) {
      adjustedHours *= 1.2;
    }
    
    // Constraints impact
    if (context?.constraints?.length > 0) {
      adjustedHours *= 1.1;
    }
    
    return {
      hours: Math.round(adjustedHours),
      storyPoints: Math.max(1, Math.round(adjustedHours / 8))
    };
  }

  private calculateConfidence(task: any, context?: any, methodology?: EstimationMethodology): ConfidenceLevel {
    let score = 0.7; // Base confidence
    const factors = [];
    
    // Methodology confidence
    if (methodology) {
      score = methodology.confidence;
      factors.push(`${methodology.method} methodology`);
    }
    
    // Task clarity
    if (task.description?.length > 50) {
      score += 0.1;
      factors.push('detailed requirements');
    }
    
    // Historical accuracy
    if (this.accuracyMetrics.historicalAccuracy > 0.8) {
      score += 0.05;
      factors.push('strong historical accuracy');
    }
    
    // Team experience
    if (context?.teamExperience === 'expert' || context?.teamExperience === 'senior') {
      score += 0.05;
      factors.push('experienced team');
    }
    
    // Complexity factors
    if (task.type === 'research') {
      score -= 0.1;
      factors.push('research uncertainty');
    }
    
    // Cap confidence score
    score = Math.max(0.5, Math.min(0.95, score));
    
    let level: ConfidenceLevel['level'] = 'medium';
    if (score >= 0.8) level = 'high';
    else if (score < 0.6) level = 'low';
    
    return {
      level,
      score,
      factors
    };
  }

  private generateEstimationRange(estimate: { hours: number; storyPoints: number }, confidence: ConfidenceLevel): any {
    const confidenceMultiplier = confidence.score;
    const variance = 1 - confidenceMultiplier;
    
    const minHours = Math.round(estimate.hours * (1 - variance * 0.3));
    const maxHours = Math.round(estimate.hours * (1 + variance * 0.5));
    
    return {
      min: Math.max(1, minHours),
      max: maxHours,
      mostLikely: estimate.hours
    };
  }

  private generateEstimationBreakdown(estimate: { hours: number; storyPoints: number }, options?: any): any {
    const includeBuffer = options?.includeBuffer !== false;
    const bufferPercentage = options?.bufferPercentage || 0.2;
    
    const totalHours = estimate.hours;
    const buffer = includeBuffer ? Math.round(totalHours * bufferPercentage) : 0;
    
    return {
      analysis: Math.round(totalHours * 0.1),
      design: Math.round(totalHours * 0.15),
      implementation: Math.round(totalHours * 0.5),
      testing: Math.round(totalHours * 0.15),
      review: Math.round(totalHours * 0.05),
      deployment: Math.round(totalHours * 0.05),
      buffer
    };
  }

  private async findSimilarTasks(task: any): Promise<any[]> {
    try {
      // Simple similarity matching based on type and title keywords
      const allTasks = await this.mockDataService.listTasks({ page: 1, limit: 50 });
      
      const similarTasks = allTasks.tasks
        .filter(t => t.id !== task.id && t.type === task.type)
        .slice(0, 3)
        .map(t => ({
          taskId: t.id,
          title: t.title,
          similarity: this.calculateSimilarity(task, t),
          actualHours: t.actualHours || t.estimatedHours || 8,
          variance: Math.random() * 0.3 - 0.15 // -15% to +15%
        }));
      
      return similarTasks;
      
    } catch (error) {
      logger.error('Error finding similar tasks:', error);
      return [];
    }
  }

  private calculateSimilarity(task1: any, task2: any): number {
    // Simple similarity calculation based on common words
    const words1 = task1.title.toLowerCase().split(' ');
    const words2 = task2.title.toLowerCase().split(' ');
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return Math.round((commonWords.length / totalWords) * 100) / 100;
  }

  private generateImpactFactors(task: any, context?: any): any[] {
    const factors = [];
    
    // Task type factors
    if (task.type === 'feature') {
      factors.push({
        factor: 'New feature development',
        impact: 'increases',
        multiplier: 1.2,
        description: 'Feature development typically requires design, implementation, and testing'
      });
    }
    
    if (task.type === 'bug') {
      factors.push({
        factor: 'Bug investigation complexity',
        impact: 'neutral',
        multiplier: 1.0,
        description: 'Investigation time varies significantly based on bug complexity'
      });
    }
    
    // Context factors
    if (context?.projectType === 'brownfield') {
      factors.push({
        factor: 'Legacy system complexity',
        impact: 'increases',
        multiplier: 1.3,
        description: 'Working with existing systems requires additional analysis and testing'
      });
    }
    
    if (context?.teamExperience === 'junior') {
      factors.push({
        factor: 'Team learning curve',
        impact: 'increases',
        multiplier: 1.4,
        description: 'Junior team members require additional time for learning and mentorship'
      });
    }
    
    if (context?.constraints?.length > 0) {
      factors.push({
        factor: 'Implementation constraints',
        impact: 'increases',
        multiplier: 1.1,
        description: 'Additional constraints limit solution options and increase complexity'
      });
    }
    
    return factors;
  }

  private storeEstimationHistory(taskId: string, estimation: TaskEstimationResponse): void {
    const history = this.estimationHistory.get(taskId) || [];
    history.push(estimation);
    this.estimationHistory.set(taskId, history);
    
    // Keep only the last 5 estimates per task
    if (history.length > 5) {
      history.splice(0, history.length - 5);
    }
  }

  private async publishTaskEstimatedEvent(task: any, response: TaskEstimationResponse, methodology: EstimationMethodology): Promise<void> {
    const aiProcessing: AIProcessingMetadata = {
      model: 'task-estimation-v1',
      processingTime: 1200,
      confidenceScore: response.metadata.confidence,
      dataQuality: {
        score: this.accuracyMetrics.dataQuality,
        issues: []
      }
    };

    const payload: TaskEstimatedPayload = {
      eventId: uuidv4(),
      eventType: 'task.estimated',
      timestamp: new Date().toISOString(),
      source: 'task-estimation-service',
      version: '1.0',
      userId: 'ai-system',
      correlationId: uuidv4(),
      data: {
        taskId: task.id || 'unknown',
        taskTitle: task.title,
        estimationId: uuidv4(),
        estimation: {
          effort: {
            hours: response.estimate.hours,
            storyPoints: response.estimate.storyPoints,
            confidenceLevel: response.estimate.confidence,
            range: {
              optimistic: response.estimate.range.min,
              mostLikely: response.estimate.range.mostLikely,
              pessimistic: response.estimate.range.max
            }
          },
          methodology: methodology.method,
          basedOn: [
            {
              type: 'ai_analysis',
              reference: 'complexity-analysis-v1',
              similarity: 0.85
            }
          ],
          adjustments: response.estimate.factors.map(factor => ({
            factor: factor.factor,
            adjustment: factor.multiplier,
            reason: factor.description
          })),
          accuracy: {
            historicalAccuracy: this.accuracyMetrics.historicalAccuracy,
            modelPerformance: this.accuracyMetrics.modelPerformance
          }
        },
        aiProcessing,
        project: task.project,
        assignee: task.assignee
      }
    };

    await this.eventService.publish('task.estimated', payload);
  }

  /**
   * Get current accuracy metrics for the estimation service
   * @returns AccuracyMetrics - Current accuracy statistics
   */
  getAccuracyMetrics(): AccuracyMetrics {
    return { ...this.accuracyMetrics };
  }

  /**
   * Update accuracy metrics based on actual vs estimated performance
   * @param taskId - Task ID that was completed
   * @param actualHours - Actual hours spent
   * @param estimatedHours - Originally estimated hours
   */
  updateAccuracyMetrics(taskId: string, actualHours: number, estimatedHours: number): void {
    const variance = Math.abs(actualHours - estimatedHours) / estimatedHours;
    const accuracy = Math.max(0, 1 - variance);
    
    // Update historical accuracy using exponential moving average
    this.accuracyMetrics.historicalAccuracy = 
      (this.accuracyMetrics.historicalAccuracy * 0.9) + (accuracy * 0.1);
    
    logger.info(`Updated accuracy metrics for task ${taskId}: ${Math.round(accuracy * 100)}% accuracy`);
  }

  /**
   * Get estimation statistics for reporting
   * @returns Object containing estimation statistics
   */
  getEstimationStatistics(): any {
    const totalEstimations = Array.from(this.estimationHistory.values())
      .reduce((sum, history) => sum + history.length, 0);
    
    const averageConfidence = Array.from(this.estimationHistory.values())
      .flat()
      .reduce((sum, est) => sum + est.estimate.confidence, 0) / totalEstimations || 0;
    
    return {
      totalEstimations,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      accuracyMetrics: this.accuracyMetrics,
      tasksWithEstimates: this.estimationHistory.size
    };
  }

  /**
   * Clear estimation history (for testing purposes)
   */
  clearEstimationHistory(): void {
    this.estimationHistory.clear();
    logger.info('Estimation history cleared');
  }
}