# JCVD User Experience Design

**Version:** 1.0  
**Date:** July 30, 2025

**Related Documents:**  
📋 [PRD.md](PRD.md) | 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) | 👤
[USER_EXPERIENCE.md](USER_EXPERIENCE.md) | 🚀 [ONBOARDING.md](ONBOARDING.md)

---

## Overview

This document defines the complete user experience for JCVD, from first
installation through daily development workflows. JCVD prioritizes developer
control, simplicity, and professional project management without bureaucracy.

## First-Time Installation and Setup

### Discovery and Installation

Users discover JCVD through:

- Claude Code MCP server marketplace/directory
- GitHub repository or documentation
- Developer community recommendations

Installation options (coming soon):

1. Via Claude Code: Browse MCP servers → Search "JCVD" → Install
2. Manual: npm install -g @jcvd/mcp-server (package in development)
3. Docker: docker run -d jcvd/mcp-server (for advanced users)

### First Launch Experience

```
User: "I want to start a new project"

Claude: [JCVD MCP server detected for first time]
"I see you have JCVD installed! This is a comprehensive project orchestration
framework that will help you build software projects from start to finish.

JCVD works completely offline by default using an embedded database, with no
external accounts or internet connection required. You also have the option
to integrate with cloud-based issue tracking systems like Linear.

Before we begin, I need to set up a few things:

1. **Issue Tracking**: How would you like to track your project tasks and progress?
   - **Local Database** (recommended): Works offline, full features, no accounts needed
   - **Linear Integration**: Cloud-based, team collaboration, requires Linear account

2. **Project Location**: Where would you like to create your project?
   JCVD will set up a complete repository structure.

3. **Development Preferences**: Any preferred technologies, frameworks,
   or development methodologies I should know about?

Let's start with issue tracking setup - this is where we'll manage all your
project tasks, dependencies, and progress..."
```

## Issue Tracking Setup

### Initial Setup Dialog

```
Claude: "Let's set up your issue tracking system. JCVD provides intelligent task
management, dependency tracking, and progress orchestration regardless of which
option you choose.

You have three setup options:

A) **Local Database (Embedded SQLite)** ⭐ **RECOMMENDED**
   ✅ Works completely offline with full feature parity
   ✅ No external accounts or internet connection required
   ✅ Complete dependency tracking and intelligent task selection
   ✅ Full cross-session continuity and project state management
   ✅ High performance with embedded SQLite database
   ✅ Easy migration to cloud providers when ready

B) **Existing Linear Workspace**
   ✅ Integrates with your current projects and teams
   ✅ Uses your established workflow preferences
   ✅ Cloud-based collaboration and sharing
   ❗ Requires Linear API key with appropriate permissions

C) **New Linear Workspace**
   ✅ Optimized setup specifically for JCVD workflows
   ✅ Free for personal use (up to 10 team members)
   ✅ Cloud-based collaboration and sharing
   ❗ Requires creating new Linear account

Which option would you prefer? **Option A (Local Database)** is recommended for
getting started - it provides the complete JCVD experience with no setup friction,
and you can migrate to Linear or other providers anytime."
```

### Option A: Local Database (Embedded SQLite)

```
User: "I'll use Local Mode for now"

Claude: "Excellent choice! Local Mode provides full JCVD functionality using an embedded SQLite database - no compromises on features:

**What you get in Local Mode:**
✅ Complete project orchestration with full dependency tracking
✅ Intelligent task selection and next-step recommendations
✅ Full Epic → Story → Subtask hierarchy management
✅ Cross-session continuity and project state persistence
✅ Velocity tracking, estimation, and progress analytics
✅ Complete offline operation - no internet required
✅ High performance with thousands of issues and complex dependency graphs
✅ Linear-inspired schema optimized for easy data migration when ready

**How it works:**
- Embedded SQLite database stores all project data locally
- Linear-inspired data model optimized for seamless future migration
- All JCVD features work identically to cloud providers
- Data stored securely in your project directory

I'll create a `.jcvd/` directory in your project to store:
- `database.sqlite` - Local project database (encrypted)
- `config.json` - JCVD configuration and preferences
- `backups/` - Automated database backups
- `exports/` - Data export files for migration

You can migrate to Linear, GitHub Issues, or other providers anytime while preserving all your project history and relationships.

Ready to proceed with Local Mode?"

User: "Yes"

Claude: "Local Mode activated! Initializing embedded database and project structure...

📁 Created .jcvd/
├── database.sqlite       # Encrypted SQLite database with full schema
├── config.json          # JCVD configuration
├── backups/              # Automated daily backups
│   └── 2025-07-30.db.backup
└── exports/              # Migration and backup exports

✅ Database initialized with optimized schema
✅ Dependency tracking system ready
✅ Task orchestration engine configured
✅ Cross-session state management active

Your local JCVD instance is ready with full feature parity! Let's begin project setup."
```

### Option B: Existing Linear Workspace

```
User: "I want to use my existing Linear workspace"

Claude: "Perfect! To connect to your existing Linear workspace, I need:

1. **Linear API Key**:
   - Go to Linear Settings → API → Personal API Keys
   - Create a new key with 'read' and 'write' permissions
   - Name it 'JCVD Integration' for easy identification

2. **Team ID** (optional but recommended):
   - If you want JCVD to use a specific team
   - Find it in Linear URL: linear.app/[workspace]/team/[TEAM_ID]
   - Leave blank to use your default team

Please provide your API key when ready. I'll validate the connection and check permissions."

User: [Provides API key]

Claude: [JCVD validates API key]

**Success Path:**
"✅ Linear connection successful!
   - Workspace: [Workspace Name]
   - Team: [Team Name]
   - Permissions: ✅ Read ✅ Write ✅ Create Issues

   I've verified I can create and manage issues in your workspace.
   Ready to proceed with project setup!"

**Error Paths:**

**Invalid API Key:**
"❌ API key validation failed. Please check:
   - Key was copied correctly (no extra spaces)
   - Key hasn't been revoked or expired
   - Key has 'read' and 'write' permissions

   Would you like to try again or create a new API key?"

**Insufficient Permissions:**
"⚠️ API key valid but missing required permissions:
   - Current: [list current permissions]
   - Required: read, write, create

   Please update your API key permissions in Linear Settings → API,
   or create a new key with full permissions."

**Network/Connection Issues:**
"❌ Unable to connect to Linear API. This might be due to:
   - Network connectivity issues
   - Linear service temporarily unavailable
   - Corporate firewall blocking Linear API

   Would you like to:
   1. Retry connection
   2. Switch to Local Database for now
   3. Try New Linear Workspace instead"
```

### Option C: New Linear Workspace

```
User: "I want to create a new Linear workspace"

Claude: "Great choice! I'll guide you through creating a Linear workspace optimized for JCVD.

**Step 1: Create Linear Account**
1. Visit: https://linear.app/signup
2. Sign up with your email (Google/GitHub signup also supported)
3. Verify your email address
4. Come back here when you've completed signup

**Step 2: Initial Workspace Setup**
After signup, Linear will prompt you to:
- Choose workspace name (suggestion: '[Your Name] Projects')
- Select team name (suggestion: 'Development')
- Choose workflow preferences

For JCVD optimization, I recommend:
- ✅ Enable 'Auto-assign issues to creator'
- ✅ Enable 'Issue auto-archiving' (after 30 days)
- ✅ Use 'Backlog' as default issue state
- ✅ Enable estimation (Fibonacci scale: 1,2,3,5,8,13)

Ready to continue? Type 'ready' when your Linear workspace is set up."

User: "ready"

Claude: "Perfect! Now I need your Linear API key to complete the integration:

1. In Linear, go to Settings → API → Personal API Keys
2. Click 'Create API Key'
3. Name: 'JCVD Integration'
4. Permissions: Select 'read' and 'write'
5. Copy the generated key

Paste your API key here when ready."

[Same validation flow as Option B continues...]
```

### Validation and Error Recovery

**Connection Testing Flow:**

1. Validate API key format
2. Test basic API connectivity
3. Check workspace permissions
4. Verify team access (if specified)
5. Test issue creation/update capabilities
6. Store validated configuration

**Error Recovery Strategies:**

- Invalid credentials → Clear guidance on key creation
- Network issues → Offer offline mode fallback
- Permission issues → Specific permission requirements
- Rate limiting → Graceful backoff with user notification
- Service unavailable → Option to continue in Local Mode

**Configuration Storage:** JCVD stores provider configurations securely:

- Mac: ~/Library/Application Support/jcvd/provider-config.json
- Linux: ~/.config/jcvd/provider-config.json
- Windows: %APPDATA%/jcvd/provider-config.json

API keys and sensitive data encrypted using system keychain when available.

## Project Type Detection and Scoping

```
User: "I have my issue tracking set up, now I want to build a task management web app"

Claude: "Perfect! I'll start the JCVD Project Bootstrap for your task management app.

Let me ask a few key questions to understand your project:

**Project Basics:**
1. What's the main problem your app will solve?
2. Who are your target users?
3. What's your success criteria (how will you know it's working)?

**Technical Scope:**
4. Do you want a simple single-page app or a more complex system?
5. Any specific technologies you want to use or avoid?
6. Will you need user authentication, data persistence, etc.?

**Timeline and Constraints:**
7. Is this a personal project, client work, or startup idea?
8. Any deadlines or budget constraints?
9. Just you working on it, or will there be a team?

Let's start with #1 - what problem will your task management app solve?"
```

## Interactive Requirements Gathering

Following the interview questions above, JCVD conducts a structured
conversation:

```
Claude: "Great answers! Let me summarize what I've learned:

**Your Project: DevLog**
- Problem: Help developers track learning progress, code snippets, and project insights
- Users: Individual software engineers and developers
- Success: Users can organize learning, share knowledge, and track skill development
- Scope: Web application with authentication, markdown editor, search, and tagging
- Tech: You're open to suggestions but prefer TypeScript/React
- Timeline: Personal side project, flexible timeline, just you developing
- Approach: You want to follow TDD practices

Does this summary look accurate? Any corrections or additions?"

User: "That's perfect!"

Claude: "Excellent! Now I'll create your complete project structure:

1. **Generating PRD**: Creating comprehensive requirements document
2. **Setting up repository**: Full project structure with TypeScript, testing, etc.
3. **Creating project issues**: Epic/Story/Subtask breakdown
4. **Planning first sprint**: Tasks to get you to a working proof-of-concept

This will take about 2-3 minutes..."

[JCVD generates all artifacts]
```

## Project Structure Creation

```
Claude: "🎉 Your DevLog project is ready! Here's what I've created:

**Repository Structure:**
devlog/
├── docs/
│   ├── PRD.md                  # Complete requirements document
│   ├── ARCHITECTURE.md         # System design and architecture
│   ├── API_SPEC.md            # API documentation
│   └── DEPLOYMENT.md          # Deployment and infrastructure
├── src/
│   ├── components/            # React components
│   ├── services/              # Business logic and API calls
│   ├── utils/                 # Utility functions
│   └── types/                 # TypeScript type definitions
├── tests/
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── e2e/                   # End-to-end tests
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── jest.config.js             # Testing configuration
└── README.md                  # Getting started guide

**Project Issues: "DevLog"**
- **Epic 1**: User Authentication System (5 stories, 23 points)
- **Epic 2**: Content Management Core (4 stories, 18 points)
- **Epic 3**: Search & Tagging System (6 stories, 34 points)
- **Epic 4**: Knowledge Sharing Features (3 stories, 21 points)

**Current Milestone**: "Proof of Concept" (Sprint 1-2, ~4 weeks)
**Next Task**: TASK-1 "Set up development environment and basic project structure"

Everything is ready! Would you like to start with the first task, or do you want
to review the PRD and architecture documents first?"
```

## Transition to Development Phase

```
User: "Let's start with the first task!"

Claude: "Perfect! Let me check your project backlog for the optimal next step...

**Current Task: TASK-1 "Development Environment Setup"**
- **Story**: "As a developer, I want a fully configured development environment"
- **Subtask**: "Initialize TypeScript project with testing framework"
- **Estimated effort**: 2 points (~2-3 hours)
- **Dependencies**: None (ready to start!)

This task involves:
1. Setting up package.json with all necessary dependencies
2. Configuring TypeScript, Jest, and ESLint
3. Creating basic project structure
4. Writing your first test to verify everything works

Since you want to follow TDD, we'll start by writing a test for the basic
project setup, then implement the configuration to make it pass.

Ready to begin? I'll guide you through each step!"

[Development phase begins with structured TDD workflow]
```

## Ongoing Development Experience

### Daily Workflow

```
User: "What should I work on next?"

Claude: [Calls JCVD to analyze issue state, dependencies, priorities]
"Based on your project backlog and current progress, I recommend working on
Story PROJ-15: 'User Authentication System'.

This story is ready to start because:
- All prerequisite stories are complete
- Database schema story (PROJ-12) was finished yesterday
- It's on the critical path for your Sprint 2 milestone
- Estimated at 5 points, fits well in your remaining capacity

Shall we begin with the first subtask: 'Create User Model with Tests'?"
```

### Task Progression and Context Loading

```
User: "Yes, let's start the User Model task"

Claude: [JCVD loads task context and requirements]
"Perfect! I've loaded the context for Story PROJ-15 'User Authentication System'.

**Current Subtask: PROJ-15-1 'Create User Model with Tests'**

Based on your PRD and architecture docs, this task involves:
1. **Design User data model** following your TypeScript patterns
2. **Write comprehensive unit tests** for user validation, creation, and methods
3. **Implement User class** to pass all tests
4. **Add database integration** using your established ORM patterns

I can see from your existing code that you're using:
- TypeScript with strict typing
- Jest for testing with custom matchers
- Prisma ORM for database operations
- Your established project patterns for error handling

Ready to start with the test design? I'll help you create comprehensive tests
that cover all the user authentication requirements from your PRD."
```

## Cross-Session Continuity

```
User: [Starts new Claude Code session]
"Continue with my project work"

Claude: [JCVD loads project state from issue tracker and docs]
"Welcome back! You're working on the DevLog project.

Current status:
- Phase: Development (Sprint 2)
- Active Story: PROJ-15 'User Authentication System'
- Last completed: User model tests (all passing)
- Next up: Authentication middleware implementation

I can see from your git history that you completed the User model yesterday
with 100% test coverage. The tests are passing and the implementation follows
your established patterns.

**Next Recommended Task: PROJ-15-2 'Authentication Middleware'**
- Estimated: 3 points
- Dependencies: ✅ User model complete
- Context: Express.js middleware for JWT validation

Ready to continue with the middleware setup?"
```

### Context Recovery Details

JCVD maintains comprehensive project context through:

**Issue Tracking State**

- Current active stories and subtasks
- Completed work and remaining estimates
- Dependency relationships and blocked items
- Milestone progress and sprint planning

**Repository Analysis**

- Recent git commits and branch state
- Test results and coverage reports
- Documentation updates and changes
- Code patterns and architectural consistency

**Session Memory**

- Previous conversations and decisions
- Established preferences and patterns
- Custom configurations and tool choices
- Developer workflow and methodology preferences

**Intelligent Context Loading**

- Analyzes current repository state vs issue tracking
- Identifies discrepancies and suggests updates
- Loads relevant documentation and specifications
- Prepares contextual information for next task

This comprehensive approach ensures seamless continuation across sessions while
maintaining full project context and development velocity.
