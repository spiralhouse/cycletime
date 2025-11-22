package io.spiralhouse.cycletime.integration.mcp

import io.kotest.core.spec.style.StringSpec
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
 * MCP Integration Test Suite for Soft-Deletion Feature (SPI-720 Epic)
 *
 * Tests MCP tools end-to-end via HTTP to verify:
 * - Soft-deletion tools (delete_project, delete_issue)
 * - Restoration tools (restore_project, restore_issue)
 * - List deleted tools (list_deleted_projects, list_deleted_issues)
 * - includeDeleted parameter on list tools
 * - Error handling for validation failures
 * - Parent-first restoration rule enforcement
 *
 * ## Test Framework
 * - Kotest StringSpec for BDD-style test naming
 * - Ktor testApplication for HTTP integration testing
 * - Real MCP SDK server with database
 *
 * ## Scope
 * MCP tools end-to-end via HTTP (not application service tests)
 */
class SoftDeletionMCPIntegrationTest : StringSpec({

    // ================================================================================
    // Helper Functions
    // ================================================================================

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

    suspend fun getProject(client: io.ktor.client.HttpClient, projectId: String, includeDeleted: Boolean = false): JsonObject? {
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
                        put("includeDeleted", includeDeleted)
                    })
                })
            }.toString())
        }

        if (response.status != HttpStatusCode.OK) return null

        val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
        if (jsonResponse.containsKey("error")) return null

        val result = jsonResponse["result"]?.jsonObject ?: return null
        val content = result["content"]?.jsonArray ?: return null
        if (content.isEmpty()) return null

        val textContent = content[0].jsonObject["text"]?.jsonPrimitive?.content ?: return null
        if (textContent.startsWith("Tool handler error:")) return null

        return try {
            Json.parseToJsonElement(textContent).jsonObject
        } catch (e: Exception) {
            null
        }
    }

    suspend fun deleteProject(client: io.ktor.client.HttpClient, projectId: String): HttpResponse {
        return client.post("/mcp") {
            header("Content-Type", "application/json")
            setBody(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 3)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "project_delete_project")
                    put("arguments", buildJsonObject {
                        put("id", projectId)
                    })
                })
            }.toString())
        }
    }

    suspend fun restoreProject(client: io.ktor.client.HttpClient, projectId: String): HttpResponse {
        return client.post("/mcp") {
            header("Content-Type", "application/json")
            setBody(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 4)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "project_restore_project")
                    put("arguments", buildJsonObject {
                        put("id", projectId)
                    })
                })
            }.toString())
        }
    }

    suspend fun listProjects(client: io.ktor.client.HttpClient, includeDeleted: Boolean? = null): JsonArray {
        val response = client.post("/mcp") {
            header("Content-Type", "application/json")
            setBody(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 5)
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

    suspend fun listDeletedProjects(client: io.ktor.client.HttpClient): JsonArray {
        val response = client.post("/mcp") {
            header("Content-Type", "application/json")
            setBody(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 6)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "project_list_deleted_projects")
                    put("arguments", buildJsonObject {})
                })
            }.toString())
        }

        response.status shouldBe HttpStatusCode.OK

        val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
        val result = jsonResponse["result"]?.jsonObject.shouldNotBeNull()
        val content = result["content"]?.jsonArray.shouldNotBeNull()
        val textContent = content[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()

        // Tool returns JsonArray directly (not wrapped in object)
        return Json.parseToJsonElement(textContent).jsonArray
    }

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
                put("id", 7)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "issue_create_issue")
                    put("arguments", buildJsonObject {
                        put("title", title)
                        put("type", type)
                        put("projectId", projectId)
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

    suspend fun deleteIssue(client: io.ktor.client.HttpClient, issueId: String): HttpResponse {
        return client.post("/mcp") {
            header("Content-Type", "application/json")
            setBody(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 8)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "issue_delete_issue")
                    put("arguments", buildJsonObject {
                        put("id", issueId)
                    })
                })
            }.toString())
        }
    }

    suspend fun restoreIssue(client: io.ktor.client.HttpClient, issueId: String): HttpResponse {
        return client.post("/mcp") {
            header("Content-Type", "application/json")
            setBody(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 9)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "issue_restore_issue")
                    put("arguments", buildJsonObject {
                        put("id", issueId)
                    })
                })
            }.toString())
        }
    }

    suspend fun listDeletedIssues(client: io.ktor.client.HttpClient): JsonArray {
        val response = client.post("/mcp") {
            header("Content-Type", "application/json")
            setBody(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 10)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "issue_list_deleted_issues")
                    put("arguments", buildJsonObject {})
                })
            }.toString())
        }

        response.status shouldBe HttpStatusCode.OK

        val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
        val result = jsonResponse["result"]?.jsonObject.shouldNotBeNull()
        val content = result["content"]?.jsonArray.shouldNotBeNull()
        val textContent = content[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()

        // Tool returns JsonArray directly (not wrapped in object)
        return Json.parseToJsonElement(textContent).jsonArray
    }

    // ================================================================================
    // MCP Restore Tools
    // ================================================================================

    "mcp__cycletime__project_restore_project should restore soft-deleted project" {
        testSDKApplication {
            // 1. Create and delete project via MCP tools
            val projectId = createProject(client, "Test Project for Restore")
            deleteProject(client, projectId)

            // Verify project is deleted (not found in default query)
            val deletedProject = getProject(client, projectId, includeDeleted = false)
            deletedProject.shouldBeNull()

            // 2. Call MCP tool: restore_project
            val restoreResponse = restoreProject(client, projectId)

            // 3. Verify project restored (deleted_at IS NULL)
            restoreResponse.status shouldBe HttpStatusCode.OK

            val restoredProject = getProject(client, projectId, includeDeleted = false)
            restoredProject.shouldNotBeNull()

            // 4. Verify MCP response indicates success
            val jsonResponse = Json.parseToJsonElement(restoreResponse.bodyAsText()).jsonObject
            val result = jsonResponse["result"]?.jsonObject.shouldNotBeNull()
            val content = result["content"]?.jsonArray.shouldNotBeNull()
            content shouldHaveSize 1

            val textContent = content[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()
            textContent shouldContain "id"
            textContent shouldContain projectId
        }
    }

    "mcp__cycletime__issue_restore_issue should restore soft-deleted issue" {
        testSDKApplication {
            // 1. Create project and issue
            val projectId = createProject(client, "Project for Issue Restore")
            val issueId = createIssue(client, "Issue to Restore", projectId)

            // 2. Delete issue
            deleteIssue(client, issueId)

            // 3. Call MCP tool: restore_issue
            val restoreResponse = restoreIssue(client, issueId)

            // 4. Verify issue restored
            restoreResponse.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(restoreResponse.bodyAsText()).jsonObject
            val result = jsonResponse["result"]?.jsonObject.shouldNotBeNull()
            val content = result["content"]?.jsonArray.shouldNotBeNull()
            content shouldHaveSize 1

            val textContent = content[0].jsonObject["text"]?.jsonPrimitive?.content.shouldNotBeNull()
            textContent shouldContain "id"
            textContent shouldContain issueId
        }
    }

    "mcp__cycletime__issue_restore_issue should fail when parent deleted" {
        testSDKApplication {
            // 1. Create project with parent story and child subtask
            val projectId = createProject(client, "Project for Parent Test")
            val storyId = createIssue(client, "Parent Story", projectId, type = "STORY")
            val subtaskId = createIssue(client, "Child Subtask", projectId, type = "SUBTASK", parentId = storyId)

            // 2. Delete parent story (cascades to subtask)
            deleteIssue(client, storyId)

            // 3. Attempt to restore subtask via MCP tool
            val restoreResponse = restoreIssue(client, subtaskId)

            // 4. Verify error response with clear message
            restoreResponse.status shouldBe HttpStatusCode.OK // JSON-RPC returns 200 even for errors

            val jsonResponse = Json.parseToJsonElement(restoreResponse.bodyAsText()).jsonObject
            val error = jsonResponse["error"]?.jsonObject.shouldNotBeNull()
            val errorMessage = error["message"]?.jsonPrimitive?.content.shouldNotBeNull()

            errorMessage shouldContain "Tool handler error"
            errorMessage shouldContain "parent"
            errorMessage shouldContain "deleted"

            // 5. Verify subtask NOT restored (still in deleted list)
            val deletedIssues = listDeletedIssues(client)
            val subtaskStillDeleted = deletedIssues.any {
                it.jsonObject["id"]?.jsonPrimitive?.content == subtaskId
            }
            subtaskStillDeleted shouldBe true
        }
    }

    // ================================================================================
    // MCP List Deleted Tools
    // ================================================================================

    "mcp__cycletime__project_list_deleted should return only soft-deleted projects" {
        testSDKApplication {
            // 1. Create 5 projects, delete 2
            val project1 = createProject(client, "Active Project 1")
            val project2 = createProject(client, "Deleted Project 1")
            val project3 = createProject(client, "Active Project 2")
            val project4 = createProject(client, "Deleted Project 2")
            val project5 = createProject(client, "Active Project 3")

            deleteProject(client, project2)
            deleteProject(client, project4)

            // 2. Call list_deleted_projects
            val deletedProjects = listDeletedProjects(client)

            // 3. Verify only 2 deleted projects returned
            deletedProjects shouldHaveSize 2

            val deletedIds = deletedProjects.map { it.jsonObject["id"]?.jsonPrimitive?.content }
            deletedIds.contains(project2) shouldBe true
            deletedIds.contains(project4) shouldBe true

            // 4. Verify sorted by deletion date (most recent first)
            // Note: Both deleted at nearly same time, so order validation is brittle
            // Just verify they're both present
            deletedProjects.forEach { project ->
                val deletedAt = project.jsonObject["deletedAt"]
                deletedAt.shouldNotBeNull()
            }
        }
    }

    "mcp__cycletime__issue_list_deleted should return only soft-deleted issues" {
        testSDKApplication {
            // 1. Create project with 5 issues, delete 2
            val projectId = createProject(client, "Project for Deleted Issues")
            val issue1 = createIssue(client, "Active Issue 1", projectId)
            val issue2 = createIssue(client, "Deleted Issue 1", projectId)
            val issue3 = createIssue(client, "Active Issue 2", projectId)
            val issue4 = createIssue(client, "Deleted Issue 2", projectId)
            val issue5 = createIssue(client, "Active Issue 3", projectId)

            deleteIssue(client, issue2)
            deleteIssue(client, issue4)

            // 2. Call list_deleted_issues
            val deletedIssues = listDeletedIssues(client)

            // 3. Verify only deleted issues returned
            deletedIssues shouldHaveSize 2

            val deletedIds = deletedIssues.map { it.jsonObject["id"]?.jsonPrimitive?.content }
            deletedIds.contains(issue2) shouldBe true
            deletedIds.contains(issue4) shouldBe true

            // 4. Verify deletedAt timestamps present
            deletedIssues.forEach { issue ->
                val deletedAt = issue.jsonObject["deletedAt"]
                deletedAt.shouldNotBeNull()
            }
        }
    }

    // ================================================================================
    // MCP includeDeleted Parameter
    // ================================================================================

    "mcp__cycletime__project_list_projects with includeDeleted=false should return only active" {
        testSDKApplication {
            // 1. Create 5 projects, delete 2
            val project1 = createProject(client, "Active 1")
            val project2 = createProject(client, "Deleted 1")
            val project3 = createProject(client, "Active 2")
            val project4 = createProject(client, "Deleted 2")
            val project5 = createProject(client, "Active 3")

            deleteProject(client, project2)
            deleteProject(client, project4)

            // 2. Call list_projects with includeDeleted=false
            val activeProjects = listProjects(client, includeDeleted = false)

            // 3. Verify 3 active returned
            activeProjects shouldHaveSize 3

            val activeIds = activeProjects.map { it.jsonObject["id"]?.jsonPrimitive?.content }
            activeIds.contains(project1) shouldBe true
            activeIds.contains(project3) shouldBe true
            activeIds.contains(project5) shouldBe true
        }
    }

    "mcp__cycletime__project_list_projects with includeDeleted=true should return all" {
        testSDKApplication {
            // 1. Create 5 projects, delete 2
            val project1 = createProject(client, "All Active 1")
            val project2 = createProject(client, "All Deleted 1")
            val project3 = createProject(client, "All Active 2")
            val project4 = createProject(client, "All Deleted 2")
            val project5 = createProject(client, "All Active 3")

            deleteProject(client, project2)
            deleteProject(client, project4)

            // 2. Call list_projects with includeDeleted=true
            val allProjects = listProjects(client, includeDeleted = true)

            // 3. Verify all 5 returned (with deleted_at timestamps on deleted items)
            allProjects shouldHaveSize 5

            val allIds = allProjects.map { it.jsonObject["id"]?.jsonPrimitive?.content }
            allIds.contains(project1) shouldBe true
            allIds.contains(project2) shouldBe true
            allIds.contains(project3) shouldBe true
            allIds.contains(project4) shouldBe true
            allIds.contains(project5) shouldBe true

            // 4. Verify deleted_at timestamps present on deleted items
            val deletedProject2 = allProjects.find {
                it.jsonObject["id"]?.jsonPrimitive?.content == project2
            }
            deletedProject2.shouldNotBeNull()
            deletedProject2.jsonObject["deletedAt"].shouldNotBeNull()

            val deletedProject4 = allProjects.find {
                it.jsonObject["id"]?.jsonPrimitive?.content == project4
            }
            deletedProject4.shouldNotBeNull()
            deletedProject4.jsonObject["deletedAt"].shouldNotBeNull()
        }
    }

    // ================================================================================
    // Error Handling
    // ================================================================================

    "MCP tools should return clear error messages for validation failures" {
        testSDKApplication {
            // Test various error scenarios

            // 1. Restore non-existent project ID
            val fakeProjectId = "00000000-0000-0000-0000-000000000000"
            val restoreNonExistent = restoreProject(client, fakeProjectId)
            restoreNonExistent.status shouldBe HttpStatusCode.OK // JSON-RPC returns 200 even for errors

            val jsonResponse1 = Json.parseToJsonElement(restoreNonExistent.bodyAsText()).jsonObject
            val error1 = jsonResponse1["error"]?.jsonObject.shouldNotBeNull()
            val errorMessage1 = error1["message"]?.jsonPrimitive?.content.shouldNotBeNull()
            errorMessage1 shouldContain "Tool handler error"

            // 2. Delete non-existent project (should fail or be idempotent)
            val deleteNonExistent = deleteProject(client, fakeProjectId)
            deleteNonExistent.status shouldBe HttpStatusCode.OK

            val jsonResponse2 = Json.parseToJsonElement(deleteNonExistent.bodyAsText()).jsonObject
            val error2 = jsonResponse2["error"]?.jsonObject.shouldNotBeNull()
            val errorMessage2 = error2["message"]?.jsonPrimitive?.content.shouldNotBeNull()
            // Depending on implementation, this might succeed (idempotent) or error
            // Document behavior here

            // 3. Verify error messages are user-friendly (not stack traces)
            errorMessage1.contains("Exception") shouldBe false // Should not leak exceptions
            errorMessage1.contains("at io.spiralhouse") shouldBe false // Should not contain stack traces
        }
    }
})
