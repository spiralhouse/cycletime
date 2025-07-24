import { StubGenerator, StubGenerationOptions, GeneratedStub } from '../utils/stub-generator';
import { ContractSpecification } from '../types/contract-types';
import { logger } from '@cycletime/shared-utils';

export class StubGenerationService {
  private stubGenerator: StubGenerator;
  private activeGenerations: Map<string, AbortController>;

  constructor() {
    this.stubGenerator = new StubGenerator();
    this.activeGenerations = new Map();
  }

  async generateStub(
    specification: ContractSpecification,
    options: StubGenerationOptions = {
      includeExamples: true,
      includeMockData: true,
      includeValidation: true,
      responseDelay: 0,
      errorRate: 0,
      includeHealthCheck: true,
    }
  ): Promise<GeneratedStub> {
    const generationId = this.generateGenerationId();
    const abortController = new AbortController();
    
    try {
      logger.info('Starting stub generation', {
        generationId,
        contractId: specification.contractId,
        serviceName: specification.serviceName,
        options,
      });

      // Store abort controller for potential cancellation
      this.activeGenerations.set(generationId, abortController);

      // Generate stub
      const stub = await this.stubGenerator.generateStub(specification, options);

      // Clean up
      this.activeGenerations.delete(generationId);

      logger.info('Stub generation completed', {
        generationId,
        contractId: specification.contractId,
        serviceName: specification.serviceName,
        stubSize: stub.serviceStub.length,
        mockDataCount: Object.keys(stub.mockData).length,
      });

      return stub;
    } catch (error) {
      // Clean up
      this.activeGenerations.delete(generationId);
      
      logger.error('Stub generation failed: ' + error.message);
      
      throw error;
    }
  }

  async generateStubWithCustomization(
    specification: ContractSpecification,
    customization: {
      responseTemplates?: Record<string, any>;
      errorScenarios?: Array<{
        endpoint: string;
        method: string;
        errorCode: number;
        errorMessage: string;
        probability: number;
      }>;
      dataGenerators?: Record<string, (context: any) => any>;
      middleware?: string[];
    },
    options: StubGenerationOptions = {
      includeExamples: true,
      includeMockData: true,
      includeValidation: true,
      responseDelay: 0,
      errorRate: 0,
      includeHealthCheck: true,
    }
  ): Promise<GeneratedStub> {
    try {
      logger.info('Starting customized stub generation', {
        contractId: specification.contractId,
        serviceName: specification.serviceName,
        customization: Object.keys(customization),
      });

      // Generate base stub
      const baseStub = await this.generateStub(specification, options);

      // Apply customizations
      const customizedStub = await this.applyCustomizations(baseStub, customization);

      return customizedStub;
    } catch (error) {
      logger.error('Customized stub generation failed: ' + error.message);
      throw error;
    }
  }

  async generateStubBundle(
    specifications: ContractSpecification[],
    bundleOptions: {
      includeDockerCompose?: boolean;
      includeKubernetesManifests?: boolean;
      includeGatewayConfig?: boolean;
      includeMonitoring?: boolean;
    } = {},
    stubOptions: StubGenerationOptions = {
      includeExamples: true,
      includeMockData: true,
      includeValidation: true,
      responseDelay: 0,
      errorRate: 0,
      includeHealthCheck: true,
    }
  ): Promise<{
    stubs: Map<string, GeneratedStub>;
    bundle: {
      dockerCompose?: string;
      kubernetesManifests?: string[];
      gatewayConfig?: string;
      monitoring?: string;
      readme?: string;
    };
  }> {
    try {
      logger.info('Starting stub bundle generation', {
        serviceCount: specifications.length,
        bundleOptions,
      });

      // Generate individual stubs
      const stubs = new Map<string, GeneratedStub>();
      
      for (const spec of specifications) {
        const stub = await this.generateStub(spec, stubOptions);
        stubs.set(spec.serviceName, stub);
      }

      // Generate bundle components
      const bundle: any = {};

      if (bundleOptions.includeDockerCompose) {
        bundle.dockerCompose = await this.generateDockerCompose(specifications, stubs);
      }

      if (bundleOptions.includeKubernetesManifests) {
        bundle.kubernetesManifests = await this.generateKubernetesManifests(specifications, stubs);
      }

      if (bundleOptions.includeGatewayConfig) {
        bundle.gatewayConfig = await this.generateGatewayConfig(specifications, stubs);
      }

      if (bundleOptions.includeMonitoring) {
        bundle.monitoring = await this.generateMonitoringConfig(specifications, stubs);
      }

      bundle.readme = await this.generateBundleReadme(specifications, bundleOptions);

      logger.info('Stub bundle generation completed', {
        serviceCount: specifications.length,
        bundleComponents: Object.keys(bundle),
      });

      return { stubs, bundle };
    } catch (error) {
      logger.error('Stub bundle generation failed: ' + error.message);
      throw error;
    }
  }

  async generateStubTests(
    specification: ContractSpecification,
    testOptions: {
      includeUnitTests?: boolean;
      includeIntegrationTests?: boolean;
      includeContractTests?: boolean;
      includePerformanceTests?: boolean;
      testFramework?: 'jest' | 'mocha' | 'vitest';
    } = {}
  ): Promise<{
    unitTests?: string;
    integrationTests?: string;
    contractTests?: string;
    performanceTests?: string;
    testConfig?: string;
  }> {
    try {
      logger.info('Starting stub test generation', {
        contractId: specification.contractId,
        serviceName: specification.serviceName,
        testOptions,
      });

      const tests: any = {};

      if (testOptions.includeUnitTests !== false) {
        tests.unitTests = await this.generateUnitTests(specification, testOptions);
      }

      if (testOptions.includeIntegrationTests) {
        tests.integrationTests = await this.generateIntegrationTests(specification, testOptions);
      }

      if (testOptions.includeContractTests) {
        tests.contractTests = await this.generateContractTests(specification, testOptions);
      }

      if (testOptions.includePerformanceTests) {
        tests.performanceTests = await this.generatePerformanceTests(specification, testOptions);
      }

      tests.testConfig = await this.generateTestConfig(specification, testOptions);

      logger.info('Stub test generation completed', {
        contractId: specification.contractId,
        serviceName: specification.serviceName,
        testTypes: Object.keys(tests),
      });

      return tests;
    } catch (error) {
      logger.error('Stub test generation failed: ' + error.message);
      throw error;
    }
  }

  async generateStubDocumentation(
    specification: ContractSpecification,
    documentationOptions: {
      includeApiDocs?: boolean;
      includeSetupGuide?: boolean;
      includeUsageExamples?: boolean;
      includeContractValidation?: boolean;
      format?: 'markdown' | 'html' | 'pdf';
    } = {}
  ): Promise<{
    apiDocs?: string;
    setupGuide?: string;
    usageExamples?: string;
    contractValidation?: string;
    fullDocumentation?: string;
  }> {
    try {
      logger.info('Starting stub documentation generation', {
        contractId: specification.contractId,
        serviceName: specification.serviceName,
        documentationOptions,
      });

      const docs: any = {};

      if (documentationOptions.includeApiDocs !== false) {
        docs.apiDocs = await this.generateApiDocumentation(specification, documentationOptions);
      }

      if (documentationOptions.includeSetupGuide !== false) {
        docs.setupGuide = await this.generateSetupGuide(specification, documentationOptions);
      }

      if (documentationOptions.includeUsageExamples !== false) {
        docs.usageExamples = await this.generateUsageExamples(specification, documentationOptions);
      }

      if (documentationOptions.includeContractValidation) {
        docs.contractValidation = await this.generateContractValidationDocs(specification, documentationOptions);
      }

      if (documentationOptions.format === 'html') {
        docs.fullDocumentation = await this.generateHtmlDocumentation(docs);
      } else if (documentationOptions.format === 'pdf') {
        docs.fullDocumentation = await this.generatePdfDocumentation(docs);
      } else {
        docs.fullDocumentation = await this.generateMarkdownDocumentation(docs);
      }

      logger.info('Stub documentation generation completed', {
        contractId: specification.contractId,
        serviceName: specification.serviceName,
        documentationSections: Object.keys(docs),
      });

      return docs;
    } catch (error) {
      logger.error('Stub documentation generation failed: ' + error.message);
      throw error;
    }
  }

  async cancelStubGeneration(generationId: string): Promise<void> {
    try {
      const abortController = this.activeGenerations.get(generationId);
      
      if (abortController) {
        abortController.abort();
        this.activeGenerations.delete(generationId);
        logger.info('Stub generation cancelled', { generationId });
      } else {
        logger.warn('Stub generation not found for cancellation', { generationId });
      }
    } catch (error) {
      logger.error('Failed to cancel stub generation' + ": " + error.message);
      throw error;
    }
  }

  private async applyCustomizations(
    baseStub: GeneratedStub,
    customization: any
  ): Promise<GeneratedStub> {
    let customizedStub = { ...baseStub };

    // Apply response templates
    if (customization.responseTemplates) {
      customizedStub.mockData = {
        ...customizedStub.mockData,
        ...customization.responseTemplates,
      };
    }

    // Apply error scenarios
    if (customization.errorScenarios) {
      customizedStub.serviceStub = await this.injectErrorScenarios(
        customizedStub.serviceStub,
        customization.errorScenarios
      );
    }

    // Apply custom data generators
    if (customization.dataGenerators) {
      customizedStub.mockData = await this.applyCustomDataGenerators(
        customizedStub.mockData,
        customization.dataGenerators
      );
    }

    // Apply middleware
    if (customization.middleware) {
      customizedStub.serviceStub = await this.injectCustomMiddleware(
        customizedStub.serviceStub,
        customization.middleware
      );
    }

    return customizedStub;
  }

  private async generateDockerCompose(
    specifications: ContractSpecification[],
    stubs: Map<string, GeneratedStub>
  ): Promise<string> {
    const services = specifications.map(spec => ({
      name: spec.serviceName.toLowerCase().replace(/\s+/g, '-'),
      image: `${spec.serviceName.toLowerCase()}-stub:latest`,
      port: this.assignPort(spec.serviceName),
      environment: this.generateEnvironmentVariables(spec),
    }));

    return `
version: '3.8'
services:
${services.map(service => `
  ${service.name}:
    build: ./${service.name}
    ports:
      - "${service.port}:${service.port}"
    environment:
${service.environment.map(env => `      - ${env}`).join('\n')}
    depends_on:
      - redis
    networks:
      - stub-network
`).join('')}
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - stub-network

networks:
  stub-network:
    driver: bridge
`;
  }

  private async generateKubernetesManifests(
    specifications: ContractSpecification[],
    stubs: Map<string, GeneratedStub>
  ): Promise<string[]> {
    const manifests: string[] = [];

    for (const spec of specifications) {
      const serviceName = spec.serviceName.toLowerCase().replace(/\s+/g, '-');
      const port = this.assignPort(spec.serviceName);

      const deployment = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${serviceName}
  labels:
    app: ${serviceName}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${serviceName}
  template:
    metadata:
      labels:
        app: ${serviceName}
    spec:
      containers:
      - name: ${serviceName}
        image: ${serviceName}-stub:latest
        ports:
        - containerPort: ${port}
        env:
        - name: NODE_ENV
          value: "development"
        - name: PORT
          value: "${port}"
---
apiVersion: v1
kind: Service
metadata:
  name: ${serviceName}
spec:
  selector:
    app: ${serviceName}
  ports:
  - port: ${port}
    targetPort: ${port}
  type: ClusterIP
`;

      manifests.push(deployment);
    }

    return manifests;
  }

  private async generateGatewayConfig(
    specifications: ContractSpecification[],
    stubs: Map<string, GeneratedStub>
  ): Promise<string> {
    const routes = specifications.map(spec => {
      const serviceName = spec.serviceName.toLowerCase().replace(/\s+/g, '-');
      const port = this.assignPort(spec.serviceName);

      return {
        name: serviceName,
        path: `/${serviceName}`,
        target: `http://${serviceName}:${port}`,
      };
    });

    return `
# API Gateway Configuration
upstream_configs:
${routes.map(route => `
  ${route.name}:
    url: ${route.target}
    health_check: /health
    timeout: 30s
    retries: 3
`).join('')}

routes:
${routes.map(route => `
  - path: ${route.path}/*
    upstream: ${route.name}
    strip_path: true
    preserve_host: false
`).join('')}

middleware:
  - cors
  - rate_limit
  - logging
  - metrics
`;
  }

  private async generateMonitoringConfig(
    specifications: ContractSpecification[],
    stubs: Map<string, GeneratedStub>
  ): Promise<string> {
    const services = specifications.map(spec => {
      const serviceName = spec.serviceName.toLowerCase().replace(/\s+/g, '-');
      const port = this.assignPort(spec.serviceName);

      return {
        name: serviceName,
        port,
        healthCheck: `/health`,
        metricsEndpoint: `/metrics`,
      };
    });

    return `
# Monitoring Configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
${services.map(service => `
  - job_name: '${service.name}'
    static_configs:
      - targets: ['${service.name}:${service.port}']
    metrics_path: '${service.metricsEndpoint}'
    scrape_interval: 30s
    scrape_timeout: 10s
`).join('')}

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
`;
  }

  private async generateBundleReadme(
    specifications: ContractSpecification[],
    bundleOptions: any
  ): Promise<string> {
    const serviceNames = specifications.map(spec => spec.serviceName);

    return `
# Service Stub Bundle

This bundle contains stub implementations for ${serviceNames.length} services:

${serviceNames.map(name => `- ${name}`).join('\n')}

## Quick Start

1. Start all services:
   \`\`\`bash
   docker-compose up -d
   \`\`\`

2. Verify services are running:
   \`\`\`bash
   curl http://localhost:3000/health
   \`\`\`

## Services

${specifications.map(spec => `
### ${spec.serviceName}

**Base URL:** http://localhost:${this.assignPort(spec.serviceName)}

**Health Check:** \`GET /health\`

**API Documentation:** Available at \`/docs\` endpoint

`).join('')}

## Configuration

### Environment Variables

- \`NODE_ENV\` - Environment (development/production)
- \`LOG_LEVEL\` - Logging level (debug/info/warn/error)
- \`REDIS_URL\` - Redis connection string

### Bundle Components

${bundleOptions.includeDockerCompose ? '- ✅ Docker Compose configuration' : ''}
${bundleOptions.includeKubernetesManifests ? '- ✅ Kubernetes manifests' : ''}
${bundleOptions.includeGatewayConfig ? '- ✅ API Gateway configuration' : ''}
${bundleOptions.includeMonitoring ? '- ✅ Monitoring configuration' : ''}

## Development

Each service stub includes:
- Realistic mock data
- Request/response validation
- Error simulation
- Performance testing endpoints
- Health checks
- Metrics collection

## Testing

Run integration tests:
\`\`\`bash
npm test
\`\`\`

Run performance tests:
\`\`\`bash
npm run test:performance
\`\`\`

## Support

For questions or issues, please refer to the individual service documentation or contact the development team.

Generated on: ${new Date().toISOString()}
`;
  }

  private async generateUnitTests(specification: ContractSpecification, testOptions: any): Promise<string> {
    const framework = testOptions.testFramework || 'jest';
    const serviceName = specification.serviceName;

    return `
import { ${this.toCamelCase(serviceName)}Service } from '../src/${serviceName.toLowerCase()}-service';

describe('${serviceName} Unit Tests', () => {
  let service: ${this.toCamelCase(serviceName)}Service;

  beforeEach(() => {
    service = new ${this.toCamelCase(serviceName)}Service();
  });

  describe('Service Initialization', () => {
    test('should initialize service correctly', () => {
      expect(service).toBeDefined();
      expect(service.isHealthy()).toBe(true);
    });
  });

  describe('Mock Data Generation', () => {
    test('should generate valid mock data', () => {
      const mockData = service.generateMockData();
      expect(mockData).toBeDefined();
      expect(typeof mockData).toBe('object');
    });
  });

  describe('Request Validation', () => {
    test('should validate requests correctly', () => {
      const validRequest = { /* valid request data */ };
      const result = service.validateRequest(validRequest);
      expect(result.isValid).toBe(true);
    });

    test('should reject invalid requests', () => {
      const invalidRequest = { /* invalid request data */ };
      const result = service.validateRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});
`;
  }

  private async generateIntegrationTests(specification: ContractSpecification, testOptions: any): Promise<string> {
    const serviceName = specification.serviceName;

    return `
import { FastifyInstance } from 'fastify';
import { build } from '../src/app';

describe('${serviceName} Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = build();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe('healthy');
    });
  });

  describe('Service Endpoints', () => {
    // Generated tests for each endpoint
  });
});
`;
  }

  private async generateContractTests(specification: ContractSpecification, testOptions: any): Promise<string> {
    const serviceName = specification.serviceName;

    return `
import { validateContract } from '../src/contract-validator';
import { openApiSpec } from '../src/openapi-spec';

describe('${serviceName} Contract Tests', () => {
  describe('OpenAPI Specification', () => {
    test('should have valid OpenAPI specification', () => {
      const validation = validateContract(openApiSpec);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should match actual implementation', async () => {
      // Contract validation tests
    });
  });
});
`;
  }

  private async generatePerformanceTests(specification: ContractSpecification, testOptions: any): Promise<string> {
    const serviceName = specification.serviceName;

    return `
import { performance } from 'perf_hooks';
import { FastifyInstance } from 'fastify';
import { build } from '../src/app';

describe('${serviceName} Performance Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = build();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Response Time', () => {
    test('should respond within acceptable time limits', async () => {
      const start = performance.now();
      
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const end = performance.now();
      const responseTime = end - start;

      expect(response.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(100); // 100ms threshold
    });
  });

  describe('Load Testing', () => {
    test('should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const promises = Array.from({ length: concurrentRequests }, () =>
        app.inject({
          method: 'GET',
          url: '/health',
        })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
    });
  });
});
`;
  }

  private async generateTestConfig(specification: ContractSpecification, testOptions: any): Promise<string> {
    const framework = testOptions.testFramework || 'jest';

    if (framework === 'jest') {
      return `
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
`;
    }

    return `
// Test configuration for ${framework}
export default {
  // Configuration for ${framework}
};
`;
  }

  private async generateApiDocumentation(specification: ContractSpecification, options: any): Promise<string> {
    return `
# ${specification.serviceName} API Documentation

## Overview

${specification.metadata?.requirements || 'API documentation for the service stub.'}

## Base URL

\`\`\`
http://localhost:${this.assignPort(specification.serviceName)}
\`\`\`

## Authentication

The stub service supports the following authentication methods:
- Bearer Token
- API Key
- Basic Authentication (for testing)

## Endpoints

### Health Check

\`\`\`http
GET /health
\`\`\`

Returns the health status of the service.

#### Response

\`\`\`json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
\`\`\`

## Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

Error responses include:
\`\`\`json
{
  "error": "Error Name",
  "message": "Detailed error message",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint"
}
\`\`\`
`;
  }

  private async generateSetupGuide(specification: ContractSpecification, options: any): Promise<string> {
    return `
# ${specification.serviceName} Setup Guide

## Prerequisites

- Node.js 18+
- Docker (optional)
- Redis (for caching)

## Installation

### Using npm

\`\`\`bash
npm install
npm run build
npm start
\`\`\`

### Using Docker

\`\`\`bash
docker build -t ${specification.serviceName.toLowerCase()}-stub .
docker run -p ${this.assignPort(specification.serviceName)}:${this.assignPort(specification.serviceName)} ${specification.serviceName.toLowerCase()}-stub
\`\`\`

## Configuration

### Environment Variables

- \`PORT\` - Server port (default: ${this.assignPort(specification.serviceName)})
- \`NODE_ENV\` - Environment (development/production)
- \`LOG_LEVEL\` - Logging level (debug/info/warn/error)
- \`REDIS_URL\` - Redis connection string

### Configuration File

Create a \`.env\` file in the root directory:

\`\`\`
PORT=${this.assignPort(specification.serviceName)}
NODE_ENV=development
LOG_LEVEL=info
REDIS_URL=redis://localhost:6379
\`\`\`

## Running the Service

### Development Mode

\`\`\`bash
npm run dev
\`\`\`

### Production Mode

\`\`\`bash
npm run build
npm start
\`\`\`

## Verification

Verify the service is running:

\`\`\`bash
curl http://localhost:${this.assignPort(specification.serviceName)}/health
\`\`\`

Expected response:
\`\`\`json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
\`\`\`
`;
  }

  private async generateUsageExamples(specification: ContractSpecification, options: any): Promise<string> {
    return `
# ${specification.serviceName} Usage Examples

## Basic Usage

### JavaScript/TypeScript

\`\`\`typescript
import axios from 'axios';

const baseURL = 'http://localhost:${this.assignPort(specification.serviceName)}';
const client = axios.create({ baseURL });

// Health check
const health = await client.get('/health');
console.log(health.data);

// Example API call
const response = await client.get('/api/example');
console.log(response.data);
\`\`\`

### Python

\`\`\`python
import requests

base_url = 'http://localhost:${this.assignPort(specification.serviceName)}'

# Health check
response = requests.get(f'{base_url}/health')
print(response.json())

# Example API call
response = requests.get(f'{base_url}/api/example')
print(response.json())
\`\`\`

### cURL

\`\`\`bash
# Health check
curl -X GET http://localhost:${this.assignPort(specification.serviceName)}/health

# Example API call
curl -X GET http://localhost:${this.assignPort(specification.serviceName)}/api/example \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer your-token"
\`\`\`

## Testing Scenarios

### Error Simulation

The stub service can simulate various error conditions:

\`\`\`bash
# Simulate 500 error
curl -X GET http://localhost:${this.assignPort(specification.serviceName)}/api/example?simulateError=500

# Simulate timeout
curl -X GET http://localhost:${this.assignPort(specification.serviceName)}/api/example?simulateTimeout=true
\`\`\`

### Response Delay

Add artificial delay to responses:

\`\`\`bash
curl -X GET http://localhost:${this.assignPort(specification.serviceName)}/api/example?delay=2000
\`\`\`
`;
  }

  private async generateContractValidationDocs(specification: ContractSpecification, options: any): Promise<string> {
    return `
# Contract Validation Documentation

## Overview

This document describes the contract validation capabilities of the ${specification.serviceName} stub service.

## Validation Features

### Request Validation

The stub service validates all incoming requests against the OpenAPI specification:

- **Schema Validation**: Request body, query parameters, and headers
- **Type Validation**: Data types and formats
- **Required Fields**: Missing required fields are rejected
- **Enum Validation**: Enumerated values are validated

### Response Validation

Responses are validated to ensure they conform to the contract:

- **Schema Compliance**: Response structure matches specification
- **Status Code Validation**: Appropriate HTTP status codes
- **Content Type Validation**: Correct content types

## Contract Testing

### Automated Testing

The stub includes automated contract tests that verify:

- OpenAPI specification validity
- Request/response schema compliance
- Error handling consistency
- Authentication/authorization requirements

### Manual Testing

Use the following endpoints to test contract compliance:

\`\`\`bash
# Validate a request
curl -X POST http://localhost:${this.assignPort(specification.serviceName)}/validate/request \\
  -H "Content-Type: application/json" \\
  -d '{"endpoint": "/api/example", "method": "GET", "data": {}}'

# Validate a response
curl -X POST http://localhost:${this.assignPort(specification.serviceName)}/validate/response \\
  -H "Content-Type: application/json" \\
  -d '{"endpoint": "/api/example", "method": "GET", "statusCode": 200, "data": {}}'
\`\`\`

## Validation Reports

Generate validation reports:

\`\`\`bash
# Generate full validation report
curl -X GET http://localhost:${this.assignPort(specification.serviceName)}/validation/report

# Generate specific endpoint report
curl -X GET http://localhost:${this.assignPort(specification.serviceName)}/validation/report/endpoint?path=/api/example
\`\`\`
`;
  }

  private async generateMarkdownDocumentation(docs: any): Promise<string> {
    const sections = [];
    
    if (docs.apiDocs) sections.push(docs.apiDocs);
    if (docs.setupGuide) sections.push(docs.setupGuide);
    if (docs.usageExamples) sections.push(docs.usageExamples);
    if (docs.contractValidation) sections.push(docs.contractValidation);
    
    return sections.join('\n\n---\n\n');
  }

  private async generateHtmlDocumentation(docs: any): Promise<string> {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Service Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 5px; }
        code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
    </style>
</head>
<body>
    ${await this.generateMarkdownDocumentation(docs)}
</body>
</html>
`;
  }

  private async generatePdfDocumentation(docs: any): Promise<string> {
    // In a real implementation, you would use a PDF generation library
    return 'PDF generation not implemented in this stub';
  }

  private async injectErrorScenarios(serviceStub: string, errorScenarios: any[]): Promise<string> {
    // Inject error handling code into the service stub
    return serviceStub; // Simplified implementation
  }

  private async applyCustomDataGenerators(mockData: any, dataGenerators: any): Promise<any> {
    // Apply custom data generators to mock data
    return mockData; // Simplified implementation
  }

  private async injectCustomMiddleware(serviceStub: string, middleware: string[]): Promise<string> {
    // Inject custom middleware into the service stub
    return serviceStub; // Simplified implementation
  }

  private assignPort(serviceName: string): number {
    // Simple port assignment based on service name hash
    const hash = serviceName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 3000 + (hash % 1000);
  }

  private generateEnvironmentVariables(specification: ContractSpecification): string[] {
    return [
      `NODE_ENV=development`,
      `PORT=${this.assignPort(specification.serviceName)}`,
      `SERVICE_NAME=${specification.serviceName}`,
      `LOG_LEVEL=info`,
    ];
  }

  private toCamelCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .map((word, index) => {
        if (index === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }

  private generateGenerationId(): string {
    return `stub-generation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}