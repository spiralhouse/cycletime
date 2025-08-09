---
name: start-new-story
description: Iterates over subtasks of a Linear issue, delegating work to subagents
tools:
  Task, Bash, Read, Write, TodoWrite, mcp__linear__get_issue,
  mcp__linear__list_issues, mcp__linear__update_issue
---



Okay, let's work on SPI-354 which is a child of SPI-290. First, we need to ensure main is in sync with origin and create a feature branch. Then let's read     │
│   the @docs/ARCHITECTURE.md, @docs/LIMITATIONS.md, @docs/MCP_RESOURCES.md for context and iterate over each subtask of SPI-354. For each subtask let's delegate  │
│   the work to a subagent. The subagent should move the subtask's status to "In Progress". If coding, let's practice TDD (Red-green-refactor) and commit the      │
│   changes before moving on to the next subtask. Once done with coding, let's run all of our tests and fix any issues. Once all issues are fixed, we can move     


