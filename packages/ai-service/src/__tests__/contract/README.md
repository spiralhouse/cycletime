# Contract Testing Suite

This directory contains contract tests for the AI Service API and event specifications, implementing SPI-130 requirements.

## Overview

Contract tests validate that the HTTP API stubs and event handlers conform to their OpenAPI and AsyncAPI specifications, ensuring reliable integration for parallel development.

## Test Suites

### HTTP API Contract Tests (`http-api-contract.test.ts`)
- **OpenAPI specification validation** - Verifies spec compliance
- **Endpoint availability testing** - Tests all 17 API endpoints respond correctly
- **Request/response schema validation** - Validates JSON schemas against OpenAPI spec
- **Error response validation** - Ensures standardized error format
- **Authentication contract testing** - Validates Bearer token handling
- **Content-type and header validation** - Checks HTTP headers compliance

### Event Contract Tests (`event-contract.test.ts`)
- **AsyncAPI specification validation** - Verifies event schema compliance
- **Published event schema validation** - Tests 25 published event types
- **Consumed event schema validation** - Tests 6 consumed event types
- **Event correlation tracking** - Validates correlation ID handling
- **Message broker integration** - Tests Redis and in-memory broker support

### Performance Contract Tests (`performance-contract.test.ts`)
- **Response time validation** - Ensures <100ms for stub operations
- **Mock processing timing** - Validates 2-30s simulation for AI requests
- **Concurrent operation support** - Tests 1000+ concurrent operations
- **Memory and resource validation** - Monitors resource usage
- **Throughput validation** - Ensures minimum 10 requests/second

### Integration Contract Tests (`integration-contract.test.ts`)
- **Service discovery integration** - Health checks and metrics endpoints
- **API Gateway routing validation** - CORS, headers, rate limiting
- **Message broker integration** - Event publishing and subscription
- **Cross-service communication** - Inter-service API contracts
- **Load balancer health checks** - Fast, consistent health responses

## Running Contract Tests

```bash
# Run all tests (unit + contract)
npm run test:all

# Run only contract tests
npm run test:contract

# Run specific contract test suite
npx jest src/__tests__/contract/http-api-contract.test.ts

# Run contract tests with coverage
npm run test:contract -- --coverage
```

## Test Configuration

Contract tests use extended timeouts (30 seconds) to accommodate:
- AI request processing simulation (2-30 seconds)
- Concurrent operation testing
- Performance baseline measurements

## Dependencies

Contract testing requires these additional dependencies:
- `supertest` - HTTP endpoint testing
- `ajv` + `ajv-formats` - JSON schema validation
- `swagger-parser` - OpenAPI specification validation
- `js-yaml` - YAML specification parsing

## Success Criteria

All contract tests must pass for SPI-130 completion:

### HTTP API Contract Validation
- ✅ All 17 API endpoints are available and respond correctly
- ✅ Response schemas match OpenAPI specification
- ✅ Error responses follow standardized format
- ✅ Authentication contracts work with Bearer tokens

### Event Contract Validation  
- ✅ All published events (25) validate against AsyncAPI schemas
- ✅ All consumed events (6) validate against AsyncAPI schemas
- ✅ Event correlation works across request lifecycle
- ✅ Message broker integration supports Redis + memory fallback

### Performance Contract Validation
- ✅ Stub operations respond within 100ms
- ✅ AI processing simulation takes 2-30 seconds
- ✅ System supports 1000+ concurrent operations
- ✅ Memory usage remains stable under load

### Integration Contract Validation
- ✅ Service discovery endpoints provide correct health/metrics
- ✅ API Gateway routing works with standard headers
- ✅ Cross-service communication follows API contracts
- ✅ Load balancer health checks are fast and consistent

## Troubleshooting

### Common Issues

1. **Test timeouts**: Increase Jest timeout for performance tests
2. **Schema validation failures**: Check OpenAPI/AsyncAPI spec updates
3. **Port conflicts**: Tests use random ports to avoid conflicts
4. **Memory broker vs Redis**: Tests use memory broker for reliability

### Debug Mode

Run tests with debug logging:
```bash
DEBUG=ai-service:* npm run test:contract
```

### Performance Issues

If performance tests fail:
1. Check system load during test execution
2. Verify no other services are using test ports
3. Consider adjusting concurrency limits for CI environments

## Integration with CI/CD

Contract tests should run on:
- Every pull request
- Before deployment to staging/production
- When OpenAPI/AsyncAPI specifications change

Example CI configuration:
```yaml
- name: Run Contract Tests
  run: |
    npm install
    npm run build
    npm run test:contract
```

## Monitoring and Alerting

Contract test failures indicate:
- Breaking changes to API specifications
- Performance regressions below SLA requirements
- Integration issues with dependent services

Set up alerts for contract test failures in CI/CD pipeline.