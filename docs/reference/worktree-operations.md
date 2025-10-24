---
title: "Worktree Operations Reference"
type: reference
domain: [development, git]
description: "Complete command reference for Git worktree operations, enabling parallel development with multiple working directories from a single repository"
dependencies: []
related: [agents.md, decision-guide.md]
keywords: [worktree, git, parallel-development, commands, operations]
last_updated: 2025-10-21
---

# Worktree Operations Reference

Complete reference for Git worktree operations in CycleTime development.

## Overview

Worktrees enable multiple working directories from a single Git repository, allowing parallel development without conflicts.

**Standard Location**: `.worktrees/` (under project root - eliminates authorization prompts)

## Creation Commands

### Feature Worktree
```bash
git worktree add .worktrees/spi-XXX-feature-name -b feat/spi-XXX-feature-name
cd .worktrees/spi-XXX-feature-name
```

### Bug Fix Worktree
```bash
git worktree add .worktrees/spi-XXX-bug-fix -b fix/spi-XXX-bug-description
cd .worktrees/spi-XXX-bug-fix
```

### Documentation Worktree
```bash
git worktree add .worktrees/spi-XXX-docs -b docs/spi-XXX-documentation
cd .worktrees/spi-XXX-docs
```

### Test Worktree
```bash
git worktree add .worktrees/spi-XXX-tests -b test/spi-XXX-test-coverage
cd .worktrees/spi-XXX-tests
```

## Management Commands

### List All Worktrees
```bash
git worktree list
```

### Check Worktree Status
```bash
# From main directory
git worktree list --porcelain

# Check specific worktree
cd .worktrees/spi-XXX-feature-name
git status
```

### Install Dependencies in Worktree
```bash
cd .worktrees/spi-XXX-feature-name
npm install
```

### Batch Dependency Installation
```bash
for worktree in .worktrees/*/; do
    echo "Installing dependencies in $worktree"
    (cd "$worktree" && npm install)
done
```

## Cleanup Commands

### Safe Cleanup (Merged Branches)
```bash
# After PR is merged
git worktree remove .worktrees/spi-XXX-feature-name
git branch -d feat/spi-XXX-feature-name
```

### Force Cleanup (Abandoned Work)
```bash
# Backup first (optional)
cp -r .worktrees/spi-XXX-abandoned /tmp/backup-spi-XXX-abandoned

# Force remove
git worktree remove --force .worktrees/spi-XXX-abandoned
git branch -D feat/spi-XXX-abandoned
```

### Archive Before Cleanup
```bash
# Create archive of unmerged work
mkdir -p .worktrees/archives
tar -czf .worktrees/archives/spi-XXX-$(date +%Y%m%d).tar.gz .worktrees/spi-XXX-feature

# Then remove
git worktree remove .worktrees/spi-XXX-feature
```

### Batch Cleanup (Merged Branches)
```bash
for worktree in .worktrees/*/; do
    branch=$(cd "$worktree" && git branch --show-current)
    if git branch --merged main | grep -q "$branch"; then
        echo "Cleaning merged worktree: $worktree ($branch)"
        git worktree remove "$worktree"
        git branch -d "$branch"
    fi
done
```

## Directory Structure

```
cycletime/                     # Main project (main branch)
├── .git/                      # Shared Git database
├── src/                       # Main development area
├── .worktrees/                # Parallel development area
│   ├── spi-620-docs/          # Feature: Documentation
│   ├── spi-587-auth-fix/      # Bug fix: Authentication
│   ├── spi-612-api-redesign/  # Feature: API redesign
│   └── archives/              # Archived worktrees
└── docs/                      # Shared documentation
```

## Naming Conventions

### Worktree Directory Names
```bash
# Pattern: spi-{number}-{short-description}
.worktrees/spi-620-docs-standards/     # SPI-620: Documentation standardization
.worktrees/spi-587-auth-fix/           # SPI-587: Authentication bug fix
.worktrees/spi-612-api-redesign/       # SPI-612: API redesign
```

### Branch Names
```bash
# Pattern: {type}/spi-{number}-{description}
feat/spi-620-documentation-standards
fix/spi-587-auth-token-expiry
refactor/spi-445-repository-patterns
docs/spi-612-api-documentation
test/spi-598-integration-coverage
```

## Best Practices

### Before Creating Worktrees
- [ ] Start from latest main branch
- [ ] Use Linear issue ID in naming
- [ ] Verify parent directory exists
- [ ] Choose descriptive short names

### During Development
- [ ] Install dependencies in each worktree
- [ ] Keep worktree names consistent with Linear issues
- [ ] Use relative paths in scripts and configs
- [ ] Sync with main branch regularly

### After Completion
- [ ] Create PR from worktree
- [ ] Merge PR before cleanup
- [ ] Remove worktree promptly after merge
- [ ] Delete local branch after successful merge

## Common Issues

### Worktree Creation Fails
```bash
# Check available space
df -h .

# Verify Git repository
git status

# Check for existing worktree with same name
git worktree list | grep spi-XXX
```

### Permission Issues
```bash
# Verify ownership
ls -la .worktrees/

# Fix permissions if needed
chmod -R u+w .worktrees/spi-XXX-feature/
```

### Branch Conflicts
```bash
# Check existing branches
git branch -a | grep spi-XXX

# Use different branch name if conflict
git worktree add .worktrees/spi-XXX-feature-v2 -b feat/spi-XXX-feature-v2
```

### Cleanup Issues
```bash
# Force remove if worktree directory is corrupted
git worktree remove --force .worktrees/problematic-worktree

# Prune deleted worktrees from Git records
git worktree prune
```

## Emergency Cleanup

### Remove All Worktrees (Use with Caution)
```bash
# List all worktrees first
git worktree list

# Remove all except main (DANGEROUS)
git worktree list --porcelain | grep "worktree " | cut -d' ' -f2 | xargs -I {} git worktree remove --force {}

# Prune deleted worktrees
git worktree prune
```

### Recovery from Corruption
```bash
# If .git/worktrees directory is corrupted
rm -rf .git/worktrees/
git worktree prune

# Recreate worktrees from existing branches
git branch | grep feat/ | xargs -I {} git worktree add .worktrees/{} {}
```

## Integration with Workflows

This worktree reference integrates with:
- [Single Feature Workflow](../development/single-feature-workflow.md) - Single worktree usage
- [Parallel Development](../testing/parallel-development.md) - Multiple worktree coordination
- [Branching Strategy](../development/branching-strategy.md) - Branch naming conventions
- [Linear Integration](../development/linear-branch-integration.md) - Issue-to-branch mapping

## Quick Commands

```bash
# Create feature worktree
git worktree add .worktrees/spi-XXX-feature -b feat/spi-XXX-feature

# Setup and work
cd .worktrees/spi-XXX-feature && npm install

# Cleanup after merge
git worktree remove .worktrees/spi-XXX-feature && git branch -d feat/spi-XXX-feature

# List all worktrees
git worktree list

# Batch cleanup merged branches
for worktree in .worktrees/*/; do branch=$(cd "$worktree" && git branch --show-current); git branch --merged main | grep -q "$branch" && git worktree remove "$worktree" && git branch -d "$branch"; done
```