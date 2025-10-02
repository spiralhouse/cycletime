# Versioning

## Overview

CycleTime uses Git.SemVersioning to automatically calculate semantic versions from git commit history. This eliminates manual version management and ensures consistent versioning based on conventional commits.

## How It Works

### Automatic Version Calculation

Git.SemVersioning analyzes your git history to determine the current version:

1. **Starts from last tag** (or 0.0.0 if no tags)
2. **Analyzes commits** since last version
3. **Applies version bumps** based on commit types
4. **Adds build metadata** for traceability

### No Version Files

Unlike traditional versioning:
- **No version in gradle.properties** - Calculated at build time
- **No version in package.json** - Not needed
- **No manual bumps** - Automatic from commits
- **No CHANGELOG updates** - Can be generated from commits

## Conventional Commits

### Commit Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Version Impact by Type

| Type | Version Change | When to Use |
|------|---------------|-------------|
| `feat` | Minor (0.X.0) | New feature added |
| `fix` | Patch (0.0.X) | Bug fix |
| `perf` | Patch (0.0.X) | Performance improvement |
| `docs` | No change | Documentation only |
| `style` | No change | Code style changes |
| `refactor` | No change | Code refactoring |
| `test` | No change | Test changes |
| `chore` | No change | Build/tool changes |
| `ci` | No change | CI configuration |

### Breaking Changes

Breaking changes trigger a major version bump (X.0.0):

```bash
# Using ! after type
git commit -m "feat!: redesign API"

# Using BREAKING CHANGE in body
git commit -m "feat: update authentication

BREAKING CHANGE: JWT tokens now required for all endpoints"
```

## Version Format

### Standard Version

```
MAJOR.MINOR.PATCH+BUILD_METADATA
```

Examples:
- `1.2.3` - Release version
- `1.2.3+sha.abc123d` - With build metadata
- `0.3.0+sha.def456e.20250823` - With SHA and date

### Pre-release Versions

Git.SemVersioning can add pre-release identifiers:
- `1.2.3-alpha.1` - Alpha release
- `1.2.3-beta.2` - Beta release
- `1.2.3-rc.1` - Release candidate

## Configuration

### Gradle Setup

In `build.gradle.kts`:

```kotlin
plugins {
    id("io.github.nefilim.gradle.semver-plugin") version "0.11.0"
}

gitSemVer {
    // Optional: Customize version format
    // tagPrefix = "v"  // Use "v" prefix for tags
    // initialVersion = "0.1.0"  // Starting version if no tags
}

version = gitSemVer.version
```

### Gradle Tasks

```bash
# Print current version
./gradlew printSemVersion

# Show version details
./gradlew printVersion

# Use in build
./gradlew build
# Automatically uses calculated version
```

## CI/CD Integration

### GitHub Actions

The CI/CD pipeline extracts the version:

```yaml
- name: Calculate version
  run: |
    version=$(./gradlew printSemVersion --quiet)
    echo "version=$version" >> $GITHUB_OUTPUT
```

### Container Tagging

Versions are used for container tags:
- Version tag: `ghcr.io/spiralhouse/cycletime:0.3.0`
- With metadata: `ghcr.io/spiralhouse/cycletime:0.3.0+sha.abc123`

## Examples

### Feature Development

```bash
# Start feature
git checkout -b feat/spi-123-new-feature

# Development commits (no version change)
git commit -m "chore: setup project structure"
git commit -m "test: add test fixtures"

# Feature commit (minor bump)
git commit -m "feat: implement new feature"

# Merge to main
# Version: 0.2.0 → 0.3.0
```

### Bug Fix

```bash
# Fix branch
git checkout -b fix/spi-456-bug

# Fix commit (patch bump)
git commit -m "fix: resolve null pointer exception"

# Merge to main
# Version: 0.3.0 → 0.3.1
```

### Breaking Change

```bash
# Major change
git checkout -b feat/spi-789-api-redesign

# Breaking change commit (major bump)
git commit -m "feat!: redesign API endpoints

BREAKING CHANGE: All v1 endpoints removed.
Users must migrate to v2 endpoints."

# Merge to main
# Version: 0.3.1 → 1.0.0
```

## Best Practices

### Commit Messages

1. **Be descriptive** - Future you will thank you
2. **Use correct type** - Affects version calculation
3. **Document breaking changes** - In commit body
4. **Reference issues** - `feat: add feature (SPI-123)`

### Version Strategy

1. **Start at 0.1.0** - For initial development
2. **1.0.0 = Stable** - First production release
3. **Breaking changes** - Only when necessary
4. **Patch frequently** - Fix bugs quickly

### Development Workflow

1. **Feature branches** - One feature per branch
2. **Conventional commits** - Always
3. **Squash merges** - Clean history (optional)
4. **No version branches** - Main is always ready

## Troubleshooting

### Version Not Changing

**Problem**: Commits don't change version

**Solution**: Use conventional commit types that trigger bumps:
```bash
# These change version
git commit -m "feat: ..."  # Minor
git commit -m "fix: ..."   # Patch

# These don't
git commit -m "docs: ..."  # No change
git commit -m "Updated feature"  # Not conventional
```

### Version Calculation Fails

**Problem**: `printSemVersion` errors

**Solution**: Ensure git history is available:
```bash
# In CI, fetch full history
git fetch --unshallow

# Or clone with history
git clone --no-single-branch
```

### Unexpected Version Jump

**Problem**: Version increased more than expected

**Solution**: Check for breaking change markers:
```bash
# Check recent commits
git log --oneline -10

# Look for ! or BREAKING CHANGE
```

## Migration from Manual Versioning

If migrating from manual version management:

1. **Tag current version** - `git tag v0.2.0`
2. **Remove version files** - No longer needed
3. **Update build** - Use `gitSemVer.version`
4. **Train team** - Conventional commits required

## Related Documentation

- [Release Process](release-process.md)
- [Container Tagging](container-tagging.md)
- [CI/CD Overview](overview.md)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)