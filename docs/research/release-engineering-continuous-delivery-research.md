# Release Engineering Best Practices for Continuous Delivery
## Research Report: GitHub Releases with Trunk-Based Development

**Date**: 2025-10-30
**Context**: CycleTime project implementing trunk-based development with automated semantic versioning
**Research Question**: How to handle GitHub Releases in continuous delivery without important features fading into noise

---

## Executive Summary

Modern continuous delivery practices have evolved sophisticated strategies for balancing automation with meaningful release communication. The key insight: **successful CD teams decouple deployment from release announcement**, using automation for routine versioning while reserving GitHub Releases for significant milestones.

**Core Finding**: Don't create GitHub Releases for every commit. Instead:
1. **Tag every meaningful commit** (automated semantic versioning)
2. **Create GitHub Releases selectively** for milestones worth communicating
3. **Use feature flags** to decouple deployment from feature exposure
4. **Maintain automated CHANGELOG.md** for comprehensive history

---

## 1. Release Cadence Patterns

### Industry Standard: Tag != Release

**Critical Distinction**: Git tags and GitHub Releases serve different purposes:
- **Git Tags**: Technical versioning, every semver bump, automated
- **GitHub Releases**: Curated announcements, selected milestones, manual or semi-automated

### Three Common Patterns

#### Pattern A: High-Frequency Releases (Every Commit)
**Used by**: npm packages, libraries with frequent patches
**Cadence**: Every merged PR that triggers semver bump
**GitHub Releases**: Automated for all versions

**Pros**:
- Complete automation, zero manual work
- Every version documented in releases page
- Clear artifact history for debugging

**Cons**:
- **Noise problem**: Users overwhelmed by frequent releases
- Important features buried in stream of patches
- Release fatigue for subscribers
- High storage costs for release artifacts

**Best for**: Libraries where every version matters (SemVer contract critical)

---

#### Pattern B: Batched Releases (Periodic)
**Used by**: Kubernetes (3x/year), GitLab (monthly patches)
**Cadence**: Time-boxed (monthly, quarterly) or feature-based
**GitHub Releases**: Manual for major milestones, automated for patches

**Kubernetes Example**:
- **Minor releases**: 3x per year (changed from 4x in 2021)
- **Patch releases**: Monthly cadence per supported version
- **Support window**: 14 months per minor version (N-2 policy)
- **Rationale**: "Current release cadence so fast that most organizations cannot keep up"

**Pros**:
- Predictable release schedule for users
- Time for proper documentation and testing
- Reduced release management overhead
- Clear communication windows

**Cons**:
- Features wait for next release window
- Requires release branch management
- Delayed feedback from production

**Best for**: Complex systems with enterprise adoption (careful upgrade planning needed)

---

#### Pattern C: Hybrid Approach (Tag All, Release Significant)
**Used by**: Modern SaaS products, cloud-native tools
**Cadence**: Tag every commit, GitHub Release for milestones
**GitHub Releases**: Manual triggers for "announcement-worthy" changes

**Implementation**:
1. **Automated tagging**: Every commit creates semver tag via CI/CD
2. **Automated CHANGELOG.md**: git-cliff or conventional-changelog maintains full history
3. **Manual GitHub Releases**: Developer/PM triggers release for significant milestones
4. **Pre-release flags**: Beta/RC releases marked as pre-release

**Pros**:
- Best of both worlds: complete history + curated announcements
- No version gaps (every tag accessible)
- Flexibility to highlight important changes
- Users can subscribe to releases without noise

**Cons**:
- Requires process discipline (when to create Release?)
- Manual step introduces friction
- Risk of forgetting to create Release

**Best for**: SaaS products with continuous delivery and diverse user base

---

### Trade-Off Analysis

| Factor | Every Commit | Batched | Hybrid |
|--------|-------------|---------|--------|
| **Automation** | Full | Moderate | High (tag) + Manual (release) |
| **User Noise** | High | Low | Low |
| **Communication** | Implicit | Explicit | Explicit (selective) |
| **Deployment Speed** | Instant | Delayed | Instant (deploy) + Timed (announce) |
| **Artifact Storage** | High cost | Moderate | Low (only significant) |
| **Subscriber Experience** | Overwhelming | Predictable | Curated |

---

## 2. Release Significance Levels

### Mechanisms for Differentiating Releases

#### A. Semantic Versioning as Communication
**SemVer inherently signals significance**:
- **MAJOR (X.0.0)**: Breaking changes - "Pay attention!"
- **MINOR (0.X.0)**: New features - "Check this out"
- **PATCH (0.0.X)**: Bug fixes - "Background update"

**Strategy**: Use SemVer signals to filter what deserves GitHub Release
- MAJOR bumps: Always create GitHub Release + announcement
- MINOR bumps: Create Release if user-facing feature
- PATCH bumps: Skip GitHub Release (tag + CHANGELOG only)

#### B. GitHub Pre-Release Flag
**Strategic Use Cases**:
1. **Beta/RC releases**: Mark as pre-release, separate notification channel
2. **Nightly builds**: Pre-release for early adopters, exclude from "Latest Release"
3. **Branch deployments**: Feature branches can publish pre-releases

**User Experience**:
- "Latest Release" badge shows stable version only
- Pre-releases require explicit opt-in
- Subscribers can filter out pre-release notifications

**Example Workflow**:
```yaml
# CI/CD pipeline
- if: github.ref == 'refs/heads/main'
  run: gh release create $VERSION --notes "$CHANGELOG"

- if: github.ref == 'refs/heads/beta'
  run: gh release create $VERSION-beta --prerelease --notes "$CHANGELOG"
```

#### C. Release Labels/Tags
**GitHub Releases support custom labels**:
- "Major Feature Release"
- "Security Update"
- "Performance Improvements"
- "Breaking Changes"

**Implementation**: Use git-cliff categories as release labels
```toml
# cliff.toml
[git.commit_parsers]
feat = "Features"
fix = "Bug Fixes"
perf = "Performance"
breaking = "⚠️ BREAKING CHANGES"
```

#### D. Release Descriptions
**Curated vs Generated**:
- **Automated**: Full changelog from git-cliff (every commit)
- **Curated**: Hand-written summary highlighting key changes

**Best Practice**: Hybrid approach
```markdown
# v2.5.0 Release Notes

## Highlights
- 🚀 **New Feature**: Project hierarchy support (SPI-XXX)
- ⚡ **Performance**: 40% faster query execution (SPI-XXX)
- 🔒 **Security**: Fixed authentication bypass (SPI-XXX)

## Full Changelog
[Generated changelog from git-cliff]

## Upgrade Guide
[Breaking changes and migration steps]
```

---

## 3. Changelog vs Release Notes

### Key Distinctions

| Aspect | CHANGELOG.md | GitHub Releases |
|--------|-------------|-----------------|
| **Purpose** | Complete history | Announcement |
| **Audience** | Developers, maintainers | All users |
| **Format** | Technical, every commit | Curated, highlights |
| **Automation** | Fully automated | Semi-automated |
| **Location** | Repository file | GitHub UI |
| **Scope** | All versions | Selected versions |

### Best Practices from Leading Projects

#### GitLab Approach
**Dual-track system**:
1. **Automated CHANGELOG.md**: Uses `Changelog: <type>` commit trailers
   - Every commit categorized automatically
   - Generated on release branch creation
   - Maintained in repository for git-based workflows

2. **Curated Release Notes**: Manual blog posts for major releases
   - Highlight top 3-5 features
   - Include migration guides
   - Link to full CHANGELOG.md

**Implementation**:
```bash
# Commit with changelog trailer
git commit -m "feat: add project templates

Changelog: added"

# GitLab CI generates CHANGELOG.md
gitlab-changelog --version v15.0.0

# PM writes release blog post linking to changelog
```

#### Kubernetes Approach
**Three-tier documentation**:
1. **Git tags**: Every version (semver)
2. **CHANGELOG.md**: Automated from PR labels
3. **Release blog posts**: Quarterly highlights for minor releases

**Rationale**:
- Users need different levels of detail
- Technical users: CHANGELOG.md
- Decision makers: Blog posts with business value

#### Semantic-Release Pattern
**Automated everything**:
- Analyzes conventional commits
- Determines next version
- Generates CHANGELOG.md
- Creates GitHub Release
- Publishes package

**Configuration**:
```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/github",
    "@semantic-release/git"
  ]
}
```

**Customization for significance**:
```javascript
// Only create GitHub Release for MINOR+ versions
"github": {
  "successComment": false,
  "releasedLabels": false,
  "createRelease": (version) => version.minor > 0 || version.major > 0
}
```

---

## 4. Continuous Delivery Patterns

### Core Principle: Decouple Deployment from Release

**Traditional Problem**:
- Deployment = Release = Feature goes live
- All-or-nothing: can't deploy without releasing
- Rollback requires redeployment

**Modern Solution**:
- Deployment = Code in production (feature flagged off)
- Release = Feature exposed to users (flag toggled on)
- Rollback = Toggle flag (instant, no deployment)

### Implementation Strategies

#### A. Feature Flags + Continuous Deployment
**Architecture**:
```kotlin
// CycleTime example
class FeatureFlags(private val config: FeatureFlagConfig) {
    fun isEnabled(feature: String, user: User? = null): Boolean {
        return when (feature) {
            "project-hierarchy" -> config.projectHierarchy.isEnabled(user)
            "advanced-search" -> config.advancedSearch.isEnabled(user)
            else -> false
        }
    }
}

// Usage in application
if (featureFlags.isEnabled("project-hierarchy")) {
    // New feature code path
} else {
    // Legacy code path
}
```

**Benefits**:
- Deploy 10x per day, release 1x per week
- Progressive rollouts (5% → 25% → 50% → 100%)
- A/B testing in production
- Instant rollback without deployment

#### B. Release Gates in CI/CD
**Automated Quality Gates**:
```yaml
# GitHub Actions
deploy-staging:
  runs-on: ubuntu-latest
  steps:
    - name: Run tests
      run: ./gradlew check

    - name: Deploy to staging
      run: ./deploy.sh staging

    # Automatic progression
    - name: Smoke tests
      run: ./smoke-tests.sh staging

    - name: Auto-promote to production
      if: github.ref == 'refs/heads/main' && steps.smoke-tests.outcome == 'success'
      run: ./deploy.sh production

# Manual gate for major releases
release-production:
  needs: deploy-staging
  if: github.event_name == 'release'
  environment:
    name: production
    approval-required: true  # Manual gate
```

**Gate Types**:
1. **Automated**: Tests, smoke tests, performance benchmarks
2. **Manual**: Approval for MAJOR versions, security changes
3. **Time-based**: Deploy during business hours only
4. **Metric-based**: Error rate < 1%, p99 latency < 500ms

#### C. Progressive Deployment Patterns
**Canary Releases**:
- Deploy to 5% of infrastructure
- Monitor metrics (error rate, latency)
- Auto-rollback if degradation detected
- Gradually increase to 100%

**Blue-Green Deployments**:
- Deploy to "green" environment
- Run smoke tests
- Switch traffic from "blue" to "green"
- Keep "blue" for instant rollback

**Ring Deployments**:
- Ring 0: Internal users (dogfooding)
- Ring 1: Beta users (early adopters)
- Ring 2: 10% of production
- Ring 3: All users

### Separation of Concerns

**Deployment Activities** (Engineering):
- Code pushed to production infrastructure
- Containers updated
- Database migrations applied
- No user-visible changes

**Release Activities** (Product):
- Feature flags toggled on
- Release notes published
- Marketing announcements
- User documentation updated

**Example Timeline**:
```
Monday:    Deploy v2.5.0 to production (all features flagged off)
Tuesday:   Enable "project-hierarchy" for internal users
Wednesday: Enable for 10% of users, monitor metrics
Thursday:  Expand to 50% of users
Friday:    Create GitHub Release v2.5.0 announcing feature
           Toggle flag to 100%
```

**Benefits**:
- **Technical risk** (deployment) separated from **business risk** (release)
- Can deploy multiple times before releasing
- Can release without deploying (toggle existing features)
- Reduces mean time to recovery (MTTR) from hours to seconds

---

## 5. GitHub Release Best Practices

### When to Create a GitHub Release

**Always Create Release**:
- ✅ MAJOR version bumps (breaking changes)
- ✅ MINOR bumps with user-facing features
- ✅ Security fixes (any severity)
- ✅ Performance improvements > 20%
- ✅ Milestone achievements (GA, beta launch)

**Skip GitHub Release** (tag only):
- ❌ PATCH bumps for internal refactoring
- ❌ Documentation-only changes
- ❌ Dependency updates (no user impact)
- ❌ CI/CD configuration changes
- ❌ Code style/formatting fixes

**Decision Framework**:
```
Does this change...
  ├─ Require user action? ────────────────► YES → Create Release
  ├─ Add user-visible feature? ───────────► YES → Create Release
  ├─ Fix user-reported bug? ──────────────► MAYBE → Create if significant
  ├─ Improve performance noticeably? ─────► YES → Create Release
  ├─ Change API/CLI interface? ───────────► YES → Create Release
  └─ Internal change only? ───────────────► NO → Tag only, update CHANGELOG
```

### Using GitHub Release Features

#### 1. Pre-Release Flag
**Use for**:
- Beta versions: `v2.5.0-beta.1`
- Release candidates: `v2.5.0-rc.1`
- Nightly builds: `v2.5.0-nightly-20251030`

**Benefits**:
- Doesn't update "Latest Release" badge
- Separate notification channel
- Users can opt into early access

**Implementation**:
```bash
# Create pre-release
gh release create v2.5.0-beta.1 \
  --title "v2.5.0 Beta 1" \
  --notes "Preview release for testing" \
  --prerelease

# Graduate to stable
gh release create v2.5.0 \
  --title "v2.5.0 - Project Hierarchy" \
  --notes-file RELEASE_NOTES.md
```

#### 2. Release Discussions
**Enable for**:
- Gathering feedback on new features
- Q&A about breaking changes
- Community engagement

**Example**:
```markdown
# v2.5.0 Released! 🎉

We're excited to announce project hierarchy support...

## Feedback Welcome
- What do you think of the new project structure?
- Are there edge cases we missed?

[Discussion link: #123]
```

#### 3. Release Assets
**Attach artifacts**:
- Binary distributions (`cycletime-macos-arm64.tar.gz`)
- Docker image manifests (`docker-compose.yml`)
- Documentation PDFs (`user-guide-v2.5.0.pdf`)
- Checksums (`SHA256SUMS.txt`)

**Automation**:
```yaml
# GitHub Actions
- name: Upload Release Assets
  uses: softprops/action-gh-release@v1
  with:
    files: |
      dist/*.tar.gz
      dist/*.zip
      dist/SHA256SUMS.txt
```

#### 4. Release Notes Structure
**Recommended Template**:
```markdown
# v2.5.0 - Descriptive Title

## 🎯 Highlights
Brief summary of the most important changes (2-3 sentences)

## ✨ New Features
- **Project Hierarchy**: Organize projects into folders (SPI-XXX)
- **Advanced Search**: Filter by multiple criteria (SPI-XXX)

## 🐛 Bug Fixes
- Fixed authentication timeout issue (SPI-XXX)
- Resolved race condition in session cleanup (SPI-XXX)

## ⚡ Performance Improvements
- 40% faster query execution
- Reduced memory usage by 25%

## 📚 Documentation
- Added migration guide for v2.x users
- Updated API reference

## 🔗 Links
- [Full Changelog](CHANGELOG.md#v250)
- [Migration Guide](docs/migration/v2-to-v3.md)
- [Docker Hub](https://hub.docker.com/r/cycletime/cycletime)

## 📦 Installation
```bash
docker pull cycletime/cycletime:2.5.0
# or
curl -L https://github.com/cycletime/cycletime/releases/download/v2.5.0/install.sh | sh
```

**Contributors**: @user1, @user2, @user3
```

### Archive and Retention

**GitHub's Policies**:
- Releases: Never deleted automatically
- Release assets: Stored indefinitely (within LFS limits)
- Workflow artifacts: 90 days default retention

**Recommendations**:
1. **Keep all releases**: No need to delete old releases (free)
2. **Prune pre-releases**: Delete outdated beta/RC after stable release
3. **Asset management**: Large binaries (>100MB) consider external hosting
4. **Documentation**: Link to docs site for detailed guides (reduce release note size)

**Cleanup Strategy**:
```bash
# Delete pre-releases older than 30 days
gh release list --limit 100 | grep "Pre-release" | \
  awk '{print $3}' | \
  while read tag; do
    CREATED=$(gh release view $tag --json createdAt -q .createdAt)
    AGE_DAYS=$(( ($(date +%s) - $(date -d "$CREATED" +%s)) / 86400 ))
    if [ $AGE_DAYS -gt 30 ]; then
      echo "Deleting old pre-release: $tag (${AGE_DAYS} days old)"
      gh release delete $tag --yes
    fi
  done
```

---

## Recommendations for CycleTime

### Recommended Approach: Hybrid Pattern

**Strategy**: Tag every commit, create GitHub Releases selectively

#### Phase 1: Foundation (Current Sprint)
✅ **Already Implemented**:
- Conventional commits (SPI-849)
- Semantic versioning automation
- git-cliff for changelog generation (SPI-820)

🔨 **Add**:
1. **Automated Tagging** (every commit to main):
   ```yaml
   # .github/workflows/tag-release.yml
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
             fetch-depth: 0

         - name: Determine Next Version
           id: version
           run: |
             # Use git-cliff to determine next version from conventional commits
             NEXT_VERSION=$(git cliff --bumped-version)
             echo "version=$NEXT_VERSION" >> $GITHUB_OUTPUT

         - name: Create Tag
           run: |
             git tag ${{ steps.version.outputs.version }}
             git push origin ${{ steps.version.outputs.version }}
   ```

2. **Automated CHANGELOG.md** (updated on every tag):
   ```yaml
   - name: Update CHANGELOG
     run: |
       git cliff --tag ${{ steps.version.outputs.version }} -o CHANGELOG.md
       git add CHANGELOG.md
       git commit -m "docs: update CHANGELOG for ${{ steps.version.outputs.version }}"
       git push
   ```

#### Phase 2: Selective GitHub Releases

**Decision Matrix**:
```
Conventional Commit Type → GitHub Release?
├─ feat(ui):    → YES (user-facing feature)
├─ feat(api):   → YES (API change)
├─ feat(mcp):   → MAYBE (developer-facing, GA milestone only)
├─ feat(docs):  → NO (documentation only)
├─ fix:         → MAYBE (if Critical/High severity)
├─ perf:        → YES (if >20% improvement)
├─ refactor:    → NO (internal change)
├─ test:        → NO (internal change)
├─ chore:       → NO (maintenance)
├─ ci:          → NO (CI/CD config)
└─ build:       → NO (build config)
```

**Implementation Options**:

**Option A: Manual Trigger** (Recommended for CycleTime)
```yaml
# .github/workflows/create-release.yml
name: Create GitHub Release
on:
  workflow_dispatch:
    inputs:
      tag:
        description: 'Tag to create release for'
        required: true
      highlight:
        description: 'Feature to highlight (2-3 sentences)'
        required: false

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.tag }}

      - name: Generate Release Notes
        run: |
          git cliff --tag ${{ inputs.tag }} --current > release-notes.md
          if [ -n "${{ inputs.highlight }}" ]; then
            echo "## Highlights" | cat - release-notes.md > temp
            echo "${{ inputs.highlight }}" >> temp
            echo "" >> temp
            cat release-notes.md >> temp
            mv temp release-notes.md
          fi

      - name: Create Release
        run: |
          gh release create ${{ inputs.tag }} \
            --title "CycleTime ${{ inputs.tag }}" \
            --notes-file release-notes.md
```

**Option B: Semi-Automated** (Based on commit type)
```yaml
- name: Determine if Release Worthy
  id: check
  run: |
    # Check if this version contains user-facing changes
    CHANGES=$(git cliff --tag $VERSION --unreleased --context)
    FEATURES=$(echo "$CHANGES" | jq -r '.commits[] | select(.type == "feat" and (.scope | contains("ui") or contains("api")))')

    if [ -n "$FEATURES" ]; then
      echo "create_release=true" >> $GITHUB_OUTPUT
    else
      echo "create_release=false" >> $GITHUB_OUTPUT
    fi

- name: Create GitHub Release
  if: steps.check.outputs.create_release == 'true'
  run: gh release create $VERSION --notes-file release-notes.md
```

#### Phase 3: Pre-Release Strategy (Future)

**Use Cases**:
1. **Beta Deployments**: Staging environment releases
   - Tag: `v1.2.0-beta.1`
   - Pre-release flag: Yes
   - Audience: Internal team, early adopters

2. **Release Candidates**: GA blockers testing
   - Tag: `v1.2.0-rc.1`
   - Pre-release flag: Yes
   - Audience: Beta testers, integration partners

3. **Stable Releases**: Production deployments
   - Tag: `v1.2.0`
   - Pre-release flag: No
   - Audience: All users

**Branch Strategy**:
```
main → v1.2.0 (stable release)
beta → v1.2.0-beta.1 (pre-release)
rc → v1.2.0-rc.1 (pre-release)
```

---

### Implementation Roadmap

**Sprint 1** (SPI-882: Environment promotion pipeline):
- ✅ Tag automation on main branch
- ✅ CHANGELOG.md generation
- ✅ Manual GitHub Release workflow
- ✅ Release template with git-cliff categories

**Sprint 2** (Post-SPI-882):
- 🔨 Pre-release workflow for staging deployments
- 🔨 Release significance decision matrix documentation
- 🔨 Team training on "when to create Release"

**Sprint 3** (GA Preparation):
- 🔨 Release badge on README
- 🔨 Release notification strategy
- 🔨 Documentation site integration with releases

---

### Communication Strategy

**Internal Team**:
- **Slack notification** on every tag (all versions)
- **Email digest** weekly with GitHub Releases (significant versions)
- **Standup mention** for GA milestone releases

**External Users** (Post-GA):
- **GitHub Watch** → Releases only (not tags)
- **Release blog posts** for MINOR+ versions
- **Twitter/Mastodon** announcements for MAJOR versions
- **Discord/Community** updates for beta releases

**Example Notification Hierarchy**:
```
PATCH (v1.2.3):
  ├─ Git Tag: Yes
  ├─ CHANGELOG.md: Yes
  ├─ GitHub Release: No
  ├─ Slack: Yes (bot notification)
  └─ User notification: No

MINOR (v1.3.0):
  ├─ Git Tag: Yes
  ├─ CHANGELOG.md: Yes
  ├─ GitHub Release: Yes
  ├─ Slack: Yes (team mention)
  ├─ Blog post: If significant feature
  └─ User notification: If user-facing

MAJOR (v2.0.0):
  ├─ Git Tag: Yes
  ├─ CHANGELOG.md: Yes
  ├─ GitHub Release: Yes (detailed)
  ├─ Slack: Yes (everyone mention)
  ├─ Blog post: Always
  ├─ Migration guide: Always
  └─ User notification: Always (breaking changes)
```

---

## References and Further Reading

### Authoritative Sources

1. **Trunk-Based Development**
   - Official Guide: https://trunkbaseddevelopment.com/
   - Atlassian Guide: https://www.atlassian.com/continuous-delivery/continuous-integration/trunk-based-development
   - Google SRE Book: "Release Engineering" chapter

2. **Semantic Versioning**
   - Official Specification: https://semver.org/
   - semantic-release: https://github.com/semantic-release/semantic-release
   - Conventional Commits: https://www.conventionalcommits.org/

3. **Continuous Delivery**
   - "Continuous Delivery" by Jez Humble and David Farley
   - "Accelerate" by Nicole Forsgren, Jez Humble, Gene Kim
   - O'Reilly "Continuous Delivery in the Wild" (Chapter 4: Deployment and Release)

4. **Feature Flags**
   - Martin Fowler: "Feature Toggles" https://martinfowler.com/articles/feature-toggles.html
   - LaunchDarkly Best Practices: https://docs.launchdarkly.com/guides/best-practices
   - Split.io Engineering Blog: "Decoupling Deployment from Release"

### Real-World Examples

**Kubernetes**:
- Release Process: https://kubernetes.io/releases/release/
- Patch Policy: https://kubernetes.io/releases/patch-releases/
- KEP-2572 (Release Cadence): https://github.com/kubernetes/enhancements/blob/master/keps/sig-release/2572-release-cadence/README.md

**GitLab**:
- Release Automation Tutorial: https://about.gitlab.com/blog/tutorial-automated-release-and-release-notes-with-gitlab/
- Engineering Blog: "How We Release"
- Changelog Generation: GitLab Changelog API

**GitHub Actions** (dogfooding example):
- Releasing Actions: https://docs.github.com/actions/creating-actions/releasing-and-maintaining-actions
- Release Process: Major versions (v1, v2) as git tags with MINOR/PATCH releases

**semantic-release Projects**:
- Angular: https://github.com/angular/angular (automated release notes)
- Jest: https://github.com/jestjs/jest (conventional commits → releases)
- Gatsby: https://github.com/gatsbyjs/gatsby (monorepo releases)

---

## Conclusion

The research reveals a clear industry pattern: **successful CD teams separate technical versioning (tags) from business communication (releases)**. The key to avoiding "noise fatigue" is selective curation—tag everything, but only create GitHub Releases for changes worth announcing.

For CycleTime's trunk-based development with semantic versioning:

1. **Automate tagging** for every meaningful commit (feat/fix/perf)
2. **Maintain CHANGELOG.md** with comprehensive history (git-cliff)
3. **Create GitHub Releases manually** for user-facing milestones
4. **Use pre-release flags** for beta/staging deployments
5. **Decouple deployment from release** using feature flags (future enhancement)

This approach provides:
- ✅ Complete version history (no gaps)
- ✅ Curated announcements (no noise)
- ✅ Flexibility to highlight important features
- ✅ Automation where it matters (versioning)
- ✅ Human judgment where it matters (communication)

The "noise problem" isn't solved by releasing less frequently—it's solved by **communicating more intentionally**. Let automation handle the mechanics; let humans handle the storytelling.

---

**Next Steps for CycleTime**:
1. Implement automated tagging workflow (SPI-882)
2. Document release significance decision matrix (team guide)
3. Create manual GitHub Release workflow with template
4. Train team on "when to create a Release" criteria

**Long-term Vision**:
- Feature flags for deployment/release decoupling
- Pre-release strategy for beta testing
- Release blog posts for MINOR+ versions (post-GA)
- Community engagement via release discussions
