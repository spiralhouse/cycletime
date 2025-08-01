/**
 * Simple SQLite database test for proof of concept
 */

import Database from 'better-sqlite3';

import { createLogger } from '../utils/logger.js';

const logger = createLogger('hello-db');

/**
 * Simple database test function
 */
export function testDatabase(): { success: boolean; message: string; data?: any } {
  try {
    logger.info('Starting SQLite database test...');

    // Create in-memory database for testing
    const db = new Database(':memory:');

    logger.info('✅ SQLite database connection created');

    // Create a simple test table
    const createTableQuery = `
      CREATE TABLE hello_test (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    db.exec(createTableQuery);
    logger.info('✅ Test table created');

    // Insert test data
    const insertQuery = db.prepare('INSERT INTO hello_test (message) VALUES (?)');
    const insertResult = insertQuery.run('Hello from JCVD!');

    logger.info('✅ Test data inserted', { insertId: insertResult.lastInsertRowid });

    // Query test data
    const selectQuery = db.prepare('SELECT * FROM hello_test WHERE id = ?');
    const result = selectQuery.get(insertResult.lastInsertRowid) as { id: number; message: string; timestamp: string } | undefined;

    logger.info('✅ Test data retrieved', { result });

    // Update test data
    const updateQuery = db.prepare('UPDATE hello_test SET message = ? WHERE id = ?');

    updateQuery.run('Hello from JCVD - Updated!', insertResult.lastInsertRowid);
    logger.info('✅ Test data updated');

    // Query updated data
    const updatedResult = selectQuery.get(insertResult.lastInsertRowid) as { id: number; message: string; timestamp: string } | undefined;

    logger.info('✅ Updated data retrieved', { result: updatedResult });

    // Clean up
    db.close();
    logger.info('✅ Database connection closed');

    return {
      success: true,
      message: 'SQLite database test completed successfully',
      data: {
        originalMessage: result?.message,
        updatedMessage: updatedResult?.message,
        insertId: insertResult.lastInsertRowid
      }
    };

  } catch (error) {
    logger.error('❌ Database test failed', { error });

    return {
      success: false,
      message: `Database test failed: ${error instanceof Error ? error.message : error}`
    };
  }
}

/**
 * Test database with file persistence
 */
export function testDatabaseFile(): { success: boolean; message: string; data?: any } {
  try {
    logger.info('Starting SQLite file database test...');

    // Use a temporary database file
    const dbPath = './test-jcvd.db';
    const db = new Database(dbPath);

    logger.info('✅ SQLite file database connection created', { path: dbPath });

    // Create a simple test table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS hello_file_test (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    db.exec(createTableQuery);
    logger.info('✅ Test table created in file database');

    // Insert test data
    const insertQuery = db.prepare('INSERT INTO hello_file_test (message) VALUES (?)');
    const insertResult = insertQuery.run('Hello from JCVD file database!');

    logger.info('✅ Test data inserted to file database', { insertId: insertResult.lastInsertRowid });

    // Query test data
    const selectQuery = db.prepare('SELECT * FROM hello_file_test ORDER BY id DESC LIMIT 1');
    const result = selectQuery.get() as { id: number; message: string; timestamp: string } | undefined;

    logger.info('✅ Test data retrieved from file database', { result });

    // Clean up
    db.close();
    logger.info('✅ File database connection closed');

    return {
      success: true,
      message: 'SQLite file database test completed successfully',
      data: {
        dbFile: dbPath,
        message: result?.message,
        insertId: insertResult.lastInsertRowid
      }
    };

  } catch (error) {
    logger.error('❌ File database test failed', { error });

    return {
      success: false,
      message: `File database test failed: ${error instanceof Error ? error.message : error}`
    };
  }
}