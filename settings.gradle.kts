rootProject.name = "jcvd-kotlin"

dependencyResolutionManagement {
    repositories {
        mavenCentral()
        maven("https://maven.pkg.jetbrains.space/public/p/ktor/eap")
    }
    
    versionCatalogs {
        create("libs") {
            from("io.ktor:ktor-version-catalog:3.2.0")
        }
    }
}