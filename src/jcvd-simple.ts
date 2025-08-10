/**
 * JCVD Simple Implementation
 *
 * A straightforward implementation of JCVD functionality using SQLite storage.
 * This module provides the core interfaces and implementations needed for
 * basic project orchestration without complex abstractions.
 */

import { SqliteStore } from './sqlite-store.js';
import { JcvdMcpServer } from './mcp-server.js';

// Core interfaces
export interface Project {
  id: string;
  name: string;
  description: string;
  path: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'completed' | 'archived';
}

export interface Issue {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done' | 'canceled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  assignee?: string;
  labels?: string[];
}

export interface ProjectContext {
  project: Project;
  issues: Issue[];
  activeIssues: Issue[];
  completedIssues: Issue[];
}

export interface JCVDConfig {
  databasePath?: string;
  mcpPort?: number;
}

/**
 * SQLite-backed project store implementation
 */
export class SqliteProjectStore {
  private store: SqliteStore;

  constructor(databasePath: string) {
    this.store = new SqliteStore(databasePath);
  }

  async initialize(): Promise<void> {
    // Store is initialized in constructor
  }

  async close(): Promise<void> {
    this.store.close();
  }

  // Project operations
  async createProject(
    projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Project> {
    const project = await this.store.createProject(projectData);
    return project;
  }

  async getProject(id: string): Promise<Project | null> {
    return await this.store.getProject(id);
  }

  async updateProject(
    id: string,
    updates: Partial<Omit<Project, 'id' | 'created_at'>>
  ): Promise<Project> {
    const project = await this.store.updateProject(id, updates);
    if (!project) {
      throw new Error(`Project ${id} not found`);
    }
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    const success = await this.store.deleteProject(id);
    if (!success) {
      throw new Error(`Project ${id} not found`);
    }
  }

  async listProjects(): Promise<Project[]> {
    return await this.store.listProjects();
  }

  // Issue operations
  async createIssue(issueData: Omit<Issue, 'id' | 'created_at' | 'updated_at'>): Promise<Issue> {
    const issue = await this.store.createIssue(issueData);
    return issue;
  }

  async getIssue(id: string): Promise<Issue | null> {
    return await this.store.getIssue(id);
  }

  async updateIssue(
    id: string,
    updates: Partial<Omit<Issue, 'id' | 'created_at'>>
  ): Promise<Issue> {
    const issue = await this.store.updateIssue(id, updates);
    if (!issue) {
      throw new Error(`Issue ${id} not found`);
    }
    return issue;
  }

  async deleteIssue(id: string): Promise<void> {
    const success = await this.store.deleteIssue(id);
    if (!success) {
      throw new Error(`Issue ${id} not found`);
    }
  }

  async listIssues(projectId?: string): Promise<Issue[]> {
    return await this.store.listIssues(projectId || '');
  }

  async getProjectContext(projectId: string): Promise<ProjectContext | null> {
    const project = await this.getProject(projectId);
    if (!project) {
      return null;
    }

    const issues = await this.listIssues(projectId);
    const activeIssues = issues.filter(
      issue => issue.status === 'todo' || issue.status === 'in_progress'
    );
    const completedIssues = issues.filter(issue => issue.status === 'done');

    return {
      project,
      issues,
      activeIssues,
      completedIssues,
    };
  }
}

/**
 * Context provider for JCVD operations
 */
export class JCVDContextProvider {
  private store: SqliteProjectStore;

  constructor(store: SqliteProjectStore) {
    this.store = store;
  }

  async getCurrentProject(): Promise<Project | null> {
    // Get the most recently updated active project
    const projects = await this.store.listProjects();
    const activeProjects = projects.filter(p => p.status === 'active');

    if (activeProjects.length === 0) {
      return null;
    }

    // Sort by updated_at descending and return the first one
    activeProjects.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    return activeProjects[0] || null;
  }

  async getProjectContext(projectId?: string): Promise<ProjectContext | null> {
    let targetProjectId = projectId;

    if (!targetProjectId) {
      const currentProject = await this.getCurrentProject();
      if (!currentProject) {
        return null;
      }
      targetProjectId = currentProject.id;
    }

    return await this.store.getProjectContext(targetProjectId);
  }

  async getActiveIssues(projectId?: string): Promise<Issue[]> {
    const context = await this.getProjectContext(projectId);
    return context?.activeIssues || [];
  }

  async getIssuesByStatus(status: Issue['status'], projectId?: string): Promise<Issue[]> {
    const issues = await this.store.listIssues(projectId);
    return issues.filter(issue => issue.status === status);
  }

  async searchIssues(query: string, projectId?: string): Promise<Issue[]> {
    const issues = await this.store.listIssues(projectId);
    const lowercaseQuery = query.toLowerCase();

    return issues.filter(
      issue =>
        issue.title.toLowerCase().includes(lowercaseQuery) ||
        issue.description.toLowerCase().includes(lowercaseQuery)
    );
  }
}

/**
 * MCP Resource Server for JCVD
 */
export class JCVDMCPResourceServer {
  private mcpServer: JcvdMcpServer;

  constructor(_store: SqliteProjectStore) {
    this.mcpServer = new JcvdMcpServer();
  }

  async start(_transport?: any): Promise<void> {
    await this.mcpServer.start();
  }

  async stop(): Promise<void> {
    // Simple stop - no complex cleanup needed
  }

  getServer() {
    return this.mcpServer;
  }
}

/**
 * Main JCVD class - Simple orchestration interface
 */
export class JCVD {
  private store: SqliteProjectStore;
  private contextProvider: JCVDContextProvider;
  private mcpServer?: JCVDMCPResourceServer | undefined;
  private config: JCVDConfig;

  constructor(config: JCVDConfig = {}) {
    this.config = {
      databasePath: config.databasePath || './jcvd.db',
      mcpPort: config.mcpPort || 3000,
    };

    this.store = new SqliteProjectStore(this.config.databasePath!);
    this.contextProvider = new JCVDContextProvider(this.store);
  }

  async initialize(): Promise<void> {
    await this.store.initialize();
  }

  async close(): Promise<void> {
    if (this.mcpServer) {
      await this.mcpServer.stop();
    }
    await this.store.close();
  }

  // Direct store access for simple operations
  get projects() {
    return this.store;
  }

  // Context operations
  get context() {
    return this.contextProvider;
  }

  // MCP Server operations
  async startMCPServer(transport?: any): Promise<void> {
    if (!this.mcpServer) {
      this.mcpServer = new JCVDMCPResourceServer(this.store);
    }
    await this.mcpServer.start(transport);
  }

  async stopMCPServer(): Promise<void> {
    if (this.mcpServer) {
      await this.mcpServer.stop();
      this.mcpServer = undefined;
    }
  }

  getMCPServer() {
    return this.mcpServer?.getServer();
  }

  // Status and lifecycle methods for CLI compatibility
  getStatus() {
    return {
      status: 'running' as const,
      role: 'simple-context-provider',
      capabilities: ['project-context', 'cross-session-continuity', 'basic-crud'],
    };
  }

  async stop(): Promise<void> {
    await this.close();
  }

  // Convenience methods for common operations
  async createProjectWithIssues(
    projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>,
    issuesData: Omit<Issue, 'id' | 'project_id' | 'created_at' | 'updated_at'>[]
  ): Promise<{ project: Project; issues: Issue[] }> {
    const project = await this.store.createProject(projectData);

    const issues = await Promise.all(
      issuesData.map(issueData =>
        this.store.createIssue({
          ...issueData,
          project_id: project.id,
        })
      )
    );

    return { project, issues };
  }

  async getCurrentProjectSummary(): Promise<{
    project: Project | null;
    totalIssues: number;
    activeIssues: number;
    completedIssues: number;
  } | null> {
    const context = await this.contextProvider.getProjectContext();

    if (!context) {
      return null;
    }

    return {
      project: context.project,
      totalIssues: context.issues.length,
      activeIssues: context.activeIssues.length,
      completedIssues: context.completedIssues.length,
    };
  }
}

// Default export for simple usage
export default JCVD;

// Factory function for quick setup
export async function createJCVD(config: JCVDConfig = {}): Promise<JCVD> {
  const jcvd = new JCVD(config);
  await jcvd.initialize();
  return jcvd;
}

// Legacy aliases for backward compatibility
export const SQLiteProjectStore = SqliteProjectStore;
