package io.spiralhouse.cycletime.mcp.protocol

import kotlinx.serialization.json.*

/**
 * Utility object for converting between Kotlin types and JsonElement.
 * 
 * This object centralizes the logic for converting various Kotlin types
 * to their JsonElement representations, ensuring consistency across
 * the protocol handler implementation.
 */
internal object JsonElementConverter {
    
    /**
     * Converts any value to a JsonElement.
     * 
     * @param value The value to convert
     * @return JsonElement representation of the value
     */
    fun toJsonElement(value: Any?): JsonElement {
        return when (value) {
            null -> JsonNull
            is JsonElement -> value
            is String -> JsonPrimitive(value)
            is Number -> JsonPrimitive(value)
            is Boolean -> JsonPrimitive(value)
            is List<*> -> JsonArray(value.map { toJsonElement(it) })
            is Map<*, *> -> buildJsonObject {
                value.forEach { (k, v) ->
                    put(k.toString(), toJsonElement(v))
                }
            }
            else -> JsonPrimitive(value.toString())
        }
    }
    
    /**
     * Converts a value specifically for use as a JSON-RPC ID.
     * IDs can only be strings, numbers, or null according to the spec.
     * 
     * @param id The ID value to convert
     * @return JsonElement representation suitable for use as an ID
     */
    fun toJsonRpcId(id: Any?): JsonElement {
        return when (id) {
            null -> JsonNull
            is JsonElement -> id
            is String -> JsonPrimitive(id)
            is Number -> JsonPrimitive(id)
            is Boolean -> JsonPrimitive(id) // Boolean IDs are technically allowed
            else -> JsonPrimitive(id.toString())
        }
    }
}