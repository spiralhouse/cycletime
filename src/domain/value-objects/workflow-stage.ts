export class WorkflowStage {
  private readonly _name: string;

  private constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  static readonly REQUIREMENTS = 'requirements';
  static readonly DESIGN = 'design';
  static readonly IMPLEMENTATION = 'implementation';
  static readonly TESTING = 'testing';
  static readonly DEPLOYMENT = 'deployment';

  static from(value: string): WorkflowStage {
    if (value === '') {
      throw new Error('WorkflowStage name cannot be empty or whitespace');
    }
    
    if (!value || typeof value !== 'string') {
      throw new Error('WorkflowStage name must be a non-empty string');
    }

    const trimmedValue = value.trim();
    
    if (trimmedValue.length === 0) {
      throw new Error('WorkflowStage name cannot be empty or whitespace');
    }

    if (trimmedValue.length < 3) {
      throw new Error('WorkflowStage name must be at least 3 characters long');
    }

    if (trimmedValue.length > 50) {
      throw new Error('WorkflowStage name must be no more than 50 characters long');
    }

    // Validate characters (letters, numbers, hyphens, underscores only)
    const validPattern = /^[\w-]+$/;

    if (!validPattern.test(trimmedValue)) {
      throw new Error('WorkflowStage name can only contain letters, numbers, hyphens, and underscores');
    }

    return new WorkflowStage(trimmedValue);
  }

  equals(other: WorkflowStage): boolean {
    return this._name === other._name;
  }

  toString(): string {
    return this._name;
  }
}