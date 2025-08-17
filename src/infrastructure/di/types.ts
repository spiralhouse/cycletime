/**
 * Dependency Injection Container Types
 */

/**
 * Service lifecycle types
 */
export type ServiceLifecycle = 'singleton' | 'transient' | 'scoped';

/**
 * Service factory function that creates service instances
 */
export type ServiceFactory<T = any> = (container: IServiceContainer) => T | Promise<T>;

/**
 * Options for service registration
 */
export interface ServiceRegistrationOptions {
  /**
   * Override existing registration
   */
  override?: boolean;
}

/**
 * Service descriptor containing metadata about a registered service
 */
export interface ServiceDescriptor<T = any> {
  /**
   * Service factory function
   */
  factory: ServiceFactory<T>;
  
  /**
   * Service lifecycle
   */
  lifecycle: ServiceLifecycle;
  
  /**
   * Optional service metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Service container interface
 */
export interface IServiceContainer {
  /**
   * Register a service in the container
   */
  register: <T = any>(
    token: string,
    factory: ServiceFactory<T>,
    lifecycle: ServiceLifecycle,
    options?: ServiceRegistrationOptions
  ) => void;
  
  /**
   * Resolve a service from the container
   */
  resolve: <T = any>(token: string) => T;
  
  /**
   * Resolve a service asynchronously
   */
  resolveAsync: <T = any>(token: string) => Promise<T>;
  
  /**
   * Check if a service is registered
   */
  has: (token: string) => boolean;
  
  /**
   * Get service descriptor
   */
  getDescriptor: <T = any>(token: string) => ServiceDescriptor<T> | undefined;
  
  /**
   * Get all registered service tokens
   */
  getRegisteredServices: () => string[];
  
  /**
   * Create a scoped container
   */
  createScope: () => IServiceContainer;
  
  /**
   * Dispose the container and all singleton instances
   */
  dispose: () => void;
}

/**
 * Disposable interface for services that need cleanup
 */
export interface IDisposable {
  dispose: () => void | Promise<void>;
}

/**
 * Check if an object is disposable
 */
export function isDisposable(obj: any): obj is IDisposable {
  return obj && typeof obj.dispose === 'function';
}

/**
 * Container configuration interface
 */
export interface ContainerConfiguration {
  /**
   * Enable strict mode (throws on duplicate registrations)
   */
  strictMode?: boolean;
  
  /**
   * Enable debug logging
   */
  enableLogging?: boolean;
  
  /**
   * Custom logger
   */
  logger?: (message: string, level: 'debug' | 'info' | 'warn' | 'error') => void;
}

/**
 * Dependency resolution context for tracking circular dependencies
 */
export interface ResolutionContext {
  /**
   * Stack of tokens being resolved
   */
  resolutionStack: string[];
  
  /**
   * Scoped instances for scoped services
   */
  scopedInstances: Map<string, any>;
}