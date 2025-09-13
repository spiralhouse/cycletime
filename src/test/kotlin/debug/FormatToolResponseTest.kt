package debug

import kotlinx.serialization.json.*
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe

class FormatToolResponseTest : StringSpec({
    
    "formatToolResponse should work correctly for JsonPrimitive input" {
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
        
        // Test with JsonPrimitive like the tool returns
        val projectId = JsonPrimitive("project-id-12345")
        val formatted = formatToolResponse(projectId)
        
        println("Input: $projectId")
        println("Output: $formatted")
        
        // Test what the test is checking
        val content = formatted["content"]?.jsonArray?.get(0)?.jsonObject
        content shouldNotBe null
        
        val type = content!!["type"]?.jsonPrimitive?.content
        val text = content["text"]?.jsonPrimitive?.content
        
        println("Content type: $type")
        println("Content text: $text")
        
        type shouldBe "text"
        text shouldBe "project-id-12345"
    }
})