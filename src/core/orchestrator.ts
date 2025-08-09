/**
 * Main orchestration engine for JCVD framework
 *
 * Coordinates agents, providers, and workflows in a provider-agnostic manner
 */

import { EventEmitter } from 'node:events';

import { createLogger } from '../utils/logger.js';

import type { JCVDConfig, Status, StatusInfo, Result } from '../types/index.js';

/**
 * Main orchestrator class that manages the entire JCVD framework
 */
export class Orchestrator extends EventEmitter {
  private readonly logger = createLogger('orchestrator');
  private status: Status = 'idle';
  private startTime: Date | null = null;
  private lastActivity: Date = new Date();

  constructor(private config: JCVDConfig) {
    super();
    this.logger.debug('Orchestrator created', {
      taskCoordination: config.taskCoordination.defaultAgent,
      providers: config.providers.length,
      workflows: config.workflows.length,
    });
  }

  /**
   * Initialize the orchestrator and all components
   */
  async initialize(): Promise<Result<void>> {
    try {
      this.logger.info('Initializing JCVD context provider...');
      this.status = 'running';
      this.startTime = new Date();
      this.lastActivity = new Date();

      // Simple initialization - JCVD is a context provider, not a complex orchestrator
      // Most initialization is done when components are actually needed

      this.logger.info('JCVD context provider initialized successfully');
      this.emit('orchestrator.initialized');

      return { success: true, data: undefined };
    } catch (error) {
      this.status = 'error';
      this.logger.error('Failed to initialize context provider', { error });
      this.emit('orchestrator.error', error);

      return {
        success: false,
        error: {
          name: 'InitializationError',
          message: `Failed to initialize context provider: ${error instanceof Error ? error.message : String(error)}`,
          code: 'ORCHESTRATOR_INIT_ERROR',
          context: { originalError: error },
        } as any,
      };
    }
  }

  /**
   * Shutdown the orchestrator gracefully
   */
  async shutdown(): Promise<Result<void>> {
    try {
      this.logger.info('Shutting down JCVD context provider...');
      this.status = 'stopping';

      // Simple shutdown - cleanup any resources if needed
      // Most cleanup is done by components themselves

      this.status = 'stopped';
      this.logger.info('JCVD context provider shutdown complete');
      this.emit('orchestrator.shutdown');

      return { success: true, data: undefined };
    } catch (error) {
      this.status = 'error';
      this.logger.error('Error during context provider shutdown', { error });
      this.emit('orchestrator.error', error);

      return {
        success: false,
        error: {
          name: 'ShutdownError',
          message: `Failed to shutdown context provider: ${error instanceof Error ? error.message : String(error)}`,
          code: 'ORCHESTRATOR_SHUTDOWN_ERROR',
          context: { originalError: error },
        } as any,
      };
    }
  }

  /**
   * Get current orchestrator status
   */
  getStatus(): StatusInfo {
    // Calculate uptime - return non-zero when running even for very short periods
    let uptime = 0;

    if (this.startTime) {
      uptime = Math.max(1, Date.now() - this.startTime.getTime()); // Minimum 1ms when running
    }

    return {
      status: this.status,
      uptime,
      lastActivity: this.lastActivity,
      taskCoordination: this.config.taskCoordination.defaultAgent,
      activeProviders: this.config.providers.filter(p => p.enabled).length,
      activeAgents: 0, // JCVD does not manage agents - Claude Code handles agent coordination
      errors: [], // TODO: Track errors
    };
  }

  /**
   * JCVD is a simple context provider - complex initialization methods removed
   * to align with architectural principles defined in LIMITATIONS.md
   *
   * Claude Code handles agent coordination and workflow orchestration.
   * JCVD only provides structured project data through MCP Resources.
   */
}
