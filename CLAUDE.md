# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JCVD is a project orchestration framework that extends Claude Code to manage complete software development lifecycles with minimal configuration overhead. The system handles requirements gathering, project structure creation, task sequencing, and documentation maintenance across development sessions through simple, natural language interactions. Rather than focusing on individual coding tasks, JCVD coordinates all artifacts needed for systematic project execution while maintaining the intuitive experience developers expect from Claude Code.

**Status**: Pre-implementation phase - comprehensive documentation complete, ready for implementation

## Agents

Unless otherwise specified, please delegate tasks to the appropriate agent based on the task type. Your role is to orchestrate and manage the workflow, not to do work directly unless otherwise instructed to.

1. **Code Review Agent** (@agent-code-reviewer)  Code review, feedback, and quality checks
2. **Developer Agent** (@agent-developer) Code implementation, unit testing
3. **Product Manager Agent** (@agent-product-manager) Requirements gathering, stakeholder communication
4. **QA Agent** (@agent-qa) Test planning, quality assurance
5. **Software Architect Agent** (@agent-software-architect) System design, architecture decisions
6. **Tech Lead Agent** (@agent-tech-lead) Task coordination, dependency management

## Development Commands

### Core Development
- `npm run dev` - Start development server with tsx
- `npm run dev:watch` - Start with auto-restart on changes
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Run built JavaScript (requires build first)

### Quality Assurance  
- `npm run validate` - Run all quality checks (type-check + lint + test)
- `npm run type-check` - TypeScript type checking
- `npm run lint` - ESLint code quality checks
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run test` - Run tests in watch mode  
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Generate test coverage report

### Utilities
- `npm run clean` - Clean build artifacts
- `npm run format` - Format code with Prettier
- `npm run setup` - Initialize development environment

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
- Use the multi-layer state management approach (embedded SQLite → cloud providers)
- Implement user workflows as specified in USER_EXPERIENCE.md
- Design with the developer experience philosophy from PRD.md

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

### Linear Issue Management Workflow

**IMPORTANT**: When working on stories with subtasks, always update the individual subtasks rather than commenting on the parent story.

**Correct Workflow:**
1. **Start Work**: Update subtask status from `Todo` → `In Progress`
2. **During Work**: Continue updating subtask status as work progresses
3. **Complete Work**: Update subtask status to `Done`
4. **Parent Story**: Only update parent story status when ALL subtasks are complete

**Agents and Status Updates:**
- **Always update subtask status fields** using `mcp__linear__update_issue`
- **Never create comments** on stories when you should be updating subtask status
- **Track progress** through status changes, not comments
- **Comments are for**: clarifications, decisions, blocked states, or stakeholder communication
- **Status updates are for**: tracking actual completion progress

**Example:**
```
Epic: "Core Infrastructure" 
└── Story: "Technical Implementation" (no comments needed)
    ├── Subtask: "Technology Decisions" → Update status to Done ✅
    ├── Subtask: "Project Structure" → Update status to Done ✅  
    └── Subtask: "Configuration Files" → Update status to Done ✅
```
