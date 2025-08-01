---
name: multi-agent-status
description: Check status of manual multi-agent workflow across git worktrees
tools: Bash, Read, Glob, Grep, mcp__linear__list_issues, mcp__linear__get_issue
---

You are tasked with checking the status of a manual multi-agent workflow across git worktrees. This provides visibility into parallel development sessions.

## What This Command Checks

### 1. Active Git Worktrees
- List all worktrees in `.jcvd/worktrees/` directory
- Show which branches are being worked on
- Display last activity timestamps for each worktree

### 2. Git Status Across Worktrees
Run `git status` in each worktree to show:
- Modified and staged files  
- Untracked files
- Branch relationships and divergence
- Potential merge conflicts

### 3. Linear Issue Progress (if applicable)
- Check status of related Linear issues and subtasks
- Show which subtasks correspond to which worktrees
- Display completion progress

### 4. File Overlap Analysis
- Identify files modified in multiple worktrees
- Flag potential merge conflicts
- Suggest coordination needed

## Process:

### 1. Discover Active Worktrees
```bash
# List all git worktrees
git worktree list

# Check .jcvd/worktrees directory  
ls -la .jcvd/worktrees/

# Show last activity for each
find .jcvd/worktrees -name ".git" -exec dirname {} \; | while read dir; do
  echo "=== $dir ==="
  ls -la "$dir" | head -5
done
```

### 2. Check Git Status for Each Worktree
For each active worktree:
- Run `git status --porcelain` to get machine-readable status
- Check for uncommitted changes
- Show branch relationships with main
- Identify files at risk of conflicts

### 3. Analyze Coordination Needs
- Compare modified files across worktrees
- Identify shared files that multiple agents are working on
- Suggest communication or merge order

## Output Format:

```
🎯 Multi-Agent Workflow Status  
===============================

📁 Active Worktrees:
├── .jcvd/worktrees/developer-auth-123/ → feature/developer/auth-implementation
│   📊 Status: 3 modified, 1 staged, branch ahead by 2 commits
│   📝 Files: src/auth/login.ts, src/auth/types.ts, tests/auth/login.test.ts
│   🕐 Last Activity: 5 minutes ago
│
├── .jcvd/worktrees/qa-auth-123/ → feature/qa/auth-testing  
│   📊 Status: 2 modified, branch ahead by 1 commit
│   📝 Files: tests/integration/auth.test.ts, tests/e2e/auth.spec.ts
│   🕐 Last Activity: 10 minutes ago
│
└── .jcvd/worktrees/reviewer-auth-123/ → review/auth-final
    📊 Status: Clean working tree, tracking feature/developer/auth-implementation
    📝 Files: [reviewing] src/auth/**, tests/auth/**
    🕐 Last Activity: Just now

⚠️  Potential Conflicts:
├── src/auth/types.ts → Modified in developer-auth-123
├── tests/auth/login.test.ts → Modified in both developer-auth-123 and qa-auth-123
└── No blocking conflicts detected

📋 Linear Progress (AUTH-123):
├── ✅ AUTH-124: Login component implementation (developer)
├── 🔄 AUTH-125: Integration test development (qa) - 60% complete  
└── ⏳ AUTH-126: Security review (code-reviewer) - waiting

🔄 Coordination Suggestions:
├── Developer worktree ready for initial review
├── QA tests can proceed in parallel  
└── Schedule merge: developer → qa → reviewer → main
```

## Usage:
```bash
/project:multi-agent-status

# Or check specific task
/project:multi-agent-status AUTH-123
```

## Key Insights Provided:
1. **Visibility**: See what's happening across all parallel sessions
2. **Conflict Prevention**: Early warning of potential merge issues  
3. **Coordination**: Suggest when agents should sync up
4. **Progress Tracking**: Connect git activity to Linear issue progress
5. **Manual Management**: Help user decide when to merge, communicate, etc.

This command helps you **monitor and coordinate** multiple manual Claude Code sessions, providing the visibility needed for effective parallel development.