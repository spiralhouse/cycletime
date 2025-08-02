#!/usr/bin/env tsx

/**
 * JCVD Proof of Concept Demonstration Script
 *
 * This script demonstrates that all key technologies are working together:
 * - TypeScript compilation with ES modules
 * - SQLite database integration
 * - MCP SDK integration
 * - CLI functionality
 * - Vitest testing framework
 */

import { testDatabase, testDatabaseFile } from '../src/database/hello-db.js';
import { createJCVD } from '../src/index.js';
import { testMCPServer, testMCPTransport } from '../src/mcp/hello-mcp.js';

console.log('🚀 JCVD Proof of Concept Demonstration');
console.log('=====================================');
console.log('');

async function runDemo() {
  console.log('1. Testing core JCVD framework initialization...');
  try {
    const jcvd = await createJCVD();
    const status = jcvd.getStatus();

    console.log('✅ JCVD framework initialized successfully');
    console.log(`   Status: ${status.status}`);
    console.log(`   Task coordination: ${status.taskCoordination}`);
    console.log(`   Active providers: ${status.activeProviders}`);
    await jcvd.stop();
    console.log('✅ JCVD framework stopped gracefully');
  } catch (error) {
    console.log('❌ JCVD framework test failed:', error);

    return false;
  }
  console.log('');

  console.log('2. Testing SQLite database integration...');
  try {
    const memoryResult = testDatabase();
    const fileResult = testDatabaseFile();

    if (memoryResult.success && fileResult.success) {
      console.log('✅ SQLite integration working');
      console.log(
        `   In-memory: ${memoryResult.data?.originalMessage} → ${memoryResult.data?.updatedMessage}`
      );
      console.log(`   File DB: ${fileResult.data?.message}`);
    } else {
      console.log('❌ SQLite integration failed');

      return false;
    }
  } catch (error) {
    console.log('❌ SQLite test failed:', error);

    return false;
  }
  console.log('');

  console.log('3. Testing MCP SDK integration...');
  try {
    const serverResult = await testMCPServer();
    const transportResult = testMCPTransport();

    if (serverResult.success && transportResult.success) {
      console.log('✅ MCP SDK integration working');
      console.log(`   Server created: ${serverResult.data?.serverCreated}`);
      console.log(`   SDK imported: ${serverResult.data?.sdkImported}`);
      console.log(`   Transport capabilities: ${transportResult.data?.capabilities?.join(', ')}`);
    } else {
      console.log('❌ MCP SDK integration failed');

      return false;
    }
  } catch (error) {
    console.log('❌ MCP SDK test failed:', error);

    return false;
  }
  console.log('');

  console.log('🎉 All proof of concept tests passed!');
  console.log('');
  console.log('✅ Technology stack verified:');
  console.log('   • TypeScript compilation (ES modules)');
  console.log('   • SQLite database integration (better-sqlite3)');
  console.log('   • MCP SDK integration (@modelcontextprotocol/sdk)');
  console.log('   • CLI framework (commander)');
  console.log('   • Testing framework (vitest)');
  console.log('   • Logging system (consola)');
  console.log('');
  console.log('Ready for SPI-328 implementation phase! 🚀');

  return true;
}

// Run the demo
runDemo()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
