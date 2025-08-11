import type { Workflow } from '../entities/workflow.js';
import type { ProjectId } from '../value-objects/project-id.js';

export interface WorkflowRepository {
  findByProjectId: (projectId: ProjectId) => Promise<Workflow | null>;
  save: (workflow: Workflow) => Promise<void>;
}