# Technical Design: Contract Testing Framework & Standards

**Epic**: SPI-138  
**Design Task**: SPI-188  
**Author**: Development Team  
**Date**: 2025-07-25  
**Status**: Draft  

## Executive Summary

This document defines a comprehensive contract testing framework that standardizes testing practices across all 18+ packages in the CycleTime monorepo. The framework builds upon the existing AI Service contract testing foundation to provide shared utilities, consistent Jest configurations, and unified contract validation patterns.

### Key Benefits

- **100% contract testing coverage** across all services using shared framework
- **80% minimum test coverage** standardized across all packages  
- **50% reduction in testing code duplication** through shared utilities
- **Consistent CI/CD integration** with unified coverage reporting
- **Contract-first development** enabling parallel team development

## Current State Analysis

### Existing Testing Infrastructure

#### AI Service Contract Testing Foundation
The AI Service already implements comprehensive contract testing in `packages/ai-service/src/__tests__/contract/`:

- **HTTP API Contract Tests**: OpenAPI specification validation for 17 endpoints
- **Event Contract Tests**: AsyncAPI validation for 25 published + 6 consumed events  
- **Performance Contract Tests**: Response time and throughput validation
- **Integration Contract Tests**: Service discovery and cross-service communication

**Dependencies Used**:
- `supertest` - HTTP endpoint testing
- `ajv` + `ajv-formats` - JSON schema validation
- `swagger-parser` - OpenAPI specification validation  
- `js-yaml` - YAML specification parsing

#### Jest Configuration Inconsistencies

Analysis of 18 Jest configurations reveals significant variations:

**Coverage Thresholds**:
- `shared-utils`: 90% across all metrics
- `api-gateway`: 80-85% mixed thresholds
- `document-service`: No coverage threshold defined
- Most packages: No standardized coverage requirements

**Configuration Patterns**:
- **CommonJS vs ESM**: Mixed module systems (`module.exports` vs `export default`)
- **Test Timeouts**: Ranging from default (5s) to 15s
- **Setup Files**: Inconsistent `setup.ts` and `setupFilesAfterEnv` usage
- **Coverage Exclusions**: Different patterns for excluding test files and types

**Test Script Naming**:
- Some packages: Basic `test` script only
- AI Service: `test:all`, `test:contract` specialized scripts
- API Gateway: ESM-specific configuration with mock handling

### Package Categorization

**Core Services** (5 points complexity):
- `ai-service` - Existing contract testing foundation
- `standards-engine` - Standards analysis and compliance
- `contract-generation-engine` - Schema generation and validation

**API & Routing Services** (5 points complexity):
- `api-gateway` - Service routing and proxy functionality
- `project-service` - Project management endpoints  
- `document-service` - Document processing and storage

**Integration Services** (3 points complexity):
- `context-management-service` - Context storage and retrieval
- `notification-service` - Multi-channel notifications
- `mcp-server` - External tool integrations

**Client Services** (3 points complexity):
- `web-dashboard` - Frontend API consumption
- CLI Tool (to be created) - Command-line interface
- `issue-tracker-service` - Issue management APIs

**Infrastructure Services** (2 points complexity):
- Git Integration Service (to be created) - Repository operations

**Shared Packages**:
- `shared-utils`, `shared-types`, `shared-config` - Utility libraries

## Proposed Architecture

### Framework Structure

```
packages/
├── shared-testing/                    # New shared testing framework package
│   ├── src/
│   │   ├── contract/
│   │   │   ├── api-validator.ts       # OpenAPI validation utilities
│   │   │   ├── event-validator.ts     # AsyncAPI validation utilities
│   │   │   ├── mock-orchestrator.ts   # Test service orchestration
│   │   │   └── test-data-generator.ts # Contract-first test data
│   │   ├── config/
│   │   │   ├── jest.config.base.js    # Base Jest configuration
│   │   │   └── jest.config.contract.js # Contract testing preset
│   │   ├── assertions/
│   │   │   ├── contract-matchers.ts   # Custom Jest matchers
│   │   │   └── performance-matchers.ts # Performance assertion helpers
│   │   └── utils/
│   │       ├── spec-loader.ts         # Dynamic spec loading
│   │       └── test-helpers.ts        # Common test utilities
│   ├── jest.config.js
│   ├── package.json
│   └── README.md
└── [existing packages]/
    ├── jest.config.js                 # Extended from shared base
    ├── src/__tests__/
    │   ├── contract/                  # Contract test suites
    │   │   ├── api-contract.test.ts   # HTTP API contracts
    │   │   ├── event-contract.test.ts # Event contracts
    │   │   └── integration.test.ts    # Integration contracts
    │   └── setup.ts                   # Package-specific setup
    └── [service code]
```

### Core Framework Components

#### 1. API Validator (`api-validator.ts`)

```typescript
export class ApiValidator {
  private ajv: Ajv;
  private openApiSpec: OpenAPIV3.Document;
  
  constructor(specPath: string) {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    this.openApiSpec = this.loadOpenApiSpec(specPath);
  }
  
  validateRequest(path: string, method: string, data: any): ValidationResult;
  validateResponse(path: string, method: string, statusCode: number, data: any): ValidationResult;
  validateEndpointAvailability(baseUrl: string): Promise<EndpointReport>;
}
```

#### 2. Event Validator (`event-validator.ts`)

```typescript
export class EventValidator {
  private asyncApiSpec: AsyncAPIDocument;
  
  constructor(specPath: string) {
    this.asyncApiSpec = this.loadAsyncApiSpec(specPath);
  }
  
  validatePublishedEvent(eventName: string, payload: any): ValidationResult;
  validateConsumedEvent(eventName: string, payload: any): ValidationResult;
  validateEventCorrelation(events: EventSequence[]): CorrelationReport;
}
```

#### 3. Mock Orchestrator (`mock-orchestrator.ts`)

```typescript
export class MockOrchestrator {
  createContractCompliantMock(spec: OpenAPIV3.Document, options?: MockOptions): MockService;
  createEventMockBroker(spec: AsyncAPIDocument): MockEventBroker;
  orchestrateServiceInteractions(services: ServiceConfig[]): TestEnvironment;
}
```

#### 4. Test Data Generator (`test-data-generator.ts`)

```typescript
export class TestDataGenerator {
  generateFromSchema(schema: JSONSchema7): any;
  generateApiTestData(spec: OpenAPIV3.Document): ApiTestData;
  generateEventTestData(spec: AsyncAPIDocument): EventTestData;
  generatePerformanceTestData(endpoints: EndpointConfig[]): PerformanceTestSuite;
}
```

### Jest Configuration Standardization

#### Base Configuration (`jest.config.base.js`)

```javascript
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
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
};
```

#### Contract Testing Preset (`jest.config.contract.js`)

```javascript
const baseConfig = require('./jest.config.base.js');

module.exports = {
  ...baseConfig,
  
  // Extended timeout for contract tests
  testTimeout: 30000,
  
  // Contract-specific test patterns
  testMatch: ['**/__tests__/contract/**/*.test.ts'],
  
  // Additional setup for contract testing
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    '@cycletime/shared-testing/setup-contract-tests'
  ],
  
  // Contract testing specific globals
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'ES2020',
        module: 'commonjs'
      }
    }
  }
};
```

### Package-Specific Implementation Pattern

Each package extends the base configuration:

```javascript
// packages/[service]/jest.config.js
const baseConfig = require('@cycletime/shared-testing/jest.config.base.js');

module.exports = {
  ...baseConfig,
  
  // Package-specific overrides if needed
  displayName: 'AI Service',
  
  // Service-specific module mapping for ESM packages
  moduleNameMapping: {
    // Add only if required for specific packages
  }
};
```

## Implementation Strategy

### Phase 1: Foundation Development

#### SPI-139: Shared Contract Testing Framework & Utilities (5 points)

**Tasks**:
1. **Create `packages/shared-testing/` package**
   - Initialize package with proper dependencies
   - Set up TypeScript configuration and build process
   - Create package.json with framework dependencies

2. **Implement Core Framework Components**
   - `ApiValidator` class with OpenAPI validation
   - `EventValidator` class with AsyncAPI validation  
   - `MockOrchestrator` for test service orchestration
   - `TestDataGenerator` for contract-first test data

3. **Create Base Jest Configurations**
   - `jest.config.base.js` with standardized settings
   - `jest.config.contract.js` preset for contract testing
   - Custom Jest matchers for contract assertions

4. **Framework Integration Utilities**
   - Spec loading utilities for dynamic specification handling
   - Test setup helpers for consistent test environment
   - Performance testing utilities for SLA validation

**Dependencies**: 
- `ajv` + `ajv-formats` - JSON schema validation
- `swagger-parser` - OpenAPI specification validation
- `@asyncapi/parser` - AsyncAPI specification parsing
- `supertest` - HTTP endpoint testing
- `js-yaml` - YAML specification parsing

**Success Criteria**:
- All framework components have 100% unit test coverage
- Framework can load and validate OpenAPI/AsyncAPI specifications
- Mock services can be generated from contract specifications
- Test data generators produce valid contract-compliant data

#### SPI-140: Jest Configuration Standardization (3 points)

**Tasks**:
1. **Standardize Jest Configurations**
   - Update all 18 package Jest configs to extend shared base
   - Implement 80% coverage threshold across all packages
   - Standardize test script naming in package.json files

2. **Resolve Configuration Conflicts**
   - Address CommonJS vs ESM configuration differences
   - Standardize setup file patterns across packages
   - Ensure consistent test timeout and behavior settings

3. **Update TurboRepo Integration**
   - Modify turbo.json to support contract testing workflows
   - Add `test:contract` task with proper dependencies
   - Configure coverage aggregation across packages

**Success Criteria**:
- All packages achieve minimum 80% test coverage
- Consistent test execution patterns across monorepo
- TurboRepo tasks execute reliably with shared configuration
- Coverage reporting aggregated correctly in CI/CD

### Phase 2: Service Implementation (Parallel)

After Phase 1 completion, implement contract testing for service categories:

#### SPI-141: Contract Testing - Core Services (5 points)
- **AI Service**: Enhance existing contract tests to use shared framework
- **Standards Engine**: Implement OpenAPI/AsyncAPI contract validation
- **Contract Generation Engine**: Schema generation contract testing

#### SPI-142: Contract Testing - API & Routing Services (5 points)  
- **API Gateway**: Route configuration and proxy contract validation
- **Project Service**: Project management API contract testing
- **Document Service**: Document processing contract validation

#### SPI-143: Contract Testing - Integration Services (3 points)
- **Context Management**: Context storage/retrieval contract testing
- **Notification Service**: Multi-channel notification contract validation
- **MCP Server**: External tool integration contract testing

#### SPI-144: Contract Testing - Client Services (3 points)
- **Web Dashboard**: Frontend API consumption contract validation
- **CLI Tool**: Command-line interface contract testing
- **Issue Tracker Service**: Issue management API contract validation

#### SPI-145: Contract Testing - Infrastructure Services (2 points)
- **Git Integration Service**: Repository operation contract testing

## Migration Plan

### Service-by-Service Adoption Strategy

#### Migration Order (Based on Dependencies)

1. **Shared Testing Framework** (SPI-139) - Foundation for all others
2. **Jest Standardization** (SPI-140) - Required for consistent execution
3. **AI Service Enhancement** (SPI-141.1) - Validate framework with existing tests
4. **Core Services** (SPI-141.2-3) - Build confidence with critical services
5. **API Gateway** (SPI-142.1) - Gateway affects all service integrations
6. **Remaining Services** (SPI-142.2-3, SPI-143, SPI-144, SPI-145) - Parallel implementation

#### Per-Service Migration Process

For each service package:

1. **Update Jest Configuration**
   ```bash
   # Install shared testing framework
   npm install --save-dev @cycletime/shared-testing
   
   # Replace jest.config.js with standardized version
   cp templates/jest.config.js packages/[service]/jest.config.js
   ```

2. **Create Contract Test Structure**
   ```bash
   mkdir -p packages/[service]/src/__tests__/contract
   touch packages/[service]/src/__tests__/contract/api-contract.test.ts
   touch packages/[service]/src/__tests__/contract/event-contract.test.ts
   ```

3. **Implement Contract Tests**
   ```typescript
   // Example contract test implementation
   import { ApiValidator, EventValidator } from '@cycletime/shared-testing';
   
   describe('[Service] Contract Tests', () => {
     const apiValidator = new ApiValidator('./openapi.yaml');
     const eventValidator = new EventValidator('./asyncapi.yaml');
     
     // Implement service-specific contract tests
   });
   ```

4. **Validate and Iterate**
   - Run contract tests: `npm run test:contract`
   - Verify coverage meets 80% threshold: `npm run test:coverage`
   - Address any specification inconsistencies

#### Migration Timeline

- **Week 1**: SPI-139 (Shared Framework) + SPI-140 (Jest Standardization)
- **Week 2**: SPI-141 (Core Services) - AI Service enhancement + Standards/Contract engines
- **Week 3**: SPI-142 (API & Routing) - Gateway, Project, Document services  
- **Week 4**: SPI-143, SPI-144, SPI-145 (Integration, Client, Infrastructure services)

### Risk Mitigation

#### Breaking Changes Prevention
- **Gradual rollout**: Migrate one service at a time with validation
- **Backward compatibility**: Maintain existing test execution during transition
- **Rollback plan**: Keep original Jest configs until framework validation complete

#### Test Reliability
- **Framework validation**: Extensive testing of shared framework before service migration
- **CI/CD integration**: Validate contract tests work reliably in GitHub Actions
- **Performance monitoring**: Ensure contract tests don't significantly impact CI build times

## Success Metrics

### Quantitative Metrics

**Coverage and Quality**:
- ✅ **100% contract testing coverage** across all 18+ packages
- ✅ **80% minimum test coverage** achieved and maintained
- ✅ **50% reduction in testing code duplication** through shared utilities

**Performance**:
- ✅ **Contract test execution under 2 minutes** per service
- ✅ **Total CI pipeline increase under 5 minutes** for all contract tests
- ✅ **Memory usage under 512MB** per contract test suite

**Adoption**:
- ✅ **18+ packages using shared framework** with consistent patterns
- ✅ **Zero configuration drift** between packages (validated via linting)
- ✅ **Developer onboarding time reduced by 25%** for testing practices

### Qualitative Metrics

**Developer Experience**:
- Contract tests are easy to write and maintain
- Framework documentation enables self-service adoption
- Error messages provide clear guidance for contract violations

**System Reliability**:
- Contract violations caught before production deployment
- Breaking changes detected automatically in CI/CD pipeline
- Cross-service integration issues prevented through contract validation

## CI/CD Integration Requirements

### TurboRepo Integration

#### Updated turbo.json Configuration

```json
{
  "tasks": {
    "test:contract": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "cache": true,
      "passThroughEnv": ["NODE_ENV"]
    },
    "test:all": {
      "dependsOn": ["test:contract", "test:unit", "test:integration"],
      "outputs": ["coverage/**"],
      "cache": true
    }
  }
}
```

**Task Dependencies**:
- `test:contract` depends on `build` to ensure shared packages are available
- No `^build` dependency needed since contract tests are schema-only with mocks
- Caching enabled for contract test results and coverage artifacts

### GitHub Actions Workflow Integration

#### Integration with Existing CI Pipeline

Add contract testing as a new parallel job to the existing `.github/workflows/ci.yml`:

```yaml
# Add to existing jobs section alongside unit-tests and integration-tests
contract-tests:
  name: Contract Tests
  runs-on: ubuntu-latest
  needs: [changes, build]
  if: needs.changes.outputs.docs-only != 'true'
  
  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '22'
        cache: 'npm'

    - name: Restore build artifacts
      uses: actions/cache@v4
      with:
        path: |
          node_modules
          packages/*/dist
          packages/*/node_modules/.cache
          .turbo
        key: build-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-${{ github.sha }}

    - name: Install dependencies (if cache miss)
      run: |
        if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
          echo "Cache miss detected, installing dependencies"
          npm ci
        else
          echo "Using cached dependencies"
        fi

    - name: Build packages (if needed)
      run: |
        if [ ! -d "packages/shared-testing/dist" ] || [ ! -d "packages/shared-utils/dist" ]; then
          echo "Building shared packages for contract tests"
          npm run build
        else
          echo "Shared packages already built"
        fi

    - name: Run contract tests
      run: |
        if [ "${{ github.event_name }}" = "pull_request" ]; then
          echo "Running contract tests for affected packages only"
          # Ensure we have the base branch for comparison
          git fetch origin ${{ github.event.pull_request.base.ref }}:refs/remotes/origin/${{ github.event.pull_request.base.ref }}
          npm run test:contract -- --filter="...[origin/${{ github.event.pull_request.base.ref }}]" --continue -- --maxWorkers=2
        else
          echo "Running all contract tests for push to main"
          npm run test:contract -- --continue -- --maxWorkers=2
        fi
      env:
        NODE_ENV: test

    - name: Upload coverage reports
      run: echo "Coverage reporting not yet configured - skipping for now"
      # TODO: Enable when test coverage is configured
      # uses: codecov/codecov-action@v4
      # with:
      #   token: ${{ secrets.CODECOV_TOKEN }}
      #   fail_ci_if_error: false
```

#### Key Integration Points

**Affected Package Filtering**:
- Contract tests use same PR optimization as unit/integration tests
- Only run contract tests for packages changed in PR
- Full contract test suite runs on main branch pushes

**Build Dependencies**:
- Contract tests require shared packages (`shared-testing`, `shared-utils`, `shared-types`) to be built
- Uses existing build artifact caching strategy
- No service dependencies (PostgreSQL/Redis) required - mock-only testing

**Performance Considerations**:
- Uses `maxWorkers=2` like other test jobs for consistent resource usage
- Runs in parallel with unit and integration tests for faster CI feedback
- Leverages TurboRepo caching for contract test results

### Quality Gates

**Pre-commit Validation**:
- Contract tests must pass before commit allowed (via git hooks)
- No contract specification violations permitted
- OpenAPI/AsyncAPI schema validation required

**Pull Request Validation**:
- Contract tests pass for all affected packages
- Contract compatibility validated across service boundaries  
- Integrated with existing docs-only change detection for performance

**Deployment Validation**:
- Contract tests pass for all services before staging deployment
- Contract specification versioning validated
- No live service dependencies ensure consistent test environment

## Monitoring and Alerting

### Contract Test Health Monitoring

**Metrics to Track**:
- Contract test execution time per service
- Contract test failure rate and common failure patterns
- Coverage percentage trends across services
- Framework adoption rate across packages

**Alerting Conditions**:
- Contract test failures in main branch
- Coverage drops below 80% threshold for any package
- Contract test execution time exceeds SLA (2 minutes per service)
- Framework version drift detected across packages

### Dashboard Integration

**Contract Testing Dashboard**:
- Real-time contract test status across all services
- Coverage trends and historical analysis
- Contract specification version compatibility matrix
- Performance metrics for contract test execution

## Appendix

### Dependencies and Versions

#### Shared Testing Framework Dependencies

```json
{
  "dependencies": {
    "ajv": "^8.12.0",
    "ajv-formats": "^2.1.1", 
    "@apidevtools/swagger-parser": "^10.1.0",
    "@asyncapi/parser": "^3.0.0",
    "supertest": "^6.3.3",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/supertest": "^2.0.12",
    "@types/js-yaml": "^4.0.5",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  }
}
```

#### Package Configuration Template

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathIgnorePatterns=contract",
    "test:contract": "jest --testPathPattern=contract",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch"
  },
  "devDependencies": {
    "@cycletime/shared-testing": "workspace:*"
  }
}
```

### Framework Extension Points

#### Custom Matchers

The framework provides extension points for package-specific contract validation:

```typescript
// packages/[service]/src/__tests__/setup.ts
import { extendContractMatchers } from '@cycletime/shared-testing';

extendContractMatchers({
  toMatchServiceSpecificContract: (received, expected) => {
    // Custom validation logic
  }
});
```

#### Performance Thresholds

Services can define custom performance requirements:

```typescript
// Contract test configuration
const performanceConfig = {
  responseTime: { max: 100, unit: 'ms' },
  throughput: { min: 10, unit: 'requests/second' },
  concurrency: { max: 1000, unit: 'concurrent_requests' }
};
```

---

**Next Steps**: Upon approval of this design document, implementation will begin with SPI-139 (Shared Contract Testing Framework & Utilities), followed by SPI-140 (Jest Configuration Standardization), and then parallel implementation of service-specific contract testing (SPI-141 through SPI-145).