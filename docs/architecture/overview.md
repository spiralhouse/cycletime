# CycleTime Technical Architecture

**Version:** 1.0  
**Date:** July 30, 2025  
**Authors:** Software Architect Agent, Claude Code

**Related Documents:**  
📋 [PRD.md](PRD.md) | 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) | 👤
[USER_EXPERIENCE.md](USER_EXPERIENCE.md) | 🚀 [ONBOARDING.md](ONBOARDING.md)

---

## Overview

CycleTime (Project Orchestration Framework) implements a data and context provider architecture for Claude Code project management. The system provides structured project data, dependency tracking, and cross-session continuity through an embedded H2 database and MCP Resource integration.

### Architectural Principles

The CycleTime architecture is guided by four core principles that shape its design and implementation decisions. These principles ensure the system remains focused, maintainable, and well-integrated within the Claude Code ecosystem.

**Simplicity First**

CycleTime intentionally limits its scope to data and context provision rather than attempting complex orchestration. Claude Code handles agent delegation and workflow management, while CycleTime focuses on dependency graph traversal and basic CRUD operations. This division of responsibility keeps the system maintainable and prevents feature creep.

**Embedded-First Architecture**

The embedded H2 database serves as the default provider, enabling offline operation and concurrent access without external dependencies. This JVM-native approach integrates seamlessly with Exposed ORM and built-in connection pooling, providing immediate productivity for developers without configuration overhead.

**MCP Server Integration**

Built as a Claude Code MCP server, CycleTime integrates natively with the existing ecosystem. Project context flows to Claude Code agents through MCP Resources, while CycleTime leverages Claude Code's agent coordination capabilities rather than implementing custom orchestration logic.

**Context Provision Over Automation**

Rather than automating workflows, CycleTime exposes structured project data for Claude Code analysis. This approach supports manual workflows with rich context, enabling human-driven decisions backed by comprehensive project information and dependency insights.

## Domain-Driven Design Architecture

### Layered Architecture Approach

CycleTime follows **Domain-Driven Design** and **Hexagonal Architecture** principles with clear separation of concerns:

```mermaid
graph TB
    subgraph MCP["MCP Layer"]
        Resources[MCP Resources]
        Tools[MCP Tools]
    end

    subgraph Application["Application Layer"]
        AppServices[Application Services]
        Commands[Commands/DTOs]
        UnitOfWork[Unit of Work]
    end

    subgraph Domain["Domain Layer"]
        Entities[Domain Entities]
        ValueObjects[Value Objects]
        RepoInterfaces[Repository Interfaces]
        DomainServices[Domain Services]
    end

    subgraph Infrastructure["Infrastructure Layer"]
        RepoImpl[Repository Implementations]
        Database[(H2 Database)]
        ExternalAPIs[External APIs]
    end

    Resources --> AppServices
    Tools --> AppServices
    AppServices --> DomainServices
    AppServices --> RepoInterfaces
    AppServices --> UnitOfWork
    DomainServices --> Entities
    RepoInterfaces -.implements.-> RepoImpl
    RepoImpl --> Database
    RepoImpl --> ExternalAPIs

    style Domain fill:#E3F2FD
    style Application fill:#F3E5F5
    style Infrastructure fill:#E8F5E9
    style MCP fill:#FFF3E0
```

**Layer Responsibilities:**
- **Domain**: Core business logic, entities, repository interfaces
- **Application**: Use case orchestration, commands, Unit of Work
- **Infrastructure**: Repository implementations, database, external APIs
- **MCP**: Claude Code integration via Resources and Tools

### Domain Model Design

**Rich Domain Entities:**
- `Project`: Manages project state, issue relationships, archive rules
- `Issue`: Handles status transitions, hierarchy constraints
- Entities encapsulate business rules (e.g., "Cannot add issues to archived project")

**Value Objects for Type Safety:**
- `ProjectId`, `IssueId`: UUID-based identifiers with validation
- `IssueTitle`: String wrapper with length constraints
- Enums: `ProjectStatus`, `IssueStatus`, `IssueType`, `IssuePriority`

**Data Transfer Objects:**
- DTOs for serialization at infrastructure boundaries
- Separate domain models from persistence models

### Provider Implementation Status

```mermaid
graph TB
    subgraph Core["Core Interfaces"]
        IssueProvider[IssueProvider Interface]
        ProjectProvider[ProjectProvider Interface]
    end

    subgraph Implementations["Provider Implementations"]
        H2[H2 Database Provider]
        Linear[Linear API Provider]
        GitHub[GitHub Issues Provider]
        Jira[Jira Provider]
    end

    IssueProvider -.implements.-> H2
    IssueProvider -.implements.-> Linear
    IssueProvider -.implements.-> GitHub
    IssueProvider -.implements.-> Jira

    ProjectProvider -.implements.-> H2
    ProjectProvider -.implements.-> Linear
    ProjectProvider -.implements.-> GitHub
    ProjectProvider -.implements.-> Jira

    H2 --> H2DB[(H2 Database)]
    Linear --> LinearAPI[Linear API]
    GitHub --> GitHubAPI[GitHub API]
    Jira --> JiraAPI[Jira API]

    style H2 fill:#4CAF50
    style Linear fill:#E0E0E0
    style GitHub fill:#E0E0E0
    style Jira fill:#E0E0E0
```

| Provider            | Status   | Features                                                     | Primary Use Case                                     |
| ------------------- | -------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| **H2 Database** | ✅ Current   | Embedded database, high-performance CRUD, concurrent access | Default provider (implemented in SPI-439, August 2025) |
| **Linear**          | 🔄 V2.0  | Linear API integration, team collaboration                   | Professional development, team coordination          |
| **GitHub Issues**   | 🔄 V3.0+ | Repository integration, basic workflows                      | OSS projects, GitHub-centric development             |
| **Jira**            | 🔄 V3.0+ | Enterprise workflows, custom fields                         | Enterprise development, complex organizations        |

### H2 Database Implementation Details

**Performance Characteristics:**
- Supports complex JOINs and aggregations for dependency analysis
- Built-in connection pooling and thread safety
- JVM-native memory management with caching and buffer management
- Cost-based query optimizer for dependency graph queries

**Exposed ORM Integration:**
- Native H2 support with JDBC driver
- Compile-time schema validation through Exposed DSL
- Type-safe query construction with Kotlin's type system
- Repository implementations with Exposed ORM patterns

**Development Features:**
- JVM-based debugging and profiling tools
- In-memory testing modes
- SQL compatibility modes (PostgreSQL/MySQL) for migration paths
- Spring Boot ecosystem patterns

## Data Models and Database Design

### Database Schema (H2)

The H2 database uses a schema designed for JVM integration, Exposed ORM compatibility, and straightforward migration to cloud providers:

```sql
-- Project management with Linear-inspired structure
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  key TEXT UNIQUE,              -- Short project identifier (e.g., 'PROJ')
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Workflow states supporting standard issue tracking patterns
CREATE TABLE workflow_states (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,           -- Human-readable name
  type TEXT NOT NULL,           -- Semantic type for processing
  position INTEGER DEFAULT 0,   -- Display ordering
  color TEXT DEFAULT '#000000', -- UI color representation

  UNIQUE(project_id, name)
);

-- Core issues table with strict hierarchy enforcement
CREATE TABLE issues (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES issues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  state_id TEXT REFERENCES workflow_states(id),
  priority INTEGER DEFAULT 0,   -- Linear-compatible priority scale
  estimate INTEGER,            -- Story points for planning
  issue_type TEXT NOT NULL CHECK (issue_type IN ('epic', 'story', 'subtask')),
  assignee_id TEXT,           -- User identifier (provider-specific)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Enforce proper hierarchy constraints
  CHECK (
    (issue_type = 'epic' AND parent_id IS NULL) OR
    (issue_type = 'story' AND parent_id IS NOT NULL) OR
    (issue_type = 'subtask' AND parent_id IS NOT NULL)
  )
);

-- Dependency graph for task orchestration
CREATE TABLE issue_dependencies (
  id TEXT PRIMARY KEY,
  blocker_id TEXT REFERENCES issues(id) ON DELETE CASCADE,
  blocked_id TEXT REFERENCES issues(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'blocks',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Prevent duplicate dependencies and self-references
  UNIQUE(blocker_id, blocked_id),
  CHECK(blocker_id != blocked_id)
);

-- Flexible labeling system
CREATE TABLE labels (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#000000',
  description TEXT,

  UNIQUE(project_id, name)
);

CREATE TABLE issue_labels (
  issue_id TEXT REFERENCES issues(id) ON DELETE CASCADE,
  label_id TEXT REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (issue_id, label_id)
);

-- Activity tracking and comments
CREATE TABLE issue_comments (
  id TEXT PRIMARY KEY,
  issue_id TEXT REFERENCES issues(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  author_id TEXT,             -- User identifier
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance optimization indexes
CREATE INDEX idx_issues_project_id ON issues(project_id);
CREATE INDEX idx_issues_parent_id ON issues(parent_id);
CREATE INDEX idx_issues_state_id ON issues(state_id);
CREATE INDEX idx_issues_type ON issues(issue_type);
CREATE INDEX idx_issues_assignee ON issues(assignee_id);
CREATE INDEX idx_dependencies_blocker ON issue_dependencies(blocker_id);
CREATE INDEX idx_dependencies_blocked ON issue_dependencies(blocked_id);
CREATE INDEX idx_workflow_states_project ON workflow_states(project_id);
CREATE INDEX idx_labels_project ON labels(project_id);

-- Optimized compound indexes for common queries
CREATE INDEX idx_issues_project_type_state ON issues(project_id, issue_type, state_id);
CREATE INDEX idx_issues_parent_type ON issues(parent_id, issue_type);
```

### Data Migration Strategy

Standardized export/import format supports provider switching:
- JSON-based export with version metadata
- Validation checksums for data integrity
- Hierarchy and dependency graph validation
- Incremental migration support

## Layered Architecture Components

### 1. Domain Layer

**Purpose**: Core business logic with no external dependencies.

**Key Components:**
- **Entities**: `Project`, `Issue` - encapsulate business rules and invariants
- **Value Objects**: `ProjectId`, `IssueTitle` - type safety and validation
- **Repository Interfaces**: `ProjectRepository`, `IssueRepository` - ports for data access
- **Domain Services**: Complex logic spanning multiple entities

### 2. Application Layer

**Purpose**: Orchestrates use cases, coordinates domain and infrastructure.

**Key Components:**
- **Application Services**: `ProjectApplicationService` - use case orchestration
- **Commands/DTOs**: Type-safe input contracts
- **Unit of Work**: Transaction coordination
- **Event Handlers**: Cross-aggregate coordination

**Interaction Pattern:**
MCP Tool → Application Service → Domain Entity → Repository → Database

### 3. Infrastructure Layer

**Purpose**: Technical implementations and external integrations.

**Key Components:**
- **Repository Implementations**: `H2ProjectRepository`, `H2IssueRepository` using Exposed ORM
- **Unit of Work**: `H2UnitOfWork` for transaction management
- **Migrations**: Schema evolution via `MigrationRunner`
- **External Integrations**: Linear, GitHub API adapters

### 4. MCP Layer

**Purpose**: Claude Code integration via Model Context Protocol.

**Key Components:**
- **Resources**: `ProjectResource`, `IssueResource` - read-only context provision
- **Tools**: `CreateIssueTool`, `UpdateIssueTool` - write operations
- **Registries**: Discovery and routing for resources and tools

### 3. Documentation Templates

**Purpose**: Provides basic documentation structure for project bootstrap.

**Key Responsibilities:**

- Standardized `docs/` directory structure creation
- Basic template provision for common project documents
- Manual documentation updates (no automated synchronization)
- Simple project structure generation

**Document Templates:**

- `docs/PRD.md` - Product Requirements Document
- `docs/ARCHITECTURE.md` - Technical Architecture
- `docs/api/quick-start.md` - REST API Quick Start Guide
- OpenAPI Documentation - Available at `/swagger` endpoint
- `docs/DEPLOYMENT.md` - Infrastructure and Deployment
- `docs/ADR/` - Architecture Decision Records

### 4. MCP Server Integration

**Purpose**: Integrates with Claude Code through Model Context Protocol (MCP) to
provide project context.

**Key Responsibilities:**

- Expose project data through MCP Resources for Claude Code access
- Provide basic CRUD operations through MCP Tools
- Enable cross-session project state recovery
- Maintain simple, structured data provision interface

**MCP Resources Provided:**

```kotlin
// Project context for Claude Code analysis
@MCPResource("cycletime://project/{projectId}/context")
suspend fun getProjectContext(projectId: String): ProjectContext

// Unblocked tasks for task identification
@MCPResource("cycletime://project/{projectId}/unblocked-tasks")
suspend fun getUnblockedTasks(projectId: String): List<Issue>

// Dependency graph for relationship understanding
@MCPResource("cycletime://project/{projectId}/dependencies")
suspend fun getDependencyGraph(projectId: String): DependencyGraph
```

**MCP Tools Provided:**

```kotlin
// Basic issue operations
@MCPTool("cycletime_create_issue")
suspend fun createIssue(config: IssueConfig): Issue

@MCPTool("cycletime_update_issue_status")
suspend fun updateIssueStatus(issueId: String, status: String): Issue

@MCPTool("cycletime_add_dependency")
suspend fun addDependency(blockerId: String, blockedId: String)
```

### 5. Provider Storage

**Purpose**: Storage abstraction supporting multiple backends.

**Current Implementation:**
- H2 database (default, implemented)
- Basic CRUD operations
- Export/import for provider switching

**Future Providers:**
- Linear, GitHub Issues, Jira (planned)

### 6. Session Management

**Purpose**: Cross-session state persistence for Claude Code interactions.

See [Session Management](session-management.md) for complete technical reference.

**Key Features:**
- Domain-Driven Design with validation and auto-repair
- TimeProvider pattern for testable time operations
- Sub-millisecond performance with H2
- Automatic cleanup of expired/corrupted sessions

### 7. Development Workflow Integration

**Purpose**: Structured development practice support.

**Features:**
- TDD workflow orchestration (RED → GREEN → REFACTOR)
- Quality gate enforcement
- CI/CD pipeline integration
- Code quality metrics tracking

## Integration Patterns

### MCP Server Integration

**Integration via Model Context Protocol:**
- **Resources**: Expose project context to Claude Code (read-only)
- **Tools**: Provide CRUD operations and workflow actions
- **Registry**: Dynamic discovery and routing

### State Management

**Multi-Layer State Architecture:**
- **In-Memory**: Session context, caches, conversation state
- **Repository Documentation**: Version-controlled specs and ADRs
- **Issue Provider**: Authoritative project structure and progress

**Synchronization:** Pull from provider → Validate docs → Resolve conflicts → Update cache

## Technical Decision Rationale

### Provider-Agnostic Architecture

**Decision**: Implement unified interface abstraction rather than native
provider integration.

**Rationale**:

- Eliminates vendor lock-in concerns for individual developers
- Ensures feature parity regardless of chosen provider
- Enables seamless migration as project needs evolve
- Supports offline development with embedded database option

**Trade-offs**:

- Additional abstraction layer complexity
- Potential performance overhead for provider-specific optimizations
- Requires ongoing maintenance as provider APIs evolve

### Embedded Database Strategy

**Current**: H2 database serves as the default issue tracking provider for the Kotlin/JVM implementation (implemented in SPI-439, August 2025).

**Rationale**:

- Zero external dependencies for immediate productivity
- Native JVM integration with Exposed ORM for type-safe database operations
- Concurrent access support with built-in connection pooling
- Supports offline operation without external services
- JVM-native memory management and query execution
- Linear-inspired schema design enables migration to cloud providers
- No account setup or authentication requirements

**Trade-offs**:

- No built-in team collaboration features (resolved with provider switching)
- Requires manual backup and synchronization for distributed teams
- Limited advanced reporting compared to enterprise solutions

### MCP Server Architecture

**Decision**: Build CycleTime as a Claude Code MCP server rather than standalone
application.

**Rationale**:

- Native integration with Claude Code ecosystem and existing tools
- Leverages established user workflows and interaction patterns
- Access to comprehensive file system and development tool integration
- Utilizes Claude Code's built-in agent system for task delegation

**Trade-offs**:

- Dependency on Claude Code platform for operation
- Limited portability to other AI development environments
- Requires understanding of MCP protocol for customization

### Linear-Inspired Data Schema

**Decision**: Model embedded database schema after Linear's structure and
terminology.

**Rationale**:

- Linear represents current best practices in issue tracking design
- Familiar terminology and concepts for professional developers
- Straightforward migration path for users wanting to transition to Linear
- Proven scalability and workflow patterns

**Trade-offs**:

- May not align perfectly with other provider data models
- Requires transformation for providers with different paradigms
- Potential feature gaps for providers with unique capabilities

## Performance & Security

### Performance Targets
- Support for 10,000+ issues per project
- Comprehensive indexing for dependency graph queries
- Configurable caching (LRU) and lazy loading

### Security
- Database encryption at rest (system keychain)
- TLS 1.3 for external APIs
- Platform-appropriate credential storage
- Activity audit trail

## Cross-References

- **Business Requirements**: See [PRD.md](./PRD.md) for functional requirements
  and success criteria
- **User Workflows**: See [USER_EXPERIENCE.md](./USER_EXPERIENCE.md) for
  detailed user interaction patterns
- **API Documentation**: See [API_SPEC.md](./API_SPEC.md) for detailed MCP
  server interface specifications
- **Deployment Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for installation
  and configuration instructions

---

This architecture provides the technical foundation for CycleTime's comprehensive
project orchestration capabilities while maintaining flexibility, performance,
and developer control principles outlined in the product requirements.
