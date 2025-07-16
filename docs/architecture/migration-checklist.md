# Service Migration Checklist

## Overview

This checklist provides a step-by-step process for migrating Docker services to TypeScript packages. Use this as a comprehensive guide to ensure no critical steps are missed during migration.

## Pre-Migration Analysis

### Service Assessment

- [ ] **Analyze current service functionality**
  - [ ] Review existing `/services/[service]/server.js` placeholder
  - [ ] Document current endpoints and functionality
  - [ ] Identify environment variables and dependencies
  - [ ] Review Docker Compose configuration
  - [ ] Assess service complexity and migration effort

- [ ] **Identify dependencies**
  - [ ] Map external service dependencies
  - [ ] Identify shared code opportunities
  - [ ] Document integration points with other services
  - [ ] Review database schema requirements
  - [ ] Check for Redis/cache dependencies

- [ ] **Plan migration approach**
  - [ ] Define migration timeline
  - [ ] Identify risk areas and mitigation strategies
  - [ ] Plan testing strategy
  - [ ] Define rollback procedures

## Phase 1: Package Setup

### 1.1 Create Package Structure

- [ ] **Create package directory**
  ```bash
  mkdir packages/[service-name]
  cd packages/[service-name]
  ```

- [ ] **Create directory structure**
  ```bash
  mkdir -p src/{__tests__,types,routes,services,middleware,utils}
  ```

- [ ] **Initialize package.json**
  - [ ] Copy appropriate template from [package-creation-patterns.md](./package-creation-patterns.md)
  - [ ] Update package name: `@cycletime/[service-name]`
  - [ ] Update description and keywords
  - [ ] Configure correct dependencies
  - [ ] Set appropriate version (1.0.0 for services, 0.1.0 for libraries)

### 1.2 Configure TypeScript

- [ ] **Create tsconfig.json**
  - [ ] Copy template from package creation patterns
  - [ ] Verify include/exclude paths
  - [ ] Ensure proper TypeScript target (ES2022)
  - [ ] Enable declaration generation

- [ ] **Verify TypeScript compilation**
  ```bash
  npm run typecheck
  ```

### 1.3 Configure Testing

- [ ] **Create jest.config.js**
  - [ ] Copy template with appropriate settings
  - [ ] Configure coverage thresholds (80% minimum)
  - [ ] Set up test environment

- [ ] **Create test setup file**
  - [ ] Create `src/__tests__/setup.ts`
  - [ ] Configure test database connections
  - [ ] Set up mock utilities
  - [ ] Configure global test helpers

### 1.4 Configure Linting

- [ ] **Verify ESLint configuration**
  - [ ] Ensure package inherits from root ESLint config
  - [ ] Test linting: `npm run lint`
  - [ ] Fix any initial linting issues

### 1.5 Verify Package Detection

- [ ] **Confirm TurboRepo detection**
  ```bash
  # From project root
  npx turbo run build --dry-run
  ```
  - [ ] Verify new package appears in build graph
  - [ ] Check dependency resolution

## Phase 2: Core Implementation

### 2.1 Configuration Setup

- [ ] **Create configuration module**
  - [ ] Create `src/config.ts`
  - [ ] Use Zod for environment variable validation
  - [ ] Map Docker environment variables to TypeScript config
  - [ ] Provide sensible defaults
  - [ ] Document all configuration options

- [ ] **Test configuration**
  - [ ] Write unit tests for configuration validation
  - [ ] Test with various environment variable combinations
  - [ ] Verify error handling for missing required variables

### 2.2 Logging Setup

- [ ] **Implement logging utility**
  - [ ] Create `src/utils/logger.ts`
  - [ ] Configure Winston with appropriate transports
  - [ ] Set up structured logging format
  - [ ] Configure different log levels per environment

- [ ] **Test logging**
  - [ ] Verify log output in different environments
  - [ ] Test error logging with stack traces
  - [ ] Confirm log rotation (if applicable)

### 2.3 Core Service Implementation

- [ ] **Implement main entry point**
  - [ ] Create `src/index.ts`
  - [ ] Set up graceful shutdown handling
  - [ ] Implement error handling for unhandled rejections
  - [ ] Add process signal handlers

- [ ] **Implement server setup** (for web services)
  - [ ] Create `src/server.ts`
  - [ ] Configure Fastify with security middleware
  - [ ] Set up CORS and rate limiting
  - [ ] Configure request/response logging

- [ ] **Implement health checks**
  - [ ] Create `src/routes/health.ts`
  - [ ] Implement `/health` endpoint
  - [ ] Add `/ready` and `/live` endpoints for Kubernetes
  - [ ] Include dependency health checks (database, Redis)

### 2.4 Business Logic Implementation

- [ ] **Implement service-specific functionality**
  - [ ] Create service modules in `src/services/`
  - [ ] Implement route handlers in `src/routes/`
  - [ ] Add input validation with Zod schemas
  - [ ] Implement error handling middleware

- [ ] **Add shared type integration**
  - [ ] Import types from `@cycletime/shared-types`
  - [ ] Create service-specific types in `src/types/`
  - [ ] Ensure type safety across all modules

### 2.5 Database Integration (if applicable)

- [ ] **Set up database connection**
  - [ ] Import Prisma client from generated client
  - [ ] Configure connection pooling
  - [ ] Implement database health checks
  - [ ] Add proper error handling

- [ ] **Implement data access layer**
  - [ ] Create repository or service layer for database operations
  - [ ] Implement proper transaction handling
  - [ ] Add database query optimization

### 2.6 External Service Integration

- [ ] **Integrate with external APIs** (if applicable)
  - [ ] Implement HTTP clients for external services
  - [ ] Add proper authentication handling
  - [ ] Implement retry logic and circuit breakers
  - [ ] Add comprehensive error handling

- [ ] **Redis integration** (if applicable)
  - [ ] Set up Redis connection
  - [ ] Implement caching layer
  - [ ] Add Redis health checks
  - [ ] Configure connection pooling

## Phase 3: Testing Implementation

### 3.1 Unit Tests

- [ ] **Implement unit tests**
  - [ ] Test all service functions and methods
  - [ ] Test configuration validation
  - [ ] Test error handling scenarios
  - [ ] Mock external dependencies

- [ ] **Verify test coverage**
  ```bash
  npm run test:coverage
  ```
  - [ ] Ensure minimum 80% coverage
  - [ ] Review coverage report for gaps
  - [ ] Add tests for uncovered code paths

### 3.2 Integration Tests

- [ ] **Database integration tests** (if applicable)
  - [ ] Test database operations with real database
  - [ ] Test transaction handling
  - [ ] Test connection pooling behavior
  - [ ] Test database health checks

- [ ] **External service integration tests**
  - [ ] Test API integrations with mock servers
  - [ ] Test error handling and retry logic
  - [ ] Test authentication flows
  - [ ] Test timeout scenarios

### 3.3 End-to-End Tests

- [ ] **HTTP endpoint tests**
  - [ ] Test all route handlers
  - [ ] Test middleware functionality
  - [ ] Test request/response validation
  - [ ] Test error response formats

- [ ] **Health check tests**
  - [ ] Test health endpoint responses
  - [ ] Test readiness and liveness checks
  - [ ] Test health checks under failure conditions

## Phase 4: Docker Integration

### 4.1 Container Configuration

- [ ] **Create development Dockerfile**
  - [ ] Create `Dockerfile` in package directory
  - [ ] Use multi-stage build for optimization
  - [ ] Configure proper working directory
  - [ ] Set up non-root user for security

- [ ] **Test container build**
  ```bash
  docker build -t cycletime/[service-name]:dev .
  ```
  - [ ] Verify successful build
  - [ ] Test container startup
  - [ ] Verify health checks work in container

### 4.2 Docker Compose Updates

- [ ] **Update docker-compose.yml**
  - [ ] Update build context for new package
  - [ ] Configure environment variables
  - [ ] Update volume mounts for development
  - [ ] Verify service dependencies

- [ ] **Test Docker Compose integration**
  ```bash
  docker compose up [service-name]
  ```
  - [ ] Verify service starts successfully
  - [ ] Test health endpoint accessibility
  - [ ] Verify environment variable injection
  - [ ] Test service-to-service communication

### 4.3 Production Container

- [ ] **Optimize production Dockerfile**
  - [ ] Implement multi-stage build
  - [ ] Minimize image size
  - [ ] Use Alpine base images
  - [ ] Configure security best practices

- [ ] **Test production container**
  - [ ] Build production image
  - [ ] Test container in production-like environment
  - [ ] Verify resource limits and performance

## Phase 5: Build System Integration

### 5.1 TurboRepo Configuration

- [ ] **Verify build dependencies**
  - [ ] Check `turbo.json` includes new package
  - [ ] Verify dependency graph is correct
  - [ ] Test parallel builds work correctly

- [ ] **Test build commands**
  ```bash
  # From project root
  npm run build
  npm run test
  npm run lint
  npm run typecheck
  ```
  - [ ] Verify all commands complete successfully
  - [ ] Check build outputs are correct
  - [ ] Verify cache invalidation works

### 5.2 CI/CD Integration

- [ ] **Test CI pipeline**
  - [ ] Create test branch and push changes
  - [ ] Verify GitHub Actions run successfully
  - [ ] Check all quality gates pass
  - [ ] Verify remote caching works

- [ ] **Update deployment configuration** (if needed)
  - [ ] Update Kubernetes manifests
  - [ ] Update Docker registry configuration
  - [ ] Update environment-specific configurations

## Phase 6: Quality Assurance

### 6.1 Code Quality

- [ ] **Run comprehensive quality checks**
  ```bash
  npm run lint
  npm run typecheck
  npm run test:coverage
  ```
  - [ ] Fix all linting issues
  - [ ] Resolve TypeScript errors
  - [ ] Ensure test coverage meets requirements

- [ ] **Code review preparation**
  - [ ] Document any breaking changes
  - [ ] Update relevant documentation
  - [ ] Prepare migration notes for team

### 6.2 Performance Testing

- [ ] **Load testing** (for web services)
  - [ ] Test endpoint performance under load
  - [ ] Verify resource usage is acceptable
  - [ ] Test connection pooling behavior

- [ ] **Memory and resource testing**
  - [ ] Monitor memory usage during operation
  - [ ] Test for memory leaks
  - [ ] Verify graceful shutdown behavior

## Phase 7: Documentation and Deployment

### 7.1 Documentation

- [ ] **Create package README**
  - [ ] Document package purpose and functionality
  - [ ] Include installation and usage instructions
  - [ ] Document configuration options
  - [ ] Include examples and troubleshooting guide

- [ ] **Update architecture documentation**
  - [ ] Update system architecture diagrams
  - [ ] Document any new dependencies
  - [ ] Update deployment documentation

### 7.2 Deployment Preparation

- [ ] **Environment configuration**
  - [ ] Verify all environment variables are documented
  - [ ] Update environment-specific configurations
  - [ ] Test configuration in staging environment

- [ ] **Migration planning**
  - [ ] Plan rollout strategy
  - [ ] Prepare rollback procedures
  - [ ] Document any downtime requirements
  - [ ] Plan monitoring and alerting updates

## Phase 8: Migration Execution

### 8.1 Staging Deployment

- [ ] **Deploy to staging environment**
  - [ ] Deploy new TypeScript package
  - [ ] Run integration tests in staging
  - [ ] Verify all functionality works correctly
  - [ ] Test with realistic data volumes

- [ ] **Performance validation**
  - [ ] Compare performance with old service
  - [ ] Verify resource usage is acceptable
  - [ ] Test under expected load conditions

### 8.2 Production Migration

- [ ] **Production deployment**
  - [ ] Follow deployment runbook
  - [ ] Monitor service health during rollout
  - [ ] Verify all functionality works correctly
  - [ ] Monitor performance and error rates

- [ ] **Post-deployment validation**
  - [ ] Run health checks and integration tests
  - [ ] Verify monitoring and alerting work
  - [ ] Check log output for any issues
  - [ ] Validate with end-users or stakeholders

### 8.3 Cleanup

- [ ] **Remove old service artifacts**
  - [ ] Remove old service from docker-compose.yml
  - [ ] Clean up old Docker images
  - [ ] Remove unused environment variables
  - [ ] Archive old service code

- [ ] **Update documentation**
  - [ ] Update deployment documentation
  - [ ] Update troubleshooting guides
  - [ ] Document any lessons learned

## Post-Migration Checklist

### Monitoring and Observability

- [ ] **Set up monitoring**
  - [ ] Configure application metrics
  - [ ] Set up error tracking
  - [ ] Configure performance monitoring
  - [ ] Set up alerting rules

- [ ] **Log aggregation**
  - [ ] Verify logs are being collected
  - [ ] Set up log parsing and indexing
  - [ ] Configure log retention policies

### Security Review

- [ ] **Security assessment**
  - [ ] Review dependency vulnerabilities
  - [ ] Verify container security practices
  - [ ] Review access controls and permissions
  - [ ] Validate input sanitization

### Performance Optimization

- [ ] **Performance review**
  - [ ] Analyze performance metrics
  - [ ] Identify optimization opportunities
  - [ ] Plan performance improvements
  - [ ] Document performance benchmarks

## Common Issues and Solutions

### TypeScript Compilation Issues

**Issue**: TypeScript compilation fails with module resolution errors
**Solution**: 
- Verify `tsconfig.json` moduleResolution is set to "node"
- Check that all dependencies are properly installed
- Ensure workspace dependencies use `workspace:*` format

### Docker Build Issues

**Issue**: Docker build fails to find package files
**Solution**:
- Verify build context is set to project root
- Check that .dockerignore doesn't exclude necessary files
- Ensure COPY commands use correct relative paths

### Test Failures

**Issue**: Tests fail in CI but pass locally
**Solution**:
- Check for timezone differences
- Verify environment variables are set in CI
- Check for file system case sensitivity issues
- Ensure test database setup is consistent

### Performance Issues

**Issue**: Service performance is worse than Docker version
**Solution**:
- Review TypeScript compilation target
- Check for memory leaks in long-running processes
- Optimize database queries and connection pooling
- Review logging overhead

## Migration Success Criteria

### Technical Criteria

- [ ] All tests pass with >80% coverage
- [ ] No TypeScript compilation errors
- [ ] No linting errors
- [ ] Docker container builds and runs successfully
- [ ] All health checks pass
- [ ] Performance meets or exceeds original service

### Operational Criteria

- [ ] Service deploys successfully in all environments
- [ ] Monitoring and alerting work correctly
- [ ] Documentation is complete and accurate
- [ ] Team is trained on new service structure
- [ ] Rollback procedures are tested and documented

### Business Criteria

- [ ] All business functionality is preserved
- [ ] No regression in user experience
- [ ] Service reliability meets SLA requirements
- [ ] Security posture is maintained or improved

## Related Documentation

- [Service Migration Guide](./service-migration-guide.md)
- [Package Creation Patterns](./package-creation-patterns.md)
- [TurboRepo Monorepo Strategy](./monorepo-strategy.md)