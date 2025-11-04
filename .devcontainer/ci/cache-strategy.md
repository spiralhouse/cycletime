# DevContainer CI/CD Caching Strategy

This document outlines the comprehensive caching strategy for DevContainer-based CI/CD pipelines to minimize build times and resource usage.

## Overview

The caching strategy targets three key areas:
1. **Docker Layer Caching** - Reduce container image build time
2. **Build Dependency Caching** - Cache Gradle, Maven, and npm dependencies
3. **Build Artifact Caching** - Cache compiled code and intermediate build outputs

## Target Performance

| Metric | First Run | Cached Run | Improvement |
|--------|-----------|------------|-------------|
| Container Build | 8-12 min | 2-3 min | 60-75% |
| Dependency Resolution | 3-5 min | 30-60s | 80-90% |
| Code Compilation | 2-3 min | 30-45s | 70-85% |
| Test Execution | 5-8 min | 4-6 min | 20-30% |
| **Total Pipeline** | **18-28 min** | **7-11 min** | **60-70%** |

## Docker Layer Caching

### Strategy

Use Docker BuildX with GitHub Actions cache backend to persist container image layers between builds.

### Configuration

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3
  with:
    driver-opts: |
      image=moby/buildkit:latest
      network=host

- name: Cache Docker layers
  uses: actions/cache@v4
  with:
    path: /tmp/.buildx-cache
    key: devcontainer-buildx-${{ env.DEVCONTAINER_CACHE_VERSION }}-${{ runner.os }}-${{ hashFiles('.devcontainer/Dockerfile', '.devcontainer/devcontainer.json') }}
    restore-keys: |
      devcontainer-buildx-${{ env.DEVCONTAINER_CACHE_VERSION }}-${{ runner.os }}-
```

### Key Optimization

Cache keys include hashes of Dockerfile and devcontainer.json, ensuring cache invalidation only when container configuration changes.

### Expected Impact

- **First build:** 8-12 minutes (full layer build)
- **Cached build:** 2-3 minutes (layer reuse)
- **Speedup:** 60-75% reduction

## Gradle Dependency Caching

### Strategy

Cache Gradle home directory containing:
- Downloaded dependencies (`~/.gradle/caches`)
- Gradle wrapper distributions (`~/.gradle/wrapper`)
- Gradle daemon state (`~/.gradle/daemon`)

### Configuration

```yaml
- name: Cache Gradle dependencies
  uses: actions/cache@v4
  with:
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper
      ~/.gradle/daemon
      .gradle/
    key: devcontainer-gradle-${{ env.DEVCONTAINER_CACHE_VERSION }}-${{ hashFiles('**/*.gradle*', 'gradle/libs.versions.toml', '**/gradle-wrapper.properties') }}
    restore-keys: |
      devcontainer-gradle-${{ env.DEVCONTAINER_CACHE_VERSION }}-
```

### Cache Invalidation

Cache key includes hashes of:
- All Gradle build files (`**/*.gradle*`)
- Version catalog (`gradle/libs.versions.toml`)
- Gradle wrapper properties

### Expected Impact

- **First build:** 3-5 minutes (download dependencies)
- **Cached build:** 30-60 seconds (dependency verification only)
- **Speedup:** 80-90% reduction

## npm Dependency Caching

### Strategy

Cache npm global cache directory to avoid re-downloading Node.js packages.

### Configuration

```yaml
- name: Cache npm dependencies
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: devcontainer-npm-${{ env.DEVCONTAINER_CACHE_VERSION }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      devcontainer-npm-${{ env.DEVCONTAINER_CACHE_VERSION }}-
```

### Cache Invalidation

Cache key includes hash of `package-lock.json`, ensuring cache invalidation when dependencies change.

### Expected Impact

- **First build:** 1-2 minutes (download packages)
- **Cached build:** 10-20 seconds (verification only)
- **Speedup:** 85-95% reduction

## GitHub Actions Cache Backend

### Strategy

Use GitHub Actions native cache for Docker BuildX, providing optimal performance and integration.

### Configuration

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: .devcontainer
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Cache Scope

- **Cache storage:** 10GB per repository
- **Cache retention:** 7 days (unused entries)
- **Cache sharing:** Across branches for same repository

### Expected Impact

- **Layer reuse:** 70-80% of layers cached between builds
- **Download time:** Near-zero for cached layers
- **Upload time:** Minimal (only changed layers)

## Gradle Build Cache

### Strategy

Enable Gradle build cache for incremental compilation and task output caching.

### Configuration

In `gradle.properties` (CI-specific):
```properties
org.gradle.caching=true
org.gradle.parallel=true
org.gradle.daemon=false
org.gradle.configuration-cache=true
```

### Cache Behavior

- **Task outputs:** Cached and reused when inputs unchanged
- **Compilation:** Incremental compilation for faster builds
- **Test results:** Reused when source unchanged

### Expected Impact

- **Compilation:** 70-85% faster with cache
- **Tests:** 20-30% faster (deterministic tests only)

## Cache Key Versioning

### Version Control

All cache keys include `DEVCONTAINER_CACHE_VERSION` environment variable:

```yaml
env:
  DEVCONTAINER_CACHE_VERSION: "v1"
```

### Cache Invalidation Strategy

Increment version when:
- Major tooling changes (Java, Node.js, Gradle versions)
- Breaking changes to cache structure
- Debugging cache-related issues

**Example:** `v1` → `v2` forces complete cache rebuild

## Cache Monitoring

### Metrics to Track

1. **Cache hit rate** - Percentage of builds using cached data
2. **Build time improvement** - Time saved vs. uncached builds
3. **Cache storage usage** - Ensure staying within 10GB limit

### GitHub Actions Cache Insights

View cache usage:
```bash
gh cache list
gh cache delete <cache-id>
```

## Best Practices

### 1. Layer Ordering in Dockerfile

```dockerfile
# Good: Dependencies first (change less frequently)
COPY package.json package-lock.json ./
RUN npm install

COPY build.gradle.kts settings.gradle.kts ./
RUN ./gradlew dependencies

# Then source code (changes more frequently)
COPY src ./src
RUN ./gradlew build
```

### 2. Multi-Stage Builds

```dockerfile
# Build stage
FROM gradle:8-jdk21 AS build
WORKDIR /app
COPY . .
RUN ./gradlew build

# Runtime stage (smaller, cached separately)
FROM eclipse-temurin:21-jre
COPY --from=build /app/build/libs/*.jar /app/
CMD ["java", "-jar", "/app/cycletime-server.jar"]
```

### 3. Cache Restore Keys

Use hierarchical restore keys for fallback:
```yaml
restore-keys: |
  devcontainer-gradle-${{ env.DEVCONTAINER_CACHE_VERSION }}-${{ runner.os }}-
  devcontainer-gradle-${{ env.DEVCONTAINER_CACHE_VERSION }}-
```

### 4. Separate Caches for PR vs Main

```yaml
key: devcontainer-buildx-${{ github.event_name }}-${{ hashFiles(...) }}
```

Different cache keys for PRs vs main branch prevent contamination.

## Troubleshooting

### Cache Not Being Used

**Symptoms:** Build times not improving after first run

**Solutions:**
1. Check cache key matches between runs
2. Verify cache wasn't evicted (7-day retention)
3. Check cache size limit not exceeded
4. Review GitHub Actions logs for cache restore messages

### Cache Corruption

**Symptoms:** Build failures after cache restore

**Solutions:**
1. Increment `DEVCONTAINER_CACHE_VERSION` to force rebuild
2. Delete specific cache entries via GitHub CLI
3. Review Dockerfile for non-deterministic operations

### Slow Cache Restore

**Symptoms:** Cache restore taking too long

**Solutions:**
1. Reduce cache size (exclude unnecessary files)
2. Use more specific cache keys
3. Consider splitting into multiple smaller caches

## Monitoring Script

Track cache effectiveness with this script:

```bash
#!/bin/bash
# cache-monitor.sh

echo "=== CI Cache Monitoring ==="
echo ""

# Check cache hit/miss rate
cache_hits=$(grep "Cache restored from key" .github/workflows/*.log | wc -l)
cache_total=$(grep "Cache not found" .github/workflows/*.log | wc -l)
hit_rate=$((cache_hits * 100 / (cache_hits + cache_total)))

echo "Cache Hit Rate: $hit_rate%"
echo "  Hits: $cache_hits"
echo "  Misses: $cache_total"
echo ""

# Check cache size
gh cache list --limit 100 | awk '{sum+=$3} END {print "Total Cache Size: " sum/1024/1024 " MB"}'
```

## Future Optimizations

### Potential Improvements

1. **Remote Build Cache** - Use Gradle Enterprise for cross-runner cache sharing
2. **Incremental Testing** - Only run tests affected by code changes
3. **Parallel Job Caching** - Share cache artifacts between matrix jobs
4. **Layer Deduplication** - Further optimize Docker layer reuse

### Target Metrics (Future)

| Metric | Current Target | Future Target |
|--------|---------------|---------------|
| Container Build | 2-3 min | 1-2 min |
| Dependency Resolution | 30-60s | 10-20s |
| Total Pipeline | 7-11 min | 4-7 min |

## References

- [GitHub Actions Caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Docker BuildX Cache](https://docs.docker.com/build/cache/)
- [Gradle Build Cache](https://docs.gradle.org/current/userguide/build_cache.html)
- [devcontainers/ci Documentation](https://github.com/devcontainers/ci)
