/**
 * Shared types for contract testing framework
 */

// Validation result types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params: Record<string, any>;
  message: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

// API validation types
export interface EndpointReport {
  endpoint: string;
  method: string;
  available: boolean;
  responseTime?: number;
  statusCode?: number;
  errors: ValidationError[];
}

// Event validation types
export interface CorrelationReport {
  correlationId: string;
  events: EventSequence[];
  valid: boolean;
  missingEvents: string[];
  unexpectedEvents: string[];
}

export interface EventSequence {
  eventName: string;
  timestamp: number;
  payload: any;
  correlationId?: string;
}

// Mock orchestration types
export interface MockOptions {
  strictMode?: boolean;
  includeExamples?: boolean;
  customFormats?: Record<string, (value: any) => boolean>;
  baseUrl?: string;
  timeout?: number;
}

export interface MockService {
  start(): Promise<void>;
  stop(): Promise<void>;
  getBaseUrl(): string;
  addEndpoint(path: string, method: string, response: any): void;
  removeEndpoint(path: string, method: string): void;
}

export interface MockEventBroker {
  start(): Promise<void>;
  stop(): Promise<void>;
  publish(eventName: string, payload: any): Promise<void>;
  subscribe(eventName: string, handler: (payload: any) => void): void;
  unsubscribe(eventName: string): void;
}

export interface TestEnvironment {
  services: MockService[];
  eventBroker?: MockEventBroker;
  cleanup(): Promise<void>;
}

export interface ServiceConfig {
  name: string;
  spec: any; // Generic spec type to avoid import issues
  port?: number;
  baseUrl?: string;
  mockOptions?: MockOptions;
}

// Test data generation types
export interface ApiTestData {
  requests: Record<string, Record<string, any>>; // path -> method -> test data
  responses: Record<string, Record<string, any>>; // path -> method -> response data
  examples: Record<string, any>;
}

export interface EventTestData {
  publishedEvents: Record<string, any[]>; // eventName -> array of test payloads
  consumedEvents: Record<string, any[]>; // eventName -> array of test payloads
  correlationPatterns: CorrelationPattern[];
}

export interface CorrelationPattern {
  name: string;
  events: string[];
  order: 'sequential' | 'parallel' | 'any';
  timeout?: number;
}

export interface PerformanceTestSuite {
  endpoints: EndpointPerformanceTest[];
  events: EventPerformanceTest[];
  thresholds: PerformanceThresholds;
}

export interface EndpointPerformanceTest {
  path: string;
  method: string;
  testData: any;
  expectedResponseTime: number;
  concurrency?: number;
}

export interface EventPerformanceTest {
  eventName: string;
  payload: any;
  expectedProcessingTime: number;
  throughputTarget?: number;
}

export interface PerformanceThresholds {
  responseTime: { max: number; unit: 'ms' | 's' };
  throughput: { min: number; unit: 'requests/second' | 'events/second' };
  concurrency: { max: number; unit: 'concurrent_requests' | 'concurrent_events' };
}

// Configuration types
export interface ContractValidationOptions {
  strictMode?: boolean;
  allowAdditionalProperties?: boolean;
  validateExamples?: boolean;
  customFormats?: Record<string, (value: any) => boolean>;
  timeout?: number;
}

export interface EndpointConfig {
  path: string;
  method: string;
  operationId?: string;
  timeout?: number;
  retries?: number;
}

// Performance monitoring types
export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  concurrency: number;
  timestamp: number;
}