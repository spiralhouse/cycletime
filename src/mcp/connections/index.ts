/**
 * MCP Connection Management System
 *
 * This module provides comprehensive connection management for MCP client connections,
 * including state tracking, message queuing, transport abstraction, and connection pooling.
 */

// Core connection state management
export {
  ConnectionState,
  ConnectionStatus,
  type ConnectionMetadata,
  type ConnectionStatistics,
  type MessageType,
} from './connection-state.js';

// Message queuing and flow control
export {
  MessageQueue,
  MessagePriority,
  type Message,
  type QueuedMessage,
  type QueueResult,
  type QueueConfig,
  type QueueStatistics,
} from './message-queue.js';

// Main connection manager
export {
  ConnectionManager,
  type ConnectionConfig,
  type ConnectionResult,
  type ConnectionManagerStatistics,
  type HealthInfo,
} from './connection-manager.js';

// Transport abstraction
export {
  TransportHandler,
  TransportType,
  type TransportConfig,
  type TransportResult,
  type TransportStatistics,
} from './transport-handler.js';

// Connection pooling
export {
  ConnectionPool,
  type PoolConfig,
  type PoolResult,
  type PoolConnection,
  type PoolStatistics,
} from './connection-pool.js';
