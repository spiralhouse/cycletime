/**
 * Integration test for database functionality
 */

import { describe, it, expect } from 'vitest';
import { testDatabase, testDatabaseFile } from '../../src/database/hello-db.js';

describe('Database Integration Tests', () => {
  it('should successfully connect to and use in-memory SQLite database', () => {
    const result = testDatabase();

    expect(result.success).toBe(true);
    expect(result.message).toContain('successfully');
    expect(result.data).toBeDefined();
    expect(result.data?.originalMessage).toBe('Hello from JCVD!');
    expect(result.data?.updatedMessage).toBe('Hello from JCVD - Updated!');
    expect(result.data?.insertId).toBeDefined();
  });

  it('should successfully connect to and use file-based SQLite database', () => {
    const result = testDatabaseFile();

    expect(result.success).toBe(true);
    expect(result.message).toContain('successfully');
    expect(result.data).toBeDefined();
    expect(result.data?.message).toBe('Hello from JCVD file database!');
    expect(result.data?.dbFile).toBe('./test-jcvd.db');
    expect(result.data?.insertId).toBeDefined();
  });
});
