import { describe, it, expect, beforeEach } from 'vitest';

import { IssueId } from '../../src/domain/value-objects/issue-id.js';
import { IssueStatus } from '../../src/domain/value-objects/issue-status.js';
import { IssueType } from '../../src/domain/value-objects/issue-type.js';
import { ProjectId } from '../../src/domain/value-objects/project-id.js';
import { ProjectStatus } from '../../src/domain/value-objects/project-status.js';
import { WorkflowStage } from '../../src/domain/value-objects/workflow-stage.js';

describe('Value Objects Unit Tests', () => {
  describe('ProjectId', () => {
    describe('Generation', () => {
      it('should generate unique project IDs', () => {
        const id1 = ProjectId.generate();
        const id2 = ProjectId.generate();
        
        expect(id1.value).toBeDefined();
        expect(id2.value).toBeDefined();
        expect(id1.value).not.toBe(id2.value);
        expect(id1.equals(id2)).toBe(false);
      });

      it('should generate project ID with correct format', () => {
        const projectId = ProjectId.generate();
        
        // Should be a valid UUID format
        const uuidRegex = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

        expect(uuidRegex.test(projectId.value)).toBe(true);
      });
    });

    describe('Factory Method', () => {
      it('should create project ID from valid string', () => {
        const value = 'valid-project-id-123';
        const projectId = ProjectId.from(value);
        
        expect(projectId.value).toBe(value);
        expect(projectId.toString()).toBe(value);
      });

      it('should create project ID from UUID string', () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        const projectId = ProjectId.from(uuid);
        
        expect(projectId.value).toBe(uuid);
        expect(projectId.toString()).toBe(uuid);
      });

      it('should throw error for null or undefined value', () => {
        expect(() => ProjectId.from(null as any)).toThrow('ProjectId value must be a non-empty string');
        expect(() => ProjectId.from(undefined as any)).toThrow('ProjectId value must be a non-empty string');
      });

      it('should throw error for non-string value', () => {
        expect(() => ProjectId.from(123 as any)).toThrow('ProjectId value must be a non-empty string');
        expect(() => ProjectId.from({} as any)).toThrow('ProjectId value must be a non-empty string');
        expect(() => ProjectId.from([] as any)).toThrow('ProjectId value must be a non-empty string');
      });

      it('should throw error for empty string', () => {
        expect(() => ProjectId.from('')).toThrow('ProjectId value cannot be empty or whitespace');
      });

      it('should throw error for whitespace-only string', () => {
        expect(() => ProjectId.from('   ')).toThrow('ProjectId value cannot be empty or whitespace');
        expect(() => ProjectId.from('\t\n')).toThrow('ProjectId value cannot be empty or whitespace');
      });

      it('should throw error for string shorter than minimum length', () => {
        expect(() => ProjectId.from('ab')).toThrow('ProjectId value must be at least 3 characters long');
        expect(() => ProjectId.from('x')).toThrow('ProjectId value must be at least 3 characters long');
      });

      it('should accept string at minimum length', () => {
        const projectId = ProjectId.from('abc');

        expect(projectId.value).toBe('abc');
      });
    });

    describe('Immutability', () => {
      it('should not allow modification of value', () => {
        const projectId = ProjectId.from('test-project-id');
        
        // TypeScript should prevent this, but test runtime behavior
        expect(() => {
          (projectId as any).value = 'modified';
        }).toThrow();
      });

      it('should return same value on multiple calls', () => {
        const projectId = ProjectId.from('test-project-id');
        
        expect(projectId.value).toBe('test-project-id');
        expect(projectId.value).toBe('test-project-id');
        expect(projectId.toString()).toBe('test-project-id');
      });
    });

    describe('Equality', () => {
      it('should be equal when values are identical', () => {
        const id1 = ProjectId.from('same-id');
        const id2 = ProjectId.from('same-id');
        
        expect(id1.equals(id2)).toBe(true);
        expect(id2.equals(id1)).toBe(true);
      });

      it('should not be equal when values differ', () => {
        const id1 = ProjectId.from('project-id-1');
        const id2 = ProjectId.from('project-id-2');
        
        expect(id1.equals(id2)).toBe(false);
        expect(id2.equals(id1)).toBe(false);
      });

      it('should handle case sensitivity correctly', () => {
        const id1 = ProjectId.from('Project-ID');
        const id2 = ProjectId.from('project-id');
        
        expect(id1.equals(id2)).toBe(false);
      });
    });

    describe('String Representation', () => {
      it('should return value as string', () => {
        const value = 'test-project-id-123';
        const projectId = ProjectId.from(value);
        
        expect(projectId.toString()).toBe(value);
        expect(String(projectId)).toBe(value);
      });
    });
  });

  describe('IssueId', () => {
    describe('Generation', () => {
      it('should generate unique issue IDs', () => {
        const id1 = IssueId.generate();
        const id2 = IssueId.generate();
        
        expect(id1.value).toBeDefined();
        expect(id2.value).toBeDefined();
        expect(id1.value).not.toBe(id2.value);
        expect(id1.equals(id2)).toBe(false);
      });

      it('should generate issue ID with correct format', () => {
        const issueId = IssueId.generate();
        
        // Should be a valid UUID format
        const uuidRegex = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

        expect(uuidRegex.test(issueId.value)).toBe(true);
      });
    });

    describe('Factory Method', () => {
      it('should create issue ID from valid string', () => {
        const value = 'valid-issue-id-456';
        const issueId = IssueId.from(value);
        
        expect(issueId.value).toBe(value);
        expect(issueId.toString()).toBe(value);
      });

      it('should create issue ID from UUID string', () => {
        const uuid = '987fcdeb-51a2-43d7-8765-123456789abc';
        const issueId = IssueId.from(uuid);
        
        expect(issueId.value).toBe(uuid);
        expect(issueId.toString()).toBe(uuid);
      });

      it('should throw error for null or undefined value', () => {
        expect(() => IssueId.from(null as any)).toThrow('IssueId value must be a non-empty string');
        expect(() => IssueId.from(undefined as any)).toThrow('IssueId value must be a non-empty string');
      });

      it('should throw error for non-string value', () => {
        expect(() => IssueId.from(456 as any)).toThrow('IssueId value must be a non-empty string');
        expect(() => IssueId.from({} as any)).toThrow('IssueId value must be a non-empty string');
        expect(() => IssueId.from([] as any)).toThrow('IssueId value must be a non-empty string');
      });

      it('should throw error for empty string', () => {
        expect(() => IssueId.from('')).toThrow('IssueId value cannot be empty or whitespace');
      });

      it('should throw error for whitespace-only string', () => {
        expect(() => IssueId.from('   ')).toThrow('IssueId value cannot be empty or whitespace');
        expect(() => IssueId.from('\t\n')).toThrow('IssueId value cannot be empty or whitespace');
      });

      it('should throw error for string shorter than minimum length', () => {
        expect(() => IssueId.from('xy')).toThrow('IssueId value must be at least 3 characters long');
        expect(() => IssueId.from('z')).toThrow('IssueId value must be at least 3 characters long');
      });

      it('should accept string at minimum length', () => {
        const issueId = IssueId.from('xyz');

        expect(issueId.value).toBe('xyz');
      });
    });

    describe('Immutability', () => {
      it('should not allow modification of value', () => {
        const issueId = IssueId.from('test-issue-id');
        
        // TypeScript should prevent this, but test runtime behavior
        expect(() => {
          (issueId as any).value = 'modified';
        }).toThrow();
      });
    });

    describe('Equality', () => {
      it('should be equal when values are identical', () => {
        const id1 = IssueId.from('same-issue-id');
        const id2 = IssueId.from('same-issue-id');
        
        expect(id1.equals(id2)).toBe(true);
        expect(id2.equals(id1)).toBe(true);
      });

      it('should not be equal when values differ', () => {
        const id1 = IssueId.from('issue-id-1');
        const id2 = IssueId.from('issue-id-2');
        
        expect(id1.equals(id2)).toBe(false);
        expect(id2.equals(id1)).toBe(false);
      });
    });

    describe('String Representation', () => {
      it('should return value as string', () => {
        const value = 'test-issue-id-789';
        const issueId = IssueId.from(value);
        
        expect(issueId.toString()).toBe(value);
        expect(String(issueId)).toBe(value);
      });
    });
  });

  describe('IssueType', () => {
    describe('Valid Types', () => {
      it('should accept Epic type', () => {
        const type = IssueType.Epic;

        expect(type).toBe('Epic');
      });

      it('should accept Story type', () => {
        const type = IssueType.Story;

        expect(type).toBe('Story');
      });

      it('should accept Subtask type', () => {
        const type = IssueType.Subtask;

        expect(type).toBe('Subtask');
      });
    });

    describe('Type Validation', () => {
      it('should validate Epic as valid issue type', () => {
        expect(IssueType.isValid('Epic')).toBe(true);
      });

      it('should validate Story as valid issue type', () => {
        expect(IssueType.isValid('Story')).toBe(true);
      });

      it('should validate Subtask as valid issue type', () => {
        expect(IssueType.isValid('Subtask')).toBe(true);
      });

      it('should reject invalid issue types', () => {
        expect(IssueType.isValid('Task')).toBe(false);
        expect(IssueType.isValid('Bug')).toBe(false);
        expect(IssueType.isValid('Feature')).toBe(false);
        expect(IssueType.isValid('')).toBe(false);
        expect(IssueType.isValid(null as any)).toBe(false);
        expect(IssueType.isValid(undefined as any)).toBe(false);
      });

      it('should be case sensitive', () => {
        expect(IssueType.isValid('epic')).toBe(false);
        expect(IssueType.isValid('EPIC')).toBe(false);
        expect(IssueType.isValid('story')).toBe(false);
        expect(IssueType.isValid('subtask')).toBe(false);
      });
    });

    describe('Type Assertion', () => {
      it('should assert valid Epic type', () => {
        expect(() => { IssueType.assertValid('Epic'); }).not.toThrow();
      });

      it('should assert valid Story type', () => {
        expect(() => { IssueType.assertValid('Story'); }).not.toThrow();
      });

      it('should assert valid Subtask type', () => {
        expect(() => { IssueType.assertValid('Subtask'); }).not.toThrow();
      });

      it('should throw error for invalid types', () => {
        expect(() => { IssueType.assertValid('Task'); }).toThrow('Invalid issue type: Task. Valid types are: Epic, Story, Subtask');
        expect(() => { IssueType.assertValid('Bug'); }).toThrow('Invalid issue type: Bug. Valid types are: Epic, Story, Subtask');
        expect(() => { IssueType.assertValid(''); }).toThrow('Invalid issue type: . Valid types are: Epic, Story, Subtask');
      });

      it('should throw error for null/undefined', () => {
        expect(() => { IssueType.assertValid(null as any); }).toThrow('Invalid issue type: null. Valid types are: Epic, Story, Subtask');
        expect(() => { IssueType.assertValid(undefined as any); }).toThrow('Invalid issue type: undefined. Valid types are: Epic, Story, Subtask');
      });
    });

    describe('All Types', () => {
      it('should return all valid issue types', () => {
        const allTypes = IssueType.allTypes();

        expect(allTypes).toEqual(['Epic', 'Story', 'Subtask']);
        expect(allTypes.length).toBe(3);
      });

      it('should return immutable array', () => {
        const allTypes = IssueType.allTypes();
        const originalLength = allTypes.length;
        
        allTypes.push('InvalidType' as any);
        
        // Should not affect subsequent calls
        expect(IssueType.allTypes().length).toBe(originalLength);
      });
    });
  });

  describe('IssueStatus', () => {
    describe('Valid Statuses', () => {
      it('should accept Backlog status', () => {
        const status = IssueStatus.Backlog;

        expect(status).toBe('Backlog');
      });

      it('should accept Todo status', () => {
        const status = IssueStatus.Todo;

        expect(status).toBe('Todo');
      });

      it('should accept InProgress status', () => {
        const status = IssueStatus.InProgress;

        expect(status).toBe('InProgress');
      });

      it('should accept InReview status', () => {
        const status = IssueStatus.InReview;

        expect(status).toBe('InReview');
      });

      it('should accept Done status', () => {
        const status = IssueStatus.Done;

        expect(status).toBe('Done');
      });

      it('should accept Canceled status', () => {
        const status = IssueStatus.Canceled;

        expect(status).toBe('Canceled');
      });

      it('should accept Duplicate status', () => {
        const status = IssueStatus.Duplicate;

        expect(status).toBe('Duplicate');
      });
    });

    describe('Status Validation', () => {
      it('should validate all valid statuses', () => {
        expect(IssueStatus.isValid('Backlog')).toBe(true);
        expect(IssueStatus.isValid('Todo')).toBe(true);
        expect(IssueStatus.isValid('InProgress')).toBe(true);
        expect(IssueStatus.isValid('InReview')).toBe(true);
        expect(IssueStatus.isValid('Done')).toBe(true);
        expect(IssueStatus.isValid('Canceled')).toBe(true);
        expect(IssueStatus.isValid('Duplicate')).toBe(true);
      });

      it('should reject invalid statuses', () => {
        expect(IssueStatus.isValid('Open')).toBe(false);
        expect(IssueStatus.isValid('Closed')).toBe(false);
        expect(IssueStatus.isValid('New')).toBe(false);
        expect(IssueStatus.isValid('')).toBe(false);
        expect(IssueStatus.isValid(null as any)).toBe(false);
        expect(IssueStatus.isValid(undefined as any)).toBe(false);
      });

      it('should be case sensitive', () => {
        expect(IssueStatus.isValid('backlog')).toBe(false);
        expect(IssueStatus.isValid('todo')).toBe(false);
        expect(IssueStatus.isValid('inprogress')).toBe(false);
        expect(IssueStatus.isValid('DONE')).toBe(false);
      });
    });

    describe('Status Transitions', () => {
      it('should validate legal transitions from Backlog', () => {
        expect(IssueStatus.canTransition('Backlog', 'Todo')).toBe(true);
        expect(IssueStatus.canTransition('Backlog', 'Canceled')).toBe(true);
        expect(IssueStatus.canTransition('Backlog', 'Duplicate')).toBe(true);
      });

      it('should reject illegal transitions from Backlog', () => {
        expect(IssueStatus.canTransition('Backlog', 'InProgress')).toBe(false);
        expect(IssueStatus.canTransition('Backlog', 'InReview')).toBe(false);
        expect(IssueStatus.canTransition('Backlog', 'Done')).toBe(false);
      });

      it('should validate legal transitions from Todo', () => {
        expect(IssueStatus.canTransition('Todo', 'InProgress')).toBe(true);
        expect(IssueStatus.canTransition('Todo', 'Backlog')).toBe(true);
        expect(IssueStatus.canTransition('Todo', 'Canceled')).toBe(true);
        expect(IssueStatus.canTransition('Todo', 'Duplicate')).toBe(true);
      });

      it('should validate legal transitions from InProgress', () => {
        expect(IssueStatus.canTransition('InProgress', 'InReview')).toBe(true);
        expect(IssueStatus.canTransition('InProgress', 'Todo')).toBe(true);
        expect(IssueStatus.canTransition('InProgress', 'Canceled')).toBe(true);
      });

      it('should validate legal transitions from InReview', () => {
        expect(IssueStatus.canTransition('InReview', 'Done')).toBe(true);
        expect(IssueStatus.canTransition('InReview', 'InProgress')).toBe(true);
        expect(IssueStatus.canTransition('InReview', 'Canceled')).toBe(true);
      });

      it('should allow no transitions from Done', () => {
        expect(IssueStatus.canTransition('Done', 'InReview')).toBe(false);
        expect(IssueStatus.canTransition('Done', 'InProgress')).toBe(false);
        expect(IssueStatus.canTransition('Done', 'Todo')).toBe(false);
        expect(IssueStatus.canTransition('Done', 'Backlog')).toBe(false);
        expect(IssueStatus.canTransition('Done', 'Canceled')).toBe(false);
        expect(IssueStatus.canTransition('Done', 'Duplicate')).toBe(false);
      });

      it('should allow no transitions from Canceled', () => {
        expect(IssueStatus.canTransition('Canceled', 'Todo')).toBe(false);
        expect(IssueStatus.canTransition('Canceled', 'InProgress')).toBe(false);
        expect(IssueStatus.canTransition('Canceled', 'Done')).toBe(false);
      });

      it('should allow no transitions from Duplicate', () => {
        expect(IssueStatus.canTransition('Duplicate', 'Todo')).toBe(false);
        expect(IssueStatus.canTransition('Duplicate', 'InProgress')).toBe(false);
        expect(IssueStatus.canTransition('Duplicate', 'Done')).toBe(false);
      });
    });

    describe('Status Categories', () => {
      it('should identify active statuses', () => {
        expect(IssueStatus.isActive('Backlog')).toBe(true);
        expect(IssueStatus.isActive('Todo')).toBe(true);
        expect(IssueStatus.isActive('InProgress')).toBe(true);
        expect(IssueStatus.isActive('InReview')).toBe(true);
      });

      it('should identify inactive statuses', () => {
        expect(IssueStatus.isActive('Done')).toBe(false);
        expect(IssueStatus.isActive('Canceled')).toBe(false);
        expect(IssueStatus.isActive('Duplicate')).toBe(false);
      });

      it('should identify completed statuses', () => {
        expect(IssueStatus.isCompleted('Done')).toBe(true);
        expect(IssueStatus.isCompleted('Canceled')).toBe(true);
        expect(IssueStatus.isCompleted('Duplicate')).toBe(true);
      });

      it('should identify non-completed statuses', () => {
        expect(IssueStatus.isCompleted('Backlog')).toBe(false);
        expect(IssueStatus.isCompleted('Todo')).toBe(false);
        expect(IssueStatus.isCompleted('InProgress')).toBe(false);
        expect(IssueStatus.isCompleted('InReview')).toBe(false);
      });
    });
  });

  describe('ProjectStatus', () => {
    describe('Valid Statuses', () => {
      it('should accept Planning status', () => {
        const status = ProjectStatus.Planning;

        expect(status).toBe('Planning');
      });

      it('should accept Active status', () => {
        const status = ProjectStatus.Active;

        expect(status).toBe('Active');
      });

      it('should accept OnHold status', () => {
        const status = ProjectStatus.OnHold;

        expect(status).toBe('OnHold');
      });

      it('should accept Completed status', () => {
        const status = ProjectStatus.Completed;

        expect(status).toBe('Completed');
      });

      it('should accept Archived status', () => {
        const status = ProjectStatus.Archived;

        expect(status).toBe('Archived');
      });
    });

    describe('Status Validation', () => {
      it('should validate all valid project statuses', () => {
        expect(ProjectStatus.isValid('Planning')).toBe(true);
        expect(ProjectStatus.isValid('Active')).toBe(true);
        expect(ProjectStatus.isValid('OnHold')).toBe(true);
        expect(ProjectStatus.isValid('Completed')).toBe(true);
        expect(ProjectStatus.isValid('Archived')).toBe(true);
      });

      it('should reject invalid project statuses', () => {
        expect(ProjectStatus.isValid('Open')).toBe(false);
        expect(ProjectStatus.isValid('Closed')).toBe(false);
        expect(ProjectStatus.isValid('Draft')).toBe(false);
        expect(ProjectStatus.isValid('')).toBe(false);
        expect(ProjectStatus.isValid(null as any)).toBe(false);
        expect(ProjectStatus.isValid(undefined as any)).toBe(false);
      });

      it('should be case sensitive', () => {
        expect(ProjectStatus.isValid('planning')).toBe(false);
        expect(ProjectStatus.isValid('active')).toBe(false);
        expect(ProjectStatus.isValid('COMPLETED')).toBe(false);
      });
    });

    describe('Status Transitions', () => {
      it('should validate legal transitions from Planning', () => {
        expect(ProjectStatus.canTransition('Planning', 'Active')).toBe(true);
        expect(ProjectStatus.canTransition('Planning', 'OnHold')).toBe(true);
        expect(ProjectStatus.canTransition('Planning', 'Archived')).toBe(true);
      });

      it('should validate legal transitions from Active', () => {
        expect(ProjectStatus.canTransition('Active', 'OnHold')).toBe(true);
        expect(ProjectStatus.canTransition('Active', 'Completed')).toBe(true);
        expect(ProjectStatus.canTransition('Active', 'Archived')).toBe(true);
      });

      it('should validate legal transitions from OnHold', () => {
        expect(ProjectStatus.canTransition('OnHold', 'Active')).toBe(true);
        expect(ProjectStatus.canTransition('OnHold', 'Planning')).toBe(true);
        expect(ProjectStatus.canTransition('OnHold', 'Archived')).toBe(true);
      });

      it('should validate transitions from Completed', () => {
        expect(ProjectStatus.canTransition('Completed', 'Archived')).toBe(true);
        expect(ProjectStatus.canTransition('Completed', 'Active')).toBe(false);
      });

      it('should allow no transitions from Archived', () => {
        expect(ProjectStatus.canTransition('Archived', 'Active')).toBe(false);
        expect(ProjectStatus.canTransition('Archived', 'Planning')).toBe(false);
        expect(ProjectStatus.canTransition('Archived', 'Completed')).toBe(false);
      });
    });

    describe('Status Categories', () => {
      it('should identify active project statuses', () => {
        expect(ProjectStatus.isActive('Planning')).toBe(true);
        expect(ProjectStatus.isActive('Active')).toBe(true);
        expect(ProjectStatus.isActive('OnHold')).toBe(true);
      });

      it('should identify inactive project statuses', () => {
        expect(ProjectStatus.isActive('Completed')).toBe(false);
        expect(ProjectStatus.isActive('Archived')).toBe(false);
      });
    });
  });

  describe('WorkflowStage', () => {
    describe('Creation', () => {
      it('should create workflow stage with valid name', () => {
        const stageName = 'requirements-gathering';
        const stage = WorkflowStage.from(stageName);
        
        expect(stage.name).toBe(stageName);
        expect(stage.toString()).toBe(stageName);
      });

      it('should create workflow stage with complex name', () => {
        const stageName = 'code-review-and-testing';
        const stage = WorkflowStage.from(stageName);
        
        expect(stage.name).toBe(stageName);
      });

      it('should create workflow stage with underscores', () => {
        const stageName = 'integration_testing';
        const stage = WorkflowStage.from(stageName);
        
        expect(stage.name).toBe(stageName);
      });
    });

    describe('Validation', () => {
      it('should throw error for null or undefined name', () => {
        expect(() => WorkflowStage.from(null as any)).toThrow('WorkflowStage name must be a non-empty string');
        expect(() => WorkflowStage.from(undefined as any)).toThrow('WorkflowStage name must be a non-empty string');
      });

      it('should throw error for non-string name', () => {
        expect(() => WorkflowStage.from(123 as any)).toThrow('WorkflowStage name must be a non-empty string');
        expect(() => WorkflowStage.from({} as any)).toThrow('WorkflowStage name must be a non-empty string');
        expect(() => WorkflowStage.from([] as any)).toThrow('WorkflowStage name must be a non-empty string');
      });

      it('should throw error for empty string', () => {
        expect(() => WorkflowStage.from('')).toThrow('WorkflowStage name cannot be empty or whitespace');
      });

      it('should throw error for whitespace-only string', () => {
        expect(() => WorkflowStage.from('   ')).toThrow('WorkflowStage name cannot be empty or whitespace');
        expect(() => WorkflowStage.from('\t\n')).toThrow('WorkflowStage name cannot be empty or whitespace');
      });

      it('should throw error for invalid characters', () => {
        expect(() => WorkflowStage.from('invalid stage!')).toThrow('WorkflowStage name can only contain letters, numbers, hyphens, and underscores');
        expect(() => WorkflowStage.from('stage with spaces')).toThrow('WorkflowStage name can only contain letters, numbers, hyphens, and underscores');
        expect(() => WorkflowStage.from('stage@name')).toThrow('WorkflowStage name can only contain letters, numbers, hyphens, and underscores');
        expect(() => WorkflowStage.from('stage.name')).toThrow('WorkflowStage name can only contain letters, numbers, hyphens, and underscores');
      });

      it('should accept valid characters', () => {
        expect(() => WorkflowStage.from('valid-stage-123')).not.toThrow();
        expect(() => WorkflowStage.from('valid_stage_456')).not.toThrow();
        expect(() => WorkflowStage.from('ValidStage789')).not.toThrow();
        expect(() => WorkflowStage.from('stage123')).not.toThrow();
      });

      it('should throw error for string shorter than minimum length', () => {
        expect(() => WorkflowStage.from('ab')).toThrow('WorkflowStage name must be at least 3 characters long');
        expect(() => WorkflowStage.from('x')).toThrow('WorkflowStage name must be at least 3 characters long');
      });

      it('should throw error for string longer than maximum length', () => {
        const longName = 'a'.repeat(51);

        expect(() => WorkflowStage.from(longName)).toThrow('WorkflowStage name must be no more than 50 characters long');
      });

      it('should accept string at boundaries', () => {
        const minName = 'abc';
        const maxName = 'a'.repeat(50);
        
        expect(() => WorkflowStage.from(minName)).not.toThrow();
        expect(() => WorkflowStage.from(maxName)).not.toThrow();
      });
    });

    describe('Immutability', () => {
      it('should not allow modification of name', () => {
        const stage = WorkflowStage.from('test-stage');
        
        // TypeScript should prevent this, but test runtime behavior
        expect(() => {
          (stage as any).name = 'modified';
        }).toThrow();
      });

      it('should return same name on multiple calls', () => {
        const stage = WorkflowStage.from('test-stage');
        
        expect(stage.name).toBe('test-stage');
        expect(stage.name).toBe('test-stage');
        expect(stage.toString()).toBe('test-stage');
      });
    });

    describe('Equality', () => {
      it('should be equal when names are identical', () => {
        const stage1 = WorkflowStage.from('same-stage');
        const stage2 = WorkflowStage.from('same-stage');
        
        expect(stage1.equals(stage2)).toBe(true);
        expect(stage2.equals(stage1)).toBe(true);
      });

      it('should not be equal when names differ', () => {
        const stage1 = WorkflowStage.from('stage-one');
        const stage2 = WorkflowStage.from('stage-two');
        
        expect(stage1.equals(stage2)).toBe(false);
        expect(stage2.equals(stage1)).toBe(false);
      });

      it('should handle case sensitivity correctly', () => {
        const stage1 = WorkflowStage.from('Test-Stage');
        const stage2 = WorkflowStage.from('test-stage');
        
        expect(stage1.equals(stage2)).toBe(false);
      });
    });

    describe('String Representation', () => {
      it('should return name as string', () => {
        const stageName = 'deployment-stage';
        const stage = WorkflowStage.from(stageName);
        
        expect(stage.toString()).toBe(stageName);
        expect(String(stage)).toBe(stageName);
      });
    });

    describe('Predefined Stages', () => {
      it('should provide common workflow stages', () => {
        expect(WorkflowStage.REQUIREMENTS).toBe('requirements');
        expect(WorkflowStage.DESIGN).toBe('design');
        expect(WorkflowStage.IMPLEMENTATION).toBe('implementation');
        expect(WorkflowStage.TESTING).toBe('testing');
        expect(WorkflowStage.DEPLOYMENT).toBe('deployment');
      });

      it('should create stages from predefined constants', () => {
        const reqStage = WorkflowStage.from(WorkflowStage.REQUIREMENTS);
        const implStage = WorkflowStage.from(WorkflowStage.IMPLEMENTATION);
        
        expect(reqStage.name).toBe('requirements');
        expect(implStage.name).toBe('implementation');
      });
    });
  });
});