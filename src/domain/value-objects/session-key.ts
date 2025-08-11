import { randomUUID } from 'node:crypto';

/**
 * Session Key value object that ensures cryptographically secure session identifiers
 */
export class SessionKey {
  private readonly _value: string;

  constructor(value?: string) {
    if (value) {
      this.validateSessionKey(value);
      this._value = value;
    } else {
      this._value = this.generateSecureKey();
    }
  }

  /**
   * Get the session key value
   */
  get value(): string {
    return this._value;
  }

  /**
   * Generate a cryptographically secure session key
   */
  private generateSecureKey(): string {
    return randomUUID();
  }

  /**
   * Validate session key format
   */
  private validateSessionKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new Error('Session key must be a non-empty string');
    }

    if (key.length < 8) {
      throw new Error('Session key must be at least 8 characters long');
    }
  }

  /**
   * Compare with another SessionKey
   */
  equals(other: SessionKey): boolean {
    return this._value === other._value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this._value;
  }

  /**
   * Static factory method to create new session key
   */
  static generate(): SessionKey {
    return new SessionKey();
  }

  /**
   * Static factory method to create from existing value
   */
  static from(value: string): SessionKey {
    return new SessionKey(value);
  }
}
