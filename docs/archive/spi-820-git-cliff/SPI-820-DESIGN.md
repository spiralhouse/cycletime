# SPI-820: Beautiful Release Notes with git-cliff

**Status**: Design Complete - Ready for Implementation
**Priority**: Enhancement
**Complexity**: Moderate (8 points)

---

## Executive Summary

Integration of git-cliff for automated, beautiful, icon-based release note generation in CycleTime CE. This replaces the basic changelog generation (lines 1030-1050 in cicd.yml) with a sophisticated conventional commit parser that produces GitHub Releases with categorized, formatted, and linked release notes.

**Key Constraint**: NO CHANGELOG.md file should ever be committed to git history. Release notes exist ONLY in GitHub Release bodies.

---

## 1. Current State Analysis

### 1.1 Existing Versioning System
```kotlin
// build.gradle.kts
semver {
    releasePattern = "\\Arelease(?:\\([^()]+\\))?:"
    majorPattern = "\\A\\w+(?:\\([^()]+\\))?!:|^BREAKING[ -]CHANGE:"
    minorPattern = "\\Afeat(?:\\([^()]+\\))?:"
    patchPattern = "\\Afix(?:\\([^()]+\\))?:"
    groupVersionIncrements = true
}
```

**Behavior**:
- git-semver-plugin calculates next version based on conventional commits
- CI auto-creates tags for feat/fix/perf commits on main branch
- Version format: MAJOR.MINOR.PATCH (e.g., v0.2.0)

### 1.2 Current Changelog Generation (Basic)
```yaml
# .github/workflows/cicd.yml (lines 1030-1050)
- name: Generate changelog
  id: changelog
  run: |
    last_tag=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
    if [ -z "$last_tag" ]; then
      commits=$(git log --pretty=format:"- %s (%h)" HEAD | head -20)
    else
      commits=$(git log --pretty=format:"- %s (%h)" ${last_tag}..HEAD)
    fi
    changelog="## What's Changed"$'\n'
    changelog+="$commits"$'\n'$'\n'
    changelog+="**Full Changelog**: https://github.com/${{ github.repository }}/compare/${last_tag}...v${{ needs.version.outputs.version }}"
```

**Issues**:
- No categorization by commit type
- No icon-based visual organization
- No breaking change highlighting
- No PR/issue linking
- No contributor attribution
- Raw commit list with hashes

### 1.3 Commit Pattern Analysis (Last 50 Commits)

**Commit Type Distribution**:
```
feat (scope):          ~60%  (ui, dashboard, mcp, design-system, docs)
build(deps):           ~15%  (Dependabot updates)
fix (scope):           ~10%  (mcp, cache, ui)
ci:                    ~5%   (workflow improvements)
docs:                  ~5%   (documentation updates)
refactor:              ~3%   (code refactoring)
chore:                 ~2%   (maintenance)
```

**Scopes Used**: ui, dashboard, mcp, design-system, docs, cache, deps

**Contributors**:
- John Burbridge <johnburbridge@gmail.com>
- dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>

### 1.4 Existing Version Tags
```
phase-c-checkpoint  (legacy)
v0.1.0              (production)
v0.2.0              (current)
```

---

## 2. Requirements Analysis

### 2.1 Functional Requirements

**FR1: Categorized Release Notes**
- Group commits by type with icon-based visual hierarchy
- Priority order: Breaking Changes → Features → Bug Fixes → Performance → Security → Documentation → Other

**FR2: Visual Organization**
```
🚨 BREAKING CHANGES
✨ Features
  ✨ User Interface
  ✨ Dashboard
  ✨ MCP Integration
  ✨ Features (general)
🐛 Bug Fixes
  🐛 Bug Fixes - MCP
  🐛 Bug Fixes - UI
  🐛 Bug Fixes (general)
⚡ Performance Improvements
🔒 Security
📚 Documentation
♻️ Code Refactoring
🧪 Testing
📦 Build System
⚙️ Continuous Integration
📦 Dependencies (collapsed by default)
```

**FR3: Linking and Attribution**
- Auto-link to PRs: `(#123)` → `([#123](https://github.com/...)`
- Auto-link to Linear: `SPI-456` → `[SPI-456](https://linear.app/...)`
- Show commit SHA for traceability
- Contributor attribution

**FR4: Breaking Change Handling**
- Detect: `feat!:`, `fix!:`, `BREAKING CHANGE:` in commit body
- Display at top of release notes with warning icon
- Highlight in bold

**FR5: Noise Filtering**
- Skip: chore, style commits (internal maintenance)
- Collapse: build(deps) into separate "Dependencies" section
- Conditionally show: ci, build (only if significant)

### 2.2 Non-Functional Requirements

**NFR1: No Git History Pollution**
- CRITICAL: Never commit CHANGELOG.md to repository
- Release notes exist ONLY in GitHub Release body
- git-cliff runs in CI, outputs directly to release creation

**NFR2: Integration Compatibility**
- Must work with existing git-semver-plugin
- Must work with existing auto-tagging workflow
- Must handle first release (no previous tag)
- Must handle empty releases gracefully

**NFR3: Performance**
- Changelog generation should add < 10 seconds to release job
- Use GitHub Actions cache if possible

**NFR4: Maintainability**
- Configuration in cliff.toml (version controlled)
- Easy to customize commit groups and icons
- Clear documentation for future maintainers

---

## 3. Technical Design

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub Actions Workflow                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Version Job (existing)                                        │
│     ├─ Auto-create version tag (feat/fix/perf commits)          │
│     ├─ git-semver-plugin calculates version                      │
│     └─ Output: version, is_release flags                         │
│                                                                   │
│  2. Build Job (existing)                                          │
│     ├─ Build application JAR                                     │
│     └─ Upload build artifacts                                    │
│                                                                   │
│  3. Release Job (MODIFIED)                                        │
│     ├─ Checkout with full history (fetch-depth: 0)              │
│     ├─ Install git-cliff (orhun/git-cliff-action@v4)            │
│     ├─ Generate release notes:                                   │
│     │  ├─ Read cliff.toml configuration                          │
│     │  ├─ Parse conventional commits since last tag              │
│     │  ├─ Apply categorization and filtering rules              │
│     │  ├─ Generate formatted markdown with icons                │
│     │  └─ Apply postprocessors (links, issue refs)              │
│     ├─ Download build artifacts                                  │
│     └─ Create GitHub Release:                                    │
│        ├─ Tag: v$VERSION                                         │
│        ├─ Title: Release $VERSION                                │
│        ├─ Body: git-cliff output (NO FILE CREATED)              │
│        └─ Attachments: JARs, distributions                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 git-cliff Configuration (cliff.toml)

**Location**: `/cliff.toml` (repository root, version controlled)

**Key Design Decisions**:

1. **Commit Parser Priority Order**:
   ```
   1. Breaking Changes (highest priority)
   2. User-Facing Changes (feat, fix, perf, security)
   3. Developer-Facing Changes (docs, refactor, test)
   4. Infrastructure Changes (build, ci)
   5. Dependencies (build(deps) - collapsed)
   6. Filtered Out (chore, style - skip=true)
   ```

2. **Scope-Based Sub-Grouping**:
   - `feat(ui)` → "✨ User Interface" (separate group)
   - `feat(dashboard)` → "✨ Dashboard" (separate group)
   - `feat(mcp)` → "✨ MCP Integration" (separate group)
   - `feat` → "✨ Features" (catch-all)

3. **Postprocessors**:
   ```toml
   postprocessors = [
     { pattern = '\(#([0-9]+)\)', replace = "([#$1](https://github.com/spiralhouse/cycletime/pull/$1))" },
     { pattern = 'SPI-([0-9]+)', replace = "[SPI-$1](https://linear.app/spiral-house/issue/SPI-$1)" },
   ]
   ```

4. **Breaking Change Detection**:
   - Regex: `^\\w+\\(.*\\)!:` or `^\\w+!:` or `^BREAKING[ -]CHANGE:`
   - Group: "🚨 BREAKING CHANGES" (appears first)
   - Automatic bold formatting

### 3.3 CI/CD Workflow Changes

**File**: `.github/workflows/cicd.yml`

**Changes to Release Job (lines 1010-1072)**:

```yaml
release:
  name: Create GitHub Release
  needs: [version, build]
  runs-on: ubuntu-latest
  timeout-minutes: 10
  if: |
    github.ref == 'refs/heads/main' &&
    needs.version.outputs.is_release == 'true' &&
    github.event.inputs.skip_release != 'true' &&
    needs.build.result == 'success'

  steps:
    - name: Checkout
      uses: actions/checkout@v4
      with:
        fetch-depth: 0          # CRITICAL: Full history for git-cliff
        fetch-tags: true        # CRITICAL: Fetch all tags for comparison

    # NEW: Install git-cliff
    - name: Generate changelog with git-cliff
      uses: orhun/git-cliff-action@v4
      id: git-cliff
      with:
        config: cliff.toml
        args: --verbose --latest --strip header
      env:
        OUTPUT: CHANGELOG.md  # Temporary file in CI workspace only (never committed)

    # NEW: Capture changelog content for GitHub Release
    - name: Capture changelog for release
      id: changelog
      run: |
        if [ -f CHANGELOG.md ]; then
          echo "changelog<<EOF" >> $GITHUB_OUTPUT
          cat CHANGELOG.md >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
          # Delete temporary file immediately
          rm CHANGELOG.md
          echo "✅ Changelog generated and captured (temporary file deleted)"
        else
          echo "❌ CHANGELOG.md not found after git-cliff execution"
          exit 1
        fi

    - name: Download build artifacts
      uses: actions/download-artifact@v4
      with:
        name: build-artifacts-${{ needs.version.outputs.version }}
        path: build-artifacts/

    - name: Create Release
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      run: |
        version="${{ needs.version.outputs.version }}"
        echo "🚀 Creating release for version: $version"

        # Create release with git-cliff generated changelog
        gh release create "v$version" \
          --title "Release $version" \
          --notes "${{ steps.changelog.outputs.changelog }}" \
          --target "${{ github.sha }}" \
          build-artifacts/distributions/* \
          build-artifacts/libs/*
```

**Key Changes**:
1. **Remove**: Lines 1030-1050 (old basic changelog generation)
2. **Add**: git-cliff-action step
3. **Add**: Capture changelog content (delete temp file immediately)
4. **Modify**: Use git-cliff output in `gh release create --notes`

**Safety Mechanisms**:
- Temporary CHANGELOG.md exists ONLY in CI workspace
- File deleted immediately after capture
- Never committed to repository
- Never pushed to remote

---

## 4. Edge Cases and Mitigations

### 4.1 First Release (No Previous Tag)

**Problem**:
```bash
last_tag=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
# Returns empty string on first release
```

**Solution**:
git-cliff handles this automatically with `--latest` flag:
- If no previous tag: generates changelog from initial commit to HEAD
- Uses all conventional commits in repository history
- Groups and formats normally

**Test Scenario**:
```bash
# Simulate first release
git tag -d v0.1.0 v0.2.0  # Delete all tags locally
git-cliff --latest --strip header
# Should generate changelog from first commit
```

### 4.2 Empty Releases (Only chore/ci commits)

**Problem**:
Release contains only filtered commits:
```
- chore: update dependencies
- ci: improve workflow
- style: format code
```

**Solution**:
git-cliff will generate:
```markdown
## [0.3.0] - 2025-01-15

_No user-facing changes in this release._
```

**Handling**:
- Check if changelog contains only header
- Add custom message: "This release includes infrastructure improvements and maintenance updates."

**Implementation**:
```yaml
- name: Check for empty changelog
  run: |
    if [ $(wc -l < CHANGELOG.md) -le 3 ]; then
      echo "⚠️ Empty changelog detected (only internal changes)"
      echo "_This release includes infrastructure improvements and maintenance updates._" >> CHANGELOG.md
    fi
```

### 4.3 Multiple Commits of Same Type

**Problem**:
```
- feat(ui): implement settings page
- feat(ui): implement system status page
- feat(ui): add navigation
```

**Solution**:
git-cliff groups automatically:
```markdown
### ✨ User Interface
- **ui**: Implement settings page ([#123](link))
- **ui**: Implement system status page ([#124](link))
- **ui**: Add navigation ([#125](link))
```

**No Special Handling Required**: Tera templating handles iteration

### 4.4 Commits Without Conventional Format

**Problem**:
```
- Update README
- Fix typo
- Merge pull request #123
```

**Solution**:
git-cliff configuration:
```toml
filter_unconventional = false  # Don't filter unconventional commits
{ message = ".*", group = "📝 Other Changes" }  # Catch-all group
```

**Output**:
```markdown
### 📝 Other Changes
- Update README
- Fix typo
```

**Merge Commits**: Automatically filtered by git-cliff (not shown)

### 4.5 Dependabot Commit Volume

**Analysis**: 15 build(deps) commits in recent history

**Solution**:
Separate "Dependencies" section (collapsed by default in GitHub):
```markdown
### 📦 Dependencies
- **deps**: Bump kotest from 6.0.3 to 6.0.4 ([#162](link))
- **deps**: Bump kotlin from 2.2.20 to 2.2.21 ([#161](link))
- **deps**: Bump org.graalvm.buildtools.native from 0.11.0 to 0.11.2 ([#160](link))
...
```

**GitHub Feature**: Use `<details>` tags for collapsible sections:
```yaml
- name: Format dependencies section
  run: |
    sed -i 's/### 📦 Dependencies/<details><summary>📦 Dependencies<\/summary>\n\n### 📦 Dependencies/g' CHANGELOG.md
    echo '</details>' >> CHANGELOG.md
```

**Optional Enhancement**: Group by dependency type (Gradle plugins, Kotlin, Ktor, etc.)

### 4.6 Breaking Changes Detection

**Scenarios**:
```
1. feat(api)!: remove deprecated endpoint
2. feat!: change configuration format
3. feat: update API

   BREAKING CHANGE: Authorization header required
```

**git-cliff Detection**:
```toml
{ message = "^\\w+\\(.*\\)!:", group = "🚨 BREAKING CHANGES" },
{ message = "^\\w+!:", group = "🚨 BREAKING CHANGES" },
{ message = "^BREAKING[ -]CHANGE:", group = "🚨 BREAKING CHANGES" },
```

**Output**:
```markdown
### 🚨 BREAKING CHANGES
- [**breaking**] **api**: Remove deprecated endpoint ([#456](link))
- [**breaking**] Change configuration format ([#457](link))
- [**breaking**] Update API - Authorization header required ([#458](link))
```

**Priority**: Always appears first in release notes

### 4.7 PR Number Extraction

**Commit Message Patterns**:
```
1. feat(ui): implement settings page (SPI-839) (#171)
2. feat: implement dashboard (SPI-690)
3. fix(mcp): resolve HTTP 406 error (#152)
```

**Postprocessor**:
```toml
{ pattern = '\(#([0-9]+)\)', replace = "([#$1](https://github.com/spiralhouse/cycletime/pull/$1))" }
```

**Output**:
```markdown
- **ui**: Implement settings page ([SPI-839](linear-link)) ([#171](github-pr-link))
- Implement dashboard ([SPI-690](linear-link))
- **mcp**: Resolve HTTP 406 error ([#152](github-pr-link))
```

**Edge Case**: PR merged with squash (multiple commits → one PR)
- Solution: git-cliff processes final squashed commit message
- Maintains PR link from squash commit message

---

## 5. Implementation Plan

### 5.1 Phase 1: Configuration (1 point)
- [ ] Create `cliff.toml` with commit parsers
- [ ] Configure commit groups with icons
- [ ] Set up postprocessors for linking
- [ ] Test locally: `git-cliff --latest --strip header`

### 5.2 Phase 2: CI Integration (3 points)
- [ ] Update `.github/workflows/cicd.yml` release job
- [ ] Add git-cliff-action step
- [ ] Remove old changelog generation (lines 1030-1050)
- [ ] Test with workflow_dispatch trigger

### 5.3 Phase 3: Edge Case Handling (2 points)
- [ ] Test first release scenario (delete tags locally)
- [ ] Test empty release (only chore commits)
- [ ] Test breaking change detection
- [ ] Test dependency grouping

### 5.4 Phase 4: Documentation (1 point)
- [ ] Update release process documentation
- [ ] Document cliff.toml configuration options
- [ ] Add troubleshooting guide

### 5.5 Phase 5: Validation (1 point)
- [ ] Create test release with diverse commit types
- [ ] Verify GitHub Release formatting
- [ ] Verify link generation (PRs, Linear issues)
- [ ] Verify no CHANGELOG.md in git history

**Total Complexity**: 8 points

---

## 6. Testing Strategy

### 6.1 Local Testing (Before CI Integration)

**Install git-cliff**:
```bash
# macOS
brew install git-cliff

# Or use cargo
cargo install git-cliff
```

**Test Scenarios**:

**Scenario 1: Generate Latest Release**
```bash
git-cliff --latest --strip header
# Expected: Release notes for v0.2.0 → HEAD
```

**Scenario 2: Generate Between Tags**
```bash
git-cliff v0.1.0..v0.2.0
# Expected: Release notes between specific versions
```

**Scenario 3: Test Configuration Changes**
```bash
# Edit cliff.toml
git-cliff --config cliff.toml --latest --strip header
# Verify commit grouping, icons, filtering
```

**Scenario 4: Test Postprocessors**
```bash
git-cliff --latest | grep -E '\[#[0-9]+\]|SPI-[0-9]+'
# Expected: Links should be generated
```

**Scenario 5: First Release Simulation**
```bash
# Backup tags
git tag > /tmp/tags.backup

# Delete all tags
git tag -d $(git tag -l)

# Generate changelog
git-cliff --latest --strip header

# Restore tags
cat /tmp/tags.backup | xargs git tag
```

### 6.2 CI Testing (Workflow Dispatch)

**Test Plan**:
1. Create test branch: `feat/spi-820-git-cliff-integration`
2. Add cliff.toml configuration
3. Update cicd.yml with git-cliff integration
4. Create test tag: `v0.3.0-test`
5. Trigger workflow_dispatch on main branch
6. Verify GitHub Release creation
7. Verify release notes formatting
8. Verify NO CHANGELOG.md in git history

**Validation Checklist**:
- [ ] Release notes categorized correctly
- [ ] Icons displayed properly in GitHub UI
- [ ] PR links work (`#123` → GitHub PR)
- [ ] Linear links work (`SPI-456` → Linear issue)
- [ ] Breaking changes appear first
- [ ] Dependencies grouped separately
- [ ] Chore/style commits excluded
- [ ] Build artifacts attached to release
- [ ] No CHANGELOG.md committed

### 6.3 Regression Testing

**After Each Configuration Change**:
```bash
# Regenerate changelog for previous releases
git-cliff v0.1.0..v0.2.0 > /tmp/v0.2.0-changelog.md
git-cliff v0.2.0..HEAD > /tmp/v0.3.0-changelog.md

# Compare with expected format
diff /tmp/v0.2.0-changelog.md expected/v0.2.0-changelog.md
```

**Automated Test**:
```yaml
# .github/workflows/test-changelog.yml
name: Test Changelog Generation
on:
  pull_request:
    paths:
      - 'cliff.toml'
      - '.github/workflows/cicd.yml'

jobs:
  test-changelog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: orhun/git-cliff-action@v4
        with:
          config: cliff.toml
          args: --latest --strip header
      - name: Validate changelog format
        run: |
          if [ ! -f CHANGELOG.md ]; then
            echo "❌ CHANGELOG.md not generated"
            exit 1
          fi
          # Check for required sections
          grep -q "## \[" CHANGELOG.md || exit 1
          echo "✅ Changelog validation passed"
          rm CHANGELOG.md
```

---

## 7. Configuration Best Practices

### 7.1 Commit Message Standards

**Enforce Conventional Commits**:
```yaml
# .github/workflows/commit-lint.yml (if not exists)
name: Commit Message Lint
on: [pull_request]

jobs:
  commitlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: wagoid/commitlint-github-action@v5
```

**Recommended Commit Format**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Examples**:
```
feat(ui): implement settings page (SPI-839) (#171)
fix(mcp): resolve HTTP 406 error on GET /mcp SSE endpoint (SPI-766) (#152)
perf(cache): optimize lookup performance by 50%
security: fix critical vulnerability in StreamableHttpHandler (SPI-765)
docs(readme): update installation instructions
```

### 7.2 Scope Conventions

**Recommended Scopes** (based on project structure):
```
ui          - User interface components
dashboard   - Dashboard features
mcp         - MCP integration
api         - REST API endpoints
cache       - Caching layer
db          - Database layer
auth        - Authentication/authorization
workflow    - Workflow engine
agent       - Agent system
docs        - Documentation
config      - Configuration
deps        - Dependencies (auto-added by Dependabot)
```

### 7.3 Breaking Change Guidelines

**When to Use Breaking Change Markers**:
1. **API Changes**: Removed/renamed endpoints, changed request/response formats
2. **Configuration Changes**: Required config updates, removed config options
3. **Behavioral Changes**: Different default behavior, removed features
4. **Dependency Changes**: Major version bumps requiring user action

**How to Mark**:
```
# Option 1: ! suffix
feat(api)!: remove deprecated /v1/sessions endpoint

# Option 2: BREAKING CHANGE footer
feat(config): update database configuration format

BREAKING CHANGE: Database URL format changed from SQLite to H2.
Users must update their configuration files.
```

### 7.4 git-cliff Maintenance

**When to Update cliff.toml**:
- New commit types introduced (e.g., `feat(security)`)
- New scope patterns emerge (e.g., `feat(graphql)`)
- Icon changes requested
- Grouping strategy changes

**Versioning cliff.toml**:
- Commit changes with: `chore: update git-cliff configuration`
- Test locally before merging
- Document changes in commit message

**Performance Optimization**:
- git-cliff is fast (< 2 seconds for 100 commits)
- No caching needed
- Full git history required (fetch-depth: 0)

---

## 8. Example Output

### 8.1 Sample Release Notes (v0.3.0)

```markdown
## [0.3.0] - 2025-01-15

### 🚨 BREAKING CHANGES
- [**breaking**] **api**: Remove deprecated /v1/sessions endpoint ([SPI-901](https://linear.app/spiral-house/issue/SPI-901)) ([#200](https://github.com/spiralhouse/cycletime/pull/200))

### ✨ User Interface
- **ui**: Implement settings page ([SPI-839](https://linear.app/spiral-house/issue/SPI-839)) ([#171](https://github.com/spiralhouse/cycletime/pull/171))
- **ui**: Implement hierarchical issue list mockup with HTMX expansion ([SPI-838](https://linear.app/spiral-house/issue/SPI-838)) ([#170](https://github.com/spiralhouse/cycletime/pull/170))
- **ui**: Implement home page with project list and completion indicators ([SPI-837](https://linear.app/spiral-house/issue/SPI-837)) ([#169](https://github.com/spiralhouse/cycletime/pull/169))

### ✨ Dashboard
- **dashboard**: Implement HTML UI with HTMX lazy loading ([SPI-690](https://linear.app/spiral-house/issue/SPI-690)) ([#156](https://github.com/spiralhouse/cycletime/pull/156))

### ✨ MCP Integration
- **mcp**: Add parentId parameter to create_issue tool ([SPI-806](https://linear.app/spiral-house/issue/SPI-806)) ([#157](https://github.com/spiralhouse/cycletime/pull/157))

### ✨ Features
- Verify HikariCP connection pooling and enable concurrency test ([SPI-827](https://linear.app/spiral-house/issue/SPI-827)) ([#166](https://github.com/spiralhouse/cycletime/pull/166))

### 🐛 Bug Fixes - MCP
- **mcp**: Resolve HTTP 406 error on GET /mcp SSE endpoint ([SPI-766](https://linear.app/spiral-house/issue/SPI-766)) ([#152](https://github.com/spiralhouse/cycletime/pull/152))

### 🐛 Bug Fixes
- **cache**: Replace ReentrantReadWriteLock with coroutine-safe Mutex ([SPI-690](https://linear.app/spiral-house/issue/SPI-690))

### 🔒 Security
- Fix critical vulnerabilities in StreamableHttpHandler ([SPI-765](https://linear.app/spiral-house/issue/SPI-765))

### 📚 Documentation
- **docs**: Refactor design system documentation into DAG structure ([SPI-857](https://linear.app/spiral-house/issue/SPI-857)) ([#168](https://github.com/spiralhouse/cycletime/pull/168))
- **readme**: Update installation instructions

### ♻️ Code Refactoring
- **config**: Remove redundant Tailwind configs - use single inline config

### 🧪 Testing
- Add comprehensive MCP tools smoke test scripts ([SPI-765](https://linear.app/spiral-house/issue/SPI-765))

### ⚙️ Continuous Integration
- Implement automatic version tagging to break chicken-and-egg cycle ([SPI-747](https://linear.app/spiral-house/issue/SPI-747)) ([#163](https://github.com/spiralhouse/cycletime/pull/163))
- Fix version calculation by explicitly fetching tags ([SPI-747](https://linear.app/spiral-house/issue/SPI-747)) ([#153](https://github.com/spiralhouse/cycletime/pull/153))

<details>
<summary>📦 Dependencies</summary>

### 📦 Dependencies
- **deps**: Bump kotest from 6.0.3 to 6.0.4 ([#162](https://github.com/spiralhouse/cycletime/pull/162))
- **deps**: Bump kotlin from 2.2.20 to 2.2.21 ([#161](https://github.com/spiralhouse/cycletime/pull/161))
- **deps**: Bump org.graalvm.buildtools.native from 0.11.0 to 0.11.2 ([#160](https://github.com/spiralhouse/cycletime/pull/160))
- **deps**: Bump ch.qos.logback:logback-classic from 1.5.18 to 1.5.20 ([#159](https://github.com/spiralhouse/cycletime/pull/159))
- **deps**: Bump org.jetbrains.kotlinx.kover from 0.9.2 to 0.9.3 ([#158](https://github.com/spiralhouse/cycletime/pull/158))

</details>

---

**Full Changelog**: https://github.com/spiralhouse/cycletime/compare/v0.2.0...v0.3.0

<!-- generated by git-cliff -->
```

### 8.2 Comparison: Before vs After

**Before (Basic Changelog)**:
```markdown
## What's Changed
- feat(ui): implement settings page (46eee2f)
- feat(ui): implement hierarchical issue list (f1619c6)
- fix(mcp): resolve HTTP 406 error (aa84ef1)
- build(deps): bump kotest from 6.0.3 to 6.0.4 (428cc07)
- ci: implement automatic version tagging (fcdf702)

**Full Changelog**: https://github.com/spiralhouse/cycletime/compare/v0.2.0...v0.3.0
```

**After (git-cliff)**:
- ✅ Categorized by type (Features, Bug Fixes, etc.)
- ✅ Icon-based visual hierarchy
- ✅ Scoped grouping (UI, MCP, Dashboard)
- ✅ PR and Linear issue links
- ✅ Breaking changes highlighted
- ✅ Dependencies collapsed
- ✅ Chore/style commits filtered
- ✅ Professional formatting

**Impact**: 10x improvement in readability and user experience

---

## 9. Monitoring and Metrics

### 9.1 Success Criteria

**Quantitative**:
- [ ] Changelog generation adds < 10 seconds to CI pipeline
- [ ] 100% of release notes generated automatically
- [ ] Zero manual changelog edits required
- [ ] Zero CHANGELOG.md files in git history

**Qualitative**:
- [ ] Release notes are easy to scan (visual hierarchy)
- [ ] Users can quickly identify breaking changes
- [ ] Links to PRs and issues work correctly
- [ ] Dependencies are not cluttering main sections

### 9.2 Performance Baseline

**Current Release Job Duration**: ~5 minutes (before git-cliff)

**Breakdown**:
- Checkout: 10 seconds
- Old changelog generation: 2 seconds
- Download artifacts: 30 seconds
- Create release: 10 seconds
- **Total**: ~52 seconds

**Expected After git-cliff**:
- Checkout: 10 seconds
- git-cliff generation: 5 seconds (conservative estimate)
- Capture changelog: 1 second
- Download artifacts: 30 seconds
- Create release: 10 seconds
- **Total**: ~56 seconds

**Impact**: +4 seconds (+7.7% increase) - acceptable for significant quality improvement

### 9.3 Monitoring Dashboard

**GitHub Actions Insights**:
- Track release job duration trend
- Monitor git-cliff step duration
- Alert if duration exceeds 15 seconds

**Release Notes Quality**:
- Manual review of first 5 releases
- User feedback collection
- Adjustment of cliff.toml based on patterns

---

## 10. Rollback Plan

### 10.1 Rollback Triggers

**When to Rollback**:
1. git-cliff fails consistently (>3 consecutive failures)
2. Release notes malformed (missing sections, broken links)
3. Performance degradation (>30 second increase)
4. CHANGELOG.md accidentally committed to git
5. Breaking change detection fails

### 10.2 Rollback Procedure

**Step 1: Revert CI Changes**
```bash
cd .github/workflows
git revert <commit-with-git-cliff-changes>
git push origin main
```

**Step 2: Restore Old Changelog Generation**
```yaml
# Restore lines 1030-1050 from previous version
- name: Generate changelog
  id: changelog
  run: |
    last_tag=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
    if [ -z "$last_tag" ]; then
      commits=$(git log --pretty=format:"- %s (%h)" HEAD | head -20)
    else
      commits=$(git log --pretty=format:"- %s (%h)" ${last_tag}..HEAD)
    fi
    changelog="## What's Changed"$'\n'
    changelog+="$commits"$'\n'$'\n'
    changelog+="**Full Changelog**: https://github.com/${{ github.repository }}/compare/${last_tag}...v${{ needs.version.outputs.version }}"
```

**Step 3: Keep cliff.toml for Future Use**
- Do NOT delete cliff.toml
- Can be used for local changelog generation
- Available for future reintroduction

**Recovery Time**: < 10 minutes (single commit revert)

---

## 11. Future Enhancements

### 11.1 Short-Term Improvements (Next 3 Months)

**Enhanced Dependency Grouping**:
```toml
{ message = "^build\\(deps\\).*kotlin", group = "📦 Dependencies - Kotlin" },
{ message = "^build\\(deps\\).*ktor", group = "📦 Dependencies - Ktor" },
{ message = "^build\\(deps\\).*gradle", group = "📦 Dependencies - Gradle" },
{ message = "^build\\(deps\\)", group = "📦 Dependencies - Other" },
```

**Contributor Attribution**:
```tera
- {{ commit.message }} by @{{ commit.author.name }}
```

**Performance Badges**:
```markdown
### ⚡ Performance Improvements
- **cache**: Optimize lookup performance by 50% 🚀
  - Benchmark: 200ms → 100ms average latency
```

### 11.2 Long-Term Vision (6-12 Months)

**Automated Release Notes Preview**:
- PR comment bot shows release notes preview
- Preview updates on each commit
- Helps enforce conventional commit standards

**Custom Release Note Templates**:
- Major releases: Detailed changelog with migration guide
- Minor releases: Feature highlights
- Patch releases: Bug fix list only

**Multi-Language Support**:
- Generate release notes in multiple languages
- Use AI translation for non-English commits

**Analytics Integration**:
- Track which features get most attention
- Correlate with user feedback
- Inform roadmap prioritization

---

## 12. References

### 12.1 Documentation

- **git-cliff**: https://git-cliff.org/docs/
- **Conventional Commits**: https://www.conventionalcommits.org/
- **Semantic Versioning**: https://semver.org/
- **GitHub Releases**: https://docs.github.com/en/repositories/releasing-projects-on-github

### 12.2 Related Issues

- **SPI-820**: This design document
- **SPI-747**: Automatic version tagging (dependency)
- **SPI-570**: Git SemVersioning configuration (related)

### 12.3 Key Files

- `/cliff.toml`: git-cliff configuration
- `/.github/workflows/cicd.yml`: CI/CD pipeline
- `/build.gradle.kts`: Version configuration (git-semver-plugin)

---

## 13. Approval and Sign-Off

**Design Review Checklist**:
- [ ] Architecture reviewed and approved
- [ ] Configuration tested locally
- [ ] Edge cases identified and mitigated
- [ ] Performance impact acceptable
- [ ] Rollback plan documented
- [ ] Testing strategy comprehensive
- [ ] Documentation complete

**Approvals**:
- [ ] Technical Lead: ___________________ Date: ___________
- [ ] DevOps Lead: _____________________ Date: ___________
- [ ] Product Owner: ___________________ Date: ___________

**Implementation Start Date**: __________________

**Target Completion Date**: __________________

---

**Document Version**: 1.0
**Last Updated**: 2025-01-30
**Author**: Claude Code (ultrathink mode)
**Status**: Design Complete - Ready for Review
