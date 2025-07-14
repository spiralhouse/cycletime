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
  8. **Submit Feature**: Create feature PR and move parent Linear issue to "In Review"

- **Technical design requirements**
  - Include architectural decisions, API specifications, and high-level approach
  - **NEVER start coding before design approval**
  - Link design document to Linear issue for context

- **Task breakdown guidelines**
  - Use `/linear:create-subtasks` command to create implementation subtasks
  - Command automatically uses `parentId` parameter for proper subtask linking
  - Command includes effort estimates (Linear estimation enabled)
  - Each subtask should be completable in 1-2 days
  - All subtasks link to technical design document for context

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

### Development Practices
- **Follow Test-Driven Development (TDD) with Red-Green-Refactor cycle**
  - **Red**: Write a failing test that describes the desired functionality
  - **Green**: Write the minimal code necessary to make the test pass
  - **Refactor**: Improve the code while keeping tests green
  - Ensure comprehensive test coverage
  - Never skip the refactor step - clean code is maintainable code

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
- **ALWAYS run comprehensive quality checks before pushing to origin**
  - `npm run lint` - ESLint validation
  - `npm run typecheck` - TypeScript type checking
  - `npm test` - Unit and integration tests
  - `npm run test:coverage` - Test coverage validation
  - Fix all issues before pushing to prevent CI failures
  - Use `git status` and `git diff` to review changes before commit

## Commands

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Run type checking
npm run typecheck
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

### Usage
Type `/` in Claude Code to access these commands, then provide the Linear issue identifier as an argument (e.g., `/linear:start-feature SPI-123`).

## Notes
- This file provides core workflow documentation that applies across all projects
- Slash commands in `.claude/commands/` automate repetitive workflow tasks
- MCP configuration in `.mcp.json` provides team-shared tool access
- Update this file as our practices evolve
- Always refer to Linear Issues for current work priorities