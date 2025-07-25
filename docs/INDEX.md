# 📚 CycleTime Documentation Index

**Complete guide to CycleTime's documentation ecosystem**

*This index provides organized access to all project documentation with clear descriptions of purpose, audience, and key topics covered.*

---

## 🚀 Getting Started

Essential documentation for new contributors and daily development workflows.

### [Build System Documentation](./development/build-system.md)
**Purpose:** Comprehensive guide to TurboRepo monorepo build orchestration  
**Audience:** All developers working with the codebase  
**Key Topics:** TurboRepo configuration, local development workflows, package management, caching strategies, performance optimization, troubleshooting  
**Why Read This:** Master the build system that powers parallel development across all packages

### [Testing Guide](./development/testing-guide.md)
**Purpose:** Local-first testing methodology with CI simulation  
**Audience:** Developers writing and maintaining tests  
**Key Topics:** Local testing workflows, nektos/act CI simulation, CI environment detection, hanging test prevention, TurboRepo testing patterns  
**Why Read This:** Implement reliable testing practices that prevent CI failures and provide rapid feedback

### [Docker Development Environment](./technical-designs/docker-development-environment.md)
**Purpose:** Local development setup with containerized services  
**Audience:** New developers setting up local environment  
**Key Topics:** Docker configuration, service orchestration, database setup, development tools  
**Why Read This:** Get your local development environment running quickly and reliably

---

## 🏗️ Architecture & Strategy

High-level system design, strategic decisions, and architectural patterns.

### [System Overview](./architecture/system-overview.md)
**Purpose:** Comprehensive overview of CycleTime's system architecture  
**Audience:** Technical leads, architects, and senior developers  
**Key Topics:** Service boundaries, data flow, integration patterns, deployment architecture  
**Why Read This:** Understand the big picture of how all system components work together

### [Monorepo Strategy](./architecture/monorepo-strategy.md)
**Purpose:** Strategic approach to monorepo architecture and achieved benefits  
**Audience:** Engineering managers, technical leads, and architects  
**Key Topics:** TurboRepo adoption rationale, performance achievements, scalability benefits, success metrics  
**Why Read This:** Understand the strategic decisions behind the monorepo architecture and its proven benefits

### [CI/CD Pipeline](./architecture/ci-cd-pipeline.md)
**Purpose:** GitHub Actions parallel architecture and automation workflows  
**Audience:** DevOps engineers, technical leads, and developers working with CI/CD  
**Key Topics:** Parallel job execution, smart caching, test splitting, deployment automation, performance optimizations  
**Why Read This:** Master the CI/CD system that delivers 40-50% performance improvements

### [Data Flow Mapping](./architecture/data-flow-mapping.md)
**Purpose:** System-wide data flow and service interactions  
**Audience:** Architects and developers working on integration  
**Key Topics:** Service communication patterns, data transformation, API boundaries  
**Why Read This:** Understand how data moves through the system and between services

---

## ⚙️ Development Guides

Day-to-day development workflows, migration patterns, and practical guides.

### [MCP Setup](./development/mcp-setup.md) & [MCP Workflows](./development/mcp-workflows.md)
**Purpose:** Model Context Protocol integration for AI coding tools  
**Audience:** Developers using AI coding assistants (Claude Code, Cursor, etc.)  
**Key Topics:** MCP server configuration, AI tool integration, workflow automation, context sharing  
**Why Read This:** Leverage AI coding tools with full project context and enhanced development capabilities

### [Service Migration Guide](./architecture/service-migration-guide.md) 
**Purpose:** Comprehensive patterns for migrating Docker services to TypeScript packages  
**Audience:** Developers migrating services to the monorepo  
**Key Topics:** Migration strategy, patterns, Docker to TypeScript conversion, testing approaches  
**Why Read This:** Execute successful service migrations that improve maintainability and developer experience

### [Package Creation Patterns](./architecture/package-creation-patterns.md)
**Purpose:** Standardized templates and patterns for creating new TypeScript packages  
**Audience:** Developers creating new services or packages  
**Key Topics:** Package templates, configuration patterns, best practices, naming conventions  
**Why Read This:** Create consistent, well-structured packages that integrate seamlessly with the build system

### [Migration Checklist](./architecture/migration-checklist.md)
**Purpose:** Step-by-step checklist for executing service migrations  
**Audience:** Developers performing service migrations  
**Key Topics:** Pre-migration analysis, 8-phase migration process, quality assurance, validation  
**Why Read This:** Follow a proven process to migrate services successfully without missing critical steps

### [Migration Examples](./architecture/migration-examples.md)
**Purpose:** Real-world migration examples using actual CycleTime services  
**Audience:** Developers learning migration patterns through concrete examples  
**Key Topics:** Document service migration, Task service migration, before/after comparisons  
**Why Read This:** Learn from actual migration implementations and avoid common pitfalls

### [Service Migration Index](./architecture/service-migration-index.md)
**Purpose:** Central index for all service migration documentation  
**Audience:** Developers planning or executing service migrations  
**Key Topics:** Documentation structure, troubleshooting, best practices, related resources  
**Why Read This:** Navigate the complete migration documentation suite efficiently

---

## 📋 Technical Designs

Detailed technical specifications, API designs, and implementation details.

### [API Gateway Authentication](./technical-designs/api-gateway-auth.md)
**Purpose:** Authentication and authorization architecture for the API Gateway  
**Audience:** Backend developers working on authentication systems  
**Key Topics:** JWT authentication, authorization patterns, security considerations  
**Why Read This:** Implement secure authentication following established patterns

### [Claude AI Service](./technical-designs/claude-ai-service.md)
**Purpose:** Integration design for Anthropic's Claude AI models  
**Audience:** Developers working on AI service integration  
**Key Topics:** Claude API integration, request handling, response processing, error handling  
**Why Read This:** Understand Claude-specific integration requirements and best practices

### [Database Schema](./technical-designs/database-schema.md)
**Purpose:** Database design, relationships, and data modeling  
**Audience:** Backend developers and database administrators  
**Key Topics:** Entity relationships, table structures, indexing strategies, migration patterns  
**Why Read This:** Understand the data model and make informed database design decisions

### [Request Processing Engine](./technical-designs/request-processing-engine.md)
**Purpose:** Core request handling and processing architecture  
**Audience:** Backend developers working on request handling  
**Key Topics:** Request routing, processing pipelines, error handling, performance optimization  
**Why Read This:** Implement efficient request processing following architectural patterns

### [TurboRepo Remote Caching Setup](./technical-designs/turborepo-remote-caching-setup.md)
**Purpose:** Historical reference for TurboRepo remote caching configuration  
**Audience:** Developers interested in caching implementation details  
**Key Topics:** Vercel integration, cache configuration, performance optimization  
**Why Read This:** Reference for caching setup (current configuration documented in Build System Guide)

---

## 🔧 Service Documentation

Service-specific guides, APIs, and integration patterns.

### [AI Service API Examples](./services/ai-service-api-examples.md)
**Purpose:** Practical examples of AI service API usage  
**Audience:** Frontend and backend developers integrating with AI services  
**Key Topics:** API endpoints, request/response examples, authentication patterns  
**Why Read This:** Quickly implement AI service integration with working examples

### [AI Service Events](./services/ai-service-events.md)
**Purpose:** Event-driven architecture patterns for AI service communication  
**Audience:** Developers implementing event-driven features  
**Key Topics:** Event schemas, publishing patterns, subscription handling  
**Why Read This:** Implement robust event-driven communication with AI services

### [AI Service Integration](./services/ai-service-integration.md)
**Purpose:** Comprehensive guide to integrating with the AI service  
**Audience:** Developers building features that use AI capabilities  
**Key Topics:** Integration patterns, error handling, performance considerations  
**Why Read This:** Implement reliable AI service integrations following best practices

### [AI Service Stub Guide](./services/ai-service-stub-guide.md)
**Purpose:** Mock and stub implementations for AI service testing  
**Audience:** Developers writing tests that interact with AI services  
**Key Topics:** Mock implementations, testing patterns, stub configurations  
**Why Read This:** Write comprehensive tests without depending on external AI services

---

## 📊 Project Management

Planning documents, roadmaps, and development processes.

### [Product Requirements Document](./PRD.md)
**Purpose:** Core product vision, requirements, and specifications  
**Audience:** Product managers, technical leads, and stakeholders  
**Key Topics:** Product vision, feature requirements, success criteria, constraints  
**Why Read This:** Understand the product vision and requirements driving development decisions

### [Development Roadmap](./ROADMAP.md)
**Purpose:** Development timeline, milestones, and feature priorities  
**Audience:** All team members and stakeholders  
**Key Topics:** MVP goals, development phases, timeline, feature priorities  
**Why Read This:** Understand project direction, priorities, and how to contribute to planning

### [MVP Project Plan](./mvp-project-plan.md)
**Purpose:** Detailed plan for MVP development and delivery  
**Audience:** Development team and project managers  
**Key Topics:** MVP scope, development phases, deliverables, success criteria  
**Why Read This:** Understand MVP goals and track progress toward launch

### [Engineering Planning Process](./engineering-planning-process.md)
**Purpose:** Development workflows, planning processes, and team practices  
**Audience:** All development team members  
**Key Topics:** Sprint planning, task management, code review processes, quality standards  
**Why Read This:** Follow established development processes and contribute effectively to the team

---

## 🛠️ Templates & Tools

Reusable templates, scripts, and development tools.

### [Migration Templates](./architecture/migration-templates/)
**Purpose:** Standardized templates for service migration  
**Audience:** Developers performing service migrations  
**Contents:** 
- `Dockerfile.template` - Docker configuration template
- `jest.config.js.template` - Jest testing configuration
- `package.json.template` - Package configuration template
- `tsconfig.json.template` - TypeScript configuration template
- `create-package.sh` - Automated package creation script  
**Why Use This:** Accelerate migration with proven templates and avoid configuration errors

### [MCP Test Script](./development/test-github-mcp.sh)
**Purpose:** Test script for GitHub MCP integration  
**Audience:** Developers working on MCP features  
**Key Topics:** MCP testing, GitHub integration validation  
**Why Use This:** Validate MCP integrations work correctly

---

## 📖 How to Use This Documentation

### For New Contributors
1. Start with **Getting Started** section for essential setup and workflows
2. Read **System Overview** to understand the overall architecture
3. Review **Development Guides** relevant to your work area
4. Reference **Technical Designs** for detailed implementation guidance

### For Experienced Developers
1. Use **Architecture & Strategy** for high-level decision context
2. Reference **Technical Designs** for implementation details
3. Consult **Service Documentation** for API integration
4. Check **Templates & Tools** for reusable components

### For Project Planning
1. Review **Project Management** section for roadmap and requirements
2. Consult **Architecture & Strategy** for technical constraints
3. Reference **Development Guides** for effort estimation

### Keeping Documentation Current
- All documentation follows the same review process as code changes
- Updates should reflect actual implementation, not intentions
- Cross-references should be validated when documents are modified
- New documents should be added to this index with proper categorization

---

## 🔍 Quick Reference

**Most Frequently Needed:**
- [Build System](./development/build-system.md) - Daily TurboRepo workflows
- [Testing Guide](./development/testing-guide.md) - Local testing and CI simulation
- [CI/CD Pipeline](./architecture/ci-cd-pipeline.md) - Understanding the automated pipeline

**For New Team Members:**
- [System Overview](./architecture/system-overview.md) - Architecture understanding
- [Docker Development Environment](./technical-designs/docker-development-environment.md) - Local setup
- [Engineering Planning Process](./engineering-planning-process.md) - Team workflows

**For AI Integration:**
- [MCP Setup](./development/mcp-setup.md) - AI coding tool integration
- [AI Service Documentation](./services/) - AI service APIs and patterns
- [Claude AI Service](./technical-designs/claude-ai-service.md) - Claude-specific integration

---

*This index is maintained as part of the documentation ecosystem. When adding new documents, update this index with appropriate categorization and description.*