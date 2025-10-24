---
title: "Project Fundamentals"
type: reference
domain: [project-overview, architecture, configuration]
description: "Essential project knowledge shared across all agents and contributors"
keywords: [technology-stack, architecture, linear, package-structure, conventions]
dependencies: []
related: [../architecture/overview.md, ./PRD.md, ./user-experience.md]
last_updated: 2025-10-21
---

# Project Fundamentals

This document contains essential project information that all agents and contributors need to understand the CycleTime project. It provides the foundational knowledge for working effectively on any aspect of the system.

## Project Overview

CycleTime CE (Community Edition) is a project orchestration framework that extends Claude Code to manage complete software development lifecycles with minimal configuration overhead. The system provides structured project data, dependency tracking, and cross-session continuity through embedded database and MCP Resource integration.

**Current Status**: Kotlin/JVM implementation with Domain-Driven Design architecture, using H2 database with Exposed ORM.

## Technology Stack

### Core Technologies

- **Kotlin/JVM 21**: Primary implementation language
- **Ktor 3.3.0**: Asynchronous web framework for MCP server with native DI
- **Exposed ORM 0.61.0**: Type-safe SQL DSL for database operations
- **H2**: Embedded database (H2 migration completed in SPI-439)
- **Ktor Native DI**: Dependency injection using `ktor-server-di` plugin
- **GraalVM**: Native image compilation support

### MCP Integration

- **MCP Kotlin SDK v0.7.2**: Official SDK for Model Context Protocol
- **Maintainers**: Anthropic and JetBrains
- **Transport**: Ktor integration with SSE + JSON-RPC
- **Session Management**: Stateless per-request with database persistence
- **Migration**: Replaced custom EventBus transport (SPI-700/SPI-707)

### Testing Framework

- **Kotest**: Testing framework with spec-style tests
- **MockK**: Kotlin-friendly mocking library
- **Test Categorization**: Three-tier approach (Unit, Integration, System)
- **Test Source Sets**: Physically separated by type (`src/test/`, `src/integrationTest/`, `src/systemTest/`)

## Architecture Principles

### Domain-Driven Design (DDD)

The project follows DDD principles with:
- **Rich Domain Models**: Business logic encapsulated in domain entities
- **Ubiquitous Language**: Consistent terminology across code and documentation
- **Bounded Contexts**: Clear boundaries between system components
- **Aggregates**: Domain entity hierarchies with consistency boundaries

### Layered Architecture

Clean separation between architectural layers:

1. **Domain Layer**: Core business logic, entities, and value objects
2. **Application Layer**: Use cases and application services
3. **Infrastructure Layer**: Database, external services, technical concerns
4. **MCP Layer**: Model Context Protocol integration and transport

### Repository Pattern

- Abstracted data access through interfaces
- Separation between domain logic and persistence
- Interface-based design for testability
- Unit of Work pattern for transaction management

### Dependency Injection

Using Ktor native DI with:
- Constructor injection for explicit dependencies
- Interface-based design for flexibility
- Service registration in `Application.kt`
- Property delegation for dependency resolution

```kotlin
// Example DI registration
fun Application.configureDependencies() {
    dependencies {
        provide<TimeProvider> { SystemTimeProvider() }
        provide<Repository> { ExposedRepository(instance()) }
    }
}
```

## Package Structure

All code resides under the `io.spiralhouse.cycletime` namespace:

```
io.spiralhouse.cycletime/
├── domain/           # Domain entities, value objects
├── application/      # Application services, use cases
├── infrastructure/   # Database, repositories, external services
├── mcp/             # MCP protocol integration
│   ├── protocol/    # Protocol handlers
│   ├── server/      # MCP server infrastructure
│   ├── tools/       # Tool implementations
│   └── resources/   # Resource implementations
└── test/            # Test utilities and fixtures
```

## Linear Integration

### Team & Project Configuration

- **Team**: Spiral House
  - ID: `03ee7cf5-773e-4f53-bc0d-2e5e4d3bc3bc`
- **Project**: CycleTime
  - ID: `217eeb45-4f83-4ca0-8030-81f9c78692bc`

### Issue Status Workflow

| Status | ID | Type | Usage |
|--------|----|----- |-------|
| Backlog | `1e7bd879-6685-4d94-8887-b7709b3ae6e8` | backlog | Ideas and future work |
| Todo | `fc814d1f-22b5-4ce6-8b40-87c1312d54ba` | unstarted | Ready for development |
| In Progress | `a433a32b-b815-4e11-af23-a74cb09606aa` | started | Active development |
| In Review | `8d617a10-15f3-4e26-ad28-3653215c2f25` | started | Code review phase |
| Done | `3d267fcf-15c0-4f3a-8725-2f1dd717e9e8` | completed | Completed work |
| Canceled | `a2581462-7e43-4edb-a13a-023a2f4a6b1e` | canceled | Not pursuing |
| Duplicate | `3f7c4359-7560-4bd9-93b7-9900671742aa` | canceled | Duplicate of another issue |

### Issue Hierarchy

Three-tier structure:

1. **Epics** (Top Level)
   - High-level features or major project phases
   - No direct estimates
   - Contains multiple Stories

2. **Stories** (Middle Level)
   - User-facing functionality or complete features
   - Estimate ONLY when no subtasks exist
   - If subtasks exist: estimate = sum of subtask estimates
   - Parent: Epic

3. **Subtasks** (Bottom Level)
   - Specific implementation work items
   - **Always have estimates** (required)
   - Parent: Story

### Estimation Scale (Fibonacci)

Complexity-based estimation (not time-based):

- **1 point**: Trivial complexity (straightforward implementation)
- **2 points**: Simple complexity (well-understood requirements)
- **3 points**: Moderate complexity (some architectural decisions needed)
- **5 points**: Moderately complex (multiple integrations or significant logic)
- **8 points**: Complex (substantial architectural work or many unknowns)
- **13 points**: Highly complex (major feature, consider decomposition)

**Guidelines**:
- Target subtasks at 1-5 points for optimal sprint planning
- 8+ point tasks may need further breakdown
- Parent stories with subtasks should NOT have estimates

## Git Conventions

### Branch Naming

Follow trunk-based development:

- `feat/spi-XXX-description` - New features
- `fix/spi-XXX-description` - Bug fixes
- `release/vX.X.X` - Release branches
- `hotfix/description` - Emergency production fixes

**Rules**:
- Always work on feature branches, never commit directly to main
- Link branch names to Linear issue IDs
- Use descriptive kebab-case for description portion

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**: feat, fix, docs, style, refactor, test, chore, ci

## Development Commands

### Core Development

- `./gradlew run` - Start the application server
- `./gradlew build` - Build the project (compile + test)
- `./gradlew clean` - Clean build artifacts
- `./gradlew buildFatJar` - Build executable JAR with dependencies
- `./gradlew nativeCompile` - Compile to GraalVM native image

### Quality Assurance

- `./gradlew test` - Run unit tests
- `./gradlew integrationTest` - Run integration tests
- `./gradlew systemTest` - Run system tests
- `./gradlew testAll` - All test categories sequentially
- `./gradlew detekt` - Run static code analysis
- `./gradlew koverHtmlReport` - Generate test coverage report
- `./gradlew koverVerify` - Verify coverage meets thresholds
- `./gradlew check` - Run all quality checks

### Test Execution

Tests are organized by Gradle source set:

- **Unit Tests** (`src/test/kotlin/`): Fast, isolated, no external dependencies
- **Integration Tests** (`src/integrationTest/kotlin/`): Real components with controlled infrastructure
- **System Tests** (`src/systemTest/kotlin/`): End-to-end workflows

## Configuration Files

### Application Configuration

- **Location**: `src/main/resources/application.conf`
- **Format**: HOCON (Human-Optimized Config Object Notation)
- **Environment**: Variables override config values

### Database Configuration

- **Development**: H2 file-based database (`cycletime-ce.db`)
- **Testing**: H2 in-memory databases (isolated per test)
- **Schema**: Auto-created on first run via Exposed ORM

### MCP Configuration

- **Server Port**: 8080 (default)
- **Transport**: SSE (Server-Sent Events) with JSON-RPC
- **Session Timeout**: Configurable (default varies by environment)

## Documentation Structure

Following DAG (Directed Acyclic Graph) architecture optimized for RAG retrieval:

### Five Document Types

1. **Concepts** (`docs/concepts/`) - Foundational knowledge (what & why)
2. **Patterns** (`docs/patterns/`) - Implementation approaches (how)
3. **Examples** (`docs/examples/`) - Working code (concrete)
4. **Guides** (`docs/guides/`) - Step-by-step procedures
5. **Reference** (`docs/reference/`) - Quick lookups

### YAML Frontmatter

All documents include metadata:

```yaml
---
title: "Document Title"
type: concept|pattern|example|guide|reference
domain: [domain1, domain2]
description: "Brief description"
dependencies: [relative/path/to/prerequisite.md]
keywords: [keyword1, keyword2]
last_updated: YYYY-MM-DD
---
```

## Common Patterns

### Time-Mockable Architecture

All time-dependent code must be testable:

```kotlin
interface TimeProvider {
    fun now(): Instant
}

class SystemTimeProvider : TimeProvider {
    override fun now(): Instant = Clock.System.now()
}

// In production: SystemTimeProvider
// In tests: MockTimeProvider with controllable time
```

### Database Abstraction

```kotlin
interface DatabaseProvider {
    fun getConnection(): Database
    suspend fun <T> executeInTransaction(operation: suspend () -> T): T
}

// Services accept interfaces, not concrete implementations
class MyService(
    private val repository: MyRepository,  // Interface
    private val unitOfWork: UnitOfWork    // Interface
)
```

### Ktor Native DI

```kotlin
fun Application.configureDependencies() {
    dependencies {
        provide<ServiceInterface> { ServiceImplementation() }
    }
}

// Usage in routes or other components
val myService: MyService by application.dependencies
```

## Quality Standards

### Testing Requirements

- **Unit Tests**: 100% of business logic
- **Integration Tests**: All component interactions
- **System Tests**: Critical user workflows
- **Error Scenarios**: All error paths and edge cases

### Code Quality Gates

Before any code review:

- ✅ All time dependencies are injected (no `Instant.now()` in business logic)
- ✅ All database operations are testable (interfaces, not concrete classes)
- ✅ Resource cleanup is explicit (clear ownership and lifecycle)
- ✅ Tests are categorized correctly (unit/integration/system)
- ✅ No flaky time-dependent tests (use time mocking)
- ✅ Test isolation verified (tests pass in any order)

### Documentation Standards

- YAML frontmatter on all documentation
- Required fields: title, type, domain, description
- Dependencies declared for prerequisite topics
- Length guidelines enforced (concepts: 200-500 lines)
- No circular dependencies in topic graph

## Development Philosophy

### Test-Driven Development (TDD)

Red-Green-Refactor cycle:

1. **RED**: Write failing test that defines expected behavior
2. **GREEN**: Write minimum code to make test pass
3. **REFACTOR**: Improve code while keeping tests passing

### Configuration Over Code

- Prefer configuration files over hardcoded values
- Use environment variables for deployment-specific settings
- Keep business logic separate from configuration

### Single Responsibility Principle

- Each function/class should have one clear purpose
- Avoid mixing concerns (e.g., business logic + persistence)
- Clear separation of layers in architecture

## Related Documentation

For deeper understanding of specific areas:

- **Architecture**: [Architecture Overview](../architecture/overview.md)
- **Product Vision**: [Product Requirements](./PRD.md)
- **User Experience**: [User Experience Design](./user-experience.md)
- **Testing**: [Testing Strategy](../concepts/testing/testing-strategy.md)
- **Development**: [Feature Workflow](../guides/development/feature-workflow.md)
- **Quality**: [Definition of Done](./definition-of-done.md)
