import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ktor)
    alias(libs.plugins.graalvm)
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
    // Ktor
    implementation(libs.ktor.server.core)
    implementation(libs.ktor.server.cio)
    implementation(libs.ktor.server.content.negotiation)
    implementation(libs.ktor.server.config.yaml)
    implementation(libs.ktor.server.sse)
    implementation(libs.ktor.serialization.kotlinx.json)
    
    // Exposed ORM
    implementation(libs.exposed.core)
    implementation(libs.exposed.dao)
    implementation(libs.exposed.jdbc)
    implementation(libs.exposed.kotlin.datetime)
    
    // Database
    implementation(libs.sqlite.jdbc)
    implementation(libs.hikaricp)
    
    // Dependency Injection
    implementation(libs.koin.core)
    implementation(libs.koin.ktor)
    
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
}

tasks.withType<KotlinCompile> {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_21)
        freeCompilerArgs.add("-Xjsr305=strict")
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
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
            buildArgs.add("-H:ReflectionConfigurationFiles=src/main/resources/META-INF/native-image/reflect-config.json")
            buildArgs.add("-H:ResourceConfigurationFiles=src/main/resources/META-INF/native-image/resource-config.json")
            buildArgs.add("-H:SerializationConfigurationFiles=src/main/resources/META-INF/native-image/serialization-config.json")
            
            // Optimize for size
            buildArgs.add("-Os")
            buildArgs.add("-march=native")
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