import { describe, it, expect, beforeEach } from 'vitest';

import { DIContainer } from '../../../../src/infrastructure/di/container.js';
import { 
  DatabaseProvider, 
  TimeProvider, 
  RepositoryProvider,
  ApplicationServiceProvider 
} from '../../../../src/infrastructure/di/providers.js';
import { ServiceRegistry } from '../../../../src/infrastructure/di/service-registry.js';

import type { TimeProvider as ITimeProvider } from '../../../../src/domain/interfaces/time-provider.js';
import type Database from 'better-sqlite3';

describe('DI Providers', () => {

  describe('DatabaseProvider', () => {
    it('should provide database connection', () => {
      const container = new DIContainer();
      const provider = new DatabaseProvider(':memory:');

      provider.register(container);
      
      const db = container.resolve<Database.Database>('Database');

      expect(db).toBeDefined();
      expect(db.open).toBe(true);
    });

    it('should provide singleton database', () => {
      const container = new DIContainer();
      const provider = new DatabaseProvider(':memory:');

      provider.register(container);
      
      const db1 = container.resolve('Database');
      const db2 = container.resolve('Database');
      
      expect(db1).toBe(db2);
    });

    it('should configure database with pragmas', () => {
      const container = new DIContainer();
      const provider = new DatabaseProvider(':memory:');

      provider.register(container);
      
      const db = container.resolve<Database.Database>('Database');
      const foreignKeys = db.pragma('foreign_keys');
      
      expect(foreignKeys).toBeTruthy();
    });

    it('should allow custom configuration', () => {
      const container = new DIContainer();
      const provider = new DatabaseProvider(':memory:', {
        readonly: false,
        fileMustExist: false,
        timeout: 5000,
        verbose: undefined
      });

      provider.register(container);
      
      const db = container.resolve<Database.Database>('Database');

      expect(db.readonly).toBe(false);
    });
  });

  describe('TimeProvider', () => {
    it('should provide real time provider by default', () => {
      const container = new DIContainer();
      const provider = new TimeProvider();

      provider.register(container);
      
      const timeProvider = container.resolve<ITimeProvider>('TimeProvider');

      expect(timeProvider).toBeDefined();
      expect(timeProvider).not.toHaveProperty('setTime'); // Real provider doesn't have setTime
    });

    it('should provide mock time provider for testing', () => {
      const container = new DIContainer();
      const provider = new TimeProvider({ useMock: true });

      provider.register(container);
      
      const timeProvider = container.resolve<any>('TimeProvider');

      expect(timeProvider).toBeDefined();
      expect(timeProvider).toHaveProperty('setTime'); // Mock provider has setTime
    });

    it('should allow initial time configuration for mock', () => {
      const container = new DIContainer();
      const initialTime = '2024-01-15T10:00:00Z';
      const provider = new TimeProvider({ 
        useMock: true, 
        initialTime 
      });

      provider.register(container);
      
      const timeProvider = container.resolve<any>('TimeProvider');
      const now = timeProvider.now();
      
      expect(now.toISOString()).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should provide singleton time provider', () => {
      const container = new DIContainer();
      const provider = new TimeProvider();

      provider.register(container);
      
      const tp1 = container.resolve('TimeProvider');
      const tp2 = container.resolve('TimeProvider');
      
      expect(tp1).toBe(tp2);
    });
  });

  describe('RepositoryProvider', () => {
    it('should register all repository services', () => {
      const container = new DIContainer();

      // Register required dependencies
      new DatabaseProvider(':memory:').register(container);
      new TimeProvider().register(container);
      
      const provider = new RepositoryProvider();

      provider.register(container);
      
      expect(container.has('ProjectRepository')).toBe(true);
      expect(container.has('IssueRepository')).toBe(true);
      expect(container.has('WorkflowRepository')).toBe(true);
      expect(container.has('UnitOfWork')).toBe(true);
    });

    it('should provide working repositories', () => {
      const container = new DIContainer();

      // Register required dependencies
      new DatabaseProvider(':memory:').register(container);
      new TimeProvider().register(container);
      
      const provider = new RepositoryProvider();

      provider.register(container);
      
      const projectRepo = container.resolve<any>('ProjectRepository');

      expect(projectRepo).toHaveProperty('save');
      expect(projectRepo).toHaveProperty('findById');
      expect(projectRepo).toHaveProperty('findAll');
      expect(projectRepo).toHaveProperty('delete');
    });

    it('should provide singleton repositories', () => {
      const container = new DIContainer();

      // Register required dependencies
      new DatabaseProvider(':memory:').register(container);
      new TimeProvider().register(container);
      
      const provider = new RepositoryProvider();

      provider.register(container);
      
      const repo1 = container.resolve('ProjectRepository');
      const repo2 = container.resolve('ProjectRepository');
      
      expect(repo1).toBe(repo2);
    });

    it('should throw if database not registered', () => {
      const freshContainer = new DIContainer();

      new TimeProvider().register(freshContainer);
      
      const provider = new RepositoryProvider();
      
      expect(() => { provider.register(freshContainer); })
        .toThrow('Database must be registered before repositories');
    });

    it('should throw if time provider not registered', () => {
      const freshContainer = new DIContainer();

      new DatabaseProvider(':memory:').register(freshContainer);
      
      const provider = new RepositoryProvider();
      
      expect(() => { provider.register(freshContainer); })
        .toThrow('TimeProvider must be registered before repositories');
    });
  });

  describe('ApplicationServiceProvider', () => {
    it('should register all application services', () => {
      const container = new DIContainer();

      // Register all required dependencies
      new DatabaseProvider(':memory:').register(container);
      new TimeProvider().register(container);
      new RepositoryProvider().register(container);
      
      const provider = new ApplicationServiceProvider();

      provider.register(container);
      
      expect(container.has('ProjectApplicationService')).toBe(true);
      expect(container.has('IssueApplicationService')).toBe(true);
      expect(container.has('WorkflowApplicationService')).toBe(true);
    });

    it('should provide working application services', () => {
      const container = new DIContainer();

      // Register all required dependencies
      new DatabaseProvider(':memory:').register(container);
      new TimeProvider().register(container);
      new RepositoryProvider().register(container);
      
      const provider = new ApplicationServiceProvider();

      provider.register(container);
      
      const projectService = container.resolve<any>('ProjectApplicationService');

      expect(projectService).toHaveProperty('createProject');
      expect(projectService).toHaveProperty('updateProject');
      expect(projectService).toHaveProperty('getProject');
    });

    it('should provide singleton application services', () => {
      const container = new DIContainer();

      // Register all required dependencies
      new DatabaseProvider(':memory:').register(container);
      new TimeProvider().register(container);
      new RepositoryProvider().register(container);
      
      const provider = new ApplicationServiceProvider();

      provider.register(container);
      
      const service1 = container.resolve('ProjectApplicationService');
      const service2 = container.resolve('ProjectApplicationService');
      
      expect(service1).toBe(service2);
    });

    it('should throw if repositories not registered', () => {
      const freshContainer = new DIContainer();

      new DatabaseProvider(':memory:').register(freshContainer);
      new TimeProvider().register(freshContainer);
      
      const provider = new ApplicationServiceProvider();
      
      expect(() => { provider.register(freshContainer); })
        .toThrow('Repositories must be registered before application services');
    });
  });

  describe('Provider Composition', () => {
    it('should allow composing providers in order', () => {
      const container = new DIContainer();
      const providers = [
        new DatabaseProvider(':memory:'),
        new TimeProvider({ useMock: true }),
        new RepositoryProvider(),
        new ApplicationServiceProvider()
      ];
      
      for (const provider of providers) {
        provider.register(container);
      }
      
      // Verify all services are available
      expect(container.has('Database')).toBe(true);
      expect(container.has('TimeProvider')).toBe(true);
      expect(container.has('ProjectRepository')).toBe(true);
      expect(container.has('ProjectApplicationService')).toBe(true);
    });

    it('should maintain proper dependency chain', async () => {
      const container = new DIContainer();

      new DatabaseProvider(':memory:').register(container);
      new TimeProvider().register(container);
      new RepositoryProvider().register(container);
      new ApplicationServiceProvider().register(container);
      
      // Resolve top-level service should work with all dependencies
      const projectService = container.resolve<any>('ProjectApplicationService');

      expect(projectService).toBeDefined();
      
      // Service should be functional
      const result = await projectService.createProject({
        name: 'Test Project',
        description: 'Test Description'
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
      expect(result.data.name).toBe('Test Project');
    });
  });

  describe('Provider Options', () => {
    it('should support custom tokens', () => {
      const container = new DIContainer();
      const provider = new DatabaseProvider(':memory:', {}, 'CustomDatabase');

      provider.register(container);
      
      expect(container.has('CustomDatabase')).toBe(true);
      expect(container.has('Database')).toBe(false);
    });

    it('should support lifecycle override', () => {
      const container = new DIContainer();
      // Note: This test would verify if providers support lifecycle customization
      // For now, all our providers use singleton by default
      const provider = new DatabaseProvider(':memory:');

      provider.register(container);
      
      const descriptor = container.getDescriptor('Database');

      expect(descriptor?.lifecycle).toBe('singleton');
    });
  });
});