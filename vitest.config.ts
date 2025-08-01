/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    // Environment
    environment: 'node',
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    
    // File patterns
    include: [
      'src/**/*.{test,spec}.ts',
      'tests/**/*.{test,spec}.ts'
    ],
    exclude: [
      'node_modules',
      'dist',
      'coverage',
      '.vscode',
      '.github'
    ],
    
    // Setup
    setupFiles: [
      './tests/setup.ts'
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules',
        'dist',
        'coverage',
        '**/*.config.{js,ts}',
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}',
        'tests',
        'scripts',
        'examples',
        'docs'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      },
      skipFull: true,
      clean: true
    },
    
    // Performance
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4
      }
    },
    
    // Test timeout
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Watch mode
    watch: false,
    
    // Reporter configuration
    reporter: ['verbose', 'json'],
    
    // Output configuration
    silent: false,
    hideSkippedTests: false,
    
    // Mock configuration  
    mockReset: true,
    
    // Retry configuration
    retry: 0,
    
    // Concurrent test execution
    sequence: {
      concurrent: true,
      shuffle: false
    }
  },
  
  // Resolve configuration for path mapping
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/types': resolve(__dirname, './src/types'),
      '@/core': resolve(__dirname, './src/core'),
      '@/providers': resolve(__dirname, './src/providers'),
      '@/database': resolve(__dirname, './src/database'),
      '@/mcp': resolve(__dirname, './src/mcp'),
      '@/config': resolve(__dirname, './src/config'),
      '@/utils': resolve(__dirname, './src/utils')
    }
  },
  
  // Define constants for testing
  define: {
    __TEST__: true
  },
  
  // ESBuild configuration for TypeScript
  esbuild: {
    target: 'es2022'
  }
});