/**
 * JCVD Hierarchy Validation Module
 * Application-level validation functions that mirror database constraints
 * for Epic → Story → Subtask hierarchy enforcement
 */

import { Issue, IssueType } from './schema-types.js'

// =============================================================================
// Validation Result Types
// =============================================================================

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  code: string
  message: string
  field?: string
  context?: Record<string, any>
}

export interface ValidationWarning {
  code: string
  message: string
  field?: string
  context?: Record<string, any>
}

// =============================================================================
// Hierarchy Validation Rules
// =============================================================================

/**
 * Validates the hierarchy rules for issue types and their relationships
 */
export function checkHierarchyRules(issueType: IssueType, parentType?: IssueType): boolean {
  // Rule 1: Epics cannot have parents
  if (issueType === 'epic' && parentType !== undefined) {
    return false
  }
  
  // Rule 2: Subtasks must have parents
  if (issueType === 'subtask' && parentType === undefined) {
    return false
  }
  
  // Rule 3: Valid parent-child relationships
  if (parentType !== undefined) {
    switch (issueType) {
      case 'story':
        return parentType === 'epic'
      case 'subtask':
        return parentType === 'story'
      case 'bug':
      case 'feature':
        return parentType === 'epic' || parentType === 'story'
      case 'epic':
        return false // Epics can't have parents
      default:
        return false
    }
  }
  
  // Issues without parents are valid except subtasks
  return issueType !== 'subtask'
}

/**
 * Validates a single issue's hierarchy constraints
 */
export function validateIssueHierarchy(
  issue: Issue, 
  existingIssues: Issue[] = []
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  
  // Find parent issue if it exists
  const parentIssue = issue.parent_id 
    ? existingIssues.find(i => i.id === issue.parent_id)
    : undefined
  
  // Rule 1: Epics cannot have parents
  if (issue.issue_type === 'epic' && issue.parent_id) {
    errors.push({
      code: 'EPIC_CANNOT_HAVE_PARENT',
      message: 'Epics cannot have parent issues. Epics are top-level containers.',
      field: 'parent_id',
      context: { issueType: issue.issue_type, parentId: issue.parent_id }
    })
  }
  
  // Rule 2: Subtasks must have parents
  if (issue.issue_type === 'subtask' && !issue.parent_id) {
    errors.push({
      code: 'SUBTASK_REQUIRES_PARENT',
      message: 'Subtasks must have a parent issue. Subtasks cannot exist independently.',
      field: 'parent_id',
      context: { issueType: issue.issue_type }
    })
  }
  
  // Rule 3: Self-reference check
  if (issue.parent_id === issue.id) {
    errors.push({
      code: 'SELF_REFERENCE_NOT_ALLOWED',
      message: 'Issues cannot be their own parent. Self-references are not allowed.',
      field: 'parent_id',
      context: { issueId: issue.id }
    })
  }
  
  // Rule 4: Parent-child type validation
  if (issue.parent_id && parentIssue) {
    const validParentChild = checkHierarchyRules(issue.issue_type, parentIssue.issue_type)
    if (!validParentChild) {
      errors.push({
        code: 'INVALID_PARENT_CHILD_RELATIONSHIP',
        message: `${issue.issue_type} issues cannot have ${parentIssue.issue_type} parents. Valid relationships: Epic→Story/Bug/Feature, Story→Subtask.`,
        field: 'parent_id',
        context: { 
          issueType: issue.issue_type, 
          parentType: parentIssue.issue_type,
          parentId: issue.parent_id
        }
      })
    }
  }
  
  // Rule 5: Check if parent exists in provided issue list
  if (issue.parent_id && !parentIssue) {
    warnings.push({
      code: 'PARENT_NOT_FOUND',
      message: 'Parent issue not found in provided issue list. This may be valid if parent exists in database.',
      field: 'parent_id',
      context: { parentId: issue.parent_id }
    })
  }
  
  // Rule 6: Hierarchy depth validation
  if (parentIssue) {
    const depth = calculateIssueDepth(issue, existingIssues)
    if (depth > 3) {
      errors.push({
        code: 'HIERARCHY_DEPTH_EXCEEDED',
        message: 'Maximum hierarchy depth of 3 levels exceeded. Current structure: Epic → Story → Subtask',
        field: 'parent_id',
        context: { depth, maxDepth: 3 }
      })
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Detects circular dependencies in a set of issues
 * Returns arrays of issue IDs that form circular dependencies
 */
export function detectCircularHierarchy(issues: Issue[]): string[][] {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  
  // Create adjacency map for efficient traversal
  const parentMap = new Map<string, string>()
  for (const issue of issues) {
    if (issue.parent_id) {
      parentMap.set(issue.id, issue.parent_id)
    }
  }
  
  function detectCycleFromNode(nodeId: string, path: string[]): void {
    if (recursionStack.has(nodeId)) {
      // Found a cycle - extract the cycle from the path
      const cycleStart = path.indexOf(nodeId)
      if (cycleStart !== -1) {
        const cycle = path.slice(cycleStart).concat([nodeId])
        cycles.push(cycle)
      }
      return
    }
    
    if (visited.has(nodeId)) {
      return
    }
    
    visited.add(nodeId)
    recursionStack.add(nodeId)
    path.push(nodeId)
    
    const parentId = parentMap.get(nodeId)
    if (parentId) {
      detectCycleFromNode(parentId, path)
    }
    
    recursionStack.delete(nodeId)
    path.pop()
  }
  
  // Check each issue for cycles
  for (const issue of issues) {
    if (!visited.has(issue.id)) {
      detectCycleFromNode(issue.id, [])
    }
  }
  
  return cycles
}

/**
 * Calculates the depth of an issue in the hierarchy
 */
export function calculateIssueDepth(issue: Issue, allIssues: Issue[]): number {
  const issueMap = new Map(allIssues.map(i => [i.id, i]))
  const visited = new Set<string>()
  let depth = 1
  let currentIssue = issue
  
  // Traverse up the hierarchy to calculate depth
  while (currentIssue.parent_id) {
    // Prevent infinite loops by tracking visited issues
    if (visited.has(currentIssue.id)) {
      break
    }
    visited.add(currentIssue.id)
    
    const parent = issueMap.get(currentIssue.parent_id)
    if (!parent) {
      // Parent not found in provided issues - assume it exists and add 1
      depth += 1
      break
    }
    
    depth += 1
    currentIssue = parent
    
    // Additional safety check for maximum depth
    if (depth > 10) {
      break
    }
  }
  
  return depth
}

/**
 * Validates a batch of issues for hierarchy compliance
 * Optimized for bulk operations and data imports
 */
export function validateIssueHierarchyBatch(issues: Issue[]): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  
  // First pass: individual issue validation
  for (const issue of issues) {
    const result = validateIssueHierarchy(issue, issues)
    errors.push(...result.errors)
    warnings.push(...result.warnings)
  }
  
  // Second pass: circular dependency detection
  const cycles = detectCircularHierarchy(issues)
  for (const cycle of cycles) {
    errors.push({
      code: 'CIRCULAR_HIERARCHY_DETECTED',
      message: `Circular hierarchy detected in issues: ${cycle.join(' → ')}`,
      context: { cycle }
    })
  }
  
  // Third pass: orphaned subtasks check
  const orphanedSubtasks = issues.filter(issue => 
    issue.issue_type === 'subtask' && 
    issue.parent_id &&
    !issues.some(parent => parent.id === issue.parent_id)
  )
  
  for (const orphan of orphanedSubtasks) {
    warnings.push({
      code: 'ORPHANED_SUBTASK',
      message: `Subtask references parent that is not in the batch: ${orphan.parent_id}`,
      field: 'parent_id',
      context: { 
        issueId: orphan.id, 
        parentId: orphan.parent_id 
      }
    })
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Generates a hierarchy tree structure from a flat list of issues
 * Useful for visualization and debugging
 */
export interface HierarchyNode {
  issue: Issue
  children: HierarchyNode[]
  depth: number
  path: string[]
}

export function buildHierarchyTree(issues: Issue[]): HierarchyNode[] {
  const rootNodes: HierarchyNode[] = []
  const nodeMap = new Map<string, HierarchyNode>()
  
  // Create nodes for all issues
  for (const issue of issues) {
    const node: HierarchyNode = {
      issue,
      children: [],
      depth: 0,
      path: []
    }
    nodeMap.set(issue.id, node)
  }
  
  // Build the tree structure
  for (const issue of issues) {
    const node = nodeMap.get(issue.id)!
    
    if (issue.parent_id) {
      const parentNode = nodeMap.get(issue.parent_id)
      if (parentNode) {
        parentNode.children.push(node)
        node.depth = parentNode.depth + 1
        node.path = [...parentNode.path, parentNode.issue.id]
      } else {
        // Parent not in this batch - treat as root
        rootNodes.push(node)
      }
    } else {
      rootNodes.push(node)
    }
  }
  
  return rootNodes
}

/**
 * Validates that parent-child relationships are consistent
 * with Linear's estimation rules (stories with subtasks shouldn't have estimates)
 */
export function validateEstimationRules(issues: Issue[]): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  
  for (const issue of issues) {
    // Check if this issue has children
    const hasChildren = issues.some(child => child.parent_id === issue.id)
    
    // Stories/Epics with children shouldn't have estimates
    if (hasChildren && issue.estimate && ['epic', 'story'].includes(issue.issue_type)) {
      warnings.push({
        code: 'PARENT_WITH_ESTIMATE',
        message: `${issue.issue_type} issues with children should not have estimates. The estimate should be the sum of child estimates.`,
        field: 'estimate',
        context: { 
          issueId: issue.id,
          issueType: issue.issue_type,
          estimate: issue.estimate
        }
      })
    }
    
    // Subtasks should always have estimates
    if (issue.issue_type === 'subtask' && !issue.estimate) {
      warnings.push({
        code: 'SUBTASK_WITHOUT_ESTIMATE',
        message: 'Subtasks should have estimate points for proper sprint planning.',
        field: 'estimate',
        context: { issueId: issue.id }
      })
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// =============================================================================
// Error Code Constants
// =============================================================================

export const HIERARCHY_ERROR_CODES = {
  EPIC_CANNOT_HAVE_PARENT: 'EPIC_CANNOT_HAVE_PARENT',
  SUBTASK_REQUIRES_PARENT: 'SUBTASK_REQUIRES_PARENT',
  SELF_REFERENCE_NOT_ALLOWED: 'SELF_REFERENCE_NOT_ALLOWED',
  INVALID_PARENT_CHILD_RELATIONSHIP: 'INVALID_PARENT_CHILD_RELATIONSHIP',
  HIERARCHY_DEPTH_EXCEEDED: 'HIERARCHY_DEPTH_EXCEEDED',
  CIRCULAR_HIERARCHY_DETECTED: 'CIRCULAR_HIERARCHY_DETECTED',
  PARENT_NOT_FOUND: 'PARENT_NOT_FOUND',
  ORPHANED_SUBTASK: 'ORPHANED_SUBTASK',
  PARENT_WITH_ESTIMATE: 'PARENT_WITH_ESTIMATE',
  SUBTASK_WITHOUT_ESTIMATE: 'SUBTASK_WITHOUT_ESTIMATE'
} as const

export type HierarchyErrorCode = typeof HIERARCHY_ERROR_CODES[keyof typeof HIERARCHY_ERROR_CODES]