package io.spiralhouse.cycletime.mcp.resources

import io.spiralhouse.cycletime.mcp.resources.exceptions.ProviderUnavailableException
import kotlinx.serialization.json.JsonObject

/**
 * Base interface for resource providers that manage and serve resources
 */
interface ResourceProvider {
    val name: String
    val isRunning: Boolean
    
    suspend fun start()
    suspend fun stop()
    suspend fun listResources(
        filter: ResourceFilter? = null,
        pagination: ResourcePagination? = null
    ): List<Resource>
    suspend fun getResource(uri: String): Resource?
    suspend fun searchResources(query: String): List<Resource>
    suspend fun updateResource(uri: String, content: ResourceContent)
    
    /**
     * Read the content of a resource by URI
     */
    suspend fun readResource(uri: String): String
}

/**
 * Metadata about a resource provider's capabilities and configuration
 */
data class ResourceProviderMetadata(
    val name: String,
    val description: String,
    val capabilities: Set<ResourceCapability>
)

/**
 * Capabilities that a resource provider may support
 */
enum class ResourceCapability {
    READ, WRITE, SUBSCRIBE, SEARCH
}

/**
 * Template for creating resources with predefined structure
 */
data class ResourceTemplate(
    val name: String,
    val schema: JsonObject
)

