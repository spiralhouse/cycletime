# Testing Strategy

## Overview

CycleTime follows a three-tier testing approach to ensure comprehensive coverage while maintaining test reliability and maintainability:

1. **Unit Tests** - Fast, isolated, no external dependencies
2. **Integration Tests** - Real components with controlled infrastructure
3. **System Tests** - End-to-end workflows with production-like conditions

## Test Categories

### Unit Tests
- **Purpose**: Test business logic in isolation
- **Speed**: < 10ms per test
- **Dependencies**: Mocked
- **Coverage Goal**: 100% of business logic

### Integration Tests
- **Purpose**: Test component interactions
- **Speed**: < 100ms per test
- **Dependencies**: Real database, controlled environment
- **Coverage Goal**: All component boundaries

### System Tests
- **Purpose**: Validate end-to-end workflows
- **Speed**: < 1s per test
- **Dependencies**: Production-like setup
- **Coverage Goal**: Critical user paths

## Running Tests

```bash
# Run all tests
./gradlew test

# Run unit tests only
./gradlew unitTest

# Run integration tests
./gradlew integrationTest

# Run system tests
./gradlew systemTest

# Run with coverage
./gradlew test koverHtmlReport

# Continuous testing
./gradlew testWatch --continuous
```

## Test Organization

```
src/test/kotlin/io/spiralhouse/cycletime/
├── unit/           # Fast, isolated tests
├── integration/    # Component interaction tests
├── system/         # End-to-end tests
├── fixtures/       # Test data and utilities
└── utils/          # Test helpers
```

## TDD Workflow

See [TDD Workflow Guide](tdd-workflow.md) for detailed Test-Driven Development practices.

## Parallel Testing

See [Parallel Development](parallel-development.md) for running tests in parallel across features.

## Local Testing

See [Local Testing Guide](local-testing.md) for development environment testing.

## Test Suites

See [Test Suites](test-suites.md) for specific test suite configurations.

## Best Practices

### Test Naming
```kotlin
class SessionManagerTest : StringSpec({
    "should expire sessions when maxAge exceeded" {
        // Test implementation
    }
})
```

### Test Isolation
- Each test gets fresh state
- No shared mutable data
- Clear setup and teardown

### Dependency Injection
- Use constructor injection
- Mock external dependencies
- Test with real DI container when appropriate

## Error Handling Testing

### HTTP Status Code Verification

When testing API routes, verify proper error handling and HTTP status codes:

#### Expected Status Codes
- **404 Not Found**: Resource doesn't exist (IssueNotFoundException, ProjectNotFoundException, etc.)
- **400 Bad Request**: Validation errors, business rule violations
- **422 Unprocessable Entity**: Invalid state transitions
- **500 Internal Server Error**: Only for true server errors (database failures, etc.)

#### Testing Error Scenarios

```kotlin
"GET /api/issues/{id} should return 404 for non-existent issue" {
    testApplication {
        configureTestApplication()
        val response = client.get("/api/issues/non-existent-id")
        response.status shouldBe HttpStatusCode.NotFound

        val error = response.body<ErrorResponse>()
        error.error shouldBe "Issue not found"
        error.timestamp shouldNotBe null
    }
}
```

### Global Error Handler

The application uses a global ErrorHandler that maps exceptions to HTTP status codes:

#### Exception Mappings
- `IssueNotFoundException` → 404 Not Found
- `ProjectNotFoundException` → 404 Not Found
- `WorkflowNotFoundException` → 404 Not Found
- `SessionNotFoundException` → 404 Not Found
- `ValidationException` → 400 Bad Request
- `BusinessRuleViolationException` → 400 Bad Request
- `HierarchyViolationException` → 400 Bad Request
- `CircularDependencyException` → 400 Bad Request
- `InvalidStatusTransitionException` → 422 Unprocessable Entity
- `Throwable` (catch-all) → 500 Internal Server Error

### Error Response Format

All error responses follow a consistent format:

```json
{
  "error": "User-friendly error message",
  "details": "Specific error details",
  "timestamp": "2025-09-27T12:00:00Z"
}
```

### Security Considerations
- Never expose stack traces in production
- Log detailed errors server-side for debugging
- Use generic messages for 500 errors
- Include correlation IDs for tracking

### Time Handling
```kotlin
interface TimeProvider {
    fun now(): Instant
}

// In tests
val mockTimeProvider = MockTimeProvider()
mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))
```

## Coverage Requirements

- **Unit Tests**: Minimum 80% coverage
- **Integration Tests**: Cover all API endpoints
- **System Tests**: Cover critical workflows

## CI/CD Integration

Tests run automatically in the CI/CD pipeline:

1. **PR Checks**: All tests must pass
2. **Main Branch**: Full test suite + coverage
3. **Release**: Additional system tests

## Performance Benchmarks

| Test Type | Target Speed | Actual Speed |
|-----------|-------------|--------------|
| Unit | < 10ms | ~5ms |
| Integration | < 100ms | ~50ms |
| System | < 1s | ~500ms |
| Full Suite | < 30s | ~15s |

## Related Documentation

- [Testing Standards](.claude/shared/testing-standards.md)
- [Development Setup](../development/setup.md)
- [CI/CD Pipeline](../ci-cd/overview.md)