# Dependency Injection

This directory contains the dependency injection configuration for CycleTime, using Ktor's native DI solution exclusively.

## Overview

The DI system has been simplified to leverage Ktor's built-in `ktor-server-di` plugin without any custom container implementation. This provides:

- **Simplicity**: Direct use of Ktor's `dependencies` block
- **Explicit Configuration**: No profiles, just explicit parameters
- **Test Support**: Easy mocking and override capabilities
- **Type Safety**: Compile-time dependency resolution

## Structure

```
di/
├── Dependencies.kt        # Main DI configuration
├── MCPDependencies.kt     # MCP-specific dependencies
└── modules/
    └── test/
        └── TestSupport.kt  # Test helpers
```

## Usage

### Basic Configuration

In your `Application.kt`:

```kotlin
fun Application.module() {
    // Initialize database singleton for production use
    DatabaseFactory.init(
        jdbcUrl = "jdbc:h2:file:./cycletime;MODE=PostgreSQL",
        enableLogging = false
    )

    // Configure dependencies (uses DatabaseFactory singleton internally)
    configureDependencies(
        timeProvider = null, // Use default SystemTimeProvider
        includeMCP = true
    )
}
```

### Accessing Dependencies

Use Ktor's property delegation:

```kotlin
// In Application scope
val projectService: ProjectApplicationService by application.dependencies
val timeProvider: TimeProvider by application.dependencies

// In routing
routing {
    get("/projects") {
        val projectService: ProjectApplicationService by application.dependencies
        // Use the service
    }
}
```

### Test Configuration

For tests, use the test support utilities:

```kotlin
testApplication {
    application {
        // Configure with test database and fixed time
        val testDb = TestDatabaseFactory.createTestDatabase()
        val testTime = testTimeProvider("2024-01-01T00:00:00Z")

        configureForTesting(
            database = testDb,
            timeProvider = testTime
        )
    }

    // Access dependencies in test
    val service: ProjectApplicationService by application.dependencies
}
```

For integration tests that need to test production DI setup:

```kotlin
// Special case: DependencyInjectionIntegrationTest only
beforeSpec {
    DatabaseFactory.init(
        jdbcUrl = "jdbc:h2:mem:test_${System.nanoTime()}",
        driver = "org.h2.Driver",
        enableLogging = false
    )
}

afterSpec {
    DatabaseFactory.reset()
}
```

### Custom Overrides

You can override specific dependencies in tests:

```kotlin
testApplication {
    application {
        configureTestDependencies {
            // Override specific dependency
            provide<MyService> { MockMyService() }
        }
    }
}
```

## Configuration Approach

The system uses explicit configuration without profiles:

- **Database**: Passed explicitly as a parameter
- **TimeProvider**: Optional override for testing (defaults to SystemTimeProvider)
- **MCP Components**: Optional via `includeMCP` flag

## Architecture

This DI system leverages Ktor's built-in dependency injection without custom containers or complex abstractions. Key changes:

1. **No Custom Container**: Use Ktor's native DI directly
2. **No Module Classes**: Dependencies configured in simple functions
3. **No Decorators**: Use simple wrapper classes if needed
4. **No Priority System**: Dependencies registered in order
5. **No Circular Detection**: Ktor handles this automatically

## Benefits

- **Less Code**: ~80% reduction in DI infrastructure code
- **Easier Testing**: Simple override mechanism
- **Better IDE Support**: Standard Ktor patterns
- **Faster Startup**: No complex validation or building
- **Maintainable**: Standard Kotlin/Ktor idioms