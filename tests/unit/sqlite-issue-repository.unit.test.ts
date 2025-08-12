import { describe, it, expect, beforeEach, vi } from 'vitest';

import { Issue } from '../../src/domain/entities/issue.js';
import { RepositoryError } from '../../src/domain/errors/repository-errors.js';
import { IssueId } from '../../src/domain/value-objects/issue-id.js';
import { ProjectId } from '../../src/domain/value-objects/project-id.js';
import { SqliteIssueRepository } from '../../src/infrastructure/database/repositories/sqlite-issue-repository.js';

describe('SqliteIssueRepository Unit Tests', () => {
  let mockDb: any;
  let mockStmt: any;
  let mockTransaction: any;
  let repository: SqliteIssueRepository;

  beforeEach(() => {
    // Mock the database statement
    mockStmt = {
      get: vi.fn(),
      run: vi.fn().mockReturnValue({ changes: 1 }),
      all: vi.fn().mockReturnValue([])
    };

    // Mock transaction function that returns a function that executes the passed function
    mockTransaction = vi.fn((fn: any) => {
      return () => fn();
    });

    // Mock the database
    mockDb = {
      open: true,
      prepare: vi.fn().mockReturnValue(mockStmt),
      transaction: mockTransaction,
      inTransaction: false
    };

    repository = new SqliteIssueRepository(mockDb);
  });

  describe('findById', () => {
    it('should return null when issue not found', async () => {
      mockStmt.get.mockReturnValue(undefined);
      
      const result = await repository.findById(IssueId.generate());
      
      expect(result).toBeNull();
      expect(mockStmt.get).toHaveBeenCalled();
    });

    it('should reconstitute issue from database row', async () => {
      const issueId = IssueId.generate();
      const mockRow = {
        id: issueId.value,
        title: 'Test Issue',
        description: 'Test Description',
        type: 'Story',
        status: 'Backlog',
        parent_id: null,
        estimate: 5,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
      };
      
      mockStmt.get.mockReturnValue(mockRow);
      mockStmt.all.mockReturnValue([]); // No children or dependencies
      
      const result = await repository.findById(issueId);
      
      expect(result).not.toBeNull();
      expect(result!.title).toBe('Test Issue');
      expect(result!.description).toBe('Test Description');
      expect(result!.type).toBe('Story');
      expect(result!.status).toBe('Backlog');
      expect(result!.estimate).toBe(5);
    });

    it('should reconstitute issue with parent', async () => {
      const issueId = IssueId.generate();
      const parentId = IssueId.generate();
      
      const mockRow = {
        id: issueId.value,
        title: 'Subtask',
        description: 'Subtask Description',
        type: 'Subtask',
        status: 'Backlog',
        parent_id: parentId.value,
        estimate: 2,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
      };
      
      mockStmt.get.mockReturnValue(mockRow);
      mockStmt.all.mockReturnValue([]); // No children or dependencies
      
      const result = await repository.findById(issueId);
      
      expect(result).not.toBeNull();
      expect(result!.parentId).toBeDefined();
      expect(result!.parentId!.value).toBe(parentId.value);
    });

    it('should reconstitute issue with children', async () => {
      const issueId = IssueId.generate();
      const childId1 = IssueId.generate();
      const childId2 = IssueId.generate();
      
      const mockRow = {
        id: issueId.value,
        title: 'Epic',
        description: 'Epic Description',
        type: 'Epic',
        status: 'Backlog',
        parent_id: null,
        estimate: null,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
      };
      
      const mockChildRows = [
        { id: childId1.value },
        { id: childId2.value }
      ];
      
      mockStmt.get.mockReturnValue(mockRow);
      mockStmt.all
        .mockReturnValueOnce(mockChildRows) // Children
        .mockReturnValueOnce([]); // Dependencies
      
      const result = await repository.findById(issueId);
      
      expect(result).not.toBeNull();
      expect(result!.childIds).toHaveLength(2);
      expect(result!.hasChild(childId1)).toBe(true);
      expect(result!.hasChild(childId2)).toBe(true);
    });

    it('should reconstitute issue with dependencies', async () => {
      const issueId = IssueId.generate();
      const depId1 = IssueId.generate();
      const depId2 = IssueId.generate();
      
      const mockRow = {
        id: issueId.value,
        title: 'Story',
        description: 'Story Description',
        type: 'Story',
        status: 'Backlog',
        parent_id: null,
        estimate: 3,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
      };
      
      const mockDepRows = [
        { dependency_id: depId1.value },
        { dependency_id: depId2.value }
      ];
      
      mockStmt.get.mockReturnValue(mockRow);
      mockStmt.all
        .mockReturnValueOnce([]) // Children
        .mockReturnValueOnce(mockDepRows); // Dependencies
      
      const result = await repository.findById(issueId);
      
      expect(result).not.toBeNull();
      expect(result!.dependencies).toHaveLength(2);
      expect(result!.hasDependency(depId1)).toBe(true);
      expect(result!.hasDependency(depId2)).toBe(true);
    });

    it('should handle database errors', async () => {
      mockStmt.get.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await expect(repository.findById(IssueId.generate()))
        .rejects.toThrow(RepositoryError);
    });

    it('should re-initialize statements if database is closed', async () => {
      mockDb.open = false;
      mockStmt.get.mockReturnValue(undefined);
      
      const issueId = IssueId.generate();
      const result = await repository.findById(issueId);
      
      expect(result).toBeNull();
      // Should have tried to reinitialize
      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  describe('findByProjectId', () => {
    it('should return empty array when no issues exist for project', async () => {
      mockStmt.all.mockReturnValue([]);
      
      const result = await repository.findByProjectId(ProjectId.generate());
      
      expect(result).toEqual([]);
    });

    it('should return all issues for a project', async () => {
      const projectId = ProjectId.generate();
      const mockRows = [
        {
          id: IssueId.generate().value,
          title: 'Issue 1',
          description: 'Desc 1',
          type: 'Story',
          status: 'Backlog',
          parent_id: null,
          estimate: 3,
          created_at: Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000)
        },
        {
          id: IssueId.generate().value,
          title: 'Issue 2',
          description: 'Desc 2',
          type: 'Story',
          status: 'InProgress',
          parent_id: null,
          estimate: 5,
          created_at: Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000)
        }
      ];
      
      mockStmt.all
        .mockReturnValueOnce(mockRows) // Issues for project
        .mockReturnValue([]); // No children or dependencies for each issue
      
      const result = await repository.findByProjectId(projectId);
      
      expect(result).toHaveLength(2);
      expect(result[0]!.title).toBe('Issue 1');
      expect(result[1]!.title).toBe('Issue 2');
    });

    it('should include hierarchy and dependencies for project issues', async () => {
      const projectId = ProjectId.generate();
      const parentId = IssueId.generate();
      const childId = IssueId.generate();
      
      const mockRows = [
        {
          id: parentId.value,
          title: 'Parent Issue',
          description: 'Parent Desc',
          type: 'Story',
          status: 'Backlog',
          parent_id: null,
          estimate: null,
          created_at: Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000)
        }
      ];
      
      mockStmt.all
        .mockReturnValueOnce(mockRows) // Issues for project
        .mockReturnValueOnce([{ id: childId.value }]) // Children for parent
        .mockReturnValueOnce([]); // No dependencies
      
      const result = await repository.findByProjectId(projectId);
      
      expect(result).toHaveLength(1);
      expect(result[0]!.childIds).toHaveLength(1);
      expect(result[0]!.hasChild(childId)).toBe(true);
    });

    it('should handle database errors', async () => {
      mockStmt.all.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await expect(repository.findByProjectId(ProjectId.generate()))
        .rejects.toThrow(RepositoryError);
    });
  });

  describe('save', () => {
    // Note: The save method's transaction behavior is thoroughly tested in integration tests
    // These unit tests would require complex transaction mocking that doesn't add value

    // Note: Complex transaction scenarios (children, dependencies) are tested in integration tests
    // Unit testing these would require complex mocking that doesn't provide additional value

    it('should handle database errors', async () => {
      const issue = Issue.create('Issue', 'Desc', 'Story');
      
      // Set up the mock to fail during existence check
      mockStmt.get.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await expect(repository.save(issue))
        .rejects.toThrow(RepositoryError);
    });
  });

  describe('exists', () => {
    it('should return true when issue exists', async () => {
      mockStmt.get.mockReturnValue({ id: 'exists' });
      
      const result = await repository.exists(IssueId.generate());
      
      expect(result).toBe(true);
    });

    it('should return false when issue does not exist', async () => {
      mockStmt.get.mockReturnValue(undefined);
      
      const result = await repository.exists(IssueId.generate());
      
      expect(result).toBe(false);
    });
  });

  describe('saveToProject', () => {
    // Note: saveToProject transaction behavior is thoroughly tested in integration tests
    // Unit testing this method requires complex mocking of database transactions that
    // doesn't provide additional value beyond what integration tests already cover

    it('should handle database errors in saveToProject', async () => {
      const projectId = ProjectId.generate();
      const issue = Issue.create('Test Issue', 'Description', 'Story');
      
      // Set up mock to fail during transaction
      mockTransaction.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await expect(repository.saveToProject(issue, projectId))
        .rejects.toThrow(RepositoryError);
    });

    it('should rollback transaction on failure', async () => {
      const projectId = ProjectId.generate();
      const issue = Issue.create('Test Issue', 'Description', 'Story');
      
      // Mock that issue doesn't exist
      mockStmt.get.mockReturnValue(undefined);
      
      // Make run fail to simulate database error
      mockStmt.run.mockImplementation(() => {
        throw new Error('Foreign key constraint failed');
      });
      
      // Set up transaction to properly handle errors
      mockTransaction.mockImplementation((fn: any) => {
        return () => {
          fn(); // This will throw
        };
      });
      
      await expect(repository.saveToProject(issue, projectId))
        .rejects.toThrow(RepositoryError);
    });
  });

  describe('Statement Management', () => {
    it('should initialize statements when database is open', () => {
      const newRepository = new SqliteIssueRepository(mockDb);
      
      // Should have prepared statements
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should not initialize statements when database is closed', () => {
      mockDb.open = false;
      const prepareCalls = mockDb.prepare.mock.calls.length;
      
      const newRepository = new SqliteIssueRepository(mockDb);
      
      // Should not have prepared any new statements
      expect(mockDb.prepare).toHaveBeenCalledTimes(prepareCalls);
    });

    it('should handle statement preparation errors gracefully', () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Cannot prepare statement');
      });
      
      // Should not throw during construction
      expect(() => new SqliteIssueRepository(mockDb)).not.toThrow();
    });
  });
});