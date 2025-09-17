# Context Engineer Agent Test Scenarios

This document contains comprehensive test scenarios to validate the Context Engineer agent implementation according to SPI-621 acceptance criteria.

## Test Scenario 1: Context Preparation for Authentication Feature (TDD Workflow)

### Test Setup
**Linear Issue**: SPI-621 (Authentication feature development)
**Claude Code Analysis**: Determines TDD workflow with QA → Developer → Code Reviewer sequence
**Workflow Phase**: Complete TDD cycle (RED → GREEN → REFACTOR)
**Expected Workflow**: Context preparation → Sequential agent delegation

### Test Command (Claude Code invokes Context Engineer)
```
@agent-context-engineer "Prepare context for SPI-621 requiring agents: qa, developer, code-reviewer"
```

### Expected Response Structure
```
## Context Preparation for SPI-621

**Issue Summary**: Implement JWT authentication with role-based access control
**Workflow Phase**: TDD Complete Cycle (RED → GREEN → REFACTOR)
**Agents Involved**: qa, developer, code-reviewer
**Curation Strategy**: Sequential TDD workflow support with security emphasis

---

## GENERAL CONTEXT (For All Agents)

**Project Foundation** (Relevance: 96%):
- CLAUDE.md:1-50 - Project authentication architecture overview
- docs/architecture/overview.md:120-180 - Security architecture principles

**Issue Context** (Relevance: 98%):
- Linear Issue Hierarchy: [Epic → Story → Subtask breakdown]
- Technical Requirements: JWT implementation, role validation, session management
- Acceptance Criteria: Secure tokens, role-based access, proper expiration

---

## QA AGENT CONTEXT

**Testing Standards** (Relevance: 93%):
- .claude/shared/testing-standards.md:14-50 - TDD RED phase methodology
- docs/reference/technical-design/testing-architecture-tdd.md:75-150 - Authentication test patterns

**Security Testing** (Relevance: 89%):
- [Discovered security test examples]
- [Authentication validation patterns]

---

## DEVELOPER AGENT CONTEXT

**Implementation Standards** (Relevance: 91%):
- .claude/shared/development-commands.md:1-30 - Security coding standards
- docs/reference/technical-design/domain-entities.md:100-150 - Auth domain patterns

**Implementation Examples** (Relevance: 87%):
- [JWT implementation patterns]
- [Security middleware examples]

---

## CODE-REVIEWER AGENT CONTEXT

**Review Standards** (Relevance: 89%):
- .claude/shared/security-review.md:1-100 - Authentication security checklist
- docs/reference/security-vulnerabilities.md:45-90 - Common JWT vulnerabilities

---

**Curation Summary**:
- Total Documents: 12 across 4 categories
- Average Relevance: 91%
- Token Efficiency: 68% reduction vs full documentation
- Ready for Delegation: Each section optimized for sequential TDD workflow
```

### Validation Criteria (Preparation Focus)
- [ ] Correctly analyzes complete Linear issue hierarchy
- [ ] Structures output for Claude Code's delegation use
- [ ] Provides general context usable by all agents
- [ ] Creates agent-specific sections for targeted delegation
- [ ] Maintains coherence between general and specific contexts
- [ ] Enables sequential TDD workflow (RED → GREEN → REFACTOR)

### Delegation Testing (Claude Code uses prepared context)
```
# Claude Code extracts relevant sections for each delegation:

@agent-qa "Create comprehensive security tests for JWT authentication...
[General Context + QA Agent Context]"

@agent-developer "Implement JWT authentication following domain patterns...
[General Context + Developer Agent Context]"

@agent-code-reviewer "Review authentication for security vulnerabilities...
[General Context + Code-Reviewer Agent Context]"
```

## Test Scenario 2: Single Agent Preparation Focus (Implementation Phase)

### Test Setup
**Linear Issue**: SPI-621 (PLF implementation focus)
**Claude Code Analysis**: Determines single agent implementation needed
**Workflow Phase**: GREEN (Implementation only)
**Expected Workflow**: Context preparation → Single developer delegation

### Test Command (Claude Code focuses on implementation)
```
@agent-context-engineer "Prepare context for SPI-621 requiring agents: developer"
```

### Expected Response Structure
```
## Context Preparation for SPI-621

**Issue Summary**: Implement Progressive Layering Framework for Context Engineer
**Workflow Phase**: GREEN (Implementation Phase)
**Agents Involved**: developer
**Curation Strategy**: Implementation-focused with architectural patterns emphasis

---

## GENERAL CONTEXT (For All Agents)

**Project Foundation** (Relevance: 97%):
- CLAUDE.md:75-125 - PLF architectural goals and requirements
- docs/architecture/overview.md:200-250 - System design principles

**Issue Context** (Relevance: 98%):
- Technical Requirements: Progressive layering, context curation, agent integration
- Implementation Scope: Agent definition, documentation discovery, relevance scoring
- Acceptance Criteria: Structured output, token optimization, delegation support

---

## DEVELOPER AGENT CONTEXT

**Implementation Standards** (Relevance: 94%):
- .claude/shared/development-commands.md:1-50 - Coding standards and conventions
- docs/reference/technical-design/domain-entities.md:1-100 - Domain modeling patterns

**Agent Implementation Patterns** (Relevance: 91%):
- .claude/agents/qa.md:1-70 - Existing agent structure example
- .claude/agents/tech-lead.md:1-70 - Agent personality and role definition

**Documentation Processing** (Relevance: 89%):
- [Existing documentation analysis patterns]
- [Context management implementation examples]

---

**Curation Summary**:
- Total Documents: 8 across 3 categories
- Average Relevance: 93%
- Token Efficiency: 75% reduction vs full documentation
- Ready for Delegation: Focused implementation guidance for single agent
```

### Validation Criteria (Single Agent Preparation)
- [ ] Optimizes for single agent rather than multi-agent workflow
- [ ] Provides concentrated implementation guidance
- [ ] Reduces context overhead for focused task
- [ ] Maintains architectural coherence despite single focus
- [ ] Enables efficient single-agent delegation

### Delegation Testing (Claude Code uses prepared context)
```
@agent-developer "Implement Progressive Layering Framework for Context Engineer...
[General Context + Developer Agent Context - comprehensive implementation guidance]"
```

## Test Scenario 3: Parallel Development Context Isolation

### Test Setup
**Linear Issues**: SPI-621 (Context Engineer) + SPI-456 (Database Optimization)
**Claude Code Analysis**: Determines parallel development feasible with minimal dependencies
**Workflow Phase**: Mixed (Documentation + Implementation)
**Expected Workflow**: Single context preparation → Isolated parallel delegation

### Test Command (Claude Code requests parallel context)
```
@agent-context-engineer "Prepare context for parallel development: SPI-621 requiring developer, qa and SPI-456 requiring developer, software-architect"
```

### Expected Response Structure
```
## Context Preparation for Parallel Development

**Issues**: SPI-621 (Context Engineer) + SPI-456 (Database Optimization)
**Workflow Strategy**: Isolated parallel execution with context separation
**Agents Involved**: developer (both), qa (SPI-621), software-architect (SPI-456)
**Isolation Strategy**: Separate agent contexts to prevent cross-contamination

---

## GENERAL CONTEXT (Shared Foundation)

**Project Architecture** (Relevance: 94%):
- CLAUDE.md:1-100 - Overall system design and component boundaries
- docs/architecture/overview.md:1-50 - Architectural principles

---

## SPI-621 CONTEXT (Context Engineer Feature)

### DEVELOPER AGENT CONTEXT (SPI-621)
**Agent Implementation** (Relevance: 96%):
- .claude/agents/qa.md:1-70 - Agent definition patterns
- docs/reference/technical-design/context-engineering.md:1-150

### QA AGENT CONTEXT (SPI-621)
**Documentation Testing** (Relevance: 92%):
- .claude/shared/testing-standards.md:50-120 - Agent testing methodology
- docs/reference/testing/agent-validation.md:75-150

---

## SPI-456 CONTEXT (Database Optimization Feature)

### DEVELOPER AGENT CONTEXT (SPI-456)
**Database Patterns** (Relevance: 95%):
- docs/reference/technical-design/repository-pattern.md:1-150
- src/main/kotlin/.../ExposedProjectRepository.kt:1-200

### SOFTWARE-ARCHITECT AGENT CONTEXT (SPI-456)
**Performance Architecture** (Relevance: 93%):
- docs/architecture/performance-optimization.md:100-200
- docs/reference/technical-design/data-layer-architecture.md:50-150

---

**Isolation Summary**:
- Context Separation: Complete isolation between SPI-621 and SPI-456
- Shared Foundation: Minimal overlap in general context only
- Agent Specificity: Each agent gets relevant context for their feature only
- Parallel Safety: No context contamination between parallel executions
```

### Validation Criteria (Parallel Context Isolation)
- [ ] Correctly identifies parallel development scenario
- [ ] Maintains complete context separation between features
- [ ] Provides isolated agent contexts for each feature
- [ ] Prevents context contamination between parallel work
- [ ] Enables truly independent parallel execution
- [ ] Optimizes shared general context without feature bleeding

### Delegation Testing (Claude Code uses isolated contexts)
```
# Parallel execution with isolated contexts:

# SPI-621 Context Engineer Development
@agent-developer "Implement Context Engineer agent definition...
[General Context + SPI-621 Developer Context]"

@agent-qa "Create validation tests for Context Engineer...
[General Context + SPI-621 QA Context]"

# SPI-456 Database Optimization (Parallel)
@agent-developer "Optimize database query performance...
[General Context + SPI-456 Developer Context]"

@agent-software-architect "Design performance architecture improvements...
[General Context + SPI-456 Software-Architect Context]"
```

## Test Scenario 4: Architecture Agent Context Curation (REFACTOR Phase)

### Test Setup
**Linear Issue**: SPI-621 (Architecture optimization)
**Target Agent**: @agent-software-architect
**Workflow Phase**: REFACTOR (Improvement)
**Expected Context Focus**: Architecture patterns, performance, design principles

### Test Command
```
@agent-context-engineer "Curate architecture context for @agent-software-architect optimizing SPI-621 PLF performance"
```

### Expected Response Structure
```
## Context Analysis for SPI-621

**Issue Summary**: Optimize Progressive Layering Framework architecture
**Workflow Phase**: REFACTOR (Architecture improvement)
**Target Agent**: Software Architect
**Curation Strategy**: Architecture-first with performance optimization focus

### Layer 1: Foundation Context (Score: 96%)
- docs/architecture/overview.md:1-100 - System architecture principles
- CLAUDE.md:100-150 - PLF architectural goals and constraints

### Layer 2: Architecture-Specific Context (Score: 92%)
- docs/reference/technical-design/mcp-architecture-simplification.md - MCP patterns
- docs/reference/technical-design/dependency-injection-patterns.md - DI architecture

### Layer 3: Performance Context (Score: 89%)
- [Performance baseline documentation if available]
- [Architecture pattern examples]
- [Optimization case studies]

### Layer 4 Available: Scalability patterns, performance metrics, architectural anti-patterns

**Token Usage**: 68% of estimated budget
**Relevance Confidence**: 92% overall
**Progressive Expansion**: Request scalability or performance metrics for Layer 4
```

### Validation Criteria
- [ ] Correctly identifies REFACTOR phase architecture focus
- [ ] Prioritizes architecture and performance docs
- [ ] Discovers relevant design patterns
- [ ] Focuses on optimization and improvement
- [ ] Provides architectural guidance specific to PLF

## Test Scenario 5: Context Expansion and Refinement

### Test Setup
**Previous Context**: Layer 1-3 already provided for SPI-621
**Expansion Request**: Layer 4 refinement for specific edge cases
**Target**: Detailed implementation examples

### Test Command
```
@agent-context-engineer "Expand Layer 4 context for SPI-621: provide specific examples of relevance scoring algorithms and progressive loading implementations"
```

### Expected Response Structure
```
## Layer 4 Expansion for SPI-621

**Expansion Type**: Implementation Examples and Algorithms
**Integration with Previous Layers**: Builds on Layer 2 development patterns and Layer 3 implementation context

### Additional Context:
- [specific_algorithm_file:line_range]: Relevance scoring implementation example
- [caching_pattern_file:line_range]: Progressive loading cache strategy
- [existing_agent_logic:line_range]: Context management patterns from existing agents

### Implementation Guidance:
- **Scoring Algorithm**: Use weighted relevance based on keyword density, domain match, and phase alignment
- **Progressive Loading**: Implement lazy loading with cache invalidation
- **Memory Management**: Use weak references for large documentation sets

**Integration Notes**: These patterns complement Layer 2 development standards and Layer 3 domain patterns
**Next Steps**: Apply these patterns to PLF implementation with test coverage from Layer 2 testing standards
```

### Validation Criteria
- [ ] Correctly expands on previous context layers
- [ ] Provides specific, actionable implementation guidance
- [ ] References exact file locations and line ranges
- [ ] Maintains coherence with previous layers
- [ ] Offers concrete next steps

## Progressive Layering Framework Validation

### PLF Principle 1: Progressive Context Loading
**Test**: Verify each layer builds logically on previous layers
**Validation**: Each test scenario should show clear progression from general to specific

### PLF Principle 2: Context Window Optimization
**Test**: Verify token usage stays within reasonable bounds
**Validation**: All scenarios should report <80% token budget usage

### PLF Principle 3: Dynamic Context Switching
**Test**: Verify different agents receive different context for same issue
**Validation**: QA vs Developer contexts should show distinct priorities

## Performance Requirements Validation

### Curation Speed
**Requirement**: <5 seconds for initial context preparation
**Test Method**: Time agent response from request to complete Layer 1-3 delivery
**Validation**: All scenarios should complete within performance window

### Documentation Relevance
**Requirement**: >90% of curated docs should be relevant
**Test Method**: Manual review of selected documentation
**Validation**: Each layer should maintain stated relevance scores

### Token Efficiency
**Requirement**: >50% reduction vs providing all documentation
**Test Method**: Compare curated context size to total documentation available
**Validation**: Calculate reduction percentage for each scenario

### Context Reduction
**Requirement**: >70% reduction in irrelevant documentation
**Test Method**: Measure irrelevant docs excluded from selection
**Validation**: Track excluded documentation and justify exclusions

## Integration Testing Scenarios

### Scenario A: Single Feature Workflow Integration
1. @agent-context-engineer provides QA context
2. @agent-qa uses context to create tests
3. @agent-context-engineer provides Developer context
4. @agent-developer implements based on context
5. Validate context coherence across workflow

### Scenario B: Parallel Development Integration
1. @agent-context-engineer provides parallel contexts
2. Multiple agents work simultaneously
3. Validate no context contamination
4. Verify independent progression capabilities

### Scenario C: Workflow Phase Transitions
1. Start with RED phase context (testing)
2. Transition to GREEN phase context (implementation)
3. Move to REFACTOR phase context (optimization)
4. Validate appropriate context evolution

## Success Metrics Tracking

| Metric | Target | Test Method | Status |
|--------|--------|-------------|--------|
| Documentation Relevance | >90% | Manual review of selections | [ ] |
| Token Efficiency | >50% reduction | Compare to total docs available | [ ] |
| Curation Speed | <5 seconds | Time response delivery | [ ] |
| Agent Confusion Reduction | >40% | Compare feedback with/without context | [ ] |
| Progressive Effectiveness | >80% relevance per layer | Score each layer independently | [ ] |

## Expected Failures and Edge Cases

### Edge Case 1: Missing Documentation
**Scenario**: Request context for undocumented feature
**Expected Behavior**: Graceful degradation with explanation of gaps
**Validation**: Agent should identify missing docs and suggest alternatives

### Edge Case 2: Conflicting Agent Requirements
**Scenario**: Request context for incompatible agent combination
**Expected Behavior**: Clear explanation of conflicts with resolution options
**Validation**: Agent should detect conflicts and provide resolution path

### Edge Case 3: Token Limit Exceeded
**Scenario**: Request context for complex issue exceeding token budget
**Expected Behavior**: Intelligent prioritization with progressive delivery options
**Validation**: Agent should handle gracefully and offer staged delivery

### Edge Case 4: Outdated Documentation
**Scenario**: Request context when documentation is stale
**Expected Behavior**: Warning about staleness with confidence indicators
**Validation**: Agent should detect and flag potentially outdated content

## Test Execution Checklist

**Pre-Test Setup:**
- [ ] Context Engineer agent definition is properly installed
- [ ] Test Linear issues are available and accessible
- [ ] Documentation structure is current and complete
- [ ] Performance measurement tools are ready

**During Testing:**
- [ ] Execute each test scenario systematically
- [ ] Record actual responses vs expected responses
- [ ] Measure performance metrics for each scenario
- [ ] Validate Progressive Layering Framework principles
- [ ] Test edge cases and failure modes

**Post-Test Validation:**
- [ ] Compare all success metrics against targets
- [ ] Validate integration with existing agents works correctly
- [ ] Confirm documentation updates are accurate
- [ ] Verify agent follows project conventions and standards
- [ ] Test acceptance criteria from SPI-621 are met

## Test Results Summary

[This section will be filled during actual testing]

### Scenario Results:
- Scenario 1 (QA Context): [PASS/FAIL] - [Notes]
- Scenario 2 (Developer Context): [PASS/FAIL] - [Notes]
- Scenario 3 (Parallel Development): [PASS/FAIL] - [Notes]
- Scenario 4 (Architecture Context): [PASS/FAIL] - [Notes]
- Scenario 5 (Context Expansion): [PASS/FAIL] - [Notes]

### Performance Results:
- Average Curation Speed: [X] seconds
- Token Efficiency: [X]% reduction
- Documentation Relevance: [X]% average
- Context Reduction: [X]% irrelevant docs excluded

### Integration Results:
- Single Feature Workflow: [PASS/FAIL]
- Parallel Development: [PASS/FAIL]
- Phase Transitions: [PASS/FAIL]

### Edge Case Results:
- Missing Documentation: [PASS/FAIL]
- Conflicting Requirements: [PASS/FAIL]
- Token Limit Handling: [PASS/FAIL]
- Outdated Content Detection: [PASS/FAIL]

### Overall Assessment:
**SPI-621 Acceptance Criteria**: [MET/NOT MET]
**Ready for Production**: [YES/NO]
**Recommended Next Steps**: [List any required improvements]