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

## Development Workflows

### Core Documentation

- **[Branching Strategy](docs/development/branching-strategy.md)** - Standard branch naming and worktree patterns
- **[Single Feature Workflow](docs/development/single-feature-workflow.md)** - Standard process for individual features
- **[Linear Branch Integration](docs/development/linear-branch-integration.md)** - Linear issue to branch mapping

### Specialized Workflows

- **[Parallel Development](docs/testing/parallel-development.md)** - Multi-feature development with coordinated or autonomous execution
- **[Task Tool Workflow](.claude/workflows/task-tool-workflow.md)** - Interactive development with Task tool agents
- **[TDD Workflow](.claude/workflows/tdd-workflow.md)** - Test-driven development patterns
- **[Direct Implementation](.claude/workflows/direct-workflow.md)** - Direct feature implementation
- **[Bug Fix Workflow](.claude/workflows/bugfix-workflow.md)** - Systematic bug resolution

### Reference Documents

- **[Agent Reference](docs/reference/agents.md)** - Unified agent capabilities and selection guidelines
- **[Worktree Operations](docs/reference/worktree-operations.md)** - Complete worktree command reference
- **[Decision Guide](docs/reference/decision-guide.md)** - Workflow selection decision trees
- **[Troubleshooting](docs/reference/troubleshooting.md)** - Common issues and solutions

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
