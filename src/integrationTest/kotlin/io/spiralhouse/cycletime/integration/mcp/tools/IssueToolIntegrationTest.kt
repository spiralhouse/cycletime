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
 * Integration tests for Issue MCP tools with soft-deletion and parent validation support.
 *
 * **TDD RED PHASE (SPI-879)**: These tests define the expected behavior for:
 * - Soft-deletion via `delete_issue` tool
 * - Restoration via `restore_issue` tool with parent validation
 * - List deleted via `list_deleted_issues` tool
 * - Include deleted via `includeDeleted` parameter on `list_issues`
 * - Parent validation: Cannot restore child if parent is still deleted
 *
 * ## Expected Test Failures:
 * All tests in this file are EXPECTED TO FAIL initially because:
 * - `delete_issue` still performs hard-deletion (not soft-deletion)
 * - `restore_issue` tool does not exist yet
 * - `list_deleted_issues` tool does not exist yet
 * - `list_issues` does not have `includeDeleted` parameter
 * - Parent validation logic is not implemented yet
 *
 * This is the RED phase of TDD - tests fail to demonstrate missing implementation.
 */
class IssueToolIntegrationTest : DescribeSpec({

    /**
     * Helper function to create a test project via MCP tool.
     */
    suspend fun createProject(client: io.ktor.client.HttpClient, name: String): String {
        val response = client.post("/mcp") {
            header("Content-Type", "application/json")
            setBody(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 1)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "project_create_project")
                    put("arguments", buildJsonObject {
                        put("name", name)
                    })
                })
            }.toString())
        }

        val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
        val result = jsonResponse["result"]?.jsonObject.shouldNotBeNull()
        val content = result["content"]?.jsonArray.shouldNotBeNull()
        val textContent = content[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()

        val projectIdRegex = "\"id\"\\s*:\\s*\"([0-9a-f-]+)\"".toRegex()
        val match = projectIdRegex.find(textContent)
        return match?.groupValues?.get(1) ?: error("Failed to extract project ID")
    }

    /**
     * Helper function to create a test issue via MCP tool.
     */
    suspend fun createIssue(
        client: io.ktor.client.HttpClient,
        title: String,
        projectId: String,
        type: String = "STORY",
        parentId: String? = null
    ): String {
        val response = client.post("/mcp") {
            header("Content-Type", "application/json")
            setBody(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 2)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "issue_create_issue")
                    put("arguments", buildJsonObject {
                        put("title", title)
                        put("projectId", projectId)
                        put("type", type)
                        parentId?.let { put("parentId", it) }
                    })
                })
            }.toString())
        }

        response.status shouldBe HttpStatusCode.OK

        val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
        val result = jsonResponse["result"]?.jsonObject.shouldNotBeNull()
        val content = result["content"]?.jsonArray.shouldNotBeNull()
        val textContent = content[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()

        val issueIdRegex = "\"id\"\\s*:\\s*\"([0-9a-f-]+)\"".toRegex()
        val match = issueIdRegex.find(textContent)
        return match?.groupValues?.get(1) ?: error("Failed to extract issue ID from response: $textContent")
    }

    /**
     * Helper function to get an issue by ID via MCP tool.
     */
    suspend fun getIssue(client: io.ktor.client.HttpClient, issueId: String): JsonObject? {
        val response = client.post("/mcp") {
            header("Content-Type", "application/json")
            setBody(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 3)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "issue_get_issue")
                    put("arguments", buildJsonObject {
                        put("id", issueId)
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
     * Helper function to list issues via MCP tool.
     */
    suspend fun listIssues(client: io.ktor.client.HttpClient, includeDeleted: Boolean? = null): JsonArray {
        val response = client.post("/mcp") {
            header("Content-Type", "application/json")
            setBody(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 4)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "issue_list_issues")
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

        val issuesResponse = Json.parseToJsonElement(textContent).jsonObject
        return issuesResponse["issues"]?.jsonArray ?: buildJsonArray {}
    }

    describe("delete_issue tool") {
        it("should perform soft-deletion not hard-deletion") {
            testSDKApplication {
                val projectId = createProject(client, "Test Project")
                val issueId = createIssue(client, "Test Issue for Soft-Delete", projectId)

                // Delete the issue via MCP tool
                val deleteResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 10)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_delete_issue")
                            put("arguments", buildJsonObject {
                                put("id", issueId)
                            })
                        })
                    }.toString())
                }

                deleteResponse.status shouldBe HttpStatusCode.OK

                // RED: This will FAIL because delete_issue doesn't exist yet or still performs hard-deletion

                // Verify issue is not returned by standard get (excludes deleted)
                val issue = getIssue(client, issueId)
                issue.shouldBeNull() // Standard get should not find deleted issues

                // Verify issue IS returned when includeDeleted=true
                val includeDeletedResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 11)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_get_issue")
                            put("arguments", buildJsonObject {
                                put("id", issueId)
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
                val deletedIssue = Json.parseToJsonElement(includeDeletedText).jsonObject

                // Verify deletedAt timestamp is set
                deletedIssue["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldNotBeNull()
            }
        }

        it("should cascade soft-delete to child issues") {
            testSDKApplication {
                val projectId = createProject(client, "Test Cascade")
                val parentId = createIssue(client, "Parent Story", projectId, type = "STORY")
                val childId = createIssue(client, "Child Subtask", projectId, type = "SUBTASK", parentId = parentId)

                // Delete parent
                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 20)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_delete_issue")
                            put("arguments", buildJsonObject {
                                put("id", parentId)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because cascade soft-deletion is not implemented yet

                // Verify both parent and child are soft-deleted
                val parent = getIssue(client, parentId)
                parent.shouldBeNull() // Not returned by standard get

                val child = getIssue(client, childId)
                child.shouldBeNull() // Child should also be soft-deleted
            }
        }

        it("should be idempotent when deleting already-deleted issue") {
            testSDKApplication {
                val projectId = createProject(client, "Test Idempotent")
                val issueId = createIssue(client, "Test Issue", projectId)

                // Delete once
                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 30)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_delete_issue")
                            put("arguments", buildJsonObject {
                                put("id", issueId)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because delete_issue doesn't exist yet
                // Delete again - should succeed (idempotent)
                val secondDeleteResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 31)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_delete_issue")
                            put("arguments", buildJsonObject {
                                put("id", issueId)
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
    }

    describe("restore_issue tool") {
        it("should restore soft-deleted issue") {
            testSDKApplication {
                val projectId = createProject(client, "Test Restore")
                val issueId = createIssue(client, "Test Issue", projectId)

                // Delete issue
                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 40)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_delete_issue")
                            put("arguments", buildJsonObject {
                                put("id", issueId)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because restore_issue tool doesn't exist yet
                // Restore issue
                val restoreResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 41)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_restore_issue")
                            put("arguments", buildJsonObject {
                                put("id", issueId)
                            })
                        })
                    }.toString())
                }

                restoreResponse.status shouldBe HttpStatusCode.OK

                val restoreJson = Json.parseToJsonElement(restoreResponse.bodyAsText()).jsonObject
                val restoreResult = restoreJson["result"]?.jsonObject.shouldNotBeNull()
                val restoreContent = restoreResult["content"]?.jsonArray.shouldNotBeNull()
                val restoreText = restoreContent[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()
                val restoredIssue = Json.parseToJsonElement(restoreText).jsonObject

                // Verify deletedAt is null (cleared)
                restoredIssue["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldBeNull()

                // Verify issue is now returned by standard get
                val issue = getIssue(client, issueId)
                issue.shouldNotBeNull()
                issue["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldBeNull()
            }
        }

        it("should fail when restoring child issue with deleted parent") {
            testSDKApplication {
                val projectId = createProject(client, "Test Parent Validation")
                val parentId = createIssue(client, "Parent Story", projectId, type = "STORY")
                val childId = createIssue(client, "Child Subtask", projectId, type = "SUBTASK", parentId = parentId)

                // Delete both (cascade)
                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 50)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_delete_issue")
                            put("arguments", buildJsonObject {
                                put("id", parentId)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because restore_issue tool doesn't exist yet
                // Attempt to restore child without restoring parent first
                val restoreChildResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 51)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_restore_issue")
                            put("arguments", buildJsonObject {
                                put("id", childId)
                            })
                        })
                    }.toString())
                }

                // Should return error response
                restoreChildResponse.status shouldBe HttpStatusCode.OK // JSON-RPC returns 200 with error

                val restoreJson = Json.parseToJsonElement(restoreChildResponse.bodyAsText()).jsonObject
                val error = restoreJson["error"]?.jsonObject
                error.shouldNotBeNull()

                val errorMessage = error["message"]?.jsonPrimitive?.content.shouldNotBeNull()
                errorMessage shouldContain "parent"
                errorMessage shouldContain "deleted"
            }
        }

        it("should succeed when restoring child after parent is restored") {
            testSDKApplication {
                val projectId = createProject(client, "Test Restore Order")
                val parentId = createIssue(client, "Parent Story", projectId, type = "STORY")
                val childId = createIssue(client, "Child Subtask", projectId, type = "SUBTASK", parentId = parentId)

                // Delete both (cascade)
                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 60)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_delete_issue")
                            put("arguments", buildJsonObject {
                                put("id", parentId)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because restore_issue tool doesn't exist yet
                // Restore parent first
                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 61)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_restore_issue")
                            put("arguments", buildJsonObject {
                                put("id", parentId)
                            })
                        })
                    }.toString())
                }

                // Now restore child - should succeed
                val restoreChildResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 62)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_restore_issue")
                            put("arguments", buildJsonObject {
                                put("id", childId)
                            })
                        })
                    }.toString())
                }

                restoreChildResponse.status shouldBe HttpStatusCode.OK

                val restoreJson = Json.parseToJsonElement(restoreChildResponse.bodyAsText()).jsonObject
                val restoreResult = restoreJson["result"]?.jsonObject.shouldNotBeNull()

                // Should not have error
                val error = restoreJson["error"]
                error.shouldBeNull()

                // Verify child is restored
                val child = getIssue(client, childId)
                child.shouldNotBeNull()
                child["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldBeNull()
            }
        }

        it("should be idempotent when restoring already-active issue") {
            testSDKApplication {
                val projectId = createProject(client, "Test Idempotent Restore")
                val issueId = createIssue(client, "Test Issue", projectId)

                // RED: This will FAIL because restore_issue tool doesn't exist yet
                // Restore active issue - should succeed (idempotent)
                val restoreResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 70)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_restore_issue")
                            put("arguments", buildJsonObject {
                                put("id", issueId)
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

        it("should fail when restoring non-existent issue") {
            testSDKApplication {
                val nonExistentId = "00000000-0000-0000-0000-000000000000"

                // RED: This will FAIL because restore_issue tool doesn't exist yet
                val restoreResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 80)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_restore_issue")
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

    describe("list_deleted_issues tool") {
        it("should return only deleted issues") {
            testSDKApplication {
                val projectId = createProject(client, "Test List Deleted")
                val active = createIssue(client, "Active Issue", projectId)
                val deleted1 = createIssue(client, "Deleted Issue 1", projectId)
                val deleted2 = createIssue(client, "Deleted Issue 2", projectId)

                // Delete 2 issues
                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 90)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_delete_issue")
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
                        put("id", 91)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_delete_issue")
                            put("arguments", buildJsonObject {
                                put("id", deleted2)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because list_deleted_issues tool doesn't exist yet
                val deletedResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 92)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_list_deleted_issues")
                            put("arguments", buildJsonObject {})
                        })
                    }.toString())
                }

                deletedResponse.status shouldBe HttpStatusCode.OK

                val deletedJson = Json.parseToJsonElement(deletedResponse.bodyAsText()).jsonObject
                val deletedResult = deletedJson["result"]?.jsonObject.shouldNotBeNull()
                val deletedContent = deletedResult["content"]?.jsonArray.shouldNotBeNull()
                val deletedText = deletedContent[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()
                val deletedIssues = Json.parseToJsonElement(deletedText).jsonArray

                // Should return exactly 2 deleted issues
                deletedIssues shouldHaveSize 2

                // Verify all returned issues have deletedAt timestamp
                deletedIssues.forEach { issue ->
                    val deletedAt = issue.jsonObject["deletedAt"]?.jsonPrimitive?.contentOrNull
                    deletedAt.shouldNotBeNull()
                }
            }
        }

        it("should return empty list when no issues are deleted") {
            testSDKApplication {
                val projectId = createProject(client, "Test Empty List")
                createIssue(client, "Active Issue 1", projectId)
                createIssue(client, "Active Issue 2", projectId)

                // RED: This will FAIL because list_deleted_issues tool doesn't exist yet
                val deletedResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 100)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_list_deleted_issues")
                            put("arguments", buildJsonObject {})
                        })
                    }.toString())
                }

                deletedResponse.status shouldBe HttpStatusCode.OK

                val deletedJson = Json.parseToJsonElement(deletedResponse.bodyAsText()).jsonObject
                val deletedResult = deletedJson["result"]?.jsonObject.shouldNotBeNull()
                val deletedContent = deletedResult["content"]?.jsonArray.shouldNotBeNull()
                val deletedText = deletedContent[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()
                val deletedIssues = Json.parseToJsonElement(deletedText).jsonArray

                deletedIssues.shouldBeEmpty()
            }
        }
    }

    describe("list_issues tool with includeDeleted parameter") {
        it("should exclude deleted issues by default") {
            testSDKApplication {
                val projectId = createProject(client, "Test Exclude Default")
                val active = createIssue(client, "Active Issue", projectId)
                val deleted = createIssue(client, "Deleted Issue", projectId)

                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 110)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_delete_issue")
                            put("arguments", buildJsonObject {
                                put("id", deleted)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because list_issues doesn't exclude deleted yet
                val issues = listIssues(client)

                // Should only return 1 active issue
                issues shouldHaveSize 1
                issues[0].jsonObject["id"]?.jsonPrimitive?.content shouldBe active
            }
        }

        it("should include deleted when includeDeleted=true") {
            testSDKApplication {
                val projectId = createProject(client, "Test Include Deleted")
                val active = createIssue(client, "Active Issue", projectId)
                val deleted = createIssue(client, "Deleted Issue", projectId)

                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 120)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "issue_delete_issue")
                            put("arguments", buildJsonObject {
                                put("id", deleted)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because list_issues doesn't have includeDeleted parameter yet
                val issues = listIssues(client, includeDeleted = true)

                // Should return both issues
                issues shouldHaveSize 2

                // Verify deleted issue has deletedAt timestamp
                val deletedIssue = issues.find {
                    it.jsonObject["id"]?.jsonPrimitive?.content == deleted
                }
                deletedIssue.shouldNotBeNull()
                deletedIssue.jsonObject["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldNotBeNull()

                // Verify active issue has null deletedAt
                val activeIssue = issues.find {
                    it.jsonObject["id"]?.jsonPrimitive?.content == active
                }
                activeIssue.shouldNotBeNull()
                activeIssue.jsonObject["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldBeNull()
            }
        }
    }
})
