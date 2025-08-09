#!/usr/bin/env node

/**
 * JCVD CLI - Simple command-line interface for the context provider
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';

import { createLogger } from './utils/logger.js';

import { createJCVD } from './index.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packagePath = resolve(__dirname, '../package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const version = packageJson.version ?? '0.1.0';

const cli = new Command();
const cliLogger = createLogger('cli');

cli
  .name('jcvd')
  .description('JCVD - Simple context provider for Claude Code')
  .version(version, '-v, --version', 'output the current version');

// Start command
cli
  .command('start')
  .description('Start the JCVD context provider')
  .option('-c, --config <path>', 'path to configuration file')
  .option('-d, --daemon', 'run as daemon process')
  .option('--log-level <level>', 'set log level (debug, info, warn, error)', 'info')
  .action(async options => {
    try {
      cliLogger.info('Starting JCVD context provider...', { options });

      // Set log level from CLI option
      process.env.LOG_LEVEL = options.logLevel;

      // Create and start simple JCVD instance
      const jcvd = await createJCVD();

      if (options.daemon) {
        cliLogger.info('JCVD context provider started in daemon mode');
        // Keep process running
        process.on('SIGINT', async () => {
          cliLogger.info('Received SIGINT, shutting down...');
          await jcvd.stop();
          process.exit(0);
        });
      } else {
        cliLogger.info('JCVD context provider started in foreground mode');
        const status = jcvd.getStatus();

        console.log('✅ JCVD context provider started successfully');
        console.log(`📊 Status: ${status.status}`);
        console.log(`🎯 Role: ${status.role}`);
        console.log(`⚡ Capabilities: ${status.capabilities.join(', ')}`);
        console.log('');
        console.log('Press Ctrl+C to stop');

        // Keep process running
        await new Promise(() => {});
      }
    } catch (error) {
      cliLogger.error('Failed to start JCVD context provider', { error });
      console.error(
        '❌ Failed to start JCVD context provider:',
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

// Status command
cli
  .command('status')
  .description('Show JCVD context provider status')
  .action(async () => {
    try {
      // Simple status - just show that we're a basic context provider
      console.log('📋 JCVD Context Provider Status');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Name: JCVD');
      console.log(`Version: ${version}`);
      console.log('Role: Simple Context Provider');
      console.log('Database: SQLite (.jcvd/database.sqlite)');
      console.log('Capabilities: project-context, cross-session-continuity, basic-crud');
      console.log('');
      console.log('✅ Simple architecture - no complex configuration needed');
    } catch (error) {
      cliLogger.error('Failed to get status', { error });
      console.error('❌ Failed to get status:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Config command
cli
  .command('config')
  .description('Show simple configuration info')
  .action(async () => {
    try {
      console.log('📋 JCVD Configuration');
      console.log('━━━━━━━━━━━━━━━━━━━━━━');
      console.log('JCVD uses a simple architecture with minimal configuration.');
      console.log('');
      console.log('Database: SQLite file at .jcvd/database.sqlite');
      console.log('Role: Simple context provider for Claude Code');
      console.log('MCP Integration: Provides project context via MCP resources');
      console.log('');
      console.log('✅ No complex configuration files needed');
    } catch (error) {
      cliLogger.error('Config command failed', { error });
      console.error('❌ Config command failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Info command (simplified from coordination)
cli
  .command('info')
  .description('Show information about JCVD and Claude Code integration')
  .action(async () => {
    try {
      console.log('📋 JCVD Context Provider Information');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('🎯 Role: Simple context provider for Claude Code');
      console.log('📊 Purpose: Provides structured project data and cross-session continuity');
      console.log('🔗 Integration: MCP (Model Context Protocol) resources and tools');
      console.log('');
      console.log('Claude Code handles all agent coordination and task orchestration.');
      console.log('JCVD focuses only on data persistence and context provision.');
      console.log('');
      console.log('✅ Aligned with JCVD architectural principles');
    } catch (error) {
      cliLogger.error('Info command failed', { error });
      console.error('❌ Info command failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Data command (simplified from providers)
cli
  .command('data')
  .description('Show information about data storage')
  .action(async () => {
    try {
      console.log('📊 JCVD Data Storage Information');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('Database: SQLite');
      console.log('Location: .jcvd/database.sqlite');
      console.log('Schema: Simple projects and issues tables');
      console.log('');
      console.log('Data Types:');
      console.log('  • Projects - Basic project metadata');
      console.log('  • Issues - Hierarchical issues (epics, stories, subtasks)');
      console.log('');
      console.log('Operations: Basic CRUD (Create, Read, Update, Delete)');
      console.log('✅ Simple SQLite operations only - no complex providers');
    } catch (error) {
      cliLogger.error('Data command failed', { error });
      console.error('❌ Data command failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Test command for proof of concept
cli
  .command('test')
  .description('Run proof of concept tests')
  .option('--database', 'test database connectivity')
  .option('--mcp', 'test MCP server integration')
  .option('--all', 'run all proof of concept tests')
  .action(async options => {
    try {
      let allSuccess = true;

      if (options.database || options.all) {
        console.log('🧪 Testing SQLite database connectivity...');

        // Import test functions
        const { testDatabase, testDatabaseFile } = await import('./database/hello-db.js');

        // Test in-memory database
        const memoryResult = testDatabase();

        if (memoryResult.success) {
          console.log('✅ In-memory database test passed');
          console.log(`   Original: ${memoryResult.data?.originalMessage}`);
          console.log(`   Updated:  ${memoryResult.data?.updatedMessage}`);
        } else {
          console.log('❌ In-memory database test failed:', memoryResult.message);
          allSuccess = false;
        }

        // Test file database
        const fileResult = testDatabaseFile();

        if (fileResult.success) {
          console.log('✅ File database test passed');
          console.log(`   Message: ${fileResult.data?.message}`);
          console.log(`   File: ${fileResult.data?.dbFile}`);
        } else {
          console.log('❌ File database test failed:', fileResult.message);
          allSuccess = false;
        }
      }

      if (options.mcp || options.all) {
        if (options.database || options.all) {
          console.log(''); // Add spacing between test sections
        }

        console.log('🧪 Testing MCP server integration...');

        // Import MCP test functions
        const { testMCPServer, testMCPTransport } = await import('./mcp/hello-mcp.js');

        // Test MCP server
        const serverResult = await testMCPServer();

        if (serverResult.success) {
          console.log('✅ MCP server test passed');
          console.log(`   SDK Imported: ${serverResult.data?.sdkImported}`);
          console.log(`   Server Created: ${serverResult.data?.serverCreated}`);
          console.log(`   Has RequestHandler: ${serverResult.data?.hasRequestHandler}`);
        } else {
          console.log('❌ MCP server test failed:', serverResult.message);
          allSuccess = false;
        }

        // Test MCP transport
        const transportResult = testMCPTransport();

        if (transportResult.success) {
          console.log('✅ MCP transport test passed');
          console.log(`   Type: ${transportResult.data?.transportType}`);
          console.log(`   Capabilities: ${transportResult.data?.capabilities?.join(', ')}`);
        } else {
          console.log('❌ MCP transport test failed:', transportResult.message);
          allSuccess = false;
        }
      }

      if (!options.database && !options.mcp && !options.all) {
        console.log('Please specify test type: --database, --mcp, or --all');

        return;
      }

      // Overall result
      console.log('');
      if (allSuccess) {
        console.log('🎉 All tests passed! Technology stack integration is working.');
      } else {
        console.log('⚠️  Some tests failed.');
        process.exit(1);
      }
    } catch (error) {
      cliLogger.error('Test command failed', { error });
      console.error('❌ Test command failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Version command (already handled by commander)

// Help command (already handled by commander)

// Error handling
cli.on('error', error => {
  cliLogger.error('CLI error', { error });
  console.error('❌ CLI error:', error.message);
  process.exit(1);
});

// Parse command line arguments
cli.parse(process.argv);

// If no command was provided, show help
if (process.argv.slice(2).length === 0) {
  cli.outputHelp();
}
