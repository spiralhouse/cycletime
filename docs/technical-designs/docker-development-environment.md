# Docker Development Environment - Technical Design

**Issue**: SPI-10  
**Created**: 2025-01-04  
**Status**: Design Phase  
**Assignee**: Development Team  

## 1. Overview

This document outlines the technical design for a complete local development environment using Docker containers. The environment will support all CycleTime services including PostgreSQL, Redis, core application services, and development tooling.

## 2. Goals & Requirements

### 2.1 Primary Goals
- **Fast Setup**: Complete environment setup in <10 minutes
- **Service Isolation**: Each service runs in its own container
- **Development Experience**: Hot reload, debugging, and logging support
- **Data Persistence**: Database and cache data persists across restarts
- **Port Management**: Predictable port assignments for all services

### 2.2 Functional Requirements
- PostgreSQL database with development data seeding
- Redis cache for sessions and temporary data
- MinIO for S3-compatible object storage
- Core application services (API, Web, MCP)
- Environment configuration management
- Service health checks and monitoring
- Development tooling integration

### 2.3 Non-Functional Requirements
- **Performance**: Services start within 30 seconds
- **Reliability**: Automatic service restart on failure
- **Maintainability**: Clear configuration and documentation
- **Scalability**: Easy to add new services

## 3. Architecture Design

### 3.1 Container Architecture

```mermaid
graph TB
    subgraph "Docker Host"
        subgraph "cycletime-network"
            subgraph "Infrastructure Services"
                PG[PostgreSQL<br/>:5432]
                REDIS[Redis<br/>:6379]
                MINIO[MinIO<br/>:9000, :9001]
            end
            
            subgraph "Application Services"
                API[API Gateway<br/>:8000]
                WEB[Web Dashboard<br/>:3000]
                MCP[MCP Server<br/>:8001]
                CLAUDE[Claude AI Service<br/>:8002]
                DOC[Document Service<br/>:8003]
                TASK[Task Service<br/>:8004]
            end
        end
        
        subgraph "Development Tools"
            ADMINER[Adminer<br/>:8080]
            REDIS_INSIGHT[Redis Insight<br/>:8001]
        end
        
        subgraph "Host System"
            IDE[VS Code/Cursor]
            REPO[Local Repository]
        end
    end
    
    %% Network connections
    IDE --> API
    IDE --> WEB
    API --> PG
    API --> REDIS
    API --> CLAUDE
    API --> DOC
    API --> TASK
    DOC --> MINIO
    MCP --> API
    
    %% Development tools
    ADMINER --> PG
    REDIS_INSIGHT --> REDIS
```

### 3.2 Service Definitions

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| PostgreSQL | `postgres:17-alpine` | 5432 | Primary database |
| Redis | `redis:8-alpine` | 6379 | Cache and sessions |
| MinIO | `minio/minio:latest` | 9000, 9001 | Object storage |
| API Gateway | `node:22-alpine` | 8000 | Main API server |
| Web Dashboard | `node:22-alpine` | 3000 | React frontend |
| MCP Server | `node:22-alpine` | 8001 | Local AI integration |
| Claude AI Service | `node:22-alpine` | 8002 | AI service |
| Document Service | `node:22-alpine` | 8003 | Document processing |
| Task Service | `node:22-alpine` | 8004 | Task management |
| Adminer | `adminer:latest` | 8080 | Database admin |
| Redis Insight | `redislabs/redisinsight:latest` | 8081 | Redis admin |

### 3.3 Volume Strategy

```yaml
volumes:
  cycletime_postgres_data:    # PostgreSQL data persistence
  cycletime_redis_data:       # Redis data persistence  
  cycletime_minio_data:       # MinIO object storage
  cycletime_node_modules:     # Node.js dependencies cache
  cycletime_logs:             # Application logs
```

## 4. Docker Compose Configuration

### 4.1 Core Infrastructure Services

```yaml
# Infrastructure services that must start first
services:
  postgres:
    image: postgres:17-alpine
    container_name: cycletime-postgres
    environment:
      POSTGRES_DB: cycletime_dev
      POSTGRES_USER: cycletime
      POSTGRES_PASSWORD: development_password
    volumes:
      - cycletime_postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    networks:
      - cycletime-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cycletime -d cycletime_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:8-alpine
    container_name: cycletime-redis
    command: redis-server --appendonly yes
    volumes:
      - cycletime_redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - cycletime-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  minio:
    image: minio/minio:latest
    container_name: cycletime-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    volumes:
      - cycletime_minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    networks:
      - cycletime-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
```

### 4.2 Application Services

```yaml
  api-gateway:
    build:
      context: .
      dockerfile: services/api-gateway/Dockerfile.dev
    container_name: cycletime-api
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://cycletime:development_password@postgres:5432/cycletime_dev
      - REDIS_URL=redis://redis:6379
      - API_PORT=8000
    volumes:
      - ./:/app
      - cycletime_node_modules:/app/node_modules
      - cycletime_logs:/app/logs
    ports:
      - "8000:8000"
    networks:
      - cycletime-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  web-dashboard:
    build:
      context: .
      dockerfile: services/web-dashboard/Dockerfile.dev
    container_name: cycletime-web
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:8000
      - WEB_PORT=3000
    volumes:
      - ./:/app
      - cycletime_node_modules:/app/node_modules
    ports:
      - "3000:3000"
    networks:
      - cycletime-network
    depends_on:
      - api-gateway
    restart: unless-stopped

  mcp-server:
    build:
      context: .
      dockerfile: services/mcp-server/Dockerfile.dev
    container_name: cycletime-mcp
    environment:
      - NODE_ENV=development
      - API_URL=http://api-gateway:8000
      - MCP_PORT=8001
    volumes:
      - ./:/app
      - cycletime_node_modules:/app/node_modules
    ports:
      - "8001:8001"
    networks:
      - cycletime-network
    depends_on:
      - api-gateway
    restart: unless-stopped
```

### 4.3 Development Tools

```yaml
  adminer:
    image: adminer:latest
    container_name: cycletime-adminer
    environment:
      ADMINER_DEFAULT_SERVER: postgres
    ports:
      - "8080:8080"
    networks:
      - cycletime-network
    depends_on:
      - postgres

  redis-insight:
    image: redislabs/redisinsight:latest
    container_name: cycletime-redis-insight
    ports:
      - "8081:8001"
    networks:
      - cycletime-network
    depends_on:
      - redis
```

## 5. Environment Configuration

### 5.1 Environment Variables

```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug

# Database Configuration
DATABASE_URL=postgresql://cycletime:development_password@localhost:5432/cycletime_dev
REDIS_URL=redis://localhost:6379

# Service Ports
API_PORT=8000
WEB_PORT=3000
MCP_PORT=8001
CLAUDE_SERVICE_PORT=8002
DOCUMENT_SERVICE_PORT=8003
TASK_SERVICE_PORT=8004

# External Service URLs (for development)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123

# API Keys (development/mock)
ANTHROPIC_API_KEY=your_dev_key_here
LINEAR_API_KEY=your_dev_key_here
GITHUB_TOKEN=your_dev_token_here

# Development Flags
ENABLE_MOCK_AI=true
ENABLE_DEBUG_LOGGING=true
ENABLE_HOT_RELOAD=true
```

### 5.2 Configuration Management

**Strategy**: Environment-specific configuration files
- `.env.development` - Development environment
- `.env.test` - Test environment  
- `.env.example` - Template for new developers
- `docker-compose.override.yml` - Local overrides

## 6. Development Workflow

### 6.1 Setup Commands

```bash
# Initial setup
npm run docker:setup

# Start all services
npm run docker:up

# Start specific services
npm run docker:up -- postgres redis

# View logs
npm run docker:logs

# Stop all services
npm run docker:down

# Reset environment (delete data)
npm run docker:reset
```

### 6.2 Package.json Scripts

```json
{
  "scripts": {
    "docker:setup": "docker-compose build && docker-compose up -d postgres redis && npm run db:migrate && npm run db:seed",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "docker:reset": "docker-compose down -v && docker system prune -f",
    "docker:build": "docker-compose build --no-cache",
    "db:migrate": "npm run prisma:migrate:dev",
    "db:seed": "npm run prisma:db:seed",
    "dev": "npm run docker:up && npm run dev:services",
    "dev:services": "concurrently \"npm run dev:api\" \"npm run dev:web\" \"npm run dev:mcp\"",
    "dev:api": "cd services/api-gateway && npm run dev",
    "dev:web": "cd services/web-dashboard && npm run dev", 
    "dev:mcp": "cd services/mcp-server && npm run dev"
  }
}
```

## 7. Service Health Checks

### 7.1 Health Check Endpoints

```typescript
// Health check implementation for each service
interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'starting';
  timestamp: string;
  dependencies: {
    postgres: boolean;
    redis: boolean;
    minio: boolean;
  };
}

// Example: API Gateway health check
app.get('/health', async (req, res) => {
  const health = await performHealthCheck();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

### 7.2 Monitoring Script

```bash
#!/bin/bash
# scripts/health-check.sh
# Monitor all services and restart if needed

check_service_health() {
  local service=$1
  local port=$2
  
  if curl -f -s http://localhost:$port/health > /dev/null; then
    echo "✅ $service is healthy"
    return 0
  else
    echo "❌ $service is unhealthy"
    return 1
  fi
}

# Check all services
check_service_health "API Gateway" 8000
check_service_health "Web Dashboard" 3000
check_service_health "MCP Server" 8001
```

## 8. Data Management

### 8.1 Database Initialization

```sql
-- database/init/01-create-databases.sql
CREATE DATABASE cycletime_dev;
CREATE DATABASE cycletime_test;

-- Create development user
CREATE USER cycletime_dev WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE cycletime_dev TO cycletime_dev;
GRANT ALL PRIVILEGES ON DATABASE cycletime_test TO cycletime_dev;
```

### 8.2 Seed Data

```typescript
// database/seeds/development.ts
export const developmentSeed = {
  users: [
    {
      email: 'dev@cycletime.io',
      name: 'Development User',
      role: 'admin'
    }
  ],
  projects: [
    {
      name: 'CycleTime MVP',
      description: 'Development test project',
      repository_url: 'https://github.com/spiralhouse/cycletime'
    }
  ]
};
```

## 9. Logging & Debugging

### 9.1 Logging Strategy

```yaml
# docker-compose.yml logging configuration
services:
  api-gateway:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=api-gateway"
```

### 9.2 Debug Configuration

```typescript
// services/shared/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({ 
      filename: 'logs/app.log' 
    })
  ]
});
```

## 10. Security Considerations

### 10.1 Development Security
- **Network Isolation**: All services run in isolated Docker network
- **Default Credentials**: Clearly marked development-only passwords
- **Port Binding**: Services only expose necessary ports to host
- **Volume Permissions**: Proper file permissions for mounted volumes

### 10.2 Secret Management
```bash
# secrets/.env.local (gitignored)
ANTHROPIC_API_KEY=real_dev_key
LINEAR_API_KEY=real_dev_key  
GITHUB_TOKEN=real_dev_token
```

## 11. Performance Optimization

### 11.1 Container Optimization
- **Multi-stage builds** for smaller production images
- **Layer caching** for faster rebuilds
- **Resource limits** to prevent resource exhaustion
- **Health checks** for reliable service discovery

### 11.2 Development Speed
```dockerfile
# Dockerfile.dev - optimized for development
FROM node:22-alpine
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=development

# Copy source code
COPY . .

# Install nodemon for hot reload
RUN npm install -g nodemon

CMD ["npm", "run", "dev"]
```

## 12. Testing Integration

### 12.1 Test Database
```yaml
# docker-compose.test.yml
services:
  postgres-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: cycletime_test
      POSTGRES_USER: cycletime
      POSTGRES_PASSWORD: test_password
    tmpfs:
      - /var/lib/postgresql/data  # In-memory for faster tests
```

### 12.2 Test Commands
```bash
# Run tests with clean database
npm run test:integration

# Test specific service
npm run test:service -- api-gateway
```

## 13. Implementation Plan

### 13.1 Phase 1: Core Infrastructure (Week 1)
1. **Setup docker-compose.yml** with PostgreSQL, Redis, MinIO
2. **Create base Dockerfiles** for Node.js services
3. **Implement health checks** for all infrastructure services
4. **Create setup scripts** and package.json commands

### 13.2 Phase 2: Application Services (Week 1)
1. **Add API Gateway container** with development configuration
2. **Add Web Dashboard container** with hot reload
3. **Add MCP Server container** with debugging support
4. **Implement service discovery** and inter-service communication

### 13.3 Phase 3: Development Tools (Week 1) 
1. **Add Adminer** for database management
2. **Add Redis Insight** for cache management
3. **Create monitoring scripts** for service health
4. **Add logging aggregation** and debugging tools

### 13.4 Phase 4: Optimization (Week 1)
1. **Performance tuning** for container startup
2. **Volume optimization** for data persistence
3. **Documentation** and developer onboarding
4. **Testing** and validation of complete environment

## 14. Success Criteria

### 14.1 Functional Success
- [ ] Complete environment starts in <10 minutes
- [ ] All services pass health checks
- [ ] Database migrations run successfully
- [ ] Web interface accessible at http://localhost:3000
- [ ] API endpoints accessible at http://localhost:8000
- [ ] MCP server responds to tool requests

### 14.2 Developer Experience Success
- [ ] Hot reload works for all services
- [ ] Logs are easily accessible and readable
- [ ] Database and Redis can be managed via web interfaces
- [ ] Environment can be reset cleanly
- [ ] New developers can get setup in <15 minutes

### 14.3 Quality Success
- [ ] All containers have proper health checks
- [ ] Configuration is environment-specific
- [ ] Secrets are properly managed
- [ ] Services restart automatically on failure
- [ ] Resource usage is reasonable (<4GB RAM total)

## 15. Risk Mitigation

### 15.1 Technical Risks
- **Port Conflicts**: Use non-standard ports and provide port mapping
- **Resource Usage**: Set container resource limits
- **Data Loss**: Use persistent volumes for all data
- **Service Dependencies**: Implement proper dependency ordering

### 15.2 Development Risks
- **Complex Setup**: Provide automated setup scripts
- **Version Conflicts**: Pin all Docker image versions
- **Platform Issues**: Test on macOS, Linux, and Windows
- **Network Issues**: Use Docker networks instead of host networking

---

This technical design provides a comprehensive foundation for the Docker development environment that will support all CycleTime MVP development work.