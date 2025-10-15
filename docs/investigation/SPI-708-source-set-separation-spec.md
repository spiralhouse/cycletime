# SPI-708: Separate Test Source Sets - Complete Specification

## 1. User Story

**As a** CycleTime developer
**I want** physical separation of unit, integration, and system tests into dedicated source sets
**So that** I can immediately identify test scope without reading code, eliminate fragile filter maintenance, and prevent tests from being silently excluded from CI runs

### Context

Currently, all 98 tests reside in `src/test/kotlin` with package-based organization (`unit/`, `integration/`, `system/`). Test categorization is enforced through 48 lines of complex Gradle filter patterns with up to 5 levels of wildcard matching. This approach has caused:
- Tests being accidentally excluded when packages are reorganized
- Duplicate filter logic in test execution and task input tracking
- Unclear boundaries requiring developers to read test code to understand scope
- Brittle maintenance overhead for every structural change

### Target Outcome

Tests are physically separated by source set, making test type immediately visible in file paths and eliminating filter configuration overhead by 75-80%.

---

## 2. Acceptance Criteria

### ✅ Source Set Structure
- [ ] Unit tests remain in `src/test/kotlin` (backward compatible, no migration)
- [ ] Integration tests reside in `src/integrationTest/kotlin` (34 files migrated)
- [ ] System tests reside in `src/systemTest/kotlin` (1 file migrated)
- [ ] Shared test utilities accessible from all test source sets
- [ ] Package structure preserved: `io.spiralhouse.cycletime.{integration|system}.*`

### ✅ Build Configuration
- [ ] Gradle `sourceSets` block defines `integrationTest` and `systemTest`
- [ ] Test tasks simplified: filter blocks reduced by ≥75% (from ~48 lines to ~12 lines)
- [ ] Task input tracking simplified: no duplicate pattern lists
- [ ] Dependencies configured: test source sets access main output + shared test utilities

### ✅ Test Execution
- [ ] All 98 existing tests execute successfully in new structure
- [ ] `./gradlew test` runs unit tests (standard Gradle convention)
- [ ] `./gradlew integrationTest` runs integration tests only
- [ ] `./gradlew systemTest` runs system tests only
- [ ] `./gradlew testAll` runs all tests in sequence (unit → integration → system)
- [ ] Test parallelism and CI optimization preserved (SPI-623, SPI-624 configurations)

### ✅ Performance & Caching
- [ ] Build times equivalent or improved (no regression)
- [ ] CI cache keys updated for new source sets
- [ ] Test-specific input tracking preserved (unit: domain sources, integration: infrastructure + DB versions)
- [ ] Incremental compilation works correctly for all source sets

### ✅ Developer Experience
- [ ] IntelliJ IDEA recognizes all source sets without manual configuration
- [ ] Test directories marked correctly (green test folder icons in IDE)
- [ ] Debugging works seamlessly across all test types
- [ ] Code navigation (Go to Test/Implementation) works correctly

### ✅ Documentation & Training
- [ ] `docs/testing/testing-standards.md` updated with new file structure
- [ ] `.claude/shared/development-commands.md` updated with test commands
- [ ] Migration guide created for developers writing new tests
- [ ] IDE setup instructions documented (if any manual steps required)

### ✅ Validation
- [ ] No test regressions: all 98 tests pass in new structure
- [ ] CI pipeline executes successfully with matrix builds
- [ ] Code coverage reports accurate (Kover integration verified)
- [ ] No increase in build or test execution time

---

## 3. Technical Specification

### 3.1 Gradle Source Set Configuration

```kotlin
sourceSets {
    // Unit tests (existing - no changes)
    test {
        kotlin.srcDir("src/test/kotlin")
        resources.srcDir("src/test/resources")
    }

    // Integration tests (new source set)
    create("integrationTest") {
        kotlin.srcDir("src/integrationTest/kotlin")
        resources.srcDir("src/integrationTest/resources")

        compileClasspath += sourceSets.main.get().output
        compileClasspath += sourceSets.test.get().output  // Access shared test utilities

        runtimeClasspath += sourceSets.main.get().output
        runtimeClasspath += sourceSets.test.get().output
    }

    // System tests (new source set)
    create("systemTest") {
        kotlin.srcDir("src/systemTest/kotlin")
        resources.srcDir("src/systemTest/resources")

        compileClasspath += sourceSets.main.get().output
        compileClasspath += sourceSets.test.get().output  // Access shared test utilities

        runtimeClasspath += sourceSets.main.get().output
        runtimeClasspath += sourceSets.test.get().output
    }
}

// Configuration for IDE source set recognition
configurations {
    integrationTestImplementation.extendsFrom(testImplementation)
    integrationTestRuntimeOnly.extendsFrom(testRuntimeOnly)

    systemTestImplementation.extendsFrom(testImplementation)
    systemTestRuntimeOnly.extendsFrom(testRuntimeOnly)
}
```

### 3.2 Shared Test Utilities Strategy

**Decision: Keep shared utilities in `src/test/kotlin` (Option A)**

**Rationale:**
- Simplest approach with minimal configuration overhead
- Preserves existing test utilities without migration
- Both `integrationTest` and `systemTest` source sets already depend on `test` output
- Follows principle: "unit tests are foundation, higher-level tests build on them"

**Shared Utilities:**
```
src/test/kotlin/
├── io/spiralhouse/cycletime/test/           # Shared test configuration
│   ├── TestConfig.kt
│   ├── DatabaseTestUtils.kt
│   └── TestApplicationFactory.kt
└── io/spiralhouse/cycletime/unit/mocks/     # Shared mocks
    ├── MockTimeProvider.kt
    ├── MockSessionService.kt
    └── MockDatabaseProvider.kt
```

**Alternative Considered: Gradle `testFixtures` Convention (Option B)**
- Rejected: Adds complexity without meaningful benefit for this codebase size
- May revisit if shared utilities grow beyond 10-15 files

### 3.3 Simplified Test Task Configuration

**Before (current approach):**
```kotlin
val integrationTest by tasks.registering(Test::class) {
    // ... 48 lines of filters with wildcards ...
    filter {
        includeTestsMatching("io.spiralhouse.cycletime.integration.*")
        includeTestsMatching("io.spiralhouse.cycletime.mcp.integration.*")
        includeTestsMatching("io.spiralhouse.cycletime.mcp.server.*")
        includeTestsMatching("io.spiralhouse.cycletime.api.*")
        includeTestsMatching("io.spiralhouse.cycletime.infrastructure.*")
        includeTestsMatching("io.spiralhouse.cycletime.ThreadSafetyQuickTest")
        excludeTestsMatching("io.spiralhouse.cycletime.performance.*")
        excludeTestsMatching("io.spiralhouse.cycletime.system.*")
        // ... 10 more exclusion patterns ...
    }

    // ... duplicate pattern tracking in task inputs ...
    inputs.files(fileTree("src/test/kotlin") {
        include("**/integration/**/*.kt")
        include("**/api/**/*.kt")
        include("**/infrastructure/**/*.kt")
        include("**/mcp/integration/**/*.kt")
        include("**/mcp/server/**/*.kt")
        include("**/ThreadSafetyQuickTest.kt")
    })
}
```

**After (source set approach):**
```kotlin
val integrationTest by tasks.registering(Test::class) {
    description = "Runs integration tests (repositories, services, database)"
    group = "verification"

    testClassesDirs = sourceSets["integrationTest"].output.classesDirs
    classpath = sourceSets["integrationTest"].runtimeClasspath

    useJUnitPlatform()

    // NO FILTER BLOCKS NEEDED! 🎉
    // Physical separation via source set provides natural isolation

    // Simplified task inputs - just track the source set
    inputs.files(sourceSets["integrationTest"].allSource)
    inputs.file("build.gradle.kts")
    inputs.file("src/main/resources/application.conf")
    inputs.property("h2Version", libs.versions.h2.get())

    // All test configuration (parallelism, memory, JVM args) unchanged
    maxParallelForks = (Runtime.getRuntime().availableProcessors() / 2).coerceAtLeast(1)
    // ... existing configuration preserved ...
}
```

**Estimated Reduction:**
- Filter configuration: **48 lines → 0 lines** (100% reduction)
- Task input tracking: **15 lines → 3 lines** (80% reduction)
- Total configuration reduction: **~63 lines → ~12 lines** (81% reduction)

### 3.4 Migration Plan

**Phase 1: Create Source Sets (No Migration)**
1. Add `integrationTest` and `systemTest` to `sourceSets` block
2. Configure dependencies and configurations
3. Verify Gradle can see source sets: `./gradlew sourceSets --info`

**Phase 2: Migrate Integration Tests (34 files)**
```bash
# Move integration tests to new source set
mkdir -p src/integrationTest/kotlin/io/spiralhouse/cycletime
git mv src/test/kotlin/io/spiralhouse/cycletime/integration \
        src/integrationTest/kotlin/io/spiralhouse/cycletime/integration

# Move MCP integration tests
git mv src/test/kotlin/io/spiralhouse/cycletime/mcp/integration \
        src/integrationTest/kotlin/io/spiralhouse/cycletime/mcp/integration

# Move infrastructure tests (if organized separately)
git mv src/test/kotlin/io/spiralhouse/cycletime/infrastructure \
        src/integrationTest/kotlin/io/spiralhouse/cycletime/infrastructure
```

**Phase 3: Migrate System Tests (1 file)**
```bash
mkdir -p src/systemTest/kotlin/io/spiralhouse/cycletime
git mv src/test/kotlin/io/spiralhouse/cycletime/system \
        src/systemTest/kotlin/io/spiralhouse/cycletime/system
```

**Phase 4: Update Build Configuration**
1. Remove filter blocks from `integrationTest` and `systemTest` tasks
2. Update `testClassesDirs` and `classpath` to use new source sets
3. Simplify task input tracking
4. Verify: `./gradlew testAll --dry-run`

**Phase 5: Update CI Pipeline**
1. Update GitHub Actions cache keys to include new source set paths
2. Verify matrix builds work with new structure
3. Update `ciUnitOnly` and `ciIntegrationOnly` tasks if needed

**Phase 6: Validation & Documentation**
1. Run full test suite: `./gradlew testAll`
2. Verify CI pipeline end-to-end
3. Update documentation files
4. Create developer migration guide

### 3.5 Package Structure Decision

**Keep existing package names** - no flattening

**Before:**
```
src/test/kotlin/io/spiralhouse/cycletime/integration/mcp/McpToolIntegrationTest.kt
```

**After:**
```
src/integrationTest/kotlin/io/spiralhouse/cycletime/integration/mcp/McpToolIntegrationTest.kt
```

**Rationale:**
- Source set already provides context (developers know it's integration by path)
- Preserves import statements (no code changes needed)
- Maintains consistency with existing organizational patterns
- Allows for subcategorization within test types (e.g., `integration/mcp/`, `integration/database/`)

**Alternative Considered: Flatten to `io.spiralhouse.cycletime.mcp.*`**
- Rejected: Breaks all imports, requires code changes, loses organizational structure

### 3.6 IDE Integration

**IntelliJ IDEA:**
- Automatic recognition: Modern Gradle plugin automatically detects source sets
- No manual configuration needed if source sets named with `Test` suffix
- Test directories get green folder icon automatically
- Build/Run configurations auto-generated

**Verification Steps:**
1. Sync Gradle: `File → Reload All Gradle Projects`
2. Verify source set detection: `View → Tool Windows → Gradle → Tasks → verification`
3. Verify test icons: Right-click test file → should show "Run" with test icon
4. Verify debugging: Set breakpoint → Debug test → should work

**Fallback (if auto-detection fails):**
```kotlin
// Add to build.gradle.kts if needed (unlikely)
idea {
    module {
        testSourceDirs.plus(project.sourceSets["integrationTest"].kotlin.srcDirs)
        testSourceDirs.plus(project.sourceSets["systemTest"].kotlin.srcDirs)
    }
}
```

### 3.7 Dependency Management

**Test Dependencies Flow:**
```
main/kotlin (production code)
    ↓
test/kotlin (unit tests + shared utilities)
    ↓
    ├─→ integrationTest/kotlin (integration tests)
    └─→ systemTest/kotlin (system tests)
```

**Dependency Access:**
- ✅ Integration tests CAN access unit test mocks (via `test` output dependency)
- ✅ System tests CAN access integration test fixtures (if needed)
- ✅ All test types share the same test dependencies (Kotest, MockK, etc.)
- ❌ Production code CANNOT access any test code (enforced by Gradle)

**Configuration:**
```kotlin
configurations {
    // Inherit all test dependencies
    integrationTestImplementation.extendsFrom(testImplementation)
    integrationTestRuntimeOnly.extendsFrom(testRuntimeOnly)

    systemTestImplementation.extendsFrom(testImplementation)
    systemTestRuntimeOnly.extendsFrom(testRuntimeOnly)
}
```

### 3.8 Performance Impact Analysis

**Expected Impact: Neutral to Slight Improvement**

**Factors:**
1. **CI Cache Behavior:**
   - New cache keys for `integrationTest` and `systemTest` source sets
   - Initial migration: all tests re-run once (cache miss)
   - Subsequent builds: better cache granularity (unit test changes don't invalidate integration cache)

2. **Build Time:**
   - Compilation time: unchanged (same total LOC)
   - Test discovery: potentially faster (smaller source sets to scan)
   - Task configuration: faster (less pattern matching overhead)

3. **Incremental Builds:**
   - Improved: changing unit test doesn't trigger integration test recompilation
   - Gradle can skip entire source sets when unchanged

**Measured Baseline (current approach):**
```bash
./gradlew clean unitTest          # Establish baseline
./gradlew clean integrationTest   # Establish baseline
./gradlew clean systemTest        # Establish baseline
```

**Post-Migration Validation:**
```bash
./gradlew clean testAll           # Full clean build
./gradlew testAll                 # Cached build (should be fast)
./gradlew :test                   # Unit test isolation
```

### 3.9 Rollback Strategy

**Point of No Return: After CI pipeline is updated and validated**

**Rollback Procedure (if needed within first week):**
1. Revert Gradle configuration changes: `git revert <commit>`
2. Move test files back to `src/test/kotlin`:
   ```bash
   git mv src/integrationTest/kotlin/io/spiralhouse/cycletime/integration \
          src/test/kotlin/io/spiralhouse/cycletime/integration
   ```
3. Restore filter blocks from version control
4. Revert CI pipeline changes

**Low-Risk Rollback Window: 1 sprint (2 weeks)**
- If major issues discovered, rollback is straightforward
- After 2 weeks, assume new structure is working and remove rollback option

### 3.10 Success Metrics

**Quantitative:**
- Filter configuration reduced by ≥75% (target: 48 lines → 12 lines)
- Zero test execution failures after migration
- CI build time within ±5% of baseline
- Test discovery time within ±10% of baseline

**Qualitative:**
- Developers can identify test type from file path alone
- No "missing test" incidents in first 30 days post-migration
- IDE integration works without manual configuration
- New developers understand test organization without explanation

---

## 4. Open Questions (Require Consensus)

### Q1: Should `ThreadSafetyQuickTest.kt` move to integration or system?
**Current:** `src/test/kotlin/io/spiralhouse/cycletime/ThreadSafetyQuickTest.kt`
**Classification:** Integration test (tests database concurrency with real DB)
**Recommendation:** Move to `src/integrationTest/kotlin/io/spiralhouse/cycletime/ThreadSafetyQuickTest.kt`

### Q2: Should MCP protocol tests stay in unit tests?
**Current:** `src/test/kotlin/io/spiralhouse/cycletime/mcp/protocol/*`
**Classification:** Unit tests (pure logic, no infrastructure dependencies)
**Recommendation:** Keep in `src/test/kotlin` (no migration needed)

### Q3: Should API tests move to integration?
**Current:** Organized under `integration/` package, filtered into `integrationTest` task
**Classification:** Integration tests (test HTTP routes with real Ktor infrastructure)
**Recommendation:** Move to `src/integrationTest/kotlin/io/spiralhouse/cycletime/api/`

### Q4: How to handle future test utilities growth?
**Current Strategy:** Keep shared utilities in `src/test/kotlin`
**Threshold for Reevaluation:** If shared utilities exceed 15 files or 2000 LOC
**Alternative:** Migrate to `testFixtures` Gradle convention (deferred decision)

---

## 5. Recommended Story Breakdown

**Option A: Single Story (Recommended for this case)**
- Total effort: ~13 points
- Duration: 1-2 days
- Rationale: Tightly coupled changes, splitting creates integration risk

**Option B: Two Stories (If parallel work needed)**
- Story 1: Design + Integration Test Migration (8 points)
- Story 2: System Test Migration + Documentation (5 points)
- Risk: Requires careful coordination, potential merge conflicts

**Recommendation:** Execute as single story with daily checkpoints

---

## 6. Next Steps

1. **Team Review:** Discuss open questions (Q1-Q4) and reach consensus
2. **Approval:** Confirm technical approach and acceptance criteria
3. **Estimation:** Validate 13-point estimate or adjust based on team velocity
4. **Scheduling:** Assign to sprint and developer
5. **Implementation:** Follow migration plan phases 1-6
6. **Validation:** Execute success metrics and document results

---

## Appendix: Current Test Distribution

```
Total Tests: 98 files
├── Unit: 44 files
│   ├── domain/* - Domain logic tests
│   ├── verification/* - Value object tests
│   ├── unit/mcp/sdk/adapters/* - MCP adapter tests
│   ├── unit/infrastructure/* - Infrastructure unit tests
│   └── unit/session/* - Session management tests
├── Integration: 34 files
│   ├── integration/mcp/* - MCP integration tests
│   ├── integration/session/* - Session integration tests
│   ├── integration/edge/* - Edge case tests
│   ├── integration/performance/* - Performance tests (?)
│   └── infrastructure/* - Infrastructure integration
└── System: 1 file
    └── system/* - End-to-end system tests

Shared Utilities:
├── test/* - TestConfig, DatabaseTestUtils
└── unit/mocks/* - MockTimeProvider, MockSessionService
```
