# TDD Workflow

Test-Driven Development follows the RED → GREEN → REFACTOR cycle. This workflow can be executed sequentially for single features or in parallel for multiple features.

## TDD Phases

### 1. RED Phase (Write Failing Tests)
**Agent**: test-agent.txt (in TDD mode)
**Objective**: Create comprehensive failing tests that define expected behavior

```bash
claude -p "Create failing tests for [feature]. Use TDD mode to write comprehensive tests that initially fail since no implementation exists." \
  --append-system-prompt "$(cat .claude/prompts/test-agent.txt)" \
  --permission-mode bypassPermissions --output-format stream-json --verbose
```

**Success Criteria**:
- All tests fail with meaningful error messages
- Tests cover happy path, edge cases, and error conditions
- Test names serve as living documentation
- Tests are isolated and independent

### 2. GREEN Phase (Implement Minimal Code)
**Agent**: implementation-agent.txt (in test-driven mode)
**Objective**: Implement the minimal code needed to make all tests pass

```bash
claude -p "Implement minimal code to make failing tests pass for [feature]. Follow TDD GREEN phase principles - write only enough code to pass the tests." \
  --append-system-prompt "$(cat .claude/prompts/implementation-agent.txt)" \
  --permission-mode bypassPermissions --output-format stream-json --verbose
```

**Success Criteria**:
- All tests transition from failing to passing
- Implementation is minimal but correct
- No over-engineering or premature optimization
- Code follows project patterns and conventions

### 3. REFACTOR Phase (Improve Code Quality)
**Agent**: review-agent.txt (focusing on refactoring)
**Objective**: Improve code structure while maintaining test coverage

```bash
claude -p "Review and refactor [feature] implementation while maintaining all test coverage. Improve code quality, performance, and adherence to project standards without changing behavior." \
  --append-system-prompt "$(cat .claude/prompts/review-agent.txt)" \
  --permission-mode bypassPermissions --output-format stream-json --verbose
```

**Success Criteria**:
- All tests continue to pass after refactoring
- Code quality improved (readability, performance, maintainability)
- No functional changes to behavior
- Follows architectural patterns and conventions

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

- **Clear requirements**: Tests define expected behavior upfront
- **Regression protection**: Tests catch breaking changes immediately  
- **Design improvement**: Writing tests first improves API design
- **Documentation**: Test names and descriptions serve as living docs
- **Confidence**: Comprehensive test coverage enables safe refactoring

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