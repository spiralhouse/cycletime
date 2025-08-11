import type { Project } from '../entities/project.js';
import type { ProjectId } from '../value-objects/project-id.js';

export interface ProjectRepository {
  findById: (id: ProjectId) => Promise<Project | null>;
  save: (project: Project) => Promise<void>;
  findAll: () => Promise<Project[]>;
}