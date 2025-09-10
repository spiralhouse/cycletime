package io.spiralhouse.cycletime.mcp.tools.interfaces

import io.spiralhouse.cycletime.mcp.tools.Tool
import io.spiralhouse.cycletime.mcp.tools.ToolMetadata
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/**
 * Interface for managing tool registration, discovery, and metadata access.
 * 
 * Implementations should be thread-safe for concurrent operations.
 */
interface ToolRegistry {
    /**
     * Register a tool (supports both sync and async handlers).
     * 
     * @param tool The tool to register
     * @return true if the tool was registered successfully, false if a tool with the same name already exists
     */
    fun register(tool: Tool): Boolean
    
    /**
     * Update an existing tool implementation (supports both sync and async handlers).
     * 
     * @param tool The updated tool implementation
     * @return true if the tool was updated, false if no tool with that name exists
     */
    fun update(tool: Tool): Boolean
    
    /**
     * Unregister a tool by name.
     * 
     * @param toolName The name of the tool to unregister
     * @return true if a tool was unregistered, false if no tool with that name existed
     */
    fun unregister(toolName: String): Boolean
    
    /**
     * Check if a tool is registered.
     * 
     * @param toolName The name of the tool to check
     * @return true if the tool is registered, false otherwise
     */
    fun isRegistered(toolName: String): Boolean
    
    /**
     * Get a synchronous tool by name.
     * 
     * @param toolName The name of the tool to retrieve
     * @return The tool if found, null otherwise
     */
    fun getTool(toolName: String): Tool?
    
    
    /**
     * Get a sorted list of all registered tool names.
     * 
     * @return A sorted list of tool names
     */
    fun getRegisteredToolNames(): List<String>
    
    /**
     * Get metadata for a specific tool.
     * 
     * @param toolName The name of the tool
     * @return Tool metadata if the tool exists, null otherwise
     */
    fun getToolMetadata(toolName: String): ToolMetadata?
    
    /**
     * Get metadata for all registered tools.
     * 
     * @return A sorted list of tool metadata
     */
    fun getAllToolMetadata(): List<ToolMetadata>
    
    /**
     * Search tools by description keywords.
     * 
     * @param query The search query (case-insensitive)
     * @return A list of matching tool metadata
     */
    fun searchTools(query: String): List<ToolMetadata>
    
    /**
     * Get the parameter schema for a specific tool.
     * 
     * @param toolName The name of the tool
     * @return The JSON schema for the tool's parameters, or null if the tool doesn't exist
     */
    fun getParameterSchema(toolName: String): JsonObject?
}