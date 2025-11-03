# DevContainer Safety Mechanisms

This document describes the comprehensive safety mechanisms implemented for running Claude Code CLI in unattended mode within the CycleTime devcontainer environment.

## Overview

The safety architecture implements defense-in-depth with six overlapping security layers:

1. **Rootless Execution** - Non-root user (`node`) with user namespace isolation
2. **Seccomp Profiles** - Syscall filtering to block dangerous kernel operations
3. **AppArmor MAC** - Mandatory Access Control for file/network restrictions
4. **Capability Dropping** - Minimal Linux capabilities (only CHOWN, SETUID, SETGID, NET_ADMIN)
5. **Network Isolation** - iptables egress whitelisting (managed by SPI-942)
6. **Resource Limits** - cgroups enforcement of CPU, memory, PIDs, disk I/O

## Resource Limits

Configured in `devcontainer.json` via `hostConfig`:

### CPU
- **Limit**: 4 cores maximum
- **Enforcement**: cgroups CPU quota
- **Alert Threshold**: 90% usage (configurable via `CPU_THRESHOLD`)

### Memory
- **Hard Limit**: 8GB RAM
- **Soft Limit**: 4GB (triggers early memory reclaim)
- **Swap**: Disabled (memorySwap = memory)
- **Alert Threshold**: 85% usage (configurable via `MEM_THRESHOLD`)
- **Node.js Heap**: 6GB (75% of 8GB)
- **JVM Heap**: 4GB max, 2GB initial

### Process Limits
- **PID Limit**: 200 processes maximum
- **Protection**: Prevents fork bomb attacks
- **Alert Threshold**: 80% usage (configurable via `PID_THRESHOLD`)

### Disk I/O
- **Read Limit**: 100MB/s
- **Write Limit**: 50MB/s
- **Enforcement**: cgroups blkio throttling
- **Alert Threshold**: 90% usage (configurable via `DISK_THRESHOLD`)

## Volume Mount Strategy

### Read-Only Source Code
```json
{
  "source": "${localWorkspaceFolder}",
  "target": "/workspace",
  "type": "bind",
  "readonly": true
}
```

**Purpose**: Prevents Claude Code from accidentally or maliciously modifying host files.

**Write Operations**: For operations requiring source modifications (git commits, file edits), use one of:
- Workspace overlay pattern (copy-on-write layer)
- Temporary remount as writable for specific operations
- Git working directory in writable volume with push to host

### Isolated Build Caches
```json
{
  "source": "cycletime-gradle-cache",
  "target": "/home/node/.gradle",
  "type": "volume"
}
```

**Purpose**: Isolate build artifacts from host filesystem, prevent pollution.

**Volumes**:
- `cycletime-gradle-cache` - Gradle dependencies and build cache
- `cycletime-npm-cache` - NPM packages and cache

### Persistent Configuration
```json
{
  "source": "cycletime-claude-config",
  "target": "/home/node/.claude",
  "type": "volume"
}
```

**Purpose**: Claude Code configuration survives container rebuilds.

### Audit Logs
```json
{
  "source": "cycletime-audit-logs",
  "target": "/workspace/.claude",
  "type": "volume"
}
```

**Purpose**: Persistent security audit logs accessible from host for analysis.

### Temporary Files
```json
{
  "target": "/tmp",
  "type": "tmpfs",
  "tmpfs-size": 1073741824
}
```

**Purpose**: In-memory temporary storage (1GB limit) for ephemeral data.

## Safety Scripts

### 1. Audit Logger (`audit-logger.sh`)

Comprehensive audit logging in JSON Lines format for centralized aggregation.

**Features**:
- Structured JSON logging with timestamps
- Operation categorization (file_write, command_exec, network_req, git, security)
- Result tracking (success, failure, warning, error)
- Duration measurement in milliseconds
- Log rotation (default: 100MB threshold)
- Export to centralized logging systems

**Usage**:
```bash
# Log file write
audit-logger.sh file_write /workspace/src/main/kotlin/App.kt success 45

# Log command execution
audit-logger.sh command_exec "./gradlew test" success 12340 0

# Log network request
audit-logger.sh network_req "https://api.anthropic.com" success 234 200

# Log Git operation
audit-logger.sh git commit "feat: add feature" success 500

# Log security event
audit-logger.sh security firewall_violation "Blocked: example.com" critical

# Display statistics
audit-logger.sh stats

# Rotate logs
audit-logger.sh rotate 50

# Export to centralized logging
audit-logger.sh export https://logs.example.com/ingest
```

**Log Format**:
```json
{"timestamp":"2025-11-03T14:35:22.123Z","type":"file_write","resource":"/workspace/src/main/kotlin/Auth.kt","user":"node","result":"success","duration_ms":45,"pid":12345,"hostname":"container","metadata":{}}
```

### 2. Resource Monitor (`monitor-resources.sh`)

Real-time resource monitoring with threshold alerting.

**Monitored Metrics**:
- CPU usage percentage (all cores average)
- Memory usage percentage
- Disk usage percentage
- PID usage percentage (current/limit)

**Alert System**:
- Configurable thresholds per metric
- 60-second cooldown between repeated alerts
- Integration with audit logging system
- Color-coded console output

**Usage**:
```bash
# Continuous monitoring (default)
monitor-resources.sh

# Single snapshot (human-readable)
monitor-resources.sh once

# Single snapshot (JSON)
monitor-resources.sh once json

# Individual metrics
monitor-resources.sh cpu
monitor-resources.sh memory
monitor-resources.sh disk
monitor-resources.sh pids

# Custom thresholds
CPU_THRESHOLD=80 MEM_THRESHOLD=75 monitor-resources.sh
```

**Output Example**:
```
[2025-11-03T14:35:22.123Z] CPU: 45% | MEM: 62% | DISK: 35% | PIDs: 25%
```

### 3. Emergency Stop (`emergency-stop.sh`)

Circuit breaker pattern with graceful shutdown and state preservation.

**Features**:
- Circuit breaker state management
- Graceful process termination (SIGTERM → SIGKILL)
- State preservation before shutdown
- Automatic condition checking
- Manual trip/reset controls

**Usage**:
```bash
# Manual emergency stop
emergency-stop.sh stop

# Stop with reason
emergency-stop.sh stop "High CPU usage"

# Trip circuit breaker without stopping processes
emergency-stop.sh trip "Testing"

# Reset circuit breaker
emergency-stop.sh reset

# Check circuit breaker status
emergency-stop.sh status

# Auto-trip if conditions met
emergency-stop.sh check

# Save state without stopping
emergency-stop.sh save backup-before-deploy
```

**Emergency Stop Sequence**:
1. Trip circuit breaker (prevents new operations)
2. Find Claude Code processes
3. Save current state to `/workspace/.claude/state/`
4. Send SIGTERM to processes
5. Wait 30 seconds for graceful shutdown
6. Send SIGKILL to remaining processes
7. Log completion to audit system

**Circuit Breaker File**: `/tmp/claude-circuit-breaker`

Format: `<timestamp>|<reason>`

## Security Configuration

### Capabilities
```json
"capDrop": ["ALL"],
"capAdd": ["CHOWN", "SETUID", "SETGID", "NET_ADMIN"]
```

**Rationale**:
- `CHOWN` - Required for Git operations (file ownership changes)
- `SETUID`/`SETGID` - Required for user/group switching in some tools
- `NET_ADMIN` - Required for iptables firewall initialization (limited via sudo)

### Seccomp and AppArmor
Profiles defined in SPI-942 base configuration. This layer adds:
- Resource limit enforcement
- Volume mount restrictions
- Environment variable hardening

## Operational Procedures

### Pre-Run Checklist
1. Verify container isolation: `echo $DEVCONTAINER` (should be "true")
2. Check circuit breaker: `emergency-stop.sh status` (should be "OK")
3. Verify firewall active: Managed by SPI-942 init-firewall.sh
4. Initialize audit logging: `audit-logger.sh stats`
5. Start resource monitoring: `monitor-resources.sh &`

### Running Unattended Operations
```bash
# 1. Verify isolation
if [ "$DEVCONTAINER" != "true" ]; then
    echo "ERROR: Must run inside devcontainer"
    exit 1
fi

# 2. Check circuit breaker
emergency-stop.sh check || exit 1

# 3. Enable audit logging
export CLAUDE_AUDIT_LOG="/workspace/.claude/audit.log"

# 4. Run Claude Code with safety wrapper
timeout 30m claude \
    --dangerously-skip-permissions \
    --log-level=debug \
    "Implement user authentication" \
    2>&1 | tee -a "$CLAUDE_AUDIT_LOG"

# 5. Verify results
if [ $? -eq 0 ]; then
    echo "Task completed successfully"
else
    echo "Task failed, check audit log"
    emergency-stop.sh stop "Task execution failed"
fi
```

### Post-Run Verification
1. Check resource usage: `monitor-resources.sh once`
2. Review audit log: `audit-logger.sh stats`
3. Verify no alerts: `grep ALERT /workspace/.claude/audit.log`
4. Check circuit breaker: `emergency-stop.sh status`

### Emergency Response
If circuit breaker trips:
1. Check reason: `cat /tmp/claude-circuit-breaker`
2. Review audit logs: `audit-logger.sh stats`
3. Check resource usage: `monitor-resources.sh once`
4. Investigate root cause
5. Fix issue
6. Reset circuit breaker: `emergency-stop.sh reset`

### Recovery Procedures
1. **State Recovery**: Restore from backup in `/workspace/.claude/state/`
2. **Container Restart**: Stop and restart devcontainer
3. **Volume Cleanup**: Remove and recreate Docker volumes if corrupted
4. **Audit Log Export**: Ship logs to centralized system before cleanup

## Monitoring and Alerting

### Alert Thresholds
| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU | 90% | 95% | Emergency stop |
| Memory | 85% | 95% | Emergency stop |
| Disk | 90% | 95% | Alert only |
| PIDs | 80% | 90% | Emergency stop |

### Alert Cooldown
Repeated alerts suppressed for 60 seconds to prevent noise.

### Centralized Logging
Export audit logs via:
```bash
audit-logger.sh export https://logs.example.com/ingest
```

Format: JSON Lines over HTTPS POST

## Troubleshooting

### Issue: Circuit Breaker Tripped Unexpectedly
**Diagnosis**:
```bash
cat /tmp/claude-circuit-breaker
audit-logger.sh stats
monitor-resources.sh once
```

**Resolution**:
1. Review trip reason
2. Fix underlying issue
3. Reset: `emergency-stop.sh reset`

### Issue: High Resource Usage
**Diagnosis**:
```bash
monitor-resources.sh once
ps aux | head -20
df -h
```

**Resolution**:
1. Identify resource hog
2. Emergency stop if critical: `emergency-stop.sh stop "High resource usage"`
3. Adjust thresholds if false positive

### Issue: Audit Log Not Writing
**Diagnosis**:
```bash
ls -la /workspace/.claude/
echo $CLAUDE_AUDIT_LOG
df -h /workspace/.claude
```

**Resolution**:
1. Check volume mount: Ensure `cycletime-audit-logs` volume exists
2. Check permissions: `chmod 666 /workspace/.claude/audit.log`
3. Check disk space: Free up space if needed

### Issue: Processes Not Terminating
**Diagnosis**:
```bash
ps aux | grep claude
pstree -p
```

**Resolution**:
1. Try emergency stop: `emergency-stop.sh stop`
2. Force kill: `pkill -9 -f claude`
3. Restart container if necessary

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_AUDIT_LOG` | `/workspace/.claude/audit.log` | Audit log file path |
| `CIRCUIT_BREAKER_FILE` | `/tmp/claude-circuit-breaker` | Circuit breaker state file |
| `STATE_DIR` | `/workspace/.claude/state` | State backup directory |
| `MONITOR_INTERVAL` | `5` | Resource check interval (seconds) |
| `CPU_THRESHOLD` | `90` | CPU alert threshold (%) |
| `MEM_THRESHOLD` | `85` | Memory alert threshold (%) |
| `DISK_THRESHOLD` | `90` | Disk alert threshold (%) |
| `PID_THRESHOLD` | `80` | PID alert threshold (%) |
| `GRACE_PERIOD` | `30` | Graceful shutdown timeout (seconds) |

## Testing

### Stress Tests
```bash
# CPU stress test
yes > /dev/null &
PID=$!
monitor-resources.sh once
kill $PID

# Memory stress test
stress --vm 1 --vm-bytes 7G --timeout 10s

# PID stress test
:(){ :|:& };:  # DO NOT RUN - Fork bomb example
```

### Circuit Breaker Test
```bash
# Trip circuit breaker
emergency-stop.sh trip "Testing"

# Verify cannot proceed
emergency-stop.sh check  # Should fail

# Reset
emergency-stop.sh reset

# Verify can proceed
emergency-stop.sh check  # Should succeed
```

### Audit Logging Test
```bash
# Generate test events
audit-logger.sh file_write test.txt success 10
audit-logger.sh command_exec "echo test" success 5 0
audit-logger.sh network_req "https://api.github.com" success 200 200

# View statistics
audit-logger.sh stats
```

## References

- **Architecture**: `docs/architecture/devcontainer-safety-architecture.md`
- **Research**: `docs/research/devcontainer-claude-code-best-practices.md`
- **Base Config**: SPI-942 (Dockerfile, init-firewall.sh, base devcontainer.json)
- **Integration**: SPI-945 (--dangerously-skip-permissions mode)

## Implementation Status

- ✅ Resource limits configured (SPI-944)
- ✅ Volume mount strategy implemented (SPI-944)
- ✅ Audit logging system created (SPI-944)
- ✅ Resource monitoring script created (SPI-944)
- ✅ Emergency stop mechanism created (SPI-944)
- ✅ Security configuration applied (SPI-944)
- 🔄 Network isolation (SPI-942 - base config)
- 🔄 Seccomp/AppArmor profiles (SPI-942 - base config)
- 🔄 Integration testing (SPI-946 - test suite)
