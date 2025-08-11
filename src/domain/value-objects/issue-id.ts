import { randomUUID } from 'node:crypto';

export class IssueId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  get value(): string {
    return this._value;
  }

  static generate(): IssueId {
    return new IssueId(randomUUID());
  }

  static from(value: string): IssueId {
    if (value === '') {
      throw new Error('IssueId value cannot be empty or whitespace');
    }
    
    if (!value || typeof value !== 'string') {
      throw new Error('IssueId value must be a non-empty string');
    }

    const trimmedValue = value.trim();
    
    if (trimmedValue.length === 0) {
      throw new Error('IssueId value cannot be empty or whitespace');
    }

    if (trimmedValue.length < 3) {
      throw new Error('IssueId value must be at least 3 characters long');
    }

    return new IssueId(trimmedValue);
  }

  equals(other: IssueId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}