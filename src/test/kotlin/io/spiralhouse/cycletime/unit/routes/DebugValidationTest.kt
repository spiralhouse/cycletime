package io.spiralhouse.cycletime.unit.routes

import io.kotest.core.spec.style.StringSpec
import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation as ClientContentNegotiation
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.plugins.di.DI
import io.ktor.server.plugins.di.dependencies
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation as ServerContentNegotiation
import io.ktor.server.routing.*
import io.ktor.server.testing.*
import io.mockk.*
import io.spiralhouse.cycletime.api.dto.*
import io.spiralhouse.cycletime.api.routes.configureProjectRoutes
import io.spiralhouse.cycletime.api.middleware.ErrorHandler
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.domain.services.TimeProvider
import kotlinx.serialization.json.Json

/**
 * Debug test to understand validation response format.
 */
class DebugValidationTest : StringSpec({

    "Debug: Check actual validation response format" {
        val mockProjectService = mockk<ProjectApplicationService>()
        val mockTimeProvider = SimpleRouteTestUtils.createMockTimeProvider()

        testApplication {
            application {
                install(DI)
                dependencies {
                    provide<ProjectApplicationService> { mockProjectService }
                    provide<TimeProvider> { mockTimeProvider }
                }

                // Install error handling middleware
                ErrorHandler.install(this, mockTimeProvider)

                install(ServerContentNegotiation) {
                    json(Json {
                        prettyPrint = true
                        isLenient = true
                        ignoreUnknownKeys = true
                    })
                }

                routing {
                    configureProjectRoutes()
                }
            }

            val client = createClient {
                install(ClientContentNegotiation) {
                    json(Json {
                        prettyPrint = true
                        isLenient = true
                        ignoreUnknownKeys = true
                    })
                }
            }

            val response = client.post("/api/projects") {
                contentType(ContentType.Application.Json)
                setBody(CreateProjectRequest(name = "", description = "Valid description"))
            }

            println("=== DEBUG VALIDATION RESPONSE ===")
            println("Status: ${response.status}")
            println("Status value: ${response.status.value}")

            try {
                val errorResponse = response.body<ErrorResponse>()
                println("Error response: $errorResponse")
                println("Error field: '${errorResponse.error}'")
                println("Details field: '${errorResponse.details}'")
                println("Timestamp field: '${errorResponse.timestamp}'")
            } catch (e: Exception) {
                println("Failed to parse as ErrorResponse: $e")
                val rawBody = response.body<String>()
                println("Raw response body: '$rawBody'")
            }
            println("=== END DEBUG ===")
        }
    }
})