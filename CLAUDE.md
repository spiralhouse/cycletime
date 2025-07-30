# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JCVD is a multi-agent orchestration framework for Claude Code that aims to transform Claude Code into a specialized software development team for individual engineers. The project is currently in the conceptual/planning phase.

## Current State

This repository contains:
- **docs/PRD.md**: Core product requirements, business vision, and success criteria
- **docs/ARCHITECTURE.md**: Technical architecture, database schemas, and system design
- **docs/USER_EXPERIENCE.md**: Complete user workflows, setup processes, and daily development experience
- **docs/ONBOARDING.md**: Project integration guide for new and existing projects
- **README.md**: Basic project description
- **SESSION_SUMMARY.md**: Detailed development session documentation

**Status**: Pre-implementation phase - comprehensive documentation complete, ready for implementation

## System Architecture (see docs/ARCHITECTURE.md)

The system will consist of 7 specialized agents:
1. **Product Manager Agent** - Requirements gathering, stakeholder communication
2. **Tech Lead Agent** - Task coordination, dependency management  
3. **Software Architect Agent** - System design, architecture decisions
4. **Developer Agent** - Code implementation, unit testing
5. **QA Agent** - Test planning, quality assurance
6. **DevOps Agent** - Infrastructure, CI/CD, deployment
7. **Release Engineer Agent** - Release coordination, deployment orchestration

## Key Integration Points

- **Claude Code Integration**: Extends existing subagent framework and tool ecosystem
- **Linear MCP Integration**: For issue tracking and project management
- **State Management**: Multi-layer system (in-memory, repository docs, Linear sync)

For detailed technical architecture, component specifications, and integration patterns, see `docs/ARCHITECTURE.md`.

## Development Commands

**Note**: No build/test/lint commands exist yet as implementation hasn't started.

When implementation begins, common commands will likely include:
- Testing framework (TBD)
- Build process (TBD) 
- Linting/type checking (TBD)

## Working with this Repository

Since this is pre-implementation, familiarize yourself with the focused documentation structure:

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
- Use the multi-layer state management approach (embedded SQLite → cloud providers)
- Implement user workflows as specified in USER_EXPERIENCE.md
- Design with the developer experience philosophy from PRD.md

## Next Steps for Implementation

1. Set up basic project structure (package.json, TypeScript config)
2. Implement core orchestrator engine
3. Create base agent interface and framework
4. Add Linear MCP integration
5. Implement individual specialized agents

The focused document structure ensures each aspect has dedicated coverage:
- **PRD.md**: Business requirements and product vision
- **ARCHITECTURE.md**: Technical specifications and implementation patterns
- **USER_EXPERIENCE.md**: Complete user workflows and interaction design
- **ONBOARDING.md**: Project integration strategies and adoption approaches

## Linear Reference

### Team & Project IDs
- **Team**: Spiral House - `03ee7cf5-773e-4f53-bc0d-2e5e4d3bc3bc`
- **Project**: jcvd - `217eeb45-4f83-4ca0-8030-81f9c78692bc`

### Issue Status IDs
- **Backlog**: `1e7bd879-6685-4d94-8887-b7709b3ae6e8` (type: backlog)
- **Todo**: `fc814d1f-22b5-4ce6-8b40-87c1312d54ba` (type: unstarted)
- **In Progress**: `a433a32b-b815-4e11-af23-a74cb09606aa` (type: started)
- **In Review**: `8d617a10-15f3-4e26-ad28-3653215c2f25` (type: started)
- **Done**: `3d267fcf-15c0-4f3a-8725-2f1dd717e9e8` (type: completed)
- **Canceled**: `a2581462-7e43-4edb-a13a-023a2f4a6b1e` (type: canceled)
- **Duplicate**: `3f7c4359-7560-4bd9-93b7-9900671742aa` (type: canceled)

### Issue Hierarchy & Estimation Rules

The project uses a three-tier issue hierarchy:

1. **Epics** (Top Level)
   - High-level features or major project phases
   - No direct estimates
   - Contains multiple Stories

2. **Stories** (Middle Level)
   - User-facing functionality or complete features
   - **Estimation Rule**: Stories can have estimate points ONLY when they don't have subtasks
   - If a Story has subtasks, the Story's estimate is the sum of its subtasks
   - Parent: Epic

3. **Subtasks** (Bottom Level)
   - Specific implementation work items
   - **Always have estimates** (required)
   - Parent: Story

**Example Structure:**
```
Epic: "Phase 1: MVP Workflow Engine"
└── Story: "Implement single-stage workflow execution" (no estimate - has subtasks)
    ├── Subtask: "Create workflow engine core" (3 points)
    ├── Subtask: "Add context loading system" (5 points)
    └── Subtask: "Implement stage validation" (2 points)
└── Story: "Setup documentation" (2 points - no subtasks)
```

### Estimation Scale (Fibonacci)
**Complexity-Based Estimation**: Points reflect task complexity, not time duration

- **1 point** = Trivial complexity (straightforward implementation)
- **2 points** = Simple complexity (well-understood requirements)
- **3 points** = Moderate complexity (some architectural decisions needed)
- **5 points** = Moderately complex (multiple integrations or significant logic)
- **8 points** = Complex (substantial architectural work or many unknowns)
- **13 points** = Highly complex (major feature, consider decomposition)

**Guidelines**:
- Target subtasks at 1-5 points for optimal sprint planning
- 8+ point tasks may need further breakdown
- Consider task complexity, unknowns, and dependencies when estimating
- Let velocity emerge from completed complexity over time
- **Parent stories with subtasks should NOT have estimates** - only the subtasks get pointed