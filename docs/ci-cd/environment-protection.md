# Environment Protection Rules

This document outlines how to configure GitHub environment protection rules for the CycleTime container promotion workflow.

## Environment Configuration

The promotion workflow uses GitHub Environments to control deployments:

- **staging**: Automatic promotion from dev (no approval required)
- **production**: Manual approval required for promotion from staging

## Setting Up Environment Protection

### 1. Create GitHub Environments

Navigate to your repository settings:

1. Go to **Settings** → **Environments**
2. Click **New environment** for each environment below

### 2. Staging Environment

**Name**: `staging`

**Protection Rules**:
- ✅ **Required reviewers**: None (automatic deployment)
- ✅ **Wait timer**: 0 minutes
- ✅ **Deployment protection rules**: None

**Environment Secrets** (if needed):
- Add staging-specific secrets like `STAGING_DATABASE_URL`

### 3. Production Environment  

**Name**: `production`

**Protection Rules**:
- ✅ **Required reviewers**: Select team leads/release managers
- ✅ **Wait timer**: 0 minutes (optional: add delay for scheduled deployments)
- ✅ **Deployment protection rules**: 
  - Require approval from designated reviewers
  - Optionally restrict to main branch only

**Environment Secrets** (if needed):
- Add production secrets like `PROD_DATABASE_URL`, `PROD_API_KEYS`

## Promotion Workflow Usage

### Valid Promotion Paths

The promotion workflow enforces these promotion paths:

```
dev → staging → production
```

**Invalid paths** (will fail validation):
- dev → production (must go through staging)
- staging → dev (reverse promotion not allowed)
- production → * (no promotion from production)

### Manual Promotion Example

1. **Promote from dev to staging** (automatic):
   ```yaml
   version: "1.2.3"
   source_env: "dev"  
   target_env: "staging"
   ```

2. **Promote from staging to production** (requires approval):
   ```yaml
   version: "1.2.3"
   source_env: "staging"
   target_env: "production"  
   ```

### Environment Tag Behavior

- **Mutable Tags**: Environment tags (`dev`, `staging`, `production`) always point to the currently deployed version
- **Immutable Tags**: Version tags (`1.2.3`) are permanent references to specific builds

## Container Registry Structure

```
ghcr.io/spiralhouse/cycletime:
├── 1.2.3              # Immutable version tag
├── 1.2.4-snapshot     # Development snapshot
├── latest             # Latest release version
├── dev                # Current dev deployment (mutable)
├── staging            # Current staging deployment (mutable)  
├── production         # Current production deployment (mutable)
└── sha-abc123         # Commit-specific tag
```

## Deployment Commands by Environment

### Development
```bash
# Always latest main branch build
docker pull ghcr.io/spiralhouse/cycletime:dev
docker run -p 8080:8080 ghcr.io/spiralhouse/cycletime:dev
```

### Staging  
```bash
# Latest version promoted to staging
docker pull ghcr.io/spiralhouse/cycletime:staging
docker run -p 8080:8080 ghcr.io/spiralhouse/cycletime:staging
```

### Production
```bash
# Latest version promoted to production (approved)
docker pull ghcr.io/spiralhouse/cycletime:production  
docker run -p 8080:8080 ghcr.io/spiralhouse/cycletime:production
```

### Specific Version
```bash
# Deploy exact version (for rollbacks)
docker pull ghcr.io/spiralhouse/cycletime:1.2.3
docker run -p 8080:8080 ghcr.io/spiralhouse/cycletime:1.2.3
```

## Rollback Strategy

### Quick Rollback (Environment Tag)
```bash
# Find previous production version
gh api repos/spiralhouse/cycletime/packages/container/cycletime/versions

# Promote previous version to production
gh workflow run promote.yml \
  -f version=1.2.2 \
  -f source_env=staging \
  -f target_env=production
```

### Immediate Rollback (Version Tag)
```bash
# Deploy previous version directly
docker pull ghcr.io/spiralhouse/cycletime:1.2.2
docker run -p 8080:8080 ghcr.io/spiralhouse/cycletime:1.2.2

# Then promote to fix environment tag
gh workflow run promote.yml \
  -f version=1.2.2 \
  -f source_env=staging \
  -f target_env=production
```

## Monitoring Deployments

### Check Current Environment Versions
```bash
# Check what's currently deployed
docker inspect ghcr.io/spiralhouse/cycletime:dev --format='{{.Config.Labels}}'
docker inspect ghcr.io/spiralhouse/cycletime:staging --format='{{.Config.Labels}}'  
docker inspect ghcr.io/spiralhouse/cycletime:production --format='{{.Config.Labels}}'
```

### Verify Promotion Success
```bash
# Check if tags point to the same image
docker images ghcr.io/spiralhouse/cycletime:1.2.3
docker images ghcr.io/spiralhouse/cycletime:production
# Image IDs should match after successful promotion
```

## Security Considerations

1. **Approval Requirements**: Production deployments require manual approval
2. **Branch Protection**: Ensure main branch has protection rules
3. **Secret Management**: Environment-specific secrets are isolated
4. **Audit Trail**: All promotions are logged in GitHub Actions
5. **Rollback Capability**: Always maintain ability to rollback quickly

## Troubleshooting

### Common Issues

**Promotion Validation Fails**:
- Check promotion path (dev→staging, staging→production only)
- Verify version exists in source environment
- Ensure GitHub environment is configured correctly

**Container Pull Fails**:
- Verify container registry access
- Check if version was actually promoted
- Ensure GitHub Container Registry authentication

**Approval Stuck**:
- Check if required reviewers are available  
- Verify environment protection rules are correct
- Check for any deployment protection rule conflicts