/**
 * Time provider interface for testable time-dependent operations
 * Part of testability architecture requirements in CLAUDE.md
 */
export interface TimeProvider {
  /**
   * Get current time
   */
  now(): Date;
}

/**
 * Real time provider for production use
 */
export class RealTimeProvider implements TimeProvider {
  now(): Date {
    return new Date();
  }
}

/**
 * Mock time provider for testing
 */
export class MockTimeProvider implements TimeProvider {
  private currentTime: Date = new Date('2024-01-01T00:00:00.000Z');
  
  now(): Date {
    return new Date(this.currentTime);
  }
  
  /**
   * Set the current time for testing
   */
  setTime(time: string | Date): void {
    this.currentTime = typeof time === 'string' ? new Date(time) : new Date(time);
  }
  
  /**
   * Advance time by specified milliseconds
   */
  advance(milliseconds: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + milliseconds);
  }
  
  /**
   * Reset to default test time
   */
  reset(): void {
    this.currentTime = new Date('2024-01-01T00:00:00.000Z');
  }
}