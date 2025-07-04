# CycleTime System Design

## 1. Overview

CycleTime is an intelligent project orchestration platform that transforms PRDs into structured development plans using Claude 4 Sonnet for planning and analysis. The system uses a microservices architecture with repository-centric documentation and hybrid AI assistance.

### Core Principles
- **Repository-centric**: All documentation lives in Git repositories
- **Hybrid AI workflow**: Claude 4 Sonnet for planning, Local AI for implementation
- **Single-model integration**: Direct Claude 4 Sonnet API integration for consistency
- **Human-in-the-loop**: All AI suggestions require human approval
- **Notification-driven**: Proactive user notifications for required actions

## 2. System Architecture

### 2.1 High-Level Component Diagram

```mermaid
graph TB
    subgraph "User Interfaces"
        WEB[Web Dashboard<br/>React + Next.js]
        CLI[CLI Tool<br/>Node.js]
    end
    
    subgraph "API Layer"
        API[API Gateway<br/>Express/Fastify]
        AUTH[Auth Service<br/>OAuth + JWT]
    end
    
    subgraph "Core Services"
        CLAUDE[Claude AI Service<br/>Direct Anthropic integration]
        PROJ[Project Service<br/>CRUD operations]
        DOC[Documentation Service<br/>Template generation]
        TASK[Task Breakdown Service<br/>AI-assisted analysis]
        NOTIF[Notification Service<br/>Multi-channel alerts]
    end
    
    subgraph "Integration Services"
        GIT[Git Integration Service<br/>Repository operations]
        ISSUE[Issue Tracker Service<br/>Linear/GitHub/Jira]
        MCP[MCP Server<br/>AI assistant integration]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Primary database)]
        REDIS[(Redis<br/>Cache + sessions)]
        S3[(Object Storage<br/>File artifacts)]
    end
    
    subgraph "External Systems"
        ANTHROPIC[Anthropic Claude 4 Sonnet<br/>API]
        REPOS[Git Repositories<br/>GitHub, GitLab]
        TRACKERS[Issue Trackers<br/>Linear, GitHub, Jira]
        COMM[Communication<br/>Slack, Teams, Email]
    end
    
    %% User Interface connections
    WEB --> API
    CLI --> API
    
    %% API Layer connections
    API --> AUTH
    API --> CLAUDE
    API --> PROJ
    API --> DOC
    API --> TASK
    API --> NOTIF
    
    %% Core Service connections
    CLAUDE --> ANTHROPIC
    PROJ --> GIT
    PROJ --> ISSUE
    DOC --> GIT
    TASK --> CLAUDE
    NOTIF --> COMM
    
    %% Integration Service connections
    GIT --> REPOS
    ISSUE --> TRACKERS
    MCP --> CLAUDE
    MCP --> GIT
    
    %% Data Layer connections
    API --> PG
    API --> REDIS
    PROJ --> PG
    DOC --> S3
    AUTH --> REDIS
    NOTIF --> PG
```

## 3. Service Descriptions

### 3.1 User Interface Layer

#### Web Dashboard
- **Technology**: React with Next.js, TypeScript, Tailwind CSS
- **Responsibilities**:
  - Project creation and management interface
  - Document preview and editing with live Markdown rendering
  - AI model configuration and cost monitoring dashboard
  - Progress visualization with interactive charts
  - Notification center and user preferences
  - Team management and permission controls

#### CLI Tool
- **Technology**: Node.js with Commander.js, TypeScript
- **Responsibilities**:
  - Local project initialization and configuration
  - Git repository setup and CycleTime integration
  - Command-line PRD analysis and issue generation
  - Local MCP server management
  - Developer workflow automation

### 3.2 API Layer

#### API Gateway
- **Technology**: Node.js with Fastify, TypeScript, OpenAPI/Swagger
- **Responsibilities**:
  - Request routing and load balancing
  - Rate limiting and request validation
  - API versioning and backward compatibility
  - Request/response logging and metrics
  - CORS handling and security headers
  - Health checks and service discovery

#### Auth Service
- **Technology**: Node.js with Passport.js, JWT, OAuth 2.0
- **Responsibilities**:
  - User authentication via GitHub/GitLab OAuth
  - JWT token generation and validation
  - Role-based access control (RBAC)
  - API key management for MCP servers
  - Session management and refresh tokens
  - Git repository permission validation

### 3.3 Core Services

#### AI Orchestration Service
- **Technology**: Node.js with TypeScript, LangChain
- **Responsibilities**:
  - Intelligent model selection based on task type and complexity
  - Cost optimization algorithms and budget tracking
  - Model performance monitoring and fallback management
  - Request queuing and batch processing
  - Response caching and optimization
  - Model provider API management and error handling

#### Project Service
- **Technology**: Node.js with TypeScript, Prisma ORM
- **Responsibilities**:
  - Project lifecycle management (create, read, update, delete)
  - Repository connection and validation
  - Team member management and permissions
  - Project settings and configuration
  - Progress tracking and milestone management
  - Integration with external issue trackers

#### Documentation Service
- **Technology**: Node.js with TypeScript, Marked.js, Gray-matter
- **Responsibilities**:
  - Markdown document parsing and validation
  - Template generation for different document types
  - Document structure analysis and consistency checking
  - Cross-reference link management
  - Document versioning and change tracking
  - Mermaid diagram generation and validation

#### Task Breakdown Service
- **Technology**: Node.js with TypeScript, Machine Learning models
- **Responsibilities**:
  - Feature complexity analysis using predefined templates
  - AI-assisted task breakdown with effort estimation
  - Dependency analysis and visualization
  - Risk assessment for complex features
  - Breakdown review workflow management
  - Historical data analysis for estimation improvements

#### Notification Service
- **Technology**: Node.js with TypeScript, Bull Queue, Socket.io
- **Responsibilities**:
  - Multi-channel notification delivery (email, Slack, Teams, in-app)
  - Notification preference management per user/team
  - Real-time WebSocket notifications for active users
  - Notification templates and personalization
  - Delivery tracking and retry mechanisms
  - Notification analytics and optimization

### 3.4 Integration Services

#### Git Integration Service
- **Technology**: Node.js with Simple-git, TypeScript
- **Responsibilities**:
  - Git repository operations (clone, read, write, commit)
  - Webhook event processing from Git providers
  - Branch management and merge conflict resolution
  - File system operations and path management
  - Git authentication and permission handling
  - Repository health monitoring and cleanup

#### Issue Tracker Service
- **Technology**: Node.js with TypeScript, GraphQL/REST clients
- **Responsibilities**:
  - Bidirectional sync with Linear, GitHub Issues, Jira
  - Issue creation with proper linking to documentation
  - Custom field mapping and data transformation
  - Webhook processing from issue trackers
  - Bulk operations and data migration
  - API rate limiting and error handling

#### MCP Server
- **Technology**: Node.js with MCP Protocol, TypeScript
- **Responsibilities**:
  - Local AI assistant integration (Claude, Copilot, etc.)
  - Repository context provision to Local AI
  - Real-time project information access
  - Tool execution for documentation operations
  - Model routing recommendations
  - Development workflow assistance

## 4. Data Architecture

### 4.1 Primary Database (PostgreSQL)

#### Core Tables
```sql
-- Projects and repository information
projects, repositories, project_members

-- Documentation and templates
documents, document_templates, document_versions

-- Tasks and breakdown management
tasks, task_templates, task_dependencies, estimates

-- AI orchestration and costs
ai_requests, model_configs, cost_tracking

-- Notifications and user preferences
notifications, notification_preferences, delivery_logs

-- Authentication and permissions
users, api_keys, permissions, roles
```

### 4.2 Cache Layer (Redis)

#### Cache Categories
- **Session Storage**: User sessions and temporary authentication data
- **AI Response Cache**: Cached responses from AI models for repeated queries
- **Repository Cache**: Frequently accessed file contents and metadata
- **Rate Limiting**: API rate limiting counters and user quotas
- **Real-time Data**: WebSocket connections and temporary state

### 4.3 Object Storage (S3-compatible)

#### Storage Categories
- **Document Artifacts**: Generated PDFs, exported documentation
- **File Uploads**: User-uploaded assets and media files
- **Backup Archives**: Periodic backups of critical data
- **Logs and Analytics**: Application logs and usage analytics

## 5. Development Environment

### 5.1 Local Development Setup

```mermaid
graph TB
    subgraph "Developer Machine"
        IDE[VS Code/Cursor<br/>with AI extensions]
        LOCAL_AI[Local AI<br/>Claude/Copilot]
        REPO[Local Git Repository<br/>Project files + docs]
    end
    
    subgraph "Local CycleTime Stack"
        WEB_DEV[Web Dashboard<br/>Next.js dev server :3000]
        API_DEV[API Gateway<br/>Node.js :8000]
        MCP_DEV[MCP Server<br/>Node.js :8001]
        SERVICES[Core Services<br/>Node.js :8002-8006]
    end
    
    subgraph "Local Infrastructure"
        PG_DEV[(PostgreSQL<br/>Docker :5432)]
        REDIS_DEV[(Redis<br/>Docker :6379)]
        MINIO[(MinIO<br/>S3-compatible :9000)]
    end
    
    subgraph "External Dev Services"
        LINEAR_TEST[Linear Test Workspace]
        GITHUB_HOOKS[GitHub Webhooks<br/>via ngrok]
        AI_PROVIDERS[AI Provider APIs<br/>with dev keys]
    end
    
    %% Developer workflow
    IDE <--> LOCAL_AI
    LOCAL_AI <--> MCP_DEV
    IDE <--> REPO
    
    %% CycleTime services
    WEB_DEV <--> API_DEV
    API_DEV <--> SERVICES
    MCP_DEV <--> API_DEV
    API_DEV <--> REPO
    
    %% Infrastructure
    API_DEV <--> PG_DEV
    API_DEV <--> REDIS_DEV
    SERVICES <--> MINIO
    
    %% External integrations
    API_DEV <--> LINEAR_TEST
    REPO <--> GITHUB_HOOKS
    SERVICES <--> AI_PROVIDERS
```

#### Development Tools
- **Package Manager**: npm with workspaces for monorepo management
- **Process Manager**: PM2 for running multiple services locally
- **Database Management**: Prisma for schema management and migrations
- **API Testing**: Postman/Insomnia collections for API testing
- **Git Hooks**: Husky for pre-commit validation and testing

#### Environment Configuration
```bash
# Core services
API_PORT=8000
WEB_PORT=3000
MCP_PORT=8001

# Database connections
DATABASE_URL=postgresql://cycletime:password@localhost:5432/cycletime_dev
REDIS_URL=redis://localhost:6379

# External integrations
LINEAR_API_KEY=dev_key
GITHUB_WEBHOOK_SECRET=dev_secret
OPENAI_API_KEY=dev_key
ANTHROPIC_API_KEY=dev_key

# Development flags
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_MOCK_AI=true
```

## 6. Production Environment (Kubernetes)

### 6.1 Kubernetes Architecture

```mermaid
graph TB
    subgraph "Ingress Layer"
        LB[Load Balancer<br/>AWS ALB/GCP GLB]
        INGRESS[Nginx Ingress Controller]
    end
    
    subgraph "Application Tier"
        WEB_PODS[Web Dashboard Pods<br/>3 replicas]
        API_PODS[API Gateway Pods<br/>3 replicas]
        CORE_PODS[Core Service Pods<br/>2 replicas each]
        MCP_PODS[MCP Server Pods<br/>2 replicas]
    end
    
    subgraph "Data Tier"
        PG_CLUSTER[PostgreSQL Cluster<br/>Primary + 2 Replicas]
        REDIS_CLUSTER[Redis Cluster<br/>3 nodes]
        S3[Object Storage<br/>AWS S3/GCP Cloud Storage]
    end
    
    subgraph "Monitoring & Operations"
        PROMETHEUS[Prometheus<br/>Metrics collection]
        GRAFANA[Grafana<br/>Dashboards]
        LOKI[Loki<br/>Log aggregation]
        JAEGER[Jaeger<br/>Distributed tracing]
    end
    
    LB --> INGRESS
    INGRESS --> WEB_PODS
    INGRESS --> API_PODS
    
    API_PODS --> CORE_PODS
    API_PODS --> MCP_PODS
    
    CORE_PODS --> PG_CLUSTER
    CORE_PODS --> REDIS_CLUSTER
    CORE_PODS --> S3
    
    PROMETHEUS --> API_PODS
    PROMETHEUS --> CORE_PODS
    GRAFANA --> PROMETHEUS
    LOKI --> API_PODS
    JAEGER --> API_PODS
```

### 6.2 Deployment Specifications

#### Resource Requirements
```yaml
# API Gateway
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"

# Core Services (each)
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"

# Web Dashboard
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "200m"
```

#### Scaling Configuration
- **Horizontal Pod Autoscaler**: Scale based on CPU/memory utilization
- **Vertical Pod Autoscaler**: Adjust resource requests automatically
- **Cluster Autoscaler**: Add/remove nodes based on pod resource needs
- **Custom Metrics**: Scale based on API request rates and AI processing queues

#### High Availability
- **Multi-AZ Deployment**: Pods distributed across availability zones
- **Database Clustering**: PostgreSQL with streaming replication
- **Redis Sentinel**: Automatic failover for Redis instances
- **Backup Strategy**: Daily automated backups with point-in-time recovery

### 6.3 Security Configuration

#### Network Security
- **Network Policies**: Restrict pod-to-pod communication
- **TLS Termination**: SSL/TLS at ingress with cert-manager
- **Service Mesh**: Istio for inter-service communication security
- **VPC Configuration**: Private subnets for data tier

#### Secret Management
- **Kubernetes Secrets**: Encrypted storage of sensitive data
- **External Secrets Operator**: Integration with AWS Secrets Manager/GCP Secret Manager
- **Secret Rotation**: Automated rotation of API keys and certificates
- **RBAC**: Role-based access control for cluster resources

## 7. Monitoring & Observability

### 7.1 Key Metrics

#### Business Metrics
- **Cost Optimization**: AI model costs per project and user
- **Time to Value**: PRD-to-first-commit duration
- **User Engagement**: Active projects and feature usage
- **AI Efficiency**: Claude response quality and success rates

#### Technical Metrics
- **Response Times**: API latency percentiles (p50, p95, p99)
- **Error Rates**: HTTP error rates by service and endpoint
- **Resource Utilization**: CPU, memory, and storage usage
- **Claude Performance**: Response times and quality scores

### 7.2 Alerting Strategy

#### Critical Alerts
- **Service Downtime**: API gateway or core service failures
- **Database Issues**: Connection failures or high latency
- **Claude API Failures**: Anthropic API errors or quota exceeded
- **Security Events**: Authentication failures or unauthorized access

#### Warning Alerts
- **High Response Times**: Latency above acceptable thresholds
- **Resource Utilization**: High CPU/memory usage trends
- **Usage Thresholds**: Claude usage costs exceeding budgets
- **Queue Backups**: Processing delays in async operations

## 8. Deployment Pipeline

### 8.1 CI/CD Workflow

```mermaid
flowchart LR
    DEV[Developer] --> GIT[Git Push]
    GIT --> BUILD[Build & Test]
    BUILD --> SCAN[Security Scan]
    SCAN --> STAGING[Deploy to Staging]
    STAGING --> E2E[E2E Tests]
    E2E --> PROD[Deploy to Production]
    
    BUILD --> UNIT[Unit Tests]
    BUILD --> LINT[Linting & Type Check]
    BUILD --> DOCKER[Docker Build]
    
    SCAN --> SNYK[Snyk Security Scan]
    SCAN --> SONAR[SonarQube Quality Gate]
    
    STAGING --> SMOKE[Smoke Tests]
    STAGING --> INTEGRATION[Integration Tests]
    
    PROD --> HEALTH[Health Checks]
    PROD --> ROLLBACK[Rollback on Failure]
```

### 8.2 Deployment Strategy
- **Blue-Green Deployment**: Zero-downtime deployments with traffic switching
- **Canary Releases**: Gradual rollout to subset of users
- **Feature Flags**: Runtime feature toggling for safe releases
- **Database Migrations**: Automated schema migrations with rollback capability

This system design provides a robust, scalable foundation for CycleTime's intelligent project orchestration platform, supporting the hybrid AI workflow and notification-driven user experience outlined in the PRD.