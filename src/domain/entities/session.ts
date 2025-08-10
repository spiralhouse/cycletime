import { InvalidSessionDataError } from '../errors/session-errors.js';
import { SessionKey } from '../value-objects/session-key.js';
import type { TimeProvider } from '../interfaces/time-provider.js';

/**
 * Session context data structure
 */
export interface SessionContext {
  activeIssues?: string[];
  workflowStage?: string;
  lastAction?: string;
  contextData?: Record<string, unknown>;
}

/**
 * Session domain entity representing a user's work session
 */
export class Session {
  private _sessionKey: SessionKey;
  private _projectId?: string | undefined;
  private _currentContext: SessionContext;
  private _lastActivity: Date;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(
    sessionKey: SessionKey | string,
    projectId: string | undefined,
    currentContext: SessionContext,
    lastActivity: Date,
    createdAt?: Date | undefined,
    updatedAt?: Date | undefined,
    private readonly timeProvider?: TimeProvider
  ) {
    this._sessionKey = typeof sessionKey === 'string' 
      ? SessionKey.from(sessionKey) 
      : sessionKey;
    this._projectId = projectId;
    this._currentContext = this.validateContext(currentContext);
    this._lastActivity = new Date(lastActivity);
    this._createdAt = createdAt ? new Date(createdAt) : this.getCurrentTime();
    this._updatedAt = updatedAt ? new Date(updatedAt) : this.getCurrentTime();
  }

  /**
   * Get current time from provider or fall back to system time
   */
  private getCurrentTime(): Date {
    return this.timeProvider?.now() ?? new Date();
  }

  /**
   * Get session key
   */
  get sessionKey(): SessionKey {
    return this._sessionKey;
  }

  /**
   * Get project ID
   */
  get projectId(): string | undefined {
    return this._projectId;
  }

  /**
   * Set project ID
   */
  set projectId(projectId: string | undefined) {
    this._projectId = projectId;
    this.touch();
  }

  /**
   * Get current context
   */
  get currentContext(): SessionContext {
    return { ...this._currentContext };
  }

  /**
   * Get last activity timestamp
   */
  get lastActivity(): Date {
    return new Date(this._lastActivity);
  }

  /**
   * Get creation timestamp
   */
  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  /**
   * Get last update timestamp
   */
  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Update session context
   */
  updateContext(contextUpdate: Partial<SessionContext>): void {
    const newContext = {
      ...this._currentContext,
      ...contextUpdate
    };
    
    this._currentContext = this.validateContext(newContext);
    this.touch();
  }

  /**
   * Add active issue to context
   */
  addActiveIssue(issueId: string): void {
    const activeIssues = this._currentContext.activeIssues || [];

    if (!activeIssues.includes(issueId)) {
      this.updateContext({
        activeIssues: [...activeIssues, issueId]
      });
    }
  }

  /**
   * Remove active issue from context
   */
  removeActiveIssue(issueId: string): void {
    const activeIssues = this._currentContext.activeIssues || [];

    this.updateContext({
      activeIssues: activeIssues.filter(id => id !== issueId)
    });
  }

  /**
   * Check if session is expired
   */
  isExpired(maxAge: number): boolean {
    const ageMs = Date.now() - this._lastActivity.getTime();

    return ageMs > maxAge;
  }

  /**
   * Touch session to update last activity
   */
  touch(): void {
    const now = this.getCurrentTime();
    this._lastActivity = now;
    this._updatedAt = now;
  }

  /**
   * Convert to plain object for storage
   */
  toPlainObject() {
    return {
      sessionKey: this._sessionKey.value,
      projectId: this._projectId,
      currentContext: this._currentContext,
      lastActivity: this._lastActivity,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }

  /**
   * Validate session context data
   */
  private validateContext(context: SessionContext): SessionContext {
    if (!context || typeof context !== 'object') {
      return {};
    }

    const validated: SessionContext = {};

    // Validate activeIssues
    if (context.activeIssues !== undefined) {
      if (!Array.isArray(context.activeIssues)) {
        throw new InvalidSessionDataError('activeIssues must be an array');
      }
      if (!context.activeIssues.every(issue => typeof issue === 'string')) {
        throw new InvalidSessionDataError('all activeIssues must be strings');
      }
      validated.activeIssues = [...context.activeIssues];
    }

    // Validate workflowStage
    if (context.workflowStage !== undefined) {
      if (typeof context.workflowStage !== 'string') {
        throw new InvalidSessionDataError('workflowStage must be a string');
      }
      validated.workflowStage = context.workflowStage;
    }

    // Validate lastAction
    if (context.lastAction !== undefined) {
      if (typeof context.lastAction !== 'string') {
        throw new InvalidSessionDataError('lastAction must be a string');
      }
      validated.lastAction = context.lastAction;
    }

    // Validate contextData
    if (context.contextData !== undefined) {
      if (!context.contextData || typeof context.contextData !== 'object' || Array.isArray(context.contextData)) {
        throw new InvalidSessionDataError('contextData must be a valid object');
      }
      validated.contextData = { ...context.contextData };
    }

    return validated;
  }

  /**
   * Static factory method to create new session
   */
  static create(
    projectId?: string, 
    initialContext: SessionContext = {}, 
    timeProvider?: TimeProvider
  ): Session {
    const sessionKey = SessionKey.generate();
    const now = timeProvider?.now() ?? new Date();
    
    return new Session(
      sessionKey,
      projectId,
      initialContext,
      now,
      now,
      now,
      timeProvider
    );
  }

  /**
   * Static factory method to create from stored data
   */
  static fromPlainObject(
    data: {
      sessionKey: string;
      projectId?: string;
      currentContext: SessionContext;
      lastActivity: Date | string | number;
      createdAt?: Date | string | number;
      updatedAt?: Date | string | number;
    },
    timeProvider?: TimeProvider
  ): Session {
    return new Session(
      data.sessionKey,
      data.projectId,
      data.currentContext,
      new Date(data.lastActivity),
      data.createdAt ? new Date(data.createdAt) : undefined,
      data.updatedAt ? new Date(data.updatedAt) : undefined,
      timeProvider
    );
  }
}