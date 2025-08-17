import { describe, it, expect, beforeEach } from 'vitest';

import { ContainerFactory } from '../../../../src/infrastructure/di/container-factory.js';
import { DIContainer } from '../../../../src/infrastructure/di/container.js';

import type { TimeProvider } from '../../../../src/domain/interfaces/time-provider.js';
import type Database from 'better-sqlite3';

describe('ContainerFactory', () => {
  describe('createContainer', () => {
    it('should create a container with default configuration', () => {
      const container = ContainerFactory.createContainer();
      
      expect(container).toBeInstanceOf(DIContainer);
      expect(container.has('Database')).toBe(true);
      expect(container.has('TimeProvider')).toBe(true);
      expect(container.has('ProjectApplicationService')).toBe(true);
    });

    it('should create a container with custom database path', () => {
      const container = ContainerFactory.createContainer({
        databasePath: './test.db'
      });
      
      expect(container.has('Database')).toBe(true);
      // Note: We can't easily test the actual path without resolving the service
    });

    it('should create a container with mock time provider for tests', () => {
      const container = ContainerFactory.createContainer({
        useMockTime: true
      });
      
      const timeProvider = container.resolve<any>('TimeProvider');
      expect(timeProvider).toHaveProperty('setTime'); // Mock has setTime
    });

    it('should create a container with logging enabled', () => {
      const logs: string[] = [];
      const container = ContainerFactory.createContainer({
        enableLogging: true,
        logger: (message) => logs.push(message)
      });
      
      // Resolving a service should log
      container.resolve('Database');
      
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('createTestContainer', () => {
    it('should create a container optimized for testing', () => {
      const container = ContainerFactory.createTestContainer();
      
      expect(container).toBeInstanceOf(DIContainer);
      
      // Should use in-memory database
      const db = container.resolve<Database.Database>('Database');
      expect(db.open).toBe(true);
      
      // Should use mock time provider
      const timeProvider = container.resolve<any>('TimeProvider');
      expect(timeProvider).toHaveProperty('setTime');
    });

    it('should allow custom initial time for tests', () => {
      const initialTime = '2024-06-15T12:00:00Z';
      const container = ContainerFactory.createTestContainer({
        initialTime
      });
      
      const timeProvider = container.resolve<any>('TimeProvider');
      const now = timeProvider.now();
      
      expect(now.toISOString()).toBe('2024-06-15T12:00:00.000Z');
    });

    it('should register all services for testing', () => {
      const container = ContainerFactory.createTestContainer();
      
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

  describe('createProductionContainer', () => {
    it('should create a container for production use', () => {
      const container = ContainerFactory.createProductionContainer(':memory:');
      
      expect(container).toBeInstanceOf(DIContainer);
      
      // Should use real time provider
      const timeProvider = container.resolve<TimeProvider>('TimeProvider');
      expect(timeProvider).not.toHaveProperty('setTime');
    });

    it('should throw if database path not provided', () => {
      expect(() => ContainerFactory.createProductionContainer())
        .toThrow('Database path is required for production');
    });

    it('should disable logging by default in production', () => {
      const logs: string[] = [];
      const container = ContainerFactory.createProductionContainer(':memory:', {
        logger: (message) => logs.push(message)
      });
      
      // Resolving services should not log
      container.resolve('Database');
      
      expect(logs.length).toBe(0);
    });
  });

  describe('createScopedContainer', () => {
    it('should create a scoped container from parent', () => {
      const parent = ContainerFactory.createTestContainer();
      const scoped = ContainerFactory.createScopedContainer(parent);
      
      expect(scoped).toBeInstanceOf(DIContainer);
      
      // Should share singleton services
      const parentDb = parent.resolve('Database');
      const scopedDb = scoped.resolve('Database');
      
      expect(scopedDb).toBe(parentDb);
    });

    it('should isolate scoped services between containers', () => {
      const parent = ContainerFactory.createTestContainer();
      
      // Register a scoped service
      parent.register('ScopedTest', () => ({ id: Math.random() }), 'scoped');
      
      const scope1 = ContainerFactory.createScopedContainer(parent);
      const scope2 = ContainerFactory.createScopedContainer(parent);
      
      const instance1 = scope1.resolve<{ id: number }>('ScopedTest');
      const instance2 = scope2.resolve<{ id: number }>('ScopedTest');
      
      expect(instance1.id).not.toBe(instance2.id);
    });
  });

  describe('Container Presets', () => {
    it('should provide minimal preset for lightweight testing', () => {
      const container = ContainerFactory.createMinimalContainer();
      
      // Only infrastructure services
      expect(container.has('Database')).toBe(true);
      expect(container.has('TimeProvider')).toBe(true);
      expect(container.has('UnitOfWork')).toBe(true);
      
      // No repositories or application services
      expect(container.has('ProjectRepository')).toBe(false);
      expect(container.has('ProjectApplicationService')).toBe(false);
    });

    it('should provide repository preset', () => {
      const container = ContainerFactory.createRepositoryContainer();
      
      // Infrastructure and repositories
      expect(container.has('Database')).toBe(true);
      expect(container.has('ProjectRepository')).toBe(true);
      expect(container.has('IssueRepository')).toBe(true);
      expect(container.has('WorkflowRepository')).toBe(true);
      
      // No application services
      expect(container.has('ProjectApplicationService')).toBe(false);
    });
  });

  describe('Container Configuration', () => {
    it('should merge configurations correctly', () => {
      const defaultConfig = ContainerFactory.getDefaultConfig();
      const testConfig = ContainerFactory.getTestConfig();
      const prodConfig = ContainerFactory.getProductionConfig('./data/jcvd.db');
      
      expect(defaultConfig.databasePath).toBe(':memory:');
      expect(defaultConfig.useMockTime).toBe(false);
      
      expect(testConfig.databasePath).toBe(':memory:');
      expect(testConfig.useMockTime).toBe(true);
      
      expect(prodConfig.databasePath).toBe('./data/jcvd.db');
      expect(prodConfig.useMockTime).toBe(false);
    });

    it('should validate configuration', () => {
      expect(() => ContainerFactory.validateConfig({}))
        .not.toThrow();
      
      expect(() => ContainerFactory.validateConfig({ databasePath: '' }))
        .toThrow('Invalid configuration: databasePath cannot be empty');
      
      expect(() => ContainerFactory.validateConfig({ 
        useMockTime: true,
        initialTime: 'invalid-date' 
      }))
        .toThrow('Invalid configuration: initialTime must be a valid date');
    });
  });

  describe('Service Resolution Helpers', () => {
    it('should provide typed service resolution', () => {
      const container = ContainerFactory.createTestContainer();
      
      const projectService = ContainerFactory.resolveProjectService(container);
      expect(projectService).toHaveProperty('createProject');
      
      const issueService = ContainerFactory.resolveIssueService(container);
      expect(issueService).toHaveProperty('createIssue');
      
      const workflowService = ContainerFactory.resolveWorkflowService(container);
      expect(workflowService).toHaveProperty('createWorkflow');
    });

    it('should provide repository resolution helpers', () => {
      const container = ContainerFactory.createTestContainer();
      
      const projectRepo = ContainerFactory.resolveProjectRepository(container);
      expect(projectRepo).toHaveProperty('save');
      
      const issueRepo = ContainerFactory.resolveIssueRepository(container);
      expect(issueRepo).toHaveProperty('findById');
      
      const workflowRepo = ContainerFactory.resolveWorkflowRepository(container);
      expect(workflowRepo).toHaveProperty('findByProjectId');
    });
  });

  describe('Container Lifecycle', () => {
    it('should properly dispose containers', () => {
      const container = ContainerFactory.createTestContainer();
      
      // Resolve a service to create instance
      container.resolve('Database');
      
      // Dispose should work without errors
      expect(() => ContainerFactory.disposeContainer(container)).not.toThrow();
    });

    it('should support container reset for tests', () => {
      const container = ContainerFactory.createTestContainer();
      
      // Resolve to create singleton
      const db1 = container.resolve('Database');
      
      // Reset container
      ContainerFactory.resetContainer(container);
      
      // Should get new instance after reset
      const db2 = container.resolve('Database');
      
      expect(db2).not.toBe(db1);
    });
  });
});