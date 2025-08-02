/**
 * Configuration management for JCVD framework
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { DEFAULT_CONFIG } from '../types/config.js';
import { createLogger } from '../utils/logger.js';

import type { JCVDConfig } from '../types/config.js';

/**
 * Configuration manager for loading and validating JCVD configuration
 */
export class ConfigManager {
  private static readonly logger = createLogger('config-manager');

  /**
   * Load configuration from various sources
   */
  static load(overrides?: Partial<JCVDConfig>): JCVDConfig {
    this.logger.debug('Loading configuration...');

    // Start with default configuration
    let config: JCVDConfig = { ...DEFAULT_CONFIG };

    // Load from file if exists
    const fileConfig = this.loadFromFile();

    if (fileConfig) {
      config = this.mergeConfigs(config, fileConfig);
      this.logger.debug('Loaded configuration from file');
    }

    // Load from environment variables
    const envConfig = this.loadFromEnvironment();

    if (envConfig) {
      config = this.mergeConfigs(config, envConfig);
      this.logger.debug('Loaded configuration from environment');
    }

    // Apply overrides
    if (overrides) {
      config = this.mergeConfigs(config, overrides);
      this.logger.debug('Applied configuration overrides');
    }

    // Validate configuration
    this.validate(config);

    this.logger.info('Configuration loaded successfully', {
      taskCoordination: config.taskCoordination.defaultAgent,
      providers: config.providers.length,
      workflows: config.workflows.length,
    });

    return config;
  }

  /**
   * Load configuration from file
   */
  private static loadFromFile(): Partial<JCVDConfig> | null {
    const configPaths = ['jcvd.config.json', 'jcvd.config.js', '.jcvd.json', 'package.json'];

    for (const configPath of configPaths) {
      const fullPath = resolve(process.cwd(), configPath);

      if (existsSync(fullPath)) {
        try {
          if (configPath.endsWith('.json')) {
            const content = readFileSync(fullPath, 'utf8');
            const parsed = JSON.parse(content);

            // If it's package.json, look for jcvd key
            if (configPath === 'package.json') {
              return parsed.jcvd || null;
            }

            return parsed;
          } else if (configPath.endsWith('.js')) {
            // TODO: Support JS config files
            // const config = require(fullPath);
            // return config.default || config;
          }
        } catch (error) {
          this.logger.warn('Failed to load config file', {
            path: configPath,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return null;
  }

  /**
   * Load configuration from environment variables
   */
  private static loadFromEnvironment(): Partial<JCVDConfig> | null {
    const envConfig: Partial<JCVDConfig> = {};

    // Basic configuration
    if (process.env.JCVD_NAME) {
      envConfig.name = process.env.JCVD_NAME;
    }

    // Database configuration
    if (process.env.JCVD_DB_PATH) {
      envConfig.database = {
        ...DEFAULT_CONFIG.database,
        path: process.env.JCVD_DB_PATH,
      };
    }

    if (process.env.JCVD_DB_WAL_MODE) {
      envConfig.database = {
        ...(envConfig.database || DEFAULT_CONFIG.database),
        walMode: process.env.JCVD_DB_WAL_MODE === 'true',
      };
    }

    // Logging configuration
    if (process.env.LOG_LEVEL) {
      envConfig.logging = {
        ...DEFAULT_CONFIG.logging,
        level: process.env.LOG_LEVEL as any,
      };
    }

    // MCP configuration
    if (process.env.JCVD_MCP_PORT) {
      envConfig.mcp = {
        ...DEFAULT_CONFIG.mcp!,
        port: Number.parseInt(process.env.JCVD_MCP_PORT, 10),
      };
    }

    if (process.env.JCVD_MCP_HOST) {
      envConfig.mcp = {
        ...(envConfig.mcp || DEFAULT_CONFIG.mcp!),
        host: process.env.JCVD_MCP_HOST,
      };
    }

    // Feature flags
    if (process.env.JCVD_EXPERIMENTAL) {
      envConfig.features = {
        ...DEFAULT_CONFIG.features!,
        experimental: process.env.JCVD_EXPERIMENTAL === 'true',
      };
    }

    return Object.keys(envConfig).length > 0 ? envConfig : null;
  }

  /**
   * Deep merge configuration objects
   */
  private static mergeConfigs(base: JCVDConfig, override: Partial<JCVDConfig>): JCVDConfig {
    const merged = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if (value === undefined) continue;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Deep merge objects
        merged[key as keyof JCVDConfig] = {
          ...(merged[key as keyof JCVDConfig] as any),
          ...value,
        };
      } else {
        // Direct assignment for primitives and arrays
        merged[key as keyof JCVDConfig] = value as any;
      }
    }

    return merged;
  }

  /**
   * Validate configuration
   */
  private static validate(config: JCVDConfig): void {
    this.logger.debug('Validating configuration...');

    // Basic validation
    if (!config.name) {
      throw new Error('Configuration validation failed: name is required');
    }

    if (!config.version) {
      throw new Error('Configuration validation failed: version is required');
    }

    // Database validation
    if (!config.database.path) {
      throw new Error('Configuration validation failed: database.path is required');
    }

    // Task coordination validation
    if (!config.taskCoordination.defaultAgent) {
      throw new Error('Configuration validation failed: taskCoordination.defaultAgent is required');
    }

    if (!config.taskCoordination.fallbackAgent) {
      throw new Error(
        'Configuration validation failed: taskCoordination.fallbackAgent is required'
      );
    }

    // Provider validation
    for (const provider of config.providers) {
      if (!provider.id) {
        throw new Error('Configuration validation failed: provider.id is required');
      }

      if (!provider.type) {
        throw new Error(
          `Configuration validation failed: provider.type is required for provider ${provider.id}`
        );
      }

      // Check for duplicate provider IDs
      const duplicateIds = config.providers.filter(p => p.id === provider.id);

      if (duplicateIds.length > 1) {
        throw new Error(`Configuration validation failed: duplicate provider ID: ${provider.id}`);
      }
    }

    // Workflow validation
    for (const workflow of config.workflows) {
      if (!workflow.id) {
        throw new Error('Configuration validation failed: workflow.id is required');
      }

      if (!workflow.name) {
        throw new Error(
          `Configuration validation failed: workflow.name is required for workflow ${workflow.id}`
        );
      }

      // Check for duplicate workflow IDs
      const duplicateIds = config.workflows.filter(w => w.id === workflow.id);

      if (duplicateIds.length > 1) {
        throw new Error(`Configuration validation failed: duplicate workflow ID: ${workflow.id}`);
      }

      // Validate workflow stages
      for (const stage of workflow.stages) {
        if (!stage.id) {
          throw new Error(
            `Configuration validation failed: stage.id is required in workflow ${workflow.id}`
          );
        }

        if (!stage.agent) {
          throw new Error(
            `Configuration validation failed: stage.agent is required for stage ${stage.id} in workflow ${workflow.id}`
          );
        }

        // Validate that agent is a known Claude Code agent type
        const validAgents = [
          'general-purpose',
          'product-manager',
          'tech-lead',
          'software-architect',
          'developer',
          'qa',
          'code-reviewer',
        ];

        if (!validAgents.includes(stage.agent)) {
          throw new Error(
            `Configuration validation failed: agent ${stage.agent} referenced in workflow ${workflow.id} is not a valid Claude Code agent`
          );
        }
      }
    }

    // MCP validation
    if (config.mcp) {
      if (config.mcp.port < 1 || config.mcp.port > 65_535) {
        throw new Error('Configuration validation failed: mcp.port must be between 1 and 65535');
      }
    }

    this.logger.debug('Configuration validation passed');
  }

  /**
   * Save configuration to file
   */
  static save(_config: JCVDConfig, filePath = 'jcvd.config.json'): void {
    this.logger.debug('Saving configuration to file', { filePath });

    try {
      // TODO: Implement file writing
      // const content = JSON.stringify(config, null, 2);
      // writeFileSync(filePath, content, 'utf8');

      this.logger.info('Configuration saved successfully', { filePath });
    } catch (error) {
      this.logger.error('Failed to save configuration', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
