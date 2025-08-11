import { describe, it, expect, beforeEach } from 'vitest';

import { Project } from '../../src/domain/entities/project.js';
import { IssueId } from '../../src/domain/value-objects/issue-id.js';
import { ProjectId } from '../../src/domain/value-objects/project-id.js';
import { ProjectStatus } from '../../src/domain/value-objects/project-status.js';
import { MockTimeProvider } from '../fixtures/mock-time-provider.js';

describe('Project Entity Unit Tests', () => {
  let mockTimeProvider: MockTimeProvider;

  beforeEach(() => {
    mockTimeProvider = new MockTimeProvider();
    mockTimeProvider.setTime('2024-01-01T12:00:00Z');
  });

  describe('Project Creation', () => {
    it('should create project with factory method', () => {
      const project = Project.create(
        'Test Project',
        'A test project description',
        mockTimeProvider
      );

      expect(project.id).toBeDefined();
      expect(project.name).toBe('Test Project');
      expect(project.description).toBe('A test project description');
      expect(project.status).toBe(ProjectStatus.Planning);
      expect(project.issues).toEqual([]);
      expect(project.createdAt).toEqual(mockTimeProvider.now());
      expect(project.updatedAt).toEqual(mockTimeProvider.now());
    });

    it('should create project with specific ID', () => {
      const projectId = ProjectId.generate();
      const project = new Project(
        projectId,
        'Test Project',
        'Description',
        ProjectStatus.Planning,
        [],
        mockTimeProvider.now(),
        mockTimeProvider.now(),
        mockTimeProvider
      );

      expect(project.id).toBe(projectId);
    });

    it('should throw error for empty project name', () => {
      expect(() => Project.create('', 'Description', mockTimeProvider))
        .toThrow('Project name cannot be empty');
    });

    it('should throw error for whitespace-only project name', () => {
      expect(() => Project.create('   ', 'Description', mockTimeProvider))
        .toThrow('Project name cannot be empty');
    });

    it('should throw error for project name too long', () => {
      const longName = 'a'.repeat(256);

      expect(() => Project.create(longName, 'Description', mockTimeProvider))
        .toThrow('Project name must be less than 255 characters');
    });
  });

  describe('Snapshot Pattern', () => {
    it('should create project from snapshot', () => {
      const projectId = ProjectId.generate();
      const createdAt = new Date('2024-01-01T10:00:00Z');
      const updatedAt = new Date('2024-01-01T11:00:00Z');
      const issueIds = [IssueId.generate(), IssueId.generate()];

      const snapshot = {
        id: projectId.toString(),
        name: 'Snapshot Project',
        description: 'From snapshot',
        status: ProjectStatus.Active,
        issueIds: issueIds.map(id => id.toString()),
        createdAt,
        updatedAt
      };

      const project = Project.fromSnapshot(snapshot, mockTimeProvider);

      expect(project.id.toString()).toBe(projectId.toString());
      expect(project.name).toBe('Snapshot Project');
      expect(project.description).toBe('From snapshot');
      expect(project.status).toBe(ProjectStatus.Active);
      expect(project.issues).toHaveLength(2);
      expect(project.createdAt).toEqual(createdAt);
      expect(project.updatedAt).toEqual(updatedAt);
    });

    it('should convert project to snapshot', () => {
      const project = Project.create(
        'Test Project',
        'Description',
        mockTimeProvider
      );
      
      const issueId1 = IssueId.generate();
      const issueId2 = IssueId.generate();

      project.addIssue(issueId1);
      project.addIssue(issueId2);

      const snapshot = project.toSnapshot();

      expect(snapshot.id).toBe(project.id.toString());
      expect(snapshot.name).toBe('Test Project');
      expect(snapshot.description).toBe('Description');
      expect(snapshot.status).toBe(ProjectStatus.Planning);
      expect(snapshot.issueIds).toEqual([issueId1.toString(), issueId2.toString()]);
      expect(snapshot.createdAt).toEqual(project.createdAt);
      expect(snapshot.updatedAt).toEqual(project.updatedAt);
    });
  });

  describe('Issue Management', () => {
    it('should add issue to project', () => {
      const project = Project.create(
        'Test Project',
        'Description',
        mockTimeProvider
      );
      const issueId = IssueId.generate();
      const originalUpdatedAt = project.updatedAt;

      mockTimeProvider.advance(1000);
      project.addIssue(issueId);

      expect(project.issues.some(id => id.equals(issueId))).toBe(true);
      expect(project.issues).toHaveLength(1);
      expect(project.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should not add duplicate issue', () => {
      const project = Project.create(
        'Test Project',
        'Description',
        mockTimeProvider
      );
      const issueId = IssueId.generate();
      
      project.addIssue(issueId);
      project.addIssue(issueId);

      expect(project.issues).toHaveLength(1);
    });

    it('should remove issue from project', () => {
      const project = Project.create(
        'Test Project',
        'Description',
        mockTimeProvider
      );
      const issueId1 = IssueId.generate();
      const issueId2 = IssueId.generate();
      
      project.addIssue(issueId1);
      project.addIssue(issueId2);
      
      mockTimeProvider.advance(1000);
      project.removeIssue(issueId1);

      expect(project.issues.some(id => id.equals(issueId1))).toBe(false);
      expect(project.issues.some(id => id.equals(issueId2))).toBe(true);
      expect(project.issues).toHaveLength(1);
    });

    it('should check if project has issue', () => {
      const project = Project.create(
        'Test Project',
        'Description',
        mockTimeProvider
      );
      const issueId = IssueId.generate();
      
      expect(project.hasIssue(issueId)).toBe(false);
      
      project.addIssue(issueId);
      
      expect(project.hasIssue(issueId)).toBe(true);
    });

    it('should get issue count', () => {
      const project = Project.create(
        'Test Project',
        'Description',
        mockTimeProvider
      );
      
      expect(project.issueCount()).toBe(0);
      
      project.addIssue(IssueId.generate());
      project.addIssue(IssueId.generate());
      
      expect(project.issueCount()).toBe(2);
    });
  });

  describe('Status Management', () => {
    it('should update project status with valid transition', () => {
      const project = Project.create(
        'Test Project',
        'Description',
        mockTimeProvider
      );
      const originalUpdatedAt = project.updatedAt;
      
      mockTimeProvider.advance(1000);
      project.updateStatus(ProjectStatus.Active);

      expect(project.status).toBe(ProjectStatus.Active);
      expect(project.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should throw error for invalid status transition', () => {
      const project = Project.create(
        'Test Project',
        'Description',
        mockTimeProvider
      );
      
      // Move to Active then Completed
      project.updateStatus(ProjectStatus.Active);
      project.updateStatus(ProjectStatus.Completed);
      
      expect(() => { project.updateStatus(ProjectStatus.Active); })
        .toThrow('Invalid status transition from Completed to Active');
    });

    it('should allow archiving from active status', () => {
      const project = Project.create(
        'Test Project',
        'Description',
        mockTimeProvider
      );
      
      project.updateStatus(ProjectStatus.Active);
      project.updateStatus(ProjectStatus.Archived);
      
      expect(project.status).toBe(ProjectStatus.Archived);
    });

    it('should not update if status is the same', () => {
      const project = Project.create(
        'Test Project',
        'Description',
        mockTimeProvider
      );
      const originalUpdatedAt = project.updatedAt;
      
      mockTimeProvider.advance(1000);
      project.updateStatus(ProjectStatus.Planning);

      expect(project.updatedAt).toEqual(originalUpdatedAt);
    });
  });

  describe('Business Rules', () => {
    let project: Project;

    beforeEach(() => {
      project = Project.create(
        'Test Project',
        'Description',
        mockTimeProvider
      );
    });

    it('should check if project can add more issues', () => {
      expect(project.canAddIssue()).toBe(true);
      
      // Add maximum allowed issues (e.g., 1000)
      for (let i = 0; i < 1000; i++) {
        project.addIssue(IssueId.generate());
      }
      
      expect(project.canAddIssue()).toBe(false);
    });

    it('should get unblocked tasks (placeholder)', () => {
      // This would normally filter based on issue dependencies
      // For now, it returns all issues
      const freshProject = Project.create(
        'Fresh Project',
        'Description',
        mockTimeProvider
      );
      const issueId1 = IssueId.generate();
      const issueId2 = IssueId.generate();
      
      freshProject.addIssue(issueId1);
      freshProject.addIssue(issueId2);
      
      const unblocked = freshProject.getUnblockedTasks();
      
      expect(unblocked).toHaveLength(2);
      expect(unblocked.some(id => id.equals(issueId1))).toBe(true);
      expect(unblocked.some(id => id.equals(issueId2))).toBe(true);
    });

    it('should check if project is active', () => {
      expect(project.isActive()).toBe(true); // Planning is active
      
      project.updateStatus(ProjectStatus.Active);
      expect(project.isActive()).toBe(true);
      
      project.updateStatus(ProjectStatus.OnHold);
      expect(project.isActive()).toBe(true);
      
      // Create a new project to test Completed status
      const completedProject = Project.create(
        'Completed Project',
        'Description',
        mockTimeProvider
      );

      completedProject.updateStatus(ProjectStatus.Active);
      completedProject.updateStatus(ProjectStatus.Completed);
      expect(completedProject.isActive()).toBe(false);
    });

    it('should check if project is completed', () => {
      expect(project.isCompleted()).toBe(false);
      
      project.updateStatus(ProjectStatus.Active);
      expect(project.isCompleted()).toBe(false);
      
      project.updateStatus(ProjectStatus.Completed);
      expect(project.isCompleted()).toBe(true);
    });
  });

  describe('Project Update', () => {
    let project: Project;

    beforeEach(() => {
      project = Project.create(
        'Original Name',
        'Original Description',
        mockTimeProvider
      );
    });

    it('should update project name', () => {
      const originalUpdatedAt = project.updatedAt;
      
      mockTimeProvider.advance(1000);
      project.updateName('New Name');

      expect(project.name).toBe('New Name');
      expect(project.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should throw error for empty name update', () => {
      expect(() => { project.updateName(''); })
        .toThrow('Project name cannot be empty');
    });

    it('should update project description', () => {
      const originalUpdatedAt = project.updatedAt;
      
      mockTimeProvider.advance(1000);
      project.updateDescription('New Description');

      expect(project.description).toBe('New Description');
      expect(project.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should allow empty description', () => {
      project.updateDescription('');
      expect(project.description).toBe('');
    });
  });

  describe('Immutability', () => {
    it('should not allow direct modification of issues array', () => {
      const project = Project.create(
        'Test Project',
        'Description',
        mockTimeProvider
      );
      
      const issueId = IssueId.generate();

      project.addIssue(issueId);
      
      const issues = project.issues;

      issues.push(IssueId.generate());
      
      expect(project.issues).toHaveLength(1); // Should not be affected
    });

    it('should return new array for issues getter', () => {
      const project = Project.create(
        'Test Project',
        'Description',
        mockTimeProvider
      );
      
      const issues1 = project.issues;
      const issues2 = project.issues;
      
      expect(issues1).not.toBe(issues2); // Different array instances
      expect(issues1).toEqual(issues2); // Same content
    });
  });
});