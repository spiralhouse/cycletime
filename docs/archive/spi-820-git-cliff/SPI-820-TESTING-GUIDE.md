# SPI-820 Testing Guide: git-cliff Release Notes

**Purpose**: Step-by-step guide for testing git-cliff integration before and after CI/CD implementation

---

## Prerequisites

### Install git-cliff

**macOS (Homebrew)**:
```bash
brew install git-cliff
```

**Cross-platform (Cargo)**:
```bash
cargo install git-cliff
```

**Verify Installation**:
```bash
git-cliff --version
# Expected: git-cliff 2.x.x
```

---

## Phase 1: Local Configuration Testing

### Test 1: Generate Release Notes for Current State

**Command**:
```bash
cd /Users/jburbridge/Projects/cycletime
git-cliff --config cliff.toml --latest --strip header
```

**Expected Output**:
```markdown
## [0.2.0] - 2025-01-XX

### ✨ User Interface
- **ui**: Implement settings and system status placeholder pages ([SPI-839](https://linear.app/spiral-house/issue/SPI-839))
- **ui**: Implement hierarchical issue list mockup with HTMX expansion ([SPI-838](https://linear.app/spiral-house/issue/SPI-838)) ([#171](https://github.com/spiralhouse/cycletime/pull/171))
...

### 🐛 Bug Fixes - MCP
- **mcp**: Resolve HTTP 406 error on GET /mcp SSE endpoint ([SPI-766](https://linear.app/spiral-house/issue/SPI-766)) ([#152](https://github.com/spiralhouse/cycletime/pull/152))

### 📦 Dependencies
- **deps**: Bump kotest from 6.0.3 to 6.0.4 ([#162](https://github.com/spiralhouse/cycletime/pull/162))
...
```

**Validation Checklist**:
- [ ] Commits categorized by type (Features, Bug Fixes, etc.)
- [ ] Icons displayed (✨, 🐛, 📦, etc.)
- [ ] Scopes shown in bold (ui, mcp, dashboard)
- [ ] PR links formatted: `[#123](https://github.com/spiralhouse/cycletime/pull/123)`
- [ ] Linear links formatted: `[SPI-456](https://linear.app/spiral-house/issue/SPI-456)`
- [ ] Dependencies grouped separately
- [ ] Chore/style commits NOT present
- [ ] No syntax errors

### Test 2: Verify Postprocessor Link Generation

**Command**:
```bash
git-cliff --config cliff.toml --latest --strip header | grep -E '\[#[0-9]+\]\(|SPI-[0-9]+\]\(' | head -10
```

**Expected**: Lines with clickable links
```
- **ui**: Implement ... ([SPI-839](https://linear.app/spiral-house/issue/SPI-839))
- **ui**: Implement ... ([#171](https://github.com/spiralhouse/cycletime/pull/171))
```

**Validation**:
- [ ] PR numbers converted to links: `(#123)` → `([#123](https://github.com/...))`
- [ ] Linear issues converted: `SPI-456` → `[SPI-456](https://linear.app/...)`

### Test 3: Verify Commit Filtering

**Command**:
```bash
# Check for chore commits (should be absent)
git log --pretty=format:"%s" | grep "^chore:" | head -5
# Note the commit messages

git-cliff --config cliff.toml --latest --strip header | grep -i "chore"
# Expected: No results (chore commits filtered out)
```

**Validation**:
- [ ] chore commits NOT in release notes
- [ ] style commits NOT in release notes

### Test 4: Verify Dependency Grouping

**Command**:
```bash
git-cliff --config cliff.toml --latest --strip header | grep -A 10 "Dependencies"
```

**Expected**:
```markdown
### 📦 Dependencies
- **deps**: Bump kotest from 6.0.3 to 6.0.4 ...
- **deps**: Bump kotlin from 2.2.20 to 2.2.21 ...
...
```

**Validation**:
- [ ] All build(deps) commits grouped under "Dependencies"
- [ ] "deps" scope automatically added
- [ ] Separate from main feature sections

### Test 5: Verify Breaking Change Detection

**Setup**: Create test commit with breaking change
```bash
# Create test branch
git checkout -b test/breaking-change

# Create breaking change commit
git commit --allow-empty -m "feat(api)!: remove deprecated endpoint

BREAKING CHANGE: The /v1/sessions endpoint has been removed.
Use /v2/sessions instead."

# Generate changelog
git-cliff --config cliff.toml --unreleased --strip header

# Cleanup
git checkout main
git branch -D test/breaking-change
```

**Expected Output**:
```markdown
### 🚨 BREAKING CHANGES
- [**breaking**] **api**: Remove deprecated endpoint
```

**Validation**:
- [ ] Breaking change appears in "🚨 BREAKING CHANGES" section
- [ ] Section appears FIRST (before features)
- [ ] "[**breaking**]" label present
- [ ] Commit message included

### Test 6: Generate Between Specific Tags

**Command**:
```bash
git-cliff --config cliff.toml v0.1.0..v0.2.0
```

**Expected**: Release notes ONLY for commits between v0.1.0 and v0.2.0

**Validation**:
- [ ] Version header shows: `## [0.2.0] - YYYY-MM-DD`
- [ ] Only commits in range included
- [ ] Format consistent with `--latest` output

### Test 7: First Release Simulation

**Command**:
```bash
# Backup existing tags
git tag > /tmp/cycletime-tags-backup.txt

# Delete all tags (local only)
git tag -d $(git tag -l)

# Generate changelog (simulates first release)
git-cliff --config cliff.toml --latest --strip header

# Verify output includes early commits
head -20 CHANGELOG.md

# Restore tags
cat /tmp/cycletime-tags-backup.txt | xargs git tag

# Cleanup
rm /tmp/cycletime-tags-backup.txt
```

**Expected**: Changelog includes commits from initial commit to HEAD

**Validation**:
- [ ] No errors about missing tags
- [ ] All commits since first commit included
- [ ] Proper categorization maintained

---

## Phase 2: CI/CD Integration Testing

### Prerequisite: Update cicd.yml

**Before testing CI**, ensure `.github/workflows/cicd.yml` has been updated per SPI-820-DESIGN.md Section 3.3.

### Test 8: Manual Workflow Dispatch (Dry Run)

**Setup**:
1. Create test branch: `feat/spi-820-test-integration`
2. Commit cliff.toml and cicd.yml changes
3. Push to origin
4. Merge to main

**Trigger**:
```bash
# Via GitHub UI: Actions → CI/CD Pipeline → Run workflow
# OR via gh CLI:
gh workflow run cicd.yml \
  --ref main \
  --field skip_release=false
```

**Monitor**:
```bash
# Watch workflow execution
gh run watch

# Check release job logs
gh run view --log | grep -A 20 "git-cliff"
```

**Validation**:
- [ ] git-cliff step completes successfully
- [ ] No errors in "Generate changelog with git-cliff" step
- [ ] CHANGELOG.md captured and deleted
- [ ] No CHANGELOG.md in git history: `git log --all --full-history -- CHANGELOG.md` (should be empty)

### Test 9: Create Test Release

**Setup**:
```bash
# Create test commit on main
git checkout main
git commit --allow-empty -m "feat(test): validate git-cliff integration (SPI-820)"
git push origin main

# CI will auto-create v0.X.X tag
# Wait for release job to complete
```

**Validation**:
1. **GitHub Release Created**:
   - Navigate to: https://github.com/spiralhouse/cycletime/releases
   - Latest release should have formatted release notes

2. **Release Notes Format**:
   ```markdown
   ## [0.X.X] - 2025-XX-XX

   ### ✨ Features
   - **test**: Validate git-cliff integration ...

   <!-- generated by git-cliff -->
   ```

3. **Links Functional**:
   - Click PR links (if any): should navigate to GitHub PR
   - Click Linear links: should navigate to Linear issue

4. **No CHANGELOG.md in Git**:
   ```bash
   git log --all --full-history -- CHANGELOG.md
   # Expected: No commits found

   git show HEAD:CHANGELOG.md
   # Expected: fatal: path 'CHANGELOG.md' does not exist
   ```

**Validation Checklist**:
- [ ] GitHub Release created automatically
- [ ] Release notes categorized with icons
- [ ] PR links clickable and correct
- [ ] Linear links clickable and correct
- [ ] Breaking changes (if any) appear first
- [ ] Dependencies (if any) in separate section
- [ ] Build artifacts attached (JARs, distributions)
- [ ] NO CHANGELOG.md committed to git
- [ ] Footer shows "generated by git-cliff"

### Test 10: Verify Empty Release Handling

**Setup**:
```bash
# Create release with only filtered commits
git commit --allow-empty -m "chore: internal maintenance"
git commit --allow-empty -m "ci: update workflow"
git commit --allow-empty -m "style: format code"
git push origin main

# Manually create tag (or wait for next feat commit)
git tag v0.X.X-empty
git push origin v0.X.X-empty
```

**Expected Behavior**:
- Release created with minimal content
- Message: "_No user-facing changes in this release._"
- OR: Infrastructure-focused message

**Validation**:
- [ ] Release created (not skipped)
- [ ] Graceful handling of empty commits
- [ ] No errors in CI logs

---

## Phase 3: Production Validation

### Test 11: Monitor First Real Release

**After deployment to production**:

1. **Wait for next feat/fix commit** to main
2. **CI auto-creates version tag** (e.g., v0.3.0)
3. **Release job runs** with git-cliff

**Validation Points**:
- [ ] Release notes generated automatically
- [ ] Formatting matches expected output
- [ ] All links functional
- [ ] No manual intervention required
- [ ] Development team satisfied with format

### Test 12: Stakeholder Review

**Share release notes link** with:
- Product team
- QA team
- External users (if public release)

**Collect Feedback**:
- Is categorization intuitive?
- Are icons helpful or distracting?
- Is breaking change highlighting sufficient?
- Are dependencies too verbose?

**Iterate on cliff.toml** based on feedback

---

## Phase 4: Regression Testing

### Test 13: Configuration Changes

**Scenario**: Update cliff.toml (e.g., add new commit type)

**Process**:
1. Modify cliff.toml locally
2. Test with: `git-cliff --config cliff.toml --latest --strip header`
3. Verify changes take effect
4. Commit and push
5. Wait for next release to validate in CI

**Example Configuration Change**:
```toml
# Add new commit type
{ message = "^feat\\(graphql\\)", group = "✨ GraphQL API" },
```

**Validation**:
- [ ] Local testing shows new grouping
- [ ] CI picks up updated configuration
- [ ] Next release reflects changes

### Test 14: Rollback Validation

**Scenario**: Simulate git-cliff failure requiring rollback

**Process**:
1. Review rollback plan (SPI-820-DESIGN.md Section 10)
2. Intentionally break cliff.toml (syntax error)
3. Trigger release
4. Observe failure
5. Execute rollback procedure
6. Verify old changelog generation works

**Validation**:
- [ ] Rollback procedure documented is accurate
- [ ] Recovery time < 10 minutes
- [ ] Old system functional after rollback

---

## Troubleshooting

### Issue: git-cliff command not found

**Solution**:
```bash
# Install git-cliff
brew install git-cliff  # macOS
# OR
cargo install git-cliff  # Cross-platform

# Verify
git-cliff --version
```

### Issue: TOML syntax error

**Symptom**: `Error parsing config file: invalid TOML`

**Solution**:
1. Validate TOML syntax: https://www.toml-lint.com/
2. Check for unescaped special characters
3. Verify quote matching in patterns

**Example Fix**:
```toml
# WRONG: Unescaped backslash
{ pattern = '\(#([0-9]+)\)' }

# CORRECT: Escaped backslash
{ pattern = '\\(#([0-9]+)\\)' }
```

### Issue: Links not generated

**Symptom**: Raw text `(#123)` instead of `[#123](link)`

**Debug**:
```bash
# Test postprocessors
git-cliff --config cliff.toml --latest --strip header | grep "(#"
```

**Solution**: Verify postprocessor patterns in cliff.toml

### Issue: Commits not categorized

**Symptom**: All commits in "📝 Other Changes"

**Debug**:
```bash
# Check commit messages
git log --pretty=format:"%s" -20

# Test against patterns
git-cliff --config cliff.toml --latest --strip header -vv
```

**Solution**: Update commit_parsers regex patterns

### Issue: Empty release notes

**Symptom**: Only header generated

**Possible Causes**:
1. All commits filtered (chore/style)
2. No commits since last tag
3. Tag range misconfigured

**Debug**:
```bash
# Check commits in range
git log --pretty=format:"%s" $(git describe --tags --abbrev=0)..HEAD

# Generate with verbose output
git-cliff --config cliff.toml --latest --strip header -vv
```

### Issue: CHANGELOG.md committed to git

**Critical Error** - Immediate action required

**Detection**:
```bash
git log --all --full-history -- CHANGELOG.md
```

**Recovery**:
```bash
# Remove from git history (CAREFUL!)
git filter-branch --index-filter 'git rm --cached --ignore-unmatch CHANGELOG.md' HEAD

# Force push (coordination required)
git push origin main --force

# Verify removal
git log --all --full-history -- CHANGELOG.md
```

**Prevention**: Add `.gitignore` entry (safety net)
```bash
echo "CHANGELOG.md" >> .gitignore
git add .gitignore
git commit -m "chore: add CHANGELOG.md to .gitignore (safety net)"
```

---

## Success Criteria

### Configuration Testing ✅

- [ ] Local git-cliff execution successful
- [ ] Commits categorized correctly
- [ ] Icons displayed
- [ ] Links generated (PR and Linear)
- [ ] Filtering works (chore/style excluded)
- [ ] Breaking changes detected
- [ ] Dependencies grouped

### CI/CD Integration ✅

- [ ] git-cliff-action step completes
- [ ] Temporary CHANGELOG.md captured and deleted
- [ ] GitHub Release created with formatted notes
- [ ] NO CHANGELOG.md in git history
- [ ] Build artifacts attached

### Production Validation ✅

- [ ] First automated release successful
- [ ] Formatting matches expectations
- [ ] Stakeholder feedback positive
- [ ] No manual intervention required
- [ ] Rollback procedure verified

---

## Testing Completion Sign-Off

**Local Testing Completed**: ____ / ____ / ____
**Tester**: ______________________

**CI Testing Completed**: ____ / ____ / ____
**Tester**: ______________________

**Production Validated**: ____ / ____ / ____
**Approver**: ______________________

**Issues Identified**:
- [ ] None
- [ ] Minor (documented below)
- [ ] Major (requires design revision)

**Notes**:
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

---

## Next Steps After Testing

1. **If all tests pass**:
   - Approve SPI-820 for production deployment
   - Merge cliff.toml and cicd.yml changes to main
   - Monitor first 3 automated releases
   - Collect stakeholder feedback

2. **If issues found**:
   - Document issues in Linear (SPI-820)
   - Update cliff.toml configuration
   - Re-run failed tests
   - Iterate until all tests pass

3. **After successful deployment**:
   - Update project documentation
   - Share release notes format with team
   - Schedule cliff.toml review (3 months)
   - Plan future enhancements

---

**Testing Guide Version**: 1.0
**Last Updated**: 2025-01-30
**Related Documents**:
- SPI-820-DESIGN.md (comprehensive design)
- SPI-820-SUMMARY.md (implementation summary)
- cliff.toml (configuration)
