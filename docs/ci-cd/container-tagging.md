# Container Tagging Strategy

This document describes the container tagging strategy used in the Continuous Delivery pipeline.

## Overview

CycleTime uses Git.SemVersioning for automatic version management and a multi-tag strategy for container images to support different deployment environments.

## Registry

- **Registry**: `ghcr.io/spiralhouse/cycletime`
- **Visibility**: Public
- **Deployment**: Automatic on push to main branch

## Tagging Strategy

### Main Branch Builds (Every Push)

The container tagging strategy serves multiple deployment workflows by creating different tag types for each build. Every push to the main branch triggers container builds that generate semantic version tags for releases, mutable tags for environment tracking, and immutable tags for audit trails.

All pushes to the main branch create the following tags:

1. **Version Tag**: `X.Y.Z` (semantic version from Git.SemVersioning)
2. **Dev Tag**: `dev` (mutable tag for development environment)
3. **Latest Tag**: `latest` (only for release versions without metadata)
4. **SHA Tag**: `sha-<commit-hash>` (immutable for tracking)

### Tag Types

#### Development Tag (`dev`)
- **Purpose**: Continuous deployment to development environment
- **Mutability**: Overwrites on each main branch build
- **Usage**: External CD system watches for changes

```bash
docker pull ghcr.io/spiralhouse/cycletime:dev
```

#### Version Tags
- **Purpose**: Specific version tracking
- **Format**: Semantic versioning (e.g., `1.2.3`, `0.3.0+sha.abc123`)
- **Usage**: Staging deployments, rollbacks

```bash
docker pull ghcr.io/spiralhouse/cycletime:0.3.0
```

#### Latest Tag
- **Purpose**: Most recent stable release
- **Condition**: Only applied to release versions (no build metadata)
- **Usage**: Production deployments

```bash
docker pull ghcr.io/spiralhouse/cycletime:latest
```

#### SHA Tags
- **Purpose**: Immutable reference to specific commits
- **Format**: `sha-<7-char-hash>`
- **Usage**: Debugging, audit trail

```bash
docker pull ghcr.io/spiralhouse/cycletime:sha-abc123d
```

## Environment Mapping

### Development Environment
- **Tag**: `dev` (mutable)
- **Updates**: Every push to main
- **Deployment**: Automatic via external CD

### Staging Environment  
- **Tag**: Specific version (e.g., `0.3.0`)
- **Updates**: Manual promotion
- **Deployment**: After dev validation

### Production Environment
- **Tag**: `latest` or pinned version
- **Updates**: Manual approval required
- **Deployment**: Blue-green with rollback

## Build Arguments

The container accepts the following build arguments:

- `VERSION`: Semantic version from Git.SemVersioning

This version is used for:
- Container labels (OCI metadata)
- Environment variable `CycleTime_VERSION`
- Container registry tags

## Container Labels

All containers include OpenContainer Initiative (OCI) compliant labels:

```dockerfile
LABEL org.opencontainers.image.title="CycleTime Server"
LABEL org.opencontainers.image.description="CycleTime project orchestration framework MCP server"
LABEL org.opencontainers.image.version="$VERSION"
LABEL org.opencontainers.image.vendor="Spiral House"
LABEL org.opencontainers.image.source="https://github.com/spiralhouse/cycletime"
```

## Container Labels

Additional deployment metadata is included in container labels:

```dockerfile
LABEL deployment.environment="dev"
LABEL deployment.version="$VERSION"
LABEL deployment.commit="$GITHUB_SHA"
LABEL deployment.branch="$GITHUB_REF_NAME"
LABEL deployment.build-timestamp="$GITHUB_RUN_ID"
```

## Pull Commands

### Development Environment
```bash
# Latest development build
docker pull ghcr.io/spiralhouse/cycletime:dev
```

### Staging Environment
```bash
# Specific version for staging
docker pull ghcr.io/spiralhouse/cycletime:0.3.0
```

### Production Environment
```bash
# Latest stable release
docker pull ghcr.io/spiralhouse/cycletime:latest

# Or pin to specific version
docker pull ghcr.io/spiralhouse/cycletime:0.2.0
```

### Debugging/Rollback
```bash
# Track specific commit
docker pull ghcr.io/spiralhouse/cycletime:sha-abc123d
```

## Caching Strategy

The build process uses GitHub Actions cache for:
- **BuildKit cache**: Multi-layer Docker build cache
- **Layer caching**: Efficient rebuilds when only source changes
- **Artifact reuse**: JAR files from build job

This results in:
- Faster builds on subsequent runs
- Reduced registry bandwidth
- Consistent layer sharing across tags

## Version Management

Versions are automatically calculated using Git.SemVersioning based on conventional commits:

- `feat:` → Minor version bump (0.X.0)
- `fix:` → Patch version bump (0.0.X)
- `BREAKING CHANGE:` or `feat!:` → Major version bump (X.0.0)
- Other commits → No version change

See [Versioning](versioning.md) for detailed information.

## Security Notes

- All containers run as non-root user (`jcvd:jcvd`)
- Minimal Alpine Linux base image
- Only production JRE included (no build tools)
- Health checks included for container orchestration

## Related Documentation

- [CI/CD Overview](overview.md)
- [Environment Management](environments.md)
- [Release Process](release-process.md)
- [Versioning](versioning.md)