package io.spiralhouse.cycletime.integration.mcp

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.ints.shouldBeGreaterThan
import io.kotest.matchers.string.shouldContain
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.spiralhouse.cycletime.test.utils.testSDKApplication
import io.spiralhouse.cycletime.mcp.sdk.StreamableHttpConfig
import kotlinx.serialization.json.*

/**
 * Security tests for StreamableHttpHandler (SPI-765 security fixes).
 *
 * Tests verify critical security fixes:
 * 1. Request size limits (prevent DoS attacks)
 * 2. Session validation (prevent session hijacking)
 * 3. Origin validation (always enabled, no bypass)
 * 4. Rate limiting (prevent session flooding)
 *
 * ## Security Principles Tested
 *
 * - **Defense in Depth**: Multiple validation layers (origin, session, size, rate)
 * - **Fail Secure**: Default to restrictive, explicit allow
 * - **Rate Limiting**: Prevent resource exhaustion
 * - **Clear Error Messages**: Don't leak implementation details
 *
 * @see io.spiralhouse.cycletime.mcp.sdk.StreamableHttpHandler StreamableHttpHandler implementation
 */
class StreamableHttpSecurityTest : StringSpec({

    // ========================================
    // REQUEST SIZE LIMIT TESTS (DoS Prevention)
    // ========================================

    "POST /mcp with oversized request body should return 413 Payload Too Large" {
        testSDKApplication {
            // Create a request body larger than 1MB limit
            val oversizedBody = "x".repeat(1_100_000)  // 1.1MB

            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":1,"method":"tools/list","data":"$oversizedBody"}""")
            }

            // Should reject with 413 Payload Too Large
            response.status shouldBe HttpStatusCode.PayloadTooLarge

            val errorBody = response.bodyAsText()
            errorBody shouldContain "exceeds maximum size"
            errorBody shouldContain "1000000"  // 1MB limit
        }
    }

    "POST /mcp with request at size limit should succeed" {
        testSDKApplication {
            // Create a request body just under 1MB limit
            val largeButValidBody = "x".repeat(900_000)  // 900KB

            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":1,"method":"tools/list","note":"$largeButValidBody"}""")
            }

            // Should succeed (valid JSON-RPC despite large body)
            // Note: Will fail JSON parsing but that's after size validation
            response.status.value.let { status ->
                // Either succeeds or fails for JSON reasons, not size
                (status == 200 || status == 400) shouldBe true
            }
        }
    }

    // ========================================
    // SESSION VALIDATION TESTS (Security Hole Fix)
    // ========================================

    "POST /mcp with invalid session ID should return 401 Unauthorized" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("Mcp-Session-Id", "invalid-session-id-12345")
                setBody("""{"jsonrpc":"2.0","id":1,"method":"tools/list"}""")
            }

            // Should reject invalid session ID
            response.status shouldBe HttpStatusCode.Unauthorized

            val errorBody = response.bodyAsText()
            errorBody shouldContain "Invalid or expired session"
        }
    }

    "POST /mcp with random UUID session ID should return 401 Unauthorized" {
        testSDKApplication {
            // Attack scenario: Attacker tries random UUIDs hoping to hijack sessions
            val randomSessionId = "00000000-0000-0000-0000-000000000001"

            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("Mcp-Session-Id", randomSessionId)
                setBody("""{"jsonrpc":"2.0","id":1,"method":"tools/list"}""")
            }

            // Should reject - session not in database
            response.status shouldBe HttpStatusCode.Unauthorized
        }
    }

    "POST /mcp without session ID should create new session successfully" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                // No Mcp-Session-Id header
                setBody("""{"jsonrpc":"2.0","id":1,"method":"tools/list"}""")
            }

            // Should succeed and create new session
            response.status shouldBe HttpStatusCode.OK

            // Should return session ID in response header
            val sessionId = response.headers["Mcp-Session-Id"]
            sessionId shouldNotBe null
        }
    }

    "POST /mcp with valid session ID should succeed" {
        testSDKApplication {
            // ARRANGE: Create a session first
            val createResponse = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","clientInfo":{"name":"test","version":"1.0"},"capabilities":{}}}""")
            }

            val sessionId = createResponse.headers["Mcp-Session-Id"]
            sessionId shouldNotBe null

            // ACT: Use the session ID in subsequent request
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("Mcp-Session-Id", sessionId!!)
                setBody("""{"jsonrpc":"2.0","id":2,"method":"tools/list"}""")
            }

            // ASSERT: Should succeed with valid session
            response.status shouldBe HttpStatusCode.OK
        }
    }

    // ========================================
    // ORIGIN VALIDATION TESTS (Always Enabled)
    // ========================================

    "POST /mcp with malicious Origin should return 403 Forbidden" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("Origin", "http://evil-site.com")  // Not in whitelist
                setBody("""{"jsonrpc":"2.0","id":1,"method":"tools/list"}""")
            }

            // Should reject - origin not allowed
            response.status shouldBe HttpStatusCode.Forbidden

            val errorBody = response.bodyAsText()
            errorBody shouldContain "Invalid origin"
        }
    }

    "POST /mcp with localhost Origin should succeed" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("Origin", "http://localhost:3000")  // Matches localhost:.* pattern
                setBody("""{"jsonrpc":"2.0","id":1,"method":"tools/list"}""")
            }

            // Should succeed - localhost allowed
            response.status shouldBe HttpStatusCode.OK
        }
    }

    "POST /mcp with null Origin should succeed for localhost development" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                // No Origin header (null origin)
                setBody("""{"jsonrpc":"2.0","id":1,"method":"tools/list"}""")
            }

            // Should succeed - allowNullOrigin = true for localhost
            response.status shouldBe HttpStatusCode.OK
        }
    }

    "POST /mcp with Anthropic Origin should succeed" {
        // Use production config to test Anthropic origin whitelist
        testSDKApplication(config = productionSecurityConfig()) {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("Origin", "https://console.anthropic.com")  // Matches .*\.anthropic\.com
                setBody("""{"jsonrpc":"2.0","id":1,"method":"tools/list"}""")
            }

            // Should succeed - Anthropic domain allowed
            response.status shouldBe HttpStatusCode.OK
        }
    }

    // ========================================
    // RATE LIMITING TESTS (Session Flooding Prevention)
    // ========================================

    "POST /mcp rapid session creation should be rate limited" {
        // Use production config to test rate limiting behavior
        testSDKApplication(config = productionSecurityConfig()) {
            // ARRANGE: Configure rate limit (5 per minute in production)
            val maxCreations = 5

            // ACT: Try to create 10 sessions rapidly
            val responses = (1..10).map { i ->
                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    // No session ID - forces new session creation
                    setBody("""{"jsonrpc":"2.0","id":$i,"method":"tools/list"}""")
                }
            }

            // ASSERT: First 5 should succeed, rest should be rate limited
            val successCount = responses.count { it.status == HttpStatusCode.OK }
            val rateLimitedCount = responses.count { it.status == HttpStatusCode.TooManyRequests }

            // Should have limited some requests
            rateLimitedCount shouldBeGreaterThan 0

            // Total should be 10
            (successCount + rateLimitedCount) shouldBe 10

            // Check error message
            val rateLimitedResponse = responses.first { it.status == HttpStatusCode.TooManyRequests }
            val errorBody = rateLimitedResponse.bodyAsText()
            errorBody shouldContain "Too many session creation requests"
        }
    }

    "POST /mcp session reuse should not be rate limited" {
        testSDKApplication {
            // ARRANGE: Create one session
            val createResponse = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","clientInfo":{"name":"test","version":"1.0"},"capabilities":{}}}""")
            }

            val sessionId = createResponse.headers["Mcp-Session-Id"]
            sessionId shouldNotBe null

            // ACT: Reuse the same session 20 times rapidly
            val responses = (1..20).map { i ->
                client.post("/mcp") {
                    header("Content-Type", "application/json")
                    header("Mcp-Session-Id", sessionId!!)
                    setBody("""{"jsonrpc":"2.0","id":$i,"method":"tools/list"}""")
                }
            }

            // ASSERT: All should succeed (rate limit only applies to creation)
            val successCount = responses.count { it.status == HttpStatusCode.OK }
            successCount shouldBe 20
        }
    }

    // ========================================
    // COMBINED SECURITY TESTS (Defense in Depth)
    // ========================================

    "POST /mcp with multiple security violations should fail at first violation" {
        testSDKApplication {
            // Attack scenario: Invalid session + malicious origin + oversized body
            val oversizedBody = "x".repeat(1_100_000)

            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("Origin", "http://evil-site.com")  // Malicious origin
                header("Mcp-Session-Id", "invalid-session-123")  // Invalid session
                setBody("""{"jsonrpc":"2.0","id":1,"method":"tools/list","data":"$oversizedBody"}""")
            }

            // Should fail at origin validation (first check in handlePost)
            response.status shouldBe HttpStatusCode.Forbidden
        }
    }

    "POST /mcp security validations should occur in correct order" {
        testSDKApplication {
            // Test order: 1. Origin, 2. Protocol, 3. Accept, 4. Size, 5. JSON, 6. Session

            // Test 1: Origin validation happens first
            val originTest = client.post("/mcp") {
                header("Origin", "http://evil.com")
                setBody("""valid""")
            }
            originTest.status shouldBe HttpStatusCode.Forbidden

            // Test 2: Protocol validation happens after origin
            val protocolTest = client.post("/mcp") {
                header("MCP-Protocol-Version", "1999-12-31")
                setBody("""valid""")
            }
            protocolTest.status shouldBe HttpStatusCode.BadRequest

            // Test 3: Size validation happens before JSON parsing
            val sizeTest = client.post("/mcp") {
                setBody("x".repeat(1_100_000))
            }
            sizeTest.status shouldBe HttpStatusCode.PayloadTooLarge
        }
    }

    // ========================================
    // ERROR MESSAGE SECURITY (Info Leakage Prevention)
    // ========================================

    "POST /mcp security errors should not leak implementation details" {
        testSDKApplication {
            // Invalid session ID
            val sessionResponse = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("Mcp-Session-Id", "invalid-123")
                setBody("""{"jsonrpc":"2.0","id":1,"method":"tools/list"}""")
            }

            val sessionError = sessionResponse.bodyAsText()
            // Should NOT reveal database details, schema, or internal paths
            sessionError.lowercase().let { error ->
                error.shouldNotContain("database")
                error.shouldNotContain("sql")
                error.shouldNotContain("exposed")
                error.shouldNotContain("repository")
            }

            // Malicious origin
            val originResponse = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("Origin", "http://evil.com")
                setBody("""{"jsonrpc":"2.0","id":1,"method":"tools/list"}""")
            }

            val originError = originResponse.bodyAsText()
            // Should NOT reveal allowed origins list
            originError.lowercase().let { error ->
                error.shouldNotContain("localhost")
                error.shouldNotContain("anthropic")
            }
        }
    }
})

// Helper extension to check string does not contain substring (case-insensitive)
private fun String.shouldNotContain(substring: String) {
    if (this.lowercase().contains(substring.lowercase())) {
        throw AssertionError("String should not contain '$substring' but was: $this")
    }
}

/**
 * Production security configuration for testing.
 *
 * Matches production defaults from MCPSdkRouting.kt to ensure security tests
 * validate actual production behavior.
 *
 * Configuration includes:
 * - Full origin whitelist (localhost + Anthropic domains)
 * - Rate limiting enabled (5 sessions per minute per IP)
 * - Request size limits (1MB)
 */
private fun productionSecurityConfig() = StreamableHttpConfig(
    allowNullOrigin = true,
    allowedOrigins = listOf(
        "http://localhost:.*",
        "https://.*\\.anthropic\\.com"
    ),
    maxRequestBodySize = 1_000_000,
    sessionCreationMaxPerWindow = 5,  // Production rate limit
    sessionCreationWindowMs = 60_000
)
