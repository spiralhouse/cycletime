---
title: "Container Tagging Specification"
type: reference
domain: [cicd, containers, docker]
description: "Container tagging strategy, tag types, manifest preservation, and registry specifications"
dependencies: []
related: [../../../concepts/cicd/cicd-pipeline-concept.md, environment-specifications.md, ../../../guides/cicd/troubleshooting-pipeline-failures.md]
keywords: [containers, docker, tagging, registry, reference, manifest, digest, buildx, imagetools]
last_updated: 2026-01-02
---


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
3. **SHA Tag**: `sha-<commit-hash>` (immutable for tracking)

Additional tags are created during environment promotion:

4. **Pre-Release Tag**: `pre-release` (added during staging promotion)
5. **Latest Tag**: `latest` (added during production promotion only)

### Tag Types

#### Development Tag (`dev`)
- **Purpose**: Continuous deployment to development environment
- **Mutability**: Overwrites on each main branch build
- **Created**: Automatically on every main branch build
- **Usage**: External CD system watches for changes

```bash
docker pull ghcr.io/spiralhouse/cycletime:dev
```

#### Version Tags
- **Purpose**: Specific version tracking
- **Format**: Semantic versioning (e.g., `1.2.3`, `0.3.0+sha.abc123`)
- **Created**: Automatically on every main branch build
- **Usage**: Staging deployments, rollbacks

```bash
docker pull ghcr.io/spiralhouse/cycletime:0.3.0
```

#### Pre-Release Tag (`pre-release`)
- **Purpose**: Most recent staging-validated release
- **Mutability**: Overwrites on each staging promotion
- **Created**: Only during staging promotion workflow
- **Usage**: Staging environment deployments

```bash
docker pull ghcr.io/spiralhouse/cycletime:pre-release
```

#### Latest Tag (`latest`)
- **Purpose**: Most recent production-validated release
- **Mutability**: Overwrites on each production promotion
- **Created**: Only during production promotion workflow
- **Usage**: Production deployments

```bash
docker pull ghcr.io/spiralhouse/cycletime:latest
```

#### SHA Tags
- **Purpose**: Immutable reference to specific commits
- **Format**: `sha-<7-char-hash>`
- **Created**: Automatically on every main branch build
- **Usage**: Debugging, audit trail

```bash
docker pull ghcr.io/spiralhouse/cycletime:sha-abc123d
```

## Environment Mapping

### Development Environment
- **Tags**: `dev` (mutable), `X.Y.Z` (immutable)
- **Updates**: Every push to main
- **Deployment**: Automatic via external CD
- **Promotion**: Automatic on successful CI/CD

### Staging Environment
- **Tags**: `staging` (mutable), `pre-release` (mutable), `X.Y.Z-staging-TIMESTAMP` (immutable)
- **Updates**: Manual promotion workflow
- **Deployment**: After dev validation
- **Promotion**: Manual approval required

### Production Environment
- **Tags**: `production` (mutable), `latest` (mutable), `X.Y.Z-production-TIMESTAMP` (immutable)
- **Updates**: Manual promotion workflow
- **Deployment**: Blue-green with rollback
- **Promotion**: Manual approval with justification required

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
# Latest development build (mutable)
docker pull ghcr.io/spiralhouse/cycletime:dev

# Specific version (immutable)
docker pull ghcr.io/spiralhouse/cycletime:0.3.0
```

### Staging Environment
```bash
# Latest staging-validated release (mutable)
docker pull ghcr.io/spiralhouse/cycletime:pre-release

# Current staging deployment (mutable)
docker pull ghcr.io/spiralhouse/cycletime:staging

# Specific staging deployment (immutable)
docker pull ghcr.io/spiralhouse/cycletime:0.3.0-staging-20241019-143052
```

### Production Environment
```bash
# Latest production release (mutable)
docker pull ghcr.io/spiralhouse/cycletime:latest

# Current production deployment (mutable)
docker pull ghcr.io/spiralhouse/cycletime:production

# Pin to specific version (immutable)
docker pull ghcr.io/spiralhouse/cycletime:0.2.0

# Specific production deployment (immutable)
docker pull ghcr.io/spiralhouse/cycletime:0.2.0-production-20241018-120000
```

### Debugging/Rollback
```bash
# Track specific commit (immutable)
docker pull ghcr.io/spiralhouse/cycletime:sha-abc123d
```

## Manifest Digest Preservation

### Why Registry-Side Tagging?

Container manifest digests (SHA256 hashes) are critical for:
- **Security validation**: Ensuring promoted images are identical to verified versions
- **Integrity verification**: Detecting tampering or corruption during promotion
- **Audit compliance**: Providing cryptographic proof of image provenance
- **Rollback safety**: Guaranteeing rollback images match original deployments

The promotion workflow validates that staging/production tags point to the exact same manifest as the version tag before allowing deployment.

### The Problem: Digest Reconstruction

The traditional `docker pull/tag/push` workflow **reconstructs manifests locally**, creating different digests even with identical image layers:

```bash
# BROKEN: This approach creates different digests
docker pull ghcr.io/spiralhouse/cycletime:0.6.2
docker tag ghcr.io/spiralhouse/cycletime:0.6.2 ghcr.io/spiralhouse/cycletime:staging
docker push ghcr.io/spiralhouse/cycletime:staging
```

**Why this fails**:
1. Docker downloads the manifest and layers from the registry
2. Tagging creates a new manifest locally with potentially different metadata ordering
3. Pushing uploads the new manifest with a new SHA256 digest
4. Validation fails because `staging` digest differs from `0.6.2` digest

**Real-world impact**: v0.6.1 and v0.6.2 production promotions were blocked until this was discovered and fixed.

### The Solution: buildx imagetools

`docker buildx imagetools create` performs **registry-side tag operations** without pulling image data:

```bash
# CORRECT: Preserves manifest digest
docker buildx imagetools create \
  --tag ghcr.io/spiralhouse/cycletime:staging \
  --tag ghcr.io/spiralhouse/cycletime:pre-release \
  --tag ghcr.io/spiralhouse/cycletime:0.6.2-staging-$(date +%Y%m%d-%H%M%S) \
  ghcr.io/spiralhouse/cycletime:0.6.2
```

**Benefits**:
- Original manifest digest preserved (all tags point to same SHA256)
- No image data transfer (faster promotions)
- Registry-side operation (no local storage required)
- Multiple tags created atomically

### Implementation in Promotion Workflow

The promotion workflow (`.github/workflows/promote.yml`) uses buildx imagetools for both staging and production promotions:

**Staging Promotion** (lines 356-376):
```yaml
- name: Promote to staging with registry-side tagging
  run: |
    docker buildx imagetools create \
      --tag ghcr.io/spiralhouse/cycletime:staging \
      --tag ghcr.io/spiralhouse/cycletime:pre-release \
      --tag ghcr.io/spiralhouse/cycletime:$staging_tag \
      ghcr.io/spiralhouse/cycletime:$version
```

**Production Promotion** (lines 529-545):
```yaml
- name: Promote to production with registry-side tagging
  run: |
    docker buildx imagetools create \
      --tag ghcr.io/spiralhouse/cycletime:production \
      --tag ghcr.io/spiralhouse/cycletime:latest \
      --tag ghcr.io/spiralhouse/cycletime:$production_tag \
      ghcr.io/spiralhouse/cycletime:$version
```

**Validation Logic** (lines 96-151):
```bash
# Get manifest digest using buildx imagetools
version_digest=$(docker buildx imagetools inspect ghcr.io/spiralhouse/cycletime:$version --raw \
  | sha256sum | cut -d' ' -f1)
staging_digest=$(docker buildx imagetools inspect ghcr.io/spiralhouse/cycletime:staging --raw \
  | sha256sum | cut -d' ' -f1)

# Verify digests match before promotion
if [[ "$version_digest" != "$staging_digest" ]]; then
  echo "Version digest mismatch with staging - potential tampering detected"
  exit 1
fi
```

### Design Guidelines

**Do**:
- Use `docker buildx imagetools create` for all registry retagging
- Validate manifest digests before and after promotion
- Document the requirement in workflow comments
- Use `--raw` flag with `sha256sum` for digest comparison

**Do Not**:
- Use `docker pull/tag/push` for promotion workflows requiring digest validation
- Assume image identity based on tag names alone
- Skip digest validation in production promotion paths

### Troubleshooting

For digest mismatch issues during promotion, see [Troubleshooting: Promotion Digest Mismatch](../../guides/cicd/troubleshooting-pipeline-failures.md#issue-5-promotion-digest-mismatch-spi-1297).

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

- All containers run as non-root user (`cycletime:cycletime`)
- Minimal Alpine Linux base image
- Only production JRE included (no build tools)
- Health checks included for container orchestration

## Related Documentation

- [CI/CD Overview](overview.md)
- [Environment Management](environments.md)
- [Release Process](release-process.md)
- [Versioning](versioning.md)