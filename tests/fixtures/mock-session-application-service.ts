import type {
  SessionStateDto,
  CreateSessionCommand,
  UpdateSessionCommand,
  SessionOperationResult
} from '../../src/application/dtos/session-dto.js';

/**
 * Mock SessionApplicationService for unit testing
 */
export class MockSessionApplicationService {
  private mockSessions = new Map<string, SessionStateDto | null>();
  private mockProjectSessionsMap = new Map<string, SessionStateDto[]>();
  
  // Mock results
  private createSessionResult: SessionOperationResult = { success: true };
  private updateSessionResult: SessionOperationResult = { success: true };
  private deleteSessionResult: SessionOperationResult = { success: true };
  private cleanupExpiredSessionsResult: SessionOperationResult = { success: true };

  // Call tracking
  private createSessionCalls: CreateSessionCommand[] = [];
  private updateSessionCalls: UpdateSessionCommand[] = [];
  private deleteSessionCalls: string[] = [];
  private cleanupExpiredSessionsCalls: number[] = [];
  private expectedDeleteCalls: string[] = [];

  /**
   * Mock session data for getSession calls
   */
  mockSession(sessionKey: string, sessionData: SessionStateDto | null): void {
    this.mockSessions.set(sessionKey, sessionData);
  }

  /**
   * Mock project sessions data
   */
  mockProjectSessions(projectId: string, sessions: SessionStateDto[]): void {
    this.mockProjectSessionsMap.set(projectId, sessions);
  }

  /**
   * Set mock result for createSession
   */
  mockCreateSessionResult(result: SessionOperationResult): void {
    this.createSessionResult = result;
  }

  /**
   * Set mock result for updateSession
   */
  mockUpdateSessionResult(result: SessionOperationResult): void {
    this.updateSessionResult = result;
  }

  /**
   * Set mock result for deleteSession
   */
  mockDeleteSessionResult(result: SessionOperationResult): void {
    this.deleteSessionResult = result;
  }

  /**
   * Set mock result for cleanupExpiredSessions
   */
  mockCleanupExpiredSessionsResult(result: SessionOperationResult): void {
    this.cleanupExpiredSessionsResult = result;
  }

  /**
   * Expect a delete call to be made (for testing expiration logic)
   */
  expectDeleteCall(sessionKey: string): void {
    this.expectedDeleteCalls.push(sessionKey);
  }

  /**
   * Get all createSession calls
   */
  getCreateSessionCalls(): CreateSessionCommand[] {
    return [...this.createSessionCalls];
  }

  /**
   * Get all updateSession calls
   */
  getUpdateSessionCalls(): UpdateSessionCommand[] {
    return [...this.updateSessionCalls];
  }

  /**
   * Get all deleteSession calls
   */
  getDeleteSessionCalls(): string[] {
    return [...this.deleteSessionCalls];
  }

  /**
   * Get all cleanupExpiredSessions calls
   */
  getCleanupExpiredSessionsCalls(): number[] {
    return [...this.cleanupExpiredSessionsCalls];
  }

  /**
   * Reset all call tracking
   */
  resetCalls(): void {
    this.createSessionCalls = [];
    this.updateSessionCalls = [];
    this.deleteSessionCalls = [];
    this.cleanupExpiredSessionsCalls = [];
    this.expectedDeleteCalls = [];
  }

  // Implementation of SessionApplicationService interface

  async createSession(command: CreateSessionCommand): Promise<SessionOperationResult> {
    this.createSessionCalls.push({ ...command });
    return { ...this.createSessionResult };
  }

  async getSession(sessionKey: string): Promise<SessionStateDto | null> {
    return this.mockSessions.get(sessionKey) ?? null;
  }

  async updateSession(command: UpdateSessionCommand): Promise<SessionOperationResult> {
    this.updateSessionCalls.push({ ...command });
    return { ...this.updateSessionResult };
  }

  async deleteSession(sessionKey: string): Promise<SessionOperationResult> {
    this.deleteSessionCalls.push(sessionKey);
    
    // If this was an expected delete call (from expiration), remove the session from mocks
    if (this.expectedDeleteCalls.includes(sessionKey)) {
      this.mockSessions.set(sessionKey, null);
      this.expectedDeleteCalls.splice(this.expectedDeleteCalls.indexOf(sessionKey), 1);
    }
    
    return { ...this.deleteSessionResult };
  }

  async getProjectSessions(projectId: string): Promise<SessionStateDto[]> {
    return this.mockProjectSessionsMap.get(projectId) ?? [];
  }

  async addActiveIssue(sessionKey: string, issueId: string): Promise<SessionOperationResult> {
    this.updateSessionCalls.push({
      sessionKey,
      contextUpdate: { activeIssues: [issueId] } // Simplified for mock
    });
    return { ...this.updateSessionResult };
  }

  async removeActiveIssue(sessionKey: string, issueId: string): Promise<SessionOperationResult> {
    this.updateSessionCalls.push({
      sessionKey,
      contextUpdate: { activeIssues: [] } // Simplified for mock
    });
    return { ...this.updateSessionResult };
  }

  async cleanupExpiredSessions(maxAge: number): Promise<SessionOperationResult> {
    this.cleanupExpiredSessionsCalls.push(maxAge);
    return { ...this.cleanupExpiredSessionsResult };
  }
}