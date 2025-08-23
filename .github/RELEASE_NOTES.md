# Release Process Documentation

> **📋 Complete Documentation**: For comprehensive release process documentation, see [docs/RELEASE_PROCESS.md](../docs/RELEASE_PROCESS.md)

This document provides a quick reference for the JCVD automated release process.

## Quick Reference

### Commit Types & Release Impact

| Type | Release | Example |
|------|---------|---------|
| `feat:` | **MINOR** (0.X.0) | `feat(auth): add OAuth2 support` |
| `fix:` | **PATCH** (0.0.X) | `fix(api): handle null responses` |
| `perf:` | **MINOR** (0.X.0) | `perf(db): optimize queries by 60%` |
| `BREAKING CHANGE:` | **MAJOR** (X.0.0) | `feat!: redesign API endpoints` |
| `docs:`, `test:`, `style:` | **None** | Documentation and test updates |

### Release Pipeline Overview

1. **Conventional Commit** → **Release Please Analysis** → **Release PR Creation**
2. **Manual Review** → **Release PR Merge** → **Automated Pipeline**
3. **Artifact Building** → **Container Publishing** → **GitHub Release**

### What Gets Released

- 📦 **JAR Archive**: `jcvd-X.Y.Z.jar` (~50-80MB)
- 🚀 **Native Image**: `jcvd-X.Y.Z-native` (~30-50MB, experimental)  
- 🐳 **Container Image**: `ghcr.io/spiralhouse/jcvd:X.Y.Z` (~200MB)
- 🔒 **Security**: SHA256 checksums and integrity verification

### Emergency Procedures

- **Security Patches**: Expedited release process for CVE fixes
- **Hotfixes**: Fast-track critical production issues
- **Rollbacks**: Immutable container tags enable instant rollbacks

## Key Resources

- **📋 [Complete Release Documentation](../docs/RELEASE_PROCESS.md)** - Comprehensive procedures
- **👥 [Contributing Guidelines](../CONTRIBUTING.md)** - Commit message examples  
- **🏗️ [CI/CD Architecture](../docs/CI_ARCHITECTURE.md)** - Build pipeline details
- **📊 [Performance Monitoring](https://github.com/spiralhouse/jcvd/actions)** - Release metrics

## Configuration Files

- `.github/workflows/release-please.yml` - Release Please automation
- `.github/workflows/release.yml` - Complete release pipeline  
- `release-please-config.json` - Release Please configuration
- `gradle.properties` - Primary version source (managed by Release Please)
- `.gitmessage` - Commit message template with release impact examples

---

*For detailed procedures, emergency protocols, and troubleshooting, see [docs/RELEASE_PROCESS.md](../docs/RELEASE_PROCESS.md)*