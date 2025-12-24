# TDD Workflow

Test-Driven Development follows the RED → GREEN → REFACTOR cycle. This workflow can be executed sequentially for single features or in parallel for multiple features.

## Phase Artifact Coordination

TDD phases use explicit artifact handoffs via `/tmp/` directory to ensure clear phase separation and create an audit trail. Each phase writes a summary artifact that the next phase reads as input.

### Artifact Pattern

**Location**: `/tmp/{issue-id}-{phase}-summary.md`

**Phases**: RED, GREEN, REFACTOR

**Example**: `/tmp/spi-1234-red-phase-summary.md`

### Phase Handoff Flow

1. **RED Phase** (qa agent):
   - Writes failing tests based on requirements
   - Creates `/tmp/{issue-id}-red-phase-summary.md` with:
     - Test files created and locations
     - Test coverage areas (happy path, edge cases, errors)
     - Failure messages and expected behavior
     - Implementation guidance for GREEN phase

2. **GREEN Phase** (developer agent):
   - Reads `/tmp/{issue-id}-red-phase-summary.md`
   - Implements minimal code to pass tests
   - Creates `/tmp/{issue-id}-green-phase-summary.md` with:
     - Implementation files and locations
     - Test results (baseline → final counts)
     - Regression analysis (zero new failures required)
     - Areas for potential refactoring

3. **REFACTOR Analysis** (software-architect agent):
   - Reads `/tmp/{issue-id}-green-phase-summary.md`
   - Analyzes code quality and improvement opportunities
   - Creates `/tmp/{issue-id}-refactor-phase-summary.md` with:
     - Code quality assessment
     - Refactoring recommendations (specific, actionable)
     - Performance considerations
     - Architecture alignment review

4. **REFACTOR Execution** (developer agent):
   - Reads `/tmp/{issue-id}-refactor-phase-summary.md`
   - Implements refactoring recommendations
   - Runs full test suite to verify no behavioral changes

5. **REFACTOR Verification** (qa agent):
   - Confirms all tests still pass after refactoring
   - Verifies test coverage maintained or improved

### Artifact Benefits

**Explicit Handoffs**: Clear phase boundaries prevent work overlap and ensure proper TDD cycle adherence.

**Audit Trail**: Persistent artifacts provide traceable record of decisions and progress through TDD phases.

**Phase Separation**: Artifacts enforce separation between writing tests (RED), implementing (GREEN), and improving (REFACTOR).

**Agent Coordination**: Each agent knows exactly what to read (input artifact) and what to create (output artifact).

**Parallel Development**: Multiple features can use artifact coordination simultaneously with issue-specific naming.

## TDD Phases

### 1. RED Phase (Write Failing Tests)

**Agent**: QA Agent (TDD mode)

**Objective**: Create comprehensive failing tests that define expected behavior before implementation exists.

```bash
@agent-qa "Create failing tests for [feature]. Use TDD RED phase approach: write comprehensive tests that initially fail since no implementation exists. Cover happy path, edge cases, and error conditions. Create RED phase artifact at /tmp/{issue-id}-red-phase-summary.md."
```

**Artifact Output**: `/tmp/{issue-id}-red-phase-summary.md` containing test files created, coverage areas, failure messages, and implementation guidance for GREEN phase.

**Success Criteria**: The RED phase succeeds when all tests fail with clear, meaningful error messages that describe the missing functionality. Test coverage should include happy paths, edge cases, error conditions, and boundary scenarios. Test names must serve as living documentation, clearly expressing the expected behavior. Each test must be isolated and independent, with no shared mutable state between tests. RED phase artifact must be created for handoff to GREEN phase.

### 2. GREEN Phase (Implement Minimal Code)

**Agent**: Developer Agent (test-driven mode)

**Objective**: Implement the minimal code needed to make all failing tests pass.

```bash
@agent-developer "Implement minimal code to make failing tests pass for [feature]. Follow TDD GREEN phase principles: write only enough code to pass the tests, no over-engineering or premature optimization. Read RED phase artifact at /tmp/{issue-id}-red-phase-summary.md and create GREEN phase artifact at /tmp/{issue-id}-green-phase-summary.md."
```

**Artifact Input**: `/tmp/{issue-id}-red-phase-summary.md` (from RED phase)

**Artifact Output**: `/tmp/{issue-id}-green-phase-summary.md` containing implementation files, test results, regression analysis, and refactoring opportunities.

**Success Criteria**: The GREEN phase succeeds when all tests transition from failing to passing. Implementation should be minimal but correct, containing only the code necessary to satisfy test requirements. Avoid over-engineering or premature optimization - focus solely on making tests pass. Code must follow established project patterns, conventions, and architectural guidelines while maintaining simplicity. GREEN phase artifact must be created for handoff to REFACTOR phase.

### 3. REFACTOR Phase (Improve Code Quality)

**Agent**: Software Architect Agent (analysis), then Developer Agent (execution), then QA Agent (verification)

**Objective**: Improve code structure and quality while maintaining all test coverage.

**REFACTOR Analysis**:
```bash
@agent-software-architect "Analyze [feature] implementation for refactoring opportunities. Read GREEN phase artifact at /tmp/{issue-id}-green-phase-summary.md and create REFACTOR analysis artifact at /tmp/{issue-id}-refactor-phase-summary.md with specific, actionable recommendations."
```

**REFACTOR Execution**:
```bash
@agent-developer "Implement refactoring recommendations from /tmp/{issue-id}-refactor-phase-summary.md. Maintain all test coverage and verify no behavioral changes."
```

**REFACTOR Verification**:
```bash
@agent-qa "Verify all tests still pass after refactoring. Confirm test coverage maintained or improved."
```

**Artifact Input**: `/tmp/{issue-id}-green-phase-summary.md` (from GREEN phase)

**Artifact Output**: `/tmp/{issue-id}-refactor-phase-summary.md` containing code quality assessment, refactoring recommendations, performance considerations, and architecture alignment review.

**Success Criteria**: The REFACTOR phase succeeds when all tests continue to pass after refactoring, confirming that behavior remains unchanged. Code quality should improve across readability, performance, and maintainability dimensions. The refactored implementation must make no functional changes to behavior - only structural improvements. All code must follow established architectural patterns, design principles, and project conventions.

## Single Feature TDD

For single feature development, execute phases sequentially:

1. Run RED phase agent
2. Wait for completion and verify failing tests
3. Run GREEN phase agent  
4. Wait for completion and verify passing tests
5. Run REFACTOR phase agent
6. Verify final quality and test coverage

## Parallel TDD

For multiple features, use parallel development mechanics (see PARALLEL_DEVELOPMENT.md):

1. Create worktrees for each feature
2. Run RED phase agents in parallel across all features
3. Monitor completion of all RED phase agents
4. Run GREEN phase agents in parallel across all features  
5. Monitor completion of all GREEN phase agents
6. Run REFACTOR phase agents in parallel across all features

## TDD Benefits

Test-Driven Development provides several benefits when applied consistently. Tests written before implementation serve as executable specifications, defining expected behavior with precision. This upfront clarity reduces ambiguity and prevents misunderstandings about requirements.

Comprehensive test suites provide regression protection, catching breaking changes immediately when they occur. This early detection prevents bugs from reaching production and reduces debugging time significantly.

Writing tests first often improves API and interface design. When you consider how code will be tested before implementing it, you naturally create more testable, modular designs with clear boundaries and minimal coupling.

Test names and descriptions serve as living documentation that stays synchronized with code. Unlike traditional documentation, tests cannot become outdated without failing, ensuring accurate representation of system behavior.

Comprehensive test coverage enables confident refactoring. When tests verify all critical behavior, developers can restructure code aggressively, knowing that any behavioral regressions will be caught immediately.

## When to Use TDD

**Good for TDD**:
- Well-understood requirements
- Complex business logic
- Algorithm implementation
- API design
- Bug fixes with clear reproduction steps

**Consider alternatives for**:
- UI/visual components (hard to test-drive)
- Rapid prototyping
- Simple CRUD operations
- External integrations (use mocks/stubs)
- Performance-critical code (may require profiling-driven development)

## TDD Anti-Patterns to Avoid

- **Testing implementation details**: Test behavior, not internal structure
- **Over-mocking**: Don't mock everything, use real objects when practical
- **Brittle tests**: Tests should survive refactoring
- **Slow tests**: Keep unit tests fast, use integration tests sparingly
- **Testing frameworks**: Don't test your testing tools

This workflow template provides a structured approach to TDD that can be used with or without parallel development.