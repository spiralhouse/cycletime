/**
 * Dependency Injection Container Implementation
 */

import type {
  ServiceLifecycle,
  ServiceFactory,
  ServiceDescriptor,
  ServiceRegistrationOptions,
  IServiceContainer,
  IDisposable,
  ContainerConfiguration,
  ResolutionContext
} from './types.js';

import { isDisposable } from './types.js';

/**
 * Dependency Injection Container
 * Manages service registration, resolution, and lifecycle
 */
export class DIContainer implements IServiceContainer {
  private services = new Map<string, ServiceDescriptor>();
  private singletonInstances = new Map<string, any>();
  private resolutionStack: string[] = [];
  private scopedInstances = new Map<string, any>();
  private parentContainer?: DIContainer;
  private config: ContainerConfiguration;

  constructor(config: ContainerConfiguration = {}, parentContainer?: DIContainer) {
    this.config = config;
    this.parentContainer = parentContainer;
  }

  /**
   * Register a service in the container
   */
  register<T = any>(
    token: string,
    factory: ServiceFactory<T>,
    lifecycle: ServiceLifecycle,
    options: ServiceRegistrationOptions = {}
  ): void {
    if (this.services.has(token) && !options.override) {
      throw new Error(`Service ${token} is already registered`);
    }

    const descriptor: ServiceDescriptor<T> = {
      factory,
      lifecycle
    };

    this.services.set(token, descriptor);
    this.log(`Service ${token} registered with ${lifecycle} lifecycle`, 'debug');
  }

  /**
   * Resolve a service from the container
   */
  resolve<T = any>(token: string): T {
    // Check for circular dependencies
    if (this.resolutionStack.includes(token)) {
      const cycle = [...this.resolutionStack, token].join(' -> ');
      throw new Error(`Circular dependency detected: ${cycle}`);
    }

    // Get service descriptor
    const descriptor = this.getDescriptorFromHierarchy(token);
    if (!descriptor) {
      throw new Error(`Service ${token} is not registered`);
    }

    this.resolutionStack.push(token);
    try {
      return this.createInstance<T>(token, descriptor);
    } catch (error) {
      if (error instanceof Error && !error.message.includes('Circular dependency')) {
        throw new Error(`Failed to create service ${token}: ${error.message}`);
      }
      throw error;
    } finally {
      this.resolutionStack.pop();
    }
  }

  /**
   * Resolve a service asynchronously
   */
  async resolveAsync<T = any>(token: string): Promise<T> {
    // Check for circular dependencies
    if (this.resolutionStack.includes(token)) {
      const cycle = [...this.resolutionStack, token].join(' -> ');
      throw new Error(`Circular dependency detected: ${cycle}`);
    }

    // Get service descriptor
    const descriptor = this.getDescriptorFromHierarchy(token);
    if (!descriptor) {
      throw new Error(`Service ${token} is not registered`);
    }

    this.resolutionStack.push(token);
    try {
      const instance = await this.createInstanceAsync<T>(token, descriptor);
      return instance;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('Circular dependency')) {
        throw new Error(`Failed to create service ${token}: ${error.message}`);
      }
      throw error;
    } finally {
      this.resolutionStack.pop();
    }
  }

  /**
   * Check if a service is registered
   */
  has(token: string): boolean {
    return this.services.has(token) || (this.parentContainer?.has(token) ?? false);
  }

  /**
   * Get service descriptor
   */
  getDescriptor<T = any>(token: string): ServiceDescriptor<T> | undefined {
    return this.services.get(token) as ServiceDescriptor<T> | undefined;
  }

  /**
   * Get all registered service tokens
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Create a scoped container
   */
  createScope(): IServiceContainer {
    return new DIContainer(this.config, this);
  }

  /**
   * Dispose the container and all singleton instances
   */
  dispose(): void {
    // Dispose all singleton instances that implement IDisposable
    for (const [token, instance] of this.singletonInstances) {
      if (isDisposable(instance)) {
        try {
          instance.dispose();
          this.log(`Disposed singleton service ${token}`, 'debug');
        } catch (error) {
          this.log(`Error disposing service ${token}: ${error}`, 'error');
        }
      }
    }

    // Clear all instances but keep registrations
    this.singletonInstances.clear();
    this.scopedInstances.clear();
    this.resolutionStack = [];
    
    this.log('Container disposed', 'info');
  }

  /**
   * Create an instance based on lifecycle
   */
  private createInstance<T>(token: string, descriptor: ServiceDescriptor<T>): T {
    switch (descriptor.lifecycle) {
      case 'singleton':
        return this.getOrCreateSingleton(token, descriptor);
      
      case 'transient':
        return descriptor.factory(this);
      
      case 'scoped':
        return this.getOrCreateScoped(token, descriptor);
      
      default:
        throw new Error(`Unknown lifecycle: ${descriptor.lifecycle}`);
    }
  }

  /**
   * Create an instance asynchronously
   */
  private async createInstanceAsync<T>(token: string, descriptor: ServiceDescriptor<T>): Promise<T> {
    switch (descriptor.lifecycle) {
      case 'singleton':
        return this.getOrCreateSingletonAsync(token, descriptor);
      
      case 'transient':
        return await descriptor.factory(this);
      
      case 'scoped':
        return this.getOrCreateScopedAsync(token, descriptor);
      
      default:
        throw new Error(`Unknown lifecycle: ${descriptor.lifecycle}`);
    }
  }

  /**
   * Get or create singleton instance
   */
  private getOrCreateSingleton<T>(token: string, descriptor: ServiceDescriptor<T>): T {
    // For singletons, always use the root container
    const rootContainer = this.getRootContainer();
    
    if (!rootContainer.singletonInstances.has(token)) {
      const instance = descriptor.factory(this);
      rootContainer.singletonInstances.set(token, instance);
    }

    return rootContainer.singletonInstances.get(token);
  }

  /**
   * Get or create singleton instance asynchronously
   */
  private async getOrCreateSingletonAsync<T>(token: string, descriptor: ServiceDescriptor<T>): Promise<T> {
    // For singletons, always use the root container
    const rootContainer = this.getRootContainer();
    
    if (!rootContainer.singletonInstances.has(token)) {
      const instance = await descriptor.factory(this);
      rootContainer.singletonInstances.set(token, instance);
    }

    return rootContainer.singletonInstances.get(token);
  }

  /**
   * Get or create scoped instance
   */
  private getOrCreateScoped<T>(token: string, descriptor: ServiceDescriptor<T>): T {
    if (!this.scopedInstances.has(token)) {
      const instance = descriptor.factory(this);
      this.scopedInstances.set(token, instance);
    }

    return this.scopedInstances.get(token);
  }

  /**
   * Get or create scoped instance asynchronously
   */
  private async getOrCreateScopedAsync<T>(token: string, descriptor: ServiceDescriptor<T>): Promise<T> {
    if (!this.scopedInstances.has(token)) {
      const instance = await descriptor.factory(this);
      this.scopedInstances.set(token, instance);
    }

    return this.scopedInstances.get(token);
  }

  /**
   * Get descriptor from current container or parent hierarchy
   */
  private getDescriptorFromHierarchy(token: string): ServiceDescriptor | undefined {
    return this.services.get(token) || this.parentContainer?.getDescriptorFromHierarchy(token);
  }

  /**
   * Get the root container in the hierarchy
   */
  private getRootContainer(): DIContainer {
    return this.parentContainer ? this.parentContainer.getRootContainer() : this;
  }

  /**
   * Log a message if logging is enabled
   */
  private log(message: string, level: 'debug' | 'info' | 'warn' | 'error'): void {
    if (this.config.enableLogging) {
      if (this.config.logger) {
        this.config.logger(message, level);
      } else {
        console[level](`[DIContainer] ${message}`);
      }
    }
  }
}