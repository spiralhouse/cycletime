# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

CycleTime CE (Community Edition) is a project orchestration framework that extends Claude Code to manage
complete software development lifecycles with minimal configuration overhead.
The system provides structured project data, dependency tracking, and 
cross-session continuity through embedded database and MCP Resource integration.
Rather than focusing on individual coding tasks, CycleTime CE serves as a data and 
context provider for Claude Code to make intelligent project management decisions.

**Status**: Kotlin/JVM implementation with Domain-Driven Design architecture.
Currently using SQLite with Exposed ORM, migrating to H2 database in SPI-439.

## Technology Stack

### Core Technologies
- **Kotlin/JVM 21**: Primary implementation language
- **Ktor 3.2.3**: Asynchronous web framework for MCP server with native DI
- **Exposed ORM 0.58.0**: Type-safe SQL DSL for database operations
- **SQLite**: Current embedded database (H2 migration planned in SPI-439)
- **Ktor Native DI**: Dependency injection using `ktor-server-di` plugin (completed in SPI-458)
- **GraalVM**: Native image compilation support

### Architecture
- **Domain-Driven Design**: Rich domain models with business logic encapsulation
- **Layered Architecture**: Clean separation between domain, application, infrastructure, and MCP layers
- **Repository Pattern**: Abstracted data access with interface-based design
- **Dependency Injection**: Ktor native DI with constructor injection and interface-based design
- **Package Structure**: `io.spiralhouse.cycletime` namespace

## Agent Invocation Methods

CycleTime supports two distinct agent invocation approaches, each optimized for different development scenarios:

### Task Tool Agents (Interactive Development)

For most single-feature development, use Task tool agent delegation:

1. **Code Review Agent** (@agent-code-reviewer) Code review, feedback, and quality checks
2. **Developer Agent** (@agent-developer) Code implementation, unit testing
3. **Product Manager Agent** (@agent-product-manager) Requirements gathering, stakeholder communication
4. **QA Agent** (@agent-qa) Test planning, quality assurance
5. **Software Architect Agent** (@agent-software-architect) System design, architecture decisions
6. **Tech Lead Agent** (@agent-tech-lead) Task coordination, dependency management
7. **DevOps Engineer Agent** (@agent-devops-engineer) Build optimization, CI/CD pipelines, developer productivity

**Best for**: Interactive development, iterative refinement, complex problem-solving, single features

### Claude CLI Agents (Parallel Development)

For parallel development across multiple features, use Claude CLI agents with background execution and real filesystem access.

**Best for**: True parallel execution, automated workflows, multiple independent features

### Agent Selection Guidelines

- **Single Feature**: Use Task tool agents (@agent-*) for interactive development
- **Multiple Features**: Use Claude CLI agents for parallel execution
- **Planning Phase**: Use Task tool agents for architecture and coordination
- **Execution Phase**: Use Claude CLI agents for implementation across worktrees

**See**: [Agent Invocation Patterns](docs/development/agent-invocation-patterns.md) for detailed guidance

## Development Workflows

### Core Workflow Documentation

- **[Branching Strategy](docs/development/branching-strategy.md)** - Standard branch naming and worktree patterns
- **[Single Feature Workflow](docs/development/single-feature-workflow.md)** - Standard process for individual features
- **[Agent Invocation Patterns](docs/development/agent-invocation-patterns.md)** - Task tool vs Claude CLI guidance
- **[Linear Branch Integration](docs/development/linear-branch-integration.md)** - Linear issue to branch mapping

### Specialized Workflows

- **[Parallel Development](docs/testing/parallel-development.md)** - Multi-feature development with Claude CLI agents
- **[Task Tool Workflow](.claude/workflows/task-tool-workflow.md)** - Interactive development with Task tool agents
- **[TDD Workflow](.claude/workflows/tdd-workflow.md)** - Test-driven development patterns
- **[Direct Implementation](.claude/workflows/direct-workflow.md)** - Direct feature implementation
- **[Bug Fix Workflow](.claude/workflows/bugfix-workflow.md)** - Systematic bug resolution

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

- Multi-provider architecture with embedded SQLite foundation
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
- Use the multi-layer state management approach (embedded SQLite → cloud providers)
- Implement user workflows as specified in docs/reference/user-experience.md
- Design with the developer experience philosophy from docs/reference/PRD.md

## Linear Reference

@.claude/shared/linear-reference.md
