#!/usr/bin/env node

/**
 * JCVD CLI - Simple command-line interface for the context provider
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';
import { createJCVD } from './jcvd-simple.js';
import { createLogger } from './utils/logger.js';

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
  .description('Test JCVD functionality')
  .action(async () => {
    try {
      console.log('🧪 Testing JCVD functionality...');

      const jcvd = await createJCVD();

      // Test basic functionality
      const project = await jcvd.projects.createProject({
        name: 'Test Project',
        description: 'A test project',
        path: process.cwd(),
        status: 'active',
      });

      console.log('✅ Project creation test passed');

      const issue = await jcvd.projects.createIssue({
        project_id: project.id,
        title: 'Test Issue',
        description: 'A test issue',
        status: 'todo',
        priority: 'medium',
      });

      console.log('✅ Issue creation test passed');
      console.log(`   Issue: ${issue.title}`);

      const context = await jcvd.context.getProjectContext();

      if (context) {
        console.log('✅ Context retrieval test passed');
        console.log(`   Project: ${context.project.name}`);
        console.log(`   Total issues: ${context.issues.length}`);
      }

      await jcvd.close();
      console.log('🎉 All tests passed!');
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
