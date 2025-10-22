---
title: "System Test Example - End-to-End Workflow"
type: example
domain: [testing]
description: "Demonstrates system-level testing for complete user workflows"
dependencies: [../../reference/definition-of-done.md]
related: [../../concepts/testing/test-architecture.md, ../../../.claude/shared/testing-standards.md]
keywords: [dod, example, system-testing, e2e, workflow]
last_updated: 2025-10-21
---

# System Test Example - End-to-End Workflow

## Context

This example demonstrates system-level testing that validates complete user workflows with all components integrated (MCP server, database, business logic).

## PASS Example

```kotlin
class WorkflowSystemTest : StringSpec({
    "should complete full session lifecycle" {
        testApplication {
            application {
                configureDatabase()
                configureDependencies()
                configureMcpServer()
            }

            // Create session via MCP tool call
            val createResponse = client.post("/mcp/v1/tools/create_session") {
                contentType(ContentType.Application.Json)
                setBody("""
                    {
                        "params": {
                            "arguments": {
                                "projectId": "proj-123"
                            }
                        }
                    }
                """.trimIndent())
            }

            createResponse.status shouldBe HttpStatusCode.OK
            val createBody = createResponse.bodyAsText()
            createBody shouldContain "sessionId"

            // Extract session ID from response
            val sessionId = Json.parseToJsonElement(createBody)
                .jsonObject["content"]
                ?.jsonArray?.get(0)
                ?.jsonObject?.get("text")
                ?.jsonPrimitive?.content
                ?.let { text ->
                    Json.parseToJsonElement(text)
                        .jsonObject["sessionId"]
                        ?.jsonPrimitive?.content
                }

            sessionId shouldNotBe null

            // Verify session persisted in database
            val getResponse = client.post("/mcp/v1/tools/get_session") {
                contentType(ContentType.Application.Json)
                setBody("""
                    {
                        "params": {
                            "arguments": {
                                "sessionId": "$sessionId"
                            }
                        }
                    }
                """.trimIndent())
            }

            getResponse.status shouldBe HttpStatusCode.OK
            val getBody = getResponse.bodyAsText()
            getBody shouldContain sessionId!!

            // Cleanup session
            val deleteResponse = client.post("/mcp/v1/tools/delete_session") {
                contentType(ContentType.Application.Json)
                setBody("""
                    {
                        "params": {
                            "arguments": {
                                "sessionId": "$sessionId"
                            }
                        }
                    }
                """.trimIndent())
            }

            deleteResponse.status shouldBe HttpStatusCode.OK
        }
    }

    "should handle session expiration workflow" {
        testApplication {
            application {
                configureDatabase()
                configureDependencies()
                configureMcpServer()
            }

            val mockTimeProvider = MockTimeProvider()

            // Create session at time T
            mockTimeProvider.setTime("2024-01-01T00:00:00Z")
            val sessionId = createSession("proj-123")

            // Advance time beyond expiration
            mockTimeProvider.advance(Duration.ofHours(2))

            // Verify session expired
            val checkResponse = client.post("/mcp/v1/tools/get_session") {
                contentType(ContentType.Application.Json)
                setBody("""
                    {
                        "params": {
                            "arguments": {
                                "sessionId": "$sessionId"
                            }
                        }
                    }
                """.trimIndent())
            }

            checkResponse.status shouldBe HttpStatusCode.NotFound
        }
    }
})
```

## Explanation

**Why This Passes DoD:**
- Tests complete user workflow (create → retrieve → delete)
- All components integrated (MCP server + database + business logic)
- Production-like conditions
- Tests both happy path and error scenarios
- Response times within acceptable range (< 1s per test)
- Clear test names describing workflows

## Related DoD Criteria

- Section 5.3: System Tests - End-to-end workflows, production-like conditions
- Section 5.4: Test Quality Standards - Clear names, AAA pattern
- Section 1.4: Performance Compliance - Response times within thresholds
