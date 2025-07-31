# JCVD Project Structure

## Overview

This document defines the complete repository structure for the JCVD multi-agent orchestration framework, organized around the 7 specialized agents and provider-agnostic architecture.

## Root Directory Structure

```
jcvd/                                    # Root project directory
├── README.md                            # Project overview and quick start
├── LICENSE                              # MIT License
├── CHANGELOG.md                         # Version history and changes
├── package.json                         # Project dependencies and scripts
├── package-lock.json                    # Dependency lock file
├── tsconfig.json                        # TypeScript configuration
├── tsconfig.build.json                  # Production build configuration
├── eslint.config.js                     # ESLint flat configuration
├── vitest.config.ts                     # Vitest test configuration
├── .gitignore                           # Git ignore patterns
├── .gitattributes                       # Git attributes
├── .nvmrc                               # Node version specification
├── .editorconfig                        # Editor configuration
│
├── docs/                                # Documentation
│   ├── ARCHITECTURE.md                  # System architecture (existing)
│   ├── PRD.md                          # Product requirements (existing)
│   ├── USER_EXPERIENCE.md              # User workflows (existing)
│   ├── ONBOARDING.md                   # Project integration (existing)
│   ├── TECHNOLOGY_DECISIONS.md         # Tech stack decisions (new)
│   ├── API.md                          # API documentation
│   ├── DEVELOPMENT.md                  # Development guide
│   ├── TROUBLESHOOTING.md              # Common issues and solutions
│   └── diagrams/                       # Architecture diagrams (Mermaid)
│       ├── system-overview.md
│       ├── agent-interactions.md
│       ├── data-flow.md
│       └── provider-abstraction.md
│
├── src/                                 # Source code
│   ├── index.ts                        # Main entry point
│   ├── cli.ts                          # CLI interface
│   ├── types/                          # TypeScript type definitions
│   │   ├── index.ts                    # Consolidated exports
│   │   ├── agents.ts                   # Agent interfaces
│   │   ├── providers.ts                # Provider interfaces
│   │   ├── config.ts                   # Configuration types
│   │   ├── database.ts                 # Database schema types
│   │   └── workflows.ts                # Workflow types
│   │
│   ├── core/                           # Core framework components
│   │   ├── index.ts                    # Core exports
│   │   ├── orchestrator.ts             # Main orchestration engine
│   │   ├── agent-factory.ts            # Agent instantiation
│   │   ├── config-manager.ts           # Configuration management
│   │   ├── state-manager.ts            # Multi-layer state management
│   │   ├── workflow-engine.ts          # Workflow execution engine
│   │   └── event-bus.ts                # Inter-agent communication
│   │
│   ├── database/                       # Database layer
│   │   ├── index.ts                    # Database exports
│   │   ├── connection.ts               # SQLite connection management
│   │   ├── migrations/                 # Database migrations
│   │   │   ├── index.ts                # Migration runner
│   │   │   ├── 001-initial-schema.ts   # Initial database schema
│   │   │   ├── 002-agent-states.ts     # Agent state tables
│   │   │   └── 003-provider-sync.ts    # Provider synchronization
│   │   ├── models/                     # Database models
│   │   │   ├── index.ts                # Model exports
│   │   │   ├── workflow.ts             # Workflow model
│   │   │   ├── task.ts                 # Task model
│   │   │   ├── agent-state.ts          # Agent state model
│   │   │   └── provider-sync.ts        # Provider sync model
│   │   └── queries/                    # SQL queries
│   │       ├── index.ts                # Query exports
│   │       ├── workflows.ts            # Workflow queries
│   │       ├── tasks.ts                # Task queries
│   │       └── agents.ts               # Agent queries
│   │
│   ├── agents/                         # Agent implementations
│   │   ├── index.ts                    # Agent exports
│   │   ├── base/                       # Base agent classes
│   │   │   ├── index.ts                # Base exports
│   │   │   ├── agent.ts                # Abstract base agent
│   │   │   ├── mcp-agent.ts           # MCP-enabled agent base
│   │   │   └── stateful-agent.ts      # Stateful agent base
│   │   │
│   │   ├── product-manager/            # Product Manager Agent
│   │   │   ├── index.ts                # PM agent exports
│   │   │   ├── product-manager.ts      # Main PM implementation
│   │   │   ├── requirements-gatherer.ts # Requirements gathering
│   │   │   ├── stakeholder-comm.ts     # Stakeholder communication
│   │   │   └── acceptance-criteria.ts  # Acceptance criteria generation
│   │   │
│   │   ├── tech-lead/                  # Tech Lead Agent
│   │   │   ├── index.ts                # TL agent exports
│   │   │   ├── tech-lead.ts            # Main TL implementation
│   │   │   ├── task-coordinator.ts     # Task coordination
│   │   │   ├── dependency-manager.ts   # Dependency management
│   │   │   └── progress-tracker.ts     # Progress tracking
│   │   │
│   │   ├── architect/                  # Software Architect Agent
│   │   │   ├── index.ts                # Architect exports
│   │   │   ├── architect.ts            # Main architect implementation
│   │   │   ├── system-designer.ts      # System design
│   │   │   ├── decision-recorder.ts    # Architecture decisions
│   │   │   └── pattern-definer.ts      # Pattern definitions
│   │   │
│   │   ├── developer/                  # Developer Agent
│   │   │   ├── index.ts                # Developer exports
│   │   │   ├── developer.ts            # Main developer implementation
│   │   │   ├── code-generator.ts       # Code generation
│   │   │   ├── test-writer.ts          # Unit test writing
│   │   │   └── refactorer.ts           # Code refactoring
│   │   │
│   │   ├── qa/                         # QA Agent
│   │   │   ├── index.ts                # QA exports
│   │   │   ├── qa.ts                   # Main QA implementation
│   │   │   ├── test-planner.ts         # Test planning
│   │   │   ├── quality-checker.ts      # Quality assurance
│   │   │   └── bug-reporter.ts         # Bug reporting
│   │   │
│   │   ├── devops/                     # DevOps Agent
│   │   │   ├── index.ts                # DevOps exports
│   │   │   ├── devops.ts               # Main DevOps implementation
│   │   │   ├── infra-manager.ts        # Infrastructure management
│   │   │   ├── ci-cd-manager.ts        # CI/CD pipeline management
│   │   │   └── deployment-manager.ts   # Deployment management
│   │   │
│   │   └── release-engineer/           # Release Engineer Agent
│   │       ├── index.ts                # RE exports
│   │       ├── release-engineer.ts     # Main RE implementation
│   │       ├── release-coordinator.ts  # Release coordination
│   │       ├── version-manager.ts      # Version management
│   │       └── rollback-manager.ts     # Rollback management
│   │
│   ├── providers/                      # Provider implementations
│   │   ├── index.ts                    # Provider exports
│   │   ├── base/                       # Base provider classes
│   │   │   ├── index.ts                # Base exports
│   │   │   ├── provider.ts             # Abstract base provider
│   │   │   └── sync-provider.ts        # Synchronizable provider
│   │   │
│   │   ├── linear/                     # Linear provider
│   │   │   ├── index.ts                # Linear exports
│   │   │   ├── linear-provider.ts      # Main Linear implementation
│   │   │   ├── issue-manager.ts        # Issue management
│   │   │   ├── project-manager.ts      # Project management
│   │   │   └── sync-manager.ts         # Linear sync logic
│   │   │
│   │   ├── github/                     # GitHub provider (future)
│   │   │   ├── index.ts                # GitHub exports
│   │   │   ├── github-provider.ts      # Main GitHub implementation
│   │   │   └── repo-manager.ts         # Repository management
│   │   │
│   │   └── local/                      # Local filesystem provider
│   │       ├── index.ts                # Local exports
│   │       ├── local-provider.ts       # Main local implementation
│   │       └── file-manager.ts         # File management
│   │
│   ├── mcp/                            # MCP integration layer
│   │   ├── index.ts                    # MCP exports
│   │   ├── server.ts                   # MCP server implementation
│   │   ├── tools/                      # MCP tools
│   │   │   ├── index.ts                # Tools exports
│   │   │   ├── workflow-tools.ts       # Workflow management tools
│   │   │   ├── agent-tools.ts          # Agent interaction tools
│   │   │   └── provider-tools.ts       # Provider management tools
│   │   └── handlers/                   # MCP request handlers
│   │       ├── index.ts                # Handler exports
│   │       ├── workflow-handler.ts     # Workflow requests
│   │       ├── task-handler.ts         # Task requests
│   │       └── status-handler.ts       # Status requests
│   │
│   ├── config/                         # Configuration management
│   │   ├── index.ts                    # Config exports
│   │   ├── loader.ts                   # Configuration loader
│   │   ├── validator.ts                # Configuration validation
│   │   ├── defaults.ts                 # Default configurations
│   │   └── schema.ts                   # Configuration schema
│   │
│   └── utils/                          # Utility functions
│       ├── index.ts                    # Util exports
│       ├── logger.ts                   # Logging utilities
│       ├── errors.ts                   # Error definitions
│       ├── async.ts                    # Async utilities
│       ├── validation.ts               # Validation helpers
│       └── filesystem.ts               # File system utilities
│
├── tests/                              # Test suites
│   ├── setup.ts                        # Test setup and globals
│   ├── fixtures/                       # Test fixtures and data
│   │   ├── workflows/                  # Sample workflow configs
│   │   ├── databases/                  # Test database files
│   │   └── configs/                    # Test configurations
│   │
│   ├── unit/                           # Unit tests
│   │   ├── core/                       # Core component tests
│   │   ├── agents/                     # Agent tests
│   │   ├── providers/                  # Provider tests
│   │   ├── database/                   # Database tests
│   │   └── utils/                      # Utility tests
│   │
│   ├── integration/                    # Integration tests
│   │   ├── agent-coordination/         # Agent interaction tests
│   │   ├── provider-sync/              # Provider synchronization tests
│   │   ├── workflow-execution/         # End-to-end workflow tests
│   │   └── mcp-integration/            # MCP integration tests
│   │
│   └── e2e/                           # End-to-end tests
│       ├── complete-workflows/         # Full workflow scenarios
│       ├── multi-provider/             # Multi-provider scenarios
│       └── performance/                # Performance tests
│
├── examples/                           # Example configurations and workflows
│   ├── README.md                       # Examples overview
│   ├── quick-start/                    # Getting started examples
│   │   ├── basic-workflow.yml          # Simple workflow example
│   │   ├── linear-integration.yml      # Linear provider example
│   │   └── local-development.yml       # Local development example
│   │
│   ├── advanced/                       # Advanced examples
│   │   ├── multi-provider.yml          # Multiple provider setup
│   │   ├── custom-agents.yml           # Custom agent configuration
│   │   └── complex-workflow.yml        # Complex workflow example
│   │
│   └── templates/                      # Project templates
│       ├── new-project/                # New project template
│       ├── existing-project/           # Existing project template
│       └── enterprise/                 # Enterprise template
│
├── scripts/                           # Development and build scripts
│   ├── build.sh                       # Production build script
│   ├── dev.sh                         # Development server script
│   ├── test.sh                        # Test runner script
│   ├── lint.sh                        # Linting script
│   ├── migrate.sh                     # Database migration script
│   └── setup.sh                       # Initial setup script
│
├── .vscode/                           # VS Code configuration
│   ├── settings.json                  # Workspace settings
│   ├── extensions.json                # Recommended extensions
│   ├── tasks.json                     # Task definitions
│   └── launch.json                    # Debug configurations
│
├── .github/                           # GitHub Actions and templates
│   ├── workflows/                     # CI/CD workflows
│   │   ├── ci.yml                     # Continuous integration
│   │   ├── release.yml                # Release automation
│   │   └── docs.yml                   # Documentation updates
│   ├── ISSUE_TEMPLATE/                # Issue templates
│   └── PULL_REQUEST_TEMPLATE.md       # PR template
│
└── dist/                              # Build output (gitignored)
    ├── src/                           # Compiled source
    ├── types/                         # Generated type definitions
    └── docs/                          # Generated documentation
```

## File Naming Conventions

### TypeScript Files
- **PascalCase** for classes: `ProductManager.ts`, `WorkflowEngine.ts`
- **kebab-case** for modules: `task-coordinator.ts`, `state-manager.ts`
- **camelCase** for utilities: `asyncUtils.ts`, `configLoader.ts`

### Configuration Files
- **kebab-case** for config files: `eslint.config.js`, `vitest.config.ts`
- **SCREAMING_SNAKE_CASE** for environment: `.env.production`

### Test Files
- **Same as source + .test.ts**: `orchestrator.test.ts`
- **Same as source + .spec.ts**: `workflow-engine.spec.ts`

## Directory Organization Principles

### 1. Domain-Driven Structure
Each major domain (agents, providers, core) has its own directory with clear boundaries.

### 2. Agent Isolation
Each agent has its own directory with specialized modules, enabling independent development.

### 3. Provider Abstraction
Provider implementations are isolated but follow consistent interfaces.

### 4. Test Organization
Tests mirror source structure for easy navigation and maintenance.

### 5. Documentation Co-location
Related documentation lives near the code it describes.

## Module Export Strategy

### Barrel Exports
Each directory includes an `index.ts` file that re-exports public APIs:

```typescript
// src/agents/index.ts
export { ProductManager } from './product-manager';
export { TechLead } from './tech-lead';
export { Architect } from './architect';
// ... other agents
```

### Internal vs External APIs
- **Internal**: Direct imports within the same domain
- **External**: Imports through barrel exports only

### Type-Only Exports
Separate type definitions to enable tree-shaking:

```typescript
// src/types/index.ts
export type { AgentInterface } from './agents';
export type { ProviderInterface } from './providers';
```

## Configuration File Locations

### Root Level Configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript compilation settings
- `eslint.config.js` - Linting rules
- `vitest.config.ts` - Test configuration

### Workspace Configuration
- `.vscode/` - Editor-specific settings
- `.github/` - Repository automation

### Environment Configuration
- `.env` files in project root (not committed)
- Environment-specific configs in `src/config/`

## Build Output Structure

### Development Build
- In-memory compilation via `tsx`
- Source maps enabled
- Fast rebuild on changes

### Production Build
```
dist/
├── src/           # Compiled JavaScript
├── types/         # TypeScript declarations
└── package.json   # Production dependencies only
```

## Import Path Strategy

### Absolute Imports
Configure TypeScript path mapping for clean imports:

```typescript
// Instead of: ../../../core/orchestrator
import { Orchestrator } from '@/core/orchestrator';

// Instead of: ../../types/agents
import type { AgentInterface } from '@/types/agents';
```

### Path Mapping Configuration
```json
{
  "baseUrl": "./src",
  "paths": {
    "@/*": ["*"],
    "@/types/*": ["types/*"],
    "@/core/*": ["core/*"],
    "@/agents/*": ["agents/*"],
    "@/providers/*": ["providers/*"]
  }
}
```

## Agent Directory Deep Dive

Each agent follows consistent internal structure:

```
agents/product-manager/
├── index.ts                    # Public API exports
├── product-manager.ts          # Main agent implementation
├── capabilities/               # Agent-specific capabilities
│   ├── requirements-gatherer.ts
│   ├── stakeholder-comm.ts
│   └── acceptance-criteria.ts
├── types.ts                   # Agent-specific types
├── config.ts                  # Agent configuration
└── __tests__/                 # Agent-specific tests
    ├── product-manager.test.ts
    └── capabilities/
```

## Provider Directory Deep Dive

Each provider implements standard interfaces:

```
providers/linear/
├── index.ts                   # Provider exports
├── linear-provider.ts         # Main provider implementation
├── client/                    # API client
│   ├── linear-client.ts
│   └── types.ts
├── sync/                      # Synchronization logic
│   ├── sync-manager.ts
│   └── sync-strategies.ts
├── mappers/                   # Data transformation
│   ├── issue-mapper.ts
│   └── project-mapper.ts
└── __tests__/                 # Provider tests
```

## Database Directory Structure

Organized for maintainable database management:

```
database/
├── connection.ts              # Connection management
├── migrations/                # Schema evolution
│   ├── runner.ts             # Migration execution
│   └── [timestamp]-[name].ts # Individual migrations
├── models/                    # TypeScript models
│   ├── base.ts               # Base model class
│   └── [entity].ts           # Entity-specific models
└── queries/                   # SQL query builders
    ├── builder.ts            # Query builder utilities
    └── [entity].ts           # Entity queries
```

## MCP Integration Structure

Designed for Claude Code integration:

```
mcp/
├── server.ts                  # MCP server implementation
├── tools/                     # Available tools
│   ├── registry.ts           # Tool registration
│   └── [category]-tools.ts   # Categorized tools
├── handlers/                  # Request handlers
│   ├── base-handler.ts       # Base handler class
│   └── [type]-handler.ts     # Specific handlers
└── types/                     # MCP-specific types
    └── protocol.ts           # Protocol definitions
```

## Key Design Decisions

### 1. Modular Architecture
Each component can be developed, tested, and deployed independently.

### 2. Clear Separation of Concerns
- **Core**: Framework logic
- **Agents**: Business logic
- **Providers**: External integrations
- **Database**: Data persistence
- **MCP**: Claude Code integration

### 3. Consistent Patterns
Every domain follows similar patterns for predictability.

### 4. Testability
Structure enables comprehensive testing at all levels.

### 5. Documentation Proximity
Documentation lives close to the code it describes.

This structure supports the JCVD vision of a comprehensive multi-agent orchestration framework while maintaining clarity, maintainability, and extensibility.