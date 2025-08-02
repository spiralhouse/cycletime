/**
 * JCVD SQLite Provider Module
 * Complete SQLite provider implementation with all supporting components
 */

// Main provider implementation
export { SQLiteProvider, createSQLiteProvider } from './sqlite-provider.js';

// Supporting components
export {
  SQLiteConnectionManager,
  createConnectionManager,
  validateDatabasePath,
} from './sqlite-connection.js';
export { SQLiteOperations } from './sqlite-operations.js';
export { TaskRecommendationEngine } from './task-recommender.js';

// Query definitions (for advanced usage)
export {
  PROJECT_QUERIES,
  ISSUE_QUERIES,
  DEPENDENCY_QUERIES,
  WORKFLOW_QUERIES,
  LABEL_QUERIES,
  COMMENT_QUERIES,
  ANALYTICS_QUERIES,
  VALIDATION_QUERIES,
  buildIssueFilterQuery,
} from './sqlite-queries.js';

// Re-export types for convenience
export type {
  SQLiteProviderConfig,
  RecommendationContext,
  RecommendationFactors,
  TaskRecommendation,
} from '../types.js';
