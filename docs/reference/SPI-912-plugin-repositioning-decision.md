---
title: "SPI-912: Plugin Repositioning - Executive Decision"
type: reference
domain: [product, strategy]
description: "Executive summary and strategic recommendation for repositioning CycleTime as Claude Code plugin"
dependencies: []
related: [../concepts/plugins/plugin-marketplace-architecture.md, SPI-912-implementation-backlog.md]
keywords: [plugin, decision, recommendation, strategy, positioning]
last_updated: 2025-11-02
status: approved
---

# CycleTime Plugin Repositioning: Executive Decision

**Linear Issue**: SPI-912
**Date**: November 2, 2025
**Status**: Approved - Ready for Implementation

---

## Recommendation: YES - Reposition CycleTime as a Claude Code Plugin

After comprehensive analysis of the Claude Code plugin marketplace system and CycleTime's current architecture, **I strongly recommend repositioning CycleTime from "specialized MCP server" to "Claude Code plugin available from plugin marketplaces."**

---

## Key Findings

### What Are Plugins?

Plugins are "custom collections of slash commands, agents, MCP servers, and hooks that install with a single command." Critically, **MCP servers are ONE component** that plugins can bundle, not a separate category. CycleTime's existing MCP server becomes a component within a plugin package.

### Strategic Advantages

1. **Dramatic Installation Simplification**: From multi-step manual MCP configuration to single `/plugin install cycletime` command
2. **Ecosystem Alignment**: Anthropic is positioning plugins as the primary Claude Code extension model
3. **Better Discovery**: Listed in curated marketplaces vs. buried in documentation
4. **Richer Integration Opportunities**: Add slash commands (`/cycletime next-task`) and workflow hooks
5. **Team Standardization**: Simplified distribution for engineering teams
6. **Pre-Release Timing**: Clean positioning advantage, no migration burden (3-5 story points saved)

### Primary Challenge

CycleTime will be a "heavyweight plugin" requiring server lifecycle management (start/stop/health monitoring), unlike typical lightweight plugins that only add commands or agents. This is manageable but requires careful engineering (13 story points).

### Technical Feasibility

**HIGH** - Plugins explicitly support bundling MCP servers. CycleTime's existing architecture (Ktor server + H2 database) can be packaged as a plugin component.

---

## Implementation Scope

**Total Effort**: 85 required story points + 10 optional across 21 stories, 12-14 weeks

### Phase 1: GraalVM Compatibility & Core Packaging (Weeks 1-4, 41 pts required)

* **Critical Decision Point**: GraalVM native build compatibility research (8 pts, beta blocker)
* Plugin manifest, marketplace catalog, server lifecycle scripts
* Universal JAR packaging for alpha testing
* **Optional**: JVM detection fallback (3 pts)

**Decision Point**: End of Phase 1 determines go/no-go for native builds. If Ktor 3.3.1 + GraalVM incompatible, proceed with JAR + JVM requirement.

### Phase 2: Enhanced Integration & Quality (Weeks 5-10, 44 pts required + 7 optional)

* Health monitoring with auto-restart
* Slash commands for common operations
* **Optional**: Product Manager sub-agent (5 pts), Post-commit validation hook (2 pts)
* Plugin installation guide (no migration docs needed)
* Integration testing + Docker-based internal alpha (5 pts)
* **Conditional**: Native build pipeline implementation (13 pts, depends on Phase 1 decision)

### Phase 3: Marketplace Launch & Communication (Weeks 11-14, 8 pts)

* Create spiralhouse marketplace on GitHub (3 pts)
* Submit to community marketplaces (3 pts)
* Announcement blog post: "Introducing CycleTime" (2 pts)

---

## Critical Insights

### Pre-Release Advantage

**Context**: CycleTime is pre-release with no production users yet. This eliminates migration complexity entirely.

**Strategic Advantages:**
- **Clean Launch**: Can position as plugin from day one without legacy baggage
- **Simplified Messaging**: No "migration path" documentation needed
- **Faster Time-to-Market**: Remove 2-3 stories related to user migration
- **Better First Impression**: Users discover CycleTime as plugin-native, not retrofit

**Alpha Testing Approach:**
- Use Docker containerized JAR for alpha testing (you + internal testers)
- Beta release waits for native builds to be ready
- No public MCP server documentation to maintain or deprecate

### GraalVM Risk

**Historical Compatibility Issues**: Ktor and GraalVM have had compatibility problems. Must verify Ktor 3.3.1 works with native-image compilation.

**Mitigation Strategy:**
- **Pre-Beta**: Research Ktor 3.3.1 + GraalVM compatibility (create research story)
- **Alpha Phase**: Use Docker containerized JAR for local testing
- **Beta Requirement**: Native builds working across macOS (Intel/ARM), Linux, Windows
- **Fallback**: If GraalVM incompatible, ship JAR with clear JVM requirement

---

## Success Metrics

**Phase 1**: GraalVM compatibility decision, plugin installs successfully, zero manual MCP configuration
**Phase 2**: Health monitoring working, slash commands functional, internal alpha validates approach, native builds working (or fallback implemented)
**Phase 3**: Listed in 3+ marketplaces, 50+ installations first month

---

## Competitive Positioning

**Current**: "CycleTime is a specialized MCP server for project orchestration"

**Proposed**: "CycleTime is a comprehensive project orchestration plugin for Claude Code that provides cross-session continuity, professional issue tracking, and dependency management—all with an embedded database for complete offline operation."

**Marketplace Tagline**: "Project orchestration for solo developers: Epic → Story → Subtask hierarchy, dependency tracking, and cross-session memory—no external services required."

---

## References

* **Detailed Analysis**: [Plugin Marketplace Architecture](../concepts/plugins/plugin-marketplace-architecture.md)
* **Implementation Plan**: [SPI-912 Implementation Backlog](SPI-912-implementation-backlog.md)
* **Anthropic Docs**: https://www.anthropic.com/news/claude-code-plugins
* **Plugin Marketplaces**: https://docs.claude.com/en/docs/claude-code/plugin-marketplaces

---

**Decision Status**: APPROVED
**Next Steps**: Begin Phase 1 execution with SPI-921 (GraalVM Compatibility Research)
