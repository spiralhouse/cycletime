# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JCVD is a multi-agent orchestration framework for Claude Code that aims to transform Claude Code into a specialized software development team for individual engineers. The project is currently in the conceptual/planning phase.

## Current State

This repository contains:
- **docs/PRD.md**: Product Requirements Document focused on business requirements, user needs, and success criteria
- **README.md**: Basic project description
- **docs/**: Architecture documentation and detailed design docs

**Status**: Pre-implementation phase - no actual code exists yet

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

Since this is pre-implementation:
- Focus on understanding the business vision outlined in docs/PRD.md
- Review the technical architecture detailed in docs/ARCHITECTURE.md
- Any code implementation should follow the architectural patterns described in the architecture document
- Consider the planned agent specializations when designing components
- State management will be critical - design with multi-layer persistence in mind

## Next Steps for Implementation

1. Set up basic project structure (package.json, TypeScript config)
2. Implement core orchestrator engine
3. Create base agent interface and framework
4. Add Linear MCP integration
5. Implement individual specialized agents

The docs/PRD.md contains business requirements and implementation phases, while docs/ARCHITECTURE.md contains the technical architecture and design patterns that should guide all development decisions.

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