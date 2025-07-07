# CI/CD Pipeline Documentation

## Overview

The CycleTime project uses GitHub Actions for continuous integration and deployment. This document outlines the complete CI/CD pipeline configuration and processes.

## Workflow Architecture

### Core Workflows

#### 1. Continuous Integration (`ci.yml`)
**Trigger:** Push to `main` and all pull requests
**Purpose:** Automated testing, linting, and quality assurance

**Steps:**
1. **Environment Setup**
   - PostgreSQL 17 service container
   - Node.js 20 with npm caching
   - Dependency installation

2. **Database Setup**
   - Prisma client generation
   - Database migration deployment
   - Test database preparation

3. **Quality Checks**
   - ESLint code linting
   - TypeScript type checking
   - Unit and integration tests
   - Test coverage reporting

4. **Coverage Reporting**
   - Codecov integration for coverage tracking
   - Coverage reports uploaded on test completion

#### 2. Staging Deployment (`deploy-staging.yml`)
**Trigger:** Push to `main` branch
**Purpose:** Automatic deployment to staging environment

**Steps:**
1. Build application for production
2. Deploy database migrations
3. Deploy to staging infrastructure
4. Run health checks
5. Notify deployment status

#### 3. Production Deployment (`deploy-production.yml`)
**Trigger:** Release publication or manual workflow dispatch
**Purpose:** Controlled production deployment

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

#### 5. Security Scanning (`security.yml`)
**Trigger:** Push, pull requests, and weekly schedule
**Purpose:** Continuous security monitoring

**Scans:**
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
NODE_ENV=test
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
All PRs must pass:
- [ ] Linting (ESLint)
- [ ] Type checking (TypeScript)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Security scans
- [ ] Test coverage threshold

## Deployment Process

### Staging Deployment
1. **Automatic** on main branch merge
2. Runs database migrations
3. Deploys latest code
4. Performs health checks
5. Available at: `https://staging.cycletime.dev`

### Production Deployment
1. **Manual** via GitHub releases or workflow dispatch
2. Comprehensive pre-deployment checks
3. Database migration with rollback capability
4. Blue-green deployment strategy
5. Post-deployment monitoring
6. Available at: `https://cycletime.dev`

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
3. **Linting errors** - Run `npm run lint` locally and fix issues

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
# Local CI simulation
npm run lint
npm run typecheck
npm test
npm run test:coverage

# Database debugging
npm run db:test
npm run db:migrate
npm run db:studio

# Health check
npm run health
```

## Future Enhancements

### Planned Improvements
- [ ] **Performance testing** integration
- [ ] **End-to-end testing** with Playwright
- [ ] **Infrastructure as Code** with Terraform
- [ ] **Container registry** integration
- [ ] **Multi-environment** configuration management
- [ ] **Rollback automation** for failed deployments

### Metrics and Analytics
- [ ] **Deployment frequency** tracking
- [ ] **Lead time** measurement
- [ ] **Mean time to recovery** monitoring
- [ ] **Change failure rate** analysis

---

*This document is maintained as part of the CycleTime project architecture. Updates should follow the same review process as code changes.*