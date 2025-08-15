# Bug Fix Workflow

Bug fix development follows a structured approach: Reproduce → Fix → Verify. This workflow ensures bugs are properly understood and fixed without introducing regressions.

## Bug Fix Process

### 1. Reproduction Phase
**Agent**: test-agent.txt (in bug fix mode)
**Objective**: Create tests that reproduce the bug behavior

```bash
claude -p "Create tests that reproduce the bug for [issue description]. Write tests that currently fail due to the bug and will pass when the bug is fixed." \
  --append-system-prompt "$(cat .claude/prompts/test-agent.txt)" \
  --permission-mode bypassPermissions --output-format stream-json --verbose
```

**Success Criteria**:
- Tests clearly demonstrate the bug
- Tests fail consistently due to the bug
- Edge cases and variations of the bug are covered
- Tests will unambiguously pass when bug is fixed

### 2. Analysis Phase (Optional for Complex Bugs)
**Agent**: task-agent.txt
**Objective**: Analyze the root cause and plan the fix

```bash
claude -p "Analyze the root cause of [bug description]. Examine the codebase, identify the underlying issue, and plan the minimal fix that addresses the root cause without side effects." \
  --append-system-prompt "$(cat .claude/prompts/task-agent.txt)" \
  --permission-mode bypassPermissions --output-format stream-json --verbose
```

**Success Criteria**:
- Root cause identified and documented
- Fix approach planned and validated
- Potential side effects considered
- Minimal change strategy defined

### 3. Fix Implementation Phase
**Agent**: implementation-agent.txt (in bug fix mode)
**Objective**: Implement the targeted fix

```bash
claude -p "Implement a targeted fix for [bug]. Focus on addressing the root cause with minimal changes. Ensure the fix makes the reproduction tests pass without breaking existing functionality." \
  --append-system-prompt "$(cat .claude/prompts/implementation-agent.txt)" \
  --permission-mode bypassPermissions --output-format stream-json --verbose
```

**Success Criteria**:
- Bug reproduction tests now pass
- Fix addresses root cause, not just symptoms
- Minimal code changes with focused impact
- Existing tests continue to pass

### 4. Verification Phase
**Agent**: test-agent.txt (in validation mode)
**Objective**: Add regression tests and validate the fix

```bash
claude -p "Add comprehensive regression tests for [bug fix]. Ensure the fix is thoroughly tested and add tests for related scenarios that could have similar issues." \
  --append-system-prompt "$(cat .claude/prompts/test-agent.txt)" \
  --permission-mode bypassPermissions --output-format stream-json --verbose
```

**Success Criteria**:
- Comprehensive regression test coverage
- Related scenarios tested to prevent similar bugs
- All tests pass including new and existing tests
- Test suite provides confidence against regression

## Single Bug Fix

For single bug fixes:

1. Run reproduction phase to create failing tests
2. Optionally run analysis phase for complex bugs
3. Run fix implementation phase
4. Run verification phase to add regression tests
5. Validate entire test suite passes

## Parallel Bug Fixes

For multiple unrelated bugs using parallel development:

1. Create worktrees for each bug fix
2. Run reproduction agents in parallel across all bugs
3. Monitor completion and review reproduction tests
4. Run fix implementation agents in parallel
5. Run verification agents in parallel for regression testing

## Bug Fix Categories

### **Critical Production Issues**
- Immediate reproduction and fix required
- Minimal testing in production-like environment
- Hot-fix deployment process
- Post-fix comprehensive testing

### **Functional Bugs**
- Standard bug fix workflow
- Comprehensive testing before deployment
- Regression test additions
- Code review process

### **Performance Issues**
- Profiling and measurement during reproduction
- Benchmarking before and after fix
- Performance regression tests
- Load testing validation

### **Security Vulnerabilities**
- Careful reproduction to avoid exposure
- Security-focused code review
- Penetration testing validation
- Security regression tests

## When to Use Bug Fix Workflow

**Always use for**:
- Reported bugs with clear reproduction steps
- Regressions in existing functionality  
- Data corruption or loss issues
- Security vulnerabilities
- Performance degradation

**Consider direct workflow for**:
- Simple typos or obvious fixes
- Configuration issues
- Documentation corrections
- Build or deployment issues

## Bug Fix Best Practices

### Reproduction
- **Understand the problem**: Read bug reports carefully
- **Reproduce locally**: Ensure you can trigger the bug consistently
- **Minimal test case**: Create the simplest test that demonstrates the issue
- **Document symptoms**: Capture exact error messages and conditions

### Root Cause Analysis
- **Don't fix symptoms**: Address the underlying cause
- **Trace execution**: Follow code paths that lead to the bug
- **Consider history**: Check when the bug was introduced
- **Impact assessment**: Understand what other areas might be affected

### Implementation
- **Minimal changes**: Make the smallest fix that addresses the root cause
- **Avoid scope creep**: Don't "improve" unrelated code during bug fixes
- **Preserve behavior**: Don't change unrelated functionality
- **Consider backwards compatibility**: Ensure fixes don't break existing users

### Verification
- **Test the fix**: Verify the original bug is resolved
- **Regression testing**: Ensure no new bugs were introduced
- **Edge case validation**: Test boundary conditions and edge cases
- **Performance impact**: Verify the fix doesn't degrade performance

## Anti-Patterns to Avoid

- **Symptom fixing**: Only addressing visible symptoms, not root causes
- **Over-engineering**: Making extensive changes for simple bugs
- **No reproduction**: Fixing bugs without understanding them first
- **Skipping tests**: Not adding regression tests for the bug
- **Hasty deployment**: Not thoroughly testing the fix
- **Scope expansion**: Fixing unrelated issues during bug fix

This workflow ensures systematic and thorough bug resolution while minimizing the risk of introducing new issues.