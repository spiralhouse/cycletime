import type { SessionStateDto } from '../../application/dtos/session-dto.js';
import type { TimeProvider } from '../interfaces/time-provider.js';

/**
 * Configuration for session cleanup policies
 */
export interface CleanupConfig {
  /**
   * Maximum age for expired sessions before deletion (in milliseconds)
   * Default: 7 days
   */
  expiredSessionRetention: number;

  /**
   * Maximum age for orphaned sessions (no project) before deletion (in milliseconds)
   * Default: 3 days
   */
  orphanedSessionRetention: number;

  /**
   * Maximum number of sessions to keep per project
   * Default: 10
   */
  maxSessionsPerProject: number;

  /**
   * Whether to optimize storage after cleanup
   * Default: true
   */
  optimizeAfterCleanup: boolean;

  /**
   * Minimum time between cleanup operations (in milliseconds)
   * Default: 1 hour
   */
  minCleanupInterval: number;

  /**
   * Whether to perform dry run (no actual deletions)
   * Default: false
   */
  dryRun: boolean;
}

/**
 * Default cleanup configuration
 */
export const DEFAULT_CLEANUP_CONFIG: CleanupConfig = {
  expiredSessionRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
  orphanedSessionRetention: 3 * 24 * 60 * 60 * 1000, // 3 days
  maxSessionsPerProject: 10,
  optimizeAfterCleanup: true,
  minCleanupInterval: 60 * 60 * 1000, // 1 hour
  dryRun: false,
};

/**
 * Result of cleanup operation
 */
export interface CleanupResult {
  /**
   * Number of sessions deleted
   */
  deletedSessions: number;

  /**
   * Session keys that were deleted
   */
  deletedKeys: string[];

  /**
   * Number of sessions retained
   */
  retainedSessions: number;

  /**
   * Whether storage was optimized
   */
  storageOptimized: boolean;

  /**
   * Size before cleanup (in bytes)
   */
  sizeBefore?: number;

  /**
   * Size after cleanup (in bytes)
   */
  sizeAfter?: number;

  /**
   * Any errors encountered during cleanup
   */
  errors: CleanupError[];

  /**
   * Time taken for cleanup (in milliseconds)
   */
  duration: number;
}

/**
 * Error during cleanup operation
 */
export interface CleanupError {
  sessionKey?: string;
  message: string;
  error?: Error;
}

/**
 * Session analysis for cleanup decisions
 */
export interface SessionAnalysis {
  sessionKey: string;
  shouldDelete: boolean;
  reason?: CleanupReason;
  age: number;
  lastActivity: Date;
  hasProject: boolean;
  isActive: boolean;
}

/**
 * Reason for cleanup decision
 */
export enum CleanupReason {
  EXPIRED_TOO_LONG = 'expired_too_long',
  ORPHANED_TOO_LONG = 'orphaned_too_long',
  EXCEEDS_PROJECT_LIMIT = 'exceeds_project_limit',
  CORRUPTED_DATA = 'corrupted_data',
  MANUAL_REQUEST = 'manual_request',
}

/**
 * Domain service for cleaning up old sessions and optimizing storage
 */
export class SessionCleanupService {
  private readonly config: CleanupConfig;
  private lastCleanupTime?: Date;

  constructor(
    private readonly timeProvider: TimeProvider,
    config: Partial<CleanupConfig> = {}
  ) {
    this.config = { ...DEFAULT_CLEANUP_CONFIG, ...config };
  }

  /**
   * Analyze sessions to determine which should be cleaned up
   */
  analyzeSessions(sessions: SessionStateDto[]): SessionAnalysis[] {
    const now = this.timeProvider.now();
    const analyses: SessionAnalysis[] = [];

    // Group sessions by project
    const sessionsByProject = new Map<string, SessionStateDto[]>();
    const orphanedSessions: SessionStateDto[] = [];

    for (const session of sessions) {
      const projectId = session.projectId;

      if (projectId) {
        const projectSessions = sessionsByProject.get(projectId) ?? [];

        projectSessions.push(session);
        sessionsByProject.set(projectId, projectSessions);
      } else {
        orphanedSessions.push(session);
      }
    }

    // Analyze orphaned sessions
    for (const session of orphanedSessions) {
      const age = now.getTime() - session.lastActivity.getTime();
      const analysis: SessionAnalysis = {
        sessionKey: session.sessionKey,
        shouldDelete: false,
        age,
        lastActivity: session.lastActivity,
        hasProject: false,
        isActive: age < this.config.orphanedSessionRetention,
      };

      if (age > this.config.orphanedSessionRetention) {
        analysis.shouldDelete = true;
        analysis.reason = CleanupReason.ORPHANED_TOO_LONG;
      }

      analyses.push(analysis);
    }

    // Analyze project sessions
    for (const [, projectSessions] of sessionsByProject) {
      // Sort by last activity (newest first)
      const sortedSessions = [...projectSessions].sort(
        (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
      );

      for (let i = 0; i < sortedSessions.length; i++) {
        const session = sortedSessions[i];

        if (!session) continue;
        
        const age = now.getTime() - session.lastActivity.getTime();
        const analysis: SessionAnalysis = {
          sessionKey: session.sessionKey,
          shouldDelete: false,
          age,
          lastActivity: session.lastActivity,
          hasProject: true,
          isActive: age < this.config.expiredSessionRetention,
        };

        // Check if exceeds project limit (keep only the most recent N sessions)
        if (i >= this.config.maxSessionsPerProject) {
          analysis.shouldDelete = true;
          analysis.reason = CleanupReason.EXCEEDS_PROJECT_LIMIT;
        }
        // Check if expired for too long
        else if (age > this.config.expiredSessionRetention) {
          analysis.shouldDelete = true;
          analysis.reason = CleanupReason.EXPIRED_TOO_LONG;
        }

        analyses.push(analysis);
      }
    }

    return analyses;
  }

  /**
   * Determine if cleanup should run based on minimum interval
   */
  shouldRunCleanup(): boolean {
    if (!this.lastCleanupTime) {
      return true;
    }

    const now = this.timeProvider.now();
    const timeSinceLastCleanup = now.getTime() - this.lastCleanupTime.getTime();

    return timeSinceLastCleanup >= this.config.minCleanupInterval;
  }

  /**
   * Mark cleanup as completed
   */
  markCleanupCompleted(): void {
    this.lastCleanupTime = this.timeProvider.now();
  }

  /**
   * Build cleanup result
   */
  buildCleanupResult(
    analyses: SessionAnalysis[],
    errors: CleanupError[] = [],
    startTime: Date
  ): CleanupResult {
    const endTime = this.timeProvider.now();
    const toDelete = analyses.filter(a => a.shouldDelete);
    const toRetain = analyses.filter(a => !a.shouldDelete);

    return {
      deletedSessions: toDelete.length,
      deletedKeys: toDelete.map(a => a.sessionKey),
      retainedSessions: toRetain.length,
      storageOptimized: this.config.optimizeAfterCleanup && !this.config.dryRun,
      errors,
      duration: endTime.getTime() - startTime.getTime(),
    };
  }

  /**
   * Get cleanup statistics from analyses
   */
  getCleanupStats(analyses: SessionAnalysis[]): {
    byReason: Map<CleanupReason, number>;
    averageAge: number;
    oldestSession: Date | null;
    newestSession: Date | null;
  } {
    const byReason = new Map<CleanupReason, number>();
    let totalAge = 0;
    let oldest: Date | null = null;
    let newest: Date | null = null;

    for (const analysis of analyses) {
      if (analysis.shouldDelete && analysis.reason) {
        const count = byReason.get(analysis.reason) ?? 0;

        byReason.set(analysis.reason, count + 1);
      }

      totalAge += analysis.age;

      if (!oldest || analysis.lastActivity < oldest) {
        oldest = analysis.lastActivity;
      }
      if (!newest || analysis.lastActivity > newest) {
        newest = analysis.lastActivity;
      }
    }

    return {
      byReason,
      averageAge: analyses.length > 0 ? totalAge / analyses.length : 0,
      oldestSession: oldest,
      newestSession: newest,
    };
  }

  /**
   * Validate session for corruption before cleanup
   */
  isSessionCorrupted(session: SessionStateDto): boolean {
    try {
      // Check for required fields
      if (!session.sessionKey || typeof session.sessionKey !== 'string') {
        return true;
      }

      // Check for valid dates
      const dates = [session.createdAt, session.lastActivity, session.updatedAt];

      for (const date of dates) {
        if (!date || Number.isNaN(new Date(date).getTime())) {
          return true;
        }
      }

      // Check for valid context
      if (!session.currentContext || typeof session.currentContext !== 'object') {
        return true;
      }

      return false;
    } catch {
      return true;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CleanupConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<CleanupConfig> {
    return { ...this.config };
  }
}