# CycleTime

**Intelligent Project Orchestration Platform with MCP Integration**

*Transform your Product Requirements Documents into structured development plans in hours, not days*

## 🚀 What is CycleTime?

CycleTime automates the transformation of PRDs into structured development plans while keeping humans in control of all critical decisions. Powered by **Claude 4 Sonnet** for intelligent planning and analysis, CycleTime creates a seamless connection between documentation, planning, and execution.

### ✨ Key Benefits

- **⚡ 80% Faster Planning**: Turn PRDs into actionable development plans in 2-3 hours instead of 2-3 days
- **🤖 AI-Powered Intelligence**: Leverage Claude 4 Sonnet for consistent, high-quality project analysis
- **📚 Living Documentation**: Keep project docs in sync with actual development progress in your repository
- **🔗 Seamless AI Integration**: Enable your existing AI tools to access full project context via MCP
- **👥 Human-Centered**: AI suggests, humans decide - maintain full control over critical decisions

### 🎯 Perfect For

- **Product Managers** who want to quickly translate product vision into clear engineering work
- **Engineering Managers** seeking consistent task breakdown and progress visibility  
- **Development Teams** that value documentation that stays current with code

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

## 🏗️ How CycleTime Works

1. **📝 Write PRDs in Markdown** - Store requirements in your repository's `/docs/requirements/` directory
2. **🧠 AI Analysis** - Claude 4 Sonnet analyzes your PRD and generates structured project plans
3. **👀 Human Review** - Review and refine generated `project-plan.md`, `milestones.md`, and `architecture.md`
4. **🎫 Issue Creation** - Automatically create Linear/Jira issues with links to your documentation
5. **🔄 Stay Synchronized** - Documentation stays current as your project evolves

### 📊 Expected Results

- **40% faster** time-to-first-commit on new projects
- **95%+ user satisfaction** with AI-generated plans after human review
- **Living documentation** that teams actually use and maintain

## 🗺️ Roadmap

See our detailed [Roadmap](./docs/ROADMAP.md) for:
- MVP goals and current development phases
- Future enhancements (multi-model AI, GitLab support, analytics)
- Timeline and feature priorities
- How to contribute to roadmap planning

## 🤝 Development Workflow

This project follows a structured development workflow using Linear for task management. See `CLAUDE.md` for detailed development guidelines.

## License

GNU Affero General Public License v3.0

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See [LICENSE](LICENSE) for the full license text.