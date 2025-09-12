import kotlinx.serialization.json.*

// Reproduce the formatToolResponse logic exactly as in McpMethodHandler
fun formatToolResponse(value: JsonElement): JsonObject {
    val textValue = when {
        value is JsonPrimitive && value.isString -> value.content
        value is JsonPrimitive && value.isString.not() -> value.content
        value is JsonObject -> {
            // Handle domain object responses - convert to pretty JSON string
            Json { prettyPrint = true }.encodeToString(value)
        }
        value is JsonArray -> {
            // Handle array responses - convert to pretty JSON string  
            Json { prettyPrint = true }.encodeToString(value)
        }
        else -> value.toString().trim('"')
    }
    
    return buildJsonObject {
        put("content", buildJsonArray {
            add(buildJsonObject {
                put("type", "text")
                put("text", textValue)
            })
        })
    }
}

fun main() {
    // Test with JsonPrimitive like the tool returns
    val projectId = JsonPrimitive("project-id-12345")
    val formatted = formatToolResponse(projectId)
    
    println("Input: $projectId")
    println("Output: $formatted")
    
    // Test what the test is checking
    val content = formatted["content"]?.jsonArray?.get(0)?.jsonObject
    val type = content?.get("type")?.jsonPrimitive?.content
    val text = content?.get("text")?.jsonPrimitive?.content
    
    println("Content type: $type")
    println("Content text: $text")
    println("Type matches 'text': ${type == "text"}")
}