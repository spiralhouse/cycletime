# JCVD Project Structure

## Overview

This document defines the repository structure for JCVD, a **simplified data and
context provider** for Claude Code project management. The system provides
structured project data, dependency tracking, and cross-session continuity
through embedded SQLite database and MCP Resource integration.

## Root Directory Structure

```
jcvd/                                    # Root project directory
├── README.md                            # Project overview and quick start
├── LICENSE                              # MIT License
├── CLAUDE.md                            # Claude Code instructions and agent configuration
├── PROJECT_STRUCTURE.md                 # This document
├── DEVELOPMENT_GUIDE.md                 # Development setup and workflow guide
├── SESSION_SUMMARY.md                   # Development session notes
├── package.json                         # Project dependencies and scripts
├── package-lock.json                    # Dependency lock file
├── tsconfig.json                        # TypeScript configuration
├── tsconfig.build.json                  # Production build configuration
├── tsconfig.eslint.json                 # ESLint TypeScript configuration
├── eslint.config.js                     # ESLint flat configuration
├── vitest.config.ts                     # Vitest test configuration
├── .gitignore                           # Git ignore patterns
├── .nvmrc                               # Node version specification
├── .editorconfig                        # Editor configuration
│
├── docs/                                # Documentation
│   ├── ARCHITECTURE.md                  # System architecture and principles
│   ├── PRD.md                          # Product requirements document
│   ├── USER_EXPERIENCE.md              # User workflows and experience design
│   ├── ONBOARDING.md                   # Project integration patterns
│   ├── LIMITATIONS.md                  # Scope boundaries and restrictions
│   ├── MCP_RESOURCES.md                # MCP Resources specification
│   └── technical-design/               # Technical design documents
│       └── SPI-290-mcp-resource-integration.md  # Example technical design
│
├── src/                                 # Source code
│   ├── index.ts                        # Main entry point
│   ├── cli.ts                          # CLI interface
│   ├── mcp-server.ts                   # MCP server implementation
│   ├── sqlite-store.ts                 # SQLite database layer
│   ├── jcvd-simple.ts                  # Core JCVD functionality
│   ├── types.ts                        # Main type definitions
│   ├── types/                          # TypeScript type definitions
│   │   └── index.ts                    # Consolidated type exports
│   └── utils/                          # Utility functions
│       ├── index.ts                    # Utility exports
│       └── logger.ts                   # Logging utilities
│
├── tests/                              # Test suites
│   ├── setup.ts                        # Test setup and globals
│   ├── fixtures/                       # Test fixtures and data
│   └── integration/                    # Integration tests
│       └── jcvd-simple.test.ts        # Core functionality tests
│
├── examples/                           # Example configurations
│   ├── README.md                       # Examples overview
│   └── quick-start/                    # Getting started examples
│       └── basic-workflow.json         # Basic workflow example
│
└── dist/                               # Build output (gitignored)
    └── [compiled output]               # TypeScript compilation results
```

## Architecture Principles

### Simplicity First

- **Data and context provider**, not orchestration manager
- **Claude Code integration** through MCP Resources and Tools
- **Simple CRUD operations** and basic dependency tracking
- **SQLite-first approach** with embedded database

### Core Components

1. **MCP Server** (`src/mcp-server.ts`) - Integration with Claude Code via Model
   Context Protocol
2. **SQLite Store** (`src/sqlite-store.ts`) - Embedded database for project data
   persistence
3. **JCVD Core** (`src/jcvd-simple.ts`) - Main functionality and context
   provision
4. **CLI Interface** (`src/cli.ts`) - Command-line interface for direct usage
5. **Type System** (`src/types/`) - TypeScript definitions for data models

## File Naming Conventions

### TypeScript Files

- **kebab-case** for modules: `mcp-server.ts`, `sqlite-store.ts`,
  `jcvd-simple.ts`
- **camelCase** for utilities: `logger.ts`
- **PascalCase** for classes within files

### Configuration Files

- **kebab-case** for config files: `eslint.config.js`, `vitest.config.ts`
- **dot notation** for TypeScript configs: `tsconfig.json`,
  `tsconfig.build.json`

### Test Files

- **Same as source + .test.ts**: `jcvd-simple.test.ts`

### Documentation Files

- **SCREAMING_SNAKE_CASE** for root docs: `README.md`, `ARCHITECTURE.md`
- **[LINEAR-ID]-[short-name].md** for technical designs:
  `SPI-290-mcp-resource-integration.md`

## Module Organization Principles

### 1. Flat Structure

- **Simple hierarchy** with minimal nesting to reduce complexity
- **Related functionality** grouped in logical modules

### 2. Clear Separation of Concerns

- **MCP Integration**: Protocol-specific code for Claude Code integration
- **Database Layer**: SQLite operations and data persistence
- **Core Logic**: Business logic and context provision
- **CLI Interface**: Command-line interaction
- **Types**: TypeScript definitions and interfaces

### 3. Context Provision Focus

- **MCP Resources**: Expose project data to Claude Code
- **CRUD Operations**: Basic create, read, update, delete functionality
- **Session State**: Cross-session continuity and state management

## Import Path Strategy

### Direct Imports

Simple relative imports for the flat structure:

```typescript
// Within src/ directory
import { JCVDSimple } from './jcvd-simple';
import { SQLiteStore } from './sqlite-store';
import { logger } from './utils/logger';
```

### Type Imports

Explicit type-only imports for better tree-shaking:

```typescript
import type { ProjectData, IssueData } from './types';
```

## Development Workflow Integration

### Technical Design Process

- **Epic-level features** require technical design documents in
  `docs/technical-design/`
- **Naming convention**: `[LINEAR-ID]-[short-name].md`
- **Architecture alignment** with existing documentation required

### Branch Strategy

- **Feature branches**: `feat/[linear-id]-[short-name]`
- **Technical design PRs** before implementation
- **Linear issue tracking** for progress management

## Configuration Management

### Environment Configuration

- **.env files** in project root (not committed)
- **Configuration loading** through environment variables
- **Default values** in source code

### Build Configuration

- **Development**: In-memory compilation via `tsx`
- **Production**: Compiled to `dist/` directory
- **Testing**: Vitest configuration for unit and integration tests

## Database Architecture

### SQLite-First Approach

- **Embedded database** for offline operation
- **Linear-inspired schema** for easy cloud provider migration
- **Migration support** for schema evolution
- **Performance optimization** with indexes

### Data Models

- **Projects**: Basic project metadata and configuration
- **Issues**: Epic → Story → Subtask hierarchy
- **Dependencies**: Simple blocking relationships
- **Workflow States**: Status tracking for issues

## Key Design Decisions

### 1. Simplified Architecture

The current structure reflects a **dramatic simplification** from earlier
complex designs:

- **Removed**: Multi-agent orchestration, complex workflow engines
- **Kept**: Data provision, context management, MCP integration
- **Focus**: Simple CRUD operations and cross-session state

### 2. MCP Integration

- **Claude Code native integration** through Model Context Protocol
- **Resource exposure** for project context
- **Tool provision** for basic operations
- **No agent coordination** - leverages Claude Code's existing capabilities

### 3. SQLite Embedded Database

- **Zero external dependencies** for core functionality
- **High performance** for typical project sizes
- **Complete offline operation**
- **Easy migration path** to cloud providers when needed

### 4. Context Provision Over Automation

- **Expose structured data** for Claude Code analysis
- **Manual workflows** with context support
- **Human-driven decisions** supported by data access
- **No complex automation** or intelligent analysis

## Scope Boundaries

### ✅ What JCVD Does

- **Data Storage**: SQLite database for project data
- **Context Provision**: MCP Resources exposing project information
- **Basic Operations**: CRUD operations for issues and projects
- **State Persistence**: Cross-session continuity

### ❌ What JCVD Does NOT Do

- **Complex Analysis**: No LLM-powered analysis or recommendations
- **Agent Coordination**: No multi-agent orchestration
- **Workflow Automation**: No automated task progression
- **Advanced UI**: No web dashboards or graphical interfaces

## Testing Strategy

### Test Organization

- **Unit tests** for individual modules
- **Integration tests** for end-to-end workflows
- **Fixtures** for consistent test data
- **Setup utilities** for test environment

### Coverage Goals

- **>80% test coverage** for core functionality
- **Error scenario testing** for robust error handling
- **MCP integration testing** for Claude Code compatibility

## Future Growth Patterns

### Provider Expansion

- **Additional providers** (Linear, GitHub Issues) as separate modules
- **Provider interface** for consistent API
- **Data migration tools** for switching between providers

### MCP Resources Expansion

- **New resource types** as demand requires
- **Enhanced context provision** without complex analysis
- **Performance optimizations** for larger projects

This structure supports JCVD's vision as a **focused, reliable data and context
provider** that enhances Claude Code's capabilities without competing with them
or introducing unnecessary complexity.
