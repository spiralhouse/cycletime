/**
 * Resource-Enabled MCP Server
 * 
 * Extends the base MCP server with resource framework integration,
 * providing JCVD resource management capabilities through MCP protocol.
 */

import { createLogger } from '../../utils/logger.js';
import { ResourceHandler } from '../handlers/resource-handler.js';
import { ResourceMetadataManager } from '../resources/resource-metadata.js';
import { ResourceRegistry } from '../resources/resource-registry.js';

import { MCPServer } from './mcp-server.js';

import type { ServerConfig } from './server-lifecycle.js';
import type { Logger } from '../../utils/logger.js';
import type { Resource } from '../resources/resource-interface.js';

/**
 * Resource server configuration extending base server config
 */
export interface ResourceServerConfig extends ServerConfig {
  /** Resource-specific configuration */
  resources?: {
    /** Enable resource discovery */
    discovery?: boolean;
    /** Maximum resources per project */
    maxResourcesPerProject?: number;
    /** Resource cache TTL in seconds */
    defaultCacheTTL?: number;
    /** Enable resource health monitoring */
    healthMonitoring?: boolean;
  };
}

/**
 * Resource server events extending base server events
 */
export interface ResourceServerEvents {
  'resource-registered': { uri: string; resource: Resource; timestamp: number };
  'resource-unregistered': { uri: string; timestamp: number };
  'resource-accessed': { uri: string; accessCount: number; timestamp: number };
  'resource-error': { uri: string; error: string; timestamp: number };
}

/**
 * MCP Server with integrated resource framework
 */
export class ResourceServer extends MCPServer {
  private resourceRegistry: ResourceRegistry;
  private metadataManager: ResourceMetadataManager;
  private resourceHandler: ResourceHandler;
  private resourceLogger: Logger;

  constructor(config: ResourceServerConfig, logger?: Logger) {
    // Initialize base server with resource capabilities
    const enhancedConfig = {
      ...config,
      capabilities: {
        ...config.capabilities,
        resources: {
          subscribe: false, // Not yet implemented
          listChanged: false // Not yet implemented
        }
      }
    };

    super(enhancedConfig, logger);

    this.resourceLogger = createLogger('resource-server');

    // Initialize resource framework components
    this.resourceRegistry = new ResourceRegistry();
    this.metadataManager = new ResourceMetadataManager();
    this.resourceHandler = new ResourceHandler(
      this.resourceRegistry,
      this.metadataManager,
      this.resourceLogger
    );

    this.setupResourceFramework();
    this.setupResourceEventHandlers();
  }

  /**
   * Register a resource with the server
   */
  registerResource(resource: Resource): void {
    try {
      this.resourceRegistry.register(resource);
      
      this.resourceLogger.info('Resource registered', {
        uri: resource.uri,
        name: resource.metadata.name,
        contentType: resource.metadata.contentType
      });

      this.emit('resource-registered', {
        uri: resource.uri,
        resource,
        timestamp: Date.now()
      });
    } catch (error) {
      this.resourceLogger.error('Failed to register resource', {
        uri: resource.uri,
        error: error instanceof Error ? error.message : String(error)
      });

      this.emit('resource-error', {
        uri: resource.uri,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });

      throw error;
    }
  }

  /**
   * Unregister a resource from the server
   */
  unregisterResource(uri: string): void {
    try {
      this.resourceRegistry.unregister(uri);
      
      this.resourceLogger.info('Resource unregistered', { uri });

      this.emit('resource-unregistered', {
        uri,
        timestamp: Date.now()
      });
    } catch (error) {
      this.resourceLogger.error('Failed to unregister resource', {
        uri,
        error: error instanceof Error ? error.message : String(error)
      });

      this.emit('resource-error', {
        uri,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });

      throw error;
    }
  }

  /**
   * Register multiple resources in batch
   */
  registerResources(resources: Resource[]): void {
    try {
      this.resourceRegistry.registerBatch(resources);
      
      this.resourceLogger.info('Batch resources registered', {
        count: resources.length,
        uris: resources.map(r => r.uri)
      });

      // Emit individual registration events
      resources.forEach(resource => {
        this.emit('resource-registered', {
          uri: resource.uri,
          resource,
          timestamp: Date.now()
        });
      });
    } catch (error) {
      this.resourceLogger.error('Failed to register batch resources', {
        count: resources.length,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  /**
   * Get registered resource by URI
   */
  getResource(uri: string): Resource | undefined {
    const resource = this.resourceRegistry.get(uri);
    
    if (resource) {
      this.emit('resource-accessed', {
        uri,
        accessCount: this.resourceRegistry.getResourceStatistics(uri)?.accessCount || 0,
        timestamp: Date.now()
      });
    }

    return resource;
  }

  /**
   * Find resources by project ID
   */
  findResourcesByProject(projectId: string): Resource[] {
    return this.resourceRegistry.findByProjectId(projectId);
  }

  /**
   * Get all registered resources
   */
  getAllResources(): Resource[] {
    return this.resourceRegistry.getAll();
  }

  /**
   * Check resource health
   */
  async checkResourceHealth(uri: string): Promise<any> {
    return this.resourceRegistry.checkResourceHealth(uri);
  }

  /**
   * Get resource server statistics
   */
  getResourceStatistics(): Record<string, any> {
    return {
      registry: this.resourceRegistry.getRegistryStatistics(),
      handler: this.resourceHandler.getStatistics(),
      metadata: {
        capabilities: this.metadataManager.getRegisteredCapabilities().length
      }
    };
  }

  /**
   * Cleanup resources by project
   */
  cleanupProjectResources(projectId: string): void {
    this.resourceRegistry.cleanupByProject(projectId);
    
    this.resourceLogger.info('Project resources cleaned up', { projectId });
  }

  /**
   * Cleanup all resources
   */
  cleanupAllResources(): void {
    this.resourceRegistry.cleanup();
    
    this.resourceLogger.info('All resources cleaned up');
  }

  /**
   * Override restart to re-setup resource framework
   */
  override async restart(): Promise<any> {
    const result = await super.restart();
    
    if (result.success) {
      // Re-setup resource framework after restart
      this.setupResourceFramework();
    }
    
    return result;
  }

  /**
   * Setup resource framework integration
   */
  private setupResourceFramework(): void {
    // Get access to the message router from parent class (protected access would be better)
    const messageRouter = (this as any).messageRouter;
    
    if (messageRouter) {
      // Register resource handlers with the message router (check if not already registered)
      this.resourceHandler.registerHandlers((method, handler) => {
        if (!messageRouter.hasHandler(method)) {
          messageRouter.registerHandler(method, handler);
        }
      });
      
      this.resourceLogger.debug('Resource handlers registered with message router', {
        handlers: ['resources/list', 'resources/read', 'resources/subscribe']
      });
    } else {
      this.resourceLogger.warn('Message router not available, resource handlers not registered');
    }

    // Update server capabilities with resource information
    const resourceCapabilities = this.resourceHandler.getResourceCapabilities();

    this.updateCapabilities({ resources: resourceCapabilities });

    this.resourceLogger.debug('Resource framework integrated with MCP server', {
      capabilities: resourceCapabilities
    });
  }

  /**
   * Setup resource event handlers
   */
  private setupResourceEventHandlers(): void {
    // Forward registry events
    this.resourceRegistry.on('resource-registered', (event) => {
      this.emit('resource-registered', {
        uri: event.uri,
        resource: event.resource,
        timestamp: event.registeredAt
      });
    });

    this.resourceRegistry.on('resource-unregistered', (event) => {
      this.emit('resource-unregistered', {
        uri: event.uri,
        timestamp: event.unregisteredAt
      });
    });

    this.resourceRegistry.on('batch-registered', (event) => {
      this.resourceLogger.debug('Batch resources registered', {
        count: event.count,
        timestamp: event.registeredAt
      });
    });

    this.resourceRegistry.on('cleanup-completed', (event) => {
      this.resourceLogger.debug('Resource cleanup completed', {
        type: event.cleanupType,
        removed: event.resourcesRemoved,
        timestamp: event.completedAt
      });
    });

    this.resourceLogger.debug('Resource event handlers configured');
  }
}