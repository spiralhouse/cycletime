# Context Package: Developer Agent - Phase 3 (Tool/Resource Adapter Implementation)

## Mission Overview

**Your Role**: Implement adapters for tool/resource providers to SDK v0.7.2 registration API

**Timeline**: Days 9-12 of Phase 3 (Days 9-13, with Day 13 for QA)

**Deliverables**:
- SDKToolAdapter for all 4 tool providers (15 tools total)
- SDKResourceAdapter for all 3 resource providers
- DI configuration for adapter registration
- Business logic 100% preserved

**Success Criteria**: All tools/resources register with SDK, adapters functional, business logic tests pass unchanged

---

## General Context

### Adapter Pattern Philosophy (from ADR-001 lines 245-253)

**Problem**: Existing tool/resource providers use custom registration API, SDK uses different API

**Solution**: Adapter layer bridges old to new without changing business logic

```
OLD: ToolProvider → MCPProviderRegistry (manual registration)
NEW: ToolProvider → SDKToolAdapter → SDK Server (automatic registration)
     ↑ unchanged    ↑ adapter       ↑ SDK API
```

**Critical**: Business logic in providers is 100% unchanged, only registration adapts

---

## Developer Agent-Specific Context

### SDK Tool Registration API (from migration plan lines 127-167)

**SDK Pattern**:

```kotlin
// SDK tool registration (from migration plan lines 131-166)
server.addTool(
    name = "session_create",
    description = "Create a new CycleTime session for a project",
    inputSchema = JsonObject(mapOf(
        "type" to JsonPrimitive("object"),
        "properties" to JsonObject(mapOf(
            "projectId" to JsonObject(mapOf(
                "type" to JsonPrimitive("string"),
                "description" to JsonPrimitive("Linear project ID")
            )),
            "requireAuth" to JsonObject(mapOf(
                "type" to JsonPrimitive("boolean"),
                "description" to JsonPrimitive("Require Linear authentication")
            ))
        )),
        "required" to JsonArray(listOf(JsonPrimitive("projectId")))
    ))
) { request: CallToolRequest ->
    // Extract parameters from request
    val args = request.params.arguments
    val projectId = args["projectId"]?.jsonPrimitive?.content
        ?: throw IllegalArgumentException("Missing projectId")

    // Execute business logic (unchanged)
    val result = sessionService.createSession(projectId)

    // Return structured result
    CallToolResult(
        content = listOf(
            TextContent(
                type = "text",
                text = Json.encodeToString(result)
            )
        )
    )
}
```

### SDK Resource Registration API (from migration plan lines 169-198)

**SDK Pattern**:

```kotlin
// SDK resource registration (from migration plan lines 173-197)
server.addResource(
    uri = "session://current",
    name = "Current Session",
    description = "Active CycleTime session information",
    mimeType = "application/json"
) { request: ReadResourceRequest ->
    // Extract session from request context
    val sessionId = request.meta?.get("sessionId")?.jsonPrimitive?.content
        ?: throw IllegalStateException("No session in request")

    // Read resource data (business logic unchanged)
    val session = sessionRepository.findById(sessionId)
        ?: throw IllegalStateException("Invalid session")

    // Return resource content
    ReadResourceResult(
        contents = listOf(
            TextResourceContents(
                text = Json.encodeToString(session),
                uri = request.uri,
                mimeType = "application/json"
            )
        )
    )
}
```

### Day 9: Tool Provider Adapter (from migration plan lines 657-758)

**Step 1: Create SDK Tool Adapter**

```kotlin
// File: src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/adapters/SDKToolAdapter.kt
package io.spiralhouse.cycletime.mcp.sdk.adapters

import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.modelcontextprotocol.kotlin.sdk.CallToolRequest
import io.modelcontextprotocol.kotlin.sdk.CallToolResult
import io.modelcontextprotocol.kotlin.sdk.TextContent
import io.spiralhouse.cycletime.mcp.tools.ToolProvider
import io.spiralhouse.cycletime.mcp.tools.Tool
import io.spiralhouse.cycletime.mcp.sdk.SessionContext
import io.spiralhouse.cycletime.mcp.sdk.SDKSessionManager
import kotlinx.serialization.json.*
import org.slf4j.LoggerFactory

/**
 * Adapter that bridges existing ToolProvider to SDK registration API.
 *
 * This preserves business logic while adapting to SDK patterns.
 * Business logic in ToolProvider is 100% unchanged.
 */
class SDKToolAdapter(
    private val toolProvider: ToolProvider,
    private val sdkSessionManager: SDKSessionManager
) {
    private val logger = LoggerFactory.getLogger(SDKToolAdapter::class.java)

    /**
     * Register all tools from provider with SDK server.
     */
    suspend fun registerTools(server: Server) {
        val tools = toolProvider.getTools() + toolProvider.getAsyncTools()

        tools.forEach { tool ->
            registerTool(server, tool)
        }

        logger.info("Registered ${tools.size} tools from ${toolProvider.namespace}")
    }

    /**
     * Register individual tool with SDK.
     */
    private suspend fun registerTool(server: Server, tool: Tool) {
        val toolName = "${toolProvider.namespace}_${tool.metadata.name}"

        server.addTool(
            name = toolName,
            description = tool.metadata.description,
            inputSchema = convertInputSchema(tool.metadata.inputSchema)
        ) { request: CallToolRequest ->
            executeTool(tool, request)
        }
    }

    /**
     * Execute tool via adapter (business logic unchanged).
     */
    private suspend fun executeTool(
        tool: Tool,
        request: CallToolRequest
    ): CallToolResult {
        // Extract session from request if present
        val sessionId = SessionContext.extractSessionId(request)

        // Validate session if required
        if (sessionId != null) {
            sdkSessionManager.validateSession(sessionId)
        }

        // Convert SDK request to Tool request format
        val toolRequest = convertToToolRequest(request)

        // Execute tool (business logic unchanged)
        val result = tool.execute(toolRequest)

        // Convert result to SDK format
        return CallToolResult(
            content = listOf(
                TextContent(
                    type = "text",
                    text = result.toJson()
                )
            )
        )
    }

    /**
     * Convert tool input schema to JSON schema format.
     */
    private fun convertInputSchema(schema: Map<String, Any>): JsonObject {
        return buildJsonObject {
            schema.forEach { (key, value) ->
                put(key, Json.encodeToJsonElement(value))
            }
        }
    }

    /**
     * Convert SDK request format to existing ToolRequest format.
     */
    private fun convertToToolRequest(request: CallToolRequest): ToolRequest {
        return ToolRequest(
            parameters = request.params.arguments.mapValues { (_, value) ->
                value.toString()
            }
        )
    }
}
```

**Validation Checklist**:
- [ ] File created: `SDKToolAdapter.kt`
- [ ] Compiles without errors
- [ ] Business logic execution path unchanged
- [ ] Session extraction integrated

### Day 10-11: Migrate Tool Providers (from migration plan lines 830-906)

**Implementation Order**:
1. Session tools (3 tools)
2. Project tools (4 tools)
3. Issue tools (5 tools)
4. Workflow tools (3 tools)

**Pattern**: Business logic unchanged, only registration adapts

**Before/After Example** (from migration plan lines 842-866):

```kotlin
// BEFORE: Direct ToolProvider usage (EventBus pattern)
class DefaultSessionToolProvider(
    private val sessionService: SessionApplicationService
) : AbstractToolProvider("session") {
    override fun getTools(): List<Tool> = listOf(
        Tool(
            metadata = ToolMetadata(
                name = "create",
                description = "Create a new CycleTime session",
                inputSchema = mapOf(
                    "type" to "object",
                    "properties" to mapOf(
                        "projectId" to mapOf("type" to "string")
                    )
                )
            ),
            handler = { params ->
                val projectId = params["projectId"] as String
                val result = sessionService.createSession(projectId)
                ToolResult.success(result)
            }
        )
    )
}

// AFTER: Same business logic, SDK adapter handles registration
// Tool provider UNCHANGED
// Adapter registers via SDK
class SDKToolAdapter(provider: DefaultSessionToolProvider) {
    // Registers tool with SDK
    // Business logic (sessionService.createSession) unchanged
}
```

**Step 2: Register Tool Adapters in MCPSdkServer**

```kotlin
// File: src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/MCPSdkServer.kt (updated)
class MCPSdkServer(
    private val version: String,
    private val sessionManager: SDKSessionManager,
    private val toolProviders: List<ToolProvider>
) {
    val server: Server = Server(/* ... */)

    suspend fun initialize() {
        // Register all tool providers via adapters
        toolProviders.forEach { provider ->
            val adapter = SDKToolAdapter(provider, sessionManager)
            adapter.registerTools(server)
        }

        logger.info("Registered ${toolProviders.size} tool providers")
    }
}
```

**Step 3: Update DI Configuration**

```kotlin
// File: src/main/kotlin/io/spiralhouse/cycletime/Application.kt
fun Application.configureDependencies() {
    dependencies {
        // Tool providers (existing, unchanged)
        provide<DefaultSessionToolProvider> {
            DefaultSessionToolProvider(instance())
        }
        provide<DefaultProjectToolProvider> {
            DefaultProjectToolProvider(instance())
        }
        provide<DefaultIssueToolProvider> {
            DefaultIssueToolProvider(instance())
        }
        provide<DefaultWorkflowToolProvider> {
            DefaultWorkflowToolProvider(instance())
        }

        // SDK Server with tool providers
        provide<MCPSdkServer> {
            val toolProviders = listOf(
                instance<DefaultSessionToolProvider>(),
                instance<DefaultProjectToolProvider>(),
                instance<DefaultIssueToolProvider>(),
                instance<DefaultWorkflowToolProvider>()
            )

            MCPSdkServer(
                version = System.getProperty("cycletime.version") ?: "unknown",
                sessionManager = instance(),
                toolProviders = toolProviders
            ).apply {
                runBlocking { initialize() }
            }
        }
    }
}
```

**Validation Checklist**:
- [ ] All 4 tool providers registered
- [ ] DI configuration updated
- [ ] Build succeeds: `./gradlew build`
- [ ] Server starts: `./gradlew run`

### Day 12: Resource Provider Adapter (from migration plan lines 907-1006)

**Step 1: Create SDK Resource Adapter**

```kotlin
// File: src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/adapters/SDKResourceAdapter.kt
package io.spiralhouse.cycletime.mcp.sdk.adapters

import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.modelcontextprotocol.kotlin.sdk.ReadResourceRequest
import io.modelcontextprotocol.kotlin.sdk.ReadResourceResult
import io.modelcontextprotocol.kotlin.sdk.TextResourceContents
import io.spiralhouse.cycletime.mcp.resources.ResourceProvider
import io.spiralhouse.cycletime.mcp.resources.Resource
import io.spiralhouse.cycletime.mcp.sdk.SessionContext
import io.spiralhouse.cycletime.mcp.sdk.SDKSessionManager
import kotlinx.serialization.json.Json
import org.slf4j.LoggerFactory

/**
 * Adapter that bridges existing ResourceProvider to SDK registration API.
 *
 * This preserves business logic while adapting to SDK patterns.
 * Business logic in ResourceProvider is 100% unchanged.
 */
class SDKResourceAdapter(
    private val resourceProvider: ResourceProvider,
    private val sdkSessionManager: SDKSessionManager
) {
    private val logger = LoggerFactory.getLogger(SDKResourceAdapter::class.java)

    /**
     * Register all resources from provider with SDK server.
     */
    suspend fun registerResources(server: Server) {
        // Get resource list (with dummy session for registration)
        val resources = resourceProvider.listResources()

        resources.forEach { resource ->
            registerResource(server, resource)
        }

        logger.info("Registered ${resources.size} resources from ${resourceProvider.namespace}")
    }

    /**
     * Register individual resource with SDK.
     */
    private fun registerResource(server: Server, resource: Resource) {
        server.addResource(
            uri = resource.uri,
            name = resource.name,
            description = resource.description,
            mimeType = resource.mimeType
        ) { request: ReadResourceRequest ->
            readResource(request)
        }
    }

    /**
     * Read resource via adapter (business logic unchanged).
     */
    private suspend fun readResource(
        request: ReadResourceRequest
    ): ReadResourceResult {
        // Extract session from request
        val sessionId = SessionContext.requireSessionId(request)

        // Validate session
        sdkSessionManager.validateSession(sessionId)

        // Read resource (business logic unchanged)
        val content = resourceProvider.readResource(sessionId, request.uri)

        // Convert to SDK format
        return ReadResourceResult(
            contents = listOf(
                TextResourceContents(
                    text = Json.encodeToString(content),
                    uri = request.uri,
                    mimeType = content.mimeType
                )
            )
        )
    }
}
```

**Step 2: Register Resource Adapters in MCPSdkServer**

```kotlin
// File: src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/MCPSdkServer.kt (updated)
class MCPSdkServer(
    private val version: String,
    private val sessionManager: SDKSessionManager,
    private val toolProviders: List<ToolProvider>,
    private val resourceProviders: List<ResourceProvider>
) {
    val server: Server = Server(/* ... */)

    suspend fun initialize() {
        // Register tools
        toolProviders.forEach { provider ->
            SDKToolAdapter(provider, sessionManager).registerTools(server)
        }

        // Register resources
        resourceProviders.forEach { provider ->
            SDKResourceAdapter(provider, sessionManager).registerResources(server)
        }

        logger.info("SDK server initialized with ${toolProviders.size} tool providers, " +
                   "${resourceProviders.size} resource providers")
    }
}
```

**Step 3: Update DI Configuration**

```kotlin
fun Application.configureDependencies() {
    dependencies {
        // Resource providers (existing, unchanged)
        provide<SessionResourceProvider> {
            SessionResourceProvider(instance())
        }
        provide<ProjectResourceProvider> {
            ProjectResourceProvider(instance())
        }
        provide<IssueResourceProvider> {
            IssueResourceProvider(instance())
        }

        // SDK Server with tools + resources
        provide<MCPSdkServer> {
            val toolProviders = listOf(
                instance<DefaultSessionToolProvider>(),
                instance<DefaultProjectToolProvider>(),
                instance<DefaultIssueToolProvider>(),
                instance<DefaultWorkflowToolProvider>()
            )

            val resourceProviders = listOf(
                instance<SessionResourceProvider>(),
                instance<ProjectResourceProvider>(),
                instance<IssueResourceProvider>()
            )

            MCPSdkServer(
                version = System.getProperty("cycletime.version") ?: "unknown",
                sessionManager = instance(),
                toolProviders = toolProviders,
                resourceProviders = resourceProviders
            ).apply {
                runBlocking { initialize() }
            }
        }
    }
}
```

**Validation Checklist**:
- [ ] All 3 resource providers registered
- [ ] DI configuration updated
- [ ] Build succeeds: `./gradlew build`
- [ ] Server starts: `./gradlew run`

### Complete DI Integration (from migration plan lines 2107-2151)

**Full Application.kt Example**:

```kotlin
fun Application.configureDependencies() {
    dependencies {
        // Layer 1: Core services (unchanged)
        provide<SessionRepository> { ExposedSessionRepository(instance()) }
        provide<SessionApplicationService> { SessionApplicationService(instance(), instance()) }
        provide<ProjectApplicationService> { ProjectApplicationService(instance(), instance()) }
        provide<IssueApplicationService> { IssueApplicationService(instance(), instance()) }
        provide<WorkflowApplicationService> { WorkflowApplicationService(instance(), instance()) }

        // Layer 2: Tool/Resource providers (unchanged business logic)
        provide<DefaultSessionToolProvider> { DefaultSessionToolProvider(instance()) }
        provide<DefaultProjectToolProvider> { DefaultProjectToolProvider(instance()) }
        provide<DefaultIssueToolProvider> { DefaultIssueToolProvider(instance()) }
        provide<DefaultWorkflowToolProvider> { DefaultWorkflowToolProvider(instance()) }

        provide<SessionResourceProvider> { SessionResourceProvider(instance()) }
        provide<ProjectResourceProvider> { ProjectResourceProvider(instance()) }
        provide<IssueResourceProvider> { IssueResourceProvider(instance()) }

        // Layer 3: SDK adapters (new)
        provide<SDKSessionManager> { SDKSessionManager(instance()) }

        // Layer 4: SDK server (new)
        provide<MCPSdkServer> {
            val version = System.getProperty("cycletime.version") ?: "1.0.0"

            val toolProviders = listOf(
                instance<DefaultSessionToolProvider>(),
                instance<DefaultProjectToolProvider>(),
                instance<DefaultIssueToolProvider>(),
                instance<DefaultWorkflowToolProvider>()
            )

            val resourceProviders = listOf(
                instance<SessionResourceProvider>(),
                instance<ProjectResourceProvider>(),
                instance<IssueResourceProvider>()
            )

            MCPSdkServer(
                version = version,
                sessionManager = instance(),
                toolProviders = toolProviders,
                resourceProviders = resourceProviders
            ).apply {
                runBlocking { initialize() }
            }
        }
    }
}
```

---

## Success Criteria

### Phase 3 Go/No-Go Gates (from migration plan lines 1070-1082)

**Implementation Gates**:
- [ ] All tool providers adapted (4 providers, 15 tools)
- [ ] All resource providers adapted (3 providers)
- [ ] Business logic unchanged (verified by tests)
- [ ] All tools registered with SDK
- [ ] All resources registered with SDK
- [ ] DI configuration complete
- [ ] Build succeeds: `./gradlew build`
- [ ] Server starts: `./gradlew run`
- [ ] Code review approved

**Business Logic Preservation**:
- [ ] Existing tool provider tests pass unchanged
- [ ] Existing resource provider tests pass unchanged
- [ ] No modifications to domain layer
- [ ] No modifications to application services

---

## References

### Source Documents
- **Migration Plan**: `/docs/architecture/mcp-sdk-v0.7.2-migration-plan.md`
  - Lines 657-758: Tool adapter implementation
  - Lines 830-906: Tool provider migration examples
  - Lines 907-1006: Resource adapter implementation
  - Lines 2107-2151: Complete DI integration
- **ADR-001**: `/docs/architecture/decisions/ADR-001-adopt-mcp-kotlin-sdk-v0.7.2.md`
  - Lines 219-253: Tool registration pattern
  - Lines 255-291: Resource provider pattern
  - Lines 325-355: What stays unchanged

### Files to Create
- `src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/adapters/SDKToolAdapter.kt`
- `src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/adapters/SDKResourceAdapter.kt`

### Files to Modify
- `src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/MCPSdkServer.kt` (add initialization)
- `src/main/kotlin/io/spiralhouse/cycletime/Application.kt` (DI configuration)

---

**Context Package Status**: ✅ READY FOR DELEGATION
**Last Updated**: 2025-10-12
**Owner**: Context Engineer
