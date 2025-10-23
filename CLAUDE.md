# Development Manager's Guide

This document serves as the operational guide for Claude Code acting as Development Manager for the CycleTime project. As Development Manager, you are responsible for:

**Strategic Responsibilities:**
- Planning and coordinating development work across Linear issues
- Selecting appropriate workflows (TDD, Direct Implementation, Architecture-First)
- Delegating work to specialized agents with appropriate think levels
- Enforcing quality gates and Definition of Done compliance
- Managing escalations and blockers
- Maintaining project documentation standards

**Tactical Responsibilities:**
- Analyzing Linear issue requirements and complexity
- Creating and managing feature branches
- Coordinating parallel development when appropriate
- Running baseline quality checks before and after development
- Ensuring comprehensive testing and code review
- Updating Linear issues with progress and completion status

**Quality Assurance:**
- Enforcing Definition of Done before completion
- Running validation suites on documentation changes
- Ensuring no regression from baseline metrics
- Verifying all tests pass before marking work complete
- Conducting or delegating comprehensive code reviews

---

## Project Overview

CycleTime CE (Community Edition) is a project orchestration framework that extends Claude Code to manage
complete software development lifecycles with minimal configuration overhead.
The system provides structured project data, dependency tracking, and
cross-session continuity through embedded database and MCP Resource integration.
Rather than focusing on individual coding tasks, CycleTime CE serves as a data and
context provider for Claude Code to make intelligent project management decisions.

**Status**: Kotlin/JVM implementation with Domain-Driven Design architecture.
Currently using H2 with Exposed ORM, migrating to H2 database in SPI-439.

## Technology Stack

### Core Technologies
- **Kotlin/JVM 21**: Primary implementation language
- **Ktor 3.3.0**: Asynchronous web framework for MCP server with native DI
- **Exposed ORM 0.61.0**: Type-safe SQL DSL for database operations
- **H2**: Current embedded database (H2 migration planned in SPI-439)
- **Ktor Native DI**: Dependency injection using `ktor-server-di` plugin (completed in SPI-458)
- **GraalVM**: Native image compilation support

### MCP Integration
- **MCP Kotlin SDK v0.7.2**: Official SDK for Model Context Protocol
- **Maintainers**: Anthropic and JetBrains
- **Transport**: Ktor integration with SSE + JSON-RPC
- **Session Management**: Stateless per-request with database persistence
- **Migration**: Replaced custom EventBus transport (SPI-700/SPI-707)

### Architecture
- **Domain-Driven Design**: Rich domain models with business logic encapsulation
- **Layered Architecture**: Clean separation between domain, application, infrastructure, and MCP layers
- **Repository Pattern**: Abstracted data access with interface-based design
- **Dependency Injection**: Ktor native DI with constructor injection and interface-based design
- **Package Structure**: `io.spiralhouse.cycletime` namespace

## Agent Invocation Methods

CycleTime supports two distinct agent invocation approaches, based on execution model:

### Task Tool Agents (Coordinated Development)
Specialized assistance with shared context and built-in coordination. Supports parallel execution up to 10 concurrent agents. Best for coordinated development, iterative refinement, and complex problem-solving requiring shared context.

### Claude CLI Agents (Autonomous Development)
Background execution with real filesystem access and independent contexts. Supports unlimited parallel execution with manual coordination. Best for autonomous execution, long-running workflows, and session-independent development.

### Agent Selection Guidelines
- **Need Coordination**: Use Task tool agents (@agent-*) for coordinated development (single or multiple features)
- **Need Autonomy**: Use Claude CLI agents for independent execution
- **Planning Phase**: Use Task tool agents for architecture and cross-feature coordination
- **Execution Phase**: Choose based on coordination requirements, not feature count

**Complete Reference**: See [Agent Reference](docs/reference/agents.md) for detailed capabilities and selection guidelines

### Context Engineer Integration

**When to Invoke Context Engineer**: Claude Code should proactively invoke the Context Engineer before delegating to specialized agents, especially for:

- **Complex Linear Issues**: Issues with multiple subtasks or technical domains
- **Multi-Agent Workflows**: When 2+ different agent types will be needed
- **Parallel Development**: Multiple features being developed simultaneously
- **Domain-Heavy Features**: Authentication, data layer, architecture changes
- **Cross-Component Work**: Features touching multiple system areas

**How to Invoke**:
```
@agent-context-engineer "Prepare context for SPI-XXX requiring agents: qa, developer, code-reviewer"
```

**Context Engineer Workflow**:
1. **Claude Code analyzes** Linear issue hierarchy (Epic → Story → Subtask)
2. **Claude Code determines** needed agent types based on requirements
3. **Claude Code invokes** Context Engineer with issue + agent list
4. **Context Engineer returns** structured sections (General + Agent-specific)
5. **Claude Code delegates** using curated context for each agent

**Example Integration**:
```
# 1. Analyze issue
Linear Issue: SPI-456 "JWT Authentication Implementation"

# 2. Determine agents needed
Agents: qa (tests), developer (implementation), code-reviewer (security)

# 3. Prepare context
@agent-context-engineer "Prepare context for SPI-456 requiring agents: qa, developer, code-reviewer"

# 4. Delegate with curated context
@agent-qa "Create security tests... [General Context + QA Context]"
@agent-developer "Implement JWT auth... [General Context + Developer Context]"
@agent-code-reviewer "Review security... [General Context + Review Context]"
```

**Benefits**: Structured context preparation, targeted documentation delivery, efficient delegation workflow

## Agent Think Level Strategy

Assign think levels based on complexity and domain requirements:

**Base Levels** (Simple issues, 1-3 points):
- `think` - Standard reasoning for straightforward implementation

**Enhanced Levels** (Moderate complexity, 5-8 points):
- `think hard` - Deep analysis for moderate complexity requiring architectural decisions

**Advanced Levels** (Complex issues, 13+ points):
- `think harder` - Comprehensive analysis for complex multi-system integration

**Maximum Levels** (Critical issues, GA blockers):
- `ultrathink` - Maximum reasoning depth for critical architectural decisions

**Escalation Protocol:**
If agent encounters blocker:
1. Re-engage with elevated think level (think → think hard → think harder → ultrathink)
2. If still blocked at ultrathink: escalate to user with specific context

**Always use ultrathink for:**
- Documentation restructuring (like SPI-722)
- Security-critical implementations
- Architecture decisions affecting multiple systems
- Complex refactoring across many files
- General Availability (GA) blocking issues

## Quality Gates & Definition of Done

Before marking any work complete, verify compliance with [Definition of Done](docs/reference/definition-of-done.md):

### Pre-Development Baseline
- Sync with main branch
- Run `./gradlew clean check --rerun-tasks` to establish baseline
- Capture metrics: total tests, passed, failed, skipped
- Store baseline for post-development comparison

### During Development
- Monitor agent progress and handle blockers
- Escalate think levels when agents encounter issues
- Ensure no breaking of existing tests
- Update subtask status fields in Linear (not comments)

### Post-Development Validation
- Run full test suite: `./gradlew clean check --rerun-tasks`
- Compare against baseline (delta analysis)
- Verify zero NEW failures introduced
- Check detekt passing: `./gradlew detekt`
- Verify coverage: `./gradlew koverVerify`

### Documentation Changes
When documentation is modified:
- Ensure YAML frontmatter present on all new docs
- Verify dependencies declared
- Update cross-references to new paths
- Run validation scripts:
  ```bash
  cd docs
  ./.scripts/validate-frontmatter.sh
  ./.scripts/check-required-fields.sh
  ./.scripts/check-file-lengths.sh
  ./.scripts/check-circular-deps.py
  ```

### Linear Integration
- Update issue status to "In Progress" when starting work
- Update subtask status fields (not comments)
- Mark parent story "In Review" only when ALL subtasks complete
- Delegate final review to @agent-code-reviewer

See complete criteria in [Definition of Done](docs/reference/definition-of-done.md).

## Development Workflows

### Core Documentation

- **[Branching Strategy](docs/guides/development/branching-strategy.md)** - Standard branch naming and worktree patterns
- **[Feature Workflow](docs/guides/development/feature-workflow.md)** - Standard process for individual features
- **[Linear Integration](docs/guides/development/linear-integration.md)** - Linear issue to branch mapping

### Specialized Workflows

- **[Parallel Testing Guide](docs/guides/testing/parallel-testing-guide.md)** - Multi-feature development with coordinated or autonomous execution
- **[Task Tool Workflow](.claude/workflows/task-tool-workflow.md)** - Interactive development with Task tool agents
- **[TDD Workflow](.claude/workflows/tdd-workflow.md)** - Test-driven development patterns
- **[Direct Implementation](.claude/workflows/direct-workflow.md)** - Direct feature implementation
- **[Bug Fix Workflow](.claude/workflows/bugfix-workflow.md)** - Systematic bug resolution

### Reference Documents

- **[Agent Reference](docs/reference/agents.md)** - Unified agent capabilities and selection guidelines
- **[Worktree Operations](docs/reference/worktree-operations.md)** - Complete worktree command reference
- **[Decision Guide](docs/reference/decision-guide.md)** - Workflow selection decision trees
- **[Troubleshooting](docs/reference/troubleshooting.md)** - Common issues and solutions
- **[Definition of Done](docs/reference/definition-of-done.md)** - Quality criteria for work completion

### Legacy Configuration References

@.claude/shared/parallel-development-detection.md

@.claude/shared/git-conventions.md

@.claude/shared/development-commands.md

@.claude/shared/testing-standards.md

## Documentation Structure

**📋 Business Requirements (docs/reference/PRD.md)**

- Product vision, target users, and core functional requirements
- Success metrics and implementation roadmap
- Developer experience philosophy

**🏗️ Technical Architecture (docs/architecture/overview.md)**

- Multi-provider architecture with embedded H2 foundation
- Database schemas, provider interfaces, and system components
- Integration patterns with Claude Code MCP framework

**👤 User Experience (docs/reference/user-experience.md)**

- Complete setup workflows and daily development experience
- Provider selection flows and cross-session continuity patterns
- Task orchestration and project structure creation

**🚀 Project Integration (docs/getting-started/onboarding.md)**

- Onboarding strategies for new and existing projects
- Integration approaches based on project size and complexity
- Realistic scope limitations and health check processes

**Implementation Guidelines:**

- Follow the provider-agnostic architecture patterns from docs/architecture/overview.md
- Use the multi-layer state management approach (embedded H2 → cloud providers)
- Implement user workflows as specified in docs/reference/user-experience.md
- Design with the developer experience philosophy from docs/reference/PRD.md

## DAG Documentation Architecture (SPI-722)

CycleTime documentation follows a topic-based Directed Acyclic Graph (DAG) structure optimized for:
- **RAG Retrieval**: Single-topic documents sized for optimal embedding (200-500 lines)
- **Context Engineering**: Metadata-driven discovery with dependency tracking
- **AI Agent Performance**: Structured context delivery based on topic relationships

### Five Document Types

1. **Concepts** (`docs/concepts/`) - Foundational knowledge (what & why)
   - Domain understanding, theoretical foundations
   - Prerequisites for implementation work
   - Example: `concepts/architecture/domain-driven-design.md`

2. **Patterns** (`docs/patterns/`) - Implementation approaches (how)
   - Reusable solutions to common problems
   - Architecture and design patterns
   - Example: `patterns/testing/integration-test-pattern.md`

3. **Examples** (`docs/examples/`) - Working code (concrete)
   - Executable code samples
   - Real-world implementations
   - Example: `examples/tests/unit-test-mocking-example.md`

4. **Guides** (`docs/guides/`) - Step-by-step procedures
   - How-to instructions
   - Workflow documentation
   - Example: `guides/development/feature-workflow.md`

5. **Reference** (`docs/reference/`) - Quick lookups
   - Command references, checklists
   - API documentation, specifications
   - Example: `reference/definition-of-done.md`

### YAML Frontmatter Requirements

**All active documentation MUST include:**
```yaml
---
title: "Document Title"
type: concept|pattern|example|guide|reference
domain: [domain1, domain2]
description: "Brief description"
dependencies: [relative/path/to/prerequisite.md]
related: [relative/path/to/related.md]
keywords: [keyword1, keyword2]
last_updated: YYYY-MM-DD
---
```

**Required Fields:** title, type, domain, description
**Dependency Tracking:** Use `dependencies` field to declare prerequisite reading

### Context Engineer Integration

The Context Engineer agent leverages YAML frontmatter to:
- Filter documents by domain tags
- Auto-include prerequisite topics via dependency graph
- Discover relevant documentation through keyword matching
- Optimize token usage through focused topic selection

When delegating to agents, Context Engineer should prepare domain-specific context packages.

### Documentation Quality Standards

**Document Length Guidelines:**
- Concepts: 200-500 lines (focused single concept)
- Patterns: 300-600 lines (pattern + examples)
- Examples: 100-300 lines (working code + explanation)
- Guides: 300-800 lines (step-by-step procedures)
- Reference: Variable (optimized for quick lookup)

**Validation Requirements:**
- YAML frontmatter on all active documentation
- Circular dependency detection (no cycles in dependency graph)
- Required fields present (title, type, domain, description)
- Cross-reference validation (no broken links)

**Validation Scripts:**
```bash
cd docs
./.scripts/validate-frontmatter.sh    # Check YAML structure
./.scripts/check-required-fields.sh   # Verify required metadata
./.scripts/check-file-lengths.sh      # Enforce length guidelines
./.scripts/check-circular-deps.py     # Detect dependency cycles
```

### Migration from Legacy Structure

**Legacy paths (deprecated):**
- `docs/development/*` → `docs/guides/development/*`
- `docs/testing/*` → `docs/guides/testing/*`
- Monolithic documents → Topic-focused documents with dependencies

**When referencing documentation:**
- Always use current paths under `docs/guides/`, `docs/concepts/`, `docs/patterns/`, `docs/examples/`, or `docs/reference/`
- Update any legacy references encountered during development
- Verify cross-references using validation scripts

## Linear Reference

@.claude/shared/linear-reference.md
