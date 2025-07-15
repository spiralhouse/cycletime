// Jest setup file for AI service tests

// Set default Redis URL for tests if not provided
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}

describe('Jest Setup', () => {
  it('should be configured correctly', () => {
    expect(true).toBe(true);
  });
});