# JCVD Project Structure

## Overview

This document defines the repository structure for JCVD, a **simplified data and
context provider** for Claude Code project management. The system provides
structured project data, dependency tracking, and cross-session continuity
through embedded database (currently SQLite, migrating to H2) and MCP Resource integration.

## Root Directory Structure

```
jcvd/                                    # Root project directory
├── README.md                            # Project overview and quick start
├── LICENSE                              # MIT License
├── CLAUDE.md                            # Claude Code instructions and agent configuration
├── PROJECT_STRUCTURE.md                 # This document
├── DEVELOPMENT_GUIDE.md                 # Development setup and workflow guide
├── SESSION_SUMMARY.md                   # Development session notes
├── TEST_PLAN_PARALLEL_TDD.md           # Test planning documentation
├── build.gradle.kts                     # Gradle build configuration
├── settings.gradle.kts                  # Gradle project settings
├── gradle.properties                    # Gradle properties
├── gradlew                              # Gradle wrapper script (Unix)
├── gradlew.bat                          # Gradle wrapper script (Windows)
├── Dockerfile                           # Docker container definition
├── jcvd.db                             # SQLite database file (auto-created)
├── .gitignore                           # Git ignore patterns
├── .editorconfig                        # Editor configuration
│
├── gradle/                              # Gradle wrapper and dependencies
│   ├── libs.versions.toml              # Centralized dependency versions
│   └── wrapper/                        # Gradle wrapper JAR and properties
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties
│
├── config/                              # Configuration files
│   ├── detekt/                         # Static code analysis
│   │   └── detekt.yml
│   └── dependency-check/               # Security vulnerability checking
│       └── suppressions.xml
│
├── docs/                                # Documentation
│   ├── ARCHITECTURE.md                  # System architecture and principles
│   ├── PRD.md                          # Product requirements document
│   ├── USER_EXPERIENCE.md              # User workflows and experience design
│   ├── ONBOARDING.md                   # Project integration patterns
│   ├── LIMITATIONS.md                  # Scope boundaries and restrictions
│   ├── MCP_RESOURCES.md                # MCP Resources specification
│   ├── SESSION_MANAGEMENT.md           # Session management documentation
│   ├── REPOSITORY_USAGE.md             # Repository pattern usage
│   ├── TDD_WORKFLOW.md                 # Test-driven development guide
│   ├── PARALLEL_DEVELOPMENT.md         # Parallel development workflows
│   └── technical-design/               # Technical design documents
│       ├── application-service-patterns.md
│       ├── configuration-management.md
│       ├── dependency-injection-patterns.md
│       ├── domain-entities.md
│       ├── mcp-integration-patterns.md
│       ├── repository-pattern.md
│       └── testing-architecture-tdd.md
│
├── src/                                 # Source code
│   ├── main/                          # Main source code
│   │   ├── kotlin/io/spiralhouse/jcvd/ # Kotlin source files
│   │   │   ├── Application.kt         # Main entry point and Ktor server
│   │   │   ├── domain/                # Domain layer (pure business logic)
│   │   │   │   ├── entities/         # Domain entities
│   │   │   │   │   ├── Issue.kt
│   │   │   │   │   ├── Project.kt
│   │   │   │   │   └── Session.kt
│   │   │   │   ├── exceptions/       # Domain exceptions
│   │   │   │   │   └── DomainException.kt
│   │   │   │   ├── repositories/     # Repository interfaces
│   │   │   │   │   ├── IssueRepository.kt
│   │   │   │   │   ├── ProjectRepository.kt
│   │   │   │   │   ├── SessionRepository.kt
│   │   │   │   │   └── UnitOfWork.kt
│   │   │   │   ├── services/         # Domain services
│   │   │   │   │   └── TimeProvider.kt
│   │   │   │   └── valueobjects/     # Value objects
│   │   │   │       ├── IssueId.kt
│   │   │   │       ├── IssueStatus.kt
│   │   │   │       ├── IssueType.kt
│   │   │   │       ├── ProjectId.kt
│   │   │   │       ├── ProjectStatus.kt
│   │   │   │       └── SessionKey.kt
│   │   │   ├── infrastructure/        # Infrastructure layer
│   │   │   │   ├── database/         # Database configuration
│   │   │   │   │   ├── DatabaseConfig.kt
│   │   │   │   │   └── Tables.kt     # Exposed ORM table definitions
│   │   │   │   ├── di/               # Dependency injection
│   │   │   │   │   └── KoinModules.kt
│   │   │   │   └── persistence/      # Repository implementations
│   │   │   │       ├── ExposedIssueRepository.kt
│   │   │   │       ├── ExposedProjectRepository.kt
│   │   │   │       └── ExposedSessionRepository.kt
│   │   │   └── mcp/                   # MCP server integration
│   │   │       └── MCPServer.kt      # MCP protocol implementation
│   │   └── resources/                 # Resources
│   │       ├── application.conf       # Ktor configuration
│   │       └── META-INF/              # Metadata
│   │           └── native-image/      # GraalVM native image configs
│   │               ├── native-image.properties
│   │               ├── reflect-config.json
│   │               ├── resource-config.json
│   │               └── serialization-config.json
│   └── test/                          # Test source code
│       ├── kotlin/io/spiralhouse/jcvd/ # Test files
│       └── resources/                 # Test resources
│
├── examples/                           # Example configurations
│   └── quick-start/                    # Getting started examples
│       └── basic-workflow.json         # Basic workflow example
│
├── build/                              # Build output (gitignored)
│   ├── classes/                       # Compiled classes
│   ├── libs/                          # Built JAR files
│   └── reports/                       # Test and analysis reports
│
└── .claude/                            # Claude Code specific configuration
    └── shared/                         # Shared configuration files
        ├── development-commands.md
        ├── git-conventions.md
        ├── linear-reference.md
        ├── parallel-development-detection.md
        └── testing-standards.md
```

## Architecture Principles

### Domain-Driven Design

- **Rich domain models** with business logic encapsulation
- **Layered architecture** with clear separation of concerns
- **Repository pattern** for data access abstraction
- **Value objects** for type safety and validation

### Technology Stack

- **Kotlin/JVM 21** as primary language
- **Ktor 3.2.0** for asynchronous web framework
- **Exposed ORM** for type-safe database operations
- **SQLite** (current) / **H2** (future) embedded database
- **Koin 4.0** for dependency injection (migrating to Ktor native DI)
- **GraalVM** for native image compilation

### Core Components

1. **Domain Layer** (`domain/`) - Pure business logic with no external dependencies
2. **Infrastructure Layer** (`infrastructure/`) - Technical implementations
3. **MCP Server** (`mcp/`) - Integration with Claude Code via Model Context Protocol
4. **Application Layer** (future) - Use case orchestration when needed

## Package and File Naming Conventions

### Kotlin Files

- **PascalCase** for classes and interfaces: `Project.kt`, `IssueRepository.kt`
- **PascalCase** for value objects: `ProjectId.kt`, `IssueStatus.kt`
- **Package names** in lowercase: `io.spiralhouse.jcvd.domain.entities`

### Configuration Files

- **kebab-case** for YAML/TOML: `detekt.yml`, `libs.versions.toml`
- **dot notation** for properties: `gradle.properties`, `application.conf`

### Test Files

- **Same as source + Test suffix**: `ProjectTest.kt`, `SessionManagerIntegrationTest.kt`
- **Package mirrors source**: `io.spiralhouse.jcvd.domain.entities` in test folder

### Documentation Files

- **SCREAMING_SNAKE_CASE** for root docs: `README.md`, `ARCHITECTURE.md`
- **kebab-case** for technical designs: `repository-pattern.md`, `mcp-integration-patterns.md`

## Module Organization Principles

### 1. Domain-Driven Structure

- **Domain layer** contains all business logic and rules
- **Infrastructure layer** provides technical implementations
- **Clear boundaries** between layers with dependency inversion

### 2. Package Structure

```
io.spiralhouse.jcvd/
├── domain/           # Core business logic (no external dependencies)
│   ├── entities/     # Aggregate roots and entities
│   ├── valueobjects/ # Immutable value objects
│   ├── repositories/ # Repository interfaces
│   ├── services/     # Domain services
│   └── exceptions/   # Domain-specific exceptions
├── application/      # Application services (future)
│   ├── commands/     # Command DTOs
│   └── services/     # Use case orchestration
├── infrastructure/   # Technical implementations
│   ├── database/     # Database configuration
│   ├── persistence/  # Repository implementations
│   └── di/          # Dependency injection
└── mcp/             # MCP server integration
    ├── resources/    # MCP Resources
    └── tools/       # MCP Tools
```

### 3. Dependency Rules

- **Domain layer** has no dependencies on other layers
- **Infrastructure layer** depends on domain layer
- **MCP layer** depends on domain and infrastructure layers
- **Dependency injection** wires everything together

## Import Strategy

### Standard Imports

```kotlin
// Domain imports
import io.spiralhouse.jcvd.domain.entities.Project
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import io.spiralhouse.jcvd.domain.repositories.ProjectRepository

// Infrastructure imports
import io.spiralhouse.jcvd.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.jcvd.infrastructure.database.Tables

// Kotlin/Java imports
import kotlinx.coroutines.runBlocking
import java.time.Instant
```

### Dependency Injection

```kotlin
// Using Koin (current)
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

// Future Ktor native DI
import io.ktor.server.application.*
import io.ktor.server.di.*
```

## Development Workflow Integration

### Build and Run

```bash
# Build the project
./gradlew build

# Run the application
./gradlew run

# Build fat JAR
./gradlew buildFatJar

# Build native image
./gradlew nativeCompile
```

### Testing

```bash
# Run all tests
./gradlew test

# Run with coverage
./gradlew koverHtmlReport

# Static analysis
./gradlew detekt
```

### Docker Deployment

```bash
# Build Docker image
docker build -t jcvd-kotlin .

# Run container
docker run -p 8080:8080 jcvd-kotlin
```

## Database Architecture

### Current: SQLite with Exposed ORM

- **Embedded database** for zero-dependency operation
- **Exposed DSL** for type-safe queries
- **HikariCP** connection pooling
- **File-based persistence** at `jcvd.db`

### Future: H2 Database (SPI-439)

- **Better JVM integration** with native JDBC
- **Improved performance** for complex queries
- **In-memory option** for testing
- **PostgreSQL compatibility mode** for cloud migration

### Data Models

- **Projects**: Basic project metadata and configuration
- **Issues**: Epic → Story → Subtask hierarchy  
- **Sessions**: Cross-session state management
- **Dependencies**: Simple blocking relationships
- **Workflow States**: Status tracking for issues

## Key Design Decisions

### 1. Kotlin/JVM Migration

The migration from TypeScript to Kotlin provides:

- **Better type safety** with null safety and sealed classes
- **Native JVM performance** and ecosystem integration
- **Coroutines** for efficient async operations
- **Domain-Driven Design** patterns natural in Kotlin

### 2. Exposed ORM Choice

- **Type-safe DSL** prevents SQL injection and runtime errors
- **Kotlin-first design** with excellent IDE support
- **Lightweight** compared to Hibernate/JPA
- **Good fit** for domain-driven design patterns

### 3. Embedded Database Strategy

- **Zero external dependencies** for core functionality
- **High performance** for typical project sizes
- **Complete offline operation**
- **Easy migration path** to cloud databases when needed

### 4. MCP Integration Approach

- **Native integration** with Claude Code ecosystem
- **Resource exposure** for project context
- **Tool provision** for basic operations
- **No complex orchestration** - leverages Claude Code's capabilities

## Scope Boundaries

### ✅ What JCVD Does

- **Data Storage**: Embedded database for project data
- **Context Provision**: MCP Resources exposing project information
- **Domain Logic**: Rich business rules and invariants
- **State Persistence**: Cross-session continuity
- **Type Safety**: Strong typing throughout the application

### ❌ What JCVD Does NOT Do

- **Complex Analysis**: No LLM-powered analysis or recommendations
- **Agent Coordination**: No multi-agent orchestration
- **Workflow Automation**: No automated task progression
- **Advanced UI**: No web dashboards or graphical interfaces

## Testing Strategy

### Test Organization

```
src/test/kotlin/io/spiralhouse/jcvd/
├── unit/           # Fast, isolated unit tests
├── integration/    # Integration tests with real components
├── system/         # End-to-end system tests
├── fixtures/       # Test data and utilities
└── utils/          # Test helpers and mocks
```

### Testing Frameworks

- **Kotest** for BDD-style testing
- **MockK** for mocking
- **Ktor Test Host** for HTTP testing
- **Kotlinx Coroutines Test** for async testing

### Coverage Goals

- **>85% test coverage** for domain layer
- **Integration tests** for all repository implementations
- **Error scenario testing** for robust error handling
- **MCP protocol testing** for Claude Code compatibility

## Future Growth Patterns

### Provider Expansion

- **H2 Database** (SPI-439) for better JVM integration
- **Linear Provider** for team collaboration
- **GitHub Issues** for OSS projects
- **Provider interface** for consistent API

### Architecture Evolution

- **Application Services** layer when use cases grow complex
- **CQRS pattern** if read/write patterns diverge
- **Event sourcing** for audit trails if needed
- **Hexagonal architecture** fully realized as complexity grows

### MCP Resources Expansion

- **New resource types** as demand requires
- **Enhanced context provision** without complex analysis
- **Performance optimizations** for larger projects
- **Streaming updates** via Server-Sent Events

This structure supports JCVD's vision as a **focused, reliable data and context
provider** built with Domain-Driven Design principles, providing a solid foundation
for future growth while maintaining simplicity and type safety through Kotlin/JVM.