# CycleTime CE - MVP Demo Script

**Duration**: 10-15 minutes | **Audience**: Stakeholders & Early Adopters

## Pre-Demo Setup

### 1. Start CycleTime Server

```bash
# Ensure Docker is running
docker pull ghcr.io/spiralhouse/cycletime:latest
docker run -d -p 8080:8080 --name cycletime-demo ghcr.io/spiralhouse/cycletime:latest

# Verify health
curl http://localhost:8080/health
```

> **Note**: The CycleTime repository includes a pre-configured `.mcp.json` file at the project root for easy Claude Code integration. This makes setup straightforward for demos and early adopters.

### 2. Configure Claude Code MCP Connection

**Project-Local Configuration (Recommended for Demos):**

CycleTime includes a project-local `.mcp.json` file at the repository root, making MCP configuration portable and version-controlled. This approach is ideal for demos and early adopter onboarding.

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'darkMode': true,
    'background': '#0d1117',
    'primaryColor': '#21262d',
    'primaryTextColor': '#c9d1d9',
    'primaryBorderColor': '#30363d',
    'lineColor': '#8b949e',
    'secondaryColor': '#1f6feb',
    'tertiaryColor': '#2ea043',
    'fontSize': '16px',
    'fontFamily': 'ui-monospace, monospace'
  }
}}%%
graph LR
    A[Clone Repository] --> B[.mcp.json Included]
    B --> C[Restart Claude Code]
    C --> D[Approve MCP Server]
    D --> E[Connected!]
    
    style B fill:#2ea043,stroke:#3fb950,color:#ffffff
    style E fill:#1f6feb,stroke:#58a6ff,color:#ffffff
```

**If `.mcp.json` already exists in your project**, add the CycleTime server to the existing configuration:

```bash
# Edit project-local MCP configuration
code .mcp.json
```

**Add CycleTime server to the `mcpServers` object:**

```json
{
  "mcpServers": {
    "cycletime": {
      "type": "websocket",
      "url": "ws://localhost:8080/mcp"
    }
    // ... other MCP servers you may have configured
  }
}
```

**If `.mcp.json` doesn't exist**, create it in the project root:

```bash
# Create new project-local configuration
cat > .mcp.json << 'EOF'
{
  "mcpServers": {
    "cycletime": {
      "type": "websocket",
      "url": "ws://localhost:8080/mcp"
    }
  }
}
EOF
```

**Alternative: User-Level Configuration**

If you prefer to configure CycleTime globally (across all projects):

```bash
# macOS/Linux
code ~/.claude.json

# Windows
code %APPDATA%\Claude\claude.json
```

Use the same server configuration format shown above.

**Restart Claude Code** to load the new configuration.

> **Security Note**: When using project-scoped MCP servers, Claude Code will prompt for approval before connecting. This is a security feature to prevent unauthorized server access. Click "Allow" when prompted for the CycleTime server.

**Verify Connection:**
- Open Claude Code
- Check for "cycletime" in available MCP servers list
- Connection indicator should show connected status (green dot)
- If prompted for security approval, click "Allow" to authorize the project-scoped MCP server

**Testing the Connection:**
```bash
# In Claude Code, ask:
"Can you list the available CycleTime tools?"

# Expected: Claude Code should display MCP tools including:
# - create_project, list_projects, get_project
# - create_issue, list_issues, update_issue
# - create_session, list_sessions
# - create_workflow, execute_workflow_stage
```

> **Troubleshooting**: If connection fails, see [MCP Troubleshooting Guide](./reference/mcp-troubleshooting.md) for detailed diagnostics and common issues.

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
1. Show the project-local `.mcp.json` file in the repository root with CycleTime server entry
2. Highlight that this configuration is version-controlled and portable with the project
3. Point out the WebSocket URL: `ws://localhost:8080/mcp`
4. Show Claude Code successfully connected to CycleTime (connection indicator shows active)
5. If first-time connection, demonstrate the security approval prompt and click "Allow"
6. Display MCP server availability in Claude Code's server list

**Script:**
"Claude Code connects to CycleTime through the MCP protocol using a WebSocket connection. Notice that the configuration lives right here in our project repository - it's version-controlled and portable. This means anyone cloning the repository gets the same MCP setup automatically. The configuration tells Claude Code where to find our CycleTime server, providing AI-assisted project management capabilities directly in your development workflow."

**Show in Claude Code:**
- Project-local `.mcp.json` file in VS Code file explorer
- MCP server list displaying "cycletime" server
- Connected status indicator (green)
- Available tools and resources from CycleTime

**Key Benefits to Emphasize:**
- Configuration travels with the project (no manual setup for team members)
- Version-controlled alongside codebase
- Early adopters can clone and immediately connect
- Security controls prevent unauthorized server access

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
"We've completed the foundational components including session management, MCP protocol integration, and database persistence with H2. The system includes comprehensive testing with high domain coverage and measured performance characteristics. Project orchestration features continue to evolve based on real-world usage patterns."

### Core Capabilities
"The system provides session management, cross-session persistence, H2 database integration, and Claude Code connectivity through the MCP protocol. The MCP server exposes project resources and tools directly to Claude Code for AI-assisted development workflows."

### Architecture Benefits
- **Embedded Database**: H2 database with single container deployment
- **Claude Code Integration**: MCP protocol support for AI-assisted development
- **Open Source**: MIT licensed, self-hosted deployment model

### Next Steps
"With core MCP integration complete, development focuses on expanding project orchestration capabilities, workflow automation features, and enhanced context provision for AI-assisted development. Future phases will add advanced dependency tracking and multi-provider support based on community feedback."

## Q&A Preparation

**Q: How does this compare to Jira/Linear?**
A: CycleTime is AI-native - designed specifically for Claude Code integration. It's not replacing traditional tools but augmenting AI-assisted development workflows.

**Q: How do team members connect to CycleTime?**
A: MCP configuration is stored in the project's `.mcp.json` file, which is version-controlled. Team members simply clone the repository and approve the MCP server connection in Claude Code - no manual configuration needed.

**Q: What about data security?**
A: Fully self-hosted with local database. Your data never leaves your infrastructure.

**Q: Scalability?**
A: Current implementation focuses on solo developers and small teams. Future phases will address horizontal scaling requirements based on adoption patterns.

**Q: Integration with existing tools?**
A: REST APIs enable integration. Future: webhooks and external tool connectors.

**Q: License concerns?**
A: MIT licensed - fully corporate-friendly, no GPL restrictions.

## Next Steps

Based on current implementation status and community feedback, we're focusing on:
1. Expanding project orchestration workflows and automation capabilities
2. Enhancing MCP resource provisioning for richer context
3. Improving developer experience with streamlined onboarding
4. Gathering feedback on core capabilities to guide feature priorities
5. Building community around AI-native development workflows

## Post-Demo

1. Share capability summary with current implementation status
2. Provide Docker quick-start instructions for local testing
3. **Highlight the `.mcp.json` configuration** - emphasize that early adopters can clone the repository and the MCP setup is already configured
4. Review completed features and roadmap
5. Gather feedback on core capabilities and feature priorities
6. Discuss integration approaches and use cases

**Quick Start for Early Adopters:**
```bash
# 1. Clone the repository
git clone https://github.com/spiralhouse/cycletime.git
cd cycletime

# 2. Start the server (Docker)
docker run -d -p 8080:8080 ghcr.io/spiralhouse/cycletime:latest

# 3. The .mcp.json is already configured in the project root
# 4. Restart Claude Code and approve the CycleTime MCP server
# 5. Start using CycleTime directly in Claude Code!
```

---

**Focus**: Demonstrate completed features (session management, H2 integration, testing) and discuss in-progress work (MCP integration, project bootstrap) with realistic timelines.