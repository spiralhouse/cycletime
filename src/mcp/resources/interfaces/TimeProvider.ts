/**
 * Time Provider Interface
 * Enables testable time-dependent functionality
 */

/**
 * Interface for time providers (real and mock implementations)
 * This enables deterministic testing of time-dependent features
 */
export interface TimeProvider {
  /**
   * Get the current time
   * @returns Current date/time
   */
  now: () => Date;

  /**
   * Get the current timestamp in milliseconds
   * @returns Current timestamp
   */
  timestamp: () => number;

  /**
   * Create a timeout that calls a function after a delay
   * @param callback - Function to call
   * @param delay - Delay in milliseconds
   * @returns Timeout identifier for cancellation
   */
  setTimeout: (callback: () => void, delay: number) => NodeJS.Timeout;

  /**
   * Clear a timeout
   * @param timeoutId - Timeout identifier to clear
   */
  clearTimeout: (timeoutId: NodeJS.Timeout) => void;

  /**
   * Create an interval that repeatedly calls a function
   * @param callback - Function to call
   * @param interval - Interval in milliseconds
   * @returns Interval identifier for cancellation
   */
  setInterval: (callback: () => void, interval: number) => NodeJS.Timeout;

  /**
   * Clear an interval
   * @param intervalId - Interval identifier to clear
   */
  clearInterval: (intervalId: NodeJS.Timeout) => void;
}