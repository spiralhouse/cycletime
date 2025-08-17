import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import main entry point exports
import {
  Application,
  ContainerFactory,
  DIContainer,
  ServiceRegistry,
  DatabaseProvider,
  TimeProvider,
  RepositoryProvider,
  ApplicationServiceProvider,
  createApplication,
  createTestApplication,
  createProductionApplication,
  SERVICE_TOKENS
} from '../../src/index.js';

describe.sequential('Entry Point Integration', () => {
  let app: Application | undefined;
  const testDbPath = resolve('./test-entry.db');

  afterEach(async () => {
    if (app) {
      try {
        await app.shutdown();
      } catch {
        // Ignore cleanup errors
      }
      app = undefined;
    }
    
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('Core Exports', () => {
    it('should export Application class', () => {
      expect(Application).toBeDefined();
      expect(typeof Application).toBe('function');
      
      app = new Application({ databasePath: ':memory:' });
      expect(app).toBeInstanceOf(Application);
    });

    it('should export ContainerFactory', () => {
      expect(ContainerFactory).toBeDefined();
      expect(typeof ContainerFactory.createContainer).toBe('function');
      expect(typeof ContainerFactory.createTestContainer).toBe('function');
      expect(typeof ContainerFactory.createProductionContainer).toBe('function');
    });

    it('should export DIContainer', () => {
      expect(DIContainer).toBeDefined();
      expect(typeof DIContainer).toBe('function');
      
      const container = new DIContainer();

      expect(container).toHaveProperty('register');
      expect(container).toHaveProperty('resolve');
    });

    it('should export ServiceRegistry', () => {
      expect(ServiceRegistry).toBeDefined();
      expect(typeof ServiceRegistry).toBe('function');
    });

    it('should export all providers', () => {
      expect(DatabaseProvider).toBeDefined();
      expect(TimeProvider).toBeDefined();
      expect(RepositoryProvider).toBeDefined();
      expect(ApplicationServiceProvider).toBeDefined();
    });

    it('should export SERVICE_TOKENS', () => {
      expect(SERVICE_TOKENS).toBeDefined();
      expect(SERVICE_TOKENS.DATABASE).toBe('Database');
      expect(SERVICE_TOKENS.TIME_PROVIDER).toBe('TimeProvider');
      expect(SERVICE_TOKENS.PROJECT_SERVICE).toBe('ProjectApplicationService');
    });
  });

  describe('Factory Functions', () => {
    it('should provide createApplication factory', async () => {
      app = createApplication({
        databasePath: ':memory:',
        useMockTime: true
      });
      
      expect(app).toBeInstanceOf(Application);
      await app.initialize();
      expect(app.isInitialized()).toBe(true);
    });

    it('should provide createTestApplication factory', async () => {
      app = await createTestApplication();
      
      expect(app).toBeInstanceOf(Application);
      expect(app.isInitialized()).toBe(true);
      expect(app.getEnvironment()).toBe('test');
    });

    it('should provide createProductionApplication factory', async () => {
      app = await createProductionApplication(':memory:');
      
      expect(app).toBeInstanceOf(Application);
      expect(app.isInitialized()).toBe(true);
      expect(app.getEnvironment()).toBe('production');
    });
  });

  describe('End-to-End Usage', () => {
    it('should support quick test setup', async () => {
      // Simple one-liner for tests
      app = await createTestApplication();
      
      const projectService = app.getProjectService();
      const result = await projectService.createProject({
        name: 'Test Project',
        description: 'Quick test'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test Project');
    });

    it('should support production setup', async () => {
      // Production with configuration
      app = await createProductionApplication(':memory:', {
        enableLogging: false,
        appName: 'JCVD Production',
        version: '1.0.0'
      });
      
      const config = app.getConfiguration();

      expect(config.appName).toBe('JCVD Production');
      expect(config.version).toBe('1.0.0');
      
      const health = await app.getHealthStatus();

      expect(health.status).toBe('healthy');
    });

    it('should support custom container setup', async () => {
      // Advanced: Custom container configuration with initial time
      app = new Application({
        databasePath: ':memory:',
        useMockTime: true,
        initialTime: '2024-01-01T00:00:00Z'
      });
      await app.initialize();
      
      const timeProvider = app.getContainer().resolve<any>('TimeProvider');

      expect(timeProvider.now().toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('Service Integration', () => {
    it('should provide complete service access', async () => {
      app = await createTestApplication();
      expect(app).toBeDefined();
      
      // Create project
      const projectService = app.getProjectService();
      const projectResult = await projectService.createProject({
        name: 'Integration Test',
        description: 'Testing all services'
      });
      
      expect(projectResult.success).toBe(true);
      const project = projectResult.data!;
      
      // Create workflow
      const workflowService = app.getWorkflowService();
      const workflowResult = await workflowService.createWorkflow({
        projectId: project.id,
        name: 'Test Workflow',
        stages: [
          { id: 'start', name: 'Start', dependencies: [] },
          { id: 'end', name: 'End', dependencies: ['start'] }
        ]
      });
      
      expect(workflowResult.success).toBe(true);
      
      // Verify health
      const health = await app.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.database).toBe('connected');
      expect(health.services).toBe('ready');
    });

    it('should support database backup', async () => {
      app = await createTestApplication();
      const backupPath = resolve('./test-backup.db');
      
      try {
        // Create some data
        const projectService = app.getProjectService();

        await projectService.createProject({
          name: 'Backup Test',
          description: 'Data to backup'
        });
        
        // Perform backup
        await app.backupDatabase(backupPath);
        
        expect(existsSync(backupPath)).toBe(true);
      } finally {
        if (existsSync(backupPath)) {
          unlinkSync(backupPath);
        }
      }
    });
  });

  describe('Environment Configuration', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      // Restore environment
      process.env = originalEnv;
    });

    it('should load configuration from environment', () => {
      process.env.JCVD_DATABASE_PATH = './env-test.db';
      process.env.JCVD_USE_MOCK_TIME = 'true';
      process.env.JCVD_ENABLE_LOGGING = 'false';
      process.env.JCVD_APP_NAME = 'Test App';
      process.env.JCVD_VERSION = '2.0.0';
      
      app = Application.fromEnvironment();
      const config = app.getConfiguration();
      
      expect(config.databasePath).toBe('./env-test.db');
      expect(config.useMockTime).toBe(true);
      expect(config.enableLogging).toBe(false);
      expect(config.appName).toBe('Test App');
      expect(config.version).toBe('2.0.0');
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization failures gracefully', async () => {
      app = createApplication({ databasePath: '' });
      
      await expect(app.initialize()).rejects.toThrow('Invalid configuration');
      expect(app.isInitialized()).toBe(false);
    });

    it('should prevent access to services before initialization', () => {
      app = createApplication();
      
      expect(() => app.getProjectService()).toThrow('Application is not initialized');
      expect(() => app.getIssueService()).toThrow('Application is not initialized');
      expect(() => app.getWorkflowService()).toThrow('Application is not initialized');
    });

    it('should support initialization with retry', async () => {
      let attempts = 0;
      
      // Custom app that fails first attempt
      class TestApp extends Application {
        async initialize(): Promise<void> {
          attempts++;
          if (attempts === 1) {
            throw new Error('Temporary failure');
          }

          return super.initialize();
        }
      }
      
      const testApp = new TestApp({ databasePath: ':memory:' });

      await testApp.initializeWithRetry(3, 100);
      
      expect(attempts).toBe(2);
      expect(testApp.isInitialized()).toBe(true);
      
      // Clean up
      await testApp.shutdown();
    });
  });

  describe('Lifecycle Management', () => {
    it('should support restart', async () => {
      app = await createTestApplication();
      
      const container1 = app.getContainer();

      await app.restart();
      const container2 = app.getContainer();
      
      expect(app.isInitialized()).toBe(true);
      expect(container2).not.toBe(container1);
    });

    it('should handle multiple shutdowns gracefully', async () => {
      app = await createTestApplication();
      
      await app.shutdown();
      expect(app.isInitialized()).toBe(false);
      
      // Second shutdown should not throw
      await expect(app.shutdown()).resolves.not.toThrow();
    });
  });
});