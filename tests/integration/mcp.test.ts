/**
 * Integration test for MCP functionality
 */

import { describe, it, expect } from 'vitest';
import { testMCPServer, testMCPTransport } from '../../src/mcp/hello-mcp.js';

describe('MCP Integration Tests', () => {
  it('should successfully create and test MCP server functionality', async () => {
    const result = await testMCPServer();

    expect(result.success).toBe(true);
    expect(result.message).toContain('successfully');
    expect(result.data).toBeDefined();
    expect(result.data?.sdkImported).toBe(true);
    expect(result.data?.serverCreated).toBe(true);
    expect(result.data?.hasRequestHandler).toBe(true);
  });

  it('should successfully create MCP transport configuration', () => {
    const result = testMCPTransport();

    expect(result.success).toBe(true);
    expect(result.message).toContain('successfully');
    expect(result.data).toBeDefined();
    expect(result.data?.transportType).toBe('stdio');
    expect(result.data?.capabilities).toEqual(['resources', 'tools', 'prompts']);
  });
});
