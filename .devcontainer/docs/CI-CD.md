# DevContainer CI/CD Integration Guide

Complete guide for integrating the CycleTime DevContainer with GitHub Actions CI/CD pipelines.

## Overview

The DevContainer CI/CD integration provides:
- **Environment Parity** - Identical build environment between local development and CI
- **Automated Testing** - Comprehensive test suite execution in containerized environment
- **Build Caching** - Intelligent caching for 60-70% faster builds
- **Security Scanning** - Automated vulnerability detection and compliance checks
- **Fast Feedback** - Separate PR workflow for quick validation

## CI/CD Workflows

### 1. DevContainer CI (Full Pipeline)

**File:** `.github/workflows/devcontainer-ci.yml`

**Triggers:**
- Push to main, develop, or devcontainer feature branch
- Pull requests to these branches
- Manual workflow dispatch

**Jobs:**
1. **devcontainer-build-and-test** - Build container and run comprehensive tests
2. **devcontainer-validate** - Validate configuration files
3. **devcontainer-security** - Security scanning with Trivy
4. **devcontainer-summary** - Generate comprehensive summary

**Duration:**
- First run: 18-28 minutes
- Cached run: 7-11 minutes
- Target: < 10 minutes with warm cache

### 2. DevContainer PR (Fast Feedback)

**File:** `.github/workflows/devcontainer-pr.yml`

**Triggers:**
- Pull request opened, synchronized, or reopened

**Jobs:**
1. **quick-check** - Validate configuration (< 5 min)
2. **fast-test** - Unit tests only for rapid feedback (< 20 min)
3. **size-check** - Monitor container image size
4. **pr-summary** - PR-specific summary with auto-comment

**Duration:**
- First run: 15-20 minutes
- Cached run: 8-12 minutes
- Target: < 10 minutes

## Architecture

### Build Flow

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions Runner                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  1. Checkout Code                                      │ │
│  │     ↓                                                   │ │
│  │  2. Setup Docker Buildx                                │ │
│  │     ↓                                                   │ │
│  │  3. Restore Caches (Docker layers, Gradle, npm)        │ │
│  │     ↓                                                   │ │
│  │  4. Build DevContainer Image                           │ │
│  │     └─→ Use devcontainers/ci@v0.3 action               │ │
│  │     ↓                                                   │ │
│  │  5. Run build-and-test.sh inside container             │ │
│  │     ├─→ Compile code                                   │ │
│  │     ├─→ Run unit tests                                 │ │
│  │     ├─→ Run integration tests                          │ │
│  │     ├─→ Run system tests                               │ │
│  │     ├─→ Generate coverage                              │ │
│  │     └─→ Build artifacts                                │ │
│  │     ↓                                                   │ │
│  │  6. Upload Artifacts & Reports                         │ │
│  │     ├─→ Test results (JUnit XML)                       │ │
│  │     ├─→ Coverage reports (Codecov)                     │ │
│  │     └─→ Build artifacts (JAR, distributions)           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Caching Strategy

```
┌──────────────────────┐
│  Docker Layer Cache  │  60-75% faster container builds
├──────────────────────┤
│  Gradle Dependencies │  80-90% faster dependency resolution
├──────────────────────┤
│  npm Packages        │  85-95% faster npm installs
├──────────────────────┤
│  Gradle Build Cache  │  70-85% faster compilation
└──────────────────────┘

Total Pipeline Improvement: 60-70% with warm cache
```

See [Cache Strategy](../ci/cache-strategy.md) for detailed documentation.

## Configuration

### Environment Variables

```yaml
env:
  # Cache version - increment to force cache rebuild
  DEVCONTAINER_CACHE_VERSION: "v1"

  # Gradle optimizations
  GRADLE_OPTS: "-Dorg.gradle.daemon=false -Dorg.gradle.parallel=true"
  JAVA_OPTS: "-Xmx2g -XX:MaxMetaspaceSize=512m"
```

### Secrets Required

| Secret | Purpose | Required |
|--------|---------|----------|
| `CODECOV_TOKEN` | Upload test coverage | Yes |
| `GITHUB_TOKEN` | Built-in Actions token | Auto-provided |

### Resource Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| CPU | 4 cores | Container limit |
| Memory | 8GB | Hard limit in devcontainer.json |
| Disk | 14GB | GitHub Actions runner default |
| Timeout | 45 minutes | Full CI workflow |
| Timeout (PR) | 20 minutes | Fast feedback workflow |

## Running Locally

### Prerequisites

- Docker Desktop with BuildKit enabled
- `act` (GitHub Actions local runner) - optional

### Run Full CI Workflow Locally

```bash
# Using act (if installed)
act -W .github/workflows/devcontainer-ci.yml

# Or build and test manually
docker buildx create --use
docker buildx build -f .devcontainer/Dockerfile -t cycletime-devcontainer .devcontainer
docker run --rm -v $(pwd):/workspace cycletime-devcontainer \
  bash .devcontainer/ci/build-and-test.sh
```

### Run PR Workflow Locally

```bash
# Fast validation only
act pull_request -W .github/workflows/devcontainer-pr.yml
```

### Manual DevContainer Build

```bash
# Build devcontainer image
cd .devcontainer
docker build -t cycletime-devcontainer:local .

# Run container interactively
docker run -it --rm \
  -v $(pwd)/..:/workspace \
  -v gradle-cache:/home/vscode/.gradle \
  -v npm-cache:/home/vscode/.npm \
  cycletime-devcontainer:local \
  bash

# Inside container, run build script
bash .devcontainer/ci/build-and-test.sh
```

## Test Execution

### Test Categories

The CI pipeline runs all test categories:

1. **Unit Tests** - Fast, isolated business logic tests
2. **Integration Tests** - Database and infrastructure integration
3. **System Tests** - End-to-end workflows and performance
4. **DevContainer Tests** - Container-specific validation (148 tests)

### Test Reports

Test results are uploaded as artifacts and available for 7 days:

```
Artifacts/
├── devcontainer-test-results/
│   ├── build/reports/tests/
│   │   ├── unitTest/
│   │   ├── integrationTest/
│   │   └── systemTest/
│   ├── build/test-results/
│   │   └── *.xml (JUnit format)
│   └── /tmp/devcontainer-test-report-*.txt
```

### Coverage Reporting

Coverage is automatically uploaded to Codecov:

```yaml
- name: Upload test coverage
  uses: codecov/codecov-action@v5
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./build/reports/kover/report.xml
    flags: devcontainer
```

## Build Artifacts

### Generated Artifacts

| Artifact | Location | Size | Retention |
|----------|----------|------|-----------|
| Application JAR | `build/libs/cycletime-server.jar` | ~50MB | 7 days |
| TAR distribution | `build/distributions/*.tar` | ~48MB | 7 days |
| ZIP distribution | `build/distributions/*.zip` | ~48MB | 7 days |
| Test reports | `build/reports/tests/` | ~2MB | 7 days |
| Coverage report | `build/reports/kover/report.xml` | ~500KB | 7 days |

### Downloading Artifacts

```bash
# Using GitHub CLI
gh run list --workflow=devcontainer-ci.yml
gh run download <run-id>

# Or via GitHub web interface
# Actions → Workflow Run → Artifacts section
```

## Monitoring and Debugging

### Viewing Logs

```bash
# List recent workflow runs
gh run list --workflow=devcontainer-ci.yml --limit 10

# View specific run logs
gh run view <run-id> --log

# Watch live run
gh run watch <run-id>
```

### Common Issues

#### 1. Container Build Timeout

**Symptom:** Build exceeds 45-minute timeout

**Solution:**
- Check for network issues downloading dependencies
- Verify cache is being restored properly
- Consider increasing timeout for first run

#### 2. Cache Not Restoring

**Symptom:** Build times not improving

**Solution:**
- Check cache key hash matches
- Verify cache wasn't evicted (7-day retention)
- Review cache size limit (10GB per repository)
- Increment `DEVCONTAINER_CACHE_VERSION`

#### 3. Test Failures in CI Only

**Symptom:** Tests pass locally but fail in CI

**Solution:**
- Check for environment-specific assumptions
- Verify resource limits not causing issues
- Review timing-dependent tests
- Check file system permissions

#### 4. Out of Disk Space

**Symptom:** Docker build fails with "no space left on device"

**Solution:**
- Clean up unused Docker images
- Optimize Dockerfile layer sizes
- Remove unnecessary build artifacts
- Use multi-stage builds

### Debug Mode

Enable debug logging in workflows:

```yaml
env:
  RUNNER_DEBUG: 1  # Enable runner debug logging
  ACTIONS_STEP_DEBUG: 1  # Enable step debug logging
```

## Security Considerations

### Vulnerability Scanning

Trivy scans the devcontainer for:
- Known CVEs in base images
- Configuration issues
- Security best practices violations

Results are uploaded to GitHub Security tab (SARIF format).

### Capability Management

Container runs with minimal capabilities:
```json
{
  "capDrop": ["ALL"],
  "capAdd": ["CHOWN", "SETUID", "SETGID", "NET_ADMIN"]
}
```

### Resource Limits

Enforced via cgroups to prevent resource exhaustion:
- CPU: 4 cores maximum
- Memory: 8GB hard limit
- PIDs: 200 processes maximum
- I/O: Rate-limited read/write

## Performance Optimization

### Build Time Targets

| Stage | Target | Actual (Cached) |
|-------|--------|-----------------|
| Container Build | < 3 min | 2-3 min |
| Dependency Resolution | < 1 min | 30-60s |
| Code Compilation | < 1 min | 30-45s |
| Test Execution | < 6 min | 4-6 min |
| **Total** | **< 10 min** | **7-11 min** |

### Optimization Checklist

- [ ] Docker layer caching enabled
- [ ] Gradle dependency cache configured
- [ ] npm cache configured
- [ ] Gradle build cache enabled
- [ ] Parallel test execution configured
- [ ] Incremental compilation enabled
- [ ] Cache keys properly versioned
- [ ] Restore keys configured for fallback

### Monitoring Cache Effectiveness

```bash
# Check cache hit rate
gh cache list | grep devcontainer

# Monitor build times
gh run list --workflow=devcontainer-ci.yml | \
  awk '{print $3}' | \
  grep -o '[0-9]*m' | \
  awk '{sum+=$1; count++} END {print "Average: " sum/count "m"}'
```

## Integration with Main CI Pipeline

### Relationship to cicd.yml

The devcontainer workflows run **in addition to** the main CI/CD pipeline:

- **Main CI** (`cicd.yml`) - Runs on bare GitHub Actions runners
- **DevContainer CI** - Runs in containerized environment
- Both must pass for merge to main

### When Each Runs

```
Pull Request Created
├─→ devcontainer-pr.yml (fast feedback)
├─→ cicd.yml (comprehensive validation)
└─→ devcontainer-ci.yml (containerized validation)

Merge to Main
├─→ cicd.yml (build, test, release)
└─→ devcontainer-ci.yml (containerized validation)
```

### Choosing Between Workflows

Use **DevContainer CI** when:
- Testing devcontainer-specific features
- Validating container configuration
- Ensuring local/CI environment parity
- Debugging container-related issues

Use **Main CI** for:
- Production releases
- Multi-platform builds (Windows, macOS, Linux)
- Matrix testing (multiple Java versions)
- Native GitHub Actions runner features

## Troubleshooting Guide

### Workflow Not Triggering

**Check:**
1. Path filters in workflow file
2. Branch protection rules
3. Workflow permissions
4. File paths match exactly

### Container Won't Build

**Check:**
1. Dockerfile syntax
2. Base image availability
3. Network connectivity
4. Resource limits

### Tests Failing

**Check:**
1. Environment variables
2. Resource constraints
3. File permissions
4. Network isolation

### Artifacts Not Uploading

**Check:**
1. Artifact path exists
2. File permissions
3. Artifact size limits
4. Retention policy

## Best Practices

### 1. Keep Dockerfile Optimized

```dockerfile
# Good: Maximize layer caching
FROM base-image
COPY package.json ./  # Changes less frequently
RUN npm install
COPY src ./           # Changes more frequently
RUN npm run build

# Bad: Invalidates cache unnecessarily
FROM base-image
COPY . ./             # Copies everything, invalidates often
RUN npm install && npm run build
```

### 2. Use Specific Cache Keys

```yaml
# Good: Specific hash-based keys
key: gradle-${{ hashFiles('**/*.gradle*', 'gradle/libs.versions.toml') }}

# Bad: Generic keys that rarely invalidate
key: gradle-cache
```

### 3. Monitor Cache Usage

```bash
# Regular cleanup of old caches
gh cache delete --all --older-than 7d
```

### 4. Version Cache Keys

```yaml
# Increment version to force rebuild
env:
  DEVCONTAINER_CACHE_VERSION: "v2"  # Changed from v1
```

## Future Enhancements

### Planned Improvements

1. **Remote Build Cache** - Gradle Enterprise integration for cross-runner sharing
2. **Incremental Testing** - Run only tests affected by changes
3. **Parallel Matrix Builds** - Test multiple configurations simultaneously
4. **Self-Hosted Runners** - Dedicated hardware for faster builds
5. **Build Analytics** - Detailed metrics and trend analysis

### Target Metrics (Future)

- Container build: < 1 minute
- Total pipeline: < 5 minutes
- Cache hit rate: > 95%

## References

- [devcontainers/ci GitHub Action](https://github.com/devcontainers/ci)
- [GitHub Actions Caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Docker BuildX Documentation](https://docs.docker.com/build/buildx/)
- [Gradle Build Cache](https://docs.gradle.org/current/userguide/build_cache.html)
- [Cache Strategy Document](../ci/cache-strategy.md)
