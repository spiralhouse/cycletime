import type { Issue } from '../entities/issue.js';
import type { IssueId } from '../value-objects/issue-id.js';
import type { ProjectId } from '../value-objects/project-id.js';

export interface IssueRepository {
  findById: (_id: IssueId) => Promise<Issue | null>;
  findByProjectId: (_projectId: ProjectId) => Promise<Issue[]>;
  save: (_issue: Issue) => Promise<void>;
  saveToProject: (_issue: Issue, _projectId: ProjectId) => Promise<void>;
}