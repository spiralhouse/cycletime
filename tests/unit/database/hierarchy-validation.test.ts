/**
 * JCVD Hierarchy Validation Tests
 * Comprehensive test coverage for all hierarchy validation scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  validateIssueHierarchy,
  validateIssueHierarchyBatch,
  checkHierarchyRules,
  detectCircularHierarchy,
  calculateIssueDepth,
  buildHierarchyTree,
  validateEstimationRules,
  HIERARCHY_ERROR_CODES,
} from '../../../src/database/models/hierarchy-validator.js';

import type { Issue, IssueType } from '../../../src/database/models/schema-types.js';

// =============================================================================
// Test Data Helpers
// =============================================================================

function createTestIssue(id: string, type: IssueType, parentId?: string, estimate?: number): Issue {
  return {
    id,
    project_id: 'test-project',
    parent_id: parentId,
    title: `Test ${type} ${id}`,
    description: `Test description for ${type}`,
    state_id: 'test-state',
    priority: 3,
    estimate,
    issue_type: type,
    assignee_id: undefined,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

// =============================================================================
// Hierarchy Rules Validation Tests
// =============================================================================

describe('checkHierarchyRules', () => {
  it('should allow epics without parents', () => {
    expect(checkHierarchyRules('epic')).toBe(true);
  });

  it('should not allow epics with parents', () => {
    expect(checkHierarchyRules('epic', 'epic')).toBe(false);
    expect(checkHierarchyRules('epic', 'story')).toBe(false);
    expect(checkHierarchyRules('epic', 'subtask')).toBe(false);
  });

  it('should not allow subtasks without parents', () => {
    expect(checkHierarchyRules('subtask')).toBe(false);
  });

  it('should allow subtasks with story parents', () => {
    expect(checkHierarchyRules('subtask', 'story')).toBe(true);
  });

  it('should not allow subtasks with non-story parents', () => {
    expect(checkHierarchyRules('subtask', 'epic')).toBe(false);
    expect(checkHierarchyRules('subtask', 'subtask')).toBe(false);
  });

  it('should allow stories with epic parents', () => {
    expect(checkHierarchyRules('story', 'epic')).toBe(true);
  });

  it('should not allow stories with non-epic parents', () => {
    expect(checkHierarchyRules('story', 'story')).toBe(false);
    expect(checkHierarchyRules('story', 'subtask')).toBe(false);
  });

  it('should allow bugs and features with epic or story parents', () => {
    expect(checkHierarchyRules('bug', 'epic')).toBe(true);
    expect(checkHierarchyRules('bug', 'story')).toBe(true);
    expect(checkHierarchyRules('feature', 'epic')).toBe(true);
    expect(checkHierarchyRules('feature', 'story')).toBe(true);
  });

  it('should not allow bugs and features with invalid parents', () => {
    expect(checkHierarchyRules('bug', 'subtask')).toBe(false);
    expect(checkHierarchyRules('feature', 'subtask')).toBe(false);
  });
});

// =============================================================================
// Individual Issue Validation Tests
// =============================================================================

describe('validateIssueHierarchy', () => {
  it('should validate a valid epic without parent', () => {
    const epic = createTestIssue('epic-1', 'epic');
    const result = validateIssueHierarchy(epic, []);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should invalidate epic with parent', () => {
    const epic = createTestIssue('epic-1', 'epic', 'parent-1');
    const result = validateIssueHierarchy(epic, []);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe(HIERARCHY_ERROR_CODES.EPIC_CANNOT_HAVE_PARENT);
  });

  it('should invalidate subtask without parent', () => {
    const subtask = createTestIssue('subtask-1', 'subtask');
    const result = validateIssueHierarchy(subtask, []);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe(HIERARCHY_ERROR_CODES.SUBTASK_REQUIRES_PARENT);
  });

  it('should invalidate self-reference', () => {
    const issue = createTestIssue('issue-1', 'story', 'issue-1');
    const result = validateIssueHierarchy(issue, []);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe(HIERARCHY_ERROR_CODES.SELF_REFERENCE_NOT_ALLOWED);
  });

  it('should validate valid story with epic parent', () => {
    const epic = createTestIssue('epic-1', 'epic');
    const story = createTestIssue('story-1', 'story', 'epic-1');
    const result = validateIssueHierarchy(story, [epic, story]);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should invalidate story with story parent', () => {
    const parentStory = createTestIssue('story-1', 'story');
    const childStory = createTestIssue('story-2', 'story', 'story-1');
    const result = validateIssueHierarchy(childStory, [parentStory, childStory]);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe(HIERARCHY_ERROR_CODES.INVALID_PARENT_CHILD_RELATIONSHIP);
  });

  it('should validate valid subtask with story parent', () => {
    const epic = createTestIssue('epic-1', 'epic');
    const story = createTestIssue('story-1', 'story', 'epic-1');
    const subtask = createTestIssue('subtask-1', 'subtask', 'story-1');
    const result = validateIssueHierarchy(subtask, [epic, story, subtask]);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should warn about missing parent in issue list', () => {
    const story = createTestIssue('story-1', 'story', 'epic-1');
    const result = validateIssueHierarchy(story, [story]);

    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe(HIERARCHY_ERROR_CODES.PARENT_NOT_FOUND);
  });
});

// =============================================================================
// Hierarchy Depth Tests
// =============================================================================

describe('calculateIssueDepth', () => {
  it('should calculate depth correctly for valid hierarchy', () => {
    const epic = createTestIssue('epic-1', 'epic');
    const story = createTestIssue('story-1', 'story', 'epic-1');
    const subtask = createTestIssue('subtask-1', 'subtask', 'story-1');
    const issues = [epic, story, subtask];

    expect(calculateIssueDepth(epic, issues)).toBe(1);
    expect(calculateIssueDepth(story, issues)).toBe(2);
    expect(calculateIssueDepth(subtask, issues)).toBe(3);
  });

  it('should handle missing parent gracefully', () => {
    const story = createTestIssue('story-1', 'story', 'missing-epic');
    const issues = [story];

    expect(calculateIssueDepth(story, issues)).toBe(2); // Assumes parent exists
  });

  it('should prevent infinite loops', () => {
    const issue1 = createTestIssue('issue-1', 'story', 'issue-2');
    const issue2 = createTestIssue('issue-2', 'story', 'issue-1');
    const issues = [issue1, issue2];

    // Should not hang, should return reasonable depth
    const depth = calculateIssueDepth(issue1, issues);

    expect(depth).toBeLessThanOrEqual(10);
  });
});

// =============================================================================
// Circular Dependency Detection Tests
// =============================================================================

describe('detectCircularHierarchy', () => {
  it('should detect simple circular dependency', () => {
    const issue1 = createTestIssue('issue-1', 'story', 'issue-2');
    const issue2 = createTestIssue('issue-2', 'story', 'issue-1');
    const issues = [issue1, issue2];

    const cycles = detectCircularHierarchy(issues);

    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toContain('issue-1');
    expect(cycles[0]).toContain('issue-2');
  });

  it('should detect complex circular dependency', () => {
    const issue1 = createTestIssue('issue-1', 'story', 'issue-2');
    const issue2 = createTestIssue('issue-2', 'story', 'issue-3');
    const issue3 = createTestIssue('issue-3', 'story', 'issue-1');
    const issues = [issue1, issue2, issue3];

    const cycles = detectCircularHierarchy(issues);

    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toContain('issue-1');
    expect(cycles[0]).toContain('issue-2');
    expect(cycles[0]).toContain('issue-3');
  });

  it('should not detect cycles in valid hierarchy', () => {
    const epic = createTestIssue('epic-1', 'epic');
    const story = createTestIssue('story-1', 'story', 'epic-1');
    const subtask = createTestIssue('subtask-1', 'subtask', 'story-1');
    const issues = [epic, story, subtask];

    const cycles = detectCircularHierarchy(issues);

    expect(cycles).toHaveLength(0);
  });

  it('should handle self-reference as cycle', () => {
    const issue = createTestIssue('issue-1', 'story', 'issue-1');
    const issues = [issue];

    const cycles = detectCircularHierarchy(issues);

    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toContain('issue-1');
  });
});

// =============================================================================
// Batch Validation Tests
// =============================================================================

describe('validateIssueHierarchyBatch', () => {
  it('should validate a valid hierarchy batch', () => {
    const epic = createTestIssue('epic-1', 'epic');
    const story = createTestIssue('story-1', 'story', 'epic-1');
    const subtask = createTestIssue('subtask-1', 'subtask', 'story-1', 5);
    const issues = [epic, story, subtask];

    const result = validateIssueHierarchyBatch(issues);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect multiple hierarchy violations', () => {
    const epicWithParent = createTestIssue('epic-1', 'epic', 'parent-1');
    const subtaskWithoutParent = createTestIssue('subtask-1', 'subtask');
    const issues = [epicWithParent, subtaskWithoutParent];

    const result = validateIssueHierarchyBatch(issues);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('should detect circular dependencies in batch', () => {
    const issue1 = createTestIssue('issue-1', 'story', 'issue-2');
    const issue2 = createTestIssue('issue-2', 'story', 'issue-1');
    const issues = [issue1, issue2];

    const result = validateIssueHierarchyBatch(issues);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some(e => e.code === HIERARCHY_ERROR_CODES.CIRCULAR_HIERARCHY_DETECTED)
    ).toBe(true);
  });

  it('should warn about orphaned subtasks', () => {
    const subtask = createTestIssue('subtask-1', 'subtask', 'missing-story');
    const issues = [subtask];

    const result = validateIssueHierarchyBatch(issues);

    expect(result.warnings.some(w => w.code === HIERARCHY_ERROR_CODES.ORPHANED_SUBTASK)).toBe(true);
  });
});

// =============================================================================
// Hierarchy Tree Building Tests
// =============================================================================

describe('buildHierarchyTree', () => {
  it('should build correct tree structure', () => {
    const epic = createTestIssue('epic-1', 'epic');
    const story1 = createTestIssue('story-1', 'story', 'epic-1');
    const story2 = createTestIssue('story-2', 'story', 'epic-1');
    const subtask1 = createTestIssue('subtask-1', 'subtask', 'story-1');
    const subtask2 = createTestIssue('subtask-2', 'subtask', 'story-1');
    const issues = [epic, story1, story2, subtask1, subtask2];

    const tree = buildHierarchyTree(issues);

    expect(tree).toHaveLength(1); // One root (epic)
    expect(tree[0].issue.id).toBe('epic-1');
    expect(tree[0].children).toHaveLength(2); // Two stories
    expect(tree[0].children[0].children).toHaveLength(2); // Two subtasks under story-1
    expect(tree[0].children[1].children).toHaveLength(0); // No subtasks under story-2
  });

  it('should handle multiple roots', () => {
    const epic1 = createTestIssue('epic-1', 'epic');
    const epic2 = createTestIssue('epic-2', 'epic');
    const story = createTestIssue('story-1', 'story', 'epic-1');
    const issues = [epic1, epic2, story];

    const tree = buildHierarchyTree(issues);

    expect(tree).toHaveLength(2); // Two roots
    expect(tree[0].children).toHaveLength(1); // epic-1 has one child
    expect(tree[1].children).toHaveLength(0); // epic-2 has no children
  });

  it('should set correct depth and path', () => {
    const epic = createTestIssue('epic-1', 'epic');
    const story = createTestIssue('story-1', 'story', 'epic-1');
    const subtask = createTestIssue('subtask-1', 'subtask', 'story-1');
    const issues = [epic, story, subtask];

    const tree = buildHierarchyTree(issues);

    expect(tree[0].depth).toBe(0); // Root depth
    expect(tree[0].children[0].depth).toBe(1); // Story depth
    expect(tree[0].children[0].children[0].depth).toBe(2); // Subtask depth

    expect(tree[0].path).toEqual([]);
    expect(tree[0].children[0].path).toEqual(['epic-1']);
    expect(tree[0].children[0].children[0].path).toEqual(['epic-1', 'story-1']);
  });
});

// =============================================================================
// Estimation Rules Validation Tests
// =============================================================================

describe('validateEstimationRules', () => {
  it('should warn about parents with estimates', () => {
    const epic = createTestIssue('epic-1', 'epic', undefined, 10);
    const story = createTestIssue('story-1', 'story', 'epic-1', 5);
    const subtask = createTestIssue('subtask-1', 'subtask', 'story-1', 3);
    const issues = [epic, story, subtask];

    const result = validateEstimationRules(issues);

    expect(
      result.warnings.some(
        w =>
          w.code === HIERARCHY_ERROR_CODES.PARENT_WITH_ESTIMATE && w.context?.issueId === 'epic-1'
      )
    ).toBe(true);

    expect(
      result.warnings.some(
        w =>
          w.code === HIERARCHY_ERROR_CODES.PARENT_WITH_ESTIMATE && w.context?.issueId === 'story-1'
      )
    ).toBe(true);
  });

  it('should warn about subtasks without estimates', () => {
    const epic = createTestIssue('epic-1', 'epic');
    const story = createTestIssue('story-1', 'story', 'epic-1');
    const subtask = createTestIssue('subtask-1', 'subtask', 'story-1');
    const issues = [epic, story, subtask];

    const result = validateEstimationRules(issues);

    expect(
      result.warnings.some(
        w =>
          w.code === HIERARCHY_ERROR_CODES.SUBTASK_WITHOUT_ESTIMATE &&
          w.context?.issueId === 'subtask-1'
      )
    ).toBe(true);
  });

  it('should not warn about valid estimation patterns', () => {
    const epic = createTestIssue('epic-1', 'epic');
    const story = createTestIssue('story-1', 'story', 'epic-1');
    const subtask = createTestIssue('subtask-1', 'subtask', 'story-1', 5);
    const issues = [epic, story, subtask];

    const result = validateEstimationRules(issues);

    const estimationWarnings = result.warnings.filter(
      w =>
        w.code === HIERARCHY_ERROR_CODES.PARENT_WITH_ESTIMATE ||
        w.code === HIERARCHY_ERROR_CODES.SUBTASK_WITHOUT_ESTIMATE
    );

    expect(estimationWarnings).toHaveLength(0);
  });
});

// =============================================================================
// Performance Tests
// =============================================================================

describe('performance tests', () => {
  it('should validate large hierarchy batch within performance limits', () => {
    // Create a large batch of issues (1000 issues)
    const issues: Issue[] = [];

    // Create 100 epics
    for (let i = 0; i < 100; i++) {
      issues.push(createTestIssue(`epic-${i}`, 'epic'));
    }

    // Create 300 stories (3 per epic)
    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < 3; j++) {
        issues.push(createTestIssue(`story-${i}-${j}`, 'story', `epic-${i}`));
      }
    }

    // Create 600 subtasks (2 per story)
    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 2; k++) {
          issues.push(createTestIssue(`subtask-${i}-${j}-${k}`, 'subtask', `story-${i}-${j}`, 3));
        }
      }
    }

    const startTime = Date.now();
    const result = validateIssueHierarchyBatch(issues);
    const endTime = Date.now();

    const executionTime = endTime - startTime;

    expect(result.isValid).toBe(true);
    expect(executionTime).toBeLessThan(100); // Should complete in under 100ms
  });

  it('should detect circular dependencies efficiently', () => {
    // Create a batch with some circular dependencies
    const issues: Issue[] = [];

    // Add some valid hierarchy
    for (let i = 0; i < 100; i++) {
      issues.push(createTestIssue(`epic-${i}`, 'epic'));
      issues.push(createTestIssue(`story-${i}`, 'story', `epic-${i}`));
    }

    // Add circular dependencies
    issues.push(createTestIssue('cycle-1', 'story', 'cycle-2'));
    issues.push(createTestIssue('cycle-2', 'story', 'cycle-3'));
    issues.push(createTestIssue('cycle-3', 'story', 'cycle-1'));

    const startTime = Date.now();
    const cycles = detectCircularHierarchy(issues);
    const endTime = Date.now();

    const executionTime = endTime - startTime;

    expect(cycles).toHaveLength(1);
    expect(executionTime).toBeLessThan(50); // Should complete in under 50ms
  });
});
