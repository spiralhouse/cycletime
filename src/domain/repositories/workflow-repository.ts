import type { Workflow } from '../entities/workflow.js';
import type { ProjectId } from '../value-objects/project-id.js';
import type { WorkflowId } from '../value-objects/workflow-id.js';

export interface WorkflowRepository {
  findById: (_id: WorkflowId) => Promise<Workflow | null>;
  findByProjectId: (_projectId: ProjectId) => Promise<Workflow | null>;
  save: (_workflow: Workflow) => Promise<void>;
}