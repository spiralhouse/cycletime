import type { SessionContext } from '../../domain/entities/session.js';

/**
 * Data Transfer Object for session state
 */
export interface SessionStateDto {
  sessionKey: string;
  projectId?: string | undefined;
  currentContext: SessionContext;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating a new session
 */
export interface CreateSessionDto {
  projectId?: string | undefined;
  initialContext?: SessionContext | undefined;
}

/**
 * DTO for updating session context
 */
export interface UpdateSessionContextDto {
  sessionKey: string;
  contextUpdate: Partial<SessionContext>;
}

/**
 * Command for creating a session
 */
export interface CreateSessionCommand {
  projectId?: string | undefined;
  initialContext?: SessionContext | undefined;
}

/**
 * Command for updating session
 */
export interface UpdateSessionCommand {
  sessionKey: string;
  contextUpdate?: Partial<SessionContext>;
  touchActivity?: boolean;
}

/**
 * Result of session operations
 */
export interface SessionOperationResult {
  success: boolean;
  sessionKey?: string;
  error?: string;
  affectedCount?: number;
}
