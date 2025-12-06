---
title: "SPI-921: GraalVM Native-Image Compatibility Research"
type: reference
domain: [infrastructure, build, graalvm]
description: "Comprehensive compatibility research for Ktor 3.3.2 + GraalVM native-image compilation with CycleTime technology stack"
dependencies: []
related: []
keywords: [graalvm, native-image, ktor, exposed, h2, compatibility]
last_updated: 2025-12-05
---

# SPI-921: GraalVM Native-Image Compatibility Research

**Status**: Phase 1 In Progress (Baseline Assessment)
**Decision**: Pending
**Last Updated**: 2025-12-05

---

## Executive Summary

Research to determine whether the CycleTime technology stack (Ktor 3.3.2, Exposed 0.61.0, H2 2.4.240) is compatible with GraalVM native-image compilation. This is a **CRITICAL PATH BETA BLOCKER** that determines the binary distribution strategy.

**Current Status**: Baseline native compilation test running.

---

## Technology Stack Under Test

| Component | Version | GraalVM Risk Assessment |
|-----------|---------|-------------------------|
| Kotlin | 2.2.21 | Medium - UUID SecureRandom known issues |
| Ktor | 3.3.2 | High - Historical compatibility issues |
| Ktor Engine | CIO | Medium - Coroutine-based (better than Netty) |
| Exposed ORM | 0.61.0 | High - Extensive reflection for tables |
| H2 Database | 2.4.240 | Medium - JNI considerations |
| HikariCP | 7.0.2 | Medium - Dynamic proxy generation |
| MCP Kotlin SDK | 0.7.6 | Unknown - Requires testing |
| kotlinx-serialization | 1.9.0 | Low - Compile-time code generation |
| kotlinx-coroutines | 1.10.2 | Medium - Runtime behavior |
| Logback | 1.5.20 | Low - Well-documented support |
| Micrometer | 1.14.2 | Medium - Reflection for metrics |

**GraalVM Version**: 21.0.8 (Oracle GraalVM Community Edition)
**Installation**: `~/.sdkman/candidates/java/21.0.8-graal`

---

## Phase 1: Baseline Assessment

### Environment Setup

**GraalVM Installation Verification**:
```bash
$ ls -la ~/.sdkman/candidates/java/21.0.8-graal/bin/ | grep native
lrw-r--r--  1 jburbridge  staff  27 native-image -> ../lib/svm/bin/native-image
lrw-r--r--  1 jburbridge  staff  37 native-image-configure
-rwxr-xr-x  1 jburbridge  staff  70816 native-image-inspect
```

✅ **Result**: GraalVM 21.0.8 with native-image tool confirmed installed.

### Existing GraalVM Configuration Analysis

**Configuration Files Location**: `src/main/resources/META-INF/native-image/`

#### 1. reflect-config.json

**Current Entries** (6 classes):
```json
[
  {
    "name": "kotlin.reflect.jvm.internal.KClassImpl",
    "allDeclaredConstructors": true,
    "allPublicConstructors": true,
    "allDeclaredMethods": true,
    "allPublicMethods": true
  },
  {
    "name": "io.ktor.server.application.Application",
    "allDeclaredConstructors": true,
    "allPublicConstructors": true,
    "allDeclaredMethods": true,
    "allPublicMethods": true
  },
  {
    "name": "io.ktor.server.netty.NettyApplicationEngine",  // ❌ STALE
    "allDeclaredConstructors": true,
    "allPublicConstructors": true,
    "allDeclaredMethods": true,
    "allPublicMethods": true
  },
  {
    "name": "com.zaxxer.hikari.HikariDataSource",
    "allDeclaredConstructors": true,
    "allPublicConstructors": true,
    "allDeclaredMethods": true,
    "allPublicMethods": true
  },
  {
    "name": "com.zaxxer.hikari.HikariConfig",
    "allDeclaredConstructors": true,
    "allPublicConstructors": true,
    "allDeclaredMethods": true,
    "allPublicMethods": true,
    "allDeclaredFields": true,
    "allPublicFields": true
  },
  {
    "name": "org.jetbrains.exposed.sql.Database",
    "allDeclaredConstructors": true,
    "allPublicConstructors": true,
    "allDeclaredMethods": true,
    "allPublicMethods": true
  }
]
```

**Issues Identified**:
- ❌ References `NettyApplicationEngine` but project uses **CIO engine**
- ❌ Missing entries for 6 Exposed table objects:
  - `ProjectsTable`
  - `IssuesTable`
  - `IssueDependenciesTable`
  - `IssueLabelsTable`
  - `SessionStatesTable`
  - `WorkflowsTable`
- ❌ Missing entries for 100+ `@Serializable` DTOs

**Main Entry Point** (Application.kt:26-33):
```kotlin
fun main() {
    val port = System.getenv("PORT")?.toIntOrNull() ?: 8080
    val host = System.getenv("HOST") ?: "0.0.0.0"

    embeddedServer(
        CIO,  // ← Uses CIO, not Netty
        port = port,
        host = host,
        module = Application::module
    ).start(wait = true)
}
```

#### 2. serialization-config.json

**Current Entries** (2 classes):
```json
[
  {
    "name": "io.spiralhouse.jcvd.domain.entities.SessionContext",  // ❌ WRONG PACKAGE
    "allDeclaredFields": true,
    "allDeclaredConstructors": true
  },
  {
    "name": "kotlin.Unit"
  }
]
```

**Issues Identified**:
- ❌ References `io.spiralhouse.jcvd` (old package name)
- ❌ Should be `io.spiralhouse.cycletime`
- ❌ Missing entries for domain entities and DTOs

#### 3. resource-config.json

**Current Patterns**:
```json
{
  "resources": {
    "includes": [
      {"pattern": ".*\\.properties$"},
      {"pattern": ".*\\.xml$"},
      {"pattern": ".*\\.conf$"},
      {"pattern": "META-INF/services/.*"},
      {"pattern": "logback\\.xml"},
      {"pattern": "application\\.conf"}
    ]
  }
}
```

✅ **Assessment**: Comprehensive resource patterns, likely sufficient.

#### 4. native-image.properties

**Current Configuration**:
```properties
Args = --no-fallback \
       --initialize-at-build-time=org.slf4j \
       --initialize-at-build-time=ch.qos.logback \
       --initialize-at-build-time=kotlin
```

✅ **Assessment**: Standard build-time initialization for logging and Kotlin stdlib.

### Gradle Build Configuration

**File**: `build.gradle.kts` (lines 702-734)

**GraalVM Plugin**: `org.graalvm.buildtools.native` v0.11.2

**Current Configuration** (as of 2025-12-05):
```kotlin
graalvmNative {
    binaries {
        named("main") {
            imageName.set("cycletime-server")
            mainClass.set("io.spiralhouse.cycletime.ApplicationKt")

            // Use configured Java toolchain (JVM 21)
            // GraalVM location specified via GRAALVM_HOME environment variable
            javaLauncher.set(javaToolchains.launcherFor {
                languageVersion.set(JavaLanguageVersion.of(21))
            })

            buildArgs.add("--no-fallback")
            buildArgs.add("--enable-http")
            buildArgs.add("--enable-https")
            buildArgs.add("-H:+ReportExceptionStackTraces")

            // Fix Kotlin UUID SecureRandom issue
            buildArgs.add("--initialize-at-run-time=kotlin.uuid.SecureRandomHolder")

            // Optimize for balanced size/speed
            buildArgs.add("-Ob")
            buildArgs.add("-march=compatibility")
        }
    }

    agent {
        defaultMode.set("standard")
        modes {
            standard { }
        }
        metadataCopy {
            mergeWithExisting.set(true)
            inputTaskNames.add("test")
            outputDirectories.add("src/main/resources/META-INF/native-image")
        }
    }
}
```

**Changes Made** (2025-12-05):
1. ✅ Added `javaLauncher` configuration (was missing)
2. ✅ Removed vendor-specific toolchain requirement (Gradle detection issue)
3. ✅ Using `GRAALVM_HOME` environment variable approach

**Tracing Agent Configuration**:
- ✅ Configured to run on `test` task
- ✅ Set to merge with existing configuration
- ✅ Outputs to standard `META-INF/native-image` location

### Baseline Compilation Test

**Command**:
```bash
JAVA_HOME=/Users/jburbridge/.sdkman/candidates/java/21.0.8-graal \
GRAALVM_HOME=/Users/jburbridge/.sdkman/candidates/java/21.0.8-graal \
  ./gradlew clean nativeCompile --no-configuration-cache
```

**Status**: ❌ **FAILED** (2025-12-05)

**Build Metrics**:
- Build time: 43 seconds
- Native image generation time: 25.8 seconds
- Peak RSS: 4.96GB
- Exit code: 1 (non-zero)

**Result Analysis**:
- ✅ GraalVM successfully detected and used
- ✅ Build configuration working correctly
- ❌ **Logback AsyncAppender threading issue** (CRITICAL BLOCKER)
- ❌ Binary NOT produced

**Root Cause**: Logback's `AsyncAppenderBase$Worker` creates threads during build-time class initialization. GraalVM native-image cannot serialize started threads into the native binary.

**Error Details**:
```
Error: Detected a started Thread in the image heap.
Thread name: AsyncAppender-Worker-ASYNC_FILE.

Threads running in the image generator are no longer running at image runtime.

Suggested fix:
--initialize-at-run-time=ch.qos.logback.core.AsyncAppenderBase$Worker
```

**Impact Assessment**:
- **Severity**: HIGH - Complete build failure
- **Component**: Logback 1.5.20 AsyncAppender configuration
- **Workaround Available**: Yes - initialize Logback at runtime instead of build-time
- **Configuration Change Required**: Update `native-image.properties`

---

## Issues Discovered

### Configuration Issues

| Issue | Severity | Impact | Fix Required |
|-------|----------|--------|--------------|
| Logback AsyncAppender threading issue | **CRITICAL** | **Build fails completely** | Initialize Logback at runtime |
| Netty reference in reflect-config.json | Medium | Unnecessary reflection config | Remove Netty, add CIO engine |
| Wrong package in serialization-config.json | High | Serialization may fail | Update `jcvd` → `cycletime` |
| Missing Exposed table reflection | Critical | Database operations will fail | Add all 6 table objects |
| Missing DTO serialization config | High | API responses may fail | Add @Serializable classes |
| Missing javaLauncher in build config | ✅ Fixed | Build cannot find GraalVM | Added (completed) |

### Gradle Toolchain Issues

**Problem**: Gradle toolchain auto-detection doesn't recognize GraalVM when using `vendor.set(JvmVendorSpec.GRAAL_VM)`

**Error**:
```
Cannot find a Java installation on your machine (Mac OS X 26.1 aarch64) matching:
{languageVersion=21, vendor=GraalVM Community, implementation=vendor-specific, nativeImageCapable=false}
```

**Solution**: Use `GRAALVM_HOME` environment variable instead of vendor-specific toolchain

### Logback Threading Issue (CRITICAL BLOCKER)

**Problem**: `native-image.properties` contains `--initialize-at-build-time=ch.qos.logback` which causes AsyncAppender worker threads to start during native-image build.

**Current Configuration** (`src/main/resources/META-INF/native-image/native-image.properties`):
```properties
Args = --no-fallback \
       --initialize-at-build-time=org.slf4j \
       --initialize-at-build-time=ch.qos.logback \
       --initialize-at-build-time=kotlin
```

**Root Cause**: When Logback initializes at build-time, the `AsyncAppenderBase$Worker` threads start and GraalVM cannot serialize running threads into the native binary.

**Required Fix**:
```properties
Args = --no-fallback \
       --initialize-at-build-time=org.slf4j \
       --initialize-at-run-time=ch.qos.logback \
       --initialize-at-build-time=kotlin
```

**Change**: `--initialize-at-build-time=ch.qos.logback` → `--initialize-at-run-time=ch.qos.logback`

**Trade-offs**:
- ✅ Fixes build failure (threading issue)
- ✅ Logback still works correctly at runtime
- ⚠️ Slight startup time increase (~10-50ms) as Logback initializes on first use
- ⚠️ First log message may have slight delay

**Alternative Solutions Considered**:
1. **Remove AsyncAppender from logback.xml** - Would work but loses async logging benefits
2. **Use synchronous appenders only** - Simpler config but potential performance impact
3. **Runtime initialization** (chosen) - Minimal impact, preserves async logging

**Priority**: **MUST FIX BEFORE RETRY** - This blocks all subsequent testing

---

## Next Steps

### Immediate (Phase 1 Completion)

1. ✅ Complete baseline compilation test
2. ⏳ Analyze compilation errors (if any)
3. ⏳ Run GraalVM tracing agent
4. ⏳ Web research on dependency compatibility

### Phase 2: Component Isolation Testing

1. Minimal Ktor CIO server test
2. Exposed + H2 CRUD operations test
3. kotlinx-serialization round-trip test
4. HikariCP connection pooling test

### Phase 3: Fix & Integration

1. Fix stale GraalVM configuration
2. Apply tracing agent recommendations
3. Full application native build
4. Runtime verification

### Phase 4: Cross-Platform Verification

1. Create GitHub Actions workflow
2. Test on macOS ARM64 (Critical)
3. Test on Linux x86_64 (Critical)
4. Test on macOS Intel (High)
5. Test on Windows x86_64 (Medium)

---

## Decision Criteria

### GO Criteria (All Required)
- [ ] Native binary compiles without errors
- [ ] Server starts and binds to port
- [ ] Database operations (CRUD) work
- [ ] MCP SSE endpoints function
- [ ] Startup time < 500ms
- [ ] Memory usage < 200MB at idle
- [ ] macOS ARM64 works (primary dev)
- [ ] Linux x86_64 works (server deployment)
- [ ] Configuration burden < 50 manual entries

### NO-GO Triggers (Any One)
- [ ] Core dependency fundamentally incompatible
- [ ] Reflection configuration burden > 50 manual entries
- [ ] Build time > 30 minutes
- [ ] Build memory > 32GB
- [ ] macOS ARM64 OR Linux x86_64 fails
- [ ] Startup > 2 seconds
- [ ] Memory > 500MB at idle

---

## References

- GraalVM Documentation: https://www.graalvm.org/latest/reference-manual/native-image/
- Ktor GraalVM Guide: https://ktor.io/docs/graalvm.html
- Exposed GitHub: https://github.com/JetBrains/Exposed
- GraalVM Gradle Plugin: https://graalvm.github.io/native-build-tools/latest/gradle-plugin.html

---

## Appendix: Test Logs

### Compilation Attempt Log Files

1. `graalvm-compile.log` - Initial attempt (failed: missing javaLauncher)
2. `graalvm-compile-attempt2.log` - With vendor-specific toolchain (failed: toolchain detection)
3. `graalvm-compile-attempt3.log` - With JAVA_HOME (failed: vendor restriction)
4. `graalvm-compile-attempt4.log` - With GRAALVM_HOME (failed: config cache + vendor)
5. `graalvm-compile-attempt5.log` - With GRAALVM_HOME + no config cache (running)
