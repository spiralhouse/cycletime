# CodeCov Integration Diagnostic Information

## Issue Summary
- **Problem**: CodeCov shows as "deactivated" on codecov.com
- **Badge Status**: Shows 30% coverage but repository appears deactivated
- **Current State**: CI/CD pipeline configured but may need token refresh

## Implemented Fixes

### 1. Added codecov.yml Configuration
- **File**: `/codecov.yml`
- **Purpose**: Provides CodeCov with proper configuration for processing coverage reports
- **Features**:
  - Coverage thresholds and targets
  - Ignore patterns for non-relevant files
  - PR comment configuration
  - Flag management for different test types

### 2. Enhanced CI/CD Diagnostics
- **Modified**: `.github/workflows/cicd.yml`
- **Added**: Coverage report verification step
- **Added**: Verbose output for CodeCov uploads
- **Added**: Fallback upload method if primary fails

### 3. Configuration Validation
- **Coverage Generation**: ✅ Working (Kover generates 470KB XML report)
- **File Location**: ✅ Correct (`./build/reports/kover/report.xml`)
- **CI Integration**: ✅ Using codecov-action@v5 with proper token reference

## Potential Root Causes & Solutions

### Most Likely: Repository Deactivation
**Symptoms**: Badge shows coverage but repository marked as deactivated
**Solution**: Repository admin needs to:
1. Go to [codecov.io](https://codecov.io) → Login → Repository Settings
2. Check if repository is properly connected
3. Re-activate if deactivated
4. Verify GitHub integration is active

### Token Issues
**Symptoms**: Uploads fail with authentication errors
**Solution**: Repository admin needs to:
1. Regenerate CODECOV_TOKEN in CodeCov dashboard
2. Update GitHub repository secret `CODECOV_TOKEN`
3. Ensure token has proper permissions

### First-Time Setup
**Symptoms**: Repository never properly initialized with CodeCov
**Solution**: Repository admin needs to:
1. Add repository to CodeCov organization
2. Configure GitHub integration
3. Run first successful CI build to initialize

## Testing the Fix

1. **Local Testing** (Already Verified):
   ```bash
   ./gradlew unitTest koverXmlReport
   # Generates: build/reports/kover/report.xml (470KB)
   ```

2. **CI Testing**:
   - Push changes to trigger CI
   - Check "Upload coverage to Codecov" step output
   - Verify diagnostic information helps identify issue

3. **CodeCov Dashboard**:
   - Check if repository becomes active after successful upload
   - Verify coverage data is processed correctly

## Repository Admin Actions Required

The following actions likely need to be taken by someone with admin access:

1. **CodeCov Dashboard** (`https://codecov.io/gh/spiralhouse/cycletime`):
   - [ ] Verify repository is active (not deactivated)
   - [ ] Check GitHub integration status
   - [ ] Regenerate token if needed

2. **GitHub Repository Settings**:
   - [ ] Verify `CODECOV_TOKEN` secret exists and is current
   - [ ] Check if CodeCov GitHub App has proper permissions

3. **Test Integration**:
   - [ ] Run CI with these fixes
   - [ ] Monitor CodeCov upload step for errors
   - [ ] Verify repository becomes active on codecov.io

## Expected Outcome
After implementing these fixes and completing admin actions:
- CodeCov repository should become active
- Coverage reports should upload successfully
- Badge should reflect current coverage (likely higher than 30%)
- PR comments should include coverage information