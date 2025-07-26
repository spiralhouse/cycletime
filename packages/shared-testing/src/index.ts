/**
 * CycleTime Shared Contract Testing Framework
 * 
 * This package provides standardized contract testing utilities for all services
 * in the CycleTime monorepo, enabling consistent OpenAPI/AsyncAPI validation
 * and contract-first testing patterns.
 */

// Core framework components
export { ApiValidator } from './contract/api-validator';
export { EventValidator } from './contract/event-validator';
export { MockOrchestrator } from './contract/mock-orchestrator';
export { TestDataGenerator } from './contract/test-data-generator';

// Contract validation utilities
export { SpecLoader } from './utils/spec-loader';
export { TestHelpers } from './utils/test-helpers';

// Custom Jest matchers for contract testing
export { extendExpect } from './assertions/contract-matchers';
export { PerformanceMatchers } from './assertions/performance-matchers';

// Types and interfaces
export type {
  ValidationResult,
  EndpointReport,
  CorrelationReport,
  MockOptions,
  MockService,
  MockEventBroker,
  TestEnvironment,
  ServiceConfig,
  ApiTestData,
  EventTestData,
  PerformanceTestSuite,
  EndpointConfig,
  EventSequence,
  ContractValidationOptions,
  PerformanceMetrics
} from './types';

// Configuration files are CommonJS modules - consumers should import them directly
// Example: const baseConfig = require('@cycletime/shared-testing/dist/config/jest.config.base.js');