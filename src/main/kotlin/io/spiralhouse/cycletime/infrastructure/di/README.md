# Dependency Injection

This directory contains the dependency injection configuration for CycleTime, using Ktor's native DI solution exclusively.

## Overview

The DI system has been simplified to leverage Ktor's built-in `ktor-server-di` plugin without any custom container implementation. This provides:

- **Simplicity**: Direct use of Ktor's `dependencies` block
- **Profile Support**: Dev/Test/Prod configurations
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
    // Configure dependencies with default profile (dev)
    configureDependencies()
    
    // Or specify a profile
    configureDependencies(timeProvider = null)
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
        // Configure with test profile and fixed time
        val testTime = testTimeProvider("2024-01-01T00:00:00Z")
        configureTestDependencies(testTime)
    }
    
    // Access dependencies in test
    val service: ProjectApplicationService by application.dependencies
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

## Profiles

The system supports three profiles:

- **DEV**: Development configuration with standard database
- **TEST**: Test configuration with in-memory H2 database
- **PROD**: Production configuration (same as DEV currently)

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