# JCVD: Comprehensive Project Orchestration Framework
## Product Requirements Document

**Version:** 3.0  
**Date:** July 30, 2025  
**Authors:** John Burbridge, Claude Code

**Related Documents:**  
📋 [PRD.md](PRD.md) | 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) | 👤 [USER_EXPERIENCE.md](USER_EXPERIENCE.md) | 🚀 [ONBOARDING.md](ONBOARDING.md)

---

## Executive Summary

**JCVD** is a comprehensive project orchestration framework that transforms Claude Code into a complete software development partner. Unlike traditional coding assistants, JCVD creates and manages ALL artifacts required to execute a software project from inception to deployment, including specifications, architecture documentation, issue tracking and management, and repository setup.

The system operates on a project-centric model where every development effort begins with an **Inception Phase** - either through an interactive requirements gathering interview or by accepting a user-provided PRD. JCVD then orchestrates the entire development lifecycle through intelligent issue tracking systems, ensuring structured progression from high-level design through proof-of-concept delivery.

**Primary Value Proposition:**
Transform Claude Code from a coding assistant into a complete software development partner that orchestrates the entire project lifecycle from requirements gathering to deployment-ready code.

**Supporting Benefits:**
- **Comprehensive Artifact Generation**: Auto-creates all necessary documentation, specifications, and project structure
- **Issue-Driven Workflow**: Uses Agile structure (Epic → Story → Subtasks) for comprehensive project tracking
- **Intelligent Task Orchestration**: LLM-powered analysis of issue dependency graphs to determine optimal next actions
- **Phase-Based Development**: Structured progression through Inception, Development/Alpha, and delivery phases
- **Developer-Controlled Architecture**: Open source, provider-agnostic design with complete data portability

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
- **Vendor Lock-in Concerns**: Proprietary AI assistants create dependency on external services with limited transparency or control
- **Lack of Customization**: Closed-source solutions can't be adapted to specific workflows or extended with custom functionality

### Solution Overview

JCVD provides a **comprehensive project orchestration platform** that:

1. **Inception Phase Management**: Interactive requirements gathering or PRD acceptance, followed by systematic project setup
2. **Complete Artifact Generation**: Creates all necessary documentation, specifications, and project structure in standardized locations
3. **Issue-Driven Orchestration**: Uses Epic → Story → Subtasks hierarchy for complete project tracking and dependency management
4. **Intelligent Task Sequencing**: LLM-powered analysis of project issues to determine optimal next actions based on dependencies, priorities, and project context
5. **Phase-Based Progression**: Structured movement through Inception → Development/Alpha → subsequent phases using project milestones
6. **Repository Convention Enforcement**: Standardized `docs/` directory structure and project organization patterns
7. **Test-Driven Development Integration**: TDD practices built into all applicable workflows and task generation
8. **Open Source Transparency**: Full source code visibility enabling custom extensions, security auditing, and community contributions
9. **No Vendor Lock-in**: Complete data portability and provider-agnostic architecture ensuring long-term flexibility

## Target Users

**Primary**: Individual Software Engineers and Freelancers
- Solo developers starting new projects who need comprehensive project structure and management
- Freelancers who want to demonstrate professional project management to clients
- Engineers who want to follow best practices but lack the time to set up comprehensive project infrastructure
- Developers transitioning from ad-hoc development to structured, professional workflows

**Secondary**: Small Development Teams (2-4 people)  
- Startups needing rapid project setup and structured development workflows
- Small consulting teams who want to standardize their project delivery approach
- Teams who want to use issue tracking effectively for Agile development practices

## Developer Experience Philosophy

JCVD is designed around core principles that prioritize developer autonomy, simplicity, and long-term sustainability:

**Developer Control First**
- All project data remains under developer control (local files, standard formats, portable data)
- No forced cloud dependencies or external service requirements for core functionality
- Complete transparency into system behavior through open source architecture

**Simplicity Over Complexity**
- Single command setup with sensible defaults that work immediately
- Progressive disclosure: basic functionality accessible immediately, advanced features discoverable
- Convention over configuration: follow established patterns while allowing customization

**Long-term Sustainability**
- Provider-agnostic architecture prevents tool lock-in
- Standard file formats and database schemas enable easy migration
- Open source ensures continuity regardless of commercial changes

**Professional Without Bureaucracy**
- Structured workflows that enhance rather than impede development velocity
- Intelligent defaults that minimize configuration while maximizing utility
- Focus on delivering value quickly while maintaining professional project standards

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
- Use project milestones to track major project phases (Inception, Development/Alpha, Beta, etc.)
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

## System Architecture

JCVD uses a provider-agnostic architecture that supports multiple issue tracking backends (SQLite, Linear, GitHub Issues, Jira) through a unified interface. This enables complete offline operation with embedded SQLite while providing seamless migration to cloud providers when ready.

**Core Design Principles:**
- **Developer Control First**: All data remains local and portable
- **Provider Abstraction**: Unified interface across all issue tracking systems
- **Offline Capability**: Full functionality without external dependencies
- **Migration Support**: Easy data migration between providers

For detailed technical specifications, database schemas, and component architecture, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Project Phases

JCVD organizes software development into structured phases:

1. **Inception Phase**: Requirements gathering, project setup, and initial architecture
2. **Development/Alpha Phase**: Proof-of-concept implementation with TDD practices
3. **Subsequent Phases**: Beta, production, and maintenance with milestone-driven progression

Each phase has defined entry/exit criteria, key activities, and success metrics to ensure structured progression from concept to delivery.

For detailed phase workflows and user experiences, see [USER_EXPERIENCE.md](USER_EXPERIENCE.md).

## User Experience Overview

JCVD prioritizes developer control and simplicity through:

1. **First-Time Setup**: Simple installation with offline-first embedded database or optional cloud provider integration
2. **Project Creation**: Interactive requirements gathering followed by complete project structure generation
3. **Daily Development**: Intelligent task recommendations based on dependencies and project context
4. **Cross-Session Continuity**: Seamless project state recovery across Claude Code sessions

For detailed user workflows, setup processes, and daily development experiences, see [USER_EXPERIENCE.md](USER_EXPERIENCE.md).

## Project Integration

### New Projects
JCVD provides comprehensive greenfield project support through the Inception Phase, including requirements gathering, project structure creation, and complete development environment setup.

### Existing Projects  
JCVD uses a simple "Onboarding Assistant" with targeted questions to recommend integration strategies:

- **Small Projects (10-50 issues)**: Full integration with quick setup (2-4 hours)
- **Medium Projects (50-200 issues)**: Hybrid approach starting with new work
- **Large Projects (200+ issues)**: Conservative pilot approach with gradual expansion

For detailed onboarding workflows, integration strategies, and realistic scope limitations, see [ONBOARDING.md](ONBOARDING.md).

## Success Metrics

### Inception Phase Success
- **Setup Time**: Complete project inception in <2 hours for simple projects, <1 day for complex
- **Documentation Quality**: Generated PRDs score >8/10 on completeness assessment
- **Issue Tracking Structure**: Proper Epic/Story/Subtask hierarchy with realistic estimates
- **Developer Satisfaction**: >90% of users report clear understanding of project scope and next steps

### Development Phase Success  
- **Task Clarity**: >80% of recommended next tasks are actionable without additional clarification
- **Dependency Management**: <5% of tasks blocked due to unresolved dependencies
- **Quality Maintenance**: >90% of completed stories pass quality gates on first attempt
- **Velocity Tracking**: Accurate story point estimation within 20% of actual completion time

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