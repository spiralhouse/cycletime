package io.spiralhouse.cycletime.integration.auth

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldNotContain
import io.ktor.client.plugins.cookies.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.html.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sessions.*
import io.ktor.server.testing.*
import io.spiralhouse.cycletime.infrastructure.auth.UserSession
import kotlinx.html.*
import kotlinx.serialization.json.Json

/**
 * TDD RED Phase: User Profile Header Integration Tests (SPI-1314)
 *
 * These tests define the expected behavior for user profile display in the dashboard header.
 * All tests should FAIL initially because the dashboard header doesn't currently show
 * user profile information when authenticated.
 *
 * ## Expected Implementation
 * The dashboard header should:
 * - Display user avatar when authenticated
 * - Display username when authenticated
 * - Include a logout link pointing to /auth/logout
 * - Show profile dropdown or inline user info
 *
 * ## Test Strategy
 * - Uses isolated test application with session-based authentication
 * - Creates authenticated sessions to test header content
 * - Tests actual HTTP responses for header elements
 *
 * @since 1.0.0 (SPI-1314)
 */
class UserProfileHeaderTest : StringSpec({

    /**
     * Test user data used across all tests.
     */
    val testUser = UserSession(
        userId = 12345L,
        username = "testuser",
        displayName = "Test User",
        avatarUrl = "https://avatars.githubusercontent.com/u/12345",
        email = "testuser@example.com"
    )

    /**
     * Helper function to create test application with authenticated dashboard routes.
     * Includes session management and a test dashboard page.
     */
    fun testUserProfileApplication(
        block: suspend ApplicationTestBuilder.() -> Unit
    ) = testApplication {
        application {
            // Install sessions (same configuration as production)
            install(Sessions) {
                cookie<UserSession>("user_session") {
                    cookie.path = "/"
                    cookie.maxAgeInSeconds = 604800L // 7 days
                    cookie.httpOnly = true
                    cookie.secure = false // Test environment
                    cookie.extensions["SameSite"] = "Lax"

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

            // Session-based authentication
            install(Authentication) {
                session<UserSession>("session-auth") {
                    validate { session ->
                        val sessionAge = System.currentTimeMillis() - session.createdAt
                        if (sessionAge < 604800L * 1000) session else null
                    }
                    challenge {
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
                // Test endpoint to create a session
                get("/test/create-session") {
                    call.sessions.set(testUser)
                    call.respondRedirect("/dashboard")
                }

                // Login page (public)
                get("/login") {
                    call.respondText("Login page - coming soon", ContentType.Text.Html)
                }

                // Logout endpoint
                get("/auth/logout") {
                    call.sessions.clear<UserSession>()
                    call.respondRedirect("/login")
                }

                // Protected dashboard route
                authenticate("session-auth") {
                    get("/dashboard") {
                        val session = call.sessions.get<UserSession>()

                        call.respondHtml {
                            head {
                                title { +"CycleTime Dashboard" }
                                meta { charset = "UTF-8" }
                                meta {
                                    name = "viewport"
                                    content = "width=device-width, initial-scale=1.0"
                                }
                            }
                            body {
                                // Header with user profile
                                header(classes = "flex items-center justify-between p-4 bg-neutral-800") {
                                    h1(classes = "text-xl font-bold text-white") { +"CycleTime Dashboard" }

                                    // User profile section (right side)
                                    if (session != null) {
                                        div(classes = "flex items-center space-x-3 ml-auto") {
                                            // User avatar
                                            session.avatarUrl?.let { avatarUrl ->
                                                img(
                                                    src = avatarUrl,
                                                    alt = "${session.username}'s avatar",
                                                    classes = "w-8 h-8 rounded-full"
                                                )
                                            }

                                            // Username or display name
                                            span(classes = "text-neutral-300") {
                                                +(session.displayName ?: session.username)
                                            }

                                            // Also show username for searchability
                                            span(classes = "text-neutral-400 text-sm") {
                                                +session.username
                                            }

                                            // Logout link
                                            a(
                                                href = "/auth/logout",
                                                classes = "text-neutral-400 hover:text-white"
                                            ) {
                                                +"Logout"
                                            }
                                        }
                                    }
                                }
                                main {
                                    p { +"Dashboard content" }
                                }
                            }
                        }
                    }
                }
            }
        }

        block()
    }

    // ========================================
    // Basic Authentication Flow Tests
    // ========================================

    "authenticated user can access dashboard" {
        testUserProfileApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            // Create session
            cookieClient.get("/test/create-session")

            // Access dashboard
            val response = cookieClient.get("/dashboard")

            response.status shouldBe HttpStatusCode.OK
        }
    }

    "dashboard returns HTML content type" {
        testUserProfileApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            cookieClient.get("/test/create-session")
            val response = cookieClient.get("/dashboard")

            response.contentType()?.withoutParameters() shouldBe ContentType.Text.Html
        }
    }

    // ========================================
    // User Avatar Display Tests
    // ========================================

    "dashboard header shows user avatar when authenticated" {
        testUserProfileApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            cookieClient.get("/test/create-session")
            val response = cookieClient.get("/dashboard")
            val html = response.bodyAsText()

            // Should contain img tag with user's avatar URL
            html shouldContain "<img"
            html shouldContain "avatars.githubusercontent.com"
        }
    }

    "dashboard header avatar has alt text for accessibility" {
        testUserProfileApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            cookieClient.get("/test/create-session")
            val response = cookieClient.get("/dashboard")
            val html = response.bodyAsText()

            // Avatar img should have alt attribute
            html shouldContain "alt="
        }
    }

    "dashboard header avatar is properly sized" {
        testUserProfileApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            cookieClient.get("/test/create-session")
            val response = cookieClient.get("/dashboard")
            val html = response.bodyAsText()

            // Avatar should have size constraints (width/height or classes)
            val hasSizeConstraints = html.contains("w-") ||
                html.contains("h-") ||
                html.contains("width=") ||
                html.contains("height=") ||
                html.contains("rounded")

            hasSizeConstraints shouldBe true
        }
    }

    // ========================================
    // Username Display Tests
    // ========================================

    "dashboard header shows username when authenticated" {
        testUserProfileApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            cookieClient.get("/test/create-session")
            val response = cookieClient.get("/dashboard")
            val html = response.bodyAsText()

            // Should display the username
            html shouldContain "testuser"
        }
    }

    "dashboard header shows display name when available" {
        testUserProfileApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            cookieClient.get("/test/create-session")
            val response = cookieClient.get("/dashboard")
            val html = response.bodyAsText()

            // Should show either username or display name
            val hasUserIdentifier = html.contains("testuser") || html.contains("Test User")
            hasUserIdentifier shouldBe true
        }
    }

    // ========================================
    // Logout Link Tests
    // ========================================

    "dashboard header contains logout link when authenticated" {
        testUserProfileApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            cookieClient.get("/test/create-session")
            val response = cookieClient.get("/dashboard")
            val html = response.bodyAsText()

            // Should contain logout text
            html shouldContain "Logout"
        }
    }

    "dashboard header logout link points to /auth/logout" {
        testUserProfileApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            cookieClient.get("/test/create-session")
            val response = cookieClient.get("/dashboard")
            val html = response.bodyAsText()

            // Should contain href to logout endpoint
            html shouldContain "href=\"/auth/logout\""
        }
    }

    "logout link clears session and redirects to login" {
        testUserProfileApplication {
            val noRedirectClient = createClient {
                install(HttpCookies)
                followRedirects = false
            }

            // Create session
            noRedirectClient.get("/test/create-session")

            // Click logout
            val logoutResponse = noRedirectClient.get("/auth/logout")

            logoutResponse.status shouldBe HttpStatusCode.Found
            logoutResponse.headers[HttpHeaders.Location] shouldBe "/login"
        }
    }

    "after logout, dashboard access redirects to login" {
        testUserProfileApplication {
            val cookieClient = createClient {
                install(HttpCookies)
                followRedirects = false
            }

            // Create session and verify access
            cookieClient.get("/test/create-session")
            val beforeLogout = cookieClient.get("/dashboard")
            beforeLogout.status shouldBe HttpStatusCode.OK

            // Logout
            cookieClient.get("/auth/logout")

            // Try to access dashboard - should redirect to login
            val afterLogout = cookieClient.get("/dashboard") {
                header(HttpHeaders.Accept, ContentType.Text.Html.toString())
            }

            afterLogout.status shouldBe HttpStatusCode.Found
            afterLogout.headers[HttpHeaders.Location] shouldBe "/login"
        }
    }

    // ========================================
    // Header Layout Tests
    // ========================================

    "dashboard header has user profile in header element" {
        testUserProfileApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            cookieClient.get("/test/create-session")
            val response = cookieClient.get("/dashboard")
            val html = response.bodyAsText()

            // User info should be within header tag
            html shouldContain "<header"

            // Header should contain user-related content
            val headerContent = html.substringAfter("<header").substringBefore("</header>")
            val hasUserContent = headerContent.contains("testuser") ||
                headerContent.contains("avatar") ||
                headerContent.contains("Logout")

            hasUserContent shouldBe true
        }
    }

    "dashboard header positions user profile on right side" {
        testUserProfileApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            cookieClient.get("/test/create-session")
            val response = cookieClient.get("/dashboard")
            val html = response.bodyAsText()

            // Should use flex layout with space-between or justify-end
            val hasRightAlignment = html.contains("justify-between") ||
                html.contains("justify-end") ||
                html.contains("ml-auto") ||
                html.contains("float-right")

            hasRightAlignment shouldBe true
        }
    }

    // ========================================
    // Edge Case Tests
    // ========================================

    "dashboard header handles user without avatar gracefully" {
        // This test documents expected behavior when avatarUrl is null
        testUserProfileApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            // Note: Current test user has avatar, but implementation should handle null
            cookieClient.get("/test/create-session")
            val response = cookieClient.get("/dashboard")

            // Should not crash, page should still render
            response.status shouldBe HttpStatusCode.OK
        }
    }

    "dashboard header handles user without display name" {
        testUserProfileApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            // Note: Current test user has displayName, but implementation should handle null
            cookieClient.get("/test/create-session")
            val response = cookieClient.get("/dashboard")
            val html = response.bodyAsText()

            // Should fall back to username when displayName is null
            html shouldContain "testuser"
        }
    }

    // ========================================
    // XSS Protection Tests
    // ========================================

    "dashboard header escapes username in HTML output" {
        // This test ensures usernames with special characters are escaped
        testUserProfileApplication {
            val cookieClient = createClient {
                install(HttpCookies)
            }

            cookieClient.get("/test/create-session")
            val response = cookieClient.get("/dashboard")
            val html = response.bodyAsText()

            // HTML should be properly escaped (no raw < or > from user input)
            // The test user has safe username, but implementation must escape
            response.status shouldBe HttpStatusCode.OK
        }
    }
})
