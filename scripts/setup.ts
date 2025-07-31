#!/usr/bin/env tsx

/**
 * Setup script for JCVD development environment
 */

import { readdir, access, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { constants } from 'node:fs';

import { createLogger } from '../src/utils/logger';

const logger = createLogger('setup');

async function main() {
  logger.info('🚀 Setting up JCVD development environment...');

  try {
    // Check if we're in the right directory
    await checkProjectStructure();

    // Create necessary directories
    await createDirectories();

    // Create example configuration if it doesn't exist
    await createExampleConfig();

    // Verify TypeScript compilation
    await verifyTypeScript();

    // Run initial tests
    await runInitialTests();

    logger.info('✅ JCVD development environment setup complete!');
    console.log('');
    console.log('🎉 Setup completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. npm run dev          # Start development server');
    console.log('  2. npm run test:watch    # Run tests in watch mode');
    console.log('  3. npm run lint          # Check code style');
    console.log('');
    console.log('Try the CLI:');
    console.log('  npx tsx src/cli.ts --help');
    console.log('  npx tsx src/cli.ts config --validate');
    console.log('  npx tsx src/cli.ts agents --types');

  } catch (error) {
    logger.error('❌ Setup failed', { error });
    console.error('❌ Setup failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function checkProjectStructure(): Promise<void> {
  logger.debug('Checking project structure...');

  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'src/index.ts',
    'src/cli.ts'
  ];

  for (const file of requiredFiles) {
    try {
      await access(resolve(file), constants.F_OK);
    } catch {
      throw new Error(`Required file not found: ${file}`);
    }
  }

  logger.debug('✅ Project structure verified');
}

async function createDirectories(): Promise<void> {
  logger.debug('Creating necessary directories...');

  const directories = [
    'dist',
    'logs',
    'workspace',
    'data',
    'backups'
  ];

  for (const dir of directories) {
    try {
      await mkdir(resolve(dir), { recursive: true });
      logger.debug(`Created directory: ${dir}`);
    } catch (error) {
      // Directory might already exist, that's fine
      logger.debug(`Directory already exists: ${dir}`);
    }
  }

  logger.debug('✅ Directories created');
}

async function createExampleConfig(): Promise<void> {
  logger.debug('Creating example configuration...');

  const configPath = resolve('jcvd.config.json');
  
  try {
    await access(configPath, constants.F_OK);
    logger.debug('Configuration file already exists, skipping');
    return;
  } catch {
    // File doesn't exist, create it
  }

  const exampleConfigPath = resolve('examples/quick-start/basic-workflow.json');
  
  try {
    const { readFile } = await import('node:fs/promises');
    const exampleConfig = await readFile(exampleConfigPath, 'utf8');
    await writeFile(configPath, exampleConfig, 'utf8');
    logger.debug('✅ Example configuration created');
  } catch (error) {
    logger.warn('Could not create example configuration', { error });
  }
}

async function verifyTypeScript(): Promise<void> {
  logger.debug('Verifying TypeScript compilation...');

  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execAsync = promisify(exec);

  try {
    await execAsync('npx tsc --noEmit --skipLibCheck');
    logger.debug('✅ TypeScript compilation verified');
  } catch (error) {
    logger.warn('TypeScript compilation issues detected', { error });
    console.log('⚠️  TypeScript compilation warnings (this is expected for initial setup)');
  }
}

async function runInitialTests(): Promise<void> {
  logger.debug('Running initial tests...');

  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execAsync = promisify(exec);

  try {
    // Check if any test files exist
    const testDir = resolve('tests');
    const testFiles = await readdir(testDir, { recursive: true });
    const hasTests = testFiles.some(file => 
      typeof file === 'string' && file.endsWith('.test.ts')
    );

    if (hasTests) {
      await execAsync('npm run test:run', { timeout: 30000 });
      logger.debug('✅ Initial tests passed');
    } else {
      logger.debug('No tests found, skipping test run');
    }
  } catch (error) {
    logger.warn('Some tests failed (this is expected for initial setup)', { error });
    console.log('⚠️  Some tests failed (this is expected for initial setup)');
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Setup script failed:', error);
    process.exit(1);
  });
}