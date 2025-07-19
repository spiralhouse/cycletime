import { v4 as uuidv4 } from 'uuid';
import * as moment from 'moment';
import { logger } from '@cycletime/shared-utils';
import { EventService } from './event-service';
import { MockDataService } from './mock-data-service';
import { NotFoundError, ConflictError } from '../utils/error-handler';
import {
  TeamMember,
  ProjectTeamResponse,
  TeamMemberResponse,
  AddTeamMemberRequest,
  UpdateTeamMemberRequest,
  TeamStatistics,
  TeamMemberAddedEvent
} from '../types';

export class TeamService {
  constructor(
    private eventService: EventService,
    private mockDataService: MockDataService
  ) {
    logger.info('TeamService initialized');
  }

  /**
   * Get project team
   */
  async getProjectTeam(projectId: string): Promise<ProjectTeamResponse> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      const team = this.mockDataService.getProjectTeam(projectId);
      const statistics = this.calculateTeamStatistics(team);

      return {
        projectId,
        team,
        statistics
      };
    } catch (error) {
      logger.error('Error getting project team:', error);
      throw error;
    }
  }

  /**
   * Add team member to project
   */
  async addTeamMember(projectId: string, request: AddTeamMemberRequest, addedBy: string): Promise<TeamMemberResponse> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Check if user is already a team member
      const existingTeam = this.mockDataService.getProjectTeam(projectId);
      const existingMember = existingTeam.find(member => member.id === request.userId);
      
      if (existingMember) {
        throw new ConflictError('User is already a team member');
      }

      // Create team member
      const teamMember: TeamMember = {
        id: request.userId,
        name: `User ${request.userId}`,
        email: `user${request.userId}@cycletime.dev`,
        role: request.role,
        permissions: request.permissions,
        allocation: request.allocation,
        addedAt: moment().toISOString(),
        addedBy
      };

      // Add member to project
      const addedMember = this.mockDataService.addTeamMember(projectId, teamMember);

      // Publish event
      await this.publishTeamMemberAddedEvent(project.name, projectId, addedMember, addedBy);

      logger.info('Team member added:', { projectId, userId: request.userId, role: request.role });

      return { member: addedMember };
    } catch (error) {
      logger.error('Error adding team member:', error);
      throw error;
    }
  }

  /**
   * Update team member role and permissions
   */
  async updateTeamMember(
    projectId: string,
    userId: string,
    request: UpdateTeamMemberRequest,
    updatedBy: string
  ): Promise<TeamMemberResponse> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Get existing team member
      const existingTeam = this.mockDataService.getProjectTeam(projectId);
      const existingMember = existingTeam.find(member => member.id === userId);
      
      if (!existingMember) {
        throw new NotFoundError('Team member', userId);
      }

      // Update member
      const updatedMember = this.mockDataService.updateTeamMember(projectId, userId, request);
      
      if (!updatedMember) {
        throw new NotFoundError('Team member', userId);
      }

      // Publish role change event if role changed
      if (request.role && request.role !== existingMember.role) {
        await this.publishTeamMemberRoleChangedEvent(
          project.name,
          projectId,
          updatedMember,
          existingMember.role,
          request.role,
          updatedBy
        );
      }

      logger.info('Team member updated:', { projectId, userId, changes: Object.keys(request) });

      return { member: updatedMember };
    } catch (error) {
      logger.error('Error updating team member:', error);
      throw error;
    }
  }

  /**
   * Remove team member from project
   */
  async removeTeamMember(projectId: string, userId: string, removedBy: string): Promise<void> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Get existing team member
      const existingTeam = this.mockDataService.getProjectTeam(projectId);
      const existingMember = existingTeam.find(member => member.id === userId);
      
      if (!existingMember) {
        throw new NotFoundError('Team member', userId);
      }

      // Don't allow removing the project owner
      if (existingMember.role === 'owner') {
        throw new ConflictError('Cannot remove project owner');
      }

      // Remove member
      const removed = this.mockDataService.removeTeamMember(projectId, userId);
      
      if (!removed) {
        throw new NotFoundError('Team member', userId);
      }

      // Publish event
      await this.publishTeamMemberRemovedEvent(project.name, projectId, existingMember, removedBy);

      logger.info('Team member removed:', { projectId, userId });
    } catch (error) {
      logger.error('Error removing team member:', error);
      throw error;
    }
  }

  /**
   * Get team member by ID
   */
  async getTeamMember(projectId: string, userId: string): Promise<TeamMemberResponse> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      const team = this.mockDataService.getProjectTeam(projectId);
      const member = team.find(m => m.id === userId);
      
      if (!member) {
        throw new NotFoundError('Team member', userId);
      }

      return { member };
    } catch (error) {
      logger.error('Error getting team member:', error);
      throw error;
    }
  }

  /**
   * Calculate team statistics
   */
  private calculateTeamStatistics(team: TeamMember[]): TeamStatistics {
    const totalMembers = team.length;
    const activeMembers = team.filter(member => 
      member.allocation && member.allocation.percentage! > 0
    ).length;
    
    const totalAllocation = team.reduce((sum, member) => {
      return sum + (member.allocation?.percentage || 0);
    }, 0);
    
    const averageAllocation = totalMembers > 0 ? totalAllocation / totalMembers : 0;

    return {
      totalMembers,
      activeMembers,
      totalAllocation,
      averageAllocation
    };
  }

  /**
   * Publish team member added event
   */
  private async publishTeamMemberAddedEvent(
    projectName: string,
    projectId: string,
    member: TeamMember,
    addedBy: string
  ): Promise<void> {
    const event: TeamMemberAddedEvent = {
      eventId: uuidv4(),
      eventType: 'project.team.member_added',
      timestamp: moment().toISOString(),
      source: 'project-service',
      version: '1.0',
      userId: addedBy,
      data: {
        projectId,
        projectName,
        member: {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          permissions: member.permissions,
          allocation: member.allocation
        },
        addedBy: {
          id: addedBy,
          name: `User ${addedBy}`,
          email: `user${addedBy}@cycletime.dev`
        }
      }
    };

    await this.eventService.publishEvent(event);
  }

  /**
   * Publish team member removed event
   */
  private async publishTeamMemberRemovedEvent(
    projectName: string,
    projectId: string,
    member: TeamMember,
    removedBy: string
  ): Promise<void> {
    const event = {
      eventId: uuidv4(),
      eventType: 'project.team.member_removed' as const,
      timestamp: moment().toISOString(),
      source: 'project-service',
      version: '1.0',
      userId: removedBy,
      data: {
        projectId,
        projectName,
        member: {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role
        },
        removedBy: {
          id: removedBy,
          name: `User ${removedBy}`,
          email: `user${removedBy}@cycletime.dev`
        }
      }
    };

    await this.eventService.publishEvent(event);
  }

  /**
   * Publish team member role changed event
   */
  private async publishTeamMemberRoleChangedEvent(
    projectName: string,
    projectId: string,
    member: TeamMember,
    oldRole: string,
    newRole: string,
    changedBy: string
  ): Promise<void> {
    const event = {
      eventId: uuidv4(),
      eventType: 'project.team.member_role_changed' as const,
      timestamp: moment().toISOString(),
      source: 'project-service',
      version: '1.0',
      userId: changedBy,
      data: {
        projectId,
        projectName,
        member: {
          id: member.id,
          name: member.name,
          email: member.email
        },
        oldRole,
        newRole,
        oldPermissions: [],
        newPermissions: member.permissions,
        changedBy: {
          id: changedBy,
          name: `User ${changedBy}`,
          email: `user${changedBy}@cycletime.dev`
        }
      }
    };

    await this.eventService.publishEvent(event);
  }
}