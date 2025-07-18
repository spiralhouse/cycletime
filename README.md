# CycleTime

**Intelligent Project Orchestration Platform with MCP Integration**

*Automate PRD-to-development planning while maintaining human control over all technical decisions*

## What is CycleTime?

CycleTime automates the transformation of PRDs into structured development plans while keeping humans in control of all critical decisions. Powered by **Claude 4 Sonnet** for intelligent planning and analysis, CycleTime creates a seamless connection between documentation, planning, and execution.

### Key Objectives

- **Faster Planning**: Convert PRDs into actionable development plans in hours, not days
- **Consistent Analysis**: Use Claude 4 Sonnet for reliable project breakdown and technical planning
- **Repository-Based Documentation**: Keep project docs synchronized with actual development progress
- **AI Tool Integration**: Provide project context to existing AI assistants through MCP
- **Human Oversight**: AI generates suggestions, teams make all final decisions

### Target Users

- **Product Managers** who need to translate product requirements into clear engineering specifications
- **Engineering Managers** who want consistent project breakdown and dependency tracking
- **Technical Leads** who value up-to-date project documentation that reflects actual implementation

## How CycleTime Works

1. **Store PRDs in Markdown** - Place requirements in your repository's `/docs/requirements/` directory
2. **AI Analysis** - Claude 4 Sonnet processes your PRD and generates structured project plans
3. **Team Review** - Review and refine generated `project-plan.md`, `milestones.md`, and `architecture.md`
4. **Issue Creation** - Generate Linear/Jira issues with links to your documentation
5. **Maintain Sync** - Documentation updates automatically as your project progresses

### Expected Results

- Reduced time-to-first-commit on new projects
- High-quality project plans that require minimal revision
- Documentation that stays current with implementation
- No disruption to existing development tools and workflows

## Integration & Compatibility

CycleTime is designed to work with your existing development workflow, not replace it:

- **Any IDE or Editor**: VS Code, IntelliJ, Vim, Emacs - use whatever makes you productive
- **Any Git Workflow**: Works with GitHub, GitLab, Bitbucket and any Git hosting platform
- **Any Repository Structure**: Supports both monorepos and polyrepos (MVP focuses on monorepos)
- **Any AI Tools**: MCP integration connects with existing AI assistants (GitHub Copilot, Cursor, etc.)
- **Any Issue Tracker**: Native integration with Linear, Jira, GitHub Issues
- **Repository-Centric**: All coordination happens through standard Git operations - no proprietary formats

*The only requirement is that you store project documentation in Markdown format within your Git repository.*

## 🗺️ Roadmap

See our detailed [Roadmap](./docs/ROADMAP.md) for:
- MVP goals and current development phases
- Future enhancements (multi-model AI, GitLab support, analytics)
- Timeline and feature priorities
- How to contribute to roadmap planning

## 🛠️ Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 22+ (for development scripts)

### Development Setup

1. **Clone and navigate to the project**
   ```bash
   git clone <repository-url>
   cd cycletime
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys if needed
   ```

3. **Start infrastructure services**
   ```bash
   npm run docker:up
   ```

4. **Verify services are running**
   ```bash
   npm run docker:status
   ```

### Available Services

#### Infrastructure Services
- **PostgreSQL 17**: `localhost:5432`
  - Main database: `cycletime_dev`
  - Test database: `cycletime_test`
  - User: `cycletime`

- **Redis 8**: `localhost:6379`

- **MinIO (S3-compatible storage)**: `localhost:9000`
  - Admin console: `localhost:9001`
  - Default credentials: `minioadmin` / `minioadmin123`

#### Application Services
- **API Gateway**: `localhost:8000`
  - Health check: `/health`
  
- **Web Dashboard**: `localhost:3001`
  - Main interface for project management
  
- **MCP Server**: `localhost:8001`
  - Model Context Protocol for AI integration
  
- **Claude Service**: `localhost:8002`
  - Claude 4 Sonnet AI integration
  
- **Document Service**: `localhost:8003`
  - Markdown processing and storage
  
- **Task Service**: `localhost:8004`
  - Linear and GitHub integration

#### Development Tools
- **Adminer**: `localhost:8080`
  - PostgreSQL database administration
  - **Auto-configured** - `npm run adminer:web` opens with login pre-filled
  - Manual connection details if needed:
    - Server: `postgres` (or `localhost:5432` from host)
    - Username: `cycletime`
    - Password: `development_password`
    - Database: `cycletime_dev`
  
- **Redis Insight**: `localhost:8081`
  - Redis management and monitoring
  - **Auto-configured** - CycleTime Redis connection pre-configured
  - Manual connection details if needed:
    - Host: `localhost` (or `redis` from container)
    - Port: `6379`
    - No authentication required

### Development Scripts

```bash
# Docker operations
npm run docker:up          # Start all services
npm run docker:down        # Stop all services
npm run docker:status      # Check service status
npm run docker:logs        # View all logs
npm run docker:clean       # Stop and remove all data

# Database operations
npm run db:connect         # Connect to main database
npm run db:connect:test    # Connect to test database

# Other utilities
npm run redis:cli          # Connect to Redis CLI
npm run minio:web          # Open MinIO console
npm run adminer:web        # Open Adminer database admin
npm run redis-insight:web  # Open Redis Insight
```

### Project Structure

- `/docs/` - Documentation and technical designs
- `/database/` - Database initialization scripts
- `/packages/` - Individual service packages (planned)
- `/src/` - Core application code (planned)

## 🤝 Development Workflow

This project follows a structured development workflow using Linear for task management. See `CLAUDE.md` for detailed development guidelines.

## License

GNU Affero General Public License v3.0

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See [LICENSE](LICENSE) for the full license text.
