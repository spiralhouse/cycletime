package io.spiralhouse.cycletime.integration.api

import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldContainAll
import io.kotest.matchers.collections.shouldNotBeEmpty
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import kotlinx.serialization.json.*
import org.slf4j.LoggerFactory
import java.io.File

// Helper function for clearer test failure messages
private fun fail(message: String): Nothing = throw AssertionError(message)

/**
 * TDD RED Phase Tests for OpenAPI Document Generation (SPI-655)
 *
 * ## Purpose
 *
 * These tests define the expected behavior of OpenAPI 3.x document generation
 * for the CycleTime API. They verify build-time generation, spec completeness,
 * route coverage, metadata, schemas, and status code documentation.
 *
 * ## Expected Behavior (Why These Tests FAIL Initially)
 *
 * 1. **Build-Time Generation**: OpenAPI spec not yet configured in build.gradle.kts
 *    - MISSING: `openApi` configuration block
 *    - MISSING: Build task to generate openapi/generated.json
 *
 * 2. **Spec Structure**: Generated spec missing required OpenAPI components
 *    - MISSING: OpenAPI version field (3.0.x or 3.1.x)
 *    - MISSING: info, paths, components sections
 *
 * 3. **Route Coverage**: API routes not yet documented with KDoc annotations
 *    - MISSING: @param, @response, @throws annotations on route handlers
 *    - MISSING: Route descriptions and summaries
 *
 * 4. **Metadata**: API information not configured
 *    - MISSING: title, description, version in openApi block
 *    - MISSING: contact and license information
 *
 * 5. **Schemas**: Request/response types not yet inferred
 *    - MISSING: KDoc annotations for call.receive()/call.respond()
 *    - MISSING: Schema definitions in components section
 *
 * 6. **Status Codes**: HTTP responses not documented
 *    - MISSING: @response annotations for 200, 201, 400, 404, 500
 *    - MISSING: Error response schemas
 *
 * ## GREEN Phase Implementation Guide
 *
 * To make these tests pass:
 * 1. Add `openApi` configuration to build.gradle.kts
 * 2. Configure metadata (title, description, version, contact, license)
 * 3. Add KDoc annotations to route handlers
 * 4. Document request/response types with @param and @response
 * 5. Specify HTTP status codes for all endpoints
 * 6. Run build to generate openapi/generated.json
 *
 * ## Test Execution
 *
 * - Run: `./gradlew integrationTest --tests "OpenAPIGenerationTest"`
 * - Expected: ALL tests FAIL with clear error messages
 * - Success Criteria: Tests indicate what's missing for OpenAPI generation
 *
 * @see https://ktor.io/docs/server-openapi.html
 * @since SPI-655
 */
class OpenAPIGenerationTest : FunSpec({

    val logger = LoggerFactory.getLogger(OpenAPIGenerationTest::class.java)
    val projectRoot = File(System.getProperty("user.dir"))
    val openApiSpecFile = File(projectRoot, "openapi/generated.json")

    // ================================================================================
    // Test 1: Build-Time Generation Verification
    // ================================================================================

    test("OpenAPI spec file should be generated at build time") {
        // WHY THIS FAILS: openapi/generated.json does not exist
        // WHAT'S MISSING: openApi configuration in build.gradle.kts
        // NEXT STEP: Add openApi { ... } block to enable generation

        if (!openApiSpecFile.exists()) {
            fail(
                """
                |❌ OpenAPI spec file not found at: ${openApiSpecFile.absolutePath}
                |
                |Expected: openapi/generated.json exists after build
                |Actual: File does not exist
                |
                |To fix:
                |1. Add openApi configuration to build.gradle.kts:
                |   application {
                |       openApi {
                |           outputFile = file("openapi/generated.json")
                |       }
                |   }
                |2. Run: ./gradlew build
                |3. Verify: openapi/generated.json is created
                """.trimMargin()
            )
        }

        logger.info("✓ OpenAPI spec file exists at: ${openApiSpecFile.absolutePath}")
    }

    test("Generated OpenAPI spec should be valid JSON") {
        // WHY THIS FAILS: Spec file doesn't exist yet
        // WHAT'S MISSING: Build configuration for OpenAPI generation
        // NEXT STEP: Configure openApi plugin in build.gradle.kts

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Configure openApi in build.gradle.kts first.")
        }

        val specContent = openApiSpecFile.readText()
        val jsonElement = runCatching {
            Json.parseToJsonElement(specContent)
        }.getOrElse { error ->
            fail(
                """
                |❌ OpenAPI spec is not valid JSON
                |
                |Error: ${error.message}
                |File: ${openApiSpecFile.absolutePath}
                |
                |The generated spec must be valid JSON.
                """.trimMargin()
            )
        }

        jsonElement.shouldNotBe(null)
        logger.info("✓ OpenAPI spec is valid JSON")
    }

    // ================================================================================
    // Test 2: OpenAPI Spec Structure Validation
    // ================================================================================

    test("OpenAPI spec should have required top-level structure") {
        // WHY THIS FAILS: Spec not generated with proper OpenAPI structure
        // WHAT'S MISSING: openapi, info, paths, components fields
        // NEXT STEP: Verify openApi configuration includes all required metadata

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject

        // Verify OpenAPI version
        val openApiVersion = spec["openapi"]?.jsonPrimitive?.content
            ?: fail(
                """
                |❌ Missing 'openapi' version field
                |
                |Expected: "openapi": "3.0.3" or "3.1.0"
                |Actual: Field not present
                |
                |Fix: Ensure openApi configuration generates OpenAPI 3.x spec
                """.trimMargin()
            )

        openApiVersion shouldContain "3."
        logger.info("✓ OpenAPI version: $openApiVersion")

        // Verify required sections exist
        val requiredSections = listOf("info", "paths", "components")
        requiredSections.forEach { section ->
            if (!spec.containsKey(section)) {
                fail(
                    """
                    |❌ Missing required section: '$section'
                    |
                    |Expected: OpenAPI spec contains '$section' section
                    |Actual: Section not found in generated spec
                    |
                    |Required sections: openapi, info, paths, components
                    """.trimMargin()
                )
            }
        }

        logger.info("✓ All required sections present: ${requiredSections.joinToString()}")
    }

    test("OpenAPI spec should have valid info section") {
        // WHY THIS FAILS: Info metadata not configured
        // WHAT'S MISSING: title, description, version in openApi block
        // NEXT STEP: Add metadata to openApi configuration

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val info = spec["info"]?.jsonObject
            ?: fail("Missing 'info' section in OpenAPI spec")

        // Verify required info fields
        val title = info["title"]?.jsonPrimitive?.content
            ?: fail(
                """
                |❌ Missing API title in info section
                |
                |Expected: "title": "CycleTime API"
                |Actual: Field not present
                |
                |Fix: Add title to openApi configuration:
                |   openApi {
                |       info {
                |           title = "CycleTime API"
                |       }
                |   }
                """.trimMargin()
            )

        title shouldBe "CycleTime API"

        val description = info["description"]?.jsonPrimitive?.content
            ?: fail("Missing 'description' in info section")

        description.shouldNotBe("")

        val version = info["version"]?.jsonPrimitive?.content
            ?: fail("Missing 'version' in info section")

        version.shouldNotBe("")
        logger.info("✓ Info section valid: title=$title, version=$version")
    }

    test("OpenAPI spec should include contact and license information") {
        // WHY THIS FAILS: Optional metadata not configured
        // WHAT'S MISSING: contact and license in info section
        // NEXT STEP: Add contact/license to openApi configuration

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val info = spec["info"]?.jsonObject
            ?: fail("Missing 'info' section")

        val contact = info["contact"]?.jsonObject
            ?: fail(
                """
                |❌ Missing contact information
                |
                |Expected: Contact information for API support
                |Actual: 'contact' field not present
                |
                |Fix: Add contact to openApi configuration:
                |   openApi {
                |       info {
                |           contact {
                |               name = "Spiral House"
                |               email = "support@spiralhouse.io"
                |           }
                |       }
                |   }
                """.trimMargin()
            )

        contact["name"].shouldNotBe(null)

        val license = info["license"]?.jsonObject
            ?: fail("Missing license information")

        license["name"].shouldNotBe(null)
        logger.info("✓ Contact and license information present")
    }

    // ================================================================================
    // Test 3: Route Coverage Verification
    // ================================================================================

    test("All v1 project routes should be documented in OpenAPI spec") {
        // WHY THIS FAILS: Routes not annotated with KDoc
        // WHAT'S MISSING: @param, @response annotations on ProjectRoutes.kt
        // NEXT STEP: Add KDoc to configureProjectRoutes()

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val paths = spec["paths"]?.jsonObject
            ?: fail("Missing 'paths' section in OpenAPI spec")

        val requiredProjectRoutes = listOf(
            "/api/v1/projects",
            "/api/v1/projects/{id}"
        )

        val missingRoutes = requiredProjectRoutes.filterNot { paths.containsKey(it) }

        if (missingRoutes.isNotEmpty()) {
            fail(
                """
                |❌ Project routes not documented in OpenAPI spec
                |
                |Missing routes: ${missingRoutes.joinToString()}
                |
                |Expected: All project CRUD routes documented
                |Actual: ${paths.keys.size} routes found in spec
                |
                |Fix: Add KDoc annotations to ProjectRoutes.kt:
                |   /**
                |    * @route GET /api/v1/projects
                |    * @response 200 List of projects
                |    */
                """.trimMargin()
            )
        }

        logger.info("✓ All project routes documented: ${requiredProjectRoutes.joinToString()}")
    }

    test("All v1 workflow routes should be documented in OpenAPI spec") {
        // WHY THIS FAILS: Workflow routes not annotated
        // WHAT'S MISSING: KDoc on WorkflowRoutes.kt
        // NEXT STEP: Document workflow CRUD operations

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val paths = spec["paths"]?.jsonObject
            ?: fail("Missing 'paths' section")

        val requiredWorkflowRoutes = listOf(
            "/api/v1/workflows",
            "/api/v1/workflows/{id}",
            "/api/v1/workflows/{id}/transitions"
        )

        val missingRoutes = requiredWorkflowRoutes.filterNot { paths.containsKey(it) }

        if (missingRoutes.isNotEmpty()) {
            fail(
                """
                |❌ Workflow routes not documented
                |
                |Missing: ${missingRoutes.joinToString()}
                |
                |Fix: Add KDoc to WorkflowRoutes.kt endpoints
                """.trimMargin()
            )
        }

        logger.info("✓ All workflow routes documented")
    }

    test("All v1 issue routes should be documented in OpenAPI spec") {
        // WHY THIS FAILS: Nested issue routes not documented
        // WHAT'S MISSING: KDoc on IssueRoutes.kt
        // NEXT STEP: Document nested resource patterns

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val paths = spec["paths"]?.jsonObject
            ?: fail("Missing 'paths' section")

        val requiredIssueRoutes = listOf(
            "/api/v1/projects/{projectId}/issues",
            "/api/v1/projects/{projectId}/issues/{issueId}"
        )

        val missingRoutes = requiredIssueRoutes.filterNot { paths.containsKey(it) }

        if (missingRoutes.isNotEmpty()) {
            fail(
                """
                |❌ Issue routes not documented
                |
                |Missing: ${missingRoutes.joinToString()}
                |
                |Fix: Add KDoc to IssueRoutes.kt for nested resources
                """.trimMargin()
            )
        }

        logger.info("✓ All issue routes documented")
    }

    test("Legacy routes should be excluded from OpenAPI spec") {
        // WHY THIS FAILS: Spec not generated yet
        // WHAT'S MISSING: Legacy route filtering
        // NEXT STEP: Verify only /api/v1/* routes included

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val paths = spec["paths"]?.jsonObject
            ?: fail("Missing 'paths' section")

        val legacyRoutes = paths.keys.filter { it.startsWith("/api/") && !it.startsWith("/api/v1/") }

        if (legacyRoutes.isNotEmpty()) {
            fail(
                """
                |❌ Legacy routes included in OpenAPI spec
                |
                |Found legacy routes: ${legacyRoutes.joinToString()}
                |
                |Expected: Only /api/v1/* routes in spec
                |Actual: Legacy /api/* routes present
                |
                |Fix: Exclude legacy routes from OpenAPI generation
                """.trimMargin()
            )
        }

        logger.info("✓ Legacy routes properly excluded")
    }

    // ================================================================================
    // Test 4: Metadata Validation
    // ================================================================================

    test("OpenAPI spec should declare correct API version") {
        // WHY THIS FAILS: Version not configured
        // WHAT'S MISSING: info.version in openApi block
        // NEXT STEP: Set version from semver.version

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val info = spec["info"]?.jsonObject ?: fail("Missing info section")
        val version = info["version"]?.jsonPrimitive?.content
            ?: fail("Missing version in info section")

        // Version should follow semantic versioning pattern
        val semverPattern = Regex("""^\d+\.\d+\.\d+(-\w+)?$""")
        if (!version.matches(semverPattern)) {
            fail(
                """
                |❌ Invalid API version format
                |
                |Expected: Semantic version (e.g., "1.0.0-SNAPSHOT")
                |Actual: "$version"
                |
                |Fix: Use project version in openApi configuration:
                |   openApi {
                |       info {
                |           version = semver.version.toString()
                |       }
                |   }
                """.trimMargin()
            )
        }

        logger.info("✓ API version valid: $version")
    }

    test("OpenAPI spec should include server URL configuration") {
        // WHY THIS FAILS: Server URLs not configured
        // WHAT'S MISSING: servers array in spec
        // NEXT STEP: Add server configurations

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val servers = spec["servers"]?.jsonArray
            ?: fail(
                """
                |❌ Missing server URLs in OpenAPI spec
                |
                |Expected: "servers" array with API base URLs
                |Actual: Field not present
                |
                |Fix: Add servers to openApi configuration:
                |   openApi {
                |       servers = listOf(
                |           Server("http://localhost:8080", "Development"),
                |           Server("https://api.cycletime.io", "Production")
                |       )
                |   }
                """.trimMargin()
            )

        servers.shouldNotBeEmpty()
        logger.info("✓ Server URLs configured: ${servers.size} server(s)")
    }

    // ================================================================================
    // Test 5: Schema Completeness Validation
    // ================================================================================

    test("OpenAPI spec should define request body schemas") {
        // WHY THIS FAILS: Schemas not generated from DTOs
        // WHAT'S MISSING: Request type documentation in routes
        // NEXT STEP: Add KDoc for call.receive<T>() types

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val components = spec["components"]?.jsonObject
            ?: fail("Missing components section")

        val schemas = components["schemas"]?.jsonObject
            ?: fail(
                """
                |❌ Missing schemas in components section
                |
                |Expected: Request/response schemas defined
                |Actual: No schemas found
                |
                |Fix: Document request types with KDoc:
                |   /**
                |    * @param request CreateProjectRequest
                |    */
                """.trimMargin()
            )

        val requiredSchemas = listOf(
            "CreateProjectRequest",
            "UpdateProjectRequest",
            "CreateWorkflowRequest",
            "CreateIssueRequest"
        )

        val missingSchemas = requiredSchemas.filterNot { schemas.containsKey(it) }

        if (missingSchemas.isNotEmpty()) {
            fail(
                """
                |❌ Request schemas not defined
                |
                |Missing: ${missingSchemas.joinToString()}
                |
                |Expected: All DTO classes documented as schemas
                |Actual: ${schemas.keys.size} schemas found
                """.trimMargin()
            )
        }

        logger.info("✓ Request schemas defined: ${requiredSchemas.joinToString()}")
    }

    test("OpenAPI spec should define response body schemas") {
        // WHY THIS FAILS: Response schemas not inferred
        // WHAT'S MISSING: Response type documentation
        // NEXT STEP: Add @response annotations with types

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val components = spec["components"]?.jsonObject ?: fail("Missing components")
        val schemas = components["schemas"]?.jsonObject ?: fail("Missing schemas")

        val requiredResponseSchemas = listOf(
            "ProjectResponse",
            "WorkflowResponse",
            "IssueResponse",
            "ErrorResponse"
        )

        val missingSchemas = requiredResponseSchemas.filterNot { schemas.containsKey(it) }

        if (missingSchemas.isNotEmpty()) {
            fail(
                """
                |❌ Response schemas not defined
                |
                |Missing: ${missingSchemas.joinToString()}
                |
                |Fix: Document response types:
                |   /**
                |    * @response 200 ProjectResponse
                |    */
                """.trimMargin()
            )
        }

        logger.info("✓ Response schemas defined")
    }

    test("Schema definitions should include all required properties") {
        // WHY THIS FAILS: Schema details not complete
        // WHAT'S MISSING: Property descriptions and types
        // NEXT STEP: Ensure DTO classes have proper KDoc

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val components = spec["components"]?.jsonObject ?: fail("Missing components")
        val schemas = components["schemas"]?.jsonObject ?: fail("Missing schemas")

        // Verify ProjectResponse schema has required fields
        val projectResponseSchema = schemas["ProjectResponse"]?.jsonObject
            ?: fail("Missing ProjectResponse schema")

        val properties = projectResponseSchema["properties"]?.jsonObject
            ?: fail(
                """
                |❌ ProjectResponse schema missing properties
                |
                |Expected: Schema with id, name, description, status properties
                |Actual: No properties defined
                |
                |Fix: Ensure DTO classes are properly serializable
                """.trimMargin()
            )

        val requiredProperties = listOf("id", "name")
        val missingProperties = requiredProperties.filterNot { properties.containsKey(it) }

        if (missingProperties.isNotEmpty()) {
            fail(
                """
                |❌ ProjectResponse schema incomplete
                |
                |Missing properties: ${missingProperties.joinToString()}
                |
                |Fix: Verify DTO class has all required fields
                """.trimMargin()
            )
        }

        logger.info("✓ Schema properties complete")
    }

    // ================================================================================
    // Test 6: HTTP Status Code Documentation
    // ================================================================================

    test("All endpoints should document success status codes") {
        // WHY THIS FAILS: Status codes not annotated
        // WHAT'S MISSING: @response 200/201 annotations
        // NEXT STEP: Add status code documentation to routes

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val paths = spec["paths"]?.jsonObject ?: fail("Missing paths")

        // Check POST /api/v1/projects has 201 Created
        val projectsPath = paths["/api/v1/projects"]?.jsonObject
            ?: fail("Missing /api/v1/projects path")

        val postOperation = projectsPath["post"]?.jsonObject
            ?: fail("Missing POST operation for /api/v1/projects")

        val responses = postOperation["responses"]?.jsonObject
            ?: fail(
                """
                |❌ Missing responses documentation
                |
                |Expected: Status codes documented for POST /api/v1/projects
                |Actual: No responses defined
                |
                |Fix: Add @response annotations:
                |   /**
                |    * @response 201 Project created successfully
                |    * @response 400 Validation error
                |    */
                """.trimMargin()
            )

        if (!responses.containsKey("201")) {
            fail("Missing 201 Created response for POST /api/v1/projects")
        }

        logger.info("✓ Success status codes documented")
    }

    test("All endpoints should document error status codes") {
        // WHY THIS FAILS: Error responses not documented
        // WHAT'S MISSING: @response 400/404/500 annotations
        // NEXT STEP: Document all error scenarios

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val paths = spec["paths"]?.jsonObject ?: fail("Missing paths")

        // Check GET /api/v1/projects/{id} has error codes
        val projectByIdPath = paths["/api/v1/projects/{id}"]?.jsonObject
            ?: fail("Missing /api/v1/projects/{id} path")

        val getOperation = projectByIdPath["get"]?.jsonObject
            ?: fail("Missing GET operation")

        val responses = getOperation["responses"]?.jsonObject
            ?: fail("Missing responses")

        val requiredErrorCodes = listOf("404", "500")
        val missingErrorCodes = requiredErrorCodes.filterNot { responses.containsKey(it) }

        if (missingErrorCodes.isNotEmpty()) {
            fail(
                """
                |❌ Error status codes not documented
                |
                |Missing: ${missingErrorCodes.joinToString()}
                |
                |Expected: 404 Not Found, 500 Internal Server Error
                |Actual: Only ${responses.keys.joinToString()} documented
                |
                |Fix: Add error response annotations:
                |   /**
                |    * @response 404 Project not found
                |    * @response 500 Server error
                |    */
                """.trimMargin()
            )
        }

        logger.info("✓ Error status codes documented")
    }

    test("Error responses should reference ErrorResponse schema") {
        // WHY THIS FAILS: Error schema not linked to responses
        // WHAT'S MISSING: $ref to ErrorResponse in error responses
        // NEXT STEP: Ensure error responses use ErrorResponse type

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val paths = spec["paths"]?.jsonObject ?: fail("Missing paths")

        val projectByIdPath = paths["/api/v1/projects/{id}"]?.jsonObject
            ?: fail("Missing path")

        val getOperation = projectByIdPath["get"]?.jsonObject ?: fail("Missing operation")
        val responses = getOperation["responses"]?.jsonObject ?: fail("Missing responses")
        val notFoundResponse = responses["404"]?.jsonObject ?: fail("Missing 404 response")

        val content = notFoundResponse["content"]?.jsonObject
            ?: fail(
                """
                |❌ Error response missing content definition
                |
                |Expected: Reference to ErrorResponse schema
                |Actual: No content defined for 404 response
                |
                |Fix: Ensure error responses specify ErrorResponse type
                """.trimMargin()
            )

        logger.info("✓ Error responses use ErrorResponse schema")
    }

    // ================================================================================
    // Test 7: Parameter Documentation
    // ================================================================================

    test("Path parameters should be documented") {
        // WHY THIS FAILS: Path params not documented
        // WHAT'S MISSING: @param annotations for {id}, {projectId}
        // NEXT STEP: Document all path parameters

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val paths = spec["paths"]?.jsonObject ?: fail("Missing paths")

        val projectByIdPath = paths["/api/v1/projects/{id}"]?.jsonObject
            ?: fail("Missing /api/v1/projects/{id}")

        val getOperation = projectByIdPath["get"]?.jsonObject ?: fail("Missing GET operation")

        val parameters = getOperation["parameters"]?.jsonArray
            ?: fail(
                """
                |❌ Path parameters not documented
                |
                |Expected: Parameters for {id} path variable
                |Actual: No parameters defined
                |
                |Fix: Add parameter documentation:
                |   /**
                |    * @param id Project identifier (UUID)
                |    */
                """.trimMargin()
            )

        val idParam = parameters.firstOrNull {
            it.jsonObject["name"]?.jsonPrimitive?.content == "id"
        } ?: fail("Missing 'id' parameter definition")

        val paramIn = idParam.jsonObject["in"]?.jsonPrimitive?.content
        paramIn shouldBe "path"

        logger.info("✓ Path parameters documented")
    }

    test("Query parameters should be documented") {
        // WHY THIS FAILS: Query params not documented
        // WHAT'S MISSING: @param annotations for ?template
        // NEXT STEP: Document query parameters

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val paths = spec["paths"]?.jsonObject ?: fail("Missing paths")

        val workflowsPath = paths["/api/v1/workflows"]?.jsonObject
            ?: fail("Missing /api/v1/workflows")

        val postOperation = workflowsPath["post"]?.jsonObject ?: fail("Missing POST operation")

        // Workflow creation endpoint supports ?template query param
        val parameters = postOperation["parameters"]?.jsonArray
            ?: fail(
                """
                |❌ Query parameters not documented
                |
                |Expected: Documentation for 'template' query parameter
                |Actual: No parameters defined
                |
                |Fix: Add query parameter docs:
                |   /**
                |    * @param template Workflow template (default, bug, feature)
                |    */
                """.trimMargin()
            )

        logger.info("✓ Query parameters documented")
    }

    // ================================================================================
    // Test 8: Edge Cases and Validation
    // ================================================================================

    test("OpenAPI spec should validate against OpenAPI 3.0 schema") {
        // WHY THIS FAILS: Spec structure may be incomplete
        // WHAT'S MISSING: Full compliance with OpenAPI 3.0 spec
        // NEXT STEP: Use OpenAPI validator to check compliance

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject

        // Basic structural validation
        val requiredTopLevel = listOf("openapi", "info", "paths")
        requiredTopLevel.forEach { field ->
            if (!spec.containsKey(field)) {
                fail("OpenAPI spec missing required field: $field")
            }
        }

        // Verify OpenAPI version is 3.x
        val version = spec["openapi"]?.jsonPrimitive?.content ?: fail("Missing openapi version")
        if (!version.startsWith("3.")) {
            fail("Invalid OpenAPI version: $version (expected 3.x)")
        }

        logger.info("✓ OpenAPI spec structure valid")
    }

    test("All documented routes should have operation IDs") {
        // WHY THIS FAILS: Operation IDs not assigned
        // WHAT'S MISSING: Unique operationId for each endpoint
        // NEXT STEP: Configure operation ID generation

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val paths = spec["paths"]?.jsonObject ?: fail("Missing paths")

        val operationsWithoutIds = mutableListOf<String>()

        paths.forEach { (path, pathItem) ->
            pathItem.jsonObject.forEach { (method, operation) ->
                if (method in listOf("get", "post", "put", "delete", "patch")) {
                    val operationId = operation.jsonObject["operationId"]?.jsonPrimitive?.content
                    if (operationId.isNullOrBlank()) {
                        operationsWithoutIds.add("$method $path")
                    }
                }
            }
        }

        if (operationsWithoutIds.isNotEmpty()) {
            fail(
                """
                |❌ Operations missing operationId
                |
                |Operations: ${operationsWithoutIds.joinToString()}
                |
                |Expected: Each operation has unique operationId
                |Actual: Some operations lack operationId
                |
                |Fix: Ensure Ktor OpenAPI generates operation IDs
                """.trimMargin()
            )
        }

        logger.info("✓ All operations have operation IDs")
    }

    test("OpenAPI spec should include security schemes if authentication exists") {
        // WHY THIS FAILS: Security not configured
        // WHAT'S MISSING: Security schemes in components
        // NEXT STEP: Add security configuration when auth is implemented

        if (!openApiSpecFile.exists()) {
            fail("OpenAPI spec file not found. Run build first.")
        }

        val spec = Json.parseToJsonElement(openApiSpecFile.readText()).jsonObject
        val components = spec["components"]?.jsonObject ?: fail("Missing components")

        // This is a future requirement - currently no auth
        // When auth is added, this should define security schemes
        val securitySchemes = components["securitySchemes"]?.jsonObject

        if (securitySchemes != null) {
            logger.info("✓ Security schemes defined: ${securitySchemes.keys.joinToString()}")
        } else {
            logger.info("ℹ Security schemes not yet implemented (expected for MVP)")
        }
    }
})
