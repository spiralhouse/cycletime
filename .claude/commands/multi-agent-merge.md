---
name: multi-agent-merge
description: Coordinate merging of multi-agent parallel work
tools: Task, Bash, Read, Write, mcp__linear__update_issue, mcp__linear__create_comment
---

You are tasked with coordinating the merge process for multi-agent parallel work. This command will:

1. **Pre-Merge Validation**
   - Verify all agent tasks are completed
   - Check for merge conflicts between branches
   - Validate that all tests pass in each worktree
   - Ensure code quality standards are met

2. **Merge Strategy Execution**
   - Follow configured merge strategy (sequential/parallel/feature-branch)
   - Handle dependency ordering for sequential merges
   - Coordinate parallel merges for independent changes
   - Execute feature-branch workflow for review-based merges

3. **Conflict Resolution**
   - Identify and analyze merge conflicts
   - Delegate conflict resolution to appropriate agents
   - Coordinate resolution between conflicting agents
   - Validate resolved conflicts

4. **Quality Assurance**
   - Run comprehensive test suite on merged code
   - Perform final code review if configured
   - Validate integration between agent contributions
   - Check for regression issues

5. **Cleanup and Documentation**
   - Clean up temporary worktrees
   - Update Linear issues with completion status
   - Document merge decisions and resolutions
   - Archive agent communication logs

## Merge Strategies:

### Sequential Merge
- Merge agent branches one at a time based on dependency order
- Validate each merge before proceeding to next
- Highest safety, lowest parallel efficiency

### Parallel Merge  
- Merge independent branches simultaneously
- Faster for non-conflicting changes
- Requires careful conflict detection

### Feature Branch Workflow
- Create consolidated feature branch from agent work
- Run final review and validation
- Single merge to main branch
- Best for complex multi-agent features

## Process Flow:

```
1. Validation Phase
   ├── Check agent completion status
   ├── Run tests in each worktree  
   ├── Validate code quality
   └── Identify conflicts

2. Resolution Phase (if needed)
   ├── Analyze conflict patterns
   ├── Assign resolution to best agent
   ├── Coordinate between agents
   └── Validate resolutions

3. Merge Execution  
   ├── Execute merge strategy
   ├── Run integration tests
   ├── Validate final result
   └── Handle any issues

4. Cleanup Phase
   ├── Clean up worktrees
   ├── Update Linear issues
   ├── Document decisions
   └── Archive logs
```

## Usage:

```bash
# Merge with automatic strategy
/project:multi-agent-merge

# Force specific merge strategy  
/project:multi-agent-merge --strategy sequential

# Merge specific task only
/project:multi-agent-merge --task AUTH-123

# Dry run to check for issues
/project:multi-agent-merge --dry-run
```

## Safety Features:
- Automatic backup of current state before merge
- Rollback capability if merge fails
- Comprehensive logging of all merge operations
- Integration with Linear for audit trail