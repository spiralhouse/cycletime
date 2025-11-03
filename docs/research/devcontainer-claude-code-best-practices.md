---
title: "DevContainer Best Practices for Claude Code CLI"
type: research
domain: [devcontainer, security, claude-code]
description: "Comprehensive research on secure devcontainer configurations for unattended Claude Code operations"
dependencies: []
related: []
keywords: [devcontainer, claude-code, security, isolation, unattended-operations, container-security]
last_updated: 2025-11-03
---

# DevContainer Best Practices for Claude Code CLI

## Executive Summary

This research document examines best practices for running Claude Code CLI in containerized development environments, with specific focus on security, isolation, and unattended operation patterns. Based on analysis of Anthropic's official devcontainer implementation, community practices, and container security research, this document provides actionable recommendations for implementing a secure devcontainer environment for CycleTime's autonomous agent operations.

### Key Recommendations

1. **Use Anthropic's official devcontainer configuration** as the foundation, which includes firewall-based network isolation and security-hardened base image
2. **Implement multi-layer security** combining rootless containers, seccomp profiles, resource limits, and network isolation
3. **Enable `--dangerously-skip-permissions` only within controlled container environments** with comprehensive audit logging
4. **Use fine-grained Git tokens** instead of SSH keys for better access control and auditability
5. **Implement read-only volume mounts** for sensitive data (credentials, configuration files)
6. **Establish resource limits** (CPU, memory, disk I/O, PIDs) to prevent resource exhaustion attacks
7. **Deploy centralized audit logging** with alerting for anomalous behavior patterns

---

## 1. Claude Code CLI Containerization

### 1.1 Official Anthropic Implementation

Anthropic provides an official devcontainer configuration demonstrating production-ready security practices.

**Repository**: `anthropics/claude-code/.devcontainer`
**Package**: `ghcr.io/anthropics/devcontainer-features/claude-code:1.0.5`

#### Key Components

**devcontainer.json** - Container configuration
```json
{
  "name": "Claude Code Sandbox",
  "build": {
    "dockerfile": "Dockerfile",
    "args": {
      "TIMEZONE": "America/Los_Angeles",
      "CLAUDE_CODE_VERSION": "latest"
    }
  },
  "capAdd": ["NET_ADMIN", "NET_RAW"],
  "customizations": {
    "vscode": {
      "extensions": [
        "anthropic.claude-code",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "eamodio.gitlens"
      ],
      "settings": {
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.formatOnSave": true,
        "terminal.integrated.defaultProfile.linux": "zsh"
      }
    }
  },
  "remoteEnv": {
    "NODE_OPTIONS": "--max-old-space-size=4096",
    "CLAUDE_CONFIG_DIR": "/home/node/.claude",
    "POWERLEVEL9K_DISABLE_GITSTATUS": "true"
  },
  "mounts": [
    "source=commandhistory,target=/commandhistory,type=volume",
    "source=claude-config,target=/home/node/.claude,type=volume"
  ],
  "remoteUser": "node",
  "workspaceFolder": "/workspace",
  "postStartCommand": "sudo /usr/local/bin/init-firewall.sh"
}
```

**Dockerfile** - Multi-layer security image
```dockerfile
FROM node:20

ARG TIMEZONE=America/Los_Angeles
ARG CLAUDE_CODE_VERSION=latest

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git gh zsh fzf less procps sudo man-db unzip \
    gnupg2 iptables ipset iproute2 dnsutils \
    aggregate jq nano vim \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}

# Install additional development tools
RUN wget -O /tmp/git-delta.deb \
    https://github.com/dandavison/delta/releases/download/0.18.2/git-delta_0.18.2_amd64.deb \
    && dpkg -i /tmp/git-delta.deb && rm /tmp/git-delta.deb

# Configure non-root user
RUN mkdir -p /workspace /home/node/.claude /commandhistory \
    && chown -R node:node /workspace /home/node/.claude /commandhistory

# Install firewall initialization script
COPY init-firewall.sh /usr/local/bin/init-firewall.sh
RUN chmod +x /usr/local/bin/init-firewall.sh \
    && echo "node ALL=(ALL) NOPASSWD: /usr/local/bin/init-firewall.sh" >> /etc/sudoers

# Configure shell
RUN sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v1.2.0/zsh-in-docker.sh)"

ENV DEVCONTAINER=true
ENV EDITOR=nano

USER node
WORKDIR /workspace
```

**init-firewall.sh** - Network isolation enforcement
```bash
#!/bin/bash
set -e

# Extract Docker DNS before flushing
DNS_IP=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')

# Flush existing rules and recreate chains
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X

# Create ipset for allowed domains
ipset create allowed-domains hash:ip

# Add GitHub IP ranges (from GitHub API)
for ip in $(curl -s https://api.github.com/meta | jq -r '.git[]'); do
    ipset add allowed-domains $ip 2>/dev/null || true
done

# Add essential service IPs
ALLOWED_DOMAINS=(
    "registry.npmjs.org"
    "api.anthropic.com"
    "sentry.io"
    "vscode-cdn.net"
    "download.visualstudio.microsoft.com"
)

for domain in "${ALLOWED_DOMAINS[@]}"; do
    for ip in $(dig +short $domain); do
        ipset add allowed-domains $ip 2>/dev/null || true
    done
done

# Set default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established/related connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow DNS (to Docker DNS server)
iptables -A OUTPUT -p udp -d $DNS_IP --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp -d $DNS_IP --dport 53 -j ACCEPT

# Allow SSH (for git operations)
iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT

# Allow whitelisted domains
iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT

# Reject everything else with ICMP response
iptables -A OUTPUT -j REJECT --reject-with icmp-host-unreachable

# Verification
if ! curl -s --max-time 2 https://api.github.com > /dev/null; then
    echo "ERROR: GitHub API unreachable after firewall setup"
    exit 1
fi

if curl -s --max-time 2 https://example.com > /dev/null 2>&1; then
    echo "WARNING: example.com is reachable (firewall may not be working)"
    exit 1
fi

echo "Firewall initialized successfully"
```

#### Security Features Analysis

**Pros:**
- Network isolation via iptables whitelisting prevents data exfiltration
- Non-root user (`node`) reduces privilege escalation risk
- Volume mounts for persistence without compromising host filesystem
- Firewall validation ensures restrictions are enforced
- Explicit capability grants (`NET_ADMIN`, `NET_RAW`) for iptables management
- Node.js memory limits prevent OOM scenarios

**Cons:**
- Requires elevated capabilities (`NET_ADMIN`) which increases attack surface
- Firewall script runs with sudo (limited to specific script only)
- ipset maintenance requires periodic updates for dynamic IPs
- GitHub IP ranges can change, potentially breaking connectivity

**Risk Mitigation:**
- Limit sudo access to single script with no parameters
- Use GitHub API to fetch current IP ranges dynamically
- Implement monitoring for firewall rule changes
- Regular security audits of whitelisted domains

### 1.2 Claude Code Installation & Configuration

#### Authentication Mechanisms

Claude Code supports multiple authentication methods with specific priority ordering:

**Priority Order** (highest to lowest):
1. Environment variable: `ANTHROPIC_API_KEY`
2. Authenticated Claude subscription (Pro/Max)

**Best Practice for Unattended Operations:**
```bash
# Store API key as container secret
export ANTHROPIC_API_KEY="sk-ant-..."

# Verify authentication status
claude /status

# Expected output:
# Authentication: API Key
# Model: claude-sonnet-4
# Organization: [Your Organization]
```

**Security Considerations:**
- Never commit API keys to version control
- Use container secrets or mounted credentials file
- Rotate API keys regularly (quarterly recommended)
- Monitor API usage for anomalous patterns
- Consider using separate API keys per container instance for auditability

#### Environment Variables Configuration

```bash
# Authentication
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_AUTH_TOKEN="Bearer token..."  # Alternative auth method

# Model Selection
export ANTHROPIC_MODEL="claude-sonnet-4"       # Default model
export ANTHROPIC_SMALL_FAST_MODEL="claude-haiku-3"  # Fast operations

# Network Configuration
export HTTPS_PROXY="https://proxy.company.com:8080"
export NODE_TLS_REJECT_UNAUTHORIZED=0  # Self-signed certs (dev only)

# Behavior Tuning
export BASH_MAX_TIMEOUT_MS=300000      # 5 minute timeout
export DISABLE_PROMPT_CACHING=1        # Disable caching for testing
export DISABLE_INTERLEAVED_THINKING=1  # Disable thinking steps

# Container-Specific
export CLAUDE_CONFIG_DIR="/home/node/.claude"
export NODE_OPTIONS="--max-old-space-size=4096"  # 4GB heap limit
```

#### Node.js and JVM Multi-Language Setup

For CycleTime (Kotlin/JVM + Node.js), the Dockerfile must support both runtimes:

```dockerfile
FROM node:20

# Install OpenJDK 21 (for Kotlin/JVM)
RUN apt-get update && apt-get install -y \
    openjdk-21-jdk \
    maven \
    gradle \
    && rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code@latest

# Verify installations
RUN node --version && \
    java --version && \
    kotlin -version && \
    gradle --version
```

**Dependency Management:**
- Node.js dependencies: `/workspace/package.json` → `npm install`
- Kotlin/JVM dependencies: `/workspace/build.gradle.kts` → `gradle build`
- Use separate volume mounts for build caches (`.gradle`, `node_modules`)

#### DevContainer Feature Installation

For easy integration into existing projects:

```json
{
  "name": "CycleTime Development Environment",
  "features": {
    "ghcr.io/anthropics/devcontainer-features/claude-code:1": {},
    "ghcr.io/devcontainers/features/java:1": {
      "version": "21",
      "installGradle": "true"
    },
    "ghcr.io/devcontainers/features/git:1": {
      "version": "latest"
    }
  }
}
```

---

## 2. Devcontainer Security & Isolation

### 2.1 Container Isolation Patterns

#### Defense-in-Depth Architecture

Effective container security requires multiple overlapping layers:

```
┌─────────────────────────────────────────────────┐
│  Layer 1: Rootless Containers                   │
│  - Non-root user inside container               │
│  - User namespace remapping                     │
│  - Reduced host kernel access                   │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  Layer 2: Seccomp Profiles                      │
│  - Syscall filtering                            │
│  - Block dangerous kernel operations            │
│  - Limit kernel attack surface                  │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  Layer 3: AppArmor/SELinux                      │
│  - Mandatory Access Control (MAC)               │
│  - File system access restrictions              │
│  - Network access policies                      │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  Layer 4: Capability Dropping                   │
│  - Remove unnecessary Linux capabilities        │
│  - Limit privileged operations                  │
│  - Principle of least privilege                 │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  Layer 5: Network Isolation                     │
│  - iptables firewall rules                      │
│  - DNS filtering                                │
│  - Egress domain whitelisting                   │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  Layer 6: Resource Limits                       │
│  - CPU/memory cgroups                           │
│  - Disk I/O throttling                          │
│  - PID limits                                   │
└─────────────────────────────────────────────────┘
```

#### Rootless Containers

**Definition**: Containers where both the Docker daemon and container processes run as unprivileged users.

**Benefits:**
- Compromised container grants only user-level access (not root)
- Eliminates entire class of privilege escalation attacks
- Safer for multi-tenant environments
- Compatible with corporate security policies

**Implementation:**
```bash
# Install Docker in rootless mode
curl -fsSL https://get.docker.com/rootless | sh

# Configure daemon
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock

# Run devcontainer
docker run --rm -it \
    -v $(pwd):/workspace \
    ghcr.io/anthropics/claude-code:latest
```

**Limitations (as of 2025):**
- Cgroups resource control limited in rootless mode
- AppArmor profiles not fully supported
- Performance overhead for some workloads
- Checkpoint/restore features unavailable

**Recommendation for CycleTime:**
Use rootless mode for development/testing environments. For production unattended operations, use traditional root-based Docker with strong AppArmor/seccomp profiles and capability dropping.

#### Seccomp Profiles

**Definition**: Secure Computing Mode - Linux kernel feature restricting system calls.

**Default Docker Seccomp Profile:**
Blocks ~44 dangerous syscalls including:
- `reboot`, `swapon`, `swapoff`
- `mount`, `umount`, `pivot_root`
- `ptrace`, `process_vm_readv`, `process_vm_writev`
- `bpf`, `perf_event_open`

**Custom Profile for Claude Code:**
```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": [
        "read", "write", "open", "close", "stat",
        "fstat", "lstat", "poll", "lseek", "mmap",
        "mprotect", "munmap", "brk", "ioctl",
        "access", "socket", "connect", "accept",
        "sendto", "recvfrom", "sendmsg", "recvmsg",
        "execve", "exit", "wait4", "kill", "fcntl",
        "flock", "fsync", "fdatasync", "truncate",
        "getcwd", "chdir", "rename", "mkdir", "rmdir",
        "link", "unlink", "readlink", "chmod", "chown",
        "getpid", "getppid", "getuid", "geteuid",
        "getgid", "getegid", "setuid", "setgid"
      ],
      "action": "SCMP_ACT_ALLOW"
    },
    {
      "names": ["reboot", "swapon", "swapoff"],
      "action": "SCMP_ACT_ERRNO"
    }
  ]
}
```

**Application:**
```json
{
  "securityOpt": ["seccomp=/path/to/claude-code-seccomp.json"]
}
```

**Verification:**
```bash
# Check seccomp status inside container
cat /proc/self/status | grep Seccomp
# Output: Seccomp: 2 (filtering enabled)
```

#### AppArmor Mandatory Access Control

**Definition**: Linux Security Module providing MAC for file/network access.

**Default Profile**: `docker-default` (applied automatically)

**Custom Profile for Claude Code:**
```
#include <tunables/global>

profile claude-code flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  #include <abstractions/nameservice>
  #include <abstractions/openssl>

  # Allow network access (restricted by iptables)
  network inet tcp,
  network inet udp,
  network inet6 tcp,
  network inet6 udp,

  # Allow reading workspace files
  /workspace/** r,
  /workspace/** w,
  /workspace/** k,

  # Allow reading system libraries
  /lib/** r,
  /usr/lib/** r,

  # Deny sensitive files
  deny /proc/sys/kernel/** rw,
  deny /sys/** rw,
  deny /dev/** rw,
  deny /etc/shadow r,
  deny /etc/sudoers r,

  # Allow Node.js operations
  /usr/bin/node ix,
  /usr/bin/npm ix,
  /home/node/.npm/** rw,
  /home/node/.claude/** rw,

  # Allow Claude Code CLI
  /usr/local/bin/claude ix,

  # Capability restrictions
  capability setuid,
  capability setgid,
  deny capability sys_admin,
  deny capability sys_module,
}
```

**Application:**
```json
{
  "securityOpt": ["apparmor=claude-code"]
}
```

#### Capability Dropping

**Default Capabilities** (Docker grants 14 by default):
- `CHOWN`, `DAC_OVERRIDE`, `FSETID`, `FOWNER`, `MKNOD`
- `NET_RAW`, `SETGID`, `SETUID`, `SETFCAP`, `SETPCAP`
- `NET_BIND_SERVICE`, `SYS_CHROOT`, `KILL`, `AUDIT_WRITE`

**Recommended for Claude Code:**
```json
{
  "capDrop": [
    "ALL"
  ],
  "capAdd": [
    "CHOWN",        // File ownership changes
    "DAC_OVERRIDE", // File permission bypass (careful!)
    "SETUID",       // Switch user IDs
    "SETGID",       // Switch group IDs
    "NET_RAW",      // For ping/traceroute
    "NET_ADMIN"     // For iptables (if using firewall)
  ]
}
```

**Verification:**
```bash
# Check capabilities inside container
capsh --print
```

**Security Note:**
`DAC_OVERRIDE` allows bypassing file permissions. Only include if Claude Code requires write access to files it doesn't own. Consider using volume mount permissions instead.

### 2.2 Resource Limits (cgroups)

#### Why Resource Limits Matter

**Attack Scenarios:**
- Infinite loop consumes 100% CPU, starving host processes
- Memory leak triggers OOM killer, terminating critical services
- Fork bomb creates unlimited processes, exhausting PIDs
- Disk I/O saturation slows host system

**Defense**: Cgroups v2 unified hierarchy with hard limits.

#### CPU Limits

```json
{
  "hostConfig": {
    "cpus": "2.0",           // Max 2 CPU cores
    "cpuShares": 1024,       // Relative weight (default)
    "cpuQuota": 100000,      // 1 second per period
    "cpuPeriod": 100000      // 100ms scheduling period
  }
}
```

**Interpretation:**
- `cpus: "2.0"` = Maximum 200% CPU (2 cores fully utilized)
- `cpuShares: 1024` = Fair share relative to other containers
- `cpuQuota/cpuPeriod` = Hard limit enforced by kernel throttling

**Enforcement Mechanism:**
When container exceeds CPU quota, kernel restricts access during remaining period. Container resumes next period. This causes slowdowns but prevents resource exhaustion.

**Monitoring:**
```bash
# Check CPU throttling
docker stats --no-stream container_name

# Inside container
cat /sys/fs/cgroup/cpu.stat | grep throttled
```

#### Memory Limits

```json
{
  "hostConfig": {
    "memory": "4g",          // Hard limit: 4GB RAM
    "memorySwap": "4g",      // Disable swap (memory + swap = memory)
    "memoryReservation": "2g", // Soft limit
    "oomKillDisable": false  // Allow OOM killer
  }
}
```

**Behavior:**
- Container can use up to 4GB RAM
- If exceeded, kernel OOM killer terminates container
- No swap prevents swapping to disk (performance)
- Soft limit (2GB) triggers reclaim before hard limit

**Node.js Container-Aware Memory:**
Node.js 20+ automatically detects cgroup limits and adjusts V8 heap:

```javascript
// Automatic in Node.js 20+
const heapSize = v8.getHeapStatistics().heap_size_limit;
console.log(`Max heap: ${heapSize / 1024 / 1024 / 1024}GB`);
// Output: Max heap: ~3GB (leaves 1GB for system)
```

**Override if needed:**
```bash
export NODE_OPTIONS="--max-old-space-size=3072"  # 3GB heap
```

#### Disk I/O Limits

```json
{
  "hostConfig": {
    "blkioWeight": 500,                    // Relative weight (100-1000)
    "deviceReadBps": [
      {
        "path": "/dev/sda",
        "rate": 50000000                   // 50MB/s read limit
      }
    ],
    "deviceWriteBps": [
      {
        "path": "/dev/sda",
        "rate": 25000000                   // 25MB/s write limit
      }
    ]
  }
}
```

**Use Cases:**
- Prevent disk saturation from large file operations
- Ensure fair I/O share in multi-container environments
- Protect against malicious disk writes

#### Process/PID Limits

```json
{
  "hostConfig": {
    "pidsLimit": 100                       // Max 100 processes
  }
}
```

**Protection Against:**
- Fork bombs: `:(){ :|:& };:`
- Process leaks from uncontrolled spawning
- Resource exhaustion attacks

**Testing:**
```bash
# Inside container
ulimit -u                                  # Should show 100
```

#### Combined Resource Configuration

**Recommended for CycleTime:**
```json
{
  "name": "CycleTime Claude Code Container",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "hostConfig": {
    "cpus": "4.0",
    "memory": "8g",
    "memorySwap": "8g",
    "memoryReservation": "4g",
    "pidsLimit": 200,
    "blkioWeight": 500,
    "deviceReadBps": [{"path": "/dev/sda", "rate": 104857600}],  // 100MB/s
    "deviceWriteBps": [{"path": "/dev/sda", "rate": 52428800}]   // 50MB/s
  },
  "remoteEnv": {
    "NODE_OPTIONS": "--max-old-space-size=6144"  // 6GB heap (75% of memory)
  }
}
```

**Rationale:**
- 4 CPUs: Sufficient for parallel Gradle builds + Claude Code
- 8GB RAM: Handles JVM (4GB) + Node.js (2GB) + system (2GB)
- 200 PIDs: Allows Gradle daemon + test processes + Claude Code
- I/O limits: Prevents disk saturation during large builds

### 2.3 Network Isolation

#### Firewall Architecture

**Three-Layer Approach:**

```
┌───────────────────────────────────────────────┐
│  Layer 1: Docker Network Mode                 │
│  - Bridge network (isolated from host)        │
│  - No direct host network access              │
└───────────────────────────────────────────────┘
                   ↓
┌───────────────────────────────────────────────┐
│  Layer 2: iptables DOCKER-USER Chain          │
│  - Custom rules persist across restarts       │
│  - Ingress filtering                          │
└───────────────────────────────────────────────┘
                   ↓
┌───────────────────────────────────────────────┐
│  Layer 3: Container-Internal Firewall         │
│  - Egress whitelisting via ipset              │
│  - Default-deny policy                        │
│  - DNS-based domain resolution                │
└───────────────────────────────────────────────┘
```

#### Docker Network Modes

**Available Modes:**
- `bridge` (default): Isolated container network
- `host`: Share host network stack (NOT RECOMMENDED)
- `none`: No network access
- Custom networks: User-defined bridges

**Recommended:**
```json
{
  "network": "bridge",  // Isolated network
  "publishPorts": []    // No exposed ports
}
```

#### DOCKER-USER Chain

**Purpose**: Custom iptables rules that persist across Docker operations.

**Host-Level Configuration:**
```bash
# Allow only specific IPs to connect to containers
iptables -I DOCKER-USER -i eth0 ! -s 192.168.1.0/24 -j DROP

# Allow established connections
iptables -I DOCKER-USER -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# Log rejected connections
iptables -I DOCKER-USER -j LOG --log-prefix "DOCKER-USER-REJECT: "
```

**Verification:**
```bash
iptables -L DOCKER-USER -n -v
```

#### Container-Internal Firewall (Anthropic Pattern)

**Implementation Strategy:**
1. Install `iptables`, `ipset`, `dnsutils` in container
2. Grant `NET_ADMIN` capability for iptables management
3. Run firewall script with sudo on container start
4. Maintain whitelist via ipset (dynamic updates)
5. Default-deny policy for all egress traffic

**Whitelist Management:**
```bash
#!/bin/bash
# whitelist-domains.sh

ALLOWED_DOMAINS=(
    # Version Control
    "github.com"
    "gitlab.com"

    # Package Registries
    "registry.npmjs.org"
    "repo.maven.apache.org"
    "plugins.gradle.org"

    # Anthropic Services
    "api.anthropic.com"
    "console.anthropic.com"

    # Observability
    "sentry.io"

    # VS Code Resources
    "vscode-cdn.net"
    "download.visualstudio.microsoft.com"
    "marketplace.visualstudio.com"
)

# Resolve domains to IPs and add to ipset
for domain in "${ALLOWED_DOMAINS[@]}"; do
    for ip in $(dig +short $domain); do
        # IPv4 only (remove IPv6 AAAA records)
        if [[ $ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            ipset add allowed-domains $ip 2>/dev/null || true
        fi
    done
done
```

**Dynamic Updates:**
```bash
# Refresh whitelist every hour (cron job)
0 * * * * /usr/local/bin/whitelist-domains.sh
```

**Monitoring:**
```bash
# View whitelisted IPs
ipset list allowed-domains

# Test connectivity
curl -v --max-time 5 https://api.anthropic.com  # Should succeed
curl -v --max-time 5 https://example.com        # Should fail
```

#### DNS Filtering

**Challenge**: DNS queries can leak sensitive information.

**Solution**: Restrict DNS to Docker-provided resolver only.

```bash
# Extract Docker DNS IP
DNS_IP=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')

# Allow DNS only to Docker resolver
iptables -A OUTPUT -p udp -d $DNS_IP --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp -d $DNS_IP --dport 53 -j ACCEPT

# Block all other DNS
iptables -A OUTPUT -p udp --dport 53 -j REJECT
iptables -A OUTPUT -p tcp --dport 53 -j REJECT
```

#### Egress Monitoring

**Log All Egress Attempts:**
```bash
# Log before final DROP/REJECT
iptables -A OUTPUT -j LOG --log-prefix "EGRESS-BLOCKED: " --log-level 4

# Analyze logs
grep "EGRESS-BLOCKED" /var/log/syslog | awk '{print $NF}' | sort | uniq -c
```

**Alerting:**
```bash
# Alert on suspicious domains
#!/bin/bash
SUSPICIOUS_PATTERNS=(
    "pastebin.com"
    "transfer.sh"
    "ngrok.io"
    "*.tk"  # Free TLD often used for C2
)

tail -f /var/log/syslog | grep --line-buffered "EGRESS-BLOCKED" | while read line; do
    for pattern in "${SUSPICIOUS_PATTERNS[@]}"; do
        if echo "$line" | grep -q "$pattern"; then
            echo "ALERT: Suspicious egress attempt: $line" | \
                mail -s "Security Alert" security@example.com
        fi
    done
done
```

### 2.4 File System Access Restrictions

#### Volume Mount Strategies

**Three Mount Types:**

1. **Bind Mounts**: Direct host directory access
   - **Use Case**: Source code, project files
   - **Risk**: Unintended host file modification
   - **Mitigation**: Read-only mounts, limited scope

2. **Named Volumes**: Docker-managed storage
   - **Use Case**: Dependencies, build caches, persistent data
   - **Risk**: Data persistence across rebuilds
   - **Mitigation**: Regular cleanup, size limits

3. **tmpfs Mounts**: In-memory temporary storage
   - **Use Case**: Secrets, temporary files
   - **Risk**: Memory consumption
   - **Mitigation**: Size limits, automatic cleanup

#### Secure Mount Configurations

**Source Code (Read-Only):**
```json
{
  "mounts": [
    {
      "source": "${localWorkspaceFolder}",
      "target": "/workspace",
      "type": "bind",
      "readonly": true  // Prevent modification
    }
  ]
}
```

**Build Artifacts (Writable, Isolated):**
```json
{
  "mounts": [
    {
      "source": "gradle-cache",
      "target": "/home/node/.gradle",
      "type": "volume"
    },
    {
      "source": "npm-cache",
      "target": "/home/node/.npm",
      "type": "volume"
    }
  ]
}
```

**Secrets (Temporary, In-Memory):**
```json
{
  "mounts": [
    {
      "target": "/run/secrets",
      "type": "tmpfs",
      "tmpfsOptions": {
        "size": "10m",     // 10MB limit
        "mode": "0600"     // Owner read/write only
      }
    }
  ]
}
```

#### Permission Management

**Problem**: File ownership mismatches between host and container.

**Solutions:**

**1. Match UIDs (Preferred):**
```dockerfile
# Create user with host UID/GID
ARG HOST_UID=1000
ARG HOST_GID=1000

RUN groupadd -g ${HOST_GID} node && \
    useradd -u ${HOST_UID} -g node -s /bin/bash -m node
```

**2. Entrypoint Permission Fix:**
```bash
#!/bin/bash
# entrypoint.sh

# Fix permissions on startup
chown -R node:node /workspace || true

# Switch to non-root user
exec gosu node "$@"
```

**3. Read-Only + Write Overlay:**
```json
{
  "mounts": [
    {
      "source": "${localWorkspaceFolder}",
      "target": "/workspace",
      "type": "bind",
      "readonly": true
    },
    {
      "target": "/workspace-overlay",
      "type": "volume"  // Writable overlay
    }
  ],
  "workspaceFolder": "/workspace-overlay"
}
```

#### Sensitive File Exclusion

**Never Mount:**
- `~/.ssh` (SSH keys)
- `~/.aws` (AWS credentials)
- `~/.kube` (Kubernetes config)
- `~/.docker` (Docker credentials)
- Browser data directories
- Password managers

**Exception**: Mount SSH keys read-only for Git operations if absolutely required:

```json
{
  "mounts": [
    {
      "source": "${localEnv:HOME}/.ssh",
      "target": "/home/node/.ssh",
      "type": "bind",
      "readonly": true  // Critical!
    }
  ],
  "postCreateCommand": "chmod 600 /home/node/.ssh/*"
}
```

**Better Alternative**: Use SSH agent forwarding instead:

```json
{
  "features": {
    "ghcr.io/devcontainers/features/git:1": {
      "version": "latest"
    }
  },
  "remoteEnv": {
    "SSH_AUTH_SOCK": "${localEnv:SSH_AUTH_SOCK}"
  }
}
```

---

## 3. VS Code Devcontainer Features

### 3.1 devcontainer.json Configuration Reference

#### Complete Schema

```json
{
  // Basic Configuration
  "name": "string",              // Display name
  "image": "string",             // Pre-built image
  "build": {                     // Build from Dockerfile
    "dockerfile": "string",
    "context": "string",
    "args": { "KEY": "value" }
  },
  "dockerComposeFile": "string", // Multi-container setup

  // User Configuration
  "remoteUser": "string",        // User inside container
  "userEnvProbe": "string",      // Shell: "loginShell" | "interactiveShell"
  "containerUser": "string",     // User for operations

  // Workspace Configuration
  "workspaceFolder": "string",   // Working directory
  "workspaceMount": "string",    // Custom mount specification

  // Port Forwarding
  "forwardPorts": [8080, 3000],  // Auto-forward these ports
  "portsAttributes": {
    "8080": {
      "label": "Application",
      "onAutoForward": "notify"
    }
  },

  // VS Code Customization
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-vscode.vscode-typescript-next",
        "dbaeumer.vscode-eslint"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "terminal.integrated.defaultProfile.linux": "bash"
      }
    }
  },

  // Lifecycle Scripts
  "onCreateCommand": "string",   // Once: container creation
  "updateContentCommand": "string", // After source changes
  "postCreateCommand": "string", // After creation + updates
  "postStartCommand": "string",  // Every container start
  "postAttachCommand": "string", // When IDE attaches

  // Environment Variables
  "remoteEnv": {
    "KEY": "value",
    "PATH": "${containerEnv:PATH}:${localEnv:PATH}"
  },
  "containerEnv": {
    "BUILD_ENV": "development"
  },

  // Features (Reusable Components)
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "20"
    }
  },

  // Security Options
  "capAdd": ["NET_ADMIN"],
  "capDrop": ["ALL"],
  "securityOpt": [
    "seccomp=/path/to/profile.json",
    "apparmor=profile-name"
  ],

  // Mounts
  "mounts": [
    {
      "source": "volume-name",
      "target": "/container/path",
      "type": "volume"
    }
  ],

  // Initialization
  "initializeCommand": "string", // Before container creation (host)
  "shutdownAction": "none",      // "none" | "stopContainer"

  // Host Requirements
  "hostRequirements": {
    "cpus": 4,
    "memory": "8gb",
    "storage": "32gb"
  }
}
```

### 3.2 VS Code Extensions for Claude Code

#### Essential Extensions

**1. Anthropic Claude Code (Official)**
```json
{
  "customizations": {
    "vscode": {
      "extensions": ["anthropic.claude-code"]
    }
  }
}
```

**2. GitLens (Enhanced Git)**
```json
{
  "extensions": ["eamodio.gitlens"],
  "settings": {
    "gitlens.codeLens.enabled": true,
    "gitlens.hovers.currentLine.over": "line"
  }
}
```

**3. ESLint + Prettier (Code Quality)**
```json
{
  "extensions": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ],
  "settings": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true
    }
  }
}
```

**4. Kotlin Language Server**
```json
{
  "extensions": [
    "fwcd.kotlin",
    "vscjava.vscode-java-pack"
  ],
  "settings": {
    "kotlin.languageServer.enabled": true,
    "java.home": "/usr/lib/jvm/java-21-openjdk-amd64"
  }
}
```

#### Recommended Extensions for CycleTime

```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        // Core Development
        "anthropic.claude-code",
        "fwcd.kotlin",
        "vscjava.vscode-java-pack",

        // Git Integration
        "eamodio.gitlens",
        "mhutchie.git-graph",

        // Code Quality
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "sonarsource.sonarlint-vscode",

        // Testing
        "hbenl.vscode-test-explorer",
        "richardwillis.vscode-gradle",

        // Containers
        "ms-azuretools.vscode-docker",

        // Productivity
        "christian-kohler.path-intellisense",
        "wayou.vscode-todo-highlight"
      ],
      "settings": {
        // Editor
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.rulers": [80, 120],

        // Terminal
        "terminal.integrated.defaultProfile.linux": "zsh",
        "terminal.integrated.fontSize": 14,

        // Files
        "files.exclude": {
          "**/.gradle": true,
          "**/build": true,
          "**/node_modules": true
        },

        // Kotlin
        "kotlin.languageServer.enabled": true,

        // Java
        "java.home": "/usr/lib/jvm/java-21-openjdk-amd64",
        "java.configuration.runtimes": [
          {
            "name": "JavaSE-21",
            "path": "/usr/lib/jvm/java-21-openjdk-amd64"
          }
        ]
      }
    }
  }
}
```

### 3.3 Lifecycle Hooks

#### Execution Order

```
Host Machine
    ↓
initializeCommand (host)
    ↓
[Container Created]
    ↓
onCreateCommand (container, once)
    ↓
[Source Code Changes Detected]
    ↓
updateContentCommand (container)
    ↓
postCreateCommand (container)
    ↓
[Container Started]
    ↓
postStartCommand (container, every start)
    ↓
[VS Code Attaches]
    ↓
postAttachCommand (container)
```

#### Use Cases

**initializeCommand** (Host)
```json
{
  "initializeCommand": "docker volume create gradle-cache"
}
```
- Create Docker resources
- Validate host prerequisites
- Download large assets

**onCreateCommand** (Container, Once)
```json
{
  "onCreateCommand": "npm install -g @anthropic-ai/claude-code"
}
```
- Install global tools
- Initial setup that shouldn't repeat

**updateContentCommand** (After Source Changes)
```json
{
  "updateContentCommand": "npm install && ./gradlew build"
}
```
- Refresh dependencies
- Rebuild on source updates

**postCreateCommand** (After Creation + Updates)
```json
{
  "postCreateCommand": "git config --global user.name 'Claude Code' && git config --global user.email 'claude@example.com'"
}
```
- Configure tools
- Run once per rebuild

**postStartCommand** (Every Start)
```json
{
  "postStartCommand": "sudo /usr/local/bin/init-firewall.sh"
}
```
- Initialize firewall rules
- Start background services
- Set runtime environment

**postAttachCommand** (IDE Attachment)
```json
{
  "postAttachCommand": "claude /status"
}
```
- Verify Claude Code status
- Display welcome message
- Check authentication

#### CycleTime Lifecycle Configuration

```json
{
  "initializeCommand": "mkdir -p ${localWorkspaceFolder}/.gradle ${localWorkspaceFolder}/node_modules",

  "onCreateCommand": {
    "install-tools": "npm install -g @anthropic-ai/claude-code",
    "gradle-wrapper": "./gradlew --version"
  },

  "postCreateCommand": {
    "git-config": "git config --global user.name 'CycleTime Agent' && git config --global user.email 'agent@cycletime.dev'",
    "git-safe": "git config --global --add safe.directory /workspace"
  },

  "postStartCommand": {
    "firewall": "sudo /usr/local/bin/init-firewall.sh",
    "auth-check": "claude /status"
  },

  "postAttachCommand": "echo 'CycleTime devcontainer ready. Run claude to interact with the AI agent.'"
}
```

---

## 4. Unattended Operations Safety

### 4.1 Permission Bypass Patterns

#### The `--dangerously-skip-permissions` Flag

**Default Behavior:**
Claude Code prompts for user confirmation before:
- Writing/modifying files
- Executing shell commands
- Installing packages
- Making network requests
- Accessing sensitive data

**Unattended Mode:**
```bash
claude --dangerously-skip-permissions "Implement user authentication"
```

**Security Implications:**

**Pros:**
- Enables fully autonomous operation
- Suitable for containerized environments with isolation
- No human intervention required

**Cons:**
- Removes safety guardrails
- Potential for unintended operations
- Requires robust audit logging
- High trust in AI agent behavior

**When to Use:**
- Inside secure devcontainers with:
  - Network isolation (firewall)
  - Resource limits (cgroups)
  - File system restrictions (read-only mounts)
  - Comprehensive audit logging
  - Rollback mechanisms

**When NOT to Use:**
- Host system (outside containers)
- Production environments
- Systems with sensitive data access
- Without audit logging
- Shared multi-tenant environments

#### Safe Unattended Operation Pattern

```bash
#!/bin/bash
# run-claude-unattended.sh

set -e

# 1. Verify container isolation
if [ "$DEVCONTAINER" != "true" ]; then
    echo "ERROR: Must run inside devcontainer"
    exit 1
fi

# 2. Verify firewall active
if ! iptables -L OUTPUT | grep -q "REJECT"; then
    echo "ERROR: Firewall not active"
    exit 1
fi

# 3. Enable audit logging
export CLAUDE_AUDIT_LOG="/workspace/.claude/audit.log"

# 4. Set resource limits
ulimit -t 3600  # 1 hour CPU time
ulimit -v 8388608  # 8GB virtual memory

# 5. Run Claude Code with permission bypass
timeout 30m claude \
    --dangerously-skip-permissions \
    --log-level=debug \
    "$@" 2>&1 | tee -a "$CLAUDE_AUDIT_LOG"

# 6. Check exit status
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    echo "WARNING: Claude Code exited with code $EXIT_CODE"
    # Notify monitoring system
fi

exit $EXIT_CODE
```

#### Audit Logging Requirements

**Minimum Log Data:**
- Timestamp (ISO 8601 with timezone)
- Operation type (file write, command execution, network request)
- Target resource (file path, command, URL)
- User (AI agent identifier)
- Result (success/failure/error)
- Duration (milliseconds)

**Log Format (JSON Lines):**
```json
{"timestamp":"2025-11-03T14:35:22.123Z","type":"file_write","resource":"/workspace/src/main/kotlin/Auth.kt","user":"claude-code","result":"success","duration_ms":45}
{"timestamp":"2025-11-03T14:35:23.456Z","type":"command_exec","resource":"./gradlew test","user":"claude-code","result":"success","duration_ms":12340}
{"timestamp":"2025-11-03T14:35:25.789Z","type":"network_req","resource":"https://api.anthropic.com","user":"claude-code","result":"success","duration_ms":234}
```

**Storage:**
```json
{
  "mounts": [
    {
      "source": "claude-audit-logs",
      "target": "/workspace/.claude/logs",
      "type": "volume"
    }
  ]
}
```

**Rotation:**
```bash
# logrotate.conf
/workspace/.claude/logs/audit.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0600 node node
    postrotate
        # Ship to centralized logging
        cat /workspace/.claude/logs/audit.log.1 | \
            curl -X POST https://logs.example.com/ingest \
            -H "Content-Type: application/json" \
            --data-binary @-
    endscript
}
```

### 4.2 Monitoring & Alerting

#### Key Metrics

**1. Operation Frequency**
```bash
# Alert if > 100 operations/minute
jq -r '.timestamp' audit.log | \
    awk '{print substr($0,1,16)}' | \
    uniq -c | \
    awk '$1 > 100 {print "ALERT: High operation rate: " $1 " ops/min at " $2}'
```

**2. Failed Operations**
```bash
# Alert if failure rate > 10%
TOTAL=$(wc -l < audit.log)
FAILURES=$(jq -r 'select(.result=="failure")' audit.log | wc -l)
RATE=$(echo "scale=2; $FAILURES / $TOTAL * 100" | bc)

if (( $(echo "$RATE > 10" | bc -l) )); then
    echo "ALERT: Failure rate ${RATE}% exceeds threshold"
fi
```

**3. Suspicious Patterns**
```bash
# Alert on suspicious operations
jq -r 'select(
    .type == "network_req" and (.resource | contains("pastebin")) or
    .type == "file_write" and (.resource | contains("/etc/")) or
    .type == "command_exec" and (.resource | contains("curl") or contains("wget"))
)' audit.log | \
while read -r event; do
    echo "ALERT: Suspicious operation detected: $event"
done
```

**4. Resource Usage**
```bash
# Alert if container exceeds limits
docker stats --no-stream --format "{{.Container}},{{.CPUPerc}},{{.MemPerc}}" | \
while IFS=, read -r container cpu mem; do
    CPU_NUM=${cpu%\%}
    MEM_NUM=${mem%\%}

    if (( $(echo "$CPU_NUM > 90" | bc -l) )); then
        echo "ALERT: Container $container CPU usage ${CPU_NUM}%"
    fi

    if (( $(echo "$MEM_NUM > 90" | bc -l) )); then
        echo "ALERT: Container $container memory usage ${MEM_NUM}%"
    fi
done
```

#### Centralized Logging Architecture

```
┌─────────────────────────────────────────────┐
│  Claude Code Container                      │
│  ┌────────────────────────────────────┐     │
│  │  Audit Log (JSON Lines)            │     │
│  │  /workspace/.claude/logs/audit.log │     │
│  └────────────────────────────────────┘     │
│                   ↓                         │
│  ┌────────────────────────────────────┐     │
│  │  Log Shipper (Fluent Bit)         │     │
│  │  - Tail audit.log                  │     │
│  │  - Parse JSON                      │     │
│  │  - Forward to aggregator           │     │
│  └────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  Log Aggregator (e.g., Elasticsearch)       │
│  - Index logs by timestamp                  │
│  - Full-text search                         │
│  - Retention policies                       │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  Monitoring Dashboard (Grafana/Kibana)      │
│  - Real-time metrics                        │
│  - Anomaly detection                        │
│  - Alert routing                            │
└─────────────────────────────────────────────┘
```

#### Fluent Bit Configuration

```ini
[SERVICE]
    Flush        5
    Daemon       Off
    Log_Level    info

[INPUT]
    Name         tail
    Path         /workspace/.claude/logs/audit.log
    Parser       json
    Tag          claude.audit

[OUTPUT]
    Name         es
    Match        claude.audit
    Host         elasticsearch.example.com
    Port         9200
    Index        claude-audit
    Type         _doc
    HTTP_User    elastic
    HTTP_Passwd  ${ES_PASSWORD}
    tls          On
    tls.verify   On
```

### 4.3 Emergency Stop Mechanisms

#### Circuit Breaker Pattern

```bash
#!/bin/bash
# emergency-stop.sh

CIRCUIT_BREAKER_FILE="/tmp/claude-circuit-breaker"

# Check circuit breaker status
check_circuit_breaker() {
    if [ -f "$CIRCUIT_BREAKER_FILE" ]; then
        echo "STOPPED: Circuit breaker tripped"
        exit 1
    fi
}

# Trip circuit breaker
trip_circuit_breaker() {
    touch "$CIRCUIT_BREAKER_FILE"
    echo "Circuit breaker tripped at $(date)"

    # Kill running Claude Code processes
    pkill -9 -f "claude"

    # Stop container
    docker stop cycletime-claude-code

    # Alert
    echo "CRITICAL: Emergency stop triggered" | \
        mail -s "Claude Code Emergency Stop" ops@example.com
}

# Monitor for trip conditions
monitor_and_trip() {
    # Trip if failure rate > 50%
    FAILURE_RATE=$(calculate_failure_rate)
    if (( $(echo "$FAILURE_RATE > 50" | bc -l) )); then
        echo "Trip reason: Failure rate ${FAILURE_RATE}%"
        trip_circuit_breaker
    fi

    # Trip if suspicious activity
    if grep -q "ALERT: Suspicious" /workspace/.claude/logs/audit.log; then
        echo "Trip reason: Suspicious activity detected"
        trip_circuit_breaker
    fi

    # Trip if resource exhaustion
    MEM_USAGE=$(docker stats --no-stream --format "{{.MemPerc}}" cycletime-claude-code | tr -d '%')
    if (( $(echo "$MEM_USAGE > 95" | bc -l) )); then
        echo "Trip reason: Memory usage ${MEM_USAGE}%"
        trip_circuit_breaker
    fi
}

# Reset circuit breaker (manual)
reset_circuit_breaker() {
    rm -f "$CIRCUIT_BREAKER_FILE"
    echo "Circuit breaker reset at $(date)"
}
```

#### Watchdog Process

```bash
#!/bin/bash
# watchdog.sh

CLAUDE_PROCESS_NAME="claude"
MAX_RUNTIME_SECONDS=3600  # 1 hour
CHECK_INTERVAL=60         # 1 minute

while true; do
    # Find Claude Code process
    PID=$(pgrep -f "$CLAUDE_PROCESS_NAME" | head -n 1)

    if [ -n "$PID" ]; then
        # Check runtime
        RUNTIME=$(ps -o etimes= -p "$PID")

        if [ "$RUNTIME" -gt "$MAX_RUNTIME_SECONDS" ]; then
            echo "ALERT: Claude Code process $PID exceeded max runtime (${RUNTIME}s)"
            kill -TERM "$PID"
            sleep 5

            # Force kill if still running
            if ps -p "$PID" > /dev/null; then
                kill -KILL "$PID"
            fi
        fi

        # Check memory usage
        MEM_PERCENT=$(ps -o %mem= -p "$PID")
        if (( $(echo "$MEM_PERCENT > 80" | bc -l) )); then
            echo "WARNING: Claude Code process $PID high memory usage (${MEM_PERCENT}%)"
        fi
    fi

    sleep "$CHECK_INTERVAL"
done
```

#### Graceful Shutdown

```bash
#!/bin/bash
# graceful-shutdown.sh

CLAUDE_PID=$(pgrep -f "claude")

if [ -n "$CLAUDE_PID" ]; then
    echo "Sending SIGTERM to Claude Code (PID: $CLAUDE_PID)"
    kill -TERM "$CLAUDE_PID"

    # Wait up to 30 seconds for graceful shutdown
    for i in {1..30}; do
        if ! ps -p "$CLAUDE_PID" > /dev/null; then
            echo "Claude Code stopped gracefully"
            exit 0
        fi
        sleep 1
    done

    # Force kill if still running
    echo "Forcing stop with SIGKILL"
    kill -KILL "$CLAUDE_PID"
fi
```

### 4.4 Rollback & Recovery

#### Git-Based Rollback

```bash
#!/bin/bash
# rollback.sh

# Store commit hash before Claude Code runs
PRE_RUN_COMMIT=$(git rev-parse HEAD)
echo "$PRE_RUN_COMMIT" > /tmp/claude-pre-run-commit

# After Claude Code completes, verify changes
post_run_verification() {
    # Run tests
    if ! ./gradlew test; then
        echo "ERROR: Tests failed after Claude Code run"
        rollback_changes
        return 1
    fi

    # Check code quality
    if ! ./gradlew detekt; then
        echo "ERROR: Code quality checks failed"
        rollback_changes
        return 1
    fi

    # Verify build
    if ! ./gradlew build; then
        echo "ERROR: Build failed"
        rollback_changes
        return 1
    fi

    echo "Post-run verification passed"
    return 0
}

rollback_changes() {
    echo "Rolling back to commit: $PRE_RUN_COMMIT"

    # Stash any uncommitted changes
    git stash push -u -m "Claude Code rollback stash $(date +%Y%m%d%H%M%S)"

    # Hard reset to pre-run commit
    git reset --hard "$PRE_RUN_COMMIT"

    # Clean untracked files
    git clean -fd

    echo "Rollback complete"
}

# Usage:
# 1. Run before Claude Code: ./rollback.sh (stores commit)
# 2. Run after Claude Code: post_run_verification
```

#### Snapshot-Based Recovery

```bash
#!/bin/bash
# snapshot.sh

SNAPSHOT_DIR="/snapshots"
WORKSPACE_DIR="/workspace"

create_snapshot() {
    SNAPSHOT_NAME="snapshot-$(date +%Y%m%d%H%M%S)"
    SNAPSHOT_PATH="$SNAPSHOT_DIR/$SNAPSHOT_NAME.tar.gz"

    echo "Creating snapshot: $SNAPSHOT_NAME"
    tar -czf "$SNAPSHOT_PATH" -C "$WORKSPACE_DIR" .

    # Store metadata
    echo "$SNAPSHOT_NAME" > "$SNAPSHOT_DIR/latest"

    echo "Snapshot created: $SNAPSHOT_PATH"
}

restore_snapshot() {
    SNAPSHOT_NAME="${1:-$(cat $SNAPSHOT_DIR/latest)}"
    SNAPSHOT_PATH="$SNAPSHOT_DIR/$SNAPSHOT_NAME.tar.gz"

    if [ ! -f "$SNAPSHOT_PATH" ]; then
        echo "ERROR: Snapshot not found: $SNAPSHOT_PATH"
        return 1
    fi

    echo "Restoring snapshot: $SNAPSHOT_NAME"

    # Backup current state
    BACKUP_NAME="backup-before-restore-$(date +%Y%m%d%H%M%S)"
    tar -czf "$SNAPSHOT_DIR/$BACKUP_NAME.tar.gz" -C "$WORKSPACE_DIR" .

    # Restore snapshot
    rm -rf "$WORKSPACE_DIR"/*
    tar -xzf "$SNAPSHOT_PATH" -C "$WORKSPACE_DIR"

    echo "Snapshot restored: $SNAPSHOT_NAME"
}

list_snapshots() {
    ls -lh "$SNAPSHOT_DIR"/*.tar.gz
}
```

#### Automated Recovery Workflow

```bash
#!/bin/bash
# auto-recovery.sh

run_with_recovery() {
    local TASK="$1"

    # 1. Create pre-run snapshot
    create_snapshot
    PRE_SNAPSHOT=$(cat /snapshots/latest)

    # 2. Run Claude Code task
    echo "Running task: $TASK"
    claude --dangerously-skip-permissions "$TASK"
    CLAUDE_EXIT=$?

    # 3. Verify results
    if [ $CLAUDE_EXIT -ne 0 ]; then
        echo "ERROR: Claude Code failed with exit code $CLAUDE_EXIT"
        restore_snapshot "$PRE_SNAPSHOT"
        return 1
    fi

    # 4. Run post-verification
    if ! post_run_verification; then
        echo "ERROR: Post-verification failed"
        restore_snapshot "$PRE_SNAPSHOT"
        return 1
    fi

    # 5. Commit successful changes
    git add -A
    git commit -m "feat: $TASK (automated by Claude Code)"

    echo "Task completed successfully"
    return 0
}
```

---

## 5. Recommended DevContainer Architecture for CycleTime

### 5.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  Host System                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Docker Engine                                            │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  CycleTime Claude Code Container                   │  │  │
│  │  │                                                     │  │  │
│  │  │  Base Image: node:20                               │  │  │
│  │  │  User: node (non-root)                             │  │  │
│  │  │  Capabilities: NET_ADMIN (firewall only)           │  │  │
│  │  │  Seccomp: Custom profile                           │  │  │
│  │  │  AppArmor: claude-code profile                     │  │  │
│  │  │                                                     │  │  │
│  │  │  ┌───────────────────────────────────────────┐     │  │  │
│  │  │  │  Runtimes                                 │     │  │  │
│  │  │  │  - Node.js 20 (Claude Code)               │     │  │  │
│  │  │  │  - OpenJDK 21 (Kotlin/JVM)                │     │  │  │
│  │  │  │  - Gradle 8.x                             │     │  │  │
│  │  │  └───────────────────────────────────────────┘     │  │  │
│  │  │                                                     │  │  │
│  │  │  ┌───────────────────────────────────────────┐     │  │  │
│  │  │  │  Network Isolation (iptables)             │     │  │  │
│  │  │  │  - Egress whitelisting (ipset)            │     │  │  │
│  │  │  │  - Default-deny policy                    │     │  │  │
│  │  │  │  - DNS restricted to Docker resolver      │     │  │  │
│  │  │  └───────────────────────────────────────────┘     │  │  │
│  │  │                                                     │  │  │
│  │  │  ┌───────────────────────────────────────────┐     │  │  │
│  │  │  │  Volume Mounts                            │     │  │  │
│  │  │  │  - /workspace (source code, read-only)    │     │  │  │
│  │  │  │  - gradle-cache (build artifacts)         │     │  │  │
│  │  │  │  - npm-cache (node_modules)               │     │  │  │
│  │  │  │  - claude-config (persistent config)      │     │  │  │
│  │  │  │  - claude-logs (audit logs)               │     │  │  │
│  │  │  └───────────────────────────────────────────┘     │  │  │
│  │  │                                                     │  │  │
│  │  │  ┌───────────────────────────────────────────┐     │  │  │
│  │  │  │  Resource Limits (cgroups)                │     │  │  │
│  │  │  │  - CPU: 4 cores                           │     │  │  │
│  │  │  │  - Memory: 8GB                            │     │  │  │
│  │  │  │  - PIDs: 200                              │     │  │  │
│  │  │  │  - Disk I/O: 100MB/s read, 50MB/s write   │     │  │  │
│  │  │  └───────────────────────────────────────────┘     │  │  │
│  │  │                                                     │  │  │
│  │  │  ┌───────────────────────────────────────────┐     │  │  │
│  │  │  │  Monitoring & Safety                      │     │  │  │
│  │  │  │  - Audit logging (JSON lines)             │     │  │  │
│  │  │  │  - Watchdog process (1h timeout)          │     │  │  │
│  │  │  │  - Circuit breaker                        │     │  │  │
│  │  │  │  - Automated rollback                     │     │  │  │
│  │  │  └───────────────────────────────────────────┘     │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 Complete DevContainer Configuration

**Directory Structure:**
```
.devcontainer/
├── devcontainer.json          # Main configuration
├── Dockerfile                 # Container image
├── init-firewall.sh           # Network isolation
├── seccomp-profile.json       # Syscall filtering
├── apparmor-profile           # MAC policy
├── watchdog.sh                # Safety monitoring
├── emergency-stop.sh          # Circuit breaker
└── rollback.sh                # Recovery automation
```

**devcontainer.json:**
```json
{
  "name": "CycleTime Claude Code",
  "build": {
    "dockerfile": "Dockerfile",
    "args": {
      "TIMEZONE": "UTC",
      "NODE_VERSION": "20",
      "JAVA_VERSION": "21",
      "CLAUDE_CODE_VERSION": "latest"
    }
  },

  "capAdd": ["NET_ADMIN"],
  "capDrop": ["ALL"],

  "securityOpt": [
    "seccomp=/workspace/.devcontainer/seccomp-profile.json",
    "apparmor=claude-code"
  ],

  "hostConfig": {
    "cpus": "4.0",
    "memory": "8g",
    "memorySwap": "8g",
    "pidsLimit": 200,
    "blkioWeight": 500
  },

  "mounts": [
    {
      "source": "${localWorkspaceFolder}",
      "target": "/workspace",
      "type": "bind",
      "readonly": true
    },
    {
      "source": "gradle-cache",
      "target": "/home/node/.gradle",
      "type": "volume"
    },
    {
      "source": "npm-cache",
      "target": "/home/node/.npm",
      "type": "volume"
    },
    {
      "source": "claude-config",
      "target": "/home/node/.claude",
      "type": "volume"
    },
    {
      "source": "claude-logs",
      "target": "/workspace/.claude/logs",
      "type": "volume"
    }
  ],

  "remoteEnv": {
    "NODE_OPTIONS": "--max-old-space-size=6144",
    "JAVA_HOME": "/usr/lib/jvm/java-21-openjdk-amd64",
    "CLAUDE_CONFIG_DIR": "/home/node/.claude",
    "CLAUDE_AUDIT_LOG": "/workspace/.claude/logs/audit.log",
    "DEVCONTAINER": "true"
  },

  "customizations": {
    "vscode": {
      "extensions": [
        "anthropic.claude-code",
        "fwcd.kotlin",
        "vscjava.vscode-java-pack",
        "eamodio.gitlens",
        "dbaeumer.vscode-eslint"
      ],
      "settings": {
        "terminal.integrated.defaultProfile.linux": "zsh",
        "editor.formatOnSave": true,
        "kotlin.languageServer.enabled": true,
        "java.home": "/usr/lib/jvm/java-21-openjdk-amd64"
      }
    }
  },

  "postCreateCommand": {
    "git-config": "git config --global user.name 'CycleTime Agent' && git config --global user.email 'agent@cycletime.dev'",
    "git-safe": "git config --global --add safe.directory /workspace"
  },

  "postStartCommand": {
    "firewall": "sudo /usr/local/bin/init-firewall.sh",
    "watchdog": "nohup /usr/local/bin/watchdog.sh &",
    "auth-check": "claude /status"
  },

  "remoteUser": "node",
  "workspaceFolder": "/workspace"
}
```

**Dockerfile:**
```dockerfile
FROM node:20

ARG TIMEZONE=UTC
ARG NODE_VERSION=20
ARG JAVA_VERSION=21
ARG CLAUDE_CODE_VERSION=latest

# Set timezone
ENV TZ=$TIMEZONE
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # JVM runtime
    openjdk-${JAVA_VERSION}-jdk \
    gradle \
    maven \
    # Development tools
    git gh zsh fzf less procps sudo man-db unzip \
    # Security tools
    gnupg2 iptables ipset iproute2 dnsutils \
    # Utilities
    jq nano vim curl wget \
    && rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java-${JAVA_VERSION}-openjdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}

# Install git-delta for better diffs
RUN wget -O /tmp/git-delta.deb \
    https://github.com/dandavison/delta/releases/download/0.18.2/git-delta_0.18.2_amd64.deb \
    && dpkg -i /tmp/git-delta.deb && rm /tmp/git-delta.deb

# Configure non-root user
RUN mkdir -p /workspace /home/node/.claude /home/node/.gradle /home/node/.npm \
    && chown -R node:node /workspace /home/node

# Install safety scripts
COPY init-firewall.sh /usr/local/bin/init-firewall.sh
COPY watchdog.sh /usr/local/bin/watchdog.sh
COPY emergency-stop.sh /usr/local/bin/emergency-stop.sh
COPY rollback.sh /usr/local/bin/rollback.sh

RUN chmod +x /usr/local/bin/*.sh && \
    echo "node ALL=(ALL) NOPASSWD: /usr/local/bin/init-firewall.sh" >> /etc/sudoers

# Configure shell
RUN sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v1.2.0/zsh-in-docker.sh)"

ENV DEVCONTAINER=true
ENV EDITOR=nano

USER node
WORKDIR /workspace

# Verify installations
RUN node --version && \
    java --version && \
    gradle --version && \
    claude --version
```

### 5.3 Operational Runbook

#### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/cycletime.git
cd cycletime

# 2. Open in VS Code with Dev Containers extension
code .

# 3. VS Code Command Palette: "Dev Containers: Reopen in Container"
# This will:
# - Build the devcontainer image
# - Start the container with all configurations
# - Install extensions
# - Run lifecycle hooks
# - Open integrated terminal inside container

# 4. Verify setup
claude /status
./gradlew --version
git status
```

#### Running Unattended Operations

```bash
# 1. Verify isolation
if [ "$DEVCONTAINER" != "true" ]; then
    echo "ERROR: Must run inside devcontainer"
    exit 1
fi

# 2. Create pre-run snapshot
./usr/local/bin/rollback.sh

# 3. Run Claude Code with monitoring
timeout 30m claude \
    --dangerously-skip-permissions \
    --log-level=debug \
    "Implement user authentication with JWT tokens" \
    2>&1 | tee -a /workspace/.claude/logs/audit.log

# 4. Verify results
./gradlew test detekt build

# 5. Commit or rollback
if [ $? -eq 0 ]; then
    git add -A
    git commit -m "feat: implement JWT authentication (automated)"
else
    echo "Verification failed, rolling back"
    ./usr/local/bin/rollback.sh restore
fi
```

#### Emergency Procedures

**Manual Stop:**
```bash
# From host system
docker exec cycletime-claude-code /usr/local/bin/emergency-stop.sh

# Force stop
docker stop cycletime-claude-code
```

**Rollback:**
```bash
# Inside container
cd /workspace
git log --oneline  # Find commit to restore
git reset --hard <commit-hash>

# Or use snapshot
./usr/local/bin/rollback.sh restore snapshot-20251103143522
```

**Recovery:**
```bash
# Restart container
docker start cycletime-claude-code

# Reattach VS Code
# Command Palette: "Dev Containers: Reopen in Container"

# Verify state
git status
./gradlew clean build
```

#### Maintenance

**Update Container Image:**
```bash
# Rebuild devcontainer
# Command Palette: "Dev Containers: Rebuild Container"

# Or from command line
docker build -t cycletime-claude-code .devcontainer
```

**Rotate API Keys:**
```bash
# Update ANTHROPIC_API_KEY in devcontainer.json
# Or use container secrets:
docker secret create claude_api_key <(echo "sk-ant-...")

# Update devcontainer.json to mount secret
```

**Review Audit Logs:**
```bash
# Inside container
cat /workspace/.claude/logs/audit.log | jq .

# Filter failures
jq 'select(.result=="failure")' /workspace/.claude/logs/audit.log

# Operations by type
jq -r '.type' /workspace/.claude/logs/audit.log | sort | uniq -c
```

---

## 6. Security Considerations & Risk Mitigation

### 6.1 Threat Model

#### Assets

1. **Source Code**: Intellectual property, business logic
2. **Credentials**: API keys, Git tokens, database passwords
3. **Build Artifacts**: Compiled binaries, JAR files
4. **Audit Logs**: Security monitoring data
5. **Host System**: Docker host, other containers

#### Threats

**T1: Data Exfiltration**
- **Attack**: AI agent uploads source code to external server
- **Impact**: Intellectual property theft
- **Mitigation**: Network egress whitelisting via iptables

**T2: Credential Theft**
- **Attack**: AI agent reads mounted SSH keys or credentials file
- **Impact**: Unauthorized access to external systems
- **Mitigation**: Read-only mounts, no credential mounting, SSH agent forwarding

**T3: Privilege Escalation**
- **Attack**: Container breakout to host system
- **Impact**: Full host compromise
- **Mitigation**: Non-root user, capability dropping, seccomp, AppArmor

**T4: Resource Exhaustion**
- **Attack**: Fork bomb or infinite loop
- **Impact**: Host system denial of service
- **Mitigation**: cgroups resource limits (CPU, memory, PIDs)

**T5: Malicious Code Injection**
- **Attack**: AI agent writes backdoor to source code
- **Impact**: Supply chain compromise
- **Mitigation**: Git-based rollback, post-verification testing, code review

**T6: Lateral Movement**
- **Attack**: Container compromises other containers
- **Impact**: Multi-container breach
- **Mitigation**: Network isolation, no container-to-container communication

**T7: Persistent Backdoor**
- **Attack**: AI agent modifies container image
- **Impact**: Persistent compromise across restarts
- **Mitigation**: Read-only filesystem, immutable infrastructure, image signing

#### Risk Assessment Matrix

| Threat | Likelihood | Impact | Risk Level | Mitigation Effectiveness |
|--------|-----------|--------|------------|-------------------------|
| T1: Data Exfiltration | Medium | High | **High** | High (firewall blocks non-whitelisted) |
| T2: Credential Theft | Low | Critical | **High** | High (no credentials mounted) |
| T3: Privilege Escalation | Low | Critical | **Medium** | High (defense-in-depth) |
| T4: Resource Exhaustion | Medium | Medium | **Medium** | High (cgroups enforced) |
| T5: Malicious Code | Medium | High | **High** | Medium (requires code review) |
| T6: Lateral Movement | Low | High | **Low** | High (network isolation) |
| T7: Persistent Backdoor | Low | High | **Low** | High (immutable images) |

### 6.2 Security Best Practices Summary

**1. Defense-in-Depth**
Implement multiple overlapping security layers. If one fails, others prevent compromise.

**2. Principle of Least Privilege**
Grant only minimum required permissions. Drop unnecessary capabilities, restrict network access, use read-only mounts.

**3. Fail-Safe Defaults**
Default to deny. Whitelist allowed operations rather than blacklist forbidden ones.

**4. Complete Mediation**
Check permissions on every access. Don't cache authorization decisions.

**5. Open Design**
Security through obscurity doesn't work. Assume attackers know the system.

**6. Separation of Privilege**
Require multiple conditions for sensitive operations. Combine firewall + capability dropping + seccomp.

**7. Least Common Mechanism**
Minimize shared resources between containers. Isolate each container's network and filesystem.

**8. Psychological Acceptability**
Security mechanisms should be usable. If too complex, users will bypass them.

### 6.3 Compliance Considerations

**GDPR (General Data Protection Regulation)**
- Audit logging for data access tracking
- Right to erasure (automated data deletion)
- Data minimization (only log necessary information)

**SOC 2 (Service Organization Control 2)**
- Security: Access controls, encryption, network isolation
- Availability: Resource limits, monitoring, disaster recovery
- Confidentiality: Credential management, audit logging

**ISO 27001 (Information Security Management)**
- Risk assessment (threat modeling)
- Access control (least privilege)
- Incident response (emergency procedures)
- Business continuity (rollback mechanisms)

**NIST Cybersecurity Framework**
- Identify: Asset inventory, threat model
- Protect: Defense-in-depth architecture
- Detect: Audit logging, monitoring, alerting
- Respond: Circuit breaker, emergency stop
- Recover: Rollback, snapshot restore

---

## 7. Future Considerations

### 7.1 Technology Evolution

**Cgroups v2 Maturity (2025+)**
- Unified hierarchy simplifies management
- PSI (Pressure Stall Information) for better resource allocation
- eBPF integration for advanced monitoring
- **Action**: Migrate from cgroups v1 to v2 when Docker fully supports

**Rootless Containers Production-Ready**
- AppArmor support improving
- Cgroups resource control limitations addressed
- **Action**: Re-evaluate rootless mode for production deployments

**Seccomp Notify (User-Space Handling)**
- Syscall decisions moved to user space
- More flexible policy enforcement
- **Action**: Implement custom seccomp notify handler for AI agent operations

**Container Runtime Security Tools**
- Falco, Sysdig, Aqua Security maturity
- Real-time threat detection and response
- **Action**: Integrate runtime security monitoring

### 7.2 AI Agent Safety Research

**Constitutional AI**
- Encode safety principles in AI behavior
- Reduce need for external restrictions
- **Action**: Monitor Anthropic's constitutional AI research

**Interpretability Tools**
- Understand AI agent decision-making
- Detect potentially harmful behavior before execution
- **Action**: Integrate Claude thinking transparency features

**Formal Verification**
- Mathematically prove AI agent safety properties
- Guarantee adherence to security policies
- **Action**: Explore formal methods for AI agent verification

### 7.3 Recommendations for CycleTime Project

**Short-Term (0-3 months)**
1. Implement devcontainer based on Anthropic's official configuration
2. Add cgroups resource limits (CPU, memory, PIDs)
3. Deploy audit logging with basic monitoring
4. Create emergency stop and rollback scripts

**Medium-Term (3-6 months)**
1. Implement centralized logging with alerting
2. Add runtime security monitoring (Falco)
3. Develop custom seccomp and AppArmor profiles
4. Automate compliance reporting (SOC 2)

**Long-Term (6-12 months)**
1. Migrate to rootless containers when production-ready
2. Integrate AI agent interpretability tools
3. Implement formal verification for critical operations
4. Contribute findings back to Claude Code community

---

## 8. References & Resources

### Official Documentation

- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code)
- [Claude Code DevContainer](https://docs.claude.com/en/docs/claude-code/devcontainer)
- [Anthropic DevContainer Features](https://github.com/anthropics/devcontainer-features)
- [VS Code Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)
- [Dev Container Specification](https://containers.dev/)

### Security Resources

- [Docker Security Cheat Sheet (OWASP)](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [Container Security Best Practices](https://kubernetes.io/docs/concepts/security/overview/)
- [Seccomp Tutorial](https://docs.docker.com/engine/security/seccomp/)
- [AppArmor Profile Language](https://gitlab.com/apparmor/apparmor/-/wikis/ProfileLanguage)
- [Linux Capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html)

### Community Examples

- [Claude Code in DevContainer (Medium)](https://medium.com/@a8n.one/how-to-isolate-claude-code-using-devcontainer-setup-68f8e2d109c8)
- [Running Claude Code Safely (Jökull Sólberg)](https://www.solberg.is/claude-devcontainer)
- [Containerized AI Development (Brett)](https://medium.com/@brett_4870/building-a-secure-ai-development-environment-containerized-claude-code-mcp-integration-e2129fe3af5a)
- [Claudetainer Project](https://github.com/smithclay/claudetainer)

### Technical Papers

- [Cgroups v2 Overview](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html)
- [Seccomp BPF](https://www.kernel.org/doc/Documentation/prctl/seccomp_filter.txt)
- [Container Isolation Research](https://www.usenix.org/conference/atc18/presentation/scrivano)

### Tools & Libraries

- [Docker](https://www.docker.com/)
- [Podman](https://podman.io/) - Rootless container alternative
- [Fluent Bit](https://fluentbit.io/) - Log shipper
- [Falco](https://falco.org/) - Runtime security monitoring
- [ipset](http://ipset.netfilter.org/) - IP address whitelist management

---

## Appendix A: Complete Configuration Files

### A.1 devcontainer.json (Full)

See Section 5.2 for complete configuration.

### A.2 Dockerfile (Full)

See Section 5.2 for complete Dockerfile.

### A.3 init-firewall.sh (Full)

See Section 1.1 for complete firewall script.

### A.4 seccomp-profile.json

See Section 2.1 for custom seccomp profile.

### A.5 apparmor-profile

See Section 2.1 for AppArmor profile.

---

## Appendix B: Troubleshooting Guide

### B.1 Common Issues

**Issue: Firewall blocks required services**
```bash
# Symptom: npm install fails with network timeout
# Solution: Add registry to whitelist
dig +short registry.npmjs.org  # Get IPs
ipset add allowed-domains <IP>
```

**Issue: Permission denied writing files**
```bash
# Symptom: Claude Code can't modify source files
# Solution: Check mount configuration
# devcontainer.json should have readonly: false for writable mounts
```

**Issue: Container OOM killed**
```bash
# Symptom: Container stops unexpectedly
# Solution: Increase memory limit
# devcontainer.json: "memory": "16g"
```

**Issue: Java heap OutOfMemoryError**
```bash
# Symptom: Gradle build fails with OOM
# Solution: Adjust JVM heap size
export JAVA_OPTS="-Xmx4g"
./gradlew build
```

### B.2 Debugging Techniques

**Check container logs:**
```bash
docker logs cycletime-claude-code
```

**Inspect running container:**
```bash
docker exec -it cycletime-claude-code bash
```

**View audit logs:**
```bash
cat /workspace/.claude/logs/audit.log | jq .
```

**Test firewall rules:**
```bash
# Inside container
curl -v --max-time 5 https://api.github.com      # Should work
curl -v --max-time 5 https://example.com         # Should fail
```

**Check resource usage:**
```bash
docker stats cycletime-claude-code
```

---

## Appendix C: Glossary

**AppArmor**: Linux Security Module providing Mandatory Access Control (MAC) for file and network access

**Cgroups**: Control Groups - Linux kernel feature for limiting and isolating resource usage

**DevContainer**: Development container specification for consistent dev environments

**ipset**: Linux kernel extension for efficient IP address/network whitelist management

**iptables**: User-space utility for configuring Linux kernel firewall rules

**Seccomp**: Secure Computing Mode - Linux kernel feature restricting system calls

**SSH Agent Forwarding**: Technique to use local SSH keys inside containers without copying them

**Syscall**: System call - interface between user-space applications and kernel

**tmpfs**: Temporary filesystem stored in RAM (volatile, fast)

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-03 | Research Team | Initial research document |

---

**End of Document**
