---
title: "SPI-912: Implementation Backlog - Plugin Repositioning"
type: reference
domain: [product, planning, implementation]
description: "Complete backlog of 21 Linear stories for CycleTime plugin repositioning with acceptance criteria and dependencies"
dependencies: [SPI-912-plugin-repositioning-decision.md, ../concepts/plugins/plugin-marketplace-architecture.md]
related: []
keywords: [backlog, stories, implementation, linear, sprint-planning]
last_updated: 2025-11-02
---

# SPI-912: Implementation Backlog - Plugin Repositioning

**Linear Epic**: SPI-912 - CycleTime Plugin for Claude Code
**Total Effort**: 85 required story points + 10 optional across 21 stories
**Timeline**: 12-14 weeks across 3 phases

---

## Story Index

**Phase 1: GraalVM Compatibility & Core Packaging** (41 pts)
- SPI-920: Design plugin architecture (5 pts)
- SPI-921: GraalVM compatibility research (8 pts) **[CRITICAL PATH]**
- SPI-922: Create plugin.json manifest (3 pts)
- SPI-923: Create marketplace.json catalog (2 pts)
- SPI-924: Implement server startup script (8 pts)
- SPI-925: Implement graceful shutdown script (5 pts)
- SPI-927: Auto-generate MCP config (5 pts)
- SPI-928: Package universal JAR (5 pts)

**Phase 2: Enhanced Integration & Quality** (44 pts required + 10 optional)
- SPI-926: Implement health monitoring (8 pts)
- SPI-929: JVM detection (3 pts) **[Conditional]**
- SPI-930: Implement slash commands (8 pts)
- SPI-931: PM sub-agent (5 pts) **[Optional]**
- SPI-932: Post-commit hook (2 pts) **[Optional]**
- SPI-933: Plugin installation guide (3 pts)
- SPI-934: Marketplace entry (3 pts)
- SPI-935: Integration testing (8 pts)
- SPI-936: Docker alpha testing (5 pts)
- SPI-949: Native build pipeline (13 pts) **[Conditional]**

**Phase 3: Marketplace Launch** (8 pts)
- SPI-937: Create spiralhouse marketplace (3 pts)
- SPI-938: Submit to community marketplaces (3 pts)
- SPI-939: Announcement blog post (2 pts)

---

## Phase 1: GraalVM Compatibility & Core Packaging

### SPI-920: Design Plugin Architecture (5 pts)

**Description**: Research and design the technical architecture for CycleTime as a Claude Code plugin, focusing on how the plugin will manage the background MCP server process.

**Acceptance Criteria**:
- [ ] Research existing Claude Code plugins that bundle services/servers (if any)
- [ ] Design process management approach (systemd/launchd-style patterns)
- [ ] Define health check strategy and auto-restart logic
- [ ] Document port allocation and conflict detection approach
- [ ] Create error handling and user messaging design
- [ ] Design graceful shutdown and cleanup procedures
- [ ] Document platform-specific considerations (macOS/Linux/Windows)
- [ ] Create architecture decision record (ADR) documenting chosen approach

**Dependencies**: None

**Labels**: Research, Architecture, MCP, Plugin, Documentation

**Priority**: High - Blocks plugin implementation

---

### SPI-921: GraalVM Compatibility Research (8 pts) **[CRITICAL PATH]**

**Description**: Investigate compatibility between current CycleTime stack (Ktor 3.3.1, Exposed, H2) and GraalVM native-image compilation. Historical issues exist between Ktor and GraalVM. Must verify current versions work together and identify any required configuration or workarounds.

**Acceptance Criteria**:
- [ ] Research Ktor 3.3.1 + GraalVM native-image compatibility status
- [ ] Test minimal Ktor server with native-image compilation
- [ ] Verify Exposed ORM works with native-image (reflection configuration)
- [ ] Test H2 embedded database in native-image context
- [ ] Document any required GraalVM configuration (reflection, resources, JNI)
- [ ] Identify build-time vs runtime initialization requirements
- [ ] Test native binary across macOS (Intel/ARM), Linux, Windows
- [ ] Document findings and recommend go/no-go for native builds
- [ ] If incompatible: document JAR-based fallback approach with JVM requirements

**Dependencies**: None (blocks binary distribution decisions)

**Labels**: Research, GraalVM, Build, Infrastructure, Risk

**Priority**: Critical - Beta blocker

---

### SPI-922: Create plugin.json Manifest (3 pts)

**Description**: Author the plugin.json manifest file that defines CycleTime as a Claude Code plugin. Include metadata (name, description, version), component declarations (MCP server configuration), and installation requirements.

**Acceptance Criteria**:
- [ ] Create `.claude-plugin/plugin.json` with required fields
- [ ] Define plugin metadata: name="cycletime", description, version="1.0.0"
- [ ] Declare MCP server component in `mcpServers` section
- [ ] Specify installation requirements (JVM 21 if using JAR approach)
- [ ] Add author, license, and repository information
- [ ] Validate JSON structure against Claude Code plugin schema
- [ ] Test plugin manifest loads correctly in Claude Code
- [ ] Document manifest fields and their purposes

**Dependencies**: SPI-921 (distribution strategy informs requirements)

**Labels**: Plugin, Configuration, MCP

**Priority**: High - Core plugin infrastructure

---

### SPI-923: Create marketplace.json Catalog (2 pts)

**Description**: Author the marketplace.json file that lists CycleTime in the official spiralhouse plugin marketplace. Include plugin metadata, source location, and discoverability information optimized for marketplace browsing.

**Acceptance Criteria**:
- [ ] Create `.claude-plugin/marketplace.json` for spiralhouse marketplace
- [ ] Define marketplace metadata: name="spiralhouse-marketplace", owner contact info
- [ ] Add CycleTime plugin entry with name, source, description
- [ ] Write compelling marketplace description (2-3 sentences) highlighting key benefits
- [ ] Add keywords for discoverability: "project", "orchestration", "issues", "dependencies"
- [ ] Specify source location (GitHub repository reference)
- [ ] Validate JSON structure and test marketplace registration
- [ ] Document marketplace submission process for future updates

**Dependencies**: SPI-922 (references plugin.json)

**Labels**: Plugin, Distribution, Marketing

**Priority**: High - Required for plugin installation

---

### SPI-924: Implement Server Startup Script (8 pts)

**Description**: Create a startup script that launches the CycleTime MCP server as a background process when the plugin is activated. Include port allocation (default 8080 with automatic fallback), health checking to verify server readiness, and error handling for common failure scenarios.

**Acceptance Criteria**:
- [ ] Create `.claude-plugin/mcpServers/lifecycle-start.sh` (bash script)
- [ ] Implement port allocation: try 8080, fallback to 8081-8090 range if occupied
- [ ] Start CycleTime server as background process with proper logging
- [ ] Implement health check polling (GET /health endpoint) with 30s timeout
- [ ] Return success when server responds to health check
- [ ] Handle failure scenarios: port conflicts, missing binary, JVM issues
- [ ] Log server output to `~/.claude/plugins/cycletime/logs/server.log`
- [ ] Store server PID for shutdown reference
- [ ] Test across macOS and Linux platforms

**Dependencies**: SPI-920 (architecture design), SPI-921 (binary location)

**Labels**: Plugin, MCP, Infrastructure, Scripting

**Priority**: High - Core plugin functionality

---

### SPI-925: Implement Graceful Shutdown Script (5 pts)

**Description**: Create a shutdown script that gracefully stops the CycleTime MCP server when the plugin is deactivated or Claude Code exits. Include proper signal handling, timeout-based forced termination, and cleanup of temporary resources.

**Acceptance Criteria**:
- [ ] Create `.claude-plugin/mcpServers/lifecycle-stop.sh` (bash script)
- [ ] Read server PID from storage location
- [ ] Send SIGTERM signal for graceful shutdown
- [ ] Wait up to 10 seconds for graceful shutdown
- [ ] Send SIGKILL if graceful shutdown fails
- [ ] Clean up PID file and temporary resources
- [ ] Handle case where server already stopped (idempotent)
- [ ] Log shutdown events
- [ ] Test across macOS and Linux platforms

**Dependencies**: SPI-924 (references PID storage from startup)

**Labels**: Plugin, MCP, Infrastructure, Scripting

**Priority**: High - Prevents orphaned server processes

---

### SPI-927: Auto-Generate MCP Config (5 pts)

**Description**: Create logic that automatically generates the MCP server configuration for Claude Code when the CycleTime plugin is installed. This eliminates manual configuration steps and ensures correct connection settings.

**Acceptance Criteria**:
- [ ] Create MCP server config template with dynamic port substitution
- [ ] Generate config at plugin activation with actual server port
- [ ] Write config to Claude Code MCP settings location
- [ ] Validate config format matches Claude Code expectations
- [ ] Handle config updates if server port changes
- [ ] Support merging with existing MCP configs (don't overwrite other servers)
- [ ] Document config generation process
- [ ] Test installation flow from clean Claude Code instance

**Dependencies**: SPI-924 (needs server port information)

**Labels**: Plugin, MCP, Configuration

**Priority**: High - Key UX improvement over manual MCP setup

---

### SPI-928: Package Universal JAR (5 pts)

**Description**: Configure Gradle build to produce a standalone "fat JAR" containing CycleTime server and all dependencies. This JAR will be the primary binary distributed with the plugin, requiring only JVM 21 on the user's machine.

**Acceptance Criteria**:
- [ ] Configure `buildFatJar` Gradle task to produce self-contained JAR
- [ ] Include all runtime dependencies (Ktor, Exposed, H2, MCP SDK)
- [ ] Verify JAR is executable: `java -jar cycletime-server.jar`
- [ ] Test JAR across platforms: macOS (Intel/ARM), Linux, Windows
- [ ] Optimize JAR size where possible (exclude dev dependencies)
- [ ] Document JAR execution requirements (JVM 21)
- [ ] Create version-stamped JAR names: `cycletime-server-1.0.0.jar`
- [ ] Test JAR runs correctly from plugin directory structure

**Dependencies**: SPI-921 (distribution strategy decision)

**Labels**: Build, Distribution, Infrastructure

**Priority**: High - Required for plugin packaging

---

## Phase 2: Enhanced Integration & Quality

### SPI-926: Implement Health Monitoring (8 pts)

**Description**: Create a health monitoring mechanism that periodically checks if the CycleTime MCP server is responding. If health checks fail, automatically attempt to restart the server with exponential backoff to prevent rapid failure loops.

**Acceptance Criteria**:
- [ ] Implement health check loop running every 60 seconds
- [ ] Poll server /health endpoint with 5s timeout
- [ ] Count consecutive failures (threshold: 3 failures triggers restart)
- [ ] Implement auto-restart with exponential backoff (5s, 10s, 20s delays)
- [ ] Maximum 5 restart attempts before marking plugin as failed
- [ ] Display user notification if server repeatedly fails
- [ ] Log health check results and restart attempts
- [ ] Test failure scenarios: server crash, network issues, high load
- [ ] Ensure health monitoring stops cleanly on plugin deactivation

**Dependencies**: SPI-924 (startup script), SPI-925 (shutdown script)

**Labels**: Plugin, MCP, Reliability, Monitoring

**Priority**: High - Critical for production reliability

---

### SPI-929: JVM Detection & Guidance (3 pts) **[Conditional]**

**Description**: Create logic in the startup script to detect if JVM 21 is available on the user's system. If missing or wrong version, display clear error message with installation instructions (SDKMAN recommendation). Only needed if native builds fail.

**Acceptance Criteria**:
- [ ] Detect Java installation: `java -version` command
- [ ] Parse Java version from output, compare to minimum required (21)
- [ ] Display helpful error message if Java missing or too old
- [ ] Include SDKMAN installation commands in error message
- [ ] Provide alternative: direct OpenJDK download link
- [ ] Test detection across platforms (different Java distributions)
- [ ] Document JVM requirements in plugin README
- [ ] Consider caching detection result to avoid repeated checks

**Dependencies**: SPI-924 (startup script), SPI-928 (JAR packaging)

**Labels**: Plugin, UX, Infrastructure

**Priority**: Medium - Important if JAR distribution required

---

### SPI-930: Implement Slash Commands (8 pts)

**Description**: Create a set of slash commands that provide quick access to common CycleTime operations without requiring full MCP tool invocation. Start with 3-5 high-value commands based on user workflows.

**Recommended Commands**:
1. `/cycletime next-task` - Show next unblocked task in active project
2. `/cycletime status` - Display project progress summary
3. `/cycletime create-issue [title]` - Quick issue creation
4. `/cycletime list-projects` - Show all projects with issue counts
5. `/cycletime help` - Command reference and examples

**Acceptance Criteria**:
- [ ] Create `.claude-plugin/commands/` directory structure
- [ ] Implement each command as separate Markdown file
- [ ] Each command invokes appropriate MCP tools via Claude Code
- [ ] Include clear usage examples in command documentation
- [ ] Handle error cases gracefully with helpful messages
- [ ] Test commands in Claude Code terminal and VS Code
- [ ] Document command parameters and expected outputs
- [ ] Update plugin.json to reference command files

**Dependencies**: SPI-922 (plugin manifest), SPI-927 (MCP config working)

**Labels**: Plugin, Feature, UX, Commands

**Priority**: Medium - Nice-to-have, not MVP blocking

---

### SPI-931: Create PM Sub-Agent (5 pts) **[Optional]**

**Description**: Design and implement a specialized sub-agent focused on project management workflows: backlog grooming, task prioritization, dependency analysis, and progress reporting. This agent uses CycleTime's MCP resources to provide intelligent recommendations.

**Agent Capabilities**:
- Analyze project backlog and recommend prioritization
- Identify blocking dependencies and suggest resolution order
- Generate project status reports with velocity metrics
- Propose Epic/Story/Subtask breakdowns for large features
- Detect potential scope creep and timeline risks

**Acceptance Criteria**:
- [ ] Create `.claude-plugin/agents/pm-agent.md` agent definition
- [ ] Define agent personality and expertise areas
- [ ] Document agent prompt with CycleTime context integration
- [ ] Implement examples for common PM workflows
- [ ] Test agent with sample project data
- [ ] Verify agent uses MCP resources effectively
- [ ] Document agent usage patterns in plugin README
- [ ] Update plugin.json to reference agent definition

**Dependencies**: SPI-922 (plugin manifest), SPI-927 (MCP config working)

**Labels**: Plugin, Feature, Agent, Product

**Priority**: Low - Enhancement for v1.1+, not MVP

---

### SPI-932: Post-Commit Hook (2 pts) **[Optional]**

**Description**: Create a Git post-commit hook that automatically updates CycleTime issue status based on commit messages. When developers commit with issue references (e.g., "SPI-123: implement feature"), the hook can move issues to "In Progress" automatically.

**Hook Behavior**:
- Parse commit message for issue IDs (e.g., SPI-123, #123)
- Detect commit type from conventional commit format (feat, fix, docs)
- Update issue status based on context: first commit → "In Progress", "fix:" commits → potentially "Done"
- Support configuration to enable/disable automatic updates

**Acceptance Criteria**:
- [ ] Create `.claude-plugin/hooks/post-commit.js` hook script
- [ ] Implement commit message parsing with regex
- [ ] Call CycleTime MCP tools to update issue status
- [ ] Support conventional commit format parsing
- [ ] Allow user configuration: enable/disable, status mapping
- [ ] Handle errors gracefully (don't block commits)
- [ ] Test with various commit message formats
- [ ] Document hook behavior and configuration options

**Dependencies**: SPI-922 (plugin manifest), SPI-927 (MCP config working)

**Labels**: Plugin, Feature, Automation, Workflow

**Priority**: Low - Enhancement for v1.1+, not MVP

---

### SPI-933: Plugin Installation Guide (3 pts)

**Description**: Write complete installation documentation for CycleTime plugin covering marketplace setup, plugin installation, and first-time usage. Since CycleTime is pre-release, this will be the primary installation method from day one (no migration documentation needed).

**Guide Contents**:
1. Prerequisites: Claude Code version, platform requirements
2. Marketplace Setup: `/plugin marketplace add spiralhouse/claude-plugins-marketplace`
3. Plugin Installation: `/plugin install cycletime`
4. First-Time Setup: Creating first project, adding issues
5. Slash Command Reference: `/cycletime next-task`, `/cycletime status`, etc.
6. Troubleshooting: Common issues and solutions
7. Advanced Configuration: Custom ports, data location

**Acceptance Criteria**:
- [ ] Create `docs/guides/getting-started/plugin-installation-guide.md` document
- [ ] Include YAML frontmatter with appropriate metadata
- [ ] Write clear step-by-step installation instructions
- [ ] Include screenshots or terminal recordings for clarity
- [ ] Document slash commands with usage examples
- [ ] Provide troubleshooting section for common issues
- [ ] Test installation guide with fresh Claude Code instance
- [ ] Update main README.md to reference plugin installation

**Dependencies**: SPI-927 (MCP config generation), SPI-930 (slash commands implemented)

**Labels**: Documentation, Guide, Plugin

**Priority**: High - Required before beta release

---

### SPI-934: Plugin Marketplace Entry (3 pts)

**Description**: Create a polished marketplace entry for CycleTime that will appear in plugin marketplace browsers. Include compelling description, key features, usage examples, and potentially screenshots demonstrating the plugin in action.

**Marketplace Entry Components**:
1. **Tagline** (1 sentence): "Project orchestration for solo developers with cross-session continuity"
2. **Description** (2-3 paragraphs): Problem, solution, key benefits
3. **Key Features** (bullet list): Epic → Story → Subtask, dependency tracking, offline-first
4. **Quick Start** (code example): `/plugin install cycletime`, `/cycletime next-task`
5. **Screenshots/GIFs** (optional): Plugin installation, slash command usage
6. **Requirements**: JVM 21 (if JAR approach) or platform-specific native builds
7. **Support Links**: Docs, GitHub issues, community chat

**Acceptance Criteria**:
- [ ] Write compelling marketplace description optimized for browsing
- [ ] Highlight unique differentiators: embedded database, offline-first, dependency tracking
- [ ] Include clear usage examples with expected outputs
- [ ] Add keywords for discoverability: "project", "orchestration", "solo developer", "offline"
- [ ] Create screenshots or terminal recordings if helpful
- [ ] Proofread and copyedit for professional polish
- [ ] Test markdown rendering in plugin browser
- [ ] Update marketplace.json with final description

**Dependencies**: SPI-923 (marketplace.json structure)

**Labels**: Documentation, Marketing, Plugin

**Priority**: Medium - Important for discoverability

---

### SPI-935: Integration Testing (8 pts)

**Description**: Develop integration tests that verify the complete plugin lifecycle: installation, server startup, health monitoring, MCP configuration, and shutdown. Tests should cover happy path, common failure scenarios, and security considerations.

**Test Coverage**:
1. **Installation**: Plugin installs successfully, files in correct locations
2. **Server Startup**: Server starts on available port, health check passes
3. **MCP Configuration**: Config generated correctly, Claude Code can connect
4. **Health Monitoring**: Server failures detected and restart attempted
5. **Shutdown**: Server stops cleanly, no orphaned processes
6. **Failure Scenarios**: Port conflicts, missing JVM (if applicable), server crashes
7. **Security**: Path traversal protection, port binding validation, resource limits
8. **Cross-Platform**: Tests pass on macOS and Linux

**Security Testing Requirements**:
- [ ] Path traversal protection: Verify plugin cannot write outside designated directories
- [ ] Port binding validation: Confirm port range restrictions (8000-65535), localhost-only binding
- [ ] Resource limits: Test memory/CPU limits prevent resource exhaustion
- [ ] Process isolation: Verify plugin server cannot access other user processes
- [ ] Input validation: Test MCP commands with malicious payloads (SQL injection, command injection)
- [ ] Credential handling: Verify database file permissions are restrictive (600)
- [ ] Error message sanitization: Confirm errors don't leak sensitive paths or credentials

**Acceptance Criteria**:
- [ ] Create `src/integrationTest/kotlin/plugin/PluginLifecycleTest.kt`
- [ ] Create `src/integrationTest/kotlin/plugin/PluginSecurityTest.kt`
- [ ] Test successful plugin installation flow
- [ ] Test server startup with health checking
- [ ] Test MCP configuration generation
- [ ] Test health monitoring and auto-restart
- [ ] Test graceful shutdown and cleanup
- [ ] Test failure scenarios with appropriate error messages
- [ ] Test all security requirements listed above
- [ ] Verify tests pass on macOS and Linux
- [ ] Document test execution instructions
- [ ] Document security test rationale

**Dependencies**: SPI-924 (startup), SPI-925 (shutdown), SPI-926 (health monitoring)

**Labels**: Testing, Plugin, Quality, Security

**Priority**: High - Required before plugin release

---

### SPI-936: Docker Alpha Testing (5 pts)

**Description**: Perform internal alpha testing of CycleTime plugin using Docker containerized JAR approach before native builds are ready. Focus on plugin lifecycle, slash commands, and core workflows. No external users yet (pre-release state).

**Alpha Testing Plan**:
1. **Docker Setup**: Package JAR in container for easy local testing
2. **Testing Scenarios**:
   - Plugin installation via local marketplace
   - Server lifecycle (start/stop/health monitoring)
   - MCP connection and resource availability
   - Slash commands: `/cycletime next-task`, `/cycletime status`
   - Basic workflows: create project, add issues, track dependencies
3. **Feedback Collection**:
   - Installation friction points
   - Error message clarity
   - Performance and reliability issues
   - Docker vs native build comparison
4. **Iteration**: Address critical issues before moving to native build phase

**Acceptance Criteria**:
- [ ] Create Docker container packaging JAR with proper entrypoint
- [ ] Document Docker-based alpha testing setup instructions
- [ ] Test plugin installation with containerized server
- [ ] Validate all core workflows function correctly
- [ ] Document any Docker-specific limitations
- [ ] Create Linear issues for critical problems found
- [ ] Assess readiness for native build investment
- [ ] Update architecture docs with alpha findings

**Dependencies**: SPI-935 (integration tests passing)

**Labels**: Testing, QA, Docker

**Priority**: High - Critical quality gate before public release

---

### SPI-949: Native Build Pipeline (13 pts) **[Conditional]**

**Description**: Implement the GraalVM native-image build pipeline to produce cross-platform native executables for CycleTime, eliminating JVM runtime dependency and simplifying distribution. Only execute if SPI-921 confirms Ktor 3.3.1 + Exposed + H2 are fully compatible with GraalVM native-image compilation.

**Acceptance Criteria**:

**Build Configuration:**
- [ ] Configure GraalVM native-image plugin in `build.gradle.kts`
- [ ] Define reflection configuration for Ktor, Exposed, and H2
- [ ] Configure resource inclusion for embedded resources
- [ ] Set up serialization hints for JSON processing
- [ ] Define reachability metadata for dynamic class loading

**Platform Targets:**
- [ ] macOS Intel (x86_64-darwin)
- [ ] macOS ARM (aarch64-darwin)
- [ ] Linux x86_64 (x86_64-linux)
- [ ] Windows x86_64 (x86_64-windows)

**CI/CD Integration:**
- [ ] Add native build jobs to GitHub Actions workflow
- [ ] Configure matrix builds for all target platforms
- [ ] Implement artifact naming convention (`cycletime-{version}-{platform}`)
- [ ] Set up artifact upload for distribution
- [ ] Add smoke tests for native executables

**Quality Gates:**
- [ ] Native executable starts successfully on all platforms
- [ ] Database initialization works in native mode
- [ ] MCP server responds to requests in native mode
- [ ] Memory usage comparable to JAR execution
- [ ] Startup time < 2 seconds (native advantage)

**Dependencies**: SPI-921 (GraalVM Compatibility Research)
**Blocks**: SPI-935 (should test both JAR and native builds)

**Fallback Strategy**: If native builds prove problematic during implementation, document specific incompatibility, update plugin to require JVM 21+, distribute universal JAR instead, keep native build research for future Ktor/GraalVM improvements.

**Labels**: MCP, Release, Infrastructure

**Priority**: High (conditional) - Beta requirement if GraalVM compatible

---

## Phase 3: Marketplace Launch

### SPI-937: Create spiralhouse Marketplace (3 pts)

**Description**: Create the official spiralhouse plugin marketplace as a GitHub repository hosting the marketplace.json catalog. Configure repository for public access and documentation.

**Repository Contents**:
- `.claude-plugin/marketplace.json` - Catalog listing CycleTime and future spiralhouse plugins
- `README.md` - Marketplace overview, installation instructions, plugin listing
- `LICENSE` - Open source license
- `.github/` - Issue templates for plugin submissions (future)

**Acceptance Criteria**:
- [ ] Create GitHub repository: `spiralhouse/claude-plugins-marketplace`
- [ ] Add `.claude-plugin/marketplace.json` with CycleTime entry
- [ ] Write comprehensive README with usage instructions
- [ ] Add MIT or Apache 2.0 license
- [ ] Configure repository for public access
- [ ] Test marketplace installation: `/plugin marketplace add spiralhouse/claude-plugins-marketplace`
- [ ] Verify CycleTime shows in plugin browser
- [ ] Document marketplace maintenance process

**Dependencies**: SPI-923 (marketplace.json content)

**Labels**: Infrastructure, Distribution

**Priority**: High - Required for plugin installation

---

### SPI-938: Submit to Community Marketplaces (3 pts)

**Description**: Research submission process for popular community plugin marketplaces (Dan Ávila, Seth Hobson) and submit CycleTime for inclusion. Follow each marketplace's guidelines and requirements.

**Submission Process**:
1. Research each marketplace's submission process (GitHub PR, issue, form)
2. Prepare submission materials: description, examples, requirements
3. Submit to each marketplace following their process
4. Respond to any feedback or requested changes
5. Monitor for approval and inclusion

**Acceptance Criteria**:
- [ ] Research Dan Ávila's marketplace submission process
- [ ] Research Seth Hobson's marketplace submission process
- [ ] Prepare submission materials per marketplace requirements
- [ ] Submit to Dan Ávila's marketplace
- [ ] Submit to Seth Hobson's marketplace
- [ ] Address any feedback from marketplace maintainers
- [ ] Verify CycleTime listed in both marketplaces
- [ ] Document submission process for future reference

**Dependencies**: SPI-937 (spiralhouse marketplace live), SPI-936 (alpha testing complete)

**Labels**: Distribution, Marketing, Community

**Priority**: Medium - Expands discoverability

---

### SPI-939: Announcement Blog Post (2 pts)

**Description**: Write a comprehensive blog post announcing CycleTime's plugin availability. Explain the benefits, installation process, and future vision. Publish on spiralhouse blog and share across relevant channels.

**Blog Post Outline**:
1. **Headline**: "Introducing CycleTime: Project Orchestration Plugin for Claude Code"
2. **Lede**: Solo developer challenge (project context chaos) and solution (embedded orchestration)
3. **Key Features**: Epic → Story → Subtask hierarchy, dependency tracking, cross-session memory
4. **Plugin Experience**: One-command install, slash commands, offline-first
5. **Why Plugin-Native**: Built for Claude Code ecosystem from day one
6. **Future Vision**: Enhanced workflows, team collaboration, cloud sync
7. **Call to Action**: Install today, join community, provide feedback

**Acceptance Criteria**:
- [ ] Write 800-1200 word blog post
- [ ] Include code examples and installation commands
- [ ] Add screenshots or terminal recordings
- [ ] Proofread and copyedit
- [ ] Publish on spiralhouse blog
- [ ] Share on relevant channels: Twitter, Reddit (r/ClaudeAI), Discord/Slack communities
- [ ] Monitor comments and respond to questions
- [ ] Add blog post link to GitHub README

**Dependencies**: SPI-937 (plugin available in marketplace)

**Labels**: Marketing, Documentation, Communication

**Priority**: Medium - Important for awareness

---

## Implementation Roadmap

### Critical Path

```
SPI-920 (Architecture Design) →
SPI-924 (Startup Script) →
SPI-925 (Shutdown Script) →
SPI-926 (Health Monitoring) →
SPI-935 (Integration Testing) →
SPI-936 (Alpha Testing) →
SPI-937 (Marketplace Launch)
```

### Parallel Work Opportunities

**Phase 1:**
- SPI-921 (GraalVM research) parallel with SPI-920 (architecture design)
- SPI-922 (plugin.json) and SPI-923 (marketplace.json) can be done in parallel after SPI-921

**Phase 2:**
- SPI-930 (slash commands) parallel with SPI-933 (documentation)
- SPI-931 (PM agent) and SPI-932 (hooks) can be done anytime after SPI-922

**Phase 3:**
- SPI-938 (community submission) parallel with SPI-939 (blog post)

---

## Resource Allocation

**Engineering**: 1 senior engineer + 1 mid-level engineer
- Senior: Architecture design, server lifecycle management, health monitoring
- Mid-level: Script implementation, testing, JAR packaging

**Product Management**: 0.5 FTE
- Requirements refinement, alpha testing coordination, marketplace submission

**Technical Writing**: 0.25 FTE (or engineer time)
- Plugin installation guide, marketplace entry, blog post

---

## Success Metrics

**Phase 1**: GraalVM compatibility decision, plugin installs successfully, zero manual MCP configuration

**Phase 2**: Health monitoring working, slash commands functional, internal alpha validates approach, native builds working (or fallback implemented)

**Phase 3**: Listed in 3+ marketplaces, 50+ installations first month

**Long-Term** (6 months post-launch):
- 500+ active plugin installations
- < 5% installation failure rate
- Positive community feedback (qualitative assessment)
- Reduced GitHub issues related to installation and configuration

---

## References

- **Decision Document**: [SPI-912 Plugin Repositioning Decision](SPI-912-plugin-repositioning-decision.md)
- **Architecture Concepts**: [Plugin Marketplace Architecture](../concepts/plugins/plugin-marketplace-architecture.md)
- **Linear Epic**: https://linear.app/spiral-house/issue/SPI-912

---

**Last Updated**: November 2, 2025
**Status**: Ready for Sprint Planning
