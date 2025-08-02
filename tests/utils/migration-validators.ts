/**
 * Migration Validation Helpers
 *
 * Comprehensive utilities for validating data migration integrity,
 * rollback capabilities, and cross-provider compatibility.
 */

import { performance } from 'node:perf_hooks';

import type { Project } from '../../src/database/models/schema-types.js';
import type { IssueProvider, EnhancedIssue, Dependency } from '../../src/providers/types.js';

// =============================================================================
// Migration Validation Types
// =============================================================================

export interface MigrationValidationConfig {
  validateHierarchy: boolean;
  validateDependencies: boolean;
  validateStates: boolean;
  validateLabels: boolean;
  validateMetadata: boolean;
  strictMode: boolean; // Fails on any discrepancy
  tolerateMinorDifferences: boolean; // Allows minor timestamp differences
}

export interface MigrationValidationResult {
  success: boolean;
  dataIntegrity: {
    projectsMatch: boolean;
    issuesMatch: boolean;
    dependenciesMatch: boolean;
    hierarchyIntact: boolean;
  };
  performance: {
    exportDuration: number;
    importDuration: number;
    validationDuration: number;
    totalDuration: number;
  };
  statistics: {
    projectsCompared: number;
    issuesCompared: number;
    dependenciesCompared: number;
    fieldsValidated: number;
  };
  discrepancies: {
    type: 'project' | 'issue' | 'dependency' | 'hierarchy';
    field: string;
    sourceValue: any;
    targetValue: any;
    severity: 'critical' | 'warning' | 'info';
    description: string;
  }[];
  errors: string[];
  warnings: string[];
}

export interface RollbackValidationResult {
  rollbackSupported: boolean;
  preRollbackState: {
    projects: Project[];
    issues: EnhancedIssue[];
    dependencies: Dependency[];
  };
  postRollbackState: {
    projects: Project[];
    issues: EnhancedIssue[];
    dependencies: Dependency[];
  };
  rollbackSuccess: boolean;
  dataRestored: boolean;
  rollbackDuration: number;
  errors: string[];
}

// =============================================================================
// Core Migration Validator
// =============================================================================

export class MigrationValidator {
  private config: MigrationValidationConfig;

  constructor(config: Partial<MigrationValidationConfig> = {}) {
    this.config = {
      validateHierarchy: true,
      validateDependencies: true,
      validateStates: true,
      validateLabels: true,
      validateMetadata: true,
      strictMode: false,
      tolerateMinorDifferences: true,
      ...config,
    };
  }

  async validateMigration(
    sourceProvider: IssueProvider,
    targetProvider: IssueProvider,
    projectId: string
  ): Promise<MigrationValidationResult> {
    const validationStart = performance.now();
    const result: MigrationValidationResult = {
      success: false,
      dataIntegrity: {
        projectsMatch: false,
        issuesMatch: false,
        dependenciesMatch: false,
        hierarchyIntact: false,
      },
      performance: {
        exportDuration: 0,
        importDuration: 0,
        validationDuration: 0,
        totalDuration: 0,
      },
      statistics: {
        projectsCompared: 0,
        issuesCompared: 0,
        dependenciesCompared: 0,
        fieldsValidated: 0,
      },
      discrepancies: [],
      errors: [],
      warnings: [],
    };

    try {
      // Get source data
      const sourceProject = await sourceProvider.getProject(projectId);
      const sourceIssues = await sourceProvider.listIssues({ project_id: projectId });
      const sourceDependencies = await sourceProvider.getDependencyGraph(projectId);

      // Get target data
      const targetProject = await targetProvider.getProject(projectId);
      const targetIssues = await targetProvider.listIssues({ project_id: projectId });
      const targetDependencies = await targetProvider.getDependencyGraph(projectId);

      // Validate projects
      result.dataIntegrity.projectsMatch = this.validateProjects(
        sourceProject,
        targetProject,
        result
      );

      // Validate issues
      result.dataIntegrity.issuesMatch = this.validateIssues(sourceIssues, targetIssues, result);

      // Validate dependencies
      const sourceDeps = sourceDependencies.edges.map(edge => ({
        id: `${edge.from}-${edge.to}`,
        blocker_id: edge.from,
        blocked_id: edge.to,
        dependency_type: edge.type,
        created_at: new Date(),
      }));
      const targetDeps = targetDependencies.edges.map(edge => ({
        id: `${edge.from}-${edge.to}`,
        blocker_id: edge.from,
        blocked_id: edge.to,
        dependency_type: edge.type,
        created_at: new Date(),
      }));

      result.dataIntegrity.dependenciesMatch = this.validateDependencies(
        sourceDeps,
        targetDeps,
        result
      );

      // Validate hierarchy
      if (this.config.validateHierarchy) {
        result.dataIntegrity.hierarchyIntact = this.validateHierarchy(
          sourceIssues,
          targetIssues,
          result
        );
      }

      // Update statistics
      result.statistics.projectsCompared = 1;
      result.statistics.issuesCompared = Math.max(sourceIssues.length, targetIssues.length);
      result.statistics.dependenciesCompared = Math.max(sourceDeps.length, targetDeps.length);

      // Determine overall success
      const criticalDiscrepancies = result.discrepancies.filter(d => d.severity === 'critical');

      result.success =
        criticalDiscrepancies.length === 0 &&
        result.dataIntegrity.projectsMatch &&
        result.dataIntegrity.issuesMatch &&
        result.dataIntegrity.dependenciesMatch &&
        (this.config.validateHierarchy ? result.dataIntegrity.hierarchyIntact : true);
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown validation error');
    }

    result.performance.validationDuration = performance.now() - validationStart;
    result.performance.totalDuration = result.performance.validationDuration;

    return result;
  }

  private validateProjects(
    source: Project,
    target: Project,
    result: MigrationValidationResult
  ): boolean {
    let projectsMatch = true;
    const fieldsToValidate = ['id', 'name', 'description'];

    for (const field of fieldsToValidate) {
      const sourceValue = (source as any)[field];
      const targetValue = (target as any)[field];

      if (sourceValue !== targetValue) {
        projectsMatch = false;
        result.discrepancies.push({
          type: 'project',
          field,
          sourceValue,
          targetValue,
          severity: field === 'id' ? 'critical' : 'warning',
          description: `Project ${field} mismatch: "${sourceValue}" vs "${targetValue}"`,
        });
      }
      result.statistics.fieldsValidated++;
    }

    return projectsMatch;
  }

  private validateIssues(
    sourceIssues: EnhancedIssue[],
    targetIssues: EnhancedIssue[],
    result: MigrationValidationResult
  ): boolean {
    let issuesMatch = true;

    // Check issue counts
    if (sourceIssues.length !== targetIssues.length) {
      issuesMatch = false;
      result.discrepancies.push({
        type: 'issue',
        field: 'count',
        sourceValue: sourceIssues.length,
        targetValue: targetIssues.length,
        severity: 'critical',
        description: `Issue count mismatch: ${sourceIssues.length} source vs ${targetIssues.length} target`,
      });
    }

    // Create lookup maps for efficient comparison
    const sourceMap = new Map(sourceIssues.map(issue => [issue.id, issue]));
    const targetMap = new Map(targetIssues.map(issue => [issue.id, issue]));

    // Validate each source issue exists in target
    for (const sourceIssue of sourceIssues) {
      const targetIssue = targetMap.get(sourceIssue.id);

      if (!targetIssue) {
        issuesMatch = false;
        result.discrepancies.push({
          type: 'issue',
          field: 'existence',
          sourceValue: sourceIssue.id,
          targetValue: null,
          severity: 'critical',
          description: `Issue ${sourceIssue.id} exists in source but not in target`,
        });
        continue;
      }

      // Validate issue fields
      if (!this.validateIssueFields(sourceIssue, targetIssue, result)) {
        issuesMatch = false;
      }
    }

    // Check for extra issues in target
    for (const targetIssue of targetIssues) {
      if (!sourceMap.has(targetIssue.id)) {
        issuesMatch = false;
        result.discrepancies.push({
          type: 'issue',
          field: 'existence',
          sourceValue: null,
          targetValue: targetIssue.id,
          severity: 'critical',
          description: `Issue ${targetIssue.id} exists in target but not in source`,
        });
      }
    }

    return issuesMatch;
  }

  private validateIssueFields(
    source: EnhancedIssue,
    target: EnhancedIssue,
    result: MigrationValidationResult
  ): boolean {
    let fieldsMatch = true;
    const criticalFields = ['id', 'project_id', 'title', 'issue_type', 'parent_id'];
    const importantFields = ['description', 'priority', 'estimate', 'state_id', 'assignee_id'];

    // Validate critical fields
    for (const field of criticalFields) {
      const sourceValue = (source as any)[field];
      const targetValue = (target as any)[field];

      if (sourceValue !== targetValue) {
        fieldsMatch = false;
        result.discrepancies.push({
          type: 'issue',
          field,
          sourceValue,
          targetValue,
          severity: 'critical',
          description: `Issue ${source.id} ${field} mismatch: "${sourceValue}" vs "${targetValue}"`,
        });
      }
      result.statistics.fieldsValidated++;
    }

    // Validate important fields
    for (const field of importantFields) {
      const sourceValue = (source as any)[field];
      const targetValue = (target as any)[field];

      if (sourceValue !== targetValue) {
        if (!this.config.strictMode) {
          result.warnings.push(
            `Issue ${source.id} ${field} differs: "${sourceValue}" vs "${targetValue}"`
          );
        } else {
          fieldsMatch = false;
          result.discrepancies.push({
            type: 'issue',
            field,
            sourceValue,
            targetValue,
            severity: 'warning',
            description: `Issue ${source.id} ${field} mismatch: "${sourceValue}" vs "${targetValue}"`,
          });
        }
      }
      result.statistics.fieldsValidated++;
    }

    // Validate labels if configured
    if (this.config.validateLabels) {
      if (!this.arraysEqual(source.labels || [], target.labels || [])) {
        fieldsMatch = false;
        result.discrepancies.push({
          type: 'issue',
          field: 'labels',
          sourceValue: source.labels,
          targetValue: target.labels,
          severity: 'warning',
          description: `Issue ${source.id} labels mismatch`,
        });
      }
      result.statistics.fieldsValidated++;
    }

    return fieldsMatch;
  }

  private validateDependencies(
    sourceDeps: Dependency[],
    targetDeps: Dependency[],
    result: MigrationValidationResult
  ): boolean {
    let dependenciesMatch = true;

    // Check dependency counts
    if (sourceDeps.length !== targetDeps.length) {
      dependenciesMatch = false;
      result.discrepancies.push({
        type: 'dependency',
        field: 'count',
        sourceValue: sourceDeps.length,
        targetValue: targetDeps.length,
        severity: 'critical',
        description: `Dependency count mismatch: ${sourceDeps.length} source vs ${targetDeps.length} target`,
      });
    }

    // Create lookup for efficient comparison
    const sourceDepsSet = new Set(sourceDeps.map(d => `${d.blocker_id}:${d.blocked_id}`));
    const targetDepsSet = new Set(targetDeps.map(d => `${d.blocker_id}:${d.blocked_id}`));

    // Check for missing dependencies in target
    for (const dep of sourceDeps) {
      const depKey = `${dep.blocker_id}:${dep.blocked_id}`;

      if (!targetDepsSet.has(depKey)) {
        dependenciesMatch = false;
        result.discrepancies.push({
          type: 'dependency',
          field: 'existence',
          sourceValue: depKey,
          targetValue: null,
          severity: 'critical',
          description: `Dependency ${depKey} exists in source but not in target`,
        });
      }
    }

    // Check for extra dependencies in target
    for (const dep of targetDeps) {
      const depKey = `${dep.blocker_id}:${dep.blocked_id}`;

      if (!sourceDepsSet.has(depKey)) {
        dependenciesMatch = false;
        result.discrepancies.push({
          type: 'dependency',
          field: 'existence',
          sourceValue: null,
          targetValue: depKey,
          severity: 'critical',
          description: `Dependency ${depKey} exists in target but not in source`,
        });
      }
    }

    return dependenciesMatch;
  }

  private validateHierarchy(
    sourceIssues: EnhancedIssue[],
    targetIssues: EnhancedIssue[],
    result: MigrationValidationResult
  ): boolean {
    const sourceHierarchy = this.buildHierarchyMap(sourceIssues);
    const targetHierarchy = this.buildHierarchyMap(targetIssues);

    let hierarchyIntact = true;

    // Validate each hierarchy relationship
    for (const [issueId, parentId] of sourceHierarchy.entries()) {
      const targetParentId = targetHierarchy.get(issueId);

      if (parentId !== targetParentId) {
        hierarchyIntact = false;
        result.discrepancies.push({
          type: 'hierarchy',
          field: 'parentId',
          sourceValue: parentId,
          targetValue: targetParentId,
          severity: 'critical',
          description: `Hierarchy broken for issue ${issueId}: parent changed from ${parentId} to ${targetParentId}`,
        });
      }
    }

    // Check for orphaned issues in target
    for (const [issueId, parentId] of targetHierarchy.entries()) {
      if (!sourceHierarchy.has(issueId)) {
        hierarchyIntact = false;
        result.discrepancies.push({
          type: 'hierarchy',
          field: 'existence',
          sourceValue: null,
          targetValue: `${issueId}:${parentId}`,
          severity: 'critical',
          description: `Issue ${issueId} exists in target hierarchy but not in source`,
        });
      }
    }

    return hierarchyIntact;
  }

  private buildHierarchyMap(issues: EnhancedIssue[]): Map<string, string | undefined> {
    const hierarchy = new Map<string, string | undefined>();

    for (const issue of issues) {
      hierarchy.set(issue.id, issue.parent_id);
    }

    return hierarchy;
  }

  private arraysEqual<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) return false;

    const sortedA = [...a].sort();
    const sortedB = [...b].sort();

    return sortedA.every((val, index) => val === sortedB[index]);
  }
}

// =============================================================================
// Rollback Validator
// =============================================================================

export class RollbackValidator {
  async validateRollback(
    provider: IssueProvider,
    projectId: string,
    corruptedData?: any
  ): Promise<RollbackValidationResult> {
    const result: RollbackValidationResult = {
      rollbackSupported: false,
      preRollbackState: {
        projects: [],
        issues: [],
        dependencies: [],
      },
      postRollbackState: {
        projects: [],
        issues: [],
        dependencies: [],
      },
      rollbackSuccess: false,
      dataRestored: false,
      rollbackDuration: 0,
      errors: [],
    };

    try {
      // Capture initial state
      result.preRollbackState.projects = [await provider.getProject(projectId)];
      result.preRollbackState.issues = await provider.listIssues({ project_id: projectId });
      const dependencyGraph = await provider.getDependencyGraph(projectId);

      result.preRollbackState.dependencies = dependencyGraph.edges.map(edge => ({
        id: `${edge.from}-${edge.to}`,
        blocker_id: edge.from,
        blocked_id: edge.to,
        dependency_type: edge.type,
        created_at: new Date(),
      }));

      // Test rollback capability
      result.rollbackSupported = await this.testRollbackCapability(provider);

      if (result.rollbackSupported) {
        // Perform rollback test
        const rollbackStart = performance.now();

        // Simulate data corruption if provided
        if (corruptedData) {
          await this.simulateDataCorruption(provider, projectId, corruptedData);
        }

        // Attempt rollback
        const rollbackSuccess = await this.performRollback(
          provider,
          projectId,
          result.preRollbackState
        );

        result.rollbackSuccess = rollbackSuccess;

        result.rollbackDuration = performance.now() - rollbackStart;

        // Capture post-rollback state
        try {
          result.postRollbackState.projects = [await provider.getProject(projectId)];
          result.postRollbackState.issues = await provider.listIssues({ project_id: projectId });
          const postDependencyGraph = await provider.getDependencyGraph(projectId);

          result.postRollbackState.dependencies = postDependencyGraph.edges.map(edge => ({
            id: `${edge.from}-${edge.to}`,
            blocker_id: edge.from,
            blocked_id: edge.to,
            dependency_type: edge.type,
            created_at: new Date(),
          }));

          // Validate data restoration
          result.dataRestored = this.validateDataRestoration(
            result.preRollbackState,
            result.postRollbackState
          );
        } catch (error) {
          result.errors.push(`Failed to capture post-rollback state: ${error}`);
        }
      }
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown rollback validation error'
      );
    }

    return result;
  }

  private async testRollbackCapability(provider: IssueProvider): Promise<boolean> {
    // Check if provider supports rollback operations
    // This would typically check for transaction support, backup capabilities, etc.

    try {
      // Test if provider has rollback-related methods
      const providerAny = provider as any;

      return (
        typeof providerAny.beginTransaction === 'function' ||
        typeof providerAny.rollback === 'function' ||
        typeof providerAny.backup === 'function'
      );
    } catch {
      return false;
    }
  }

  private async simulateDataCorruption(
    provider: IssueProvider,
    projectId: string,
    corruptedData: any
  ): Promise<void> {
    // Simulate data corruption for rollback testing
    // This is a placeholder - actual implementation would depend on provider
    try {
      if (corruptedData.corruptIssue) {
        // Attempt to corrupt an issue
        const issues = await provider.listIssues({ project_id: projectId });

        if (issues.length > 0 && issues[0]) {
          await provider.updateIssue(issues[0].id, {
            title: '', // Invalid empty title to trigger corruption
          });
        }
      }
    } catch {
      // Expected to fail - corruption simulation
    }
  }

  private async performRollback(
    provider: IssueProvider,
    projectId: string,
    originalState: RollbackValidationResult['preRollbackState']
  ): Promise<boolean> {
    try {
      // Attempt to restore original state
      // This is a simplified rollback - real implementation would use provider-specific rollback mechanisms

      const providerAny = provider as any;

      if (typeof providerAny.rollback === 'function') {
        await providerAny.rollback();

        return true;
      }

      if (typeof providerAny.restore === 'function') {
        await providerAny.restore(originalState);

        return true;
      }

      // Fallback: manual restoration
      return await this.manualRestore(provider, projectId, originalState);
    } catch {
      return false;
    }
  }

  private async manualRestore(
    provider: IssueProvider,
    projectId: string,
    originalState: RollbackValidationResult['preRollbackState']
  ): Promise<boolean> {
    try {
      // Manual restoration by recreating original state
      // This is a simplified implementation

      // Delete all current issues
      const currentIssues = await provider.listIssues({ project_id: projectId });

      for (const issue of currentIssues) {
        try {
          await (provider as any).deleteIssue(issue.id);
        } catch {
          // May not support deletion
        }
      }

      // Recreate original issues
      for (const issue of originalState.issues) {
        try {
          await provider.createIssue({
            id: issue.id,
            project_id: issue.project_id,
            title: issue.title,
            issue_type: issue.issue_type,
            state_id: issue.state_id,
            priority: issue.priority,
            ...(issue.description && { description: issue.description }),
            ...(issue.estimate && { estimate: issue.estimate }),
            ...(issue.parent_id && { parent_id: issue.parent_id }),
            ...(issue.assignee_id && { assignee_id: issue.assignee_id }),
            labels: issue.labels?.map(label => label.name) || [],
          });
        } catch {
          // May fail due to dependencies
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private validateDataRestoration(
    preState: RollbackValidationResult['preRollbackState'],
    postState: RollbackValidationResult['postRollbackState']
  ): boolean {
    // Check if data was properly restored

    // Project count should match
    if (preState.projects.length !== postState.projects.length) {
      return false;
    }

    // Issue count should match
    if (preState.issues.length !== postState.issues.length) {
      return false;
    }

    // Dependency count should match
    if (preState.dependencies.length !== postState.dependencies.length) {
      return false;
    }

    // Quick field-level validation
    for (let i = 0; i < preState.issues.length; i++) {
      const preIssue = preState.issues[i];

      if (!preIssue) continue;

      const postIssue = postState.issues.find(issue => issue.id === preIssue.id);

      if (!postIssue) {
        return false;
      }

      if (
        preIssue.title !== postIssue.title ||
        preIssue.issue_type !== postIssue.issue_type ||
        preIssue.parent_id !== postIssue.parent_id
      ) {
        return false;
      }
    }

    return true;
  }
}

// =============================================================================
// Exported Utilities
// =============================================================================

export const createMigrationValidator = (config?: Partial<MigrationValidationConfig>) =>
  new MigrationValidator(config);

export const createRollbackValidator = () => new RollbackValidator();

export const defaultMigrationConfig: MigrationValidationConfig = {
  validateHierarchy: true,
  validateDependencies: true,
  validateStates: true,
  validateLabels: true,
  validateMetadata: true,
  strictMode: false,
  tolerateMinorDifferences: true,
};
