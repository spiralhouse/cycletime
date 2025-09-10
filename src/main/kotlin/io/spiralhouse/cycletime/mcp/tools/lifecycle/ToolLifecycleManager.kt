package io.spiralhouse.cycletime.mcp.tools.lifecycle

import io.spiralhouse.cycletime.mcp.tools.Tool
import io.spiralhouse.cycletime.mcp.tools.interfaces.ToolRegistry
import io.spiralhouse.cycletime.mcp.tools.ToolProvider
import kotlinx.coroutines.*
import java.util.concurrent.ConcurrentHashMap

/**
 * Manages the lifecycle of tools including registration, activation, deactivation, and disposal.
 * 
 * This manager provides:
 * - Tool provider management
 * - Batch registration/unregistration
 * - Tool activation/deactivation states
 * - Resource cleanup on shutdown
 * 
 * @param registry The tool registry to manage
 * @param scope The coroutine scope for async operations
 */
class ToolLifecycleManager(
    private val registry: ToolRegistry,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.Default)
) {
    
    private val providers = ConcurrentHashMap<String, ToolProvider>()
    private val activeTool = ConcurrentHashMap<String, Boolean>()
    private val disposables = ConcurrentHashMap<String, () -> Unit>()
    
    /**
     * Register a tool provider and all its tools.
     * 
     * @param provider The tool provider to register
     * @return The number of tools successfully registered
     */
    fun registerProvider(provider: ToolProvider): Int {
        providers[provider.namespace] = provider
        
        var registered = 0
        provider.getTools().forEach { tool ->
            if (registry.register(tool)) {
                activeTool[tool.name] = true
                registered++
            }
        }
        
        provider.getAsyncTools().forEach { tool ->
            if (registry.register(tool)) {
                activeTool[tool.name] = true
                registered++
            }
        }
        
        return registered
    }
    
    /**
     * Unregister a tool provider and all its tools.
     * 
     * @param namespace The namespace of the provider to unregister
     * @return The number of tools successfully unregistered
     */
    fun unregisterProvider(namespace: String): Int {
        val provider = providers.remove(namespace) ?: return 0
        
        var unregistered = 0
        provider.getTools().forEach { tool ->
            if (registry.unregister(tool.name)) {
                activeTool.remove(tool.name)
                disposables.remove(tool.name)?.invoke()
                unregistered++
            }
        }
        
        provider.getAsyncTools().forEach { tool ->
            if (registry.unregister(tool.name)) {
                activeTool.remove(tool.name)
                disposables.remove(tool.name)?.invoke()
                unregistered++
            }
        }
        
        return unregistered
    }
    
    /**
     * Register a tool with an optional disposal callback.
     * Supports both sync and async tools.
     * 
     * @param tool The tool to register
     * @param onDispose Optional callback to invoke when the tool is unregistered
     * @return true if the tool was registered successfully
     */
    fun registerWithDisposal(tool: Tool, onDispose: (() -> Unit)? = null): Boolean {
        val registered = registry.register(tool)
        if (registered) {
            activeTool[tool.name] = true
            onDispose?.let { disposables[tool.name] = it }
        }
        return registered
    }
    
    /**
     * Batch register multiple tools.
     * 
     * @param tools The tools to register
     * @return List of tool names that were successfully registered
     */
    fun batchRegister(vararg tools: Tool): List<String> {
        return tools.mapNotNull { tool ->
            if (registry.register(tool)) {
                activeTool[tool.name] = true
                tool.name
            } else {
                null
            }
        }
    }
    
    /**
     * Batch register multiple async tools.
     * AsyncTool is now a type alias for Tool.
     * 
     * @param tools The async tools to register
     * @return List of tool names that were successfully registered
     */
    fun batchRegisterAsync(vararg tools: Tool): List<String> {
        return tools.mapNotNull { tool ->
            if (registry.register(tool)) {
                activeTool[tool.name] = true
                tool.name
            } else {
                null
            }
        }
    }
    
    /**
     * Batch unregister multiple tools.
     * 
     * @param toolNames The names of tools to unregister
     * @return List of tool names that were successfully unregistered
     */
    fun batchUnregister(vararg toolNames: String): List<String> {
        return toolNames.mapNotNull { name ->
            if (registry.unregister(name)) {
                activeTool.remove(name)
                disposables.remove(name)?.invoke()
                name
            } else {
                null
            }
        }
    }
    
    /**
     * Activate a tool (make it available for invocation).
     * 
     * @param toolName The name of the tool to activate
     * @return true if the tool exists and was activated
     */
    fun activate(toolName: String): Boolean {
        return if (registry.isRegistered(toolName)) {
            activeTool[toolName] = true
            true
        } else {
            false
        }
    }
    
    /**
     * Deactivate a tool (prevent invocation without unregistering).
     * 
     * @param toolName The name of the tool to deactivate
     * @return true if the tool exists and was deactivated
     */
    fun deactivate(toolName: String): Boolean {
        return if (registry.isRegistered(toolName)) {
            activeTool[toolName] = false
            true
        } else {
            false
        }
    }
    
    /**
     * Check if a tool is active.
     * 
     * @param toolName The name of the tool to check
     * @return true if the tool is registered and active
     */
    fun isActive(toolName: String): Boolean {
        return activeTool[toolName] ?: false
    }
    
    /**
     * Get all active tool names.
     * 
     * @return List of active tool names
     */
    fun getActiveTools(): List<String> {
        return activeTool.filter { it.value }.keys.sorted()
    }
    
    /**
     * Shutdown the lifecycle manager and clean up all resources.
     * 
     * This will:
     * - Unregister all tools
     * - Invoke all disposal callbacks
     * - Cancel the coroutine scope
     */
    fun shutdown() {
        // Unregister all providers
        providers.keys.toList().forEach { unregisterProvider(it) }
        
        // Invoke remaining disposal callbacks
        disposables.values.forEach { it.invoke() }
        disposables.clear()
        
        // Clear active tools
        activeTool.clear()
        
        // Cancel the scope
        scope.cancel()
    }
}