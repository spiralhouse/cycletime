---
title: "Claude Code Plugin Marketplace Architecture"
type: concept
domain: [plugin, mcp, architecture]
description: "Comprehensive explanation of Claude Code plugin system, marketplace distribution, and component structure"
dependencies: []
related: [../../reference/SPI-912-plugin-repositioning-decision.md, ../../patterns/plugin/heavyweight-plugin-pattern.md]
keywords: [plugin, marketplace, architecture, distribution, mcp, components]
last_updated: 2025-11-02
---

# Claude Code Plugin Marketplace Architecture

## Overview

Claude Code plugins are **lightweight packaging mechanisms** that bundle four extension types into a single distributable unit. Understanding this architecture is essential for building CycleTime as a plugin.

---

## Plugin Components

According to Anthropic's official documentation:

> "Plugins represent custom collections of slash commands, agents, MCP servers, and hooks that install with a single command."

### Four Component Types

1. **Slash Commands**: Custom shortcuts for frequently-used operations
   - Example: `/cycletime next-task` shows next unblocked issue
   - Markdown-based definitions in `.claude-plugin/commands/`
   - Invoke Claude Code actions or MCP tools

2. **Subagents**: Purpose-built agents handling specialized development tasks
   - Example: Project management agent for backlog analysis
   - Defined in `.claude-plugin/agents/`
   - Inherit base Claude capabilities with domain-specific context

3. **MCP Servers**: Tools and data source connections via Model Context Protocol
   - Example: CycleTime's existing Ktor + H2 MCP server
   - **Critical Insight**: MCP servers are ONE component plugins bundle, not separate category
   - Configured in `.claude-plugin/mcpServers/`

4. **Hooks**: Customization points within Claude Code's operational workflow
   - Example: Post-commit hook auto-updating issue status
   - Event-driven scripts in `.claude-plugin/hooks/`
   - JavaScript/shell scripts that respond to lifecycle events

---

## Distribution Architecture

### Installation Model

**User Perspective:**
```bash
# Step 1: Add marketplace (one-time)
/plugin marketplace add spiralhouse/claude-plugins-marketplace

# Step 2: Install plugin
/plugin install cycletime

# Done! All components configured automatically
```

**System Behavior:**
- Plugin manager clones/fetches marketplace repository
- Reads `.claude-plugin/marketplace.json` catalog
- Locates specified plugin source (GitHub repo, local path, git URL)
- Installs plugin components to `~/.claude/plugins/{plugin-name}/`
- Registers components with Claude Code

### Marketplace Structure

**Marketplace Repository Layout:**
```
spiralhouse/claude-plugins-marketplace/
├── .claude-plugin/
│   └── marketplace.json       # Catalog of available plugins
├── README.md                  # Marketplace overview
└── LICENSE                    # Open source license
```

**marketplace.json Format:**
```json
{
  "name": "spiralhouse-marketplace",
  "description": "Official Spiral House plugin marketplace",
  "plugins": [
    {
      "name": "cycletime",
      "description": "Project orchestration for solo developers",
      "source": "spiralhouse/cycletime",
      "version": "1.0.0",
      "keywords": ["project", "orchestration", "issues", "dependencies"]
    }
  ]
}
```

### Plugin Manifest

**plugin.json Structure:**
```json
{
  "name": "cycletime",
  "version": "1.0.0",
  "description": "Comprehensive project orchestration plugin",
  "author": "Spiral House",
  "license": "MIT",
  "components": {
    "mcpServers": {
      "cycletime": {
        "command": "${CLAUDE_PLUGIN_ROOT}/bin/start-server.sh",
        "transport": "streamable-http",
        "url": "http://localhost:8080/mcp"
      }
    },
    "commands": ["commands/next-task.md", "commands/status.md"],
    "agents": ["agents/pm-agent.md"],
    "hooks": ["hooks/post-commit.js"]
  }
}
```

**Key Fields:**
- `${CLAUDE_PLUGIN_ROOT}`: Environment variable resolving to plugin installation directory
- `strict: true` (default): Marketplace fields supplement plugin.json
- `strict: false`: Marketplace entry becomes complete manifest

---

## Component Path Customization

Plugins can override default component locations:

**Default Paths:**
- Commands: `.claude-plugin/commands/`
- Agents: `.claude-plugin/agents/`
- Hooks: `.claude-plugin/hooks/`
- MCP Servers: `.claude-plugin/mcpServers/`

**Custom Paths** (via plugin.json):
```json
{
  "components": {
    "commands": ["custom/commands/**/*.md"],
    "agents": ["agents/specialized/**/*.md"]
  }
}
```

---

## Discovery & Management

### Browsing Capabilities

**Interactive Plugin Browser:**
- `/plugin` command provides marketplace exploration
- Displays plugin descriptions, metadata, component types
- Filterable by marketplace, keywords, or component type

**Marketplace Commands:**
- `/plugin marketplace list` - View registered marketplaces
- `/plugin marketplace update` - Refresh metadata from remote
- `/plugin marketplace remove marketplace-name` - Deregister marketplace

### Team Distribution

**Enterprise Configuration** (`.claude/settings.json`):
```json
{
  "extraKnownMarketplaces": [
    {
      "name": "company-internal",
      "source": "github.com/company/claude-plugins"
    }
  ],
  "autoInstallPlugins": ["cycletime", "code-review"]
}
```

Organizations configure automatic marketplace installation, enabling trusted repositories to auto-load specified plugins for team standardization.

---

## Marketplace Types

### Official Anthropic Marketplace

- Curated by Anthropic
- High-quality plugins with security review
- Examples: PR review plugin, security guidance plugin

### Community Marketplaces

**Dan Ávila's Collection**: 80+ specialized plugins
- DevOps automation, documentation generation, testing suites
- Source: Research from Anthropic documentation

**Seth Hobson's Collection**: 80+ specialized sub-agents
- Domain-specific development agents, workflow automation

### Private/Organizational Marketplaces

- GitHub repositories with marketplace.json
- Internal company plugins for proprietary workflows
- Access control via repository permissions

---

## Limitations & Constraints

### No Built-In Systems For:

- **Community Rating**: No star ratings or review mechanisms
- **Security Scanning**: No automated vulnerability checks
- **Approval Workflows**: Community marketplaces self-governed

Organizations must implement these separately through governance policies.

### Update Management

- **Version Control**: Version fields in marketplace entries
- **Metadata Refresh**: `/plugin marketplace update` pulls latest catalog
- **No Auto-Updates**: User-controlled update installation
- **Backward Compatibility**: Plugin developers responsible for versioning strategy

---

## Heavyweight Plugin Pattern

### Definition

**Lightweight Plugin**: Only adds commands/agents (stateless, instant activation)
**Heavyweight Plugin**: Requires background server process (CycleTime's case)

### Challenges for Heavyweight Plugins

1. **Server Lifecycle Management**
   - Must start server on plugin activation
   - Port allocation and conflict detection
   - Health monitoring to detect failures
   - Graceful shutdown on deactivation

2. **Binary Distribution**
   - Native executables for cross-platform support
   - Or universal JAR with JVM requirement
   - Must bundle or download platform-specific binaries

3. **Resource Management**
   - Long-running processes consume memory/CPU
   - Log file rotation and cleanup
   - Database file management

**Mitigation**: See [Heavyweight Plugin Pattern](../../patterns/plugin/heavyweight-plugin-pattern.md) for implementation strategies.

---

## CycleTime as Plugin

### Current State (MCP Server)

**Installation Steps**: 5 manual steps
1. Download binary
2. Start server manually
3. Edit MCP settings JSON
4. Restart Claude Code
5. Verify connection

**Distribution**: GitHub releases, manual configuration

### Future State (Plugin)

**Installation Steps**: 2 commands
1. Add marketplace: `/plugin marketplace add spiralhouse/claude-plugins-marketplace`
2. Install: `/plugin install cycletime`

**Distribution**: Listed in marketplaces, automatic configuration

### Component Mapping

| Current Architecture | Plugin Component |
|---------------------|------------------|
| Ktor MCP Server | `mcpServers` component |
| Manual startup | `lifecycle-start.sh` script |
| Manual shutdown | `lifecycle-stop.sh` script |
| N/A (doesn't exist) | `commands/` slash commands |
| N/A (doesn't exist) | Optional `agents/` and `hooks/` |

---

## Competitive Analysis

### Plugin Categories in Ecosystem

**CycleTime's Position**: Comprehensive project orchestration with embedded database

**Differentiators:**
- **Cross-Session Continuity**: Persistent state via H2 database (not stateless)
- **Offline-First**: No external service dependencies (vs. Linear/GitHub/Jira plugins)
- **Structured Hierarchy**: Epic → Story → Subtask with dependency tracking
- **Heavyweight Architecture**: Long-running server provides continuous availability

**Competitors:**
- **Lightweight task plugins**: Stateless, flat task lists
- **External service plugins**: Require Linear/GitHub/Jira accounts
- **Specialized agents**: Single-purpose, no persistent context

**Market Gap**: No existing plugins provide comprehensive project orchestration with embedded database for cross-session continuity.

---

## References

- **Anthropic Announcement**: https://www.anthropic.com/news/claude-code-plugins
- **Technical Documentation**: https://docs.claude.com/en/docs/claude-code/plugin-marketplaces
- **Decision Document**: [SPI-912 Plugin Repositioning Decision](../../reference/SPI-912-plugin-repositioning-decision.md)

---

**Last Updated**: November 2, 2025
**Related Patterns**: [Heavyweight Plugin Pattern](../../patterns/plugin/heavyweight-plugin-pattern.md)
