# SPI-732: CI Code Reviewer Access Investigation

**Issue**: Fix CI Core Reviewer's Lack to Access
**Status**: Research Complete
**Date**: 2025-10-18
**Investigator**: Claude Code (Primary), DevOps Engineer (Implementation)

## Executive Summary

The Code Review agent running in CI (`.github/workflows/claude-code-review.yml`) is severely restricted and cannot perform its core responsibilities. The agent requires access to run Gradle tests and read Linear issues, but currently has access to only three GitHub PR commands.

**Impact**: The code-review agent cannot:
- ✗ Execute test suites to verify code quality
- ✗ Read Linear issues to verify acceptance criteria
- ✗ Read source code files for comprehensive review
- ✗ Fulfill its documented responsibilities

## Current State Analysis

### 1. Code Review Agent Requirements

From `.claude/agents/code-reviewer.md`, the agent **must**:

1. **Before reviewing**: Read parent Epic, Story, and Subtasks from Linear
2. **Verify Linear status**: Check issue is in "In Review" status
3. **Execute tests**: Run `./gradlew test` and provide proof of execution
4. **Provide evidence**: Include actual test results (e.g., "Test Results: 861/861 passing (100%)")
5. **Read source code**: Perform thorough code analysis

Agent personality quote:
> "*sigh* Issue status isn't 'In Review' yet. We doing process or just cowboy coding today?"

### 2. Current Tool Restrictions

**File**: `.github/workflows/claude-code-review.yml` (line 77)

```yaml
claude_args: |
  --allowedTools "Bash(gh pr comment:*),Bash(gh pr diff:*),Bash(gh pr view:*)"
```

**Allowed tools**:
- ✓ `Bash(gh pr comment:*)` - Create PR comments
- ✓ `Bash(gh pr diff:*)` - View PR diffs
- ✓ `Bash(gh pr view:*)` - View PR details

**Missing tools**:
- ✗ `Read` - Cannot read source code files
- ✗ `Bash(./gradlew:*)` - Cannot execute Gradle tests
- ✗ `mcp__linear-server__*` - Cannot access Linear issues
- ✗ `Grep` - Cannot search codebase
- ✗ `Glob` - Cannot find files by pattern

### 3. Gradle Execution Requirements

**Gradle wrapper**: Executable, located at `/gradlew` (755 permissions)
**Java requirement**: JDK 21 (configured in CI via `actions/setup-java@v4`)
**Gradle version**: 9.1.0
**Required tasks**:
- `./gradlew test` - Unit tests (minimum requirement)
- `./gradlew integrationTest` - Integration tests (optional)
- `./gradlew testAll` - All test suites (comprehensive)

**CI already has**:
- ✓ JDK 21 setup (cicd.yml line 94-98)
- ✓ Gradle wrapper setup (cicd.yml line 100-101)
- ✓ Gradle permissions (cicd.yml line 224)

### 4. Linear MCP Integration Requirements

**Official Linear MCP Server**: https://mcp.linear.app/sse

**Authentication**: Requires `LINEAR_API_KEY` environment variable
- Personal API key from Linear Settings > Security & access > Personal API keys
- Store in GitHub Secrets as `LINEAR_API_KEY`

**Available Linear MCP tools** (from current local config):
- `mcp__linear-server__get_issue` - Retrieve issue details
- `mcp__linear-server__list_issues` - List/search issues
- `mcp__linear-server__list_comments` - Read issue comments
- `mcp__linear-server__get_team` - Get team information
- `mcp__linear-server__list_issue_statuses` - Check status values

**Required for code-reviewer**:
- `mcp__linear-server__get_issue` - Read parent Epic/Story/Subtask
- `mcp__linear-server__list_comments` - Understand discussion context

## Solution Design

### Phase 1: Expand Tool Access (Core Fix)

**Update `.github/workflows/claude-code-review.yml` line 77**:

```yaml
claude_args: |
  --allowedTools "Read,Grep,Glob,Bash(./gradlew:*),Bash(gh pr comment:*),Bash(gh pr diff:*),Bash(gh pr view:*),mcp__linear-server__get_issue,mcp__linear-server__list_comments,mcp__linear-server__list_issue_statuses"
```

**New capabilities**:
- `Read` - Read source files for code review
- `Grep` - Search codebase for patterns
- `Glob` - Find files by pattern
- `Bash(./gradlew:*)` - Execute Gradle wrapper commands
- `mcp__linear-server__get_issue` - Read Linear issues
- `mcp__linear-server__list_comments` - Read issue discussions
- `mcp__linear-server__list_issue_statuses` - Verify issue status

### Phase 2: Configure Linear MCP Server

**Add MCP configuration to workflow**:

```yaml
- name: Run Claude Code Review
  id: claude-review
  uses: anthropics/claude-code-action@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
    mcp_config: |
      {
        "mcpServers": {
          "linear": {
            "command": "npx",
            "args": ["-y", "mcp-remote", "https://mcp.linear.app/sse"],
            "env": {
              "LINEAR_API_KEY": "${{ secrets.LINEAR_API_KEY }}"
            }
          }
        }
      }
    claude_args: |
      --allowedTools "Read,Grep,Glob,Bash(./gradlew:*),Bash(gh pr comment:*),Bash(gh pr diff:*),Bash(gh pr view:*),mcp__linear-server__get_issue,mcp__linear-server__list_comments,mcp__linear-server__list_issue_statuses"
    prompt: |
      REPO: ${{ github.repository }}
      PR NUMBER: ${{ github.event.pull_request.number }}

      Please review this pull request with the following personality and approach:

      ${{ env.REVIEWER_PERSONALITY }}

      Note: The PR branch is already checked out in the current working directory.

      Use `gh pr comment` for top-level feedback.
      Only post GitHub comments - don't submit review text as messages.
    use_sticky_comment: true
```

### Phase 3: Add GitHub Secret

**Required action** (manual):
1. Navigate to repository Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Name: `LINEAR_API_KEY`
4. Value: Personal API key from Linear Settings > Security & access > Personal API keys
5. Click "Add secret"

**Security note**: Linear API key grants full access to Linear data - treat as sensitive credential.

## Available Claude Code Tools Reference

Based on research from official documentation and best practices:

### Core File System Tools
- `Read` / `ReadFile` - Read files from the file system
- `Write` / `WriteFile` - Create new files
- `Edit` / `MultiEdit` - Modify existing files
- `DeleteFile` - Remove files from the system

### Search and Navigation Tools
- `Grep` - Search through code using pattern matching
- `Glob` - Find files using pattern matching
- `LS` - List directory contents (preferred over shell ls)

### Command Execution
- `Bash` - Execute shell commands in the terminal
  - Permission syntax examples:
    - `Bash(*)` - Allow any bash command
    - `Bash(git:*)` - Allow git commands only
    - `Bash(./gradlew:*)` - Allow Gradle wrapper commands
    - `Bash(gh pr comment:*)` - Allow GitHub PR comments

### Package Management Tools
- `NPM` - Run npm commands for Node.js packages
- `Pip` - Execute pip commands for Python packages
- `Cargo` - Run cargo commands for Rust packages

### Testing Tools
- `Vitest` - Run Vitest test suites
- `Jest` - Run Jest test suites
- `Pytest` - Run Pytest test suites

### Additional Tools
- `TodoWrite` - Manage task lists and TODOs
- `WebFetch` / `WebSearch` - Access web resources and fetch content from URLs

## MCP Server Integration Reference

### What is MCP?

**Model Context Protocol (MCP)**: A standardized protocol for connecting AI models to external tools and data sources. It allows Claude Code to access services like Linear, GitHub, Slack, etc., through uniform interfaces.

### Linear MCP Server

**Official server**: https://mcp.linear.app/sse (remote MCP server)
**Released**: May 1, 2025
**Maintained by**: Linear (official)
**Authentication**: OAuth or Personal API Key

**Benefits of remote MCP**:
- ✓ No manual installation required
- ✓ Vendor handles updates and scaling
- ✓ OAuth support for enhanced security
- ✓ Centralized hosting and management

### MCP Configuration Format

**Structure**:
```json
{
  "mcpServers": {
    "server-name": {
      "command": "executable",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value"
      }
    }
  }
}
```

**Example - Linear via mcp-remote**:
```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.linear.app/sse"],
      "env": {
        "LINEAR_API_KEY": "lin_api_xxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

**Example - Local MCP server**:
```json
{
  "mcpServers": {
    "custom": {
      "command": "node",
      "args": ["custom-server.js"],
      "env": {
        "API_KEY": "secret_key"
      }
    }
  }
}
```

## Testing Verification

### Pre-Implementation Test

**Current state** (should fail):
```bash
# Trigger code review on a test PR
# Expected: Agent cannot read Linear issues or run tests
# Actual: Agent can only comment on PR using gh commands
```

### Post-Implementation Test

**Expected behavior**:
1. Agent reads Linear issue to get acceptance criteria
2. Agent verifies issue status is "In Review"
3. Agent reads source code files to understand changes
4. Agent executes `./gradlew test` to verify code quality
5. Agent provides comprehensive review with:
   - Static analysis score (X/10)
   - Test verification score (Y/10)
   - Overall confidence percentage
   - Test execution proof

**Success criteria**:
- ✓ Agent successfully reads Linear issue details
- ✓ Agent successfully executes Gradle tests
- ✓ Agent provides test execution proof in review
- ✓ Agent follows documented review process
- ✓ Agent maintains grumpy personality while being helpful

## Security Considerations

### API Key Management

**LINEAR_API_KEY**:
- ✓ Store in GitHub Secrets (encrypted at rest)
- ✓ Use Personal API Key (not OAuth app credentials)
- ✓ Scope limited to Linear data access (read-only preferred)
- ✓ Rotate periodically (recommended: quarterly)

### Tool Access Boundaries

**Bash permissions**:
- ✓ Restricted to specific commands (`./gradlew:*`, `gh pr:*`)
- ✓ No unrestricted shell access (`Bash(*)` not granted)
- ✓ Cannot modify repository directly (no write permissions)

**Linear access**:
- ✓ Limited to specific MCP tools (get_issue, list_comments, list_issue_statuses)
- ✓ Cannot create/update Linear issues from CI
- ✓ Read-only access pattern enforced

## Implementation Risks

### Low Risk
- ✓ Adding Read/Grep/Glob tools (standard code review needs)
- ✓ Gradle execution (already running in other CI jobs)
- ✓ Linear read-only access (no state modifications)

### Medium Risk
- ⚠️ MCP server configuration (new integration, verify reliability)
- ⚠️ API key exposure (mitigated by GitHub Secrets encryption)
- ⚠️ Test execution time (may increase PR review latency)

### Mitigation Strategies

**MCP server reliability**:
- Use Linear's official remote server (vendor-maintained)
- Add timeout configuration to prevent hanging
- Implement graceful degradation if Linear unreachable

**Performance optimization**:
- Run only unit tests (`./gradlew test`) initially
- Consider parallel execution if needed
- Set reasonable timeout limits (e.g., 10 minutes max)

## Timeline Estimate

**Phase 1**: Tool access expansion
- Development: 30 minutes
- Testing: 30 minutes
- Total: 1 hour

**Phase 2**: Linear MCP configuration
- Development: 1 hour
- GitHub Secret setup: 10 minutes
- Testing: 1 hour
- Total: 2 hours 10 minutes

**Phase 3**: Verification & documentation
- End-to-end testing: 1 hour
- Documentation update: 30 minutes
- Total: 1 hour 30 minutes

**Total estimated time**: 4 hours 40 minutes

## Success Metrics

**Quantitative**:
- [ ] Code-reviewer agent successfully reads Linear issues (100% success rate)
- [ ] Code-reviewer agent successfully executes tests (100% success rate)
- [ ] Test execution results included in PR reviews (100% of reviews)
- [ ] Review completion time < 10 minutes (90th percentile)

**Qualitative**:
- [ ] Reviews include acceptance criteria validation from Linear
- [ ] Reviews include test execution proof
- [ ] Reviews follow documented confidence assessment format
- [ ] Developer feedback indicates improved review quality

## Related Issues

- **SPI-732**: Fix CI Core Reviewer's Lack to Access (this issue)
- **SPI-XXX**: Future - Expand code-reviewer to integration tests
- **SPI-XXX**: Future - Add automated Linear status updates from reviews

## References

**Documentation**:
- Claude Code GitHub Actions: https://docs.claude.com/en/docs/claude-code/github-actions
- Linear MCP Server: https://linear.app/docs/mcp
- Model Context Protocol: https://modelcontextprotocol.io

**Code locations**:
- Workflow file: `.github/workflows/claude-code-review.yml`
- Agent config: `.claude/agents/code-reviewer.md`
- Main CI/CD: `.github/workflows/cicd.yml`

**Tools**:
- anthropics/claude-code-action@v1
- Linear MCP Remote Server: https://mcp.linear.app/sse
- Gradle wrapper: `./gradlew`

---

## Implementation Summary

**Status**: ✅ COMPLETED
**Date**: 2025-10-18
**Implementer**: DevOps Engineer Agent

### Changes Made

**File**: `.github/workflows/claude-code-review.yml`

**1. Added Tool Permissions** (line 96):
```yaml
--allowedTools "Read,Grep,Glob,Bash(gh pr comment:*),Bash(gh pr diff:*),Bash(gh pr view:*),Bash(./gradlew:*),mcp__linear-server__get_issue,mcp__linear-server__list_comments,mcp__linear-server__list_issue_statuses"
```

**New capabilities**:
- ✅ `Read` - Read source files for comprehensive code review
- ✅ `Grep` - Search codebase for patterns and anti-patterns
- ✅ `Glob` - Find files by pattern matching
- ✅ `Bash(./gradlew:*)` - Execute Gradle wrapper for test execution
- ✅ `mcp__linear-server__get_issue` - Read Linear issue details
- ✅ `mcp__linear-server__list_comments` - Read issue discussions
- ✅ `mcp__linear-server__list_issue_statuses` - Verify issue status

**2. Added Linear MCP Configuration** (lines 65-76):
```yaml
mcp_config: |
  {
    "mcpServers": {
      "linear": {
        "command": "npx",
        "args": ["-y", "mcp-remote", "https://mcp.linear.app/sse"],
        "env": {
          "LINEAR_API_KEY": "${{ secrets.LINEAR_API_KEY }}"
        }
      }
    }
  }
```

**3. Added Timeout Protection** (line 59):
```yaml
timeout-minutes: 30  # Prevent runaway test execution
```

**4. Added Security Comments** (lines 90-94):
Documented security boundaries and tool permissions inline.

### Security Analysis Results

**✅ Fork PR Protection**:
- Workflow uses `pull_request` trigger (line 4)
- Forks don't receive secrets (ANTHROPIC_API_KEY, LINEAR_API_KEY)
- Malicious gradlew in fork PRs cannot access credentials
- Workflow fails at authentication before test execution

**✅ Timeout Protection**:
- 30-minute timeout prevents DoS via infinite test loops
- Sufficient for comprehensive test suites (~13 min worst case)
- Prevents CI minute consumption attacks

**✅ Least-Privilege Access**:
- Read-only Linear access (no create/update operations)
- No unrestricted bash access (`Bash(*)` not granted)
- No file modification capabilities (Edit/Write not granted)
- Scoped to necessary operations only

**✅ Secrets Management**:
- GitHub Actions masks secrets in logs automatically
- LINEAR_API_KEY encrypted at rest in GitHub Secrets
- Standard industry practice for CI workflows

### Testing Plan

**Pre-Deployment Tests**:

1. **YAML Syntax Validation**:
   ```bash
   # Validate workflow syntax
   yamllint .github/workflows/claude-code-review.yml
   ```

2. **Mock PR Test** (after LINEAR_API_KEY added):
   - Create test PR linking to Linear issue in "In Review" status
   - Verify agent reads Linear issue successfully
   - Verify agent executes `./gradlew test`
   - Verify agent posts comprehensive review with test results
   - Verify timeout triggers if tests exceed 30 minutes

3. **Edge Case Tests**:
   - **No Linear Issue**: PR without issue link → graceful degradation
   - **Wrong Status**: Issue not "In Review" → note and proceed
   - **Test Failures**: Failing tests → reject with detailed output
   - **Linear Unreachable**: MCP server down → code-only review

**Success Criteria**:
- ✅ Agent successfully reads Linear issues (verified in review comments)
- ✅ Agent successfully executes tests (test results in review)
- ✅ Agent provides evidence-based confidence scores
- ✅ Agent maintains grumpy personality while being helpful
- ✅ Review completes within 30 minutes
- ✅ No secrets leaked in logs

### Required Manual Action

**⚠️ USER ACTION REQUIRED**: Add LINEAR_API_KEY to GitHub Secrets

**Steps**:
1. **Generate Linear API Key**:
   - Visit Linear: Settings > Security & access > Personal API keys
   - Click "Create new API key"
   - Name: `GitHub Actions Code Reviewer` (for tracking)
   - Scope: Read-only if available (or default workspace access)
   - Copy the generated key (starts with `lin_api_`)

2. **Add GitHub Secret**:
   - Navigate to repository: Settings > Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `LINEAR_API_KEY` (exact match required)
   - Value: Paste the Linear API key from step 1
   - Click "Add secret"

3. **Verify Configuration**:
   - Open a test PR linking to a Linear issue
   - Check workflow runs: Actions tab > Claude Code Review
   - Verify no authentication errors in logs
   - Verify agent reads Linear issue in review comment

**Security Notes**:
- LINEAR_API_KEY grants access to all Linear data in your workspace
- Treat as sensitive credential (equivalent to password)
- Rotate periodically (recommended: quarterly)
- Revoke immediately if exposed or workflow no longer needed
- GitHub encrypts secrets at rest and masks in logs

### Performance Expectations

**Review Latency**:
- Linear MCP connection: ~2-5 seconds
- Test execution: 30s (unit) to 13 min (all tests)
- Code analysis: 1-3 minutes
- **Total**: 5-15 minutes (acceptable for comprehensive review)

**CI Parallelism**:
- Runs separately from main CI (cicd.yml)
- No blocking of build/deployment pipelines
- Cancels previous reviews when new commits pushed (concurrency control)

### Rollback Plan

If issues occur, revert to read-only mode:

```yaml
# Emergency rollback - restore original restricted access
claude_args: |
  --allowedTools "Bash(gh pr comment:*),Bash(gh pr diff:*),Bash(gh pr view:*)"
```

Remove `mcp_config` section and `timeout-minutes` to restore original functionality.

---

**Implementation Complete**: Code-reviewer agent now has access to Linear issues and Gradle test execution. The agent can fulfill its documented responsibilities while maintaining security boundaries.
