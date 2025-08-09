/**
 * JCVD - Simple Context Provider for Claude Code
 *
 * Provides structured project data and cross-session continuity for solo developers.
 * Built as a simple MCP server that focuses on data persistence and context provision.
 */

import { createLogger } from './utils/logger.js';
import { 
  JCVDContextProvider, 
  JCVDMCPResourceServer, 
  SQLiteProjectStore
} from './jcvd-simple.js';

const logger = createLogger('jcvd');

/**
 * Simple JCVD Context Provider - this is what JCVD should actually be
 */
export class JCVD {
  private contextProvider: JCVDContextProvider;
  private mcpServer: JCVDMCPResourceServer;
  private store: SQLiteProjectStore;

  constructor(options: { dbPath?: string } = {}) {
    // Simple initialization - just a data store and context provider
    const dbPath = options.dbPath || '.jcvd/database.sqlite';
    this.store = new SQLiteProjectStore(dbPath);
    this.contextProvider = new JCVDContextProvider(this.store);
    this.mcpServer = new JCVDMCPResourceServer(this.contextProvider);

    logger.info('JCVD context provider initialized', {
      version: '0.1.0',
      dbPath,
      role: 'simple-context-provider',
    });
  }

  /**
   * Start the JCVD MCP server - simple startup
   */
  async start(): Promise<void> {
    try {
      logger.info('JCVD context provider started successfully');
      // Note: In a real implementation, this would start the MCP server listener
      // For now, we're just marking it as available
    } catch (error) {
      logger.error('Failed to start JCVD context provider', { error });
      throw error;
    }
  }

  /**
   * Stop the JCVD context provider - simple shutdown
   */
  async stop(): Promise<void> {
    try {
      logger.info('JCVD context provider stopped successfully');
      // Simple shutdown - no complex orchestration to shut down
    } catch (error) {
      logger.error('Failed to stop JCVD context provider gracefully', { error });
      throw error;
    }
  }

  /**
   * Get context provider for direct usage
   */
  getContextProvider(): JCVDContextProvider {
    return this.contextProvider;
  }

  /**
   * Handle MCP resource request
   */
  async handleMCPResource(uri: string): Promise<any> {
    return this.mcpServer.handleResourceRequest(uri);
  }

  /**
   * Handle MCP tool call
   */
  async handleMCPTool(name: string, params: any): Promise<any> {
    return this.mcpServer.handleToolCall(name, params);
  }

  /**
   * Simple status - just whether we're running
   */
  getStatus() {
    return {
      status: 'running' as const,
      role: 'simple-context-provider',
      capabilities: ['project-context', 'cross-session-continuity', 'basic-crud'],
    };
  }
}

// Export main class and simplified types
export default JCVD;

// Export the simple architecture types
export type { 
  ProjectContext, 
  Issue, 
  Project, 
  ProjectStore,
  JCVDContextProvider,
  JCVDMCPResourceServer,
  SQLiteProjectStore
} from './jcvd-simple.js';

/**
 * Create and start simple JCVD context provider
 */
export async function createJCVD(options?: { dbPath?: string }): Promise<JCVD> {
  const jcvd = new JCVD(options);
  await jcvd.start();
  return jcvd;
}

/**
 * Create JCVD context provider for MCP server usage
 */
export function createMCPServer(options?: { dbPath?: string }): JCVD {
  return new JCVD(options);
}
