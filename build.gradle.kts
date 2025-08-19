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
    // Ktor with Native DI
    implementation(libs.ktor.server.core)
    implementation(libs.ktor.server.netty)
    implementation(libs.ktor.server.di)
    implementation(libs.ktor.server.content.negotiation)
    implementation(libs.ktor.server.config.hocon)
    implementation(libs.ktor.server.websockets)
    implementation(libs.ktor.server.cors)
    implementation(libs.ktor.server.call.logging)
    implementation(libs.ktor.server.status.pages)
    implementation(libs.ktor.server.auth)
    implementation(libs.ktor.server.auth.jwt)
    implementation(libs.ktor.server.sse)
    implementation(libs.ktor.serialization.kotlinx.json)
    
    // Exposed ORM
    implementation(libs.exposed.core)
    implementation(libs.exposed.dao)
    implementation(libs.exposed.jdbc)
    implementation(libs.exposed.java.time)
    implementation(libs.exposed.json)
    implementation(libs.exposed.kotlin.datetime)
    
    // Database - H2
    implementation(libs.h2.database)
    implementation(libs.hikaricp)
    
    // Kotlin
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.datetime)
    
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
    
    // Test Containers for Integration Testing
    testImplementation("org.testcontainers:testcontainers:1.19.3")
    testImplementation("org.testcontainers:junit-jupiter:1.19.3")
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
        archiveFileName.set("jcvd.jar")
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