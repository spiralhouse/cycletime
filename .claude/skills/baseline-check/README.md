# Baseline Check Skill

Autonomous quality tracking for CycleTime development. Runs detekt and Gradle tests before/after development to detect regressions automatically.

## Quick Start

```bash
# Run from project root
./.claude/skills/baseline-check/baseline-check.sh
```

## What It Does

1. Runs `./gradlew detekt` and captures static analysis metrics
2. Runs `./gradlew test integrationTest` and captures test metrics
3. Generates timestamped JSON baseline in `.claude/baseline/{branch}-{timestamp}.json`
4. Exits with status code 1 if checks fail (for CI integration)

## Output Format

```json
{
  "timestamp": "2025-11-20T01:46:48Z",
  "branch": "feat/spi-1154-enhance-claude-code-workflow-with-command-driven-development",
  "commit": "090d0ff",
  "checks": {
    "detekt": {
      "available": true,
      "status": "passed",
      "total_offenses": 260,
      "offenses_by_severity": {
        "convention": 0,
        "warning": 260,
        "error": 0
      },
      "execution_time": 2
    },
    "tests": {
      "available": true,
      "status": "passed",
      "total": 1597,
      "failures": 0,
      "skipped": 29,
      "execution_time": 3
    }
  },
  "overall_status": "passed",
  "summary": "All quality checks passed"
}
```

## Usage in Claude Code

See [SKILL.md](./SKILL.md) for complete documentation on how Claude Code agents use this skill for:
- Baseline establishment before development
- Regression detection after changes
- Quality gate enforcement
- TDD workflow integration

## Files

- `baseline-check.sh` - Main wrapper script
- `SKILL.md` - Complete skill documentation for Claude Code agents
- `README.md` - This file

## Quality Gates

The skill enforces these quality gates:

**Critical (blocks commits):**
- Detekt error-level offenses
- Test failures

**Warning (should be addressed):**
- Increased detekt offenses (any severity)
- Decreased test count
- Increased skipped tests

**Positive (celebrate!):**
- Decreased offenses
- Increased test count
- Resolved failures

## Integration

Baseline files are stored in `.claude/baseline/` (gitignored) and named `{branch}-{timestamp}.json`. This allows:
- Historical tracking of quality metrics
- Branch-specific baselines
- Comparison across time for trend analysis

## Exit Codes

- `0` - All checks passed
- `1` - One or more checks failed
- `2` - Script error (not in git repo, etc.)
