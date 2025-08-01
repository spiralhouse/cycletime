---
name: multi-agent-start
description: Start multi-agent parallel execution on separate branches
tools: Task, Bash, Read, Write, TodoWrite, mcp__linear__get_issue, mcp__linear__list_issues, mcp__linear__update_issue
---

You are tasked with starting a multi-agent parallel execution workflow. This command will:

1. **Analyze the request** to understand what tasks need to be parallelized
2. **Create task breakdown** for multiple agents to work on simultaneously  
3. **Set up git worktrees** for isolated agent workspaces
4. **Coordinate agent assignments** based on task types and agent capabilities
5. **Start parallel execution** using Claude Code's Task tool

## Process:

### 1. Task Analysis
- Read the provided requirements or Linear issue
- Break down into parallelizable subtasks
- Identify dependencies and resource conflicts
- Estimate task complexity and duration

### 2. Agent Assignment Strategy
Based on task types, assign to appropriate agents:
- **developer**: Implementation tasks, coding, refactoring
- **qa**: Testing, validation, quality assurance  
- **code-reviewer**: Code review, quality checks, standards compliance
- **tech-lead**: Architecture decisions, dependency coordination
- **software-architect**: System design, technical planning
- **product-manager**: Requirements clarification, stakeholder communication

### 3. Branch Setup
Create feature branches following the pattern:
- `feature/agent/{agent-type}/{task-type}-{task-id}`
- Set up git worktrees in `.jcvd/worktrees/agent-{agent}-{timestamp}`
- Sync shared configuration files (package.json, tsconfig.json, CLAUDE.md)

### 4. Parallel Execution
- Use Task tool to delegate specific subtasks to appropriate agents
- Provide each agent with:
  - Clear task description and acceptance criteria
  - File patterns they can modify
  - Dependencies and coordination requirements
  - Branch-specific workspace path

### 5. Coordination
- Set up resource locks for shared files
- Enable inter-agent communication for dependencies
- Monitor progress and handle conflicts
- Prepare for eventual merge coordination

## Usage:
Provide either:
1. A Linear issue ID to break down and parallelize
2. A detailed task description with specific requirements  
3. A list of subtasks to distribute among agents

## Example:
```
/project:multi-agent-start "Implement user authentication system - Linear issue AUTH-123"
```

The command will create a comprehensive parallel execution plan and start multiple agents working simultaneously on separate branches.