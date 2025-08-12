import type { Issue } from '../entities/issue.js';
import type { IssueId } from '../value-objects/issue-id.js';
import type { ProjectId } from '../value-objects/project-id.js';

export interface IssueRepository {
  findById: (id: IssueId) => Promise<Issue | null>;
  findByProjectId: (projectId: ProjectId) => Promise<Issue[]>;
  save: (issue: Issue) => Promise<void>;
  saveToProject: (issue: Issue, projectId: ProjectId) => Promise<void>;
}