/**
 * Database module exports for cross-session state persistence
 * Part of SPI-371: Create SQLite schema for cross-session state persistence
 */

export { migrations } from './migrations.js';
export type { Migration } from './migrations.js';
export { MigrationRunner } from './migration-runner.js';
export type {
  SessionStateData,
  CreateSessionState,
  UpdateSessionState,
  ResourceMetadata,
  CreateResourceMetadata,
  UpdateResourceMetadata,
  ResourceAccessLog,
  CreateResourceAccessLog,
  SessionStateFilter,
  ResourceMetadataFilter,
  ResourceAccessLogFilter,
} from './types.js';
