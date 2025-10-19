# SPI-732: Code Reviewer CI Setup Guide

**Quick Reference**: Steps to enable the code-review agent in CI

## What Changed

The code-review agent CI workflow now has the permissions it needs to:
- ✅ Read Linear issues for acceptance criteria context
- ✅ Execute Gradle tests to verify code quality
- ✅ Perform comprehensive code review with evidence-based confidence scores

## Required Action: Add LINEAR_API_KEY Secret

**Time required**: 5 minutes

### Step 1: Generate Linear API Key

1. **Open Linear settings**:
   - Go to https://linear.app
   - Click your avatar (bottom left) → Settings
   - Navigate to: **Security & access** → **Personal API keys**

2. **Create new API key**:
   - Click **"Create new API key"**
   - Name: `GitHub Actions Code Reviewer` (for identification)
   - Scope: **Read-only** if available (or default workspace access)
   - Click **"Create"**

3. **Copy the key**:
   - Key format: `lin_api_XXXXXXXXXXXXXXXXXXXXXXXX`
   - **Important**: Copy immediately - it won't be shown again
   - Keep this tab open until you've added it to GitHub

### Step 2: Add Secret to GitHub Repository

1. **Open repository settings**:
   - Navigate to: https://github.com/[your-username]/cycletime/settings/secrets/actions
   - Or: Repository → Settings → Secrets and variables → Actions

2. **Create new secret**:
   - Click **"New repository secret"**
   - Name: `LINEAR_API_KEY` (exact match - case sensitive)
   - Value: Paste the Linear API key from Step 1
   - Click **"Add secret"**

3. **Verify**:
   - You should see `LINEAR_API_KEY` in the secrets list
   - Value will show as `***` (encrypted)

### Step 3: Test the Configuration

1. **Create a test PR**:
   ```bash
   # Create a test branch with a small change
   git checkout -b test/spi-732-code-reviewer
   echo "# Test" >> README.md
   git commit -am "test: verify code-reviewer CI access (SPI-732)"
   git push origin test/spi-732-code-reviewer
   ```

2. **Open PR on GitHub**:
   - Title: `test: Verify code-reviewer CI access (SPI-732)`
   - Description: Link to a Linear issue (e.g., `Implements SPI-732`)
   - Create pull request

3. **Monitor the workflow**:
   - Go to: Actions tab → "Claude Code Review" workflow
   - Watch for successful completion (green checkmark)
   - Check PR comments for review from code-reviewer agent

4. **Verify agent capabilities**:
   - Review comment should mention Linear issue details
   - Review should include test execution results (e.g., "Test Results: 861/861 passing")
   - Review should have confidence scores (Static Analysis + Test Verification)

### Expected Review Format

```
*sigh* Alright, let's see what we've got here...

📋 Linear Context:
Issue: SPI-732 - Fix CI Core Reviewer's Lack to Access
Status: In Review ✅
Epic: Infrastructure Improvements

📊 Review Assessment:
- Static Analysis: 9/10 (code patterns excellent, security good)
- Test Verification: 10/10 (861/861 passing, verified execution - see output below)
- Overall Confidence: 95% ✅ APPROVED

Test Evidence:
BUILD SUCCESSFUL in 45s
861 tests completed, 861 succeeded, 0 failed

[... detailed review feedback ...]

Look, the code needs work, but you're on the right track. Fix these issues and it'll be solid.
```

## Troubleshooting

### Error: "LINEAR_API_KEY not found"

**Cause**: Secret not added or name mismatch

**Fix**:
1. Verify secret name is exactly `LINEAR_API_KEY` (case sensitive)
2. Check secret exists in repository settings
3. Re-run workflow (new commits automatically trigger)

### Error: "MCP connection timeout"

**Cause**: Linear MCP server unreachable or API key invalid

**Fix**:
1. Verify API key is valid (test in Linear API explorer)
2. Check https://mcp.linear.app/sse is accessible
3. Review workflow logs for specific error message
4. Agent should degrade gracefully and perform code-only review

### Error: "Gradle execution failed"

**Cause**: Test failures or Gradle configuration issue

**Expected behavior**: Agent reports test failures in review and rejects PR

**Action**: Fix failing tests in your code

### Workflow doesn't run

**Cause**: Workflow trigger configuration or permissions

**Fix**:
1. Verify PR is from a branch in the same repository (forks don't get secrets)
2. Check workflow file is on the main branch
3. Verify ANTHROPIC_API_KEY secret exists
4. Check Actions are enabled in repository settings

## Security Notes

### What the LINEAR_API_KEY grants access to:

- ✅ Read all Linear issues in your workspace
- ✅ Read comments, labels, projects, teams
- ❌ **Cannot** create or modify issues
- ❌ **Cannot** delete data
- ❌ **Cannot** access other systems (GitHub, Slack, etc.)

### Best practices:

1. **Use read-only API key** if Linear offers scoped permissions
2. **Rotate quarterly**: Create new key, update secret, revoke old key
3. **Revoke immediately if**:
   - Workflow is disabled/removed
   - Key appears in logs (extremely unlikely - GitHub masks automatically)
   - Suspicious Linear API activity detected

4. **Monitor usage**:
   - Linear Settings → API → View API usage
   - Check for unexpected rate limit usage
   - Verify requests match PR review activity

### GitHub Actions security:

- ✅ Secrets encrypted at rest (AES-256)
- ✅ Secrets masked in logs (automatic `***` replacement)
- ✅ Fork PRs don't receive secrets (workflow fails safely)
- ✅ 30-minute timeout prevents runaway execution
- ✅ Read-only Linear access (no create/update operations)

## Rollback Instructions

If issues occur, revert the workflow changes:

```bash
git checkout main
git pull origin main

# Edit .github/workflows/claude-code-review.yml
# Restore original line 77:
#   --allowedTools "Bash(gh pr comment:*),Bash(gh pr diff:*),Bash(gh pr view:*)"
# Remove mcp_config section (lines 65-76)
# Remove timeout-minutes (line 59)

git commit -am "revert: restore original code-reviewer CI permissions (SPI-732 rollback)"
git push origin main
```

Agent will continue to work in limited mode (PR comments only, no Linear/test access).

## Performance Impact

**Expected review time**: 5-15 minutes
- Linear MCP connection: ~2-5 seconds
- Test execution: 30s (unit) to 13 min (comprehensive)
- Code analysis: 1-3 minutes

**CI parallelism**: No impact on build/deployment pipelines (separate workflow)

**Cost**: Standard GitHub Actions minutes + Claude API usage (per review)

## Questions?

- **Issue tracking**: Linear SPI-732
- **Implementation details**: `/docs/archive/SPI-732-research-report.md`
- **Workflow file**: `/.github/workflows/claude-code-review.yml`
- **Agent personality**: `/.claude/agents/code-reviewer.md`

---

**Status**: ✅ Implementation complete, awaiting LINEAR_API_KEY secret addition
