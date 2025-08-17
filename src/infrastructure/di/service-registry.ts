/**
 * Service Registry for Dependency Injection
 * Centralizes service registration and configuration
 */

import Database from 'better-sqlite3';

import { DIContainer } from './container.js';
import { ProjectApplicationService } from '../../application/services/project-application-service.js';
import { IssueApplicationService } from '../../application/services/issue-application-service.js';
import { WorkflowApplicationService } from '../../application/services/workflow-application-service.js';
import { SqliteProjectRepository } from '../database/repositories/sqlite-project-repository.js';
import { SqliteIssueRepository } from '../database/repositories/sqlite-issue-repository.js';
import { SqliteWorkflowRepository } from '../database/repositories/sqlite-workflow-repository.js';
import { SqliteUnitOfWork } from '../database/sqlite-unit-of-work.js';
import { RealTimeProvider, MockTimeProvider } from '../../domain/interfaces/time-provider.js';

import type { ServiceFactory, ServiceLifecycle } from './types.js';
import type { TimeProvider } from '../../domain/interfaces/time-provider.js';

/**
 * Service registry configuration
 */
export interface ServiceRegistryConfig {
  /**
   * Path to SQLite database file
   */
  databasePath?: string;
  
  /**
   * Use test time provider (MockTimeProvider)
   */
  useTestTimeProvider?: boolean;
  
  /**
   * Enable debug logging
   */
  enableLogging?: boolean;
}

/**
 * Service tokens for type-safe resolution
 */
export const SERVICE_TOKENS = {
  // Infrastructure
  DATABASE: 'Database',
  TIME_PROVIDER: 'TimeProvider',
  UNIT_OF_WORK: 'UnitOfWork',
  
  // Repositories
  PROJECT_REPOSITORY: 'ProjectRepository',
  ISSUE_REPOSITORY: 'IssueRepository',
  WORKFLOW_REPOSITORY: 'WorkflowRepository',
  
  // Application Services
  PROJECT_SERVICE: 'ProjectApplicationService',
  ISSUE_SERVICE: 'IssueApplicationService',
  WORKFLOW_SERVICE: 'WorkflowApplicationService'
} as const;

/**
 * Service Registry
 * Manages registration of all application services
 */
export class ServiceRegistry {
  /**
   * Static tokens for external use
   */
  static readonly TOKENS = SERVICE_TOKENS;

  private container: DIContainer;
  private config: Required<ServiceRegistryConfig>;
  private infrastructureRegistered = false;
  private repositoriesRegistered = false;
  private applicationServicesRegistered = false;

  constructor(container: DIContainer, config: ServiceRegistryConfig = {}) {
    this.container = container;
    this.config = this.validateAndMergeConfig(config);
  }

  /**
   * Register all services in correct order
   */
  registerAll(): void {
    this.registerInfrastructure();
    this.registerRepositories();
    this.registerApplicationServices();
  }

  /**
   * Register infrastructure services (Database, TimeProvider, UnitOfWork)
   */
  registerInfrastructure(): void {
    if (this.infrastructureRegistered) {
      return; // Already registered
    }

    // Database
    this.container.register<Database.Database>(
      SERVICE_TOKENS.DATABASE,
      () => {
        const db = new Database(this.config.databasePath);
        this.setupDatabase(db);
        return db;
      },
      'singleton'
    );

    // Time Provider
    this.container.register<TimeProvider>(
      SERVICE_TOKENS.TIME_PROVIDER,
      () => {
        if (this.config.useTestTimeProvider) {
          const mockProvider = new MockTimeProvider();
          mockProvider.setTime('2024-01-01T00:00:00Z');
          return mockProvider;
        }
        return new RealTimeProvider();
      },
      'singleton'
    );

    // Unit of Work
    this.container.register(
      SERVICE_TOKENS.UNIT_OF_WORK,
      (c) => {
        const db = c.resolve<Database.Database>(SERVICE_TOKENS.DATABASE);
        return new SqliteUnitOfWork(db);
      },
      'singleton'
    );

    this.infrastructureRegistered = true;
  }

  /**
   * Register repository services
   */
  registerRepositories(): void {
    if (!this.infrastructureRegistered) {
      throw new Error('Infrastructure services must be registered before repositories');
    }

    if (this.repositoriesRegistered) {
      return; // Already registered
    }

    // Project Repository
    this.container.register(
      SERVICE_TOKENS.PROJECT_REPOSITORY,
      (c) => {
        const db = c.resolve<Database.Database>(SERVICE_TOKENS.DATABASE);
        const timeProvider = c.resolve<TimeProvider>(SERVICE_TOKENS.TIME_PROVIDER);
        return new SqliteProjectRepository(db, timeProvider);
      },
      'singleton'
    );

    // Issue Repository
    this.container.register(
      SERVICE_TOKENS.ISSUE_REPOSITORY,
      (c) => {
        const db = c.resolve<Database.Database>(SERVICE_TOKENS.DATABASE);
        const timeProvider = c.resolve<TimeProvider>(SERVICE_TOKENS.TIME_PROVIDER);
        return new SqliteIssueRepository(db, timeProvider);
      },
      'singleton'
    );

    // Workflow Repository
    this.container.register(
      SERVICE_TOKENS.WORKFLOW_REPOSITORY,
      (c) => {
        const db = c.resolve<Database.Database>(SERVICE_TOKENS.DATABASE);
        const timeProvider = c.resolve<TimeProvider>(SERVICE_TOKENS.TIME_PROVIDER);
        return new SqliteWorkflowRepository(db, timeProvider);
      },
      'singleton'
    );

    this.repositoriesRegistered = true;
  }

  /**
   * Register application services
   */
  registerApplicationServices(): void {
    if (!this.repositoriesRegistered) {
      throw new Error('Repository services must be registered before application services');
    }

    if (this.applicationServicesRegistered) {
      return; // Already registered
    }

    // Project Application Service
    this.container.register(
      SERVICE_TOKENS.PROJECT_SERVICE,
      (c) => {
        const projectRepository = c.resolve<SqliteProjectRepository>(SERVICE_TOKENS.PROJECT_REPOSITORY);
        const unitOfWork = c.resolve<SqliteUnitOfWork>(SERVICE_TOKENS.UNIT_OF_WORK);
        const timeProvider = c.resolve<TimeProvider>(SERVICE_TOKENS.TIME_PROVIDER);
        return new ProjectApplicationService(projectRepository, unitOfWork, timeProvider);
      },
      'singleton'
    );

    // Issue Application Service
    this.container.register(
      SERVICE_TOKENS.ISSUE_SERVICE,
      (c) => {
        const issueRepository = c.resolve<SqliteIssueRepository>(SERVICE_TOKENS.ISSUE_REPOSITORY);
        const projectRepository = c.resolve<SqliteProjectRepository>(SERVICE_TOKENS.PROJECT_REPOSITORY);
        const unitOfWork = c.resolve<SqliteUnitOfWork>(SERVICE_TOKENS.UNIT_OF_WORK);
        const timeProvider = c.resolve<TimeProvider>(SERVICE_TOKENS.TIME_PROVIDER);
        return new IssueApplicationService(issueRepository, projectRepository, unitOfWork, timeProvider);
      },
      'singleton'
    );

    // Workflow Application Service
    this.container.register(
      SERVICE_TOKENS.WORKFLOW_SERVICE,
      (c) => {
        const workflowRepository = c.resolve<SqliteWorkflowRepository>(SERVICE_TOKENS.WORKFLOW_REPOSITORY);
        const projectRepository = c.resolve<SqliteProjectRepository>(SERVICE_TOKENS.PROJECT_REPOSITORY);
        const unitOfWork = c.resolve<SqliteUnitOfWork>(SERVICE_TOKENS.UNIT_OF_WORK);
        const timeProvider = c.resolve<TimeProvider>(SERVICE_TOKENS.TIME_PROVIDER);
        return new WorkflowApplicationService(workflowRepository, projectRepository, unitOfWork, timeProvider);
      },
      'singleton'
    );

    this.applicationServicesRegistered = true;
  }

  /**
   * Register a custom service
   */
  register<T = any>(
    token: string,
    factory: ServiceFactory<T>,
    lifecycle: ServiceLifecycle
  ): void {
    this.container.register(token, factory, lifecycle);
  }

  /**
   * Get infrastructure service tokens
   */
  getInfrastructureTokens(): string[] {
    return [
      SERVICE_TOKENS.DATABASE,
      SERVICE_TOKENS.TIME_PROVIDER,
      SERVICE_TOKENS.UNIT_OF_WORK
    ];
  }

  /**
   * Get repository service tokens
   */
  getRepositoryTokens(): string[] {
    return [
      SERVICE_TOKENS.PROJECT_REPOSITORY,
      SERVICE_TOKENS.ISSUE_REPOSITORY,
      SERVICE_TOKENS.WORKFLOW_REPOSITORY
    ];
  }

  /**
   * Get application service tokens
   */
  getApplicationServiceTokens(): string[] {
    return [
      SERVICE_TOKENS.PROJECT_SERVICE,
      SERVICE_TOKENS.ISSUE_SERVICE,
      SERVICE_TOKENS.WORKFLOW_SERVICE
    ];
  }

  /**
   * Check if all services are registered
   */
  areAllServicesRegistered(): boolean {
    return this.infrastructureRegistered &&
           this.repositoriesRegistered &&
           this.applicationServicesRegistered;
  }

  /**
   * Validate and merge configuration with defaults
   */
  private validateAndMergeConfig(config: ServiceRegistryConfig): Required<ServiceRegistryConfig> {
    const merged = {
      databasePath: config.databasePath ?? ':memory:',
      useTestTimeProvider: config.useTestTimeProvider ?? false,
      enableLogging: config.enableLogging ?? false
    };

    // Validate
    if (merged.databasePath === '') {
      throw new Error('Invalid configuration: databasePath cannot be empty');
    }

    return merged;
  }

  /**
   * Setup database with required tables
   */
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