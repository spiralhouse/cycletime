# Profile Configuration Migration Guide

## Overview

This document describes how to migrate existing CycleTime deployments to the new profile configuration system introduced in the simplified DI implementation.

## What Changed

### Previous Configuration
- Profile resolution was embedded in the DI configuration with complex nested fallbacks
- Test databases used non-deterministic naming (`System.currentTimeMillis()`)
- No validation of profile strings
- Limited error handling for configuration issues

### New Configuration
- Centralized profile resolution through `ConfigurationResolver`
- Deterministic test database naming with multiple strategies
- Profile validation with clear error messages
- Comprehensive error handling throughout the DI system

## Migration Steps

### 1. Update Environment Variables

If you're using environment variables to set the profile:

**Before:**
```bash
# Accepted any string, defaulted silently to DEV
export KTOR_PROFILE=production-v2
```

**After:**
```bash
# Must be one of: dev, test, prod, development, testing, production
export APPLICATION_PROFILE=prod
```

### 2. Update Configuration Files

If you're using `application.conf`:

**Before:**
```hocon
application {
    # Any string was accepted
    profile = "production-staging"
}
```

**After:**
```hocon
application {
    # Must be a valid profile string
    profile = "prod"
}
```

### 3. Update Test Configurations

Tests now use deterministic database naming:

**Before:**
```kotlin
// Non-deterministic, could cause conflicts
val db = Database.connect(
    "jdbc:h2:mem:test_${System.currentTimeMillis()}"
)
```

**After:**
```kotlin
// Deterministic with multiple strategies
val db = TestDatabaseFactory.createTestDatabase(
    TestDatabaseNamingStrategy.UUID  // or SEQUENTIAL, FIXED
)
```

### 4. Handle Configuration Errors

The new system validates configuration and fails fast:

**Before:**
```kotlin
// Silent fallback to DEV
configureSimplifiedDependencies("invalid-profile")
```

**After:**
```kotlin
try {
    configureSimplifiedDependencies("invalid-profile")
} catch (e: IllegalArgumentException) {
    // Handle invalid profile
    logger.error("Invalid profile: ${e.message}")
}
```

## Profile Resolution Order

The system resolves profiles in this order:
1. Explicit parameter to `configureSimplifiedDependencies()`
2. `APPLICATION_PROFILE` environment variable
3. `application.profile` in configuration file
4. Default to `DEV`

## Valid Profile Values

| Profile | Accepted Strings | Use Case |
|---------|-----------------|-----------|
| DEV | `dev`, `development` | Local development |
| TEST | `test`, `testing` | Automated testing |
| PROD | `prod`, `production` | Production deployment |

## Breaking Changes

### 1. Invalid Profile Strings Now Fail
- **Impact**: Applications with typos or custom profile names will fail to start
- **Fix**: Update to use valid profile strings

### 2. Test Database Naming Changed
- **Impact**: Tests relying on specific database names may need updates
- **Fix**: Use `TestDatabaseFactory` with appropriate naming strategy

### 3. Environment Variable Name Changed
- **Impact**: Deployments using `KTOR_PROFILE` need to update
- **Fix**: Change to `APPLICATION_PROFILE`

## Rollback Strategy

If you need to rollback to the previous configuration:

1. **Keep the old DIProfile.fromString() method** that defaults to DEV instead of throwing
2. **Revert to System.currentTimeMillis()** for test databases (not recommended)
3. **Use the backward compatibility function** `configureEnhancedDependencies()`

## Benefits of Migration

1. **Better Error Messages**: Clear indication of what went wrong
2. **Fail-Fast**: Configuration issues caught at startup, not runtime
3. **Deterministic Testing**: Reproducible test database names
4. **Simplified Configuration**: Cleaner resolution logic
5. **Security**: No sensitive information leaked in error messages

## Example Migration

### Docker Deployment

**Before (docker-compose.yml):**
```yaml
services:
  cycletime:
    environment:
      - KTOR_PROFILE=production
```

**After:**
```yaml
services:
  cycletime:
    environment:
      - APPLICATION_PROFILE=prod
```

### Kubernetes Deployment

**Before (deployment.yaml):**
```yaml
env:
  - name: KTOR_PROFILE
    value: "production"
```

**After:**
```yaml
env:
  - name: APPLICATION_PROFILE
    value: "prod"
```

### CI/CD Pipeline

**Before (.github/workflows/test.yml):**
```yaml
- name: Run Tests
  env:
    KTOR_PROFILE: testing
  run: ./gradlew test
```

**After:**
```yaml
- name: Run Tests
  env:
    APPLICATION_PROFILE: test
  run: ./gradlew test
```

## Monitoring the Migration

After migration, monitor for:

1. **Startup failures** with message "Invalid profile"
2. **Health check failures** at `/health` endpoint
3. **Test failures** related to database initialization
4. **Log entries** with "Failed to initialize database"

## Support

If you encounter issues during migration:

1. Check the profile string is valid (see table above)
2. Verify environment variables are set correctly
3. Review application logs for detailed error messages
4. Use the health endpoint to verify service status

## Timeline

- **Phase 1**: Update development environments
- **Phase 2**: Update test/staging environments
- **Phase 3**: Update production environments (with rollback plan ready)

The migration should be completed within one release cycle to avoid maintaining two configuration systems.