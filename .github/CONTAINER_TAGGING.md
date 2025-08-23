# Container Tagging Strategy

This document describes the container tagging strategy implemented in the Continuous Delivery pipeline.

## Registry

- **Registry**: `ghcr.io/spiralhouse/jcvd`
- **Visibility**: Public (for now)

## Tagging Rules

### Release Builds (from main branch, version without SNAPSHOT or build metadata)

1. **Version Tag**: `X.Y.Z` (exact semantic version)
2. **Latest Tag**: `latest` (always points to most recent release)
3. **SHA Tag**: `sha-<commit-hash>` (for debugging and tracking)

**Example Release Tags:**
```
ghcr.io/spiralhouse/jcvd:1.2.3
ghcr.io/spiralhouse/jcvd:latest
ghcr.io/spiralhouse/jcvd:sha-abc123def456
```

### Development Builds (SNAPSHOT versions or builds with metadata)

1. **Snapshot Tag**: `X.Y.Z-SNAPSHOT-snapshot` (development version)
2. **SHA Tag**: `sha-<commit-hash>` (for debugging and tracking)
3. **No latest tag**: Development builds don't update `latest`

**Example Development Tags:**
```
ghcr.io/spiralhouse/jcvd:1.3.0-SNAPSHOT-snapshot
ghcr.io/spiralhouse/jcvd:sha-def456ghi789
```

## Build Arguments

The container accepts the following build arguments:

- `VERSION`: Semantic version string (e.g., "1.2.3", "1.3.0-SNAPSHOT")

This version is used for:
- Container labels (OCI metadata)
- Environment variable `JCVD_VERSION`
- Container registry tags

## Container Labels

All containers include OpenContainer Initiative (OCI) compliant labels:

```dockerfile
LABEL org.opencontainers.image.title="JCVD Server"
LABEL org.opencontainers.image.description="JCVD project orchestration framework MCP server"
LABEL org.opencontainers.image.version="$VERSION"
LABEL org.opencontainers.image.vendor="Spiral House"
LABEL org.opencontainers.image.source="https://github.com/spiralhouse/jcvd"
```

## Pull Commands

### For Production Use
```bash
# Always use latest stable release
docker pull ghcr.io/spiralhouse/jcvd:latest

# Or pin to specific version
docker pull ghcr.io/spiralhouse/jcvd:1.2.3
```

### For Development/Testing
```bash
# Use development snapshot
docker pull ghcr.io/spiralhouse/jcvd:1.3.0-SNAPSHOT-snapshot

# Or track specific commit
docker pull ghcr.io/spiralhouse/jcvd:sha-abc123def456
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

## Security Notes

- All containers run as non-root user (`jcvd:jcvd`)
- Minimal Alpine Linux base image
- Only production JRE included (no build tools)
- Health checks included for container orchestration