import { v4 as uuidv4 } from 'uuid';
import * as moment from 'moment';
import { logger } from '@cycletime/shared-utils';
import { EventService } from './event-service';
import { MockDataService } from './mock-data-service';
import { NotFoundError } from '../utils/error-handler';
import {
  ProjectInsightsResponse,
  InsightCategory,
  InsightGeneratedEvent
} from '../types';

export class InsightService {
  constructor(
    private eventService: EventService,
    private mockDataService: MockDataService
  ) {
    logger.info('InsightService initialized');
  }

  /**
   * Get AI-powered insights for a project
   */
  async getProjectInsights(
    projectId: string,
    category?: InsightCategory
  ): Promise<ProjectInsightsResponse> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Generate insights
      const insights = this.mockDataService.generateProjectInsights(projectId, category);

      // Publish insight generation events
      for (const insight of insights.insights) {
        await this.publishInsightGeneratedEvent(projectId, project.name, insight);
      }

      logger.info('Generated project insights:', { 
        projectId, 
        category, 
        insightCount: insights.insights.length 
      });

      return insights;
    } catch (error) {
      logger.error('Error getting project insights:', error);
      throw error;
    }
  }

  /**
   * Generate risk analysis for a project
   */
  async generateRiskAnalysis(projectId: string): Promise<{
    projectId: string;
    risks: Array<{
      id: string;
      type: 'schedule' | 'budget' | 'scope' | 'team' | 'technical' | 'external';
      severity: 'low' | 'medium' | 'high' | 'critical';
      probability: number;
      impact: string;
      description: string;
      mitigation: string[];
      detectedAt: string;
    }>;
    summary: {
      totalRisks: number;
      criticalRisks: number;
      highRisks: number;
      riskScore: number;
      recommendations: string[];
    };
  }> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Get project analytics for risk assessment
      const analytics = this.mockDataService.generateProjectAnalytics(projectId, 'month');
      
      // Generate risk analysis
      const risks = this.analyzeProjectRisks(project, analytics);
      
      // Calculate risk summary
      const summary = this.calculateRiskSummary(risks);

      // Publish risk identified events
      for (const risk of risks.filter(r => r.severity === 'high' || r.severity === 'critical')) {
        await this.publishRiskIdentifiedEvent(projectId, project.name, risk);
      }

      logger.info('Generated risk analysis:', { 
        projectId, 
        riskCount: risks.length,
        riskScore: summary.riskScore 
      });

      return {
        projectId,
        risks,
        summary
      };
    } catch (error) {
      logger.error('Error generating risk analysis:', error);
      throw error;
    }
  }

  /**
   * Generate performance recommendations
   */
  async generatePerformanceRecommendations(projectId: string): Promise<{
    projectId: string;
    recommendations: Array<{
      id: string;
      category: 'process' | 'team' | 'technology' | 'planning' | 'communication';
      priority: 'low' | 'medium' | 'high' | 'urgent';
      title: string;
      description: string;
      expectedImpact: string;
      effort: 'low' | 'medium' | 'high';
      timeline: string;
      dependencies: string[];
    }>;
    summary: {
      totalRecommendations: number;
      highPriorityCount: number;
      estimatedImpact: number;
      implementationScore: number;
    };
  }> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Get project data for analysis
      const analytics = this.mockDataService.generateProjectAnalytics(projectId, 'month');
      const team = this.mockDataService.getProjectTeam(projectId);

      // Generate performance recommendations
      const recommendations = this.generatePerformanceRecommendations(project, analytics, team);
      
      // Calculate summary
      const summary = this.calculateRecommendationSummary(recommendations);

      logger.info('Generated performance recommendations:', { 
        projectId, 
        recommendationCount: recommendations.length,
        implementationScore: summary.implementationScore 
      });

      return {
        projectId,
        recommendations,
        summary
      };
    } catch (error) {
      logger.error('Error generating performance recommendations:', error);
      throw error;
    }
  }

  /**
   * Generate predictive insights
   */
  async generatePredictiveInsights(projectId: string): Promise<{
    projectId: string;
    predictions: Array<{
      id: string;
      type: 'completion_date' | 'budget_overrun' | 'scope_creep' | 'team_velocity' | 'quality_issues';
      confidence: number;
      prediction: string;
      likelihood: number;
      impact: string;
      timeline: string;
      preventiveMeasures: string[];
    }>;
    summary: {
      totalPredictions: number;
      highConfidenceCount: number;
      averageConfidence: number;
      criticalPredictions: number;
    };
  }> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Get project data for prediction
      const analytics = this.mockDataService.generateProjectAnalytics(projectId, 'month');
      const forecasting = this.mockDataService.generateProjectForecasting(projectId, 90);

      // Generate predictive insights
      const predictions = this.generatePredictiveInsights(project, analytics, forecasting);
      
      // Calculate summary
      const summary = this.calculatePredictionSummary(predictions);

      logger.info('Generated predictive insights:', { 
        projectId, 
        predictionCount: predictions.length,
        averageConfidence: summary.averageConfidence 
      });

      return {
        projectId,
        predictions,
        summary
      };
    } catch (error) {
      logger.error('Error generating predictive insights:', error);
      throw error;
    }
  }

  /**
   * Analyze project risks
   */
  private analyzeProjectRisks(project: any, analytics: any): any[] {
    const risks = [];

    // Schedule risk analysis
    if (project.progress < 50 && analytics.summary.overdueTasks > 5) {
      risks.push({
        id: uuidv4(),
        type: 'schedule',
        severity: 'high',
        probability: 0.8,
        impact: 'Project may miss deadline by 2-4 weeks',
        description: 'High number of overdue tasks with low progress indicates schedule risk',
        mitigation: ['Reassign critical tasks', 'Add resources', 'Reduce scope'],
        detectedAt: moment().toISOString()
      });
    }

    // Budget risk analysis
    if (project.resources?.budgetUsed && project.resources?.budget) {
      const budgetUtilization = project.resources.budgetUsed / project.resources.budget;
      if (budgetUtilization > 0.8 && project.progress < 80) {
        risks.push({
          id: uuidv4(),
          type: 'budget',
          severity: 'critical',
          probability: 0.9,
          impact: 'Budget overrun expected by 20-30%',
          description: 'Budget consumption is ahead of project progress',
          mitigation: ['Review budget allocation', 'Optimize resource usage', 'Renegotiate scope'],
          detectedAt: moment().toISOString()
        });
      }
    }

    // Team risk analysis
    if (analytics.summary.teamVelocity < 15) {
      risks.push({
        id: uuidv4(),
        type: 'team',
        severity: 'medium',
        probability: 0.6,
        impact: 'Reduced team productivity may delay deliverables',
        description: 'Team velocity is below expected threshold',
        mitigation: ['Team retrospective', 'Remove blockers', 'Provide training'],
        detectedAt: moment().toISOString()
      });
    }

    // Technical risk analysis
    if (analytics.performance.qualityMetrics?.testCoverage < 70) {
      risks.push({
        id: uuidv4(),
        type: 'technical',
        severity: 'medium',
        probability: 0.7,
        impact: 'Quality issues may emerge in production',
        description: 'Low test coverage indicates potential quality risks',
        mitigation: ['Increase test coverage', 'Code review process', 'Quality gates'],
        detectedAt: moment().toISOString()
      });
    }

    return risks;
  }

  /**
   * Calculate risk summary
   */
  private calculateRiskSummary(risks: any[]): any {
    const totalRisks = risks.length;
    const criticalRisks = risks.filter(r => r.severity === 'critical').length;
    const highRisks = risks.filter(r => r.severity === 'high').length;
    
    // Calculate risk score (0-100)
    const riskScore = risks.reduce((score, risk) => {
      const severityWeight = { low: 1, medium: 2, high: 3, critical: 4 };
      return score + (severityWeight[risk.severity] * risk.probability * 25);
    }, 0);

    const recommendations = [
      criticalRisks > 0 ? 'Address critical risks immediately' : null,
      highRisks > 2 ? 'Develop mitigation plans for high-severity risks' : null,
      riskScore > 50 ? 'Consider risk management workshop' : null
    ].filter(Boolean);

    return {
      totalRisks,
      criticalRisks,
      highRisks,
      riskScore: Math.min(riskScore, 100),
      recommendations
    };
  }

  /**
   * Generate performance recommendations
   */
  private generatePerformanceRecommendations(project: any, analytics: any, team: any[]): any[] {
    const recommendations = [];

    // Process improvements
    if (analytics.performance.cycleTime > 120) {
      recommendations.push({
        id: uuidv4(),
        category: 'process',
        priority: 'high',
        title: 'Reduce Cycle Time',
        description: 'Implement process improvements to reduce task cycle time',
        expectedImpact: 'Reduce cycle time by 30-40%',
        effort: 'medium',
        timeline: '2-3 weeks',
        dependencies: ['Team training', 'Process documentation']
      });
    }

    // Team improvements
    if (team.length < 5 && analytics.summary.teamVelocity > 25) {
      recommendations.push({
        id: uuidv4(),
        category: 'team',
        priority: 'medium',
        title: 'Expand Team Size',
        description: 'Consider adding team members to handle increased workload',
        expectedImpact: 'Increase delivery capacity by 25%',
        effort: 'high',
        timeline: '4-6 weeks',
        dependencies: ['Budget approval', 'Hiring process']
      });
    }

    // Technology improvements
    if (analytics.performance.qualityMetrics?.codeReviewTime > 6) {
      recommendations.push({
        id: uuidv4(),
        category: 'technology',
        priority: 'medium',
        title: 'Automate Code Review',
        description: 'Implement automated code review tools to reduce review time',
        expectedImpact: 'Reduce review time by 50%',
        effort: 'low',
        timeline: '1-2 weeks',
        dependencies: ['Tool selection', 'CI/CD integration']
      });
    }

    return recommendations;
  }

  /**
   * Calculate recommendation summary
   */
  private calculateRecommendationSummary(recommendations: any[]): any {
    const totalRecommendations = recommendations.length;
    const highPriorityCount = recommendations.filter(r => r.priority === 'high' || r.priority === 'urgent').length;
    const estimatedImpact = recommendations.length * 15; // Mock impact percentage
    const implementationScore = 100 - (recommendations.filter(r => r.effort === 'high').length * 20);

    return {
      totalRecommendations,
      highPriorityCount,
      estimatedImpact,
      implementationScore
    };
  }

  /**
   * Generate predictive insights
   */
  private generatePredictiveInsights(project: any, analytics: any, forecasting: any): any[] {
    const predictions = [];

    // Completion date prediction
    predictions.push({
      id: uuidv4(),
      type: 'completion_date',
      confidence: forecasting.predictions.confidence,
      prediction: `Project will complete on ${moment(forecasting.predictions.completionDate).format('YYYY-MM-DD')}`,
      likelihood: forecasting.predictions.confidence,
      impact: 'Timeline adherence',
      timeline: 'Project completion',
      preventiveMeasures: ['Regular progress reviews', 'Proactive risk management']
    });

    // Budget prediction
    if (project.resources?.budget) {
      const budgetRisk = forecasting.predictions.budgetForecast > project.resources.budget ? 0.7 : 0.3;
      predictions.push({
        id: uuidv4(),
        type: 'budget_overrun',
        confidence: budgetRisk,
        prediction: `Budget ${budgetRisk > 0.5 ? 'likely to exceed' : 'expected to stay within'} allocated amount`,
        likelihood: budgetRisk,
        impact: 'Financial impact',
        timeline: 'Throughout project',
        preventiveMeasures: ['Cost tracking', 'Resource optimization', 'Scope management']
      });
    }

    // Velocity prediction
    predictions.push({
      id: uuidv4(),
      type: 'team_velocity',
      confidence: 0.8,
      prediction: `Team velocity expected to ${analytics.summary.teamVelocity > 20 ? 'maintain' : 'improve'} current levels`,
      likelihood: 0.8,
      impact: 'Delivery capacity',
      timeline: 'Next 2-3 sprints',
      preventiveMeasures: ['Team capacity planning', 'Skill development', 'Process optimization']
    });

    return predictions;
  }

  /**
   * Calculate prediction summary
   */
  private calculatePredictionSummary(predictions: any[]): any {
    const totalPredictions = predictions.length;
    const highConfidenceCount = predictions.filter(p => p.confidence > 0.7).length;
    const averageConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
    const criticalPredictions = predictions.filter(p => p.confidence > 0.8 && p.likelihood > 0.7).length;

    return {
      totalPredictions,
      highConfidenceCount,
      averageConfidence,
      criticalPredictions
    };
  }

  /**
   * Publish insight generated event
   */
  private async publishInsightGeneratedEvent(
    projectId: string,
    projectName: string,
    insight: any
  ): Promise<void> {
    const event: InsightGeneratedEvent = {
      eventId: uuidv4(),
      eventType: 'project.insight.generated',
      timestamp: moment().toISOString(),
      source: 'project-service',
      version: '1.0',
      data: {
        projectId,
        projectName,
        insight: {
          id: insight.id,
          category: insight.category,
          type: insight.type,
          severity: insight.severity,
          title: insight.title,
          description: insight.description,
          confidence: insight.confidence,
          impact: insight.impact
        },
        evidence: insight.evidence,
        recommendations: insight.recommendations,
        generatedBy: 'ai_analysis',
        modelVersion: '1.0.0'
      }
    };

    await this.eventService.publishEvent(event);
  }

  /**
   * Publish risk identified event
   */
  private async publishRiskIdentifiedEvent(
    projectId: string,
    projectName: string,
    risk: any
  ): Promise<void> {
    const event = {
      eventId: uuidv4(),
      eventType: 'project.risk.identified' as const,
      timestamp: moment().toISOString(),
      source: 'project-service',
      version: '1.0',
      data: {
        projectId,
        projectName,
        risk: {
          id: risk.id,
          type: risk.type,
          severity: risk.severity,
          probability: risk.probability,
          title: `${risk.type} Risk`,
          description: risk.description,
          impact: risk.impact,
          identifiedBy: 'ai_analysis'
        },
        evidence: [],
        mitigation: {
          recommended: risk.mitigation,
          effort: 'medium',
          timeline: '1-2 weeks'
        }
      }
    };

    await this.eventService.publishEvent(event);
  }
}