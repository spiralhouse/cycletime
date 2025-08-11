export class IssueStatus {
  static readonly Backlog = 'Backlog';
  static readonly Todo = 'Todo';
  static readonly InProgress = 'InProgress';
  static readonly InReview = 'InReview';
  static readonly Done = 'Done';
  static readonly Canceled = 'Canceled';
  static readonly Duplicate = 'Duplicate';

  static isValid(value: any): boolean {
    if (typeof value !== 'string') return false;

    return ['Backlog', 'Todo', 'InProgress', 'InReview', 'Done', 'Canceled', 'Duplicate'].includes(value);
  }

  static canTransition(from: string, to: string): boolean {
    const transitions: Record<string, string[]> = {
      'Backlog': ['Todo', 'Canceled', 'Duplicate'],
      'Todo': ['InProgress', 'Backlog', 'Canceled', 'Duplicate'],
      'InProgress': ['InReview', 'Done', 'Todo', 'Canceled'],
      'InReview': ['Done', 'InProgress', 'Canceled'],
      'Done': [],
      'Canceled': [],
      'Duplicate': []
    };

    return transitions[from]?.includes(to) ?? false;
  }

  static isActive(status: string): boolean {
    return ['Backlog', 'Todo', 'InProgress', 'InReview'].includes(status);
  }

  static isCompleted(status: string): boolean {
    return ['Done', 'Canceled', 'Duplicate'].includes(status);
  }
}