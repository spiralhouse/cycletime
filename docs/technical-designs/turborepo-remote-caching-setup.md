# TurboRepo Remote Caching with Vercel - Setup Guide

## Overview
This guide documents the configuration of TurboRepo remote caching with Vercel for SPI-75, completing Phase 3 of the TurboRepo implementation strategy.

## Implementation Summary

### Configuration Changes

#### 1. turbo.json Configuration
Updated `/turbo.json` to enable remote caching with security signatures:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "remoteCache": {
    "signature": true
  },
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "coverage/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "cache": true
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "cache": true
    }
  },
  "cacheDir": ".turbo"
}
```

**Key Changes:**
- Added `remoteCache.signature: true` for security verification
- This enables cache signature validation to prevent tampering

#### 2. GitHub Actions Workflow Updates
Updated `.github/workflows/ci.yml` to include TurboRepo environment variables:

```yaml
- name: Build packages
  run: npm run build
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

- name: Run lint
  run: npm run lint
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

- name: Run type check
  run: npm run typecheck
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

- name: Run tests
  run: npm test
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
    # ... other environment variables
```

**Key Changes:**
- Added `TURBO_TOKEN` and `TURBO_TEAM` environment variables to all turbo commands
- Removed local TurboRepo cache action (replaced by remote caching)

## Setup Instructions

### Step 1: Vercel Account Setup

1. **Create/Access Vercel Account**
   - Visit https://vercel.com and sign in with your GitHub account
   - Ensure you have access to create teams or use personal account

2. **Create a Vercel Team** (if not using personal account)
   - Go to https://vercel.com/teams
   - Create a new team or use existing team
   - Note the team slug (used for `TURBO_TEAM`)

### Step 2: Generate TurboRepo Token

1. **Access TurboRepo Settings**
   - In Vercel dashboard, go to your team/personal settings
   - Navigate to "General" → "TurboRepo"
   - Or visit: https://vercel.com/account/tokens

2. **Generate API Token**
   - Click "Create Token"
   - Name: "CycleTime CI/CD"
   - Scope: Full access or appropriate permissions
   - Copy the generated token (this is your `TURBO_TOKEN`)

### Step 3: GitHub Secrets Configuration

1. **Navigate to Repository Secrets**
   - Go to GitHub repository: https://github.com/spiralhouse/cycletime
   - Settings → Secrets and variables → Actions

2. **Add Required Secrets**
   
   **TURBO_TOKEN**
   - Name: `TURBO_TOKEN`
   - Value: The token generated from Vercel in Step 2
   
   **TURBO_TEAM**
   - Name: `TURBO_TEAM`
   - Value: Your Vercel team slug (e.g., "spiral-house" or your username for personal)

### Step 4: Verification

#### Local Testing (Optional)
```bash
# Set environment variables locally (optional for testing)
export TURBO_TOKEN="your-token-here"
export TURBO_TEAM="your-team-slug"

# Run build to test remote caching
npm run build

# Check for remote cache usage in output
# Look for "REMOTE CACHE" indicators in turbo output
```

#### CI Pipeline Verification
1. **Create a test PR** to trigger CI
2. **Monitor CI logs** for cache indicators:
   - First run: `MISS` (cache miss, builds and uploads)
   - Subsequent runs: `HIT` (cache hit, downloads cached results)

3. **Expected Output Examples:**
   ```
   build:lint: cache miss, executing abc123def
   build:typecheck: cache miss, executing def456ghi
   build:test: cache miss, executing ghi789jkl
   ```
   
   Then on subsequent runs:
   ```
   build:lint: cache hit, replaying logs abc123def
   build:typecheck: cache hit, replaying logs def456ghi
   build:test: cache hit, replaying logs ghi789jkl
   ```

## Performance Expectations

### Target Metrics
- **Cache Hit Ratio**: 70-90% for unchanged code
- **CI Time Reduction**: 50-70% on cache hits
- **Build Time**: ~30 seconds (vs 2-3 minutes without cache)
- **Test Time**: ~45 seconds (vs 1-2 minutes without cache)

### Monitoring
1. **CI Duration Tracking**
   - Monitor GitHub Actions run times
   - Compare before/after remote caching implementation
   - Track cache hit/miss ratios

2. **Vercel Dashboard**
   - Monitor cache usage in Vercel TurboRepo dashboard
   - Track bandwidth and storage usage
   - Review cache analytics

## Security Considerations

### Cache Signature Verification
- **Enabled**: `signature: true` in turbo.json
- **Purpose**: Prevents cache tampering and ensures integrity
- **Impact**: Slight overhead for signature verification vs. security benefit

### Token Security
- **Scope**: Limit token permissions to TurboRepo only
- **Rotation**: Rotate tokens periodically (quarterly recommended)
- **Access**: Restrict team member access to tokens

## Troubleshooting

### Common Issues

#### 1. Cache Misses Despite Unchanged Code
**Symptoms**: Always shows "cache miss" even for unchanged files
**Solutions**:
- Verify `TURBO_TOKEN` and `TURBO_TEAM` are correctly set
- Check token permissions in Vercel dashboard
- Ensure team slug matches exactly

#### 2. Authentication Errors
**Symptoms**: "Failed to authenticate with remote cache"
**Solutions**:
- Regenerate `TURBO_TOKEN` in Vercel
- Update GitHub secret with new token
- Verify team membership and permissions

#### 3. Slow Cache Downloads
**Symptoms**: Cache hits but slow performance
**Solutions**:
- Check network connectivity to Vercel
- Monitor Vercel status page
- Consider geographic cache distribution

### Debug Commands
```bash
# Enable verbose turbo logging
TURBO_LOG_VERBOSITY=2 npm run build

# Check turbo configuration
npx turbo run build --dry-run

# Test authentication
npx turbo login
```

## Integration Status

### Completed ✅
- [x] TurboRepo remote caching configuration
- [x] Security signature verification enabled
- [x] CI workflow integration
- [x] Environment variable setup

### Next Steps
1. **Monitor Performance**: Track CI time improvements over 1-2 weeks
2. **Optimize Cache Strategy**: Fine-tune cache outputs and dependencies
3. **Documentation Updates**: Update team onboarding with cache setup
4. **Analytics Review**: Regular review of cache hit ratios and performance

## Related Documentation
- [TurboRepo Monorepo Strategy](./monorepo-strategy.md)
- [CI/CD Pipeline Architecture](../architecture/ci-cd-pipeline.md)
- [Development Environment Setup](../development/docker-development-environment.md)

## References
- [TurboRepo Remote Caching Documentation](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Vercel TurboRepo Integration](https://vercel.com/docs/concepts/monorepos/turborepo)
- [TurboRepo Security Best Practices](https://turbo.build/repo/docs/handbook/deploying-with-docker#remote-caching)