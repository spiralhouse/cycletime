import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { logger } from '@cycletime/shared-utils';
import { EventService } from './event-service';
import { MockDataService } from './mock-data-service';
import { NotFoundError } from '../utils/error-handler';
import {
  ProjectAnalyticsResponse,
  ProjectForecastingResponse,
  AnalyticsTimeRange,
  AnalyticsUpdatedEvent
} from '../types';

export class AnalyticsService {
  constructor(
    private eventService: EventService,
    private mockDataService: MockDataService
  ) {
    logger.info('AnalyticsService initialized');
  }

  /**
   * Get project analytics
   */
  async getProjectAnalytics(
    projectId: string,
    timeRange: AnalyticsTimeRange = 'month',
    metrics?: string[]
  ): Promise<ProjectAnalyticsResponse> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Generate analytics data
      const analytics = this.mockDataService.generateProjectAnalytics(projectId, timeRange);

      // Filter metrics if specified
      if (metrics && metrics.length > 0) {
        // In a real implementation, this would filter the returned metrics
        logger.debug('Filtering metrics:', metrics);
      }

      // Publish analytics updated event
      await this.publishAnalyticsUpdatedEvent(projectId, project.name, 'performance', timeRange, analytics);

      logger.info('Generated project analytics:', { projectId, timeRange });

      return analytics;
    } catch (error) {
      logger.error('Error getting project analytics:', error as Error);
      throw error;
    }
  }

  /**
   * Get project forecasting
   */
  async getProjectForecasting(projectId: string, horizon: number = 90): Promise<ProjectForecastingResponse> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Validate horizon
      if (horizon < 7 || horizon > 365) {
        throw new Error('Horizon must be between 7 and 365 days');
      }

      // Generate forecasting data
      const forecasting = this.mockDataService.generateProjectForecasting(projectId, horizon);

      // Publish analytics updated event
      await this.publishAnalyticsUpdatedEvent(
        projectId,
        project.name,
        'forecasting',
        'month',
        { confidence: forecasting.predictions.confidence }
      );

      logger.info('Generated project forecasting:', { projectId, horizon });

      return forecasting;
    } catch (error) {
      logger.error('Error getting project forecasting:', error as Error);
      throw error;
    }
  }

  /**
   * Generate analytics for multiple projects
   */
  async getMultiProjectAnalytics(
    projectIds: string[],
    timeRange: AnalyticsTimeRange = 'month'
  ): Promise<{ projectId: string; analytics: ProjectAnalyticsResponse }[]> {
    try {
      const results = [];

      for (const projectId of projectIds) {
        try {
          const analytics = await this.getProjectAnalytics(projectId, timeRange);
          results.push({ projectId, analytics });
        } catch (error) {
          logger.error(`Error getting analytics for project ${projectId}:`, error as Error);
          // Continue with other projects
        }
      }

      logger.info('Generated multi-project analytics:', { 
        projectCount: projectIds.length,
        successCount: results.length,
        timeRange 
      });

      return results;
    } catch (error) {
      logger.error('Error getting multi-project analytics:', error as Error);
      throw error;
    }
  }

  /**
   * Get team performance analytics
   */
  async getTeamPerformanceAnalytics(
    projectId: string,
    timeRange: AnalyticsTimeRange = 'month'
  ): Promise<any> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Get project analytics
      const analytics = await this.getProjectAnalytics(projectId, timeRange);

      // Extract team metrics
      const teamMetrics = analytics.teamMetrics;
      if (!teamMetrics) {
        return { projectId, teamMetrics: undefined };
      }

      // Calculate additional team insights
      const teamInsights = this.calculateTeamInsights(teamMetrics);

      logger.info('Generated team performance analytics:', { projectId, timeRange });

      return {
        projectId,
        timeRange,
        teamMetrics,
        insights: teamInsights
      };
    } catch (error) {
      logger.error('Error getting team performance analytics:', error as Error);
      throw error;
    }
  }

  /**
   * Get project health score
   */
  async getProjectHealthScore(projectId: string): Promise<{
    projectId: string;
    healthScore: number;
    factors: Array<{ name: string; score: number; weight: number; impact: string }>;
    recommendations: string[];
  }> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Get analytics data
      const analytics = await this.getProjectAnalytics(projectId, 'month');

      // Calculate health factors
      const factors = [
        {
          name: 'Progress',
          score: project.progress,
          weight: 0.3,
          impact: 'Project completion percentage'
        },
        {
          name: 'Velocity',
          score: Math.min(analytics.summary.teamVelocity / 30 * 100, 100),
          weight: 0.2,
          impact: 'Team delivery speed'
        },
        {
          name: 'Quality',
          score: analytics.performance.qualityMetrics?.testCoverage || 80,
          weight: 0.2,
          impact: 'Code quality metrics'
        },
        {
          name: 'Timeline',
          score: analytics.summary.overdueTasks === 0 ? 100 : Math.max(0, 100 - (analytics.summary.overdueTasks * 10)),
          weight: 0.15,
          impact: 'Schedule adherence'
        },
        {
          name: 'Team Collaboration',
          score: analytics.teamMetrics?.collaboration ? 85 : 70,
          weight: 0.15,
          impact: 'Team communication and cooperation'
        }
      ];

      // Calculate weighted health score
      const healthScore = factors.reduce((sum, factor) => {
        return sum + (factor.score * factor.weight);
      }, 0);

      // Generate recommendations
      const recommendations = this.generateHealthRecommendations(factors, healthScore);

      logger.info('Generated project health score:', { projectId, healthScore });

      return {
        projectId,
        healthScore: Math.round(healthScore),
        factors,
        recommendations
      };
    } catch (error) {
      logger.error('Error getting project health score:', error as Error);
      throw error;
    }
  }

  /**
   * Calculate team insights
   */
  private calculateTeamInsights(teamMetrics: any): any {
    const productivity = teamMetrics.productivity || [];
    const collaboration = teamMetrics.collaboration || {};

    // Calculate productivity metrics
    const avgEfficiency = productivity.reduce((sum: number, member: any) => sum + member.efficiency, 0) / productivity.length;
    const avgTasksCompleted = productivity.reduce((sum: number, member: any) => sum + member.tasksCompleted, 0) / productivity.length;
    const avgHoursWorked = productivity.reduce((sum: number, member: any) => sum + member.hoursWorked, 0) / productivity.length;

    // Identify high and low performers
    const highPerformers = productivity.filter((member: any) => member.efficiency > avgEfficiency * 1.2);
    const lowPerformers = productivity.filter((member: any) => member.efficiency < avgEfficiency * 0.8);

    return {
      averageEfficiency: avgEfficiency,
      averageTasksCompleted: avgTasksCompleted,
      averageHoursWorked: avgHoursWorked,
      highPerformers: highPerformers.length,
      lowPerformers: lowPerformers.length,
      collaborationScore: collaboration.knowledgeSharing || 0,
      recommendations: [
        avgEfficiency < 0.8 ? 'Consider team capacity planning and workload redistribution' : null,
        collaboration.pairProgramming < 0.2 ? 'Encourage more pair programming sessions' : null,
        lowPerformers.length > highPerformers.length ? 'Focus on team skill development and mentoring' : undefined
      ].filter(Boolean)
    };
  }

  /**
   * Generate health recommendations
   */
  private generateHealthRecommendations(factors: any[], healthScore: number): string[] {
    const recommendations: string[] = [];

    // Overall health recommendations
    if (healthScore < 60) {
      recommendations.push('Project health is concerning. Consider immediate intervention.');
    } else if (healthScore < 80) {
      recommendations.push('Project health is moderate. Focus on improvement areas.');
    }

    // Factor-specific recommendations
    for (const factor of factors) {
      if (factor.score < 70) {
        switch (factor.name) {
          case 'Progress':
            recommendations.push('Progress is behind schedule. Review scope and timeline.');
            break;
          case 'Velocity':
            recommendations.push('Team velocity is low. Consider removing blockers or adding resources.');
            break;
          case 'Quality':
            recommendations.push('Quality metrics need improvement. Increase testing and code review.');
            break;
          case 'Timeline':
            recommendations.push('Timeline adherence is poor. Review task estimation and dependencies.');
            break;
          case 'Team Collaboration':
            recommendations.push('Team collaboration could be improved. Consider team building activities.');
            break;
        }
      }
    }

    return recommendations;
  }

  /**
   * Publish analytics updated event
   */
  private async publishAnalyticsUpdatedEvent(
    projectId: string,
    projectName: string,
    analyticsType: 'performance' | 'velocity' | 'burndown' | 'forecasting' | 'team',
    timeRange: string,
    metrics: any
  ): Promise<void> {
    const event: AnalyticsUpdatedEvent = {
      eventId: uuidv4(),
      eventType: 'project.analytics.updated',
      timestamp: moment().toISOString(),
      source: 'project-service',
      version: '1.0',
      data: {
        projectId,
        projectName,
        analyticsType,
        timeRange,
        metrics: {
          previousValue: undefined,
          currentValue: typeof metrics === 'object' ? Object.keys(metrics).length : metrics,
          trend: 'stable',
          percentageChange: undefined
        },
        insights: [],
        generatedAt: moment().toISOString()
      }
    };

    await this.eventService.publishEvent(event);
  }
}