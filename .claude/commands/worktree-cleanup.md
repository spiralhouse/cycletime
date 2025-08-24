---
name: worktree-cleanup
description: Guide cleanup of completed or abandoned git worktrees
tools: Bash, Read, Glob, LS
---

You are tasked with guiding the cleanup of git worktrees created for multi-agent
parallel development. This helps maintain a clean workspace and free up disk
space.

## Manual Worktree Cleanup Process

This command provides **analysis and git commands** for cleaning up worktrees,
but the user executes the cleanup commands manually for safety.

## Process:

### 1. Discover Worktrees to Clean

```bash
# List all git worktrees
git worktree list

# Check contents of .cycletime-ce/worktrees directory
find .cycletime-ce/worktrees -type d -name ".git" -exec dirname {} \;

# Show age and activity of each worktree
for dir in .cycletime-ce/worktrees/*/; do
  if [ -d "$dir" ]; then
    echo "=== $dir ==="
    echo "Created: $(stat -c %y "$dir" 2>/dev/null || stat -f %SB "$dir")"
    echo "Last modified: $(find "$dir" -type f -exec stat -c %y {} \; 2>/dev/null | sort -r | head -1)"
    cd "$dir" 2>/dev/null && git status --porcelain | wc -l | xargs echo "Uncommitted files:"
    cd - >/dev/null
  fi
done
```

### 2. Categorize Worktrees

#### **Safe to Clean** (Automatic candidates)

- Branch has been merged to main
- No uncommitted changes
- Associated Linear issues are "Done"
- Older than configured age threshold

#### **Requires Review** (Manual decision needed)

- Has uncommitted changes
- Branch not yet merged
- Associated Linear issues still active
- Recently active (within last hour)

#### **Keep** (Should not be cleaned)

- Currently being worked on
- Contains important unmerged work
- Reviewer worktrees with ongoing reviews

### 3. Safety Checks

Before suggesting cleanup:

```bash
# Check if branch is merged
git branch --merged main | grep "feature/developer/task-123"

# Check for uncommitted changes
cd .jcvd/worktrees/developer-task-123
git status --porcelain

# Check recent activity
git log -1 --format="%cr" HEAD
```

### 4. Cleanup Commands

#### **Safe Cleanup** (Merged branches)

```bash
# Remove worktree (safe - branch is merged)
git worktree remove .cycletime-ce/worktrees/developer-task-123

# Clean up merged branch
git branch -d feature/developer/task-123
```

#### **Force Cleanup** (Abandoned work)

```bash
# Backup first (optional but recommended)
cp -r .cycletime-ce/worktrees/abandoned-task-456 /tmp/backup-abandoned-task-456

# Force remove worktree
git worktree remove --force .cycletime-ce/worktrees/abandoned-task-456

# Delete unmerged branch (careful!)
git branch -D feature/abandoned/task-456
```

#### **Archive Instead of Delete**

```bash
# Create archive of unmerged work
mkdir -p .cycletime-ce/archives
tar -czf .cycletime-ce/archives/task-456-$(date +%Y%m%d).tar.gz .cycletime-ce/worktrees/abandoned-task-456

# Then remove worktree
git worktree remove .cycletime-ce/worktrees/abandoned-task-456
```

### 5. Batch Cleanup

For multiple worktrees:

```bash
# Clean all merged worktrees
for worktree in .cycletime-ce/worktrees/*/; do
  branch=$(cd "$worktree" && git branch --show-current)
  if git branch --merged main | grep -q "$branch"; then
    echo "Cleaning merged worktree: $worktree ($branch)"
    git worktree remove "$worktree"
    git branch -d "$branch"
  fi
done
```

## Usage:

```bash
# Analyze all worktrees for cleanup
/project:worktree-cleanup

# Check specific task worktrees
/project:worktree-cleanup AUTH-123

# Show cleanup commands only (dry run)
/project:worktree-cleanup --dry-run

# Focus on old/abandoned worktrees
/project:worktree-cleanup --aged-only
```

## Output Format:

~~~
🧹 Worktree Cleanup Analysis
============================

📊 Discovered Worktrees:
├── developer-auth-123 (feature/developer/auth-implementation)
│   ✅ Status: Merged to main, no uncommitted changes
│   🕐 Age: 2 days ago
│   🎯 Action: Safe to clean
│
├── qa-auth-123 (feature/qa/auth-testing)
│   ⚠️  Status: Not merged, has 3 uncommitted files
│   🕐 Age: 6 hours ago
│   🎯 Action: Review needed - backup first
│
└── reviewer-auth-456 (review/auth-final)
    🔄 Status: Active review in progress
    🕐 Age: 30 minutes ago
    🎯 Action: Keep - currently active

📋 Recommended Actions:

✅ Safe to Clean (1):

```bash
# Clean merged developer worktree
git worktree remove .cycletime-ce/worktrees/developer-auth-123
git branch -d feature/developer/auth-implementation
```

⚠️ Review Needed (1):

```bash
# Backup before cleaning qa worktree
cp -r .cycletime-ce/worktrees/qa-auth-123 /tmp/backup-qa-auth-123
git worktree remove --force .cycletime-ce/worktrees/qa-auth-123
# Branch feature/qa/auth-testing will be preserved
```

📊 Summary: 
├── Total worktrees: 3 
├── Safe to clean: 1  
├── Requires review: 1 
├── Keep active: 1 
└── Estimated space to free: 45.2 MB
~~~

## Safety Features:

1. **Never auto-executes git commands** - always shows commands for user to run
2. **Checks merge status** before suggesting cleanup
3. **Warns about uncommitted changes** and suggests backups
4. **Preserves branches** unless explicitly confirmed safe to delete
5. **Shows recent activity** to avoid cleaning active work

This provides **safe, guided cleanup** rather than automated deletion, ensuring no important work is lost.
```
