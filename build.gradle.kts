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
    application
}

group = "com.spiralhouse.jcvd"
version = "0.1.0-SNAPSHOT"

application {
    mainClass.set("com.spiralhouse.jcvd.ApplicationKt")
    
    val isDevelopment: Boolean = project.ext.has("development")
    applicationDefaultJvmArgs = listOf("-Dio.ktor.development=$isDevelopment")
}

dependencies {
    // Ktor - Current implementation uses CIO server engine
    implementation(libs.ktor.server.core)
    implementation(libs.ktor.server.cio)  // Currently used in Application.kt
    implementation(libs.ktor.server.content.negotiation)
    implementation(libs.ktor.server.sse)
    implementation(libs.ktor.serialization.kotlinx.json)
    
    // TODO: Future Ktor components for SPI-442 (Ktor Native DI migration)
    // implementation(libs.ktor.server.netty)  // Future migration target
    // implementation(libs.ktor.server.di)    // Future DI replacement
    
    // Exposed ORM - Currently used for SQLite database access
    implementation(libs.exposed.core)
    implementation(libs.exposed.dao)
    implementation(libs.exposed.jdbc)
    implementation(libs.exposed.java.time)
    implementation(libs.exposed.kotlin.datetime)
    
    // Database - Current implementation uses SQLite with HikariCP
    implementation("org.xerial:sqlite-jdbc:3.46.1.3")  // SQLite JDBC driver
    implementation(libs.hikaricp)
    
    // TODO: Future H2 migration in SPI-439
    // implementation(libs.h2.database)
    
    // Kotlin
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.datetime)
    
    // Dependency Injection - Currently using Koin
    implementation("io.insert-koin:koin-ktor:4.0.0")
    implementation("io.insert-koin:koin-core:4.0.0")
    // TODO: Migrate to Ktor Native DI in SPI-442
    
    // MCP SDK (when available)
    // implementation(libs.mcp.kotlin.sdk)
    
    // Logging
    implementation(libs.logback.classic)
    
    // Testing
    testImplementation(libs.kotest.runner.junit5)
    testImplementation(libs.kotest.assertions.core)
    testImplementation(libs.kotest.property)
    testImplementation(libs.mockk)
    testImplementation(libs.ktor.server.test.host)
    testImplementation(libs.kotlinx.coroutines.test)
    
    // TODO: TestContainers for SPI-439 Integration Testing (when H2 repositories are implemented)
    // testImplementation("org.testcontainers:testcontainers:1.19.3")
    // testImplementation("org.testcontainers:junit-jupiter:1.19.3")
}

tasks.withType<KotlinCompile> {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_21)
        freeCompilerArgs.addAll(
            "-Xjsr305=strict",
            "-opt-in=kotlin.RequiresOptIn",
            "-opt-in=kotlinx.coroutines.ExperimentalCoroutinesApi",
            "-opt-in=kotlinx.serialization.ExperimentalSerializationApi"
        )
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
    testLogging {
        events("passed", "skipped", "failed")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
        showStandardStreams = false
    }
}

ktor {
    fatJar {
        archiveFileName.set("jcvd-server.jar")
    }
}

graalvmNative {
    binaries {
        named("main") {
            imageName.set("jcvd-server")
            mainClass.set("com.spiralhouse.jcvd.ApplicationKt")
            
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
            standard {
            }
        }
        metadataCopy {
            mergeWithExisting.set(true)
            inputTaskNames.add("test")
            outputDirectories.add("src/main/resources/META-INF/native-image")
        }
    }
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
    reports {
        filters {
            excludes {
                // Exclude generated code and infrastructure
                classes("*.di.*", "*.infrastructure.*")
                packages("com.spiralhouse.jcvd.infrastructure.di")
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
    
    analyzers {
        // Enable analyzers
        assemblyEnabled = false
        nuspecEnabled = false
        nugetconfEnabled = false
    }
}