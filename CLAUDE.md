# CycleTime Development Workflow

## Development Rules

### Work Management
- **Only work on tasks that are defined in Linear Issues**
- **All Linear Issues must be created in the CycleTime Scrum project**
- **Maintain project board status**: Move issues through columns (Todo → In Progress → Review → Done)
- **Keep task dependencies up-to-date**: Use the "Depends on" custom field to track issue dependencies
- Use Linear Issues to drive what we should be working on next
- Plan features only after foundational architecture is agreed upon

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

## Notes
- This file helps Claude understand our development workflow
- Update this file as our practices evolve
- Always refer to Linear Issues for current work priorities