# Release Strategy Recommendations for CycleTime
## Executive Summary

**Date**: 2025-10-30
**Context**: Implementing trunk-based development with automated semantic versioning
**Key Question**: How to prevent important features from getting lost in frequent releases?

---

## TL;DR - The Solution

**Don't create GitHub Releases for every commit. Instead:**

```
Git Tag (automated)     GitHub Release (selective)     Communication
      ↓                          ↓                            ↓
v1.2.3 (patch)  ─────────→  [Skip]             ─────→  Slack notification only
v1.3.0 (minor)  ─────────→  Create Release     ─────→  Team email, blog post
v2.0.0 (major)  ─────────→  Create Release     ─────→  Full announcement, docs
```

**Key Principle**: Tag everything, announce what matters.

---

## Industry Standard Pattern

Modern continuous delivery teams use **Hybrid Approach**:

### 1. Automated Tagging
- Every commit to main creates a semver tag (via conventional commits)
- No manual intervention required
- Complete version history maintained

### 2. Selective GitHub Releases
- Only create releases for "announcement-worthy" changes
- Criteria: user-facing features, breaking changes, security fixes
- Manual or semi-automated based on commit analysis

### 3. Automated CHANGELOG.md
- Comprehensive history of all changes
- Updated on every tag
- Generated from conventional commits (git-cliff)

### 4. Decoupled Deployment from Release
- Deploy frequently (10x/day)
- Release strategically (when ready to announce)
- Use feature flags for progressive rollouts (future enhancement)

---

## Decision Matrix: When to Create GitHub Release?

```
Commit Type          Example                           Create Release?
───────────────────────────────────────────────────────────────────────
feat(ui):           New project hierarchy UI          ✅ YES - user-facing
feat(api):          New MCP endpoint                  ✅ YES - API change
feat(mcp):          Internal MCP refactor             ❌ NO - internal only

fix:                Critical auth bypass              ✅ YES - security
fix:                UI typo correction                ❌ NO - minor fix

perf:               40% faster queries                ✅ YES - significant
perf:               Minor optimization                ❌ NO - incremental

refactor:           Code reorganization               ❌ NO - internal
test:               Add test coverage                 ❌ NO - internal
docs:               Update README                     ❌ NO - docs only
chore:              Dependency update                 ❌ NO - maintenance
ci:                 Update GitHub Actions             ❌ NO - CI config
build:              Gradle optimization               ❌ NO - build config

BREAKING CHANGE:    Any breaking change               ✅ ALWAYS - major bump
Security:           Any CVE fix                       ✅ ALWAYS - security
```

**Rule of Thumb**: If users need to know about it, create a release. If only developers care, skip it.

---

## Recommended Implementation for CycleTime

### Phase 1: Foundation (Sprint: SPI-882)

#### 1.1 Automated Tagging on Every Commit

**File**: `.github/workflows/tag-release.yml`

```yaml
name: Tag Release
on:
  push:
    branches: [main]

jobs:
  tag:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for git-cliff

      - name: Install git-cliff
        run: cargo install git-cliff

      - name: Determine Next Version
        id: version
        run: |
          NEXT_VERSION=$(git cliff --bumped-version)
          echo "version=$NEXT_VERSION" >> $GITHUB_OUTPUT
          echo "Next version: $NEXT_VERSION"

      - name: Check if tag exists
        id: check_tag
        run: |
          if git rev-parse "${{ steps.version.outputs.version }}" >/dev/null 2>&1; then
            echo "exists=true" >> $GITHUB_OUTPUT
          else
            echo "exists=false" >> $GITHUB_OUTPUT
          fi

      - name: Create Tag
        if: steps.check_tag.outputs.exists == 'false'
        run: |
          git tag ${{ steps.version.outputs.version }}
          git push origin ${{ steps.version.outputs.version }}

      - name: Update CHANGELOG
        if: steps.check_tag.outputs.exists == 'false'
        run: |
          git cliff --tag ${{ steps.version.outputs.version }} -o CHANGELOG.md
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add CHANGELOG.md
          git commit -m "docs: update CHANGELOG for ${{ steps.version.outputs.version }}"
          git push

      - name: Notify Slack
        if: steps.check_tag.outputs.exists == 'false'
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-Type: application/json' \
            -d '{
              "text": "🏷️ New version tagged: ${{ steps.version.outputs.version }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*CycleTime ${{ steps.version.outputs.version }}* has been tagged\n\nView on GitHub: https://github.com/cycletime/cycletime/releases/tag/${{ steps.version.outputs.version }}"
                  }
                }
              ]
            }'
```

**Behavior**:
- Runs on every push to main
- Analyzes conventional commits since last tag
- Determines next semver version
- Creates git tag automatically
- Updates CHANGELOG.md
- Sends Slack notification

**No human intervention required.**

---

#### 1.2 Manual GitHub Release Creation

**File**: `.github/workflows/create-release.yml`

```yaml
name: Create GitHub Release
on:
  workflow_dispatch:
    inputs:
      tag:
        description: 'Tag version (e.g., v1.2.0)'
        required: true
        type: string
      highlight:
        description: 'Key feature highlight (optional, 2-3 sentences)'
        required: false
        type: string
      prerelease:
        description: 'Mark as pre-release (beta/rc)'
        required: false
        type: boolean
        default: false

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.tag }}

      - name: Install git-cliff
        run: cargo install git-cliff

      - name: Generate Release Notes
        run: |
          # Generate base release notes from git-cliff
          git cliff --tag ${{ inputs.tag }} --current > release-notes.md

          # Add highlight section if provided
          if [ -n "${{ inputs.highlight }}" ]; then
            echo "## 🎯 Highlights" > temp.md
            echo "" >> temp.md
            echo "${{ inputs.highlight }}" >> temp.md
            echo "" >> temp.md
            cat release-notes.md >> temp.md
            mv temp.md release-notes.md
          fi

          # Add installation instructions
          echo "" >> release-notes.md
          echo "## 📦 Installation" >> release-notes.md
          echo "" >> release-notes.md
          echo '```bash' >> release-notes.md
          echo "docker pull cycletime/cycletime:${{ inputs.tag }}" >> release-notes.md
          echo '```' >> release-notes.md

      - name: Create GitHub Release
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          PRERELEASE_FLAG=""
          if [ "${{ inputs.prerelease }}" == "true" ]; then
            PRERELEASE_FLAG="--prerelease"
          fi

          gh release create ${{ inputs.tag }} \
            --title "CycleTime ${{ inputs.tag }}" \
            --notes-file release-notes.md \
            $PRERELEASE_FLAG

      - name: Notify Team
        run: |
          RELEASE_TYPE="stable"
          if [ "${{ inputs.prerelease }}" == "true" ]; then
            RELEASE_TYPE="pre-release"
          fi

          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-Type: application/json' \
            -d '{
              "text": "🚀 New release published: ${{ inputs.tag }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*CycleTime ${{ inputs.tag }}* has been released ($RELEASE_TYPE)\n\n${{ inputs.highlight }}\n\nView release: https://github.com/cycletime/cycletime/releases/tag/${{ inputs.tag }}"
                  }
                }
              ]
            }'
```

**Usage**:
1. Navigate to Actions tab in GitHub
2. Select "Create GitHub Release" workflow
3. Click "Run workflow"
4. Enter tag version (e.g., `v1.2.0`)
5. Optionally add feature highlight
6. Check "prerelease" if beta/rc
7. Click "Run workflow"

**Human judgment required**: Team decides when a tag deserves a GitHub Release.

---

#### 1.3 git-cliff Configuration Enhancement

**File**: `cliff.toml` (enhance existing configuration)

```toml
[changelog]
header = """
# Changelog

All notable changes to CycleTime will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

"""
body = """
{% if version -%}
    ## [{{ version | trim_start_matches(pat="v") }}] - {{ timestamp | date(format="%Y-%m-%d") }}
{% else -%}
    ## [Unreleased]
{% endif -%}

{% for group, commits in commits | group_by(attribute="group") %}
    ### {{ group | striptags | trim | upper_first }}
    {% for commit in commits %}
        - {% if commit.scope %}**{{ commit.scope }}**: {% endif %}{{ commit.message | upper_first }}\
          {% if commit.links %} ([{{ commit.id | truncate(length=7, end="") }}]({{ commit.links[0] }})){% endif %}\
    {% endfor %}
{% endfor -%}

{%- if github.contributors | filter(attribute="is_first_time", value=true) | length != 0 %}
  ### New Contributors
{%- endif %}\
{% for contributor in github.contributors | filter(attribute="is_first_time", value=true) %}
  * @{{ contributor.username }} made their first contribution
    {%- if contributor.pr_number %} in \
      [#{{ contributor.pr_number }}]({{ self::remote_url() }}/pull/{{ contributor.pr_number }}) \
    {%- endif %}
{%- endfor -%}

"""
footer = """
<!-- generated by git-cliff -->
"""

[git]
conventional_commits = true
filter_unconventional = false
split_commits = false
commit_parsers = [
  { message = "^feat", group = "⚡ Features" },
  { message = "^fix", group = "🐛 Bug Fixes" },
  { message = "^perf", group = "🚀 Performance" },
  { message = "^refactor", group = "♻️ Refactoring" },
  { message = "^style", group = "🎨 Styling" },
  { message = "^test", group = "🧪 Testing" },
  { message = "^docs", group = "📚 Documentation" },
  { message = "^build", group = "🏗️ Build System" },
  { message = "^ci", group = "👷 CI/CD" },
  { message = "^chore", group = "🔧 Chore" },
  { body = ".*breaking change.*", group = "⚠️ BREAKING CHANGES" },
]

[bump]
features_always_bump_minor = true
breaking_always_bump_major = true
```

**Enhancements**:
- Emoji categories for visual scanning
- Contributor recognition
- Better formatting for GitHub display
- Link to commit details

---

### Phase 2: Team Process (Week 2)

#### 2.1 Release Significance Guidelines

**Document**: `docs/guides/development/release-guidelines.md`

```markdown
# Release Guidelines

## When to Create a GitHub Release

Use this checklist after merging a PR to main:

### ✅ Always Create Release For:
- [ ] MAJOR version bumps (breaking changes)
- [ ] New user-facing features (UI, CLI, API)
- [ ] Security fixes (any severity)
- [ ] Performance improvements > 20%
- [ ] GA milestone releases
- [ ] Beta/RC releases (mark as pre-release)

### 🤔 Maybe Create Release For:
- [ ] Bug fixes for high-impact issues
- [ ] Minor performance improvements
- [ ] Developer-facing features (if significant)

### ❌ Skip Release For:
- [ ] Documentation-only changes
- [ ] Internal refactoring
- [ ] Test additions
- [ ] Dependency updates (no user impact)
- [ ] CI/CD configuration
- [ ] Build system changes

## How to Create a Release

1. **Verify tag exists**: Check that automated tagging workflow ran
   ```bash
   git fetch --tags
   git tag | grep v1.2.0  # Replace with your version
   ```

2. **Go to Actions tab**: https://github.com/cycletime/cycletime/actions

3. **Select "Create GitHub Release"** workflow

4. **Fill in inputs**:
   - **Tag**: `v1.2.0` (must match existing tag)
   - **Highlight** (optional): Describe the main feature in 2-3 sentences
   - **Pre-release**: Check if beta/rc

5. **Run workflow**: Click "Run workflow" button

## Release Note Template

When adding a highlight, use this format:

```
This release introduces [feature name], which enables [user benefit].

Key improvements:
- [Improvement 1]
- [Improvement 2]
- [Improvement 3]

[Optional: Migration guide link if breaking changes]
```

## Examples

**Good Highlight** (concise, user-focused):
```
This release introduces project hierarchy, which enables better organization
of large projects. Projects can now be grouped into folders, with support for
nested structures up to 5 levels deep.
```

**Bad Highlight** (too technical, no user benefit):
```
This release refactors the project repository to use a tree structure instead
of a flat list. The database schema has been updated with a new parent_id
column and recursive queries for traversal.
```

## Frequency Guidelines

- **Daily**: Automated tags (no action required)
- **Weekly**: Consider creating release if user-facing changes merged
- **Sprint**: Create release for completed features (linked to Linear story)
- **Milestone**: Always create release (beta, RC, GA)

## Communication After Release

Once GitHub Release is created:

1. **Slack**: Automated notification sent by workflow
2. **Linear**: Update story with release link
3. **Documentation**: Update version in docs if API changes
4. **Social** (post-GA): Tweet for MINOR+ versions
```

---

#### 2.2 Team Training

**Key Messages**:

1. **Tagging is automatic** - Don't worry about versioning
2. **Releases are intentional** - Use judgment on what to announce
3. **When in doubt, skip the release** - Better to under-communicate than overwhelm
4. **CHANGELOG.md has everything** - Complete history always available

**Team Exercise**:
Review last 10 commits to main. Which would warrant a GitHub Release?
```
1. feat(ui): add project hierarchy        → ✅ YES (user-facing)
2. fix: resolve session timeout bug       → 🤔 MAYBE (depends on severity)
3. refactor: reorganize domain models     → ❌ NO (internal)
4. perf: optimize query performance 40%   → ✅ YES (significant improvement)
5. docs: update README                    → ❌ NO (docs only)
6. test: add integration tests            → ❌ NO (internal)
7. feat(api): add new MCP endpoint        → ✅ YES (API change)
8. chore: update dependencies             → ❌ NO (maintenance)
9. fix: critical security vulnerability   → ✅ YES (security)
10. ci: update GitHub Actions             → ❌ NO (CI config)
```

**Answer**: Create releases for 1, 4, 7, 9 (4 out of 10 commits = ~40% release rate)

---

### Phase 3: Future Enhancements

#### 3.1 Feature Flags (Post-GA)

**Goal**: Decouple deployment from release announcement

**Benefits**:
- Deploy features to production but keep hidden
- Progressive rollouts (5% → 25% → 50% → 100%)
- A/B testing in production
- Instant rollback without deployment

**Implementation**: Consider feature flag service (LaunchDarkly, Split.io) or simple config-based flags

**Example**:
```kotlin
// Deploy Monday, feature flagged off
if (featureFlags.isEnabled("project-hierarchy", user)) {
    renderProjectHierarchy()
} else {
    renderFlatProjectList()
}

// Tuesday: Enable for internal team (testing)
// Wednesday: Enable for 10% of users (gradual rollout)
// Thursday: Create GitHub Release announcing feature
// Friday: Enable for 100% of users
```

**Result**: Can deploy 10x/week but only announce 1-2x/week

---

#### 3.2 Pre-Release Strategy

**Use Cases**:
1. **Staging Deployments**: Tag staging releases as pre-releases
   - Example: `v1.2.0-beta.1`
   - Automated on push to `beta` branch
   - Internal testing before stable release

2. **Release Candidates**: GA blocker testing
   - Example: `v1.2.0-rc.1`
   - External beta testers
   - Final validation before production

3. **Nightly Builds**: Bleeding edge for early adopters
   - Example: `v1.2.0-nightly-20251030`
   - Automated daily builds
   - Not recommended for production

**Implementation**:
```yaml
# .github/workflows/beta-release.yml
name: Beta Release
on:
  push:
    branches: [beta]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Determine Beta Version
        run: |
          BASE_VERSION=$(git cliff --bumped-version)
          BETA_VERSION="${BASE_VERSION}-beta.$(git rev-list --count HEAD)"
          echo "version=$BETA_VERSION" >> $GITHUB_OUTPUT

      - name: Create Pre-Release
        run: |
          gh release create $VERSION \
            --title "CycleTime $VERSION (Beta)" \
            --notes "⚠️ Pre-release for testing purposes only" \
            --prerelease
```

**Benefits**:
- Separate notification channel (users can opt in)
- Doesn't affect "Latest Release" badge
- Clear distinction between stable and testing versions

---

#### 3.3 Release Blog Posts (Post-GA)

**For MINOR+ versions with significant features**:

**Template**: `blog/releases/v1.2.0-release-notes.md`

```markdown
---
title: "CycleTime v1.2.0: Introducing Project Hierarchy"
date: 2025-11-15
author: Team CycleTime
tags: [release, features, project-management]
---

We're excited to announce CycleTime v1.2.0, featuring our most requested feature:
**Project Hierarchy** for organizing large projects.

## What's New

### Project Hierarchy

Large projects can now be organized into folders...

[User-focused explanation with screenshots]

### Performance Improvements

Query execution is now 40% faster...

[Before/after metrics]

## Upgrade Guide

If you're upgrading from v1.1.x, please note...

[Migration steps if needed]

## Full Changelog

For a complete list of changes, see the [full changelog](https://github.com/cycletime/cycletime/releases/tag/v1.2.0).

## What's Next

In the next release, we're planning...

[Roadmap preview]

---

Questions? Join our [Discord](https://discord.gg/cycletime) or [open an issue](https://github.com/cycletime/cycletime/issues).
```

**Distribution**:
- Link in GitHub Release
- Share on social media
- Post to community forums
- Email newsletter (future)

---

## Comparison: Before vs After

### Before (Every Commit = Release)

```
GitHub Releases Page:
├─ v1.2.15 - Update dependencies
├─ v1.2.14 - Fix typo in README
├─ v1.2.13 - Refactor session manager
├─ v1.2.12 - Add unit tests
├─ v1.2.11 - CI configuration update
├─ v1.2.10 - [Important feature buried here]
├─ v1.2.9 - Documentation update
└─ ...

User Experience: 😫
- 100+ releases per year
- Can't tell what's important
- Release fatigue
- Noise overwhelms signal
```

### After (Selective Releases)

```
GitHub Releases Page:
├─ v1.3.0 - Project Hierarchy (Major Feature) 🎉
├─ v1.2.5 - Critical Security Fix 🔒
├─ v1.2.0 - Performance Improvements 🚀
├─ v1.1.0 - MCP Resource Integration 📦
└─ v1.0.0 - General Availability 🎊

Git Tags (complete history):
v1.2.15, v1.2.14, v1.2.13, v1.2.12, v1.2.11, v1.2.10, ...

User Experience: 😊
- ~20 releases per year
- Clear what's important
- Curated announcements
- Signal > Noise
```

---

## Key Metrics to Track

**After Implementation**, monitor these metrics:

1. **Version Metrics**:
   - Total tags created per month
   - GitHub Releases created per month
   - Release rate: `(releases / tags) * 100`
   - Target: ~40% release rate (4 releases per 10 tags)

2. **Engagement Metrics**:
   - GitHub Release views
   - Release discussions participation
   - "Watch Releases" subscriber count
   - Slack notification click-through

3. **Quality Metrics**:
   - Time from tag to release (should be < 1 hour for significant changes)
   - Release note completeness (all sections filled)
   - User feedback on release notes clarity

**Dashboard** (GitHub Insights):
```
Last 30 Days:
├─ Tags Created: 25
├─ Releases Published: 8
├─ Release Rate: 32%
├─ Avg Time to Release: 45 minutes
└─ Subscriber Growth: +12
```

---

## Quick Reference

### Developer Checklist

**After merging PR to main**:

1. ✅ **Wait for automated tag** (~2 minutes)
2. ✅ **Check if release-worthy** (use decision matrix)
3. ✅ **If YES**: Run "Create GitHub Release" workflow
4. ✅ **Add highlight** (2-3 sentences about the feature)
5. ✅ **Verify release published** on GitHub
6. ✅ **Update Linear story** with release link

**That's it!** No manual versioning, no changelog editing.

### Commands

```bash
# Check latest tag
git fetch --tags
git describe --tags --abbrev=0

# View unreleased changes
git cliff --unreleased

# Generate release notes locally (testing)
git cliff --tag v1.2.0 --current

# Create release manually (if workflow fails)
gh release create v1.2.0 \
  --title "CycleTime v1.2.0" \
  --notes-file release-notes.md
```

---

## FAQ

**Q: What if I forget to create a release?**
A: No problem! You can always create a release later from an existing tag. The tag preserves the version history.

**Q: Can I create a release for an old tag?**
A: Yes! Use the manual workflow and specify the old tag version. GitHub supports releases on historical tags.

**Q: What if I create too many releases?**
A: You can delete releases (not tags) if needed. But better to skip releases than over-communicate.

**Q: Do pre-releases notify subscribers?**
A: No, pre-releases have a separate notification channel. Users must explicitly opt-in to pre-release notifications.

**Q: Can I edit a release after publishing?**
A: Yes, GitHub Releases are mutable. You can edit title, notes, and assets anytime.

**Q: What about hotfix branches?**
A: Hotfixes follow the same pattern: merge to main → automated tag → optionally create release.

**Q: How do I know if my change is "significant"?**
A: Ask: "Would users want to know about this?" If yes, create release. If no, skip.

---

## Success Criteria

This strategy is successful when:

- ✅ **Zero manual versioning** - Developers never calculate versions
- ✅ **Clear communication** - Users know what changed and why
- ✅ **Reduced noise** - Release rate ~40% of tag rate
- ✅ **Complete history** - CHANGELOG.md has every change
- ✅ **Team confidence** - Developers know when to create releases
- ✅ **User satisfaction** - Positive feedback on release communication

---

## References

- Full Research Report: `docs/research/release-engineering-continuous-delivery-research.md`
- git-cliff Documentation: https://git-cliff.org/
- Conventional Commits: https://www.conventionalcommits.org/
- Semantic Versioning: https://semver.org/
- GitHub Releases API: https://docs.github.com/en/rest/releases

---

**Recommended Next Step**: Review implementation roadmap with team, then implement Phase 1 (automated tagging) in SPI-882 sprint.
