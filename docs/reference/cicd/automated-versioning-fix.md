---
title: "Automated Versioning Fix - Breaking the Chicken-and-Egg Cycle"
type: reference
domain: [cicd, deployment]
description: "Solution for automatic tag creation to enable semantic versioning releases"
dependencies: []
related:
  - container-tagging-spec.md
  - concurrency-control-spec.md
keywords: [versioning, git-semver, automated-release, ci-cd, tagging]
last_updated: 2025-10-26
---

# Automated Versioning Fix

## Problem Statement

### The Chicken-and-Egg Cycle

**Initial State:**
- Latest git tag: `v0.2.0`
- Current commits: 4 `feat:` commits ahead of `v0.2.0`
- Expected version: `0.3.0` (or higher with `groupVersionIncrements`)
- Actual CI version: `0.3.0-SNAPSHOT`

**The Cycle:**
1. **Version Calculation**: git-semver-plugin calculates `0.3.0-SNAPSHOT` (commits ahead of last tag)
2. **Release Detection**: CI sets `is_release=false` (version contains `-SNAPSHOT`)
3. **Release Job Skip**: GitHub release job only runs when `is_release == true`
4. **No Tag Created**: Without release job, no git tag is created
5. **Repeat**: Next build still sees commits ahead of `v0.2.0`, generates `-SNAPSHOT` again

**Root Cause:**
The git-semver-plugin requires git tags to calculate clean versions, but the CI/CD pipeline only creates tags when versions are clean (no `-SNAPSHOT`). This creates an impossible dependency loop.

## Solution: Automatic Tag Creation

### Strategy

**Break the cycle by creating git tags BEFORE version calculation**, not after:

1. **Auto-create tag** on main branch merges (new step before version calculation)
2. **Re-fetch tags** to ensure git-semver-plugin sees the new tag
3. **Calculate version** using updated tag information
4. **Set is_release=true** because commit is now tagged
5. **Release job runs** and creates GitHub release

### Implementation Details

#### New Workflow Steps

**Step 1: Auto-create version tag on main** (lines 122-181)
```yaml
- name: Auto-create version tag on main
  if: github.ref == 'refs/heads/main'
  run: |
    # Analyze commit message for version bump type
    commit_message=$(git log -1 --pretty=%B)

    # Determine if this commit should create a version tag
    should_tag=false

    if [[ "$commit_message" =~ ^feat(\(.*\))?!:|^BREAKING[\ -]CHANGE: ]]; then
      # Major version bump (BREAKING CHANGE)
      should_tag=true
    elif [[ "$commit_message" =~ ^feat(\(.*\))?: ]]; then
      # Minor version bump (feature)
      should_tag=true
    elif [[ "$commit_message" =~ ^fix(\(.*\))?: ]]; then
      # Patch version bump (bugfix)
      should_tag=true
    elif [[ "$commit_message" =~ ^perf(\(.*\))?: ]]; then
      # Patch version bump (performance)
      should_tag=true
    else
      # Non-versioning commit (docs, chore, ci, build, etc.)
      should_tag=false
    fi

    if [ "$should_tag" = true ]; then
      # Calculate next version using git-semver-plugin
      next_version=$(./gradlew printSemVersion --quiet | grep -E '^[0-9]+\.[0-9]+\.[0-9]+' | tail -1)
      next_version="${next_version%-SNAPSHOT}"  # Remove -SNAPSHOT suffix

      # Create and push annotated tag
      git config user.name "github-actions[bot]"
      git config user.email "github-actions[bot]@users.noreply.github.com"
      git tag -a "v$next_version" -m "Release $next_version..."
      git push origin "v$next_version"
    fi
```

**Step 2: Calculate version** (lines 183-256)
```yaml
- name: Calculate version
  id: version
  run: |
    # Re-fetch tags after potential tag creation
    git fetch --tags --force

    # Extract version using printSemVersion
    version=$(./gradlew printSemVersion --quiet | grep -E '^[0-9]+\.[0-9]+\.[0-9]+' | tail -1)

    # For main branch, check if commit is tagged
    if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
      if git describe --exact-match --tags HEAD >/dev/null 2>&1; then
        # Commit is tagged - this is a release
        echo "is_release=true" >> $GITHUB_OUTPUT
      else
        # Commit not tagged - non-versioning commit or tagging failed
        echo "is_release=false" >> $GITHUB_OUTPUT
      fi
    fi
```

### Conventional Commit Detection

**Versioning Commits** (create tags):
- `feat:` → Minor version bump (`0.2.0` → `0.3.0`)
- `feat!:` or `BREAKING CHANGE:` → Major version bump (`0.2.0` → `1.0.0`)
- `fix:` → Patch version bump (`0.2.0` → `0.2.1`)
- `perf:` → Patch version bump (performance improvements)

**Non-Versioning Commits** (skip tags):
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `ci:` - CI/CD configuration
- `build:` - Build system changes
- `style:` - Code formatting
- `refactor:` - Code refactoring
- `test:` - Test changes

### How It Breaks the Cycle

**Before Fix:**
```
main branch merge → version = 0.3.0-SNAPSHOT → is_release=false → no tag created → REPEAT
```

**After Fix:**
```
main branch merge → analyze commit → create tag v0.3.0 → refetch tags →
version = 0.3.0 → is_release=true → GitHub release created → CYCLE BROKEN
```

**Key Insight:**
By creating the tag BEFORE version calculation, we ensure:
1. **git-semver-plugin** sees the tag and calculates clean version
2. **No -SNAPSHOT suffix** in version output
3. **is_release=true** triggers release job
4. **Subsequent builds** see the tag and don't re-create it

## Behavior Scenarios

### Scenario 1: Feature Commit on Main

**Input:**
```bash
git commit -m "feat: add new dashboard feature"
git push origin main
```

**CI Workflow:**
1. Detect `feat:` prefix → `should_tag=true`
2. Calculate next version: `0.3.0-SNAPSHOT` → strip to `0.3.0`
3. Create tag: `v0.3.0`
4. Push tag to repository
5. Re-fetch tags
6. Recalculate version: `0.3.0` (clean, no SNAPSHOT)
7. Set `is_release=true`
8. Build artifacts with version `0.3.0`
9. Push container with tags: `0.3.0`, `latest`, `dev`, `sha-xxx`
10. Create GitHub release `v0.3.0`

### Scenario 2: Non-Versioning Commit on Main

**Input:**
```bash
git commit -m "docs: update README with deployment guide"
git push origin main
```

**CI Workflow:**
1. Detect `docs:` prefix → `should_tag=false`
2. Skip tag creation
3. Calculate version: `0.3.0` (using last tag `v0.3.0`)
4. Set `is_release=false` (no new tag created)
5. Build artifacts with version `0.3.0` (reuses existing version)
6. Push container with tag: `dev` only (not `latest`)
7. Skip GitHub release creation

### Scenario 3: Multiple Features in One PR

**Input:**
```bash
# PR squash merge with message:
git commit -m "feat: add authentication, authorization, and user management (SPI-100)"
git push origin main
```

**CI Workflow:**
1. Detect `feat:` prefix → `should_tag=true`
2. Calculate version with `groupVersionIncrements=true`:
   - All feat commits grouped into single minor bump
   - Version: `0.4.0` (not `0.5.0` or `0.6.0`)
3. Create tag: `v0.4.0`
4. Single release for all features

## Configuration Requirements

### build.gradle.kts

**git-semver-plugin configuration:**
```kotlin
semver {
    // CRITICAL: Do NOT set defaultPreRelease = "SNAPSHOT"
    // Let CI workflow control tag creation instead

    releasePattern = "\\Arelease(?:\\([^()]+\\))?:"
    majorPattern = "\\A\\w+(?:\\([^()]+\\))?!:|^BREAKING[ -]CHANGE:"
    minorPattern = "\\Afeat(?:\\([^()]+\\))?:"
    patchPattern = "\\Afix(?:\\([^()]+\\))?:"
    groupVersionIncrements = true  // Group multiple commits into single version bump
}
```

### GitHub Actions Permissions

**Required permissions in workflow:**
```yaml
permissions:
  contents: write  # Required for creating and pushing tags
  packages: write  # Required for pushing container images
```

## Verification

### Test the Workflow

**1. Check current version:**
```bash
./gradlew printSemVersion
# Expected: 0.3.0 (or higher based on commits)
```

**2. Create feature commit:**
```bash
git checkout -b feat/test-versioning
# Make changes
git commit -m "feat: test automatic versioning"
git push origin feat/test-versioning
# Create PR and merge to main
```

**3. Verify CI created tag:**
```bash
git fetch --tags
git tag -l | grep v0
# Expected: v0.3.0 (or next version)
```

**4. Verify GitHub release:**
- Navigate to: https://github.com/spiralhouse/cycletime/releases
- Check for release `v0.3.0` with changelog

**5. Verify container tags:**
```bash
docker pull ghcr.io/spiralhouse/cycletime:0.3.0
docker pull ghcr.io/spiralhouse/cycletime:latest
docker pull ghcr.io/spiralhouse/cycletime:dev
```

## Benefits

### Developer Experience

**Before:**
- Manual tag creation required
- Version stuck at `-SNAPSHOT`
- No automated releases
- Container images only tagged with `dev`

**After:**
- Automatic version bumps on main merges
- Clean semantic versions
- Automated GitHub releases
- Full container tag strategy (`version`, `latest`, `dev`, `sha`)

### CI/CD Performance

**Tag Creation Overhead:**
- **Time added**: ~5-10 seconds per main build
- **Network**: Single git push (lightweight operation)
- **Frequency**: Only on versioning commits (feat, fix, perf)
- **Skip logic**: Non-versioning commits (docs, chore, ci) have zero overhead

**Release Job Triggers:**
- **Before**: Never triggered (is_release always false)
- **After**: Triggered on every versioning commit
- **Impact**: ~30-60 seconds for GitHub release creation
- **Benefit**: Full release automation, no manual intervention

## Troubleshooting

### Tag Creation Failures

#### Issue 1: Tag Already Exists

**Symptoms:**
```
⚠️ Tag v0.3.0 already exists, skipping tag creation
```

**Cause:** Tag was already created in a previous build or manually.

**Resolution:** Workflow automatically skips duplicate tag creation. No action needed.

**Prevention:** Implemented via `git rev-parse` check before tag creation (lines 166-167).

#### Issue 2: Tag Push Network Failure

**Symptoms:**
```
⚠️ Tag push failed (attempt 1/3), retrying in 2 seconds...
❌ Failed to push tag v0.3.0 after 3 attempts
```

**Cause:** Network interruption or GitHub API rate limiting.

**Resolution:**
1. **Automatic retry** - Workflow retries 3 times with 2-second delays
2. **Manual fix** if all retries fail:
   ```bash
   git fetch --tags
   git tag -a v0.3.0 -m "Release 0.3.0"
   git push origin v0.3.0
   ```

**Prevention:** Implemented retry logic with exponential backoff (lines 179-195).

#### Issue 3: Tag Propagation Delay

**Symptoms:**
```
📋 Latest tag after fetch: v0.2.0
Expected: v0.3.0 (just created)
```

**Cause:** GitHub's eventual consistency - tag exists but not visible in fetch immediately.

**Resolution:** Workflow includes 3-second propagation delay before version recalculation.

**Prevention:** Implemented via `sleep 3` before `git fetch --tags` (lines 218-223).

#### Issue 4: Tag Creation Permission Error

**Symptoms:**
```
❌ Failed to create tag v0.3.0
error: cannot create tag 'v0.3.0': permission denied
```

**Cause:** Missing `contents: write` permission in workflow.

**Resolution:** Verify workflow permissions (lines 54-56 in cicd.yml):
```yaml
permissions:
  contents: write  # Required for creating and pushing tags
  packages: write  # Required for pushing container images
```

**Prevention:** Documented in Configuration Requirements section.

### Version Calculation Failures

#### Issue 5: Version Format Invalid

**Symptoms:**
```
❌ Invalid version format: 0.3.0-dev.123+sha.abc
Expected semantic version format: MAJOR.MINOR.PATCH[-PRERELEASE][+BUILDMETADATA]
```

**Cause:** git-semver-plugin returned non-standard version format.

**Resolution:**
1. Check `build.gradle.kts` semver configuration
2. Verify conventional commit message format
3. Ensure tags follow `vX.Y.Z` pattern

**Prevention:** Implemented version validation regex (line 249).

#### Issue 6: Tag Not Visible After Creation

**Symptoms:**
```
version = 0.3.0-SNAPSHOT (expected: 0.3.0)
is_release = false (expected: true)
```

**Cause:** Tag propagation delay or fetch failure.

**Resolution:**
1. **Check propagation delay** - Workflow waits 3 seconds
2. **Verify tag fetch** - Check "Fetching tags from remote" step output
3. **Manual verification**:
   ```bash
   git ls-remote --tags origin | grep v0.3.0
   ```

**Prevention:** Implemented tag verification output (lines 226-229).

## Maintenance

### Handling Tag Conflicts

**Scenario:** Tag already exists for version

**Behavior:**
```bash
git tag -a "v0.3.0" -m "..."
# Error: tag 'v0.3.0' already exists
```

**Solution:** CI workflow includes error handling:
```bash
if [[ -n "$next_version" && "$next_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  # Only create tag if it doesn't already exist
  if ! git rev-parse "v$next_version" >/dev/null 2>&1; then
    git tag -a "v$next_version" -m "..."
    git push origin "v$next_version"
  else
    echo "⚠️ Tag v$next_version already exists, skipping tag creation"
  fi
fi
```

### Rollback Strategy

**If automated tagging fails:**
1. **Disable auto-tagging** (set `if: false` on step)
2. **Manual tag creation**: `git tag -a v0.X.0 -m "Release 0.X.0" && git push --tags`
3. **Re-enable after debugging**

### Monitoring

**GitHub Actions Logs:**
- Check "Auto-create version tag on main" step
- Verify tag creation messages
- Monitor for version calculation failures

**Git Tag Audit:**
```bash
git log --tags --simplify-by-decoration --pretty="format:%ai %d"
# Shows all tags with creation timestamps
```

### Error Recovery Workflow

**Step-by-step recovery for tag failures:**

1. **Identify failure point** (check GitHub Actions logs)
2. **Verify repository state**:
   ```bash
   git fetch --tags
   git tag -l | grep v0.3
   git log --oneline -5
   ```
3. **Determine if tag exists remotely**:
   ```bash
   git ls-remote --tags origin | grep v0.3.0
   ```
4. **Recovery based on state**:
   - **Tag exists remotely, not locally**: `git fetch --tags`
   - **Tag exists locally, not remotely**: `git push origin v0.3.0`
   - **Tag doesn't exist**: Create manually and push
   - **Tag corrupted**: Delete and recreate
     ```bash
     git tag -d v0.3.0
     git push origin :refs/tags/v0.3.0
     git tag -a v0.3.0 -m "Release 0.3.0"
     git push origin v0.3.0
     ```

## References

- **git-semver-plugin**: https://github.com/jmongard/git-semver-plugin
- **Conventional Commits**: https://www.conventionalcommits.org/
- **Semantic Versioning**: https://semver.org/
- **GitHub Actions Permissions**: https://docs.github.com/en/actions/security-guides/automatic-token-authentication

## Related Issues

- **SPI-747**: Fix version calculation by explicitly fetching tags
- **Container Tagging Spec**: `/docs/reference/cicd/container-tagging-spec.md`
- **Environment Specifications**: `/docs/reference/cicd/environment-specifications.md`
