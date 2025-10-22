---
title: "Linear Troubleshooting Reference"
type: reference
domain: [development, linear, troubleshooting]
description: "Edge case troubleshooting and recovery procedures for Linear integration"
dependencies: [../guides/development/linear-integration.md]
related: [../guides/development/branching-strategy.md, worktree-operations.md]
keywords: [linear, troubleshooting, recovery, edge-cases, branch-conflicts]
last_updated: 2025-10-22
---

# Linear Troubleshooting Reference

Edge case troubleshooting scenarios and recovery procedures for Linear integration. For common issues, see [Linear Integration Guide](../guides/development/linear-integration.md#troubleshooting).

## Branch Naming Conflicts

### Duplicate Branch Names

**Symptom**: Branch `feat/spi-620-feature` already exists.

**Causes**:
- Previous work not cleaned up
- Multiple developers working on same issue
- Worktree still active

**Solution**:
```bash
# 1. Check existing branch status
git branch -a | grep spi-620

# 2. If previous work merged, delete old branch
git branch -d feat/spi-620-feature

# 3. If previous work abandoned, rename new branch
git checkout -b feat/spi-620-feature-v2

# 4. For worktree conflicts, check active worktrees
git worktree list
git worktree remove .worktrees/spi-620-feature
```

### Wrong Branch Name Format

**Symptom**: Branch created as `feat/SPI-620-feature` (uppercase) or `feat/620-feature` (missing spi-).

**Solution**:
```bash
# Rename branch locally
git branch -m feat/SPI-620-feature feat/spi-620-feature

# If already pushed, delete remote and push correct name
git push origin --delete feat/SPI-620-feature
git push -u origin feat/spi-620-feature
```

## Recovery Procedures

### Lost Linear Issue Link

**Symptom**: Working on feature but forgot which Linear issue it relates to.

**Solution**:
```bash
# 1. Extract from branch name
git branch --show-current
# feat/spi-620-documentation-standards → SPI-620

# 2. Search Linear by description
@agent-developer "Search Linear for issues about 'documentation standards'"

# 3. Check commit messages
git log --oneline --grep="SPI-"
```

### Multiple Issues in One Branch

**Symptom**: Accidentally worked on SPI-620 and SPI-621 in same branch.

**Solution**:
```bash
# 1. Create separate branch for each issue
git checkout -b feat/spi-620-documentation-standards
git cherry-pick <commits-for-620>

git checkout main
git checkout -b feat/spi-621-technology-decisions
git cherry-pick <commits-for-621>

# 2. Create separate PRs
cd $(git rev-parse --show-toplevel)
gh pr create --base main --head feat/spi-620-documentation-standards
gh pr create --base main --head feat/spi-621-technology-decisions

# 3. Update Linear issues separately
@agent-developer "Update Linear SPI-620 status to In Review"
@agent-developer "Update Linear SPI-621 status to In Review"
```

### Merged PR But Issue Not Closed

**Symptom**: PR merged successfully but Linear issue still shows "In Review".

**Solution**:
```bash
# 1. Verify PR used closing keyword
gh pr view 123 --json body | grep -i "resolves\|fixes\|closes"

# 2. If missing, manually close issue
@agent-developer "Update Linear SPI-620 status to Done"

# 3. Add merge commit reference
@agent-developer "Add comment to Linear SPI-620: 'Fixed in #123, merged in commit abc123'"
```

## Related Documentation

- **[Linear Integration Guide](../guides/development/linear-integration.md)** - Complete Linear workflow guide
- **[Branching Strategy](../guides/development/branching-strategy.md)** - Branch naming conventions
- **[Worktree Operations](worktree-operations.md)** - Worktree management commands
