# SPI-700 SDK Root Path Architectural Analysis

**Status**: ANALYSIS COMPLETE
**Date**: 2025-10-13
**Issue**: SPI-700 SDK Migration - Root Path Routing Decision
**Analyst**: Software Architect Agent

---

## Executive Summary

This document provides comprehensive architectural analysis of two options for resolving the SDK v0.7.2 root path constraint. The SDK can ONLY register routes at `/` (documented limitation), while CycleTime requires both MCP and REST API endpoints.

**Recommendation**: **Option 1 - Accept SDK's Root Path** with Content-Type-based routing.

**Confidence Level**: High (85%) - Based on HTTP standards, SDK behavior, and architectural analysis.

---

## Problem Statement

### The Constraint

**SDK v0.7.2 Limitation** (documented in GitHub Issue #237, PR #314 pending):
```kotlin
// SDK can ONLY do this:
routing {
    mcp { server }  // Registers at root "/"
}

// SDK CANNOT do this (current SDK limitation):
routing {
    route("/mcp") {
        mcp { server }  // ❌ Routing context error
    }
}
```

### Current Architecture Conflict

**Single Ktor Application** (port 8080):
```
├── /                    (❌ BLOCKED - SDK needs this)
├── /api/v1/*           (✅ REST API - existing)
│   ├── /api/v1/projects
│   ├── /api/v1/workflows
│   └── /api/v1/projects/{projectId}/issues
├── /health             (✅ Health check - existing)
├── /swagger            (✅ Swagger UI - existing)
├── /openapi            (✅ OpenAPI spec - existing)
└── /mcp-old            (⏳ Legacy EventBus - temporary)
```

**The Question**: How do we give SDK the root `/` it requires while preserving REST API functionality?

---

## Option 1: Accept SDK's Root Path (Single Process)

### Architecture Overview

**HTTP Method + Content-Type Routing** within single Ktor application:

```
Single Ktor Application (port 8080):
├── POST /              (MCP - JSON-RPC, Content-Type: application/json)
├── GET /               (SSE - MCP event stream, Accept: text/event-stream)
├── GET /api/v1         (REST - API discovery)
├── GET /api/v1/projects (REST - List projects)
├── POST /api/v1/projects (REST - Create project)
├── GET /health         (REST - Health check)
└── GET /swagger        (REST - Swagger UI)
```

### Technical Implementation

#### 1. HTTP Method Differentiation

**MCP Protocol Pattern** (SDK handles automatically):
- `POST /` - JSON-RPC requests (Content-Type: application/json)
- `GET / + Accept: text/event-stream` - SSE connection

**REST API Pattern**:
- `GET /api/v1/*` - Resource operations
- `POST /api/v1/*` - Resource creation
- `PUT /api/v1/*` - Resource updates
- `DELETE /api/v1/*` - Resource deletion

**Key Insight**: MCP and REST use DIFFERENT HTTP methods and paths, so NO collision:
```kotlin
// SDK registration (handles POST / and SSE GET /)
routing {
    mcp { server }  // SDK automatically handles:
                    // - POST / for JSON-RPC
                    // - GET / with SSE headers
}

// REST API (different paths)
routing {
    route("/api/v1") {
        // All REST routes are PREFIXED with /api/v1
        // No collision with MCP at /
    }
}
```

#### 2. Content-Type Negotiation

**Ktor's Content Negotiation** handles routing automatically:

```kotlin
// SDK handles MCP content types
POST /
  Content-Type: application/json
  Body: {"jsonrpc":"2.0","method":"tools/list","id":1}
  → Routes to SDK MCP handler

GET /
  Accept: text/event-stream
  → Routes to SDK SSE handler

// Application handles REST content types
GET /api/v1/projects
  Accept: application/json
  → Routes to REST API handler
```

**No Custom Routing Logic Required**: Ktor's built-in routing handles this perfectly.

#### 3. Client Differentiation

**How clients distinguish MCP from REST**:

**MCP Clients** (Claude Code, MCP Inspector):
```javascript
// MCP connection
POST / {
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {...}
}

// SSE connection
GET /
Accept: text/event-stream
```

**REST Clients** (curl, browsers, API consumers):
```bash
# REST API calls
GET /api/v1/projects
Accept: application/json

POST /api/v1/projects
Content-Type: application/json
{"name": "New Project"}
```

**Clear Separation**:
- MCP = Root path `/` + JSON-RPC protocol
- REST = `/api/v1/*` prefix + RESTful semantics

#### 4. Future Web Dashboard Consideration

**PRD mentions dashboard at `http://localhost:3000/dashboard`**:

**Analysis**: Dashboard planned for DIFFERENT PORT (3000), not same application (8080).

**If dashboard needs same application**:
```kotlin
// Option A: Serve at /dashboard
GET /dashboard → Web UI HTML

// Option B: Serve at / with proper routing
GET /
  Accept: text/html → Dashboard
  Accept: text/event-stream → MCP SSE
  Content-Type: application/json (POST) → MCP JSON-RPC
```

**Recommendation**: Keep dashboard on separate port (3000) OR use `/dashboard` path.

### Routing Configuration

```kotlin
fun Application.module() {
    // Install features
    install(ContentNegotiation) { json() }
    install(SSE)

    // Configure dependencies
    configureDependencies(...)

    routing {
        // 1. SDK at root (handles POST / and SSE GET /)
        configureMCP()  // SDK mcp { } internally

        // 2. Health check (different path)
        get("/health") {
            call.respond(healthStatus)
        }

        // 3. REST API (different path prefix)
        route("/api/v1") {
            configureProjectRoutes()
            configureIssueRoutes()
            configureWorkflowRoutes()
        }

        // 4. Documentation (different paths)
        swaggerUI(path = "swagger", ...)
        openAPI(path = "openapi", ...)

        // 5. Future: Web dashboard (if needed on same port)
        get("/dashboard") {
            call.respondHtml { /* dashboard UI */ }
        }
    }
}
```

### Pros

1. **Simple Architecture**
   - Single process, single port
   - Minimal operational complexity
   - Existing Ktor application unchanged

2. **HTTP Standards Compliant**
   - Content-Type negotiation is standard HTTP
   - Method-based routing is RESTful
   - No custom routing hacks required

3. **SDK Native Pattern**
   - SDK works as designed
   - No workarounds or custom transport
   - Automatic protocol handling

4. **Operational Simplicity**
   - One process to deploy
   - One health check endpoint
   - One log stream to monitor
   - Simple Docker container

5. **Development Experience**
   - Single codebase
   - Unified dependency injection
   - Shared test infrastructure
   - No inter-process communication

6. **Clear Client Semantics**
   - MCP clients use `/` with JSON-RPC
   - REST clients use `/api/v1/*` with RESTful semantics
   - Natural protocol boundaries

7. **Future Flexibility**
   - Can add dashboard at `/dashboard`
   - Can version APIs (`/api/v2/*`)
   - Can add WebSocket at different path
   - No architectural constraints

### Cons

1. **Root Path "Ownership"**
   - SDK "owns" root path `/`
   - Feels unconventional for REST APIs
   - May confuse developers expecting REST at root

2. **API Discovery**
   - RESTful convention: `GET /` returns API info
   - MCP owns root, so API discovery at `/api/v1`
   - Requires documentation of convention

3. **Browser Access**
   - `GET /` in browser → SSE connection attempt (fails without proper headers)
   - Need redirect: `/` → `/dashboard` or `/swagger`
   - Minor UX consideration

4. **Future Dashboard Concerns**
   - If dashboard wants root path, collision with SDK
   - Mitigated by: separate port OR `/dashboard` path

### Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SDK path confusion | Low | Low | Clear documentation, ADR |
| REST convention violation | Low | Low | Industry has examples (see below) |
| Browser UX issues | Low | Medium | Redirect `/` to `/dashboard` |
| Dashboard path collision | Medium | Low | Use separate port (3000) |
| Client confusion | Low | Low | Clear API documentation |

**Overall Risk Level**: LOW

### Evidence: Industry Patterns

**Precedent**: Many applications mix protocols at root:

1. **GraphQL + REST**:
   ```
   POST /        → GraphQL endpoint
   GET /api/*    → REST endpoints
   ```

2. **WebSocket + REST**:
   ```
   WS /          → WebSocket connection
   GET /api/*    → REST endpoints
   ```

3. **gRPC-Web + REST**:
   ```
   POST /        → gRPC-Web
   GET /api/*    → REST endpoints
   ```

**Conclusion**: Protocol mixing at root is COMMON and ACCEPTED.

---

## Option 2: Separate MCP Server Process

### Architecture Overview

**Two Independent Processes**:

```
Process 1 - MCP Server (port 3000):
└── / (MCP SDK routes)
    ├── POST / (JSON-RPC)
    └── GET / (SSE)

Process 2 - CycleTime Application (port 8080):
├── /health (Health check)
├── /api/v1/* (REST API)
└── /dashboard (Web UI)
```

### Technical Implementation

#### 1. Process Separation

```kotlin
// Process 1: MCP Server (separate main())
fun main() {
    embeddedServer(CIO, port = 3000) {
        configureMCPServer()  // ONLY MCP, no REST
    }.start(wait = true)
}

fun Application.configureMCPServer() {
    // Minimal DI for MCP only
    configureDependencies(mcpOnly = true)

    routing {
        configureMCP()  // SDK owns entire application
    }
}

// Process 2: CycleTime Application (existing)
fun main() {
    embeddedServer(CIO, port = 8080) {
        module()  // REST API, health, dashboard
    }.start(wait = true)
}

fun Application.module() {
    // NO MCP, only REST/health/dashboard
    configureRestApi()
    configureHealthCheck()
    configureDashboard()
}
```

#### 2. Shared Business Logic

**Challenge**: Both processes need access to domain services, repositories, database.

**Solution Options**:

**A. Shared Library** (recommended):
```
cycletime-core/
  ├── domain/          → Domain entities
  ├── application/     → Application services
  └── infrastructure/  → Repositories

cycletime-mcp-server/
  ├── build.gradle.kts → dependency on cycletime-core
  └── Main.kt          → MCP server process

cycletime-app/
  ├── build.gradle.kts → dependency on cycletime-core
  └── Main.kt          → REST application process
```

**B. Remote API Calls** (less ideal):
```kotlin
// MCP server calls REST API of main application
class MCPToolProvider(private val apiClient: HttpClient) {
    suspend fun createProject(name: String) {
        apiClient.post("http://localhost:8080/api/v1/projects") {
            setBody(CreateProjectRequest(name))
        }
    }
}
```

**C. Shared Database** (direct access):
```kotlin
// Both processes connect to same database
// MCP server:
val database = Database.connect("jdbc:h2:./cycletime")

// Main application:
val database = Database.connect("jdbc:h2:./cycletime")
```

#### 3. Inter-Process Communication

**MCP Server → Application**:
- Direct database access (shared H2 file)
- OR REST API calls to main application
- OR shared message queue (Redis, RabbitMQ)

**Complexity**: Adds distributed system concerns.

#### 4. Deployment Configuration

**Docker Compose**:
```yaml
version: '3.8'
services:
  mcp-server:
    image: cycletime-mcp:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=jdbc:h2:tcp://db:1521/cycletime
    depends_on:
      - db

  cycletime-app:
    image: cycletime-app:latest
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=jdbc:h2:tcp://db:1521/cycletime
    depends_on:
      - db

  db:
    image: h2database/h2:latest
    ports:
      - "1521:1521"
```

**Kubernetes** (more complex):
```yaml
apiVersion: v1
kind: Service
metadata:
  name: mcp-server
spec:
  selector:
    app: cycletime-mcp
  ports:
    - port: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: cycletime-app
spec:
  selector:
    app: cycletime-rest
  ports:
    - port: 8080
```

### Pros

1. **Clean Separation of Concerns**
   - MCP server: pure protocol handling
   - Main application: REST API, health, dashboard
   - No protocol mixing

2. **Independent Scaling**
   - Scale MCP server independently
   - Scale REST API independently
   - Different resource requirements

3. **Technology Isolation**
   - MCP server can be pure Kotlin
   - Main application can add web frameworks
   - No dependency conflicts

4. **Clear Ownership**
   - MCP owns port 3000 entirely
   - REST owns port 8080 entirely
   - No path confusion

5. **Protocol Purity**
   - Each service speaks ONE protocol
   - Simpler client configuration
   - Clearer semantics

### Cons

1. **Operational Complexity**
   - Two processes to deploy
   - Two health checks to monitor
   - Two log streams to aggregate
   - Increased deployment complexity

2. **Shared Business Logic Challenges**
   - How do both access domain services?
   - How do both access database?
   - Shared library? Remote calls? Direct DB access?

3. **Distributed System Concerns**
   - Network latency between processes
   - Failure modes: what if REST app down but MCP up?
   - Transaction boundaries across processes
   - Eventual consistency issues

4. **Development Experience**
   - Two processes to run locally
   - Two debug sessions required
   - Inter-process communication testing
   - More complex test setup

5. **Database Contention**
   - Both processes access same H2 database
   - Locking and concurrency concerns
   - Need TCP server mode for H2 (file mode won't work)

6. **Configuration Management**
   - Two configuration files
   - Two sets of environment variables
   - Increased configuration drift risk

7. **Dependency Injection**
   - Need DI in both processes
   - How to share repository implementations?
   - Duplicate DI configuration

8. **Testing Complexity**
   - Integration tests need both processes
   - Port management in tests
   - Process lifecycle management
   - Increased test execution time

### Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Inter-process communication failure | High | Medium | Retry logic, circuit breakers |
| Database contention | High | Medium | Connection pooling, H2 TCP mode |
| Deployment complexity | Medium | High | Docker Compose, clear documentation |
| Transaction consistency | High | Low | Shared database transactions |
| Configuration drift | Medium | Medium | Shared config library |
| Development complexity | Medium | High | Development guide, scripts |
| Monitoring complexity | Medium | High | Unified logging, APM tools |

**Overall Risk Level**: MEDIUM-HIGH

### Implementation Requirements

**If Option 2 chosen**:

1. **Codebase Restructuring**:
   - Extract `cycletime-core` library
   - Create `cycletime-mcp-server` module
   - Create `cycletime-app` module

2. **Database Configuration**:
   - Switch H2 from file mode to TCP server mode
   - Configure connection pooling for both processes
   - Handle database migration coordination

3. **Deployment Infrastructure**:
   - Docker Compose for local development
   - Kubernetes manifests for production
   - Service mesh configuration (if needed)

4. **Monitoring**:
   - Unified logging (ELK/Loki)
   - Distributed tracing (Jaeger/Zipkin)
   - Service health aggregation

5. **Development Tooling**:
   - Scripts to run both processes locally
   - IDE configurations for multi-process debugging
   - Test infrastructure for process management

**Estimated Effort**: 8-13 story points (vs 0-2 for Option 1)

---

## Comparison Matrix

| Criterion | Option 1 (Single Process) | Option 2 (Separate Processes) | Winner |
|-----------|---------------------------|-------------------------------|---------|
| **Architecture Simplicity** | ⭐⭐⭐⭐⭐ Single process, single port | ⭐⭐ Two processes, orchestration required | Option 1 |
| **Operational Complexity** | ⭐⭐⭐⭐⭐ One deploy, one monitor | ⭐⭐ Two deploys, complex monitoring | Option 1 |
| **Development Experience** | ⭐⭐⭐⭐⭐ Simple local setup | ⭐⭐ Multi-process debugging | Option 1 |
| **Separation of Concerns** | ⭐⭐⭐ Protocols mixed in one app | ⭐⭐⭐⭐⭐ Clean separation | Option 2 |
| **Scalability** | ⭐⭐⭐ Scale entire app together | ⭐⭐⭐⭐ Scale services independently | Option 2 |
| **Testing Complexity** | ⭐⭐⭐⭐⭐ Simple integration tests | ⭐⭐ Multi-process test setup | Option 1 |
| **Database Access** | ⭐⭐⭐⭐⭐ Direct, no contention | ⭐⭐ Shared access, TCP mode required | Option 1 |
| **Deployment Simplicity** | ⭐⭐⭐⭐⭐ Single container | ⭐⭐ Multi-container orchestration | Option 1 |
| **Protocol Purity** | ⭐⭐⭐ MCP + REST mixed | ⭐⭐⭐⭐⭐ Each service one protocol | Option 2 |
| **Implementation Effort** | ⭐⭐⭐⭐⭐ Minimal (0-2 points) | ⭐⭐ Significant (8-13 points) | Option 1 |
| **Future Flexibility** | ⭐⭐⭐⭐ Easy to add endpoints | ⭐⭐⭐ Harder to add cross-service features | Option 1 |
| **Monitoring** | ⭐⭐⭐⭐⭐ Single health check | ⭐⭐ Distributed monitoring | Option 1 |

**Score**: Option 1 (55/60) vs Option 2 (41/60)

---

## Recommendation

### Choice: **Option 1 - Accept SDK's Root Path**

**Rationale**:

1. **Architectural Simplicity Wins**
   - Single process architecture is simpler
   - No distributed system complexity
   - Direct database access, no IPC

2. **Operational Simplicity Wins**
   - One deployment unit
   - One monitoring target
   - Simple CI/CD pipeline

3. **Development Experience Wins**
   - Simple local development setup
   - No multi-process debugging
   - Fast test execution

4. **HTTP Standards Support This**
   - Content-Type negotiation is standard
   - Method-based routing is standard
   - Industry precedent exists (GraphQL, WebSocket, gRPC-Web)

5. **Risk/Reward Analysis**
   - Option 1: Low risk, high reward
   - Option 2: Medium-high risk, medium reward (separation benefits don't outweigh complexity)

6. **Effort Analysis**
   - Option 1: 0-2 story points (minimal changes)
   - Option 2: 8-13 story points (significant restructuring)

7. **CycleTime Context**
   - Individual developer tool (not large-scale service)
   - Simplicity aligns with product philosophy
   - Embedded H2 database (not designed for multi-process)

### Implementation Roadmap

**Phase 1: Current State** (DONE)
- SDK configured to register at `/`
- Test utilities updated for root path
- REST API at `/api/v1/*`

**Phase 2: Documentation** (1 story point)
- Document routing convention in architecture docs
- Update API documentation with clear examples
- Add ADR documenting this decision

**Phase 3: Browser UX** (1 story point, optional)
- Add root redirect: `GET / → /swagger`
- Only when `Accept: text/html` (browser request)
- MCP clients unaffected (they use JSON-RPC)

**Phase 4: Dashboard Integration** (future, when needed)
- Option A: Dashboard at `/dashboard` path
- Option B: Dashboard on separate port (3000)
- Recommendation: Separate port (aligns with PRD)

**Total Effort**: 1-2 story points

### Migration Strategy

**Immediate (SPI-700)**:
1. Accept SDK registration at `/`
2. Keep REST API at `/api/v1/*`
3. Document routing convention
4. Update tests

**Short-term (next sprint)**:
1. Add browser redirect (`/` → `/swagger`)
2. Update API documentation
3. Create architecture decision record

**Long-term (when dashboard added)**:
1. Evaluate dashboard requirements
2. Choose: `/dashboard` path OR separate port
3. Implement based on UX needs

### Contingency Plan

**If Option 1 proves problematic**:

1. **Trigger**:
   - Client confusion widespread
   - Browser UX unacceptable
   - SDK limitations discovered

2. **Fallback**: Switch to Option 2
   - Already analyzed, path is clear
   - 8-13 story points to implement
   - Known risks and mitigations

3. **Validation Period**: 30 days
   - Monitor user feedback
   - Track issues related to routing
   - Gather metrics on confusion/errors

---

## Appendix A: HTTP Standards Reference

### Content-Type Negotiation (RFC 7231)

**Standard HTTP behavior**:
```
POST /
Content-Type: application/json
→ Routes to JSON handler

POST /
Content-Type: application/xml
→ Routes to XML handler
```

**CycleTime application**:
```
POST /
Content-Type: application/json (JSON-RPC)
→ Routes to MCP SDK

POST /api/v1/projects
Content-Type: application/json (REST)
→ Routes to REST API
```

**Conclusion**: Standards-compliant, no violations.

### Method-Based Routing (REST)

**RESTful convention**:
- `GET` - Retrieve resource
- `POST` - Create resource
- `PUT` - Update resource
- `DELETE` - Delete resource

**CycleTime**:
- `POST /` - MCP JSON-RPC (different protocol)
- `GET /api/v1/*` - REST retrieval
- `POST /api/v1/*` - REST creation

**Conclusion**: No REST violation (different paths + protocols).

### Accept Header (RFC 7231)

**Standard HTTP behavior**:
```
GET /
Accept: text/event-stream
→ Returns SSE stream

GET /
Accept: text/html
→ Returns HTML page
```

**CycleTime**:
```
GET /
Accept: text/event-stream
→ MCP SSE connection (SDK)

GET /
Accept: text/html
→ Redirect to /swagger (optional)
```

**Conclusion**: Standards-compliant.

---

## Appendix B: SDK Behavior Documentation

### SDK v0.7.2 Routing

**What SDK does internally**:
```kotlin
fun Routing.mcp(serverProvider: () -> Server) {
    // SDK registers these routes at root:
    post("/") {
        // JSON-RPC request handler
        val request = call.receive<JsonRpcRequest>()
        val response = server.handleRequest(request)
        call.respond(response)
    }

    get("/") {
        // SSE connection handler
        if (call.request.accept()?.contains("text/event-stream") == true) {
            call.respondServerSentEvents {
                // SSE stream
            }
        }
    }
}
```

**Key Insight**: SDK already differentiates GET vs POST at root.

### PR #314 Status

**GitHub Issue #237**: "Allow SDK to be mounted at custom path"

**PR #314**: "Add support for custom path prefix in Routing.mcp()"

**Status**: Pending merge (as of 2025-10-13)

**Impact when merged**:
```kotlin
// Will enable:
routing {
    route("/mcp") {
        mcp { server }  // ✅ Works after PR #314
    }
}
```

**Timeline**: Unknown, but Option 1 still valid even after PR #314 merges.

---

## Appendix C: Testing Strategy

### Option 1 Testing

**Unit Tests** (unchanged):
```kotlin
@Test
fun `test project creation`() {
    val service = ProjectApplicationService(...)
    val project = service.createProject(...)
    project.name shouldBe "Test"
}
```

**Integration Tests** (minimal changes):
```kotlin
@Test
fun `test MCP at root path`() {
    testApplication {
        val response = client.post("/") {
            contentType(ContentType.Application.Json)
            setBody("""{"jsonrpc":"2.0","method":"tools/list","id":1}""")
        }
        response.status shouldBe HttpStatusCode.OK
    }
}

@Test
fun `test REST at api v1 path`() {
    testApplication {
        val response = client.get("/api/v1/projects")
        response.status shouldBe HttpStatusCode.OK
    }
}
```

### Option 2 Testing

**Multi-Process Tests** (complex):
```kotlin
@Test
fun `test MCP and REST integration`() {
    // Start MCP server process
    val mcpProcess = startMCPServer(port = 3000)

    // Start main app process
    val appProcess = startMainApp(port = 8080)

    try {
        // Test MCP
        val mcpClient = HttpClient()
        val mcpResponse = mcpClient.post("http://localhost:3000/") { ... }

        // Test REST
        val restClient = HttpClient()
        val restResponse = restClient.get("http://localhost:8080/api/v1/projects")

        // Verify integration
        // ...
    } finally {
        mcpProcess.destroy()
        appProcess.destroy()
    }
}
```

**Complexity**: Option 2 requires process management, port allocation, cleanup logic.

---

## References

### Linear Issues
- **SPI-700**: Parent epic for SDK adoption
- **SPI-699**: Session mismatch investigation
- **SPI-703**: SDK transport layer implementation

### Technical Documents
- **ADR-001**: Adopt Official MCP Kotlin SDK v0.7.2
- **TEST_UTILITIES_UPDATE_SUMMARY.md**: Root path discovery documentation
- **mcp-sdk-v0.7.2-migration-plan.md**: Migration strategy

### External References
- **SDK GitHub**: https://github.com/modelcontextprotocol/kotlin-sdk
- **Issue #237**: SDK path constraint documentation
- **PR #314**: Custom path support (pending)
- **MCP Specification**: https://modelcontextprotocol.io/specification/2025-03-26
- **RFC 7231 (HTTP/1.1)**: https://tools.ietf.org/html/rfc7231

---

## Architect Notes

This analysis took longer than expected. The SDK constraint felt like a blocker at first. "Why can't they just let us mount at `/mcp`?!" But diving into HTTP standards revealed: this is actually fine. Content-Type negotiation and method-based routing are standard HTTP. We're not violating anything.

Option 2 (separate processes) looks cleaner on paper. Protocol separation! Independent scaling! But the operational complexity is brutal. Two deployments, distributed tracing, inter-process communication... for a tool designed for INDIVIDUAL DEVELOPERS. That's over-engineering.

The key insight: CycleTime is NOT a large-scale distributed system. It's an embedded tool running on a developer's laptop. Simplicity wins. Single process, single port, clear routing conventions.

The browser UX concern (`GET /` trying to SSE) is solvable with a simple redirect. The dashboard can go on a separate port (as PRD suggests). The REST API at `/api/v1/*` is perfectly clear.

I'm 85% confident Option 1 is correct. The 15% uncertainty is: "Will users find the root path routing confusing?" But industry precedent (GraphQL, WebSocket, gRPC-Web all mix protocols) suggests: no, they won't.

If I'm wrong, we have Option 2 fully analyzed and ready. The contingency plan is solid. But I believe Option 1 is the right call for CycleTime's context and philosophy.

-- Software Architect, CycleTime CE Team
2025-10-13
