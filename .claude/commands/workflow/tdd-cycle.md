# TDD Red-Green-Refactor Cycle

Execute Test-Driven Development cycle for: $ARGUMENTS

## TDD Cycle Steps:

### 🔴 RED Phase
1. **Write a Failing Test**:
   - Create test file if it doesn't exist
   - Write test that describes the desired functionality for $ARGUMENTS
   - Ensure test fails initially: `npm test`
   - Confirm test failure is for the right reason

### 🟢 GREEN Phase
2. **Make Test Pass**:
   - Write minimal code necessary to make the test pass
   - Focus only on making the test green
   - Avoid over-engineering at this stage
   - Run tests to confirm: `npm test`

### 🔧 REFACTOR Phase
3. **Improve the Code**:
   - Clean up implementation while keeping tests green
   - Remove duplication
   - Improve naming and structure
   - Ensure tests still pass: `npm test`
   - Run linting: `npm run lint`
   - Run type checking: `npm run typecheck`

## Commit Strategy:
- **test:** commit - Add failing test for $ARGUMENTS
- **feat:** commit - Implement $ARGUMENTS to pass tests  
- **refactor:** commit - Clean up $ARGUMENTS implementation

## Quality Checklist:
- [ ] Test written first and failed initially
- [ ] Minimal implementation makes test pass
- [ ] Code refactored for maintainability
- [ ] All tests passing
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Commits are atomic and follow conventional format

Execute each phase completely before moving to the next. Never skip the refactor step!