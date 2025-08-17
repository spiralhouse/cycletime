/**
 * JCVD - Project Orchestration Framework
 *
 * Main entry point for JCVD functionality
 */

// Core Application Bootstrap
export { Application } from './infrastructure/bootstrap.js';
export type { ApplicationConfig, HealthStatus } from './infrastructure/bootstrap.js';

// Dependency Injection Container
export { DIContainer } from './infrastructure/di/container.js';
export { ContainerFactory } from './infrastructure/di/container-factory.js';
export { ServiceRegistry, SERVICE_TOKENS } from './infrastructure/di/service-registry.js';

// Service Providers
export { 
  DatabaseProvider,
  TimeProvider,
  RepositoryProvider,
  ApplicationServiceProvider
} from './infrastructure/di/providers.js';

// Types
export type {
  IServiceContainer,
  ServiceLifecycle,
  ServiceFactory,
  ServiceRegistrationOptions
} from './infrastructure/di/types.js';

// Domain Types
export type { Project } from './domain/entities/project.js';
export type { Issue } from './domain/entities/issue.js';
export type { Workflow } from './domain/entities/workflow.js';

// Application Services (for type information)
export type { ProjectApplicationService } from './application/services/project-application-service.js';
export type { IssueApplicationService } from './application/services/issue-application-service.js';
export type { WorkflowApplicationService } from './application/services/workflow-application-service.js';

// Factory Functions
import { Application } from './infrastructure/bootstrap.js';

import type { ApplicationConfig } from './infrastructure/bootstrap.js';

/**
 * Create a new application instance
 */
export function createApplication(config?: ApplicationConfig): Application {
  return new Application(config);
}

/**
 * Create and initialize a test application
 */
export async function createTestApplication(config?: Partial<ApplicationConfig>): Promise<Application> {
  const app = new Application({
    databasePath: ':memory:',
    useMockTime: true,
    enableLogging: false,
    environment: 'test',
    ...config
  });
  
  await app.initialize();

  return app;
}

/**
 * Create and initialize a production application
 */
export async function createProductionApplication(
  databasePath: string,
  config?: Partial<ApplicationConfig>
): Promise<Application> {
  if (!databasePath) {
    throw new Error('Database path is required for production');
  }
  
  const app = new Application({
    databasePath,
    useMockTime: false,
    enableLogging: true,
    environment: 'production',
    ...config
  });
  
  await app.initialize();

  return app;
}

// Legacy exports for backward compatibility
export {
  JCVD,
  SqliteProjectStore,
  JCVDContextProvider,
  JCVDMCPResourceServer,
  createJCVD,
} from './jcvd-simple.js';

export type { ProjectContext, JCVDConfig } from './jcvd-simple.js';

export { SqliteStore } from './sqlite-store.js';
export { JcvdMcpServer } from './mcp-server.js';

// Database and session management exports
export * from './database/index.js';
export * from './mcp/session/index.js';

// Default export is the Application class
export default Application;