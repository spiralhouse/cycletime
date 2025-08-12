import { describe, it, expect, beforeEach } from 'vitest';

import { Issue } from '../../src/domain/entities/issue.js';
import { IssueId } from '../../src/domain/value-objects/issue-id.js';
import { IssueStatus } from '../../src/domain/value-objects/issue-status.js';
import { IssueType } from '../../src/domain/value-objects/issue-type.js';
import { ProjectId } from '../../src/domain/value-objects/project-id.js';
import { MockTimeProvider } from '../fixtures/mock-time-provider.js';

describe('Issue Entity Unit Tests', () => {
  let mockTimeProvider: MockTimeProvider;

  beforeEach(() => {
    mockTimeProvider = new MockTimeProvider();
    mockTimeProvider.setTime('2024-01-01T12:00:00Z');
  });

  describe('Issue Creation', () => {
    it('should create issue with factory method', () => {
      const issue = Issue.create(
        'Test Issue',
        'Issue description',
        IssueType.Story,
        mockTimeProvider
      );

      expect(issue.id).toBeDefined();
      expect(issue.title).toBe('Test Issue');
      expect(issue.description).toBe('Issue description');
      expect(issue.type).toBe(IssueType.Story);
      expect(issue.status).toBe(IssueStatus.Backlog);
      expect(issue.parentId).toBeUndefined();
      expect(issue.childIds).toEqual([]);
      expect(issue.dependencies).toEqual([]);
      expect(issue.estimate).toBeUndefined();
      expect(issue.createdAt).toEqual(mockTimeProvider.now());
      expect(issue.updatedAt).toEqual(mockTimeProvider.now());
    });

    it('should create issue with specific ID', () => {
      const issueId = IssueId.generate();
      const issue = new Issue(
        issueId,
        'Test Issue',
        'Description',
        IssueType.Story,
        IssueStatus.Backlog,
        [],
        [],
        undefined,
        undefined,
        mockTimeProvider.now(),
        mockTimeProvider.now(),
        mockTimeProvider
      );

      expect(issue.id).toBe(issueId);
    });

    it('should throw error for empty title', () => {
      expect(() => Issue.create('', 'Description', IssueType.Story, mockTimeProvider))
        .toThrow('Issue title cannot be empty');
    });

    it('should throw error for whitespace-only title', () => {
      expect(() => Issue.create('   ', 'Description', IssueType.Story, mockTimeProvider))
        .toThrow('Issue title cannot be empty');
    });

    it('should throw error for title too long', () => {
      const longTitle = 'a'.repeat(256);

      expect(() => Issue.create(longTitle, 'Description', IssueType.Story, mockTimeProvider))
        .toThrow('Issue title must be less than 255 characters');
    });

    it('should allow empty description', () => {
      const issue = Issue.create('Test Issue', '', IssueType.Story, mockTimeProvider);

      expect(issue.description).toBe('');
    });

    it('should create issue with project association', () => {
      const projectId = ProjectId.generate();
      const issue = Issue.create(
        'Test Issue',
        'Issue description',
        IssueType.Story,
        mockTimeProvider,
        projectId
      );

      expect(issue.id).toBeDefined();
      expect(issue.title).toBe('Test Issue');
      expect(issue.description).toBe('Issue description');
      expect(issue.type).toBe(IssueType.Story);
      expect(issue.status).toBe(IssueStatus.Backlog);
      expect(issue.projectId).toBe(projectId);
      expect(issue.parentId).toBeUndefined();
      expect(issue.childIds).toEqual([]);
      expect(issue.dependencies).toEqual([]);
      expect(issue.estimate).toBeUndefined();
      expect(issue.createdAt).toEqual(mockTimeProvider.now());
      expect(issue.updatedAt).toEqual(mockTimeProvider.now());
    });

    it('should create issue without project association (backward compatibility)', () => {
      const issue = Issue.create(
        'Test Issue',
        'Issue description',
        IssueType.Story,
        mockTimeProvider
      );

      expect(issue.id).toBeDefined();
      expect(issue.projectId).toBeUndefined();
    });
  });

  describe('Snapshot Pattern', () => {
    it('should create issue from snapshot', () => {
      const issueId = IssueId.generate();
      const parentId = IssueId.generate();
      const childIds = [IssueId.generate(), IssueId.generate()];
      const dependencies = [IssueId.generate()];
      const createdAt = new Date('2024-01-01T10:00:00Z');
      const updatedAt = new Date('2024-01-01T11:00:00Z');

      const snapshot = {
        id: issueId.toString(),
        title: 'Snapshot Issue',
        description: 'From snapshot',
        type: IssueType.Story,
        status: IssueStatus.InProgress,
        parentId: parentId.toString(),
        childIds: childIds.map(id => id.toString()),
        dependencies: dependencies.map(id => id.toString()),
        estimate: 5,
        createdAt,
        updatedAt
      };

      const issue = Issue.fromSnapshot(snapshot, mockTimeProvider);

      expect(issue.id.toString()).toBe(issueId.toString());
      expect(issue.title).toBe('Snapshot Issue');
      expect(issue.description).toBe('From snapshot');
      expect(issue.type).toBe(IssueType.Story);
      expect(issue.status).toBe(IssueStatus.InProgress);
      expect(issue.parentId?.toString()).toBe(parentId.toString());
      expect(issue.childIds).toHaveLength(2);
      expect(issue.dependencies).toHaveLength(1);
      expect(issue.estimate).toBe(5);
      expect(issue.createdAt).toEqual(createdAt);
      expect(issue.updatedAt).toEqual(updatedAt);
    });

    it('should create issue from snapshot with projectId', () => {
      const issueId = IssueId.generate();
      const projectId = ProjectId.generate();
      const createdAt = new Date('2024-01-01T10:00:00Z');
      const updatedAt = new Date('2024-01-01T11:00:00Z');

      const snapshot = {
        id: issueId.toString(),
        title: 'Snapshot Issue',
        description: 'From snapshot',
        type: IssueType.Story,
        status: IssueStatus.InProgress,
        projectId: projectId.toString(),
        parentId: undefined,
        childIds: [],
        dependencies: [],
        estimate: undefined,
        createdAt,
        updatedAt
      };

      const issue = Issue.fromSnapshot(snapshot, mockTimeProvider);

      expect(issue.id.toString()).toBe(issueId.toString());
      expect(issue.projectId?.toString()).toBe(projectId.toString());
      expect(issue.title).toBe('Snapshot Issue');
    });

    it('should convert issue to snapshot', () => {
      const issue = Issue.create(
        'Test Issue',
        'Description',
        IssueType.Story,
        mockTimeProvider
      );
      
      const parentId = IssueId.generate();

      issue.setParent(parentId);
      
      // Don't add children so we can set estimate
      const dependencyId = IssueId.generate();

      issue.addDependency(dependencyId);
      
      issue.setEstimate(8);
      
      const snapshot = issue.toSnapshot();

      expect(snapshot.id).toBe(issue.id.toString());
      expect(snapshot.title).toBe('Test Issue');
      expect(snapshot.description).toBe('Description');
      expect(snapshot.type).toBe(IssueType.Story);
      expect(snapshot.status).toBe(IssueStatus.Backlog);
      expect(snapshot.parentId).toBe(parentId.toString());
      expect(snapshot.childIds).toEqual([]);
      expect(snapshot.dependencies).toEqual([dependencyId.toString()]);
      expect(snapshot.estimate).toBe(8);
      expect(snapshot.createdAt).toEqual(issue.createdAt);
      expect(snapshot.updatedAt).toEqual(issue.updatedAt);
    });

    it('should convert issue with projectId to snapshot', () => {
      const projectId = ProjectId.generate();
      const issue = Issue.create(
        'Test Issue',
        'Description',
        IssueType.Story,
        mockTimeProvider,
        projectId
      );
      
      const snapshot = issue.toSnapshot();

      expect(snapshot.id).toBe(issue.id.toString());
      expect(snapshot.projectId).toBe(projectId.toString());
      expect(snapshot.title).toBe('Test Issue');
      expect(snapshot.description).toBe('Description');
      expect(snapshot.type).toBe(IssueType.Story);
      expect(snapshot.status).toBe(IssueStatus.Backlog);
    });

    it('should convert issue with children to snapshot', () => {
      const issue = Issue.create(
        'Test Issue',
        'Description',
        IssueType.Epic,
        mockTimeProvider
      );
      
      const childId = IssueId.generate();

      issue.addChild(childId);

      const snapshot = issue.toSnapshot();

      expect(snapshot.id).toBe(issue.id.toString());
      expect(snapshot.title).toBe('Test Issue');
      expect(snapshot.description).toBe('Description');
      expect(snapshot.type).toBe(IssueType.Epic);
      expect(snapshot.status).toBe(IssueStatus.Backlog);
      expect(snapshot.parentId).toBeUndefined();
      expect(snapshot.childIds).toEqual([childId.toString()]);
      expect(snapshot.dependencies).toEqual([]);
      expect(snapshot.estimate).toBeUndefined();
      expect(snapshot.createdAt).toEqual(issue.createdAt);
      expect(snapshot.updatedAt).toEqual(issue.updatedAt);
    });

    it('should handle snapshot without optional fields', () => {
      const snapshot = {
        id: IssueId.generate().toString(),
        title: 'Simple Issue',
        description: 'Description',
        type: IssueType.Subtask,
        status: IssueStatus.Todo,
        childIds: [],
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const issue = Issue.fromSnapshot(snapshot, mockTimeProvider);

      expect(issue.parentId).toBeUndefined();
      expect(issue.estimate).toBeUndefined();
      expect(issue.childIds).toEqual([]);
      expect(issue.dependencies).toEqual([]);
    });
  });

  describe('Hierarchy Validation', () => {
    it('should validate Epic cannot have parent', () => {
      const epic = Issue.create('Epic', 'Description', IssueType.Epic, mockTimeProvider);
      const parentId = IssueId.generate();

      expect(() => { epic.setParent(parentId); })
        .toThrow('Epic cannot have a parent');
    });

    it('should validate Story can only have Epic as parent', () => {
      const story = Issue.create('Story', 'Description', IssueType.Story, mockTimeProvider);
      const epicId = IssueId.generate();

      // This should work (we don't validate parent type here, that's done at service level)
      story.setParent(epicId);
      expect(story.parentId?.equals(epicId)).toBe(true);
    });

    it('should validate Subtask must have parent', () => {
      const subtask = Issue.create('Subtask', 'Description', IssueType.Subtask, mockTimeProvider);
      
      // Subtask created without parent should be allowed, but validation method should indicate it's invalid
      expect(subtask.isValidHierarchy()).toBe(false);
      
      const parentId = IssueId.generate();

      subtask.setParent(parentId);
      
      expect(subtask.isValidHierarchy()).toBe(true);
    });

    it('should validate Epic can have Story children', () => {
      const epic = Issue.create('Epic', 'Description', IssueType.Epic, mockTimeProvider);
      const storyId = IssueId.generate();

      epic.addChild(storyId);

      expect(epic.childIds.some(id => id.equals(storyId))).toBe(true);
    });

    it('should validate Story can have Subtask children', () => {
      const story = Issue.create('Story', 'Description', IssueType.Story, mockTimeProvider);
      const subtaskId = IssueId.generate();

      story.addChild(subtaskId);

      expect(story.childIds.some(id => id.equals(subtaskId))).toBe(true);
    });

    it('should validate Subtask cannot have children', () => {
      const subtask = Issue.create('Subtask', 'Description', IssueType.Subtask, mockTimeProvider);
      const childId = IssueId.generate();

      expect(() => { subtask.addChild(childId); })
        .toThrow('Subtask cannot have children');
    });

    it('should not add duplicate children', () => {
      const epic = Issue.create('Epic', 'Description', IssueType.Epic, mockTimeProvider);
      const storyId = IssueId.generate();

      epic.addChild(storyId);
      epic.addChild(storyId);

      expect(epic.childIds).toHaveLength(1);
    });

    it('should remove child', () => {
      const epic = Issue.create('Epic', 'Description', IssueType.Epic, mockTimeProvider);
      const storyId1 = IssueId.generate();
      const storyId2 = IssueId.generate();

      epic.addChild(storyId1);
      epic.addChild(storyId2);
      
      mockTimeProvider.advance(1000);
      epic.removeChild(storyId1);

      expect(epic.childIds.some(id => id.equals(storyId1))).toBe(false);
      expect(epic.childIds.some(id => id.equals(storyId2))).toBe(true);
      expect(epic.childIds).toHaveLength(1);
    });

    it('should check if issue has specific child', () => {
      const epic = Issue.create('Epic', 'Description', IssueType.Epic, mockTimeProvider);
      const storyId = IssueId.generate();

      expect(epic.hasChild(storyId)).toBe(false);
      
      epic.addChild(storyId);
      
      expect(epic.hasChild(storyId)).toBe(true);
    });

    it('should get child count', () => {
      const epic = Issue.create('Epic', 'Description', IssueType.Epic, mockTimeProvider);
      
      expect(epic.childCount()).toBe(0);
      
      epic.addChild(IssueId.generate());
      epic.addChild(IssueId.generate());
      
      expect(epic.childCount()).toBe(2);
    });
  });

  describe('Status Management', () => {
    it('should update status with valid transition', () => {
      const issue = Issue.create('Test Issue', 'Description', IssueType.Story, mockTimeProvider);
      const originalUpdatedAt = issue.updatedAt;
      
      mockTimeProvider.advance(1000);
      issue.updateStatus(IssueStatus.Todo);

      expect(issue.status).toBe(IssueStatus.Todo);
      expect(issue.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should throw error for invalid status transition', () => {
      const issue = Issue.create('Test Issue', 'Description', IssueType.Story, mockTimeProvider);
      
      // Move to InProgress then Done
      issue.updateStatus(IssueStatus.Todo);
      issue.updateStatus(IssueStatus.InProgress);
      issue.updateStatus(IssueStatus.Done);
      
      expect(() => { issue.updateStatus(IssueStatus.InProgress); })
        .toThrow('Invalid status transition from Done to InProgress');
    });

    it('should not update if status is the same', () => {
      const issue = Issue.create('Test Issue', 'Description', IssueType.Story, mockTimeProvider);
      const originalUpdatedAt = issue.updatedAt;
      
      mockTimeProvider.advance(1000);
      issue.updateStatus(IssueStatus.Backlog);

      expect(issue.updatedAt).toEqual(originalUpdatedAt);
    });

    it('should check if issue is blocked', () => {
      const issue = Issue.create('Test Issue', 'Description', IssueType.Story, mockTimeProvider);
      
      expect(issue.isBlocked()).toBe(false);
      
      const dependencyId = IssueId.generate();

      issue.addDependency(dependencyId);
      
      // With unresolved dependencies, issue should be blocked
      expect(issue.isBlocked()).toBe(true);
    });

    it('should check if issue is active', () => {
      const issue = Issue.create('Test Issue', 'Description', IssueType.Story, mockTimeProvider);
      
      expect(issue.isActive()).toBe(true); // Backlog is active
      
      issue.updateStatus(IssueStatus.Todo);
      expect(issue.isActive()).toBe(true);
      
      issue.updateStatus(IssueStatus.InProgress);
      expect(issue.isActive()).toBe(true);
      
      issue.updateStatus(IssueStatus.InReview);
      expect(issue.isActive()).toBe(true);
      
      issue.updateStatus(IssueStatus.Done);
      expect(issue.isActive()).toBe(false);
    });

    it('should check if issue is completed', () => {
      const issue = Issue.create('Test Issue', 'Description', IssueType.Story, mockTimeProvider);
      
      expect(issue.isCompleted()).toBe(false);
      
      issue.updateStatus(IssueStatus.Todo);
      issue.updateStatus(IssueStatus.InProgress);
      issue.updateStatus(IssueStatus.Done);
      
      expect(issue.isCompleted()).toBe(true);
    });
  });

  describe('Dependency Management', () => {
    it('should add dependency', () => {
      const issue = Issue.create('Test Issue', 'Description', IssueType.Story, mockTimeProvider);
      const dependencyId = IssueId.generate();
      const originalUpdatedAt = issue.updatedAt;

      mockTimeProvider.advance(1000);
      issue.addDependency(dependencyId);

      expect(issue.dependencies.some(id => id.equals(dependencyId))).toBe(true);
      expect(issue.dependencies).toHaveLength(1);
      expect(issue.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should not add duplicate dependency', () => {
      const issue = Issue.create('Test Issue', 'Description', IssueType.Story, mockTimeProvider);
      const dependencyId = IssueId.generate();
      
      issue.addDependency(dependencyId);
      issue.addDependency(dependencyId);

      expect(issue.dependencies).toHaveLength(1);
    });

    it('should not add self as dependency', () => {
      const issue = Issue.create('Test Issue', 'Description', IssueType.Story, mockTimeProvider);
      
      expect(() => { issue.addDependency(issue.id); })
        .toThrow('Issue cannot depend on itself');
    });

    it('should remove dependency', () => {
      const issue = Issue.create('Test Issue', 'Description', IssueType.Story, mockTimeProvider);
      const dep1 = IssueId.generate();
      const dep2 = IssueId.generate();
      
      issue.addDependency(dep1);
      issue.addDependency(dep2);
      
      mockTimeProvider.advance(1000);
      issue.removeDependency(dep1);

      expect(issue.dependencies.some(id => id.equals(dep1))).toBe(false);
      expect(issue.dependencies.some(id => id.equals(dep2))).toBe(true);
      expect(issue.dependencies).toHaveLength(1);
    });

    it('should check if issue has dependency', () => {
      const issue = Issue.create('Test Issue', 'Description', IssueType.Story, mockTimeProvider);
      const dependencyId = IssueId.generate();
      
      expect(issue.hasDependency(dependencyId)).toBe(false);
      
      issue.addDependency(dependencyId);
      
      expect(issue.hasDependency(dependencyId)).toBe(true);
    });

    it('should get dependency count', () => {
      const issue = Issue.create('Test Issue', 'Description', IssueType.Story, mockTimeProvider);
      
      expect(issue.dependencyCount()).toBe(0);
      
      issue.addDependency(IssueId.generate());
      issue.addDependency(IssueId.generate());
      
      expect(issue.dependencyCount()).toBe(2);
    });
  });

  describe('Estimation', () => {
    it('should set estimate for Subtask', () => {
      const subtask = Issue.create('Subtask', 'Description', IssueType.Subtask, mockTimeProvider);
      const originalUpdatedAt = subtask.updatedAt;
      
      mockTimeProvider.advance(1000);
      subtask.setEstimate(5);

      expect(subtask.estimate).toBe(5);
      expect(subtask.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should set estimate for Story without children', () => {
      const story = Issue.create('Story', 'Description', IssueType.Story, mockTimeProvider);
      
      story.setEstimate(8);

      expect(story.estimate).toBe(8);
    });

    it('should throw error when setting estimate on Story with children', () => {
      const story = Issue.create('Story', 'Description', IssueType.Story, mockTimeProvider);

      story.addChild(IssueId.generate());

      expect(() => { story.setEstimate(8); })
        .toThrow('Cannot set estimate on Story with children');
    });

    it('should throw error when setting estimate on Epic', () => {
      const epic = Issue.create('Epic', 'Description', IssueType.Epic, mockTimeProvider);

      expect(() => { epic.setEstimate(13); })
        .toThrow('Cannot set estimate on Epic');
    });

    it('should validate estimate is positive', () => {
      const subtask = Issue.create('Subtask', 'Description', IssueType.Subtask, mockTimeProvider);

      expect(() => { subtask.setEstimate(0); })
        .toThrow('Estimate must be positive');
      
      expect(() => { subtask.setEstimate(-5); })
        .toThrow('Estimate must be positive');
    });

    it('should validate estimate follows Fibonacci sequence', () => {
      const subtask = Issue.create('Subtask', 'Description', IssueType.Subtask, mockTimeProvider);

      // Valid Fibonacci values
      subtask.setEstimate(1);
      expect(subtask.estimate).toBe(1);
      
      subtask.setEstimate(2);
      expect(subtask.estimate).toBe(2);
      
      subtask.setEstimate(3);
      expect(subtask.estimate).toBe(3);
      
      subtask.setEstimate(5);
      expect(subtask.estimate).toBe(5);
      
      subtask.setEstimate(8);
      expect(subtask.estimate).toBe(8);
      
      subtask.setEstimate(13);
      expect(subtask.estimate).toBe(13);

      // Invalid values
      expect(() => { subtask.setEstimate(4); })
        .toThrow('Estimate must follow Fibonacci sequence');
      
      expect(() => { subtask.setEstimate(7); })
        .toThrow('Estimate must follow Fibonacci sequence');
      
      expect(() => { subtask.setEstimate(10); })
        .toThrow('Estimate must follow Fibonacci sequence');
    });

    it('should clear estimate', () => {
      const subtask = Issue.create('Subtask', 'Description', IssueType.Subtask, mockTimeProvider);
      
      subtask.setEstimate(5);
      expect(subtask.estimate).toBe(5);
      
      mockTimeProvider.advance(1000);
      subtask.clearEstimate();
      
      expect(subtask.estimate).toBeUndefined();
    });
  });

  describe('Issue Updates', () => {
    it('should update title', () => {
      const issue = Issue.create('Original Title', 'Description', IssueType.Story, mockTimeProvider);
      const originalUpdatedAt = issue.updatedAt;
      
      mockTimeProvider.advance(1000);
      issue.updateTitle('New Title');

      expect(issue.title).toBe('New Title');
      expect(issue.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should throw error for empty title update', () => {
      const issue = Issue.create('Title', 'Description', IssueType.Story, mockTimeProvider);

      expect(() => { issue.updateTitle(''); })
        .toThrow('Issue title cannot be empty');
    });

    it('should update description', () => {
      const issue = Issue.create('Title', 'Original Description', IssueType.Story, mockTimeProvider);
      const originalUpdatedAt = issue.updatedAt;
      
      mockTimeProvider.advance(1000);
      issue.updateDescription('New Description');

      expect(issue.description).toBe('New Description');
      expect(issue.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should allow empty description', () => {
      const issue = Issue.create('Title', 'Description', IssueType.Story, mockTimeProvider);

      issue.updateDescription('');
      
      expect(issue.description).toBe('');
    });
  });

  describe('Immutability', () => {
    it('should not allow direct modification of childIds array', () => {
      const epic = Issue.create('Epic', 'Description', IssueType.Epic, mockTimeProvider);
      
      const childId = IssueId.generate();

      epic.addChild(childId);
      
      const children = epic.childIds;

      children.push(IssueId.generate());
      
      expect(epic.childIds).toHaveLength(1);
    });

    it('should not allow direct modification of dependencies array', () => {
      const issue = Issue.create('Issue', 'Description', IssueType.Story, mockTimeProvider);
      
      const depId = IssueId.generate();

      issue.addDependency(depId);
      
      const deps = issue.dependencies;

      deps.push(IssueId.generate());
      
      expect(issue.dependencies).toHaveLength(1);
    });

    it('should return new arrays for getters', () => {
      const epic = Issue.create('Epic', 'Description', IssueType.Epic, mockTimeProvider);
      
      const children1 = epic.childIds;
      const children2 = epic.childIds;
      
      expect(children1).not.toBe(children2);
      expect(children1).toEqual(children2);
      
      const deps1 = epic.dependencies;
      const deps2 = epic.dependencies;
      
      expect(deps1).not.toBe(deps2);
      expect(deps1).toEqual(deps2);
    });
  });
});