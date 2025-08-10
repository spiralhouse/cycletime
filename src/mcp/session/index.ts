/**
 * Session Management MCP Module
 */

// Domain exports
export { Session } from '../../domain/entities/session.js';
export type { SessionContext } from '../../domain/entities/session.js';
export { SessionKey } from '../../domain/value-objects/session-key.js';
export {
  SessionError,
  SessionNotFoundError,
  InvalidSessionDataError,
  SessionExpiredError,
  SessionStorageError
} from '../../domain/errors/session-errors.js';
export type { SessionRepository, UnitOfWork } from '../../domain/repositories/session-repository.js';

// Application exports
export { SessionApplicationService } from '../../application/services/session-application-service.js';
export type {
  SessionStateDto,
  CreateSessionDto,
  UpdateSessionContextDto,
  CreateSessionCommand,
  UpdateSessionCommand,
  SessionOperationResult
} from '../../application/dtos/session-dto.js';

// Infrastructure exports
export { SqliteSessionRepository } from '../../infrastructure/database/repositories/sqlite-session-repository.js';
export { SqliteUnitOfWork } from '../../infrastructure/database/sqlite-unit-of-work.js';

// MCP exports
export { SessionManager } from './manager.js';
export type {
  SessionState,
  SessionConfig,
  SessionManagerInterface
} from './types.js';

/**
 * Factory function to create a complete SessionManager instance
 */

import { SessionApplicationService } from '../../application/services/session-application-service.js';
import { SqliteSessionRepository } from '../../infrastructure/database/repositories/sqlite-session-repository.js';
import { SqliteUnitOfWork } from '../../infrastructure/database/sqlite-unit-of-work.js';

import { SessionManager } from './manager.js';

import type { SessionConfig } from './types.js';
import type Database from 'better-sqlite3';

export function createSessionManager(
  db: Database.Database,
  config?: SessionConfig
): SessionManager {
  // Create infrastructure layer
  const sessionRepository = new SqliteSessionRepository(db);
  const unitOfWork = new SqliteUnitOfWork(db);

  // Create application layer  
  const sessionService = new SessionApplicationService(sessionRepository, unitOfWork);

  // Create MCP layer
  return new SessionManager(sessionService, config);
}

/**
 * Default session configuration
 */
export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  autoCleanup: true,
  cleanupInterval: 60 * 60 * 1000, // 1 hour
  maxSessionsPerProject: 0 // unlimited
};