# ADR-001: Adopt Official MCP Kotlin SDK v0.7.2 for Transport Layer

## Status

ACCEPTED

## Date

2025-10-12

## Context

### Current Architecture Problem

CycleTime CE currently implements a custom MCP transport layer using an EventBus-based architecture. This implementation has revealed several critical challenges:

1. **Session Correlation Issues** (SPI-699)
   - EventBus uses `ConcurrentHashMap<String, Channel<SSEEvent>>` for session-based correlation
   - Session mismatch bugs occur when SSE and POST endpoints have different session contexts
   - Complex session bootstrap patterns required to handle initialization edge cases
   - MessageCorrelator adds another layer of complexity to track request/response pairs

2. **Protocol Maintenance Burden**
   - Custom JSON-RPC 2.0 implementation (`JsonRpcProtocolHandler`)
   - Manual protocol message validation and error handling
   - Need to track MCP specification changes manually
   - Custom error code mapping and exception handling

3. **Future-Proofing Concerns**
   - MCP specification is evolving (current spec: 2024-11-05)
   - Custom implementation will lag behind spec updates
   - Risk of incompatibility with Claude Code and other MCP clients
   - Difficult to adopt new MCP features (prompts, sampling, etc.)

4. **Transport Complexity**
   - Split between SSE (`MCPSSEHandler`) and POST (`MCPPostHandler`) endpoints
   - EventBus manages state across both transports
   - Security validation scattered across multiple components
   - Difficult to test transport layer in isolation

5. **Architectural Misalignment**
   - Current: Session-based stateful EventBus
   - MCP Pattern: Per-request stateless transport (official recommendation)
   - Our custom approach doesn't align with SDK patterns
   - Makes migration to standard clients/servers difficult

### Alternative Solutions Considered

#### 1. Fix Custom Transport (REJECTED)
**Pros:**
- No migration effort required
- Team familiar with existing code
- Complete control over implementation

**Cons:**
- Doesn't solve fundamental architectural issues
- Will require ongoing maintenance for spec changes
- Session correlation complexity remains
- Future-proofing issues persist
- HIGH ongoing maintenance burden

**Verdict:** Rejected - doesn't address root causes

#### 2. Adopt SDK v0.1.0 (SUPERSEDED)
**Pros:**
- Early adoption of official SDK
- Simple migration path

**Cons:**
- v0.1.0 is alpha quality
- Missing 7 versions of improvements
- Potential API instability
- Less documentation and examples

**Verdict:** Superseded by v0.7.2 availability

#### 3. Adopt SDK v0.7.2 (CHOSEN)
**Pros:**
- 7 versions of stability improvements over v0.1.0
- Official recommendation from Anthropic
- Co-maintained by Anthropic + JetBrains
- Production-tested by SDK maintainers
- Automatic protocol evolution tracking
- Comprehensive documentation and examples
- Community support and issue resolution
- Reduced maintenance burden significantly
- Per-request transport solves session issues
- Compatible with Ktor 3.3.0 (our current version)

**Cons:**
- Migration effort: ~22 story points (acceptable)
- Learning curve for SDK APIs (mitigated by maturity)
- External dependency (acceptable trade-off)
- Pre-1.0 version (offset by 7 versions of refinement)

**Verdict:** Chosen - best balance of stability, support, and future-proofing

#### 4. Wait for SDK v1.0 (REJECTED)
**Pros:**
- Maximum stability guarantee
- Full production-ready status

**Cons:**
- Unknown timeline for v1.0 release
- Current issues remain unresolved during wait
- v0.7.2 is production-ready enough (7 versions of refinement)
- Risk of falling further behind spec updates

**Verdict:** Rejected - v0.7.2 is mature enough for production use

### Analysis Summary

The decision to adopt SDK v0.7.2 is driven by:
- **Technical debt reduction**: Eliminate custom protocol implementation
- **Architectural alignment**: Per-request transport vs stateful EventBus
- **Risk mitigation**: Automatic spec tracking vs manual updates
- **Resource optimization**: Focus on domain features vs transport plumbing
- **Ecosystem integration**: Official SDK ensures compatibility

## Decision

**We will adopt the official MCP Kotlin SDK v0.7.2** to replace our custom EventBus-based transport implementation.

### Key Decision Factors

1. **Official Recommendation**
   - Anthropic explicitly recommends using official SDKs
   - Custom implementations are discouraged for production use
   - SDK is co-maintained by Anthropic + JetBrains (high quality)

2. **Ecosystem Alignment**
   - SDK used by official MCP servers and reference implementations
   - Guarantees compatibility with Claude Code and MCP clients
   - Access to community support and issue resolution

3. **Architectural Fit**
   - SDK's per-request transport pattern solves session mismatch issues
   - Stateless server model aligns with serverless deployment goals
   - Cleaner separation between transport and business logic

4. **Maturity Level**
   - v0.7.2 provides 7 versions of stability improvements over v0.1.0
   - Release notes show active maintenance and bug fixes
   - Production-tested by SDK maintainers and early adopters

5. **Future-Proofing**
   - SDK automatically tracks MCP protocol evolution
   - New features (prompts, sampling) available immediately
   - Reduced risk of breaking changes vs custom implementation

6. **Maintainability**
   - Focus development effort on domain features
   - Leverage SDK team expertise for protocol handling
   - Reduced code complexity (less custom transport code)

### What Changes

#### Transport Layer (MAJOR CHANGE)
**Current:**
```kotlin
// EventBus: Session-based correlation
class EventBus {
    private val channels = ConcurrentHashMap<String, Channel<SSEEvent>>()
    private val eventStorage = ConcurrentHashMap<String, MutableList<SSEEvent>>()

    suspend fun publish(sessionId: String, event: SSEEvent)
    fun subscribe(sessionId: String): Flow<SSEEvent>
}

// Split endpoints
fun Route.mcpSSEEndpoint(sessionManager, eventBus)
fun Route.mcpPostEndpoint(sessionManager, eventBus, correlator, methodHandler)
```

**Target:**
```kotlin
// SDK Server: Per-request transport
val server = Server(
    serverInfo = Implementation(
        name = "cycletime-ce",
        version = project.version
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
)

// Unified Ktor integration
fun Application.configureMCP() {
    routing {
        mcp {
            server // SDK handles transport automatically
        }
    }
}
```

#### Protocol Handling (REPLACED)
**Current:**
- Custom `JsonRpcProtocolHandler`
- Manual request validation (`JsonRpcRequestValidator`)
- Custom error codes (`JsonRpcErrorCodes`)
- Custom exceptions (`JsonRpcExceptions`)

**Target:**
- SDK built-in JSON-RPC handling
- Automatic request validation
- Standard MCP error codes
- SDK exception hierarchy

#### Tool Registration (ADAPTED)
**Current:**
```kotlin
interface ToolProvider {
    val namespace: String
    fun getTools(): List<Tool>
}

// Manual tool registration in MCPProviderRegistry
```

**Target:**
```kotlin
// Direct SDK registration
server.addTool(
    name = "session_create",
    description = "Create a new CycleTime session",
    inputSchema = JsonObject(mapOf(
        "type" to JsonPrimitive("object"),
        "properties" to JsonObject(mapOf(
            "projectId" to JsonObject(mapOf("type" to JsonPrimitive("string")))
        ))
    ))
) { request ->
    // Tool execution logic (business logic unchanged)
    CallToolResult(content = listOf(/* result */))
}

// Adapt existing ToolProviders to SDK pattern
class SDKToolAdapter(private val provider: ToolProvider) {
    fun registerTools(server: Server) {
        provider.getTools().forEach { tool ->
            server.addTool(/* ... */)
        }
    }
}
```

#### Resource Providers (ADAPTED)
**Current:**
```kotlin
interface ResourceProvider {
    suspend fun listResources(sessionId: String): List<Resource>
    suspend fun readResource(sessionId: String, uri: String): ResourceContent
}
```

**Target:**
```kotlin
// SDK resource registration
server.addResource(
    uri = "session://current",
    name = "Current Session",
    description = "Active CycleTime session information",
    mimeType = "application/json"
) { request ->
    ReadResourceResult(
        contents = listOf(
            TextResourceContents(
                text = sessionJson,
                uri = request.uri,
                mimeType = "application/json"
            )
        )
    )
}

// Adapt existing ResourceProviders to SDK pattern
class SDKResourceAdapter(private val provider: ResourceProvider) {
    suspend fun registerResources(server: Server, sessionId: String) {
        provider.listResources(sessionId).forEach { resource ->
            server.addResource(/* ... */)
        }
    }
}
```

#### Session Management (RETHOUGHT)
**Current:**
- Stateful EventBus tracks sessions
- Session correlation across SSE and POST
- Complex bootstrap pattern

**Target:**
- SDK per-request transport (stateless)
- Session context passed via request metadata
- Simplified initialization flow

**Solution Approach:**
```kotlin
// Session stored in SDK request context
server.addTool("tool_name") { request ->
    // Extract session from request metadata
    val sessionId = request.meta?.get("sessionId")?.jsonPrimitive?.content
        ?: throw IllegalStateException("No session in request context")

    val session = sessionRepository.findById(sessionId)
        ?: throw IllegalStateException("Invalid session: $sessionId")

    // Use session for business logic
    /* ... */
}

// Session initialized during MCP "initialize" method
// Session ID returned to client for subsequent requests
```

### What Stays Unchanged

These components are **PRESERVED** with NO changes:

#### Domain Layer
- `Project`, `Issue`, `Workflow`, `Session` entities (100% unchanged)
- Domain value objects and business rules (100% unchanged)
- Domain services and use cases (100% unchanged)

#### Repository Layer
- `SessionRepository`, `ProjectRepository`, `IssueRepository`, `WorkflowRepository` interfaces (100% unchanged)
- `ExposedSessionRepository`, `ExposedProjectRepository`, etc. implementations (100% unchanged)
- Database schema and migrations (100% unchanged)

#### Application Services
- `SessionApplicationService` (100% unchanged)
- `ProjectApplicationService` (100% unchanged)
- `IssueApplicationService` (100% unchanged)
- `WorkflowApplicationService` (100% unchanged)

#### Tool/Resource Business Logic
- `DefaultSessionToolProvider` business logic (only registration API adapts)
- `DefaultProjectToolProvider` business logic (only registration API adapts)
- `DefaultIssueToolProvider` business logic (only registration API adapts)
- `DefaultWorkflowToolProvider` business logic (only registration API adapts)
- All resource provider business logic (only registration API adapts)

**Migration Philosophy:**
- **Infrastructure changes**: Transport, protocol handling, registration
- **Business logic preserved**: Domain, application services, tool/resource providers
- **Test preservation**: All business logic tests remain valid

## Consequences

### Positive

1. **Reduced Maintenance Burden**
   - SDK team handles protocol updates automatically
   - No need to track MCP specification changes manually
   - Community support for SDK-related issues
   - Focus development effort on CycleTime domain features

2. **Improved Reliability**
   - Production-tested SDK vs custom implementation
   - Per-request transport eliminates session mismatch bugs
   - SDK has comprehensive error handling and edge case coverage
   - Better error messages and debugging support

3. **Future-Proofing**
   - Automatic compatibility with new MCP features
   - SDK tracks protocol evolution (prompts, sampling, etc.)
   - Ecosystem alignment ensures Claude Code compatibility
   - Easier migration to new SDK versions

4. **Architectural Alignment**
   - Per-request transport matches recommended MCP pattern
   - Stateless server model enables serverless deployment
   - Cleaner separation of concerns (transport vs business logic)
   - Simplified testing (mock SDK transport vs EventBus)

5. **Developer Experience**
   - Comprehensive SDK documentation and examples
   - Type-safe Kotlin APIs with IDE support
   - Simpler codebase (less custom transport code)
   - Easier onboarding for new developers

6. **Ecosystem Integration**
   - Compatible with all MCP clients (Claude Code, MCP Inspector)
   - Can leverage SDK examples and best practices
   - Access to community servers for reference
   - Potential for SDK tooling and debugging utilities

### Negative

1. **Migration Effort**
   - Estimated 22 story points across 7 subtasks
   - 21 days timeline with 6 implementation phases
   - All transport layer code needs replacement
   - Comprehensive testing required for validation

2. **Learning Curve**
   - Team needs to learn SDK APIs and patterns
   - Different mental model (per-request vs stateful)
   - SDK documentation study required
   - Potential initial productivity dip

3. **External Dependency**
   - Dependent on SDK team for bug fixes
   - SDK version updates may require code changes
   - Less control over transport implementation
   - Need to track SDK release notes

4. **Pre-1.0 Status**
   - v0.7.2 is pre-release (but 7 versions mature)
   - Potential for breaking changes before v1.0
   - API stabilization may require future migrations
   - Risk of deprecated patterns (mitigated by maturity)

### Risks and Mitigation

#### Risk 1: SDK Maturity (v0.7.2 pre-1.0)
**Impact:** Medium
**Likelihood:** Low (7 versions of improvements)

**Mitigation:**
- Comprehensive testing with MCP Inspector
- Early integration with Claude Code for validation
- Version pinning to avoid unexpected updates
- Monitor SDK release notes for breaking changes
- Maintain migration capability if SDK proves unstable

#### Risk 2: API Changes Between Versions
**Impact:** Medium
**Likelihood:** Medium (pre-1.0 SDK)

**Mitigation:**
- Pin SDK version in build.gradle.kts
- Create adapter layer for SDK APIs (isolate SDK dependencies)
- Comprehensive test suite to catch API changes quickly
- Review SDK release notes before upgrading
- Budget time for SDK upgrade maintenance

#### Risk 3: Performance Unknown
**Impact:** Low
**Likelihood:** Low (SDK used in production)

**Mitigation:**
- Benchmark SDK performance early in migration
- Establish performance baselines (<100ms initialize, <500ms tool call)
- Performance test suite to catch regressions
- Optimize if needed (SDK is lightweight)
- Fallback option to custom transport if performance critical

#### Risk 4: Breaking Changes in Future SDK Versions
**Impact:** Medium
**Likelihood:** Medium (pre-1.0)

**Mitigation:**
- Version pinning prevents unexpected breaks
- Adapter pattern isolates SDK API surface area
- Comprehensive test coverage catches breaks early
- Budget quarterly SDK upgrade reviews
- Community involvement (report issues, contribute fixes)

#### Risk 5: Session Management Paradigm Shift
**Impact:** High
**Likelihood:** Low (solution identified)

**Mitigation:**
- Prototype session management with SDK early
- Use request metadata for session context
- Maintain session repository for persistence
- Test session lifecycle thoroughly
- Document session management patterns clearly

#### Risk 6: Migration Introduces Regressions
**Impact:** High
**Likelihood:** Low (phased approach)

**Mitigation:**
- Phased migration (6 phases, 21 days)
- Comprehensive test suite (820 tests maintained)
- MCP Inspector validation at each phase
- Claude Code integration testing
- Rollback plan prepared (branch + tag archive)

## Implementation Plan

Migration will occur in 6 phases over 21 days (22 story points total):

1. **Phase 1: Foundation** (Days 1-3, 3 points) - ✅ COMPLETE
   - Add SDK dependency v0.7.2
   - Study SDK architecture and APIs
   - Create migration plan and ADR

2. **Phase 2: Transport Layer** (Days 4-8, 5 points)
   - Replace EventBus with SDK transport
   - Integrate SDK with Ktor 3.3.0
   - Implement session management with SDK

3. **Phase 3: Tool/Resource Migration** (Days 9-13, 5 points)
   - Adapt tool providers to SDK registration API
   - Adapt resource providers to SDK registration API
   - Maintain business logic (no changes)

4. **Phase 4: Test Migration** (Days 14-16, 3 points)
   - Update transport layer tests for SDK
   - Update integration tests for SDK patterns
   - Maintain 820/820 test pass rate

5. **Phase 5: Validation** (Days 17-19, 4 points)
   - MCP Inspector comprehensive validation
   - Claude Code integration testing
   - Performance benchmarking
   - Security review

6. **Phase 6: Cleanup** (Days 20-21, 2 points)
   - Remove EventBus and custom transport
   - Remove JsonRpcProtocolHandler
   - Update documentation
   - Archive old implementation

**Detailed implementation:** See `docs/architecture/mcp-sdk-v0.7.2-migration-plan.md`

## Validation

Success will be measured by:

### Functional Requirements
- ✅ Claude Code connects successfully
- ✅ All tools listed correctly (session, project, issue, workflow)
- ✅ All resources accessible (session, issue, project)
- ✅ MCP Inspector validation passes (all protocol checks)

### Quality Requirements
- ✅ Test pass rate: 820/820 (100% maintained)
- ✅ Test coverage: ≥80% (current level maintained)
- ✅ No regressions in functionality
- ✅ Error handling comprehensive

### Performance Requirements
- ✅ Server initialize: <100ms
- ✅ Tool call latency: <500ms
- ✅ Resource read: <100ms
- ✅ Memory usage: Baseline established

### Code Quality
- ✅ Detekt static analysis passes
- ✅ Dependency security check passes
- ✅ Build time: No significant increase
- ✅ Code complexity reduced (less custom code)

### Documentation
- ✅ Architecture docs updated
- ✅ SDK integration patterns documented
- ✅ Migration completed and archived
- ✅ Developer guides updated

## References

### Linear Issues
- **SPI-700**: Parent epic for SDK adoption
- **SPI-699**: Session mismatch investigation (root cause)
- **SPI-665**: SSE transport implementation (current approach)

### SDK Resources
- **Repository**: https://github.com/modelcontextprotocol/kotlin-sdk
- **Documentation**: https://modelcontextprotocol.github.io/kotlin-sdk/
- **Release Notes**: https://github.com/modelcontextprotocol/kotlin-sdk/releases/tag/v0.7.2

### Related Documents
- **Migration Plan**: `docs/architecture/mcp-sdk-v0.7.2-migration-plan.md`
- **Current Architecture**: `docs/architecture/overview.md`
- **Session Management**: `docs/architecture/session-management.md`

### MCP Specification
- **Current Spec**: https://modelcontextprotocol.io/specification/2025-03-26
- **Transport Spec**: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports

## Notes

### Lessons Learned (Future Reference)

1. **Custom vs Official**: Always evaluate official SDKs before building custom
2. **Session Management**: Per-request transport is simpler than stateful EventBus
3. **Maintenance Burden**: Protocol implementation is significant ongoing cost
4. **Ecosystem Value**: Official SDK ensures compatibility and community support

### Team Knowledge Transfer

Required reading for developers:
- SDK documentation: https://modelcontextprotocol.github.io/kotlin-sdk/
- Migration plan: `docs/architecture/mcp-sdk-v0.7.2-migration-plan.md`
- ADR (this document) for context and rationale

### Archive Information

Old implementation archived at:
- **Branch**: `archive/eventbus-transport`
- **Tag**: `v0.x.x-pre-sdk` (to be created before migration)
- **Location**: `docs/archive/eventbus-architecture.md` (to be created)

---

**Architect Notes:**

This was a tough call. Building custom transport seemed clever at first. The EventBus pattern is elegant. But session correlation bugs kept appearing. The MCP spec is evolving. Maintaining protocol code is expensive.

SDK v0.7.2 is pre-1.0, which worried me. But 7 versions of improvements is substantial. JetBrains co-maintains it. Production-tested by early adopters. The risk is acceptable.

The per-request transport paradigm shift is the biggest challenge. Our stateful EventBus feels natural. But the SDK pattern is cleaner. Session management via request metadata is simpler than EventBus correlation.

22 story points feels right. Not trivial, but not massive. 21 days with proper phasing. The phased approach reduces risk significantly.

I'm confident this is the right architectural direction. Future me will appreciate this decision. (Or wonder what I was thinking - time will tell.)

-- Software Architect, CycleTime CE Team
