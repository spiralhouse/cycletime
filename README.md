# CycleTime

Intelligent Project Orchestration Platform with MCP Integration

## Quick Start

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

- **PostgreSQL 17**: `localhost:5432`
  - Main database: `cycletime_dev`
  - Test database: `cycletime_test`
  - User: `cycletime`

- **Redis 8**: `localhost:6379`

- **MinIO (S3-compatible storage)**: `localhost:9000`
  - Admin console: `localhost:9001`
  - Default credentials: `minioadmin` / `minioadmin123`

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
```

### Project Structure

- `/docs/` - Documentation and technical designs
- `/database/` - Database initialization scripts
- `/packages/` - Individual service packages (planned)
- `/src/` - Core application code (planned)

## Development Workflow

This project follows a structured development workflow using Linear for task management. See `CLAUDE.md` for detailed development guidelines.

## License

GNU Affero General Public License v3.0

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See [LICENSE](LICENSE) for the full license text.