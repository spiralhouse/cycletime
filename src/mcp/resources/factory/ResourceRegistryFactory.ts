/**
 * Resource Registry Factory
 * Creates properly configured ResourceRegistry instances
 */


import { BasicResourceCache } from '../cache/index.js';
import { LogLevel } from '../interfaces/index.js';
import { ConsoleResourceLogger } from '../logging/index.js';
import { InMemoryResourceProvider, RealTimeProvider } from '../providers/index.js';
import { StandardResourceValidator } from '../validation/index.js';

import type { 
  ResourceProvider,
  ResourceCache, 
  ResourceValidator, 
  ResourceLogger,
  TimeProvider,
  CacheConfig,
  ValidationConfig,
  LoggerConfig
} from '../interfaces/index.js';

/**
 * Configuration for ResourceRegistry creation
 */
export interface ResourceRegistryConfig {
  /** Provider configuration */
  provider?: {
    type: 'memory' | 'sqlite';
    config?: Record<string, unknown>;
  };
  
  /** Cache configuration */
  cache?: CacheConfig;
  
  /** Validation configuration */
  validation?: ValidationConfig;
  
  /** Logger configuration */
  logging?: LoggerConfig;
  
  /** Environment (affects defaults) */
  environment?: 'development' | 'test' | 'production';
}

/**
 * Dependencies for ResourceRegistry
 */
export interface ResourceRegistryDependencies {
  provider: ResourceProvider;
  cache: ResourceCache;
  validator: ResourceValidator;
  logger: ResourceLogger;
  timeProvider: TimeProvider;
}

/**
 * Factory for creating ResourceRegistry instances with proper dependencies
 */
export class ResourceRegistryFactory {
  /**
   * Create a ResourceRegistry with default configuration
   */
  static create(config: ResourceRegistryConfig = {}): ResourceRegistryDependencies {
    const environment = config.environment || 'development';
    
    // Create time provider
    const timeProvider = new RealTimeProvider();
    
    // Create cache with environment-appropriate defaults
    const cacheConfig: CacheConfig = {
      maxSize: 1000,
      ttl: environment === 'production' ? 300_000 : 0, // 5 minutes in prod, no expiry in dev
      evictionPolicy: 'LRU',
      enableStats: environment !== 'test',
      ...config.cache,
    };
    
    const cache = new BasicResourceCache(cacheConfig, timeProvider);
    
    // Create validator with environment-appropriate defaults
    const validationConfig: ValidationConfig = {
      allowEmptyOptionals: true,
      allowedSchemes: ['http', 'https', 'file', 'mcp', 'jcvd'],
      maxStringLength: environment === 'production' ? 500 : 1000,
      validateHandlerMethods: environment !== 'test',
      ...config.validation,
    };
    
    const validator = new StandardResourceValidator(validationConfig);
    
    // Create logger with environment-appropriate defaults
    const loggerConfig: LoggerConfig = {
      level: environment === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      includeTimestamp: true,
      includeLevel: true,
      ...config.logging,
    };
    
    const logger = new ConsoleResourceLogger(loggerConfig, timeProvider);
    
    // Create provider based on configuration
    const provider = ResourceRegistryFactory.createProvider(config.provider);
    
    return {
      provider,
      cache,
      validator,
      logger,
      timeProvider,
    };
  }
  
  /**
   * Create a ResourceRegistry for testing with mock dependencies
   */
  static createForTesting(overrides: Partial<ResourceRegistryDependencies> = {}): ResourceRegistryDependencies {
    const baseConfig = ResourceRegistryFactory.create({ environment: 'test' });
    
    return {
      ...baseConfig,
      ...overrides,
    };
  }
  
  /**
   * Create a minimal ResourceRegistry with basic functionality
   */
  static createMinimal(): ResourceRegistryDependencies {
    const timeProvider = new RealTimeProvider();
    
    const cache = new BasicResourceCache({
      maxSize: 100,
      ttl: 0,
      evictionPolicy: 'FIFO',
      enableStats: false,
    }, timeProvider);
    
    const validator = new StandardResourceValidator({
      allowEmptyOptionals: true,
      allowedSchemes: [],
      maxStringLength: 500,
      validateHandlerMethods: false,
    });
    
    const logger = new ConsoleResourceLogger({
      level: LogLevel.ERROR,
      includeTimestamp: false,
      includeLevel: false,
    }, timeProvider);
    
    const provider = new InMemoryResourceProvider();
    
    return {
      provider,
      cache,
      validator,
      logger,
      timeProvider,
    };
  }
  
  /**
   * Create provider based on configuration
   */
  private static createProvider(config?: ResourceRegistryConfig['provider']): ResourceProvider {
    const type = config?.type || 'memory';
    
    switch (type) {
      case 'memory':
        return new InMemoryResourceProvider();
      
      case 'sqlite':
        // Future implementation for SQLite provider
        throw new Error('SQLite provider not yet implemented. Use memory provider for now.');
      
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }
}