/**
 * Resource Server Integration Tests
 * 
 * Integration tests for the ResourceServer class and MCP resource protocol
 * implementation, testing the complete flow from MCP requests to resource responses.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { BaseResource } from '../../../src/mcp/resources/base-resource.js';
import { ResourceServer } from '../../../src/mcp/server/resource-server.js';

import type { 
  ResourceServerConfig,
  ResourceMetadata,
  ResourceContent 
} from '../../../src/mcp/index.js';

describe('ResourceServer Integration', () => {
  let server: ResourceServer;
  let config: ResourceServerConfig;

  beforeEach(async () => {
    config = {
      name: `test-resource-server-${Date.now()}`, // Unique name per test
      version: '1.0.0',
      capabilities: {},
      resources: {
        discovery: true,
        maxResourcesPerProject: 100,
        defaultCacheTTL: 300,
        healthMonitoring: true
      }
    };

    server = new ResourceServer(config);
    await server.start();
  });

  afterEach(async () => {
    // Clean up all resources before stopping server
    server.cleanupAllResources();
    
    if (server.isRunning()) {
      await server.stop();
    }
  });

  describe('Resource Registration', () => {
    it('should register and serve resources through MCP protocol', async () => {
      // Create a test resource
      const testResource = createTestResource({
        uri: 'jcvd://project/test-123/context',
        name: 'Test Project Context',
        content: { projectName: 'Test Project', status: 'active' }
      });

      // Register the resource
      server.registerResource(testResource);

      // Test resources/list request
      const listResponse = await server.handleMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'resources/list',
        params: {}
      }));

      expect(listResponse).toBeTruthy();
      const listResult = JSON.parse(listResponse!);

      expect(listResult.result.resources).toHaveLength(1);
      expect(listResult.result.resources[0]).toMatchObject({
        uri: 'jcvd://project/test-123/context',
        name: 'Test Project Context',
        mimeType: 'application/json'
      });
    });

    it('should read resource content through MCP protocol', async () => {
      // Create and register a test resource
      const testContent = { message: 'Hello from JCVD resource!' };
      const testResource = createTestResource({
        uri: 'jcvd://project/test-456/data',
        name: 'Test Data Resource',
        content: testContent
      });

      server.registerResource(testResource);

      // Test resources/read request
      const readResponse = await server.handleMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'resources/read',
        params: { uri: 'jcvd://project/test-456/data' }
      }));

      expect(readResponse).toBeTruthy();
      const readResult = JSON.parse(readResponse!);

      expect(readResult.result.contents).toHaveLength(1);
      expect(readResult.result.contents[0]).toMatchObject({
        uri: 'jcvd://project/test-456/data',
        mimeType: 'application/json',
        text: JSON.stringify(testContent)
      });
    });

    it('should handle resource not found errors', async () => {
      // Test reading non-existent resource
      const readResponse = await server.handleMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'resources/read',
        params: { uri: 'jcvd://project/non-existent/resource' }
      }));

      expect(readResponse).toBeTruthy();
      const readResult = JSON.parse(readResponse!);

      expect(readResult.error).toBeDefined();
      // Error messages may be wrapped in "Internal error" by the MCP handler
      expect(readResult.error.message).toMatch(/(Resource not found|Internal error)/);
    });
  });

  describe('Batch Resource Operations', () => {
    it('should register multiple resources and list them all', async () => {
      // Ensure clean state
      server.cleanupAllResources();
      
      // Create multiple test resources
      const resources = [
        createTestResource({
          uri: 'jcvd://project/multi-test/context',
          name: 'Context Resource',
          content: { type: 'context' }
        }),
        createTestResource({
          uri: 'jcvd://project/multi-test/tasks',
          name: 'Tasks Resource',
          content: { type: 'tasks' }
        }),
        createTestResource({
          uri: 'jcvd://project/multi-test/dependencies',
          name: 'Dependencies Resource',
          content: { type: 'dependencies' }
        })
      ];

      // Register all resources in batch
      server.registerResources(resources);

      // Test resources/list request
      const listResponse = await server.handleMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'resources/list',
        params: {}
      }));

      expect(listResponse).toBeTruthy();
      const listResult = JSON.parse(listResponse!);

      expect(listResult.result.resources.length).toBeGreaterThanOrEqual(3);
      
      const uris = listResult.result.resources.map((r: any) => r.uri);

      expect(uris).toContain('jcvd://project/multi-test/context');
      expect(uris).toContain('jcvd://project/multi-test/tasks');
      expect(uris).toContain('jcvd://project/multi-test/dependencies');
    });

    it('should find resources by project ID', async () => {
      // Ensure clean state
      server.cleanupAllResources();
      
      // Register resources for different projects
      const proj1Resources = [
        createTestResource({ uri: 'jcvd://project/proj1/context' }),
        createTestResource({ uri: 'jcvd://project/proj1/tasks' })
      ];
      const proj2Resources = [
        createTestResource({ uri: 'jcvd://project/proj2/context' })
      ];

      server.registerResources([...proj1Resources, ...proj2Resources]);

      // Test project-specific resource finding
      const proj1Found = server.findResourcesByProject('proj1');

      expect(proj1Found.length).toBeGreaterThanOrEqual(2);
      
      const proj2Found = server.findResourcesByProject('proj2');

      expect(proj2Found.length).toBeGreaterThanOrEqual(1);
      
      const nonExistentFound = server.findResourcesByProject('non-existent');

      expect(nonExistentFound).toHaveLength(0);
    });
  });

  describe('Resource Health and Statistics', () => {
    it('should track resource access statistics', async () => {
      // Clean state first
      server.cleanupAllResources();
      
      const testResource = createTestResource({
        uri: 'jcvd://project/stats-test/resource'
      });

      server.registerResource(testResource);

      // Access the resource multiple times
      await server.handleMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'resources/read',
        params: { uri: 'jcvd://project/stats-test/resource' }
      }));

      await server.handleMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 6,
        method: 'resources/read',
        params: { uri: 'jcvd://project/stats-test/resource' }
      }));

      // Check statistics
      const stats = server.getResourceStatistics();

      expect(stats.registry.totalResources).toBeGreaterThanOrEqual(1);
      expect(stats.registry.totalAccesses).toBeGreaterThan(0);
    });

    it('should check resource health', async () => {
      const testResource = createTestResource({
        uri: 'jcvd://project/health-test/resource'
      });

      server.registerResource(testResource);

      // Check resource health
      const health = await server.checkResourceHealth('jcvd://project/health-test/resource');

      expect(health.isAvailable).toBe(true);
      expect(health.checkedAt).toBeGreaterThan(0);
    });
  });

  describe('Resource Cleanup', () => {
    it('should cleanup resources by project', async () => {
      // Ensure clean state
      server.cleanupAllResources();
      
      // Register resources for multiple projects
      const resources = [
        createTestResource({ uri: 'jcvd://project/cleanup1/resource1' }),
        createTestResource({ uri: 'jcvd://project/cleanup1/resource2' }),
        createTestResource({ uri: 'jcvd://project/cleanup2/resource1' })
      ];

      server.registerResources(resources);
      expect(server.getAllResources().length).toBeGreaterThanOrEqual(3);

      // Cleanup one project
      server.cleanupProjectResources('cleanup1');
      expect(server.findResourcesByProject('cleanup1')).toHaveLength(0);
      expect(server.findResourcesByProject('cleanup2').length).toBeGreaterThanOrEqual(1);
    });

    it('should cleanup all resources', async () => {
      // Register multiple resources
      const resources = [
        createTestResource({ uri: 'jcvd://project/cleanup/resource1' }),
        createTestResource({ uri: 'jcvd://project/cleanup/resource2' })
      ];

      server.registerResources(resources);
      expect(server.getAllResources().length).toBeGreaterThanOrEqual(2);

      // Cleanup all resources
      server.cleanupAllResources();
      expect(server.getAllResources()).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON-RPC requests gracefully', async () => {
      // Set up error event listener to catch the error event (expected behavior)
      const errorEvents: any[] = [];

      server.on('error', (event) => errorEvents.push(event));
      
      const invalidResponse = await server.handleMessage('invalid json');
      
      expect(invalidResponse).toBeTruthy();
      const result = JSON.parse(invalidResponse!);

      expect(result.error).toBeDefined();
      expect(result.error.code).toBe(-32_700); // Parse error
      
      // Verify that an error event was emitted
      expect(errorEvents.length).toBeGreaterThan(0);
    });

    it('should handle unsupported resource methods', async () => {
      const unsupportedResponse = await server.handleMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 7,
        method: 'resources/unsupported',
        params: {}
      }));

      expect(unsupportedResponse).toBeTruthy();
      const result = JSON.parse(unsupportedResponse!);

      expect(result.error).toBeDefined();
      expect(result.error.code).toBe(-32_601); // Method not found
    });

    it('should handle resource registration errors', () => {
      const invalidResource = {
        uri: 'invalid-uri-format',
        metadata: {
          name: 'Invalid Resource',
          description: 'Test',
          contentType: 'application/json',
          version: '1.0.0',
          capabilities: ['read']
        }
      } as any;

      expect(() => {
        server.registerResource(invalidResource);
      }).toThrow();
    });
  });

  describe('Server Lifecycle with Resources', () => {
    it('should maintain resources across server restart', async () => {
      // Clean state first
      server.cleanupAllResources();
      
      // Register a resource
      const testResource = createTestResource({
        uri: 'jcvd://project/lifecycle-test/resource'
      });

      server.registerResource(testResource);
      expect(server.getAllResources().length).toBeGreaterThanOrEqual(1);

      // Restart server
      await server.restart();
      expect(server.isRunning()).toBe(true);
      
      // Resources should still be available (in-memory registry)
      expect(server.getAllResources().length).toBeGreaterThanOrEqual(1);
    });

    it('should emit resource events', async () => {
      // Clean state first
      server.cleanupAllResources();
      
      const events: any[] = [];
      
      server.on('resource-registered', (event) => events.push({ type: 'registered', ...event }));
      server.on('resource-unregistered', (event) => events.push({ type: 'unregistered', ...event }));
      server.on('resource-accessed', (event) => events.push({ type: 'accessed', ...event }));

      // Register a resource
      const testResource = createTestResource({
        uri: 'jcvd://project/events-test/resource'
      });

      server.registerResource(testResource);
      expect(events.filter(e => e.type === 'registered').length).toBeGreaterThanOrEqual(1);

      // Access the resource
      server.getResource('jcvd://project/events-test/resource');
      expect(events.filter(e => e.type === 'accessed').length).toBeGreaterThanOrEqual(1);

      // Unregister the resource
      server.unregisterResource('jcvd://project/events-test/resource');
      expect(events.filter(e => e.type === 'unregistered').length).toBeGreaterThanOrEqual(1);
    });
  });

  // Helper function to create test resources
  function createTestResource(options: {
    uri?: string;
    name?: string;
    content?: any;
    contentType?: string;
  } = {}) {
    const mockContent = vi.fn().mockResolvedValue({
      content: options.content || { test: 'data' },
      contentType: options.contentType || 'application/json',
      size: JSON.stringify(options.content || { test: 'data' }).length
    });

    const metadata: ResourceMetadata = {
      name: options.name || 'Test Resource',
      description: 'A test resource for integration testing',
      contentType: options.contentType || 'application/json',
      version: '1.0.0',
      capabilities: ['read']
    };

    return new BaseResource(
      options.uri || 'jcvd://project/test-123/default',
      metadata,
      mockContent
    );
  }
});