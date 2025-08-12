export class RepositoryError extends Error {
  constructor(
    operation: string,
    public override readonly cause?: Error
  ) {
    super(`Repository operation failed: ${operation}`);
    this.name = 'RepositoryError';
    if (cause?.stack) {
      this.stack = cause.stack;
    }
  }
}