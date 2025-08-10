import { 
  SessionNotFoundError, 
  SessionStorageError
} from '../../domain/errors/session-errors.js';

import type { 
  SessionState, 
  SessionConfig, 
  SessionManagerInterface
} from './types.js';
import type { SessionApplicationService } from '../../application/services/session-application-service.js';
import type { SessionContext } from '../../domain/entities/session.js';
import type { TimeProvider } from '../../domain/interfaces/time-provider.js';


/**
 * Session Manager implementation for MCP integration
 */
export class SessionManager implements SessionManagerInterface {
  private config: SessionConfig;
  private cleanupTimer?: NodeJS.Timeout | undefined;

  constructor(
    private readonly sessionService: SessionApplicationService,
    private readonly timeProvider: TimeProvider,
    config: SessionConfig = {}
  ) {
    // Set default configuration
    this.config = {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      autoCleanup: true,
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      maxSessionsPerProject: 0, // unlimited
      ...config
    };

    // Start automatic cleanup if enabled
    if (this.config.autoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Create a new session
   */
  async createSession(projectId?: string, initialContext?: SessionContext): Promise<string> {
    try {
      const result = await this.sessionService.createSession({
        projectId,
        initialContext
      });

      if (!result.success) {
        throw new SessionStorageError('create session', new Error(result.error));
      }

      return result.sessionKey!;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new SessionStorageError('create session', new Error('Unknown error'));
    }
  }

  /**
   * Get session by key
   */
  async getSession(sessionKey: string): Promise<SessionState | null> {
    try {
      const sessionDto = await this.sessionService.getSession(sessionKey);
      
      if (!sessionDto) {
        return null;
      }

      // Check if session is expired
      if (this.isSessionExpired(sessionDto.lastActivity)) {
        // Clean up expired session
        await this.deleteSession(sessionKey);

        return null;
      }

      return {
        sessionKey: sessionDto.sessionKey,
        projectId: sessionDto.projectId,
        currentContext: sessionDto.currentContext,
        lastActivity: sessionDto.lastActivity,
        createdAt: sessionDto.createdAt,
        updatedAt: sessionDto.updatedAt
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new SessionStorageError('get session', new Error('Unknown error'));
    }
  }

  /**
   * Update session context
   */
  async updateSession(sessionKey: string, contextUpdate: Partial<SessionContext>): Promise<void> {
    try {
      const result = await this.sessionService.updateSession({
        sessionKey,
        contextUpdate
      });

      if (!result.success) {
        if (result.error?.includes('not found')) {
          throw new SessionNotFoundError(sessionKey);
        }
        throw new SessionStorageError('update session', new Error(result.error));
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new SessionStorageError('update session', new Error('Unknown error'));
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionKey: string): Promise<boolean> {
    try {
      const result = await this.sessionService.deleteSession(sessionKey);
      
      if (!result.success) {
        throw new SessionStorageError('delete session', new Error(result.error));
      }

      return (result.affectedCount || 0) > 0;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new SessionStorageError('delete session', new Error('Unknown error'));
    }
  }

  /**
   * Get all sessions for a project
   */
  async getProjectSessions(projectId: string): Promise<SessionState[]> {
    try {
      const sessions = await this.sessionService.getProjectSessions(projectId);
      
      // Filter out expired sessions
      const validSessions: SessionState[] = [];

      for (const session of sessions) {
        if (!this.isSessionExpired(session.lastActivity)) {
          validSessions.push({
            sessionKey: session.sessionKey,
            projectId: session.projectId,
            currentContext: session.currentContext,
            lastActivity: session.lastActivity,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
          });
        }
      }

      return validSessions;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new SessionStorageError('get project sessions', new Error('Unknown error'));
    }
  }

  /**
   * Add active issue to session context
   */
  async addActiveIssue(sessionKey: string, issueId: string): Promise<void> {
    try {
      const result = await this.sessionService.addActiveIssue(sessionKey, issueId);
      
      if (!result.success) {
        if (result.error?.includes('not found')) {
          throw new SessionNotFoundError(sessionKey);
        }
        throw new SessionStorageError('add active issue', new Error(result.error));
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new SessionStorageError('add active issue', new Error('Unknown error'));
    }
  }

  /**
   * Remove active issue from session context
   */
  async removeActiveIssue(sessionKey: string, issueId: string): Promise<void> {
    try {
      const result = await this.sessionService.removeActiveIssue(sessionKey, issueId);
      
      if (!result.success) {
        if (result.error?.includes('not found')) {
          throw new SessionNotFoundError(sessionKey);
        }
        throw new SessionStorageError('remove active issue', new Error(result.error));
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new SessionStorageError('remove active issue', new Error('Unknown error'));
    }
  }

  /**
   * Touch session to update last activity
   */
  async touchSession(sessionKey: string): Promise<void> {
    try {
      const result = await this.sessionService.updateSession({
        sessionKey,
        touchActivity: true
      });

      if (!result.success) {
        if (result.error?.includes('not found')) {
          throw new SessionNotFoundError(sessionKey);
        }
        throw new SessionStorageError('touch session', new Error(result.error));
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new SessionStorageError('touch session', new Error('Unknown error'));
    }
  }

  /**
   * Expire old sessions
   */
  async expireSessions(olderThan?: Date): Promise<number> {
    try {
      let maxAge: number;
      
      if (olderThan) {
        // If specific cutoff date provided, calculate maxAge from it
        maxAge = this.timeProvider.now().getTime() - olderThan.getTime();
      } else {
        // Use configured maxAge
        maxAge = this.config.maxAge!;
      }
      
      const result = await this.sessionService.cleanupExpiredSessions(maxAge);
      
      if (!result.success) {
        throw new SessionStorageError('expire sessions', new Error(result.error));
      }

      return result.affectedCount || 0;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new SessionStorageError('expire sessions', new Error('Unknown error'));
    }
  }

  /**
   * Check if session exists
   */
  async sessionExists(sessionKey: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionKey);

      return session !== null;
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        return false;
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new SessionStorageError('check session existence', new Error('Unknown error'));
    }
  }

  /**
   * Get current session configuration
   */
  getConfig(): SessionConfig {
    return { ...this.config };
  }

  /**
   * Update session configuration
   */
  updateConfig(config: Partial<SessionConfig>): void {
    const oldAutoCleanup = this.config.autoCleanup;
    
    this.config = { ...this.config, ...config };

    // Restart auto cleanup if setting changed
    if (this.config.autoCleanup !== oldAutoCleanup) {
      this.stopAutoCleanup();
      if (this.config.autoCleanup) {
        this.startAutoCleanup();
      }
    }
  }

  /**
   * Gracefully shutdown the session manager
   */
  shutdown(): void {
    this.stopAutoCleanup();
  }

  /**
   * Check if a session is expired based on last activity
   */
  private isSessionExpired(lastActivity: Date): boolean {
    const age = this.timeProvider.now().getTime() - lastActivity.getTime();

    return age > this.config.maxAge!;
  }

  /**
   * Start automatic cleanup of expired sessions
   */
  private startAutoCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(async () => {
      try {
        const expiredCount = await this.expireSessions();

        if (expiredCount > 0) {
          console.log(`Cleaned up ${expiredCount} expired sessions`);
        }
      } catch (error) {
        console.error('Auto cleanup failed:', error);
      }
    }, this.config.cleanupInterval!);

    // Don't keep the process alive just for cleanup
    this.cleanupTimer.unref();
  }

  /**
   * Stop automatic cleanup
   */
  private stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}