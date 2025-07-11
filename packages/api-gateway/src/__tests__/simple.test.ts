import { describe, it, expect } from '@jest/globals';

describe('Simple Environment Tests', () => {
  it('should have test environment variables set', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.GITHUB_CLIENT_ID).toBe('test_client_id');
    expect(process.env.JWT_SECRET).toBeDefined();
  });

  it('should have correct JWT secret length', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_SECRET!.length).toBeGreaterThanOrEqual(32);
  });

  it('should pass basic math test', () => {
    expect(2 + 2).toBe(4);
    expect(Math.max(1, 2, 3)).toBe(3);
  });
});