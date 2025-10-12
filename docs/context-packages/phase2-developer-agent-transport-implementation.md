# Context Package: Developer Agent - Phase 2 (Transport Layer Implementation)

## Mission Overview

**Your Role**: Implement SDK v0.7.2 transport layer integration with Ktor 3.3.0

**Timeline**: Days 4-7 of Phase 2 (Days 4-8, with Day 8 reserved for QA)

**Deliverables**:
- SDK server initialization component
- Ktor routing integration for SDK
- Session management with request metadata
- Parallel mode (SDK + legacy EventBus during migration)

**Success Criteria**: SDK transport functional, session management working, all tests passing, ready for QA validation

---

## General Context

### Project Foundation

**CycleTime CE**: Project orchestration framework extending Claude Code with MCP server capabilities

**Technology Stack**:
- Kotlin 2.2.20 with JVM 21
- Ktor 3.3.0 (asynchronous web framework)
- MCP Kotlin SDK v0.7.2 (official Anthropic + JetBrains SDK)
- H2 database with Exposed ORM
- Ktor native DI (`ktor-server-di` plugin)

**Architecture**: Domain-Driven Design with layered architecture (domain → application → infrastructure → MCP)

### Architectural Decision Summary (from ADR-001)

**Migration Rationale**:
- Custom EventBus has session correlation bugs (SPI-699)
- Complex MessageCorrelator + EventBus state management
- Manual JSON-RPC protocol maintenance burden
- SDK v0.7.2: 7 versions of stability, production-tested, official support

**Architectural Shift**:
```
BEFORE: Stateful EventBus
┌──────────────┐      ┌──────────────┐
│ SSE Endpoint │ ───→ │  EventBus    │ ───→ Session-based channels
└──────────────┘      │ (Stateful)   │
┌──────────────┐      └──────────────┘
│POST Endpoint │ ───→ │ Correlator   │ ───→ Request/Response tracking
└──────────────┘      └──────────────┘

AFTER: SDK Per-Request Transport
┌──────────────┐
│ SDK Server   │ ───→ Per-request transport (stateless)
└──────────────┘      ↓
                  Session via request.meta["sessionId"]
                      ↓
                  Database persistence
```

**What Changes** (from ADR-001 lines 156-323):
- Transport: EventBus + SSE/POST handlers → SDK Server
- Protocol: Custom JsonRpcProtocolHandler → SDK built-in
- Session: Stateful channels → Request metadata extraction

**What Stays Unchanged** (100% preservation, ADR-001 lines 325-355):
- Domain layer: All entities, value objects, business rules
- Repository layer: All interfaces and implementations
- Application services: SessionApplicationService, etc.
- Tool/resource business logic (only registration adapts)

### SDK v0.7.2 Architecture (from migration plan lines 46-225)

**Core SDK Components**:
```kotlin
// 1. Server
io.modelcontextprotocol.kotlin.sdk.server.Server

// 2. Transport - Ktor integration
io.modelcontextprotocol.kotlin.sdk.server.ktor.mcp

// 3. Capabilities
io.modelcontextprotocol.kotlin.sdk.ServerCapabilities

// 4. Implementation metadata
io.modelcontextprotocol.kotlin.sdk.Implementation

// 5. Tool/Resource APIs
Server.addTool()
Server.addResource()
```

**Key Difference from EventBus**:
- **EventBus**: Stateful session channels, correlation needed
- **SDK**: Stateless per-request, session via metadata

---

## Developer Agent-Specific Context

### Implementation Standards (from development-commands.md)

**Development Commands**:
```bash
# Build and test
./gradlew build          # Full build with tests
./gradlew run            # Start application server
./gradlew test           # Run all tests

# Code quality
./gradlew detekt         # Static analysis
./gradlew koverHtmlReport # Coverage report
```

**Coding Conventions**:
- Package structure: `io.spiralhouse.cycletime.*`
- Kotlin idioms: Data classes, sealed classes, extension functions
- Null safety: Prefer non-null types, use `?` explicitly
- Logging: SLF4J with LoggerFactory

### SDK v0.7.2 Server Initialization Pattern

From migration plan lines 75-100:

```kotlin
import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.modelcontextprotocol.kotlin.sdk.server.ServerOptions
import io.modelcontextprotocol.kotlin.sdk.ServerCapabilities
import io.modelcontextprotocol.kotlin.sdk.Implementation
import kotlinx.serialization.json.*

val server = Server(
    serverInfo = Implementation(
        name = "cycletime-ce",
        version = "1.0.0" // From project version
    ),
    options = ServerOptions(
        capabilities = ServerCapabilities(
            resources = ServerCapabilities.Resources(
                subscribe = true,      // Support resource subscriptions
                listChanged = true     // Notify resource list changes
            ),
            tools = ServerCapabilities.Tools()
        )
    )
) {
    // Server description (optional)
    "CycleTime CE: Project orchestration for Claude Code"
}
```

**Important**: SDK automatically handles:
- SSE transport via `GET /mcp/events`
- JSON-RPC via `POST /mcp`
- Protocol negotiation
- Message validation

### SDK v0.7.2 Ktor Integration Pattern

From migration plan lines 102-125:

```kotlin
import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.modelcontextprotocol.kotlin.sdk.server.ktor.mcp

fun Application.configureMCP() {
    routing {
        route("/mcp") {
            mcp {
                // SDK handles transport automatically
                // No manual SSE/POST setup needed
                server
            }
        }
    }
}
```

**Critical**: SDK Ktor integration is ONE function call. No manual endpoint setup.

### Phase 2 Implementation Breakdown

#### Day 4: SDK Server Setup (from migration plan lines 279-370)

**Goal**: Initialize SDK server with basic configuration

**Step 1: Create SDK Server Component**

```kotlin
// File: src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/MCPSdkServer.kt
package io.spiralhouse.cycletime.mcp.sdk

import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.modelcontextprotocol.kotlin.sdk.server.ServerOptions
import io.modelcontextprotocol.kotlin.sdk.ServerCapabilities
import io.modelcontextprotocol.kotlin.sdk.Implementation
import org.slf4j.LoggerFactory

class MCPSdkServer(
    private val version: String
) {
    private val logger = LoggerFactory.getLogger(MCPSdkServer::class.java)

    val server: Server = Server(
        serverInfo = Implementation(
            name = "cycletime-ce",
            version = version
        ),
        options = ServerOptions(
            capabilities = ServerCapabilities(
                resources = ServerCapabilities.Resources(
                    subscribe = true,
                    listChanged = true
                ),
                tools = ServerCapabilities.Tools()
            )
        )
    ) {
        "CycleTime CE: Project orchestration framework for Claude Code"
    }

    init {
        logger.info("MCP SDK Server initialized (version: $version)")
    }

    suspend fun shutdown() {
        logger.info("MCP SDK Server shutting down")
        // SDK handles cleanup automatically
    }
}
```

**Step 2: Register in DI Container**

```kotlin
// File: src/main/kotlin/io/spiralhouse/cycletime/Application.kt
fun Application.configureDependencies() {
    dependencies {
        val version = System.getProperty("cycletime.version") ?: "unknown"

        // SDK Server (new)
        provide<MCPSdkServer> {
            MCPSdkServer(version)
        }

        // Keep existing dependencies (for now, parallel mode)
        provide<EventBus> { EventBus() }
        provide<MessageCorrelator> { MessageCorrelator(instance()) }
        // ... rest unchanged
    }
}
```

**Validation Checklist**:
- [ ] File created: `MCPSdkServer.kt`
- [ ] DI registration added
- [ ] Build succeeds: `./gradlew build`
- [ ] No compilation errors

#### Day 5: Ktor Integration (from migration plan lines 372-477)

**Goal**: Integrate SDK with Ktor routing

**Step 1: Create SDK Routing Configuration**

```kotlin
// File: src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/MCPSdkRouting.kt
package io.spiralhouse.cycletime.mcp.sdk

import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.plugins.di.*
import io.modelcontextprotocol.kotlin.sdk.server.ktor.mcp
import org.slf4j.LoggerFactory

private val logger = LoggerFactory.getLogger("MCPSdkRouting")

fun Routing.configureMCPSdk() {
    val sdkServer: MCPSdkServer by application.dependencies

    route("/mcp") {
        mcp {
            // SDK handles all transport automatically:
            // - SSE via GET /mcp/events
            // - JSON-RPC via POST /mcp
            // - Protocol negotiation
            // - Session management
            sdkServer.server
        }
    }

    logger.info("MCP SDK routing configured at /mcp")
}
```

**Step 2: Update Main MCP Configuration (Parallel Mode)**

```kotlin
// File: src/main/kotlin/io/spiralhouse/cycletime/mcp/MCPServer.kt
fun Routing.configureMCP() {
    val logger = LoggerFactory.getLogger("MCPRouting")

    // MIGRATION MODE: Run both transports in parallel
    // Old EventBus transport (to be removed in Phase 6)
    route("/mcp-old") {
        val sessionManager: MCPSessionManager by application.dependencies
        val eventBus: EventBus by application.dependencies
        val correlator: MessageCorrelator by application.dependencies
        val methodHandler: McpMethodHandler by application.dependencies

        mcpSSEEndpoint(sessionManager, eventBus)
        mcpPostEndpoint(sessionManager, eventBus, correlator, methodHandler)
    }

    // New SDK transport (primary)
    configureMCPSdk()

    logger.info("MCP routing configured (SDK + legacy)")
}
```

**Validation Checklist**:
- [ ] File created: `MCPSdkRouting.kt`
- [ ] Parallel routing configured (`/mcp` SDK + `/mcp-old` legacy)
- [ ] Server starts: `./gradlew run`
- [ ] Endpoint responds: `curl http://localhost:8080/mcp`

#### Day 6-7: Session Management Migration (from migration plan lines 479-575)

**Goal**: Implement session management with SDK request metadata

**Step 1: Create Session Context Extractor**

```kotlin
// File: src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/SessionContext.kt
package io.spiralhouse.cycletime.mcp.sdk

import io.modelcontextprotocol.kotlin.sdk.CallToolRequest
import io.modelcontextprotocol.kotlin.sdk.ReadResourceRequest
import kotlinx.serialization.json.jsonPrimitive

/**
 * Session context extraction for SDK per-request transport.
 *
 * SDK is stateless per-request. Session ID passed via request.meta["sessionId"].
 * Session state retrieved from database per request.
 */
object SessionContext {
    /**
     * Extracts session ID from SDK request metadata.
     *
     * Session ID is passed via request.meta["sessionId"] by client.
     * Returns null if not present.
     */
    fun extractSessionId(request: CallToolRequest): String? {
        return request.meta?.get("sessionId")?.jsonPrimitive?.content
    }

    fun extractSessionId(request: ReadResourceRequest): String? {
        return request.meta?.get("sessionId")?.jsonPrimitive?.content
    }

    /**
     * Validates and extracts session ID (throws if missing).
     *
     * Use this when session is required for operation.
     */
    fun requireSessionId(request: CallToolRequest): String {
        return extractSessionId(request)
            ?: throw IllegalStateException("No session ID in request context")
    }

    fun requireSessionId(request: ReadResourceRequest): String {
        return extractSessionId(request)
            ?: throw IllegalStateException("No session ID in request context")
    }
}
```

**Step 2: Update Session Management Service**

```kotlin
// File: src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/SDKSessionManager.kt
package io.spiralhouse.cycletime.mcp.sdk

import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.domain.session.Session
import org.slf4j.LoggerFactory

/**
 * Session manager for SDK-based transport.
 *
 * Unlike EventBus (stateful), SDK is stateless per-request.
 * Session state stored in database, retrieved per request.
 */
class SDKSessionManager(
    private val sessionService: SessionApplicationService
) {
    private val logger = LoggerFactory.getLogger(SDKSessionManager::class.java)

    /**
     * Get existing session or create new one.
     *
     * Used for initial session bootstrap when client doesn't have sessionId yet.
     */
    suspend fun getOrCreateSession(sessionId: String): Session {
        return sessionService.getSession(sessionId)
            ?: sessionService.createSession(sessionId).also {
                logger.info("Created new session: $sessionId")
            }
    }

    /**
     * Validate that session exists in database.
     *
     * Throws if session not found (invalid session ID).
     */
    suspend fun validateSession(sessionId: String): Session {
        return sessionService.getSession(sessionId)
            ?: throw IllegalStateException("Invalid session: $sessionId")
    }
}
```

**Step 3: Register in DI**

```kotlin
// File: src/main/kotlin/io/spiralhouse/cycletime/Application.kt
fun Application.configureDependencies() {
    dependencies {
        // ... existing dependencies

        // SDK Session Manager (new)
        provide<SDKSessionManager> {
            SDKSessionManager(instance()) // SessionApplicationService injected
        }

        // SDK Server (updated to use session manager)
        provide<MCPSdkServer> {
            val version = System.getProperty("cycletime.version") ?: "unknown"
            MCPSdkServer(version)
        }
    }
}
```

**Validation Checklist**:
- [ ] Files created: `SessionContext.kt`, `SDKSessionManager.kt`
- [ ] DI registration updated
- [ ] Session extraction works (test with metadata)
- [ ] Session validation works (test with database)

### Complete Integration Example

From migration plan lines 2073-2151:

```kotlin
// File: src/main/kotlin/io/spiralhouse/cycletime/Application.kt
package io.spiralhouse.cycletime

import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.cio.*
import io.ktor.server.routing.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.mcp.sdk.configureMCPSdk
import io.spiralhouse.cycletime.infrastructure.di.configureDependencies

fun main() {
    embeddedServer(CIO, port = 8080, host = "0.0.0.0") {
        configureDependencies()
        configureRouting()
    }.start(wait = true)
}

fun Application.configureRouting() {
    routing {
        // MCP SDK routing
        route("/mcp") {
            configureMCPSdk()
        }

        // Health check
        get("/health") {
            call.respond(HttpStatusCode.OK, mapOf("status" to "healthy"))
        }
    }
}

fun Application.configureDependencies() {
    dependencies {
        // Application services (unchanged)
        provide<SessionApplicationService> {
            SessionApplicationService(instance(), instance())
        }

        // SDK Session Manager (new)
        provide<SDKSessionManager> {
            SDKSessionManager(instance())
        }

        // SDK Server (new)
        provide<MCPSdkServer> {
            val version = System.getProperty("cycletime.version") ?: "1.0.0"
            MCPSdkServer(version)
        }
    }
}
```

### DI Integration Pattern (from migration plan lines 2153-2176)

**Layered DI Structure**:

```kotlin
dependencies {
    // Layer 1: Core services (unchanged)
    provide<SessionRepository> { ExposedSessionRepository(instance()) }
    provide<SessionApplicationService> { SessionApplicationService(instance(), instance()) }

    // Layer 2: Tool/Resource providers (unchanged business logic)
    provide<DefaultSessionToolProvider> { DefaultSessionToolProvider(instance()) }

    // Layer 3: SDK adapters (new, added in Phase 3)
    provide<SDKSessionManager> { SDKSessionManager(instance()) }

    // Layer 4: SDK server (new)
    provide<MCPSdkServer> {
        MCPSdkServer(/* ... */).apply {
            runBlocking { initialize() }
        }
    }
}
```

### Lifecycle Management (from migration plan lines 2178-2198)

```kotlin
// Application lifecycle hooks for SDK server
fun Application.lifecycle() {
    environment.monitor.subscribe(ApplicationStarted) {
        val sdkServer: MCPSdkServer by dependencies
        runBlocking {
            sdkServer.initialize() // If initialization needed
        }
        logger.info("MCP SDK Server started")
    }

    environment.monitor.subscribe(ApplicationStopping) {
        val sdkServer: MCPSdkServer by dependencies
        runBlocking {
            sdkServer.shutdown()
        }
        logger.info("MCP SDK Server stopped")
    }
}
```

---

## Implementation Guidance

### Critical Files to Create/Modify

**New Files** (Phase 2):
- `src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/MCPSdkServer.kt`
- `src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/MCPSdkRouting.kt`
- `src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/SessionContext.kt`
- `src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/SDKSessionManager.kt`

**Modified Files** (Phase 2):
- `src/main/kotlin/io/spiralhouse/cycletime/Application.kt` (DI configuration)
- `src/main/kotlin/io/spiralhouse/cycletime/mcp/MCPServer.kt` (parallel routing)

**Files to Keep Unchanged** (Phase 2):
- All domain layer files
- All repository layer files
- All application service files
- All tool/resource provider business logic

### Domain-Driven Design Preservation

From ADR-001 lines 325-355:

**100% Preserved Components**:
- Domain entities: `Project`, `Issue`, `Workflow`, `Session`
- Domain value objects and business rules
- Domain services and use cases
- Repository interfaces
- Application services
- Tool/resource provider business logic

**Only Infrastructure Changes**:
- Transport layer (EventBus → SDK)
- Protocol handling (custom → SDK built-in)
- Registration API (manual → SDK registration)

**Philosophy**: Business logic untouched, infrastructure adapts.

### Ktor Native DI Best Practices

**Constructor Injection**:
```kotlin
class SDKSessionManager(
    private val sessionService: SessionApplicationService // Injected
)
```

**Property Delegation in Routes**:
```kotlin
fun Routing.configureMCPSdk() {
    val sdkServer: MCPSdkServer by application.dependencies
    // Use sdkServer
}
```

**Lazy Initialization**:
```kotlin
provide<MCPSdkServer> {
    MCPSdkServer(/* ... */).apply {
        runBlocking { initialize() }
    }
}
```

---

## Success Criteria

### Phase 2 Go/No-Go Gates (from migration plan lines 624-633)

**Implementation Gates**:
- [ ] SDK server initializes successfully
- [ ] Ktor integration working (`/mcp` endpoint responds)
- [ ] Session management implemented (extract from metadata)
- [ ] Parallel mode works (SDK + legacy EventBus)
- [ ] All tests passing (820/820 maintained)
- [ ] Build succeeds: `./gradlew build`
- [ ] Server starts: `./gradlew run`
- [ ] Code review approved

**Quality Gates**:
- [ ] No compilation errors
- [ ] Detekt passes: `./gradlew detekt`
- [ ] Dependency check clean: `./gradlew dependencyCheckAnalyze`
- [ ] Logging appropriate (info level for key events)

### Rollback Procedure (from migration plan lines 635-642)

**If Phase 2 fails**:
1. Keep SDK code (disabled)
2. Revert to EventBus transport only (remove `/mcp` routing)
3. Remove SDK DI registration
4. Document failures for analysis
5. Re-plan based on issues encountered

---

## Risks & Mitigation

### Risk: Session Management Paradigm Shift (from ADR-001 lines 469-477)

**Impact**: High
**Likelihood**: Low (solution identified)

**Mitigation**:
- Prototype session context extraction early (Day 6)
- Use request metadata for session (SDK pattern)
- Maintain session repository for persistence (unchanged)
- Test session lifecycle thoroughly (QA Phase)

**Implementation Notes**:
- EventBus: Stateful channels keyed by session ID
- SDK: Stateless per-request, session ID in metadata
- Solution: Extract from request, fetch from database per request

### Risk: Performance Unknown (from ADR-001 lines 447-455)

**Impact**: Low
**Likelihood**: Low

**Mitigation**:
- Establish baseline in QA testing (Day 8)
- SDK is lightweight (no heavy state management)
- Stateless per-request simpler than EventBus correlation

### Risk: API Changes (from ADR-001 lines 436-444)

**Impact**: Medium
**Likelihood**: Medium (pre-1.0)

**Mitigation**:
- Pin SDK version in build.gradle.kts: `implementation("io.modelcontextprotocol:kotlin-sdk:0.7.2")`
- Adapter pattern isolates SDK (Phase 3)
- Comprehensive tests catch API breaks

---

## References

### Source Documents
- **ADR-001**: `/docs/architecture/decisions/ADR-001-adopt-mcp-kotlin-sdk-v0.7.2.md`
  - Lines 156-323: What changes vs what stays unchanged
  - Lines 325-355: Preserved components (domain, application, repositories)
  - Lines 423-490: Risk assessment and mitigation
- **Migration Plan**: `/docs/architecture/mcp-sdk-v0.7.2-migration-plan.md`
  - Lines 75-225: SDK v0.7.2 architecture and patterns
  - Lines 266-643: Phase 2 complete implementation (Days 4-8)
  - Lines 279-370: Day 4 SDK server setup
  - Lines 372-477: Day 5 Ktor integration
  - Lines 479-575: Day 6-7 session management
  - Lines 2073-2198: Complete integration examples

### SDK Documentation
- **Repository**: https://github.com/modelcontextprotocol/kotlin-sdk
- **Documentation**: https://modelcontextprotocol.github.io/kotlin-sdk/
- **Release Notes**: https://github.com/modelcontextprotocol/kotlin-sdk/releases/tag/v0.7.2

### Project Standards
- **Development Commands**: `.claude/shared/development-commands.md`
- **Testing Standards**: `.claude/shared/testing-standards.md`
- **Architecture Overview**: `docs/architecture/overview.md`

---

## Escalation Procedures

**If blocked on implementation**: Document specific issue, error messages, attempted solutions

**If SDK APIs unclear**: Consult SDK documentation, examine SDK examples

**If tests fail**: Coordinate with QA Agent for test debugging

**If performance concerns**: Document measurements, escalate to Code Reviewer

---

**Context Package Status**: ✅ READY FOR DELEGATION
**Last Updated**: 2025-10-12
**Owner**: Context Engineer
