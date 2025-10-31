---
title: "Release Process Guide"
type: guide
domain: [cicd, operations, release]
description: "Step-by-step release process with automatic versioning, git-cliff release notes, and continuous delivery"
dependencies: [../../concepts/cicd/cicd-pipeline-concept.md]
related: [deployment-to-staging.md, production-deployment.md, ../../reference/cicd/container-tagging-spec.md, ../../examples/cicd/git-cliff-configuration-example.md, ./git-cliff-testing-guide.md]
keywords: [release, versioning, semver, deployment, guide, git-cliff, changelog, release-notes]
last_updated: 2025-10-31
---


## Overview

CycleTime uses Git.SemVersioning for automatic semantic versioning based on conventional commits, combined with a Continuous Delivery pipeline that validates every commit to main through automated quality gates (tests, static analysis, security scans) before deployment.

## Version Management

### Automatic Versioning

Versions are calculated automatically from git history using Git.SemVersioning:

- **No manual version bumps** - Version derived from commits
- **No version files to update** - Version calculated at build time
- **Semantic versioning** - Based on conventional commit types
- **Build metadata** - Includes commit SHA for traceability

### Commit Types → Version Impact

| Commit Type | Version Change | Example |
|-------------|---------------|---------|
| `feat:` | Minor (0.X.0) | `feat: add OAuth2 support` |
| `fix:` | Patch (0.0.X) | `fix: handle null responses` |
| `perf:` | Patch (0.0.X) | `perf: optimize queries` |
| `feat!:` or `BREAKING CHANGE:` | Major (X.0.0) | `feat!: redesign API` |
| `docs:`, `test:`, `chore:`, `style:` | No change | `docs: update README` |

## Continuous Delivery Pipeline

### Every Push to Main

1. **Version Calculation** - Git.SemVersioning determines version
2. **Build & Test** - Full test suite execution
3. **Container Build** - Multi-architecture Docker image
4. **Container Push** - Automatic push to GHCR
5. **Deployment Trigger** - External CD system deploys to dev

### No Manual Releases

- **No release branches** - Main is always releasable
- **No release PRs** - Every merge is a potential release
- **No manual version bumps** - Automatic from commits
- **No release approval** - Quality gates in PR review

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feat/spi-xxx-description

# Make changes with conventional commits
git commit -m "feat: add new capability"
git commit -m "test: add unit tests"
git commit -m "docs: update API docs"
```

### 2. Pull Request

**Requirements:**
- ✅ All tests pass
- ✅ Conventional commit messages
- ✅ Code review approval
- ✅ No merge conflicts

### 3. Merge to Main

When PR is merged:

1. CI/CD pipeline runs automatically
2. Version calculated from commits
3. Container built with tags:
   - Version tag (e.g., `0.3.1`)
   - `dev` tag (for dev environment)
   - `latest` (if release version)
   - SHA tag for tracking

### 4. Automatic Deployment

- **Development**: Immediate deployment using `dev` tag
- **Staging**: Manual promotion using version tag
- **Production**: Manual approval using `latest` or pinned version

## Container Tagging Strategy

See [Container Tagging](../../ci-cd/container-tagging.md) for detailed tag management.

### Environment Mapping

| Environment | Container Tag | Deployment |
|------------|--------------|------------|
| Development | `dev` | Automatic on push |
| Staging | Version (e.g., `0.3.1`) | Manual promotion |
| Production | `latest` or pinned | Manual approval |

## Version Calculation Examples

### Patch Release (0.0.X)

```bash
git commit -m "fix: resolve connection timeout"
# Version: 0.2.1 → 0.2.2
```

### Minor Release (0.X.0)

```bash
git commit -m "feat: add batch processing"
# Version: 0.2.2 → 0.3.0
```

### Major Release (X.0.0)

```bash
git commit -m "feat!: redesign API endpoints

BREAKING CHANGE: All v1 endpoints removed"
# Version: 0.3.0 → 1.0.0
```

### No Version Change

```bash
git commit -m "docs: update installation guide"
git commit -m "chore: update dependencies"
# Version stays the same, only build metadata changes
```

## Release Notes Generation with git-cliff

### Overview

CycleTime uses [git-cliff](https://git-cliff.org/) for automated, icon-based release note generation from conventional commits. Release notes are generated during the CI/CD release job and injected directly into GitHub Releases.

### Key Features

- **Icon-based categorization**: 12 commit type categories with visual hierarchy
- **Automatic linking**: PR numbers and Linear issues converted to clickable links
- **Dependency grouping**: `build(deps)` commits grouped and highlighted separately
- **Breaking change highlighting**: `feat!`/`fix!`/`BREAKING CHANGE` detection
- **Scope-based sub-grouping**: UI, Dashboard, MCP, API subsections

### Configuration

Release notes are configured in `cliff.toml` at repository root. The configuration defines:

- **Commit parsers**: Pattern matching for categorization
- **Icon mapping**: Visual indicators for each category
- **Postprocessors**: Link generation for PRs and Linear issues
- **Filtering rules**: Exclude chore/style commits

See [git-cliff Configuration Example](../../examples/cicd/git-cliff-configuration-example.md) for complete configuration reference.

### Commit Type Categories

| Icon | Category | Commit Type | Priority |
|------|----------|-------------|----------|
| 🚨 | BREAKING CHANGES | `feat!:`, `fix!:`, `BREAKING CHANGE:` | Highest |
| ✨ | Features | `feat:`, `feat(scope):` | High |
| 🐛 | Bug Fixes | `fix:`, `fix(scope):` | High |
| ⚡ | Performance | `perf:` | Medium |
| 🔒 | Security | `security:` | High |
| 📚 | Documentation | `docs:` | Medium |
| ♻️ | Refactoring | `refactor:` | Low |
| 🧪 | Testing | `test:` | Low |
| 📦 | Build/Dependencies | `build:`, `build(deps):` | Low |
| ⚙️ | CI/CD | `ci:` | Low |
| 📝 | Other | Unconventional commits | Lowest |

**Filtered Out** (never shown): `chore:`, `style:`

### CI/CD Integration

The GitHub Actions release workflow (`.github/workflows/cicd.yml`) automatically:

1. **Generates changelog** with `git-cliff-action@v4`
2. **Captures output** to `GITHUB_OUTPUT` (multiline heredoc)
3. **Deletes temporary file** (capture-cleanup-verify pattern)
4. **Verifies no file remains** (safety net)
5. **Injects into GitHub Release** body

**Critical Safety**: CHANGELOG.md is NEVER committed to git. It exists only temporarily during release job execution.

**Workflow Steps**:
```yaml
# Generate changelog
- name: Generate changelog with git-cliff
  uses: orhun/git-cliff-action@v4
  with:
    config: cliff.toml
    args: --verbose --latest --strip header
  env:
    OUTPUT: CHANGELOG.md  # Temporary file only

# Capture and cleanup
- name: Capture changelog for release
  run: |
    cat CHANGELOG.md >> $GITHUB_OUTPUT
    rm CHANGELOG.md  # Delete immediately
```

### Testing Configuration

**Before modifying cliff.toml**, run local validation:

```bash
# Test current configuration
git-cliff --config cliff.toml --latest --strip header

# Verify links generated
git-cliff --config cliff.toml --latest --strip header | grep -E "\[#[0-9]+\]|\[SPI-[0-9]+\]"

# Check performance
time git-cliff --config cliff.toml --latest --strip header > /dev/null
# Expected: < 1 second (actual: 68ms in testing)
```

See [git-cliff Testing Guide](./git-cliff-testing-guide.md) for comprehensive validation procedures.

### Before/After Comparison

**Before git-cliff** (basic changelog):
```markdown
## What's Changed
- feat(ui): Implement hierarchical issue list (#171)
- fix(mcp): Resolve HTTP 406 error (#152)
- build(deps): Bump kotest from 6.0.3 to 6.0.4 (#162)

Full Changelog: https://github.com/spiralhouse/cycletime/compare/v0.2.0...v0.3.0
```

**After git-cliff** (formatted release notes):
```markdown
## [0.3.0] - 2025-10-31

### ✨ User Interface
- **ui**: Implement hierarchical issue list mockup with HTMX expansion ([SPI-838]) ([#171])

### 🐛 Bug Fixes - MCP
- **mcp**: Resolve HTTP 406 error on GET /mcp SSE endpoint ([SPI-766]) ([#152])

### 📦 Dependencies
- **deps**: Bump kotest from 6.0.3 to 6.0.4 ([#162])

<!-- generated by git-cliff -->
```

**Improvements**:
- ✅ Categorized by type with visual hierarchy
- ✅ Scope-based sub-grouping (UI, MCP, Dashboard)
- ✅ PR and Linear issue links
- ✅ Breaking changes highlighted first
- ✅ Dependencies in separate section
- ✅ Professional formatting

### Customization

To modify categorization:

1. **Edit cliff.toml** commit_parsers section
2. **Test locally**: `git-cliff --config cliff.toml --latest`
3. **Commit changes**: `git commit -m "chore: update git-cliff configuration"`
4. **Next release** will use updated configuration

**Common Customizations**:

**Add new scope group**:
```toml
[[commit_parsers]]
message = "^feat\\(graphql\\)"
group = "✨ GraphQL API"

# Must appear BEFORE generic feature parser
[[commit_parsers]]
message = "^feat"
group = "✨ Features"
```

**Change icon**:
```toml
[[commit_parsers]]
message = "^feat"
group = "🎉 New Features"  # Changed from ✨
```

**Filter additional type**:
```toml
[[commit_parsers]]
message = "^ci"
skip = true
```

See [configuration example](../../examples/cicd/git-cliff-configuration-example.md) for more customization scenarios.

### Performance

**Measured Performance** (SPI-870 testing):
- Execution time: 68 milliseconds
- Target: < 10 seconds
- Achievement: 147x faster than target
- CI/CD impact: Negligible (< 0.1 second overhead)

### References

- [git-cliff Documentation](https://git-cliff.org/)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [git-cliff Configuration Example](../../examples/cicd/git-cliff-configuration-example.md)
- [git-cliff Testing Guide](./git-cliff-testing-guide.md)

## Rollback Procedures

### Development Environment

```bash
# Automatic rollback on health check failure
# Or redeploy previous commit
git revert HEAD && git push
```

### Staging Environment

```bash
# Deploy specific previous version
docker pull ghcr.io/spiralhouse/cycletime:0.2.9
docker tag ghcr.io/spiralhouse/cycletime:0.2.9 ghcr.io/spiralhouse/cycletime:staging
docker push ghcr.io/spiralhouse/cycletime:staging
```

### Production Environment

```bash
# Blue-green switch to previous version
kubectl set image deployment/cycletime cycletime=ghcr.io/spiralhouse/cycletime:0.2.9

# Or rollback deployment
kubectl rollout undo deployment/cycletime
```

## Hotfix Process

For critical production issues:

```bash
# Create hotfix branch from main
git checkout -b hotfix/critical-security-issue

# Apply fix with conventional commit
git commit -m "fix: patch security vulnerability"

# Fast-track PR review and merge
# CD pipeline automatically deploys fix
```

## Configuration

### Git.SemVersioning Plugin

Configured in `build.gradle.kts`:

```kotlin
gitSemVer {
    // Version calculation from git history
    // No manual configuration needed
}
```

### Gradle Task

```bash
# Print current version
./gradlew printSemVersion

# Version used in builds
./gradlew build
# Uses version automatically
```

## Monitoring Releases

### Version Tracking

- Container labels include version
- Git tags for each build (optional)
- SHA tags for commit tracking

### Deployment Status

- GitHub Actions: Build status
- Container Registry: Available versions
- External CD: Deployment status

## Troubleshooting

### Version Not Incrementing

**Issue**: Version stays the same after merge

**Solution**: Ensure commits use conventional format:
```bash
# Valid commit types that change version
git commit -m "feat: new feature"  # Minor bump
git commit -m "fix: bug fix"        # Patch bump
```

### Wrong Version Calculated

**Issue**: Version jumped unexpectedly

**Solution**: Check for breaking change markers:
```bash
# These trigger major version bump
git commit -m "feat!: breaking change"
git commit -m "feat: change

BREAKING CHANGE: description"
```

### Build Can't Calculate Version

**Issue**: `printSemVersion` fails

**Solution**: Ensure git history is available:
```bash
# CI needs full history
git fetch --unshallow

# Or clone with full history
git clone --no-single-branch
```

## Best Practices

1. **Use Conventional Commits** - Ensures proper versioning
2. **Small, Focused PRs** - Easier to review and release
3. **Test in Dev First** - Automatic deployment catches issues
4. **Monitor Dev Environment** - First line of defense
5. **Document Breaking Changes** - In commit messages

## Related Documentation

- [CI/CD Overview](../../ci-cd/overview.md)
- [Container Tagging](../../ci-cd/container-tagging.md)
- [Environment Management](../../ci-cd/environments.md)
- [Versioning Details](../../ci-cd/versioning.md)# Versioning

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

- [Release Process](../../ci-cd/release-process.md)
- [Container Tagging](../../ci-cd/container-tagging.md)
- [CI/CD Overview](../../ci-cd/overview.md)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)