# Contributing to JCVD

Thank you for your interest in contributing to JCVD! This document provides guidelines for contributing to the project, with a focus on maintaining high code quality and consistent commit practices.

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

JCVD uses [Conventional Commits](https://conventionalcommits.org/) specification to enable automated changelog generation and semantic versioning through [Release Please](https://github.com/googleapis/release-please).

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

#### Simple feature
```
feat(auth): add OAuth2 integration

Implement Google OAuth2 authentication flow for user login.
This replaces the previous basic auth system.

Closes #123
```

#### Bug fix
```
fix(api): handle null response in user endpoint

The /api/users endpoint could return null when user
data was not found, causing client applications to crash.
Now returns 404 with proper error message.

Fixes #456
```

#### Breaking change
```
feat!: drop support for Node.js 16

Node.js 16 reaches end-of-life and we need features
from Node.js 18+ for improved performance.

BREAKING CHANGE: Node.js 18 or higher is now required
```

#### Documentation
```
docs: update installation instructions

Add missing step for database migration and clarify
JDK version requirements.
```

#### Build system
```
build: upgrade gradle to version 8.5

Improves build performance and adds support for
new Kotlin compiler features.
```

### Validation

All commit messages are automatically validated in CI using [commitlint](https://commitlint.js.org). The validation:

- Runs on all pull requests
- Checks every commit in the PR
- Must pass before merging
- Provides helpful error messages

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
docker build -t jcvd:dev .
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

JCVD uses automated releases via Release Please:

1. **Conventional commits** drive version bumping
2. **Changelog** generated from commit messages
3. **Releases** created automatically on main branch
4. **Container images** published to GitHub Container Registry

### Version Bumping

- `fix:` commits trigger patch releases (0.0.X)
- `feat:` commits trigger minor releases (0.X.0)
- `BREAKING CHANGE:` triggers major releases (X.0.0)

## Getting Help

- **Issues**: Use GitHub Issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check `docs/` directory for detailed guides
- **Examples**: See existing code for patterns and conventions

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.

---

Thank you for contributing to JCVD! 🚀