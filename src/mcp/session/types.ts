import type { SessionContext } from '../../domain/entities/session.js';

/**
 * Session metadata for tracking and analytics
 */
export interface SessionMetadata {
  /** Number of context updates in this session */
  updateCount: number;
  /** Total time session has been active (milliseconds) */
  totalActiveTime: number;
  /** Number of issues accessed in this session */
  issuesAccessed: number;
  /** Last action performed in the session */
  lastAction?: string;
  /** Session source/client information */
  source?: string;
  /** Additional custom metadata */
  customData?: Record<string, unknown>;
}

/**
 * Session information combining state and metadata
 */
export interface SessionInfo {
  state: SessionState;
  metadata: SessionMetadata;
  /** Whether the session is currently expired */
  isExpired: boolean;
  /** Time until expiration (milliseconds) */
  timeToExpiration: number;
}

/**
 * Session state interface for MCP layer
 */
export interface SessionState {
  sessionKey: string;
  projectId?: string | undefined;
  currentContext: SessionContext;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session configuration options
 */
export interface SessionConfig {
  /** Maximum session age in milliseconds before expiration (default: 7 days) */
  maxAge?: number;
  /** Enable automatic cleanup of expired sessions */
  autoCleanup?: boolean;
  /** Cleanup interval in milliseconds (default: 1 hour) */
  cleanupInterval?: number;
  /** Maximum number of sessions per project (0 = unlimited) */
  maxSessionsPerProject?: number;
}

/**
 * Session manager interface for MCP integration
 */
export interface SessionManagerInterface {
  /**
   * Create a new session
   */
  createSession: (
    projectId?: string | undefined,
    initialContext?: SessionContext | undefined
  ) => Promise<string>;

  /**
   * Get session by key
   */
  getSession: (sessionKey: string) => Promise<SessionState | null>;

  /**
   * Update session context
   */
  updateSession: (sessionKey: string, contextUpdate: Partial<SessionContext>) => Promise<void>;

  /**
   * Delete session
   */
  deleteSession: (sessionKey: string) => Promise<boolean>;

  /**
   * Get all sessions for a project
   */
  getProjectSessions: (projectId: string) => Promise<SessionState[]>;

  /**
   * Add active issue to session context
   */
  addActiveIssue: (sessionKey: string, issueId: string) => Promise<void>;

  /**
   * Remove active issue from session context
   */
  removeActiveIssue: (sessionKey: string, issueId: string) => Promise<void>;

  /**
   * Touch session to update last activity
   */
  touchSession: (sessionKey: string) => Promise<void>;

  /**
   * Expire old sessions
   */
  expireSessions: (olderThan?: Date) => Promise<number>;

  /**
   * Check if session exists
   */
  sessionExists: (sessionKey: string) => Promise<boolean>;

  /**
   * Get session information including metadata
   */
  getSessionInfo: (sessionKey: string) => Promise<SessionInfo | null>;

  /**
   * Get current session configuration
   */
  getConfig: () => SessionConfig;

  /**
   * Update session configuration
   */
  updateConfig: (config: Partial<SessionConfig>) => void;
}
