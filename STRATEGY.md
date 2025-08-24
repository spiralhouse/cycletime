# CycleTime Strategy & Roadmap

## Executive Summary

**Strategic Decision**: Consolidate JCVD and CycleTime into a unified product line with Community Edition (CE) and Enterprise Edition (EE) variants. JCVD becomes CycleTime CE, maintaining its focus on solo developers while providing a clear upgrade path to enterprise features.

**Current Status**: Actively developing in JCVD repository with working session management (SPI-346 completed). Planning rebrand to CycleTime CE while maintaining development momentum.

## Product Vision

CycleTime enables solo developers and teams to orchestrate entire software projects through Claude Code, providing structured project management with AI-powered intelligence and cross-session continuity.

## Product Positioning

### CycleTime CE (Community Edition) - formerly JCVD
- **Target**: Solo developers, freelancers, small teams (1-4 people), open source projects
- **Core Value**: Project orchestration for Claude Code users with zero configuration
- **Key Differentiator**: Embedded issue tracking that "just works" - no external dependencies
- **Key Features**: 
  - Embedded H2 issue tracking (offline-first, zero configuration)
  - MCP integration for Claude Code enhancement
  - Project bootstrap and requirements gathering
  - Cross-session project continuity
  - Professional documentation templates
  - Dashboard for observability
- **Price**: Free forever, AGPL v3 licensed
- **Philosophy**: "Batteries included" - everything works out of the box

### CycleTime EE (Enterprise Edition)
- **Target**: Teams 5-50 developers, enterprises requiring tool integration
- **Core Value**: Multi-team coordination with existing enterprise tools
- **Key Features**: Everything in CE plus:
  - External integrations (Linear, Jira, GitHub Issues)
  - Multi-team coordination and cross-project dependencies
  - Contract-first development tools
  - Enterprise standards enforcement with compliance reporting
  - Multi-provider AI model orchestration with cost optimization
  - SSO, audit logs, enterprise security features
  - Priority support and SLAs
- **Price**: TBD (considering per-seat, per-project, or usage-based)
- **Philosophy**: "Integrate with everything" - works with existing enterprise tools

## Key Strategic Decisions

### Decision 1: Product Consolidation (2025-08-21)

**Context**: Maintaining two separate products (JCVD for solo devs, CycleTime for enterprises) creates unnecessary complexity and splits development effort.

**Decision**: Consolidate into CE/EE model under single CycleTime brand.

**Rationale**:
- Natural feature progression from solo → team → enterprise
- Community-driven adoption creates enterprise funnel  
- Single brand reduces marketing complexity
- Dog-fooding: Build EE using CE ensures CE remains powerful
- Successful precedent: GitLab, Elastic, Grafana model

### Decision 2: Monolithic Architecture for CE (2025-08-21)

**Context**: Considered decoupling embedded H2 database as separate "CycleTime Issues" service.

**Decision**: Keep embedded H2 as integral part of CE monolith.

**Rationale**:
- "It just works" is killer feature for solo developers
- Complexity is the enemy of adoption
- GitLab succeeded with "everything in one" approach
- Reduces support burden (one product, not two)
- Progressive disclosure: Simple for CE, flexible for EE

**Architecture**:
```
CycleTime CE: Monolithic with embedded H2
CycleTime EE: Same core + provider interface for external integrations
```

### Decision 3: Migration Strategy (2025-08-21)

**Context**: JCVD has working code and momentum, CycleTime repo is empty shell.

**Decision**: Gradual migration preserving development momentum.

**Sequence**:
1. **Immediate**: Rebrand documentation in JCVD repo to CycleTime CE
2. **This Week**: Rename Linear project from JCVD to CycleTime CE  
3. **Next 2-3 Weeks**: Continue development in JCVD repo
4. **After MVP**: Rename GitHub repository from jcvd to cycletime

**Rationale**:
- Don't disrupt active development
- Documentation rebrand is non-disruptive
- Linear supports project renaming without breaking issues
- Repository rename can wait for natural breakpoint

### Decision 4: Licensing Strategy (2025-08-21)

**Decision**: AGPL v3 for both CE and EE initially.

**Rationale**:
- Forces competitors to open-source improvements
- Allows paid SaaS hosting of both editions
- Enables future dual-licensing for enterprise customers
- Builds community goodwill

**Future Options**:
- Pure open source + paid hosting (current plan)
- Open core model (AGPL CE + proprietary EE extensions)
- Dual licensing (AGPL default + commercial license)

## Branding Guidelines

### Product vs Edition Naming

**CycleTime** (the product):
- Use when referring to the overall product line or features common to both editions
- Use in general value propositions and marketing messages
- Use when describing the core functionality that both editions share
- Examples:
  - "CycleTime enables project orchestration through Claude Code"
  - "The CycleTime dashboard provides real-time visibility"
  - "Configure CycleTime for your workflow"

**CycleTime CE** (Community Edition):
- Use when specifically discussing the free, open-source edition
- Use when highlighting CE-specific features or limitations
- Use in download links, installation guides specific to CE
- Examples:
  - "CycleTime CE includes embedded issue tracking"
  - "Download CycleTime CE for free"
  - "CycleTime CE is perfect for solo developers"

**CycleTime EE** (Enterprise Edition):
- Use when discussing enterprise-specific features
- Use in pricing discussions and enterprise sales materials
- Use when describing integrations not available in CE
- Examples:
  - "CycleTime EE integrates with Linear and Jira"
  - "Upgrade to CycleTime EE for team collaboration"
  - "CycleTime EE includes priority support"

### Technical Naming Conventions

**Configuration & Data** (Shared between editions):
```
.cycletime/                 # Configuration directory (NOT .cycletime-ce)
cycletime.db               # Database file (NOT cycletime-ce.db)
cycletime.conf             # Configuration file
```

**Package Names** (Maintain for compatibility):
```
io.spiralhouse.jcvd        # Keep existing package structure for now
```

**Docker Images**:
```
cycletime:latest           # Latest stable release (defaults to CE)
cycletime:ce               # Explicitly CE edition
cycletime:ee               # Enterprise edition
cycletime:2.0.0            # Specific version (defaults to CE)
cycletime:2.0.0-ce         # Explicit CE version
cycletime:2.0.0-ee         # Explicit EE version
```

**Binary & JAR Names**:
```
cycletime.jar              # Main executable (edition determined by license)
cycletime-cli              # Command-line interface
```

### Documentation Guidelines

**Page Titles**:
- Use "CycleTime" for shared documentation
- Add edition suffix only for edition-specific content
- Examples:
  - "CycleTime Installation Guide" (covers both)
  - "CycleTime CE Quick Start" (CE-specific)
  - "CycleTime EE Integration Guide" (EE-specific)

**In-Text References**:
- First mention: Use full name with edition if relevant
- Subsequent mentions: Can use "CycleTime" alone if context is clear
- Be explicit when features differ between editions

**Correct Examples**:
- "CycleTime provides project orchestration for Claude Code"
- "Install CycleTime CE to get started with embedded issue tracking"
- "CycleTime stores its configuration in the `.cycletime` directory"
- "Both CycleTime CE and EE share the same core architecture"

**Incorrect Examples**:
- ❌ "CycleTime CE provides..." (when feature is in both editions)
- ❌ "Install CycleTime CE EE" (confusing)
- ❌ ".cycletime-ce directory" (breaks upgrade path)
- ❌ "The CycleTime CE product" (redundant, use "CycleTime CE" alone)

### Practical Application Examples

**README.md Header**:
```markdown
# CycleTime

Project orchestration framework for Claude Code, available in Community (CE) and Enterprise (EE) editions.
```

**Installation Section**:
```markdown
## Installation

CycleTime can be installed via Docker, JAR, or from source:

### Docker (Recommended)
docker pull cycletime:latest  # Defaults to CE
docker run -v ~/.cycletime:/root/.cycletime cycletime:latest

### For Enterprise Edition
Contact sales for EE license, then:
docker pull cycletime:ee
```

**Feature Comparison Table**:
```markdown
| Feature | CycleTime CE | CycleTime EE |
|---------|--------------|--------------|
| Embedded Issue Tracking | ✓ | ✓ |
| Claude Code MCP | ✓ | ✓ |
| Linear Integration | - | ✓ |
| Multi-team Support | - | ✓ |
```

**Error Messages**:
```
# When EE feature accessed without license:
"Linear integration requires CycleTime EE. Upgrade at cycletime.dev/upgrade"

# Generic errors (no edition mention):
"Failed to connect to CycleTime database"
```

## Technical Architecture

### Core Principles
1. **Local-first**: All data under developer control
2. **Offline-capable**: Full functionality without internet
3. **Provider-agnostic**: Unified interface across issue trackers
4. **Progressive complexity**: Simple defaults, flexible when needed
5. **Edition Compatibility**: Seamless upgrade path from CE to EE

### Shared Architecture Model

Both CycleTime CE and EE share the same core codebase with feature flags and licensing controlling available functionality:

```
CycleTime Core (Shared)
├── Domain Layer           # Business logic (100% shared)
├── Application Layer       # Use cases (100% shared)
├── Infrastructure Layer    # Providers & integrations
│   ├── Embedded H2        # Always available
│   └── External Providers # EE-only (Linear, Jira, GitHub)
├── MCP Layer              # Claude Code integration (100% shared)
└── Configuration Layer     # Edition detection & feature flags
```

### Technology Stack
- **Backend**: JVM-based (Kotlin) - single codebase for both editions
- **Database**: Embedded H2 (always available) + external providers in EE
- **MCP Integration**: stdio/HTTP transport for Claude Code
- **Dashboard**: Web-based (shared UI, features vary by edition)
- **Testing**: Comprehensive unit and integration tests (96.91% domain coverage achieved)

### Edition Detection & Feature Enablement

```kotlin
// Shared configuration approach
class CycleTimeConfig {
    val edition: Edition = detectEdition()  // CE or EE based on license
    val features: Set<Feature> = edition.enabledFeatures()
    val providers: List<IssueProvider> = loadProviders(edition)
}

// Feature flags control available functionality
enum class Feature {
    EMBEDDED_ISSUES,      // ✓ CE, ✓ EE
    PROJECT_TEMPLATES,    // ✓ CE, ✓ EE
    LINEAR_INTEGRATION,   // ✗ CE, ✓ EE
    JIRA_INTEGRATION,     // ✗ CE, ✓ EE
    MULTI_TEAM,          // ✗ CE, ✓ EE
    AUDIT_LOGS,          // ✗ CE, ✓ EE
}
```

### Provider Architecture
```kotlin
interface IssueProvider {
    fun createIssue(data: IssueData): Issue
    fun updateIssue(id: String, data: IssueData): Issue
    // ... other operations
}

// Always available in both editions:
class EmbeddedH2Provider : IssueProvider  // Zero configuration

// EE adds these via feature flags:
class LinearProvider : IssueProvider      // Requires API keys + EE license
class JiraProvider : IssueProvider        // Requires API keys + EE license
class GitHubProvider : IssueProvider      // Requires API keys + EE license
```

### Upgrade Path Architecture

The architecture ensures zero-friction upgrade from CE to EE:

1. **Shared Configuration**: `.cycletime/` directory used by both editions
2. **Shared Database**: `cycletime.db` persists through upgrade
3. **License Activation**: Drop in license file to enable EE features
4. **No Migration Required**: EE features activate in-place
5. **Graceful Degradation**: Remove license to revert to CE features

## Development Roadmap

### Current Sprint (August 2025)
- [x] Complete SPI-346: Cross-session state persistence
- [x] Create STRATEGY.md to capture decisions
- [ ] Update documentation following branding guidelines
- [ ] Consolidate Linear projects (rename JCVD → CycleTime)
- [ ] Continue Phase 1 MVP development

### Phase 1: Core MCP Server with Dashboard (September 2025)
**Goal**: Basic functionality with observability

**Deliverables**:
- Embedded H2 provider with optimized schema
- Basic issue CRUD operations
- Epic → Story → Subtask hierarchy
- MCP Resources for Claude Code integration
- Read-only dashboard for observability
- Simple project bootstrap

**Success Criteria**:
- Create projects with issue hierarchy
- MCP Resources provide context to Claude Code
- Cross-session continuity works
- Dashboard provides system visibility

### Phase 2: Essential Context Provision (October 2025)
**Goal**: Enhanced intelligence and context awareness

**Deliverables**:
- Dependency tracking (blocks/blocked-by)
- Context provision engine
- Project templates and scaffolding
- Enhanced dashboard with dependency visualization

**Success Criteria**:
- Claude Code receives rich project context
- Dependencies guide task recommendations
- Templates accelerate project setup

### Phase 3: Provider Expansion (November 2025)
**Goal**: First external integration (Linear)

**Deliverables**:
- Linear provider implementation
- Migration tools (H2 → Linear)
- Provider sync status in dashboard

**Success Criteria**:
- Seamless Linear integration
- Data migration preserves relationships
- CE users can upgrade to EE features

### Future Phases (December 2025+)
- GitHub Issues integration
- Jira integration (if demand exists)
- Enterprise features based on CE user feedback
- Contract-first development tools
- Standards enforcement engine

## Migration Plan

### Repository Organization

**Current State**:
```
jcvd/                    # Active development
└── (working code)       # SPI-346 completed

cycletime/               # Empty shell  
└── docs/PRD.md         # Documentation only
```

**Target State** (Single Codebase Model):
```
cycletime/               # Renamed from jcvd
├── src/                 # Shared codebase (not split by edition)
│   ├── domain/         # Core business logic (100% shared)
│   ├── application/    # Use cases (100% shared)
│   ├── infrastructure/ # Providers (feature-flagged)
│   └── mcp/           # MCP integration (100% shared)
├── config/
│   └── editions.conf   # Edition feature definitions
└── docs/
    ├── shared/         # Documentation for both editions
    ├── ce/            # CE-specific documentation
    └── ee/            # EE-specific documentation
```

**Important**: We maintain a single codebase with feature flags, NOT separate directories for CE/EE code. This ensures maximum code reuse and simplifies maintenance.

### Configuration & Data Migration

**Shared Infrastructure** (Both editions use the same):
```
~/.cycletime/           # User configuration directory
├── cycletime.conf      # Main configuration
├── cycletime.db        # Embedded database (H2)
├── license.key         # EE license file (if present)
└── providers/          # External provider configs (EE)
```

**Upgrade Path from CE to EE**:
1. User installs CycleTime (defaults to CE functionality)
2. User adds `license.key` to `.cycletime/` directory
3. System detects license and enables EE features
4. Existing data and configuration remain intact
5. No migration scripts or data conversion required

### Linear Project Organization

**Current**: 
- JCVD project (active development)
- CycleTime project (planning only)

**Target**:
- Single "CycleTime" project (renamed from JCVD, not "CycleTime CE")
- Archive original CycleTime project
- All issues consolidated with history preserved
- Use labels to distinguish CE vs EE features

### Branding Timeline

1. **Week 1**: Documentation updated with branding guidelines
2. **Week 2**: Linear project renamed to "CycleTime" 
3. **Week 4**: GitHub repo renamed (after MVP)
4. **Week 6**: Public announcement of CycleTime with CE/EE editions

## Business Model

### Revenue Streams

**CycleTime CE**:
- Free forever for core features
- Optional paid cloud hosting
- Optional paid support contracts
- Training and consulting services

**CycleTime EE**:
- Subscription licensing (per-seat or per-project)
- Cloud hosting with SLA
- Enterprise support contracts
- Professional services

### Go-to-Market Strategy

1. **Build community with CE** (Q3-Q4 2025)
   - Launch on Product Hunt, Hacker News
   - Create Discord/GitHub Discussions community
   - Content marketing (blog posts, tutorials)

2. **Identify enterprise needs** (Q4 2025 - Q1 2026)
   - Survey CE users about team needs
   - Track feature requests for EE roadmap
   - Build relationships with potential customers

3. **Launch EE** (Q1-Q2 2026)
   - Beta with 5-10 enterprise customers
   - Refine based on feedback
   - GA launch with clear CE→EE upgrade path

## Success Metrics

### CycleTime CE
- 1,000+ GitHub stars within 6 months
- 100+ active projects within 3 months
- 80% user retention after 30 days
- 90% positive sentiment in user feedback

### CycleTime EE
- 10 paying customers within 3 months of launch
- $10K MRR within 6 months
- 90% customer retention rate
- 5% CE→EE conversion rate

## Open Questions

- [ ] **Pricing Model**: Per-seat vs per-project vs usage-based for EE?
- [ ] **Hosting Infrastructure**: Kubernetes vs simpler container orchestration?
- [ ] **Community Platform**: Discord vs GitHub Discussions vs Slack?
- [ ] **Documentation Platform**: Docusaurus vs MkDocs vs custom?
- [ ] **EE Feature Priorities**: Which enterprise features to build first?
- [ ] **Support Model**: Community forum vs ticketing system for CE?

## Risk Mitigation

### Technical Risks
- **Risk**: MCP protocol changes break integration
- **Mitigation**: Active monitoring of Claude Code updates, version pinning

### Business Risks  
- **Risk**: Slow CE adoption
- **Mitigation**: Focus on Claude Code community, clear value prop

### Competitive Risks
- **Risk**: Anthropic or competitors build similar tooling
- **Mitigation**: Move fast, build community moat, focus on integration depth

## Decision Log

- **2025-08-21**: Consolidated JCVD and CycleTime into CE/EE model
- **2025-08-21**: Chose monolithic architecture with embedded H2 for CE
- **2025-08-21**: Decided on gradual migration preserving momentum
- **2025-08-21**: Selected AGPL v3 licensing for both editions
- **2025-08-21**: Created STRATEGY.md as living strategy document

---

*Last Updated: 2025-08-21*
*Next Review: 2025-09-01*