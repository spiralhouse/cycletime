/**
 * Container Factory for creating pre-configured DI containers
 */




import { DIContainer } from './container.js';
import { 
  DatabaseProvider, 
  TimeProvider, 
  RepositoryProvider,
  ApplicationServiceProvider
} from './providers.js';
import { SERVICE_TOKENS } from './service-registry.js';

import type { IServiceContainer } from './types.js';
import type { IssueApplicationService } from '../../application/services/issue-application-service.js';
import type { ProjectApplicationService } from '../../application/services/project-application-service.js';
import type { WorkflowApplicationService } from '../../application/services/workflow-application-service.js';
import type { SqliteIssueRepository } from '../database/repositories/sqlite-issue-repository.js';
import type { SqliteProjectRepository } from '../database/repositories/sqlite-project-repository.js';
import type { SqliteWorkflowRepository } from '../database/repositories/sqlite-workflow-repository.js';

/**
 * Container factory configuration
 */
export interface ContainerFactoryConfig {
  databasePath?: string;
  useMockTime?: boolean;
  initialTime?: string | Date;
  enableLogging?: boolean;
  logger?: (message: string) => void;
}

/**
 * Container Factory
 * Creates pre-configured containers for different environments
 */
export class ContainerFactory {
  /**
   * Create a container with custom configuration
   */
  static createContainer(config: ContainerFactoryConfig = {}): DIContainer {
    const mergedConfig = {
      ...this.getDefaultConfig(),
      ...config
    };

    const container = new DIContainer({
      enableLogging: mergedConfig.enableLogging,
      logger: mergedConfig.logger
    });

    const providers = [
      new DatabaseProvider(mergedConfig.databasePath!),
      new TimeProvider({ 
        useMock: mergedConfig.useMockTime,
        initialTime: mergedConfig.initialTime
      }),
      new RepositoryProvider(),
      new ApplicationServiceProvider()
    ];

    for (const provider of providers) {
      provider.register(container);
    }

    return container;
  }

  /**
   * Create a container optimized for testing
   */
  static createTestContainer(config: Partial<ContainerFactoryConfig> = {}): DIContainer {
    const testConfig = {
      ...this.getTestConfig(),
      ...config
    };

    return this.createContainer(testConfig);
  }

  /**
   * Create a container for production use
   */
  static createProductionContainer(
    databasePath?: string,
    config: Partial<ContainerFactoryConfig> = {}
  ): DIContainer {
    if (!databasePath) {
      throw new Error('Database path is required for production');
    }

    const prodConfig = {
      ...this.getProductionConfig(databasePath),
      ...config
    };

    return this.createContainer(prodConfig);
  }

  /**
   * Create a scoped container from a parent
   */
  static createScopedContainer(parent: IServiceContainer): IServiceContainer {
    return parent.createScope();
  }

  /**
   * Create a minimal container with only infrastructure services
   */
  static createMinimalContainer(): DIContainer {
    const container = new DIContainer();

    const providers = [
      new DatabaseProvider(':memory:'),
      new TimeProvider({ useMock: true })
    ];

    for (const provider of providers) {
      provider.register(container);
    }

    // Manually register UnitOfWork
    container.register(
      SERVICE_TOKENS.UNIT_OF_WORK,
      (c) => {
        const { SqliteUnitOfWork } = require('../database/sqlite-unit-of-work.js');
        const db = c.resolve(SERVICE_TOKENS.DATABASE);

        return new SqliteUnitOfWork(db);
      },
      'singleton'
    );

    return container;
  }

  /**
   * Create a container with repositories but no application services
   */
  static createRepositoryContainer(): DIContainer {
    const container = new DIContainer();

    const providers = [
      new DatabaseProvider(':memory:'),
      new TimeProvider({ useMock: true }),
      new RepositoryProvider()
    ];

    for (const provider of providers) {
      provider.register(container);
    }

    return container;
  }

  /**
   * Get default configuration
   */
  static getDefaultConfig(): Required<ContainerFactoryConfig> {
    return {
      databasePath: ':memory:',
      useMockTime: false,
      initialTime: new Date(),
      enableLogging: false,
      logger: (message: string) => { console.log(message); }
    };
  }

  /**
   * Get test configuration
   */
  static getTestConfig(): Required<ContainerFactoryConfig> {
    return {
      databasePath: ':memory:',
      useMockTime: true,
      initialTime: '2024-01-01T00:00:00Z',
      enableLogging: false,
      logger: (message: string) => { console.log(message); }
    };
  }

  /**
   * Get production configuration
   */
  static getProductionConfig(databasePath: string): Required<ContainerFactoryConfig> {
    return {
      databasePath,
      useMockTime: false,
      initialTime: new Date(),
      enableLogging: false,
      logger: (message: string) => { console.log(message); }
    };
  }

  /**
   * Validate configuration
   */
  static validateConfig(config: Partial<ContainerFactoryConfig>): void {
    if (config.databasePath !== undefined && config.databasePath === '') {
      throw new Error('Invalid configuration: databasePath cannot be empty');
    }

    if (config.useMockTime && config.initialTime) {
      const date = typeof config.initialTime === 'string' 
        ? new Date(config.initialTime)
        : config.initialTime;
      
      if (Number.isNaN(date.getTime())) {
        throw new Error('Invalid configuration: initialTime must be a valid date');
      }
    }
  }

  /**
   * Typed service resolution helpers
   */
  static resolveProjectService(container: IServiceContainer): ProjectApplicationService {
    return container.resolve<ProjectApplicationService>(SERVICE_TOKENS.PROJECT_SERVICE);
  }

  static resolveIssueService(container: IServiceContainer): IssueApplicationService {
    return container.resolve<IssueApplicationService>(SERVICE_TOKENS.ISSUE_SERVICE);
  }

  static resolveWorkflowService(container: IServiceContainer): WorkflowApplicationService {
    return container.resolve<WorkflowApplicationService>(SERVICE_TOKENS.WORKFLOW_SERVICE);
  }

  static resolveProjectRepository(container: IServiceContainer): SqliteProjectRepository {
    return container.resolve<SqliteProjectRepository>(SERVICE_TOKENS.PROJECT_REPOSITORY);
  }

  static resolveIssueRepository(container: IServiceContainer): SqliteIssueRepository {
    return container.resolve<SqliteIssueRepository>(SERVICE_TOKENS.ISSUE_REPOSITORY);
  }

  static resolveWorkflowRepository(container: IServiceContainer): SqliteWorkflowRepository {
    return container.resolve<SqliteWorkflowRepository>(SERVICE_TOKENS.WORKFLOW_REPOSITORY);
  }

  /**
   * Container lifecycle management
   */
  static disposeContainer(container: IServiceContainer): void {
    container.dispose();
  }

  static resetContainer(container: IServiceContainer): void {
    container.dispose();
    // Container will create new instances on next resolve
  }
}