/**
 * Application Bootstrap
 * Main entry point for initializing and managing the application
 */

import Database from 'better-sqlite3';

import { ContainerFactory } from './di/container-factory.js';
import { DIContainer } from './di/container.js';
import { SERVICE_TOKENS } from './di/service-registry.js';
import { ProjectApplicationService } from '../application/services/project-application-service.js';
import { IssueApplicationService } from '../application/services/issue-application-service.js';
import { WorkflowApplicationService } from '../application/services/workflow-application-service.js';

import type { ContainerFactoryConfig } from './di/container-factory.js';
import type { IServiceContainer } from './di/types.js';

/**
 * Application configuration
 */
export interface ApplicationConfig extends ContainerFactoryConfig {
  /**
   * Application name
   */
  appName?: string;
  
  /**
   * Application version
   */
  version?: string;
  
  /**
   * Maximum retry attempts for initialization
   */
  maxRetries?: number;
  
  /**
   * Retry delay in milliseconds
   */
  retryDelay?: number;
}

/**
 * Health status information
 */
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  database: 'connected' | 'disconnected' | 'error';
  services: 'ready' | 'not-initialized' | 'error';
  uptime: number;
  timestamp: Date;
  details?: Record<string, any>;
}

/**
 * Application class
 * Manages application lifecycle and provides access to services
 */
export class Application {
  private container?: IServiceContainer;
  private config: ApplicationConfig;
  private initialized = false;
  private startTime?: Date;
  private environment: string;

  constructor(config: ApplicationConfig = {}) {
    this.config = this.mergeWithDefaults(config);
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('Application is already initialized');
    }

    try {
      // Validate configuration
      this.validateConfiguration();

      // Create container
      this.container = ContainerFactory.createContainer(this.config);

      // Run database migrations
      await this.runMigrations();

      this.initialized = true;
      this.startTime = new Date();
    } catch (error) {
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Initialize with retry logic
   */
  async initializeWithRetry(maxAttempts = 3, delayMs = 1000): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.initialize();
        return;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxAttempts) {
          await this.delay(delayMs);
        }
      }
    }

    throw lastError || new Error('Failed to initialize after retries');
  }

  /**
   * Shutdown the application
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      if (this.container) {
        this.container.dispose();
      }
    } finally {
      this.initialized = false;
      this.container = undefined;
      this.startTime = undefined;
    }
  }

  /**
   * Restart the application
   */
  async restart(): Promise<void> {
    await this.shutdown();
    await this.initialize();
  }

  /**
   * Check if application is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the DI container
   */
  getContainer(): IServiceContainer {
    this.ensureInitialized();
    return this.container!;
  }

  /**
   * Get the database connection
   */
  getDatabase(): Database.Database {
    this.ensureInitialized();
    return this.container!.resolve<Database.Database>(SERVICE_TOKENS.DATABASE);
  }

  /**
   * Get project application service
   */
  getProjectService(): ProjectApplicationService {
    this.ensureInitialized();
    return this.container!.resolve<ProjectApplicationService>(SERVICE_TOKENS.PROJECT_SERVICE);
  }

  /**
   * Get issue application service
   */
  getIssueService(): IssueApplicationService {
    this.ensureInitialized();
    return this.container!.resolve<IssueApplicationService>(SERVICE_TOKENS.ISSUE_SERVICE);
  }

  /**
   * Get workflow application service
   */
  getWorkflowService(): WorkflowApplicationService {
    this.ensureInitialized();
    return this.container!.resolve<WorkflowApplicationService>(SERVICE_TOKENS.WORKFLOW_SERVICE);
  }

  /**
   * Get current environment
   */
  getEnvironment(): string {
    return this.environment;
  }

  /**
   * Check if running in test environment
   */
  isTestEnvironment(): boolean {
    return this.environment === 'test';
  }

  /**
   * Check if running in production environment
   */
  isProductionEnvironment(): boolean {
    return this.environment === 'production';
  }

  /**
   * Check if running in development environment
   */
  isDevelopmentEnvironment(): boolean {
    return this.environment === 'development';
  }

  /**
   * Get application configuration
   */
  getConfiguration(): ApplicationConfig {
    return { ...this.config };
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const status: HealthStatus = {
      status: 'unhealthy',
      database: 'disconnected',
      services: 'not-initialized',
      uptime: 0,
      timestamp: new Date()
    };

    if (!this.initialized) {
      return status;
    }

    try {
      // Check database connection
      const db = this.getDatabase();
      if (db && db.open) {
        status.database = 'connected';
      }

      // Check services
      const projectService = this.getProjectService();
      const issueService = this.getIssueService();
      const workflowService = this.getWorkflowService();
      
      if (projectService && issueService && workflowService) {
        status.services = 'ready';
      }

      // Calculate uptime
      if (this.startTime) {
        status.uptime = Date.now() - this.startTime.getTime();
      }

      // Determine overall status
      if (status.database === 'connected' && status.services === 'ready') {
        status.status = 'healthy';
      } else if (status.database === 'connected' || status.services === 'ready') {
        status.status = 'degraded';
      }
    } catch (error) {
      status.status = 'unhealthy';
      status.details = { error: (error as Error).message };
    }

    return status;
  }

  /**
   * Backup database to a file
   */
  async backupDatabase(backupPath: string): Promise<void> {
    this.ensureInitialized();
    
    const db = this.getDatabase();
    await db.backup(backupPath);
  }

  /**
   * Create application from environment variables
   */
  static fromEnvironment(): Application {
    const config: ApplicationConfig = {};

    if (process.env.JCVD_DATABASE_PATH) {
      config.databasePath = process.env.JCVD_DATABASE_PATH;
    }

    if (process.env.JCVD_USE_MOCK_TIME) {
      config.useMockTime = process.env.JCVD_USE_MOCK_TIME === 'true';
    }

    if (process.env.JCVD_ENABLE_LOGGING) {
      config.enableLogging = process.env.JCVD_ENABLE_LOGGING === 'true';
    }

    if (process.env.JCVD_APP_NAME) {
      config.appName = process.env.JCVD_APP_NAME;
    }

    if (process.env.JCVD_VERSION) {
      config.version = process.env.JCVD_VERSION;
    }

    return new Application(config);
  }

  /**
   * Merge multiple configuration sources
   */
  static mergeConfigurations(...configs: Partial<ApplicationConfig>[]): ApplicationConfig {
    return Object.assign({}, ...configs);
  }

  /**
   * Ensure application is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Application is not initialized');
    }
  }

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config: ApplicationConfig): ApplicationConfig {
    return {
      appName: 'JCVD',
      version: '0.1.0',
      databasePath: ':memory:',
      useMockTime: false,
      enableLogging: false,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(): void {
    if (this.config.databasePath === '') {
      throw new Error('Invalid configuration: databasePath cannot be empty');
    }
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    // Migrations are already run by the DatabaseProvider
    // This is a placeholder for future migration logic
  }

  /**
   * Delay for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}