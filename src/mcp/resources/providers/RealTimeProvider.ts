/**
 * Real Time Provider Implementation
 * Production time provider using actual system time
 */

import type { TimeProvider } from '../interfaces/TimeProvider.js';

/**
 * Real time provider that uses actual system time
 * Used in production environments
 */
export class RealTimeProvider implements TimeProvider {
  /**
   * Get the current time
   */
  now(): Date {
    return new Date();
  }

  /**
   * Get the current timestamp in milliseconds
   */
  timestamp(): number {
    return Date.now();
  }

  /**
   * Create a timeout that calls a function after a delay
   */
  setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    return setTimeout(callback, delay);
  }

  /**
   * Clear a timeout
   */
  clearTimeout(timeoutId: NodeJS.Timeout): void {
    clearTimeout(timeoutId);
  }

  /**
   * Create an interval that repeatedly calls a function
   */
  setInterval(callback: () => void, interval: number): NodeJS.Timeout {
    return setInterval(callback, interval);
  }

  /**
   * Clear an interval
   */
  clearInterval(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
  }
}