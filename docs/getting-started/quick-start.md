# Quick Start Guide

Get CycleTime up and running in under 5 minutes.

## 1. Prerequisites

Ensure you have Java 21+ installed. See [Installation Guide](installation.md) for details.

## 2. Clone and Build

```bash
# Clone repository
git clone https://github.com/spiralhouse/cycletime.git
cd cycletime

# Build project
./gradlew build
```

## 3. Run the Server

```bash
# Start the server
./gradlew run

# Server starts at http://localhost:8080
```

## 4. Verify Installation

```bash
# Check health endpoint
curl http://localhost:8080/health

# Expected response:
{
  "status": "healthy",
  "service": "cycletime",
  "version": "0.1.0"
}
```

## 5. Using Docker (Alternative)

```bash
# Build and run with Docker
docker build -t cycletime .
docker run -p 8080:8080 cycletime
```

## What's Next?

- [Configuration Options](configuration.md)
- [API Documentation](../api/rest-endpoints.md)
- [Development Guide](../development/setup.md)
- [Testing Guide](../testing/strategy.md)