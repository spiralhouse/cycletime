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
 * Integration tests for Project MCP tools with soft-deletion support.
 *
 * **TDD RED PHASE (SPI-879)**: These tests define the expected behavior for:
 * - Soft-deletion via `delete_project` tool
 * - Restoration via `restore_project` tool
 * - List deleted via `list_deleted_projects` tool
 * - Include deleted via `includeDeleted` parameter on `list_projects`
 *
 * ## Expected Test Failures:
 * All tests in this file are EXPECTED TO FAIL initially because:
 * - `delete_project` still performs hard-deletion (not soft-deletion)
 * - `restore_project` tool does not exist yet
 * - `list_deleted_projects` tool does not exist yet
 * - `list_projects` does not have `includeDeleted` parameter
 *
 * This is the RED phase of TDD - tests fail to demonstrate missing implementation.
 */
class ProjectToolIntegrationTest : DescribeSpec({

    /**
     * Helper function to create a test project via MCP tool.
     * Returns the project ID extracted from the response.
     */
    suspend fun createProject(client: io.ktor.client.HttpClient, name: String, description: String? = null): String {
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

        val projectIdRegex = "\"id\"\\s*:\\s*\"([0-9a-f-]+)\"".toRegex()
        val match = projectIdRegex.find(textContent)
        return match?.groupValues?.get(1) ?: error("Failed to extract project ID from response: $textContent")
    }

    /**
     * Helper function to get a project by ID via MCP tool.
     */
    suspend fun getProject(client: io.ktor.client.HttpClient, projectId: String): JsonObject? {
        val response = client.post("/mcp") {
            header("Content-Type", "application/json")
            setBody(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 2)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "project_get_project")
                    put("arguments", buildJsonObject {
                        put("id", projectId)
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
     * Helper function to list projects via MCP tool with optional includeDeleted parameter.
     */
    suspend fun listProjects(client: io.ktor.client.HttpClient, includeDeleted: Boolean? = null): JsonArray {
        val response = client.post("/mcp") {
            header("Content-Type", "application/json")
            setBody(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 3)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "project_list_projects")
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

        val projectsResponse = Json.parseToJsonElement(textContent).jsonObject
        return projectsResponse["projects"]?.jsonArray ?: buildJsonArray {}
    }

    describe("delete_project tool") {
        it("should perform soft-deletion not hard-deletion") {
            testSDKApplication {
                // Create a project
                val projectId = createProject(client, "Test Project for Soft-Delete")

                // Delete the project via MCP tool
                val deleteResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 10)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "project_delete_project")
                            put("arguments", buildJsonObject {
                                put("id", projectId)
                            })
                        })
                    }.toString())
                }

                deleteResponse.status shouldBe HttpStatusCode.OK

                val deleteJson = Json.parseToJsonElement(deleteResponse.bodyAsText()).jsonObject
                val deleteResult = deleteJson["result"]?.jsonObject.shouldNotBeNull()

                // RED: This will FAIL because delete_project doesn't exist yet
                // or still performs hard-deletion

                // Verify project is not returned by standard get (excludes deleted)
                val project = getProject(client, projectId)
                project.shouldBeNull() // Standard get should not find deleted projects

                // RED: This will FAIL because get_project doesn't have includeDeleted parameter yet
                // Verify project IS returned when includeDeleted=true
                val includeDeletedResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 11)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "project_get_project")
                            put("arguments", buildJsonObject {
                                put("id", projectId)
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
                val deletedProject = Json.parseToJsonElement(includeDeletedText).jsonObject

                // Verify deletedAt timestamp is set
                deletedProject["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldNotBeNull()
            }
        }

        it("should be idempotent when deleting already-deleted project") {
            testSDKApplication {
                val projectId = createProject(client, "Test Idempotent Delete")

                // Delete once
                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 20)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "project_delete_project")
                            put("arguments", buildJsonObject {
                                put("id", projectId)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because delete_project doesn't exist yet
                // Delete again - should succeed (idempotent)
                val secondDeleteResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 21)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "project_delete_project")
                            put("arguments", buildJsonObject {
                                put("id", projectId)
                            })
                        })
                    }.toString())
                }

                secondDeleteResponse.status shouldBe HttpStatusCode.OK

                val secondDeleteJson = Json.parseToJsonElement(secondDeleteResponse.bodyAsText()).jsonObject
                val secondDeleteResult = secondDeleteJson["result"]?.jsonObject.shouldNotBeNull()

                // Should not throw error - idempotent operation
                // Success is indicated by presence of result (and absence of error)
                secondDeleteJson["error"].shouldBeNull()
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

                // RED: This will FAIL because delete_project description doesn't mention soft-deletion yet
                val deleteTool = tools.find {
                    it.jsonObject["name"]?.jsonPrimitive?.content == "project_delete_project"
                }

                deleteTool.shouldNotBeNull()
                val description = deleteTool.jsonObject["description"]?.jsonPrimitive?.content.shouldNotBeNull()

                // Description should indicate soft-deletion (can be recovered)
                description shouldContain "soft"
            }
        }
    }

    describe("restore_project tool") {
        it("should restore soft-deleted project") {
            testSDKApplication {
                // Create and delete a project
                val projectId = createProject(client, "Test Restore Project")
                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 40)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "project_delete_project")
                            put("arguments", buildJsonObject {
                                put("id", projectId)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because restore_project tool doesn't exist yet
                // Restore the project
                val restoreResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 41)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "project_restore_project")
                            put("arguments", buildJsonObject {
                                put("id", projectId)
                            })
                        })
                    }.toString())
                }

                restoreResponse.status shouldBe HttpStatusCode.OK

                val restoreJson = Json.parseToJsonElement(restoreResponse.bodyAsText()).jsonObject
                val restoreResult = restoreJson["result"]?.jsonObject.shouldNotBeNull()
                val restoreContent = restoreResult["content"]?.jsonArray.shouldNotBeNull()
                val restoreText = restoreContent[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()
                val restoredProject = Json.parseToJsonElement(restoreText).jsonObject

                // Verify deletedAt is null (cleared)
                restoredProject["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldBeNull()

                // Verify project is now returned by standard get
                val project = getProject(client, projectId)
                project.shouldNotBeNull()
                project["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldBeNull()
            }
        }

        it("should be idempotent when restoring already-active project") {
            testSDKApplication {
                val projectId = createProject(client, "Test Idempotent Restore")

                // RED: This will FAIL because restore_project tool doesn't exist yet
                // Restore active project - should succeed (idempotent)
                val restoreResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 50)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "project_restore_project")
                            put("arguments", buildJsonObject {
                                put("id", projectId)
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

        it("should fail when restoring non-existent project") {
            testSDKApplication {
                val nonExistentId = "00000000-0000-0000-0000-000000000000"

                // RED: This will FAIL because restore_project tool doesn't exist yet
                val restoreResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 60)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "project_restore_project")
                            put("arguments", buildJsonObject {
                                put("id", nonExistentId)
                            })
                        })
                    }.toString())
                }

                // Should return error response
                restoreResponse.status shouldBe HttpStatusCode.OK // JSON-RPC returns 200 with error object

                val restoreJson = Json.parseToJsonElement(restoreResponse.bodyAsText()).jsonObject

                // Should have error object
                val error = restoreJson["error"]?.jsonObject
                error.shouldNotBeNull()

                val errorMessage = error["message"]?.jsonPrimitive?.content.shouldNotBeNull()
                errorMessage shouldContain "not found"
            }
        }
    }

    describe("list_deleted_projects tool") {
        it("should return only deleted projects") {
            testSDKApplication {
                // Create 3 projects
                val project1 = createProject(client, "Active Project 1")
                val project2 = createProject(client, "To Delete 1")
                val project3 = createProject(client, "To Delete 2")

                // Delete 2 of them
                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 70)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "project_delete_project")
                            put("arguments", buildJsonObject {
                                put("id", project2)
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
                            put("name", "project_delete_project")
                            put("arguments", buildJsonObject {
                                put("id", project3)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because list_deleted_projects tool doesn't exist yet
                val deletedResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 72)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "project_list_deleted_projects")
                            put("arguments", buildJsonObject {})
                        })
                    }.toString())
                }

                deletedResponse.status shouldBe HttpStatusCode.OK

                val deletedJson = Json.parseToJsonElement(deletedResponse.bodyAsText()).jsonObject
                val deletedResult = deletedJson["result"]?.jsonObject.shouldNotBeNull()
                val deletedContent = deletedResult["content"]?.jsonArray.shouldNotBeNull()
                val deletedText = deletedContent[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()
                val deletedProjects = Json.parseToJsonElement(deletedText).jsonArray

                // Should return exactly 2 deleted projects
                deletedProjects shouldHaveSize 2

                // Verify all returned projects have deletedAt timestamp
                deletedProjects.forEach { project ->
                    val deletedAt = project.jsonObject["deletedAt"]?.jsonPrimitive?.contentOrNull
                    deletedAt.shouldNotBeNull()
                }
            }
        }

        it("should return empty list when no projects are deleted") {
            testSDKApplication {
                // Create active projects only
                createProject(client, "Active Only 1")
                createProject(client, "Active Only 2")

                // RED: This will FAIL because list_deleted_projects tool doesn't exist yet
                val deletedResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 80)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "project_list_deleted_projects")
                            put("arguments", buildJsonObject {})
                        })
                    }.toString())
                }

                deletedResponse.status shouldBe HttpStatusCode.OK

                val deletedJson = Json.parseToJsonElement(deletedResponse.bodyAsText()).jsonObject
                val deletedResult = deletedJson["result"]?.jsonObject.shouldNotBeNull()
                val deletedContent = deletedResult["content"]?.jsonArray.shouldNotBeNull()
                val deletedText = deletedContent[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()
                val deletedProjects = Json.parseToJsonElement(deletedText).jsonArray

                deletedProjects.shouldBeEmpty()
            }
        }

        it("should order deleted projects by deletion date DESC") {
            testSDKApplication {
                // Create and delete 3 projects in sequence
                val project1 = createProject(client, "Delete First")
                Thread.sleep(10) // Ensure different timestamps
                val project2 = createProject(client, "Delete Second")
                Thread.sleep(10)
                val project3 = createProject(client, "Delete Third")

                // Delete in order
                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 90)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "project_delete_project")
                            put("arguments", buildJsonObject { put("id", project1) })
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
                            put("name", "project_delete_project")
                            put("arguments", buildJsonObject { put("id", project2) })
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
                            put("name", "project_delete_project")
                            put("arguments", buildJsonObject { put("id", project3) })
                        })
                    }.toString())
                }

                // RED: This will FAIL because list_deleted_projects tool doesn't exist yet
                val deletedResponse = client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 93)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "project_list_deleted_projects")
                            put("arguments", buildJsonObject {})
                        })
                    }.toString())
                }

                val deletedJson = Json.parseToJsonElement(deletedResponse.bodyAsText()).jsonObject
                val deletedResult = deletedJson["result"]?.jsonObject.shouldNotBeNull()
                val deletedContent = deletedResult["content"]?.jsonArray.shouldNotBeNull()
                val deletedText = deletedContent[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()
                val deletedProjects = Json.parseToJsonElement(deletedText).jsonArray

                // Most recently deleted should be first (project3)
                deletedProjects shouldHaveSize 3
                deletedProjects[0].jsonObject["id"]?.jsonPrimitive?.content shouldBe project3
                deletedProjects[1].jsonObject["id"]?.jsonPrimitive?.content shouldBe project2
                deletedProjects[2].jsonObject["id"]?.jsonPrimitive?.content shouldBe project1
            }
        }
    }

    describe("list_projects tool with includeDeleted parameter") {
        it("should exclude deleted projects by default") {
            testSDKApplication {
                // Create 2 projects, delete 1
                val active = createProject(client, "Active Project")
                val deleted = createProject(client, "Deleted Project")

                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 100)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "project_delete_project")
                            put("arguments", buildJsonObject {
                                put("id", deleted)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because list_projects doesn't exclude deleted yet
                // List without includeDeleted parameter
                val projects = listProjects(client)

                // Should only return 1 active project
                projects shouldHaveSize 1
                projects[0].jsonObject["id"]?.jsonPrimitive?.content shouldBe active
            }
        }

        it("should exclude deleted when includeDeleted=false") {
            testSDKApplication {
                // Create 2 projects, delete 1
                val active = createProject(client, "Active Project")
                val deleted = createProject(client, "Deleted Project")

                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 110)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "project_delete_project")
                            put("arguments", buildJsonObject {
                                put("id", deleted)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because list_projects doesn't have includeDeleted parameter yet
                // List with includeDeleted=false
                val projects = listProjects(client, includeDeleted = false)

                // Should only return 1 active project
                projects shouldHaveSize 1
                projects[0].jsonObject["id"]?.jsonPrimitive?.content shouldBe active
            }
        }

        it("should include deleted when includeDeleted=true") {
            testSDKApplication {
                // Create 2 projects, delete 1
                val active = createProject(client, "Active Project")
                val deleted = createProject(client, "Deleted Project")

                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 120)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "project_delete_project")
                            put("arguments", buildJsonObject {
                                put("id", deleted)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because list_projects doesn't have includeDeleted parameter yet
                // List with includeDeleted=true
                val projects = listProjects(client, includeDeleted = true)

                // Should return both projects
                projects shouldHaveSize 2

                // Verify deleted project has deletedAt timestamp
                val deletedProject = projects.find {
                    it.jsonObject["id"]?.jsonPrimitive?.content == deleted
                }
                deletedProject.shouldNotBeNull()
                deletedProject.jsonObject["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldNotBeNull()

                // Verify active project has null deletedAt
                val activeProject = projects.find {
                    it.jsonObject["id"]?.jsonPrimitive?.content == active
                }
                activeProject.shouldNotBeNull()
                activeProject.jsonObject["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldBeNull()
            }
        }

        it("should include deletedAt field in response when present") {
            testSDKApplication {
                // Create and delete a project
                val deleted = createProject(client, "To Be Deleted")

                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    setBody(buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", 130)
                        put("method", "tools/call")
                        put("params", buildJsonObject {
                            put("name", "project_delete_project")
                            put("arguments", buildJsonObject {
                                put("id", deleted)
                            })
                        })
                    }.toString())
                }

                // RED: This will FAIL because list_projects doesn't have includeDeleted parameter yet
                // List with includeDeleted=true
                val projects = listProjects(client, includeDeleted = true)

                projects shouldHaveSize 1
                val project = projects[0].jsonObject

                // Verify deletedAt field exists and is not null
                project["deletedAt"].shouldNotBeNull()
                project["deletedAt"]?.jsonPrimitive?.contentOrNull.shouldNotBeNull()
            }
        }
    }
})
