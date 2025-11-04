# DevContainer FAQ

Frequently asked questions about the CycleTime devcontainer.

## General Questions

**Q: What is a devcontainer?**

A: A devcontainer is a Docker container configured specifically for development. It provides a consistent, reproducible environment with all tools and dependencies pre-installed.

**Q: Do I need to know Docker to use this?**

A: No. VS Code's Dev Containers extension handles most Docker operations automatically. You just need Docker Desktop installed.

**Q: Can I use this on Windows/Mac/Linux?**

A: Yes. The devcontainer works on all platforms that support Docker Desktop and VS Code.

**Q: How much disk space do I need?**

A: Minimum 15GB free:
- Base image: ~3GB
- Build caches: ~2-5GB
- Workspace: varies
- Logs and volumes: ~1GB

---

## Setup & Configuration

**Q: Where do I store my Anthropic API key?**

A: **Recommended**: As an environment variable on your HOST machine:
```bash
# Mac/Linux
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.zshrc
source ~/.zshrc

# Windows PowerShell
[System.Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', 'sk-ant-...', 'User')
```

Then rebuild the container to pick up the environment variable.

**Q: Can I customize the container?**

A: Yes. Edit `.devcontainer/devcontainer.json` or `.devcontainer/Dockerfile`, then rebuild:
- Command Palette: `Dev Containers: Rebuild Container`

**Q: How do I add VS Code extensions?**

A: Edit `.devcontainer/devcontainer.json`:
```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "your.extension.id"
      ]
    }
  }
}
```

Then rebuild the container.

---

## Usage & Workflows

**Q: What's the difference between interactive and unattended mode?**

A: 
- **Interactive mode** (`claude`): You see Claude's responses and approve actions. Safe for exploration.
- **Unattended mode** (`claude --dangerously-skip-permissions`): Claude acts autonomously. Only use inside devcontainer with safety mechanisms active.

**Q: How long does dangerous mode stay enabled?**

A: Default: 30 minutes. You specify duration when enabling:
```bash
/usr/local/bin/enable-dangerous-mode.sh 1800  # 30 minutes
```

Auto-disables after timeout or when you manually disable it.

**Q: Can I run multiple Claude Code sessions simultaneously?**

A: No. One Claude Code session per container. Multiple sessions can conflict and cause undefined behavior.

**Q: How do I stop a runaway Claude Code process?**

A: 
```bash
# Emergency stop
/usr/local/bin/emergency-stop.sh stop

# Or kill process
pkill -9 -f claude
```

---

## Safety & Security

**Q: Is it safe to use dangerous mode?**

A: Inside the devcontainer with all safety mechanisms active: **Yes, with precautions**.
- Network isolation prevents data exfiltration
- Resource limits prevent resource exhaustion
- Git rollback enables recovery
- Audit logging tracks all actions

Outside the devcontainer: **NO - Never use dangerous mode on your host system**.

**Q: What does the firewall block?**

A: The firewall blocks ALL egress traffic except whitelisted domains:
- GitHub (git operations)
- Anthropic API (Claude Code)
- NPM registry (package installs)
- Maven Central (Gradle dependencies)
- Linear API (issue tracking)

Everything else is blocked by default.

**Q: Can Claude Code access my SSH keys?**

A: No. SSH keys are not mounted in the container. Use HTTPS Git tokens instead.

**Q: What happens if I hit resource limits?**

A: The container is throttled or stopped:
- **CPU limit**: Process throttled
- **Memory limit**: OOM killer terminates container
- **PID limit**: Cannot create new processes
- **Disk I/O limit**: Operations slowed

Resource monitoring triggers alerts before limits are reached.

---

## Performance

**Q: Why is the first build slow?**

A: First build downloads:
- Base Docker image (~3GB)
- System packages (~1GB)
- Gradle dependencies (~500MB)
- NPM packages (~200MB)

Subsequent builds use cached layers and volumes, making them much faster.

**Q: How do I speed up builds?**

A:
1. Ensure build cache volumes are configured (check `devcontainer.json`)
2. Use parallel builds (`org.gradle.parallel=true` in `gradle.properties`)
3. Allocate more resources to Docker Desktop (6+ CPUs, 12+ GB RAM)
4. Use Gradle daemon (enabled by default)

**Q: Why is my container using so much memory?**

A: Kotlin/JVM + Node.js dual runtime requires significant memory:
- JVM heap: up to 4GB
- Node.js heap: up to 6GB
- System: ~2GB
- Total: ~12GB peak usage

If memory is constrained, reduce heap sizes in configuration.

---

## Troubleshooting

**Q: Container won't start - what do I check?**

A:
1. Docker Desktop running? (check system tray/menu bar)
2. Enough disk space? (`docker system df`)
3. Check logs: `docker logs <container-id>`
4. Try rebuilding without cache

**Q: "Authentication failed" errors?**

A:
1. Check API key is set: `echo $ANTHROPIC_API_KEY`
2. Verify key format (starts with `sk-ant-`)
3. Rebuild container to pick up environment
4. Test with: `claude /status`

**Q: Git says "dubious ownership"?**

A:
```bash
# Run post-create script
bash /workspace/.devcontainer/post-create.sh

# Or manually configure
git config --global --add safe.directory /workspace
```

**Q: Tests failing after Claude Code run?**

A:
```bash
# Rollback to pre-run commit
git log --oneline -10  # Find commit hash
git reset --hard <commit-hash>
git clean -fd

# Or use stored pre-run commit
git reset --hard $(cat /tmp/pre-run-commit)
```

---

## Advanced Topics

**Q: Can I use this with GitHub Codespaces?**

A: Potentially, but not officially supported. The devcontainer configuration should work in Codespaces, but:
- Network isolation may not work the same way
- Resource limits are managed by Codespaces
- Safety scripts may need adaptation

**Q: Can I run this in CI/CD?**

A: Yes. The devcontainer can run in CI pipelines:
```yaml
# GitHub Actions example
jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: ghcr.io/your-org/cycletime-devcontainer:latest
    steps:
      - uses: actions/checkout@v3
      - run: ./gradlew test
```

**Q: How do I contribute improvements?**

A: 
1. Fork the repository
2. Create feature branch
3. Make changes to `.devcontainer/` configuration
4. Test thoroughly
5. Submit pull request with documentation

**Q: Where can I report issues?**

A: https://github.com/your-org/cycletime/issues

Include:
- Environment details (OS, Docker version, VS Code version)
- Full error messages
- Steps to reproduce
- Relevant log entries

---

## Quick Reference

**Essential Commands:**

```bash
# Inside container
claude /status                    # Check authentication
./gradlew build                   # Build project
./gradlew test                    # Run tests

# Safety
/usr/local/bin/enable-dangerous-mode.sh 1800   # Enable (30 min)
/usr/local/bin/disable-dangerous-mode.sh       # Disable
/usr/local/bin/emergency-stop.sh status        # Check circuit breaker

# Monitoring
/usr/local/bin/monitor-resources.sh once       # Resource snapshot
tail -50 /workspace/.claude/audit.log | jq .   # Audit log

# Recovery
git reset --hard <commit>         # Rollback
/usr/local/bin/emergency-stop.sh reset         # Reset circuit breaker
```

**Documentation Links:**
- [Setup Guide](./SETUP-GUIDE.md) - Installation
- [Usage Guide](./USAGE-GUIDE.md) - Daily workflows
- [Best Practices](./BEST-PRACTICES.md) - Recommended patterns
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues
- [Examples](./EXAMPLES.md) - Real-world examples

---

**Version**: 1.0
**Last Updated**: 2025-11-03
