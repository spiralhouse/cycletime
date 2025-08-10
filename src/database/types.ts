/**
 * TypeScript interfaces for cross-session state persistence tables
 * Part of SPI-371: Create SQLite schema for cross-session state persistence
 */

/**
 * Session state record for maintaining data across Claude Code sessions
 */
export interface SessionState {
  id: string;
  session_key: string;
  project_id?: string;
  current_context: string; // JSON blob
  last_activity: number; // Unix timestamp
  created_at: number;
  updated_at: number;
}

/**
 * Input for creating new session state records
 */
export interface CreateSessionState {
  session_key: string;
  project_id?: string;
  current_context: string;
}

/**
 * Input for updating session state records
 */
export interface UpdateSessionState {
  current_context?: string;
  last_activity?: number;
}

/**
 * MCP resource metadata for tracking external resources
 */
export interface ResourceMetadata {
  id: string;
  resource_type: string;
  resource_id: string;
  last_accessed: number;
  access_count: number;
  metadata_json?: string;
  created_at: number;
  updated_at: number;
}

/**
 * Input for creating new MCP resource metadata records
 */
export interface CreateResourceMetadata {
  resource_type: string;
  resource_id: string;
  metadata_json?: string;
}

/**
 * Input for updating MCP resource metadata records
 */
export interface UpdateResourceMetadata {
  metadata_json?: string;
  last_accessed?: number;
}

/**
 * MCP access log record for debugging and audit trails
 */
export interface ResourceAccessLog {
  id: string;
  session_key?: string;
  resource_uri: string;
  operation: string; // 'read', 'list', 'create', 'update', 'delete'
  success: boolean;
  error_message?: string;
  timestamp: number;
}

/**
 * Input for creating new MCP access log records
 */
export interface CreateResourceAccessLog {
  session_key?: string;
  resource_uri: string;
  operation: string;
  success: boolean;
  error_message?: string;
}

/**
 * Query filters for session state records
 */
export interface SessionStateFilter {
  project_id?: string;
  session_key?: string;
}

/**
 * Query filters for MCP resource metadata
 */
export interface ResourceMetadataFilter {
  resource_type?: string;
  resource_id?: string;
  accessed_since?: number;
}

/**
 * Query filters for MCP access logs
 */
export interface ResourceAccessLogFilter {
  session_key?: string;
  resource_uri?: string;
  operation?: string;
  since?: number;
  until?: number;
}