---
description: Analyze Linear issue and create comprehensive development plan
argument-hint: "[SPI-xxx]"
allowed-tools: mcp__linear-server__get_issue, mcp__linear-server__update_issue, mcp__linear-server__create_comment, Grep, Read, Glob
model: opus
---

# /develop - Development Manager Workflow

This command implements the Development Manager workflow for analyzing Linear issues and creating comprehensive development plans. It's the centerpiece of our development workflow automation.

## What This Command Does

When you run `/develop SPI-xxx`, Claude will:

1. Fetch the complete Linear issue hierarchy (subtask → story → epic)
2. Search and analyze relevant project documentation
3. Perform deep analysis of scope, complexity, and technical approach
4. Determine agent delegation strategy with think levels
5. Ask clarifying questions if needed
6. Post the development plan to Linear as a comment
7. Transition the issue to "In Progress"
8. Present a comprehensive development plan with next steps

## Workflow Instructions

Follow these steps in order using ULTRATHINK analysis mode. Be thorough but respect YAGNI principles.

### Step 1: Fetch Linear Issue Hierarchy

**Objective**: Build complete context from the issue and all its parents.

**Actions**:
1. Use `mcp__linear-server__get_issue` to fetch the issue `$1` (the Linear issue ID argument)
2. Examine the response for the `parentId` field
3. If a parent exists, recursively fetch it:
   - Subtask → fetch parent Story
   - Story → fetch parent Epic
   - Continue until reaching top-level Epic or no more parents
4. Build a complete hierarchy map showing relationships

**Important**:
- Handle cases where issues have no parents gracefully
- Handle issues that are already top-level epics
- Be defensive against circular references (shouldn't happen, but check)
- Store parent issue descriptions for context

**Example Output Structure**:
```
Epic: [SPI-1132] Core Provider Implementation
  └─ Story: [SPI-1140] Implement SSH Integration
      └─ Subtask: [SPI-1146] Create SSH Info Action ← **This Issue**
```

### Step 2: Search Related Documentation

**Objective**: Find and analyze relevant project documentation to inform the plan.

**Actions**:
1. Search `docs/` directory for relevant documentation:
   - Always check: `docs/reference/PRD.md` (product requirements)
   - Always check: `docs/architecture/overview.md` (technical architecture)
   - Search for domain-specific docs based on issue keywords
2. Use `Grep` to search for:
   - Feature names mentioned in the issue
   - Technical terms from issue description
   - Component names (e.g., "MCP", "Workflow", "Session", "Repository")
   - Related class or module names
   - Domain keywords (authentication, testing, deployment)
3. Use `Read` to review relevant sections of found documents
4. Build a knowledge base of:
   - Existing design decisions
   - Architecture constraints
   - Related features
   - Technical patterns to follow

**Search Strategy**:
- Start with exact phrase matches in file names
- Then search content with keywords
- Check both concepts/, patterns/, guides/, examples/, reference/
- Prioritize patterns and guides over examples

**Documentation Structure Reference**:
- **Concepts** (`docs/concepts/`) - Foundational knowledge
- **Patterns** (`docs/patterns/`) - Implementation approaches
- **Examples** (`docs/examples/`) - Working code samples
- **Guides** (`docs/guides/`) - Step-by-step procedures
- **Reference** (`docs/reference/`) - Quick lookups

**If No Documentation Found**:
- Note this in the analysis
- Flag that design documentation may need to be created
- Proceed with plan based on issue description and project conventions

### Step 3: Deep Analysis ("Ultrathink")

**Objective**: Comprehensively analyze the work to create an informed development plan.

**Perform Analysis On**:

#### Scope & Complexity
- What exactly needs to be built/changed?
- What is explicitly in scope?
- What is explicitly out of scope?
- How does this fit into the larger feature/epic?
- What is the estimated complexity? (Use Fibonacci: 1, 2, 3, 5, 8, 13, 21)
  - 1 point: Trivial - straightforward implementation
  - 2 points: Simple - well-understood requirements
  - 3 points: Moderate - some architectural decisions needed
  - 5 points: Moderately complex - multiple integrations
  - 8 points: Complex - substantial architectural work
  - 13 points: Very complex - major feature, consider decomposition
  - 21 points: Too large - needs breakdown

#### Technical Approach
- What is the high-level implementation strategy?
- Which existing components will be modified?
- Which new components need to be created?
- What are the key technical decisions needed?
- Are there multiple viable approaches? (compare if so)
- What patterns from existing code should be followed?
- What are the Kotlin/Ktor/DDD specific considerations?

#### YAGNI Assessment
**Critical**: Apply "You Ain't Gonna Need It" principles:
- Are we building only what's needed NOW?
- Are we avoiding over-engineering?
- Are we designing for current requirements, not hypothetical futures?
- Can we simplify the approach?
- What's the minimum viable implementation?
- Are we following the principle: "The simplest thing that could possibly work"?

#### Design Document Assessment
Determine if a technical design document is needed:

**Create Design Doc IF**:
- Architectural changes required
- New major components/systems
- Complex integrations
- Significant API changes
- Multiple implementation approaches to compare
- High technical risk

**Skip Design Doc IF**:
- Small feature additions
- Bug fixes
- Documentation updates
- Simple, straightforward implementations
- Well-established patterns being followed

#### Testing Requirements
- What test category: unit, integration, or system?
- What are the critical paths that must be tested?
- Unit tests needed? (business logic, domain models)
- Integration tests needed? (database, infrastructure)
- System tests needed? (performance, end-to-end)
- Edge cases to cover?
- Performance considerations?

**Testing Standards Reference**:
- Unit: Fast, isolated, no external dependencies
- Integration: Real components with controlled infrastructure
- System: End-to-end workflows with production-like conditions

#### Documentation Updates
- README changes needed?
- API documentation?
- User guides?
- Examples?
- YAML frontmatter for new docs?
- Cross-reference updates needed?

#### Technical Risks & Mitigation
- What could go wrong?
- Dependencies on external systems?
- Compatibility concerns (Kotlin, Ktor, Exposed versions)?
- Performance risks?
- Database migration risks?
- How to mitigate each risk?

### Step 4: Agent Delegation Strategy

**Objective**: Determine the sequence of agent handoffs with appropriate think levels.

**Available Agents**:
- **@agent-qa**: Test writing and TDD RED phase
- **@agent-developer**: Implementation and TDD GREEN phase
- **@agent-software-architect**: Architecture design and REFACTOR analysis
- **@agent-code-reviewer**: Code quality and security review
- **@agent-devops-engineer**: Infrastructure and deployment
- **@agent-documentation-writer**: Documentation updates
- **@agent-context-engineer**: Context preparation for multi-agent workflows

**Think Level Assignment Strategy**:

Base assignment on complexity + domain + escalation needs:
- **Simple issues (1-3 points)**: `think` (standard reasoning)
- **Moderate issues (5-8 points)**: `think hard` (deep analysis)
- **Complex issues (13+ points)**: `think harder` (comprehensive analysis)
- **Critical/GA blockers**: `ultrathink` (maximum reasoning depth)

**Special Cases**:
- Documentation restructuring: Always `ultrathink`
- Security implementations: Always `think harder` or `ultrathink`
- Architecture decisions: Always `think harder` or `ultrathink`
- Complex refactoring: Always `think harder`

**Workflow Selection Logic**:
```
IF (issue involves business logic OR API design OR data layer) THEN
    workflow = "TDD"
    agents = ["qa", "developer", "code-reviewer"]
    think_levels = [complexity_level, complexity_level, "think hard"]
ELSE IF (issue involves UI OR simple configuration) THEN
    workflow = "Direct Implementation"
    agents = ["developer", "code-reviewer"]
    think_levels = [complexity_level, "think hard"]
ELSE IF (issue involves architecture OR performance) THEN
    workflow = "Architecture-First"
    agents = ["software-architect", "developer", "qa", "code-reviewer"]
    think_levels = ["think harder", complexity_level, complexity_level, "think hard"]
END IF
```

**Context Engineer Invocation**:
**ALWAYS invoke @agent-context-engineer for 2+ agents**:
- Prepare domain-specific context packages
- Filter documentation by domain tags
- Auto-include prerequisite topics
- Optimize token usage through focused selection

**Determine Delegation Sequence**:

**For TDD Workflow (Recommended for business logic, APIs, data layer)**:
1. **@agent-qa** (RED phase, think level: [complexity])
   - Write failing tests that define expected behavior
   - Cover happy path, edge cases, error conditions
   - Success: Tests fail with meaningful error messages

2. **@agent-developer** (GREEN phase, think level: [complexity])
   - Implement minimal code to make tests pass
   - Follow DDD principles and Ktor patterns
   - Success: All tests pass (new + existing)

3. **@agent-software-architect** (REFACTOR analysis, think level: think harder)
   - Analyze for patterns, duplication, design improvements
   - Identify code smells or design issues
   - Provide refactoring strategy with rationale
   - Success: Clear refactoring strategy provided

4. **@agent-developer** (REFACTOR execution, think level: [complexity])
   - Implement refactoring strategy
   - Maintain passing tests throughout
   - Success: Improved code, all tests green

5. **@agent-qa** (REFACTOR verification, think level: think)
   - Run complete test suite
   - Confirm no regressions
   - Success: Green test suite after refactoring

6. **@agent-code-reviewer** (think level: think hard - always enhanced)
   - Final review: quality, security, tests, approval
   - Focus on domain-specific concerns
   - Success: Approval for merge

**For Direct Implementation (UI, configuration, simple features)**:
1. **@agent-developer** (think level: [complexity])
2. **@agent-code-reviewer** (think level: think hard)

**For Bug Fixes**:
1. **@agent-developer** (think level: [complexity]) - Fix + regression tests
2. **@agent-code-reviewer** (think level: think hard) - Review fix

**For Architecture Changes**:
1. **@agent-software-architect** (think level: think harder) - Design
2. **@agent-developer** (think level: think hard) - Implement
3. **@agent-qa** (think level: think hard) - Test
4. **@agent-code-reviewer** (think level: think harder) - Review

**Provide Clear Context for Each Agent**:
- What they need to build/test/document
- Relevant design decisions from documentation search
- Constraints and requirements from issue
- Success criteria (specific and measurable)
- Files they'll likely need to modify
- Package structure: `io.spiralhouse.cycletime.*`
- Technology constraints: Kotlin/JVM 21, Ktor 3.3.1, Exposed ORM, H2

### Step 5: Identify Clarifying Questions

**Objective**: Surface any ambiguities or decisions needed before starting work.

**Check For**:
- Unclear requirements in the issue description
- Multiple valid implementation approaches
- Missing acceptance criteria
- Scope boundary questions
- Technical decision points requiring input
- Priority trade-offs

**If Questions Exist**:
- List them clearly in the development plan
- Explain why each question matters
- Suggest default approaches if applicable
- Note that work should not proceed until questions are answered

**Don't Ask Questions About**:
- Things clearly documented in PRD or DESIGN
- Standard patterns established in the codebase
- Decisions already made in parent Epic/Story
- Over-engineering concerns (apply YAGNI instead)

### Step 6: Check for Subtask/Issue Breakdown Needs

**Objective**: Identify if the work should be broken down further.

**Consider Recommending Breakdown IF**:
- Story is > 13 points (too large for efficient sprint)
- Multiple distinct technical components involved
- Work can be parallelized across multiple agents
- Clear separation of concerns exists
- Dependencies can be completed independently

**DO NOT Create Issues Automatically**:
- Flag the recommendation in the plan
- Explain rationale for breakdown
- Suggest issue titles and scope
- Ask user to approve before creating

### Step 7: Post Development Plan to Linear

**Objective**: Post the development plan as a comment on the Linear issue.

**Actions**:
1. Generate the formatted development plan (see Step 8 format below)
2. Use `mcp__linear-server__create_comment` to post the plan:
   - Issue ID: `$1`
   - Body: The formatted development plan markdown

**Error Handling**:
- If comment posting fails, provide the plan text for manual posting
- Note the failure but continue with workflow

### Step 8: Update Issue Status & Present Plan

**Objective**: Transition issue to "In Progress" and present comprehensive plan.

**Actions**:
1. Use `mcp__linear-server__update_issue` to transition the issue:
   - Issue ID: `$1`
   - State: `In Progress`
2. Present the development plan to the user

**Error Handling**:
- If update fails, note this but continue with presenting the plan
- User can manually update status if needed

**Plan Format**:

```markdown
# Development Plan: [Issue Title]

## Executive Summary
[2-3 sentence overview of what needs to be done and why]

## Issue Hierarchy
[Show the full hierarchy: Epic → Story → Subtask]

Epic: [SPI-xxx] [Epic Title]
  └─ Story: [SPI-xxx] [Story Title]
      └─ Subtask: [SPI-xxx] [Subtask Title] ← **This Issue**

## Scope Analysis

### In Scope
- [Specific deliverable 1]
- [Specific deliverable 2]
- [Specific deliverable 3]

### Out of Scope
- [What we're NOT doing]
- [What's deferred to future work]

### YAGNI Notes
[What we're explicitly NOT over-engineering and why]

## Technical Approach

### High-Level Strategy
[Describe the implementation approach in 1-2 paragraphs]

### Technology Stack Context
- Language: Kotlin/JVM 21
- Framework: Ktor 3.3.1 (with native DI)
- ORM: Exposed 0.61.0
- Database: H2 (embedded)
- Architecture: Domain-Driven Design (DDD)
- Package: io.spiralhouse.cycletime.*

### Components to Modify
- `path/to/file.kt` - [What changes]
- `path/to/test.kt` - [What tests]

### Components to Create
- `path/to/new_file.kt` - [What it does]

### Key Design Decisions
1. [Decision 1]: [Rationale]
2. [Decision 2]: [Rationale]

### Design Document Needed?
[YES/NO] - [Rationale]

## Test Strategy

### Test Category
[Unit / Integration / System]

### Test Coverage Plan
- **Unit Tests**: [Specific test scenarios]
  - Location: `src/test/kotlin/`
  - Focus: Business logic, domain models, protocol handlers
  - Target: < 10ms per test

- **Integration Tests**: [If applicable]
  - Location: `src/integrationTest/kotlin/`
  - Focus: Database, infrastructure, API endpoints
  - Target: < 100ms per test

- **System Tests**: [If applicable]
  - Location: `src/systemTest/kotlin/`
  - Focus: Performance, end-to-end workflows
  - Target: < 1s per test

### Expected Coverage
[Percentage or "Critical paths only"]

## Development Workflow

**Selected Workflow**: [TDD / Direct Implementation / Architecture-First / Bug Fix]

**Rationale**: [Why this workflow was selected]

### [If TDD] RED-GREEN-REFACTOR Cycle

#### RED Phase (@agent-qa, think level: [level])
- Write failing tests for [specific functionality]
- Verify tests fail with clear messages
- Test files: [list expected test files]
- Success: Tests exist and fail with informative error messages

#### GREEN Phase (@agent-developer, think level: [level])
- Implement minimal solution to pass tests
- Don't refactor yet - just make it work
- Implementation files: [list files]
- Follow Ktor DI patterns for dependency injection
- Success: All tests pass (new + existing)

#### REFACTOR Phase

1. **@agent-software-architect** (think level: think harder)
   - Analyze for patterns, duplication, design improvements
   - Review against DDD principles
   - Identify code smells or design issues
   - Provide refactoring strategy with rationale
   - Success: Clear refactoring strategy provided

2. **@agent-developer** (think level: [level])
   - Execute software-architect's strategy
   - Maintain passing tests throughout
   - Success: Improved code, all tests green

3. **@agent-qa** (think level: think)
   - Verify all tests still pass
   - Run complete test suite
   - Confirm no regressions
   - Success: Green test suite after refactoring

## Agent Delegation Plan

### Context Engineer Preparation
[If 2+ agents involved]

**@agent-context-engineer** will prepare:
- Domain-specific documentation packages
- Prerequisites and dependencies
- Filtered content by domain tags
- Optimized context for each agent

### Agent Sequence

1. **@agent-[type]** (think level: [level])
   - **Task**: [Specific task description]
   - **Context**: [Domain context and constraints]
   - **Files**: [Expected files to modify/create]
   - **Success Criteria**: [Specific, measurable outcomes]
   - **Dependencies**: [Any prerequisite work]

[Repeat for each agent in sequence]

### Final Review

**@agent-code-reviewer** (think level: think hard)
- **Task**: Comprehensive code review
- **Focus Areas**:
  - Security review [if auth/API changes]
  - Adherence to DDD principles
  - Ktor patterns and native DI usage
  - Error handling and edge cases
  - Test coverage and quality
  - Performance implications
  - Code maintainability
- **Success**: Approval for merge

## Documentation Updates

### Required Updates
- [ ] README.md - [What section, if needed]
- [ ] docs/[type]/[file].md - [What needs updating]
- [ ] YAML frontmatter - [If new docs created]
- [ ] Code comments - [What needs documenting]
- [ ] Cross-references - [Any broken links to fix]

### Documentation Quality Checks
[If documentation is modified]
- [ ] YAML frontmatter present on all new docs
- [ ] Required fields: title, type, domain, description
- [ ] Dependencies declared
- [ ] Cross-references updated
- [ ] Run validation scripts in `docs/.scripts/`

## Success Criteria

**Definition of Done**:
- [ ] [Specific criterion 1]
- [ ] [Specific criterion 2]
- [ ] [Specific criterion 3]
- [ ] All tests passing (baseline: no new failures)
- [ ] Code quality: detekt passing
- [ ] Test coverage: meets threshold
- [ ] Documentation updated (if applicable)
- [ ] Code reviewed and approved
- [ ] Linear issue requirements fully met

## Risks & Mitigation

### Technical Risks
1. **Risk**: [Potential technical issue]
   - **Likelihood**: High/Medium/Low
   - **Impact**: High/Medium/Low
   - **Mitigation**: [How to address]

### Dependencies
- [External dependency 1]: [How it affects us]
- [Technology constraint]: [Compatibility concern]

## Complexity Estimate

**Story Points**: [X points]
**Rationale**: [Why this estimate based on Fibonacci scale]
**Estimated Duration**: [Time estimate based on points]

## Clarifying Questions

[If any questions were identified in Step 5]

1. **Question**: [The question]
   - **Why It Matters**: [Rationale]
   - **Suggested Default**: [If applicable]
   - **Blocking**: [YES/NO - can work proceed without answer?]

[If no questions: "No clarifying questions - requirements are clear."]

## Recommended Issue Breakdown

[If subtask creation is recommended from Step 6]

**Recommendation**: Break this issue into [N] subtasks:

1. **[Subtask Title 1]** ([X] points)
   - **Scope**: [What it covers]
   - **Rationale**: [Why separate]

2. **[Subtask Title 2]** ([X] points)
   - **Scope**: [What it covers]
   - **Rationale**: [Why separate]

**Breakdown Rationale**: [Overall reason for breakdown]

[If no breakdown needed: "No breakdown needed - issue is appropriately scoped."]

## Next Steps

1. [Immediate next action - usually delegate to first agent]
2. [Second action]
3. [Third action]

## Quality Gates

**Pre-Development**:
- [ ] Baseline metrics captured
- [ ] Main branch synced
- [ ] Feature branch created

**During Development**:
- [ ] Tests written (if TDD)
- [ ] Implementation complete
- [ ] Tests passing

**Post-Development**:
- [ ] Full test suite passing
- [ ] No regressions from baseline
- [ ] Detekt passing
- [ ] Coverage verified
- [ ] Code reviewed

---

**Status**: Development plan complete. Plan posted to Linear. Issue will transition to "In Progress".
**Ready to Start**: [YES/NO - explain if no]
```

## Quality Guidelines

### Balance Quality with YAGNI

From CLAUDE.md: "We will always prioritize quality above expedience, but we also abide by YAGNI principles and stay within scope."

**Apply This By**:
- Being thorough in analysis, but not perfectionist
- Designing for current needs, not hypothetical futures
- Implementing tests for critical paths, not every edge case
- Documenting what users need, not everything possible
- Choosing simple solutions over clever ones
- Avoiding premature optimization

### Scope Discipline

**Stay Within Scope**:
- Respect the issue description boundaries
- Don't expand scope without explicit approval
- Flag scope creep if detected
- Defer nice-to-haves to future issues

**If Scope is Unclear**:
- Ask clarifying questions
- Reference parent Story/Epic for context
- Consult PRD.md for product intent
- Make conservative assumptions

### Technical Excellence

**Follow Project Conventions**:
- Kotlin style (4-space indentation, camelCase for functions)
- Domain-Driven Design principles
- Ktor native DI patterns
- Repository pattern for data access
- Package structure: `io.spiralhouse.cycletime.*`
- Testing standards: unit/integration/system categorization

**Reference Documentation**:
- Check `docs/architecture/overview.md` for patterns
- Follow existing code patterns
- Maintain consistency with established approaches
- Use YAML frontmatter for all new documentation

### Escalation Protocol

**If Agent Encounters Blocker**:
1. Re-engage with elevated think level
2. Progression: think → think hard → think harder → ultrathink
3. If still blocked at ultrathink: escalate to user with specific context

## Example Usage

```bash
/develop SPI-634
```

This will:
1. Fetch SPI-634 and its parents (Story, Epic)
2. Search docs/ for MCP, workflow, session-related content
3. Analyze the implementation needs with ultrathink
4. Create delegation plan: qa → developer → architect → developer → qa → code-reviewer
5. Post comprehensive plan to Linear as comment
6. Transition SPI-634 to "In Progress"
7. Present plan with next steps

## Notes for Execution

When executing this command:

- **Use ULTRATHINK mode**: This is a planning command requiring deep analysis
- **Be thorough but efficient**: Don't over-analyze, but don't skip steps
- **Use all available context**: Issue hierarchy + docs + project conventions
- **Think critically**: Apply YAGNI, question scope, identify risks
- **Communicate clearly**: The plan should be actionable by specialized agents
- **Be specific**: Exact file paths, class names, patterns when possible
- **Ask when uncertain**: Better to clarify than assume
- **Update Linear reliably**: The comment and status are important artifacts
- **Respect token limits**: Focus searches on relevant domains

This command is the Development Manager's primary tool for coordinating development work. Execute it with the rigor and thoroughness expected of a senior engineering leader analyzing complex software projects.
