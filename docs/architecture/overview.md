# CycleTime Technical Architecture

**Version:** 1.0  
**Date:** July 30, 2025  
**Authors:** Software Architect Agent, Claude Code

**Related Documents:**  
📋 [PRD.md](PRD.md) | 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) | 👤
[USER_EXPERIENCE.md](USER_EXPERIENCE.md) | 🚀 [ONBOARDING.md](ONBOARDING.md)

---

## Overview

CycleTime (Project Orchestration Framework) implements a **simplified data and
context provider architecture** for Claude Code project management. The system
provides structured project data, dependency tracking, and cross-session
continuity through embedded database (H2) and MCP Resource integration.

### Architectural Principles

**Simplicity First**

- CycleTime serves as data and context provider, not orchestration manager
- Claude Code handles agent delegation and complex workflow management
- Simple dependency graph traversal and basic CRUD operations only

**Embedded-First Architecture**

- Embedded H2 database as default provider for offline and concurrent operation
- No external dependencies required for core functionality
- JVM integration with Exposed ORM and connection pooling

**MCP Server Integration**

- Built as Claude Code MCP server for native ecosystem integration
- Provides project context through MCP Resources to Claude Code agents
- No custom agent coordination - leverages Claude Code's existing capabilities

**Context Provision Over Automation**

- Exposes structured project data for Claude Code analysis
- Manual workflows with context support rather than automated orchestration
- Human-driven decisions supported by structured data access

## Domain-Driven Design Architecture

### Layered Architecture Approach

CycleTime follows **Domain-Driven Design** and **Hexagonal Architecture** principles
with clear separation of concerns:

```kotlin
// Domain Layer - Core business logic (no external dependencies)
interface ProjectRepository {
    suspend fun findById(id: ProjectId): Project?
    suspend fun findByStatus(status: ProjectStatus): List<Project>
    suspend fun save(project: Project)
    suspend fun delete(id: ProjectId): Boolean
}

interface IssueRepository {
    suspend fun findById(id: IssueId): Issue?
    suspend fun findByProject(projectId: ProjectId): List<Issue>
    suspend fun save(issue: Issue)
    suspend fun delete(id: IssueId): Boolean
}

// Application Layer - Use case orchestration
class ProjectApplicationService(
    private val projectRepo: ProjectRepository,
    private val issueRepo: IssueRepository,
    private val unitOfWork: UnitOfWork,
    private val domainService: ProjectDomainService
) {
    suspend fun createProject(command: CreateProjectCommand): Project
    suspend fun archiveProject(projectId: ProjectId)
    suspend fun createIssue(command: CreateIssueCommand): Issue
}

// Infrastructure Layer - Technical implementations
class H2ProjectRepository(
    private val database: Database,
    private val timeProvider: TimeProvider
) : ProjectRepository {
    // H2 implementation with Exposed ORM
}

// MCP Layer - Claude Code integration
class ProjectResource(
    private val projectService: ProjectApplicationService
) : MCPResource {
    // MCP Resource implementation
}
```

### Domain Model Design

CycleTime implements rich domain entities with business logic and value objects for
type safety:

```kotlin
// Domain Entities - Rich business logic
class Project private constructor(
    val id: ProjectId,
    private var _name: String,
    private var _status: ProjectStatus,
    private val _issues: MutableList<IssueId> = mutableListOf(),
    private val timeProvider: TimeProvider
) {
    val name: String get() = _name
    val status: ProjectStatus get() = _status
    val issues: List<IssueId> get() = _issues.toList()
    
    companion object {
        fun create(
            name: String,
            description: String,
            timeProvider: TimeProvider
        ): Project {
            return Project(
                id = ProjectId.generate(),
                _name = name,
                _status = ProjectStatus.ACTIVE,
                timeProvider = timeProvider
            )
        }
    }

    fun addIssue(issueId: IssueId) {
        // Business rule enforcement
        if (_status == ProjectStatus.ARCHIVED) {
            throw DomainException("Cannot add issues to archived project")
        }
        _issues.add(issueId)
    }

    fun archive() {
        // Business rule: can only archive if all issues are completed
        if (_issues.any { !isCompleted(it) }) {
            throw DomainException("Cannot archive project with incomplete issues")
        }
        _status = ProjectStatus.ARCHIVED
    }
    
    private fun isCompleted(issueId: IssueId): Boolean {
        // Check completion status (would be checked via repository)
        return true // Simplified for example
    }
}

class Issue private constructor(
    val id: IssueId,
    val projectId: ProjectId,
    private var _title: String,
    private var _description: String,
    private var _status: IssueStatus = IssueStatus.TODO,
    private var _priority: IssuePriority = IssuePriority.MEDIUM,
    private var _estimate: Int? = null,
    private val timeProvider: TimeProvider
) {
    val title: String get() = _title
    val status: IssueStatus get() = _status
    val isCompleted: Boolean get() = _status == IssueStatus.DONE
    
    companion object {
        fun create(
            title: String,
            description: String,
            projectId: ProjectId,
            type: IssueType,
            timeProvider: TimeProvider
        ): Issue {
            return Issue(
                id = IssueId.generate(),
                projectId = projectId,
                _title = title,
                _description = description,
                timeProvider = timeProvider
            )
        }
    }

    fun updateStatus(newStatus: IssueStatus) {
        // Business logic for status transitions
        if (!_status.canTransitionTo(newStatus)) {
            throw DomainException(
                "Cannot transition from $_status to $newStatus"
            )
        }
        _status = newStatus
    }
}

// Value Objects - Type safety and validation
@JvmInline
value class ProjectId(val value: String) {
    init {
        require(value.isNotBlank()) { "ProjectId cannot be empty" }
    }
    
    companion object {
        fun generate(): ProjectId = ProjectId(UUID.randomUUID().toString())
    }
}

@JvmInline
value class IssueTitle(val value: String) {
    init {
        require(value.trim().isNotBlank()) { "Issue title cannot be empty" }
        require(value.length <= 255) { "Issue title too long" }
    }
}

enum class ProjectStatus {
    ACTIVE,
    ARCHIVED,
    COMPLETED;
    
    companion object {
        fun fromString(status: String): ProjectStatus {
            return valueOf(status.uppercase())
        }
    }
}

// Data Transfer Objects - Infrastructure layer
data class ProjectData(
    val id: String,
    val name: String,
    val description: String,
    val status: String,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class IssueData(
    val id: String,
    val projectId: String,
    val parentId: String? = null,
    val title: String,
    val description: String? = null,
    val status: String,
    val priority: String,
    val estimate: Int? = null,
    val issueType: IssueType,
    val assigneeId: String? = null,
    val createdAt: Instant,
    val updatedAt: Instant
)

enum class IssueType {
    EPIC,
    STORY,
    SUBTASK
}
```

### Provider Implementation Status

| Provider            | Status   | Features                                                     | Primary Use Case                                     |
| ------------------- | -------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| **H2 Database** | ✅ MVP   | Embedded database, high-performance CRUD, concurrent access | Current implementation, stable and proven |
| **Linear**          | 🔄 V2.0  | Linear API integration, team collaboration                   | Professional development, team coordination          |
| **GitHub Issues**   | 🔄 V3.0+ | Repository integration, basic workflows                      | OSS projects, GitHub-centric development             |
| **Jira**            | 🔄 V3.0+ | Enterprise workflows, custom fields                         | Enterprise development, complex organizations        |

### H2 Database Implementation Details

**Performance Characteristics:**
- Complex JOINs and aggregations (performance to be validated with benchmarks)
- Built-in connection pooling and thread safety
- JVM memory management with caching and buffer management
- Cost-based query optimization for dependency graphs

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

The embedded provider uses a database schema designed for optimal
JVM performance, native Exposed ORM integration, and easy migration to cloud providers:

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

### Data Migration Schema

For seamless provider switching, CycleTime implements a standardized export/import
format:

```kotlin
data class ExportData(
    val version: String,
    val exportedAt: Instant,
    val sourceProvider: String,
    
    val projects: List<Project>,
    val issues: List<Issue>,
    val dependencies: List<Dependency>,
    val workflowStates: List<WorkflowState>,
    val labels: List<Label>,
    val comments: List<Comment>,
    
    // Metadata for validation and migration tracking
    val metadata: ExportMetadata
)

data class ExportMetadata(
    val totalIssues: Int,
    val issueHierarchyValid: Boolean,
    val dependencyGraphValid: Boolean,
    val checksums: Map<String, String>
)
```

## Layered Architecture Components

### 1. Domain Layer

**Purpose**: Contains core business logic, entities, and domain services with no
external dependencies.

**Key Components:**

- **Entities**: `Project`, `Issue` with rich business logic and invariants
- **Value Objects**: `ProjectId`, `ProjectStatus`, `IssueTitle` for type safety
- **Repository Interfaces**: `ProjectRepository`, `IssueRepository` as ports
- **Domain Services**: Complex business logic spanning multiple entities

**Domain Entity Example:**

```kotlin
class Project private constructor(
    val id: ProjectId,
    private var _name: String,
    private var _status: ProjectStatus,
    private val _issues: MutableList<IssueId> = mutableListOf()
) {
    fun addIssue(issueId: IssueId) {
        // Business rule enforcement at domain level
        if (_status == ProjectStatus.ARCHIVED) {
            throw DomainException("Cannot add issues to archived project")
        }
        _issues.add(issueId)
    }

    fun getUnblockedIssues(allIssues: List<Issue>): List<Issue> {
        return allIssues.filter { issue -> 
            _issues.contains(issue.id) && issue.hasNoBlockingDependencies()
        }
    }
}
```

### 2. Application Layer

**Purpose**: Orchestrates use cases and coordinates between domain and
infrastructure layers.

**Key Components:**

- **Application Services**: `ProjectApplicationService` - use case orchestration
- **Commands**: `CreateProjectCommand`, `CreateIssueCommand` - input contracts
- **Unit of Work**: Transaction coordination across repositories
- **Domain Event Handlers**: Cross-aggregate coordination

**Application Service Example:**

```kotlin
class ProjectApplicationService(
    private val projectRepo: ProjectRepository,
    private val issueRepo: IssueRepository,
    private val unitOfWork: UnitOfWork,
    private val domainService: ProjectDomainService
) {
    suspend fun createIssue(command: CreateIssueCommand): Issue {
        return unitOfWork.execute {
            // Load aggregate
            val project = projectRepo.findById(command.projectId)
      if (!project) {
        throw new NotFoundError(`Project ${command.projectId.value} not found`);
      }

                ?: throw NotFoundException("Project not found")
            
            // Domain logic through aggregate
            val issue = Issue.create(
                title = command.title,
                description = command.description,
                projectId = command.projectId,
                type = command.type,
                timeProvider = timeProvider
            )
            project.addIssue(issue.id)

            // Persist changes
            projectRepo.save(project)
            issueRepo.save(issue)

            issue
        }
    }

    suspend fun getProjectContext(projectId: ProjectId): ProjectContext? {
        val project = projectRepo.findById(projectId) ?: return null
        val issues = issueRepo.findByProject(projectId)
        val unblockedIssues = project.getUnblockedIssues(issues)
        
        return ProjectContext(project, issues, unblockedIssues)
    }
}
```

### 3. Infrastructure Layer

**Purpose**: Provides technical implementations of domain interfaces and
external system integrations.

**Key Components:**

- **Repository Implementations**: `H2ProjectRepository`,
  `H2IssueRepository` with Exposed ORM integration
- **Unit of Work Implementation**: `H2UnitOfWork` for transaction management
- **Database Migrations**: `MigrationRunner` for schema evolution
- **External Integrations**: Linear API, GitHub API adapters

**Repository Implementation Example:**

```kotlin
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import io.spiralhouse.cycletime.infrastructure.database.Projects

class H2ProjectRepository(
    private val database: Database,
    private val timeProvider: TimeProvider
) : ProjectRepository {
    
    override suspend fun findById(id: ProjectId): Project? = transaction(database) {
        Projects.select { Projects.id eq id.value }
            .singleOrNull()
            ?.let { toDomainEntity(it) }
    }

    override suspend fun save(project: Project) = transaction(database) {
        val exists = Projects.select { Projects.id eq project.id.value }.count() > 0
        
        if (exists) {
            Projects.update({ Projects.id eq project.id.value }) {
                it[name] = project.name
                it[description] = project.description
                it[status] = project.status.name
                it[updatedAt] = timeProvider.now()
            }
        } else {
            Projects.insert {
                it[id] = project.id.value
                it[name] = project.name
                it[description] = project.description
                it[status] = project.status.name
                it[createdAt] = timeProvider.now()
                it[updatedAt] = timeProvider.now()
            }
        }
    }

    private fun toDomainEntity(row: ResultRow): Project {
        return Project.fromSnapshot(
            id = ProjectId(row[Projects.id]),
            name = row[Projects.name],
            description = row[Projects.description],
            status = ProjectStatus.fromString(row[Projects.status]),
            timeProvider = timeProvider
        )
    }
}
```

### 4. MCP Layer (Presentation/Interface)

**Purpose**: Exposes domain functionality to Claude Code through Model Context
Protocol.

**Key Components:**

- **Resource Registry**: Discovery and routing for MCP Resources
- **Resource Implementations**: `ProjectResource`, `IssueResource` - read-only
  data access
- **Tool Registry**: MCP Tool discovery and validation
- **Tool Implementations**: `CreateIssueTool`, `UpdateIssueTool` - write
  operations

**MCP Resource Implementation:**

```kotlin
class ProjectResource(
    private val projectService: ProjectApplicationService
) : MCPResource {

    override fun canHandle(uri: String): Boolean {
        return uri.startsWith("cycletime://project/")
    }

    override suspend fun read(uri: String): ResourceContent {
        val projectIdString = parseProjectUri(uri)
        val projectId = ProjectId(projectIdString)

        // Use Application Service - no direct repository access
        val project = projectService.getProjectDetails(projectId)
            ?: throw ResourceNotFoundException("Project ${projectId.value} not found")

        return ResourceContent(
            uri = uri,
            mimeType = "application/json",
            text = Json.encodeToString(
                mapOf(
                    "id" to project.id.value,
                    "name" to project.name,
                    "status" to project.status.toString(),
                    "issueCount" to project.getActiveIssueCount(),
                    "unblockedTasks" to project.getUnblockedIssues().size
                )
            )
        )
    }

    override suspend fun list(): List<ResourceDescriptor> {
        val projects = projectService.listActiveProjects()

        return projects.map { project ->
            ResourceDescriptor(
                uri = "cycletime://project/${project.id.value}",
                name = project.name,
                description = project.description,
                mimeType = "application/json"
            )
        }
    }
}
```

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
- `docs/API_SPEC.md` - API Documentation
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

### 5. Provider Storage Layer

**Purpose**: Simple storage abstraction using H2, expanding
incrementally.

**Key Responsibilities:**

- Basic CRUD operations for issues and projects
- Simple data export/import for provider switching
- No complex abstraction until multiple providers exist
- Focus on H2 stability and optimization

**Provider Factory Pattern:**

```kotlin
object ProviderFactory {
    suspend fun createProvider(config: ProviderConfig): IssueProvider {
        return when (config.type) {
            "h2" -> H2Provider(config.h2Config)  // Current default
            "linear" -> LinearProvider(config.linearConfig)
            "github" -> GitHubProvider(config.githubConfig)
            "jira" -> JiraProvider(config.jiraConfig)
            else -> throw IllegalArgumentException("Unsupported provider type: ${config.type}")
        }
    }
}
```

### 5. Session Management Architecture

**Purpose**: Provides cross-session state persistence and continuity for Claude Code interactions with comprehensive validation and lifecycle management.

**Design Principles:**
- **Domain-Driven Design**: Rich domain model with business logic encapsulation
- **Dependency Injection**: TimeProvider pattern for testable time-dependent operations
- **Data Integrity**: Automatic validation and repair of session state
- **Performance**: Fast operations with embedded database optimization

#### Domain Model

**Core Entities and Value Objects:**

```kotlin
// Session Entity - Core domain model with time provider injection
class Session(
    private val _sessionKey: SessionKey,
    private var _projectId: String? = null,
    private var _currentContext: SessionContext,
    private var _lastActivity: Instant,
    private val timeProvider: TimeProvider
) {
    fun updateContext(updates: Map<String, Any?>) {
        _currentContext = _currentContext.copy(contextData = updates)
        touch() // Updates lastActivity using timeProvider
    }

    fun isExpired(maxAge: Duration): Boolean {
        val now = timeProvider.now()
        return Duration.between(_lastActivity, now) >= maxAge
  }
}

// SessionKey Value Object - Type-safe identifier
export class SessionKey {
  constructor(public readonly value: string) {
    if (!this.isValidFormat(value)) {
      throw new InvalidSessionKeyError(value);
    }
  }

  static generate(): SessionKey {
    return new SessionKey(crypto.randomUUID());
  }
}

// SessionContext - Structured session data
export interface SessionContext {
  activeIssues?: string[];
  workflowStage?: string;
  lastAction?: string;
  contextData?: Record<string, unknown>;
}
```

#### Service Layers

**SessionManager - MCP Integration Layer:**

```typescript
export class SessionManager implements SessionManagerInterface {
  constructor(
    private readonly sessionService: SessionApplicationService,
    private readonly timeProvider: TimeProvider,
    private readonly validator: SessionValidator,
    private readonly cleanupService: SessionCleanupService,
    config: SessionConfig = {}
  ) {
    this.config = {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days default
      autoCleanup: true,
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      ...config
    };
  }

  async getSession(sessionKey: string): Promise<SessionState | null> {
    const session = await this.sessionService.getSession(sessionKey);
    
    // Validate and auto-repair if needed
    const validation = this.validator.validateSessionState(session);
    if (!validation.isValid) {
      const repaired = this.validator.repairSession(session);
      if (repaired.success) {
        await this.sessionService.updateSession(repaired.session);
        return repaired.session;
      }
      // Delete corrupted sessions that can't be repaired
      await this.sessionService.deleteSession(sessionKey);
      return null;
    }

    // Check expiration
    if (this.isSessionExpired(session)) {
      await this.sessionService.deleteSession(sessionKey);
      return null;
    }

    return session;
  }

  async getSessionInfo(sessionKey: string): Promise<SessionInfo | null> {
    const session = await this.sessionService.getSession(sessionKey);
    if (!session) return null;

    return {
      ...session,
      metadata: this.calculateMetadata(session),
      isExpired: this.isSessionExpired(session),
      expiresAt: this.calculateExpirationTime(session)
    };
  }
}
```

**SessionValidator - Data Integrity Service:**

```typescript
export class SessionValidator {
  validateSessionState(session: SessionStateDto): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate session key format
    if (!this.isValidSessionKey(session.sessionKey)) {
      errors.push({
        field: 'sessionKey',
        message: 'Invalid session key format',
        severity: 'critical'
      });
    }

    // Validate timestamps
    const timestampValidation = this.validateTimestamps(session);
    errors.push(...timestampValidation.errors);

    // Validate context
    const contextValidation = this.validateContext(session.currentContext);
    errors.push(...contextValidation.errors);
    warnings.push(...contextValidation.warnings);

    // Check for corruption
    if (this.hasCorruption(session)) {
      errors.push({
        field: 'data',
        message: 'Session data corrupted',
        severity: 'critical'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  repairSession(session: SessionStateDto): RepairResult {
    const repaired = { ...session };

    // Repair timestamps
    if (repaired.updatedAt < repaired.createdAt) {
      repaired.updatedAt = repaired.createdAt;
    }

    // Clean context data
    if (repaired.currentContext?.activeIssues) {
      repaired.currentContext.activeIssues = 
        this.removeDuplicates(repaired.currentContext.activeIssues);
    }

    // Remove null bytes and control characters
    repaired.currentContext = this.sanitizeContext(repaired.currentContext);

    return { success: true, session: repaired };
  }
}
```

#### Persistence Layer

**Repository Implementation:**

```kotlin
class H2SessionRepository(
    private val database: Database,
    private val timeProvider: TimeProvider
) : SessionRepository {
    
    override suspend fun findByKey(sessionKey: SessionKey): Session? = transaction {
        val row = SessionStates.select { SessionStates.sessionKey eq sessionKey.value }
            .singleOrNull() ?: return@transaction null
        
        rowToSession(row)
    }

    override suspend fun save(session: Session): Unit = transaction {
        SessionStates.upsert {
            it[sessionKey] = session.sessionKey.value
            it[projectId] = session.projectId
            it[currentContext] = Json.encodeToString(session.currentContext)
            it[lastActivity] = session.lastActivity
            it[createdAt] = session.createdAt
            it[updatedAt] = session.updatedAt
        }
    }

    private fun rowToSession(row: ResultRow): Session {
        return Session.fromSnapshot(
            sessionKey = SessionKey(row[SessionStates.sessionKey]),
            projectId = row[SessionStates.projectId],
            currentContext = Json.decodeFromString(row[SessionStates.currentContext]),
            lastActivity = row[SessionStates.lastActivity],
            createdAt = row[SessionStates.createdAt],
            updatedAt = row[SessionStates.updatedAt],
            timeProvider = timeProvider
        )
    }
}
```

#### Database Schema

```sql
-- Session state persistence table
CREATE TABLE IF NOT EXISTS session_states (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_key TEXT UNIQUE NOT NULL,
  project_id TEXT,
  current_context TEXT,
  last_activity INTEGER NOT NULL DEFAULT (unixepoch()),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Performance indexes
CREATE INDEX idx_session_states_key ON session_states(session_key);
CREATE INDEX idx_session_states_activity ON session_states(last_activity);
CREATE INDEX idx_session_states_project ON session_states(project_id);
```

#### Session Lifecycle

1. **Creation**: New session with unique SessionKey and initial context
2. **Updates**: Context modifications with automatic touch() for activity tracking
3. **Validation**: Automatic validation on retrieval with repair attempts
4. **Expiration**: Configurable max age (default 7 days) with automatic cleanup
5. **Cleanup**: Hourly background process removing expired/corrupted sessions

#### Performance Characteristics

- **Session Creation**: < 1ms
- **Session Retrieval**: < 1ms with validation
- **Context Update**: < 1ms
- **Bulk Cleanup**: < 100ms for 1000 sessions
- **Memory Footprint**: ~1KB per session in memory

### 6. Development Methodology Framework

**Purpose**: Integrates structured development practices into workflow
automation.

**Key Responsibilities:**

- TDD workflow orchestration with automated test generation
- Quality gate enforcement through state transition validation
- Continuous integration pipeline setup and configuration
- Code quality metrics tracking and reporting

**TDD Integration Pattern:**

```typescript
data class TDDWorkflowState(
    val currentPhase: TDDPhase,
    val testsCoverage: Double,
    val qualityGates: List<QualityGate>,
    val nextAction: String
)

enum class TDDPhase {
    RED, GREEN, REFACTOR, COMPLETE
}

class TDDOrchestrator {
    suspend fun validateTestFirst(issueId: String): Boolean
    suspend fun validateImplementation(issueId: String): ValidationResult
    suspend fun validateRefactoring(issueId: String): RefactorResult
    suspend fun completeStory(issueId: String): CompletionResult
}
```

## Integration Patterns

### Claude Code MCP Server Architecture

CycleTime integrates with Claude Code through the Model Context Protocol (MCP) server
framework:

```kotlin
class CycleTimeMCPServer(
    private val resources: List<MCPResource>,
    private val tools: List<MCPTool>
) {
    // Project orchestration tools
    @MCPTool("cycletime_create_project")
    suspend fun createProject(requirements: ProjectRequirements): Project

    @MCPTool("cycletime_get_next_task")
    suspend fun getNextTask(projectId: String): TaskRecommendation

    @MCPTool("cycletime_update_issue")
    suspend fun updateIssue(issueId: String, updates: IssueUpdate): Issue

    @MCPTool("cycletime_analyze_dependencies")
    suspend fun analyzeDependencies(projectId: String): DependencyAnalysis

    // Documentation management
    @MCPTool("cycletime_generate_docs")
    suspend fun generateDocumentation(projectId: String, docType: DocumentType): Document

    @MCPTool("cycletime_sync_docs")
    suspend fun syncDocumentation(projectId: String): SyncResult
}
```

### State Management Architecture

CycleTime implements multi-layer state management for comprehensive project tracking:

**Layer 1: In-Memory State**

- Current session context and temporary data
- LLM conversation state and user preferences
- Performance caches for frequently accessed data

**Layer 2: Repository Documentation**

- Persistent documentation in standardized `docs/` structure
- Version-controlled architectural decisions and specifications
- Cross-reference linking between requirements and implementation

**Layer 3: Issue Tracking Provider**

- Authoritative source for project structure and progress
- Complete issue lifecycle and dependency relationships
- Cross-session continuity and team collaboration state

**State Synchronization Strategy:**

```kotlin
class StateManager(
    private val provider: IssueProvider,
    private val cache: StateCache
) {
    suspend fun syncState(projectId: String): SyncResult {
        // Pull latest from provider
        val providerState = provider.getProject(projectId)

        // Validate documentation currency
        val docsState = validateDocumentation(projectId)

        // Reconcile any conflicts
        val conflicts = detectConflicts(providerState, docsState)
        if (conflicts.isNotEmpty()) {
            return resolveConflicts(conflicts)
        }

        // Update in-memory cache
        cache.update(projectId, providerState)

        return SyncResult(status = "success", conflicts = emptyList())
    }
}
```

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

**Current**: Use embedded H2 database as the default issue tracking
provider for the Kotlin/JVM implementation.

**Rationale**:

- Zero external dependencies for immediate productivity
- Optimal JVM integration and high performance for analytical queries
- Native Exposed ORM integration for type-safe database operations
- Excellent concurrent access support with connection pooling
- Complete offline operation capability
- JVM-optimized memory management and query execution
- Linear-inspired schema enables easy migration to cloud providers
- No account setup or authentication friction

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

## Performance Considerations

### Database Optimization

**Query Performance**:

- Comprehensive indexing strategy for common access patterns
- Compound indexes for multi-column queries
- Foreign key constraints for data integrity without performance penalty

**Scalability Targets**:

- Support for 10,000+ issues per project with sub-100ms query response
- Dependency graph analysis for projects with 1,000+ interconnected issues
- Real-time state synchronization across multiple concurrent sessions

### Memory Management

**Caching Strategy**:

- LRU cache for frequently accessed issues and dependency graphs
- Lazy loading for large dependency trees and historical data
- Batch operations for bulk issue updates and migrations

**Resource Limits**:

- Maximum 100MB memory footprint for typical project sizes
- Configurable cache sizes based on available system resources
- Graceful degradation for resource-constrained environments

## Security and Data Protection

### Data Encryption

**At Rest**: Database files encrypted using system keychain integration
**In Transit**: All provider API communications use TLS 1.3 minimum **API
Keys**: Secure storage using platform-appropriate credential management

### Access Control

**Local Mode**: File system permissions protect project database and
configuration **Provider Integration**: Respect provider-specific access
controls and team permissions **Audit Trail**: Complete activity logging for all
project state modifications

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
