import { randomUUID } from 'node:crypto';

export class WorkflowId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static generate(): WorkflowId {
    return new WorkflowId(randomUUID());
  }

  static from(value: string): WorkflowId {
    if (!value || typeof value !== 'string') {
      throw new Error('WorkflowId value must be a non-empty string');
    }

    const trimmedValue = value.trim();
    
    if (trimmedValue.length === 0) {
      throw new Error('WorkflowId value cannot be empty or whitespace');
    }

    // Basic UUID v4 format validation
    const uuidRegex = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

    if (!uuidRegex.test(trimmedValue)) {
      throw new Error('WorkflowId value must be a valid UUID v4');
    }

    return new WorkflowId(trimmedValue);
  }

  get value(): string {
    return this._value;
  }

  equals(other: WorkflowId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}