# CycleTime DevContainer

This directory contains the DevContainer configuration for CycleTime development. The DevContainer provides a consistent, reproducible development environment with all required tools and dependencies pre-installed.

## Overview

The CycleTime DevContainer includes:

- **Node.js 20** - For MCP server and tooling
- **OpenJDK 21** - For Kotlin/JVM development
- **Claude Code CLI** - AI assistant for development workflows
- **Gradle** - Via project wrapper (./gradlew)
- **Git** - Version control
- **VS Code extensions** - Kotlin, Java, Gradle, Git tooling

## Prerequisites

### Required
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (or Docker Engine)
- [Visual Studio Code](https://code.visualstudio.com/)
- [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### System Requirements
- **CPU**: 4+ cores recommended (container uses up to 4 cores)
- **RAM**: 8GB+ recommended (container uses up to 8GB)
- **Disk**: 10GB+ free space for images and caches

## Documentation

**Complete setup and usage documentation is available in the [`docs/`](./docs/) directory:**

### Getting Started
- **[Setup Guide](./docs/SETUP-GUIDE.md)** - First-time installation and configuration
- **[Usage Guide](./docs/USAGE-GUIDE.md)** - Daily development workflows and commands

### Operations
- **[Best Practices](./docs/BEST-PRACTICES.md)** - Safe workflow patterns and recommendations
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[FAQ](./docs/FAQ.md)** - Frequently asked questions
- **[Examples](./docs/EXAMPLES.md)** - Real-world usage examples

### Safety & Security
- **[SAFETY.md](./SAFETY.md)** - Comprehensive safety mechanisms
- **[DANGEROUS-MODE.md](./DANGEROUS-MODE.md)** - Unattended operations guide

## Quick Start

### 1. Open Project in DevContainer

**Option A: VS Code Command Palette**
1. Open CycleTime project in VS Code
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Select: `Dev Containers: Reopen in Container`
4. Wait for container to build (first time ~5-10 minutes)

**Option B: VS Code Notification**
1. Open CycleTime project in VS Code
2. Click "Reopen in Container" in the notification popup

For detailed setup instructions, see [Setup Guide](./docs/SETUP-GUIDE.md).

### 2. Verify Setup

Once the container is built and post-create script completes:

```bash
# Check Java version
java -version
# Expected: openjdk version "21.x.x"

# Check Node version
node --version
# Expected: v20.x.x

# Check Claude Code CLI
claude --version
# Expected: 2.0.32

# Check Gradle wrapper
./gradlew --version
# Should show Gradle 9.1.0, Kotlin 2.2.0, JVM 21

# Run tests to verify environment
./gradlew test
```

### 3. Start Development

```bash
# Build the project
./gradlew build

# Run development server with hot-reload
./gradlew devRun --continuous

# Run tests continuously
./gradlew testWatch --continuous

# Check build optimizations
./gradlew buildStatus
```

## Container Architecture

### Base Image
- **Base**: `node:20-bookworm` (Debian 12)
- **User**: `vscode` (non-root, UID 1000)
- **Workspace**: `/workspace`

### Volume Mounts

| Host | Container | Type | Purpose |
|------|-----------|------|---------|
| Project directory | `/workspace` | bind | Source code |
| Named volume | `/home/vscode/.gradle` | volume | Gradle cache |
| Named volume | `/home/vscode/.m2` | volume | Maven cache |

**Benefits**:
- **Gradle cache**: Prevents re-downloading dependencies on rebuild
- **Maven cache**: Speeds up dependency resolution
- **Persistent config**: Settings survive container rebuilds

### Environment Variables

```bash
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
GRADLE_USER_HOME=/home/vscode/.gradle
NODE_OPTIONS=--max-old-space-size=4096
DEVCONTAINER=true
```

### Port Forwarding

- **8080**: MCP server (auto-forwarded)

## Development Workflow

### Standard Workflow

```bash
# Terminal 1: Development server
./gradlew devRun --continuous

# Terminal 2: Test watcher
./gradlew testWatch --continuous

# Terminal 3: Git operations, builds, etc.
git status
./gradlew build
```

### Useful Aliases

The post-create script sets up helpful aliases:

```bash
gw      # ./gradlew
gwb     # ./gradlew build
gwt     # ./gradlew test
gwc     # ./gradlew clean
gwut    # ./gradlew unitTest
gwit    # ./gradlew integrationTest
gwr     # ./gradlew run
gwdr    # ./gradlew devRun --continuous
gwbs    # ./gradlew buildStatus

gs      # git status
gp      # git pull
gc      # git commit
gca     # git commit --amend
gl      # git log --oneline --graph --all -20
```

Reload shell to use aliases: `source ~/.bashrc`

## Claude Code CLI

### Authentication Setup

Claude Code CLI requires authentication with an Anthropic API key.

**Step 1: Get Your API Key**
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Navigate to Settings > API Keys
3. Create a new API key (starts with `sk-ant-`)

**Step 2: Configure API Key in DevContainer**

Add to `.devcontainer/devcontainer.json`:
```json
{
  "containerEnv": {
    "ANTHROPIC_API_KEY": "${localEnv:ANTHROPIC_API_KEY}"
  }
}
```

Then set on your host machine:
```bash
# Mac/Linux
echo 'export ANTHROPIC_API_KEY="sk-ant-api03-..."' >> ~/.zshrc  # or ~/.bashrc
source ~/.zshrc

# Windows (PowerShell)
[System.Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', 'sk-ant-api03-...', 'User')
```

**Step 3: Rebuild Container**
```bash
# In VS Code:
# Cmd+Shift+P > "Dev Containers: Rebuild Container"
```

### Using Claude Code

```bash
# Start interactive session
claude

# Get help
claude --help

# Check version
claude --version

# Use specific model
claude --model claude-opus-4-20250514

# Quick commands
claude "Review the authentication code"
claude "Add tests for UserService"
claude "Explain the project structure"
```

### Configuration Template

See `.devcontainer/claude-config.template` for:
- Authentication options
- Model selection
- Environment variables
- Security best practices
- Troubleshooting tips

### Testing Claude CLI

```bash
# Verify installation (no API call)
claude --help

# Test API connectivity (uses tokens)
claude "Say hello"
```

### Security Notes

- **Never commit API keys** to version control
- Store keys in environment variables or host machine config
- Rotate keys regularly (recommended: every 90 days)
- Use separate keys for dev/staging/production
- Configuration stored in: `/home/vscode/.config/claude/`

## Troubleshooting

### Container fails to build

**Issue**: Docker build errors or timeouts

**Solutions**:
```bash
# 1. Check Docker is running
docker ps

# 2. Increase Docker resources (Docker Desktop > Settings > Resources)
#    Recommended: 4 CPUs, 8GB RAM, 2GB swap

# 3. Clean Docker cache
docker system prune -a --volumes

# 4. Rebuild container without cache
# In VS Code: Cmd+Shift+P > "Dev Containers: Rebuild Container Without Cache"
```

### Gradle build fails

**Issue**: "Could not resolve dependencies" or permission errors

**Solutions**:
```bash
# 1. Clean Gradle cache
./gradlew clean --no-daemon

# 2. Clear Gradle cache in container
rm -rf ~/.gradle/caches
rm -rf ~/.gradle/wrapper

# 3. Rebuild with fresh dependencies
./gradlew build --refresh-dependencies
```

### Git "dubious ownership" errors

**Issue**: Git complains about workspace ownership

**Solution**:
```bash
# Add workspace to Git safe directories
git config --global --add safe.directory /workspace

# Or run post-create script manually
bash .devcontainer/post-create.sh
```

### Port 8080 already in use

**Issue**: Cannot bind to port 8080

**Solutions**:
```bash
# 1. Check what's using the port on host
lsof -i :8080  # Mac/Linux
netstat -ano | findstr :8080  # Windows

# 2. Stop conflicting process or change port in application.conf

# 3. Use different port
# Edit src/main/resources/application.conf:
#   ktor.deployment.port = 8081
```

### VS Code extensions not loading

**Issue**: Kotlin or Java extensions not working

**Solutions**:
```bash
# 1. Reload window
# Cmd+Shift+P > "Developer: Reload Window"

# 2. Reinstall extensions
# Cmd+Shift+P > "Dev Containers: Rebuild Container"

# 3. Check extension logs
# View > Output > Select extension from dropdown
```

### Slow build performance

**Issue**: Builds take longer than expected

**Optimizations**:
```bash
# 1. Use Gradle daemon (should be default)
./gradlew --status

# 2. Enable parallel builds (already configured)
# Check gradle.properties:
#   org.gradle.parallel=true

# 3. Increase container resources
# Docker Desktop > Settings > Resources > Increase CPUs/RAM

# 4. Use build cache
./gradlew build --build-cache

# 5. Check build status
./gradlew buildStatus
```

### Claude Code authentication errors

**Issue**: "Authentication failed" or "Invalid API key"

**Solutions**:
```bash
# 1. Verify API key is set in container
echo $ANTHROPIC_API_KEY
# Should start with 'sk-ant-'

# 2. Verify API key on host
# Mac/Linux:
echo $ANTHROPIC_API_KEY
# Windows PowerShell:
$env:ANTHROPIC_API_KEY

# 3. Rebuild container to pick up new environment
# Cmd+Shift+P > "Dev Containers: Rebuild Container"

# 4. Test with a simple command
claude --help  # Should work without API key
claude "Say hello"  # Requires valid API key
```

### Claude Code command not found

**Issue**: `bash: claude: command not found`

**Solutions**:
```bash
# 1. Verify installation
npm list -g @anthropic-ai/claude-code
which claude  # Should show /usr/local/bin/claude

# 2. Reinstall Claude Code CLI
npm install -g @anthropic-ai/claude-code@2.0.32

# 3. Rebuild container
# Cmd+Shift+P > "Dev Containers: Rebuild Container Without Cache"
```

### Claude Code rate limit errors

**Issue**: "Rate limit exceeded" or "429 Too Many Requests"

**Solutions**:
```bash
# 1. Check your usage in Anthropic Console
# https://console.anthropic.com/settings/usage

# 2. Wait for rate limit reset (usually 1 minute)

# 3. Consider upgrading your plan
# https://console.anthropic.com/settings/plans

# 4. Use a lower-cost model for development
claude --model claude-haiku-4-20250309
```

## Container Maintenance

### Rebuilding the Container

```bash
# In VS Code:
# 1. Cmd+Shift+P
# 2. "Dev Containers: Rebuild Container"

# Or rebuild without cache (full clean build):
# 1. Cmd+Shift+P
# 2. "Dev Containers: Rebuild Container Without Cache"
```

### Updating Dependencies

When project dependencies change:

```bash
# Rebuild container to get latest base image
# Cmd+Shift+P > "Dev Containers: Rebuild Container"

# Or refresh dependencies without rebuild
./gradlew build --refresh-dependencies
```

### Cleaning Up

```bash
# Remove unused volumes (frees disk space)
docker volume prune

# Remove unused images
docker image prune -a

# Clean everything (careful!)
docker system prune -a --volumes
```

## Advanced Configuration

### Customizing the Container

Edit `.devcontainer/devcontainer.json` to:
- Add VS Code extensions
- Modify VS Code settings
- Change environment variables
- Add lifecycle hooks

After changes, rebuild container:
```bash
# Cmd+Shift+P > "Dev Containers: Rebuild Container"
```

### Adding System Packages

Edit `.devcontainer/Dockerfile` to add packages:

```dockerfile
RUN apt-get update && apt-get install -y \
    your-package-here \
    && rm -rf /var/lib/apt/lists/*
```

Then rebuild container.

### SSH Key Forwarding

To use your host SSH keys for Git operations:

1. Ensure ssh-agent is running on host:
   ```bash
   ssh-add -l  # List keys
   ssh-add ~/.ssh/id_ed25519  # Add key if needed
   ```

2. VS Code automatically forwards agent to container

3. Verify in container:
   ```bash
   ssh-add -l  # Should show your keys
   ```

## Resource Limits

Current container limits:
- **CPU**: No hard limit (uses host resources)
- **Memory**: No hard limit (uses host resources)
- **Disk**: Limited by Docker Desktop settings

To add resource limits, edit `devcontainer.json`:

```json
{
  "runArgs": [
    "--cpus=4",
    "--memory=8g",
    "--pids-limit=200"
  ]
}
```

## Security Considerations

- Container runs as non-root user (`vscode`)
- Source code mounted from host (changes visible on both sides)
- Build caches in named volumes (isolated from host)
- No elevated privileges by default
- Git credentials forwarded via SSH agent (not copied to container)

**Note**: This is the base configuration. Security enhancements (firewall, resource limits, audit logging) will be added in SPI-944 through SPI-948.

## Related Documentation

- **Research**: `docs/research/devcontainer-claude-code-best-practices.md`
- **Architecture**: `docs/architecture/devcontainer-safety-architecture.md`
- **Project Fundamentals**: `docs/reference/project-fundamentals.md`

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review container logs: `docker logs <container-id>`
3. Rebuild container without cache
4. Consult DevContainer documentation

## Version History

- **v1.1** (SPI-943) - Claude Code CLI integration
  - Claude Code CLI v2.0.32 installed globally
  - Authentication via environment variables
  - Configuration template and documentation
  - Health check and verification scripts

- **v1.0** (SPI-942) - Base devcontainer configuration
  - Node.js 20 + JVM 21 dual runtime
  - VS Code extensions for Kotlin/Java development
  - Gradle build caching
  - Post-create initialization script
