/**
 * JCVD: Simple Context Provider for Claude Code
 *
 * This is what JCVD should actually be - a simple data and context provider
 * that focuses on cross-session continuity for solo developers.
 *
 * Based on ARCHITECTURE.md, LIMITATIONS.md, and PRD.md
 */

import { createLogger } from './utils/logger.js';
import type { Logger } from './utils/logger.js';

/**
 * Simple project context data structure
 */
export interface ProjectContext {
  id: string;
  name: string;
  phase: string;
  statistics: {
    totalIssues: number;
    completedIssues: number;
    inProgressIssues: number;
    unblockedIssues: number;
  };
  recentActivity: Array<{
    issueId: string;
    title: string;
    status: string;
    completedAt?: string;
  }>;
}

/**
 * Basic issue data structure
 */
export interface Issue {
  id: string;
  projectId: string;
  parentId?: string;
  title: string;
  description?: string;
  status: string;
  type: 'epic' | 'story' | 'subtask';
  estimate?: number;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Simple project data structure
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Simple project store interface - just basic CRUD
 */
export interface ProjectStore {
  // Projects
  createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project>;
  getProject(id: string): Promise<Project | null>;
  listProjects(): Promise<Project[]>;
  updateProject(id: string, data: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Issues
  createIssue(data: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>): Promise<Issue>;
  getIssue(id: string): Promise<Issue | null>;
  listIssues(projectId: string): Promise<Issue[]>;
  updateIssue(id: string, data: Partial<Issue>): Promise<Issue>;
  deleteIssue(id: string): Promise<void>;
}

/**
 * Simple SQLite implementation of ProjectStore
 */
export class SQLiteProjectStore implements ProjectStore {
  private logger: Logger = createLogger('sqlite-store');

  constructor(private dbPath: string) {
    this.logger.debug('SQLite store initialized', { dbPath: this.dbPath });
  }

  async createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    // TODO: Implement with basic SQLite operations
    this.logger.debug('Creating project', { data });
    throw new Error('Not implemented - simple SQLite operations only');
  }

  async getProject(id: string): Promise<Project | null> {
    // TODO: Simple SELECT operation
    this.logger.debug('Getting project', { id });
    throw new Error('Not implemented - simple SQLite operations only');
  }

  async listProjects(): Promise<Project[]> {
    // TODO: Simple SELECT operation
    throw new Error('Not implemented - simple SQLite operations only');
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    // TODO: Simple UPDATE operation
    this.logger.debug('Updating project', { id, data });
    throw new Error('Not implemented - simple SQLite operations only');
  }

  async deleteProject(id: string): Promise<void> {
    // TODO: Simple DELETE operation
    this.logger.debug('Deleting project', { id });
    throw new Error('Not implemented - simple SQLite operations only');
  }

  async createIssue(data: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>): Promise<Issue> {
    // TODO: Simple INSERT operation
    this.logger.debug('Creating issue', { data });
    throw new Error('Not implemented - simple SQLite operations only');
  }

  async getIssue(id: string): Promise<Issue | null> {
    // TODO: Simple SELECT operation
    this.logger.debug('Getting issue', { id });
    throw new Error('Not implemented - simple SQLite operations only');
  }

  async listIssues(projectId: string): Promise<Issue[]> {
    // TODO: Simple SELECT with WHERE clause
    this.logger.debug('Listing issues', { projectId });
    throw new Error('Not implemented - simple SQLite operations only');
  }

  async updateIssue(id: string, data: Partial<Issue>): Promise<Issue> {
    // TODO: Simple UPDATE operation
    this.logger.debug('Updating issue', { id, data });
    throw new Error('Not implemented - simple SQLite operations only');
  }

  async deleteIssue(id: string): Promise<void> {
    // TODO: Simple DELETE operation
    this.logger.debug('Deleting issue', { id });
    throw new Error('Not implemented - simple SQLite operations only');
  }
}

/**
 * Simple context provider - this is what JCVD should be
 */
export class JCVDContextProvider {
  private logger: Logger = createLogger('jcvd-context-provider');
  
  constructor(private store: ProjectStore) {}

  /**
   * Get project context for Claude Code
   * This is the main function - providing structured project data
   */
  async getProjectContext(projectId: string): Promise<ProjectContext | null> {
    try {
      const project = await this.store.getProject(projectId);
      if (!project) return null;

      const issues = await this.store.listIssues(projectId);

      // Simple statistics calculation
      const completedIssues = issues.filter(issue => issue.status === 'completed').length;
      const inProgressIssues = issues.filter(issue => issue.status === 'in_progress').length;
      const unblockedIssues = this.findUnblockedIssues(issues).length;

      // Simple recent activity (last 5 completed issues)
      const recentActivity = issues
        .filter(issue => issue.status === 'completed')
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 5)
        .map(issue => ({
          issueId: issue.id,
          title: issue.title,
          status: issue.status,
          completedAt: issue.updatedAt.toISOString(),
        }));

      return {
        id: project.id,
        name: project.name,
        phase: 'Development', // Simple static phase for now
        statistics: {
          totalIssues: issues.length,
          completedIssues,
          inProgressIssues,
          unblockedIssues,
        },
        recentActivity,
      };
    } catch (error) {
      this.logger.error('Failed to get project context', { projectId, error });
      return null;
    }
  }

  /**
   * Get unblocked tasks - simple dependency checking
   */
  async getUnblockedTasks(projectId: string): Promise<Issue[]> {
    const issues = await this.store.listIssues(projectId);
    return this.findUnblockedIssues(issues);
  }

  /**
   * Simple dependency checking - no complex analysis
   * For now, just return issues that aren't completed or in progress
   */
  private findUnblockedIssues(issues: Issue[]): Issue[] {
    return issues.filter(issue => 
      issue.status !== 'completed' && 
      issue.status !== 'in_progress'
    );
  }

  /**
   * Create basic project structure
   */
  async createProject(name: string, description?: string): Promise<Project> {
    const projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = { name };
    if (description !== undefined) {
      projectData.description = description;
    }
    return this.store.createProject(projectData);
  }

  /**
   * Create basic issue
   */
  async createIssue(projectId: string, title: string, type: 'epic' | 'story' | 'subtask', options: {
    description?: string;
    parentId?: string;
    estimate?: number;
    priority?: number;
  } = {}): Promise<Issue> {
    const issueData: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'> = {
      projectId,
      title,
      type,
      priority: options.priority ?? 3,
      status: 'todo',
    };
    if (options.description !== undefined) {
      issueData.description = options.description;
    }
    if (options.parentId !== undefined) {
      issueData.parentId = options.parentId;
    }
    if (options.estimate !== undefined) {
      issueData.estimate = options.estimate;
    }
    return this.store.createIssue(issueData);
  }

  /**
   * Update issue status - basic operation
   */
  async updateIssueStatus(issueId: string, status: string): Promise<Issue> {
    return this.store.updateIssue(issueId, { status, updatedAt: new Date() });
  }
}

/**
 * Simple MCP Resource server - this is what we should expose to Claude Code
 */
export class JCVDMCPResourceServer {
  private logger: Logger = createLogger('jcvd-mcp-server');

  constructor(private contextProvider: JCVDContextProvider) {}

  /**
   * Handle MCP resource requests
   */
  async handleResourceRequest(uri: string): Promise<any> {
    this.logger.debug('Handling MCP resource request', { uri });

    try {
      // Simple URI parsing - jcvd://project/{id}/context
      const match = uri.match(/^jcvd:\/\/project\/([^\/]+)\/(.+)$/);
      if (!match) {
        throw new Error(`Unsupported resource URI: ${uri}`);
      }

      const [, projectId, resource] = match;
      
      if (!projectId || !resource) {
        throw new Error(`Invalid resource URI format: ${uri}`);
      }

      switch (resource) {
        case 'context':
          return await this.contextProvider.getProjectContext(projectId);
        
        case 'tasks/unblocked':
          if (!projectId) {
            throw new Error('Project ID is required for tasks/unblocked resource');
          }
          return await this.contextProvider.getUnblockedTasks(projectId);
        
        default:
          throw new Error(`Unsupported resource: ${resource}`);
      }
    } catch (error) {
      this.logger.error('Failed to handle resource request', { uri, error });
      throw error;
    }
  }

  /**
   * Handle MCP tool calls
   */
  async handleToolCall(name: string, params: any): Promise<any> {
    this.logger.debug('Handling MCP tool call', { name, params });

    try {
      switch (name) {
        case 'jcvd_create_project':
          if (typeof params.name !== 'string') {
            throw new Error('Project name is required and must be a string');
          }
          return await this.contextProvider.createProject(
            params.name, 
            typeof params.description === 'string' ? params.description : undefined
          );
        
        case 'jcvd_create_issue':
          return await this.contextProvider.createIssue(
            params.projectId,
            params.title,
            params.type,
            {
              description: params.description,
              parentId: params.parentId,
              estimate: params.estimate,
              priority: params.priority,
            }
          );
        
        case 'jcvd_update_issue_status':
          return await this.contextProvider.updateIssueStatus(params.issueId, params.status);
        
        default:
          throw new Error(`Unsupported tool: ${name}`);
      }
    } catch (error) {
      this.logger.error('Failed to handle tool call', { name, params, error });
      throw error;
    }
  }
}