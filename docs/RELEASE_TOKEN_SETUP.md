# Release Please Token Setup

## Overview

For the automated release process to work fully, Release Please needs a token with sufficient permissions to:
1. Create pull requests with version bumps
2. Create GitHub releases
3. Trigger the release workflow when PRs are merged

## Current Configuration

The Release Please workflow is configured to use tokens in this order:
1. `RELEASE_PLEASE_TOKEN` (if configured) - Recommended
2. `GITHUB_TOKEN` (fallback) - Limited functionality

## Token Limitations

### GITHUB_TOKEN (Default)
The default `GITHUB_TOKEN` provided by GitHub Actions has limitations:
- ✅ Can create PRs
- ✅ Can read/write repository contents
- ❌ Cannot create labels (mitigated with `skip-labeling: true`)
- ❌ **Cannot trigger other workflows** (critical limitation)

**Important**: When using `GITHUB_TOKEN`, merging a Release Please PR will NOT trigger the release workflow that publishes artifacts and containers.

### Personal Access Token (Recommended)
A PAT with proper scopes can:
- ✅ Create PRs and releases
- ✅ Create labels
- ✅ **Trigger other workflows** (enables full automation)

## Setting Up RELEASE_PLEASE_TOKEN

### Step 1: Create a Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name: `Release Please Token for JCVD`
4. Set expiration (recommend 90 days with calendar reminder to rotate)
5. Select scopes:
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
6. Click "Generate token"
7. **Copy the token immediately** (you won't see it again)

### Step 2: Add Token to Repository Secrets

1. Go to your repository on GitHub
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `RELEASE_PLEASE_TOKEN`
5. Value: Paste the token from Step 1
6. Click "Add secret"

### Step 3: Verify Setup

After adding the token, the next push to main will use it automatically. You can verify by:
1. Checking the Release Please workflow logs
2. Confirming that merging a Release Please PR triggers the release workflow

## Security Best Practices

1. **Token Rotation**: Set a calendar reminder to rotate the token before expiration
2. **Minimal Scopes**: Only grant `repo` and `workflow` scopes
3. **Use GitHub App**: For production/organization use, consider a GitHub App instead of PAT
4. **Audit Access**: Regularly review who has access to repository secrets

## Alternative: GitHub App

For organization-wide usage, consider creating a GitHub App instead of using a PAT:
- Better security (app-specific permissions)
- No expiration issues
- Clearer audit trail
- Can be shared across multiple repositories

See [GitHub Apps documentation](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps) for setup instructions.

## Troubleshooting

### Release workflow not triggering
- **Symptom**: Release Please PR merges but release workflow doesn't run
- **Cause**: Using `GITHUB_TOKEN` instead of PAT
- **Solution**: Set up `RELEASE_PLEASE_TOKEN` as described above

### Permission errors
- **Symptom**: "Resource not accessible by integration" errors
- **Cause**: Token missing required scopes
- **Solution**: Ensure token has both `repo` and `workflow` scopes

### Token expiration
- **Symptom**: Release Please suddenly stops working
- **Cause**: PAT expired
- **Solution**: Generate new token and update secret

## Current Status

- ✅ Release Please workflow configured to use `RELEASE_PLEASE_TOKEN` if available
- ✅ Falls back to `GITHUB_TOKEN` for basic functionality
- ⚠️ Full automation requires `RELEASE_PLEASE_TOKEN` to be configured