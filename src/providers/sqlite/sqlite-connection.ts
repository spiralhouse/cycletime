/**
 * JCVD SQLite Connection Manager
 * High-performance SQLite connection management with transaction support
 *
 * This module handles SQLite database connections, transactions, and
 * performance optimizations specifically for the JCVD SQLite provider.
 */

import Database from 'better-sqlite3';

import type { TransactionCallback } from '../../database/models/schema-types.js';
import type { SQLiteProviderConfig, ProviderError, OperationResult } from '../types.js';
import type { Database as DatabaseType, Statement } from 'better-sqlite3';

// =============================================================================
// Connection Configuration and Types
// =============================================================================

export interface SQLiteConnectionOptions {
  /** Database file path */
  path: string;
  /** Enable WAL mode for better concurrency */
  enableWAL?: boolean;
  /** Database page cache size */
  cacheSize?: number;
  /** Connection timeout in milliseconds */
  timeout?: number;
  /** Enable foreign key constraints */
  enableForeignKeys?: boolean;
  /** Enable query optimization */
  optimizeQueries?: boolean;
  /** Maximum number of prepared statements to cache */
  maxPreparedStatements?: number;
}

export interface ConnectionMetrics {
  /** Number of active connections */
  activeConnections: number;
  /** Total queries executed */
  totalQueries: number;
  /** Total transactions executed */
  totalTransactions: number;
  /** Average query response time (ms) */
  averageQueryTime: number;
  /** Number of prepared statements cached */
  cachedStatements: number;
  /** Connection uptime in milliseconds */
  uptime: number;
}

// =============================================================================
// SQLite Connection Manager
// =============================================================================

/**
 * High-performance SQLite connection manager with advanced features
 */
export class SQLiteConnectionManager {
  private database: DatabaseType | null = null;
  private config: SQLiteConnectionOptions;
  private preparedStatements = new Map<string, Statement>();
  private metrics: ConnectionMetrics;
  private connected = false;
  private startTime = Date.now();

  constructor(config: SQLiteConnectionOptions) {
    this.config = {
      enableWAL: true,
      cacheSize: 2000,
      timeout: 5000,
      enableForeignKeys: true,
      optimizeQueries: true,
      maxPreparedStatements: 100,
      ...config,
    };

    this.metrics = {
      activeConnections: 0,
      totalQueries: 0,
      totalTransactions: 0,
      averageQueryTime: 0,
      cachedStatements: 0,
      uptime: 0,
    };
  }

  /**
   * Establish database connection with optimizations
   */
  async connect(): Promise<OperationResult<void>> {
    try {
      // Create database connection
      this.database = new Database(this.config.path, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
        timeout: this.config.timeout,
      });

      // Configure connection optimizations
      await this.configureConnection();

      this.connected = true;
      this.metrics.activeConnections = 1;
      this.startTime = Date.now();

      return {
        success: true,
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operationType: 'connection',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: this.createConnectionError(
          'CONNECTION_FAILED',
          error instanceof Error ? error.message : String(error)
        ),
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operationType: 'connection',
        },
      };
    }
  }

  /**
   * Close database connection and cleanup resources
   */
  async disconnect(): Promise<OperationResult<void>> {
    try {
      if (this.database) {
        // Clear prepared statement cache
        this.preparedStatements.clear();

        // Close database
        this.database.close();
        this.database = null;
      }

      this.connected = false;
      this.metrics.activeConnections = 0;

      return {
        success: true,
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operationType: 'disconnection',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: this.createConnectionError(
          'OPERATION_FAILED',
          error instanceof Error ? error.message : String(error)
        ),
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operationType: 'disconnection',
        },
      };
    }
  }

  /**
   * Execute a single SQL query with performance tracking
   */
  async executeQuery<T = any>(
    sql: string,
    params: any[] = []
  ): Promise<{ rows: T[]; lastID?: number; changes?: number }> {
    if (!this.database || !this.connected) {
      throw this.createConnectionError('CONNECTION_FAILED', 'Database not connected');
    }

    const startTime = Date.now();

    try {
      // Get or create prepared statement
      const statement = this.getPreparedStatement(sql);

      let result: any;

      // Execute based on query type
      if (sql.trim().toLowerCase().startsWith('select')) {
        result = { rows: statement.all(params) };
      } else {
        const info = statement.run(params);

        result = {
          rows: [],
          lastID: info.lastInsertRowid as number,
          changes: info.changes,
        };
      }

      // Update metrics
      const duration = Date.now() - startTime;

      this.updateQueryMetrics(duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.updateQueryMetrics(duration);

      throw this.createConnectionError(
        'OPERATION_FAILED',
        error instanceof Error ? error.message : String(error),
        {
          sql: `${sql.slice(0, 100)}...`,
          params: `${JSON.stringify(params).slice(0, 200)}...`,
        }
      );
    }
  }

  /**
   * Execute transaction with automatic rollback on error
   */
  async executeTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
    if (!this.database || !this.connected) {
      throw this.createConnectionError('CONNECTION_FAILED', 'Database not connected');
    }

    const startTime = Date.now();

    this.metrics.totalTransactions++;

    try {
      // Create transaction
      const transaction = this.database.transaction(() => {
        return callback();
      });

      // Execute transaction
      const result = transaction();

      // Update metrics
      const duration = Date.now() - startTime;

      this.updateQueryMetrics(duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.updateQueryMetrics(duration);

      throw this.createConnectionError(
        'OPERATION_FAILED',
        error instanceof Error ? error.message : String(error),
        {
          operation: 'transaction',
        }
      );
    }
  }

  /**
   * Execute batch operations efficiently
   */
  async executeBatch(operations: { sql: string; params: any[] }[]): Promise<void> {
    if (!this.database || !this.connected) {
      throw this.createConnectionError('CONNECTION_FAILED', 'Database not connected');
    }

    await this.executeTransaction(() => {
      for (const operation of operations) {
        const statement = this.getPreparedStatement(operation.sql);

        statement.run(operation.params);
      }
    });
  }

  /**
   * Check database health and performance
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      if (!this.database || !this.connected) {
        return {
          healthy: false,
          responseTime: Date.now() - startTime,
          error: 'Database not connected',
        };
      }

      // Simple health check query
      await this.executeQuery('SELECT 1 as health_check');

      return {
        healthy: true,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get connection metrics
   */
  getMetrics(): ConnectionMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      cachedStatements: this.preparedStatements.size,
    };
  }

  /**
   * Check if database is connected
   */
  isConnected(): boolean {
    return this.connected && this.database !== null;
  }

  /**
   * Get the underlying database instance (use with caution)
   */
  getDatabase(): DatabaseType | null {
    return this.database;
  }

  // =============================================================================
  // Private Implementation Methods
  // =============================================================================

  /**
   * Configure database connection with optimizations
   */
  private async configureConnection(): Promise<void> {
    if (!this.database) return;

    const pragmaStatements = [];

    // Enable foreign keys if configured
    if (this.config.enableForeignKeys) {
      pragmaStatements.push('PRAGMA foreign_keys = ON');
    }

    // Enable WAL mode for better concurrency
    if (this.config.enableWAL) {
      pragmaStatements.push('PRAGMA journal_mode = WAL');
    }

    // Set cache size for performance
    if (this.config.cacheSize) {
      pragmaStatements.push(`PRAGMA cache_size = ${this.config.cacheSize}`);
    }

    // Optimize for performance
    if (this.config.optimizeQueries) {
      pragmaStatements.push('PRAGMA synchronous = NORMAL');
      pragmaStatements.push('PRAGMA temp_store = MEMORY');
      pragmaStatements.push('PRAGMA mmap_size = 268435456'); // 256MB
    }

    // Execute configuration statements
    for (const pragma of pragmaStatements) {
      this.database.exec(pragma);
    }
  }

  /**
   * Get or create cached prepared statement
   */
  private getPreparedStatement(sql: string): Statement {
    let statement = this.preparedStatements.get(sql);

    if (!statement) {
      if (!this.database) {
        throw this.createConnectionError('CONNECTION_FAILED', 'Database not connected');
      }

      statement = this.database.prepare(sql);

      // Cache management - remove oldest if at limit
      if (this.preparedStatements.size >= (this.config.maxPreparedStatements || 100)) {
        const firstKey = this.preparedStatements.keys().next().value;

        if (firstKey) {
          this.preparedStatements.delete(firstKey);
        }
      }

      this.preparedStatements.set(sql, statement);
    }

    return statement;
  }

  /**
   * Update query performance metrics
   */
  private updateQueryMetrics(duration: number): void {
    this.metrics.totalQueries++;

    // Calculate rolling average
    const currentAverage = this.metrics.averageQueryTime;
    const queryCount = this.metrics.totalQueries;

    this.metrics.averageQueryTime = (currentAverage * (queryCount - 1) + duration) / queryCount;
  }

  /**
   * Create standardized connection error
   */
  private createConnectionError(
    code: string,
    message: string,
    context?: Record<string, any>
  ): ProviderError {
    return {
      name: 'SQLiteConnectionError',
      message,
      code: code as any,
      providerId: 'sqlite',
      providerType: 'sqlite',
      retryable: ['CONNECTION_FAILED', 'NETWORK_ERROR', 'TIMEOUT'].includes(code),
      context: {
        operation: 'connection',
        timestamp: new Date(),
        ...context,
      },
    };
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create connection manager from provider config
 */
export function createConnectionManager(config: SQLiteProviderConfig): SQLiteConnectionManager {
  const connectionOptions: SQLiteConnectionOptions = {
    path: config.databasePath,
    ...(config.enableWAL !== undefined && { enableWAL: config.enableWAL }),
    ...(config.cacheSize !== undefined && { cacheSize: config.cacheSize }),
    ...(config.timeout !== undefined && { timeout: config.timeout }),
    ...(config.enableForeignKeys !== undefined && { enableForeignKeys: config.enableForeignKeys }),
  };

  return new SQLiteConnectionManager(connectionOptions);
}

/**
 * Check if database file exists and is accessible
 */
export async function validateDatabasePath(path: string): Promise<{
  valid: boolean;
  exists: boolean;
  writable: boolean;
  error?: string;
}> {
  try {
    const fs = await import('node:fs/promises');
    const nodePath = await import('node:path');

    // Check if parent directory exists
    const parentDir = nodePath.dirname(path);

    try {
      await fs.access(parentDir, fs.constants.W_OK);
    } catch {
      return {
        valid: false,
        exists: false,
        writable: false,
        error: 'Parent directory does not exist or is not writable',
      };
    }

    // Check if file exists
    let exists = false;

    try {
      await fs.access(path, fs.constants.F_OK);
      exists = true;
    } catch {
      // File doesn't exist - that's okay for new databases
    }

    // Check if file is writable (or parent directory is writable for new files)
    let writable = false;

    try {
      if (exists) {
        await fs.access(path, fs.constants.W_OK);
        writable = true;
      } else {
        await fs.access(parentDir, fs.constants.W_OK);
        writable = true;
      }
    } catch {
      writable = false;
    }

    return {
      valid: writable,
      exists,
      writable,
      ...(!writable && { error: 'Database file or directory is not writable' }),
    };
  } catch (error) {
    return {
      valid: false,
      exists: false,
      writable: false,
      error: `Path validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
