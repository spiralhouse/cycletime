/**
 * Base Resource Implementation Tests
 *
 * Tests for the base resource class that provides common functionality
 * for all JCVD MCP resources including caching, validation, and lifecycle management.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { BaseResource } from '../../../../src/mcp/resources/base-resource.js';

import type {
  ResourceMetadata,
  ResourceContent,
} from '../../../../src/mcp/resources/resource-interface.js';

describe('BaseResource', () => {
  // Helper function to create a basic resource for tests
  const createTestResource = (
    options: {
      uri?: string;
      metadata?: Partial<ResourceMetadata>;
      mockContent?: vi.MockedFunction<any>;
      mockAvailability?: vi.MockedFunction<any>;
    } = {}
  ) => {
    const mockGetContent = options.mockContent || vi.fn();
    const mockCheckAvailability = options.mockAvailability || vi.fn();

    const defaultMetadata: ResourceMetadata = {
      name: 'Test Resource',
      description: 'A test resource for validation',
      contentType: 'application/json',
      version: '1.0.0',
      capabilities: ['read'],
      ttl: 300, // 5 minutes
      ...options.metadata,
    };

    const uri = options.uri || 'jcvd://project/test-123/context';

    return {
      resource: new BaseResource(uri, defaultMetadata, mockGetContent, mockCheckAvailability),
      mockGetContent,
      mockCheckAvailability,
    };
  };

  describe('Construction and Basic Properties', () => {
    it('should initialize with correct URI and metadata', () => {
      const { resource } = createTestResource();

      expect(resource.uri).toBe('jcvd://project/test-123/context');
      expect(resource.metadata.name).toBe('Test Resource');
      expect(resource.metadata.contentType).toBe('application/json');
      expect(resource.metadata.capabilities).toContain('read');
    });

    it('should validate URI format during construction', () => {
      expect(() => {
        createTestResource({ uri: 'invalid-uri' });
      }).toThrow('Invalid resource URI');
    });

    it('should require valid metadata during construction', () => {
      expect(() => {
        new BaseResource('jcvd://project/test/context', null as any, vi.fn(), vi.fn());
      }).toThrow('Resource metadata is required');
    });

    it('should require content provider function', () => {
      expect(() => {
        new BaseResource(
          'jcvd://project/test/context',
          {
            name: 'Test',
            description: 'Test',
            contentType: 'application/json',
            version: '1.0.0',
            capabilities: ['read'],
          },
          null as any,
          vi.fn()
        );
      }).toThrow('Content provider function is required');
    });
  });

  describe('Content Retrieval', () => {
    it('should call content provider and return content', async () => {
      const mockContent: ResourceContent = {
        content: { test: 'data' },
        contentType: 'application/json',
        size: 15,
      };

      const { resource, mockGetContent } = createTestResource();

      mockGetContent.mockResolvedValue(mockContent);

      const content = await resource.getContent();

      expect(mockGetContent).toHaveBeenCalledOnce();
      expect(content).toEqual(mockContent);
    });

    it('should handle content provider errors gracefully', async () => {
      const { resource, mockGetContent } = createTestResource({
        uri: 'jcvd://project/test-error/context',
      });

      mockGetContent.mockRejectedValue(new Error('Database connection failed'));

      await expect(resource.getContent()).rejects.toThrow('Database connection failed');
      expect(mockGetContent).toHaveBeenCalledOnce();
    });

    it('should validate content type matches metadata', async () => {
      const mockContent: ResourceContent = {
        content: { test: 'data' },
        contentType: 'text/plain', // Mismatched content type
        size: 15,
      };

      const { resource, mockGetContent } = createTestResource();

      mockGetContent.mockResolvedValue(mockContent);

      await expect(resource.getContent()).rejects.toThrow('Content type mismatch');
    });
  });

  describe('Caching Functionality', () => {
    it('should cache content when TTL is specified', async () => {
      // Create a fresh mock for this test
      const testMockGetContent = vi.fn();
      const testResource = new BaseResource(
        'jcvd://project/cache-test/context',
        {
          name: 'Cache Test Resource',
          description: 'Test',
          contentType: 'application/json',
          version: '1.0.0',
          capabilities: ['read'],
          ttl: 300, // 5 minutes
        },
        testMockGetContent
      );

      const mockContent: ResourceContent = {
        content: { test: 'data' },
        contentType: 'application/json',
        size: 15,
      };

      testMockGetContent.mockResolvedValue(mockContent);

      // First call should invoke content provider
      const content1 = await testResource.getContent();

      expect(testMockGetContent).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const content2 = await testResource.getContent();

      expect(testMockGetContent).toHaveBeenCalledTimes(1); // Still only one call
      expect(content1).toEqual(content2);
    });

    it('should not cache content when TTL is not specified', async () => {
      // Create a fresh mock for this test
      const testMockGetContent = vi.fn();

      const noCacheResource = new BaseResource(
        'jcvd://project/test-nocache/context',
        {
          name: 'No Cache Resource',
          description: 'Test',
          contentType: 'application/json',
          version: '1.0.0',
          capabilities: ['read'],
          // No TTL specified
        },
        testMockGetContent
      );

      const mockContent: ResourceContent = {
        content: { test: 'data' },
        contentType: 'application/json',
        size: 15,
      };

      testMockGetContent.mockResolvedValue(mockContent);

      // Each call should invoke content provider
      await noCacheResource.getContent();
      await noCacheResource.getContent();

      expect(testMockGetContent).toHaveBeenCalledTimes(2);
    });

    it('should expire cached content after TTL', async () => {
      // Create a fresh mock for this test
      const testMockGetContent = vi.fn();

      const shortTTLResource = new BaseResource(
        'jcvd://project/test-shortttl/context',
        {
          name: 'Short TTL Resource',
          description: 'Test',
          contentType: 'application/json',
          version: '1.0.0',
          capabilities: ['read'],
          ttl: 0.001, // 1ms TTL
        },
        testMockGetContent
      );

      const mockContent: ResourceContent = {
        content: { test: 'data' },
        contentType: 'application/json',
        size: 15,
      };

      testMockGetContent.mockResolvedValue(mockContent);

      // First call
      await shortTTLResource.getContent();
      expect(testMockGetContent).toHaveBeenCalledTimes(1);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 5));

      // Second call should not use cache
      await shortTTLResource.getContent();
      expect(testMockGetContent).toHaveBeenCalledTimes(2);
    });

    it('should invalidate cache manually', async () => {
      // Create a fresh mock for this test
      const testMockGetContent = vi.fn();
      const testResource = new BaseResource(
        'jcvd://project/test-invalidate/context',
        {
          name: 'Invalidate Test Resource',
          description: 'Test',
          contentType: 'application/json',
          version: '1.0.0',
          capabilities: ['read'],
          ttl: 300, // 5 minutes
        },
        testMockGetContent
      );

      const mockContent: ResourceContent = {
        content: { test: 'data' },
        contentType: 'application/json',
        size: 15,
      };

      testMockGetContent.mockResolvedValue(mockContent);

      // First call - populates cache
      await testResource.getContent();
      expect(testMockGetContent).toHaveBeenCalledTimes(1);

      // Invalidate cache
      await testResource.invalidate();

      // Next call should invoke content provider again
      await testResource.getContent();
      expect(testMockGetContent).toHaveBeenCalledTimes(2);
    });
  });

  describe('Availability Checking', () => {
    it('should check availability using provided function', async () => {
      mockCheckAvailability.mockResolvedValue(true);

      const available = await baseResource.isAvailable();

      expect(mockCheckAvailability).toHaveBeenCalledOnce();
      expect(available).toBe(true);
    });

    it('should handle availability check errors', async () => {
      // Create a fresh mock for this test
      const testMockCheckAvailability = vi.fn();
      const testMockGetContent = vi.fn();
      const testResource = new BaseResource(
        'jcvd://project/test-availability/context',
        {
          name: 'Availability Test Resource',
          description: 'Test',
          contentType: 'application/json',
          version: '1.0.0',
          capabilities: ['read'],
        },
        testMockGetContent,
        testMockCheckAvailability
      );

      testMockCheckAvailability.mockRejectedValue(new Error('Network error'));

      // Should default to false on error
      const available = await testResource.isAvailable();

      expect(testMockCheckAvailability).toHaveBeenCalledOnce();
      expect(available).toBe(false);
    });

    it('should default to available when no availability checker provided', async () => {
      const simpleResource = new BaseResource(
        'jcvd://project/test/simple',
        {
          name: 'Simple Resource',
          description: 'Test',
          contentType: 'application/json',
          version: '1.0.0',
          capabilities: ['read'],
        },
        mockGetContent
        // No availability checker provided
      );

      const available = await simpleResource.isAvailable();

      expect(available).toBe(true);
    });
  });

  describe('Metadata Management', () => {
    it('should allow metadata updates', () => {
      const newMetadata: ResourceMetadata = {
        name: 'Updated Resource',
        description: 'Updated description',
        contentType: 'application/json',
        version: '1.1.0',
        capabilities: ['read', 'write'],
        ttl: 600,
      };

      baseResource.updateMetadata(newMetadata);

      expect(baseResource.metadata.name).toBe('Updated Resource');
      expect(baseResource.metadata.version).toBe('1.1.0');
      expect(baseResource.metadata.capabilities).toContain('write');
      expect(baseResource.metadata.ttl).toBe(600);
    });

    it('should invalidate cache when metadata is updated', async () => {
      // Create a fresh mock for this test
      const testMockGetContent = vi.fn();
      const testResource = new BaseResource(
        'jcvd://project/test-metadata/context',
        {
          name: 'Metadata Test Resource',
          description: 'Test',
          contentType: 'application/json',
          version: '1.0.0',
          capabilities: ['read'],
          ttl: 300, // 5 minutes
        },
        testMockGetContent
      );

      const mockContent: ResourceContent = {
        content: { test: 'data' },
        contentType: 'application/json',
        size: 15,
      };

      testMockGetContent.mockResolvedValue(mockContent);

      // Populate cache
      await testResource.getContent();
      expect(testMockGetContent).toHaveBeenCalledTimes(1);

      // Update metadata
      testResource.updateMetadata({
        ...testResource.metadata,
        version: '1.1.0',
      });

      // Next call should not use cache
      await testResource.getContent();
      expect(testMockGetContent).toHaveBeenCalledTimes(2);
    });

    it('should update lastModified timestamp on metadata changes', () => {
      const originalLastModified = baseResource.metadata.lastModified;

      // Wait a tiny bit to ensure timestamp difference
      setTimeout(() => {
        baseResource.updateMetadata({
          ...baseResource.metadata,
          description: 'Updated description',
        });

        expect(baseResource.metadata.lastModified).not.toEqual(originalLastModified);
        expect(baseResource.metadata.lastModified).toBeInstanceOf(Date);
      }, 1);
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages for common failures', async () => {
      mockGetContent.mockRejectedValue(new Error('Data source unavailable'));

      await expect(baseResource.getContent()).rejects.toThrow('Data source unavailable');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockGetContent.mockImplementation(() => {
        throw 'String error'; // Non-Error object
      });

      await expect(baseResource.getContent()).rejects.toThrow();
    });
  });

  describe('Resource Statistics', () => {
    it('should track content access statistics', async () => {
      // Create a fresh mock for this test
      const testMockGetContent = vi.fn();
      const testResource = new BaseResource(
        'jcvd://project/test-stats/context',
        {
          name: 'Stats Test Resource',
          description: 'Test',
          contentType: 'application/json',
          version: '1.0.0',
          capabilities: ['read'],
          ttl: 300, // 5 minutes to enable caching
        },
        testMockGetContent
      );

      const mockContent: ResourceContent = {
        content: { test: 'data' },
        contentType: 'application/json',
        size: 15,
      };

      testMockGetContent.mockResolvedValue(mockContent);

      // Make several calls
      await testResource.getContent();
      await testResource.getContent();
      await testResource.getContent();

      const stats = testResource.getStatistics();

      expect(stats.accessCount).toBe(3);
      expect(stats.cacheHits).toBe(2); // First call misses, next two hit cache
      expect(stats.cacheMisses).toBe(1);
      expect(typeof stats.lastAccessed).toBe('number');
    });

    it('should track error statistics', async () => {
      // Create a fresh mock for this test
      const testMockGetContent = vi
        .fn()
        .mockResolvedValueOnce({
          content: { test: 'data' },
          contentType: 'application/json',
          size: 15,
        })
        .mockRejectedValueOnce(new Error('Test error'))
        .mockResolvedValueOnce({
          content: { test: 'data' },
          contentType: 'application/json',
          size: 15,
        });

      const testResource = new BaseResource(
        'jcvd://project/error-test/context',
        {
          name: 'Error Test Resource',
          description: 'Test',
          contentType: 'application/json',
          version: '1.0.0',
          capabilities: ['read'],
        },
        testMockGetContent
      );

      // Successful call
      await testResource.getContent();

      // Failed call
      try {
        await testResource.getContent();
      } catch {
        // Ignore error
      }

      // Another successful call
      await testResource.getContent();

      const stats = testResource.getStatistics();

      expect(stats.accessCount).toBe(3);
      expect(stats.errorCount).toBe(1);
    });
  });
});
