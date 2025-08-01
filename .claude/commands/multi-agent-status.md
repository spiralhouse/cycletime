---
name: multi-agent-status
description: Check status of multi-agent parallel execution
tools: Bash, Read, Glob, Grep, mcp__linear__list_issues
---

You are tasked with checking the status of multi-agent parallel execution. This command will:

1. **Check Active Worktrees**
   - List all active git worktrees in `.jcvd/worktrees/`
   - Show which agents are working on which branches
   - Display last activity timestamps

2. **Git Status Overview**
   - Show git status for each agent worktree
   - Identify modified files and staging status
   - Check for merge conflicts or issues

3. **Resource Lock Status**
   - Check for any active file locks between agents
   - Identify potential conflicts or blocked agents
   - Show resource usage patterns

4. **Task Progress**
   - Review Linear issues and subtask completion
   - Show which agent is working on what
   - Estimate completion progress

5. **Communication Status**
   - Check inter-agent message queues (if configured)
   - Show any coordination events or errors
   - Display agent synchronization status

## Output Format:

```
🎯 Multi-Agent Execution Status
================================

Active Worktrees:
├── agent-developer-1628xxx → feature/agent/developer/auth-implementation
│   Status: Working on login component (85% complete)
│   Files: src/auth/login.ts, tests/auth/login.test.ts
│   Last Activity: 2 minutes ago
│
├── agent-qa-1628xxx → feature/agent/qa/auth-testing  
│   Status: Writing integration tests (60% complete)
│   Files: tests/integration/auth.test.ts
│   Last Activity: 5 minutes ago
│
└── agent-code-reviewer-1628xxx → review/auth-system
    Status: Reviewing merged code (review-ready)
    Files: [reviewing] src/auth/**, tests/auth/**
    Last Activity: 1 minute ago

Resource Locks:
├── src/auth/types.ts → locked by developer (exclusive)
├── package.json → shared read access
└── No conflicts detected ✅

Task Progress:
├── AUTH-123: User Authentication System (75% complete)
│   ├── ✅ AUTH-124: Login component (developer) 
│   ├── 🔄 AUTH-125: Integration tests (qa)
│   └── ⏳ AUTH-126: Security review (code-reviewer)

Communication:
├── Message Queue: 3 pending coordination messages
├── Last Sync: 30 seconds ago
└── Agents: All responsive ✅
```

## Usage:
```
/project:multi-agent-status
```

Use this command to monitor ongoing parallel development and identify any issues or bottlenecks.