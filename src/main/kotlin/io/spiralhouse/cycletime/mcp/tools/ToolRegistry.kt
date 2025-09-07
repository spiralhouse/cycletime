package io.spiralhouse.cycletime.mcp.tools

/**
 * Thread-safe registry for managing tool registration, discovery, and invocation.
 * 
 * This class maintains backward compatibility while delegating to DefaultToolRegistry.
 * New code should use DefaultToolRegistry directly or work with the ToolRegistry interface.
 * 
 * @deprecated Use DefaultToolRegistry or the ToolRegistry interface instead
 */
@Suppress("DEPRECATION")
class ToolRegistry : DefaultToolRegistry() {
    // All functionality is inherited from DefaultToolRegistry
    // This class exists only for backward compatibility
}