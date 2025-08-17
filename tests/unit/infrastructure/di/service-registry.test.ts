import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { DIContainer } from '../../../../src/infrastructure/di/container.js';
import { ServiceRegistry } from '../../../../src/infrastructure/di/service-registry.js';

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
    registry = new ServiceRegistry(container);
  });

  afterEach(() => {
    container.dispose();
  });

  describe('Service Registration Patterns', () => {
    it('should register infrastructure services', () => {
      registry.registerInfrastructure();
      
      expect(container.has('Database')).toBe(true);
      expect(container.has('TimeProvider')).toBe(true);
      expect(container.has('UnitOfWork')).toBe(true);
    });

    it('should register repository services', () => {
      registry.registerInfrastructure(); // Required for dependencies
      registry.registerRepositories();
      
      expect(container.has('ProjectRepository')).toBe(true);
      expect(container.has('IssueRepository')).toBe(true);
      expect(container.has('WorkflowRepository')).toBe(true);
    });

    it('should register application services', () => {
      registry.registerInfrastructure();
      registry.registerRepositories();
      registry.registerApplicationServices();
      
      expect(container.has('ProjectApplicationService')).toBe(true);
      expect(container.has('IssueApplicationService')).toBe(true);
      expect(container.has('WorkflowApplicationService')).toBe(true);
    });

    it('should register all services with registerAll', () => {
      registry.registerAll();
      
      // Infrastructure
      expect(container.has('Database')).toBe(true);
      expect(container.has('TimeProvider')).toBe(true);
      expect(container.has('UnitOfWork')).toBe(true);
      
      // Repositories
      expect(container.has('ProjectRepository')).toBe(true);
      expect(container.has('IssueRepository')).toBe(true);
      expect(container.has('WorkflowRepository')).toBe(true);
      
      // Application Services
      expect(container.has('ProjectApplicationService')).toBe(true);
      expect(container.has('IssueApplicationService')).toBe(true);
      expect(container.has('WorkflowApplicationService')).toBe(true);
    });
  });

  describe('Service Resolution', () => {
    it('should resolve database with configuration', () => {
      const freshContainer = new DIContainer();
      const config = { databasePath: ':memory:' };
      const freshRegistry = new ServiceRegistry(freshContainer, config);

      freshRegistry.registerInfrastructure();
      
      const db = freshContainer.resolve('Database');

      expect(db).toBeDefined();
      expect(db).toHaveProperty('open', true);
    });

    it('should resolve repositories with dependencies', () => {
      registry.registerAll();
      
      const projectRepo = container.resolve('ProjectRepository');

      expect(projectRepo).toBeDefined();
      expect(projectRepo).toHaveProperty('save');
      expect(projectRepo).toHaveProperty('findById');
    });

    it('should resolve application services with all dependencies', () => {
      registry.registerAll();
      
      const projectService = container.resolve('ProjectApplicationService');

      expect(projectService).toBeDefined();
      expect(projectService).toHaveProperty('createProject');
      expect(projectService).toHaveProperty('updateProject');
    });
  });

  describe('Configuration Options', () => {
    it('should use test configuration when specified', () => {
      const freshContainer = new DIContainer();
      const testConfig = {
        databasePath: ':memory:',
        useTestTimeProvider: true
      };
      
      const freshRegistry = new ServiceRegistry(freshContainer, testConfig);

      freshRegistry.registerAll();
      
      const timeProvider = freshContainer.resolve<any>('TimeProvider');

      expect(timeProvider).toHaveProperty('setTime'); // Mock time provider has setTime
    });

    it('should use production configuration by default', () => {
      const freshContainer = new DIContainer();
      const prodConfig = {
        databasePath: './data/jcvd.db',
        useTestTimeProvider: false
      };
      
      const freshRegistry = new ServiceRegistry(freshContainer, prodConfig);

      freshRegistry.registerAll();
      
      const timeProvider = freshContainer.resolve<any>('TimeProvider');

      expect(timeProvider).not.toHaveProperty('setTime'); // Real time provider doesn't have setTime
    });

    it('should allow custom service registration', () => {
      registry.register('CustomService', () => ({ custom: true }), 'singleton');
      
      expect(container.has('CustomService')).toBe(true);
      const service = container.resolve<{ custom: boolean }>('CustomService');

      expect(service.custom).toBe(true);
    });
  });

  describe('Service Tokens', () => {
    it('should export service tokens as constants', () => {
      expect(ServiceRegistry.TOKENS.DATABASE).toBe('Database');
      expect(ServiceRegistry.TOKENS.TIME_PROVIDER).toBe('TimeProvider');
      expect(ServiceRegistry.TOKENS.UNIT_OF_WORK).toBe('UnitOfWork');
      expect(ServiceRegistry.TOKENS.PROJECT_REPOSITORY).toBe('ProjectRepository');
      expect(ServiceRegistry.TOKENS.ISSUE_REPOSITORY).toBe('IssueRepository');
      expect(ServiceRegistry.TOKENS.WORKFLOW_REPOSITORY).toBe('WorkflowRepository');
      expect(ServiceRegistry.TOKENS.PROJECT_SERVICE).toBe('ProjectApplicationService');
      expect(ServiceRegistry.TOKENS.ISSUE_SERVICE).toBe('IssueApplicationService');
      expect(ServiceRegistry.TOKENS.WORKFLOW_SERVICE).toBe('WorkflowApplicationService');
    });

    it('should use tokens for registration', () => {
      registry.registerAll();
      
      expect(container.has(ServiceRegistry.TOKENS.DATABASE)).toBe(true);
      expect(container.has(ServiceRegistry.TOKENS.PROJECT_SERVICE)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw when registering repositories without infrastructure', () => {
      const freshRegistry = new ServiceRegistry(new DIContainer());

      expect(() => { freshRegistry.registerRepositories(); })
        .toThrow('Infrastructure services must be registered before repositories');
    });

    it('should throw when registering application services without repositories', () => {
      const freshContainer = new DIContainer();
      const freshRegistry = new ServiceRegistry(freshContainer);

      freshRegistry.registerInfrastructure();
      
      expect(() => { freshRegistry.registerApplicationServices(); })
        .toThrow('Repository services must be registered before application services');
    });

    it('should validate configuration on construction', () => {
      const invalidConfig = {
        databasePath: '', // Invalid empty path
        useTestTimeProvider: false
      };
      
      expect(() => new ServiceRegistry(container, invalidConfig))
        .toThrow('Invalid configuration: databasePath cannot be empty');
    });
  });

  describe('Service Lifecycle Management', () => {
    it('should register database as singleton', () => {
      registry.registerInfrastructure();
      
      const db1 = container.resolve('Database');
      const db2 = container.resolve('Database');
      
      expect(db1).toBe(db2);
    });

    it('should register repositories as singletons', () => {
      registry.registerAll();
      
      const repo1 = container.resolve('ProjectRepository');
      const repo2 = container.resolve('ProjectRepository');
      
      expect(repo1).toBe(repo2);
    });

    it('should register application services as singletons', () => {
      registry.registerAll();
      
      const service1 = container.resolve('ProjectApplicationService');
      const service2 = container.resolve('ProjectApplicationService');
      
      expect(service1).toBe(service2);
    });
  });

  describe('Service Groups', () => {
    it('should get all infrastructure service tokens', () => {
      const tokens = registry.getInfrastructureTokens();
      
      expect(tokens).toContain('Database');
      expect(tokens).toContain('TimeProvider');
      expect(tokens).toContain('UnitOfWork');
      expect(tokens).toHaveLength(3);
    });

    it('should get all repository service tokens', () => {
      const tokens = registry.getRepositoryTokens();
      
      expect(tokens).toContain('ProjectRepository');
      expect(tokens).toContain('IssueRepository');
      expect(tokens).toContain('WorkflowRepository');
      expect(tokens).toHaveLength(3);
    });

    it('should get all application service tokens', () => {
      const tokens = registry.getApplicationServiceTokens();
      
      expect(tokens).toContain('ProjectApplicationService');
      expect(tokens).toContain('IssueApplicationService');
      expect(tokens).toContain('WorkflowApplicationService');
      expect(tokens).toHaveLength(3);
    });

    it('should check if all services are registered', () => {
      expect(registry.areAllServicesRegistered()).toBe(false);
      
      registry.registerAll();
      
      expect(registry.areAllServicesRegistered()).toBe(true);
    });
  });
});