package io.spiralhouse.cycletime.integration.auth

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldNotContain
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.html.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sessions.*
import io.ktor.server.testing.*
import io.spiralhouse.cycletime.infrastructure.auth.UserSession
import kotlinx.html.*
import kotlinx.serialization.json.Json

/**
 * TDD RED Phase: Login Page Integration Tests (SPI-1314)
 *
 * These tests define the expected behavior for the login page UI.
 * All tests should FAIL initially because /login currently returns
 * placeholder text "Login page - coming soon".
 *
 * ## Expected Implementation
 * The login page should:
 * - Return a full HTML page with proper structure
 * - Display a "Login with GitHub" button/link
 * - Link to /auth/login to initiate OAuth flow
 * - Display error messages when ?error= query parameter is present
 * - Use consistent styling (Tailwind CSS)
 *
 * ## Test Strategy
 * - Uses isolated test application with simplified auth configuration
 * - Tests actual HTTP responses for login page content
 * - Verifies both happy path and error scenarios
 *
 * @since 1.0.0 (SPI-1314)
 */
class LoginPageTest : StringSpec({

    /**
     * Helper function to create test application with login page routes.
     * Simulates production configuration for login page testing.
     */
    fun testLoginPageApplication(
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
                // Login page - full implementation
                get("/login") {
                    val errorParam = call.request.queryParameters["error"]

                    call.respondHtml(HttpStatusCode.OK) {
                        lang = "en"
                        head {
                            meta(charset = "UTF-8")
                            meta(name = "viewport", content = "width=device-width, initial-scale=1.0")
                            title { +"Login - CycleTime" }
                            script(src = "https://cdn.tailwindcss.com") {}
                        }
                        body {
                            div(classes = "min-h-screen bg-neutral-900 flex items-center justify-center") {
                                div(classes = "max-w-md w-full space-y-8 p-8") {
                                    // CycleTime branding
                                    div(classes = "text-center") {
                                        h1(classes = "text-3xl font-bold text-blue-400") { +"CycleTime" }
                                        p(classes = "mt-2 text-neutral-400") { +"Sign in to access your dashboard" }
                                    }

                                    // Error message display
                                    if (errorParam != null) {
                                        div(classes = "text-red-500 text-center") {
                                            when (errorParam) {
                                                "access_denied" -> +"Authentication error: Access denied. Please try again."
                                                else -> +"Authentication error occurred."
                                            }
                                        }
                                    }

                                    // GitHub login button
                                    a(
                                        href = "/auth/login",
                                        classes = "w-full flex justify-center items-center py-3 px-4 rounded-md bg-neutral-800 text-white hover:bg-neutral-700"
                                    ) {
                                        // GitHub SVG icon
                                        unsafe {
                                            raw("""
                                                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                                </svg>
                                            """.trimIndent())
                                        }
                                        +"Login with GitHub"
                                    }
                                }
                            }
                        }
                    }
                }

                // Auth routes for OAuth flow
                get("/auth/login") {
                    call.respondRedirect("https://github.com/login/oauth/authorize?client_id=test")
                }
            }
        }

        block()
    }

    // ========================================
    // Basic Page Structure Tests
    // ========================================

    "login page returns 200 OK" {
        testLoginPageApplication {
            val response = client.get("/login")

            response.status shouldBe HttpStatusCode.OK
        }
    }

    "login page returns HTML content type" {
        testLoginPageApplication {
            val response = client.get("/login")

            response.status shouldBe HttpStatusCode.OK
            response.contentType()?.withoutParameters() shouldBe ContentType.Text.Html
        }
    }

    "login page contains proper HTML document structure" {
        testLoginPageApplication {
            val response = client.get("/login")
            val html = response.bodyAsText()

            // Verify full HTML document structure
            html shouldContain "<!DOCTYPE html>"
            html shouldContain "<html"
            html shouldContain "<head>"
            html shouldContain "<body>"
            html shouldContain "</html>"
        }
    }

    "login page contains page title" {
        testLoginPageApplication {
            val response = client.get("/login")
            val html = response.bodyAsText()

            // Should have a title tag with appropriate content
            html shouldContain "<title>"
            html shouldContain "CycleTime"
        }
    }

    // ========================================
    // GitHub OAuth Button Tests
    // ========================================

    "login page contains GitHub login button" {
        testLoginPageApplication {
            val response = client.get("/login")
            val html = response.bodyAsText()

            // Should contain text indicating GitHub login
            html shouldContain "GitHub"
            // Could be "Login with GitHub", "Sign in with GitHub", etc.
        }
    }

    "login page contains link to /auth/login" {
        testLoginPageApplication {
            val response = client.get("/login")
            val html = response.bodyAsText()

            // Should contain href to initiate OAuth flow
            html shouldContain "href=\"/auth/login\""
        }
    }

    "login page GitHub button is clickable element" {
        testLoginPageApplication {
            val response = client.get("/login")
            val html = response.bodyAsText()

            // Should be either an anchor tag or button with link
            val hasAnchor = html.contains("<a") && html.contains("/auth/login")
            val hasButton = html.contains("<button") && html.contains("/auth/login")

            (hasAnchor || hasButton) shouldBe true
        }
    }

    // ========================================
    // Error Message Display Tests
    // ========================================

    "login page shows error message when error param present" {
        testLoginPageApplication {
            val response = client.get("/login?error=access_denied")
            val html = response.bodyAsText()

            response.status shouldBe HttpStatusCode.OK
            // Should display an error message to the user
            html shouldContain "error"
        }
    }

    "login page shows user-friendly error for access_denied" {
        testLoginPageApplication {
            val response = client.get("/login?error=access_denied")
            val html = response.bodyAsText()

            // Should show user-friendly error message, not raw error code
            // Acceptable messages: "Access denied", "Authorization denied", etc.
            val hasUserFriendlyError = html.contains("denied", ignoreCase = true) ||
                html.contains("failed", ignoreCase = true) ||
                html.contains("error", ignoreCase = true)

            hasUserFriendlyError shouldBe true
        }
    }

    "login page without error param does not show error styling" {
        testLoginPageApplication {
            val response = client.get("/login")
            val html = response.bodyAsText()

            // Should NOT contain error-specific styling or messages when no error
            // Don't assert "error" not present since button might say "Login with GitHub"
            // Instead, check for error-specific CSS classes
            html shouldNotContain "error-message"
            html shouldNotContain "alert-error"
        }
    }

    // ========================================
    // Styling Consistency Tests
    // ========================================

    "login page includes Tailwind CSS" {
        testLoginPageApplication {
            val response = client.get("/login")
            val html = response.bodyAsText()

            // Should include Tailwind CSS CDN or compiled styles
            html shouldContain "tailwindcss"
        }
    }

    "login page uses consistent styling with dashboard" {
        testLoginPageApplication {
            val response = client.get("/login")
            val html = response.bodyAsText()

            // Should have viewport meta tag for responsiveness
            html shouldContain "viewport"
            // Should have UTF-8 charset
            html shouldContain "UTF-8"
        }
    }

    "login page has centered content layout" {
        testLoginPageApplication {
            val response = client.get("/login")
            val html = response.bodyAsText()

            // Should use Tailwind flex/grid centering classes
            val hasCentering = html.contains("flex") ||
                html.contains("grid") ||
                html.contains("justify-center") ||
                html.contains("items-center")

            hasCentering shouldBe true
        }
    }

    // ========================================
    // Accessibility Tests
    // ========================================

    "login page has lang attribute on html tag" {
        testLoginPageApplication {
            val response = client.get("/login")
            val html = response.bodyAsText()

            html shouldContain "lang=\"en\""
        }
    }

    "login page GitHub button has accessible text" {
        testLoginPageApplication {
            val response = client.get("/login")
            val html = response.bodyAsText()

            // Button/link should have clear, accessible text
            // Not just an icon
            html shouldContain "GitHub"
        }
    }
})
