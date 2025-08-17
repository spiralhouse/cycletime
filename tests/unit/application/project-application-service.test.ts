import { describe, it, expect, beforeEach } from 'vitest';

import { ProjectApplicationService } from '../../../src/application/services/project-application-service.js';
import { Project } from '../../../src/domain/entities/project.js';
import { ProjectId } from '../../../src/domain/value-objects/project-id.js';
import { ApplicationServiceMockFactory, resetAllMocks } from '../../fixtures/mock-application-service-infrastructure.js';

import type { 
  CreateProjectCommand, 
  UpdateProjectCommand 
} from '../../../src/application/dtos/project-dto.js';

describe('ProjectApplicationService', () => {
  let service: ProjectApplicationService;
  let mocks: ApplicationServiceMockFactory;

  beforeEach(() => {
    resetAllMocks();
    mocks = ApplicationServiceMockFactory.create();
    service = new ProjectApplicationService(
      mocks.projectRepository,
      mocks.unitOfWork,
      mocks.timeProvider
    );
  });

  describe('Project Creation', () => {
    it('should create a project successfully', async () => {
      const command: CreateProjectCommand = {
        name: 'Test Project',
        description: 'A test project description'
      };

      const result = await service.createProject(command);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).toBe('Test Project');
      expect(result.data!.description).toBe('A test project description');
      expect(result.data!.status).toBe('Planning');
    });

    it('should fail when name is empty', async () => {
      const command: CreateProjectCommand = {
        name: '',
        description: 'Description'
      };

      const result = await service.createProject(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project name is required');
    });

    it('should fail when name is only whitespace', async () => {
      const command: CreateProjectCommand = {
        name: '   ',
        description: 'Description'
      };

      const result = await service.createProject(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project name is required');
    });

    it('should trim project name', async () => {
      const command: CreateProjectCommand = {
        name: '  Test Project  ',
        description: 'Description'
      };

      const result = await service.createProject(command);

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('Test Project');
    });

    it('should handle missing description', async () => {
      const command: CreateProjectCommand = {
        name: 'Test Project',
        description: ''
      };

      const result = await service.createProject(command);

      expect(result.success).toBe(true);
      expect(result.data!.description).toBe('');
    });
  });

  describe('Project Updates', () => {
    it('should update project name successfully', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Original Name', 'Description', mocks.timeProvider);
      
      mocks.projectRepository.mockProject(projectId.value, project);

      const command: UpdateProjectCommand = {
        id: projectId.value,
        name: 'Updated Name'
      };

      const result = await service.updateProject(command);

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('Updated Name');
    });

    it('should update project description successfully', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Name', 'Original Description', mocks.timeProvider);
      
      mocks.projectRepository.mockProject(projectId.value, project);

      const command: UpdateProjectCommand = {
        id: projectId.value,
        description: 'Updated Description'
      };

      const result = await service.updateProject(command);

      expect(result.success).toBe(true);
      expect(result.data!.description).toBe('Updated Description');
    });

    it('should fail to update non-existent project', async () => {
      const nonExistentId = ProjectId.generate().value;

      const command: UpdateProjectCommand = {
        id: nonExistentId,
        name: 'New Name'
      };

      const result = await service.updateProject(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project does not exist');
    });

    it('should fail to update with empty name', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Name', 'Description', mocks.timeProvider);
      
      mocks.projectRepository.mockProject(projectId.value, project);

      const command: UpdateProjectCommand = {
        id: projectId.value,
        name: ''
      };

      const result = await service.updateProject(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project name cannot be empty');
    });
  });

  describe('Project Queries', () => {
    it('should get project by id successfully', async () => {
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      
      mocks.projectRepository.mockProject(project.id.value, project);

      const result = await service.getProject(project.id.value);

      expect(result).toBeDefined();
      expect(result!.id).toBe(project.id.value);
      expect(result!.name).toBe('Test Project');
    });

    it('should return null for non-existent project', async () => {
      const nonExistentId = ProjectId.generate().value;

      const result = await service.getProject(nonExistentId);

      expect(result).toBeNull();
    });

    it('should fail to query with invalid project id', async () => {
      await expect(service.getProject('')).rejects.toThrow('Project ID is required');
    });

    it('should list all projects successfully', async () => {
      const project1 = Project.create('Project 1', 'Description 1', mocks.timeProvider);
      const project2 = Project.create('Project 2', 'Description 2', mocks.timeProvider);
      
      mocks.projectRepository.mockProject(project1.id.value, project1);
      mocks.projectRepository.mockProject(project2.id.value, project2);

      const result = await service.listProjects();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Project 1');
      expect(result[1].name).toBe('Project 2');
    });

    it('should return empty array when no projects exist', async () => {
      // Ensure repository is reset for this test
      mocks.projectRepository.reset();
      
      const result = await service.listProjects();

      expect(result).toEqual([]);
    });
  });

  describe('Project Deletion', () => {
    it('should delete project successfully', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      
      mocks.projectRepository.mockProject(projectId.value, project);

      const result = await service.deleteProject(projectId.value);

      expect(result.success).toBe(true);
      
      const deleteCalls = mocks.projectRepository.getDeleteCalls();

      expect(deleteCalls).toHaveLength(1);
      expect(deleteCalls[0]).toBe(projectId.value);
    });

    it('should fail to delete non-existent project', async () => {
      const nonExistentId = ProjectId.generate().value;

      const result = await service.deleteProject(nonExistentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project does not exist');
    });
  });

  describe('Repository Integration', () => {
    it('should handle repository save errors gracefully', async () => {
      mocks.projectRepository.mockSaveThrows(new Error('Database connection failed'));

      const command: CreateProjectCommand = {
        name: 'Test Project',
        description: 'Description'
      };

      const result = await service.createProject(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should handle repository find errors gracefully', async () => {
      mocks.projectRepository.mockFindByIdThrows(new Error('Database query failed'));

      const result = await service.getProject(ProjectId.generate().value);

      expect(result).toBeNull(); // Should handle error gracefully
    });
  });

  describe('Unit of Work Integration', () => {
    it('should execute operations within transaction', async () => {
      const command: CreateProjectCommand = {
        name: 'Transactional Project',
        description: 'Description'
      };

      await service.createProject(command);

      const executeCalls = mocks.unitOfWork.getExecuteCalls();

      expect(executeCalls.length).toBeGreaterThan(0);
    });

    it('should handle transaction failures', async () => {
      mocks.unitOfWork.mockExecuteThrows(new Error('Transaction failed'));

      const command: CreateProjectCommand = {
        name: 'Failed Transaction',
        description: 'Description'
      };

      const result = await service.createProject(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transaction failed');
    });
  });
});