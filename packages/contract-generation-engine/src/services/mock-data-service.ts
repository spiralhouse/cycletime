import {
  ContractGenerationRequest,
  ContractGenerationResponse,
  ContractStatus,
  ContractStatusResponse,
  ContractSpecification,
  GenerationStage,
  StoredContract,
  ContractRefinementRequest,
  ContractRefinementResponse,
  ContractGeneratedEvent,
  ContractValidatedEvent,
  ContractFailedEvent,
} from '../types/contract-types';
import {
  ValidationResult,
} from '../types/validation-types';
import {
  BoundaryAnalysisRequest,
  BoundaryAnalysisResponse,
  BoundaryRecommendation,
} from '../types/boundary-types';
import {
  ServiceDependency,
  ServiceCapability,
  ServiceIntegration,
  SystemBoundaries,
} from '../types/service-types';

/**
 * Comprehensive mock data service for Contract Generation Engine
 * Provides realistic mock data for testing and development
 */
export class MockDataService {
  private readonly contractIds = [
    'contract-1734567890-abc123def',
    'contract-1734567891-def456ghi',
    'contract-1734567892-ghi789jkl',
    'contract-1734567893-jkl012mno',
  ];

  private readonly serviceNames = [
    'user-service',
    'order-service',
    'payment-service',
    'notification-service',
    'inventory-service',
    'analytics-service',
    'audit-service',
    'search-service',
  ];

  private readonly serviceTypes = [
    'rest-api',
    'event-driven',
    'hybrid',
    'cli',
    'web-ui',
  ] as const;

  private readonly contractStatuses = [
    'pending',
    'processing',
    'completed',
    'failed',
  ] as const;

  /**
   * Generate realistic contract generation request
   */
  generateContractGenerationRequest(serviceName?: string): ContractGenerationRequest {
    const name = serviceName || this.getRandomElement(this.serviceNames);
    const serviceType = this.getRandomElement(this.serviceTypes);

    return {
      serviceName: name,
      serviceType,
      requirements: this.generateRequirements(name, serviceType),
      architecture: this.generateArchitecture(serviceType),
      dependencies: this.generateDependencies(name),
      endpoints: this.generateEndpoints(name, serviceType),
      events: serviceType !== 'rest-api' ? this.generateEvents(name) : undefined,
      options: {
        includeExamples: true,
        includeMockData: true,
        validateOutput: true,
        outputFormat: 'both',
      },
    };
  }

  /**
   * Generate realistic contract generation response
   */
  generateContractGenerationResponse(contractId?: string): ContractGenerationResponse {
    return {
      contractId: contractId || this.getRandomElement(this.contractIds),
      status: 'pending',
      estimatedCompletion: new Date(Date.now() + 30000).toISOString(),
      message: 'Contract generation started successfully',
    };
  }

  /**
   * Generate realistic contract status response
   */
  generateContractStatusResponse(
    contractId?: string,
    status?: ContractStatus
  ): ContractStatusResponse {
    const id = contractId || this.getRandomElement(this.contractIds);
    const contractStatus = status || this.getRandomElement(this.contractStatuses);
    const createdAt = new Date(Date.now() - Math.random() * 3600000);
    
    return {
      contractId: id,
      status: contractStatus,
      progress: this.getProgressForStatus(contractStatus),
      createdAt: createdAt.toISOString(),
      completedAt: contractStatus === 'completed' || contractStatus === 'failed' 
        ? new Date(createdAt.getTime() + 30000).toISOString()
        : undefined,
      error: contractStatus === 'failed' ? 'Contract generation failed due to invalid requirements' : undefined,
      stages: this.generateStages(contractStatus),
    };
  }

  /**
   * Generate realistic contract specification
   */
  generateContractSpecification(contractId?: string, serviceName?: string): ContractSpecification {
    const id = contractId || this.getRandomElement(this.contractIds);
    const name = serviceName || this.getRandomElement(this.serviceNames);
    
    return {
      contractId: id,
      serviceName: name,
      openapi: this.generateOpenAPISpec(name),
      asyncapi: this.generateAsyncAPISpec(name),
      boundaries: this.generateSystemBoundaries(name),
      metadata: {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        generatedBy: 'Contract Generation Engine',
        requirements: this.generateRequirements(name, 'rest-api'),
        architecture: this.generateArchitecture('rest-api'),
        tags: ['generated', 'mock', name.split('-')[0]],
      },
    };
  }

  /**
   * Generate realistic stored contract
   */
  generateStoredContract(
    contractId?: string,
    status?: ContractStatus
  ): StoredContract {
    const id = contractId || this.getRandomElement(this.contractIds);
    const serviceName = this.getRandomElement(this.serviceNames);
    const contractStatus = status || this.getRandomElement(this.contractStatuses);
    const createdAt = new Date(Date.now() - Math.random() * 3600000);

    return {
      id,
      serviceName,
      serviceType: this.getRandomElement(this.serviceTypes),
      status: contractStatus,
      progress: this.getProgressForStatus(contractStatus),
      createdAt,
      completedAt: contractStatus === 'completed' || contractStatus === 'failed'
        ? new Date(createdAt.getTime() + 30000)
        : undefined,
      error: contractStatus === 'failed' ? 'Generation failed due to validation errors' : undefined,
      stages: this.generateStages(contractStatus),
      originalRequest: this.generateContractGenerationRequest(serviceName),
      specification: contractStatus === 'completed' ? {
        openapi: this.generateOpenAPISpec(serviceName) as any,
        asyncapi: this.generateAsyncAPISpec(serviceName) as any,
        boundaries: this.generateSystemBoundaries(serviceName) as any,
      } : undefined,
      metadata: contractStatus === 'completed' ? {
        version: '1.0.0',
        generatedAt: createdAt.toISOString(),
        generatedBy: 'Contract Generation Engine',
        requirements: this.generateRequirements(serviceName, 'rest-api'),
        tags: ['mock', serviceName.split('-')[0]],
      } : undefined,
    };
  }

  /**
   * Generate realistic validation result
   */
  generateValidationResult(valid?: boolean): ValidationResult {
    const isValid = valid !== undefined ? valid : Math.random() > 0.3;
    
    return {
      valid: isValid,
      errors: isValid ? [] : this.generateValidationErrors(),
      warnings: this.generateValidationWarnings(),
      score: isValid ? Math.floor(85 + Math.random() * 15) : Math.floor(40 + Math.random() * 40),
      suggestions: this.generateValidationSuggestions(),
    };
  }

  /**
   * Generate realistic boundary analysis request
   */
  generateBoundaryAnalysisRequest(): BoundaryAnalysisRequest {
    return {
      services: this.serviceNames.slice(0, 3 + Math.floor(Math.random() * 3)),
      architecture: this.generateArchitecture('hybrid'),
      requirements: 'Analyze service boundaries and recommend optimal service decomposition',
      options: {
        includeDataFlow: true,
        includeSecurityBoundaries: true,
        includePerformanceRequirements: Math.random() > 0.5,
      },
    };
  }

  /**
   * Generate realistic boundary analysis response
   */
  generateBoundaryAnalysisResponse(): BoundaryAnalysisResponse {
    const services = this.serviceNames.slice(0, 3 + Math.floor(Math.random() * 3));
    
    return {
      analysisId: `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      services: services.map(service => this.generateServiceBoundary(service)),
      interactions: this.generateServiceInteractions(services),
      recommendations: this.generateBoundaryRecommendations(),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate realistic contract events
   */
  generateContractGeneratedEvent(contractId?: string): ContractGeneratedEvent {
    const id = contractId || this.getRandomElement(this.contractIds);
    const serviceName = this.getRandomElement(this.serviceNames);
    
    return {
      contractId: id,
      serviceName,
      serviceType: this.getRandomElement(this.serviceTypes),
      openapi: this.generateOpenAPISpec(serviceName),
      asyncapi: this.generateAsyncAPISpec(serviceName),
      boundaries: this.generateSystemBoundaries(serviceName),
      generatedAt: new Date().toISOString(),
      generatedBy: 'Contract Generation Engine',
      metadata: {
        version: '1.0.0',
        tags: ['generated', 'event'],
      },
    };
  }

  generateContractValidatedEvent(contractId?: string): ContractValidatedEvent {
    const id = contractId || this.getRandomElement(this.contractIds);
    const isValid = Math.random() > 0.2;
    
    return {
      contractId: id,
      serviceName: this.getRandomElement(this.serviceNames),
      valid: isValid,
      score: isValid ? Math.floor(85 + Math.random() * 15) : Math.floor(40 + Math.random() * 40),
      errors: isValid ? [] : this.generateValidationErrors(),
      warnings: this.generateValidationWarnings(),
      validatedAt: new Date().toISOString(),
      validatedBy: 'Contract Validation Service',
    };
  }

  generateContractPublishedEvent(contractId?: string): any {
    const id = contractId || this.getRandomElement(this.contractIds);
    const serviceName = this.getRandomElement(this.serviceNames);
    
    return {
      contractId: id,
      serviceName,
      version: '1.0.0',
      specificationUrl: `https://api.cycletime.dev/contracts/${id}/specification`,
      documentationUrl: `https://docs.cycletime.dev/services/${serviceName}`,
      publishedAt: new Date().toISOString(),
      publishedBy: 'Contract Generation Engine',
      tags: ['published', serviceName.split('-')[0]],
    };
  }

  generateContractFailedEvent(contractId?: string): ContractFailedEvent {
    const id = contractId || this.getRandomElement(this.contractIds);
    
    return {
      contractId: id,
      serviceName: this.getRandomElement(this.serviceNames),
      error: 'Contract generation failed due to invalid OpenAPI specification',
      errorCode: 'VALIDATION_FAILED',
      stage: 'validation',
      details: {
        validationErrors: ['Missing required property: operationId', 'Invalid schema reference'],
      },
      failedAt: new Date().toISOString(),
      retryable: true,
      retryCount: 0,
    };
  }

  // Private helper methods

  private generateRequirements(serviceName: string, serviceType: string): string {
    const templates = {
      'user-service': 'Manages user registration, authentication, profile management, and user preferences with secure data handling',
      'order-service': 'Handles order processing, order lifecycle management, inventory coordination, and order fulfillment tracking',
      'payment-service': 'Processes payments securely, manages payment methods, handles refunds, and integrates with payment gateways',
      'notification-service': 'Sends multi-channel notifications, manages notification preferences, tracks delivery status, and handles templates',
      'inventory-service': 'Tracks inventory levels, manages stock updates, handles reservations, and provides inventory analytics',
      'analytics-service': 'Collects and processes analytics data, generates reports, provides insights, and manages data visualization',
      'audit-service': 'Logs system activities, tracks changes, provides audit trails, and ensures compliance reporting',
      'search-service': 'Provides search functionality, manages search indexes, handles queries, and offers search analytics',
    };

    return templates[serviceName as keyof typeof templates] || 
           `A ${serviceType} service that provides core functionality for ${serviceName.replace('-', ' ')} operations`;
  }

  private generateArchitecture(serviceType: string): string {
    const templates = {
      'rest-api': 'RESTful microservice with layered architecture, following Clean Architecture principles with controllers, services, and repositories',
      'event-driven': 'Event-driven architecture using Redis pub/sub for asynchronous communication with event sourcing patterns',
      'hybrid': 'Hybrid architecture combining REST APIs for synchronous operations and events for asynchronous processes',
      'cli': 'Command-line tool with modular command structure, configuration management, and comprehensive help system',
      'web-ui': 'React-based single-page application with component-based architecture and state management',
    };

    return templates[serviceType as keyof typeof templates] || 
           'Microservice architecture with clear separation of concerns and scalable design patterns';
  }

  private generateDependencies(serviceName: string): string[] {
    const dependencyMap: Record<string, string[]> = {
      'user-service': ['database', 'redis', 'email-service'],
      'order-service': ['user-service', 'inventory-service', 'payment-service', 'notification-service'],
      'payment-service': ['user-service', 'notification-service', 'external-payment-gateway'],
      'notification-service': ['user-service', 'email-service', 'sms-service'],
      'inventory-service': ['database', 'warehouse-system'],
      'analytics-service': ['database', 'data-warehouse', 'all-services'],
      'audit-service': ['database', 'all-services'],
      'search-service': ['database', 'elasticsearch', 'all-services'],
    };

    return dependencyMap[serviceName] || ['database', 'redis'];
  }

  private generateEndpoints(serviceName: string, serviceType: string) {
    if (serviceType === 'event-driven') return [];

    const commonEndpoints = [
      {
        path: '/health',
        method: 'GET' as const,
        description: 'Health check endpoint',
        responseSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    ];

    const serviceEndpoints: Record<string, any[]> = {
      'user-service': [
        {
          path: '/api/v1/users',
          method: 'POST',
          description: 'Create new user',
          requestSchema: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8 },
              name: { type: 'string' },
            },
            required: ['email', 'password', 'name'],
          },
        },
        {
          path: '/api/v1/users/{userId}',
          method: 'GET',
          description: 'Get user by ID',
          parameters: [{
            name: 'userId',
            in: 'path',
            required: true,
            description: 'User ID',
            schema: { type: 'string', format: 'uuid' },
          }],
        },
      ],
      'order-service': [
        {
          path: '/api/v1/orders',
          method: 'POST',
          description: 'Create new order',
          requestSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string', format: 'uuid' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    productId: { type: 'string' },
                    quantity: { type: 'number', minimum: 1 },
                  },
                },
              },
            },
            required: ['userId', 'items'],
          },
        },
        {
          path: '/api/v1/orders/{orderId}',
          method: 'GET',
          description: 'Get order by ID',
          parameters: [{
            name: 'orderId',
            in: 'path',
            required: true,
            description: 'Order ID',
            schema: { type: 'string', format: 'uuid' },
          }],
        },
      ],
    };

    return [...commonEndpoints, ...(serviceEndpoints[serviceName] || [])];
  }

  private generateEvents(serviceName: string) {
    const eventMap: Record<string, any[]> = {
      'user-service': [
        {
          name: 'user.created',
          description: 'User account created',
          type: 'published',
          schema: {
            type: 'object',
            properties: {
              userId: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        {
          name: 'user.updated',
          description: 'User profile updated',
          type: 'published',
        },
      ],
      'order-service': [
        {
          name: 'order.created',
          description: 'New order created',
          type: 'published',
        },
        {
          name: 'order.completed',
          description: 'Order completed',
          type: 'published',
        },
        {
          name: 'payment.completed',
          description: 'Payment completed for order',
          type: 'consumed',
        },
      ],
    };

    return eventMap[serviceName] || [];
  }

  private generateStages(status: ContractStatus): GenerationStage[] {
    const stages: GenerationStage[] = [
      {
        name: 'requirements-analysis',
        status: 'completed',
        startedAt: new Date(Date.now() - 25000).toISOString(),
        completedAt: new Date(Date.now() - 20000).toISOString(),
      },
      {
        name: 'openapi-generation',
        status: status === 'pending' ? 'pending' : 'completed',
        startedAt: status !== 'pending' ? new Date(Date.now() - 18000).toISOString() : undefined,
        completedAt: status === 'completed' || status === 'failed' ? new Date(Date.now() - 15000).toISOString() : undefined,
      },
      {
        name: 'asyncapi-generation',
        status: status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : status === 'processing' ? 'processing' : 'pending',
        startedAt: status === 'processing' || status === 'completed' || status === 'failed' ? new Date(Date.now() - 12000).toISOString() : undefined,
        completedAt: status === 'completed' ? new Date(Date.now() - 8000).toISOString() : undefined,
        message: status === 'failed' ? 'AsyncAPI generation failed due to invalid event schema' : undefined,
      },
      {
        name: 'boundary-analysis',
        status: status === 'completed' ? 'completed' : 'pending',
        startedAt: status === 'completed' ? new Date(Date.now() - 6000).toISOString() : undefined,
        completedAt: status === 'completed' ? new Date(Date.now() - 3000).toISOString() : undefined,
      },
      {
        name: 'finalization',
        status: status === 'completed' ? 'completed' : 'pending',
        startedAt: status === 'completed' ? new Date(Date.now() - 2000).toISOString() : undefined,
        completedAt: status === 'completed' ? new Date().toISOString() : undefined,
      },
    ];

    return stages;
  }

  private generateOpenAPISpec(serviceName: string): any {
    return {
      openapi: '3.0.3',
      info: {
        title: `${serviceName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} API`,
        description: this.generateRequirements(serviceName, 'rest-api'),
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:8080`,
          description: 'Development server',
        },
        {
          url: `https://api.cycletime.dev/${serviceName}`,
          description: 'Production server',
        },
      ],
      paths: {
        '/health': {
          get: {
            summary: 'Health check',
            responses: {
              '200': {
                description: 'Service is healthy',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string' },
                        timestamp: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  private generateAsyncAPISpec(serviceName: string) {
    return {
      asyncapi: '2.6.0',
      info: {
        title: `${serviceName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Events`,
        version: '1.0.0',
        description: `Event-driven communication for ${serviceName}`,
      },
      servers: {
        development: {
          url: 'localhost:6379',
          protocol: 'redis',
          description: 'Development Redis server',
        },
      },
      channels: {},
    };
  }

  private generateSystemBoundaries(serviceName: string): SystemBoundaries {
    return {
      service: serviceName,
      dependencies: this.generateDependencies(serviceName).map(dep => ({
        service: dep,
        type: 'synchronous' as const,
        required: true,
      })),
      provides: [
        {
          name: `${serviceName} API`,
          description: `Core ${serviceName.replace('-', ' ')} functionality`,
          endpoints: ['/health', `/api/v1/${serviceName.split('-')[0]}`],
        },
      ],
      integrations: [
        {
          service: 'api-gateway',
          pattern: 'request-response' as const,
          protocol: 'http' as const,
          authentication: 'jwt' as const,
        },
      ],
    };
  }

  private generateServiceBoundary(serviceName: string): any {
    return {
      service: serviceName,
      responsibilities: [
        `Manage ${serviceName.replace('-', ' ')} lifecycle`,
        `Handle ${serviceName.replace('-', ' ')} business logic`,
        `Ensure ${serviceName.replace('-', ' ')} data consistency`,
      ],
      dataOwnership: [`${serviceName}_data`, `${serviceName}_configuration`],
      securityScope: Math.random() > 0.5 ? 'internal' : 'public',
      scalingCharacteristics: {
        pattern: this.getRandomElement(['cpu-bound', 'io-bound', 'memory-bound', 'mixed']),
        expectedLoad: this.getRandomElement(['low', 'medium', 'high', 'variable']),
      },
    };
  }

  private generateServiceInteractions(services: string[]): any[] {
    const interactions: any[] = [];
    
    for (let i = 0; i < services.length; i++) {
      for (let j = i + 1; j < services.length; j++) {
        if (Math.random() > 0.4) { // 60% chance of interaction
          interactions.push({
            from: services[i],
            to: services[j],
            type: this.getRandomElement(['synchronous', 'asynchronous', 'batch', 'streaming']),
            protocol: this.getRandomElement(['http', 'redis', 'grpc']),
            dataFlow: `${services[i].replace('-', ' ')} data to ${services[j].replace('-', ' ')}`,
            frequency: this.getRandomElement(['rare', 'occasional', 'frequent', 'constant']),
            consistency: this.getRandomElement(['strong', 'eventual', 'weak']),
          });
        }
      }
    }
    
    return interactions;
  }

  private generateBoundaryRecommendations(): BoundaryRecommendation[] {
    const recommendations = [
      {
        type: 'add-gateway',
        description: 'Add API gateway for centralized routing and authentication',
        rationale: 'Improves security and provides single entry point for external clients',
        impact: 'medium',
        effort: 'low',
      },
      {
        type: 'extract-shared-component',
        description: 'Extract common validation logic into shared library',
        rationale: 'Reduces code duplication and ensures consistency across services',
        impact: 'low',
        effort: 'medium',
      },
      {
        type: 'add-cache',
        description: 'Add Redis cache layer for frequently accessed data',
        rationale: 'Improves performance and reduces database load',
        impact: 'high',
        effort: 'low',
      },
    ] as const;

    return recommendations.slice(0, 1 + Math.floor(Math.random() * 2));
  }

  private generateValidationErrors() {
    const errors = [
      {
        code: 'MISSING_OPERATION_ID',
        message: 'Missing required operationId in path operation',
        path: '/paths/api/v1/users/get',
        severity: 'error' as const,
      },
      {
        code: 'INVALID_SCHEMA_REF',
        message: 'Invalid schema reference: #/components/schemas/NonExistent',
        path: '/paths/api/v1/users/post/requestBody/content/application/json/schema/$ref',
        severity: 'error' as const,
      },
    ];

    return errors.slice(0, Math.floor(Math.random() * 2) + 1);
  }

  private generateValidationWarnings() {
    const warnings = [
      {
        code: 'MISSING_EXAMPLE',
        message: 'Consider adding example for better API documentation',
        path: '/paths/api/v1/users/post/requestBody',
        recommendation: 'Add example request body for better developer experience',
      },
      {
        code: 'MISSING_DESCRIPTION',
        message: 'Missing description for parameter',
        path: '/paths/api/v1/users/{userId}/get/parameters/0',
        recommendation: 'Add detailed description for path parameter',
      },
    ];

    return warnings.slice(0, Math.floor(Math.random() * 3));
  }

  private generateValidationSuggestions() {
    const suggestions = [
      {
        type: 'improvement',
        message: 'Add request/response examples for better documentation',
        impact: 'medium',
        effort: 'low',
      },
      {
        type: 'best-practice',
        message: 'Use consistent naming conventions for operation IDs',
        impact: 'low',
        effort: 'low',
      },
      {
        type: 'optimization',
        message: 'Consider using schema composition for common response patterns',
        impact: 'medium',
        effort: 'medium',
      },
    ] as const;

    return suggestions.slice(0, 1 + Math.floor(Math.random() * 2));
  }

  private getProgressForStatus(status: ContractStatus): number {
    const progressMap = {
      pending: 0,
      processing: Math.floor(20 + Math.random() * 60),
      completed: 100,
      failed: Math.floor(30 + Math.random() * 40),
    };

    return progressMap[status];
  }

  private getRandomElement<T>(array: readonly T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Generate multiple contracts for testing pagination
   */
  generateContractList(count: number = 10): StoredContract[] {
    return Array.from({ length: count }, (_, index) => 
      this.generateStoredContract(
        `contract-${Date.now() - index * 1000}-${Math.random().toString(36).substr(2, 9)}`,
        this.getRandomElement(this.contractStatuses)
      )
    );
  }

  /**
   * Get mock data for specific scenarios
   */
  getScenarioData(scenario: string) {
    switch (scenario) {
      case 'microservices-platform':
        return {
          services: ['user-service', 'order-service', 'payment-service', 'notification-service'],
          architecture: 'Event-driven microservices with API gateway and shared data store',
          complexInteractions: true,
        };
      
      case 'simple-crud-service':
        return {
          services: ['product-service'],
          architecture: 'Simple REST API with CRUD operations',
          complexInteractions: false,
        };
      
      case 'event-driven-system':
        return {
          services: ['event-producer', 'event-processor', 'event-consumer'],
          architecture: 'Pure event-driven architecture with message queues',
          complexInteractions: true,
        };
      
      default:
        return {
          services: ['generic-service'],
          architecture: 'Standard service architecture',
          complexInteractions: false,
        };
    }
  }
}