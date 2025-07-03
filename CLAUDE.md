# CycleTime Development Workflow

## Development Rules

### Work Management
- **Only work on tasks that are defined in GitHub Issues**
- **All GitHub Issues must be created in the CycleTime Scrum project**
- **Maintain project board status**: Move issues through columns (Todo → In Progress → Review → Done)
- Use GitHub Issues to drive what we should be working on next
- Plan features only after foundational architecture is agreed upon

#### Project Board Workflow
- **Todo**: Issues ready to be worked on
- **In Progress**: Issues currently being worked on (move here when starting work)
- **Review**: Issues with PRs awaiting review/merge
- **Done**: Completed and merged issues

### Development Practices
- **Follow Test-Driven Development (TDD)**
  - Write tests first, then implement functionality
  - Ensure comprehensive test coverage

### Git Workflow
- **Use Conventional Commits** (feat, fix, chore, etc.)
- **Follow trunk-based development**
  - Use short-lived feature branches
  - Avoid committing directly to main
  - Keep main branch always in a releasable state

### Quality Assurance
- **Run comprehensive tests before pushing to origin**
  - Unit tests
  - Integration tests
  - Linting
  - Type checking

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
gh pr create --title "feat: description" --body "Closes #issue-number"
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

## Notes
- This file helps Claude understand our development workflow
- Update this file as our practices evolve
- Always refer to GitHub Issues for current work priorities