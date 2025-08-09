/**
 * MCP configuration management extending the base ConfigManager
 */

import { createLogger } from '../../utils/logger.js';

import {
  DEFAULT_MCP_CONFIG,
  PRODUCTION_MCP_CONFIG,
  MCP_ENV_VAR_MAPPING,
  type MCPServerConfig,
} from './mcp-config.js';

import type { Logger } from '../../utils/logger.js';

/**
 * MCP Configuration Manager that extends base configuration functionality
 */
export class MCPConfigManager {
  private static readonly logger: Logger = createLogger('mcp-config-manager');

  /**
   * Load MCP server configuration from all sources
   */
  static async loadMCPConfig(overrides?: Partial<MCPServerConfig>): Promise<MCPServerConfig> {
    this.logger.debug('Loading MCP configuration...');

    // Start with default configuration
    let config: MCPServerConfig = { ...DEFAULT_MCP_CONFIG };

    // Load from environment variables
    const envConfig = this.getEnvironmentVariables();

    if (Object.keys(envConfig).length > 0) {
      config = this.mergeConfigs(config, envConfig);
      this.logger.debug('Applied environment variable configuration');
    }

    // Apply overrides
    if (overrides) {
      config = this.mergeConfigs(config, overrides);
      this.logger.debug('Applied configuration overrides');
    }

    // Validate final configuration
    this.validateMCPConfig(config);

    this.logger.info('MCP configuration loaded successfully', {
      serverName: config.server.name,
      transport: config.server.transport,
      resourcesEnabled: config.resources.enabled,
      toolsEnabled: config.tools.enabled,
    });

    return config;
  }

  /**
   * Load MCP configuration for production environment
   */
  static async loadProductionMCPConfig(
    overrides?: Partial<MCPServerConfig>
  ): Promise<MCPServerConfig> {
    this.logger.debug('Loading production MCP configuration...');

    // Start with production defaults
    let config: MCPServerConfig = this.mergeConfigs(DEFAULT_MCP_CONFIG, PRODUCTION_MCP_CONFIG);

    // Apply environment variables
    const envConfig = this.getEnvironmentVariables();

    if (Object.keys(envConfig).length > 0) {
      config = this.mergeConfigs(config, envConfig);
    }

    // Apply overrides
    if (overrides) {
      config = this.mergeConfigs(config, overrides);
    }

    this.validateMCPConfig(config);

    this.logger.info('Production MCP configuration loaded', {
      serverName: config.server.name,
      transport: config.server.transport,
    });

    return config;
  }

  /**
   * Parse MCP-specific environment variables
   */
  static getEnvironmentVariables(): Partial<MCPServerConfig> {
    const envConfig: any = {};

    for (const [envVar, configPath] of Object.entries(MCP_ENV_VAR_MAPPING)) {
      const value = process.env[envVar];

      if (value !== undefined) {
        this.setNestedValue(envConfig, configPath, this.parseEnvironmentValue(value));
      }
    }

    return envConfig as Partial<MCPServerConfig>;
  }

  /**
   * Validate MCP server configuration
   */
  static validateMCPConfig(config: MCPServerConfig): void {
    this.logger.debug('Validating MCP configuration...');

    // Basic structure validation
    if (!config || typeof config !== 'object') {
      throw new Error('MCP configuration validation failed: config must be an object');
    }

    // Validate server configuration
    if (!config.server || typeof config.server !== 'object') {
      throw new Error('MCP configuration validation failed: server configuration is required');
    }

    if (
      !config.server.name ||
      typeof config.server.name !== 'string' ||
      config.server.name.trim() === ''
    ) {
      throw new Error(
        'MCP configuration validation failed: server.name is required and must be non-empty'
      );
    }

    if (
      !config.server.version ||
      typeof config.server.version !== 'string' ||
      config.server.version.trim() === ''
    ) {
      throw new Error(
        'MCP configuration validation failed: server.version is required and must be non-empty'
      );
    }

    if (!config.server.transport || !['stdio', 'websocket'].includes(config.server.transport)) {
      throw new Error(
        'MCP configuration validation failed: transport must be either "stdio" or "websocket"'
      );
    }

    // Validate websocket-specific requirements
    if (config.server.transport === 'websocket') {
      if (!config.server.port || typeof config.server.port !== 'number') {
        throw new Error(
          'MCP configuration validation failed: port is required when transport is "websocket"'
        );
      }

      if (config.server.port < 1 || config.server.port > 65_535) {
        throw new Error('MCP configuration validation failed: port must be between 1 and 65535');
      }
    }

    // Validate resources configuration
    if (!config.resources || typeof config.resources !== 'object') {
      throw new Error('MCP configuration validation failed: resources configuration is required');
    }

    if (typeof config.resources.enabled !== 'boolean') {
      throw new Error('MCP configuration validation failed: resources.enabled must be a boolean');
    }

    // Validate tools configuration
    if (!config.tools || typeof config.tools !== 'object') {
      throw new Error('MCP configuration validation failed: tools configuration is required');
    }

    if (typeof config.tools.enabled !== 'boolean') {
      throw new Error('MCP configuration validation failed: tools.enabled must be a boolean');
    }

    if (typeof config.tools.validationEnabled !== 'boolean') {
      throw new Error(
        'MCP configuration validation failed: tools.validationEnabled must be a boolean'
      );
    }

    // Validate health configuration
    if (!config.health || typeof config.health !== 'object') {
      throw new Error('MCP configuration validation failed: health configuration is required');
    }

    // Validate provider configuration
    if (!config.provider || typeof config.provider !== 'object') {
      throw new Error('MCP configuration validation failed: provider configuration is required');
    }

    if (
      !config.provider.type ||
      !['sqlite', 'linear', 'github', 'jira'].includes(config.provider.type)
    ) {
      throw new Error(
        'MCP configuration validation failed: provider.type must be one of: sqlite, linear, github, jira'
      );
    }

    if (!config.provider.config || typeof config.provider.config !== 'object') {
      throw new Error('MCP configuration validation failed: provider.config is required');
    }

    // Validate optional numeric fields
    if (
      config.resources.cacheSize !== undefined &&
      (typeof config.resources.cacheSize !== 'number' || config.resources.cacheSize < 1)
    ) {
      throw new Error(
        'MCP configuration validation failed: resources.cacheSize must be a positive number'
      );
    }

    if (
      config.resources.cacheTTL !== undefined &&
      (typeof config.resources.cacheTTL !== 'number' || config.resources.cacheTTL < 1)
    ) {
      throw new Error(
        'MCP configuration validation failed: resources.cacheTTL must be a positive number'
      );
    }

    if (
      config.tools.executionTimeout !== undefined &&
      (typeof config.tools.executionTimeout !== 'number' || config.tools.executionTimeout < 1000)
    ) {
      throw new Error(
        'MCP configuration validation failed: tools.executionTimeout must be at least 1000ms'
      );
    }

    if (
      config.health.checkInterval !== undefined &&
      (typeof config.health.checkInterval !== 'number' || config.health.checkInterval < 1000)
    ) {
      throw new Error(
        'MCP configuration validation failed: health.checkInterval must be at least 1000ms'
      );
    }

    if (
      config.health.timeoutMs !== undefined &&
      (typeof config.health.timeoutMs !== 'number' || config.health.timeoutMs < 100)
    ) {
      throw new Error(
        'MCP configuration validation failed: health.timeoutMs must be at least 100ms'
      );
    }

    this.logger.debug('MCP configuration validation passed');
  }

  /**
   * Merge two MCP configurations with deep merge logic
   */
  private static mergeConfigs(
    base: MCPServerConfig,
    override: Partial<MCPServerConfig>
  ): MCPServerConfig {
    const merged = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if (value === undefined) continue;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Deep merge objects
        merged[key as keyof MCPServerConfig] = {
          ...(merged[key as keyof MCPServerConfig] as any),
          ...value,
        };
      } else {
        // Direct assignment for primitives and arrays
        merged[key as keyof MCPServerConfig] = value as any;
      }
    }

    return merged;
  }

  /**
   * Set nested value in object using dot notation path
   */
  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];

      if (!key) continue; // Skip empty keys
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    const finalKey = keys[keys.length - 1];

    if (finalKey) {
      current[finalKey] = value;
    }
  }

  /**
   * Parse environment variable value to appropriate type
   */
  private static parseEnvironmentValue(value: string): any {
    // Boolean values
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Numeric values
    const num = Number(value);

    if (!isNaN(num) && isFinite(num)) {
      return num;
    }

    // String values
    return value;
  }

  /**
   * Get configuration schema for validation
   */
  static getConfigSchema(): any {
    return {
      server: {
        name: { type: 'string', required: true },
        version: { type: 'string', required: true },
        transport: { type: 'string', enum: ['stdio', 'websocket'], required: true },
        port: { type: 'number', min: 1, max: 65_535, conditionallyRequired: true },
      },
      resources: {
        enabled: { type: 'boolean', required: true },
        cacheSize: { type: 'number', min: 1 },
        cacheTTL: { type: 'number', min: 1 },
      },
      tools: {
        enabled: { type: 'boolean', required: true },
        validationEnabled: { type: 'boolean', required: true },
        executionTimeout: { type: 'number', min: 1000 },
      },
      health: {
        checkInterval: { type: 'number', min: 1000 },
        timeoutMs: { type: 'number', min: 100 },
      },
      provider: {
        type: { type: 'string', enum: ['sqlite', 'linear', 'github', 'jira'], required: true },
        config: { type: 'object', required: true },
      },
    };
  }

  /**
   * Update existing JCVD configuration with MCP settings
   */
  static updateJCVDConfigWithMCP(jcvdConfig: any, mcpConfig: MCPServerConfig): any {
    return {
      ...jcvdConfig,
      mcp: {
        enabled: true,
        serverConfig: mcpConfig,
        port: mcpConfig.server.port || 3001,
        host: 'localhost',
        transport: mcpConfig.server.transport,
      },
    };
  }
}
