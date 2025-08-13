import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ResourceRegistry } from '../../../../src/mcp/resources/ResourceRegistry.js';

import type { ResourceDescriptor, ResourceHandler } from '../../../../src/mcp/resources/types';

describe('ResourceRegistry', () => {
  let mockHandler: ResourceHandler;

  beforeEach(() => {
    mockHandler = {
      list: vi.fn().mockResolvedValue({ resources: [] }),
      read: vi.fn().mockResolvedValue({ uri: 'test://123', mimeType: 'application/json', text: '{}' })
    };
  });

  describe('Resource Registration', () => {
    it('should register a valid resource descriptor', () => {
      const registry = new ResourceRegistry();
      const descriptor: ResourceDescriptor = {
        type: 'test-resource',
        name: 'Test Resource',
        description: 'A test resource',
        mimeType: 'application/json',
        handler: mockHandler
      };

      registry.register(descriptor);
      
      expect(registry.has('test-resource')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('should register multiple resources with different types', () => {
      const registry = new ResourceRegistry();
      
      const resource1: ResourceDescriptor = {
        type: 'resource-1',
        name: 'Resource 1',
        description: 'First resource',
        handler: mockHandler
      };

      const resource2: ResourceDescriptor = {
        type: 'resource-2',
        name: 'Resource 2',
        description: 'Second resource',
        handler: mockHandler
      };

      registry.register(resource1);
      expect(registry.size).toBe(1); // After first registration
      
      registry.register(resource2);
      expect(registry.size).toBe(2); // After second registration
      expect(registry.has('resource-1')).toBe(true);
      expect(registry.has('resource-2')).toBe(true);
    });

    it('should throw error when registering duplicate resource type', () => {
      const registry = new ResourceRegistry();
      const descriptor: ResourceDescriptor = {
        type: 'duplicate',
        name: 'Duplicate Resource',
        description: 'A duplicate resource',
        handler: mockHandler
      };

      registry.register(descriptor);
      
      expect(() => {
        registry.register(descriptor);
      }).toThrow(/already registered/);
    });

    it('should throw error for invalid resource descriptor', () => {
      const registry = new ResourceRegistry();
      const invalidDescriptors = [
        { type: '', name: 'Name', description: 'Desc', handler: mockHandler },
        { type: 'Type', name: '', description: 'Desc', handler: mockHandler },
        { type: 'Type', name: 'Name', description: '', handler: mockHandler },
        { type: null as any, name: 'Name', description: 'Desc', handler: mockHandler },
      ];

      invalidDescriptors.forEach(descriptor => {
        expect(() => {
          registry.register(descriptor as ResourceDescriptor);
        }).toThrow(/Invalid resource descriptor/);
      });
    });

    it('should allow resources with same name but different types', () => {
      const registry = new ResourceRegistry();
      const resource1: ResourceDescriptor = {
        type: 'type-1',
        name: 'Same Name',
        description: 'First resource with same name',
        handler: mockHandler
      };

      const resource2: ResourceDescriptor = {
        type: 'type-2',
        name: 'Same Name',
        description: 'Second resource with same name',
        handler: mockHandler
      };

      registry.register(resource1);
      registry.register(resource2);

      expect(registry.size).toBe(2);
    });
  });

  describe('Resource Deregistration', () => {
    let registry: ResourceRegistry;

    beforeEach(() => {
      registry = new ResourceRegistry();
      const descriptor: ResourceDescriptor = {
        type: 'test-resource',
        name: 'Test Resource',
        description: 'A test resource',
        handler: mockHandler
      };

      registry.register(descriptor);
    });

    it('should unregister an existing resource', () => {
      expect(registry.has('test-resource')).toBe(true);
      
      const result = registry.unregister('test-resource');
      
      expect(result).toBe(true);
      expect(registry.has('test-resource')).toBe(false);
      expect(registry.size).toBe(0);
    });

    it('should return false when unregistering non-existent resource', () => {
      // The registry starts empty now, no resource from beforeEach
      const result = registry.unregister('non-existent');
      
      expect(result).toBe(false);
      expect(registry.size).toBe(0); // No resources registered
    });

    it('should allow re-registration after unregistering', () => {
      registry.unregister('test-resource');
      
      const newDescriptor: ResourceDescriptor = {
        type: 'test-resource',
        name: 'New Test Resource',
        description: 'A new test resource',
        handler: mockHandler
      };
      
      registry.register(newDescriptor);
      
      const retrieved = registry.get('test-resource');

      expect(retrieved?.name).toBe('New Test Resource');
    });
  });

  describe('Resource Discovery', () => {
    let registry: ResourceRegistry;

    beforeEach(() => {
      registry = new ResourceRegistry();
      const resources = [
        { type: 'resource-1', name: 'Resource 1', description: 'First resource' },
        { type: 'resource-2', name: 'Resource 2', description: 'Second resource' },
        { type: 'resource-3', name: 'Resource 3', description: 'Third resource' }
      ];

      resources.forEach(r => {
        registry.register({ ...r, handler: mockHandler });
      });
    });

    it('should list all registered resources', () => {
      const resources = registry.list();
      
      expect(resources).toHaveLength(3);
      expect(resources.map(r => r.type)).toContain('resource-1');
      expect(resources.map(r => r.type)).toContain('resource-2');
      expect(resources.map(r => r.type)).toContain('resource-3');
    });

    it('should return empty array when no resources registered', () => {
      const emptyRegistry = new ResourceRegistry();
      const resources = emptyRegistry.list();
      
      expect(resources).toEqual([]);
      expect(resources).toHaveLength(0);
    });

    it('should get specific resource by type', () => {
      const resource = registry.get('resource-2');
      
      expect(resource).toBeDefined();
      expect(resource?.type).toBe('resource-2');
      expect(resource?.name).toBe('Resource 2');
      expect(resource?.description).toBe('Second resource');
    });

    it('should return undefined for non-existent resource', () => {
      const resource = registry.get('non-existent');
      
      expect(resource).toBeUndefined();
    });

    it('should check if resource exists', () => {
      expect(registry.has('resource-1')).toBe(true);
      expect(registry.has('resource-2')).toBe(true);
      expect(registry.has('resource-3')).toBe(true);
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('Registry Management', () => {
    let registry: ResourceRegistry;

    beforeEach(() => {
      registry = new ResourceRegistry();
    });

    it('should clear all registered resources', () => {
      const resources = [
        { type: 'resource-1', name: 'Resource 1', description: 'First' },
        { type: 'resource-2', name: 'Resource 2', description: 'Second' }
      ];

      resources.forEach(r => {
        registry.register({ ...r, handler: mockHandler });
      });

      expect(registry.size).toBe(2);
      
      registry.clear();
      
      expect(registry.size).toBe(0);
      expect(registry.list()).toEqual([]);
    });

    it('should report correct size', () => {
      expect(registry.size).toBe(0);
      
      registry.register({
        type: 'test',
        name: 'Test',
        description: 'Test',
        handler: mockHandler
      });
      
      expect(registry.size).toBe(1);
      
      registry.register({
        type: 'test2',
        name: 'Test2',
        description: 'Test2',
        handler: mockHandler
      });
      
      expect(registry.size).toBe(2);
      
      registry.unregister('test');
      expect(registry.size).toBe(1);
    });
  });

  describe('Thread Safety and Concurrent Access', () => {
    it('should handle concurrent registration attempts safely', async () => {
      const registry = new ResourceRegistry();
      const resources = Array.from({ length: 10 }, (_, i) => ({
        type: `concurrent-${i}`,
        name: `Concurrent Resource ${i}`,
        description: `Resource ${i}`,
        handler: mockHandler
      }));

      // Simulate concurrent registrations
      const registrations = resources.map(r => 
        Promise.resolve().then(() => {
          registry.register(r);
        })
      );

      await Promise.all(registrations);
      
      expect(registry.size).toBe(10);
      resources.forEach((r, i) => {
        expect(registry.has(`concurrent-${i}`)).toBe(true);
      });
    });

    it('should handle concurrent read operations safely', async () => {
      const registry = new ResourceRegistry();
      const descriptor: ResourceDescriptor = {
        type: 'concurrent-read',
        name: 'Concurrent Read Test',
        description: 'Test concurrent reads',
        handler: mockHandler
      };
      
      registry.register(descriptor);

      // Simulate concurrent reads
      const reads = Array.from({ length: 100 }, () => 
        Promise.resolve().then(() => registry.get('concurrent-read'))
      );

      const results = await Promise.all(reads);
      
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result?.type).toBe('concurrent-read');
      });
    });
  });

  describe('Error Scenarios', () => {
    let registry: ResourceRegistry;

    beforeEach(() => {
      registry = new ResourceRegistry();
    });

    it('should handle null or undefined types gracefully', () => {
      expect(registry.get(null as any)).toBeUndefined();
      expect(registry.get(undefined as any)).toBeUndefined();
      expect(registry.has(null as any)).toBe(false);
      expect(registry.has(undefined as any)).toBe(false);
      expect(registry.unregister(null as any)).toBe(false);
      expect(registry.unregister(undefined as any)).toBe(false);
    });

    it('should maintain registry integrity after errors', () => {
      const validDescriptor: ResourceDescriptor = {
        type: 'valid',
        name: 'Valid Resource',
        description: 'A valid resource',
        handler: mockHandler
      };

      registry.register(validDescriptor);
      
      // Try to register invalid resource (should fail)
      try {
        registry.register({ type: '', name: 'Invalid', description: 'Invalid', handler: mockHandler });
      } catch {
        // Expected error
      }

      // Registry should still contain the valid resource
      expect(registry.size).toBe(1);
      expect(registry.has('valid')).toBe(true);
    });
  });

  describe('JCVD-Specific Resource Registration', () => {
    let registry: ResourceRegistry;

    beforeEach(() => {
      registry = new ResourceRegistry();
    });

    it('should register JCVD project context resource', () => {
      const projectContextResource: ResourceDescriptor = {
        type: 'jcvd-project-context',
        name: 'JCVD Project Context',
        description: 'Access to project metadata and current state',
        mimeType: 'application/json',
        handler: mockHandler
      };

      registry.register(projectContextResource);
      
      const retrieved = registry.get('jcvd-project-context');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('JCVD Project Context');
    });

    it('should register all four JCVD resource types', () => {
      const jcvdResources = [
        {
          type: 'jcvd-project-context',
          name: 'JCVD Project Context',
          description: 'Access to project metadata and current state'
        },
        {
          type: 'jcvd-unblocked-tasks',
          name: 'JCVD Unblocked Tasks',
          description: 'List of tasks with no blocking dependencies'
        },
        {
          type: 'jcvd-dependency-graph',
          name: 'JCVD Dependency Graph',
          description: 'Issue relationships and dependency graph structure'
        },
        {
          type: 'jcvd-issue-hierarchy',
          name: 'JCVD Issue Hierarchy',
          description: 'Epic → Story → Subtask structure'
        }
      ];

      jcvdResources.forEach(r => {
        registry.register({ ...r, handler: mockHandler });
      });

      expect(registry.size).toBe(4);
      expect(registry.list().map(r => r.type)).toEqual([
        'jcvd-project-context',
        'jcvd-unblocked-tasks',
        'jcvd-dependency-graph',
        'jcvd-issue-hierarchy'
      ]);
    });
  });
});