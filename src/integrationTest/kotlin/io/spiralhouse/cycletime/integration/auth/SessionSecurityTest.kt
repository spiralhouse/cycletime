package io.spiralhouse.cycletime.integration.auth

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldNotContain
import io.ktor.client.*
import io.ktor.client.plugins.cookies.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sessions.*
import io.ktor.server.testing.*
import io.ktor.server.plugins.contentnegotiation.*
import io.spiralhouse.cycletime.infrastructure.auth.UserSession
import kotlinx.serialization.json.Json

/**
 * Integration tests for session security.
 *
 * Verifies:
 * - Session cookie properties (HttpOnly, SameSite, Secure)
 * - Session validation and expiration
 * - Tampered session cookie rejection
 * - Session clearing on logout
 * - HMAC-SHA256 signature verification
 *
 * Test Strategy:
 * - Uses isolated test application with simplified auth configuration
 * - Tests cookie attributes and security properties
 * - Verifies session lifecycle (create, validate, expire, clear)
 */
class SessionSecurityTest : StringSpec({

    /**
     * Helper function to create a test application with session support.
     * Uses a simplified configuration for testing session behavior.
     */
    fun testSessionApplication(
        sessionMaxAge: Long = 3600L, // 1 hour default
        block: suspend ApplicationTestBuilder.() -> Unit
    ) = testApplication {
        application {
            // Install sessions with HMAC signing (matches production OAuthConfiguration)
            install(Sessions) {
                cookie<UserSession>("user_session") {
                    cookie.path = "/"
                    cookie.maxAgeInSeconds = sessionMaxAge
                    cookie.httpOnly = true
                    cookie.secure = false // Test environment
                    cookie.extensions["SameSite"] = "Lax"

                    // Sign cookies with HMAC-SHA256 (same as production)
                    transform(SessionTransportTransformerMessageAuthentication(
                        key = "test-secret-key-for-hmac-signing".toByteArray(),
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

            // Session-based authentication
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
                        call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Authentication required"))
                    }
                }
            }

            routing {
                // Test endpoint to create a session
                get("/test/login") {
                    val session = UserSession(
                        userId = 12345L,
                        username = "testuser",
                        displayName = "Test User",
                        avatarUrl = "https://example.com/avatar.png",
                        email = "test@example.com"
                    )
                    call.sessions.set(session)
                    call.respond(HttpStatusCode.OK, mapOf("status" to "logged_in"))
                }

                // Test endpoint to clear session
                get("/test/logout") {
                    call.sessions.clear<UserSession>()
                    call.respond(HttpStatusCode.OK, mapOf("status" to "logged_out"))
                }

                // Protected test endpoint
                authenticate("session-auth") {
                    get("/test/protected") {
                        val session = call.sessions.get<UserSession>()
                        call.respond(HttpStatusCode.OK, mapOf(
                            "status" to "authenticated",
                            "username" to (session?.username ?: "unknown")
                        ))
                    }
                }

                // Public test endpoint
                get("/test/public") {
                    call.respond(HttpStatusCode.OK, mapOf("status" to "public"))
                }
            }
        }

        block()
    }

    "valid session cookie allows access to protected routes" {
        testSessionApplication {
            // Create client that stores cookies
            val cookieClient = createClient {
                install(HttpCookies)
            }

            // Login to get session cookie
            val loginResponse = cookieClient.get("/test/login")
            loginResponse.status shouldBe HttpStatusCode.OK

            // Access protected endpoint with session cookie
            val protectedResponse = cookieClient.get("/test/protected")
            protectedResponse.status shouldBe HttpStatusCode.OK
            protectedResponse.bodyAsText() shouldContain "authenticated"
            protectedResponse.bodyAsText() shouldContain "testuser"
        }
    }

    "request without session cookie returns 401 for protected route" {
        testSessionApplication {
            val response = client.get("/test/protected")

            response.status shouldBe HttpStatusCode.Unauthorized
        }
    }

    "session cookie has HttpOnly attribute" {
        testSessionApplication {
            val response = client.get("/test/login")

            response.status shouldBe HttpStatusCode.OK

            // Check Set-Cookie header for HttpOnly
            val setCookie = response.headers[HttpHeaders.SetCookie]
            setCookie shouldNotBe null
            setCookie!! shouldContain "HttpOnly"
        }
    }

    "session cookie has SameSite=Lax attribute" {
        testSessionApplication {
            val response = client.get("/test/login")

            response.status shouldBe HttpStatusCode.OK

            // Check Set-Cookie header for SameSite
            val setCookie = response.headers[HttpHeaders.SetCookie]
            setCookie shouldNotBe null
            setCookie!! shouldContain "SameSite=Lax"
        }
    }

    "session cookie has path=/" {
        testSessionApplication {
            val response = client.get("/test/login")

            response.status shouldBe HttpStatusCode.OK

            // Check Set-Cookie header for Path
            val setCookie = response.headers[HttpHeaders.SetCookie]
            setCookie shouldNotBe null
            setCookie!! shouldContain "Path=/"
        }
    }

    "session cookie has Max-Age attribute" {
        testSessionApplication(sessionMaxAge = 3600L) {
            val response = client.get("/test/login")

            response.status shouldBe HttpStatusCode.OK

            // Check Set-Cookie header for Max-Age
            val setCookie = response.headers[HttpHeaders.SetCookie]
            setCookie shouldNotBe null
            setCookie!! shouldContain "Max-Age="
        }
    }

    "logout clears session cookie" {
        testSessionApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            // Login first
            cookieClient.get("/test/login")

            // Verify authenticated
            val beforeLogout = cookieClient.get("/test/protected")
            beforeLogout.status shouldBe HttpStatusCode.OK

            // Logout
            val logoutResponse = cookieClient.get("/test/logout")
            logoutResponse.status shouldBe HttpStatusCode.OK

            // Verify no longer authenticated
            val afterLogout = cookieClient.get("/test/protected")
            afterLogout.status shouldBe HttpStatusCode.Unauthorized
        }
    }

    "tampered session cookie is rejected" {
        testSessionApplication {
            // Login to get a valid session
            val loginResponse = client.get("/test/login")
            loginResponse.status shouldBe HttpStatusCode.OK

            val validCookie = loginResponse.headers[HttpHeaders.SetCookie]
            validCookie shouldNotBe null

            // Extract just the cookie name=value part and tamper with it
            val tamperedCookie = validCookie!!
                .replace("testuser", "hackeduser") // Tamper with session data

            // Try to use tampered cookie
            val response = client.get("/test/protected") {
                header(HttpHeaders.Cookie, tamperedCookie)
            }

            // Tampered cookie should be rejected (HMAC signature won't match)
            response.status shouldBe HttpStatusCode.Unauthorized
        }
    }

    "session cookie value contains HMAC signature" {
        testSessionApplication {
            val response = client.get("/test/login")

            response.status shouldBe HttpStatusCode.OK

            // Get the Set-Cookie header
            val setCookie = response.headers[HttpHeaders.SetCookie]
            setCookie shouldNotBe null

            // The cookie value should be signed (contains base64-encoded signature)
            // HMAC-signed cookies have format: value/signature
            // The separator "/" may be URL-encoded as "%2F"
            val cookieValue = setCookie!!.substringAfter("user_session=").substringBefore(";")
            // URL-decoded "/" appears as "%2F" in the cookie
            (cookieValue.contains("/") || cookieValue.contains("%2F")) shouldBe true
        }
    }

    "expired session cookie is rejected" {
        // Use very short session timeout (1 second)
        testSessionApplication(sessionMaxAge = 1L) {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            // Login to get session with 1 second max age
            val loginResponse = cookieClient.get("/test/login")
            loginResponse.status shouldBe HttpStatusCode.OK

            // Wait for session to expire
            Thread.sleep(1500) // Wait 1.5 seconds

            // Try to access protected resource with expired session
            val response = cookieClient.get("/test/protected")
            response.status shouldBe HttpStatusCode.Unauthorized
        }
    }

    "public routes remain accessible regardless of session state" {
        testSessionApplication {
            // Access without session
            val publicResponse = client.get("/test/public")
            publicResponse.status shouldBe HttpStatusCode.OK

            // Create session
            val cookieClient = createClient {
                install(HttpCookies)
            }
            cookieClient.get("/test/login")

            // Access with session
            val publicWithSession = cookieClient.get("/test/public")
            publicWithSession.status shouldBe HttpStatusCode.OK
        }
    }

    "session cookie is not marked Secure in test environment" {
        // Note: In production, Secure should be true (HTTPS only)
        // In test environment with isDevelopment=true, Secure is false
        testSessionApplication {
            val response = client.get("/test/login")

            response.status shouldBe HttpStatusCode.OK

            val setCookie = response.headers[HttpHeaders.SetCookie]
            setCookie shouldNotBe null
            // Should NOT contain Secure flag in test environment
            setCookie!! shouldNotContain "; Secure"
        }
    }

    "multiple sequential requests with same session succeed" {
        testSessionApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            // Login
            cookieClient.get("/test/login")

            // Multiple authenticated requests should all succeed
            repeat(5) { i ->
                val response = cookieClient.get("/test/protected")
                response.status shouldBe HttpStatusCode.OK
                response.bodyAsText() shouldContain "authenticated"
            }
        }
    }

    "session maintains user identity across requests" {
        testSessionApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            // Login
            cookieClient.get("/test/login")

            // Verify username is consistent across requests
            repeat(3) {
                val response = cookieClient.get("/test/protected")
                response.bodyAsText() shouldContain "testuser"
            }
        }
    }
})
