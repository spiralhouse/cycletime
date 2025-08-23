# Production Deployment Approval Process

This document outlines the approval process, safety measures, and procedures for production deployments in the JCVD project.

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

For questions or issues with production deployments, contact the DevOps team or refer to the troubleshooting section above.