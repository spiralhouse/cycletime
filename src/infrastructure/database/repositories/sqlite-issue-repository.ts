import { Issue } from '../../../domain/entities/issue.js';
import { RepositoryError } from '../../../domain/errors/repository-errors.js';


import type { IssueSnapshot } from '../../../domain/entities/issue.js';
import type { TimeProvider } from '../../../domain/interfaces/time-provider.js';
import type { IssueRepository } from '../../../domain/repositories/issue-repository.js';
import type { IssueId } from '../../../domain/value-objects/issue-id.js';
import type { ProjectId } from '../../../domain/value-objects/project-id.js';
import type Database from 'better-sqlite3';

export class SqliteIssueRepository implements IssueRepository {
  private findByIdStmt?: Database.Statement;
  private findByProjectIdStmt?: Database.Statement;
  private findChildrenStmt?: Database.Statement;
  private findDependenciesStmt?: Database.Statement;
  private findProjectIdStmt?: Database.Statement;
  private findAllChildrenForIssuesStmt?: Database.Statement;
  private findAllDependenciesForIssuesStmt?: Database.Statement;
  private insertIssueStmt?: Database.Statement;
  private updateIssueStmt?: Database.Statement;
  private deleteChildrenStmt?: Database.Statement;
  private insertChildStmt?: Database.Statement;
  private deleteDependenciesStmt?: Database.Statement;
  private insertDependencyStmt?: Database.Statement;
  private insertProjectIssueStmt?: Database.Statement;
  private existsStmt?: Database.Statement;

  constructor(
    private readonly db: Database.Database,
    private readonly timeProvider?: TimeProvider
  ) {
    this.initializeStatements();
  }

  private initializeStatements(): void {
    if (!this.db.open) {
      return;
    }

    try {
      this.findByIdStmt = this.db.prepare(`
        SELECT id, title, description, type, status, parent_id, estimate, created_at, updated_at
        FROM issues
        WHERE id = ?
      `);

      this.findByProjectIdStmt = this.db.prepare(`
        SELECT i.id, i.title, i.description, i.type, i.status, i.parent_id, i.estimate, i.created_at, i.updated_at
        FROM issues i
        JOIN project_issues pi ON i.id = pi.issue_id
        WHERE pi.project_id = ?
        ORDER BY i.created_at DESC
      `);

      this.findChildrenStmt = this.db.prepare(`
        SELECT id FROM issues
        WHERE parent_id = ?
        ORDER BY created_at ASC
      `);

      this.findDependenciesStmt = this.db.prepare(`
        SELECT dependency_id FROM issue_dependencies
        WHERE dependent_id = ?
        ORDER BY created_at ASC
      `);

      this.findAllChildrenForIssuesStmt = this.db.prepare(`
        SELECT parent_id, id FROM issues
        WHERE parent_id IN (SELECT id FROM issues i JOIN project_issues pi ON i.id = pi.issue_id WHERE pi.project_id = ?)
        ORDER BY created_at ASC
      `);

      this.findAllDependenciesForIssuesStmt = this.db.prepare(`
        SELECT dependent_id, dependency_id FROM issue_dependencies
        WHERE dependent_id IN (SELECT id FROM issues i JOIN project_issues pi ON i.id = pi.issue_id WHERE pi.project_id = ?)
        ORDER BY created_at ASC
      `);

      this.insertIssueStmt = this.db.prepare(`
        INSERT INTO issues (id, title, description, type, status, parent_id, estimate, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      this.updateIssueStmt = this.db.prepare(`
        UPDATE issues
        SET title = ?, description = ?, type = ?, status = ?, parent_id = ?, estimate = ?, updated_at = ?
        WHERE id = ?
      `);

      this.deleteChildrenStmt = this.db.prepare(`
        UPDATE issues SET parent_id = NULL WHERE parent_id = ?
      `);

      this.insertChildStmt = this.db.prepare(`
        UPDATE issues SET parent_id = ? WHERE id = ?
      `);

      this.deleteDependenciesStmt = this.db.prepare(`
        DELETE FROM issue_dependencies WHERE dependent_id = ?
      `);

      this.insertDependencyStmt = this.db.prepare(`
        INSERT OR IGNORE INTO issue_dependencies (dependent_id, dependency_id)
        VALUES (?, ?)
      `);

      this.insertProjectIssueStmt = this.db.prepare(`
        INSERT OR IGNORE INTO project_issues (project_id, issue_id, added_at)
        VALUES (?, ?, ?)
      `);

      this.findProjectIdStmt = this.db.prepare(`
        SELECT project_id FROM project_issues WHERE issue_id = ? LIMIT 1
      `);

      this.existsStmt = this.db.prepare(`
        SELECT 1 FROM issues WHERE id = ? LIMIT 1
      `);
    } catch {
      // Statements will be re-initialized on next access
    }
  }

  private ensureStatementsReady(): void {
    if (!this.findByIdStmt || !this.db.open) {
      this.initializeStatements();
    }
  }

  async findById(id: IssueId): Promise<Issue | null> {
    try {
      this.ensureStatementsReady();
      if (!this.findByIdStmt || !this.findChildrenStmt || !this.findDependenciesStmt || !this.findProjectIdStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const issueRow = this.findByIdStmt.get(id.value) as any;

      if (!issueRow) {
        return null;
      }

      // Get children IDs
      const childRows = this.findChildrenStmt.all(id.value) as any[];
      const childIds = childRows.map(row => row.id);

      // Get dependency IDs
      const depRows = this.findDependenciesStmt.all(id.value) as any[];
      const dependencies = depRows.map(row => row.dependency_id);

      // Get project ID if exists
      const projectRow = this.findProjectIdStmt.get(id.value) as any;
      const projectId = projectRow?.project_id;

      return this.rowToIssue(issueRow, childIds, dependencies, projectId);
    } catch (error) {
      throw new RepositoryError('find issue by id', error as Error);
    }
  }

  async findByProjectId(projectId: ProjectId): Promise<Issue[]> {
    try {
      this.ensureStatementsReady();
      if (!this.findByProjectIdStmt || !this.findAllChildrenForIssuesStmt || !this.findAllDependenciesForIssuesStmt) {
        throw new Error('Unable to prepare database statements');
      }

      // Get all issues for the project (1 query)
      const issueRows = this.findByProjectIdStmt.all(projectId.value) as any[];
      
      if (issueRows.length === 0) {
        return [];
      }

      // Get all children for all issues in one query (1 query)
      const allChildRows = this.findAllChildrenForIssuesStmt.all(projectId.value) as any[];
      const childrenByParent = new Map<string, string[]>();

      for (const row of allChildRows) {
        const parentId = row.parent_id;

        if (!childrenByParent.has(parentId)) {
          childrenByParent.set(parentId, []);
        }
        childrenByParent.get(parentId)!.push(row.id);
      }

      // Get all dependencies for all issues in one query (1 query)
      const allDepRows = this.findAllDependenciesForIssuesStmt.all(projectId.value) as any[];
      const dependenciesByIssue = new Map<string, string[]>();

      for (const row of allDepRows) {
        const dependentId = row.dependent_id;

        if (!dependenciesByIssue.has(dependentId)) {
          dependenciesByIssue.set(dependentId, []);
        }
        dependenciesByIssue.get(dependentId)!.push(row.dependency_id);
      }

      // Build issues with pre-fetched data
      const issues: Issue[] = [];

      for (const row of issueRows) {
        const childIds = childrenByParent.get(row.id) || [];
        const dependencies = dependenciesByIssue.get(row.id) || [];

        issues.push(this.rowToIssue(row, childIds, dependencies, projectId.value));
      }

      return issues;
    } catch (error) {
      throw new RepositoryError('find issues by project id', error as Error);
    }
  }

  async save(issue: Issue): Promise<void> {
    try {
      this.ensureStatementsReady();
      if (!this.updateIssueStmt || !this.insertIssueStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const exists = await this.exists(issue.id);
      const snapshot = issue.toSnapshot();

      // Use transaction for consistency
      const saveIssue = this.db.transaction(() => {
        if (exists) {
          this.updateIssueStmt!.run(
            snapshot.title,
            snapshot.description,
            snapshot.type,
            snapshot.status,
            snapshot.parentId || null,
            snapshot.estimate || null,
            Math.floor(snapshot.updatedAt.getTime() / 1000),
            snapshot.id
          );
        } else {
          this.insertIssueStmt!.run(
            snapshot.id,
            snapshot.title,
            snapshot.description,
            snapshot.type,
            snapshot.status,
            snapshot.parentId || null,
            snapshot.estimate || null,
            Math.floor(snapshot.createdAt.getTime() / 1000),
            Math.floor(snapshot.updatedAt.getTime() / 1000)
          );
        }

        // Update children relationships
        // First, clear existing parent relationships for this issue
        this.deleteChildrenStmt!.run(snapshot.id);
        
        // Then set parent for all children
        for (const childId of snapshot.childIds) {
          this.insertChildStmt!.run(snapshot.id, childId);
        }

        // Update dependency relationships
        this.deleteDependenciesStmt!.run(snapshot.id);
        for (const depId of snapshot.dependencies) {
          this.insertDependencyStmt!.run(snapshot.id, depId);
        }
      });

      saveIssue();
    } catch (error) {
      throw new RepositoryError('save issue', error as Error);
    }
  }

  async exists(id: IssueId): Promise<boolean> {
    try {
      this.ensureStatementsReady();
      if (!this.existsStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const result = this.existsStmt.get(id.value);

      return result !== undefined;
    } catch (error) {
      throw new RepositoryError('check issue existence', error as Error);
    }
  }

  async saveToProject(issue: Issue, projectId: ProjectId): Promise<void> {
    try {
      this.ensureStatementsReady();
      if (!this.updateIssueStmt || !this.insertIssueStmt || !this.insertProjectIssueStmt || 
          !this.deleteChildrenStmt || !this.insertChildStmt || 
          !this.deleteDependenciesStmt || !this.insertDependencyStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const exists = await this.exists(issue.id);
      const snapshot = issue.toSnapshot();

      // Use transaction for consistency
      const saveIssueToProject = this.db.transaction(() => {
        if (exists) {
          this.updateIssueStmt!.run(
            snapshot.title,
            snapshot.description,
            snapshot.type,
            snapshot.status,
            snapshot.parentId || null,
            snapshot.estimate || null,
            Math.floor(snapshot.updatedAt.getTime() / 1000),
            snapshot.id
          );
        } else {
          this.insertIssueStmt!.run(
            snapshot.id,
            snapshot.title,
            snapshot.description,
            snapshot.type,
            snapshot.status,
            snapshot.parentId || null,
            snapshot.estimate || null,
            Math.floor(snapshot.createdAt.getTime() / 1000),
            Math.floor(snapshot.updatedAt.getTime() / 1000)
          );
        }

        // Update children relationships
        this.deleteChildrenStmt!.run(snapshot.id);
        for (const childId of snapshot.childIds) {
          this.insertChildStmt!.run(snapshot.id, childId);
        }

        // Update dependency relationships
        this.deleteDependenciesStmt!.run(snapshot.id);
        for (const depId of snapshot.dependencies) {
          this.insertDependencyStmt!.run(snapshot.id, depId);
        }

        // Add project association
        this.insertProjectIssueStmt!.run(
          projectId.value,
          snapshot.id,
          Math.floor(Date.now() / 1000)
        );
      });

      saveIssueToProject();
    } catch (error: any) {
      // Provide more meaningful error messages for common constraints
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || 
          (error.message?.includes('FOREIGN KEY constraint failed'))) {
        throw new RepositoryError(
          `Cannot save issue to project: project does not exist (${projectId.value})`, 
          error as Error
        );
      }
      throw new RepositoryError('save issue to project', error as Error);
    }
  }

  private rowToIssue(row: any, childIds: string[], dependencies: string[], projectId?: string): Issue {
    const snapshot: IssueSnapshot = {
      id: row.id,
      title: row.title,
      description: row.description || '',
      type: row.type,
      status: row.status,
      parentId: row.parent_id || undefined,
      childIds,
      dependencies,
      estimate: row.estimate || undefined,
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
    };
    
    // Add projectId only if it's defined
    if (projectId) {
      snapshot.projectId = projectId;
    }

    return Issue.fromSnapshot(snapshot, this.timeProvider);
  }
}