package io.spiralhouse.cycletime.mcp.integration

import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldNotContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.types.shouldBeInstanceOf
import io.kotest.assertions.throwables.shouldNotThrowAny
import io.spiralhouse.cycletime.mcp.integration.fixtures.MCPIntegrationTestBase
import io.spiralhouse.cycletime.mcp.integration.fixtures.TestDataFactory
import kotlinx.serialization.json.*

/**
 * Integration tests for SPI-664: Fix tools/call double content wrapping in MCP responses.
 *
 * These tests verify that tools/call responses follow the correct MCP protocol specification
 * for content structure, ensuring that the text field contains the actual data JSON directly,
 * NOT another nested content array.
 *
 * CURRENT BUG (Double-Wrapped Content):
 * ```json
 * {
 *   "result": {
 *     "content": [
 *       {
 *         "type": "text",
 *         "text": "{\"content\": [{\"type\": \"text\", \"text\": \"{actual data}\"}]}"
 *       }
 *     ]
 *   }
 * }
 * ```
 *
 * EXPECTED CORRECT STRUCTURE (Single-Level Content):
 * ```json
 * {
 *   "result": {
 *     "content": [
 *       {
 *         "type": "text",
 *         "text": "[{\"id\":\"proj_abc123\",\"name\":\"My Project\"}]"
 *       }
 *     ]
 *   }
 * }
 * ```
 *
 * RED PHASE EXPECTATION: ALL TESTS SHOULD FAIL
 * These tests will fail with the current implementation because:
 * - The text field currently contains a JSON string with ANOTHER content wrapper
 * - Clients must perform double JSON.parse() to access actual data
 * - The response structure violates MCP protocol specification
 *
 * GREEN PHASE SUCCESS: Tests will pass when:
 * - result.content[0].text contains the actual data JSON string directly
 * - Single JSON.parse() yields the expected data structure
 * - No nested content arrays within the text field
 */
class MCPToolsCallResponseFormatTest : MCPIntegrationTestBase() {

    init {
        "should return list_projects response with single-level content structure" {
            withTestApplication {
                val client = performCompleteHandshake()

                // Create a test project first
                val createRequest = TestDataFactory.createProjectToolCall(
                    name = "Response Format Test Project",
                    description = "Testing correct MCP response structure"
                )
                val createResponse = client.sendRequest(createRequest)

                // Now list projects
                val listRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "list-projects-format-test")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("name", "list_projects")
                        put("arguments", buildJsonObject { })
                    })
                }

                val response = client.sendRequest(listRequest)

                // CRITICAL ASSERTION: Validate correct single-level content structure
                validateSingleLevelContentStructure(
                    response = response,
                    testDescription = "list_projects should have single-level content"
                )

                // Extract and validate the text field contains actual data JSON
                val textContent = extractTextContentFromResponse(response)

                // CRITICAL: The text should be parseable as JSON array directly
                // NOT as another content wrapper
                val parsedData = shouldNotThrowAny {
                    Json.parseToJsonElement(textContent)
                }

                // FAIL CONDITION: If we find "content" key in parsed data, it means double-wrapping exists
                if (parsedData is JsonObject && parsedData.containsKey("content")) {
                    throw AssertionError(
                        """
                        |DOUBLE-WRAPPED CONTENT DETECTED!
                        |Expected: text field contains data JSON directly
                        |Actual: text field contains another content wrapper
                        |
                        |The response has incorrect structure:
                        |  result.content[0].text = "${"$"}{parsedData}"
                        |
                        |This requires clients to perform DOUBLE JSON.parse():
                        |  1st parse: Get the nested content wrapper
                        |  2nd parse: Get the actual data
                        |
                        |Correct structure should allow SINGLE JSON.parse():
                        |  result.content[0].text -> actual data JSON
                        |
                        |See SPI-664 for details.
                        """.trimMargin()
                    )
                }

                // Verify we can access ProjectListDto structure directly
                require(parsedData is JsonObject) { "Expected JsonObject (ProjectListDto) but got ${parsedData::class.simpleName}" }
                val dto = parsedData.jsonObject
                require(dto.containsKey("projects")) { "Expected 'projects' field in ProjectListDto" }
                require(dto.containsKey("totalCount")) { "Expected 'totalCount' field in ProjectListDto" }

                val projectsArray = dto["projects"]!!.jsonArray
                val totalCount = dto["totalCount"]!!.jsonPrimitive.int

                projectsArray.size shouldBe totalCount  // Verify DTO consistency
                projectsArray.size shouldNotBe 0 // Should have at least our test project
            }
        }

        "should return get_project response with directly parseable text content" {
            withTestApplication {
                val client = performCompleteHandshake()

                // Create a test project
                val createRequest = TestDataFactory.createProjectToolCall(
                    name = "Get Project Format Test",
                    description = "Testing get_project response format"
                )
                val createResponse = client.sendRequest(createRequest)
                val projectId = extractProjectIdFromCreateResponse(createResponse)

                // Get the project
                val getRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "get-project-format-test")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("name", "get_project")
                        put("arguments", buildJsonObject {
                            put("id", projectId)  // Parameter name is 'id', not 'project_id'
                        })
                    })
                }

                val response = client.sendRequest(getRequest)

                // Validate single-level content structure
                validateSingleLevelContentStructure(
                    response = response,
                    testDescription = "get_project should have single-level content"
                )

                // Extract and parse text content
                val textContent = extractTextContentFromResponse(response)
                val parsedData = shouldNotThrowAny {
                    Json.parseToJsonElement(textContent)
                }

                // FAIL CONDITION: Check for double-wrapping
                assertNoDoubleWrapping(parsedData, "get_project")

                // Verify we got a valid ProjectDto object
                require(parsedData is JsonObject) { "Expected JsonObject (ProjectDto) but got ${parsedData::class.simpleName}" }
                val projectData = parsedData.jsonObject

                // Handle ProjectId value class structure: {_value: "actual-id"}
                val idField = projectData["id"]?.jsonObject
                require(idField != null) { "Expected 'id' field in ProjectDto" }
                require(idField.containsKey("_value")) { "Expected '_value' field in ProjectId value class" }

                val actualProjectId = idField["_value"]?.jsonPrimitive?.content
                actualProjectId shouldBe projectId
                projectData["name"]?.jsonPrimitive?.content shouldBe "Get Project Format Test"
            }
        }

        "should return create_project response with single JSON.parse() accessibility" {
            withTestApplication {
                val client = performCompleteHandshake()

                val createRequest = TestDataFactory.createProjectToolCall(
                    name = "Create Response Format Test",
                    description = "Testing create_project response can be parsed once"
                )

                val response = client.sendRequest(createRequest)

                // Validate JSON-RPC structure
                validateJsonRpcResponse(response)

                // Validate single-level content structure
                validateSingleLevelContentStructure(
                    response = response,
                    testDescription = "create_project should have single-level content"
                )

                // The critical test: Can we parse the text content with SINGLE JSON.parse()?
                val textContent = extractTextContentFromResponse(response)

                // This should give us the project data directly, not another content wrapper
                val parsedData = shouldNotThrowAny {
                    Json.parseToJsonElement(textContent)
                }

                // FAIL CONDITION: If parsedData is an object with "content" key, we have double-wrapping
                assertNoDoubleWrapping(parsedData, "create_project")

                // Verify the parsed data is a valid project response object (minimal format: {id, name})
                require(parsedData is JsonObject) { "Expected JsonObject but got ${parsedData::class.simpleName}" }
                val projectData = parsedData.jsonObject

                // create_project returns minimal format: {id: "...", name: "..."}
                require(projectData.containsKey("id")) { "Expected 'id' field in create_project response" }
                require(projectData.containsKey("name")) { "Expected 'name' field in create_project response" }

                projectData["id"]?.jsonPrimitive?.content shouldNotBe null
                projectData["name"]?.jsonPrimitive?.content shouldBe "Create Response Format Test"
            }
        }

        "should verify single-level parsing without double-wrapping (SPI-664 fix verification)" {
            withTestApplication {
                val client = performCompleteHandshake()

                val listRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "single-parse-verification")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("name", "list_projects")
                        put("arguments", buildJsonObject { })
                    })
                }

                val response = client.sendRequest(listRequest)

                // Extract the text field
                val result = response.jsonObject["result"]?.jsonObject
                result shouldNotBe null

                val content = result!!["content"]?.jsonArray
                content shouldNotBe null
                content!! shouldHaveSize 1

                val contentItem = content[0].jsonObject
                contentItem["type"]?.jsonPrimitive?.content shouldBe "text"

                val textField = contentItem["text"]?.jsonPrimitive?.content
                textField shouldNotBe null

                // SINGLE PARSE: The text field should contain actual data directly
                val parsedData = Json.parseToJsonElement(textField!!)

                // VERIFICATION: Ensure NO double-wrapping exists (bug is fixed)
                if (parsedData is JsonObject && parsedData.containsKey("content")) {
                    // Check if it's actually a content wrapper (has type and text fields)
                    val nestedContent = parsedData["content"]
                    if (nestedContent is JsonArray && nestedContent.isNotEmpty()) {
                        val firstItem = nestedContent[0]
                        if (firstItem is JsonObject &&
                            firstItem.containsKey("type") &&
                            firstItem.containsKey("text")) {

                            throw AssertionError(
                                """
                                |BUG STILL EXISTS: Double-wrapping detected!
                                |
                                |The fix for SPI-664 is not working correctly.
                                |The text field still contains a nested content wrapper.
                                |
                                |Expected: Single parse yields actual data
                                |Actual: Double parse required
                                |
                                |First parse result: ${parsedData}
                                """.trimMargin()
                            )
                        }
                    }
                }

                // SUCCESS: We got actual data directly with single parse
                // Verify it's valid data (either array or object, not a content wrapper)
                val isValidData = when (parsedData) {
                    is JsonArray -> true
                    is JsonObject -> !parsedData.containsKey("content") ||
                                    parsedData.keys.size > 1 // Has other fields besides "content"
                    else -> false
                }

                if (!isValidData) {
                    throw AssertionError("Parsed data is not valid: $parsedData")
                }

                println(
                    """
                    |✓ SPI-664 FIX VERIFIED: Single-level parsing works!
                    |  - Only ONE parse needed to get actual data
                    |  - No nested content wrapper detected
                    |  - Response follows MCP protocol specification
                    |  - Parsed data: ${parsedData.toString().take(100)}...
                    """.trimMargin()
                )
            }
        }

        "should verify all tool calls use consistent single-level content format" {
            withTestApplication {
                val client = performCompleteHandshake()

                // Test multiple tool calls to ensure consistency
                val toolCalls = listOf(
                    "list_projects" to buildJsonObject { },
                    "create_project" to buildJsonObject {
                        put("name", "Consistency Test Project")
                        put("description", "Testing format consistency")
                        put("status", "active")
                    }
                )

                toolCalls.forEach { (toolName, arguments) ->
                    val request = buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", "consistency-$toolName")
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", toolName)
                            put("arguments", arguments)
                        })
                    }

                    val response = client.sendRequest(request)

                    // Each tool should follow the same correct format
                    validateSingleLevelContentStructure(
                        response = response,
                        testDescription = "$toolName should have single-level content structure"
                    )

                    val textContent = extractTextContentFromResponse(response)
                    val parsedData = shouldNotThrowAny {
                        Json.parseToJsonElement(textContent)
                    }

                    // No tool should have double-wrapping
                    assertNoDoubleWrapping(parsedData, toolName)
                }
            }
        }
    }

    /**
     * Validates that the response has the correct single-level content structure
     * according to MCP protocol specification.
     *
     * Expected structure:
     * {
     *   "result": {
     *     "content": [
     *       {
     *         "type": "text",
     *         "text": "<actual data JSON string>"
     *       }
     *     ]
     *   }
     * }
     */
    private fun validateSingleLevelContentStructure(
        response: JsonElement,
        testDescription: String
    ) {
        // Validate JSON-RPC structure
        val obj = response.jsonObject
        obj["jsonrpc"]?.jsonPrimitive?.content shouldBe "2.0"
        obj["result"] shouldNotBe null

        // Validate result.content structure
        val result = obj["result"]?.jsonObject
        result shouldNotBe null

        val content = result!!["content"]?.jsonArray
        content shouldNotBe null
        content!! shouldHaveSize 1

        // Validate content[0] structure
        val contentItem = content!![0].jsonObject
        contentItem["type"]?.jsonPrimitive?.content shouldBe "text"
        contentItem["text"] shouldNotBe null

        // The text field should be a string (not an object)
        val textField = contentItem["text"]
        textField.shouldBeInstanceOf<JsonPrimitive>()

        println("✓ $testDescription: Single-level content structure validated")
    }

    /**
     * Extracts the text content from a tools/call response.
     * This is the field that should contain the actual data JSON string.
     */
    private fun extractTextContentFromResponse(response: JsonElement): String {
        val result = response.jsonObject["result"]?.jsonObject
        val content = result?.get("content")?.jsonArray
        val contentItem = content?.get(0)?.jsonObject
        val textContent = contentItem?.get("text")?.jsonPrimitive?.content

        textContent shouldNotBe null
        return textContent!!
    }

    /**
     * Asserts that the parsed data does NOT contain a nested content wrapper.
     * This is the critical check for the double-wrapping bug.
     */
    private fun assertNoDoubleWrapping(parsedData: JsonElement, toolName: String) {
        if (parsedData is JsonObject && parsedData.containsKey("content")) {
            // Check if it's actually a content wrapper (has type and text fields)
            val nestedContent = parsedData["content"]
            if (nestedContent is JsonArray && nestedContent.isNotEmpty()) {
                val firstItem = nestedContent[0]
                if (firstItem is JsonObject &&
                    firstItem.containsKey("type") &&
                    firstItem.containsKey("text")) {

                    throw AssertionError(
                        """
                        |DOUBLE-WRAPPED CONTENT DETECTED in $toolName response!
                        |
                        |Expected: result.content[0].text contains data JSON directly
                        |Actual: result.content[0].text contains another content wrapper
                        |
                        |Current structure requires DOUBLE parsing:
                        |  JSON.parse(result.content[0].text) -> { content: [...] }
                        |  JSON.parse(content[0].text) -> actual data
                        |
                        |Correct structure should require only SINGLE parsing:
                        |  JSON.parse(result.content[0].text) -> actual data
                        |
                        |Parsed content wrapper: ${parsedData}
                        |
                        |This violates MCP protocol specification.
                        |See SPI-664 for fix details.
                        """.trimMargin()
                    )
                }
            }
        }
    }

    /**
     * Extracts project ID from a create_project response.
     * Handles both correct and incorrect response formats for testing purposes.
     */
    private fun extractProjectIdFromCreateResponse(response: JsonElement): String {
        val textContent = extractTextContentFromResponse(response)
        val parsedData = Json.parseToJsonElement(textContent)

        // Try to handle both formats for resilience
        return when {
            parsedData is JsonObject && parsedData.containsKey("id") -> {
                parsedData["id"]?.jsonPrimitive?.content!!
            }
            parsedData is JsonObject && parsedData.containsKey("content") -> {
                // Double-wrapped format (current bug)
                val nestedContent = parsedData["content"]?.jsonArray
                val nestedText = nestedContent?.get(0)?.jsonObject?.get("text")?.jsonPrimitive?.content
                val actualData = Json.parseToJsonElement(nestedText!!)
                actualData.jsonObject["id"]?.jsonPrimitive?.content!!
            }
            else -> throw AssertionError("Cannot extract project ID from response: $parsedData")
        }
    }
}
