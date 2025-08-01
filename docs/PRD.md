# JCVD: Comprehensive Project Orchestration Framework
## Product Requirements Document

**Version:** 3.0  
**Date:** July 30, 2025  
**Authors:** John Burbridge, Claude Code

**Related Documents:**  
📋 [PRD.md](PRD.md) | 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) | 👤 [USER_EXPERIENCE.md](USER_EXPERIENCE.md) | 🚀 [ONBOARDING.md](ONBOARDING.md)

---

## Executive Summary

**JCVD** is a comprehensive project orchestration framework designed specifically for the Claude Code ecosystem, transforming Claude Code from an excellent coding assistant into a complete software development lifecycle management platform. Building on Claude Code's proven agent capabilities and natural language workflow, JCVD creates and manages ALL artifacts required to execute a software project from inception to deployment, including specifications, architecture documentation, issue tracking and management, and repository setup.

Targeting the growing community of solo developers and freelancers who rely on Claude Code for productivity, JCVD addresses the specific challenges these users face: cognitive overload from maintaining entire project context, loss of project state between Claude Code sessions, and the need for professional project deliverables when working with clients.

The system operates on a project-centric model where every development effort begins with **Project Bootstrap** - either through an interactive requirements gathering interview or by accepting a user-provided PRD. JCVD then orchestrates the entire development lifecycle through intelligent issue tracking systems, ensuring structured progression from high-level design through proof-of-concept delivery, all while preserving Claude Code's familiar agent-based interaction model.

**Primary Value Proposition:**
Transform Claude Code from an excellent coding assistant into a complete project orchestration platform for solo developers and freelancers, providing systematic project management, cross-session continuity, and professional client deliverables while preserving Claude Code's natural development experience.

**Supporting Benefits:**
- **Claude Code Ecosystem Integration**: Seamlessly extends Claude Code's agent framework with project orchestration capabilities
- **Cross-Session Project Continuity**: Maintains project context and progress across multiple Claude Code sessions, solving a key pain point for solo developers
- **Comprehensive Artifact Generation**: Auto-creates professional project documentation, specifications, and structure through Claude Code's familiar natural language interface
- **Issue-Driven Workflow**: Uses Agile structure (Epic → Story → Subtasks) for comprehensive project tracking, reducing cognitive load for solo developers
- **Intelligent Task Orchestration**: LLM-powered analysis of issue dependency graphs provides intelligent next-task recommendations, replacing team input for solo developers
- **Solo Developer Cognitive Support**: Addresses context switching fatigue and mental overhead specific to solo development scenarios
- **Professional Client Deliverables**: Generates client-ready project artifacts and progress reports through Claude Code workflows
- **Developer-Controlled Architecture**: Open source, provider-agnostic design with complete data portability, aligned with Claude Code's transparency philosophy

## Project Vision

### Vision Statement
To create the first truly comprehensive project orchestration framework specifically for Claude Code users, extending Claude Code's existing capabilities to handle complete software development lifecycles - from initial concept through production deployment - while preserving Claude Code's developer-first philosophy of transparency and control.

### Problem Statement
While Claude Code excels at individual coding tasks and provides powerful agent capabilities, solo developers and freelancers using Claude Code face significant challenges with complete project orchestration:

**Solo Developer Specific Challenges:**
- **Cognitive Overload**: Solo developers must maintain entire project context (database schema to frontend animations) without team support, causing mental fatigue that Claude Code currently doesn't address systematically
- **Context Switching Drain**: Constant switching between requirements, architecture, implementation, and client communication fragments focus and productivity
- **Project Initiation Complexity**: No systematic approach within Claude Code for gathering requirements, defining scope, and creating comprehensive project structure
- **Cross-Session Context Loss**: Project knowledge and progress scattered across Claude Code conversations, with no persistence of project state between sessions
- **Task Prioritization Without Team Input**: Solo developers lack team members to help prioritize work, leading to suboptimal task sequencing and blocked progress
- **Client Communication Overhead**: Freelancers need professional project artifacts (PRDs, architecture docs, progress tracking) but lack efficient ways to generate and maintain these through Claude Code
- **Greenfield Project Setup Burden**: Starting new projects requires extensive manual setup that could be orchestrated through Claude Code's existing capabilities

**Claude Code Ecosystem Gaps:**
- **No Project Continuity Framework**: While Claude Code provides excellent session-based assistance, there's no system for maintaining project context and progress across multiple development sessions
- **Agent Coordination Limitations**: Though Claude Code has powerful individual agents, there's no orchestration layer to coordinate multi-step project workflows across agent interactions
- **Documentation Integration Missing**: Claude Code can generate excellent code but lacks integrated systems for maintaining project documentation, specifications, and architectural artifacts alongside development

### Solution Overview

JCVD provides a **comprehensive project orchestration platform** that:

1. **Project Bootstrap Management**: Interactive requirements gathering or PRD acceptance, followed by systematic project setup
2. **Complete Artifact Generation**: Creates all necessary documentation, specifications, and project structure in standardized locations
3. **Issue-Driven Orchestration**: Uses Epic → Story → Subtasks hierarchy for complete project tracking and dependency management
4. **Intelligent Task Sequencing**: LLM-powered analysis of project issues to determine optimal next actions based on dependencies, priorities, and project context
5. **Phase-Based Progression**: Structured movement through Project Bootstrap → Development/Alpha → subsequent phases using project milestones
6. **Repository Convention Enforcement**: Standardized `docs/` directory structure and project organization patterns
7. **Test-Driven Development Integration**: TDD practices built into all applicable workflows and task generation
8. **Agent Capability Enhancement**: Amplifies Claude Code's existing agent framework with project context and intelligent task recommendations
9. **Open Source Transparency**: Full source code visibility enabling custom extensions, security auditing, and community contributions
10. **No Vendor Lock-in**: Complete data portability and provider-agnostic architecture ensuring long-term flexibility

## Target Users

**Primary**: Solo/Freelance Software Engineers within the Claude Code Ecosystem

**Core Demographics:**
- **Existing Claude Code Users**: Developers already familiar with Claude Code's agent system and natural language development workflows
- **Solo Developers Using Claude Code**: Independent developers who rely on Claude Code for productivity but struggle with project-level orchestration and continuity
- **Freelance Consultants**: Professional developers using Claude Code who need to deliver structured project artifacts and demonstrate professional project management to clients
- **Productivity-Focused Engineers**: Developers who have experienced Claude Code's ability to "work like a team of five" but want systematic project orchestration to amplify this effect

**Specific Pain Points This Audience Faces:**
- Currently use Claude Code effectively for coding tasks but lose project context between sessions
- Need professional project deliverables (PRDs, architecture docs, progress tracking) for client work
- Want to leverage Claude Code's agent capabilities for complete project workflows, not just individual tasks
- Struggle with the cognitive overhead of maintaining entire project context without team support
- Seek to transform from "programmer managing Claude Code" to "engineering manager orchestrating through Claude Code"
- Desire systematic project setup and task prioritization that builds on Claude Code's existing strengths

**Behavioral Characteristics:**
- Already invested in Claude Code's workflow and terminology
- Comfortable with terminal-based AI interaction and agent delegation
- Value Claude Code's transparency and developer control philosophy
- Experience cognitive fatigue from context switching that Claude Code's task focus could address systematically
- Want professional project management without abandoning Claude Code's natural development experience

**Secondary**: Small Development Teams Already Using Claude Code (2-4 people)
- Teams who have adopted Claude Code for individual productivity and want project-level orchestration
- Claude Code-savvy startups needing rapid project setup within their existing development workflow
- Small consulting teams who want to standardize project delivery while leveraging their Claude Code investment

## Developer Experience Philosophy

JCVD is designed around core principles that extend Claude Code's developer-first philosophy to comprehensive project orchestration:

**Claude Code Ecosystem Integration First**
- Seamlessly extends Claude Code's existing agent framework without replacing familiar workflows
- Preserves Claude Code's natural language interaction model for all project orchestration tasks
- Maintains Claude Code's session-based development experience while adding cross-session project continuity
- Leverages Claude Code users' existing comfort with agent delegation and terminal-based AI interaction

**Developer Control First** *(Aligned with Claude Code's Philosophy)*
- All project data remains under developer control (local files, standard formats, portable data)
- No forced cloud dependencies or external service requirements for core functionality
- Complete transparency into system behavior through open source architecture
- Preserves Claude Code's commitment to developer autonomy and transparency

**Amplify, Don't Replace** *(Claude Code's Existing Strengths)*
- Transforms Claude Code from excellent coding assistant to complete project orchestration platform
- Builds on Claude Code's proven ability to help solo developers \"work like a team of five\"
- Extends Claude Code's agent capabilities with project context and intelligent task sequencing
- Maintains Claude Code's natural development flow while adding systematic project management

**Professional Without Bureaucracy** *(For Claude Code's Solo Developer Audience)*
- Structured workflows that enhance Claude Code's productivity benefits rather than impede development velocity
- Intelligent defaults that minimize configuration while maximizing Claude Code's utility for complete projects
- Focus on delivering professional project artifacts through Claude Code's familiar interface
- Addresses solo developer pain points (cognitive overload, context switching) that Claude Code users specifically experience

## Core Functional Requirements

### FR1: Project Bootstrap Orchestration

**FR1.1: Requirements Gathering System**
- Interactive interview process to gather project requirements, scope, and constraints
- Alternative path: Accept user-provided PRD.md and validate completeness
- Generate comprehensive PRD.md stored in `docs/` directory following standardized template
- Capture technical requirements, business requirements, success criteria, and constraints

**FR1.2: Project Structure Generation**
- Create standardized `docs/` directory structure for all project documentation
- Generate repository scaffolding appropriate for detected project type (web app, API, mobile, etc.)
- Create initial development toolchain setup (package.json, build configs, testing frameworks)
- Establish issue tracking project structure with appropriate labels and issue types

**FR1.3: High-Level Design Orchestration**
- Create Epic/Story/Subtask hierarchy based on PRD requirements
- Generate architecture and system design issues with proper dependencies
- Create repository setup tasks with dependency ordering
- Populate issue tracker with sufficient backlog to reach proof-of-concept/demo milestone

### FR2: Issue-Driven Task Orchestration

**FR2.1: Intelligent Next-Task Determination**
- LLM-powered analysis of issue dependency graph, priorities, and current project state
- Consider issue relationships, prerequisites, and optimal development sequence
- Factor in current repository state and completed work when recommending next tasks
- Provide reasoning for task recommendations including dependency analysis

**FR2.2: Issue Lifecycle Management**
- Automatic issue updates as work progresses through subtasks
- Status transitions based on completion criteria and validation results
- Dependency tracking and automatic unblocking of subsequent tasks
- Progress reporting with detailed completion summaries

**FR2.3: Milestone and Phase Management**
- Use project milestones to track major project phases (Project Bootstrap, Development/Alpha, Beta, etc.)
- Automatic milestone progression based on completion criteria
- Phase-appropriate task generation and backlog management
- Adaptive planning - support both up-front planning and iterative discovery

### FR3: Comprehensive Documentation Management

**FR3.1: Standardized Documentation Structure**
- Enforce consistent `docs/` directory organization across all projects
- Auto-generate and maintain architecture documentation, API specifications, and design documents
- Version control integration for all documentation artifacts
- Template-based document generation with project-specific customization

**FR3.2: Documentation Maintenance System**
- Provide AI suggestions for keeping documentation synchronized with implementation progress
- Support manual updates to specifications and architecture docs as implementation evolves
- Generate decision logs and architectural decision records (ADRs) templates
- Maintain traceability between requirements, design, and implementation through structured links

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
- Context-aware suggestions based on current project phase and issue tracking state
- Intelligent task delegation to Claude Code's built-in agents based on task type
- Progress reporting and status updates through normal Claude Code conversation

**FR5.2: MCP Server Architecture**
- Comprehensive MCP server exposing project orchestration capabilities
- LLM-powered task analysis and recommendation engine
- Issue tracking API integration for complete issue lifecycle management
- Repository and documentation management through standard file operations

**FR5.3: Agent Configuration Management**
- Default agent provisioning with sensible configurations for common development tasks
- User-controlled agent discovery and configuration management
- Intelligent task-to-agent recommendations based on task type, project context, and available agents
- Context provision system that enhances Claude Code's native agents with project-specific information
- Seamless integration with Claude Code's existing agent framework without replacement or external coordination

## System Architecture

JCVD uses a provider-agnostic architecture that supports multiple issue tracking backends (SQLite, Linear, GitHub Issues, Jira) through a unified interface. This enables complete offline operation with embedded SQLite while providing seamless migration to cloud providers when ready.

**Core Design Principles:**
- **Developer Control First**: All data remains local and portable
- **Provider Abstraction**: Unified interface across all issue tracking systems
- **Offline Capability**: Full functionality without external dependencies
- **Migration Support**: Easy data migration between providers

For detailed technical specifications, database schemas, and component architecture, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Claude Code Agent Integration

JCVD is designed specifically for the Claude Code user community, working seamlessly **with** Claude Code's existing agent framework to address the unique challenges solo developers and freelancers face when managing complete projects. This architectural approach ensures:

**Agent Enhancement for Solo Developer Workflows**
- Claude Code's native agents (Developer, QA, Product Manager, etc.) remain the primary execution layer that solo developers already know and trust
- JCVD provides project context, task recommendations, and orchestration intelligence to these existing agents, reducing the cognitive load of maintaining entire project context
- No custom agent implementations or external coordination protocols required - preserves Claude Code users' existing workflow familiarity

**Context-Aware Task Intelligence for Solo Development**
- JCVD analyzes issue dependencies, project state, and task types to provide intelligent recommendations, addressing the lack of team input that solo developers typically face
- Agents receive enhanced context about project goals, current phase, and optimal next actions, reducing context switching fatigue
- Task delegation happens naturally through Claude Code's existing Task tool and agent system that users already understand
- Transforms solo developers from \"managing Claude Code sessions\" to \"orchestrating project workflows through Claude Code\"

**Seamless Integration Model for Claude Code Ecosystem**
- JCVD operates as an MCP server that enhances Claude Code's capabilities from within, maintaining the terminal-based AI interaction that Claude Code users prefer
- All agent interactions happen through Claude Code's native session management, preserving user workflow familiarity
- Project orchestration intelligence is delivered through natural language recommendations, consistent with Claude Code's existing interaction model
- Cross-session project continuity addresses one of the biggest pain points Claude Code users face when working on larger projects

This approach ensures that JCVD amplifies Claude Code's proven ability to help solo developers \"work like a team of five\" by adding systematic project management capabilities without disrupting the development experience that attracted users to Claude Code in the first place.

## Project Phases

JCVD organizes software development into structured phases:

1. **Project Bootstrap**: Requirements gathering, project setup, and initial architecture
2. **Development/Alpha Phase**: Proof-of-concept implementation with TDD practices
3. **Subsequent Phases**: Beta, production, and maintenance with milestone-driven progression

Each phase has defined entry/exit criteria, key activities, and success metrics to ensure structured progression from concept to delivery.

For detailed phase workflows and user experiences, see [USER_EXPERIENCE.md](USER_EXPERIENCE.md).

## User Experience Overview

JCVD prioritizes developer control and simplicity through Claude Code's familiar interaction model:

1. **First-Time Setup**: Simple installation as MCP server with offline-first embedded database, maintaining Claude Code's developer control philosophy
2. **Project Creation Within Claude Code**: Interactive requirements gathering through natural language conversation, followed by complete project structure generation through Claude Code agents
3. **Daily Development Through Claude Code**: Intelligent task recommendations and agent delegation based on dependencies and project context, preserving Claude Code's proven workflow
4. **Cross-Session Continuity**: Seamless project state recovery across Claude Code sessions, solving the context loss problem solo developers face
5. **Professional Output for Freelancers**: Client-ready project artifacts and progress reports generated through familiar Claude Code interactions

This approach ensures that existing Claude Code users can immediately leverage JCVD's project orchestration capabilities without learning new interfaces or abandoning their proven development workflows.

For detailed user workflows, setup processes, and daily development experiences, see [USER_EXPERIENCE.md](USER_EXPERIENCE.md).

## Project Integration

### New Projects
JCVD provides comprehensive greenfield project support through Project Bootstrap, including requirements gathering, project structure creation, and complete development environment setup.

### Existing Projects  
JCVD uses a simple "Onboarding Assistant" with targeted questions to recommend integration strategies:

- **Small Projects (10-50 issues)**: Full integration with quick setup (2-4 hours)
- **Medium Projects (50-200 issues)**: Hybrid approach starting with new work
- **Large Projects (200+ issues)**: Conservative pilot approach with gradual expansion

For detailed onboarding workflows, integration strategies, and realistic scope limitations, see [ONBOARDING.md](ONBOARDING.md).

## Success Metrics

### Project Bootstrap Success
- **Setup Time**: Complete project bootstrap in <2 hours for simple projects, <1 day for complex
- **Documentation Quality**: Generated PRDs score >8/10 on completeness assessment
- **Issue Tracking Structure**: Proper Epic/Story/Subtask hierarchy with realistic estimates
- **Developer Satisfaction**: >90% of users report clear understanding of project scope and next steps

### Development Phase Success  
- **Task Clarity**: >80% of recommended next tasks are actionable without additional clarification
- **Dependency Management**: <5% of tasks blocked due to unresolved dependencies
- **Quality Maintenance**: >90% of completed stories pass quality gates on first attempt
- **Velocity Tracking**: Accurate story point estimation within 20% of actual completion time
- **Claude Code Agent Integration**: >85% of task-to-agent recommendations are accepted and successfully executed by Claude Code's existing agents
- **Context Utilization**: >90% of Claude Code agent interactions benefit from JCVD-provided project context
- **Cross-Session Continuity**: >95% of users successfully resume project work in new Claude Code sessions without context loss
- **Cognitive Load Reduction**: >80% of solo developers report reduced mental fatigue from context switching when using JCVD
- **Seamless Experience**: <2% of users report friction or confusion with agent delegation and recommendations within Claude Code

### Overall System Success
- **Project Completion Rate**: >80% of projects started reach their defined success criteria
- **Time to Value**: First proof-of-concept delivered within planned timeline 90% of time
- **Documentation Fidelity**: Architecture docs remain synchronized with implementation >85% of time
- **User Retention**: >85% of users complete multiple projects using JCVD framework

## Implementation Roadmap

### Proof of Concept (Month 1): Embedded Database Foundation
- **Core Focus**: SQLite-based local mode with full feature parity
- Embedded SQLite provider with optimized schema
- Basic requirements gathering interview system
- Simple project structure generation and repository scaffolding
- Local database initialization and configuration management
- Fundamental issue lifecycle operations (create, read, update)
- Basic dependency tracking and relationship management

**Success Criteria:**
- Create project with Epic → Story → Subtask hierarchy in local database
- Perform basic CRUD operations on issues with full data persistence
- Demonstrate dependency graph creation and traversal
- Generate simple project documentation structure

### MVP (Months 2-3): Complete Local Orchestration
- **Core Focus**: Full task orchestration using embedded database
- LLM-powered issue analysis and intelligent next-task recommendation
- Complete dependency graph analysis and optimal task sequencing
- Comprehensive workflow state management and persistence
- TDD methodology integration with workflow substates  
- Cross-session continuity and project state recovery
- PRD generation and validation system

**Success Criteria:**
- Complete end-to-end project creation and management locally
- Intelligent task recommendations based on dependency analysis
- Full TDD workflow support with substate transitions
- Seamless cross-session project continuation

### V1.0 (Months 4-5): Multi-Provider Architecture + Linear Integration
- **Core Focus**: Provider abstraction layer with Linear integration
- Complete IssueProvider interface implementation
- Linear provider with full API integration and bidirectional sync
- Provider switching and data migration capabilities
- Enhanced requirements gathering with adaptive questioning
- Advanced project type detection and technology-specific scaffolding

**Success Criteria:**
- Seamless migration from SQLite to Linear while preserving all data and relationships
- Full Linear integration with team collaboration features
- Provider-agnostic operations work identically across SQLite and Linear

### V2.0 (Months 6-8): Extended Provider Ecosystem
- **Core Focus**: GitHub Issues and Jira provider support
- GitHub Issues provider with repository integration
- Jira provider with enterprise workflow support
- Advanced multi-provider synchronization capabilities
- Custom workflow templates and methodology frameworks
- Enhanced analytics and velocity tracking across providers
- Team collaboration features and shared project access

**Success Criteria:**
- Support for 4 distinct issue tracking providers (SQLite, Linear, GitHub, Jira)
- Cross-provider data migration and synchronization
- Custom workflow definition and template system

### V3.0+ (Month 9+): Existing Project Integration
- **Core Focus**: Simple onboarding assistance for existing projects
- Onboarding Assistant with guided questionnaire approach
- Basic health checks for small projects (< 100 issues)
- Gradual integration strategies (Hybrid, Full, Conservative approaches)
- Manual remediation guidance with specific, actionable steps
- **Scope Limitation**: No automated analysis of large projects or complex inference

**Success Criteria:**
- Successful onboarding of small-to-medium existing projects
- Clear integration pathways that preserve team velocity
- Simple validation and recommendation system

This comprehensive approach transforms JCVD from a coding assistant into a complete project orchestration platform that handles every aspect of software development from conception to delivery.