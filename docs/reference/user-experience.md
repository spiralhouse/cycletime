# CycleTime CE User Experience Design

**Version:** 1.0  
**Date:** July 30, 2025

**Related Documents:**  
📋 [PRD.md](PRD.md) | 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) | 👤
[USER_EXPERIENCE.md](USER_EXPERIENCE.md) | 🚀 [ONBOARDING.md](ONBOARDING.md)

---

## Overview

This document defines the complete user experience for CycleTime CE, from first
installation through daily development workflows. CycleTime CE prioritizes developer
control, simplicity, and professional project management without bureaucracy.

## First-Time Installation and Setup

### Discovery and Installation

Users discover CycleTime CE through:

- Claude Code MCP server marketplace/directory
- GitHub repository or documentation
- Developer community recommendations

Installation options (coming soon):

1. Via Claude Code: Browse MCP servers → Search "CycleTime CE" → Install
2. Manual: npm install -g @jcvd/mcp-server (package in development)
3. Docker: docker run -d jcvd/mcp-server (for advanced users)

### First Launch Experience

```
User: "I want to start a new project"

Claude: [CycleTime CE MCP server detected for first time]
"I see you have CycleTime CE installed! This is a comprehensive project orchestration
framework that will help you build software projects from start to finish.

CycleTime CE works completely offline by default using an embedded database, with no
external accounts or internet connection required. You also have the option
to integrate with cloud-based issue tracking systems like Linear.

Before we begin, I need to set up a few things:

1. **Issue Tracking**: How would you like to track your project tasks and progress?
   - **Local Database** (recommended): Works offline, full features, no accounts needed
   - **Linear Integration**: Cloud-based, team collaboration, requires Linear account

2. **Project Location**: Where would you like to create your project?
   CycleTime CE will set up a complete repository structure.

3. **Development Preferences**: Any preferred technologies, frameworks,
   or development methodologies I should know about?

Let's start with issue tracking setup - this is where we'll manage all your
project tasks, dependencies, and progress..."
```

## Issue Tracking Setup

### Initial Setup Dialog

```
Claude: "Let's set up your issue tracking system. CycleTime CE provides intelligent task
management, dependency tracking, and progress orchestration regardless of which
option you choose.

You have three setup options:

A) **Local Database (Embedded H2)** ⭐ **RECOMMENDED**
   ✅ Works completely offline with full feature parity
   ✅ No external accounts or internet connection required
   ✅ Complete dependency tracking and intelligent task selection
   ✅ Full cross-session continuity and project state management
   ✅ High performance with embedded H2 database
   ✅ Easy migration to cloud providers when ready

B) **Existing Linear Workspace**
   ✅ Integrates with your current projects and teams
   ✅ Uses your established workflow preferences
   ✅ Cloud-based collaboration and sharing
   ❗ Requires Linear API key with appropriate permissions

C) **New Linear Workspace**
   ✅ Optimized setup specifically for CycleTime CE workflows
   ✅ Free for personal use (up to 10 team members)
   ✅ Cloud-based collaboration and sharing
   ❗ Requires creating new Linear account

Which option would you prefer? **Option A (Local Database)** is recommended for
getting started - it provides the complete CycleTime CE experience with no setup friction,
and you can migrate to Linear or other providers anytime."
```

### Option A: Local Database (Embedded H2)

```
User: "I'll use Local Mode for now"

Claude: "Excellent choice! Local Mode provides full CycleTime CE functionality using an embedded H2 database - no compromises on features:

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
- Embedded H2 database stores all project data locally
- Linear-inspired data model optimized for seamless future migration
- All CycleTime CE features work identically to cloud providers
- Data stored securely in your project directory

I'll create a `.jcvd/` directory in your project to store:
- `database.mv.db` - Local H2 project database (encrypted)
- `config.json` - CycleTime CE configuration and preferences
- `backups/` - Automated database backups
- `exports/` - Data export files for migration

You can migrate to Linear, GitHub Issues, or other providers anytime while preserving all your project history and relationships.

Ready to proceed with Local Mode?"

User: "Yes"

Claude: "Local Mode activated! Initializing embedded database and project structure...

📁 Created .jcvd/
├── database.mv.db        # Encrypted H2 database with full schema
├── config.json          # CycleTime CE configuration
├── backups/              # Automated daily backups
│   └── 2025-07-30.db.backup
└── exports/              # Migration and backup exports

✅ Database initialized with optimized schema
✅ Dependency tracking system ready
✅ Task orchestration engine configured
✅ Cross-session state management active

Your local CycleTime CE instance is ready with full feature parity! Let's begin project setup."
```

### Option B: Existing Linear Workspace

```
User: "I want to use my existing Linear workspace"

Claude: "Perfect! To connect to your existing Linear workspace, I need:

1. **Linear API Key**:
   - Go to Linear Settings → API → Personal API Keys
   - Create a new key with 'read' and 'write' permissions
   - Name it 'CycleTime CE Integration' for easy identification

2. **Team ID** (optional but recommended):
   - If you want CycleTime CE to use a specific team
   - Find it in Linear URL: linear.app/[workspace]/team/[TEAM_ID]
   - Leave blank to use your default team

Please provide your API key when ready. I'll validate the connection and check permissions."

User: [Provides API key]

Claude: [CycleTime CE validates API key]

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

Claude: "Great choice! I'll guide you through creating a Linear workspace optimized for CycleTime CE.

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

For CycleTime CE optimization, I recommend:
- ✅ Enable 'Auto-assign issues to creator'
- ✅ Enable 'Issue auto-archiving' (after 30 days)
- ✅ Use 'Backlog' as default issue state
- ✅ Enable estimation (Fibonacci scale: 1,2,3,5,8,13)

Ready to continue? Type 'ready' when your Linear workspace is set up."

User: "ready"

Claude: "Perfect! Now I need your Linear API key to complete the integration:

1. In Linear, go to Settings → API → Personal API Keys
2. Click 'Create API Key'
3. Name: 'CycleTime CE Integration'
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

**Configuration Storage:** CycleTime CE stores provider configurations securely:

- Mac: ~/Library/Application Support/jcvd/provider-config.json
- Linux: ~/.config/jcvd/provider-config.json
- Windows: %APPDATA%/jcvd/provider-config.json

API keys and sensitive data encrypted using system keychain when available.

## Project Type Detection and Scoping

```
User: "I have my issue tracking set up, now I want to build a task management web app"

Claude: "Perfect! I'll start the CycleTime CE Project Bootstrap for your task management app.

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

Following the interview questions above, CycleTime CE conducts a structured
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

[CycleTime CE generates all artifacts]
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

Claude: [Calls CycleTime CE to analyze issue state, dependencies, priorities]
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

Claude: [CycleTime CE loads task context and requirements]
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

### Session Lifecycle Management

CycleTime CE automatically manages session state across Claude Code interactions with intelligent validation and persistence:

#### Session Creation
```
User: "Start working on my project"

Claude: [CycleTime CE creates new session with unique SessionKey]
"I've initialized a new development session for your project.

Session Details:
- Session ID: abc-123-def-456
- Project: DevLog
- Created: 2025-01-15 10:00 AM
- Expires: 2025-01-22 10:00 AM (7 days)
- Status: Active

Your session will persist across Claude Code restarts and maintain:
- Active issues you're working on
- Current workflow stage
- Project context and decisions
- Recent actions and progress"
```

#### Session Recovery with Validation
```
User: [Starts new Claude Code session after a break]
"Continue with my project work"

Claude: [CycleTime CE retrieves and validates existing session]
"Welcome back! I've restored your development session.

Session Status:
- Session Age: 2 days, 4 hours
- Last Activity: 2 hours ago
- Session Health: ✅ Valid (auto-repaired minor timestamp issue)
- Time Remaining: 4 days, 20 hours

Context Restored:
- Active Issues: PROJ-15 (User Authentication)
- Workflow Stage: Implementation
- Last Action: Completed unit tests for User model
- Issues Accessed: 5 in this session

Ready to continue where you left off?"
```

#### Session Expiration Handling
```
User: [Returns after 8 days]
"Continue working on the project"

Claude: [CycleTime CE detects expired session]
"Your previous session has expired (older than 7 days).

Previous Session Summary:
- Duration: 7 days
- Issues Completed: 3
- Total Active Time: 12 hours
- Last Known State: Working on PROJ-15

I'll create a fresh session and help you resume from your last known progress.

[Creates new session and loads project state]

New session initialized. Based on your git history and issue tracker:
- PROJ-15 was completed 
- Next recommended: PROJ-16 'API Endpoints'

Shall we continue with the API implementation?"
```

#### Session Metadata Tracking
```
User: "Show me my session information"

Claude: [CycleTime CE provides detailed session metadata]
"Current Session Information:

Session Details:
- Key: abc-123-def-456
- Project: DevLog
- Created: 2025-01-15 10:00 AM
- Last Activity: 5 minutes ago

Session Metrics:
- Update Count: 47 (context updates)
- Total Active Time: 6 hours, 30 minutes
- Issues Accessed: [PROJ-12, PROJ-15, PROJ-16]
- Workflow Transitions: 8

Session Context:
- Active Issues: ['PROJ-16', 'PROJ-17']
- Current Stage: 'implementation'
- Last Action: 'Updated API endpoint tests'
- Custom Context: {
    'preferredTestFramework': 'jest',
    'apiVersion': 'v2',
    'deploymentTarget': 'staging'
  }

Session Health:
- Validation Status: ✅ Valid
- Data Integrity: 100%
- Expires In: 5 days, 14 hours"
```

#### Session Corruption Recovery
```
User: "Continue with development"

Claude: [CycleTime CE detects and repairs corrupted session]
"I detected some issues with your session data and automatically repaired them:

Repairs Applied:
- ✅ Removed duplicate issue IDs from active list
- ✅ Fixed timestamp inconsistency (updatedAt was before createdAt)
- ✅ Sanitized context data (removed null bytes)
- ✅ Restored valid workflow stage

Your session is now healthy and we can continue. Your current context shows
you were working on PROJ-16 'API Endpoints' in the implementation stage."
```

#### Manual Session Management
```
User: "Clear my current session and start fresh"

Claude: [CycleTime CE provides session control]
"I'll clear your current session and create a fresh one.

Closing Session Summary:
- Duration: 3 days, 8 hours
- Issues Completed: 2
- Total Active Time: 8 hours
- Final State: PROJ-16 in progress

[Session cleared]

Fresh session created. Would you like to:
1. Continue from where you left off (PROJ-16)
2. Start a different task
3. Review project status first"
```

### Automatic Session Cleanup

CycleTime CE performs hourly background cleanup to maintain system health:

```
System: [Background cleanup process runs]

Cleanup Report (Automatic):
- Expired Sessions Removed: 3
- Orphaned Sessions Cleaned: 1 (no associated project)
- Corrupted Sessions Purged: 0
- Active Sessions Maintained: 2

Next cleanup scheduled: 1 hour
```

### Session Configuration

Sessions can be configured per project needs:

```
User: "Configure longer session timeout for this project"

Claude: [CycleTime CE adjusts session configuration]
"I've updated the session configuration for your project:

Session Configuration:
- Max Age: 14 days (increased from 7)
- Auto-Cleanup: Enabled
- Cleanup Interval: Every hour
- Max Sessions per Project: Unlimited
- Validation: Strict mode enabled

These settings will apply to all future sessions for this project."
```

## Cross-Session Continuity

```
User: [Starts new Claude Code session]
"Continue with my project work"

Claude: [CycleTime CE loads project state from issue tracker and docs]
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

CycleTime CE maintains comprehensive project context through:

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
