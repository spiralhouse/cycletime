# Monorepo Strategy with TurboRepo

## Strategic Overview

CycleTime adopts TurboRepo as its monorepo build system to optimize development workflows, enhance CI/CD performance, and enable scalable package management as the project grows from 2 to 8+ TypeScript packages.

## Rationale for TurboRepo Adoption

### Current Pain Points Addressed

**Build Coordination Issues:**
- Manual CI configuration per package (AI Service with 212 tests currently ignored in CI)
- No dependency graph management between packages  
- Risk of version drift and inconsistent tooling across packages
- Sequential build/test execution causing slow CI times

**Growth Scalability Concerns:**
- Current: 2 TypeScript packages (API Gateway, AI Service)
- Projected: 6-8 packages within 6 months
- Need: Automated build orchestration before manual approach becomes unsustainable

### Why TurboRepo Over Alternatives

**TurboRepo Advantages:**
- ✅ **Build-focused**: Optimizes exactly what CycleTime needs (build orchestration, caching)
- ✅ **Incremental adoption**: Works with existing project structure
- ✅ **Simple configuration**: Minimal learning curve for small team
- ✅ **Remote caching**: Dramatic CI performance improvements
- ✅ **Less opinionated**: Preserves existing tooling choices (Jest, ESLint, TypeScript)

**Nx Comparison:**
- ❌ More opinionated about project structure
- ❌ Complex plugin ecosystem (overkill for CycleTime's needs)
- ❌ Code generation focus (not CycleTime's primary need)
- ❌ Higher learning curve and maintenance overhead

## Architecture Strategy

### Package Structure Evolution

**Current State:**
```
packages/
├── api-gateway/           # FastAPI gateway with auth
└── ai-service/            # AI provider abstraction with Worker Pool
```

**Target State (6 months):**
```
packages/
├── shared-types/          # Common interfaces and type definitions
├── shared-utils/          # Utility functions and helpers
├── shared-config/         # Configuration management
├── api-gateway/           # Existing - enhanced with shared packages
├── ai-service/            # Existing - enhanced with shared packages  
├── document-service/      # Markdown processing and storage
├── task-service/          # Linear and GitHub integration
├── web-dashboard/         # React frontend application
├── claude-service/        # Claude-specific AI integration (may merge with ai-service)
└── mcp-server/            # Model Context Protocol server
```

### Dependency Management Strategy

**Dependency Hierarchy:**
1. **Shared Packages** (no internal dependencies)
   - `@cycletime/shared-types`
   - `@cycletime/shared-utils` 
   - `@cycletime/shared-config`

2. **Core Service Packages** (depend on shared packages)
   - `@cycletime/api-gateway`
   - `@cycletime/ai-service`

3. **Application Packages** (depend on core services + shared packages)
   - `@cycletime/document-service`
   - `@cycletime/task-service`
   - `@cycletime/web-dashboard`

**Dependency Rules:**
- ✅ Application packages can depend on core services and shared packages
- ✅ Core services can depend on shared packages
- ❌ Shared packages cannot depend on any internal packages
- ❌ Circular dependencies are forbidden and prevented by TurboRepo

### Service Migration Strategy

**Migration Priority and Rationale:**

1. **Document Service** (Week 2-3)
   - **Rationale**: Highest shared type overlap, clear boundaries
   - **Benefits**: Establishes shared package patterns

2. **Task Service** (Week 3-4)  
   - **Rationale**: Linear integration utilities will benefit other packages
   - **Benefits**: Creates shared GitHub/Linear integration utilities

3. **Web Dashboard** (Week 4-5)
   - **Rationale**: Depends on API Gateway types, good test of dependency graph
   - **Benefits**: Validates frontend integration with monorepo

4. **Claude Service** (Week 5-6)
   - **Rationale**: May merge with AI Service, requires careful integration planning
   - **Benefits**: Consolidates AI provider management

5. **MCP Server** (Week 6+)
   - **Rationale**: Specialized service with fewer shared dependencies
   - **Benefits**: Completes monorepo migration

## TurboRepo Configuration

### Task Pipeline Definition

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  },
  "remoteCache": {
    "signature": true
  }
}
```

### Workspace Configuration

**Root package.json:**
```json
{
  "workspaces": [
    "packages/*"
  ],
  "devDependencies": {
    "turbo": "^1.10.0"
  },
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "dev": "turbo run dev --parallel"
  }
}
```

## Development Workflows

### Local Development Commands

```bash
# Build all packages (respects dependency order)
npm run build

# Test all packages (parallel execution)
npm run test

# Test specific package
npx turbo run test --filter=ai-service

# Build only affected packages
npx turbo run build --filter=...[HEAD~1]

# Run development servers (parallel)
npm run dev
```

### Package Creation Guidelines

**Creating a New Package:**

1. **Directory Structure:**
   ```
   packages/new-service/
   ├── package.json
   ├── tsconfig.json  
   ├── jest.config.js
   ├── src/
   └── __tests__/
   ```

2. **Package.json Template:**
   ```json
   {
     "name": "@cycletime/new-service",
     "scripts": {
       "build": "tsc",
       "test": "jest",
       "lint": "eslint src/**/*.ts",
       "typecheck": "tsc --noEmit"
     }
   }
   ```

3. **TurboRepo Integration:**
   - No additional configuration needed
   - TurboRepo auto-discovers packages in `packages/*`
   - Follow consistent script naming

## CI/CD Integration

### GitHub Actions Pipeline

**Enhanced CI with TurboRepo:**
```yaml
- name: Install dependencies
  run: npm ci

- name: Build packages
  run: npx turbo run build --cache-dir=.turbo

- name: Run tests  
  run: npx turbo run test --cache-dir=.turbo

- name: Type check
  run: npx turbo run typecheck --cache-dir=.turbo

- name: Lint code
  run: npx turbo run lint --cache-dir=.turbo
```

**Remote Caching Benefits:**
- 50-70% faster CI through cache hits
- Parallel execution across packages
- Only rebuild affected packages on PRs

## Performance Expectations

### Immediate Benefits (Week 1-2)

**Local Development:**
- ✅ Parallel testing: `turbo test` runs all packages simultaneously
- ✅ Incremental builds: Only rebuild changed packages
- ✅ Clear dependency order: Automated build orchestration

**CI/CD Performance:**
- ✅ 50-70% faster CI through parallel execution
- ✅ Remote caching eliminates redundant work
- ✅ All packages tested (fixes AI Service gap)

### Growth Benefits (Month 1-3)

**Scalability:**
- ✅ 8+ packages managed with simple commands
- ✅ Complex dependency graphs handled automatically
- ✅ CI time stays under 5 minutes regardless of project size

**Developer Experience:**
- ✅ Consistent development patterns across packages
- ✅ Shared tooling configuration
- ✅ Easy package creation and maintenance

## Risk Mitigation

### Low-Risk Implementation Strategy

**Incremental Adoption:**
- TurboRepo works alongside existing tooling
- Current CI can be maintained as backup during transition
- Easy rollback by removing `turbo.json` and reverting CI

**Validation Gates:**
- Each phase has clear success criteria
- Package migration is optional and reversible
- Remote caching can be disabled if issues arise

### Monitoring and Success Metrics

**Week 2 Targets:**
- [ ] CI time reduced by 50%+
- [ ] All packages tested in CI
- [ ] Parallel execution confirmed working

**Month 1 Targets:**
- [ ] 3+ packages managed by TurboRepo
- [ ] Shared packages created and adopted
- [ ] Clear dependency graph established

**Month 3 Targets:**
- [ ] All services migrated to packages
- [ ] CI time consistently under 5 minutes
- [ ] Developer satisfaction with new workflows

## Future Enhancements

### Advanced TurboRepo Features

**Planned Optimizations:**
- Task scheduling optimization for complex dependency graphs
- Advanced caching strategies per package type
- Build artifact optimization for deployment

**Integration Possibilities:**
- Deployment orchestration with TurboRepo
- End-to-end testing coordination
- Performance monitoring integration

---

*This document serves as the strategic foundation for CycleTime's monorepo implementation. Updates should follow the same review process as architectural decisions.*