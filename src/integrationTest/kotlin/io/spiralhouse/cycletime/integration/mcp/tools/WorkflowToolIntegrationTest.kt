package io.spiralhouse.cycletime.integration.mcp.tools

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.spiralhouse.cycletime.test.utils.testSDKApplication
import kotlinx.serialization.json.*

/**
 * Integration tests for Workflow MCP tools with soft-deletion support.
 *
 * **TDD RED PHASE (SPI-879)**: These tests define the expected behavior for:
 * - Soft-deletion via `delete_workflow` tool
 * - Restoration via `restore_workflow` tool
 * - List deleted via `list_deleted_workflows` tool
 * - Include deleted via `includeDeleted` parameter on `list_workflows`
 *
 * ## Expected Test Failures:
 * All tests in this file are EXPECTED TO FAIL initially because:
 * - `delete_workflow` still performs hard-deletion (not soft-deletion)
 * - `restore_workflow` tool does not exist yet
 * - `list_deleted_workflows` tool does not exist yet
 * - `list_workflows` does not have `includeDeleted` parameter
 *
 * This is the RED phase of TDD - tests fail to demonstrate missing implementation.
 */
class WorkflowToolIntegrationTest : DescribeSpec({

    /**
     * Helper function to create a test workflow via MCP tool.
     */
    suspend fun createWorkflow(client: io.ktor.client.HttpClient, name: String, description: String? = null): String {
        val response = client.post("/mcp") {
            header("Content-Type", "application/json")
            setBody(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 1)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "workflow_create_workflow")
                    put("arguments", buildJsonObject {
                        put("name", name)
                        description?.let { put("description", it) }
                    })
                })
            }.toString())
        }

        response.status shouldBe HttpStatusCode.OK

        val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
        val result = jsonResponse["result"]?.jsonObject.shouldNotBeNull()
        val content = result["content"]?.jsonArray.shouldNotBeNull()
        val textContent = content[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()

        val workflowIdRegex = "\"id\"\\s*:\\s*\"([0-9a-f-]+)\"".toRegex()
        val match = workflowIdRegex.find(textContent)
        return match?.groupValues?.get(1) ?: error("Failed to extract workflow ID from response: $textContent")
    }

    /**
     * Helper function to get a workflow by ID via MCP tool.
     */
    suspend fun getWorkflow(client: io.ktor.client.HttpClient, workflowId: String): JsonObject? {
        val response = client.post("/mcp") {
            header("Content-Type", "application/json")
            setBody(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 2)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "workflow_get_workflow")
                    put("arguments", buildJsonObject {
                        put("id", workflowId)
                    })
                })
            }.toString())
        }

        if (response.status != HttpStatusCode.OK) return null

        val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject

        // Check for JSON-RPC error response
        if (jsonResponse.containsKey("error")) return null

        val result = jsonResponse["result"]?.jsonObject ?: return null
        val content = result["content"]?.jsonArray ?: return null
        if (content.isEmpty()) return null

        val textContent = content[0].jsonObject["text"]?.jsonPrimitive?.content ?: return null

        // Handle error messages in content (MCP SDK wraps tool handler exceptions here)
        if (textContent.startsWith("Tool handler error:")) return null

        // Try to parse as JSON, return null if parsing fails
        return try {
            Json.parseToJsonElement(textContent).jsonObject
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Helper function to list workflows via MCP tool.
     */
    suspend fun listWorkflows(client: io.ktor.client.HttpClient, includeDeleted: Boolean? = null): JsonArray {
        val response = client.post("/mcp") {
            header("Content-Type", "application/json")
            setBody(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 3)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "workflow_list_workflows")
                    put("arguments", buildJsonObject {
                        includeDeleted?.let { put("includeDeleted", it) }
                    })
                })
            }.toString())
        }

        response.status shouldBe HttpStatusCode.OK

        val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
        val result = jsonResponse["result"]?.jsonObject.shouldNotBeNull()
        val content = result["content"]?.jsonArray.shouldNotBeNull()
        val textContent = content[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()

        return Json.parseToJsonElement(textContent).jsonArray
    }

    describe("delete_workflow tool") {
        it("should perform soft-deletion not hard-deletion") {
            testSDKApplication {
                val workflowId = createWorkflow(client, "Test Workflow for Soft-Delete")

                // Delete the workflow via MCP tool
                val deleteResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 10)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_delete_workflow")
                            put("arguments", buildJsonObject {
                                put("id", workflowId)
                            })
                        })
                    }.toString())
                }

                deleteResponse.status shouldBe HttpStatusCode.OK

                // RED: This will FAIL because delete_workflow doesn't exist yet or still performs hard-deletion

                // Verify workflow is not returned by standard get (excludes deleted)
                val workflow = getWorkflow(client, workflowId)
                workflow.shouldBeNull() // Standard get should not find deleted workflows

                // Verify workflow IS returned when includeDeleted=true
                val includeDeletedResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 11)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_get_workflow")
                            put("arguments", buildJsonObject {
                                put("id", workflowId)
                                put("includeDeleted", true)
                            })
                        })
                    }.toString())
                }

                includeDeletedResponse.status shouldBe HttpStatusCode.OK
                val includeDeletedJson = Json.parseToJsonElement(includeDeletedResponse.bodyAsText()).jsonObject
                val includeDeletedResult = includeDeletedJson["result"]?.jsonObject.shouldNotBeNull()
                val includeDeletedContent = includeDeletedResult["content"]?.jsonArray.shouldNotBeNull()
                val includeDeletedText = includeDeletedContent[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()
                val deletedWorkflow = Json.parseToJsonElement(includeDeletedText).jsonObject

                // Verify deletedAt timestamp is set
                deletedWorkflow["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldNotBeNull()
            }
        }

        it("should be idempotent when deleting already-deleted workflow") {
            testSDKApplication {
                val workflowId = createWorkflow(client, "Test Idempotent Delete")

                // Delete once
                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 20)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_delete_workflow")
                            put("arguments", buildJsonObject {
                                put("id", workflowId)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because delete_workflow doesn't exist yet
                // Delete again - should succeed (idempotent)
                val secondDeleteResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 21)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_delete_workflow")
                            put("arguments", buildJsonObject {
                                put("id", workflowId)
                            })
                        })
                    }.toString())
                }

                secondDeleteResponse.status shouldBe HttpStatusCode.OK

                val secondDeleteJson = Json.parseToJsonElement(secondDeleteResponse.bodyAsText()).jsonObject
                val secondDeleteResult = secondDeleteJson["result"]?.jsonObject.shouldNotBeNull()

                // Should not throw error - idempotent operation
                secondDeleteResult["isError"]?.jsonPrimitive?.contentOrNull shouldBe null
            }
        }

        it("should indicate soft-deletion in tool description") {
            testSDKApplication {
                // List all tools
                val toolsResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody("""{"jsonrpc":"2.0","id":30,"method":"tools/list"}""")
                }

                toolsResponse.status shouldBe HttpStatusCode.OK

                val toolsJson = Json.parseToJsonElement(toolsResponse.bodyAsText()).jsonObject
                val toolsResult = toolsJson["result"]?.jsonObject.shouldNotBeNull()
                val tools = toolsResult["tools"]?.jsonArray.shouldNotBeNull()

                // RED: This will FAIL because delete_workflow description doesn't mention soft-deletion yet
                val deleteTool = tools.find {
                    it.jsonObject["name"]?.jsonPrimitive?.content == "workflow_delete_workflow"
                }

                deleteTool.shouldNotBeNull()
                val description = deleteTool.jsonObject["description"]?.jsonPrimitive?.content.shouldNotBeNull()

                // Description should indicate soft-deletion (can be recovered)
                description shouldContain "soft"
            }
        }
    }

    describe("restore_workflow tool") {
        it("should restore soft-deleted workflow") {
            testSDKApplication {
                val workflowId = createWorkflow(client, "Test Restore Workflow")

                // Delete workflow
                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 40)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_delete_workflow")
                            put("arguments", buildJsonObject {
                                put("id", workflowId)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because restore_workflow tool doesn't exist yet
                // Restore workflow
                val restoreResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 41)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_restore_workflow")
                            put("arguments", buildJsonObject {
                                put("id", workflowId)
                            })
                        })
                    }.toString())
                }

                restoreResponse.status shouldBe HttpStatusCode.OK

                val restoreJson = Json.parseToJsonElement(restoreResponse.bodyAsText()).jsonObject
                val restoreResult = restoreJson["result"]?.jsonObject.shouldNotBeNull()
                val restoreContent = restoreResult["content"]?.jsonArray.shouldNotBeNull()
                val restoreText = restoreContent[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()
                val restoredWorkflow = Json.parseToJsonElement(restoreText).jsonObject

                // Verify deletedAt is null (cleared)
                restoredWorkflow["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldBeNull()

                // Verify workflow is now returned by standard get
                val workflow = getWorkflow(client, workflowId)
                workflow.shouldNotBeNull()
                workflow["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldBeNull()
            }
        }

        it("should be idempotent when restoring already-active workflow") {
            testSDKApplication {
                val workflowId = createWorkflow(client, "Test Idempotent Restore")

                // RED: This will FAIL because restore_workflow tool doesn't exist yet
                // Restore active workflow - should succeed (idempotent)
                val restoreResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 50)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_restore_workflow")
                            put("arguments", buildJsonObject {
                                put("id", workflowId)
                            })
                        })
                    }.toString())
                }

                restoreResponse.status shouldBe HttpStatusCode.OK

                val restoreJson = Json.parseToJsonElement(restoreResponse.bodyAsText()).jsonObject
                val restoreResult = restoreJson["result"]?.jsonObject.shouldNotBeNull()

                // Should not throw error - idempotent operation
                restoreResult["isError"]?.jsonPrimitive?.contentOrNull shouldBe null
            }
        }

        it("should fail when restoring non-existent workflow") {
            testSDKApplication {
                val nonExistentId = "00000000-0000-0000-0000-000000000000"

                // RED: This will FAIL because restore_workflow tool doesn't exist yet
                val restoreResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 60)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_restore_workflow")
                            put("arguments", buildJsonObject {
                                put("id", nonExistentId)
                            })
                        })
                    }.toString())
                }

                // Should return error response
                restoreResponse.status shouldBe HttpStatusCode.OK

                val restoreJson = Json.parseToJsonElement(restoreResponse.bodyAsText()).jsonObject
                val error = restoreJson["error"]?.jsonObject
                error.shouldNotBeNull()

                val errorMessage = error["message"]?.jsonPrimitive?.content.shouldNotBeNull()
                errorMessage shouldContain "not found"
            }
        }
    }

    describe("list_deleted_workflows tool") {
        it("should return only deleted workflows") {
            testSDKApplication {
                val active = createWorkflow(client, "Active Workflow")
                val deleted1 = createWorkflow(client, "Deleted Workflow 1")
                val deleted2 = createWorkflow(client, "Deleted Workflow 2")

                // Delete 2 workflows
                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 70)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_delete_workflow")
                            put("arguments", buildJsonObject {
                                put("id", deleted1)
                            })
                        })
                    }.toString())
                }

                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 71)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_delete_workflow")
                            put("arguments", buildJsonObject {
                                put("id", deleted2)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because list_deleted_workflows tool doesn't exist yet
                val deletedResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 72)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_list_deleted_workflows")
                            put("arguments", buildJsonObject {})
                        })
                    }.toString())
                }

                deletedResponse.status shouldBe HttpStatusCode.OK

                val deletedJson = Json.parseToJsonElement(deletedResponse.bodyAsText()).jsonObject
                val deletedResult = deletedJson["result"]?.jsonObject.shouldNotBeNull()
                val deletedContent = deletedResult["content"]?.jsonArray.shouldNotBeNull()
                val deletedText = deletedContent[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()
                val deletedWorkflows = Json.parseToJsonElement(deletedText).jsonArray

                // Should return exactly 2 deleted workflows
                deletedWorkflows shouldHaveSize 2

                // Verify all returned workflows have deletedAt timestamp
                deletedWorkflows.forEach { workflow ->
                    val deletedAt = workflow.jsonObject["deletedAt"]?.jsonPrimitive?.contentOrNull
                    deletedAt.shouldNotBeNull()
                }
            }
        }

        it("should return empty list when no workflows are deleted") {
            testSDKApplication {
                createWorkflow(client, "Active Workflow 1")
                createWorkflow(client, "Active Workflow 2")

                // RED: This will FAIL because list_deleted_workflows tool doesn't exist yet
                val deletedResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 80)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_list_deleted_workflows")
                            put("arguments", buildJsonObject {})
                        })
                    }.toString())
                }

                deletedResponse.status shouldBe HttpStatusCode.OK

                val deletedJson = Json.parseToJsonElement(deletedResponse.bodyAsText()).jsonObject
                val deletedResult = deletedJson["result"]?.jsonObject.shouldNotBeNull()
                val deletedContent = deletedResult["content"]?.jsonArray.shouldNotBeNull()
                val deletedText = deletedContent[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()
                val deletedWorkflows = Json.parseToJsonElement(deletedText).jsonArray

                deletedWorkflows.shouldBeEmpty()
            }
        }

        it("should order deleted workflows by deletion date DESC") {
            testSDKApplication {
                val workflow1 = createWorkflow(client, "Delete First")
                Thread.sleep(10)
                val workflow2 = createWorkflow(client, "Delete Second")
                Thread.sleep(10)
                val workflow3 = createWorkflow(client, "Delete Third")

                // Delete in order
                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 90)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_delete_workflow")
                            put("arguments", buildJsonObject { put("id", workflow1) })
                        })
                    }.toString())
                }

                Thread.sleep(10)

                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 91)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_delete_workflow")
                            put("arguments", buildJsonObject { put("id", workflow2) })
                        })
                    }.toString())
                }

                Thread.sleep(10)

                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 92)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_delete_workflow")
                            put("arguments", buildJsonObject { put("id", workflow3) })
                        })
                    }.toString())
                }

                // RED: This will FAIL because list_deleted_workflows tool doesn't exist yet
                val deletedResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 93)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_list_deleted_workflows")
                            put("arguments", buildJsonObject {})
                        })
                    }.toString())
                }

                val deletedJson = Json.parseToJsonElement(deletedResponse.bodyAsText()).jsonObject
                val deletedResult = deletedJson["result"]?.jsonObject.shouldNotBeNull()
                val deletedContent = deletedResult["content"]?.jsonArray.shouldNotBeNull()
                val deletedText = deletedContent[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()
                val deletedWorkflows = Json.parseToJsonElement(deletedText).jsonArray

                // Most recently deleted should be first (workflow3)
                deletedWorkflows shouldHaveSize 3
                deletedWorkflows[0].jsonObject["id"]?.jsonPrimitive?.content shouldBe workflow3
                deletedWorkflows[1].jsonObject["id"]?.jsonPrimitive?.content shouldBe workflow2
                deletedWorkflows[2].jsonObject["id"]?.jsonPrimitive?.content shouldBe workflow1
            }
        }
    }

    describe("list_workflows tool with includeDeleted parameter") {
        it("should exclude deleted workflows by default") {
            testSDKApplication {
                val active = createWorkflow(client, "Active Workflow")
                val deleted = createWorkflow(client, "Deleted Workflow")

                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 100)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_delete_workflow")
                            put("arguments", buildJsonObject {
                                put("id", deleted)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because list_workflows doesn't exclude deleted yet
                val workflows = listWorkflows(client)

                // Should only return 1 active workflow (plus potentially default workflows)
                val activeWorkflow = workflows.find {
                    it.jsonObject["id"]?.jsonPrimitive?.content == active
                }
                activeWorkflow.shouldNotBeNull()

                // Deleted workflow should not be in the list
                val deletedWorkflow = workflows.find {
                    it.jsonObject["id"]?.jsonPrimitive?.content == deleted
                }
                deletedWorkflow.shouldBeNull()
            }
        }

        it("should exclude deleted when includeDeleted=false") {
            testSDKApplication {
                val active = createWorkflow(client, "Active Workflow")
                val deleted = createWorkflow(client, "Deleted Workflow")

                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 110)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_delete_workflow")
                            put("arguments", buildJsonObject {
                                put("id", deleted)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because list_workflows doesn't have includeDeleted parameter yet
                val workflows = listWorkflows(client, includeDeleted = false)

                // Deleted workflow should not be in the list
                val deletedWorkflow = workflows.find {
                    it.jsonObject["id"]?.jsonPrimitive?.content == deleted
                }
                deletedWorkflow.shouldBeNull()
            }
        }

        it("should include deleted when includeDeleted=true") {
            testSDKApplication {
                val active = createWorkflow(client, "Active Workflow")
                val deleted = createWorkflow(client, "Deleted Workflow")

                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 120)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_delete_workflow")
                            put("arguments", buildJsonObject {
                                put("id", deleted)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because list_workflows doesn't have includeDeleted parameter yet
                val workflows = listWorkflows(client, includeDeleted = true)

                // Both workflows should be present
                val activeWorkflow = workflows.find {
                    it.jsonObject["id"]?.jsonPrimitive?.content == active
                }
                activeWorkflow.shouldNotBeNull()

                val deletedWorkflow = workflows.find {
                    it.jsonObject["id"]?.jsonPrimitive?.content == deleted
                }
                deletedWorkflow.shouldNotBeNull()

                // Verify deleted workflow has deletedAt timestamp
                deletedWorkflow.jsonObject["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldNotBeNull()

                // Verify active workflow has null deletedAt
                activeWorkflow.jsonObject["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldBeNull()
            }
        }

        it("should include deletedAt field in response when present") {
            testSDKApplication {
                val deleted = createWorkflow(client, "To Be Deleted")

                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 130)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "workflow_delete_workflow")
                            put("arguments", buildJsonObject {
                                put("id", deleted)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because list_workflows doesn't have includeDeleted parameter yet
                val workflows = listWorkflows(client, includeDeleted = true)

                val deletedWorkflow = workflows.find {
                    it.jsonObject["id"]?.jsonPrimitive?.content == deleted
                }
                deletedWorkflow.shouldNotBeNull()

                // Verify deletedAt field exists and is not null
                deletedWorkflow.jsonObject["deletedAt"].shouldNotBeNull()
                deletedWorkflow.jsonObject["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldNotBeNull()
            }
        }
    }
})
