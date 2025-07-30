# JCVD: Comprehensive Project Orchestration Framework
## Product Requirements Document

**Version:** 3.0  
**Date:** July 30, 2025  
**Authors:** John Burbridge, Claude Code

---

## Executive Summary

**JCVD** is a comprehensive project orchestration framework that transforms Claude Code into a complete software development partner. Unlike traditional coding assistants, JCVD creates and manages ALL artifacts required to execute a software project from inception to deployment, including specifications, architecture documentation, Linear issue management, and repository setup.

The system operates on a project-centric model where every development effort begins with an **Inception Phase** - either through an interactive requirements gathering interview or by accepting a user-provided PRD. JCVD then orchestrates the entire development lifecycle through Linear issue management, ensuring structured progression from high-level design through proof-of-concept delivery.

**Core Value Propositions:**
- **Complete Project Orchestration**: From requirements gathering to deployment-ready code
- **Artifact Generation**: Auto-creates all necessary documentation, specifications, and project structure
- **Linear-Driven Workflow**: Uses Linear's Agile structure (Epic → Story → Subtasks) for comprehensive project tracking
- **Phase-Based Development**: Structured progression through Inception, Development/Alpha, and delivery phases
- **Intelligent Task Orchestration**: LLM-powered analysis of Linear dependency graphs to determine optimal next actions

## Project Vision

### Vision Statement
To create the first truly comprehensive software development orchestration system that handles every aspect of project delivery - from initial concept through production deployment - while maintaining complete transparency and developer control.

### Problem Statement
Current AI coding assistants focus on individual coding tasks but fail to address the broader challenges of software project delivery:

- **Project Initiation Complexity**: No systematic approach to gathering requirements, defining scope, and creating project structure
- **Documentation Fragmentation**: Specifications, architecture docs, and project artifacts scattered across tools and formats
- **Task Prioritization Chaos**: No intelligent system for determining what to work on next based on project dependencies and priorities
- **Phase Management Gaps**: No structured approach to project phases (inception, development, deployment)
- **Greenfield Project Challenges**: Starting new projects requires extensive manual setup and planning
- **Context Loss**: Project knowledge and progress scattered across conversations, files, and tools

### Solution Overview

JCVD provides a **comprehensive project orchestration platform** that:

1. **Inception Phase Management**: Interactive requirements gathering or PRD acceptance, followed by systematic project setup
2. **Complete Artifact Generation**: Creates all necessary documentation, specifications, and project structure in standardized locations
3. **Linear-Driven Orchestration**: Uses Linear's Epic → Story → Subtasks hierarchy for complete project tracking and dependency management
4. **Intelligent Task Sequencing**: LLM-powered analysis of Linear issues to determine optimal next actions based on dependencies, priorities, and project context
5. **Phase-Based Progression**: Structured movement through Inception → Development/Alpha → subsequent phases using Linear milestones
6. **Repository Convention Enforcement**: Standardized `docs/` directory structure and project organization patterns
7. **Test-Driven Development Integration**: TDD practices built into all applicable workflows and task generation

## Target Users

**Primary**: Individual Software Engineers and Freelancers
- Solo developers starting new projects who need comprehensive project structure and management
- Freelancers who want to demonstrate professional project management to clients
- Engineers who want to follow best practices but lack the time to set up comprehensive project infrastructure
- Developers transitioning from ad-hoc development to structured, professional workflows

**Secondary**: Small Development Teams (2-4 people)  
- Startups needing rapid project setup and structured development workflows
- Small consulting teams who want to standardize their project delivery approach
- Teams who want to use Linear effectively for Agile development practices

## Core Functional Requirements

### FR1: Inception Phase Orchestration

**FR1.1: Requirements Gathering System**
- Interactive interview process to gather project requirements, scope, and constraints
- Alternative path: Accept user-provided PRD.md and validate completeness
- Generate comprehensive PRD.md stored in `docs/` directory following standardized template
- Capture technical requirements, business requirements, success criteria, and constraints

**FR1.2: Project Structure Generation**
- Create standardized `docs/` directory structure for all project documentation
- Generate repository scaffolding appropriate for detected project type (web app, API, mobile, etc.)
- Create initial development toolchain setup (package.json, build configs, testing frameworks)
- Establish Linear project and team structure with appropriate labels and issue types

**FR1.3: High-Level Design Orchestration**
- Create Linear Epic/Story/Subtask hierarchy based on PRD requirements
- Generate architecture and system design issues with proper dependencies
- Create repository setup tasks with dependency ordering
- Populate Linear with sufficient backlog to reach proof-of-concept/demo milestone

### FR2: Linear-Driven Task Orchestration

**FR2.1: Intelligent Next-Task Determination**
- LLM-powered analysis of Linear issue dependency graph, priorities, and current project state
- Consider issue relationships, prerequisites, and optimal development sequence
- Factor in current repository state and completed work when recommending next tasks
- Provide reasoning for task recommendations including dependency analysis

**FR2.2: Issue Lifecycle Management**
- Automatic Linear issue updates as work progresses through subtasks
- Status transitions based on completion criteria and validation results
- Dependency tracking and automatic unblocking of subsequent tasks
- Progress reporting with detailed completion summaries

**FR2.3: Milestone and Phase Management**
- Use Linear milestones to track major project phases (Inception, Development/Alpha, Beta, etc.)
- Automatic milestone progression based on completion criteria
- Phase-appropriate task generation and backlog management
- Adaptive planning - support both up-front planning and iterative discovery

### FR3: Comprehensive Documentation Management

**FR3.1: Standardized Documentation Structure**
- Enforce consistent `docs/` directory organization across all projects
- Auto-generate and maintain architecture documentation, API specifications, and design documents
- Version control integration for all documentation artifacts
- Template-based document generation with project-specific customization

**FR3.2: Living Documentation System**
- Keep documentation synchronized with implementation progress
- Update specifications and architecture docs as implementation evolves
- Generate decision logs and architectural decision records (ADRs)
- Maintain traceability between requirements, design, and implementation

### FR4: Development Methodology Integration

**FR4.1: Test-Driven Development Framework**
- TDD practices integrated into all applicable task workflows
- Automatic test generation and validation as part of issue completion
- Test coverage tracking and quality gate enforcement
- Support for different testing frameworks and project types

**FR4.2: Agile Development Practices**
- Epic → Story → Subtask hierarchy enforcement with proper estimation
- Sprint planning support with velocity tracking
- Retrospective and improvement process integration
- Continuous integration and deployment pipeline setup

### FR5: Claude Code Integration and User Experience

**FR5.1: Seamless Claude Code Workflow Integration**
- Natural language interface for all JCVD operations
- Context-aware suggestions based on current project phase and Linear state
- Intelligent tool selection and agent orchestration based on task type
- Progress reporting and status updates through normal Claude Code conversation

**FR5.2: MCP Server Architecture**
- Comprehensive MCP server exposing project orchestration capabilities
- LLM-powered task analysis and recommendation engine
- Linear API integration for complete issue lifecycle management
- Repository and documentation management through standard file operations

## System Architecture Overview

### Core Components

**1. Inception Engine**
- Requirements gathering interview system
- PRD validation and enhancement
- Project type detection and scaffolding generation
- Initial Linear project and issue structure creation

**2. Task Orchestration Engine** 
- LLM-powered Linear issue analysis and task recommendation
- Dependency graph analysis and optimal sequencing
- Priority and context-aware task selection
- Progress tracking and milestone management

**3. Documentation Management System**
- Standardized `docs/` directory structure enforcement
- Living documentation generation and maintenance
- Architecture and design document management
- Decision logging and traceability systems

**4. Linear Integration Layer**
- Complete Linear API integration for issue lifecycle management
- Epic/Story/Subtask hierarchy management
- Milestone and phase tracking
- Agile development workflow support

**5. Development Methodology Framework**
- TDD workflow integration and test generation
- Quality gate enforcement and validation
- Continuous integration pipeline setup
- Code quality and coverage tracking

## Project Phase Structure

### Phase 1: Inception
**Objective**: Establish project foundation, requirements, and initial structure

**Entry Criteria**: Developer requests new project creation or provides initial requirements

**Key Activities**:
1. **Requirements Gathering**: Interactive interview or PRD acceptance and validation
2. **Project Setup**: Repository structure, toolchain configuration, Linear project creation
3. **High-Level Design**: Architecture planning, system design, technology selection
4. **Backlog Population**: Create Epic/Story/Subtask structure for proof-of-concept development
5. **Development Environment**: Setup development tools, testing frameworks, CI/CD foundations

**Exit Criteria**:
- Complete PRD.md in `docs/` directory
- Repository structure established with appropriate toolchain
- Linear project populated with sufficient stories for proof-of-concept
- Architecture and system design documented
- Development environment ready for implementation

**Duration**: Varies by project complexity
- Simple projects (SPA, basic API): 1-2 hours
- Complex projects (multi-service systems): 1-2 days

### Phase 2: Development (Simple Projects) / Alpha (Complex Projects)
**Objective**: Implement proof-of-concept or first major milestone

**Entry Criteria**: Inception phase complete, development environment ready

**Key Activities**:
1. **Story Implementation**: Work through Linear backlog in dependency order
2. **Test-Driven Development**: Implement features following TDD practices
3. **Documentation Updates**: Keep architecture and design docs current
4. **Quality Gates**: Continuous validation and testing
5. **Milestone Tracking**: Progress toward proof-of-concept or alpha release

**Exit Criteria**:
- Proof-of-concept or alpha milestone achieved
- All tests passing with appropriate coverage
- Documentation updated and current
- Ready for user feedback or next phase

### Subsequent Phases
**Beta, Production, Maintenance phases** - structured similarly with phase-appropriate objectives and criteria

## User Experience Design

### First-Time Installation and Setup

#### Discovery and Installation
```
User discovers JCVD through:
- Claude Code MCP server marketplace/directory
- GitHub repository or documentation
- Developer community recommendations

Installation options:
1. Via Claude Code: "Add MCP Server" → Search "JCVD" → Install
2. Manual: npm install -g @jcvd/mcp-server && claude-code add-mcp jcvd
3. Docker: docker run -d jcvd/mcp-server (for advanced users)
```

#### First Launch Experience
```
User: "I want to start a new project"

Claude: [JCVD MCP server detected for first time]
"I see you have JCVD installed! This is a comprehensive project orchestration 
framework that will help you build software projects from start to finish.

Before we begin, I need to set up a few things:

1. **Linear Integration**: JCVD uses Linear for project management. 
   Do you have a Linear workspace, or should I help you create one?

2. **Project Location**: Where would you like to create your project? 
   JCVD will set up a complete repository structure.

3. **Development Preferences**: Any preferred technologies, frameworks, 
   or development methodologies I should know about?

Let's start with Linear - this is where we'll track all your project tasks 
and progress..."
```

#### Linear Workspace Setup
```
Claude: "Let's connect your Linear workspace. You have a few options:

A) **Existing Linear Workspace**: Provide your Linear API key and workspace ID
   - I'll create a new project within your existing workspace
   - Uses your existing team structure and preferences

B) **New Linear Workspace**: I'll guide you through creating a Linear account
   - Free for personal use (up to 10 team members)
   - I'll set up the optimal project structure for JCVD

C) **Local Mode**: Work without Linear integration
   - Tasks tracked in local markdown files
   - Less powerful but works offline

Which would you prefer?"

[User chooses option, setup process continues]
```

#### Project Type Detection and Scoping
```
User: "I have Linear set up, now I want to build a task management web app"

Claude: "Perfect! I'll start the JCVD Inception Phase for your task management app.

Let me ask a few key questions to understand your project:

**Project Basics:**
1. What's the main problem your app will solve?
2. Who are your target users?
3. What's your success criteria (how will you know it's working)?

**Technical Scope:**
4. Do you want a simple single-page app or a more complex system?
5. Any specific technologies you want to use or avoid?
6. Will you need user authentication, data persistence, etc.?

**Timeline and Constraints:**
7. Is this a personal project, client work, or startup idea?
8. Any deadlines or budget constraints?
9. Just you working on it, or will there be a team?

Let's start with #1 - what problem will your task management app solve?"
```

#### Interactive Requirements Gathering
```
[Following the interview questions above, JCVD conducts a structured conversation]

Claude: "Great answers! Let me summarize what I've learned:

**Your Project: TaskMaster Pro**
- Problem: Help freelancers track billable hours and project deadlines
- Users: Individual freelancers and small agencies  
- Success: Users can track time, generate invoices, meet deadlines
- Scope: Web application with authentication, database, reporting
- Tech: You're open to suggestions but prefer TypeScript
- Timeline: Personal project, flexible timeline, just you developing
- Approach: You want to follow TDD practices

Does this summary look accurate? Any corrections or additions?"

User: "That's perfect!"

Claude: "Excellent! Now I'll create your complete project structure:

1. **Generating PRD**: Creating comprehensive requirements document
2. **Setting up repository**: Full project structure with TypeScript, testing, etc.
3. **Creating Linear project**: Epic/Story/Subtask breakdown  
4. **Planning first sprint**: Tasks to get you to a working proof-of-concept

This will take about 2-3 minutes..."

[JCVD generates all artifacts]
```

#### Project Structure Creation
```
Claude: "🎉 Your ProjectMaster Pro project is ready! Here's what I've created:

**Repository Structure:**
projectmaster-pro/
├── docs/
│   ├── PRD.md                  # Complete requirements document
│   ├── ARCHITECTURE.md         # System design and architecture
│   ├── API_SPEC.md            # API documentation
│   └── DEPLOYMENT.md          # Deployment and infrastructure
├── src/
│   ├── components/            # React components
│   ├── services/              # Business logic and API calls
│   ├── utils/                 # Utility functions
│   └── types/                 # TypeScript type definitions
├── tests/
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── e2e/                   # End-to-end tests
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── jest.config.js             # Testing configuration
└── README.md                  # Getting started guide

**Linear Project: "ProjectMaster Pro"**
- **Epic 1**: User Authentication System (5 stories, 23 points)
- **Epic 2**: Time Tracking Core (4 stories, 18 points)  
- **Epic 3**: Project Management (6 stories, 34 points)
- **Epic 4**: Reporting & Invoicing (3 stories, 21 points)

**Current Milestone**: "Proof of Concept" (Sprint 1-2, ~4 weeks)
**Next Task**: TASK-1 "Set up development environment and basic project structure"

Everything is ready! Would you like to start with the first task, or do you want 
to review the PRD and architecture documents first?"
```

#### Transition to Development Phase
```
User: "Let's start with the first task!"

Claude: "Perfect! Let me check your Linear backlog for the optimal next step...

**Current Task: TASK-1 "Development Environment Setup"**
- **Story**: "As a developer, I want a fully configured development environment"
- **Subtask**: "Initialize TypeScript project with testing framework"
- **Estimated effort**: 2 points (~2-3 hours)
- **Dependencies**: None (ready to start!)

This task involves:
1. Setting up package.json with all necessary dependencies
2. Configuring TypeScript, Jest, and ESLint
3. Creating basic project structure
4. Writing your first test to verify everything works

Since you want to follow TDD, we'll start by writing a test for the basic 
project setup, then implement the configuration to make it pass.

Ready to begin? I'll guide you through each step!"

[Development phase begins with structured TDD workflow]
```

### Ongoing Development Experience

**Daily Workflow**:
```
User: "What should I work on next?"

Claude: [Calls JCVD to analyze Linear state, dependencies, priorities]
"Based on your Linear backlog and current progress, I recommend working on 
Story PROJ-15: 'User Authentication System'. 

This story is ready to start because:
- All prerequisite stories are complete 
- Database schema story (PROJ-12) was finished yesterday
- It's on the critical path for your Sprint 2 milestone
- Estimated at 5 points, fits well in your remaining capacity

Shall we begin with the first subtask: 'Create User Model with Tests'?"
```

### Cross-Session Continuity
```
User: [Starts new Claude Code session]
"Continue with my project work"

Claude: [JCVD loads project state from Linear and docs]
"Welcome back! You're working on the ProjectMaster project. 

Current status:
- Phase: Development (Sprint 2)
- Active Story: PROJ-15 'User Authentication System' 
- Last completed: User model tests (all passing)
- Next up: Authentication middleware implementation

Ready to continue with the middleware setup?"
```

## Success Metrics

### Inception Phase Success
- **Setup Time**: Complete project inception in <2 hours for simple projects, <1 day for complex
- **Documentation Quality**: Generated PRDs score >8/10 on completeness assessment
- **Linear Structure**: Proper Epic/Story/Subtask hierarchy with realistic estimates
- **Developer Satisfaction**: >90% of users report clear understanding of project scope and next steps

### Development Phase Success  
- **Task Clarity**: >95% of recommended next tasks are actionable without additional clarification
- **Dependency Management**: Zero blocked tasks due to unresolved dependencies
- **Quality Maintenance**: >90% of completed stories pass quality gates on first attempt
- **Velocity Tracking**: Accurate story point estimation within 20% of actual completion time

### Overall System Success
- **Project Completion Rate**: >80% of projects started reach their defined success criteria
- **Time to Value**: First proof-of-concept delivered within planned timeline 90% of time
- **Documentation Fidelity**: Architecture docs remain synchronized with implementation >95% of time
- **User Retention**: >85% of users complete multiple projects using JCVD framework

## Implementation Roadmap

### MVP (Months 1-2): Inception Phase Foundation
- Requirements gathering interview system
- PRD generation and validation
- Basic Linear project setup
- Simple repository scaffolding
- Documentation structure enforcement

### V1.0 (Months 3-4): Complete Task Orchestration
- LLM-powered Linear analysis and task recommendation
- Dependency graph analysis and sequencing
- Comprehensive issue lifecycle management
- TDD workflow integration

### V2.0 (Months 5-6): Advanced Project Management
- Multi-phase project support
- Advanced milestone and sprint management
- Custom workflow templates
- Team collaboration features

This comprehensive approach transforms JCVD from a coding assistant into a complete project orchestration platform that handles every aspect of software development from conception to delivery.