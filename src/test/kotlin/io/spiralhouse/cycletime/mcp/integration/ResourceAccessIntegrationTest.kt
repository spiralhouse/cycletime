package io.spiralhouse.cycletime.mcp.integration

import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldNotContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.types.shouldBeInstanceOf
import io.kotest.matchers.comparables.shouldBeLessThan
import io.kotest.assertions.timing.eventually
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.spiralhouse.cycletime.mcp.integration.fixtures.MCPIntegrationTestBase
import io.spiralhouse.cycletime.mcp.integration.fixtures.TestDataFactory
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.serialization.json.*
import kotlin.time.Duration.Companion.seconds

/**
 * Integration tests for MCP resource access and content delivery.
 * 
 * These tests verify complete integration between:
 * - Resource registry populated with CycleTime resource providers
 * - Resource URI schema and routing to appropriate providers
 * - Resource content formatting and MIME type handling
 * - Resource caching behavior and cache invalidation
 * - Resource subscriptions and change notifications
 * - Dynamic resource discovery and listing
 * - Resource access control and error handling
 * - Resource content consistency with domain data
 * 
 * RED PHASE EXPECTATION: ALL TESTS SHOULD FAIL
 * These tests will fail during RED phase due to:
 * - Resource registry not populated with CycleTime providers
 * - Resource URI routing not implemented
 * - Resource content providers not connected to domain services
 * - Resource caching infrastructure missing
 * - Resource subscription mechanism not implemented
 * - Error handling for missing/invalid resources missing
 * 
 * Each failure will guide GREEN phase implementation of complete resource system.
 */
class ResourceAccessIntegrationTest : MCPIntegrationTestBase() {

    init {
        "should list all available resources with correct URIs and metadata" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // EXPECTED FAILURE: Resources list handler not implemented
                val resourcesResponse = client.listResources()
                validateResourcesList(resourcesResponse)
                
                val result = resourcesResponse.jsonObject["result"]?.jsonObject
                val resources = result!!["resources"]?.jsonArray!!
                
                // Verify expected CycleTime resources are present
                val expectedResources = TestDataFactory.createExpectedResourcesList()
                val actualUris = resources.map { 
                    it.jsonObject["uri"]?.jsonPrimitive?.content 
                }
                
                expectedResources.forEach { expectedUri ->
                    actualUris shouldContain expectedUri
                }
                
                // Verify resource metadata
                resources.forEach { resource ->
                    val resourceObj = resource.jsonObject
                    
                    resourceObj["uri"] shouldNotBe null
                    resourceObj["name"] shouldNotBe null
                    resourceObj["description"] shouldNotBe null
                    resourceObj["mimeType"] shouldNotBe null
                    
                    // CycleTime resources should be JSON
                    val uri = resourceObj["uri"]?.jsonPrimitive?.content
                    if (uri?.startsWith("cycletime://") == true) {
                        resourceObj["mimeType"]?.jsonPrimitive?.content shouldBe "application/json"
                    }
                }
            }
        }
        
        "should read project resources with correct format and content" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // Create test project for resource reading
                val projectId = createTestProject(client, "Resource Read Test Project")
                
                // Read specific project resource
                val projectUri = "cycletime://projects/$projectId"
                
                // EXPECTED FAILURE: Resource read handler not implemented
                val resourceResponse = client.readResource(projectUri)
                validateResourceReadResponse(resourceResponse, projectUri)
                
                val result = resourceResponse.jsonObject["result"]?.jsonObject
                val contents = result!!["contents"]?.jsonArray?.get(0)?.jsonObject
                
                // Verify resource content structure
                contents?.get("uri")?.jsonPrimitive?.content shouldBe projectUri
                contents?.get("mimeType")?.jsonPrimitive?.content shouldBe "application/json"
                
                val resourceText = contents?.get("text")?.jsonPrimitive?.content
                resourceText shouldNotBe null
                
                // Parse and validate JSON content
                val projectData = json.parseToJsonElement(resourceText!!)
                val projectObj = projectData.jsonObject
                
                projectObj["id"]?.jsonPrimitive?.content shouldBe projectId
                projectObj["name"]?.jsonPrimitive?.content shouldBe "Resource Read Test Project"
                projectObj["status"] shouldNotBe null
                projectObj["created_at"] shouldNotBe null
                projectObj["updated_at"] shouldNotBe null
                
                // Read projects collection resource
                val projectsUri = "cycletime://projects"
                val projectsResponse = client.readResource(projectsUri)
                validateResourceReadResponse(projectsResponse, projectsUri)
                
                val projectsResult = projectsResponse.jsonObject["result"]?.jsonObject
                val projectsContent = projectsResult!!["contents"]?.jsonArray?.get(0)?.jsonObject
                val projectsText = projectsContent?.get("text")?.jsonPrimitive?.content
                
                // Should contain our created project
                projectsText!! shouldContain projectId
                projectsText shouldContain "Resource Read Test Project"
            }
        }
        
        "should handle resource caching correctly with cache invalidation" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // Create project for caching test
                val projectId = createTestProject(client, "Cache Test Project")
                val projectUri = "cycletime://projects/$projectId"
                
                // First read - should populate cache
                val firstRead = client.readResource(projectUri)
                validateResourceReadResponse(firstRead, projectUri)
                
                val firstContent = firstRead.jsonObject["result"]?.jsonObject
                    ?.get("contents")?.jsonArray?.get(0)?.jsonObject
                    ?.get("text")?.jsonPrimitive?.content
                
                // Second read - should use cache (should be fast)
                val (secondRead, secondTiming) = measureTime {
                    client.readResource(projectUri)
                }
                validateResourceReadResponse(secondRead, projectUri)
                
                val secondContent = secondRead.jsonObject["result"]?.jsonObject
                    ?.get("contents")?.jsonArray?.get(0)?.jsonObject
                    ?.get("text")?.jsonPrimitive?.content
                
                // Content should be identical (cached)
                secondContent shouldBe firstContent
                
                // EXPECTED FAILURE: Caching mechanism not implemented
                // Should be significantly faster (< 50ms for cached read)
                secondTiming shouldBeLessThan 50
                
                // Update project to invalidate cache
                val updateRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "cache-invalidation-test")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("name", "update_project")
                        put("arguments", buildJsonObject {
                            put("project_id", projectId)
                            put("description", "Updated to invalidate cache")
                        })
                    })
                }
                
                client.sendRequest(updateRequest)
                
                // Third read - cache should be invalidated
                val thirdRead = client.readResource(projectUri)
                val thirdContent = thirdRead.jsonObject["result"]?.jsonObject
                    ?.get("contents")?.jsonArray?.get(0)?.jsonObject
                    ?.get("text")?.jsonPrimitive?.content
                
                // Content should be different (cache invalidated)
                thirdContent!! shouldContain "Updated to invalidate cache"
                thirdContent shouldNotBe firstContent
            }
        }
        
        "should return proper errors for missing resources with correct status codes" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // Test various non-existent resource scenarios
                val nonExistentResources = listOf(
                    "cycletime://projects/non-existent-id",
                    "cycletime://issues/missing-issue",
                    "cycletime://sessions/invalid-session",
                    "cycletime://workflows/bad-workflow-id"
                )
                
                nonExistentResources.forEach { uri ->
                    // EXPECTED FAILURE: Resource error handling not implemented
                    val errorResponse = client.readResource(uri)
                    
                    // Should get proper error response
                    validateJsonRpcError(errorResponse)
                    
                    val error = errorResponse.jsonObject["error"]?.jsonObject
                    
                    // Should use appropriate error code for not found
                    val errorCode = error!!["code"]?.jsonPrimitive?.int!!
                    val validNotFoundCodes = listOf(-32603, -32000, 404) // Internal error or custom not found
                    validNotFoundCodes shouldContain errorCode
                    
                    error["message"]?.jsonPrimitive?.content shouldContain "not found"
                }
                
                // Test invalid URI format
                val invalidUris = listOf(
                    "invalid-uri-format",
                    "cycletime://",
                    "cycletime://unknown_resource_type",
                    "http://external.com/resource"
                )
                
                invalidUris.forEach { uri ->
                    val invalidResponse = client.readResource(uri)
                    validateJsonRpcError(invalidResponse)
                    
                    val error = invalidResponse.jsonObject["error"]?.jsonObject
                    error!!["message"]?.jsonPrimitive?.content shouldContain "invalid"
                }
            }
        }
        
        "should handle resource subscriptions and change notifications" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // EXPECTED FAILURE: Resource subscription mechanism not implemented
                val subscribeRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "subscribe-test")
                    put("method", "resources/subscribe")
                    put("params", buildJsonObject {
                        put("uri", "cycletime://projects")
                    })
                }
                
                val subscribeResponse = client.sendRequest(subscribeRequest)
                validateJsonRpcResponse(subscribeResponse)
                
                // Create a project to trigger notification
                val projectId = createTestProject(client, "Subscription Test Project")
                
                // Should receive resource changed notification
                // EXPECTED FAILURE: Notification mechanism not implemented
                // This will be implemented in GREEN phase
                
                // Unsubscribe
                val unsubscribeRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "unsubscribe-test")
                    put("method", "resources/unsubscribe")
                    put("params", buildJsonObject {
                        put("uri", "cycletime://projects")
                    })
                }
                
                val unsubscribeResponse = client.sendRequest(unsubscribeRequest)
                validateJsonRpcResponse(unsubscribeResponse)
            }
        }
        
        "should handle concurrent resource access efficiently" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // Create multiple projects for concurrent access
                val projectIds = (1..5).map { index ->
                    createTestProject(client, "Concurrent Access Project $index")
                }
                
                // Perform concurrent resource reads
                val concurrentReads = projectIds.flatMap { projectId ->
                    listOf(
                        async { client.readResource("cycletime://projects/$projectId") },
                        async { client.readResource("cycletime://projects") },
                        async { client.listResources() }
                    )
                }
                
                val (results, totalTiming) = measureTime {
                    concurrentReads.awaitAll()
                }
                
                // All reads should succeed
                results.forEach { response ->
                    validateJsonRpcResponse(response)
                    response.jsonObject["result"] shouldNotBe null
                }
                
                // Concurrent access should be reasonably fast
                // EXPECTED FAILURE: Performance not optimized yet
                val averageTime = totalTiming / results.size
                averageTime shouldBeLessThan 100 // Each read should average < 100ms
                
                // Verify content consistency across concurrent reads
                val projectsResponses = results.filterIndexed { index, _ -> 
                    (index + 2) % 3 == 0 // Every third response is projects list
                }
                
                // All projects list responses should contain all created projects
                projectsResponses.forEach { response ->
                    val content = response.jsonObject["result"]?.jsonObject
                        ?.get("contents")?.jsonArray?.get(0)?.jsonObject
                        ?.get("text")?.jsonPrimitive?.content
                    
                    projectIds.forEach { projectId ->
                        content!! shouldContain projectId
                    }
                }
            }
        }
        
        "should provide dynamic resource discovery based on domain data" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // Initially - minimal resources
                val initialResources = client.listResources()
                val initialUris = initialResources.jsonObject["result"]?.jsonObject
                    ?.get("resources")?.jsonArray?.map {
                        it.jsonObject["uri"]?.jsonPrimitive?.content
                    } ?: emptyList()
                
                // Create project and issues
                val projectId = createTestProject(client, "Dynamic Discovery Project")
                val issueIds = (1..3).map { index ->
                    createTestIssue(client, projectId, "Dynamic Issue $index")
                }
                
                // Resources should now include specific project and issue URIs
                // EXPECTED FAILURE: Dynamic resource discovery not implemented
                eventually(3.seconds) {
                    val updatedResources = client.listResources()
                    val updatedUris = updatedResources.jsonObject["result"]?.jsonObject
                        ?.get("resources")?.jsonArray?.map {
                            it.jsonObject["uri"]?.jsonPrimitive?.content
                        } ?: emptyList()
                    
                    // Should include specific resource URIs for created entities
                    updatedUris shouldContain "cycletime://projects/$projectId"
                    issueIds.forEach { issueId ->
                        updatedUris shouldContain "cycletime://issues/$issueId"
                    }
                }
                
                // Verify dynamic resources are readable
                val projectResourceResponse = client.readResource("cycletime://projects/$projectId")
                validateResourceReadResponse(projectResourceResponse, "cycletime://projects/$projectId")
                
                issueIds.forEach { issueId ->
                    val issueResourceResponse = client.readResource("cycletime://issues/$issueId")
                    validateResourceReadResponse(issueResourceResponse, "cycletime://issues/$issueId")
                }
            }
        }
        
        "should handle resource templates and parameterized URIs" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // Test template URIs with parameters
                val projectId = createTestProject(client, "Template URI Project")
                val issueId = createTestIssue(client, projectId, "Template URI Issue")
                
                // Template URIs that should resolve to specific resources
                val templateTests = mapOf(
                    "cycletime://projects/{id}" to "cycletime://projects/$projectId",
                    "cycletime://issues/{id}" to "cycletime://issues/$issueId",
                    "cycletime://projects/{id}/issues" to "cycletime://projects/$projectId/issues"
                )
                
                templateTests.forEach { (template, resolved) ->
                    // EXPECTED FAILURE: Template URI resolution not implemented
                    val templateResponse = client.readResource(resolved)
                    validateResourceReadResponse(templateResponse, resolved)
                }
                
                // Test collection filtering with parameters
                val filteredProjectsUri = "cycletime://projects?status=active"
                val filteredResponse = client.readResource(filteredProjectsUri)
                validateResourceReadResponse(filteredResponse, filteredProjectsUri)
                
                val filteredContent = filteredResponse.jsonObject["result"]?.jsonObject
                    ?.get("contents")?.jsonArray?.get(0)?.jsonObject
                    ?.get("text")?.jsonPrimitive?.content
                
                // Should only contain active projects
                filteredContent!! shouldContain projectId // Our project is active
                filteredContent shouldNotContain "completed" // No completed projects should appear
            }
        }
        
        "should handle resource content versioning and ETags" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                val projectId = createTestProject(client, "Version Test Project")
                val projectUri = "cycletime://projects/$projectId"
                
                // First read - get initial version
                val firstRead = client.readResource(projectUri)
                val firstContents = firstRead.jsonObject["result"]?.jsonObject
                    ?.get("contents")?.jsonArray?.get(0)?.jsonObject
                
                // Should include version information
                // EXPECTED FAILURE: Resource versioning not implemented
                firstContents?.get("version") shouldNotBe null
                firstContents?.get("etag") shouldNotBe null
                
                val firstEtag = firstContents?.get("etag")?.jsonPrimitive?.content
                
                // Update project
                val updateRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "version-test-update")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("name", "update_project")
                        put("arguments", buildJsonObject {
                            put("project_id", projectId)
                            put("description", "Updated for version testing")
                        })
                    })
                }
                
                client.sendRequest(updateRequest)
                
                // Second read - version should change
                val secondRead = client.readResource(projectUri)
                val secondContents = secondRead.jsonObject["result"]?.jsonObject
                    ?.get("contents")?.jsonArray?.get(0)?.jsonObject
                
                val secondEtag = secondContents?.get("etag")?.jsonPrimitive?.content
                
                // ETags should be different after update
                secondEtag shouldNotBe firstEtag
                
                // Conditional read with ETag should return 304 Not Modified
                // EXPECTED FAILURE: Conditional resource reading not implemented
                // This will be implemented in GREEN phase
            }
        }
        
        "should provide resource metadata and schema information" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                val resourcesResponse = client.listResources()
                val resources = resourcesResponse.jsonObject["result"]?.jsonObject
                    ?.get("resources")?.jsonArray!!
                
                // Each resource should include comprehensive metadata
                resources.forEach { resource ->
                    val resourceObj = resource.jsonObject
                    
                    // Basic metadata
                    resourceObj["uri"] shouldNotBe null
                    resourceObj["name"] shouldNotBe null
                    resourceObj["description"] shouldNotBe null
                    resourceObj["mimeType"] shouldNotBe null
                    
                    // Extended metadata for CycleTime resources
                    val uri = resourceObj["uri"]?.jsonPrimitive?.content
                    if (uri?.startsWith("cycletime://") == true) {
                        // EXPECTED FAILURE: Extended metadata not implemented
                        resourceObj["schema"] shouldNotBe null
                        resourceObj["capabilities"] shouldNotBe null
                        resourceObj["lastModified"] shouldNotBe null
                        
                        // Schema should be valid JSON Schema
                        val schema = resourceObj["schema"]?.jsonObject
                        schema?.get("type") shouldNotBe null
                        schema?.get("properties") shouldNotBe null
                        
                        // Capabilities should indicate what operations are supported
                        val capabilities = resourceObj["capabilities"]?.jsonObject
                        capabilities?.get("readable")?.jsonPrimitive?.boolean shouldBe true
                        capabilities?.get("subscribable") shouldNotBe null
                    }
                }
            }
        }
    }
    
    // Helper methods will be implemented during GREEN phase
}