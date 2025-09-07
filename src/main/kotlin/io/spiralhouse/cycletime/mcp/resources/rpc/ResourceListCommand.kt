package io.spiralhouse.cycletime.mcp.resources.rpc

import io.spiralhouse.cycletime.mcp.resources.*
import io.spiralhouse.cycletime.mcp.resources.interfaces.ResourceRegistry
import kotlinx.serialization.json.*

/**
 * Command for handling resources/list RPC method
 */
class ResourceListCommand(
    private val registry: ResourceRegistry
) : RpcCommand {
    
    override suspend fun execute(params: JsonObject): JsonObject {
        val providerName = params["provider"]?.jsonPrimitive?.content
        val provider = if (providerName != null) {
            registry.getProvider(providerName)
        } else {
            registry.getProviders().firstOrNull()
        }
        
        val resources = provider?.listResources() ?: emptyList()
        
        return buildJsonObject {
            put("resources", JsonArray(resources.map { resourceToJson(it) }))
        }
    }
    
    override fun validate(params: JsonObject): Boolean {
        // Optional provider parameter, always valid
        return true
    }
    
    private fun resourceToJson(resource: Resource): JsonObject {
        return buildJsonObject {
            put("uri", JsonPrimitive(resource.uri))
            put("name", JsonPrimitive(resource.name))
            resource.description?.let { put("description", JsonPrimitive(it)) }
            put("mimeType", JsonPrimitive(resource.mimeType))
            
            resource.content?.let { content ->
                when (content) {
                    is ResourceContent.Text -> {
                        put("contents", buildJsonObject {
                            put("text", JsonPrimitive(content.data))
                        })
                    }
                    is ResourceContent.Binary -> {
                        put("contents", buildJsonObject {
                            put("blob", JsonPrimitive(content.data))
                        })
                    }
                }
            }
            
            resource.metadata?.let { metadata ->
                put("metadata", buildJsonObject {
                    put("created", JsonPrimitive(metadata.created.toString()))
                    put("modified", JsonPrimitive(metadata.modified.toString()))
                    put("size", JsonPrimitive(metadata.size))
                    metadata.version?.let { put("version", JsonPrimitive(it)) }
                })
            }
        }
    }
}