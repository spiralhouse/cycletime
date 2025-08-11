/**
 * JCVD - Simple Context Provider for Claude Code
 *
 * Main entry point for JCVD functionality
 */

export {
  JCVD,
  SqliteProjectStore,
  JCVDContextProvider,
  JCVDMCPResourceServer,
  createJCVD,
} from './jcvd-simple.js';

export type { Project, Issue, ProjectContext, JCVDConfig } from './jcvd-simple.js';

export { SqliteStore } from './sqlite-store.js';
export { JcvdMcpServer } from './mcp-server.js';

// Database and session management exports
export * from './database/index.js';
export * from './mcp/session/index.js';

// Default export is the main JCVD class
export { default } from './jcvd-simple.js';
