# JCVD - Context Management for Claude Code

[![Build Status](https://github.com/spiralhouse/jcvd/actions/workflows/cicd.yml/badge.svg)](https://github.com/spiralhouse/jcvd/actions/workflows/cicd.yml)
[![codecov](https://codecov.io/gh/spiralhouse/jcvd/graph/badge.svg?token=Rz1p5Wx0O8)](https://codecov.io/gh/spiralhouse/jcvd)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Kotlin](https://img.shields.io/badge/kotlin-2.0.21-7F52FF.svg?logo=kotlin)](https://kotlinlang.org/)
[![Gradle](https://img.shields.io/badge/gradle-9.0-02303A.svg?logo=gradle)](https://gradle.org/)

JCVD provides structured context management for Claude Code sessions, enabling continuity across conversations and systematic project tracking. It maintains project state, tracks dependencies, and preserves decision history through an embedded database accessible via MCP (Model Context Protocol).

## Key Capabilities

- **Session Continuity** - Resume work where you left off with preserved project context and decision history
- **Dependency Tracking** - Automatically maintain relationships between tasks, files, and project components
- **MCP Integration** - Native server implementation for direct Claude Code communication
- **Embedded Database** - SQLite storage with no external dependencies required
- **Structured Project Data** - Domain-driven models for projects, tasks, and workflows
- **Minimal Configuration** - Start with defaults, configure as needed

## Who Benefits

JCVD is designed for developers using Claude Code who:
- Work on multi-file projects requiring context across sessions
- Need to track complex dependencies and decision rationale
- Want systematic project organization without manual documentation overhead
- Collaborate with Claude Code on long-running development efforts

## Quick Start

### Installation

```bash
# Clone repository
git clone https://github.com/spiralhouse/jcvd.git
cd jcvd

# Build and run (requires Java 21+)
./gradlew run

# Server starts on http://localhost:8080
```

### Docker Alternative

```bash
docker pull ghcr.io/spiralhouse/jcvd:latest
docker run -p 8080:8080 ghcr.io/spiralhouse/jcvd:latest
```

### Claude Code Integration

Once running, JCVD provides MCP endpoints that Claude Code can access to:
- Store and retrieve project context between sessions
- Track task dependencies and completion status
- Maintain a structured history of project decisions
- Query project state and relationships

See [Quick Start Guide](docs/getting-started/quick-start.md) for detailed integration steps.

## Documentation

### Getting Started
- [Installation Guide](docs/getting-started/installation.md)
- [Quick Start](docs/getting-started/quick-start.md)
- [Configuration](docs/getting-started/configuration.md)

### Development
- [Development Setup](docs/development/setup.md)
- [Project Structure](docs/development/project-structure.md)
- [Testing Strategy](docs/testing/strategy.md)
- [API Reference](docs/api/rest-endpoints.md)

### Architecture
- [System Architecture](docs/architecture/overview.md)
- [CI/CD Pipeline](docs/ci-cd/overview.md)
- [Performance Optimization](docs/performance/caching-strategy.md)

### Reference
- [Product Requirements](docs/reference/PRD.md)
- [Technical Design](docs/reference/technical-design/)
- [Known Limitations](docs/reference/limitations.md)

## Technology Stack

Built with modern JVM technologies for reliability and performance:

- **Kotlin 2.0** - Primary implementation language with coroutines support
- **Ktor 3.2** - Lightweight asynchronous web framework
- **Exposed ORM** - Type-safe SQL DSL and database abstraction
- **SQLite** - Zero-configuration embedded database
- **Gradle 9.0** - Build automation and dependency management
- **Docker** - Container deployment options
- **GitHub Actions** - Automated testing and deployment

## Contributing

We welcome contributions. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Fork and clone your fork
git clone https://github.com/YOUR_USERNAME/jcvd.git
cd jcvd

# Create feature branch
git checkout -b feat/your-feature

# Run tests
./gradlew test

# Build project
./gradlew build
```

## License

This project is licensed under the AGPL v3 License. See [LICENSE](LICENSE) for details.

## Resources

- [Documentation](https://github.com/spiralhouse/jcvd/tree/main/docs)
- [Issues](https://github.com/spiralhouse/jcvd/issues)
- [Discussions](https://github.com/spiralhouse/jcvd/discussions)
- [Releases](https://github.com/spiralhouse/jcvd/releases)