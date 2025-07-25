export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^node-fetch$': '<rootDir>/src/__tests__/__mocks__/node-fetch.js',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|fetch-blob|formdata-polyfill|data-uri-to-buffer)/)',
  ],
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85,
    },
  },
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
  setupFilesAfterEnv: [],
  testTimeout: 15000, // Reduced timeout for faster CI failure detection
  // Force exit after tests to prevent hanging
  forceExit: true,
  // Detect open handles that might cause hanging
  detectOpenHandles: true
};