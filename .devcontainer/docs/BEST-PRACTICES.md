# DevContainer Best Practices

Recommended patterns and practices for safe, effective use of the CycleTime devcontainer.

## Table of Contents

1. [Safe Workflow Patterns](#safe-workflow-patterns)
2. [When to Use Dangerous Mode](#when-to-use-dangerous-mode)
3. [Monitoring and Alerting](#monitoring-and-alerting)
4. [Security Considerations](#security-considerations)
5. [Performance Optimization](#performance-optimization)
6. [Maintenance and Updates](#maintenance-and-updates)

---

## Safe Workflow Patterns

### Always Use Interactive Mode First

**Pattern**: Start with attended operations before moving to unattended.

```bash
# 1. Explore interactively
claude
Claude> Review authentication code
Claude> What tests are needed?
Claude> /exit

# 2. Then run unattended if confident
claude "Add comprehensive tests for authentication module"
```

**Why**: Interactive mode lets you:
- Verify Claude understands requirements
- Catch misunderstandings early
- Build confidence before automation

### Create Checkpoints Before Automation

**Pattern**: Always save state before unattended operations.

```bash
# 1. Ensure clean working directory
git status
git add -A && git commit -m "chore: checkpoint before automation"

# 2. Store commit hash
git rev-parse HEAD > /tmp/pre-automation-commit

# 3. Run automation
claude --dangerously-skip-permissions "task description"

# 4. Verify and commit or rollback
if ./gradlew test; then
    git add -A && git commit -m "feat: automated changes"
else
    git reset --hard $(cat /tmp/pre-automation-commit)
fi
```

### Use Feature Branches for Experiments

**Pattern**: Isolate risky operations on dedicated branches.

```bash
# 1. Create experiment branch
git checkout -b experiment/claude-refactoring

# 2. Run Claude Code
claude "Refactor authentication to use coroutines"

# 3. Evaluate results
./gradlew test detekt build

# 4. Merge if successful, delete if not
if [ $? -eq 0 ]; then
    git checkout main
    git merge experiment/claude-refactoring
else
    git checkout main
    git branch -D experiment/claude-refactoring
fi
```

### Verify Before Push

**Pattern**: Always run full quality checks before pushing.

```bash
# Quality gate script
#!/bin/bash
set -e

echo "Running quality checks..."

# Tests
./gradlew test
echo "✓ Tests passed"

# Code quality
./gradlew detekt
echo "✓ Detekt passed"

# Coverage
./gradlew koverVerify
echo "✓ Coverage verified"

# Build
./gradlew build
echo "✓ Build successful"

echo "All checks passed - safe to push"
git push origin $(git branch --show-current)
```

### Small, Focused Tasks

**Pattern**: Break large tasks into smaller, verifiable steps.

**❌ Too Broad:**
```bash
claude "Implement complete user management system with auth, roles, and permissions"
```

**✅ Focused:**
```bash
# Step 1
claude "Create User domain entity with id, email, name"
git commit -m "feat: add User entity"

# Step 2
claude "Add UserRepository interface with CRUD operations"
git commit -m "feat: add UserRepository"

# Step 3
claude "Implement UserService with business logic"
git commit -m "feat: add UserService"
```

---

## When to Use Dangerous Mode

### Suitable Use Cases

**✅ SAFE to use dangerous mode:**

1. **Non-Production Environments**
   - Development containers only
   - Test environments with full isolation
   - CI/CD pipelines with safety checks

2. **Repetitive, Well-Defined Tasks**
   - Code generation from templates
   - Test scaffolding
   - Documentation generation
   - Dependency updates

3. **Time-Limited Sessions**
   - 30-minute focused sessions
   - Single feature implementation
   - Automated refactoring with verification

4. **With Comprehensive Monitoring**
   - Resource monitoring active
   - Audit logging enabled
   - Circuit breaker configured
   - Rollback mechanisms ready

**Example:**
```bash
# SAFE: Short session, focused task, full monitoring
/usr/local/bin/enable-dangerous-mode.sh 1800 "Generate API tests"
/usr/local/bin/monitor-resources.sh &
claude --dangerously-skip-permissions "Generate comprehensive API tests for UserController"
```

### When NOT to Use Dangerous Mode

**❌ NEVER use dangerous mode for:**

1. **Production Systems**
   - Live databases
   - Production code repositories
   - Customer-facing applications
   - Critical infrastructure

2. **Sensitive Operations**
   - Database migrations
   - Security-related code
   - Authentication/authorization changes
   - Credential management

3. **Exploratory Work**
   - Unclear requirements
   - Experimental features
   - Research and prototyping
   - Learning new technologies

4. **Long-Running Tasks**
   - Multi-hour operations
   - Overnight automation
   - Batch processing
   - Large-scale refactoring

**Example of What NOT to Do:**
```bash
# DANGEROUS - DON'T DO THIS
claude --dangerously-skip-permissions "Refactor entire codebase to use new architecture"
# Why: Too broad, too risky, too long-running
```

### Decision Matrix

Use this matrix to decide if dangerous mode is appropriate:

| Factor | Safe | Risky | Unsafe |
|--------|------|-------|--------|
| **Duration** | < 30 min | 30-60 min | > 60 min |
| **Scope** | Single file/module | Multiple files | Entire codebase |
| **Impact** | Tests, docs | Business logic | Database, auth |
| **Reversibility** | Full git rollback | Partial rollback | Irreversible |
| **Monitoring** | Active | Passive | None |
| **Verification** | Automated tests | Manual review | No verification |

**Decision Rule**: If ANY factor is "Unsafe", do NOT use dangerous mode.

---

## Monitoring and Alerting

### Essential Metrics to Monitor

**1. Resource Usage**

```bash
# Continuous monitoring
/usr/local/bin/monitor-resources.sh &

# Alert thresholds (configured in script):
# - CPU: 90%
# - Memory: 85%
# - Disk: 90%
# - PIDs: 80% of limit
```

**2. Operation Frequency**

```bash
# Count operations per minute
jq -r '.timestamp' /workspace/.claude/audit.log | \
    awk '{print substr($0,1,16)}' | uniq -c | \
    awk '$1 > 100 {print "ALERT: High rate:", $1, "ops/min"}'
```

**3. Failure Rate**

```bash
# Calculate failure percentage
TOTAL=$(jq -r '.result' /workspace/.claude/audit.log | wc -l)
FAILURES=$(jq -r 'select(.result=="failure")' /workspace/.claude/audit.log | wc -l)
RATE=$(echo "scale=2; $FAILURES / $TOTAL * 100" | bc)
echo "Failure rate: ${RATE}%"
```

### Recommended Alert Rules

Create alert script `.devcontainer/scripts/alerts.sh`:

```bash
#!/bin/bash

# Alert if CPU > 90% for 30 seconds
check_cpu() {
    CPU=$(monitor-resources.sh cpu)
    if [ "$CPU" -gt 90 ]; then
        echo "ALERT: CPU usage ${CPU}%" | mail -s "CPU Alert" you@example.com
        /usr/local/bin/emergency-stop.sh trip "High CPU"
    fi
}

# Alert if failure rate > 20%
check_failures() {
    TOTAL=$(jq -r '.result' /workspace/.claude/audit.log | wc -l)
    FAILURES=$(jq -r 'select(.result=="failure")' /workspace/.claude/audit.log | wc -l)
    RATE=$(echo "scale=0; $FAILURES * 100 / $TOTAL" | bc)
    if [ "$RATE" -gt 20 ]; then
        echo "ALERT: Failure rate ${RATE}%" | mail -s "Failure Rate Alert" you@example.com
        /usr/local/bin/emergency-stop.sh trip "High failure rate"
    fi
}

# Run checks every 30 seconds
while true; do
    check_cpu
    check_failures
    sleep 30
done
```

### Audit Log Review Schedule

**Daily (Automated)**:
- Count operations by type
- Check for errors
- Monitor resource alerts

**Weekly (Manual Review)**:
- Review dangerous mode sessions
- Analyze failure patterns
- Check for anomalous behavior
- Verify firewall effectiveness

**Monthly (Security Audit)**:
- Full audit log analysis
- Review emergency stop events
- Analyze resource usage trends
- Update whitelist/denylist rules

---

## Security Considerations

### Never Commit Secrets

**Pattern**: Use environment variables, never hardcode.

**❌ DON'T:**
```kotlin
val apiKey = "sk-ant-api03-..."  // Hardcoded secret
```

**✅ DO:**
```kotlin
val apiKey = System.getenv("ANTHROPIC_API_KEY")
    ?: throw IllegalStateException("ANTHROPIC_API_KEY not set")
```

### Use Git HTTPS Tokens

**Pattern**: Fine-grained tokens instead of SSH keys.

**Why**:
- Better auditability (per-repo tokens)
- Easier revocation
- No risk of SSH key theft

**Setup**:
```bash
# Generate token: https://github.com/settings/tokens
# Select: repo, workflow permissions

# Configure git
git config --global credential.helper store
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Push with token (will be cached)
git push https://<token>@github.com/org/repo.git
```

### Rotate API Keys Regularly

**Pattern**: Quarterly key rotation.

```bash
# 1. Generate new key in Anthropic Console
# 2. Update environment variable
export ANTHROPIC_API_KEY="sk-ant-api03-NEW_KEY"

# 3. Rebuild container
# Command Palette: Dev Containers: Rebuild Container

# 4. Verify new key works
claude /status

# 5. Revoke old key in Anthropic Console
```

### Review Firewall Logs

**Pattern**: Weekly whitelist review.

```bash
# View blocked attempts
sudo iptables -L OUTPUT -n -v | grep DROP

# Check for repeated blocks (potential data exfiltration)
grep "EGRESS-BLOCKED" /var/log/syslog | \
    awk '{print $NF}' | sort | uniq -c | sort -rn | head -20

# Investigate suspicious domains
# If legitimate, add to whitelist
# If malicious, investigate why Claude Code attempted connection
```

---

## Performance Optimization

### Optimize Build Times

**Pattern**: Use parallel builds and caching.

`gradle.properties`:
```properties
# Parallel builds
org.gradle.parallel=true
org.gradle.workers.max=4

# Build caching
org.gradle.caching=true

# Configure on demand
org.gradle.configureondemand=true

# JVM settings
org.gradle.jvmargs=-Xmx4g -Xms1g -XX:+UseG1GC
```

### Use Gradle Daemon

**Pattern**: Keep daemon running for faster builds.

```bash
# Verify daemon is running
./gradlew --status

# If stopped, next build will start it
./gradlew build

# Daemon will persist across builds
# (automatically stopped after 3 hours of inactivity)
```

### Optimize Docker Volumes

**Pattern**: Use named volumes for caches, not bind mounts.

`.devcontainer/devcontainer.json`:
```json
{
  "mounts": [
    {
      "source": "gradle-cache",
      "target": "/home/vscode/.gradle",
      "type": "volume"  // Faster than bind mount
    }
  ]
}
```

**Why**: Docker volumes are optimized for read/write performance inside containers.

### Clean Caches Periodically

**Pattern**: Weekly cache cleanup script.

```bash
#!/bin/bash
# clean-caches.sh

# Gradle cache (keep last 30 days)
find ~/.gradle/caches -type d -mtime +30 -exec rm -rf {} +

# NPM cache
npm cache clean --force

# Docker build cache
docker builder prune --keep-storage 10GB

echo "Caches cleaned"
```

---

## Maintenance and Updates

### Weekly Container Rebuild

**Pattern**: Rebuild container weekly to get latest security patches.

```bash
# Schedule in crontab (host machine)
# Every Monday at 9 AM
0 9 * * 1 code /path/to/cycletime && sleep 10 && code --command "Dev Containers: Rebuild Container"
```

Or manual rebuild:
- Command Palette: `Dev Containers: Rebuild Container`

### Update Dependencies Monthly

**Pattern**: Check for updates monthly.

```bash
# Check for Gradle dependency updates
./gradlew dependencyUpdates

# Check for npm updates
npm outdated

# Update and test
./gradlew build --refresh-dependencies
npm update
./gradlew test
```

### Review Documentation Quarterly

**Pattern**: Ensure documentation stays current.

**Checklist**:
- [ ] Verify API key setup instructions still accurate
- [ ] Check firewall whitelist is up to date
- [ ] Review troubleshooting guide for new issues
- [ ] Update version numbers (Node.js, Java, Claude CLI)
- [ ] Validate example code still works

### Backup Audit Logs

**Pattern**: Monthly log archival.

```bash
#!/bin/bash
# backup-audit-logs.sh

DATE=$(date +%Y%m)
BACKUP_DIR=/backups/audit-logs

# Compress and copy logs
tar -czf $BACKUP_DIR/audit-$DATE.tar.gz /workspace/.claude/audit.log

# Upload to S3 (or other backup location)
aws s3 cp $BACKUP_DIR/audit-$DATE.tar.gz s3://backup-bucket/audit-logs/

# Keep local backups for 3 months
find $BACKUP_DIR -type f -mtime +90 -delete
```

---

## Quick Reference Checklist

### Before Starting Dangerous Mode Session

- [ ] Inside devcontainer (`echo $DEVCONTAINER` = `true`)
- [ ] Firewall active (`sudo iptables -L OUTPUT | grep REJECT`)
- [ ] Audit logging enabled (`ls /workspace/.claude/audit.log`)
- [ ] Circuit breaker OK (`/usr/local/bin/emergency-stop.sh status`)
- [ ] Git working directory clean (`git status`)
- [ ] Pre-run snapshot created (`git rev-parse HEAD > /tmp/pre-run`)

### After Dangerous Mode Session

- [ ] Tests pass (`./gradlew test`)
- [ ] Code quality OK (`./gradlew detekt`)
- [ ] Build succeeds (`./gradlew build`)
- [ ] Changes reviewed (`git diff`)
- [ ] Audit log reviewed (`tail -50 /workspace/.claude/audit.log | jq .`)
- [ ] Resource usage normal (`/usr/local/bin/monitor-resources.sh once`)
- [ ] Committed or rolled back

### Weekly Maintenance

- [ ] Review audit logs
- [ ] Check failure rates
- [ ] Clean build caches
- [ ] Update firewall whitelist
- [ ] Rotate API keys (if due)

### Monthly Maintenance

- [ ] Rebuild container
- [ ] Update dependencies
- [ ] Security audit
- [ ] Backup audit logs
- [ ] Review and update documentation

---

## Next Steps

**Explore More:**
- [FAQ](./FAQ.md) - Frequently asked questions
- [Examples](./EXAMPLES.md) - Real-world workflow examples
- [DANGEROUS-MODE.md](../DANGEROUS-MODE.md) - Detailed dangerous mode documentation

**Related Resources:**
- [Setup Guide](./SETUP-GUIDE.md)
- [Usage Guide](./USAGE-GUIDE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

---

**Version**: 1.0
**Last Updated**: 2025-11-03
**Related Documents**:
- [Setup Guide](./SETUP-GUIDE.md)
- [Usage Guide](./USAGE-GUIDE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [FAQ](./FAQ.md)
- [Examples](./EXAMPLES.md)
