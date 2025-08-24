# Release Process

## Overview

CycleTime CE uses Git.SemVersioning for automatic semantic versioning based on conventional commits, combined with a Continuous Delivery pipeline that makes every commit to main production-ready.

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

See [Container Tagging](container-tagging.md) for detailed tag management.

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
docker pull ghcr.io/spiralhouse/jcvd:0.2.9
docker tag ghcr.io/spiralhouse/jcvd:0.2.9 ghcr.io/spiralhouse/jcvd:staging
docker push ghcr.io/spiralhouse/jcvd:staging
```

### Production Environment

```bash
# Blue-green switch to previous version
kubectl set image deployment/jcvd jcvd=ghcr.io/spiralhouse/jcvd:0.2.9

# Or rollback deployment
kubectl rollout undo deployment/jcvd
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

- [CI/CD Overview](overview.md)
- [Container Tagging](container-tagging.md)
- [Environment Management](environments.md)
- [Versioning Details](versioning.md)