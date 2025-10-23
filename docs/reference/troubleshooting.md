---
title: "Troubleshooting Guide"
type: reference
domain: [operations, support]
description: "Comprehensive troubleshooting reference covering agent issues, build failures, database problems, and common development errors with solutions"
dependencies: []
related: [agents.md, worktree-operations.md]
keywords: [troubleshooting, debugging, errors, solutions, diagnostics]
last_updated: 2025-10-21
---

# Troubleshooting Guide

Comprehensive troubleshooting reference for CycleTime development issues.

## Agent-Related Issues

### Task Tool Agent Problems

#### Generic Responses
**Symptom**: Agent provides vague or generic advice
**Cause**: Insufficient context or requirements
**Solution**: Provide more specific task descriptions

```bash
❌ @agent-developer "Fix auth issue"
✅ @agent-developer "Fix JWT token expiration where tokens expire after 15 minutes instead of configured 1 hour, causing premature logout"
```

#### Codebase Mismatch
**Symptom**: Agent recommendations don't fit project patterns
**Cause**: Lack of context about existing conventions
**Solution**: Include existing patterns in task description

```bash
@agent-developer "Implement user registration following the existing repository pattern used in ProjectRepository and IssueRepository, using Exposed ORM for database operations and Ktor routing for API endpoints"
```

#### Requirements Gaps
**Symptom**: Implementation doesn't meet specific requirements
**Cause**: Incomplete requirement specification
**Solution**: Be explicit about all constraints and acceptance criteria

```bash
@agent-developer "Implement user registration with these requirements: email must be unique, password must be hashed with bcrypt, user gets verification email, account inactive until verified, API returns appropriate error codes for validation failures"
```

### Claude CLI Agent Problems

#### Command Not Found
**Symptom**: Agent fails immediately with exit code 127
**Error**: `command not found: claude`
**Cause**: Claude CLI not available in PATH

**Solutions**:
1. Verify installation: `which claude`
2. Use full path: `/usr/local/bin/claude -p "..." --append-system-prompt ...`
3. Fix PATH: `export PATH="/usr/local/bin:$PATH"`

#### Agent Configuration Issues
**Symptom**: Agent behaves unexpectedly or lacks proper context
**Cause**: Agent configuration not properly loaded

**Solution**:
```bash
# Verify agent configs exist
ls .claude/agents/

# Check agent config is valid markdown
cat .claude/agents/developer.md

# Verify worktree has latest agent configs
git worktree add .worktrees/feature-name -b feat/feature-name
ls .worktrees/feature-name/.claude/agents/
```

#### Permission Issues
**Symptom**: Task tool agent cannot modify files
**Cause**: File permissions or directory access restrictions

**Solution**: Verify file permissions and ensure Claude Code has proper access to the project directory

#### Task Tool Agent Configuration Issues
**Symptom**: Task tool agent reports completion but expected file changes didn't occur
**Cause**: Agent may lack configured tool access or encountered execution errors
**Solution**: Verify agent has Edit tool access and check for any error messages during execution

## Worktree Issues

### Creation Failures
**Symptom**: Worktree creation fails or hangs
**Causes & Solutions**:

**Insufficient Space**:
```bash
df -h .  # Check available space
```

**Invalid Repository**:
```bash
git status  # Verify Git repository
```

**Existing Worktree Conflict**:
```bash
git worktree list | grep feature-name  # Check for conflicts
```

### Permission Problems
**Symptom**: Cannot access worktree files
**Causes & Solutions**:

**Ownership Issues**:
```bash
ls -la .worktrees/  # Verify ownership
chmod -R u+w .worktrees/feature-name/  # Fix permissions if needed
```

**Authorization Prompts**:
- Ensure worktrees are under project root (`.worktrees/`)
- Avoid external paths that require user authorization

### Branch Conflicts
**Symptom**: Cannot create branch with desired name
**Solution**:
```bash
# Check existing branches
git branch -a | grep feature-name

# Use alternative naming
git worktree add .worktrees/feature-name-v2 -b feat/feature-name-v2
```

### Cleanup Issues
**Symptom**: Cannot remove worktree
**Solutions**:

**Uncommitted Changes**:
```bash
cd .worktrees/feature-name
git stash  # Save changes
cd ../..
git worktree remove .worktrees/feature-name
```

**Force Removal**:
```bash
git worktree remove --force .worktrees/feature-name
git worktree prune  # Clean up Git records
```

**Corrupted Worktree**:
```bash
# Remove directory manually
rm -rf .worktrees/corrupted-worktree
git worktree prune
```

## Dependency Issues

### Missing Dependencies in Worktrees
**Symptom**: Tests fail with module resolution errors
**Error**: `Cannot find module '@/widgets/feature'`
**Solutions**:

**Install Dependencies**:
```bash
cd .worktrees/feature-name
npm install
```

**Verify TypeScript Configuration**:
```bash
cat tsconfig.json | grep -A5 "paths"
```

**Batch Dependency Installation**:
```bash
for worktree in .worktrees/*/; do
    (cd "$worktree" && npm install)
done
```

### Build Configuration Issues
**Symptom**: Build fails in worktree but works in main
**Solutions**:

**Copy Configuration Files**:
```bash
cp tsconfig.json .worktrees/feature-name/
cp .eslintrc.js .worktrees/feature-name/
```

**Verify Path Mappings**:
```bash
# Ensure relative paths work from worktree location
cd .worktrees/feature-name
npm run build
```

## Git Integration Issues

### Merge Conflicts
**Symptom**: Cannot merge feature branch
**Solutions**:

**Sync with Main**:
```bash
git checkout main && git pull origin main
git checkout feat/feature-name
git rebase main
```

**Resolve Conflicts**:
```bash
# Fix conflicts manually
git add resolved-files
git rebase --continue
```

**Use Agent for Complex Conflicts**:
```bash
@agent-developer "Resolve merge conflicts while preserving feature functionality"
```

### Failed Tests After Merge
**Symptom**: Tests pass in worktree but fail after merge
**Solutions**:

**Run Tests Locally**:
```bash
npm run test
```

**Check Integration**:
```bash
@agent-qa "Investigate test failures after merge and fix integration issues"
```

**Revert and Fix**:
```bash
git revert HEAD  # If needed
@agent-developer "Fix integration issues causing test failures"
```

## Linear Integration Issues

### Status Update Failures
**Symptom**: Cannot update Linear issue status
**Solutions**:

**Verify Linear CLI**:
```bash
linear auth  # Check authentication
```

**Manual Updates**:
- Use Linear web interface if CLI fails
- Verify issue exists and you have permissions

**Issue ID Mismatches**:
```bash
# Verify issue exists
linear issue SPI-620
```

### Branch Naming Issues
**Symptom**: Linear integration doesn't work
**Cause**: Incorrect branch naming pattern
**Solution**: Use correct pattern: `feat/spi-XXX-description`

## Build and Test Issues

### Test Failures
**Symptom**: Tests fail in development environment
**Solutions**:

**Check Test Environment**:
```bash
npm run test  # Run tests locally
```

**Agent Assistance**:
```bash
@agent-qa "Fix failing tests while maintaining functionality"
```

**Environment Issues**:
```bash
# Check environment variables
env | grep -i test
```

### Build Failures
**Symptom**: Build fails with compilation errors
**Solutions**:

**TypeScript Errors**:
```bash
npx tsc --noEmit  # Check TypeScript compilation
```

**Dependency Issues**:
```bash
rm -rf node_modules package-lock.json
npm install
```

**Agent Help**:
```bash
@agent-developer "Fix TypeScript compilation errors while maintaining type safety"
```

## Recovery Procedures

### Corrupted Worktree Recovery
```bash
# 1. Backup any uncommitted work
cp -r .worktrees/corrupted-feature /tmp/backup-feature

# 2. Force remove corrupted worktree
git worktree remove --force .worktrees/corrupted-feature

# 3. Recreate from branch (if branch exists)
git worktree add .worktrees/new-feature existing-branch

# 4. Or create fresh worktree
git worktree add .worktrees/new-feature -b feat/new-feature

# 5. Restore work from backup if needed
cp -r /tmp/backup-feature/* .worktrees/new-feature/
```

### Agent Chain Recovery
```bash
# If Task tool agent provides incorrect guidance
@agent-software-architect "Review the previous approach and suggest improvements"
@agent-developer "Implement the improved approach suggested by the architect"
```

### Git State Recovery
```bash
# If Git state becomes confused
git status  # Check current state
git worktree prune  # Clean up worktree references
git remote prune origin  # Clean up remote references

# Reset if needed
git reset --hard origin/main  # CAUTION: Loses local changes
```

## Emergency Procedures

### Complete Environment Reset
```bash
# CAUTION: This removes all worktrees and uncommitted work
git worktree list --porcelain | grep "worktree " | cut -d' ' -f2 | xargs -I {} git worktree remove --force {}
git worktree prune
rm -rf .worktrees/
mkdir -p .worktrees
```

### Parallel Agent Emergency Stop
```bash
# Kill all running Claude CLI processes
pkill -f "claude -p"

# Check background processes
jobs

# Kill specific background jobs
kill %1 %2 %3  # Adjust job numbers as needed
```

## Prevention Best Practices

### Before Development
- [ ] Verify Claude CLI installation
- [ ] Ensure prompt files are committed
- [ ] Check available disk space
- [ ] Start from latest main branch

### During Development
- [ ] Install dependencies in each worktree
- [ ] Sync with main regularly
- [ ] Test changes before committing
- [ ] Use descriptive commit messages

### After Development
- [ ] Run full test suite
- [ ] Create comprehensive PR description
- [ ] Clean up worktrees after merge
- [ ] Update Linear status

## Getting Help

### Diagnostic Commands
```bash
# System information
pwd && git branch --show-current && git status

# Worktree information
git worktree list && ls -la .worktrees/

# Agent environment
ls -la .claude/agents/

# Build environment
npm --version && node --version && npx tsc --version
```

### Escalation Path
1. Check this troubleshooting guide
2. Verify environment with diagnostic commands
3. Try recovery procedures
4. Seek help with complete diagnostic output
5. Create Linear issue for persistent problems

## Integration

This troubleshooting guide supports:
- [Agent Reference](agents.md) - Agent-specific issues
- [Worktree Operations](worktree-operations.md) - Worktree-specific problems
- [Decision Guide](decision-guide.md) - When troubleshooting workflow decisions
- All workflow documents - General development issues