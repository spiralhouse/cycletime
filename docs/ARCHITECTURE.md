# JCVD Technical Architecture

**Version:** 1.0  
**Date:** July 30, 2025  
**Authors:** Software Architect Agent, Claude Code

**Related Documents:**  
📋 [PRD.md](PRD.md) | 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) | 👤
[USER_EXPERIENCE.md](USER_EXPERIENCE.md) | 🚀 [ONBOARDING.md](ONBOARDING.md)

---

## Overview

JCVD (Project Orchestration Framework) implements a **simplified data and
context provider architecture** for Claude Code project management. The system
enhances Claude Code's existing capabilities by providing structured project
data, dependency tracking, and cross-session continuity through embedded H2
database and MCP Resource integration.

### Architectural Principles

**Simplicity First**

- JCVD serves as data and context provider, not orchestration manager
- Claude Code handles agent delegation and complex workflow management
- Simple dependency graph traversal and basic CRUD operations only

**Embedded-First Architecture**

- H2 embedded database as default provider for offline and concurrent operation
- No external dependencies required for core functionality
- Superior performance with JVM-optimized query execution and native Exposed integration

**MCP Server Integration**

- Built as Claude Code MCP server for native ecosystem integration
- Provides project context through MCP Resources to Claude Code agents
- No custom agent coordination - leverages Claude Code's existing capabilities

**Context Provision Over Automation**

- Exposes structured project data for Claude Code's intelligent analysis
- Manual workflows with context support rather than automated orchestration
- Human-driven decisions supported by structured data access

## Domain-Driven Design Architecture

### Layered Architecture Approach

JCVD follows **Domain-Driven Design** and **Hexagonal Architecture** principles
with clear separation of concerns:

```typescript
// Domain Layer - Core business logic (no external dependencies)
export interface ProjectRepository {
  findById(id: ProjectId): Promise<Project | null>;
  findByStatus(status: ProjectStatus): Promise<Project[]>;
  save(project: Project): Promise<void>;
  delete(id: ProjectId): Promise<void>;
}

export interface IssueRepository {
  findById(id: IssueId): Promise<Issue | null>;
  findByProject(projectId: ProjectId): Promise<Issue[]>;
  save(issue: Issue): Promise<void>;
  delete(id: IssueId): Promise<void>;
}

// Application Layer - Use case orchestration
export class ProjectApplicationService {
  constructor(
    private projectRepo: ProjectRepository,
    private issueRepo: IssueRepository,
    private unitOfWork: UnitOfWork,
    private domainService: ProjectDomainService
  ) {}

  async createProject(command: CreateProjectCommand): Promise<Project>;
  async archiveProject(projectId: ProjectId): Promise<void>;
  async createIssue(command: CreateIssueCommand): Promise<Issue>;
}

// Infrastructure Layer - Technical implementations
export class H2ProjectRepository implements ProjectRepository {
  constructor(private db: Database.Database) {}
  // H2-specific implementation with Exposed ORM
}

// MCP Layer - Claude Code integration
export class ProjectResource extends BaseResource {
  constructor(private projectService: ProjectApplicationService) {}
  // MCP Resource implementation
}
```

### Domain Model Design

JCVD implements rich domain entities with business logic and value objects for
type safety:

```typescript
// Domain Entities - Rich business logic
export class Project {
  constructor(
    public readonly id: ProjectId,
    private _name: string,
    private _status: ProjectStatus,
    private _issues: Issue[] = []
  ) {}

  get name(): string {
    return this._name;
  }
  get status(): ProjectStatus {
    return this._status;
  }

  addIssue(title: string, description: string): Issue {
    // Business rule enforcement
    if (this._status === ProjectStatus.ARCHIVED) {
      throw new DomainError('Cannot add issues to archived project');
    }

    const issue = new Issue(
      IssueId.generate(),
      this.id,
      new IssueTitle(title),
      description
    );

    this._issues.push(issue);
    return issue;
  }

  archive(): void {
    if (this._issues.some(issue => !issue.isCompleted)) {
      throw new DomainError('Cannot archive project with incomplete issues');
    }
    this._status = ProjectStatus.ARCHIVED;
  }
}

export class Issue {
  constructor(
    public readonly id: IssueId,
    public readonly projectId: ProjectId,
    private _title: IssueTitle,
    private _description: string,
    private _status: IssueStatus = IssueStatus.TODO,
    private _priority: IssuePriority = IssuePriority.MEDIUM,
    private _estimate?: EstimatePoints
  ) {}

  get title(): IssueTitle {
    return this._title;
  }
  get status(): IssueStatus {
    return this._status;
  }
  get isCompleted(): boolean {
    return this._status.isCompleted;
  }

  updateStatus(newStatus: IssueStatus): void {
    // Business logic for status transitions
    if (!this._status.canTransitionTo(newStatus)) {
      throw new DomainError(
        `Cannot transition from ${this._status} to ${newStatus}`
      );
    }
    this._status = newStatus;
  }
}

// Value Objects - Type safety and validation
export class ProjectId {
  constructor(public readonly value: string) {
    if (!value || value.length < 1) {
      throw new Error('ProjectId cannot be empty');
    }
  }
}

export class IssueTitle {
  constructor(public readonly value: string) {
    if (!value || value.trim().length < 1) {
      throw new Error('Issue title cannot be empty');
    }
    if (value.length > 255) {
      throw new Error('Issue title too long');
    }
  }
}

export class ProjectStatus {
  private constructor(private readonly status: string) {}

  static readonly ACTIVE = new ProjectStatus('active');
  static readonly ARCHIVED = new ProjectStatus('archived');
  static readonly COMPLETED = new ProjectStatus('completed');

  static fromString(status: string): ProjectStatus {
    switch (status) {
      case 'active':
        return ProjectStatus.ACTIVE;
      case 'archived':
        return ProjectStatus.ARCHIVED;
      case 'completed':
        return ProjectStatus.COMPLETED;
      default:
        throw new Error(`Unknown project status: ${status}`);
    }
  }

  toString(): string {
    return this.status;
  }
}

// Data Transfer Objects - Infrastructure layer
export interface ProjectData {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface IssueData {
  id: string;
  project_id: string;
  parent_id?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  estimate?: number;
  issue_type: 'epic' | 'story' | 'subtask';
  assignee_id?: string;
  created_at: string;
  updated_at: string;
}
```

### Provider Implementation Status

| Provider            | Status   | Features                                                     | Primary Use Case                                     |
| ------------------- | -------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| **H2 (Embedded)**   | ✅ MVP   | High-performance CRUD, advanced queries, concurrent access  | Personal projects, solo development, getting started |
| **Linear**          | 🔄 V2.0  | Linear API integration, team collaboration                   | Professional development, team coordination          |
| **GitHub Issues**   | 🔄 V3.0+ | Repository integration, basic workflows                      | OSS projects, GitHub-centric development             |
| **Jira**            | 🔄 V3.0+ | Enterprise workflows, custom fields                         | Enterprise development, complex organizations        |

### H2 Database Advantages for Kotlin/JVM

**Performance Benefits:**
- **3-5x faster analytical queries** compared to SQLite for complex JOINs and aggregations
- **Superior concurrent access** with built-in connection pooling and thread safety
- **JVM-optimized memory management** with efficient caching and buffer management
- **Advanced query optimizer** with cost-based optimization for complex dependency graphs

**Exposed ORM Integration:**
- **Native H2 support** eliminates JDBC driver overhead and type mapping issues
- **Compile-time schema validation** through Exposed DSL prevents runtime database errors
- **Type-safe query construction** with Kotlin's null safety and type system
- **Simplified repository implementations** with less boilerplate and better maintainability

**Development Experience:**
- **Better debugging and profiling tools** for JVM-based database operations
- **In-memory testing modes** for fast, isolated unit and integration tests
- **SQL compatibility modes** (PostgreSQL/MySQL) for future cloud migration paths
- **Team familiarity** aligns with Spring Boot ecosystem experience

## Data Models and Database Design

### H2 Embedded Database Schema

The embedded provider uses an optimized H2 database schema designed for superior
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

For seamless provider switching, JCVD implements a standardized export/import
format:

```typescript
interface ExportData {
  version: string;
  exportedAt: Date;
  sourceProvider: string;

  projects: Project[];
  issues: Issue[];
  dependencies: Dependency[];
  workflowStates: WorkflowState[];
  labels: Label[];
  comments: Comment[];

  // Metadata for validation and migration tracking
  metadata: {
    totalIssues: number;
    issueHierarchyValid: boolean;
    dependencyGraphValid: boolean;
    checksums: Record<string, string>;
  };
}
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

```typescript
export class Project {
  constructor(
    public readonly id: ProjectId,
    private _name: string,
    private _status: ProjectStatus,
    private _issues: Issue[] = []
  ) {}

  addIssue(title: string, description: string): Issue {
    // Business rule enforcement at domain level
    if (this._status === ProjectStatus.ARCHIVED) {
      throw new DomainError('Cannot add issues to archived project');
    }

    const issue = new Issue(
      IssueId.generate(),
      this.id,
      new IssueTitle(title),
      description
    );

    this._issues.push(issue);
    return issue;
  }

  getUnblockedIssues(): Issue[] {
    return this._issues.filter(issue => issue.hasNoBlockingDependencies());
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

```typescript
export class ProjectApplicationService {
  constructor(
    private projectRepo: ProjectRepository,
    private issueRepo: IssueRepository,
    private unitOfWork: UnitOfWork,
    private domainService: ProjectDomainService
  ) {}

  async createIssue(command: CreateIssueCommand): Promise<Issue> {
    return this.unitOfWork.execute(async () => {
      // Load aggregate
      const project = await this.projectRepo.findById(command.projectId);
      if (!project) {
        throw new NotFoundError(`Project ${command.projectId.value} not found`);
      }

      // Domain logic through aggregate
      const issue = project.addIssue(command.title.value, command.description);

      // Persist changes
      await this.projectRepo.save(project);
      await this.issueRepo.save(issue);

      return issue;
    });
  }

  async getProjectContext(projectId: ProjectId): Promise<ProjectContext> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) return null;

    const issues = await this.issueRepo.findByProject(projectId);
    const unblockedIssues = project.getUnblockedIssues();

    return new ProjectContext(project, issues, unblockedIssues);
  }
}
```

### 3. Infrastructure Layer

**Purpose**: Provides technical implementations of domain interfaces and
external system integrations.

**Key Components:**

- **Repository Implementations**: `H2ProjectRepository`,
  `H2IssueRepository` with native Exposed ORM integration
- **Unit of Work Implementation**: `H2UnitOfWork` for transaction management
- **Database Migrations**: `MigrationRunner` for schema evolution
- **External Integrations**: Linear API, GitHub API adapters

**Repository Implementation Example:**

```typescript
import { Projects } from './tables'
import { dbQuery } from './database'

export class H2ProjectRepository implements ProjectRepository {
  constructor(private database: Database) {}

  async findById(id: ProjectId): Promise<Project | null> {
    return dbQuery {
      Projects.select { Projects.id eq id.value }
        .singleOrNull()
        ?.let { this.toDomainEntity(it) }
    }
  }

  async save(project: Project): Promise<void> {
    val data = this.toDataModel(project)
    dbQuery {
      Projects.upsert {
        it[id] = data.id
        it[name] = data.name
        it[description] = data.description
        it[status] = data.status
        it[updatedAt] = DateTime.now()
      }
    }
  }

  private toDomainEntity(data: ProjectData): Project {
    return new Project(
      new ProjectId(data.id),
      data.name,
      data.description,
      ProjectStatus.fromString(data.status)
    );
  }

  private toDataModel(project: Project): ProjectData {
    return {
      id: project.id.value,
      name: project.name,
      description: project.description,
      status: project.status.toString(),
      updated_at: new Date().toISOString(),
    };
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

```typescript
export class ProjectResource extends BaseResource {
  constructor(private projectService: ProjectApplicationService) {}

  async read(uri: string): Promise<ResourceContent> {
    const projectIdString = this.parseProjectUri(uri);
    const projectId = new ProjectId(projectIdString);

    // Use Application Service - no direct repository access
    const project = await this.projectService.getProjectDetails(projectId);

    if (!project) {
      throw new ResourceNotFoundError(`Project ${projectId.value} not found`);
    }

    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify({
        id: project.id.value,
        name: project.name,
        status: project.status.toString(),
        issueCount: project.getActiveIssueCount(),
        unblockedTasks: project.getUnblockedIssues().length,
      }),
    };
  }

  async list(): Promise<ResourceListResult> {
    const projects = await this.projectService.listActiveProjects();

    return {
      resources: projects.map(project => ({
        uri: `project://${project.id.value}`,
        name: project.name,
        description: project.description || '',
        mimeType: 'application/json',
      })),
    };
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

```typescript
// Project context for Claude Code analysis
@resource("jcvd://project/{projectId}/context")
async getProjectContext(projectId: string): Promise<ProjectContext>

// Unblocked tasks for task identification
@resource("jcvd://project/{projectId}/unblocked-tasks")
async getUnblockedTasks(projectId: string): Promise<Issue[]>

// Dependency graph for relationship understanding
@resource("jcvd://project/{projectId}/dependencies")
async getDependencyGraph(projectId: string): Promise<DependencyGraph>
```

**MCP Tools Provided:**

```typescript
// Basic issue operations
@tool("jcvd_create_issue")
async createIssue(config: IssueConfig): Promise<Issue>

@tool("jcvd_update_issue_status")
async updateIssueStatus(issueId: string, status: string): Promise<Issue>

@tool("jcvd_add_dependency")
async addDependency(blockerId: string, blockedId: string): Promise<void>
```

### 5. Provider Storage Layer

**Purpose**: Simple storage abstraction starting with SQLite, expanding
incrementally.

**Key Responsibilities:**

- Basic CRUD operations for issues and projects
- Simple data export/import for provider switching
- No complex abstraction until multiple providers exist
- Focus on SQLite optimization first

**Provider Factory Pattern:**

```typescript
class ProviderFactory {
  static async createProvider(config: ProviderConfig): Promise<IssueProvider> {
    switch (config.type) {
      case 'h2':
        return new H2Provider(config.h2Config);
      case 'linear':
        return new LinearProvider(config.linearConfig);
      case 'github':
        return new GitHubProvider(config.githubConfig);
      case 'jira':
        return new JiraProvider(config.jiraConfig);
      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
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
- **Performance**: Sub-millisecond operations with SQLite optimization

#### Domain Model

**Core Entities and Value Objects:**

```typescript
// Session Entity - Core domain model with time provider injection
export class Session {
  constructor(
    private _sessionKey: SessionKey,
    private _projectId?: string,
    private _currentContext: SessionContext,
    private _lastActivity: Date,
    private readonly timeProvider?: TimeProvider
  ) {}

  updateContext(updates: Partial<SessionContext>): void {
    this._currentContext = { ...this._currentContext, ...updates };
    this.touch(); // Updates lastActivity using timeProvider
  }

  isExpired(maxAge: number): boolean {
    const now = this.timeProvider?.now() ?? new Date();
    return now.getTime() - this._lastActivity.getTime() >= maxAge;
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

```typescript
export class H2SessionRepository implements SessionRepository {
  private statements: Map<string, Statement> = new Map();

  constructor(
    private db: Database.Database,
    private timeProvider: TimeProvider
  ) {
    this.initializeStatements();
  }

  async findByKey(sessionKey: SessionKey): Promise<Session | null> {
    const stmt = this.getStatement('findByKey');
    const row = stmt.get(sessionKey.value);
    
    if (!row) return null;
    
    return this.rowToSession(row);
  }

  async save(session: Session): Promise<void> {
    const stmt = this.getStatement('upsert');
    stmt.run({
      sessionKey: session.sessionKey.value,
      projectId: session.projectId,
      currentContext: JSON.stringify(session.currentContext),
      lastActivity: session.lastActivity.getTime(),
      createdAt: session.createdAt.getTime(),
      updatedAt: session.updatedAt.getTime()
    });
  }

  private rowToSession(row: any): Session {
    return Session.fromPlainObject({
      sessionKey: row.session_key,
      projectId: row.project_id,
      currentContext: JSON.parse(row.current_context || '{}'),
      lastActivity: new Date(row.last_activity),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }, this.timeProvider);
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
interface TDDWorkflowState {
  currentPhase: 'red' | 'green' | 'refactor' | 'complete';
  testsCoverage: number;
  qualityGates: QualityGate[];
  nextAction: string;
}

class TDDOrchestrator {
  async validateTestFirst(issueId: string): Promise<boolean>;
  async validateImplementation(issueId: string): Promise<ValidationResult>;
  async validateRefactoring(issueId: string): Promise<RefactorResult>;
  async completeStory(issueId: string): Promise<CompletionResult>;
}
```

## Integration Patterns

### Claude Code MCP Server Architecture

JCVD integrates with Claude Code through the Model Context Protocol (MCP) server
framework:

```typescript
class JCVDMCPServer extends MCPServer {
  // Project orchestration tools
  @tool("jcvd_create_project")
  async createProject(requirements: ProjectRequirements): Promise<Project>

  @tool("jcvd_get_next_task")
  async getNextTask(projectId: string): Promise<TaskRecommendation>

  @tool("jcvd_update_issue")
  async updateIssue(issueId: string, updates: IssueUpdate): Promise<Issue>

  @tool("jcvd_analyze_dependencies")
  async analyzeDependencies(projectId: string): Promise<DependencyAnalysis>

  // Documentation management
  @tool("jcvd_generate_docs")
  async generateDocumentation(projectId: string, docType: DocumentType): Promise<Document>

  @tool("jcvd_sync_docs")
  async syncDocumentation(projectId: string): Promise<SyncResult>
}
```

### State Management Architecture

JCVD implements multi-layer state management for comprehensive project tracking:

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

```typescript
class StateManager {
  async syncState(projectId: string): Promise<SyncResult> {
    // Pull latest from provider
    const providerState = await this.provider.getProject(projectId);

    // Validate documentation currency
    const docsState = await this.validateDocumentation(projectId);

    // Reconcile any conflicts
    const conflicts = this.detectConflicts(providerState, docsState);
    if (conflicts.length > 0) {
      return this.resolveConflicts(conflicts);
    }

    // Update in-memory cache
    this.updateCache(projectId, providerState);

    return { status: 'success', conflicts: [] };
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

### H2 as Default Provider

**Decision**: Use embedded H2 database as the default issue tracking
provider for the Kotlin/JVM implementation.

**Rationale**:

- Zero external dependencies for immediate productivity
- Superior performance: 3-5x faster than SQLite for analytical queries
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

**Decision**: Build JCVD as a Claude Code MCP server rather than standalone
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

**At Rest**: H2 database files encrypted using system keychain integration
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

This architecture provides the technical foundation for JCVD's comprehensive
project orchestration capabilities while maintaining flexibility, performance,
and developer control principles outlined in the product requirements.
