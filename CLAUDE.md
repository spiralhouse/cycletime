# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

JCVD is a project orchestration framework that extends Claude Code to manage
complete software development lifecycles with minimal configuration overhead.
The system provides structured project data, dependency tracking, and 
cross-session continuity through embedded database and MCP Resource integration.
Rather than focusing on individual coding tasks, JCVD serves as a data and 
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
- **Package Structure**: `io.spiralhouse.jcvd` namespace

## Agents

Unless otherwise specified, please delegate tasks to the appropriate agent based
on the task type. Your role is to orchestrate and manage the workflow, not to do
work directly unless otherwise instructed to.

1. **Code Review Agent** (@agent-code-reviewer) Code review, feedback, and
   quality checks
2. **Developer Agent** (@agent-developer) Code implementation, unit testing
3. **Product Manager Agent** (@agent-product-manager) Requirements gathering,
   stakeholder communication
4. **QA Agent** (@agent-qa) Test planning, quality assurance
5. **Software Architect Agent** (@agent-software-architect) System design,
   architecture decisions
6. **Tech Lead Agent** (@agent-tech-lead) Task coordination, dependency
   management
7. **DevOps Engineer Agent** (@agent-devops-engineer) Build optimization,
   CI/CD pipelines, developer productivity

## Parallel Development Opportunities

@.claude/shared/parallel-development-detection.md

## Git Branch Naming Conventions

@.claude/shared/git-conventions.md

## Development Commands

@.claude/shared/development-commands.md

## Testing Standards & Architecture

@.claude/shared/testing-standards.md

## Documentation Structure

**📋 Business Requirements (docs/PRD.md)**

- Product vision, target users, and core functional requirements
- Success metrics and implementation roadmap
- Developer experience philosophy

**🏗️ Technical Architecture (docs/ARCHITECTURE.md)**

- Multi-provider architecture with embedded SQLite foundation
- Database schemas, provider interfaces, and system components
- Integration patterns with Claude Code MCP framework

**👤 User Experience (docs/USER_EXPERIENCE.md)**

- Complete setup workflows and daily development experience
- Provider selection flows and cross-session continuity patterns
- Task orchestration and project structure creation

**🚀 Project Integration (docs/ONBOARDING.md)**

- Onboarding strategies for new and existing projects
- Integration approaches based on project size and complexity
- Realistic scope limitations and health check processes

**Implementation Guidelines:**

- Follow the provider-agnostic architecture patterns from ARCHITECTURE.md
- Use the multi-layer state management approach (embedded SQLite → cloud
  providers)
- Implement user workflows as specified in USER_EXPERIENCE.md
- Design with the developer experience philosophy from PRD.md

## Linear Reference

@.claude/shared/linear-reference.md
