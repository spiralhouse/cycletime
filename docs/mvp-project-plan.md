# CycleTime MVP Project Plan

**Created**: 2025-01-04  
**Status**: Planning  
**Timeline**: 6 weeks  
**Team**: Spiral House  

## Overview

This document outlines the MVP project plan for CycleTime - an intelligent project orchestration platform. The MVP focuses on local Docker deployment with GitHub and Linear integration only, targeting single-user use cases. **Scope Update**: Limited to Anthropic's Claude 4 Sonnet for all AI tasks to reduce complexity and accelerate development.

## Linear Project Structure

**Project**: CycleTime MVP  
**Location**: CycleTime Scrum project  
**Issue Prefix**: SPI-  

### Hierarchy
- **Project**: CycleTime MVP (single project)
- **Milestones**: Epic-level groupings (6 total, one per week)
- **Issues**: Individual features/capabilities  
- **Sub-issues**: Technical design + implementation tasks

## Milestones & Issues

### Milestone 1: Foundation & Infrastructure (Week 1)

**SPI-10: Docker Development Environment**
- **Description**: Set up complete local development environment with Docker
- **Sub-issues**:
  - `SPI-10-DESIGN`: Technical design for development environment
  - `SPI-10-1`: Docker compose setup with PostgreSQL, Redis, core services
  - `SPI-10-2`: Environment configuration management system
  - `SPI-10-3`: Local service orchestration with health checks

**SPI-11: Core Database Schema**
- **Description**: Design and implement foundational database schemas
- **Sub-issues**:
  - `SPI-11-DESIGN`: Technical design for database schema
  - `SPI-11-1`: Prisma schema for core entities (projects, users, documents, tasks)
  - `SPI-11-2`: Database migration system and seed data
  - `SPI-11-3`: Connection pooling and backup procedures

**SPI-12: API Gateway & Authentication**
- **Description**: Implement central API gateway with GitHub OAuth
- **Sub-issues**:
  - `SPI-12-DESIGN`: Technical design for API gateway and auth
  - `SPI-12-1`: Express/Fastify API gateway with routing
  - `SPI-12-2`: GitHub OAuth integration and JWT management
  - `SPI-12-3`: Rate limiting, validation, and RBAC foundation

**SPI-13: CI/CD Pipeline Setup**
- **Description**: Establish automated testing and deployment pipeline
- **Sub-issues**:
  - `SPI-13-DESIGN`: Technical design for CI/CD pipeline
  - `SPI-13-1`: GitHub Actions workflow for testing and quality checks
  - `SPI-13-2`: Docker image building and automated deployment
  - `SPI-13-3`: Security scanning and test coverage reporting

### Milestone 2: AI Integration (Week 2)

**SPI-14: Claude AI Service** 
- **Description**: Build foundational AI service with Anthropic Claude 4 Sonnet integration
- **Sub-issues**: Sub-issues will be created after technical design is approved
- **Scope**: Direct Anthropic API integration only, simplified error handling

**SPI-16: Anthropic Usage Tracking**
- **Description**: Implement usage tracking and basic cost monitoring for Anthropic API
- **Sub-issues**: Sub-issues will be created after technical design is approved  
- **Scope**: Single-provider usage analytics, budget alerts

**SPI-17: PRD Analysis Engine**
- **Description**: Build core PRD analysis and document generation using Claude 4 Sonnet
- **Sub-issues**: Sub-issues will be created after technical design is approved
- **Scope**: PRD analysis, project plan generation, template creation

**~~SPI-15: Model Selection Logic~~** *(Eliminated - not needed for single-model approach)*

### Milestone 3: Repository Integration (Week 3)

**SPI-18: GitHub Integration**
- **Description**: Implement Git repository operations and webhooks
- **Sub-issues**: Sub-issues will be created after technical design is approved

**SPI-19: Document Processing**
- **Description**: Build Markdown document parsing and analysis
- **Sub-issues**: Sub-issues will be created after technical design is approved

**SPI-20: Linear API Integration**
- **Description**: Connect with Linear for issue management
- **Sub-issues**: Sub-issues will be created after technical design is approved

### Milestone 4: Web Interface (Week 4)

**SPI-21: Web Dashboard**
- **Description**: Build React-based user interface
- **Sub-issues**:
  - `SPI-20-DESIGN`: Technical design for web dashboard
  - `SPI-20-1`: React/Next.js setup with basic layout
  - `SPI-20-2`: Project overview and navigation
  - `SPI-20-3`: Document preview and editing interface

**SPI-21: Project Management Interface**
- **Description**: Create interface for managing projects and analysis
- **Sub-issues**:
  - `SPI-21-DESIGN`: Technical design for project management UI
  - `SPI-21-1`: PRD upload and analysis trigger interface
  - `SPI-21-2`: Generated document viewing and editing
  - `SPI-21-3`: Progress tracking and status visualization

**SPI-22: Configuration Management**
- **Description**: Build interface for API keys and settings
- **Sub-issues**: Sub-issues will be created after technical design is approved
- **Scope**: API key management (Anthropic, GitHub, Linear), repository/workspace selection, basic preferences

**SPI-23: Issue Creation Workflow**
- **Description**: Interface for Linear issue creation and management
- **Sub-issues**:
  - `SPI-23-DESIGN`: Technical design for issue workflow UI
  - `SPI-23-1`: Issue creation preview and customization
  - `SPI-23-2`: Linear integration status and monitoring
  - `SPI-23-3`: Issue template management

### Milestone 5: MCP Server (Week 5)

**SPI-22: MCP Server**
- **Description**: Implement MCP server for Local AI integration
- **Sub-issues**:
  - `SPI-24-DESIGN`: Technical design for MCP server
  - `SPI-24-1`: MCP protocol implementation and server setup
  - `SPI-24-2`: Tool definitions for repository and project context
  - `SPI-24-3`: Authentication and security for MCP access

**SPI-25: Repository Context Provider**
- **Description**: Provide repository context to Local AI
- **Sub-issues**:
  - `SPI-25-DESIGN`: Technical design for context provision
  - `SPI-25-1`: Repository documentation access tools
  - `SPI-25-2`: Project context and status retrieval
  - `SPI-25-3`: Cross-reference and dependency analysis

**SPI-26: Local AI Integration**
- **Description**: Enable integration with Claude/Copilot
- **Sub-issues**: Sub-issues will be created after technical design is approved
- **Scope**: MCP tools for task context, implementation suggestions, design feedback (no model routing needed)

**SPI-27: CLI Tool**
- **Description**: Command-line interface for project management
- **Sub-issues**:
  - `SPI-27-DESIGN`: Technical design for CLI tool
  - `SPI-27-1`: Project initialization and setup commands
  - `SPI-27-2`: PRD analysis and issue creation commands
  - `SPI-27-3`: Local MCP server management

### Milestone 6: Polish & Testing (Week 6)

**SPI-23: MVP Testing & Polish**
- **Description**: Build complete test suite for all components
- **Sub-issues**:
  - `SPI-28-DESIGN`: Technical design for testing strategy
  - `SPI-28-1`: Unit tests for core services and logic
  - `SPI-28-2`: Integration tests for API endpoints and external services
  - `SPI-28-3`: End-to-end tests for complete workflows

**SPI-29: Documentation & Setup**
- **Description**: Create user documentation and setup guides
- **Sub-issues**:
  - `SPI-29-DESIGN`: Technical design for documentation structure
  - `SPI-29-1`: Installation and setup documentation
  - `SPI-29-2`: User guides and API documentation
  - `SPI-29-3`: Troubleshooting and FAQ documentation

**SPI-30: Error Handling & Polish**
- **Description**: Improve error handling and user experience
- **Sub-issues**:
  - `SPI-30-DESIGN`: Technical design for error handling
  - `SPI-30-1`: Comprehensive error handling and user feedback
  - `SPI-30-2`: Performance optimization and monitoring
  - `SPI-30-3`: UI/UX polish and accessibility improvements

**SPI-31: Demo Preparation**
- **Description**: Prepare MVP for demonstration and feedback
- **Sub-issues**:
  - `SPI-31-DESIGN`: Technical design for demo scenario
  - `SPI-31-1`: End-to-end demo scenario development
  - `SPI-31-2`: Demo data and example projects
  - `SPI-31-3`: Feedback collection and iteration planning

## Workflow Process

### Per Issue Workflow
1. **Issue Creation**: Create issue in appropriate milestone
2. **Technical Design**: Create design sub-issue (`SPI-X-DESIGN`) and move to "In Progress"
3. **Design Document**: Create technical design in `/docs/technical-designs/[feature-name].md`
4. **Design Review**: Submit design PR and move design subtask to "In Review"
5. **Design Approval**: Wait for approval before proceeding
6. **Implementation Tasks**: Create implementation sub-issues based on approved design
7. **TDD Implementation**: Follow Red-Green-Refactor cycle for each sub-issue
8. **Feature Completion**: Create feature PR and move parent issue to "In Review"

### Dependencies
- **Foundation** (SPI-8, SPI-9, SPI-10, SPI-11) → **AI Integration** (SPI-12, SPI-13)
- **AI Integration** → **Repository Integration** (SPI-16, SPI-17)
- **Repository Integration** + **AI Integration** → **Web Interface** (SPI-20, SPI-21)
- **All Core Services** → **MCP Server** (SPI-24, SPI-25)
- **All Features** → **Polish & Testing** (SPI-28, SPI-29)

## Success Criteria

### Functional Requirements
- [ ] Analyze PRD.md and generate project-plan.md in <5 minutes
- [ ] Create Linear issues with documentation links
- [ ] MCP server provides repository context to Local AI
- [ ] Web interface allows complete project management
- [ ] Docker setup completes in <10 minutes

### Technical Requirements
- [ ] All services run in Docker containers
- [ ] GitHub OAuth authentication works
- [ ] Linear API integration creates issues successfully
- [ ] Claude 4 Sonnet integration works reliably (95%+ success rate)
- [ ] MCP server integrates with Claude/Copilot

### Quality Requirements
- [ ] 80%+ test coverage across all services
- [ ] All technical designs approved before implementation
- [ ] Comprehensive documentation for setup and usage
- [ ] Working end-to-end demo scenario
- [ ] Clean, maintainable codebase following TDD practices

## Risk Mitigation

### Technical Risks
- **Claude API Dependencies**: Implement robust error handling, retry logic, and backup plans
- **Integration Complexity**: Start with simple implementations, iterate
- **Local Environment Issues**: Comprehensive Docker setup and documentation

### Project Risks
- **Scope Creep**: Strict adherence to MVP feature set
- **Technical Debt**: Mandatory technical design phase for all features
- **Quality Issues**: TDD practices and comprehensive testing

## Resource Requirements
- **Development**: 1-2 senior developers
- **Timeline**: 6 weeks (30 working days)  
- **External APIs**: Anthropic Claude 4 Sonnet, GitHub, Linear API access
- **Infrastructure**: Local Docker environment only

## Created Linear Issues

The following Linear issues have been created in the CycleTime Scrum project:

### Milestone 1: Foundation & Infrastructure
- **SPI-10**: Docker Development Environment
- **SPI-11**: Core Database Schema  
- **SPI-12**: API Gateway & Authentication
- **SPI-13**: CI/CD Pipeline Setup

### Milestone 2: AI Integration  
- **SPI-14**: Claude AI Service *(simplified from AI Orchestration Service)*
- **~~SPI-15~~**: ~~Model Selection Logic~~ *(eliminated)*
- **SPI-16**: Anthropic Usage Tracking *(simplified from Cost Tracking System)*
- **SPI-17**: PRD Analysis Engine *(scope clarified for Claude 4 Sonnet only)*

### Milestone 3: Repository Integration
- **SPI-18**: GitHub Integration
- **SPI-19**: Document Processing
- **SPI-20**: Linear API Integration

### Milestone 4: Web Interface
- **SPI-21**: Web Dashboard

### Milestone 5: MCP Server
- **SPI-22**: MCP Server

### Milestone 6: Testing & Polish
- **SPI-23**: MVP Testing & Polish

**Total Issues Created**: 13 core issues *(SPI-15 eliminated for single-model approach)*
**Next Steps**: Create technical design sub-issues as each issue is started

### **Scope Reduction Benefits**
- **Simplified architecture**: Direct Claude API integration instead of orchestration layer
- **Reduced complexity**: Single provider eliminates model routing complexity  
- **Faster development**: Fewer abstraction layers and configuration options
- **Lower risk**: Fewer external dependencies and failure points
- **Easier maintenance**: Simpler codebase with single AI provider integration

---

*This document will be updated as the project progresses and requirements evolve.*