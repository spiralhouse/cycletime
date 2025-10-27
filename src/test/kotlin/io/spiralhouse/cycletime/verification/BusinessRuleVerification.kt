package io.spiralhouse.cycletime.verification

import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.dto.IssueDto
import io.spiralhouse.cycletime.application.exceptions.*
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.domain.exceptions.DomainException
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.infrastructure.database.IssuesTable
import io.spiralhouse.cycletime.infrastructure.database.IssueDependenciesTable
import io.spiralhouse.cycletime.infrastructure.database.ProjectsTable
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.transactions.transaction

import io.kotest.core.spec.style.StringSpec

/**
 * Manual Business Rule Verification Test
 *
 * This test demonstrates that the business rules enforced by IssueApplicationService
 * are working correctly in production code. It manually tests scenarios that have been
 * disabled in the test suite due to Kotest limitations with shouldThrow and suspend functions.
 *
 * ## Purpose
 *
 * The disabled tests in IssueApplicationServiceTest are NOT broken - they correctly test
 * important business rules. The issue is that Kotest's shouldThrow doesn't properly catch
 * exceptions thrown from suspend functions. This test proves that the production code
 * correctly enforces all business rules by:
 *
 * 1. Manually executing the invalid operations
 * 2. Catching the expected exceptions
 * 3. Verifying the correct exception types and messages
 * 4. Providing clear output showing which rules are enforced
 *
 * ## Usage
 *
 * Run this test:
 * ```
 * ./gradlew test --tests "io.spiralhouse.cycletime.verification.BusinessRuleVerification"
 * ```
 */
class BusinessRuleVerification : StringSpec({

    "Business rules are properly enforced in production code" {
        runBusinessRuleVerification()
    }
})

fun runBusinessRuleVerification() {
    println("========================================")
    println("Business Rule Verification Script")
    println("========================================")
    println("This script demonstrates that business rules are properly enforced")
    println("in the production code, despite tests being disabled due to Kotest limitations.")
    println()

    // Setup database and services
    val testContext = setupTestEnvironment()
    var testResults = TestResults()
    
    // Run all test categories
    runHierarchyRuleTests(testContext, testResults)
    runCircularDependencyTests(testContext, testResults)
    runStatusTransitionTests(testContext, testResults)
    runEstimateValidationTests(testContext, testResults)
    runEntityExistenceTests(testContext, testResults)
    
    // Print final results and cleanup
    printFinalResults(testResults)
    cleanupTestEnvironment(testContext)
    
    // Assert all tests passed for Kotest
    if (testResults.successCount != testResults.totalTests) {
        throw AssertionError("Not all business rules are enforced: ${testResults.successCount}/${testResults.totalTests} passed")
    }
}

/**
 * Test context containing all necessary services and data.
 */
data class TestContext(
    val database: Database,
    val issueApplicationService: IssueApplicationService,
    val timeProvider: SystemTimeProvider
)

/**
 * Test results tracker.
 */
data class TestResults(
    var successCount: Int = 0,
    var totalTests: Int = 0
) {
    fun recordTest(success: Boolean) {
        totalTests++
        if (success) successCount++
    }
}

/**
 * Setup test environment with database and services.
 */
fun setupTestEnvironment(): TestContext {
    val database = Database.connect(
        url = "jdbc:h2:mem:business_rule_verification;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        driver = "org.h2.Driver"
    )

    // Create schema
    transaction(database) {
        SchemaUtils.create(ProjectsTable, IssuesTable, IssueDependenciesTable)
    }

    // Setup services
    val timeProvider = SystemTimeProvider()
    val issueRepository = ExposedIssueRepository(timeProvider)
    val projectRepository = ExposedProjectRepository(timeProvider)
    val unitOfWork = ExposedUnitOfWork(database)
    val issueApplicationService = IssueApplicationService(
        issueRepository = issueRepository,
        projectRepository = projectRepository,
        unitOfWork = unitOfWork,
        timeProvider = timeProvider
    )

    // Clean database before starting
    transaction(database) {
        IssueDependenciesTable.deleteAll()
        IssuesTable.deleteAll()
        ProjectsTable.deleteAll()
    }
    
    return TestContext(database, issueApplicationService, timeProvider)
}

/**
 * Run hierarchy rule enforcement tests.
 */
fun runHierarchyRuleTests(context: TestContext, results: TestResults) {
    println("========== Hierarchy Rule Tests ==========")
    
    // Test 1: Epic cannot have Epic parent
    val parentEpic = createTestEpic(context, "Parent Epic")
    val test1Success = testHierarchyViolation(
        context,
        "Epic with Epic parent",
        CreateIssueCommand("Child Epic", type = IssueType.EPIC, parentId = parentEpic.id)
    )
    results.recordTest(test1Success)

    // Test 2: Subtask cannot have Epic parent
    val test2Success = testHierarchyViolation(
        context,
        "Subtask with Epic parent",
        CreateIssueCommand("Subtask", type = IssueType.SUBTASK, parentId = parentEpic.id)
    )
    results.recordTest(test2Success)
}

/**
 * Run circular dependency prevention tests.
 */
fun runCircularDependencyTests(context: TestContext, results: TestResults) {
    println("========== Circular Dependency Tests ==========")
    
    val issue1 = createTestIssue(context, "Issue 1")
    val issue2 = createTestIssue(context, "Issue 2")
    
    // Add initial dependency
    runBlocking {
        context.issueApplicationService.addDependency(
            AddDependencyCommand(issueId = issue1.id, dependencyId = issue2.id)
        )
    }
    
    // Test circular dependency prevention
    val testSuccess = testCircularDependency(context, issue2.id, issue1.id)
    results.recordTest(testSuccess)
}

/**
 * Run status transition rule tests.
 */
fun runStatusTransitionTests(context: TestContext, results: TestResults) {
    println("========== Status Transition Tests ==========")
    
    val issue = createTestIssue(context, "Test Issue")
    val testSuccess = testInvalidStatusTransition(context, issue.id)
    results.recordTest(testSuccess)
}

/**
 * Run estimate validation tests.
 */
fun runEstimateValidationTests(context: TestContext, results: TestResults) {
    println("========== Estimate Validation Tests ==========")
    
    val epic = createTestEpic(context, "Epic")
    val testSuccess = testInvalidEstimate(context, epic.id)
    results.recordTest(testSuccess)
}

/**
 * Run entity existence validation tests.
 */
fun runEntityExistenceTests(context: TestContext, results: TestResults) {
    println("========== Entity Existence Tests ==========")
    
    val testSuccess = testNonExistentEntity(context)
    results.recordTest(testSuccess)
}

/**
 * Helper function to create test epic.
 */
fun createTestEpic(context: TestContext, title: String): IssueDto {
    return runBlocking {
        context.issueApplicationService.createIssue(
            CreateIssueCommand(title, type = IssueType.EPIC)
        )
    }
}

/**
 * Helper function to create test issue.
 */
fun createTestIssue(context: TestContext, title: String): IssueDto {
    return runBlocking {
        context.issueApplicationService.createIssue(
            CreateIssueCommand(title, type = IssueType.STORY)
        )
    }
}

/**
 * Test hierarchy violation detection.
 */
fun testHierarchyViolation(context: TestContext, testName: String, command: CreateIssueCommand): Boolean {
    println("Testing: $testName")
    return try {
        runBlocking { context.issueApplicationService.createIssue(command) }
        println("  ✗ FAILED - No exception thrown!")
        false
    } catch (e: HierarchyViolationException) {
        println("  ✓ Correctly rejected: ${e.message}")
        true
    } catch (e: Exception) {
        println("  ✗ Wrong exception: ${e::class.simpleName}")
        false
    }
}

/**
 * Test circular dependency detection.
 */
fun testCircularDependency(context: TestContext, issueId: IssueId, dependsOnId: IssueId): Boolean {
    println("Testing: Circular dependency prevention")
    return try {
        runBlocking {
            context.issueApplicationService.addDependency(
                AddDependencyCommand(issueId = issueId, dependencyId = dependsOnId)
            )
        }
        println("  ✗ FAILED - No exception thrown!")
        false
    } catch (e: CircularDependencyException) {
        println("  ✓ Correctly rejected: ${e.message}")
        true
    } catch (e: Exception) {
        println("  ✗ Wrong exception: ${e::class.simpleName}")
        false
    }
}

/**
 * Test invalid status transition detection.
 */
fun testInvalidStatusTransition(context: TestContext, issueId: IssueId): Boolean {
    println("Testing: Invalid status transition (TODO -> DONE)")
    return try {
        runBlocking {
            context.issueApplicationService.updateStatus(
                UpdateIssueStatusCommand(issueId = issueId, newStatus = IssueStatus.DONE)
            )
        }
        println("  ✗ FAILED - No exception thrown!")
        false
    } catch (e: InvalidStatusTransitionException) {
        println("  ✓ Correctly rejected: ${e.message}")
        true
    } catch (e: Exception) {
        println("  ✗ Wrong exception: ${e::class.simpleName}")
        false
    }
}

/**
 * Test invalid estimate detection.
 */
fun testInvalidEstimate(context: TestContext, issueId: IssueId): Boolean {
    println("Testing: Invalid estimate on Epic")
    return try {
        runBlocking {
            context.issueApplicationService.updateIssue(
                UpdateIssueCommand(id = issueId, estimate = Estimate.of(5))
            )
        }
        println("  ✗ FAILED - No exception thrown!")
        false
    } catch (e: DomainException) {
        println("  ✓ Correctly rejected: ${e.message}")
        true
    } catch (e: Exception) {
        println("  ✗ Wrong exception: ${e::class.simpleName}")
        false
    }
}

/**
 * Test non-existent entity detection.
 */
fun testNonExistentEntity(context: TestContext): Boolean {
    println("Testing: Non-existent entity update")
    val nonExistentId = IssueId.generate()
    return try {
        runBlocking {
            context.issueApplicationService.updateIssue(
                UpdateIssueCommand(id = nonExistentId, title = "Updated Title")
            )
        }
        println("  ✗ FAILED - No exception thrown!")
        false
    } catch (e: IssueNotFoundException) {
        println("  ✓ Correctly rejected: ${e.message}")
        true
    } catch (e: Exception) {
        println("  ✗ Wrong exception: ${e::class.simpleName}")
        false
    }
}

/**
 * Print final test results.
 */
fun printFinalResults(results: TestResults) {
    println("========================================")
    println("Final Results: ${results.successCount}/${results.totalTests} tests passed")
    println("========================================")
    
    if (results.successCount == results.totalTests) {
        println("✅ All business rules are properly enforced!")
        println("Verified rules: hierarchy, circular dependencies, status transitions, estimates, entity existence")
    } else {
        println("⚠️  Some business rules are not properly enforced.")
    }
}

/**
 * Cleanup test environment.
 */
fun cleanupTestEnvironment(context: TestContext) {
    transaction(context.database) {
        SchemaUtils.drop(IssueDependenciesTable, IssuesTable, ProjectsTable)
    }
    println("Script completed successfully.")
}

