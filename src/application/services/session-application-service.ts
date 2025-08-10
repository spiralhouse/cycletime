import { Session } from '../../domain/entities/session.js';
import {
  SessionNotFoundError,
  SessionStorageError
} from '../../domain/errors/session-errors.js';

import type { SessionRepository, UnitOfWork } from '../../domain/repositories/session-repository.js';
import type { TimeProvider } from '../../domain/interfaces/time-provider.js';
import type {
  SessionStateDto,
  CreateSessionCommand,
  UpdateSessionCommand,
  SessionOperationResult
} from '../dtos/session-dto.js';

/**
 * Application service for session management operations
 */
export class SessionApplicationService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly timeProvider?: TimeProvider
  ) {}

  /**
   * Create a new session
   */
  async createSession(command: CreateSessionCommand): Promise<SessionOperationResult> {
    try {
      const session = Session.create(command.projectId, command.initialContext, this.timeProvider);
      
      await this.unitOfWork.execute(async () => {
        await this.sessionRepository.save(session);
      });

      return {
        success: true,
        sessionKey: session.sessionKey.value
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get session by key
   */
  async getSession(sessionKey: string): Promise<SessionStateDto | null> {
    try {
      const session = await this.sessionRepository.findBySessionKey(sessionKey);
      
      if (!session) {
        return null;
      }

      return this.toDto(session);
    } catch (error) {
      throw new SessionStorageError('get session', error as Error);
    }
  }

  /**
   * Update session
   */
  async updateSession(command: UpdateSessionCommand): Promise<SessionOperationResult> {
    try {
      return await this.unitOfWork.execute(async () => {
        const session = await this.sessionRepository.findBySessionKey(command.sessionKey);
        
        if (!session) {
          throw new SessionNotFoundError(command.sessionKey);
        }

        // Update context if provided
        if (command.contextUpdate) {
          session.updateContext(command.contextUpdate);
        }

        // Touch activity if requested (default true)
        if (command.touchActivity !== false) {
          session.touch();
        }

        await this.sessionRepository.save(session);

        return {
          success: true,
          sessionKey: session.sessionKey.value
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionKey: string): Promise<SessionOperationResult> {
    try {
      const deleted = await this.sessionRepository.delete(sessionKey);
      
      return {
        success: true,
        affectedCount: deleted ? 1 : 0
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get sessions for a project
   */
  async getProjectSessions(projectId: string): Promise<SessionStateDto[]> {
    try {
      const sessions = await this.sessionRepository.findByProjectId(projectId);

      return sessions.map(session => this.toDto(session));
    } catch (error) {
      throw new SessionStorageError('get project sessions', error as Error);
    }
  }

  /**
   * Add active issue to session
   */
  async addActiveIssue(sessionKey: string, issueId: string): Promise<SessionOperationResult> {
    try {
      return await this.unitOfWork.execute(async () => {
        const session = await this.sessionRepository.findBySessionKey(sessionKey);
        
        if (!session) {
          throw new SessionNotFoundError(sessionKey);
        }

        session.addActiveIssue(issueId);
        await this.sessionRepository.save(session);

        return {
          success: true,
          sessionKey: session.sessionKey.value
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Remove active issue from session
   */
  async removeActiveIssue(sessionKey: string, issueId: string): Promise<SessionOperationResult> {
    try {
      return await this.unitOfWork.execute(async () => {
        const session = await this.sessionRepository.findBySessionKey(sessionKey);
        
        if (!session) {
          throw new SessionNotFoundError(sessionKey);
        }

        session.removeActiveIssue(issueId);
        await this.sessionRepository.save(session);

        return {
          success: true,
          sessionKey: session.sessionKey.value
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<SessionOperationResult> {
    try {
      const cutoffDate = new Date(Date.now() - maxAge);
      
      const affectedCount = await this.unitOfWork.execute(async () => {
        return await this.sessionRepository.deleteExpired(cutoffDate);
      });

      return {
        success: true,
        affectedCount
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Convert domain session to DTO
   */
  private toDto(session: Session): SessionStateDto {
    return {
      sessionKey: session.sessionKey.value,
      projectId: session.projectId,
      currentContext: session.currentContext,
      lastActivity: session.lastActivity,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };
  }
}