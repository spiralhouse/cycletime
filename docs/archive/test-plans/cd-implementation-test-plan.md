# Continuous Delivery Implementation Test Plan

## Overview
This test plan ensures the Git.SemVersioning CD pipeline works correctly before merging to main.

## Pre-Merge Local Testing

### 1. Build and Version Testing

#### Test 1.1: Gradle Build
```bash
# Clean build to ensure everything compiles
./gradlew clean build

# Expected: Build succeeds with all tests passing
```

#### Test 1.2: Version Calculation
```bash
# Check current version calculation
./gradlew printVersion

# Expected: Shows version based on commits since v0.1.0 tag
# Should be something like 0.2.0-SNAPSHOT
```

#### Test 1.3: Version After Different Commits
```bash
# Create test branch from current position
git checkout -b test/cd-validation

# Test fix commit
git commit --allow-empty -m "fix: test patch version"
./gradlew printVersion
# Expected: Same minor version (0.2.0-SNAPSHOT) due to grouping

# Test feat commit  
git commit --allow-empty -m "feat: test minor version"
./gradlew printVersion
# Expected: Still 0.2.0-SNAPSHOT (already has feat)

# Test breaking change
git commit --allow-empty -m "feat!: test major version"
./gradlew printVersion
# Expected: 1.0.0-SNAPSHOT (major bump)

# Clean up test branch
git checkout feat/spi-488-continuous-delivery
git branch -D test/cd-validation
```

### 2. Workflow Validation

#### Test 2.1: Syntax Validation
```bash
# Install actionlint if not present
brew install actionlint

# Validate all workflows
actionlint .github/workflows/*.yml

# Use ghalint for additional checks
ghalint run .github/workflows/cicd.yml
ghalint run .github/workflows/promote.yml

# Expected: No errors or warnings
```

#### Test 2.2: Workflow Logic Testing with act
```bash
# Install act if not present
brew install act

# Test CI/CD workflow (dry run)
act push --dryrun -W .github/workflows/cicd.yml

# Test version calculation job
act push -j version -W .github/workflows/cicd.yml --secret GITHUB_TOKEN=$GITHUB_TOKEN

# Expected: Jobs show they would run correctly
```

### 3. Container Build Testing

#### Test 3.1: Local Docker Build
```bash
# Build container with version argument
docker build -t cycletime:test --build-arg VERSION=0.2.0-SNAPSHOT .

# Verify version is set in container
docker run --rm cycletime:test env | grep CYCLETIME_VERSION
# Expected: CYCLETIME_VERSION=0.2.0-SNAPSHOT

# Check container labels
docker inspect cycletime:test | jq '.[0].Config.Labels'
# Expected: Shows OCI labels with version metadata
```

#### Test 3.2: Container Tagging Simulation
```bash
# Simulate version tagging
docker tag cycletime:test cycletime:0.2.0
docker tag cycletime:test cycletime:0.2
docker tag cycletime:test cycletime:0
docker tag cycletime:test cycletime:latest

# Simulate environment tagging
docker tag cycletime:test cycletime:dev
docker tag cycletime:test cycletime:staging
docker tag cycletime:test cycletime:production

# List all tags
docker images cycletime --format "table {{.Tag}}\t{{.ID}}"
# Expected: All tags point to same image ID
```

### 4. Documentation Verification

#### Test 4.1: Check All Documentation Links
```bash
# Find all markdown files
find . -name "*.md" -type f | while read file; do
  echo "Checking: $file"
  # Check for broken internal links
  grep -oE '\[.*\]\(\..*\)' "$file" | while read link; do
    path=$(echo $link | sed -E 's/.*\((.*)\).*/\1/')
    if [[ ! -f "$path" ]]; then
      echo "  Broken link: $path"
    fi
  done
done

# Expected: No broken links found
```

#### Test 4.2: Verify Required Files Exist
```bash
# Check all required documentation files
files=(
  "docs/CONTINUOUS_DELIVERY.md"
  "docs/CD_QUICK_REFERENCE.md"
  "docs/CI_ARCHITECTURE.md"
  "docs/ENVIRONMENT_PROTECTION.md"
  "docs/STAGING_PROMOTION.md"
  "docs/PRODUCTION_APPROVALS.md"
  "docs/ci-cd/container-tagging.md"
)

for file in "${files[@]}"; do
  if [[ -f "$file" ]]; then
    echo "✅ $file exists"
  else
    echo "❌ $file missing"
  fi
done

# Expected: All files exist
```

### 5. Integration Testing

#### Test 5.1: Simulate Full Pipeline
```bash
# Create a test script to simulate the pipeline
cat > test-pipeline.sh << 'EOF'
#!/bin/bash
set -e

echo "=== Simulating CD Pipeline ==="

# 1. Calculate version
VERSION=$(./gradlew -q printVersion)
echo "Version: $VERSION"

# 2. Build application
echo "Building application..."
./gradlew build -x test

# 3. Check if JAR exists
if [[ -f "build/libs/jcvd-server.jar" ]]; then
  echo "✅ JAR built successfully"
else
  echo "❌ JAR not found"
  exit 1
fi

# 4. Simulate container build
echo "Would build container with version: $VERSION"

# 5. Check version type
if [[ "$VERSION" == *"-SNAPSHOT"* ]]; then
  echo "Development version - would tag as dev"
else
  echo "Release version - would create GitHub release"
fi

echo "=== Pipeline simulation complete ==="
EOF

chmod +x test-pipeline.sh
./test-pipeline.sh

# Expected: All steps complete successfully
```

### 6. Critical Infrastructure Tests

#### Test 6.1: Version Extraction Reliability
```bash
# Test version extraction edge cases
echo "=== Testing Version Extraction Reliability ==="

# Test with clean repository
git status --porcelain | wc -l # Should be 0

# Test version extraction multiple times for consistency
for i in {1..5}; do
  version=$(./gradlew printSemVersion --console=plain --no-configuration-cache --rerun-tasks 2>&1 | grep -E '^[0-9]' | head -1)
  echo "Run $i: $version"
done

# All should return the same version
echo "Expected: All versions identical"
```

#### Test 6.2: Container Build Without Pre-built JAR
```bash
# Test container build failure when JAR is missing
echo "=== Testing Container Build Dependencies ==="

# Clean build directory
rm -rf build/libs/

# Attempt container build (should fail gracefully)
if docker build -t cycletime:test-no-jar --build-arg VERSION=test . 2>&1; then
  echo "❌ Container build should have failed without JAR"
  exit 1
else
  echo "✅ Container build correctly failed without JAR"
fi

# Build JAR first
./gradlew buildFatJar

# Verify container build now works
docker build -t cycletime:test-with-jar --build-arg VERSION=test .
echo "✅ Container build succeeds with JAR present"
```

#### Test 6.3: Artifact Dependency Validation
```bash
# Test artifact upload/download chain
echo "=== Testing Artifact Dependencies ==="

# Build and verify artifacts
./gradlew build buildFatJar
test -f build/libs/jcvd-server.jar || { echo "❌ JAR not found after build"; exit 1; }

# Simulate artifact upload structure
mkdir -p test-artifacts
cp -r build/libs/ test-artifacts/
cp -r build/distributions/ test-artifacts/ 2>/dev/null || echo "No distributions"

# Verify artifact structure matches workflow expectations
ls -la test-artifacts/libs/ | grep jcvd-server.jar || { echo "❌ JAR missing from artifacts"; exit 1; }

# Clean up
rm -rf test-artifacts/
echo "✅ Artifact structure validated"
```

#### Test 6.4: CI Configuration Consistency
```bash
# Check CI properties consistency
echo "=== Testing CI Configuration ==="

if [[ -f .github/gradle-ci.properties ]]; then
  echo "✅ CI properties file exists"
  
  # Check key CI optimizations are present
  grep -q "org.gradle.caching=true" .github/gradle-ci.properties || echo "⚠️ Build caching not enabled"
  grep -q "org.gradle.parallel=true" .github/gradle-ci.properties || echo "⚠️ Parallel builds not enabled"
  grep -q "org.gradle.configuration-cache=true" .github/gradle-ci.properties || echo "⚠️ Configuration cache not enabled"
  
  # Verify memory settings are appropriate for CI
  if grep -q "Xmx3072m" .github/gradle-ci.properties; then
    echo "✅ CI memory settings configured"
  else
    echo "⚠️ CI memory settings may need adjustment"
  fi
else
  echo "❌ CI properties file missing"
  exit 1
fi

# Test CI properties can be copied
cp .github/gradle-ci.properties gradle.properties.backup
echo "✅ CI properties can be applied"
mv gradle.properties.backup gradle.properties
```

#### Test 6.5: Registry Authentication Scenarios
```bash
# Test registry authentication edge cases
echo "=== Testing Registry Authentication ==="

# Test GHCR authentication (dry run)
echo "Simulating GHCR authentication..."

# Check if github token would be available
if [[ -n "$GITHUB_TOKEN" ]]; then
  echo "✅ GitHub token available"
  # Simulate docker login (don't actually login in test)
  echo "Would authenticate to ghcr.io with token"
else
  echo "⚠️ No GitHub token - would use workflow GITHUB_TOKEN"
fi

# Test image name format
image_name="ghcr.io/spiralhouse/cycletime"
if [[ "$image_name" =~ ^ghcr\.io/[a-z0-9.-]+/[a-z0-9.-]+$ ]]; then
  echo "✅ Image name format valid"
else
  echo "❌ Invalid image name format"
fi

echo "✅ Registry authentication scenarios tested"
```

### 7. Rollback Testing

#### Test 7.1: Simulate Rollback Scenario
```bash
# Test rollback logic
cat > test-rollback.sh << 'EOF'
#!/bin/bash

echo "=== Testing Rollback Logic ==="

# Simulate checking if version exists
VERSION="0.1.0"
echo "Checking if version $VERSION exists..."

# Would normally check GHCR, simulate locally
if docker images cycletime:test --format "{{.Tag}}" | grep -q "test"; then
  echo "✅ Version exists (simulated)"
else
  echo "❌ Version not found"
fi

# Simulate re-tagging for rollback
echo "Would retag $VERSION as 'production' for rollback"

echo "=== Rollback test complete ==="
EOF

chmod +x test-rollback.sh
./test-rollback.sh

# Expected: Rollback logic works correctly
```

## Post-PR Creation Testing

### 8. GitHub Actions Testing

After creating the PR, these will run automatically:

#### Test 8.1: CI Pipeline on PR
- All CI stages should run (compile, test, quality)
- CD stages should NOT run (only on main)
- All checks should pass

#### Test 8.2: Workflow Permissions
- Verify workflows have correct permissions
- Check that GITHUB_TOKEN is sufficient for CI
- Note any permission errors for fixing

## Post-Merge Testing

### 9. Main Branch Integration

After merging to main:

#### Test 9.1: Version Calculation
```bash
git checkout main
git pull
./gradlew printVersion
# Should show new version based on all commits
```

#### Test 9.2: CD Pipeline Activation
- Check GitHub Actions for CD pipeline run
- Verify container is built and pushed to GHCR
- Check that dev tag is applied
- Verify external CD system would detect changes

#### Test 9.3: Promotion Testing
- Test manual promotion workflow trigger
- Verify approval gates work
- Test rollback workflow

## Success Criteria

### Must Pass Before PR
- [ ] All local builds succeed
- [ ] Version calculation works correctly
- [ ] Workflow syntax validation passes
- [ ] Documentation is complete and linked correctly
- [ ] Container builds locally with version

### Must Pass After PR
- [ ] CI pipeline runs on PR
- [ ] No permission errors
- [ ] All status checks pass

### Must Pass After Merge
- [ ] CD pipeline activates on main
- [ ] Container pushed to GHCR
- [ ] Version correctly calculated
- [ ] Dev tag applied
- [ ] Promotion workflows accessible

## Rollback Plan

If issues are found after merge:
1. Revert the merge commit
2. Original CI workflow (ci.yml.bak) can be restored
3. Fix issues on feature branch
4. Re-test and re-merge

## Notes

- The external CD system will handle actual deployments
- We only manage container tags and registry pushes
- Test in stages: local → PR → merge
- Document any issues found for fixing