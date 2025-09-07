package io.spiralhouse.cycletime.mcp.resources.rpc

import kotlinx.serialization.json.JsonObject

/**
 * Command pattern interface for RPC method execution
 * 
 * This interface enables a clean separation of RPC method logic,
 * making the handler more maintainable and testable.
 */
interface RpcCommand {
    /**
     * Execute the RPC command
     * 
     * @param params The parameters for the command
     * @return The result as a JsonObject
     */
    suspend fun execute(params: JsonObject): JsonObject
    
    /**
     * Validate the parameters for this command
     * 
     * @param params The parameters to validate
     * @return true if valid, false otherwise
     */
    fun validate(params: JsonObject): Boolean
}