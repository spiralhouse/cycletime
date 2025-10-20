# CycleTime Documentation

Welcome to the CycleTime documentation! This guide will help you navigate through all available documentation.

## 📚 Documentation Structure

### [Getting Started](getting-started/)
Quick guides to get you up and running with CycleTime.

- [Installation Guide](getting-started/installation.md) - System requirements and installation
- [Quick Start](getting-started/quick-start.md) - Get running in 5 minutes
- [Configuration](getting-started/configuration.md) - Environment variables and settings
- [Onboarding](getting-started/onboarding.md) - New project integration

**MCP Integration:**
- [MCP Client Setup](getting-started/mcp-client-setup.md) - Configure Claude Code for MCP
- [MCP Connection Testing](getting-started/mcp-testing.md) - Verify MCP server connectivity

### [Development](development/)
Everything you need for developing with CycleTime.

- [Development Setup](development/setup.md) - IDE configuration and workflows
- [Project Structure](development/project-structure.md) - Code organization
- [Repository Usage](development/repository-usage.md) - Git workflows
- [Branching Strategy](development/branching-strategy.md) - Standard branch naming and worktree patterns
- [Single Feature Workflow](development/single-feature-workflow.md) - Standard process for individual features
- [Linear Branch Integration](development/linear-branch-integration.md) - Linear issue to branch mapping

**MCP Development:**
- [MCP Development Workflow](development/mcp-development.md) - MCP server development patterns

### [Architecture](architecture/)
System design and architectural decisions.

- [System Overview](architecture/overview.md) - High-level architecture
- [Session Management](architecture/session-management.md) - State persistence

**Architecture Decision Records:**
- [ADR-005: Database Initialization Pattern](architecture/decisions/ADR-005-database-initialization-pattern.md)
- [ADR-006: Lifecycle Managed Cleanup](architecture/decisions/ADR-006-lifecycle-managed-cleanup.md)
- [ADR-007: Repository Issue Persistence](architecture/decisions/ADR-007-repository-issue-persistence.md)
- [ADR-007: Repository Singleton Thread Safety](architecture/decisions/ADR-007-repository-singleton-thread-safety.md)

### [Testing](testing/)
Testing strategies and guides.

- [Testing Strategy](testing/strategy.md) - Three-tier testing approach
- [TDD Workflow](testing/tdd-workflow.md) - Test-driven development
- [Parallel Development](testing/parallel-development.md) - Multi-feature testing
- [Local Testing](testing/local-testing.md) - Development environment testing
- [Test Suites](testing/test-suites.md) - Test configurations
- [Database Test Migration Guide](testing/database-test-migration-guide.md) - Migrating database tests

### [API](api/)
API documentation and references.

**REST API:**
- [REST API Reference](api/rest-api-reference.md) - Complete REST API documentation
- [REST Endpoints](api/rest-endpoints.md) - HTTP endpoint quick reference
- [API Quick Start](api/quick-start.md) - Getting started with the API
- [Best Practices](api/best-practices.md) - API usage best practices
- [Migration Guide](api/migration-guide.md) - API migration guide

**MCP Protocol:**
- [MCP Tools Reference](api/mcp-tools-reference.md) - Complete MCP tools catalog
- [MCP Resources](api/mcp-resources.md) - MCP protocol resources

### [CI/CD](ci-cd/)
Continuous Integration and Deployment.

- [Pipeline Overview](ci-cd/overview.md) - CI/CD architecture
- [Environments](ci-cd/environments.md) - Dev, staging, production
- [Release Process](ci-cd/release-process.md) - Continuous delivery workflow
- [Versioning](ci-cd/versioning.md) - Git.SemVersioning details
- [Container Tagging](ci-cd/container-tagging.md) - Container tag strategy
- [Staging Promotion](ci-cd/staging-promotion.md) - Promotion workflows
- [Production Approvals](ci-cd/production-approvals.md) - Deployment approvals
- [Environment Protection](ci-cd/environment-protection.md) - Security settings
- [Concurrency Control](ci-cd/concurrency-control.md) - Pipeline concurrency management

### [Operations](operations/)
Deployment and operational guides.

- [Deployment Guide](operations/deployment-guide.md) - Production deployment
- [Health Monitoring](operations/deployment-guide.md#health-monitoring) - Health checks and monitoring
- [Troubleshooting](operations/deployment-guide.md#troubleshooting) - Common deployment issues
- [Performance Tuning](performance/caching-strategy.md) - Build and runtime optimization

### [Performance](performance/)
Performance optimization and benchmarks.

- [Caching Strategy](performance/caching-strategy.md) - Build and runtime caching
- [Baseline Results](performance/baseline-results.md) - Performance benchmarks

### [Reference](reference/)
Detailed technical references.

- [Product Requirements](reference/PRD.md) - Product vision and requirements
- [User Experience](reference/user-experience.md) - UX design
- [Limitations](reference/limitations.md) - Known limitations
- [Agents Reference](reference/agents.md) - Agent capabilities and selection guide
- [Decision Guide](reference/decision-guide.md) - Workflow selection decision trees
- [Worktree Operations](reference/worktree-operations.md) - Complete worktree command reference

**Troubleshooting:**
- [General Troubleshooting](reference/troubleshooting.md) - Common issues and solutions
- [MCP Troubleshooting](reference/mcp-troubleshooting.md) - MCP-specific troubleshooting guide

**Technical Design:**
- [Application Service Patterns](reference/technical-design/application-service-patterns.md)
- [Configuration Management](reference/technical-design/configuration-management.md)
- [Database DI Migration](reference/technical-design/database-di-migration.md)
- [Dependency Injection Patterns](reference/technical-design/dependency-injection-patterns.md)
- [Domain Entities](reference/technical-design/domain-entities.md)
- [MCP Architecture Simplification](reference/technical-design/mcp-architecture-simplification.md)
- [MCP Integration Patterns](reference/technical-design/mcp-integration-patterns.md)
- [MCP MVP Spike Plan](reference/technical-design/mcp-mvp-spike-plan.md)
- [Repository Pattern](reference/technical-design/repository-pattern.md)
- [Testing Architecture (TDD)](reference/technical-design/testing-architecture-tdd.md)
- [Business Rule Verification Report](reference/technical-design/business-rule-verification-report.md)

### [Archive](archive/)
Historical documentation for reference.

- [Sessions](archive/sessions/) - Development session notes
- [Test Plans](archive/test-plans/) - Historical test plans
- [Refactoring Notes](archive/refactoring-notes/) - Past refactoring work

## 🎯 Quick Links by Role

### For Developers
1. [Quick Start](getting-started/quick-start.md)
2. [Development Setup](development/setup.md)
3. [Testing Strategy](testing/strategy.md)
4. [API Reference](api/rest-endpoints.md)

### For DevOps
1. [Deployment Guide](operations/deployment-guide.md)
2. [CI/CD Overview](ci-cd/overview.md)
3. [Environment Management](ci-cd/environments.md)
4. [Performance Tuning](performance/caching-strategy.md)

### For Architects
1. [System Architecture](architecture/overview.md)
2. [Technical Design](reference/technical-design/)
3. [Product Requirements](reference/PRD.md)
4. [Known Limitations](reference/limitations.md)

### For Project Managers
1. [Product Requirements](reference/PRD.md)
2. [User Experience](reference/user-experience.md)
3. [Release Process](ci-cd/release-process.md)
4. [Project Onboarding](getting-started/onboarding.md)

## 📖 Documentation Standards

- **Markdown Format** - All docs in GitHub Flavored Markdown
- **Clear Headers** - Hierarchical structure with descriptive headers
- **Code Examples** - Practical, runnable examples
- **Cross-References** - Links between related documents
- **Version Tracking** - Document updates tracked in git

## 🔍 Finding Information

1. **Use the structure above** to navigate by topic
2. **Search in GitHub** using the search bar
3. **Check the role-based quick links** for common tasks
4. **Browse the archive** for historical context

## 📝 Contributing to Documentation

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on improving documentation.

## 🆘 Need Help?

- [GitHub Issues](https://github.com/spiralhouse/cycletime/issues) - Report problems
- [Discussions](https://github.com/spiralhouse/cycletime/discussions) - Ask questions
- [Quick Start](getting-started/quick-start.md) - Get started quickly