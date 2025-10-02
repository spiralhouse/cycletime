# Bug Fix Workflow

Bug fix development follows a systematic approach: Reproduce → Analyze → Fix → Verify. This workflow ensures bugs are thoroughly understood, properly fixed at their root cause, and protected against regression without introducing new issues.

## Bug Fix Process

### 1. Reproduction Phase

**Agent**: QA Agent (bug reproduction mode)

**Objective**: Create failing tests that reproduce the bug behavior consistently.

```bash
@agent-qa "Create tests that reproduce the bug for [issue description]. Write tests that currently fail due to the bug and will pass when the bug is fixed. Cover edge cases and variations."
```

**Success Criteria**: Reproduction succeeds when tests clearly demonstrate the bug behavior and fail consistently. Tests must cover edge cases and variations of the bug to prevent incomplete fixes. The tests should unambiguously pass when the bug is properly fixed, serving as both verification and regression protection.

### 2. Analysis Phase (For Complex Bugs)

**Agent**: Developer Agent (root cause analysis mode)

**Objective**: Identify the root cause and plan a minimal, targeted fix.

```bash
@agent-developer "Analyze the root cause of [bug description]. Examine the codebase, identify the underlying issue, and plan the minimal fix that addresses the root cause without side effects."
```

**Success Criteria**: Analysis succeeds when the root cause is clearly identified and documented with supporting evidence from code examination. The fix approach must be planned and validated against potential side effects. Define a minimal change strategy that addresses the root cause without unnecessary modifications to surrounding code.

### 3. Fix Implementation Phase

**Agent**: Developer Agent (bug fix mode)

**Objective**: Implement a targeted fix that addresses the root cause with minimal changes.

```bash
@agent-developer "Implement a targeted fix for [bug]. Focus on addressing the root cause with minimal changes. Ensure the fix makes the reproduction tests pass without breaking existing functionality."
```

**Success Criteria**: Implementation succeeds when bug reproduction tests transition from failing to passing. The fix must address the root cause rather than merely suppressing symptoms. Implement minimal code changes with focused impact, avoiding scope creep or unrelated improvements. All existing tests must continue to pass, confirming no regressions were introduced.

### 4. Verification Phase

**Agent**: QA Agent (validation and regression mode)

**Objective**: Add comprehensive regression tests and validate the complete fix.

```bash
@agent-qa "Add comprehensive regression tests for [bug fix]. Ensure the fix is thoroughly tested and add tests for related scenarios that could have similar issues."
```

**Success Criteria**: Verification succeeds when comprehensive regression test coverage protects against future occurrences. Test related scenarios to prevent similar bugs in adjacent code or edge cases. All tests must pass, including new regression tests, original reproduction tests, and existing test suite. The test suite should provide high confidence against regression.

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

### Reproduction Philosophy

Effective bug fixes begin with thorough understanding. Read bug reports carefully, paying attention to environmental details, reproduction steps, and exact error messages. Don't assume you understand the problem until you've reproduced it yourself in a controlled environment.

Reproduce the bug locally before attempting any fix. Consistent reproduction proves you understand the conditions that trigger the bug and provides immediate verification when the fix succeeds. If you cannot reproduce the bug, you cannot verify the fix works.

Create the minimal test case that demonstrates the issue. Strip away unnecessary complexity to isolate the exact conditions that cause the bug. Minimal test cases clarify root causes and speed up the fix-verify cycle.

Document symptoms meticulously. Capture exact error messages, stack traces, log outputs, and environmental conditions. This documentation helps with root cause analysis and serves as verification criteria for the fix.

### Root Cause Analysis

Never fix symptoms - always address the underlying cause. Symptom fixes create maintenance burden and often fail in edge cases you haven't considered. Root cause fixes eliminate entire classes of bugs.

Trace code execution paths that lead to the bug. Use debuggers, logging, or code reading to understand the complete flow that results in failure. Understanding the path reveals where the logic breaks down.

Consider the bug's history using version control. When was the bug introduced? What changed in that commit? Understanding the introduction context often reveals why the bug exists and what the correct behavior should be.

Assess impact on other areas of the codebase. The bug's root cause might affect multiple code paths. Thorough impact assessment prevents fixing the bug in one location while leaving it elsewhere.

### Implementation Strategy

Make the smallest fix that addresses the root cause. Minimal changes reduce risk of introducing new bugs and simplify code review. Large fixes indicate either poor understanding of the root cause or scope creep.

Avoid scope creep rigidly. Don't "improve" unrelated code during bug fixes. Save improvements for dedicated refactoring tasks. Mixed concerns in commits complicate review, testing, and potential rollback.

Preserve unrelated behavior strictly. Changing functionality beyond the bug fix risks breaking dependent code. Behavior changes require thorough impact analysis and are better suited to planned feature work.

Consider backwards compatibility carefully. Fixes that break existing users create more problems than they solve. When breaking changes are unavoidable, communicate clearly and provide migration paths.

### Verification Requirements

Test the fix verifies that the original bug is completely resolved. Run the reproduction tests and verify they now pass. Test manually with the original reproduction steps to confirm the issue no longer occurs.

Regression testing ensures no new bugs were introduced by the fix. Run the complete test suite, paying special attention to tests related to modified code. New test failures indicate the fix had unintended consequences requiring adjustment.

Edge case validation tests boundary conditions thoroughly. Bugs often hide in edge cases, so verify the fix works across the full range of inputs and conditions. Test null values, empty collections, maximum values, and other boundary scenarios.

Performance impact verification confirms the fix doesn't degrade performance. Some fixes trade performance for correctness - these tradeoffs must be conscious decisions, not accidental degradation. Benchmark performance-sensitive code before and after the fix.

## Anti-Patterns to Avoid

- **Symptom fixing**: Only addressing visible symptoms, not root causes
- **Over-engineering**: Making extensive changes for simple bugs
- **No reproduction**: Fixing bugs without understanding them first
- **Skipping tests**: Not adding regression tests for the bug
- **Hasty deployment**: Not thoroughly testing the fix
- **Scope expansion**: Fixing unrelated issues during bug fix

This workflow ensures systematic and thorough bug resolution while minimizing the risk of introducing new issues.