# DevContainer Troubleshooting Guide

Comprehensive troubleshooting guide for the CycleTime devcontainer environment.

## Table of Contents

1. [Common Issues](#common-issues)
2. [Container Build Failures](#container-build-failures)
3. [Authentication Problems](#authentication-problems)
4. [Performance Problems](#performance-problems)
5. [Resource Limit Issues](#resource-limit-issues)
6. [Emergency Recovery Procedures](#emergency-recovery-procedures)
7. [How to Get Help](#how-to-get-help)

---

## Common Issues

### Container Won't Start

**Symptoms:**
- VS Code shows "Failed to start container"
- Container immediately exits after starting
- Error: "Container failed to initialize"

**Diagnosis:**

```bash
# Check Docker is running
docker ps

# View container logs
docker logs $(docker ps -a -q --filter="name=cycletime" --latest)

# Check Docker Desktop status
# Mac: Open Docker Desktop app, check status icon
# Windows: Check system tray for Docker whale icon
```

**Solutions:**

1. **Restart Docker Desktop:**
   - Quit Docker Desktop completely
   - Wait 10 seconds
   - Restart Docker Desktop
   - Wait for "Docker is running" status

2. **Check Docker resources:**
   - Docker Desktop > Settings > Resources
   - Ensure: 4+ CPUs, 8GB+ RAM, 64GB+ Disk

3. **Clear Docker cache:**

   ```bash
   docker system prune -a --volumes
   # WARNING: This removes ALL stopped containers, unused networks, images, and volumes
   # Type 'y' to confirm
   ```

4. **Rebuild container without cache:**
   - VS Code Command Palette: `Dev Containers: Rebuild Container Without Cache`

### Port 8080 Already in Use

**Symptoms:**
- Error: "port 8080 is already allocated"
- Cannot bind to address

**Diagnosis:**

```bash
# On macOS/Linux
lsof -i :8080

# On Windows
netstat -ano | findstr :8080
```

**Solutions:**

1. **Stop conflicting process:**

   ```bash
   # Find PID from lsof/netstat output
   kill <PID>

   # Or force kill
   kill -9 <PID>
   ```

2. **Change MCP server port:**

   Edit `src/main/resources/application.conf`:

   ```hocon
   ktor {
       deployment {
           port = 8081  # Changed from 8080
       }
   }
   ```

   Also update `.devcontainer/devcontainer.json`:

   ```json
   {
     "forwardPorts": [8081]
   }
   ```

3. **Use dynamic port:**

   ```bash
   # Run with custom port
   ./gradlew run -Dktor.deployment.port=8081
   ```

### Git "Dubious Ownership" Errors

**Symptoms:**

```bash
git status
# fatal: detected dubious ownership in repository at '/workspace'
```

**Root Cause:**
Git security feature prevents operations on directories owned by different users.

**Solutions:**

**Option 1: Run post-create script (Recommended)**

```bash
bash /workspace/.devcontainer/post-create.sh
```

**Option 2: Manual configuration**

```bash
git config --global --add safe.directory /workspace
```

**Option 3: Fix ownership (if needed)**

```bash
# Inside container
sudo chown -R vscode:vscode /workspace
```

**Verify fix:**

```bash
git status
# Should work without errors
```

### File Permission Issues

**Symptoms:**
- "Permission denied" when creating/editing files
- Cannot write to `/workspace`

**Diagnosis:**

```bash
# Check ownership
ls -la /workspace

# Check current user
whoami
# Expected: vscode

# Check user groups
groups
# Expected: vscode sudo
```

**Solutions:**

1. **For read-only mount:**

   Check `.devcontainer/devcontainer.json`:

   ```json
   {
     "mounts": [
       {
         "source": "${localWorkspaceFolder}",
         "target": "/workspace",
         "type": "bind",
         "readonly": false  // Should be false for write access
       }
     ]
   }
   ```

2. **Fix file ownership:**

   ```bash
   sudo chown -R vscode:vscode /workspace
   ```

3. **Check AppArmor profile:**

   ```bash
   # View current profile
   sudo aa-status | grep cycletime

   # If AppArmor is blocking, temporarily disable
   sudo aa-complain <profile-name>
   ```

---

## Container Build Failures

### Network Timeout During Build

**Symptoms:**
- "failed to compute cache key: context deadline exceeded"
- Build hangs at package download
- Timeout errors during npm/apt operations

**Solutions:**

1. **Increase Docker timeout:**

   Edit Docker Desktop settings:
   - Docker Desktop > Settings > Docker Engine
   - Add or modify:

   ```json
   {
     "max-download-time": "3600",
     "max-concurrent-downloads": 3
   }
   ```

   - Restart Docker Desktop

2. **Configure proxy (if behind corporate firewall):**

   Add to `.devcontainer/devcontainer.json`:

   ```json
   {
     "remoteEnv": {
       "HTTP_PROXY": "http://proxy.company.com:8080",
       "HTTPS_PROXY": "http://proxy.company.com:8080",
       "NO_PROXY": "localhost,127.0.0.1"
     }
   }
   ```

3. **Use mirror registries:**

   Edit `.devcontainer/Dockerfile`:

   ```dockerfile
   # Use faster npm registry
   RUN npm config set registry https://registry.npmmirror.com

   # Use faster apt mirror (for Debian)
   RUN sed -i 's/deb.debian.org/<your-local-mirror>/g' /etc/apt/sources.list
   ```

4. **Retry with clean slate:**

   ```bash
   docker system prune -a
   # Rebuild in VS Code
   ```

### Out of Disk Space

**Symptoms:**
- "no space left on device"
- Build fails with disk space errors

**Diagnosis:**

```bash
# Check Docker disk usage
docker system df

# Expected output:
# TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
# Images          X         Y         ZGB       AGB (B%)
# Containers      X         Y         ZMB       AMB (B%)
# Local Volumes   X         Y         ZGB       AGB (B%)
# Build Cache     X         Y         ZGB       AGB (B%)
```

**Solutions:**

1. **Clean Docker resources:**

   ```bash
   # Remove unused images
   docker image prune -a

   # Remove unused volumes
   docker volume prune

   # Remove build cache
   docker builder prune

   # Nuclear option: clean everything
   docker system prune -a --volumes
   ```

2. **Increase Docker disk allocation:**
   - Docker Desktop > Settings > Resources > Virtual Disk limit
   - Increase to 128GB or more
   - Apply & Restart

3. **Move Docker data directory (Linux):**

   ```bash
   # Stop Docker
   sudo systemctl stop docker

   # Move data
   sudo mv /var/lib/docker /new/location/docker

   # Create symlink
   sudo ln -s /new/location/docker /var/lib/docker

   # Start Docker
   sudo systemctl start docker
   ```

### Package Installation Failures

**Symptoms:**
- "E: Unable to locate package openjdk-21-jdk"
- npm install fails with 404 errors
- apt-get update fails

**Solutions:**

1. **Update package lists:**

   ```dockerfile
   # In Dockerfile, ensure apt update runs
   RUN apt-get update && apt-get install -y \
       <packages> \
       && rm -rf /var/lib/apt/lists/*
   ```

2. **Use correct package names:**

   ```bash
   # Find available Java versions
   apt-cache search openjdk | grep jdk

   # Use available version
   RUN apt-get install -y openjdk-17-jdk  # If 21 not available
   ```

3. **Add required repositories:**

   ```dockerfile
   # For newer packages
   RUN echo "deb http://deb.debian.org/debian bookworm-backports main" >> /etc/apt/sources.list
   RUN apt-get update
   ```

4. **Fix npm registry:**

   ```bash
   # Inside container
   npm config set registry https://registry.npmjs.org/
   npm cache clean --force
   ```

---

## Authentication Problems

### Claude Code Not Authenticated

**Symptoms:**

```bash
claude /status
# Authentication: Not authenticated
```

**Diagnosis:**

```bash
# Check API key is set
echo $ANTHROPIC_API_KEY

# Check devcontainer.json
cat .devcontainer/devcontainer.json | grep ANTHROPIC_API_KEY

# Check host environment
# Mac/Linux:
env | grep ANTHROPIC
# Windows:
$env:ANTHROPIC_API_KEY
```

**Solutions:**

1. **Set API key on host:**

   **macOS/Linux:**
   ```bash
   echo 'export ANTHROPIC_API_KEY="sk-ant-api03-YOUR_KEY"' >> ~/.zshrc
   source ~/.zshrc
   ```

   **Windows PowerShell:**
   ```powershell
   [System.Environment]::SetEnvironmentVariable(
       'ANTHROPIC_API_KEY',
       'sk-ant-api03-YOUR_KEY',
       'User'
   )
   ```

2. **Rebuild container:**
   - Command Palette: `Dev Containers: Rebuild Container`

3. **Temporary fix (inside container):**

   ```bash
   export ANTHROPIC_API_KEY="sk-ant-api03-YOUR_KEY"
   claude /status
   ```

   **Note**: This only persists for current session.

4. **Use config file:**

   Create `~/.config/claude/config.json`:

   ```json
   {
     "apiKey": "sk-ant-api03-YOUR_KEY"
   }
   ```

   Set permissions:

   ```bash
   chmod 600 ~/.config/claude/config.json
   ```

### Invalid API Key

**Symptoms:**
- "Error: Invalid API key"
- "Error: 401 Unauthorized"

**Solutions:**

1. **Verify API key format:**
   - Must start with `sk-ant-api03-` or similar prefix
   - No extra spaces or quotes
   - Full key copied (50+ characters)

2. **Generate new API key:**
   - Visit: https://console.anthropic.com/settings/keys
   - Click "Create Key"
   - Copy entire key immediately
   - Update environment variable

3. **Check API key status:**
   - Visit: https://console.anthropic.com/settings/keys
   - Verify key is not revoked
   - Check "Last Used" timestamp

4. **Test with curl:**

   ```bash
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{
       "model": "claude-3-5-sonnet-20241022",
       "max_tokens": 10,
       "messages": [{"role": "user", "content": "Hi"}]
     }'
   ```

   Should return JSON response, not 401 error.

### Rate Limit Errors

**Symptoms:**
- "Error: Rate limit exceeded (429)"
- "Error: Too many requests"

**Solutions:**

1. **Wait for rate limit reset:**
   - Most limits reset after 1 minute
   - Some limits reset hourly or daily

2. **Check your usage:**
   - https://console.anthropic.com/settings/usage
   - View current usage vs limits

3. **Upgrade your plan:**
   - https://console.anthropic.com/settings/plans
   - Higher tiers have higher rate limits

4. **Use caching to reduce requests:**

   ```bash
   # Default: caching enabled
   claude "task"

   # Disable caching (uses more requests)
   claude --no-cache "task"
   ```

5. **Use lower-cost model:**

   ```bash
   # Haiku has higher rate limits
   claude --model claude-haiku-4-20250309 "task"
   ```

---

## Performance Problems

### Slow Build Times

**Symptoms:**
- `./gradlew build` takes 5+ minutes
- First build very slow (expected), but subsequent builds also slow

**Diagnosis:**

```bash
# Check build status
./gradlew buildStatus

# Run build with profiling
./gradlew build --profile --scan

# Check Gradle daemon status
./gradlew --status
```

**Solutions:**

1. **Verify build caching:**

   Check `.devcontainer/devcontainer.json` has volume mounts:

   ```json
   {
     "mounts": [
       {
         "source": "gradle-cache",
         "target": "/home/vscode/.gradle",
         "type": "volume"
       }
     ]
   }
   ```

2. **Increase Docker resources:**
   - Docker Desktop > Settings > Resources
   - CPUs: 6+ (from 4)
   - Memory: 12GB+ (from 8GB)

3. **Enable Gradle daemon:**

   `gradle.properties`:

   ```properties
   org.gradle.daemon=true
   org.gradle.parallel=true
   org.gradle.caching=true
   org.gradle.configureondemand=true
   ```

4. **Clean corrupted cache:**

   ```bash
   rm -rf ~/.gradle/caches
   ./gradlew clean build --refresh-dependencies
   ```

5. **Use Gradle build cache:**

   ```bash
   ./gradlew build --build-cache
   ```

### High Memory Usage

**Symptoms:**
- Container uses 90%+ memory
- OOM (Out of Memory) errors
- System becomes sluggish

**Diagnosis:**

```bash
# Inside container
free -h

# Top memory consumers
ps aux --sort=-%mem | head -10

# Check container stats
docker stats cycletime-claude-code --no-stream
```

**Solutions:**

1. **Increase Docker memory allocation:**
   - Docker Desktop > Settings > Resources > Memory
   - Set to 12GB or 16GB

2. **Adjust JVM heap size:**

   `gradle.properties`:

   ```properties
   org.gradle.jvmargs=-Xmx4g -Xms1g
   ```

   Or environment variable:

   ```bash
   export JAVA_OPTS="-Xmx6g"
   ./gradlew build
   ```

3. **Adjust Node.js heap size:**

   `.devcontainer/devcontainer.json`:

   ```json
   {
     "remoteEnv": {
       "NODE_OPTIONS": "--max-old-space-size=8192"
     }
   }
   ```

4. **Stop unnecessary processes:**

   ```bash
   # Find and stop Gradle daemons
   ./gradlew --stop

   # Kill specific process
   ps aux | grep <process>
   kill <PID>
   ```

### High CPU Usage

**Symptoms:**
- Container using 90%+ CPU
- Fans running at high speed
- System becomes unresponsive

**Diagnosis:**

```bash
# Top CPU consumers
top -bn 1 | head -20

# Or use htop (more readable)
htop

# Check container stats
docker stats cycletime-claude-code --no-stream
```

**Solutions:**

1. **Identify CPU hog:**

   ```bash
   # Sort by CPU usage
   ps aux --sort=-%cpu | head -10

   # Kill if necessary
   kill <PID>
   ```

2. **Limit container CPU:**

   `.devcontainer/devcontainer.json`:

   ```json
   {
     "hostConfig": {
       "cpus": "4.0"
     }
   }
   ```

3. **Stop continuous tasks:**

   ```bash
   # Stop continuous builds
   # Press Ctrl+C in terminal running:
   # ./gradlew devRun --continuous
   # ./gradlew testWatch --continuous

   # Stop monitoring
   pkill -f monitor-resources
   ```

4. **Check for runaway processes:**

   ```bash
   # Infinite loops or fork bombs
   ps aux | wc -l
   # Should be well below PID limit (200)

   # Emergency stop
   /usr/local/bin/emergency-stop.sh stop
   ```

---

## Resource Limit Issues

### PID Limit Reached

**Symptoms:**
- "fork: retry: Resource temporarily unavailable"
- Cannot start new processes

**Diagnosis:**

```bash
# Check current PID count
ps aux | wc -l

# Check PID limit
cat /sys/fs/cgroup/pids/pids.max
# Expected: 200
```

**Solutions:**

1. **Kill unnecessary processes:**

   ```bash
   # Stop Gradle daemons
   ./gradlew --stop

   # Kill zombie processes
   ps aux | grep defunct | awk '{print $2}' | xargs kill -9
   ```

2. **Increase PID limit:**

   `.devcontainer/devcontainer.json`:

   ```json
   {
     "hostConfig": {
       "pidsLimit": 300
     }
   }
   ```

   Rebuild container.

3. **Prevent process leaks:**

   ```bash
   # Find processes spawning children
   pstree -p

   # Kill parent process
   kill <parent-PID>
   ```

### Disk I/O Throttling

**Symptoms:**
- Slow file operations
- Build times unexpectedly long
- Disk I/O warnings in logs

**Diagnosis:**

```bash
# Check I/O stats
iostat -x 1 5

# Check if throttling is active
cat /sys/fs/cgroup/blkio/blkio.throttle.read_bps_device
cat /sys/fs/cgroup/blkio/blkio.throttle.write_bps_device
```

**Solutions:**

1. **Increase I/O limits:**

   `.devcontainer/devcontainer.json`:

   ```json
   {
     "hostConfig": {
       "deviceReadBps": [
         {
           "path": "/dev/sda",
           "rate": 209715200  // 200MB/s
         }
       ],
       "deviceWriteBps": [
         {
           "path": "/dev/sda",
           "rate": 104857600  // 100MB/s
         }
       ]
     }
   }
   ```

2. **Use volume mounts for caches:**

   Ensure build caches use volumes (not bind mounts):

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

3. **Clean temporary files:**

   ```bash
   # Clean Gradle cache
   ./gradlew clean
   rm -rf ~/.gradle/caches/build-cache-*

   # Clean NPM cache
   npm cache clean --force
   ```

---

## Emergency Recovery Procedures

### Emergency Stop

**When to Use:**
- Container is unresponsive
- Resource usage critically high
- Suspected security incident
- Dangerous operation in progress

**Procedure:**

```bash
# Inside container
/usr/local/bin/emergency-stop.sh stop "Reason for stop"

# From host (if container unresponsive)
docker exec cycletime-claude-code /usr/local/bin/emergency-stop.sh stop
```

**What Happens:**
1. Circuit breaker trips (blocks new operations)
2. Claude Code processes killed (SIGTERM, then SIGKILL)
3. Current state saved to `/workspace/.claude/state/`
4. Audit log entry created
5. Container can be manually restarted

**Recovery:**

```bash
# Reset circuit breaker
/usr/local/bin/emergency-stop.sh reset

# Verify status
/usr/local/bin/emergency-stop.sh status
# Expected: Circuit breaker: OK
```

### Rollback to Known-Good State

**When to Use:**
- Tests failing after Claude Code run
- Code quality degraded
- Build broken
- Unwanted changes committed

**Git-Based Rollback:**

```bash
# View recent commits
git log --oneline -10

# Rollback to specific commit
git reset --hard <commit-hash>

# Clean untracked files
git clean -fd

# Verify state
git status
./gradlew build
```

**Snapshot-Based Rollback:**

```bash
# List available snapshots
ls -lh /tmp/snapshot-*.tar.gz

# Restore specific snapshot
cd /workspace
tar -xzf /tmp/snapshot-20251103143000.tar.gz

# Or use rollback script
/usr/local/bin/rollback.sh restore snapshot-20251103143000
```

**Pre-Run Commit Rollback:**

```bash
# If you stored pre-run commit
if [ -f /tmp/pre-run-commit ]; then
    PRE_COMMIT=$(cat /tmp/pre-run-commit)
    git reset --hard $PRE_COMMIT
    git clean -fd
    echo "Rolled back to $PRE_COMMIT"
fi
```

### Container Complete Reset

**When to Use:**
- Container is corrupted beyond repair
- Need completely fresh start
- Configuration changes not applying

**Procedure:**

```bash
# Exit container (if inside)
exit

# From host: Stop container
docker stop cycletime-claude-code

# Remove container
docker rm cycletime-claude-code

# Remove image
docker rmi $(docker images -q --filter "reference=vsc-cycletime*")

# Optionally remove volumes (WARNING: loses all caches and logs)
docker volume rm cycletime-gradle-cache
docker volume rm cycletime-npm-cache
docker volume rm cycletime-claude-config
docker volume rm cycletime-audit-logs

# Rebuild in VS Code
# Command Palette: Dev Containers: Rebuild Container Without Cache
```

### Recover from Circuit Breaker Trip

**Symptoms:**
- Operations blocked
- "Circuit breaker tripped" messages

**Diagnosis:**

```bash
# Check circuit breaker status
/usr/local/bin/emergency-stop.sh status

# View trip reason
cat /tmp/claude-circuit-breaker
# Format: <timestamp>|<reason>
```

**Recovery:**

1. **Identify and fix root cause:**

   ```bash
   # Check audit logs
   tail -100 /workspace/.claude/audit.log | jq .

   # Check resource usage
   /usr/local/bin/monitor-resources.sh once

   # Review recent operations
   jq -r '[.timestamp, .type, .result] | @tsv' /workspace/.claude/audit.log | tail -20
   ```

2. **Reset circuit breaker:**

   ```bash
   /usr/local/bin/emergency-stop.sh reset

   # Verify reset
   /usr/local/bin/emergency-stop.sh status
   # Expected: Circuit breaker: OK
   ```

3. **Test operations:**

   ```bash
   # Run simple command
   ./gradlew tasks

   # Run Claude Code test
   claude "Say hello"
   ```

---

## How to Get Help

### Self-Service Debugging

**1. Check Container Logs:**

```bash
# From host
docker logs <container-id>

# Inside container
journalctl -xe
```

**2. Review Audit Logs:**

```bash
# Recent operations
tail -100 /workspace/.claude/audit.log | jq .

# Filter errors
jq 'select(.result=="error")' /workspace/.claude/audit.log
```

**3. Check System Status:**

```bash
# Resource usage
/usr/local/bin/monitor-resources.sh once

# Circuit breaker
/usr/local/bin/emergency-stop.sh status

# Git status
git status

# Build status
./gradlew buildStatus
```

**4. Run Diagnostics:**

```bash
# Verify installations
claude --version
java -version
./gradlew --version

# Test authentication
claude /status

# Test firewall
curl -I https://api.anthropic.com
```

### Documentation Resources

**Project Documentation:**
- [Setup Guide](./SETUP-GUIDE.md) - Installation and configuration
- [Usage Guide](./USAGE-GUIDE.md) - Daily workflows
- [Best Practices](./BEST-PRACTICES.md) - Recommended patterns
- [FAQ](./FAQ.md) - Common questions

**Component Documentation:**
- [SAFETY.md](../SAFETY.md) - Safety mechanisms
- [DANGEROUS-MODE.md](../DANGEROUS-MODE.md) - Unattended operations
- [README.md](../README.md) - Devcontainer overview

**Research & Architecture:**
- `docs/research/devcontainer-claude-code-best-practices.md`
- `docs/architecture/devcontainer-safety-architecture.md`

### Community Support

**GitHub Issues:**
- Search existing issues: https://github.com/your-org/cycletime/issues
- Create new issue: https://github.com/your-org/cycletime/issues/new

**When Creating Issue, Include:**
1. **Environment Details:**
   ```bash
   # Run inside container
   echo "OS: $(uname -a)"
   echo "Docker: $(docker --version)"
   echo "Node: $(node --version)"
   echo "Java: $(java -version 2>&1 | head -1)"
   echo "Claude: $(claude --version)"
   ```

2. **Error Messages:**
   - Full error output (not screenshots)
   - Container logs: `docker logs <container-id>`
   - Relevant audit log entries

3. **Reproduction Steps:**
   - Exact commands run
   - Expected vs actual behavior
   - Whether issue is reproducible

4. **Attempted Solutions:**
   - Troubleshooting steps already tried
   - Any workarounds found

**Issue Template:**

```markdown
## Environment
- OS: [macOS 14.0 / Windows 11 / Ubuntu 22.04]
- Docker Desktop: [version]
- VS Code: [version]
- Inside Container: [yes/no]

## Description
[Clear description of the problem]

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [Third step]

## Expected Behavior
[What you expected to happen]

## Actual Behavior
[What actually happened]

## Error Output
```
[Paste full error message]
```

## Logs
```
[Relevant log entries]
```

## Attempted Solutions
- [Solution 1]: [result]
- [Solution 2]: [result]
```

### Professional Support

For enterprise deployments or critical issues, contact:
- **Email**: support@cycletime.dev
- **Response Time**: 24 hours for critical issues
- **Documentation**: Include all diagnostic information above

---

**Version**: 1.0
**Last Updated**: 2025-11-03
**Related Documents**:
- [Setup Guide](./SETUP-GUIDE.md)
- [Usage Guide](./USAGE-GUIDE.md)
- [Best Practices](./BEST-PRACTICES.md)
- [FAQ](./FAQ.md)
