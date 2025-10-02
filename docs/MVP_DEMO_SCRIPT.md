# CycleTime CE - MVP Demo Script

**Duration**: 10-15 minutes | **Audience**: Stakeholders & Early Adopters

## Pre-Demo Setup

```bash
# Ensure Docker is running
docker pull ghcr.io/spiralhouse/cycletime:latest
docker run -d -p 8080:8080 --name cycletime-demo ghcr.io/spiralhouse/cycletime:latest

# Verify health
curl http://localhost:8080/health
```

## Demo Flow

### 1. Opening Statement (30 seconds)

"This demo shows CycleTime CE - a project orchestration framework that extends Claude Code to manage software development lifecycles. The demo will cover current implementation status and core capabilities based on completed features."

### 2. Show the Architecture (1 minute)

**Key Points:**
- Embedded H2 database for data persistence
- MCP WebSocket server for Claude Code integration
- REST APIs for programmatic access
- Docker container deployment available

"CycleTime runs as a single container with an embedded database for straightforward deployment."

### 3. Claude Code Connection (2 minutes)

**Demonstrate:**
1. Show MCP configuration in Claude Code
2. Connect to CycleTime server
3. Show successful initialization

**Script:**
"Claude Code connects to CycleTime through the MCP protocol, providing AI-assisted project management integration."

### 4. Project Creation Flow (3 minutes)

**Via Claude Code:**
```
"Create a new project called 'E-Commerce Platform' with description 'Next-gen shopping experience'"
```

**Show:**
- Project created instantly
- Persistent ID generated
- State maintained in database

**Via REST API (optional):**
```bash
curl -X POST http://localhost:8080/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Mobile App", "description": "iOS/Android app"}'
```

### 5. Issue Hierarchy Management (3 minutes)

**Create Epic via Claude:**
"Create an epic 'User Authentication' for the E-Commerce Platform project"

**Create Story:**
"Add a story 'JWT Token Implementation' under the User Authentication epic"

**Create Subtasks:**
"Add subtasks: 'Design token schema' (3 points), 'Implement auth middleware' (5 points), 'Add refresh token logic' (3 points)"

**Demonstrate:**
- Hierarchy enforcement (Epic → Story → Subtask)
- Estimation rules (only subtasks have points)
- Automatic rollup calculations

### 6. Workflow Management (2 minutes)

**Show Workflow Creation:**
"Create a standard development workflow with statuses: Backlog, In Progress, Review, Done"

**Demonstrate Transitions:**
"Move the 'Design token schema' subtask to In Progress"

**Key Points:**
- Custom workflows per project
- Validated status transitions
- Template-based creation

### 7. Cross-Session Persistence (2 minutes)

**Disconnect and Reconnect:**
1. Disconnect Claude Code
2. Show data persists via REST API
3. Reconnect Claude Code
4. Demonstrate all state maintained

"Notice how all our project data persists between sessions. This is crucial for real development workflows."

### 8. Production Readiness (1 minute)

**Show:**
- CI/CD pipeline (GitHub Actions)
- Test coverage reports (96.91% domain coverage)
- Docker Hub deployment
- Performance metrics (< 1ms session operations, measured from SPI-346)

"The system includes comprehensive testing with measured performance characteristics and automated deployment."

## Key Talking Points

### Current Implementation Status
"We've completed the foundational session management system (SPI-346) with measured performance characteristics: < 1ms session operations, 96.91% domain coverage, and comprehensive testing (60 tests). MCP integration and project bootstrap features are currently in progress."

### Core Capabilities
"The system provides session management, cross-session persistence, and H2 database integration. Claude Code integration through MCP protocol is under active development."

### Architecture Benefits
- **Embedded Database**: H2 database with single container deployment
- **Claude Code Integration**: MCP protocol support for AI-assisted development
- **Open Source**: MIT licensed, self-hosted deployment model

### Next Steps
"Current development focuses on completing MCP integration and project bootstrap features. Future phases will add enhanced context provision, dependency tracking, and multi-provider support."

## Q&A Preparation

**Q: How does this compare to Jira/Linear?**
A: CycleTime is AI-native - designed specifically for Claude Code integration. It's not replacing traditional tools but augmenting AI-assisted development workflows.

**Q: What about data security?**
A: Fully self-hosted with local database. Your data never leaves your infrastructure.

**Q: Scalability?**
A: Current implementation focuses on solo developers and small teams. Future phases will address horizontal scaling requirements based on adoption patterns.

**Q: Integration with existing tools?**
A: REST APIs enable integration. Future: webhooks and external tool connectors.

**Q: License concerns?**
A: MIT licensed - fully corporate-friendly, no GPL restrictions.

## Next Steps

Based on current implementation status, we're focusing on:
1. Completing MCP Resource integration (SPI-290)
2. Implementing Project Bootstrap functionality (SPI-354)
3. Validating performance and integration patterns
4. Gathering feedback on core capabilities for future development priorities

## Post-Demo

1. Share capability summary with current implementation status
2. Provide Docker quick-start instructions for local testing
3. Review completed features and roadmap
4. Gather feedback on core capabilities and feature priorities
5. Discuss integration approaches and use cases

---

**Focus**: Demonstrate completed features (session management, H2 integration, testing) and discuss in-progress work (MCP integration, project bootstrap) with realistic timelines.