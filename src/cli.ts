#!/usr/bin/env node

/**
 * JCVD CLI - Command-line interface for the multi-agent orchestration framework
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';

import { ConfigManager } from './config/config-manager.js';
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
  .description('JCVD - Multi-agent orchestration framework for Claude Code')
  .version(version, '-v, --version', 'output the current version');

// Start command
cli
  .command('start')
  .description('Start the JCVD orchestration framework')
  .option('-c, --config <path>', 'path to configuration file')
  .option('-d, --daemon', 'run as daemon process')
  .option('--log-level <level>', 'set log level (debug, info, warn, error)', 'info')
  .action(async options => {
    try {
      cliLogger.info('Starting JCVD framework...', { options });

      // Set log level from CLI option
      process.env.LOG_LEVEL = options.logLevel;

      // Load configuration
      const config = ConfigManager.load();

      // Create and start JCVD instance
      const jcvd = await createJCVD(config);

      if (options.daemon) {
        cliLogger.info('JCVD started in daemon mode');
        // Keep process running
        process.on('SIGINT', async () => {
          cliLogger.info('Received SIGINT, shutting down...');
          await jcvd.stop();
          process.exit(0);
        });
      } else {
        cliLogger.info('JCVD started in foreground mode');
        const status = jcvd.getStatus();

        console.log('✅ JCVD framework started successfully');
        console.log(`📊 Status: ${status.status}`);
        console.log(`🎯 Task coordination: ${status.taskCoordination}`);
        console.log(`🔌 Active providers: ${status.activeProviders}`);
        console.log('');
        console.log('Press Ctrl+C to stop');

        // Keep process running
        await new Promise(() => {});
      }
    } catch (error) {
      cliLogger.error('Failed to start JCVD framework', { error });
      console.error(
        '❌ Failed to start JCVD framework:',
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

// Status command
cli
  .command('status')
  .description('Show JCVD framework status')
  .action(async () => {
    try {
      // TODO: Implement status check for running instance
      // For now, just show configuration validation
      const config = ConfigManager.load();

      console.log('📋 JCVD Configuration Status');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Name: ${config.name}`);
      console.log(`Version: ${config.version}`);
      console.log(`Database: ${config.database.path}`);
      console.log(`Task Coordination: ${config.taskCoordination.defaultAgent} (default)`);
      console.log(`Providers: ${config.providers.length} configured`);
      console.log(`Workflows: ${config.workflows.length} configured`);

      if (config.mcp) {
        console.log(`MCP Server: ${config.mcp.host}:${config.mcp.port}`);
      }

      console.log('');
      console.log('✅ Configuration is valid');
    } catch (error) {
      cliLogger.error('Failed to get status', { error });
      console.error('❌ Failed to get status:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Config command
cli
  .command('config')
  .description('Configuration management commands')
  .option('--validate', 'validate configuration file')
  .option('--show', 'show current configuration')
  .option('--init', 'initialize a new configuration file')
  .action(async options => {
    try {
      if (options.validate) {
        const config = ConfigManager.load();

        console.log('✅ Configuration is valid');
        console.log(
          `📋 Task coordination: ${config.taskCoordination.defaultAgent}, ${config.providers.length} providers, ${config.workflows.length} workflows`
        );
      } else if (options.show) {
        const config = ConfigManager.load();

        console.log(JSON.stringify(config, null, 2));
      } else if (options.init) {
        console.log('🚧 Configuration initialization not yet implemented');
        console.log('📝 Please create a jcvd.config.json file manually for now');
      } else {
        console.log('Please specify an action: --validate, --show, or --init');
      }
    } catch (error) {
      cliLogger.error('Config command failed', { error });
      console.error('❌ Config command failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Task coordination command
cli
  .command('coordination')
  .description('Manage task coordination with Claude Code agents')
  .option('--status', 'show task coordination configuration')
  .option('--agents', 'show available Claude Code agents')
  .action(async options => {
    try {
      if (options.status) {
        const config = ConfigManager.load();

        console.log('🎯 Task Coordination Configuration');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Default Agent: ${config.taskCoordination.defaultAgent}`);
        console.log(`Fallback Agent: ${config.taskCoordination.fallbackAgent}`);

        if (config.taskCoordination.routing && config.taskCoordination.routing.length > 0) {
          console.log('\nRouting Rules:');
          for (const rule of config.taskCoordination.routing) {
            console.log(`  • ${rule.taskType} → ${rule.agent} (priority: ${rule.priority})`);
          }
        }

        if (config.taskCoordination.preferences) {
          console.log('\nAgent Preferences:');
          for (const [agent, pref] of Object.entries(config.taskCoordination.preferences)) {
            const status = pref.enabled ? '✅' : '❌';

            console.log(
              `  ${status} ${agent}${pref.timeout ? ` (timeout: ${pref.timeout}m)` : ''}`
            );
          }
        }
      } else if (options.agents) {
        const agentTypes = [
          'general-purpose - General development tasks',
          'product-manager - Requirements gathering and stakeholder communication',
          'tech-lead - Task coordination and dependency management',
          'software-architect - System design and architecture decisions',
          'developer - Code implementation and unit testing',
          'qa - Test planning and quality assurance',
          'code-reviewer - Code review and quality checks',
        ];

        console.log('🤖 Available Claude Code Agents');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        for (const type of agentTypes) {
          console.log(`  • ${type}`);
        }
      } else {
        console.log('Please specify an action: --status or --agents');
      }
    } catch (error) {
      cliLogger.error('Task coordination command failed', { error });
      console.error('❌ Agents command failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Providers command
cli
  .command('providers')
  .description('Manage JCVD providers')
  .option('--list', 'list all configured providers')
  .option('--types', 'show available provider types')
  .action(async options => {
    try {
      if (options.list) {
        const config = ConfigManager.load();

        if (config.providers.length === 0) {
          console.log('No providers configured');

          return;
        }

        console.log('🔌 Configured Providers');
        console.log('━━━━━━━━━━━━━━━━━━━━━━');

        for (const provider of config.providers) {
          const status = provider.enabled ? '✅' : '❌';

          console.log(`${status} ${provider.id} (${provider.type}) - ${provider.name}`);
          if (provider.description) {
            console.log(`   ${provider.description}`);
          }
        }
      } else if (options.types) {
        const providerTypes = [
          'linear - Linear issue tracking integration',
          'github - GitHub repository integration',
          'local - Local filesystem provider',
        ];

        console.log('🔌 Available Provider Types');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');

        for (const type of providerTypes) {
          console.log(`  • ${type}`);
        }
      } else {
        console.log('Please specify an action: --list or --types');
      }
    } catch (error) {
      cliLogger.error('Providers command failed', { error });
      console.error('❌ Providers command failed:', error instanceof Error ? error.message : error);
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
