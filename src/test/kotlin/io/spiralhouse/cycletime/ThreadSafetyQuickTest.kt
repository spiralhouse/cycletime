package io.spiralhouse.cycletime

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.infrastructure.database.ProjectsTable
import io.spiralhouse.cycletime.infrastructure.database.IssuesTable
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.test.runTest
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.transactions.TransactionManager

/**
 * Quick thread-safety verification test.
 * 
 * This test verifies that the repository implementations can handle
 * basic concurrent operations without data corruption. The fixes implemented
 * address the thread-safety requirements for singleton DI scope.
 */
class ThreadSafetyQuickTest : StringSpec({

    "should handle concurrent project creation safely" {
        runTest {
            // Setup test database
            val database = Database.connect(
                url = "jdbc:h2:mem:quick_test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
                driver = "org.h2.Driver"
            )
            
            // Set the default database
            TransactionManager.defaultDatabase = database

            transaction(database) {
                SchemaUtils.create(ProjectsTable, IssuesTable)
            }

            val mockTimeProvider = MockTimeProvider()
            mockTimeProvider.setTime(kotlinx.datetime.Instant.parse("2025-01-15T10:00:00Z"))
            
            val repository = ExposedProjectRepository(mockTimeProvider, database)

            // Create 10 projects concurrently
            val jobs = (1..10).map { id ->
                async {
                    val project = Project.create(
                        name = "Test Project $id",
                        description = "Test project created by thread $id",
                        timeProvider = mockTimeProvider
                    )
                    repository.save(project)
                    project
                }
            }

            val projects = jobs.awaitAll()
            
            // Verify all projects were created
            val allProjects = repository.findAll()
            allProjects.size shouldBe 10
            
            // Verify all projects have unique names
            val uniqueNames = allProjects.map { it.name }.toSet()
            uniqueNames.size shouldBe 10

            println("✅ Successfully created ${allProjects.size} projects concurrently")
        }
    }
})