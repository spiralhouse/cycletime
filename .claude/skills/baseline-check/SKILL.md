---
name: baseline-check
description: Autonomously run quality checks (detekt, Gradle tests) to establish baseline or detect regressions. Triggers before starting development work, after completing changes, when checking code quality, or when explicitly requested. Compares current metrics against previous baseline to identify improvements or regressions in code quality and test coverage.
allowed-tools: Bash, Read, Write, Glob
---

# Baseline Check Skill

## Purpose

This skill maintains code quality throughout development by:
- Establishing baseline quality metrics before development
- Detecting regressions after code changes
- Tracking quality trends over time
- Providing clear feedback on code health

## When to Use

Invoke this skill:

1. **Before starting development work** - Establish current baseline
2. **After completing changes** - Check for regressions
3. **After GREEN phase** - Verify tests exist and pass
4. **After REFACTOR phase** - Verify tests still pass after refactoring
5. **Before committing code** - Verify quality standards
6. **When explicitly requested** - User asks for quality check, baseline, or regression analysis
7. **During code review** - Validate changes meet quality bar

## How to Execute

### Step 1: Run the Baseline Check

Execute the wrapper script (from project root):

```bash
./.claude/skills/baseline-check/baseline-check.sh
```

The script will:
- Run detekt (if available)
- Run Gradle tests (test + integrationTest if available)
- Generate a timestamped JSON report
- Output the filepath to the generated report

**Expected output:**
```
Running baseline checks...
✓ detekt check completed
✓ Gradle tests completed
Baseline saved to: .claude/baseline/main-20251119-143022.json
```

**Error handling:**
- If script fails, report the error to user
- If tools are unavailable, the JSON will reflect `"available": false`
- Empty test suite is acceptable (allows pre-implementation baselines)

### Step 2: Read the Results

Parse the generated JSON file to extract metrics:

```json
{
  "timestamp": "2025-11-19T14:30:22Z",
  "branch": "main",
  "commit": "5393d9d",
  "checks": {
    "detekt": {
      "available": true,
      "status": "failed",
      "total_offenses": 9,
      "offenses_by_severity": {
        "convention": 3,
        "warning": 5,
        "error": 1
      },
      "execution_time": 8
    },
    "tests": {
      "available": true,
      "status": "passed",
      "total": 861,
      "failures": 0,
      "skipped": 0,
      "execution_time": 45
    }
  },
  "overall_status": "failed",
  "summary": "Some quality checks failed"
}
```

### Step 3: Find Previous Baseline (If Any)

Search for previous baselines on the current branch:

```bash
ls -t .claude/baseline/{current-branch}-*.json 2>/dev/null | head -2
```

This returns the two most recent baseline files (including the one just created).

**Scenarios:**
- **One file returned**: This is the first baseline (nothing to compare)
- **Two files returned**: Compare the newest against the previous
- **Zero files returned**: This should not happen if Step 1 succeeded

### Step 4: Compare Baselines

If a previous baseline exists, compare key metrics:

#### Detekt Comparison

| Metric | Check |
|--------|-------|
| Total offenses | `current.total_offenses` vs `previous.total_offenses` |
| Convention offenses | `current.offenses_by_severity.convention` vs `previous` |
| Warning offenses | `current.offenses_by_severity.warning` vs `previous` |
| Error offenses | `current.offenses_by_severity.error` vs `previous` |

**Classifications:**
- **Improvement**: Offenses decreased
- **Regression**: Offenses increased (especially errors)
- **Critical Regression**: New error-level offenses introduced
- **Stable**: No change in offense counts

#### Test Comparison

| Metric | Check |
|--------|-------|
| Test count | `current.total` vs `previous.total` |
| Failures | `current.failures` vs `previous.failures` |
| Skipped tests | `current.skipped` vs `previous.skipped` |

**Classifications:**
- **Improvement**: More tests, fewer failures, fewer skipped
- **Regression**: New failures introduced, test count decreased
- **Critical Regression**: Tests that previously passed now fail
- **Stable**: Metrics unchanged or expected changes (e.g., skipped tests fixed)

### Step 5: Report Findings

Provide a clear, actionable summary.

#### Report Format: First Baseline

When no previous baseline exists:

```
Baseline Quality Check - Initial Assessment
==========================================

Branch: main
Commit: 5393d9d
Timestamp: 2025-11-19T14:30:22Z

Detekt Analysis:
  Status: failed
  Total Offenses: 9
    - Convention: 3
    - Warning: 5
    - Error: 1

Gradle Test Analysis:
  Status: passed
  Total Tests: 861
  Failures: 0
  Skipped: 0

Overall Status: FAILED (due to detekt errors)

This is the first baseline for this branch. Future checks will compare against these metrics.

Baseline file: .claude/baseline/main-20251119-143022.json
```

#### Report Format: Comparison with Previous Baseline

When comparing against previous baseline:

```
Baseline Quality Check - Regression Analysis
============================================

Branch: feat/ssh-integration
Commit: abc123d
Timestamp: 2025-11-19T15:45:33Z
Previous: 2025-11-19T14:30:22Z

Detekt Changes:
  Status: failed → passed ✓ IMPROVEMENT
  Total Offenses: 9 → 5 (-4) ✓ IMPROVEMENT
    - Convention: 3 → 2 (-1)
    - Warning: 5 → 3 (-2)
    - Error: 1 → 0 (-1) ✓ CRITICAL IMPROVEMENT

Test Changes:
  Status: passed → passed
  Total Tests: 861 → 873 (+12) ✓ IMPROVEMENT
  Failures: 0 → 0 (stable)
  Skipped: 0 → 0 (stable)

Overall Status: PASSED

FINDINGS:
✓  Fixed 1 detekt error
✓  Reduced offenses by 4
✓  Added 12 new tests

RECOMMENDATION:
Quality improved! Consider addressing remaining 5 detekt offenses.

Baseline file: .claude/baseline/feat-ssh-integration-20251119-154533.json
Previous baseline: .claude/baseline/feat-ssh-integration-20251119-143022.json
```

#### Report Format: Critical Regression

When significant regressions occur:

```
Baseline Quality Check - CRITICAL REGRESSIONS DETECTED
======================================================

Branch: feat/new-feature
Commit: def456e
Timestamp: 2025-11-19T16:20:15Z

⚠️  CRITICAL ISSUES DETECTED ⚠️

Detekt Changes:
  Status: passed → FAILED ❌
  Total Offenses: 5 → 15 (+10) ❌ CRITICAL REGRESSION
    - Error: 0 → 3 (+3) ❌ NEW ERRORS

Test Changes:
  Status: passed → FAILED ❌
  Total Tests: 873 → 873 (stable)
  Failures: 0 → 5 (+5) ❌ NEW FAILURES

Overall Status: FAILED ❌

CRITICAL FINDINGS:
❌ 3 error-level detekt offenses (serious code issues)
❌ 5 failing tests (broken functionality)

REQUIRED ACTIONS:
1. Run './gradlew detekt' to see error details
2. Run './gradlew test integrationTest' to see test failures
3. Fix all critical issues before proceeding
4. Re-run baseline check to verify fixes

DO NOT COMMIT until these critical issues are resolved.

Baseline file: .claude/baseline/feat-new-feature-20251119-162015.json
```

## Interpretation Guidelines

### Status Indicators

Use these indicators in reports:
- ✓ `IMPROVEMENT` - Metrics got better
- ⚠️ `REGRESSION` - Metrics got worse (non-critical)
- ❌ `CRITICAL REGRESSION` - Serious issues (errors, test failures)
- `(stable)` - No change
- `PASSED` - All checks passed
- `FAILED` - One or more checks failed

### Severity Assessment

**Critical (❌):**
- Detekt error offenses
- Test failures (any)
- Overall status changed to "failed"

**Warning (⚠️):**
- Increased convention offenses
- Increased warning offenses
- Decreased test count
- Increased skipped tests

**Positive (✓):**
- Decreased offenses
- Increased test count
- Decreased skipped tests
- Resolved failures

### Recommendations

Based on findings, provide actionable guidance:

**No regressions:**
- "Quality baseline looks good. Proceed with confidence."

**Minor regressions:**
- "Consider addressing new offenses before committing."
- "Run './gradlew detekt' to see offense details."

**Critical regressions:**
- "DO NOT COMMIT until critical issues are resolved."
- "Run diagnostic commands to investigate failures."
- "Re-run baseline check after fixes to verify."

## Edge Cases

### No Tools Available

If both detekt and Gradle tests are unavailable:

```
Baseline Quality Check - Tools Not Available
============================================

Neither detekt nor Gradle tests are available in this environment.

To enable quality checks:
1. Ensure detekt plugin is configured in build.gradle.kts
2. Ensure test tasks are available
3. Re-run this baseline check

Baseline file: .claude/baseline/main-20251119-143022.json
```

### Empty Test Suite

If no tests exist yet (pre-implementation):

```
Baseline Quality Check - Pre-Implementation
===========================================

Detekt: passed (0 offenses)
Tests: No tests exist yet

This appears to be a pre-implementation baseline. As you add tests,
future checks will track test coverage growth.

Baseline file: .claude/baseline/feat-new-feature-20251119-143022.json
```

### Branch Comparison

If comparing across branches (e.g., feature branch vs main):

```
Note: Previous baseline is from a different branch or significantly
older commit. Comparison may include expected differences from other work.
```

## TDD Integration

baseline-check plays a critical role in TDD workflow:

**During GREEN Phase**:
- Verify tests exist for new implementation
- Confirm tests are passing
- Measure test coverage increase
- Flag if implementation has no corresponding tests

**During REFACTOR Phase**:
- Confirm all tests still pass after refactoring
- Verify no test coverage regression
- Compare before/after refactor metrics

**Quality Gate**:
- No implementation accepted without tests
- Test count should increase with new features
- Test pass rate should remain 100%
- No detekt errors allowed

## Best Practices

1. **Run before starting work** - Establishes clean baseline
2. **Run after each significant change** - Catches issues early
3. **Run after GREEN phase** - Verify tests exist and pass
4. **Run after REFACTOR phase** - Confirm tests still pass
5. **Don't ignore warnings** - Small regressions accumulate
6. **Celebrate improvements** - Acknowledge quality improvements
7. **Block on critical issues** - Never commit with errors/failures

## Technical Notes

- Baseline files are timestamped: `{branch}-{YYYYMMDD-HHMMSS}.json`
- Files are stored in `.claude/baseline/` (gitignored)
- Script exits 1 if checks fail (for CI integration)
- Execution times are informational only (don't compare)
- Branch name is sanitized (slashes replaced with dashes)
- Detekt results parsed from `build/reports/detekt/detekt.xml`
- Test results parsed from `build/test-results/test/*.xml` and `build/test-results/integrationTest/*.xml`

## Example Workflow

**Starting new feature:**
```
1. User: "I want to add MCP session management"
2. Claude: Runs baseline-check skill → establishes baseline
3. Claude: Reports current state (e.g., "861 tests passing, 9 detekt offenses")
4. Claude: Proceeds with implementation
5. Claude: After implementation, runs baseline-check again
6. Claude: Compares results, reports findings
7. Claude: If regressions, recommends fixes before commit
```

## Output Files

The skill reads but does not create files (wrapper script creates them):
- Input: `.claude/baseline/{branch}-{timestamp}.json`
- Format: See Step 2 for JSON structure

## Success Criteria

The skill succeeds when it:
- Executes the wrapper script without errors
- Reads and parses the JSON results
- Compares against previous baseline (if available)
- Provides clear, actionable report
- Highlights any regressions prominently
- Guides next steps based on findings

The skill fails when:
- Wrapper script cannot be executed
- JSON file cannot be read or parsed
- Report is unclear or incomplete
