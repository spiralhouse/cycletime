import { Project } from '../../../domain/entities/project.js';
import { RepositoryError } from '../../../domain/errors/repository-errors.js';


import type { ProjectSnapshot } from '../../../domain/entities/project.js';
import type { TimeProvider } from '../../../domain/interfaces/time-provider.js';
import type { ProjectRepository } from '../../../domain/repositories/project-repository.js';
import type { ProjectId } from '../../../domain/value-objects/project-id.js';
import type Database from 'better-sqlite3';

export class SqliteProjectRepository implements ProjectRepository {
  private findByIdStmt?: Database.Statement;
  private findAllStmt?: Database.Statement;
  private insertProjectStmt?: Database.Statement;
  private updateProjectStmt?: Database.Statement;
  private deleteProjectStmt?: Database.Statement;
  private findProjectIssuesStmt?: Database.Statement;
  private addProjectIssueStmt?: Database.Statement;
  private clearProjectIssuesStmt?: Database.Statement;
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

      this.clearProjectIssuesStmt = this.db.prepare(`
        DELETE FROM project_issues WHERE project_id = ?
      `);

      this.existsStmt = this.db.prepare(`
        SELECT 1 FROM projects WHERE id = ? LIMIT 1
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

  async delete(id: ProjectId): Promise<void> {
    try {
      this.ensureStatementsReady();
      if (!this.deleteProjectStmt) {
        throw new Error('Unable to prepare database statements');
      }

      this.deleteProjectStmt.run(id.value);
    } catch (error) {
      throw new RepositoryError('delete project', error as Error);
    }
  }

  async exists(id: ProjectId): Promise<boolean> {
    try {
      this.ensureStatementsReady();
      if (!this.existsStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const result = this.existsStmt.get(id.value);

      return result !== undefined;
    } catch (error) {
      throw new RepositoryError('check project existence', error as Error);
    }
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