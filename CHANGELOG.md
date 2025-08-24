# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Documentation reorganization for better navigation
- Comprehensive testing strategy documentation
- API reference documentation
- Getting started guides

## [0.3.0] - 2025-08-23

### Added
- Gradle 9.0 upgrade with 97% performance improvement
- Enhanced exception logging with security considerations
- Debug logging for session management
- Comprehensive test plan for CD implementation
- Production approval procedures
- Staging promotion guide
- Environment protection setup

### Fixed
- CI/CD pipeline version extraction with --quiet flag
- YAML syntax errors in GitHub Actions
- Artifact upload path preventing nested directories
- Gradle setup action compatibility issues
- Concurrency control for simultaneous promotions

### Changed
- Upgraded Gradle from 8.10 to 9.0.0
- Updated plugin versions for Gradle 9.0 compatibility
- Improved CI/CD pipeline with Git.SemVersioning
- Replaced Release Please with semantic versioning

### Security
- Added exception sanitization for user-facing errors
- Implemented secure logging practices

## [0.2.0] - 2025-08-22

### Added
- Git.SemVersioning for automatic version management
- Continuous Delivery pipeline
- Container promotion strategy (dev → staging → production)
- GitHub Container Registry integration
- Comprehensive CI/CD documentation

### Changed
- Migrated from Release Please to Git.SemVersioning
- Consolidated CI and CD workflows

### Removed
- Old CI workflow files
- Release Please configuration

## [0.1.0] - 2025-08-21

### Added
- Initial Kotlin implementation with Domain-Driven Design
- MCP server integration for Claude Code
- SQLite persistence with Exposed ORM
- Docker containerization support
- GraalVM native image compilation (experimental)
- Health monitoring endpoints
- Comprehensive test suites
- GitHub Actions CI pipeline

### Features
- Project orchestration capabilities
- Issue tracking and management
- Session state persistence
- Cross-session continuity
- Rich domain models
- Clean architecture patterns

## Notes

- Version numbers follow Semantic Versioning (MAJOR.MINOR.PATCH)
- Breaking changes trigger major version bumps
- New features trigger minor version bumps
- Bug fixes trigger patch version bumps

[Unreleased]: https://github.com/spiralhouse/jcvd/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/spiralhouse/jcvd/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/spiralhouse/jcvd/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/spiralhouse/jcvd/releases/tag/v0.1.0