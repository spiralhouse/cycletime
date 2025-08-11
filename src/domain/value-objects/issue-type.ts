export class IssueType {
  static readonly Epic = 'Epic';
  static readonly Story = 'Story';
  static readonly Subtask = 'Subtask';

  static isValid(value: any): boolean {
    if (typeof value !== 'string') return false;

    return ['Epic', 'Story', 'Subtask'].includes(value);
  }

  static assertValid(value: any): void {
    if (!IssueType.isValid(value)) {
      throw new Error(`Invalid issue type: ${value}. Valid types are: Epic, Story, Subtask`);
    }
  }

  static allTypes(): string[] {
    return ['Epic', 'Story', 'Subtask'];
  }
}