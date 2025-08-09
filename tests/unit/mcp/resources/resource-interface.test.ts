/**
 * Resource Interface Contract Tests
 * 
 * Tests the core contract that all MCP resources must implement.
 * These tests define the expected behavior for JCVD resources.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import type { Resource, ResourceMetadata, ResourceContent } from '../../../../src/mcp/resources/resource-interface.js';

describe('Resource Interface Contract', () => {
  describe('Resource Interface', () => {
    it('should define required properties for resource identification', () => {
      // This test ensures the Resource interface has the correct shape
      // We'll create a mock implementation to validate the contract
      
      const mockResource: Resource = {
        uri: 'jcvd://project/test-123/context',
        metadata: {
          name: 'Test Resource',
          description: 'A test resource for validation',
          contentType: 'application/json',
          version: '1.0.0',
          capabilities: ['read']
        },
        getContent: async () => ({
          content: { test: 'data' },
          contentType: 'application/json',
          size: 15
        }),
        isAvailable: async () => true,
        invalidate: async () => void 0
      };

      expect(mockResource.uri).toBe('jcvd://project/test-123/context');
      expect(mockResource.metadata.name).toBe('Test Resource');
      expect(mockResource.metadata.contentType).toBe('application/json');
      expect(typeof mockResource.getContent).toBe('function');
      expect(typeof mockResource.isAvailable).toBe('function');
      expect(typeof mockResource.invalidate).toBe('function');
    });

    it('should support URI-based resource identification', () => {
      const uri = 'jcvd://project/proj-456/tasks/unblocked';
      
      // URI should follow jcvd://project/{projectId}/{resourceType} pattern
      expect(uri).toMatch(/^jcvd:\/\/project\/[\w-]+\/[\w/]+$/);
      
      // Should be able to parse project ID from URI
      const projectIdMatch = uri.match(/jcvd:\/\/project\/([\w-]+)/);

      expect(projectIdMatch).toBeTruthy();
      expect(projectIdMatch![1]).toBe('proj-456');
    });

    it('should define content type specifications', () => {
      const jsonMetadata: ResourceMetadata = {
        name: 'JSON Resource',
        description: 'Resource returning JSON data',
        contentType: 'application/json',
        version: '1.0.0',
        capabilities: ['read']
      };

      const textMetadata: ResourceMetadata = {
        name: 'Text Resource', 
        description: 'Resource returning plain text',
        contentType: 'text/plain',
        version: '1.0.0',
        capabilities: ['read']
      };

      expect(jsonMetadata.contentType).toBe('application/json');
      expect(textMetadata.contentType).toBe('text/plain');
      expect(jsonMetadata.capabilities).toContain('read');
    });

    it('should define async content generation contract', async () => {
      const mockResource: Resource = {
        uri: 'jcvd://project/test/context',
        metadata: {
          name: 'Test Resource',
          description: 'Test',
          contentType: 'application/json',
          version: '1.0.0',
          capabilities: ['read']
        },
        getContent: async () => ({
          content: { projectId: 'test', status: 'active' },
          contentType: 'application/json',
          size: 42
        }),
        isAvailable: async () => true,
        invalidate: async () => void 0
      };

      const content = await mockResource.getContent();
      
      expect(content).toHaveProperty('content');
      expect(content).toHaveProperty('contentType');
      expect(content).toHaveProperty('size');
      expect(content.contentType).toBe('application/json');
      expect(typeof content.size).toBe('number');
    });

    it('should support availability checking', async () => {
      const availableResource: Resource = {
        uri: 'jcvd://project/test/context',
        metadata: {
          name: 'Available Resource',
          description: 'Test',
          contentType: 'application/json',
          version: '1.0.0',
          capabilities: ['read']
        },
        getContent: async () => ({
          content: {},
          contentType: 'application/json',
          size: 2
        }),
        isAvailable: async () => true,
        invalidate: async () => void 0
      };

      const unavailableResource: Resource = {
        uri: 'jcvd://project/missing/context',
        metadata: {
          name: 'Unavailable Resource',
          description: 'Test',
          contentType: 'application/json',
          version: '1.0.0',
          capabilities: ['read']
        },
        getContent: async () => {
          throw new Error('Resource not available');
        },
        isAvailable: async () => false,
        invalidate: async () => void 0
      };

      expect(await availableResource.isAvailable()).toBe(true);
      expect(await unavailableResource.isAvailable()).toBe(false);
    });

    it('should support cache invalidation', async () => {
      let invalidated = false;

      const resource: Resource = {
        uri: 'jcvd://project/test/context',
        metadata: {
          name: 'Cacheable Resource',
          description: 'Test',
          contentType: 'application/json',
          version: '1.0.0',
          capabilities: ['read']
        },
        getContent: async () => ({
          content: {},
          contentType: 'application/json',
          size: 2
        }),
        isAvailable: async () => true,
        invalidate: async () => {
          invalidated = true;
        }
      };

      await resource.invalidate();
      expect(invalidated).toBe(true);
    });
  });

  describe('ResourceMetadata Interface', () => {
    it('should define complete metadata structure', () => {
      const metadata: ResourceMetadata = {
        name: 'Project Context',
        description: 'Comprehensive project context for Claude Code analysis',
        contentType: 'application/json',
        version: '1.0.0',
        capabilities: ['read'],
        tags: ['project', 'context'],
        lastModified: new Date('2025-08-01T10:00:00Z'),
        ttl: 300 // 5 minutes cache TTL
      };

      expect(metadata.name).toBe('Project Context');
      expect(metadata.description).toContain('Claude Code');
      expect(metadata.contentType).toBe('application/json');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.capabilities).toContain('read');
      expect(metadata.tags).toContain('project');
      expect(metadata.lastModified).toBeInstanceOf(Date);
      expect(metadata.ttl).toBe(300);
    });

    it('should support different capability types', () => {
      const readOnlyMetadata: ResourceMetadata = {
        name: 'Read Only Resource',
        description: 'Test',
        contentType: 'application/json',
        version: '1.0.0',
        capabilities: ['read']
      };

      const readWriteMetadata: ResourceMetadata = {
        name: 'Read Write Resource',
        description: 'Test',
        contentType: 'application/json',
        version: '1.0.0',
        capabilities: ['read', 'write']
      };

      const subscribableMetadata: ResourceMetadata = {
        name: 'Subscribable Resource',
        description: 'Test',
        contentType: 'application/json',
        version: '1.0.0',
        capabilities: ['read', 'subscribe']
      };

      expect(readOnlyMetadata.capabilities).toEqual(['read']);
      expect(readWriteMetadata.capabilities).toEqual(['read', 'write']);
      expect(subscribableMetadata.capabilities).toEqual(['read', 'subscribe']);
    });
  });

  describe('ResourceContent Interface', () => {
    it('should define content structure with metadata', () => {
      const jsonContent: ResourceContent = {
        content: {
          project: { id: 'test-123', name: 'Test Project' },
          statistics: { totalIssues: 5, completedIssues: 2 }
        },
        contentType: 'application/json',
        size: 156,
        etag: 'abc123',
        lastModified: new Date('2025-08-01T15:30:00Z')
      };

      const textContent: ResourceContent = {
        content: 'Plain text resource content',
        contentType: 'text/plain',
        size: 27
      };

      expect(jsonContent.content).toHaveProperty('project');
      expect(jsonContent.contentType).toBe('application/json');
      expect(jsonContent.size).toBe(156);
      expect(jsonContent.etag).toBe('abc123');
      expect(jsonContent.lastModified).toBeInstanceOf(Date);

      expect(textContent.content).toBe('Plain text resource content');
      expect(textContent.contentType).toBe('text/plain');
      expect(textContent.size).toBe(27);
    });

    it('should support various content types', () => {
      const contents = [
        {
          content: { data: 'json' },
          contentType: 'application/json',
          size: 16
        },
        {
          content: 'text data',
          contentType: 'text/plain',
          size: 9
        },
        {
          content: '<html><body>Test</body></html>',
          contentType: 'text/html',
          size: 30
        }
      ];

      contents.forEach(content => {
        expect(content).toHaveProperty('content');
        expect(content).toHaveProperty('contentType');
        expect(content).toHaveProperty('size');
        expect(typeof content.size).toBe('number');
      });
    });
  });
});