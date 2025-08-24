# JCVD - Project Orchestration Framework

[![Build Status](https://github.com/spiralhouse/jcvd/actions/workflows/cicd.yml/badge.svg)](https://github.com/spiralhouse/jcvd/actions/workflows/cicd.yml)
[![codecov](https://codecov.io/gh/spiralhouse/jcvd/graph/badge.svg?token=Rz1p5Wx0O8)](https://codecov.io/gh/spiralhouse/jcvd)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Kotlin](https://img.shields.io/badge/kotlin-2.0.21-7F52FF.svg?logo=kotlin)](https://kotlinlang.org/)
[![Gradle](https://img.shields.io/badge/gradle-9.0-02303A.svg?logo=gradle)](https://gradle.org/)

JCVD is a project orchestration framework that extends Claude Code to manage complete software development lifecycles with minimal configuration overhead. Built with Kotlin and Domain-Driven Design, it provides structured project data, dependency tracking, and cross-session continuity.

## ✨ Key Features

- **Project Orchestration** - Manage complex software projects with automated workflows
- **Claude Code Integration** - Native MCP server for seamless AI assistant integration
- **Cross-Session Continuity** - Maintain context across development sessions
- **Domain-Driven Design** - Clean architecture with rich domain models
- **High Performance** - 97% faster builds with Gradle 9.0 and optimizations
- **Production Ready** - Docker containerization, health monitoring, CI/CD pipeline

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/spiralhouse/jcvd.git
cd jcvd

# Build and run (requires Java 21+)
./gradlew run

# Verify installation
curl http://localhost:8080/health
```

**Using Docker:**
```bash
docker pull ghcr.io/spiralhouse/jcvd:latest
docker run -p 8080:8080 ghcr.io/spiralhouse/jcvd:latest
```

## 📚 Documentation

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
- [Performance](docs/performance/caching-strategy.md)

### Reference
- [Product Requirements](docs/reference/PRD.md)
- [Technical Design](docs/reference/technical-design/)
- [Known Limitations](docs/reference/limitations.md)

## 🛠️ Technology Stack

- **Kotlin 2.0** with Coroutines
- **Ktor 3.2** - Asynchronous web framework
- **Exposed ORM** - Type-safe SQL
- **SQLite** - Embedded database
- **Gradle 9.0** - Build system
- **Docker** - Containerization
- **GitHub Actions** - CI/CD

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Setup for Contributors

```bash
# Fork and clone your fork
git clone https://github.com/YOUR_USERNAME/jcvd.git
cd jcvd

# Create feature branch
git checkout -b feat/your-feature

# Setup development environment
./gradlew devSetup

# Start development with hot-reload
./gradlew devRun --continuous
```

## 📄 License

This project is licensed under the AGPL v3 License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- [Documentation](https://github.com/spiralhouse/jcvd/tree/main/docs)
- [Issues](https://github.com/spiralhouse/jcvd/issues)
- [Discussions](https://github.com/spiralhouse/jcvd/discussions)
- [Releases](https://github.com/spiralhouse/jcvd/releases)