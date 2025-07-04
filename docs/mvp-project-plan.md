# CycleTime MVP Project Plan

**Created**: 2025-01-04  
**Status**: Planning  
**Timeline**: 6 weeks  
**Team**: Spiral House  

## Overview

This document outlines the MVP project plan for CycleTime - an intelligent project orchestration platform. The MVP focuses on local Docker deployment with GitHub and Linear integration only, targeting single-user use cases.

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

**SPI-8: Docker Development Environment**
- **Description**: Set up complete local development environment with Docker
- **Sub-issues**:
  - `SPI-8-DESIGN`: Technical design for development environment
  - `SPI-8-1`: Docker compose setup with PostgreSQL, Redis, core services
  - `SPI-8-2`: Environment configuration management system
  - `SPI-8-3`: Local service orchestration with health checks

**SPI-9: Core Database Schema**
- **Description**: Design and implement foundational database schemas
- **Sub-issues**:
  - `SPI-9-DESIGN`: Technical design for database schema
  - `SPI-9-1`: Prisma schema for core entities (projects, users, documents, tasks)
  - `SPI-9-2`: Database migration system and seed data
  - `SPI-9-3`: Connection pooling and backup procedures

**SPI-10: API Gateway & Authentication**
- **Description**: Implement central API gateway with GitHub OAuth
- **Sub-issues**:
  - `SPI-10-DESIGN`: Technical design for API gateway and auth
  - `SPI-10-1`: Express/Fastify API gateway with routing
  - `SPI-10-2`: GitHub OAuth integration and JWT management
  - `SPI-10-3`: Rate limiting, validation, and RBAC foundation

**SPI-11: CI/CD Pipeline Setup**
- **Description**: Establish automated testing and deployment pipeline
- **Sub-issues**:
  - `SPI-11-DESIGN`: Technical design for CI/CD pipeline
  - `SPI-11-1`: GitHub Actions workflow for testing and quality checks
  - `SPI-11-2`: Docker image building and automated deployment
  - `SPI-11-3`: Security scanning and test coverage reporting

### Milestone 2: AI Integration (Week 2)

**SPI-12: AI Orchestration Service**
- **Description**: Build foundational AI service with provider management
- **Sub-issues**:
  - `SPI-12-DESIGN`: Technical design for AI orchestration
  - `SPI-12-1`: Service architecture with OpenAI/Anthropic integration
  - `SPI-12-2`: Request/response logging and error handling
  - `SPI-12-3`: Provider health checking and retry mechanisms

**SPI-13: Model Selection Logic**
- **Description**: Implement intelligent routing for optimal model selection
- **Sub-issues**:
  - `SPI-13-DESIGN`: Technical design for model routing
  - `SPI-13-1`: Task classification system (planning, coding, documentation)
  - `SPI-13-2`: Model selection algorithm based on complexity
  - `SPI-13-3`: Fallback mechanisms and manual override capabilities

**SPI-14: Cost Tracking System**
- **Description**: Implement cost tracking and optimization
- **Sub-issues**:
  - `SPI-14-DESIGN`: Technical design for cost optimization
  - `SPI-14-1`: Real-time cost tracking per request
  - `SPI-14-2`: Budget management and alerting system
  - `SPI-14-3`: Usage analytics and cost forecasting

**SPI-15: PRD Analysis Engine**
- **Description**: Build core PRD analysis and document generation
- **Sub-issues**:
  - `SPI-15-DESIGN`: Technical design for PRD analysis
  - `SPI-15-1`: Markdown parsing and PRD analysis with AI
  - `SPI-15-2`: Project plan and documentation generation
  - `SPI-15-3`: Template system and validation

### Milestone 3: Repository Integration (Week 3)

**SPI-16: GitHub Integration**
- **Description**: Implement Git repository operations and webhooks
- **Sub-issues**:
  - `SPI-16-DESIGN`: Technical design for GitHub integration
  - `SPI-16-1`: Repository cloning and file operations
  - `SPI-16-2`: Webhook processing and branch management
  - `SPI-16-3`: Repository health monitoring and cleanup

**SPI-17: Document Processing**
- **Description**: Build Markdown document parsing and analysis
- **Sub-issues**:
  - `SPI-17-DESIGN`: Technical design for document processing
  - `SPI-17-1`: Markdown parsing with frontmatter support
  - `SPI-17-2`: Document structure validation and cross-references
  - `SPI-17-3`: Version tracking and Mermaid diagram support

**SPI-18: Template Generation**
- **Description**: Create system for generating documentation templates
- **Sub-issues**:
  - `SPI-18-DESIGN`: Technical design for template generation
  - `SPI-18-1`: Template engine for different document types
  - `SPI-18-2`: AI-assisted template generation
  - `SPI-18-3`: Template validation and versioning

**SPI-19: Linear API Integration**
- **Description**: Connect with Linear for issue management
- **Sub-issues**:
  - `SPI-19-DESIGN`: Technical design for Linear integration
  - `SPI-19-1`: Linear workspace connection and authentication
  - `SPI-19-2`: Issue creation with documentation links
  - `SPI-19-3`: Bidirectional sync and status tracking

### Milestone 4: Web Interface (Week 4)

**SPI-20: Basic Web Dashboard**
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
- **Sub-issues**:
  - `SPI-22-DESIGN`: Technical design for configuration management
  - `SPI-22-1`: API key management interface (OpenAI, Anthropic, GitHub, Linear)
  - `SPI-22-2`: Repository and workspace selection
  - `SPI-22-3`: User preferences and system settings

**SPI-23: Issue Creation Workflow**
- **Description**: Interface for Linear issue creation and management
- **Sub-issues**:
  - `SPI-23-DESIGN`: Technical design for issue workflow UI
  - `SPI-23-1`: Issue creation preview and customization
  - `SPI-23-2`: Linear integration status and monitoring
  - `SPI-23-3`: Issue template management

### Milestone 5: MCP Server (Week 5)

**SPI-24: MCP Server Core**
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
- **Sub-issues**:
  - `SPI-26-DESIGN`: Technical design for Local AI integration
  - `SPI-26-1`: MCP tools for task context and specifications
  - `SPI-26-2`: Implementation suggestions and design feedback
  - `SPI-26-3`: Model routing recommendations

**SPI-27: CLI Tool**
- **Description**: Command-line interface for project management
- **Sub-issues**:
  - `SPI-27-DESIGN`: Technical design for CLI tool
  - `SPI-27-1`: Project initialization and setup commands
  - `SPI-27-2`: PRD analysis and issue creation commands
  - `SPI-27-3`: Local MCP server management

### Milestone 6: Polish & Testing (Week 6)

**SPI-28: Comprehensive Testing**
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
- [ ] AI model selection works (OpenAI/Anthropic)
- [ ] MCP server integrates with Claude/Copilot

### Quality Requirements
- [ ] 80%+ test coverage across all services
- [ ] All technical designs approved before implementation
- [ ] Comprehensive documentation for setup and usage
- [ ] Working end-to-end demo scenario
- [ ] Clean, maintainable codebase following TDD practices

## Risk Mitigation

### Technical Risks
- **AI Model Dependencies**: Use fallback mechanisms and multiple providers
- **Integration Complexity**: Start with simple implementations, iterate
- **Local Environment Issues**: Comprehensive Docker setup and documentation

### Project Risks
- **Scope Creep**: Strict adherence to MVP feature set
- **Technical Debt**: Mandatory technical design phase for all features
- **Quality Issues**: TDD practices and comprehensive testing

## Resource Requirements
- **Development**: 1-2 senior developers
- **Timeline**: 6 weeks (30 working days)
- **External APIs**: OpenAI, Anthropic, GitHub, Linear API access
- **Infrastructure**: Local Docker environment only

---

*This document will be updated as the project progresses and requirements evolve.*