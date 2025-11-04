# Dangerous Mode Configuration

Complete documentation for Claude Code `--dangerously-skip-permissions` mode with comprehensive safety guardrails.

## Overview

Dangerous mode allows Claude Code to operate with reduced permission prompts in an unattended or semi-automated fashion. This configuration implements defense-in-depth safety mechanisms to prevent catastrophic failures while enabling productivity improvements.

**CRITICAL WARNING**: Even with safeguards, dangerous mode can cause data loss, repository corruption, or security vulnerabilities if misconfigured. Only enable in isolated environments (devcontainers) with proper monitoring.

## Table of Contents

- [Quick Start](#quick-start)
- [Operation Categories](#operation-categories)
- [Safety Mechanisms](#safety-mechanisms)
- [Scripts Reference](#scripts-reference)
- [Risk Assessment Matrix](#risk-assessment-matrix)
- [Emergency Procedures](#emergency-procedures)
- [Troubleshooting](#troubleshooting)
- [Configuration Reference](#configuration-reference)

## Quick Start

### 1. Validate Configuration

Before enabling dangerous mode, validate your configuration:

```bash
.devcontainer/scripts/dry-run-mode.sh --validate-config
```

### 2. Test with Dry Run

Simulate operations without executing them:

```bash
# Simulate a session
.devcontainer/scripts/dry-run-mode.sh --simulate-session 1800

# Assess specific operations
.devcontainer/scripts/dry-run-mode.sh git push origin feat/my-branch
.devcontainer/scripts/dry-run-mode.sh rm some-file.txt
```

### 3. Enable Dangerous Mode

Enable for a time-limited session:

```bash
# 30-minute session (default)
.devcontainer/scripts/enable-dangerous-mode.sh

# Custom duration with reason
.devcontainer/scripts/enable-dangerous-mode.sh 3600 "Implementing auth feature"
```

### 4. Disable Dangerous Mode

Manually disable before timeout:

```bash
# Manual disable
.devcontainer/scripts/disable-dangerous-mode.sh

# Disable with reason
.devcontainer/scripts/disable-dangerous-mode.sh "task_complete"
```

## Operation Categories

### Allowlist (Auto-Approved)

Operations that can proceed without confirmation in dangerous mode.

#### Read Operations (Risk: LOW)

**Rationale**: Read-only operations cannot modify state or cause data loss.

**Operations**:
- `file_read` - Reading file contents
- `directory_list` - Listing directory contents
- `git_status` - Git repository status
- `git_log` - Git commit history
- `git_diff` - Git change diffs
- `git_show` - Show git objects
- `git_branch_list` - List branches
- `gradle_tasks` - List Gradle tasks
- `gradle_dependencies` - Show dependencies

**Conditions**: None

**Example**:
```bash
cat src/main/kotlin/App.kt          # ALLOWED
ls -la src/                          # ALLOWED
git log --oneline                    # ALLOWED
./gradlew tasks                      # ALLOWED
```

#### Non-Destructive Git (Risk: LOW)

**Rationale**: Standard git workflow operations on feature branches are safe and necessary for development.

**Operations**:
- `git_add` - Stage files for commit
- `git_commit_to_feature_branch` - Commit to feature branch
- `git_checkout_feature_branch` - Switch to feature branch
- `git_fetch` - Fetch remote changes
- `git_pull_feature_branch` - Pull feature branch changes

**Conditions**:
- Branch must match pattern: `^(feat|fix|refactor|test|docs|chore|build|ci)/.*`
- Excluded branches: `main`, `master`, `develop`, `release/*`, `hotfix/*`

**Example**:
```bash
git add src/main/kotlin/Auth.kt      # ALLOWED on feat/spi-123-auth
git commit -m "Add auth logic"       # ALLOWED on feat/spi-123-auth
git checkout feat/spi-456-feature    # ALLOWED
git fetch origin                     # ALLOWED
git pull origin feat/spi-123-auth    # ALLOWED

git commit -m "Fix bug"              # BLOCKED on main branch
```

#### Build Operations (Risk: LOW)

**Rationale**: Build and compilation operations are idempotent and don't affect source code or repository.

**Operations**:
- `gradle_build` - Full build
- `gradle_compile` - Compilation only
- `gradle_assemble` - Assemble artifacts
- `gradle_clean` - Clean build outputs

**Conditions**:
- No deployment tasks
- No database migrations

**Example**:
```bash
./gradlew build                      # ALLOWED
./gradlew clean                      # ALLOWED
./gradlew assemble                   # ALLOWED

./gradlew deploy                     # BLOCKED (deployment task)
```

#### Test Execution (Risk: LOW)

**Rationale**: Running tests is safe and essential for development workflow.

**Operations**:
- `gradle_test` - All tests
- `gradle_unitTest` - Unit tests only
- `gradle_integrationTest` - Integration tests
- `gradle_check` - All quality checks
- `npm_test` - NPM tests

**Conditions**: None

**Example**:
```bash
./gradlew test                       # ALLOWED
./gradlew unitTest                   # ALLOWED
./gradlew integrationTest            # ALLOWED
npm test                             # ALLOWED
```

#### Code Quality (Risk: LOW)

**Rationale**: Static analysis and reporting tools are read-only.

**Operations**:
- `gradle_detekt` - Kotlin linting
- `gradle_koverHtmlReport` - Coverage report
- `gradle_koverVerify` - Coverage verification
- `npm_lint` - NPM linting

**Conditions**: None

**Example**:
```bash
./gradlew detekt                     # ALLOWED
./gradlew koverHtmlReport            # ALLOWED
npm run lint                         # ALLOWED
```

#### File Modifications (Risk: MEDIUM)

**Rationale**: Controlled file modifications in allowed paths support development workflow.

**Operations**:
- `file_create` - Create new files
- `file_edit` - Edit existing files
- `file_rename` - Rename files

**Conditions**:
- Allowed paths:
  - `/workspace/src/**` - Source code
  - `/workspace/docs/**` - Documentation
  - `/workspace/.claude/**` - Claude state
  - `/workspace/build/**` - Build outputs
  - `/workspace/.devcontainer/**` - Devcontainer config
- Excluded paths:
  - `/workspace/.git/**` - Git internals
  - `/workspace/.env` - Environment variables
  - `/workspace/credentials.json` - Credentials
  - `/workspace/*.db` - Databases
  - `/workspace/production.conf` - Production config

**Example**:
```bash
# ALLOWED
touch src/main/kotlin/NewFile.kt
echo "content" > docs/guide.md
mv src/test/Test.kt src/test/BetterTest.kt

# BLOCKED
echo "KEY=secret" > .env
rm -f production.db
```

### Denylist (Always Blocked)

Operations that must NEVER be auto-approved, regardless of context.

#### Destructive Git (Risk: CRITICAL)

**Rationale**: These operations can permanently destroy commit history or lose work.

**Blocked Operations**:
- `git_push_force` - Force push to any branch
- `git_push_force_with_lease_to_main` - Force with lease to main
- `git_reset_hard` - Hard reset discards changes
- `git_clean_fdx` - Delete untracked files
- `git_branch_delete_remote` - Delete remote branches
- `git_rebase_interactive` - Interactive rebase
- `git_filter_branch` - History rewriting

**Reason**: Can cause permanent data loss or corrupt repository history

**Example**:
```bash
git push --force origin main         # BLOCKED - CRITICAL
git reset --hard HEAD~5              # BLOCKED - CRITICAL
git clean -fdx                       # BLOCKED - CRITICAL
git filter-branch --tree-filter      # BLOCKED - CRITICAL
```

**Alternatives**:
- Instead of force push: Use `--force-with-lease` and coordinate with team
- Instead of hard reset: Use `git stash` to preserve changes
- Instead of clean -fdx: Selectively delete files or use `git clean -n` first

#### Protected Branch Operations (Risk: CRITICAL)

**Rationale**: Protected branches require pull request workflow and code review.

**Blocked Operations**:
- `git_push_to_main` - Push directly to main
- `git_push_to_master` - Push directly to master
- `git_merge_to_main` - Merge to main without PR
- `git_commit_to_main` - Commit directly to main

**Reason**: Protected branches require pull request workflow

**Example**:
```bash
git checkout main                    # ALLOWED
git commit -m "Fix"                  # BLOCKED on main - CRITICAL
git push origin main                 # BLOCKED - CRITICAL
git merge feat/branch                # BLOCKED on main - CRITICAL
```

**Alternatives**:
- Create feature branch: `git checkout -b feat/my-fix`
- Push to feature branch: `git push origin feat/my-fix`
- Create pull request: `gh pr create`

#### Destructive Filesystem (Risk: CRITICAL)

**Rationale**: Recursive deletion can cause irreversible data loss.

**Blocked Operations**:
- `rm_recursive` - Recursive file deletion
- `recursive_delete` - Directory tree deletion
- `file_delete_pattern` - Pattern-based deletion
- `directory_delete` - Directory deletion

**Blocked Patterns**:
- `rm -rf` - Force recursive delete
- `rm -fr` - Alternative force recursive
- `find . -delete` - Find and delete
- `find . -exec rm` - Find with delete execution

**Reason**: Can cause irreversible data loss

**Example**:
```bash
rm -rf src/                          # BLOCKED - CRITICAL
find . -name "*.tmp" -delete         # BLOCKED - CRITICAL
rm -fr /workspace/*                  # BLOCKED - CRITICAL
```

**Alternatives**:
- Delete files individually: `rm specific-file.txt`
- Use git for tracked files: `git rm filename`
- Preview with find: `find . -name "*.tmp"` (without -delete)

#### System Configuration (Risk: CRITICAL)

**Rationale**: System-level changes can compromise container security and stability.

**Blocked Operations**:
- `etc_modification` - Changes to /etc
- `system_package_install` - Package installation
- `system_service_modification` - Service changes
- `kernel_module_load` - Kernel module loading
- `firewall_rule_modification` - Firewall changes

**Blocked Paths**:
- `/etc/**` - System configuration
- `/sys/**` - System interfaces
- `/proc/**` - Process information
- `/boot/**` - Boot configuration

**Reason**: System-level changes can compromise container security

**Example**:
```bash
sudo vi /etc/hosts                   # BLOCKED - CRITICAL
apt-get install package              # BLOCKED - CRITICAL
systemctl restart service            # BLOCKED - CRITICAL
modprobe kernel-module               # BLOCKED - CRITICAL
```

**Alternatives**:
- Use Dockerfile for system changes
- Rebuild container with new configuration
- Request infrastructure changes through proper channels

#### Docker Host Operations (Risk: CRITICAL)

**Rationale**: Breaking container isolation compromises the entire safety architecture.

**Blocked Operations**:
- `docker_host_access` - Access to Docker host
- `container_privileged_execution` - Privileged containers
- `host_network_access` - Host network mode
- `volume_host_mount` - Host volume mounts

**Reason**: Breaking container isolation compromises safety architecture

**Example**:
```bash
docker run --privileged              # BLOCKED - CRITICAL
docker run --network=host            # BLOCKED - CRITICAL
docker run -v /:/host                # BLOCKED - CRITICAL
```

#### Network Configuration (Risk: CRITICAL)

**Rationale**: Network isolation is a critical security control.

**Blocked Operations**:
- `iptables_flush` - Flush firewall rules
- `firewall_disable` - Disable firewall
- `dns_modification` - DNS configuration changes
- `routing_table_modification` - Routing changes

**Reason**: Network isolation is critical security control

**Example**:
```bash
iptables -F                          # BLOCKED - CRITICAL
systemctl stop firewalld             # BLOCKED - CRITICAL
echo "nameserver 1.1.1.1" > /etc/resolv.conf  # BLOCKED - CRITICAL
```

#### Credential Operations (Risk: CRITICAL)

**Rationale**: Credential exposure creates immediate security vulnerabilities.

**Blocked Operations**:
- `env_file_modification` - .env file changes
- `credential_file_read` - Reading credential files
- `secret_exposure` - Exposing secrets
- `api_key_commit` - Committing API keys

**Blocked Patterns**:
- `.env` - Environment variables
- `credentials.json` - Credential files
- `*.key` - Private keys
- `*.pem` - PEM certificates
- `*.pfx` - PFX certificates
- `*_token` - Token files
- `*_secret` - Secret files

**Reason**: Credential exposure creates security vulnerabilities

**Example**:
```bash
cat .env                             # BLOCKED - CRITICAL
git add credentials.json             # BLOCKED - CRITICAL
echo "API_KEY=secret" > config.env   # BLOCKED - CRITICAL
```

#### Deployment Operations (Risk: CRITICAL)

**Rationale**: Production changes require manual approval and validation.

**Blocked Operations**:
- `production_deployment` - Deploy to production
- `database_migration_production` - Production migrations
- `infrastructure_modification` - Infrastructure changes
- `cloud_resource_creation` - Cloud resource creation

**Reason**: Production changes require manual approval and validation

**Example**:
```bash
./gradlew deployProduction           # BLOCKED - CRITICAL
flyway migrate -url=jdbc:production  # BLOCKED - CRITICAL
terraform apply                      # BLOCKED - CRITICAL
```

### Require Confirmation (Explicit Approval)

Operations that require explicit confirmation even in dangerous mode.

#### Git Push (Risk: MEDIUM)

**Operations**:
- `git_push_feature_branch` - Push feature branch
- `git_push_with_upstream` - Push with upstream tracking

**Confirmation**: "Push changes to remote? This will share your work with others."

**Rationale**: Sharing work with remote requires explicit approval to prevent accidental exposure.

**Example**:
```bash
git push origin feat/my-branch       # REQUIRES CONFIRMATION
git push -u origin feat/new-feature  # REQUIRES CONFIRMATION
```

#### File Deletion (Risk: MEDIUM)

**Operations**:
- `file_delete` - Single file deletion
- `multiple_file_delete` - Multiple file deletion

**Confirmation**: "Delete file(s)? This action cannot be undone."

**Rationale**: File deletion is permanent and requires explicit approval.

**Example**:
```bash
rm important-file.txt                # REQUIRES CONFIRMATION
rm file1.txt file2.txt file3.txt     # REQUIRES CONFIRMATION
```

#### Branch Deletion (Risk: MEDIUM)

**Operations**:
- `git_branch_delete_local` - Delete local branch
- `git_branch_delete_merged` - Delete merged branch

**Confirmation**: "Delete branch? Ensure changes are merged or backed up."

**Rationale**: Branch deletion requires verification that work is preserved.

**Example**:
```bash
git branch -d feat/old-feature       # REQUIRES CONFIRMATION
git branch -D feat/experimental      # REQUIRES CONFIRMATION
```

#### Deployment Staging (Risk: HIGH)

**Operations**:
- `deploy_to_staging` - Deploy to staging environment
- `database_migration_staging` - Staging database migration

**Confirmation**: "Deploy to staging environment? Verify tests pass first."

**Rationale**: Even staging deployments can affect other developers and require coordination.

**Example**:
```bash
./gradlew deployStaging              # REQUIRES CONFIRMATION
flyway migrate -url=jdbc:staging     # REQUIRES CONFIRMATION
```

## Safety Mechanisms

### Pre-Flight Checks

Run before enabling dangerous mode:

1. **Circuit Breaker Status**
   - Command: `emergency-stop.sh status`
   - Expected: `OK`
   - Failure: Abort enablement

2. **Resource Availability**
   - Command: `monitor-resources.sh once json`
   - Thresholds: CPU < 70%, Memory < 70%, Disk < 80%, PIDs < 60%
   - Failure: Warn and prompt for confirmation

3. **Git Repository Clean**
   - Command: `git status --porcelain`
   - Expected: Empty (no uncommitted changes)
   - Failure: Warn and prompt for confirmation

4. **Audit Logging Active**
   - Command: `test -f /workspace/.claude/audit.log`
   - Expected: File exists and writable
   - Failure: Abort enablement

### Continuous Monitoring

Active during dangerous mode session:

| Metric | Interval | Threshold | Action |
|--------|----------|-----------|--------|
| Resource Usage | 5s | CPU: 90%, Mem: 85%, Disk: 90%, PIDs: 80% | Emergency stop |
| Process Count | 5s | 180 processes | Warning |
| Disk I/O | 5s | 90% of throttle limit | Warning |

### Emergency Stop Conditions

Automatic emergency stop triggered when:

1. **CPU Threshold Exceeded**
   - Threshold: > 95%
   - Duration: 30 seconds
   - Action: Immediate stop

2. **Memory Threshold Exceeded**
   - Threshold: > 95%
   - Duration: 10 seconds
   - Action: Immediate stop

3. **PID Threshold Exceeded**
   - Threshold: > 190 (approaching 200 limit)
   - Duration: Immediate
   - Action: Immediate stop

4. **Circuit Breaker Tripped**
   - Trigger: External circuit breaker activation
   - Action: Immediate stop

5. **Denylist Operation Attempted**
   - Trigger: Any denylist operation attempted
   - Action: Immediate stop

### Audit Logging

All operations logged in JSON Lines format:

```json
{
  "timestamp": "2025-11-03T14:35:22.123Z",
  "type": "dangerous_mode",
  "operation": "enabled",
  "user": "vscode",
  "result": "success",
  "duration_ms": 0,
  "metadata": {
    "reason": "Implementing auth feature",
    "duration": 1800
  }
}
```

**Logged Events**:
- Dangerous mode enable/disable
- All allowlist operations
- All denylist operation attempts
- Confirmation prompts and responses
- Emergency stop events
- Resource alerts
- All executed commands

### State Checkpointing

Automatic state preservation:

- **Checkpoint Interval**: Every 5 minutes
- **Backup Location**: `/workspace/.claude/state/`
- **Max Backups**: 10 (oldest deleted)
- **Emergency Backup**: On emergency stop

**Checkpoint Contents**:
- Git branch and commit
- Resource usage snapshot
- Working directory path
- Timestamp

## Scripts Reference

### enable-dangerous-mode.sh

Enable dangerous mode with safety checks.

**Usage**:
```bash
enable-dangerous-mode.sh [duration_seconds] [reason]
```

**Arguments**:
- `duration_seconds` - Session duration (default: 1800 = 30 min, max recommended: 7200 = 2 hours)
- `reason` - Reason for enabling (for audit log)

**Examples**:
```bash
# Default 30-minute session
enable-dangerous-mode.sh

# 1-hour session
enable-dangerous-mode.sh 3600

# With reason
enable-dangerous-mode.sh 1800 "Implementing authentication"
```

**Pre-Flight Checks**:
1. Devcontainer environment verification
2. Circuit breaker status check
3. Resource availability assessment
4. Audit logging verification
5. Git repository state check
6. Configuration file validation

**Post-Enable**:
- State file created: `/tmp/dangerous-mode-state`
- Resource monitoring started
- Auto-disable scheduled
- Audit log entry created

### disable-dangerous-mode.sh

Disable dangerous mode with cleanup.

**Usage**:
```bash
disable-dangerous-mode.sh [reason]
```

**Arguments**:
- `reason` - Reason for disabling (default: "manual_disable")

**Examples**:
```bash
# Manual disable
disable-dangerous-mode.sh

# With reason
disable-dangerous-mode.sh "task_complete"
disable-dangerous-mode.sh "emergency"
```

**Operations**:
1. Stop resource monitoring
2. Capture final state
3. Generate summary report
4. Clean up temporary files
5. Create audit log entry

**Output**:
- Summary report: `/workspace/.claude/dangerous-mode-summary-{timestamp}.txt`
- Final state: `/workspace/.claude/state/final_state_{timestamp}.json`

### dry-run-mode.sh

Simulate dangerous operations without executing.

**Usage**:
```bash
dry-run-mode.sh [OPTIONS] [COMMAND...]
```

**Options**:
- `--simulate-session [duration]` - Simulate dangerous mode session
- `--assess-operation [op] [args]` - Assess risk of specific operation
- `--validate-config` - Validate configuration file
- `--help` - Show help message

**Examples**:
```bash
# Assess git push
dry-run-mode.sh git push origin feat/my-branch

# Assess file deletion
dry-run-mode.sh rm -rf /some/directory

# Simulate 30-minute session
dry-run-mode.sh --simulate-session 1800

# Validate configuration
dry-run-mode.sh --validate-config
```

**Output**:
- Risk level (low, medium, high, critical)
- Action (ALLOW, REQUIRE_CONFIRMATION, DENY)
- Reason for risk assessment
- Alternative suggestions (for blocked operations)
- Dry run log: `/workspace/.claude/dry-run.log`

## Risk Assessment Matrix

| Risk Level | Auto-Approve | Requires Confirmation | Examples |
|-----------|--------------|---------------------|----------|
| **LOW** | ✅ Yes | ❌ No | git status, gradle test, file reads |
| **MEDIUM** | ❌ No | ✅ Yes | git push, file edits, file deletions |
| **HIGH** | ❌ No | ✅ Yes | staging deployments, unknown operations |
| **CRITICAL** | ❌ Never | ❌ Never | force push, rm -rf, system changes |

## Emergency Procedures

### Manual Emergency Stop

If dangerous mode is causing issues:

```bash
# Immediate stop
emergency-stop.sh stop "High resource usage"

# Check status
emergency-stop.sh status

# Reset circuit breaker (after fixing issue)
emergency-stop.sh reset
```

### Circuit Breaker Tripped

If circuit breaker trips unexpectedly:

```bash
# 1. Check trip reason
cat /tmp/claude-circuit-breaker

# 2. Review audit logs
audit-logger.sh stats

# 3. Check resource usage
monitor-resources.sh once

# 4. Investigate and fix root cause

# 5. Reset circuit breaker
emergency-stop.sh reset
```

### High Resource Usage

If resource usage is approaching limits:

```bash
# 1. Check current usage
monitor-resources.sh once

# 2. Identify resource hogs
ps aux | sort -rk 3,3 | head -10  # CPU
ps aux | sort -rk 4,4 | head -10  # Memory

# 3. Emergency stop if critical
emergency-stop.sh stop "High resource usage"
```

### Unresponsive System

If system becomes unresponsive:

```bash
# 1. Force emergency stop
pkill -9 -f claude

# 2. Stop all monitoring
pkill -9 -f monitor-resources

# 3. Clean up state files
rm -f /tmp/dangerous-mode-state
rm -f /tmp/dangerous-mode-monitor.pid

# 4. Reset circuit breaker
emergency-stop.sh reset

# 5. Review logs
tail -100 /workspace/.claude/audit.log
```

## Troubleshooting

### Issue: Dangerous Mode Won't Enable

**Symptoms**: `enable-dangerous-mode.sh` fails with pre-flight check error

**Diagnosis**:
```bash
# Check devcontainer
echo $DEVCONTAINER  # Should be "true"

# Check circuit breaker
emergency-stop.sh status

# Check resources
monitor-resources.sh once

# Validate config
dry-run-mode.sh --validate-config
```

**Solutions**:
- Ensure running inside devcontainer
- Reset circuit breaker if tripped
- Free up resources if usage high
- Fix configuration file syntax errors

### Issue: Auto-Disable Not Working

**Symptoms**: Dangerous mode doesn't auto-disable after timeout

**Diagnosis**:
```bash
# Check state file
cat /tmp/dangerous-mode-state

# Check for disable process
ps aux | grep disable-dangerous-mode
```

**Solutions**:
- Manually disable: `disable-dangerous-mode.sh`
- Kill stuck process: `pkill -f disable-dangerous-mode`
- Remove state file: `rm /tmp/dangerous-mode-state`

### Issue: Operations Being Blocked Incorrectly

**Symptoms**: Safe operations are being denied

**Diagnosis**:
```bash
# Test with dry run
dry-run-mode.sh [operation]

# Check configuration
dry-run-mode.sh --validate-config

# Review audit log
tail -50 /workspace/.claude/audit.log
```

**Solutions**:
- Verify operation matches allowlist patterns
- Check configuration for typos
- Review denylist for overly broad patterns
- Update configuration and restart dangerous mode

### Issue: Audit Log Not Writing

**Symptoms**: No entries in audit log

**Diagnosis**:
```bash
# Check log file exists
ls -la /workspace/.claude/audit.log

# Check environment variable
echo $CLAUDE_AUDIT_LOG

# Check disk space
df -h /workspace/.claude
```

**Solutions**:
- Create log directory: `mkdir -p /workspace/.claude`
- Create log file: `touch /workspace/.claude/audit.log`
- Fix permissions: `chmod 666 /workspace/.claude/audit.log`
- Free up disk space if full

## Configuration Reference

### Configuration File Location

`.devcontainer/config/dangerous-mode.json`

### Key Configuration Sections

#### Mode Settings

```json
{
  "mode": {
    "enabled": false,
    "maxDuration": 1800,
    "allowBackgroundExecution": false,
    "requireCircuitBreakerCheck": true,
    "requireResourceMonitoring": true
  }
}
```

#### Timeout Configuration

```json
{
  "timeouts": {
    "commandExecution": 300,
    "gitOperation": 120,
    "fileOperation": 60,
    "networkRequest": 30,
    "buildOperation": 1800,
    "testExecution": 900
  }
}
```

#### Safety Check Configuration

```json
{
  "safetyChecks": {
    "preFlightChecks": [...],
    "continuousMonitoring": {
      "enabled": true,
      "interval": 5,
      "metrics": [...]
    },
    "emergencyStopConditions": [...]
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_AUDIT_LOG` | `/workspace/.claude/audit.log` | Audit log file path |
| `CIRCUIT_BREAKER_FILE` | `/tmp/claude-circuit-breaker` | Circuit breaker state |
| `STATE_DIR` | `/workspace/.claude/state` | State backup directory |
| `MONITOR_INTERVAL` | `5` | Resource check interval (seconds) |
| `CPU_THRESHOLD` | `90` | CPU alert threshold (%) |
| `MEM_THRESHOLD` | `85` | Memory alert threshold (%) |
| `DISK_THRESHOLD` | `90` | Disk alert threshold (%) |
| `PID_THRESHOLD` | `80` | PID alert threshold (%) |

## Best Practices

1. **Start with Dry Run**: Always test operations with `dry-run-mode.sh` first
2. **Use Short Sessions**: Keep dangerous mode sessions under 30 minutes when possible
3. **Monitor Actively**: Watch resource usage during dangerous mode sessions
4. **Review Audit Logs**: Regularly review audit logs for unexpected operations
5. **Update Configuration**: Keep allowlist/denylist up to date with project needs
6. **Test Emergency Procedures**: Periodically test emergency stop and recovery
7. **Backup State**: Ensure state checkpoints are working before long sessions
8. **Document Exceptions**: Document any manual overrides or configuration changes

## Security Considerations

1. **Container Isolation**: Dangerous mode should ONLY be used inside devcontainers
2. **Network Restrictions**: Network isolation (from SPI-942) must be active
3. **Resource Limits**: Resource limits (from SPI-944) must be enforced
4. **Audit Logging**: Audit logging must be enabled and monitored
5. **Circuit Breaker**: Circuit breaker must be functional before enabling
6. **Credential Protection**: Never commit credentials, even in dangerous mode
7. **Protected Branches**: Never bypass protected branch restrictions
8. **Regular Reviews**: Review dangerous mode usage patterns monthly

## Integration with Existing Safety Mechanisms

### SPI-942 (Base Devcontainer)
- Network isolation via iptables
- Seccomp and AppArmor profiles
- Non-root user execution

### SPI-944 (Safety Mechanisms)
- Resource limits (CPU, memory, PIDs, disk I/O)
- Audit logging system
- Resource monitoring
- Emergency stop capability
- Circuit breaker pattern

### SPI-945 (Dangerous Mode)
- Operation allowlist/denylist
- Risk-based auto-approval
- Time-limited sessions
- Configuration validation
- Dry run testing

## References

- **Configuration**: `.devcontainer/config/dangerous-mode.json`
- **Scripts**: `.devcontainer/scripts/`
- **Safety Documentation**: `.devcontainer/SAFETY.md`
- **Architecture**: `docs/architecture/devcontainer-safety-architecture.md`
- **Research**: `docs/research/devcontainer-claude-code-best-practices.md`

## Version History

- **1.0.0** (2025-11-03): Initial implementation
  - Operation allowlist/denylist
  - Safety checks and monitoring
  - Enable/disable/dry-run scripts
  - Comprehensive documentation
