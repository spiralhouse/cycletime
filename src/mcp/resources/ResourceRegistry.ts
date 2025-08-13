/**
 * ResourceRegistry Class
 * Manages registration and discovery of MCP resources
 */

import type { 
  ResourceDescriptor, 
  MCPResourceListResponse, 
  MCPResourceContent, 
  MCPRequest,
  MCPResponse,
  MCPSession,
  MCPListOptions
} from './types.js';
import { ResourceValidationError, ResourceConflictError } from './errors.js';

/**
 * Registry for managing MCP resources
 * Provides registration, deregistration, and discovery capabilities
 */
export class ResourceRegistry {
  private resources: Map<string, ResourceDescriptor>;
  private networkInterrupted = false;
  private sessions = new Map<string, MCPSession>();

  constructor() {
    // Ensure each instance gets a fresh Map
    this.resources = new Map<string, ResourceDescriptor>();
  }

  /**
   * Register a new resource
   * @param resource - The resource descriptor to register
   * @throws ResourceValidationError if the descriptor is invalid
   * @throws ResourceConflictError if a resource with the same type already exists
   */
  register(resource: ResourceDescriptor): void {
    // Validate required fields
    if (!resource.type || !resource.name || !resource.description) {
      throw new ResourceValidationError(
        'Invalid resource descriptor: type, name, and description are required',
        { 
          type: resource.type, 
          name: resource.name, 
          description: resource.description 
        }
      );
    }

    // Check for duplicate registration
    if (this.resources.has(resource.type)) {
      throw new ResourceConflictError(resource.type);
    }

    // Validate handler
    if (!resource.handler || typeof resource.handler.list !== 'function' || typeof resource.handler.read !== 'function') {
      throw new ResourceValidationError(
        'Invalid resource handler: must implement list and read methods',
        { type: resource.type }
      );
    }

    // Register the resource
    this.resources.set(resource.type, resource);
  }

  /**
   * Unregister a resource
   * @param type - The type of the resource to unregister
   * @returns true if the resource was unregistered, false if it didn't exist
   */
  unregister(type: string): boolean {
    if (!type) {
      return false;
    }
    return this.resources.delete(type);
  }

  /**
   * List all registered resources
   * @returns Array of all registered resource descriptors
   */
  list(): ResourceDescriptor[] {
    return Array.from(this.resources.values());
  }

  /**
   * Get a specific resource by type
   * @param type - The type of the resource to retrieve
   * @returns The resource descriptor or undefined if not found
   */
  get(type: string): ResourceDescriptor | undefined {
    if (!type) {
      return undefined;
    }
    return this.resources.get(type);
  }

  /**
   * Check if a resource type is registered
   * @param type - The type to check
   * @returns true if the resource type is registered
   */
  has(type: string): boolean {
    if (!type) {
      return false;
    }
    return this.resources.has(type);
  }

  /**
   * Clear all registered resources
   */
  clear(): void {
    this.resources.clear();
  }

  /**
   * Get the number of registered resources
   */
  get size(): number {
    return this.resources.size;
  }

  /**
   * Get all registered resource types
   * @returns Array of resource type strings
   */
  getTypes(): string[] {
    return Array.from(this.resources.keys());
  }

  /**
   * Find resources matching a filter
   * @param filter - Function to filter resources
   * @returns Array of matching resource descriptors
   */
  find(filter: (resource: ResourceDescriptor) => boolean): ResourceDescriptor[] {
    return this.list().filter(filter);
  }

  /**
   * Get resources by MIME type
   * @param mimeType - The MIME type to filter by
   * @returns Array of resources with the specified MIME type
   */
  getByMimeType(mimeType: string): ResourceDescriptor[] {
    return this.find(r => r.mimeType === mimeType);
  }

  // MCP Integration Methods

  /**
   * List resources via MCP protocol
   */
  async listResourcesViaMCP(_options?: MCPListOptions): Promise<MCPResourceListResponse> {
    if (this.networkInterrupted) {
      throw new Error('Network interrupted');
    }

    const resources = this.list();
    
    return {
      resources: resources.map(resource => ({
        uri: `mcp://resource/${resource.type}`,
        name: resource.name || resource.type,
        description: resource.description,
        mimeType: resource.mimeType || 'application/json'
      }))
    };
  }

  /**
   * Fetch resource content via MCP protocol
   */
  async fetchResourceContent(
    type: string, 
    params: Record<string, unknown> = {}, 
    _options?: MCPListOptions
  ): Promise<MCPResourceContent> {
    if (this.networkInterrupted) {
      throw new Error('Network interrupted');
    }

    const resource = this.get(type);
    if (!resource) {
      throw new Error(`Resource not found: ${type}`);
    }

    // Generate content based on resource type and params
    const content = await this.generateResourceContent(resource, params);
    
    return {
      uri: `mcp://resource/${type}`,
      mimeType: resource.mimeType || 'application/json',
      text: JSON.stringify(content, null, 2)
    };
  }

  /**
   * Handle MCP request
   */
  async handleMCPRequest(request: MCPRequest): Promise<MCPResponse> {
    if (this.networkInterrupted) {
      throw new Error('Network interrupted');
    }

    try {
      let result: any;

      switch (request.method) {
        case 'resources/list':
          result = await this.listResourcesViaMCP(request.params);
          break;
        
        case 'resources/read':
          const { uri } = request.params as { uri: string };
          const type = this.extractTypeFromUri(uri);
          result = await this.fetchResourceContent(type, request.params);
          break;
        
        default:
          throw new Error(`Unsupported method: ${request.method}`);
      }

      return {
        id: request.id,
        result
      };
    } catch (error) {
      return {
        id: request.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
          data: error instanceof Error ? { stack: error.stack } : undefined
        }
      };
    }
  }

  /**
   * Create MCP session
   */
  async createMCPSession(clientId: string): Promise<MCPSession> {
    if (this.networkInterrupted) {
      throw new Error('Network interrupted');
    }

    const session: MCPSession = {
      id: `session_${clientId}_${Date.now()}`,
      clientId,
      createdAt: new Date(),
      active: true
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Simulate network interruption for testing
   */
  simulateNetworkInterruption(enabled: boolean): void {
    this.networkInterrupted = enabled;
  }

  /**
   * Generate content for a resource (for testing/simulation)
   */
  private async generateResourceContent(resource: ResourceDescriptor, params: Record<string, unknown>) {
    return {
      type: resource.type,
      name: resource.name || resource.type,
      description: resource.description,
      params,
      timestamp: new Date().toISOString(),
      data: `Generated content for ${resource.type}`
    };
  }

  /**
   * Extract resource type from URI
   */
  private extractTypeFromUri(uri: string): string {
    const match = uri.match(/mcp:\/\/resource\/(.+)/);
    return match?.[1] || uri;
  }
}