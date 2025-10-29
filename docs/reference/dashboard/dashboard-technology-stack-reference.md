---
title: "Dashboard Technology Stack Reference"
type: reference
domain: [ui, infrastructure]
description: "Complete technology specifications and version requirements for CycleTime Dashboard"
dependencies: [../project-fundamentals.md]
related: [../../concepts/dashboard/dashboard-architecture-concept.md, ../../guides/dashboard/dashboard-implementation-guide.md]
keywords: [htmx, tailwind, ktor, kotlin, technology-stack, dependencies]
audience: [developers]
last_updated: 2025-10-28
---

# Dashboard Technology Stack Reference

## Frontend Technologies

### HTMX

**Version**: 1.9.x
**Purpose**: Dynamic HTML interactions without heavy JavaScript
**CDN**: `https://unpkg.com/htmx.org@1.9.10`

**Key Features**:
- AJAX requests triggered by HTML attributes
- HTML fragment swapping for dynamic content
- Server-sent events (SSE) support
- WebSocket support for real-time updates
- Progressive enhancement philosophy

**Bundle Size**: ~14KB compressed

**Browser Support**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Usage in Dashboard**:
- Lazy loading subtasks on expand
- Dynamic content updates without page reload
- Future: Real-time updates via SSE

### Tailwind CSS

**Version**: 3.x
**Purpose**: Utility-first CSS framework for rapid UI development
**CDN (Development)**: `https://cdn.tailwindcss.com`

**Key Features**:
- Utility-first CSS classes
- Mobile-first responsive design
- Dark mode support (class-based)
- JIT (Just-In-Time) compilation
- PurgeCSS integration for production

**Bundle Size**:
- Development (CDN): ~3MB uncompressed
- Production (purged): ~3-10KB compressed

**Browser Support**:
- All modern browsers
- IE 11 with autoprefixer

**Usage in Dashboard**:
- Complete visual styling
- Responsive grid layouts
- Color scheme matching CycleTime marketing site
- Dark theme implementation

### Alpine.js

**Version**: 3.x
**Purpose**: Lightweight JavaScript for minimal client-side state
**CDN**: `https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js`
**Status**: Optional enhancement

**Key Features**:
- Declarative JavaScript behavior
- Reactive data binding
- Component composition
- Event handling
- x-data, x-bind, x-on directives

**Bundle Size**: ~15KB compressed

**Usage in Dashboard**:
- Theme toggle (dark/light mode)
- Local expand/collapse state
- Client-side filtering (future)

### Ktor HTML DSL

**Version**: 3.3.1
**Purpose**: Type-safe server-side HTML generation
**Library**: `io.ktor:ktor-server-html-builder`

**Key Features**:
- Type-safe HTML construction in Kotlin
- Compile-time validation of HTML structure
- No separate template files needed
- Direct integration with Ktor routes
- Automatic HTML escaping for XSS prevention

**Usage in Dashboard**:
- All HTML template rendering
- Component composition
- Server-side generated HTML fragments for HTMX

## Backend Technologies

### Ktor Framework

**Version**: 3.3.1
**Purpose**: Asynchronous web framework for HTTP serving
**Core Modules**:
- `ktor-server-core` - Core server functionality
- `ktor-server-cio` - Coroutine-based I/O engine
- `ktor-server-html-builder` - HTML DSL integration
- `ktor-server-di` - Native dependency injection

**Features Used**:
- HTTP routing with type-safe parameter extraction
- Content negotiation for HTML responses
- Static resource serving
- Native DI for service injection

**Configuration**:
```kotlin
embeddedServer(CIO, port = 8080, host = "127.0.0.1") {
    routing {
        route("/dashboard") {
            // Dashboard routes
        }
    }
}
```

### Ktor Native DI

**Version**: Included in Ktor 3.3.1
**Purpose**: Lightweight dependency injection
**Module**: `io.ktor.server.di`

**Usage Pattern**:
```kotlin
// Registration in Application.kt
fun Application.configureDependencies() {
    dependencies {
        provide<DashboardCache> { DashboardCache() }
        provide<DashboardApplicationService> {
            DashboardApplicationService(
                instance(), // ProjectRepository
                instance(), // IssueRepository
                instance(), // DashboardCache
                instance()  // TimeProvider
            )
        }
    }
}

// Retrieval in routes
val service: DashboardApplicationService by application.dependencies
```

### kotlinx.html

**Version**: 0.11.0
**Purpose**: Kotlin DSL for HTML generation
**Library**: `org.jetbrains.kotlinx:kotlinx-html-jvm`

**Features**:
- Type-safe HTML construction
- Kotlin language features (loops, conditionals, functions)
- Automatic HTML escaping
- Support for custom attributes (HTMX)

**Example**:
```kotlin
div(classes = "container mx-auto") {
    h1 { +"Dashboard" }
    ul {
        projects.forEach { project ->
            li { +project.name }
        }
    }
}
```

### kotlinx.serialization

**Version**: 1.7.x
**Purpose**: Kotlin serialization for DTOs
**Library**: `org.jetbrains.kotlinx:kotlinx-serialization-json`

**Usage**: Serializing view DTOs for future JSON API endpoints

### H2 Database

**Version**: 2.x
**Purpose**: Embedded relational database
**Connection**: JDBC via Exposed ORM
**Mode**: PostgreSQL compatibility mode

**Configuration**:
```
jdbc:h2:file:./cycletime;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE
```

### Exposed ORM

**Version**: 0.61.0
**Purpose**: Type-safe SQL DSL and ORM
**Modules**:
- `exposed-core` - Core DSL
- `exposed-dao` - DAO pattern support
- `exposed-jdbc` - JDBC integration

**Usage**: Repository implementations for domain entities

## Development Tools

### Gradle

**Version**: 8.x
**Purpose**: Build automation and dependency management

**Key Tasks**:
```bash
./gradlew run           # Start development server
./gradlew build         # Build project
./gradlew test          # Run tests
./gradlew detekt        # Static analysis
```

### Kotest

**Version**: 5.x
**Purpose**: Testing framework for Kotlin
**Styles**: StringSpec, FunSpec, BehaviorSpec

**Usage**:
- Unit tests for application services
- Integration tests for Ktor routes
- Test fixtures for domain entities

### Ktor Test Client

**Library**: `io.ktor:ktor-server-test-host`
**Purpose**: Testing Ktor routes without starting server

**Example**:
```kotlin
testApplication {
    application {
        configureDashboardRoutes()
    }

    val response = client.get("/dashboard")
    response.status shouldBe HttpStatusCode.OK
}
```

## Development Environment

### CDN Usage (Development)

For rapid development, use CDN-hosted libraries:

```html
<!-- HTMX -->
<script src="https://unpkg.com/htmx.org@1.9.10"></script>

<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Alpine.js (optional) -->
<script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
```

**Advantages**:
- No build step required
- Fast iteration during development
- Browser caching across projects

### Hot Reload

Ktor supports development mode with auto-reload:

```bash
./gradlew run -Dio.ktor.development=true
```

**Configuration** (`application.conf`):
```hocon
ktor {
    development = true
    deployment {
        watch = [build/classes]
    }
}
```

## Production Build

### Optimized Frontend Assets

For production deployment:

**Tailwind CSS**:
1. Install Tailwind CLI
2. Configure `tailwind.config.js` with content paths
3. Generate optimized CSS bundle
4. Result: ~3-10KB compressed

**HTMX/Alpine.js**:
- Download and serve from `/static` directory
- Enable Ktor static resource compression
- Configure browser caching headers

### Build Configuration

```kotlin
// build.gradle.kts
tasks.jar {
    manifest {
        attributes["Main-Class"] = "io.spiralhouse.cycletime.ApplicationKt"
    }

    from(configurations.runtimeClasspath.get().map { if (it.isDirectory) it else zipTree(it) })
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
}
```

## Version Compatibility Matrix

| Component | Version | Kotlin | JVM | Notes |
|-----------|---------|--------|-----|-------|
| Kotlin | 2.2.21 | - | 21+ | Language version |
| Ktor | 3.3.1 | 2.0+ | 21+ | Framework core |
| Exposed | 0.61.0 | 2.0+ | 21+ | ORM layer |
| H2 | 2.x | - | 21+ | Database |
| kotlinx.html | 0.11.0 | 2.0+ | 21+ | HTML DSL |
| kotlinx.serialization | 1.7.x | 2.0+ | 21+ | JSON serialization |
| Kotest | 5.x | 2.0+ | 21+ | Testing |
| HTMX | 1.9.x | - | - | Frontend library |
| Tailwind CSS | 3.x | - | - | Frontend library |
| Alpine.js | 3.x | - | - | Frontend library (optional) |

## Dependency Declaration

### build.gradle.kts

```kotlin
dependencies {
    // Ktor Server
    implementation("io.ktor:ktor-server-core:3.3.1")
    implementation("io.ktor:ktor-server-cio:3.3.1")
    implementation("io.ktor:ktor-server-html-builder:3.3.1")
    implementation("io.ktor:ktor-server-di:3.3.1")

    // HTML Generation
    implementation("org.jetbrains.kotlinx:kotlinx-html-jvm:0.11.0")

    // Database
    implementation("org.jetbrains.exposed:exposed-core:0.61.0")
    implementation("org.jetbrains.exposed:exposed-dao:0.61.0")
    implementation("org.jetbrains.exposed:exposed-jdbc:0.61.0")
    implementation("com.h2database:h2:2.3.232")

    // Serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

    // Testing
    testImplementation("io.kotest:kotest-runner-junit5:5.9.1")
    testImplementation("io.kotest:kotest-assertions-core:5.9.1")
    testImplementation("io.ktor:ktor-server-test-host:3.3.1")
    testImplementation("io.mockk:mockk:1.13.13")
}
```

## Configuration Reference

### Environment Variables

```bash
# Server Configuration
HOST=127.0.0.1              # Localhost only
PORT=8080                   # HTTP port

# Dashboard Configuration
DASHBOARD_ENABLED=true      # Enable dashboard routes
DASHBOARD_CACHE_TTL=300     # Cache TTL in seconds (5 minutes)
DASHBOARD_MAX_CACHE_SIZE=100 # Max cached responses

# Database Configuration (existing)
DATABASE_URL=jdbc:h2:file:./cycletime;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE
```

### application.conf

```hocon
ktor {
    deployment {
        port = 8080
        port = ${?PORT}
        host = "127.0.0.1"
        host = ${?HOST}
    }

    application {
        modules = [io.spiralhouse.cycletime.ApplicationKt.module]
    }
}

dashboard {
    enabled = true
    enabled = ${?DASHBOARD_ENABLED}

    cache {
        ttl = 300
        ttl = ${?DASHBOARD_CACHE_TTL}
        maxSize = 100
        maxSize = ${?DASHBOARD_MAX_CACHE_SIZE}
    }
}
```

## Browser Requirements

### Minimum Requirements

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 90+ | Full support |
| Firefox | 88+ | Full support |
| Safari | 14+ | Full support |
| Edge | 90+ | Full support |

### Feature Support

| Feature | Requirement | Fallback |
|---------|-------------|----------|
| HTMX | JavaScript enabled | Full page navigation |
| Tailwind CSS | CSS3 support | Degraded styling |
| Alpine.js | JavaScript enabled | Static UI (optional feature) |
| Dark mode | `prefers-color-scheme` media query | Light mode default |

## Related Documentation

- [Dashboard Architecture Concept](../../concepts/dashboard/dashboard-architecture-concept.md) - Architectural decisions
- [Dashboard Implementation Guide](../../guides/dashboard/dashboard-implementation-guide.md) - Step-by-step implementation
- [Project Fundamentals](../project-fundamentals.md) - CycleTime technology overview
