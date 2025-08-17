/**
 * Service Providers for Dependency Injection
 * Providers encapsulate registration logic for related services
 */

import Database from 'better-sqlite3';

import { DIContainer } from './container.js';
import { SERVICE_TOKENS } from './service-registry.js';
import { ProjectApplicationService } from '../../application/services/project-application-service.js';
import { IssueApplicationService } from '../../application/services/issue-application-service.js';
import { WorkflowApplicationService } from '../../application/services/workflow-application-service.js';
import { SqliteProjectRepository } from '../database/repositories/sqlite-project-repository.js';
import { SqliteIssueRepository } from '../database/repositories/sqlite-issue-repository.js';
import { SqliteWorkflowRepository } from '../database/repositories/sqlite-workflow-repository.js';
import { SqliteUnitOfWork } from '../database/sqlite-unit-of-work.js';
import { RealTimeProvider, MockTimeProvider } from '../../domain/interfaces/time-provider.js';

import type { IServiceContainer, ServiceLifecycle } from './types.js';
import type { TimeProvider as ITimeProvider } from '../../domain/interfaces/time-provider.js';

/**
 * Base provider interface
 */
export interface IServiceProvider {
  /**
   * Register services with the container
   */
  register(container: IServiceContainer): void;
}

/**
 * Database provider configuration
 */
export interface DatabaseProviderConfig {
  readonly?: boolean;
  fileMustExist?: boolean;
  timeout?: number;
  verbose?: ((message?: any, ...additionalArgs: any[]) => void) | undefined;
}

/**
 * Database Provider
 * Registers database connection and configuration
 */
export class DatabaseProvider implements IServiceProvider {
  constructor(
    private databasePath: string,
    private config?: DatabaseProviderConfig,
    private token: string = SERVICE_TOKENS.DATABASE
  ) {}

  register(container: IServiceContainer): void {
    container.register<Database.Database>(
      this.token,
      () => {
        const db = new Database(this.databasePath, this.config);
        this.setupDatabase(db);
        return db;
      },
      'singleton'
    );
  }

  private setupDatabase(db: Database.Database): void {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS issues (
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

      CREATE TABLE IF NOT EXISTS project_issues (
        project_id TEXT NOT NULL,
        issue_id TEXT NOT NULL,
        added_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (project_id, issue_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS workflows (
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

      CREATE TABLE IF NOT EXISTS workflow_transitions (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        from_stage TEXT NOT NULL,
        to_stage TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        context TEXT NOT NULL,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      );
    `);

    // Create indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_issues_project_id ON issues(project_id);
      CREATE INDEX IF NOT EXISTS idx_issues_parent_id ON issues(parent_id);
      CREATE INDEX IF NOT EXISTS idx_project_issues_project_id ON project_issues(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_issues_issue_id ON project_issues(issue_id);
      CREATE INDEX IF NOT EXISTS idx_workflows_project_id ON workflows(project_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_transitions_workflow_id ON workflow_transitions(workflow_id);
    `);
  }
}

/**
 * Time provider configuration
 */
export interface TimeProviderConfig {
  useMock?: boolean;
  initialTime?: string | Date;
}

/**
 * Time Provider
 * Registers time provider (real or mock)
 */
export class TimeProvider implements IServiceProvider {
  constructor(
    private config: TimeProviderConfig = {},
    private token: string = SERVICE_TOKENS.TIME_PROVIDER
  ) {}

  register(container: IServiceContainer): void {
    container.register<ITimeProvider>(
      this.token,
      () => {
        if (this.config.useMock) {
          const mockProvider = new MockTimeProvider();
          if (this.config.initialTime) {
            mockProvider.setTime(this.config.initialTime);
          } else {
            mockProvider.setTime('2024-01-01T00:00:00Z');
          }
          return mockProvider;
        }
        return new RealTimeProvider();
      },
      'singleton'
    );
  }
}

/**
 * Repository Provider
 * Registers all repository services
 */
export class RepositoryProvider implements IServiceProvider {
  register(container: IServiceContainer): void {
    // Validate dependencies
    if (!container.has(SERVICE_TOKENS.DATABASE)) {
      throw new Error('Database must be registered before repositories');
    }
    if (!container.has(SERVICE_TOKENS.TIME_PROVIDER)) {
      throw new Error('TimeProvider must be registered before repositories');
    }

    // Unit of Work
    container.register(
      SERVICE_TOKENS.UNIT_OF_WORK,
      (c) => {
        const db = c.resolve<Database.Database>(SERVICE_TOKENS.DATABASE);
        return new SqliteUnitOfWork(db);
      },
      'singleton'
    );

    // Project Repository
    container.register(
      SERVICE_TOKENS.PROJECT_REPOSITORY,
      (c) => {
        const db = c.resolve<Database.Database>(SERVICE_TOKENS.DATABASE);
        const timeProvider = c.resolve<ITimeProvider>(SERVICE_TOKENS.TIME_PROVIDER);
        return new SqliteProjectRepository(db, timeProvider);
      },
      'singleton'
    );

    // Issue Repository
    container.register(
      SERVICE_TOKENS.ISSUE_REPOSITORY,
      (c) => {
        const db = c.resolve<Database.Database>(SERVICE_TOKENS.DATABASE);
        const timeProvider = c.resolve<ITimeProvider>(SERVICE_TOKENS.TIME_PROVIDER);
        return new SqliteIssueRepository(db, timeProvider);
      },
      'singleton'
    );

    // Workflow Repository
    container.register(
      SERVICE_TOKENS.WORKFLOW_REPOSITORY,
      (c) => {
        const db = c.resolve<Database.Database>(SERVICE_TOKENS.DATABASE);
        const timeProvider = c.resolve<ITimeProvider>(SERVICE_TOKENS.TIME_PROVIDER);
        return new SqliteWorkflowRepository(db, timeProvider);
      },
      'singleton'
    );
  }
}

/**
 * Application Service Provider
 * Registers all application services
 */
export class ApplicationServiceProvider implements IServiceProvider {
  register(container: IServiceContainer): void {
    // Validate dependencies
    if (!container.has(SERVICE_TOKENS.PROJECT_REPOSITORY) ||
        !container.has(SERVICE_TOKENS.ISSUE_REPOSITORY) ||
        !container.has(SERVICE_TOKENS.WORKFLOW_REPOSITORY)) {
      throw new Error('Repositories must be registered before application services');
    }

    // Project Application Service
    container.register(
      SERVICE_TOKENS.PROJECT_SERVICE,
      (c) => {
        const projectRepository = c.resolve<SqliteProjectRepository>(SERVICE_TOKENS.PROJECT_REPOSITORY);
        const unitOfWork = c.resolve<SqliteUnitOfWork>(SERVICE_TOKENS.UNIT_OF_WORK);
        const timeProvider = c.resolve<ITimeProvider>(SERVICE_TOKENS.TIME_PROVIDER);
        return new ProjectApplicationService(projectRepository, unitOfWork, timeProvider);
      },
      'singleton'
    );

    // Issue Application Service
    container.register(
      SERVICE_TOKENS.ISSUE_SERVICE,
      (c) => {
        const issueRepository = c.resolve<SqliteIssueRepository>(SERVICE_TOKENS.ISSUE_REPOSITORY);
        const projectRepository = c.resolve<SqliteProjectRepository>(SERVICE_TOKENS.PROJECT_REPOSITORY);
        const unitOfWork = c.resolve<SqliteUnitOfWork>(SERVICE_TOKENS.UNIT_OF_WORK);
        const timeProvider = c.resolve<ITimeProvider>(SERVICE_TOKENS.TIME_PROVIDER);
        return new IssueApplicationService(issueRepository, projectRepository, unitOfWork, timeProvider);
      },
      'singleton'
    );

    // Workflow Application Service
    container.register(
      SERVICE_TOKENS.WORKFLOW_SERVICE,
      (c) => {
        const workflowRepository = c.resolve<SqliteWorkflowRepository>(SERVICE_TOKENS.WORKFLOW_REPOSITORY);
        const projectRepository = c.resolve<SqliteProjectRepository>(SERVICE_TOKENS.PROJECT_REPOSITORY);
        const unitOfWork = c.resolve<SqliteUnitOfWork>(SERVICE_TOKENS.UNIT_OF_WORK);
        const timeProvider = c.resolve<ITimeProvider>(SERVICE_TOKENS.TIME_PROVIDER);
        return new WorkflowApplicationService(workflowRepository, projectRepository, unitOfWork, timeProvider);
      },
      'singleton'
    );
  }
}

/**
 * Composite Provider
 * Combines multiple providers into one
 */
export class CompositeProvider implements IServiceProvider {
  constructor(private providers: IServiceProvider[]) {}

  register(container: IServiceContainer): void {
    for (const provider of this.providers) {
      provider.register(container);
    }
  }

  /**
   * Create a standard application provider with all services
   */
  static createStandard(databasePath: string = ':memory:', useMockTime: boolean = false): CompositeProvider {
    return new CompositeProvider([
      new DatabaseProvider(databasePath),
      new TimeProvider({ useMock: useMockTime }),
      new RepositoryProvider(),
      new ApplicationServiceProvider()
    ]);
  }
}