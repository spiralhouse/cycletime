import { describe, it, expect, beforeEach } from 'vitest';

import { IssueApplicationService } from '../../../src/application/services/issue-application-service.js';
import { Issue } from '../../../src/domain/entities/issue.js';
import { Project } from '../../../src/domain/entities/project.js';
import { IssueId } from '../../../src/domain/value-objects/issue-id.js';
import { IssueStatus } from '../../../src/domain/value-objects/issue-status.js';
import { IssueType } from '../../../src/domain/value-objects/issue-type.js';
import { ProjectId } from '../../../src/domain/value-objects/project-id.js';
import { ApplicationServiceMockFactory } from '../../fixtures/mock-application-service-infrastructure.js';

import type { CreateIssueCommand, UpdateIssueCommand } from '../../../src/application/dtos/issue-dto.js';

describe('IssueApplicationService', () => {
  let service: IssueApplicationService;
  let mocks: ApplicationServiceMockFactory;

  beforeEach(() => {
    mocks = ApplicationServiceMockFactory.create();
    service = new IssueApplicationService(
      mocks.issueRepository,
      mocks.projectRepository,
      mocks.unitOfWork,
      mocks.timeProvider
    );
  });

  describe('Issue Creation', () => {
    it('should create an epic successfully', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);

      mocks.projectRepository.mockProject(projectId.value, project);

      const command: CreateIssueCommand = {
        title: 'User Authentication Epic',
        description: 'Complete user authentication system',
        type: IssueType.Epic,
        projectId: projectId.value
      };

      const result = await service.createIssue(command);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.title).toBe('User Authentication Epic');
      expect(result.data!.type).toBe(IssueType.Epic);
      expect(result.data!.parentId).toBeUndefined();
    });

    it('should create a story with epic parent successfully', async () => {
      const projectId = ProjectId.generate();
      const epicId = IssueId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      const epic = Issue.create('Epic Title', 'Epic Description', IssueType.Epic, mocks.timeProvider, projectId);
      
      mocks.projectRepository.mockProject(projectId.value, project);
      mocks.issueRepository.mockIssue(epicId.value, epic);

      const command: CreateIssueCommand = {
        title: 'Login Story',
        description: 'Implement login functionality',
        type: IssueType.Story,
        projectId: projectId.value,
        parentId: epicId.value
      };

      const result = await service.createIssue(command);

      expect(result.success).toBe(true);
      expect(result.data!.parentId).toBe(epicId.value);
      expect(result.data!.type).toBe(IssueType.Story);
    });

    it('should create a subtask with story parent successfully', async () => {
      const projectId = ProjectId.generate();
      const storyId = IssueId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      const story = Issue.create('Story Title', 'Story Description', IssueType.Story, mocks.timeProvider, projectId);
      
      mocks.projectRepository.mockProject(projectId.value, project);
      mocks.issueRepository.mockIssue(storyId.value, story);

      const command: CreateIssueCommand = {
        title: 'Implement password validation',
        description: 'Add password strength validation',
        type: IssueType.Subtask,
        projectId: projectId.value,
        parentId: storyId.value,
        estimate: 3
      };

      const result = await service.createIssue(command);

      expect(result.success).toBe(true);
      expect(result.data!.parentId).toBe(storyId.value);
      expect(result.data!.type).toBe(IssueType.Subtask);
      expect(result.data!.estimate).toBe(3);
    });

    it('should fail when title is empty', async () => {
      const command: CreateIssueCommand = {
        title: '',
        description: 'Description',
        type: IssueType.Story,
        projectId: ProjectId.generate().value
      };

      const result = await service.createIssue(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('title');
    });

    it('should fail when project does not exist', async () => {
      const nonExistentProjectId = ProjectId.generate().value;
      
      const command: CreateIssueCommand = {
        title: 'Valid Title',
        description: 'Description',
        type: IssueType.Story,
        projectId: nonExistentProjectId
      };

      const result = await service.createIssue(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project not found');
    });
  });

  describe('Issue Hierarchy Validation', () => {
    it('should reject epic with parent', async () => {
      const projectId = ProjectId.generate();
      const parentId = IssueId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      const parent = Issue.create('Parent', 'Description', IssueType.Epic, mocks.timeProvider, projectId);
      
      mocks.projectRepository.mockProject(projectId.value, project);
      mocks.issueRepository.mockIssue(parentId.value, parent);

      const command: CreateIssueCommand = {
        title: 'Child Epic',
        description: 'This should fail',
        type: IssueType.Epic,
        projectId: projectId.value,
        parentId: parentId.value
      };

      const result = await service.createIssue(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Epic cannot have a parent');
    });

    it('should reject subtask with epic parent', async () => {
      const projectId = ProjectId.generate();
      const epicId = IssueId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      const epic = Issue.create('Epic', 'Description', IssueType.Epic, mocks.timeProvider, projectId);
      
      mocks.projectRepository.mockProject(projectId.value, project);
      mocks.issueRepository.mockIssue(epicId.value, epic);

      const command: CreateIssueCommand = {
        title: 'Subtask',
        description: 'Should fail',
        type: IssueType.Subtask,
        projectId: projectId.value,
        parentId: epicId.value
      };

      const result = await service.createIssue(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Subtask must have a Story parent');
    });

    it('should reject subtask without parent', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      
      mocks.projectRepository.mockProject(projectId.value, project);

      const command: CreateIssueCommand = {
        title: 'Orphan Subtask',
        description: 'Should fail',
        type: IssueType.Subtask,
        projectId: projectId.value
      };

      const result = await service.createIssue(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Subtask must have a parent');
    });

    it('should reject story with subtask parent', async () => {
      const projectId = ProjectId.generate();
      const subtaskId = IssueId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      const subtask = Issue.create('Subtask', 'Description', IssueType.Subtask, mocks.timeProvider, projectId);
      
      mocks.projectRepository.mockProject(projectId.value, project);
      mocks.issueRepository.mockIssue(subtaskId.value, subtask);

      const command: CreateIssueCommand = {
        title: 'Story',
        description: 'Should fail',
        type: IssueType.Story,
        projectId: projectId.value,
        parentId: subtaskId.value
      };

      const result = await service.createIssue(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Story cannot have Subtask parent');
    });
  });

  describe('Estimation Rules', () => {
    it('should reject estimate on epic', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      
      mocks.projectRepository.mockProject(projectId.value, project);

      const command: CreateIssueCommand = {
        title: 'Epic with Estimate',
        description: 'Should fail',
        type: IssueType.Epic,
        projectId: projectId.value,
        estimate: 5
      };

      const result = await service.createIssue(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Epic cannot have estimate');
    });

    it('should allow estimate on story without children', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      
      mocks.projectRepository.mockProject(projectId.value, project);

      const command: CreateIssueCommand = {
        title: 'Story with Estimate',
        description: 'Should succeed',
        type: IssueType.Story,
        projectId: projectId.value,
        estimate: 5
      };

      const result = await service.createIssue(command);

      expect(result.success).toBe(true);
      expect(result.data!.estimate).toBe(5);
    });

    it('should allow estimate on subtask', async () => {
      const projectId = ProjectId.generate();
      const storyId = IssueId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      const story = Issue.create('Story', 'Description', IssueType.Story, mocks.timeProvider, projectId);
      
      mocks.projectRepository.mockProject(projectId.value, project);
      mocks.issueRepository.mockIssue(storyId.value, story);

      const command: CreateIssueCommand = {
        title: 'Subtask with Estimate',
        description: 'Should succeed',
        type: IssueType.Subtask,
        projectId: projectId.value,
        parentId: storyId.value,
        estimate: 3
      };

      const result = await service.createIssue(command);

      expect(result.success).toBe(true);
      expect(result.data!.estimate).toBe(3);
    });

    it('should reject invalid estimate values', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      
      mocks.projectRepository.mockProject(projectId.value, project);

      const command: CreateIssueCommand = {
        title: 'Story with Invalid Estimate',
        description: 'Should fail',
        type: IssueType.Story,
        projectId: projectId.value,
        estimate: 4 // Not in Fibonacci sequence
      };

      const result = await service.createIssue(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Fibonacci sequence');
    });
  });

  describe('Issue Status Management', () => {
    it('should create issue with default backlog status', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      
      mocks.projectRepository.mockProject(projectId.value, project);

      const command: CreateIssueCommand = {
        title: 'New Issue',
        description: 'Default status test',
        type: IssueType.Story,
        projectId: projectId.value
      };

      const result = await service.createIssue(command);

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe(IssueStatus.Backlog);
    });

    it('should update issue status with valid transition', async () => {
      const issueId = IssueId.generate();
      const projectId = ProjectId.generate();
      const issue = Issue.create('Test Issue', 'Description', IssueType.Story, mocks.timeProvider, projectId);
      
      mocks.issueRepository.mockIssue(issueId.value, issue);

      const command: UpdateIssueCommand = {
        id: issueId.value,
        status: IssueStatus.Todo
      };

      const result = await service.updateIssue(command);

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe(IssueStatus.Todo);
    });

    it('should reject invalid status transition', async () => {
      const issueId = IssueId.generate();
      const projectId = ProjectId.generate();
      const issue = Issue.create('Test Issue', 'Description', IssueType.Story, mocks.timeProvider, projectId);
      
      mocks.issueRepository.mockIssue(issueId.value, issue);

      const command: UpdateIssueCommand = {
        id: issueId.value,
        status: IssueStatus.Done // Invalid transition from Backlog
      };

      const result = await service.updateIssue(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid status transition');
    });
  });

  describe('Issue Updates', () => {
    it('should update issue title successfully', async () => {
      const issueId = IssueId.generate();
      const projectId = ProjectId.generate();
      const issue = Issue.create('Original Title', 'Description', IssueType.Story, mocks.timeProvider, projectId);
      
      mocks.issueRepository.mockIssue(issueId.value, issue);

      const command: UpdateIssueCommand = {
        id: issueId.value,
        title: 'Updated Title'
      };

      const result = await service.updateIssue(command);

      expect(result.success).toBe(true);
      expect(result.data!.title).toBe('Updated Title');
    });

    it('should update issue description successfully', async () => {
      const issueId = IssueId.generate();
      const projectId = ProjectId.generate();
      const issue = Issue.create('Title', 'Original Description', IssueType.Story, mocks.timeProvider, projectId);
      
      mocks.issueRepository.mockIssue(issueId.value, issue);

      const command: UpdateIssueCommand = {
        id: issueId.value,
        description: 'Updated Description'
      };

      const result = await service.updateIssue(command);

      expect(result.success).toBe(true);
      expect(result.data!.description).toBe('Updated Description');
    });

    it('should fail to update non-existent issue', async () => {
      const nonExistentId = IssueId.generate().value;

      const command: UpdateIssueCommand = {
        id: nonExistentId,
        title: 'New Title'
      };

      const result = await service.updateIssue(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Issue not found');
    });

    it('should fail to update with empty title', async () => {
      const issueId = IssueId.generate();
      const projectId = ProjectId.generate();
      const issue = Issue.create('Title', 'Description', IssueType.Story, mocks.timeProvider, projectId);
      
      mocks.issueRepository.mockIssue(issueId.value, issue);

      const command: UpdateIssueCommand = {
        id: issueId.value,
        title: ''
      };

      const result = await service.updateIssue(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('title cannot be empty');
    });
  });

  describe('Issue Queries', () => {
    it('should get issue by id successfully', async () => {
      const projectId = ProjectId.generate();
      const issue = Issue.create('Test Issue', 'Description', IssueType.Story, mocks.timeProvider, projectId);
      
      mocks.issueRepository.mockIssue(issue.id.value, issue);

      const result = await service.getIssue(issue.id.value);

      expect(result).toBeDefined();
      expect(result!.id).toBe(issue.id.value);
      expect(result!.title).toBe('Test Issue');
    });

    it('should return null for non-existent issue', async () => {
      const nonExistentId = IssueId.generate().value;

      const result = await service.getIssue(nonExistentId);

      expect(result).toBeNull();
    });

    it('should get issues by project id successfully', async () => {
      const projectId = ProjectId.generate();
      const issue1 = Issue.create('Issue 1', 'Description', IssueType.Story, mocks.timeProvider, projectId);
      const issue2 = Issue.create('Issue 2', 'Description', IssueType.Epic, mocks.timeProvider, projectId);
      
      mocks.issueRepository.mockProjectIssues(projectId.value, [issue1, issue2]);

      const result = await service.getProjectIssues(projectId.value);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Issue 1');
      expect(result[1].title).toBe('Issue 2');
    });

    it('should return empty array for project with no issues', async () => {
      const projectId = ProjectId.generate().value;

      const result = await service.getProjectIssues(projectId);

      expect(result).toEqual([]);
    });

    it('should fail to query with invalid project id', async () => {
      await expect(service.getProjectIssues('')).rejects.toThrow('Project ID is required');
    });
  });

  describe('Repository Integration', () => {
    it('should handle repository save errors gracefully', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      
      mocks.projectRepository.mockProject(projectId.value, project);
      mocks.issueRepository.mockSaveThrows(new Error('Database connection failed'));

      const command: CreateIssueCommand = {
        title: 'Test Issue',
        description: 'Description',
        type: IssueType.Story,
        projectId: projectId.value
      };

      const result = await service.createIssue(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should handle repository find errors gracefully', async () => {
      mocks.issueRepository.mockFindByIdThrows(new Error('Database query failed'));

      const result = await service.getIssue(IssueId.generate().value);

      expect(result).toBeNull(); // Should handle error gracefully
    });
  });

  describe('Unit of Work Integration', () => {
    it('should execute operations within transaction', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      
      mocks.projectRepository.mockProject(projectId.value, project);

      const command: CreateIssueCommand = {
        title: 'Transactional Issue',
        description: 'Description',
        type: IssueType.Story,
        projectId: projectId.value
      };

      await service.createIssue(command);

      const executeCalls = mocks.unitOfWork.getExecuteCalls();

      expect(executeCalls.length).toBeGreaterThan(0);
    });

    it('should handle transaction failures', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      
      mocks.projectRepository.mockProject(projectId.value, project);
      mocks.unitOfWork.mockExecuteThrows(new Error('Transaction failed'));

      const command: CreateIssueCommand = {
        title: 'Failed Transaction',
        description: 'Description',
        type: IssueType.Story,
        projectId: projectId.value
      };

      const result = await service.createIssue(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transaction failed');
    });
  });
});