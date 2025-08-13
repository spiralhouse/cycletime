import type { Workflow } from '../entities/workflow.js';
import type { ProjectId } from '../value-objects/project-id.js';

export interface WorkflowRepository {
  findByProjectId: (_projectId: ProjectId) => Promise<Workflow | null>;
  save: (_workflow: Workflow) => Promise<void>;
}