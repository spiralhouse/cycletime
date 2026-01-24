package io.spiralhouse.cycletime.integration.auth

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.plugins.cookies.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sessions.*
import io.ktor.server.testing.*
import io.spiralhouse.cycletime.infrastructure.auth.UserSession
import kotlinx.serialization.json.Json

/**
 * Integration tests for route authentication protection.
 *
 * Verifies that:
 * - Protected routes return 401 Unauthorized when unauthenticated
 * - Protected routes with HTML Accept redirect to login
 * - Public routes remain accessible without authentication
 * - Session-based authentication validates and protects routes
 *
 * Test Strategy:
 * - Uses isolated test application with simplified auth configuration
 * - Avoids production module() to prevent OAuth credential requirements
 * - Tests actual HTTP responses for authentication enforcement
 * - Verifies security boundaries are properly enforced
 */
class AuthenticationIntegrationTest : StringSpec({

    /**
     * Helper function to create test application with session-based authentication.
     * Simulates production auth configuration without requiring OAuth credentials.
     */
    fun testAuthApplication(
        sessionMaxAge: Long = 604800L, // 7 days (same as production)
        block: suspend ApplicationTestBuilder.() -> Unit
    ) = testApplication {
        application {
            // Install sessions (same configuration as production OAuthConfiguration)
            install(Sessions) {
                cookie<UserSession>("user_session") {
                    cookie.path = "/"
                    cookie.maxAgeInSeconds = sessionMaxAge
                    cookie.httpOnly = true
                    cookie.secure = false // Test environment
                    cookie.extensions["SameSite"] = "Lax"

                    // HMAC signing (same as production)
                    transform(SessionTransportTransformerMessageAuthentication(
                        key = "test-secret-key-for-hmac".toByteArray(),
                        algorithm = "HmacSHA256"
                    ))
                }
            }

            install(ContentNegotiation) {
                json(Json {
                    prettyPrint = true
                    isLenient = true
                    ignoreUnknownKeys = true
                })
            }

            // Session-based authentication (same as production SessionAuthConfiguration)
            install(Authentication) {
                session<UserSession>("session-auth") {
                    validate { session ->
                        val sessionAge = System.currentTimeMillis() - session.createdAt
                        if (sessionAge < sessionMaxAge * 1000) {
                            session
                        } else {
                            null
                        }
                    }
                    challenge {
                        // Check Accept header for HTML (same logic as SessionAuthConfiguration.acceptsHtml())
                        val acceptHeader = call.request.headers[HttpHeaders.Accept]
                        if (acceptHeader?.contains("text/html") == true) {
                            call.respondRedirect("/login")
                        } else {
                            call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Authentication required"))
                        }
                    }
                }
            }

            routing {
                // Public routes
                get("/login") {
                    call.respondText("Login page - coming soon", ContentType.Text.Html)
                }

                get("/health") {
                    call.respond(HttpStatusCode.OK, mapOf("status" to "healthy"))
                }

                get("/metrics") {
                    call.respondText("metrics output", ContentType.Text.Plain)
                }

                // Auth routes (simulated OAuth flow for testing)
                get("/auth/login") {
                    // In production, this redirects to GitHub
                    // For testing, we simulate the redirect behavior
                    call.respondRedirect("https://github.com/login/oauth/authorize?client_id=test")
                }

                get("/auth/logout") {
                    call.sessions.clear<UserSession>()
                    call.respondRedirect("/login")
                }

                // Test endpoint to create a session (simulates OAuth callback)
                get("/test/create-session") {
                    val session = UserSession(
                        userId = 12345L,
                        username = "testuser",
                        displayName = "Test User",
                        avatarUrl = "https://example.com/avatar.png",
                        email = "test@example.com"
                    )
                    call.sessions.set(session)
                    call.respondRedirect("/api/v1")
                }

                // MCP endpoints (public - no auth required)
                post("/mcp") {
                    call.respondText("""{"jsonrpc":"2.0","result":{}}""", ContentType.Application.Json)
                }

                options("/mcp") {
                    call.respond(HttpStatusCode.OK)
                }

                // Swagger/docs (public)
                get("/swagger") {
                    call.respondText("Swagger UI", ContentType.Text.Html)
                }

                // Static mockups (public)
                get("/mockups") {
                    call.respondText("Mockups", ContentType.Text.Html)
                }

                // Protected routes
                authenticate("session-auth") {
                    get("/api/v1") {
                        call.respond(HttpStatusCode.OK, mapOf("version" to "v1", "service" to "CycleTime"))
                    }

                    get("/api/v1/projects") {
                        call.respond(HttpStatusCode.OK, emptyList<Map<String, String>>())
                    }

                    get("/api/v1/dashboard") {
                        call.respond(HttpStatusCode.OK, emptyList<Map<String, String>>())
                    }

                    get("/api/v1/workflows") {
                        call.respond(HttpStatusCode.OK, emptyList<Map<String, String>>())
                    }
                }
            }
        }

        block()
    }

    "unauthenticated request to /api/v1 returns 401 Unauthorized" {
        testAuthApplication {
            val response = client.get("/api/v1") {
                header(HttpHeaders.Accept, ContentType.Application.Json.toString())
            }

            response.status shouldBe HttpStatusCode.Unauthorized
        }
    }

    "unauthenticated request to /api/v1/projects returns 401 Unauthorized" {
        testAuthApplication {
            val response = client.get("/api/v1/projects") {
                header(HttpHeaders.Accept, ContentType.Application.Json.toString())
            }

            response.status shouldBe HttpStatusCode.Unauthorized
        }
    }

    "unauthenticated request to /api/v1/dashboard returns 401 Unauthorized" {
        testAuthApplication {
            val response = client.get("/api/v1/dashboard") {
                header(HttpHeaders.Accept, ContentType.Application.Json.toString())
            }

            response.status shouldBe HttpStatusCode.Unauthorized
        }
    }

    "unauthenticated request to protected route with HTML Accept redirects to login" {
        testAuthApplication {
            // Create client that doesn't follow redirects
            val noRedirectClient = createClient {
                followRedirects = false
            }
            val response = noRedirectClient.get("/api/v1") {
                header(HttpHeaders.Accept, ContentType.Text.Html.toString())
            }

            // When Accept is text/html, should redirect to login
            response.status shouldBe HttpStatusCode.Found
            response.headers[HttpHeaders.Location] shouldBe "/login"
        }
    }

    "/health endpoint accessible without authentication" {
        testAuthApplication {
            val response = client.get("/health")

            response.status shouldBe HttpStatusCode.OK
        }
    }

    "/metrics endpoint accessible without authentication" {
        testAuthApplication {
            val response = client.get("/metrics")

            response.status shouldBe HttpStatusCode.OK
        }
    }

    "/login page accessible without authentication" {
        testAuthApplication {
            val response = client.get("/login")

            response.status shouldBe HttpStatusCode.OK
            response.bodyAsText() shouldContain "Login"
        }
    }

    "/auth/login initiates OAuth flow (redirects to GitHub)" {
        testAuthApplication {
            // Create client that doesn't follow redirects to capture the redirect response
            val noRedirectClient = createClient {
                followRedirects = false
            }
            val response = noRedirectClient.get("/auth/login")

            // Should redirect to GitHub authorization page
            response.status shouldBe HttpStatusCode.Found
            val location = response.headers[HttpHeaders.Location]
            location shouldContain "github.com"
            location shouldContain "oauth/authorize"
        }
    }

    "/auth/logout accessible without authentication (clears session and redirects)" {
        testAuthApplication {
            // Create client that doesn't follow redirects
            val noRedirectClient = createClient {
                followRedirects = false
            }
            val response = noRedirectClient.get("/auth/logout")

            // Should redirect to login page after logout
            response.status shouldBe HttpStatusCode.Found
            response.headers[HttpHeaders.Location] shouldBe "/login"
        }
    }

    "MCP POST endpoint /mcp accessible without authentication" {
        testAuthApplication {
            val response = client.post("/mcp") {
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}""")
            }

            // Should not return 401 - MCP endpoints are public for AI access
            response.status shouldBe HttpStatusCode.OK
        }
    }

    "MCP OPTIONS endpoint /mcp accessible without authentication" {
        testAuthApplication {
            val response = client.options("/mcp")

            response.status shouldBe HttpStatusCode.OK
        }
    }

    "/swagger endpoint accessible without authentication" {
        testAuthApplication {
            val response = client.get("/swagger")

            response.status shouldBe HttpStatusCode.OK
        }
    }

    "static mockups accessible without authentication" {
        testAuthApplication {
            val response = client.get("/mockups")

            response.status shouldBe HttpStatusCode.OK
        }
    }

    "unauthenticated request to /api/v1/workflows returns 401" {
        testAuthApplication {
            val response = client.get("/api/v1/workflows") {
                header(HttpHeaders.Accept, ContentType.Application.Json.toString())
            }

            response.status shouldBe HttpStatusCode.Unauthorized
        }
    }

    "401 response includes error message for JSON API calls" {
        testAuthApplication {
            val response = client.get("/api/v1/projects") {
                header(HttpHeaders.Accept, ContentType.Application.Json.toString())
            }

            response.status shouldBe HttpStatusCode.Unauthorized
            val body = response.bodyAsText()
            body shouldContain "error"
        }
    }

    "authenticated request to /api/v1 succeeds" {
        testAuthApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            // Create session via test endpoint
            cookieClient.get("/test/create-session")

            // Access protected endpoint
            val response = cookieClient.get("/api/v1") {
                header(HttpHeaders.Accept, ContentType.Application.Json.toString())
            }

            response.status shouldBe HttpStatusCode.OK
        }
    }

    "authenticated request to /api/v1/projects succeeds" {
        testAuthApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            // Create session via test endpoint
            cookieClient.get("/test/create-session")

            // Access protected endpoint
            val response = cookieClient.get("/api/v1/projects") {
                header(HttpHeaders.Accept, ContentType.Application.Json.toString())
            }

            response.status shouldBe HttpStatusCode.OK
        }
    }

    "logout clears authentication and subsequent requests return 401" {
        testAuthApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            // Create session
            cookieClient.get("/test/create-session")

            // Verify authenticated
            val authenticatedResponse = cookieClient.get("/api/v1") {
                header(HttpHeaders.Accept, ContentType.Application.Json.toString())
            }
            authenticatedResponse.status shouldBe HttpStatusCode.OK

            // Logout
            cookieClient.get("/auth/logout")

            // Verify no longer authenticated
            val afterLogoutResponse = cookieClient.get("/api/v1") {
                header(HttpHeaders.Accept, ContentType.Application.Json.toString())
            }
            afterLogoutResponse.status shouldBe HttpStatusCode.Unauthorized
        }
    }
})
