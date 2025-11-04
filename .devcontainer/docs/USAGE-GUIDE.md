# DevContainer Usage Guide

Daily development workflows for using the CycleTime devcontainer with Claude Code.

## Table of Contents

1. [Daily Development Workflow](#daily-development-workflow)
2. [Running Claude Code](#running-claude-code)
3. [Using Unattended Mode](#using-unattended-mode-safely)
4. [Enabling Dangerous Mode](#enabling-dangerous-mode)
5. [Monitoring Operations](#monitoring-operations)
6. [Development Tasks](#development-tasks)

---

## Daily Development Workflow

### Starting Your Development Session

**1. Open Project in Container**

If VS Code is not already open in the container:

```bash
# Open project directory
cd /path/to/cycletime

# Launch VS Code
code .
```

Then:
- Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
- Select: `Dev Containers: Reopen in Container`

**2. Verify Container Status**

Once inside the container, verify your environment:

```bash
# Check you're inside the container
echo $DEVCONTAINER
# Expected: true

# Verify Claude Code status
claude /status
# Expected: Authentication: API Key, Model: claude-sonnet-4-5

# Check git status
git status
# Should show clean working directory or current changes
```

**3. Pull Latest Changes**

```bash
# Fetch and pull from remote
git pull origin main

# Or use alias (if configured)
gp  # git pull alias
```

### Standard Development Tasks

**Build the Project**

```bash
# Full build
./gradlew build

# Or use alias
gwb  # gradlew build alias

# Clean build (when needed)
./gradlew clean build
```

**Run Tests**

```bash
# All tests
./gradlew test

# Unit tests only
./gradlew unitTest
# Or alias: gwut

# Integration tests
./gradlew integrationTest
# Or alias: gwit

# Continuous test execution
./gradlew testWatch --continuous
```

**Code Quality Checks**

```bash
# Kotlin linting
./gradlew detekt

# Test coverage report
./gradlew koverHtmlReport
# View report: build/reports/kover/html/index.html

# Coverage verification
./gradlew koverVerify
```

**Run Development Server**

```bash
# Standard mode
./gradlew run

# With hot-reload (recommended for development)
./gradlew devRun --continuous
# Or alias: gwdr
```

### Ending Your Development Session

**1. Commit Your Changes**

```bash
# Stage changes
git add <files>
# Or stage all: git add .

# Commit with message
git commit -m "feat: description of changes"

# Push to remote
git push origin <branch>
```

**2. Stop Development Server**

If running `devRun --continuous`, press `Ctrl+C` to stop.

**3. Close Container (Optional)**

To free up system resources:
- Command Palette: `Dev Containers: Reopen Folder Locally`
- Or close VS Code

**Note**: Container state persists. Next time you open, your build caches and configuration will be retained.

---

## Running Claude Code

### Interactive Mode (Attended)

**Start Interactive Session**

```bash
# Basic interactive mode
claude

# You'll see a prompt:
# Claude>
```

**Example Interactions**

```bash
Claude> Review the authentication code in src/main/kotlin/Auth.kt

Claude> Add unit tests for the SessionManager class

Claude> Explain the project structure

Claude> Create a new endpoint for user registration
```

**Exit Interactive Mode**

```bash
Claude> /exit
# Or press Ctrl+D
```

### Single Command Mode

**Execute One-Off Commands**

```bash
# Code review
claude "Review src/main/kotlin/Auth.kt for security issues"

# Generate tests
claude "Add unit tests for SessionManager"

# Refactoring
claude "Refactor UserService to use dependency injection"

# Documentation
claude "Add KDoc comments to all public functions in Auth.kt"
```

### Model Selection

**Use Specific Models**

```bash
# Use Opus (most capable, slower)
claude --model claude-opus-4-20250514 "Complex architectural design task"

# Use Sonnet (default, balanced)
claude --model claude-sonnet-4-5-20250929 "Standard development task"

# Use Haiku (fastest, cheaper)
claude --model claude-haiku-4-20250309 "Simple code generation"
```

**Set Default Model**

```bash
# In container
export ANTHROPIC_MODEL="claude-sonnet-4-5-20250929"

# Or add to ~/.bashrc or ~/.zshrc for persistence
echo 'export ANTHROPIC_MODEL="claude-sonnet-4-5-20250929"' >> ~/.zshrc
source ~/.zshrc
```

### Useful Claude Code Options

```bash
# Verbose logging
claude --log-level=debug "task description"

# Disable prompt caching (for testing)
claude --no-cache "task description"

# Save transcript to file
claude "task description" 2>&1 | tee session-$(date +%Y%m%d-%H%M%S).log
```

---

## Using Unattended Mode Safely

⚠️ **IMPORTANT**: Unattended mode (`--dangerously-skip-permissions`) should ONLY be used inside the devcontainer with all safety mechanisms active.

### Prerequisites for Unattended Mode

Before enabling unattended operations, verify:

```bash
# 1. Verify container isolation
[ "$DEVCONTAINER" = "true" ] && echo "✓ Inside container" || echo "✗ NOT in container - STOP"

# 2. Check firewall is active
sudo iptables -L OUTPUT -n | grep -q REJECT && echo "✓ Firewall active" || echo "✗ Firewall not active"

# 3. Verify audit logging
[ -f /workspace/.claude/audit.log ] && echo "✓ Audit log present" || echo "✗ Audit log missing"

# 4. Check circuit breaker status
/usr/local/bin/emergency-stop.sh status
# Expected: Circuit breaker: OK
```

### Standard Unattended Workflow

**1. Create Pre-Run Snapshot**

```bash
# Store current commit for rollback
git log -1 --format="%H" > /tmp/pre-run-commit

# Or create full snapshot
cd /workspace
tar -czf /tmp/snapshot-$(date +%Y%m%d-%H%M%S).tar.gz .
```

**2. Run Claude Code with Safety Wrapper**

```bash
# Basic unattended operation (30 minute timeout)
timeout 30m claude \
    --dangerously-skip-permissions \
    --log-level=debug \
    "Implement JWT authentication for user login" \
    2>&1 | tee -a /workspace/.claude/audit.log
```

**3. Verify Results**

```bash
# Run tests
./gradlew test

# Check code quality
./gradlew detekt

# Build project
./gradlew build

# Review changes
git diff
git status
```

**4. Commit or Rollback**

```bash
# If verification passed
if [ $? -eq 0 ]; then
    git add -A
    git commit -m "feat: implement JWT authentication (automated by Claude Code)"
    git push origin <branch>
else
    # Rollback to pre-run state
    PRE_COMMIT=$(cat /tmp/pre-run-commit)
    git reset --hard $PRE_COMMIT
    git clean -fd
    echo "Verification failed - rolled back to $PRE_COMMIT"
fi
```

### Advanced Unattended Script

For repeated unattended operations, use this template:

```bash
#!/bin/bash
# run-claude-unattended.sh

set -e

TASK="$1"

# Validate environment
if [ "$DEVCONTAINER" != "true" ]; then
    echo "ERROR: Must run inside devcontainer"
    exit 1
fi

# Check circuit breaker
/usr/local/bin/emergency-stop.sh check || exit 1

# Store pre-run state
PRE_COMMIT=$(git rev-parse HEAD)
echo "$PRE_COMMIT" > /tmp/pre-run-commit

# Enable monitoring
/usr/local/bin/monitor-resources.sh &
MONITOR_PID=$!

# Run Claude Code
echo "Starting task: $TASK"
timeout 30m claude \
    --dangerously-skip-permissions \
    --log-level=debug \
    "$TASK" \
    2>&1 | tee -a /workspace/.claude/audit.log

CLAUDE_EXIT=$?

# Stop monitoring
kill $MONITOR_PID 2>/dev/null || true

# Verify results
if [ $CLAUDE_EXIT -eq 0 ]; then
    echo "Running verification..."
    if ./gradlew test detekt build; then
        echo "✓ Verification passed"
        git add -A
        git commit -m "feat: $TASK (automated)"
        exit 0
    else
        echo "✗ Verification failed"
        git reset --hard $PRE_COMMIT
        git clean -fd
        exit 1
    fi
else
    echo "✗ Claude Code failed with exit code $CLAUDE_EXIT"
    git reset --hard $PRE_COMMIT
    git clean -fd
    exit 1
fi
```

**Usage:**

```bash
chmod +x run-claude-unattended.sh
./run-claude-unattended.sh "Implement user registration endpoint"
```

---

## Enabling Dangerous Mode

Dangerous mode allows Claude Code to operate with time-limited permission bypasses. This is the recommended approach for unattended operations.

### Enable Dangerous Mode

```bash
# Enable for default 30-minute session
/usr/local/bin/enable-dangerous-mode.sh

# Enable for 1-hour session
/usr/local/bin/enable-dangerous-mode.sh 3600

# Enable with reason (for audit trail)
/usr/local/bin/enable-dangerous-mode.sh 1800 "Implementing authentication feature"
```

**What Happens:**
1. Pre-flight safety checks run
2. Circuit breaker verified
3. Resource availability checked
4. Dangerous mode enabled for specified duration
5. Auto-disable scheduled at timeout

**Output:**

```
Pre-flight checks:
  ✓ Running inside devcontainer
  ✓ Circuit breaker: OK
  ✓ Resource availability: OK (CPU: 15%, Memory: 40%)
  ✓ Git repository: Clean
  ✓ Audit logging: Active

Dangerous mode enabled for 1800 seconds (30 minutes)
Auto-disable scheduled at: 2025-11-03 15:30:00 UTC
Reason: Implementing authentication feature

You can now run Claude Code with --dangerously-skip-permissions
```

### Disable Dangerous Mode

**Manual Disable:**

```bash
# Disable with default reason
/usr/local/bin/disable-dangerous-mode.sh

# Disable with specific reason
/usr/local/bin/disable-dangerous-mode.sh "task_complete"
```

**Auto-Disable:**

Dangerous mode automatically disables after the specified duration.

**Output:**

```
Dangerous mode disabled
Reason: task_complete
Session duration: 1247 seconds (20 minutes 47 seconds)
Operations logged: 127
Summary report: /workspace/.claude/dangerous-mode-summary-20251103153000.txt
```

### Testing with Dry Run

Before running operations in dangerous mode, test with dry run:

```bash
# Test specific operation
/usr/local/bin/dry-run-mode.sh git push origin feat/my-branch

# Output:
# Operation: git push origin feat/my-branch
# Risk Level: MEDIUM
# Action: REQUIRE_CONFIRMATION
# Reason: Shares work with remote, requires explicit approval
```

```bash
# Test file deletion
/usr/local/bin/dry-run-mode.sh rm -rf /important/directory

# Output:
# Operation: rm -rf /important/directory
# Risk Level: CRITICAL
# Action: DENY
# Reason: Recursive deletion can cause irreversible data loss
# Alternative: Delete files individually or use git rm for tracked files
```

```bash
# Simulate entire session
/usr/local/bin/dry-run-mode.sh --simulate-session 1800

# Output: Detailed simulation of 30-minute dangerous mode session
```

---

## Monitoring Operations

### Real-Time Resource Monitoring

**Start Monitoring:**

```bash
# Continuous monitoring (5-second intervals)
/usr/local/bin/monitor-resources.sh

# Sample output:
# [2025-11-03T14:35:22.123Z] CPU: 45% | MEM: 62% | DISK: 35% | PIDs: 25%
# [2025-11-03T14:35:27.456Z] CPU: 48% | MEM: 64% | DISK: 35% | PIDs: 27%
```

**Single Snapshot:**

```bash
# Human-readable
/usr/local/bin/monitor-resources.sh once

# JSON format (for scripting)
/usr/local/bin/monitor-resources.sh once json
```

**Individual Metrics:**

```bash
# CPU usage
/usr/local/bin/monitor-resources.sh cpu
# Output: 45

# Memory usage
/usr/local/bin/monitor-resources.sh memory
# Output: 62

# Disk usage
/usr/local/bin/monitor-resources.sh disk
# Output: 35

# PID count
/usr/local/bin/monitor-resources.sh pids
# Output: 25
```

### Audit Log Monitoring

**View Recent Operations:**

```bash
# Last 20 operations
tail -20 /workspace/.claude/audit.log | jq .

# Last 50 operations with timestamps
tail -50 /workspace/.claude/audit.log | jq -r '[.timestamp, .type, .result] | @tsv'
```

**Filter by Operation Type:**

```bash
# File writes
jq 'select(.type=="file_write")' /workspace/.claude/audit.log

# Command executions
jq 'select(.type=="command_exec")' /workspace/.claude/audit.log

# Network requests
jq 'select(.type=="network_req")' /workspace/.claude/audit.log

# Git operations
jq 'select(.type=="git")' /workspace/.claude/audit.log
```

**Filter by Result:**

```bash
# Failed operations
jq 'select(.result=="failure")' /workspace/.claude/audit.log

# Operations with errors
jq 'select(.result=="error")' /workspace/.claude/audit.log

# Successful operations
jq 'select(.result=="success")' /workspace/.claude/audit.log
```

**Statistics:**

```bash
# View audit statistics
/usr/local/bin/audit-logger.sh stats

# Sample output:
# Audit Log Statistics
# ====================
# Total operations: 1247
# Successful: 1198 (96.1%)
# Failed: 49 (3.9%)
#
# Operations by type:
#   file_write: 342 (27.4%)
#   command_exec: 521 (41.8%)
#   network_req: 234 (18.8%)
#   git: 150 (12.0%)
#
# Most recent operation: 2025-11-03T14:35:22.123Z
```

### Circuit Breaker Status

**Check Status:**

```bash
/usr/local/bin/emergency-stop.sh status

# Output (normal):
# Circuit breaker: OK
# No emergency stop conditions detected

# Output (tripped):
# Circuit breaker: TRIPPED
# Reason: High CPU usage
# Tripped at: 2025-11-03T14:30:00.000Z
```

**Manual Trip:**

```bash
# Trip circuit breaker (stops operations)
/usr/local/bin/emergency-stop.sh trip "Testing emergency procedures"

# Output:
# Circuit breaker tripped
# Reason: Testing emergency procedures
# File: /tmp/claude-circuit-breaker
```

**Reset:**

```bash
# Reset circuit breaker (after fixing issue)
/usr/local/bin/emergency-stop.sh reset

# Output:
# Circuit breaker reset
# Operations can resume
```

---

## Development Tasks

### Working with Feature Branches

**Create Feature Branch:**

```bash
# Create and checkout feature branch
git checkout -b feat/spi-123-authentication

# Or use branch from Linear issue
git checkout -b feat/spi-123-jwt-auth
```

**Work on Feature:**

```bash
# Use Claude Code to implement feature
claude "Implement JWT authentication with token validation"

# Run tests
./gradlew test

# Commit changes
git add -A
git commit -m "feat(spi-123): implement JWT authentication"
```

**Push Feature Branch:**

```bash
# Push to remote
git push -u origin feat/spi-123-jwt-auth

# Create pull request
gh pr create --base main --title "feat(spi-123): Implement JWT authentication"
```

### Running MCP Server

**Start MCP Server:**

```bash
# Standard mode
./gradlew run

# Development mode with auto-reload
./gradlew devRun --continuous
```

**Verify MCP Server:**

```bash
# Check if server is running
curl -I http://localhost:8080/health

# Test MCP endpoint
curl http://localhost:8080/api/v1/projects
```

**View Server Logs:**

```bash
# In separate terminal
tail -f logs/cycletime.log
```

### Database Operations

**Run Migrations:**

```bash
# Apply pending migrations
./gradlew flywayMigrate

# Check migration status
./gradlew flywayInfo

# Validate migrations
./gradlew flywayValidate
```

**Access Database:**

```bash
# H2 database console (if enabled)
# Navigate to: http://localhost:8080/h2-console

# JDBC URL: jdbc:h2:file:./cycletime-ce
# User: sa
# Password: (empty)
```

### Dependency Management

**Update Dependencies:**

```bash
# Check for dependency updates
./gradlew dependencyUpdates

# Refresh dependencies
./gradlew build --refresh-dependencies

# View dependency tree
./gradlew dependencies
```

**Add New Dependency:**

Edit `build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.example:library:1.0.0")
}
```

Then:

```bash
./gradlew build --refresh-dependencies
```

### Code Generation

**Use Claude Code for Generation:**

```bash
# Generate data classes
claude "Generate Kotlin data class for User with id, email, name fields"

# Generate repository interface
claude "Create repository interface for User entity with CRUD operations"

# Generate tests
claude "Generate unit tests for UserRepository using MockK"
```

### Performance Testing

**Run Performance Tests:**

```bash
# System tests (includes performance)
./gradlew systemTest

# Specific performance test
./gradlew systemTest --tests "*PerformanceTest"
```

**Profile Application:**

```bash
# Run with profiling
./gradlew run --args="--profile"

# View profiling results
ls -la build/reports/profiling/
```

---

## Tips and Tricks

### Useful Aliases

The post-create script configures these aliases:

```bash
# Gradle aliases
gw      # ./gradlew
gwb     # ./gradlew build
gwt     # ./gradlew test
gwc     # ./gradlew clean
gwut    # ./gradlew unitTest
gwit    # ./gradlew integrationTest
gwr     # ./gradlew run
gwdr    # ./gradlew devRun --continuous
gwbs    # ./gradlew buildStatus

# Git aliases
gs      # git status
gp      # git pull
gc      # git commit
gca     # git commit --amend
gl      # git log --oneline --graph --all -20
```

**Reload Aliases:**

```bash
source ~/.bashrc
# Or for zsh:
source ~/.zshrc
```

### Quick Commands

**Check Build Status:**

```bash
gwbs  # Shows Gradle configuration and optimization status
```

**Clean and Rebuild:**

```bash
gwc && gwb
# Or: ./gradlew clean build
```

**Run All Quality Checks:**

```bash
./gradlew check
# Includes: test, detekt, koverVerify
```

### Working with Multiple Terminals

**Terminal 1: Development Server**

```bash
gwdr  # ./gradlew devRun --continuous
```

**Terminal 2: Test Watcher**

```bash
./gradlew testWatch --continuous
```

**Terminal 3: Git Operations**

```bash
gs  # git status
gc -m "feat: description"  # git commit
```

**Terminal 4: Claude Code**

```bash
claude  # Interactive session
```

---

## Next Steps

**Continue to:**
- [Best Practices](./BEST-PRACTICES.md) - Safe workflow patterns and recommendations
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions
- [FAQ](./FAQ.md) - Frequently asked questions

**Advanced Topics:**
- [DANGEROUS-MODE.md](../DANGEROUS-MODE.md) - Complete dangerous mode documentation
- [SAFETY.md](../SAFETY.md) - Safety mechanism details

---

**Version**: 1.0
**Last Updated**: 2025-11-03
**Related Documents**:
- [Setup Guide](./SETUP-GUIDE.md)
- [Best Practices](./BEST-PRACTICES.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [FAQ](./FAQ.md)
