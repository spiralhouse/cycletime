---
title: "Development Decision Guide"
type: reference
domain: [development, architecture]
description: "Unified decision trees and flowcharts for selecting development workflows, agent types, and execution patterns based on task characteristics"
dependencies: []
related: [agents.md, worktree-operations.md]
keywords: [decision-trees, workflows, agent-selection, parallel-development, patterns]
last_updated: 2025-10-21
---

# Development Decision Guide

Unified decision trees for CycleTime development workflows and patterns.

## Master Decision Flow

```mermaid
flowchart TD
    A[Development Task] --> B{Multiple Independent Features?}
    B -->|Yes| C[Parallel Development Path]
    B -->|No| D[Single Feature Path]

    C --> E{Features Well-Defined?}
    E -->|Yes| F[Claude CLI Agents + Worktrees]
    E -->|No| G[Task Tool Planning First]
    G --> H[Then Claude CLI Execution]

    D --> I{Conflicts with Main?}
    I -->|Yes| J{Long-running Feature?}
    I -->|No| K[Main Directory Development]

    J -->|Yes| L[Single Worktree + Task Tool Agents]
    J -->|No| M[Feature Branch + Task Tool Agents]
    K --> N[Task Tool Agents]

    F --> O[Monitor via BashOutput]
    H --> O
    L --> P[Interactive Development]
    M --> P
    N --> P

    O --> Q[Coordinate Phase Transitions]
    P --> R[Iterative Refinement]

    Q --> S[Create PRs]
    R --> T[Create PR]

    S --> U[Merge and Cleanup Worktrees]
    T --> V[Merge and Continue]
```

## Agent Selection Decision

```mermaid
flowchart TD
    A[Development Task] --> B{Need Parallel Execution?}
    B -->|No| C[Task Tool Agents]
    B -->|Yes| D{Multiple Features?}
    D -->|No| E{Complex Planning Needed?}
    D -->|Yes| F[Claude CLI Agents - Parallel]
    E -->|Yes| G[Task Tool Agents - Interactive]
    E -->|No| H[Claude CLI Agents - Single]

    C --> I[Use @agent-* delegation]
    F --> J[Use multiple claude CLI commands]
    G --> I
    H --> K[Use single claude CLI command]

    I --> L[Interactive iteration]
    J --> M[Background monitoring]
    K --> N[One-shot execution]
    L --> O[Direct implementation via agents]
    M --> P[Automated coordination]
    N --> Q[Verify results]
```

## Worktree Decision Tree

```mermaid
flowchart TD
    A[Development Task] --> B{Conflicts with Main?}
    B -->|No| C[Main Directory Development]
    B -->|Yes| D{Long-running Feature?}
    D -->|No| E[Short Feature Branch]
    D -->|Yes| F[Isolated Worktree]

    C --> G[Standard Git workflow]
    E --> H[Task Tool or Claude CLI]
    F --> I[Claude CLI Agents or Task Tool]

    G --> J{Multiple Features?}
    J -->|No| K[Single feature complete]
    J -->|Yes| L[Consider parallel development]

    H --> M[Feature branch workflow]
    I --> N[Worktree workflow]

    L --> O[Multiple worktrees needed]
    M --> P[Merge to main]
    N --> Q[PR from worktree]
    O --> R[Parallel coordination]

    P --> S[Continue development]
    Q --> T[Cleanup worktree]
    R --> U[Multiple PRs]
```

## Linear Integration Decision

```mermaid
flowchart LR
    A[Linear Issue] --> B{Issue Type}
    B -->|Story/Epic| C[feat/ branch]
    B -->|Bug| D[fix/ branch]
    B -->|Documentation| E[docs/ branch]
    B -->|Testing| F[test/ branch]
    B -->|Maintenance| G[chore/ branch]

    C --> H[feat/spi-XXX-description]
    D --> I[fix/spi-XXX-description]
    E --> J[docs/spi-XXX-description]
    F --> K[test/spi-XXX-description]
    G --> L[chore/spi-XXX-description]

    H --> M[Update Linear to In Progress]
    I --> M
    J --> M
    K --> M
    L --> M

    M --> N[Development Work]
    N --> O[Create PR]
    O --> P[Update Linear to In Review]
    P --> Q[PR Review]
    Q --> R{PR Approved?}
    R -->|No| S[Update Linear to Todo/In Progress]
    R -->|Yes| T[Merge PR]
    T --> U[Update Linear to Done]
```

## Workflow Selection Matrix

| Scenario | Agent Type | Environment | Best For |
|----------|------------|-------------|----------|
| **Single feature, planning needed** | Task Tool | Main directory | Interactive development |
| **Single feature, well-defined** | Task Tool or Claude CLI | Main directory or worktree | Fast implementation |
| **Multiple features, need coordination** | Task Tool (≤10 parallel) | Multiple worktrees | Coordinated parallel development |
| **Multiple features, independent** | Claude CLI or Task Tool | Multiple worktrees | Autonomous or coordinated parallel |
| **Bug fix, simple** | Task Tool | Main directory | Quick fixes |
| **Bug fix, complex** | Task Tool | Worktree | Isolated debugging |
| **Architecture decisions** | Task Tool | Main directory | Design and planning |
| **Long-running workflows** | Claude CLI | Any | Session-independent automation |

## Decision Criteria Reference

### Use Main Directory When:
- [ ] Small features or bug fixes
- [ ] Low conflict probability with ongoing work
- [ ] Quick implementation (< 1 day)
- [ ] Documentation updates
- [ ] Test additions
- [ ] Configuration changes

### Use Single Worktree When:
- [ ] Large features (multiple days)
- [ ] Database schema changes
- [ ] Architectural modifications
- [ ] Experimental work
- [ ] Need to preserve main for demos/releases
- [ ] High conflict probability

### Use Multiple Worktrees When:
- [ ] Multiple independent features requested
- [ ] Features have clear boundaries
- [ ] Minimal overlap between features
- [ ] Team members working on different features
- [ ] Need to test different approaches in parallel

### Use Task Tool Agents When:
- [ ] Need interactive problem-solving
- [ ] Require deep code analysis
- [ ] Want iterative refinement
- [ ] Need role-based expertise
- [ ] Working on architectural decisions
- [ ] Exploring or researching solutions

### Use Claude CLI Agents When:
- [ ] Need parallel execution across worktrees
- [ ] Want background processing
- [ ] Have well-defined batch tasks
- [ ] Need isolated execution contexts
- [ ] Working on multiple independent features
- [ ] Automating workflows without interaction
- [ ] Running long-running background tasks

## Common Decision Patterns

### Pattern 1: Simple Feature
```
Single feature + Well-defined + Low conflict
→ Main directory + Task Tool agents
```

### Pattern 2: Complex Feature
```
Single feature + Complex + High conflict potential
→ Single worktree + Task Tool agents
```

### Pattern 3: Multiple Features
```
Multiple features + Independent + Clear boundaries
→ Multiple worktrees + Claude CLI agents
```

### Pattern 4: Research Task
```
Unknown requirements + Need exploration
→ Main directory + Task Tool agents
```

### Pattern 5: Automated Task
```
Well-defined + Batch operation + Background execution
→ Claude CLI agents + Appropriate environment
```

## Integration Points

This decision guide integrates with:
- [Agent Reference](agents.md) - Agent capabilities and selection
- [Worktree Operations](worktree-operations.md) - Worktree setup and management
- [Single Feature Workflow](../development/single-feature-workflow.md) - Single feature process
- [Parallel Development](../testing/parallel-development.md) - Multi-feature coordination
- [Linear Integration](../development/linear-branch-integration.md) - Issue tracking

## Quick Decision Checklist

**Before Starting Development:**
1. [ ] How many features am I working on? (Single vs Multiple)
2. [ ] Do I need parallel execution? (Task Tool vs Claude CLI)
3. [ ] Will this conflict with main? (Main directory vs Worktree)
4. [ ] Is this well-defined or exploratory? (Interactive vs Automated)
5. [ ] What's my time constraint? (Speed vs Quality trade-offs)

**Answer these five questions to determine your optimal development approach.**