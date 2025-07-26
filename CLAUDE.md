# CycleTime Development Workflow

## Development Rules

### Work Management
- **Only work on tasks that are defined in Linear Issues**
- **All Linear Issues must be created in the CycleTime Scrum project**
- **Maintain project board status**: Move issues through columns (Todo → In Progress → Review → Done)
- **Keep task dependencies up-to-date**: Use Linear issue relations to track dependencies (Blocked by/Blocks relationships)
- Use Linear Issues to drive what we should be working on next
- Plan features only after foundational architecture is agreed upon

#### Feature Development Workflow
- **Git workflow for new features**
  - Always sync from main: `git checkout main && git pull origin main`
  - Create feature branch: `git checkout -b feature/issue-identifier-description`
  - Keep branches focused on single feature/Linear issue
  - **NEVER work on outdated main branch**

- **Complete feature development process**:
  1. **Start**: Sync from main and create feature branch
  2. **Create Design Task**: Create "Technical Design for [Feature]" subtask in Linear and move to "In Progress"
  3. **Design**: Create technical design doc in `/docs/technical-designs/[feature-name].md`
  4. **Review Design**: Submit design PR and move design subtask to "In Review"
  5. **Design Approval**: Wait for design approval before proceeding
  6. **Breakdown**: Create implementation subtasks linked to design document
  7. **Implement**: Follow TDD practices to build feature
  8. **Submit Subtask**: Create subtask PR and move subtask Linear issue to "In Review"

- **Technical design requirements**
  - Include architectural decisions, API specifications, and high-level approach
  - **NEVER start coding before design approval**
  - Link design document to Linear issue for context

- **Task breakdown guidelines**
  - Use `/linear:create-subtasks` command to create implementation subtasks
  - Command automatically uses `parentId` parameter for proper subtask linking
  - Command includes effort estimates using Fibonacci scale (Linear estimation enabled)
  - Target subtasks at 1-5 points for optimal sprint planning
  - All subtasks link to technical design document for context

- **Parent issue lifecycle management**
  - **Parent issues remain "In Progress" until ALL subtasks are completed**
  - Only move parent to "In Review" when creating final integration PR that closes the parent
  - Never move parent to "Done" until it's fully implemented and merged
  - Design completion does NOT move parent to "Done" - only moves design subtask to "In Review"
  - Track progress through subtask completion, not parent status changes

#### Project Board Workflow
- **Todo**: Issues ready to be worked on
- **In Progress**: Issues currently being worked on (move here when starting work)
- **Review**: Issues with PRs awaiting review/merge
- **Done**: Completed and merged issues

#### Project Information
- **Team ID**: `03ee7cf5-773e-4f53-bc0d-2e5e4d3bc3bc`
- **Team Name**: Spiral House
- **Project ID**: `9e221bf0-680d-4ad1-98b2-b24998fdf92e`
- **Project Name**: CycleTime Scrum
- **URL**: https://linear.app/spiral-house/project/cycletime-scrum-89fc2f60a36f

#### Linear Status IDs
- **Todo**: `fc814d1f-22b5-4ce6-8b40-87c1312d54ba`
- **In Progress**: `a433a32b-b815-4e11-af23-a74cb09606aa`
- **In Review**: `8d617a10-15f3-4e26-ad28-3653215c2f25`
- **Done**: `3d267fcf-15c0-4f3a-8725-2f1dd717e9e8`
- **Canceled**: `a2581462-7e43-4edb-a13a-023a2f4a6b1e`
- **Duplicate**: `3f7c4359-7560-4bd9-93b7-9900671742aa`
- **Backlog**: `1e7bd879-6685-4d94-8887-b7709b3ae6e8`

#### Estimation Scale (Fibonacci)
**Complexity-Based Estimation**: Points reflect task complexity, not time duration

- **1 point** = Trivial complexity (straightforward implementation)
- **2 points** = Simple complexity (well-understood requirements)  
- **3 points** = Moderate complexity (some architectural decisions needed)
- **5 points** = Moderately complex (multiple integrations or significant logic)
- **8 points** = Complex (substantial architectural work or many unknowns)
- **13 points** = Highly complex (major feature, consider decomposition)

**Guidelines**:
- Target subtasks at 1-5 points for optimal sprint planning
- 8+ point tasks may need further breakdown
- Consider task complexity, unknowns, and dependencies when estimating
- Let velocity emerge from completed complexity over time

### Development Practices
- **Follow Test-Driven Development (TDD) with Red-Green-Refactor cycle**
  - **Red**: Write a failing test that describes the desired functionality
  - **Green**: Write the minimal code necessary to make the test pass
  - **Refactor**: Improve the code while keeping tests green
  - Ensure comprehensive test coverage
  - Never skip the refactor step - clean code is maintainable code

### Documentation Authorship
- **Use "John Burbridge" as author** for formal documentation (architectural docs, specifications)
- Applied to documents in `/docs/`

### Git Workflow
- **Use Conventional Commits with specific types**:
  - `feat:` - New features or functionality
  - `fix:` - Bug fixes
  - `docs:` - Documentation changes only
  - `test:` - Adding or updating tests
  - `refactor:` - Code refactoring without changing functionality
  - `chore:` - Build process, dependencies, tooling
  - `style:` - Code formatting, whitespace (no logic changes)
  - `perf:` - Performance improvements
  - `ci:` - CI/CD pipeline changes

- **Keep commits focused and atomic**:
  - **NEVER mix different types** in a single commit
  - Documentation updates = separate `docs:` commit
  - Test additions = separate `test:` commit  
  - Refactoring = separate `refactor:` commit
  - Bug fixes = separate `fix:` commit
  - Each commit should have one clear purpose

- **Follow trunk-based development**
  - Use short-lived feature branches
  - Avoid committing directly to main
  - Keep main branch always in a releasable state

### Quality Assurance

#### Local-First Testing Philosophy

**ALWAYS test locally before pushing** to prevent CI failures and reduce feedback cycles.

**Benefits of Local-First Testing**:
1. **Faster Feedback** - Immediate results vs waiting for CI (minutes vs seconds)
2. **Cost Effective** - Reduces CI compute usage and GitHub Actions minutes  
3. **Better Debugging** - Full local access to logs, state, and debugging tools
4. **Higher Confidence** - Verify fixes work before pushing to shared repository
5. **Reduced Context Switching** - Stay in development flow without CI interruptions

#### Quality Validation Pipeline (Pre-PR)

**Complete validation workflow to run before creating pull requests:**

```bash
# 1. Build Validation - Ensure all packages compile
turbo build

# 2. Code Quality Checks
turbo lint        # ESLint across all packages
turbo typecheck   # TypeScript compilation verification

# 3. Test Suite Execution
turbo test:unit        # Fast unit tests without external dependencies
turbo test:integration # Integration tests with database/Redis/services
turbo test            # Complete test suite (includes contract tests)

# 4. Package-Specific Validation (for modified packages)
npm run test --workspace=@cycletime/shared-testing -- --coverage
npm run test --workspace=@cycletime/shared-utils -- --coverage
npm run test --workspace=@cycletime/shared-config
npm run test --workspace=@cycletime/shared-types

# 5. CI Simulation (Optional - when making testing infrastructure changes)
act --container-architecture linux/amd64 -j test --artifact-server-path /tmp/artifacts
```

**One-Line Quality Check**:
```bash
# Run complete pipeline in sequence
turbo build && turbo lint && turbo typecheck && turbo test
```

#### Individual Package Testing

For focused development and debugging:

```bash
# Test specific package with various options
npm run test --workspace=@cycletime/api-gateway
npm run test --workspace=@cycletime/api-gateway -- --coverage
npm run test --workspace=@cycletime/api-gateway -- --testNamePattern="Authentication"

# Direct package testing
cd packages/api-gateway
npm test                    # Run all tests
npm run test:coverage      # Run with coverage report
npm run test:watch         # Watch mode for development
npm test -- --verbose      # Detailed test output
```

#### Local CI Simulation with nektos/act

Simulate GitHub Actions locally before pushing:

```bash
# Install nektos/act (macOS)
brew install act

# Run full CI pipeline locally
act --container-architecture linux/amd64 -j test --artifact-server-path /tmp/artifacts

# Monitor specific package results
act --container-architecture linux/amd64 -j test --artifact-server-path /tmp/artifacts 2>&1 | grep api-gateway

# Run with timeout for long-running tests
timeout 300 act --container-architecture linux/amd64 -j test --artifact-server-path /tmp/artifacts
```

#### Troubleshooting Testing Issues

```bash
# For hanging tests or external dependency issues
npm test -- --detectOpenHandles --forceExit

# For authentication or mock service issues  
NODE_ENV=test MOCK_RESPONSES_ENABLED=true npm test

# For debugging circuit breaker decorator issues
npm test -- --testNamePattern="circuit-breaker" --verbose

# For Jest configuration issues
npm test -- --verbose --no-cache
```

#### Quality Gates and Standards

- **Fix all issues locally** before pushing to prevent CI failures
- **Use `git status` and `git diff`** to review changes before commit
- **Verify tests pass** with nektos/act simulation when making testing changes
- **Check coverage thresholds** meet package-specific requirements (80%+ per base config)
- **Ensure zero linting errors** and TypeScript compilation issues
- **Validate breaking changes** don't affect dependent packages

## Commands

### TurboRepo Monorepo Commands
```bash
# Run all tests across packages
turbo test

# Run tests with coverage for specific package
npm run test --workspace=@cycletime/shared-utils -- --coverage

# Run linting across packages
turbo lint

# Run type checking across packages
turbo typecheck

# Build all packages
turbo build

# Run commands for specific package only
npm run test --workspace=@cycletime/package-name
npm run build --workspace=@cycletime/package-name
```

### Package-Specific Operations
```bash
# When working on individual packages
cd packages/shared-utils
npm test
npm run build
npm run lint
```

### Essential Development Commands
```bash
# Quality validation (see Quality Assurance section for complete pipeline)
turbo build && turbo lint && turbo typecheck && turbo test

# Quick package testing
npm run test --workspace=@cycletime/package-name
npm run build --workspace=@cycletime/package-name
```

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/issue-number-description

# Commit with conventional format
git commit -m "feat: add feature description"

# Push feature branch
git push origin feature/issue-number-description

# Create PR via GitHub CLI
gh pr create --title "feat: description" --body "Closes linear-issue-identifier"
```

## Project Structure

### Documentation
- `/docs/requirements/` - Product requirements and specifications
- `/docs/technical-designs/` - Technical design documents
- `/docs/architecture/` - System architecture documentation

### Source Code
- `/src/` - Core application code
- `/packages/` - Individual packages (MCP server, web app, etc.)
- `/tests/` - Test files

## Claude Code Workflow Automation

### Custom Slash Commands
The `.claude/commands/` directory contains workflow automation:

- **`/linear:start-feature`** - Complete feature startup workflow (sync, branch, design task)
- **`/linear:move-to-review`** - Move issue to review and create PR
- **`/linear:create-subtasks`** - Break down technical design into implementation tasks
- **`/docs:technical-design`** - Generate comprehensive design document template
- **`/workflow:tdd-cycle`** - Execute Red-Green-Refactor TDD process
- **`/workflow:quality-check`** - Run complete pre-push quality verification
- **`/workflow:atomic-commit`** - Create focused, conventional commits
- **`/workflow:context-sync`** - Recover project context after interruption or context loss

### Usage
Type `/` in Claude Code to access these commands, then provide the Linear issue identifier as an argument (e.g., `/linear:start-feature SPI-123`).

### Context Recovery
When development is interrupted (system restart, context loss, returning to work), use `/workflow:context-sync` to intelligently recover project state:

**When to Use**:
- After system crashes, restarts, or unexpected shutdowns
- When AI context has been reset or compacted during conversation
- Returning to work after breaks, meetings, or context switches
- When unsure of current development state or next steps
- Before starting work to verify project status

**What It Provides**:
- Current Linear issue status and priorities
- Git repository state and recent changes
- Links to relevant technical documentation
- Basic code quality health check
- Actionable next steps for resuming work

**Usage**: `/workflow:context-sync [optional-issue-id]`

This systematic approach prevents duplicate work and ensures accurate context recovery without assumptions.

## Notes
- This file provides core workflow documentation that applies across all projects
- Slash commands in `.claude/commands/` automate repetitive workflow tasks
- MCP configuration in `.mcp.json` provides team-shared tool access
- Update this file as our practices evolve
- Always refer to Linear Issues for current work priorities