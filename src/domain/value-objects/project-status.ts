export class ProjectStatus {
  static readonly Planning = 'Planning';
  static readonly Active = 'Active';
  static readonly OnHold = 'OnHold';
  static readonly Completed = 'Completed';
  static readonly Archived = 'Archived';

  static isValid(value: any): boolean {
    if (typeof value !== 'string') return false;

    return ['Planning', 'Active', 'OnHold', 'Completed', 'Archived'].includes(value);
  }

  static canTransition(from: string, to: string): boolean {
    const transitions: Record<string, string[]> = {
      'Planning': ['Active', 'OnHold', 'Archived'],
      'Active': ['OnHold', 'Completed', 'Archived'],
      'OnHold': ['Active', 'Planning', 'Archived'],
      'Completed': ['Archived'],
      'Archived': []
    };

    return transitions[from]?.includes(to) ?? false;
  }

  static isActive(status: string): boolean {
    return ['Planning', 'Active', 'OnHold'].includes(status);
  }
}