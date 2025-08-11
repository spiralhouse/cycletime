import { SessionNotFoundError, SessionStorageError } from '../../domain/errors/session-errors.js';
import { SessionCleanupService } from '../../domain/services/session-cleanup-service.js';
import { SessionValidator } from '../../domain/services/session-validator.js';

import type {
  SessionState,
  SessionConfig,
  SessionManagerInterface,
  SessionInfo,
  SessionMetadata,
} from './types.js';
import type { SessionApplicationService } from '../../application/services/session-application-service.js';
import type { SessionContext } from '../../domain/entities/session.js';
import type { TimeProvider } from '../../domain/interfaces/time-provider.js';
import type { CleanupConfig, CleanupResult } from '../../domain/services/session-cleanup-service.js';
import type { ValidationRules } from '../../domain/services/session-validator.js';

/**
 * Session Manager implementation for MCP integration
 */
export class SessionManager implements SessionManagerInterface {
  private config: SessionConfig;
  private cleanupTimer?: NodeJS.Timeout | undefined;
  private readonly validator: SessionValidator;
  private readonly cleanupService: SessionCleanupService;

  constructor(
    private readonly sessionService: SessionApplicationService,
    private readonly timeProvider: TimeProvider,
    config: SessionConfig = {},
    validationRules?: Partial<ValidationRules>,
    cleanupConfig?: Partial<CleanupConfig>
  ) {
    // Set default configuration
    this.config = {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      autoCleanup: true,
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      maxSessionsPerProject: 0, // unlimited
      ...config,
    };

    // Initialize validator
    this.validator = new SessionValidator(validationRules);
    
    // Initialize cleanup service
    this.cleanupService = new SessionCleanupService(timeProvider, cleanupConfig);

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
        initialContext,
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
   * Get session by key with validation and repair
   */
  async getSession(sessionKey: string): Promise<SessionState | null> {
    try {
      const sessionDto = await this.sessionService.getSession(sessionKey);

      if (!sessionDto) {
        return null;
      }

      // Validate session data
      const validation = this.validator.validateSessionState(sessionDto);

      if (!validation.isValid) {
        // Attempt to repair the session
        const repairResult = this.validator.repairSession(sessionDto);

        if (!repairResult.success) {
          // Log critical validation errors
          console.error(`Session ${sessionKey} validation failed:`, validation.errors);

          // Delete corrupted session
          await this.deleteSession(sessionKey);
          throw new SessionStorageError(
            'get session',
            new Error(
              `Session data is corrupted and cannot be repaired: ${validation.errors.map(e => e.message).join(', ')}`
            )
          );
        }

        // Use repaired session data
        const repairedDto = repairResult.repaired!;

        // Log repairs for monitoring
        console.warn(`Session ${sessionKey} was repaired:`, repairResult.repairs);

        // Update the session with repaired data
        await this.sessionService.updateSession({
          sessionKey,
          contextUpdate: repairedDto.currentContext,
        });

        // Check if session is expired
        if (this.isSessionExpired(repairedDto.lastActivity)) {
          // Clean up expired session
          await this.deleteSession(sessionKey);

          return null;
        }

        return {
          sessionKey: repairedDto.sessionKey,
          projectId: repairedDto.projectId,
          currentContext: repairedDto.currentContext,
          lastActivity: repairedDto.lastActivity,
          createdAt: repairedDto.createdAt,
          updatedAt: repairedDto.updatedAt,
        };
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        console.warn(`Session ${sessionKey} has warnings:`, validation.warnings);
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
        updatedAt: sessionDto.updatedAt,
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
        contextUpdate,
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
            updatedAt: session.updatedAt,
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
        touchActivity: true,
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
   * Detect conflicts between sessions for the same project
   */
  async detectSessionConflicts(projectId: string): Promise<{
    hasConflicts: boolean;
    conflicts: {
      sessions: string[];
      type: string;
      description: string;
    }[];
  }> {
    try {
      const sessions = await this.sessionService.getProjectSessions(projectId);

      if (sessions.length < 2) {
        return { hasConflicts: false, conflicts: [] };
      }

      const allConflicts: {
        sessions: string[];
        type: string;
        description: string;
      }[] = [];

      // Compare each pair of sessions
      for (let i = 0; i < sessions.length - 1; i++) {
        for (let j = i + 1; j < sessions.length; j++) {
          const session1 = sessions[i];
          const session2 = sessions[j];

          if (!session1 || !session2) continue;
          const conflictResult = this.validator.detectConflicts(session1, session2);

          if (conflictResult.hasConflicts) {
            for (const conflict of conflictResult.conflicts) {
              allConflicts.push({
                sessions: [session1.sessionKey, session2.sessionKey],
                type: conflict.type,
                description: conflict.description,
              });
            }
          }
        }
      }

      return {
        hasConflicts: allConflicts.length > 0,
        conflicts: allConflicts,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new SessionStorageError('detect conflicts', new Error('Unknown error'));
    }
  }

  /**
   * Get session information including metadata
   */
  async getSessionInfo(sessionKey: string): Promise<SessionInfo | null> {
    try {
      // Get raw session data without expiration check
      const sessionDto = await this.sessionService.getSession(sessionKey);

      if (!sessionDto) {
        return null;
      }

      const now = this.timeProvider.now();
      const sessionAge = now.getTime() - sessionDto.lastActivity.getTime();
      const timeToExpiration = this.config.maxAge! - sessionAge;
      const isExpired = sessionAge >= this.config.maxAge!;

      // Convert DTO to SessionState
      const session: SessionState = {
        sessionKey: sessionDto.sessionKey,
        projectId: sessionDto.projectId,
        currentContext: sessionDto.currentContext,
        lastActivity: sessionDto.lastActivity,
        createdAt: sessionDto.createdAt,
        updatedAt: sessionDto.updatedAt,
      };

      // Calculate metadata
      const metadata: SessionMetadata = {
        updateCount: 0, // Will be tracked in future enhancement
        totalActiveTime: now.getTime() - session.createdAt.getTime(),
        issuesAccessed: session.currentContext.activeIssues?.length || 0,
        ...(session.currentContext.lastAction && { lastAction: session.currentContext.lastAction }),
        source: 'mcp', // Default source
        ...(session.currentContext.contextData && {
          customData: session.currentContext.contextData,
        }),
      };

      return {
        state: session,
        metadata,
        isExpired,
        timeToExpiration: isExpired ? 0 : timeToExpiration,
      };
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        return null;
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new SessionStorageError('get session info', new Error('Unknown error'));
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
   * Clean up old sessions based on retention policies
   */
  async cleanupOldSessions(dryRun = false): Promise<CleanupResult> {
    const startTime = this.timeProvider.now();
    const errors: {
      sessionKey?: string;
      message: string;
      error?: Error;
    }[] = [];

    try {
      // Check if cleanup should run (respects minimum interval)
      if (!dryRun && !this.cleanupService.shouldRunCleanup()) {
        return this.cleanupService.buildCleanupResult([], errors, startTime);
      }

      // Get all sessions for analysis
      const allSessions = await this.sessionService.getAllSessions();
      
      // Analyze sessions to determine which to delete
      const analyses = this.cleanupService.analyzeSessions(allSessions);
      
      // Get statistics for logging
      const stats = this.cleanupService.getCleanupStats(analyses);

      console.log('Cleanup statistics:', {
        total: analyses.length,
        toDelete: analyses.filter(a => a.shouldDelete).length,
        byReason: Object.fromEntries(stats.byReason),
        averageAge: `${Math.round(stats.averageAge / (1000 * 60 * 60))  } hours`,
        oldestSession: stats.oldestSession?.toISOString(),
        newestSession: stats.newestSession?.toISOString(),
      });

      // Perform cleanup if not dry run
      if (!dryRun) {
        for (const analysis of analyses) {
          if (analysis.shouldDelete) {
            try {
              await this.sessionService.deleteSession(analysis.sessionKey);
            } catch (error) {
              errors.push({
                sessionKey: analysis.sessionKey,
                message: `Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ...(error instanceof Error && { error }),
              });
            }
          }
        }

        // Optimize storage if configured
        if (this.cleanupService.getConfig().optimizeAfterCleanup) {
          try {
            await this.sessionService.optimizeStorage();
          } catch (error) {
            errors.push({
              message: `Failed to optimize storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
              ...(error instanceof Error && { error }),
            });
          }
        }

        // Mark cleanup as completed
        this.cleanupService.markCleanupCompleted();
      }

      return this.cleanupService.buildCleanupResult(analyses, errors, startTime);
    } catch (error) {
      errors.push({
        message: `Cleanup operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ...(error instanceof Error && { error }),
      });

      return this.cleanupService.buildCleanupResult([], errors, startTime);
    }
  }

  /**
   * Manually trigger storage optimization
   */
  async optimizeStorage(): Promise<void> {
    try {
      await this.sessionService.optimizeStorage();
    } catch (error) {
      throw new SessionStorageError(
        'optimize storage',
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Get cleanup service configuration
   */
  getCleanupConfig(): CleanupConfig {
    return this.cleanupService.getConfig();
  }

  /**
   * Update cleanup service configuration
   */
  updateCleanupConfig(config: Partial<CleanupConfig>): void {
    this.cleanupService.updateConfig(config);
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

    return age >= this.config.maxAge!;
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
        // Run full cleanup with retention policies
        const result = await this.cleanupOldSessions();

        if (result.deletedSessions > 0) {
          console.log(`Cleaned up ${result.deletedSessions} sessions`);
          if (result.storageOptimized) {
            console.log('Storage optimized');
          }
        }

        if (result.errors.length > 0) {
          console.error('Cleanup errors:', result.errors);
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
