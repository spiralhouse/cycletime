---
name: multi-agent-merge
description: Guide manual coordination of multi-agent work merging
tools: Task, Bash, Read, Write, mcp__linear__update_issue, mcp__linear__create_comment
---

You are tasked with guiding the manual coordination of merging multi-agent work from separate git worktrees. This helps orchestrate the integration of parallel development efforts.

## Manual Merge Coordination Process

This command provides **guidance and git commands** for merging work from multiple worktrees, but the user executes the commands manually.

## Process:

### 1. Pre-Merge Validation
Check readiness of each worktree before merging:

```bash
# Validate each worktree is ready
for worktree in .jcvd/worktrees/*/; do
  echo "=== Checking $worktree ==="
  cd "$worktree"
  
  # Check for uncommitted changes
  if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Uncommitted changes in $worktree"
  fi
  
  # Check if tests pass
  npm test 2>/dev/null || echo "⚠️  Tests may be failing in $worktree"
  
  cd - >/dev/null
done
```

### 2. Conflict Detection
Identify potential merge conflicts before attempting merges:

```bash
# Check for overlapping file modifications
git log --oneline --name-only feature/developer/task-123..HEAD > /tmp/dev-files
git log --oneline --name-only feature/qa/task-123..HEAD > /tmp/qa-files

# Find common files (potential conflicts)
comm -12 <(sort /tmp/dev-files) <(sort /tmp/qa-files)
```

### 3. Suggested Merge Strategy

Based on the analysis, suggest one of these approaches:

#### **Sequential Merge** (Safest)
```bash
# 1. Merge developer work first
git checkout main
git merge feature/developer/task-123

# 2. Run tests to validate
npm test

# 3. Merge QA work  
git merge feature/qa/task-123

# 4. Final validation
npm test && npm run lint
```

#### **Feature Branch Integration** (Most Control)
```bash
# 1. Create integration branch
git checkout -b integration/task-123

# 2. Merge each feature branch
git merge feature/developer/task-123
git merge feature/qa/task-123  

# 3. Resolve conflicts and test
# ... manual conflict resolution ...
npm test && npm run lint

# 4. Merge to main when ready
git checkout main
git merge integration/task-123
```

#### **Cherry-Pick Selective** (Complex Cases)
```bash
# Pick specific commits from each branch
git checkout main
git cherry-pick <commit-hash-from-dev>
git cherry-pick <commit-hash-from-qa>
```

### 4. Conflict Resolution Guidance

When conflicts occur:

1. **Analyze the conflict context**:
   ```bash
   git status
   git diff --name-only --diff-filter=U
   ```

2. **Use appropriate resolution strategy**:
   - **Code conflicts**: Delegate to code-reviewer agent
   - **Test conflicts**: Usually safe to take both versions
   - **Config conflicts**: Require careful manual review

3. **Validate resolution**:
   ```bash
   npm test
   npm run lint  
   npm run type-check
   ```

### 5. Post-Merge Cleanup

After successful merge:

```bash
# Clean up worktrees
git worktree remove .jcvd/worktrees/developer-task-123
git worktree remove .jcvd/worktrees/qa-task-123

# Delete merged branches
git branch -d feature/developer/task-123
git branch -d feature/qa/task-123

# Update Linear issues if applicable
# [Handled through Linear MCP integration]
```

## Usage:

```bash
# Guide merge of specific task
/project:multi-agent-merge AUTH-123

# General merge guidance  
/project:multi-agent-merge

# Check merge readiness only
/project:multi-agent-merge --check-only
```

## What This Command Does:

1. **Analyzes current state** of all worktrees for a task
2. **Detects potential conflicts** before attempting merges
3. **Suggests merge strategy** based on the complexity and conflicts
4. **Provides git commands** for executing the merge
5. **Updates Linear issues** with merge status
6. **Guides cleanup** of temporary branches and worktrees

## What This Command Does NOT Do:

- Automatically execute git merge commands
- Resolve merge conflicts automatically  
- Make decisions about which code to keep
- Replace human judgment in complex conflicts

## Output Format:

```
🔄 Multi-Agent Merge Coordination
=================================

📊 Merge Readiness Check:
├── ✅ developer-auth-123: Ready (all committed, tests pass)
├── ✅ qa-auth-123: Ready (all committed, tests pass)  
└── ⚠️  reviewer-auth-123: Has uncommitted changes

🔍 Conflict Analysis:
├── src/auth/types.ts: Modified in developer branch only ✅
├── tests/auth/login.test.ts: Modified in both branches ⚠️
└── package.json: No conflicts detected ✅

📋 Recommended Strategy: Sequential Merge
├── 1. Merge feature/developer/auth-implementation → main
├── 2. Resolve test conflicts in tests/auth/login.test.ts  
├── 3. Merge feature/qa/auth-testing → main
└── 4. Final validation and cleanup

🛠️ Commands to Execute:
```bash
git checkout main
git merge feature/developer/auth-implementation
# Resolve any conflicts, then:
git merge feature/qa/auth-testing  
npm test && git worktree remove .jcvd/worktrees/developer-auth-123
```

🎯 Linear Updates:
├── AUTH-123: Will be marked as "In Review" after merge
└── Subtasks: Will be marked as "Done"
```

This provides **human-guided coordination** rather than automated merging, ensuring safety and control over the integration process.