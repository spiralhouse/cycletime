# JCVD Technical Architecture

**Version:** 1.0  
**Date:** July 30, 2025  
**Authors:** Software Architect Agent, Claude Code

**Related Documents:**  
📋 [PRD.md](PRD.md) | 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) | 👤 [USER_EXPERIENCE.md](USER_EXPERIENCE.md) | 🚀 [ONBOARDING.md](ONBOARDING.md)

---

## Overview

JCVD (Project Orchestration Framework) implements a **provider-agnostic architecture** for comprehensive project management and development orchestration. The system transforms Claude Code into a complete software development partner through intelligent task orchestration, multi-provider issue tracking, and structured development methodologies.

### Architectural Principles

**Provider Agnostic Design**
- Unified interface abstracts issue tracking provider implementation details
- Common data model ensures feature parity across all supported providers
- Seamless provider switching with complete data migration support

**Embedded-First Architecture**
- SQLite embedded database as default provider for offline operation
- No external dependencies required for core functionality
- High performance with optimized schemas and indexing strategies

**MCP Server Integration**
- Built as Claude Code MCP server for native ecosystem integration
- Leverages existing tool ecosystem and agent framework
- Maintains compatibility with Claude Code's subagent architecture

**TDD Methodology Integration**
- Test-driven development practices built into core workflows
- Automated test generation and validation as part of issue completion
- Quality gates enforced through workflow state transitions

## Multi-Provider Architecture

### Provider Interface Design

The core abstraction layer enables seamless integration with multiple issue tracking systems:

```typescript
interface IssueProvider {
  // Provider metadata and availability
  getProviderInfo(): ProviderInfo
  isAvailable(): Promise<boolean>
  
  // Project lifecycle management
  createProject(config: ProjectConfig): Promise<Project>
  getProject(id: string): Promise<Project>
  updateProject(id: string, updates: Partial<Project>): Promise<Project>
  
  // Issue lifecycle operations
  createIssue(config: IssueConfig): Promise<Issue>
  getIssue(id: string): Promise<Issue>
  updateIssue(id: string, updates: Partial<Issue>): Promise<Issue>
  listIssues(filters: IssueFilters): Promise<Issue[]>
  
  // Dependency graph management
  addDependency(blockerId: string, blockedId: string): Promise<Dependency>
  removeDependency(dependencyId: string): Promise<void>
  getDependencyGraph(projectId: string): Promise<DependencyGraph>
  
  // Workflow state management
  getWorkflowStates(): Promise<WorkflowState[]>
  updateIssueState(issueId: string, stateId: string): Promise<Issue>
  
  // Data portability and migration
  exportData(projectId: string): Promise<ExportData>
  importData(data: ExportData): Promise<ImportResult>
  syncWith(otherProvider: IssueProvider): Promise<SyncResult>
}
```

### Unified Data Model

All providers implement a consistent data model based on standard issue tracking patterns:

```typescript
interface Issue {
  id: string
  projectId: string
  parentId?: string              // Epic → Story → Subtask hierarchy
  title: string
  description?: string
  stateId: string               // Workflow state identifier
  priority: number              // 0=None, 1=Urgent, 2=High, 3=Normal, 4=Low
  estimate?: number             // Story points (Fibonacci scale)
  issueType: 'epic' | 'story' | 'subtask'
  assigneeId?: string
  labels: string[]
  dependencies: Dependency[]
  createdAt: Date
  updatedAt: Date
  
  // Provider-specific extensions
  providerMetadata?: Record<string, any>
}

interface Dependency {
  id: string
  blockerId: string            // Issue that must complete first
  blockedId: string           // Issue that waits for blocker
  dependencyType: 'blocks' | 'related' | 'duplicate'
  createdAt: Date
}

interface WorkflowState {
  id: string
  name: string                // 'Backlog', 'Todo', 'In Progress', 'Done'
  type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled'
  position: number            // Display order
  color: string              // UI color representation
}
```

### Provider Implementation Status

| Provider | Status | Features | Primary Use Case |
|----------|--------|----------|------------------|
| **SQLite (Embedded)** | ✅ MVP | Full feature parity, offline operation, high performance | Personal projects, proof of concept, offline development |
| **Linear** | ✅ V1.0 | Native Linear API integration, team collaboration | Professional development, team coordination |
| **GitHub Issues** | 🔄 V2.0 | Repository integration, open source workflows | OSS projects, GitHub-centric development |
| **Jira** | 🔄 V2.0 | Enterprise workflows, custom fields, advanced reporting | Enterprise development, complex project management |

## Data Models and Database Design

### SQLite Embedded Database Schema

The embedded provider uses an optimized SQLite schema designed for high performance and easy migration to cloud providers:

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

For seamless provider switching, JCVD implements a standardized export/import format:

```typescript
interface ExportData {
  version: string
  exportedAt: Date
  sourceProvider: string
  
  projects: Project[]
  issues: Issue[]
  dependencies: Dependency[]
  workflowStates: WorkflowState[]
  labels: Label[]
  comments: Comment[]
  
  // Metadata for validation and migration tracking
  metadata: {
    totalIssues: number
    issueHierarchyValid: boolean
    dependencyGraphValid: boolean
    checksums: Record<string, string>
  }
}
```

## Core System Components

### 1. Inception Engine

**Purpose**: Orchestrates project creation from requirements gathering through initial structure setup.

**Key Responsibilities:**
- Interactive requirements gathering through structured interviews
- PRD validation and enhancement for user-provided requirements
- Project type detection and appropriate scaffolding generation
- Provider-agnostic project initialization and issue structure creation

**Implementation Pattern:**
```typescript
class InceptionEngine {
  async conductRequirementsInterview(context: InterviewContext): Promise<PRDData>
  async validatePRD(prd: PRDData): Promise<ValidationResult>
  async generateProjectStructure(prd: PRDData): Promise<ProjectStructure>
  async initializeIssueTracking(structure: ProjectStructure, provider: IssueProvider): Promise<Project>
}
```

### 2. Task Orchestration Engine

**Purpose**: Provides LLM-powered analysis of project state for intelligent task recommendations.

**Key Responsibilities:**
- Dependency graph analysis and traversal
- Priority-based task sequencing with context awareness
- Issue state management and automatic progression
- Cross-session continuity and project state recovery

**Core Algorithm:**
```typescript
class TaskOrchestrationEngine {
  // Analyze current project state and recommend optimal next task
  async getNextTask(projectId: string, context: ProjectContext): Promise<TaskRecommendation> {
    const dependencyGraph = await this.provider.getDependencyGraph(projectId)
    const availableTasks = this.findUnblockedTasks(dependencyGraph)
    const prioritizedTasks = this.prioritizeByContext(availableTasks, context)
    
    return this.selectOptimalTask(prioritizedTasks)
  }
  
  // Update issue state based on completion criteria
  async progressIssue(issueId: string, progressData: ProgressData): Promise<Issue> {
    const issue = await this.provider.getIssue(issueId)
    const nextState = this.determineNextState(issue, progressData)
    
    if (nextState) {
      await this.provider.updateIssueState(issueId, nextState.id)
      await this.checkForUnblockedDependencies(issueId)
    }
    
    return this.provider.getIssue(issueId)
  }
}
```

### 3. Documentation Management System

**Purpose**: Maintains structured documentation that evolves with project development.

**Key Responsibilities:**
- Standardized `docs/` directory structure enforcement
- Template-based document generation with project-specific customization
- Living documentation synchronization with implementation progress
- Architecture Decision Record (ADR) generation and maintenance

**Document Templates:**
- `docs/PRD.md` - Product Requirements Document
- `docs/ARCHITECTURE.md` - Technical Architecture
- `docs/API_SPEC.md` - API Documentation
- `docs/DEPLOYMENT.md` - Infrastructure and Deployment
- `docs/ADR/` - Architecture Decision Records

### 4. Issue Provider Abstraction Layer

**Purpose**: Enables seamless operation across multiple issue tracking backends.

**Key Responsibilities:**
- Unified interface implementation for all supported providers
- Data model transformation between provider-specific formats and common schema
- Migration orchestration with data integrity validation
- Feature parity enforcement across different provider capabilities

**Provider Factory Pattern:**
```typescript
class ProviderFactory {
  static async createProvider(config: ProviderConfig): Promise<IssueProvider> {
    switch (config.type) {
      case 'sqlite':
        return new SQLiteProvider(config.sqliteConfig)
      case 'linear':
        return new LinearProvider(config.linearConfig)
      case 'github':
        return new GitHubProvider(config.githubConfig)
      case 'jira':
        return new JiraProvider(config.jiraConfig)
      default:
        throw new Error(`Unsupported provider type: ${config.type}`)
    }
  }
}
```

### 5. Development Methodology Framework

**Purpose**: Integrates structured development practices into workflow automation.

**Key Responsibilities:**
- TDD workflow orchestration with automated test generation
- Quality gate enforcement through state transition validation
- Continuous integration pipeline setup and configuration
- Code quality metrics tracking and reporting

**TDD Integration Pattern:**
```typescript
interface TDDWorkflowState {
  currentPhase: 'red' | 'green' | 'refactor' | 'complete'
  testsCoverage: number
  qualityGates: QualityGate[]
  nextAction: string
}

class TDDOrchestrator {
  async validateTestFirst(issueId: string): Promise<boolean>
  async validateImplementation(issueId: string): Promise<ValidationResult>
  async validateRefactoring(issueId: string): Promise<RefactorResult>
  async completeStory(issueId: string): Promise<CompletionResult>
}
```

## Integration Patterns

### Claude Code MCP Server Architecture

JCVD integrates with Claude Code through the Model Context Protocol (MCP) server framework:

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
    const providerState = await this.provider.getProject(projectId)
    
    // Validate documentation currency
    const docsState = await this.validateDocumentation(projectId)
    
    // Reconcile any conflicts
    const conflicts = this.detectConflicts(providerState, docsState)
    if (conflicts.length > 0) {
      return this.resolveConflicts(conflicts)
    }
    
    // Update in-memory cache
    this.updateCache(projectId, providerState)
    
    return { status: 'success', conflicts: [] }
  }
}
```

## Technical Decision Rationale

### Provider-Agnostic Architecture

**Decision**: Implement unified interface abstraction rather than native provider integration.

**Rationale**: 
- Eliminates vendor lock-in concerns for individual developers
- Ensures feature parity regardless of chosen provider
- Enables seamless migration as project needs evolve
- Supports offline development with embedded database option

**Trade-offs**: 
- Additional abstraction layer complexity
- Potential performance overhead for provider-specific optimizations
- Requires ongoing maintenance as provider APIs evolve

### SQLite as Default Provider

**Decision**: Use embedded SQLite database as the default issue tracking provider.

**Rationale**:
- Zero external dependencies for immediate productivity
- High performance for typical project sizes (1000+ issues)
- Complete offline operation capability
- Linear-inspired schema enables easy migration to cloud providers
- No account setup or authentication friction

**Trade-offs**:
- No built-in team collaboration features
- Requires manual backup and synchronization for distributed teams
- Limited advanced reporting compared to enterprise solutions

### MCP Server Architecture

**Decision**: Build JCVD as a Claude Code MCP server rather than standalone application.

**Rationale**:
- Native integration with Claude Code ecosystem and existing tools
- Leverages established user workflows and interaction patterns
- Access to comprehensive file system and development tool integration
- Consistent with Claude Code's agent and subagent architecture

**Trade-offs**:
- Dependency on Claude Code platform for operation
- Limited portability to other AI development environments
- Requires understanding of MCP protocol for customization

### Linear-Inspired Data Schema

**Decision**: Model embedded database schema after Linear's structure and terminology.

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

**At Rest**: SQLite database files encrypted using system keychain integration
**In Transit**: All provider API communications use TLS 1.3 minimum
**API Keys**: Secure storage using platform-appropriate credential management

### Access Control

**Local Mode**: File system permissions protect project database and configuration
**Provider Integration**: Respect provider-specific access controls and team permissions
**Audit Trail**: Complete activity logging for all project state modifications

## Cross-References

- **Business Requirements**: See [PRD.md](./PRD.md) for functional requirements and success criteria
- **User Workflows**: See [USER_EXPERIENCE.md](./USER_EXPERIENCE.md) for detailed user interaction patterns
- **API Documentation**: See [API_SPEC.md](./API_SPEC.md) for detailed MCP server interface specifications
- **Deployment Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for installation and configuration instructions

---

This architecture provides the technical foundation for JCVD's comprehensive project orchestration capabilities while maintaining flexibility, performance, and developer control principles outlined in the product requirements.