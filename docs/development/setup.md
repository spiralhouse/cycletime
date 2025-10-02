# Development Setup

## Prerequisites

- Java 21+
- Gradle 9.1+ (included via wrapper)
- Docker (optional)
- IDE: IntelliJ IDEA or VS Code

## Initial Setup

```bash
# Clone repository
git clone https://github.com/spiralhouse/cycletime.git
cd cycletime

# Make gradlew executable
chmod +x gradlew

# One-time development environment setup
./gradlew devSetup

# Verify setup
./gradlew devStatus
```

## Development Workflows

### Hot-Reload Development Server

Development server with automatic restart:

```bash
# Start server with automatic restart on code changes
./gradlew devRun --continuous

# Features:
# - Automatic server restart on source changes
# - Separate development database (cycletime-dev.mv.db)
# - Enhanced logging and debugging
# - Development JVM settings
```

### Continuous Testing

Automatically run tests when code changes:

```bash
# Watch for changes and run unit tests automatically
./gradlew testWatch --continuous

# Features:
# - Fast unit tests only (< 5 seconds)
# - Feedback on test failures
# - Automatic re-run on source or test changes
```

### Build Watcher

Continuous compilation:

```bash
# Continuous compilation without running tests
./gradlew devBuild --continuous

# Features:
# - Incremental compilation
# - Build cache optimization
# - Error reporting without running the server
```

## Multiple Terminal Workflow

For development with multiple terminals:

**Terminal 1: Server with hot-reload**
```bash
./gradlew devRun --continuous
```

**Terminal 2: Continuous testing**
```bash
./gradlew testWatch --continuous  
```

**Terminal 3: Build monitoring**
```bash
./gradlew devBuild --continuous
```

## Development Tasks Reference

CycleTime provides specialized Gradle tasks optimized for different development scenarios. These tasks streamline common workflows by combining multiple operations and providing continuous feedback during development.

| Task | Description | Best For |
|------|-------------|----------|
| `devRun --continuous` | Hot-reload server | Primary development |
| `testWatch --continuous` | Automatic testing | TDD workflow |
| `devBuild --continuous` | Build watching | Build monitoring |
| `devWorkflow` | Show all commands | Getting started |
| `devSetup` | Setup environment | First-time setup |
| `devStatus` | Environment health | Troubleshooting |
| `quickTest` | Unit tests only (< 30s execution) | Rapid feedback during development |

## IDE Integration

### IntelliJ IDEA

1. Import as Gradle project
2. Enable continuous build: View → Tool Windows → Gradle → 🔄 button
3. Set run configuration:
   - Main class: `io.spiralhouse.cycletime.ApplicationKt`
   - VM options: `-Dio.ktor.development=true`
   - Environment variables: `KTOR_DEVELOPMENT=true`

### VS Code

1. Install Kotlin extension
2. Use tasks.json for development:
```json
{
  "label": "Dev Server",
  "type": "shell", 
  "command": "./gradlew devRun --continuous",
  "group": "build",
  "isBackground": true
}
```

## Docker Development

### Quick Start

```bash
# Start full development stack
docker-compose -f docker-compose.dev.yml up

# Services available:
# • CycleTime Server: http://localhost:8080
# • Health Check: http://localhost:8080/health  
```

### Features

- **Volume Mounts**: Source code changes reflected instantly
- **Build Cache**: Gradle cache persisted between container restarts
- **Development Database**: Isolated from production data
- **Hot-Reload**: Automatic server restart on file changes

## Troubleshooting

### Port Conflicts

```bash
# Check if port 8080 is in use
lsof -i :8080

# Use different port
PORT=3000 ./gradlew devRun --continuous
```

### Hot-Reload Not Working

```bash
# Check development status
./gradlew devStatus

# Clear build cache if needed
./gradlew clean devRun --continuous
```

### Docker Issues

```bash
# Reset Docker development environment
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build
```

## Performance Tips

### Memory Settings

Development JVM is optimized for quick startup:

```bash
# Automatic optimization in devRun task
JAVA_OPTS="-Xmx1024m -XX:+UseG1GC -XX:+UseStringDeduplication"
```

### Build Optimization

- **Incremental Compilation**: Only changed files recompiled
- **Build Cache**: Task outputs cached locally and in CI
- **Parallel Execution**: Multi-core build utilization
- **Configuration Cache**: Faster startup times

## Related Documentation

- [Project Structure](project-structure.md)
- [Repository Usage](repository-usage.md)
- [Testing Strategy](../testing/strategy.md)
- [Coding Standards](coding-standards.md)