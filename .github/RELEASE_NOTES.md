# Release Process Documentation

## Automated Release with Release Please

The JCVD project uses [Release Please](https://github.com/googleapis/release-please) to automate version management and changelog generation based on conventional commits.

### How It Works

1. **Conventional Commits**: All commits to the main branch should follow the [Conventional Commits](https://conventionalcommits.org/) specification
2. **Automatic PRs**: Release Please monitors commits and automatically creates release PRs with version bumps and changelog updates
3. **Release Creation**: When release PRs are merged, GitHub releases are created with built container images

### Supported Commit Types

- `feat`: New features (triggers minor version bump)
- `fix`: Bug fixes (triggers patch version bump)  
- `perf`: Performance improvements (triggers patch version bump)
- `refactor`: Code refactoring (triggers patch version bump)
- `docs`: Documentation updates (triggers patch version bump)
- `test`: Test additions/updates (triggers patch version bump)
- `build`: Build system changes (triggers patch version bump)
- `ci`: CI/CD pipeline changes (triggers patch version bump)
- `chore`: Maintenance tasks (triggers patch version bump)
- `style`: Code style changes (hidden from changelog)

### Breaking Changes

- Add `BREAKING CHANGE:` in commit footer to trigger major version bump
- Use `!` after type to indicate breaking change: `feat!: major API change`

### Example Commits

```bash
# Feature addition (minor version bump)
git commit -m "feat: add automated release workflow with Release Please"

# Bug fix (patch version bump)  
git commit -m "fix: resolve version parsing issue in build.gradle.kts"

# Breaking change (major version bump)
git commit -m "feat!: redesign project configuration API

BREAKING CHANGE: Project.create() method signature has changed"

# Documentation (patch version bump)
git commit -m "docs: update release process documentation"

# Chore (patch version bump, hidden from changelog)
git commit -m "chore: update dependency versions"
```

### Version Management

- **Current**: Versions managed in both `gradle.properties` and `build.gradle.kts`
- **Future (SPI-486)**: Will migrate fully to `gradle.properties`
- **Format**: Semantic versioning (MAJOR.MINOR.PATCH)
- **Snapshots**: Development versions use `-SNAPSHOT` suffix

### Manual Release Process (if needed)

1. Create a conventional commit for the changes
2. Push to main branch
3. Wait for Release Please to create a PR
4. Review and merge the release PR
5. Release Please will create the GitHub release and tag
6. CI will build and publish container images automatically

### Container Publishing

When releases are created:
- Container images are built and published to `ghcr.io/spiralhouse/jcvd`
- Tags include version number, latest, and commit SHA
- Images are available for production deployment

### Configuration Files

- `.github/workflows/release-please.yml` - Release Please workflow
- `release-please-config.json` - Release Please configuration
- `.release-please-manifest.json` - Current version tracking
- `gradle.properties` - Version property managed by Release Please