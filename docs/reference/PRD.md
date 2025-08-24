# CycleTime: Comprehensive Project Orchestration Framework

## Product Requirements Document

**Version:** 3.0  
**Date:** July 30, 2025  
**Authors:** John Burbridge, Claude Code

**Related Documents:**  
📋 [PRD.md](PRD.md) | 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) | 👤
[USER_EXPERIENCE.md](USER_EXPERIENCE.md) | 🚀 [ONBOARDING.md](ONBOARDING.md)

---

## Executive Summary

**CycleTime** is a data and context provider designed specifically for the Claude
Code ecosystem, providing structured project information that enhances Claude
Code's existing capabilities with cross-session continuity and intelligent task
recommendations. Building on Claude Code's proven agent capabilities and natural
language workflow, CycleTime creates and manages ALL artifacts required to execute a
software project from inception to deployment, including specifications,
architecture documentation, issue tracking and management, and repository setup.

Targeting the growing community of solo developers and freelancers who rely on
Claude Code for productivity, CycleTime addresses the specific challenges these users
face: cognitive overload from maintaining entire project context, loss of
project state between Claude Code sessions, and the need for professional
project deliverables when working with clients.

The system operates on a project-centric model where every development effort
begins with **Project Bootstrap** - either through an interactive requirements
gathering interview or by accepting a user-provided PRD. CycleTime then orchestrates
the entire development lifecycle through intelligent issue tracking systems,
ensuring structured progression from high-level design through proof-of-concept
delivery, all while preserving Claude Code's familiar agent-based interaction
model.

**Primary Value Proposition:** Enhance Claude Code with structured project data,
dependency tracking, and cross-session continuity through embedded database
persistence and MCP Resource integration, enabling solo developers and
freelancers to maintain project context while preserving Claude Code's natural
development experience.

**Supporting Benefits:**

- **Structured Project Data**: Epic → Story → Subtask hierarchy with dependency
  tracking persisted in embedded H2 database
- **Cross-Session Continuity**: Project state persists across Claude Code
  sessions via MCP Resources, solving context loss for solo developers
- **Context-Aware Development**: Claude Code agents receive project context
  through MCP integration for better task recommendations
- **Professional Project Structure**: Standardized documentation and issue
  tracking without complex automation overhead
- **Developer Control**: Local data storage with embedded H2, optional cloud
  provider integration when needed
- **Solo Developer Support**: Reduces cognitive load by maintaining project
  context that Claude Code can access and analyze
- **Simplified Integration**: Works as data and context provider for Claude Code
  rather than replacing existing capabilities

## Project Vision

### Vision Statement

To create the first truly comprehensive project orchestration framework
specifically for Claude Code users, extending Claude Code's existing
capabilities to handle complete software development lifecycles - from initial
concept through production deployment - while preserving Claude Code's
developer-first philosophy of transparency and control.

### Problem Statement

While Claude Code excels at individual coding tasks and provides powerful agent
capabilities, solo developers and freelancers using Claude Code face significant
challenges with complete project orchestration:

**Solo Developer Specific Challenges:**

- **Cognitive Overload**: Solo developers must maintain entire project context
  (database schema to frontend animations) without team support, causing mental
  fatigue that Claude Code currently doesn't address systematically
- **Context Switching Drain**: Constant switching between requirements,
  architecture, implementation, and client communication fragments focus and
  productivity
- **Project Initiation Complexity**: No systematic approach within Claude Code
  for gathering requirements, defining scope, and creating comprehensive project
  structure
- **Cross-Session Context Loss**: Project knowledge and progress scattered
  across Claude Code conversations, with no persistence of project state between
  sessions
- **Task Prioritization Without Team Input**: Solo developers lack team members
  to help prioritize work, leading to suboptimal task sequencing and blocked
  progress
- **Client Communication Overhead**: Freelancers need professional project
  artifacts (PRDs, architecture docs, progress tracking) but lack efficient ways
  to generate and maintain these through Claude Code
- **Greenfield Project Setup Burden**: Starting new projects requires extensive
  manual setup that could be orchestrated through Claude Code's existing
  capabilities

**Claude Code Ecosystem Gaps:**

- **No Project Continuity Framework**: While Claude Code provides excellent
  session-based assistance, there's no system for maintaining project context
  and progress across multiple development sessions
- **Agent Coordination Limitations**: Though Claude Code has powerful individual
  agents, there's no orchestration layer to coordinate multi-step project
  workflows across agent interactions
- **Documentation Integration Missing**: Claude Code can generate excellent code
  but lacks integrated systems for maintaining project documentation,
  specifications, and architectural artifacts alongside development

### Solution Overview

CycleTime provides a **data and context provider** for Claude Code that:

1. **Project Bootstrap Management**: Basic requirements gathering and systematic
   project setup with templates
2. **Structured Project Data**: Epic → Story → Subtasks hierarchy with
   dependency tracking in embedded H2 database
3. **MCP Resource Integration**: Exposes project state and context to Claude
   Code agents through MCP Resources
4. **Context-Aware Task Identification**: Simple dependency graph traversal to
   identify unblocked work for Claude Code analysis
5. **Cross-Session Project Continuity**: Persistent project state that survives
   across Claude Code sessions
6. **Professional Documentation Templates**: Standardized `docs/` directory
   structure and project organization patterns
7. **Developer-Controlled Data**: Local H2 storage with optional cloud
   provider integration
8. **Context Provision for Agent Enhancement**: Provides project-specific
   information to Claude Code's existing agent framework
9. **Open Source Transparency**: Full source code visibility enabling custom
   extensions and community contributions
10. **Provider Flexibility**: Start with embedded H2, migrate to
    Linear/GitHub/Jira when needed

## Target Users

**Primary**: Solo/Freelance Software Engineers within the Claude Code Ecosystem

**Core Demographics:**

- **Existing Claude Code Users**: Developers already familiar with Claude Code's
  agent system and natural language development workflows
- **Solo Developers Using Claude Code**: Independent developers who rely on
  Claude Code for productivity but struggle with project-level orchestration and
  continuity
- **Freelance Consultants**: Professional developers using Claude Code who need
  to deliver structured project artifacts and demonstrate professional project
  management to clients
- **Productivity-Focused Engineers**: Developers who have experienced Claude
  Code's ability to "work like a team of five" but want systematic project
  orchestration to amplify this effect

**Specific Pain Points This Audience Faces:**

- Currently use Claude Code effectively for coding tasks but lose project
  context between sessions
- Need professional project deliverables (PRDs, architecture docs, progress
  tracking) for client work
- Want to leverage Claude Code's agent capabilities for complete project
  workflows, not just individual tasks
- Struggle with the cognitive overhead of maintaining entire project context
  without team support
- Seek to transform from "programmer managing Claude Code" to "engineering
  manager orchestrating through Claude Code"
- Desire systematic project setup and task prioritization that builds on Claude
  Code's existing strengths

**Behavioral Characteristics:**

- Already invested in Claude Code's workflow and terminology
- Comfortable with terminal-based AI interaction and agent delegation
- Value Claude Code's transparency and developer control philosophy
- Experience cognitive fatigue from context switching that Claude Code's task
  focus could address systematically
- Want professional project management without abandoning Claude Code's natural
  development experience

**Secondary**: Small Development Teams Already Using Claude Code (2-4 people)

- Teams who have adopted Claude Code for individual productivity and want
  project-level orchestration
- Claude Code-savvy startups needing rapid project setup within their existing
  development workflow
- Small consulting teams who want to standardize project delivery while
  leveraging their Claude Code investment

## Developer Experience Philosophy

CycleTime is designed around core principles that extend Claude Code's
developer-first philosophy to comprehensive project orchestration:

**Claude Code Ecosystem Integration First**

- Seamlessly extends Claude Code's existing agent framework without replacing
  familiar workflows
- Preserves Claude Code's natural language interaction model for all project
  orchestration tasks
- Maintains Claude Code's session-based development experience while adding
  cross-session project continuity
- Leverages Claude Code users' existing comfort with agent delegation and
  terminal-based AI interaction

**Developer Control First** _(Aligned with Claude Code's Philosophy)_

- All project data remains under developer control (local files, standard
  formats, portable data)
- No forced cloud dependencies or external service requirements for core
  functionality
- Complete transparency into system behavior through open source architecture
- Preserves Claude Code's commitment to developer autonomy and transparency

**Amplify, Don't Replace** _(Claude Code's Existing Strengths)_

- Transforms Claude Code from excellent coding assistant to complete project
  orchestration platform
- Builds on Claude Code's proven ability to help solo developers \"work like a
  team of five\"
- Extends Claude Code's agent capabilities with project context and intelligent
  task sequencing
- Maintains Claude Code's natural development flow while adding systematic
  project management

**Professional Without Bureaucracy** _(For Claude Code's Solo Developer
Audience)_

- Structured workflows that enhance Claude Code's productivity benefits rather
  than impede development velocity
- Intelligent defaults that minimize configuration while maximizing Claude
  Code's utility for complete projects
- Focus on delivering professional project artifacts through Claude Code's
  familiar interface
- Addresses solo developer pain points (cognitive overload, context switching)
  that Claude Code users specifically experience

## Core Functional Requirements

### FR1: Project Bootstrap Orchestration

**FR1.1: Requirements Gathering System**

- Interactive interview process to gather project requirements, scope, and
  constraints
- Alternative path: Accept user-provided PRD.md and validate completeness
- Generate comprehensive PRD.md stored in `docs/` directory following
  standardized template
- Capture technical requirements, business requirements, success criteria, and
  constraints

**FR1.2: Project Structure Generation**

- Create standardized `docs/` directory structure for all project documentation
- Generate repository scaffolding appropriate for detected project type (web
  app, API, mobile, etc.)
- Create initial development toolchain setup (package.json, build configs,
  testing frameworks)
- Establish issue tracking project structure with appropriate labels and issue
  types

**FR1.3: High-Level Design Orchestration**

- Create Epic/Story/Subtask hierarchy based on PRD requirements
- Generate architecture and system design issues with proper dependencies
- Create repository setup tasks with dependency ordering
- Populate issue tracker with sufficient backlog to reach proof-of-concept/demo
  milestone

### FR2: Issue-Driven Project Tracking

**FR2.1: Context-Aware Task Identification**

- Simple dependency graph traversal to identify unblocked tasks
- Expose project state and issue relationships through MCP Resources for Claude
  Code analysis
- Provide structured project context that enables intelligent task
  prioritization
- Basic prerequisite checking and dependency validation

**FR2.2: Issue Lifecycle Management**

- Manual issue status updates with basic validation
- Simple dependency tracking to identify blocking relationships
- Progress tracking through issue status changes
- Basic reporting of completion status and remaining work

**FR2.3: Milestone and Phase Management**

- Use project milestones to track major project phases (Project Bootstrap,
  Development/Alpha, Beta, etc.)
- Manual milestone progression with completion status tracking
- Basic phase organization for project structure
- Support for iterative planning and backlog refinement

### FR3: Comprehensive Documentation Management

**FR3.1: Standardized Documentation Structure**

- Enforce consistent `docs/` directory organization across all projects
- Auto-generate and maintain architecture documentation, API specifications, and
  design documents
- Version control integration for all documentation artifacts
- Template-based document generation with project-specific customization

**FR3.2: Documentation Maintenance System**

- Provide AI suggestions for keeping documentation synchronized with
  implementation progress
- Support manual updates to specifications and architecture docs as
  implementation evolves
- Generate decision logs and architectural decision records (ADRs) templates
- Maintain traceability between requirements, design, and implementation through
  structured links

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

- Natural language interface for all CycleTime operations
- Context-aware suggestions based on current project phase and issue tracking
  state
- Intelligent task delegation to Claude Code's built-in agents based on task
  type
- Progress reporting and status updates through normal Claude Code conversation

**FR5.2: MCP Server Architecture**

- Comprehensive MCP server exposing project orchestration capabilities
- LLM-powered task analysis and recommendation engine
- Issue tracking API integration for complete issue lifecycle management
- Repository and documentation management through standard file operations

### FR6: MCP Server Dashboard

**FR6.1: Real-Time System Observability**

- Web-based dashboard accessible at `http://localhost:3000/dashboard` providing immediate visibility into CycleTime operations
- Real-time display of active sessions, their states, and last activity timestamps
- Project overview showing issue counts by status (backlog, in-progress, completed) and hierarchy levels
- MCP resource access logs showing which resources Claude Code agents are accessing and when
- System health indicators including database connection status, memory usage, and operation latency metrics

**FR6.2: Project State Visualization**

- Interactive issue hierarchy browser showing Epic → Story → Subtask relationships with dependency indicators
- Session timeline view displaying session creation, updates, and expiration events
- Context provision flow visualization showing how project data flows to Claude Code agents
- Dependency graph visualization (Phase 2) showing blocked/blocking relationships between issues
- Provider sync status (Phase 3) displaying synchronization state with external providers (Linear, GitHub, etc.)

**FR6.3: Developer Control Features**

- Read-only access by default with clear data transparency (no hidden operations or data collection)
- Export capabilities for all project data in standard formats (JSON, CSV) supporting data portability
- Session management controls to manually expire or extend sessions when needed
- Configuration viewer showing current system settings without requiring file access
- Debug mode toggle for verbose logging when troubleshooting integration issues

## System Architecture

CycleTime uses a provider-agnostic architecture that supports multiple issue tracking
backends (H2, Linear, GitHub Issues, Jira) through a unified interface. This
enables complete offline operation with embedded H2 while providing seamless
migration to cloud providers when ready.

**Core Design Principles:**

- **Developer Control First**: All data remains local and portable
- **Provider Abstraction**: Unified interface across all issue tracking systems
- **Offline Capability**: Full functionality without external dependencies
- **Migration Support**: Easy data migration between providers

For detailed technical specifications, database schemas, and component
architecture, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Claude Code Agent Integration

CycleTime is designed specifically for the Claude Code user community, working
seamlessly **with** Claude Code's existing agent framework to address the unique
challenges solo developers and freelancers face when managing complete projects.
This architectural approach ensures:

**Agent Enhancement for Solo Developer Workflows**

- Claude Code's native agents (Developer, QA, Product Manager, etc.) remain the
  primary execution layer that solo developers already know and trust
- CycleTime provides project context, task recommendations, and orchestration
  intelligence to these existing agents, reducing the cognitive load of
  maintaining entire project context
- No custom agent implementations or external coordination protocols required -
  preserves Claude Code users' existing workflow familiarity

**Context-Aware Task Intelligence for Solo Development**

- CycleTime analyzes issue dependencies, project state, and task types to provide
  intelligent recommendations, addressing the lack of team input that solo
  developers typically face
- Agents receive enhanced context about project goals, current phase, and
  optimal next actions, reducing context switching fatigue
- Task delegation happens naturally through Claude Code's existing Task tool and
  agent system that users already understand
- Transforms solo developers from \"managing Claude Code sessions\" to
  \"orchestrating project workflows through Claude Code\"

**Seamless Integration Model for Claude Code Ecosystem**

- CycleTime operates as an MCP server that enhances Claude Code's capabilities from
  within, maintaining the terminal-based AI interaction that Claude Code users
  prefer
- All agent interactions happen through Claude Code's native session management,
  preserving user workflow familiarity
- Project orchestration intelligence is delivered through natural language
  recommendations, consistent with Claude Code's existing interaction model
- Cross-session project continuity addresses one of the biggest pain points
  Claude Code users face when working on larger projects

This approach ensures that CycleTime amplifies Claude Code's proven ability to help
solo developers \"work like a team of five\" by adding systematic project
management capabilities without disrupting the development experience that
attracted users to Claude Code in the first place.

## Project Phases

CycleTime organizes software development into structured phases:

1. **Project Bootstrap**: Requirements gathering, project setup, and initial
   architecture
2. **Development/Alpha Phase**: Proof-of-concept implementation with TDD
   practices
3. **Subsequent Phases**: Beta, production, and maintenance with
   milestone-driven progression

Each phase has defined entry/exit criteria, key activities, and success metrics
to ensure structured progression from concept to delivery.

For detailed phase workflows and user experiences, see
[USER_EXPERIENCE.md](USER_EXPERIENCE.md).

## User Experience Overview

CycleTime prioritizes developer control and simplicity through Claude Code's familiar
interaction model:

1. **First-Time Setup**: Simple installation as MCP server with offline-first
   embedded database, maintaining Claude Code's developer control philosophy
2. **Project Creation Within Claude Code**: Interactive requirements gathering
   through natural language conversation, followed by complete project structure
   generation through Claude Code agents
3. **Daily Development Through Claude Code**: Intelligent task recommendations
   and agent delegation based on dependencies and project context, preserving
   Claude Code's proven workflow
4. **Cross-Session Continuity**: Seamless project state recovery across Claude
   Code sessions, solving the context loss problem solo developers face
5. **Professional Output for Freelancers**: Client-ready project artifacts and
   progress reports generated through familiar Claude Code interactions

This approach ensures that existing Claude Code users can immediately leverage
CycleTime's project orchestration capabilities without learning new interfaces or
abandoning their proven development workflows.

For detailed user workflows, setup processes, and daily development experiences,
see [USER_EXPERIENCE.md](USER_EXPERIENCE.md).

## Project Integration

### New Projects

CycleTime provides comprehensive greenfield project support through Project
Bootstrap, including requirements gathering, project structure creation, and
complete development environment setup.

### Existing Projects

CycleTime uses a simple "Onboarding Assistant" with targeted questions to recommend
integration strategies:

- **Small Projects (10-50 issues)**: Full integration with quick setup (2-4
  hours)
- **Medium Projects (50-200 issues)**: Hybrid approach starting with new work
- **Large Projects (200+ issues)**: Conservative pilot approach with gradual
  expansion

For detailed onboarding workflows, integration strategies, and realistic scope
limitations, see [ONBOARDING.md](ONBOARDING.md).

## Implementation Status

### ✅ Completed Features

#### SPI-346: Cross-Session State Persistence
*Completed: January 2025*

Successfully delivered the foundational session management system with comprehensive validation and lifecycle management:

**Technical Achievements:**
- **Architecture**: Domain-Driven Design with clean separation of concerns
- **Testing**: 60 passing tests (47 unit + 13 integration) with 96.91% domain coverage
- **Performance**: Sub-millisecond operations for all session operations
- **Data Integrity**: Automatic validation and repair of corrupted data
- **Documentation**: Complete technical reference and user workflows

**Delivered Components:**
- `Session` Entity with TimeProvider injection for testability
- `SessionManager` for MCP integration layer
- `SessionValidator` for data integrity assurance
- `SessionCleanupService` for automated maintenance
- `H2SessionRepository` with optimized Exposed ORM integration

**Key Metrics:**
- Session operations: < 1ms average latency
- Test execution: < 1s for entire suite
- Memory usage: ~1KB per active session
- Default retention: 7 days (configurable)
- Cleanup performance: 100ms for 1000 sessions

### 🚧 In Progress

- **SPI-290**: MCP Resource Integration - Exposing session state through MCP Resources
- **SPI-354**: Project Bootstrap - Integration with session management

### 📅 Upcoming Milestones

- **Phase 1**: Complete MCP integration with basic CRUD operations
- **Phase 2**: Enhanced context provision and dependency tracking
- **Phase 3**: Multi-provider support (Linear, GitHub, Jira)

## Success Metrics

### Project Bootstrap Success

- **Setup Time**: Complete project bootstrap in <2 hours for simple projects, <1
  day for complex
- **Documentation Quality**: Generated PRDs score >8/10 on completeness
  assessment
- **Issue Tracking Structure**: Proper Epic/Story/Subtask hierarchy with
  realistic estimates
- **Developer Satisfaction**: >90% of users report clear understanding of
  project scope and next steps

### Development Phase Success

- **Task Clarity**: >80% of recommended next tasks are actionable without
  additional clarification
- **Dependency Management**: <5% of tasks blocked due to unresolved dependencies
- **Quality Maintenance**: >90% of completed stories pass quality gates on first
  attempt
- **Velocity Tracking**: Accurate story point estimation within 20% of actual
  completion time
- **Claude Code Agent Integration**: >85% of task-to-agent recommendations are
  accepted and successfully executed by Claude Code's existing agents
- **Context Utilization**: >90% of Claude Code agent interactions benefit from
  CycleTime-provided project context
- **Cross-Session Continuity**: >95% of users successfully resume project work
  in new Claude Code sessions without context loss
- **Cognitive Load Reduction**: >80% of solo developers report reduced mental
  fatigue from context switching when using CycleTime
- **Seamless Experience**: <2% of users report friction or confusion with agent
  delegation and recommendations within Claude Code

### Dashboard & Observability Success

- **System Transparency**: >95% of users report understanding what CycleTime is doing with their project data
- **Debugging Efficiency**: >70% reduction in time spent troubleshooting integration issues
- **First-Time Experience**: >90% of new users successfully verify system operation through dashboard within first session
- **Trust Metrics**: >85% of users report increased confidence in system reliability due to dashboard visibility

### Overall System Success

- **Project Completion Rate**: >80% of projects started reach their defined
  success criteria
- **Time to Value**: First proof-of-concept delivered within planned timeline
  90% of time
- **Documentation Fidelity**: Architecture docs remain synchronized with
  implementation >85% of time
- **User Retention**: >85% of users complete multiple projects using CycleTime
  framework

## Implementation Roadmap

### Phase 1 (Month 1): Core MCP Server with Dashboard

- **Core Focus**: Basic H2 database with MCP Resources and observability dashboard
- Embedded H2 provider with optimized schema
- Basic issue CRUD operations (create, read, update, delete)
- Simple Epic → Story → Subtask hierarchy with validation
- Basic MCP Resources for exposing project context to Claude Code
- Simple project bootstrap with documentation templates
- **MCP Server Dashboard (MVP)**: Read-only web interface showing active sessions, issue counts, and system health

**Success Criteria:**

- Create project with basic issue hierarchy in H2 database
- MCP Resources provide project context to Claude Code agents
- Basic dependency tracking and unblocked task identification
- Cross-session project state recovery through MCP integration
- **Dashboard provides real-time visibility into system operations and project state**

### Phase 2 (Month 2): Essential Context Provision

- **Core Focus**: Enhanced MCP integration with context-aware features
- Simple dependency tracking (blocks/blocked relationships)
- Context provision engine for Claude Code analysis
- Basic project templates and scaffolding
- Manual issue status updates with basic validation
- Cross-session continuity through structured data persistence
- **Dashboard Enhancement**: Interactive dependency graph visualization and context flow monitoring

**Success Criteria:**

- Claude Code agents receive rich project context through MCP Resources
- Simple dependency graph traversal identifies unblocked work
- Project state persists and recovers across Claude Code sessions
- Basic project structure generation with template support
- **Dashboard displays dependency relationships and context provision flow**

### Phase 3 (Month 3): Provider Expansion

- **Core Focus**: Single additional provider (Linear) without abstraction
  complexity
- Linear integration with basic API operations
- Simple data export/import for provider switching
- Enhanced project templates based on usage patterns
- Basic project health checks and validation
- **Dashboard Analytics**: Provider sync status, migration tools, and performance metrics

**Success Criteria:**

- Linear provider integration with core CRUD operations
- Data migration from H2 to Linear preserves essential relationships
- Provider switching through simple export/import process
- Enhanced MCP Resources for provider-specific features
- **Dashboard shows provider synchronization status and migration progress**

### Future Phases (Month 4+): Incremental Expansion

- **Core Focus**: Additional providers based on proven demand
- GitHub Issues integration for open source projects
- Jira integration for enterprise workflows (if requested)
- Enhanced documentation templates and project patterns
- Simple analytics and progress tracking

**Success Criteria:**

- Additional providers added incrementally without breaking existing
  functionality
- Each provider maintains core MCP Resource compatibility
- Simple migration paths between any supported providers

### V3.0+ (Month 9+): Existing Project Integration

- **Core Focus**: Simple onboarding assistance for existing projects
- Onboarding Assistant with guided questionnaire approach
- Basic health checks for small projects (< 100 issues)
- Gradual integration strategies (Hybrid, Full, Conservative approaches)
- Manual remediation guidance with specific, actionable steps
- **Scope Limitation**: No automated analysis of large projects or complex
  inference

**Success Criteria:**

- Successful onboarding of small-to-medium existing projects
- Clear integration pathways that preserve team velocity
- Simple validation and recommendation system

This approach provides CycleTime as a data and context provider that enhances Claude
Code's existing capabilities with structured project information, cross-session
continuity, and intelligent task recommendations.
