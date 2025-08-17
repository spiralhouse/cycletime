import Database from 'better-sqlite3';

import { IssueApplicationService } from '../../src/application/services/issue-application-service.js';
import { ProjectApplicationService } from '../../src/application/services/project-application-service.js';
import { WorkflowApplicationService } from '../../src/application/services/workflow-application-service.js';
import { SqliteIssueRepository } from '../../src/infrastructure/database/repositories/sqlite-issue-repository.js';
import { SqliteProjectRepository } from '../../src/infrastructure/database/repositories/sqlite-project-repository.js';
import { SqliteWorkflowRepository } from '../../src/infrastructure/database/repositories/sqlite-workflow-repository.js';
import { SqliteUnitOfWork } from '../../src/infrastructure/database/sqlite-unit-of-work.js';

import { MockTimeProvider } from './mock-time-provider.js';

import type { CreateIssueCommand } from '../../src/application/dtos/issue-dto.js';
import type { CreateProjectCommand } from '../../src/application/dtos/project-dto.js';
import type { CreateWorkflowRequest } from '../../src/application/dtos/workflow-dto.js';
import type { IssueRepository } from '../../src/domain/repositories/issue-repository.js';
import type { ProjectRepository } from '../../src/domain/repositories/project-repository.js';
import type { UnitOfWork } from '../../src/domain/repositories/session-repository.js';
import type { WorkflowRepository } from '../../src/domain/repositories/workflow-repository.js';

/**
 * Real infrastructure setup for integration tests
 * Uses actual database and repository implementations with controlled environment
 */
export class RealIntegrationInfrastructure {
  private db: Database.Database;
  private unitOfWork: UnitOfWork;
  private timeProvider: MockTimeProvider;
  private projectRepository: ProjectRepository;
  private issueRepository: IssueRepository;
  private workflowRepository: WorkflowRepository;

  constructor() {
    // Fresh in-memory database per test instance - complete isolation
    this.db = new Database(':memory:');
    this.setupDatabase();
    
    // Real repositories with controlled time provider
    this.timeProvider = new MockTimeProvider();
    this.timeProvider.setTime('2024-01-01T00:00:00Z');
    
    this.unitOfWork = new SqliteUnitOfWork(this.db);
    this.projectRepository = new SqliteProjectRepository(this.db, this.timeProvider);
    this.issueRepository = new SqliteIssueRepository(this.db, this.timeProvider);
    this.workflowRepository = new SqliteWorkflowRepository(this.db, this.timeProvider);
  }

  /**
   * Create application services with real infrastructure
   */
  createApplicationServices(): ApplicationServices {
    return {
      projectService: new ProjectApplicationService(
        this.projectRepository,
        this.unitOfWork,
        this.timeProvider
      ),
      issueService: new IssueApplicationService(
        this.issueRepository,
        this.projectRepository,
        this.unitOfWork,
        this.timeProvider
      ),
      workflowService: new WorkflowApplicationService(
        this.workflowRepository,
        this.projectRepository,
        this.unitOfWork,
        this.timeProvider
      )
    };
  }

  /**
   * Get direct access to repositories for verification
   */
  getRepositories(): Repositories {
    return {
      projectRepository: this.projectRepository,
      issueRepository: this.issueRepository,
      workflowRepository: this.workflowRepository,
      unitOfWork: this.unitOfWork
    };
  }

  /**
   * Get time provider for test control
   */
  getTimeProvider(): MockTimeProvider {
    return this.timeProvider;
  }

  /**
   * Get database instance for advanced queries
   */
  getDatabase(): Database.Database {
    return this.db;
  }

  /**
   * Clean shutdown - prevents resource leaks
   */
  cleanup(): void {
    this.db.close();
  }

  /**
   * Reset all data while keeping connections
   */
  reset(): void {
    // Clear all tables in correct order (respecting foreign keys)
    this.db.exec(`
      DELETE FROM workflow_transitions;
      DELETE FROM workflows;
      DELETE FROM issue_dependencies;
      DELETE FROM project_issues;
      DELETE FROM issues;
      DELETE FROM projects;
    `);
    
    // Reset time provider
    this.timeProvider.setTime('2024-01-01T00:00:00Z');
  }

  /**
   * Setup database schema
   */
  private setupDatabase(): void {
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Create tables with proper foreign key constraints
    this.db.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE issues (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        parent_id TEXT NULL,
        estimate INTEGER NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES issues(id) ON DELETE CASCADE
      );

      CREATE TABLE project_issues (
        project_id TEXT NOT NULL,
        issue_id TEXT NOT NULL,
        added_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (project_id, issue_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
      );

      CREATE TABLE issue_dependencies (
        dependent_id TEXT NOT NULL,
        dependency_id TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (dependent_id, dependency_id),
        FOREIGN KEY (dependent_id) REFERENCES issues(id) ON DELETE CASCADE,
        FOREIGN KEY (dependency_id) REFERENCES issues(id) ON DELETE CASCADE
      );

      CREATE TABLE workflows (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        current_stage TEXT NOT NULL,
        stages TEXT NOT NULL,
        transitions TEXT NOT NULL,
        is_complete INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE workflow_transitions (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        from_stage TEXT NOT NULL,
        to_stage TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        context TEXT NOT NULL,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_issues_project_id ON issues(project_id);
      CREATE INDEX idx_issues_parent_id ON issues(parent_id);
      CREATE INDEX idx_project_issues_project_id ON project_issues(project_id);
      CREATE INDEX idx_project_issues_issue_id ON project_issues(issue_id);
      CREATE INDEX idx_issue_dependencies_dependent_id ON issue_dependencies(dependent_id);
      CREATE INDEX idx_issue_dependencies_dependency_id ON issue_dependencies(dependency_id);
      CREATE INDEX idx_workflows_project_id ON workflows(project_id);
      CREATE INDEX idx_workflow_transitions_workflow_id ON workflow_transitions(workflow_id);
    `);
  }
}

/**
 * Application services interface
 */
export interface ApplicationServices {
  projectService: ProjectApplicationService;
  issueService: IssueApplicationService;
  workflowService: WorkflowApplicationService;
}

/**
 * Repository interfaces  
 */
export interface Repositories {
  projectRepository: ProjectRepository;
  issueRepository: IssueRepository;
  workflowRepository: WorkflowRepository;
  unitOfWork: UnitOfWork;
}

/**
 * Test data builders for consistent test data creation
 */
export class TestDataBuilder {
  /**
   * Create project command with sensible defaults
   */
  static project(overrides: Partial<CreateProjectCommand> = {}): CreateProjectCommand {
    return {
      name: 'Integration Test Project',
      description: 'A project created for integration testing',
      ...overrides
    };
  }

  /**
   * Create issue command with sensible defaults
   */
  static issue(projectId: string, overrides: Partial<CreateIssueCommand> = {}): CreateIssueCommand {
    return {
      title: 'Integration Test Issue',
      description: 'An issue created for integration testing',
      type: 'Story',
      projectId,
      ...overrides
    };
  }

  /**
   * Create workflow request with sensible defaults
   */
  static workflow(projectId: string, overrides: Partial<CreateWorkflowRequest> = {}): CreateWorkflowRequest {
    return {
      projectId,
      name: 'Integration Test Workflow',
      description: 'A workflow created for integration testing',
      ...overrides
    };
  }

  /**
   * Create epic-story-subtask hierarchy for testing
   */
  static issueHierarchy(projectId: string): {
    epic: CreateIssueCommand;
    story: (epicId: string) => CreateIssueCommand;
    subtask: (storyId: string) => CreateIssueCommand;
  } {
    return {
      epic: {
        title: 'Epic: User Authentication',
        description: 'Complete user authentication system',
        type: 'Epic',
        projectId
      },
      story: (epicId: string) => ({
        title: 'Story: Login Functionality',
        description: 'Implement user login with validation',
        type: 'Story',
        projectId,
        parentId: epicId
      }),
      subtask: (storyId: string) => ({
        title: 'Subtask: Password Validation',
        description: 'Implement password strength validation',
        type: 'Subtask',
        projectId,
        parentId: storyId,
        estimate: 3
      })
    };
  }
}

/**
 * Performance monitoring utility for integration tests
 */
export class PerformanceMonitor {
  /**
   * Measure operation duration and warn if slow
   */
  static async measureOperation<T>(
    name: string, 
    operation: () => Promise<T>,
    warningThreshold = 100
  ): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await operation();
    const duration = Date.now() - start;
    
    if (duration > warningThreshold) {
      console.warn(`⚠️  Slow operation detected: ${name} took ${duration.toFixed(2)}ms (threshold: ${warningThreshold}ms)`);
    }
    
    return { result, duration };
  }

  /**
   * Assert operation completes within time limit
   */
  static async assertPerformance<T>(
    name: string,
    operation: () => Promise<T>,
    maxDuration: number
  ): Promise<T> {
    const { result, duration } = await this.measureOperation(name, operation, maxDuration);
    
    if (duration > maxDuration) {
      throw new Error(`Performance assertion failed: ${name} took ${duration.toFixed(2)}ms, expected < ${maxDuration}ms`);
    }
    
    return result;
  }
}

/**
 * Database verification utilities
 */
export class DatabaseVerification {
  constructor(private db: Database.Database) {}

  /**
   * Verify referential integrity constraints
   */
  verifyForeignKeyConstraints(): void {
    const result = this.db.pragma('foreign_key_check') as unknown[];

    if (result.length > 0) {
      throw new Error(`Foreign key constraint violations: ${JSON.stringify(result)}`);
    }
  }

  /**
   * Get actual record counts for verification
   */
  getRecordCounts(): { projects: number; issues: number; workflows: number; transitions: number; projectIssues: number } {
    const projectCount = this.db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
    const issueCount = this.db.prepare('SELECT COUNT(*) as count FROM issues').get() as { count: number };
    const workflowCount = this.db.prepare('SELECT COUNT(*) as count FROM workflows').get() as { count: number };
    const transitionCount = this.db.prepare('SELECT COUNT(*) as count FROM workflow_transitions').get() as { count: number };
    const projectIssueCount = this.db.prepare('SELECT COUNT(*) as count FROM project_issues').get() as { count: number };

    return {
      projects: projectCount.count,
      issues: issueCount.count,
      workflows: workflowCount.count,
      transitions: transitionCount.count,
      projectIssues: projectIssueCount.count
    };
  }

  /**
   * Verify project-issue relationships
   */
  verifyProjectIssueRelationships(projectId: string): { 
    totalIssues: number; 
    epics: number; 
    stories: number; 
    subtasks: number; 
  } {
    const query = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN type = 'Epic' THEN 1 ELSE 0 END) as epics,
        SUM(CASE WHEN type = 'Story' THEN 1 ELSE 0 END) as stories,
        SUM(CASE WHEN type = 'Subtask' THEN 1 ELSE 0 END) as subtasks
      FROM issues 
      WHERE project_id = ?
    `);
    
    const result = query.get(projectId) as {
      total: number;
      epics: number;
      stories: number;
      subtasks: number;
    };

    return {
      totalIssues: result.total,
      epics: result.epics || 0,
      stories: result.stories || 0,
      subtasks: result.subtasks || 0
    };
  }
}