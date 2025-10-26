# CycleTime

*Context Management for Claude Code*

[![Build Status](https://github.com/spiralhouse/cycletime/actions/workflows/cicd.yml/badge.svg)](https://github.com/spiralhouse/cycletime/actions/workflows/cicd.yml)
[![codecov](https://codecov.io/gh/spiralhouse/cycletime/graph/badge.svg?token=8mTaC8tX64)](https://codecov.io/gh/spiralhouse/cycletime)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Kotlin](https://img.shields.io/badge/kotlin-2.0.21-7F52FF.svg?logo=kotlin)](https://kotlinlang.org/)
[![Gradle](https://img.shields.io/badge/gradle-9.1-02303A.svg?logo=gradle)](https://gradle.org/)

> [!WARNING]
> **Development Status**: CycleTime is currently under active development as we work towards our MVP release. While core functionality is operational, features and APIs may change. For detailed information about current capabilities and roadmap, see our [MVP Capability Summary](docs/MVP_CAPABILITY_SUMMARY.md).

CycleTime provides structured context management for Claude Code, solving the fundamental challenge of maintaining project continuity across sessions. It preserves your project state, tracks dependencies, and maintains decision history through an embedded H2 database accessible via MCP (Model Context Protocol), enabling you to resume work exactly where you left off.

## Key Capabilities

- **Cross-Session Continuity** - Resume work where you left off with preserved project context and decision history
- **Dependency Tracking** - Automatically maintain relationships between tasks, files, and project components
- **MCP Integration** - Native server implementation for direct Claude Code communication
- **Embedded H2 Database** - Fast, reliable storage with no external dependencies required
- **Structured Project Data** - Domain-driven models for projects, tasks, and workflows
- **Minimal Configuration** - Start with defaults, configure as needed

## Who Benefits

CycleTime is designed for developers using Claude Code who:
- Work on multi-file projects requiring context across sessions
- Need to track complex dependencies and decision rationale
- Want systematic project organization without manual documentation overhead
- Collaborate with Claude Code on long-running development efforts

## Prerequisites

- Docker (for running CycleTime)
- Java 21 or later (only for contributors building from source)

## Quick Start

### Running CycleTime

```bash
# Pull and run the latest version
docker pull ghcr.io/spiralhouse/cycletime:latest
docker run -p 8080:8080 ghcr.io/spiralhouse/cycletime:latest

# Server starts on http://localhost:8080
```

### Building from Source (Contributors)

For contributors who want to test changes locally:

```bash
# Clone repository
git clone https://github.com/spiralhouse/cycletime.git
cd cycletime

# Build and run with Gradle (requires Java 21+)
./gradlew run
```

### Claude Code Integration

**CycleTime extends Claude Code with persistent context management through MCP:**

When integrated with Claude Code, CycleTime enables:
- **Persistent Project Context** - Your project state survives between Claude Code sessions
- **Intelligent Task Recommendations** - Claude Code understands your project dependencies and suggests next steps
- **Structured Workflow Management** - Track issues, milestones, and decisions systematically
- **Automatic Context Recovery** - Resume conversations with full project awareness

Example interactions:
```
"What tasks are ready to work on?" - Returns unblocked tasks based on dependency graph
"Show me the project structure" - Displays current project hierarchy and relationships
"Create a new epic for authentication" - Structures work with proper issue tracking
```

See [Quick Start Guide](docs/getting-started/quick-start.md) for detailed MCP configuration steps.

### MCP Server Architecture

CycleTime implements the Model Context Protocol using the official Kotlin SDK v0.7.2:

**Server Configuration:**
- **Endpoint**: `http://localhost:8080/` (root path)
- **Transport**: SSE (Server-Sent Events) + JSON-RPC 2.0
- **Session**: Stateless per-request with database persistence
- **SDK**: Official Anthropic/JetBrains maintained implementation

**Configure in Claude Code MCP Settings:**

```json
{
  "servers": {
    "cycletime": {
      "url": "http://localhost:8080/",
      "transport": "sse"
    }
  }
}
```

**Benefits of Official SDK:**
- Automatic protocol updates (MCP spec evolution)
- First-class client compatibility
- Reduced maintenance burden
- Official support from Anthropic + JetBrains

## Dashboard REST API

CycleTime provides a REST API for retrieving project hierarchies and dashboard data with intelligent caching.

### Quick Start

Start the server:
```bash
./gradlew run
```

Access the dashboard API:
```bash
# List all projects with statistics
curl http://localhost:8080/api/v1/dashboard

# Get complete project hierarchy (Epic → Story → Subtask)
curl http://localhost:8080/api/v1/dashboard/projects/{projectId}

# Lazy-load story subtasks
curl http://localhost:8080/api/v1/dashboard/stories/{storyId}/subtasks
```

### Key Features

- **Complete Hierarchy**: Epic → Story → Subtask relationships with nested structure
- **Computed Statistics**: Issue counts, estimate totals, orphaned story detection
- **Intelligent Caching**: Multi-tier LRU cache (5min/3min TTLs based on data volatility)
- **Performance Optimized**: Batch loading eliminates N+1 query issues
- **Comprehensive Testing**: 92% integration test coverage (23/25 tests passing)

### Example Response

```json
{
  "project": { "id": "...", "name": "CycleTime", "issueCount": 142 },
  "epics": [
    {
      "issue": { "id": "...", "title": "Core Infrastructure", "type": "EPIC" },
      "children": [
        {
          "issue": { "id": "...", "title": "Implement caching", "type": "STORY" },
          "children": [
            { "issue": { "id": "...", "title": "Create cache interface", "type": "SUBTASK", "estimate": 3 } }
          ]
        }
      ]
    }
  ],
  "statistics": {
    "totalIssues": 142,
    "epicCount": 12,
    "storyCount": 48,
    "subtaskCount": 82,
    "totalEstimatePoints": 387
  }
}
```

### Documentation

- **[API Reference](docs/reference/api/dashboard-api.md)** - Complete endpoint documentation with examples
- **[Architecture Decision](docs/reference/adr/0007-dashboard-cache-implementation.md)** - Cache design and rationale

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

## Contributing

We welcome contributions. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

Contributors need Java 21+ installed for local development:

```bash
# Fork and clone your fork
git clone https://github.com/YOUR_USERNAME/cycletime.git
cd cycletime

# Create feature branch
git checkout -b feat/your-feature

# Run locally for testing
./gradlew run

# Run tests
./gradlew test

# Build project
./gradlew build
```

## Technology Stack

Built with modern JVM technologies for reliability and performance:

- **Kotlin 2.2** - Primary implementation language with coroutines support
- **Ktor 3.3** - Lightweight asynchronous web framework
- **Exposed ORM** - Type-safe SQL DSL and database abstraction
- **H2 Database** - Fast, embedded database with full SQL support
- **Gradle 9.1** - Build automation and dependency management
- **Docker** - Container deployment options
- **GitHub Actions** - Automated testing and deployment

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Resources

- [Documentation](https://github.com/spiralhouse/cycletime/tree/main/docs)
- [Issues](https://github.com/spiralhouse/cycletime/issues)
- [Discussions](https://github.com/spiralhouse/cycletime/discussions)
- [Releases](https://github.com/spiralhouse/cycletime/releases)
