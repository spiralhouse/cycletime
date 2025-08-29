# Enhanced Dependency Injection System

## Overview

The enhanced DI system provides a robust, type-safe dependency injection framework with the following features:

- **Explicit Scoping**: Singleton, Factory, and Request scopes
- **Lazy Initialization**: Dependencies created only when needed
- **Circular Dependency Detection**: Compile-time and runtime validation
- **Profile-Based Configuration**: Dev, Test, and Prod profiles
- **Module System**: Organized configuration by architectural layer
- **Decorator Support**: Add cross-cutting concerns without modifying code
- **Performance Optimized**: Caching and efficient resolution

## Architecture

### Core Components

1. **DIContainer**: The core container that manages dependencies
2. **DIModule**: Interface for organizing related dependencies
3. **DIConfiguration**: Central configuration management
4. **KtorDIAdapter**: Integration with Ktor's native DI

### Layer Organization (DDD)

```
Domain Layer (DomainModule)
    ├── TimeProvider
    └── Domain Services
    
Infrastructure Layer (InfrastructureModule)
    ├── Database
    ├── Repositories
    └── External Services
    
Application Layer (ApplicationModule)
    ├── Application Services
    └── Use Cases
    
MCP Layer (MCPModule)
    ├── Resource Providers
    ├── Tool Providers
    └── WebSocket Handlers
```

## Usage

### Basic Configuration

```kotlin
// In Application.kt
fun Application.module() {
    // Use enhanced DI with default modules
    configureEnhancedDI()
    
    // Or with custom configuration
    val config = ApplicationConfig.load("prod")
    configureEnhancedDI(config)
}
```

### Custom Modules

```kotlin
class CustomModule : AbstractDIModule() {
    override val name = "CustomModule"
    override val priority = 50
    
    override fun configureCommon(builder: DIContainer.Builder) {
        builder.singleton<MyService, MyServiceImpl>()
    }
    
    override fun configureProd(builder: DIContainer.Builder) {
        builder.decorate<MyService> { service ->
            LoggingDecorator(service)
        }
    }
}

// Use the custom module
configureEnhancedDI(modules = listOf(CustomModule()))
```

### Testing

```kotlin
class MyServiceTest : StringSpec({
    
    "should test with mock dependencies" {
        val container = testContainer {
            override<TimeProvider> { FixedTimeProvider(...) }
            override<Database> { mockDatabase }
        }
        
        val service = container.resolve<MyService>()
        // Test the service
    }
})
```

### Scoping

```kotlin
DIContainer.builder()
    .singleton<DatabaseService, DatabaseServiceImpl>()  // One instance
    .factory<RequestHandler, RequestHandlerImpl>()      // New instance each time
    .lazy<ExpensiveService, ExpensiveServiceImpl>()     // Created on first use
    .build()
```

### Decorators

```kotlin
builder.decorate<ProjectRepository> { repo ->
    CachingDecorator(repo)
}

builder.decorate<ApplicationService>(order = 1) { service ->
    LoggingDecorator(service)
}

builder.decorate<ApplicationService>(order = 2) { service ->
    MetricsDecorator(service)
}
```

## Migration Guide

### From Legacy DI

1. **Enable Enhanced DI**:
   ```bash
   export USE_ENHANCED_DI=true
   ```

2. **Update Configuration**:
   ```kotlin
   // Old
   configureDependencies()
   
   // New
   configureEnhancedDI()
   ```

3. **Custom Dependencies**:
   ```kotlin
   // Old
   dependencies {
       provide<MyService> { MyServiceImpl() }
   }
   
   // New
   class MyModule : AbstractDIModule() {
       override fun configureCommon(builder: DIContainer.Builder) {
           builder.singleton<MyService, MyServiceImpl>()
       }
   }
   ```

## Best Practices

1. **Use Interfaces**: Always depend on interfaces, not implementations
2. **Module Organization**: One module per architectural layer
3. **Scope Appropriately**: Use singleton for stateless services, factory for stateful
4. **Validate Early**: Call `container.validate()` to catch issues at startup
5. **Test with Mocks**: Use `testContainer` DSL for easy test setup

## Performance Considerations

- **Singleton Caching**: Singletons are cached after first creation
- **Lazy Loading**: Use lazy initialization for expensive dependencies
- **Circular Detection**: O(n) detection during validation, not resolution
- **Resolution Speed**: Sub-millisecond for cached singletons

## Troubleshooting

### Common Issues

1. **CircularDependencyException**
   - Check constructor dependencies
   - Consider using lazy initialization or factory pattern

2. **DependencyNotFoundException**
   - Ensure the type is registered in a module
   - Check module priority and ordering

3. **MissingDependencyException**
   - Register all constructor parameter types
   - Use factory lambdas for complex construction

### Debug Mode

Enable debug logging:
```kotlin
DIConfiguration.initialize(Profile.DEV)
val container = DIConfiguration.getContainer()
container.validate() // Logs all issues
```

## Future Enhancements

- Request scope for HTTP request-scoped dependencies
- Auto-discovery of modules via classpath scanning
- Configuration hot-reload in development
- Metrics and monitoring integration
- Compile-time dependency validation with KSP