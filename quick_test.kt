// Quick test to isolate the hierarchy validation issue

import io.spiralhouse.cycletime.application.commands.CreateIssueCommand
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.exceptions.HierarchyViolationException
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.IssueType
import io.spiralhouse.cycletime.infrastructure.database.*
import io.spiralhouse.cycletime.infrastructure.persistence.*
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction

fun main() {
    println("=== Quick Hierarchy Validation Test ===")
    
    // Setup test environment
    val database = Database.connect(
        url = "jdbc:h2:mem:quicktest;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        driver = "org.h2.Driver"
    )
    
    transaction(database) {
        SchemaUtils.create(ProjectsTable, IssuesTable, IssueDependenciesTable)
    }
    
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
    
    runBlocking {
        try {
            // Create Epic first
            println("1. Creating Epic...")
            val epic = issueApplicationService.createIssue(
                CreateIssueCommand("Parent Epic", type = IssueType.EPIC)
            )
            println("   Epic created successfully: ${epic.id}")
            
            // Try to create Subtask with Epic parent (should fail)
            println("2. Attempting to create Subtask with Epic parent...")
            val subtask = issueApplicationService.createIssue(
                CreateIssueCommand("Test Subtask", type = IssueType.SUBTASK, parentId = epic.id)
            )
            println("   ❌ ERROR: Subtask was created successfully! This should have failed.")
            println("   Subtask ID: ${subtask.id}")
            
        } catch (e: HierarchyViolationException) {
            println("   ✅ SUCCESS: Hierarchy validation worked correctly")
            println("   Exception: ${e.message}")
        } catch (e: Exception) {
            println("   ❓ UNEXPECTED: Got different exception: ${e::class.simpleName}")
            println("   Message: ${e.message}")
        }
    }
    
    println("=== Test Complete ===")
}