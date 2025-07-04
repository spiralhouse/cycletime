# Quality Assurance Check

Run comprehensive quality checks before pushing changes for: $ARGUMENTS

## Pre-Push Quality Checklist:

### 1. **Test Suite**
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

### 2. **Code Quality**
```bash
# Run linting
npm run lint

# Run type checking
npm run typecheck
```

### 3. **Git Status Check**
- Verify all changes are committed
- Check for untracked files that should be added
- Ensure commit messages follow conventional format

### 4. **Documentation Verification**
- Technical design documents updated if architectural changes
- CLAUDE.md updated if workflow changes
- README updated if setup/usage changes

### 5. **Linear Issue Status**
- Confirm issue status matches current work phase
- Verify issue links to PR when ready for review
- Check dependencies and blocking relationships

## Quality Gates:
- [ ] All tests passing
- [ ] No linting errors
- [ ] No type errors
- [ ] All changes committed
- [ ] Conventional commit format used
- [ ] Documentation updated as needed
- [ ] Linear issue status accurate

## Next Steps After Quality Check:
- If creating PR: Use `/linear:move-to-review $ARGUMENTS`
- If continuing development: Continue TDD cycle
- If design phase: Submit design PR first

Only proceed with push/PR creation if ALL quality gates pass.