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

"Today I'm excited to show you CycleTime CE - our project orchestration framework that extends Claude Code to manage complete software development lifecycles. What we thought was 60% complete is actually **90% operational and ready for use today**."

### 2. Show the Architecture (1 minute)

**Key Points:**
- Embedded H2 database for zero-config persistence
- MCP WebSocket server for Claude Code integration
- REST APIs for programmatic access
- Docker container for instant deployment

"CycleTime runs as a single container with an embedded database - no complex setup required."

### 3. Claude Code Connection (2 minutes)

**Demonstrate:**
1. Show MCP configuration in Claude Code
2. Connect to CycleTime server
3. Show successful initialization

**Script:**
"Watch how Claude Code connects directly to CycleTime through the MCP protocol. This gives us AI-assisted project management right in our development environment."

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
curl -X POST http://localhost:8080/api/projects \
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
- Test coverage reports
- Docker Hub deployment
- Performance metrics (<100ms responses)

"The system includes comprehensive testing, automated deployment, and production-grade infrastructure."

## Key Talking Points

### Discovery Story
"During our technical debt sprint, we discovered that what Linear showed as 60% complete was actually 90% done. Our engineering team delivered beyond expectations."

### Immediate Value
"This isn't a prototype - it's a working system you can use today for real project management through Claude Code."

### Architecture Benefits
- **Zero Configuration**: Embedded database, single container
- **AI-Native**: Built specifically for Claude Code integration
- **Enterprise Ready**: MIT licensed, self-hosted, secure

### Next Steps
"We're ready for early adopter feedback. Phase 2 will add observability and enhanced documentation based on user needs."

## Q&A Preparation

**Q: How does this compare to Jira/Linear?**
A: CycleTime is AI-native - designed specifically for Claude Code integration. It's not replacing traditional tools but augmenting AI-assisted development workflows.

**Q: What about data security?**
A: Fully self-hosted with local database. Your data never leaves your infrastructure.

**Q: Scalability?**
A: Current MVP handles teams of 10-20 developers. Phase 2 will add horizontal scaling.

**Q: Integration with existing tools?**
A: REST APIs enable integration. Future: webhooks and external tool connectors.

**Q: License concerns?**
A: MIT licensed - fully corporate-friendly, no GPL restrictions.

## Call to Action

"We're looking for 5-10 early adopters to pilot CycleTime CE in their development workflows. Who's interested in being first to experience AI-orchestrated project management?"

## Post-Demo

1. Share one-page capability summary
2. Provide Docker quick-start instructions
3. Schedule follow-up for interested parties
4. Gather specific feature requests
5. Set up Slack channel for early adopters

---

**Remember**: Focus on the **working system**, not future promises. This is **available today**.