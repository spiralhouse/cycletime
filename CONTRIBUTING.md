# Contributing to CycleTime CE

Thank you for your interest in contributing to CycleTime CE! This document provides guidelines for contributing to the project, with a focus on maintaining high code quality and consistent commit practices.

## Table of Contents

- [Getting Started](#getting-started)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Development Workflow](#development-workflow)
- [Code Quality Standards](#code-quality-standards)
- [Pull Request Process](#pull-request-process)

## Getting Started

1. **Fork the repository** and clone your fork:
   ```bash
   git clone https://github.com/your-username/jcvd.git
   cd jcvd
   ```

2. **Set up your development environment**:
   ```bash
   # Install JDK 21
   # Install Node.js 20+ for commitlint

   # Install commit message template
   git config commit.template .gitmessage

   # Install commitlint dependencies
   npm install
   ```

3. **Run tests to ensure everything works**:
   ```bash
   ./gradlew test
   ```

## Commit Message Guidelines

CycleTime CE uses [Conventional Commits](https://conventionalcommits.org/) specification to enable automated changelog generation and semantic versioning through [Release Please](https://github.com/googleapis/release-please).

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Rules

#### Type (Required)
The commit type must be one of the following:

- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation changes
- **style**: Code style changes (formatting, whitespace, etc)
- **refactor**: Code refactoring without changing functionality
- **perf**: Performance improvements
- **test**: Adding or modifying tests
- **build**: Build system changes (gradle, dependencies)
- **ci**: CI/CD configuration changes
- **chore**: Other changes (maintenance, dependencies)
- **revert**: Reverting previous commits

#### Scope (Optional)
The scope provides additional context about the affected area:

- **auth**: Authentication and authorization
- **api**: REST API endpoints
- **ui**: User interface components
- **db**: Database-related changes
- **ci**: CI/CD pipeline changes
- **docs**: Documentation updates
- **test**: Test-related changes

#### Subject (Required)
- Use imperative mood: "add" not "added" or "adds"
- Start with lowercase letter
- Maximum 50 characters
- No trailing period
- Be concise but descriptive

#### Body (Optional)
- Wrap at 72 characters
- Explain **what** and **why**, not **how**
- Leave blank line between subject and body
- Use imperative mood

#### Footer (Optional)
- Include breaking changes: `BREAKING CHANGE: <description>`
- Reference issues: `Closes #123`, `Fixes #456`, `Refs #789`

### Examples

#### Simple feature (triggers MINOR release)
```
feat(auth): add OAuth2 integration

Implement Google OAuth2 authentication flow for user login.
This replaces the previous basic auth system.

Closes #123
```
*This will trigger a minor version release (0.1.0 → 0.2.0)*

#### Bug fix (triggers PATCH release)
```
fix(api): handle null response in user endpoint

The /api/users endpoint could return null when user
data was not found, causing client applications to crash.
Now returns 404 with proper error message.

Fixes #456
```
*This will trigger a patch version release (0.1.0 → 0.1.1)*

#### Breaking change (triggers MAJOR release)
```
feat!: drop support for Node.js 16

Node.js 16 reaches end-of-life and we need features
from Node.js 18+ for improved performance.

BREAKING CHANGE: Node.js 18 or higher is now required
```
*This will trigger a major version release (0.1.0 → 1.0.0)*

#### Alternative breaking change syntax
```
feat(api): redesign session management

Implement new session architecture with improved security
and better performance characteristics.

BREAKING CHANGE: Session token format has changed. Existing
sessions will be invalidated and users must re-authenticate.

Closes #789
```
*This also triggers a major version release*

#### Documentation (no release)
```
docs: update installation instructions

Add missing step for database migration and clarify
JDK version requirements.
```
*This will not trigger a release*

#### Build system (no release)
```
build: upgrade gradle to version 8.5

Improves build performance and adds support for
new Kotlin compiler features.
```
*This will not trigger a release*

#### Security fix (triggers PATCH release)
```
fix(security): patch authentication bypass vulnerability

Address critical security issue where malformed JWT tokens
could bypass authentication checks.

SECURITY: Fixes CVE-2024-XXXX authentication bypass
Closes #SECURITY-123
```
*This will trigger an immediate patch release for security*

#### Performance improvement (triggers MINOR release)
```
perf(db): optimize query performance for large datasets

Implement connection pooling and query result caching
to improve response times by 60% for data-heavy operations.

Closes #456
```
*This will trigger a minor version release*

### Version Impact

Understanding how your commits affect releases:

| Commit Type | Version Bump | Release Impact | Example |
|-------------|--------------|----------------|---------|
| `fix:` | PATCH (0.0.X) | Bug fix release | `fix(api): handle null user data` |
| `feat:` | MINOR (0.X.0) | Feature release | `feat(auth): add OAuth2 support` |
| `BREAKING CHANGE:` | MAJOR (X.0.0) | Breaking change | `feat!: redesign API endpoints` |
| `docs:`, `style:`, `test:` | None | No release | Documentation/test updates |

### How Releases Work

**Automatic Release Process:**
1. **Commit Analysis**: Release Please scans all commits since the last release
2. **Version Calculation**: Determines next version based on commit types above
3. **Release PR**: Creates PR with updated version and generated changelog
4. **Manual Review**: Team reviews and approves release PR
5. **Automated Release**: Merging release PR triggers full release pipeline

**What Gets Released:**
- 📦 JAR archive with all dependencies
- 🐳 Container image (ghcr.io/spiralhouse/jcvd:version)
- 🚀 Native image (experimental)
- 📝 Generated changelog with all changes
- 🔒 SHA256 checksums for security verification

### Validation

All commit messages are automatically validated in CI using [commitlint](https://commitlint.js.org). The validation:

- Runs on all pull requests
- Checks every commit in the PR
- Must pass before merging
- Provides helpful error messages
- Prevents releases from broken commit messages

### Local Setup

Enable the commit message template:
```bash
git config commit.template .gitmessage
```

Test your commit messages locally:
```bash
# Validate last commit
npm run commitlint-ci

# Validate all commits in current branch
npm run commitlint-pr
```

## Development Workflow

### Branch Naming

Follow the established conventions:
- `feat/spi-XXX-description` - New features
- `fix/spi-XXX-description` - Bug fixes
- `docs/description` - Documentation changes
- `refactor/description` - Code refactoring

### Testing

Before submitting your changes:

```bash
# Run all tests
./gradlew test

# Run specific test suites
./gradlew unitTest           # Fast unit tests
./gradlew integrationTest    # Database integration tests
./gradlew systemTest        # End-to-end performance tests

# Run code quality checks
./gradlew detekt

# Check test coverage
./gradlew koverVerify
```

### Local Development

```bash
# Start development server
./gradlew run

# Build application
./gradlew build

# Build Docker image
docker build -t cycletime-ce:dev .
```

## Code Quality Standards

### Architecture Guidelines

- Follow Domain-Driven Design principles
- Use dependency injection (Ktor native DI)
- Write testable code with proper abstractions
- Maintain clear separation of concerns

### Testing Requirements

- **Unit tests**: 100% coverage of business logic
- **Integration tests**: All database operations
- **System tests**: Critical user workflows
- All tests must be deterministic and fast

### Code Style

- Follow Kotlin coding conventions
- Use detekt for static analysis
- All code must pass detekt checks
- Maintain consistent formatting

## Pull Request Process

1. **Create descriptive PR title**:
   ```
   feat(auth): implement OAuth2 integration with Google
   ```

2. **Fill out PR template** with:
   - Summary of changes
   - Testing approach
   - Breaking changes (if any)
   - Documentation updates

3. **Ensure all checks pass**:
   - ✅ Commit message validation
   - ✅ All tests pass
   - ✅ Code quality checks
   - ✅ Security scans
   - ✅ Build succeeds

4. **Request review** from maintainers

5. **Address feedback** and update as needed

6. **Squash commits** if requested to maintain clean history

### PR Requirements

- All CI checks must pass
- At least one approving review
- No merge conflicts
- Up-to-date with main branch

## Release Process

CycleTime CE uses a fully automated release process via [Release Please](https://github.com/googleapis/release-please) with comprehensive quality gates and multi-format artifact distribution.

### Complete Release Pipeline

1. **Development**: Feature branches with conventional commits
2. **Pull Request**: Automated validation (tests, linting, security scans)
3. **Merge to Main**: Triggers Release Please analysis
4. **Release PR Generation**: Automated version bump and changelog
5. **Release Review**: Manual approval of generated release PR
6. **Release Execution**: Full automated pipeline on release PR merge

### What Happens During a Release

**Automated Pipeline Execution:**
- 🔨 **Artifact Building**: JAR, native image, container image
- 🧪 **Quality Validation**: Full test suite, security scans, performance checks
- 🐳 **Container Publishing**: Multi-tag strategy to GitHub Container Registry
- 📦 **GitHub Release**: Automatic creation with downloadable assets
- 🔐 **Security**: SHA256 checksums and artifact attestation
- ⚡ **Performance**: Optimized builds with comprehensive caching

**Release Artifacts Generated:**
- `cycletime-ce-X.Y.Z.jar` - Executable JAR with all dependencies (~50-80MB)
- `cycletime-ce-X.Y.Z-native` - GraalVM native binary (~30-50MB, experimental)
- `ghcr.io/spiralhouse/jcvd:X.Y.Z` - Production container image (~200MB)
- `checksums-X.Y.Z.txt` - SHA256 checksums for verification

### Version Bumping Rules

| Commit Type | Version Bump | When to Use | Example Scenario |
|-------------|--------------|-------------|------------------|
| `fix:` | **PATCH** (0.0.X) | Bug fixes, security patches | API returns 500 instead of 404 |
| `feat:` | **MINOR** (0.X.0) | New features, enhancements | Add new API endpoint |
| `perf:` | **MINOR** (0.X.0) | Performance improvements | Database query optimization |
| `BREAKING CHANGE:` | **MAJOR** (X.0.0) | API changes, removed features | Change API response format |

### Container Image Tags

Each release creates multiple container tags for different use cases:

```bash
# Immutable version-specific tag (recommended for production)
ghcr.io/spiralhouse/jcvd:1.2.3

# Minor version tag (gets patch updates automatically)
ghcr.io/spiralhouse/jcvd:1.2

# Major version tag (gets minor/patch updates)
ghcr.io/spiralhouse/jcvd:1

# Latest stable release (updated with each release)
ghcr.io/spiralhouse/jcvd:latest
```

### Pre-release and Hotfix Support

**Pre-releases:**
- Release candidates: `v1.2.0-rc.1`
- Beta versions: `v1.2.0-beta.1`
- Alpha versions: `v1.2.0-alpha.1`

**Emergency Hotfixes:**
- Critical security patches follow expedited process
- Can bypass normal review cycle for severity 1 issues
- Immediate container publication for urgent fixes

For detailed release procedures, rollback strategies, and emergency protocols, see [docs/RELEASE_PROCESS.md](docs/RELEASE_PROCESS.md).

## Getting Help

- **Issues**: Use GitHub Issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check `docs/` directory for detailed guides
- **Examples**: See existing code for patterns and conventions

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.

---

Thank you for contributing to CycleTime CE! 🚀