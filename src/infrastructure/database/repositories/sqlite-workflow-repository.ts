import { Workflow } from '../../../domain/entities/workflow.js';
import { RepositoryError } from '../../../domain/errors/repository-errors.js';

import type { WorkflowSnapshot, WorkflowTransition } from '../../../domain/entities/workflow.js';
import type { TimeProvider } from '../../../domain/interfaces/time-provider.js';
import type { WorkflowRepository } from '../../../domain/repositories/workflow-repository.js';
import type { ProjectId } from '../../../domain/value-objects/project-id.js';
import type Database from 'better-sqlite3';

export class SqliteWorkflowRepository implements WorkflowRepository {
  private findByProjectStmt?: Database.Statement;
  private insertWorkflowStmt?: Database.Statement;
  private updateWorkflowStmt?: Database.Statement;

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
      this.findByProjectStmt = this.db.prepare(`
        SELECT id, project_id, name, current_stage, stages, transitions, is_complete, created_at, updated_at
        FROM workflows
        WHERE project_id = ?
        LIMIT 1
      `);

      this.insertWorkflowStmt = this.db.prepare(`
        INSERT INTO workflows (id, project_id, name, current_stage, stages, transitions, is_complete, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      this.updateWorkflowStmt = this.db.prepare(`
        UPDATE workflows
        SET name = ?, current_stage = ?, stages = ?, transitions = ?, is_complete = ?, updated_at = ?
        WHERE id = ?
      `);
    } catch {
      // Statements will be re-initialized on next access
    }
  }

  private ensureStatementsReady(): void {
    if (!this.findByProjectStmt || !this.db.open) {
      this.initializeStatements();
    }
  }

  async findByProjectId(projectId: ProjectId): Promise<Workflow | null> {
    try {
      this.ensureStatementsReady();
      if (!this.findByProjectStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const workflowRow = this.findByProjectStmt.get(projectId.value) as any;

      if (!workflowRow) {
        return null;
      }

      return this.rowToWorkflow(workflowRow);
    } catch (error) {
      throw new RepositoryError('find workflow by project id', error as Error);
    }
  }

  async save(workflow: Workflow): Promise<void> {
    try {
      this.ensureStatementsReady();
      if (!this.updateWorkflowStmt || !this.insertWorkflowStmt || !this.findByProjectStmt) {
        throw new Error('Unable to prepare database statements');
      }

      // Check if workflow already exists
      const exists = this.findByProjectStmt.get(workflow.projectId.value) as any;
      const snapshot = workflow.toSnapshot();

      if (exists && exists.id === snapshot.id) {
        // Update existing workflow
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
        // Insert new workflow (or replace if different workflow for same project)
        if (exists) {
          // Delete the existing workflow for this project first
          const deleteStmt = this.db.prepare('DELETE FROM workflows WHERE project_id = ?');

          deleteStmt.run(workflow.projectId.value);
        }
        
        this.insertWorkflowStmt.run(
          snapshot.id,
          snapshot.projectId,
          snapshot.name,
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

  private rowToWorkflow(row: any): Workflow {
    let stages: string[];
    let transitions: WorkflowTransition[];

    try {
      stages = JSON.parse(row.stages);
      transitions = JSON.parse(row.transitions);
      
      // Convert transition dates from strings back to Date objects
      transitions = transitions.map(t => ({
        ...t,
        occurredAt: new Date(t.occurredAt)
      }));
    } catch (error) {
      throw new RepositoryError('parse workflow JSON', error as Error);
    }

    const snapshot: WorkflowSnapshot = {
      id: row.id,
      name: row.name,
      projectId: row.project_id,
      currentStage: row.current_stage,
      stages,
      transitions,
      isComplete: row.is_complete === 1,
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
    };

    return Workflow.fromSnapshot(snapshot, this.timeProvider);
  }
}