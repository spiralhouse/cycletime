import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { logger } from '@cycletime/shared-utils';
import { EventService } from './event-service';
import { MockDataService } from './mock-data-service';
import { NotFoundError, ValidationError } from '../utils/error-handler';
import {
  ResourceAllocationResponse,
  CapacityPlanningResponse,
  AllocateResourcesRequest,
  CapacityTimeframe
} from '../types';

export class ResourceService {
  constructor(
    private eventService: EventService,
    private mockDataService: MockDataService
  ) {
    logger.info('ResourceService initialized');
  }

  /**
   * Get resource allocation for a project
   */
  async getResourceAllocation(projectId: string): Promise<ResourceAllocationResponse> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Generate resource allocation data
      const allocation = this.mockDataService.generateResourceAllocation(projectId);

      logger.info('Generated resource allocation:', { projectId });

      return allocation;
    } catch (error) {
      logger.error('Error getting resource allocation:', error as Error);
      throw error;
    }
  }

  /**
   * Allocate resources to a project
   */
  async allocateResources(
    projectId: string,
    request: AllocateResourcesRequest,
    userId: string
  ): Promise<ResourceAllocationResponse> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Validate resource allocation request
      this.validateResourceAllocation(request);

      // In a real implementation, this would:
      // 1. Check resource availability
      // 2. Reserve resources
      // 3. Update project budget
      // 4. Create allocation records
      // 5. Send notifications

      // For now, simulate allocation by updating project resources
      const totalCost = request.resources.reduce((sum, resource) => sum + resource.cost, 0);
      const updatedProject = this.mockDataService.updateProject(projectId, {
        resources: {
          ...project.resources,
          budgetUsed: (project.resources?.budgetUsed || 0) + totalCost
        }
      });

      if (!updatedProject) {
        throw new NotFoundError('Project', projectId);
      }

      // Publish resource allocation events
      for (const resource of request.resources) {
        await this.publishResourceAllocatedEvent(projectId, project.name, resource, userId);
      }

      // Get updated allocation
      const allocation = await this.getResourceAllocation(projectId);

      logger.info('Allocated resources to project:', { 
        projectId, 
        resourceCount: request.resources.length,
        totalCost 
      });

      return allocation;
    } catch (error) {
      logger.error('Error allocating resources:', error as Error);
      throw error;
    }
  }

  /**
   * Deallocate resources from a project
   */
  async deallocateResources(
    projectId: string,
    resourceIds: string[],
    userId: string
  ): Promise<ResourceAllocationResponse> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // In a real implementation, this would:
      // 1. Validate resource ownership
      // 2. Check if resources can be deallocated
      // 3. Update allocation records
      // 4. Update project budget
      // 5. Send notifications

      // For now, simulate deallocation
      for (const resourceId of resourceIds) {
        await this.publishResourceDeallocatedEvent(projectId, project.name, resourceId, userId);
      }

      // Get updated allocation
      const allocation = await this.getResourceAllocation(projectId);

      logger.info('Deallocated resources from project:', { 
        projectId, 
        resourceCount: resourceIds.length 
      });

      return allocation;
    } catch (error) {
      logger.error('Error deallocating resources:', error as Error);
      throw error;
    }
  }

  /**
   * Get capacity planning for a project
   */
  async getCapacityPlanning(
    projectId: string,
    timeframe: CapacityTimeframe = 'month'
  ): Promise<CapacityPlanningResponse> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Generate capacity planning data
      const capacityPlanning = this.mockDataService.generateCapacityPlanning(projectId, timeframe);

      logger.info('Generated capacity planning:', { projectId, timeframe });

      return capacityPlanning;
    } catch (error) {
      logger.error('Error getting capacity planning:', error as Error);
      throw error;
    }
  }

  /**
   * Analyze resource utilization
   */
  async analyzeResourceUtilization(
    projectId: string,
    timeRange: { start: string; end: string }
  ): Promise<{
    projectId: string;
    period: { start: string; end: string };
    utilization: {
      overall: number;
      byResourceType: Record<string, number>;
      byTeamMember: Array<{ memberId: string; memberName: string; utilization: number }>;
    };
    recommendations: string[];
    trends: Array<{ date: string; utilization: number }>;
  }> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Get resource allocation and team data
      const allocation = await this.getResourceAllocation(projectId);
      const team = this.mockDataService.getProjectTeam(projectId);

      // Calculate utilization metrics
      const overallUtilization = allocation.summary.utilizationRate;
      
      const byResourceType = allocation.resources.reduce((acc, resource) => {
        acc[resource.type] = resource.utilization;
        return acc;
      }, {} as Record<string, number>);

      const byTeamMember = team.map(member => ({
        memberId: member.id,
        memberName: member.name,
        utilization: member.allocation?.percentage || 0
      }));

      // Generate trends (mock data for demonstration)
      const trends = this.generateUtilizationTrends(timeRange);

      // Generate recommendations
      const recommendations = this.generateUtilizationRecommendations(
        overallUtilization,
        byResourceType,
        byTeamMember
      );

      logger.info('Analyzed resource utilization:', { projectId, overallUtilization });

      return {
        projectId,
        period: timeRange,
        utilization: {
          overall: overallUtilization,
          byResourceType,
          byTeamMember
        },
        recommendations,
        trends
      };
    } catch (error) {
      logger.error('Error analyzing resource utilization:', error as Error);
      throw error;
    }
  }

  /**
   * Optimize resource allocation
   */
  async optimizeResourceAllocation(
    projectId: string,
    constraints: {
      maxBudget?: number;
      targetUtilization?: number;
      skillRequirements?: string[];
    }
  ): Promise<{
    projectId: string;
    currentAllocation: ResourceAllocationResponse;
    optimizedAllocation: any;
    improvements: Array<{ metric: string; current: number; optimized: number; improvement: number }>;
    recommendations: string[];
  }> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Get current allocation
      const currentAllocation = await this.getResourceAllocation(projectId);

      // In a real implementation, this would use optimization algorithms
      // For now, generate mock optimization results
      const optimizedAllocation = this.generateOptimizedAllocation(currentAllocation, constraints);

      const improvements = [
        {
          metric: 'Budget Utilization',
          current: currentAllocation.summary.utilizationRate,
          optimized: Math.min(currentAllocation.summary.utilizationRate + 0.15, 0.95),
          improvement: 0.15
        },
        {
          metric: 'Resource Efficiency',
          current: 0.75,
          optimized: 0.85,
          improvement: 0.10
        }
      ];

      const recommendations = [
        'Reallocate underutilized resources to high-demand areas',
        'Consider cross-training team members for better flexibility',
        'Optimize task scheduling to reduce idle time'
      ];

      logger.info('Optimized resource allocation:', { projectId });

      return {
        projectId,
        currentAllocation,
        optimizedAllocation,
        improvements,
        recommendations
      };
    } catch (error) {
      logger.error('Error optimizing resource allocation:', error as Error);
      throw error;
    }
  }

  /**
   * Validate resource allocation request
   */
  private validateResourceAllocation(request: AllocateResourcesRequest): void {
    if (!request.resources || request.resources.length === 0) {
      throw new ValidationError('At least one resource must be specified');
    }

    for (const resource of request.resources) {
      if (!resource.name || resource.name.trim() === '') {
        throw new ValidationError('Resource name is required');
      }

      if (resource.amount <= 0) {
        throw new ValidationError('Resource amount must be positive');
      }

      if (resource.cost < 0) {
        throw new ValidationError('Resource cost cannot be negative');
      }

      if (resource.period && new Date(resource.period.start) >= new Date(resource.period.end)) {
        throw new ValidationError('Resource period start date must be before end date');
      }
    }
  }

  /**
   * Generate utilization trends
   */
  private generateUtilizationTrends(timeRange: { start: string; end: string }): Array<{ date: string; utilization: number }> {
    const trends = [];
    const start = moment(timeRange.start);
    const end = moment(timeRange.end);
    const days = end.diff(start, 'days');
    
    for (let i = 0; i <= days; i += Math.ceil(days / 10)) {
      trends.push({
        date: start.clone().add(i, 'days').format('YYYY-MM-DD'),
        utilization: Math.random() * 0.4 + 0.6 // Random between 60% and 100%
      });
    }
    
    return trends;
  }

  /**
   * Generate utilization recommendations
   */
  private generateUtilizationRecommendations(
    overallUtilization: number,
    byResourceType: Record<string, number>,
    byTeamMember: Array<{ memberId: string; memberName: string; utilization: number }>
  ): string[] {
    const recommendations = [];

    if (overallUtilization < 0.7) {
      recommendations.push('Overall utilization is low. Consider reducing team size or increasing workload.');
    } else if (overallUtilization > 0.9) {
      recommendations.push('Overall utilization is high. Consider adding resources or reducing scope.');
    }

    // Check for imbalanced utilization
    const utilizationValues = byTeamMember.map(member => member.utilization);
    const minUtilization = Math.min(...utilizationValues);
    const maxUtilization = Math.max(...utilizationValues);
    
    if (maxUtilization - minUtilization > 0.3) {
      recommendations.push('Team utilization is imbalanced. Consider redistributing work more evenly.');
    }

    // Check for underutilized resources
    const underutilizedMembers = byTeamMember.filter(member => member.utilization < 0.5);
    if (underutilizedMembers.length > 0) {
      recommendations.push(`${underutilizedMembers.length} team members are underutilized. Consider reassigning tasks.`);
    }

    return recommendations;
  }

  /**
   * Generate optimized allocation (mock implementation)
   */
  private generateOptimizedAllocation(
    currentAllocation: ResourceAllocationResponse,
    constraints: any
  ): any {
    // In a real implementation, this would use optimization algorithms
    // For now, return a mock optimized allocation
    return {
      ...currentAllocation,
      resources: currentAllocation.resources.map(resource => ({
        ...resource,
        utilization: Math.min(resource.utilization + 0.1, 0.95)
      })),
      summary: {
        ...currentAllocation.summary,
        utilizationRate: Math.min(currentAllocation.summary.utilizationRate + 0.15, 0.95)
      }
    };
  }

  /**
   * Publish resource allocated event
   */
  private async publishResourceAllocatedEvent(
    projectId: string,
    projectName: string,
    resource: any,
    userId: string
  ): Promise<void> {
    const event = {
      eventId: uuidv4(),
      eventType: 'project.resource.allocated' as const,
      timestamp: moment().toISOString(),
      source: 'project-service',
      version: '1.0',
      userId,
      data: {
        projectId,
        projectName,
        resource: {
          type: resource.type,
          name: resource.name,
          amount: resource.amount,
          cost: resource.cost,
          period: resource.period
        },
        allocatedBy: {
          id: userId,
          name: `User ${userId}`,
          email: `user${userId}@cycletime.dev`
        }
      }
    };

    await this.eventService.publishEvent(event);
  }

  /**
   * Publish resource deallocated event
   */
  private async publishResourceDeallocatedEvent(
    projectId: string,
    projectName: string,
    resourceId: string,
    userId: string
  ): Promise<void> {
    const event = {
      eventId: uuidv4(),
      eventType: 'project.resource.deallocated' as const,
      timestamp: moment().toISOString(),
      source: 'project-service',
      version: '1.0',
      userId,
      data: {
        projectId,
        projectName,
        resource: {
          type: 'human' as const,
          name: `Resource ${resourceId}`,
          amount: 1,
          cost: 0
        },
        deallocatedBy: {
          id: userId,
          name: `User ${userId}`,
          email: `user${userId}@cycletime.dev`
        }
      }
    };

    await this.eventService.publishEvent(event);
  }
}