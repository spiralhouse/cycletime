---
name: multi-agent-start
description: Guide setup of manual multi-agent workflow with git worktrees
tools:
  Task, Bash, Read, Write, TodoWrite, mcp__linear__get_issue,
  mcp__linear__list_issues, mcp__linear__update_issue
---

You are tasked with helping set up a manual multi-agent workflow using git
worktrees. This command guides the user through coordinating multiple Claude
Code sessions working on separate branches.

## How Multi-Agent Workflows Actually Work

Claude Code agents are **sub-agents within a single session** using the Task
tool, or **multiple manual Claude Code sessions** using git worktrees. This
command helps with the latter approach.

## Process:

### 1. Task Analysis & Planning

- Analyze the provided requirements or Linear issue
- Break down into parallelizable subtasks suitable for different agent types
- Identify which tasks can be worked on independently
- Plan branch strategy and merge coordination

### 2. Git Worktree Setup

Set up isolated workspaces for parallel development:

```bash
# Create base directory for worktrees
mkdir -p .jcvd/worktrees

# Create worktrees for different agents
git worktree add .jcvd/worktrees/developer-{task-id} -b feature/developer/{task-type}-{task-id}
git worktree add .jcvd/worktrees/qa-{task-id} -b feature/qa/tests-{task-id}
git worktree add .jcvd/worktrees/reviewer-{task-id} -b review/{task-id}
```

### 3. Agent Responsibility Assignment

Guide which agent types work on which aspects:

- **developer**: Implementation, core feature development
- **qa**: Test development, validation, quality assurance
- **code-reviewer**: Code review, quality checks, final integration
- **tech-lead**: Architecture coordination, dependency management
- **software-architect**: System design, technical planning
- **product-manager**: Requirements clarification, documentation

### 4. Manual Session Coordination

Provide guidance for running multiple Claude Code sessions:

1. **Session 1**: `cd .jcvd/worktrees/developer-{task-id} && claude`
2. **Session 2**: `cd .jcvd/worktrees/qa-{task-id} && claude`
3. **Session 3**: `cd .jcvd/worktrees/reviewer-{task-id} && claude`

### 5. Coordination Strategy

- **File Isolation**: Define which files each agent should focus on
- **Merge Order**: Plan the sequence for merging branches
- **Communication**: Suggest checkpoints for manual coordination
- **Conflict Prevention**: Identify potential merge conflicts early

## Usage:

Provide either:

1. A Linear issue ID to analyze and break down
2. A detailed task description with requirements
3. A high-level feature request

## Example:

```
/project:multi-agent-start "Implement user authentication system - Linear issue AUTH-123"
```

## What This Command Does:

1. **Analyzes the task** and suggests breakdown into parallel work streams
2. **Provides git commands** for setting up worktrees
3. **Creates Linear subtasks** if working with Linear issues
4. **Suggests file ownership** patterns to prevent conflicts
5. **Provides coordination guidance** for managing multiple sessions

## What This Command Does NOT Do:

- Automatically start multiple Claude Code processes
- Manage inter-agent communication through code
- Automatically resolve merge conflicts
- Replace human judgment in coordination

The goal is to help you **manually orchestrate** multiple Claude Code sessions
effectively, not to automate the coordination through custom software.
