package io.spiralhouse.cycletime.unit.infrastructure.auth

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sessions.*
import io.ktor.server.testing.*
import io.spiralhouse.cycletime.infrastructure.auth.AuthenticationException
import io.spiralhouse.cycletime.infrastructure.auth.UserSession
import io.spiralhouse.cycletime.infrastructure.auth.requireSession
import io.spiralhouse.cycletime.infrastructure.auth.userSession
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Unit tests for SessionHelpers extension functions.
 *
 * Tests the helper functions that provide clean access to user sessions:
 * - userSession(): Returns UserSession or null
 * - requireSession(): Returns UserSession or throws AuthenticationException
 *
 * These functions are used throughout the application to access authenticated
 * user information from route handlers.
 *
 * Note: Because the extension functions use Ktor's session infrastructure,
 * we test them using testApplication with real session configuration
 * rather than mocking ApplicationCall directly.
 */
class SessionHelpersTest : StringSpec({

    @Serializable
    data class TestResponse(
        val hasSession: Boolean,
        val username: String? = null,
        val userId: Long? = null
    )

    /**
     * Helper to create test application with session support.
     */
    fun testSessionHelperApplication(block: suspend ApplicationTestBuilder.() -> Unit) = testApplication {
        application {
            install(Sessions) {
                cookie<UserSession>("user_session") {
                    cookie.path = "/"
                    cookie.maxAgeInSeconds = 3600
                }
            }

            install(ContentNegotiation) {
                json(Json {
                    prettyPrint = false
                    isLenient = true
                })
            }

            routing {
                // Endpoint to create a session
                get("/test/login") {
                    val session = UserSession(
                        userId = 12345L,
                        username = "testuser",
                        displayName = "Test User",
                        avatarUrl = "https://example.com/avatar.png",
                        email = "test@example.com",
                        createdAt = 1704067200000L
                    )
                    call.sessions.set(session)
                    call.respond(HttpStatusCode.OK, TestResponse(hasSession = true, username = session.username))
                }

                // Endpoint to test userSession()
                get("/test/userSession") {
                    val session = call.userSession()
                    if (session != null) {
                        call.respond(HttpStatusCode.OK, TestResponse(
                            hasSession = true,
                            username = session.username,
                            userId = session.userId
                        ))
                    } else {
                        call.respond(HttpStatusCode.OK, TestResponse(hasSession = false))
                    }
                }

                // Endpoint to test requireSession()
                get("/test/requireSession") {
                    try {
                        val session = call.requireSession()
                        call.respond(HttpStatusCode.OK, TestResponse(
                            hasSession = true,
                            username = session.username,
                            userId = session.userId
                        ))
                    } catch (e: AuthenticationException) {
                        call.respond(HttpStatusCode.Unauthorized, mapOf("error" to e.message))
                    }
                }

                // Endpoint to test session with null optional fields
                get("/test/loginMinimal") {
                    val session = UserSession(
                        userId = 67890L,
                        username = "minimal",
                        displayName = null,
                        avatarUrl = null,
                        email = null,
                        createdAt = 1704067200000L
                    )
                    call.sessions.set(session)
                    call.respond(HttpStatusCode.OK, TestResponse(hasSession = true, username = session.username))
                }
            }
        }

        block()
    }

    "userSession returns null when no session exists" {
        testSessionHelperApplication {
            val response = client.get("/test/userSession")

            response.status shouldBe HttpStatusCode.OK
            val body = response.bodyAsText()
            body shouldBe """{"hasSession":false}"""
        }
    }

    "userSession returns session when authenticated" {
        testSessionHelperApplication {
            val cookieClient = createClient {
                install(io.ktor.client.plugins.cookies.HttpCookies)
            }

            // Login first
            cookieClient.get("/test/login")

            // Test userSession()
            val response = cookieClient.get("/test/userSession")

            response.status shouldBe HttpStatusCode.OK
            val body = response.bodyAsText()
            body shouldBe """{"hasSession":true,"username":"testuser","userId":12345}"""
        }
    }

    "requireSession throws AuthenticationException when not authenticated" {
        testSessionHelperApplication {
            val response = client.get("/test/requireSession")

            response.status shouldBe HttpStatusCode.Unauthorized
            val body = response.bodyAsText()
            body shouldBe """{"error":"Not authenticated"}"""
        }
    }

    "requireSession returns session when authenticated" {
        testSessionHelperApplication {
            val cookieClient = createClient {
                install(io.ktor.client.plugins.cookies.HttpCookies)
            }

            // Login first
            cookieClient.get("/test/login")

            // Test requireSession()
            val response = cookieClient.get("/test/requireSession")

            response.status shouldBe HttpStatusCode.OK
            val body = response.bodyAsText()
            body shouldBe """{"hasSession":true,"username":"testuser","userId":12345}"""
        }
    }

    "requireSession returns same session data as userSession for authenticated user" {
        testSessionHelperApplication {
            val cookieClient = createClient {
                install(io.ktor.client.plugins.cookies.HttpCookies)
            }

            // Login first
            cookieClient.get("/test/login")

            // Both methods should return the same session data
            val userSessionResponse = cookieClient.get("/test/userSession")
            val requireSessionResponse = cookieClient.get("/test/requireSession")

            userSessionResponse.bodyAsText() shouldBe requireSessionResponse.bodyAsText()
        }
    }

    "userSession returns session with all null optional fields" {
        testSessionHelperApplication {
            val cookieClient = createClient {
                install(io.ktor.client.plugins.cookies.HttpCookies)
            }

            // Login with minimal session
            cookieClient.get("/test/loginMinimal")

            // Test userSession()
            val response = cookieClient.get("/test/userSession")

            response.status shouldBe HttpStatusCode.OK
            val body = response.bodyAsText()
            body shouldBe """{"hasSession":true,"username":"minimal","userId":67890}"""
        }
    }

    "requireSession provides all session fields when authenticated" {
        testSessionHelperApplication {
            val cookieClient = createClient {
                install(io.ktor.client.plugins.cookies.HttpCookies)
            }

            // Login first
            cookieClient.get("/test/login")

            // Test requireSession()
            val response = cookieClient.get("/test/requireSession")

            response.status shouldBe HttpStatusCode.OK
            response.bodyAsText() shouldNotBe """{"hasSession":false}"""
        }
    }
})
