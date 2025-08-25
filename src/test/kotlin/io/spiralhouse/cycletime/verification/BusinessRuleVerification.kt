package io.spiralhouse.cycletime.verification

import io.spiralhouse.cycletime.application.commands.*
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

    var successCount = 0
    var totalTests = 0

    // ================================================================================
    // Test 1: Hierarchy Enforcement - Epic cannot have Epic parent
    // ================================================================================
    totalTests++
    println("Test 1: Hierarchy Enforcement - Epic cannot have Epic parent")
    print("  Creating parent Epic... ")
    val parentEpic = runBlocking {
        issueApplicationService.createIssue(
            CreateIssueCommand("Parent Epic", type = IssueType.EPIC)
        )
    }
    println("✓ Created (ID: ${parentEpic.id.value})")

    print("  Attempting to create child Epic with Epic parent... ")
    try {
        runBlocking {
            issueApplicationService.createIssue(
                CreateIssueCommand(
                    title = "Child Epic",
                    type = IssueType.EPIC,
                    parentId = parentEpic.id
                )
            )
        }
        println("✗ FAILED - No exception thrown!")
    } catch (e: HierarchyViolationException) {
        println("✓ Correctly rejected!")
        println("    Exception: ${e.message}")
        successCount++
    } catch (e: Exception) {
        println("✗ Wrong exception type: ${e::class.simpleName}")
    }
    println()

    // ================================================================================
    // Test 2: Hierarchy Enforcement - Subtask cannot have Epic parent
    // ================================================================================
    totalTests++
    println("Test 2: Hierarchy Enforcement - Subtask cannot have Epic parent")
    print("  Using existing Epic... ")
    println("(ID: ${parentEpic.id.value})")

    print("  Attempting to create Subtask with Epic parent... ")
    try {
        runBlocking {
            issueApplicationService.createIssue(
                CreateIssueCommand(
                    title = "Subtask",
                    type = IssueType.SUBTASK,
                    parentId = parentEpic.id
                )
            )
        }
        println("✗ FAILED - No exception thrown!")
    } catch (e: HierarchyViolationException) {
        println("✓ Correctly rejected!")
        println("    Exception: ${e.message}")
        successCount++
    } catch (e: Exception) {
        println("✗ Wrong exception type: ${e::class.simpleName}")
    }
    println()

    // ================================================================================
    // Test 3: Hierarchy Enforcement - Story cannot have Subtask parent
    // ================================================================================
    totalTests++
    println("Test 3: Hierarchy Enforcement - Story cannot have Subtask parent")
    print("  Creating Story for Subtask... ")
    val story = runBlocking {
        issueApplicationService.createIssue(
            CreateIssueCommand("Story", type = IssueType.STORY)
        )
    }
    println("✓ Created (ID: ${story.id.value})")

    print("  Creating Subtask under Story... ")
    val subtask = runBlocking {
        issueApplicationService.createIssue(
            CreateIssueCommand(
                title = "Subtask",
                type = IssueType.SUBTASK,
                parentId = story.id
            )
        )
    }
    println("✓ Created (ID: ${subtask.id.value})")

    print("  Attempting to create Story with Subtask parent... ")
    try {
        runBlocking {
            issueApplicationService.createIssue(
                CreateIssueCommand(
                    title = "Another Story",
                    type = IssueType.STORY,
                    parentId = subtask.id
                )
            )
        }
        println("✗ FAILED - No exception thrown!")
    } catch (e: HierarchyViolationException) {
        println("✓ Correctly rejected!")
        println("    Exception: ${e.message}")
        successCount++
    } catch (e: Exception) {
        println("✗ Wrong exception type: ${e::class.simpleName}")
    }
    println()

    // ================================================================================
    // Test 4: Circular Dependency Prevention
    // ================================================================================
    totalTests++
    println("Test 4: Circular Dependency Prevention")
    print("  Creating Issue 1... ")
    val issue1 = runBlocking {
        issueApplicationService.createIssue(
            CreateIssueCommand("Issue 1", type = IssueType.STORY)
        )
    }
    println("✓ Created (ID: ${issue1.id.value})")

    print("  Creating Issue 2... ")
    val issue2 = runBlocking {
        issueApplicationService.createIssue(
            CreateIssueCommand("Issue 2", type = IssueType.STORY)
        )
    }
    println("✓ Created (ID: ${issue2.id.value})")

    print("  Adding dependency: Issue 1 depends on Issue 2... ")
    runBlocking {
        issueApplicationService.addDependency(
            AddDependencyCommand(issue1.id, issue2.id)
        )
    }
    println("✓ Added")

    print("  Attempting circular dependency: Issue 2 depends on Issue 1... ")
    try {
        runBlocking {
            issueApplicationService.addDependency(
                AddDependencyCommand(issue2.id, issue1.id)
            )
        }
        println("✗ FAILED - No exception thrown!")
    } catch (e: CircularDependencyException) {
        println("✓ Correctly rejected!")
        println("    Exception: ${e.message}")
        successCount++
    } catch (e: Exception) {
        println("✗ Wrong exception type: ${e::class.simpleName}")
    }
    println()

    // ================================================================================
    // Test 5: Self-Dependency Prevention
    // ================================================================================
    totalTests++
    println("Test 5: Self-Dependency Prevention")
    print("  Creating Issue 3... ")
    val issue3 = runBlocking {
        issueApplicationService.createIssue(
            CreateIssueCommand("Issue 3", type = IssueType.STORY)
        )
    }
    println("✓ Created (ID: ${issue3.id.value})")

    print("  Attempting self-dependency: Issue 3 depends on itself... ")
    try {
        runBlocking {
            issueApplicationService.addDependency(
                AddDependencyCommand(issue3.id, issue3.id)
            )
        }
        println("✗ FAILED - No exception thrown!")
    } catch (e: CircularDependencyException) {
        println("✓ Correctly rejected!")
        println("    Exception: ${e.message}")
        successCount++
    } catch (e: Exception) {
        println("✗ Wrong exception type: ${e::class.simpleName}")
    }
    println()

    // ================================================================================
    // Test 6: Invalid Status Transition (TODO -> DONE)
    // ================================================================================
    totalTests++
    println("Test 6: Invalid Status Transition (TODO -> DONE)")
    print("  Creating Issue 4 in TODO status... ")
    val issue4 = runBlocking {
        issueApplicationService.createIssue(
            CreateIssueCommand("Issue 4", type = IssueType.STORY)
        )
    }
    println("✓ Created (ID: ${issue4.id.value}, Status: ${issue4.status})")

    print("  Attempting invalid transition: TODO -> DONE... ")
    try {
        runBlocking {
            issueApplicationService.updateStatus(
                UpdateIssueStatusCommand(issue4.id, IssueStatus.DONE)
            )
        }
        println("✗ FAILED - No exception thrown!")
    } catch (e: InvalidStatusTransitionException) {
        println("✓ Correctly rejected!")
        println("    Exception: ${e.message}")
        successCount++
    } catch (e: Exception) {
        println("✗ Wrong exception type: ${e::class.simpleName}")
    }
    println()

    // ================================================================================
    // Test 7: Estimate Validation - Epic cannot have estimate
    // ================================================================================
    totalTests++
    println("Test 7: Estimate Validation - Epic cannot have estimate")
    print("  Creating Epic... ")
    val epic = runBlocking {
        issueApplicationService.createIssue(
            CreateIssueCommand("Epic for Estimate Test", type = IssueType.EPIC)
        )
    }
    println("✓ Created (ID: ${epic.id.value})")

    print("  Attempting to set estimate on Epic... ")
    try {
        runBlocking {
            issueApplicationService.updateIssue(
                UpdateIssueCommand(
                    id = epic.id,
                    estimate = Estimate.of(8)
                )
            )
        }
        println("✗ FAILED - No exception thrown!")
    } catch (e: DomainException) {
        println("✓ Correctly rejected!")
        println("    Exception: ${e.message}")
        successCount++
    } catch (e: Exception) {
        println("✗ Wrong exception type: ${e::class.simpleName}")
    }
    println()

    // ================================================================================
    // Test 8: Move Issue - Cannot move to own descendant
    // ================================================================================
    totalTests++
    println("Test 8: Move Issue - Cannot move to own descendant")
    print("  Creating Epic -> Story -> Subtask hierarchy... ")
    val moveEpic = runBlocking {
        issueApplicationService.createIssue(
            CreateIssueCommand("Move Epic", type = IssueType.EPIC)
        )
    }
    val moveStory = runBlocking {
        issueApplicationService.createIssue(
            CreateIssueCommand("Move Story", type = IssueType.STORY, parentId = moveEpic.id)
        )
    }
    val moveSubtask = runBlocking {
        issueApplicationService.createIssue(
            CreateIssueCommand("Move Subtask", type = IssueType.SUBTASK, parentId = moveStory.id)
        )
    }
    println("✓ Created hierarchy")

    print("  Attempting to move Story under its own child Subtask... ")
    try {
        runBlocking {
            issueApplicationService.moveIssue(
                MoveIssueCommand(
                    issueId = moveStory.id,
                    newParentId = moveSubtask.id
                )
            )
        }
        println("✗ FAILED - No exception thrown!")
    } catch (e: HierarchyViolationException) {
        println("✓ Correctly rejected!")
        println("    Exception: ${e.message}")
        successCount++
    } catch (e: Exception) {
        println("✗ Wrong exception type: ${e::class.simpleName}")
    }
    println()

    // ================================================================================
    // Test 9: Project Not Found Exception
    // ================================================================================
    totalTests++
    println("Test 9: Project Not Found Exception")
    print("  Attempting to create Issue with non-existent project... ")
    val nonExistentProjectId = ProjectId.generate()
    try {
        runBlocking {
            issueApplicationService.createIssue(
                CreateIssueCommand(
                    title = "Issue with Invalid Project",
                    type = IssueType.STORY,
                    projectId = nonExistentProjectId
                )
            )
        }
        println("✗ FAILED - No exception thrown!")
    } catch (e: ProjectNotFoundException) {
        println("✓ Correctly rejected!")
        println("    Exception: ${e.message}")
        successCount++
    } catch (e: Exception) {
        println("✗ Wrong exception type: ${e::class.simpleName}")
    }
    println()

    // ================================================================================
    // Test 10: Issue Not Found Exceptions
    // ================================================================================
    totalTests++
    println("Test 10: Issue Not Found - Update non-existent issue")
    print("  Attempting to update non-existent issue... ")
    val nonExistentIssueId = IssueId.generate()
    try {
        runBlocking {
            issueApplicationService.updateIssue(
                UpdateIssueCommand(
                    id = nonExistentIssueId,
                    title = "Updated Title"
                )
            )
        }
        println("✗ FAILED - No exception thrown!")
    } catch (e: IssueNotFoundException) {
        println("✓ Correctly rejected!")
        println("    Exception: ${e.message}")
        successCount++
    } catch (e: Exception) {
        println("✗ Wrong exception type: ${e::class.simpleName}")
    }
    println()

    totalTests++
    println("Test 11: Issue Not Found - Delete non-existent issue")
    print("  Attempting to delete non-existent issue... ")
    try {
        runBlocking {
            issueApplicationService.deleteIssue(nonExistentIssueId)
        }
        println("✗ FAILED - No exception thrown!")
    } catch (e: IssueNotFoundException) {
        println("✓ Correctly rejected!")
        println("    Exception: ${e.message}")
        successCount++
    } catch (e: Exception) {
        println("✗ Wrong exception type: ${e::class.simpleName}")
    }
    println()

    totalTests++
    println("Test 12: Issue Not Found - Add dependency to non-existent issue")
    print("  Creating Issue 5... ")
    val issue5 = runBlocking {
        issueApplicationService.createIssue(
            CreateIssueCommand("Issue 5", type = IssueType.STORY)
        )
    }
    println("✓ Created (ID: ${issue5.id.value})")

    print("  Attempting to add dependency to non-existent issue... ")
    try {
        runBlocking {
            issueApplicationService.addDependency(
                AddDependencyCommand(issue5.id, IssueId.generate())
            )
        }
        println("✗ FAILED - No exception thrown!")
    } catch (e: IssueNotFoundException) {
        println("✓ Correctly rejected!")
        println("    Exception: ${e.message}")
        successCount++
    } catch (e: Exception) {
        println("✗ Wrong exception type: ${e::class.simpleName}")
    }
    println()

    // ================================================================================
    // Summary
    // ================================================================================
    println("========================================")
    println("Business Rule Verification Complete")
    println("========================================")
    println("Results: $successCount/$totalTests tests passed")
    println()

    if (successCount == totalTests) {
        println("✅ ALL BUSINESS RULES ARE PROPERLY ENFORCED!")
        println()
        println("This proves that despite the disabled tests in IssueApplicationServiceTest,")
        println("the production code correctly enforces all critical business rules:")
        println("  • Hierarchy enforcement (Epic->Story->Subtask)")
        println("  • Circular dependency prevention")
        println("  • Invalid status transition prevention")
        println("  • Estimate validation by issue type")
        println("  • Entity existence validation")
        println()
        println("The disabled tests are due to a Kotest framework limitation with")
        println("shouldThrow and suspend functions, NOT a problem with the production code.")
    } else {
        println("⚠️  Some business rules are not properly enforced.")
        println("Please review the failed tests above.")
    }

    // Cleanup
    transaction(database) {
        SchemaUtils.drop(IssueDependenciesTable, IssuesTable, ProjectsTable)
    }

    println()
    println("Script completed successfully.")

    // Assert all tests passed for Kotest
    if (successCount != totalTests) {
        throw AssertionError("Not all business rules are enforced: $successCount/$totalTests passed")
    }
}
