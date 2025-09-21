# API Route Unit Testing Standards

## Overview

This document establishes our standard approach for unit testing API route handlers in the CycleTime codebase. These patterns ensure fast, reliable, and maintainable tests while preserving full HTTP testing coverage.

## Testing Philosophy

**Primary Goal**: Fast, isolated unit tests that verify route behavior without external dependencies.

**Performance Standards**:
- Unit tests: <100ms per test
- Test suite execution: <10 seconds for 50+ tests
- Coverage requirement: 80%+ of route logic

**Testing Hierarchy**:
1. **Unit Tests** (this document) - Route logic with mocked services
2. **Integration Tests** - End-to-end HTTP workflows with real infrastructure
3. **System Tests** - Complete user scenarios

## Standard Testing Patterns

### Pattern 1: Mock DI Container Strategy ⭐ **PRIMARY PATTERN**

**Use When**: Testing complete HTTP request/response cycles with business logic isolation.

**Architecture**: Replace production DI configuration with test version providing mocked services.

#### Standard Implementation

```kotlin
class IssueRoutesUnitTest : StringSpec({
    lateinit var mockIssueService: IssueApplicationService
    lateinit var mockTimeProvider: TimeProvider

    beforeEach {
        mockIssueService = mockk()
        mockTimeProvider = mockk()
    }

    fun testWithMockedServices(test: suspend ApplicationTestBuilder.() -> Unit) {
        testApplication {
            application {
                dependencies {
                    provide<IssueApplicationService> { mockIssueService }
                    provide<TimeProvider> { mockTimeProvider }
                }
                configureRouting()
                configureSerialization()
            }
            test()
        }
    }

    "POST /api/issues should create issue successfully" {
        testWithMockedServices {
            every { mockIssueService.createIssue(any()) } returns mockIssue

            val response = client.post("/api/issues") {
                contentType(ContentType.Application.Json)
                setBody(CreateIssueRequest("Test Issue", "Description"))
            }

            response.status shouldBe HttpStatusCode.Created
            verify { mockIssueService.createIssue(any()) }
        }
    }
})
```

#### Benefits
- ✅ **Complete HTTP Testing**: Full request/response cycle verification
- ✅ **Fast Execution**: 5-10ms per test (vs 100ms+ integration tests)
- ✅ **Service Verification**: MockK verification of business logic calls
- ✅ **Minimal Code Changes**: No modification to existing route handlers

### Pattern 2: Direct Route Logic Testing

**Use When**: Testing complex business logic that benefits from isolation, or when HTTP layer testing is unnecessary.

**Architecture**: Extract route business logic into testable handler classes.

#### Standard Implementation

```kotlin
class IssueRouteHandler(
    private val issueService: IssueApplicationService,
    private val timeProvider: TimeProvider
) {
    suspend fun handleCreateIssue(request: CreateIssueRequest): IssueResponse {
        val command = CreateIssueCommand(
            title = request.title,
            description = request.description,
            createdAt = timeProvider.now()
        )
        val issue = issueService.createIssue(command)
        return issue.toResponse()
    }
}

class IssueRouteHandlerTest : StringSpec({
    lateinit var mockIssueService: IssueApplicationService
    lateinit var mockTimeProvider: TimeProvider
    lateinit var routeHandler: IssueRouteHandler

    beforeEach {
        mockIssueService = mockk()
        mockTimeProvider = mockk()
        routeHandler = IssueRouteHandler(mockIssueService, mockTimeProvider)
    }

    "handleCreateIssue should create issue with correct command" {
        runTest {
            every { mockIssueService.createIssue(any()) } returns mockIssue
            every { mockTimeProvider.now() } returns fixedTime

            val result = routeHandler.handleCreateIssue(request)

            result.title shouldBe "Test Issue"
            verify { mockIssueService.createIssue(match { it.title == "Test Issue" }) }
        }
    }
})
```

#### Benefits
- ✅ **Ultra-Fast Execution**: <1ms per test (no HTTP overhead)
- ✅ **Clear Architecture**: Business logic separated from HTTP concerns
- ✅ **Framework Independent**: Not tied to Ktor specifics
- ✅ **Simple Testing**: Direct function calls with mocked dependencies

## Implementation Guidelines

### File Organization

```
src/test/kotlin/io/spiralhouse/cycletime/unit/routes/
├── IssueRoutesUnitTest.kt            # Issue API routes
├── ProjectRoutesUnitTest.kt          # Project API routes
├── WorkflowRoutesUnitTest.kt         # Workflow API routes
└── SimpleRouteTestUtils.kt           # Shared test utilities
```

### Test Class Structure

```kotlin
class [RouteGroup]RoutesUnitTest : StringSpec({
    // Mock declarations
    lateinit var mockService: ServiceType
    lateinit var mockTimeProvider: TimeProvider

    // Setup
    beforeEach {
        mockService = mockk()
        mockTimeProvider = mockk()
    }

    // Test utility function
    fun testWithMockedServices(test: suspend ApplicationTestBuilder.() -> Unit) {
        // DI configuration
    }

    // Test cases grouped by HTTP method and endpoint
    "GET /api/[resource] should [expected behavior]" {
        testWithMockedServices {
            // Test implementation
        }
    }
})
```

### Mock Service Setup Standards

```kotlin
// Standard mock responses
val mockIssue = Issue.create(
    title = "Test Issue",
    description = "Test Description",
    type = IssueType.STORY,
    timeProvider = mockTimeProvider
)

// Standard mock behaviors
every { mockIssueService.createIssue(any()) } returns mockIssue
every { mockIssueService.getIssue(any()) } returns mockIssue
every { mockTimeProvider.now() } returns Instant.parse("2024-01-01T00:00:00Z")
```

## Test Coverage Standards

### Required Test Scenarios

**For Each Endpoint**:
1. **Happy Path**: Successful operation with valid input
2. **Validation**: Invalid input handling and error responses
3. **Business Logic**: Service method calls with correct parameters
4. **Error Handling**: Service exceptions translated to appropriate HTTP status codes

**Example Coverage Matrix**:
```kotlin
// POST /api/issues
"POST /api/issues should create issue with valid data" { /* 201 Created */ }
"POST /api/issues should reject empty title" { /* 400 Bad Request */ }
"POST /api/issues should handle service exceptions" { /* 500 Internal Server Error */ }

// GET /api/issues/{id}
"GET /api/issues/{id} should return issue by ID" { /* 200 OK */ }
"GET /api/issues/{id} should return 404 for non-existent issue" { /* 404 Not Found */ }

// PUT /api/issues/{id}
"PUT /api/issues/{id} should update issue successfully" { /* 200 OK */ }
"PUT /api/issues/{id} should validate update data" { /* 400 Bad Request */ }
```

### Performance Benchmarks

| Test Type | Target Time | Acceptable Range |
|-----------|-------------|------------------|
| Single Route Test | <10ms | 1-25ms |
| Full Route Test Suite | <5s | 1-10s |
| Mock Setup/Teardown | <1ms | <5ms |

### Quality Gates

**Before Committing Route Tests**:
- ✅ All tests complete in <100ms each
- ✅ 80%+ coverage of route logic paths
- ✅ MockK verification for all service calls
- ✅ Proper error scenario coverage
- ✅ No flaky or time-dependent tests

## Pattern Selection Guide

### Use Mock DI Container When:
- ✅ Testing complete HTTP request/response cycles
- ✅ Validating status codes, headers, and response formatting
- ✅ Route logic is straightforward (thin controllers)
- ✅ Existing routes with minimal refactoring needs

### Use Direct Route Logic When:
- ✅ Complex validation or transformation logic in routes
- ✅ Heavy business logic that benefits from isolation
- ✅ New routes being developed with testability in mind
- ✅ Performance-critical paths requiring <1ms tests

### Keep Integration Tests For:
- ✅ End-to-end user workflows
- ✅ Database integration validation
- ✅ Authentication and authorization flows
- ✅ Cross-service communication

## Common Utilities

### SimpleRouteTestUtils.kt

```kotlin
object SimpleRouteTestUtils {
    fun ApplicationTestBuilder.createJsonClient() = createClient {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                encodeDefaults = false
            })
        }
    }

    suspend inline fun <reified T> HttpResponse.bodyAs(): T = body()

    fun mockTimeProvider(fixedTime: String = "2024-01-01T00:00:00Z"): TimeProvider =
        mockk<TimeProvider>().apply {
            every { now() } returns Instant.parse(fixedTime)
        }
}
```

## Migration Strategy

### For New Routes
- **Always start with Mock DI Container pattern**
- **Write tests before implementation** (TDD approach)
- **Use established utilities and patterns**

### For Existing Routes
- **Retrofit progressively** during feature work
- **Prioritize high-traffic endpoints** first
- **Maintain existing integration tests** during transition

## Troubleshooting

### Common Issues

**Problem**: Tests run slowly (>100ms)
- **Solution**: Verify mock setup efficiency, check for real HTTP calls

**Problem**: Ktor DI injection failures
- **Solution**: Ensure `dependencies.provide<T>` matches service interfaces

**Problem**: JSON serialization mismatches
- **Solution**: Align client/server content negotiation configuration

**Problem**: Coroutine context issues
- **Solution**: Use `testApplication` pattern, avoid nested `runTest`

## Examples and Templates

See implemented examples:
- `IssueRoutesUnitTest.kt` - Mock DI Container pattern
- `WorkflowRoutesUnitTest.kt` - Mock DI Container pattern
- `SimpleRouteTestUtils.kt` - Shared utilities

For new route testing, copy and adapt these established patterns.

---

**Status**: Active standards for all route development
**Last Updated**: January 2025
**Next Review**: As framework versions update or patterns evolve