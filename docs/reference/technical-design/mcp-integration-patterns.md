# MCP Integration Patterns - Technical Design

## Overview

This document outlines the Model Context Protocol (MCP) integration patterns for CycleTime CE, enabling seamless communication with Claude Code through WebSocket connections and JSON-RPC messaging. The implementation leverages Ktor's WebSocket support and dependency injection for maintainable, testable MCP server components.

## MCP Protocol Overview

### Core Concepts

- **Resources**: Read-only data exposed to Claude Code (projects, issues, contexts)
- **Tools**: Executable functions Claude Code can invoke (create, update, delete operations)
- **Prompts**: Pre-configured prompt templates for common workflows
- **WebSocket Transport**: Real-time bidirectional communication
- **JSON-RPC 2.0**: Standard request/response protocol

### Protocol Flow

```
Claude Code                    CycleTime CE MCP Server
    |                               |
    |-------- WebSocket Connect --->|
    |                               |
    |<------- Initialize Request ---|
    |-------- Initialize Response ->|
    |                               |
    |<------- Resources List -------|
    |<------- Tools List ------------|
    |                               |
    |-------- Resource Read -------->|
    |<------- Resource Content ------|
    |                               |
    |-------- Tool Execute --------->|
    |<------- Tool Result -----------|
    |                               |
```

## Technology Stack

```kotlin
// build.gradle.kts
dependencies {
    // Ktor WebSocket support
    implementation("io.ktor:ktor-server-websockets:3.2.0")
    implementation("io.ktor:ktor-server-content-negotiation:3.2.0")
    implementation("io.ktor:ktor-serialization-kotlinx-json:3.2.0")
    
    // JSON-RPC implementation
    implementation("com.github.kotlin-json-rpc:json-rpc:1.0.0")
    
    // Coroutines for async handling
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
    
    // Serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.2")
}
```

## MCP Server Architecture

### Core MCP Server Implementation

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/mcp/CycleTime CEMCPServer.kt

import io.ktor.server.application.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.*
import kotlinx.serialization.json.*
import java.time.Duration

/**
 * Main MCP server coordinating resources and tools
 */
class CycleTime CEMCPServer(
    private val resources: List<MCPResource>,
    private val tools: List<MCPTool>,
    private val prompts: List<MCPPrompt> = emptyList()
) {
    private val logger = LoggerFactory.getLogger(CycleTime CEMCPServer::class.java)
    private val sessions = mutableMapOf<String, MCPSession>()
    
    /**
     * Initialize MCP server with WebSocket endpoint
     */
    fun Application.configureMCP() {
        install(WebSockets) {
            pingPeriod = Duration.ofSeconds(15)
            timeout = Duration.ofSeconds(15)
            maxFrameSize = Long.MAX_VALUE
            masking = false
        }
        
        routing {
            webSocket("/mcp") {
                handleMCPConnection(this)
            }
        }
    }
    
    /**
     * Handle incoming MCP WebSocket connection
     */
    private suspend fun handleMCPConnection(session: WebSocketSession) {
        val sessionId = generateSessionId()
        val mcpSession = MCPSession(sessionId, session)
        sessions[sessionId] = mcpSession
        
        try {
            logger.info("MCP client connected: $sessionId")
            
            // Handle incoming messages
            for (frame in session.incoming) {
                when (frame) {
                    is Frame.Text -> {
                        val text = frame.readText()
                        handleJsonRpcMessage(mcpSession, text)
                    }
                    is Frame.Close -> {
                        logger.info("MCP client disconnected: $sessionId")
                        break
                    }
                    else -> {} // Ignore other frame types
                }
            }
        } catch (e: Exception) {
            logger.error("Error in MCP session $sessionId", e)
        } finally {
            sessions.remove(sessionId)
            mcpSession.close()
        }
    }
    
    /**
     * Process JSON-RPC message
     */
    private suspend fun handleJsonRpcMessage(session: MCPSession, message: String) {
        try {
            val jsonElement = Json.parseToJsonElement(message)
            val request = Json.decodeFromJsonElement<JsonRpcRequest>(jsonElement)
            
            val response = when (request.method) {
                "initialize" -> handleInitialize(request)
                "resources/list" -> handleResourcesList(request)
                "resources/read" -> handleResourceRead(request)
                "tools/list" -> handleToolsList(request)
                "tools/call" -> handleToolCall(request)
                "prompts/list" -> handlePromptsList(request)
                "prompts/get" -> handlePromptGet(request)
                "ping" -> handlePing(request)
                else -> createErrorResponse(
                    request.id,
                    -32601,
                    "Method not found: ${request.method}"
                )
            }
            
            session.send(Json.encodeToString(response))
            
        } catch (e: Exception) {
            logger.error("Error processing message: $message", e)
            session.send(createErrorResponse(
                null,
                -32700,
                "Parse error: ${e.message}"
            ))
        }
    }
    
    /**
     * Handle initialize request
     */
    private fun handleInitialize(request: JsonRpcRequest): JsonRpcResponse {
        val params = request.params?.jsonObject
        val protocolVersion = params?.get("protocolVersion")?.jsonPrimitive?.content
        
        if (protocolVersion != "1.0") {
            return createErrorResponse(
                request.id,
                -32602,
                "Unsupported protocol version: $protocolVersion"
            )
        }
        
        return JsonRpcResponse(
            jsonrpc = "2.0",
            id = request.id,
            result = buildJsonObject {
                put("protocolVersion", "1.0")
                put("serverInfo", buildJsonObject {
                    put("name", "CycleTime CE MCP Server")
                    put("version", "1.0.0")
                })
                put("capabilities", buildJsonObject {
                    put("resources", buildJsonObject {
                        put("listChanged", true)
                    })
                    put("tools", buildJsonObject {})
                    put("prompts", buildJsonObject {})
                })
            }
        )
    }
    
    /**
     * Handle resources list request
     */
    private suspend fun handleResourcesList(request: JsonRpcRequest): JsonRpcResponse {
        val resourceList = resources.flatMap { resource ->
            resource.list()
        }
        
        return JsonRpcResponse(
            jsonrpc = "2.0",
            id = request.id,
            result = buildJsonObject {
                put("resources", buildJsonArray {
                    resourceList.forEach { descriptor ->
                        add(buildJsonObject {
                            put("uri", descriptor.uri)
                            put("name", descriptor.name)
                            put("description", descriptor.description)
                            put("mimeType", descriptor.mimeType)
                        })
                    }
                })
            }
        )
    }
    
    /**
     * Handle resource read request
     */
    private suspend fun handleResourceRead(request: JsonRpcRequest): JsonRpcResponse {
        val uri = request.params?.jsonObject?.get("uri")?.jsonPrimitive?.content
            ?: return createErrorResponse(request.id, -32602, "Missing uri parameter")
        
        val resource = resources.firstOrNull { it.canHandle(uri) }
            ?: return createErrorResponse(request.id, -32602, "Resource not found: $uri")
        
        return try {
            val content = resource.read(uri)
            JsonRpcResponse(
                jsonrpc = "2.0",
                id = request.id,
                result = buildJsonObject {
                    put("contents", buildJsonArray {
                        add(buildJsonObject {
                            put("uri", content.uri)
                            put("mimeType", content.mimeType)
                            put("text", content.text)
                        })
                    })
                }
            )
        } catch (e: Exception) {
            createErrorResponse(request.id, -32603, "Failed to read resource: ${e.message}")
        }
    }
    
    /**
     * Handle tools list request
     */
    private fun handleToolsList(request: JsonRpcRequest): JsonRpcResponse {
        return JsonRpcResponse(
            jsonrpc = "2.0",
            id = request.id,
            result = buildJsonObject {
                put("tools", buildJsonArray {
                    tools.forEach { tool ->
                        add(buildJsonObject {
                            put("name", tool.name)
                            put("description", tool.description)
                            put("inputSchema", tool.inputSchema)
                        })
                    }
                })
            }
        )
    }
    
    /**
     * Handle tool call request
     */
    private suspend fun handleToolCall(request: JsonRpcRequest): JsonRpcResponse {
        val params = request.params?.jsonObject ?: 
            return createErrorResponse(request.id, -32602, "Missing parameters")
        
        val toolName = params["name"]?.jsonPrimitive?.content
            ?: return createErrorResponse(request.id, -32602, "Missing tool name")
        
        val tool = tools.firstOrNull { it.name == toolName }
            ?: return createErrorResponse(request.id, -32602, "Tool not found: $toolName")
        
        val arguments = params["arguments"]?.jsonObject ?: buildJsonObject {}
        
        return try {
            val result = tool.execute(arguments)
            JsonRpcResponse(
                jsonrpc = "2.0",
                id = request.id,
                result = buildJsonObject {
                    put("content", buildJsonArray {
                        add(buildJsonObject {
                            put("type", "text")
                            put("text", Json.encodeToString(result))
                        })
                    })
                }
            )
        } catch (e: Exception) {
            createErrorResponse(request.id, -32603, "Tool execution failed: ${e.message}")
        }
    }
    
    private fun createErrorResponse(
        id: JsonElement?,
        code: Int,
        message: String
    ): JsonRpcResponse {
        return JsonRpcResponse(
            jsonrpc = "2.0",
            id = id,
            error = JsonRpcError(code, message)
        )
    }
}

/**
 * MCP session representing a connected client
 */
data class MCPSession(
    val id: String,
    private val websocket: WebSocketSession
) {
    suspend fun send(message: String) {
        websocket.send(Frame.Text(message))
    }
    
    suspend fun close() {
        websocket.close(CloseReason(CloseReason.Codes.NORMAL, "Session ended"))
    }
}
```

### JSON-RPC Data Models

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/mcp/models/JsonRpcModels.kt

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class JsonRpcRequest(
    val jsonrpc: String = "2.0",
    val method: String,
    val params: JsonElement? = null,
    val id: JsonElement? = null
)

@Serializable
data class JsonRpcResponse(
    val jsonrpc: String = "2.0",
    val result: JsonElement? = null,
    val error: JsonRpcError? = null,
    val id: JsonElement? = null
)

@Serializable
data class JsonRpcError(
    val code: Int,
    val message: String,
    val data: JsonElement? = null
)
```

## MCP Resources Implementation

### Base Resource Interface

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/mcp/resources/MCPResource.kt

/**
 * Base interface for MCP resources
 */
interface MCPResource {
    /**
     * Check if this resource can handle the given URI
     */
    fun canHandle(uri: String): Boolean
    
    /**
     * List available resources
     */
    suspend fun list(): List<ResourceDescriptor>
    
    /**
     * Read resource content
     */
    suspend fun read(uri: String): ResourceContent
}

@Serializable
data class ResourceDescriptor(
    val uri: String,
    val name: String,
    val description: String,
    val mimeType: String = "application/json"
)

@Serializable
data class ResourceContent(
    val uri: String,
    val mimeType: String,
    val text: String
)
```

### Project Resource

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/mcp/resources/ProjectResource.kt

import io.spiralhouse.jcvd.application.services.ProjectApplicationService
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * MCP Resource for project data access
 */
class ProjectResource(
    private val projectService: ProjectApplicationService
) : MCPResource {
    
    override fun canHandle(uri: String): Boolean {
        return uri.startsWith("jcvd://project/")
    }
    
    override suspend fun list(): List<ResourceDescriptor> {
        val projects = projectService.listProjects()
        
        return projects.map { project ->
            ResourceDescriptor(
                uri = "jcvd://project/${project.id}",
                name = project.name,
                description = project.description,
                mimeType = "application/json"
            )
        } + listOf(
            ResourceDescriptor(
                uri = "jcvd://projects",
                name = "All Projects",
                description = "List of all projects",
                mimeType = "application/json"
            )
        )
    }
    
    override suspend fun read(uri: String): ResourceContent {
        return when {
            uri == "jcvd://projects" -> {
                val projects = projectService.listProjects()
                ResourceContent(
                    uri = uri,
                    mimeType = "application/json",
                    text = Json.encodeToString(projects)
                )
            }
            uri.startsWith("jcvd://project/") -> {
                val projectId = uri.substringAfter("jcvd://project/").substringBefore("/")
                val project = projectService.getProject(ProjectId(projectId))
                    ?: throw ResourceNotFoundException("Project not found: $projectId")
                
                when {
                    uri.endsWith("/context") -> {
                        val context = projectService.getProjectContext(ProjectId(projectId))
                        ResourceContent(
                            uri = uri,
                            mimeType = "application/json",
                            text = Json.encodeToString(context)
                        )
                    }
                    uri.endsWith("/issues") -> {
                        val issues = projectService.getProjectIssues(ProjectId(projectId))
                        ResourceContent(
                            uri = uri,
                            mimeType = "application/json",
                            text = Json.encodeToString(issues)
                        )
                    }
                    uri.endsWith("/unblocked") -> {
                        val unblocked = projectService.getUnblockedIssues(ProjectId(projectId))
                        ResourceContent(
                            uri = uri,
                            mimeType = "application/json",
                            text = Json.encodeToString(unblocked)
                        )
                    }
                    else -> {
                        ResourceContent(
                            uri = uri,
                            mimeType = "application/json",
                            text = Json.encodeToString(project)
                        )
                    }
                }
            }
            else -> throw ResourceNotFoundException("Invalid URI: $uri")
        }
    }
}
```

### Issue Resource

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/mcp/resources/IssueResource.kt

/**
 * MCP Resource for issue data access
 */
class IssueResource(
    private val issueService: IssueApplicationService
) : MCPResource {
    
    override fun canHandle(uri: String): Boolean {
        return uri.startsWith("jcvd://issue/")
    }
    
    override suspend fun list(): List<ResourceDescriptor> {
        // Issues are listed under projects, not globally
        return emptyList()
    }
    
    override suspend fun read(uri: String): ResourceContent {
        val issueId = uri.substringAfter("jcvd://issue/").substringBefore("/")
        
        return when {
            uri.endsWith("/context") -> {
                val context = issueService.getIssueWithContext(IssueId(issueId))
                    ?: throw ResourceNotFoundException("Issue not found: $issueId")
                
                ResourceContent(
                    uri = uri,
                    mimeType = "application/json",
                    text = Json.encodeToString(context)
                )
            }
            uri.endsWith("/dependencies") -> {
                val dependencies = issueService.getIssueDependencies(IssueId(issueId))
                ResourceContent(
                    uri = uri,
                    mimeType = "application/json",
                    text = Json.encodeToString(dependencies)
                )
            }
            else -> {
                val issue = issueService.getIssue(IssueId(issueId))
                    ?: throw ResourceNotFoundException("Issue not found: $issueId")
                
                ResourceContent(
                    uri = uri,
                    mimeType = "application/json",
                    text = Json.encodeToString(issue)
                )
            }
        }
    }
}
```

### Workflow Resource

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/mcp/resources/WorkflowResource.kt

/**
 * MCP Resource for workflow state access
 */
class WorkflowResource(
    private val workflowService: WorkflowApplicationService
) : MCPResource {
    
    override fun canHandle(uri: String): Boolean {
        return uri.startsWith("jcvd://workflow/")
    }
    
    override suspend fun list(): List<ResourceDescriptor> {
        return emptyList() // Workflows listed under projects
    }
    
    override suspend fun read(uri: String): ResourceContent {
        val workflowId = uri.substringAfter("jcvd://workflow/")
        val workflow = workflowService.getWorkflow(WorkflowId(workflowId))
            ?: throw ResourceNotFoundException("Workflow not found: $workflowId")
        
        val content = buildJsonObject {
            put("id", workflow.id)
            put("name", workflow.name)
            put("currentStage", workflow.currentStage)
            put("availableTransitions", buildJsonArray {
                workflow.availableTransitions.forEach { add(it) }
            })
            put("isComplete", workflow.isComplete)
        }
        
        return ResourceContent(
            uri = uri,
            mimeType = "application/json",
            text = content.toString()
        )
    }
}
```

## MCP Tools Implementation

### Base Tool Interface

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/mcp/tools/MCPTool.kt

import kotlinx.serialization.json.JsonObject

/**
 * Base interface for MCP tools
 */
interface MCPTool {
    val name: String
    val description: String
    val inputSchema: JsonObject
    
    /**
     * Execute the tool with given arguments
     */
    suspend fun execute(arguments: JsonObject): JsonObject
}
```

### Create Project Tool

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/mcp/tools/CreateProjectTool.kt

/**
 * Tool for creating new projects
 */
class CreateProjectTool(
    private val projectService: ProjectApplicationService
) : MCPTool {
    
    override val name = "cycletime_ce_create_project"
    
    override val description = "Create a new project"
    
    override val inputSchema = buildJsonObject {
        put("type", "object")
        put("properties", buildJsonObject {
            put("name", buildJsonObject {
                put("type", "string")
                put("description", "Project name")
            })
            put("description", buildJsonObject {
                put("type", "string")
                put("description", "Project description")
            })
        })
        put("required", buildJsonArray {
            add("name")
        })
    }
    
    override suspend fun execute(arguments: JsonObject): JsonObject {
        val name = arguments["name"]?.jsonPrimitive?.content
            ?: throw ValidationException("Project name is required")
        
        val description = arguments["description"]?.jsonPrimitive?.content ?: ""
        
        val project = projectService.createProject(
            CreateProjectCommand(name, description)
        )
        
        return buildJsonObject {
            put("success", true)
            put("project", buildJsonObject {
                put("id", project.id)
                put("name", project.name)
                put("description", project.description)
                put("status", project.status)
            })
        }
    }
}
```

### Create Issue Tool

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/mcp/tools/CreateIssueTool.kt

/**
 * Tool for creating issues
 */
class CreateIssueTool(
    private val issueService: IssueApplicationService
) : MCPTool {
    
    override val name = "cycletime_ce_create_issue"
    
    override val description = "Create a new issue in a project"
    
    override val inputSchema = buildJsonObject {
        put("type", "object")
        put("properties", buildJsonObject {
            put("projectId", buildJsonObject {
                put("type", "string")
                put("description", "Project ID")
            })
            put("title", buildJsonObject {
                put("type", "string")
                put("description", "Issue title")
            })
            put("description", buildJsonObject {
                put("type", "string")
                put("description", "Issue description")
            })
            put("type", buildJsonObject {
                put("type", "string")
                put("enum", buildJsonArray {
                    add("epic")
                    add("story")
                    add("subtask")
                })
                put("description", "Issue type")
            })
            put("parentId", buildJsonObject {
                put("type", "string")
                put("description", "Parent issue ID (optional)")
            })
            put("estimate", buildJsonObject {
                put("type", "number")
                put("description", "Story points estimate (optional)")
            })
        })
        put("required", buildJsonArray {
            add("projectId")
            add("title")
            add("type")
        })
    }
    
    override suspend fun execute(arguments: JsonObject): JsonObject {
        val projectId = arguments["projectId"]?.jsonPrimitive?.content
            ?: throw ValidationException("Project ID is required")
        
        val title = arguments["title"]?.jsonPrimitive?.content
            ?: throw ValidationException("Title is required")
        
        val type = arguments["type"]?.jsonPrimitive?.content
            ?.let { IssueType.valueOf(it.uppercase()) }
            ?: throw ValidationException("Issue type is required")
        
        val description = arguments["description"]?.jsonPrimitive?.content ?: ""
        val parentId = arguments["parentId"]?.jsonPrimitive?.content
        val estimate = arguments["estimate"]?.jsonPrimitive?.int
        
        val issue = issueService.createIssue(
            CreateIssueCommand(
                projectId = ProjectId(projectId),
                title = title,
                description = description,
                type = type,
                parentId = parentId?.let { IssueId(it) },
                estimate = estimate
            )
        )
        
        return buildJsonObject {
            put("success", true)
            put("issue", buildJsonObject {
                put("id", issue.id)
                put("title", issue.title)
                put("type", issue.type)
                put("status", issue.status)
                if (parentId != null) {
                    put("parentId", parentId)
                }
            })
        }
    }
}
```

### Update Issue Status Tool

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/mcp/tools/UpdateIssueStatusTool.kt

/**
 * Tool for updating issue status
 */
class UpdateIssueStatusTool(
    private val issueService: IssueApplicationService
) : MCPTool {
    
    override val name = "cycletime_ce_update_issue_status"
    
    override val description = "Update the status of an issue"
    
    override val inputSchema = buildJsonObject {
        put("type", "object")
        put("properties", buildJsonObject {
            put("issueId", buildJsonObject {
                put("type", "string")
                put("description", "Issue ID")
            })
            put("status", buildJsonObject {
                put("type", "string")
                put("enum", buildJsonArray {
                    add("todo")
                    add("in_progress")
                    add("in_review")
                    add("done")
                    add("blocked")
                })
                put("description", "New status")
            })
        })
        put("required", buildJsonArray {
            add("issueId")
            add("status")
        })
    }
    
    override suspend fun execute(arguments: JsonObject): JsonObject {
        val issueId = arguments["issueId"]?.jsonPrimitive?.content
            ?: throw ValidationException("Issue ID is required")
        
        val status = arguments["status"]?.jsonPrimitive?.content
            ?.let { IssueStatus.valueOf(it.uppercase()) }
            ?: throw ValidationException("Status is required")
        
        val issue = issueService.updateIssueStatus(
            IssueId(issueId),
            status
        )
        
        return buildJsonObject {
            put("success", true)
            put("issue", buildJsonObject {
                put("id", issue.id)
                put("title", issue.title)
                put("status", issue.status)
                put("updatedAt", issue.updatedAt.toString())
            })
        }
    }
}
```

## MCP Prompts Implementation

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/mcp/prompts/MCPPrompt.kt

/**
 * Base interface for MCP prompts
 */
interface MCPPrompt {
    val name: String
    val description: String
    val arguments: List<PromptArgument>
    
    /**
     * Generate prompt with given arguments
     */
    fun generate(args: Map<String, String>): String
}

@Serializable
data class PromptArgument(
    val name: String,
    val description: String,
    val required: Boolean = false
)

/**
 * Example prompt for project setup
 */
class ProjectSetupPrompt : MCPPrompt {
    override val name = "project_setup"
    
    override val description = "Generate project setup instructions"
    
    override val arguments = listOf(
        PromptArgument("project_type", "Type of project (web, api, mobile)", true),
        PromptArgument("language", "Primary programming language", true),
        PromptArgument("framework", "Framework to use", false)
    )
    
    override fun generate(args: Map<String, String>): String {
        val projectType = args["project_type"] ?: throw IllegalArgumentException("project_type required")
        val language = args["language"] ?: throw IllegalArgumentException("language required")
        val framework = args["framework"] ?: "none"
        
        return """
        Please help me set up a new $projectType project using $language.
        ${if (framework != "none") "I want to use $framework as the framework." else ""}
        
        Please create:
        1. Project structure
        2. Configuration files
        3. Initial documentation
        4. Basic CI/CD setup
        5. Testing framework
        """.trimIndent()
    }
}
```

## DI Configuration for MCP

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/di/MCPModule.kt

import io.ktor.server.application.*
import io.ktor.server.di.*

/**
 * MCP dependency injection module
 */
val mcpModule = DIModule("mcp") {
    // Resources
    single<ProjectResource> {
        ProjectResource(get())
    }
    
    single<IssueResource> {
        IssueResource(get())
    }
    
    single<WorkflowResource> {
        WorkflowResource(get())
    }
    
    // Tools
    single<CreateProjectTool> {
        CreateProjectTool(get())
    }
    
    single<CreateIssueTool> {
        CreateIssueTool(get())
    }
    
    single<UpdateIssueStatusTool> {
        UpdateIssueStatusTool(get())
    }
    
    single<AddDependencyTool> {
        AddDependencyTool(get())
    }
    
    // Prompts
    single<ProjectSetupPrompt> {
        ProjectSetupPrompt()
    }
    
    single<TDDWorkflowPrompt> {
        TDDWorkflowPrompt()
    }
    
    // MCP Server
    single<CycleTime CEMCPServer> {
        CycleTime CEMCPServer(
            resources = listOf(get<ProjectResource>(), get<IssueResource>(), get<WorkflowResource>()),
            tools = listOf(
                get<CreateProjectTool>(),
                get<CreateIssueTool>(),
                get<UpdateIssueStatusTool>(),
                get<AddDependencyTool>()
            ),
            prompts = listOf(get<ProjectSetupPrompt>(), get<TDDWorkflowPrompt>())
        )
    }
}

/**
 * Configure MCP in application
 */
fun Application.configureMCP() {
    val mcpServer = dependencies.get<CycleTime CEMCPServer>()
    with(mcpServer) {
        configureMCP()
    }
}
```

## Testing MCP Integration

### WebSocket Testing

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/mcp/MCPServerTest.kt

import io.ktor.client.plugins.websocket.*
import io.ktor.server.testing.*
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import kotlinx.serialization.json.*

class MCPServerTest : DescribeSpec({
    
    describe("MCP Server") {
        
        describe("WebSocket connection") {
            it("should handle MCP handshake") {
                testApplication {
                    application {
                        configureDependencies()
                        configureMCP()
                    }
                    
                    val client = createClient {
                        install(WebSockets)
                    }
                    
                    client.webSocket("/mcp") {
                        // Send initialize
                        val initRequest = buildJsonObject {
                            put("jsonrpc", "2.0")
                            put("method", "initialize")
                            put("id", 1)
                            put("params", buildJsonObject {
                                put("protocolVersion", "1.0")
                                put("clientInfo", buildJsonObject {
                                    put("name", "test")
                                    put("version", "1.0")
                                })
                            })
                        }
                        
                        send(Frame.Text(initRequest.toString()))
                        
                        val response = incoming.receive() as Frame.Text
                        val json = Json.parseToJsonElement(response.readText()).jsonObject
                        
                        json["jsonrpc"]?.jsonPrimitive?.content shouldBe "2.0"
                        json["id"]?.jsonPrimitive?.int shouldBe 1
                        json["result"]?.jsonObject?.get("protocolVersion")?.jsonPrimitive?.content shouldBe "1.0"
                    }
                }
            }
        }
        
        describe("Resource operations") {
            it("should list available resources") {
                testApplication {
                    TestFixtures.withProject { projectId ->
                        client.webSocket("/mcp") {
                            MCPTestHelper.initialize(this)
                            
                            val listRequest = buildJsonObject {
                                put("jsonrpc", "2.0")
                                put("method", "resources/list")
                                put("id", 2)
                            }
                            
                            send(Frame.Text(listRequest.toString()))
                            
                            val response = incoming.receive() as Frame.Text
                            val json = Json.parseToJsonElement(response.readText()).jsonObject
                            val resources = json["result"]?.jsonObject?.get("resources")?.jsonArray
                            
                            resources?.size shouldBeGreaterThan 0
                            resources?.any { 
                                it.jsonObject["uri"]?.jsonPrimitive?.content == "jcvd://project/$projectId"
                            } shouldBe true
                        }
                    }
                }
            }
        }
        
        describe("Tool execution") {
            it("should execute create project tool") {
                testApplication {
                    application {
                        configureDependencies()
                        configureMCP()
                    }
                    
                    client.webSocket("/mcp") {
                        MCPTestHelper.initialize(this)
                        
                        val toolCall = buildJsonObject {
                            put("jsonrpc", "2.0")
                            put("method", "tools/call")
                            put("id", 3)
                            put("params", buildJsonObject {
                                put("name", "cycletime_ce_create_project")
                                put("arguments", buildJsonObject {
                                    put("name", "Test Project")
                                    put("description", "Created via MCP")
                                })
                            })
                        }
                        
                        send(Frame.Text(toolCall.toString()))
                        
                        val response = incoming.receive() as Frame.Text
                        val json = Json.parseToJsonElement(response.readText()).jsonObject
                        val content = json["result"]?.jsonObject?.get("content")?.jsonArray?.first()
                        val resultText = content?.jsonObject?.get("text")?.jsonPrimitive?.content
                        val result = Json.parseToJsonElement(resultText ?: "{}").jsonObject
                        
                        result["success"]?.jsonPrimitive?.boolean shouldBe true
                        result["project"]?.jsonObject?.get("name")?.jsonPrimitive?.content shouldBe "Test Project"
                    }
                }
            }
        }
    }
})
```

### Mock MCP Client

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/testing/mocks/MockMCPClient.kt

import io.ktor.websocket.*
import kotlinx.coroutines.channels.Channel
import kotlinx.serialization.json.*

/**
 * Mock MCP client for testing
 */
class MockMCPClient {
    private val responses = Channel<JsonRpcResponse>()
    private var requestId = 1
    
    suspend fun initialize(): JsonRpcResponse {
        val request = JsonRpcRequest(
            method = "initialize",
            params = buildJsonObject {
                put("protocolVersion", "1.0")
                put("clientInfo", buildJsonObject {
                    put("name", "mock-client")
                    put("version", "1.0")
                })
            },
            id = JsonPrimitive(requestId++)
        )
        
        // Simulate server response
        return JsonRpcResponse(
            jsonrpc = "2.0",
            id = request.id,
            result = buildJsonObject {
                put("protocolVersion", "1.0")
                put("serverInfo", buildJsonObject {
                    put("name", "CycleTime CE MCP Server")
                    put("version", "1.0.0")
                })
            }
        )
    }
    
    suspend fun listResources(): List<ResourceDescriptor> {
        val request = JsonRpcRequest(
            method = "resources/list",
            id = JsonPrimitive(requestId++)
        )
        
        // Mock response
        return listOf(
            ResourceDescriptor(
                uri = "jcvd://projects",
                name = "All Projects",
                description = "List of all projects"
            )
        )
    }
    
    suspend fun readResource(uri: String): ResourceContent {
        return ResourceContent(
            uri = uri,
            mimeType = "application/json",
            text = "{\"mock\": \"data\"}"
        )
    }
    
    suspend fun callTool(name: String, arguments: JsonObject): JsonObject {
        return buildJsonObject {
            put("success", true)
            put("result", "mock result")
        }
    }
}
```

## Error Handling

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/mcp/exceptions/MCPExceptions.kt

/**
 * Base exception for MCP errors
 */
sealed class MCPException(
    message: String,
    val errorCode: Int
) : Exception(message)

/**
 * Resource not found
 */
class ResourceNotFoundException(
    message: String
) : MCPException(message, -32602)

/**
 * Tool execution failed
 */
class ToolExecutionException(
    message: String,
    cause: Throwable? = null
) : MCPException(message, -32603)

/**
 * Invalid request
 */
class InvalidRequestException(
    message: String
) : MCPException(message, -32600)

/**
 * Method not found
 */
class MethodNotFoundException(
    method: String
) : MCPException("Method not found: $method", -32601)
```

## Performance Monitoring

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/mcp/monitoring/MCPMetrics.kt

import io.micrometer.core.instrument.MeterRegistry
import io.micrometer.core.instrument.Timer
import java.time.Duration

/**
 * MCP performance metrics
 */
class MCPMetrics(
    private val registry: MeterRegistry
) {
    private val connectionCounter = registry.counter("mcp.connections")
    private val messageCounter = registry.counter("mcp.messages")
    private val errorCounter = registry.counter("mcp.errors")
    
    private val resourceReadTimer = registry.timer("mcp.resource.read")
    private val toolExecutionTimer = registry.timer("mcp.tool.execution")
    
    fun recordConnection() {
        connectionCounter.increment()
    }
    
    fun recordMessage(method: String) {
        messageCounter.increment()
        registry.counter("mcp.method", "method", method).increment()
    }
    
    fun recordError(errorCode: Int) {
        errorCounter.increment()
        registry.counter("mcp.error", "code", errorCode.toString()).increment()
    }
    
    fun <T> measureResourceRead(block: () -> T): T {
        return resourceReadTimer.recordCallable(block)!!
    }
    
    fun <T> measureToolExecution(toolName: String, block: () -> T): T {
        return Timer.Sample.start(registry).stop(
            registry.timer("mcp.tool", "name", toolName)
        ).let { block() }
    }
}
```

## Best Practices

1. **Resource URIs**: Use consistent, hierarchical URI patterns
2. **Tool Naming**: Prefix tools with namespace (e.g., `cycletime_ce_`)
3. **Error Handling**: Return proper JSON-RPC error codes
4. **Validation**: Validate all inputs before processing
5. **Async Operations**: Use coroutines for non-blocking I/O
6. **Testing**: Test both happy path and error scenarios
7. **Monitoring**: Track metrics for performance analysis
8. **Documentation**: Keep tool schemas up to date
9. **Security**: Validate and sanitize all inputs
10. **Versioning**: Support protocol version negotiation

## Summary

This MCP integration provides:
- **Full MCP Protocol Support**: Resources, Tools, and Prompts
- **WebSocket Transport**: Real-time bidirectional communication
- **JSON-RPC 2.0**: Standard protocol implementation
- **DI Integration**: Clean dependency injection
- **Comprehensive Testing**: Unit and integration tests
- **Performance Monitoring**: Metrics and observability
- **Error Handling**: Robust error management
