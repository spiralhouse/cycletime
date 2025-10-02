# TDD Workflow

Test-Driven Development follows the RED → GREEN → REFACTOR cycle. This workflow can be executed sequentially for single features or in parallel for multiple features.

## TDD Phases

### 1. RED Phase (Write Failing Tests)

**Agent**: QA Agent (TDD mode)

**Objective**: Create comprehensive failing tests that define expected behavior before implementation exists.

```bash
@agent-qa "Create failing tests for [feature]. Use TDD RED phase approach: write comprehensive tests that initially fail since no implementation exists. Cover happy path, edge cases, and error conditions."
```

**Success Criteria**: The RED phase succeeds when all tests fail with clear, meaningful error messages that describe the missing functionality. Test coverage should include happy paths, edge cases, error conditions, and boundary scenarios. Test names must serve as living documentation, clearly expressing the expected behavior. Each test must be isolated and independent, with no shared mutable state between tests.

### 2. GREEN Phase (Implement Minimal Code)

**Agent**: Developer Agent (test-driven mode)

**Objective**: Implement the minimal code needed to make all failing tests pass.

```bash
@agent-developer "Implement minimal code to make failing tests pass for [feature]. Follow TDD GREEN phase principles: write only enough code to pass the tests, no over-engineering or premature optimization."
```

**Success Criteria**: The GREEN phase succeeds when all tests transition from failing to passing. Implementation should be minimal but correct, containing only the code necessary to satisfy test requirements. Avoid over-engineering or premature optimization - focus solely on making tests pass. Code must follow established project patterns, conventions, and architectural guidelines while maintaining simplicity.

### 3. REFACTOR Phase (Improve Code Quality)

**Agent**: Code Reviewer Agent (refactoring focus)

**Objective**: Improve code structure and quality while maintaining all test coverage.

```bash
@agent-code-reviewer "Review and refactor [feature] implementation while maintaining all test coverage. Improve code quality, performance, and adherence to project standards without changing behavior."
```

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