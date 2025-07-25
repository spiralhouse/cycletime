# CI/CD Pipeline Documentation

## Overview

The CycleTime project uses GitHub Actions for continuous integration and deployment with an optimized parallel execution architecture. The CI pipeline achieves 40-50% performance improvement through intelligent job parallelization, smart caching, and conditional execution strategies.

### Current Status

**Active Workflows:**
- ✅ Continuous Integration (`ci.yml`) - Optimized parallel architecture with ~2-2.5 minute runtime
- ✅ Linear Integration (`linear-integration.yml`) - Fully functional

**Performance Optimizations:**
- ✅ Parallel job execution for independent tasks (build, lint, typecheck, tests)
- ✅ Smart execution with docs-only change detection (100% time savings)
- ✅ Enhanced multi-layer caching (npm, Prisma, build artifacts)
- ✅ Test splitting (unit vs integration) with CI environment detection
- ✅ Affected package detection using TurboRepo filtering

**Disabled Workflows:**
- ⚠️ Security Scanning (`security.yml`) - Disabled pending tool configuration ([SPI-33](https://linear.app/spiral-house/issue/SPI-33))
- ⚠️ Staging Deployment (`deploy-staging.yml`) - Disabled pending infrastructure setup ([SPI-34](https://linear.app/spiral-house/issue/SPI-34))
- ⚠️ Production Deployment (`deploy-production.yml`) - Disabled pending infrastructure setup ([SPI-34](https://linear.app/spiral-house/issue/SPI-34))

## Workflow Architecture

### Core Workflows

#### 1. Continuous Integration (`ci.yml`)
**Trigger:** Push to `main` and all pull requests
**Purpose:** Automated testing, linting, and quality assurance with parallel job execution

**Infrastructure Services:**
- **PostgreSQL 17** - Database service for API Gateway and other services
- **Redis 8** - Cache and queue service for AI Service testing
- **Node.js 20** - Runtime with enhanced npm caching

**Parallel Job Architecture:**

1. **Changes Detection Job**
   - Analyzes changed files to determine affected packages
   - Detects docs-only changes for smart execution skipping
   - Provides outputs for conditional job execution
   - Uses `git diff` with base branch comparison

2. **Build Job** (Parallel)
   - Dependency installation with npm caching
   - TurboRepo build execution with affected package filtering
   - Build artifact caching for dependent jobs
   - Prisma client generation and database setup

3. **Lint Job** (Parallel)
   - ESLint execution across affected packages
   - TurboRepo filtering: `--filter="...[origin/${{ github.event.pull_request.base.ref }}]"`
   - Independent execution (no build dependency)
   - Caches lint results for performance

4. **TypeCheck Job** (Parallel)
   - TypeScript compilation validation
   - Depends on build artifacts for type accuracy
   - TurboRepo dependency graph ensures correct execution order
   - Cached results for unchanged packages

5. **Unit Tests Job** (Parallel)
   - Fast tests without external dependencies
   - Depends on build completion for test artifacts
   - CI environment detection skips hanging tests
   - Enhanced Jest configuration with `forceExit` and `detectOpenHandles`

6. **Integration Tests Job** (Parallel)
   - Tests with PostgreSQL and Redis integration
   - External dependency mocking in CI environment (`GITHUB_ACTIONS=true`)
   - Conditional test skipping using `describe.skip` patterns
   - Comprehensive timeout and exit handling

**Smart Execution Logic:**
- **Docs-only changes**: Skip all build and test jobs (100% time savings)
- **Affected package detection**: Only test and build changed packages
- **Conditional job execution**: Jobs skip when not needed
- **Multi-layer caching**: npm, Prisma, build artifacts, and test results

**Performance Metrics:**
- **Total runtime**: ~2-2.5 minutes (down from ~4 minutes)
- **Parallel efficiency**: 40-50% improvement through job parallelization
- **Cache hit benefits**: Additional 30-50% improvement on repeated runs
- **Docs-only optimization**: 100% time savings for documentation changes

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

#### 5. Local CI Testing with nektos/act
**Purpose:** Local simulation of GitHub Actions for faster feedback

**Installation:**
```bash
# macOS installation
brew install act

# Verify installation
act --version
```

**Local Testing Workflow:**
```bash
# Run full CI pipeline locally
act --container-architecture linux/amd64 -j test --artifact-server-path /tmp/artifacts

# Test specific job
act --container-architecture linux/amd64 -j unit-tests

# Monitor with timeout for hanging tests
timeout 300 act --container-architecture linux/amd64 -j test --artifact-server-path /tmp/artifacts

# Debug specific package results
act --container-architecture linux/amd64 -j test --artifact-server-path /tmp/artifacts 2>&1 | grep api-gateway
```

**Benefits:**
- **Faster feedback** - Immediate results vs waiting for CI
- **Cost effective** - Reduces GitHub Actions minutes consumption
- **Better debugging** - Full local access to logs and state
- **Higher confidence** - Verify fixes work before pushing
- **Reduced context switching** - Stay in development flow

**Local Environment Testing:**
```bash
# Simulate CI environment variables
GITHUB_ACTIONS=true npm run test:integration --workspace=@cycletime/api-gateway

# Test with CI timeout settings
NODE_ENV=test GITHUB_ACTIONS=true npm test

# Debug hanging tests locally
npm test -- --detectOpenHandles --forceExit
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
All PRs must pass parallel CI job execution:
- [ ] **Linting** - ESLint across affected packages with TurboRepo filtering
- [ ] **Type checking** - TypeScript validation with dependency graph awareness
- [ ] **Unit tests** - Fast tests with CI environment detection and hanging prevention
- [ ] **Integration tests** - Database/Redis integration with external dependency mocking
- [ ] **Build success** - All affected packages build successfully with artifact caching
- [ ] **Security scans** - When SPI-33 is completed
- [ ] **Coverage thresholds** - Package-specific coverage requirements met

**Local-First Testing Requirements:**
- [ ] **nektos/act validation** - Local CI simulation passes before push
- [ ] **Affected package testing** - `turbo run test --filter=...[HEAD~1]` succeeds
- [ ] **Environment simulation** - `GITHUB_ACTIONS=true` tests pass locally

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

**Local CI Simulation:**
```bash
# Full CI pipeline simulation
act --container-architecture linux/amd64 -j test --artifact-server-path /tmp/artifacts

# Specific job debugging
act --container-architecture linux/amd64 -j unit-tests
act --container-architecture linux/amd64 -j integration-tests

# Monitor with timeout
timeout 300 act --container-architecture linux/amd64 -j test
```

**Local Environment Testing:**
```bash
# Simulate CI environment
GITHUB_ACTIONS=true npm run test:integration --workspace=@cycletime/api-gateway
NODE_ENV=test GITHUB_ACTIONS=true npm test

# Test hanging prevention
npm test -- --detectOpenHandles --forceExit

# Package-specific testing
npm run test --workspace=@cycletime/api-gateway -- --coverage
turbo run test --filter=api-gateway
```

**CI Pipeline Debugging:**
```bash
# Affected package detection
turbo run test --filter=...[HEAD~1] --dry-run

# Build artifact inspection
turbo run build --summarize

# Cache debugging
turbo run lint --dry-run --verbosity=2
```

**Database and Infrastructure:**
```bash
# Database debugging
npm run db:test
npm run db:migrate
npm run db:studio

# Health checks
npm run health
curl localhost:3000/health
```

## Future Enhancements

### Planned Improvements
- [ ] **Performance testing** integration with parallel job execution
- [ ] **End-to-end testing** with Playwright in dedicated CI job
- [ ] **Infrastructure as Code** with Terraform for deployment automation
- [ ] **Container registry** integration for service-based deployments
- [ ] **Multi-environment** configuration management and promotion
- [ ] **Rollback automation** for failed deployments with health checks
- [ ] **Advanced caching strategies** for different package types and test suites

### Metrics and Analytics
- [ ] **Deployment frequency** tracking across environments
- [ ] **Lead time** measurement from commit to production
- [ ] **Mean time to recovery** monitoring for failed deployments
- [ ] **Change failure rate** analysis with automated rollback
- [ ] **CI performance metrics** (job duration, parallel efficiency, cache hit rates)
- [ ] **Quality metrics** (test coverage trends, flaky test detection, security scan results)

---

*This document focuses on CI/CD pipeline automation and deployment workflows. For TurboRepo build system documentation, see [Build System Documentation](../development/build-system.md).*