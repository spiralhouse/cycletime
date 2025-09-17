# Context Engineer Agent Test Scenarios

This document contains comprehensive test scenarios to validate the Context Engineer agent implementation according to SPI-621 acceptance criteria.

## Test Scenario 1: QA Agent Context Curation (TDD RED Phase)

### Test Setup
**Linear Issue**: SPI-621 (Authentication feature testing)
**Target Agent**: @agent-qa
**Workflow Phase**: RED (Test-First)
**Expected Context Focus**: Testing standards, patterns, security testing

### Test Command
```
@agent-context-engineer "Curate testing context for @agent-qa working on SPI-621 authentication feature testing"
```

### Expected Response Structure
```
## Context Analysis for SPI-621

**Issue Summary**: Create Context Engineer Subagent for Documentation Curation
**Workflow Phase**: RED (Testing Phase)
**Target Agent**: QA Agent
**Curation Strategy**: Testing-first progressive curation with security focus

### Layer 1: Foundation Context (Score: 95%)
- CLAUDE.md:1-50 - Project overview and authentication architecture
- docs/architecture/overview.md:120-180 - Security architecture principles

### Layer 2: QA-Specific Context (Score: 88%)
- .claude/shared/testing-standards.md:1-100 - TDD methodology and standards
- docs/reference/technical-design/testing-architecture-tdd.md:75-150 - Testing patterns

### Layer 3: Task-Specific Context (Score: 92%)
- [Discovered test files matching authentication patterns]
- [Security testing examples and validation patterns]

### Layer 4 Available: Edge case testing, security vulnerability patterns, performance testing

**Token Usage**: 65% of estimated budget
**Relevance Confidence**: 91% overall
**Progressive Expansion**: Request specific edge cases or security patterns for Layer 4
```

### Validation Criteria
- [ ] Correctly identifies TDD RED phase from issue context
- [ ] Prioritizes testing documentation over implementation docs
- [ ] Provides file references in `file_path:line_number` format
- [ ] Maintains >90% relevance score across all layers
- [ ] Offers progressive expansion options

## Test Scenario 2: Developer Agent Context Curation (TDD GREEN Phase)

### Test Setup
**Linear Issue**: SPI-621 (Implementation phase)
**Target Agent**: @agent-developer
**Workflow Phase**: GREEN (Implementation)
**Expected Context Focus**: Implementation patterns, domain models, coding standards

### Test Command
```
@agent-context-engineer "Prepare implementation context for @agent-developer working on SPI-621 progressive layering framework"
```

### Expected Response Structure
```
## Context Analysis for SPI-621

**Issue Summary**: Implement Progressive Layering Framework for documentation curation
**Workflow Phase**: GREEN (Implementation Phase)
**Target Agent**: Developer Agent
**Curation Strategy**: Implementation-focused with domain pattern emphasis

### Layer 1: Foundation Context (Score: 97%)
- CLAUDE.md:75-125 - PLF architecture and goals
- docs/architecture/overview.md:200-250 - System design principles

### Layer 2: Developer-Specific Context (Score: 90%)
- .claude/shared/development-commands.md:1-50 - Coding standards and conventions
- docs/reference/technical-design/domain-entities.md:1-100 - Domain modeling patterns

### Layer 3: Implementation Context (Score: 94%)
- [Existing agent implementation patterns]
- [Documentation processing examples]
- [Context management implementations]

### Layer 4 Available: Performance optimization, error handling, testing integration

**Token Usage**: 72% of estimated budget
**Relevance Confidence**: 93% overall
**Progressive Expansion**: Request performance patterns or error handling for Layer 4
```

### Validation Criteria
- [ ] Correctly identifies GREEN phase implementation focus
- [ ] Prioritizes implementation docs over testing docs
- [ ] Discovers relevant existing code patterns
- [ ] Provides specific technical guidance for PLF implementation
- [ ] Maintains clear separation from testing context

## Test Scenario 3: Parallel Development Context

### Test Setup
**Linear Issues**: SPI-621 (Documentation) + SPI-XXX (Database)
**Target Agents**: @agent-context-engineer for both
**Workflow Phase**: Mixed (Planning + Implementation)
**Expected Context Focus**: Separate, non-conflicting context for each feature

### Test Command
```
@agent-context-engineer "Prepare PLF context for parallel work on SPI-621 (documentation) and SPI-XXX (database patterns)"
```

### Expected Response Structure
```
## Parallel Development Context Analysis

**Parallel Features Detected**: 2 independent features
**Context Isolation Strategy**: Separate progressive paths per feature
**Coordination Notes**: No context contamination between features

### SPI-621 Context Path (Documentation Focus):
**Layer 1**: PLF architecture, agent patterns (3 docs)
**Layer 2**: Documentation processing, context engineering (5 docs)
**Layer 3**: Agent definition examples, curation patterns (4 files)

### SPI-XXX Context Path (Database Focus):
**Layer 1**: Data architecture, repository patterns (3 docs)
**Layer 2**: Database implementation, ORM patterns (5 docs)
**Layer 3**: Existing repository implementations (4 files)

**Isolation Guarantee**: No shared documentation between feature contexts
**Progressive Expansion**: Each feature path can expand independently
```

### Validation Criteria
- [ ] Correctly identifies parallel development scenario
- [ ] Maintains context separation between features
- [ ] Provides distinct progressive paths for each feature
- [ ] Prevents context contamination
- [ ] Enables independent expansion for each feature

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