/**
 * Resource Metadata Management System
 *
 * Manages capability advertisement, validation, and metadata operations
 * for JCVD MCP resources including discovery and lifecycle events.
 */

import EventEmitter from 'node:events';

import type { ResourceMetadata, ResourceCapability } from './resource-interface.js';

/**
 * Resource capability information for advertisement and discovery
 */
export interface ResourceCapabilityInfo {
  /** Unique capability name */
  name: string;

  /** Human-readable description */
  description: string;

  /** Supported operations (read, write, subscribe) */
  supportedOperations: ResourceCapability[];

  /** URI pattern for this capability (e.g., jcvd://project/{projectId}/context) */
  uriPattern: string;

  /** Content type returned by this capability */
  contentType: string;

  /** Capability version */
  version: string;

  /** Optional tags for categorization */
  tags?: string[];

  /** Optional JSON schema for content validation */
  contentSchema?: any;
}

/**
 * Resource discovery information
 */
export interface ResourceDiscoveryInfo {
  /** Matching capabilities */
  capabilities: ResourceCapabilityInfo[];

  /** Discovery metadata */
  metadata: {
    totalMatches: number;
    searchCriteria: string;
    timestamp: number;
  };
}

/**
 * Metadata validation result
 */
export interface MetadataValidationResult {
  /** Whether metadata is valid */
  isValid: boolean;

  /** Validation error messages */
  errors: string[];

  /** Validation warnings */
  warnings?: string[];
}

/**
 * MCP advertisement structure
 */
export interface MCPAdvertisement {
  /** Resource capabilities */
  resources: {
    listChanged: boolean;
    subscribe: boolean;
    capabilities: {
      name: string;
      description: string;
      uriTemplate: string;
      mimeType: string;
    }[];
  };

  /** Server information */
  serverInfo?: {
    name: string;
    version: string;
    statistics: {
      totalCapabilities: number;
      totalAccesses: number;
    };
  };
}

/**
 * Resource metadata manager for capability management and advertisement
 */
export class ResourceMetadataManager extends EventEmitter {
  private capabilities = new Map<string, ResourceCapabilityInfo>();
  private accessStats = new Map<string, number>();
  private capabilityCache = new Map<string, ResourceCapabilityInfo>();
  private discoveryCache = new Map<string, ResourceDiscoveryInfo>();
  private cacheTimeout = 60_000; // 1 minute

  /**
   * Register a new resource capability
   */
  registerCapability(name: string, info: ResourceCapabilityInfo): void {
    if (this.capabilities.has(name)) {
      throw new Error(`Capability already registered: ${name}`);
    }

    this.capabilities.set(name, info);
    this.invalidateCache();

    this.emit('capability-registered', { name, capability: info });
  }

  /**
   * Unregister a resource capability
   */
  unregisterCapability(name: string): void {
    if (!this.capabilities.has(name)) {
      return;
    }

    this.capabilities.delete(name);
    this.accessStats.delete(name);
    this.invalidateCache();

    this.emit('capability-unregistered', { name });
  }

  /**
   * Get a specific capability by name
   */
  getCapability(name: string): ResourceCapabilityInfo | undefined {
    const cached = this.capabilityCache.get(name);

    if (cached) {
      return cached;
    }

    const capability = this.capabilities.get(name);

    if (capability) {
      this.capabilityCache.set(name, capability);
    }

    return capability;
  }

  /**
   * Get all registered capabilities
   */
  getAllCapabilities(): ResourceCapabilityInfo[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Find capabilities matching a URI pattern
   */
  findCapabilitiesByURI(uri: string): ResourceCapabilityInfo[] {
    const cacheKey = `uri:${uri}`;
    const cached = this.discoveryCache.get(cacheKey);

    if (cached && this.isCacheValid(cached.metadata.timestamp)) {
      return cached.capabilities;
    }

    const matches: ResourceCapabilityInfo[] = [];

    for (const capability of this.capabilities.values()) {
      if (this.uriMatchesPattern(uri, capability.uriPattern)) {
        matches.push(capability);
      }
    }

    this.discoveryCache.set(cacheKey, {
      capabilities: matches,
      metadata: {
        totalMatches: matches.length,
        searchCriteria: `URI: ${uri}`,
        timestamp: Date.now(),
      },
    });

    return matches;
  }

  /**
   * Find capabilities by content type
   */
  findCapabilitiesByContentType(contentType: string): ResourceCapabilityInfo[] {
    const cacheKey = `contentType:${contentType}`;
    const cached = this.discoveryCache.get(cacheKey);

    if (cached && this.isCacheValid(cached.metadata.timestamp)) {
      return cached.capabilities;
    }

    const matches = Array.from(this.capabilities.values()).filter(
      cap => cap.contentType === contentType
    );

    this.discoveryCache.set(cacheKey, {
      capabilities: matches,
      metadata: {
        totalMatches: matches.length,
        searchCriteria: `Content-Type: ${contentType}`,
        timestamp: Date.now(),
      },
    });

    return matches;
  }

  /**
   * Find capabilities supporting a specific operation
   */
  findCapabilitiesByOperation(operation: ResourceCapability): ResourceCapabilityInfo[] {
    const cacheKey = `operation:${operation}`;
    const cached = this.discoveryCache.get(cacheKey);

    if (cached && this.isCacheValid(cached.metadata.timestamp)) {
      return cached.capabilities;
    }

    const matches = Array.from(this.capabilities.values()).filter(cap =>
      cap.supportedOperations.includes(operation)
    );

    this.discoveryCache.set(cacheKey, {
      capabilities: matches,
      metadata: {
        totalMatches: matches.length,
        searchCriteria: `Operation: ${operation}`,
        timestamp: Date.now(),
      },
    });

    return matches;
  }

  /**
   * Validate resource metadata
   */
  validateMetadata(metadata: ResourceMetadata): MetadataValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!metadata.name || typeof metadata.name !== 'string') {
      errors.push('name is required and must be a string');
    }

    if (!metadata.description || typeof metadata.description !== 'string') {
      errors.push('description is required');
    }

    if (!metadata.contentType || typeof metadata.contentType !== 'string') {
      errors.push('contentType is required');
    } else if (!this.isValidMimeType(metadata.contentType)) {
      errors.push('contentType must be a valid MIME type');
    }

    if (!metadata.version || typeof metadata.version !== 'string') {
      errors.push('version is required');
    } else if (!this.isValidSemVer(metadata.version)) {
      errors.push('version must follow semantic versioning');
    }

    if (!metadata.capabilities || !Array.isArray(metadata.capabilities)) {
      errors.push('capabilities is required');
    } else if (!this.areValidCapabilities(metadata.capabilities)) {
      errors.push('capabilities contains invalid values');
    }

    // Optional field validation
    if (metadata.ttl !== undefined && (typeof metadata.ttl !== 'number' || metadata.ttl < 0)) {
      warnings.push('ttl should be a positive number representing seconds');
    }

    if (metadata.tags && !Array.isArray(metadata.tags)) {
      warnings.push('tags should be an array of strings');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate MCP resource advertisement
   */
  generateMCPAdvertisement(): MCPAdvertisement {
    const capabilities = Array.from(this.capabilities.values()).map(cap => ({
      name: cap.name,
      description: cap.description,
      uriTemplate: cap.uriPattern,
      mimeType: cap.contentType,
    }));

    const totalAccesses = Array.from(this.accessStats.values()).reduce(
      (sum, count) => sum + count,
      0
    );

    return {
      resources: {
        listChanged: true,
        subscribe: true,
        capabilities,
      },
      serverInfo: {
        name: 'JCVD Resource Server',
        version: '1.0.0',
        statistics: {
          totalCapabilities: this.capabilities.size,
          totalAccesses,
        },
      },
    };
  }

  /**
   * Get all registered capabilities
   */
  getRegisteredCapabilities(): ResourceCapabilityInfo[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Record resource access for statistics
   */
  recordResourceAccess(capabilityName: string): void {
    const current = this.accessStats.get(capabilityName) || 0;

    this.accessStats.set(capabilityName, current + 1);
  }

  /**
   * Get access statistics for a capability
   */
  getAccessStats(capabilityName: string): number {
    return this.accessStats.get(capabilityName) || 0;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.capabilityCache.clear();
    this.discoveryCache.clear();
  }

  /**
   * Invalidate all caches
   */
  private invalidateCache(): void {
    this.clearCache();
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTimeout;
  }

  /**
   * Check if URI matches a pattern
   */
  private uriMatchesPattern(uri: string, pattern: string): boolean {
    // Convert pattern to regex
    // jcvd://project/{projectId}/context -> jcvd://project/([^/]+)/context
    const regexPattern = pattern.replace(/{[^}]+}/g, '([^/]+)').replace(/\./g, '\\.');

    const regex = new RegExp(`^${regexPattern}$`);

    return regex.test(uri);
  }

  /**
   * Validate MIME type format
   */
  private isValidMimeType(mimeType: string): boolean {
    const mimeTypeRegex = /^[A-Za-z][\dA-Za-z]*\/[\dA-Za-z][\d+.A-Za-z\-]*$/;

    return mimeTypeRegex.test(mimeType);
  }

  /**
   * Validate semantic version format
   */
  private isValidSemVer(version: string): boolean {
    const semVerRegex = /^\d+\.\d+\.\d+(?:-[\d.A-Za-z\-]+)?(?:\+[\d.A-Za-z\-]+)?$/;

    return semVerRegex.test(version);
  }

  /**
   * Validate capability values
   */
  private areValidCapabilities(capabilities: any[]): boolean {
    const validCapabilities: ResourceCapability[] = ['read', 'write', 'subscribe'];

    return capabilities.every(cap => validCapabilities.includes(cap));
  }
}
