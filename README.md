# CycleTime

**Intelligent Project Orchestration Platform with MCP Integration**

*Enhance team collaboration and developer experience with intelligent AI assistance that keeps humans in control*

## What is CycleTime?

CycleTime enhances team collaboration by intelligently assisting with PRD analysis and development planning. Built with support for leading AI models (OpenAI, Anthropic, Google, and more), CycleTime improves developer experience while ensuring teams maintain full control over all critical decisions.

### Key Objectives

- **Enhanced Collaboration**: Streamline team communication with AI-assisted project breakdown and shared documentation
- **Improved Developer Experience**: Leverage your preferred AI models to reduce planning overhead and focus on building
- **Workflow Integration**: Seamlessly connect with your existing tools - Linear, Jira, GitHub Issues - without disrupting team processes
- **Living Documentation**: Keep project context current and accessible to both humans and AI tools
- **Seamless AI Integration**: Connect existing AI assistants to project context through MCP
- **Human-Centered Control**: AI provides intelligent suggestions, teams drive all decisions

### Target Users

- **Product Managers** seeking better collaboration with engineering teams through clearer, AI-enhanced specifications
- **Engineering Managers** who want to improve team productivity with consistent project breakdown and tracking
- **Technical Leads** who value excellent developer experience with current documentation and AI-assisted planning

## How CycleTime Works

1. **Store PRDs in Markdown** - Place requirements in your repository's `/docs/requirements/` directory
2. **AI Analysis** - Your chosen AI model processes your PRD and generates structured project plans
3. **Team Review** - Review and refine generated `project-plan.md`, `milestones.md`, and `architecture.md`
4. **Issue Creation** - Generate Linear/Jira issues with links to your documentation
5. **Maintain Sync** - Documentation updates automatically as your project progresses

### Expected Results

- Enhanced team collaboration and reduced planning friction
- Better developer experience with AI-assisted project breakdown
- Documentation that serves both human teams and AI tools effectively
- Improved productivity without disrupting existing development workflows

## Integration & Compatibility

CycleTime is designed to work with your existing development workflow, not replace it:

- **Any AI Coding Tool**: Claude Code, Cursor, Windsurf, GitHub Copilot, JetBrains AI - use your preferred AI-enabled development environment
- **Any Git Workflow**: Works with GitHub, GitLab, Bitbucket and any Git hosting platform
- **Any Repository Structure**: Supports both monorepos and polyrepos (MVP focuses on monorepos)
- **MCP Integration**: Connect with any MCP-enabled AI tool for seamless context sharing and enhanced development workflows
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
  
- **AI Service**: `localhost:8002`
  - Multi-model AI integration (OpenAI, Anthropic, Google, etc.)
  
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
