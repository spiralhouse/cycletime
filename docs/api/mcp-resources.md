# JCVD MCP Resources Specification

**Version:** 1.0  
**Date:** August 1, 2025  
**Authors:** Software Architect Agent, Claude Code

**Related Documents:**  
📋 [PRD.md](PRD.md) | 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) | 👤
[USER_EXPERIENCE.md](USER_EXPERIENCE.md) | 🚀 [ONBOARDING.md](ONBOARDING.md)

---

## Overview

This document specifies how JCVD integrates with Claude Code through the Model
Context Protocol (MCP). JCVD serves as a **data and context provider** that
exposes structured project information to Claude Code agents through MCP
Resources and Tools.

## Architecture Pattern

JCVD follows the **Context Provider Pattern** for Claude Code integration:

1. **Data Storage**: Embedded H2 database stores project data locally
2. **Context Provision**: MCP Resources expose structured project context
3. **Basic Operations**: MCP Tools provide CRUD operations for Claude Code
4. **Agent Enhancement**: Claude Code's existing agents receive project-specific
   context

## MCP Resources

### Project Context Resource

**Resource URI**: `jcvd://project/{projectId}/context`

**Purpose**: Provides comprehensive project context for Claude Code analysis and
task recommendations.

**Data Structure**:

```json
{
  "project": {
    "id": "proj_123",
    "name": "DevLog Application",
    "phase": "Development/Alpha",
    "created": "2025-08-01T10:00:00Z"
  },
  "statistics": {
    "totalIssues": 47,
    "completedIssues": 12,
    "inProgressIssues": 3,
    "unblockedIssues": 8
  },
  "currentMilestone": {
    "name": "Proof of Concept",
    "progress": 0.65,
    "dueDate": "2025-09-01T00:00:00Z"
  },
  "recentActivity": [
    {
      "issueId": "issue_456",
      "title": "User authentication system",
      "status": "completed",
      "completedAt": "2025-07-31T15:30:00Z"
    }
  ]
}
```

**Usage Example**:

```
User: "What should I work on next?"

Claude Code: [Accesses jcvd://project/proj_123/context]
"Based on your project context, I see you have 8 unblocked issues. The user authentication system was just completed, so I recommend working on the next logical task: implementing the content management core (issue #457), which is now unblocked."
```

### Unblocked Tasks Resource

**Resource URI**: `jcvd://project/{projectId}/tasks/unblocked`

**Purpose**: Lists all issues that have no blocking dependencies and are ready
for work.

**Data Structure**:

```json
{
  "unblockedTasks": [
    {
      "id": "issue_457",
      "title": "Implement content management core",
      "type": "story",
      "estimate": 5,
      "priority": 3,
      "description": "Create basic CRUD operations for content management",
      "parent": {
        "id": "epic_2",
        "title": "Content Management System"
      }
    },
    {
      "id": "issue_458",
      "title": "Add user profile page",
      "type": "story",
      "estimate": 3,
      "priority": 2
    }
  ],
  "metadata": {
    "totalUnblocked": 8,
    "byPriority": {
      "urgent": 0,
      "high": 2,
      "normal": 4,
      "low": 2
    }
  }
}
```

### Dependency Graph Resource

**Resource URI**: `jcvd://project/{projectId}/dependencies`

**Purpose**: Exposes issue relationships and dependencies for Claude Code's
analysis.

**Data Structure**:

```json
{
  "dependencies": [
    {
      "id": "dep_1",
      "blockerId": "issue_456",
      "blockedId": "issue_457",
      "type": "blocks",
      "status": "resolved"
    }
  ],
  "graph": {
    "nodes": [
      {
        "id": "issue_456",
        "title": "User authentication system",
        "status": "completed"
      },
      {
        "id": "issue_457",
        "title": "Content management core",
        "status": "unblocked"
      }
    ],
    "edges": [
      {
        "from": "issue_456",
        "to": "issue_457",
        "relationship": "blocks"
      }
    ]
  }
}
```

### Issue Hierarchy Resource

**Resource URI**: `jcvd://project/{projectId}/hierarchy`

**Purpose**: Provides Epic → Story → Subtask structure for project organization
understanding.

**Data Structure**:

```json
{
  "epics": [
    {
      "id": "epic_1",
      "title": "User Authentication System",
      "status": "completed",
      "stories": [
        {
          "id": "story_1",
          "title": "Login/logout functionality",
          "status": "completed",
          "subtasks": [
            {
              "id": "subtask_1",
              "title": "Create login form",
              "status": "completed"
            }
          ]
        }
      ]
    }
  ]
}
```

## MCP Tools

### Issue Management Tools

#### Create Issue Tool

**Tool Name**: `jcvd_create_issue`

**Purpose**: Creates new issues with proper hierarchy and validation.

**Parameters**:

```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "type": "epic | story | subtask",
  "parentId": "string (optional)",
  "estimate": "number (optional)",
  "priority": "1-4 (optional, default: 3)"
}
```

**Example Usage**:

```
Claude Code: [Uses jcvd_create_issue tool]
"I'll create a new story for implementing the search functionality:

Tool: jcvd_create_issue
Parameters: {
  "title": "Implement search functionality",
  "description": "Add search capability for user content",
  "type": "story",
  "parentId": "epic_3",
  "estimate": 5
}

Story created successfully! This is now unblocked and ready for development."
```

#### Update Issue Status Tool

**Tool Name**: `jcvd_update_issue_status`

**Purpose**: Updates issue status with dependency checking.

**Parameters**:

```json
{
  "issueId": "string (required)",
  "status": "backlog | todo | in_progress | done | canceled"
}
```

#### Add Dependency Tool

**Tool Name**: `jcvd_add_dependency`

**Purpose**: Creates blocking relationships between issues.

**Parameters**:

```json
{
  "blockerId": "string (required)",
  "blockedId": "string (required)"
}
```

### Project Bootstrap Tools

#### Initialize Project Tool

**Tool Name**: `jcvd_initialize_project`

**Purpose**: Sets up new project with basic structure.

**Parameters**:

```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "type": "web_app | api | mobile | library"
}
```

## Integration Patterns

### Context-Aware Task Recommendations

**Pattern**: Claude Code accesses project context to make intelligent task
suggestions.

**Flow**:

1. User asks "What should I work on next?"
2. Claude Code accesses `jcvd://project/{id}/context` Resource
3. Claude Code analyzes unblocked tasks, priorities, and recent progress
4. Claude Code provides contextual recommendation with reasoning

**Example Interaction**:

```
User: "What should I work on next?"

Claude Code: [Accesses JCVD resources automatically]
"Based on your project state, I recommend working on 'Implement search functionality' (Story #459). Here's why:

• It's unblocked (dependencies completed)
• High priority (2) and manageable scope (5 points)
• Builds on the content management work you just finished
• Critical for your Proof of Concept milestone

Would you like me to help you start implementing this story?"
```

### Cross-Session Project Recovery

**Pattern**: Claude Code sessions can seamlessly resume project work using
persisted context.

**Flow**:

1. User starts new Claude Code session
2. User mentions project work or asks for status
3. Claude Code accesses JCVD resources to recover full project context
4. User can immediately continue where they left off

### Dependency Management

**Pattern**: Claude Code uses dependency information to provide intelligent
guidance.

**Flow**:

1. User completes work on an issue
2. Claude Code uses `jcvd_update_issue_status` tool to mark completion
3. JCVD automatically identifies newly unblocked tasks
4. Claude Code suggests next steps based on unblocked dependencies

## Implementation Guidelines

### Resource Caching

- Resources should be cached for the duration of a Claude Code session
- Cache invalidation occurs when project data changes through MCP Tools
- Fresh data loaded on new session start

### Error Handling

- Resources return empty/default data rather than failing
- Tools provide clear error messages for validation failures
- Graceful degradation when database is unavailable

### Performance Considerations

- Resources limit data size to prevent context window overflow
- Large dependency graphs are summarized rather than returned in full
- Pagination support for issues lists in large projects

### Security

- Project data remains local to user's machine
- No external API calls required for core functionality
- MCP Resources respect file system permissions

## Development Workflow Integration

### TDD Support

JCVD supports Test-Driven Development through context provision:

1. **Context**: Exposes testing requirements and patterns through project
   context
2. **Guidance**: Claude Code agents use this context to suggest TDD approaches
3. **Tracking**: Issue status updates track TDD progression (Red → Green →
   Refactor)

### Documentation Maintenance

- Project context includes documentation status and gaps
- Claude Code can suggest documentation updates based on recent changes
- Template provision for common documentation needs

## Future Enhancements

### Provider Integration

When multiple providers are supported:

- Resources will aggregate data from active provider
- Provider-specific context will be available through extended resources
- Migration tools will be available through additional MCP Tools

### Advanced Context

Potential future resources:

- Code analysis and architecture insights
- Performance metrics and technical debt tracking
- Automated quality gate status and recommendations

This MCP integration approach ensures JCVD enhances Claude Code's existing
capabilities without replacing them, providing rich project context that enables
intelligent task orchestration and seamless development workflows.
