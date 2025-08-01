---
name: worktree-cleanup
description: Clean up abandoned or completed git worktrees
tools: Bash, Read, Glob, LS
---

You are tasked with cleaning up git worktrees created for multi-agent parallel execution. This command will:

1. **Identify Cleanup Candidates**
   - Find worktrees in `.jcvd/worktrees/` directory
   - Check last activity timestamps
   - Identify completed or abandoned worktrees
   - Show worktrees older than configured timeout

2. **Safety Validation**
   - Check if worktree has uncommitted changes
   - Verify no active agent processes using the worktree
   - Ensure associated Linear issues are completed
   - Confirm merged branches can be safely removed

3. **Cleanup Operations**
   - Remove git worktrees using `git worktree remove`
   - Delete associated branch if fully merged
   - Clean up worktree directories
   - Remove stale resource locks

4. **Reporting**
   - Show what was cleaned up
   - Report any issues or warnings
   - Update cleanup logs
   - Display storage space recovered

## Cleanup Categories:

### Completed Worktrees
- Associated tasks are marked as "Done" in Linear
- All changes have been merged to main branch
- No uncommitted changes in worktree
- Automatic cleanup (safe)

### Abandoned Worktrees  
- No activity for configured timeout period (default: 60 minutes)
- Agent process no longer running
- May have uncommitted changes
- Requires confirmation before cleanup

### Failed Worktrees
- Agent execution failed or was terminated
- May contain partial work or conflicts
- Requires manual review before cleanup
- Backup recommended

## Process:

```
1. Discovery Phase
   ├── Scan .jcvd/worktrees/ directory
   ├── Check last modification times
   ├── Query git worktree status
   └── Check Linear issue status

2. Analysis Phase
   ├── Categorize worktrees by status
   ├── Check for uncommitted changes
   ├── Verify merge status
   └── Identify cleanup risks

3. Cleanup Phase
   ├── Remove safe/completed worktrees
   ├── Prompt for abandoned worktrees
   ├── Archive failed worktrees
   └── Update configuration

4. Reporting Phase
   ├── Show cleanup summary
   ├── Report space recovered
   ├── Log cleanup actions
   └── Update metrics
```

## Usage:

```bash
# Clean up completed worktrees automatically
/project:worktree-cleanup

# Clean up all worktrees older than 2 hours
/project:worktree-cleanup --max-age 2h

# Dry run to see what would be cleaned
/project:worktree-cleanup --dry-run

# Force cleanup including abandoned worktrees
/project:worktree-cleanup --force

# Clean up specific agent worktrees
/project:worktree-cleanup --agent developer
```

## Safety Features:
- Never removes worktrees with uncommitted changes (unless --force)
- Creates backups of abandoned worktrees before removal
- Confirms before removing failed worktrees
- Maintains cleanup audit log
- Can restore recently cleaned worktrees if needed

## Output Example:

```
🧹 Worktree Cleanup Report
==========================

Discovered Worktrees:
├── agent-developer-1628xxx (completed) → Safe to remove ✅
├── agent-qa-1628xxx (abandoned, 3h old) → Requires confirmation ⚠️  
└── agent-reviewer-1628xxx (active) → Skip 🔄

Cleanup Actions:
├── ✅ Removed: agent-developer-1628xxx (AUTH-124 completed)
├── ⚠️  Backed up: agent-qa-1628xxx → .jcvd/backups/
└── 📊 Space recovered: 45.2 MB

Summary: 1 removed, 1 backed up, 1 active
```