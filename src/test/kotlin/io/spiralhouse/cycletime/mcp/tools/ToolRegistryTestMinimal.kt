package io.spiralhouse.cycletime.mcp.tools

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import kotlinx.serialization.json.*

class ToolRegistryTestMinimal : DescribeSpec({

    describe("ToolRegistry") {
        lateinit var registry: ToolRegistry

        beforeEach {
            registry = ToolRegistry()
        }

        it("minimal test") {
            val tool = Tool(
                name = "test.tool",
                description = "Test tool", 
                parametersSchema = buildJsonObject { put("type", "object") },
                handler = { Result.success(JsonPrimitive("test")) }
            )

            val success = registry.register(tool)
            success shouldBe true
        }
    }
})

fun createTestTool(): Tool {
    return Tool(
        name = "test.simple",
        description = "Test tool",
        parametersSchema = buildJsonObject { put("type", "object") },
        handler = { Result.success(JsonPrimitive("test")) }
    )
}