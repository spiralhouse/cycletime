/**
 * Resource Metadata Management Tests
 * 
 * Tests for the resource metadata system that manages capability advertisement,
 * validation, and metadata operations for JCVD MCP resources.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { 
  ResourceMetadataManager,
  type ResourceCapabilityInfo,
  type ResourceDiscoveryInfo
} from '../../../../src/mcp/resources/resource-metadata.js';

import type { ResourceMetadata } from '../../../../src/mcp/resources/resource-interface.js';

describe('ResourceMetadataManager', () => {
  // Helper function to create a fresh metadata manager for each test
  const createManager = () => new ResourceMetadataManager();

  describe('Capability Management', () => {
    it('should register resource capabilities', () => {
      const metadataManager = createManager();
      const capabilityInfo: ResourceCapabilityInfo = {
        name: 'project-context',
        description: 'Provides comprehensive project context',
        supportedOperations: ['read'],
        uriPattern: 'jcvd://project/{projectId}/context',
        contentType: 'application/json',
        version: '1.0.0'
      };

      metadataManager.registerCapability('project-context', capabilityInfo);

      const registered = metadataManager.getCapability('project-context');

      expect(registered).toEqual(capabilityInfo);
    });

    it('should list all registered capabilities', () => {
      const metadataManager = createManager();
      const capability1: ResourceCapabilityInfo = {
        name: 'project-context',
        description: 'Project context',
        supportedOperations: ['read'],
        uriPattern: 'jcvd://project/{projectId}/context',
        contentType: 'application/json',
        version: '1.0.0'
      };

      const capability2: ResourceCapabilityInfo = {
        name: 'unblocked-tasks',
        description: 'Unblocked tasks',
        supportedOperations: ['read'],
        uriPattern: 'jcvd://project/{projectId}/tasks/unblocked',
        contentType: 'application/json',
        version: '1.0.0'
      };

      metadataManager.registerCapability('project-context', capability1);
      metadataManager.registerCapability('unblocked-tasks', capability2);

      const capabilities = metadataManager.getAllCapabilities();

      expect(capabilities).toHaveLength(2);
      expect(capabilities.map(c => c.name)).toContain('project-context');
      expect(capabilities.map(c => c.name)).toContain('unblocked-tasks');
    });

    it('should unregister capabilities', () => {
      const metadataManager = createManager();
      const capabilityInfo: ResourceCapabilityInfo = {
        name: 'temp-resource',
        description: 'Temporary resource',
        supportedOperations: ['read'],
        uriPattern: 'jcvd://project/{projectId}/temp',
        contentType: 'application/json',
        version: '1.0.0'
      };

      metadataManager.registerCapability('temp-resource', capabilityInfo);
      expect(metadataManager.getCapability('temp-resource')).toBeDefined();

      metadataManager.unregisterCapability('temp-resource');
      expect(metadataManager.getCapability('temp-resource')).toBeUndefined();
    });

    it('should prevent duplicate capability registration', () => {
      const metadataManager = createManager();
      const capabilityInfo: ResourceCapabilityInfo = {
        name: 'duplicate-test',
        description: 'Test duplicate',
        supportedOperations: ['read'],
        uriPattern: 'jcvd://project/{projectId}/test',
        contentType: 'application/json',
        version: '1.0.0'
      };

      metadataManager.registerCapability('duplicate-test', capabilityInfo);
      
      expect(() => {
        metadataManager.registerCapability('duplicate-test', capabilityInfo);
      }).toThrow('Capability already registered');
    });
  });

  describe('Metadata Validation', () => {
    it('should validate resource metadata structure', () => {
      const metadataManager = createManager();
      const validMetadata: ResourceMetadata = {
        name: 'Valid Resource',
        description: 'A valid resource',
        contentType: 'application/json',
        version: '1.0.0',
        capabilities: ['read']
      };

      const result = metadataManager.validateMetadata(validMetadata);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const metadataManager = createManager();
      const invalidMetadata = {
        name: 'Invalid Resource',
        // Missing required fields
      } as ResourceMetadata;

      const result = metadataManager.validateMetadata(invalidMetadata);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('description is required');
      expect(result.errors).toContain('contentType is required');
      expect(result.errors).toContain('version is required');
      expect(result.errors).toContain('capabilities is required');
    });

    it('should validate content type format', () => {
      const metadataManager = createManager();
      const invalidContentType: ResourceMetadata = {
        name: 'Test Resource',
        description: 'Test',
        contentType: 'invalid-content-type',
        version: '1.0.0',
        capabilities: ['read']
      };

      const result = metadataManager.validateMetadata(invalidContentType);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('contentType must be a valid MIME type');
    });

    it('should validate version format', () => {
      const metadataManager = createManager();
      const invalidVersion: ResourceMetadata = {
        name: 'Test Resource',
        description: 'Test',
        contentType: 'application/json',
        version: 'not-a-version',
        capabilities: ['read']
      };

      const result = metadataManager.validateMetadata(invalidVersion);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('version must follow semantic versioning');
    });

    it('should validate capability values', () => {
      const metadataManager = createManager();
      const invalidCapabilities: ResourceMetadata = {
        name: 'Test Resource',
        description: 'Test',
        contentType: 'application/json',
        version: '1.0.0',
        capabilities: ['invalid-capability' as any]
      };

      const result = metadataManager.validateMetadata(invalidCapabilities);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('capabilities contains invalid values');
    });
  });

  describe('Resource Discovery', () => {
    it('should discover resources by URI pattern', () => {
      const metadataManager = createManager();

      metadataManager.registerCapability('project-context', {
        name: 'project-context',
        description: 'Project context',
        supportedOperations: ['read'],
        uriPattern: 'jcvd://project/{projectId}/context',
        contentType: 'application/json',
        version: '1.0.0'
      });

      const matches = metadataManager.findCapabilitiesByURI('jcvd://project/test-123/context');

      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe('project-context');
    });

    it('should discover resources by content type', () => {
      const metadataManager = createManager();

      metadataManager.registerCapability('json-resource', {
        name: 'json-resource',
        description: 'JSON resource',
        supportedOperations: ['read'],
        uriPattern: 'jcvd://project/{projectId}/json',
        contentType: 'application/json',
        version: '1.0.0'
      });

      metadataManager.registerCapability('text-resource', {
        name: 'text-resource',
        description: 'Text resource',
        supportedOperations: ['read'],
        uriPattern: 'jcvd://project/{projectId}/text',
        contentType: 'text/plain',
        version: '1.0.0'
      });

      const jsonCapabilities = metadataManager.findCapabilitiesByContentType('application/json');

      expect(jsonCapabilities).toHaveLength(1);
      expect(jsonCapabilities[0].name).toBe('json-resource');

      const textCapabilities = metadataManager.findCapabilitiesByContentType('text/plain');

      expect(textCapabilities).toHaveLength(1);
      expect(textCapabilities[0].name).toBe('text-resource');
    });

    it('should discover resources by operation support', () => {
      const metadataManager = createManager();

      metadataManager.registerCapability('read-only', {
        name: 'read-only',
        description: 'Read only resource',
        supportedOperations: ['read'],
        uriPattern: 'jcvd://project/{projectId}/readonly',
        contentType: 'application/json',
        version: '1.0.0'
      });

      metadataManager.registerCapability('read-write', {
        name: 'read-write',
        description: 'Read write resource',
        supportedOperations: ['read', 'write'],
        uriPattern: 'jcvd://project/{projectId}/readwrite',
        contentType: 'application/json',
        version: '1.0.0'
      });

      const readCapabilities = metadataManager.findCapabilitiesByOperation('read');

      expect(readCapabilities).toHaveLength(2);

      const writeCapabilities = metadataManager.findCapabilitiesByOperation('write');

      expect(writeCapabilities).toHaveLength(1);
      expect(writeCapabilities[0].name).toBe('read-write');
    });
  });

  describe('MCP Advertisement', () => {
    it('should generate MCP resource advertisement', () => {
      const metadataManager = createManager();

      metadataManager.registerCapability('project-context', {
        name: 'project-context',
        description: 'Provides comprehensive project context for Claude Code analysis',
        supportedOperations: ['read'],
        uriPattern: 'jcvd://project/{projectId}/context',
        contentType: 'application/json',
        version: '1.0.0'
      });

      const advertisement = metadataManager.generateMCPAdvertisement();

      expect(advertisement.resources).toBeDefined();
      expect(advertisement.resources.listChanged).toBe(true);
      expect(advertisement.resources.subscribe).toBe(true);
      expect(advertisement.resources.capabilities).toHaveLength(1);
      
      const capability = advertisement.resources.capabilities[0];

      expect(capability.name).toBe('project-context');
      expect(capability.description).toContain('Claude Code');
      expect(capability.uriTemplate).toBe('jcvd://project/{projectId}/context');
    });

    it('should include resource statistics in advertisement', () => {
      const metadataManager = createManager();

      metadataManager.registerCapability('test-resource', {
        name: 'test-resource',
        description: 'Test resource',
        supportedOperations: ['read'],
        uriPattern: 'jcvd://project/{projectId}/test',
        contentType: 'application/json',
        version: '1.0.0'
      });

      // Simulate some usage
      metadataManager.recordResourceAccess('test-resource');
      metadataManager.recordResourceAccess('test-resource');

      const advertisement = metadataManager.generateMCPAdvertisement();
      const stats = advertisement.serverInfo?.statistics;
      
      expect(stats).toBeDefined();
      expect(stats.totalCapabilities).toBe(1);
      expect(stats.totalAccesses).toBe(2);
    });
  });

  describe('Resource Lifecycle Events', () => {
    it('should emit events when capabilities are registered', () => {
      const metadataManager = createManager();
      const eventListener = vi.fn();

      metadataManager.on('capability-registered', eventListener);

      const capabilityInfo: ResourceCapabilityInfo = {
        name: 'test-capability',
        description: 'Test capability',
        supportedOperations: ['read'],
        uriPattern: 'jcvd://project/{projectId}/test',
        contentType: 'application/json',
        version: '1.0.0'
      };

      metadataManager.registerCapability('test-capability', capabilityInfo);

      expect(eventListener).toHaveBeenCalledWith({
        name: 'test-capability',
        capability: capabilityInfo
      });
    });

    it('should emit events when capabilities are unregistered', () => {
      const metadataManager = createManager();
      const eventListener = vi.fn();

      metadataManager.on('capability-unregistered', eventListener);

      // First register
      metadataManager.registerCapability('temp-capability', {
        name: 'temp-capability',
        description: 'Temporary capability',
        supportedOperations: ['read'],
        uriPattern: 'jcvd://project/{projectId}/temp',
        contentType: 'application/json',
        version: '1.0.0'
      });

      // Then unregister
      metadataManager.unregisterCapability('temp-capability');

      expect(eventListener).toHaveBeenCalledWith({
        name: 'temp-capability'
      });
    });
  });

  describe('Capability Caching', () => {
    it('should cache capability lookup results', () => {
      const metadataManager = createManager();
      const capabilityInfo: ResourceCapabilityInfo = {
        name: 'cached-resource',
        description: 'Cached resource',
        supportedOperations: ['read'],
        uriPattern: 'jcvd://project/{projectId}/cached',
        contentType: 'application/json',
        version: '1.0.0'
      };

      metadataManager.registerCapability('cached-resource', capabilityInfo);

      // First lookup
      const result1 = metadataManager.getCapability('cached-resource');
      // Second lookup (should use cache)
      const result2 = metadataManager.getCapability('cached-resource');

      expect(result1).toBe(result2); // Same object reference indicates caching
    });

    it('should invalidate cache when capabilities change', () => {
      const metadataManager = createManager();
      const originalCapability: ResourceCapabilityInfo = {
        name: 'changing-resource',
        description: 'Original description',
        supportedOperations: ['read'],
        uriPattern: 'jcvd://project/{projectId}/original',
        contentType: 'application/json',
        version: '1.0.0'
      };

      metadataManager.registerCapability('changing-resource', originalCapability);
      const cached = metadataManager.getCapability('changing-resource');

      // Unregister to clear cache
      metadataManager.unregisterCapability('changing-resource');

      // Register with updated info
      const updatedCapability: ResourceCapabilityInfo = {
        name: 'changing-resource',
        description: 'Updated description',
        supportedOperations: ['read', 'write'],
        uriPattern: 'jcvd://project/{projectId}/updated',
        contentType: 'application/json',
        version: '1.1.0'
      };

      metadataManager.registerCapability('changing-resource', updatedCapability);
      const newCached = metadataManager.getCapability('changing-resource');

      expect(newCached?.description).toBe('Updated description');
      expect(newCached?.supportedOperations).toContain('write');
    });
  });
});