import type { TimeProvider } from '../../src/domain/interfaces/time-provider.js';

/**
 * Mock TimeProvider for testing time-dependent behavior without setTimeout
 */
export class MockTimeProvider implements TimeProvider {
  private currentTime: Date = new Date();

  /**
   * Get current mock time
   */
  now(): Date {
    return new Date(this.currentTime);
  }

  /**
   * Set the current time to a specific value
   */
  setTime(time: string | Date | number): void {
    if (typeof time === 'string') {
      this.currentTime = new Date(time);
    } else if (typeof time === 'number') {
      this.currentTime = new Date(time);
    } else {
      this.currentTime = new Date(time);
    }
  }

  /**
   * Advance time by specified milliseconds
   */
  advance(milliseconds: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + milliseconds);
  }

  /**
   * Reset to system time
   */
  reset(): void {
    this.currentTime = new Date();
  }

  /**
   * Get current timestamp as milliseconds
   */
  getTime(): number {
    return this.currentTime.getTime();
  }
}