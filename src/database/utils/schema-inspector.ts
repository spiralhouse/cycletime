/**
 * JCVD Schema Inspector
 * Tools for analyzing database schema and planning migrations
 */

import { SchemaVersioning } from '../migrations/schema-versioning.js';

import type {
  SchemaComparison,
  TableModification,
  ColumnDefinition,
  ColumnModification,
  SchemaSnapshot,
} from '../migrations/migration-types.js';

// =============================================================================
// Schema Information Types
// =============================================================================

export interface TableInfo {
  name: string;
  type: 'table' | 'view';
  sql: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  foreign_keys: ForeignKeyInfo[];
  triggers: TriggerInfo[];
}

export interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: boolean;
  dflt_value: string | null;
  pk: boolean;
}

export interface IndexInfo {
  name: string;
  unique: boolean;
  table: string;
  columns: string[];
  sql: string;
}

export interface ForeignKeyInfo {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
  on_update: string;
  on_delete: string;
  match: string;
}

export interface TriggerInfo {
  name: string;
  table: string;
  sql: string;
}

export interface SchemaInfo {
  version: string;
  tables: TableInfo[];
  indexes: IndexInfo[];
  triggers: TriggerInfo[];
  views: string[];
  user_defined_functions: string[];
  schema_metadata: Record<string, string>;
}

// =============================================================================
// Schema Inspector Core
// =============================================================================

export class SchemaInspector {
  private db: any; // TODO: Type with proper DB abstraction

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Get complete schema information
   */
  async getSchemaInfo(): Promise<SchemaInfo> {
    const [version, tables, indexes, triggers, views, metadata] = await Promise.all([
      this.getCurrentVersion(),
      this.getAllTables(),
      this.getAllIndexes(),
      this.getAllTriggers(),
      this.getAllViews(),
      this.getSchemaMetadata(),
    ]);

    return {
      version,
      tables,
      indexes,
      triggers,
      views,
      user_defined_functions: [], // SQLite doesn't support UDFs by default
      schema_metadata: metadata,
    };
  }

  /**
   * Get current schema version
   */
  async getCurrentVersion(): Promise<string> {
    try {
      const result = await this.db.query(`
        SELECT version FROM schema_versions 
        WHERE is_current = TRUE 
        LIMIT 1
      `);

      return result.length > 0 ? result[0].version : '1.0.0';
    } catch {
      // Fallback to schema_metadata table
      try {
        const result = await this.db.query(`
          SELECT value FROM schema_metadata 
          WHERE key = 'version' 
          LIMIT 1
        `);

        return result.length > 0 ? result[0].value : '1.0.0';
      } catch {
        return '1.0.0';
      }
    }
  }

  /**
   * Get all tables with detailed information
   */
  async getAllTables(): Promise<TableInfo[]> {
    // Get all tables and views
    const tables = await this.db.query(`
      SELECT name, type, sql 
      FROM sqlite_master 
      WHERE type IN ('table', 'view') 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    const tableInfos: TableInfo[] = [];

    for (const table of tables) {
      const columns = await this.getTableColumns(table.name);
      const indexes = await this.getTableIndexes(table.name);
      const foreignKeys = await this.getTableForeignKeys(table.name);
      const triggers = await this.getTableTriggers(table.name);

      tableInfos.push({
        name: table.name,
        type: table.type,
        sql: table.sql || '',
        columns,
        indexes,
        foreign_keys: foreignKeys,
        triggers,
      });
    }

    return tableInfos;
  }

  /**
   * Get columns for a specific table
   */
  async getTableColumns(tableName: string): Promise<ColumnInfo[]> {
    return await this.db.query(`PRAGMA table_info(${tableName})`);
  }

  /**
   * Get indexes for a specific table
   */
  async getTableIndexes(tableName: string): Promise<IndexInfo[]> {
    const indexes = await this.db.query(
      `
      SELECT name, [unique], sql 
      FROM sqlite_master 
      WHERE type = 'index' 
      AND tbl_name = ? 
      AND name NOT LIKE 'sqlite_%'
    `,
      [tableName]
    );

    const indexInfos: IndexInfo[] = [];

    for (const index of indexes) {
      const columns = await this.getIndexColumns(index.name);

      indexInfos.push({
        name: index.name,
        unique: index.unique === 1,
        table: tableName,
        columns: columns.map(c => c.name),
        sql: index.sql || '',
      });
    }

    return indexInfos;
  }

  /**
   * Get columns for a specific index
   */
  async getIndexColumns(
    indexName: string
  ): Promise<{ seqno: number; cid: number; name: string }[]> {
    return await this.db.query(`PRAGMA index_info(${indexName})`);
  }

  /**
   * Get foreign keys for a specific table
   */
  async getTableForeignKeys(tableName: string): Promise<ForeignKeyInfo[]> {
    return await this.db.query(`PRAGMA foreign_key_list(${tableName})`);
  }

  /**
   * Get triggers for a specific table
   */
  async getTableTriggers(tableName: string): Promise<TriggerInfo[]> {
    const triggers = await this.db.query(
      `
      SELECT name, sql 
      FROM sqlite_master 
      WHERE type = 'trigger' 
      AND tbl_name = ?
    `,
      [tableName]
    );

    return triggers.map((trigger: any) => ({
      name: trigger.name,
      table: tableName,
      sql: trigger.sql || '',
    }));
  }

  /**
   * Get all indexes in the database
   */
  async getAllIndexes(): Promise<IndexInfo[]> {
    const indexes = await this.db.query(`
      SELECT name, tbl_name, [unique], sql 
      FROM sqlite_master 
      WHERE type = 'index' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    const indexInfos: IndexInfo[] = [];

    for (const index of indexes) {
      const columns = await this.getIndexColumns(index.name);

      indexInfos.push({
        name: index.name,
        unique: index.unique === 1,
        table: index.tbl_name,
        columns: columns.map(c => c.name),
        sql: index.sql || '',
      });
    }

    return indexInfos;
  }

  /**
   * Get all triggers in the database
   */
  async getAllTriggers(): Promise<TriggerInfo[]> {
    const triggers = await this.db.query(`
      SELECT name, tbl_name, sql 
      FROM sqlite_master 
      WHERE type = 'trigger'
      ORDER BY name
    `);

    return triggers.map((trigger: any) => ({
      name: trigger.name,
      table: trigger.tbl_name,
      sql: trigger.sql || '',
    }));
  }

  /**
   * Get all views in the database
   */
  async getAllViews(): Promise<string[]> {
    const views = await this.db.query(`
      SELECT name 
      FROM sqlite_master 
      WHERE type = 'view'
      ORDER BY name
    `);

    return views.map((view: any) => view.name);
  }

  /**
   * Get schema metadata
   */
  async getSchemaMetadata(): Promise<Record<string, string>> {
    try {
      const metadata = await this.db.query(`
        SELECT key, value 
        FROM schema_metadata
        ORDER BY key
      `);

      const result: Record<string, string> = {};

      for (const row of metadata) {
        result[row.key] = row.value;
      }

      return result;
    } catch {
      return {};
    }
  }

  /**
   * Generate schema DDL for the entire database
   */
  async generateSchemaDDL(): Promise<string> {
    const schemaInfo = await this.getSchemaInfo();
    const ddlParts: string[] = [];

    // Add header
    ddlParts.push(`-- JCVD Database Schema DDL`);
    ddlParts.push(`-- Generated: ${new Date().toISOString()}`);
    ddlParts.push(`-- Version: ${schemaInfo.version}`);
    ddlParts.push('');
    ddlParts.push('-- Enable foreign key support');
    ddlParts.push('PRAGMA foreign_keys = ON;');
    ddlParts.push('');

    // Add tables
    ddlParts.push(
      '-- ============================================================================='
    );
    ddlParts.push('-- Tables');
    ddlParts.push(
      '-- ============================================================================='
    );
    ddlParts.push('');

    const tables = schemaInfo.tables.filter(t => t.type === 'table');

    for (const table of tables) {
      if (table.sql) {
        ddlParts.push(`${table.sql};`);
        ddlParts.push('');
      }
    }

    // Add indexes
    if (schemaInfo.indexes.length > 0) {
      ddlParts.push(
        '-- ============================================================================='
      );
      ddlParts.push('-- Indexes');
      ddlParts.push(
        '-- ============================================================================='
      );
      ddlParts.push('');

      for (const index of schemaInfo.indexes) {
        if (index.sql) {
          ddlParts.push(`${index.sql};`);
        }
      }
      ddlParts.push('');
    }

    // Add triggers
    if (schemaInfo.triggers.length > 0) {
      ddlParts.push(
        '-- ============================================================================='
      );
      ddlParts.push('-- Triggers');
      ddlParts.push(
        '-- ============================================================================='
      );
      ddlParts.push('');

      for (const trigger of schemaInfo.triggers) {
        if (trigger.sql) {
          ddlParts.push(`${trigger.sql};`);
          ddlParts.push('');
        }
      }
    }

    // Add views
    const views = schemaInfo.tables.filter(t => t.type === 'view');

    if (views.length > 0) {
      ddlParts.push(
        '-- ============================================================================='
      );
      ddlParts.push('-- Views');
      ddlParts.push(
        '-- ============================================================================='
      );
      ddlParts.push('');

      for (const view of views as any[]) {
        if (view.sql) {
          ddlParts.push(`${view.sql};`);
          ddlParts.push('');
        }
      }
    }

    return ddlParts.join('\\n');
  }

  /**
   * Create a schema snapshot
   */
  async createSnapshot(description: string = 'Schema snapshot'): Promise<SchemaSnapshot> {
    const version = await this.getCurrentVersion();
    const schemaDDL = await this.generateSchemaDDL();
    const id = `snapshot_${Date.now()}`;

    // Calculate sample data for critical tables
    const dataSample = await this.generateDataSample();

    const snapshot: SchemaSnapshot = {
      id,
      version,
      schema_ddl: schemaDDL,
      data_sample: dataSample,
      description,
      size_bytes: Buffer.byteLength(schemaDDL, 'utf8'),
      checksum: SchemaVersioning.generateFingerprint(schemaDDL),
      created_at: new Date(),
    };

    // Save snapshot to database
    await this.saveSnapshot(snapshot);

    return snapshot;
  }

  /**
   * Generate data sample for critical tables
   */
  async generateDataSample(): Promise<Record<string, any[]>> {
    const criticalTables = ['schema_metadata', 'schema_versions', 'schema_migrations'];
    const sample: Record<string, any[]> = {};

    for (const tableName of criticalTables) {
      try {
        const data = await this.db.query(`SELECT * FROM ${tableName} LIMIT 10`);

        sample[tableName] = data;
      } catch {
        // Table doesn't exist, skip
      }
    }

    return sample;
  }

  /**
   * Save snapshot to database
   */
  async saveSnapshot(snapshot: SchemaSnapshot): Promise<void> {
    try {
      await this.db.query(
        `
        INSERT INTO schema_snapshots (
          id, version, snapshot_type, schema_ddl, data_sample, 
          description, size_bytes, checksum, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          snapshot.id,
          snapshot.version,
          'manual',
          snapshot.schema_ddl,
          JSON.stringify(snapshot.data_sample),
          snapshot.description,
          snapshot.size_bytes,
          snapshot.checksum,
          'schema_inspector',
        ]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.warn('Failed to save snapshot to database:', errorMessage);
    }
  }

  /**
   * Compare two schema versions
   */
  async compareSchemas(baseVersion: string, targetVersion: string): Promise<SchemaComparison> {
    // For now, we'll implement a basic comparison
    // In a real implementation, this would compare actual schema snapshots

    const baseSchema = await this.getSchemaForVersion(baseVersion);
    const targetSchema = await this.getSchemaForVersion(targetVersion);

    return this.compareSchemaInfos(baseSchema, targetSchema);
  }

  /**
   * Get schema information for a specific version
   */
  async getSchemaForVersion(_version: string): Promise<SchemaInfo> {
    // TODO: Load schema from snapshot or reconstruct from migrations
    // For now, return current schema
    return await this.getSchemaInfo();
  }

  /**
   * Compare two schema info objects
   */
  private compareSchemaInfos(base: SchemaInfo, target: SchemaInfo): SchemaComparison {
    const baseTables = new Set(base.tables.map(t => t.name));
    const targetTables = new Set(target.tables.map(t => t.name));

    const addedTables = target.tables.filter(t => !baseTables.has(t.name)).map(t => t.name);

    const removedTables = base.tables.filter(t => !targetTables.has(t.name)).map(t => t.name);

    const modifiedTables: TableModification[] = [];

    // Check for table modifications
    for (const baseTable of base.tables) {
      const targetTable = target.tables.find(t => t.name === baseTable.name);

      if (targetTable) {
        const modification = this.compareTableStructures(baseTable, targetTable);

        if (
          modification.added_columns.length > 0 ||
          modification.removed_columns.length > 0 ||
          modification.modified_columns.length > 0
        ) {
          modifiedTables.push(modification);
        }
      }
    }

    // Compare indexes
    const baseIndexes = new Set(base.indexes.map(i => i.name));
    const targetIndexes = new Set(target.indexes.map(i => i.name));

    const addedIndexes = target.indexes.filter(i => !baseIndexes.has(i.name)).map(i => i.name);

    const removedIndexes = base.indexes.filter(i => !targetIndexes.has(i.name)).map(i => i.name);

    // Compare triggers
    const baseTriggers = new Set(base.triggers.map(t => t.name));
    const targetTriggers = new Set(target.triggers.map(t => t.name));

    const addedTriggers = target.triggers.filter(t => !baseTriggers.has(t.name)).map(t => t.name);

    const removedTriggers = base.triggers.filter(t => !targetTriggers.has(t.name)).map(t => t.name);

    return {
      identical:
        addedTables.length === 0 &&
        removedTables.length === 0 &&
        modifiedTables.length === 0 &&
        addedIndexes.length === 0 &&
        removedIndexes.length === 0 &&
        addedTriggers.length === 0 &&
        removedTriggers.length === 0,
      added_tables: addedTables,
      removed_tables: removedTables,
      modified_tables: modifiedTables,
      added_indexes: addedIndexes,
      removed_indexes: removedIndexes,
      added_triggers: addedTriggers,
      removed_triggers: removedTriggers,
    };
  }

  /**
   * Compare two table structures
   */
  private compareTableStructures(baseTable: TableInfo, targetTable: TableInfo): TableModification {
    const baseColumns = new Map(baseTable.columns.map(c => [c.name, c]));
    const targetColumns = new Map(targetTable.columns.map(c => [c.name, c]));

    const addedColumns: ColumnDefinition[] = [];
    const removedColumns: string[] = [];
    const modifiedColumns: ColumnModification[] = [];

    // Find added columns
    for (const [name, column] of targetColumns) {
      if (!baseColumns.has(name)) {
        addedColumns.push({
          name: column.name,
          type: column.type,
          nullable: !column.notnull,
          default_value: column.dflt_value,
          primary_key: column.pk,
          foreign_key: null, // TODO: Extract from foreign key info
        });
      }
    }

    // Find removed columns
    for (const [name] of baseColumns) {
      if (!targetColumns.has(name)) {
        removedColumns.push(name);
      }
    }

    // Find modified columns
    for (const [name, baseColumn] of baseColumns) {
      const targetColumn = targetColumns.get(name);

      if (targetColumn) {
        const modification = this.compareColumns(baseColumn, targetColumn);

        if (modification) {
          modifiedColumns.push(modification);
        }
      }
    }

    return {
      table_name: baseTable.name,
      added_columns: addedColumns,
      removed_columns: removedColumns,
      modified_columns: modifiedColumns,
      added_constraints: [], // TODO: Implement constraint comparison
      removed_constraints: [],
    };
  }

  /**
   * Compare two column definitions
   */
  private compareColumns(
    baseColumn: ColumnInfo,
    targetColumn: ColumnInfo
  ): ColumnModification | null {
    if (
      baseColumn.type !== targetColumn.type ||
      baseColumn.notnull !== targetColumn.notnull ||
      baseColumn.dflt_value !== targetColumn.dflt_value ||
      baseColumn.pk !== targetColumn.pk
    ) {
      let modificationType: ColumnModification['modification_type'] = 'type_change';

      if (baseColumn.type !== targetColumn.type) {
        modificationType = 'type_change';
      } else if (baseColumn.notnull !== targetColumn.notnull) {
        modificationType = 'nullable_change';
      } else if (baseColumn.dflt_value !== targetColumn.dflt_value) {
        modificationType = 'default_change';
      } else {
        modificationType = 'constraint_change';
      }

      return {
        name: baseColumn.name,
        old_definition: {
          name: baseColumn.name,
          type: baseColumn.type,
          nullable: !baseColumn.notnull,
          default_value: baseColumn.dflt_value,
          primary_key: baseColumn.pk,
          foreign_key: null,
        },
        new_definition: {
          name: targetColumn.name,
          type: targetColumn.type,
          nullable: !targetColumn.notnull,
          default_value: targetColumn.dflt_value,
          primary_key: targetColumn.pk,
          foreign_key: null,
        },
        modification_type: modificationType,
      };
    }

    return null;
  }

  /**
   * Analyze schema health and potential issues
   */
  async analyzeSchemaHealth(): Promise<{
    score: number;
    issues: {
      type: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
      recommendation: string;
    }[];
  }> {
    const schemaInfo = await this.getSchemaInfo();
    const issues: {
      type: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
      recommendation: string;
    }[] = [];
    let score = 100;

    // Check for tables without indexes
    for (const table of schemaInfo.tables.filter(t => t.type === 'table')) {
      if (table.indexes.length === 0 && table.columns.length > 2) {
        issues.push({
          type: 'missing_indexes',
          severity: 'medium',
          message: `Table '${table.name}' has no indexes`,
          recommendation: 'Consider adding indexes for frequently queried columns',
        });
        score -= 5;
      }
    }

    // Check for foreign keys without indexes
    for (const table of schemaInfo.tables) {
      for (const fk of table.foreign_keys) {
        const hasIndex = table.indexes.some(idx => idx.columns.includes(fk.from));

        if (!hasIndex) {
          issues.push({
            type: 'foreign_key_without_index',
            severity: 'medium',
            message: `Foreign key '${fk.from}' in table '${table.name}' lacks an index`,
            recommendation: 'Add an index on the foreign key column for better performance',
          });
          score -= 3;
        }
      }
    }

    // Check for very large tables without partitioning (simulate)
    // In a real implementation, this would check actual row counts

    return {
      score: Math.max(0, score),
      issues,
    };
  }

  /**
   * Generate migration suggestions based on schema analysis
   */
  async generateMigrationSuggestions(): Promise<
    {
      type: 'performance' | 'structure' | 'maintenance';
      priority: 'low' | 'medium' | 'high';
      description: string;
      sql?: string;
    }[]
  > {
    const healthReport = await this.analyzeSchemaHealth();
    const suggestions: {
      type: 'performance' | 'structure' | 'maintenance';
      priority: 'low' | 'medium' | 'high';
      description: string;
      sql?: string;
    }[] = [];

    // Convert health issues to migration suggestions
    for (const issue of healthReport.issues) {
      if (issue.type === 'missing_indexes') {
        suggestions.push({
          type: 'performance',
          priority: issue.severity as 'low' | 'medium' | 'high',
          description: issue.message,
          sql: `-- Add appropriate indexes for table mentioned in the issue`,
        });
      }
    }

    return suggestions;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create schema inspector instance
 */
export function createSchemaInspector(db: any): SchemaInspector {
  return new SchemaInspector(db);
}

/**
 * Quick schema inspection
 */
export async function inspectSchema(db: any): Promise<SchemaInfo> {
  const inspector = new SchemaInspector(db);

  return await inspector.getSchemaInfo();
}

/**
 * Generate schema DDL
 */
export async function generateDDL(db: any): Promise<string> {
  const inspector = new SchemaInspector(db);

  return await inspector.generateSchemaDDL();
}

export { SchemaInspector as default };
