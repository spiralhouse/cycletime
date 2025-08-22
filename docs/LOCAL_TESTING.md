# Local CI Testing Guide

## Testing with act

[act](https://github.com/nektos/act) allows you to run GitHub Actions locally. However, there are some limitations to be aware of.

### Installation

```bash
# macOS
brew install act

# Other platforms
curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

### Known Limitations with our CI Pipeline

Our CI pipeline uses several advanced GitHub Actions features that have limited support in `act`:

1. **Matrix Builds**: Partially supported, but macOS runners won't work locally
2. **Artifact Upload/Download**: Not fully supported between jobs
3. **Caching**: GitHub Actions cache doesn't work locally (uses local Docker volumes instead)
4. **Concurrency Groups**: Not supported (no effect locally)
5. **Environment Protection Rules**: Not available locally
6. **Docker BuildKit**: Limited support, may need manual configuration

### What You CAN Test Locally

#### 1. Basic Build and Test

```bash
# Run unit tests only (fastest)
act -j unit-tests -P ubuntu-latest=catthehacker/ubuntu:act-latest --container-architecture linux/amd64

# Run code quality checks
act -j quality -P ubuntu-latest=catthehacker/ubuntu:act-latest --container-architecture linux/amd64

# Dry run to validate syntax
act --dryrun
```

#### 2. Direct Gradle Testing (Recommended)

Since many CI features don't work with `act`, it's often better to test directly with Gradle:

```bash
# Run all tests locally
./gradlew test

# Run specific test suites
./gradlew unitTest        # Fast unit tests
./gradlew integrationTest # Integration tests
./gradlew systemTest      # System/performance tests

# Run with CI configuration
GRADLE_OPTS="-Dorg.gradle.daemon=false" ./gradlew test

# Build and test everything
./gradlew clean build
```

#### 3. Docker Testing

```bash
# Build Docker image locally
docker build -t jcvd:test .

# Run smoke tests locally
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# Test with development compose
docker-compose -f docker-compose.dev.yml up
```

### Testing CI Changes Before Push

Given the limitations of `act`, here's the recommended approach:

1. **Validate Syntax**: `act --dryrun`
2. **Test Core Logic**: Run Gradle commands directly
3. **Test Docker Builds**: Build images locally
4. **Small Commits**: Push small changes to test in real CI
5. **Use Feature Branches**: Test in branches before merging

### Alternative: Use GitHub Actions Locally with Docker

For more accurate local testing, you can use the official GitHub Actions runner in Docker:

```bash
# Pull the GitHub Actions runner image
docker pull ghcr.io/actions/actions-runner:latest

# Run tests in a container similar to GitHub Actions
docker run --rm -v $(pwd):/workspace -w /workspace \
  openjdk:21-jdk-slim \
  bash -c "./gradlew test"
```

### Debugging CI Issues

When CI fails but local tests pass:

1. **Check Environment Differences**:
   - Java version: `java -version`
   - Gradle version: `./gradlew --version`
   - Available memory: `free -h` (Linux) or `vm_stat` (macOS)

2. **Replicate CI Environment**:
   ```bash
   # Use CI-specific Gradle properties
   cp .github/gradle-ci.properties gradle.properties
   ./gradlew test --no-daemon
   ```

3. **Check Path Filters**:
   - Review `.github/workflows/ci.yml` paths and paths-ignore
   - Ensure your changes trigger the expected jobs

4. **Review Cache Keys**:
   - Caches might be stale
   - Try clearing with a cache version bump in workflow

## Quick Test Commands

```bash
# Before pushing, run these locally:
./gradlew clean build                    # Full build and test
./gradlew buildStatus                     # Check build configuration
docker build -t jcvd:test .              # Verify Docker build
act --dryrun                             # Validate workflow syntax
```

## Summary

While `act` has limitations with our advanced CI features, it's still useful for:
- Syntax validation
- Basic job testing
- Understanding workflow flow

For comprehensive testing, combine:
- Direct Gradle commands
- Local Docker builds
- Feature branch testing in real CI