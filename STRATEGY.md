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

## Technical Architecture

### Core Principles
1. **Local-first**: All data under developer control
2. **Offline-capable**: Full functionality without internet
3. **Provider-agnostic**: Unified interface across issue trackers
4. **Progressive complexity**: Simple defaults, flexible when needed

### Technology Stack
- **Backend**: JVM-based (Kotlin) for JCVD/CE
- **Database**: Embedded H2 for CE, provider-based for EE
- **MCP Integration**: stdio/HTTP transport for Claude Code
- **Dashboard**: Web-based (planned)
- **Testing**: Comprehensive unit and integration tests (96.91% domain coverage achieved)

### Provider Architecture
```kotlin
interface IssueProvider {
    fun createIssue(data: IssueData): Issue
    fun updateIssue(id: String, data: IssueData): Issue
    // ... other operations
}

// CE includes only:
class EmbeddedH2Provider : IssueProvider  // Zero configuration

// EE adds:
class LinearProvider : IssueProvider      // Requires API keys
class JiraProvider : IssueProvider        // Requires API keys
class GitHubProvider : IssueProvider      // Requires API keys
```

## Development Roadmap

### Current Sprint (August 2025)
- [x] Complete SPI-346: Cross-session state persistence
- [ ] Rebrand JCVD documentation to CycleTime CE
- [ ] Consolidate Linear projects (rename JCVD → CycleTime CE)
- [ ] Continue Phase 1 MVP development
- [ ] Create STRATEGY.md to capture decisions

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

**Target State**:
```
cycletime/               # Renamed from jcvd
├── ce/                  # Current JCVD code
├── ee/                  # Future enterprise features
├── shared/              # Common components
└── docs/
    ├── ce/             # CE documentation
    └── ee/             # EE documentation
```

### Linear Project Organization

**Current**: 
- JCVD project (active development)
- CycleTime project (planning only)

**Target**:
- Single "CycleTime CE" project (renamed from JCVD)
- Archive original CycleTime project
- All issues consolidated with history preserved

### Branding Timeline

1. **Week 1**: Documentation uses "CycleTime CE" 
2. **Week 2**: Linear project renamed
3. **Week 4**: GitHub repo renamed (after MVP)
4. **Week 6**: Public announcement of CycleTime CE

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