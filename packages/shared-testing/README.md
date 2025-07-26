# CycleTime Shared Contract Testing Framework

A comprehensive contract testing framework for the CycleTime monorepo, enabling standardized OpenAPI/AsyncAPI validation and contract-first testing patterns across all services.

## Overview

This package provides shared utilities for contract testing across all services in the CycleTime monorepo, enabling:

- ✅ **OpenAPI specification validation** with comprehensive request/response testing
- ✅ **AsyncAPI specification validation** for event-driven contract testing  
- ✅ **Mock service orchestration** for isolated contract testing
- ✅ **Contract-first test data generation** from specifications
- ✅ **Custom Jest matchers** for contract-specific assertions
- ✅ **Performance validation** with configurable thresholds
- ✅ **Standardized Jest configurations** for consistent testing

## Installation

This package is part of the CycleTime monorepo and is installed as a workspace dependency:

```bash
npm install --save-dev @cycletime/shared-testing
```

## Core Components

### ApiValidator

Validates HTTP API contracts using OpenAPI specifications:

```typescript
import { ApiValidator } from '@cycletime/shared-testing';

const validator = new ApiValidator('./openapi.yaml');
await validator.loadSpecification();

// Validate request
const requestResult = validator.validateRequest('/users', 'POST', {
  name: 'John Doe',
  email: 'john@example.com'
});

// Validate response
const responseResult = validator.validateResponse('/users', 'POST', 201, {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com'
});
```

### EventValidator

Validates event-driven contracts using AsyncAPI specifications:

```typescript
import { EventValidator } from '@cycletime/shared-testing';

const validator = new EventValidator('./asyncapi.yaml');
await validator.loadSpecification();

// Validate published event
const result = validator.validatePublishedEvent('user.created', {
  userId: '123',
  timestamp: new Date().toISOString()
});
```

### MockOrchestrator

Creates contract-compliant mock services for testing:

```typescript
import { MockOrchestrator } from '@cycletime/shared-testing';

const orchestrator = new MockOrchestrator();

// Create mock service from OpenAPI spec
const mockService = orchestrator.createContractCompliantMock(openApiSpec);
await mockService.start();

// Create mock event broker from AsyncAPI spec
const mockBroker = orchestrator.createEventMockBroker(asyncApiSpec);
await mockBroker.start();
```

### TestDataGenerator

Generates valid test data from contract specifications:

```typescript
import { TestDataGenerator } from '@cycletime/shared-testing';

const generator = new TestDataGenerator();

// Generate API test data
const apiData = generator.generateApiTestData(openApiSpec);

// Generate event test data
const eventData = generator.generateEventTestData(asyncApiSpec);

// Generate from JSON schema
const testData = generator.generateFromSchema({
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'integer', minimum: 0, maximum: 120 }
  },
  required: ['name']
});
```

## Jest Configuration

### Using Base Configuration

Extend the base Jest configuration in your service:

```javascript
// jest.config.js
const baseConfig = require('@cycletime/shared-testing/src/config/jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'My Service',
  // Service-specific overrides if needed
};
```

### Contract Testing Configuration

For contract-specific tests, use the contract preset:

```javascript
// jest.config.contract.js
const contractConfig = require('@cycletime/shared-testing/src/config/jest.config.contract.js');

module.exports = contractConfig;
```

## Custom Jest Matchers

The framework provides custom Jest matchers for contract testing:

```typescript
import '@cycletime/shared-testing';

describe('Contract Tests', () => {
  it('should validate API contract', async () => {
    const result = await validateApiContract();
    expect(result).toMatchContract();
  });

  it('should have endpoint available', async () => {
    const report = await checkEndpoint('/health');
    expect(report).toBeAvailableEndpoint(200);
  });

  it('should meet performance requirements', async () => {
    const metrics = await measureEndpointPerformance();
    expect(metrics).toHaveResponseTimeWithin(1000);
    expect(metrics).toHaveThroughputAbove(10);
  });

  it('should validate event correlation', async () => {
    const correlation = await validateEventSequence();
    expect(correlation).toHaveValidCorrelation(['user.created', 'email.sent']);
  });
});
```

## Test Structure

Organize your contract tests following this structure:

```
src/__tests__/
├── contract/
│   ├── api-contract.test.ts      # HTTP API contract tests
│   ├── event-contract.test.ts    # Event contract tests
│   └── integration.test.ts       # Integration contract tests
└── setup.ts                      # Test setup file
```

### Example Contract Test

```typescript
// src/__tests__/contract/api-contract.test.ts
import { ApiValidator, TestDataGenerator } from '@cycletime/shared-testing';

describe('User API Contract Tests', () => {
  let apiValidator: ApiValidator;
  let testGenerator: TestDataGenerator;

  beforeAll(async () => {
    apiValidator = new ApiValidator('./openapi.yaml');
    await apiValidator.loadSpecification();
    
    testGenerator = new TestDataGenerator();
  });

  describe('POST /users', () => {
    it('should validate valid user creation request', () => {
      const validUser = testGenerator.generateFromSchema({
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' }
        },
        required: ['name', 'email']
      });

      const result = apiValidator.validateRequest('/users', 'POST', validUser);
      expect(result).toMatchContract();
    });

    it('should reject invalid user creation request', () => {
      const invalidUser = { name: '', email: 'invalid-email' };
      
      const result = apiValidator.validateRequest('/users', 'POST', invalidUser);
      expect(result).toHaveValidationErrors(['email format', 'name length']);
    });
  });
});
```

## Utilities and Helpers

### TestHelpers

Common utilities for contract testing:

```typescript
import { TestHelpers } from '@cycletime/shared-testing';

// Setup test environment
const config = TestHelpers.setupContractTestEnvironment({
  baseUrl: 'http://localhost:3000',
  timeout: { test: 30000 },
  retries: 3
});

// Retry flaky operations
const result = await TestHelpers.retry(async () => {
  return await callUnstableEndpoint();
}, 3, 1000);

// Wait for conditions
await TestHelpers.waitFor(async () => {
  return await isServiceReady();
}, 10000);

// Measure performance
const { result, metrics } = await TestHelpers.measurePerformance(async () => {
  return await callEndpoint();
});
```

### SpecLoader

Load specifications from various sources:

```typescript
import { SpecLoader } from '@cycletime/shared-testing';

// Load OpenAPI specification
const openApiSpec = await SpecLoader.loadOpenApiSpec('./openapi.yaml');

// Load AsyncAPI specification  
const asyncApiSpec = await SpecLoader.loadAsyncApiSpec('./asyncapi.yaml');

// Auto-detect and load
const spec = await SpecLoader.loadSpec('./specification.yaml');

// Load multiple specs from directory
const specs = await SpecLoader.loadSpecsFromDirectory('./contracts/');
```

## Package Scripts

The following scripts are available for the shared-testing package:

```json
{
  "build": "tsc",
  "test": "jest",
  "test:coverage": "jest --coverage",
  "test:watch": "jest --watch",
  "lint": "eslint src --ext .ts",
  "typecheck": "tsc --noEmit"
}
```

## Migration Guide

To migrate existing test suites to use the shared framework:

1. **Update Jest configuration** to extend the base config
2. **Replace manual validation** with `ApiValidator`/`EventValidator`  
3. **Use custom matchers** instead of manual assertions
4. **Generate test data** using `TestDataGenerator`
5. **Organize tests** into contract-specific structure

### Before Migration

```typescript
// Old approach
it('should validate user response', () => {
  const response = { id: '123', name: 'John' };
  expect(response).toHaveProperty('id');
  expect(response).toHaveProperty('name');
  expect(typeof response.id).toBe('string');
});
```

### After Migration

```typescript
// New approach with shared framework
it('should validate user response', () => {
  const response = { id: '123', name: 'John' };
  const result = apiValidator.validateResponse('/users', 'GET', 200, response);
  expect(result).toMatchContract();
});
```

## Best Practices

1. **Load specifications once** in `beforeAll` hooks
2. **Use generated test data** for consistency
3. **Test both valid and invalid scenarios**
4. **Organize tests by endpoint/operation**
5. **Set appropriate timeouts** for contract tests
6. **Use custom matchers** for readable assertions
7. **Validate performance** alongside contracts
8. **Clean up resources** in `afterAll` hooks

## Contributing

When adding new features to the shared testing framework:

1. **Follow existing patterns** and conventions
2. **Add comprehensive tests** with 90%+ coverage
3. **Update type definitions** as needed
4. **Document new features** in this README
5. **Ensure backward compatibility**

## Dependencies

- **ajv**: JSON schema validation
- **@apidevtools/swagger-parser**: OpenAPI parsing and validation
- **@asyncapi/parser**: AsyncAPI parsing and validation
- **supertest**: HTTP endpoint testing
- **js-yaml**: YAML parsing
- **jest**: Testing framework (peer dependency)

## License

AGPL-3.0-or-later