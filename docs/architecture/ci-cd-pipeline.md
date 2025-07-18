# CI/CD Pipeline Documentation

## Overview

The CycleTime project uses GitHub Actions for continuous integration and deployment, enhanced with TurboRepo for monorepo build orchestration. This document outlines the complete CI/CD pipeline configuration and processes.

### Current Status

**Active Workflows:**
- ✅ Continuous Integration (`ci.yml`) - Enhanced with TurboRepo
- ✅ Linear Integration (`linear-integration.yml`) - Fully functional

**TurboRepo Integration:**
- ✅ Monorepo build orchestration with parallel execution
- ✅ Remote caching for 50-70% faster CI times
- ✅ Automatic dependency graph management
- ✅ All packages tested (API Gateway + AI Service + future packages)

**Disabled Workflows:**
- ⚠️ Security Scanning (`security.yml`) - Disabled pending tool configuration ([SPI-33](https://linear.app/spiral-house/issue/SPI-33))
- ⚠️ Staging Deployment (`deploy-staging.yml`) - Disabled pending infrastructure setup ([SPI-34](https://linear.app/spiral-house/issue/SPI-34))
- ⚠️ Production Deployment (`deploy-production.yml`) - Disabled pending infrastructure setup ([SPI-34](https://linear.app/spiral-house/issue/SPI-34))

## Workflow Architecture

### Core Workflows

#### 1. Continuous Integration (`ci.yml`)
**Trigger:** Push to `main` and all pull requests
**Purpose:** Automated testing, linting, and quality assurance with TurboRepo orchestration

**Infrastructure Services:**
- **PostgreSQL 17** - Database service for API Gateway and other services
- **Redis 8** - Cache and queue service for AI Service testing
- **Node.js 20** - Runtime with npm caching enabled

**TurboRepo Pipeline Steps:**
1. **Environment Setup**
   - Multi-service infrastructure (PostgreSQL + Redis)
   - Workspace dependency installation with `npm ci`
   - TurboRepo cache directory configuration

2. **Database Setup**
   - Prisma client generation for all packages
   - Database migration deployment
   - Test database preparation

3. **Parallel Quality Checks** (via TurboRepo)
   - `turbo run lint` - Parallel linting across all packages
   - `turbo run typecheck` - Parallel TypeScript validation
   - `turbo run test` - Parallel testing with dependency awareness
   - `turbo run build` - Parallel builds respecting dependency order

4. **Enhanced Testing Coverage**
   - **API Gateway**: Authentication, middleware, routes, services
   - **AI Service**: Providers, queue management, worker pools, request processing
   - **Future Packages**: Automatically included as they're added

5. **Performance Optimizations**
   - Remote caching reduces redundant work
   - Affected package detection for PR optimization
   - Parallel execution for 50-70% faster CI times

#### 2. Staging Deployment (`deploy-staging.yml`) - **DISABLED**
**Status:** Disabled pending staging infrastructure setup (SPI-34)
**Future Purpose:** Automatic deployment to staging environment

**Steps:**
1. Build application for production
2. Deploy database migrations
3. Deploy to staging infrastructure
4. Run health checks
5. Notify deployment status

#### 3. Production Deployment (`deploy-production.yml`) - **DISABLED**
**Status:** Disabled pending production infrastructure setup (SPI-34)
**Future Purpose:** Controlled production deployment

**Steps:**
1. Build production artifacts
2. Deploy database migrations
3. Deploy to production infrastructure
4. Run comprehensive health checks
5. Send deployment notifications

#### 4. Linear Integration (`linear-integration.yml`)
**Trigger:** Pull request events and main branch pushes
**Purpose:** Automatic Linear issue status management

**Features:**
- Extracts Linear issue ID from branch names (format: `feature/SPI-XXX-description`)
- Moves issues to "In Review" when PR is opened
- Moves issues to "Done" when PR is merged
- Adds PR links as comments on Linear issues

#### 5. TurboRepo Build System
**Purpose:** Monorepo build orchestration and optimization

**Configuration:** `turbo.json` in project root
```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["build"], "outputs": ["coverage/**"] },
    "lint": { "outputs": [] },
    "typecheck": { "dependsOn": ["^build"], "outputs": [] }
  },
  "remoteCache": { "signature": true }
}
```

**Key Features:**
- **Dependency Graph**: Automatically builds packages in correct order
- **Parallel Execution**: Runs independent tasks simultaneously
- **Remote Caching**: Caches build artifacts to speed up CI
- **Incremental Builds**: Only rebuilds changed packages
- **Package Filtering**: Target specific packages or affected packages

**Local Development:**
```bash
# Build all packages
turbo build

# Test all packages in parallel
turbo test

# Test specific package
npx turbo run test --filter=ai-service

# Build affected packages only
npx turbo run build --filter=...[HEAD~1]
```

#### 6. Security Scanning (`security.yml`) - **DISABLED**
**Status:** Disabled pending security tool configuration (SPI-33)
**Future Purpose:** Continuous security monitoring

**Planned Scans:**
- **npm audit** - Dependency vulnerability scanning
- **Trivy** - Container and filesystem vulnerability scanning
- **GitLeaks** - Secret detection in repository history

## Repository Configuration

### Dependabot (`dependabot.yml`)
- **npm dependencies** - Weekly updates on Mondays
- **GitHub Actions** - Weekly updates on Mondays
- Automatic PR creation with conventional commit messages
- Configured reviewers and assignees

### Issue Templates
- **Bug Report** - Structured bug reporting with environment details
- **Feature Request** - Feature proposal with acceptance criteria

### Pull Request Template
- Comprehensive checklist covering:
  - Change classification
  - Testing requirements
  - Quality assurance
  - Security considerations
  - Deployment notes

## Environment Configuration

### Required Secrets

#### Database
- `STAGING_DATABASE_URL` - PostgreSQL connection string for staging
- `PRODUCTION_DATABASE_URL` - PostgreSQL connection string for production

#### Deployment
- `STAGING_DEPLOY_KEY` - SSH key or API token for staging deployment
- `PRODUCTION_DEPLOY_KEY` - SSH key or API token for production deployment

#### Integrations
- `LINEAR_API_KEY` - Linear API token for issue management
- `CODECOV_TOKEN` - Token for coverage reporting

### Environment Variables

#### CI Environment
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cycletime_test
REDIS_URL=redis://localhost:6379
NODE_ENV=test
TURBO_TOKEN=${TURBO_TOKEN}  # Remote caching token
TURBO_TEAM=${TURBO_TEAM}    # TurboRepo team identifier
```

#### Staging Environment
```bash
DATABASE_URL=${STAGING_DATABASE_URL}
NODE_ENV=staging
```

#### Production Environment
```bash
DATABASE_URL=${PRODUCTION_DATABASE_URL}
NODE_ENV=production
```

## Development Workflow Integration

### Branch Naming Convention
- Feature branches: `feature/SPI-XXX-description`
- Hotfix branches: `hotfix/SPI-XXX-description`
- Bugfix branches: `bugfix/SPI-XXX-description`

### Automatic Status Updates
1. **PR Creation** → Linear issue moves to "In Review"
2. **PR Merge** → Linear issue moves to "Done"
3. **Failed CI** → Issue remains in current status

### Quality Gates
All PRs must pass TurboRepo orchestrated checks:
- [ ] Linting (ESLint across all packages)
- [ ] Type checking (TypeScript across all packages)
- [ ] Unit tests (all packages tested in parallel)
- [ ] Integration tests (database and Redis integration)
- [ ] Security scans (when SPI-33 is completed)
- [ ] Test coverage threshold (aggregated across packages)
- [ ] Build success (all packages build successfully)

## Deployment Process

### Staging Deployment
1. **Automatic** on main branch merge
2. Runs database migrations
3. Deploys latest code
4. Performs health checks
5. Available at: `https://staging.cycletime.ai`

### Production Deployment
1. **Manual** via GitHub releases or workflow dispatch
2. Comprehensive pre-deployment checks
3. Database migration with rollback capability
4. Blue-green deployment strategy
5. Post-deployment monitoring
6. Available at: `https://cycletime.ai`

## Monitoring and Alerts

### Health Checks
- **Database connectivity** - Prisma connection validation
- **API endpoints** - Service availability verification
- **External dependencies** - Third-party service status

### Failure Notifications
- Failed deployments trigger immediate alerts
- Security scan failures create GitHub security advisories
- Test failures block deployment pipeline

## Security Considerations

### Vulnerability Management
- **Automated scanning** on every commit
- **Weekly scheduled scans** for comprehensive coverage
- **Dependency updates** via Dependabot
- **Secret detection** prevents credential exposure

### Access Control
- **Environment protection rules** for production
- **Required reviewers** for deployment workflows
- **Secret access** limited to necessary workflows
- **Audit logging** for all deployment activities

## Troubleshooting

### Common Issues

#### CI Failures
1. **Database connection** - Check PostgreSQL service configuration
2. **Test failures** - Review test logs and fix failing tests
3. **Linting errors** - Run `turbo lint` locally and fix issues

#### Deployment Failures
1. **Migration errors** - Check database schema compatibility
2. **Build failures** - Verify all dependencies and build scripts
3. **Health check failures** - Review application startup and dependencies

#### Linear Integration Issues
1. **Branch naming** - Ensure proper `feature/SPI-XXX` format
2. **API permissions** - Verify Linear API key has required permissions
3. **Team/Project IDs** - Confirm correct Linear team and project configuration

### Debug Commands
```bash
# Local CI simulation with TurboRepo
turbo build        # Build all packages
turbo test         # Test all packages in parallel
turbo lint         # Lint all packages in parallel
turbo typecheck    # Type check all packages

# Package-specific debugging
npx turbo run test --filter=api-gateway
npx turbo run test --filter=ai-service
npx turbo run build --filter=api-gateway...

# TurboRepo cache inspection
npx turbo run build --dry-run
npx turbo run test --summarize

# Database debugging
npm run db:test
npm run db:migrate
npm run db:studio

# Health check
npm run health
```

## Future Enhancements

### Planned Improvements
- [ ] **Performance testing** integration with TurboRepo
- [ ] **End-to-end testing** with Playwright across packages
- [ ] **Infrastructure as Code** with Terraform
- [ ] **Container registry** integration for package-based deployments
- [ ] **Multi-environment** configuration management
- [ ] **Rollback automation** for failed deployments
- [ ] **Advanced TurboRepo features** (task scheduling, deployment orchestration)

### Metrics and Analytics
- [ ] **Deployment frequency** tracking
- [ ] **Lead time** measurement
- [ ] **Mean time to recovery** monitoring
- [ ] **Change failure rate** analysis
- [ ] **TurboRepo performance metrics** (cache hit rates, build times)
- [ ] **Package-specific metrics** (test coverage, build performance)

---

*This document is maintained as part of the CycleTime project architecture. Updates should follow the same review process as code changes.*