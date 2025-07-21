# CI Monitor and Fix Workflow

**Usage**: `/workflow:ci-monitor [issue-id]`

## Overview
Comprehensive workflow for monitoring and fixing CI check failures until all checks pass successfully.

## Prerequisites
- Must be on a feature branch with active PR
- GitHub CLI (`gh`) must be authenticated
- Local development environment must be properly configured

## Workflow Steps

### 1. Check Current CI Status
```bash
# Check current PR status and CI checks
gh pr list --state open --json number,title,statusCheckRollup

# List recent workflow runs
gh run list --limit 5

# Get detailed failure information if CI is failing
gh run view [run-id] --log-failed
```

### 2. Analyze and Fix Issues
Based on CI failure patterns:

**Build Failures:**
- Missing dependencies (add to package.json)
- TypeScript compilation errors (fix type issues)
- Import/export problems (verify module resolution)

**Test Failures:**
- Missing test setup files
- Mock configuration issues
- Environment variable problems

**Linting Failures:**
- ESLint configuration issues (check eslint.config.js)
- Code style violations (fix automatically with --fix)
- Type checking problems

**Common Fixes:**
```bash
# Fix missing workspace dependencies
npm install

# Run local quality checks to match CI
turbo build && turbo typecheck && turbo lint && turbo test

# Fix specific package issues
turbo build --filter=@cycletime/package-name
```

### 3. Commit and Push Fixes
```bash
# Stage and commit fixes with conventional commit format
git add [changed-files]
git commit -m "fix: description of what was fixed

- Bullet points of specific changes
- Reference to issue resolution

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to trigger new CI run
git push origin [branch-name]
```

### 4. Monitor CI Progress
```bash
# Watch CI progress (repeat until completion)
gh run list --limit 3

# Check specific run details
gh run view [run-id]

# Monitor job progress
gh run view --job=[job-id]
```

### 5. Iterate Until Success
- Repeat steps 2-4 until all CI checks pass
- Each iteration should address newly discovered issues
- Monitor for cascading failures (one fix revealing other issues)

## Success Criteria
- All CI checks show ✅ status
- PR is ready for review
- Local and CI environments are consistent

## Troubleshooting

**Dependency Resolution Issues:**
```bash
# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Build Cache Issues:**
```bash
# Clear turbo cache
npx turbo clean
turbo build
```

**ESLint v9 Configuration:**
Ensure flat config format in `eslint.config.js`:
```javascript
module.exports = [
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/__tests__/**/*'],
    // ... configuration
  }
];
```

**Jest Setup Issues:**
Ensure setup files exist and are properly configured:
```bash
# Check jest.config.js for setupFilesAfterEnv
# Ensure src/__tests__/setup.ts exists with proper mocks
```

## Notes
- This workflow should be run from the project root directory
- Each CI failure should be addressed systematically
- Document patterns for future reference
- Use conventional commit messages for fixes