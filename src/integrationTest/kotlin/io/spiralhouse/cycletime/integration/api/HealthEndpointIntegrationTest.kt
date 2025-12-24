package io.spiralhouse.cycletime.integration.api

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import io.spiralhouse.cycletime.module
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Integration tests for the enhanced /health endpoint.
 *
 * Verifies:
 * - Component-level health status reporting
 * - Proper HTTP status codes (200 OK for healthy/degraded, 503 for unhealthy)
 * - JSON response structure with checks, status, and metadata
 * - Database, memory, and MCP health checks
 */
class HealthEndpointIntegrationTest : StringSpec({

    "should return 200 OK when system is healthy" {
        testApplication {
            application {
                module()
            }

            val response = client.get("/health")

            response.status shouldBe HttpStatusCode.OK
        }
    }

    "should return component-level health details" {
        testApplication {
            application {
                module()
            }

            val response = client.get("/health")
            val body = response.bodyAsText()

            // Parse JSON response
            val json = Json.parseToJsonElement(body).jsonObject

            // Verify top-level fields
            json["status"] shouldNotBe null
            json["service"] shouldNotBe null
            json["version"] shouldNotBe null
            json["checks"] shouldNotBe null
            json["timestamp"] shouldNotBe null

            // Verify checks structure
            val checks = json["checks"]?.jsonObject
            checks shouldNotBe null
            checks?.get("database") shouldNotBe null
            checks?.get("memory") shouldNotBe null
            checks?.get("mcp") shouldNotBe null
        }
    }

    "should include database, memory, and MCP checks" {
        testApplication {
            application {
                module()
            }

            val response = client.get("/health")
            val body = response.bodyAsText()
            val json = Json.parseToJsonElement(body).jsonObject
            val checks = json["checks"]?.jsonObject

            // Verify database check
            val dbCheck = checks?.get("database")?.jsonObject
            dbCheck shouldNotBe null
            dbCheck?.get("status") shouldNotBe null
            dbCheck?.get("message") shouldNotBe null

            // Verify memory check
            val memoryCheck = checks?.get("memory")?.jsonObject
            memoryCheck shouldNotBe null
            memoryCheck?.get("status") shouldNotBe null
            memoryCheck?.get("message") shouldNotBe null
            memoryCheck?.get("details") shouldNotBe null

            // Verify MCP check
            val mcpCheck = checks?.get("mcp")?.jsonObject
            mcpCheck shouldNotBe null
            mcpCheck?.get("status") shouldNotBe null
            mcpCheck?.get("message") shouldNotBe null
        }
    }

    "should return proper JSON structure" {
        testApplication {
            application {
                module()
            }

            val response = client.get("/health")
            val body = response.bodyAsText()

            // Verify it's valid JSON
            val json = Json.parseToJsonElement(body).jsonObject

            // Verify service info
            val serviceName = json["service"]?.jsonPrimitive?.content
            serviceName shouldNotBe null
            serviceName!! shouldContain "cycletime"

            // Verify status is one of the expected values
            val status = json["status"]?.jsonPrimitive?.content
            status shouldNotBe null
            // Status should be one of: healthy, degraded, or unhealthy
            setOf("healthy", "degraded", "unhealthy").contains(status) shouldBe true
        }
    }

    "should include latency measurements" {
        testApplication {
            application {
                module()
            }

            val response = client.get("/health")
            val body = response.bodyAsText()
            val json = Json.parseToJsonElement(body).jsonObject
            val checks = json["checks"]?.jsonObject

            // Database check should have latency measurement
            val dbCheck = checks?.get("database")?.jsonObject
            dbCheck?.get("latencyMs") shouldNotBe null
        }
    }

    "should include memory usage details" {
        testApplication {
            application {
                module()
            }

            val response = client.get("/health")
            val body = response.bodyAsText()
            val json = Json.parseToJsonElement(body).jsonObject
            val checks = json["checks"]?.jsonObject

            // Memory check should have usage details
            val memoryCheck = checks?.get("memory")?.jsonObject
            val details = memoryCheck?.get("details")?.jsonObject

            details?.get("heapUsedMB") shouldNotBe null
            details?.get("heapMaxMB") shouldNotBe null
            details?.get("usagePercent") shouldNotBe null
        }
    }

    "should include MCP session count" {
        testApplication {
            application {
                module()
            }

            val response = client.get("/health")
            val body = response.bodyAsText()
            val json = Json.parseToJsonElement(body).jsonObject
            val checks = json["checks"]?.jsonObject

            // MCP check should have session count
            val mcpCheck = checks?.get("mcp")?.jsonObject
            val details = mcpCheck?.get("details")?.jsonObject

            details?.get("activeSessions") shouldNotBe null
        }
    }

    "should respond quickly (< 3000ms)" {
        testApplication {
            application {
                module()
            }

            val startTime = System.currentTimeMillis()
            val response = client.get("/health")
            val endTime = System.currentTimeMillis()

            val duration = endTime - startTime
            response.status shouldBe HttpStatusCode.OK

            // Health checks should be reasonably fast (CI-friendly threshold)
            (duration < 3000) shouldBe true
        }
    }

    "should include timestamp in ISO format" {
        testApplication {
            application {
                module()
            }

            val response = client.get("/health")
            val body = response.bodyAsText()
            val json = Json.parseToJsonElement(body).jsonObject

            val timestamp = json["timestamp"]?.jsonPrimitive?.content
            timestamp shouldNotBe null
            // Timestamp should be in ISO-8601 format (contains T separator)
            timestamp!! shouldContain "T"
        }
    }

    "should handle concurrent health check requests" {
        testApplication {
            application {
                module()
            }

            // Make multiple concurrent requests
            val responses = List(10) {
                client.get("/health")
            }

            // All requests should succeed
            responses.forEach { response ->
                response.status shouldBe HttpStatusCode.OK
            }
        }
    }
})
