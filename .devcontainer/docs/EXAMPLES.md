# DevContainer Usage Examples

Real-world examples of using the CycleTime devcontainer with Claude Code.

## Table of Contents

1. [Basic Workflows](#basic-workflows)
2. [Unattended Operations](#unattended-operations)
3. [Integration with CycleTime](#integration-with-cycletime)
4. [Advanced Patterns](#advanced-patterns)

---

## Basic Workflows

### Example 1: Code Review

**Scenario**: Review authentication code before merging PR.

```bash
# Start interactive session
claude

# Request review
Claude> Review src/main/kotlin/io/spiralhouse/cycletime/auth/AuthService.kt for:
1. Security vulnerabilities
2. Code quality issues
3. Best practices violations
4. Performance concerns

# Claude analyzes code and provides detailed feedback
# Make recommended changes
Claude> Apply security fixes you recommended

# Verify changes
Claude> /exit
./gradlew test detekt
git diff

# Commit if satisfied
git add -A
git commit -m "fix(auth): apply security improvements from code review"
```

### Example 2: Generate Tests

**Scenario**: Add comprehensive tests for new feature.

```bash
# 1. Create feature branch
git checkout -b feat/add-tests

# 2. Interactive exploration
claude "What tests are missing for SessionManager?"

# 3. Generate tests
claude "Generate unit tests for SessionManager covering:
- Session creation
- Session expiration
- Session cleanup
- Error handling"

# 4. Run tests
./gradlew test

# 5. Commit
git add -A
git commit -m "test: add comprehensive SessionManager tests"
```

### Example 3: Refactoring

**Scenario**: Refactor code to improve testability.

```bash
# 1. Create experiment branch
git checkout -b experiment/refactor-di

# 2. Ask Claude for approach
claude "How should I refactor UserService to use constructor injection?"

# 3. Apply refactoring
claude "Refactor UserService to use constructor injection with interfaces"

# 4. Verify
./gradlew test

# 5. If successful, merge
if [ $? -eq 0 ]; then
    git checkout main
    git merge experiment/refactor-di
    git branch -d experiment/refactor-di
else
    git checkout main
    git branch -D experiment/refactor-di
fi
```

---

## Unattended Operations

### Example 4: Automated Test Generation

**Scenario**: Generate tests for entire module unattended.

```bash
#!/bin/bash
# generate-tests.sh

set -e

# Pre-flight checks
if [ "$DEVCONTAINER" != "true" ]; then
    echo "ERROR: Must run inside devcontainer"
    exit 1
fi

# Enable dangerous mode
/usr/local/bin/enable-dangerous-mode.sh 1800 "Generate tests for auth module"

# Start monitoring
/usr/local/bin/monitor-resources.sh &
MONITOR_PID=$!

# Store pre-run state
PRE_COMMIT=$(git rev-parse HEAD)

# Run Claude Code
timeout 30m claude \
    --dangerously-skip-permissions \
    --log-level=debug \
    "Generate comprehensive unit tests for all classes in src/main/kotlin/io/spiralhouse/cycletime/auth/ that don't have tests yet. Follow existing test patterns." \
    2>&1 | tee -a /workspace/.claude/audit.log

# Stop monitoring
kill $MONITOR_PID 2>/dev/null || true

# Verify
if ./gradlew test; then
    echo "✓ Tests pass"
    git add -A
    git commit -m "test(auth): generate comprehensive test coverage"
else
    echo "✗ Tests failed - rolling back"
    git reset --hard $PRE_COMMIT
    git clean -fd
    exit 1
fi

# Disable dangerous mode
/usr/local/bin/disable-dangerous-mode.sh "task_complete"
```

**Usage:**
```bash
chmod +x generate-tests.sh
./generate-tests.sh
```

### Example 5: Documentation Generation

**Scenario**: Generate KDoc comments for all public APIs.

```bash
#!/bin/bash
# generate-docs.sh

# Enable dangerous mode
/usr/local/bin/enable-dangerous-mode.sh 900 "Generate KDoc comments"

# Store commit
git add -A && git commit -m "chore: pre-docs snapshot" || true
PRE_COMMIT=$(git rev-parse HEAD)

# Generate docs
claude --dangerously-skip-permissions \
    "Add KDoc comments to all public functions, classes, and properties in src/main/kotlin/ that don't have them. Follow Kotlin documentation standards."

# Verify build still works
if ./gradlew detekt build; then
    git add -A
    git commit -m "docs: generate KDoc comments for public APIs"
else
    git reset --hard $PRE_COMMIT
    git clean -fd
fi

/usr/local/bin/disable-dangerous-mode.sh
```

### Example 6: Dependency Update

**Scenario**: Update dependencies and fix any breaking changes.

```bash
#!/bin/bash
# update-dependencies.sh

# Check for updates
./gradlew dependencyUpdates | tee updates.txt

# Enable dangerous mode
/usr/local/bin/enable-dangerous-mode.sh 3600 "Update dependencies"

# Create branch
git checkout -b chore/dependency-updates

# Update and fix
claude --dangerously-skip-permissions \
    "Update all dependencies in build.gradle.kts to latest versions shown in updates.txt. Fix any compilation errors or test failures caused by the updates."

# Verify
if ./gradlew build test; then
    git add -A
    git commit -m "chore: update dependencies to latest versions"
    echo "✓ Dependencies updated successfully"
else
    echo "✗ Updates failed"
    git checkout main
    git branch -D chore/dependency-updates
fi

/usr/local/bin/disable-dangerous-mode.sh
rm updates.txt
```

---

## Integration with CycleTime

### Example 7: Linear Issue to Implementation

**Scenario**: Implement feature from Linear issue end-to-end.

```bash
#!/bin/bash
# implement-issue.sh

ISSUE_ID="$1"

# Fetch issue details
ISSUE=$(gh api repos/your-org/cycletime/issues/$ISSUE_ID)
TITLE=$(echo "$ISSUE" | jq -r '.title')

# Create feature branch
BRANCH="feat/$(echo $TITLE | tr '[:upper:]' '[:lower:]' | tr ' ' '-')"
git checkout -b "$BRANCH"

# Enable dangerous mode
/usr/local/bin/enable-dangerous-mode.sh 3600 "Implement $ISSUE_ID"

# Store pre-run state
PRE_COMMIT=$(git rev-parse HEAD)

# Implement feature
claude --dangerously-skip-permissions \
    "Implement the feature described in Linear issue $ISSUE_ID: $TITLE. Include:
    1. Implementation code following project patterns
    2. Comprehensive unit tests
    3. Integration tests if needed
    4. KDoc comments
    5. Update any relevant documentation"

# Verify
if ./gradlew test detekt build; then
    git add -A
    git commit -m "feat($ISSUE_ID): $TITLE"
    git push -u origin "$BRANCH"
    
    # Create PR
    gh pr create --base main --title "feat($ISSUE_ID): $TITLE" \
        --body "Implements $ISSUE_ID\n\n## Changes\n- Feature implementation\n- Tests\n- Documentation"
else
    echo "Implementation failed - rolling back"
    git reset --hard $PRE_COMMIT
    git clean -fd
    git checkout main
    git branch -D "$BRANCH"
fi

/usr/local/bin/disable-dangerous-mode.sh
```

**Usage:**
```bash
./implement-issue.sh SPI-123
```

### Example 8: MCP Server Integration

**Scenario**: Use Claude Code with running MCP server.

```bash
# Terminal 1: Start MCP server
./gradlew devRun --continuous

# Terminal 2: Use Claude to interact with server
claude "Test the MCP server by:
1. Creating a new project via POST /api/v1/projects
2. Creating an issue in that project
3. Listing all projects
4. Verifying the issue appears in the project"

# Claude will use curl or similar to interact with localhost:8080
# Review the operations and verify
curl http://localhost:8080/api/v1/projects
```

---

## Advanced Patterns

### Example 9: Multi-Step Workflow with Verification

**Scenario**: Complex feature requiring multiple steps with verification between each.

```bash
#!/bin/bash
# multi-step-implementation.sh

set -e

STEPS=(
    "Create User domain entity with validation"
    "Add UserRepository interface and Exposed implementation"
    "Implement UserService with business logic"
    "Create UserController REST endpoints"
    "Add comprehensive tests for all layers"
)

# Enable dangerous mode for entire workflow
/usr/local/bin/enable-dangerous-mode.sh 5400 "Multi-step user management"

for STEP in "${STEPS[@]}"; do
    echo "==== Step: $STEP ===="
    
    # Store state before step
    STEP_COMMIT=$(git rev-parse HEAD)
    
    # Execute step
    timeout 15m claude --dangerously-skip-permissions "$STEP"
    
    # Verify
    if ./gradlew test detekt; then
        echo "✓ Step succeeded"
        git add -A
        git commit -m "feat: $STEP"
    else
        echo "✗ Step failed - rolling back"
        git reset --hard $STEP_COMMIT
        git clean -fd
        exit 1
    fi
done

/usr/local/bin/disable-dangerous-mode.sh "workflow_complete"
echo "All steps completed successfully"
```

### Example 10: Parallel Feature Development

**Scenario**: Develop multiple independent features simultaneously using worktrees.

```bash
#!/bin/bash
# parallel-features.sh

FEATURES=(
    "feat/spi-100-authentication:Implement JWT authentication"
    "feat/spi-101-validation:Add input validation"
    "feat/spi-102-logging:Implement structured logging"
)

# Create worktrees for each feature
for FEATURE in "${FEATURES[@]}"; do
    BRANCH="${FEATURE%%:*}"
    TASK="${FEATURE##*:}"
    
    # Create worktree
    git worktree add "../worktrees/$BRANCH" -b "$BRANCH"
    
    # Run Claude Code in background
    (
        cd "../worktrees/$BRANCH"
        
        # Open in devcontainer and run
        code . &
        sleep 30  # Wait for container to start
        
        # Execute task
        claude --dangerously-skip-permissions "$TASK"
        
        # Verify and commit
        if ./gradlew test; then
            git add -A
            git commit -m "feat: $TASK"
            git push -u origin "$BRANCH"
        fi
    ) &
done

# Wait for all background jobs
wait

echo "All features completed"
```

### Example 11: Continuous Integration Testing

**Scenario**: Use devcontainer in CI pipeline.

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build devcontainer
        uses: devcontainers/ci@v0.3
        with:
          imageTag: cycletime-ci
          runCmd: |
            # Run tests
            ./gradlew test detekt build
            
            # Run Claude Code analysis (if needed)
            claude "Analyze test coverage and suggest improvements" > analysis.txt
            
            # Upload results
            cat analysis.txt
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Example 12: Automated Code Review

**Scenario**: Use Claude Code to review PRs automatically.

```bash
#!/bin/bash
# auto-review-pr.sh

PR_NUMBER="$1"

# Fetch PR details
gh pr checkout $PR_NUMBER
PR_DIFF=$(git diff main...HEAD)

# Enable dangerous mode for review
/usr/local/bin/enable-dangerous-mode.sh 900 "Review PR #$PR_NUMBER"

# Generate review
REVIEW=$(claude --dangerously-skip-permissions \
    "Review this PR for:
    1. Code quality issues
    2. Security vulnerabilities
    3. Performance concerns
    4. Test coverage
    
    Diff:
    $PR_DIFF")

# Post review as comment
gh pr comment $PR_NUMBER --body "$REVIEW"

/usr/local/bin/disable-dangerous-mode.sh
```

---

## Configuration Examples

### Example 13: Custom Dangerous Mode Configuration

`.devcontainer/config/dangerous-mode-custom.json`:
```json
{
  "mode": {
    "enabled": false,
    "maxDuration": 3600,
    "allowBackgroundExecution": false
  },
  "allowlist": {
    "operations": [
      "file_read",
      "git_status",
      "git_log",
      "gradle_test",
      "file_write_tests"
    ],
    "paths": [
      "/workspace/src/test/**",
      "/workspace/docs/**"
    ]
  },
  "denylist": {
    "operations": [
      "git_push_force",
      "rm_recursive",
      "system_package_install"
    ],
    "paths": [
      "/workspace/.env",
      "/workspace/production.conf"
    ]
  },
  "timeouts": {
    "commandExecution": 300,
    "gitOperation": 120
  }
}
```

### Example 14: Resource Limit Customization

`.devcontainer/devcontainer-high-resources.json`:
```json
{
  "name": "CycleTime Claude Code (High Resources)",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "hostConfig": {
    "cpus": "8.0",
    "memory": "16g",
    "memorySwap": "16g",
    "pidsLimit": 300
  },
  "remoteEnv": {
    "NODE_OPTIONS": "--max-old-space-size=12288",
    "JAVA_OPTS": "-Xmx8g"
  }
}
```

---

## Tips for Effective Use

**1. Start Small**: Begin with interactive mode, graduate to unattended.

**2. Checkpoint Frequently**: Commit after each successful step.

**3. Monitor Actively**: Watch resources during unattended operations.

**4. Verify Everything**: Always run tests after Claude Code changes.

**5. Use Dry Run**: Test operations with `dry-run-mode.sh` first.

**6. Review Audit Logs**: Learn from what Claude Code does.

**7. Iterate**: Refine your prompts based on results.

---

**Version**: 1.0
**Last Updated**: 2025-11-03
**Related Documents**:
- [Setup Guide](./SETUP-GUIDE.md)
- [Usage Guide](./USAGE-GUIDE.md)
- [Best Practices](./BEST-PRACTICES.md)
- [FAQ](./FAQ.md)
