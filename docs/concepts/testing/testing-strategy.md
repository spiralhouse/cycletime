---
title: "Testing Strategy"
type: concept
domain: [testing]
description: "Three-tier testing approach ensuring comprehensive coverage, reliability, and maintainability"
dependencies: []
related: [test-architecture.md]
keywords: [testing, strategy, unit, integration, system, coverage]
audience: [developers, qa-engineers, architects]
last_updated: 2025-10-19
---

# Testing Strategy

## What is CycleTime's Testing Strategy?

CycleTime follows a **three-tier testing approach** that balances comprehensive coverage with fast feedback cycles and maintainability. This strategy ensures high-quality, reliable code through systematic testing at multiple levels of the application stack.

The three tiers are:

1. **Unit Tests** (70% of tests) - Fast, isolated tests of business logic
2. **Integration Tests** (25% of tests) - Component interaction tests with real infrastructure
3. **System Tests** (5% of tests) - End-to-end workflows under production-like conditions

This distribution, often visualized as a testing pyramid, maximizes feedback speed while ensuring comprehensive validation of the system's behavior.

## Why Does It Matter?

### Rapid Feedback During Development

Unit tests execute in milliseconds, providing immediate feedback during the development cycle. Developers get instant validation of business logic changes without waiting for database initialization or external service calls. This tight feedback loop accelerates the RED-GREEN-REFACTOR cycle of Test-Driven Development (TDD).

### Confidence in Component Interactions

Integration tests validate that components work together correctly when integrated with real infrastructure like databases and HTTP clients. These tests catch issues that mocks cannot detect, such as SQL query errors, serialization problems, or connection pooling bugs.

### Production Readiness Validation

System tests exercise complete workflows under production-like conditions, validating performance characteristics, error handling, and resilience. These tests ensure the system behaves correctly under load and handles failure scenarios gracefully.

### Maintainability and Refactoring Safety

Comprehensive test coverage at all levels creates a safety net for refactoring. Developers can confidently restructure code knowing that breaking changes will be caught immediately by the appropriate test tier.

## Key Principles

### Test Pyramid Distribution

The **70-25-5 distribution** reflects the optimal balance between speed, coverage, and maintenance:

- **Unit tests** are cheap to write and fast to run, so they dominate the test suite
- **Integration tests** are more expensive but essential for validating component boundaries
- **System tests** are slowest and most fragile, so they focus only on critical end-to-end paths

### Test Isolation

Each test runs independently without shared mutable state. Tests must pass in any order, enabling parallel execution and preventing cascading failures. Isolation is achieved through:

- Fresh database instances per test (integration)
- Mock providers for external dependencies (unit)
- Proper lifecycle management with `beforeEach`/`afterEach` hooks

### Deterministic Results

Tests produce consistent results regardless of external factors like time, network latency, or system load. Determinism is ensured by:

- **TimeProvider interface** for controllable time in tests
- **In-memory databases** for consistent state
- **Mocked external services** to eliminate network variability

### Fast Execution

Speed enables frequent test execution during development:

- **Unit tests**: < 10ms per test, < 30s total suite
- **Integration tests**: < 100ms per test, < 3min total suite
- **System tests**: < 1s per test, < 10min total suite

### Clear Test Responsibilities

Each test tier has a distinct responsibility:

- **Unit tests** verify business logic correctness
- **Integration tests** validate component integration
- **System tests** confirm production-ready behavior

## Test Organization

### Source Set Separation

Tests are physically separated by Gradle source sets:

```
src/
├── test/kotlin/              # Unit tests only
│   └── io/spiralhouse/cycletime/
│       ├── domain/           # Domain logic tests
│       ├── mcp/protocol/     # MCP protocol tests
│       └── mcp/tools/        # MCP tool handler tests
├── integrationTest/kotlin/   # Integration tests
│   └── io/spiralhouse/cycletime/
│       ├── infrastructure/   # Infrastructure tests
│       ├── mcp/integration/  # MCP server integration
│       └── api/              # API endpoint tests
└── systemTest/kotlin/        # System tests
    └── io/spiralhouse/cycletime/
        └── performance/      # Performance baselines
```

This physical separation provides:

- **Clear intent**: Test type immediately visible from file location
- **IDE recognition**: IntelliJ automatically identifies test roots
- **Simplified execution**: Run specific test tiers without complex filters
- **Better caching**: Gradle incremental compilation works effectively

### Test Categorization Rules

**Unit Tests** (`src/test/kotlin/`):
- No external dependencies (database, network, file system)
- Fast execution (< 10ms per test)
- Business logic, domain models, protocol handlers, tool handlers
- Use mocks/fakes for all external dependencies

**Integration Tests** (`src/integrationTest/kotlin/`):
- Real infrastructure components (database, HTTP clients)
- Moderate execution time (< 100ms per test)
- Repository patterns, API endpoints, infrastructure integration
- Controlled test environment (test databases, embedded servers)

**System Tests** (`src/systemTest/kotlin/`):
- End-to-end workflows, performance testing
- Longer execution time (< 1s per test)
- Production-like scenarios, load testing, performance baselines
- Full system integration

## Coverage Requirements

### Coverage Goals

- **Unit Tests**: Minimum 80% line coverage, 95% for domain layer
- **Integration Tests**: All public API endpoints and repository methods
- **System Tests**: All critical user workflows

### Coverage Verification

The build enforces coverage thresholds through Gradle tasks:

```bash
./gradlew koverVerify  # Fails build if coverage below thresholds
./gradlew koverHtmlReport  # Generate HTML coverage report
```

Coverage is measured separately for each test tier to ensure appropriate distribution across the testing pyramid.

## Running Tests

### Local Development

```bash
# Run all tests
./gradlew test

# Run unit tests only (fastest feedback)
./gradlew unitTest

# Run integration tests
./gradlew integrationTest

# Run system tests
./gradlew systemTest

# Run with coverage
./gradlew test koverHtmlReport

# Continuous testing (auto-run on file changes)
./gradlew testWatch --continuous
```

### CI/CD Pipeline

Tests run automatically in the CI/CD pipeline with parallel execution:

```bash
# Parallel execution for faster CI builds
./gradlew ciTest

# Individual jobs for matrix parallelization
./gradlew ciUnitOnly
./gradlew ciIntegrationOnly
```

The pipeline enforces:

1. **PR Checks**: All tests must pass before merge
2. **Main Branch**: Full test suite + coverage verification
3. **Release**: Additional system tests + performance baselines

## Common Misconceptions

### "Integration tests are slow, so we should avoid them"

**Reality**: Integration tests are essential for validating component boundaries. While slower than unit tests, they catch critical issues that mocks cannot detect. The key is to keep them focused and use in-memory databases to maintain reasonable speed (< 100ms per test).

### "We need to test everything at the system level"

**Reality**: System tests are expensive, slow, and fragile. They should focus only on critical end-to-end paths. Most behavior should be validated at the unit and integration levels where tests are faster and more maintainable.

### "Mocking everything makes tests better"

**Reality**: Over-mocking leads to tests that validate implementation details rather than behavior. Unit tests should mock external dependencies, but integration tests should use real infrastructure components to catch actual integration issues.

### "Time-dependent tests require delays"

**Reality**: Tests should never use `delay()` or `Thread.sleep()`. Instead, inject a `TimeProvider` interface that can be mocked in tests to control time precisely without waiting.

## Related Concepts

- [Test Architecture](test-architecture.md) - How to design code for testability
- [Unit Test Pattern](../../patterns/testing/unit-test-pattern.md) - Implementing fast, isolated tests
- [Integration Test Pattern](../../patterns/testing/integration-test-pattern.md) - Testing with real infrastructure
- [System Test Pattern](../../patterns/testing/system-test-pattern.md) - End-to-end testing approach

## Next Steps

- **Understand testability**: Read [Test Architecture](test-architecture.md) to learn how to design testable code
- **Write unit tests**: See [Unit Test Pattern](../../patterns/testing/unit-test-pattern.md) for implementation guidance
- **Implement integration tests**: Follow [Integration Test Pattern](../../patterns/testing/integration-test-pattern.md) for database testing
- **Run tests locally**: Use [Local Testing Guide](../../testing/local-testing.md) for development workflows
