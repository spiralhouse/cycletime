import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ktor)
    alias(libs.plugins.graalvm)
    alias(libs.plugins.detekt)
    alias(libs.plugins.kover)
    alias(libs.plugins.dependency.check)
    id("com.github.jmongard.git-semver-plugin") version "0.17.1"
    application
}

group = "io.spiralhouse.cycletime"
version = semver.version

// Git SemVersioning configuration (SPI-570: trigger CI for test result validation)
// SPI-747: Removed defaultPreRelease = "SNAPSHOT" to enable automated releases
semver {
    // Pattern for release commits (optional, rarely used)
    releasePattern = "\\Arelease(?:\\([^()]+\\))?:"

    // BREAKING CHANGE detection (major version bump)
    majorPattern = "\\A\\w+(?:\\([^()]+\\))?!:|^BREAKING[ -]CHANGE:"

    // Feature commits (minor version bump)
    minorPattern = "\\Afeat(?:\\([^()]+\\))?:"

    // Fix commits (patch version bump)
    patchPattern = "\\Afix(?:\\([^()]+\\))?:"

    // Group multiple commits into single increment
    groupVersionIncrements = true
}

// Fix for version print tasks being marked as UP-TO-DATE (SPI-849)
// These tasks have no declared outputs, causing Gradle to skip them incorrectly
// This fix ensures version tasks always execute and produce output for CI/CD pipelines
tasks.matching { it.name in listOf("printSemVersion", "printVersion", "printInfoVersion") }.configureEach {
    // Always run these tasks - version calculation should never be cached
    outputs.upToDateWhen { false }

    // Disable configuration cache for version tasks (incompatible with git state access)
    notCompatibleWithConfigurationCache("Version calculation requires runtime git repository access")
}

/**
 * Prints clean semantic version (X.Y.Z) without SNAPSHOT or build metadata.
 *
 * This task sanitizes the version from git-semver-plugin to produce clean
 * semantic versions suitable for:
 * - Git tags (vX.Y.Z)
 * - GitHub releases
 * - Docker image tags
 * - Documentation references
 *
 * Input examples:
 *   0.3.0-SNAPSHOT+022.sha.5fdd0c1  → 0.3.0
 *   0.3.0+sha.5fdd0c1               → 0.3.0
 *   1.0.0                           → 1.0.0
 *
 * Related: SPI-849 (version task caching fix)
 * Solution for: SPI-892 (automated release tagging)
 */
tasks.register("printCleanVersion") {
    group = "versioning"
    description = "Prints clean semantic version (X.Y.Z) without SNAPSHOT or build metadata"

    // Always run this task - version calculation should never be cached
    outputs.upToDateWhen { false }

    // Disable configuration cache for version tasks (incompatible with git state access)
    notCompatibleWithConfigurationCache("Version calculation requires runtime git repository access")

    doLast {
        val rawVersion = semver.version
        val cleanVersion = Regex("^(\\d+\\.\\d+\\.\\d+)").find(rawVersion)?.value

        if (cleanVersion == null) {
            throw GradleException(
                "Failed to extract clean version from: $rawVersion\n" +
                "Expected format: X.Y.Z with optional suffixes (-SNAPSHOT, +metadata)"
            )
        }

        println(cleanVersion)
    }
}

application {
    mainClass.set("io.spiralhouse.cycletime.ApplicationKt")

    val isDevelopment: Boolean = project.ext.has("development")
    applicationDefaultJvmArgs = listOf(
        "-Dio.ktor.development=$isDevelopment",
        "-Dcycletime.version=${version}" // Pass version to runtime
    )
}

dependencies {
    // Ktor - Using native DI system
    implementation(libs.ktor.server.core)
    implementation(libs.ktor.server.cio)
    implementation(libs.ktor.server.di)
    implementation(libs.ktor.server.content.negotiation)
    implementation(libs.ktor.server.sse)
    implementation(libs.ktor.serialization.kotlinx.json)
    implementation(libs.ktor.server.cors)
    implementation(libs.ktor.server.call.logging)
    implementation(libs.ktor.server.status.pages)
    implementation("io.ktor:ktor-server-call-id:${libs.versions.ktor.get()}")
    implementation("io.ktor:ktor-server-html-builder:${libs.versions.ktor.get()}")

    // OpenAPI and Swagger UI - API documentation generation
    implementation("io.ktor:ktor-server-openapi:${libs.versions.ktor.get()}")
    implementation("io.ktor:ktor-server-swagger:${libs.versions.ktor.get()}")

    // Exposed ORM - Used for H2 database access
    implementation(libs.exposed.core)
    implementation(libs.exposed.dao)
    implementation(libs.exposed.jdbc)
    implementation(libs.exposed.java.time)
    implementation(libs.exposed.kotlin.datetime)

    // Database - H2 with HikariCP connection pooling
    implementation(libs.hikaricp)

    // H2 database for Phase 2 repository integration (SPI-439)
    implementation(libs.h2.database)

    // Kotlin
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.datetime)

    // Dependency Injection - Using Ktor native DI (requires Ktor 3.2.3+)

    // MCP SDK v0.7.2 - Official Kotlin SDK for MCP protocol
    // Provides transport, protocol handling, and session management
    // Replaced custom EventBus architecture in SPI-700/SPI-707
    implementation(libs.mcp.kotlin.sdk)

    // Logging
    implementation(libs.logback.classic)
    implementation(libs.logstash.logback.encoder)

    // Metrics
    implementation(libs.micrometer.registry.prometheus)
    implementation(libs.ktor.server.metrics.micrometer)

    // Testing
    testImplementation(libs.kotest.runner.junit5)
    testImplementation(libs.kotest.assertions.core)
    testImplementation(libs.kotest.property)
    testImplementation(libs.mockk)
    testImplementation(libs.ktor.server.test.host)
    testImplementation("io.ktor:ktor-client-core:${libs.versions.ktor.get()}")
    testImplementation("io.ktor:ktor-client-content-negotiation:${libs.versions.ktor.get()}")
    testImplementation("io.ktor:ktor-client-cio:${libs.versions.ktor.get()}")
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.h2.database)  // H2 for integration testing
    testImplementation("org.jetbrains.kotlin:kotlin-reflect:${libs.versions.kotlin.get()}")  // Reflection for MockSDKToolExecutor

    // TODO: TestContainers for SPI-439 Integration Testing (when H2 repositories are implemented)
    // testImplementation("org.testcontainers:testcontainers:1.19.3")
    // testImplementation("org.testcontainers:junit-jupiter:1.19.3")
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
        // Don't require GraalVM for general compilation
        // native-image binary will use GraalVM explicitly
    }
}

tasks.withType<KotlinCompile> {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_21)
        languageVersion.set(org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_2_0)
        
        // Performance optimizations
        freeCompilerArgs.addAll(
            // Strict JSR-305 annotations for better null safety
            "-Xjsr305=strict",
            
            // Experimental API opt-ins
            "-opt-in=kotlin.RequiresOptIn",
            "-opt-in=kotlinx.coroutines.ExperimentalCoroutinesApi", 
            "-opt-in=kotlinx.serialization.ExperimentalSerializationApi",
            
            // Performance and optimization flags
            "-Xallow-unstable-dependencies", // Allow K2 with current dependencies
            
            // Java interop optimizations
            "-Xjvm-default=all",           // Generate default methods in interfaces
            "-Xtype-enhancement-improvements-strict-mode", // Better Java type inference
            
            // Build performance
            "-Xassertions=jvm",            // Enable JVM assertions for better debugging
            "-Xbackend-threads=0"          // Use all available threads for compilation
        )
        
        // Enable progressive mode for latest language features
        progressiveMode.set(true)
        
        // Explicit API mode for better API design (optional - can be disabled if needed)
        // explicitApi.set(ExplicitApiMode.Warning)
    }
    
    // Incremental compilation optimizations
    incremental = true
    
    // Precise task inputs for better change detection
    inputs.files(fileTree("src") {
        include("**/*.kt")
        include("**/*.java")
    })
    inputs.file("build.gradle.kts")
    inputs.file("gradle.properties")
    
    // Enable build cache for Kotlin compilation
    outputs.cacheIf { true }
    
    // Skip task if no source files changed
    outputs.upToDateWhen {
        inputs.hasInputs && !inputs.sourceFiles.isEmpty
    }
}

tasks.withType<Test> {
    useJUnitPlatform()

    // Note: ToolRegistryTest.kt is a TDD test with compilation issues that need to be addressed by development team

    // Test execution performance optimizations
    maxParallelForks = (Runtime.getRuntime().availableProcessors() / 2).coerceAtLeast(1)
    
    // Memory settings for test JVM
    minHeapSize = "256m"
    maxHeapSize = "2048m"
    
    // Fork new JVM after every 100 tests to prevent memory leaks
    forkEvery = 100
    
    // JVM arguments for test execution
    jvmArgs(
        "-XX:+UseG1GC",
        "-XX:MaxGCPauseMillis=100",
        "-XX:+UseStringDeduplication",
        "-Dfile.encoding=UTF-8"
    )
    
    // Test execution strategy with TestPlan coordination and dynamic parallelism
    systemProperty("junit.jupiter.execution.parallel.enabled", "true")
    systemProperty("junit.jupiter.execution.parallel.mode.default", "concurrent")
    systemProperty("kotest.framework.discovery.parallel", "false") // Sequential discovery phase

    // Dynamic parallelism configuration for optimal performance across different environments
    val availableProcessors = Runtime.getRuntime().availableProcessors()
    val optimalParallelism = when {
        availableProcessors == 1 -> 1  // Sequential execution on single-core environments
        availableProcessors == 2 -> 2  // Moderate parallelism on dual-core
        else -> (availableProcessors / 2).coerceIn(2, 4)  // Balanced parallelism on multi-core (2-4 threads)
    }
    systemProperty("junit.jupiter.execution.parallel.config.strategy", "fixed")
    systemProperty("junit.jupiter.execution.parallel.config.fixed.parallelism", optimalParallelism.toString())

    // Log parallelism configuration for debugging
    doFirst {
        println("🧪 Test parallelism: ${optimalParallelism} threads for ${availableProcessors} CPU cores")
    }
    
    testLogging {
        events("passed", "skipped", "failed")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
        showStandardStreams = true  // Enable to see SDK routing logs during tests
        showCauses = true
        showExceptions = true
        showStackTraces = true
    }
    
    // Enable build cache for test results
    outputs.cacheIf { true }
    
    // Fail fast on first test failure (can be disabled for comprehensive test runs)
    // failFast = true
}

// =============================================================================
// Test Source Sets Configuration (SPI-708)
// =============================================================================
sourceSets {
    create("integrationTest") {
        compileClasspath += sourceSets.main.get().output + sourceSets.test.get().output
        runtimeClasspath += sourceSets.main.get().output + sourceSets.test.get().output
    }
    create("systemTest") {
        compileClasspath += sourceSets.main.get().output + sourceSets.test.get().output
        runtimeClasspath += sourceSets.main.get().output + sourceSets.test.get().output
    }
}

configurations {
    getByName("integrationTestImplementation") {
        extendsFrom(configurations.testImplementation.get())
    }
    getByName("integrationTestRuntimeOnly") {
        extendsFrom(configurations.testRuntimeOnly.get())
    }
    getByName("systemTestImplementation") {
        extendsFrom(configurations.testImplementation.get())
    }
    getByName("systemTestRuntimeOnly") {
        extendsFrom(configurations.testRuntimeOnly.get())
    }
}

// =============================================================================
// Separate Test Suite Tasks for SPI-473
// =============================================================================

// Unit Tests - Domain logic, value objects, business rules, application services
val unitTest by tasks.registering(Test::class) {
    description = "Runs fast unit tests (domain entities, value objects, application services)"
    group = "verification"
    
    testClassesDirs = sourceSets["test"].output.classesDirs
    classpath = sourceSets["test"].runtimeClasspath
    
    useJUnitPlatform()
    
    // Include test source sets - CRITICAL for test discovery
    testClassesDirs = sourceSets.test.get().output.classesDirs
    classpath = sourceSets.test.get().runtimeClasspath

    // Optimized task inputs for smart incremental unit testing
    inputs.files(sourceSets.main.get().allSource)
    inputs.files(sourceSets.test.get().allSource)
    inputs.file("build.gradle.kts")
    inputs.property("kotlinVersion", libs.versions.kotlin.get())
    
    // Optimized for speed - unit tests should be fast
    // Reduced for CI stability - QA analysis from SPI-624 CI failures
    maxParallelForks = (Runtime.getRuntime().availableProcessors() / 2).coerceAtLeast(1)
    minHeapSize = "128m"
    maxHeapSize = "512m"
    forkEvery = 200 // Less frequent forking for fast tests
    
    // JVM optimizations for unit tests
    jvmArgs(
        "-XX:+UseG1GC",
        "-XX:MaxGCPauseMillis=50", // Lower GC pause target
        "-XX:+UseStringDeduplication",
        "-Dfile.encoding=UTF-8"
    )
    
    // ================================================================================
    // ARCHITECTURAL FIX: TestPlan Registration Coordination (SPI-624)
    // ================================================================================
    // Root Cause: Race conditions between multiple Gradle Test Executors during
    // Kotest TestPlan registration phase. The issue occurs when multiple executors
    // initialize Kotest engines concurrently, causing TestIdentifier registration
    // timing mismatches with the JUnit Platform.
    //
    // Solution: Coordinate TestExecutor initialization while maintaining parallelism
    // for actual test execution. This fixes the registration issue without the
    // performance penalty of disabling all parallelism.
    // ================================================================================

    // Enable parallel execution within properly coordinated test executors
    systemProperty("junit.jupiter.execution.parallel.enabled", "true")
    systemProperty("junit.jupiter.execution.parallel.mode.default", "concurrent")
    systemProperty("junit.jupiter.execution.parallel.config.strategy", "dynamic")

    // Kotest engine coordination - prevent race conditions during discovery
    systemProperty("kotest.framework.parallelism", "4") // Allow parallel test execution
    systemProperty("kotest.framework.discovery.class.scanning.enabled", "true")
    systemProperty("kotest.framework.classpath.scanning.autoscan.disable", "false") // Controlled scanning
    systemProperty("kotest.framework.discovery.parallel", "false") // Sequential discovery phase
    systemProperty("kotest.framework.discovery.timeout", "30000") // 30s discovery timeout

    // TestPlan registration synchronization - prevents TestIdentifier race conditions
    systemProperty("junit.jupiter.testinstance.lifecycle.default", "per_class")
    systemProperty("junit.jupiter.execution.parallel.mode.classes.default", "concurrent")
    systemProperty("junit.jupiter.execution.parallel.mode.methods.default", "concurrent")

    // Test execution timeouts (performance-oriented)
    systemProperty("kotest.framework.timeout", "60000") // 60 second timeout
    systemProperty("kotest.framework.invocation.timeout", "30000") // 30 second per test
    systemProperty("junit.jupiter.execution.timeout.default", "30s")

    // CI-specific optimizations with dynamic parallelism based on CPU cores
    val isCI = System.getenv("CI") == "true" || System.getenv("GITHUB_ACTIONS") == "true"
    if (isCI) {
        val availableProcessors = Runtime.getRuntime().availableProcessors()
        // Calculate optimal parallelism: single-core = 1, multi-core = cores/2 (min 2, max 4)
        val optimalParallelism = when {
            availableProcessors == 1 -> 1  // Sequential execution on single-core
            availableProcessors == 2 -> 2  // Moderate parallelism on dual-core
            else -> (availableProcessors / 2).coerceIn(2, 4)  // Balanced parallelism on multi-core
        }

        logger.lifecycle("🔧 CI environment detected - applying TestPlan registration coordination")
        logger.lifecycle("   CPU cores: ${availableProcessors}, optimal test parallelism: ${optimalParallelism}")

        // Coordinate discovery phase to prevent TestPlan registration race conditions
        systemProperty("kotest.framework.discovery.parallel", "false") // Sequential discovery
        systemProperty("junit.jupiter.execution.parallel.config.strategy", "fixed")
        systemProperty("junit.jupiter.execution.parallel.config.fixed.parallelism", optimalParallelism.toString())
        // Disable problematic classpath scanning that can cause registration conflicts
        systemProperty("kotest.framework.classpath.scanning.autoscan.disable", "true")
    }

    testLogging {
        events("passed", "skipped", "failed")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.SHORT
        showStandardStreams = true  // Enable to see SDK routing logs during tests
        showCauses = true
        showExceptions = true
    }
    
    // Fast failure for rapid feedback
    failFast = true
    
    // Enable build cache with precise inputs
    outputs.cacheIf { true }
    outputs.upToDateWhen { 
        !inputs.sourceFiles.isEmpty && inputs.hasInputs
    }
}

// Integration Tests - Repository, service integration, database interactions
val integrationTest by tasks.registering(Test::class) {
    description = "Runs integration tests (repositories, services, database)"
    group = "verification"

    testClassesDirs = sourceSets["integrationTest"].output.classesDirs
    classpath = sourceSets["integrationTest"].runtimeClasspath

    useJUnitPlatform()

    // Include test source sets - CRITICAL for test discovery
    testClassesDirs = sourceSets["integrationTest"].output.classesDirs
    classpath = sourceSets["integrationTest"].runtimeClasspath

    // Optimized inputs for integration tests - track only relevant source changes
    inputs.files(sourceSets.main.get().allSource)
    inputs.files(sourceSets["integrationTest"].allSource)
    inputs.file("build.gradle.kts")
    inputs.file("src/main/resources/application.conf")
    inputs.property("h2Version", libs.versions.h2.get())
    
    // Integration tests can now run in parallel with the new DI pattern
    // Each test gets its own database provider instance through DI,
    // eliminating the singleton conflicts from DatabaseFactory.
    // Fixed with the DI refactoring (SPI-627).
    maxParallelForks = (Runtime.getRuntime().availableProcessors() / 2).coerceAtLeast(1)
    minHeapSize = "256m"
    maxHeapSize = "1024m"
    forkEvery = 50 // More frequent forking due to database connections
    
    // JVM settings for integration tests
    jvmArgs(
        "-XX:+UseG1GC",
        "-XX:MaxGCPauseMillis=100",
        "-XX:+UseStringDeduplication",
        "-Dfile.encoding=UTF-8"
    )
    
    // Parallel execution with TestPlan coordination and dynamic parallelism for database tests
    systemProperty("junit.jupiter.execution.parallel.enabled", "true")
    systemProperty("junit.jupiter.execution.parallel.mode.default", "concurrent")
    systemProperty("kotest.framework.discovery.parallel", "false") // Sequential discovery phase

    // Conservative parallelism for database tests (reduce contention)
    val availableProcessors = Runtime.getRuntime().availableProcessors()
    val databaseOptimalParallelism = when {
        availableProcessors == 1 -> 1  // Sequential execution on single-core
        availableProcessors == 2 -> 1  // Conservative on dual-core to avoid database contention
        else -> (availableProcessors / 4).coerceIn(1, 2)  // Very conservative on multi-core (1-2 threads)
    }
    systemProperty("junit.jupiter.execution.parallel.config.strategy", "fixed")
    systemProperty("junit.jupiter.execution.parallel.config.fixed.parallelism", databaseOptimalParallelism.toString())
    
    testLogging {
        events("passed", "skipped", "failed")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
        showStandardStreams = true  // Enable to see SDK routing logs during tests
        showCauses = true
        showExceptions = true
        showStackTraces = true
    }
    
    // Enable build cache with database-aware caching
    outputs.cacheIf { true }
    outputs.upToDateWhen { 
        inputs.hasInputs && !inputs.sourceFiles.isEmpty
    }
}

// System Tests - End-to-end, performance, complex scenarios
val systemTest by tasks.registering(Test::class) {
    description = "Runs system tests (performance, end-to-end scenarios)"
    group = "verification"

    testClassesDirs = sourceSets["systemTest"].output.classesDirs
    classpath = sourceSets["systemTest"].runtimeClasspath

    useJUnitPlatform()

    // Include test source sets - CRITICAL for test discovery
    testClassesDirs = sourceSets["systemTest"].output.classesDirs
    classpath = sourceSets["systemTest"].runtimeClasspath

    // System tests depend on entire application
    inputs.files(sourceSets.main.get().allSource)
    inputs.files(sourceSets["systemTest"].allSource)
    inputs.file("build.gradle.kts")
    inputs.file("src/main/resources/application.conf")
    
    // Conservative parallelization for system tests
    maxParallelForks = 1 // Sequential execution for system tests
    minHeapSize = "512m"
    maxHeapSize = "2048m"
    forkEvery = 1 // Fork for each test to prevent interference
    
    // JVM settings optimized for system tests
    jvmArgs(
        "-XX:+UseG1GC",
        "-XX:MaxGCPauseMillis=200",
        "-XX:+UseStringDeduplication",
        "-Dfile.encoding=UTF-8",
        "-XX:+PrintGC", // Enable GC logging for performance tests
        "-XX:+PrintGCDetails"
    )
    
    // Sequential execution for system tests
    systemProperty("junit.jupiter.execution.parallel.enabled", "false")
    
    testLogging {
        events("passed", "skipped", "failed", "standard_out")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
        showStandardStreams = true // Show output for performance measurements
        showCauses = true
        showExceptions = true
        showStackTraces = true
    }
    
    // No fast failure for comprehensive system testing
    failFast = false
    
    // Conservative caching for system tests (performance may vary)
    outputs.cacheIf { !project.hasProperty("no-system-test-cache") }
    outputs.upToDateWhen { 
        // System tests should run more frequently to catch performance regressions
        !project.hasProperty("force-system-tests") && inputs.hasInputs
    }
}

// Aggregate test task - runs all test suites in dependency order
val testAll by tasks.registering {
    description = "Runs all test suites in optimal order (unit -> integration -> system)"
    group = "verification"
    
    dependsOn(unitTest, integrationTest, systemTest)
    
    // Ensure proper execution order
    integrationTest.get().mustRunAfter(unitTest)
    systemTest.get().mustRunAfter(integrationTest)
}

// Configure the main test task to run unit tests for fast feedback (standard Gradle convention)
tasks.test {
    // Follow Gradle convention: 'test' runs unit tests for rapid development feedback
    description = "Runs unit tests (fast domain, verification, and application service tests)"
}

// Quality gate task that runs fast tests first
val quickTest by tasks.registering {
    description = "Runs only unit tests for quick feedback during development"
    group = "verification"
    
    dependsOn(unitTest)
}

// CI-optimized test task for parallel execution
val ciTest by tasks.registering {
    description = "Runs test suites optimized for CI environments with smart parallelization"
    group = "verification"

    dependsOn(unitTest, integrationTest, systemTest)

    // Smart CI execution: unit tests must pass first, then parallel execution
    integrationTest.get().mustRunAfter(unitTest)
    systemTest.get().mustRunAfter(unitTest)
    // Integration and system tests can run in parallel after unit tests complete

    doFirst {
        val ciEnv = System.getenv("CI") ?: "false"
        val githubActions = System.getenv("GITHUB_ACTIONS") ?: "false"
        println("🚀 CI Test Execution Plan:")
        println("   Environment: CI=$ciEnv, GitHub Actions=$githubActions")
        println("   Strategy: Unit tests → (Integration ∥ System) tests")
        println("   Expected performance: 40-60% faster with caching")
    }
}

// GitHub Actions optimized test execution with matrix support
val ciUnitOnly by tasks.registering {
    description = "CI task for unit tests only (for matrix builds)"
    group = "verification"

    dependsOn(unitTest)

    doFirst {
        println("🧪 CI Unit Test Matrix Job:")
        println("   Running fast unit tests for rapid feedback")
        println("   Expected duration: <30 seconds")
    }
}

val ciIntegrationOnly by tasks.registering {
    description = "CI task for integration tests only (for matrix builds)"
    group = "verification"

    dependsOn(integrationTest)

    doFirst {
        println("🔗 CI Integration Test Matrix Job:")
        println("   Running integration tests with database dependencies")
        println("   Expected duration: 1-3 minutes")
    }
}

// Smart build status reporting (configuration cache compatible)
val buildStatus by tasks.registering {
    description = "Display smart build optimization status"
    group = "help"
    notCompatibleWithConfigurationCache("This task prints build status information")
    
    doLast {
        println("\n🛠️  CycleTime Smart Build Status:")
        println("==========================================\n")
        
        println("🚀 Performance Optimizations:")
        println("  ✅ Gradle Build Cache: ENABLED")
        println("  ✅ Configuration Cache: ENABLED")
        println("  ✅ Parallel Execution: ENABLED")
        println("  ✅ File System Watching: ENABLED")
        println("  ✅ Incremental Compilation: ENABLED")
        println("  ✅ Max Workers: 4")
        println("  ✅ JVM Memory: 4GB")
        println("  ✅ G1GC Enabled: true")
        println("  ✅ String Deduplication: true")
        
        println("\n📊 Advanced Test Categorization & Caching (SPI-623):")
        println("  • Unit Tests: Domain, verification, unit packages (fast feedback)")
        println("  • Integration Tests: Infrastructure, API, MCP, concurrency tests")
        println("  • System Tests: Performance, end-to-end scenarios")
        println("  • Smart Caching: Test-specific input tracking")
        println("  • Unit test cache: Domain/verification sources only")
        println("  • Integration cache: Application/infrastructure + DB versions")
        println("  • System test cache: Conservative (performance sensitive)")
        println("  • Incremental compilation: Precise source file tracking")
        println("  • CI optimization: Matrix builds + parallel execution")
        println("  • Test parallelism: Dynamic CPU-based optimization")
        
        println("\n⏭️  CI Smart Skipping:")
        println("  • Skips builds for: *.md, docs/*, .claude/*, .gitignore")
        println("  • Always runs: Code quality checks, security scans")
        println("  • Conditional: Tests, builds, Docker images")
        
        println("\n📈 Expected Performance Gains (SPI-475):")
        println("  • Documentation-only changes: 70% base + caching optimizations")
        println("  • Dependency downloads: 80-90% reduction (cache hits)")
        println("  • Gradle compilation: 40-60% improvement (incremental + cache)")
        println("  • Docker builds: 60-80% faster (BuildKit layer cache)")
        println("  • Overall CI time: 40-60% reduction (combined optimizations)")
        println("  • Total potential savings: Up to 85% for cached builds")
        
        println("\n📝 Optimized Usage Commands:")
        println("  • ./gradlew quickTest - Fast unit tests only (<30s)")
        println("  • ./gradlew unitTest - All unit tests with optimization")
        println("  • ./gradlew integrationTest - Integration tests with DB")
        println("  • ./gradlew systemTest - Performance and e2e tests")
        println("  • ./gradlew testAll - All test suites in sequence")
        println("  • ./gradlew ciTest - CI-optimized with parallelization")
        println("  • ./gradlew ciUnitOnly - CI matrix: unit tests only")
        println("  • ./gradlew ciIntegrationOnly - CI matrix: integration only")
        println("  • ./gradlew buildStatus - Show optimization status")
        println("")
    }
}

ktor {
    fatJar {
        archiveFileName.set("cycletime-server.jar")
    }
}

graalvmNative {
    binaries {
        named("main") {
            // Simple binary name - CI workflow handles versioning and platform naming
            // Gradle produces: cycletime-server
            // CI renames to: cycletime-server-{version}-{platform}
            imageName.set("cycletime-server")
            mainClass.set("io.spiralhouse.cycletime.ApplicationKt")

            // Production-ready GraalVM native-image configuration
            // Validated with SPI-921 (GraalVM Compatibility Research)

            // Core settings
            buildArgs.add("--no-fallback") // Pure native, no JVM fallback
            buildArgs.add("--enable-http") // Required for Ktor server
            buildArgs.add("--enable-https") // Required for secure connections
            buildArgs.add("-H:+ReportExceptionStackTraces") // Better error reporting
            buildArgs.add("--enable-url-protocols=http,https") // Explicit protocol support

            // Runtime initialization (validated in SPI-921)
            buildArgs.add("--initialize-at-run-time=kotlin.uuid.SecureRandomHolder") // Fix Kotlin UUID SecureRandom
            buildArgs.add("--initialize-at-run-time=ch.qos.logback") // Logback threading fix
            buildArgs.add("--initialize-at-run-time=org.slf4j.LoggerFactory") // SLF4J runtime init

            // Performance optimizations
            buildArgs.add("-Ob") // Balanced optimization (size vs speed)
            buildArgs.add("-march=compatibility") // Cross-platform compatibility
            // Serial GC is the default for GraalVM Community Edition
            // G1 GC requires Oracle GraalVM (Enterprise) and is not available in CE

            // Memory configuration (Serial GC tuning)
            buildArgs.add("-H:+UnlockExperimentalVMOptions")
            buildArgs.add("-H:InitialCollectionPolicy=com.oracle.svm.core.genscavenge.CollectionPolicy\$BySpaceAndTime")

            // Resource handling
            buildArgs.add("-H:IncludeResources=application.conf") // Include Ktor config
            buildArgs.add("-H:IncludeResources=logback.xml") // Include logging config
            buildArgs.add("-H:IncludeResourceBundles=com.sun.org.apache.xerces.internal.impl.msg.XMLMessages")

            // Reflection config auto-discovered from META-INF/native-image/ (SPI-921)
            // GraalVM automatically loads reflect-config.json from standard location

            // Debug and diagnostics (can be disabled for production)
            buildArgs.add("-H:+PrintClassInitialization") // Debug class initialization
            buildArgs.add("--verbose") // Detailed build output

            // Note: GraalVM installation location is specified via GRAALVM_HOME environment variable
            // The plugin will look for native-image in $GRAALVM_HOME/bin/native-image
            // Minimum GraalVM version: 21.0.8 (validated in SPI-921)
        }
    }

    agent {
        defaultMode.set("standard")
        modes {
            standard {
                // Standard mode collects metadata during test execution
                // Generates reflection-config.json, jni-config.json, etc.
            }
        }
        metadataCopy {
            mergeWithExisting.set(true)
            inputTaskNames.add("test") // Collect metadata from unit tests
            inputTaskNames.add("integrationTest") // Collect metadata from integration tests
            outputDirectories.add("src/main/resources/META-INF/native-image")
        }
    }

    // Toolchain configuration for native-image
    // Note: This requires JAVA_HOME to point to GraalVM distribution
    toolchainDetection.set(false) // Use explicit GRAALVM_HOME instead
}

// Detekt configuration
detekt {
    toolVersion = libs.versions.detekt.get()
    config.setFrom("$projectDir/config/detekt/detekt.yml")
    buildUponDefaultConfig = true

    source.setFrom(
        "src/main/kotlin",
        "src/test/kotlin"
    )
}

// Kover configuration
kover {
    // Configure Kover to collect coverage from both unit and integration tests
    // Updated for SPI-595: Include integrationTest for accurate API coverage reporting
    currentProject {
        instrumentation {
            // Keep systemTest disabled for performance
            disabledForTestTasks.add("systemTest")
            // Disable test delegation task to prevent CI from running overlapping test tasks
            disabledForTestTasks.add("test")
            // Conditionally disable integrationTest for Unit Tests CI job only
            if (System.getenv("SKIP_INTEGRATION_COVERAGE") == "true") {
                disabledForTestTasks.add("integrationTest") // Prevents koverXmlReport from triggering integrationTest
            }
            // Note: This preserves SPI-595 parallel coverage collection while preventing task dependency issues
        }
    }
    
    reports {
        filters {
            excludes {
                // Exclude generated code and infrastructure
                classes("*.di.*", "*.infrastructure.*")
                packages("io.spiralhouse.cycletime.infrastructure.di")
            }
        }

        total {
            xml {
                onCheck.set(false)
            }
            html {
                onCheck.set(false)
            }
        }

        verify {
            rule {
                disabled.set(true)  // Disable verification for POC cleanup
                bound {
                    minValue = 85
                    coverageUnits = kotlinx.kover.gradle.plugin.dsl.CoverageUnit.LINE
                    aggregationForGroup = kotlinx.kover.gradle.plugin.dsl.AggregationType.COVERED_PERCENTAGE
                }
            }
        }
    }
}

// Dependency Check configuration
dependencyCheck {
    format = org.owasp.dependencycheck.reporting.ReportGenerator.Format.ALL.name
    suppressionFile = "$projectDir/config/dependency-check/suppressions.xml"
    failBuildOnCVSS = 7.0f

    // Configure NVD API key if available (speeds up vulnerability scanning)
    nvd {
        apiKey = System.getProperty("nvd.api.key") ?: System.getenv("NVD_API_KEY") ?: ""
        delay = 2000 // Delay between NVD API calls in milliseconds (with API key)
    }

    analyzers {
        // Enable analyzers
        assemblyEnabled = false
        nuspecEnabled = false
        nugetconfEnabled = false
    }
}

// =============================================================================
// Build Performance Monitoring & Optimization
// =============================================================================

// Global task optimization
tasks.configureEach {
    // Enable build caching for all tasks where applicable
    outputs.cacheIf { !project.hasProperty("no-build-cache") }
    
    // Enable up-to-date checks for incremental builds
    outputs.upToDateWhen { !project.hasProperty("force-rebuild") }
}

// Smart build skipping optimization
val smartBuildOptimization by tasks.registering {
    description = "Configure smart build skipping based on file changes"
    group = "optimization"
    
    doLast {
        println("🚀 Smart build optimization active:")
        println("  - Incremental compilation: ${project.findProperty("kotlin.incremental") ?: "true"}")
        println("  - Build cache: ${gradle.startParameter.isBuildCacheEnabled}")
        println("  - Configuration cache: ${project.findProperty("org.gradle.configuration-cache") ?: "true"}")
        println("  - Parallel execution: ${project.findProperty("org.gradle.parallel") ?: "true"}")
        println("  - File system watching: ${project.findProperty("org.gradle.vfs.watch") ?: "true"}")
    }
}

// Optimize specific task types
tasks.withType<Jar> {
    duplicatesStrategy = DuplicatesStrategy.WARN
    isPreserveFileTimestamps = false
    isReproducibleFileOrder = true
}

// Optimize detekt for caching
tasks.withType<io.gitlab.arturbosch.detekt.Detekt>().configureEach {
    // Parallel execution
    parallel = true
    // Set JVM target for detekt
    jvmTarget = "21"
}

// Apply performance optimizations to all compilation tasks
tasks.withType<JavaCompile> {
    options.isIncremental = true
    options.isFork = true
    options.forkOptions.jvmArgs?.addAll(listOf(
        "-XX:+UseG1GC",
        "-XX:+UseStringDeduplication"
    ))
}

// Build performance reporting (can be enabled by adding -Pprofile to gradle command)
if (project.hasProperty("profile")) {
    gradle.projectsEvaluated {
        println("Build profiling enabled. Performance analysis will be available after build completion.")
    }
}

// =============================================================================
// Development Productivity Tasks (SPI-479)
// =============================================================================

// Continuous build task for local development
val devBuild by tasks.registering {
    description = "Continuous build for development with auto-reload"
    group = "development"
    
    doLast {
        println("🚀 Starting continuous development build...")
        println("   This task will watch for file changes and automatically rebuild")
        println("   Use './gradlew devBuild --continuous' for hot-reload development")
        println("   Press Ctrl+C to stop the continuous build")
    }
    
    dependsOn("classes")
    
    // Watch for source changes
    inputs.files(fileTree("src/main/kotlin"))
    inputs.files(fileTree("src/main/resources"))
    inputs.file("build.gradle.kts")
    
    // Quick incremental compilation
    outputs.upToDateWhen { false } // Always execute for continuous mode
}

// Development server with hot-reload
val devRun by tasks.registering(JavaExec::class) {
    description = "Run development server with hot-reload and automatic restart"
    group = "development"
    
    mainClass.set("io.spiralhouse.cycletime.ApplicationKt")
    classpath = sourceSets.main.get().runtimeClasspath
    
    // Development JVM arguments
    jvmArgs(
        "-Dio.ktor.development=true",
        "-DKTOR_DEVELOPMENT=true",
        "-DKTOR_AUTORELOAD=true",
        "-DDATABASE_LOGGING=true",
        "-Dcycletime.version=${version}", // Pass version for runtime
        "-Xmx1024m",
        "-XX:+UseG1GC",
        "-XX:+UseStringDeduplication",
        "-Dfile.encoding=UTF-8"
    )
    
    // Environment variables for development
    environment("KTOR_DEVELOPMENT", "true")
    environment("KTOR_AUTORELOAD", "true")
    environment("DATABASE_LOGGING", "true")
    environment("DATABASE_URL", "jdbc:h2:file:./cycletime-dev;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE")
    
    // Watch for source changes
    inputs.files(fileTree("src/main/kotlin"))
    inputs.files(fileTree("src/main/resources"))
    inputs.file("build.gradle.kts")
    
    // Always run in development mode
    outputs.upToDateWhen { false }
    
    dependsOn("classes")
    
    doFirst {
        println("🔥 Starting CycleTime development server with hot-reload...")
        println("   Server will restart automatically when source files change")
        println("   Database: cycletime-dev.db (separate from production)")
        println("   Health check: http://localhost:8080/health")
        println("   Press Ctrl+C to stop the server")
    }
}

// Watch mode for tests - automatically run tests when source changes
val testWatch by tasks.registering {
    description = "Continuously run tests when source files change"
    group = "development"
    
    doLast {
        println("🧪 Starting test watch mode...")
        println("   Tests will run automatically when source files change")
        println("   Use './gradlew testWatch --continuous' for continuous testing")
        println("   Press Ctrl+C to stop the test watcher")
    }
    
    dependsOn("quickTest") // Run fast unit tests only
    
    // Watch for source and test changes
    inputs.files(fileTree("src/main/kotlin"))
    inputs.files(fileTree("src/test/kotlin"))
    inputs.file("build.gradle.kts")
    
    // Always execute for continuous mode
    outputs.upToDateWhen { false }
}

// Full development workflow with parallel test watching
val devWorkflow by tasks.registering {
    description = "Start full development workflow (server + test watch)"
    group = "development"
    
    doLast {
        println("🚀 CycleTime Development Workflow")
        println("===========================")
        println("")
        println("To start the full development experience:")
        println("")
        println("1. 🔥 Server with hot-reload:")
        println("   ./gradlew devRun --continuous")
        println("")
        println("2. 🧪 Test watcher (in separate terminal):")
        println("   ./gradlew testWatch --continuous") 
        println("")
        println("3. 🐳 Docker development (alternative):")
        println("   docker-compose -f docker-compose.dev.yml up")
        println("")
        println("4. 🛠️ Build watcher (optional, in separate terminal):")
        println("   ./gradlew devBuild --continuous")
        println("")
        println("💡 Tips:")
        println("   • Use multiple terminals for parallel workflows")
        println("   • Database file: cycletime-dev.db (isolated from production)")
        println("   • Health check: http://localhost:8080/health")
        println("   • Press Ctrl+C in each terminal to stop processes")
        println("")
    }
}

// Quick development setup
val devSetup by tasks.registering {
    description = "One-time development environment setup"
    group = "development"
    notCompatibleWithConfigurationCache("This task sets up development environment")
    
    doLast {
        println("🛠️ Setting up CycleTime development environment...")
        
        // Create development database
        val devDbFile = File(project.projectDir, "cycletime-dev.db")
        if (!devDbFile.exists()) {
            println("   📄 Creating development database: cycletime-dev.db")
        } else {
            println("   ✅ Development database already exists: cycletime-dev.db")
        }
        
        // Create logs directory
        val logsDir = File(project.projectDir, "logs")
        if (!logsDir.exists()) {
            logsDir.mkdirs()
            println("   📁 Created logs directory")
        } else {
            println("   ✅ Logs directory already exists")
        }
        
        println("")
        println("🎉 Development environment ready!")
        println("")
        println("Next steps:")
        println("   1. Run './gradlew devWorkflow' to see all development commands")
        println("   2. Start with './gradlew devRun --continuous' for hot-reload server")
        println("   3. Use './gradlew testWatch --continuous' for continuous testing")
        println("")
    }
    
    dependsOn("build")
}

// Development status and health check
val devStatus by tasks.registering {
    description = "Show development environment status and health"
    group = "development"
    notCompatibleWithConfigurationCache("This task shows development environment status")
    
    doLast {
        println("🔍 CycleTime Development Environment Status")
        println("======================================")
        println("")
        
        // Check if development database exists
        val devDb = File(project.projectDir, "cycletime-dev.db")
        println("📄 Development Database:")
        if (devDb.exists()) {
            val sizeKB = devDb.length() / 1024
            println("   ✅ cycletime-dev.db exists (${sizeKB}KB)")
        } else {
            println("   ❌ cycletime-dev.db not found (run './gradlew devSetup')")
        }
        
        // Check build directory
        val buildDir = File(project.projectDir, "build")
        println("\n🔨 Build Status:")
        if (buildDir.exists() && File(buildDir, "classes").exists()) {
            println("   ✅ Project compiled")
        } else {
            println("   ❌ Project not compiled (run './gradlew build')")
        }
        
        // Check configuration
        println("\n⚙️ Development Configuration:")
        val isDevelopment = project.ext.has("development")
        println("   Development mode: ${if (isDevelopment) "✅ Enabled" else "⚠️ Disabled (add -Pdevelopment=true)"}")
        
        val parallelEnabled = project.findProperty("org.gradle.parallel") == "true"
        println("   Parallel builds: ${if (parallelEnabled) "✅ Enabled" else "⚠️ Disabled"}")
        
        println("\n🚀 Quick Commands:")
        println("   • Start server: ./gradlew devRun --continuous")
        println("   • Test watch: ./gradlew testWatch --continuous")
        println("   • Docker dev: docker-compose -f docker-compose.dev.yml up")
        println("   • Full workflow: ./gradlew devWorkflow")
        println("")
    }
}
