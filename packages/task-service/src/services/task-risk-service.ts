// @ts-nocheck
import { v4 as uuidv4 } from 'uuid';
import {
  TaskRiskServiceInterface,
  TaskRisk,
  TaskRisksResponse,
  AddTaskRiskRequest,
  UpdateTaskRiskRequest,
  RiskImpact,
  MitigationStrategy,
  TaskRiskIdentifiedPayload,
  AIProcessingMetadata
} from '../types/service-types';
import { MockDataService } from './mock-data-service';
import { EventService } from './event-service';
import { logger } from '@cycletime/shared-utils';

/**
 * TaskRiskService - Risk assessment and management service
 * 
 * Provides comprehensive risk management functionality:
 * - AI-powered risk identification and analysis
 * - Risk categorization and severity assessment
 * - Mitigation strategy generation and tracking
 * - Risk impact analysis and prediction
 * - Risk monitoring and alerting
 * 
 * Features:
 * - Automated risk detection using AI
 * - Real-time risk scoring and impact assessment
 * - Mitigation action tracking and management
 * - Risk trend analysis and reporting
 * - Integration with task lifecycle events
 */
export class TaskRiskService implements TaskRiskServiceInterface {
  private riskAnalysisModels: Map<string, any> = new Map();
  private riskThresholds = {
    low: 0.3,
    medium: 0.6,
    high: 0.8,
    critical: 0.9
  };

  constructor(
    private mockDataService: MockDataService,
    private eventService: EventService
  ) {
    this.initializeRiskModels();
  }

  /**
   * Add a new risk to a task
   * @param taskId - Task ID to add risk to
   * @param request - Risk creation request
   * @returns Promise<TaskRisk> - Created risk
   */
  async addTaskRisk(taskId: string, request: AddTaskRiskRequest): Promise<TaskRisk> {
    try {
      logger.info(`Adding risk to task ${taskId}: ${request.title}`);
      
      // Validate task exists
      const task = await this.mockDataService.getTask(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }
      
      // Validate risk request
      this.validateRiskRequest(request);
      
      // Enhance risk with AI analysis if requested
      const enhancedRequest = request.autoAnalyze 
        ? await this.enhanceRiskWithAI(request, task)
        : request;
      
      // Create risk using mock data service
      const risk = await this.mockDataService.addTaskRisk(taskId, enhancedRequest, 'risk-system');
      
      // Publish risk identification event
      await this.publishRiskIdentifiedEvent(task, risk);
      
      logger.info(`Risk added successfully: ${risk.id} for task ${taskId}`);
      return risk;
      
    } catch (error) {
      logger.error(`Error adding risk to task ${taskId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Get all risks for a task
   * @param taskId - Task ID to get risks for
   * @returns Promise<TaskRisksResponse> - Task risks with summary
   */
  async getTaskRisks(taskId: string): Promise<TaskRisksResponse> {
    try {
      logger.info(`Retrieving risks for task: ${taskId}`);
      
      // Get risks from mock data service
      const response = await this.mockDataService.getTaskRisks(taskId);
      
      // Enhance with real-time risk analysis
      const enhancedRisks = await Promise.all(
        response.risks.map(risk => this.enhanceRiskWithAnalysis(risk))
      );
      
      const enhancedResponse: TaskRisksResponse = {
        ...response,
        risks: enhancedRisks
      };
      
      logger.info(`Retrieved ${enhancedRisks.length} risks for task ${taskId}`);
      return enhancedResponse;
      
    } catch (error) {
      logger.error(`Error retrieving risks for task ${taskId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Update an existing task risk
   * @param taskId - Task ID containing the risk
   * @param riskId - Risk ID to update
   * @param request - Update request
   * @returns Promise<TaskRisk> - Updated risk
   */
  async updateTaskRisk(taskId: string, riskId: string, request: UpdateTaskRiskRequest): Promise<TaskRisk> {
    try {
      logger.info(`Updating risk ${riskId} for task ${taskId}`);
      
      // Validate update request
      this.validateRiskUpdateRequest(request);
      
      // Update risk using mock data service
      const updatedRisk = await this.mockDataService.updateTaskRisk(taskId, riskId, request, 'risk-system');
      
      if (!updatedRisk) {
        throw new Error(`Risk not found: ${riskId} for task ${taskId}`);
      }
      
      // Enhance updated risk with analysis
      const enhancedRisk = await this.enhanceRiskWithAnalysis(updatedRisk);
      
      logger.info(`Risk updated successfully: ${riskId} for task ${taskId}`);
      return enhancedRisk;
      
    } catch (error) {
      logger.error(`Error updating risk ${riskId} for task ${taskId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Delete a task risk
   * @param taskId - Task ID containing the risk
   * @param riskId - Risk ID to delete
   * @returns Promise<boolean> - Success status
   */
  async deleteTaskRisk(taskId: string, riskId: string): Promise<boolean> {
    try {
      logger.info(`Deleting risk ${riskId} for task ${taskId}`);
      
      const success = await this.mockDataService.deleteTaskRisk(taskId, riskId, 'risk-system');
      
      if (success) {
        logger.info(`Risk deleted successfully: ${riskId} for task ${taskId}`);
      } else {
        logger.warn(`Risk not found for deletion: ${riskId} for task ${taskId}`);
      }
      
      return success;
      
    } catch (error) {
      logger.error(`Error deleting risk ${riskId} for task ${taskId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Analyze and identify risks for a task using AI
   * @param taskId - Task ID to analyze
   * @returns Promise<TaskRisk[]> - Identified risks
   */
  async analyzeTaskRisks(taskId: string): Promise<TaskRisk[]> {
    const startTime = performance.now();
    
    try {
      logger.info(`Starting AI risk analysis for task: ${taskId}`);
      
      // Get task details
      const task = await this.mockDataService.getTask(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }
      
      // Simulate AI processing delay
      await this.simulateAIProcessing(1000, 2500);
      
      // Analyze task for potential risks
      const identifiedRisks = await this.performAIRiskAnalysis(task);
      
      // Create risk entries for each identified risk
      const createdRisks: TaskRisk[] = [];
      
      for (const riskData of identifiedRisks) {
        try {
          const risk = await this.addTaskRisk(taskId, {
            ...riskData,
            autoAnalyze: false // Prevent infinite recursion
          });
          createdRisks.push(risk);
        } catch (error) {
          logger.error(`Error creating identified risk:`, error as Error);
        }
      }
      
      const processingTime = performance.now() - startTime;
      logger.info(`AI risk analysis completed for task ${taskId}: ${createdRisks.length} risks identified (${Math.round(processingTime)}ms)`);
      
      return createdRisks;
      
    } catch (error) {
      logger.error(`Error in AI risk analysis for task ${taskId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Assess the impact of a specific risk
   * @param taskId - Task ID containing the risk
   * @param riskId - Risk ID to assess
   * @returns Promise<RiskImpact> - Detailed risk impact analysis
   */
  async assessRiskImpact(taskId: string, riskId: string): Promise<RiskImpact> {
    try {
      logger.info(`Assessing impact for risk ${riskId} in task ${taskId}`);
      
      // Get task and risk details
      const task = await this.mockDataService.getTask(taskId);
      const risksResponse = await this.mockDataService.getTaskRisks(taskId);
      const risk = risksResponse.risks.find(r => r.id === riskId);
      
      if (!task || !risk) {
        throw new Error(`Task or risk not found: ${taskId}/${riskId}`);
      }
      
      // Simulate AI impact assessment
      await this.simulateAIProcessing(500, 1200);
      
      // Calculate impact based on risk characteristics
      const impact = this.calculateRiskImpact(task, risk);
      
      logger.info(`Risk impact assessed for ${riskId}: ${impact.schedule?.delayDays || 0} days delay`);
      return impact;
      
    } catch (error) {
      logger.error(`Error assessing risk impact for ${riskId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Get risk trends and analytics for a project or tasks
   * @param projectId - Optional project ID for scope
   * @param taskIds - Optional task IDs for specific analysis
   * @returns Promise<any> - Risk analytics data
   */
  async getRiskAnalytics(projectId?: string, taskIds?: string[]): Promise<any> {
    try {
      logger.info('Generating risk analytics', { projectId, taskIds });
      
      // Get tasks to analyze
      let tasks;
      if (taskIds) {
        tasks = await Promise.all(
          taskIds.map(id => this.mockDataService.getTask(id))
        );
        tasks = tasks.filter(Boolean);
      } else {
        const listResult = await this.mockDataService.listTasks({ 
          page: 1, 
          limit: 100,
          project: projectId 
        });
        tasks = listResult.tasks;
      }
      
      // Collect all risks for these tasks
      const allRisks: TaskRisk[] = [];
      
      for (const task of tasks) {
        try {
          const risksResponse = await this.mockDataService.getTaskRisks(task.id);
          allRisks.push(...risksResponse.risks);
        } catch (error) {
          logger.error(`Error getting risks for task ${task.id}:`, error as Error);
        }
      }
      
      // Generate analytics
      const analytics = this.generateRiskAnalytics(allRisks, tasks);
      
      logger.info(`Generated risk analytics for ${tasks.length} tasks, ${allRisks.length} risks`);
      return analytics;
      
    } catch (error) {
      logger.error('Error generating risk analytics:', error as Error);
      throw error;
    }
  }

  // Private helper methods

  private initializeRiskModels(): void {
    // Initialize AI risk analysis models
    this.riskAnalysisModels.set('technical', {
      patterns: ['integration', 'complexity', 'performance', 'scalability'],
      weightings: { high: 0.8, medium: 0.6, low: 0.4 }
    });
    
    this.riskAnalysisModels.set('resource', {
      patterns: ['team', 'skill', 'availability', 'capacity'],
      weightings: { high: 0.9, medium: 0.7, low: 0.5 }
    });
    
    this.riskAnalysisModels.set('timeline', {
      patterns: ['deadline', 'scope', 'dependency', 'estimate'],
      weightings: { high: 0.85, medium: 0.65, low: 0.45 }
    });
    
    logger.info('Risk analysis models initialized');
  }

  private async simulateAIProcessing(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private validateRiskRequest(request: AddTaskRiskRequest): void {
    if (!request.title || request.title.trim().length === 0) {
      throw new Error('Risk title is required');
    }
    
    if (!request.description || request.description.trim().length === 0) {
      throw new Error('Risk description is required');
    }
    
    if (request.probability < 0 || request.probability > 1) {
      throw new Error('Probability must be between 0 and 1');
    }
    
    const validTypes = ['technical', 'resource', 'timeline', 'dependency', 'quality', 'scope', 'external'];
    if (!validTypes.includes(request.type)) {
      throw new Error(`Invalid risk type. Must be one of: ${validTypes.join(', ')}`);
    }
    
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(request.severity)) {
      throw new Error(`Invalid severity. Must be one of: ${validSeverities.join(', ')}`);
    }
    
    const validImpacts = ['low', 'medium', 'high', 'critical'];
    if (!validImpacts.includes(request.impact)) {
      throw new Error(`Invalid impact. Must be one of: ${validImpacts.join(', ')}`);
    }
  }

  private validateRiskUpdateRequest(request: UpdateTaskRiskRequest): void {
    if (request.title !== undefined && request.title.trim().length === 0) {
      throw new Error('Risk title cannot be empty');
    }
    
    if (request.description !== undefined && request.description.trim().length === 0) {
      throw new Error('Risk description cannot be empty');
    }
    
    if (request.probability !== undefined && (request.probability < 0 || request.probability > 1)) {
      throw new Error('Probability must be between 0 and 1');
    }
  }

  private async enhanceRiskWithAI(request: AddTaskRiskRequest, task: any): Promise<AddTaskRiskRequest> {
    // Simulate AI enhancement of risk description and mitigation strategies
    await this.simulateAIProcessing(300, 800);
    
    const aiEnhancements = this.generateAIRiskEnhancements(request, task);
    
    return {
      ...request,
      description: request.description + '\n\nAI Analysis: ' + aiEnhancements.analysis,
      mitigation: request.mitigation || aiEnhancements.mitigation
    };
  }

  private generateAIRiskEnhancements(request: AddTaskRiskRequest, task: any): any {
    const analysis = this.generateRiskAnalysis(request, task);
    const mitigation = this.generateMitigationStrategy(request, task);
    
    return { analysis, mitigation };
  }

  private generateRiskAnalysis(request: AddTaskRiskRequest, task: any): string {
    const factors = [];
    
    // Analyze task characteristics
    if (task.type === 'feature' && request.type === 'technical') {
      factors.push('New feature development inherently carries technical implementation risks');
    }
    
    if (task.estimatedHours > 40 && request.type === 'timeline') {
      factors.push('Large task size increases timeline risk due to estimation uncertainty');
    }
    
    if (task.assignee && request.type === 'resource') {
      factors.push('Single assignee creates potential resource bottleneck');
    }
    
    return factors.length > 0 
      ? factors.join('. ') + '.'
      : 'Standard risk factors apply based on task characteristics.';
  }

  private generateMitigationStrategy(request: AddTaskRiskRequest, task: any): MitigationStrategy {
    const actions = [];
    
    // Generate actions based on risk type
    switch (request.type) {
      case 'technical':
        actions.push({
          action: 'Conduct technical proof of concept',
          status: 'pending' as const,
          notes: 'Validate technical approach early to identify issues'
        });
        actions.push({
          action: 'Schedule architecture review',
          status: 'pending' as const,
          notes: 'Get expert input on technical decisions'
        });
        break;
        
      case 'resource':
        actions.push({
          action: 'Identify backup resources',
          status: 'pending' as const,
          notes: 'Cross-train team members to reduce single points of failure'
        });
        actions.push({
          action: 'Review resource allocation',
          status: 'pending' as const,
          notes: 'Ensure adequate capacity for task completion'
        });
        break;
        
      case 'timeline':
        actions.push({
          action: 'Break down into smaller milestones',
          status: 'pending' as const,
          notes: 'Improve visibility and control over progress'
        });
        actions.push({
          action: 'Implement regular check-ins',
          status: 'pending' as const,
          notes: 'Monitor progress and adjust timeline as needed'
        });
        break;
        
      default:
        actions.push({
          action: 'Monitor risk indicators',
          status: 'pending' as const,
          notes: 'Establish metrics to track risk materialization'
        });
    }
    
    return {
      strategy: request.severity === 'critical' ? 'avoid' : 'mitigate',
      actions,
      contingency: 'Escalate to project leadership if risk materializes'
    };
  }

  private async enhanceRiskWithAnalysis(risk: TaskRisk): Promise<TaskRisk> {
    // Add real-time analysis and scoring
    const riskScore = this.calculateRiskScore(risk);
    const trendAnalysis = this.generateRiskTrend(risk);
    
    return {
      ...risk,
      metadata: {
        ...risk.metadata,
        riskScore,
        trend: trendAnalysis,
        lastAnalyzed: new Date().toISOString()
      }
    };
  }

  private calculateRiskScore(risk: TaskRisk): number {
    const severityWeights = { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 };
    const impactWeights = { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 };
    
    const severityWeight = severityWeights[risk.severity];
    const impactWeight = impactWeights[risk.impact];
    
    return Math.round((severityWeight * impactWeight * risk.probability) * 100) / 100;
  }

  private generateRiskTrend(risk: TaskRisk): string {
    // Simple trend analysis based on risk history
    if (risk.history.length < 2) {
      return 'stable';
    }
    
    const recentUpdates = risk.history
      .filter(h => h.action === 'updated')
      .slice(-2);
    
    if (recentUpdates.length === 0) {
      return 'stable';
    }
    
    // Mock trend analysis
    const trends = ['increasing', 'decreasing', 'stable'];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  private async performAIRiskAnalysis(task: any): Promise<AddTaskRiskRequest[]> {
    const risks: AddTaskRiskRequest[] = [];
    
    // Analyze task characteristics for potential risks
    risks.push(...this.analyzeTechnicalRisks(task));
    risks.push(...this.analyzeResourceRisks(task));
    risks.push(...this.analyzeTimelineRisks(task));
    risks.push(...this.analyzeDependencyRisks(task));
    risks.push(...this.analyzeQualityRisks(task));
    
    // Filter and prioritize risks
    return risks.filter(risk => this.shouldIncludeRisk(risk, task));
  }

  private analyzeTechnicalRisks(task: any): AddTaskRiskRequest[] {
    const risks: AddTaskRiskRequest[] = [];
    
    if (task.type === 'feature' && task.estimatedHours > 20) {
      risks.push({
        type: 'technical',
        severity: 'medium',
        probability: 0.6,
        impact: 'medium',
        title: 'Implementation complexity risk',
        description: 'Complex features may encounter unexpected technical challenges during implementation',
        mitigation: {
          strategy: 'mitigate',
          actions: [
            {
              action: 'Create technical spike to validate approach',
              status: 'pending'
            }
          ]
        }
      });
    }
    
    if (task.description?.toLowerCase().includes('integration')) {
      risks.push({
        type: 'technical',
        severity: 'high',
        probability: 0.7,
        impact: 'high',
        title: 'Integration complexity risk',
        description: 'System integration tasks often involve unforeseen compatibility issues',
        mitigation: {
          strategy: 'mitigate',
          actions: [
            {
              action: 'Test integration points early',
              status: 'pending'
            }
          ]
        }
      });
    }
    
    return risks;
  }

  private analyzeResourceRisks(task: any): AddTaskRiskRequest[] {
    const risks: AddTaskRiskRequest[] = [];
    
    if (task.assignee && task.estimatedHours > 30) {
      risks.push({
        type: 'resource',
        severity: 'medium',
        probability: 0.4,
        impact: 'high',
        title: 'Single assignee dependency',
        description: 'Task relies on single team member which creates bottleneck risk',
        mitigation: {
          strategy: 'mitigate',
          actions: [
            {
              action: 'Identify backup assignee',
              status: 'pending'
            }
          ]
        }
      });
    }
    
    return risks;
  }

  private analyzeTimelineRisks(task: any): AddTaskRiskRequest[] {
    const risks: AddTaskRiskRequest[] = [];
    
    if (task.schedule?.dueDate) {
      const dueDate = new Date(task.schedule.dueDate);
      const now = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue < 7 && task.estimatedHours > 20) {
        risks.push({
          type: 'timeline',
          severity: 'high',
          probability: 0.8,
          impact: 'critical',
          title: 'Tight deadline risk',
          description: 'Limited time available for complex task completion',
          mitigation: {
            strategy: 'mitigate',
            actions: [
              {
                action: 'Re-evaluate scope and priorities',
                status: 'pending'
              }
            ]
          }
        });
      }
    }
    
    return risks;
  }

  private analyzeDependencyRisks(task: any): AddTaskRiskRequest[] {
    const risks: AddTaskRiskRequest[] = [];
    
    if (task.dependencies?.dependsOn?.length > 0) {
      risks.push({
        type: 'dependency',
        severity: 'medium',
        probability: 0.5,
        impact: 'medium',
        title: 'Dependency chain risk',
        description: 'Task depends on other tasks which may cause delays',
        mitigation: {
          strategy: 'mitigate',
          actions: [
            {
              action: 'Monitor dependency progress closely',
              status: 'pending'
            }
          ]
        }
      });
    }
    
    return risks;
  }

  private analyzeQualityRisks(task: any): AddTaskRiskRequest[] {
    const risks: AddTaskRiskRequest[] = [];
    
    if (task.type === 'feature' && !task.metadata?.testingRequired) {
      risks.push({
        type: 'quality',
        severity: 'low',
        probability: 0.3,
        impact: 'medium',
        title: 'Insufficient testing risk',
        description: 'New features without adequate testing may introduce quality issues',
        mitigation: {
          strategy: 'mitigate',
          actions: [
            {
              action: 'Define comprehensive testing strategy',
              status: 'pending'
            }
          ]
        }
      });
    }
    
    return risks;
  }

  private shouldIncludeRisk(risk: AddTaskRiskRequest, task: any): boolean {
    // Calculate risk score
    const severityWeights = { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 };
    const impactWeights = { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 };
    
    const riskScore = severityWeights[risk.severity] * impactWeights[risk.impact] * risk.probability;
    
    // Only include risks above minimum threshold
    return riskScore >= this.riskThresholds.low;
  }

  private calculateRiskImpact(task: any, risk: TaskRisk): RiskImpact {
    const impact: RiskImpact = {};
    
    // Calculate schedule impact
    if (risk.type === 'timeline' || risk.type === 'dependency') {
      const baseDelay = task.estimatedHours * 0.1; // 10% base delay
      const severityMultiplier = { low: 1, medium: 2, high: 3, critical: 5 }[risk.severity];
      const delayDays = Math.ceil((baseDelay * severityMultiplier * risk.probability) / 8);
      
      impact.schedule = {
        delayDays,
        confidence: 0.7
      };
    }
    
    // Calculate cost impact
    if (risk.type === 'resource' || risk.type === 'technical') {
      const baseAdditionalHours = task.estimatedHours * 0.15; // 15% base increase
      const severityMultiplier = { low: 1, medium: 1.5, high: 2, critical: 3 }[risk.severity];
      const additionalHours = Math.ceil(baseAdditionalHours * severityMultiplier * risk.probability);
      
      impact.cost = {
        additionalHours,
        additionalCost: additionalHours * 100, // $100/hour estimate
        confidence: 0.6
      };
    }
    
    // Calculate quality impact
    if (risk.type === 'quality' || risk.type === 'technical') {
      const qualityScore = Math.max(0, 100 - (risk.probability * 50));
      impact.quality = {
        score: qualityScore,
        areas: ['functionality', 'reliability', 'performance']
      };
    }
    
    return impact;
  }

  private generateRiskAnalytics(risks: TaskRisk[], tasks: any[]): any {
    const analytics = {
      summary: {
        totalRisks: risks.length,
        risksByType: this.groupRisksByType(risks),
        risksBySeverity: this.groupRisksBySeverity(risks),
        averageRiskScore: this.calculateAverageRiskScore(risks),
        risksPerTask: risks.length / Math.max(tasks.length, 1)
      },
      trends: {
        riskIdentificationRate: this.calculateRiskIdentificationRate(risks),
        mitigationEffectiveness: this.calculateMitigationEffectiveness(risks),
        riskResolutionTime: this.calculateAverageResolutionTime(risks)
      },
      distribution: {
        byCategory: this.generateCategoryDistribution(risks),
        byOwner: this.generateOwnerDistribution(risks),
        byStatus: this.generateStatusDistribution(risks)
      },
      recommendations: this.generateRiskRecommendations(risks, tasks)
    };
    
    return analytics;
  }

  private groupRisksByType(risks: TaskRisk[]): Record<string, number> {
    const groups: Record<string, number> = {};
    risks.forEach(risk => {
      groups[risk.type] = (groups[risk.type] || 0) + 1;
    });
    return groups;
  }

  private groupRisksBySeverity(risks: TaskRisk[]): Record<string, number> {
    const groups: Record<string, number> = {};
    risks.forEach(risk => {
      groups[risk.severity] = (groups[risk.severity] || 0) + 1;
    });
    return groups;
  }

  private calculateAverageRiskScore(risks: TaskRisk[]): number {
    if (risks.length === 0) return 0;
    
    const totalScore = risks.reduce((sum, risk) => {
      return sum + this.calculateRiskScore(risk);
    }, 0);
    
    return Math.round((totalScore / risks.length) * 100) / 100;
  }

  private calculateRiskIdentificationRate(risks: TaskRisk[]): number {
    // Mock calculation - in reality would track over time
    return Math.round(risks.length / 7); // Risks per week
  }

  private calculateMitigationEffectiveness(risks: TaskRisk[]): number {
    const mitigatedRisks = risks.filter(r => r.status === 'mitigated').length;
    return risks.length > 0 ? Math.round((mitigatedRisks / risks.length) * 100) / 100 : 0;
  }

  private calculateAverageResolutionTime(risks: TaskRisk[]): number {
    const resolvedRisks = risks.filter(r => r.status === 'closed');
    if (resolvedRisks.length === 0) return 0;
    
    // Mock calculation - would use actual timestamps
    return 5; // 5 days average
  }

  private generateCategoryDistribution(risks: TaskRisk[]): any[] {
    const distribution = this.groupRisksByType(risks);
    return Object.entries(distribution).map(([type, count]) => ({
      category: type,
      count,
      percentage: Math.round((count / risks.length) * 100)
    }));
  }

  private generateOwnerDistribution(risks: TaskRisk[]): any[] {
    const distribution: Record<string, number> = {};
    risks.forEach(risk => {
      const owner = risk.owner?.name || 'Unassigned';
      distribution[owner] = (distribution[owner] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([owner, count]) => ({
      owner,
      count,
      percentage: Math.round((count / risks.length) * 100)
    }));
  }

  private generateStatusDistribution(risks: TaskRisk[]): any[] {
    const distribution: Record<string, number> = {};
    risks.forEach(risk => {
      distribution[risk.status] = (distribution[risk.status] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / risks.length) * 100)
    }));
  }

  private generateRiskRecommendations(risks: TaskRisk[], tasks: any[]): string[] {
    const recommendations = [];
    
    const highRisks = risks.filter(r => r.severity === 'high' || r.severity === 'critical');
    if (highRisks.length > risks.length * 0.3) {
      recommendations.push('High proportion of severe risks detected - consider additional risk mitigation measures');
    }
    
    const unassignedRisks = risks.filter(r => !r.owner);
    if (unassignedRisks.length > 0) {
      recommendations.push('Assign owners to unassigned risks to ensure proper tracking and mitigation');
    }
    
    const openRisks = risks.filter(r => r.status === 'open');
    if (openRisks.length > risks.length * 0.5) {
      recommendations.push('Focus on closing open risks to reduce project risk exposure');
    }
    
    return recommendations;
  }

  private async publishRiskIdentifiedEvent(task: any, risk: TaskRisk): Promise<void> {
    const aiProcessing: AIProcessingMetadata = {
      model: 'risk-analysis-v1',
      processingTime: 1500,
      confidenceScore: 0.8,
      dataQuality: {
        score: 0.85,
        issues: []
      }
    };

    const payload: TaskRiskIdentifiedPayload = {
      eventId: uuidv4(),
      eventType: 'task.risk_identified',
      timestamp: new Date().toISOString(),
      source: 'task-risk-service',
      version: '1.0',
      userId: 'risk-system',
      correlationId: uuidv4(),
      data: {
        taskId: task.id,
        taskTitle: task.title,
        riskId: risk.id,
        risk: {
          category: risk.type as any,
          severity: risk.severity as any,
          probability: risk.probability,
          impact: this.calculateRiskImpact(task, risk),
          description: risk.description,
          indicators: [
            {
              type: 'complexity',
              value: task.estimatedHours?.toString() || '0',
              significance: 'medium'
            }
          ],
          triggers: [
            {
              condition: 'task progress stalls',
              metric: 'progress_rate',
              threshold: '<10% per week'
            }
          ]
        },
        mitigation: {
          strategies: [
            {
              type: risk.mitigation.strategy as any,
              description: risk.mitigation.actions[0]?.action || 'Monitor and assess',
              effort: 4,
              cost: 400,
              effectiveness: 0.8,
              priority: risk.severity as any
            }
          ],
          recommendations: [
            'Implement regular risk monitoring',
            'Establish clear escalation procedures'
          ],
          contingencyPlans: [
            {
              trigger: 'Risk materializes',
              action: 'Escalate to project leadership',
              owner: risk.owner?.name
            }
          ]
        },
        monitoring: {
          metrics: [
            {
              name: 'task_progress',
              type: 'percentage',
              threshold: '>10% weekly',
              frequency: 'weekly'
            }
          ],
          reviewSchedule: 'weekly',
          escalationPath: ['team_lead', 'project_manager', 'technical_director']
        },
        aiProcessing,
        project: task.project,
        assignee: task.assignee
      }
    };

    await this.eventService.publish('task.risk_identified', payload);
  }

  /**
   * Get risk service statistics
   * @returns Object containing risk service statistics
   */
  getRiskStatistics(): any {
    return {
      riskModels: this.riskAnalysisModels.size,
      riskThresholds: this.riskThresholds,
      modelVersion: '1.0'
    };
  }
}