import { describe, it, expect, beforeEach } from 'vitest';

import { BaseResource } from '../../../../src/mcp/resources/BaseResource';

import type { 
  ResourceDescriptor, 
  ResourceHandler,
  ResourceContent,
  ResourceListResult 
} from '../../../../src/mcp/resources/types';

describe('ResourceDescriptor Interface', () => {
  describe('ResourceDescriptor Type Contract', () => {
    it('should define required fields for a resource descriptor', () => {
      // This test defines the contract for ResourceDescriptor
      const descriptor: ResourceDescriptor = {
        type: 'test-resource',
        name: 'Test Resource',
        description: 'A test resource for unit testing',
        mimeType: 'application/json',
        handler: {} as ResourceHandler
      };

      expect(descriptor.type).toBeDefined();
      expect(descriptor.name).toBeDefined();
      expect(descriptor.description).toBeDefined();
      expect(descriptor.handler).toBeDefined();
    });

    it('should allow optional mimeType field', () => {
      const descriptorWithMime: ResourceDescriptor = {
        type: 'test-resource',
        name: 'Test Resource',
        description: 'A test resource',
        mimeType: 'application/json',
        handler: {} as ResourceHandler
      };

      const descriptorWithoutMime: ResourceDescriptor = {
        type: 'test-resource',
        name: 'Test Resource',
        description: 'A test resource',
        handler: {} as ResourceHandler
      };

      expect(descriptorWithMime.mimeType).toBe('application/json');
      expect(descriptorWithoutMime.mimeType).toBeUndefined();
    });

    it('should not allow empty strings for required fields', () => {
      const createDescriptor = (type: string, name: string, description: string) => {
        if (!type || !name || !description) {
          throw new Error('Required fields cannot be empty');
        }

        return { type, name, description, handler: {} as ResourceHandler };
      };

      expect(() => createDescriptor('', 'Name', 'Desc')).toThrow('Required fields cannot be empty');
      expect(() => createDescriptor('Type', '', 'Desc')).toThrow('Required fields cannot be empty');
      expect(() => createDescriptor('Type', 'Name', '')).toThrow('Required fields cannot be empty');
    });
  });

  describe('ResourceHandler Contract', () => {
    it('should define list method returning ResourceListResult', async () => {
      const handler: ResourceHandler = {
        list: async (cursor?: string, limit?: number): Promise<ResourceListResult> => {
          return {
            resources: [],
            nextCursor: cursor
          };
        },
        read: async (uri: string): Promise<ResourceContent> => {
          return {
            uri,
            mimeType: 'application/json',
            text: '{}'
          };
        }
      };

      const result = await handler.list();

      expect(result).toHaveProperty('resources');
      expect(result.resources).toBeInstanceOf(Array);
    });

    it('should define read method returning ResourceContent', async () => {
      const handler: ResourceHandler = {
        list: async (): Promise<ResourceListResult> => {
          return { resources: [] };
        },
        read: async (uri: string): Promise<ResourceContent> => {
          return {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ data: 'test' })
          };
        }
      };

      const content = await handler.read('jcvd://test/123');

      expect(content).toHaveProperty('uri');
      expect(content).toHaveProperty('mimeType');
      expect(content).toHaveProperty('text');
      expect(content.uri).toBe('jcvd://test/123');
    });
  });
});

describe('BaseResource Abstract Class', () => {
  class TestResource extends BaseResource {
    type = 'test';
    name = 'Test Resource';
    description = 'A test resource implementation';

    async list(cursor?: string, limit?: number): Promise<ResourceListResult> {
      return {
        resources: [
          {
            uri: `${this.type}://item1`,
            name: 'Item 1',
            description: 'First item',
            mimeType: 'application/json'
          }
        ],
        nextCursor: cursor ? undefined : 'next-page'
      };
    }

    async read(uri: string): Promise<ResourceContent> {
      if (!this.validateUri(uri)) {
        throw new Error('Invalid URI format');
      }
      
      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ id: 'item1', data: 'test data' })
      };
    }
  }

  let resource: TestResource;

  beforeEach(() => {
    resource = new TestResource();
  });

  describe('URI Validation', () => {
    it('should validate URIs with correct type prefix', () => {
      expect(resource.validateUri('test://item1')).toBe(true);
      expect(resource.validateUri('test://project/123')).toBe(true);
      expect(resource.validateUri('test://project/123/context')).toBe(true);
    });

    it('should reject URIs with incorrect type prefix', () => {
      expect(resource.validateUri('wrong://item1')).toBe(false);
      expect(resource.validateUri('jcvd://item1')).toBe(false);
      expect(resource.validateUri('http://example.com')).toBe(false);
    });

    it('should reject malformed URIs', () => {
      expect(resource.validateUri('')).toBe(false);
      expect(resource.validateUri('test')).toBe(false);
      expect(resource.validateUri('test:')).toBe(false);
      expect(resource.validateUri('test:/')).toBe(false);
      expect(resource.validateUri('://test')).toBe(false);
      expect(resource.validateUri('test://')).toBe(true); // Empty path is valid
    });

    it('should handle URI encoding properly', () => {
      expect(resource.validateUri('test://item%20with%20spaces')).toBe(true);
      expect(resource.validateUri('test://item?query=value')).toBe(true);
      expect(resource.validateUri('test://item#fragment')).toBe(true);
    });

    it('should be case-sensitive for type matching', () => {
      expect(resource.validateUri('TEST://item1')).toBe(false);
      expect(resource.validateUri('Test://item1')).toBe(false);
      expect(resource.validateUri('test://item1')).toBe(true);
    });
  });

  describe('JCVD URI Format Validation', () => {
    class JCVDResource extends BaseResource {
      type = 'jcvd';
      name = 'JCVD Resource';
      description = 'JCVD-specific resource';

      async list(): Promise<ResourceListResult> {
        return { resources: [] };
      }

      async read(uri: string): Promise<ResourceContent> {
        if (!this.validateJCVDUri(uri)) {
          throw new Error('Invalid JCVD URI format');
        }

        return {
          uri,
          mimeType: 'application/json',
          text: '{}'
        };
      }

      validateJCVDUri(uri: string): boolean {
        if (!this.validateUri(uri)) return false;
        
        // JCVD URIs must follow pattern: jcvd://project/{projectId}/{resourceType}
        const pattern = /^jcvd:\/\/project\/[\dA-Za-z-]+\/(context|tasks\/unblocked|dependencies|hierarchy)$/;

        return pattern.test(uri);
      }

      extractProjectId(uri: string): string | null {
        const match = uri.match(/^jcvd:\/\/project\/([\dA-Za-z-]+)\//);

        return match ? match[1] : null;
      }

      extractResourceType(uri: string): string | null {
        const match = uri.match(/^jcvd:\/\/project\/[\dA-Za-z-]+\/(.+)$/);

        return match ? match[1] : null;
      }
    }

    let jcvdResource: JCVDResource;

    beforeEach(() => {
      jcvdResource = new JCVDResource();
    });

    it('should validate correct JCVD URI formats', () => {
      expect(jcvdResource.validateJCVDUri('jcvd://project/abc-123/context')).toBe(true);
      expect(jcvdResource.validateJCVDUri('jcvd://project/proj-456/tasks/unblocked')).toBe(true);
      expect(jcvdResource.validateJCVDUri('jcvd://project/test-789/dependencies')).toBe(true);
      expect(jcvdResource.validateJCVDUri('jcvd://project/demo-000/hierarchy')).toBe(true);
    });

    it('should reject invalid JCVD URI formats', () => {
      expect(jcvdResource.validateJCVDUri('jcvd://project/123')).toBe(false); // Missing resource type
      expect(jcvdResource.validateJCVDUri('jcvd://project//context')).toBe(false); // Empty project ID
      expect(jcvdResource.validateJCVDUri('jcvd://abc-123/context')).toBe(false); // Missing 'project' segment
      expect(jcvdResource.validateJCVDUri('jcvd://project/123/invalid')).toBe(false); // Invalid resource type
      expect(jcvdResource.validateJCVDUri('wrong://project/123/context')).toBe(false); // Wrong protocol
    });

    it('should extract project ID from valid URIs', () => {
      expect(jcvdResource.extractProjectId('jcvd://project/abc-123/context')).toBe('abc-123');
      expect(jcvdResource.extractProjectId('jcvd://project/test-project-456/dependencies')).toBe('test-project-456');
      expect(jcvdResource.extractProjectId('jcvd://invalid/uri')).toBeNull();
    });

    it('should extract resource type from valid URIs', () => {
      expect(jcvdResource.extractResourceType('jcvd://project/abc-123/context')).toBe('context');
      expect(jcvdResource.extractResourceType('jcvd://project/abc-123/tasks/unblocked')).toBe('tasks/unblocked');
      expect(jcvdResource.extractResourceType('jcvd://project/abc-123/dependencies')).toBe('dependencies');
      expect(jcvdResource.extractResourceType('jcvd://project/abc-123/hierarchy')).toBe('hierarchy');
    });

    it('should handle URI security validation', () => {
      // Path traversal attempts should be rejected
      expect(jcvdResource.validateJCVDUri('jcvd://project/../etc/passwd')).toBe(false);
      expect(jcvdResource.validateJCVDUri('jcvd://project/abc-123/../../context')).toBe(false);
      expect(jcvdResource.validateJCVDUri('jcvd://project/abc-123/context/../..')).toBe(false);
      
      // SQL injection attempts should be rejected
      expect(jcvdResource.validateJCVDUri("jcvd://project/'; DROP TABLE--/context")).toBe(false);
      expect(jcvdResource.validateJCVDUri('jcvd://project/abc-123 OR 1=1/context')).toBe(false);
    });
  });

  describe('Resource Metadata Handling', () => {
    it('should properly handle resource metadata', () => {
      const metadata = {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
        author: 'test-user',
        tags: ['test', 'unit-test'],
        permissions: {
          read: true,
          write: false,
          delete: false
        }
      };

      const descriptor: ResourceDescriptor = {
        type: 'test',
        name: 'Test Resource',
        description: 'Test resource with metadata',
        mimeType: 'application/json',
        handler: {} as ResourceHandler,
        metadata
      };

      expect(descriptor.metadata).toBeDefined();
      expect(descriptor.metadata?.version).toBe('1.0.0');
      expect(descriptor.metadata?.tags).toContain('test');
      expect(descriptor.metadata?.permissions?.read).toBe(true);
    });

    it('should handle missing optional metadata gracefully', () => {
      const descriptor: ResourceDescriptor = {
        type: 'test',
        name: 'Test Resource',
        description: 'Test resource without metadata',
        handler: {} as ResourceHandler
      };

      expect(descriptor.metadata).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    class ErrorTestResource extends BaseResource {
      type = 'error-test';
      name = 'Error Test Resource';
      description = 'Resource for testing error scenarios';

      async list(): Promise<ResourceListResult> {
        throw new Error('List operation failed');
      }

      async read(uri: string): Promise<ResourceContent> {
        if (!this.validateUri(uri)) {
          throw new Error('Invalid URI format');
        }
        
        const resourceId = uri.split('://')[1];

        if (!resourceId || resourceId === 'not-found') {
          throw new Error('Resource not found');
        }
        
        if (resourceId === 'forbidden') {
          throw new Error('Access denied');
        }
        
        if (resourceId === 'server-error') {
          throw new Error('Internal server error');
        }
        
        return {
          uri,
          mimeType: 'application/json',
          text: '{}'
        };
      }
    }

    let errorResource: ErrorTestResource;

    beforeEach(() => {
      errorResource = new ErrorTestResource();
    });

    it('should throw error for invalid URI on read', async () => {
      await expect(errorResource.read('invalid://uri')).rejects.toThrow('Invalid URI format');
    });

    it('should throw error for not found resource', async () => {
      await expect(errorResource.read('error-test://not-found')).rejects.toThrow('Resource not found');
    });

    it('should throw error for forbidden resource', async () => {
      await expect(errorResource.read('error-test://forbidden')).rejects.toThrow('Access denied');
    });

    it('should throw error for server errors', async () => {
      await expect(errorResource.read('error-test://server-error')).rejects.toThrow('Internal server error');
    });

    it('should throw error for list operation failure', async () => {
      await expect(errorResource.list()).rejects.toThrow('List operation failed');
    });
  });
});