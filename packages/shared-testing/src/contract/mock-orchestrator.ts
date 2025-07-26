/**
 * Mock Orchestrator - Test service orchestration utilities
 * 
 * Basic implementation for contract testing framework foundation
 */

import { 
  MockOptions, 
  MockService, 
  MockEventBroker, 
  TestEnvironment, 
  ServiceConfig
} from '../types';

export class MockOrchestrator {
  private mockServices: Map<string, MockService> = new Map();
  private mockEventBrokers: Map<string, MockEventBroker> = new Map();
  private globalOptions: MockOptions;

  constructor(globalOptions: MockOptions = {}) {
    this.globalOptions = {
      strictMode: true,
      includeExamples: true,
      timeout: 5000,
      ...globalOptions
    };
  }

  /**
   * Create a contract-compliant mock service from OpenAPI specification
   */
  createContractCompliantMock(spec: any, options?: MockOptions): MockService {
    const mergedOptions = { ...this.globalOptions, ...options };
    
    const mockService = new BasicMockService(spec, mergedOptions);
    const serviceName = spec?.info?.title || 'unnamed-service';
    this.mockServices.set(serviceName, mockService);
    
    return mockService;
  }

  /**
   * Create a mock event broker from AsyncAPI specification
   */
  createEventMockBroker(spec: any): MockEventBroker {
    const mockBroker = new BasicMockEventBroker(spec, this.globalOptions);
    const brokerName = spec?.info?.title || 'unnamed-broker';
    this.mockEventBrokers.set(brokerName, mockBroker);
    
    return mockBroker;
  }

  /**
   * Orchestrate multiple service interactions
   */
  async orchestrateServiceInteractions(services: ServiceConfig[]): Promise<TestEnvironment> {
    const mockServices: MockService[] = [];
    let eventBroker: MockEventBroker | undefined;

    // Create mock services for each configuration
    for (const serviceConfig of services) {
      if (serviceConfig.spec?.paths) {
        // OpenAPI specification
        const mockService = this.createContractCompliantMock(
          serviceConfig.spec,
          serviceConfig.mockOptions
        );
        mockServices.push(mockService);
        await mockService.start();
      } else if (serviceConfig.spec?.channels) {
        // AsyncAPI specification  
        if (!eventBroker) {
          eventBroker = this.createEventMockBroker(serviceConfig.spec);
          await eventBroker.start();
        }
      }
    }

    return new BasicTestEnvironment(mockServices, eventBroker);
  }

  /**
   * Cleanup all mock services and brokers
   */
  async cleanup(): Promise<void> {
    // Stop all mock services
    for (const service of this.mockServices.values()) {
      await service.stop();
    }
    this.mockServices.clear();

    // Stop all event brokers
    for (const broker of this.mockEventBrokers.values()) {
      await broker.stop();
    }
    this.mockEventBrokers.clear();
  }
}

/**
 * Basic mock service implementation
 */
class BasicMockService implements MockService {
  private spec: any;
  private options: MockOptions;
  private isRunning: boolean = false;
  private baseUrl: string;

  constructor(spec: any, options: MockOptions) {
    this.spec = spec;
    this.options = options;
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
  }

  async start(): Promise<void> {
    this.isRunning = true;
  }

  async stop(): Promise<void> {
    this.isRunning = false;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  addEndpoint(path: string, method: string, response: any): void {
    // Mock implementation
  }

  removeEndpoint(path: string, method: string): void {
    // Mock implementation
  }
}

/**
 * Basic mock event broker implementation
 */
class BasicMockEventBroker implements MockEventBroker {
  private spec: any;
  private options: MockOptions;
  private isRunning: boolean = false;
  private subscribers: Map<string, ((payload: any) => void)[]> = new Map();

  constructor(spec: any, options: MockOptions) {
    this.spec = spec;
    this.options = options;
  }

  async start(): Promise<void> {
    this.isRunning = true;
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.subscribers.clear();
  }

  async publish(eventName: string, payload: any): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Mock event broker is not running');
    }

    const handlers = this.subscribers.get(eventName) || [];
    handlers.forEach(handler => handler(payload));
  }

  subscribe(eventName: string, handler: (payload: any) => void): void {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, []);
    }
    this.subscribers.get(eventName)!.push(handler);
  }

  unsubscribe(eventName: string): void {
    this.subscribers.delete(eventName);
  }
}

/**
 * Basic test environment implementation
 */
class BasicTestEnvironment implements TestEnvironment {
  public services: MockService[];
  public eventBroker?: MockEventBroker;

  constructor(services: MockService[], eventBroker?: MockEventBroker) {
    this.services = services;
    this.eventBroker = eventBroker;
  }

  async cleanup(): Promise<void> {
    // Stop all services
    for (const service of this.services) {
      await service.stop();
    }

    // Stop event broker if present
    if (this.eventBroker) {
      await this.eventBroker.stop();
    }
  }
}