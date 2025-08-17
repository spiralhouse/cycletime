import type { Project } from '../entities/project.js';
import type { ProjectId } from '../value-objects/project-id.js';

export interface ProjectRepository {
  findById: (_id: ProjectId) => Promise<Project | null>;
  save: (_project: Project) => Promise<void>;
  delete: (_id: ProjectId) => Promise<void>;
  findAll: () => Promise<Project[]>;
}