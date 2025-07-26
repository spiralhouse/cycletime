module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Standardized test patterns
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  
  // TypeScript transformation
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  
  // Coverage configuration with 80% threshold
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Standardized timeouts and behavior
  testTimeout: 15000,
  forceExit: true,
  detectOpenHandles: true,
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  
  // Module name mapping for workspace dependencies
  moduleNameMapper: {
    '^@cycletime/shared-testing$': '<rootDir>/../shared-testing/src',
    '^@cycletime/shared-types$': '<rootDir>/../shared-types/src',
    '^@cycletime/shared-utils$': '<rootDir>/../shared-utils/src',
    '^@cycletime/shared-config$': '<rootDir>/../shared-config/src'
  }
};