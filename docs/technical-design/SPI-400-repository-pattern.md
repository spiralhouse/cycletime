# SPI-400: Repository Pattern Implementation - Technical Design

## Overview

This document outlines the technical design for implementing SQLite repository implementations for domain entities (Project, Issue, Workflow), following the repository pattern established in SPI-346 (SessionRepository). The implementation provides a clean abstraction between domain and infrastructure layers while maintaining simplicity and testability.

## Design Principles

### 1. Follow Established Patterns

- Mirror the structure and patterns from `SqliteSessionRepository`
- Use prepared statements for performance and security
- Implement proper error handling with domain-specific exceptions
- Ensure statements are properly initialized and re-initialized if needed

### 2. Test-Driven Development Approach

- Write integration tests first using in-memory SQLite databases
- Test transaction rollback scenarios
- Verify entity reconstitution accuracy
- Mock repositories for unit testing application layer

### 3. Maintain Simplicity

- Direct SQL queries (no ORM complexity)
- Simple mapping between domain and database
- Efficient queries with proper indexing
- Reuse existing infrastructure components

## Database Schema Design

### Migration 006: Domain Entity Tables

```sql
-- src/database/migrations.ts (append to existing migrations array)
{
  version: '006',
  description: 'Add domain entity tables',
  sql: `
    -- Projects table
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Issues table with hierarchy support
    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('Epic', 'Story', 'Subtask')),
      status TEXT NOT NULL,
      parent_id TEXT,
      estimate INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES issues(id) ON DELETE CASCADE
    );

    -- Project-Issue relationship table
    CREATE TABLE IF NOT EXISTS project_issues (
      project_id TEXT NOT NULL,
      issue_id TEXT NOT NULL,
      added_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (project_id, issue_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
    );

    -- Workflows table
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      project_id TEXT NOT NULL,
      current_stage TEXT NOT NULL,
      stages TEXT NOT NULL, -- JSON array
      transitions TEXT NOT NULL, -- JSON array
      is_complete BOOLEAN NOT NULL DEFAULT false,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    -- Issue dependencies table
    CREATE TABLE IF NOT EXISTS issue_dependencies (
      dependent_id TEXT NOT NULL,
      dependency_id TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (dependent_id, dependency_id),
      FOREIGN KEY (dependent_id) REFERENCES issues(id) ON DELETE CASCADE,
      FOREIGN KEY (dependency_id) REFERENCES issues(id) ON DELETE CASCADE
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_issues_parent 
      ON issues(parent_id);
    CREATE INDEX IF NOT EXISTS idx_issues_type 
      ON issues(type);
    CREATE INDEX IF NOT EXISTS idx_issues_status 
      ON issues(status);
    CREATE INDEX IF NOT EXISTS idx_project_issues_project 
      ON project_issues(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_issues_issue 
      ON project_issues(issue_id);
    CREATE INDEX IF NOT EXISTS idx_workflows_project 
      ON workflows(project_id);
    CREATE INDEX IF NOT EXISTS idx_dependencies_dependent 
      ON issue_dependencies(dependent_id);
    CREATE INDEX IF NOT EXISTS idx_dependencies_dependency 
      ON issue_dependencies(dependency_id);
  `
}
```

## Repository Implementations

### 1. SqliteProjectRepository

```typescript
// src/infrastructure/database/repositories/sqlite-project-repository.ts

import { Project } from '../../../domain/entities/project.js';
import { ProjectId } from '../../../domain/value-objects/project-id.js';
import { IssueId } from '../../../domain/value-objects/issue-id.js';
import { RepositoryError } from '../../../domain/errors/repository-errors.js';

import type { ProjectRepository } from '../../../domain/repositories/project-repository.js';
import type { ProjectSnapshot } from '../../../domain/entities/project.js';
import type { TimeProvider } from '../../../domain/interfaces/time-provider.js';
import type Database from 'better-sqlite3';

export class SqliteProjectRepository implements ProjectRepository {
  private findByIdStmt?: Database.Statement;
  private findAllStmt?: Database.Statement;
  private insertProjectStmt?: Database.Statement;
  private updateProjectStmt?: Database.Statement;
  private deleteProjectStmt?: Database.Statement;
  private findProjectIssuesStmt?: Database.Statement;
  private addProjectIssueStmt?: Database.Statement;
  private removeProjectIssueStmt?: Database.Statement;
  private clearProjectIssuesStmt?: Database.Statement;

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
        SELECT id, name, description, status, created_at, updated_at
        FROM projects
        WHERE id = ?
      `);

      this.findAllStmt = this.db.prepare(`
        SELECT id, name, description, status, created_at, updated_at
        FROM projects
        ORDER BY updated_at DESC
      `);

      this.insertProjectStmt = this.db.prepare(`
        INSERT INTO projects (id, name, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      this.updateProjectStmt = this.db.prepare(`
        UPDATE projects
        SET name = ?, description = ?, status = ?, updated_at = ?
        WHERE id = ?
      `);

      this.deleteProjectStmt = this.db.prepare(`
        DELETE FROM projects WHERE id = ?
      `);

      this.findProjectIssuesStmt = this.db.prepare(`
        SELECT issue_id FROM project_issues
        WHERE project_id = ?
        ORDER BY added_at ASC
      `);

      this.addProjectIssueStmt = this.db.prepare(`
        INSERT OR IGNORE INTO project_issues (project_id, issue_id)
        VALUES (?, ?)
      `);

      this.removeProjectIssueStmt = this.db.prepare(`
        DELETE FROM project_issues
        WHERE project_id = ? AND issue_id = ?
      `);

      this.clearProjectIssuesStmt = this.db.prepare(`
        DELETE FROM project_issues WHERE project_id = ?
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

  async findById(id: ProjectId): Promise<Project | null> {
    try {
      this.ensureStatementsReady();
      if (!this.findByIdStmt || !this.findProjectIssuesStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const projectRow = this.findByIdStmt.get(id.value) as any;
      if (!projectRow) {
        return null;
      }

      // Get associated issue IDs
      const issueRows = this.findProjectIssuesStmt.all(id.value) as any[];
      const issueIds = issueRows.map(row => row.issue_id);

      return this.rowToProject(projectRow, issueIds);
    } catch (error) {
      throw new RepositoryError('find project by id', error as Error);
    }
  }

  async findAll(): Promise<Project[]> {
    try {
      this.ensureStatementsReady();
      if (!this.findAllStmt || !this.findProjectIssuesStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const projectRows = this.findAllStmt.all() as any[];
      const projects: Project[] = [];

      for (const row of projectRows) {
        const issueRows = this.findProjectIssuesStmt.all(row.id) as any[];
        const issueIds = issueRows.map(r => r.issue_id);
        projects.push(this.rowToProject(row, issueIds));
      }

      return projects;
    } catch (error) {
      throw new RepositoryError('find all projects', error as Error);
    }
  }

  async save(project: Project): Promise<void> {
    try {
      this.ensureStatementsReady();
      if (!this.updateProjectStmt || !this.insertProjectStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const exists = await this.exists(project.id);
      const snapshot = project.toSnapshot();

      // Use transaction for consistency
      const saveProject = this.db.transaction(() => {
        if (exists) {
          this.updateProjectStmt!.run(
            snapshot.name,
            snapshot.description,
            snapshot.status,
            Math.floor(snapshot.updatedAt.getTime() / 1000),
            snapshot.id
          );
        } else {
          this.insertProjectStmt!.run(
            snapshot.id,
            snapshot.name,
            snapshot.description,
            snapshot.status,
            Math.floor(snapshot.createdAt.getTime() / 1000),
            Math.floor(snapshot.updatedAt.getTime() / 1000)
          );
        }

        // Update project-issue relationships
        this.clearProjectIssuesStmt!.run(snapshot.id);
        for (const issueId of snapshot.issueIds) {
          this.addProjectIssueStmt!.run(snapshot.id, issueId);
        }
      });

      saveProject();
    } catch (error) {
      throw new RepositoryError('save project', error as Error);
    }
  }

  async delete(id: ProjectId): Promise<boolean> {
    try {
      this.ensureStatementsReady();
      if (!this.deleteProjectStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const result = this.deleteProjectStmt.run(id.value);
      return result.changes > 0;
    } catch (error) {
      throw new RepositoryError('delete project', error as Error);
    }
  }

  async exists(id: ProjectId): Promise<boolean> {
    const stmt = this.db.prepare(`
      SELECT 1 FROM projects WHERE id = ? LIMIT 1
    `);
    const result = stmt.get(id.value);
    return result !== undefined;
  }

  private rowToProject(row: any, issueIds: string[]): Project {
    const snapshot: ProjectSnapshot = {
      id: row.id,
      name: row.name,
      description: row.description || '',
      status: row.status,
      issueIds,
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
    };

    return Project.fromSnapshot(snapshot, this.timeProvider);
  }
}
```

### 2. SqliteIssueRepository

```typescript
// src/infrastructure/database/repositories/sqlite-issue-repository.ts

import { Issue } from '../../../domain/entities/issue.js';
import { IssueId } from '../../../domain/value-objects/issue-id.js';
import { RepositoryError } from '../../../domain/errors/repository-errors.js';

import type { IssueRepository } from '../../../domain/repositories/issue-repository.js';
import type { IssueSnapshot } from '../../../domain/entities/issue.js';
import type { TimeProvider } from '../../../domain/interfaces/time-provider.js';
import type Database from 'better-sqlite3';

export class SqliteIssueRepository implements IssueRepository {
  private findByIdStmt?: Database.Statement;
  private insertIssueStmt?: Database.Statement;
  private updateIssueStmt?: Database.Statement;
  private deleteIssueStmt?: Database.Statement;
  private findChildrenStmt?: Database.Statement;
  private findDependenciesStmt?: Database.Statement;
  private addDependencyStmt?: Database.Statement;
  private removeDependencyStmt?: Database.Statement;
  private clearDependenciesStmt?: Database.Statement;

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
        SELECT id, title, description, type, status, parent_id, estimate, 
               created_at, updated_at
        FROM issues
        WHERE id = ?
      `);

      this.insertIssueStmt = this.db.prepare(`
        INSERT INTO issues (id, title, description, type, status, parent_id, 
                          estimate, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      this.updateIssueStmt = this.db.prepare(`
        UPDATE issues
        SET title = ?, description = ?, type = ?, status = ?, 
            parent_id = ?, estimate = ?, updated_at = ?
        WHERE id = ?
      `);

      this.deleteIssueStmt = this.db.prepare(`
        DELETE FROM issues WHERE id = ?
      `);

      this.findChildrenStmt = this.db.prepare(`
        SELECT id FROM issues WHERE parent_id = ?
        ORDER BY created_at ASC
      `);

      this.findDependenciesStmt = this.db.prepare(`
        SELECT dependency_id FROM issue_dependencies
        WHERE dependent_id = ?
        ORDER BY created_at ASC
      `);

      this.addDependencyStmt = this.db.prepare(`
        INSERT OR IGNORE INTO issue_dependencies (dependent_id, dependency_id)
        VALUES (?, ?)
      `);

      this.removeDependencyStmt = this.db.prepare(`
        DELETE FROM issue_dependencies
        WHERE dependent_id = ? AND dependency_id = ?
      `);

      this.clearDependenciesStmt = this.db.prepare(`
        DELETE FROM issue_dependencies WHERE dependent_id = ?
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
      if (!this.findByIdStmt || !this.findChildrenStmt || !this.findDependenciesStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const issueRow = this.findByIdStmt.get(id.value) as any;
      if (!issueRow) {
        return null;
      }

      // Get child IDs
      const childRows = this.findChildrenStmt.all(id.value) as any[];
      const childIds = childRows.map(row => row.id);

      // Get dependency IDs
      const depRows = this.findDependenciesStmt.all(id.value) as any[];
      const dependencies = depRows.map(row => row.dependency_id);

      return this.rowToIssue(issueRow, childIds, dependencies);
    } catch (error) {
      throw new RepositoryError('find issue by id', error as Error);
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

        // Update dependencies
        this.clearDependenciesStmt!.run(snapshot.id);
        for (const depId of snapshot.dependencies) {
          this.addDependencyStmt!.run(snapshot.id, depId);
        }
      });

      saveIssue();
    } catch (error) {
      throw new RepositoryError('save issue', error as Error);
    }
  }

  async delete(id: IssueId): Promise<boolean> {
    try {
      this.ensureStatementsReady();
      if (!this.deleteIssueStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const result = this.deleteIssueStmt.run(id.value);
      return result.changes > 0;
    } catch (error) {
      throw new RepositoryError('delete issue', error as Error);
    }
  }

  async exists(id: IssueId): Promise<boolean> {
    const stmt = this.db.prepare(`
      SELECT 1 FROM issues WHERE id = ? LIMIT 1
    `);
    const result = stmt.get(id.value);
    return result !== undefined;
  }

  private rowToIssue(row: any, childIds: string[], dependencies: string[]): Issue {
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

    return Issue.fromSnapshot(snapshot, this.timeProvider);
  }
}
```

### 3. SqliteWorkflowRepository

```typescript
// src/infrastructure/database/repositories/sqlite-workflow-repository.ts

import { Workflow } from '../../../domain/entities/workflow.js';
import { WorkflowId } from '../../../domain/value-objects/workflow-id.js';
import { ProjectId } from '../../../domain/value-objects/project-id.js';
import { RepositoryError } from '../../../domain/errors/repository-errors.js';

import type { WorkflowRepository } from '../../../domain/repositories/workflow-repository.js';
import type { WorkflowSnapshot } from '../../../domain/entities/workflow.js';
import type { TimeProvider } from '../../../domain/interfaces/time-provider.js';
import type Database from 'better-sqlite3';

export class SqliteWorkflowRepository implements WorkflowRepository {
  private findByIdStmt?: Database.Statement;
  private findByProjectStmt?: Database.Statement;
  private insertWorkflowStmt?: Database.Statement;
  private updateWorkflowStmt?: Database.Statement;
  private deleteWorkflowStmt?: Database.Statement;

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
        SELECT id, name, project_id, current_stage, stages, transitions, 
               is_complete, created_at, updated_at
        FROM workflows
        WHERE id = ?
      `);

      this.findByProjectStmt = this.db.prepare(`
        SELECT id, name, project_id, current_stage, stages, transitions, 
               is_complete, created_at, updated_at
        FROM workflows
        WHERE project_id = ?
      `);

      this.insertWorkflowStmt = this.db.prepare(`
        INSERT INTO workflows (id, name, project_id, current_stage, stages, 
                              transitions, is_complete, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      this.updateWorkflowStmt = this.db.prepare(`
        UPDATE workflows
        SET name = ?, current_stage = ?, stages = ?, transitions = ?, 
            is_complete = ?, updated_at = ?
        WHERE id = ?
      `);

      this.deleteWorkflowStmt = this.db.prepare(`
        DELETE FROM workflows WHERE id = ?
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

  async findById(id: WorkflowId): Promise<Workflow | null> {
    try {
      this.ensureStatementsReady();
      if (!this.findByIdStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const row = this.findByIdStmt.get(id.value) as any;
      if (!row) {
        return null;
      }

      return this.rowToWorkflow(row);
    } catch (error) {
      throw new RepositoryError('find workflow by id', error as Error);
    }
  }

  async findByProjectId(projectId: ProjectId): Promise<Workflow[]> {
    try {
      this.ensureStatementsReady();
      if (!this.findByProjectStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const rows = this.findByProjectStmt.all(projectId.value) as any[];
      return rows.map(row => this.rowToWorkflow(row));
    } catch (error) {
      throw new RepositoryError('find workflows by project id', error as Error);
    }
  }

  async save(workflow: Workflow): Promise<void> {
    try {
      this.ensureStatementsReady();
      if (!this.updateWorkflowStmt || !this.insertWorkflowStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const exists = await this.exists(workflow.id);
      const snapshot = workflow.toSnapshot();

      if (exists) {
        this.updateWorkflowStmt.run(
          snapshot.name,
          snapshot.currentStage,
          JSON.stringify(snapshot.stages),
          JSON.stringify(snapshot.transitions),
          snapshot.isComplete ? 1 : 0,
          Math.floor(snapshot.updatedAt.getTime() / 1000),
          snapshot.id
        );
      } else {
        this.insertWorkflowStmt.run(
          snapshot.id,
          snapshot.name,
          snapshot.projectId,
          snapshot.currentStage,
          JSON.stringify(snapshot.stages),
          JSON.stringify(snapshot.transitions),
          snapshot.isComplete ? 1 : 0,
          Math.floor(snapshot.createdAt.getTime() / 1000),
          Math.floor(snapshot.updatedAt.getTime() / 1000)
        );
      }
    } catch (error) {
      throw new RepositoryError('save workflow', error as Error);
    }
  }

  async delete(id: WorkflowId): Promise<boolean> {
    try {
      this.ensureStatementsReady();
      if (!this.deleteWorkflowStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const result = this.deleteWorkflowStmt.run(id.value);
      return result.changes > 0;
    } catch (error) {
      throw new RepositoryError('delete workflow', error as Error);
    }
  }

  async exists(id: WorkflowId): Promise<boolean> {
    const stmt = this.db.prepare(`
      SELECT 1 FROM workflows WHERE id = ? LIMIT 1
    `);
    const result = stmt.get(id.value);
    return result !== undefined;
  }

  private rowToWorkflow(row: any): Workflow {
    const snapshot: WorkflowSnapshot = {
      id: row.id,
      name: row.name,
      projectId: row.project_id,
      currentStage: row.current_stage,
      stages: JSON.parse(row.stages),
      transitions: JSON.parse(row.transitions),
      isComplete: Boolean(row.is_complete),
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
    };

    return Workflow.fromSnapshot(snapshot, this.timeProvider);
  }
}
```

## Error Handling

### Repository Error Class

```typescript
// src/domain/errors/repository-errors.ts

export class RepositoryError extends Error {
  constructor(
    operation: string,
    public readonly cause?: Error
  ) {
    super(`Repository operation failed: ${operation}`);
    this.name = 'RepositoryError';
    if (cause) {
      this.stack = cause.stack;
    }
  }
}
```

## Testing Strategy

### 1. Integration Tests

```typescript
// tests/integration/sqlite-project-repository.integration.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SqliteProjectRepository } from '../../src/infrastructure/database/repositories/sqlite-project-repository.js';
import { Project } from '../../src/domain/entities/project.js';
import { ProjectId } from '../../src/domain/value-objects/project-id.js';
import { IssueId } from '../../src/domain/value-objects/issue-id.js';
import { migrations } from '../../src/database/migrations.js';

describe('SqliteProjectRepository Integration Tests', () => {
  let db: Database.Database;
  let repository: SqliteProjectRepository;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    
    // Run migrations
    for (const migration of migrations) {
      db.exec(migration.sql);
    }
    
    repository = new SqliteProjectRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('save and findById', () => {
    it('should save and retrieve a project', async () => {
      const project = Project.create('Test Project', 'Description');
      
      await repository.save(project);
      const retrieved = await repository.findById(project.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id.equals(project.id)).toBe(true);
      expect(retrieved!.name).toBe('Test Project');
      expect(retrieved!.description).toBe('Description');
    });

    it('should update an existing project', async () => {
      const project = Project.create('Original', 'Original Desc');
      await repository.save(project);
      
      project.updateName('Updated');
      await repository.save(project);
      
      const retrieved = await repository.findById(project.id);
      expect(retrieved!.name).toBe('Updated');
    });

    it('should handle project with issues', async () => {
      const project = Project.create('Project', 'Desc');
      const issueId1 = IssueId.generate();
      const issueId2 = IssueId.generate();
      
      project.addIssue(issueId1);
      project.addIssue(issueId2);
      
      await repository.save(project);
      const retrieved = await repository.findById(project.id);
      
      expect(retrieved!.issues).toHaveLength(2);
      expect(retrieved!.hasIssue(issueId1)).toBe(true);
      expect(retrieved!.hasIssue(issueId2)).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should retrieve all projects', async () => {
      const project1 = Project.create('Project 1', 'Desc 1');
      const project2 = Project.create('Project 2', 'Desc 2');
      
      await repository.save(project1);
      await repository.save(project2);
      
      const projects = await repository.findAll();
      
      expect(projects).toHaveLength(2);
      expect(projects.some(p => p.id.equals(project1.id))).toBe(true);
      expect(projects.some(p => p.id.equals(project2.id))).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete a project', async () => {
      const project = Project.create('To Delete', 'Desc');
      await repository.save(project);
      
      const deleted = await repository.delete(project.id);
      expect(deleted).toBe(true);
      
      const retrieved = await repository.findById(project.id);
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent project', async () => {
      const deleted = await repository.delete(ProjectId.generate());
      expect(deleted).toBe(false);
    });
  });

  describe('transaction rollback', () => {
    it('should rollback on error', async () => {
      const project = Project.create('Project', 'Desc');
      await repository.save(project);
      
      // Force an error by closing the database
      db.close();
      
      project.updateName('Should Not Save');
      
      await expect(repository.save(project)).rejects.toThrow();
      
      // Reopen and verify no change
      db = new Database(':memory:');
      for (const migration of migrations) {
        db.exec(migration.sql);
      }
      repository = new SqliteProjectRepository(db);
      
      // Original project should not exist in new database
      const retrieved = await repository.findById(project.id);
      expect(retrieved).toBeNull();
    });
  });
});
```

### 2. Test Patterns for Issue and Workflow Repositories

Similar integration test patterns should be implemented for:
- `SqliteIssueRepository`: Test hierarchy validation, dependencies, estimates
- `SqliteWorkflowRepository`: Test stage transitions, JSON serialization

## Implementation Order

1. **Phase 1: Infrastructure Setup**
   - Create repository error class
   - Add migration 006 to migrations array
   - Run migration to create tables

2. **Phase 2: Repository Implementation (TDD)**
   - Write integration tests for SqliteProjectRepository
   - Implement SqliteProjectRepository
   - Write integration tests for SqliteIssueRepository
   - Implement SqliteIssueRepository
   - Write integration tests for SqliteWorkflowRepository
   - Implement SqliteWorkflowRepository

3. **Phase 3: Integration Testing**
   - Test transaction scenarios
   - Test concurrent access patterns
   - Test large dataset performance

4. **Phase 4: Documentation and Cleanup**
   - Update API documentation
   - Add usage examples
   - Performance optimization if needed

## Performance Considerations

1. **Prepared Statements**: All queries use prepared statements for optimal performance
2. **Indexing**: Strategic indexes on foreign keys and commonly queried fields
3. **Batch Operations**: Transaction wrapping for multi-operation consistency
4. **Connection Pooling**: Reuse existing database connection from infrastructure

## Security Considerations

1. **SQL Injection Prevention**: All queries use parameterized statements
2. **Data Validation**: Domain entities validate data before persistence
3. **Transaction Isolation**: Better-sqlite3 provides serialized transaction isolation

## Dependencies

- **Domain Layer**: Entities, Value Objects, Repository Interfaces (SPI-399)
- **Infrastructure**: Database connection, migrations, SqliteUnitOfWork (SPI-346)
- **Testing**: Vitest, better-sqlite3

## Acceptance Criteria Checklist

- [ ] Repository error class implemented
- [ ] Database migration 006 created and tested
- [ ] SqliteProjectRepository with full CRUD operations
- [ ] SqliteIssueRepository with hierarchy and dependency support
- [ ] SqliteWorkflowRepository with JSON serialization
- [ ] Integration tests achieving >95% coverage
- [ ] Transaction rollback scenarios tested
- [ ] Performance benchmarks meet requirements
- [ ] Documentation complete with examples

## Risk Mitigation

1. **Database Schema Changes**: Use migrations for version control
2. **Data Integrity**: Foreign key constraints and transaction support
3. **Performance Degradation**: Monitor with benchmarks, add indexes as needed
4. **Testing Coverage**: Integration tests for all repository methods

## Next Steps

After this implementation is complete:
1. SPI-401: Application Service Layer can use these repositories
2. SPI-344: MCP Resources can access data through repositories
3. SPI-345: CRUD tools can persist changes through repositories