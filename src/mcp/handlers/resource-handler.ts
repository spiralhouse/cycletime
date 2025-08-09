/**
 * MCP Resource Handler
 * 
 * Handles MCP resource protocol methods including resources/list, resources/read,
 * and resources/subscribe requests. Integrates the JCVD resource framework
 * with the MCP server infrastructure.
 */

import { ResourceError, ResourceNotFoundError, ResourceUnavailableError } from '../resources/resource-interface.js';

import type { Logger } from '../../utils/logger.js';
import type { ResourceMetadataManager } from '../resources/resource-metadata.js';
import type { ResourceRegistry } from '../resources/resource-registry.js';
import type { RequestHandler } from '../server/message-router.js';

/**
 * MCP Resource list request parameters
 */
export interface ResourceListParams {
  /** Optional cursor for pagination */
  cursor?: string;
}

/**
 * MCP Resource read request parameters
 */
export interface ResourceReadParams {
  /** URI of the resource to read */
  uri: string;
}

/**
 * MCP Resource subscribe request parameters
 */
export interface ResourceSubscribeParams {
  /** URI of the resource to subscribe to */
  uri: string;
}

/**
 * MCP Resource list response
 */
export interface ResourceListResponse {
  /** List of available resources */
  resources: {
    /** Resource URI */
    uri: string;
    /** Optional resource name */
    name?: string;
    /** Optional resource description */
    description?: string;
    /** Optional MIME type */
    mimeType?: string;
  }[];
  /** Optional cursor for next page */
  nextCursor?: string;
}

/**
 * MCP Resource read response
 */
export interface ResourceReadResponse {
  /** Resource contents */
  contents: {
    /** Resource URI */
    uri: string;
    /** MIME type of the content */
    mimeType: string;
    /** The actual content (string or base64 for binary) */
    text?: string;
    blob?: string;
  }[];
}

/**
 * MCP Resource Handler class
 */
export class ResourceHandler {
  constructor(
    private registry: ResourceRegistry,
    private metadataManager: ResourceMetadataManager,
    private logger: Logger
  ) {}

  /**
   * Handle resources/list requests
   */
  handleResourcesList: RequestHandler = async (params?: ResourceListParams) => {
    try {
      this.logger.debug('Handling resources/list request', { params });

      // Get all registered resources
      const resources = this.registry.getAll();

      // Convert to MCP resource format
      const mcpResources = resources.map(resource => ({
        uri: resource.uri,
        name: resource.metadata.name,
        description: resource.metadata.description,
        mimeType: resource.metadata.contentType
      }));

      const response: ResourceListResponse = {
        resources: mcpResources
      };

      this.logger.debug('resources/list completed', { 
        resourceCount: mcpResources.length 
      });

      return response;
    } catch (error) {
      this.logger.error('Error handling resources/list', {
        error: error instanceof Error ? error.message : String(error)
      });

      throw new Error(`Failed to list resources: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  /**
   * Handle resources/read requests
   */
  handleResourcesRead: RequestHandler = async (params?: ResourceReadParams) => {
    try {
      if (!params?.uri) {
        throw new Error('Resource URI is required');
      }

      this.logger.debug('Handling resources/read request', { uri: params.uri });

      // Get the resource from registry
      const resource = this.registry.get(params.uri);

      if (!resource) {
        throw new ResourceNotFoundError(params.uri);
      }

      // Check if resource is available
      const isAvailable = await resource.isAvailable();

      if (!isAvailable) {
        throw new ResourceUnavailableError(params.uri);
      }

      // Get resource content
      const content = await resource.getContent();

      // Convert to MCP format
      const response: ResourceReadResponse = {
        contents: [{
          uri: params.uri,
          mimeType: content.contentType,
          text: typeof content.content === 'string' 
            ? content.content 
            : JSON.stringify(content.content)
        }]
      };

      this.logger.debug('resources/read completed', { 
        uri: params.uri,
        contentType: content.contentType,
        size: content.size
      });

      return response;
    } catch (error) {
      this.logger.error('Error handling resources/read', {
        uri: params?.uri,
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof ResourceError) {
        throw error;
      }

      throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  /**
   * Handle resources/subscribe requests
   */
  handleResourcesSubscribe: RequestHandler = async (params?: ResourceSubscribeParams) => {
    try {
      if (!params?.uri) {
        throw new Error('Resource URI is required');
      }

      this.logger.debug('Handling resources/subscribe request', { uri: params.uri });

      // For now, we don't support subscriptions in the base implementation
      // This would require extending the framework with SubscribableResource support
      throw new Error('Resource subscriptions are not yet implemented');
    } catch (error) {
      this.logger.error('Error handling resources/subscribe', {
        uri: params?.uri,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new Error(`Failed to subscribe to resource: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  /**
   * Get resource capabilities for MCP server advertisement
   */
  getResourceCapabilities(): any {
    const advertisement = this.metadataManager.generateMCPAdvertisement();

    return advertisement.resources;
  }

  /**
   * Register all resource handlers with the message router
   */
  registerHandlers(registerHandler: (method: string, handler: RequestHandler) => void): void {
    // Register standard MCP resource methods
    registerHandler('resources/list', this.handleResourcesList);
    registerHandler('resources/read', this.handleResourcesRead);
    registerHandler('resources/subscribe', this.handleResourcesSubscribe);

    this.logger.info('Resource handlers registered', {
      handlers: ['resources/list', 'resources/read', 'resources/subscribe']
    });
  }

  /**
   * Get handler statistics
   */
  getStatistics(): Record<string, any> {
    const registryStats = this.registry.getRegistryStatistics();

    return {
      registry: registryStats,
      capabilities: this.metadataManager.getRegisteredCapabilities().length
    };
  }
}