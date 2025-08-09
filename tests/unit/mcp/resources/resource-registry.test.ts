/**
 * Resource Registry Tests
 *
 * Tests for the resource registry system that manages lifecycle operations,
 * discovery, cleanup, and coordination of JCVD MCP resources.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { BaseResource } from '../../../../src/mcp/resources/base-resource.js';
import { ResourceRegistry } from '../../../../src/mcp/resources/resource-registry.js';

import type {
  Resource,
  ResourceMetadata,
  ResourceContent,
} from '../../../../src/mcp/resources/resource-interface.js';

describe('ResourceRegistry', () => {
  // Helper function to create a fresh registry for each test
  const createRegistry = () => new ResourceRegistry();

  // Helper function to create test resources
  const createTestResource = (
    options: {
      uri?: string;
      name?: string;
      contentType?: string;
      capabilities?: string[];
    } = {}
  ) => {
    const mockContent = vi.fn().mockResolvedValue({
      content: { test: 'data' },
      contentType: options.contentType || 'application/json',
      size: 15,
    });

    const metadata: ResourceMetadata = {
      name: options.name || 'Test Resource',
      description: 'A test resource',
      contentType: options.contentType || 'application/json',
      version: '1.0.0',
      capabilities: options.capabilities || ['read'],
    };

    return new BaseResource(
      options.uri || 'jcvd://project/test-123/context',
      metadata,
      mockContent
    );
  };

  describe('Resource Registration', () => {
    it('should register resources successfully', () => {
      const registry = createRegistry();
      const resource = createTestResource();

      registry.register(resource);

      expect(registry.has(resource.uri)).toBe(true);
      expect(registry.get(resource.uri)).toBe(resource);
    });

    it('should prevent duplicate resource registration', () => {
      const registry = createRegistry();
      const resource1 = createTestResource({ uri: 'jcvd://project/test/duplicate' });
      const resource2 = createTestResource({ uri: 'jcvd://project/test/duplicate' });

      registry.register(resource1);

      expect(() => {
        registry.register(resource2);
      }).toThrow('Resource already registered');
    });

    it('should register multiple different resources', () => {
      const registry = createRegistry();
      const resource1 = createTestResource({ uri: 'jcvd://project/test/resource1' });
      const resource2 = createTestResource({ uri: 'jcvd://project/test/resource2' });

      registry.register(resource1);
      registry.register(resource2);

      expect(registry.getAll()).toHaveLength(2);
      expect(registry.has(resource1.uri)).toBe(true);
      expect(registry.has(resource2.uri)).toBe(true);
    });

    it('should track registration timestamps', () => {
      const registry = createRegistry();
      const resource = createTestResource();

      const beforeRegistration = Date.now();

      registry.register(resource);
      const afterRegistration = Date.now();

      const info = registry.getResourceInfo(resource.uri);

      expect(info.registeredAt).toBeGreaterThanOrEqual(beforeRegistration);
      expect(info.registeredAt).toBeLessThanOrEqual(afterRegistration);
    });
  });

  describe('Resource Unregistration', () => {
    it('should unregister resources successfully', () => {
      const registry = createRegistry();
      const resource = createTestResource();

      registry.register(resource);
      expect(registry.has(resource.uri)).toBe(true);

      registry.unregister(resource.uri);
      expect(registry.has(resource.uri)).toBe(false);
      expect(registry.get(resource.uri)).toBeUndefined();
    });

    it('should handle unregistration of non-existent resources gracefully', () => {
      const registry = createRegistry();

      expect(() => {
        registry.unregister('jcvd://project/non-existent/resource');
      }).not.toThrow();
    });

    it('should emit events when resources are unregistered', () => {
      const registry = createRegistry();
      const resource = createTestResource();
      const eventListener = vi.fn();

      registry.on('resource-unregistered', eventListener);
      registry.register(resource);
      registry.unregister(resource.uri);

      expect(eventListener).toHaveBeenCalledWith({
        uri: resource.uri,
        resource: resource,
        unregisteredAt: expect.any(Number),
      });
    });
  });

  describe('Resource Discovery', () => {
    it('should find resources by project ID', () => {
      const registry = createRegistry();
      const resource1 = createTestResource({ uri: 'jcvd://project/proj-123/context' });
      const resource2 = createTestResource({ uri: 'jcvd://project/proj-123/tasks' });
      const resource3 = createTestResource({ uri: 'jcvd://project/proj-456/context' });

      registry.register(resource1);
      registry.register(resource2);
      registry.register(resource3);

      const proj123Resources = registry.findByProjectId('proj-123');

      expect(proj123Resources).toHaveLength(2);
      expect(proj123Resources.map(r => r.uri)).toContain('jcvd://project/proj-123/context');
      expect(proj123Resources.map(r => r.uri)).toContain('jcvd://project/proj-123/tasks');

      const proj456Resources = registry.findByProjectId('proj-456');

      expect(proj456Resources).toHaveLength(1);
      expect(proj456Resources[0].uri).toBe('jcvd://project/proj-456/context');
    });

    it('should find resources by content type', () => {
      const registry = createRegistry();
      const jsonResource1 = createTestResource({
        uri: 'jcvd://project/test/json1',
        contentType: 'application/json',
      });
      const jsonResource2 = createTestResource({
        uri: 'jcvd://project/test/json2',
        contentType: 'application/json',
      });
      const textResource = createTestResource({
        uri: 'jcvd://project/test/text',
        contentType: 'text/plain',
      });

      registry.register(jsonResource1);
      registry.register(jsonResource2);
      registry.register(textResource);

      const jsonResources = registry.findByContentType('application/json');

      expect(jsonResources).toHaveLength(2);

      const textResources = registry.findByContentType('text/plain');

      expect(textResources).toHaveLength(1);
    });

    it('should find resources by capability', () => {
      const registry = createRegistry();
      const readOnlyResource = createTestResource({
        uri: 'jcvd://project/test/readonly',
        capabilities: ['read'],
      });
      const readWriteResource = createTestResource({
        uri: 'jcvd://project/test/readwrite',
        capabilities: ['read', 'write'],
      });

      registry.register(readOnlyResource);
      registry.register(readWriteResource);

      const readCapableResources = registry.findByCapability('read');

      expect(readCapableResources).toHaveLength(2);

      const writeCapableResources = registry.findByCapability('write');

      expect(writeCapableResources).toHaveLength(1);
      expect(writeCapableResources[0].uri).toBe('jcvd://project/test/readwrite');
    });

    it('should find resources matching URI pattern', () => {
      const registry = createRegistry();
      const contextResource = createTestResource({ uri: 'jcvd://project/test-123/context' });
      const tasksResource = createTestResource({ uri: 'jcvd://project/test-123/tasks/unblocked' });
      const dependenciesResource = createTestResource({
        uri: 'jcvd://project/test-456/dependencies',
      });

      registry.register(contextResource);
      registry.register(tasksResource);
      registry.register(dependenciesResource);

      const test123Resources = registry.findByPattern('jcvd://project/test-123/*');

      expect(test123Resources).toHaveLength(2);

      const taskResources = registry.findByPattern('jcvd://project/*/tasks/*');

      expect(taskResources).toHaveLength(1);
      expect(taskResources[0].uri).toBe('jcvd://project/test-123/tasks/unblocked');
    });
  });

  describe('Resource Lifecycle Events', () => {
    it('should emit events when resources are registered', () => {
      const registry = createRegistry();
      const resource = createTestResource();
      const eventListener = vi.fn();

      registry.on('resource-registered', eventListener);
      registry.register(resource);

      expect(eventListener).toHaveBeenCalledWith({
        uri: resource.uri,
        resource: resource,
        registeredAt: expect.any(Number),
      });
    });

    it('should emit batch registration events', () => {
      const registry = createRegistry();
      const resources = [
        createTestResource({ uri: 'jcvd://project/test/resource1' }),
        createTestResource({ uri: 'jcvd://project/test/resource2' }),
        createTestResource({ uri: 'jcvd://project/test/resource3' }),
      ];
      const eventListener = vi.fn();

      registry.on('batch-registered', eventListener);
      registry.registerBatch(resources);

      expect(eventListener).toHaveBeenCalledWith({
        resources: resources,
        count: 3,
        registeredAt: expect.any(Number),
      });
    });

    it('should emit cleanup events', () => {
      const registry = createRegistry();
      const resource = createTestResource();
      const eventListener = vi.fn();

      registry.on('cleanup-completed', eventListener);
      registry.register(resource);
      registry.cleanup();

      expect(eventListener).toHaveBeenCalledWith({
        cleanupType: 'full',
        resourcesRemoved: 1,
        completedAt: expect.any(Number),
      });
    });
  });

  describe('Batch Operations', () => {
    it('should register multiple resources in batch', () => {
      const registry = createRegistry();
      const resources = [
        createTestResource({ uri: 'jcvd://project/test/resource1' }),
        createTestResource({ uri: 'jcvd://project/test/resource2' }),
        createTestResource({ uri: 'jcvd://project/test/resource3' }),
      ];

      registry.registerBatch(resources);

      expect(registry.getAll()).toHaveLength(3);
      resources.forEach(resource => {
        expect(registry.has(resource.uri)).toBe(true);
      });
    });

    it('should unregister multiple resources in batch', () => {
      const registry = createRegistry();
      const resources = [
        createTestResource({ uri: 'jcvd://project/test/resource1' }),
        createTestResource({ uri: 'jcvd://project/test/resource2' }),
        createTestResource({ uri: 'jcvd://project/test/resource3' }),
      ];

      registry.registerBatch(resources);
      expect(registry.getAll()).toHaveLength(3);

      const urisToRemove = [resources[0].uri, resources[2].uri];

      registry.unregisterBatch(urisToRemove);

      expect(registry.getAll()).toHaveLength(1);
      expect(registry.has(resources[1].uri)).toBe(true);
      expect(registry.has(resources[0].uri)).toBe(false);
      expect(registry.has(resources[2].uri)).toBe(false);
    });
  });

  describe('Resource Health and Statistics', () => {
    it('should track resource access statistics', async () => {
      const registry = createRegistry();
      const resource = createTestResource();

      registry.register(resource);

      // Simulate resource access through the registry
      registry.get(resource.uri);
      registry.get(resource.uri);

      const stats = registry.getResourceStatistics(resource.uri);

      expect(stats.accessCount).toBe(2);
      expect(stats.lastAccessed).toBeGreaterThan(0);
    });

    it('should check resource availability', async () => {
      const registry = createRegistry();
      const resource = createTestResource();

      registry.register(resource);

      const availability = await registry.checkResourceHealth(resource.uri);

      expect(availability.isAvailable).toBe(true);
      expect(availability.checkedAt).toBeGreaterThan(0);
    });

    it('should get registry statistics', () => {
      const registry = createRegistry();
      const resources = [
        createTestResource({ uri: 'jcvd://project/test/resource1' }),
        createTestResource({ uri: 'jcvd://project/test/resource2' }),
      ];

      registry.registerBatch(resources);

      const stats = registry.getRegistryStatistics();

      expect(stats.totalResources).toBe(2);
      expect(stats.resourcesByProject).toHaveProperty('test');
      expect(stats.resourcesByContentType).toHaveProperty('application/json');
    });
  });

  describe('Cleanup and Maintenance', () => {
    it('should cleanup all resources', () => {
      const registry = createRegistry();
      const resources = [
        createTestResource({ uri: 'jcvd://project/test/resource1' }),
        createTestResource({ uri: 'jcvd://project/test/resource2' }),
      ];

      registry.registerBatch(resources);
      expect(registry.getAll()).toHaveLength(2);

      registry.cleanup();
      expect(registry.getAll()).toHaveLength(0);
    });

    it('should cleanup resources by project', () => {
      const registry = createRegistry();
      const proj1Resources = [
        createTestResource({ uri: 'jcvd://project/proj1/resource1' }),
        createTestResource({ uri: 'jcvd://project/proj1/resource2' }),
      ];
      const proj2Resources = [createTestResource({ uri: 'jcvd://project/proj2/resource1' })];

      registry.registerBatch([...proj1Resources, ...proj2Resources]);
      expect(registry.getAll()).toHaveLength(3);

      registry.cleanupByProject('proj1');
      expect(registry.getAll()).toHaveLength(1);
      expect(registry.findByProjectId('proj1')).toHaveLength(0);
      expect(registry.findByProjectId('proj2')).toHaveLength(1);
    });

    it('should cleanup stale resources based on age', async () => {
      const registry = createRegistry();
      const resource = createTestResource();

      registry.register(resource);
      expect(registry.getAll()).toHaveLength(1);

      // Wait a bit longer to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Cleanup resources older than 5ms (should remove the resource)
      const removed = registry.cleanupStale(5);

      expect(removed).toBe(1);
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle resource registration errors gracefully', () => {
      const registry = createRegistry();

      // Try to register a resource with invalid URI
      expect(() => {
        const invalidResource = {
          uri: 'invalid-uri-format',
          metadata: {
            name: 'Invalid Resource',
            description: 'Test',
            contentType: 'application/json',
            version: '1.0.0',
            capabilities: ['read'],
          },
        } as Resource;

        registry.register(invalidResource);
      }).toThrow();
    });

    it('should handle batch registration partial failures', () => {
      const registry = createRegistry();
      const validResource = createTestResource({ uri: 'jcvd://project/test/valid' });
      const invalidResource = {
        uri: 'invalid-uri',
        metadata: {
          name: 'Invalid',
          description: 'Test',
          contentType: 'application/json',
          version: '1.0.0',
          capabilities: ['read'],
        },
      } as Resource;

      const result = registry.registerBatchSafe([validResource, invalidResource]);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(registry.getAll()).toHaveLength(1);
      expect(registry.has(validResource.uri)).toBe(true);
    });
  });
});
