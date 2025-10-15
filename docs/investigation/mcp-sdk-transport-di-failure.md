# MCPSdkTransportTest DI Failure Investigation Report

**Date**: 2025-10-15
**Investigator**: QA Agent
**Status**: Root Cause Identified

---

## Executive Summary

**Root Cause**: Ktor DI cleanup ambiguity during test shutdown when multiple implementations of the same parent type are registered.

**Impact**: 16/16 MCPSdkTransportTest tests failing (100% failure rate)

**Scope**: Tests **execute successfully** but **fail during cleanup/shutdown phase**

**Fix Complexity**: Low - Configuration change, no code changes required

---

## Root Cause Analysis

### What Happened

Ktor's DI container attempts to cleanup all registered dependencies during application shutdown. When multiple concrete types share a common parent (abstract class or interface), Ktor cannot determine which instance to resolve when the parent type is referenced without explicit qualification.

### Ambiguous Type Hierarchy

**Type 1: BaseExposedRepository**
```
BaseExposedRepository (abstract parent)
├── ExposedProjectRepository
├── ExposedIssueRepository
├── ExposedSessionRepository
└── ExposedWorkflowRepository
```

**Type 2: ToolProvider**
```
ToolProvider (interface)
├── DefaultProjectToolProvider
├── DefaultIssueToolProvider
├── DefaultSessionToolProvider
└── DefaultWorkflowToolProvider
```

### Error Evidence

```
io.ktor.server.plugins.di.AmbiguousDependencyException:
Cannot decide which value for io.spiralhouse.cycletime.infrastructure.persistence.BaseExposedRepository?:
[ExposedProjectRepository, ExposedIssueRepository, ExposedSessionRepository, ExposedWorkflowRepository]

io.ktor.server.plugins.di.AmbiguousDependencyException:
Cannot decide which value for io.spiralhouse.cycletime.mcp.tools.ToolProvider?:
[DefaultProjectToolProvider, DefaultIssueToolProvider, DefaultSessionToolProvider, DefaultWorkflowToolProvider]
```

### When It Happens

**Phase**: During test shutdown/cleanup (NOT during test execution)
**Location**: `KtorShutdownHook` in `EmbeddedServer.stop()`
**Trigger**: DI container cleanup attempting to resolve parent types

### Timeline

1. **Commit `bae4b44`** (2025-09-10): BaseExposedRepository introduced as part of SPI-614 Phase 4
   - Created abstract base class to eliminate 351 lines of duplication
   - 4 repository implementations now extend this base class

2. **Phase 1-3 SDK Migration**: Tests passing (14/14 reported in session summary)
   - No DI ambiguity issues during this phase

3. **Commit `cfa53ff`** (Phase 1-3): Migration of McpToolIntegrationTest
   - Modified TestApplicationConfig.kt (162 lines)
   - **Hypothesis**: This commit may have changed DI cleanup behavior

4. **Phase 4 Baseline Validation**: All 16 MCPSdkTransportTest tests failing
   - Tests execute correctly
   - Failures occur during shutdown

---

## Why Tests Pass Execution But Fail Cleanup

**During Test Execution**:
- Concrete types are explicitly requested: `resolve<ExposedProjectRepository>()`
- No ambiguity - DI knows exactly which instance to provide

**During Cleanup**:
- Ktor DI attempts to cleanup all registered types
- May attempt to resolve parent type: `resolve<BaseExposedRepository>()`
- **Ambiguity** - DI doesn't know which child implementation to use
- Cleanup fails with AmbiguousDependencyException

---

## Fix Approach Options

### Option 1: Remove Parent Type from DI Awareness (Recommended)

**Approach**: Mark parent types as non-resolvable by not registering them directly

**Implementation**:
```kotlin
// Dependencies.kt - NO CHANGES NEEDED
// Current configuration is correct - only concrete types are registered:
provide<ExposedProjectRepository> { ExposedProjectRepository(...) }
provide<ExposedIssueRepository> { ExposedIssueRepository(...) }
// etc.

// The issue is in Ktor DI cleanup attempting to resolve parent types
```

**Action**: Configure Ktor DI to skip parent type resolution during cleanup

**Pros**:
- Minimal configuration change
- No code changes required
- Preserves current architecture
- Clear separation between concrete and abstract types

**Cons**:
- May require Ktor DI configuration research
- Might need custom cleanup logic

**Estimated Effort**: 2-4 hours

---

### Option 2: Register Parent Types with Factory Pattern

**Approach**: Explicitly register parent types with a factory that throws during cleanup

**Implementation**:
```kotlin
dependencies {
    // Concrete implementations
    provide<ExposedProjectRepository> { ... }
    provide<ExposedIssueRepository> { ... }

    // Parent type with explicit "do not resolve" factory
    provide<BaseExposedRepository> {
        error("BaseExposedRepository is abstract and should not be resolved directly")
    }
}
```

**Pros**:
- Explicit intent in code
- Clear error message if parent type is mistakenly resolved
- No Ktor DI configuration needed

**Cons**:
- Adds registration for types that shouldn't be resolved
- Error still thrown during cleanup (may need suppression)
- Pollutes DI registry with non-resolvable types

**Estimated Effort**: 1-2 hours

---

### Option 3: Qualify All Parent Type References

**Approach**: Ensure all DI references use concrete types, never parent types

**Implementation**:
```kotlin
// Audit all code for parent type resolution
val repo: BaseExposedRepository = resolve() // ❌ Never do this

val repo: ExposedProjectRepository = resolve() // ✅ Always explicit
```

**Pros**:
- Enforces explicit type usage
- No DI configuration changes
- Aligns with dependency inversion principle

**Cons**:
- Requires code audit across entire codebase
- Doesn't fix Ktor DI cleanup attempting parent resolution
- High effort for symptom treatment, not root cause

**Estimated Effort**: 4-8 hours

---

### Option 4: Disable Automatic Cleanup for Problematic Types

**Approach**: Configure Ktor DI to skip cleanup for specific parent types

**Implementation**:
```kotlin
install(DI) {
    skipCleanup<BaseExposedRepository>()
    skipCleanup<ToolProvider>()
}
```

**Pros**:
- Targeted fix for specific types
- Minimal code changes
- Preserves existing architecture

**Cons**:
- Requires Ktor DI API support (may not exist)
- May need custom DI plugin implementation
- Cleanup skipping might have unintended consequences

**Estimated Effort**: 4-6 hours (research + implementation)

---

## Recommended Approach

**Option 1: Remove Parent Type from DI Awareness**

**Rationale**:
1. **Architectural Alignment**: Parent types (BaseExposedRepository, ToolProvider) are abstractions for code organization, not runtime polymorphism
2. **Minimal Impact**: Only affects DI configuration, not business logic
3. **Clear Intent**: Makes explicit that parent types are compile-time constructs
4. **Preserves Current Design**: No changes to repository or tool provider implementations

**Alternative**: If Option 1 proves complex, fallback to **Option 2** for quick resolution

---

## Implementation Plan

### Phase 1: Ktor DI Cleanup Configuration (Preferred)

1. **Research Ktor DI cleanup behavior**
   - Review Ktor DI documentation for cleanup configuration
   - Check for options to exclude types from automatic cleanup
   - Investigate `DependencyRegistry` and `DependencyInjection` APIs

2. **Implement cleanup exclusion**
   - Add configuration to skip parent type resolution during cleanup
   - Test with single test case
   - Verify no new issues introduced

3. **Validate fix**
   - Run full MCPSdkTransportTest suite (expect 16/16 passing)
   - Run McpToolIntegrationTest (expect no regression)
   - Run full integration suite (expect no new failures)

### Phase 2: Fallback Implementation (If Phase 1 Blocked)

1. **Implement Option 2** (Factory pattern with explicit error)
   ```kotlin
   dependencies {
       // After all concrete registrations
       provide<BaseExposedRepository> {
           error("BaseExposedRepository is abstract - resolve concrete type instead")
       }
       provide<ToolProvider> {
           error("ToolProvider is interface - resolve concrete type instead")
       }
   }
   ```

2. **Suppress cleanup errors** (if needed)
   - Configure test application to suppress AmbiguousDependencyException during cleanup
   - Log warnings instead of failures

3. **Validate fix** (same as Phase 1)

---

## Validation Steps

### Success Criteria

1. ✅ All 16 MCPSdkTransportTest tests pass (including cleanup)
2. ✅ No AmbiguousDependencyException in test output
3. ✅ McpToolIntegrationTest remains passing (no regression)
4. ✅ Full integration test suite passes (no new failures)
5. ✅ Production application starts successfully (no DI issues)

### Test Commands

```bash
# Single test class
./gradlew integrationTest --tests "MCPSdkTransportTest"

# Verify no regression
./gradlew integrationTest --tests "McpToolIntegrationTest"

# Full integration suite
./gradlew integrationTest

# Production application startup
./gradlew run
```

---

## Additional Findings

### Test Execution Is Successful

**Important**: The tests themselves execute correctly. All test assertions pass. The failure occurs **only during cleanup/shutdown**.

**Evidence**:
- Test log shows successful execution of test logic
- JSON-RPC requests/responses work correctly
- Session management functions properly
- Error only appears in "KtorShutdownHook" during `EmbeddedServer.stop()`

### Not Related to TestApplicationConfig Changes

**Initial Hypothesis**: Commit `cfa53ff` introduced the issue

**Finding**: The commit modified TestApplicationConfig but did not change DI registration logic. The issue is architectural (parent type registration) not configuration-specific.

**Actual Cause**: Introduction of BaseExposedRepository in commit `bae4b44` created the ambiguous type hierarchy. The issue became visible when combined with Ktor's cleanup behavior during test shutdown.

---

## Risk Assessment

**Risk Level**: Medium

**Impact**:
- **Tests**: All MCPSdkTransportTest tests report failure despite successful execution
- **CI/CD**: Test failures block deployment
- **Development**: False negatives reduce confidence in test suite

**Mitigation**:
- Fix is isolated to DI configuration
- No business logic changes required
- Low risk of introducing new issues

---

## Recommendations

1. **Immediate**: Implement Option 1 (cleanup configuration) or Option 2 (factory pattern)
2. **Short-term**: Add DI configuration tests to prevent similar issues
3. **Long-term**: Document parent type registration patterns in CLAUDE.md

---

## Appendix: Error Log Analysis

### Error Pattern

All failures follow the same pattern:
```
[KtorShutdownHook] WARN io.ktor.test - Exception during cleanup for <ParentType>; continuing
AmbiguousDependencyException: Cannot decide which value for <ParentType>: [Child1, Child2, Child3, Child4]
```

### Affected Types

1. **BaseExposedRepository** (abstract class)
   - ExposedProjectRepository
   - ExposedIssueRepository
   - ExposedSessionRepository
   - ExposedWorkflowRepository

2. **ToolProvider** (interface)
   - DefaultProjectToolProvider
   - DefaultIssueToolProvider
   - DefaultSessionToolProvider
   - DefaultWorkflowToolProvider

### Cleanup Call Stack

```
DependencyInjection.kt:142 - Attempting to resolve dependency for cleanup
Events.kt:52 - Raising cleanup event
EmbeddedServerJvm.kt:226 - Safe raise event during server shutdown
EmbeddedServerJvm.kt:239 - Destroy application (cleanup phase)
EmbeddedServerJvm.kt:350 - Server stop
ShutdownHookJvm.kt:38 - Shutdown hook execution
```

---

**End of Investigation Report**
