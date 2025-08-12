#!/usr/bin/env tsx
import Database from 'better-sqlite3';

import { migrations } from '../src/database/migrations.js';

// Create an in-memory database for testing
const db = new Database(':memory:');

console.log('Testing migration 006...\n');

try {
  // Run all migrations up to and including 006
  for (const migration of migrations) {
    console.log(`Running migration ${migration.version}: ${migration.description}`);
    db.exec(migration.sql);
    console.log(`✓ Migration ${migration.version} completed successfully`);
  }

  console.log('\nVerifying tables were created...');
  
  // Check that all tables exist
  const tables = ['projects', 'issues', 'project_issues', 'workflows', 'issue_dependencies'];
  
  for (const table of tables) {
    const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);

    if (result) {
      console.log(`✓ Table '${table}' exists`);
    } else {
      throw new Error(`Table '${table}' was not created`);
    }
  }

  console.log('\nVerifying indexes were created...');
  
  // Check that indexes exist
  const indexes = [
    'idx_issues_parent',
    'idx_issues_type', 
    'idx_issues_status',
    'idx_project_issues_project',
    'idx_project_issues_issue',
    'idx_workflows_project',
    'idx_dependencies_dependent',
    'idx_dependencies_dependency'
  ];
  
  for (const index of indexes) {
    const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name=?`).get(index);

    if (result) {
      console.log(`✓ Index '${index}' exists`);
    } else {
      throw new Error(`Index '${index}' was not created`);
    }
  }

  console.log('\n✅ All migrations ran successfully!');
  console.log('✅ All tables and indexes were created correctly!');

} catch (error) {
  console.error('\n❌ Migration test failed:', error);
  process.exit(1);
} finally {
  db.close();
}