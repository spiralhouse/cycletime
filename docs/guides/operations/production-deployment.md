---
title: "Production Deployment Guide"
type: guide
domain: [cicd, operations, deployment, production]
description: "Production deployment approval process, safety measures, and procedures"
dependencies: [../../concepts/cicd/environment-concept.md]
related: [deployment-to-staging.md, release-process-guide.md, ../../reference/cicd/environment-specifications.md]
keywords: [production, deployment, approval, operations, security]
last_updated: 2025-10-19
---


This document outlines the approval process, safety measures, and procedures for production deployments in the CycleTime project.

## Overview

Production deployments require strict approval gates to ensure system stability, security, and compliance. All production promotions must be validated, approved, and audited.

## Approval Requirements

### Who Can Approve Production Deployments

Production deployments require approval from users with the following GitHub permissions:
- Repository administrators
- Users with "Maintain" or "Admin" role on the repository
- Members of teams explicitly granted production deployment permissions

### GitHub Environment Configuration

To set up the production approval gate:

1. **Navigate to Repository Settings**:
   - Go to `Settings` → `Environments` → `production`

2. **Configure Required Reviewers**:
   - Add specific users who can approve production deployments
   - Require at least 1 reviewer for production deployments
   - Optionally enable "Restrict pushes to protected branches"

3. **Set Environment Protection Rules**:
   - Enable "Required reviewers" with at least 1 required reviewer
   - Consider enabling "Wait timer" for additional safety (optional)
   - Enable "Deployment branches" to restrict which branches can deploy

4. **Environment Secrets** (if needed):
   - Add production-specific secrets
   - Configure environment variables for production

## Pre-Approval Safety Checks

Before a production deployment can be approved, the following automated checks must pass:

### 1. Version Validation
- ✅ Version must exist in the container registry
- ✅ Version must currently be deployed to staging
- ✅ Image integrity verification (digest matching)

### 2. Staging Requirements
- ✅ Version must have been in staging for minimum required time (default: 24 hours)
- ✅ Staging deployment must be successful and stable
- ✅ No critical issues reported in staging environment

### 3. Production Justification
- ✅ **Mandatory**: Justification must be provided explaining why production deployment is needed
- ✅ Justification should include:
  - Business reason for deployment
  - Risk assessment and mitigation
  - Expected impact on users

### 4. Safety Validations
- ✅ Previous production version recorded for rollback capability
- ✅ Container digest verification (prevents tampering)
- ✅ Final staging validation before promotion

## Approval Checklist

When reviewing a production deployment request, approvers should verify:

### Technical Requirements ✅
- [ ] All automated safety checks have passed
- [ ] Version has been adequately tested in staging
- [ ] No known critical issues with the version
- [ ] Rollback plan is clear and feasible

### Business Requirements ✅
- [ ] Deployment justification is clear and valid
- [ ] Business impact assessment is reasonable
- [ ] Timing is appropriate (avoid peak usage periods)
- [ ] Stakeholders have been notified if needed

### Risk Assessment ✅
- [ ] Change risk level is appropriate for the deployment window
- [ ] Rollback procedures are tested and ready
- [ ] Monitoring and alerting are in place
- [ ] Support team is prepared for potential issues

### Compliance Requirements ✅
- [ ] Audit trail requirements are satisfied
- [ ] Change management procedures are followed
- [ ] Security reviews completed if required
- [ ] Documentation is updated

## Emergency Deployment Procedures

For critical security fixes or high-priority production issues:

### Fast-Track Process
1. **Reduce staging time**: Set `min_staging_time_hours: 0` to skip minimum staging time
2. **Expedited review**: Tag emergency reviewers for immediate attention
3. **Enhanced justification**: Provide detailed emergency justification
4. **Additional monitoring**: Implement enhanced monitoring during deployment

### Emergency Justification Requirements
Emergency deployments must include:
- Clear description of the issue being addressed
- Risk assessment of NOT deploying immediately
- Impact analysis of the emergency deployment
- Post-deployment validation plan

## Rollback Procedures

### When to Rollback
- Critical functionality failures
- Performance degradation beyond acceptable thresholds
- Security vulnerabilities introduced
- Data integrity issues
- User experience significantly impacted

### How to Rollback
1. **Immediate Rollback**: Re-run the promotion workflow with the previous production version
2. **Verify Rollback**: Ensure rollback version is functioning correctly
3. **Monitor**: Watch system metrics and user feedback
4. **Communicate**: Notify stakeholders of the rollback and next steps

### Rollback Example
```bash
# To rollback to previous production version 1.2.3:
# 1. Go to GitHub Actions → Environment Promotion workflow
# 2. Click "Run workflow"
# 3. Set parameters:
#    - version: "1.2.3"
#    - source_env: "staging"
#    - target_env: "production"
#    - min_staging_time_hours: "0"
#    - promotion_justification: "Rollback due to [issue description]"
```

## Audit and Compliance

### Audit Trail
Every production deployment creates a comprehensive audit record including:
- **Timestamp**: Exact time of approval and deployment
- **Approver**: GitHub user who approved the deployment
- **Version**: Exact version being deployed
- **Previous Version**: Version being replaced (for rollback)
- **Justification**: Business reason for deployment
- **Workflow Run**: Link to complete deployment logs
- **Git SHA**: Source code reference

### Audit Record Format
```json
{
  "timestamp": "2024-01-15 14:30:00 UTC",
  "version": "1.4.2",
  "previous_version": "1.4.1",
  "approver": "john.smith",
  "justification": "Critical security patch for CVE-2024-12345",
  "workflow_run": "123456789",
  "git_sha": "abc123def456"
}
```

### Compliance Requirements
- All production deployments are automatically logged
- Audit records are immutable and permanently stored
- Compliance reports can be generated from workflow history
- Access to production deployment approvals is restricted and logged

## Monitoring and Alerting

### Post-Deployment Monitoring
After production deployment:
1. **Immediate Validation** (0-5 minutes):
   - Application starts successfully
   - Health checks pass
   - Basic functionality verified

2. **Short-term Monitoring** (5-30 minutes):
   - Performance metrics stable
   - Error rates within normal ranges
   - User experience validated

3. **Extended Monitoring** (30 minutes - 2 hours):
   - System stability confirmed
   - No unexpected side effects
   - User feedback monitored

### Alerting Thresholds
- **Critical**: Immediate notification for failures requiring rollback
- **Warning**: Performance degradation requiring investigation
- **Info**: Deployment progress and completion notifications

## Best Practices

### Timing
- **Preferred Windows**: Low-traffic periods (early morning, weekends)
- **Avoid**: Peak usage times, holidays, end-of-month processing
- **Plan**: Schedule deployments with adequate support coverage

### Communication
- **Pre-deployment**: Notify stakeholders of planned deployment
- **During deployment**: Provide status updates if needed
- **Post-deployment**: Confirm successful completion and any issues

### Risk Mitigation
- **Feature Flags**: Use feature toggles for high-risk changes
- **Blue-Green**: Consider blue-green deployment for zero-downtime updates
- **Canary**: Gradual rollout for significant changes
- **Testing**: Comprehensive staging validation before production

## Troubleshooting

### Common Issues

#### Approval Not Triggering
- Verify environment protection rules are configured
- Check user has required permissions
- Ensure workflow targets the correct environment name

#### Safety Checks Failing
- **Version not in staging**: Deploy to staging first
- **Insufficient staging time**: Wait for minimum time or adjust requirement
- **Missing justification**: Provide clear deployment reasoning

#### Deployment Failures
- **Container registry issues**: Verify image accessibility and integrity
- **Permission errors**: Check GitHub token and registry permissions
- **Network timeouts**: Retry deployment or investigate connectivity

### Support Contacts
- **Primary**: DevOps team via Slack #devops-alerts
- **Secondary**: On-call engineer via PagerDuty
- **Emergency**: Engineering manager for critical issues

---

## Summary

Production deployments are critical operations requiring careful validation, approval, and monitoring. By following these procedures, we ensure system stability while maintaining development velocity and regulatory compliance.

For questions or issues with production deployments, contact the DevOps team or refer to the troubleshooting section above.# Environment Protection Rules

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