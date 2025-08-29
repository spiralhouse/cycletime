package io.spiralhouse.cycletime.infrastructure.di.modules

import io.spiralhouse.cycletime.infrastructure.di.core.AbstractDIModule
import io.spiralhouse.cycletime.infrastructure.di.core.DIContainer
import io.spiralhouse.cycletime.mcp.handlers.DefaultWebSocketHandler
import io.spiralhouse.cycletime.mcp.handlers.WebSocketHandler
import io.spiralhouse.cycletime.mcp.providers.*
import io.spiralhouse.cycletime.mcp.server.DefaultMCPServerEngine
import io.spiralhouse.cycletime.mcp.server.MCPServerEngine
import io.spiralhouse.cycletime.mcp.tools.*
import kotlin.reflect.KClass

/**
 * MCP (Model Context Protocol) layer dependency injection module.
 * 
 * This module configures:
 * - MCP server engine
 * - Resource providers
 * - Tool providers
 * - WebSocket handlers
 * - Protocol configurations
 */
class MCPModuleNew : AbstractDIModule() {
    
    override val name: String = "MCPModule"
    override val priority: Int = 40 // MCP configured after application
    
    override fun configureCommon(builder: DIContainer.Builder) {
        // MCP Server Engine
        builder.singleton<MCPServerEngine, DefaultMCPServerEngine>()
        
        // WebSocket Handler
        builder.singleton<WebSocketHandler, DefaultWebSocketHandler>()
        
        // Resource Providers
        builder.singleton<ProjectResourceProvider, DefaultProjectResourceProvider>()
        builder.singleton<IssueResourceProvider, DefaultIssueResourceProvider>()
        builder.singleton<SessionResourceProvider, DefaultSessionResourceProvider>()
        builder.singleton<WorkflowResourceProvider, DefaultWorkflowResourceProvider>()
        
        // Tool Providers
        builder.singleton<ProjectToolProvider, DefaultProjectToolProvider>()
        builder.singleton<IssueToolProvider, DefaultIssueToolProvider>()
        builder.singleton<SessionToolProvider, DefaultSessionToolProvider>()
    }
    
    override fun configureDev(builder: DIContainer.Builder) {
        // Development: Add debug decorators
        builder.decorate<MCPServerEngine> { engine ->
            DebugMCPServerEngine(engine)
        }
    }
    
    override fun configureTest(builder: DIContainer.Builder) {
        // Test: Use minimal providers
        // Resource providers already configured in common
    }
    
    override fun configureProd(builder: DIContainer.Builder) {
        // Production: Add monitoring and validation
        builder.decorate<MCPServerEngine> { engine ->
            MonitoringMCPServerEngine(engine)
        }
    }
}

/**
 * Debug decorator for MCP server engine.
 */
class DebugMCPServerEngine(
    private val delegate: MCPServerEngine
) : MCPServerEngine by delegate {
    // Add debug logging
}

/**
 * Monitoring decorator for MCP server engine.
 */
class MonitoringMCPServerEngine(
    private val delegate: MCPServerEngine
) : MCPServerEngine by delegate {
    // Add monitoring metrics
}

/**
 * Legacy MCP module for backward compatibility.
 * @deprecated Use MCPModuleNew with the new DI system
 */
@Deprecated("Use MCPModuleNew with the new DI system", ReplaceWith("MCPModuleNew"))
class MCPModule private constructor(
    private val resourceProviders: List<KClass<out ResourceProvider>>,
    private val toolProviders: List<KClass<out ToolProvider>>,
    private val customToolProviders: Map<String, KClass<out ToolProvider>>,
    private val protocolVersion: String,
    private val jsonSerialization: Boolean,
    private val capabilities: Set<String>,
    private val debugMode: Boolean,
    private val requestLogging: Boolean,
    private val schemaValidation: Boolean,
    private val toolValidation: Boolean,
    private val resourceSubscriptions: Boolean,
    private val changeNotifications: Boolean,
    private val metricsCollection: Boolean,
    private val requestTracing: Boolean,
    private val errorHandling: Boolean,
    private val errorRecovery: Boolean,
    private val securityEnabled: Boolean,
    private val authenticationEnabled: Boolean,
    private val authorizationEnabled: Boolean
) {
    
    class Builder {
        internal val resourceProviders = mutableListOf<KClass<out ResourceProvider>>()
        internal val toolProviders = mutableListOf<KClass<out ToolProvider>>()
        private val customToolProviders = mutableMapOf<String, KClass<out ToolProvider>>()
        private var protocolVersion = "2024-11-05"
        private var jsonSerialization = true
        private val capabilities = mutableSetOf("resources", "tools")
        private var debugMode = false
        private var requestLogging = false
        private var schemaValidation = false
        private var toolValidation = false
        private var resourceSubscriptions = false
        private var changeNotifications = false
        private var metricsCollection = false
        private var requestTracing = false
        private var errorHandling = false
        private var errorRecovery = false
        private var securityEnabled = false
        private var authenticationEnabled = false
        private var authorizationEnabled = false
        
        fun withDefaultProviders(): Builder {
            resourceProviders.addAll(listOf(
                ProjectResourceProvider::class,
                IssueResourceProvider::class,
                SessionResourceProvider::class,
                WorkflowResourceProvider::class
            ))
            return this
        }
        
        fun withDefaultTools(): Builder {
            toolProviders.addAll(listOf(
                ProjectToolProvider::class,
                IssueToolProvider::class,
                SessionToolProvider::class
            ))
            return this
        }
        
        fun <T : ResourceProvider> withResourceProvider(clazz: kotlin.reflect.KClass<T>): Builder {
            resourceProviders.add(clazz)
            return this
        }
        
        fun <T : ToolProvider> withToolProvider(clazz: kotlin.reflect.KClass<T>): Builder {
            toolProviders.add(clazz)
            return this
        }
        
        fun withCustomToolProvider(name: String, providerClass: KClass<out ToolProvider>): Builder {
            customToolProviders[name] = providerClass
            return this
        }
        
        fun withProtocolVersion(version: String): Builder {
            protocolVersion = version
            return this
        }
        
        fun withJsonSerialization(): Builder {
            jsonSerialization = true
            return this
        }
        
        fun withDebugMode(): Builder {
            debugMode = true
            return this
        }
        
        fun withRequestLogging(): Builder {
            requestLogging = true
            return this
        }
        
        fun withSchemaValidation(): Builder {
            schemaValidation = true
            return this
        }
        
        fun withToolValidation(): Builder {
            toolValidation = true
            return this
        }
        
        fun withResourceSubscriptions(): Builder {
            resourceSubscriptions = true
            capabilities.add("subscriptions")
            return this
        }
        
        fun withChangeNotifications(): Builder {
            changeNotifications = true
            return this
        }
        
        fun withMetricsCollection(): Builder {
            metricsCollection = true
            return this
        }
        
        fun withRequestTracing(): Builder {
            requestTracing = true
            return this
        }
        
        fun withErrorHandling(): Builder {
            errorHandling = true
            return this
        }
        
        fun withErrorRecovery(): Builder {
            errorRecovery = true
            return this
        }
        
        fun withSecurityEnabled(): Builder {
            securityEnabled = true
            return this
        }
        
        fun withAuthentication(): Builder {
            authenticationEnabled = true
            return this
        }
        
        fun withAuthorization(): Builder {
            authorizationEnabled = true
            return this
        }
        
        fun build(): MCPModule {
            return MCPModule(
                resourceProviders = resourceProviders.toList(),
                toolProviders = toolProviders.toList(),
                customToolProviders = customToolProviders.toMap(),
                protocolVersion = protocolVersion,
                jsonSerialization = jsonSerialization,
                capabilities = capabilities.toSet(),
                debugMode = debugMode,
                requestLogging = requestLogging,
                schemaValidation = schemaValidation,
                toolValidation = toolValidation,
                resourceSubscriptions = resourceSubscriptions,
                changeNotifications = changeNotifications,
                metricsCollection = metricsCollection,
                requestTracing = requestTracing,
                errorHandling = errorHandling,
                errorRecovery = errorRecovery,
                securityEnabled = securityEnabled,
                authenticationEnabled = authenticationEnabled,
                authorizationEnabled = authorizationEnabled
            )
        }
    }
    
    fun getResourceProviders(): List<KClass<out ResourceProvider>> = resourceProviders
    fun getToolProviders(): List<KClass<out ToolProvider>> = toolProviders
    fun getCustomToolProviders(): Map<String, KClass<out ToolProvider>> = customToolProviders
    fun getProtocolVersion(): String = protocolVersion
    fun getCapabilities(): Set<String> = capabilities
    fun isDebugMode(): Boolean = debugMode
    fun isRequestLogging(): Boolean = requestLogging
    
    companion object {
        fun builder(): Builder = Builder()
        
        fun withDefaults(): MCPModule {
            return builder()
                .withDefaultProviders()
                .withDefaultTools()
                .build()
        }
        
        fun forEnvironment(profile: String): MCPModule {
            return when (profile.lowercase()) {
                "test", "testing" -> builder()
                    .withResourceProvider(ProjectResourceProvider::class)
                    .withResourceProvider(IssueResourceProvider::class)
                    .withDebugMode()
                    .withRequestLogging()
                    .build()
                    
                "dev", "development" -> builder()
                    .withDefaultProviders()
                    .withDefaultTools()
                    .withDebugMode()
                    .build()
                    
                "prod", "production" -> builder()
                    .withDefaultProviders()
                    .withDefaultTools()
                    .withSchemaValidation()
                    .withToolValidation()
                    .withSecurityEnabled()
                    .withAuthentication()
                    .withAuthorization()
                    .build()
                    
                else -> withDefaults()
            }
        }
    }
}