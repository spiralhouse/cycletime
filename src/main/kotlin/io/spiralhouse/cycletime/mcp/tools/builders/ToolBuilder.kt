package io.spiralhouse.cycletime.mcp.tools.builders

import io.spiralhouse.cycletime.mcp.tools.Tool
import io.spiralhouse.cycletime.mcp.tools.ToolHandler
import kotlinx.serialization.json.*

/**
 * Builder for creating Tool instances with a fluent API.
 * 
 * Example usage:
 * ```kotlin
 * val tool = ToolBuilder()
 *     .name("calculator.add")
 *     .description("Adds two numbers")
 *     .parameter("a", "number", required = true) {
 *         minimum(0)
 *         maximum(1000)
 *     }
 *     .parameter("b", "number", required = true) {
 *         minimum(0)
 *         maximum(1000)
 *     }
 *     .handler { params ->
 *         val a = params.jsonObject["a"]?.jsonPrimitive?.double ?: 0.0
 *         val b = params.jsonObject["b"]?.jsonPrimitive?.double ?: 0.0
 *         Result.success(JsonPrimitive(a + b))
 *     }
 *     .build()
 * ```
 */
class ToolBuilder {
    private var name: String? = null
    private var description: String = ""
    private val parameters = mutableMapOf<String, JsonObject>()
    private val requiredParameters = mutableListOf<String>()
    private var handler: ((JsonElement) -> Result<JsonElement>)? = null
    
    /**
     * Set the tool name (required).
     */
    fun name(name: String): ToolBuilder {
        this.name = name
        return this
    }
    
    /**
     * Set the tool description.
     */
    fun description(description: String): ToolBuilder {
        this.description = description
        return this
    }
    
    /**
     * Add a parameter to the tool schema.
     */
    fun parameter(
        name: String,
        type: String,
        required: Boolean = false,
        configure: ParameterBuilder.() -> Unit = {}
    ): ToolBuilder {
        val paramBuilder = ParameterBuilder(type)
        paramBuilder.configure()
        parameters[name] = paramBuilder.build()
        
        if (required) {
            requiredParameters.add(name)
        }
        
        return this
    }
    
    /**
     * Set the tool handler function.
     */
    fun handler(handler: (JsonElement) -> Result<JsonElement>): ToolBuilder {
        this.handler = handler
        return this
    }
    
    /**
     * Build the Tool instance.
     * 
     * @throws IllegalStateException if required fields are missing
     */
    fun build(): Tool {
        val toolName = name ?: error("Tool name is required")
        val toolHandler = handler ?: error("Tool handler is required")
        
        val schema = buildJsonObject {
            put("type", "object")
            if (parameters.isNotEmpty()) {
                put("properties", JsonObject(parameters))
            }
            if (requiredParameters.isNotEmpty()) {
                put("required", JsonArray(requiredParameters.map { JsonPrimitive(it) }))
            }
        }
        
        return Tool(
            name = toolName,
            description = description,
            parametersSchema = schema,
            handler = toolHandler
        )
    }
}

/**
 * Builder for creating AsyncTool instances with a fluent API.
 * AsyncTool is now just a type alias for Tool with async handler.
 */
class AsyncToolBuilder {
    private var name: String? = null
    private var description: String = ""
    private val parameters = mutableMapOf<String, JsonObject>()
    private val requiredParameters = mutableListOf<String>()
    private var handler: (suspend (JsonElement) -> Result<JsonElement>)? = null
    
    /**
     * Set the tool name (required).
     */
    fun name(name: String): AsyncToolBuilder {
        this.name = name
        return this
    }
    
    /**
     * Set the tool description.
     */
    fun description(description: String): AsyncToolBuilder {
        this.description = description
        return this
    }
    
    /**
     * Add a parameter to the tool schema.
     */
    fun parameter(
        name: String,
        type: String,
        required: Boolean = false,
        configure: ParameterBuilder.() -> Unit = {}
    ): AsyncToolBuilder {
        val paramBuilder = ParameterBuilder(type)
        paramBuilder.configure()
        parameters[name] = paramBuilder.build()
        
        if (required) {
            requiredParameters.add(name)
        }
        
        return this
    }
    
    /**
     * Set the async tool handler function.
     */
    fun handler(handler: suspend (JsonElement) -> Result<JsonElement>): AsyncToolBuilder {
        this.handler = handler
        return this
    }
    
    /**
     * Build the Tool instance with async handler.
     * 
     * @throws IllegalStateException if required fields are missing
     */
    fun build(): Tool {
        val toolName = name ?: error("Tool name is required")
        val toolHandler = handler ?: error("Tool handler is required")
        
        val schema = buildJsonObject {
            put("type", "object")
            if (parameters.isNotEmpty()) {
                put("properties", JsonObject(parameters))
            }
            if (requiredParameters.isNotEmpty()) {
                put("required", JsonArray(requiredParameters.map { JsonPrimitive(it) }))
            }
        }
        
        return Tool(
            name = toolName,
            description = description,
            parametersSchema = schema,
            handler = ToolHandler.Async(toolHandler)
        )
    }
}

/**
 * Builder for configuring parameter schema properties.
 */
class ParameterBuilder(private val type: String) {
    private val properties = mutableMapOf<String, JsonElement>()
    
    /**
     * Set the minimum value for number parameters.
     */
    fun minimum(value: Number): ParameterBuilder {
        properties["minimum"] = JsonPrimitive(value)
        return this
    }
    
    /**
     * Set the maximum value for number parameters.
     */
    fun maximum(value: Number): ParameterBuilder {
        properties["maximum"] = JsonPrimitive(value)
        return this
    }
    
    /**
     * Set the minimum length for string parameters.
     */
    fun minLength(length: Int): ParameterBuilder {
        properties["minLength"] = JsonPrimitive(length)
        return this
    }
    
    /**
     * Set the maximum length for string parameters.
     */
    fun maxLength(length: Int): ParameterBuilder {
        properties["maxLength"] = JsonPrimitive(length)
        return this
    }
    
    /**
     * Set the items schema for array parameters.
     */
    fun items(itemType: String, configure: ParameterBuilder.() -> Unit = {}): ParameterBuilder {
        val itemBuilder = ParameterBuilder(itemType)
        itemBuilder.configure()
        properties["items"] = itemBuilder.build()
        return this
    }
    
    /**
     * Add a nested object property.
     */
    fun property(name: String, type: String, configure: ParameterBuilder.() -> Unit = {}): ParameterBuilder {
        if (!properties.containsKey("properties")) {
            properties["properties"] = JsonObject(emptyMap())
        }
        
        val propBuilder = ParameterBuilder(type)
        propBuilder.configure()
        
        val currentProps = (properties["properties"] as JsonObject).toMutableMap()
        currentProps[name] = propBuilder.build()
        properties["properties"] = JsonObject(currentProps)
        
        return this
    }
    
    /**
     * Set required properties for object parameters.
     */
    fun required(vararg fields: String): ParameterBuilder {
        properties["required"] = JsonArray(fields.map { JsonPrimitive(it) })
        return this
    }
    
    /**
     * Build the parameter schema.
     */
    internal fun build(): JsonObject {
        return buildJsonObject {
            put("type", type)
            properties.forEach { (key, value) ->
                put(key, value)
            }
        }
    }
}